/**
 * browser/zepto-order.ts
 *
 * Zepto order automation — single item, single page session.
 * All steps (navigate → add to cart → view cart → checkout) run on ONE page
 * so the SPA cart state is preserved throughout.
 */

import { BrowserContext } from 'playwright'

const ZEPTO_URL = 'https://www.zepto.com'

export interface ZeptoOrderResult {
  zeptoOrderId: string
  item:          string
  price:         string
  eta:           string
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

    // ── Navigate to product ──────────────────────────────────────
    if (productUrl) {
      const fullUrl = productUrl.startsWith('http') ? productUrl : `${ZEPTO_URL}${productUrl}`
      console.log('[zepto] Going to product:', fullUrl)
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

      await page.click('[data-testid="search-bar-icon"]')
      await page.waitForTimeout(1500)

      const searchInput = await page.$('input[type="search"], input[placeholder*="earch" i]')
      if (!searchInput) throw new Error('Search input not found')

      await searchInput.fill(query)
      await page.waitForTimeout(2000)
      await page.locator(`text=${query}`).first().click()
      await page.waitForTimeout(3000)

      const firstProduct = await page.evaluate(() => {
        const link  = document.querySelector('a[href*="/pn/"]') as HTMLAnchorElement | null
        const price = document.querySelector('[class*="price"], [class*="Price"]')
        return {
          href:  link?.href,
          text:  link?.textContent?.trim().slice(0, 60),
          price: price?.textContent?.trim().slice(0, 20),
        }
      })

      if (firstProduct.href) {
        await page.goto(firstProduct.href, { waitUntil: 'networkidle', timeout: 30000 })
        await page.waitForTimeout(2000)
        const details = await page.evaluate(() => {
          const name  = document.querySelector('h1, [class*="product-name"], [class*="productName"]')
          const price = document.querySelector('[class*="price"], [class*="Price"]')
          return {
            name:  name?.textContent?.trim().slice(0, 60),
            price: price?.textContent?.trim().slice(0, 20),
          }
        })
        productName  = details.name  || firstProduct.text  || query
        productPrice = details.price || firstProduct.price || 'unknown'
      } else {
        productName  = firstProduct.text  || query
        productPrice = firstProduct.price || 'unknown'
      }
    }

    // ── Add to cart ──────────────────────────────────────────────
    console.log('[zepto] Adding to cart...')
    await page.screenshot({ path: '/tmp/zepto-product-page.png' })

    // Add to cart — try multiple strategies
    const added = await page.evaluate(() => {
      const EXCLUDE = /add\s*(new\s*)?address/i

      // Search across all interactive element types
      const candidates = Array.from(
        document.querySelectorAll('button, div[role="button"], a[role="button"], [class*="add-to-cart" i], [class*="addToCart" i]')
      ) as HTMLElement[]

      // 1. Exact "Add To Cart" or "ADD" text
      let btn = candidates.find(b => {
        const t = b.textContent?.trim() ?? ''
        return (/^add to cart$/i.test(t) || /^add$/i.test(t)) &&
          b.offsetParent !== null && !EXCLUDE.test(t)
      })

      // 2. Any visible element containing "add to cart" or "add"
      if (!btn) {
        btn = candidates.find(b => {
          const t = b.textContent?.trim() ?? ''
          return /add to cart|add item/i.test(t) && b.offsetParent !== null && !EXCLUDE.test(t)
        })
      }

      // 3. Broaden to any element (div, span) with "add" text on the page
      if (!btn) {
        btn = Array.from(document.querySelectorAll('*')).find(e => {
          const el = e as HTMLElement
          const t  = el.textContent?.trim() ?? ''
          return /^(add|add to cart)$/i.test(t) && el.offsetParent !== null &&
            !EXCLUDE.test(t) && !['SCRIPT', 'STYLE', 'HTML', 'BODY', 'HEAD'].includes(el.tagName)
        }) as HTMLElement | undefined
      }

      // 4. Visible "+" quantity button
      if (!btn) {
        btn = Array.from(document.querySelectorAll('button, [role="button"]')).find(e => {
          const el = e as HTMLElement
          return el.textContent?.trim() === '+' && el.offsetParent !== null
        }) as HTMLElement | undefined
      }

      if (btn) { btn.click(); return btn.textContent?.trim() }
      return null
    })

