# Maid402 🏠

> **The first home that manages its own spending.**

Maid402 is an autonomous home commerce agent. It notices what your household is running low on, decides where to buy it, pays silently using platform-native wallets (Zepto Cash, Amazon Pay, Blinkit Credits), and only wakes you up when your money runs out or a purchase exceeds your budget cap.

Send a Telegram message. The agent opens a real browser, navigates the platform, adds items to cart, detects the available wallet balance, pays — and replies with a confirmation and a verifiable Filecoin receipt. No human in the loop.

**x402 is the spine.** Platform wallets are today's practical rail. x402 is the underlying payment protocol the agent speaks — the standard that makes autonomous machine payments possible on the open internet.

---

## Demo

```
You → Telegram: "order 1kg atta and 500ml milk from Zepto"

Maid402 → opens zeptonow.com in stealth Chromium
Maid402 → navigates to search, finds items, adds to cart
Maid402 → reaches checkout, detects Zepto Cash balance (₹245)
Maid402 → pays via Zepto Cash — no OTP, no human step
Maid402 → scrapes order confirmation #ZP-8821934
Maid402 → serializes receipt JSON → pushes to Filecoin Calibration Testnet
Maid402 → updates ERC-8004 reputation registry (successful order)
Maid402 → updates NEAR spend ledger (₹67 deducted from grocery budget)

Maid402 → Telegram: "Done ✓ Aashirvaad atta 1kg + Amul milk 500ml — ₹67 
        paid via Zepto Cash. Order #ZP-8821934
        Receipt: bafyrei...abc3 (Filecoin)"
```

---

## Why Maid402 Exists

Every AI assistant today can tell you what to buy. None of them actually buy it. The last mile — checkout and payment — always falls back to a human. Not because the AI isn't smart enough. Because it has no way to pay autonomously.

HTTP 402 was reserved in 1991 for "Payment Required" and left unused for thirty years. x402 activates that forgotten status code as the payment primitive the internet always needed — a standard way for any server to say "pay me here" and for any agent to respond and complete the transaction without human intervention.

Maid402 proves this works today, on real Indian infrastructure, with real platforms, real wallets, and real orders.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    PERCEPTION LAYER                      │
│  Telegram message │ Impulse AI prediction │ Manual list  │
└───────────────────────────┬─────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                     AGENT BRAIN                          │
│         Claude API (vision + reasoning loop)             │
│   Item classification │ Platform routing │ Budget check  │
└───────────────────────────┬─────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                   EXECUTION LAYER                        │
│              Playwright Stealth Chromium                  │
│    Zepto │ Blinkit │ Amazon │ Swiggy Instamart           │
└───────────────────────────┬─────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                    PAYMENT LAYER                         │
│  1. x402 client attempt (HTTP 402 handshake)            │
│  2. Platform wallet (Zepto Cash / Amazon Pay / Blinkit)  │
│  3. Notify user if insufficient funds                    │
└───────────────────────────┬─────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                  TRUST + AUDIT LAYER                     │
│  ERC-8004 identity + reputation registry (on-chain)      │
│  Filecoin receipt storage via Synapse SDK                │
│  NEAR smart contract spend caps                          │
│  Storacha decentralized agent memory                     │
└─────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Component | Technology | Purpose |
|---|---|---|
| Trigger channel | Telegram (grammY) | Receives commands, sends confirmations |
| Agent brain | Claude API (vision) | Screenshot reasoning, decision making |
| Browser automation | Playwright Stealth | Navigates real platforms by vision |
| Payment protocol | x402 (`@x402/fetch`) | HTTP-native autonomous payment standard |
| Platform wallets | Zepto Cash, Amazon Pay, Blinkit Credits | Zero-friction payment rails (today) |
| Agent identity | ERC-8004 Identity Registry | On-chain agent identity (ERC-721 based) |
| Agent reputation | ERC-8004 Reputation Registry | Trust signals after each successful order |
| Receipt storage | Filecoin Synapse SDK (`@filoz/synapse-sdk`) | Verifiable, content-addressed order receipts |
| Agent memory | Storacha (`@web3-storage/w3up-client`) | Decentralized preference + history storage |
| Budget enforcement | NEAR smart contract | Per-category spend caps stored on-chain |
| Restock prediction | Impulse AI (impulselabs.ai) | Predicts when household items need reordering |
| Execution logs | `agent_log.json` | Structured log of every decision and tool call |
| Agent manifest | `agent.json` | ERC-8004 compatible machine-readable identity |

---

## Repo Structure

