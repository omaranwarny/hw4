import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.tsx'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/products', label: 'Products' },
  { to: '/about', label: 'About Us' },
]

export default function NavBar() {
  const [open, setOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const close = () => setOpen(false)
  const cls = ({ isActive }: { isActive: boolean }) => (isActive ? 'nav-link active' : 'nav-link')

  return (
    <header className="site-header">
      <div className="ticker" aria-label="Shop announcements">
        <div className="ticker-track">
          {[0, 1].map((k) => (
            <span key={k} aria-hidden={k === 1}>
              ★ Officially licensed Yale apparel &nbsp;·&nbsp; ★ 57 Broadway, New Haven &nbsp;·&nbsp; ★ Ask our assistant about live stock &nbsp;·&nbsp; ★ Boola Boola! &nbsp;·&nbsp; ★ XS–XXL in every style &nbsp;·&nbsp;
            </span>
          ))}
        </div>
      </div>
      <nav className="nav" aria-label="Main">
        <Link to="/" className="brand" onClick={close}>
          <span className="brand-mark" aria-hidden="true"><span>Y</span></span>
          <span className="brand-text">
            <strong>Campus Customs</strong>
            <small>Yale Bulldog Blue</small>
          </span>
        </Link>

        <button
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="nav-links"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? 'Close' : 'Menu'}
        </button>

        <div id="nav-links" className={open ? 'nav-links open' : 'nav-links'}>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={cls} onClick={close}>
              {l.label}
            </NavLink>
          ))}
          <span className="nav-spacer" />
          {user ? (
            <>
              <span className="nav-hello">Hi, {user.first_name}</span>
              <button
                className="btn btn-small btn-ghost"
                onClick={async () => {
                  close()
                  await logout()
                  navigate('/')
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={cls} onClick={close}>
                Log in
              </NavLink>
              <NavLink to="/signup" className="btn btn-small" onClick={close}>
                Create account
              </NavLink>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
