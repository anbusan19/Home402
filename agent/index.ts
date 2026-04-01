/**
 * agent/index.ts
 *
 * Maid402 — Main agent entry point.
 *
 * Initialises all subsystems:
 *   - Telegram bot (grammY)
 *   - Zepto browser session
 *   - Proactive restock scheduler
 *
 * Handles the full order pipeline:
 *   Telegram trigger → budget check → search → add to cart → pay → receipt → reputation update
 */

import 'dotenv/config'
import { BrowserContext } from 'playwright'
import { getZeptoSession }         from '../browser/launcher.js'
import { searchZeptoProducts }     from '../browser/zepto-search.js'
import { placeZeptoOrder }         from '../browser/zepto-order.js'
import { routePayment }            from '../payments/payment-router.js'
import { uploadReceipt }           from '../storage/filecoin.js'
import { loadPreferenceProfile, appendOrderHistory } from '../storage/storacha.js'
import { giveFeedback }            from '../identity/erc8004.js'
import { checkBudget, deductBudget } from '../integrations/near.js'
import { startScheduler }          from './scheduler.js'
import { parseNaturalLanguage }    from './brain.js'
import { createRun }               from './logger.js'
import { startBot, notify }        from '../integrations/telegram.js'
import { startHttpServer }         from '../integrations/http.js'
import type { ZeptoProduct }       from '../browser/zepto-search.js'
import type { OrderReceipt }       from '../storage/filecoin.js'

// ── Global browser session (reused across orders) ────────────────

let globalContext:  BrowserContext | null = null
let globalChatId:   number | null        = null   // last active user (for OTP notifications)

async function getSession(chatId: number): Promise<BrowserContext> {
  if (!globalContext) {
    console.log('[agent] Initialising Zepto browser session...')
    const result = await getZeptoSession(() => {
      if (globalChatId) {
        notify(globalChatId,
          `📱 *OTP sent to your phone.*\nReply with \`/otp <code>\` to continue Zepto login.`
        )
      }
    })
    globalContext = result.context
  }
  globalChatId = chatId
  return globalContext
}

// ── Order pipeline ────────────────────────────────────────────────

