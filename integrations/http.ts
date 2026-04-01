/**
 * integrations/http.ts
 *
 * HTTP + SSE server for the Maid402 agent.
 * Runs on port 3001 alongside the Telegram bot.
 *
 * POST /api/chat          { message }              → SSE (free, operator UI)
 * POST /api/order         { item, chatId? }         → SSE (x402-gated, 1 USDC)
 * GET  /api/order                                   → payment requirements JSON
 * GET  /api/health                                  → { ok: true }
 */

import http    from 'http'
import type { NLHandler } from './telegram.js'
import { build402Body, processX402Payment } from './x402-server.js'

const PORT     = Number(process.env.WEB_API_PORT ?? 3001)
const BASE_URL = process.env.AGENT_BASE_URL ?? `http://localhost:${PORT}`

export function startHttpServer(onNL: NLHandler): void {
  const server = http.createServer(async (req, res) => {
    // CORS — allow the Next.js dev server and any localhost origin
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-PAYMENT')

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    // ── GET /api/health ──────────────────────────────────────────
    if (req.method === 'GET' && req.url === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true }))
      return
    }

    // ── POST /api/chat ───────────────────────────────────────────
    if (req.method === 'POST' && req.url === '/api/chat') {
      let body = ''
      req.on('data', chunk => { body += chunk })
      req.on('end', async () => {
        let message = ''
        try {
          message = JSON.parse(body).message ?? ''
        } catch {
          res.writeHead(400)
          res.end('Bad JSON')
          return
        }

        res.writeHead(200, {
          'Content-Type':  'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection':    'keep-alive',
        })

        function send(text: string) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`)
        }

        const sendStatus = async (text: string) => { send(text) }

        try {
          const handled = await onNL(0, message, sendStatus)
          if (!handled) {
            send(
              "I didn't quite catch that. Try:\n" +
              '• _"order me milk and bread"_\n' +
              '• _"find Amul butter 500g"_\n' +
              '• _"what\'s my budget?"_'
            )
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          send(`❌ Error: ${msg}`)
        }

        res.write('data: [DONE]\n\n')
        res.end()
      })
      return
    }

    // ── POST /api/pay — x402 service-fee endpoint (no order execution) ──
    // The agent calls this before every Telegram order to record an on-chain payment.
    if (req.method === 'POST' && req.url === '/api/pay') {
      const paymentHeader = req.headers['x-payment'] as string | undefined
      const resourceUrl   = `${BASE_URL}/api/pay`

      if (!paymentHeader) {
        res.writeHead(402, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(build402Body(resourceUrl)))
        return
      }

      const payment = await processX402Payment(paymentHeader, resourceUrl)
      if (!payment.paid) {
        res.writeHead(402, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: payment.error ?? 'Payment failed' }))
        return
      }

      res.writeHead(200, {
        'Content-Type':      'application/json',
        'X-Payment-Receipt': payment.txHash ?? '',
        'X-Payer':           payment.payer  ?? '',
      })
      res.end(JSON.stringify({ ok: true, txHash: payment.txHash, payer: payment.payer }))
      return
    }

    // ── GET /api/order — return payment requirements ─────────────
    if (req.method === 'GET' && req.url === '/api/order') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(build402Body(`${BASE_URL}/api/order`), null, 2))
      return
    }

    // ── POST /api/order — x402-gated order endpoint ───────────────
    if (req.method === 'POST' && req.url === '/api/order') {
      let body = ''
      req.on('data', chunk => { body += chunk })
      req.on('end', async () => {
        // ── Parse body ─────────────────────────────────────────────
        let item = ''
        let callerChatId = 0
        try {
          const parsed = JSON.parse(body)
          item         = parsed.item ?? ''
          callerChatId = parsed.chatId ?? 0
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Bad JSON — expected { "item": "milk 1L" }' }))
          return
        }

        if (!item) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Missing required field: "item"' }))
          return
        }

        // ── x402 gate ─────────────────────────────────────────────
        const resourceUrl   = `${BASE_URL}/api/order`
        const paymentHeader = req.headers['x-payment'] as string | undefined

        if (!paymentHeader) {
          // No payment — return 402 with requirements
          res.writeHead(402, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(build402Body(resourceUrl)))
          return
        }

        // Has X-PAYMENT header — verify + settle via facilitator
        console.log('[x402] Payment header received — verifying...')
        const payment = await processX402Payment(paymentHeader, resourceUrl)

        if (!payment.paid) {
          res.writeHead(402, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: payment.error ?? 'Payment verification failed' }))
          return
        }

        // ── Payment verified — stream order execution ─────────────
        res.writeHead(200, {
          'Content-Type':      'text/event-stream',
          'Cache-Control':     'no-cache',
          'Connection':        'keep-alive',
          'X-Payment-Receipt': payment.txHash ?? '',
          'X-Payer':           payment.payer  ?? '',
        })

        function send(text: string) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`)
        }

        send(`✅ *Payment verified* — 1 USDC received${payment.payer ? ` from \`${payment.payer.slice(0, 10)}…\`` : ''}\n_tx: \`${payment.txHash?.slice(0, 18)}…\`_`)

        const sendStatus = async (text: string) => { send(text) }

        try {
          const handled = await onNL(callerChatId, `order me ${item}`, sendStatus)
          if (!handled) send(`❌ Could not process order for "${item}"`)
        } catch (err) {
          send(`❌ Order failed: ${err instanceof Error ? err.message : String(err)}`)
        }

        res.write('data: [DONE]\n\n')
        res.end()
      })
      return
    }

    res.writeHead(404)
    res.end('Not found')
  })

  server.listen(PORT, () => {
    console.log(`[http] Web API server → http://localhost:${PORT}`)
    console.log(`[http] x402 order endpoint → POST http://localhost:${PORT}/api/order  (1 USDC on base-sepolia)`)
  })
}
