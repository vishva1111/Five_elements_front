import { useState, useEffect } from 'react'
import { fetchProfiles, fetchProfile, type ProfileData } from '../services/api'
import type { Profile } from '../types'

interface ProfilesParams {
  type?: string
}

export function useProfiles(params: ProfilesParams = {}) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchProfiles(params)
      .then((data) => {
        if (!cancelled) setProfiles(data.data || [])
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || 'Failed to load profiles')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [params.type])

  return { profiles, loading, error }
}

export function useProfile(id: string) {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchProfile(id)
      .then((data) => {
        if (!cancelled) setProfile(data)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || 'Profile not found')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [id])

  return { profile, loading, error }
}