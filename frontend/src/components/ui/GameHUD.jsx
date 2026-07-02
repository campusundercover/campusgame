import React, { useEffect, useRef, useState } from 'react'
import useGameStore from '../../store/gameStore'
import TaskList from './TaskList'
import EvidenceBoard from './EvidenceBoard'
import ChatPanel from './ChatPanel'
import AbilityMenu from './AbilityMenu'
import VirtualControls from './VirtualControls'
import CCTVReportPanel from './CCTVReportPanel'

/* ── Christ University Campus Minimap ── */
// Faithfully represents the aerial photo layout
const CAMPUS_BUILDINGS = [
  // Gates
  { label: 'FRONT GATE',    x: 0.48, y: 0.04, w: 0.10, h: 0.04, color: '#6b7280', type: 'gate' },
  { label: 'BACK GATE',     x: 0.35, y: 0.93, w: 0.10, h: 0.03, color: '#6b7280', type: 'gate' },
  // Top area
  { label: 'VEHICLE ENTRY', x: 0.04, y: 0.08, w: 0.12, h: 0.05, color: '#4b5563', type: 'misc' },
  { label: 'PARKING',       x: 0.04, y: 0.14, w: 0.13, h: 0.09, color: '#374151', type: 'parking' },
  { label: 'AUDI BLOCK',    x: 0.22, y: 0.09, w: 0.15, h: 0.09, color: '#7c3aed', type: 'academic' },
  { label: 'JUNIOR COLLEGE',x: 0.20, y: 0.18, w: 0.17, h: 0.06, color: '#7c2d12', type: 'academic' },
  { label: 'PLANTS & TREES',x: 0.55, y: 0.07, w: 0.18, h: 0.10, color: '#15803d', type: 'green', isGreen: true },
  { label: 'CANTEEN',       x: 0.79, y: 0.12, w: 0.08, h: 0.03, color: '#b45309', type: 'canteen' },
  { label: 'CANTEEN',       x: 0.79, y: 0.16, w: 0.08, h: 0.03, color: '#b45309', type: 'canteen' },
  { label: 'CANTEEN',       x: 0.79, y: 0.20, w: 0.08, h: 0.03, color: '#b45309', type: 'canteen' },
  // Middle-left
  { label: 'CENTRAL BLOCK', x: 0.14, y: 0.25, w: 0.20, h: 0.20, color: '#9a3412', type: 'academic', isMain: true },
  { label: 'CANTEEN',       x: 0.03, y: 0.33, w: 0.08, h: 0.04, color: '#b45309', type: 'canteen' },
  { label: 'BASKET COURT',  x: 0.38, y: 0.22, w: 0.14, h: 0.10, color: '#1d4ed8', type: 'sports', isCourt: true },
  { label: 'BLOCK-1',       x: 0.78, y: 0.27, w: 0.12, h: 0.15, color: '#9a3412', type: 'academic' },
  // Middle
  { label: 'SITTING AREA',  x: 0.25, y: 0.44, w: 0.10, h: 0.06, color: '#374151', type: 'misc' },
  { label: 'PARK GARDEN',   x: 0.45, y: 0.38, w: 0.18, h: 0.14, color: '#16a34a', type: 'green', isGreen: true },
  { label: 'BASKET COURT',  x: 0.05, y: 0.45, w: 0.10, h: 0.08, color: '#1d4ed8', type: 'sports', isCourt: true },
  { label: 'HOCKEY COURT',  x: 0.05, y: 0.53, w: 0.12, h: 0.06, color: '#065f46', type: 'sports' },
  { label: 'BLOCK-2',       x: 0.44, y: 0.52, w: 0.18, h: 0.14, color: '#9a3412', type: 'academic' },
  // Lower
  { label: 'SHE BLOCK',     x: 0.18, y: 0.60, w: 0.14, h: 0.06, color: '#be185d', type: 'hostel' },
  { label: 'BOYS HOSTEL',   x: 0.16, y: 0.66, w: 0.16, h: 0.10, color: '#7c3aed', type: 'hostel' },
  { label: 'BIRDS PARK',    x: 0.44, y: 0.68, w: 0.14, h: 0.07, color: '#15803d', type: 'green', isGreen: true },
  { label: 'CANTEEN',       x: 0.66, y: 0.67, w: 0.14, h: 0.10, color: '#b45309', type: 'canteen' },
  // Bottom
  { label: 'BLOCK-4',       x: 0.12, y: 0.76, w: 0.16, h: 0.10, color: '#9a3412', type: 'academic' },
  { label: 'R&D BLOCK',     x: 0.14, y: 0.86, w: 0.14, h: 0.07, color: '#581c87', type: 'research' },
  { label: 'GIRLS HOSTEL',  x: 0.38, y: 0.83, w: 0.20, h: 0.09, color: '#9a3412', type: 'hostel' },
  // Paths
]

