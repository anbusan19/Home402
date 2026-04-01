/**
 * scripts/sessions-capture.ts
 *
 * Interactive session capture for e-commerce platforms.
 * Opens a browser window for each platform, lets you log in manually,
 * then saves cookies to browser/sessions/<platform>.json.
 *
 * Run: npm run sessions:capture
 */

import 'dotenv/config'
import { chromium } from 'playwright'
import fs            from 'fs/promises'
import path          from 'path'
import { fileURLToPath } from 'url'
import readline      from 'readline'

const __dirname     = path.dirname(fileURLToPath(import.meta.url))
const SESSIONS_DIR  = path.join(__dirname, '../browser/sessions')

const PLATFORMS = [
  { name: 'zepto',   url: 'https://www.zepto.com' },
  { name: 'blinkit', url: 'https://blinkit.com' },
  { name: 'amazon',  url: 'https://www.amazon.in' },
]

const USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans) }))
}

async function capturePlatform(name: string, url: string): Promise<void> {
  console.log(`\n── ${name.toUpperCase()} ─────────────────────────────`)
  console.log(`Opening ${url} in visible browser...`)
  console.log('Please log in manually, then press Enter here to save the session.\n')

  const browser = await chromium.launch({
    headless: false,   // visible for manual login
    args: ['--no-sandbox'],
  })

  const context = await browser.newContext({
    userAgent: USER_AGENT,
    viewport:  { width: 390, height: 844 },
    locale:    'en-IN',
  })

  const page = await context.newPage()
  await page.goto(url)

  await prompt(`Press Enter after logging into ${name}...`)

  const state    = await context.storageState()
  const filepath = path.join(SESSIONS_DIR, `${name}.json`)
  await fs.writeFile(filepath, JSON.stringify(state, null, 2))

  console.log(`✅ Session saved: ${filepath}`)
  await browser.close()
}

async function main() {
  console.log('\n🔐 Maid402 — Platform Session Capture')
  console.log('====================================\n')
  console.log('This script opens browser windows for each platform.')
  console.log('Log in once — sessions are saved for future automated orders.\n')

  await fs.mkdir(SESSIONS_DIR, { recursive: true })

  for (const platform of PLATFORMS) {
    const ans = await prompt(`Capture ${platform.name} session? (y/n): `)
    if (ans.toLowerCase() === 'y') {
      await capturePlatform(platform.name, platform.url)
    } else {
      console.log(`Skipping ${platform.name}`)
    }
  }

  console.log('\n✅ Session capture complete!')
  console.log(`   Sessions saved to: browser/sessions/`)
}

main().catch(err => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
