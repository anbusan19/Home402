'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'

// ── Duna palette ──────────────────────────────────────────────────────

const P = {
  cream:    '#faf6ef',
  sand:     '#f0eadf',
  peach:    '#e0a880',
  coral:    '#d4855a',
  pink:     '#c88aa8',
  lavender: '#9a6db8',
  purple:   '#7a5a9a',
  sage:     '#5a8a5a',
  olive:    '#4a7a4a',
  teal:     '#4a9a92',
  gold:     '#c49050',
  amber:    '#a87838',
  sky:      '#6aaccc',
  ink:      '#1a1815',
  muted:    '#5a4a3a',
  subtle:   '#8a7a68',
  border:   '#ddd5c8',
}

// ── Data ──────────────────────────────────────────────────────────────

const STATS = [
  { value: '10.4×', label: 'Faster than manual ordering',   color: P.peach },
  { value: '94%',   label: 'Order success rate',            color: P.lavender },
  { value: '3.2×',  label: 'Savings vs. store visits',      color: P.sage },
]

const FEATURES = [
  {
    tag: 'Voice-to-Cart',
    accent: P.peach,
    headline: 'Just say what you need — Maid402 handles the rest',
    description:
      'No more browsing through long product lists. Describe what you want in plain language and your autonomous home agent finds, compares, and orders it instantly.',
    bullets: ['Natural language understanding', 'Multi-store price comparison', 'One-tap confirm or auto-order'],
    demo: [
      { label: 'You', text: 'Order me Amul butter 500g and Hocco ice cream' },
      { label: 'Maid402', text: '✓ Found Amul butter 500g at ₹260 (BigBasket)\n✓ Found Hocco Ice Cream ×2 at ₹180 (Swiggy Instamart)\nTotal: ₹440 — ordering now via x402 payment…' },
      { label: 'Maid402', text: '🛒 Both items ordered! Delivery in ~25 min.' },
    ],
  },
  {
    tag: 'x402 Payments',
    accent: P.lavender,
    headline: 'Machine-to-machine payments, fully automated',
    description:
      'Powered by the x402 protocol — your agent can pay for orders directly on Base Sepolia using USDC. No login, no saved card, no friction.',
    bullets: ['1 USDC per order on Base Sepolia', 'No wallet pop-ups or approvals', 'Public paid API — integrate anywhere'],
    demo: [
      { label: 'HTTP', text: 'POST /api/order  →  402 Payment Required' },
      { label: 'Agent', text: 'Signing X-PAYMENT header with USDC on Base…' },
      { label: 'HTTP', text: '200 OK — {"status":"ordered","eta":"22 min"}' },
    ],
  },
  {
    tag: 'Budget Aware',
    accent: P.sage,
    headline: 'Your agent tracks spending so you don\'t have to',
    description:
      'Set a weekly or monthly budget. Maid402 monitors every purchase and alerts you before you go over — or just blocks the order automatically.',
    bullets: ['Weekly / monthly limits', 'Per-category budgets', 'Instant alerts when approaching limit'],
    demo: [
      { label: 'You', text: "What's my budget left this week?" },
      { label: 'Maid402', text: '📊 Weekly budget: ₹2,000\nSpent so far: ₹1,340 (6 orders)\nRemaining: ₹660 — you\'re on track!' },
    ],
  },
  {
    tag: 'Open API',
    accent: P.teal,
    headline: 'Build on top of Maid402 with our public API',
    description:
      'The ordering layer is exposed as a paid REST API. Perfect for developers building household automation tools, smart home integrations, or budget dashboards.',
    bullets: ['REST API with SSE streaming', 'x402 micro-payment per call', 'No API key required'],
    demo: [
      { label: 'curl', text: 'curl -X POST https://maid402.app/api/order \\\n  -d \'{"item":"Amul milk 1L"}\'' },
      { label: 'Response', text: '{"status":"ordered","total":"1 USDC","eta":"20 min"}' },
    ],
  },
]

const SPONSORS = [
  { name: 'Filecoin',  src: '/filecoin-logo.svg',     w: 116, h: 32 },
  { name: 'Groq',      src: '/groq-logo.svg',         w: 92,  h: 32 },
  { name: 'Base',      src: '/base-logo.svg',          w: 92,  h: 32 },
  { name: 'NEAR',      src: '/near-logo (1).svg',      w: 104, h: 32 },
  { name: 'Storacha',  src: '/storacha-logo.svg',      w: 116, h: 32 },
  { name: 'Impulse',   src: '/impulse-logo.png',       w: 106, h: 32 },
]

