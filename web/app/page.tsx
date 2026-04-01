'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'

interface Message {
  role:       'user' | 'agent'
  text:       string
  streaming?: boolean
}

const SUGGESTIONS = [
  'Order me Hocco ice cream sandwich',
  'Find Amul butter 500g',
  "What's my budget left?",
  'Order milk, eggs and bread',
]

const AGENT_API = process.env.NEXT_PUBLIC_AGENT_URL ?? 'http://localhost:3001'

export default function ChatPage() {
  const [messages, setMessages]   = useState<Message[]>([
    {
      role: 'agent',
      text: "Hi! I'm *Maid402*, your autonomous home shopping agent.\n\nJust tell me what you need and I'll order it for you — no commands needed.\n\nTry: _\"order me Hocco ice cream sandwich\"_",
    },
  ])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [online, setOnline]       = useState<boolean | null>(null)
  const bottomRef                 = useRef<HTMLDivElement>(null)
  const inputRef                  = useRef<HTMLTextAreaElement>(null)

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

    setMessages(m => [...m, { role: 'user', text: text.trim() }])
    setLoading(true)

    setMessages(m => [...m, { role: 'agent', text: '', streaming: true }])

    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: text.trim() }),
      })

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`)
      }

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
          } catch { /* ignore malformed chunk */ }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setMessages(m => {
        const msgs = [...m]
        msgs[msgs.length - 1] = {
          role: 'agent',
          text: `❌ ${online === false ? 'Agent is offline. Run `pnpm dev` in the project root.' : `Error: ${msg}`}`,
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

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    send(input)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  return (
    <div style={s.shell}>
      {/* ── Header ── */}
      <header style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.logoMark}>
            <span style={{ fontSize: 18 }}>🏠</span>
          </div>
          <div>
            <div style={s.title}>Maid402</div>
            <div style={s.subtitle}>Autonomous Home Agent</div>
          </div>
        </div>
        <div style={s.headerRight}>
          <div style={s.statusPill}>
            <div style={{
              ...s.dot,
              background: online === true ? '#2d9e5f' : online === false ? '#e05252' : '#aaa',
              animation: online === null ? 'pulseGlow 1.5s ease-in-out infinite' : 'none',
            }} />
            <span style={s.statusText}>
              {online === true ? 'Online' : online === false ? 'Offline' : 'Connecting…'}
            </span>
          </div>
        </div>
      </header>

      {/* ── Messages ── */}
      <div style={s.messages}>
        {messages.map((msg, i) => (
          <div key={i} style={msg.role === 'user' ? s.userRow : s.agentRow}
               className="msg-row">
            {msg.role === 'agent' && (
              <div style={s.avatar}>C</div>
            )}
            <div style={msg.role === 'user' ? s.userBubble : s.agentBubble}>
              <MsgText text={msg.text} />
              {msg.streaming && (
                <span style={s.cursor}>▋</span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ── Suggestions (only shown when no conversation yet) ── */}
      {messages.length === 1 && (
        <div style={s.suggestions}>
          {SUGGESTIONS.map(s2 => (
            <button key={s2} style={s.chip} className="suggestion-chip" onClick={() => send(s2)}>
              {s2}
            </button>
          ))}
        </div>
      )}

      {/* ── x402 API info panel ── */}
      {messages.length === 1 && <ApiInfoPanel />}

      {/* ── Input bar ── */}
      <form onSubmit={onSubmit} style={s.bar}>
        <div style={s.inputWrapper}>
          <textarea
            ref={inputRef}
            style={s.input}
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
            style={{ ...s.send, opacity: !input.trim() || loading ? 0.45 : 1 }}
            className="send-btn"
            disabled={!input.trim() || loading}
          >
            {loading ? (
              <span style={s.spinner} />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
        <p style={s.hint}>Enter to send · Shift+Enter for new line</p>
      </form>
    </div>
  )
}

// ── x402 API info panel ──────────────────────────────────────────────

function ApiInfoPanel() {
  const [copied, setCopied] = useState(false)
  const endpoint = `${AGENT_API}/api/order`

  const curlExample =
`curl -X POST ${endpoint} \\
  -H "Content-Type: application/json" \\
  -d '{"item": "Amul milk 1L"}'
