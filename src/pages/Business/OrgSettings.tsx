import React, { useEffect, useState } from 'react'
import BusinessLayout from './BusinessLayout'
import { fetchBusinessOrg, saveBusinessOrg, type BusinessOrg } from '../../services/api'
import { useToast } from '../../components/ui/Toast'

const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 }
const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: '#6B7B6E', textTransform: 'uppercase', letterSpacing: '0.06em',
}
const inputStyle: React.CSSProperties = {
  border: '1px solid #EEE7DE', borderRadius: 6, padding: '9px 12px',
  fontSize: 13, color: '#112121', fontFamily: 'inherit', outline: 'none', background: '#fff',
}

const INDUSTRIES = ['Manufacturing', 'Technology', 'Finance', 'Retail', 'Healthcare', 'Energy', 'Transport', 'Other']
const COUNTRIES  = ['India', 'United Kingdom', 'United States', 'Germany', 'Australia', 'Other']
const EMPLOYEES  = ['1–50', '51–200', '201–500', '500–1000', '1000+']
const FRAMEWORKS = ['GHG Protocol', 'CSRD / ESRS', 'CDP', 'TCFD']
const FY_ENDS    = ['31 March', '31 December', '30 June', '30 September']

type Form = Pick<BusinessOrg, 'orgName' | 'industry' | 'country' | 'employees' | 'framework' | 'fyEnd'>

export default function OrgSettings() {
  const toast = useToast()
  const [form, setForm]       = useState<Form | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [saving, setSaving]   = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  useEffect(() => {
    fetchBusinessOrg()
      .then(({ org }) => {
        setForm({ orgName: org.orgName, industry: org.industry, country: org.country, employees: org.employees, framework: org.framework, fyEnd: org.fyEnd })
        setSavedAt(org.updatedAt)
      })
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
      const { org } = await saveBusinessOrg(form)
      setSavedAt(org.updatedAt)
      toast.success('Organisation settings saved.')
    } catch (err) {
      toast.error((err as Error).message || 'Could not save settings')
    } finally {
      setSaving(false)
    }
  }

  const select = (k: keyof Form, options: string[], placeholder: string) => (
    <select style={inputStyle} value={form?.[k] ?? ''} onChange={e => set(k, e.target.value)}>
      {!form?.[k] && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  )

  return (
    <BusinessLayout title="Settings" subtitle="Manage your organisation's account details and preferences.">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 560 }}>

        {error && <div className="db-error-banner">⚠ {error}</div>}
        {loading && <div className="db-card db-skel" style={{ height: 420 }} />}

        {!loading && form && (
          <form
            style={{ background: '#fff', border: '1px solid #EEE7DE', borderRadius: 10, padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}
            onSubmit={handleSave}
          >
            <div style={fieldStyle}>
              <label style={labelStyle}>Organisation name</label>
              <input style={inputStyle} value={form.orgName} onChange={e => set('orgName', e.target.value)} maxLength={120} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Industry</label>
                {select('industry', INDUSTRIES, 'Select industry')}
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Country</label>
                {select('country', COUNTRIES, 'Select country')}
              </div>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Number of employees</label>
              {select('employees', EMPLOYEES, 'Select size')}
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Reporting framework</label>
              {select('framework', FRAMEWORKS, 'Select framework')}
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Financial year end</label>
              {select('fyEnd', FY_ENDS, 'Select financial year end')}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button type="submit" className="db-cta-btn" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              {savedAt && (
                <span style={{ fontSize: 12, color: '#9AA79C' }}>
                  Last saved {new Date(savedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </form>
        )}

        {/* Danger zone */}
        <div style={{ background: '#fff', border: '1px solid rgba(192,57,43,0.25)', borderRadius: 10, padding: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#C0392B', marginBottom: 8 }}>Delete organisation</h2>
          <p style={{ fontSize: 13, color: '#6B7B6E', margin: 0, lineHeight: 1.5 }}>
            Deleting an organisation is permanent and also affects its funding records and reports,
            so it's done by the Five Elements team. Contact them from your account's email address to request it.
          </p>
        </div>
      </div>
    </BusinessLayout>
  )
}
