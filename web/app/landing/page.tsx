'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// ── Data ──────────────────────────────────────────────────────────────

const STATS = [
  { value: '10.4×', label: 'Faster than manual ordering' },
  { value: '94%',   label: 'Order success rate' },
  { value: '3.2×',  label: 'Savings vs. store visits' },
]

const FEATURES = [
  {
    tag: 'Voice-to-Cart',
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

const TESTIMONIALS = [
  {
    quote: 'Maid402 saved me 3 hours a week. I just say what I need and it handles everything — including the payment.',
    name: 'Priya S.',
    role: 'Remote Designer',
  },
  {
    quote: 'The x402 payment integration is brilliant. Zero login, zero friction. My orders just happen.',
    name: 'Arjun M.',
    role: 'Software Engineer',
  },
  {
    quote: "I gave it a ₹3,000/month budget and it's never gone over. It's like having a very diligent assistant.",
    name: 'Kavya R.',
    role: 'Entrepreneur',
  },
]

// ── Component ─────────────────────────────────────────────────────────

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div style={{ background: '#f5f0e8', color: '#1a1915', fontFamily: "'Styrene A Web', 'Styrene A', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif", minHeight: '100vh' }}>

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
        background:      scrollY > 20 ? 'rgba(250,247,242,0.92)' : 'rgba(250,247,242,0)',
        backdropFilter:  scrollY > 20 ? 'blur(12px)' : 'none',
        borderBottom:    scrollY > 20 ? '1px solid #e4ddd0' : '1px solid transparent',
        transition:      'background 0.3s, border-color 0.3s, backdrop-filter 0.3s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={logoMark}>🏠</div>
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em', color: '#1a1915' }}>Maid402</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 32, fontSize: 14, color: '#6a5a4a' }}>
          {['Features', 'Pricing', 'API', 'Blog'].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`} style={{ textDecoration: 'none', color: 'inherit', transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#c08b4a')}
              onMouseLeave={e => (e.currentTarget.style.color = '#6a5a4a')}>
              {item}
            </a>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/" style={{
            background:   'transparent',
            border:       '1px solid #d4cbbf',
            borderRadius: 20,
            padding:      '7px 18px',
            color:        '#5a4a3a',
            fontSize:     13.5,
            fontWeight:   500,
            cursor:       'pointer',
            textDecoration: 'none',
            transition:   'border-color 0.15s, background 0.15s',
          }}>Open App</Link>
          <a href="#signup" style={{
            background:   '#c08b4a',
            border:       'none',
            borderRadius: 20,
            padding:      '7px 18px',
            color:        '#fff',
            fontSize:     13.5,
            fontWeight:   600,
            cursor:       'pointer',
            textDecoration: 'none',
            transition:   'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#b8945e')}
          onMouseLeave={e => (e.currentTarget.style.background = '#c08b4a')}>
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
          transition: 'transform 0.05s linear',
        }} />
        {/* Gradient overlay */}
        <div style={{
          position:   'absolute',
          inset:      0,
          background: 'linear-gradient(to bottom, rgba(245,240,232,0.2) 0%, rgba(245,240,232,0.1) 40%, rgba(245,240,232,0.85) 90%, #f5f0e8 100%)',
        }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 740, padding: '0 24px' }}>
          <div style={{
            display:      'inline-flex',
            alignItems:   'center',
            gap:          7,
            background:   'rgba(250,247,242,0.85)',
            border:       '1px solid #e4ddd0',
            borderRadius: 20,
            padding:      '5px 14px',
            marginBottom: 28,
            backdropFilter: 'blur(8px)',
          }}>
            <span style={{ fontSize: 11, background: '#c08b4a', color: '#fff', borderRadius: 4, padding: '1px 7px', fontWeight: 700, letterSpacing: '0.05em' }}>x402</span>
            <span style={{ fontSize: 13, color: '#7a6a5a', fontWeight: 500 }}>Powered by machine-to-machine payments</span>
          </div>

          <h1 style={{
            fontSize:      'clamp(36px, 6vw, 72px)',
            fontWeight:    700,
            lineHeight:    1.1,
            letterSpacing: '-0.03em',
            color:         '#1a1915',
            marginBottom:  20,
          }}>
            The new standard in<br />
            <span style={{ color: '#c08b4a' }}>home ordering</span>
          </h1>

          <p style={{
            fontSize:     'clamp(16px, 2vw, 20px)',
            color:        '#6a5a4a',
            lineHeight:   1.65,
            maxWidth:     520,
            margin:       '0 auto 36px',
          }}>
            Your autonomous home agent that orders groceries, tracks your budget, and pays for itself — all through natural conversation.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/" style={ctaBtn}>
              Try Maid402 →
            </Link>
            <a href="#features" style={outlineBtn}>See how it works</a>
          </div>

          {/* Mini chat preview */}
          <div style={{
            marginTop:    52,
            background:   'rgba(250,247,242,0.88)',
            border:       '1px solid #e8e0d0',
            borderRadius: 20,
            padding:      '18px 22px',
            maxWidth:     480,
            textAlign:    'left',
            backdropFilter: 'blur(12px)',
            boxShadow:    '0 4px 24px rgba(0,0,0,0.08)',
            margin:       '52px auto 0',
          }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ ...avatarStyle }}></div>
              <div style={agentBubbleStyle}>Order me Amul butter and 2L milk for tomorrow morning.</div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ ...avatarStyle, background: 'linear-gradient(135deg, #d4a76a 0%, #c08b4a 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>M</div>
              <div style={agentBubbleStyle}>
                ✓ Amul Butter 500g — ₹265 (BigBasket)<br />
                ✓ Amul Milk 2L — ₹108 (Swiggy Instamart)<br />
                <span style={{ color: '#c08b4a', fontWeight: 600 }}>Ordering now via 1 USDC payment…</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ padding: '64px 40px', maxWidth: 1000, margin: '0 auto' }}>
        <p style={{ fontSize: 13, color: '#9b8b7a', textAlign: 'center', marginBottom: 40, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
          Designed for modern households
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {STATS.map(stat => (
            <div key={stat.value} style={statCard}>
              <div style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#1a1915', marginBottom: 6 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 14, color: '#7a6a5a', lineHeight: 1.5 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Testimonial strip */}
        <div style={{ marginTop: 48, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {TESTIMONIALS.map(t => (
            <div key={t.name} style={testimonialCard}>
              <p style={{ fontSize: 14, color: '#4a3a2a', lineHeight: 1.7, marginBottom: 16, fontStyle: 'italic' }}>"{t.quote}"</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #d4a76a, #c08b4a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  {t.name[0]}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#2a2010' }}>{t.name}</div>
                  <div style={{ fontSize: 11.5, color: '#9b8b7a' }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section style={{
        position:       'relative',
        overflow:       'hidden',
        margin:         '0 0 0 0',
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
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(245,240,232,0.5), rgba(245,240,232,0.65))',
        }} />
        <div style={{ position: 'relative', zIndex: 1, padding: '60px 24px' }}>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 700, letterSpacing: '-0.025em', color: '#1a1915', marginBottom: 12 }}>
            A life less errand-filled
          </h2>
          <p style={{ fontSize: 16, color: '#6a5a4a', marginBottom: 28, maxWidth: 420, margin: '0 auto 28px' }}>
            Maid402 takes the grind out of home management so you can focus on what matters.
          </p>
          <Link href="/" style={ctaBtn}>Start Ordering Free →</Link>
        </div>
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
            direction:     i % 2 === 1 ? 'rtl' : 'ltr' as any,
          }}>
            {/* Text side */}
            <div style={{ direction: 'ltr' }}>
              <span style={tagBadge}>{feature.tag}</span>
              <h2 style={{ fontSize: 'clamp(20px, 2.5vw, 30px)', fontWeight: 700, letterSpacing: '-0.025em', color: '#1a1915', marginBottom: 14, lineHeight: 1.3, marginTop: 12 }}>
                {feature.headline}
              </h2>
              <p style={{ fontSize: 15, color: '#6a5a4a', lineHeight: 1.7, marginBottom: 20 }}>
                {feature.description}
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {feature.bullets.map(b => (
                  <li key={b} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#4a3a2a' }}>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(192,139,74,0.15)', border: '1px solid rgba(192,139,74,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#c08b4a', flexShrink: 0 }}>✓</span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            {/* Demo card */}
            <div style={{ direction: 'ltr' }}>
              <div style={demoCard}>
                <div style={{ borderBottom: '1px solid #e8e0d0', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, background: '#f5f0e8' }}>
                  {[...Array(3)].map((_, di) => (
                    <div key={di} style={{ width: 8, height: 8, borderRadius: '50%', background: di === 0 ? '#e8a87c' : di === 1 ? '#d4c56a' : '#7ac87a', opacity: 0.8 }} />
                  ))}
                  <span style={{ fontSize: 11.5, color: '#9b8b7a', marginLeft: 4 }}>{feature.tag}</span>
                </div>
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {feature.demo.map((line, di) => (
                    <div key={di} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 10.5, color: '#c08b4a', fontWeight: 700, fontFamily: '"SF Mono", monospace', paddingTop: 2, flexShrink: 0, minWidth: 54 }}>{line.label}</span>
                      <span style={{ fontSize: 13, color: '#3a2a1a', lineHeight: 1.6, fontFamily: '"SF Mono", "Fira Code", monospace', whiteSpace: 'pre-wrap' as const }}>{line.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ── API SECTION ── */}
      <section id="api" style={{ background: '#faf7f2', padding: '72px 40px', borderTop: '1px solid #e4ddd0', borderBottom: '1px solid #e4ddd0' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <span style={tagBadge}>For Developers</span>
            <h2 style={{ fontSize: 'clamp(22px, 3vw, 36px)', fontWeight: 700, letterSpacing: '-0.025em', color: '#1a1915', marginTop: 12, marginBottom: 12 }}>
              Integrate home ordering into anything
            </h2>
            <p style={{ fontSize: 15, color: '#6a5a4a', maxWidth: 480, margin: '0 auto' }}>
              Our public API is pay-per-use via x402. No API keys, no subscription — just call and pay in USDC.
            </p>
          </div>

          <div style={{ background: '#1a1915', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: i === 0 ? '#e8a87c' : i === 1 ? '#d4c56a' : '#7ac87a', opacity: 0.7 }} />
              ))}
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginLeft: 8 }}>Terminal</span>
            </div>
            <pre style={{ margin: 0, padding: '24px', fontSize: 13, lineHeight: 1.8, fontFamily: '"SF Mono", "Fira Code", monospace', color: '#e8e0d0', overflowX: 'auto' as const }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 24 }}>
            {[
              { icon: '⚡', title: 'Instant', desc: 'No registration or API keys required' },
              { icon: '💰', title: '1 USDC / call', desc: 'Pay only for what you use on Base Sepolia' },
              { icon: '🌊', title: 'SSE Streaming', desc: 'Real-time order status as it progresses' },
            ].map(item => (
              <div key={item.title} style={{ background: '#faf7f2', border: '1px solid #e4ddd0', borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ fontSize: 20, marginBottom: 8 }}>{item.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1915', marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 13, color: '#8a7a6a', lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ padding: '80px 40px', maxWidth: 860, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <span style={tagBadge}>Pricing</span>
          <h2 style={{ fontSize: 'clamp(22px, 3vw, 36px)', fontWeight: 700, letterSpacing: '-0.025em', color: '#1a1915', marginTop: 12, marginBottom: 10 }}>
            Simple, pay-as-you-go
          </h2>
          <p style={{ fontSize: 15, color: '#6a5a4a' }}>No subscriptions. No hidden fees. Just pay for what you order.</p>
        </div>

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
          ].map(plan => (
            <div key={plan.name} style={{
              background:   plan.highlight ? '#1a1915' : '#faf7f2',
              border:       plan.highlight ? '1px solid #3a2a1a' : '1px solid #e4ddd0',
              borderRadius: 20,
              padding:      '32px 28px',
              position:     'relative',
              overflow:     'hidden',
            }}>
              {plan.highlight && (
                <div style={{ position: 'absolute', top: 16, right: 16, background: '#c08b4a', color: '#fff', fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20, letterSpacing: '0.05em' }}>POPULAR</div>
              )}
              <div style={{ fontSize: 13, fontWeight: 600, color: plan.highlight ? '#d4a76a' : '#c08b4a', marginBottom: 8 }}>{plan.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.04em', color: plan.highlight ? '#f5f0e8' : '#1a1915' }}>{plan.price}</span>
              </div>
              <div style={{ fontSize: 13, color: plan.highlight ? '#8a7a6a' : '#9b8b7a', marginBottom: 24 }}>{plan.sub}</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: 'flex', gap: 10, fontSize: 14, color: plan.highlight ? '#e8ddd0' : '#4a3a2a', alignItems: 'center' }}>
                    <span style={{ color: '#c08b4a', flexShrink: 0 }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <a href={plan.href} style={{
                display:     'block',
                textAlign:   'center',
                background:  plan.highlight ? '#c08b4a' : 'transparent',
                border:      plan.highlight ? 'none' : '1px solid #d4cbbf',
                borderRadius: 12,
                padding:     '11px',
                color:       plan.highlight ? '#fff' : '#5a4a3a',
                fontSize:    14,
                fontWeight:  600,
                textDecoration: 'none',
                transition:  'opacity 0.15s',
              }}>{plan.cta}</a>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ position: 'relative', overflow: 'hidden', borderTop: '1px solid #e4ddd0', marginTop: 0 }}>
        <div style={{
          position:            'absolute',
          inset:               0,
          backgroundImage:     'url(/footer-meadow.png)',
          backgroundSize:      'cover',
          backgroundPosition:  'center top',
          opacity:             0.3,
        }} />
        <div style={{ position: 'relative', zIndex: 1, padding: '56px 40px 32px', maxWidth: 1060, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40, marginBottom: 48 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={logoMark}>🏠</div>
                <span style={{ fontWeight: 700, fontSize: 16, color: '#1a1915' }}>Maid402</span>
              </div>
              <p style={{ fontSize: 13.5, color: '#7a6a5a', lineHeight: 1.7, maxWidth: 260 }}>
                Your autonomous home ordering agent. Powered by x402 machine-to-machine payments on Base.
              </p>
            </div>
            {[
              { title: 'Product', links: ['Features', 'Pricing', 'API Docs', 'Changelog'] },
              { title: 'Resources', links: ['GitHub', 'Discord', 'Blog', 'Status'] },
              { title: 'Legal', links: ['Privacy', 'Terms', 'Cookie Policy'] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1915', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>{col.title}</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {col.links.map(link => (
                    <li key={link}>
                      <a href="#" style={{ fontSize: 13.5, color: '#7a6a5a', textDecoration: 'none', transition: 'color 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#c08b4a')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#7a6a5a')}>
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid #e4ddd0', paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <p style={{ fontSize: 13, color: '#9b8b7a' }}>© 2025 Maid402. Built on x402.</p>
            <div style={{ display: 'flex', gap: 6 }}>
              {['x402', 'Base Sepolia', 'USDC'].map(badge => (
                <span key={badge} style={{ background: '#f0ebe0', border: '1px solid #e4ddd0', borderRadius: 20, padding: '3px 10px', fontSize: 11.5, color: '#8a7a6a', fontWeight: 500 }}>
                  {badge}
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

const logoMark: React.CSSProperties = {
  width:           32,
  height:          32,
  borderRadius:    9,
  background:      'linear-gradient(135deg, #d4a76a 0%, #c08b4a 100%)',
  display:         'flex',
  alignItems:      'center',
  justifyContent:  'center',
  fontSize:        16,
  flexShrink:      0,
  boxShadow:       '0 1px 3px rgba(192,139,74,0.35)',
}

const ctaBtn: React.CSSProperties = {
  display:         'inline-flex',
  alignItems:      'center',
  background:      '#c08b4a',
  color:           '#fff',
  border:          'none',
  borderRadius:    24,
  padding:         '12px 26px',
  fontSize:        15,
  fontWeight:      600,
  cursor:          'pointer',
  textDecoration:  'none',
  letterSpacing:   '-0.01em',
  boxShadow:       '0 2px 10px rgba(192,139,74,0.35)',
  transition:      'background 0.15s, transform 0.15s',
}

const outlineBtn: React.CSSProperties = {
  display:       'inline-flex',
  alignItems:    'center',
  background:    'rgba(250,247,242,0.8)',
  color:         '#5a4a3a',
  border:        '1px solid #d4cbbf',
  borderRadius:  24,
  padding:       '12px 26px',
  fontSize:      15,
  fontWeight:    500,
  cursor:        'pointer',
  textDecoration: 'none',
  backdropFilter: 'blur(8px)',
  transition:    'border-color 0.15s, background 0.15s',
}

const tagBadge: React.CSSProperties = {
  display:       'inline-block',
  background:    'rgba(192,139,74,0.12)',
  border:        '1px solid rgba(192,139,74,0.25)',
  borderRadius:  20,
  padding:       '4px 12px',
  fontSize:      12,
  fontWeight:    600,
  color:         '#c08b4a',
  letterSpacing: '0.04em',
}

const statCard: React.CSSProperties = {
  background:   '#faf7f2',
  border:       '1px solid #e4ddd0',
  borderRadius: 16,
  padding:      '24px 28px',
  textAlign:    'center',
  boxShadow:    '0 1px 4px rgba(0,0,0,0.04)',
}

const testimonialCard: React.CSSProperties = {
  background:   '#faf7f2',
  border:       '1px solid #e4ddd0',
  borderRadius: 14,
  padding:      '20px 22px',
  boxShadow:    '0 1px 4px rgba(0,0,0,0.04)',
}

const demoCard: React.CSSProperties = {
  background:   '#faf7f2',
  border:       '1px solid #e4ddd0',
  borderRadius: 14,
  overflow:     'hidden',
  boxShadow:    '0 2px 12px rgba(0,0,0,0.06)',
}

const avatarStyle: React.CSSProperties = {
  width:        32,
  height:       32,
  borderRadius: 8,
  background:   '#ede8de',
  flexShrink:   0,
}

const agentBubbleStyle: React.CSSProperties = {
  background:   '#ede8de',
  border:       '1px solid #e0d8c8',
  borderRadius: '4px 14px 14px 14px',
  padding:      '10px 14px',
  fontSize:     13.5,
  lineHeight:   1.65,
  color:        '#2a2015',
}
