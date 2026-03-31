/**
 * payments/x402-client.ts
 *
 * x402 HTTP payment client for Casa.
 * Attempts to pay via the x402 protocol (HTTP 402 handshake).
 * Falls through silently if no 402 response is received.
 *
 * Spec: https://x402.org
 * Package: @x402/fetch
 */

import { createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'

export interface X402Result {
  settled:  boolean
  txHash?:  string
  error?:   string
}

/**
 * Attempt an x402 payment for a given URL.
 * Returns { settled: true, txHash } if payment was completed,
 * or { settled: false } if the server didn't respond with HTTP 402.
 */
export async function attemptX402Payment(
  url:       string,
  amountINR: number
): Promise<X402Result> {
  const pk = process.env.OPERATOR_PRIVATE_KEY
  if (!pk) {
    console.log('[x402] OPERATOR_PRIVATE_KEY not set — skipping x402 attempt')
    return { settled: false }
  }

  try {
    // Dynamic import of @x402/fetch (ESM)
    const { wrapFetchWithPayment } = await import('@x402/fetch')

    const account = privateKeyToAccount(pk as `0x${string}`)
    const wallet  = createWalletClient({
      account,
      chain:    baseSepolia,
      transport: http(),
    })

    // Wrap fetch with x402 payment capability
    const fetchWithPayment = wrapFetchWithPayment(fetch, wallet as unknown as Parameters<typeof wrapFetchWithPayment>[1])

    console.log(`[x402] Attempting payment to ${url} (₹${amountINR})`)
    const response = await fetchWithPayment(url, { method: 'POST' })

    if (response.status === 402) {
      // x402 library should have auto-paid — log the outcome
      console.log('[x402] No settlement (still 402) — server may not support x402')
      return { settled: false }
    }

    if (response.ok) {
      // Payment was settled (x402 library paid transparently)
      const txHash = response.headers.get('x-payment-receipt') || undefined
      console.log(`[x402] Payment settled ✅${txHash ? ` — ${txHash}` : ''}`)
      return { settled: true, txHash }
    }

    return { settled: false }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // Not finding @x402/fetch or network errors are non-fatal
    console.log(`[x402] Payment attempt failed (non-fatal): ${msg}`)
    return { settled: false, error: msg }
  }
}

/**
 * Mock x402 server URL for development testing.
 * Set X402_MOCK_SERVER_PORT in .env to use the local mock server.
 */
export function getMockX402Url(): string {
  const port = process.env.X402_MOCK_SERVER_PORT || '4020'
  return `http://localhost:${port}/pay`
}
