import React, { useState } from 'react'
import BusinessLayout from './BusinessLayout'
import './BusinessToolkit.css'

/* ─── Types ─────────────────────────────────────────────────────────────── */
type LogoVariant = 'dark' | 'light'
type AssetTab    = 'social' | 'logos' | 'badges' | 'imagery'

interface SocialAsset {
  id: string
  title: string
  size: string
  platform: string
  preview: string
  tags: string[]
}

interface LogoOption {
  id: string
  label: string
  description: string
  snippet: string
  preview: string
}

interface BadgeOption {
  id: string
  label: string
  color: string
  textColor: string
  icon: string
}

/* ─── Data ───────────────────────────────────────────────────────────────── */
const SOCIAL_ASSETS: SocialAsset[] = [
  {
    id: 'sa1',
    title: 'Carbon Neutral Badge Post',
    size: '1080 × 1080',
    platform: 'Instagram / LinkedIn',
    preview: '🌿',
    tags: ['square', 'impact'],
  },
  {
    id: 'sa2',
    title: 'Emissions Reduced Story',
    size: '1080 × 1920',
    platform: 'Instagram Stories',
    preview: '📊',
    tags: ['story', 'data'],
  },
  {
    id: 'sa3',
    title: 'Project Spotlight Banner',
    size: '1200 × 628',
    platform: 'LinkedIn / Twitter',
    preview: '🌳',
    tags: ['banner', 'project'],
  },
  {
    id: 'sa4',
    title: 'Annual Impact Summary',
    size: '1080 × 1080',
    platform: 'All platforms',
    preview: '🏆',
    tags: ['annual', 'summary'],
  },
  {
    id: 'sa5',
    title: 'Net Zero Journey Post',
    size: '1080 × 1080',
    platform: 'Instagram / Facebook',
    preview: '♻️',
    tags: ['journey', 'net-zero'],
  },
  {
    id: 'sa6',
    title: 'Partner Highlight Reel',
    size: '1200 × 628',
    platform: 'LinkedIn',
    preview: '🤝',
    tags: ['partner', 'highlight'],
  },
]

const DARK_LOGOS: LogoOption[] = [
  {
    id: 'dl1',
    label: 'Pentagon logo (portrait)',
    description: 'Ideal for light backgrounds — website headers, email footers',
    snippet: `<a href="https://fiveelements.earth" target="_blank" rel="noopener">
  <img src="https://fiveelements.earth/assets/logo-dark-portrait.svg"
       alt="Five Elements CARM — Carbon Action & Reporting"
       width="160" />
</a>`,
    preview: '⬠',
  },
  {
    id: 'dl2',
    label: 'Pentagon logo (landscape)',
    description: 'Wide format — email signatures, document headers',
    snippet: `<a href="https://fiveelements.earth" target="_blank" rel="noopener">
  <img src="https://fiveelements.earth/assets/logo-dark-landscape.svg"
       alt="Five Elements CARM"
       width="220" />
</a>`,
    preview: '⬠',
  },
  {
    id: 'dl3',
    label: 'Dynamic impact badge',
    description: 'Live-updating badge showing your real-time carbon offset',
    snippet: `<a href="https://fiveelements.earth/profile/YOUR_ORG_ID" target="_blank" rel="noopener">
  <img src="https://fiveelements.earth/badge/YOUR_ORG_ID?theme=dark"
       alt="Carbon offset powered by Five Elements CARM"
       width="200" />
</a>`,
    preview: '🏅',
  },
]

