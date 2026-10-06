import React, { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

export interface Photo { url: string; label?: string; date?: string | null }

/**
 * Full-size photo viewer with previous/next. Esc closes only the viewer, not
 * the pop-up underneath it; arrow keys step through the photos.
 */
export default function PhotoLightbox({ photos, start = 0, onClose }: { photos: Photo[]; start?: number; onClose: () => void }) {
  const [i, setI] = useState(start)
  const n = photos.length

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopImmediatePropagation(); e.preventDefault(); onClose() }
      else if (e.key === 'ArrowRight') setI(x => (x + 1) % n)
      else if (e.key === 'ArrowLeft') setI(x => (x - 1 + n) % n)
    }
    // Capture phase on window runs before the pop-up's own Esc handler on document.
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [n, onClose])

  if (n === 0) return null
  const p = photos[i]
  const navBtn: React.CSSProperties = {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: 22,
    border: 'none', background: 'rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(8,14,12,0.88)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <button type="button" aria-label="Close" onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 20, width: 40, height: 40, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <X size={20} />
      </button>
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: 'min(1100px, 100%)', maxHeight: '80vh', display: 'flex' }}>
        <img src={p.url} alt={p.label || 'Tree photo'} style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: 10, display: 'block' }} />
      </div>
      <div onClick={e => e.stopPropagation()} style={{ marginTop: 14, color: '#fff', fontSize: 13.5, textAlign: 'center' }}>
        <strong>{p.label || 'Photo'}</strong>
        {p.date && <span style={{ opacity: 0.75 }}> · {new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
        <span style={{ opacity: 0.6 }}> · {i + 1} / {n}</span>
        <a href={p.url} target="_blank" rel="noreferrer" style={{ color: '#9FD8AE', marginLeft: 12, fontSize: 12.5 }}>Open original ↗</a>
      </div>
      {n > 1 && (
        <>
          <button type="button" aria-label="Previous photo" style={{ ...navBtn, left: 20 }} onClick={e => { e.stopPropagation(); setI(x => (x - 1 + n) % n) }}><ChevronLeft size={24} /></button>
          <button type="button" aria-label="Next photo" style={{ ...navBtn, right: 20 }} onClick={e => { e.stopPropagation(); setI(x => (x + 1) % n) }}><ChevronRight size={24} /></button>
        </>
      )}
    </div>
  )
}
