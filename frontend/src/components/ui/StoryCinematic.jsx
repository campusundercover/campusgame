import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'

/* ═══════════════════════════════════════════════════════════════════
   StoryCinematic.jsx
   ─────────────────
   Mandatory (skippable) narrative intro. Teaches the premise and roles
   before the player ever reaches Auth.

   Flow: Splash → [StoryCinematic] → HomeScreen (cinematic landing / Auth)

   Six cinematic acts, ~84 s total.
   Skip button always visible. Progress bar synced to elapsed time.
   Subtitles: localization-ready { start, end, text, locale } objects.
   ═══════════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────
   DATA — Acts
   ───────────────────────────────────────────── */
const ACTS = [
  {
    id: 'campus',
    start: 0,
    end: 14,
    bg: 'https://images.unsplash.com/photo-1562774053-701939374585?w=1920&q=80',
    chapterNum: '01',
    chapterTag: 'THE SETTING',
    title: 'Christ University',
    body: 'Bengaluru, Karnataka',
    accentColor: '#b8a070',
  },
  {
    id: 'nexus',
    start: 14,
    end: 28,
    bg: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1920&q=80',
    chapterNum: '02',
    chapterTag: 'THE SECRET',
    title: 'Project NEXUS',
    body: 'Classified Research Initiative',
    accentColor: '#60a5fa',
  },
  {
    id: 'incident',
    start: 28,
    end: 44,
    bg: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1920&q=80',
    chapterNum: '03',
    chapterTag: 'THE INCIDENT',
    title: '22:47 — SYSTEM BREACH',
    body: 'All data erased. All cameras dark.',
    accentColor: '#ef4444',
  },
  {
    id: 'conspiracy',
    start: 44,
    end: 58,
    bg: 'https://images.unsplash.com/photo-1453728013993-6d66e9c9123a?w=1920&q=80',
    chapterNum: '04',
    chapterTag: 'THE COVER-UP',
    title: 'The Mastermind',
    body: 'Still on campus. Still watching.',
    accentColor: '#a855f7',
  },
  {
    id: 'mission',
    start: 58,
    end: 70,
    bg: 'https://images.unsplash.com/photo-1516534775068-ba3e7458af70?w=1920&q=80',
    chapterNum: '05',
    chapterTag: 'YOUR MISSION',
    title: 'Four Roles. One Truth.',
    body: 'You have been assigned a covert identity.',
    accentColor: '#f59e0b',
  },
  {
    id: 'roles',
    start: 70,
    end: 84,
    bg: 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=1920&q=80',
    chapterNum: '06',
    chapterTag: 'OPERATIVE PROFILES',
    title: 'Choose Your Side',
    body: null, // replaced by role cards
    accentColor: '#e2e8f0',
    isRolesAct: true,
  },
]

const TOTAL_DURATION = 84 // seconds

/* ─────────────────────────────────────────────
   DATA — Subtitles (locale: 'en')
   Localization-ready: { start, end, text, locale }
   ───────────────────────────────────────────── */
