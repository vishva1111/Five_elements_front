import React, { useEffect, useState } from 'react'
import AdminLayout from './AdminLayout'
import { useAuth } from '../../contexts/AuthContext'
import './Admin.css'

interface Transaction {
  id:        string
  type:      'funding' | 'payout' | 'refund' | 'fee'
  amount:    number
  currency:  string
  from:      string
  to:        string
  project:   string
  status:    'completed' | 'pending' | 'failed'
  date:      string
}

interface FinanceSummary {
  totalRevenue:    number
  totalPayouts:    number
  pendingPayouts:  number
  platformFees:    number
  currency:        string
}

const TYPE_BADGE: Record<string, string> = {
  funding: 'approved',
  payout:  'in_review',
  refund:  'pending',
  fee:     'info',
}

export default function FinanceConsole() {
  const { session } = useAuth()

  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [txns,    setTxns]    = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<'all' | 'funding' | 'payout' | 'refund' | 'fee'>('all')

  const API     = import.meta.env.VITE_API_URL || 'http://localhost:5000'
  const headers = { Authorization: `Bearer ${session?.access_token || ''}` }

  useEffect(() => {
    fetch(`${API}/api/admin/finance`, { headers })
      .then(r => r.json())
      .then(d => { setSummary(d.summary || null); setTxns(d.transactions || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [session])

  const filtered = filter === 'all' ? txns : txns.filter(t => t.type === filter)

  const fmt = (n: number) => `£${(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <AdminLayout title="Finance console" subtitle="Revenue, payouts & reconciliation">

      {/* Summary strip */}
      <div className="ad-stats ad-grid-4" style={{ marginBottom: 20 }}>
        <div className="ad-stat ad-stat--ok">
          <div className="ad-stat__num">{loading ? '—' : fmt(summary?.totalRevenue || 0)}</div>
          <div className="ad-stat__label">Total revenue</div>
        </div>
        <div className="ad-stat">
          <div className="ad-stat__num">{loading ? '—' : fmt(summary?.totalPayouts || 0)}</div>
          <div className="ad-stat__label">Total payouts</div>
        </div>
        <div className="ad-stat ad-stat--warn">
          <div className="ad-stat__num">{loading ? '—' : fmt(summary?.pendingPayouts || 0)}</div>
          <div className="ad-stat__label">Pending payouts</div>
        </div>
        <div className="ad-stat">
          <div className="ad-stat__num">{loading ? '—' : fmt(summary?.platformFees || 0)}</div>
          <div className="ad-stat__label">Platform fees</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="ad-tabs">
        {(['all', 'funding', 'payout', 'refund', 'fee'] as const).map(f => (
          <button key={f} type="button" className={`ad-tab${filter === f ? ' ad-tab--active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? `All (${txns.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)}s (${txns.filter(t => t.type === f).length})`}
          </button>
        ))}
      </div>

      <div className="ad-card">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3,4,5].map(i => <div key={i} className="ad-skel" style={{ height: 44 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="ad-empty">
            <div className="ad-empty__icon">💳</div>
            <div className="ad-empty__title">No transactions</div>
            <div className="ad-empty__sub">No {filter === 'all' ? '' : filter} transactions recorded yet.</div>
          </div>
        ) : (
          <table className="ad-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>From</th>
                <th>To</th>
                <th>Project</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id}>
                  <td style={{ color: '#9AA79C', fontSize: 12 }}>{t.date}</td>
                  <td><span className={`ad-badge ad-badge--${TYPE_BADGE[t.type]}`}>{t.type}</span></td>
                  <td style={{ fontSize: 12.5, color: '#6B7B6E' }}>{t.from}</td>
                  <td style={{ fontSize: 12.5, color: '#6B7B6E' }}>{t.to}</td>
                  <td style={{ fontSize: 12.5 }}>{t.project || '—'}</td>
                  <td style={{ fontWeight: 700, color: t.type === 'refund' ? '#C62828' : '#112121' }}>
                    {t.type === 'refund' ? '-' : ''}{fmt(t.amount)}
                  </td>
                  <td>
                    <span className={`ad-badge ad-badge--${t.status === 'completed' ? 'approved' : t.status === 'pending' ? 'pending' : 'rejected'}`}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  )
}