/**
 * scripts/test-x402.ts
 * Smoke test for x402 payment flow.
 * Run: pnpm tsx scripts/test-x402.ts
 */

import 'dotenv/config'
import { privateKeyToAccount } from 'viem/accounts'

const pk       = process.env.OPERATOR_PRIVATE_KEY!
const endpoint = process.env.X402_ENDPOINT || 'http://localhost:3003/api/pay'

// Intercept fetch to log facilitator calls
const _origFetch = globalThis.fetch
globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
  if (url.includes('x402.org') || url.includes('facilitator')) {
    console.log('\n   [facilitator →]', url)
    console.log('   body:', init?.body ? JSON.stringify(JSON.parse(init.body as string), null, 2).slice(0, 800) : '(none)')
  }
  const res = await _origFetch(input, init)
  if (url.includes('x402.org') || url.includes('facilitator')) {
    const clone = res.clone()
    const text  = await clone.text()
    console.log(`   [facilitator ←] ${res.status}:`, text.slice(0, 500))
  }
  return res
}

console.log('\n💳 x402 Payment Test')
console.log('=====================')
console.log('Endpoint  :', endpoint)
console.log('Wallet    :', process.env.OPERATOR_WALLET)
console.log()

// Step 1: Hit endpoint without payment — expect 402
console.log('1️⃣  GET without payment (expect 402)...')
const probe = await fetch(endpoint, {
  method:  'POST',
  headers: { 'Content-Type': 'application/json' },
  body:    JSON.stringify({ item: 'test-item' }),
})
console.log('   Status:', probe.status)
if (probe.status !== 402) {
  console.log('   ⚠️  Expected 402, got', probe.status)
  process.exit(1)
}
const requirements = await probe.json()
console.log('   ✅ Got 402 — payment required')
console.log('   Pays to :', requirements.accepts?.[0]?.payTo)
console.log('   Amount  :', requirements.accepts?.[0]?.maxAmountRequired, 'USDC units (=', Number(requirements.accepts?.[0]?.maxAmountRequired) / 1e6, 'USDC)')

// Step 2: Pay via @x402/fetch
console.log('\n2️⃣  Paying via @x402/fetch...')
try {
  const { wrapFetchWithPaymentFromConfig } = await import('@x402/fetch')
  const { ExactEvmScheme }                 = await import('@x402/evm')

  const normalizedPk = (pk.startsWith('0x') ? pk : `0x${pk}`) as `0x${string}`
  const account      = privateKeyToAccount(normalizedPk)

  console.log('   Signer:', account.address)

  const fetchWithPayment = wrapFetchWithPaymentFromConfig(fetch, {
    schemes: [{ x402Version: 1, network: 'eip155:84532', client: new ExactEvmScheme(account) }],
  })

  const response = await fetchWithPayment(endpoint, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ item: 'test-item' }),
  })

  console.log('   Status:', response.status)

  if (response.status === 402) {
    const body = await response.text().catch(() => '(no body)')
    console.log('   ❌ Still 402 — server rejected payment')
    console.log('   Server response:', body)
    process.exit(1)
  }

  const receipt = response.headers.get('x-payment-receipt')
  const payer   = response.headers.get('x-payer')
  console.log('   ✅ Payment settled!')
  console.log('   Tx hash :', receipt)
  console.log('   Payer   :', payer)
  if (receipt) {
    console.log(`   Explorer: https://sepolia.basescan.org/tx/${receipt}`)
  }

} catch (err) {
  console.log('   ❌', err instanceof Error ? err.message : err)
  process.exit(1)
}
