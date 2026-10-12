import React from 'react'
import { Link } from 'react-router-dom'
import BusinessLayout from './BusinessLayout'
import './Dashboard.css'

/**
 * Placeholder for Business features that aren't built yet. Shown inside the
 * panel (sidebar stays) instead of the old pages, which displayed made-up
 * sample figures as if they were the organisation's own.
 */
export default function ComingSoon({ title, subtitle, icon, points }: {
  title: string
  subtitle: string
  icon: string
  points: string[]
}) {
  return (
    <BusinessLayout title={title} subtitle={subtitle}>
      <div className="db-card" style={{ maxWidth: 640, margin: '24px auto 0', textAlign: 'center', padding: '40px 32px' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
        <div className="db-welcome-badge" style={{ display: 'inline-block' }}>Coming soon</div>
        <h2 className="db-onboard-title" style={{ marginTop: 10 }}>{title} is on its way</h2>
        <p className="db-onboard-sub" style={{ marginBottom: 20 }}>{subtitle}</p>
        <ul style={{ textAlign: 'left', margin: '0 auto 24px', maxWidth: 440, paddingLeft: 20, color: '#3a453c', fontSize: 13.5, lineHeight: 1.8 }}>
          {points.map(p => <li key={p}>{p}</li>)}
        </ul>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/business" className="db-cta-btn">Back to dashboard</Link>
          <Link to="/business/reports" className="db-link" style={{ alignSelf: 'center' }}>Go to Reports →</Link>
        </div>
      </div>
    </BusinessLayout>
  )
}
