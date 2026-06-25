import React, { useState } from 'react'
import useGameStore from '../../store/gameStore'

const TYPE_ICONS = {
  DIGITAL: '💻',
  PHYSICAL: '📄',
  TESTIMONIAL: '👁️',
  FABRICATED: '⚠️',
}

const TYPE_COLORS = {
  DIGITAL: '#3b82f6',
  PHYSICAL: '#f59e0b',
  TESTIMONIAL: '#22c55e',
  FABRICATED: '#ef4444',
}

function ReliabilityDots({ score }) {
  const filled = Math.round(score * 5)
  return (
    <span className="reliability-dots">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`reliability-dot ${i < filled ? 'filled' : ''}`}
        />
      ))}
    </span>
  )
}

function EvidenceCard({ item, isSelected, onSelect, onCorrelate, correlateMode }) {
  const color = TYPE_COLORS[item.evidence_type] || '#8b5cf6'
  return (
    <div
      className={`evidence-card ${isSelected ? 'selected' : ''} ${correlateMode ? 'correlate-mode' : ''}`}
      style={{ '--ev-color': color }}
      onClick={() => onSelect(item)}
    >
      <div className="evidence-card-header">
        <span className="evidence-type-icon">{TYPE_ICONS[item.evidence_type]}</span>
        <div>
          <p className="evidence-type-label">{item.evidence_type}</p>
          <p className="evidence-area">{item.area_found}</p>
        </div>
        <ReliabilityDots score={item.reliability_score} />
      </div>
      <p className="evidence-description">{item.description}</p>
      <div className="evidence-card-footer">
        <span className="evidence-points-to">→ {item.points_to_player_id || 'Unknown'}</span>
        {correlateMode && (
          <button
            className="correlate-link-btn"
            onClick={(e) => { e.stopPropagation(); onCorrelate(item) }}
          >
            Link
          </button>
        )}
      </div>
    </div>
  )
}

export default function EvidenceBoard() {
  const evidenceBoard = useGameStore((s) => s.evidenceBoard)
  const correlations = useGameStore((s) => s.correlations)
  const addCorrelation = useGameStore((s) => s.addCorrelation)
  const role = useGameStore((s) => s.role)

  const [isOpen, setIsOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [correlateMode, setCorrelateMode] = useState(false)
  const [correlateFrom, setCorrelateFrom] = useState(null)
  const [filterType, setFilterType] = useState('ALL')

  if (role !== 'DETECTIVE') return null

  const filtered = filterType === 'ALL'
    ? evidenceBoard
    : evidenceBoard.filter(e => e.evidence_type === filterType)

  const handleSelect = (item) => {
    if (correlateMode && correlateFrom) {
      if (correlateFrom.evidence_id !== item.evidence_id) {
        addCorrelation(correlateFrom.evidence_id, item.evidence_id)
      }
      setCorrelateFrom(null)
      setCorrelateMode(false)
    } else {
      setSelectedItem(item === selectedItem ? null : item)
    }
  }

  const handleCorrelate = (item) => {
    setCorrelateFrom(item)
    setCorrelateMode(true)
  }

  return (
    <>
      {/* Toggle button */}
      <button
        id="evidence-board-toggle"
        className={`evidence-board-toggle ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Evidence Board (Detective Only)"
      >
        🗂️
        {evidenceBoard.length > 0 && (
          <span className="evidence-count-badge">{evidenceBoard.length}</span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="evidence-board-panel" id="evidence-board-panel">
          <div className="evidence-board-header">
            <h3>🗂️ Evidence Board</h3>
            <span className="evidence-total">{evidenceBoard.length} items</span>
            <button className="panel-close-btn" onClick={() => setIsOpen(false)}>✕</button>
          </div>

          {/* Filters */}
          <div className="evidence-filters">
            {['ALL', 'DIGITAL', 'PHYSICAL', 'TESTIMONIAL', 'FABRICATED'].map(f => (
              <button
                key={f}
                className={`filter-btn ${filterType === f ? 'active' : ''}`}
                onClick={() => setFilterType(f)}
              >
                {f === 'ALL' ? 'All' : TYPE_ICONS[f]}
              </button>
            ))}
          </div>

          {/* Correlations indicator */}
          {correlations.length > 0 && (
            <div className="correlations-info">
              🔗 {correlations.length} correlation{correlations.length !== 1 ? 's' : ''} made
            </div>
          )}

          {correlateMode && (
            <div className="correlate-prompt">
              Select an item to link with <strong>{correlateFrom?.evidence_type}</strong>
              <button onClick={() => { setCorrelateMode(false); setCorrelateFrom(null) }}>Cancel</button>
            </div>
          )}

          {/* Evidence list */}
          <div className="evidence-list">
            {filtered.length === 0 && (
              <p className="evidence-empty">No evidence collected yet. Explore campus areas.</p>
            )}
            {filtered.map(item => (
              <EvidenceCard
                key={item.evidence_id}
                item={item}
                isSelected={selectedItem?.evidence_id === item.evidence_id}
                onSelect={handleSelect}
                onCorrelate={handleCorrelate}
                correlateMode={correlateMode && correlateFrom?.evidence_id !== item.evidence_id}
              />
            ))}
          </div>

          {!correlateMode && evidenceBoard.length >= 2 && (
            <button
              className="correlate-start-btn"
              onClick={() => setCorrelateMode(true)}
            >
              🔗 Correlate Evidence
            </button>
          )}
        </div>
      )}
    </>
  )
}