export async function processOrder(
  chatId:     number,
  item:       string,
  product:    ZeptoProduct | null,
  sendStatus: (msg: string) => Promise<void>
): Promise<void> {
  const log = createRun('telegram_message', item)

  try {
    await sendStatus(`🏠 *Maid402* is on it — ordering *${item}*...`)
    log.step('start_order', 'agent', { status: 'success', item })

    // ── Step 1: Load agent memory (preferences) ──────────────────
    try {
      const profile = await loadPreferenceProfile()
      log.step('load_memory', 'storacha', { status: 'success', message: `Loaded ${profile.savedItems.length} saved items` })
    } catch {
      log.step('load_memory', 'storacha', { status: 'skipped', message: 'Storacha not configured' })
    }

    // ── Step 2: Budget check ──────────────────────────────────────
    let orderTotalINR = 100
    try {
      const budget = await checkBudget('groceries', orderTotalINR)
      if (!budget.approved) {
        await sendStatus(`🚫 *Budget cap reached!*\nWeekly grocery budget (₹500) is exhausted.\nRemaining: ₹${budget.remainingINR}`)
        log.step('near_budget_check', 'near-contract', { status: 'failed', budgetRemainingINR: budget.remainingINR, orderTotalINR })
        await log.finish('failed')
        return
      }
      log.step('near_budget_check', 'near-contract', { status: 'success', budgetRemainingINR: budget.remainingINR, orderTotalINR })
    } catch {
      log.step('near_budget_check', 'near-contract', { status: 'skipped', message: 'NEAR not configured' })
    }

    // ── Step 3: Get browser context ───────────────────────────────
    log.step('load_session', 'playwright', { status: 'success' })
    const context = await getSession(chatId)

    // ── Step 4: x402 attempt ──────────────────────────────────────
    await sendStatus(`💳 Attempting x402 payment...`)
    const paymentResult = await routePayment(context, orderTotalINR, log)
    const walletUsed    = paymentResult.walletUsed

    if (paymentResult.x402Settled) {
      log.step('x402_attempt', 'x402-client', { status: 'success', fallback: undefined })
      await sendStatus(`✅ *x402 payment settled!*`)
    } else {
      log.step('x402_attempt', 'x402-client', { status: 'no_402_response', fallback: 'platform_wallet' })
    }

    // ── Step 5: Find product ──────────────────────────────────────
    let selectedProduct = product
    if (!selectedProduct) {
      await sendStatus(`🔍 Searching for *${item}*...`)
      const results = await searchZeptoProducts(context, item)
      if (results.length === 0) {
        await sendStatus(`❌ No products found for "${item}" on Zepto.`)
        log.step('search', 'playwright', { status: 'failed', message: 'No results' })
        await log.finish('failed')
        return
      }
      selectedProduct = results[0]
      log.step('search', 'playwright', { status: 'success', item: selectedProduct.name })
      await sendStatus(`✅ Found: *${selectedProduct.name}* (${selectedProduct.price})`)
    }

    // ── Step 6: Add to cart + checkout (single page) ──────────────
    await sendStatus(`🛒 Navigating Zepto checkout...`)
    const zepto = await placeZeptoOrder(context, selectedProduct.name, selectedProduct.url)

    const priceText = zepto.price || selectedProduct.price
    const parsed    = priceText.match(/[\d.]+/)
    orderTotalINR   = parsed ? parseFloat(parsed[0]) : 100

    log.step('add_to_cart',       'playwright', { status: 'success', item: zepto.item })
    log.step('pay_platform_wallet', 'playwright', {
      status:    walletUsed ? 'success' : 'skipped',
      wallet:    walletUsed || 'zepto_cash',
      amountINR: orderTotalINR,
    })

    // ── Step 7: Deduct NEAR budget ────────────────────────────────
    try {
      const deductTx = await deductBudget('groceries', orderTotalINR)
      log.step('near_deduct', 'near-contract', { status: 'success', txHash: deductTx, amountINR: orderTotalINR })
    } catch {
      log.step('near_deduct', 'near-contract', { status: 'skipped' })
    }

    // ── Step 8: Store receipt on Filecoin ─────────────────────────
    await sendStatus(`📦 Storing receipt on Filecoin...`)
    let pieceCID = ''
    try {
      const receipt: OrderReceipt = {
        agentId:         null,
        operatorWallet:  process.env.OPERATOR_WALLET || '0x0',
        orderId:         zepto.zeptoOrderId,
        platform:        'zepto',
        items:           [{ name: zepto.item, qty: 1, priceINR: orderTotalINR }],
        totalINR:        orderTotalINR,
        walletUsed:      walletUsed || 'zepto_cash',
        x402Attempted:   true,
        x402Settled:     paymentResult.x402Settled,
        timestamp:       new Date().toISOString(),
        pieceCID:        '',
        nearSpendRecord: '',
      }
      pieceCID = await uploadReceipt(receipt)
      log.step('store_receipt_filecoin', 'synapse-sdk', { status: 'success', pieceCID, network: 'filecoin-calibration' })
      await sendStatus(`📄 Receipt stored: \`${pieceCID}\``)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      log.step('store_receipt_filecoin', 'synapse-sdk', { status: 'failed', error: msg })
    }

    // ── Step 9: Update ERC-8004 reputation ───────────────────────
    let reputationTx = ''
    try {
      reputationTx = await giveFeedback(1, 'order_completed', pieceCID)
      log.step('update_reputation', 'erc8004-reputation-registry', { status: 'success', signal: '+1', txHash: reputationTx })
    } catch {
      log.step('update_reputation', 'erc8004-reputation-registry', { status: 'skipped' })
    }

    // ── Step 10: Update Storacha order history ────────────────────
    try {
      await appendOrderHistory({
        orderId:   zepto.zeptoOrderId,
        item:      zepto.item,
        platform:  'zepto',
        priceINR:  orderTotalINR,
        timestamp: new Date().toISOString(),
      })
      log.step('update_memory', 'storacha', { status: 'success' })
    } catch {
      log.step('update_memory', 'storacha', { status: 'skipped' })
    }

    // ── Step 11: Confirmation ─────────────────────────────────────
    const confirmation =
      `📦 *Order Placed!*\n\n` +
      `Item: ${zepto.item}\n` +
      `Price: ${zepto.price}\n` +
      `ETA: ${zepto.eta}\n` +
      `Order ID: \`${zepto.zeptoOrderId}\`` +
      (pieceCID ? `\nReceipt: \`${pieceCID.slice(0, 20)}…\` (Filecoin)` : '') +
      (reputationTx ? `\nReputation updated ✅` : '')

    log.step('telegram_confirm', 'grammy', {
      status:  'success',
      message: confirmation,
    })
    await sendStatus(confirmation)
    await log.finish('success')

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[agent] Order failed:', message)
    log.step('error', 'agent', { status: 'failed', error: message })

    // Update reputation with failure
    try {
      await giveFeedback(-1, 'order_failed', '')
    } catch { /* ignore */ }

    await sendStatus(`❌ Order failed: ${message}`)
    await log.finish('failed')
  }
}

