/**
 * integrations/telegram.ts
 *
 * Casa Telegram bot — built with grammY.
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
    await ctx.reply(
      `🏠 *Casa — Your Autonomous Home Agent*\n\n` +
      `I manage your household shopping. Send me what you need and I'll order it silently.\n\n` +
      `*Commands:*\n` +
      `/search <query> — find products on Zepto\n` +
      `/order <item> — order one item (or comma-separated list)\n` +
      `/budget — check your weekly spend cap\n` +
      `/otp <code> — submit login OTP if prompted\n` +
      `/cancel — cancel active search\n\n` +
      `_Example: /search 1kg atta_`,
      { parse_mode: 'Markdown' }
    )
  })

  // ── /otp ─────────────────────────────────────────────────────
  bot.command('otp', async (ctx) => {
    const code = ctx.match?.trim()
    if (!code) return ctx.reply('Usage: /otp <6-digit code>')
    provideOtp(code)
    await ctx.reply('✅ OTP submitted — login continuing...')
  })

  // ── /cancel ───────────────────────────────────────────────────
  bot.command('cancel', async (ctx) => {
    pendingSearches.delete(ctx.chat.id)
    await ctx.reply('❌ Cancelled.')
  })

  // ── /budget ───────────────────────────────────────────────────
  bot.command('budget', async (ctx) => {
    try {
      const msg = await onBudget(ctx.chat.id)
      await ctx.reply(msg, { parse_mode: 'Markdown' })
    } catch (err) {
      await ctx.reply(`❌ Could not fetch budget: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  })

  // ── /search ───────────────────────────────────────────────────
  bot.command('search', async (ctx) => {
    const query = ctx.match?.trim()
    if (!query) return ctx.reply('Usage: /search <query>\nExample: /search milk')

    const chatId = ctx.chat.id

    const sendStatus = (msg: string) =>
      bot!.api.sendMessage(chatId, msg, { parse_mode: 'Markdown' }).then(() => {})

    await sendStatus(`🔍 Searching Zepto for *"${query}"*...`)

    try {
      const products = await onSearch(chatId, query, sendStatus)

      if (products.length === 0) {
        return sendStatus(`❌ No products found for *"${query}"*. Try a different query.`)
      }

      pendingSearches.set(chatId, products)

      const list = products.map((p, i) => `*${i + 1}.* ${p.name} — ${p.price}`).join('\n')
      await sendStatus(
        `🛒 *Results for "${query}":*\n\n${list}\n\n` +
        `Reply with a number to order, or /cancel to abort.`
      )
    } catch (err) {
      await sendStatus(`❌ Search failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  })

  // ── /order ────────────────────────────────────────────────────
  bot.command('order', async (ctx) => {
    const item = ctx.match?.trim()
    if (!item) return ctx.reply('Usage: /order <item>\nExamples:\n  /order atta 1kg\n  /order milk, eggs, bread')

    const chatId    = ctx.chat.id
    const sendStatus = (msg: string) =>
      bot!.api.sendMessage(chatId, msg, { parse_mode: 'Markdown' }).then(() => {})

    await sendStatus(`🛒 Ordering *${item}* — starting autonomous flow...`)
    await onOrder(chatId, item, null, sendStatus)
  })

  // ── Free-text: number selection after /search, or natural language ──
  bot.on('message:text', async (ctx) => {
    const chatId = ctx.chat.id
    const text   = ctx.message.text?.trim()
    if (!text || text.startsWith('/')) return

    const sendStatus = (msg: string) =>
      bot!.api.sendMessage(chatId, msg, { parse_mode: 'Markdown' }).then(() => {})

    // If there's a pending search, try number selection first
    const products = pendingSearches.get(chatId)
    if (products) {
      const num = parseInt(text, 10)
      if (!isNaN(num) && num >= 1 && num <= products.length) {
        const selected = products[num - 1]
        pendingSearches.delete(chatId)
        await sendStatus(`✅ Selected: *${selected.name}* (${selected.price})\n\n⏳ Starting order flow...`)
        await onOrder(chatId, selected.name, selected, sendStatus)
        return
      }
      // Not a valid number — fall through to NL handler
      pendingSearches.delete(chatId)
    }

    // Try natural language understanding
    if (onNL) {
      const handled = await onNL(chatId, text, sendStatus).catch(() => false)
      if (handled) return
    }

    // Fallback hint
    await sendStatus(
      `I'm not sure what you mean. Try:\n` +
      `/order milk, eggs\n` +
      `/search hocco ice cream\n` +
      `or just say _"order me X"_ or _"find X"_`
    )
  })

  bot.catch((err) => {
    console.error('[telegram] Bot error:', err.message)
  })

  bot.start()
  console.log('[telegram] Casa bot started (grammY long-polling)')
  return bot
}

/** Send a message to a chat (used by agent/index.ts for proactive notifications) */
export async function notify(chatId: number, message: string): Promise<void> {
  if (!bot) return
  await bot.api.sendMessage(chatId, message, { parse_mode: 'Markdown' })
}
