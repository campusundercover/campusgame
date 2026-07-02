import React, { useState, useEffect, useRef, useCallback } from 'react'
import useGameStore from '../../store/gameStore'

/* ── API base URL ── */
const API_BASE = `${window.location.protocol}//${window.location.hostname}:8000`

/* ══════════════════════════════════════════════════════════════
   HELPER — API client
   ══════════════════════════════════════════════════════════════ */
async function apiFetch(path, options = {}, token = null) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`)
  return data
}

/* ══════════════════════════════════════════════════════════════
   Animated background radar canvas
   ══════════════════════════════════════════════════════════════ */
function RadarBg() {
  const canvasRef = useRef(null)
  const animRef   = useRef(null)
  const angle     = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx    = canvas.getContext('2d')
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      const W = canvas.width, H = canvas.height
      ctx.clearRect(0, 0, W, H)

      const cx = W / 2, cy = H / 2
      const maxR = Math.min(W, H) * 0.42

      /* Concentric rings */
      for (let i = 1; i <= 5; i++) {
        ctx.beginPath()
        ctx.arc(cx, cy, maxR * (i / 5), 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(139, 92, 246, ${0.04 + i * 0.015})`
        ctx.lineWidth = 1
        ctx.stroke()
      }

      /* Cross-hairs */
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.07)'
      ctx.lineWidth = 0.8
      ctx.beginPath(); ctx.moveTo(cx - maxR, cy); ctx.lineTo(cx + maxR, cy); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx, cy - maxR); ctx.lineTo(cx, cy + maxR); ctx.stroke()

      /* Sweep wedge */
      const sweep = Math.PI / 5
      const grad  = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR)
      grad.addColorStop(0, 'rgba(139, 92, 246, 0.08)')
      grad.addColorStop(1, 'rgba(139, 92, 246, 0)')
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, maxR, angle.current - sweep, angle.current)
      ctx.closePath()
      ctx.fillStyle = grad
      ctx.fill()
      ctx.restore()

      /* Sweep line */
      ctx.save()
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + Math.cos(angle.current) * maxR, cy + Math.sin(angle.current) * maxR)
      ctx.stroke()
      ctx.restore()

      angle.current += 0.012
      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', resize) }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.55 }}
    />
  )
}

/* ══════════════════════════════════════════════════════════════
   SCREEN: Auth (Register / Login)
   ══════════════════════════════════════════════════════════════ */
