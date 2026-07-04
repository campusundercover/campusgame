import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stars, Float } from '@react-three/drei'
import useGameStore from '../../store/gameStore'

/* ─────────────────────────────────────────────
   EXPORTS — used by App.jsx for WebSocket setup
   ───────────────────────────────────────────── */
export const getBackendHost = () => {
  const envUrl = import.meta.env.VITE_API_URL
  if (envUrl) {
    try { return new URL(envUrl).host } catch (e) {}
  }
  return `${window.location.hostname}:8000`
}

export const getWsProtocol = () => {
  const envUrl = import.meta.env.VITE_API_URL
  if (envUrl) {
    try {
      return new URL(envUrl).protocol === 'https:' ? 'wss' : 'ws'
    } catch (e) {}
  }
  return window.location.protocol === 'https:' ? 'wss' : 'ws'
}

const API_BASE = import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:8000`

/* ─────────────────────────────────────────────
   HELPER — API
   ───────────────────────────────────────────── */
async function apiFetch(path, opts = {}, token = null) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    const detail = data.detail;
    if (typeof detail === 'string') {
      errMsg = detail;
    } else if (Array.isArray(detail)) {
      errMsg = detail.map(d => `${d.loc ? d.loc.join('.') + ': ' : ''}${d.msg}`).join(', ');
    } else if (detail && typeof detail === 'object') {
      errMsg = detail.message || JSON.stringify(detail);
    }
    throw new Error(errMsg);
  }
  return data
}

/* ─────────────────────────────────────────────
   HOOK — Ambient Web Audio synth drone
   ───────────────────────────────────────────── */
function useAmbientAudio() {
  const [muted, setMuted] = useState(true)
  const ctx = useRef(null)
  const nodes = useRef({})

  const toggle = useCallback(() => {
    if (muted) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext
        const ac = new AudioCtx()
        ctx.current = ac

        const o1 = ac.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 55
        const o2 = ac.createOscillator(); o2.type = 'triangle'; o2.frequency.value = 55.4
        const filter = ac.createBiquadFilter(); filter.type = 'lowpass'
        filter.frequency.value = 110; filter.Q.value = 3
        const gain = ac.createGain(); gain.gain.setValueAtTime(0, ac.currentTime)
        gain.gain.linearRampToValueAtTime(0.14, ac.currentTime + 1.5)

        o1.connect(filter); o2.connect(filter)
        filter.connect(gain); gain.connect(ac.destination)
        o1.start(); o2.start()
        nodes.current = { o1, o2, gain }
        setMuted(false)
      } catch {}
    } else {
      const { o1, o2, gain } = nodes.current
      if (gain && ctx.current) {
        gain.gain.linearRampToValueAtTime(0, ctx.current.currentTime + 0.4)
        setTimeout(() => {
          try { o1?.stop(); o2?.stop(); ctx.current?.close() } catch {}
          ctx.current = null; nodes.current = {}
        }, 500)
      }
      setMuted(true)
    }
  }, [muted])

  useEffect(() => () => {
    try { nodes.current.o1?.stop(); nodes.current.o2?.stop(); ctx.current?.close() } catch {}
  }, [])

  return { muted, toggle }
}

/* ─────────────────────────────────────────────
   HOOK — Scroll section reveal via IntersectionObserver
   ───────────────────────────────────────────── */
function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('cu-revealed')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.12 })

    const revealable = document.querySelectorAll('.cu-reveal')
    revealable.forEach(el => observer.observe(el))

    return () => observer.disconnect()
  }, [])
}

/* ─────────────────────────────────────────────
   COMPONENT — Custom Cursor
   ───────────────────────────────────────────── */
function CursorGlow() {
  const dotRef = useRef(null)
  const haloRef = useRef(null)
  const pos = useRef({ x: 0, y: 0 })
  const haloPos = useRef({ x: 0, y: 0 })
  const raf = useRef(null)

  useEffect(() => {
    const move = (e) => { pos.current = { x: e.clientX, y: e.clientY } }
    window.addEventListener('mousemove', move)

    const animate = () => {
      // Dot snaps instantly
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${pos.current.x - 4}px, ${pos.current.y - 4}px)`
      }
      // Halo lerps smoothly
      haloPos.current.x += (pos.current.x - haloPos.current.x) * 0.1
      haloPos.current.y += (pos.current.y - haloPos.current.y) * 0.1
      if (haloRef.current) {
        haloRef.current.style.transform = `translate(${haloPos.current.x - 40}px, ${haloPos.current.y - 40}px)`
      }
      raf.current = requestAnimationFrame(animate)
    }
    raf.current = requestAnimationFrame(animate)

    // Hover scale effect
    const grow = () => haloRef.current?.classList.add('cu-cursor-grow')
    const shrink = () => haloRef.current?.classList.remove('cu-cursor-grow')
    const interactives = document.querySelectorAll('button, a, [data-hover]')
    interactives.forEach(el => { el.addEventListener('mouseenter', grow); el.addEventListener('mouseleave', shrink) })

    return () => {
      window.removeEventListener('mousemove', move)
      cancelAnimationFrame(raf.current)
    }
  }, [])

  return (
    <>
      <div ref={dotRef} className="cu-cursor-dot" />
      <div ref={haloRef} className="cu-cursor-halo" />
    </>
  )
}

/* ─────────────────────────────────────────────
   COMPONENT — Loading Gate (cinematic intro)
   ───────────────────────────────────────────── */
const TITLE_CHARS = 'CAMPUS UNDERCOVER'.split('')

function LoadingGate({ onDone }) {
  const [phase, setPhase] = useState('typing') // typing | wiping | done
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    // After chars reveal, hold then wipe
    const t1 = setTimeout(() => setPhase('wiping'), 2400)
    const t2 = setTimeout(() => { setVisible(false); onDone() }, 3200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  if (!visible) return null

  return (
    <div className={`cu-gate ${phase === 'wiping' ? 'cu-gate-wipe' : ''}`}>
      <div className="cu-gate-grid" />
      <div className="cu-gate-scanlines" />
      <div className="cu-gate-content">
        <div className="cu-gate-crest">
          <div className="cu-gate-ring cu-gate-ring-outer" />
          <div className="cu-gate-ring cu-gate-ring-inner" />
          <span className="cu-gate-cross">✝</span>
        </div>
        <h1 className="cu-gate-title">
          {TITLE_CHARS.map((ch, i) => (
            <span
              key={i}
              className="cu-gate-char"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {ch === ' ' ? '\u00A0' : ch}
            </span>
          ))}
        </h1>
        <p className="cu-gate-sub">THE CHRIST MYSTERY</p>
        <div className="cu-gate-bar-track">
          <div className="cu-gate-bar-fill" />
        </div>
        <p className="cu-gate-label">ESTABLISHING SECURE CONNECTION...</p>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   COMPONENT — Hero R3F Scene
   Peripheral-only: all objects stay far from center
   ───────────────────────────────────────────── */

/* Slow-drifting peripheral orb — not a box, just a dim point glow */
function AmbientOrb({ position, speed, color, size = 0.18 }) {
  const ref = useRef()
  const baseY = position[1]
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    ref.current.position.y = baseY + Math.sin(t * speed + position[0]) * 0.6
    ref.current.rotation.y = t * speed * 0.4
  })
  return (
    <mesh ref={ref} position={position}>
      <icosahedronGeometry args={[size, 1]} />
      <meshBasicMaterial color={color} transparent opacity={0.18} wireframe />
    </mesh>
  )
}

/* Thin framing arc — large radius, positioned deep back, does NOT cross center */
function FramingArc({ radius, color, opacity, tilt, rotSpeed }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.z = clock.getElapsedTime() * rotSpeed
  })
  return (
    <mesh ref={ref} rotation={[tilt, 0, 0]} position={[0, 0, -20]}>
      <torusGeometry args={[radius, 0.015, 6, 100, Math.PI]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  )
}

