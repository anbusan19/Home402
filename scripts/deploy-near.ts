/**
 * scripts/deploy-near.ts
 *
 * Deploy the SpendCap contract to NEAR testnet.
 * Run once: npm run deploy:near
 *
 * Prerequisites:
 *   - NEAR_ACCOUNT_ID in .env (e.g. casa-agent.testnet)
 *   - NEAR_PRIVATE_KEY in .env
 *   - near-sdk-as compiled WASM at contracts/SpendCap.wasm
 *     (compile with: cd contracts && npx asc SpendCap.near -o SpendCap.wasm)
 *
 * Note: The SpendCap.near file is AssemblyScript source.
 * For testnet demo, you can also deploy using near-cli:
 *   near deploy spend-cap.testnet contracts/SpendCap.wasm
 */

import 'dotenv/config'
import fs   from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function main() {
  console.log('\n🌐 NEAR SpendCap Contract Deployment')
  console.log('======================================\n')

  const accountId   = process.env.NEAR_ACCOUNT_ID
  const privateKey  = process.env.NEAR_PRIVATE_KEY
  const contractId  = process.env.NEAR_CONTRACT_ID || 'spend-cap.testnet'

  if (!accountId || !privateKey) {
    console.error('❌ NEAR_ACCOUNT_ID and NEAR_PRIVATE_KEY must be set in .env')
    process.exit(1)
  }

  const wasmPath = path.join(__dirname, '../contracts/SpendCap.wasm')

  let wasmBytes: Uint8Array
  try {
    const buf   = await fs.readFile(wasmPath)
    wasmBytes   = new Uint8Array(buf)
  } catch {
    console.error(`❌ WASM file not found at ${wasmPath}`)
    console.log('\nTo compile AssemblyScript contract:')
    console.log('  npm install -g assemblyscript')
    console.log('  cd contracts && npx asc SpendCap.near -o SpendCap.wasm --target release')
    console.log('\nAlternatively, deploy via near-cli:')
    console.log(`  near deploy ${contractId} contracts/SpendCap.wasm`)
    process.exit(1)
  }

  const { connect, keyStores, KeyPair } = await import('near-api-js')
  const keyStore = new keyStores.InMemoryKeyStore()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const keyPair  = KeyPair.fromString(privateKey as any)
  await keyStore.setKey('testnet', accountId, keyPair)

  const near    = await connect({ networkId: 'testnet', nodeUrl: 'https://rpc.testnet.near.org', keyStore, headers: {} })
  const account = await near.account(accountId)

  console.log(`Deploying to: ${contractId}`)
  console.log(`From account: ${accountId}\n`)

  const result = await account.deployContract(wasmBytes)
  console.log(`✅ Contract deployed!`)
  console.log(`   Tx: https://explorer.testnet.near.org/transactions/${result.transaction.hash}`)
  console.log(`   Contract: https://explorer.testnet.near.org/accounts/${contractId}`)
  console.log(`\n   Update NEAR_CONTRACT_ID=${contractId} in .env`)
}

main().catch(err => {
  console.error('❌ Deployment failed:', err.message)
  process.exit(1)
})
