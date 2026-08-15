import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SubmitProjectLayout from './SubmitProjectLayout'
import { useSubmitProject } from './useSubmitProject'
import { useAuth } from '../../contexts/AuthContext'
import './SubmitProject.css'

// ── Pentagon SVG ──────────────────────────────────────────────────────────────
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

type Mode = 'platform' | 'custom' | 'self'

interface SearchResult {
  id: string
  name: string
  initials: string
  meta: string
}

const MOCK_RESULTS: SearchResult[] = [
  { id: 'tr', name: 'Terra Roots Foundation', initials: 'TR', meta: 'Afforestation · Gujarat & Karnataka · 212 approved captures' },
  { id: 'tv', name: 'Terra Verde Collective', initials: 'TV', meta: 'Agroforestry · Maharashtra · 48 approved captures' },
]

export default function AddPartner() {
  const navigate = useNavigate()
  const { draft, updateDraft, saveDraftToAPI } = useSubmitProject()
  const { session } = useAuth()

  const [mode, setMode] = useState<Mode>('platform')
  const [searchVal, setSearchVal] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [linked, setLinked] = useState<SearchResult | null>(null)
  const [noResults, setNoResults] = useState(false)
  const [searchError, setSearchError] = useState(false)

  // Custom partner fields
  const [customName, setCustomName] = useState(draft.partnerName || '')
  const [customCountry, setCustomCountry] = useState('India')
  const [customContact, setCustomContact] = useState(draft.partnerContact || '')
  const [customReg, setCustomReg] = useState('')

  function handleSearch(val: string) {
    setSearchVal(val)
    setNoResults(false)
    setResults([])
    if (!val.trim()) return
    setSearching(true)
    setTimeout(() => {
      setSearching(false)
      const filtered = MOCK_RESULTS.filter(r => r.name.toLowerCase().includes(val.toLowerCase()))
      if (filtered.length > 0) {
        setResults(filtered)
      } else {
        setNoResults(true)
      }
    }, 700)
  }

  function handleLink(r: SearchResult) {
    setLinked(r)
    setMode('platform')
  }

  function handleUnlink() {
    setLinked(null)
    setResults([])
    setSearchVal('')
  }

  async function handleNext() {
    let partial: Parameters<typeof updateDraft>[0]
    if (mode === 'platform' && linked) {
      partial = { partnerType: 'registered', partnerName: linked.name, partnerContact: '', partnerRole: '' }
    } else if (mode === 'custom') {
      partial = { partnerType: 'unregistered', partnerName: customName, partnerContact: customContact, partnerRole: customReg }
    } else {
      partial = { partnerType: 'self', partnerName: '', partnerContact: '', partnerRole: '' }
    }
    if (session?.access_token) {
      await saveDraftToAPI(partial, session.access_token)
    } else {
      updateDraft(partial)
    }
    navigate('/submit-project/evidence')
  }

  function handleBack() {
    navigate('/submit-project/details')
  }

  const corrNote = linked
    ? 'A linked vetted partner is checkable corroboration — with solid photos this often reads as Verified.'
    : mode === 'custom'
      ? 'An unverified partner with a checkable registry reference is good corroboration; without one, your photos and documents carry more of the weight.'
      : mode === 'self'
        ? 'Self-executed work leans entirely on your photos and documents — make the evidence step count.'
        : 'Link a partner if they\'re here; otherwise record them manually — honesty beats polish.'

  const MODES: { id: Mode; title: string; sub: string }[] = [
    { id: 'platform', title: "They're on Five Elements", sub: 'Search and link a vetted partner — the strongest signal.' },
    { id: 'custom',   title: "They're not on Five Elements", sub: 'The common case — record them as an unverified partner.' },
    { id: 'self',     title: 'I did this myself', sub: 'No formal partner — e.g. planted on your own land.' },
  ]

  return (
    <SubmitProjectLayout onSaveExit={() => navigate('/')}>
      <div className="sp-page-header">
        <h1>Who did the work?</h1>
        <p>
          This is attribution, not access — the partner you name gets no account and no notification. A partner a reviewer can check is the single strongest thing you can add.
        </p>
      </div>

      {searchError && (
        <div className="sp-error-banner">
          <span className="sp-error-banner__icon">!</span>
          <div className="sp-error-banner__text">
            <strong>Partner search is unavailable right now.</strong> You can still add the partner manually below, or retry.
          </div>
          <button
            type="button"
            onClick={() => { setSearchError(false); setMode('platform') }}
            style={{ marginLeft: 'auto', height: 36, padding: '0 15px', borderRadius: 9, border: 'none', background: '#F09125', color: '#112121', fontFamily: 'Inter,sans-serif', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
          >
            Retry
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '18px 0 28px' }}>

        {/* Mode cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {MODES.map(m => (
            <button
              key={m.id}
              type="button"
              aria-pressed={mode === m.id ? 'true' : 'false'}
              onClick={() => { setMode(m.id); setLinked(null) }}
              style={{
                border: mode === m.id ? '2px solid #2B5341' : '1px solid #E2DAD1',
                borderRadius: 14,
                background: mode === m.id ? '#EAF3DE' : '#FFFFFF',
                padding: '16px 16px 14px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 6,
                cursor: 'pointer',
                fontFamily: 'Inter,sans-serif',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 13.5, fontWeight: 700, color: '#112121' }}>{m.title}</span>
              <span style={{ fontSize: 11.5, color: '#6B7B6E', lineHeight: 1.5 }}>{m.sub}</span>
            </button>
          ))}
        </div>

        {/* ON-PLATFORM: search */}
        {mode === 'platform' && !linked && (
          <div style={{ border: '1px solid #EDE6DF', borderRadius: 16, background: '#FFFFFF', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label htmlFor="c2-search" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#2B5341', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 7 }}>
                Search partners on Five Elements
              </label>
              <div style={{ position: 'relative' }}>
                <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true" style={{ position: 'absolute', left: 13, top: 14 }}>
                  <circle cx="7" cy="7" r="5" fill="none" stroke="#6B7B6E" strokeWidth="1.8" />
                  <line x1="11" y1="11" x2="15" y2="15" stroke="#6B7B6E" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <input
                  id="c2-search"
                  type="text"
                  value={searchVal}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="e.g. Terra Roots Foundation"
                  style={{ width: '100%', height: 44, border: '1px solid #D8CFC6', borderRadius: 10, background: '#FFFFFF', padding: '0 13px 0 38px', fontFamily: 'Inter,sans-serif', fontSize: 13.5, color: '#112121' }}
                />
              </div>
            </div>

            {searching && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 2px' }}>
                <span style={{ width: 18, height: 18, border: '2.5px solid #EAF3DE', borderTopColor: '#2B5341', borderRadius: '50%', animation: 'fe-spin 0.8s linear infinite', display: 'inline-block' }} />
                <span style={{ fontSize: 12.5, color: '#6B7B6E' }}>Searching partners…</span>
              </div>
            )}

            {results.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {results.map(r => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1px solid #EDE6DF', borderRadius: 12, padding: '12px 14px' }}>
                    <PentaSVG size={34} fill="#EAF3DE" stroke="#2B5341" />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13.5, fontWeight: 700 }}>{r.name}</span>
                        <span style={{ background: '#112121', color: '#FFFFFF', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>Vetted partner</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: '#6B7B6E', marginTop: 2 }}>{r.meta}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLink(r)}
                      style={{ marginLeft: 'auto', height: 36, padding: '0 15px', borderRadius: 9, border: '1px solid #2B5341', background: '#FFFFFF', color: '#2B5341', fontFamily: 'Inter,sans-serif', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
                    >
                      Link
                    </button>
                  </div>
                ))}
              </div>
            )}

            {noResults && (
              <div style={{ padding: 14, background: '#FBF8F5', borderRadius: 11, fontSize: 12.5, color: '#6B7B6E', lineHeight: 1.6, textAlign: 'center' }}>
                No match — most off-platform partners aren't here yet. Switch to <strong style={{ color: '#112121' }}>"They're not on Five Elements"</strong> above and add them manually.
              </div>
            )}

            <div style={{ fontSize: 12, color: '#6B7B6E', lineHeight: 1.55, borderTop: '1px solid #EDE6DF', paddingTop: 11 }}>
              Linking a vetted partner materially strengthens your evidence — their record backs your claim.
            </div>
          </div>
        )}

        {/* LINKED confirmation */}
        {mode === 'platform' && linked && (
          <>
            <div style={{ border: '1.5px solid #2B5341', borderRadius: 16, background: '#FBFDF8', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <PentaSVG size={40} fill="#2B5341" stroke="#2B5341" />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{linked.name}</span>
                  <span style={{ background: '#112121', color: '#FFFFFF', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>Vetted partner</span>
                </div>
                <div style={{ fontSize: 12, color: '#6B7B6E', marginTop: 3 }}>{linked.meta}</div>
                <div style={{ fontSize: 12, color: '#27500A', marginTop: 6, fontWeight: 700 }}>Linked — a reviewer can check their record directly. This is the strongest partner signal.</div>
              </div>
              <button
                type="button"
                onClick={handleUnlink}
                style={{ marginLeft: 'auto', height: 36, padding: '0 14px', borderRadius: 9, border: '1px solid #D8CFC6', background: '#FFFFFF', color: '#6B7B6E', fontFamily: 'Inter,sans-serif', fontSize: 12.5, cursor: 'pointer', flexShrink: 0 }}
              >
                Unlink
              </button>
            </div>
            <div style={{ fontSize: 12, color: '#6B7B6E', lineHeight: 1.55, padding: '0 4px' }}>
              The partner is not notified and gets no access to your submission — this only tells the reviewer who executed the work.
            </div>
          </>
        )}

        {/* CUSTOM partner form */}
        {mode === 'custom' && (
          <div style={{ border: '1px solid #EDE6DF', borderRadius: 16, background: '#FFFFFF', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>Partner details</div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#EAF3DE', color: '#27500A', border: '1.5px dashed #AACBA7', borderRadius: 9999, padding: '3px 11px', fontSize: 11, fontWeight: 700 }}>Unverified partner</span>
              <span style={{ fontSize: 11.5, color: '#6B7B6E' }}>an attribution record — no account, no access, no notification</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label htmlFor="c2-pname" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#2B5341', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 7 }}>Organisation or person</label>
                <input
                  id="c2-pname"
                  type="text"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder="e.g. Green Yelahanka Trust"
                  style={{ width: '100%', height: 42, border: '1px solid #D8CFC6', borderRadius: 10, background: '#FFFFFF', padding: '0 13px', fontFamily: 'Inter,sans-serif', fontSize: 13.5, color: '#112121' }}
                />
              </div>
              <div>
                <label htmlFor="c2-pcountry" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#2B5341', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 7 }}>Country</label>
                <select
                  id="c2-pcountry"
                  value={customCountry}
                  onChange={e => setCustomCountry(e.target.value)}
                  style={{ width: '100%', height: 42, border: '1px solid #D8CFC6', borderRadius: 10, background: '#FFFFFF', padding: '0 12px', fontFamily: 'Inter,sans-serif', fontSize: 13.5, color: '#112121' }}
                >
                  <option>India</option>
                  <option>Kenya</option>
                  <option>Indonesia</option>
                  <option>Brazil</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="c2-pcontact" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#2B5341', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 7 }}>
                  Contact <span style={{ color: '#6B7B6E', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— email or phone</span>
                </label>
                <input
                  id="c2-pcontact"
                  type="text"
                  value={customContact}
                  onChange={e => setCustomContact(e.target.value)}
                  placeholder="hello@partner.org"
                  style={{ width: '100%', height: 42, border: '1px solid #D8CFC6', borderRadius: 10, background: '#FFFFFF', padding: '0 13px', fontFamily: 'Inter,sans-serif', fontSize: 13.5, color: '#112121' }}
                />
              </div>
              <div>
                <label htmlFor="c2-preg" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#2B5341', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 7 }}>
                  Registration reference <span style={{ color: '#6B7B6E', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— optional, strongly encouraged</span>
                </label>
                <input
                  id="c2-preg"
                  type="text"
                  value={customReg}
                  onChange={e => setCustomReg(e.target.value)}
                  placeholder="e.g. NGO Darpan KA/2019/0234961"
                  style={{
                    width: '100%', height: 42,
                    border: customReg ? '1.5px solid #AACBA7' : '1px solid #D8CFC6',
                    borderRadius: 10,
                    background: customReg ? '#FBFDF8' : '#FFFFFF',
                    padding: '0 13px',
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 12,
                    color: '#112121',
                  }}
                />
              </div>
            </div>
            <div style={{
              background: customReg ? '#FBFDF8' : '#F5F0EC',
              border: `1px solid ${customReg ? '#AACBA7' : '#E2DAD1'}`,
              borderRadius: 11,
              padding: '11px 14px',
              fontSize: 12.5,
              color: customReg ? '#27500A' : '#6B7B6E',
              lineHeight: 1.55,
            }}>
              {customReg
                ? 'A registry reference a reviewer can look up is the single strongest corroboration a custom partner can carry.'
                : 'No pressure — but a registration number (NGO registry, company ID) is the one field that most improves your chance of full Verified.'}
            </div>
          </div>
        )}

        {/* SELF-EXECUTED */}
        {mode === 'self' && (
          <div style={{ border: '1px solid #EDE6DF', borderRadius: 16, background: '#FFFFFF', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>You did this yourself</div>
            <div style={{ fontSize: 13, color: '#6B7B6E', lineHeight: 1.65, maxWidth: 640 }}>
              Completely legitimate — planting on your own land, a family drive, a personal restoration effort. Without a partner to corroborate, your photos and documents carry the whole claim, so the evidence step matters more: dated, geolocated photos and any receipts you kept.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: '#FBF8F5', borderRadius: 11 }}>
              <span style={{ width: 19, height: 19, borderRadius: '50%', background: '#2B5341', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="10" height="10" viewBox="0 0 13 13" aria-hidden="true">
                  <path d="M2.5 7 5.5 10 10.5 3.5" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span style={{ fontSize: 12.5, color: '#112121' }}>Recorded as self-executed — the reviewer will read your evidence on its own merits.</span>
            </div>
          </div>
        )}

        {/* Corroboration note */}
        <div style={{ border: '1px solid #E2DAD1', borderRadius: 12, background: '#FBF8F5', padding: '12px 15px', fontSize: 12, color: '#6B7B6E', lineHeight: 1.65 }}>
          <strong style={{ color: '#112121' }}>How this affects your outcome</strong><br />
          {corrNote} Either way your project is recorded — <strong style={{ color: '#112121' }}>Verified</strong> needs corroboration a reviewer can check; <strong style={{ color: '#27500A' }}>Self-reported</strong> is the honest tier when it can't be.
        </div>
      </div>

      {/* Footer nav */}
      <div className="sp-footer">
        <button type="button" className="sp-btn sp-btn--ghost" onClick={handleBack}>Back</button>
        <span style={{ fontSize: 12, color: '#6B7B6E' }}>Step 2 of 4</span>
        <button type="button" className="sp-btn sp-btn--primary" onClick={handleNext} style={{ marginLeft: 'auto' }}>
          Continue to evidence
        </button>
      </div>
    </SubmitProjectLayout>
  )
}