const CAMPUS_TREES = [
  { x: 0.07, y: 0.04, r: 0.025 }, { x: 0.12, y: 0.06, r: 0.02 },
  { x: 0.87, y: 0.08, r: 0.02 }, { x: 0.92, y: 0.12, r: 0.02 },
  { x: 0.90, y: 0.40, r: 0.02 }, { x: 0.85, y: 0.50, r: 0.025 },
  { x: 0.88, y: 0.60, r: 0.02 }, { x: 0.07, y: 0.72, r: 0.02 },
  { x: 0.30, y: 0.79, r: 0.02 }, { x: 0.32, y: 0.90, r: 0.025 },
  { x: 0.65, y: 0.80, r: 0.02 }, { x: 0.70, y: 0.88, r: 0.02 },
  { x: 0.80, y: 0.75, r: 0.025 }, { x: 0.84, y: 0.82, r: 0.02 },
]

function ChristUniversityMinimap() {
  const canvasRef = useRef(null)
  const playerPosition = useGameStore((s) => s.playerPosition)
  const playerRotation = useGameStore((s) => s.playerRotation)
  const campusAreas = useGameStore((s) => s.campusAreas)
  const otherPlayers = useGameStore((s) => s.otherPlayers)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height

    ctx.clearRect(0, 0, W, H)

    // Background - dark campus ground
    ctx.fillStyle = '#1a2510'
    ctx.fillRect(0, 0, W, H)

    // Campus boundary outline - diagonal/irregular polygon matching aerial view
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.lineWidth = 1
    ctx.strokeRect(2, 2, W - 4, H - 4)

    // Draw paths/roads
    ctx.strokeStyle = '#374151'
    ctx.lineWidth = 2
    // Main vertical path
    ctx.beginPath(); ctx.moveTo(W * 0.40, H * 0.05); ctx.lineTo(W * 0.40, H * 0.95); ctx.stroke()
    // Horizontal paths
    ctx.beginPath(); ctx.moveTo(W * 0.05, H * 0.24); ctx.lineTo(W * 0.90, H * 0.24); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(W * 0.05, H * 0.52); ctx.lineTo(W * 0.90, H * 0.52); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(W * 0.05, H * 0.76); ctx.lineTo(W * 0.90, H * 0.76); ctx.stroke()

    // Draw green areas first (behind buildings)
    CAMPUS_BUILDINGS.filter(b => b.isGreen).forEach(b => {
      ctx.fillStyle = '#15803d'
      ctx.globalAlpha = 0.5
      ctx.fillRect(b.x * W, b.y * H, b.w * W, b.h * H)
      ctx.globalAlpha = 1
      // Add tree texture dots
      for (let i = 0; i < 6; i++) {
        ctx.beginPath()
        ctx.arc(
          b.x * W + Math.random() * b.w * W,
          b.y * H + Math.random() * b.h * H,
          2, 0, Math.PI * 2
        )
        ctx.fillStyle = '#22c55e'; ctx.fill()
      }
    })

    // Draw buildings
    CAMPUS_BUILDINGS.filter(b => !b.isGreen).forEach(b => {
      const bx = b.x * W, by = b.y * H, bw = b.w * W, bh = b.h * H

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.fillRect(bx + 2, by + 2, bw, bh)

      // Building body
      ctx.fillStyle = b.color
      ctx.globalAlpha = 0.85
      ctx.fillRect(bx, by, bw, bh)
      ctx.globalAlpha = 1

      // Roof highlight (lighter top edge)
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.fillRect(bx, by, bw, 2)
      ctx.fillRect(bx, by, 2, bh)

      // Court markings
      if (b.isCourt) {
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'
        ctx.lineWidth = 0.5
        // Center circle
        ctx.beginPath()
        ctx.arc(bx + bw / 2, by + bh / 2, Math.min(bw, bh) * 0.2, 0, Math.PI * 2)
        ctx.stroke()
        // Center line
        ctx.beginPath(); ctx.moveTo(bx + bw / 2, by); ctx.lineTo(bx + bw / 2, by + bh); ctx.stroke()
      }

      // Label (small text)
      if (bw > W * 0.07) {
        ctx.fillStyle = 'rgba(255,255,255,0.85)'
        ctx.font = `bold ${Math.max(5, Math.min(7, bw * 0.18))}px "Outfit", sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const maxChars = Math.floor(bw / 4)
        const label = b.label.length > maxChars ? b.label.slice(0, maxChars) + '…' : b.label
        ctx.fillText(label, bx + bw / 2, by + bh / 2)
      }
    })

    // Draw trees
    CAMPUS_TREES.forEach(t => {
      const tx = t.x * W, ty = t.y * H, tr = t.r * Math.min(W, H)
      ctx.beginPath()
      ctx.arc(tx, ty, tr, 0, Math.PI * 2)
      ctx.fillStyle = '#15803d'
      ctx.globalAlpha = 0.8; ctx.fill(); ctx.globalAlpha = 1
      ctx.beginPath()
      ctx.arc(tx - tr * 0.2, ty - tr * 0.2, tr * 0.5, 0, Math.PI * 2)
      ctx.fillStyle = '#22c55e'; ctx.globalAlpha = 0.6; ctx.fill(); ctx.globalAlpha = 1
    })

    // Player position mapping (3D world to minimap)
    // World range: roughly -30 to +30 in both axes
    const worldToMap = (wx, wz) => {
      const nx = (wx + 30) / 60  // normalize 0-1
      const ny = (wz + 30) / 60
      return [nx * W, ny * H]
    }

    // Other players
    Object.values(otherPlayers).forEach((p, i) => {
      if (!p.position) return
      const [px, py] = worldToMap(p.position[0], p.position[2])
      ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#94a3b8'; ctx.fill()
      ctx.strokeStyle = 'white'; ctx.lineWidth = 1; ctx.stroke()
    })

    // Self (triangle indicator)
    const [sx, sy] = worldToMap(playerPosition[0], playerPosition[2])
    ctx.save()
    ctx.translate(sx, sy)
    ctx.rotate(playerRotation)
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(-4, 5); ctx.lineTo(4, 5); ctx.closePath()
    ctx.fillStyle = '#f43f5e'; ctx.fill()
    ctx.restore()
    // Pulse ring
    ctx.beginPath(); ctx.arc(sx, sy, 8, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(244,63,94,0.4)'; ctx.lineWidth = 1.5; ctx.stroke()

    // North indicator
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.font = 'bold 8px Outfit'
    ctx.textAlign = 'center'
    ctx.fillText('N', W - 8, 12)

    // Border
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)'
    ctx.lineWidth = 1.5
    ctx.strokeRect(0, 0, W, H)

  }, [playerPosition, playerRotation, otherPlayers])

  return (
    <div className="minimap-wrapper">
      <div className="minimap-label">CHRIST UNIVERSITY</div>
      <canvas ref={canvasRef} width={220} height={280} className="minimap-canvas" id="minimap-canvas" />
      <div className="minimap-legend">
        <span className="minimap-legend-dot" style={{ background: '#f43f5e' }} /> You
        <span className="minimap-legend-dot" style={{ background: '#94a3b8' }} /> Others
      </div>
    </div>
  )
}

/* ── Timer ── */
function Timer() {
  const timeRemaining   = useGameStore((s) => s.timeRemaining)
  const tickTimer       = useGameStore((s) => s.tickTimer)
  const ws              = useGameStore((s) => s.ws)
  const playerPosition  = useGameStore((s) => s.playerPosition)
  const currentArea     = useGameStore((s) => s.currentArea)
  const intervalRef     = useRef(null)
  const cctvTickRef     = useRef(0)  // counts seconds for 5s CCTV interval

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      tickTimer()

      // Send server heartbeat — drives NPC movement, midpoint checks, area tracking
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'TIMER_TICK' }))

        // Every 5 seconds record movement for CCTV
        cctvTickRef.current += 1
        if (cctvTickRef.current >= 5) {
          cctvTickRef.current = 0
          ws.send(JSON.stringify({
            action: 'RECORD_MOVEMENT',
            position: {
              x: playerPosition[0],
              y: playerPosition[1],
              z: playerPosition[2],
            },
            area: currentArea || 'Campus Grounds',
          }))
        }
      }
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [tickTimer, ws, playerPosition, currentArea])

  const minutes  = Math.floor(timeRemaining / 60)
  const seconds  = timeRemaining % 60
  const isUrgent   = timeRemaining <= 120
  const isCritical = timeRemaining <= 30

  return (
    <div className={`hud-timer ${isUrgent ? 'urgent' : ''} ${isCritical ? 'critical' : ''}`} id="game-timer">
      <span className="timer-label">INVESTIGATION</span>
      <span className="timer-value">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
      {isCritical && <span className="timer-critical-text">TIME CRITICAL</span>}
    </div>
  )
}

/* ── Area Indicator ── */
function AreaIndicator() {
  const currentArea = useGameStore((s) => s.currentArea)
  return (
    <div className={`hud-area ${currentArea ? 'visible' : ''}`} id="area-indicator">
      <span className="area-icon">📍</span>
      <span className="area-name">{currentArea || 'Campus Grounds'}</span>
    </div>
  )
}

/* ── Role Badge ── */
function RoleBadge() {
  const role = useGameStore((s) => s.role)
  const displayRole = role || 'INVESTIGATOR'
  const roleColors = {
    DETECTIVE: '#3b82f6', INVESTIGATOR: '#22c55e',
    MASTERMIND: '#ef4444', CONSPIRATOR: '#f97316',
  }
  const roleIcons = { DETECTIVE: '🔍', INVESTIGATOR: '🧩', MASTERMIND: '🕵️', CONSPIRATOR: '🔪' }
  return (
    <div className="hud-role-badge" id="role-badge" style={{ '--role-color': roleColors[displayRole] || '#8b5cf6' }}>
      <span className="role-icon-big">{roleIcons[displayRole] || '👤'}</span>
      <div>
        <span className="role-label">ROLE</span>
        <span className="role-name">{displayRole}</span>
      </div>
    </div>
  )
}

/* ── NPC Dialog ── */
function NPCDialog() {
  const visible = useGameStore((s) => s.npcDialogVisible)
  const content = useGameStore((s) => s.npcDialogContent)
  const hideNpcDialog = useGameStore((s) => s.hideNpcDialog)
  if (!visible || !content) return null
  return (
    <div className="npc-dialog-overlay" id="npc-dialog" onClick={hideNpcDialog}>
      <div className="npc-dialog-box" onClick={e => e.stopPropagation()}>
        <div className="npc-dialog-header">
          <div className="npc-avatar-circle">
            <span>👤</span>
          </div>
          <div>
            <strong className="npc-name">{content.npc_name}</strong>
            <p className="npc-subtitle">Witness Statement</p>
          </div>
        </div>
        <div className="npc-speech-bubble">
          <p className="npc-dialog-text">"{content.statement}"</p>
        </div>
        <button className="npc-dialog-close" onClick={hideNpcDialog}>
          ✕ Close
        </button>
      </div>
    </div>
  )
}

/* ── Controls Hint ── */
function ControlsHint() {
  return (
    <div className="hud-controls" id="controls-hint">
      <span><kbd>WASD</kbd> Move</span>
      <span><kbd>Shift</kbd> Sprint</span>
      <span><kbd>E</kbd> Interact</span>
      <span><kbd>T</kbd> Chat</span>
      <span><kbd>Tab</kbd> Abilities</span>
    </div>
  )
}

/* ── Full HUD ── */
export default function GameHUD() {
  return (
    <div className="game-hud" id="game-hud">
      <div className="hud-top-bar">
        <RoleBadge />
        <Timer />
        <AreaIndicator />
      </div>

      {/* Right sidebar */}
      <div className="hud-right-sidebar">
        <TaskList />
        <EvidenceBoard />
      </div>

      <div className="hud-bottom-bar">
        <ChristUniversityMinimap />
        <ControlsHint />
        <div className="hud-bottom-right">
          <ChatPanel />
          <AbilityMenu />
          <VirtualControls />
        </div>
      </div>

      <NPCDialog />
      <CCTVReportPanel />
    </div>
  )
}
