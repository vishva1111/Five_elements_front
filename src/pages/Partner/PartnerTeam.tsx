import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PartnerLayout from './PartnerLayout'
import { useAuth } from '../../contexts/AuthContext'
import { API_URL as API } from '../../config/api'
import './Partner.css'

type TeamRole = 'admin' | 'field_officer' | 'viewer' | 'business' | 'individual'

interface TeamMember {
  id:        string
  name:      string
  email:     string
  role:      TeamRole
  roleLabel?: string
  status:    'active' | 'invited' | 'inactive'
  joinedAt:  string
  lastActive?: string
  /** The auth account behind this person; null means they can't own records. */
  authId?:   string | null
  canRecord?: boolean
  /** Set for Users (Business/Individual) — the project they were created for. */
  projectId?:   string | null
  projectName?: string | null
}

/**
 * Two groups. The first three are ways of working inside this organisation;
 * the last two are full platform accounts the partner onboards, each landing in
 * their own dashboard. Either way their captures roll up to this partner,
 * because roll-up follows the project, not the person.
 */
const ROLE_OPTIONS: { value: TeamRole; label: string; group: string; desc: string }[] = [
  { value: 'admin',         label: 'Partner admin',  group: 'Your organisation', desc: 'Full console — projects, team, settings' },
  { value: 'field_officer', label: 'Field officer',  group: 'Your organisation', desc: 'Field app: capture evidence and clear tasks' },
  { value: 'viewer',        label: 'Viewer',         group: 'Your organisation', desc: 'Read-only access to your dashboard' },
  { value: 'business',      label: 'Business',       group: 'Platform accounts', desc: 'Their own business dashboard, emissions and portfolio' },
  { value: 'individual',    label: 'Individual',     group: 'Platform accounts', desc: 'Their own impact home and funding surfaces' },
]

const ROLE_GROUPS = ['Your organisation', 'Platform accounts']
const ORG_ROLES: TeamRole[]  = ['admin', 'field_officer', 'viewer']
const USER_ROLES: TeamRole[] = ['business', 'individual']

function roleLabel(r: string) {
  return ROLE_OPTIONS.find(o => o.value === r)?.label
    ?? (r === 'field_officer' ? 'Field officer' : r.charAt(0).toUpperCase() + r.slice(1))
}

/** Badge tone per role, paired with the text label — never colour alone. */
function roleBadge(r: string) {
  if (r === 'admin')    return 'info'
  if (r === 'business') return 'verified'
  if (r === 'viewer')   return 'pending'
  return 'approved'
}

interface PartnerTeamProps {
  /**
   * 'org' — the people who work inside this organisation (admin/field
   * officer/viewer). 'users' — the platform accounts the partner onboards
   * (Business/Individual), each with their own dashboard elsewhere on the
   * platform. Two screens over the same underlying team, because they answer
   * different questions: "who runs my operation" vs "who am I doing this for."
   */
  scope?: 'org' | 'users'
}

