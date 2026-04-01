/**
 * payments/x402-client.ts
 *
 * x402 HTTP payment client for Maid402.
 * Uses @x402/fetch v2 + @x402/evm ExactEvmScheme.
 */

import { privateKeyToAccount } from 'viem/accounts'

export interface X402Result {
  settled:  boolean
  txHash?:  string
  error?:   string
}

export async function attemptX402Payment(
  url:       string,
  amountINR: number
): Promise<X402Result> {
  const pk = process.env.OPERATOR_PRIVATE_KEY
  if (!pk) {
    console.log('[x402] OPERATOR_PRIVATE_KEY not set — skipping')
    return { settled: false }
  }

  try {
    const { wrapFetchWithPaymentFromConfig } = await import('@x402/fetch')
    const { ExactEvmScheme }                 = await import('@x402/evm')

    const normalizedPk = (pk.startsWith('0x') ? pk : `0x${pk}`) as `0x${string}`
    const account      = privateKeyToAccount(normalizedPk)

    const fetchWithPayment = wrapFetchWithPaymentFromConfig(fetch, {
      schemes: [{
        x402Version: 1,
        network:     'eip155:84532',
        client:      new ExactEvmScheme(account),
      }],
    })

    console.log(`[x402] Attempting payment to ${url} (₹${amountINR})`)
    const response = await fetchWithPayment(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ item: 'agent-order' }),
    })

    if (response.status === 402) {
      console.log('[x402] No settlement (still 402)')
      return { settled: false }
    }

    if (response.ok) {
      const txHash = response.headers.get('x-payment-receipt')
               ?? response.headers.get('payment-response')
               ?? undefined
      console.log(`[x402] Payment settled ✅${txHash ? ` — ${txHash}` : ''}`)
      return { settled: true, txHash }
    }

    return { settled: false }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log(`[x402] Payment attempt failed (non-fatal): ${msg}`)
    return { settled: false, error: msg }
  }
}

export function getMockX402Url(): string {
  const port = process.env.X402_MOCK_SERVER_PORT || '4020'
  return `http://localhost:${port}/pay`
}
