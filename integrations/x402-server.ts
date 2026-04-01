/**
 * integrations/x402-server.ts
 *
 * x402 payment gate for the Maid402 agent.
 * Wraps the public /api/order endpoint so callers must pay 1 USDC on Base Sepolia
 * before the agent will execute an order.
 *
 * Protocol flow:
 *   1. POST /api/order  (no X-PAYMENT header)
 *      → 402 with payment requirements JSON
 *   2. Client signs EIP-3009 transferWithAuthorization off-chain
 *   3. POST /api/order  (X-PAYMENT: <base64 payload>)
 *      → Agent calls Coinbase x402 facilitator to verify + settle on-chain
 *      → On success, agent executes the order and streams SSE
 *
 * Facilitator: https://x402.org/facilitator  (Coinbase-operated, public)
 */

import { HTTPFacilitatorClient }        from '@x402/core/server'
import { decodePaymentSignatureHeader } from '@x402/core/http'
import type { PaymentRequirements, PaymentPayload } from '@x402/core/types'

// ── Constants ─────────────────────────────────────────────────────────

/** USDC contract on Base Sepolia */
const USDC_BASE_SEPOLIA = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'

/** Service fee: 1 USDC (6 decimals) — covers agent work, not the grocery cost */
const SERVICE_AMOUNT = process.env.X402_SERVICE_AMOUNT ?? '1000000'

const TIMEOUT_SECONDS = 300

// ── Facilitator client (calls https://x402.org/facilitator by default) ─

const facilitator = new HTTPFacilitatorClient()

// ── 402 response body ─────────────────────────────────────────────────

/**
 * Returns the payment requirements in v1 body format.
 * v1 body is supported by @x402/fetch and most wallets.
 */
export function build402Body(resourceUrl: string) {
  return {
    x402Version: 1,
    error:       'Payment required',
    accepts: [{
      scheme:            'exact',
      network:           'base-sepolia',
      maxAmountRequired: SERVICE_AMOUNT,
      resource:          resourceUrl,
      description:       'Maid402 grocery ordering — 1 USDC service fee',
      mimeType:          'application/json',
      payTo:             process.env.OPERATOR_WALLET ?? '',
      maxTimeoutSeconds: TIMEOUT_SECONDS,
      asset:             USDC_BASE_SEPOLIA,
      extra:             { name: 'USDC', decimals: 6, version: '2' },
    }],
  }
}

// ── Payment verification ──────────────────────────────────────────────

export interface PaymentResult {
  paid:    boolean
  payer?:  string
  txHash?: string
  error?:  string
}

/**
 * Decode the X-PAYMENT header, verify the EIP-3009 authorization signature
 * via the x402 facilitator, then settle (submit the on-chain USDC transfer).
 *
 * Returns { paid: true, txHash, payer } on success.
 */
export async function processX402Payment(
  paymentHeader: string,
  resourceUrl:   string
): Promise<PaymentResult> {
  // PaymentRequirements shape expected by the facilitator
  const requirements: PaymentRequirements = {
    scheme:            'exact',
    network:           'base-sepolia',
    asset:             USDC_BASE_SEPOLIA,
    amount:            SERVICE_AMOUNT,
    payTo:             process.env.OPERATOR_WALLET ?? '',
    maxTimeoutSeconds: TIMEOUT_SECONDS,
    extra:             { name: 'USDC', decimals: 6, version: '2' },
  }

  // Decode base64 X-PAYMENT header → PaymentPayload
  let payload: PaymentPayload
  try {
    payload = decodePaymentSignatureHeader(paymentHeader)
  } catch (err) {
    return { paid: false, error: `Invalid X-PAYMENT header: ${err}` }
  }

  // ── Step 1: Verify EIP-3009 signature ───────────────────────────
  let verifyResult
  try {
    verifyResult = await facilitator.verify(payload, requirements)
  } catch (err) {
    return { paid: false, error: `Facilitator verify error: ${err}` }
  }

  if (!verifyResult.isValid) {
    const reason = verifyResult.invalidReason ?? verifyResult.invalidMessage ?? 'Invalid payment'
    return { paid: false, error: reason }
  }

  // ── Step 2: Settle — submits transferWithAuthorization on-chain ──
  let settleResult
  try {
    settleResult = await facilitator.settle(payload, requirements)
  } catch (err) {
    return { paid: false, error: `Facilitator settle error: ${err}` }
  }

  if (!settleResult.success) {
    const reason = settleResult.errorReason ?? settleResult.errorMessage ?? 'Settlement failed'
    return { paid: false, error: reason }
  }

  console.log(`[x402] Payment settled ✅  tx=${settleResult.transaction}  payer=${settleResult.payer}`)
  return { paid: true, payer: settleResult.payer, txHash: settleResult.transaction }
}
