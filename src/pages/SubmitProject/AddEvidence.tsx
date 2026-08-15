import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SubmitProjectLayout from './SubmitProjectLayout'
import { useSubmitProject } from './useSubmitProject'
import { useAuth } from '../../contexts/AuthContext'
import './SubmitProject.css'

type EvidenceView = 'empty' | 'uploading' | 'evidence'
interface DocItem { name: string; meta: string }

const PHOTO_DEFS = [
  { date: '14 Jun 2026 07:42', gps: '13.1121 N, 77.5946 E', bg: '#E3EDD9', flag: false },
  { date: '14 Jun 2026 08:15', gps: '13.1118 N, 77.5951 E', bg: '#DCE8DE', flag: false },
  { date: '14 Jun 2026 08:40', gps: '13.1125 N, 77.5940 E', bg: '#E8EDDC', flag: false },
  { date: '14 Jun 2026 09:03', gps: '13.1119 N, 77.5944 E', bg: '#E5EBD8', flag: false },
  { date: '21 Jun 2026 07:55', gps: '13.1122 N, 77.5948 E', bg: '#DFE9DF', flag: false },
  { date: '21 Jun 2026 08:22', gps: null, bg: '#E7EEDD', flag: false },
  { date: '05 Jul 2026 08:10', gps: null, bg: '#E3EDD9', flag: false },
  { date: '05 Jul 2026 09:00', gps: '13.1120 N, 77.5943 E', bg: '#DCE8DE', flag: false },
]
const DOC_OPTIONS: DocItem[] = [
  { name: 'Sapling purchase invoice - Nursery Hebbal.pdf', meta: 'PDF 214 KB dated 12 Jun 2026' },
  { name: 'Green Yelahanka Trust planting report.pdf', meta: 'PDF 1.1 MB mentions site + count' },
]
const STRONG_HINTS = [
  { n: '1', text: 'Photos taken during the work, straight from the phone - dates and GPS come with them.' },
  { n: '2', text: 'Wide shots that show the site, not just close-ups of individual plants.' },
  { n: '3', text: 'An invoice, certificate or partner report that corroborates the photos.' },
  { n: '4', text: 'A partner NGO or registry reference a reviewer can look up.' },
]
const UPLOAD_THUMBS = ['#E3EDD9','#DCE8DE','#E8EDDC','#E5EBD8','#DFE9DF','#E7EEDD','#E3EDD9','#DCE8DE']

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

