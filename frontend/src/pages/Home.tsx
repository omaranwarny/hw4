import { Link } from 'react-router-dom'

const shopBy = [
  { to: '/products?q=' + encodeURIComponent('Benjamin Franklin Berkeley Branford Davenport Grace Hopper Jonathan Edwards Morse Pierson Saybrook Timothy Dwight Trumbull Ezra Stiles Silliman Pauli Murray'), title: 'Residential Colleges', text: 'Crests for all fourteen colleges, from Berkeley to Trumbull.', icon: '🏛️' },
  { to: '/products?q=' + encodeURIComponent('baseball basketball football hockey soccer tennis golf lacrosse squash fencing diving swimming sailing volleyball track field'), title: 'Bulldog Sports', text: 'Left-chest and big-print gear for 20+ varsity teams.', icon: '🏈' },
  { to: '/products?q=mom+dad+grandma+grandpa+aunt+uncle+brother+cousin', title: 'For the Family', text: 'Yale Mom, Dad, Grandma, Uncle and more, made for proud relatives.', icon: '💙' },
  { to: '/products?q=school', title: 'Grad & Professional', text: 'Law, Medicine, Management, Art, Music and the rest.', icon: '🎓' },
]

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <p className="eyebrow">New Haven, Connecticut</p>
          <h1>Wear your Bulldog pride.</h1>
          <p className="lede">
            Hoodies, crewnecks, tees and quarter-zips for students, families, alumni and anyone who bleeds Yale blue.
            Pick it up on Broadway, or find it here.
          </p>
          <div className="hero-actions">
            <Link to="/products" className="btn">Shop the collection</Link>
            <Link to="/about" className="btn btn-ghost">Our story</Link>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <span>Y</span>
        </div>
      </section>

      <section className="section">
        <h2>Shop by what you love</h2>
        <div className="card-grid">
          {shopBy.map((c) => (
            <Link to={c.to} key={c.title} className="tile">
              <span className="tile-icon" aria-hidden="true">{c.icon}</span>
              <h3>{c.title}</h3>
              <p>{c.text}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="section band">
        <div className="band-inner">
          <div>
            <h2>Got a question? Just ask.</h2>
            <p>
              Our shop assistant can help you find the right crest, check sizes and stock, and tell you the real price.
              No guessing. It's coming soon to every page.
            </p>
          </div>
          <Link to="/signup" className="btn btn-light">Create an account</Link>
        </div>
      </section>

      <section className="section split">
        <div>
          <h2>Come see us on Broadway</h2>
          <p>
            Between classes, before The Game, or on Family Weekend, stop by and try it on. Our crew knows the difference
            between a Saybrook and a Silliman crest, and they're happy to help you pick.
          </p>
        </div>
        <address className="visit-card">
          <strong>Campus Customs</strong>
          <span>57 Broadway</span>
          <span>New Haven, CT 06511</span>
        </address>
      </section>
    </>
  )
}
