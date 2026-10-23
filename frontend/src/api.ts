// Typed helpers for the Campus Customs backend (FastAPI on :8000, proxied by Vite).

export type ProductSummary = {
  product_id: string
  name: string
  category: string
  garment_type: string
  price: number
  short_description: string
  colors: string[]
  image_url: string
  total_stock: number
  sizes_in_stock: string[]
}

export type SizeStock = { size: string; quantity: number; status: 'in stock' | 'low' | 'sold out' }

export type ProductDetail = ProductSummary & {
  description: string
  search_tags: string[]
  inventory: SizeStock[]
}

export type SeeAll = { q: string; category: string | null; total_matches: number }

// API contract for /api/chat. When `products` is not empty, the page shows them under `results_title`.
export type ChatReply = {
  reply: string
  results_title?: string | null
  products: ProductSummary[]
  see_all?: SeeAll | null
  stub: boolean
}

async function getJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    const err = new Error(res.status === 404 ? 'Not found' : `Request failed (${res.status})`)
    ;(err as Error & { status?: number }).status = res.status
    throw err
  }
  return res.json() as Promise<T>
}

export const formatPrice = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

export function fetchCategories() {
  return getJSON<string[]>('/api/categories')
}

export function fetchProducts(params: { q?: string; category?: string } = {}) {
  const qs = new URLSearchParams()
  if (params.q) qs.set('q', params.q)
  if (params.category && params.category !== 'All') qs.set('category', params.category)
  const s = qs.toString()
  return getJSON<ProductSummary[]>(`/api/products${s ? `?${s}` : ''}`)
}

export function fetchProduct(id: string) {
  return getJSON<ProductDetail>(`/api/products/${encodeURIComponent(id)}`)
}

// Chat: sends the new message plus recent turns; the backend runs the PydanticAI agent.
export type ChatTurn = { role: 'user' | 'assistant'; content: string }

// Where the shopper is when they send a message, so "do you have this in pink?" means the product on screen.
export type PageContext = {
  path: string
  page_type: 'home' | 'products' | 'product' | 'about' | 'login' | 'signup' | 'other'
  product_id?: string | null
  search?: string | null
  category?: string | null
  on_page_product_ids?: string[]
}

export function pageContextFrom(pathname: string, search: string, onPageIds: string[] = []): PageContext {
  const params = new URLSearchParams(search)
  const m = pathname.match(/^\/products\/([^/]+)$/)
  const page_type: PageContext['page_type'] = m
    ? 'product'
    : pathname === '/' ? 'home'
    : pathname === '/products' ? 'products'
    : pathname === '/about' ? 'about'
    : pathname === '/login' ? 'login'
    : pathname === '/signup' ? 'signup'
    : 'other'
  return {
    path: pathname.slice(0, 200),
    page_type,
    product_id: m ? decodeURIComponent(m[1]) : null,
    search: params.get('q'),
    category: params.get('category'),
    on_page_product_ids: onPageIds.slice(0, 12),
  }
}

export type HistoryMessage = { role: 'user' | 'assistant'; content: string; products: ProductSummary[]; created_at: string }

export async function fetchChatHistory(): Promise<HistoryMessage[]> {
  return getJSON<HistoryMessage[]>('/api/chat/history', { credentials: 'same-origin' })
}

export async function clearChatHistory(): Promise<void> {
  await fetch('/api/chat/history', { method: 'DELETE', credentials: 'same-origin' })
}

export async function sendChat(message: string, history: ChatTurn[] = [], page?: PageContext): Promise<ChatReply> {
  try {
    return await getJSON<ChatReply>('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ message, history: history.slice(-10), page }),
    })
  } catch {
    return {
      reply: "I can't reach the shop right now. Please make sure the backend is running and try again.",
      products: [],
      stub: true,
    }
  }
}

// ---------------------------------------------------------------------------
// Accounts. The session lives in an HttpOnly cookie the browser sends automatically;
// this code never sees or stores a token or password.
// ---------------------------------------------------------------------------
export type User = { id: number; first_name: string; last_name: string; name: string; email: string; member_since?: string }

async function authCall(url: string, body?: unknown): Promise<{ user: User | null }> {
  const res = await fetch(url, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const d = (data as { detail?: unknown }).detail
    const msg = typeof d === 'string' ? d : res.status === 422 ? 'Please check the form and try again.' : 'Something went wrong. Please try again.'
    throw new Error(msg)
  }
  return data as { user: User | null }
}

export const apiMe = () => authCall('/api/auth/me')
export const apiLogin = (email: string, password: string) => authCall('/api/auth/login', { email, password })
export const apiSignup = (b: { first_name: string; last_name: string; email: string; password: string }) =>
  authCall('/api/auth/signup', b)
export const apiLogout = () => authCall('/api/auth/logout', {})
