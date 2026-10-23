import { Link } from 'react-router-dom'
import { formatPrice, type ProductSummary } from '../api.ts'

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

export default function ProductCard({
  p,
  compact = false,
  highlightSize,
}: {
  p: ProductSummary
  compact?: boolean
  highlightSize?: string
}) {
  const soldOut = p.total_stock === 0
  const fewSizes = !soldOut && p.sizes_in_stock.length <= 3
  return (
    <Link to={`/products/${p.product_id}`} className={compact ? 'pcard compact' : 'pcard'}>
      <div className="pcard-img">
        <img src={p.image_url} alt={p.name} loading="lazy" />
        {soldOut && <span className="badge">Sold out</span>}
        {fewSizes && !compact && <span className="badge badge-warn">Few sizes left</span>}
      </div>
      <div className="pcard-body">
        <span className="pcard-cat">{p.category}</span>
        <h3>{p.name}</h3>
        {!compact && <p>{p.short_description}</p>}
        {!compact && (
          <div className="size-row" aria-label={`In stock in ${p.sizes_in_stock.join(', ') || 'no sizes'}`}>
            {SIZES.map((s) => {
              const ok = p.sizes_in_stock.includes(s)
              return (
                <span key={s} className={`sz${ok ? '' : ' out'}${s === highlightSize ? ' hl' : ''}`} title={ok ? `${s} in stock` : `${s} sold out`}>
                  {s}
                </span>
              )
            })}
          </div>
        )}
        <strong className="price">{formatPrice(p.price)}</strong>
      </div>
    </Link>
  )
}
