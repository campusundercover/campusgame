import React, { useState, useEffect, useCallback } from 'react'
import GameScene from './components/game/GameScene'
import RoleRevealScreen from './components/ui/RoleRevealScreen'
import useGameStore from './store/gameStore'

/* ──────────────────── Loading Screen ──────────────────── */
function LoadingScreen({ onFinish }) {
  const [status, setStatus] = useState('Initializing Security Protocol...')
  const [dotCount, setDotCount] = useState(0)

  useEffect(() => {
    const statuses = [
      'Establishing Secure Connection...',
      'Decrypting Campus Blueprints...',
      'Connecting to Security Office Database...',
      'Downloading Access Logs...',
      'System Ready. Entering Campus...',
    ]
    let idx = 0
    const si = setInterval(() => {
      if (idx < statuses.length) {
        setStatus(statuses[idx++])
        if (idx === statuses.length) setTimeout(() => onFinish(), 1200)
      }
    }, 1500)
    const di = setInterval(() => setDotCount(p => (p + 1) % 4), 500)
    return () => { clearInterval(si); clearInterval(di) }
  }, [onFinish])

  return (
    <main className="glass-panel" id="main-panel">
      <h1>CAMPUS UNDERCOVER</h1>
      <p className="subtitle">THE CHRIST MYSTERY</p>
      <div className="spinner-container">
        <div className="scanner-ring" id="scanner"></div>
      </div>
      <p className="status-text" id="status-display">
        {status}{'.'.repeat(dotCount)}
      </p>
      <div className="footer-text">MCA Final Year Project • Version 1.0.0</div>
    </main>
  )
}

/* ──────────────────── WebSocket Handler ──────────────────── */
// Only connects when a REAL roomCode (from lobby flow) is available.
// In demo/standalone mode this hook is a no-op — the game works offline.
function useGameWebSocket(roomCode, playerId) {
  const setWs = useGameStore((s) => s.setWs)
  const setRole = useGameStore((s) => s.setRole)
  const setPartnerInfo = useGameStore((s) => s.setPartnerInfo)
  const setTimerSeconds = useGameStore((s) => s.setTimerSeconds)
  const setNpcs = useGameStore((s) => s.setNpcs)
  const setTasks = useGameStore((s) => s.setTasks)
  const setAbilities = useGameStore((s) => s.setAbilities)
  const setWorldEvidence = useGameStore((s) => s.setWorldEvidence)
  const addWorldEvidence = useGameStore((s) => s.addWorldEvidence)
  const removeWorldEvidence = useGameStore((s) => s.removeWorldEvidence)
  const setEvidenceBoard = useGameStore((s) => s.setEvidenceBoard)
  const updateTask = useGameStore((s) => s.updateTask)
  const updateAbility = useGameStore((s) => s.updateAbility)
  const showNpcDialog = useGameStore((s) => s.showNpcDialog)
  const addChatMessage = useGameStore((s) => s.addChatMessage)
  const setMeetingActive = useGameStore((s) => s.setMeetingActive)
  const setMeetingTimeRemaining = useGameStore((s) => s.setMeetingTimeRemaining)
  const setGameResult = useGameStore((s) => s.setGameResult)
  const updateOtherPlayer = useGameStore((s) => s.updateOtherPlayer)
  const removeOtherPlayer = useGameStore((s) => s.removeOtherPlayer)
  const setGamePhase = useGameStore((s) => s.setGamePhase)

  useEffect(() => {
    // Skip connection in demo mode — no real room/player available
    if (!roomCode || !playerId) return

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const host = window.location.hostname
    const wsUrl = `${protocol}://${host}:8000/ws/game/${roomCode}/${playerId}`

    let ws
    try {
      ws = new WebSocket(wsUrl)
    } catch (e) {
      console.warn('[WS] Could not connect:', e)
      return
    }
    setWs(ws)

    ws.onopen = () => {
      console.log('[WS] Connected to game room:', roomCode)
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        const { type, payload } = msg

        switch (type) {
          case 'ERROR':
            console.warn('[WS] Server error:', payload?.message)
            break

          case 'WAITING':
            console.log('[WS] Waiting for game start...')
            break

          case 'ROLE_REVEAL':
            setRole(payload.role)
            setTimerSeconds(payload.timer_seconds || 1200)
            if (payload.partner_id) {
              setPartnerInfo({
                partner_id: payload.partner_id,
                partner_name: payload.partner_name,
                partner_role: payload.partner_role,
              })
            }
            setGamePhase('role_reveal')
            break

          case 'GAME_STARTED':
            setNpcs(payload.npcs || [])
            break

          case 'GAME_STATE':
            setTasks(payload.tasks || [])
            setAbilities(payload.abilities || [])
            setWorldEvidence(payload.evidence || [])
            break

          case 'EVIDENCE_COLLECTED':
            removeWorldEvidence(payload.evidence?.evidence_id)
            break

          case 'EVIDENCE_APPEARED':
            if (payload.evidence) addWorldEvidence(payload.evidence)
            break

          case 'EVIDENCE_DESTROYED':
            removeWorldEvidence(payload.evidence_id)
            break

          case 'EVIDENCE_BOARD_UPDATE':
            setEvidenceBoard(payload.board || [])
            break

          case 'TASK_UPDATED':
            updateTask(payload)
            break

          case 'NPC_STATEMENT':
            showNpcDialog({ npc_name: payload.npc_name, statement: payload.statement })
            break

          case 'CHAT_MESSAGE':
            addChatMessage(payload)
            break

          case 'MEETING_STARTED':
            setMeetingActive(true)
            setMeetingTimeRemaining(payload.time_remaining || 90)
            setGamePhase('meeting')
            break

          case 'MEETING_ENDED':
            setMeetingActive(false)
            setGamePhase('exploration')
            break

          case 'ABILITY_RESULT':
            if (payload.ability_id) updateAbility(payload)
            break

          case 'PLAYER_MOVED':
            if (String(payload.player_id) !== String(playerId)) {
              updateOtherPlayer(payload.player_id, {
                position: payload.position,
                rotation: payload.rotation,
              })
            }
            break

          case 'PLAYER_DISCONNECTED':
            removeOtherPlayer(payload.player_id)
            break

          case 'GAME_OVER':
            setGameResult(payload)
            break

          default:
            break
        }
      } catch (e) {
        console.error('[WS] Parse error:', e)
      }
    }

    ws.onerror = () => {
      console.warn('[WS] Connection error — running in offline demo mode.')
    }

    ws.onclose = (e) => {
      console.log('[WS] Closed:', e.code, e.reason)
    }

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close()
      }
    }
  }, [roomCode, playerId])
}

