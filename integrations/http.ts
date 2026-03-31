/**
 * integrations/http.ts
 *
 * Minimal HTTP + SSE server so the Next.js chat UI can talk to the agent.
 * Runs on port 3001 alongside the Telegram bot.
 *
 * POST /api/chat   { message: string }  → SSE stream of status lines
 * GET  /api/health                       → { ok: true }
 */

import http    from 'http'
import type { NLHandler } from './telegram.js'

const PORT = Number(process.env.WEB_API_PORT ?? 3001)

export function startHttpServer(onNL: NLHandler): void {
  const server = http.createServer(async (req, res) => {
    // CORS — allow the Next.js dev server and any localhost origin
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

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

    res.writeHead(404)
    res.end('Not found')
  })

  server.listen(PORT, () => {
    console.log(`[http] Web API server → http://localhost:${PORT}`)
  })
}
