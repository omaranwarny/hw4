import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useChatResults } from '../chatResults.tsx'
import ProductCard from './ProductCard.tsx'

// "Assistant picks": products the chat found, shown on the page itself.
// Uses the same ProductCard as the Products grid, so every card opens /products/:id.
export default function AssistantResults() {
  const { results, clear } = useChatResults()
  const { pathname } = useLocation()
  const onDetailPage = /^\/products\/[^/]+$/.test(pathname)
  const [collapsed, setCollapsed] = useState(false)
  const ref = useRef<HTMLElement>(null)

  // New results: expand, scroll into view, flash.
  useEffect(() => {
    if (!results) return
    setCollapsed(false)
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [results?.version]) // eslint-disable-line react-hooks/exhaustive-deps

  // While looking at a single product, tuck the results away (one click to reopen).
  useEffect(() => {
    if (onDetailPage) setCollapsed(true)
  }, [pathname, onDetailPage])

  if (!results || results.products.length === 0) return null
  const { title, products, seeAll, question, version } = results
  const seeAllHref = seeAll
    ? `/products?${new URLSearchParams({ ...(seeAll.q ? { q: seeAll.q } : {}), ...(seeAll.category ? { category: seeAll.category } : {}) })}`
    : null

  return (
    <section ref={ref} key={version} className={`assist ${collapsed ? 'collapsed' : 'fresh'}`} aria-label="Assistant picks">
      <div className="assist-inner">
        <header className="assist-head">
          <div>
            <p className="eyebrow">💬 Assistant picks</p>
            <h2>
              {title} <span className="assist-count">{products.length}</span>
            </h2>
            {!collapsed && question && <p className="muted small">From your question: “{question}”</p>}
          </div>
          <div className="assist-actions">
            {seeAllHref && !collapsed && (
              <Link to={seeAllHref} className="btn btn-small btn-ghost">
                See all {seeAll!.total_matches}
              </Link>
            )}
            <button className="btn btn-small btn-ghost" onClick={() => setCollapsed((c) => !c)} aria-expanded={!collapsed}>
              {collapsed ? 'Show' : 'Hide'}
            </button>
            <button className="assist-x" onClick={clear} aria-label="Clear assistant picks">×</button>
          </div>
        </header>

        {!collapsed && (
          <div className="product-grid assist-grid">
            {products.map((p) => (
              <ProductCard key={p.product_id} p={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
