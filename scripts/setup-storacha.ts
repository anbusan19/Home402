/**
 * scripts/setup-storacha.ts
 *
 * One-time Storacha space setup and initial preference profile upload.
 * Run once: npm run setup:storacha
 *
 * Prerequisites:
 *   - STORACHA_EMAIL in .env
 *   - Node.js 20+ (for native Blob/File)
 */

import 'dotenv/config'
import { savePreferenceProfile } from '../storage/storacha.js'

const INITIAL_PROFILE = {
  version:             1,
  savedItems:          ['atta 1kg', 'milk 500ml', 'sugar 1kg', 'eggs', 'bread', 'dal 500g', 'rice 1kg', 'cooking oil 1L'],
  preferredPlatforms:  ['zepto'],
  dietaryRestrictions: [] as string[],
  orderHistory:        [] as Array<{ orderId: string; item: string; platform: string; priceINR: number; timestamp: string }>,
  lastUpdated:         new Date().toISOString(),
}

async function main() {
  console.log('\n🗄️  Storacha Agent Memory Setup')
  console.log('=================================\n')

  const email = process.env.STORACHA_EMAIL
  if (!email) {
    console.error('❌ STORACHA_EMAIL not set in .env')
    console.log('   Get your account at: https://console.storacha.network')
    process.exit(1)
  }

  console.log(`Setting up Storacha space for: ${email}`)
  console.log('This will send a verification email — check your inbox.\n')

  try {
    const { create } = await import('@web3-storage/w3up-client')
    const client     = await create()

    // Login with email (sends verification link)
    console.log('Logging in to Storacha...')
    await client.login(email as `${string}@${string}`)
    console.log('✅ Logged in!')

    // Create a space for Casa
    console.log('Creating storage space "casa-agent-memory"...')
    const space = await client.createSpace('casa-agent-memory')
    await client.setCurrentSpace(space.did())
    console.log(`✅ Space created: ${space.did()}`)

    // Upload initial preference profile
    console.log('\nUploading initial preference profile...')
    const cid = await savePreferenceProfile(INITIAL_PROFILE)
    console.log(`✅ Profile uploaded: ${cid}`)

    console.log('\n🎉 Storacha setup complete!')
    console.log(`   Space DID: ${space.did()}`)
    console.log(`   Profile CID: ${cid}`)
    console.log(`   View at: https://console.storacha.network\n`)

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('❌ Setup failed:', msg)
    console.log('\nFalling back to local-only memory (no Storacha).')
    console.log('Casa will still work — preference profile saved to .storacha-memory.json')
  }
}

main().catch(err => {
  console.error('❌ Fatal:', err.message)
  process.exit(1)
})
