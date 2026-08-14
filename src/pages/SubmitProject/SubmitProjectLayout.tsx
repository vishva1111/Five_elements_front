import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import './SubmitProject.css'

// ── Step definitions ──────────────────────────────────────────────────────────
const STEPS = [
  { num: 1, label: 'Project details',    path: '/submit-project/details' },
  { num: 2, label: 'Executing partner',  path: '/submit-project/partner' },
  { num: 3, label: 'Add evidence',       path: '/submit-project/evidence' },
  { num: 4, label: 'Review & submit',    path: '/submit-project/review' },
]

interface SubmitProjectLayoutProps {
  children: React.ReactNode
  onSaveExit?: () => void
}

export default function SubmitProjectLayout({ children, onSaveExit }: SubmitProjectLayoutProps) {
  const { pathname } = useLocation()

  // Determine current step index
  const currentIdx = STEPS.findIndex(s => pathname.startsWith(s.path))
  const current = currentIdx >= 0 ? currentIdx : 0

  return (
    <div className="sp-shell">
      {/* Top nav */}
      <div className="sp-topnav">
        <div className="sp-topnav__brand">
          <svg width="26" height="26" viewBox="0 0 30 30" aria-hidden="true">
            <polygon
              points="15,2 27.5,10.5 22.9,24.5 7.1,24.5 2.5,10.5"
              fill="#2B5341"
            />
            <polygon
              points="15,7 22.5,12.5 19.7,21 10.3,21 7.5,12.5"
              fill="#AACBA7"
            />
          </svg>
          <span className="sp-topnav__name">Five Elements</span>
        </div>
        <div className="sp-topnav__right">
          <span className="sp-topnav__context">Adding a past project</span>
          <button
            type="button"
            className="sp-topnav__save"
            onClick={onSaveExit}
          >
            Save &amp; exit
          </button>
        </div>
      </div>

      {/* Stepper */}
      <div className="sp-stepper">
        {STEPS.map((step, idx) => {
          const done    = idx < current
          const active  = idx === current
          const future  = idx > current

          return (
            <React.Fragment key={step.num}>
              <div className={`sp-step ${active ? 'sp-step--active' : done ? 'sp-step--done' : 'sp-step--future'}`}>
                <span className="sp-step__dot">
                  {done ? '✓' : step.num}
                </span>
                <span className="sp-step__label">{step.label}</span>
              </div>
              {idx < STEPS.length - 1 && (
                <span className="sp-step__connector" />
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* Page content */}
      <div className="sp-body">
        {children}
      </div>
    </div>
  )
}