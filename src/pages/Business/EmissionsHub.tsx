import React from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import './Business.css'

const SCOPES = [
  { id: 1, label: 'Scope 1', desc: 'Direct emissions — fuel combustion, company vehicles', value: '48.2' },
  { id: 2, label: 'Scope 2', desc: 'Purchased electricity and heat', value: '62.1' },
  { id: 3, label: 'Scope 3', desc: 'Value chain — travel, supply chain, waste', value: '104.0' },
]

export default function EmissionsHub() {
  return (
    <div className="business-page">
      <Navbar />
      <div className="business-page__header dark-section">
        <div className="container">
          <p className="section-label" style={{ color: 'var(--color-accent)' }}>EMISSIONS HUB</p>
          <h1 className="business-page__title">Your emissions inventory</h1>
          <p className="business-page__sub">Scope 1, 2 and 3 — measured from real activity data.</p>
        </div>
      </div>
      <div className="container business-page__body">
        <div className="business-page__stats-grid">
          {SCOPES.map((s) => (
            <div key={s.id} className="card business-page__stat-card">
              <span className="badge badge-element">Scope {s.id}</span>
              <span className="business-page__stat-num">{s.value}</span>
              <span className="business-page__stat-unit">tCO₂e</span>
              <p className="business-page__stat-label">{s.desc}</p>
            </div>
          ))}
          <div className="card business-page__stat-card">
            <span className="badge badge-verified">Total</span>
            <span className="business-page__stat-num">214.3</span>
            <span className="business-page__stat-unit">tCO₂e</span>
            <p className="business-page__stat-label">Combined Scope 1–3</p>
          </div>
        </div>
        <div className="business-page__section">
          <div className="business-page__section-header"><h2>Add emissions data</h2></div>
          <div className="business-page__links-grid">
            <Link to="/business/source-data" className="card business-page__link-card">
              <span className="business-page__link-emoji">📝</span>
              <span>Manual entry</span>
            </Link>
            <Link to="/business/bulk-upload" className="card business-page__link-card">
              <span className="business-page__link-emoji">📤</span>
              <span>Bulk upload</span>
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}