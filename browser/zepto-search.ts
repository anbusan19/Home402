/**
 * browser/zepto-search.ts
 *
 * Zepto product search — migrated from server/zepto/search.ts
 * Returns up to N products matching the query.
 */

import { BrowserContext } from 'playwright'

const ZEPTO_URL = 'https://www.zepto.com'

export interface ZeptoProduct {
  name:  string
  price: string
  url:   string
}

export async function searchZeptoProducts(
  context: BrowserContext,
  query:   string,
  limit    = 5
): Promise<ZeptoProduct[]> {
  const page = await context.newPage()

  try {
    console.log(`[zepto:search] Searching for: "${query}"`)

    await page.goto(ZEPTO_URL, { waitUntil: 'networkidle', timeout: 40000 })
    await page.waitForTimeout(2000)

    await page.click('[data-testid="search-bar-icon"]')
    await page.waitForTimeout(1500)

    const searchInput = await page.$('input[type="search"], input[placeholder*="earch" i]')
    if (!searchInput) throw new Error('Search input not found')

    await searchInput.fill(query)
    await page.waitForTimeout(2000)

    await page.locator(`text=${query}`).first().click()
    await page.waitForTimeout(3000)

    await page.screenshot({ path: '/tmp/zepto-search-results.png' })
    console.log('[zepto:search] Results URL:', page.url())

    const products = await page.evaluate((max: number) => {
      const results: { name: string; price: string; url: string }[] = []
      const links = Array.from(document.querySelectorAll('a[href*="/pn/"]'))

      for (const link of links) {
        const href    = link.getAttribute('href') || ''
        const rawName = link.textContent?.trim() ?? ''
        const name    = rawName
          .replace(/ADD/g, '')
          .replace(/₹\s?\d+(\.\d+)?\s*(OFF|off)?/g, '')
          .replace(/\d+\.?\d*\s*(pc|pcs|ml|g|kg|L|ltr|litre|liters?)\b.*/i, '')
          .replace(/\d+\.\d+\s*\(\d+.*/, '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 80)

        let price     = '—'
        let container: Element | null = link.parentElement
        for (let i = 0; i < 6 && container; i++) {
          const priceEl = Array.from(container.querySelectorAll('*')).find(el => {
            const t = el.textContent?.trim() ?? ''
            return /^₹\s?\d/.test(t) && t.length < 15 && el.children.length === 0
          })
          if (priceEl) { price = priceEl.textContent?.trim() ?? '—'; break }
          container = container.parentElement
        }

        if (name && href && !results.find(r => r.url === href)) {
          results.push({ name, price, url: href })
        }
        if (results.length >= max) break
      }
      return results
    }, limit)

    console.log(`[zepto:search] Found ${products.length} products`)
    return products

  } finally {
    await page.close()
  }
}
