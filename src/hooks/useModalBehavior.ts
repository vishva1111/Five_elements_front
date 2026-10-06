import { useEffect, useRef } from 'react'

// Pop-ups opened on top of each other: Esc closes only the one on top.
const openModals: symbol[] = []

/**
 * Standard pop-up behaviour: Esc closes it and the page behind does not scroll
 * while it is open. Pass `open` for pop-ups that stay mounted.
 */
export function useModalBehavior(onClose: () => void, open = true) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!open) return
    const me = Symbol('modal')
    openModals.push(me)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openModals[openModals.length - 1] === me) closeRef.current()
    }
    document.addEventListener('keydown', onKey)

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      const i = openModals.indexOf(me)
      if (i >= 0) openModals.splice(i, 1)
      document.body.style.overflow = prevOverflow
    }
  }, [open])
}
