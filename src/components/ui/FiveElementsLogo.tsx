import React from 'react'

// ── Brand asset — ONLY the icon PNG is used ───────────────────────────────────
// Vite bundles this PNG and gives us a hashed URL at build time.
import logoIconSrc from '../../../FiveElements Tech_final_logo_icon-01.png'

/**
 * FiveElementsLogo — single source of truth for the Five Elements Tech brand mark.
 *
 * Uses ONLY: FiveElements Tech_final_logo_icon-01.png
 *
 * variant  — 'icon'  → icon PNG only
 *            'full'  → icon PNG + "five elements CARM" text (default)
 *
 * theme    — 'dark'  → text is dark  (#112121) for light backgrounds
 *            'light' → text is white (#FFFFFF) for dark backgrounds
 *
 * size     — icon height in px (default 32). Text scales proportionally.
 */

export type LogoVariant = 'icon' | 'full'
export type LogoTheme   = 'dark' | 'light'

interface FiveElementsLogoProps {
  size?:      number
  variant?:   LogoVariant
  theme?:     LogoTheme
  className?: string
  style?:     React.CSSProperties
}

export default function FiveElementsLogo({
  size      = 32,
  variant   = 'full',
  theme     = 'light',
  className = '',
  style,
}: FiveElementsLogoProps) {

  // ── icon-only variant ───────────────────────────────────────────────────────
  if (variant === 'icon') {
    return (
      <img
        src={logoIconSrc}
        alt="Five Elements Tech"
        height={size}
        width={size}
        style={{
          display:    'block',
          height:     size,
          width:      size,
          objectFit:  'contain',
          flexShrink: 0,
          ...style,
        }}
        className={`fe-logo-icon ${className}`}
      />
    )
  }

  // ── full variant: icon PNG + wordmark text ──────────────────────────────────
  const textColor   = theme === 'light' ? '#FFFFFF' : '#112121'
  const accentColor = theme === 'light' ? '#F5C97A' : '#F09125'
  const fontSize    = Math.round(size * 0.45)
  // Icon PNG has transparent padding — render slightly larger so the star fills the space
  const iconSize    = Math.round(size * 1.2)

  return (
    <span
      className={`fe-logo-wrap ${className}`}
      style={{
        display:        'inline-flex',
        alignItems:     'center',
        gap:            Math.round(size * 0.2),
        lineHeight:     1,
        textDecoration: 'none',
        ...style,
      }}
    >
      <img
        src={logoIconSrc}
        alt=""
        aria-hidden="true"
        height={iconSize}
        width={iconSize}
        style={{
          display:    'block',
          height:     iconSize,
          width:      iconSize,
          objectFit:  'contain',
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily:    "'Inter', 'Helvetica Neue', Arial, sans-serif",
          fontSize:      fontSize,
          fontWeight:    400,
          color:         textColor,
          letterSpacing: '-0.01em',
          whiteSpace:    'nowrap',
        }}
      >
        five elements{' '}
        <strong style={{ fontWeight: 700, color: accentColor }}>
          CARM
        </strong>
      </span>
    </span>
  )
}

/**
 * FiveElementsIcon — icon PNG only, for sidebars and compact spots.
 */
export function FiveElementsIcon({
  size      = 32,
  className = '',
  style,
  theme,  // kept for API compatibility, not used (icon PNG is always colourful)
}: {
  size?:      number
  className?: string
  style?:     React.CSSProperties
  theme?:     LogoTheme
}) {
  return (
    <img
      src={logoIconSrc}
      alt="Five Elements Tech icon"
      height={size}
      width={size}
      className={`fe-logo-icon ${className}`}
      style={{
        display:    'block',
        height:     size,
        width:      size,
        objectFit:  'contain',
        flexShrink: 0,
        ...style,
      }}
    />
  )
}