/**
 * payments/wallet-detector.ts
 *
 * Detects platform wallet type and balance from a checkout page screenshot.
 * Uses Claude vision (brain.ts) to read the checkout UI.
 */

import { Page } from 'playwright'
import { takeScreenshot } from '../browser/navigator.js'
import { detectWalletBalance as brainDetect } from '../agent/brain.js'

export interface WalletInfo {
  found:       boolean
  walletType?: 'zepto_cash' | 'amazon_pay' | 'blinkit_credits' | 'other'
  balanceINR?: number
}

/**
 * Take a screenshot of the current page and use Claude to detect
 * the available platform wallet and its balance.
 */
export async function detectWalletBalance(page: Page): Promise<WalletInfo> {
  const screenshot = await takeScreenshot(page)
  const result     = await brainDetect(screenshot)

  if (!result.found) {
    return { found: false }
  }

  return {
    found:      true,
    walletType: (result.walletType as WalletInfo['walletType']) || 'other',
    balanceINR: result.balanceINR ?? undefined,
  }
}
