/**
 * integrations/x402-server.ts
 *
 * x402 payment gate for the Maid402 agent.
 *
 * Protocol flow:
 *   1. POST /api/order  (no X-PAYMENT header)
 *      → 402 with payment requirements JSON
 *   2. Client signs EIP-3009 transferWithAuthorization off-chain
 *   3. POST /api/order  (X-PAYMENT: <base64 payload>)
 *      → Server verifies EIP-3009 signature locally via viem
 *      → Submits transferWithAuthorization on-chain to settle
 *      → On success, agent executes the order
 */

import { createPublicClient, createWalletClient, http, recoverTypedDataAddress, getAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'
import { decodePaymentSignatureHeader } from '@x402/core/http'
import type { PaymentPayload } from '@x402/core/types'

// ── Constants ─────────────────────────────────────────────────────────

const USDC_BASE_SEPOLIA = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`
const SERVICE_AMOUNT    = process.env.X402_SERVICE_AMOUNT ?? '1000000'
const TIMEOUT_SECONDS   = 300

// ── EIP-3009 ABI (transferWithAuthorization) ──────────────────────────

const EIP3009_ABI = [
  {
    name: 'transferWithAuthorization',
    type: 'function',
    inputs: [
      { name: 'from',        type: 'address' },
      { name: 'to',          type: 'address' },
      { name: 'value',       type: 'uint256' },
      { name: 'validAfter',  type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce',       type: 'bytes32'  },
      { name: 'v',           type: 'uint8'   },
      { name: 'r',           type: 'bytes32'  },
      { name: 's',           type: 'bytes32'  },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

// EIP-712 domain + types for EIP-3009
const EIP3009_TYPES = {
  TransferWithAuthorization: [
    { name: 'from',        type: 'address' },
    { name: 'to',          type: 'address' },
    { name: 'value',       type: 'uint256' },
    { name: 'validAfter',  type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce',       type: 'bytes32'  },
  ],
}

// ── Viem clients ──────────────────────────────────────────────────────

function getWalletClient() {
  const pk = process.env.OPERATOR_PRIVATE_KEY
  if (!pk) throw new Error('OPERATOR_PRIVATE_KEY not set')
  const normalizedPk = (pk.startsWith('0x') ? pk : `0x${pk}`) as `0x${string}`
  const account = privateKeyToAccount(normalizedPk)
  return createWalletClient({ account, chain: baseSepolia, transport: http() })
}

const publicClient = createPublicClient({ chain: baseSepolia, transport: http() })

// ── 402 response body ─────────────────────────────────────────────────

export function build402Body(resourceUrl: string) {
  return {
    x402Version: 1,
    error:       'Payment required',
    accepts: [{
      scheme:            'exact',
      network:           'eip155:84532',
      amount:            SERVICE_AMOUNT,
      maxAmountRequired: SERVICE_AMOUNT,
      resource:          resourceUrl,
      description:       'Maid402 grocery ordering — 1 USDC service fee',
      mimeType:          'application/json',
      payTo:             process.env.OPERATOR_WALLET ?? '',
      maxTimeoutSeconds: TIMEOUT_SECONDS,
      asset:             USDC_BASE_SEPOLIA,
      extra:             { name: 'USDC', decimals: 6, version: '2' },
    }],
  }
}

// ── Payment verification + settlement ────────────────────────────────

export interface PaymentResult {
  paid:    boolean
  payer?:  string
  txHash?: string
  error?:  string
}

/**
 * Decode the X-PAYMENT header, verify the EIP-3009 signature locally,
 * then call transferWithAuthorization on-chain to settle.
 */
export async function processX402Payment(
  paymentHeader: string,
  resourceUrl:   string
): Promise<PaymentResult> {
  const payTo = (process.env.OPERATOR_WALLET ?? '') as `0x${string}`

  // Decode base64 X-PAYMENT header
  let payload: PaymentPayload
  try {
    payload = decodePaymentSignatureHeader(paymentHeader)
  } catch (err) {
    return { paid: false, error: `Invalid X-PAYMENT header: ${err}` }
  }

  const inner    = (payload as any).payload
  const auth     = inner?.authorization
  const signature = inner?.signature as string | undefined

  if (!auth || !signature) return { paid: false, error: 'Missing authorization or signature in payment payload' }

  const { from, to, value, validAfter, validBefore, nonce } = auth

  // ── Step 1: Validate fields ────────────────────────────────────────
  const now = Math.floor(Date.now() / 1000)
  if (now < Number(validAfter))  return { paid: false, error: 'Payment not yet valid' }
  if (now > Number(validBefore)) return { paid: false, error: 'Payment authorization expired' }
  if (getAddress(to) !== getAddress(payTo)) return { paid: false, error: `payTo mismatch: got ${to}` }
  if (BigInt(value) < BigInt(SERVICE_AMOUNT)) return { paid: false, error: 'Insufficient payment amount' }

  // ── Step 2: Verify EIP-3009 signature locally ─────────────────────
  try {
    const sig = signature as `0x${string}`
    const r = sig.slice(0, 66)   as `0x${string}`
    const s = `0x${sig.slice(66, 130)}` as `0x${string}`
    const v = parseInt(sig.slice(130, 132), 16)

    const recovered = await recoverTypedDataAddress({
      domain: {
        name:              'USDC',   // must match extra.name from 402 body
        version:           '2',     // must match extra.version from 402 body
        chainId:           84532,   // Base Sepolia
        verifyingContract: USDC_BASE_SEPOLIA,
      },
      types:        EIP3009_TYPES,
      primaryType:  'TransferWithAuthorization',
      message: {
        from:        from as `0x${string}`,
        to:          to   as `0x${string}`,
        value:       BigInt(value),
        validAfter:  BigInt(validAfter),
        validBefore: BigInt(validBefore),
        nonce:       nonce as `0x${string}`,
      },
      signature: sig,
    })

    if (getAddress(recovered) !== getAddress(from)) {
      return { paid: false, error: `Signature mismatch: recovered ${recovered} expected ${from}` }
    }
    console.log('[x402] Signature verified ✅ payer:', from)
  } catch (err) {
    return { paid: false, error: `Signature verification failed: ${err}` }
  }

  // ── Step 3: Settle on-chain via transferWithAuthorization ─────────
  try {
    const wallet = getWalletClient()
    const sig    = signature as `0x${string}`
    const r = sig.slice(0, 66)          as `0x${string}`
    const s = `0x${sig.slice(66, 130)}` as `0x${string}`
    const v = parseInt(sig.slice(130, 132), 16)

    const txHash = await wallet.writeContract({
      address:      USDC_BASE_SEPOLIA,
      abi:          EIP3009_ABI,
      functionName: 'transferWithAuthorization',
      args: [
        from        as `0x${string}`,
        to          as `0x${string}`,
        BigInt(value),
        BigInt(validAfter),
        BigInt(validBefore),
        nonce       as `0x${string}`,
        v,
        r,
        s,
      ],
    })

    console.log(`[x402] Payment settled ✅  tx=${txHash}  payer=${from}`)
    return { paid: true, payer: from, txHash }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { paid: false, error: `Settlement failed: ${msg}` }
  }
}
