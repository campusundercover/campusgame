import React from 'react'
import useGameStore from '../../store/gameStore'
import { Navigation, MapPin } from 'lucide-react'

const AREA_WORLD_POSITIONS = {
  'Research Center':  [28, -20],
  'Computer Lab':     [28,   0],
  'Security Office':  [-30,  4],
  'MCA Department':   [ 8,  14],
  'Main Block':       [-10, -8],
  'Auditorium':       [-28,-28],
  'Library':          [-24, 22],
  'Cafeteria':        [ 32, 16],
}

export default function TaskCompass() {
  const playerPosition = useGameStore((s) => s.playerPosition)
  const cameraYaw = useGameStore((s) => s.cameraYaw)
  const activeTaskId = useGameStore((s) => s.activeTaskId)
  const taskStartedId = useGameStore((s) => s.taskStartedId)
  const tasks = useGameStore((s) => s.tasks)

  const trackedTaskId = taskStartedId || activeTaskId
  const trackedTask = tasks.find(t => t.task_id === trackedTaskId && !t.completed)

  if (!trackedTask || !playerPosition) return null

  const targetCoords = AREA_WORLD_POSITIONS[trackedTask.location]
  if (!targetCoords) return null

  const dx = targetCoords[0] - playerPosition[0]
  const dz = targetCoords[1] - playerPosition[2]
  const distance = Math.round(Math.sqrt(dx * dx + dz * dz))

  // World angle from player to target (Z is south in Three.js)
  const angleToTarget = Math.atan2(dx, dz)
  
  // Angle relative to camera view yaw
  let relativeAngle = angleToTarget - cameraYaw
  // Convert to degrees
  const angleDeg = (relativeAngle * 180) / Math.PI

  return (
    <div className="hud-task-compass" id="task-compass">
      <div className="compass-arrow-wrapper" style={{ transform: `rotate(${angleDeg}deg)` }}>
        <Navigation size={18} fill="#a78bfa" color="#8b5cf6" />
      </div>
      <div className="compass-info">
        <div className="compass-title-row">
          <span className="compass-task-name">{trackedTask.name}</span>
          <span className="compass-distance">{distance}m</span>
        </div>
        <div className="compass-location">
          <MapPin size={10} /> {trackedTask.location}
        </div>
      </div>
    </div>
  )
}
