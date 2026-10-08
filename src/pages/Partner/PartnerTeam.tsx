import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Trash2, TreePine, UserCheck, UserX, Loader2, UserPlus, Info, Check, Plus, Building2, User as UserIcon, ShieldCheck, Sprout, Eye, EyeOff, Wand2, FileText, Upload, X } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'
import PartnerLayout from './PartnerLayout'
import Pagination, { usePagination } from '../../components/ui/Pagination'
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
  /** Last password set by the partner — shown in edit modal for reference. */
  tempPassword?: string | null
  /** GST / PAN / address / documents — Business users only. */
  business?: BusinessDetails | null
}

interface BusinessDoc { name: string; path: string; size: number; type: string; url: string | null }
interface BusinessDetails {
  gstNumber: string | null
  panNumber: string | null
  address:   string | null
  documents: BusinessDoc[]
}

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
const PAN_RE   = /^[A-Z]{5}[0-9]{4}[A-Z]$/

/** Same rules the server applies — returns a message per field, or nothing when valid. */
function businessErrors(gst: string, pan: string, address: string) {
  const e: { gst?: string; pan?: string; address?: string } = {}
  if (!gst) e.gst = 'Required'
  else if (!GSTIN_RE.test(gst)) e.gst = '15 characters, e.g. 24ABCDE1234F1Z5'
  if (!pan) e.pan = 'Required'
  else if (!PAN_RE.test(pan)) e.pan = '10 characters, e.g. ABCDE1234F'
  else if (GSTIN_RE.test(gst) && gst.slice(2, 12) !== pan) e.pan = "Doesn't match the PAN inside the GST number"
  if (!address.trim()) e.address = 'Required'
  return e
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
  const [inviteProjectIds, setInviteProjectIds] = useState<string[]>([])
  // Optional — if left blank, one is generated and emailed as before.
  const [invitePassword, setInvitePassword] = useState('')
  // Business only — GST / PAN / address are required, documents are optional.
  const [inviteGst,     setInviteGst]     = useState('')
  const [invitePan,     setInvitePan]     = useState('')
  const [inviteAddress, setInviteAddress] = useState('')
  const [inviteDocs,    setInviteDocs]    = useState<File[]>([])
  const [touched,       setTouched]       = useState(false)
  const [showPassword,   setShowPassword]   = useState(false)
  const navigate = useNavigate()

  // Edit is a modal rather than an inline row: changing someone's role changes
  // what they can reach, so it deserves a deliberate confirm step.
  const [editing,          setEditing]          = useState<TeamMember | null>(null)
  const [editName,         setEditName]         = useState('')
  const [editRole,         setEditRole]         = useState<TeamRole>('field_officer')
  const [editPassword,     setEditPassword]     = useState('')
  const [showEditPassword, setShowEditPassword] = useState(false)
  const [savingEdit,       setSavingEdit]       = useState(false)
  const [editGst,          setEditGst]          = useState('')
  const [editPan,          setEditPan]          = useState('')
  const [editAddress,      setEditAddress]      = useState('')
  const [editDocs,         setEditDocs]         = useState<File[]>([])
  const [removingDoc,      setRemovingDoc]      = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<TeamMember | null>(null)
  const toast = useToast()
  const setNotice = (m: string | null) => {
    if (!m) return
    if (/\bbut\b|not (saved|uploaded)/i.test(m)) toast.warning(m)
    else toast.info(m)
  }
  const [roleFilter, setRoleFilter] = useState<'all' | TeamRole>('all')
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

  function openInvite() {
    // Always start from a clean form — nothing carried over from last time.
    setError(null)
    setInviteRole(scope === 'users' ? 'business' : 'field_officer')
    setInviteName('')
    setInviteEmail('')
    // Auto-select the first project so the partner doesn't have to pick one manually.
    setInviteProjectIds(scope === 'users' && projects.length > 0 ? [projects[0].id] : [])
    setInvitePassword('')
    setShowPassword(false)
    setInviteGst('')
    setInvitePan('')
    setInviteAddress('')
    setInviteDocs([])
    setTouched(false)
    setShowInvite(true)
  }

  async function reload() {
    const res = await fetch(`${API}/api/partner/team`, {
      headers: { Authorization: `Bearer ${session?.access_token || ''}` },
    })
    const d = await res.json()
    if (res.ok) setMembers(d.members || [])
  }

  async function uploadDocs(memberId: string, files: File[]) {
    if (files.length === 0) return null
    const form = new FormData()
    files.forEach(f => form.append('files', f))
    const res = await fetch(`${API}/api/partner/team/${memberId}/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token || ''}` },
      body: form,
    })
    const d = await res.json().catch(() => ({}))
    return res.ok ? null : (d.error || 'Document upload failed')
  }

  async function handleInvite() {
    setTouched(true)
    if (!inviteEmail) return
    const isBusiness = scope === 'users' && inviteRole === 'business'
    if (isBusiness && Object.keys(businessErrors(inviteGst, invitePan, inviteAddress)).length > 0) {
      setError('Fill in a valid GST number, PAN number and address.')
      return
    }
    if (scope === 'users' && inviteProjectIds.length === 0) {
      setError('Choose at least one project for this user.')
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
          ...(scope === 'users' ? { project_ids: inviteProjectIds } : {}),
          ...(invitePassword ? { password: invitePassword } : {}),
          ...(isBusiness ? { gst_number: inviteGst, pan_number: invitePan, address: inviteAddress.trim() } : {}),
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed to create user')
      if (isBusiness && inviteDocs.length > 0 && d.id) {
        const docError = await uploadDocs(d.id, inviteDocs)
        if (docError) setNotice(`User created, but the documents were not uploaded: ${docError}. You can add them from Edit.`)
      }
      toast.success(scope === 'users' ? `${roleLabel(inviteRole)} user created.` : 'Invite sent.')
      setNewCredentials({
        email: inviteEmail,
        tempPassword: d.tempPassword || null,
        reused: !!d.reusedExistingAccount,
        roleLabel: d.roleLabel,
        passwordWasChosen: !!d.passwordWasChosen,
      })
      setInviteEmail('')
      setInviteName('')
      setInviteProjectIds([])
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
    setEditPassword(m.tempPassword || '')
    setShowEditPassword(!!m.tempPassword)
    setEditGst(m.business?.gstNumber || '')
    setEditPan(m.business?.panNumber || '')
    setEditAddress(m.business?.address || '')
    setEditDocs([])
    setError(null)
  }

  async function removeDoc(doc: BusinessDoc) {
    if (!editing) return
    setRemovingDoc(doc.path)
    setError(null)
    try {
      const res = await fetch(`${API}/api/partner/team/${editing.id}/documents?path=${encodeURIComponent(doc.path)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token || ''}` },
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed to remove document')
      const docs = (editing.business?.documents || []).filter(x => x.path !== doc.path)
      setEditing({ ...editing, business: { ...(editing.business as BusinessDetails), documents: docs } })
      toast.success(`${doc.name} removed.`)
      await reload()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to remove document')
    } finally {
      setRemovingDoc(null)
    }
  }

  async function saveEdit() {
    if (!editing) return
    if (!editName.trim()) { setError('Name cannot be empty'); return }
    const editIsBusiness = editRole === 'business'
    if (editIsBusiness && Object.keys(businessErrors(editGst, editPan, editAddress)).length > 0) {
      setError('Fill in a valid GST number, PAN number and address.')
      return
    }
    if (editPassword && editPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setSavingEdit(true)
    setError(null)
    try {
      const body: Record<string, string> = { name: editName.trim(), role: editRole }
      if (editPassword.trim()) body.password = editPassword.trim()
      const res = await fetch(`${API}/api/partner/team/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify(body),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed to save changes')
      if (editIsBusiness) {
        const bres = await fetch(`${API}/api/partner/team/${editing.id}/business`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
          body: JSON.stringify({ gst_number: editGst, pan_number: editPan, address: editAddress.trim() }),
        })
        const bd = await bres.json()
        if (!bres.ok) throw new Error(bd.error || 'Failed to save business details')
        const docError = await uploadDocs(editing.id, editDocs)
        if (docError) throw new Error(docError)
      }
      if (d.warning) toast.warning(d.warning)
      toast.success('Changes saved.')
      setEditing(null)
      setEditPassword('')
      setShowEditPassword(false)
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
      toast.success(`${m.name || m.email} ${status === 'active' ? 'reactivated' : 'deactivated'}.`)
      await reload()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to update member')
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
      toast.success(d.message || 'Removed from your team.')
      setConfirmRemove(null)
      await reload()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to remove member')
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
  const visibleMembers = roleFilter === 'all' ? scopedMembers : scopedMembers.filter(m => m.role === roleFilter)
  const pg = usePagination(visibleMembers)

  return (
    <PartnerLayout
      title={scope === 'users' ? 'Users' : 'Team management'}
      subtitle={scope === 'users'
        ? "Business and Individual accounts you've onboarded — each gets their own dashboard"
        : 'Admins, field officers and viewers who work inside your organisation'}
    >

      {error && !showInvite && !editing && (
        <div style={{ background: '#FEF0E3', border: '0.5px solid #F5C27A', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#8B3A00', marginBottom: 16 }}>
          {error}
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

      {/* Toolbar — filter tabs on the left, create on the right */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div role="tablist" aria-label="Filter by account type" style={{ display: 'inline-flex', gap: 4, padding: 4, background: '#EFEAE3', borderRadius: 12, flexWrap: 'wrap' }}>
          {(['all', ...scopeRoles] as const).map(r => {
            const on    = roleFilter === r
            const count = r === 'all' ? scopedMembers.length : scopedMembers.filter(m => m.role === r).length
            return (
              <button
                key={r}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setRoleFilter(r)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 9, border: 'none',
                  background: on ? '#fff' : 'transparent', boxShadow: on ? '0 1px 3px rgba(17,33,33,0.12)' : 'none',
                  color: on ? '#1C2B22' : '#6B7B6E', fontFamily: 'inherit', fontSize: 13, fontWeight: on ? 700 : 600, cursor: 'pointer',
                }}
              >
                {r === 'all' ? 'All' : roleLabel(r)}
                <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 999, background: on ? '#EAF3DE' : '#E3DDD4', color: on ? '#27500A' : '#7A867C' }}>{count}</span>
              </button>
            )
          })}
        </div>

        <button type="button" className="pl-btn pl-btn--primary" onClick={openInvite} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <UserPlus size={16} /> {scope === 'users' ? 'New user' : 'Invite team member'}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#5C7A5F', lineHeight: 1.55, marginBottom: 16 }}>
        <Info size={15} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          Anyone you add here signs in with their own account. Trees they capture against <strong>your projects</strong> count
          towards your delivery — roll-up follows the project, not the person.
        </span>
      </div>

      {/* Create / invite pop-up */}
      {showInvite && (
        <Modal
          icon={<UserPlus size={18} />}
          title={scope === 'users' ? 'Create a new user' : 'Invite a team member'}
          subtitle={scope === 'users' ? 'Pick the account type, then fill in their details.' : 'Pick their role, then fill in their details.'}
          error={error}
          onClose={() => setShowInvite(false)}
          width={600}
          footer={<>
            <button type="button" className="pl-btn pl-btn--ghost" onClick={() => setShowInvite(false)}>Cancel</button>
            <button
              type="button"
              className="pl-btn pl-btn--primary"
              onClick={handleInvite}
              disabled={inviting || !inviteEmail || (scope === 'users' && inviteProjectIds.length === 0)}
            >
              {inviting ? (scope === 'users' ? 'Creating…' : 'Sending…') : (scope === 'users' ? `Create ${roleLabel(inviteRole)} user` : 'Send invite')}
            </button>
          </>}
        >
          {/* Account type as tabs */}
          <RoleTabs roles={scopeRoles} value={inviteRole} onChange={setInviteRole} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 18 }}>
            <div className="sp-field" style={{ minWidth: 0 }}>
              <label className="sp-label" htmlFor="tm-name">{inviteRole === 'business' ? 'Organisation name' : 'Full name'}</label>
              <input id="tm-name" type="text" className="sp-input" style={{ width: '100%' }}
                placeholder={inviteRole === 'business' ? 'Enter organisation name' : 'Enter full name'}
                value={inviteName} onChange={e => setInviteName(e.target.value)} />
            </div>
            <div className="sp-field" style={{ minWidth: 0 }}>
              <label className="sp-label sp-label--required" htmlFor="tm-email">Email address</label>
              <input id="tm-email" type="email" className="sp-input" style={{ width: '100%' }}
                placeholder="Enter email address"
                value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
            </div>
          </div>

          {scope === 'users' && inviteRole === 'business' && (
            <BusinessFields
              idPrefix="tm"
              gst={inviteGst} pan={invitePan} address={inviteAddress}
              onGst={setInviteGst} onPan={setInvitePan} onAddress={setInviteAddress}
              showErrors={touched}
              newDocs={inviteDocs} onNewDocs={setInviteDocs}
            />
          )}

          {scope === 'users' && (
            <div className="sp-field" style={{ marginTop: 16 }}>
              <label className="sp-label sp-label--required">Projects</label>
              {projects.length === 0 ? (
                <div style={{ fontSize: 12, color: '#8B3A00', marginTop: 4 }}>
                  You have no approved projects yet — register one first.
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 2 }}>
                  {projects.map(p => {
                    const checked = inviteProjectIds.includes(p.id)
                    return (
                      <button
                        key={p.id}
                        type="button"
                        aria-pressed={checked}
                        onClick={() => setInviteProjectIds(prev => checked ? prev.filter(id => id !== p.id) : [...prev, p.id])}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999,
                          border: `1.5px solid ${checked ? '#2B5341' : '#E5DFD6'}`, background: checked ? '#EAF3DE' : '#fff',
                          color: checked ? '#1C3A2B' : '#4F5E52', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        {checked ? <Check size={14} /> : <Plus size={14} />}
                        {p.name}
                      </button>
                    )
                  })}
                </div>
              )}
              <div style={{ fontSize: 11.5, color: '#7A867C', marginTop: 8, lineHeight: 1.5 }}>
                {inviteProjectIds.length > 0
                  ? <span style={{ color: '#2B5341', fontWeight: 600 }}>{inviteProjectIds.length} project{inviteProjectIds.length > 1 ? 's' : ''} selected · </span>
                  : null}
                Trees recorded for this user roll up to every selected project.
              </div>
            </div>
          )}

          <div className="sp-field" style={{ marginTop: 16 }}>
            <label className="sp-label" htmlFor="tm-password">Password</label>
            <PasswordInput
              id="tm-password"
              value={invitePassword}
              onChange={setInvitePassword}
              shown={showPassword}
              onToggle={() => setShowPassword(v => !v)}
              placeholder="Enter password or leave blank to auto-generate"
              onGenerate={() => { setInvitePassword(generatePassword()); setShowPassword(true) }}
            />
            <div style={{ fontSize: 11.5, color: '#7A867C', marginTop: 6, lineHeight: 1.5 }}>
              Optional, min 8 characters — leave blank and we'll generate one and email it.
            </div>
          </div>

          {scope === 'users' && (
            <div style={{ fontSize: 11.5, color: '#9AA79C', marginTop: 14, lineHeight: 1.5 }}>
              This always creates a brand-new account. If the email already has one anywhere on the platform, creation is blocked.
            </div>
          )}
        </Modal>
      )}

      {/* Members table */}
      <div className="pl-card">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3].map(i => <div key={i} className="pl-skel" style={{ height: 44 }} />)}
          </div>
        ) : visibleMembers.length === 0 ? (
          <div className="pl-empty">
            <div className="pl-empty__icon">👥</div>
            <div className="pl-empty__title">
              {roleFilter !== 'all' ? `No ${roleLabel(roleFilter)} accounts yet` : scope === 'users' ? 'No users yet' : 'No team members yet'}
            </div>
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
                <th>{scope === 'users' ? 'User' : 'Member'}</th>
                <th>Role</th>
                {scope === 'users' && <th>Project</th>}
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pg.items.map(m => (
                <tr key={m.id} style={{ opacity: m.status === 'inactive' ? 0.5 : 1 }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <span style={{ width: 34, height: 34, borderRadius: 17, background: m.role === 'business' ? '#1C2B22' : '#EAF3DE', color: m.role === 'business' ? '#fff' : '#2B5341', fontSize: 11.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {initialsOf(m.name || m.email)}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: '#1C2B22' }}>{m.name || '—'}</div>
                        <div style={{ fontSize: 12, color: '#7A867C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>
                        {m.business?.gstNumber && (
                          <div style={{ fontSize: 11, color: '#9AA79C', marginTop: 1, fontFamily: 'ui-monospace, Consolas, monospace' }}>GST {m.business.gstNumber}</div>
                        )}
                      </div>
                    </div>
                  </td>
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
                          style={{ height: 30, width: 30, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#2B5341' }}
                          onClick={() => navigate(`/partner/trees/new?user=${m.authId}`)}
                          title={`Record a tree for ${m.name}`}
                          aria-label={`Record a tree for ${m.name}`}
                        >
                          <TreePine size={14} />
                        </button>
                      )}

                      <button
                        type="button"
                        className="pl-btn pl-btn--ghost"
                        style={{ height: 30, width: 30, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => openEdit(m)}
                        disabled={busyId === m.id}
                        title="Edit"
                        aria-label="Edit"
                      >
                        <Pencil size={14} />
                      </button>

                      {m.status === 'inactive' ? (
                        <button
                          type="button"
                          className="pl-btn pl-btn--ghost"
                          style={{ height: 30, width: 30, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#2B5341' }}
                          onClick={() => setStatus(m, 'active')}
                          disabled={busyId === m.id}
                          title="Reactivate"
                          aria-label="Reactivate"
                        >
                          {busyId === m.id ? <Loader2 size={14} className="spin" /> : <UserCheck size={14} />}
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
                            style={{ height: 30, width: 30, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#8B3A00' }}
                            onClick={() => setStatus(m, 'inactive')}
                            disabled={busyId === m.id}
                            title="Deactivate"
                            aria-label="Deactivate"
                          >
                            {busyId === m.id ? <Loader2 size={14} className="spin" /> : <UserX size={14} />}
                          </button>
                          <button
                            type="button"
                            className="pl-btn pl-btn--ghost"
                            style={{ height: 30, width: 30, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#A32020' }}
                            onClick={() => setConfirmRemove(m)}
                            disabled={busyId === m.id}
                            title="Remove"
                            aria-label="Remove"
                          >
                            <Trash2 size={14} />
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
        {!loading && <Pagination {...pg} noun={scope === 'users' ? 'user' : 'member'} />}
      </div>
      {/* Edit member */}
      {editing && (
        <Modal
          icon={<Pencil size={18} />}
          title={`Edit ${editing.name || editing.email}`}
          subtitle={`${editing.email} · joined ${editing.joinedAt}`}
          error={error}
          onClose={() => setEditing(null)}
          width={560}
          footer={<>
            <button type="button" className="pl-btn pl-btn--ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button type="button" className="pl-btn pl-btn--primary" onClick={saveEdit} disabled={savingEdit}>
              {savingEdit ? 'Saving…' : 'Save changes'}
            </button>
          </>}
        >
          <RoleTabs roles={scopeRoles} value={editRole} onChange={setEditRole} />

          {editRole !== editing.role && (
            <div style={{ background: '#FEF0E3', border: '1px solid #F5C27A', borderRadius: 10, padding: '9px 12px', fontSize: 12, color: '#8B3A00', lineHeight: 1.5, marginTop: 12 }}>
              Changing the account type changes what this person can reach as soon as they next sign in.
            </div>
          )}

          <div className="sp-field" style={{ marginTop: 16 }}>
            <label className="sp-label" htmlFor="ed-name">{editRole === 'business' ? 'Organisation name' : 'Full name'}</label>
            <input id="ed-name" type="text" className="sp-input" style={{ width: '100%' }} value={editName} onChange={e => setEditName(e.target.value)} />
          </div>

          {editRole === 'business' && (
            <BusinessFields
              idPrefix="ed"
              gst={editGst} pan={editPan} address={editAddress}
              onGst={setEditGst} onPan={setEditPan} onAddress={setEditAddress}
              showErrors
              newDocs={editDocs} onNewDocs={setEditDocs}
              existingDocs={editing.business?.documents || []}
              onRemoveExisting={removeDoc}
              removingPath={removingDoc}
            />
          )}

          <div className="sp-field" style={{ marginTop: 16 }}>
            <label className="sp-label" htmlFor="ed-password">New password</label>
            <PasswordInput
              id="ed-password"
              value={editPassword}
              onChange={setEditPassword}
              shown={showEditPassword}
              onToggle={() => setShowEditPassword(v => !v)}
              placeholder="Enter new password or leave blank to keep it"
              onGenerate={() => { setEditPassword(generatePassword()); setShowEditPassword(true) }}
            />
            <div style={{ fontSize: 11.5, color: '#7A867C', marginTop: 6, lineHeight: 1.5 }}>
              Optional, min 8 characters — leave blank to keep the current password unchanged.
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm removal */}
      {confirmRemove && (
        <Modal
          icon={<Trash2 size={18} />}
          tone="danger"
          title={`Remove ${confirmRemove.name || confirmRemove.email}?`}
          subtitle="They'll no longer appear when you record work."
          onClose={() => setConfirmRemove(null)}
          width={460}
          footer={<>
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
          </>}
        >
          <p style={{ fontSize: 13, color: '#2B5341', lineHeight: 1.6, margin: 0, background: '#EAF3DE', border: '1px solid #AACBA7', borderRadius: 10, padding: '10px 12px' }}>
            Their Five Elements account stays active, and every tree already recorded for them is kept —
            removing evidence would break the ledger it supports.
          </p>
        </Modal>
      )}
    </PartnerLayout>
  )
}

const ROLE_ICON: Record<TeamRole, React.ReactNode> = {
  business:      <Building2 size={18} />,
  individual:    <UserIcon size={18} />,
  admin:         <ShieldCheck size={18} />,
  field_officer: <Sprout size={18} />,
  viewer:        <Eye size={18} />,
}

/** Account type as big tabs — one click, with what each type gets underneath. */
function RoleTabs({ roles, value, onChange }: { roles: TeamRole[]; value: TeamRole; onChange: (r: TeamRole) => void }) {
  const current = ROLE_OPTIONS.find(o => o.value === value)
  return (
    <div>
      <div role="tablist" aria-label="Account type" style={{ display: 'grid', gridTemplateColumns: `repeat(${roles.length}, minmax(0, 1fr))`, gap: 4, padding: 4, background: '#EFEAE3', borderRadius: 12 }}>
        {roles.map(r => {
          const on = value === r
          return (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onChange(r)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 8px', borderRadius: 9, border: 'none',
                background: on ? '#2B5341' : 'transparent', color: on ? '#fff' : '#4F5E52',
                fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', minWidth: 0,
              }}
            >
              {ROLE_ICON[r]}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{roleLabel(r)}</span>
            </button>
          )
        })}
      </div>
      {current && (
        <div style={{ fontSize: 12, color: '#6B7B6E', marginTop: 8, paddingLeft: 4 }}>{current.desc}</div>
      )}
    </div>
  )
}

/** GST / PAN / address (required) and supporting documents (optional) for a Business user. */
function BusinessFields({ idPrefix, gst, pan, address, onGst, onPan, onAddress, showErrors, newDocs, onNewDocs, existingDocs = [], onRemoveExisting, removingPath }: {
  idPrefix: string
  gst: string
  pan: string
  address: string
  onGst: (v: string) => void
  onPan: (v: string) => void
  onAddress: (v: string) => void
  showErrors: boolean
  newDocs: File[]
  onNewDocs: (f: File[]) => void
  existingDocs?: BusinessDoc[]
  onRemoveExisting?: (d: BusinessDoc) => void
  removingPath?: string | null
}) {
  const fileRef = React.useRef<HTMLInputElement>(null)
  const errs = businessErrors(gst, pan, address)
  // Show a field's message once it has something in it, or after a submit attempt.
  const msg = (k: 'gst' | 'pan' | 'address', value: string) => (showErrors || value) ? errs[k] : undefined
  const clean = (v: string) => v.toUpperCase().replace(/[^0-9A-Z]/g, '')

  function addFiles(list: FileList | null) {
    if (!list) return
    const allowed = Array.from(list).filter(f => /^(application\/pdf|image\/(png|jpe?g|webp))$/.test(f.type) && f.size <= 10 * 1024 * 1024)
    onNewDocs([...newDocs, ...allowed].slice(0, 5))
    if (fileRef.current) fileRef.current.value = ''
  }

  const fieldErr = (m?: string) => m ? <div className="sp-field-error">{m}</div> : null
  const sizeLabel = (n: number) => n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`

  return (
    <div style={{ marginTop: 18, padding: 16, borderRadius: 12, background: '#FAF8F4', border: '1px solid #EEE9E1' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#5C7A5F', marginBottom: 12 }}>
        <Building2 size={15} /> Business details
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <div className="sp-field" style={{ minWidth: 0 }}>
          <label className="sp-label sp-label--required" htmlFor={`${idPrefix}-gst`}>GST number</label>
          <input
            id={`${idPrefix}-gst`} className={`sp-input ${msg('gst', gst) ? 'sp-input--error' : ''}`}
            style={{ width: '100%', fontFamily: 'ui-monospace, Consolas, monospace', letterSpacing: '0.04em' }}
            placeholder="Enter GST number" maxLength={15} value={gst}
            onChange={e => {
              const v = clean(e.target.value)
              onGst(v)
              // The PAN sits inside the GSTIN — fill it in when it's still empty.
              if (GSTIN_RE.test(v) && !pan) onPan(v.slice(2, 12))
            }}
          />
          {fieldErr(msg('gst', gst))}
        </div>
        <div className="sp-field" style={{ minWidth: 0 }}>
          <label className="sp-label sp-label--required" htmlFor={`${idPrefix}-pan`}>PAN number</label>
          <input
            id={`${idPrefix}-pan`} className={`sp-input ${msg('pan', pan) ? 'sp-input--error' : ''}`}
            style={{ width: '100%', fontFamily: 'ui-monospace, Consolas, monospace', letterSpacing: '0.04em' }}
            placeholder="Enter PAN number" maxLength={10} value={pan}
            onChange={e => onPan(clean(e.target.value))}
          />
          {fieldErr(msg('pan', pan))}
        </div>
      </div>

      <div className="sp-field" style={{ marginTop: 14 }}>
        <label className="sp-label sp-label--required" htmlFor={`${idPrefix}-address`}>Address</label>
        <textarea
          id={`${idPrefix}-address`} className={`sp-textarea ${msg('address', address) ? 'sp-input--error' : ''}`}
          rows={2} style={{ width: '100%', resize: 'vertical' }}
          placeholder="Enter registered address"
          value={address} onChange={e => onAddress(e.target.value)}
        />
        {fieldErr(msg('address', address))}
      </div>

      <div className="sp-field" style={{ marginTop: 14 }}>
        <label className="sp-label">Documents <span style={{ textTransform: 'none', fontWeight: 500, color: '#9AA79C', letterSpacing: 0 }}>(optional)</span></label>

        {(existingDocs.length > 0 || newDocs.length > 0) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
            {existingDocs.map(d => (
              <div key={d.path} style={docRow}>
                <FileText size={15} style={{ color: '#5C7A5F', flexShrink: 0 }} />
                {d.url
                  ? <a href={d.url} target="_blank" rel="noreferrer" style={{ ...docName, color: '#185FA5' }}>{d.name}</a>
                  : <span style={docName}>{d.name}</span>}
                <span style={docSize}>{sizeLabel(d.size)}</span>
                {onRemoveExisting && (
                  <button type="button" onClick={() => onRemoveExisting(d)} disabled={removingPath === d.path} aria-label={`Remove ${d.name}`} title="Remove" style={docRemove}>
                    {removingPath === d.path ? <Loader2 size={14} className="spin" /> : <X size={14} />}
                  </button>
                )}
              </div>
            ))}
            {newDocs.map((f, i) => (
              <div key={`${f.name}-${i}`} style={{ ...docRow, borderStyle: 'dashed' }}>
                <FileText size={15} style={{ color: '#5C7A5F', flexShrink: 0 }} />
                <span style={docName}>{f.name}</span>
                <span style={docSize}>{sizeLabel(f.size)}</span>
                <button type="button" onClick={() => onNewDocs(newDocs.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`} title="Remove" style={docRemove}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {existingDocs.length + newDocs.length < 5 && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files) }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 12px',
              borderRadius: 10, border: '1.5px dashed #CFC6B8', background: '#fff', color: '#2B5341',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Upload size={16} /> Add GST certificate, PAN card or other files
          </button>
        )}
        <input ref={fileRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp" style={{ display: 'none' }} onChange={e => addFiles(e.target.files)} />
        <div style={{ fontSize: 11.5, color: '#9AA79C', marginTop: 6 }}>PDF or image, up to 10 MB each, max 5 files.</div>
      </div>
    </div>
  )
}

const docRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 9, border: '1px solid #E5DFD6', background: '#fff' }
const docName: React.CSSProperties = { flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, color: '#1C2B22', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none' }
const docSize: React.CSSProperties = { fontSize: 11.5, color: '#9AA79C', flexShrink: 0 }
const docRemove: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: '#A32020', display: 'flex', padding: 2, flexShrink: 0 }

function PasswordInput({ id, value, onChange, shown, onToggle, placeholder, onGenerate }: {
  id: string
  value: string
  onChange: (v: string) => void
  shown: boolean
  onToggle: () => void
  placeholder: string
  onGenerate: () => void
}) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
        <input
          id={id}
          type={shown ? 'text' : 'password'}
          className="sp-input"
          style={{ width: '100%', paddingRight: 40, fontFamily: shown && value ? 'ui-monospace, Consolas, monospace' : undefined }}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={shown ? 'Hide password' : 'Show password'}
          title={shown ? 'Hide password' : 'Show password'}
          style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#7A867C', display: 'flex', padding: 4 }}
        >
          {shown ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      <button
        type="button"
        className="pl-btn pl-btn--ghost"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 14px', fontSize: 12.5, whiteSpace: 'nowrap' }}
        onClick={onGenerate}
      >
        <Wand2 size={14} /> Generate
      </button>
    </div>
  )
}

export default function PartnerTeamPage() {
  return <PartnerTeam scope="org" />
}

function initialsOf(name: string) {
  const parts = (name || '').replace(/@.*/, '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}
