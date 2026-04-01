/**
 * integrations/impulse.ts
 *
 * Impulse AI restock prediction client for Maid402.
 * Predicts when household items will run out based on order history.
 *
 * Env vars required:
 *   IMPULSE_API_KEY          — Impulse AI API key (impulselabs.ai)
 *   IMPULSE_MODEL_ENDPOINT   — Deployed model endpoint URL
 */

export interface RestockPrediction {
  item:              string
  daysUntilRestock:  number
  confidence:        number   // 0–1
  recommendedQty?:   number
}

export interface ImpulseRequest {
  items:      string[]
  orderHistory?: Array<{ item: string; date: string; qty: number }>
}

/**
 * Use the Impulse model to classify an item into a spend category.
 * The deployed XGBoost model predicts category given {qty, item, date}.
 */
export async function classifyItemCategoryWithProb(
  item: string,
  qty:  number,
  date: string   // YYYY-MM-DD
): Promise<{ category: string | null; probability: number | null }> {
  const endpoint     = process.env.IMPULSE_MODEL_ENDPOINT
  const apiKey       = process.env.IMPULSE_API_KEY
  const deploymentId = process.env.IMPULSE_DEPLOYMENT_ID

  if (!endpoint || !apiKey || !deploymentId) return { category: null, probability: null }

  try {
    const response = await fetch(endpoint, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        deployment_id: deploymentId,
        inputs: { qty, item, date },
      }),
    })

    if (!response.ok) {
      throw new Error(`${response.status}: ${await response.text()}`)
    }

    const data = await response.json() as { prediction?: string; probability?: number; target?: string }
    console.log(`[impulse] Raw response:`, JSON.stringify(data))
    return { category: data.prediction ?? null, probability: data.probability ?? null }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[impulse] Category prediction failed: ${msg}`)
    return { category: null, probability: null }
  }
}

/** Convenience wrapper returning just the category string */
export async function classifyItemCategory(item: string, qty: number, date: string): Promise<string | null> {
  const { category } = await classifyItemCategoryWithProb(item, qty, date)
  return category
}

/**
 * Get days-until-restock predictions for a list of household items.
 * Uses Impulse model for category classification; days estimated by category.
 * Returns array of predictions sorted by urgency (fewest days first).
 */
export async function getDaysToRestock(
  items:        string[],
  orderHistory: ImpulseRequest['orderHistory'] = []
): Promise<RestockPrediction[]> {
  const endpoint     = process.env.IMPULSE_MODEL_ENDPOINT
  const apiKey       = process.env.IMPULSE_API_KEY
  const deploymentId = process.env.IMPULSE_DEPLOYMENT_ID

  if (!endpoint || !apiKey || !deploymentId) {
    console.log('[impulse] Not configured — returning mock predictions')
    return getMockPredictions(items)
  }

  try {
    const today = new Date().toISOString().slice(0, 10)

    const predictions = await Promise.all(items.map(async (item) => {
      const lastOrder = orderHistory?.find(o => o.item === item)
      const qty  = lastOrder?.qty  ?? 1
      const date = lastOrder?.date ?? today

      const { category, probability } = await classifyItemCategoryWithProb(item, qty, date)

      // Map predicted category → typical restock interval (days)
      const CATEGORY_DAYS: Record<string, number> = {
        dairy:      3,
        bread:      4,
        groceries:  7,
        produce:    5,
        beverages:  10,
        snacks:     14,
        household:  30,
      }
      const key  = (category ?? '').toLowerCase()
      const days = CATEGORY_DAYS[key] ?? estimateDaysByName(item)

      console.log(`[impulse] ${item} → category: ${category ?? 'unknown'} (${((probability ?? 0) * 100).toFixed(0)}%) → restock in ${days}d`)
      return { item, daysUntilRestock: days, confidence: probability ?? (category ? 0.85 : 0.5) } as RestockPrediction
    }))

    console.log(`[impulse] Got predictions for ${predictions.length} items`)
    return predictions.sort((a, b) => a.daysUntilRestock - b.daysUntilRestock)

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[impulse] API call failed: ${msg}`)
    return getMockPredictions(items)
  }
}

/** Fallback: estimate restock days from item name keywords */
function estimateDaysByName(item: string): number {
  const name = item.toLowerCase()
  if (/milk|curd|paneer|cheese|butter|egg/.test(name))  return 3
  if (/bread|roti|pav/.test(name))                       return 4
  if (/vegetable|fruit|tomato|onion/.test(name))         return 5
  if (/rice|atta|dal|sugar|salt|oil/.test(name))         return 14
  return 7
}

/** Mock predictions for development when Impulse AI is not configured */
function getMockPredictions(items: string[]): RestockPrediction[] {
  return items.map((item, i) => ({
    item,
    daysUntilRestock: 3 + i * 2,  // stagger mock values
    confidence:       0.75,
  }))
}
