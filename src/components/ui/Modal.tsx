import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useModalBehavior } from '../../hooks/useModalBehavior'

/** Shared pop-up shell — icon header, scrollable body, footer bar. Same look across the partner console. */
export default function Modal({ icon, title, subtitle, error, onClose, footer, children, tone = 'default', width = 560 }: {
  icon: React.ReactNode
  title: string
  subtitle?: string
  error?: string | null
  onClose: () => void
  footer: React.ReactNode
  children: React.ReactNode
  tone?: 'default' | 'danger'
  width?: number
}) {
  useModalBehavior(onClose)

  // Put the cursor in the first field so the user can start typing straight away.
  const bodyRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const first = bodyRef.current?.querySelector<HTMLElement>('input:not([type=hidden]):not([readonly]):not([disabled]), select:not([disabled]), textarea:not([disabled])')
    first?.focus()
  }, [])

  const iconBg = tone === 'danger' ? '#FBE9E9' : '#EAF3DE'
  const iconFg = tone === 'danger' ? '#A32020' : '#2B5341'
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(17,33,33,0.45)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 16 }}>
      <div
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label={title}
        style={{ width: `min(${width}px, 100%)`, maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 18, boxShadow: '0 24px 60px rgba(17,33,33,0.25)', overflow: 'hidden' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '20px 24px 16px', borderBottom: '1px solid #EEE9E1' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: iconBg, color: iconFg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1C2B22' }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12.5, color: '#7A867C', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</div>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A867C', padding: 4, borderRadius: 8, display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        <div ref={bodyRef} style={{ padding: '18px 24px', overflowY: 'auto', overflowX: 'hidden' }}>
          {error && (
            <div style={{ background: '#FEF0E3', border: '0.5px solid #F5C27A', borderRadius: 10, padding: '9px 12px', fontSize: 12.5, color: '#8B3A00', marginBottom: 14 }}>
              {error}
            </div>
          )}
          {children}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 24px', borderTop: '1px solid #EEE9E1', background: '#FAF8F4' }}>
          {footer}
        </div>
      </div>
    </div>
  )
}
