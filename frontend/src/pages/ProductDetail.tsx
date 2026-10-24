import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchProduct, formatPrice, type ProductDetail as Detail } from '../api.ts'
import { openChat } from '../components/ChatWidget.tsx'

export default function ProductDetail() {
  const { id = '' } = useParams()
  const [p, setP] = useState<Detail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [size, setSize] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setP(null)
    setError(null)
    setSize(null)
    fetchProduct(id)
      .then((d) => alive && setP(d))
      .catch((e: Error & { status?: number }) =>
        alive && setError(e.status === 404 ? 'We couldn’t find that product.' : 'We couldn’t load this product.'),
      )
    return () => {
      alive = false
    }
  }, [id])

  if (error) {
    return (
      <section className="section narrow center">
        <h1>{error}</h1>
        <Link to="/products" className="btn">Back to all products</Link>
      </section>
    )
  }
  if (!p) return <section className="section"><p className="muted">Loading…</p></section>

  const chosen = p.inventory.find((s) => s.size === size)

  return (
    <section className="section">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/products">Products</Link> <span aria-hidden="true">›</span>{' '}
        <Link to={`/products?category=${encodeURIComponent(p.category)}`}>{p.category}</Link>{' '}
        <span aria-hidden="true">›</span> <span>{p.name}</span>
      </nav>

      <div className="detail">
        <div
          className="detail-img zoomable"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            e.currentTarget.style.setProperty('--zx', `${((e.clientX - r.left) / r.width) * 100}%`)
            e.currentTarget.style.setProperty('--zy', `${((e.clientY - r.top) / r.height) * 100}%`)
          }}
        >
          <img src={p.image_url} alt={p.name} />
          <span className="zoom-hint" aria-hidden="true">Hover to zoom</span>
        </div>

        <div className="detail-info">
          <span className="pcard-cat">{p.category}</span>
          <h1>{p.name}</h1>
          <div className="price-row">
            <p className="detail-price">{formatPrice(p.price)}</p>
            <button type="button" className="btn btn-small btn-ghost" onClick={() => openChat()}>
              💬 Ask about this item
            </button>
          </div>
          <p>{p.description}</p>

          {p.colors.length > 0 && (
            <p className="muted small"><strong>Colors:</strong> {p.colors.join(', ')}</p>
          )}

          <h2 className="h-small">Size &amp; stock</h2>
          <div className="sizes" role="radiogroup" aria-label="Choose a size">
            {p.inventory.map((s) => (
              <button
                key={s.size}
                type="button"
                role="radio"
                aria-checked={size === s.size}
                disabled={s.quantity === 0}
                className={`size ${s.status.replace(' ', '-')}${size === s.size ? ' selected' : ''}`}
                onClick={() => setSize(s.size)}
                title={s.quantity === 0 ? 'Sold out' : `${s.quantity} left`}
              >
                {s.size}
              </button>
            ))}
          </div>
          <p className="stock-note" role="status">
            {chosen
              ? chosen.status === 'low'
                ? `Only ${chosen.quantity} left in ${chosen.size}. Grab it soon.`
                : `${chosen.size} is in stock (${chosen.quantity} available).`
              : p.total_stock === 0
                ? 'Sold out in every size right now.'
                : `In stock in ${p.sizes_in_stock.join(', ')}. Pick a size to see how many are left.`}
          </p>

          <table className="stock-table">
            <thead><tr><th>Size</th><th>Available</th><th>Status</th></tr></thead>
            <tbody>
              {p.inventory.map((s) => (
                <tr key={s.size}>
                  <td>{s.size}</td>
                  <td>{s.quantity}</td>
                  <td><span className={`dot ${s.status.replace(' ', '-')}`} /> {s.status}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {p.search_tags.length > 0 && (
            <div className="tags">
              {p.search_tags.map((t) => <span key={t} className="tag">{t}</span>)}
            </div>
          )}
          {p.total_stock > 0 && p.inventory.some((s) => s.quantity === 0) && (
            <button
              type="button"
              className="link-btn small"
              onClick={() => openChat(`Show me items similar to the ${p.name} that are in stock in ${p.inventory.filter((s) => s.quantity === 0).map((s) => s.size).join(' or ')}`)}
            >
              Sold out in your size? Find similar items in stock →
            </button>
          )}
          <p className="muted small">Pick it up at 57 Broadway, New Haven, or ask our assistant about it.</p>
        </div>
      </div>
    </section>
  )
}