const SUBTITLES = [
  // Act 1 — Campus
  { start: 0.5,  end: 5,    text: 'Christ University. A beacon of knowledge in Bengaluru.', locale: 'en' },
  { start: 5.5,  end: 10,   text: 'The finest minds gathered here to push the boundaries of discovery.', locale: 'en' },
  { start: 10.5, end: 13.5, text: 'But beneath the prestige... a secret was taking shape.', locale: 'en' },
  // Act 2 — NEXUS
  { start: 15,   end: 19.5, text: 'Project NEXUS — a classified initiative deep within the Research Wing.', locale: 'en' },
  { start: 20,   end: 24,   text: 'Years of work. Millions of data points. A breakthrough that could change everything.', locale: 'en' },
  { start: 24.5, end: 27.5, text: 'Someone decided it should never see the light of day.', locale: 'en' },
  // Act 3 — Incident
  { start: 29,   end: 33,   text: 'At 22:47, an anomalous command was executed on the network.', locale: 'en' },
  { start: 33.5, end: 38,   text: '11.4 gigabytes of classified research — permanently erased.', locale: 'en' },
  { start: 38.5, end: 43.5, text: 'Backup drives manually disabled. Security cameras blinded. This was planned.', locale: 'en' },
  // Act 4 — Conspiracy
  { start: 45,   end: 49,   text: 'The campus is on lockdown. But the perpetrator never left.', locale: 'en' },
  { start: 49.5, end: 53.5, text: 'The Mastermind still walks among you — hiding in plain sight.', locale: 'en' },
  { start: 54,   end: 57.5, text: 'Every movement is watched. Every action leaves a trace.', locale: 'en' },
  // Act 5 — Mission
  { start: 59,   end: 63,   text: 'You have been assigned a covert role. Your identity is classified.', locale: 'en' },
  { start: 63.5, end: 67.5, text: 'Work your side. Trust no one. The truth is buried in the evidence.', locale: 'en' },
  { start: 68,   end: 69.5, text: 'Uncover it — or bury it forever.', locale: 'en' },
  // Act 6 — Roles
  { start: 71,   end: 75,   text: 'Four hidden identities will shape the investigation.', locale: 'en' },
  { start: 75.5, end: 79.5, text: 'Detective. Investigator. Mastermind. Conspirator.', locale: 'en' },
  { start: 80,   end: 83.5, text: 'Only one side can win. The clock is already running.', locale: 'en' },
]

/* ─────────────────────────────────────────────
   DATA — Role Cards (for final act)
   ───────────────────────────────────────────── */
const ROLES = [
  {
    key: 'DETECTIVE',
    label: 'The Detective',
    icon: '🔍',
    color: '#06b6d4',
    glow: 'rgba(6,182,212,0.35)',
    side: 'INVESTIGATORS',
    tagline: 'One per game. Publicly known.',
    desc: 'Equipped with CCTV access, server log recovery, and the evidence board. Uncover the Mastermind before time runs out.',
  },
  {
    key: 'INVESTIGATOR',
    label: 'The Investigator',
    icon: '🕵️',
    color: '#22c55e',
    glow: 'rgba(34,197,94,0.35)',
    side: 'INVESTIGATORS',
    tagline: 'Hidden identity.',
    desc: 'Gather physical evidence, interview witnesses, and feed intelligence to the Detective — without blowing your cover.',
  },
  {
    key: 'MASTERMIND',
    label: 'The Mastermind',
    icon: '⚡',
    color: '#ef4444',
    glow: 'rgba(239,68,68,0.35)',
    side: 'CONSPIRATORS',
    tagline: 'Hidden. Ruthless.',
    desc: 'You orchestrated the deletion. Plant false evidence, manipulate witnesses, disable cameras. The investigation must never reach you.',
  },
  {
    key: 'CONSPIRATOR',
    label: 'The Conspirator',
    icon: '🎭',
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.35)',
    side: 'CONSPIRATORS',
    tagline: 'Hidden enforcer.',
    desc: 'Destroy evidence, create alibi trails, guard the perimeter. Keep the conspiracy alive until the timer expires.',
  },
]

/* ─────────────────────────────────────────────
   COMPONENT — SubtitleTrack
   ───────────────────────────────────────────── */