const LIGHT_LOGOS: LogoOption[] = [
  {
    id: 'll1',
    label: 'Pentagon logo (portrait)',
    description: 'Ideal for dark backgrounds — dark-mode sites, dark email templates',
    snippet: `<a href="https://fiveelements.earth" target="_blank" rel="noopener">
  <img src="https://fiveelements.earth/assets/logo-light-portrait.svg"
       alt="Five Elements CARM — Carbon Action & Reporting"
       width="160" />
</a>`,
    preview: '⬠',
  },
  {
    id: 'll2',
    label: 'Pentagon logo (landscape)',
    description: 'Wide format on dark backgrounds',
    snippet: `<a href="https://fiveelements.earth" target="_blank" rel="noopener">
  <img src="https://fiveelements.earth/assets/logo-light-landscape.svg"
       alt="Five Elements CARM"
       width="220" />
</a>`,
    preview: '⬠',
  },
  {
    id: 'll3',
    label: 'Dynamic impact badge (light)',
    description: 'Live-updating badge for dark backgrounds',
    snippet: `<a href="https://fiveelements.earth/profile/YOUR_ORG_ID" target="_blank" rel="noopener">
  <img src="https://fiveelements.earth/badge/YOUR_ORG_ID?theme=light"
       alt="Carbon offset powered by Five Elements CARM"
       width="200" />
</a>`,
    preview: '🏅',
  },
]

const BADGES: BadgeOption[] = [
  { id: 'b1', label: 'Carbon Neutral',    color: '#2B5341', textColor: '#fff', icon: '🌿' },
  { id: 'b2', label: 'Net Zero Committed',color: '#1a3d2e', textColor: '#fff', icon: '♻️' },
  { id: 'b3', label: 'Verified Offset',   color: '#F09125', textColor: '#fff', icon: '✅' },
  { id: 'b4', label: 'Climate Partner',   color: '#4a7c5e', textColor: '#fff', icon: '🤝' },
  { id: 'b5', label: 'SDG Aligned',       color: '#2563eb', textColor: '#fff', icon: '🌍' },
  { id: 'b6', label: 'Scope 3 Tracked',   color: '#7c3aed', textColor: '#fff', icon: '📊' },
]

