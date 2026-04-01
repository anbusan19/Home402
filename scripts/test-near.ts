/**
 * scripts/test-near.ts
 * Smoke test for NEAR SpendCap contract interaction.
 * Run: pnpm tsx scripts/test-near.ts
 */

import 'dotenv/config'
import { checkBudget, deductBudget, getBudgetRemaining } from '../integrations/near.js'

const accountId  = process.env.NEAR_ACCOUNT_ID
const contractId = process.env.NEAR_CONTRACT_ID || 'spend-cap.testnet'

console.log('\n🌐 NEAR Contract Test')
console.log('======================')
console.log('Account  :', accountId)
console.log('Contract :', contractId)
console.log()

// 1. View call — getBudget
console.log('1️⃣  Calling getBudget("groceries")...')
try {
  const remaining = await getBudgetRemaining('groceries')
  console.log('   ✅ Remaining budget: ₹', remaining)
} catch (err) {
  console.log('   ❌', err instanceof Error ? err.message : err)
}

// 2. View call — checkBudget
console.log('\n2️⃣  Calling checkBudget("groceries", 50)...')
try {
  const result = await checkBudget('groceries', 50)
  console.log('   ✅ Result:', JSON.stringify(result, null, 2))
} catch (err) {
  console.log('   ❌', err instanceof Error ? err.message : err)
}

// 3. State-change call — deductBudget (writes to chain)
console.log('\n3️⃣  Calling deductBudget("groceries", 10) — writes on-chain tx...')
try {
  const txHash = await deductBudget('groceries', 10)
  console.log('   ✅ Tx hash:', txHash)
  console.log(`   🔍 View on explorer: https://explorer.testnet.near.org/transactions/${txHash}`)
} catch (err) {
  console.log('   ❌', err instanceof Error ? err.message : err)
}

console.log()
