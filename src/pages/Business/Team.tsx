import React, { useState, useEffect } from 'react'
import BusinessLayout from './BusinessLayout'
import { fetchTeam, inviteTeamMember, removeTeamMember, type TeamMember } from '../../services/api'
import './Dashboard.css'
import './Team.css'

function initialsOf(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function RolePill({ role }: { role: string }) {
  const key = role.toLowerCase()
  const cls =
    key === 'admin'  ? 'tm-role-pill--admin'  :
    key === 'editor' ? 'tm-role-pill--editor' :
    'tm-role-pill--viewer'
  return <span className={`tm-role-pill ${cls}`}>{role}</span>
}

export default function Team() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('Viewer')
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    fetchTeam()
      .then(d => setMembers(d.members))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setInviting(true)
    try {
      const res = await inviteTeamMember(email.split('@')[0], email, role)
      setMembers(prev => [...prev, res.member])
      setEmail('')
    } catch (err) {
      alert('Failed to invite member')
    } finally {
      setInviting(false)
    }
  }

  async function handleRemove(id: string) {
    try {
      await removeTeamMember(id)
      setMembers(prev => prev.filter(m => m.id !== id))
    } catch {
      alert('Failed to remove member')
    }
  }

  const adminCount  = members.filter(m => m.role.toLowerCase() === 'admin').length
  const editorCount = members.filter(m => m.role.toLowerCase() === 'editor').length
  const viewerCount = members.filter(m => m.role.toLowerCase() === 'viewer').length

  return (
    <BusinessLayout title="Team" subtitle="Manage who has access to your organisation's account.">
      {loading && (
        <div className="tm-loading">
          {[1, 2, 3].map(i => <div key={i} className="db-skel tm-skel-row" />)}
        </div>
      )}

      {error && <div className="db-error-banner">⚠ {error}</div>}

      {!loading && !error && (
        <>
          {/* Summary strip */}
          <div className="tm-summary-strip">
            <div className="tm-stat-card">
              <div className="tm-stat-card__label">Total members</div>
              <span className="tm-stat-card__num">{members.length}</span>
            </div>
            <div className="tm-stat-card">
              <div className="tm-stat-card__label">Admins</div>
              <span className="tm-stat-card__num">{adminCount}</span>
            </div>
            <div className="tm-stat-card">
              <div className="tm-stat-card__label">Editors</div>
              <span className="tm-stat-card__num">{editorCount}</span>
            </div>
            <div className="tm-stat-card">
              <div className="tm-stat-card__label">Viewers</div>
              <span className="tm-stat-card__num">{viewerCount}</span>
            </div>
          </div>

          {/* Table */}
          <div className="tm-table-wrap">
            <div className="tm-table-scroll">
              <div className="tm-table-head">
                <div className="tm-th">Name</div>
                <div className="tm-th">Email</div>
                <div className="tm-th">Role</div>
                <div className="tm-th"></div>
              </div>

              {members.length === 0 && (
                <div className="tm-empty-row">No team members yet. Invite someone below.</div>
              )}

              {members.map(m => (
                <div key={m.id} className="tm-table-row">
                  <div className="tm-td tm-member-name">
                    <span className="tm-avatar">{initialsOf(m.name)}</span>
                    {m.name}
                  </div>
                  <div className="tm-td tm-td--email">{m.email}</div>
                  <div className="tm-td">
                    <RolePill role={m.role} />
                  </div>
                  <div className="tm-td">
                    <button type="button" className="tm-remove-link" onClick={() => handleRemove(m.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Invite card */}
          <div className="tm-invite-card">
            <h2 className="tm-invite-title">Invite a team member</h2>
            <form onSubmit={handleInvite} className="tm-invite-form">
              <div className="tm-invite-row">
                <input
                  className="tm-invite-input"
                  type="email"
                  placeholder="colleague@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
                <select
                  className="tm-invite-select"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                >
                  <option>Admin</option>
                  <option>Editor</option>
                  <option>Viewer</option>
                </select>
              </div>
              <button type="submit" className="tm-invite-btn" disabled={inviting}>
                {inviting ? 'Sending…' : 'Send invite'}
              </button>
            </form>
          </div>
        </>
      )}
    </BusinessLayout>
  )
}