export function PartnerTeam({ scope = 'org' }: PartnerTeamProps) {
  const scopeRoles = scope === 'users' ? USER_ROLES : ORG_ROLES
  const scopeGroup  = scope === 'users' ? 'Platform accounts' : 'Your organisation'

  const { session } = useAuth()
  const [members,  setMembers]  = useState<TeamMember[]>([])
  const [loading,  setLoading]  = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole,  setInviteRole]  = useState<TeamRole>(scope === 'users' ? 'individual' : 'field_officer')
  const [inviting, setInviting] = useState(false)
  const [busyId,   setBusyId]   = useState<string | null>(null)
  const [error,    setError]    = useState<string | null>(null)
  const [inviteName, setInviteName] = useState('')
  // Compulsory for Users (Business/Individual) — the project they're being
  // onboarded for. Org-role members (admin/field officer/viewer) don't need one.
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [inviteProjectId, setInviteProjectId] = useState('')
  // Optional — if left blank, one is generated and emailed as before.
  const [invitePassword, setInvitePassword] = useState('')
  const [showPassword,   setShowPassword]   = useState(false)
  const navigate = useNavigate()

  // Edit is a modal rather than an inline row: changing someone's role changes
  // what they can reach, so it deserves a deliberate confirm step.
  const [editing,    setEditing]    = useState<TeamMember | null>(null)
  const [editName,   setEditName]   = useState('')
  const [editRole,   setEditRole]   = useState<TeamRole>('field_officer')
  const [savingEdit, setSavingEdit] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState<TeamMember | null>(null)
  const [notice,     setNotice]     = useState<string | null>(null)
  // Shown once after a successful invite so the partner can pass the password on
  // if the email doesn't arrive. Never re-fetchable.
  const [newCredentials, setNewCredentials] = useState<{ email: string; tempPassword: string | null; reused: boolean; roleLabel?: string; passwordWasChosen?: boolean } | null>(null)

  useEffect(() => {
    fetch(
      `${API}/api/partner/team`,
      { headers: { Authorization: `Bearer ${session?.access_token || ''}` } }
    )
      .then(r => r.json())
      .then(d => setMembers(d.members || []))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false))
  }, [session])

  useEffect(() => {
    if (scope !== 'users' || !session?.access_token) return
    fetch(`${API}/api/partner/projects`, { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(r => r.json())
      .then(d => setProjects((d.projects || []).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }))))
      .catch(() => setProjects([]))
  }, [scope, session?.access_token])

  function generatePassword() {
    // Same shape the server would generate — upper, lower, digit, symbol.
    const rand = Math.random().toString(36).slice(2, 11)
    return `Fe${rand}9!`
  }

  async function reload() {
    const res = await fetch(`${API}/api/partner/team`, {
      headers: { Authorization: `Bearer ${session?.access_token || ''}` },
    })
    const d = await res.json()
    if (res.ok) setMembers(d.members || [])
  }

  async function handleInvite() {
    if (!inviteEmail) return
    if (scope === 'users' && !inviteProjectId) {
      setError('Choose a project for this user.')
      return
    }
    if (invitePassword && invitePassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setInviting(true)
    setError(null)
    try {
      const res = await fetch(`${API}/api/partner/team/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          name: inviteName,
          ...(scope === 'users' ? { project_id: inviteProjectId } : {}),
          ...(invitePassword ? { password: invitePassword } : {}),
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed to create user')
      setNewCredentials({
        email: inviteEmail,
        tempPassword: d.tempPassword || null,
        reused: !!d.reusedExistingAccount,
        roleLabel: d.roleLabel,
        passwordWasChosen: !!d.passwordWasChosen,
      })
      setInviteEmail('')
      setInviteName('')
      setInviteProjectId('')
      setInvitePassword('')
      setShowInvite(false)
      await reload()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create user')
    } finally {
      setInviting(false)
    }
  }

  function openEdit(m: TeamMember) {
    setEditing(m)
    setEditName(m.name || '')
    setEditRole(m.role)
    setError(null)
  }

  async function saveEdit() {
    if (!editing) return
    if (!editName.trim()) { setError('Name cannot be empty'); return }
    setSavingEdit(true)
    setError(null)
    try {
      const res = await fetch(`${API}/api/partner/team/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ name: editName.trim(), role: editRole }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed to save changes')
      if (d.warning) setNotice(d.warning)
      setEditing(null)
      await reload()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save changes')
    } finally {
      setSavingEdit(false)
    }
  }

  async function setStatus(m: TeamMember, status: 'active' | 'inactive') {
    setError(null)
    setBusyId(m.id)
    try {
      const res = await fetch(`${API}/api/partner/team/${m.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ status }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed to update member')
      await reload()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update member')
    } finally {
      setBusyId(null)
    }
  }

  async function removeMember(m: TeamMember) {
    setError(null)
    setBusyId(m.id)
    try {
      const res = await fetch(`${API}/api/partner/team/${m.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token || ''}` },
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed to remove member')
      setNotice(d.message || 'Removed from your team.')
      setConfirmRemove(null)
      await reload()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to remove member')
    } finally {
      setBusyId(null)
    }
  }

  async function removeOrDeactivate(id: string) {
    setError(null)
    setBusyId(id)
    try {
      const res = await fetch(`${API}/api/partner/team/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ status: 'inactive' }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed to deactivate member')
      await reload()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to deactivate member')
    } finally {
      setBusyId(null)
    }
  }

  // An org must keep one active admin, or nobody can manage it.
  const activeAdmins = members.filter(m => m.role === 'admin' && m.status === 'active')
  const isLastAdmin = (m: TeamMember) =>
    m.role === 'admin' && m.status === 'active' && activeAdmins.length <= 1

  const scopedMembers = members.filter(m => scopeRoles.includes(m.role))

  return (
    <PartnerLayout
      title={scope === 'users' ? 'Users' : 'Team management'}
      subtitle={scope === 'users'
        ? "Business and Individual accounts you've onboarded — each gets their own dashboard"
        : 'Admins, field officers and viewers who work inside your organisation'}
    >

      {error && (
        <div style={{ background: '#FEF0E3', border: '0.5px solid #F5C27A', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#8B3A00', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {notice && (
        <div style={{ background: '#EAF2FA', border: '1px solid #A8C8E8', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#185FA5', marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 15 }} aria-label="Dismiss">✕</button>
        </div>
      )}

      {newCredentials && (
        <div style={{ background: '#EAF3DE', border: '1px solid #AACBA7', borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#27500A', marginBottom: 6 }}>
                {newCredentials.reused
                  ? `Added to your team${newCredentials.roleLabel ? ` as ${newCredentials.roleLabel}` : ''} ✓`
                  : `${newCredentials.roleLabel || 'Account'} created and invite emailed ✓`}
              </div>
              {newCredentials.tempPassword ? (
                <>
                  <div style={{ fontSize: 12.5, color: '#2B5341', lineHeight: 1.6 }}>
                    <strong>{newCredentials.email}</strong> can sign in with {newCredentials.passwordWasChosen ? 'the password you set' : 'this temporary password'}:
                  </div>
                  <div style={{ marginTop: 6, fontFamily: 'monospace', fontSize: 15, fontWeight: 700, color: '#112121', background: '#fff', border: '1px solid #AACBA7', borderRadius: 6, padding: '6px 12px', display: 'inline-block' }}>
                    {newCredentials.tempPassword}
                  </div>
                  <div style={{ fontSize: 11.5, color: '#6B7B6E', marginTop: 6 }}>
                    {newCredentials.passwordWasChosen
                      ? 'Shown once for your records — pass it on however you like.'
                      : "Shown once — copy it now if you need to pass it on. Ask them to change it after signing in."}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12.5, color: '#2B5341', lineHeight: 1.6 }}>
                  <strong>{newCredentials.email}</strong> already had a Five Elements account — their existing
                  sign-in now works for your organisation. No new password was issued.
                </div>
              )}
            </div>
            <button type="button" onClick={() => setNewCredentials(null)} style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: '#6B7B6E' }} aria-label="Dismiss">✕</button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button type="button" className="pl-btn pl-btn--primary" onClick={() => setShowInvite(v => !v)}>
          {scope === 'users' ? '+ New user' : '+ Invite team member'}
        </button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="pl-card" style={{ marginBottom: 20 }}>
          <div className="pl-card__title">{scope === 'users' ? 'Create a new user' : 'Invite a team member'}</div>
          {scope === 'users' && (
            <p style={{ fontSize: 12, color: '#6B7B6E', margin: '-6px 0 14px', lineHeight: 1.5 }}>
              This always creates a brand-new account — if this email already has one anywhere on the
              platform, creation is blocked rather than reusing it.
            </p>
          )}
          <div className="sp-grid-2" style={{ marginBottom: 14 }}>
            <div className="sp-field">
              <label className="sp-label" htmlFor="tm-name">Full name</label>
              <input id="tm-name" type="text" className="sp-input" placeholder="Arjun Mehta" value={inviteName} onChange={e => setInviteName(e.target.value)} />
            </div>
            <div className="sp-field">
              <label className="sp-label" htmlFor="tm-email">Email address</label>
              <input id="tm-email" type="email" className="sp-input" placeholder="colleague@org.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
            </div>
            <div className="sp-field">
              <label className="sp-label" htmlFor="tm-role">Account type</label>
              <select id="tm-role" className="sp-select" value={inviteRole} onChange={e => setInviteRole(e.target.value as TeamRole)}>
                {[scopeGroup].map(g => (
                  <optgroup key={g} label={g}>
                    {ROLE_OPTIONS.filter(o => o.group === g).map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <div style={{ fontSize: 11.5, color: '#6B7B6E', marginTop: 5, lineHeight: 1.5 }}>
                {ROLE_OPTIONS.find(o => o.value === inviteRole)?.desc}
              </div>
            </div>
            {scope === 'users' && (
              <div className="sp-field">
                <label className="sp-label sp-label--required" htmlFor="tm-project">Project</label>
                <select id="tm-project" className="sp-select" value={inviteProjectId} onChange={e => setInviteProjectId(e.target.value)}>
                  <option value="">Select a project…</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div style={{ fontSize: 11.5, color: '#6B7B6E', marginTop: 5, lineHeight: 1.5 }}>
                  Required — trees recorded for this user stay on this project.
                </div>
                {projects.length === 0 && (
                  <div style={{ fontSize: 11.5, color: '#8B3A00', marginTop: 5 }}>
                    You have no approved projects yet — register one first.
                  </div>
                )}
              </div>
            )}
            <div className="sp-field">
              <label className="sp-label" htmlFor="tm-password">Password</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  id="tm-password"
                  type={showPassword ? 'text' : 'password'}
                  className="sp-input"
                  placeholder="Leave blank to auto-generate"
                  value={invitePassword}
                  onChange={e => setInvitePassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="pl-btn pl-btn--ghost"
                  style={{ padding: '0 12px', fontSize: 12 }}
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
                <button
                  type="button"
                  className="pl-btn pl-btn--ghost"
                  style={{ padding: '0 12px', fontSize: 12, whiteSpace: 'nowrap' }}
                  onClick={() => { setInvitePassword(generatePassword()); setShowPassword(true) }}
                >
                  🎲 Generate
                </button>
              </div>
              <div style={{ fontSize: 11.5, color: '#6B7B6E', marginTop: 5, lineHeight: 1.5 }}>
                Optional, min 8 characters — set one yourself, or leave blank and we'll generate and email one.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="pl-btn pl-btn--primary"
              onClick={handleInvite}
              disabled={inviting || !inviteEmail || (scope === 'users' && !inviteProjectId)}
            >
              {inviting ? (scope === 'users' ? 'Creating…' : 'Sending…') : (scope === 'users' ? 'Create user' : 'Send invite')}
            </button>
            <button type="button" className="pl-btn pl-btn--ghost" onClick={() => setShowInvite(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* What each account type gets */}
      {[scopeGroup].map(g => (
        <div key={g} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9AA79C', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
            {g}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
            {ROLE_OPTIONS.filter(o => o.group === g).map(o => (
              <div key={o.value} style={{ background: '#F5F0EC', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#112121', marginBottom: 3 }}>{o.label}</div>
                <div style={{ fontSize: 12, color: '#6B7B6E', lineHeight: 1.4 }}>{o.desc}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{ fontSize: 12, color: '#6B7B6E', lineHeight: 1.6, marginBottom: 20, background: '#EAF3DE', border: '1px solid #AACBA7', borderRadius: 10, padding: '11px 15px' }}>
        Anyone you add here signs in with their own account. Trees they capture against
        <strong> your projects</strong> count towards your delivery — roll-up follows the project, not the person.
      </div>

      {/* Members table */}
      <div className="pl-card">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3].map(i => <div key={i} className="pl-skel" style={{ height: 44 }} />)}
          </div>
        ) : scopedMembers.length === 0 ? (
          <div className="pl-empty">
            <div className="pl-empty__icon">👥</div>
            <div className="pl-empty__title">{scope === 'users' ? 'No users yet' : 'No team members yet'}</div>
            <div className="pl-empty__sub">
              {scope === 'users'
                ? 'Create Business and Individual accounts under one of your approved projects.'
                : 'Invite field officers and admins to collaborate on projects and evidence.'}
            </div>
          </div>
        ) : (
          <table className="pl-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                {scope === 'users' && <th>Project</th>}
                <th>Status</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {scopedMembers.map(m => (
                <tr key={m.id} style={{ opacity: m.status === 'inactive' ? 0.5 : 1 }}>
                  <td style={{ fontWeight: 600 }}>{m.name}</td>
                  <td style={{ color: '#6B7B6E', fontSize: 12.5 }}>{m.email}</td>
                  <td>
                    <span className={`pl-badge pl-badge--${roleBadge(m.role)}`}>
                      {m.roleLabel || roleLabel(m.role)}
                    </span>
                  </td>
                  {scope === 'users' && (
                    <td style={{ color: '#6B7B6E', fontSize: 12.5 }}>{m.projectName || '—'}</td>
                  )}
                  <td>
                    <span className={`pl-badge pl-badge--${m.status === 'active' ? 'approved' : m.status === 'invited' ? 'progress' : 'pending'}`}>
                      {m.status}
                    </span>
                  </td>
                  <td style={{ color: '#9AA79C', fontSize: 12 }}>{m.joinedAt}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      {m.canRecord && m.status !== 'inactive' && (
                        <button
                          type="button"
                          className="pl-btn pl-btn--ghost"
                          style={{ height: 28, fontSize: 11.5, padding: '0 10px', color: '#2B5341' }}
                          onClick={() => navigate(`/partner/trees/new?user=${m.authId}`)}
                          title={`Record a tree for ${m.name}`}
                        >
                          🌳 Add tree
                        </button>
                      )}

                      <button
                        type="button"
                        className="pl-btn pl-btn--ghost"
                        style={{ height: 28, fontSize: 11.5, padding: '0 10px' }}
                        onClick={() => openEdit(m)}
                        disabled={busyId === m.id}
                      >
                        Edit
                      </button>

                      {m.status === 'inactive' ? (
                        <button
                          type="button"
                          className="pl-btn pl-btn--ghost"
                          style={{ height: 28, fontSize: 11.5, padding: '0 10px', color: '#2B5341' }}
                          onClick={() => setStatus(m, 'active')}
                          disabled={busyId === m.id}
                        >
                          {busyId === m.id ? 'Saving…' : 'Reactivate'}
                        </button>
                      ) : isLastAdmin(m) ? (
                        // P9-03: the last remaining admin cannot be removed or
                        // demoted. The server enforces it; this explains why.
                        <span style={{ fontSize: 11.5, color: '#9AA79C' }} title="Promote someone else to admin first">
                          🔒 last admin
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="pl-btn pl-btn--ghost"
                            style={{ height: 28, fontSize: 11.5, padding: '0 10px', color: '#8B3A00' }}
                            onClick={() => setStatus(m, 'inactive')}
                            disabled={busyId === m.id}
                          >
                            {busyId === m.id ? 'Saving…' : 'Deactivate'}
                          </button>
                          <button
                            type="button"
                            className="pl-btn pl-btn--ghost"
                            style={{ height: 28, fontSize: 11.5, padding: '0 10px', color: '#A32020' }}
                            onClick={() => setConfirmRemove(m)}
                            disabled={busyId === m.id}
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {/* Edit member */}
      {editing && (
        <div
          onClick={() => setEditing(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(17,33,33,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 20 }}
        >
          <div onClick={e => e.stopPropagation()} className="pl-card" style={{ width: 'min(440px, 100%)' }}>
            <div className="pl-card__title">Edit {editing.name}</div>

            <div className="sp-field" style={{ marginBottom: 14 }}>
              <label className="sp-label" htmlFor="ed-name">Full name</label>
              <input id="ed-name" type="text" className="sp-input" value={editName} onChange={e => setEditName(e.target.value)} />
            </div>

            <div className="sp-field" style={{ marginBottom: 6 }}>
              <label className="sp-label" htmlFor="ed-role">Account type</label>
              <select id="ed-role" className="sp-select" value={editRole} onChange={e => setEditRole(e.target.value as TeamRole)}>
                {[scopeGroup].map(g => (
                  <optgroup key={g} label={g}>
                    {ROLE_OPTIONS.filter(o => o.group === g).map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <div style={{ fontSize: 11.5, color: '#6B7B6E', marginTop: 5, lineHeight: 1.5 }}>
                {ROLE_OPTIONS.find(o => o.value === editRole)?.desc}
              </div>
            </div>

            {editRole !== editing.role && (
              <div style={{ background: '#FEF0E3', border: '1px solid #F5C27A', borderRadius: 9, padding: '9px 12px', fontSize: 12, color: '#8B3A00', lineHeight: 1.5, margin: '10px 0 0' }}>
                Changing the account type changes what this person can reach as soon as they next sign in.
              </div>
            )}

            <div style={{ fontSize: 11.5, color: '#9AA79C', marginTop: 12 }}>
              {editing.email} · joined {editing.joinedAt}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
              <button type="button" className="pl-btn pl-btn--ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button type="button" className="pl-btn pl-btn--primary" onClick={saveEdit} disabled={savingEdit}>
                {savingEdit ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm removal */}
      {confirmRemove && (
        <div
          onClick={() => setConfirmRemove(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(17,33,33,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 20 }}
        >
          <div onClick={e => e.stopPropagation()} className="pl-card" style={{ width: 'min(430px, 100%)' }}>
            <div className="pl-card__title">Remove {confirmRemove.name}?</div>
            <p style={{ fontSize: 13.5, color: '#6B7B6E', lineHeight: 1.6, margin: '0 0 8px' }}>
              They'll be removed from your organisation and won't appear when you record work.
            </p>
            <p style={{ fontSize: 13, color: '#2B5341', lineHeight: 1.6, margin: 0, background: '#EAF3DE', border: '1px solid #AACBA7', borderRadius: 9, padding: '9px 12px' }}>
              Their Five Elements account stays active, and every tree already recorded for them is kept —
              removing evidence would break the ledger it supports.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
              <button type="button" className="pl-btn pl-btn--ghost" onClick={() => setConfirmRemove(null)}>Cancel</button>
              <button
                type="button"
                className="pl-btn pl-btn--primary"
                style={{ background: '#A32020', borderColor: '#A32020' }}
                onClick={() => removeMember(confirmRemove)}
                disabled={busyId === confirmRemove.id}
              >
                {busyId === confirmRemove.id ? 'Removing…' : 'Remove from team'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PartnerLayout>
  )
}

export default function PartnerTeamPage() {
  return <PartnerTeam scope="org" />
}
