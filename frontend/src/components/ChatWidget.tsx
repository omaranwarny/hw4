import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import {
  clearChatHistory,
  fetchChatHistory,
  pageContextFrom,
  sendChat,
  type ProductSummary,
} from '../api.ts'
import { useAuth } from '../auth.tsx'
import { useChatResults } from '../chatResults.tsx'
import Markdown from './Markdown.tsx'
import Bulldog from './Bulldog.tsx'
import ProductCard from './ProductCard.tsx'

type Msg = { role: 'user' | 'assistant'; content: string; products?: ProductSummary[]; onPage?: number; saved?: boolean }

const greeting = (name?: string, returning = false): Msg => ({
  role: 'assistant',
  content: returning
    ? `Welcome back${name ? `, ${name}` : ''}! Here's where we left off. What can I help you find today?`
    : `Hi${name ? ` ${name}` : ''}! I'm the Campus Customs assistant. Ask me about hoodies, college crests, sizes, stock, or gift ideas.`,
})

// Problem 9: one-tap questions that change with the page.
function suggestionsFor(pathname: string): string[] {
  if (/^\/products\/[^/]+$/.test(pathname)) {
    return ['Is this in stock in M?', 'What colors does this come in?', 'Show me similar items']
  }
  if (pathname === '/products') return ["What's under $40?", 'Crewnecks in XL', 'Best gift for Dad?']
  return ['What hoodies do you have?', 'Gift for Mom under $60', 'Show me Saybrook gear']
}

/** Open the chat from anywhere: window.dispatchEvent(new CustomEvent('cc:open-chat', { detail: { ask?: string } })) */
export function openChat(ask?: string) {
  window.dispatchEvent(new CustomEvent('cc:open-chat', { detail: { ask } }))
}

export default function ChatWidget() {
  const { user, ready } = useAuth()
  const { results, show } = useChatResults()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([greeting()])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy, open])
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // Logged in: reload saved history from the database. Guest: fresh chat (kept only in this tab).
  useEffect(() => {
    if (!ready) return
    let alive = true
    if (!user) {
      setMessages([greeting()])
      return
    }
    setLoadingHistory(true)
    fetchChatHistory()
      .then((h) => {
        if (!alive) return
        const past: Msg[] = h.map((m) => ({
          role: m.role,
          content: m.content,
          products: m.products.slice(0, 3),
          saved: true,
        }))
        setMessages(past.length ? [...past, greeting(user.first_name, true)] : [greeting(user.first_name)])
      })
      .catch(() => alive && setMessages([greeting(user.first_name)]))
      .finally(() => alive && setLoadingHistory(false))
    return () => {
      alive = false
    }
  }, [ready, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // "Ask about this item" (and other buttons) can open the chat, optionally sending a question.
  useEffect(() => {
    const onOpen = (e: Event) => {
      setOpen(true)
      const ask = (e as CustomEvent<{ ask?: string }>).detail?.ask
      if (ask) void send(ask)
    }
    window.addEventListener('cc:open-chat', onOpen)
    return () => window.removeEventListener('cc:open-chat', onOpen)
  })

  async function onSend(e: FormEvent) {
    e.preventDefault()
    const msg = text.trim()
    if (!msg || busy) return
    setText('')
    await send(msg)
  }

  async function send(msg: string) {
    if (busy) return
    // Guests send their recent turns; logged-in history is loaded on the server from the database.
    const history = user
      ? []
      : messages.filter((m, i) => !(i === 0 && m.role === 'assistant')).map(({ role, content }) => ({ role, content }))
    // Page context: which page / product they're looking at, and what the assistant already put on screen.
    const page = pageContextFrom(location.pathname, location.search, results?.products.map((p) => p.product_id) ?? [])
    setMessages((m) => [...m, { role: 'user', content: msg }])
    setBusy(true)
    const r = await sendChat(msg, history, page)
    // Contract: products in the reply go onto the page (AssistantResults); the chat keeps a short preview.
    if (r.products.length > 0) {
      show({ title: r.results_title || 'Picked for you', products: r.products, seeAll: r.see_all ?? null, question: msg })
    }
    setMessages((m) => [...m, { role: 'assistant', content: r.reply, products: r.products.slice(0, 3), onPage: r.products.length }])
    setBusy(false)
  }

  async function onClear() {
    if (!user || !window.confirm('Delete your saved chat history? This can’t be undone.')) return
    await clearChatHistory()
    setMessages([greeting(user.first_name)])
  }

  const viewing = location.pathname.match(/^\/products\/[^/]+$/)

  return (
    <div className="chat-root">
      {open && (
        <section className="chat-panel" aria-label="Shop assistant chat">
          <header className="chat-head">
            <Bulldog size={40} />
            <div className="chat-head-text">
              <strong>Campus Customs Assistant</strong>
              <small>
                {user ? `Chatting as ${user.first_name} · history saved` : 'Guest chat · log in to save it'}
              </small>
            </div>
            <div className="chat-head-actions">
              {user && (
                <button className="chat-clear" onClick={onClear} title="Delete saved chat history">
                  Clear
                </button>
              )}
              <button className="chat-x" onClick={() => setOpen(false)} aria-label="Close chat">×</button>
            </div>
          </header>

          <div className="chat-body" aria-live="polite">
            {loadingHistory && <p className="muted small center">Loading your saved chat…</p>}
            {messages.map((m, i) => (
              <div key={i} className={`bubble-row ${m.role}${m.saved ? ' saved' : ''}`}>
                {m.role === 'assistant' && <span className="bubble-avatar"><Bulldog size={26} /></span>}
                <div className={`bubble ${m.role}`}>
                  {m.role === 'assistant' ? <Markdown text={m.content} /> : m.content}
                </div>
                {m.products && m.products.length > 0 && (
                  <div className="chat-products">
                    {m.products.map((p) => <ProductCard key={p.product_id} p={p} compact />)}
                    {m.onPage ? (
                      <button
                        className="link-btn small"
                        onClick={() => document.querySelector('.assist')?.scrollIntoView({ behavior: 'smooth' })}
                      >
                        {m.onPage} {m.onPage === 1 ? 'item' : 'items'} shown on the page ↑
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div className="bubble-row assistant">
                <span className="bubble-avatar"><Bulldog size={26} /></span>
                <div className="bubble assistant typing" aria-label="Assistant is typing">
                  <span className="paw">🐾</span><span className="paw">🐾</span><span className="paw">🐾</span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {!busy && !loadingHistory && (
            <div className="chat-suggest" role="group" aria-label="Suggested questions">
              {suggestionsFor(location.pathname).map((q) => (
                <button key={q} type="button" className="suggest-chip" onClick={() => void send(q)}>
                  {q}
                </button>
              ))}
            </div>
          )}
          {viewing && <p className="chat-context">💡 Ask about “this” item, and I’ll know which product you’re viewing.</p>}
          <form className="chat-input" onSubmit={onSend}>
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={viewing ? 'e.g. Do you have this in XL?' : 'Ask about merch…'}
              maxLength={1000}
              aria-label="Message"
            />
            <button className="btn btn-small" type="submit" disabled={busy || !text.trim()}>Send</button>
          </form>
        </section>
      )}

      <button
        className="chat-fab"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? 'Close chat' : 'Open chat'}
      >
        {open ? <span className="fab-x">×</span> : <Bulldog size={48} />}
        {!open && <span className="fab-label">Ask the shop</span>}
      </button>
    </div>
  )
}