/* ──────────────────── App Root ──────────────────── */
export default function App() {
  const [screen, setScreen] = useState('loading')
  const gamePhase = useGameStore((s) => s.gamePhase)
  const setGamePhase = useGameStore((s) => s.setGamePhase)

  // Store setters for demo initialization
  const setRole = useGameStore((s) => s.setRole)
  const setAbilities = useGameStore((s) => s.setAbilities)
  const setTasks = useGameStore((s) => s.setTasks)
  const setWorldEvidence = useGameStore((s) => s.setWorldEvidence)
  const setNpcs = useGameStore((s) => s.setNpcs)

  // Only connect WebSocket when a REAL roomCode comes from the lobby flow.
  // If null, the hook is a no-op and the game runs in standalone/demo mode.
  const roomCode = useGameStore((s) => s.roomCode)   // null until lobby join
  const playerId = useGameStore((s) => s.playerId)   // null until auth

  // Connect WS only when we have real IDs and are past loading
  useGameWebSocket(
    screen !== 'loading' && roomCode ? roomCode : null,
    playerId
  )

  const handleLoadingFinish = useCallback(() => {
    setScreen('game')
    setGamePhase('exploration')

    // If running in offline standalone demo mode, set up mock data
    if (!roomCode) {
      setRole('DETECTIVE')
      setAbilities([
        { ability_id: 'CCTV_ANALYSIS', name: 'CCTV Analysis', description: 'Review surveillance footage from the Security Office', location_required: 'Security Office', duration_seconds: 90, cooldown_remaining: 0, is_on_cooldown: false, uses_remaining: 99, max_uses: 99 },
        { ability_id: 'DIGITAL_ANALYSIS', name: 'Digital Evidence Analysis', description: 'Recover server access logs from the Computer Lab', location_required: 'Computer Lab', duration_seconds: 60, cooldown_remaining: 0, is_on_cooldown: false, uses_remaining: 99, max_uses: 99 },
        { ability_id: 'RECOVER_LOGS', name: 'Recover Logs', description: 'Recover deleted file metadata from Research Center', location_required: 'Research Center', duration_seconds: 45, cooldown_remaining: 0, is_on_cooldown: false, uses_remaining: 99, max_uses: 99 },
        { ability_id: 'CORRELATE_EVIDENCE', name: 'Correlate Evidence', description: 'Link two pieces of evidence on the Evidence Board', location_required: null, duration_seconds: 0, cooldown_remaining: 0, is_on_cooldown: false, uses_remaining: 10, max_uses: 10 }
      ])
      setTasks([
        { task_id: 'task_1', name: 'Repair Server Network', location: 'Computer Lab', task_type: 'REPAIR_NETWORK', progress: 0, completed: false, points: 20 },
        { task_id: 'task_2', name: 'Archive Department Records', location: 'MCA Department', task_type: 'ARCHIVE_FILES', progress: 0, completed: false, points: 15 },
        { task_id: 'task_3', name: 'Check Security Cameras', location: 'Security Office', task_type: 'CHECK_CCTV', progress: 0, completed: false, points: 10 },
      ])
      setWorldEvidence([
        { evidence_id: 'ev_1', evidence_type: 'DIGITAL', area_found: 'Computer Lab', description: 'Log file showing unauthorized access' },
        { evidence_id: 'ev_2', evidence_type: 'PHYSICAL', area_found: 'Library', description: 'A dropped notebook with schematics' },
        { evidence_id: 'ev_3', evidence_type: 'TESTIMONIAL', area_found: 'Cafeteria', description: 'Student saw someone near the department at 10 PM' },
      ])
      setNpcs([
        { npc_id: 'npc_1', name: 'Prof. Sharma', position: [-15, -15], state: 'idle' },
        { npc_id: 'npc_2', name: 'Librarian Peter', position: [-15, 15], state: 'idle' },
        { npc_id: 'npc_3', name: 'Security Guard Suresh', position: [15, -15], state: 'idle' },
      ])
    }
  }, [roomCode, setGamePhase, setRole, setAbilities, setTasks, setWorldEvidence, setNpcs])

  const handleBeginInvestigation = useCallback(() => {
    setGamePhase('exploration')
  }, [setGamePhase])

  if (screen === 'loading') {
    return <LoadingScreen onFinish={handleLoadingFinish} />
  }

  if (gamePhase === 'role_reveal') {
    return <RoleRevealScreen onBegin={handleBeginInvestigation} />
  }

  // exploration | meeting | accusation | results — all handled inside GameScene
  return <GameScene />
}
