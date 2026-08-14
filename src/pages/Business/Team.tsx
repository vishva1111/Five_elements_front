import React, { useState, useEffect } from 'react'
import BusinessLayout from './BusinessLayout'
import { fetchTeam, inviteTeamMember, removeTeamMember, type TeamMember } from '../../services/api'

const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '10px 12px', color: '#9AA79C',
  fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em',
}
const tdStyle: React.CSSProperties = { padding: '12px 12px', fontSize: 13 }
const inputStyle: React.CSSProperties = {
  border: '1px solid #EEE7DE', borderRadius: 6, padding: '9px 12px',
  fontSize: 13, color: '#112121', fontFamily: 'inherit', outline: 'none', background: '#fff', flex: 1,
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

  return (
    <BusinessLayout title="Team" subtitle="Manage who has access to your organisation's account.">
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => <div key={i} className="db-skel" style={{ height: 48, borderRadius: 8 }} />)}
        </div>
      )}
      {error && <div className="db-error-banner">⚠ {error}</div>}

      {!loading && (
        <>
          <div style={{ overflowX: 'auto', marginBottom: 24 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #EEE7DE' }}>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Role</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {members.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ ...tdStyle, color: '#9AA79C', textAlign: 'center', padding: 32 }}>
                      No team members yet. Invite someone below.
                    </td>
                  </tr>
                )}
                {members.map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #F5F0EC' }}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: '#112121' }}>{m.name}</td>
                    <td style={{ ...tdStyle, color: '#6B7B6E' }}>{m.email}</td>
                    <td style={tdStyle}>
                      <span className="db-element-badge">{m.role}</span>
                    </td>
                    <td style={tdStyle}>
                      <button
                        className="db-link"
                        style={{ color: '#C0392B', fontSize: 12 }}
                        onClick={() => handleRemove(m.id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ background: '#fff', border: '1px solid #EEE7DE', borderRadius: 10, padding: 24, maxWidth: 520 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#112121' }}>Invite a team member</h2>
            <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  style={inputStyle}
                  type="email"
                  placeholder="colleague@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
                <select
                  style={{ ...inputStyle, flex: 'none', width: 110 }}
                  value={role}
                  onChange={e => setRole(e.target.value)}
                >
                  <option>Admin</option>
                  <option>Editor</option>
                  <option>Viewer</option>
                </select>
              </div>
              <button type="submit" className="db-cta-btn" style={{ alignSelf: 'flex-start' }} disabled={inviting}>
                {inviting ? 'Sending…' : 'Send invite'}
              </button>
            </form>
          </div>
        </>
      )}
    </BusinessLayout>
  )
}