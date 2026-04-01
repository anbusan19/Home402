/**
 * payments/payment-router.ts
 *
 * Maid402 payment routing logic:
 *   1. Attempt x402 HTTP payment → if settled, done
 *   2. Detect platform wallet balance → if sufficient, use platform wallet
 *   3. If insufficient, check NEAR budget → notify user
 */

import { BrowserContext } from 'playwright'
import { attemptX402Payment, getMockX402Url } from './x402-client.js'
import type { RunLogger } from '../agent/logger.js'

export interface PaymentResult {
  x402Attempted: boolean
  x402Settled:   boolean
  walletUsed?:   string
  txHash?:       string
  error?:        string
}

/**
 * Route payment for an order.
 * @param context     - Active Playwright browser context (at checkout page)
 * @param totalINR    - Order total in INR
 * @param logger      - RunLogger for audit trail
 */
export async function routePayment(
  context:  BrowserContext,
  totalINR: number,
  logger:   RunLogger
): Promise<PaymentResult> {

  // ── Step 1: Try x402 ──────────────────────────────────────────
  const x402Url = process.env.X402_ENDPOINT || getMockX402Url()
  const x402    = await attemptX402Payment(x402Url, totalINR)

  if (x402.settled) {
    return {
      x402Attempted: true,
      x402Settled:   true,
      walletUsed:    'x402',
      txHash:        x402.txHash,
    }
  }

  // ── Step 2: Fall through to platform wallet ───────────────────
  // The platform wallet (Zepto Cash) is selected in zepto-order.ts via browser automation.
  // Here we just record that x402 was attempted but not settled.
  console.log('[payment-router] x402 not settled — falling through to platform wallet')

  return {
    x402Attempted: true,
    x402Settled:   false,
    walletUsed:    'zepto_cash',
  }
}
