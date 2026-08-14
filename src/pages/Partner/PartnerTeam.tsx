import React, { useEffect, useState } from 'react'
import PartnerLayout from './PartnerLayout'
import { useAuth } from '../../contexts/AuthContext'
import './Partner.css'

interface TeamMember {
  id:        string
  name:      string
  email:     string
  role:      'admin' | 'field_officer' | 'viewer'
  status:    'active' | 'invited' | 'inactive'
  joinedAt:  string
  lastActive?: string
}

const ROLES = ['admin', 'field_officer', 'viewer'] as const

function roleLabel(r: string) {
  return r === 'field_officer' ? 'Field officer' : r.charAt(0).toUpperCase() + r.slice(1)
}

export default function PartnerTeam() {
  const { session } = useAuth()
  const [members,  setMembers]  = useState<TeamMember[]>([])
  const [loading,  setLoading]  = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole,  setInviteRole]  = useState<typeof ROLES[number]>('field_officer')
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    fetch(
      `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/partner/team`,
      { headers: { Authorization: `Bearer ${session?.access_token || ''}` } }
    )
      .then(r => r.json())
      .then(d => setMembers(d.members || []))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false))
  }, [session])

  async function handleInvite() {
    if (!inviteEmail) return
    setInviting(true)
    await new Promise(r => setTimeout(r, 800))
    const newMember: TeamMember = {
      id:       `${Date.now()}`,
      name:     inviteEmail.split('@')[0],
      email:    inviteEmail,
      role:     inviteRole,
      status:   'invited',
      joinedAt: 'Just now',
    }
    setMembers(prev => [...prev, newMember])
    setInviteEmail('')
    setShowInvite(false)
    setInviting(false)
  }

  function removeOrDeactivate(id: string) {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, status: 'inactive' } : m))
  }

  return (
    <PartnerLayout title="Team management">

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button type="button" className="pl-btn pl-btn--primary" onClick={() => setShowInvite(v => !v)}>
          + Invite team member
        </button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="pl-card" style={{ marginBottom: 20 }}>
          <div className="pl-card__title">Invite a team member</div>
          <div className="sp-grid-2" style={{ marginBottom: 14 }}>
            <div className="sp-field">
              <label className="sp-label" htmlFor="tm-email">Email address</label>
              <input id="tm-email" type="email" className="sp-input" placeholder="colleague@org.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
            </div>
            <div className="sp-field">
              <label className="sp-label" htmlFor="tm-role">Role</label>
              <select id="tm-role" className="sp-select" value={inviteRole} onChange={e => setInviteRole(e.target.value as typeof ROLES[number])}>
                {ROLES.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="pl-btn pl-btn--primary" onClick={handleInvite} disabled={inviting || !inviteEmail}>
              {inviting ? 'Sending…' : 'Send invite'}
            </button>
            <button type="button" className="pl-btn pl-btn--ghost" onClick={() => setShowInvite(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Role descriptions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { role: 'Admin',        desc: 'Full access — settings, team, submissions' },
          { role: 'Field officer', desc: 'Field capture, evidence upload, sync queue' },
          { role: 'Viewer',       desc: 'Read-only access to dashboard and reports' },
        ].map(r => (
          <div key={r.role} style={{ background: '#F5F0EC', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#112121', marginBottom: 3 }}>{r.role}</div>
            <div style={{ fontSize: 12, color: '#6B7B6E', lineHeight: 1.4 }}>{r.desc}</div>
          </div>
        ))}
      </div>

      {/* Members table */}
      <div className="pl-card">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3].map(i => <div key={i} className="pl-skel" style={{ height: 44 }} />)}
          </div>
        ) : members.length === 0 ? (
          <div className="pl-empty">
            <div className="pl-empty__icon">👥</div>
            <div className="pl-empty__title">No team members yet</div>
            <div className="pl-empty__sub">Invite field officers and admins to collaborate on projects and evidence.</div>
          </div>
        ) : (
          <table className="pl-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.id} style={{ opacity: m.status === 'inactive' ? 0.5 : 1 }}>
                  <td style={{ fontWeight: 600 }}>{m.name}</td>
                  <td style={{ color: '#6B7B6E', fontSize: 12.5 }}>{m.email}</td>
                  <td>
                    <span className={`pl-badge pl-badge--${m.role === 'admin' ? 'info' : m.role === 'field_officer' ? 'approved' : 'pending'}`}>
                      {roleLabel(m.role)}
                    </span>
                  </td>
                  <td>
                    <span className={`pl-badge pl-badge--${m.status === 'active' ? 'approved' : m.status === 'invited' ? 'progress' : 'pending'}`}>
                      {m.status}
                    </span>
                  </td>
                  <td style={{ color: '#9AA79C', fontSize: 12 }}>{m.joinedAt}</td>
                  <td>
                    {m.status !== 'inactive' && (
                      <button type="button" className="pl-btn pl-btn--ghost" style={{ height: 28, fontSize: 11.5, padding: '0 10px', color: '#8B3A00' }} onClick={() => removeOrDeactivate(m.id)}>
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PartnerLayout>
  )
}