function SubtitleTrack({ elapsed, locale = 'en' }) {
  const activeSub = useMemo(() =>
    SUBTITLES.find(s => s.locale === locale && elapsed >= s.start && elapsed < s.end),
    [elapsed, locale]
  )

  return (
    <div className="sc-subtitle-bar">
      {activeSub && (
        <p key={activeSub.start} className="sc-subtitle-text">
          {activeSub.text}
        </p>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   COMPONENT — ProgressBar
   ───────────────────────────────────────────── */
function ProgressBar({ elapsed, acts }) {
  const pct = Math.min(100, (elapsed / TOTAL_DURATION) * 100)
  const currentActIdx = acts.findIndex(a => elapsed >= a.start && elapsed < a.end)
  const safeIdx = currentActIdx < 0 ? acts.length - 1 : currentActIdx

  return (
    <div className="sc-progress-wrap">
      {/* Step dots */}
      <div className="sc-step-dots">
        {acts.map((a, i) => (
          <div
            key={a.id}
            className={`sc-step-dot ${i <= safeIdx ? 'sc-step-dot--active' : ''}`}
            title={a.title}
          />
        ))}
      </div>
      {/* Linear bar */}
      <div className="sc-progress-track">
        <div
          className="sc-progress-fill"
          style={{ width: `${pct}%` }}
        />
        <div
          className="sc-progress-glow"
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   COMPONENT — Role Cards (final act)
   ───────────────────────────────────────────── */
function RoleCards({ elapsed, actStart }) {
  const relTime = elapsed - actStart
  return (
    <div className="sc-role-grid">
      {ROLES.map((role, i) => {
        const delay = i * 0.6
        const visible = relTime >= delay
        return (
          <div
            key={role.key}
            className={`sc-role-card ${visible ? 'sc-role-card--visible' : ''}`}
            style={{
              '--role-color': role.color,
              '--role-glow': role.glow,
              transitionDelay: `${delay}s`,
            }}
          >
            <div className="sc-role-card-top">
              <span className="sc-role-icon">{role.icon}</span>
              <div>
                <p className="sc-role-side" style={{ color: role.color }}>{role.side}</p>
                <h4 className="sc-role-name">{role.label}</h4>
                <p className="sc-role-tagline">{role.tagline}</p>
              </div>
            </div>
            <p className="sc-role-desc">{role.desc}</p>
            <div className="sc-role-accent-bar" />
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────────
   COMPONENT — Act Background (crossfade)
   ───────────────────────────────────────────── */
function ActBackground({ acts, currentActIdx }) {
  const [displayed, setDisplayed]  = useState(currentActIdx)
  const [fading,   setFading]      = useState(false)
  const prevIdx = useRef(currentActIdx)

  useEffect(() => {
    if (currentActIdx !== prevIdx.current) {
      setFading(true)
      const t = setTimeout(() => {
        setDisplayed(currentActIdx)
        prevIdx.current = currentActIdx
        setFading(false)
      }, 900)
      return () => clearTimeout(t)
    }
  }, [currentActIdx])

  const current = acts[displayed] || acts[0]
  const next    = acts[currentActIdx] || acts[0]

  return (
    <div className="sc-bg-container">
      {/* Current image */}
      <div
        className={`sc-bg-image ${fading ? 'sc-bg-image--fade' : ''}`}
        style={{ backgroundImage: `url(${current.bg})` }}
      />
      {/* Next image (preloaded underneath) */}
      {fading && (
        <div
          className="sc-bg-image sc-bg-image--next"
          style={{ backgroundImage: `url(${next.bg})` }}
        />
      )}
      {/* Overlays */}
      <div className="sc-bg-overlay-dark" />
      <div className="sc-bg-overlay-gradient" />
      <div className="sc-bg-scanlines" />
      <div className="sc-bg-vignette" />
      <div className="sc-bg-grain" />
    </div>
  )
}

/* ─────────────────────────────────────────────
   COMPONENT — Chapter Content
   ───────────────────────────────────────────── */
function ChapterContent({ act, elapsed }) {
  const relTime = elapsed - act.start
  const show = relTime >= 0.3

  return (
    <div className={`sc-chapter-content ${show ? 'sc-chapter-content--visible' : ''}`}>
      {/* Chapter number / tag */}
      <div className="sc-chapter-tag-row">
        <span className="sc-chapter-num" style={{ color: act.accentColor }}>
          {act.chapterNum}
        </span>
        <span className="sc-chapter-divider">—</span>
        <span className="sc-chapter-tag">{act.chapterTag}</span>
      </div>

      {/* Title */}
      <h2 className="sc-chapter-title" style={{ '--act-accent': act.accentColor }}>
        {act.title}
      </h2>

      {/* Body or role cards */}
      {act.isRolesAct ? (
        <RoleCards elapsed={elapsed} actStart={act.start} />
      ) : (
        act.body && (
          <p className="sc-chapter-body" style={{ color: act.accentColor }}>
            {act.body}
          </p>
        )
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   COMPONENT — Skip Button
   ───────────────────────────────────────────── */
function SkipButton({ onSkip, skipConfirm, onSkipRequest }) {
  return skipConfirm ? (
    <div className="sc-skip-confirm">
      <span className="sc-skip-confirm-text">Skip cinematic?</span>
      <button className="sc-skip-yes" onClick={onSkip}>Yes, skip</button>
      <button className="sc-skip-no"  onClick={() => onSkipRequest(false)}>Keep watching</button>
    </div>
  ) : (
    <button
      className="sc-skip-btn"
      onClick={() => onSkipRequest(true)}
      id="cinematic-skip-btn"
      aria-label="Skip cinematic"
    >
      SKIP <span className="sc-skip-arrow">⟫</span>
    </button>
  )
}

/* ─────────────────────────────────────────────
   COMPONENT — Cinematic Letterbox bars
   ───────────────────────────────────────────── */
function Letterbox() {
  return (
    <>
      <div className="sc-letterbox sc-letterbox--top" />
      <div className="sc-letterbox sc-letterbox--bottom" />
    </>
  )
}

/* ─────────────────────────────────────────────
   ROOT — StoryCinematic
   ───────────────────────────────────────────── */
export default function StoryCinematic({ onComplete }) {
  const [elapsed,      setElapsed]      = useState(0)        // seconds (float)
  const [isExiting,    setIsExiting]    = useState(false)
  const [skipConfirm,  setSkipConfirm]  = useState(false)
  const startTimeRef   = useRef(null)
  const rafRef         = useRef(null)
  const completedRef   = useRef(false)

  /* High-accuracy RAF timer */
  useEffect(() => {
    startTimeRef.current = performance.now()
    const tick = (now) => {
      const secs = (now - startTimeRef.current) / 1000
      setElapsed(secs)
      if (secs >= TOTAL_DURATION && !completedRef.current) {
        completedRef.current = true
        triggerComplete()
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, []) // eslint-disable-line

  const triggerComplete = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    setIsExiting(true)
    setTimeout(() => onComplete(), 800)
  }, [onComplete])

  const handleSkip = useCallback(() => {
    completedRef.current = true
    triggerComplete()
  }, [triggerComplete])

  /* Derive current act */
  const currentActIdx = useMemo(() => {
    const idx = ACTS.findIndex(a => elapsed >= a.start && elapsed < a.end)
    return idx < 0 ? ACTS.length - 1 : idx
  }, [elapsed])
  const currentAct = ACTS[currentActIdx]

  return (
    <div className={`sc-root ${isExiting ? 'sc-root--exiting' : 'sc-root--entering'}`} id="story-cinematic">

      {/* ── Background ── */}
      <ActBackground acts={ACTS} currentActIdx={currentActIdx} />

      {/* ── Cinematic letterbox bars ── */}
      <Letterbox />

      {/* ── Progress bar + step dots ── */}
      <div className="sc-header-controls">
        <ProgressBar elapsed={elapsed} acts={ACTS} />
        <SkipButton
          onSkip={handleSkip}
          skipConfirm={skipConfirm}
          onSkipRequest={setSkipConfirm}
        />
      </div>

      {/* ── Chapter content (centered, above subtitle area) ── */}
      <div className="sc-main-area">
        <ChapterContent act={currentAct} elapsed={elapsed} />
      </div>

      {/* ── Subtitle track ── */}
      <SubtitleTrack elapsed={elapsed} locale="en" />

      {/* ── Bottom timestamp ── */}
      <div className="sc-timestamp">
        {String(Math.floor(elapsed / 60)).padStart(2, '0')}
        :{String(Math.floor(elapsed % 60)).padStart(2, '0')}
        &nbsp;/&nbsp;
        {String(Math.floor(TOTAL_DURATION / 60)).padStart(2, '0')}
        :{String(TOTAL_DURATION % 60).padStart(2, '0')}
      </div>
    </div>
  )
}
