import React, { useEffect, useState } from 'react'
import PartnerLayout from './PartnerLayout'
import { useAuth } from '../../contexts/AuthContext'
import './Partner.css'

interface Funder {
  id:          string
  name:        string
  type:        'individual' | 'business'
  project:     string
  treesFunded: number
  amountPaid:  string
  fundedAt:    string
  anonymous:   boolean
}

export default function FundersView() {
  const { session } = useAuth()
  const [funders,  setFunders]  = useState<Funder[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')

  useEffect(() => {
    fetch(
      `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/partner/funders`,
      { headers: { Authorization: `Bearer ${session?.access_token || ''}` } }
    )
      .then(r => r.json())
      .then(d => setFunders(d.funders || []))
      .catch(() => setFunders([]))
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

      {/* Stats */}
      <div className="pl-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
        <div className="pl-stat">
          <div className="pl-stat__num">{totalFunders}</div>
          <div className="pl-stat__label">Total funders</div>
        </div>
        <div className="pl-stat">
          <div className="pl-stat__num">{totalTrees.toLocaleString()}</div>
          <div className="pl-stat__label">Trees funded</div>
        </div>
        <div className="pl-stat">
          <div className="pl-stat__num">{funders.filter(f => f.type === 'business').length}</div>
          <div className="pl-stat__label">Business funders</div>
        </div>
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PartnerLayout>
  )
}