/* ─── Component ──────────────────────────────────────────────────────────── */
export default function BusinessToolkit() {
  const [activeTab, setActiveTab]       = useState<AssetTab>('social')
  const [logoVariant, setLogoVariant]   = useState<LogoVariant>('dark')
  const [copiedId, setCopiedId]         = useState<string | null>(null)
  const [copiedBadge, setCopiedBadge]   = useState<string | null>(null)

  const logos = logoVariant === 'dark' ? DARK_LOGOS : LIGHT_LOGOS

  function copySnippet(id: string, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  function copyBadgeSnippet(badge: BadgeOption) {
    const snippet = `<span style="display:inline-flex;align-items:center;gap:6px;background:${badge.color};color:${badge.textColor};padding:6px 14px;border-radius:20px;font-family:sans-serif;font-size:13px;font-weight:600;">${badge.icon} ${badge.label} · Five Elements CARM</span>`
    navigator.clipboard.writeText(snippet).then(() => {
      setCopiedBadge(badge.id)
      setTimeout(() => setCopiedBadge(null), 2000)
    })
  }

  const TABS: { key: AssetTab; label: string; icon: string }[] = [
    { key: 'social',  label: 'Social assets', icon: '📱' },
    { key: 'logos',   label: 'Dynamic logos',  icon: '⬠'  },
    { key: 'badges',  label: 'Status badges',  icon: '🏅' },
    { key: 'imagery', label: 'Project imagery',icon: '🖼️' },
  ]

  return (
    <BusinessLayout
      title="Business Toolkit"
      subtitle="Share your climate impact with ready-to-use assets"
    >
      <div className="btk-root">

        {/* ── Hero banner ── */}
        <div className="btk-hero">
          <div className="btk-hero__text">
            <h2 className="btk-hero__heading">Share your impact</h2>
            <p className="btk-hero__body">
              Our Business Toolkit is designed to help you showcase the great work you're
              supporting through Five Elements CARM. Inside, you'll find high-quality project
              imagery, ready-to-use social assets, and official Five Elements logos — all
              created to help you spread the word with confidence and ease.
            </p>
          </div>
          <div className="btk-hero__stats">
            <div className="btk-stat">
              <span className="btk-stat__num">6</span>
              <span className="btk-stat__lbl">Social templates</span>
            </div>
            <div className="btk-stat">
              <span className="btk-stat__num">6</span>
              <span className="btk-stat__lbl">Logo variants</span>
            </div>
            <div className="btk-stat">
              <span className="btk-stat__num">6</span>
              <span className="btk-stat__lbl">Status badges</span>
            </div>
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div className="btk-tabs">
          {TABS.map(t => (
            <button
              key={t.key}
              type="button"
              className={`btk-tab${activeTab === t.key ? ' btk-tab--active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              <span className="btk-tab__icon">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* ══ SOCIAL ASSETS ══════════════════════════════════════════════════ */}
        {activeTab === 'social' && (
          <div className="btk-section">
            <div className="btk-section__header">
              <h3 className="btk-section__title">Social media assets</h3>
              <p className="btk-section__desc">
                Download these ready-made templates and add your logo to share your
                climate action story across social media platforms.
              </p>
            </div>
            <div className="btk-grid">
              {SOCIAL_ASSETS.map(asset => (
                <div key={asset.id} className="btk-card">
                  <div className="btk-card__preview">
                    <span className="btk-card__emoji">{asset.preview}</span>
                    <div className="btk-card__overlay">
                      <span className="btk-card__overlay-text">ADD YOUR LOGO</span>
                    </div>
                  </div>
                  <div className="btk-card__body">
                    <div className="btk-card__title">{asset.title}</div>
                    <div className="btk-card__meta">
                      <span className="btk-card__size">{asset.size}</span>
                      <span className="btk-card__platform">{asset.platform}</span>
                    </div>
                    <div className="btk-card__tags">
                      {asset.tags.map(tag => (
                        <span key={tag} className="btk-tag">#{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="btk-card__actions">
                    <button type="button" className="btk-btn btk-btn--primary">
                      ⬇ Download
                    </button>
                    <button type="button" className="btk-btn btk-btn--ghost">
                      👁 Preview
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ DYNAMIC LOGOS ══════════════════════════════════════════════════ */}
        {activeTab === 'logos' && (
          <div className="btk-section">
            <div className="btk-section__header">
              <h3 className="btk-section__title">Dynamic logos</h3>
              <p className="btk-section__desc">
                Embed these logos directly into your company website or email footer to
                show your customers the impact you're making. Choose the logo you want
                to use and click the <strong>'Copy snippet'</strong> button — we'll add
                the code snippet to your clipboard. Then simply paste it into your
                website's code or content management system.
              </p>
            </div>

            {/* Logo variant toggle */}
            <div className="btk-logo-tabs">
              <button
                type="button"
                className={`btk-logo-tab${logoVariant === 'dark' ? ' btk-logo-tab--active' : ''}`}
                onClick={() => setLogoVariant('dark')}
              >
                Dark logos
              </button>
              <button
                type="button"
                className={`btk-logo-tab${logoVariant === 'light' ? ' btk-logo-tab--active' : ''}`}
                onClick={() => setLogoVariant('light')}
              >
                White logos
              </button>
            </div>
            <p className="btk-logo-hint">
              <em>
                {logoVariant === 'dark'
                  ? 'Dark logos are ideal for use on light backgrounds'
                  : 'White logos are ideal for use on dark backgrounds'}
              </em>
            </p>

            <div className="btk-logo-list">
              {logos.map(logo => (
                <div key={logo.id} className={`btk-logo-card${logoVariant === 'light' ? ' btk-logo-card--dark-bg' : ''}`}>
                  <div className="btk-logo-card__preview">
                    <span className="btk-logo-card__icon">{logo.preview}</span>
                    <div className="btk-logo-card__name-wrap">
                      <span className="btk-logo-card__brand">five elements</span>
                      <span className="btk-logo-card__sub">CARM</span>
                    </div>
                  </div>
                  <div className="btk-logo-card__info">
                    <div className="btk-logo-card__label">{logo.label}</div>
                    <div className="btk-logo-card__desc">{logo.description}</div>
                    <div className="btk-logo-card__snippet">
                      <code>{logo.snippet.slice(0, 80)}…</code>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`btk-btn btk-btn--primary${copiedId === logo.id ? ' btk-btn--copied' : ''}`}
                    onClick={() => copySnippet(logo.id, logo.snippet)}
                  >
                    {copiedId === logo.id ? '✓ Copied!' : '⧉ Copy snippet'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ STATUS BADGES ══════════════════════════════════════════════════ */}
        {activeTab === 'badges' && (
          <div className="btk-section">
            <div className="btk-section__header">
              <h3 className="btk-section__title">Status badges</h3>
              <p className="btk-section__desc">
                Add these verified status badges to your website, email signature, or
                marketing materials to show your commitment to climate action.
                Click <strong>'Copy HTML'</strong> to get the embed code.
              </p>
            </div>
            <div className="btk-badge-grid">
              {BADGES.map(badge => (
                <div key={badge.id} className="btk-badge-card">
                  <div className="btk-badge-card__preview">
                    <span
                      className="btk-badge-pill"
                      style={{ background: badge.color, color: badge.textColor }}
                    >
                      {badge.icon} {badge.label}
                    </span>
                    <div className="btk-badge-card__powered">
                      powered by <strong>Five Elements CARM</strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`btk-btn btk-btn--primary${copiedBadge === badge.id ? ' btk-btn--copied' : ''}`}
                    onClick={() => copyBadgeSnippet(badge)}
                  >
                    {copiedBadge === badge.id ? '✓ Copied!' : '⧉ Copy HTML'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ PROJECT IMAGERY ════════════════════════════════════════════════ */}
        {activeTab === 'imagery' && (
          <div className="btk-section">
            <div className="btk-section__header">
              <h3 className="btk-section__title">Project imagery</h3>
              <p className="btk-section__desc">
                High-quality photography from the projects you're supporting. Use these
                images in your reports, presentations, and marketing materials to bring
                your climate story to life.
              </p>
            </div>
            <div className="btk-imagery-grid">
              {[
                { emoji: '🌳', label: 'Reforestation — Gujarat',    type: 'Afforestation' },
                { emoji: '☀️', label: 'Solar — Rajasthan',          type: 'Renewable Energy' },
                { emoji: '💧', label: 'Clean Water — Maharashtra',  type: 'Water & Sanitation' },
                { emoji: '🌾', label: 'Biochar — Punjab',           type: 'Soil Carbon' },
                { emoji: '🏭', label: 'Cookstoves — Odisha',        type: 'Clean Cooking' },
                { emoji: '🌊', label: 'Mangroves — Kerala',         type: 'Blue Carbon' },
              ].map((img, i) => (
                <div key={i} className="btk-img-card">
                  <div className="btk-img-card__thumb">
                    <span className="btk-img-card__emoji">{img.emoji}</span>
                    <span className="btk-img-card__type-badge">{img.type}</span>
                  </div>
                  <div className="btk-img-card__body">
                    <div className="btk-img-card__label">{img.label}</div>
                    <div className="btk-img-card__actions">
                      <button type="button" className="btk-btn btk-btn--primary">⬇ Download</button>
                      <button type="button" className="btk-btn btk-btn--ghost">👁 Preview</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Footer tip ── */}
        <div className="btk-tip">
          <span className="btk-tip__icon">💡</span>
          <div>
            <strong>Tip:</strong> When sharing on social media, tag us{' '}
            <strong>@FiveElementsCARMIndia</strong> and use{' '}
            <strong>#CarbonAction #FiveElements #NetZero</strong> to amplify your impact story.
          </div>
        </div>

      </div>
    </BusinessLayout>
  )
}