// ── Search handler ────────────────────────────────────────────────

async function handleSearch(
  chatId:  number,
  query:   string,
  _sendStatus: (msg: string) => Promise<void>
): Promise<ZeptoProduct[]> {
  const context = await getSession(chatId)
  return searchZeptoProducts(context, query)
}

// ── Budget handler ────────────────────────────────────────────────

async function handleBudget(_chatId: number): Promise<string> {
  try {
    const budget = await checkBudget('groceries', 0)
    return (
      `💰 *Spend Caps (NEAR)*\n\n` +
      `Groceries: ₹${budget.remainingINR} remaining this week\n` +
      `Weekly cap: ₹500`
    )
  } catch {
    return '❌ Budget contract not configured — set NEAR_ACCOUNT_ID in .env'
  }
}

// ── Natural language handler ──────────────────────────────────────

export async function handleNaturalLanguage(
  chatId:     number,
  message:    string,
  sendStatus: (msg: string) => Promise<void>
): Promise<boolean> {
  let intent
  try {
    intent = await parseNaturalLanguage(message)
  } catch {
    return false // let the caller decide what to do
  }

  if (intent.intent === 'unknown') return false

  // Always echo back what we understood
  await sendStatus(intent.reply)

  if (intent.intent === 'order' && intent.items.length > 0) {
    // Build search query including brand hint, e.g. "Hocco ice cream sandwich"
    const orderArg = intent.items.join(', ')
    await processOrder(chatId, orderArg, null, sendStatus)
    return true
  }

  if (intent.intent === 'search' && intent.items.length > 0) {
    const context  = await getSession(chatId)
    const results  = await searchZeptoProducts(context, intent.items[0])
    if (results.length === 0) {
      await sendStatus(`❌ No results found for "${intent.items[0]}".`)
    } else {
      const list = results.map((p, i) => `*${i + 1}.* ${p.name} — ${p.price}`).join('\n')
      await sendStatus(`🛒 *Results for "${intent.items[0]}":*\n\n${list}\n\nReply with a number to order, or /cancel.`)
    }
    return true
  }

  if (intent.intent === 'budget') {
    const msg = await handleBudget(chatId)
    await sendStatus(msg)
    return true
  }

  return false
}

// ── Bootstrap ─────────────────────────────────────────────────────

async function main() {
  console.log('\n🏠 Maid402 — Autonomous Home Commerce Agent')
  console.log('=========================================\n')

  // Load initial agent memory
  try {
    const profile = await loadPreferenceProfile()
    console.log(`[agent] Loaded preference profile: ${profile.savedItems.length} saved items, ${profile.orderHistory.length} past orders`)
  } catch {
    console.log('[agent] No Storacha profile yet — will create on first order')
  }

  // Start proactive restock scheduler
  startScheduler(processOrder)
  console.log('[agent] Restock scheduler started (6h interval)')

  // Start Telegram bot
  startBot(processOrder, handleSearch, handleBudget, handleNaturalLanguage)
  startHttpServer(handleNaturalLanguage)
  console.log('[agent] Ready — waiting for Telegram messages\n')
}

main().catch(err => {
  console.error('[agent] Fatal error:', err)
  process.exit(1)
})
