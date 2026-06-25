import React, { useEffect, useRef } from 'react'
import useGameStore from '../../store/gameStore'
import TaskList from './TaskList'
import EvidenceBoard from './EvidenceBoard'
import ChatPanel from './ChatPanel'
import AbilityMenu from './AbilityMenu'
import VirtualControls from './VirtualControls'



function Minimap() {
  const canvasRef = useRef(null)
  const playerPosition = useGameStore((s) => s.playerPosition)
  const playerRotation = useGameStore((s) => s.playerRotation)
  const campusAreas = useGameStore((s) => s.campusAreas)
  const otherPlayers = useGameStore((s) => s.otherPlayers)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const size = canvas.width

    ctx.clearRect(0, 0, size, size)
    ctx.fillStyle = 'rgba(10, 8, 19, 0.85)'
    ctx.fillRect(0, 0, size, size)

    ctx.strokeStyle = 'rgba(255,255,255,0.05)'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= size; i += size / 12) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke()
    }

    const worldToMinimap = (wx, wz) => {
      const scale = size / 120
      return [size / 2 + wx * scale, size / 2 + wz * scale]
    }

    campusAreas.forEach((area) => {
      const [mx, my] = worldToMinimap(area.position[0], area.position[2])
      const scale = size / 120
      const w = area.size[0] * scale
      const d = area.size[2] * scale
      ctx.fillStyle = area.color
      ctx.globalAlpha = 0.7
      ctx.fillRect(mx - w / 2, my - d / 2, w, d)
      ctx.globalAlpha = 1
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'
      ctx.lineWidth = 1
      ctx.strokeRect(mx - w / 2, my - d / 2, w, d)
    })

    // Other players (gray dots)
    Object.values(otherPlayers).forEach(p => {
      if (!p.position) return
      const [px, pz] = worldToMinimap(p.position[0], p.position[2])
      ctx.beginPath()
      ctx.arc(px, pz, 3, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(148,163,184,0.8)'
      ctx.fill()
    })

    // Self
    const [px, pz] = worldToMinimap(playerPosition[0], playerPosition[2])
    ctx.save()
    ctx.translate(px, pz)
    ctx.rotate(playerRotation)
    ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(-4, 4); ctx.lineTo(4, 4); ctx.closePath()
    ctx.fillStyle = '#f43f5e'; ctx.fill()
    ctx.restore()
    ctx.beginPath()
    ctx.arc(px, pz, 4, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(244, 63, 94, 0.4)'; ctx.fill()
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)'
    ctx.lineWidth = 2; ctx.strokeRect(0, 0, size, size)
  }, [playerPosition, playerRotation, campusAreas, otherPlayers])

  return (
    <canvas ref={canvasRef} width={180} height={180} id="minimap-canvas" className="hud-minimap" />
  )
}

/* ────────── Timer ────────── */
function Timer() {
  const timeRemaining = useGameStore((s) => s.timeRemaining)
  const tickTimer = useGameStore((s) => s.tickTimer)
  const intervalRef = useRef(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => tickTimer(), 1000)
    return () => clearInterval(intervalRef.current)
  }, [tickTimer])

  const minutes = Math.floor(timeRemaining / 60)
  const seconds = timeRemaining % 60
  const isUrgent = timeRemaining <= 120
  const isCritical = timeRemaining <= 30

  return (
    <div className={`hud-timer ${isUrgent ? 'urgent' : ''} ${isCritical ? 'critical' : ''}`} id="game-timer">
      <span className="timer-label">INVESTIGATION</span>
      <span className="timer-value">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </div>
  )
}

/* ────────── Area Indicator ────────── */
function AreaIndicator() {
  const currentArea = useGameStore((s) => s.currentArea)
  return (
    <div className={`hud-area ${currentArea ? 'visible' : ''}`} id="area-indicator">
      <span className="area-icon">📍</span>
      <span className="area-name">{currentArea || 'Campus Grounds'}</span>
    </div>
  )
}

/* ────────── Role Badge ────────── */
function RoleBadge() {
  const role = useGameStore((s) => s.role)
  const displayRole = role || 'INVESTIGATOR'
  const roleColors = {
    DETECTIVE: '#3b82f6', INVESTIGATOR: '#22c55e',
    MASTERMIND: '#ef4444', CONSPIRATOR: '#f97316',
  }
  return (
    <div className="hud-role-badge" id="role-badge" style={{ '--role-color': roleColors[displayRole] || '#8b5cf6' }}>
      <span className="role-label">ROLE</span>
      <span className="role-name">{displayRole}</span>
    </div>
  )
}

/* ────────── NPC Dialog ────────── */
function NPCDialog() {
  const visible = useGameStore((s) => s.npcDialogVisible)
  const content = useGameStore((s) => s.npcDialogContent)
  const hideNpcDialog = useGameStore((s) => s.hideNpcDialog)
  if (!visible || !content) return null
  return (
    <div className="npc-dialog-overlay" id="npc-dialog" onClick={hideNpcDialog}>
      <div className="npc-dialog-box" onClick={e => e.stopPropagation()}>
        <div className="npc-dialog-header">
          <span className="npc-dialog-icon">💬</span>
          <strong>{content.npc_name}</strong>
        </div>
        <p className="npc-dialog-text">{content.statement}</p>
        <button className="npc-dialog-close" onClick={hideNpcDialog}>Close</button>
      </div>
    </div>
  )
}

/* ────────── Controls Hint ────────── */
function ControlsHint() {
  return (
    <div className="hud-controls" id="controls-hint">
      <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move</span>
      <span><kbd>Shift</kbd> Sprint</span>
      <span><kbd>E</kbd> Interact</span>
      <span><kbd>T</kbd> Chat</span>
      <span><kbd>Tab</kbd> Abilities</span>
    </div>
  )
}

/* ────────── Full HUD ────────── */
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
        <Minimap />
        <ControlsHint />
        <div className="hud-bottom-right">
          <ChatPanel />
          <AbilityMenu />
          <VirtualControls />
        </div>
      </div>

      {/* NPC dialog */}
      <NPCDialog />
    </div>
  )
}
