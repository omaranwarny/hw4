import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchCategories, fetchProducts, type ProductSummary } from '../api.ts'
import ProductCard from '../components/ProductCard.tsx'

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const BUDGETS = [
  { value: '', label: 'Any price' },
  { value: '40', label: 'Under $40' },
  { value: '60', label: 'Under $60' },
  { value: '80', label: 'Under $80' },
]
const SORTS = [
  { value: '', label: 'Featured' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'name', label: 'Name: A–Z' },
]

export default function Products() {
  const [params, setParams] = useSearchParams()
  const category = params.get('category') ?? 'All'
  const q = params.get('q') ?? ''
  const size = params.get('size') ?? ''
  const max = params.get('max') ?? ''
  const sort = params.get('sort') ?? ''
  const [search, setSearch] = useState(q)
  const [categories, setCategories] = useState<string[]>([])
  const [products, setProducts] = useState<ProductSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => setSearch(q), [q]) // keep the box in sync when a link (e.g. "See all") changes ?q=

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    let alive = true
    setProducts(null)
    setError(null)
    fetchProducts({ q, category })
      .then((p) => alive && setProducts(p))
      .catch(() => alive && setError('We couldn’t load products. Is the backend running on port 8000?'))
    return () => {
      alive = false
    }
  }, [q, category])

  // Size / budget / sort run in the browser on the loaded list (instant, no extra requests).
  const shown = useMemo(() => {
    if (!products) return null
    let list = products
    if (size) list = list.filter((p) => p.sizes_in_stock.includes(size))
    if (max) list = list.filter((p) => p.price < Number(max))
    if (sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price || a.name.localeCompare(b.name))
    if (sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price || a.name.localeCompare(b.name))
    if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    return list
  }, [products, size, max, sort])

  function update(next: Record<string, string>) {
    const p = new URLSearchParams(params)
    for (const [k, v] of Object.entries(next)) {
      if (v && v !== 'All') p.set(k, v)
      else p.delete(k)
    }
    setParams(p)
  }

  const filtersOn = Boolean(q || size || max || sort || category !== 'All')

  return (
    <section className="section">
      <p className="eyebrow">Shop</p>
      <h1>All products</h1>

      <form
        className="search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          update({ q: search.trim() })
        }}
      >
        <input
          type="search"
          placeholder="Search: navy hoodie, Saybrook, Yale Mom…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search products"
        />
        <button className="btn btn-small" type="submit">Search</button>
      </form>

      <div className="chips" role="group" aria-label="Categories">
        {['All', ...categories].map((c) => (
          <button
            key={c}
            type="button"
            className={c === category ? 'chip active' : 'chip'}
            aria-pressed={c === category}
            onClick={() => update({ category: c })}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="toolbar">
        <div className="size-filter" role="group" aria-label="In stock in my size">
          <span className="toolbar-label">In stock in my size</span>
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              className={s === size ? 'size-chip active' : 'size-chip'}
              aria-pressed={s === size}
              onClick={() => update({ size: s === size ? '' : s })}
            >
              {s}
            </button>
          ))}
        </div>
        <label className="toolbar-select">
          <span className="toolbar-label">Budget</span>
          <select value={max} onChange={(e) => update({ max: e.target.value })}>
            {BUDGETS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
        </label>
        <label className="toolbar-select">
          <span className="toolbar-label">Sort</span>
          <select value={sort} onChange={(e) => update({ sort: e.target.value })}>
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
      </div>

      {error && <div className="empty-state"><strong>Hmm.</strong><p>{error}</p></div>}
      {!error && shown === null && <p className="muted">Loading products…</p>}
      {shown && (
        <>
          <p className="muted small">
            {shown.length} {shown.length === 1 ? 'product' : 'products'}
            {q && <> for “{q}”</>}
            {size && <> in stock in {size}</>}
            {max && <> under ${max}</>}
            {filtersOn && (
              <>
                {' · '}
                <button
                  className="link-btn"
                  onClick={() => {
                    setSearch('')
                    setParams(new URLSearchParams())
                  }}
                >
                  Clear filters
                </button>
              </>
            )}
          </p>
          {shown.length === 0 ? (
            <div className="empty-state">
              <strong>No matches.</strong>
              <p>Try another size, a higher budget, or ask the assistant (bottom right) for alternatives.</p>
            </div>
          ) : (
            <div className="product-grid">
              {shown.map((p) => <ProductCard key={p.product_id} p={p} highlightSize={size || undefined} />)}
            </div>
          )}
        </>
      )}
    </section>
  )
}
