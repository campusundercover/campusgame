import React from 'react'
import useGameStore from '../../store/gameStore'

const TASK_TYPE_ICONS = {
  REPAIR_NETWORK: '🔧',
  ARCHIVE_FILES: '📁',
  SUBMIT_ATTENDANCE: '📋',
  CHECK_CCTV: '📷',
  RETRIEVE_PRINT: '🖨️',
  RESTOCK_LAB: '🧪',
  SETUP_AUDITORIUM: '🎭',
  PLACE_LUNCH: '🍽️',
}

function TaskItem({ task }) {
  const ws = useGameStore((s) => s.ws)
  const playerId = useGameStore((s) => s.playerId)
  const currentArea = useGameStore((s) => s.currentArea)
  const isInZone = currentArea === task.location

  const progressPercent = Math.round(task.progress * 100)
  const icon = TASK_TYPE_ICONS[task.task_type] || '📌'

  return (
    <div className={`task-item ${task.completed ? 'completed' : ''} ${isInZone && !task.completed ? 'active-zone' : ''}`}>
      <div className="task-item-header">
        <span className="task-icon">{icon}</span>
        <div className="task-info">
          <p className="task-name">{task.name}</p>
          <p className="task-location">📍 {task.location}</p>
        </div>
        <span className="task-points">+{task.points}pts</span>
      </div>

      {!task.completed && (
        <div className="task-progress-bar">
          <div
            className="task-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {task.completed && (
        <div className="task-complete-badge">✓ Complete</div>
      )}

      {isInZone && !task.completed && (
        <p className="task-zone-hint">Hold <kbd>E</kbd> to perform task</p>
      )}
    </div>
  )
}

export default function TaskList() {
  const tasks = useGameStore((s) => s.tasks)
  const completed = tasks.filter(t => t.completed).length

  if (tasks.length === 0) return null

  return (
    <div className="task-list-panel" id="task-list">
      <div className="task-list-header">
        <span className="task-list-title">TASKS</span>
        <span className="task-list-progress">{completed}/{tasks.length}</span>
      </div>
      <div className="task-items">
        {tasks.map(task => (
          <TaskItem key={task.task_id} task={task} />
        ))}
      </div>
    </div>
  )
}
