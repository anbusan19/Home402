/**
 * scripts/test-impulse.ts
 * Smoke test for Impulse AI restock predictions.
 * Run: pnpm tsx scripts/test-impulse.ts
 */

import 'dotenv/config'
import { getDaysToRestock } from '../integrations/impulse.js'

console.log('\n🤖 Impulse AI Restock Prediction Test')
console.log('======================================')
console.log('Endpoint     :', process.env.IMPULSE_MODEL_ENDPOINT)
console.log('Deployment ID:', process.env.IMPULSE_DEPLOYMENT_ID)
console.log('API key set  :', !!process.env.IMPULSE_API_KEY)
console.log()

const testItems = ['milk 500ml', 'bread', 'eggs']
const testHistory = [
  { item: 'milk 500ml', date: '2026-03-25', qty: 2 },
  { item: 'bread',      date: '2026-03-28', qty: 1 },
]

console.log('Requesting predictions for:', testItems)
const predictions = await getDaysToRestock(testItems, testHistory)

console.log('\nPredictions:')
for (const p of predictions) {
  const urgency = p.daysUntilRestock <= 2 ? '🔴' : p.daysUntilRestock <= 5 ? '🟡' : '🟢'
  console.log(`  ${urgency} ${p.item.padEnd(20)} — restock in ${p.daysUntilRestock} days (confidence: ${(p.confidence * 100).toFixed(0)}%)`)
}
