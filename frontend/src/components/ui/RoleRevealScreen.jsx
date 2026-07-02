import React, { useState, useEffect } from 'react'
import useGameStore from '../../store/gameStore'

const ROLE_CONFIG = {
  DETECTIVE: {
    color: '#3b82f6', glow: 'rgba(59,130,246,0.6)', icon: '🔍',
    title: 'DETECTIVE', subtitle: 'Uncover the Truth',
    description: 'You lead the investigation. Collect evidence, interview NPCs, and identify the criminal pair before time runs out.',
    abilities: [
      { name: 'CCTV Analysis', icon: '📹', desc: 'Review surveillance footage' },
      { name: 'Digital Recovery', icon: '💻', desc: 'Recover deleted server logs' },
      { name: 'Evidence Correlate', icon: '🔗', desc: 'Link evidence on board' },
    ],
    tip: 'Trust no one. The truth is hidden in plain sight.',
    bg: 'linear-gradient(135deg, #0a1628 0%, #1e3a5f 100%)',
  },
  INVESTIGATOR: {
    color: '#22c55e', glow: 'rgba(34,197,94,0.6)', icon: '🧩',
    title: 'INVESTIGATOR', subtitle: 'Aid the Investigation',
    description: 'Support the Detective by completing tasks, collecting evidence, and talking to witnesses across campus.',
    abilities: [
      { name: 'Witness Interview', icon: '🗣️', desc: 'Question campus NPCs' },
      { name: 'Task Completion', icon: '✅', desc: 'Complete campus tasks' },
      { name: 'Evidence Report', icon: '📝', desc: 'Submit findings to Detective' },
    ],
    tip: 'Complete your tasks. Report anything suspicious.',
    bg: 'linear-gradient(135deg, #0a1a0f 0%, #14532d 100%)',
  },
  MASTERMIND: {
    color: '#ef4444', glow: 'rgba(239,68,68,0.6)', icon: '🕵️',
    title: 'MASTERMIND', subtitle: 'Stay Hidden',
    description: 'You are the criminal mastermind. Plant false evidence, manipulate witnesses, and trigger chaos to avoid detection.',
    abilities: [
      { name: 'Plant Fake Evidence', icon: '🧪', desc: 'Place fabricated clues' },
      { name: 'Frame a Player', icon: '🎭', desc: 'Shift blame to innocents' },
      { name: 'Trigger Meeting', icon: '🔔', desc: 'Call emergency meeting' },
      { name: 'Manipulate NPC', icon: '🧠', desc: 'Change witness testimony' },
    ],
    tip: 'Your partner is revealed below. Coordinate secretly.',
    bg: 'linear-gradient(135deg, #1a0505 0%, #450a0a 100%)',
  },
  CONSPIRATOR: {
    color: '#f97316', glow: 'rgba(249,115,22,0.6)', icon: '🔪',
    title: 'CONSPIRATOR', subtitle: 'Cover Your Tracks',
    description: 'You assist the Mastermind from the shadows. Destroy evidence, create alibis, and disable security.',
    abilities: [
      { name: 'Destroy Evidence', icon: '🔥', desc: 'Eliminate incriminating clues' },
      { name: 'Secure Perimeter', icon: '🛡️', desc: 'Block Detective\'s access' },
      { name: 'Create Alibi', icon: '📋', desc: 'Generate false records' },
    ],
    tip: 'Work in silence. Do not draw attention to yourself.',
    bg: 'linear-gradient(135deg, #1a0a00 0%, #431407 100%)',
  },
}

