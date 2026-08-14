import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'

export interface Notification {
  id:        string
  type:      string
  title:     string
  body:      string
  link:      string | null
  read:      boolean
  createdAt: string
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export function useNotifications(pollIntervalMs = 30_000) {
  const { session } = useAuth()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount,   setUnreadCount]   = useState(0)
  const [loading,       setLoading]       = useState(false)

  const token = session?.access_token || ''

  const fetchNotifications = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res  = await fetch(`${API}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount ?? 0)
    } catch {
      // silently ignore network errors for polling
    } finally {
      setLoading(false)
    }
  }, [token])

  // Initial fetch + polling
  useEffect(() => {
    if (!token) return
    fetchNotifications()
    const id = setInterval(fetchNotifications, pollIntervalMs)
    return () => clearInterval(id)
  }, [fetchNotifications, pollIntervalMs, token])

  const markRead = useCallback(async (id: string) => {
    if (!token) return
    await fetch(`${API}/api/notifications/${id}/read`, {
      method:  'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    })
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [token])

  const markAllRead = useCallback(async () => {
    if (!token) return
    await fetch(`${API}/api/notifications/read-all`, {
      method:  'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }, [token])

  return { notifications, unreadCount, loading, fetchNotifications, markRead, markAllRead }
}