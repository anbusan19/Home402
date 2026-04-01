/**
 * scripts/test-filecoin.ts
 * Quick smoke test for Filecoin Calibration receipt upload.
 * Run: pnpm tsx scripts/test-filecoin.ts
 */

import 'dotenv/config'
import { uploadReceipt } from '../storage/filecoin.js'

const testReceipt = {
  agentId:         'test-agent',
  operatorWallet:  '0x0000000000000000000000000000000000000000',
  orderId:         `TEST-${Date.now()}`,
  platform:        'zepto' as const,
  items:           [{ name: 'Test Item', qty: 1, priceINR: 10 }],
  totalINR:        10,
  walletUsed:      'test',
  x402Attempted:   false,
  x402Settled:     false,
  timestamp:       new Date().toISOString(),
  pieceCID:        '',
  nearSpendRecord: '',
}

console.log('\n🧪 Filecoin Upload Test')
console.log('========================')
console.log('RPC URL:', process.env.FILECOIN_RPC_URL || 'https://api.calibration.node.glif.io/rpc/v1')
console.log('Private key set:', !!process.env.FILECOIN_PRIVATE_KEY)
console.log('Glif token set:', !!process.env.GLIF_TOKEN)
console.log()

try {
  const cid = await uploadReceipt(testReceipt)
  if (cid.startsWith('local:')) {
    console.log('\n❌ Upload failed — saved locally only:', cid)
    process.exit(1)
  } else {
    console.log('\n✅ Filecoin upload working! CID:', cid)
    process.exit(0)
  }
} catch (err) {
  console.error('\n❌ Fatal error:', err instanceof Error ? err.message : err)
  process.exit(1)
}
