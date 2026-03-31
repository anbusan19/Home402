/**
 * integrations/near.ts
 *
 * NEAR Protocol spend cap contract client for Casa.
 * Checks budget before each order and deducts after payment.
 *
 * Env vars required:
 *   NEAR_ACCOUNT_ID    — e.g. casa-agent.testnet
 *   NEAR_PRIVATE_KEY   — ed25519 private key (from near-cli credentials)
 *   NEAR_CONTRACT_ID   — e.g. spend-cap.testnet
 */

import 'dotenv/config'

export interface BudgetCheck {
  approved:     boolean
  remainingINR: number
  capINR:       number
  spentINR:     number
}

interface BudgetInfo {
  category:     string
  capINR:       number
  spentINR:     number
  remainingINR: number
  periodDays:   number
}

async function getNearConnection() {
  const { connect, keyStores, KeyPair } = await import('near-api-js')

  const accountId   = process.env.NEAR_ACCOUNT_ID
  const privateKey  = process.env.NEAR_PRIVATE_KEY
  const networkId   = 'testnet'
  const nodeUrl     = 'https://rpc.testnet.near.org'

  if (!accountId || !privateKey) {
    throw new Error('NEAR_ACCOUNT_ID and NEAR_PRIVATE_KEY must be set in .env')
  }

  const keyStore = new keyStores.InMemoryKeyStore()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const keyPair  = KeyPair.fromString(privateKey as any)
  await keyStore.setKey(networkId, accountId, keyPair)

  const near = await connect({ networkId, nodeUrl, keyStore, headers: {} })
  return near.account(accountId)
}

/**
 * Check if a spend is within the budget cap for a category.
 * Returns approval status and remaining budget.
 */
export async function checkBudget(
  category:  string,
  amountINR: number
): Promise<BudgetCheck> {
  const contractId = process.env.NEAR_CONTRACT_ID || 'spend-cap.testnet'

  try {
    const account = await getNearConnection()

    const result = await account.viewFunction({
      contractId,
      methodName: 'getBudget',
      args:       { category },
    })

    const info: BudgetInfo = typeof result === 'string' ? JSON.parse(result) : result

    return {
      approved:     info.remainingINR >= amountINR,
      remainingINR: info.remainingINR,
      capINR:       info.capINR,
      spentINR:     info.spentINR,
    }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log(`[near] Budget check failed (non-fatal): ${msg}`)
    // Default: approve if NEAR not configured
    return { approved: true, remainingINR: 500, capINR: 500, spentINR: 0 }
  }
}

/**
 * Deduct an amount from the budget after a successful order.
 * Returns the NEAR transaction hash.
 */
export async function deductBudget(
  category:  string,
  amountINR: number
): Promise<string> {
  const contractId = process.env.NEAR_CONTRACT_ID || 'spend-cap.testnet'
  const account    = await getNearConnection()

  const result = await account.functionCall({
    contractId,
    methodName: 'checkAndDeduct',
    args:       { category, amountINR: Math.round(amountINR) },
    gas:        BigInt('30000000000000'),  // 30 TGas
    attachedDeposit: BigInt(0),
  })

  const txHash = result.transaction.hash
  console.log(`[near] Budget deducted ✅ ${category} ₹${amountINR} — tx: ${txHash}`)
  return txHash as string
}

/**
 * Get remaining budget for display.
 */
export async function getBudgetRemaining(category: string): Promise<number> {
  const budget = await checkBudget(category, 0)
  return budget.remainingINR
}
