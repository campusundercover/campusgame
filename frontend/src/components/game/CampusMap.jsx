import React, { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useLoader, useFrame } from '@react-three/fiber'
import { TextureLoader, RepeatWrapping } from 'three'
import useGameStore from '../../store/gameStore'

/* ──────────────────────────────────────────────────────────────
   CAMPUS LAYOUT — Faithful to Christ University aerial view
   Positions mapped from the actual campus photo reference
   ────────────────────────────────────────────────────────────── */

const CAMPUS_BUILDINGS = [
  // Main Gate area
  {
    id: 'front_gate', name: 'Front Gate',
    pos: [0, 0, -42], size: [14, 5, 4],
    color: '#5a4a3a', roofColor: '#3a2a1a',
    facade: '/locations/main_gate.png',
    isGate: true,
  },
  // --- Top left block ---
  {
    id: 'audi_block', name: 'Auditorium',
    pos: [-28, 0, -28], size: [16, 9, 12],
    color: '#7c3412', roofColor: '#4a1a08',
    facade: '/locations/central_block.png',
    windows: true, floors: 4,
  },
  {
    id: 'junior_college', name: 'Junior College',
    pos: [-28, 0, -14], size: [18, 6, 8],
    color: '#7c2d12', roofColor: '#4a1a08',
    facade: '/locations/classroom.png',
    windows: true, floors: 3,
  },
  // --- Central Block (Hero building) ---
  {
    id: 'central_block', name: 'Main Block',
    pos: [-10, 0, -8], size: [22, 12, 18],
    color: '#8a3412', roofColor: '#5a1a08',
    facade: '/locations/central_block.png',
    windows: true, floors: 5, isHero: true,
  },
  // --- Right column ---
  {
    id: 'block_1', name: 'Research Center',
    pos: [28, 0, -20], size: [14, 8, 12],
    color: '#3b1c57', roofColor: '#1e0a2e',
    facade: '/locations/research_center.png',
    windows: true, floors: 4,
  },
  {
    id: 'computer_lab', name: 'Computer Lab',
    pos: [28, 0, 0], size: [14, 7, 12],
    color: '#1a1a4e', roofColor: '#0a0a2e',
    facade: '/locations/research_center.png',
    windows: true, floors: 3,
  },
  {
    id: 'canteen_right', name: 'Cafeteria',
    pos: [32, 0, 16], size: [10, 4, 8],
    color: '#7c3d00', roofColor: '#4a2400',
    facade: '/locations/cafeteria.png',
    windows: true, floors: 2,
  },
  // --- Middle area ---
  {
    id: 'block_2', name: 'MCA Department',
    pos: [8, 0, 14], size: [16, 8, 12],
    color: '#7c3412', roofColor: '#4a1a08',
    facade: '/locations/classroom.png',
    windows: true, floors: 4,
  },
  {
    id: 'security_office', name: 'Security Office',
    pos: [-30, 0, 4], size: [8, 4, 8],
    color: '#2d2d2d', roofColor: '#1a1a1a',
    facade: '/locations/research_center.png',
    windows: true, floors: 2,
  },
  // --- Lower area ---
  {
    id: 'library', name: 'Library',
    pos: [-24, 0, 22], size: [14, 7, 10],
    color: '#1a3a2d', roofColor: '#0a1a15',
    facade: '/locations/library.png',
    windows: true, floors: 3,
  },
  {
    id: 'block_4', name: 'Block 4',
    pos: [-10, 0, 30], size: [14, 7, 10],
    color: '#7c3412', roofColor: '#4a1a08',
    facade: '/locations/classroom.png',
    windows: true, floors: 3,
  },
  {
    id: 'she_block', name: 'She Block',
    pos: [-28, 0, 34], size: [10, 5, 8],
    color: '#7c185d', roofColor: '#4a0a38',
    facade: '/locations/classroom.png',
    windows: true, floors: 2,
  },
  {
    id: 'rd_block', name: 'R&D Block',
    pos: [-28, 0, 44], size: [12, 6, 8],
    color: '#3b1c57', roofColor: '#1e0a2e',
    facade: '/locations/research_center.png',
    windows: true, floors: 3,
  },
  {
    id: 'girls_hostel', name: 'Girls Hostel',
    pos: [6, 0, 40], size: [18, 6, 8],
    color: '#7c3412', roofColor: '#4a1a08',
    facade: '/locations/classroom.png',
    windows: true, floors: 3,
  },
  // Basketball courts
  {
    id: 'basketball_court', name: 'Basketball Court',
    pos: [20, 0, -32], size: [16, 0.2, 12],
    color: '#1d4ed8', roofColor: '#1d4ed8',
    isCourt: true,
  },
]

