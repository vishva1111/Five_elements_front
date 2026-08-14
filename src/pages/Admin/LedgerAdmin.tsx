import React, { useEffect, useState } from 'react'
import AdminLayout from './AdminLayout'
import { useAuth } from '../../contexts/AuthContext'
import './Admin.css'

interface LedgerEntry {
  id:            string
  project:       string
  projectId:     string
  funder:        string
  trees:         number
  tCo2e:         number
  verified:      boolean
  txHash:        string
  date:          string
  supersededBy?: string
  publicHash:    string
  approvedBy?:   string
}

export default function LedgerAdmin() {
  const { session } = useAuth()

  const [entries,  setEntries]  = useState<LedgerEntry[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [selected, setSelected] = useState<LedgerEntry | null>(null)
  const [notes,    setNotes]    = useState('')
  const [acting,   setActing]   = useState(false)
  const [msg,      setMsg]      = useState('')

  const API     = import.meta.env.VITE_API_URL || 'http://localhost:5000'
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` }

  useEffect(() => {
    fetch(`${API}/api/admin/ledger`, { headers })
      .then(r => r.json())
      .then(d => setEntries(d.entries || []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [session])

  const filtered = entries.filter(e =>
    !search ||
    e.project.toLowerCase().includes(search.toLowerCase()) ||
    e.funder.toLowerCase().includes(search.toLowerCase()) ||
    e.publicHash?.toLowerCase().includes(search.toLowerCase())
  )

  async function supersede() {
    if (!selected || !notes.trim()) { setMsg('Please add a reason for superseding this entry.'); return }
    setActing(true)
    setMsg('')
    try {
      const res = await fetch(`${API}/api/admin/ledger/${selected.id}/supersede`, {
        method: 'POST', headers,
        body: JSON.stringify({ reason: notes }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      setEntries(prev => prev.map(e => e.id === selected.id ? { ...e, supersededBy: 'new' } : e))
      setMsg('✅ Entry superseded — a corrected entry has been created.')
      setSelected(null)
      setNotes('')
    } catch (e: any) {
      setMsg(e.message)
    } finally {
      setActing(false)
    }
  }

  return (
    <AdminLayout title="Ledger administration" subtitle={`${entries.length} entries`}>

      {msg && <div className={`ad-alert ${msg.startsWith('✅') ? 'ad-alert--success' : 'ad-alert--danger'}`} style={{ cursor: 'pointer' }} onClick={() => setMsg('')}>{msg} ✕</div>}

      <div className="ad-stats ad-grid-3" style={{ marginBottom: 20 }}>
        <div className="ad-stat ad-stat--ok">
          <div className="ad-stat__num">{entries.filter(e => e.verified && !e.supersededBy).length}</div>
          <div className="ad-stat__label">Verified entries</div>
        </div>
        <div className="ad-stat">
          <div className="ad-stat__num">{entries.filter(e => !e.verified).length}</div>
          <div className="ad-stat__label">Unverified</div>
        </div>
        <div className="ad-stat ad-stat--warn">
          <div className="ad-stat__num">{entries.filter(e => e.supersededBy).length}</div>
          <div className="ad-stat__label">Superseded</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 360px' : '1fr', gap: 20, alignItems: 'start' }}>

        <div>
          <div style={{ marginBottom: 14 }}>
            <input type="text" className="ad-input" style={{ maxWidth: 340 }} placeholder="Search project, funder, hash…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="ad-card">
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1,2,3,4].map(i => <div key={i} className="ad-skel" style={{ height: 44 }} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="ad-empty">
                <div className="ad-empty__icon">📒</div>
                <div className="ad-empty__title">No ledger entries found</div>
              </div>
            ) : (
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Project</th>
                    <th>Funder</th>
                    <th>Trees</th>
                    <th>tCO₂e</th>
                    <th>Hash</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e.id} style={{ background: selected?.id === e.id ? '#F5F0EC' : undefined }}>
                      <td style={{ color: '#9AA79C', fontSize: 12 }}>{e.date}</td>
                      <td style={{ fontWeight: 600, fontSize: 13 }}>{e.project}</td>
                      <td style={{ color: '#6B7B6E', fontSize: 12.5 }}>{e.funder}</td>
                      <td style={{ fontWeight: 600 }}>{e.trees?.toLocaleString()}</td>
                      <td style={{ color: '#6B7B6E' }}>{e.tCo2e?.toFixed(2)}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#9AA79C' }}>{e.publicHash?.slice(0, 12)}…</td>
                      <td>
                        {e.supersededBy
                          ? <span className="ad-badge ad-badge--superseded">Superseded</span>
                          : e.verified
                            ? <span className="ad-badge ad-badge--approved">Verified</span>
                            : <span className="ad-badge ad-badge--pending">Unverified</span>
                        }
                      </td>
                      <td>
                        {!e.supersededBy && (
                          <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => { setSelected(e); setNotes(''); setMsg('') }}>
                            Supersede
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Supersede panel */}
        {selected && (
          <div className="ad-card" style={{ position: 'sticky', top: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div className="ad-card__title" style={{ margin: 0 }}>Supersede entry</div>
              <button type="button" style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9AA79C' }} onClick={() => setSelected(null)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {[
                { label: 'Project', value: selected.project },
                { label: 'Funder',  value: selected.funder },
                { label: 'Trees',   value: selected.trees?.toLocaleString() },
                { label: 'tCO₂e',  value: selected.tCo2e?.toFixed(2) },
                { label: 'Date',    value: selected.date },
                { label: 'Hash',    value: selected.publicHash },
              ].map(f => (
                <div key={f.label}>
                  <div style={{ fontSize: 11, color: '#9AA79C', fontWeight: 600, marginBottom: 1 }}>{f.label}</div>
                  <div style={{ fontSize: 12.5, color: '#112121', fontFamily: f.label === 'Hash' ? 'monospace' : undefined, wordBreak: 'break-all' }}>{f.value}</div>
                </div>
              ))}
            </div>

            <div className="ad-alert ad-alert--warn" style={{ marginBottom: 14 }}>
              Superseding creates a corrected replacement entry and marks this one as superseded. This action is permanent.
            </div>

            <div className="ad-field">
              <label className="ad-label" htmlFor="la-reason">Reason for superseding *</label>
              <textarea id="la-reason" className="ad-textarea" rows={4} placeholder="Describe the correction being made…" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>

            <button type="button" className="ad-btn ad-btn--danger" style={{ width: '100%', justifyContent: 'center' }} onClick={supersede} disabled={acting}>
              {acting ? 'Processing…' : '⚠️ Supersede this entry'}
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}