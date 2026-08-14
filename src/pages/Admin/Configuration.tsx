import React, { useEffect, useState } from 'react'
import AdminLayout from './AdminLayout'
import { useAuth } from '../../contexts/AuthContext'
import './Admin.css'

interface FeatureFlag {
  key:         string
  label:       string
  description: string
  enabled:     boolean
}

interface EmissionFactor {
  key:    string
  label:  string
  value:  number
  unit:   string
  source: string
}

interface PlatformSetting {
  key:   string
  label: string
  value: string
  type:  'text' | 'number' | 'select'
  options?: string[]
}

export default function Configuration() {
  const { session } = useAuth()

  const [flags,    setFlags]    = useState<FeatureFlag[]>([])
  const [factors,  setFactors]  = useState<EmissionFactor[]>([])
  const [settings, setSettings] = useState<PlatformSetting[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState('')
  const [tab,      setTab]      = useState<'flags' | 'factors' | 'settings'>('flags')

  const API     = import.meta.env.VITE_API_URL || 'http://localhost:5000'
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` }

  useEffect(() => {
    fetch(`${API}/api/admin/config`, { headers })
      .then(r => r.json())
      .then(d => {
        setFlags(d.featureFlags || [])
        setFactors(d.emissionFactors || [])
        setSettings(d.platformSettings || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [session])

  async function saveFlags() {
    setSaving(true); setMsg('')
    try {
      await fetch(`${API}/api/admin/config/flags`, { method: 'PATCH', headers, body: JSON.stringify({ flags }) })
      setMsg('✅ Feature flags saved.')
    } catch { setMsg('Save failed.') }
    finally { setSaving(false) }
  }

  async function saveFactors() {
    setSaving(true); setMsg('')
    try {
      await fetch(`${API}/api/admin/config/factors`, { method: 'PATCH', headers, body: JSON.stringify({ factors }) })
      setMsg('✅ Emission factors saved.')
    } catch { setMsg('Save failed.') }
    finally { setSaving(false) }
  }

  async function saveSettings() {
    setSaving(true); setMsg('')
    try {
      await fetch(`${API}/api/admin/config/settings`, { method: 'PATCH', headers, body: JSON.stringify({ settings }) })
      setMsg('✅ Platform settings saved.')
    } catch { setMsg('Save failed.') }
    finally { setSaving(false) }
  }

  function toggleFlag(key: string) {
    setFlags(prev => prev.map(f => f.key === key ? { ...f, enabled: !f.enabled } : f))
  }

  function updateFactor(key: string, value: string) {
    setFactors(prev => prev.map(f => f.key === key ? { ...f, value: parseFloat(value) || 0 } : f))
  }

  function updateSetting(key: string, value: string) {
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s))
  }

  return (
    <AdminLayout title="Configuration" subtitle="Feature flags, emission factors, platform settings">

      {msg && <div className={`ad-alert ${msg.startsWith('✅') ? 'ad-alert--success' : 'ad-alert--danger'}`} style={{ cursor: 'pointer' }} onClick={() => setMsg('')}>{msg} ✕</div>}

      <div className="ad-tabs">
        {(['flags', 'factors', 'settings'] as const).map(t => (
          <button key={t} type="button" className={`ad-tab${tab === t ? ' ad-tab--active' : ''}`} onClick={() => setTab(t)}>
            {t === 'flags' ? '🚩 Feature flags' : t === 'factors' ? '🌿 Emission factors' : '⚙️ Platform settings'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => <div key={i} className="ad-skel" style={{ height: 60 }} />)}
        </div>
      ) : (
        <>
          {/* Feature flags */}
          {tab === 'flags' && (
            <div className="ad-card">
              <div className="ad-card__title">Feature flags</div>
              {flags.length === 0 ? (
                <div className="ad-empty"><div className="ad-empty__icon">🚩</div><div className="ad-empty__title">No flags configured</div></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {flags.map(f => (
                    <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0', borderBottom: '0.5px solid #F5F0EC' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: '#112121' }}>{f.label}</div>
                        <div style={{ fontSize: 12, color: '#9AA79C', marginTop: 2 }}>{f.description}</div>
                        <div style={{ fontSize: 11, color: '#C8BFB6', marginTop: 1, fontFamily: 'monospace' }}>{f.key}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleFlag(f.key)}
                        style={{
                          width: 48, height: 26, borderRadius: 13,
                          background: f.enabled ? '#2B5341' : '#D8CFC6',
                          border: 'none', cursor: 'pointer', position: 'relative',
                          transition: 'background 0.2s', flexShrink: 0,
                        }}
                      >
                        <span style={{
                          position: 'absolute', top: 3,
                          left: f.enabled ? 25 : 3,
                          width: 20, height: 20, borderRadius: '50%',
                          background: '#fff', transition: 'left 0.2s',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        }} />
                      </button>
                      <span style={{ fontSize: 12, fontWeight: 600, color: f.enabled ? '#2B5341' : '#9AA79C', minWidth: 40 }}>
                        {f.enabled ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" className="ad-btn ad-btn--primary" onClick={saveFlags} disabled={saving}>
                  {saving ? 'Saving…' : 'Save flags'}
                </button>
              </div>
            </div>
          )}

          {/* Emission factors */}
          {tab === 'factors' && (
            <div className="ad-card">
              <div className="ad-card__title">Emission factors (DEFRA 2024)</div>
              {factors.length === 0 ? (
                <div className="ad-empty"><div className="ad-empty__icon">🌿</div><div className="ad-empty__title">No factors configured</div></div>
              ) : (
                <table className="ad-table">
                  <thead>
                    <tr><th>Factor</th><th>Value</th><th>Unit</th><th>Source</th></tr>
                  </thead>
                  <tbody>
                    {factors.map(f => (
                      <tr key={f.key}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{f.label}</div>
                          <div style={{ fontSize: 11, color: '#9AA79C', fontFamily: 'monospace' }}>{f.key}</div>
                        </td>
                        <td>
                          <input
                            type="number" step="0.0001"
                            className="ad-input"
                            style={{ maxWidth: 120 }}
                            value={f.value}
                            onChange={e => updateFactor(f.key, e.target.value)}
                          />
                        </td>
                        <td style={{ color: '#6B7B6E', fontSize: 12.5 }}>{f.unit}</td>
                        <td style={{ color: '#9AA79C', fontSize: 12 }}>{f.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" className="ad-btn ad-btn--primary" onClick={saveFactors} disabled={saving}>
                  {saving ? 'Saving…' : 'Save factors'}
                </button>
              </div>
            </div>
          )}

          {/* Platform settings */}
          {tab === 'settings' && (
            <div className="ad-card">
              <div className="ad-card__title">Platform settings</div>
              {settings.length === 0 ? (
                <div className="ad-empty"><div className="ad-empty__icon">⚙️</div><div className="ad-empty__title">No settings configured</div></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {settings.map(s => (
                    <div key={s.key} className="ad-field" style={{ margin: 0 }}>
                      <label className="ad-label" htmlFor={`cfg-${s.key}`}>{s.label}</label>
                      {s.type === 'select' && s.options ? (
                        <select id={`cfg-${s.key}`} className="ad-select" value={s.value} onChange={e => updateSetting(s.key, e.target.value)}>
                          {s.options.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input
                          id={`cfg-${s.key}`}
                          type={s.type === 'number' ? 'number' : 'text'}
                          className="ad-input"
                          value={s.value}
                          onChange={e => updateSetting(s.key, e.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" className="ad-btn ad-btn--primary" onClick={saveSettings} disabled={saving}>
                  {saving ? 'Saving…' : 'Save settings'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  )
}