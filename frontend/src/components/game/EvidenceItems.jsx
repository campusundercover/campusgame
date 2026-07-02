import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useGameStore from '../../store/gameStore'

/* GDD §11.1 — exact evidence glow colors */
const TYPE_GLOW = {
  DIGITAL:     '#00BFFF',   // electric blue
  PHYSICAL:    '#FFD700',   // gold
  TESTIMONIAL: '#90EE90',   // light green
  FABRICATED:  '#FF6B6B',   // alert red (only Detective sees warning)
}

/* Type display labels */
const TYPE_LABELS = {
  DIGITAL:     'DIGITAL',
  PHYSICAL:    'PHYSICAL',
  TESTIMONIAL: 'TESTIMONIAL',
  FABRICATED:  'DOCUMENT',   // disguised label per GDD
}

/* Area name → world [x, z] offset center */
const AREA_CENTERS = {
  'Research Center':  [28, -20],
  'Computer Lab':     [28, 0],
  'Security Office':  [-30, 4],
  'MCA Department':   [8, 14],
  'Main Block':       [-10, -8],
  'Auditorium':       [-28, -28],
  'Library':          [-24, 22],
  'Cafeteria':        [32, 16],
}

const COLLECT_RADIUS = 2.2

function SingleEvidenceItem({ item, index }) {
  const meshRef  = useRef()
  const glowRef  = useRef()
  const beamRef  = useRef()

  const glowColor = TYPE_GLOW[item.evidence_type] || '#8b5cf6'

  /* Resolve world position */
  const [ax, az] = AREA_CENTERS[item.area_found || item.area] || [0, 0]
  const spread = [(index % 4 - 1.5) * 1.8, (Math.floor(index / 4) % 3 - 1) * 1.8]
  const pos = item.position
    ? [item.position.x, 0.9, item.position.z]
    : [ax + spread[0], 0.9, az + spread[1]]

  const playerPosition          = useGameStore((s) => s.playerPosition)
  const ws                      = useGameStore((s) => s.ws)
  const incrementEvidenceCollected = useGameStore((s) => s.incrementEvidenceCollected)
  const removeWorldEvidence     = useGameStore((s) => s.removeWorldEvidence)

  useFrame((_, delta) => {
    const t = Date.now() * 0.001
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 1.4
      meshRef.current.position.y = pos[1] + Math.sin(t * 1.6 + index) * 0.12
    }

    const dx   = playerPosition[0] - pos[0]
    const dz   = playerPosition[2] - pos[2]
    const dist = Math.sqrt(dx * dx + dz * dz)
    const near = dist < COLLECT_RADIUS

    /* Glow ring pulses faster and brighter when player is near */
    if (glowRef.current) {
      const targetOpacity = near
        ? 0.55 + Math.sin(t * 6) * 0.25
        : 0.15 + Math.sin(t * 2) * 0.08
      glowRef.current.material.opacity = THREE.MathUtils.lerp(
        glowRef.current.material.opacity, targetOpacity, 0.12
      )
    }

    /* Beam brightens when near */
    if (beamRef.current) {
      const targetBeamOpacity = near ? 0.55 : 0.18
      beamRef.current.material.opacity = THREE.MathUtils.lerp(
        beamRef.current.material.opacity, targetBeamOpacity, 0.1
      )
    }
  })

  const handleClick = () => {
    if (ws) {
      ws.send(JSON.stringify({ action: 'COLLECT_EVIDENCE', evidence_id: item.evidence_id }))
    }
    incrementEvidenceCollected()
    removeWorldEvidence(item.evidence_id)
  }

  const dx   = playerPosition[0] - pos[0]
  const dz   = playerPosition[2] - pos[2]
  const dist = Math.sqrt(dx * dx + dz * dz)
  const near = dist < COLLECT_RADIUS

  return (
    <group position={pos} onClick={handleClick}>
      {/* ── Floating gem ── */}
      <mesh ref={meshRef} castShadow>
        <octahedronGeometry args={[0.26, 0]} />
        <meshStandardMaterial
          color={glowColor}
          emissive={glowColor}
          emissiveIntensity={near ? 1.2 : 0.6}
          roughness={0.05}
          metalness={0.9}
          toneMapped={false}
        />
      </mesh>

      {/* ── Point light halo ── */}
      <pointLight
        color={glowColor}
        intensity={near ? 1.4 : 0.5}
        distance={near ? 5.0 : 3.0}
        decay={2}
      />

      {/* ── Animated ground glow ring ── */}
      <mesh
        ref={glowRef}
        position={[0, -0.85, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.35, 0.75, 48]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* ── Secondary solid fill disk ── */}
      <mesh position={[0, -0.86, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.35, 48]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* ── Vertical beam ── */}
      <mesh ref={beamRef} position={[0, -0.4, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.9, 8]} />
        <meshBasicMaterial color={glowColor} transparent opacity={0.18} />
      </mesh>

      {/* ── 'E to collect' prompt plane (only when very near) ── */}
      {near && (
        <mesh position={[0, 0.8, 0]} rotation={[0, 0, 0]}>
          <planeGeometry args={[1.4, 0.3]} />
          <meshBasicMaterial color="#0a0813" transparent opacity={0.82} side={THREE.DoubleSide} />
        </mesh>
      )}
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
