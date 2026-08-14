import React from 'react'

/**
 * Pentagon-shaped icon container matching the Five Elements brand.
 * @param {string} emoji - emoji to display inside
 * @param {string} color - stroke/fill color
 * @param {number} size - width/height in px
 * @param {boolean} filled - filled background vs outline
 */
export default function PentagonIcon({ emoji, color = '#2D6A4F', size = 56, filled = false }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
        background: filled ? color : `${color}22`,
        border: filled ? 'none' : `2px solid ${color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.4,
        flexShrink: 0,
      }}
    >
      {emoji}
    </div>
  )
}