/* ── Paths / Roads ── */
const PATHS = [
  // Main central vertical spine
  { pos: [0, 0.02, 0], size: [4, 0.04, 100] },
  // Horizontal roads
  { pos: [0, 0.02, -30], size: [80, 0.04, 3] },
  { pos: [0, 0.02, 0],   size: [80, 0.04, 3] },
  { pos: [0, 0.02, 28],  size: [80, 0.04, 3] },
  // Side verticals
  { pos: [-22, 0.02, 0], size: [3, 0.04, 80] },
  { pos: [22, 0.02, 0],  size: [3, 0.04, 80] },
]

/* ── Green Zones (grass areas) ── */
const GREEN_ZONES = [
  { pos: [20, 0.01, -16], size: [16, 0.02, 12] },  // Park near courts
  { pos: [-5, 0.01, -38], size: [10, 0.02, 8] },   // Entry garden
  { pos: [14, 0.01, 24],  size: [12, 0.02, 14] },  // Mid campus park
  { pos: [-5, 0.01, 48],  size: [20, 0.02, 10] },  // Back garden
]

/* ── Street Lamps positions ── */
const LAMP_POSITIONS = [
  [-8, 0, -30], [8, 0, -30], [-8, 0, 0], [8, 0, 0],
  [-22, 0, -15], [22, 0, -15], [-22, 0, 14], [22, 0, 14],
  [0, 0, 14], [0, 0, -14], [-8, 0, 28], [8, 0, 28],
]

/* ── Trees positions ── */
const TREE_POSITIONS = [
  [-18, 0, -36], [-12, 0, -36], [12, 0, -36], [18, 0, -36],
  [24, 0, -14], [24, 0, -8], [24, 0, 18], [24, 0, 24],
  [-32, 0, -8], [-32, 0, 0], [-32, 0, 8],
  [-4, 0, 24], [4, 0, 24], [-4, 0, 38], [4, 0, 38],
  [16, 0, 30], [20, 0, 30], [-16, 0, 30],
]

/* ══════════════════════════════════════════════
   COMPONENTS
   ══════════════════════════════════════════════ */

/* ── Textured Ground ── */
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[120, 120]} />
      <meshStandardMaterial
        roughness={0.8}
        metalness={0.1}
        color="#cbd5e1"
      />
    </mesh>
  )
}

/* ── Grass Zones ── */
function GrassZone({ pos, size }) {
  return (
    <mesh position={pos} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[size[0], size[2]]} />
      <meshStandardMaterial
        roughness={0.9}
        color="#22c55e"
      />
    </mesh>
  )
}

/* ── Concrete Path ── */
function Path({ pos, size }) {
  return (
    <mesh position={pos} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#64748b" roughness={0.9} metalness={0} />
    </mesh>
  )
}

/* ── Street Lamp ── */
function StreetLamp({ pos }) {
  const timeRemaining = useGameStore((s) => s.timeRemaining)
  const timerSeconds = useGameStore((s) => s.timerSeconds)
  const elapsed = Math.max(0, timerSeconds - timeRemaining)
  const nightFactor = Math.min(1.0, elapsed / 600)

  return (
    <group position={pos}>
      {/* Pole */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 5, 8]} />
        <meshStandardMaterial color="#3a3530" roughness={0.5} metalness={0.6} />
      </mesh>
      {/* Arm */}
      <mesh position={[0.4, 4.8, 0]} rotation={[0, 0, -Math.PI / 6]}>
        <cylinderGeometry args={[0.04, 0.04, 1, 8]} />
        <meshStandardMaterial color="#3a3530" roughness={0.5} metalness={0.6} />
      </mesh>
      {/* Lamp head */}
      <mesh position={[0.85, 4.5, 0]}>
        <boxGeometry args={[0.35, 0.18, 0.22]} />
        <meshStandardMaterial
          color="#f1f5f9"
          emissive="#ffeebb"
          emissiveIntensity={nightFactor >= 0.4 ? 2.5 * nightFactor : 0}
          roughness={0.3}
        />
      </mesh>
      {/* Actual light source - turns on dynamically */}
      <pointLight
        position={[0.85, 4.3, 0]}
        intensity={nightFactor >= 0.4 ? 4.5 * nightFactor : 0}
        distance={12}
        color="#ffaa30"
        castShadow={nightFactor >= 0.6}
      />
    </group>
  )
}

