'use client'

import { useState } from 'react'
import Link from 'next/link'

// ── Data ──────────────────────────────────────────────────────────────

const STACK = [
  { label: 'Zepto',        color: '#ff5b2e', desc: 'Grocery delivery (browser automation)' },
  { label: 'x402',         color: '#2563eb', desc: 'HTTP payment protocol · Base Sepolia USDC' },
  { label: 'NEAR',         color: '#00c27c', desc: 'On-chain spend cap · maid402.testnet' },
  { label: 'Storacha',     color: '#7c3aed', desc: 'Decentralised agent memory (w3up)' },
  { label: 'Filecoin',     color: '#0090ff', desc: 'Receipt archival (Calibration testnet)' },
  { label: 'Groq / Llama4',color: '#f59e0b', desc: 'Vision brain + NL intent parsing' },
  { label: 'Impulse AI',   color: '#ec4899', desc: 'Restock prediction (XGBoost)' },
  { label: 'Telegram',     color: '#26a5e4', desc: 'Bot interface (grammY)' },
]

// ── Styles (declared early so STEPS JSX can reference them) ──────────

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight:      '100dvh',
    background:     '#0a0a0e',
    color:          '#d8d4f0',
    fontFamily:     "'Inter', ui-sans-serif, system-ui, sans-serif",
  },
  header: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        '12px 24px',
    borderBottom:   '1px solid #1e1e28',
    background:     '#07070b',
    position:       'sticky' as const,
    top:            0,
    zIndex:         10,
  },
  backLink: {
    color:          '#5a5870',
    fontSize:       13,
    textDecoration: 'none',
    fontWeight:     500,
    transition:     'color 0.15s',
  },
  headerCenter: {
    display:     'flex',
    alignItems:  'center',
    gap:         8,
    position:    'absolute' as const,
    left:        '50%',
    transform:   'translateX(-50%)',
  },
  logoEmoji:   { fontSize: 16 },
  logoText:    { fontWeight: 700, fontSize: 14, color: '#e8e4f8' },
  headerSep:   { color: '#3a3a48', fontSize: 14 },
  headerTitle: { fontSize: 13, color: '#6b6880', fontWeight: 500 },
  progressPill: {
    position:       'relative',
    width:          80,
    height:         22,
    background:     '#161620',
    border:         '1px solid #2a2a38',
    borderRadius:   20,
    overflow:       'hidden',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
  },
  progressBar: {
    position:   'absolute',
    left:       0,
    top:        0,
    bottom:     0,
    background: 'linear-gradient(90deg, #7c3aed, #22c55e)',
    transition: 'width 0.3s ease',
  },
  progressText: { position: 'relative', fontSize: 10.5, fontWeight: 600, color: '#e8e4f8', zIndex: 1 },
  main:         { maxWidth: 720, margin: '0 auto', padding: '32px 20px 64px' },
  hero: {
    textAlign:     'center' as const,
    marginBottom:  40,
    paddingBottom: 32,
    borderBottom:  '1px solid #1a1a24',
  },
  h1: { fontSize: 28, fontWeight: 700, color: '#f0ede8', letterSpacing: '-0.03em', margin: '0 0 10px' },
  heroSub: { color: '#5a5870', fontSize: 13.5, lineHeight: 1.6, margin: '0 0 20px' },
  stackRow:   { display: 'flex', flexWrap: 'wrap' as const, gap: 6, justifyContent: 'center' },
  stackBadge: { display: 'flex', alignItems: 'center', gap: 5, border: '1px solid', borderRadius: 6, padding: '4px 9px' },
  steps:      { display: 'flex', flexDirection: 'column' as const, gap: 8 },
  stepCard:   { border: '1px solid', borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.2s', background: '#0d0d14' },
  stepHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer', userSelect: 'none' as const },
  stepLeft:   { display: 'flex', alignItems: 'center', gap: 10 },
  checkbox: {
    width:          20,
    height:         20,
    borderRadius:   6,
    border:         '1.5px solid',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    cursor:         'pointer',
    flexShrink:     0,
    transition:     'all 0.15s',
  },
  stepNum:    { fontSize: 11, color: '#3a3a50', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.05em' },
  stepTitle:  { fontSize: 14, fontWeight: 500, transition: 'all 0.2s' },
  badge:      { fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, border: '1px solid', letterSpacing: '0.05em' },
  stepBody:   { padding: '0 16px 16px', borderTop: '1px solid #1a1a24' },
  bodyInner:  { paddingTop: 14 },
  p:          { fontSize: 13.5, color: '#8a87a0', lineHeight: 1.7, margin: '0 0 12px' },
  codeBlock: {
    position:     'relative' as const,
    background:   '#07070b',
    border:       '1px solid #1e1e28',
    borderRadius: 8,
    marginBottom: 12,
    overflow:     'hidden',
  },
  codeLang: {
    position:      'absolute' as const,
    top:           8,
    left:          12,
    fontSize:      10,
    color:         '#3a3a50',
    fontFamily:    'monospace',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
  },
  pre: {
    margin:     0,
    padding:    '28px 14px 12px',
    fontSize:   12.5,
    fontFamily: '"SF Mono", "Fira Code", monospace',
    color:      '#a09cb8',
    lineHeight: 1.8,
    overflowX:  'auto' as const,
    whiteSpace: 'pre' as const,
  },
  copyBtn: {
    position:     'absolute' as const,
    top:          8,
    right:        8,
    background:   '#161620',
    border:       '1px solid #2a2a38',
    borderRadius: 5,
    color:        '#5a5770',
    fontSize:     10.5,
    padding:      '3px 8px',
    cursor:       'pointer',
    fontFamily:   'inherit',
    transition:   'color 0.15s',
  },
  envTable:   { display: 'flex', flexDirection: 'column' as const, gap: 2 },
  envSection: { fontSize: 10, fontWeight: 700, color: '#3a3a50', letterSpacing: '0.1em', textTransform: 'uppercase' as const, padding: '10px 0 4px' },
  envRow: {
    display:      'flex',
    alignItems:   'flex-start',
    gap:          12,
    padding:      '6px 10px',
    background:   '#0a0a12',
    borderRadius: 6,
    marginBottom: 2,
  },
  envKey:     { fontFamily: '"SF Mono", monospace', fontSize: 11.5, color: '#7c3aed', flexShrink: 0, width: 220, paddingTop: 1 },
  envMeta:    { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const },
  envDesc:    { fontSize: 12, color: '#5a5870' },
  revealBtn:  { fontSize: 10, color: '#3a3a50', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' },
  checkList:  { display: 'flex', flexDirection: 'column' as const, gap: 6 },
  checkRow:   { display: 'flex', alignItems: 'center', gap: 8 },
  checkDot:   { width: 5, height: 5, borderRadius: '50%', background: '#7c3aed', flexShrink: 0 },
  checkLabel: { fontSize: 13, color: '#8a87a0' },
  twoCol:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 },
  walletCard: { background: '#07070b', border: '1px solid #1e1e28', borderRadius: 8, padding: '12px 14px' },
  walletLabel: { fontSize: 12, fontWeight: 600, color: '#e8e4f8', marginBottom: 4 },
  walletDesc:  { fontSize: 11, color: '#5a5870', marginBottom: 8 },
  ul:          { paddingLeft: 16, margin: 0, fontSize: 12, color: '#6b6880', lineHeight: 1.8 },
  linkList:    { display: 'flex', flexDirection: 'column' as const, gap: 4 },
  extLink:     { fontSize: 12.5, color: '#7c3aed', textDecoration: 'none', fontWeight: 500 },
  stepFlow:    { display: 'flex', flexDirection: 'column' as const, gap: 6 },
  flowRow:     { display: 'flex', alignItems: 'center', gap: 10 },
  flowNum:     { width: 20, height: 20, borderRadius: '50%', background: '#1a1a28', border: '1px solid #2a2a38', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#7c3aed', flexShrink: 0 },
  flowLabel:   { fontSize: 13, color: '#8a87a0', flex: 1 },
  terminalGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 },
  termLabel:   { fontSize: 11, color: '#4a4a58', marginBottom: 6, fontWeight: 500 },
  infoBox: {
    display:      'flex',
    alignItems:   'center',
    gap:          8,
    background:   '#0d1020',
    border:       '1px solid #1e2840',
    borderRadius: 7,
    padding:      '8px 12px',
    fontSize:     12.5,
    color:        '#6080b0',
  },
  infoIcon:    { fontSize: 13, color: '#4060a0' },
  tryList:     { display: 'flex', flexDirection: 'column' as const, gap: 6 },
  tryRow:      { display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px', background: '#0a0a12', borderRadius: 6 },
  tryCmd:      { fontFamily: '"SF Mono", monospace', fontSize: 12, color: '#a78bfa', flexShrink: 0 },
  tryWhat:     { fontSize: 12, color: '#5a5870' },
  inlineCode: {
    fontFamily:   '"SF Mono", monospace',
    fontSize:     11.5,
    color:        '#7c3aed',
    background:   'rgba(124,58,237,0.1)',
    borderRadius: 4,
    padding:      '1px 5px',
    border:       '1px solid rgba(124,58,237,0.2)',
  },
  inlineLink:  { color: '#7c3aed', textDecoration: 'underline', textUnderlineOffset: '2px' },
  footer: {
    marginTop:      48,
    paddingTop:     24,
    borderTop:      '1px solid #1a1a24',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    flexWrap:       'wrap' as const,
    gap:            12,
  },
  footerText:  { fontSize: 12, color: '#3a3a50' },
  footerLinks: { display: 'flex', alignItems: 'center', gap: 8 },
  footerLink:  { fontSize: 12, color: '#5a5870', textDecoration: 'none' },
  footerDot:   { color: '#2a2a38', fontSize: 12 },
}

// ─────────────────────────────────────────────────────────────────────

interface Step {
  id:      string
  title:   string
  badge?:  string
  badgeColor?: string
  content: React.ReactNode
}

// ── Copy button ───────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      style={s.copyBtn}
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800) }}
    >
      {copied ? '✓' : 'copy'}
    </button>
  )
}

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  return (
    <div style={s.codeBlock}>
      {lang && <span style={s.codeLang}>{lang}</span>}
      <CopyBtn text={code} />
      <pre style={s.pre}>{code}</pre>
    </div>
  )
}

