import React, { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useGameStore from '../../store/gameStore'

// Map area names to world positions (same as campus map)
const AREA_WORLD_POSITIONS = {
  'Research Center':  [-20, -20],
  'Computer Lab':     [0, -20],
  'Security Office':  [20, -20],
  'MCA Department':   [-20, 0],
  'Main Block':       [0, 0],
  'Auditorium':       [20, 0],
  'Library':          [-20, 20],
  'Cafeteria':        [0, 20],
}

function SingleTaskZone({ task }) {
  const ringRef = useRef()
  const innerRef = useRef()
  const [hovered, setHovered] = useState(false)

  const playerPosition = useGameStore((s) => s.playerPosition)
  const ws = useGameStore((s) => s.ws)
  const playerId = useGameStore((s) => s.playerId)
  const updateTask = useGameStore((s) => s.updateTask)

  const [ax, az] = AREA_WORLD_POSITIONS[task.location] || [0, 0]
  const zonePos = [ax, 0.05, az]

  const isInZone = (() => {
    const dx = playerPosition[0] - ax
    const dz = playerPosition[2] - az
    return Math.sqrt(dx * dx + dz * dz) < 3.5
  })()

  useFrame((_, delta) => {
    if (!ringRef.current) return
    const t = Date.now() * 0.001
    ringRef.current.rotation.y = t * 0.5
    if (innerRef.current) {
      innerRef.current.rotation.y = -t * 0.8
    }
    // Scale pulse when player is near
    const scale = isInZone
      ? 1 + Math.sin(t * 4) * 0.05
      : 1.0
    ringRef.current.scale.setScalar(scale)
  })

  if (task.completed) return null

  return (
    <group position={zonePos}>
      {/* Outer ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.5, 3.0, 48]} />
        <meshBasicMaterial
          color={isInZone ? '#22c55e' : '#f59e0b'}
          transparent
          opacity={isInZone ? 0.6 : 0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Inner fill */}
      <mesh ref={innerRef} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.5, 48]} />
        <meshBasicMaterial
          color={isInZone ? '#22c55e' : '#f59e0b'}
          transparent
          opacity={isInZone ? 0.15 : 0.05}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Vertical beam */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 3, 8]} />
        <meshBasicMaterial
          color={isInZone ? '#22c55e' : '#f59e0b'}
          transparent
          opacity={isInZone ? 0.5 : 0.2}
        />
      </mesh>
    </group>
  )
}

export default function TaskZones() {
  const tasks = useGameStore((s) => s.tasks)
  return (
    <group>
      {tasks.map(task => (
        <SingleTaskZone key={task.task_id} task={task} />
      ))}
    </group>
  )
}