function AuthScreen({ onAuth }) {
  const [mode,     setMode]     = useState('login')   // login | register
  const [username, setUsername] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      if (mode === 'register') {
        await apiFetch('/api/v1/auth/register', {
          method: 'POST',
          body: JSON.stringify({ username, email, password }),
        })
        setMode('login')
        setError('Registered! Please log in.')
        setLoading(false)
        return
      }
      /* Login */
      const token = await apiFetch('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: email, email, password }),
      })
      const me = await apiFetch('/api/v1/auth/me', {}, token.access_token)
      onAuth({ token: token.access_token, userId: me.id, username: me.username })
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  const fieldStyle = {
    width: '100%',
    padding: '11px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(139,92,246,0.35)',
    borderRadius: '6px',
    color: '#e2e8f0',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  }

  return (
    <div style={{
      background: 'rgba(13,15,20,0.94)',
      border: '1.5px solid rgba(139,92,246,0.35)',
      borderRadius: '12px',
      padding: '36px 32px',
      width: '380px',
      boxShadow: '0 0 80px rgba(139,92,246,0.15)',
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{
          width: 52, height: 52,
          borderRadius: '50%',
          border: '2px solid rgba(139,92,246,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px',
          fontSize: 22,
          background: 'rgba(139,92,246,0.1)',
        }}>✝</div>
        <h1 style={{ margin: 0, color: '#e2e8f0', fontSize: 22, fontWeight: 800, letterSpacing: 1 }}>
          CAMPUS UNDERCOVER
        </h1>
        <p style={{ margin: '4px 0 0', color: '#7c3aed', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' }}>
          The Christ Mystery
        </p>
      </div>

      {/* Toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: 3 }}>
        {['login', 'register'].map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); setError('') }}
            style={{
              flex: 1, padding: '8px', border: 'none', borderRadius: 4,
              background: mode === m ? 'rgba(139,92,246,0.45)' : 'transparent',
              color: mode === m ? '#e2e8f0' : '#64748b',
              fontWeight: 600, fontSize: 13, cursor: 'pointer',
              textTransform: 'uppercase', letterSpacing: 1, transition: 'all 0.2s',
            }}
          >
            {m === 'login' ? 'Sign In' : 'Register'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {mode === 'register' && (
          <input
            style={fieldStyle}
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            autoComplete="username"
          />
        )}
        <input
          style={fieldStyle}
          placeholder="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <input
          style={fieldStyle}
          placeholder="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />

        {error && (
          <p style={{
            margin: 0, padding: '8px 10px',
            background: error.includes('Registered') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${error.includes('Registered') ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}`,
            borderRadius: 4, color: error.includes('Registered') ? '#86efac' : '#fca5a5',
            fontSize: 12, fontFamily: 'monospace',
          }}>
            {error}
          </p>
        )}

        <button
          id="auth-submit-btn"
          type="submit"
          disabled={loading}
          style={{
            padding: '12px', borderRadius: 6, border: 'none',
            background: loading ? 'rgba(139,92,246,0.3)' : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            color: 'white', fontWeight: 700, fontSize: 14, cursor: loading ? 'default' : 'pointer',
            letterSpacing: 1, textTransform: 'uppercase', transition: 'opacity 0.2s',
          }}
        >
          {loading ? 'Please wait...' : mode === 'login' ? 'Sign In →' : 'Create Account →'}
        </button>
      </form>

      {/* Guest play notice */}
      <p style={{ textAlign: 'center', marginTop: 16, color: '#475569', fontSize: 11, fontFamily: 'monospace' }}>
        No account? <span
          onClick={() => onAuth({ token: null, userId: Date.now(), username: `Guest_${Math.random().toString(36).slice(2,6)}` })}
          style={{ color: '#7c3aed', cursor: 'pointer', textDecoration: 'underline' }}
        >Play as Guest (offline demo)</span>
      </p>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   SCREEN: Lobby Hub (Create / Join)
   ══════════════════════════════════════════════════════════════ */
const DIFFICULTY_INFO = {
  easy:   { label: 'EASY',   color: '#22c55e', desc: 'More evidence, higher reliability',   icon: '🟢' },
  medium: { label: 'MEDIUM', color: '#f59e0b', desc: 'Balanced investigation',               icon: '🟡' },
  hard:   { label: 'HARD',   color: '#ef4444', desc: 'Sparse clues, low NPC reliability',   icon: '🔴' },
}

function LobbyHub({ auth, onPlay, onJoinedRoom }) {
  const [tab,        setTab]        = useState('create')  // create | join | browse
  const [difficulty, setDifficulty] = useState('medium')
  const [maxPlayers, setMaxPlayers] = useState(6)
  const [joinCode,   setJoinCode]   = useState('')
  const [rooms,      setRooms]      = useState([])
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  /* Fetch open rooms */
  const fetchRooms = useCallback(async () => {
    if (!auth.token) return
    try {
      const data = await apiFetch('/api/v1/lobby/rooms', {}, auth.token)
      setRooms(data)
    } catch {}
  }, [auth.token])

  useEffect(() => {
    if (tab === 'browse') fetchRooms()
  }, [tab, fetchRooms])

  const handleCreate = async () => {
    setError(''); setLoading(true)
    try {
      const room = await apiFetch('/api/v1/lobby/create', {
        method: 'POST',
        body: JSON.stringify({ difficulty, max_players: maxPlayers }),
      }, auth.token)
      onJoinedRoom(room)
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  const handleJoin = async (code) => {
    setError(''); setLoading(true)
    try {
      const room = await apiFetch('/api/v1/lobby/join', {
        method: 'POST',
        body: JSON.stringify({ room_code: code || joinCode }),
      }, auth.token)
      onJoinedRoom(room)
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  const tabBtn = (key, label, icon) => (
    <button
      onClick={() => setTab(key)}
      style={{
        flex: 1, padding: '10px', border: 'none',
        background: tab === key ? 'rgba(139,92,246,0.35)' : 'transparent',
        color: tab === key ? '#e2e8f0' : '#64748b',
        fontWeight: 600, fontSize: 13, cursor: 'pointer',
        letterSpacing: 1, transition: 'all 0.2s',
      }}
    >
      {icon} {label}
    </button>
  )

  return (
    <div style={{
      background: 'rgba(13,15,20,0.94)',
      border: '1.5px solid rgba(139,92,246,0.35)',
      borderRadius: '12px',
      padding: '28px 28px',
      width: '460px',
      boxShadow: '0 0 80px rgba(139,92,246,0.15)',
    }}>
      {/* Welcome */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: 0, color: '#7c3aed', fontSize: 11, letterSpacing: 2, fontFamily: 'monospace' }}>
          SIGNED IN AS
        </p>
        <h2 style={{ margin: '2px 0 0', color: '#e2e8f0', fontSize: 18, fontWeight: 700 }}>
          👤 {auth.username}
        </h2>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: 3 }}>
        {tabBtn('create', 'CREATE',  '+')}
        {tabBtn('join',   'JOIN',    '🔑')}
        {tabBtn('browse', 'BROWSE',  '🌐')}
      </div>

      {error && (
        <p style={{
          margin: '0 0 12px', padding: '8px 10px',
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.35)',
          borderRadius: 4, color: '#fca5a5', fontSize: 12, fontFamily: 'monospace',
        }}>
          {error}
        </p>
      )}

      {/* ── CREATE tab ── */}
      {tab === 'create' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <p style={{ margin: '0 0 8px', color: '#94a3b8', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'monospace' }}>
              DIFFICULTY
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {Object.entries(DIFFICULTY_INFO).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => setDifficulty(key)}
                  style={{
                    flex: 1, padding: '10px 8px', border: `1.5px solid`,
                    borderColor: difficulty === key ? info.color : 'rgba(255,255,255,0.1)',
                    borderRadius: 6,
                    background: difficulty === key ? `${info.color}20` : 'transparent',
                    color: difficulty === key ? info.color : '#64748b',
                    cursor: 'pointer', fontSize: 12, fontWeight: 700,
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: 16, marginBottom: 2 }}>{info.icon}</div>
                  {info.label}
                </button>
              ))}
            </div>
            <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 11, fontFamily: 'monospace' }}>
              {DIFFICULTY_INFO[difficulty].desc}
            </p>
          </div>

          <div>
            <p style={{ margin: '0 0 8px', color: '#94a3b8', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'monospace' }}>
              MAX PLAYERS: {maxPlayers}
            </p>
            <input
              type="range" min={4} max={10} value={maxPlayers}
              onChange={e => setMaxPlayers(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#7c3aed' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', fontSize: 10, fontFamily: 'monospace' }}>
              <span>4 min</span><span>10 max</span>
            </div>
          </div>

          <button
            id="create-room-btn"
            onClick={auth.token ? handleCreate : () => onPlay()}
            disabled={loading}
            style={{
              padding: '13px', borderRadius: 6, border: 'none',
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              letterSpacing: 1, textTransform: 'uppercase',
            }}
          >
            {loading ? 'Creating...' : auth.token ? '+ CREATE ROOM' : '▶ PLAY OFFLINE DEMO'}
          </button>

          {!auth.token && (
            <p style={{ textAlign: 'center', color: '#475569', fontSize: 11, margin: 0, fontFamily: 'monospace' }}>
              Sign in to create a real multiplayer room.
            </p>
          )}
        </div>
      )}

      {/* ── JOIN tab ── */}
      {tab === 'join' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <p style={{ margin: '0 0 8px', color: '#94a3b8', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'monospace' }}>
              ROOM CODE
            </p>
            <input
              id="room-code-input"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="XXXX"
              maxLength={8}
              style={{
                width: '100%', padding: '13px 16px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(139,92,246,0.35)',
                borderRadius: 6, color: '#e2e8f0',
                fontSize: 22, fontFamily: "'JetBrains Mono', monospace",
                textAlign: 'center', letterSpacing: 4, outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            id="join-room-btn"
            onClick={() => auth.token ? handleJoin(joinCode) : onPlay()}
            disabled={loading || joinCode.length < 4}
            style={{
              padding: '13px', borderRadius: 6, border: 'none',
              background: joinCode.length >= 4
                ? 'linear-gradient(135deg, #0f766e, #0369a1)'
                : 'rgba(100,116,139,0.2)',
              color: joinCode.length >= 4 ? 'white' : '#475569',
              fontWeight: 700, fontSize: 14, cursor: joinCode.length >= 4 ? 'pointer' : 'default',
              letterSpacing: 1, textTransform: 'uppercase', transition: 'all 0.2s',
            }}
          >
            {loading ? 'Joining...' : '→ JOIN ROOM'}
          </button>
        </div>
      )}

      {/* ── BROWSE tab ── */}
      {tab === 'browse' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: 11, letterSpacing: 1, fontFamily: 'monospace' }}>
              OPEN ROOMS ({rooms.length})
            </p>
            <button
              onClick={fetchRooms}
              style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', fontSize: 12 }}
            >
              ↻ Refresh
            </button>
          </div>
          {rooms.length === 0 ? (
            <p style={{ color: '#475569', fontSize: 12, fontFamily: 'monospace', padding: '16px 0', textAlign: 'center' }}>
              No open rooms. Create one!
            </p>
          ) : (
            <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rooms.map(room => (
                <div
                  key={room.room_code}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(139,92,246,0.2)',
                    borderRadius: 6,
                  }}
                >
                  <div>
                    <code style={{ color: '#a78bfa', fontWeight: 700, fontSize: 14 }}>
                      {room.room_code}
                    </code>
                    <span style={{ color: '#64748b', fontSize: 11, marginLeft: 10, fontFamily: 'monospace' }}>
                      {room.player_count}/{room.max_players} · {room.difficulty?.toUpperCase()}
                    </span>
                  </div>
                  <button
                    onClick={() => handleJoin(room.room_code)}
                    style={{
                      padding: '5px 12px', borderRadius: 4, border: 'none',
                      background: 'rgba(139,92,246,0.3)',
                      color: '#c4b5fd', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    }}
                  >
                    Join →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   SCREEN: Waiting Room (after joining a room)
   ══════════════════════════════════════════════════════════════ */
const PLAYER_COLORS = ['#3b82f6','#22c55e','#ec4899','#a855f7','#eab308','#f97316','#06b6d4','#ef4444','#14b8a6','#8b5cf6']

function WaitingRoom({ auth, room: initialRoom, onGameStarted }) {
  const [room,  setRoom]  = useState(initialRoom)
  const [error, setError] = useState('')
  const wsRef = useRef(null)

  const setRoomCode  = useGameStore((s) => s.setRoomCode)
  const setPlayerId  = useGameStore((s) => s.setPlayerName)
  const setPlayerName = useGameStore((s) => s.setPlayerName)
  const setRole      = useGameStore((s) => s.setRole)

  /* Handle player dictionary or array structure from server */
  const playersList = Array.isArray(room.players)
    ? room.players
    : Object.values(room.players || {})

  /* Connect lobby WebSocket */
  useEffect(() => {
    if (!auth.token) return
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const wsUrl    = `${protocol}://${window.location.hostname}:8000/ws/lobby/${room.room_code}/${auth.userId}`
    const ws       = new WebSocket(wsUrl)
    wsRef.current  = ws

    ws.onmessage = (event) => {
      try {
        const { type, payload } = JSON.parse(event.data)
        if (type === 'LOBBY_STATE' || type === 'LOBBY_STATE_UPDATE') {
          setRoom(payload)
        }
        if (type === 'ROLE_REVEAL') {
          onGameStarted(room.room_code, auth.userId, auth.username)
        }
      } catch (err) {
        console.error('Lobby WS error:', err)
      }
    }

    return () => ws.close()
  }, [auth.token, room.room_code, auth.userId, auth.username, onGameStarted])

  const toggleReady = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'TOGGLE_READY' }))
    }
  }

  const startGame = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'START_GAME' }))
    } else {
      // Offline/demo start
      onGameStarted(room.room_code, auth.userId, auth.username)
    }
  }

  const myPlayer = playersList.find(p => String(p.player_id || p.id) === String(auth.userId))
  const isHost   = String(room.host_id) === String(auth.userId)
  const allReady = playersList.length >= 1 && playersList.every(p => p.is_ready)

  return (
    <div style={{
      background: 'rgba(13,15,20,0.94)',
      border: '1.5px solid rgba(139,92,246,0.35)',
      borderRadius: '12px',
      padding: '28px 28px',
      width: '480px',
      boxShadow: '0 0 80px rgba(139,92,246,0.15)',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: '0 0 2px', color: '#7c3aed', fontSize: 10, letterSpacing: 2, fontFamily: 'monospace' }}>
          WAITING ROOM
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ margin: 0, color: '#e2e8f0', fontSize: 20, fontWeight: 800 }}>
            ROOM: <span style={{ color: '#a78bfa', letterSpacing: 3 }}>{room.room_code}</span>
          </h2>
          <button
            onClick={() => navigator.clipboard?.writeText(room.room_code)}
            style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.35)', color: '#a78bfa', padding: '3px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}
          >
            📋 Copy
          </button>
        </div>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 11, fontFamily: 'monospace' }}>
          {room.difficulty?.toUpperCase()} · {room.players?.length ?? 0}/{room.max_players} players
        </p>
      </div>

      {/* Player list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16, minHeight: 100 }}>
        {playersList.map((p, i) => (
          <div key={p.player_id || p.id || i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(139,92,246,0.2)',
            borderRadius: 6,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: PLAYER_COLORS[i % PLAYER_COLORS.length],
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 13, color: 'white', flexShrink: 0,
            }}>
              {(p.username || '?')[0].toUpperCase()}
            </div>
            <span style={{ flex: 1, color: '#e2e8f0', fontWeight: 600, fontSize: 13 }}>
              {p.username}{String(p.player_id || p.id) === String(room.host_id) ? ' 👑' : ''}
            </span>
            <span style={{
              fontSize: 11, fontFamily: 'monospace', fontWeight: 700,
              color: p.is_ready ? '#22c55e' : '#64748b',
            }}>
              {p.is_ready ? '✓ READY' : 'WAITING'}
            </span>
          </div>
        ))}
        {/* Empty slots */}
        {Array.from({ length: Math.max(0, (room.max_players || 4) - playersList.length) }).map((_, i) => (
          <div key={`empty-${i}`} style={{
            padding: '8px 12px', border: '1px dashed rgba(100,116,139,0.2)',
            borderRadius: 6, color: '#374151', fontSize: 12, fontFamily: 'monospace',
          }}>
            — Waiting for player...
          </div>
        ))}
      </div>

      {error && (
        <p style={{ margin: '0 0 10px', color: '#fca5a5', fontSize: 12, fontFamily: 'monospace', background: 'rgba(239,68,68,0.1)', padding: '6px 10px', borderRadius: 4 }}>
          {error}
        </p>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          id="toggle-ready-btn"
          onClick={toggleReady}
          style={{
            flex: 1, padding: '11px', border: '1.5px solid',
            borderColor: myPlayer?.is_ready ? '#22c55e' : 'rgba(139,92,246,0.5)',
            borderRadius: 6,
            background: myPlayer?.is_ready ? 'rgba(34,197,94,0.15)' : 'rgba(139,92,246,0.1)',
            color: myPlayer?.is_ready ? '#86efac' : '#a78bfa',
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}
        >
          {myPlayer?.is_ready ? '✓ READY' : '○ READY UP'}
        </button>
        {(isHost || true) && (
          <button
            id="start-game-btn"
            onClick={startGame}
            style={{
              flex: 1, padding: '11px', border: 'none', borderRadius: 6,
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}
          >
            ▶ START GAME
          </button>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   FEATURES STRIP
   ══════════════════════════════════════════════════════════════ */
const FEATURES = [
  { icon: '👥', title: '4–10 PLAYERS',      desc: 'Real-time multiplayer mystery' },
  { icon: '🔍', title: 'DETECTIVE ROLE',    desc: 'Evidence board + CCTV analysis' },
  { icon: '🕵️', title: 'SOCIAL DEDUCTION', desc: 'Deceive, manipulate, and survive' },
  { icon: '🏛️', title: 'CHRIST CAMPUS',    desc: 'Faithful 3D campus recreation' },
  { icon: '📋', title: 'CAMPUS TASKS',      desc: 'Complete tasks as cover or clue' },
]

/* ══════════════════════════════════════════════════════════════
   MAIN HomeScreen
   ══════════════════════════════════════════════════════════════ */
export default function HomeScreen({ onPlay }) {
  const setRoomCode  = useGameStore((s) => s.setRoomCode)
  const setPlayerId  = useGameStore((s) => s.setPlayerId)
  const setPlayerName = useGameStore((s) => s.setPlayerName)

  /* lobby flow state */
  const [flow,  setFlow]  = useState('auth')  // auth | lobby | waiting
  const [auth,  setAuth]  = useState(null)
  const [room,  setRoom]  = useState(null)

  const handleAuth = (authData) => {
    setAuth(authData)
    setPlayerName(authData.username)
    setPlayerId(authData.userId)
    /* Guest offline → go straight to play */
    if (!authData.token) { onPlay(); return }
    setFlow('lobby')
  }

  const handleJoinedRoom = (roomData) => {
    setRoom(roomData)
    setRoomCode(roomData.room_code)
    setFlow('waiting')
  }

  const handleGameStarted = (roomCode, userId, username) => {
    setRoomCode(roomCode)
    setPlayerId(userId)
    setPlayerName(username)
    onPlay()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'radial-gradient(ellipse at 20% 50%, rgba(124,58,237,0.12) 0%, transparent 60%), #0d0f14',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      fontFamily: "'Inter', sans-serif",
    }} id="home-screen">

      {/* Animated background */}
      <RadarBg />

      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 28px',
        borderBottom: '1px solid rgba(139,92,246,0.12)',
        background: 'rgba(13,15,20,0.7)',
        backdropFilter: 'blur(8px)',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18, opacity: 0.8 }}>✝</span>
          <span style={{ fontWeight: 800, fontSize: 14, color: '#e2e8f0', letterSpacing: 2 }}>
            CAMPUS UNDERCOVER
          </span>
          <span style={{ fontSize: 11, color: '#7c3aed', fontFamily: 'monospace', letterSpacing: 1 }}>
            THE CHRIST MYSTERY
          </span>
        </div>
        <span style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace' }}>
          MCA Final Year Project · Christ University, Bengaluru · v2.0
        </span>
      </div>

      {/* Main content */}
      <div style={{ position: 'relative', zIndex: 5, textAlign: 'center' }}>

        {/* Title above the card */}
        {flow === 'auth' && (
          <div style={{ marginBottom: 24, textAlign: 'center' }}>
            <p style={{ margin: 0, color: '#7c3aed', fontSize: 11, letterSpacing: 3, fontFamily: 'monospace' }}>
              MCA FINAL YEAR PROJECT
            </p>
            <h1 style={{ margin: '6px 0 4px', color: '#e2e8f0', fontSize: 36, fontWeight: 900, letterSpacing: 1 }}>
              CAMPUS UNDERCOVER
            </h1>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>
              A social deduction mystery set in <strong style={{ color: '#a78bfa' }}>CHRIST University, Bengaluru</strong>
            </p>
          </div>
        )}

        {flow === 'auth'    && <AuthScreen    onAuth={handleAuth} />}
        {flow === 'lobby'   && <LobbyHub      auth={auth} onPlay={onPlay} onJoinedRoom={handleJoinedRoom} />}
        {flow === 'waiting' && room && (
          <WaitingRoom auth={auth} room={room} onGameStarted={handleGameStarted} />
        )}
      </div>

      {/* Feature strip */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        display: 'flex', justifyContent: 'center', gap: 0,
        borderTop: '1px solid rgba(139,92,246,0.15)',
        background: 'rgba(13,15,20,0.8)',
        backdropFilter: 'blur(6px)',
        zIndex: 10,
      }}>
        {FEATURES.map(f => (
          <div key={f.title} style={{
            flex: 1, padding: '12px 16px', textAlign: 'center',
            borderRight: '1px solid rgba(139,92,246,0.1)',
            maxWidth: 200,
          }}>
            <div style={{ fontSize: 18, marginBottom: 3 }}>{f.icon}</div>
            <p style={{ margin: 0, color: '#e2e8f0', fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>{f.title}</p>
            <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: 10 }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
