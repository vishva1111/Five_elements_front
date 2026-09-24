/**
 * ImportFunders — record past donations (already collected offline: cash,
 * UPI, bank transfer, cheque, or a paper receipt) from a spreadsheet.
 *
 * This is the funding side of the ledger, not field capture: it writes a
 * funder record + ledger entry per row, never a tree_records row. A donor
 * who funds trees and a field user who plants them are different people
 * doing different things — this page is for the first.
 */
import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PartnerLayout from './PartnerLayout'
import { useAuth } from '../../contexts/AuthContext'
import { API_URL as API } from '../../config/api'
import './Partner.css'

interface PartnerProject { id: string; name: string }

interface ImportSummary {
  fileName:    string
  totalRows:   number
  validRows:   number
  errorRows:   number
  totalTrees:  number
  totalAmount: number
  preview:     {
    line: number
    donor_name: string
    trees: number
    amount: number
    anonymous: boolean
    accountStatus: 'existing account' | 'new account will be created' | 'offline donor (no login)'
  }[]
  errors: { line: number; errors: string[] }[]
}

export default function ImportFunders() {
  const { session } = useAuth()
  const navigate    = useNavigate()
  const fileRef     = useRef<HTMLInputElement>(null)
  const token       = session?.access_token

  const [projects,  setProjects]  = useState<PartnerProject[]>([])
  const [projectId, setProjectId] = useState('')
  const [loading,   setLoading]   = useState(true)

  const [file,      setFile]      = useState<File | null>(null)
  const [checking,  setChecking]  = useState(false)
  const [importing, setImporting] = useState(false)
  const [summary,   setSummary]   = useState<ImportSummary | null>(null)
  const [error,     setError]     = useState<string | null>(null)
  const [result,    setResult]    = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    fetch(`${API}/api/partner/projects`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setProjects((d.projects || []).map((p: PartnerProject) => ({ id: p.id, name: p.name }))))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false))
  }, [token])

  async function checkFile(f: File) {
    if (!projectId) {
      setError('Choose which project these donations belong to first.')
      return
    }
    setChecking(true)
    setError(null)
    setResult(null)
    setSummary(null)
    try {
      const form = new FormData()
      form.append('file', f)
      form.append('project_id', projectId)
      form.append('dryRun', 'true')

      const res = await fetch(`${API}/api/partner/funders/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token || ''}` },
        body: form,
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not read that file')
        if (data.summary) setSummary(data.summary)
        return
      }
      setSummary(data.summary)
    } catch {
      setError('Could not read that file')
    } finally {
      setChecking(false)
    }
  }

  async function runImport() {
    if (!file || !summary || summary.errorRows > 0) return
    setImporting(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('project_id', projectId)

      const res = await fetch(`${API}/api/partner/funders/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token || ''}` },
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')

      setResult(data.message || `${data.imported} donations imported.`)
      setSummary(null)
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  async function downloadTemplate() {
    try {
      const res = await fetch(`${API}/api/partner/funders/import/template`, {
        headers: { Authorization: `Bearer ${token || ''}` },
      })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = 'donor-import-template.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Could not download the template')
    }
  }

  const accountStatusColor = (s: string) =>
    s === 'existing account' ? '#2B5341' : s === 'new account will be created' ? '#185FA5' : '#9AA79C'

  return (
    <PartnerLayout title="Import donations" subtitle="Record donations already collected offline — cash, UPI, cheque or a paper receipt">
      <div style={{ maxWidth: 760 }}>

        {result && (
          <div style={{ background: '#EAF3DE', border: '1px solid #AACBA7', borderRadius: 10, padding: '12px 16px', fontSize: 13.5, color: '#27500A', marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span>✓ {result}</span>
            <button type="button" onClick={() => navigate('/partner/funders')} style={{ background: 'none', border: 'none', color: '#27500A', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit', fontSize: 13 }}>
              View funders →
            </button>
          </div>
        )}

        {error && (
          <div style={{ background: '#FEF0E3', border: '0.5px solid #F5C27A', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#8B3A00', marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div className="pl-card" style={{ marginBottom: 16 }}>
          <div className="pl-card__title">Project</div>
          <p style={{ fontSize: 12.5, color: '#6B7B6E', lineHeight: 1.6, margin: '0 0 12px' }}>
            Every donation in the file is applied to this one project.
          </p>
          <select
            className="sp-select"
            value={projectId}
            onChange={e => { setProjectId(e.target.value); setSummary(null); setFile(null) }}
            disabled={loading || projects.length === 0}
          >
            <option value="">Select a project…</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {!loading && projects.length === 0 && (
            <div style={{ fontSize: 11.5, color: '#9AA79C', marginTop: 6 }}>
              You have no approved projects yet — register one first.
            </div>
          )}
        </div>

        <div className="pl-card" style={{ marginBottom: 16 }}>
          <div className="pl-card__title" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            Donations file
            <button
              type="button"
              onClick={downloadTemplate}
              style={{ background: 'none', border: 'none', color: '#185FA5', fontWeight: 600, fontSize: 12, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit', padding: 0 }}
            >
              Download template ↓
            </button>
          </div>

          <p style={{ fontSize: 12.5, color: '#6B7B6E', lineHeight: 1.6, margin: '0 0 14px' }}>
            Upload a <strong>.xlsx</strong> or <strong>.csv</strong> of donations. Required columns: <strong>Donor Name,
            Trees Funded</strong>. Optional: Email (gives the donor their own account), Amount Paid, Date, Anonymous,
            Account Type (Business/Individual). Without an email, the donor is recorded by name only — no login is created.
          </p>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="pl-btn pl-btn--ghost"
              style={{ fontSize: 12.5 }}
              onClick={() => fileRef.current?.click()}
              disabled={checking || importing || !projectId}
              title={!projectId ? 'Choose a project first' : undefined}
            >
              📄 {file ? file.name : 'Choose a file'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.csv"
              style={{ display: 'none' }}
              onChange={e => {
                const f = e.target.files?.[0] || null
                setFile(f)
                setSummary(null)
                setResult(null)
                setError(null)
                if (f) checkFile(f)
              }}
            />
            {checking && <span style={{ fontSize: 12.5, color: '#6B7B6E' }}>Checking…</span>}
          </div>

          {summary && (
            <div style={{ marginTop: 16, border: '1px solid #EDE6DF', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', padding: '12px 15px', background: '#F5F0EC', fontSize: 12.5 }}>
                <span><strong>{summary.totalRows}</strong> row{summary.totalRows === 1 ? '' : 's'}</span>
                <span style={{ color: '#27500A' }}><strong>{summary.validRows}</strong> ready</span>
                {summary.errorRows > 0 && (
                  <span style={{ color: '#8B3A00' }}><strong>{summary.errorRows}</strong> need fixing</span>
                )}
                <span style={{ marginLeft: 'auto', color: '#6B7B6E' }}>
                  {summary.totalTrees.toLocaleString('en-IN')} trees · ₹{summary.totalAmount.toLocaleString('en-IN')}
                </span>
              </div>

              {summary.errorRows > 0 && (
                <div style={{ padding: '12px 15px', borderTop: '1px solid #EDE6DF' }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#8B3A00', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 6 }}>
                    Fix these rows, then upload again
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#6B2E00', lineHeight: 1.7 }}>
                    {summary.errors.map(e => (
                      <li key={e.line}><strong>Row {e.line}:</strong> {e.errors.join('; ')}</li>
                    ))}
                  </ul>
                  <div style={{ fontSize: 11.5, color: '#9AA79C', marginTop: 8 }}>
                    Nothing is imported while any row has a problem.
                  </div>
                </div>
              )}

              {summary.validRows > 0 && summary.errorRows === 0 && (
                <>
                  <table className="pl-table" style={{ margin: 0 }}>
                    <thead>
                      <tr><th>Row</th><th>Donor</th><th>Trees</th><th>Amount</th><th>Account</th></tr>
                    </thead>
                    <tbody>
                      {summary.preview.map(r => (
                        <tr key={r.line}>
                          <td style={{ color: '#9AA79C', fontSize: 12 }}>{r.line}</td>
                          <td style={{ fontWeight: 600 }}>
                            {r.anonymous ? <span style={{ fontStyle: 'italic', color: '#9AA79C' }}>Anonymous</span> : r.donor_name}
                          </td>
                          <td>{r.trees}</td>
                          <td>₹{r.amount.toLocaleString('en-IN')}</td>
                          <td style={{ fontSize: 11.5, color: accountStatusColor(r.accountStatus) }}>{r.accountStatus}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {summary.validRows > summary.preview.length && (
                    <div style={{ padding: '8px 15px', fontSize: 11.5, color: '#9AA79C' }}>
                      …and {summary.validRows - summary.preview.length} more.
                    </div>
                  )}
                  <div style={{ padding: '12px 15px', borderTop: '1px solid #EDE6DF', display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="button" className="pl-btn pl-btn--primary" onClick={runImport} disabled={importing}>
                      {importing ? 'Importing…' : `Import ${summary.validRows} donation${summary.validRows === 1 ? '' : 's'}`}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <button type="button" className="pl-btn pl-btn--ghost" onClick={() => navigate('/partner/funders')}>← Back to funders</button>
        </div>
      </div>
    </PartnerLayout>
  )
}
