import React, { useRef, useEffect, useState } from 'react'
import useGameStore from '../../store/gameStore'

/* GDD §6.4 — CCTV Analysis Engine frontend panel
   Displays anonymised movement replay as an animated top-down minimap
   and lists server-generated evidence items from the analysis. */

/* ── Dot colours per color_index (1–6) per GDD ── */
const CCTV_DOT_COLORS = [
  '#ef4444',  // 1 — red
  '#3b82f6',  // 2 — blue
  '#22c55e',  // 3 — green
  '#f59e0b',  // 4 — amber
  '#a855f7',  // 5 — purple
  '#06b6d4',  // 6 — cyan
]

const AREA_BOUNDS = {
  'Research Center':  { x: 18, z: 15 },
  'Computer Lab':     { x: 15, z: 12 },
  'Security Office':  { x: 10, z: 8  },
  'MCA Department':   { x: 20, z: 15 },
  'Main Block':       { x: 30, z: 20 },
  'Auditorium':       { x: 25, z: 20 },
  'Library':          { x: 20, z: 18 },
  'Cafeteria':        { x: 22, z: 16 },
}

/* ── Animated top-down minimap of movement replay ── */
function CCTVMinimap({ area, movementReplay }) {
  const canvasRef = useRef(null)
  const frameRef  = useRef(0)
  const animRef   = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    const W      = canvas.width
    const H      = canvas.height

    const bounds = AREA_BOUNDS[area] || { x: 20, z: 20 }

    const worldToCanvas = (wx, wz) => ({
      cx: (wx / bounds.x + 0.5) * W,
      cy: (wz / bounds.z + 0.5) * H,
    })

    /* Group entries by color_index for trail rendering */
    const byColor = {}
    movementReplay.forEach(entry => {
      const ci = entry.color_index || 1
      if (!byColor[ci]) byColor[ci] = []
      byColor[ci].push(entry)
    })

    let playhead = 0
    const totalFrames = movementReplay.length + 30

    const draw = () => {
      ctx.fillStyle = 'rgba(5, 8, 20, 0.92)'
      ctx.fillRect(0, 0, W, H)

      /* Grid lines */
      ctx.strokeStyle = 'rgba(0, 191, 255, 0.08)'
      ctx.lineWidth   = 0.5
      for (let gx = 0; gx <= W; gx += W / 6) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke()
      }
      for (let gz = 0; gz <= H; gz += H / 6) {
        ctx.beginPath(); ctx.moveTo(0, gz); ctx.lineTo(W, gz); ctx.stroke()
      }

      /* Area label */
      ctx.fillStyle   = 'rgba(0, 191, 255, 0.6)'
      ctx.font        = 'bold 9px "JetBrains Mono", monospace'
      ctx.textAlign   = 'center'
      ctx.fillText(area.toUpperCase(), W / 2, 14)

      /* Render trails per color up to playhead */
      Object.entries(byColor).forEach(([ci, entries]) => {
        const dotColor = CCTV_DOT_COLORS[(parseInt(ci) - 1) % CCTV_DOT_COLORS.length]
        const visibleEntries = entries.slice(0, Math.max(1, playhead))

        /* Trail */
        if (visibleEntries.length > 1) {
          ctx.strokeStyle = dotColor + '55'
          ctx.lineWidth   = 1.5
          ctx.beginPath()
          visibleEntries.forEach((e, i) => {
            const p = worldToCanvas(e.position?.x || 0, e.position?.z || 0)
            if (i === 0) ctx.moveTo(p.cx, p.cy)
            else ctx.lineTo(p.cx, p.cy)
          })
          ctx.stroke()
        }

        /* Latest position dot */
        const last = visibleEntries[visibleEntries.length - 1]
        if (last) {
          const p = worldToCanvas(last.position?.x || 0, last.position?.z || 0)
          ctx.beginPath()
          ctx.arc(p.cx, p.cy, 6, 0, Math.PI * 2)
          ctx.fillStyle = dotColor
          ctx.fill()
          ctx.strokeStyle = 'white'
          ctx.lineWidth   = 1
          ctx.stroke()

          /* Color index label */
          ctx.fillStyle = 'white'
          ctx.font      = 'bold 7px monospace'
          ctx.textAlign = 'center'
          ctx.fillText(ci, p.cx, p.cy + 2.5)
        }
      })

      /* Scanline effect */
      const scanY = (Date.now() * 0.08) % H
      const grad  = ctx.createLinearGradient(0, scanY - 4, 0, scanY + 4)
      grad.addColorStop(0, 'rgba(0, 191, 255, 0)')
      grad.addColorStop(0.5, 'rgba(0, 191, 255, 0.1)')
      grad.addColorStop(1, 'rgba(0, 191, 255, 0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, scanY - 4, W, 8)

      /* Border */
      ctx.strokeStyle = 'rgba(0, 191, 255, 0.5)'
      ctx.lineWidth   = 1.5
      ctx.strokeRect(1, 1, W - 2, H - 2)

      playhead = (playhead + 0.4) % (totalFrames + 1)
      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [area, movementReplay])

  return (
    <canvas
      ref={canvasRef}
      width={260}
      height={200}
      style={{
        display: 'block',
        borderRadius: '4px',
        imageRendering: 'pixelated',
        boxShadow: '0 0 20px rgba(0, 191, 255, 0.25)',
      }}
    />
  )
}

