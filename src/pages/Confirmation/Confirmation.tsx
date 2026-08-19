import React, { useRef, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import './Confirmation.css'

// ── Pentagon checkmark ────────────────────────────────────────────────────────
function PentaCheck() {
  const pts = Array.from({ length: 5 }, (_, i) => {
    const a = -Math.PI / 2 + i * 2 * Math.PI / 5
    return `${(50 + 42 * Math.cos(a)).toFixed(1)},${(50 + 42 * Math.sin(a)).toFixed(1)}`
  }).join(' ')
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" aria-hidden="true">
      <polygon points={pts} fill="#EAF3DE" stroke="#2B5341" strokeWidth="2" strokeLinejoin="round" />
      <text x="50" y="62" textAnchor="middle" fontSize="32">✓</text>
    </svg>
  )
}

// ── Main Confirmation page ────────────────────────────────────────────────────
export default function Confirmation() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { user } = useAuth()

  const trees   = params.get('trees')   || '—'
  const tco2e   = params.get('tco2e')   || '—'
  const amount  = params.get('amount')  || '—'
  const project = params.get('project') || 'your project'

  // Stable invoice ID — generated once per mount
  const invoiceId   = useMemo(() => `INV-${Date.now().toString(36).toUpperCase()}`, [])
  const date        = useMemo(() => new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }), [])
  const funderName  = user?.displayName || user?.email || 'Funder'

  const pricePerTree = 120
  const treesNum     = parseInt(trees) || 0
  const sub          = treesNum * pricePerTree
  const fee          = Math.round(sub * 0.1)
  const total        = sub + fee
  const fmt          = (n: number) => `₹${n.toLocaleString('en-IN')}`

  // ── Open a proper A4 desktop invoice in a new window ─────────────────────
  function handlePrint() {
    const win = window.open('', '_blank', 'width=1200,height=750,scrollbars=yes')
    if (!win) return

    win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice ${invoiceId} — Five Elements CARM</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      background: #F5F0EC;
      color: #1a1a1a;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px 24px 60px;
    }

    /* ── Toolbar ── */
    .toolbar {
      width: 100%;
      max-width: 860px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .toolbar__title {
      font-size: 13px;
      color: #6B7280;
      font-weight: 500;
    }
    .toolbar__btns { display: flex; gap: 10px; }
    .btn {
      height: 38px;
      padding: 0 20px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      font-family: inherit;
      transition: opacity 0.15s;
    }
    .btn:hover { opacity: 0.85; }
    .btn--primary { background: #2B5341; color: #fff; }
    .btn--ghost { background: #fff; color: #2B5341; border: 1.5px solid #AACBA7; }

    /* ── Invoice paper ── */
    .invoice {
      width: 100%;
      max-width: 860px;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 8px 40px rgba(17,33,33,0.10);
      overflow: hidden;
    }

    /* ── Header band ── */
    .inv-header {
      background: #2B5341;
      padding: 36px 48px 32px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
    }
    .inv-brand { display: flex; align-items: center; gap: 14px; }
    .inv-brand__penta {
      width: 52px; height: 52px;
      background: rgba(255,255,255,0.12);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 26px;
    }
    .inv-brand__name {
      font-size: 20px;
      font-weight: 800;
      color: #fff;
      letter-spacing: -0.02em;
    }
    .inv-brand__sub {
      font-size: 12px;
      color: rgba(255,255,255,0.6);
      margin-top: 3px;
    }
    .inv-header__right { text-align: right; }
    .inv-header__label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: rgba(255,255,255,0.5);
      margin-bottom: 6px;
    }
    .inv-header__id {
      font-size: 26px;
      font-weight: 800;
      color: #fff;
      font-family: 'Courier New', monospace;
      letter-spacing: 0.02em;
    }
    .inv-header__date {
      font-size: 13px;
      color: rgba(255,255,255,0.7);
      margin-top: 6px;
    }
    .inv-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #52B788;
      color: #fff;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      margin-top: 8px;
    }

    /* ── Body ── */
    .inv-body { padding: 40px 48px; }

    /* ── Parties row ── */
    .inv-parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-bottom: 36px;
      padding-bottom: 32px;
      border-bottom: 1px solid #EAE3DA;
    }
    .inv-party__label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #9CA3AF;
      margin-bottom: 8px;
    }
    .inv-party__name {
      font-size: 16px;
      font-weight: 700;
      color: #112121;
      margin-bottom: 4px;
    }
    .inv-party__detail {
      font-size: 13px;
      color: #6B7280;
      line-height: 1.6;
    }

    /* ── Project block ── */
    .inv-project {
      background: #F5F0EC;
      border-radius: 12px;
      padding: 20px 24px;
      margin-bottom: 32px;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .inv-project__icon {
      width: 48px; height: 48px;
      background: #EAF3DE;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 24px;
      flex-shrink: 0;
    }
    .inv-project__label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #9CA3AF;
      margin-bottom: 4px;
    }
    .inv-project__name {
      font-size: 16px;
      font-weight: 700;
      color: #112121;
    }
    .inv-project__meta {
      font-size: 12px;
      color: #6B7280;
      margin-top: 3px;
    }

    /* ── Line items table ── */
    .inv-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 0;
    }
    .inv-table thead tr {
      background: #F5F0EC;
    }
    .inv-table th {
      padding: 12px 16px;
      text-align: left;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #9CA3AF;
    }
    .inv-table th:last-child { text-align: right; }
    .inv-table td {
      padding: 14px 16px;
      font-size: 14px;
      color: #374151;
      border-bottom: 1px solid #F3F4F6;
    }
    .inv-table td:last-child { text-align: right; font-family: 'Courier New', monospace; font-weight: 600; }
    .inv-table tbody tr:last-child td { border-bottom: none; }

    /* ── Totals ── */
    .inv-totals {
      border-top: 2px solid #EAE3DA;
      padding-top: 16px;
      margin-top: 4px;
    }
    .inv-totals__row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 16px;
      font-size: 13px;
      color: #6B7280;
    }
    .inv-totals__row--total {
      background: #2B5341;
      border-radius: 10px;
      margin-top: 8px;
      padding: 14px 16px;
    }
    .inv-totals__row--total span { color: #fff; font-size: 15px; font-weight: 700; }
    .inv-totals__row--total .inv-totals__amount { font-family: 'Courier New', monospace; font-size: 18px; }

    /* ── Impact strip ── */
    .inv-impact {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1px;
      background: #EAE3DA;
      border-radius: 12px;
      overflow: hidden;
      margin: 32px 0;
    }
    .inv-impact__cell {
      background: #F5F0EC;
      padding: 20px 24px;
      text-align: center;
    }
    .inv-impact__num {
      font-size: 24px;
      font-weight: 800;
      color: #2B5341;
      font-family: 'Courier New', monospace;
      display: block;
      margin-bottom: 4px;
    }
    .inv-impact__label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #9CA3AF;
    }

    /* ── Footer ── */
    .inv-footer {
      border-top: 1px solid #EAE3DA;
      padding: 24px 48px 32px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 24px;
      background: #FAFAF9;
    }
    .inv-footer__note {
      font-size: 12px;
      color: #9CA3AF;
      line-height: 1.7;
      max-width: 480px;
    }
    .inv-footer__brand {
      font-size: 11px;
      color: #AACBA7;
      font-weight: 700;
      text-align: right;
      white-space: nowrap;
    }

    /* ── Print styles ── */
    @page {
      size: A4 landscape;
      margin: 10mm 14mm;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .toolbar { display: none; }
      .invoice { box-shadow: none; border-radius: 0; max-width: 100%; }
      .inv-header { padding: 20px 36px 18px; }
      .inv-body { padding: 20px 36px; }
      .inv-footer { padding: 14px 36px 18px; }
      .inv-impact__num { font-size: 20px; }
    }
  </style>
