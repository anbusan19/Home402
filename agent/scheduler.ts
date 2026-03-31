/**
 * agent/scheduler.ts
 *
 * Proactive restock scheduler for Casa.
 * Runs every 6 hours and checks Impulse AI predictions.
 * If any item is predicted to run out within 2 days, places an automatic order.
 *
 * Household items tracked: loaded from Storacha preference profile.
 */

import { getDaysToRestock } from '../integrations/impulse.js'
import { loadPreferenceProfile } from '../storage/storacha.js'
import type { processOrder as ProcessOrderFn } from './index.js'

const SCHEDULE_INTERVAL_MS = 6 * 60 * 60 * 1000   // 6 hours
const RESTOCK_THRESHOLD_DAYS = 2                     // order if ≤ 2 days remaining

// Default items to track if no Storacha profile loaded
const DEFAULT_ITEMS = [
  'atta 1kg',
  'milk 500ml',
  'sugar 1kg',
  'rice 1kg',
  'cooking oil 1L',
  'eggs',
  'bread',
  'dal 500g',
]

type OrderFn = typeof ProcessOrderFn

let schedulerRunning = false

async function runSchedulerOnce(onOrder: OrderFn): Promise<void> {
  console.log('\n[scheduler] Running proactive restock check...')

  // Load preference profile to get tracked items
  let trackedItems = DEFAULT_ITEMS
  try {
    const profile = await loadPreferenceProfile()
    if (profile.savedItems.length > 0) {
      trackedItems = profile.savedItems
    }
    console.log(`[scheduler] Checking ${trackedItems.length} items from preference profile`)
  } catch {
    console.log(`[scheduler] Using default items list (${trackedItems.length} items)`)
  }

  // Get restock predictions
  const predictions = await getDaysToRestock(trackedItems)

  const urgent = predictions.filter(p => p.daysUntilRestock <= RESTOCK_THRESHOLD_DAYS)
  console.log(`[scheduler] ${urgent.length} items need restocking within ${RESTOCK_THRESHOLD_DAYS} days`)

  for (const prediction of urgent) {
    console.log(`[scheduler] Auto-ordering: ${prediction.item} (${prediction.daysUntilRestock} days left, confidence: ${(prediction.confidence * 100).toFixed(0)}%)`)

    const statusMessages: string[] = []
    const sendStatus = async (msg: string) => {
      statusMessages.push(msg)
      console.log(`[scheduler] ${msg}`)
    }

    try {
      await onOrder(
        0,                    // chatId=0 for scheduler-initiated orders (no Telegram reply)
        prediction.item,
        null,
        sendStatus
      )
      console.log(`[scheduler] Auto-order completed: ${prediction.item}`)
    } catch (err) {
      console.error(`[scheduler] Auto-order failed for ${prediction.item}:`, err)
    }

    // Brief pause between orders
    await new Promise(r => setTimeout(r, 5000))
  }

  console.log('[scheduler] Check complete\n')
}

/**
 * Start the proactive restock scheduler.
 * Runs immediately on startup, then every 6 hours.
 */
export function startScheduler(onOrder: OrderFn): void {
  if (schedulerRunning) return
  schedulerRunning = true

  // Run after 30s delay on startup (allow session to initialise)
  setTimeout(() => {
    runSchedulerOnce(onOrder).catch(err =>
      console.error('[scheduler] Error:', err)
    )
  }, 30_000)

  // Then run every 6 hours
  setInterval(() => {
    runSchedulerOnce(onOrder).catch(err =>
      console.error('[scheduler] Error:', err)
    )
  }, SCHEDULE_INTERVAL_MS)

  console.log(`[scheduler] Proactive scheduler ready (interval: ${SCHEDULE_INTERVAL_MS / 3600000}h)`)
}
