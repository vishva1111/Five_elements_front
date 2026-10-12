import React, { useEffect, useState } from 'react'
import BusinessLayout from './BusinessLayout'
import { fetchBusinessOrg, saveBusinessOrg, type BusinessOrg } from '../../services/api'
import { useToast } from '../../components/ui/Toast'

type Form = Pick<BusinessOrg, 'orgName' | 'tagline' | 'website' | 'visibility' | 'showTrees' | 'showTco2e' | 'showProjects' | 'showLedger'>

const SHOW_ITEMS: { key: 'showTrees' | 'showTco2e' | 'showProjects' | 'showLedger'; label: string }[] = [
  { key: 'showTrees',    label: 'Trees funded' },
  { key: 'showTco2e',    label: 'tCO₂e verified' },
  { key: 'showProjects', label: 'Active projects' },
  { key: 'showLedger',   label: 'Ledger entries' },
]

const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 }
const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: '#6B7B6E', textTransform: 'uppercase', letterSpacing: '0.06em',
}
const inputStyle: React.CSSProperties = {
  border: '1px solid #EEE7DE', borderRadius: 6, padding: '9px 12px',
  fontSize: 13, color: '#112121', fontFamily: 'inherit', outline: 'none', background: '#fff',
}

export default function PublicProfileSettings() {
  const toast = useToast()
  const [form, setForm]       = useState<Form | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    fetchBusinessOrg()
      .then(({ org }) => setForm({
        orgName: org.orgName, tagline: org.tagline, website: org.website, visibility: org.visibility,
        showTrees: org.showTrees, showTco2e: org.showTco2e, showProjects: org.showProjects, showLedger: org.showLedger,
      }))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => f ? { ...f, [k]: v } : f)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    if (!form.orgName.trim()) { toast.error('Organisation name is required.'); return }
    setSaving(true)
    try {
      await saveBusinessOrg(form)
      toast.success('Public profile saved.')
    } catch (err) {
      toast.error((err as Error).message || 'Could not save your public profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <BusinessLayout title="Public profile" subtitle="Control what the public sees on your profile page.">
      <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && <div className="db-error-banner">⚠ {error}</div>}
        {loading && <div className="db-card db-skel" style={{ height: 460 }} />}

        {!loading && form && (
          <form
            style={{ background: '#fff', border: '1px solid #EEE7DE', borderRadius: 10, padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}
            onSubmit={handleSave}
          >
            <div style={fieldStyle}>
              <label style={labelStyle}>Organisation name</label>
              <input style={inputStyle} value={form.orgName} onChange={e => set('orgName', e.target.value)} maxLength={120} required />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Tagline</label>
              <input style={inputStyle} placeholder="e.g. Committed to net zero by 2040" value={form.tagline} onChange={e => set('tagline', e.target.value)} maxLength={160} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Website</label>
              <input style={inputStyle} type="url" placeholder="https://yourcompany.com" value={form.website} onChange={e => set('website', e.target.value)} maxLength={200} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Public visibility</label>
              <select style={inputStyle} value={form.visibility} onChange={e => set('visibility', e.target.value as Form['visibility'])}>
                <option value="public">Public — visible to everyone</option>
                <option value="private">Private — hidden from public</option>
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Show on public profile</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                {SHOW_ITEMS.map(item => (
                  <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 400, cursor: 'pointer', color: '#112121' }}>
                    <input
                      type="checkbox"
                      checked={form[item.key]}
                      onChange={e => set(item.key, e.target.checked)}
                      style={{ accentColor: '#2B5341' }}
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>
            <button type="submit" className="db-cta-btn" style={{ alignSelf: 'flex-start' }} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        )}
      </div>
    </BusinessLayout>
  )
}