const SETUP_STEPS = [
  {
    id: 'clone',
    num: '01',
    title: 'Clone & install',
    accent: P.peach,
    content: [
      { type: 'text', value: 'Clone the repo and install dependencies with pnpm.' },
      { type: 'code', value: `git clone https://github.com/your-org/maid402.git\ncd maid402\npnpm install\npnpm playwright install chromium\n\n# Web UI dependencies\ncd web && pnpm install && cd ..` },
    ],
  },
  {
    id: 'env',
    num: '02',
    title: 'Configure .env',
    accent: P.lavender,
    content: [
      { type: 'text', value: 'Copy the example file and fill in each section. Every key is explained inline.' },
      { type: 'code', value: 'cp .env.example .env' },
      { type: 'envlist', value: [
        { k: 'TELEGRAM_BOT_TOKEN',   desc: 'From @BotFather — /newbot' },
        { k: 'GROQ_API_KEY',         desc: 'console.groq.com → API Keys' },
        { k: 'ZEPTO_PHONE',          desc: 'Indian mobile number (without +91)' },
        { k: 'OPERATOR_PRIVATE_KEY', desc: 'Wallet that signs x402 payments (payer)' },
        { k: 'OPERATOR_WALLET',      desc: 'Treasury address that receives USDC (different from payer)' },
        { k: 'NEAR_ACCOUNT_ID',      desc: 'e.g. yourname.testnet' },
        { k: 'STORACHA_SPACE_DID',   desc: 'Run pnpm setup:storacha to generate' },
      ]},
    ],
  },
  {
    id: 'wallets',
    num: '03',
    title: 'Fund wallets on Base Sepolia',
    accent: P.teal,
    content: [
      { type: 'text', value: 'You need two separate wallets. The payer wallet signs orders; the treasury wallet receives the 1 USDC fee.' },
      { type: 'wallets', value: [
        { label: 'Payer wallet (OPERATOR_PRIVATE_KEY)', items: ['ETH for gas', '1+ USDC per order'] },
        { label: 'Treasury wallet (OPERATOR_WALLET)',   items: ['Receives USDC fees', 'No ETH needed'] },
      ]},
      { type: 'links', value: [
        { label: 'Alchemy Base Sepolia faucet (ETH)',  href: 'https://www.alchemy.com/faucets/base-sepolia' },
        { label: 'Circle faucet (testnet USDC)',       href: 'https://faucet.circle.com' },
      ]},
    ],
  },
  {
    id: 'near',
    num: '04',
    title: 'Deploy NEAR spend-cap contract',
    accent: P.sage,
    content: [
      { type: 'text', value: 'Create a testnet account and deploy the AssemblyScript contract that enforces your weekly budget on-chain.' },
      { type: 'code', value: `# Install near-cli if needed\nnpm i -g near-cli\n\n# Create testnet account (opens browser)\nnear create-account yourname.testnet --useFaucet\n\n# Deploy contract\npnpm deploy:near` },
    ],
  },
  {
    id: 'storacha',
    num: '05',
    title: 'Set up Storacha memory',
    accent: P.pink,
    content: [
      { type: 'text', value: 'Storacha stores your agent\'s preference profile and order history on IPFS.' },
      { type: 'code', value: 'pnpm setup:storacha' },
      { type: 'checklist', value: [
        'Opens browser login at console.storacha.network',
        'Click the email verification link',
        'Select the free plan when prompted',
        'Copy the printed STORACHA_SPACE_DID into .env',
      ]},
    ],
  },
  {
    id: 'sessions',
    num: '06',
    title: 'Capture platform sessions',
    accent: P.coral,
    content: [
      { type: 'text', value: 'Run the session capture script once. It opens a visible browser window for each platform so you can log in manually — cookies are saved to browser/sessions/ and reused on every future run.' },
      { type: 'code', value: 'pnpm sessions:capture' },
      { type: 'flow', value: [
        ['Script prompts: "Capture zepto session? (y/n)"', ''],
        ['Browser opens Zepto — log in with your phone + OTP', ''],
        ['Press Enter in the terminal when done',              ''],
        ['Repeat for Blinkit and Amazon if desired',           ''],
        ['Sessions saved to browser/sessions/*.json',          ''],
      ] as readonly (readonly string[])[] },
      { type: 'text', value: 'Once captured, the agent skips the login step entirely and goes straight to ordering.' },
    ],
  },
  {
    id: 'zepto',
    num: '07',
    title: 'Log in to Zepto (OTP fallback)',
    accent: P.amber,
    content: [
      { type: 'text', value: 'If you skipped session capture, the agent will trigger an OTP login on first run. You can also submit the OTP at any time via Telegram or the web UI.' },
      { type: 'flow', value: [
        ['Run the agent',                              'pnpm dev'],
        ['Zepto opens and sends OTP to your phone',   ''],
        ['Submit OTP via Telegram or the web UI',     '/otp 123456'],
        ['Session is saved — no OTP needed next time',''],
      ]},
    ],
  },
  {
    id: 'run',
    num: '08',
    title: 'Start everything',
    accent: P.gold,
    content: [
      { type: 'text', value: 'Run the agent and the web UI in two separate terminals.' },
      { type: 'twoterm', value: [
        { label: 'Terminal 1 — Agent + API server', code: 'pnpm dev' },
        { label: 'Terminal 2 — Web UI',             code: 'pnpm dev:web' },
      ]},
      { type: 'text', value: 'Then open localhost:3000 in your browser.' },
    ],
  },
  {
    id: 'try',
    num: '09',
    title: 'Try it out',
    accent: P.lavender,
    content: [
      { type: 'text', value: 'Send any of these to the web UI or your Telegram bot:' },
      { type: 'trylist', value: [
        { cmd: 'order me Amul milk 1L',       what: 'Full autonomous order flow' },
        { cmd: '/search hocco ice cream',     what: 'Search without ordering' },
        { cmd: '/budget',                     what: 'Check NEAR spend cap' },
        { cmd: 'find me atta 1kg',            what: 'Natural language search' },
      ]},
      { type: 'code', value: `# Or call the paid API directly:\ncurl -X POST http://localhost:3003/api/order \\\n  -H "Content-Type: application/json" \\\n  -d '{"item": "Amul milk 1L"}'\n# → 402 Payment Required (1 USDC · Base Sepolia)` },
    ],
  },
] as const