export default function RoleRevealScreen({ onBegin }) {
  const role = useGameStore((s) => s.role)
  const partnerInfo = useGameStore((s) => s.partnerInfo)
  const difficulty = useGameStore((s) => s.difficulty)
  const [phase, setPhase] = useState('scanning') // scanning | flipping | revealed
  const [flipped, setFlipped] = useState(false)

  const config = ROLE_CONFIG[role] || ROLE_CONFIG.INVESTIGATOR

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('flipping'), 1800)
    const t2 = setTimeout(() => { setFlipped(true); setPhase('revealed') }, 2400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div className="rr-overlay" id="role-reveal-screen" style={{ '--role-color': config.color, '--role-glow': config.glow, '--role-bg': config.bg }}>
      {/* Animated background particles */}
      <div className="rr-particles">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="rr-particle" style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${3 + Math.random() * 4}s`,
          }} />
        ))}
      </div>

      {/* Scanning phase */}
      {phase === 'scanning' && (
        <div className="rr-scanning">
          <div className="rr-scan-lines" />
          <p className="rr-scan-text">SCANNING IDENTITY...</p>
          <div className="rr-scan-bar" />
        </div>
      )}

      {/* Card */}
      <div className={`rr-card-scene ${phase !== 'scanning' ? 'rr-card-scene--visible' : ''}`}>
        <div className={`rr-card ${flipped ? 'rr-card--flipped' : ''}`}>
          {/* Card Back */}
          <div className="rr-card-face rr-card-back">
            <div className="rr-card-back-pattern">
              <span className="rr-card-back-logo">✝</span>
              <p>CHRIST UNIVERSITY</p>
              <p>MYSTERY GAME</p>
            </div>
          </div>

          {/* Card Front */}
          <div className="rr-card-face rr-card-front" style={{ background: config.bg }}>
            {/* Top glow bar */}
            <div className="rr-card-top-bar" />

            {/* Header */}
            <div className="rr-card-header">
              <div className="rr-card-icon-wrap" style={{ borderColor: config.color, boxShadow: `0 0 20px ${config.glow}` }}>
                <span className="rr-icon">{config.icon}</span>
              </div>
              <div>
                <p className="rr-card-your-role">YOUR ROLE</p>
                <h2 className="rr-card-title" style={{ color: config.color, textShadow: `0 0 20px ${config.glow}` }}>
                  {config.title}
                </h2>
                <p className="rr-card-subtitle">{config.subtitle}</p>
              </div>
            </div>

            {/* Description */}
            <p className="rr-card-desc">{config.description}</p>

            {/* Abilities */}
            <div className="rr-abilities">
              <p className="rr-section-label">ABILITIES</p>
              <div className="rr-ability-grid">
                {config.abilities.map(ab => (
                  <div key={ab.name} className="rr-ability-chip" style={{ borderColor: `${config.color}44` }}>
                    <span className="rr-ability-chip-icon">{ab.icon}</span>
                    <div>
                      <p className="rr-ability-name">{ab.name}</p>
                      <p className="rr-ability-desc">{ab.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Partner (villain only) */}
            {partnerInfo?.partner_id && (
              <div className="rr-partner">
                <p className="rr-section-label">YOUR PARTNER</p>
                <div className="rr-partner-card">
                  <div className="rr-partner-avatar">
                    <span>🤝</span>
                  </div>
                  <div>
                    <p className="rr-partner-name">{partnerInfo.partner_name || 'Unknown'}</p>
                    <p className="rr-partner-role">{partnerInfo.partner_role}</p>
                  </div>
                  <p className="rr-partner-secret">SECRET</p>
                </div>
                <p className="rr-partner-warning">⚠️ Do not expose your partner in chat</p>
              </div>
            )}

            {/* Tip */}
            <div className="rr-tip">
              <span>💡</span>
              <p>{config.tip}</p>
            </div>

            {/* Meta */}
            <div className="rr-meta">
              <span className="rr-badge">{(difficulty || 'medium').toUpperCase()}</span>
              <span className="rr-badge">CHRIST UNIVERSITY</span>
            </div>
          </div>
        </div>
      </div>

      {/* Begin button */}
      {phase === 'revealed' && (
        <button
          id="begin-investigation-btn"
          className="rr-begin-btn"
          style={{ '--role-color': config.color }}
          onClick={onBegin}
        >
          <span>BEGIN INVESTIGATION</span>
          <span className="rr-begin-arrow">→</span>
        </button>
      )}
    </div>
  )
}
