/**
 * Snackbar notifications.
 *
 *   const toast = useToast()
 *   toast.success('Record added.')
 *   toast.error('Failed to save')
 *
 * Top-right stack (just below the page header), auto-dismiss (errors stay a little longer), close button,
 * announced to screen readers. Wrap the app in <ToastProvider>.
 */
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react'

type ToastKind = 'success' | 'error' | 'warning' | 'info'
interface ToastItem { id: number; kind: ToastKind; message: string }

interface ToastApi {
  success: (message: string) => void
  error:   (message: string) => void
  warning: (message: string) => void
  info:    (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const DURATION: Record<ToastKind, number> = { success: 4000, info: 4000, warning: 6000, error: 6000 }

const STYLE: Record<ToastKind, { bg: string; fg: string; accent: string; icon: React.ReactNode }> = {
  success: { bg: '#1C3A2B', fg: '#fff', accent: '#8FD19E', icon: <CheckCircle2 size={18} /> },
  error:   { bg: '#5A1A1A', fg: '#fff', accent: '#FFB3B3', icon: <XCircle size={18} /> },
  warning: { bg: '#5C3A00', fg: '#fff', accent: '#FFD27A', icon: <AlertTriangle size={18} /> },
  info:    { bg: '#1E3550', fg: '#fff', accent: '#A8C8E8', icon: <Info size={18} /> },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => setItems(list => list.filter(t => t.id !== id)), [])

  const show = useCallback((kind: ToastKind, message: string) => {
    const id = nextId.current++
    // Newest on top; keep at most four on screen.
    setItems(list => [{ id, kind, message }, ...list.slice(0, 3)])
    window.setTimeout(() => dismiss(id), DURATION[kind])
  }, [dismiss])

  const api = useMemo<ToastApi>(() => ({
    success: m => show('success', m),
    error:   m => show('error', m),
    warning: m => show('warning', m),
    info:    m => show('info', m),
  }), [show])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        style={{ position: 'fixed', right: 16, top: 84, left: 16, zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, pointerEvents: 'none' }}
      >
        {items.map(t => {
          const s = STYLE[t.kind]
          return (
            <div
              key={t.id}
              role={t.kind === 'error' ? 'alert' : 'status'}
              style={{
                pointerEvents: 'auto', width: 'min(420px, 100%)', display: 'flex', alignItems: 'flex-start', gap: 10,
                background: s.bg, color: s.fg, borderRadius: 12, padding: '12px 12px 12px 14px',
                boxShadow: '0 12px 32px rgba(17,33,33,0.28)', fontSize: 13.5, lineHeight: 1.45,
                borderLeft: `4px solid ${s.accent}`, animation: 'fe-toast-in 180ms ease-out',
              }}
            >
              <span style={{ color: s.accent, display: 'flex', marginTop: 1, flexShrink: 0 }}>{s.icon}</span>
              <span style={{ flex: 1, minWidth: 0 }}>{t.message}</span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', padding: 2, flexShrink: 0 }}
              >
                <X size={16} />
              </button>
            </div>
          )
        })}
      </div>
      <style>{'@keyframes fe-toast-in { from { opacity: 0; transform: translateX(16px) } to { opacity: 1; transform: none } }'}</style>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
