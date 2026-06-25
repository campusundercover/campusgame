import React, { useEffect, useRef } from 'react'
import useGameStore from '../../store/gameStore'

const ROLE_ICONS = {
  DETECTIVE: '🔍',
  INVESTIGATOR: '🧩',
  MASTERMIND: '🕵️',
  CONSPIRATOR: '🔪',
}

const ROLE_COLORS = {
  DETECTIVE: '#3b82f6',
  INVESTIGATOR: '#22c55e',
  MASTERMIND: '#ef4444',
  CONSPIRATOR: '#f97316',
}

function ConfettiCanvas({ winner }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const colors = winner === 'INVESTIGATORS'
      ? ['#22c55e', '#3b82f6', '#a3e635', '#38bdf8']
      : ['#ef4444', '#f97316', '#dc2626', '#fbbf24']

    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: -20,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 3,
      vy: Math.random() * 3 + 2,
      opacity: 1,
    }))

    let frame
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        p.opacity -= 0.004
        ctx.globalAlpha = Math.max(0, p.opacity)
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.rect(p.x, p.y, p.size, p.size * 0.6)
        ctx.fill()
        if (p.y > canvas.height) {
          p.y = -20
          p.x = Math.random() * canvas.width
          p.opacity = 1
        }
      })
      frame = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(frame)
  }, [winner])

  return <canvas ref={canvasRef} className="confetti-canvas" />
}

export default function ResultsScreen() {
  const gameResult = useGameStore((s) => s.gameResult)
  const gamePhase = useGameStore((s) => s.gamePhase)

  if (gamePhase !== 'results' || !gameResult) return null

  const {
    winner_faction,
    correct_accusation,
    mastermind_id,
    conspirator_id,
    player_stats = [],
    all_roles = {},
    player_names = {},
  } = gameResult

  const investigatorsWon = winner_faction === 'INVESTIGATORS'
  const sorted = [...player_stats].sort((a, b) => b.points_earned - a.points_earned)

  return (
    <div className="results-overlay" id="results-screen">
      <ConfettiCanvas winner={winner_faction} />

      <div className="results-panel">
        {/* Banner */}
        <div className={`results-banner ${investigatorsWon ? 'investigators-win' : 'villains-win'}`}>
          <span className="results-faction-icon">
            {investigatorsWon ? '🔍' : '🕵️'}
          </span>
          <div>
            <h2 className="results-title">
              {investigatorsWon ? 'INVESTIGATORS WIN!' : 'VILLAINS ESCAPE!'}
            </h2>
            <p className="results-subtitle">
              {correct_accusation
                ? 'The criminal pair was correctly identified.'
                : investigatorsWon
                  ? 'Time ran out but evidence was overwhelming.'
                  : 'The accusation was wrong — the criminals walk free.'}
            </p>
          </div>
        </div>

        {/* Role reveal section */}
        <div className="results-roles-section">
          <p className="results-section-label">IDENTITY REVEALED</p>
          <div className="results-roles-grid">
            {Object.entries(all_roles).map(([pid, role]) => (
              <div
                key={pid}
                className={`result-role-card ${
                  pid === mastermind_id || pid === conspirator_id ? 'villain' : 'innocent'
                }`}
                style={{ '--role-color': ROLE_COLORS[role] }}
              >
                <span className="result-role-icon">{ROLE_ICONS[role]}</span>
                <p className="result-player-name">{player_names[pid] || pid}</p>
                <p className="result-role-name">{role}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats table */}
        <div className="results-stats-section">
          <p className="results-section-label">FINAL STANDINGS</p>
          <table className="results-table" id="results-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th>Role</th>
                <th>Evidence</th>
                <th>Tasks</th>
                <th>Points</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((stat, i) => (
                <tr key={stat.player_id} className={stat.won ? 'winner-row' : ''}>
                  <td>{i + 1}</td>
                  <td>{stat.username}</td>
                  <td style={{ color: ROLE_COLORS[stat.role] }}>
                    {ROLE_ICONS[stat.role]} {stat.role}
                  </td>
                  <td>{stat.evidence_collected}</td>
                  <td>{stat.tasks_completed}</td>
                  <td><strong>{stat.points_earned}</strong></td>
                  <td className={stat.won ? 'stat-won' : 'stat-lost'}>
                    {stat.won ? '✓ Won' : '✗ Lost'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div className="results-actions">
          <button
            id="play-again-btn"
            className="results-btn primary"
            onClick={() => window.location.reload()}
          >
            🔄 Play Again
          </button>
          <button
            id="main-menu-btn"
            className="results-btn secondary"
            onClick={() => window.location.reload()}
          >
            🏠 Main Menu
          </button>
        </div>
      </div>
    </div>
  )
}
