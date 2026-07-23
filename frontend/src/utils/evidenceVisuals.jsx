import React from 'react'

export const TYPE_ICONS = {
  DIGITAL: '🔌',
  PHYSICAL: '🪪',
  TESTIMONIAL: '💬',
  FABRICATED: '⚠️',
  CCTV: '📹',
}

export const TYPE_COLORS = {
  DIGITAL: '#00BFFF',     // electric blue
  PHYSICAL: '#FFD700',    // gold
  TESTIMONIAL: '#90EE90', // light green
  FABRICATED: '#FF6B6B',  // alert red
  CCTV: '#a855f7',        // purple
}

export function ReliabilityStars({ score = 0.8 }) {
  const filled = Math.round(score * 5)
  return (
    <div className="reliability-stars" style={{ display: 'inline-flex', gap: '2px', color: '#dcd0b9' }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ color: i < filled ? '#f59e0b' : 'inherit', fontSize: '13px' }}>
          ★
        </span>
      ))}
    </div>
  )
}
