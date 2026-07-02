import React, { useState } from 'react'
import useGameStore from '../../store/gameStore'

export default function AccusationScreen() {
  const gamePhase = useGameStore((s) => s.gamePhase)
  const role = useGameStore((s) => s.role)
  const ws = useGameStore((s) => s.ws)
  const roomCode = useGameStore((s) => s.roomCode)

  // We'd normally have a players list from the store; simulate with IDs
  // In production these come from lobby_manager broadcasts
  const [mastermindsuspect, setMastermindsuspect] = useState('')
  const [conspiratorsuspect, setConspiratorSuspect] = useState('')
  const [submitted, setSubmitted] = useState(false)

  // Pull player list from other players + self
  const otherPlayers = useGameStore((s) => s.otherPlayers)
  const playerId = useGameStore((s) => s.playerId)
  const playerName = useGameStore((s) => s.playerName)

  const allPlayers = [
    { id: String(playerId), name: playerName },
    ...Object.entries(otherPlayers).map(([id, data]) => ({ id, name: data.username || id })),
  ]

  if (gamePhase !== 'accusation') return null

  const handleSubmit = () => {
    if (!mastermindsuspect || !conspiratorsuspect) return
    if (mastermindsuspect === conspiratorsuspect) return
    if (!ws) return
    ws.send(JSON.stringify({
      action: 'SUBMIT_ACCUSATION',
      mastermind_accusation: mastermindsuspect,
      conspirator_accusation: conspiratorsuspect,
    }))
    setSubmitted(true)
  }

  return (
    <div className="accusation-overlay" id="accusation-screen">
      <div className="accusation-panel">
        <div className="accusation-header">
          <h2>⚖️ FINAL ACCUSATION</h2>
          <p className="accusation-sub">
            {role === 'DETECTIVE'
              ? 'The investigation is over. Identify the criminal pair.'
              : 'Waiting for the Detective to submit their accusation...'}
          </p>
        </div>

        {role === 'DETECTIVE' && !submitted && (
          <>
            <div className="accusation-form">
              <div className="accusation-field">
                <label>Who is the MASTERMIND?</label>
                <div className="player-select-grid">
                  {allPlayers.map(p => (
                    <button
                      key={p.id}
                      className={`player-select-btn ${mastermindsuspect === p.id ? 'selected mastermind' : ''}`}
                      onClick={() => {
                        setMastermindsuspect(p.id)
                        if (conspiratorsuspect === p.id) setConspiratorSuspect('')
                      }}
                    >
                      🕵️ {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="accusation-field">
                <label>Who is the CONSPIRATOR?</label>
                <div className="player-select-grid">
                  {allPlayers.filter(p => p.id !== mastermindsuspect).map(p => (
                    <button
                      key={p.id}
                      className={`player-select-btn ${conspiratorsuspect === p.id ? 'selected conspirator' : ''}`}
                      onClick={() => setConspiratorSuspect(p.id)}
                    >
                      🔪 {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <button
                id="submit-accusation-btn"
                className={`accusation-submit-btn ${(!mastermindsuspect || !conspiratorsuspect) ? 'disabled' : ''}`}
                onClick={handleSubmit}
                disabled={!mastermindsuspect || !conspiratorsuspect}
              >
                ⚖️ SUBMIT ACCUSATION
              </button>
            </div>
          </>
        )}

        {(role !== 'DETECTIVE' || submitted) && (
          <div className="accusation-waiting">
            <div className="waiting-spinner" />
            <p>{submitted ? 'Accusation submitted. Awaiting verdict...' : "Awaiting Detective's accusation..."}</p>
          </div>
        )}
      </div>
    </div>
  )
}
