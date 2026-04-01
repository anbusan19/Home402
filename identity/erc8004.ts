/**
 * identity/erc8004.ts
 *
 * ERC-8004 Identity and Reputation Registry client for Maid402.
 * Registers the agent on-chain (Sepolia) and updates reputation after each order.
 *
 * Contracts (Sepolia testnet):
 *   Identity Registry:   0x8004A169FB4a3325136EB29fA0ceB6D2e539a432
 *   Reputation Registry: 0x8004BAa17C55a88189AE136b182e5fdA19dE9b63
 *
 * Env vars required:
 *   OPERATOR_PRIVATE_KEY  — Sepolia wallet private key
 *   SEPOLIA_RPC_URL       — e.g. https://rpc.sepolia.org
 */

import { ethers } from 'ethers'
import fs         from 'fs/promises'
import path       from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AGENT_JSON = path.join(__dirname, 'agent.json')

// ── Contract addresses (Sepolia) ──────────────────────────────────

const IDENTITY_REGISTRY   = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432'
const REPUTATION_REGISTRY = '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63'

// ── Minimal ABIs ──────────────────────────────────────────────────

const IDENTITY_ABI = [
  'function register(string memory metadataURI) external returns (uint256 agentId)',
  'function getAgent(uint256 agentId) external view returns (address operator, string memory metadataURI, bool active)',
  'event AgentRegistered(uint256 indexed agentId, address indexed operator, string metadataURI)',
]

const REPUTATION_ABI = [
  'function giveFeedback(uint256 agentId, int8 signal, string memory reason, string memory evidenceCID) external',
  'function getReputation(uint256 agentId) external view returns (int256 score, uint256 totalFeedback)',
  'event FeedbackGiven(uint256 indexed agentId, address indexed reviewer, int8 signal, string reason)',
]

// ── Provider / signer factory ─────────────────────────────────────

function getSigner(): ethers.Wallet {
  const pk  = process.env.OPERATOR_PRIVATE_KEY
  const rpc = process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org'
  if (!pk) throw new Error('OPERATOR_PRIVATE_KEY not set in .env')
  return new ethers.Wallet(pk, new ethers.JsonRpcProvider(rpc))
}

// ── Agent manifest type ───────────────────────────────────────────

export interface AgentManifest {
  name:        string
  description: string
  image:       string
  services:    Array<{ name: string; endpoint: string }>
  x402Support: boolean
  active:      boolean
  registrations: Array<{ agentId: string | null; agentRegistry: string }>
  operator:    { wallet: string; name: string }
  tools:       string[]
  taskCategories: string[]
  computeConstraints: {
    maxOrderAmountINR: number
    maxOrdersPerDay:   number
    supportedPlatforms: string[]
  }
}

// ── Registration ──────────────────────────────────────────────────

/**
 * Register Maid402 on the ERC-8004 Identity Registry (Sepolia).
 * Returns the assigned agentId.
 * Run once via: npm run setup:identity
 */
export async function registerAgent(metadataURI: string): Promise<bigint> {
  const signer   = getSigner()
  const registry = new ethers.Contract(IDENTITY_REGISTRY, IDENTITY_ABI, signer)

  console.log('[erc8004] Registering agent on Sepolia...')
  const tx       = await registry.register(metadataURI)
  const receipt  = await tx.wait()

  // Parse AgentRegistered event
  const event    = receipt.logs
    .map((log: ethers.Log) => { try { return registry.interface.parseLog(log) } catch { return null } })
    .find((e: ethers.LogDescription | null) => e?.name === 'AgentRegistered')

  const agentId: bigint = event?.args?.agentId ?? BigInt(0)
  console.log(`[erc8004] Agent registered ✅ agentId: ${agentId}`)
  console.log(`[erc8004] Sepolia tx: https://sepolia.etherscan.io/tx/${tx.hash}`)

  return agentId
}

// ── Reputation ────────────────────────────────────────────────────

/**
 * Update Maid402's on-chain reputation after an order.
 * @param signal      +1 for success, -1 for failure
 * @param reason      Short reason string (e.g. "order_completed", "order_failed")
 * @param evidenceCID Filecoin CID of the receipt (evidence)
 */
export async function giveFeedback(
  signal:      1 | -1,
  reason:      string,
  evidenceCID: string
): Promise<string> {
  const agentId = await getAgentId()
  if (!agentId) throw new Error('Agent not registered — run npm run setup:identity first')

  const signer   = getSigner()
  const registry = new ethers.Contract(REPUTATION_REGISTRY, REPUTATION_ABI, signer)

  const tx = await registry.giveFeedback(agentId, signal, reason, evidenceCID || '')
  await tx.wait()

  console.log(`[erc8004] Reputation updated (${signal > 0 ? '+1' : '-1'}) ✅ tx: ${tx.hash}`)
  return tx.hash as string
}

/**
 * Get the current reputation score for Maid402.
 */
export async function getReputation(): Promise<{ score: bigint; totalFeedback: bigint }> {
  const agentId = await getAgentId()
  if (!agentId) throw new Error('Agent not registered')

  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org')
  const registry = new ethers.Contract(REPUTATION_REGISTRY, REPUTATION_ABI, provider)
  const [score, totalFeedback] = await registry.getReputation(agentId)
  return { score, totalFeedback }
}

// ── Helpers ───────────────────────────────────────────────────────

/** Read agentId from identity/agent.json */
export async function getAgentId(): Promise<bigint | null> {
  try {
    const raw = await fs.readFile(AGENT_JSON, 'utf-8')
    const manifest = JSON.parse(raw) as AgentManifest
    const id = manifest.registrations?.[0]?.agentId
    if (!id || id === 'null') return null
    return BigInt(id)
  } catch {
    return null
  }
}

/** Update agentId in identity/agent.json after registration */
export async function saveAgentId(agentId: bigint): Promise<void> {
  const raw      = await fs.readFile(AGENT_JSON, 'utf-8')
  const manifest = JSON.parse(raw) as AgentManifest
  manifest.registrations[0].agentId = agentId.toString()
  manifest.operator.wallet           = new ethers.Wallet(process.env.OPERATOR_PRIVATE_KEY!).address
  await fs.writeFile(AGENT_JSON, JSON.stringify(manifest, null, 2))
  console.log(`[erc8004] agent.json updated with agentId: ${agentId}`)
}
