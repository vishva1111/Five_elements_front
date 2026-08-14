import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../../hooks/useNotifications'
import './NotificationBell.css'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const wrapRef         = useRef<HTMLDivElement>(null)
  const navigate        = useNavigate()

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleItemClick(id: string, link: string | null) {
    await markRead(id)
    setOpen(false)
    if (link) navigate(link)
  }

  return (
    <div className="nb-wrap" ref={wrapRef}>
      <button
        className="nb-btn"
        onClick={() => setOpen(o => !o)}
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
      >
        {/* Bell SVG */}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="nb-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="nb-panel">
          <div className="nb-header">
            <h4>Notifications</h4>
            {unreadCount > 0 && (
              <button className="nb-mark-all" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="nb-empty">No notifications yet</p>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                className={`nb-item${!n.read ? ' nb-unread' : ''}`}
                onClick={() => handleItemClick(n.id, n.link)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && handleItemClick(n.id, n.link)}
              >
                <span className="nb-dot" />
                <div className="nb-content">
                  <p className="nb-title">{n.title}</p>
                  <p className="nb-body">{n.body}</p>
                  <span className="nb-time">{timeAgo(n.createdAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}