import React from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import './Business.css'

const SCOPE_SUMMARY = [
  { label: 'Scope 1', value: '48.2 tCO₂e', desc: 'Direct emissions' },
  { label: 'Scope 2', value: '62.1 tCO₂e', desc: 'Purchased electricity' },
  { label: 'Scope 3', value: '104.0 tCO₂e', desc: 'Value chain' },
  { label: 'Total', value: '214.3 tCO₂e', desc: 'Combined Scope 1–3' },
]

export default function ReportDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <div className="business-page">
      <Navbar />
      <div className="business-page__header dark-section">
        <div className="container">
          <Link
            to="/business/reports"
            style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}
          >
            <ArrowLeft size={14} /> Back to reports
          </Link>
          <p className="section-label" style={{ color: 'var(--color-accent)' }}>REPORT DETAIL</p>
          <h1 className="business-page__title">{id || 'Report'}</h1>
          <p className="business-page__sub">Meridian Manufacturing · Verified ledger data</p>
        </div>
      </div>
      <div className="container business-page__body">
        {/* Emissions summary */}
        <div className="card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Emissions summary</h2>
            <button
              type="button"
              onClick={() => navigate('/business/source-data')}
              style={{ background: 'none', border: 'none', color: '#185FA5', fontWeight: 700, fontSize: 13, cursor: 'pointer', padding: 0 }}
            >
              View source records →
            </button>
          </div>
          <div className="business-page__stats-grid">
            {SCOPE_SUMMARY.map(s => (
              <div key={s.label} className="business-page__stat-card" style={{ background: '#f9f9f9', borderRadius: 8, padding: 16 }}>
                <p className="business-page__stat-label">{s.label}</p>
                <span className="business-page__stat-num" style={{ fontSize: 18 }}>{s.value}</span>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted-dark)', marginTop: 4 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Funding summary */}
        <div className="card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Funding & offsets</h2>
            <Link
              to="/ledger"
              style={{ color: '#185FA5', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}
            >
              View on ledger →
            </Link>
          </div>
          <div className="business-page__two-col">
            <div>
              <p className="business-page__stat-label">Trees funded</p>
              <span className="business-page__stat-num">12,400</span>
            </div>
            <div>
              <p className="business-page__stat-label">Verified ledger entries</p>
              <span className="business-page__stat-num">2</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-primary">Download PDF</button>
          <button className="btn btn-outline">Share link</button>
        </div>
      </div>
      <Footer />
    </div>
  )
}