/* Subtle background fingerprint rings — very deep z, low opacity */
function BackgroundRings() {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.z = clock.getElapsedTime() * 0.025
  })
  const rings = [5, 7, 9, 11]
  return (
    <group ref={ref} position={[0, 0, -28]}>
      {rings.map((r, i) => (
        <mesh key={i} rotation={[Math.PI / 2.2, 0, i * 0.4]}>
          <torusGeometry args={[r, 0.012, 6, 80]} />
          <meshBasicMaterial color="#4f46e5" transparent opacity={0.055 - i * 0.008} />
        </mesh>
      ))}
    </group>
  )
}

function HeroR3FScene() {
  return (
    <>
      {/* Deep starfield */}
      <Stars radius={120} depth={60} count={600} factor={2.5} saturation={0} fade speed={0.4} />

      {/* Background fingerprint — deep z, very dim */}
      <BackgroundRings />

      {/* Two thin arc frames — semi-circles far behind, low opacity */}
      <FramingArc radius={14} color="#dc2626" opacity={0.06} tilt={0.2} rotSpeed={0.02} />
      <FramingArc radius={18} color="#7c3aed" opacity={0.04} tilt={-0.15} rotSpeed={-0.015} />

      {/* Peripheral orbs — placed at screen edges, not center */}
      {/* Far left */}
      <AmbientOrb position={[-13, 2, -16]} speed={0.3} color="#dc2626" size={0.22} />
      <AmbientOrb position={[-11, -3, -18]} speed={0.2} color="#7c3aed" size={0.16} />
      <AmbientOrb position={[-14, 0, -22]} speed={0.15} color="#06b6d4" size={0.14} />
      {/* Far right */}
      <AmbientOrb position={[13, -1, -16]} speed={0.25} color="#7c3aed" size={0.2} />
      <AmbientOrb position={[11, 3, -19]} speed={0.18} color="#dc2626" size={0.15} />
      <AmbientOrb position={[15, -2, -22]} speed={0.22} color="#4f46e5" size={0.13} />
      {/* Top / bottom edges */}
      <AmbientOrb position={[2, 9, -20]} speed={0.12} color="#06b6d4" size={0.18} />
      <AmbientOrb position={[-4, -8, -20]} speed={0.16} color="#dc2626" size={0.12} />

      {/* Very dim ambient + subtle colored fill lights */}
      <ambientLight intensity={0.08} />
      <pointLight position={[-18, 8, -10]} intensity={0.6} color="#7c3aed" distance={40} />
      <pointLight position={[18, -6, -10]} intensity={0.5} color="#1e1b4b" distance={40} />
    </>
  )
}

/* ─────────────────────────────────────────────
   COMPONENT — NavBar
   ───────────────────────────────────────────── */
function NavBar({ auth, onBeginInvestigation, muted, onToggleAudio }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const el = document.getElementById('cu-scroll-root')
    if (!el) return
    const handler = () => setScrolled(el.scrollTop > 60)
    el.addEventListener('scroll', handler)
    return () => el.removeEventListener('scroll', handler)
  }, [])

  return (
    <nav className={`cu-nav ${scrolled ? 'cu-nav-scrolled' : ''}`}>
      <div className="cu-nav-logo">
        <span className="cu-nav-cross">✝</span>
        <span className="cu-nav-name">CAMPUS UNDERCOVER</span>
        <span className="cu-nav-tag">CLASSIFIED</span>
      </div>
      <div className="cu-nav-actions">
        <button className="cu-nav-audio-btn" onClick={onToggleAudio} title="Toggle ambient sound">
          {muted ? '🔈' : '🔊'}
        </button>
        {auth ? (
          <button className="cu-nav-cta" onClick={onBeginInvestigation}>
            ACCESS HQ
          </button>
        ) : (
          <button className="cu-nav-cta" onClick={onBeginInvestigation}>
            BEGIN INVESTIGATION
          </button>
        )}
      </div>
    </nav>
  )
}

/* ─────────────────────────────────────────────
   SECTION 1 — Hero
   ───────────────────────────────────────────── */