/* ── Tree ── */
function Tree({ pos }) {
  const trunkH = 1.5 + Math.random() * 0.5
  const canopyR = 1.0 + Math.random() * 0.6
  return (
    <group position={pos}>
      {/* Trunk */}
      <mesh position={[0, trunkH / 2, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, trunkH, 7]} />
        <meshStandardMaterial color="#3b2a1a" roughness={0.95} />
      </mesh>
      {/* Canopy - layered cones for realism */}
      <mesh position={[0, trunkH + canopyR * 0.5, 0]} castShadow>
        <coneGeometry args={[canopyR, canopyR * 1.6, 8]} />
        <meshStandardMaterial color="#1a4a1a" roughness={0.8} />
      </mesh>
      <mesh position={[0, trunkH + canopyR * 1.1, 0]} castShadow>
        <coneGeometry args={[canopyR * 0.65, canopyR * 1.1, 7]} />
        <meshStandardMaterial color="#1f5a1f" roughness={0.8} />
      </mesh>
      <mesh position={[0, trunkH + canopyR * 1.6, 0]} castShadow>
        <coneGeometry args={[canopyR * 0.35, canopyR * 0.7, 6]} />
        <meshStandardMaterial color="#256325" roughness={0.8} />
      </mesh>
    </group>
  )
}

