import { useEffect, useRef } from 'react'

/**
 * Standard pop-up behaviour: Esc closes it and the page behind does not scroll
 * while it is open. Pass `open` for pop-ups that stay mounted.
 */
export function useModalBehavior(onClose: () => void, open = true) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current() }
    document.addEventListener('keydown', onKey)

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open])
}