```
Maid402/
├── agent/
│   ├── index.ts              # Main agent loop
│   ├── brain.ts              # LLM vision reasoning (Claude API)
│   ├── logger.ts             # agent_log.json writer
│   └── scheduler.ts          # Proactive restock scheduler (Impulse AI)
├── browser/
│   ├── launcher.ts           # Playwright stealth Chromium setup
│   ├── navigator.ts          # Vision-based page navigation
│   └── sessions/             # Saved platform session cookies
│       ├── zepto.json
│       ├── blinkit.json
│       └── amazon.json
├── payments/
│   ├── x402-client.ts        # x402 HTTP payment client
│   ├── wallet-detector.ts    # Detects platform wallet + balance at checkout
│   ├── payment-router.ts     # x402 → platform wallet → notify fallback chain
│   └── mock-402-server.ts    # Local x402 mock server for testing
├── identity/
│   ├── erc8004.ts            # ERC-8004 Identity + Reputation registry client
│   ├── agent.json            # ERC-8004 agent manifest (machine-readable)
│   └── agent_log.json        # Structured execution log (auto-generated)
├── storage/
│   ├── filecoin.ts           # Synapse SDK receipt upload to Calibration Testnet
│   ├── storacha.ts           # Agent memory (preferences + order history)
│   └── receipts/             # Local receipt cache before Filecoin upload
├── integrations/
│   ├── near.ts               # NEAR spend cap contract client
│   ├── impulse.ts            # Impulse AI prediction API client
│   └── telegram.ts           # Telegram bot (grammY)
├── contracts/
│   └── SpendCap.near         # NEAR smart contract source
├── scripts/
│   ├── setup-identity.ts     # One-time ERC-8004 registration script
│   └── seed-impulse.ts       # Upload initial order history to Impulse AI
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## Agent Manifest (`agent.json`)

```json
{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  "name": "Maid402",
  "description": "Autonomous home commerce agent. Perceives household needs, navigates real e-commerce platforms by vision, and pays using x402 and platform-native wallets. No human in the loop.",
  "image": "https://your-domain.com/Maid402-logo.png",
  "services": [
    {
      "name": "telegram",
      "endpoint": "https://t.me/Maid402_agent_bot"
    },
    {
      "name": "web",
      "endpoint": "https://your-domain.com"
    }
  ],
  "x402Support": true,
  "active": true,
  "registrations": [
    {
      "agentId": null,
      "agentRegistry": "eip155:11155111:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432"
    }
  ],
  "supportedTrust": ["reputation"],
  "operator": {
    "wallet": "0x<YOUR_OPERATOR_WALLET>",
    "name": "Maid402 Operator"
  },
  "tools": [
    "playwright-browser",
    "telegram-bot",
    "x402-payment-client",
    "filecoin-synapse-sdk",
    "near-contract",
    "impulse-ai-api",
    "storacha-storage"
  ],
  "taskCategories": [
    "grocery-ordering",
    "household-restocking",
    "autonomous-payment",
    "appliance-ordering"
  ],
  "computeConstraints": {
    "maxOrderAmountINR": 2000,
    "maxOrdersPerDay": 5,
    "supportedPlatforms": ["zepto", "blinkit", "amazon", "swiggy-instamart"]
  }
}
```

---

## Receipt Schema

Every order produces a receipt pushed to Filecoin Calibration Testnet:

```json
{
  "agentId": "<ERC-8004 agent ID>",
  "operatorWallet": "0x<operator>",
  "orderId": "ZP-8821934",
  "platform": "zepto",
  "items": [
    { "name": "Aashirvaad Atta 1kg", "qty": 1, "priceINR": 52 },
    { "name": "Amul Milk 500ml", "qty": 1, "priceINR": 15 }
  ],
  "totalINR": 67,
  "walletUsed": "zepto_cash",
  "x402Attempted": true,
  "x402Settled": false,
  "timestamp": "2026-03-31T10:42:00Z",
  "pieceCID": "bafyrei...abc3",
  "nearSpendRecord": "txhash:0x..."
}
```

---

## Setup

### Prerequisites

- Node.js 20+
- A Telegram bot token ([@BotFather](https://t.me/BotFather))
- Claude API key (or OpenAI)
- Ethereum wallet with Sepolia testnet ETH (for ERC-8004 registration)
- Filecoin Calibration testnet wallet + USDFC tokens ([faucet](https://faucet.calibration.fildev.network/))
- NEAR testnet account ([wallet.testnet.near.org](https://wallet.testnet.near.org))
- Impulse AI account ([impulselabs.ai](https://impulselabs.ai))
- Storacha account ([console.storacha.network](https://console.storacha.network))

### Installation

```bash
git clone https://github.com/your-org/Maid402
cd Maid402
npm install
cp .env.example .env
```

### Environment Variables

```env
# Telegram
TELEGRAM_BOT_TOKEN=

# LLM (vision reasoning)
ANTHROPIC_API_KEY=
# or OPENAI_API_KEY=

