import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserRound, KeyRound } from 'lucide-react'
import Modal from './Modal'
import { useAuth } from '../../contexts/AuthContext'
import type { UserRole } from '../../contexts/AuthContext'
import { getCachedProfile, loadProfile, type ProfileData } from '../../services/profileStore'

const ROLE_LABEL: Record<UserRole, string> = {
  admin:      'Super Admin',
  partner:    'Partner',
  business:   'Business',
  individual: 'Individual',
  field_user: 'Field operator',
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '11px 0', borderBottom: '1px solid #F2EEE8', fontSize: 14 }}>
      <span style={{ color: '#7A867C', flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#1C2B22', fontWeight: 600, textAlign: 'right', overflowWrap: 'anywhere' }}>{value || '—'}</span>
    </div>
  )
}

// Inline so the popup looks the same in every sidebar (Admin, Business,
// Partner, Individual) — each layout loads different CSS.
const BTN: React.CSSProperties = {
  height: 38, borderRadius: 9999, fontSize: 13, fontWeight: 700, cursor: 'pointer',
  fontFamily: 'inherit', padding: '0 16px', display: 'inline-flex', alignItems: 'center', gap: 6,
  background: '#fff', color: '#112121', border: '1.5px solid #D8CFC6',
}
const BTN_PRIMARY: React.CSSProperties = { ...BTN, background: '#2B5341', color: '#fff', border: 'none' }

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: '#9AA79C', margin: '4px 0 2px' }}>{children}</div>
}

/**
 * The signed-in user's profile, opened from the user card at the bottom of a
 * sidebar. Account details for everyone; partners also see their organisation.
 */
export default function ProfileModal({ onClose }: { onClose: () => void }) {
  const { user, session } = useAuth()
  const navigate = useNavigate()
  const isPartner = !!user?.roles.includes('partner')
  // Preloaded at sign-in (AuthContext), so this is normally ready on first render.
  const [data, setData] = useState<ProfileData | null>(() => getCachedProfile(user?.id))
  const [error, setError] = useState<string | null>(null)

  // Refresh in the background — e.g. after the organisation was edited in Settings.
  useEffect(() => {
    if (!user?.id || !session?.access_token) return
    let cancelled = false
    loadProfile(session.access_token, user.id)
      .then(d => { if (!cancelled) { setData(d); setError(null) } })
      .catch(e => { if (!cancelled && !getCachedProfile(user.id)) setError(e.message || 'Could not load profile') })
    return () => { cancelled = true }
  }, [user?.id, session?.access_token])

  if (!user) return null
  const account = data?.account
  const org = data?.organisation ?? null
  const orgLoading = !data && !error

  const initials = (user.displayName || user.email || '?')
    .split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const go = (to: string) => { onClose(); navigate(to) }

  return (
    <Modal
      icon={<UserRound size={18} />}
      title="My profile"
      subtitle={user.email}
      onClose={onClose}
      width={isPartner ? 860 : 620}
      footer={
        <>
          {isPartner && (
            <button type="button" style={BTN} onClick={() => go('/partner/settings')}>
              Edit organisation
            </button>
          )}
          <button type="button" style={BTN} onClick={() => go('/account/password')}>
            <KeyRound size={14} /> Change password
          </button>
          <button type="button" style={BTN_PRIMARY} onClick={onClose}>Close</button>
        </>
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 22, padding: '18px 20px', borderRadius: 14, background: '#F5F8F1', border: '1px solid #E1EBD8' }}>
        <div style={{ width: 68, height: 68, borderRadius: '50%', background: '#2B5341', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 24, flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 21, fontWeight: 700, color: '#112121' }}>{user.displayName || '—'}</div>
          <div style={{ fontSize: 13.5, color: '#7A867C', overflowWrap: 'anywhere', marginTop: 2 }}>{user.email}</div>
          <div style={{ display: 'inline-block', marginTop: 8, fontSize: 11.5, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: '#2B5341', color: '#fff' }}>
            {ROLE_LABEL[user.role] || user.role}
          </div>
        </div>
      </div>

      {/* Two columns on wide screens; they stack on a phone */}
      <div style={{ display: 'grid', gridTemplateColumns: isPartner ? 'repeat(auto-fit, minmax(300px, 1fr))' : '1fr', gap: '8px 32px', alignItems: 'start' }}>
      <div>
      <SectionTitle>Account</SectionTitle>
      {/* From the profile API; the signed-in user fills in until it arrives */}
      <Row label="Name" value={account?.name || user.displayName} />
      <Row label="Email" value={account?.email || user.email} />
      <Row label="Role" value={ROLE_LABEL[user.role] || user.role} />
      {(account?.roles || user.roles).length > 1 && (
        <Row label="All roles" value={(account?.roles || user.roles).map(r => ROLE_LABEL[r as UserRole] || r).join(', ')} />
      )}
      <Row label="Account status" value={<span style={{ textTransform: 'capitalize' }}>{account?.status || user.status}</span>} />
      {account?.location && <Row label="Location" value={account.location} />}
      <Row label="Member since" value={account?.memberSince
        ? new Date(account.memberSince).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : null} />
      </div>

      {isPartner && (
        <div>
          <SectionTitle>Organisation</SectionTitle>
          {orgLoading ? (
            <div style={{ fontSize: 13, color: '#9AA79C', padding: '10px 0' }}>Loading…</div>
          ) : error ? (
            <div style={{ fontSize: 13, color: '#8B3A00', padding: '10px 0' }}>{error}</div>
          ) : !org ? (
            <div style={{ fontSize: 13, color: '#9AA79C', padding: '10px 0' }}>No organisation profile yet.</div>
          ) : (
            <>
              <Row label="Organisation" value={org.orgName} />
              <Row label="Type" value={org.orgType} />
              <Row label="Contact person" value={org.contactName} />
              <Row label="Contact email" value={org.contactEmail} />
              <Row label="Phone" value={org.contactPhone} />
              <Row label="Website" value={org.website ? <a href={org.website} target="_blank" rel="noreferrer" style={{ color: '#185FA5' }}>{org.website}</a> : null} />
              <Row label="Address" value={org.address} />
              <Row label="Partner status" value={<span style={{ textTransform: 'capitalize' }}>{org.status}</span>} />
            </>
          )}
        </div>
      )}
      </div>
    </Modal>
  )
}
