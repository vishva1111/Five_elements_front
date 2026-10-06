import React, { useCallback, useEffect, useState } from 'react'
import AdminLayout from './AdminLayout'
import { useAuth } from '../../contexts/AuthContext'
import { API_URL } from '../../config/api'
import { CheckCircle2 } from 'lucide-react'
import Pagination, { usePagination } from '../../components/ui/Pagination'
import ChangeRequestReview, { type ChangeRequest } from '../../components/project/ChangeRequestReview'
import { formatDate } from '../../components/tree/treeLabels'
import './Admin.css'

type Tab = 'pending' | 'approved' | 'rejected'
const TABS: { key: Tab; label: string }[] = [
  { key: 'pending',  label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
]
const CHIP: Record<Tab, string> = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' }
const CHIP_STYLE: Record<Tab, { bg: string; fg: string }> = {
  pending:  { bg: '#FFF4E0', fg: '#8B5A00' },
  approved: { bg: '#EAF3DE', fg: '#27500A' },
  rejected: { bg: '#FBE9E9', fg: '#A32020' },
}

export default function FencingRequests() {
  const { session } = useAuth()
  const [tab, setTab] = useState<Tab>('pending')
  const [rows, setRows] = useState<ChangeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState<ChangeRequest | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`${API_URL}/api/admin/change-requests?status=${tab}`, { headers: { Authorization: `Bearer ${session?.access_token || ''}` } })
      .then(r => r.json())
      .then(d => setRows((d.requests || []).filter((r: ChangeRequest) => r.type === 'fencing' || r.type === 'boundary')))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [tab, session])
  useEffect(() => { load() }, [load])

  const pg = usePagination(rows, 10, tab)

  return (
    <AdminLayout title="Fencing requests">
      <div className="ad-tabs">
        {TABS.map(t => (
          <button key={t.key} type="button" className={`ad-tab${tab === t.key ? ' ad-tab--active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="ad-card">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 0' }}>
            {[1, 2, 3].map(i => <div key={i} className="ad-skel" style={{ height: 44 }} />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="ad-empty">
            <div className="ad-empty__icon"><CheckCircle2 size={40} strokeWidth={1.5} color="#2B5341" /></div>
            <div className="ad-empty__title">No fencing requests right now</div>
          </div>
        ) : (
          <>
            <table className="ad-table">
              <tbody>
                {pg.items.map(r => (
                  <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setReviewing(r)}>
                    <td style={{ fontWeight: 600, minWidth: 220 }}>{r.projectName}</td>
                    <td className="ad-table__muted">{r.requestedByName || '—'}</td>
                    <td className="ad-table__muted">{formatDate(r.createdAt)}</td>
                    <td>
                      <span style={{ background: CHIP_STYLE[r.status].bg, color: CHIP_STYLE[r.status].fg, padding: '2px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 700 }}>
                        {CHIP[r.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination {...pg} noun="request" />
          </>
        )}
      </div>

      {reviewing && (
        <ChangeRequestReview
          request={reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => { setReviewing(null); load() }}
        />
      )}
    </AdminLayout>
  )
}