# ERC-8004 (Sepolia testnet)
OPERATOR_PRIVATE_KEY=
IDENTITY_REGISTRY_ADDRESS=0x8004A169FB4a3325136EB29fA0ceB6D2e539a432
REPUTATION_REGISTRY_ADDRESS=0x8004BAa17C55a88189AE136b182e5fdA19dE9b63
SEPOLIA_RPC_URL=https://rpc.sepolia.org

# Filecoin (Calibration testnet)
FILECOIN_PRIVATE_KEY=
FILECOIN_RPC_URL=https://api.calibration.node.glif.io/rpc/v1
GLIF_TOKEN=

# Storacha
STORACHA_EMAIL=

# NEAR (testnet)
NEAR_ACCOUNT_ID=
NEAR_PRIVATE_KEY=
NEAR_CONTRACT_ID=spend-cap.testnet

# Impulse AI
IMPULSE_API_KEY=
IMPULSE_MODEL_ENDPOINT=

# x402 (mock local server for testing)
X402_MOCK_SERVER_PORT=4020
```

### First-Time Setup

**Step 1: Register ERC-8004 identity**
```bash
npm run setup:identity
# Registers Maid402 on Sepolia Identity Registry
# Prints your agentId — save it, update agent.json
```

**Step 2: Deploy NEAR spend cap contract**
```bash
npm run deploy:near
# Deploys SpendCap contract to NEAR testnet
# Sets default caps: groceries ₹500/week, appliances ₹2000/month
```

**Step 3: Set up Storacha space**
```bash
npm run setup:storacha
# Creates a Storacha space for agent memory
# Stores initial empty preference profile
```

**Step 4: Bootstrap Impulse AI model**
```bash
npm run seed:impulse
# Uploads sample order history CSV to Impulse AI
# Describe outcome: "predict days until each item needs restocking"
# Save the deployed model endpoint to IMPULSE_MODEL_ENDPOINT in .env
```

**Step 5: Save platform session cookies**
```bash
npm run sessions:capture
# Opens browser windows for Zepto, Blinkit, Amazon
# Log in manually once — cookies are saved to browser/sessions/
```

### Run

```bash
# Development (with mock 402 server)
npm run dev

# Production
npm start
```

---

## How the Payment Router Works

```
Agent reaches checkout
        ↓
1. Attempt x402 handshake (HTTP client sends request, checks for 402 response)
        ↓
   402 response received?
   ├── YES → pay via x402 → settlement on-chain → done
   └── NO  → fall through to platform wallet
        ↓
2. Detect platform wallet balance (read checkout page via Playwright)
        ↓
   Balance ≥ order total?
   ├── YES → pay via platform wallet → done
   └── NO  → check NEAR spend cap budget remaining
        ↓
3. Budget remaining?
   ├── YES (but wallet low) → notify Telegram: "Top up Zepto Cash — need ₹X"
   └── NO (cap reached)    → notify Telegram: "Weekly grocery budget reached"
```

---

## How the Proactive Scheduler Works

Impulse AI trains a restock prediction model on your household's order history. The scheduler runs every 6 hours:

```
Impulse AI API call: "days until restock needed per item"
        ↓
Item predicted to run out in ≤ 2 days?
├── YES → check NEAR budget cap → route to best platform → place order
└── NO  → log prediction, check again in 6 hours
```

---

## ERC-8004 Trust Flow

Every order updates Maid402's on-chain reputation:

```
Successful order
    → giveFeedback(agentId, +1, "order_completed", receiptCID)
    → Reputation Registry updated on Sepolia
    → Filecoin receipt CID attached as evidence

Failed order / budget breach
    → giveFeedback(agentId, -1, "order_failed", errorCID)
    → Transparent audit trail — nothing hidden
