/**
 * browser/zepto-order.ts
 *
 * Zepto order automation — migrated from server/zepto/order.ts
 * Handles search → add to cart → checkout → Zepto Cash payment → order confirmation.
 */

import { BrowserContext } from 'playwright'

const ZEPTO_URL = 'https://www.zepto.com'

export interface ZeptoOrderResult {
  zeptoOrderId: string
  item:         string
  price:        string
  eta:          string
}

export async function placeZeptoOrder(
  context:     BrowserContext,
  query:       string,
  productUrl?: string
): Promise<ZeptoOrderResult> {
  const page = await context.newPage()

  try {
    console.log(`[zepto] Starting order for: "${query}"${productUrl ? ' (direct URL)' : ''}`)

    let productName  = query
    let productPrice = 'unknown'

    if (productUrl) {
      const fullUrl = productUrl.startsWith('http') ? productUrl : `${ZEPTO_URL}${productUrl}`
      console.log('[zepto] Going directly to product:', fullUrl)
      await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 40000 })
      await page.waitForTimeout(2000)

      const details = await page.evaluate(() => {
        const name  = document.querySelector('h1, [class*="product-name"], [class*="productName"]')
        const price = document.querySelector('[class*="price"], [class*="Price"]')
        return {
          name:  name?.textContent?.trim().slice(0, 60),
          price: price?.textContent?.trim().slice(0, 20),
        }
      })
      productName  = details.name  || query
      productPrice = details.price || 'unknown'
      console.log('[zepto] Product:', productName, productPrice)

    } else {
      await page.goto(ZEPTO_URL, { waitUntil: 'networkidle', timeout: 40000 })
      await page.waitForTimeout(2000)

      console.log('[zepto] Searching...')
      await page.click('[data-testid="search-bar-icon"]')
      await page.waitForTimeout(1500)

      const searchInput = await page.$('input[type="search"], input[placeholder*="earch" i]')
      if (!searchInput) throw new Error('Search input not found')

      await searchInput.fill(query)
      await page.waitForTimeout(2000)
      await page.locator(`text=${query}`).first().click()
      await page.waitForTimeout(3000)
      console.log('[zepto] Search results loaded:', page.url())

      const firstProduct = await page.evaluate(() => {
        const link  = document.querySelector('a[href*="/pn/"]')
        const price = document.querySelector('[class*="price"], [class*="Price"]')
        return {
          text:  link?.textContent?.trim().slice(0, 60),
          price: price?.textContent?.trim().slice(0, 20),
        }
      })
      productName  = firstProduct.text  || query
      productPrice = firstProduct.price || 'unknown'
    }

    // ── Add to cart ──────────────────────────────────────────────
    console.log('[zepto] Adding to cart...')
    await page.locator('button', { hasText: 'ADD' }).first().click()
    try {
      await page.waitForFunction(() =>
        Array.from(document.querySelectorAll('button')).some(b => /view cart/i.test(b.textContent?.trim() ?? ''))
      , { timeout: 5000 })
    } catch {
      await page.waitForTimeout(2000)
    }

    // ── Open cart ────────────────────────────────────────────────
    console.log('[zepto] Opening cart...')
    const cartOpened = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('button, a, div, span')).find(e =>
        /view cart/i.test(e.textContent?.trim() ?? '') && (e as HTMLElement).offsetParent !== null
      ) as HTMLElement | undefined
      if (el) { el.click(); return true }
      return false
    })
    if (!cartOpened) await page.locator('text=Cart').first().click()

    try {
      await page.waitForFunction(() =>
        /item total|total bill|add address|proceed to pay/i.test(document.body.innerText)
      , { timeout: 10000 })
    } catch { /* proceed anyway */ }

    await page.screenshot({ path: '/tmp/zepto-cart.png' })

    const needsLogin = await page.locator('text=Please Login').isVisible().catch(() => false)
    if (needsLogin) throw new Error('SESSION_EXPIRED — re-login needed')

    async function jsClickButton(pattern: RegExp, label: string): Promise<boolean> {
      const clicked = await page.evaluate((pat: string) => {
        const re  = new RegExp(pat, 'i')
        const btn = Array.from(document.querySelectorAll('button')).find(
          b => re.test(b.textContent?.trim() ?? '')
        ) as HTMLElement | undefined
        if (btn) { btn.click(); return true }
        return false
      }, pattern.source)
      console.log(`[zepto] jsClick "${label}":`, clicked ? 'clicked ✅' : 'not found')
      return clicked
    }

    // ── Add Address / Proceed ────────────────────────────────────
    await jsClickButton(/add address to proceed|proceed to checkout/i, 'Add Address to proceed')
    await page.waitForTimeout(3000)
    await page.screenshot({ path: '/tmp/zepto-s6-after-proceed.png' })

    // ── Address selection ────────────────────────────────────────
    const isAddressModal = await page.evaluate(() =>
      /select an address|saved addresses/i.test(document.body.innerText)
    )

    if (isAddressModal) {
      const addrClicked = await page.evaluate(() => {
        const allEls  = Array.from(document.querySelectorAll('*')) as HTMLElement[]
        const heading = allEls.find(
          el => /^saved addresses$/i.test(el.textContent?.trim() ?? '') && (el as HTMLElement).offsetParent !== null
        ) as HTMLElement | undefined

        if (heading) {
          let container: HTMLElement | null = heading.parentElement
          for (let i = 0; i < 5 && container; i++) {
            const rows    = Array.from(container.querySelectorAll('div, li, a')) as HTMLElement[]
            const addrRow = rows.find(el => {
              const text = el.textContent?.trim() ?? ''
              return (
                text.length > 10 && text.length < 300 &&
                el.offsetParent !== null &&
                !/^saved addresses$/i.test(text) &&
                !/^add new address$/i.test(text) &&
                !/^select an address$/i.test(text) &&
                el !== heading
              )
            })
            if (addrRow) { addrRow.click(); return addrRow.textContent?.trim().slice(0, 60) }
            container = container.parentElement
          }
        }

        const fallback = (Array.from(document.querySelectorAll('div, li, a')) as HTMLElement[]).find(el => {
          const text = el.textContent?.trim() ?? ''
          return (
            text.length > 20 && text.length < 300 &&
            el.offsetParent !== null &&
            text.includes(',') &&
            !/add new address|select an address|saved addresses/i.test(text)
          )
        })
        if (fallback) { fallback.click(); return `fallback: ${fallback.textContent?.trim().slice(0, 60)}` }
        return null
      })
      console.log('[zepto] Address row clicked:', addrClicked)
      await page.waitForTimeout(2000)
      await jsClickButton(/deliver here|use this address|confirm address|done/i, 'Confirm address')
      await page.waitForTimeout(2000)
    }

    await page.waitForTimeout(2000)
    await page.screenshot({ path: '/tmp/zepto-s7-after-address.png' })

    // ── Proceed to Pay ───────────────────────────────────────────
    await jsClickButton(/proceed to pay/i, 'Proceed to Pay')
    await page.waitForTimeout(3000)
    await page.screenshot({ path: '/tmp/zepto-s8-payment-screen.png' })

    // ── Select Zepto Cash ────────────────────────────────────────
    const walletClicked = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('div, label, button, span')).find(
        e => /zepto cash|zepto wallet|wallet balance/i.test(e.textContent?.trim() ?? '')
          && (e as HTMLElement).offsetParent !== null
      ) as HTMLElement | undefined
      if (el) { el.click(); return true }
      return false
    })
    console.log('[zepto] Zepto Cash clicked:', walletClicked)
    await page.waitForTimeout(1500)
    await page.screenshot({ path: '/tmp/zepto-s9-pre-place.png' })

    // ── Order summary ────────────────────────────────────────────
    const orderSummary = await page.evaluate(() => {
      const total = document.querySelector('[class*="total" i], [class*="amount" i], [class*="payable" i]')
      const eta   = document.querySelector('[class*="eta" i], [class*="time" i], [class*="minute" i]')
      return {
        total: total?.textContent?.trim().slice(0, 30),
        eta:   eta?.textContent?.trim().slice(0, 30),
      }
    })

    // ── Place order ──────────────────────────────────────────────
    const placed = await jsClickButton(/place order|pay now|confirm order|pay ₹/i, 'Place Order')
    if (!placed) throw new Error('Could not find Place Order / Pay Now button — see /tmp/zepto-s9-pre-place.png')
    await page.waitForTimeout(5000)
    await page.screenshot({ path: '/tmp/zepto-s11-post-place.png' })

    const confirmation = await page.evaluate(() => {
      const idEl   = document.querySelector('[class*="orderId" i], [class*="order-id" i]')
      const idText = document.body.innerText.match(/#?([A-Z0-9]{6,20})/)?.[1]
      const etaEl  = document.querySelector('[class*="eta" i], [class*="time" i], [class*="minute" i]')
      const totalEl = document.querySelector('[class*="total" i], [class*="amount" i]')
      return {
        orderId: idEl?.textContent?.trim() || idText || null,
        eta:     etaEl?.textContent?.trim().slice(0, 30) || null,
        total:   totalEl?.textContent?.trim().slice(0, 30) || null,
      }
    })

    const currentUrl  = page.url()
    const isConfirmed =
      currentUrl.includes('order') ||
      currentUrl.includes('success') ||
      currentUrl.includes('confirmed') ||
      (await page.locator('text=/order placed|order confirmed|on the way/i').isVisible().catch(() => false))

    if (!isConfirmed) {
      await page.screenshot({ path: '/tmp/zepto-order-failed.png' })
      throw new Error(`Order placement may have failed. URL: ${currentUrl}`)
    }

    const zeptoOrderId = confirmation.orderId
      ? `ZP-${confirmation.orderId}`
      : `ZP-${Date.now()}`

    return {
      zeptoOrderId,
      item:  productName,
      price: confirmation.total || orderSummary.total || productPrice,
      eta:   confirmation.eta   || orderSummary.eta   || '10–15 mins',
    }

  } finally {
    await page.close()
  }
}