/* ── Building ── */
function Building({ b }) {
  const timeRemaining = useGameStore((s) => s.timeRemaining)
  const timerSeconds = useGameStore((s) => s.timerSeconds)
  const elapsed = Math.max(0, timerSeconds - timeRemaining)
  const nightFactor = Math.min(1.0, elapsed / 600)

  const [bw, bh, bd] = b.size
  const windowCols = Math.floor(bw / 2.5)
  const windowRows = b.floors || Math.floor(bh / 2.5)

  if (b.isCourt) {
    return (
      <group position={b.pos}>
        {/* Court surface */}
        <mesh position={[0, 0.1, 0]} receiveShadow>
          <boxGeometry args={[bw, 0.2, bd]} />
          <meshStandardMaterial color="#1d3fa8" roughness={0.4} />
        </mesh>
        {/* Court lines */}
        <mesh position={[0, 0.21, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[bw - 0.4, bd - 0.4]} />
          <meshBasicMaterial color="#2455cc" transparent opacity={0.5} />
        </mesh>
        {/* Center circle */}
        <mesh position={[0, 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.8, 2.0, 32]} />
          <meshBasicMaterial color="white" transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
        {/* Floodlights - turned off in daylight */}
        {[[-bw / 2 - 0.5, 0, -bd / 2 - 0.5], [bw / 2 + 0.5, 0, -bd / 2 - 0.5],
          [-bw / 2 - 0.5, 0, bd / 2 + 0.5], [bw / 2 + 0.5, 0, bd / 2 + 0.5]].map((lp, i) => (
          <group key={i} position={lp}>
            <mesh position={[0, 4, 0]}>
              <cylinderGeometry args={[0.07, 0.1, 8, 6]} />
              <meshStandardMaterial color="#2a2520" roughness={0.6} metalness={0.5} />
            </mesh>
            <mesh position={[0, 8.2, 0]}>
              <boxGeometry args={[0.6, 0.2, 0.4]} />
              <meshStandardMaterial color="#2a2520" emissive="#000000" emissiveIntensity={0} />
            </mesh>
            <pointLight position={[0, 7.5, 0]} intensity={0} distance={20} color="#e8f0ff" />
          </group>
        ))}
      </group>
    )
  }

  if (b.isGate) {
    return (
      <group position={b.pos}>
        {/* Gate arch */}
        <mesh position={[-4, bh / 2, 0]} castShadow>
          <boxGeometry args={[5, bh, bd]} />
          <meshStandardMaterial color="#7c2d12" roughness={0.7} />
        </mesh>
        <mesh position={[4, bh / 2, 0]} castShadow>
          <boxGeometry args={[5, bh, bd]} />
          <meshStandardMaterial color="#7c2d12" roughness={0.7} />
        </mesh>
        {/* Top arch */}
        <mesh position={[0, bh + 1, 0]} castShadow>
          <boxGeometry args={[14, 2.5, bd + 0.5]} />
          <meshStandardMaterial color="#5a3a20" roughness={0.7} />
        </mesh>
        {/* Gate light - disabled in daylight */}
        <pointLight position={[0, bh, 0]} intensity={0} distance={18} color="#ffcc60" />
        {/* Label billboard */}
        <mesh position={[0, bh + 2.8, -0.3]}>
          <planeGeometry args={[8, 1.2]} />
          <meshBasicMaterial color="#1a0800" />
        </mesh>
      </group>
    )
  }

  return (
    <group position={[b.pos[0], 0, b.pos[2]]}>
      {/* Foundation plinth */}
      <mesh position={[0, 0.2, 0]} receiveShadow>
        <boxGeometry args={[bw + 0.6, 0.4, bd + 0.6]} />
        <meshStandardMaterial color="#3a3028" roughness={0.95} />
      </mesh>

      {/* Main building body */}
      <mesh position={[0, bh / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[bw, bh, bd]} />
        <meshStandardMaterial
          color={b.color}
          roughness={0.75}
          metalness={0.05}
        />
      </mesh>

      {/* Roof parapet */}
      <mesh position={[0, bh + 0.25, 0]}>
        <boxGeometry args={[bw + 0.3, 0.5, bd + 0.3]} />
        <meshStandardMaterial color={b.roofColor} roughness={0.8} />
      </mesh>
      {/* Roof top flat */}
      <mesh position={[0, bh + 0.5, 0]}>
        <boxGeometry args={[bw - 0.2, 0.15, bd - 0.2]} />
        <meshStandardMaterial color={b.roofColor} roughness={0.9} />
      </mesh>

      {/* Columns (front face) */}
      {Array.from({ length: Math.min(windowCols, 6) }).map((_, ci) => {
        const colX = -bw / 2 + 1 + ci * (bw / Math.min(windowCols, 6))
        return (
          <mesh key={`col-${ci}`} position={[colX, bh / 2, bd / 2 + 0.12]} castShadow>
            <cylinderGeometry args={[0.12, 0.15, bh, 8]} />
            <meshStandardMaterial color="#c8a878" roughness={0.6} />
          </mesh>
        )
      })}

      {/* Daytime Windows - front face */}
      {Array.from({ length: windowRows }).map((_, row) =>
        Array.from({ length: windowCols }).map((_, col) => {
          const wx = -bw / 2 + 1.2 + col * ((bw - 1.5) / Math.max(windowCols - 1, 1))
          const wy = 1.2 + row * (bh / windowRows)
          return (
            <group key={`win-f-${row}-${col}`} position={[wx, wy, bd / 2 + 0.02]}>
              <mesh>
                <planeGeometry args={[0.8, 1.0]} />
                <meshStandardMaterial
                  color="#1e293b"
                  roughness={0.15}
                  metalness={0.8}
                  emissive={b.isHero ? "#f59e0b" : "#fed7aa"}
                  emissiveIntensity={nightFactor * 1.5}
                />
              </mesh>
              {/* Window frame */}
              <mesh position={[0, 0, 0.01]}>
                <planeGeometry args={[0.86, 1.06]} />
                <meshStandardMaterial color="#5a3a20" roughness={0.8} />
              </mesh>
            </group>
          )
        })
      )}

      {/* Ambient glow at base - turns on at night */}
      <pointLight
        position={[0, 1.5, bd / 2 + 1]}
        intensity={nightFactor * 2.5}
        distance={b.isHero ? 20 : 10}
        color="#ffcc60"
      />
    </group>
  )
}

/* ── Sky Atmosphere ── */
function SkyAtmosphere() {
  const timeRemaining = useGameStore((s) => s.timeRemaining)
  const timerSeconds = useGameStore((s) => s.timerSeconds)
  const elapsed = Math.max(0, timerSeconds - timeRemaining)
  const nightFactor = Math.min(1.0, elapsed / 600)

  const skyColor = nightFactor < 0.5
    ? '#1e1b4b' // warm purple/dusk
    : '#09090b' // deep black night

  const horizonColor = nightFactor < 0.5
    ? '#f97316' // orange dusk glow
    : '#1e293b' // dark blue night glow

  return (
    <>
      {/* Sky dome */}
      <mesh>
        <sphereGeometry args={[90, 32, 32]} />
        <meshBasicMaterial
          color={skyColor}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Horizon glow */}
      <mesh position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[60, 90, 64]} />
        <meshBasicMaterial
          color={horizonColor}
          side={THREE.DoubleSide}
          transparent
          opacity={0.6}
        />
      </mesh>
    </>
  )
}

