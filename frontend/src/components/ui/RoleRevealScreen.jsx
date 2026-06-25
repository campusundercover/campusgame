import React, { useState, useEffect } from 'react'
import useGameStore from '../../store/gameStore'

const ROLE_CONFIG = {
  DETECTIVE: {
    color: '#3b82f6',
    glow: 'rgba(59,130,246,0.5)',
    icon: '🔍',
    title: 'DETECTIVE',
    subtitle: 'Uncover the Truth',
    description: 'You lead the investigation. Collect evidence, interview NPCs, and identify the criminal pair before time runs out.',
    abilities: ['CCTV Analysis', 'Digital Evidence Recovery', 'Evidence Correlation'],
    tip: 'Use your unique abilities to build a case. Trust no one completely.',
  },
  INVESTIGATOR: {
    color: '#22c55e',
    glow: 'rgba(34,197,94,0.5)',
    icon: '🧩',
    title: 'INVESTIGATOR',
    subtitle: 'Aid the Investigation',
    description: 'Support the Detective by completing tasks, collecting evidence, and talking to witnesses across campus.',
    abilities: ['Witness Interviews', 'Task Completion', 'Evidence Collection'],
    tip: 'Complete your tasks and report anything suspicious to the Detective.',
  },
  MASTERMIND: {
    color: '#ef4444',
    glow: 'rgba(239,68,68,0.5)',
    icon: '🕵️',
    title: 'MASTERMIND',
    subtitle: 'Stay Hidden',
    description: 'You are the criminal. Plant false evidence, manipulate witnesses, and trigger confusion to avoid detection.',
    abilities: ['Plant Fake Evidence', 'Trigger Emergency Meeting', 'Frame Innocent Player', 'Manipulate NPC'],
    tip: 'Your partner is shown below. Communicate secretly and stay one step ahead.',
  },
  CONSPIRATOR: {
    color: '#f97316',
    glow: 'rgba(249,115,22,0.5)',
    icon: '🔪',
    title: 'CONSPIRATOR',
    subtitle: 'Cover Your Tracks',
    description: 'You assist the Mastermind. Destroy evidence, create alibis, and disable security systems.',
    abilities: ['Destroy Evidence', 'Secure Perimeter', 'Create Alibi'],
    tip: 'Work in silence. The Mastermind will give you signals. Do not draw attention.',
  },
}

export default function RoleRevealScreen({ onBegin }) {
  const role = useGameStore((s) => s.role)
  const partnerInfo = useGameStore((s) => s.partnerInfo)
  const difficulty = useGameStore((s) => s.difficulty)
  const [revealed, setRevealed] = useState(false)
  const [phase, setPhase] = useState('intro') // intro | card | ready

  const config = ROLE_CONFIG[role] || ROLE_CONFIG.INVESTIGATOR

  useEffect(() => {
    // Dramatic reveal sequence
    const t1 = setTimeout(() => setPhase('card'), 600)
    const t2 = setTimeout(() => setRevealed(true), 1200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div className="role-reveal-overlay" id="role-reveal-screen">
      {/* Background particles */}
      <div className="role-reveal-bg" style={{ '--role-glow': config.glow }} />

      <div className={`role-reveal-content ${phase}`}>
        {/* Pre-reveal */}
        {phase === 'intro' && (
          <div className="role-reveal-intro">
            <p className="reveal-pre-text">ASSIGNMENT INCOMING...</p>
          </div>
        )}

        {/* Role Card */}
        {phase !== 'intro' && (
          <>
            <div
              className={`role-card ${revealed ? 'revealed' : ''}`}
              style={{ '--role-color': config.color, '--role-glow': config.glow }}
            >
              <div className="role-card-header">
                <span className="role-card-icon">{config.icon}</span>
                <div>
                  <p className="role-card-label">YOUR ROLE</p>
                  <h2 className="role-card-title">{config.title}</h2>
                  <p className="role-card-subtitle">{config.subtitle}</p>
                </div>
              </div>

              <p className="role-card-description">{config.description}</p>

              <div className="role-card-abilities">
                <p className="role-card-section-label">ABILITIES</p>
                <ul>
                  {config.abilities.map((ab) => (
                    <li key={ab}><span className="ability-dot" />  {ab}</li>
                  ))}
                </ul>
              </div>

              {/* Villain partner info */}
              {partnerInfo && partnerInfo.partner_id && (
                <div className="role-card-partner">
                  <p className="role-card-section-label">YOUR PARTNER</p>
                  <div className="partner-info">
                    <span className="partner-icon">🤝</span>
                    <div>
                      <p className="partner-name">{partnerInfo.partner_name || 'Unknown'}</p>
                      <p className="partner-role">{partnerInfo.partner_role}</p>
                    </div>
                  </div>
                  <p className="partner-warning">⚠️ This is secret. Do not expose your partner.</p>
                </div>
              )}

              <div className="role-card-tip">
                <span className="tip-icon">💡</span>
                <p>{config.tip}</p>
              </div>

              <div className="role-card-meta">
                <span className="meta-badge">{difficulty?.toUpperCase() || 'MEDIUM'}</span>
                <span className="meta-badge">CHRIST UNIVERSITY</span>
              </div>
            </div>

            {revealed && (
              <button
                id="begin-investigation-btn"
                className="begin-btn"
                style={{ '--role-color': config.color }}
                onClick={onBegin}
              >
                BEGIN INVESTIGATION
                <span className="begin-btn-arrow">→</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
