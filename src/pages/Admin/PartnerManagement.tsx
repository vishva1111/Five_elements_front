import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AdminLayout from './AdminLayout'
import { useAuth } from '../../contexts/AuthContext'
import { API_URL as API } from '../../config/api'
import './Admin.css'

interface Partner {
  id:           string
  orgName:      string
  orgType:      string
  contactName:  string
  contactEmail: string
  website:      string
  yearsActive:  number
  status:       string
  appliedAt:    string
  description:  string
}

export default function PartnerManagement() {
  const { session } = useAuth()
  const navigate    = useNavigate()

  const [partners, setPartners] = useState<Partner[]>([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [selected, setSelected] = useState<Partner | null>(null)
  const [notes,    setNotes]    = useState('')
  const [acting,   setActing]   = useState<'approve' | 'reject' | null>(null)
  const [msg,      setMsg]      = useState('')

  // ── Create-partner form (top-down path: admin makes the org + its login) ──
  const [showCreate,  setShowCreate]  = useState(false)
  const [creating,    setCreating]    = useState(false)
  const [createErr,   setCreateErr]   = useState('')
  const [newPartner,  setNewPartner]  = useState<{ email: string; tempPassword: string | null; reused: boolean } | null>(null)
  const [form, setForm] = useState({
    orgName: '', orgType: '', contactName: '', contactEmail: '',
    contactPhone: '', website: '', address: '', description: '',
  })

  const setField = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` }

  useEffect(() => {
    fetch(`${API}/api/admin/partners`, { headers })
      .then(r => r.json())
      .then(d => setPartners(d.partners || []))
      .catch(() => setPartners([]))
      .finally(() => setLoading(false))
  }, [session])

  const filtered = filter === 'all' ? partners : partners.filter(p => p.status === filter)

  async function reloadPartners() {
    const res = await fetch(`${API}/api/admin/partners`, { headers })
    const d = await res.json()
    if (res.ok) setPartners(d.partners || [])
  }

  async function handleCreate() {
    if (!form.orgName.trim() || !form.contactName.trim() || !form.contactEmail.trim()) {
      setCreateErr('Organisation name, contact name and contact email are required.')
      return
    }
    setCreating(true)
    setCreateErr('')
    try {
      const res = await fetch(`${API}/api/admin/partners`, {
        method: 'POST',
        headers,
        body: JSON.stringify(form),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed to create partner')
      setNewPartner({
        email: form.contactEmail,
        tempPassword: d.tempPassword || null,
        reused: !!d.reusedExistingAccount,
      })
      setForm({ orgName: '', orgType: '', contactName: '', contactEmail: '', contactPhone: '', website: '', address: '', description: '' })
      setShowCreate(false)
      await reloadPartners()
    } catch (e: unknown) {
      setCreateErr(e instanceof Error ? e.message : 'Failed to create partner')
    } finally {
      setCreating(false)
    }
  }

  async function handleDecision(action: 'approve' | 'reject') {
    if (!selected) return
    if (action === 'reject' && !notes.trim()) { setMsg('Please add notes for rejection.'); return }
    setActing(action)
    setMsg('')
    try {
      const res = await fetch(`${API}/api/admin/partners/${selected.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: action === 'approve' ? 'approved' : 'rejected', reviewNotes: notes }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      setPartners(prev => prev.map(p => p.id === selected.id ? { ...p, status: action === 'approve' ? 'approved' : 'rejected' } : p))
      setMsg(action === 'approve' ? '✅ Partner approved — they can now access the partner portal.' : '❌ Partner rejected — they have been notified.')
      setSelected(null)
      setNotes('')
    } catch (e: any) {
      setMsg(e.message)
    } finally {
      setActing(null)
    }
  }

  return (
    <AdminLayout title="Partner management" subtitle={`${partners.filter(p => p.status === 'pending').length} pending`}>

      {msg && <div className={`ad-alert ${msg.startsWith('✅') ? 'ad-alert--success' : msg.startsWith('❌') ? 'ad-alert--warn' : 'ad-alert--danger'}`}>{msg}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button type="button" className="ad-btn ad-btn--primary" onClick={() => { setShowCreate(v => !v); setCreateErr('') }}>
          {showCreate ? 'Cancel' : '+ Create partner'}
        </button>
      </div>

      {newPartner && (
        <div className="ad-alert ad-alert--success" style={{ display: 'block' }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            {newPartner.reused ? 'Partner profile created for an existing account ✓' : 'Partner created and invite emailed ✓'}
          </div>
          {newPartner.tempPassword ? (
            <>
              <div style={{ fontSize: 13 }}>
                <strong>{newPartner.email}</strong> can sign in with this temporary password:
              </div>
              <div style={{ marginTop: 6, fontFamily: 'monospace', fontSize: 15, fontWeight: 700, background: '#fff', border: '1px solid #AACBA7', borderRadius: 6, padding: '6px 12px', display: 'inline-block', color: '#112121' }}>
                {newPartner.tempPassword}
              </div>
              <div style={{ fontSize: 11.5, marginTop: 6, opacity: 0.8 }}>
                Shown once — copy it now if you need to pass it on.
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13 }}>
              <strong>{newPartner.email}</strong> already had an account; it now has partner access. No new password was issued.
            </div>
          )}
          <button type="button" onClick={() => setNewPartner(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, textDecoration: 'underline', marginTop: 8, padding: 0, color: 'inherit' }}>
            Dismiss
          </button>
        </div>
      )}

      {showCreate && (
        <div className="ad-card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>Create a partner</h3>
          <p style={{ fontSize: 12.5, color: '#6B7B6E', margin: '0 0 16px' }}>
            Creates the organisation and its login in one step, already approved — no application needed.
          </p>

          {createErr && <div className="ad-alert ad-alert--danger">{createErr}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {([
              ['orgName',      'Organisation name *', 'Terra Roots Foundation'],
              ['orgType',      'Organisation type',   'NGO / Trust / Co-operative'],
              ['contactName',  'Contact name *',      'Priya Nair'],
              ['contactEmail', 'Contact email *',     'priya@terraroots.org'],
              ['contactPhone', 'Contact phone',       '+91 98765 43210'],
              ['website',      'Website',             'https://terraroots.org'],
              ['address',      'Registered address',  'City, State, Country'],
            ] as const).map(([key, label, ph]) => (
              <div key={key} className="sp-field">
                <label className="sp-label" htmlFor={`cp-${key}`}>{label}</label>
                <input
                  id={`cp-${key}`}
                  type={key === 'contactEmail' ? 'email' : 'text'}
                  className="sp-input"
                  placeholder={ph}
                  value={form[key]}
                  onChange={setField(key)}
                />
              </div>
            ))}
            <div className="sp-field" style={{ gridColumn: '1 / -1' }}>
              <label className="sp-label" htmlFor="cp-description">Description</label>
              <textarea id="cp-description" className="sp-textarea" rows={3} placeholder="What this organisation does…" value={form.description} onChange={setField('description')} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
            <button type="button" className="ad-btn ad-btn--ghost" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="button" className="ad-btn ad-btn--primary" onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating…' : 'Create partner'}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 20, alignItems: 'start' }}>

        {/* Table */}
        <div>
          <div className="ad-tabs">
            {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
              <button key={f} type="button" className={`ad-tab${filter === f ? ' ad-tab--active' : ''}`} onClick={() => setFilter(f)}>
                {f === 'all' ? `All (${partners.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${partners.filter(p => p.status === f).length})`}
              </button>
            ))}
          </div>

          <div className="ad-card">
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1,2,3].map(i => <div key={i} className="ad-skel" style={{ height: 48 }} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="ad-empty">
                <div className="ad-empty__icon">🤝</div>
                <div className="ad-empty__title">No {filter === 'all' ? '' : filter} partners</div>
              </div>
            ) : (
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>Organisation</th>
                    <th>Type</th>
                    <th>Contact</th>
                    <th>Applied</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id} style={{ cursor: 'pointer', background: selected?.id === p.id ? '#F5F0EC' : undefined }}>
                      <td style={{ fontWeight: 600 }}>{p.orgName}</td>
                      <td style={{ color: '#6B7B6E', fontSize: 12.5 }}>{p.orgType || '—'}</td>
                      <td style={{ fontSize: 12.5 }}>
                        <div>{p.contactName}</div>
                        <div style={{ color: '#9AA79C' }}>{p.contactEmail}</div>
                      </td>
                      <td style={{ color: '#9AA79C', fontSize: 12 }}>{p.appliedAt}</td>
                      <td><span className={`ad-badge ad-badge--${p.status}`}>{p.status}</span></td>
                      <td>
                        <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => { setSelected(p); setNotes(''); setMsg('') }}>
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="ad-card" style={{ position: 'sticky', top: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div className="ad-card__title" style={{ margin: 0 }}>{selected.orgName}</div>
              <button type="button" style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9AA79C' }} onClick={() => setSelected(null)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Type',         value: selected.orgType || '—' },
                { label: 'Contact',      value: `${selected.contactName} · ${selected.contactEmail}` },
                { label: 'Website',      value: selected.website || '—' },
                { label: 'Years active', value: selected.yearsActive ? `${selected.yearsActive} years` : '—' },
                { label: 'Applied',      value: selected.appliedAt },
                { label: 'Status',       value: selected.status },
              ].map(f => (
                <div key={f.label}>
                  <div style={{ fontSize: 11, color: '#9AA79C', fontWeight: 600, marginBottom: 1 }}>{f.label}</div>
                  <div style={{ fontSize: 13, color: '#112121' }}>{f.value}</div>
                </div>
              ))}
            </div>

            {selected.description && (
              <div style={{ background: '#F5F0EC', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#6B7B6E', lineHeight: 1.5, marginBottom: 14 }}>
                {selected.description}
              </div>
            )}

            {selected.status === 'pending' && (
              <>
                <div className="ad-field">
                  <label className="ad-label" htmlFor="pm-notes">Review notes</label>
                  <textarea id="pm-notes" className="ad-textarea" rows={3} placeholder="Required for rejection…" value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="ad-btn ad-btn--primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => handleDecision('approve')} disabled={!!acting}>
                    {acting === 'approve' ? 'Approving…' : '✅ Approve'}
                  </button>
                  <button type="button" className="ad-btn ad-btn--danger" style={{ flex: 1, justifyContent: 'center' }} onClick={() => handleDecision('reject')} disabled={!!acting}>
                    {acting === 'reject' ? 'Rejecting…' : '❌ Reject'}
                  </button>
                </div>
              </>
            )}

            {selected.status !== 'pending' && (
              <div className={`ad-alert ${selected.status === 'approved' ? 'ad-alert--success' : 'ad-alert--danger'}`}>
                This application has already been {selected.status}.
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}