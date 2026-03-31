// SpendCap.near — NEAR smart contract (AssemblyScript)
//
// Enforces per-category weekly/monthly spend caps for Casa.
// Deployed to NEAR testnet via: npm run deploy:near
//
// Default caps:
//   groceries:  ₹500  / week
//   appliances: ₹2000 / month
//
// Methods:
//   checkAndDeduct(category, amountINR)  → bool   — view + mutate
//   getBudget(category)                  → JSON   — view only
//   setCap(category, amountINR, period)  → void   — operator only
//   resetPeriod(category)                → void   — operator only (for testing)

import { storage, context, logging, PersistentMap } from 'near-sdk-as'

// ── Types ────────────────────────────────────────────────────────

@nearBindgen
class BudgetState {
  capINR:      u32 = 0
  spentINR:    u32 = 0
  periodStart: u64 = 0    // Unix timestamp (seconds)
  periodDays:  u32 = 7    // 7 = weekly, 30 = monthly
}

// ── Storage ───────────────────────────────────────────────────────

const budgets = new PersistentMap<string, BudgetState>('b')

const OPERATOR = 'spend-cap.testnet'  // update to your account

// ── Default caps ──────────────────────────────────────────────────

function getOrDefault(category: string): BudgetState {
  if (budgets.contains(category)) return budgets.getSome(category)

  const state = new BudgetState()
  if (category === 'groceries') {
    state.capINR    = 500
    state.periodDays = 7
  } else if (category === 'appliances') {
    state.capINR    = 2000
    state.periodDays = 30
  } else {
    state.capINR    = 200
    state.periodDays = 7
  }
  state.periodStart = context.blockTimestamp / 1_000_000_000  // ns → s
  return state
}

function periodExpired(state: BudgetState): bool {
  const now     = context.blockTimestamp / 1_000_000_000
  const elapsed = now - state.periodStart
  return elapsed > u64(state.periodDays) * 86400
}

// ── Public methods ────────────────────────────────────────────────

/**
 * Check if an order is within budget and deduct if approved.
 * Returns true if approved, false if cap reached.
 */
export function checkAndDeduct(category: string, amountINR: u32): bool {
  let state = getOrDefault(category)

  // Reset period if expired
  if (periodExpired(state)) {
    state.spentINR    = 0
    state.periodStart = context.blockTimestamp / 1_000_000_000
    logging.log(`[SpendCap] Period reset for ${category}`)
  }

  if (state.spentINR + amountINR > state.capINR) {
    logging.log(`[SpendCap] Cap exceeded: ${category} spent=${state.spentINR} cap=${state.capINR} requested=${amountINR}`)
    budgets.set(category, state)
    return false
  }

  state.spentINR += amountINR
  budgets.set(category, state)
  logging.log(`[SpendCap] Approved: ${category} spent=${state.spentINR}/${state.capINR} INR`)
  return true
}

/**
 * Get budget info for a category (view only, no state change).
 */
export function getBudget(category: string): string {
  const state = getOrDefault(category)
  const remaining = state.capINR > state.spentINR ? state.capINR - state.spentINR : 0
  return `{"category":"${category}","capINR":${state.capINR},"spentINR":${state.spentINR},"remainingINR":${remaining},"periodDays":${state.periodDays}}`
}

/**
 * Set a spend cap for a category (operator only).
 */
export function setCap(category: string, capINR: u32, periodDays: u32): void {
  assert(context.predecessor === OPERATOR, 'Only operator can set caps')
  let state = getOrDefault(category)
  state.capINR     = capINR
  state.periodDays = periodDays
  budgets.set(category, state)
  logging.log(`[SpendCap] Cap set: ${category} = ₹${capINR}/${periodDays}d`)
}

/**
 * Reset period spending to zero (for testing).
 */
export function resetPeriod(category: string): void {
  assert(context.predecessor === OPERATOR, 'Only operator can reset')
  let state = getOrDefault(category)
  state.spentINR    = 0
  state.periodStart = context.blockTimestamp / 1_000_000_000
  budgets.set(category, state)
  logging.log(`[SpendCap] Period reset: ${category}`)
}
