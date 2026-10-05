import { useNavigate } from 'react-router-dom'

/**
 * Returns a function that goes back to the page the user came from.
 * If there is no in-app history (page opened directly / refreshed in a new tab),
 * it goes to `fallback` instead of leaving the app.
 */
export function useGoBack(fallback: string) {
  const navigate = useNavigate()
  return () => {
    // React Router stores the position in its history stack on history.state.idx.
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate(fallback, { replace: true })
  }
}
