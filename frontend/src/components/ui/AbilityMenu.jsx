import React, { useEffect } from 'react'
import useGameStore from '../../store/gameStore'

const ROLE_ABILITY_ICONS = {
  CCTV_ANALYSIS:      '📷',
  MOVEMENT_TRACE:     '📍',
  DIGITAL_ANALYSIS:   '💻',
  RECOVER_LOGS:       '🗄️',
  CORRELATE_EVIDENCE: '🔗',
  SUBMIT_OBSERVATION: '📝',
  PLANT_FAKE_EVIDENCE:'🎭',
  TRIGGER_MEETING:    '🔔',
  FRAME_PLAYER:       '🎯',
  MANIPULATE_NPC:     '🧠',
  DESTROY_EVIDENCE:   '🗑️',
  SECURE_PERIMETER:   '🔒',
  CREATE_ALIBI:       '📋',
}


function CooldownRing({ progress }) {
  const r = 18
  const circumference = 2 * Math.PI * r
  const dashoffset = circumference * (1 - progress)
  return (
    <svg className="cooldown-ring" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
      <circle
        cx="20" cy="20" r={r}
        fill="none"
        stroke="#f43f5e"
        strokeWidth="3"
        strokeDasharray={circumference}
        strokeDashoffset={dashoffset}
        strokeLinecap="round"
        transform="rotate(-90 20 20)"
      />
    </svg>
  )
}

function AbilityButton({ ability, onUse }) {
  const progress = ability.is_on_cooldown
    ? (ability.cooldown_remaining / (ability.cooldown_remaining + 1))
    : 0

  return (
    <button
      className={`ability-btn ${ability.is_on_cooldown || ability.uses_remaining <= 0 ? 'disabled' : ''}`}
      onClick={() => !ability.is_on_cooldown && ability.uses_remaining > 0 && onUse(ability)}
      title={ability.description}
      id={`ability-${ability.ability_id}`}
    >
      <div className="ability-btn-inner">
        {ability.is_on_cooldown && <CooldownRing progress={1 - progress} />}
        <span className="ability-btn-icon">
          {ROLE_ABILITY_ICONS[ability.ability_id] || '⚡'}
        </span>
      </div>
      <p className="ability-btn-label">{ability.name}</p>
      {ability.is_on_cooldown && (
        <p className="ability-cooldown-text">{ability.cooldown_remaining}s</p>
      )}
      {!ability.is_on_cooldown && ability.max_uses < 99 && (
        <p className="ability-uses-text">{ability.uses_remaining}/{ability.max_uses}</p>
      )}
    </button>
  )
}

export default function AbilityMenu() {
  const abilities = useGameStore((s) => s.abilities)
  const abilityMenuOpen = useGameStore((s) => s.abilityMenuOpen)
  const toggleAbilityMenu = useGameStore((s) => s.toggleAbilityMenu)
  const updateAbility = useGameStore((s) => s.updateAbility)
  const ws = useGameStore((s) => s.ws)

  // Tab key toggle
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Tab') {
        e.preventDefault()
        toggleAbilityMenu()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleAbilityMenu])

  const handleUse = (ability) => {
    if (!ws) return
    ws.send(JSON.stringify({
      action: 'USE_ABILITY',
      ability_id: ability.ability_id,
    }))
  }

  if (abilities.length === 0) return null

  return (
    <>
      {/* Tab hint */}
      {!abilityMenuOpen && (
        <div className="ability-hint" id="ability-hint">
          <kbd>Tab</kbd> Abilities
        </div>
      )}

      {/* Menu overlay */}
      {abilityMenuOpen && (
        <div className="ability-menu-overlay" id="ability-menu" onClick={toggleAbilityMenu}>
          <div className="ability-menu-panel" onClick={(e) => e.stopPropagation()}>
            <div className="ability-menu-header">
              <h3>⚡ ABILITIES</h3>
              <button className="panel-close-btn" onClick={toggleAbilityMenu}>✕</button>
            </div>
            <div className="ability-grid">
              {abilities.map(ab => (
                <AbilityButton key={ab.ability_id} ability={ab} onUse={handleUse} />
              ))}
            </div>
            <p className="ability-menu-hint">Press <kbd>Tab</kbd> to close</p>
          </div>
        </div>
      )}
    </>
  )
}
