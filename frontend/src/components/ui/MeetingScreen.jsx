import React, { useEffect, useRef } from 'react'
import useGameStore from '../../store/gameStore'

function CountdownRing({ timeRemaining, total }) {
  const r = 36
  const circumference = 2 * Math.PI * r
  const progress = timeRemaining / total
  const dashoffset = circumference * (1 - progress)
  const isUrgent = timeRemaining <= 20

  return (
    <svg className="meeting-countdown-ring" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
      <circle
        cx="40" cy="40" r={r}
        fill="none"
        stroke={isUrgent ? '#ef4444' : '#f59e0b'}
        strokeWidth="5"
        strokeDasharray={circumference}
        strokeDashoffset={dashoffset}
        strokeLinecap="round"
        transform="rotate(-90 40 40)"
        style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
      />
      <text x="40" y="44" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold" fontFamily="Outfit, sans-serif">
        {timeRemaining}
      </text>
    </svg>
  )
}

export default function MeetingScreen() {
  const meetingActive = useGameStore((s) => s.meetingActive)
  const meetingTimeRemaining = useGameStore((s) => s.meetingTimeRemaining)
  const setMeetingTimeRemaining = useGameStore((s) => s.setMeetingTimeRemaining)
  const setMeetingActive = useGameStore((s) => s.setMeetingActive)
  const chatMessages = useGameStore((s) => s.chatMessages)
  const ws = useGameStore((s) => s.ws)
  const playerId = useGameStore((s) => s.playerId)
  const playerName = useGameStore((s) => s.playerName)

  const timerRef = useRef(null)
  const inputRef = useRef(null)
  const [input, setInput] = React.useState('')

  // Filter only meeting-channel messages
  const meetingMessages = chatMessages.filter(m => m.channel === 'meeting')

  useEffect(() => {
    if (!meetingActive) return
    timerRef.current = setInterval(() => {
      setMeetingTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          setMeetingActive(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [meetingActive])

  if (!meetingActive) return null

  const sendMeetingMessage = () => {
    const msg = input.trim()
    if (!msg || !ws) return
    ws.send(JSON.stringify({ action: 'CHAT_MESSAGE', channel: 'meeting', message: msg }))
    setInput('')
  }

  return (
    <div className="meeting-overlay" id="meeting-screen">
      <div className="meeting-panel">
        {/* Header */}
        <div className="meeting-header">
          <h2>🏛️ EMERGENCY MEETING</h2>
          <p className="meeting-sub">All players transported to the Auditorium</p>
        </div>

        {/* Timer */}
        <div className="meeting-timer">
          <CountdownRing timeRemaining={meetingTimeRemaining} total={90} />
          <p className="meeting-timer-label">DISCUSSION TIME</p>
        </div>

        {/* Chat area */}
        <div className="meeting-chat" id="meeting-chat-box">
          {meetingMessages.length === 0 && (
            <p className="meeting-chat-empty">Discussion has begun. Share your findings!</p>
          )}
          {meetingMessages.map((msg, i) => (
            <div key={i} className="meeting-chat-msg">
              <span className="meeting-chat-sender">{msg.sender_name}:</span>
              <span className="meeting-chat-text">{msg.message}</span>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="meeting-input-row">
          <input
            ref={inputRef}
            className="meeting-input"
            id="meeting-chat-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMeetingMessage()}
            placeholder="Speak to all players..."
            maxLength={300}
          />
          <button className="meeting-send-btn" onClick={sendMeetingMessage}>Send</button>
        </div>
      </div>
    </div>
  )
}
