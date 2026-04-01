'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'
import Image from 'next/image'

interface Message {
  role:       'user' | 'agent'
  text:       string
  streaming?: boolean
  ts?:        number
}

const SUGGESTIONS = [
  '🥛 Order Amul milk 1L',
  '🧈 Find Amul butter 500g',
  '💰 What\'s my budget left?',
  '🛒 Order milk, eggs and bread',
]

const AGENT_API = process.env.NEXT_PUBLIC_AGENT_URL ?? 'http://localhost:3003'

const CHAIN_BADGES = [
  { label: 'Base Sepolia',  bg: '#eef4ff', color: '#3b72cf', dot: '#3b82f6' },
  { label: 'Near',          bg: '#ecfdf5', color: '#15804d', dot: '#22c55e' },
  { label: 'Filecoin',      bg: '#eff8ff', color: '#0077cc', dot: '#0ea5e9' },
  { label: 'Storacha',      bg: '#f0ecff', color: '#6b40c4', dot: '#8b5cf6' },
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([{
    role: 'agent',
    ts:   Date.now(),
    text: "Hey! I'm *Maid402* — your autonomous home shopping agent powered by crypto rails.\n\nJust tell me what you need and I'll order it. Every order settles 1 USDC on Base Sepolia.\n\n_Try: \"order me Amul milk 1L\"_",
  }])
  const [input, setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [online, setOnline]   = useState<boolean | null>(null)
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
    <div style={st.shell}>
      {/* ── Header ── */}
      <header style={st.header}>
        <div style={st.headerLeft}>
          <Image src="/maid402-logo.png" alt="Maid402" width={32} height={32} style={{ borderRadius: 8 }} />
          <div>
            <div style={st.title}>Maid402</div>
            <div style={st.subtitle}>Autonomous Home Commerce Agent</div>
          </div>
        </div>
        <div style={st.headerRight}>
          {CHAIN_BADGES.map(b => (
            <div key={b.label} style={{ ...st.chainBadge, background: b.bg, borderColor: b.bg }}>
              <div style={{ ...st.chainDot, background: b.dot }} />
              <span style={{ color: b.color, fontSize: 10, fontWeight: 500, letterSpacing: '0.06em' }}>{b.label}</span>
            </div>
          ))}
          <div style={st.statusPill}>
            <div style={{
              ...st.dot,
              background: online === true ? '#22c55e' : online === false ? '#ef4444' : '#a8a090',
              animation:  online === true ? 'pulseGlow 2s ease-in-out infinite' : 'none',
            }} />
            <span style={st.statusText}>
              {online === true ? 'Live' : online === false ? 'Offline' : '…'}
            </span>
          </div>
        </div>
      </header>

      {/* ── Messages ── */}
      <div style={st.messages}>
        {messages.map((msg, i) => (
          <div key={i} style={msg.role === 'user' ? st.userRow : st.agentRow} className="msg-row">
            {msg.role === 'agent' && <div style={st.avatar}><Image src="/maid402-logo.png" alt="M" width={20} height={20} style={{ borderRadius: 4 }} /></div>}
            <div style={msg.role === 'user' ? st.userBubble : st.agentBubble}>
              {msg.streaming && !msg.text ? (
                <TypingDots />
              ) : (
                <MsgText text={msg.text} />
              )}
              {msg.streaming && msg.text && <span style={st.cursor}>▋</span>}
              {msg.ts && !msg.streaming && (
                <div style={st.msgTime}>{new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ── Suggestions ── */}
      {messages.length === 1 && (
        <div style={st.suggestions}>
          {SUGGESTIONS.map(s2 => (
            <button key={s2} style={st.chip} className="suggestion-chip"
              onClick={() => send(s2.replace(/^[\p{Emoji}\s]+/u, '').trim())}>
              {s2}
            </button>
          ))}
        </div>
      )}

      {/* ── API info panel ── */}
      {messages.length === 1 && <ApiInfoPanel />}

      {/* ── Input ── */}
      <form onSubmit={onSubmit} style={st.bar}>
        <div style={st.inputWrapper}>
          <textarea
            ref={inputRef}
            style={st.input}
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
            style={{ ...st.send, opacity: !input.trim() || loading ? 0.4 : 1 }}
            className="send-btn"
            disabled={!input.trim() || loading}
          >
            {loading ? <span style={st.spinner} /> : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
        <p style={st.hint}>Enter to send · Shift+Enter for new line · Powered by x402 + Zepto</p>
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
          width: 6, height: 6, borderRadius: '50%', background: '#1a1815',
          animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
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
    <div style={st.apiPanel}>
      <div style={st.apiHeader}>
        <span style={st.apiTag}>x402</span>
        <span style={st.apiTitle}>Public paid API — anyone can trigger an order</span>
      </div>
      <div style={st.apiBody}>
        <div style={st.apiRow}>
          <span style={st.apiMethod}>POST</span>
          <code style={st.apiUrl}>{endpoint}</code>
        </div>
        <div style={st.apiMeta}>
          1 USDC · Base Sepolia · USDC: <code style={st.inlineCode}>0x036C…7e</code>
        </div>
        <div style={st.codeBlock}>
          <pre style={st.pre}>{curlExample}</pre>
          <button style={st.copyBtn} onClick={copy}>{copied ? '✓ copied' : 'copy'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Markdown renderer ─────────────────────────────────────────────────

function MsgText({ text }: { text: string }) {
  if (!text) return null
  const lines = text.split('\n')
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
  // Strip MarkdownV2 escapes (e.g. \! \. \- \( \) ) for display
  const raw   = text.replace(/\\([_*[\]()~`>#+\-=|{}.!\\])/g, '$1')
  const parts = raw.split(/(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|`[^`]+`|\[[^\]]+\]\([^)]+\))/)
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**') && p.length > 4)
          return <span key={i} style={{ fontWeight: 500, color: '#1a1815' }}>{p.slice(2, -2)}</span>
        if (p.startsWith('*') && p.endsWith('*') && p.length > 2)
          return <span key={i} style={{ fontWeight: 500, color: '#1a1815' }}>{p.slice(1, -1)}</span>
        if (p.startsWith('_') && p.endsWith('_') && p.length > 2)
          return <em key={i} style={{ color: '#7a7060' }}>{p.slice(1, -1)}</em>
        if (p.startsWith('`') && p.endsWith('`') && p.length > 2)
          return <code key={i} style={st.code}>{p.slice(1, -1)}</code>
        const linkMatch = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
        if (linkMatch)
          return <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" style={st.link}>{linkMatch[1]}</a>
        return <span key={i}>{p}</span>
      })}
    </>
  )
}

// ── Styles ────────────────────────────────────────────────────────────

const st: Record<string, React.CSSProperties> = {
  shell: {
    display:       'flex',
    flexDirection: 'column',
    height:        '100dvh',
    maxWidth:      820,
    margin:        '0 auto',
    background:    '#faf6ef',
    borderLeft:    '1px solid #ebe5d8',
    borderRight:   '1px solid #ebe5d8',
  },

  // Header
  header: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        '12px 20px',
    borderBottom:   '1px solid #ebe5d8',
    flexShrink:     0,
    background:     '#fff',
    gap:            12,
    flexWrap:       'wrap' as const,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const },
  logoMark: {
    width:          36,
    height:         36,
    borderRadius:   10,
    background:     '#1a1815',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    boxShadow:      '0 1px 4px rgba(0,0,0,0.12)',
    flexShrink:     0,
  },
  title: { fontWeight: 500, fontSize: 14, color: '#1a1815', letterSpacing: '0.06em' },
  subtitle: { color: '#a09888', fontSize: 10, marginTop: 2, letterSpacing: '0.05em' },
  chainBadge: {
    display:      'flex',
    alignItems:   'center',
    gap:          5,
    border:       '1px solid',
    borderRadius: 6,
    padding:      '3px 8px',
  },
  chainDot: { width: 5, height: 5, borderRadius: '50%', flexShrink: 0 },
  statusPill: {
    display:      'flex',
    alignItems:   'center',
    gap:          6,
    background:   '#f5f0e6',
    border:       '1px solid #ebe5d8',
    borderRadius: 20,
    padding:      '4px 10px',
  },
  statusText: { fontSize: 10, color: '#8a8070', fontWeight: 500, letterSpacing: '0.05em' },
  dot: { width: 7, height: 7, borderRadius: '50%', flexShrink: 0 },

  // Messages
  messages: {
    flex:          1,
    overflowY:     'auto',
    padding:       '28px 20px 12px',
    display:       'flex',
    flexDirection: 'column',
    gap:           20,
  },
  agentRow: { display: 'flex', alignItems: 'flex-start', gap: 10 },
  userRow:  { display: 'flex', justifyContent: 'flex-end' },
  avatar: {
    width:          30,
    height:         30,
    borderRadius:   8,
    background:     '#1a1815',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    fontSize:       11,
    fontWeight:     500,
    flexShrink:     0,
    color:          '#fff',
    userSelect:     'none',
    boxShadow:      '0 1px 4px rgba(0,0,0,0.1)',
    letterSpacing:  '0.08em',
  },
  agentBubble: {
    background:   '#fff',
    border:       '1px solid #ebe5d8',
    borderRadius: '4px 14px 14px 14px',
    padding:      '12px 15px',
    maxWidth:     600,
    fontSize:     13.5,
    lineHeight:   1.75,
    color:        '#3a3530',
    wordBreak:    'break-word',
    boxShadow:    '0 1px 3px rgba(0,0,0,0.04)',
  },
  userBubble: {
    background:   '#1a1815',
    borderRadius: '14px 4px 14px 14px',
    padding:      '12px 15px',
    maxWidth:     480,
    fontSize:     13.5,
    lineHeight:   1.7,
    color:        '#faf6ef',
    wordBreak:    'break-word',
    boxShadow:    '0 2px 8px rgba(0,0,0,0.1)',
  },
  cursor: {
    display:    'inline-block',
    animation:  'blink 1s step-end infinite',
    marginLeft: 2,
    color:      '#1a1815',
    fontSize:   14,
  },
  msgTime: {
    fontSize:  10,
    color:     '#c0b8a8',
    marginTop: 6,
    textAlign: 'right' as const,
  },

  // Suggestions
  suggestions: {
    display:    'flex',
    flexWrap:   'wrap' as const,
    gap:        8,
    padding:    '0 20px 14px',
    flexShrink: 0,
  },
  chip: {
    background:   '#fff',
    border:       '1px solid #e0d8cc',
    borderRadius: 20,
    padding:      '7px 14px',
    color:        '#5a5248',
    fontSize:     12,
    cursor:       'pointer',
    transition:   'all 0.15s',
    fontFamily:   'inherit',
  },

  // Input bar
  bar: {
    padding:    '10px 20px 14px',
    borderTop:  '1px solid #ebe5d8',
    flexShrink: 0,
    background: '#fff',
  },
  inputWrapper: {
    display:      'flex',
    alignItems:   'flex-end',
    gap:          8,
    background:   '#faf6ef',
    border:       '1px solid #e0d8cc',
    borderRadius: 14,
    padding:      '8px 8px 8px 14px',
    transition:   'border-color 0.15s, box-shadow 0.15s',
  },
  input: {
    flex:       1,
    background: 'transparent',
    border:     'none',
    color:      '#1a1815',
    fontSize:   13.5,
    lineHeight: 1.6,
    resize:     'none' as const,
    fontFamily: 'inherit',
    minHeight:  26,
    maxHeight:  160,
    overflowY:  'auto' as const,
    padding:    '3px 0',
  },
  send: {
    background:      '#1a1815',
    border:          'none',
    borderRadius:    22,
    width:           36,
    height:          36,
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    color:           '#fff',
    cursor:          'pointer',
    flexShrink:      0,
    transition:      'all 0.15s',
    boxShadow:       '0 1px 4px rgba(0,0,0,0.1)',
  },
  spinner: {
    display:      'inline-block',
    width:        14,
    height:       14,
    border:       '2px solid rgba(255,255,255,0.3)',
    borderTop:    '2px solid #fff',
    borderRadius: '50%',
    animation:    'spin 0.7s linear infinite',
  },
  hint: {
    fontSize:  10.5,
    color:     '#b8b0a0',
    marginTop: 6,
    textAlign: 'center' as const,
  },
  code: {
    background:   '#f0eadf',
    borderRadius: 5,
    padding:      '1px 5px',
    fontFamily:   '"Geist Mono", "SF Mono", monospace',
    fontSize:     11.5,
    color:        '#7a6a50',
    border:       '1px solid #e6ddd0',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
  },
  link: {
    color:          '#7c3aed',
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
    fontWeight:     500,
    cursor:         'pointer',
  },

  // API panel
  apiPanel: {
    margin:       '0 20px 14px',
    border:       '1px solid #ebe5d8',
    borderRadius: 12,
    overflow:     'hidden',
    flexShrink:   0,
    background:   '#fff',
    boxShadow:    '0 1px 3px rgba(0,0,0,0.04)',
  },
  apiHeader: {
    display:      'flex',
    alignItems:   'center',
    gap:          10,
    padding:      '9px 14px',
    background:   '#f8f3ea',
    borderBottom: '1px solid #ebe5d8',
  },
  apiTag: {
    background:     '#1a1815',
    color:          '#faf6ef',
    fontSize:       9.5,
    fontWeight:     400,
    padding:        '2px 7px',
    borderRadius:   4,
    letterSpacing:  '0.1em',
    fontFamily:     '"Geist Mono", monospace',
    textTransform:  'uppercase' as const,
  },
  apiTitle: { fontSize: 12, color: '#8a8070', fontWeight: 400 },
  apiBody:  { padding: '12px 14px', display: 'flex', flexDirection: 'column' as const, gap: 8 },
  apiRow:   { display: 'flex', alignItems: 'center', gap: 8 },
  apiMethod: {
    background:     '#e8f5ee',
    color:          '#1a7a42',
    fontSize:       9.5,
    fontWeight:     400,
    padding:        '2px 7px',
    borderRadius:   4,
    letterSpacing:  '0.1em',
    fontFamily:     '"Geist Mono", monospace',
    textTransform:  'uppercase' as const,
  },
  apiUrl:     { fontFamily: '"Geist Mono", monospace', fontSize: 12, color: '#6a6050' },
  apiMeta:    { fontSize: 11, color: '#a09888' },
  inlineCode: { fontFamily: '"Geist Mono", monospace', fontSize: 10.5, color: '#8a8070' },
  codeBlock: {
    position:     'relative' as const,
    background:   '#f5f0e6',
    border:       '1px solid #ebe5d8',
    borderRadius: 8,
    overflow:     'hidden',
  },
  pre: {
    padding:    '12px 14px',
    fontSize:   11.5,
    fontFamily: '"Geist Mono", "SF Mono", monospace',
    color:      '#6a6050',
    lineHeight: 1.75,
    whiteSpace: 'pre' as const,
    overflowX:  'auto' as const,
    margin:     0,
  },
  copyBtn: {
    position:     'absolute' as const,
    top:          8,
    right:        8,
    background:   '#fff',
    border:       '1px solid #e0d8cc',
    borderRadius: 6,
    color:        '#8a8070',
    fontSize:     10.5,
    padding:      '3px 8px',
    cursor:       'pointer',
    fontFamily:   'inherit',
  },
}
