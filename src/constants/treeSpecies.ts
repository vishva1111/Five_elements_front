/**
 * Tree species reference — common name, scientific name, CO₂ absorbed per tree
 * per year (kg). Always loaded from the API (GET /api/partner/species); new
 * species are added with POST /api/partner/species.
 */
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { API_URL as API } from '../config/api'

export interface TreeSpecies {
  id:         string | null
  name:       string
  scientific: string
  co2PerYear: number
  isDefault?: boolean
}

export function findSpeciesIn(list: TreeSpecies[], name: string): TreeSpecies | undefined {
  const n = (name || '').trim().toLowerCase()
  return n ? list.find(s => s.name.toLowerCase() === n) : undefined
}

export function useSpecies() {
  const { session } = useAuth()
  const token = session?.access_token

  const [species, setSpecies] = useState<TreeSpecies[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/partner/species`, { headers: { Authorization: `Bearer ${token}` } })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed to load species')
      setSpecies(d.species || [])
      setError(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load species')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  /** Adds a species through the API; throws with the server's message on failure. */
  const add = useCallback(async (sp: { name: string; scientific: string; co2PerYear: number }) => {
    const res = await fetch(`${API}/api/partner/species`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
      body: JSON.stringify(sp),
    })
    const d = await res.json()
    if (!res.ok) throw new Error(d.error || 'Failed to add species')
    setSpecies(prev => [...prev, d.species].sort((a, b) => b.co2PerYear - a.co2PerYear))
    return d.species as TreeSpecies
  }, [token])

  const find = useCallback((name: string) => findSpeciesIn(species, name), [species])

  return { species, loading, error, reload: load, add, find }
}
