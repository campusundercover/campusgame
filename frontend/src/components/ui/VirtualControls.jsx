import React, { useState, useEffect } from 'react'

export default function VirtualControls() {
  const [showControls, setShowControls] = useState(false)

  // Auto-enable touch controls if touch capability is detected
  useEffect(() => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    if (isTouch) {
      setShowControls(true)
    }
  }, [])

  const handlePress = (code) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code }))
  }

  const handleRelease = (code) => {
    window.dispatchEvent(new KeyboardEvent('keyup', { code }))
  }

  const handleTap = (key) => {
    // For single toggle keys like Tab (abilities)
    window.dispatchEvent(new KeyboardEvent('keydown', { key }))
  }

  if (!showControls) {
    return (
      <button
        id="virtual-controls-toggle-btn"
        className="virtual-controls-toggle"
        onClick={() => setShowControls(true)}
        title="Show Touch Controls (🎮)"
      >
        🎮
      </button>
    )
  }

  return (
    <div className="virtual-controls-wrapper" id="virtual-controls-panel">
      {/* Close button */}
      <button
        className="virtual-controls-close"
        onClick={() => setShowControls(false)}
        title="Hide Touch Controls"
      >
        ✕
      </button>

      {/* D-Pad on bottom left */}
      <div className="virtual-dpad">
        <button
          className="dpad-btn up"
          onMouseDown={() => handlePress('KeyW')}
          onMouseUp={() => handleRelease('KeyW')}
          onTouchStart={(e) => { e.preventDefault(); handlePress('KeyW') }}
          onTouchEnd={(e) => { e.preventDefault(); handleRelease('KeyW') }}
        >
          ▲
        </button>
        <div className="dpad-row">
          <button
            className="dpad-btn left"
            onMouseDown={() => handlePress('KeyA')}
            onMouseUp={() => handleRelease('KeyA')}
            onTouchStart={(e) => { e.preventDefault(); handlePress('KeyA') }}
            onTouchEnd={(e) => { e.preventDefault(); handleRelease('KeyA') }}
          >
            ◀
          </button>
          <button
            className="dpad-btn down"
            onMouseDown={() => handlePress('KeyS')}
            onMouseUp={() => handleRelease('KeyS')}
            onTouchStart={(e) => { e.preventDefault(); handlePress('KeyS') }}
            onTouchEnd={(e) => { e.preventDefault(); handleRelease('KeyS') }}
          >
            ▼
          </button>
          <button
            className="dpad-btn right"
            onMouseDown={() => handlePress('KeyD')}
            onMouseUp={() => handleRelease('KeyD')}
            onTouchStart={(e) => { e.preventDefault(); handlePress('KeyD') }}
            onTouchEnd={(e) => { e.preventDefault(); handleRelease('KeyD') }}
          >
            ▶
          </button>
        </div>
      </div>

      {/* Action Buttons on bottom right */}
      <div className="virtual-actions">
        <button
          className="action-btn sprint"
          onMouseDown={() => handlePress('ShiftLeft')}
          onMouseUp={() => handleRelease('ShiftLeft')}
          onTouchStart={(e) => { e.preventDefault(); handlePress('ShiftLeft') }}
          onTouchEnd={(e) => { e.preventDefault(); handleRelease('ShiftLeft') }}
        >
          🏃 Sprint
        </button>

        <button
          className="action-btn interact"
          onMouseDown={() => handlePress('KeyE')}
          onMouseUp={() => handleRelease('KeyE')}
          onTouchStart={(e) => { e.preventDefault(); handlePress('KeyE') }}
          onTouchEnd={(e) => { e.preventDefault(); handleRelease('KeyE') }}
        >
          ⚡ Interact (E)
        </button>

        <button
          className="action-btn ability-toggle"
          onClick={() => handleTap('Tab')}
        >
          ⚙️ Abilities
        </button>
      </div>
    </div>
  )
}
