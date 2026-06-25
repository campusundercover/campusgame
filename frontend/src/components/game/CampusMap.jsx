import React, { useMemo } from 'react'
import * as THREE from 'three'
import useGameStore from '../../store/gameStore'

/* ────────── Ground Plane ────────── */
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[120, 120]} />
      <meshStandardMaterial color="#0d1117" />
    </mesh>
  )
}

/* ────────── Grid Helper ────────── */
function CampusGrid() {
  const gridHelper = useMemo(() => {
    const grid = new THREE.GridHelper(120, 60, '#1a1a2e', '#0f0f1a')
    grid.position.y = 0.01
    return grid
  }, [])
  return <primitive object={gridHelper} />
}

/* ────────── Walkway Paths ────────── */
function Walkways() {
  const paths = [
    // Horizontal corridors
    { pos: [0, 0.02, -10], size: [60, 0.05, 2] },
    { pos: [0, 0.02, 10], size: [60, 0.05, 2] },
    // Vertical corridors
    { pos: [-10, 0.02, 0], size: [2, 0.05, 60] },
    { pos: [10, 0.02, 0], size: [2, 0.05, 60] },
    // Main quad center
    { pos: [0, 0.02, 0], size: [6, 0.05, 6] },
  ]

  return (
    <group>
      {paths.map((path, i) => (
        <mesh key={`path-${i}`} position={path.pos} receiveShadow>
          <boxGeometry args={path.size} />
          <meshStandardMaterial color="#161622" />
        </mesh>
      ))}
    </group>
  )
}

/* ────────── Single Building ────────── */
function Building({ area }) {
  const [w, h, d] = area.size
  const [x, _, z] = area.position
  const yPos = h / 2

  return (
    <group position={[x, 0, z]}>
      {/* Main body */}
      <mesh position={[0, yPos, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={area.color}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      {/* Roof accent */}
      <mesh position={[0, h + 0.15, 0]}>
        <boxGeometry args={[w + 0.4, 0.3, d + 0.4]} />
        <meshStandardMaterial color="#1a0a1a" roughness={0.5} metalness={0.3} />
      </mesh>

      {/* Window strips (front) */}
      {Array.from({ length: Math.floor(h / 2) }).map((_, floor) => (
        <mesh
          key={`window-f-${floor}`}
          position={[0, 1.5 + floor * 2, d / 2 + 0.01]}
        >
          <planeGeometry args={[w * 0.8, 0.6]} />
          <meshStandardMaterial
            color="#f5c542"
            emissive="#f5c542"
            emissiveIntensity={0.4}
            transparent
            opacity={0.7}
          />
        </mesh>
      ))}

      {/* Window strips (back) */}
      {Array.from({ length: Math.floor(h / 2) }).map((_, floor) => (
        <mesh
          key={`window-b-${floor}`}
          position={[0, 1.5 + floor * 2, -d / 2 - 0.01]}
          rotation={[0, Math.PI, 0]}
        >
          <planeGeometry args={[w * 0.8, 0.6]} />
          <meshStandardMaterial
            color="#f5c542"
            emissive="#f5c542"
            emissiveIntensity={0.3}
            transparent
            opacity={0.5}
          />
        </mesh>
      ))}

      {/* Area label (floating text plane) */}
      <mesh position={[0, h + 1.5, 0]} rotation={[-0.3, 0, 0]}>
        <planeGeometry args={[w * 0.9, 1.2]} />
        <meshBasicMaterial color="#0a0813" transparent opacity={0.85} />
      </mesh>
    </group>
  )
}

/* ────────── Ambient Campus Lights ────────── */
function CampusLighting() {
  return (
    <>
      {/* Main scene fill */}
      <ambientLight intensity={0.15} color="#b8c0ff" />

      {/* Warm directional (sunset feel) */}
      <directionalLight
        position={[30, 40, 20]}
        intensity={0.6}
        color="#ffd4a0"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
      />

      {/* Cool fill from opposite side */}
      <directionalLight
        position={[-20, 30, -15]}
        intensity={0.2}
        color="#a0c4ff"
      />

      {/* Ground-level point lights near buildings */}
      <pointLight position={[0, 3, 0]} intensity={0.8} color="#f43f5e" distance={15} />
      <pointLight position={[-20, 2, -20]} intensity={0.4} color="#8b5cf6" distance={12} />
      <pointLight position={[20, 2, 0]} intensity={0.4} color="#f43f5e" distance={12} />
      <pointLight position={[0, 2, 20]} intensity={0.3} color="#f5c542" distance={10} />
    </>
  )
}

/* ────────── Sky Dome ────────── */
function SkyDome() {
  return (
    <mesh>
      <sphereGeometry args={[80, 32, 32]} />
      <meshBasicMaterial color="#050510" side={THREE.BackSide} />
    </mesh>
  )
}

/* ────────── Main Campus Map ────────── */
export default function CampusMap() {
  const campusAreas = useGameStore((state) => state.campusAreas)

  return (
    <group>
      <SkyDome />
      <CampusLighting />
      <Ground />
      <CampusGrid />
      <Walkways />
      {campusAreas.map((area) => (
        <Building key={area.id} area={area} />
      ))}
    </group>
  )
}
