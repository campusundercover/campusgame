import React, { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useGameStore from '../../store/gameStore'

function SingleNPC({ npc }) {
  const bodyRef = useRef()
  const playerPosition = useGameStore((s) => s.playerPosition)
  const ws = useGameStore((s) => s.ws)
  const showNpcDialog = useGameStore((s) => s.showNpcDialog)

  const pos = [npc.position[0], 0, npc.position[1]]

  const isNear = (() => {
    const dx = playerPosition[0] - pos[0]
    const dz = playerPosition[2] - pos[2]
    return Math.sqrt(dx * dx + dz * dz) < 3.0
  })()

  useFrame((_, delta) => {
    if (!bodyRef.current) return
    // Gentle idle bob
    bodyRef.current.position.y = 1.0 + Math.sin(Date.now() * 0.001 + pos[0]) * 0.04
  })

  const handleInteract = () => {
    if (!isNear) return
    if (ws) {
      ws.send(JSON.stringify({ action: 'NPC_INTERACT', npc_id: npc.npc_id }))
    }
    // Show placeholder dialog immediately; real statement will arrive via WS
    showNpcDialog({
      npc_name: npc.name,
      statement: '...',
    })
  }

  return (
    <group position={pos} onClick={handleInteract}>
      {/* Body capsule */}
      <mesh ref={bodyRef} castShadow>
        <capsuleGeometry args={[0.28, 0.6, 8, 16]} />
        <meshStandardMaterial
          color="#7c3aed"
          roughness={0.5}
          metalness={0.1}
        />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.22, 0]} castShadow>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#fde68a" roughness={0.4} />
      </mesh>

      {/* Interaction indicator */}
      {isNear && (
        <mesh position={[0, 2.0, 0]} rotation={[-Math.PI / 4, 0, 0]}>
          <planeGeometry args={[1.2, 0.4]} />
          <meshBasicMaterial color="#0a0813" transparent opacity={0.8} />
        </mesh>
      )}

      {/* Ground marker */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 32]} />
        <meshBasicMaterial
          color={isNear ? '#8b5cf6' : '#3b0f6d'}
          transparent opacity={0.4}
        />
      </mesh>
    </group>
  )
}

export default function NPCCharacters() {
  const npcs = useGameStore((s) => s.npcs)
  return (
    <group>
      {npcs.map(npc => (
        <SingleNPC key={npc.npc_id} npc={npc} />
      ))}
    </group>
  )
}