function HeroSection({ onBeginInvestigation }) {
  const spotRef = useRef(null)
  const sectionRef = useRef(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const handler = (e) => {
      const rect = section.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      if (spotRef.current) {
        spotRef.current.style.background =
          `radial-gradient(circle 600px at ${x}px ${y}px, rgba(109,40,217,0.06) 0%, transparent 65%)`
      }
    }
    section.addEventListener('mousemove', handler)
    return () => section.removeEventListener('mousemove', handler)
  }, [])

  return (
    <section ref={sectionRef} className="cu-section cu-hero">
      {/* R3F Background — peripheral objects only, never overlaps text */}
      <div className="cu-hero-canvas">
        <Canvas camera={{ position: [0, 0, 14], fov: 55 }} gl={{ antialias: true }}>
          <HeroR3FScene />
        </Canvas>
      </div>

      {/* Subtle mouse light layer */}
      <div ref={spotRef} className="cu-hero-spotlight" />

      {/* Deep vignette pulls focus inward */}
      <div className="cu-hero-vignette" />

      {/* Horizontal separator lines — purely decorative, absolutely positioned */}
      <div className="cu-hero-rule cu-hero-rule-top" />
      <div className="cu-hero-rule cu-hero-rule-bot" />

      {/* ─── HERO CONTENT — strict vertical stack, no overlaps ─── */}
      <div className="cu-hero-content">

        {/* 1. Classified badge */}
        <div className="cu-hero-badge" style={{ animationDelay: '200ms' }}>
          <span className="cu-badge-dot" />
          <span className="cu-badge-text">CLASSIFIED OPERATION · CHRIST UNIVERSITY</span>
        </div>

        <h1 className="cu-hero-title">
          <span className="cu-hero-title-line cu-hero-title-white">
            CAMPUS
          </span>
          <span className="cu-hero-title-line cu-hero-title-crimson">
            UNDERCOVER
          </span>
        </h1>

        {/* 3. Subtitle */}
        <p className="cu-hero-subtitle" style={{ animationDelay: '1200ms' }}>
          T H E &nbsp;&nbsp; C H R I S T &nbsp;&nbsp; M Y S T E R Y
        </p>

        {/* 4. Divider line */}
        <div className="cu-hero-divider" />

        {/* 5. Story paragraph */}
        <p className="cu-hero-tagline" style={{ animationDelay: '1400ms' }}>
          A classified research project has disappeared from Christ University.<br />
          Every player is a suspect. Every clue matters.<br />
          Only one investigator can uncover the truth before time runs out.
        </p>

        {/* 6. CTAs */}
        <div className="cu-hero-ctas" style={{ animationDelay: '1600ms' }}>
          <button className="cu-hero-btn-primary" onClick={onBeginInvestigation} data-hover>
            <span className="cu-hero-btn-glow" />
            <span className="cu-hero-btn-shine" />
            <span className="cu-hero-btn-label">BEGIN INVESTIGATION</span>
          </button>
          <a href="#cu-incident" className="cu-hero-btn-secondary" data-hover>
            <span className="cu-hero-btn-border-anim" />
            ACCESS CLASSIFIED FILES
          </a>
        </div>

        {/* 7. Status indicators */}
        <div className="cu-hero-meta" style={{ animationDelay: '1800ms' }}>
          <span className="cu-meta-item"><span className="cu-meta-dot cu-dot-green" />SERVERS ONLINE</span>
          <span className="cu-meta-sep">·</span>
          <span className="cu-meta-item"><span className="cu-meta-dot cu-dot-amber" />INVESTIGATION ACTIVE</span>
          <span className="cu-meta-sep">·</span>
          <span className="cu-meta-item"><span className="cu-meta-dot cu-dot-red" />SUSPECTS UNIDENTIFIED</span>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="cu-hero-scroll-hint">
        <div className="cu-scroll-arrow">
          <span /><span /><span />
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   SECTION 2 — The Incident
   ───────────────────────────────────────────── */
const INCIDENT_LOGS = [
  { time: '22:41', severity: 'INFO',    text: 'Researcher Dr. Arjun Menon logged into the R&D terminal via keycard 0042.' },
  { time: '22:43', severity: 'INFO',    text: 'Standard file access recorded. Classified project directory opened.' },
  { time: '22:47', severity: 'WARNING', text: 'Anomalous write command executed. 11.4 GB research archive flagged for deletion.' },
  { time: '22:48', severity: 'ERROR',   text: 'BACKUP FAILURE — All secondary drives manually spun down before backup initiation.' },
  { time: '22:49', severity: 'ERROR',   text: 'CCTV FEED INTERRUPTED — Security corridor cameras disabled via admin override.' },
  { time: '22:51', severity: 'CRITICAL','text': 'DATABASE GONE. Project "NEXUS" research files permanently wiped from all servers.' },
  { time: '23:01', severity: 'SYSTEM',  text: 'Campus lockdown initiated. All personnel are suspects. Investigation authorized.' },
]

function IncidentSection() {
  return (
    <section id="cu-incident" className="cu-section cu-incident-section">
      <div className="cu-container">
        <div className="cu-section-header cu-reveal">
          <span className="cu-label-tag">CASE FILE #001</span>
          <h2 className="cu-section-title">THE INCIDENT</h2>
          <p className="cu-section-sub">A classified research project disappeared at 22:51. What happened inside Christ University that night is still unclear. One thing is certain — someone planned this meticulously.</p>
        </div>

        <div className="cu-incident-layout cu-reveal">
          <div className="cu-terminal">
            <div className="cu-terminal-header">
              <span className="cu-terminal-dot" style={{ background: '#ef4444' }} />
              <span className="cu-terminal-dot" style={{ background: '#f59e0b' }} />
              <span className="cu-terminal-dot" style={{ background: '#22c55e' }} />
              <span className="cu-terminal-title">SECURITY_LOG_2024.sys</span>
            </div>
            <div className="cu-terminal-body">
              {INCIDENT_LOGS.map((log, i) => (
                <div
                  key={i}
                  className="cu-log-line"
                  style={{ animationDelay: `${i * 150}ms` }}
                >
                  <span className="cu-log-time">[{log.time}]</span>
                  <span className={`cu-log-severity cu-sev-${log.severity.toLowerCase()}`}>
                    {log.severity}
                  </span>
                  <span className="cu-log-text">{log.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="cu-incident-stat-grid">
            {[
              { val: '11.4 GB', label: 'Research Deleted', color: '#ef4444' },
              { val: '7', label: 'Suspects Identified', color: '#f59e0b' },
              { val: '0', label: 'Evidence Secured', color: '#7c3aed' },
              { val: '20', label: 'Minutes Remaining', color: '#06b6d4' },
            ].map((stat, i) => (
              <div key={i} className="cu-incident-stat" data-hover>
                <span className="cu-incident-stat-val" style={{ color: stat.color }}>{stat.val}</span>
                <span className="cu-incident-stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   SECTION 3 — World Building
   ───────────────────────────────────────────── */
function WorldSection() {
  return (
    <section className="cu-section cu-world-section">
      <div className="cu-container">
        <div className="cu-world-grid">
          <div className="cu-world-left cu-reveal">
            <span className="cu-label-tag">THE UNIVERSE</span>
            <h2 className="cu-section-title">WELCOME TO<br /><span className="cu-text-red">CHRIST UNIVERSITY</span></h2>
            <p className="cu-body-text">
              Deep inside Christ University's research wing, a secret project codenamed <strong>NEXUS</strong> was nearing completion. A breakthrough in digital forensics technology that would have changed everything.
            </p>
            <p className="cu-body-text">
              Now it is gone. The researchers are missing. The campus is locked down. And somewhere inside the student body, a <span className="cu-text-red">Mastermind</span> is hiding in plain sight — watching you investigate.
            </p>
            <p className="cu-body-text">
              Every corridor you walk, every NPC you question, every piece of evidence you find could be the thread that unravels the conspiracy — or a fabricated trail leading you away from the truth.
            </p>
          </div>

          <div className="cu-world-right cu-reveal">
            {[
              { icon: '🏛️', title: 'Christ University', desc: 'A living, explorable 3D campus with 6 distinct areas, each hiding evidence and witnesses.' },
              { icon: '🔬', title: 'Project NEXUS', desc: 'The missing research. Only the detective can reconstruct what it contained from scattered data fragments.' },
              { icon: '📹', title: 'CCTV Network', desc: 'Security cameras log every movement. But the Mastermind has tampered with the footage.' },
              { icon: '🎭', title: 'Hidden Identities', desc: 'Everyone appears innocent. The roles are secret. Trust no one until the evidence speaks.' },
            ].map((item, i) => (
              <div key={i} className="cu-world-card" data-hover style={{ animationDelay: `${i * 100}ms` }}>
                <span className="cu-world-icon">{item.icon}</span>
                <div>
                  <h4 className="cu-world-card-title">{item.title}</h4>
                  <p className="cu-world-card-desc">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   SECTION 4 — Roles
   ───────────────────────────────────────────── */
const ROLES = [
  {
    key: 'DETECTIVE',
    icon: '🔍',
    color: '#06b6d4',
    title: 'THE DETECTIVE',
    subtitle: 'One per game. Publicly known.',
    desc: 'You are the only one who can formally accuse the Mastermind. Equipped with CCTV access, server log recovery, and the evidence correlation board — you must piece together the truth before time runs out.',
    stats: [
      { name: 'DEDUCTION',  val: 90 },
      { name: 'AUTHORITY',  val: 85 },
      { name: 'DECEPTION',  val: 10 },
    ],
    abilities: ['CCTV Analysis', 'Log Recovery', 'Evidence Correlation', 'Formal Accusation'],
  },
  {
    key: 'INVESTIGATOR',
    icon: '🕵️',
    color: '#22c55e',
    title: 'THE INVESTIGATOR',
    subtitle: 'Hidden identity. Works with Detective.',
    desc: 'Your role is secret. Gather physical evidence across the campus, interview NPC witnesses, and report observations to the detective — without revealing your identity to the Mastermind.',
    stats: [
      { name: 'OBSERVATION', val: 92 },
      { name: 'STEALTH',     val: 70 },
      { name: 'INFLUENCE',   val: 55 },
    ],
    abilities: ['Evidence Collection', 'NPC Interviews', 'Area Surveillance', 'Intel Reports'],
  },
  {
    key: 'MASTERMIND',
    icon: '⚡',
    color: '#ef4444',
    title: 'THE MASTERMIND',
    subtitle: 'Hidden identity. Knows the Conspirator.',
    desc: 'You orchestrated the deletion. Now cover your tracks. Plant fabricated evidence, manipulate NPC testimonies, disable CCTV cameras, and frame innocent players. The investigation must never reach you.',
    stats: [
      { name: 'DECEPTION',  val: 95 },
      { name: 'SABOTAGE',   val: 90 },
      { name: 'DEDUCTION',  val: 65 },
    ],
    abilities: ['Plant Evidence', 'NPC Manipulation', 'Camera Disabling', 'Frame Suspects'],
  },
  {
    key: 'CONSPIRATOR',
    icon: '🎭',
    color: '#f59e0b',
    title: 'THE CONSPIRATOR',
    subtitle: 'Hidden identity. Works with Mastermind.',
    desc: 'The Mastermind\'s enforcer. Destroy evidence before investigators find it, create false alibi trails, and guard the perimeter. Keep the conspiracy alive until the timer expires.',
    stats: [
      { name: 'ERASURE',  val: 88 },
      { name: 'DEFENSE',  val: 82 },
      { name: 'STEALTH',  val: 75 },
    ],
    abilities: ['Evidence Destruction', 'Alibi Creation', 'Perimeter Control', 'Trail Fabrication'],
  },
]

function RoleCard({ role, isActive, onClick }) {
  return (
    <div
      className={`cu-role-card ${isActive ? 'cu-role-card-active' : ''}`}
      style={{ '--role-color': role.color }}
      onClick={onClick}
      data-hover
    >
      <div className="cu-role-card-header">
        <span className="cu-role-icon">{role.icon}</span>
        <div>
          <h3 className="cu-role-title">{role.title}</h3>
          <p className="cu-role-subtitle">{role.subtitle}</p>
        </div>
      </div>

      <div className={`cu-role-body ${isActive ? 'cu-role-body-open' : ''}`}>
        <p className="cu-role-desc">{role.desc}</p>

        <div className="cu-role-stats">
          <p className="cu-role-stats-label">OPERATIVE METRICS</p>
          {role.stats.map((stat, i) => (
            <div key={i} className="cu-stat-row">
              <span className="cu-stat-name">{stat.name}</span>
              <span className="cu-stat-val">{stat.val}%</span>
              <div className="cu-stat-bar-track">
                <div
                  className="cu-stat-bar-fill"
                  style={{
                    width: isActive ? `${stat.val}%` : '0%',
                    background: role.color,
                    boxShadow: `0 0 8px ${role.color}80`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="cu-role-abilities">
          <p className="cu-role-stats-label">KEY ABILITIES</p>
          <div className="cu-abilities-grid">
            {role.abilities.map((ab, i) => (
              <span key={i} className="cu-ability-tag" style={{ borderColor: `${role.color}50`, color: role.color }}>
                {ab}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function RolesSection() {
  const [active, setActive] = useState(null)

  return (
    <section className="cu-section cu-roles-section">
      <div className="cu-container">
        <div className="cu-section-header cu-reveal">
          <span className="cu-label-tag">OPERATIVE PROFILES</span>
          <h2 className="cu-section-title">CHOOSE YOUR ROLE</h2>
          <p className="cu-section-sub">Four hidden identities. One investigation. Click a role to open its classified dossier.</p>
        </div>

        <div className="cu-roles-grid cu-reveal">
          {ROLES.map(role => (
            <RoleCard
              key={role.key}
              role={role}
              isActive={active === role.key}
              onClick={() => setActive(active === role.key ? null : role.key)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   SECTION 5 — Campus Blueprint
   ───────────────────────────────────────────── */
const LOCATIONS = [
  { id: 'RD',  name: 'Research Center',  x: 50, y: 20, clue: 'Source of all deleted files. Core crime scene.', evidence: 'Deleted File Metadata' },
  { id: 'CL',  name: 'Computer Lab',     x: 80, y: 45, clue: 'Network access point. Server logs stored here.', evidence: 'Login Timestamps' },
  { id: 'SO',  name: 'Security Office',  x: 20, y: 45, clue: 'CCTV hub. Cameras were disabled from here.', evidence: 'Camera Disable Log' },
  { id: 'MCA', name: 'MCA Department',   x: 50, y: 65, clue: 'Administrative archive with keycard records.', evidence: 'Keycard Access Logs' },
  { id: 'LIB', name: 'Library',          x: 15, y: 75, clue: 'Witness seen here. Personal notes dropped.', evidence: 'Witness Notes' },
  { id: 'CAF', name: 'Cafeteria',        x: 85, y: 75, clue: 'Busy common area. Multiple NPC witnesses.', evidence: 'Testimonial Intel' },
]

function CampusSection() {
  const [active, setActive] = useState(null)
  const activeData = LOCATIONS.find(l => l.id === active)

  return (
    <section className="cu-section cu-campus-section">
      <div className="cu-container">
        <div className="cu-section-header cu-reveal">
          <span className="cu-label-tag">CAMPUS BLUEPRINT</span>
          <h2 className="cu-section-title">EXPLORE THE CAMPUS</h2>
          <p className="cu-section-sub">Six investigation zones. Each holds different evidence. Hover to reveal intel. Click to lock in.</p>
        </div>

        <div className="cu-campus-layout cu-reveal">
          {/* Blueprint Map */}
          <div className="cu-blueprint">
            <div className="cu-blueprint-grid" />
            <div className="cu-blueprint-label">CHRIST UNIVERSITY · CENTRAL CAMPUS</div>
            {LOCATIONS.map(loc => (
              <button
                key={loc.id}
                className={`cu-location-node ${active === loc.id ? 'cu-node-active' : ''}`}
                style={{ left: `${loc.x}%`, top: `${loc.y}%` }}
                onMouseEnter={() => setActive(loc.id)}
                onMouseLeave={() => setActive(null)}
                data-hover
              >
                <span className="cu-node-pulse" />
                <span className="cu-node-dot" />
                <span className="cu-node-label">{loc.name}</span>
              </button>
            ))}
            {/* Connection lines when active */}
            {active && (
              <svg className="cu-blueprint-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                {LOCATIONS.filter(l => l.id !== active).map(l => {
                  const from = LOCATIONS.find(x => x.id === active)
                  return (
                    <line
                      key={l.id}
                      x1={`${from.x}%`} y1={`${from.y}%`}
                      x2={`${l.x}%`} y2={`${l.y}%`}
                      stroke="rgba(220,38,38,0.15)"
                      strokeWidth="0.3"
                      strokeDasharray="2,2"
                    />
                  )
                })}
              </svg>
            )}
          </div>

          {/* Detail Panel */}
          <div className={`cu-campus-detail ${activeData ? 'cu-campus-detail-open' : ''}`}>
            {activeData ? (
              <>
                <div className="cu-detail-tag">LOCATION INTEL</div>
                <h3 className="cu-detail-name">{activeData.name}</h3>
                <p className="cu-detail-clue">{activeData.clue}</p>
                <div className="cu-detail-evidence">
                  <span className="cu-detail-evidence-label">PRIMARY EVIDENCE TYPE</span>
                  <span className="cu-detail-evidence-val">{activeData.evidence}</span>
                </div>
              </>
            ) : (
              <div className="cu-detail-empty">
                <span className="cu-detail-empty-icon">📍</span>
                <p>Hover a location node to view investigation intel</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   SECTION 6 — Evidence Board
   ───────────────────────────────────────────── */
const EVIDENCE_CARDS = [
  { id: 'A', type: 'DIGITAL',      title: 'Server Access Log',    detail: 'Entry at 22:47 using keycard #0042 — same card as suspect.', x: 8,  y: 10 },
  { id: 'B', type: 'PHYSICAL',     title: 'Dropped Research Notes', detail: 'Found in Library corridor. Match handwriting of Dr. Menon.', x: 55, y: 8 },
  { id: 'C', type: 'TESTIMONY',    title: 'Witness Statement',     detail: '"I saw someone in a faculty jacket near the server room."', x: 30, y: 55 },
  { id: 'D', type: 'CCTV',         title: 'Camera Blind Spot',     detail: 'Camera 04 was disabled for 6 minutes. Deliberate blackout.', x: 68, y: 52 },
  { id: 'E', type: 'ANOMALY',      title: 'Timestamp Conflict',    detail: 'Keycard shows exit at 22:53 but NPC saw subject at 23:00.', x: 18, y: 78 },
]

const CONNECTIONS = [['A','C'], ['B','E'], ['C','D'], ['D','A']]

function EvidenceSection() {
  const [hovered, setHovered] = useState(null)

  const getConnected = (id) => CONNECTIONS
    .filter(([a, b]) => a === id || b === id)
    .map(([a, b]) => a === id ? b : a)

  return (
    <section className="cu-section cu-evidence-section">
      <div className="cu-container">
        <div className="cu-section-header cu-reveal">
          <span className="cu-label-tag">FORENSIC SYSTEM</span>
          <h2 className="cu-section-title">THE EVIDENCE BOARD</h2>
          <p className="cu-section-sub">Every clue is connected. Hover a card to trace the web of contradictions.</p>
        </div>

        <div className="cu-board cu-reveal">
          <div className="cu-board-texture" />
          {/* SVG connection lines */}
          <svg className="cu-board-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            {hovered && getConnected(hovered).map(targetId => {
              const from = EVIDENCE_CARDS.find(c => c.id === hovered)
              const to = EVIDENCE_CARDS.find(c => c.id === targetId)
              if (!from || !to) return null
              return (
                <line
                  key={targetId}
                  x1={`${from.x + 8}%`} y1={`${from.y + 5}%`}
                  x2={`${to.x + 8}%`} y2={`${to.y + 5}%`}
                  stroke="#dc2626"
                  strokeWidth="0.5"
                  className="cu-board-thread"
                />
              )
            })}
          </svg>

          {/* Evidence Cards */}
          {EVIDENCE_CARDS.map(card => {
            const isHovered = hovered === card.id
            const isConnected = hovered && getConnected(hovered).includes(card.id)
            return (
              <div
                key={card.id}
                className={`cu-evidence-card ${isHovered ? 'cu-ev-active' : ''} ${isConnected ? 'cu-ev-connected' : ''}`}
                style={{ left: `${card.x}%`, top: `${card.y}%` }}
                onMouseEnter={() => setHovered(card.id)}
                onMouseLeave={() => setHovered(null)}
                data-hover
              >
                <span className={`cu-ev-type-tag cu-ev-type-${card.type.toLowerCase()}`}>{card.type}</span>
                <h4 className="cu-ev-title">{card.title}</h4>
                <p className="cu-ev-detail">{card.detail}</p>
              </div>
            )
          })}

          {/* Contradiction banner */}
          {hovered && (
            <div className="cu-board-contradiction">
              ⚠️ CONTRADICTION DETECTED — Evidence {hovered} conflicts with {getConnected(hovered).join(', ')}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   SECTION 7 — NPC Witnesses
   ───────────────────────────────────────────── */
const WITNESSES = [
  { name: 'Prof. Sharma',           role: 'Faculty – Research Wing', reliability: 72, statement: '"I heard an unusual network alert at exactly 22:47. I dismissed it as a routine backup. I should not have."', redacted: true },
  { name: 'Librarian Peter',        role: 'Staff – Library Block',   reliability: 91, statement: '"A student wearing a dark jacket left the library in a hurry at 22:50. I did not recognize them, but they dropped papers near the exit."', redacted: true },
  { name: 'Security Guard Suresh',  role: 'Security – Gate 3',       reliability: 45, statement: '"The camera feed cut out for several minutes. I assumed it was a technical fault. No one entered or exited on my watch." [STATEMENT RELIABILITY FLAGGED]', redacted: true },
]

function WitnessCard({ witness, i }) {
  const [revealed, setRevealed] = useState(false)

  return (
    <div
      className="cu-witness-card cu-reveal"
      style={{ animationDelay: `${i * 120}ms` }}
      data-hover
    >
      <div className="cu-witness-header">
        <div className="cu-witness-avatar">{witness.name[0]}</div>
        <div>
          <h4 className="cu-witness-name">{witness.name}</h4>
          <p className="cu-witness-role">{witness.role}</p>
        </div>
        <div className="cu-witness-reliability">
          <span className="cu-reliability-label">RELIABILITY</span>
          <span className={`cu-reliability-val ${witness.reliability >= 80 ? 'cu-rel-high' : witness.reliability >= 60 ? 'cu-rel-mid' : 'cu-rel-low'}`}>
            {witness.reliability}%
          </span>
        </div>
      </div>
      <div className="cu-witness-statement-wrap">
        <div className={`cu-redaction ${revealed ? 'cu-redaction-revealed' : ''}`} />
        <p className="cu-witness-statement">{witness.statement}</p>
        <button className="cu-witness-reveal-btn" onClick={() => setRevealed(!revealed)} data-hover>
          {revealed ? 'RE-CLASSIFY' : 'DECLASSIFY STATEMENT'}
        </button>
      </div>
    </div>
  )
}

function NPCSection() {
  return (
    <section className="cu-section cu-npc-section">
      <div className="cu-container">
        <div className="cu-section-header cu-reveal">
          <span className="cu-label-tag">WITNESS DATABASE</span>
          <h2 className="cu-section-title">NPC WITNESSES</h2>
          <p className="cu-section-sub">Campus AI patrols record and remember everything they observe. Cross-reference their statements carefully — some have been compromised.</p>
        </div>

        <div className="cu-witnesses-grid">
          {WITNESSES.map((w, i) => <WitnessCard key={i} witness={w} i={i} />)}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   SECTION 8 — Multiplayer
   ───────────────────────────────────────────── */
function MultiplayerSection() {
  return (
    <section className="cu-section cu-multiplayer-section">
      <div className="cu-container">
        <div className="cu-multiplayer-layout">
          <div className="cu-reveal" style={{ flex: 1 }}>
            <span className="cu-label-tag">REAL-TIME SYNC</span>
            <h2 className="cu-section-title">YOU ARE NOT<br /><span className="cu-text-red">ALONE</span></h2>
            <p className="cu-body-text">
              Up to 6 players share the same campus in real-time. Every footstep, every evidence collection, every NPC interaction is synchronized instantly via WebSockets.
            </p>
            <p className="cu-body-text">
              The Mastermind can see investigators at work. Investigators can witness suspicious behavior. Nothing happens in isolation. Every action leaves a trace.
            </p>
            <div className="cu-multiplayer-stats cu-reveal">
              {[
                { val: '≤6', label: 'Players Per Lobby' },
                { val: '<50ms', label: 'Sync Latency' },
                { val: '20min', label: 'Match Duration' },
              ].map((s, i) => (
                <div key={i} className="cu-mp-stat">
                  <span className="cu-mp-stat-val">{s.val}</span>
                  <span className="cu-mp-stat-label">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="cu-multiplayer-visual cu-reveal" style={{ flex: 1 }}>
            <div className="cu-player-feed">
              <div className="cu-pf-header">LIVE CAMPUS FEED</div>
              {[
                { name: 'Detective_Alpha', area: 'Research Center', status: 'Collecting Evidence', color: '#06b6d4' },
                { name: 'Investigator_7',  area: 'Computer Lab',    status: 'Analyzing Logs',    color: '#22c55e' },
                { name: 'Unknown_X',       area: 'Security Office', status: 'Compromised',       color: '#ef4444' },
                { name: 'Agent_Kai',       area: 'Library',         status: 'Interviewing NPC',  color: '#f59e0b' },
              ].map((p, i) => (
                <div key={i} className="cu-pf-row" style={{ animationDelay: `${i * 200}ms` }}>
                  <span className="cu-pf-indicator" style={{ background: p.color }} />
                  <div className="cu-pf-info">
                    <span className="cu-pf-name" style={{ color: p.color }}>{p.name}</span>
                    <span className="cu-pf-area">{p.area} · {p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   SECTION 9 — Features Grid
   ───────────────────────────────────────────── */
const FEATURES = [
  { icon: '🌐', title: 'WebSocket Multiplayer',  desc: 'Sub-50ms real-time sync across all connected players in the same lobby.' },
  { icon: '🎭', title: 'Hidden Role System',     desc: 'Roles assigned randomly at game start. Only the Detective is revealed publicly.' },
  { icon: '📹', title: 'CCTV Analysis Engine',   desc: 'Review spatial tracking logs from the Security Office to reconstruct timelines.' },
  { icon: '📋', title: 'Dynamic Evidence',       desc: 'Evidence spawns organically across the campus with varying types and rarity.' },
  { icon: '🤖', title: 'AI NPC Patrols',         desc: 'Witness characters observe events and provide varying reliability testimonies.' },
  { icon: '🗺️', title: '3D Campus Exploration',  desc: 'Navigate a real-time WebGL campus rendered with React Three Fiber + Three.js.' },
  { icon: '🧠', title: 'Sabotage Mechanics',     desc: 'Masterminds can blind cameras, fabricate evidence, and compromise witnesses.' },
  { icon: '⚖️', title: 'Emergency Meetings',     desc: 'Trigger a 90-second campus-wide discussion to vote on accusations.' },
]

function FeaturesSection() {
  return (
    <section className="cu-section cu-features-section">
      <div className="cu-container">
        <div className="cu-section-header cu-reveal">
          <span className="cu-label-tag">INVESTIGATION TOOLKIT</span>
          <h2 className="cu-section-title">GAME FEATURES</h2>
        </div>
        <div className="cu-features-grid cu-reveal">
          {FEATURES.map((f, i) => (
            <div key={i} className="cu-feature-card" data-hover style={{ animationDelay: `${i * 80}ms` }}>
              <span className="cu-feature-icon">{f.icon}</span>
              <h4 className="cu-feature-title">{f.title}</h4>
              <p className="cu-feature-desc">{f.desc}</p>
              <div className="cu-feature-shine" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   SECTION 10 — CTA
   ───────────────────────────────────────────── */
function CTASection({ onBeginInvestigation }) {
  return (
    <section className="cu-section cu-cta-section">
      <div className="cu-cta-content cu-reveal">
        <span className="cu-label-tag">FINAL CLEARANCE</span>
        <h2 className="cu-cta-title">
          THE CAMPUS IS WAITING.<br />
          <span className="cu-text-red">ARE YOU READY?</span>
        </h2>
        <p className="cu-cta-desc">
          Decrypt the servers. Cross-examine the witnesses. Connect the contradictions.<br />
          Find the Mastermind before they destroy all remaining evidence.
        </p>
        <button className="cu-btn-primary cu-btn-large" onClick={onBeginInvestigation} data-hover>
          <span className="cu-btn-shine" />
          BEGIN INVESTIGATION
        </button>
        <p className="cu-cta-footnote">Authentication required to join a live lobby. Guest access available for solo exploration.</p>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   COMPONENT — Auth Slide Panel
   ───────────────────────────────────────────── */
function AuthPanel({ isOpen, onAuth, onClose }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const fieldStyle = {
    width: '100%', padding: '12px 16px', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 6, color: '#f1f5f9', fontSize: 14,
    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
    outline: 'none', transition: 'border-color 0.2s',
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      if (mode === 'register') {
        await apiFetch('/api/v1/auth/register', { method: 'POST', body: JSON.stringify({ username, email, password }) })
        setMode('login'); setError('Registered. Please log in.')
        setLoading(false); return
      }
      const token = await apiFetch('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ username: email, email, password }) })
      const me = await apiFetch('/api/v1/auth/me', {}, token.access_token)
      onAuth({ token: token.access_token, userId: me.id, username: me.username })
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  return (
    <>
      <div className={`cu-panel-backdrop ${isOpen ? 'cu-panel-backdrop-open' : ''}`} onClick={onClose} />
      <div className={`cu-auth-panel ${isOpen ? 'cu-auth-panel-open' : ''}`}>
        <button className="cu-panel-close" onClick={onClose}>✕ ESC</button>

        <div className="cu-auth-header">
          <div className="cu-auth-status-row">
            <span className="cu-auth-status-dot" />
            <span className="cu-auth-status-text">SECURE AUTHENTICATION LAYER</span>
          </div>
          <h2 className="cu-auth-title">DECRYPTION PORTAL</h2>
          <p className="cu-auth-sub">Identify yourself to access the investigation network.</p>
        </div>

        <div className="cu-auth-tabs">
          {['login', 'register'].map(m => (
            <button key={m} className={`cu-auth-tab ${mode === m ? 'cu-auth-tab-active' : ''}`}
              onClick={() => { setMode(m); setError('') }}>
              {m === 'login' ? 'DECIPHER' : 'ENROLL'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="cu-auth-form">
          {mode === 'register' && (
            <input style={fieldStyle} placeholder="Agent ID (Username)" value={username}
              onChange={e => setUsername(e.target.value)} required autoComplete="username" />
          )}
          <input style={fieldStyle} placeholder="Secure Email" type="email" value={email}
            onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          <input style={fieldStyle} placeholder="Access Key (Password)" type="password" value={password}
            onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />

          {error && (
            <div className={`cu-auth-msg ${error.includes('Registered') ? 'cu-auth-msg-ok' : 'cu-auth-msg-err'}`}>
              {error}
            </div>
          )}

          <button type="submit" className="cu-btn-primary" disabled={loading} data-hover>
            <span className="cu-btn-shine" />
            {loading ? 'CONNECTING...' : mode === 'login' ? 'INITIALIZE LINK' : 'CREATE AGENT FILE'}
          </button>
        </form>

        <div className="cu-auth-footer">
          <button className="cu-guest-btn" data-hover
            onClick={() => onAuth({ token: null, userId: Date.now(), username: `Guest_${Math.random().toString(36).slice(2, 6)}` })}>
            ↩ Continue as Guest (Solo Mode)
          </button>
        </div>
      </div>
    </>
  )
}

/* ─────────────────────────────────────────────
   COMPONENT — Lobby Hub
   ───────────────────────────────────────────── */
const DIFF = {
  easy:   { label: 'EASY',   icon: '🟢', color: '#22c55e', desc: 'Dense evidence, high NPC reliability.' },
  medium: { label: 'MEDIUM', icon: '🟡', color: '#f59e0b', desc: 'Standard security settings.' },
  hard:   { label: 'HARD',   icon: '🔴', color: '#ef4444', desc: 'Sparse evidence, manipulated witnesses.' },
}

function LobbyHub({ auth, onPlay, onJoinedRoom, onClose }) {
  const [tab, setTab] = useState('create')
  const [diff, setDiff] = useState('medium')
  const [maxPlayers, setMaxPlayers] = useState(6)
  const [joinCode, setJoinCode] = useState('')
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchRooms = useCallback(async () => {
    if (!auth?.token) return
    try { setRooms(await apiFetch('/api/v1/lobby/rooms', {}, auth.token)) } catch {}
  }, [auth])

  useEffect(() => { if (tab === 'browse') fetchRooms() }, [tab])

  const createRoom = async () => {
    setError(''); setLoading(true)
    try {
      const room = await apiFetch('/api/v1/lobby/create', { method: 'POST', body: JSON.stringify({ difficulty: diff, max_players: maxPlayers }) }, auth.token)
      onJoinedRoom(room)
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  const joinRoom = async (code) => {
    setError(''); setLoading(true)
    try {
      const room = await apiFetch('/api/v1/lobby/join', { method: 'POST', body: JSON.stringify({ room_code: code || joinCode }) }, auth.token)
      onJoinedRoom(room)
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  return (
    <div className="cu-modal-overlay">
      <div className="cu-modal">
        <button className="cu-panel-close cu-modal-close" onClick={onClose}>✕</button>
        <div className="cu-modal-header">
          <p className="cu-label-tag">OPERATIONS HQ</p>
          <h3 className="cu-modal-title">LOBBY CONSOLE</h3>
          {auth && <p className="cu-modal-agent">Agent: <span className="cu-text-cyan">{auth.username}</span></p>}
        </div>

        <div className="cu-modal-tabs">
          {[['create','+ CREATE'],['join','🔑 JOIN'],['browse','🌐 BROWSE']].map(([key, label]) => (
            <button key={key} className={`cu-modal-tab ${tab === key ? 'cu-modal-tab-active' : ''}`} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </div>

        {error && <div className="cu-auth-msg cu-auth-msg-err">{error}</div>}

        {tab === 'create' && (
          <div className="cu-modal-body">
            <p className="cu-modal-field-label">DIFFICULTY</p>
            <div className="cu-diff-grid">
              {Object.entries(DIFF).map(([key, d]) => (
                <button key={key} className={`cu-diff-btn ${diff === key ? 'cu-diff-active' : ''}`}
                  style={{ '--diff-color': d.color }} onClick={() => setDiff(key)}>
                  <span>{d.icon}</span><span>{d.label}</span>
                </button>
              ))}
            </div>
            <p className="cu-diff-desc">{DIFF[diff].desc}</p>
            <p className="cu-modal-field-label" style={{ marginTop: 16 }}>MAX PLAYERS — {maxPlayers}</p>
            <input type="range" min={2} max={10} value={maxPlayers} onChange={e => setMaxPlayers(+e.target.value)}
              style={{ width: '100%', accentColor: '#dc2626' }} />
            <button className="cu-btn-primary" style={{ marginTop: 20, width: '100%' }} onClick={auth?.token ? createRoom : onPlay} disabled={loading} data-hover>
              <span className="cu-btn-shine" />
              {loading ? 'INITIALIZING...' : auth?.token ? 'DEPLOY INTERFACE' : 'PLAY OFFLINE'}
            </button>
          </div>
        )}

        {tab === 'join' && (
          <div className="cu-modal-body">
            <p className="cu-modal-field-label">LOBBY CODE</p>
            <input
              value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="XXXX" maxLength={8}
              style={{ width: '100%', padding: '16px', textAlign: 'center', letterSpacing: 6, fontSize: 24, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#f1f5f9', fontFamily: 'monospace', boxSizing: 'border-box' }}
            />
            <button className="cu-btn-primary" style={{ marginTop: 16, width: '100%', opacity: joinCode.length >= 4 ? 1 : 0.4 }}
              onClick={() => auth?.token ? joinRoom(joinCode) : onPlay()} disabled={loading || joinCode.length < 4} data-hover>
              <span className="cu-btn-shine" />
              {loading ? 'CONNECTING...' : 'LINK TO LOBBY'}
            </button>
          </div>
        )}

        {tab === 'browse' && (
          <div className="cu-modal-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p className="cu-modal-field-label" style={{ margin: 0 }}>ACTIVE TERMINALS ({rooms.length})</p>
              <button onClick={fetchRooms} style={{ background: 'none', border: 'none', color: '#06b6d4', cursor: 'pointer', fontSize: 12, fontFamily: 'monospace' }}>↻ REFRESH</button>
            </div>
            {rooms.length === 0
              ? <p style={{ color: '#475569', fontFamily: 'monospace', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>No active terminals found.</p>
              : rooms.map(r => (
                <div key={r.room_code} className="cu-room-row">
                  <code className="cu-room-code">{r.room_code}</code>
                  <span className="cu-room-meta">{r.player_count}/{r.max_players} · {r.difficulty?.toUpperCase()}</span>
                  <button className="cu-room-join-btn" onClick={() => joinRoom(r.room_code)} data-hover>CONNECT</button>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   COMPONENT — Waiting Room
   ───────────────────────────────────────────── */
const PCOLORS = ['#3b82f6','#22c55e','#ec4899','#a855f7','#eab308','#f97316','#06b6d4','#ef4444']

function WaitingRoom({ auth, room: init, onGameStarted, onClose }) {
  const [room, setRoom] = useState(init)
  const wsRef = useRef(null)
  const setRoomCode = useGameStore(s => s.setRoomCode)

  const players = Array.isArray(room.players) ? room.players : Object.values(room.players || {})
  const myPlayer = players.find(p => String(p.player_id || p.id) === String(auth?.userId))
  const isHost = String(room.host_id) === String(auth?.userId)

  useEffect(() => {
    if (!auth?.token) return
    const wsUrl = `${getWsProtocol()}://${getBackendHost()}/ws/lobby/${room.room_code}/${auth.userId}?token=${encodeURIComponent(auth.token)}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws
    ws.onmessage = (e) => {
      try {
        const { type, payload } = JSON.parse(e.data)
        if (type === 'LOBBY_STATE' || type === 'LOBBY_STATE_UPDATE') setRoom(payload)
        if (type === 'ROLE_REVEAL') onGameStarted(room.room_code, auth.userId, auth.username)
      } catch {}
    }
    return () => ws.close()
  }, [auth, room.room_code, onGameStarted])

  const toggleReady = () => wsRef.current?.readyState === WebSocket.OPEN &&
    wsRef.current.send(JSON.stringify({ action: 'TOGGLE_READY' }))

  const startGame = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({ action: 'START_GAME' }))
    else onGameStarted(room.room_code, auth?.userId, auth?.username)
  }

  return (
    <div className="cu-modal-overlay">
      <div className="cu-modal">
        <button className="cu-panel-close cu-modal-close" onClick={onClose}>✕</button>
        <div className="cu-modal-header">
          <p className="cu-label-tag">TACTICAL DECK</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h3 className="cu-modal-title">TERMINAL: <span className="cu-text-cyan">{room.room_code}</span></h3>
            <button onClick={() => navigator.clipboard?.writeText(room.room_code)}
              style={{ padding: '4px 10px', border: '1px solid rgba(6,182,212,0.4)', borderRadius: 4, background: 'rgba(6,182,212,0.1)', color: '#22d3ee', fontSize: 10, cursor: 'pointer', fontFamily: 'Orbitron, sans-serif' }}>
              COPY
            </button>
          </div>
          <p className="cu-modal-agent">{room.difficulty?.toUpperCase()} · {players.length}/{room.max_players} agents online</p>
        </div>

        <div className="cu-waiting-players">
          {players.map((p, i) => (
            <div key={p.player_id || p.id || i} className="cu-waiting-player">
              <div className="cu-waiting-avatar" style={{ background: PCOLORS[i % PCOLORS.length] }}>
                {(p.username || '?')[0].toUpperCase()}
              </div>
              <span className="cu-waiting-name">
                {p.username}{String(p.player_id || p.id) === String(room.host_id) ? ' 👑' : ''}
              </span>
              <span className={`cu-waiting-status ${p.is_ready ? 'cu-ready' : ''}`}>
                {p.is_ready ? '✓ READY' : '○ STANDBY'}
              </span>
            </div>
          ))}
          {Array.from({ length: Math.max(0, (room.max_players || 4) - players.length) }).map((_, i) => (
            <div key={`e${i}`} className="cu-waiting-player cu-waiting-empty">
              <span>— Awaiting agent connection...</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button
            onClick={toggleReady}
            style={{ flex: 1, padding: 12, border: `1.5px solid ${myPlayer?.is_ready ? '#22c55e' : 'rgba(6,182,212,0.5)'}`, borderRadius: 6, background: myPlayer?.is_ready ? 'rgba(34,197,94,0.1)' : 'rgba(6,182,212,0.05)', color: myPlayer?.is_ready ? '#86efac' : '#22d3ee', fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: 12, cursor: 'pointer', letterSpacing: 1 }}
            data-hover
          >
            {myPlayer?.is_ready ? '✓ READY' : '○ SIGNAL READY'}
          </button>
          {isHost && (
            <button
              onClick={startGame}
              style={{ flex: 1, padding: 12, border: 'none', borderRadius: 6, background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: '#fff', fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: 12, cursor: 'pointer', letterSpacing: 1, boxShadow: '0 4px 15px rgba(124,58,237,0.3)' }}
              data-hover
            >
              ▶ INITIATE CASE
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   ROOT — HomeScreen
   ───────────────────────────────────────────── */
export default function HomeScreen({ onPlay }) {
  const setRoomCode  = useGameStore(s => s.setRoomCode)
  const setPlayerId  = useGameStore(s => s.setPlayerId)
  const setPlayerName = useGameStore(s => s.setPlayerName)
  const setAuthToken = useGameStore(s => s.setAuthToken)

  const [gateVisible, setGateVisible] = useState(true)
  const [flow, setFlow] = useState('landing') // landing | auth | lobby | waiting
  const [auth, setAuth] = useState(null)
  const [room, setRoom] = useState(null)

  const { muted, toggle: toggleAudio } = useAmbientAudio()
  useScrollReveal()

  // Unlock body scroll for landing page
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const root = document.getElementById('cu-scroll-root')
    if (root) root.style.overflow = 'auto'
    return () => { document.body.style.overflow = 'hidden' }
  }, [])

  const handleAuth = useCallback((authData) => {
    setAuth(authData)
    setPlayerName(authData.username)
    setPlayerId(authData.userId)
    setAuthToken(authData.token)
    if (!authData.token) { onPlay(); return }
    setFlow('lobby')
  }, [onPlay, setPlayerName, setPlayerId, setAuthToken])

  const handleBeginInvestigation = useCallback(() => {
    setFlow('auth')
  }, [])

  const handleJoinedRoom = useCallback((roomData) => {
    setRoom(roomData)
    setRoomCode(roomData.room_code)
    setFlow('waiting')
  }, [setRoomCode])

  const handleGameStarted = useCallback((roomCode, userId, username) => {
    setRoomCode(roomCode)
    setPlayerId(userId)
    setPlayerName(username)
    onPlay()
  }, [onPlay, setRoomCode, setPlayerId, setPlayerName])

  return (
    <>
      <CursorGlow />

      {gateVisible && <LoadingGate onDone={() => setGateVisible(false)} />}

      <div id="cu-scroll-root" className="cu-root">
        <NavBar
          auth={auth}
          onBeginInvestigation={handleBeginInvestigation}
          muted={muted}
          onToggleAudio={toggleAudio}
        />

        <HeroSection onBeginInvestigation={handleBeginInvestigation} />
        <IncidentSection />
        <WorldSection />
        <RolesSection />
        <CampusSection />
        <EvidenceSection />
        <NPCSection />
        <MultiplayerSection />
        <FeaturesSection />
        <CTASection onBeginInvestigation={handleBeginInvestigation} />

        <footer className="cu-footer">
          <span className="cu-footer-cross">✝</span>
          <span>CAMPUS UNDERCOVER: THE CHRIST MYSTERY</span>
          <span className="cu-footer-right">Real-Time Multiplayer Mystery · WebGL · WebSockets</span>
        </footer>
      </div>

      {/* Auth Panel */}
      <AuthPanel
        isOpen={flow === 'auth'}
        onAuth={handleAuth}
        onClose={() => setFlow('landing')}
      />

      {/* Lobby */}
      {flow === 'lobby' && (
        <LobbyHub auth={auth} onPlay={onPlay} onJoinedRoom={handleJoinedRoom} onClose={() => setFlow('landing')} />
      )}

      {/* Waiting Room */}
      {flow === 'waiting' && room && (
        <WaitingRoom auth={auth} room={room} onGameStarted={handleGameStarted} onClose={() => setFlow('lobby')} />
      )}
    </>
  )
}