</head>
<body>

  <!-- Toolbar -->
  <div class="toolbar">
    <span class="toolbar__title">Invoice Preview — ${invoiceId}</span>
    <div class="toolbar__btns">
      <button class="btn btn--ghost" onclick="window.close()">✕ Close</button>
      <button class="btn btn--primary" onclick="window.print()">🖨️ Print / Save PDF</button>
    </div>
  </div>

  <!-- Invoice paper -->
  <div class="invoice">

    <!-- Header band -->
    <div class="inv-header">
      <div class="inv-brand">
        <div class="inv-brand__penta">⬠</div>
        <div>
          <div class="inv-brand__name">five elements CARM</div>
          <div class="inv-brand__sub">Carbon Action &amp; Reforestation Marketplace</div>
        </div>
      </div>
      <div class="inv-header__right">
        <div class="inv-header__label">Invoice</div>
        <div class="inv-header__id">${invoiceId}</div>
        <div class="inv-header__date">${date}</div>
        <div class="inv-status-badge">✓ Payment Confirmed</div>
      </div>
    </div>

    <!-- Body -->
    <div class="inv-body">

      <!-- Parties -->
      <div class="inv-parties">
        <div>
          <div class="inv-party__label">From</div>
          <div class="inv-party__name">Five Elements CARM</div>
          <div class="inv-party__detail">
            Carbon Action &amp; Reforestation Marketplace<br/>
            carm.fiveelements.earth
          </div>
        </div>
        <div>
          <div class="inv-party__label">Billed To</div>
          <div class="inv-party__name">${funderName}</div>
          <div class="inv-party__detail">
            ${user?.email || ''}<br/>
            Individual Funder
          </div>
        </div>
      </div>

      <!-- Project -->
      <div class="inv-project">
        <div class="inv-project__icon">🌳</div>
        <div>
          <div class="inv-project__label">Funded Project</div>
          <div class="inv-project__name">${project}</div>
          <div class="inv-project__meta">🌍 Earth Element · Verified Reforestation · Gold Standard</div>
        </div>
      </div>

      <!-- Line items -->
      <table class="inv-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>Tree Funding</strong><br/>
              <span style="font-size:12px;color:#9CA3AF;">${project} — geo-tagged, ledger-verified</span>
            </td>
            <td>${treesNum} trees</td>
            <td>${fmt(pricePerTree)}</td>
            <td>${fmt(sub)}</td>
          </tr>
          <tr>
            <td>
              <strong>Platform Fee</strong><br/>
              <span style="font-size:12px;color:#9CA3AF;">Covers ledger infrastructure &amp; verification</span>
            </td>
            <td>10%</td>
            <td>—</td>
            <td>${fmt(fee)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Totals -->
      <div class="inv-totals">
        <div class="inv-totals__row">
          <span>Subtotal</span>
          <span>${fmt(sub)}</span>
        </div>
        <div class="inv-totals__row">
          <span>Platform Fee (10%)</span>
          <span>${fmt(fee)}</span>
        </div>
        <div class="inv-totals__row inv-totals__row--total">
          <span>Total Paid</span>
          <span class="inv-totals__amount">${amount || fmt(total)}</span>
        </div>
      </div>

      <!-- Impact strip -->
      <div class="inv-impact">
        <div class="inv-impact__cell">
          <span class="inv-impact__num">${trees}</span>
          <span class="inv-impact__label">Trees Funded</span>
        </div>
        <div class="inv-impact__cell">
          <span class="inv-impact__num">${tco2e}</span>
          <span class="inv-impact__label">tCO₂e Offset</span>
        </div>
        <div class="inv-impact__cell">
          <span class="inv-impact__num">${amount || fmt(total)}</span>
          <span class="inv-impact__label">Total Paid</span>
        </div>
      </div>

    </div><!-- /inv-body -->

    <!-- Footer -->
    <div class="inv-footer">
      <div class="inv-footer__note">
        This invoice confirms your funding contribution to the Five Elements CARM platform.
        A certificate and public ledger entry will be issued upon field verification.
        Evidence will be delivered as geo-tagged photos to your dashboard.
      </div>
      <div class="inv-footer__brand">
        five elements CARM<br/>
        carm.fiveelements.earth
      </div>
    </div>

  </div><!-- /invoice -->

</body>
</html>`)
    win.document.close()
  }

  return (
    <div className="conf-page">
      <div className="conf-card">
        {/* Icon */}
        <div className="conf-card__icon">
          <PentaCheck />
        </div>

        {/* Heading */}
        <div className="conf-badge">Payment confirmed</div>
        <h1 className="conf-h1">You're making an impact 🌍</h1>
        <p className="conf-sub">
          Your funding for <strong>{project}</strong> has been received.
          Verification and ledger entries follow delivery — we'll email you at each step.
        </p>

        {/* Stats strip */}
        <div className="conf-stats">
          <div className="conf-stat">
            <div className="conf-stat__num">{trees}</div>
            <div className="conf-stat__label">Trees funded</div>
          </div>
          <div className="conf-stat__divider" />
          <div className="conf-stat">
            <div className="conf-stat__num">{tco2e}</div>
            <div className="conf-stat__label">tCO₂e offset</div>
          </div>
          <div className="conf-stat__divider" />
          <div className="conf-stat">
            <div className="conf-stat__num">{amount}</div>
            <div className="conf-stat__label">Total paid</div>
          </div>
        </div>

        {/* Invoice summary card */}
        <div className="conf-invoice-summary">
          <div className="conf-invoice-summary__row">
            <span className="conf-invoice-summary__label">Invoice No.</span>
            <span className="conf-invoice-summary__val conf-invoice-summary__val--mono">{invoiceId}</span>
          </div>
          <div className="conf-invoice-summary__row">
            <span className="conf-invoice-summary__label">Date</span>
            <span className="conf-invoice-summary__val">{date}</span>
          </div>
          <div className="conf-invoice-summary__row">
            <span className="conf-invoice-summary__label">Project</span>
            <span className="conf-invoice-summary__val">{project}</span>
          </div>
          <div className="conf-invoice-summary__row">
            <span className="conf-invoice-summary__label">Trees</span>
            <span className="conf-invoice-summary__val">{trees} × {fmt(pricePerTree)}</span>
          </div>
          <div className="conf-invoice-summary__row">
            <span className="conf-invoice-summary__label">Platform fee</span>
            <span className="conf-invoice-summary__val">{fmt(fee)}</span>
          </div>
          <div className="conf-invoice-summary__row conf-invoice-summary__row--total">
            <span>Total Paid</span>
            <span className="conf-invoice-summary__val--mono">{amount || fmt(total)}</span>
          </div>
        </div>

        {/* Print invoice button */}
        <button
          type="button"
          className="conf-btn conf-btn--invoice"
          onClick={handlePrint}
        >
          🧾 View &amp; Print Invoice
        </button>

        {/* What happens next */}
        <div className="conf-next">
          <div className="conf-next__title">What happens next</div>
          <div className="conf-next__steps">
            {[
              { icon: '📋', label: 'Partner receives funding and begins delivery' },
              { icon: '📸', label: 'Field evidence captured and uploaded to vault' },
              { icon: '✅', label: 'Admin verifies evidence and creates ledger entry' },
              { icon: '🔗', label: 'Your certificate is issued with a public ledger link' },
            ].map(s => (
              <div key={s.label} className="conf-next__step">
                <span className="conf-next__step-icon">{s.icon}</span>
                <span className="conf-next__step-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div className="conf-actions">
          <button
            type="button"
            className="conf-btn conf-btn--primary"
            onClick={() => navigate('/impact')}
          >
            See my impact →
          </button>
          <button
            type="button"
            className="conf-btn conf-btn--ghost"
            onClick={() => navigate('/projects')}
          >
            Fund another project
          </button>
        </div>
      </div>
    </div>
  )
}