function EnvRow({ k, v, desc, secret }: { k: string; v?: string; desc: string; secret?: boolean }) {
  const [show, setShow] = useState(false)
  const display = secret && !show ? '••••••••••' : (v ?? '<your value>')
  return (
    <div style={s.envRow}>
      <div style={s.envKey}>{k}</div>
      <div style={s.envMeta}>
        <span style={s.envDesc}>{desc}</span>
        {v && secret && (
          <button style={s.revealBtn} onClick={() => setShow(x => !x)}>
            {show ? 'hide' : 'show'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Step accordion ────────────────────────────────────────────────────

function StepItem({ step, idx, checked, onCheck }: {
  step:    Step
  idx:     number
  checked: boolean
  onCheck: () => void
}) {
  const [open, setOpen] = useState(idx === 0)

  return (
    <div style={{ ...s.stepCard, borderColor: checked ? '#22c55e44' : '#1e1e28' }}>
      <div style={s.stepHeader} onClick={() => setOpen(o => !o)}>
        <div style={s.stepLeft}>
          <button
            style={{ ...s.checkbox, background: checked ? '#22c55e' : 'transparent', borderColor: checked ? '#22c55e' : '#3a3a48' }}
            onClick={e => { e.stopPropagation(); onCheck() }}
          >
            {checked && <span style={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>✓</span>}
          </button>
          <span style={s.stepNum}>0{idx + 1}</span>
          <span style={{ ...s.stepTitle, color: checked ? '#6b7280' : '#e8e4f8', textDecoration: checked ? 'line-through' : 'none' }}>
            {step.title}
          </span>
          {step.badge && (
            <span style={{ ...s.badge, background: (step.badgeColor ?? '#7c3aed') + '22', color: step.badgeColor ?? '#7c3aed', borderColor: (step.badgeColor ?? '#7c3aed') + '44' }}>
              {step.badge}
            </span>
          )}
        </div>
        <span style={{ color: '#4a4a58', fontSize: 13, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
      </div>
      {open && <div style={s.stepBody}>{step.content}</div>}
    </div>
  )
}

// ── Steps ─────────────────────────────────────────────────────────────

const STEPS: Step[] = [
  {
    id: 'prereqs',
    title: 'Prerequisites',
    content: (
      <div style={s.bodyInner}>
        <p style={s.p}>Make sure you have the following installed:</p>
        <div style={s.checkList}>
          {[
            ['Node.js 20+', 'node --version'],
            ['pnpm 9+',     'npm i -g pnpm'],
            ['Git',         'git --version'],
          ].map(([label, cmd]) => (
            <div key={label} style={s.checkRow}>
              <span style={s.checkDot} />
              <span style={s.checkLabel}>{label}</span>
              <code style={s.inlineCode}>{cmd}</code>
            </div>
          ))}
        </div>
        <p style={{ ...s.p, marginTop: 12 }}>Playwright will install Chromium automatically on first run.</p>
      </div>
    ),
  },
  {
    id: 'clone',
    title: 'Clone & install',
    content: (
      <div style={s.bodyInner}>
        <CodeBlock lang="bash" code={`git clone https://github.com/your-org/maid402.git
cd maid402
pnpm install
pnpm playwright install chromium`} />
        <p style={s.p}>Then install the web UI dependencies:</p>
        <CodeBlock lang="bash" code={`cd web && pnpm install && cd ..`} />
      </div>
    ),
  },
  {
    id: 'env',
    title: 'Configure .env',
    content: (
      <div style={s.bodyInner}>
        <p style={s.p}>Copy the example and fill in each section:</p>
        <CodeBlock lang="bash" code={`cp .env.example .env`} />
        <div style={s.envTable}>
          <div style={s.envSection}>Telegram</div>
          <EnvRow k="TELEGRAM_BOT_TOKEN" desc="From @BotFather — /newbot" secret />
          <div style={s.envSection}>Groq (LLM)</div>
          <EnvRow k="GROQ_API_KEY" desc="console.groq.com → API keys" secret />
          <div style={s.envSection}>Zepto</div>
          <EnvRow k="ZEPTO_PHONE" desc="Indian mobile number (without +91)" />
          <div style={s.envSection}>Base Sepolia / x402</div>
          <EnvRow k="OPERATOR_PRIVATE_KEY" desc="Wallet that signs EIP-3009 payments (payer)" secret />
          <EnvRow k="OPERATOR_WALLET" desc="Treasury address that receives USDC (different from payer)" />
          <EnvRow k="SEPOLIA_RPC_URL" desc="Ethereum Sepolia RPC (getblock.io or Alchemy)" />
          <div style={s.envSection}>NEAR Protocol</div>
          <EnvRow k="NEAR_ACCOUNT_ID" desc="e.g. yourname.testnet" />
          <EnvRow k="NEAR_PRIVATE_KEY" desc="ed25519 key from near-cli" secret />
          <EnvRow k="NEAR_CONTRACT_ID" desc="Same as NEAR_ACCOUNT_ID (contract is deployed there)" />
          <div style={s.envSection}>Storacha</div>
          <EnvRow k="STORACHA_EMAIL" desc="Email used to log in to console.storacha.network" />
          <EnvRow k="STORACHA_SPACE_DID" desc="Run pnpm setup:storacha to generate" />
          <div style={s.envSection}>Filecoin (optional)</div>
          <EnvRow k="FILECOIN_PRIVATE_KEY" desc="Same key as OPERATOR_PRIVATE_KEY (0x-prefixed)" secret />
          <EnvRow k="FILECOIN_RPC_URL" desc="e.g. https://filecoin-calibration.lava.build" />
          <div style={s.envSection}>Impulse AI</div>
          <EnvRow k="IMPULSE_API_KEY" desc="From impulselabs.ai dashboard" secret />
          <EnvRow k="IMPULSE_DEPLOYMENT_ID" desc="Deployment ID of your XGBoost model" />
        </div>
      </div>
    ),
  },
  {
    id: 'wallets',
    title: 'Fund wallets (Base Sepolia)',
    badge: 'testnet',
    badgeColor: '#2563eb',
    content: (
      <div style={s.bodyInner}>
        <p style={s.p}>You need two separate wallets on Base Sepolia:</p>
        <div style={s.twoCol}>
          <div style={s.walletCard}>
            <div style={s.walletLabel}>Payer wallet</div>
            <div style={s.walletDesc}><code style={s.inlineCode}>OPERATOR_PRIVATE_KEY</code></div>
            <ul style={s.ul}>
              <li>ETH for gas (Base Sepolia)</li>
              <li>USDC (1 USDC per order)</li>
            </ul>
          </div>
          <div style={s.walletCard}>
            <div style={s.walletLabel}>Treasury wallet</div>
            <div style={s.walletDesc}><code style={s.inlineCode}>OPERATOR_WALLET</code></div>
            <ul style={s.ul}>
              <li>Receives the 1 USDC fee</li>
              <li>No ETH needed</li>
            </ul>
          </div>
        </div>
        <div style={s.linkList}>
          <a style={s.extLink} href="https://www.alchemy.com/faucets/base-sepolia" target="_blank" rel="noopener noreferrer">→ Alchemy Base Sepolia faucet (ETH)</a>
          <a style={s.extLink} href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer">→ Circle USDC faucet (testnet USDC)</a>
          <a style={s.extLink} href="https://sepolia.basescan.org" target="_blank" rel="noopener noreferrer">→ BaseScan Sepolia explorer</a>
        </div>
      </div>
    ),
  },
  {
    id: 'near',
    title: 'Deploy NEAR spend-cap contract',
    badge: 'NEAR',
    badgeColor: '#00c27c',
    content: (
      <div style={s.bodyInner}>
        <p style={s.p}>Create a testnet account and deploy the contract:</p>
        <CodeBlock lang="bash" code={`# Install near-cli if you don't have it
npm i -g near-cli

# Create a testnet account (browser will open)
near create-account yourname.testnet --useFaucet

# Export the key to .env
near keys yourname.testnet`} />
        <p style={s.p}>Then deploy the spend-cap contract:</p>
        <CodeBlock lang="bash" code={`pnpm deploy:near`} />
        <p style={{ ...s.p, color: '#6b7280' }}>This compiles the AssemblyScript contract and deploys to your testnet account. The weekly budget defaults to ₹500 / category.</p>
      </div>
    ),
  },
  {
    id: 'storacha',
    title: 'Set up Storacha memory',
    badge: 'w3up',
    badgeColor: '#7c3aed',
    content: (
      <div style={s.bodyInner}>
        <p style={s.p}>Storacha stores the agent's preference profile and order history on IPFS.</p>
        <CodeBlock lang="bash" code={`pnpm setup:storacha`} />
        <p style={s.p}>This will:</p>
        <div style={s.checkList}>
          {[
            'Open a browser login at console.storacha.network',
            'Send a verification email — click the link',
            'Select the free plan when prompted',
            'Create a space called "Maid402-agent-memory"',
            'Print your STORACHA_SPACE_DID — copy it to .env',
          ].map((t, i) => (
            <div key={i} style={s.checkRow}>
              <span style={{ ...s.checkDot, background: '#7c3aed' }} />
              <span style={s.checkLabel}>{t}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'zepto',
    title: 'Log in to Zepto',
    badge: 'browser',
    badgeColor: '#ff5b2e',
    content: (
      <div style={s.bodyInner}>
        <p style={s.p}>The agent uses Playwright to automate Zepto. On first run it will open a browser and ask for an OTP:</p>
        <div style={s.stepFlow}>
          {[
            ['1', 'Run the agent', 'pnpm dev'],
            ['2', 'Zepto opens in browser and sends OTP to your phone', ''],
            ['3', 'Submit the OTP via Telegram or the web UI', '/otp 123456'],
            ['4', 'Session is saved for future runs', ''],
          ].map(([num, label, cmd]) => (
            <div key={num} style={s.flowRow}>
              <div style={s.flowNum}>{num}</div>
              <div style={s.flowLabel}>{label}</div>
              {cmd && <code style={s.inlineCode}>{cmd}</code>}
            </div>
          ))}
        </div>
        <p style={{ ...s.p, color: '#6b7280', marginTop: 8 }}>Make sure <code style={s.inlineCode}>ZEPTO_PHONE</code> is set to your registered number (without +91).</p>
      </div>
    ),
  },
  {
    id: 'run',
    title: 'Start the agent',
    content: (
      <div style={s.bodyInner}>
        <p style={s.p}>Run both the agent and the web UI in separate terminals:</p>
        <div style={s.terminalGrid}>
          <div>
            <div style={s.termLabel}>Terminal 1 — Agent + API</div>
            <CodeBlock lang="bash" code={`pnpm dev`} />
          </div>
          <div>
            <div style={s.termLabel}>Terminal 2 — Web UI</div>
            <CodeBlock lang="bash" code={`pnpm dev:web`} />
          </div>
        </div>
        <p style={s.p}>Then open <a style={s.inlineLink} href="http://localhost:3000" target="_blank" rel="noopener noreferrer">localhost:3000</a> in your browser.</p>
        <div style={s.infoBox}>
          <span style={s.infoIcon}>ℹ</span>
          <span>The agent runs on port <code style={s.inlineCode}>3004</code> · Web UI on <code style={s.inlineCode}>3000</code></span>
        </div>
      </div>
    ),
  },
  {
    id: 'test',
    title: 'Try it out',
    content: (
      <div style={s.bodyInner}>
        <p style={s.p}>Send any of these to the web UI or your Telegram bot:</p>
        <div style={s.tryList}>
          {[
            { cmd: 'order me Amul milk 1L',         what: 'Full autonomous order flow' },
            { cmd: '/search hocco ice cream',        what: 'Search without ordering' },
            { cmd: '/budget',                        what: 'Check NEAR spend cap' },
            { cmd: 'find me atta 1kg from zepto',    what: 'Natural language search' },
          ].map(({ cmd, what }) => (
            <div key={cmd} style={s.tryRow}>
              <code style={s.tryCmd}>{cmd}</code>
              <span style={s.tryWhat}>{what}</span>
            </div>
          ))}
        </div>
        <p style={{ ...s.p, marginTop: 16 }}>Or call the x402-gated API directly:</p>
        <CodeBlock lang="bash" code={`curl -X POST http://localhost:3004/api/order \\
  -H "Content-Type: application/json" \\
  -d '{"item": "Amul milk 1L"}'
# → 402 Payment Required (1 USDC · Base Sepolia)
# Retry with X-PAYMENT header after signing EIP-3009`} />
      </div>
    ),
  },
]

// ── Page ──────────────────────────────────────────────────────────────

export default function SetupPage() {
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const toggle = (id: string) => setChecked(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const progress = Math.round((checked.size / STEPS.length) * 100)

  return (
    <div style={s.page}>
      {/* ── Header ── */}
      <header style={s.header}>
        <Link href="/" style={s.backLink}>← Back to agent</Link>
        <div style={s.headerCenter}>
          <span style={s.logoEmoji}>🏠</span>
          <span style={s.logoText}>Maid402</span>
          <span style={s.headerSep}>/</span>
          <span style={s.headerTitle}>Setup Guide</span>
        </div>
        <div style={s.progressPill}>
          <div style={{ ...s.progressBar, width: `${progress}%` }} />
          <span style={s.progressText}>{progress}%</span>
        </div>
      </header>

      <main style={s.main}>
        {/* ── Hero ── */}
        <div style={s.hero}>
          <h1 style={s.h1}>Run Maid402 locally</h1>
          <p style={s.heroSub}>
            Autonomous home commerce agent · Zepto × x402 × NEAR × Storacha × Filecoin
          </p>
          <div style={s.stackRow}>
            {STACK.map(t => (
              <div key={t.label} style={{ ...s.stackBadge, borderColor: t.color + '40', background: t.color + '12' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                <span style={{ color: t.color, fontSize: 10.5, fontWeight: 600 }}>{t.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Steps ── */}
        <div style={s.steps}>
          {STEPS.map((step, i) => (
            <StepItem
              key={step.id}
              step={step}
              idx={i}
              checked={checked.has(step.id)}
              onCheck={() => toggle(step.id)}
            />
          ))}
        </div>

        {/* ── Footer ── */}
        <div style={s.footer}>
          <span style={s.footerText}>Built for the Vibe Coding Hackathon 2025</span>
          <div style={s.footerLinks}>
            <a style={s.footerLink} href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a>
            <span style={s.footerDot}>·</span>
            <a style={s.footerLink} href="https://x402.org" target="_blank" rel="noopener noreferrer">x402</a>
            <span style={s.footerDot}>·</span>
            <a style={s.footerLink} href="https://zepto.com" target="_blank" rel="noopener noreferrer">Zepto</a>
          </div>
        </div>
      </main>
    </div>
  )
}