```

---

## Execution Log Format (`agent_log.json`)

Auto-generated during every run. Required for Ethereum Foundation bounty submission:

```json
{
  "runId": "run_20260331_104200",
  "agentId": "<ERC-8004 ID>",
  "trigger": "telegram_message",
  "input": "order 1kg atta and 500ml milk from Zepto",
  "steps": [
    {
      "step": 1,
      "action": "load_session",
      "tool": "playwright",
      "status": "success",
      "ts": "2026-03-31T10:42:01Z"
    },
    {
      "step": 2,
      "action": "screenshot_and_reason",
      "tool": "claude-vision",
      "decision": "search for 'atta' in search bar",
      "status": "success",
      "ts": "2026-03-31T10:42:04Z"
    },
    {
      "step": 3,
      "action": "add_to_cart",
      "tool": "playwright",
      "item": "Aashirvaad Atta 1kg",
      "status": "success",
      "ts": "2026-03-31T10:42:09Z"
    },
    {
      "step": 4,
      "action": "x402_attempt",
      "tool": "x402-client",
      "status": "no_402_response",
      "fallback": "platform_wallet",
      "ts": "2026-03-31T10:42:14Z"
    },
    {
      "step": 5,
      "action": "near_budget_check",
      "tool": "near-contract",
      "budgetRemainingINR": 433,
      "orderTotalINR": 67,
      "status": "approved",
      "ts": "2026-03-31T10:42:15Z"
    },
    {
      "step": 6,
      "action": "pay_platform_wallet",
      "tool": "playwright",
      "wallet": "zepto_cash",
      "amountINR": 67,
      "status": "success",
      "ts": "2026-03-31T10:42:22Z"
    },
    {
      "step": 7,
      "action": "store_receipt_filecoin",
      "tool": "synapse-sdk",
      "pieceCID": "bafyrei...abc3",
      "network": "filecoin-calibration",
      "status": "success",
      "ts": "2026-03-31T10:42:28Z"
    },
    {
      "step": 8,
      "action": "update_reputation",
      "tool": "erc8004-reputation-registry",
      "signal": "+1",
      "txHash": "0x...",
      "status": "success",
      "ts": "2026-03-31T10:42:31Z"
    },
    {
      "step": 9,
      "action": "telegram_confirm",
      "tool": "grammy",
      "message": "Done ✓ Order #ZP-8821934 — ₹67 via Zepto Cash. Receipt: bafyrei...abc3",
      "status": "success",
      "ts": "2026-03-31T10:42:32Z"
    }
  ],
  "outcome": "success",
  "totalDurationMs": 31000,
  "computeBudgetUsed": {
    "llmCalls": 4,
    "browserActions": 12,
    "blockchainTxs": 2
  }
}
```

---

## Hackathon Track Submissions

Maid402 is submitted across the following tracks at PL Genesis: Frontiers of Collaboration:

| Track | Sponsor | Prize | Key Integration |
|---|---|---|---|
| AI & Robotics | Protocol Labs | $3,000 | Vision-based autonomous agent, x402 payment standard |
| Fresh Code | Protocol Labs | $5,000 | New codebase, declared at submission |
| Agent Only | Ethereum Foundation | $2,000 | Full autonomous loop, ERC-8004 identity, agent_log.json |
| Agents With Receipts | Ethereum Foundation | $2,000 | ERC-8004 reputation registry, Filecoin receipt CIDs |
| Filecoin | Filecoin Foundation | $1,250 | Synapse SDK, Calibration Testnet, receipt + log storage |
| Storacha | Storacha | $200 | Decentralized RAG agent memory, preference + history |
| NEAR Protocol | NEAR | $500 | On-chain spend cap contract, budget enforcement |
| Impulse AI | Impulse AI | $300 | Proactive restock prediction model API |
| Community Vote | Protocol Labs | $1,000 | X post + demo video campaign |

**Total target: ~$15,250**

---

## Submission Artifacts Checklist

- [ ] `agent.json` — ERC-8004 manifest at repo root
- [ ] `agent_log.json` — sample execution log at repo root
- [ ] ERC-8004 identity registration tx (Sepolia block explorer link)
- [ ] ERC-8004 reputation update tx (Sepolia block explorer link)
- [ ] Filecoin Calibration Testnet receipt CID (explorer link)
- [ ] NEAR spend cap contract deployment (NEAR explorer link)
- [ ] Impulse AI model endpoint (live API call in code)
- [ ] Demo video (full end-to-end order flow)
- [ ] 30-second clip for Community Vote X post
- [ ] GitHub repo (public, MIT license)
- [ ] Architectural diagram (see Architecture section above)

---

## Build Order (for contributors)

Follow phases in order — each phase has a test gate that must pass before proceeding:

| Phase | What | Test Gate |
|---|---|---|
| 1 | Telegram + Playwright + LLM vision loop | Agent reaches checkout without paying |
| 2 | Payment execution (wallet + x402 stub) | Live end-to-end order on Zepto |
| 3 | Filecoin receipt storage via Synapse SDK | Receipt CID retrievable on Calibration explorer |
| 4 | ERC-8004 identity + reputation + log | Identity tx + reputation tx visible on Sepolia |
| 5a | NEAR spend cap contract | Budget cap blocks over-limit order |
| 5b | Impulse AI prediction call | API returns days-to-restock per item |
| 5c | Storacha agent memory | Agent loads preference profile on startup |
| 6 | Demo video + submission write-ups | Full flow recorded, all artifacts generated |

---

## License

MIT

---

## Team

Built for PL Genesis: Frontiers of Collaboration Hackathon (Feb–Mar 2026).

Hacking period: Feb 10 – Mar 31, 2026 | Judging: Apr 1–3, 2026 | Winners: Apr 4, 2026