    if (added) {
      console.log('[zepto] Clicked add button:', added)
    } else {
      // Playwright fallback — try role-based selector first, then broader
      console.log('[zepto] Falling back to Playwright locator for ADD...')
      try {
        await page.getByRole('button', { name: /add to cart|^add$/i }).first().click({ timeout: 8000 })
      } catch {
        // Last resort: any visible button/div with "add" that isn't address-related
        await page.locator('button, [role="button"]')
          .filter({ hasText: /add/i })
          .filter({ hasNotText: /add\s*(new\s*)?address/i })
          .first()
          .click({ timeout: 8000 })
      }
    }

    // Wait for cart confirmation — either View Cart badge or quantity counter appears
    try {
      await page.waitForFunction(() => {
        const body = document.body.innerText
        return /view cart|item in cart|items in cart|\d+\s*item/i.test(body)
      }, { timeout: 8000 })
      console.log('[zepto] Item added ✅')
    } catch {
      // Item might already be in cart; continue anyway
      await page.waitForTimeout(2000)
    }

    // ── Open cart via ?cart=open on the same page (preserves SPA session) ──
    console.log('[zepto] Opening cart...')
    const currentProductUrl = page.url().split('?')[0]
    await page.goto(`${currentProductUrl}?cart=open`, { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForTimeout(2000)

    // Wait for cart contents to load
    await page.waitForFunction(() =>
      /item total|total bill|add address|proceed to pay|your cart|₹|subtotal/i.test(document.body.innerText)
    , { timeout: 12000 }).catch(() => {
      console.log('[zepto] Cart content not detected — continuing anyway')
    })

    await page.waitForTimeout(2000)
    await page.screenshot({ path: '/tmp/zepto-cart.png' })
    console.log('[zepto] Cart URL:', page.url())

    const needsLogin = await page.locator('text=Please Login').isVisible().catch(() => false)
    if (needsLogin) throw new Error('SESSION_EXPIRED — re-login needed')

    // ── Checkout helpers ─────────────────────────────────────────
    // Searches buttons first, then any visible interactive element (divs, spans, etc.)
    async function jsClick(pattern: RegExp, label: string): Promise<boolean> {
      const clicked = await page.evaluate((pat: string) => {
        const re = new RegExp(pat, 'i')
        const candidates = [
          ...Array.from(document.querySelectorAll('button')),
          ...Array.from(document.querySelectorAll('div[role="button"], a, div, span')),
        ] as HTMLElement[]
        const el = candidates.find(
          b => re.test(b.textContent?.trim() ?? '') && b.offsetParent !== null
        )
        if (el) { el.click(); return true }
        return false
      }, pattern.source)
      console.log(`[zepto] jsClick "${label}":`, clicked ? 'clicked ✅' : 'not found')
      return clicked
    }

    // ── Add Address / Proceed ────────────────────────────────────
    const addAddrClicked = await jsClick(/add address to proceed|proceed to checkout/i, 'Add Address to proceed')
    if (addAddrClicked) {
      try {
        await page.waitForFunction(() =>
          /select an address|saved addresses|proceed to pay|deliver here/i.test(document.body.innerText)
        , { timeout: 8000 })
      } catch { /* proceed */ }
    }
    await page.waitForTimeout(2000)
    await page.screenshot({ path: '/tmp/zepto-s6-after-proceed.png' })

    // ── Address selection ────────────────────────────────────────
    const isAddressModal = await page.evaluate(() =>
      /select an address|saved addresses/i.test(document.body.innerText)
    )

    if (isAddressModal) {
      const addrClicked = await page.evaluate(() => {
        const allEls  = Array.from(document.querySelectorAll('*')) as HTMLElement[]
        const heading = allEls.find(
          el => /^saved addresses$/i.test(el.textContent?.trim() ?? '') && el.offsetParent !== null
        ) as HTMLElement | undefined

        if (heading) {
          let container: HTMLElement | null = heading.parentElement
          for (let i = 0; i < 5 && container; i++) {
            const addrRow = Array.from(container.querySelectorAll('div, li, a')).find(el => {
              const text = (el as HTMLElement).textContent?.trim() ?? ''
              return (
                text.length > 10 && text.length < 300 &&
                (el as HTMLElement).offsetParent !== null &&
                !/^saved addresses$/i.test(text) &&
                !/^add new address$/i.test(text) &&
                !/^select an address$/i.test(text) &&
                el !== heading
              )
            }) as HTMLElement | undefined
            if (addrRow) { addrRow.click(); return addrRow.textContent?.trim().slice(0, 60) }
            container = container.parentElement
          }
        }

        const fallback = Array.from(document.querySelectorAll('div, li, a')).find(el => {
          const text = (el as HTMLElement).textContent?.trim() ?? ''
          return (
            text.length > 20 && text.length < 300 &&
            (el as HTMLElement).offsetParent !== null &&
            text.includes(',') &&
            !/add new address|select an address|saved addresses/i.test(text)
          )
        }) as HTMLElement | undefined
        if (fallback) { fallback.click(); return `fallback: ${fallback.textContent?.trim().slice(0, 60)}` }
        return null
      })
      console.log('[zepto] Address clicked:', addrClicked)
      await page.waitForTimeout(2000)
      await jsClick(/deliver here|use this address|confirm address|done/i, 'Confirm address')
      await page.waitForTimeout(2000)
    }

    await page.waitForTimeout(2000)
    await page.screenshot({ path: '/tmp/zepto-s7-after-address.png' })

    // ── Proceed to Pay ───────────────────────────────────────────
    const proceedClicked = await jsClick(/proceed to pay/i, 'Proceed to Pay')
    if (proceedClicked) {
      try {
        await page.waitForFunction(() =>
          /place order|pay now|zepto cash|zepto wallet|payment method/i.test(document.body.innerText)
        , { timeout: 8000 })
      } catch { /* proceed */ }
    }
    await page.waitForTimeout(2000)
    await page.screenshot({ path: '/tmp/zepto-s8-payment-screen.png' })

    // ── Select Zepto Cash ────────────────────────────────────────
    // Try radio/checkbox inputs associated with Zepto Cash label first
    const walletClicked = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="radio"], input[type="checkbox"]')) as HTMLInputElement[]
      for (const inp of inputs) {
        const label = inp.closest('label') || inp.parentElement
        if (/zepto cash|zepto wallet|wallet balance/i.test(label?.textContent?.trim() ?? '')) {
          inp.click(); return true
        }
      }
      // Fallback: click any visible Zepto Cash element
      const el = Array.from(document.querySelectorAll('div, label, button, span, [role="radio"], [role="checkbox"]')).find(
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
    const placed = await jsClick(/place order|pay now|confirm order|pay ₹/i, 'Place Order')
    if (!placed) throw new Error('Could not find Place Order / Pay Now button — see /tmp/zepto-s9-pre-place.png')

    await page.waitForTimeout(5000)
    await page.screenshot({ path: '/tmp/zepto-s11-post-place.png' })

    const confirmation = await page.evaluate(() => {
      const idEl    = document.querySelector('[class*="orderId" i], [class*="order-id" i]')
      const idText  = document.body.innerText.match(/#?([A-Z0-9]{6,20})/)?.[1]
      const etaEl   = document.querySelector('[class*="eta" i], [class*="time" i], [class*="minute" i]')
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

    const zeptoOrderId = confirmation.orderId ? `ZP-${confirmation.orderId}` : `ZP-${Date.now()}`

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
