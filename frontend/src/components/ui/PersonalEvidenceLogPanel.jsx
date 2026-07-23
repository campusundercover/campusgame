import React, { useState } from 'react'
import useGameStore from '../../store/gameStore'
import { TYPE_ICONS, TYPE_COLORS, ReliabilityStars } from '../../utils/evidenceVisuals'

export default function PersonalEvidenceLogPanel() {
  const personalEvidenceLog = useGameStore((s) => s.personalEvidenceLog)
  const role = useGameStore((s) => s.role)
  const [isOpen, setIsOpen] = useState(false)

  // Visible to non-detectives (or everyone as personal log, but requirement highlights non-detectives)
  if (role === 'DETECTIVE') return null

  return (
    <>
      {/* HUD Trigger Button */}
      <button
        id="personal-clues-toggle"
        onClick={() => setIsOpen(!isOpen)}
        title="My Clues Log"
        style={{
          background: 'rgba(10, 8, 5, 0.85)',
          border: '1px solid rgba(200, 160, 80, 0.4)',
          borderRadius: '6px',
          color: '#f5d0a9',
          padding: '6px 12px',
          cursor: 'pointer',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
          transition: 'all 0.2s',
        }}
      >
        <span>📂 My Clues</span>
        {personalEvidenceLog.length > 0 && (
          <span
            style={{
              background: '#b22222',
              color: '#ffffff',
              borderRadius: '10px',
              padding: '1px 6px',
              fontSize: '10px',
              fontWeight: 'bold',
            }}
          >
            {personalEvidenceLog.length}
          </span>
        )}
      </button>

      {/* Modal / Panel */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9500,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justify: 'center',
            padding: '20px',
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '520px',
              maxHeight: '80vh',
              background: 'linear-gradient(160deg, #18120b 0%, #261b10 100%)',
              border: '1.5px solid rgba(200, 160, 80, 0.4)',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
              overflow: 'hidden',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 20px',
                borderBottom: '1px solid rgba(200, 160, 80, 0.2)',
                background: 'rgba(10, 8, 5, 0.8)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>📂</span>
                <h3 style={{ margin: 0, color: '#f5d0a9', fontSize: '16px', fontFamily: "'Cinzel', serif" }}>
                  PERSONAL CLUE LOG
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#a38a6d',
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                ✕
              </button>
            </div>

            {/* Content List */}
            <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
              {personalEvidenceLog.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    color: '#8c7d6c',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '12px',
                    padding: '30px 0',
                  }}
                >
                  No evidence collected yet.<br />Explore campus to find clues!
                </div>
              ) : (
                personalEvidenceLog.map((card, idx) => {
                  const evColor = TYPE_COLORS[card.evidence_type] || '#FFD700'
                  return (
                    <div
                      key={card.evidence_id || idx}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(200, 160, 80, 0.2)',
                        borderLeft: `3px solid ${evColor}`,
                        borderRadius: '6px',
                        padding: '12px 14px',
                        marginBottom: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', color: evColor, fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold' }}>
                          {TYPE_ICONS[card.evidence_type]} {card.evidence_type}
                        </span>
                        <span style={{ fontSize: '11px', color: '#8c7d6c', fontFamily: "'JetBrains Mono', monospace" }}>
                          📍 {card.area_found || card.area || 'Campus Grounds'}
                        </span>
                      </div>

                      <div style={{ fontSize: '12px', color: '#fbf0d9', lineHeight: '1.4' }}>
                        {card.description}
                      </div>

                      {card.analyst_note && (
                        <div style={{ fontSize: '11px', color: '#d4a847', fontStyle: 'italic', marginTop: '6px' }}>
                          💡 {card.analyst_note}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
