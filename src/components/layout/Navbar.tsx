import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import './Navbar.css'

const NAV_LINKS = [
  { label: 'Projects', to: '/projects' },
  { label: 'How it works', to: '/how-it-works' },
  { label: 'Ledger', to: '/ledger' },
  { label: 'Explore profiles', to: '/profiles' },
]

export default function Navbar({ dark = true }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  return (
    <nav className={`navbar ${dark ? 'navbar--dark' : 'navbar--light'}`}>
      <div className="navbar__inner container">
        {/* Logo */}
        <Link to="/" className="navbar__logo">
          <span className="navbar__logo-icon">⬠</span>
          <span>
            five elements <strong className="navbar__logo-accent">CARM</strong>
          </span>
        </Link>

        {/* Desktop links */}
        <ul className="navbar__links">
          {NAV_LINKS.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                className={`navbar__link ${location.pathname === l.to ? 'navbar__link--active' : ''}`}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="navbar__cta">
          <Link to="/login" className="navbar__login">Log in</Link>
        </div>

        {/* Mobile toggle */}
        <button className="navbar__toggle" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="navbar__mobile">
          {NAV_LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="navbar__mobile-link" onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <div className="navbar__mobile-cta">
            <Link to="/login" className="btn btn-outline btn-sm" onClick={() => setOpen(false)}>Log in</Link>
          </div>
        </div>
      )}
    </nav>
  )
}