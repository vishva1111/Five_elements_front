import React from 'react'
import { Link } from 'react-router-dom'
import { TreePine, Leaf, MapPin, ExternalLink } from 'lucide-react'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import PentagonIcon from '../../components/ui/PentagonIcon'
import NotificationBell from '../../components/ui/NotificationBell'
import { useLedger } from '../../hooks/useLedger'
import './ImpactHome.css'

// In a real app this would come from auth context
const DEMO_USER = {
  name: 'Aditi Sharma',
  location: 'Pune',
  avatar: 'AS',
  trees: 312,
  tCO2e: 4.1,
  projects: 3,
}

export default function ImpactHome() {
  const { entries, stats, loading } = useLedger({})
  // Show only first 5 entries as "my entries" for demo
  const myEntries = entries.slice(0, 5)

  return (
    <div className="impact-home">
      <Navbar />

      {/* Header */}
      <div className="impact-home__header dark-section">
        <div className="container impact-home__header-inner">
          <div className="impact-home__avatar">{DEMO_USER.avatar}</div>
          <div style={{ flex: 1 }}>
            <p className="section-label" style={{ color: 'var(--color-accent)' }}>MY IMPACT</p>
            <h1 className="impact-home__name">{DEMO_USER.name}</h1>
            <p className="impact-home__loc">📍 {DEMO_USER.location}</p>
          </div>
          <div style={{ color: '#fff' }}>
            <NotificationBell />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="container impact-home__stats-row">
        <div className="card impact-home__stat-card">
          <PentagonIcon emoji="🌳" color="#2D6A4F" size={48} />
          <div>
            <span className="impact-home__stat-num">{DEMO_USER.trees.toLocaleString()}</span>
            <span className="impact-home__stat-label">trees funded</span>
          </div>
        </div>
        <div className="card impact-home__stat-card">
          <PentagonIcon emoji="🌿" color="#40916C" size={48} />
          <div>
            <span className="impact-home__stat-num">{DEMO_USER.tCO2e}</span>
            <span className="impact-home__stat-label">tCO₂e offset</span>
          </div>
        </div>
        <div className="card impact-home__stat-card">
          <PentagonIcon emoji="🗺️" color="#1B4332" size={48} />
          <div>
            <span className="impact-home__stat-num">{DEMO_USER.projects}</span>
            <span className="impact-home__stat-label">projects backed</span>
          </div>
        </div>
      </div>

      {/* Map placeholder */}
      <div className="container impact-home__section">
        <div className="impact-home__section-header">
          <h2>Where your trees are growing</h2>
          <span className="impact-home__section-count">{DEMO_USER.trees} trees across {DEMO_USER.projects} projects</span>
        </div>
        <div className="impact-home__map-placeholder">
          <MapPin size={32} color="var(--color-earth)" />
          <p>Interactive map — geo-tagged tree locations</p>
          <span>Coming soon: live satellite view of your funded areas</span>
        </div>
      </div>

      {/* Ledger entries */}
      <div className="container impact-home__section">
        <div className="impact-home__section-header">
          <h2>My ledger entries</h2>
          <div style={{ display: 'flex', gap: 16 }}>
            <Link to="/my-projects" className="impact-home__see-all">My projects & evidence →</Link>
            <Link to="/ledger" className="impact-home__see-all">See all on ledger →</Link>
          </div>
        </div>

        {loading ? (
          <div className="impact-home__loading">Loading entries…</div>
        ) : (
          <div className="impact-home__entries">
            {myEntries.map((entry) => (
              <div key={entry.id} className="card impact-home__entry-card">
                <div className="impact-home__entry-top">
                  <span className="impact-home__entry-id">{entry.id}</span>
                  {entry.verified && (
                    <span className="badge badge-verified">✓ Verified</span>
                  )}
                </div>
                <p className="impact-home__entry-project">{entry.project}</p>
                <div className="impact-home__entry-meta">
                  <span><TreePine size={13} /> {entry.trees} trees</span>
                  <span><Leaf size={13} /> {entry.tCO2e} tCO₂e</span>
                  <span>{entry.date}</span>
                </div>
                {entry.txHash && (
                  <a href="#" className="impact-home__tx-link">
                    {entry.txHash} <ExternalLink size={11} />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Platform stats */}
      <div className="impact-home__platform dark-section">
        <div className="container impact-home__platform-inner">
          <p className="section-label" style={{ color: 'var(--color-accent)' }}>PLATFORM TOTAL</p>
          <div className="impact-home__platform-stats">
            <div className="impact-home__platform-stat">
              <span className="stat-number">{(stats.treesFunded || 0).toLocaleString()}</span>
              <span>trees funded</span>
            </div>
            <div className="impact-home__platform-stat">
              <span className="stat-number">{(stats.tCO2eVerified || 0).toLocaleString()} tCO₂e</span>
              <span>verified</span>
            </div>
            <div className="impact-home__platform-stat">
              <span className="stat-number">{stats.projectsActive || 0}</span>
              <span>active projects</span>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="container impact-home__cta">
        <h2>Keep growing your impact</h2>
        <p>Fund more trees, back more projects, build a verifiable record of your climate action.</p>
        <div className="impact-home__cta-btns">
          <Link to="/projects" className="btn btn-primary">Fund more trees →</Link>
          <Link to="/ledger" className="btn btn-outline">View public ledger</Link>
        </div>
      </div>

      <Footer />
    </div>
  )
}