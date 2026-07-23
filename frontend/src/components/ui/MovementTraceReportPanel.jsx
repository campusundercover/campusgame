import React from 'react'
import useGameStore from '../../store/gameStore'

export default function MovementTraceReportPanel() {
  const movementTraceReport = useGameStore((s) => s.movementTraceReport)
  const setMovementTraceReport = useGameStore((s) => s.setMovementTraceReport)
  const otherPlayers = useGameStore((s) => s.otherPlayers)
  const role = useGameStore((s) => s.role)

  if (role !== 'DETECTIVE' || !movementTraceReport) return null

  const { area, time_window_minutes, identified_presence = [] } = movementTraceReport

  const getPlayerName = (pid) => {
    const p = otherPlayers[pid]
    return p?.username || `Suspect #${pid}`
  }

  return (
    <div
      id="movement-trace-panel"
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 8000,
        width: '560px',
        maxHeight: '80vh',
        overflowY: 'auto',
        background: 'linear-gradient(160deg, #09120b 0%, #102416 100%)',
        border: '1.5px solid rgba(34, 197, 94, 0.4)',
        borderRadius: '8px',
        boxShadow: '0 0 50px rgba(34, 197, 94, 0.15), 0 25px 50px rgba(0,0,0,0.8)',
        fontFamily: "'Inter', sans-serif",
        color: '#e2e8f0',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 20px',
          borderBottom: '1px solid rgba(34, 197, 94, 0.2)',
          background: 'rgba(5, 20, 10, 0.8)',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '11px',
              color: '#22c55e',
              letterSpacing: '2px',
              fontFamily: "'JetBrains Mono', monospace",
              marginBottom: '2px',
            }}
          >
            📍 MOVEMENT TRACE LOG ANALYSIS (DE-ANONYMIZED)
          </div>
          <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: '17px', fontWeight: 700 }}>
            {area || 'Security Office'} ({time_window_minutes}m Window)
          </h3>
        </div>
        <button
          onClick={() => setMovementTraceReport(null)}
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
            padding: '6px 14px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontSize: '12px',
          }}
        >
          ✕ CLOSE
        </button>
      </div>

      {/* Identified Presence List */}
      <div style={{ padding: '20px' }}>
        <div
          style={{
            fontSize: '10px',
            color: '#86efac',
            fontFamily: 'monospace',
            letterSpacing: '1px',
            marginBottom: '12px',
          }}
        >
          IDENTIFIED INDIVIDUALS IN AREA ({identified_presence.length})
        </div>

        {identified_presence.length === 0 ? (
          <div
            style={{
              color: '#64748b',
              fontSize: '12px',
              fontFamily: 'monospace',
              padding: '20px',
              border: '1px dashed rgba(34, 197, 94, 0.3)',
              borderRadius: '4px',
              textAlign: 'center',
            }}
          >
            No clear clearance logs identified for this area window.
          </div>
        ) : (
          identified_presence.map((p, idx) => (
            <div
              key={idx}
              style={{
                background: 'rgba(34, 197, 94, 0.06)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderLeft: '3px solid #22c55e',
                borderRadius: '6px',
                padding: '12px 14px',
                marginBottom: '10px',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#f0fdf4' }}>
                  🕵️ {getPlayerName(p.player_id)}
                </span>
                <span style={{ fontSize: '11px', color: '#86efac' }}>
                  Dot #{p.color_index}
                </span>
              </div>
              <div style={{ fontSize: '11.5px', color: '#cbd5e1', lineHeight: '1.4' }}>
                Presence Duration: <strong>~{p.duration_seconds}s</strong><br />
                Timestamp Window: <strong>T+{p.first_seen}s → T+{p.last_seen}s</strong>
              </div>
            </div>
          ))
        )}

        <div
          style={{
            marginTop: '16px',
            padding: '10px 12px',
            background: 'rgba(34, 197, 94, 0.08)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '4px',
            fontSize: '11px',
            color: '#bbf7d0',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          💡 <strong>DOSSIER UPDATED:</strong> Confirmed sightings have been attached to Suspect Dossier files.
        </div>
      </div>
    </div>
  )
}
