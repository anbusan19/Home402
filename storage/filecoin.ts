/**
 * storage/filecoin.ts
 *
 * Filecoin Calibration Testnet receipt storage via @filoz/synapse-sdk.
 * Every order produces a verifiable receipt CID on-chain.
 *
 * Env vars required:
 *   FILECOIN_PRIVATE_KEY   — wallet private key for Calibration testnet
 *   FILECOIN_RPC_URL       — e.g. https://api.calibration.node.glif.io/rpc/v1
 *   GLIF_TOKEN             — Glif API token for authentication
 */

import fs   from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname  = path.dirname(fileURLToPath(import.meta.url))
const RECEIPTS_DIR = path.join(__dirname, 'receipts')

// ── Types ────────────────────────────────────────────────────────

export interface OrderItem {
  name:     string
  qty:      number
  priceINR: number
}

export interface OrderReceipt {
  agentId:         string | null
  operatorWallet:  string
  orderId:         string
  platform:        'zepto' | 'blinkit' | 'amazon' | 'swiggy'
  items:           OrderItem[]
  totalINR:        number
  walletUsed:      string
  x402Attempted:   boolean
  x402Settled:     boolean
  timestamp:       string
  pieceCID:        string        // filled after upload
  nearSpendRecord: string        // NEAR tx hash (filled after deduction)
}

// ── Synapse SDK uploader ─────────────────────────────────────────

async function getSynapseSDK() {
  const pk    = process.env.FILECOIN_PRIVATE_KEY
  const rpc   = process.env.FILECOIN_RPC_URL || 'https://api.calibration.node.glif.io/rpc/v1'
  const token = process.env.GLIF_TOKEN

  if (!pk) throw new Error('FILECOIN_PRIVATE_KEY not set in .env')

  // Dynamic import (package may not be installed yet)
  const { Synapse } = await import('@filoz/synapse-sdk')

  return Synapse.create({
    privateKey:    pk,
    rpcURL:        rpc,
    authorization: token,
  })
}

/**
 * Upload an order receipt JSON to Filecoin Calibration Testnet.
 * Returns the CID (content identifier) of the stored data.
 */
export async function uploadReceipt(receipt: OrderReceipt): Promise<string> {
  // Always save locally first
  await fs.mkdir(RECEIPTS_DIR, { recursive: true })
  const localFile = path.join(RECEIPTS_DIR, `${receipt.orderId}-${Date.now()}.json`)
  await fs.writeFile(localFile, JSON.stringify(receipt, null, 2))
  console.log(`[filecoin] Receipt cached locally: ${localFile}`)

  try {
    const synapse  = await getSynapseSDK()
    const storage  = await synapse.createStorage()
    const json     = JSON.stringify(receipt)
    const bytes    = Buffer.from(json, 'utf-8')

    // Upload to Filecoin Calibration
    const result   = await storage.upload(bytes)
    const cid      = result.commp.toString()

    console.log(`[filecoin] Receipt uploaded ✅ CID: ${cid}`)
    return cid

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[filecoin] Upload failed (receipt saved locally): ${msg}`)
    // Return local path as fallback identifier
    return `local:${path.basename(localFile)}`
  }
}

/**
 * Upload the agent execution log to Filecoin.
 * Used at the end of each run for auditing.
 */
export async function uploadLog(log: unknown): Promise<string> {
  await fs.mkdir(RECEIPTS_DIR, { recursive: true })

  const localFile = path.join(RECEIPTS_DIR, `agent_log_${Date.now()}.json`)
  await fs.writeFile(localFile, JSON.stringify(log, null, 2))

  try {
    const synapse  = await getSynapseSDK()
    const storage  = await synapse.createStorage()
    const bytes    = Buffer.from(JSON.stringify(log), 'utf-8')
    const result   = await storage.upload(bytes)
    const cid      = result.commp.toString()
    console.log(`[filecoin] Log uploaded ✅ CID: ${cid}`)
    return cid
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[filecoin] Log upload failed: ${msg}`)
    return `local:${path.basename(localFile)}`
  }
}
