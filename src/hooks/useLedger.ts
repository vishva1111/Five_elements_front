import { useState, useEffect, useRef } from 'react'
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

  // Debounce search so we don't re-fetch on every keystroke
  const [debouncedSearch, setDebouncedSearch] = useState(params.search || '')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setDebouncedSearch(params.search || '')
    }, 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [params.search])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([
      fetchLedgerEntries({ ...params, search: debouncedSearch }),
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
  }, [debouncedSearch])

  return { entries, stats, loading, error }
}