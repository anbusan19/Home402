/**
 * integrations/telegram.ts
 *
 * Maid402 Telegram bot — built with grammY.
 * Receives orders from users, triggers the full autonomous order pipeline,
 * and sends real-time status updates.
 *
 * Commands:
 *   /start        — welcome + help
 *   /search       — search Zepto for products
 *   /order        — order an item by name (direct)
 *   /budget       — check current NEAR spend cap remaining
 *   /otp          — submit Zepto login OTP
 *   /cancel       — cancel active search
 */

import { Bot, Context } from 'grammy'
import { provideOtp }   from '../browser/launcher.js'
import type { ZeptoProduct } from '../browser/zepto-search.js'

// Injected by agent/index.ts when the bot is started
export type OrderHandler = (
  chatId:  number,
  item:    string,
  product: ZeptoProduct | null,
  sendStatus: (msg: string) => Promise<void>
) => Promise<void>

export type SearchHandler = (
  chatId:  number,
  query:   string,
  sendStatus: (msg: string) => Promise<void>
) => Promise<ZeptoProduct[]>

export type BudgetHandler = (chatId: number) => Promise<string>

export type NLHandler = (
  chatId:     number,
  message:    string,
  sendStatus: (msg: string) => Promise<void>
) => Promise<boolean>

// Per-chat pending search results
const pendingSearches = new Map<number, ZeptoProduct[]>()

let bot: Bot<Context> | null = null

// ── Formatting helpers ────────────────────────────────────────────────

/** Escape special chars for Telegram MarkdownV2 */
function esc(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&')
}

/** Build a visual progress bar (filled/empty blocks) */
function progressBar(pct: number, width = 10): string {
  const filled = Math.round((pct / 100) * width)
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

/** Format USDC micro-units to human-readable */
function formatUsdc(microUsdc: string | number): string {
  return `$${(Number(microUsdc) / 1_000_000).toFixed(2)} USDC`
}

// ── Message templates ─────────────────────────────────────────────────

const WELCOME = `\
🏠 *Maid402 — Autonomous Home Commerce Agent*

I handle your household shopping end\\-to\\-end using crypto payment rails\\.

*What I can do:*
🛒  Search & order from Zepto \\(10\\-min delivery\\)
💳  Pay via x402 protocol \\(Base Sepolia USDC\\)
🔒  Enforce your NEAR spend cap on\\-chain
🧠  Predict restocks with AI \\(Impulse XGBoost\\)
📦  Archive receipts to Filecoin

*Commands:*
\`/search <query>\`  — find products on Zepto
\`/order <item>\`    — place an order directly
\`/budget\`          — check your weekly spend cap
\`/otp <code>\`      — submit Zepto login OTP
\`/cancel\`          — abort current search

*Example:*
\`/search 1kg aashirvaad atta\`

_Powered by Zepto · x402 · NEAR · Filecoin · Storacha_`

function buildOrderCard(opts: {
  item:    string
  price?:  string
  qty?:    string
  eta?:    string
  txHash?: string
  payer?:  string
  budget?: string
  cid?:    string
}): string {
  const lines: string[] = []

  lines.push(`✅ *Order Placed Successfully\\!*\n`)
  lines.push(`📦 *Item:* ${esc(opts.item)}`)
  if (opts.price) lines.push(`💰 *Price:* ${esc(opts.price)}`)
  if (opts.qty)   lines.push(`🔢 *Qty:* ${esc(opts.qty)}`)
  if (opts.eta)   lines.push(`⏱ *ETA:* ${esc(opts.eta)}`)

  if (opts.txHash) {
    const short = `${opts.txHash.slice(0, 8)}…${opts.txHash.slice(-6)}`
    lines.push(`\n💳 *x402 Payment*`)
    lines.push(`├ Tx: \`${opts.txHash}\``)
    lines.push(`└ [View on BaseScan](https://sepolia.basescan.org/tx/${opts.txHash})`)
  }

  if (opts.budget) {
    lines.push(`\n🔒 *NEAR Spend Cap*`)
    lines.push(`└ ${esc(opts.budget)} remaining`)
  }

  if (opts.cid) {
    lines.push(`\n📦 *Receipt CID:* \`${opts.cid}\``)
  }

  return lines.join('\n')
}

function buildSearchResults(query: string, products: ZeptoProduct[]): string {
  const header = `🔎 *Search: "${esc(query)}"*\n`
  const items = products.map((p, i) => {
    const name  = esc(p.name)
    const price = esc(p.price ?? '—')
    return `*${i + 1}\\.* ${name}\n    💰 ${price}`
  }).join('\n\n')

  return (
    header + '\n' + items + '\n\n' +
    `_Reply with a number to order, or /cancel to abort\\._`
  )
}

export function buildBudgetCard(raw: string): string {
  // Try to parse structured budget info from the raw string
  // Expected raw: "Remaining: ₹450 / ₹500 (90%)" or similar
  // Fall back to just echoing raw if not parseable
  const match = raw.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/)
  if (match) {
    const used      = parseFloat(match[1])
    const total     = parseFloat(match[2])
    const remaining = total - used
    const pct       = Math.round((remaining / total) * 100)
    const bar       = progressBar(pct)

    return (
      `🔒 *Weekly Spend Cap — NEAR Contract*\n\n` +
      `${bar} ${pct}%\n\n` +
      `├ Remaining: *₹${remaining.toFixed(2)}*\n` +
      `├ Used:      ₹${used.toFixed(2)}\n` +
      `└ Total:     ₹${total.toFixed(2)}\n\n` +
      `_Enforced on\\-chain via \`maid402\\.testnet\`_`
    )
  }

  // Fallback: decorate the raw string
  return `🔒 *NEAR Spend Cap*\n\n${esc(raw)}`
}

