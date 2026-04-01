/**
 * payments/mock-402-server.ts
 *
 * Local x402 mock server for development and testing.
 * Returns HTTP 402 with payment details on any POST /pay request,
 * then simulates settlement on the second request (with payment header).
 *
 * Run with: npm run dev:mock
 */

import express from 'express'
import cors    from 'cors'
import 'dotenv/config'

const app  = express()
const port = process.env.X402_MOCK_SERVER_PORT || 4020

app.use(cors())
app.use(express.json())

app.all('/pay', (req, res) => {
  const paymentHeader = req.headers['x-payment'] || req.headers['authorization']

  if (paymentHeader) {
    // Simulate settled payment
    res.setHeader('x-payment-receipt', `mock-receipt-${Date.now()}`)
    res.json({
      success:  true,
      message:  'Payment accepted',
      receipt:  `mock-receipt-${Date.now()}`,
    })
    console.log('[mock-402] Payment accepted ✅')
    return
  }

  // Return 402 with payment details
  res.status(402).json({
    x402Version: 1,
    error:       'Payment required',
    accepts: [{
      scheme:          'exact',
      network:         'base-sepolia',
      maxAmountRequired: '100000', // 0.1 USDC (6 decimals)
      resource:        `http://localhost:${port}/pay`,
      description:     'Maid402 mock payment endpoint',
      mimeType:        'application/json',
      payTo:           process.env.OPERATOR_WALLET || '0x0000000000000000000000000000000000000000',
      maxTimeoutSeconds: 60,
      asset:           '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC on Base Sepolia
      extra: {
        name:       'USDC',
        version:    '2',
      },
    }],
  })
  console.log('[mock-402] Returned 402 — awaiting payment header')
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', server: 'Maid402-mock-402', port })
})

app.listen(port, () => {
  console.log(`\n💳 x402 Mock Server running at http://localhost:${port}`)
  console.log(`   POST /pay — returns 402 without payment header, 200 with it`)
  console.log(`   GET  /health\n`)
})
