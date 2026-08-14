import React, { useState } from 'react'
import PartnerLayout from './PartnerLayout'
import { useAuth } from '../../contexts/AuthContext'
import './Partner.css'

export default function PartnerSettings() {
  const { session } = useAuth()

  // Org settings
  const [orgName,    setOrgName]    = useState('')
  const [website,    setWebsite]    = useState('')
  const [bio,        setBio]        = useState('')
  const [publicPage, setPublicPage] = useState(true)

  // Notification settings
  const [emailOnApproval, setEmailOnApproval] = useState(true)
  const [emailOnFunding,  setEmailOnFunding]  = useState(true)
  const [emailOnReview,   setEmailOnReview]   = useState(false)

  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <PartnerLayout title="Partner settings">
      <div style={{ maxWidth: 680 }}>

        {saved && (
          <div style={{ background: '#EAF3DE', border: '0.5px solid #AACBA7', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#2B5341', marginBottom: 20 }}>
            ✓ Settings saved successfully.
          </div>
        )}

        {/* Organisation profile */}
        <div className="pl-card" style={{ marginBottom: 16 }}>
          <div className="pl-card__title">Organisation profile</div>

          <div className="sp-field" style={{ marginBottom: 14 }}>
            <label className="sp-label" htmlFor="ps-name">Organisation name</label>
            <input id="ps-name" type="text" className="sp-input" placeholder="Terra Roots Foundation" value={orgName} onChange={e => setOrgName(e.target.value)} />
          </div>

          <div className="sp-field" style={{ marginBottom: 14 }}>
            <label className="sp-label" htmlFor="ps-web">Website</label>
            <input id="ps-web" type="url" className="sp-input" placeholder="https://terraroots.org" value={website} onChange={e => setWebsite(e.target.value)} />
          </div>

          <div className="sp-field" style={{ marginBottom: 14 }}>
            <label className="sp-label" htmlFor="ps-bio">Short bio</label>
            <textarea id="ps-bio" className="sp-textarea" rows={3} placeholder="Describe your organisation's mission and work…" value={bio} onChange={e => setBio(e.target.value)} />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={publicPage}
              onChange={e => setPublicPage(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: '#2B5341' }}
            />
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: '#112121' }}>Show public partner page</div>
              <div style={{ fontSize: 12, color: '#9AA79C' }}>Your organisation will appear on the Five Elements partner directory.</div>
            </div>
          </label>
        </div>

        {/* Notifications */}
        <div className="pl-card" style={{ marginBottom: 16 }}>
          <div className="pl-card__title">Email notifications</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { id: 'ps-n1', label: 'Project approved or rejected', sub: 'When admin reviews your submission', val: emailOnApproval, set: setEmailOnApproval },
              { id: 'ps-n2', label: 'New funding received',         sub: 'When a funder backs one of your projects', val: emailOnFunding, set: setEmailOnFunding },
              { id: 'ps-n3', label: 'Evidence review updates',      sub: 'When admin requests more information', val: emailOnReview, set: setEmailOnReview },
            ].map(n => (
              <label key={n.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input
                  id={n.id}
                  type="checkbox"
                  checked={n.val}
                  onChange={e => n.set(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#2B5341', marginTop: 2 }}
                />
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#112121' }}>{n.label}</div>
                  <div style={{ fontSize: 12, color: '#9AA79C' }}>{n.sub}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Danger zone */}
        <div className="pl-card" style={{ marginBottom: 24, border: '1px solid #F5C27A' }}>
          <div className="pl-card__title" style={{ color: '#8B3A00' }}>Danger zone</div>
          <p style={{ fontSize: 13, color: '#6B7B6E', marginBottom: 14, lineHeight: 1.5 }}>
            Deactivating your partner account will remove your organisation from the platform. All projects and evidence will be retained for ledger integrity.
          </p>
          <button type="button" className="pl-btn pl-btn--ghost" style={{ color: '#8B3A00', borderColor: '#F5C27A' }}>
            Request account deactivation
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="pl-btn pl-btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </div>
    </PartnerLayout>
  )
}