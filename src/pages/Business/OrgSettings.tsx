import React, { useState } from 'react'
import BusinessLayout from './BusinessLayout'

const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 }
const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: '#6B7B6E', textTransform: 'uppercase', letterSpacing: '0.06em',
}
const inputStyle: React.CSSProperties = {
  border: '1px solid #EEE7DE', borderRadius: 6, padding: '9px 12px',
  fontSize: 13, color: '#112121', fontFamily: 'inherit', outline: 'none', background: '#fff',
}

export default function OrgSettings() {
  const [orgName, setOrgName] = useState('Meridian Manufacturing')
  const [industry, setIndustry] = useState('Manufacturing')
  const [country, setCountry] = useState('India')
  const [employees, setEmployees] = useState('500–1000')
  const [saved, setSaved] = useState(false)

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <BusinessLayout title="Settings" subtitle="Manage your organisation's account details and preferences.">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 560 }}>

        {/* Main settings form */}
        <form
          style={{ background: '#fff', border: '1px solid #EEE7DE', borderRadius: 10, padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}
          onSubmit={handleSave}
        >
          <div style={fieldStyle}>
            <label style={labelStyle}>Organisation name</label>
            <input style={inputStyle} value={orgName} onChange={e => setOrgName(e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Industry</label>
              <select style={inputStyle} value={industry} onChange={e => setIndustry(e.target.value)}>
                {['Manufacturing', 'Technology', 'Finance', 'Retail', 'Healthcare', 'Energy', 'Transport', 'Other'].map(i => (
                  <option key={i}>{i}</option>
                ))}
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Country</label>
              <select style={inputStyle} value={country} onChange={e => setCountry(e.target.value)}>
                {['India', 'United Kingdom', 'United States', 'Germany', 'Australia', 'Other'].map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Number of employees</label>
            <select style={inputStyle} value={employees} onChange={e => setEmployees(e.target.value)}>
              {['1–50', '51–200', '201–500', '500–1000', '1000+'].map(e => (
                <option key={e}>{e}</option>
              ))}
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Reporting framework</label>
            <select style={inputStyle}>
              <option>GHG Protocol</option>
              <option>CSRD / ESRS</option>
              <option>CDP</option>
              <option>TCFD</option>
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Financial year end</label>
            <select style={inputStyle}>
              <option>31 March</option>
              <option>31 December</option>
              <option>30 June</option>
              <option>30 September</option>
            </select>
          </div>

          <button type="submit" className="db-cta-btn" style={{ alignSelf: 'flex-start' }}>
            {saved ? '✓ Saved' : 'Save changes'}
          </button>
        </form>

        {/* Danger zone */}
        <div style={{ background: '#fff', border: '1px solid rgba(192,57,43,0.25)', borderRadius: 10, padding: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#C0392B', marginBottom: 8 }}>Danger zone</h2>
          <p style={{ fontSize: 13, color: '#9AA79C', marginBottom: 16, lineHeight: 1.5 }}>
            Deleting your organisation is permanent and cannot be undone.
          </p>
          <button
            style={{
              background: 'none', border: '1px solid #C0392B', color: '#C0392B',
              borderRadius: 6, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Delete organisation
          </button>
        </div>
      </div>
    </BusinessLayout>
  )
}