// ── Setup step accordion ──────────────────────────────────────────────

type SetupContentItem =
  | { type: 'text';     value: string }
  | { type: 'code';     value: string }
  | { type: 'envlist';  value: readonly { k: string; desc: string }[] }
  | { type: 'wallets';  value: readonly { label: string; items: string[] }[] }
  | { type: 'links';    value: readonly { label: string; href: string }[] }
  | { type: 'checklist';value: readonly string[] }
  | { type: 'flow';     value: readonly (readonly string[])[] }
  | { type: 'twoterm';  value: readonly { label: string; code: string }[] }
  | { type: 'trylist';  value: readonly { cmd: string; what: string }[] }

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }, [text])
  return (
    <button onClick={copy} style={{
      position:     'absolute',
      top:          10,
      right:        10,
      background:   'rgba(255,255,255,0.08)',
      border:       '1px solid rgba(255,255,255,0.12)',
      borderRadius: 6,
      color:        copied ? P.sage : 'rgba(255,255,255,0.4)',
      fontSize:     10.5,
      padding:      '3px 8px',
      cursor:       'pointer',
      fontFamily:   '"Geist Mono", monospace',
      transition:   'color 0.2s',
    }}>
      {copied ? '✓ copied' : 'copy'}
    </button>
  )
}

function SetupContentBlock({ item, accent }: { item: SetupContentItem; accent: string }) {
  if (item.type === 'text') {
    return <p style={{ fontSize: 14, color: P.muted, lineHeight: 1.7, margin: '0 0 14px' }}>{item.value}</p>
  }

  if (item.type === 'code') {
    return (
      <div style={{ position: 'relative', background: P.ink, borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
        <CopyButton text={item.value} />
        <pre style={{ margin: 0, padding: '16px 52px 16px 18px', fontSize: 12, fontFamily: '"Geist Mono", monospace', color: '#e0d8cc', lineHeight: 1.8, overflowX: 'auto', whiteSpace: 'pre' as const }}>{item.value}</pre>
      </div>
    )
  }

  if (item.type === 'envlist') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 14 }}>
        {item.value.map(({ k, desc }) => (
          <div key={k} style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '6px 12px', background: P.sand, border: `1px solid ${P.border}`, borderRadius: 7 }}>
            <code style={{ fontFamily: '"Geist Mono", monospace', fontSize: 11, color: P.purple, flexShrink: 0, minWidth: 200 }}>{k}</code>
            <span style={{ fontSize: 12.5, color: P.subtle }}>{desc}</span>
          </div>
        ))}
      </div>
    )
  }

  if (item.type === 'wallets') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        {item.value.map(({ label, items }) => (
          <div key={label} style={{ background: P.sand, border: `1px solid ${P.border}`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: P.ink, marginBottom: 8 }}>{label}</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {items.map(item => (
                <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: P.muted }}>
                  <span style={{ color: accent }}>→</span> {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    )
  }

  if (item.type === 'links') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
        {item.value.map(({ label, href }) => (
          <a key={href} href={href} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 13.5, color: accent, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>↗</span> {label}
          </a>
        ))}
      </div>
    )
  }

  if (item.type === 'checklist') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
        {item.value.map((text, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 18, height: 18, borderRadius: '50%', background: `${accent}20`, border: `1px solid ${accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: accent, flexShrink: 0 }}>{i + 1}</span>
            <span style={{ fontSize: 13.5, color: P.muted }}>{text}</span>
          </div>
        ))}
      </div>
    )
  }

  if (item.type === 'flow') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {item.value.map(([label, cmd], i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: P.sand, border: `1px solid ${P.border}`, borderRadius: 8 }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: `${accent}20`, border: `1px solid ${accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: accent, flexShrink: 0, fontFamily: '"Geist Mono", monospace' }}>{i + 1}</span>
            <span style={{ fontSize: 13, color: P.muted, flex: 1 }}>{label}</span>
            {cmd && <code style={{ fontFamily: '"Geist Mono", monospace', fontSize: 11.5, color: P.purple, background: `${P.purple}12`, padding: '2px 8px', borderRadius: 5, border: `1px solid ${P.purple}25` }}>{cmd}</code>}
          </div>
        ))}
      </div>
    )
  }

  if (item.type === 'twoterm') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        {item.value.map(({ label, code }) => (
          <div key={label}>
            <div style={{ fontSize: 11, color: P.subtle, marginBottom: 6, fontFamily: '"Geist Mono", monospace', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>{label}</div>
            <div style={{ position: 'relative', background: P.ink, borderRadius: 8, overflow: 'hidden' }}>
              <CopyButton text={code} />
              <pre style={{ margin: 0, padding: '12px 44px 12px 14px', fontSize: 12, fontFamily: '"Geist Mono", monospace', color: '#e0d8cc', lineHeight: 1.7, whiteSpace: 'pre' as const }}>{code}</pre>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (item.type === 'trylist') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
        {item.value.map(({ cmd, what }) => (
          <div key={cmd} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '7px 12px', background: P.sand, border: `1px solid ${P.border}`, borderRadius: 7 }}>
            <code style={{ fontFamily: '"Geist Mono", monospace', fontSize: 12, color: P.purple, flexShrink: 0 }}>{cmd}</code>
            <span style={{ fontSize: 12.5, color: P.subtle }}>— {what}</span>
          </div>
        ))}
      </div>
    )
  }

  return null
}

