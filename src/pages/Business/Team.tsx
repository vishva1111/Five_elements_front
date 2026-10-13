import React, { useState, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import BusinessLayout from './BusinessLayout'
import { fetchTeam, inviteTeamMember, removeTeamMember, type TeamMember } from '../../services/api'
import { useToast } from '../../components/ui/Toast'
import Modal from '../../components/ui/Modal'
import Pagination, { usePagination } from '../../components/ui/Pagination'
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
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState<TeamMember | null>(null)
  const [removing, setRemoving] = useState(false)
  const toast = useToast()

  useEffect(() => {
    fetchTeam()
      .then(d => setMembers(d.members))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const pg = usePagination(members, 10)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setInviting(true)
    try {
      const res = await inviteTeamMember(name.trim(), email.trim(), 'Viewer')
      setMembers(prev => [...prev, res.member])
      setName('')
      setEmail('')
      toast.success(res.emailed
        ? `${res.member.email} added — we've emailed them an invite.`
        : `${res.member.email} added. The invite email couldn't be sent — let them know directly.`)
    } catch (err) {
      toast.error((err as Error).message || 'Failed to invite member')
    } finally {
      setInviting(false)
    }
  }

  async function handleRemove() {
    if (!confirmRemove) return
    setRemoving(true)
    try {
      await removeTeamMember(confirmRemove.id)
      setMembers(prev => prev.filter(m => m.id !== confirmRemove.id))
      toast.success(`${confirmRemove.name || confirmRemove.email} removed from your team.`)
      setConfirmRemove(null)
    } catch (err) {
      toast.error((err as Error).message || 'Failed to remove member')
    } finally {
      setRemoving(false)
    }
  }


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
            {/* Members are Viewers only, so one count says it all. */}
            <div className="tm-stat-card">
              <div className="tm-stat-card__label">Team members · Viewers</div>
              <span className="tm-stat-card__num">{members.length}</span>
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

              {pg.items.map(m => (
                <div key={m.id} className="tm-table-row">
                  <div className="tm-td tm-member-name">
                    <span className="tm-avatar">{initialsOf(m.name || m.email)}</span>
                    {m.name}
                  </div>
                  <div className="tm-td tm-td--email">{m.email}</div>
                  <div className="tm-td">
                    <RolePill role={m.role} />
                  </div>
                  <div className="tm-td">
                    <button type="button" className="tm-remove-link" onClick={() => setConfirmRemove(m)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {members.length > 0 && (
              <div style={{ padding: '0 16px 14px' }}><Pagination {...pg} noun="member" /></div>
            )}
          </div>

          {/* Invite card */}
          <div className="tm-invite-card">
            <h2 className="tm-invite-title">Invite a team member</h2>
            <form onSubmit={handleInvite} className="tm-invite-form">
              <div className="tm-invite-row">
                <input
                  className="tm-invite-input"
                  type="text"
                  placeholder="Full name (optional)"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  maxLength={80}
                />
              </div>
              <div className="tm-invite-row">
                <input
                  className="tm-invite-input"
                  type="email"
                  placeholder="colleague@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
                <span className="tm-invite-select" style={{ display: 'inline-flex', alignItems: 'center', cursor: 'default' }} title="Team members are added as Viewers">
                  Viewer
                </span>
              </div>
              <button type="submit" className="tm-invite-btn" disabled={inviting}>
                {inviting ? 'Sending…' : 'Send invite'}
              </button>
            </form>
          </div>
        </>
      )}

      {confirmRemove && (
        <Modal
          icon={<Trash2 size={18} />}
          tone="danger"
          title={`Remove ${confirmRemove.name || confirmRemove.email}?`}
          subtitle={confirmRemove.email}
          onClose={() => !removing && setConfirmRemove(null)}
          width={460}
          footer={<>
            <button type="button" className="db-modal__cancel" onClick={() => setConfirmRemove(null)} disabled={removing}>Cancel</button>
            <button type="button" className="db-modal__confirm" onClick={handleRemove} disabled={removing}>
              {removing ? 'Removing…' : 'Remove'}
            </button>
          </>}
        >
          <p style={{ margin: 0, fontSize: 14, color: '#3a453c', lineHeight: 1.55 }}>
            They'll be taken off your organisation's team. You can invite them again at any time.
          </p>
        </Modal>
      )}
    </BusinessLayout>
  )
}
