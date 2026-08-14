import React, { useEffect, useState } from 'react'
import AdminLayout from './AdminLayout'
import { useAuth } from '../../contexts/AuthContext'
import './Admin.css'

interface User {
  id:        string
  email:     string
  role:      string
  name:      string
  createdAt: string
  lastSeen:  string
  status:    'active' | 'suspended' | 'pending'
}

const ROLE_COLORS: Record<string, string> = {
  individual: 'approved',
  business:   'in_review',
  partner:    'info',
  admin:      'rejected',
}

export default function UsersAndTenants() {
  const { session } = useAuth()

  const [users,   setUsers]   = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'individual' | 'business' | 'partner' | 'admin'>('all')
  const [acting,  setActing]  = useState<string | null>(null)
  const [msg,     setMsg]     = useState('')

  const API     = import.meta.env.VITE_API_URL || 'http://localhost:5000'
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` }

  useEffect(() => {
    fetch(`${API}/api/admin/users`, { headers })
      .then(r => r.json())
      .then(d => setUsers(d.users || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }, [session])

  const filtered = users.filter(u => {
    const matchRole   = roleFilter === 'all' || u.role === roleFilter
    const matchSearch = !search || u.email.toLowerCase().includes(search.toLowerCase()) || u.name.toLowerCase().includes(search.toLowerCase())
    return matchRole && matchSearch
  })

  async function toggleSuspend(user: User) {
    const newStatus = user.status === 'suspended' ? 'active' : 'suspended'
    setActing(user.id)
    try {
      await fetch(`${API}/api/admin/users/${user.id}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ status: newStatus }),
      })
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u))
      setMsg(`User ${user.email} ${newStatus === 'suspended' ? 'suspended' : 'reactivated'}.`)
    } catch {
      setMsg('Action failed.')
    } finally {
      setActing(null)
    }
  }

  const counts = {
    individual: users.filter(u => u.role === 'individual').length,
    business:   users.filter(u => u.role === 'business').length,
    partner:    users.filter(u => u.role === 'partner').length,
    admin:      users.filter(u => u.role === 'admin').length,
  }

  return (
    <AdminLayout title="Users & tenants" subtitle={`${users.length} total`}>

      {msg && <div className="ad-alert ad-alert--info" style={{ cursor: 'pointer' }} onClick={() => setMsg('')}>{msg} ✕</div>}

      {/* Stats */}
      <div className="ad-stats ad-grid-4" style={{ marginBottom: 20 }}>
        {Object.entries(counts).map(([role, count]) => (
          <div key={role} className="ad-stat" style={{ cursor: 'pointer' }} onClick={() => setRoleFilter(role as any)}>
            <div className="ad-stat__num">{count}</div>
            <div className="ad-stat__label" style={{ textTransform: 'capitalize' }}>{role}s</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          className="ad-input"
          style={{ maxWidth: 280 }}
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="ad-tabs" style={{ margin: 0 }}>
          {(['all', 'individual', 'business', 'partner', 'admin'] as const).map(r => (
            <button key={r} type="button" className={`ad-tab${roleFilter === r ? ' ad-tab--active' : ''}`} onClick={() => setRoleFilter(r)}>
              {r === 'all' ? 'All' : r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="ad-card">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3,4,5].map(i => <div key={i} className="ad-skel" style={{ height: 44 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="ad-empty">
            <div className="ad-empty__icon">👥</div>
            <div className="ad-empty__title">No users found</div>
            <div className="ad-empty__sub">Try adjusting your search or filter.</div>
          </div>
        ) : (
          <table className="ad-table">
            <thead>
              <tr>
                <th>Name / Email</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Last seen</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name || '—'}</div>
                    <div style={{ color: '#9AA79C', fontSize: 12 }}>{u.email}</div>
                  </td>
                  <td>
                    <span className={`ad-badge ad-badge--${ROLE_COLORS[u.role] || 'info'}`} style={{ textTransform: 'capitalize' }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ color: '#9AA79C', fontSize: 12 }}>{u.createdAt}</td>
                  <td style={{ color: '#9AA79C', fontSize: 12 }}>{u.lastSeen || '—'}</td>
                  <td>
                    <span className={`ad-badge ad-badge--${u.status === 'active' ? 'approved' : u.status === 'suspended' ? 'rejected' : 'pending'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`ad-btn ad-btn--sm ${u.status === 'suspended' ? 'ad-btn--primary' : 'ad-btn--danger'}`}
                      disabled={acting === u.id}
                      onClick={() => toggleSuspend(u)}
                    >
                      {acting === u.id ? '…' : u.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                    </button>
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