function SetupStep({ step, checked, onCheck }: {
  step:    typeof SETUP_STEPS[number]
  checked: boolean
  onCheck: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{
      border:       `1px solid ${checked ? step.accent + '50' : P.border}`,
      borderRadius: 14,
      overflow:     'hidden',
      transition:   'border-color 0.25s',
      background:   P.cream,
    }} className="landing-card">
      {/* Header */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', cursor: 'pointer', userSelect: 'none' as const }}
      >
        {/* Checkbox */}
        <button
          onClick={e => { e.stopPropagation(); onCheck() }}
          style={{
            width:          22,
            height:         22,
            borderRadius:   7,
            border:         `1.5px solid ${checked ? step.accent : P.border}`,
            background:     checked ? step.accent : 'transparent',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            cursor:         'pointer',
            flexShrink:     0,
            transition:     'all 0.2s',
          }}
        >
          {checked && <span style={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>✓</span>}
        </button>

        {/* Step number */}
        <span style={{ fontFamily: '"Geist Mono", monospace', fontSize: 11, color: step.accent, fontWeight: 400, letterSpacing: '0.08em', textTransform: 'uppercase' as const, flexShrink: 0 }}>{step.num}</span>

        {/* Title */}
        <span style={{ fontSize: 15, fontWeight: 500, color: checked ? P.subtle : P.ink, flex: 1, textDecoration: checked ? 'line-through' : 'none', transition: 'color 0.2s' }}>
          {step.title}
        </span>

        {/* Chevron */}
        <span style={{ color: P.subtle, fontSize: 14, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none', display: 'inline-block' }}>▾</span>
      </div>

      {/* Body */}
      {open && (
        <div style={{ padding: '4px 20px 20px', borderTop: `1px solid ${P.border}` }}>
          <div style={{ paddingTop: 16 }}>
            {(step.content as readonly SetupContentItem[]).map((item, i) => (
              <SetupContentBlock key={i} item={item} accent={step.accent} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Scroll-reveal hook ────────────────────────────────────────────────

function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('visible'); obs.unobserve(el) } },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

function Reveal({ className = 'reveal', delay = 0, children, style }: {
  className?: string; delay?: number; children: React.ReactNode; style?: React.CSSProperties
}) {
  const ref = useReveal()
  return (
    <div ref={ref} className={className} style={{ transitionDelay: `${delay}s`, ...style }}>
      {children}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────

export default function LandingPage() {
  const [scrollY, setScrollY]           = useState(0)
  const [checkedSetup, setCheckedSetup] = useState<Set<string>>(new Set())

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div style={{ background: P.cream, color: P.ink, fontFamily: "'Manrope', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif", minHeight: '100vh' }}>

      {/* ── NAV ── */}
      <nav style={{
        position:        'fixed',
        top:             0,
        left:            0,
        right:           0,
        zIndex:          100,
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'space-between',
        padding:         '0 40px',
        height:          56,
        background:      scrollY > 20 ? 'rgba(250,246,239,0.92)' : 'rgba(250,246,239,0)',
        backdropFilter:  scrollY > 20 ? 'blur(12px)' : 'none',
        borderBottom:    scrollY > 20 ? `1px solid ${P.border}` : '1px solid transparent',
        transition:      'background 0.4s, border-color 0.4s, backdrop-filter 0.4s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Image src="/maid402-logo.png" alt="Maid402" width={28} height={28} style={{ borderRadius: 6 }} />
          <span style={{ fontWeight: 500, fontSize: 14, letterSpacing: '0.04em', color: P.ink }}>Maid402</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 32, fontSize: 13, color: P.muted }}>
          {['Features', 'Pricing', 'API', 'Setup'].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`} className="landing-link"
              style={{ textDecoration: 'none', color: 'inherit' }}>
              {item}
            </a>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/agent" style={{
            background:     'transparent',
            border:         `1px solid ${P.border}`,
            borderRadius:   20,
            padding:        '7px 18px',
            color:          '#5a4a3a',
            fontSize:       13,
            fontWeight:     400,
            cursor:         'pointer',
            textDecoration: 'none',
            transition:     'border-color 0.25s, background 0.25s, transform 0.25s',
          }}>Open App</Link>
          <a href="#signup" style={{
            background:     P.ink,
            border:         'none',
            borderRadius:   20,
            padding:        '7px 18px',
            color:          P.cream,
            fontSize:       13,
            fontWeight:     500,
            cursor:         'pointer',
            textDecoration: 'none',
            transition:     'background 0.25s, transform 0.25s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#2a2825'; e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.currentTarget.style.background = P.ink; e.currentTarget.style.transform = 'translateY(0)' }}>
            Get Started
          </a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        position:       'relative',
        minHeight:      '92vh',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        textAlign:      'center',
        overflow:       'hidden',
        paddingTop:     80,
      }}>
        {/* Hero backdrop image */}
        <div style={{
          position:   'absolute',
          inset:      0,
          backgroundImage: 'url(/hero-landscape.png)',
          backgroundSize:   'cover',
          backgroundPosition: 'center 30%',
          opacity:    0.55,
          transform:  `translateY(${scrollY * 0.25}px)`,
          transition: 'transform 0.1s linear',
        }} />
        {/* Gradient overlay */}
        <div style={{
          position:   'absolute',
          inset:      0,
          background: `linear-gradient(to bottom, rgba(250,246,239,0.2) 0%, rgba(250,246,239,0.1) 40%, rgba(250,246,239,0.85) 90%, ${P.cream} 100%)`,
        }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 740, padding: '0 24px' }}>
          <div style={{
            display:      'inline-flex',
            alignItems:   'center',
            gap:          7,
            background:   'rgba(250,246,239,0.85)',
            border:       `1px solid ${P.border}`,
            borderRadius: 20,
            padding:      '5px 14px',
            marginBottom: 28,
            backdropFilter: 'blur(8px)',
            animation:    'fadeInDown 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s both',
          }}>
            <span style={{ fontSize: 10, background: P.ink, color: P.cream, borderRadius: 4, padding: '2px 8px', fontWeight: 400, letterSpacing: '0.1em', fontFamily: '"Geist Mono", monospace', textTransform: 'uppercase' as const }}>x402</span>
            <span style={{ fontSize: 12, color: P.muted, fontWeight: 400 }}>Powered by machine-to-machine payments</span>
          </div>

          <h1 style={{
            fontSize:      'clamp(36px, 6vw, 72px)',
            fontWeight:    500,
            lineHeight:    1.1,
            letterSpacing: '-0.02em',
            color:         P.ink,
            marginBottom:  20,
            animation:     'fadeInUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.4s both',
          }}>
            The new standard in<br />
            <span style={{ color: P.coral }}>home ordering</span>
          </h1>

          <p style={{
            fontSize:     'clamp(16px, 2vw, 20px)',
            color:        P.muted,
            lineHeight:   1.65,
            maxWidth:     520,
            margin:       '0 auto 36px',
            animation:    'fadeInUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.6s both',
          }}>
            Your autonomous home agent that orders groceries, tracks your budget, and pays for itself — all through natural conversation.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', animation: 'fadeInUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.8s both' }}>
            <Link href="/agent" style={ctaBtn}>
              Try Maid402 →
            </Link>
            <a href="#features" style={outlineBtn}>See how it works</a>
          </div>

          {/* Sponsor logos strip */}
          <div style={{
            marginTop: 48,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
            animation: 'fadeInUp 0.9s cubic-bezier(0.16,1,0.3,1) 1s both',
          }}>
            <span style={{ fontSize: 10, color: P.subtle, letterSpacing: '0.12em', textTransform: 'uppercase' as const, fontFamily: '"Geist Mono", monospace', fontWeight: 400 }}>Powered by</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'nowrap', justifyContent: 'center' }}>
              {SPONSORS.map(s => (
                <div key={s.name} style={{ width: 132, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.75, transition: 'opacity 0.25s ease' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.opacity = '1' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.opacity = '0.75' }}>
                  <Image src={s.src} alt={s.name} width={s.w} height={s.h} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Mini chat preview */}
          <div style={{
            marginTop:    52,
            background:   'rgba(250,246,239,0.88)',
            border:       `1px solid ${P.border}`,
            borderRadius: 20,
            padding:      '18px 22px',
            maxWidth:     480,
            textAlign:    'left' as const,
            backdropFilter: 'blur(12px)',
            boxShadow:    '0 4px 24px rgba(0,0,0,0.06)',
            margin:       '52px auto 0',
            animation:    'scaleIn 0.8s cubic-bezier(0.16,1,0.3,1) 1s both',
          }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ ...avatarStyle }} />
              <div style={agentBubbleStyle}>Order me Amul butter and 2L milk for tomorrow morning.</div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ ...avatarStyle, background: P.ink, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 400, letterSpacing: '0.06em' }}>M</div>
              <div style={agentBubbleStyle}>
                ✓ Amul Butter 500g — ₹265 (BigBasket)<br />
                ✓ Amul Milk 2L — ₹108 (Swiggy Instamart)<br />
                <span style={{ color: P.ink, fontWeight: 500 }}>Ordering now via 1 USDC payment…</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ padding: '64px 40px', maxWidth: 1000, margin: '0 auto' }}>
        <Reveal>
          <p style={{ fontSize: 11, color: P.subtle, textAlign: 'center', marginBottom: 40, letterSpacing: '0.1em', textTransform: 'uppercase' as const, fontFamily: '"Geist Mono", monospace', fontWeight: 400 }}>
            Designed for modern households
          </p>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {STATS.map((stat, i) => (
            <Reveal key={stat.value} delay={i * 0.12}>
              <div style={statCard} className="landing-card">
                <div style={{ width: 40, height: 4, borderRadius: 2, background: stat.color, marginBottom: 18, transition: 'width 0.4s ease' }} />
                <div style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 500, letterSpacing: '-0.02em', color: P.ink, marginBottom: 6 }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 14, color: P.muted, lineHeight: 1.5 }}>{stat.label}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section style={{
        position:       'relative',
        overflow:       'hidden',
        margin:         0,
        minHeight:      280,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        textAlign:      'center',
      }}>
        <div style={{
          position:            'absolute',
          inset:               0,
          backgroundImage:     'url(/cta-sky.png)',
          backgroundSize:      'cover',
          backgroundPosition:  'center',
          opacity:             0.7,
          transform:           `translateY(${(scrollY - 800) * 0.1}px)`,
          transition:          'transform 0.1s linear',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(to bottom, rgba(250,246,239,0.5), rgba(250,246,239,0.65))`,
        }} />
        <Reveal style={{ position: 'relative', zIndex: 1, padding: '60px 24px' }}>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 500, letterSpacing: '-0.02em', color: P.ink, marginBottom: 12 }}>
            A life less errand-filled
          </h2>
          <p style={{ fontSize: 16, color: P.muted, marginBottom: 28, maxWidth: 420, margin: '0 auto 28px' }}>
            Maid402 takes the grind out of home management so you can focus on what matters.
          </p>
          <Link href="/agent" style={ctaBtn}>Start Ordering Free →</Link>
        </Reveal>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ maxWidth: 1060, margin: '0 auto', padding: '80px 40px' }}>
        {FEATURES.map((feature, i) => (
          <div key={feature.tag} style={{
            display:       'grid',
            gridTemplateColumns: '1fr 1fr',
            gap:           56,
            alignItems:    'center',
            marginBottom:  80,
            direction:     i % 2 === 1 ? 'rtl' : 'ltr' as React.CSSProperties['direction'],
          }}>
            {/* Text side */}
            <Reveal className={i % 2 === 0 ? 'reveal-left' : 'reveal-right'} style={{ direction: 'ltr' }}>
              <span style={{ ...tagBadge, borderColor: `${feature.accent}40`, background: `${feature.accent}18`, color: feature.accent }}>{feature.tag}</span>
              <h2 style={{ fontSize: 'clamp(20px, 2.5vw, 30px)', fontWeight: 500, letterSpacing: '-0.02em', color: P.ink, marginBottom: 14, lineHeight: 1.3, marginTop: 12 }}>
                {feature.headline}
              </h2>
              <p style={{ fontSize: 15, color: P.muted, lineHeight: 1.7, marginBottom: 20 }}>
                {feature.description}
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {feature.bullets.map(b => (
                  <li key={b} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#4a3a2a' }}>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: `${feature.accent}20`, border: `1px solid ${feature.accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: feature.accent, flexShrink: 0, transition: 'transform 0.2s ease' }}>✓</span>
                    {b}
                  </li>
                ))}
              </ul>
            </Reveal>

            {/* Demo card */}
            <Reveal className={i % 2 === 0 ? 'reveal-right' : 'reveal-left'} delay={0.15} style={{ direction: 'ltr' }}>
              <div style={{ ...demoCard, borderColor: `${feature.accent}30` }} className="landing-card">
                <div style={{ borderBottom: `1px solid ${feature.accent}25`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, background: `${feature.accent}08` }}>
                  {[...Array(3)].map((_, di) => (
                    <div key={di} style={{ width: 8, height: 8, borderRadius: '50%', background: di === 0 ? P.coral : di === 1 ? P.gold : P.sage, opacity: 0.8, transition: 'transform 0.2s ease' }} />
                  ))}
                  <span style={{ fontSize: 10, color: feature.accent, marginLeft: 4, fontFamily: '"Geist Mono", monospace', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>{feature.tag}</span>
                </div>
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {feature.demo.map((line, di) => (
                    <div key={di} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 10, color: feature.accent, fontWeight: 400, fontFamily: '"Geist Mono", monospace', paddingTop: 2, flexShrink: 0, minWidth: 54, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>{line.label}</span>
                      <span style={{ fontSize: 12.5, color: '#3a2a1a', lineHeight: 1.6, fontFamily: '"Geist Mono", monospace', whiteSpace: 'pre-wrap' as const }}>{line.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        ))}
      </section>

      {/* ── API SECTION ── */}
      <section id="api" style={{ background: P.sand, padding: '72px 40px', borderTop: `1px solid ${P.border}`, borderBottom: `1px solid ${P.border}` }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 44 }}>
              <span style={{ ...tagBadge, borderColor: `${P.teal}40`, background: `${P.teal}18`, color: P.teal }}>For Developers</span>
              <h2 style={{ fontSize: 'clamp(22px, 3vw, 36px)', fontWeight: 500, letterSpacing: '-0.02em', color: P.ink, marginTop: 12, marginBottom: 12 }}>
                Integrate home ordering into anything
              </h2>
              <p style={{ fontSize: 15, color: P.muted, maxWidth: 480, margin: '0 auto' }}>
                Our public API is pay-per-use via x402. No API keys, no subscription — just call and pay in USDC.
              </p>
            </div>
          </Reveal>

          <Reveal className="reveal-scale" delay={0.15}>
            <div style={{ background: P.ink, borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
                {[...Array(3)].map((_, i) => (
                  <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: i === 0 ? P.coral : i === 1 ? P.gold : P.sage, opacity: 0.7, transition: 'opacity 0.2s ease' }} />
                ))}
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginLeft: 8, fontFamily: '"Geist Mono", monospace', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>Terminal</span>
              </div>
              <pre style={{ margin: 0, padding: '24px', fontSize: 12.5, lineHeight: 1.8, fontFamily: '"Geist Mono", monospace', color: '#e8e0d0', overflowX: 'auto' as const }}>
{`# Call the API — no key needed, just pay 1 USDC per order
curl -X POST https://maid402.app/api/order \\
  -H "Content-Type: application/json" \\
  -d '{"item": "Amul milk 1L"}'

# → 402 Payment Required (1 USDC on Base Sepolia)
# Retry with X-PAYMENT header after signing

# → 200 OK
# {"status":"ordered","item":"Amul milk 1L","eta":"22 min","txHash":"0xabc..."}`}
              </pre>
            </div>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 24 }}>
            {[
              { icon: '⚡', title: 'Instant', desc: 'No registration or API keys required', accent: P.peach },
              { icon: '💰', title: '1 USDC / call', desc: 'Pay only for what you use on Base Sepolia', accent: P.lavender },
              { icon: '🌊', title: 'SSE Streaming', desc: 'Real-time order status as it progresses', accent: P.teal },
            ].map((item, i) => (
              <Reveal key={item.title} delay={0.3 + i * 0.1}>
                <div style={{ background: P.cream, border: `1px solid ${P.border}`, borderRadius: 12, padding: '16px 18px' }} className="landing-card">
                  <div style={{ fontSize: 20, marginBottom: 8 }}>{item.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: P.ink, marginBottom: 4 }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: '#8a7a6a', lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ padding: '80px 40px', maxWidth: 860, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span style={{ ...tagBadge, borderColor: `${P.pink}40`, background: `${P.pink}18`, color: P.pink }}>Pricing</span>
            <h2 style={{ fontSize: 'clamp(22px, 3vw, 36px)', fontWeight: 500, letterSpacing: '-0.02em', color: P.ink, marginTop: 12, marginBottom: 10 }}>
              Simple, pay-as-you-go
            </h2>
            <p style={{ fontSize: 15, color: P.muted }}>No subscriptions. No hidden fees. Just pay for what you order.</p>
          </div>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {[
            {
              name: 'Personal',
              price: 'Free',
              sub: 'Chat interface only',
              features: ['Unlimited chat orders', 'Budget tracking', 'Order history', 'x402 payments (1 USDC/order)'],
              cta: 'Start Free',
              href: '/',
              highlight: false,
            },
            {
              name: 'API',
              price: '1 USDC',
              sub: 'per API call',
              features: ['Direct REST API access', 'SSE streaming responses', 'No API key required', 'Pay per order, not per month'],
              cta: 'Read API Docs',
              href: '#api',
              highlight: true,
            },
          ].map((plan, i) => (
            <Reveal key={plan.name} delay={i * 0.15}>
              <div style={{
                background:   plan.highlight ? P.ink : P.cream,
                border:       plan.highlight ? '1px solid #3a2a1a' : `1px solid ${P.border}`,
                borderRadius: 20,
                padding:      '32px 28px',
                position:     'relative' as const,
                overflow:     'hidden',
                transition:   'transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s ease',
              }} className="landing-card">
                {plan.highlight && (
                  <div style={{ position: 'absolute', top: 16, right: 16, background: P.ink, color: P.cream, fontSize: 9.5, fontWeight: 400, padding: '2px 10px', borderRadius: 20, letterSpacing: '0.1em', fontFamily: '"Geist Mono", monospace', textTransform: 'uppercase' as const }}>Popular</div>
                )}
                <div style={{ fontSize: 12, fontWeight: 400, color: plan.highlight ? P.lavender : P.subtle, marginBottom: 8, fontFamily: '"Geist Mono", monospace', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>{plan.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 40, fontWeight: 500, letterSpacing: '-0.04em', color: plan.highlight ? P.cream : P.ink }}>{plan.price}</span>
                </div>
                <div style={{ fontSize: 13, color: plan.highlight ? '#8a7a6a' : P.subtle, marginBottom: 24 }}>{plan.sub}</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display: 'flex', gap: 10, fontSize: 14, color: plan.highlight ? '#e8ddd0' : '#4a3a2a', alignItems: 'center' }}>
                      <span style={{ color: plan.highlight ? P.teal : P.sage, flexShrink: 0 }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <a href={plan.href} style={{
                  display:     'block',
                  textAlign:   'center' as const,
                  background:  plan.highlight ? P.coral : 'transparent',
                  border:      plan.highlight ? 'none' : `1px solid ${P.border}`,
                  borderRadius: 12,
                  padding:     '11px',
                  color:       plan.highlight ? '#fff' : '#5a4a3a',
                  fontSize:    14,
                  fontWeight:  500,
                  textDecoration: 'none',
                  transition:  'opacity 0.2s, transform 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.opacity = '0.9' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.opacity = '1' }}>
                  {plan.cta}
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── SETUP ── */}
      <section id="setup" style={{ background: P.sand, borderTop: `1px solid ${P.border}`, borderBottom: `1px solid ${P.border}`, padding: '80px 40px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <span style={{ ...tagBadge, borderColor: `${P.gold}40`, background: `${P.gold}18`, color: P.gold }}>Local Demo</span>
              <h2 style={{ fontSize: 'clamp(22px, 3vw, 36px)', fontWeight: 500, letterSpacing: '-0.02em', color: P.ink, marginTop: 12, marginBottom: 10 }}>
                Run Maid402 on your machine
              </h2>
              <p style={{ fontSize: 15, color: P.muted, maxWidth: 480, margin: '0 auto 28px' }}>
                Nine steps to get your autonomous home agent up and running locally.
              </p>
              {/* Progress pill */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: P.cream, border: `1px solid ${P.border}`, borderRadius: 20, padding: '6px 16px', fontSize: 13, color: P.muted }}>
                <span style={{ fontFamily: '"Geist Mono", monospace', fontSize: 12, color: P.gold, fontWeight: 500 }}>{checkedSetup.size}</span>
                <span>/ {SETUP_STEPS.length} steps completed</span>
                <div style={{ width: 80, height: 4, borderRadius: 2, background: P.border, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 2, background: P.gold, width: `${(checkedSetup.size / SETUP_STEPS.length) * 100}%`, transition: 'width 0.4s ease' }} />
                </div>
              </div>
            </div>
          </Reveal>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {SETUP_STEPS.map((step, i) => (
              <Reveal key={step.id} delay={i * 0.06}>
                <SetupStep
                  step={step}
                  checked={checkedSetup.has(step.id)}
                  onCheck={() => setCheckedSetup(prev => {
                    const next = new Set(prev)
                    next.has(step.id) ? next.delete(step.id) : next.add(step.id)
                    return next
                  })}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ position: 'relative', overflow: 'hidden', borderTop: `1px solid ${P.border}`, marginTop: 0 }}>
        <div style={{
          position:            'absolute',
          inset:               0,
          backgroundImage:     'url(/footer-meadow.png)',
          backgroundSize:      'cover',
          backgroundPosition:  'center top',
          opacity:             0.3,
        }} />
        <div style={{ position: 'relative', zIndex: 1, padding: '56px 40px 32px', maxWidth: 1060, margin: '0 auto' }}>
          <Reveal>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40, marginBottom: 48 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <Image src="/maid402-logo.png" alt="Maid402" width={28} height={28} style={{ borderRadius: 6 }} />
                  <span style={{ fontWeight: 500, fontSize: 14, color: P.ink }}>Maid402</span>
                </div>
                <p style={{ fontSize: 13.5, color: P.muted, lineHeight: 1.7, maxWidth: 260 }}>
                  Your autonomous home ordering agent. Powered by x402 machine-to-machine payments on Base.
                </p>
              </div>
              {[
                { title: 'Product', links: ['Features', 'Pricing', 'API Docs', 'Changelog'] },
                { title: 'Resources', links: ['GitHub', 'Discord', 'Blog', 'Status'] },
                { title: 'Legal', links: ['Privacy', 'Terms', 'Cookie Policy'] },
              ].map(col => (
                <div key={col.title}>
                  <div style={{ fontSize: 11, fontWeight: 400, color: P.ink, letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 14, fontFamily: '"Geist Mono", monospace' }}>{col.title}</div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {col.links.map(link => (
                      <li key={link}>
                        <a href="#" className="landing-link" style={{ fontSize: 13.5, color: P.muted, textDecoration: 'none' }}>
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Reveal>

          <div style={{ borderTop: `1px solid ${P.border}`, paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <p style={{ fontSize: 13, color: P.subtle }}>© 2025 Maid402. Built on x402.</p>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { label: 'x402', color: P.coral },
                { label: 'Base Sepolia', color: P.lavender },
                { label: 'USDC', color: P.teal },
              ].map(badge => (
                <span key={badge.label} style={{ background: `${badge.color}15`, border: `1px solid ${badge.color}30`, borderRadius: 20, padding: '3px 10px', fontSize: 10.5, color: badge.color, fontWeight: 400, fontFamily: '"Geist Mono", monospace', textTransform: 'uppercase' as const, letterSpacing: '0.08em', transition: 'transform 0.2s ease' }}>
                  {badge.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ── Shared style objects ──────────────────────────────────────────────



const ctaBtn: React.CSSProperties = {
  display:         'inline-flex',
  alignItems:      'center',
  background:      P.ink,
  color:           P.cream,
  border:          'none',
  borderRadius:    24,
  padding:         '12px 26px',
  fontSize:        13,
  fontWeight:      500,
  cursor:          'pointer',
  textDecoration:  'none',
  letterSpacing:   '0.02em',
  boxShadow:       '0 2px 10px rgba(0,0,0,0.12)',
  transition:      'background 0.25s, transform 0.25s, box-shadow 0.25s',
}

const outlineBtn: React.CSSProperties = {
  display:       'inline-flex',
  alignItems:    'center',
  background:    'rgba(250,246,239,0.8)',
  color:         '#5a4a3a',
  border:        `1px solid ${P.border}`,
  borderRadius:  24,
  padding:       '12px 26px',
  fontSize:      13,
  fontWeight:    400,
  cursor:        'pointer',
  textDecoration: 'none',
  backdropFilter: 'blur(8px)',
  transition:    'border-color 0.25s, background 0.25s, transform 0.25s',
}

const tagBadge: React.CSSProperties = {
  display:       'inline-block',
  background:    `rgba(26,24,21,0.06)`,
  border:        `1px solid rgba(26,24,21,0.12)`,
  borderRadius:  20,
  padding:       '4px 12px',
  fontSize:      10,
  fontWeight:    400,
  color:         '#6a6050',
  letterSpacing: '0.1em',
  fontFamily:    '"Geist Mono", monospace',
  textTransform: 'uppercase',
  transition:    'background 0.3s ease',
}

const statCard: React.CSSProperties = {
  background:   P.cream,
  border:       `1px solid ${P.border}`,
  borderRadius: 16,
  padding:      '24px 28px',
  textAlign:    'center',
  boxShadow:    '0 1px 4px rgba(0,0,0,0.04)',
}



const demoCard: React.CSSProperties = {
  background:   P.cream,
  border:       `1px solid ${P.border}`,
  borderRadius: 14,
  overflow:     'hidden',
  boxShadow:    '0 2px 12px rgba(0,0,0,0.06)',
}

const avatarStyle: React.CSSProperties = {
  width:        32,
  height:       32,
  borderRadius: 8,
  background:   P.sand,
  flexShrink:   0,
}

const agentBubbleStyle: React.CSSProperties = {
  background:   P.sand,
  border:       `1px solid ${P.border}`,
  borderRadius: '4px 14px 14px 14px',
  padding:      '10px 14px',
  fontSize:     13.5,
  lineHeight:   1.65,
  color:        '#2a2015',
}
