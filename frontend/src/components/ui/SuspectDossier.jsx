import React from 'react'
import useGameStore from '../../store/gameStore'

export default function SuspectDossier({ onSelectEvidenceCard }) {
  const suspectDossier = useGameStore((s) => s.suspectDossier)
  const role = useGameStore((s) => s.role)
  const otherPlayers = useGameStore((s) => s.otherPlayers)
  const setPrefilledMastermindSuspect = useGameStore((s) => s.setPrefilledMastermindSuspect)
  const setGamePhase = useGameStore((s) => s.setGamePhase)

  if (role !== 'DETECTIVE') return null

  const getPlayerName = (pid) => {
    const p = otherPlayers[pid]
    return p?.username || `Suspect #${pid}`
  }

  const handleAccuseClick = (pid) => {
    setPrefilledMastermindSuspect(String(pid))
    setGamePhase('accusation')
  }

  return (
    <div
      className="suspect-dossier-container"
      style={{
        padding: '24px 30px',
        height: 'calc(100vh - 80px)',
        overflowY: 'auto',
        color: '#f5d0a9',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontFamily: "'Cinzel', serif", fontSize: '22px', color: '#f5d0a9', letterSpacing: '1px' }}>
            🗂 SUSPECT DOSSIER FILES
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#a38a6d', fontFamily: "'JetBrains Mono', monospace" }}>
            Compiled intelligence records & suspicion index based on evidence correlations and trace logs.
          </p>
        </div>
        <div style={{ fontSize: '11px', background: 'rgba(178, 34, 34, 0.2)', border: '1px solid #b22222', color: '#fca5a5', padding: '4px 10px', borderRadius: '4px', fontFamily: 'monospace' }}>
          CONFIDENTIAL · DETECTIVE EYES ONLY
        </div>
      </div>

      {suspectDossier.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#8c7d6c', fontFamily: "'JetBrains Mono', monospace" }}>
          No suspect dossier data compiled yet.<br />Collect clues or execute Movement Trace at Security Office to generate intelligence reports.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '20px',
          }}
        >
          {suspectDossier.map((suspect) => {
            const score = suspect.suspicion_score || 0
            let scoreColor = '#22c55e'
            if (score >= 60) scoreColor = '#ef4444'
            else if (score >= 30) scoreColor = '#f59e0b'

            return (
              <div
                key={suspect.player_id}
                style={{
                  background: 'linear-gradient(145deg, #1c150c 0%, #291d12 100%)',
                  border: '1.5px solid rgba(200, 160, 80, 0.35)',
                  borderRadius: '8px',
                  padding: '18px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  position: 'relative',
                }}
              >
                {/* Manila Folder Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(200, 160, 80, 0.2)', paddingBottom: '10px' }}>
                  <div>
                    <span style={{ fontSize: '10px', color: '#8c7d6c', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' }}>
                      CASE FILE ID: #{suspect.player_id}
                    </span>
                    <h4 style={{ margin: '2px 0 0', fontSize: '17px', color: '#f5d0a9', fontFamily: "'Cinzel', serif" }}>
                      {getPlayerName(suspect.player_id)}
                    </h4>
                  </div>
                  <button
                    onClick={() => handleAccuseClick(suspect.player_id)}
                    style={{
                      background: 'linear-gradient(135deg, #b22222 0%, #7f1d1d 100%)',
                      color: '#ffffff',
                      border: '1px solid #ef4444',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      fontFamily: "'JetBrains Mono', monospace",
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(178,34,34,0.4)',
                    }}
                  >
                    🎯 ACCUSE
                  </button>
                </div>

                {/* Suspicion Meter Bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", marginBottom: '4px' }}>
                    <span style={{ color: '#a38a6d' }}>SUSPICION SCORE</span>
                    <span style={{ color: scoreColor, fontWeight: 'bold' }}>{score} / 100</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(0,0,0,0.5)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${score}%`,
                        background: scoreColor,
                        borderRadius: '4px',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>

                {/* Stats chips */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ background: 'rgba(0,0,0,0.4)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontFamily: "'JetBrains Mono', monospace" }}>
                    🔍 Evidence Count: <strong>{suspect.evidence_count}</strong>
                  </div>
                  {suspect.avg_reliability > 0 && (
                    <div style={{ background: 'rgba(0,0,0,0.4)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontFamily: "'JetBrains Mono', monospace" }}>
                      ⭐ Avg Rel: <strong>{(suspect.avg_reliability * 100).toFixed(0)}%</strong>
                    </div>
                  )}
                </div>

                {/* Implicated Locations */}
                {suspect.areas_implicated && suspect.areas_implicated.length > 0 && (
                  <div>
                    <div style={{ fontSize: '10px', color: '#8c7d6c', fontFamily: "'JetBrains Mono', monospace", marginBottom: '4px' }}>
                      IMPLICATED LOCATIONS
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {suspect.areas_implicated.map((area, idx) => (
                        <span key={idx} style={{ background: 'rgba(200, 160, 80, 0.12)', border: '1px solid rgba(200, 160, 80, 0.25)', color: '#d4a847', padding: '2px 6px', borderRadius: '3px', fontSize: '10px', fontFamily: "'JetBrains Mono', monospace" }}>
                          📍 {area}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Movement Trace confirmed sightings vs locked */}
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {suspect.visited_areas && suspect.visited_areas.length > 0 ? (
                    <div>
                      <div style={{ fontSize: '11px', color: '#22c55e', fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold', marginBottom: '6px' }}>
                        📍 CONFIRMED SIGHTINGS (MOVEMENT TRACE)
                      </div>
                      {suspect.visited_areas.map((sight, idx) => (
                        <div key={idx} style={{ fontSize: '10.5px', color: '#cbd5e1', fontFamily: "'JetBrains Mono', monospace", marginBottom: '3px' }}>
                          • {sight.area} (~{sight.duration_seconds}s presence)
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '10.5px', color: '#8c7d6c', fontFamily: "'JetBrains Mono', monospace" }}>
                      🔒 Location unconfirmed — execute Movement Trace at Security Office to verify movement logs.
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
