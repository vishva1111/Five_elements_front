import React, { useState } from 'react'
import BusinessLayout from './BusinessLayout'

export default function PublicProfileSettings() {
  const [name, setName] = useState('Meridian Manufacturing')
  const [tagline, setTagline] = useState('Committed to net zero by 2040')
  const [website, setWebsite] = useState('https://meridian.example.com')
  const [visibility, setVisibility] = useState('public')
  const [saved, setSaved] = useState(false)

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const fieldStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: 6,
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: '#6B7B6E', textTransform: 'uppercase', letterSpacing: '0.06em',
  }
  const inputStyle: React.CSSProperties = {
    border: '1px solid #EEE7DE', borderRadius: 6, padding: '9px 12px',
    fontSize: 13, color: '#112121', fontFamily: 'inherit', outline: 'none',
    background: '#fff',
  }

  return (
    <BusinessLayout title="Public profile" subtitle="Control what the public sees on your profile page.">
      <div style={{ maxWidth: 560 }}>
        <form
          style={{ background: '#fff', border: '1px solid #EEE7DE', borderRadius: 10, padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}
          onSubmit={handleSave}
        >
          <div style={fieldStyle}>
            <label style={labelStyle}>Organisation name</label>
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Tagline</label>
            <input style={inputStyle} placeholder="e.g. Committed to net zero by 2040" value={tagline} onChange={e => setTagline(e.target.value)} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Website</label>
            <input style={inputStyle} type="url" value={website} onChange={e => setWebsite(e.target.value)} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Public visibility</label>
            <select style={inputStyle} value={visibility} onChange={e => setVisibility(e.target.value)}>
              <option value="public">Public — visible to everyone</option>
              <option value="private">Private — hidden from public</option>
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Show on public profile</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              {['Trees funded', 'tCO₂e verified', 'Active projects', 'Ledger entries'].map(item => (
                <label key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 400, cursor: 'pointer', color: '#112121' }}>
                  <input type="checkbox" defaultChecked style={{ accentColor: '#2B5341' }} />
                  {item}
                </label>
              ))}
            </div>
          </div>
          <button type="submit" className="db-cta-btn" style={{ alignSelf: 'flex-start' }}>
            {saved ? '✓ Saved' : 'Save changes'}
          </button>
        </form>
      </div>
    </BusinessLayout>
  )
}