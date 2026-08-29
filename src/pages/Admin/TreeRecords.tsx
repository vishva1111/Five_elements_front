import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../supabaseClient'
import AdminLayout from './AdminLayout'
import './TreeRecords.css'

interface TreeRecord {
  id: string
  user_id: string
  project_id: string | null
  photo_url: string
  latitude: number
  longitude: number
  species: string
  health_status: string
  notes: string | null
  submitted_at: string
  synced: boolean
}

const HEALTH_COLORS: Record<string, string> = {
  healthy: '#22c55e',
  sick: '#f59e0b',
  dead: '#ef4444',
  unknown: '#94a3b8',
}

const HEALTH_LABELS: Record<string, string> = {
  healthy: '✅ Healthy',
  sick: '⚠️ Sick',
  dead: '❌ Dead',
  unknown: '❓ Unknown',
}

export default function TreeRecords() {
  const [records, setRecords] = useState<TreeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [stats, setStats] = useState({ total: 0, healthy: 0, sick: 0, dead: 0 })

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('tree_records')
        .select('*')
        .order('submitted_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('health_status', filter)
      }

      const { data, error: err } = await query
      if (err) throw err

      const all = data || []
      setRecords(all)
      setStats({
        total: all.length,
        healthy: all.filter(r => r.health_status === 'healthy').length,
        sick: all.filter(r => r.health_status === 'sick').length,
        dead: all.filter(r => r.health_status === 'dead').length,
      })
    } catch (err: any) {
      setError(err.message || 'Failed to load tree records')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchRecords()

    // Realtime subscription — live updates when mobile app submits
    const channel = supabase
      .channel('tree_records_admin')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'tree_records',
      }, (payload) => {
        setRecords(prev => [payload.new as TreeRecord, ...prev])
        setStats(prev => ({
          ...prev,
          total: prev.total + 1,
          healthy: payload.new.health_status === 'healthy' ? prev.healthy + 1 : prev.healthy,
          sick: payload.new.health_status === 'sick' ? prev.sick + 1 : prev.sick,
          dead: payload.new.health_status === 'dead' ? prev.dead + 1 : prev.dead,
        }))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchRecords])

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <AdminLayout title="Tree Records" subtitle="Live field captures from mobile app">
      <div className="tree-records-page">
        {/* Header */}
        <div className="tr-header">
          <div>
            <h1 className="tr-title">🌳 Tree Records</h1>
            <p className="tr-subtitle">Live field captures from mobile app — synced in real-time</p>
          </div>
          <button className="tr-refresh-btn" onClick={fetchRecords} disabled={loading}>
            {loading ? '⟳ Loading...' : '⟳ Refresh'}
          </button>
        </div>

        {/* Stats */}
        <div className="tr-stats">
          <div className="tr-stat-card tr-stat-total">
            <span className="tr-stat-num">{stats.total}</span>
            <span className="tr-stat-label">Total Trees</span>
          </div>
          <div className="tr-stat-card tr-stat-healthy">
            <span className="tr-stat-num">{stats.healthy}</span>
            <span className="tr-stat-label">✅ Healthy</span>
          </div>
          <div className="tr-stat-card tr-stat-sick">
            <span className="tr-stat-num">{stats.sick}</span>
            <span className="tr-stat-label">⚠️ Sick</span>
          </div>
          <div className="tr-stat-card tr-stat-dead">
            <span className="tr-stat-num">{stats.dead}</span>
            <span className="tr-stat-label">❌ Dead</span>
          </div>
        </div>

        {/* Filter */}
        <div className="tr-filters">
          {['all', 'healthy', 'sick', 'dead'].map(f => (
            <button
              key={f}
              className={`tr-filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : HEALTH_LABELS[f]}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="tr-error">
            ⚠️ {error}
            {error.includes('tree_records') && (
              <span> — Please create the <code>tree_records</code> table in Supabase first.</span>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && <div className="tr-loading">Loading tree records...</div>}

        {/* Empty */}
        {!loading && !error && records.length === 0 && (
          <div className="tr-empty">
            <span className="tr-empty-icon">🌱</span>
            <p>No tree records yet.</p>
            <p className="tr-empty-sub">Records will appear here in real-time when field users submit from the mobile app.</p>
          </div>
        )}

        {/* Records Grid */}
        {!loading && records.length > 0 && (
          <div className="tr-grid">
            {records.map(record => (
              <div key={record.id} className="tr-card">
                {/* Photo */}
                <div className="tr-photo-wrap" onClick={() => setSelectedPhoto(record.photo_url)}>
                  {record.photo_url ? (
                    <img src={record.photo_url} alt={record.species} className="tr-photo" />
                  ) : (
                    <div className="tr-photo-placeholder">📷</div>
                  )}
                  <div className="tr-photo-overlay">🔍 View</div>
                </div>

                {/* Info */}
                <div className="tr-card-body">
                  <div className="tr-card-top">
                    <h3 className="tr-species">{record.species}</h3>
                    <span
                      className="tr-health-badge"
                      style={{ backgroundColor: HEALTH_COLORS[record.health_status] || '#94a3b8' }}
                    >
                      {HEALTH_LABELS[record.health_status] || record.health_status}
                    </span>
                  </div>

                  {record.notes && (
                    <p className="tr-notes">"{record.notes}"</p>
                  )}

                  <div className="tr-meta">
                    <span className="tr-meta-item">
                      📍 {record.latitude.toFixed(4)}, {record.longitude.toFixed(4)}
                    </span>
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${record.latitude}&mlon=${record.longitude}&zoom=17`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tr-map-link"
                    >
                      View on Map ↗
                    </a>
                  </div>

                  {record.project_id && (
                    <div className="tr-project">
                      🌿 {record.project_id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </div>
                  )}

                  <div className="tr-date">{formatDate(record.submitted_at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Photo Modal */}
        {selectedPhoto && (
          <div className="tr-modal" onClick={() => setSelectedPhoto(null)}>
            <div className="tr-modal-inner" onClick={e => e.stopPropagation()}>
              <button className="tr-modal-close" onClick={() => setSelectedPhoto(null)}>✕</button>
              <img src={selectedPhoto} alt="Tree" className="tr-modal-img" />
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}