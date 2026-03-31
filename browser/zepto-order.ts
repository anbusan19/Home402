/**
 * browser/zepto-order.ts
 *
 * Zepto order automation.
 * Handles search → add to cart → checkout → Zepto Cash payment → order confirmation.
 *
 * Exports:
 *   addItemToCart     — navigate to a product and add it to the cart (no checkout)
 *   checkoutZeptoCart — complete checkout for whatever is currently in the cart
 *   placeZeptoOrder   — convenience wrapper: addItemToCart + checkoutZeptoCart
 */

import { BrowserContext } from 'playwright'

const ZEPTO_URL = 'https://www.zepto.com'

export interface CartItem {
  name:  string
  price: string
}

export interface ZeptoOrderResult {
  zeptoOrderId: string
  items:        CartItem[]
  /** kept for back-compat (first item name) */
  item:         string
  price:        string
  eta:          string
}

// ── Add a single item to the Zepto cart ──────────────────────────────

export async function addItemToCart(
  context:     BrowserContext,
  query:       string,
  productUrl?: string
): Promise<CartItem> {
  const page = await context.newPage()

  try {
    console.log(`[zepto:add] Adding to cart: "${query}"${productUrl ? ' (direct URL)' : ''}`)

    let productName  = query
    let productPrice = 'unknown'

    if (productUrl) {
      const fullUrl = productUrl.startsWith('http') ? productUrl : `${ZEPTO_URL}${productUrl}`
      console.log('[zepto:add] Going directly to product:', fullUrl)
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
      console.log('[zepto:add] Product:', productName, productPrice)

    } else {
      await page.goto(ZEPTO_URL, { waitUntil: 'networkidle', timeout: 40000 })
      await page.waitForTimeout(2000)

      console.log('[zepto:add] Searching...')
      await page.click('[data-testid="search-bar-icon"]')
      await page.waitForTimeout(1500)

      const searchInput = await page.$('input[type="search"], input[placeholder*="earch" i]')
      if (!searchInput) throw new Error('Search input not found')

      await searchInput.fill(query)
      await page.waitForTimeout(2000)
      await page.locator(`text=${query}`).first().click()
      await page.waitForTimeout(3000)
      console.log('[zepto:add] Search results loaded:', page.url())

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
    console.log('[zepto:add] Clicking ADD...')
    await page.locator('button', { hasText: 'ADD' }).first().click()
    try {
      await page.waitForFunction(() =>
        Array.from(document.querySelectorAll('button')).some(b => /view cart/i.test(b.textContent?.trim() ?? ''))
      , { timeout: 5000 })
      console.log('[zepto:add] Item added ✅', productName)
    } catch {
      await page.waitForTimeout(2000)
    }

    return { name: productName, price: productPrice }

  } finally {
    await page.close()
  }
}

// ── Checkout whatever is currently in the cart ────────────────────────

export async function checkoutZeptoCart(
  context: BrowserContext,
  cartItems: CartItem[] = []
): Promise<ZeptoOrderResult> {
  const page = await context.newPage()

  try {
    // Navigate to cart
    console.log('[zepto:checkout] Navigating to cart...')
    await page.goto(`${ZEPTO_URL}/cart`, { waitUntil: 'networkidle', timeout: 40000 })
    await page.waitForTimeout(2000)

    // If cart page didn't load, try clicking the cart icon from home
    const onCart = await page.evaluate(() =>
      /item total|total bill|add address|proceed to pay|your cart/i.test(document.body.innerText)
    )
    if (!onCart) {
      console.log('[zepto:checkout] Direct /cart load uncertain, trying cart icon...')
      await page.goto(ZEPTO_URL, { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForTimeout(2000)
      const cartIcon = page.locator('[aria-label*="cart" i], [data-testid*="cart" i], a[href*="/cart"]').first()
      const cartVisible = await cartIcon.isVisible().catch(() => false)
      if (cartVisible) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {}),
          cartIcon.click(),
        ])
      }
      await page.waitForTimeout(2000)
    }

    await page.screenshot({ path: '/tmp/zepto-cart.png' })
    console.log('[zepto:checkout] Cart page URL:', page.url())

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
      console.log(`[zepto:checkout] jsClick "${label}":`, clicked ? 'clicked ✅' : 'not found')
      return clicked
    }

    // ── Add Address / Proceed ────────────────────────────────────
    const addAddrClicked = await jsClickButton(/add address to proceed|proceed to checkout/i, 'Add Address to proceed')
    if (addAddrClicked) {
      try {
        await page.waitForFunction(() =>
          /select an address|saved addresses|proceed to pay|deliver here/i.test(document.body.innerText)
        , { timeout: 8000 })
      } catch { /* proceed anyway */ }
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
      console.log('[zepto:checkout] Address row clicked:', addrClicked)
      await page.waitForTimeout(2000)
      await jsClickButton(/deliver here|use this address|confirm address|done/i, 'Confirm address')
      await page.waitForTimeout(2000)
    }

    await page.waitForTimeout(2000)
    await page.screenshot({ path: '/tmp/zepto-s7-after-address.png' })

    // ── Proceed to Pay ───────────────────────────────────────────
    const proceedClicked = await jsClickButton(/proceed to pay/i, 'Proceed to Pay')
    if (proceedClicked) {
      try {
        await page.waitForFunction(() =>
          /place order|pay now|zepto cash|zepto wallet|payment method/i.test(document.body.innerText)
        , { timeout: 8000 })
      } catch { /* proceed anyway */ }
    }
    await page.waitForTimeout(2000)
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
    console.log('[zepto:checkout] Zepto Cash clicked:', walletClicked)
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

    const zeptoOrderId = confirmation.orderId
      ? `ZP-${confirmation.orderId}`
      : `ZP-${Date.now()}`

    const firstItem = cartItems[0] ?? { name: 'unknown', price: 'unknown' }

    return {
      zeptoOrderId,
      items: cartItems.length > 0 ? cartItems : [firstItem],
      item:  firstItem.name,
      price: confirmation.total || orderSummary.total || firstItem.price,
      eta:   confirmation.eta   || orderSummary.eta   || '10–15 mins',
    }

  } finally {
    await page.close()
  }
}

// ── Convenience wrapper: add one item + checkout ──────────────────────

export async function placeZeptoOrder(
  context:     BrowserContext,
  query:       string,
  productUrl?: string
): Promise<ZeptoOrderResult> {
  const cartItem = await addItemToCart(context, query, productUrl)
  return checkoutZeptoCart(context, [cartItem])
}