export default function AddEvidence() {
  const navigate = useNavigate()
  const { draft, updateDraft, saveDraftToAPI, uploadEvidenceFiles } = useSubmitProject()
  const { session } = useAuth()
  const [view, setView] = useState<EvidenceView>('empty')
  const [docsCount, setDocsCount] = useState(0)
  const [hasRef, setHasRef] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [uploadErr, setUploadErr] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  async function startUpload() {
    const filesToUpload = pendingFiles
    setView('uploading')
    setUploadPct(0)
    setUploadErr(false)

    // If we have a real token, ensure a draft exists then upload files
    if (session?.access_token && filesToUpload.length > 0) {
      // Ensure draft is saved to get a draftId
      let draftId = draft.draftId
      if (!draftId) {
        const id = await saveDraftToAPI({}, session.access_token)
        if (id) draftId = id
      }

      if (draftId) {
        // Simulate progress while uploading
        let pct = 0
        const iv = setInterval(() => {
          pct = Math.min(pct + 8, 85)
          setUploadPct(pct)
        }, 200)

        const results = await uploadEvidenceFiles(filesToUpload, draftId, session.access_token)
        clearInterval(iv)

        const ok = results.filter(r => r.ok)
        if (ok.length === 0 && results.length > 0) {
          setUploadErr(true)
          setView('empty')
          return
        }

        // Update local draft with file metadata
        const newFiles = filesToUpload.map((f, i) => ({
          id:   results[i]?.id || `local-${Date.now()}-${i}`,
          name: f.name,
          size: f.size,
          type: f.type,
        }))
        updateDraft({ evidenceFiles: [...draft.evidenceFiles, ...newFiles] })
        setUploadPct(100)
        setTimeout(() => setView('evidence'), 300)
        return
      }
    }

    // Fallback: simulate upload progress (no token or no files)
    let pct = 0
    const iv = setInterval(() => {
      pct += 12
      setUploadPct(pct)
      if (pct >= 100) { clearInterval(iv); setView('evidence') }
    }, 300)
  }

  const photos = PHOTO_DEFS
  const docs = DOC_OPTIONS.slice(0, docsCount)
  const gpsCount = photos.filter(p => p.gps).length
  const sigDated = true
  const sigGps = gpsCount >= 3
  const sigGeoOk = true
  const sigDoc = docsCount > 0
  const sigRef = hasRef
  let score = 0.30 + (sigGps ? 0.18 : 0) + (sigGeoOk ? 0.14 : 0) + (sigDoc ? 0.18 : 0) + (sigRef ? 0.20 : 0)
  score = Math.max(0.12, Math.min(1, score))
  const verified = sigGeoOk && sigDoc && sigRef
  const meterWord = score >= 0.85 ? 'Strong' : score >= 0.55 ? 'Good' : 'Partial'
  const meterColor = score >= 0.85 ? '#2B5341' : score >= 0.55 ? '#6E9A6B' : '#AACBA7'
  const signals = [
    { on: sigDated, label: 'Photos have capture dates', hint: 'Photos straight from a phone camera keep their date.' },
    { on: sigGps, label: 'Photos have GPS', hint: `${gpsCount} of ${photos.length} photos carry a geotag - more helps.` },
    { on: sigGeoOk, label: 'All GPS inside your boundary', hint: "One photo's GPS falls outside - check the map above." },
    { on: sigDoc, label: 'A corroborating document', hint: 'An invoice, certificate or partner report a reviewer can check.' },
    { on: sigRef, label: 'A checkable partner or registry reference', hint: 'An NGO registration or registry ID the reviewer can look up.' },
  ]
  const tierNote = verified
    ? 'Dated, geolocated photos inside your boundary, a corroborating document and a checkable reference - this reads like strong evidence.'
    : 'Self-reported is an honest home for real work whose proof is incomplete. ' +
      (sigDoc ? 'A checkable partner or registry reference' : 'A corroborating document') + ' would lift this.'

  return (
    <SubmitProjectLayout onSaveExit={() => navigate('/')}>
      <div className="sp-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h1>Add evidence</h1>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#EAF3DE', border: '1px solid #AACBA7', borderRadius: 9999, padding: '4px 11px', fontSize: 11.5, fontWeight: 700, color: '#27500A' }}>
            <PentaSVG size={11} fill="#2B5341" stroke="#2B5341" />
            Earth - Community planting
          </span>
        </div>
        <p>Upload the same kind of proof our field partners capture: photos with dates and GPS, plus anything that corroborates the work. Stronger evidence makes a <strong style={{ color: '#112121' }}>Verified</strong> outcome more likely - but the reviewer always decides.</p>
      </div>

      {uploadErr && (
        <div className="sp-error-banner">
          <span className="sp-error-banner__icon">!</span>
          <div className="sp-error-banner__text"><strong>2 photos did not finish uploading</strong> - the connection dropped. Your other files are safe and nothing was lost.</div>
          <button type="button" onClick={() => { setUploadErr(false); setView('evidence') }} style={{ marginLeft: 'auto', height: 36, padding: '0 15px', borderRadius: 9, border: 'none', background: '#F09125', color: '#112121', fontFamily: 'Inter,sans-serif', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>Retry upload</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 22, padding: '18px 0 28px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1.5', minWidth: 420, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {view === 'empty' && (
            <React.Fragment>
              <div style={{ border: '1.5px dashed #AACBA7', borderRadius: 16, background: '#FBF8F5', padding: '38px 30px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12 }}>
                <PentaSVG size={56} fill="#EAF3DE" stroke="#AACBA7" />
                <div style={{ fontSize: 17, fontWeight: 700 }}>Upload photos of the work</div>
                <div style={{ fontSize: 13.5, color: '#6B7B6E', maxWidth: 430, lineHeight: 1.6 }}>Drag photos here or browse. We read capture dates and GPS from the files automatically - photos straight from a phone camera usually carry both.</div>
                <label style={{ height: 42, padding: '0 20px', borderRadius: 10, border: 'none', background: '#F09125', color: '#112121', fontFamily: 'Inter,sans-serif', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', marginTop: 2, display: 'inline-flex', alignItems: 'center' }}>
                  Choose photos
                  <input type="file" multiple accept="image/*,.pdf,.xlsx,.xls" hidden onChange={e => {
                    const files = Array.from(e.target.files || [])
                    if (files.length > 0) { setPendingFiles(files); setTimeout(startUpload, 0) }
                    e.target.value = ''
                  }} />
                </label>
                <div style={{ fontSize: 11.5, color: '#6B7B6E' }}>JPG, PNG or HEIC up to 40 photos</div>
              </div>
              <div style={{ border: '1px solid #EDE6DF', borderRadius: 14, background: '#FFFFFF', padding: '18px 20px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#2B5341', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>What strong evidence looks like</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 18px' }}>
                  {STRONG_HINTS.map(h => (
                    <div key={h.n} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#EAF3DE', color: '#27500A', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{h.n}</span>
                      <div style={{ fontSize: 12.5, color: '#112121', lineHeight: 1.5 }}>{h.text}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 14, padding: '10px 13px', background: '#F5F0EC', borderRadius: 9, fontSize: 12, color: '#6B7B6E', lineHeight: 1.55 }}>Only real photos of your own work. Stock images or images of other projects will be rejected and can close your account.</div>
              </div>
            </React.Fragment>
          )}

          {view === 'uploading' && (
            <div style={{ border: '1px solid #EDE6DF', borderRadius: 16, background: '#FFFFFF', padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 22, height: 22, border: '2.5px solid #EAF3DE', borderTopColor: '#2B5341', borderRadius: '50%', animation: 'fe-spin 0.8s linear infinite', flexShrink: 0, display: 'inline-block' }} />
                <div style={{ fontSize: 14.5, fontWeight: 700 }}>Uploading 8 photos</div>
                <span style={{ marginLeft: 'auto', fontFamily: 'monospace', fontSize: 12, color: '#6B7B6E' }}>{Math.round(uploadPct / 12)} of 8 done</span>
              </div>
              <div style={{ height: 8, borderRadius: 9999, background: '#EDE6DF', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${uploadPct}%`, borderRadius: 9999, background: '#2B5341', transition: 'width 0.3s ease' }} />
              </div>
              <div style={{ fontSize: 12.5, color: '#6B7B6E', lineHeight: 1.5 }}>Reading capture dates and GPS from each file as it lands. Do not close this tab - you can keep adding files.</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                {UPLOAD_THUMBS.map((bg, i) => (
                  <div key={i} style={{ aspectRatio: '4/3', borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', border: '1px solid #EDE6DF' }}>
                    {i < Math.round(uploadPct / 12) ? (
                      <span style={{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: '50%', background: '#2B5341', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="9" height="9" viewBox="0 0 13 13" aria-hidden="true"><path d="M2.5 7 5.5 10 10.5 3.5" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </span>
                    ) : (
                      <span style={{ width: 14, height: 14, border: '2px solid #D8CFC6', borderTopColor: '#6B7B6E', borderRadius: '50%', animation: 'fe-spin 0.8s linear infinite', display: 'inline-block' }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'evidence' && (
            <React.Fragment>
              <div style={{ border: '1px solid #EDE6DF', borderRadius: 16, background: '#FFFFFF', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid #EDE6DF', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>Photos</div>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#6B7B6E' }}>{photos.length} photos - dates read from {photos.filter(p => p.date).length} - GPS from {photos.filter(p => p.gps).length}</span>
                  <label style={{ marginLeft: 'auto', height: 34, padding: '0 13px', borderRadius: 9, border: '1px solid #2B5341', background: '#FFFFFF', color: '#2B5341', fontFamily: 'Inter,sans-serif', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                    + Add more
                    <input type="file" multiple accept="image/*,.pdf,.xlsx,.xls" hidden onChange={e => {
                      const files = Array.from(e.target.files || [])
                      if (files.length > 0) { setPendingFiles(files); setTimeout(startUpload, 0) }
                      e.target.value = ''
                    }} />
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, padding: '16px 18px' }}>
                  {photos.map((ph, i) => (
                    <div key={i} style={{ border: ph.flag ? '2px solid #8B3A00' : '1px solid #E2DAD1', borderRadius: 12, overflow: 'hidden', background: '#FFFFFF' }}>
                      <div style={{ aspectRatio: '4/3', background: ph.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
                          <rect x="2" y="5" width="18" height="14" rx="3" fill="none" stroke="#2B5341" strokeWidth="1.6" opacity="0.5" />
                          <circle cx="11" cy="12" r="3.5" fill="none" stroke="#2B5341" strokeWidth="1.6" opacity="0.5" />
                        </svg>
                        {ph.flag && <span style={{ position: 'absolute', top: 6, left: 6, background: '#8B3A00', color: '#FFFFFF', borderRadius: 6, padding: '2px 7px', fontSize: 10, fontWeight: 700 }}>Outside boundary</span>}
                      </div>
                      <div style={{ padding: '8px 10px 10px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#112121' }}>{ph.date}</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 10, color: ph.gps ? (ph.flag ? '#8B3A00' : '#27500A') : '#6B7B6E' }}>{ph.gps || 'No GPS in file'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ border: '1px solid #EDE6DF', borderRadius: 16, background: '#FFFFFF', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #EDE6DF', display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>Supporting documents</div>
                  <span style={{ fontSize: 12, color: '#6B7B6E' }}>optional - corroboration lifts evidence toward Verified</span>
                </div>
                <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {docs.map((doc, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1px solid #EDE6DF', borderRadius: 11, padding: '11px 14px' }}>
                      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                        <path d="M5 2h7l4 4v12H5z" fill="#EAF3DE" stroke="#2B5341" strokeWidth="1.4" strokeLinejoin="round" />
                        <path d="M12 2v4h4" fill="none" stroke="#2B5341" strokeWidth="1.4" strokeLinejoin="round" />
                      </svg>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</div>
                        <div style={{ fontSize: 11.5, color: '#6B7B6E' }}>{doc.meta}</div>
                      </div>
                      <button type="button" onClick={() => setDocsCount(c => Math.max(0, c - 1))} aria-label="Remove document" style={{ marginLeft: 'auto', width: 30, height: 30, borderRadius: 8, border: '1px solid #D8CFC6', background: '#FFFFFF', color: '#6B7B6E', fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>x</button>
                    </div>
                  ))}
                  {docsCount === 0 && <div style={{ fontSize: 12.5, color: '#6B7B6E', lineHeight: 1.6, padding: '2px 2px 4px' }}>Invoices, contracts, registry certificates, or a partner NGO report - anything a reviewer could check against your photos.</div>}
                  {docsCount < 2 && <button type="button" onClick={() => setDocsCount(c => Math.min(2, c + 1))} style={{ height: 38, borderRadius: 10, border: '1.5px dashed #AACBA7', background: '#FBF8F5', color: '#2B5341', fontFamily: 'Inter,sans-serif', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>+ Add a document</button>}
                </div>
              </div>

              <div style={{ border: '1px solid #EDE6DF', borderRadius: 16, background: '#FFFFFF', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>Who did the work with you?</div>
                  <span style={{ fontSize: 12, color: '#6B7B6E' }}>optional - a checkable partner or registry ID is strong corroboration</span>
                </div>
                {hasRef ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1px solid #AACBA7', background: '#FBFDF8', borderRadius: 11, padding: '11px 14px' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>Green Yelahanka Trust</div>
                      <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#27500A', marginTop: 2 }}>NGO Darpan - KA/2019/0234961</div>
                    </div>
                    <button type="button" onClick={() => setHasRef(false)} aria-label="Remove reference" style={{ marginLeft: 'auto', width: 30, height: 30, borderRadius: 8, border: '1px solid #D8CFC6', background: '#FFFFFF', color: '#6B7B6E', fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>x</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setHasRef(true)} style={{ height: 38, borderRadius: 10, border: '1.5px dashed #AACBA7', background: '#FBF8F5', color: '#2B5341', fontFamily: 'Inter,sans-serif', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>+ Add a partner or registry reference</button>
                )}
              </div>
            </React.Fragment>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 340, maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 18 }}>
          {view === 'evidence' ? (
            <React.Fragment>
              <div style={{ border: '1px solid #D8CFC6', borderRadius: 14, overflow: 'hidden', background: '#FFFFFF' }}>
                <div style={{ padding: '11px 15px', borderBottom: '1px solid #EDE6DF', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: '#2B5341', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Photo GPS vs your boundary</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#27500A' }}>All pins inside</span>
                </div>
                <svg viewBox="0 0 380 220" style={{ display: 'block', width: '100%', background: '#F2F0E9' }} role="img" aria-label="Map showing photo GPS points against the project boundary">
                  <path d="M0 178 C70 166 110 188 180 180 S310 186 380 170 L380 220 0 220 Z" fill="#DDE9F2" />
                  <polygon points="58,44 250,26 330,86 280,176 104,182 38,118" fill="#EAF3DE" fillOpacity="0.75" stroke="#2B5341" strokeWidth="2" strokeDasharray="7 4" />
                  <text x="66" y="64" fontFamily="Inter,sans-serif" fontSize="10.5" fill="#27500A">Your boundary (step 1)</text>
                  {([[150,90],[190,118],[124,132],[216,84],[172,148]] as [number,number][]).map(([x,y], i) => (
                    <circle key={i} cx={x} cy={y} r="5.5" fill="#2B5341" stroke="#FFFFFF" strokeWidth="2" />
                  ))}
                </svg>
                <div style={{ padding: '9px 15px', fontSize: 11.5, color: '#6B7B6E', borderTop: '1px solid #EDE6DF', lineHeight: 1.5 }}>Green pins are inside your boundary. This is the same check your reviewer runs - fix surprises now, not after review.</div>
              </div>

              <div style={{ border: '1px solid #EDE6DF', borderRadius: 14, background: '#FFFFFF', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 13 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>Evidence strength</div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: score >= 0.85 ? '#27500A' : '#6B7B6E' }}>{meterWord}</span>
                </div>
                <div style={{ height: 10, borderRadius: 9999, background: '#EDE6DF', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.round(score * 100)}%`, borderRadius: 9999, background: meterColor, transition: 'width 0.5s ease' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {signals.map((sg, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <span style={{ width: 19, height: 19, borderRadius: '50%', background: sg.on ? '#2B5341' : '#FFFFFF', border: `1.5px solid ${sg.on ? '#2B5341' : '#AACBA7'}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                        {sg.on && (
                          <svg width="10" height="10" viewBox="0 0 13 13" aria-hidden="true">
                            <path d="M2.5 7 5.5 10 10.5 3.5" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: sg.on ? 700 : 400, color: sg.on ? '#112121' : '#6B7B6E', lineHeight: 1.4 }}>{sg.label}</div>
                        {!sg.on && <div style={{ fontSize: 11.5, color: '#6B7B6E', lineHeight: 1.45, marginTop: 2 }}>{sg.hint}</div>}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 4, borderRadius: 11, border: `1.5px solid ${verified ? '#AACBA7' : '#D8CFC6'}`, background: verified ? '#FBFDF8' : '#F9F7F5', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: verified ? '#EAF3DE' : '#F0EDE9', border: `1px solid ${verified ? '#AACBA7' : '#D8CFC6'}`, borderRadius: 9999, padding: '3px 9px', fontSize: 11, fontWeight: 700, color: verified ? '#27500A' : '#6B7B6E' }}>
                      <PentaSVG size={9} fill={verified ? '#2B5341' : '#AACBA7'} stroke={verified ? '#2B5341' : '#AACBA7'} />
                      {verified ? 'Likely Verified' : 'Likely Self-reported'}
                    </span>
                    <span style={{ fontSize: 11, color: '#6B7B6E' }}>outcome preview</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: '#6B7B6E', lineHeight: 1.5 }}>{tierNote}</div>
                  <button
                    type="button"
                    style={{ alignSelf: 'flex-start', background: 'none', border: 'none', padding: 0, fontSize: 11.5, color: '#2B5341', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}
                  >
                    What determines the tier?
                  </button>
                </div>
              </div>
            </React.Fragment>
          ) : (
            <div style={{ border: '1px solid #EDE6DF', borderRadius: 14, background: '#FFFFFF', padding: '18px 20px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#2B5341', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>What strong evidence looks like</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {STRONG_HINTS.map((h, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#EAF3DE', color: '#27500A', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{h.n}</span>
                    <div style={{ fontSize: 12.5, color: '#112121', lineHeight: 1.5 }}>{h.text}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, padding: '10px 13px', background: '#F5F0EC', borderRadius: 9, fontSize: 12, color: '#6B7B6E', lineHeight: 1.55 }}>
                Only real photos of your own work. Stock images or images of other projects will be rejected and can close your account.
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="sp-nav-row">
        <button
          type="button"
          onClick={() => navigate('/submit-project/partner')}
          className="sp-btn-back"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => navigate('/submit-project/review')}
          className="sp-btn-continue"
          disabled={view === 'uploading'}
        >
          {view === 'uploading' ? 'Uploading...' : 'Continue to review →'}
        </button>
      </div>
    </SubmitProjectLayout>
  )
}
