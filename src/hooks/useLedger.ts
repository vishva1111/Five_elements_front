import { useState, useEffect, useRef } from 'react'
import { fetchLedgerEntries, fetchLedgerSummary, fetchPlatformStats } from '../services/api'
import type { LedgerEntry, LedgerFilters, LedgerSummary } from '../types'

interface PlatformStats {
  treesFunded: number
  tCO2eVerified: number
  projectsActive: number
}

export function useLedger(params: LedgerFilters = {}) {
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [total, setTotal]     = useState(0)
  const [summary, setSummary] = useState<LedgerSummary | null>(null)
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

  // Platform totals don't depend on filters — fetch once
  useEffect(() => {
    let cancelled = false
    fetchPlatformStats()
      .then(s => { if (!cancelled) setStats(s) })
      .catch(() => { /* header totals are non-critical */ })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchLedgerEntries({ ...params, search: debouncedSearch })
      .then(({ data, count }) => {
        if (!cancelled) {
          setEntries(data)
          setTotal(count)
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || 'Failed to load ledger')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [debouncedSearch, params.type, params.project, params.limit, params.offset])

  // Totals for the current filters — independent of the page being viewed
  useEffect(() => {
    let cancelled = false
    setSummary(null)
    fetchLedgerSummary({ search: debouncedSearch, type: params.type, project: params.project })
      .then(s => { if (!cancelled) setSummary(s) })
      .catch(() => { /* summary strip just stays hidden */ })
    return () => { cancelled = true }
  }, [debouncedSearch, params.type, params.project])

  return { entries, total, summary, stats, loading, error, search: debouncedSearch }
}
