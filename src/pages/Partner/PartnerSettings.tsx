import React, { useEffect, useState } from 'react'
import PartnerLayout from './PartnerLayout'
import { useAuth } from '../../contexts/AuthContext'
import { API_URL as API } from '../../config/api'
import './Partner.css'

export default function PartnerSettings() {
  const { session } = useAuth()

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [orgName,      setOrgName]      = useState('')
  const [orgType,      setOrgType]      = useState('')
  const [website,      setWebsite]      = useState('')
  const [contactName,  setContactName]  = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [address,      setAddress]      = useState('')
  const [description,  setDescription]  = useState('')
  const [status,       setStatus]       = useState('')

  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  const token = session?.access_token

  useEffect(() => {
    if (!token) return
    fetch(`${API}/api/partner/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        const json = await r.json()
        if (r.status === 404) { setNotFound(true); return }
        if (!r.ok) throw new Error(json.error || 'Failed to load profile')
        const p = json.profile
        setOrgName(p.orgName || '')
        setOrgType(p.orgType || '')
        setWebsite(p.website || '')
        setContactName(p.contactName || '')
        setContactEmail(p.contactEmail || '')
        setContactPhone(p.contactPhone || '')
        setAddress(p.address || '')
        setDescription(p.description || '')
        setStatus(p.status || '')
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const res = await fetch(`${API}/api/partner/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
        body: JSON.stringify({ orgName, orgType, website, contactName, contactEmail, contactPhone, address, description }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <PartnerLayout title="Partner settings">
        <div style={{ maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => <div key={i} className="pl-skel" style={{ height: 48 }} />)}
        </div>
      </PartnerLayout>
    )
  }

  if (notFound) {
    return (
      <PartnerLayout title="Partner settings">
        <div className="pl-card" style={{ maxWidth: 680 }}>
          <div className="pl-empty">
            <div className="pl-empty__icon">🏢</div>
            <div className="pl-empty__title">No organisation profile yet</div>
            <div className="pl-empty__sub">Complete your partner onboarding application to set up an organisation profile.</div>
          </div>
        </div>
      </PartnerLayout>
    )
  }

  return (
    <PartnerLayout title="Partner settings">
      <div style={{ maxWidth: 680 }}>

        {saved && (
          <div style={{ background: '#EAF3DE', border: '0.5px solid #AACBA7', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#2B5341', marginBottom: 20 }}>
            ✓ Settings saved successfully.
          </div>
        )}
        {error && (
          <div style={{ background: '#FEF0E3', border: '0.5px solid #F5C27A', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#8B3A00', marginBottom: 20 }}>
            {error}
          </div>
        )}

        {/* Organisation profile */}
        <div className="pl-card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="pl-card__title">Organisation profile</div>
            {status && <span className={`pl-badge pl-badge--${status === 'approved' ? 'approved' : 'pending'}`}>{status}</span>}
          </div>

          <div className="sp-field" style={{ marginBottom: 14 }}>
            <label className="sp-label" htmlFor="ps-name">Organisation name</label>
            <input id="ps-name" type="text" className="sp-input" value={orgName} onChange={e => setOrgName(e.target.value)} />
          </div>

          <div className="sp-field" style={{ marginBottom: 14 }}>
            <label className="sp-label" htmlFor="ps-type">Organisation type</label>
            <input id="ps-type" type="text" className="sp-input" placeholder="NGO, Trust, Co-operative…" value={orgType} onChange={e => setOrgType(e.target.value)} />
          </div>

          <div className="sp-field" style={{ marginBottom: 14 }}>
            <label className="sp-label" htmlFor="ps-web">Website</label>
            <input id="ps-web" type="url" className="sp-input" placeholder="https://terraroots.org" value={website} onChange={e => setWebsite(e.target.value)} />
          </div>

          <div className="sp-field" style={{ marginBottom: 14 }}>
            <label className="sp-label" htmlFor="ps-bio">Description</label>
            <textarea id="ps-bio" className="sp-textarea" rows={3} placeholder="Describe your organisation's mission and work…" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
        </div>

        {/* Contact */}
        <div className="pl-card" style={{ marginBottom: 16 }}>
          <div className="pl-card__title">Contact details</div>

          <div className="sp-field" style={{ marginBottom: 14 }}>
            <label className="sp-label" htmlFor="ps-cname">Contact name</label>
            <input id="ps-cname" type="text" className="sp-input" value={contactName} onChange={e => setContactName(e.target.value)} />
          </div>

          <div className="sp-grid-2" style={{ marginBottom: 14 }}>
            <div className="sp-field">
              <label className="sp-label" htmlFor="ps-cemail">Contact email</label>
              <input id="ps-cemail" type="email" className="sp-input" value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
            </div>
            <div className="sp-field">
              <label className="sp-label" htmlFor="ps-cphone">Contact phone</label>
              <input id="ps-cphone" type="tel" className="sp-input" value={contactPhone} onChange={e => setContactPhone(e.target.value)} />
            </div>
          </div>

          <div className="sp-field">
            <label className="sp-label" htmlFor="ps-addr">Address</label>
            <textarea id="ps-addr" className="sp-textarea" rows={2} value={address} onChange={e => setAddress(e.target.value)} />
          </div>
        </div>

        {/* Account help — no self-service deactivation exists, so this points to support
            rather than pretending a "Request deactivation" button does something real. */}
        <div className="pl-card" style={{ marginBottom: 24, border: '1px solid #F5C27A' }}>
          <div className="pl-card__title" style={{ color: '#8B3A00' }}>Need to deactivate your account?</div>
          <p style={{ fontSize: 13, color: '#6B7B6E', marginBottom: 0, lineHeight: 1.5 }}>
            Account deactivation isn't self-service yet — email{' '}
            <a href="mailto:support@fiveelements.tech" style={{ color: '#8B3A00', fontWeight: 600 }}>support@fiveelements.tech</a>{' '}
            and our team will handle it. All projects and evidence are retained for ledger integrity regardless.
          </p>
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
