/**
 * PageLoading — the app's one full-page spinner.
 *
 * Was duplicated inline in ProtectedRoute's auth-loading branch; now also
 * doubles as the <Suspense> fallback for lazy-loaded routes, so a route chunk
 * still downloading looks identical to "checking who you are" — one spinner,
 * not two different loading states competing for the same moment.
 */
export default function PageLoading() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#F5F0EC',
    }}>
      <div style={{
        width: 40,
        height: 40,
        border: '3px solid #EAE3DA',
        borderTopColor: '#2B5341',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