# → 402 Payment Required (1 USDC on Base Sepolia)
# Retry with X-PAYMENT header after signing`

  function copy() {
    navigator.clipboard.writeText(curlExample)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={s.apiPanel}>
      <div style={s.apiHeader}>
        <span style={s.apiTag}>x402</span>
        <span style={s.apiTitle}>Public paid API — anyone can order</span>
      </div>
      <div style={s.apiBody}>
        <div style={s.apiRow}>
          <span style={s.apiMethod}>POST</span>
          <code style={s.apiUrl}>{endpoint}</code>
        </div>
        <div style={s.apiMeta}>
          1 USDC · Base Sepolia · USDC contract: <code style={s.inlineCode}>0x036C…7e</code>
        </div>
        <div style={s.codeBlock}>
          <pre style={s.pre}>{curlExample}</pre>
          <button style={s.copyBtn} onClick={copy}>{copied ? '✓ copied' : 'copy'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Markdown-lite renderer ────────────────────────────────────────────

function MsgText({ text }: { text: string }) {
  if (!text) return null

  return (
    <>
      {text.split('\n').map((line, li, lines) => (
        <span key={li}>
          <InlineText text={line} />
          {li < lines.length - 1 && <br />}
        </span>
      ))}
    </>
  )
}

function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\*[^*]+\*|_[^_]+_|`[^`]+`)/)
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('*') && p.endsWith('*') && p.length > 2)
          return <strong key={i}>{p.slice(1, -1)}</strong>
        if (p.startsWith('_') && p.endsWith('_') && p.length > 2)
          return <em key={i} style={{ color: '#7a6a5a' }}>{p.slice(1, -1)}</em>
        if (p.startsWith('`') && p.endsWith('`') && p.length > 2)
          return <code key={i} style={s.code}>{p.slice(1, -1)}</code>
        return <span key={i}>{p}</span>
      })}
    </>
  )
}

// ── Styles ────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  shell: {
    display:       'flex',
    flexDirection: 'column',
    height:        '100dvh',
    maxWidth:      780,
    margin:        '0 auto',
    fontFamily:    "'Styrene A Web', 'Styrene A', ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Helvetica, Arial, sans-serif",
    background:    '#f5f0e8',
  },

  // ── Header
  header: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        '13px 24px',
    borderBottom:   '1px solid #e4ddd0',
    flexShrink:     0,
    background:     '#faf7f2',
  },
  headerLeft: {
    display:    'flex',
    alignItems: 'center',
    gap:        12,
  },
  headerRight: {
    display:    'flex',
    alignItems: 'center',
    gap:        12,
  },
  logoMark: {
    width:           36,
    height:          36,
    borderRadius:    10,
    background:      'linear-gradient(135deg, #d4a76a 0%, #c08b4a 100%)',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    boxShadow:       '0 1px 3px rgba(192,139,74,0.35)',
    flexShrink:      0,
  },
  title: {
    fontWeight:    600,
    fontSize:      15,
    letterSpacing: '-0.01em',
    color:         '#1a1915',
  },
  subtitle: {
    color:    '#9b8b7a',
    fontSize: 11.5,
    marginTop: 1,
  },
  statusPill: {
    display:      'flex',
    alignItems:   'center',
    gap:          6,
    background:   '#f0ebe0',
    border:       '1px solid #e4ddd0',
    borderRadius: 20,
    padding:      '4px 10px',
  },
  statusText: {
    fontSize:   11.5,
    color:      '#7a6a5a',
    fontWeight: 500,
  },
  dot: {
    width:        7,
    height:       7,
    borderRadius: '50%',
    flexShrink:   0,
  },

  // ── Messages
  messages: {
    flex:          1,
    overflowY:     'auto',
    padding:       '32px 24px 16px',
    display:       'flex',
    flexDirection: 'column',
    gap:           24,
  },
  agentRow: {
    display:    'flex',
    alignItems: 'flex-start',
    gap:        12,
    animation:  'fadeIn 0.2s ease',
  },
  userRow: {
    display:        'flex',
    justifyContent: 'flex-end',
    animation:      'fadeIn 0.15s ease',
  },
  avatar: {
    width:           34,
    height:          34,
    borderRadius:    10,
    background:      'linear-gradient(135deg, #d4a76a 0%, #c08b4a 100%)',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    fontSize:        13,
    fontWeight:      700,
    flexShrink:      0,
    color:           '#fff',
    userSelect:      'none',
    boxShadow:       '0 1px 3px rgba(192,139,74,0.3)',
  },
  agentBubble: {
    background:   '#faf7f2',
    border:       '1px solid #e8e0d0',
    borderRadius: '4px 16px 16px 16px',
    padding:      '12px 16px',
    maxWidth:     600,
    fontSize:     14.5,
    lineHeight:   1.7,
    color:        '#2a2520',
    wordBreak:    'break-word',
    boxShadow:    '0 1px 2px rgba(0,0,0,0.05)',
  },
  userBubble: {
    background:   '#c08b4a',
    borderRadius: '16px 4px 16px 16px',
    padding:      '12px 16px',
    maxWidth:     500,
    fontSize:     14.5,
    lineHeight:   1.7,
    color:        '#fff',
    wordBreak:    'break-word',
    boxShadow:    '0 1px 3px rgba(192,139,74,0.4)',
  },
  cursor: {
    display:    'inline-block',
    animation:  'blink 1s step-end infinite',
    marginLeft: 2,
    color:      '#c08b4a',
    fontSize:   14,
  },

  // ── Suggestions
  suggestions: {
    display:   'flex',
    flexWrap:  'wrap',
    gap:       8,
    padding:   '0 24px 16px',
    flexShrink: 0,
  },
  chip: {
    background:   '#faf7f2',
    border:       '1px solid #e4ddd0',
    borderRadius: 20,
    padding:      '7px 15px',
    color:        '#6a5a4a',
    fontSize:     13,
    cursor:       'pointer',
    transition:   'border-color 0.15s, color 0.15s, background 0.15s',
    fontFamily:   'inherit',
  },

  // ── Input bar
  bar: {
    padding:    '12px 24px 16px',
    borderTop:  '1px solid #e4ddd0',
    flexShrink: 0,
    background: '#faf7f2',
  },
  inputWrapper: {
    display:      'flex',
    alignItems:   'flex-end',
    gap:          8,
    background:   '#fff',
    border:       '1px solid #ddd6c8',
    borderRadius: 16,
    padding:      '8px 8px 8px 16px',
    boxShadow:    '0 1px 4px rgba(0,0,0,0.06)',
    transition:   'border-color 0.15s, box-shadow 0.15s',
  },
  input: {
    flex:       1,
    background: 'transparent',
    border:     'none',
    color:      '#1a1915',
    fontSize:   14.5,
    lineHeight:  1.6,
    resize:     'none' as const,
    fontFamily: 'inherit',
    minHeight:  28,
    maxHeight:  160,
    overflowY:  'auto' as const,
    padding:    '4px 0',
  },
  send: {
    background:      '#c08b4a',
    border:          'none',
    borderRadius:    10,
    width:           38,
    height:          38,
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    color:           '#fff',
    cursor:          'pointer',
    flexShrink:      0,
    transition:      'opacity 0.15s, background 0.15s',
  },
  spinner: {
    display:      'inline-block',
    width:        15,
    height:       15,
    border:       '2px solid rgba(255,255,255,0.35)',
    borderTop:    '2px solid #fff',
    borderRadius: '50%',
    animation:    'spin 0.7s linear infinite',
  },
  hint: {
    fontSize:  11,
    color:     '#b0a090',
    marginTop: 6,
    textAlign: 'center' as const,
  },
  code: {
    background:   '#f0ebe0',
    borderRadius: 5,
    padding:      '1px 5px',
    fontFamily:   '"SF Mono", "Fira Code", monospace',
    fontSize:     12.5,
    color:        '#8a5a2a',
    border:       '1px solid #e4ddd0',
  },

  // ── API panel
  apiPanel: {
    margin:       '0 24px 16px',
    border:       '1px solid #e4ddd0',
    borderRadius: 14,
    overflow:     'hidden',
    flexShrink:   0,
    background:   '#faf7f2',
    boxShadow:    '0 1px 3px rgba(0,0,0,0.05)',
  },
  apiHeader: {
    display:    'flex',
    alignItems: 'center',
    gap:        10,
    padding:    '10px 16px',
    background: '#f5f0e8',
    borderBottom: '1px solid #e4ddd0',
  },
  apiTag: {
    background:    '#c08b4a',
    color:         '#fff',
    fontSize:      10.5,
    fontWeight:    700,
    padding:       '2px 7px',
    borderRadius:  4,
    letterSpacing: '0.06em',
  },
  apiTitle: { fontSize: 13, color: '#8a7a6a', fontWeight: 500 },
  apiBody:  { padding: '12px 16px', display: 'flex', flexDirection: 'column' as const, gap: 8 },
  apiRow:   { display: 'flex', alignItems: 'center', gap: 8 },
  apiMethod: {
    background:    '#1a7a42',
    color:         '#5dd38b',
    fontSize:      10.5,
    fontWeight:    700,
    padding:       '2px 7px',
    borderRadius:  4,
    letterSpacing: '0.06em',
  },
  apiUrl: {
    fontFamily: '"SF Mono", monospace',
    fontSize:   13,
    color:      '#5a4a3a',
  },
  apiMeta:    { fontSize: 12, color: '#9a8a7a' },
  inlineCode: {
    fontFamily: '"SF Mono", monospace',
    fontSize:   11,
    color:      '#7a6a5a',
  },
  codeBlock: {
    position:   'relative' as const,
    background: '#f0ebe0',
    border:     '1px solid #e4ddd0',
    borderRadius: 8,
    overflow:   'hidden',
  },
  pre: {
    padding:    '12px 14px',
    fontSize:   12,
    fontFamily: '"SF Mono", "Fira Code", monospace',
    color:      '#6a5a4a',
    lineHeight: 1.7,
    whiteSpace: 'pre' as const,
    overflowX:  'auto' as const,
    margin:     0,
  },
  copyBtn: {
    position:   'absolute' as const,
    top:        8,
    right:      8,
    background: '#faf7f2',
    border:     '1px solid #e4ddd0',
    borderRadius: 6,
    color:      '#9a8a7a',
    fontSize:   11,
    padding:    '3px 8px',
    cursor:     'pointer',
    fontFamily: 'inherit',
  },
}
