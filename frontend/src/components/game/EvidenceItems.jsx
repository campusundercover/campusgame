import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useGameStore from '../../store/gameStore'

const TYPE_COLORS = {
  DIGITAL: '#3b82f6',
  PHYSICAL: '#f59e0b',
  TESTIMONIAL: '#22c55e',
  FABRICATED: '#ef4444',
}

// Map area name -> world [x, z] for evidence spawning
const AREA_CENTERS = {
  'Research Center':  [-20, -20],
  'Computer Lab':     [0, -20],
  'Security Office':  [20, -20],
  'MCA Department':   [-20, 0],
  'Main Block':       [0, 0],
  'Auditorium':       [20, 0],
  'Library':          [-20, 20],
  'Cafeteria':        [0, 20],
}

function SingleEvidenceItem({ item, index }) {
  const meshRef = useRef()
  const glowRef = useRef()
  const color = TYPE_COLORS[item.evidence_type] || '#8b5cf6'

  const [ax, az] = AREA_CENTERS[item.area_found] || [0, 0]
  // Spread items within the area
  const offset = [(index % 3 - 1) * 2.5, (Math.floor(index / 3) % 3 - 1) * 2.5]
  const pos = [ax + offset[0], 0.8, az + offset[1]]

  const playerPosition = useGameStore((s) => s.playerPosition)
  const ws = useGameStore((s) => s.ws)
  const playerId = useGameStore((s) => s.playerId)
  const incrementEvidenceCollected = useGameStore((s) => s.incrementEvidenceCollected)
  const removeWorldEvidence = useGameStore((s) => s.removeWorldEvidence)

  useFrame((_, delta) => {
    if (!meshRef.current) return
    meshRef.current.rotation.y += delta * 1.5
    meshRef.current.position.y = 0.8 + Math.sin(Date.now() * 0.002 + index) * 0.15

    // Check proximity for collection
    const dx = playerPosition[0] - pos[0]
    const dz = playerPosition[2] - pos[2]
    const dist = Math.sqrt(dx * dx + dz * dz)

    if (dist < 1.8) {
      if (glowRef.current) {
        glowRef.current.material.opacity = THREE.MathUtils.lerp(
          glowRef.current.material.opacity, 0.6, 0.1
        )
      }
    } else {
      if (glowRef.current) {
        glowRef.current.material.opacity = THREE.MathUtils.lerp(
          glowRef.current.material.opacity, 0.2, 0.1
        )
      }
    }
  })

  const handleClick = () => {
    if (ws) {
      ws.send(JSON.stringify({ action: 'COLLECT_EVIDENCE', evidence_id: item.evidence_id }))
    }
    incrementEvidenceCollected()
    removeWorldEvidence(item.evidence_id)
  }

  return (
    <group position={pos} onClick={handleClick}>
      {/* Floating gem */}
      <mesh ref={meshRef} castShadow>
        <octahedronGeometry args={[0.25, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          roughness={0.1}
          metalness={0.8}
        />
      </mesh>

      {/* Ground glow ring */}
      <mesh ref={glowRef} position={[0, -0.75, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.6, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>

      {/* Vertical beam */}
      <mesh position={[0, -0.4, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} />
      </mesh>
    </group>
  )
}

export default function EvidenceItems() {
  const worldEvidence = useGameStore((s) => s.worldEvidence)

  return (
    <group>
      {worldEvidence.map((item, i) => (
        <SingleEvidenceItem key={item.evidence_id} item={item} index={i} />
      ))}
    </group>
  )
}
