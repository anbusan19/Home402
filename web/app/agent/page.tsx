'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'
import Image from 'next/image'
import Link  from 'next/link'

interface Message {
  role:       'user' | 'agent'
  text:       string
  streaming?: boolean
  ts?:        number
}

// ── Palette (mirrors landing page) ───────────────────────────────────
const P = {
  cream:  '#faf6ef',
  sand:   '#f0eadf',
  peach:  '#e0a880',
  coral:  '#d4855a',
  lavender:'#9a6db8',
  purple: '#7a5a9a',
  teal:   '#4a9a92',
  sage:   '#5a8a5a',
  gold:   '#c49050',
  ink:    '#1a1815',
  muted:  '#5a4a3a',
  subtle: '#8a7a68',
  border: '#ddd5c8',
}

const SUGGESTIONS = [
  '🥛 Order Amul milk 1L',
  '🧈 Find Amul butter 500g',
  '💰 What\'s my budget left?',
  '🛒 Order milk, eggs and bread',
]

const AGENT_API = process.env.NEXT_PUBLIC_AGENT_URL ?? 'http://localhost:3003'

const CHAIN_BADGES = [
  { label: 'Base Sepolia', color: P.lavender },
  { label: 'NEAR',         color: P.sage     },
  { label: 'Filecoin',     color: P.teal     },
  { label: 'Storacha',     color: P.purple   },
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([{
    role: 'agent',
    ts:   Date.now(),
    text: "Hey! I'm *Maid402* — your autonomous home shopping agent powered by crypto rails.\n\nJust tell me what you need and I'll order it. Every order settles 1 USDC on Base Sepolia.\n\n_Try: \"order me Amul milk 1L\"_",
  }])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [online,  setOnline]  = useState<boolean | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.ok ? setOnline(true) : setOnline(false))
      .catch(() => setOnline(false))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(text: string) {
    if (!text.trim() || loading) return
    setInput('')
    setMessages(m => [...m, { role: 'user', text: text.trim(), ts: Date.now() }])
    setLoading(true)
    setMessages(m => [...m, { role: 'agent', text: '', streaming: true, ts: Date.now() }])

    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: text.trim() }),
      })
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let   buf     = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') continue
          try {
            const { text: chunk } = JSON.parse(payload) as { text: string }
            setMessages(m => {
              const msgs = [...m]
              const last = msgs[msgs.length - 1]
              if (last?.role === 'agent') {
                msgs[msgs.length - 1] = {
                  ...last,
                  text: last.text ? `${last.text}\n\n${chunk}` : chunk,
                }
              }
              return msgs
            })
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setMessages(m => {
        const msgs = [...m]
        msgs[msgs.length - 1] = {
          role: 'agent',
          text: online === false
            ? '❌ Agent is offline — run `pnpm dev` in the project root.'
            : `❌ Error: ${msg}`,
        }
        return msgs
      })
    } finally {
      setMessages(m => {
        const msgs = [...m]
        const last = msgs[msgs.length - 1]
        if (last?.role === 'agent') msgs[msgs.length - 1] = { ...last, streaming: false }
        return msgs
      })
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function onSubmit(e: FormEvent) { e.preventDefault(); send(input) }
  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      height:        '100dvh',
      maxWidth:      860,
      margin:        '0 auto',
      background:    P.cream,
      borderLeft:    `1px solid ${P.border}`,
      borderRight:   `1px solid ${P.border}`,
      fontFamily:    "'Manrope', ui-sans-serif, system-ui, -apple-system, sans-serif",
    }}>

      {/* ── Header ── */}
      <header style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '0 24px',
        height:         58,
        borderBottom:   `1px solid ${P.border}`,
        flexShrink:     0,
        background:     'rgba(250,246,239,0.95)',
        backdropFilter: 'blur(12px)',
        gap:            12,
        flexWrap:       'wrap' as const,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <Image src="/maid402-logo.png" alt="Maid402" width={28} height={28} style={{ borderRadius: 7 }} />
          <div>
            <div style={{ fontWeight: 500, fontSize: 14, color: P.ink, letterSpacing: '0.03em' }}>Maid402</div>
            <div style={{ fontSize: 10, color: P.subtle, marginTop: 1, letterSpacing: '0.04em' }}>Autonomous Home Commerce</div>
          </div>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const }}>
          {CHAIN_BADGES.map(b => (
            <div key={b.label} style={{
              display:      'flex',
              alignItems:   'center',
              gap:          5,
              background:   `${b.color}14`,
              border:       `1px solid ${b.color}30`,
              borderRadius: 20,
              padding:      '3px 9px',
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: b.color, flexShrink: 0 }} />
              <span style={{ color: b.color, fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', fontFamily: '"Geist Mono", monospace' }}>{b.label}</span>
            </div>
          ))}

          <div style={{
            display:      'flex',
            alignItems:   'center',
            gap:          6,
            background:   P.sand,
            border:       `1px solid ${P.border}`,
            borderRadius: 20,
            padding:      '4px 11px',
          }}>
            <div style={{
              width:      6,
              height:     6,
              borderRadius: '50%',
              flexShrink: 0,
              background: online === true ? P.sage : online === false ? '#d4655a' : P.subtle,
              animation:  online === true ? 'pulseGlow 2s ease-in-out infinite' : 'none',
            }} />
            <span style={{ fontSize: 10.5, color: P.subtle, fontWeight: 500, letterSpacing: '0.04em' }}>
              {online === true ? 'Live' : online === false ? 'Offline' : '…'}
            </span>
          </div>
        </div>
      </header>

      {/* ── Messages ── */}
      <div style={{
        flex:          1,
        overflowY:     'auto',
        padding:       '32px 24px 16px',
        display:       'flex',
        flexDirection: 'column',
        gap:           22,
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={msg.role === 'user'
            ? { display: 'flex', justifyContent: 'flex-end' }
            : { display: 'flex', alignItems: 'flex-start', gap: 11 }}
            className="msg-row"
          >
            {msg.role === 'agent' && (
              <div style={{
                width:          30,
                height:         30,
                borderRadius:   8,
                background:     P.ink,
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                flexShrink:     0,
                boxShadow:      '0 1px 4px rgba(0,0,0,0.12)',
              }}>
                <Image src="/maid402-logo.png" alt="M" width={18} height={18} style={{ borderRadius: 4 }} />
              </div>
            )}
            <div style={msg.role === 'user' ? {
              background:   P.ink,
              borderRadius: '14px 4px 14px 14px',
              padding:      '11px 15px',
              maxWidth:     520,
              fontSize:     13.5,
              lineHeight:   1.7,
              color:        P.cream,
              wordBreak:    'break-word' as const,
              boxShadow:    '0 2px 8px rgba(0,0,0,0.10)',
            } : {
              background:   '#fff',
              border:       `1px solid ${P.border}`,
              borderRadius: '4px 14px 14px 14px',
              padding:      '12px 16px',
              maxWidth:     620,
              fontSize:     13.5,
              lineHeight:   1.75,
              color:        P.muted,
              wordBreak:    'break-word' as const,
              boxShadow:    '0 1px 4px rgba(0,0,0,0.04)',
            }}>
              {msg.streaming && !msg.text ? (
                <TypingDots />
              ) : (
                <MsgText text={msg.text} />
              )}
              {msg.streaming && msg.text && (
                <span style={{ display: 'inline-block', animation: 'blink 1s step-end infinite', marginLeft: 2, color: P.ink, fontSize: 14 }}>▋</span>
              )}
              {msg.ts && !msg.streaming && (
                <div style={{ fontSize: 10, color: P.border, marginTop: 6, textAlign: 'right' as const }}>
                  {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ── Suggestions ── */}
      {messages.length === 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8, padding: '0 24px 14px', flexShrink: 0 }}>
          {SUGGESTIONS.map(s => (
            <button key={s} style={{
              background:   '#fff',
              border:       `1px solid ${P.border}`,
              borderRadius: 20,
              padding:      '7px 15px',
              color:        P.muted,
              fontSize:     12.5,
              cursor:       'pointer',
              transition:   'border-color 0.15s, color 0.15s',
              fontFamily:   'inherit',
              fontWeight:   400,
            }}
            className="suggestion-chip"
            onClick={() => send(s.replace(/^[\p{Emoji}\s]+/u, '').trim())}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* ── API info panel ── */}
      {messages.length === 1 && <ApiInfoPanel />}

      {/* ── Input ── */}
      <form onSubmit={onSubmit} style={{
        padding:    '10px 24px 16px',
        borderTop:  `1px solid ${P.border}`,
        flexShrink: 0,
        background: 'rgba(250,246,239,0.95)',
      }}>
        <div style={{
          display:      'flex',
          alignItems:   'flex-end',
          gap:          8,
          background:   '#fff',
          border:       `1px solid ${P.border}`,
          borderRadius: 16,
          padding:      '8px 8px 8px 16px',
          transition:   'border-color 0.2s, box-shadow 0.2s',
          boxShadow:    '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <textarea
            ref={inputRef}
            style={{
              flex:       1,
              background: 'transparent',
              border:     'none',
              color:      P.ink,
              fontSize:   13.5,
              lineHeight: 1.6,
              resize:     'none' as const,
              fontFamily: 'inherit',
              minHeight:  26,
              maxHeight:  160,
              overflowY:  'auto' as const,
              padding:    '3px 0',
              outline:    'none',
            }}
            value={input}
            onChange={e => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
            }}
            onKeyDown={onKeyDown}
            placeholder="Message Maid402…"
            disabled={loading}
            autoFocus
            rows={1}
          />
          <button
            type="submit"
            style={{
              background:     input.trim() && !loading ? P.ink : P.sand,
              border:         'none',
              borderRadius:   24,
              width:          36,
              height:         36,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              color:          input.trim() && !loading ? P.cream : P.subtle,
              cursor:         !input.trim() || loading ? 'default' : 'pointer',
              flexShrink:     0,
              transition:     'background 0.2s, color 0.2s',
            }}
            className="send-btn"
            disabled={!input.trim() || loading}
          >
            {loading ? (
              <span style={{
                display:      'inline-block',
                width:        14,
                height:       14,
                border:       `2px solid rgba(255,255,255,0.3)`,
                borderTop:    `2px solid ${P.cream}`,
                borderRadius: '50%',
                animation:    'spin 0.7s linear infinite',
              }} />
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
        <p style={{ fontSize: 10.5, color: P.border, marginTop: 7, textAlign: 'center' as const }}>
          Enter to send · Shift+Enter for new line · Powered by x402 + Zepto
        </p>
      </form>
    </div>
  )
}

// ── Typing dots ───────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '2px 0' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width:      6,
          height:     6,
          borderRadius: '50%',
          background: P.border,
          animation:  `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  )
}

// ── API info panel ────────────────────────────────────────────────────

function ApiInfoPanel() {
  const [copied, setCopied] = useState(false)
  const endpoint = `${AGENT_API}/api/order`
  const curlExample =
`curl -X POST ${endpoint} \\
  -H "Content-Type: application/json" \\
  -d '{"item": "Amul milk 1L"}'
# → 402 Payment Required (1 USDC · Base Sepolia)
# Retry with X-PAYMENT header after signing`

  function copy() {
    navigator.clipboard.writeText(curlExample)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      margin:       '0 24px 14px',
      border:       `1px solid ${P.border}`,
      borderRadius: 14,
      overflow:     'hidden',
      flexShrink:   0,
      background:   '#fff',
      boxShadow:    '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      <div style={{
        display:      'flex',
        alignItems:   'center',
        gap:          10,
        padding:      '9px 16px',
        background:   P.sand,
        borderBottom: `1px solid ${P.border}`,
      }}>
        <span style={{
          background:    P.ink,
          color:         P.cream,
          fontSize:      9.5,
          padding:       '2px 8px',
          borderRadius:  4,
          letterSpacing: '0.1em',
          fontFamily:    '"Geist Mono", monospace',
          textTransform: 'uppercase' as const,
        }}>x402</span>
        <span style={{ fontSize: 12, color: P.subtle }}>Public paid API — anyone can trigger an order</span>
      </div>
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            background:    `${P.sage}18`,
            color:         P.sage,
            fontSize:      9.5,
            padding:       '2px 8px',
            borderRadius:  4,
            letterSpacing: '0.1em',
            fontFamily:    '"Geist Mono", monospace',
            textTransform: 'uppercase' as const,
            border:        `1px solid ${P.sage}30`,
          }}>POST</span>
          <code style={{ fontFamily: '"Geist Mono", monospace', fontSize: 12, color: P.subtle }}>{endpoint}</code>
        </div>
        <div style={{ fontSize: 11, color: P.subtle }}>
          1 USDC · Base Sepolia · USDC: <code style={{ fontFamily: '"Geist Mono", monospace', fontSize: 10.5, color: P.muted }}>0x036C…7e</code>
        </div>
        <div style={{ position: 'relative' as const, background: P.ink, borderRadius: 10, overflow: 'hidden' }}>
          <pre style={{
            margin:     0,
            padding:    '14px 52px 14px 16px',
            fontSize:   11.5,
            fontFamily: '"Geist Mono", monospace',
            color:      '#e0d8cc',
            lineHeight: 1.75,
            whiteSpace: 'pre' as const,
            overflowX:  'auto' as const,
          }}>{curlExample}</pre>
          <button style={{
            position:     'absolute' as const,
            top:          10,
            right:        10,
            background:   'rgba(255,255,255,0.08)',
            border:       '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6,
            color:        copied ? P.teal : 'rgba(255,255,255,0.4)',
            fontSize:     10.5,
            padding:      '3px 8px',
            cursor:       'pointer',
            fontFamily:   '"Geist Mono", monospace',
            transition:   'color 0.2s',
          }} onClick={copy}>{copied ? '✓ copied' : 'copy'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Markdown renderer ─────────────────────────────────────────────────

function MsgText({ text }: { text: string }) {
  if (!text) return null
  const lines    = text.split('\n')
  const elements: React.JSX.Element[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) { elements.push(<div key={i} style={{ height: 6 }} />); i++; continue }
    if (/^[-•*] /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-•*] /.test(lines[i])) {
        items.push(lines[i].replace(/^[-•*] /, '')); i++
      }
      elements.push(
        <ul key={`ul-${i}`} style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {items.map((item, j) => (
            <li key={j} style={{ color: 'inherit' }}><InlineText text={item} /></li>
          ))}
        </ul>
      )
      continue
    }
    elements.push(<div key={i}><InlineText text={line} /></div>)
    i++
  }
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{elements}</div>
}

function InlineText({ text }: { text: string }) {
  const raw   = text.replace(/\\([_*[\]()~`>#+\-=|{}.!\\])/g, '$1')
  const parts = raw.split(/(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|`[^`]+`|\[[^\]]+\]\([^)]+\))/)
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**') && p.length > 4)
          return <span key={i} style={{ fontWeight: 600, color: P.ink }}>{p.slice(2, -2)}</span>
        if (p.startsWith('*') && p.endsWith('*') && p.length > 2)
          return <span key={i} style={{ fontWeight: 600, color: P.ink }}>{p.slice(1, -1)}</span>
        if (p.startsWith('_') && p.endsWith('_') && p.length > 2)
          return <em key={i} style={{ color: P.subtle }}>{p.slice(1, -1)}</em>
        if (p.startsWith('`') && p.endsWith('`') && p.length > 2)
          return <code key={i} style={{
            background:    P.sand,
            borderRadius:  5,
            padding:       '1px 5px',
            fontFamily:    '"Geist Mono", monospace',
            fontSize:      11.5,
            color:         P.purple,
            border:        `1px solid ${P.border}`,
          }}>{p.slice(1, -1)}</code>
        const linkMatch = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
        if (linkMatch)
          return <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" style={{
            color:               P.lavender,
            textDecoration:      'underline',
            textUnderlineOffset: '2px',
            fontWeight:          500,
          }}>{linkMatch[1]}</a>
        return <span key={i}>{p}</span>
      })}
    </>
  )
}
