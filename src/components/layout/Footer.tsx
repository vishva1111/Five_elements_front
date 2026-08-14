import React from 'react'
import { Link } from 'react-router-dom'
import './Footer.css'

const FOOTER_LINKS = {
  Platform: [
    { label: 'Projects', to: '/projects' },
    { label: 'Quick estimator', to: '/estimator' },
    { label: 'Public ledger', to: '/ledger' },
    { label: 'Explore profiles', to: '/profiles' },
  ],
  'For businesses': [
    { label: 'Emissions platform', to: '/business' },
    { label: 'Targets & SBTi', to: '/business/targets' },
    { label: 'Regulatory reports', to: '/business/reports' },
    { label: 'Project portfolio', to: '/business/portfolio' },
  ],
  Company: [
    { label: 'About', to: '/about' },
    { label: 'Partners', to: '/partners' },
    { label: 'Methodology', to: '/methodology' },
    { label: 'Contact', to: '/contact' },
  ],
  Connect: [
    { label: 'LinkedIn', to: '#' },
    { label: 'Instagram', to: '#' },
    { label: 'YouTube', to: '#' },
    { label: 'Help centre', to: '#' },
  ],
}

export default function Footer() {
  return (
    <footer className="footer dark-section">
      <div className="container">
        <div className="footer__top">
          {/* Brand */}
          <div className="footer__brand">
            <Link to="/" className="footer__logo">
              <span className="footer__logo-icon">⬠</span>
              <span>
                five elements <strong className="footer__logo-accent">CARM</strong>
              </span>
            </Link>
            <p className="footer__tagline">
              Climate action, rooted in the elements of nature. Measure, fund, prove — on a public ledger anyone can check.
            </p>
            <div className="footer__cta-row">
              <Link to="/start" className="btn btn-primary btn-sm">Start my impact</Link>
              <Link to="/business" className="btn btn-outline-white btn-sm">Explore for business</Link>
            </div>
          </div>

          {/* Link columns */}
          <div className="footer__links">
            {Object.entries(FOOTER_LINKS).map(([section, links]) => (
              <div key={section} className="footer__col">
                <h4 className="footer__col-title">{section}</h4>
                <ul>
                  {links.map((l) => (
                    <li key={l.label}>
                      <Link to={l.to} className="footer__link">{l.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="footer__bottom">
          <p>© {new Date().getFullYear()} Five Elements CARM. All rights reserved.</p>
          <div className="footer__bottom-links">
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/methodology">Methodology</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}