import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <strong className="footer-brand">Campus Customs</strong>
          <p>Yale gear from our shop on Broadway, a short walk from Old Campus.</p>
        </div>
        <div>
          <h4>Visit</h4>
          <p>57 Broadway<br />New Haven, CT 06511</p>
        </div>
        <div>
          <h4>Shop</h4>
          <p>
            <Link to="/products">All products</Link>
            <br />
            <Link to="/about">About us</Link>
          </p>
        </div>
      </div>
      <p className="footer-note">
        Class project inspired by Yale Bulldog Blue by Campus Customs. Not affiliated with or endorsed by the shop.
      </p>
    </footer>
  )
}
