import { useState, useEffect } from 'react'
import { fetchLedgerEntries, fetchPlatformStats } from '../services/api'
import type { LedgerEntry } from '../types'

interface LedgerParams {
  search?: string
  limit?: number
  offset?: number
}

interface PlatformStats {
  treesFunded: number
  tCO2eVerified: number
  projectsActive: number
}

export function useLedger(params: LedgerParams = {}) {
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [stats, setStats]     = useState<PlatformStats>({ treesFunded: 0, tCO2eVerified: 0, projectsActive: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([
      fetchLedgerEntries(params),
      fetchPlatformStats(),
    ])
      .then(([entriesData, statsData]) => {
        if (!cancelled) {
          setEntries(entriesData.data || [])
          setStats(statsData)
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || 'Failed to load ledger')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [params.search])

  return { entries, stats, loading, error }
}