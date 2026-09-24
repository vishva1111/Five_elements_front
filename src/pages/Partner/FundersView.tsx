import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PartnerLayout from './PartnerLayout'
import { useAuth } from '../../contexts/AuthContext'
import { API_URL as API } from '../../config/api'
import './Partner.css'

interface Funder {
  id:          string
  name:        string
  rawName:     string
  type:        'individual' | 'business'
  project:     string
  treesFunded: number
  amountPaid:  string
  amountPaidRaw: number
  fundedAt:    string
  fundedAtRaw: string
  anonymous:   boolean
}

export default function FundersView() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [funders,  setFunders]  = useState<Funder[]>([])
  const [summary,  setSummary]  = useState<{ funded: number; delivered: number; outstanding: number } | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')

  const [editing,    setEditing]    = useState<Funder | null>(null)
  const [editForm,   setEditForm]   = useState<{ name: string; trees: string; amount: string; date: string; anonymous: boolean }>({ name: '', trees: '', amount: '', date: '', anonymous: false })
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError,  setEditError]  = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Funder | null>(null)
  const [deleting,      setDeleting]      = useState(false)
  const [notice,        setNotice]        = useState<string | null>(null)

  const token = session?.access_token

  async function reload() {
    const res = await fetch(`${API}/api/partner/funders`, { headers: { Authorization: `Bearer ${token || ''}` } })
    const d = await res.json()
    if (res.ok) { setFunders(d.funders || []); setSummary(d.summary || null) }
  }

  function openEdit(f: Funder) {
    setEditing(f)
    setEditError(null)
    setEditForm({
      name: f.rawName || f.name,
      trees: String(f.treesFunded),
      amount: String(f.amountPaidRaw),
      date: f.fundedAtRaw,
      anonymous: f.anonymous,
    })
  }

  async function saveEdit() {
    if (!editing) return
    setSavingEdit(true)
    setEditError(null)
    try {
      const res = await fetch(`${API}/api/partner/funders/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          funder_name: editForm.name,
          trees_funded: Number(editForm.trees),
          amount_paid: Number(editForm.amount),
          public_attribution: !editForm.anonymous,
          funded_at: editForm.date ? new Date(editForm.date).toISOString() : undefined,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed to save')
      setEditing(null)
      setNotice('Donation updated.')
      await reload()
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSavingEdit(false)
    }
  }

  async function doDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      const res = await fetch(`${API}/api/partner/funders/${confirmDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed to delete')
      setNotice('Donation record deleted.')
      setConfirmDelete(null)
      await reload()
    } catch {
      setConfirmDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    fetch(
      `${API}/api/partner/funders`,
      { headers: { Authorization: `Bearer ${session?.access_token || ''}` } }
    )
      .then(r => r.json())
      .then(d => { setFunders(d.funders || []); setSummary(d.summary || null) })
      .catch(() => { setFunders([]); setSummary(null) })
      .finally(() => setLoading(false))
  }, [session])

  const filtered = funders.filter(f =>
    !search ||
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.project.toLowerCase().includes(search.toLowerCase())
  )

  const totalTrees  = funders.reduce((s, f) => s + f.treesFunded, 0)
  const totalFunders = funders.length

  return (
    <PartnerLayout title="Funders view">

      {notice && (
        <div style={{ background: '#EAF3DE', border: '1px solid #AACBA7', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#27500A', marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <span>✓ {notice}</span>
          <button type="button" onClick={() => setNotice(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button type="button" className="pl-btn pl-btn--primary" onClick={() => navigate('/partner/funders/import')}>
          + Import donations
        </button>
      </div>

      {/* Delivery summary — funded vs approved-delivered vs outstanding (P8-02).
          Delivered counts Super-Admin-approved evidence only, the same rule the
          dashboard and the funders themselves see. */}
      <div className="pl-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 16 }}>
        <div className="pl-stat">
          <div className="pl-stat__num">{totalFunders}</div>
          <div className="pl-stat__label">Funders</div>
        </div>
        <div className="pl-stat">
          <div className="pl-stat__num">{(summary?.funded ?? totalTrees).toLocaleString('en-IN')}</div>
          <div className="pl-stat__label">Funded total</div>
        </div>
        <div className="pl-stat">
          <div className="pl-stat__num">{(summary?.delivered ?? 0).toLocaleString('en-IN')}</div>
          <div className="pl-stat__label">Delivered (approved)</div>
        </div>
        <div className="pl-stat" style={{ background: '#112121', borderColor: '#112121' }}>
          <div className="pl-stat__num" style={{ color: '#F09125' }}>{(summary?.outstanding ?? 0).toLocaleString('en-IN')}</div>
          <div className="pl-stat__label" style={{ color: '#AACBA7' }}>Outstanding</div>
        </div>
      </div>

      <div style={{ background: '#F5F0EC', borderRadius: 10, padding: '12px 16px', fontSize: 12.5, color: '#6B7B6E', lineHeight: 1.6, marginBottom: 20 }}>
        <strong style={{ color: '#112121' }}>How attribution works:</strong> when evidence is approved, its units are
        allocated to funders in funding order (oldest first). Each funder is notified automatically with the evidence
        attached — you never write a funder report by hand.
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          className="sp-input"
          style={{ maxWidth: 320 }}
          placeholder="Search by name or project…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="pl-card">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3,4].map(i => <div key={i} className="pl-skel" style={{ height: 40 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="pl-empty">
            <div className="pl-empty__icon">💰</div>
            <div className="pl-empty__title">No funders yet</div>
            <div className="pl-empty__sub">Once your projects are approved and listed, funders will appear here.</div>
          </div>
        ) : (
          <table className="pl-table">
            <thead>
              <tr>
                <th>Funder</th>
                <th>Type</th>
                <th>Project</th>
                <th>Trees</th>
                <th>Amount</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id}>
                  <td style={{ fontWeight: 600 }}>
                    {f.anonymous ? (
                      <span style={{ color: '#9AA79C', fontStyle: 'italic' }}>Anonymous</span>
                    ) : f.name}
                  </td>
                  <td>
                    <span className={`pl-badge pl-badge--${f.type === 'business' ? 'info' : 'approved'}`}>
                      {f.type}
                    </span>
                  </td>
                  <td style={{ color: '#6B7B6E', fontSize: 12.5 }}>{f.project}</td>
                  <td style={{ fontWeight: 700, color: '#2B5341' }}>{f.treesFunded.toLocaleString()}</td>
                  <td style={{ color: '#112121' }}>{f.amountPaid}</td>
                  <td style={{ color: '#9AA79C', fontSize: 12 }}>{f.fundedAt}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" className="pl-btn pl-btn--ghost" style={{ height: 26, fontSize: 11, padding: '0 8px' }} onClick={() => openEdit(f)}>Edit</button>
                      <button type="button" className="pl-btn pl-btn--ghost" style={{ height: 26, fontSize: 11, padding: '0 8px', color: '#A32020' }} onClick={() => setConfirmDelete(f)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <div onClick={() => setEditing(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(17,33,33,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} className="pl-card" style={{ width: 'min(440px, 100%)' }}>
            <div className="pl-card__title">Edit donation</div>

            {editError && (
              <div style={{ background: '#FEF0E3', border: '0.5px solid #F5C27A', borderRadius: 9, padding: '8px 12px', fontSize: 12.5, color: '#8B3A00', marginBottom: 12 }}>
                {editError}
              </div>
            )}

            <div className="sp-field" style={{ marginBottom: 12 }}>
              <label className="sp-label sp-label--required">Donor name</label>
              <input className="sp-input" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </div>

            <div className="sp-grid-2" style={{ marginBottom: 12 }}>
              <div className="sp-field">
                <label className="sp-label">Trees funded</label>
                <input type="number" min={1} className="sp-input" value={editForm.trees} onChange={e => setEditForm(f => ({ ...f, trees: e.target.value }))} />
              </div>
              <div className="sp-field">
                <label className="sp-label">Amount (₹)</label>
                <input type="number" min={0} className="sp-input" value={editForm.amount} onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
            </div>

            <div className="sp-field" style={{ marginBottom: 12 }}>
              <label className="sp-label">Date</label>
              <input type="date" className="sp-input" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#112121', marginBottom: 18 }}>
              <input type="checkbox" checked={editForm.anonymous} onChange={e => setEditForm(f => ({ ...f, anonymous: e.target.checked }))} />
              Show as Anonymous
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="pl-btn pl-btn--ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button type="button" className="pl-btn pl-btn--primary" onClick={saveEdit} disabled={savingEdit}>
                {savingEdit ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div onClick={() => setConfirmDelete(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(17,33,33,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} className="pl-card" style={{ width: 'min(420px, 100%)' }}>
            <div className="pl-card__title">Delete this donation?</div>
            <p style={{ fontSize: 13.5, color: '#6B7B6E', lineHeight: 1.6, margin: '0 0 8px' }}>
              <strong>{confirmDelete.name}</strong> — {confirmDelete.treesFunded} trees, {confirmDelete.amountPaid}. This cannot be undone.
            </p>
            <p style={{ fontSize: 12, color: '#6B7B6E', margin: 0 }}>
              The project's funded total will be adjusted down accordingly.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
              <button type="button" className="pl-btn pl-btn--ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button type="button" className="pl-btn pl-btn--primary" style={{ background: '#A32020', borderColor: '#A32020' }} onClick={doDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PartnerLayout>
  )
}