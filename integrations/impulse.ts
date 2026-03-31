/**
 * integrations/impulse.ts
 *
 * Impulse AI restock prediction client for Casa.
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
 * Get days-until-restock predictions for a list of household items.
 * Returns array of predictions sorted by urgency (fewest days first).
 */
export async function getDaysToRestock(
  items:        string[],
  orderHistory: ImpulseRequest['orderHistory'] = []
): Promise<RestockPrediction[]> {
  const endpoint = process.env.IMPULSE_MODEL_ENDPOINT
  const apiKey   = process.env.IMPULSE_API_KEY

  if (!endpoint || !apiKey) {
    console.log('[impulse] Not configured — returning mock predictions')
    return getMockPredictions(items)
  }

  try {
    const response = await fetch(endpoint, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        inputs: {
          items,
          order_history: orderHistory,
          prediction_horizon_days: 30,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Impulse API error: ${response.status} ${await response.text()}`)
    }

    const data = await response.json() as { predictions: RestockPrediction[] }
    console.log(`[impulse] Got predictions for ${data.predictions.length} items`)
    return data.predictions.sort((a, b) => a.daysUntilRestock - b.daysUntilRestock)

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[impulse] API call failed: ${msg}`)
    return getMockPredictions(items)
  }
}

/** Mock predictions for development when Impulse AI is not configured */
function getMockPredictions(items: string[]): RestockPrediction[] {
  return items.map((item, i) => ({
    item,
    daysUntilRestock: 3 + i * 2,  // stagger mock values
    confidence:       0.75,
  }))
}