/* ── Evidence item from CCTV report ── */
function CCTVEvidenceCard({ ev }) {
  return (
    <div style={{
      background: 'rgba(0, 191, 255, 0.06)',
      border: '1px solid rgba(0, 191, 255, 0.25)',
      borderLeft: '3px solid #00BFFF',
      borderRadius: '4px',
      padding: '8px 10px',
      marginBottom: '6px',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '11px',
      color: '#e0f2fe',
      lineHeight: '1.5',
    }}>
      <div style={{ fontWeight: 'bold', color: '#00BFFF', marginBottom: '3px' }}>
        📹 CCTV Evidence
      </div>
      <div style={{ color: '#94a3b8', fontSize: '10px' }}>
        Dot #{ev.color_index || '?'} · {ev.area || 'Unknown area'}
      </div>
      {ev.description && (
        <div style={{ marginTop: '4px', color: '#cbd5e1' }}>
          {ev.description}
        </div>
      )}
    </div>
  )
}

/* ── Color legend ── */
function ColorLegend() {
  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '6px',
      marginBottom: '12px',
    }}>
      <div style={{ width: '100%', fontSize: '10px', color: '#64748b', fontFamily: 'monospace', marginBottom: '2px' }}>
        ANONYMOUS IDENTITIES
      </div>
      {CCTV_DOT_COLORS.map((col, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{
            width: 12, height: 12, borderRadius: '50%',
            background: col, border: '1px solid rgba(255,255,255,0.3)',
            flexShrink: 0,
          }} />
          <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>
            {i + 1}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ── Main CCTV Report Panel ── */
export default function CCTVReportPanel() {
  const cctvReport = useGameStore((s) => s.cctvReport)
  const setCctvReport = useGameStore((s) => s.setCctvReport)
  const role = useGameStore((s) => s.role)

  /* Only Detective sees this panel */
  if (role !== 'DETECTIVE' || !cctvReport) return null

  const { area, movement_replay = [], generated_evidence = [] } = cctvReport

  return (
    <div id="cctv-report-panel" style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 8000,
      width: '600px',
      maxHeight: '88vh',
      overflowY: 'auto',
      background: 'linear-gradient(160deg, #060c1a 0%, #0a1428 100%)',
      border: '1.5px solid rgba(0, 191, 255, 0.4)',
      borderRadius: '8px',
      boxShadow: '0 0 60px rgba(0, 191, 255, 0.15), 0 25px 50px rgba(0,0,0,0.8)',
      fontFamily: "'Inter', sans-serif",
    }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 20px',
        borderBottom: '1px solid rgba(0, 191, 255, 0.2)',
        background: 'rgba(0, 10, 30, 0.7)',
      }}>
        <div>
          <div style={{
            fontSize: '11px',
            color: '#00BFFF',
            letterSpacing: '2px',
            fontFamily: "'JetBrains Mono', monospace",
            marginBottom: '2px',
          }}>
            ▶ CCTV SURVEILLANCE ANALYSIS
          </div>
          <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: '17px', fontWeight: 700 }}>
            {area || 'Unknown Area'}
          </h3>
        </div>
        <button
          id="cctv-report-close"
          onClick={() => setCctvReport(null)}
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
            padding: '6px 14px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontSize: '12px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.25)'
            e.currentTarget.style.color = '#fff'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.1)'
            e.currentTarget.style.color = '#fca5a5'
          }}
        >
          ✕ CLOSE
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', padding: '16px 20px' }}>

        {/* ── Left: Minimap replay ── */}
        <div style={{ flexShrink: 0 }}>
          <div style={{
            fontSize: '10px',
            color: '#64748b',
            fontFamily: 'monospace',
            letterSpacing: '1px',
            marginBottom: '8px',
          }}>
            MOVEMENT REPLAY
          </div>
          <CCTVMinimap area={area} movementReplay={movement_replay} />
          <ColorLegend />
        </div>

        {/* ── Right: Generated evidence ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '10px',
            color: '#64748b',
            fontFamily: 'monospace',
            letterSpacing: '1px',
            marginBottom: '8px',
          }}>
            GENERATED EVIDENCE ({generated_evidence.length})
          </div>

          {generated_evidence.length === 0 ? (
            <div style={{
              color: '#475569',
              fontSize: '12px',
              fontFamily: 'monospace',
              padding: '12px',
              border: '1px dashed rgba(100,116,139,0.3)',
              borderRadius: '4px',
              textAlign: 'center',
            }}>
              No suspects identified in this area<br />during the analysis window.
            </div>
          ) : (
            generated_evidence.map((ev, i) => (
              <CCTVEvidenceCard key={i} ev={ev} />
            ))
          )}

          {/* ── Analysis notes ── */}
          <div style={{
            marginTop: '12px',
            padding: '10px 12px',
            background: 'rgba(245, 158, 11, 0.06)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            borderLeft: '3px solid #f59e0b',
            borderRadius: '4px',
            fontSize: '11px',
            color: '#fde68a',
            fontFamily: "'JetBrains Mono', monospace",
            lineHeight: '1.5',
          }}>
            <strong>⚠ ANALYST NOTE:</strong> Dot identities are anonymised.
            Cross-reference timestamps with witness statements to de-anonymise suspects.
            Evidence collected here is added to your Case Board.
          </div>
        </div>
      </div>

      {/* ── Stats footer ── */}
      <div style={{
        borderTop: '1px solid rgba(0, 191, 255, 0.12)',
        padding: '10px 20px',
        display: 'flex',
        gap: '20px',
        background: 'rgba(0, 5, 15, 0.5)',
      }}>
        {[
          { label: 'ENTRIES LOGGED', val: movement_replay.length },
          { label: 'SUSPECTS DETECTED', val: [...new Set(movement_replay.map(e => e.color_index))].length },
          { label: 'EVIDENCE ITEMS', val: generated_evidence.length },
        ].map(({ label, val }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#00BFFF', fontFamily: 'monospace' }}>
              {val}
            </div>
            <div style={{ fontSize: '9px', color: '#64748b', letterSpacing: '1px', fontFamily: 'monospace' }}>
              {label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
