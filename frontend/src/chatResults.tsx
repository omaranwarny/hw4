import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import type { ProductSummary, SeeAll } from './api.ts'

// Shared store for products the chat assistant found. The ChatWidget writes it;
// the <AssistantResults> section (on every page) reads it and renders product cards.
export type ChatResults = {
  title: string
  products: ProductSummary[]
  seeAll: SeeAll | null
  question: string
  version: number // bumps on every new result set (used to scroll + animate)
}

type Ctx = {
  results: ChatResults | null
  show: (r: Omit<ChatResults, 'version'>) => void
  clear: () => void
}

const ChatResultsContext = createContext<Ctx | null>(null)

export function ChatResultsProvider({ children }: { children: ReactNode }) {
  const [results, setResults] = useState<ChatResults | null>(null)
  const show = useCallback((r: Omit<ChatResults, 'version'>) => {
    setResults((prev) => ({ ...r, version: (prev?.version ?? 0) + 1 }))
  }, [])
  const clear = useCallback(() => setResults(null), [])
  return <ChatResultsContext.Provider value={{ results, show, clear }}>{children}</ChatResultsContext.Provider>
}

export function useChatResults(): Ctx {
  const ctx = useContext(ChatResultsContext)
  if (!ctx) throw new Error('useChatResults must be used inside <ChatResultsProvider>')
  return ctx
}
