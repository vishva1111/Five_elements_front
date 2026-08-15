import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SubmitProjectLayout from './SubmitProjectLayout'
import './SubmitProject.css'

type BPView = 'sites' | 'empty' | 'bulkupload' | 'bulkpreview' | 'partners' | 'mix'

function PentaSVG({ size = 34, fill = '#EAF3DE', stroke = '#2B5341' }: { size?: number; fill?: string; stroke?: string }) {
  const pts = Array.from({ length: 5 }, (_, i) => {
    const a = -Math.PI / 2 + i * 2 * Math.PI / 5
    const cx = size / 2, cy = size / 2, r = size / 2 - 2
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`
  }).join(' ')
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <polygon points={pts} fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

const SITES = [
  { name: 'Yelahanka Lake Buffer', element: 'Earth', category: 'Community planting', trees: 1200, status: 'verified', date: '14 Jun 2026' },
  { name: 'Hebbal Wetland Restoration', element: 'Water', category: 'Wetland restoration', trees: 0, status: 'inreview', date: '02 Jul 2026' },
  { name: 'Whitefield Urban Forest', element: 'Earth', category: 'Urban forestry', trees: 340, status: 'selfreported', date: '21 Jul 2026' },
]

const PARTNERS = [
  { name: 'Green Yelahanka Trust', type: 'NGO Darpan', ref: 'KA/2019/0234961', sites: 2, status: 'linked' },
  { name: 'Bruhat Bengaluru Mahanagara Palike', type: 'Government body', ref: 'BBMP/ENV/2024', sites: 1, status: 'linked' },
  { name: 'Whitefield Rising', type: 'Community group', ref: '', sites: 1, status: 'pending' },
]

const BULK_PREVIEW_ROWS = [
  { row: 1, name: 'Yelahanka Lake Buffer', element: 'Earth', trees: '1200', date: '14 Jun 2026', ok: true },
  { row: 2, name: 'Hebbal Wetland', element: 'Water', trees: '0', date: '02 Jul 2026', ok: true },
  { row: 3, name: 'Whitefield Urban Forest', element: 'Earth', trees: '340', date: '21 Jul 2026', ok: true },
  { row: 4, name: '', element: 'Fire', trees: 'abc', date: '', ok: false },
]

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; border: string; color: string; label: string }> = {
    verified:     { bg: '#EAF3DE', border: '#AACBA7', color: '#27500A', label: 'Verified' },
    inreview:     { bg: '#EAF3DE', border: '#AACBA7', color: '#27500A', label: 'In review' },
    selfreported: { bg: '#F5F0EC', border: '#D8CFC6', color: '#6B7B6E', label: 'Self-reported' },
    pending:      { bg: '#FFF3E0', border: '#F09125', color: '#7A4500', label: 'Pending' },
    linked:       { bg: '#EAF3DE', border: '#AACBA7', color: '#27500A', label: 'Linked' },
  }
  const s = map[status] || map.pending
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 9999, padding: '3px 9px', fontSize: 11, fontWeight: 700, color: s.color }}>
      <PentaSVG size={8} fill={s.color} stroke={s.color} />
      {s.label}
    </span>
  )
}

export default function BusinessProgramme() {
  const navigate = useNavigate()
  const [view, setView] = useState<BPView>('sites')
  const [uploadPct, setUploadPct] = useState(0)
  const [uploading, setUploading] = useState(false)

  function startBulkUpload() {
    setUploading(true)
    setUploadPct(0)
    let pct = 0
    const iv = setInterval(() => {
      pct += 20
      setUploadPct(pct)
      if (pct >= 100) { clearInterval(iv); setUploading(false); setView('bulkpreview') }
    }, 300)
  }

  return (
    <SubmitProjectLayout onSaveExit={() => navigate('/')}>
      <div className="sp-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h1>Business Programme</h1>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#EAF3DE', border: '1px solid #AACBA7', borderRadius: 9999, padding: '4px 11px', fontSize: 11.5, fontWeight: 700, color: '#27500A' }}>
            <PentaSVG size={11} fill="#2B5341" stroke="#2B5341" />
            Business account
          </span>
        </div>
        <p>Manage all your organisation's planting sites, partners, and project submissions in one place.</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1.5px solid #EDE6DF', marginBottom: 22, flexWrap: 'wrap' }}>
        {([
          { key: 'sites',      label: 'Sites' },
          { key: 'partners',   label: 'Partners' },
          { key: 'bulkupload', label: 'Bulk upload' },
          { key: 'mix',        label: 'Mix view' },
          { key: 'empty',      label: 'Empty state' },
        ] as { key: BPView; label: string }[]).map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setView(t.key)}
            style={{ height: 38, padding: '0 16px', border: 'none', background: 'none', fontFamily: 'Inter,sans-serif', fontSize: 13, fontWeight: view === t.key ? 700 : 400, color: view === t.key ? '#2B5341' : '#6B7B6E', borderBottom: view === t.key ? '2.5px solid #2B5341' : '2.5px solid transparent', cursor: 'pointer', marginBottom: -1.5 }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* SITES view */}
      {view === 'sites' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#112121' }}>{SITES.length} sites</div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setView('bulkupload')} style={{ height: 36, padding: '0 14px', borderRadius: 9, border: '1px solid #D8CFC6', background: '#FFFFFF', color: '#112121', fontFamily: 'Inter,sans-serif', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Bulk upload</button>
              <button type="button" onClick={() => navigate('/submit-project/details')} style={{ height: 36, padding: '0 14px', borderRadius: 9, border: 'none', background: '#F09125', color: '#112121', fontFamily: 'Inter,sans-serif', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>+ Add site</button>
            </div>
          </div>

          <div style={{ border: '1px solid #EDE6DF', borderRadius: 16, background: '#FFFFFF', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '10px 18px', borderBottom: '1px solid #EDE6DF', gap: 12 }}>
              {['Site name', 'Element', 'Category', 'Status', 'Submitted'].map(h => (
                <div key={h} style={{ fontSize: 11, fontWeight: 700, color: '#6B7B6E', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</div>
              ))}
            </div>
            {SITES.map((s, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '13px 18px', borderBottom: i < SITES.length - 1 ? '1px solid #F5F0EC' : 'none', gap: 12, alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#112121' }}>{s.name}</div>
                  <div style={{ fontSize: 11.5, color: '#6B7B6E', marginTop: 2 }}>{s.trees > 0 ? `~${s.trees.toLocaleString()} trees` : 'Wetland'}</div>
                </div>
                <div style={{ fontSize: 12.5, color: '#112121' }}>{s.element}</div>
                <div style={{ fontSize: 12.5, color: '#6B7B6E' }}>{s.category}</div>
                <StatusBadge status={s.status} />
                <div style={{ fontFamily: 'monospace', fontSize: 11.5, color: '#6B7B6E' }}>{s.date}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EMPTY view */}
      {view === 'empty' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16, padding: '48px 24px' }}>
          <PentaSVG size={64} fill="#EAF3DE" stroke="#AACBA7" />
          <div style={{ fontSize: 18, fontWeight: 700, color: '#112121' }}>No sites yet</div>
          <div style={{ fontSize: 13.5, color: '#6B7B6E', maxWidth: 420, lineHeight: 1.65 }}>
            Add your first planting site or restoration project. You can add sites one by one or upload a spreadsheet to add many at once.
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button type="button" onClick={() => setView('bulkupload')} style={{ height: 42, padding: '0 20px', borderRadius: 10, border: '1px solid #D8CFC6', background: '#FFFFFF', color: '#112121', fontFamily: 'Inter,sans-serif', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>Bulk upload</button>
            <button type="button" onClick={() => navigate('/submit-project/details')} style={{ height: 42, padding: '0 20px', borderRadius: 10, border: 'none', background: '#F09125', color: '#112121', fontFamily: 'Inter,sans-serif', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>+ Add first site</button>
          </div>
        </div>
      )}

      {/* BULK UPLOAD view */}
      {view === 'bulkupload' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 640 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#112121' }}>Upload a spreadsheet</div>
          <div style={{ border: '1.5px dashed #AACBA7', borderRadius: 16, background: '#FBF8F5', padding: '38px 30px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12 }}>
            <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
              <rect x="6" y="4" width="28" height="32" rx="4" fill="#EAF3DE" stroke="#2B5341" strokeWidth="1.6" />
              <path d="M14 16h12M14 22h8" stroke="#2B5341" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Drag your spreadsheet here</div>
            <div style={{ fontSize: 13, color: '#6B7B6E', lineHeight: 1.6 }}>CSV or XLSX - one row per site. Download the template below to get started.</div>
            {uploading ? (
              <div style={{ width: '100%', maxWidth: 320 }}>
                <div style={{ height: 8, borderRadius: 9999, background: '#EDE6DF', overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ height: '100%', width: `${uploadPct}%`, borderRadius: 9999, background: '#2B5341', transition: 'width 0.3s ease' }} />
                </div>
                <div style={{ fontSize: 12, color: '#6B7B6E' }}>Parsing rows... {uploadPct}%</div>
              </div>
            ) : (
              <button type="button" onClick={startBulkUpload} style={{ height: 42, padding: '0 20px', borderRadius: 10, border: 'none', background: '#F09125', color: '#112121', fontFamily: 'Inter,sans-serif', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', marginTop: 2 }}>Choose file</button>
            )}
          </div>
          <div style={{ border: '1px solid #EDE6DF', borderRadius: 12, background: '#FFFFFF', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
              <rect x="3" y="2" width="16" height="18" rx="3" fill="#EAF3DE" stroke="#2B5341" strokeWidth="1.4" />
              <path d="M7 8h8M7 12h5" stroke="#2B5341" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>five-elements-sites-template.xlsx</div>
              <div style={{ fontSize: 11.5, color: '#6B7B6E' }}>XLSX template - includes all required columns with examples</div>
            </div>
            <button type="button" style={{ marginLeft: 'auto', height: 34, padding: '0 13px', borderRadius: 9, border: '1px solid #2B5341', background: '#FFFFFF', color: '#2B5341', fontFamily: 'Inter,sans-serif', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>Download</button>
          </div>
        </div>
      )}

      {/* BULK PREVIEW view */}
      {view === 'bulkpreview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#112121' }}>Preview - 4 rows found</div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#FFF3E0', border: '1px solid #F09125', borderRadius: 9999, padding: '3px 9px', fontSize: 11, fontWeight: 700, color: '#7A4500' }}>1 row has errors</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setView('bulkupload')} style={{ height: 36, padding: '0 14px', borderRadius: 9, border: '1px solid #D8CFC6', background: '#FFFFFF', color: '#112121', fontFamily: 'Inter,sans-serif', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Re-upload</button>
              <button type="button" onClick={() => setView('sites')} style={{ height: 36, padding: '0 14px', borderRadius: 9, border: 'none', background: '#2B5341', color: '#FFFFFF', fontFamily: 'Inter,sans-serif', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Import 3 valid rows</button>
            </div>
          </div>

          <div style={{ border: '1px solid #EDE6DF', borderRadius: 16, background: '#FFFFFF', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '40px 2fr 1fr 1fr 1fr 60px', padding: '10px 18px', borderBottom: '1px solid #EDE6DF', gap: 12 }}>
              {['Row', 'Site name', 'Element', 'Trees', 'Date', 'Status'].map(h => (
                <div key={h} style={{ fontSize: 11, fontWeight: 700, color: '#6B7B6E', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</div>
              ))}
            </div>
            {BULK_PREVIEW_ROWS.map((r, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 2fr 1fr 1fr 1fr 60px', padding: '12px 18px', borderBottom: i < BULK_PREVIEW_ROWS.length - 1 ? '1px solid #F5F0EC' : 'none', gap: 12, alignItems: 'center', background: r.ok ? 'transparent' : '#FFF5F0' }}>
                <div style={{ fontFamily: 'monospace', fontSize: 11.5, color: '#6B7B6E' }}>{r.row}</div>
                <div style={{ fontSize: 13, fontWeight: r.ok ? 400 : 700, color: r.ok ? '#112121' : '#8B3A00' }}>{r.name || '(empty)'}</div>
                <div style={{ fontSize: 12.5, color: '#112121' }}>{r.element}</div>
                <div style={{ fontFamily: 'monospace', fontSize: 12, color: r.ok ? '#112121' : '#8B3A00' }}>{r.trees}</div>
                <div style={{ fontFamily: 'monospace', fontSize: 11.5, color: r.ok ? '#6B7B6E' : '#8B3A00' }}>{r.date || '(missing)'}</div>
                <div>
                  {r.ok ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: '50%', background: '#2B5341' }}>
                      <svg width="10" height="10" viewBox="0 0 13 13" aria-hidden="true"><path d="M2.5 7 5.5 10 10.5 3.5" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: '50%', background: '#8B3A00', color: '#FFFFFF', fontSize: 12, fontWeight: 700 }}>!</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PARTNERS view */}
      {view === 'partners' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#112121' }}>{PARTNERS.length} partners</div>
            <button type="button" style={{ marginLeft: 'auto', height: 36, padding: '0 14px', borderRadius: 9, border: 'none', background: '#F09125', color: '#112121', fontFamily: 'Inter,sans-serif', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>+ Add partner</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {PARTNERS.map((p, i) => (
              <div key={i} style={{ border: '1px solid #EDE6DF', borderRadius: 14, background: '#FFFFFF', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <PentaSVG size={20} fill="#2B5341" stroke="#2B5341" />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#112121' }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: '#6B7B6E', marginTop: 2 }}>
                    {p.type}{p.ref ? ` - ${p.ref}` : ''} - {p.sites} site{p.sites !== 1 ? 's' : ''}
                  </div>
                </div>
                <StatusBadge status={p.status} />
                <button type="button" style={{ height: 32, padding: '0 12px', borderRadius: 8, border: '1px solid #D8CFC6', background: '#FFFFFF', color: '#6B7B6E', fontFamily: 'Inter,sans-serif', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>Manage</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MIX view - sites + partners side by side */}
      {view === 'mix' && (
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: '1.5', minWidth: 340, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#112121', marginBottom: 2 }}>Sites ({SITES.length})</div>
            {SITES.map((s, i) => (
              <div key={i} style={{ border: '1px solid #EDE6DF', borderRadius: 12, background: '#FFFFFF', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#112121' }}>{s.name}</div>
                  <div style={{ fontSize: 11.5, color: '#6B7B6E', marginTop: 2 }}>{s.element} - {s.category}</div>
                </div>
                <StatusBadge status={s.status} />
              </div>
            ))}
            <button type="button" onClick={() => navigate('/submit-project/details')} style={{ height: 36, borderRadius: 10, border: '1.5px dashed #AACBA7', background: '#FBF8F5', color: '#2B5341', fontFamily: 'Inter,sans-serif', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>+ Add site</button>
          </div>

          <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#112121', marginBottom: 2 }}>Partners ({PARTNERS.length})</div>
            {PARTNERS.map((p, i) => (
              <div key={i} style={{ border: '1px solid #EDE6DF', borderRadius: 12, background: '#FFFFFF', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#112121' }}>{p.name}</div>
                  <div style={{ fontSize: 11.5, color: '#6B7B6E', marginTop: 2 }}>{p.type} - {p.sites} site{p.sites !== 1 ? 's' : ''}</div>
                </div>
                <StatusBadge status={p.status} />
              </div>
            ))}
            <button type="button" style={{ height: 36, borderRadius: 10, border: '1.5px dashed #AACBA7', background: '#FBF8F5', color: '#2B5341', fontFamily: 'Inter,sans-serif', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>+ Add partner</button>
          </div>
        </div>
      )}
    </SubmitProjectLayout>
  )
}