/* ── Stars ── */
function Stars() {
  const timeRemaining = useGameStore((s) => s.timeRemaining)
  const timerSeconds = useGameStore((s) => s.timerSeconds)
  const elapsed = Math.max(0, timerSeconds - timeRemaining)
  const nightFactor = Math.min(1.0, elapsed / 600)

  const starsCount = 120
  const positions = useMemo(() => {
    const arr = []
    for (let i = 0; i < starsCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 2 - 1)
      const r = 85
      arr.push([
        r * Math.sin(phi) * Math.cos(theta),
        Math.abs(r * Math.sin(phi) * Math.sin(theta)) + 10,
        r * Math.cos(phi)
      ])
    }
    return arr
  }, [])

  if (nightFactor < 0.1) return null

  return (
    <group>
      {positions.map((pos, i) => (
        <mesh key={i} position={pos}>
          <boxGeometry args={[0.25, 0.25, 0.25]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={nightFactor * 0.8} />
        </mesh>
      ))}
    </group>
  )
}

/* ── Main Block Billboard (landmark) ── */
function CampusEntranceSign() {
  return (
    <group position={[0, 0, -38]}>
      {/* Sign posts */}
      <mesh position={[-3.5, 2, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 4, 8]} />
        <meshStandardMaterial color="#3a2a15" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[3.5, 2, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 4, 8]} />
        <meshStandardMaterial color="#3a2a15" roughness={0.6} metalness={0.4} />
      </mesh>
      {/* Sign board */}
      <mesh position={[0, 3.8, 0]}>
        <boxGeometry args={[8, 1.2, 0.15]} />
        <meshStandardMaterial color="#1a0a00" roughness={0.5} metalness={0.2} />
      </mesh>
      <pointLight position={[0, 3.5, 0.5]} intensity={0} distance={6} color="#ffaa30" />
    </group>
  )
}

/* ══════════════════════════════════════════════
   MAIN CAMPUS MAP
   ══════════════════════════════════════════════ */
export default function CampusMap() {
  const timeRemaining = useGameStore((s) => s.timeRemaining)
  const timerSeconds = useGameStore((s) => s.timerSeconds)
  const elapsed = Math.max(0, timerSeconds - timeRemaining)
  const nightFactor = Math.min(1.0, elapsed / 600)

  // Lerp ambient and directional light values
  const ambientIntensity = THREE.MathUtils.lerp(0.4, 0.12, nightFactor)
  const ambientColor = nightFactor < 0.5 ? '#fed7aa' : '#1e293b'

  const mainLightIntensity = THREE.MathUtils.lerp(1.2, 0.35, nightFactor)
  const mainLightColor = nightFactor < 0.5 ? '#f97316' : '#93c5fd'

  return (
    <group>
      <SkyAtmosphere />
      <Stars />

      {/* Lighting */}
      <ambientLight intensity={ambientIntensity} color={ambientColor} />
      <directionalLight
        position={[40, 60, 30]}
        intensity={mainLightIntensity}
        color={mainLightColor}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-65}
        shadow-camera-right={65}
        shadow-camera-top={65}
        shadow-camera-bottom={-65}
        shadow-bias={-0.0005}
      />
      {/* Sky bounce fill - dimmed at night */}
      <directionalLight position={[-30, 40, -20]} intensity={0.3 * (1.0 - nightFactor)} color="#bae6fd" />

      {/* Ground */}
      <Ground />

      {/* Grass zones */}
      {GREEN_ZONES.map((g, i) => <GrassZone key={i} pos={g.pos} size={g.size} />)}

      {/* Concrete paths */}
      {PATHS.map((p, i) => <Path key={i} pos={p.pos} size={p.size} />)}

      {/* Buildings */}
      {CAMPUS_BUILDINGS.map(b => <Building key={b.id} b={b} />)}

      {/* Street Lamps */}
      {LAMP_POSITIONS.map((pos, i) => <StreetLamp key={i} pos={pos} />)}

      {/* Trees */}
      {TREE_POSITIONS.map((pos, i) => <Tree key={i} pos={pos} />)}

      {/* Entrance sign area */}
      <CampusEntranceSign />

      {/* Campus boundary wall (perimeter) */}
      {[
        { pos: [0, 1, -52], size: [110, 2, 0.5] },
        { pos: [0, 1, 52],  size: [110, 2, 0.5] },
        { pos: [-55, 1, 0], size: [0.5, 2, 104] },
        { pos: [55, 1, 0],  size: [0.5, 2, 104] },
      ].map((w, i) => (
        <mesh key={`wall-${i}`} position={w.pos} castShadow>
          <boxGeometry args={w.size} />
          <meshStandardMaterial color="#4a3820" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}
