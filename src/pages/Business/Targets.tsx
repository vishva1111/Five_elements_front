import React from 'react'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import './Business.css'

const TARGETS = [
  { label: 'Net zero by', value: '2040', progress: 32 },
  { label: 'Scope 1+2 reduction', value: '50% by 2030', progress: 48 },
  { label: 'Scope 3 reduction', value: '30% by 2030', progress: 21 },
]

export default function Targets() {
  return (
    <div className="business-page">
      <Navbar />
      <div className="business-page__header dark-section">
        <div className="container">
          <p className="section-label" style={{ color: 'var(--color-accent)' }}>TARGETS</p>
          <h1 className="business-page__title">SBTi & net zero targets</h1>
          <p className="business-page__sub">Set science-based targets and track progress against them.</p>
        </div>
      </div>
      <div className="container business-page__body">
        <div className="business-page__stats-grid">
          {TARGETS.map((t) => (
            <div key={t.label} className="card business-page__stat-card">
              <p className="business-page__stat-label">{t.label}</p>
              <span className="business-page__stat-num">{t.value}</span>
              <div className="business-page__progress-row" style={{ marginTop: 8 }}>
                <div className="business-page__progress-label">
                  <span>Progress</span>
                  <span>{t.progress}%</span>
                </div>
                <div className="business-page__progress-bar">
                  <div className="business-page__progress-fill" style={{ width: `${t.progress}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="business-page__section">
          <div className="business-page__section-header"><h2>Set a new target</h2></div>
          <div className="business-page__form card" style={{ padding: 24 }}>
            <div className="business-page__two-col">
              <div className="business-page__field">
                <label>Target type</label>
                <select className="business-page__select">
                  <option>Net zero</option>
                  <option>Scope 1+2 reduction</option>
                  <option>Scope 3 reduction</option>
                </select>
              </div>
              <div className="business-page__field">
                <label>Target year</label>
                <input className="business-page__input" type="number" placeholder="e.g. 2035" />
              </div>
            </div>
            <div className="business-page__field">
              <label>Reduction % from baseline</label>
              <input className="business-page__input" type="number" placeholder="e.g. 50" />
            </div>
            <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Save target</button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}