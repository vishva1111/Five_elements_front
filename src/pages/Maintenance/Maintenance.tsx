import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth, ROLE_HOME } from '../../contexts/AuthContext'
import './Maintenance.css'

export default function Maintenance() {
  const { signOut, user, loading } = useAuth()

  // Still loading auth — show spinner
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F0EC' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #EAE3DA', borderTopColor: '#2B5341', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // Not logged in → go to login
  if (!user) return <Navigate to="/login" replace />

  // Active user trying to access /maintenance → send to their dashboard
  if (user.status === 'active') {
    return <Navigate to={ROLE_HOME[user.role]} replace />
  }

  return (
    <div className="maintenance-wrapper">
      <div className="maintenance-card">
        {/* Logo / Icon */}
        <div className="maintenance-icon">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#2B5341" fillOpacity="0.1" />
            <path
              d="M32 16C23.163 16 16 23.163 16 32C16 40.837 23.163 48 32 48C40.837 48 48 40.837 48 32C48 23.163 40.837 16 32 16ZM32 44C25.373 44 20 38.627 20 32C20 25.373 25.373 20 32 20C38.627 20 44 25.373 44 32C44 38.627 38.627 44 32 44Z"
              fill="#2B5341"
            />
            <path d="M30 22H34V34H30V22Z" fill="#2B5341" />
            <path d="M30 38H34V42H30V38Z" fill="#2B5341" />
          </svg>
        </div>

        {/* Heading */}
        <h1 className="maintenance-title">Under Maintenance</h1>
        <p className="maintenance-subtitle">Your account is pending approval</p>

        {/* Message */}
        <div className="maintenance-message">
          <p>
            Thank you for registering with <strong>Five Elements CARM</strong>.
          </p>
          <p>
            Your account is currently under review by our team. You will receive
            an email notification once your account has been approved and you can
            access the platform.
          </p>
          <p>
            If you have any questions, please contact us at{' '}
            <a href="mailto:support@fiveelements.com">support@fiveelements.com</a>.
          </p>
        </div>

        {/* User info */}
        {user && (
          <div className="maintenance-user-info">
            <span className="maintenance-user-email">{user.email}</span>
          </div>
        )}

        {/* Sign out */}
        <button className="maintenance-signout-btn" onClick={signOut}>
          Sign Out
        </button>
      </div>
    </div>
  )
}
