/**
 * scripts/setup-identity.ts
 *
 * One-time ERC-8004 agent registration script.
 * Run once after deployment to register Maid402 on Sepolia.
 *
 * Usage: npm run setup:identity
 *
 * Prerequisites:
 *   - OPERATOR_PRIVATE_KEY in .env (Sepolia wallet with ETH)
 *   - SEPOLIA_RPC_URL in .env
 */

import 'dotenv/config'
import fs   from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { registerAgent, saveAgentId } from '../identity/erc8004.js'

const __dirname  = path.dirname(fileURLToPath(import.meta.url))
const AGENT_JSON = path.join(__dirname, '../identity/agent.json')

async function main() {
  console.log('\n🔑 ERC-8004 Agent Registration')
  console.log('================================\n')

  if (!process.env.OPERATOR_PRIVATE_KEY) {
    console.error('❌ OPERATOR_PRIVATE_KEY not set in .env')
    process.exit(1)
  }

  // Read agent manifest to use as metadata URI
  // For production: upload to IPFS/Filecoin first and use that CID
  // For now: use a JSON data URI (works for testing)
  const manifest    = await fs.readFile(AGENT_JSON, 'utf-8')
  const metadataURI = `data:application/json;base64,${Buffer.from(manifest).toString('base64')}`

  console.log('Registering on Sepolia Identity Registry...')
  console.log(`Registry: 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432\n`)

  const agentId = await registerAgent(metadataURI)

  await saveAgentId(agentId)

  console.log(`\n✅ Registration complete!`)
  console.log(`   agentId: ${agentId}`)
  console.log(`   Check: https://sepolia.etherscan.io/address/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`)
  console.log(`\n   identity/agent.json updated with agentId.`)
  console.log(`   Copy agent.json to repo root: cp identity/agent.json agent.json\n`)
}

main().catch(err => {
  console.error('❌ Registration failed:', err.message)
  process.exit(1)
})
