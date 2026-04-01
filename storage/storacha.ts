/**
 * storage/storacha.ts
 *
 * Decentralised agent memory using Storacha (@web3-storage/w3up-client).
 * Stores Maid402's preference profile and order history on the decentralised web.
 *
 * Env vars required:
 *   STORACHA_EMAIL   — email for Storacha account authentication
 *
 * First-time setup: npm run setup:storacha
 */

import fs   from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname   = path.dirname(fileURLToPath(import.meta.url))
const MEMORY_FILE = path.join(__dirname, '../.storacha-memory.json')

// ── Types ────────────────────────────────────────────────────────

export interface OrderHistoryEntry {
  orderId:   string
  item:      string
  platform:  string
  priceINR:  number
  timestamp: string
}

export interface PreferenceProfile {
  version:             number
  savedItems:          string[]          // household items to track for restocking
  preferredPlatforms:  string[]
  dietaryRestrictions: string[]
  orderHistory:        OrderHistoryEntry[]
  lastUpdated:         string
  storachaCID?:        string            // last uploaded CID
}

const DEFAULT_PROFILE: PreferenceProfile = {
  version:             1,
  savedItems:          ['atta 1kg', 'milk 500ml', 'sugar 1kg', 'eggs', 'bread', 'dal 500g', 'rice 1kg', 'cooking oil 1L'],
  preferredPlatforms:  ['zepto'],
  dietaryRestrictions: [],
  orderHistory:        [],
  lastUpdated:         new Date().toISOString(),
}

// ── Local cache helpers ──────────────────────────────────────────

async function readLocalMemory(): Promise<PreferenceProfile> {
  try {
    const raw = await fs.readFile(MEMORY_FILE, 'utf-8')
    return JSON.parse(raw) as PreferenceProfile
  } catch {
    return { ...DEFAULT_PROFILE }
  }
}

async function writeLocalMemory(profile: PreferenceProfile): Promise<void> {
  profile.lastUpdated = new Date().toISOString()
  await fs.writeFile(MEMORY_FILE, JSON.stringify(profile, null, 2))
}

// ── Storacha client ──────────────────────────────────────────────

const STORACHA_SPACE_DID = process.env.STORACHA_SPACE_DID   // did:key:z... from w3 space ls

async function getClient() {
  const { create }   = await import('@web3-storage/w3up-client')
  const { StoreIndexedDB, AccessIndexedDB } = await import('@web3-storage/w3up-client/stores/indexeddb').catch(() => ({
    StoreIndexedDB: undefined, AccessIndexedDB: undefined,
  }))

  // Use node-compatible store (falls back to in-memory if indexeddb unavailable)
  const client = await create()

  if (STORACHA_SPACE_DID) {
    // Space DID provided — set it directly without re-authenticating
    await client.setCurrentSpace(STORACHA_SPACE_DID as `did:${string}:${string}`)
  } else {
    const email = process.env.STORACHA_EMAIL
    if (!email) throw new Error('Set STORACHA_SPACE_DID (preferred) or STORACHA_EMAIL in .env')
    // Login triggers an email verification link — only works interactively
    // Run `pnpm setup:storacha` once to authorise and note your space DID
    throw new Error('missing current space: run `pnpm setup:storacha` and set STORACHA_SPACE_DID in .env')
  }

  return client
}

/**
 * Upload profile to Storacha and return the CID.
 */
async function uploadToStoracha(profile: PreferenceProfile): Promise<string> {
  const client = await getClient()
  const json   = JSON.stringify(profile)
  const blob   = new Blob([json], { type: 'application/json' })
  const file   = new File([blob], 'preference-profile.json')

  const cid  = await client.uploadFile(file)
  return cid.toString()
}

// ── Public API ───────────────────────────────────────────────────

/**
 * Load the agent's preference profile.
 * Reads from local cache; falls back to defaults if not set up.
 */
export async function loadPreferenceProfile(): Promise<PreferenceProfile> {
  const profile = await readLocalMemory()
  console.log(`[storacha] Profile loaded: ${profile.savedItems.length} items, ${profile.orderHistory.length} past orders`)
  return profile
}

/**
 * Save the preference profile locally and (if configured) to Storacha.
 * Returns CID of uploaded profile.
 */
export async function savePreferenceProfile(profile: PreferenceProfile): Promise<string> {
  await writeLocalMemory(profile)

  try {
    const cid    = await uploadToStoracha(profile)
    profile.storachaCID = cid
    await writeLocalMemory(profile)
    console.log(`[storacha] Profile saved ✅ CID: ${cid}`)
    return cid
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log(`[storacha] Upload failed (saved locally): ${msg}`)
    return `local:${MEMORY_FILE}`
  }
}

/**
 * Append a completed order to the history and save.
 */
export async function appendOrderHistory(entry: OrderHistoryEntry): Promise<string> {
  const profile = await readLocalMemory()
  profile.orderHistory = [entry, ...profile.orderHistory].slice(0, 100) // keep last 100
  return savePreferenceProfile(profile)
}

/**
 * Add an item to the tracked household items list.
 */
export async function addTrackedItem(item: string): Promise<void> {
  const profile = await readLocalMemory()
  if (!profile.savedItems.includes(item)) {
    profile.savedItems.push(item)
    await savePreferenceProfile(profile)
  }
}
