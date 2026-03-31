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

export default function ChatPage() {
  const [messages, setMessages]   = useState<Message[]>([
    {
      role: 'agent',
      text: "🏠 Hi! I'm *Casa*, your autonomous home shopping agent.\n\nJust tell me what you need and I'll order it for you — no commands needed.\n\nTry: _\"order me Hocco ice cream sandwich\"_",
    },
  ])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [online, setOnline]       = useState<boolean | null>(null)
  const bottomRef                 = useRef<HTMLDivElement>(null)
  const inputRef                  = useRef<HTMLInputElement>(null)

  // Health-check the agent on mount
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

    // Placeholder agent message we'll stream into
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

  return (
    <div style={s.shell}>
      {/* ── Header ── */}
      <header style={s.header}>
        <div style={s.headerLeft}>
          <span style={s.logo}>🏠</span>
          <div>
            <div style={s.title}>Casa</div>
            <div style={s.subtitle}>Autonomous Home Agent</div>
          </div>
        </div>
        <div style={{ ...s.dot, background: online === true ? '#22c55e' : online === false ? '#ef4444' : '#555' }}
             title={online === true ? 'Agent online' : online === false ? 'Agent offline' : 'Checking...'} />
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
            <button key={s2} style={s.chip} onClick={() => send(s2)}>
              {s2}
            </button>
          ))}
        </div>
      )}

      {/* ── Input bar ── */}
      <form onSubmit={onSubmit} style={s.bar}>
        <input
          ref={inputRef}
          style={s.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Order something, ask anything…"
          disabled={loading}
          autoFocus
        />
        <button
          type="submit"
          style={{ ...s.send, opacity: !input.trim() || loading ? 0.4 : 1 }}
          disabled={!input.trim() || loading}
        >
          {loading ? (
            <span style={s.spinner} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </form>
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
          return <em key={i} style={{ color: '#a0a0c0' }}>{p.slice(1, -1)}</em>
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
    maxWidth:      740,
    margin:        '0 auto',
    fontFamily:    '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  header: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        '14px 20px',
    borderBottom:   '1px solid #1e1e26',
    flexShrink:     0,
  },
  headerLeft: {
    display:    'flex',
    alignItems: 'center',
    gap:        12,
  },
  logo:     { fontSize: 26 },
  title:    { fontWeight: 700, fontSize: 17, letterSpacing: '-0.01em' },
  subtitle: { color: '#555', fontSize: 12, marginTop: 1 },
  dot: {
    width:        8,
    height:       8,
    borderRadius: '50%',
    flexShrink:   0,
  },
  messages: {
    flex:          1,
    overflowY:     'auto',
    padding:       '24px 16px 8px',
    display:       'flex',
    flexDirection: 'column',
    gap:           18,
  },
  agentRow: {
    display:    'flex',
    alignItems: 'flex-start',
    gap:        10,
    animation:  'fadeIn 0.2s ease',
  },
  userRow: {
    display:        'flex',
    justifyContent: 'flex-end',
    animation:      'fadeIn 0.15s ease',
  },
  avatar: {
    width:           32,
    height:          32,
    borderRadius:    8,
    background:      '#1e1e28',
    border:          '1px solid #2a2a36',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    fontSize:        13,
    fontWeight:      700,
    flexShrink:      0,
    color:           '#8080a0',
    userSelect:      'none',
  },
  agentBubble: {
    background:   '#141418',
    border:       '1px solid #222230',
    borderRadius: '4px 14px 14px 14px',
    padding:      '10px 14px',
    maxWidth:     560,
    fontSize:     14,
    lineHeight:   1.65,
    color:        '#d8d8ee',
    wordBreak:    'break-word',
  },
  userBubble: {
    background:   '#4f46e5',
    borderRadius: '14px 4px 14px 14px',
    padding:      '10px 14px',
    maxWidth:     460,
    fontSize:     14,
    lineHeight:   1.65,
    color:        '#fff',
    wordBreak:    'break-word',
  },
  cursor: {
    display:   'inline-block',
    animation: 'blink 1s step-end infinite',
    marginLeft: 2,
    color:      '#666',
    fontSize:   12,
  },
  suggestions: {
    display:   'flex',
    flexWrap:  'wrap',
    gap:       8,
    padding:   '0 16px 16px',
    flexShrink: 0,
  },
  chip: {
    background:   '#18181e',
    border:       '1px solid #2a2a38',
    borderRadius: 20,
    padding:      '7px 14px',
    color:        '#a0a0c0',
    fontSize:     13,
    cursor:       'pointer',
    transition:   'border-color 0.15s, color 0.15s',
  },
  bar: {
    display:    'flex',
    gap:        8,
    padding:    '12px 16px',
    borderTop:  '1px solid #1e1e26',
    flexShrink: 0,
  },
  input: {
    flex:         1,
    background:   '#141418',
    border:       '1px solid #2a2a36',
    borderRadius: 12,
    padding:      '12px 16px',
    color:        '#fff',
    fontSize:     14,
    transition:   'border-color 0.15s',
  },
  send: {
    background:      '#4f46e5',
    border:          'none',
    borderRadius:    12,
    width:           46,
    height:          46,
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    color:           '#fff',
    cursor:          'pointer',
    flexShrink:      0,
    transition:      'opacity 0.15s',
  },
  spinner: {
    display:      'inline-block',
    width:        16,
    height:       16,
    border:       '2px solid rgba(255,255,255,0.3)',
    borderTop:    '2px solid #fff',
    borderRadius: '50%',
    animation:    'spin 0.7s linear infinite',
  },
  code: {
    background:   '#1e1e2a',
    borderRadius: 4,
    padding:      '1px 5px',
    fontFamily:   '"SF Mono", "Fira Code", monospace',
    fontSize:     12,
    color:        '#a0c0ff',
  },
}
