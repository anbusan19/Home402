/**
 * browser/launcher.ts
 *
 * Stealth Chromium browser factory for Casa.
 * Supports multiple platforms — each with its own session file under browser/sessions/.
 *
 * Usage:
 *   const { browser, context } = await getPlatformSession('zepto')
 */

import { chromium, Browser, BrowserContext } from 'playwright'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const SESSION_DIR = path.join(__dirname, 'sessions')

const USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

export type Platform = 'zepto' | 'blinkit' | 'amazon' | 'swiggy'

const PLATFORM_URLS: Record<Platform, string> = {
  zepto:   'https://www.zepto.com',
  blinkit: 'https://blinkit.com',
  amazon:  'https://www.amazon.in',
  swiggy:  'https://www.swiggy.com/instamart',
}

// ── OTP handling (shared across platforms) ───────────────────────

let otpResolver: ((otp: string) => void) | null = null
let otpRejecter:  ((err: Error)  => void) | null = null

export function provideOtp(otp: string) {
  if (otpResolver) {
    otpResolver(otp)
    otpResolver = null
    otpRejecter = null
  }
}

export function waitForOtp(timeoutMs = 5 * 60 * 1000): Promise<string> {
  return new Promise((resolve, reject) => {
    otpResolver = resolve
    otpRejecter = reject
    setTimeout(() => {
      if (otpRejecter) {
        otpRejecter(new Error('OTP timeout — no OTP received within 5 minutes'))
        otpResolver = null
        otpRejecter = null
      }
    }, timeoutMs)
  })
}

// ── Browser context factory ──────────────────────────────────────

async function injectStealth(context: BrowserContext) {
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
  })
}

function sessionFile(platform: Platform): string {
  return path.join(SESSION_DIR, `${platform}.json`)
}

export async function saveSession(context: BrowserContext, platform: Platform): Promise<void> {
  const state = await context.storageState()
  await fs.writeFile(sessionFile(platform), JSON.stringify(state, null, 2))
  console.log(`[launcher] Session saved for ${platform} ✅`)
}

/**
 * Get a ready BrowserContext for a platform.
 * Tries the saved session first; falls back to creating a fresh context.
 * Caller is responsible for login if fresh.
 */
export async function getPlatformContext(
  platform: Platform,
  browser?: Browser
): Promise<{ browser: Browser; context: BrowserContext; fresh: boolean }> {
  const b = browser ?? await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  })

  const sf = sessionFile(platform)

  // Try saved session
  try {
    const raw          = await fs.readFile(sf, 'utf-8')
    const storageState = JSON.parse(raw)
    const context      = await b.newContext({
      userAgent: USER_AGENT,
      viewport:  { width: 390, height: 844 },
      locale:    'en-IN',
      geolocation: { latitude: 12.9903, longitude: 80.2456 }, // Chennai Tharamani
      permissions: ['geolocation'],
      storageState,
    })
    await injectStealth(context)
    console.log(`[launcher] Loaded saved session for ${platform}`)
    return { browser: b, context, fresh: false }
  } catch {
    console.log(`[launcher] No saved session for ${platform} — creating fresh context`)
  }

  // Fresh context (no session)
  const context = await b.newContext({
    userAgent: USER_AGENT,
    viewport:  { width: 390, height: 844 },
    locale:    'en-IN',
    geolocation: { latitude: 12.9903, longitude: 80.2456 },
    permissions: ['geolocation'],
  })
  await injectStealth(context)
  return { browser: b, context, fresh: true }
}

/**
 * Full session getter for Zepto (includes login flow).
 * Validates the saved session; re-logins if expired.
 */
export async function getZeptoSession(
  onOtpNeeded?: () => void
): Promise<{ browser: Browser; context: BrowserContext }> {
  const { browser, context, fresh } = await getPlatformContext('zepto')

  if (!fresh) {
    // Validate session
    const page = await context.newPage()
    try {
      await page.goto(PLATFORM_URLS.zepto, { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForTimeout(2000)
      await page.goto(`${PLATFORM_URLS.zepto}/?cart=open`, { waitUntil: 'networkidle', timeout: 20000 })
      await page.waitForTimeout(2000)
      const needsLogin = await page.locator('text=Please Login').isVisible().catch(() => false)
      await page.close()

      if (!needsLogin) {
        console.log('[launcher] Zepto session valid ✅')
        return { browser, context }
      }
      console.log('[launcher] Zepto session expired — re-logging in')
    } catch {
      await page.close()
    }
    await context.close()
  }

  // Fresh login
  const freshCtx = fresh ? context : await browser.newContext({
    userAgent: USER_AGENT,
    viewport:  { width: 390, height: 844 },
    locale:    'en-IN',
    geolocation: { latitude: 12.9903, longitude: 80.2456 },
    permissions: ['geolocation'],
  })
  if (!fresh) await injectStealth(freshCtx)

  await loginZepto(freshCtx, onOtpNeeded)
  return { browser, context: freshCtx }
}

/** Full Zepto login: phone → OTP → session saved */
async function loginZepto(context: BrowserContext, onOtpNeeded?: () => void) {
  const phone = process.env.ZEPTO_PHONE
  if (!phone) throw new Error('ZEPTO_PHONE not set in .env')

  const page = await context.newPage()

  await page.goto(PLATFORM_URLS.zepto, { waitUntil: 'networkidle', timeout: 40000 })
  await page.waitForTimeout(3000)

  await page.click('[data-testid="search-bar-icon"]')
  await page.waitForTimeout(1500)
  const searchInput = await page.$('input[type="search"], input[placeholder*="earch" i]')
  await searchInput!.fill('water')
  await page.waitForTimeout(2000)
  await page.locator('text=Water').first().click()
  await page.waitForTimeout(3000)
  await page.locator('button', { hasText: 'ADD' }).first().click()
  await page.waitForTimeout(2000)
  await page.locator('text=Cart').first().click()
  await page.waitForTimeout(3000)

  await page.locator('button', { hasText: 'Login' }).click()
  await page.waitForTimeout(2000)

  await page.fill('input[placeholder="Enter Phone Number"]', phone)
  await page.waitForTimeout(500)
  await page.locator('button', { hasText: 'Continue' }).click()
  await page.waitForTimeout(3000)
  await page.screenshot({ path: '/tmp/zepto-otp-screen.png' })

  console.log(`[launcher] OTP sent to +91${phone} — waiting for provideOtp() call...`)
  if (onOtpNeeded) onOtpNeeded()

  const otp = await waitForOtp()
  console.log(`[launcher] OTP received: ${otp}`)

  const otpInputs = await page.$$('input[maxlength="1"], input[type="number"]')
  if (otpInputs.length >= 4) {
    for (let i = 0; i < otpInputs.length && i < otp.length; i++) {
      await otpInputs[i].fill(otp[i])
      await page.waitForTimeout(100)
    }
  } else {
    const singleInput = await page.$('input[type="tel"], input[inputmode="numeric"]')
    if (singleInput) await singleInput.fill(otp)
  }

  await page.waitForTimeout(3000)
  await page.screenshot({ path: '/tmp/zepto-after-otp.png' })

  const stillNeedsLogin = await page.locator('text=Please Login').isVisible().catch(() => false)
  if (stillNeedsLogin) throw new Error('Login failed after OTP — check OTP and retry')

  await saveSession(context, 'zepto')
  await page.close()
}
