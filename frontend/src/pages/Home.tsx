import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchProducts, formatPrice, type ProductSummary } from '../api.ts'
import { openChat } from '../components/ChatWidget.tsx'
import ProductCard from '../components/ProductCard.tsx'
import useReveal from '../hooks/useReveal.ts'

const HERO_IDS = [
  'district-vit-hoodie-vintage-bulldog',
  'super-heavyweight-crewneck-arched-yale-crest',
  'yale-mom-hoodie',
  '2025-yale-vs-harvard-t-shirt',
]

const pennants = [
  { to: '/products?q=' + encodeURIComponent('Benjamin Franklin Berkeley Branford Davenport Grace Hopper Jonathan Edwards Morse Pierson Saybrook Timothy Dwight Trumbull Ezra Stiles Silliman Pauli Murray'), label: 'Colleges', sub: '14 crests', color: 'p-blue' },
  { to: '/products?q=' + encodeURIComponent('baseball basketball football hockey soccer tennis golf lacrosse squash fencing diving swimming sailing volleyball track field'), label: 'Sports', sub: '20+ teams', color: 'p-white' },
  { to: '/products?q=mom+dad+grandma+grandpa+aunt+uncle+brother+cousin', label: 'Family', sub: 'Mom · Dad · more', color: 'p-sky' },
  { to: '/products?q=school', label: 'Grad Schools', sub: 'Law · Med · Art', color: 'p-navy' },
]

export default function Home() {
  const [all, setAll] = useState<ProductSummary[]>([])
  useEffect(() => {
    fetchProducts().then(setAll).catch(() => setAll([]))
  }, [])
  useReveal([all.length])

  const hero = HERO_IDS.map((id) => all.find((p) => p.product_id === id)).filter(Boolean) as ProductSummary[]
  const newArrivals = all.filter((p) => p.total_stock > 0).sort((a, b) => b.total_stock - a.total_stock).slice(0, 4)
  const minPrice = all.length ? Math.min(...all.map((p) => p.price)) : 32

  return (
    <>
      {/* ---------- HERO ---------- */}
      <section className="hero2">
        <div className="hero2-copy">
          <p className="eyebrow light">Est. on Broadway · New Haven, CT</p>
          <h1>
            Wear the <span className="script">Blue.</span>
            <br />
            Bring the <span className="varsity">Bulldog.</span>
          </h1>
          <p className="lede">
            Officially licensed Yale hoodies, crewnecks and tees, from your residential college crest to "Yale Mom".
            Real stock, real prices, a real shop two blocks from Old Campus.
          </p>
          <div className="hero-actions">
            <Link to="/products" className="btn btn-light">Shop the collection</Link>
            <button className="btn btn-ghost-light" onClick={() => openChat('What hoodies do you have?')}>
              💬 Ask the shop assistant
            </button>
          </div>
          <ul className="hero-stats" aria-label="Shop facts">
            <li><strong>{all.length || 102}</strong> styles</li>
            <li><strong>6</strong> sizes, XS–XXL</li>
            <li><strong>from {formatPrice(minPrice)}</strong></li>
          </ul>
        </div>

        <div className="hero2-art" aria-hidden={hero.length === 0}>
          <div className="chenille" aria-hidden="true">
            <span>Y</span>
          </div>
          {hero.map((p, i) => (
            <Link key={p.product_id} to={`/products/${p.product_id}`} className={`float-card f${i}`} title={p.name}>
              <img src={p.image_url} alt={p.name} />
              <span className="float-tag">{formatPrice(p.price)}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- TICKER-LIKE STRIPE ---------- */}
      <div className="varsity-stripe" aria-hidden="true" />

      {/* ---------- PENNANTS ---------- */}
      <section className="section reveal">
        <p className="eyebrow">Shop by what you love</p>
        <h2 className="h-display">Pick your pennant</h2>
        <div className="pennants">
          {pennants.map((p) => (
            <Link key={p.label} to={p.to} className={`pennant ${p.color}`}>
              <span className="pennant-label">{p.label}</span>
              <span className="pennant-sub">{p.sub}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- WELL STOCKED ---------- */}
      {newArrivals.length > 0 && (
        <section className="section reveal">
          <div className="section-head">
            <div>
              <p className="eyebrow">On the shelves now</p>
              <h2 className="h-display">Fully stocked favorites</h2>
            </div>
            <Link to="/products?sort=price-asc" className="btn btn-small btn-ghost">See everything →</Link>
          </div>
          <div className="product-grid">
            {newArrivals.map((p) => <ProductCard key={p.product_id} p={p} />)}
          </div>
        </section>
      )}

      {/* ---------- ASSISTANT BAND ---------- */}
      <section className="section band reveal">
        <div className="band-inner letterman">
          <div>
            <p className="eyebrow light">New · Shop assistant</p>
            <h2>Not sure what size? Just ask.</h2>
            <p>
              Our assistant checks live stock and real prices in the shop's database. Ask "Do you have this in XL?"
              on any product, or "gift for Dad under $60", and the picks appear right on the page.
            </p>
          </div>
          <div className="band-actions">
            <button className="btn btn-light" onClick={() => openChat('Gift for Mom under $60')}>Try “Gift for Mom under $60”</button>
            <Link to="/signup" className="link-light">Create an account to save your chat →</Link>
          </div>
        </div>
      </section>

      {/* ---------- VISIT ---------- */}
      <section className="section split reveal">
        <div>
          <p className="eyebrow">Visit the shop</p>
          <h2 className="h-display">Come see us on Broadway</h2>
          <p>
            Between classes, before The Game, or on Family Weekend, stop in and try it on. Our crew knows a Saybrook crest
            from a Silliman one, and they're happy to help you pick.
          </p>
        </div>
        <address className="visit-card ticket">
          <span className="ticket-top">Admit one · Bulldog</span>
          <strong>Campus Customs</strong>
          <span>57 Broadway</span>
          <span>New Haven, CT 06511</span>
        </address>
      </section>
    </>
  )
}
