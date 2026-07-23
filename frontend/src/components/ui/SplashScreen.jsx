import React, { useState, useEffect, useRef } from 'react'

/* ─────────────────────────────────────────────
   COMPONENT — SplashScreen
   Shown immediately after the LoadingScreen bar
   completes. Full-viewport, glassmorphic, zero
   scrolling. Single CTA: "Unleash the Mystery".
   ───────────────────────────────────────────── */

/* Floating dust particles — rendered via CSS animation */
function SplashParticles() {
  const particles = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: 20 + Math.random() * 75,
    size: 1.2 + Math.random() * 2.8,
    dur: 10 + Math.random() * 16,
    delay: Math.random() * 14,
    opacity: 0.12 + Math.random() * 0.4,
  }))
  return (
    <div className="spl-particles" aria-hidden="true">
      {particles.map(p => (
        <div
          key={p.id}
          className="spl-particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

/* Pulsing crest rings */
function SplashCrest() {
  return (
    <div className="spl-crest" aria-hidden="true">
      <div className="spl-ring spl-ring--far"  />
      <div className="spl-ring spl-ring--mid"  />
      <div className="spl-ring spl-ring--near" />
      <span className="spl-cross">✝</span>
    </div>
  )
}

export default function SplashScreen({ onUnleash }) {
  /* Entry: fade + rise. Exit: shrink + fade out. */
  const [phase, setPhase] = useState('entering')   // entering | idle | leaving
  const [glitchChar, setGlitchChar] = useState('')
  const btnRef = useRef(null)

  /* Trigger the CSS entry animation */
  useEffect(() => {
    const t = setTimeout(() => setPhase('idle'), 50)
    return () => clearTimeout(t)
  }, [])

  /* Subtle intermittent glitch on the subtitle */
  useEffect(() => {
    const CHARS = '█▓▒░■□▪▫◆◇'
    const tick = () => {
      setGlitchChar(CHARS[Math.floor(Math.random() * CHARS.length)])
      setTimeout(() => setGlitchChar(''), 80)
    }
    const id = setInterval(tick, 4200 + Math.random() * 2000)
    return () => clearInterval(id)
  }, [])

  const handleUnleash = () => {
    if (phase === 'leaving') return
    setPhase('leaving')
    /* Short exit animation before handing off */
    setTimeout(() => onUnleash(), 700)
  }

  return (
    <div
      className={`spl-root spl-phase--${phase}`}
      id="splash-screen"
      role="main"
    >
      {/* ── Multi-layer atmospheric background ── */}
      <div className="spl-bg-base"      aria-hidden="true" />
      <div className="spl-bg-nebula-1"  aria-hidden="true" />
      <div className="spl-bg-nebula-2"  aria-hidden="true" />
      <div className="spl-bg-grid"      aria-hidden="true" />
      <div className="spl-bg-scanlines" aria-hidden="true" />
      <div className="spl-bg-vignette"  aria-hidden="true" />
      <SplashParticles />

      {/* ── Glassmorphic centre card ── */}
      <div className="spl-card">
        <div className="spl-card-inner">

          {/* Top classification tag */}
          <div className="spl-tag-row">
            <span className="spl-tag-line" />
            <span className="spl-tag-text">
              CHRIST UNIVERSITY · CLASSIFIED OPERATION
            </span>
            <span className="spl-tag-line" />
          </div>

          {/* Crest */}
          <SplashCrest />

          {/* Main title */}
          <div className="spl-title-block">
            <h1 className="spl-title">
              <span className="spl-title-campus">CAMPUS</span>
              <span className="spl-title-game">GAME</span>
            </h1>

            {/* Ornamental rule */}
            <div className="spl-ornament">
              <span className="spl-ornament-line" />
              <span className="spl-ornament-diamond">◆</span>
              <span className="spl-ornament-line" />
            </div>

            {/* Subtitle with intermittent glitch */}
            <p className="spl-subtitle">
              THE&nbsp;CHRIST&nbsp;MYSTERY
              {glitchChar && (
                <span className="spl-glitch-char" aria-hidden="true">
                  {glitchChar}
                </span>
              )}
            </p>
          </div>

          {/* Short lore line */}
          <p className="spl-lore">
            A secret has been buried deep within the campus.<br />
            <em>Only one investigator can unearth it.</em>
          </p>

          {/* ── Primary CTA ── */}
          <button
            ref={btnRef}
            id="unleash-mystery-btn"
            className="spl-btn"
            onClick={handleUnleash}
            data-hover
            aria-label="Unleash the Mystery — begin the game"
          >
            <span className="spl-btn-glow"   aria-hidden="true" />
            <span className="spl-btn-border" aria-hidden="true" />
            <span className="spl-btn-ripple" aria-hidden="true" />
            <span className="spl-btn-label">
              Unleash&nbsp;the&nbsp;Mystery
            </span>
          </button>

          {/* Status dots */}
          <div className="spl-status-row">
            <span className="spl-status-item">
              <span className="spl-dot spl-dot--green" />
              SERVERS ONLINE
            </span>
            <span className="spl-status-sep">·</span>
            <span className="spl-status-item">
              <span className="spl-dot spl-dot--amber" />
              INVESTIGATION ACTIVE
            </span>
            <span className="spl-status-sep">·</span>
            <span className="spl-status-item">
              <span className="spl-dot spl-dot--red" />
              SUSPECTS AT LARGE
            </span>
          </div>
        </div>
      </div>

      {/* Footer bar */}
      <div className="spl-footer-bar" aria-hidden="true">
        <span>CAMPUS UNDERCOVER v2.0</span>
        <span>·</span>
        <span>Real-Time Multiplayer Mystery</span>
        <span>·</span>
        <span>WebGL · WebSockets</span>
      </div>
    </div>
  )
}
