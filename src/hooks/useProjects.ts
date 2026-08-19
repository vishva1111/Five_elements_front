import { useState, useEffect, useCallback } from 'react'
import { fetchProjects, fetchProjectCategories, fetchProject } from '../services/api'
import type { Project, ProjectFilters } from '../types'

// ── All projects (with filters) ───────────────────────────────────────────────
export function useProjects(filters: ProjectFilters = {}) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchProjects(filters)
      setProjects(result.data || [])
    } catch (err) {
      setError((err as Error).message || 'Failed to load projects')
      setProjects([])
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(filters)]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  return { projects, loading, error, refetch: load }
}

// ── Category list ─────────────────────────────────────────────────────────────
export function useProjectCategories() {
  const [categories, setCategories] = useState<string[]>(['All'])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    fetchProjectCategories()
      .then(res => setCategories(res.categories || ['All']))
      .catch(() => setCategories(['All']))
      .finally(() => setLoading(false))
  }, [])

  return { categories, loading }
}

// ── Single project ────────────────────────────────────────────────────────────
export function useProject(slugOrId: string) {
  const [project, setProject]   = useState<Project | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    if (!slugOrId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    fetchProject(slugOrId)
      .then(p => setProject(p))
      .catch(err => setError((err as Error).message))
      .finally(() => setLoading(false))
  }, [slugOrId])

  return { project, loading, error }
}