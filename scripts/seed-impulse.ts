/**
 * scripts/seed-impulse.ts
 *
 * Upload sample order history to Impulse AI to bootstrap the restock prediction model.
 * Run once: npm run seed:impulse
 *
 * Prerequisites:
 *   - IMPULSE_API_KEY in .env
 *   - IMPULSE_MODEL_ENDPOINT in .env (after model is created on impulselabs.ai)
 */

import 'dotenv/config'

// Sample household order history (last 90 days)
const SAMPLE_HISTORY = [
  // atta ordered every ~15 days
  { item: 'atta 1kg',     date: '2026-01-01', qty: 2, category: 'staples' },
  { item: 'atta 1kg',     date: '2026-01-16', qty: 2, category: 'staples' },
  { item: 'atta 1kg',     date: '2026-02-01', qty: 2, category: 'staples' },
  { item: 'atta 1kg',     date: '2026-02-15', qty: 2, category: 'staples' },
  { item: 'atta 1kg',     date: '2026-03-02', qty: 2, category: 'staples' },
  // milk ordered every 3 days
  { item: 'milk 500ml',   date: '2026-03-01', qty: 2, category: 'dairy' },
  { item: 'milk 500ml',   date: '2026-03-04', qty: 2, category: 'dairy' },
  { item: 'milk 500ml',   date: '2026-03-07', qty: 2, category: 'dairy' },
  { item: 'milk 500ml',   date: '2026-03-10', qty: 2, category: 'dairy' },
  { item: 'milk 500ml',   date: '2026-03-13', qty: 2, category: 'dairy' },
  { item: 'milk 500ml',   date: '2026-03-16', qty: 2, category: 'dairy' },
  { item: 'milk 500ml',   date: '2026-03-19', qty: 2, category: 'dairy' },
  // sugar ordered monthly
  { item: 'sugar 1kg',    date: '2026-01-05', qty: 1, category: 'staples' },
  { item: 'sugar 1kg',    date: '2026-02-08', qty: 1, category: 'staples' },
  { item: 'sugar 1kg',    date: '2026-03-10', qty: 1, category: 'staples' },
  // eggs ordered weekly
  { item: 'eggs',         date: '2026-03-03', qty: 12, category: 'dairy' },
  { item: 'eggs',         date: '2026-03-10', qty: 12, category: 'dairy' },
  { item: 'eggs',         date: '2026-03-17', qty: 12, category: 'dairy' },
  { item: 'eggs',         date: '2026-03-24', qty: 12, category: 'dairy' },
  // bread ordered every 5 days
  { item: 'bread',        date: '2026-03-01', qty: 1, category: 'bakery' },
  { item: 'bread',        date: '2026-03-06', qty: 1, category: 'bakery' },
  { item: 'bread',        date: '2026-03-11', qty: 1, category: 'bakery' },
  { item: 'bread',        date: '2026-03-16', qty: 1, category: 'bakery' },
  { item: 'bread',        date: '2026-03-21', qty: 1, category: 'bakery' },
  { item: 'bread',        date: '2026-03-26', qty: 1, category: 'bakery' },
]

async function main() {
  console.log('\n🧠 Impulse AI — Seeding Order History')
  console.log('=======================================\n')

  const apiKey   = process.env.IMPULSE_API_KEY
  const endpoint = process.env.IMPULSE_MODEL_ENDPOINT

  if (!apiKey) {
    console.error('❌ IMPULSE_API_KEY not set in .env')
    console.log('   Get your key at: https://impulselabs.ai')
    process.exit(1)
  }

  console.log(`Uploading ${SAMPLE_HISTORY.length} historical orders...`)

  // Convert to CSV for Impulse AI
  const csvHeader = 'item,date,qty,category\n'
  const csvRows   = SAMPLE_HISTORY
    .map(r => `${r.item},${r.date},${r.qty},${r.category}`)
    .join('\n')
  const csv = csvHeader + csvRows

  console.log('CSV preview:')
  console.log(csvRows.slice(0, 200) + '...\n')

  if (endpoint) {
    // Upload to existing model endpoint
    try {
      const response = await fetch(`${endpoint}/seed`, {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'text/csv' },
        body:    csv,
      })
      if (response.ok) {
        console.log('✅ History uploaded to Impulse AI model')
      } else {
        console.warn(`⚠️  Upload returned ${response.status}: ${await response.text()}`)
      }
    } catch (err) {
      console.error('❌ Upload failed:', err)
    }
  } else {
    console.log('ℹ️  IMPULSE_MODEL_ENDPOINT not set yet.')
    console.log('   Steps to set up Impulse AI:')
    console.log('   1. Go to https://impulselabs.ai and create a new model')
    console.log('   2. Upload the CSV above when prompted')
    console.log('   3. Set outcome: "predict days until each item needs restocking"')
    console.log('   4. Deploy the model and copy the endpoint URL')
    console.log('   5. Add IMPULSE_MODEL_ENDPOINT=<url> to .env\n')
    console.log('CSV data to upload:')
    console.log('---')
    console.log(csv)
    console.log('---')
  }
}

main().catch(err => {
  console.error('❌ Seed failed:', err.message)
  process.exit(1)
})