// ── Step-by-step order status ─────────────────────────────────────────

export function formatOrderStep(step: string): string {
  const stepMap: Record<string, string> = {
    searching:      '🔍 *Searching* Zepto for your item\\.\\.\\.',
    found:          '✅ *Product found\\!* Adding to cart\\.\\.\\.',
    adding:         '🛒 *Adding to cart* on Zepto\\.\\.\\.',
    paying:         '💳 *Processing x402 payment* \\(Base Sepolia USDC\\)\\.\\.\\.',
    payment_ok:     '✅ *Payment settled on\\-chain\\!*',
    checkout:       '🏁 *Checking out* via Zepto Cash\\.\\.\\.',
    near_check:     '🔒 *Checking NEAR spend cap\\.\\.\\.*',
    near_ok:        '✅ *Spend cap approved\\!* Budget updated\\.',
    storing:        '📦 *Archiving receipt* to Filecoin\\.\\.\\.',
    done:           '🎉 *Order complete\\!* Your items are on the way\\.',
    failed:         '❌ *Order failed* — see details below\\.',
  }

  const key = step.toLowerCase().replace(/\s+/g, '_')
  return stepMap[key] ?? `⚙️ ${esc(step)}`
}

// ── Bot ───────────────────────────────────────────────────────────────

export function startBot(
  onOrder:  OrderHandler,
  onSearch: SearchHandler,
  onBudget: BudgetHandler,
  onNL?:    NLHandler
): Bot<Context> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN not set in .env')

  bot = new Bot<Context>(token)

  // ── /start ───────────────────────────────────────────────────
  bot.command('start', async (ctx) => {
    await ctx.reply(WELCOME, { parse_mode: 'MarkdownV2', link_preview_options: { is_disabled: true } })
  })

  // ── /otp ─────────────────────────────────────────────────────
  bot.command('otp', async (ctx) => {
    const code = ctx.match?.trim()
    if (!code) return ctx.reply('Usage: /otp <6\\-digit code>', { parse_mode: 'MarkdownV2' })
    provideOtp(code)
    await ctx.reply('✅ OTP submitted — resuming login\\.', { parse_mode: 'MarkdownV2' })
  })

  // ── /cancel ───────────────────────────────────────────────────
  bot.command('cancel', async (ctx) => {
    pendingSearches.delete(ctx.chat.id)
    await ctx.reply('❌ Cancelled\\.', { parse_mode: 'MarkdownV2' })
  })

  // ── /budget ───────────────────────────────────────────────────
  bot.command('budget', async (ctx) => {
    try {
      const raw  = await onBudget(ctx.chat.id)
      const card = buildBudgetCard(raw)
      await ctx.reply(card, { parse_mode: 'MarkdownV2' })
    } catch (err) {
      const msg = esc(err instanceof Error ? err.message : 'Unknown error')
      await ctx.reply(`❌ *Could not fetch budget*\n\n${msg}`, { parse_mode: 'MarkdownV2' })
    }
  })

  // ── /search ───────────────────────────────────────────────────
  bot.command('search', async (ctx) => {
    const query = ctx.match?.trim()
    if (!query) {
      return ctx.reply(
        '❓ *Usage:* `/search <query>`\n_Example: /search amul milk 1L_',
        { parse_mode: 'MarkdownV2' }
      )
    }

    const chatId = ctx.chat.id
    const sendStatus = (msg: string) =>
      bot!.api.sendMessage(chatId, msg, { parse_mode: 'MarkdownV2' }).then(() => {})

    await sendStatus(`🔍 Searching Zepto for *"${esc(query)}"*\\.\\.\\.`)

    try {
      const products = await onSearch(chatId, query, sendStatus)

      if (products.length === 0) {
        return sendStatus(`❌ *No results* for *"${esc(query)}"*\\. Try a different search term\\.`)
      }

      pendingSearches.set(chatId, products)
      await sendStatus(buildSearchResults(query, products))
    } catch (err) {
      const msg = esc(err instanceof Error ? err.message : 'Unknown error')
      await sendStatus(`❌ *Search failed*\n\n${msg}`)
    }
  })

  // ── /order ────────────────────────────────────────────────────
  bot.command('order', async (ctx) => {
    const item = ctx.match?.trim()
    if (!item) {
      return ctx.reply(
        '❓ *Usage:* `/order <item>`\n\n_Examples:_\n`/order atta 1kg`\n`/order milk, eggs, bread`',
        { parse_mode: 'MarkdownV2' }
      )
    }

    const chatId     = ctx.chat.id
    const sendStatus = (msg: string) =>
      bot!.api.sendMessage(chatId, msg, { parse_mode: 'MarkdownV2' }).then(() => {})

    await sendStatus(`🛒 Starting order for *${esc(item)}*\\.\\.\\.`)
    await onOrder(chatId, item, null, sendStatus)
  })

  // ── Free-text: number selection after /search, or natural language ──
  bot.on('message:text', async (ctx) => {
    const chatId = ctx.chat.id
    const text   = ctx.message.text?.trim()
    if (!text || text.startsWith('/')) return

    const sendStatus = (msg: string) =>
      bot!.api.sendMessage(chatId, msg, { parse_mode: 'MarkdownV2' }).then(() => {})

    // If there's a pending search, try number selection first
    const products = pendingSearches.get(chatId)
    if (products) {
      const num = parseInt(text, 10)
      if (!isNaN(num) && num >= 1 && num <= products.length) {
        const selected = products[num - 1]
        pendingSearches.delete(chatId)
        await sendStatus(
          `✅ *Selected:* ${esc(selected.name)}\n` +
          `💰 ${esc(selected.price ?? '—')}\n\n` +
          `⏳ Starting autonomous order flow\\.\\.\\.`
        )
        await onOrder(chatId, selected.name, selected, sendStatus)
        return
      }
      pendingSearches.delete(chatId)
    }

    // Try natural language understanding
    if (onNL) {
      const handled = await onNL(chatId, text, sendStatus).catch(() => false)
      if (handled) return
    }

    // Fallback hint
    await sendStatus(
      `🤔 *Not sure what you mean\\.*\n\n` +
      `Try one of these:\n` +
      `• \`/order milk, eggs\`\n` +
      `• \`/search hocco ice cream\`\n` +
      `• _"order me 1kg atta"_\n` +
      `• _"find oat milk"_`
    )
  })

  bot.catch((err) => {
    console.error('[telegram] Bot error:', err.message)
  })

  bot.start()
  console.log('[telegram] Maid402 bot started (grammY long-polling)')
  return bot
}

/** Send a message to a chat (used by agent/index.ts for proactive notifications) */
export async function notify(chatId: number, message: string): Promise<void> {
  if (!bot || !chatId) return
  await bot.api.sendMessage(chatId, message, { parse_mode: 'MarkdownV2' })
}

/** Send a formatted order confirmation card (no-op if chatId is 0 / web UI context) */
export async function notifyOrderComplete(chatId: number, opts: {
  item:    string
  price?:  string
  qty?:    string
  eta?:    string
  txHash?: string
  payer?:  string
  budget?: string
  cid?:    string
}): Promise<void> {
  if (!bot || !chatId) return   // chatId=0 means web UI — skip Telegram send
  const card = buildOrderCard(opts)
  await bot.api.sendMessage(chatId, card, {
    parse_mode:           'MarkdownV2',
    link_preview_options: { is_disabled: true },
  })
}

/** Expose helpers for use in agent/index.ts */
export { buildOrderCard, esc }
