import React, { useRef, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import useGameStore from '../../store/gameStore'

/* ──────────────────────────────────────────────────────────────
   HUMAN STUDENT CHARACTER
   Full articulated body: head, torso, arms, legs, backpack
   Skin tones and clothing colors vary per player
   ────────────────────────────────────────────────────────────── */

const PLAYER_SPEED_BASE = 5
const SPRINT_MULT = 1.9
const WORLD_BOUNDS = 50

// Color themes per role
const ROLE_OUTFIT = {
  DETECTIVE:    { shirt: '#1e3a6e', pants: '#0f1f3a', skin: '#f5c5a0', hair: '#1a0a00' },
  INVESTIGATOR: { shirt: '#1e5e1e', pants: '#0f2f0f', skin: '#e8b88a', hair: '#2a1500' },
  MASTERMIND:   { shirt: '#5e1e1e', pants: '#2a0a0a', skin: '#f0d0b0', hair: '#0a0a0a' },
  CONSPIRATOR:  { shirt: '#3d2010', pants: '#1a0d00', skin: '#c8a070', hair: '#1a0800' },
  default:      { shirt: '#2a2a4a', pants: '#1a1a2a', skin: '#e8c090', hair: '#1a0800' },
}

/* ── 3D Human Student Mesh ── */
function StudentBody({ role, isWalking, isRunning, bodyRef }) {
  const outfit = ROLE_OUTFIT[role] || ROLE_OUTFIT.default
  const legSwingRef = useRef(0)

  useFrame((_, delta) => {
    if (isWalking || isRunning) {
      legSwingRef.current += delta * (isRunning ? 9 : 6)
    } else {
      legSwingRef.current *= 0.85
    }
  })

  const skin = outfit.skin
  const shirt = outfit.shirt
  const pants = outfit.pants
  const hair = outfit.hair
  const shoe = '#1a1a1a'

  return (
    <group ref={bodyRef}>
      {/* ── HEAD ── */}
      <group position={[0, 1.6, 0]}>
        {/* Skull */}
        <mesh castShadow>
          <sphereGeometry args={[0.18, 16, 16]} />
          <meshStandardMaterial color={skin} roughness={0.6} />
        </mesh>
        {/* Hair cap */}
        <mesh position={[0, 0.07, -0.01]} castShadow>
          <sphereGeometry args={[0.185, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <meshStandardMaterial color={hair} roughness={0.8} />
        </mesh>
        {/* Eyes */}
        <mesh position={[-0.07, 0.02, 0.16]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color="#1a1010" roughness={0.1} />
        </mesh>
        <mesh position={[0.07, 0.02, 0.16]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color="#1a1010" roughness={0.1} />
        </mesh>
        {/* Nose */}
        <mesh position={[0, -0.03, 0.17]}>
          <sphereGeometry args={[0.025, 6, 6]} />
          <meshStandardMaterial color={skin} roughness={0.6} />
        </mesh>
        {/* Ears */}
        <mesh position={[-0.18, 0, 0]}>
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshStandardMaterial color={skin} roughness={0.6} />
        </mesh>
        <mesh position={[0.18, 0, 0]}>
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshStandardMaterial color={skin} roughness={0.6} />
        </mesh>
        {/* Collar */}
        <mesh position={[0, -0.18, 0.02]}>
          <cylinderGeometry args={[0.11, 0.14, 0.08, 10]} />
          <meshStandardMaterial color={shirt} roughness={0.7} />
        </mesh>
      </group>

      {/* ── NECK ── */}
      <mesh position={[0, 1.42, 0]} castShadow>
        <cylinderGeometry args={[0.065, 0.07, 0.14, 10]} />
        <meshStandardMaterial color={skin} roughness={0.6} />
      </mesh>

      {/* ── TORSO (shirt) ── */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <boxGeometry args={[0.38, 0.5, 0.22]} />
        <meshStandardMaterial color={shirt} roughness={0.7} />
      </mesh>

      {/* Shirt collar detail */}
      <mesh position={[0, 1.32, 0.08]}>
        <planeGeometry args={[0.12, 0.08]} />
        <meshStandardMaterial color="#ffffff" roughness={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* ── BELT area (waist) ── */}
      <mesh position={[0, 0.84, 0]}>
        <boxGeometry args={[0.40, 0.07, 0.24]} />
        <meshStandardMaterial color="#2a2010" roughness={0.5} metalness={0.2} />
      </mesh>

      {/* ── ARMS ── */}
      {/* Left upper arm */}
      <WalkingArm
        basePos={[-0.23, 1.22, 0]}
        pantsColor={shirt}
        skinColor={skin}
        isLeft={true}
        swingRef={legSwingRef}
        phase={0}
      />
      {/* Right upper arm */}
      <WalkingArm
        basePos={[0.23, 1.22, 0]}
        pantsColor={shirt}
        skinColor={skin}
        isLeft={false}
        swingRef={legSwingRef}
        phase={Math.PI}
      />

      {/* ── LEGS ── */}
      <WalkingLeg
        basePos={[-0.11, 0.62, 0]}
        pantsColor={pants}
        shoeColor={shoe}
        swingRef={legSwingRef}
        phase={0}
      />
      <WalkingLeg
        basePos={[0.11, 0.62, 0]}
        pantsColor={pants}
        shoeColor={shoe}
        swingRef={legSwingRef}
        phase={Math.PI}
      />

      {/* ── BACKPACK ── */}
      <mesh position={[0, 1.08, -0.18]} castShadow>
        <boxGeometry args={[0.26, 0.38, 0.14]} />
        <meshStandardMaterial color="#2a2a3a" roughness={0.8} />
      </mesh>
      {/* Backpack straps */}
      <mesh position={[-0.09, 1.08, -0.09]}>
        <boxGeometry args={[0.05, 0.36, 0.04]} />
        <meshStandardMaterial color="#1a1a2a" roughness={0.7} />
      </mesh>
      <mesh position={[0.09, 1.08, -0.09]}>
        <boxGeometry args={[0.05, 0.36, 0.04]} />
        <meshStandardMaterial color="#1a1a2a" roughness={0.7} />
      </mesh>
    </group>
  )
}

/* ── Animated Arm ── */
function WalkingArm({ basePos, pantsColor, skinColor, isLeft, swingRef, phase }) {
  const upperRef = useRef()
  const lowerRef = useRef()

  useFrame(() => {
    if (!upperRef.current) return
    const swing = Math.sin(swingRef.current + phase) * 0.35
    upperRef.current.rotation.x = swing
    if (lowerRef.current) {
      lowerRef.current.rotation.x = Math.abs(swing) * 0.5
    }
  })

  return (
    <group position={basePos}>
      {/* Shoulder joint */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.065, 8, 8]} />
        <meshStandardMaterial color={pantsColor} roughness={0.7} />
      </mesh>
      {/* Upper arm */}
      <group ref={upperRef} position={[0, -0.12, 0]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.05, 0.24, 6, 8]} />
          <meshStandardMaterial color={pantsColor} roughness={0.7} />
        </mesh>
        {/* Forearm */}
        <group ref={lowerRef} position={[0, -0.2, 0]}>
          <mesh castShadow>
            <capsuleGeometry args={[0.042, 0.2, 5, 7]} />
            <meshStandardMaterial color={skinColor} roughness={0.5} />
          </mesh>
          {/* Hand */}
          <mesh position={[0, -0.16, 0]} castShadow>
            <sphereGeometry args={[0.048, 8, 8]} />
            <meshStandardMaterial color={skinColor} roughness={0.4} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

/* ── Animated Leg ── */
function WalkingLeg({ basePos, pantsColor, shoeColor, swingRef, phase }) {
  const upperRef = useRef()
  const lowerRef = useRef()

  useFrame(() => {
    if (!upperRef.current) return
    const swing = Math.sin(swingRef.current + phase) * 0.4
    upperRef.current.rotation.x = swing
    if (lowerRef.current) {
      lowerRef.current.rotation.x = Math.max(0, -swing) * 0.6
    }
  })

  return (
    <group position={basePos}>
      <group ref={upperRef} position={[0, -0.18, 0]}>
        {/* Thigh */}
        <mesh castShadow>
          <capsuleGeometry args={[0.07, 0.28, 6, 8]} />
          <meshStandardMaterial color={pantsColor} roughness={0.8} />
        </mesh>
        <group ref={lowerRef} position={[0, -0.28, 0]}>
          {/* Shin */}
          <mesh castShadow>
            <capsuleGeometry args={[0.055, 0.26, 6, 8]} />
            <meshStandardMaterial color={pantsColor} roughness={0.8} />
          </mesh>
          {/* Shoe */}
          <mesh position={[0, -0.22, 0.04]} castShadow>
            <boxGeometry args={[0.1, 0.065, 0.18]} />
            <meshStandardMaterial color={shoeColor} roughness={0.4} metalness={0.1} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

/* ── Other Player Character (simpler, different color) ── */
function OtherPlayerCharacter({ data }) {
  const colors = ['#3b82f6', '#22c55e', '#ec4899', '#f97316', '#a855f7', '#06b6d4']
  const color = colors[parseInt(data.player_id || '0') % colors.length]

  return (
    <group position={data.position || [0, 0, 0]}>
      {/* Simplified human silhouette */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <capsuleGeometry args={[0.17, 0.7, 8, 12]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.72, 0]} castShadow>
        <sphereGeometry args={[0.165, 10, 10]} />
        <meshStandardMaterial color="#e8b888" roughness={0.6} />
      </mesh>
      {/* Name tag glow ring */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.38, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
      {/* Point light glow */}
      <pointLight position={[0, 0.5, 0]} intensity={2} distance={4} color={color} />
    </group>
  )
}

/* ══════════════════════════════════════════════
   MAIN PLAYER
   ══════════════════════════════════════════════ */
export default function Player() {
  const groupRef = useRef()
  const bodyRef = useRef()
  const { camera } = useThree()
  const velocity = useRef(new THREE.Vector3())
  const direction = useRef(new THREE.Vector3())
  const rotationRef = useRef(0)
  const cameraYawRef = useRef(0)
  const cameraPitchRef = useRef(0.5) // Initial vertical angle look-down
  const isWalkingRef = useRef(false)
  const isRunningRef = useRef(false)
  const movSendTimer = useRef(0)

  const role = useGameStore((s) => s.role)
  const campusAreas = useGameStore((s) => s.campusAreas)
  const setPlayerPosition = useGameStore((s) => s.setPlayerPosition)
  const setPlayerRotation = useGameStore((s) => s.setPlayerRotation)
  const setCurrentArea = useGameStore((s) => s.setCurrentArea)
  const setSprinting = useGameStore((s) => s.setSprinting)
  const tasks = useGameStore((s) => s.tasks)
  const updateTask = useGameStore((s) => s.updateTask)
  const ws = useGameStore((s) => s.ws)
  const otherPlayers = useGameStore((s) => s.otherPlayers)

  const keysRef = useRef({
    forward: false, backward: false,
    left: false,    right: false,
    sprint: false,  interact: false,
  })

  useEffect(() => {
    const keyMap = {
      KeyW: 'forward',  ArrowUp: 'forward',
      KeyS: 'backward', ArrowDown: 'backward',
      KeyA: 'left',     ArrowLeft: 'left',
      KeyD: 'right',    ArrowRight: 'right',
      ShiftLeft: 'sprint', ShiftRight: 'sprint',
      KeyE: 'interact',
    }
    const down = (e) => {
      const a = keyMap[e.code]
      if (a) { keysRef.current[a] = true; if (a === 'sprint') setSprinting(true) }
    }
    const up = (e) => {
      const a = keyMap[e.code]
      if (a) { keysRef.current[a] = false; if (a === 'sprint') setSprinting(false) }
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [setSprinting])

  // Drag-to-look orbit controls using mouse / trackpad
  useEffect(() => {
    let isDragging = false
    let startX = 0
    let startY = 0

    const handlePointerDown = (e) => {
      // Only drag with left click (0) on the main 3D canvas (ignore HUD, minimap, etc.)
      if (e.button !== 0) return
      if (e.target.tagName !== 'CANVAS' || e.target.id === 'minimap-canvas') return

      isDragging = true
      startX = e.clientX
      startY = e.clientY
    }

    const handlePointerMove = (e) => {
      if (!isDragging) return
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      startX = e.clientX
      startY = e.clientY

      // Adjust camera yaw (horizontal rotation)
      cameraYawRef.current -= dx * 0.006

      // Adjust camera pitch (vertical tilt, clamp to avoid clipping below ground or going upside down)
      cameraPitchRef.current = THREE.MathUtils.clamp(
        cameraPitchRef.current + dy * 0.005,
        0.05, // look almost horizontally
        1.35  // look almost straight down
      )
    }

    const handlePointerUp = () => {
      isDragging = false
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [])

  // AABB collision
  function checkCollision(pos) {
    for (const area of campusAreas) {
      const [ax, , az] = area.position
      const [aw, , ad] = area.size
      if (pos.x > ax - aw/2 - 0.5 && pos.x < ax + aw/2 + 0.5 &&
          pos.z > az - ad/2 - 0.5 && pos.z < az + ad/2 + 0.5) {
        return area
      }
    }
    return null
  }

  const lastTaskSentRef = useRef(0)

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const keys = keysRef.current
    const speed = keys.sprint ? PLAYER_SPEED_BASE * SPRINT_MULT : PLAYER_SPEED_BASE

    direction.current.set(0, 0, 0)
    if (keys.forward)  direction.current.z -= 1
    if (keys.backward) direction.current.z += 1
    if (keys.left)     direction.current.x -= 1
    if (keys.right)    direction.current.x += 1

    const moving = direction.current.lengthSq() > 0
    isWalkingRef.current = moving && !keys.sprint
    isRunningRef.current = moving && keys.sprint

    if (moving) {
      direction.current.normalize()
      const camAngle = Math.atan2(
        camera.position.x - groupRef.current.position.x,
        camera.position.z - groupRef.current.position.z
      )
      direction.current.applyAxisAngle(new THREE.Vector3(0, 1, 0), camAngle + Math.PI)
      rotationRef.current = Math.atan2(direction.current.x, direction.current.z)
    }

    velocity.current.lerp(direction.current.clone().multiplyScalar(speed), 0.15)

    const candidate = groupRef.current.position.clone().addScaledVector(velocity.current, delta)
    candidate.x = THREE.MathUtils.clamp(candidate.x, -WORLD_BOUNDS, WORLD_BOUNDS)
    candidate.z = THREE.MathUtils.clamp(candidate.z, -WORLD_BOUNDS, WORLD_BOUNDS)
    candidate.y = 0

    if (!checkCollision(candidate)) {
      groupRef.current.position.copy(candidate)
    } else {
      const xOnly = groupRef.current.position.clone(); xOnly.x = candidate.x
      if (!checkCollision(xOnly)) groupRef.current.position.x = candidate.x
      const zOnly = groupRef.current.position.clone(); zOnly.z = candidate.z
      if (!checkCollision(zOnly)) groupRef.current.position.z = candidate.z
    }

    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y, rotationRef.current, 0.12
    )

    // Third-person camera — orbit around player using mouse/trackpad yaw & pitch
    const camDist = keys.sprint ? 7.5 : 6.0
    const horizontalDist = camDist * Math.cos(cameraPitchRef.current)
    const verticalDist = camDist * Math.sin(cameraPitchRef.current)

    // Calculate base offset
    const cameraOffset = new THREE.Vector3(
      Math.sin(cameraYawRef.current) * horizontalDist,
      verticalDist,
      Math.cos(cameraYawRef.current) * horizontalDist
    )

    // Add shoulder offset to the side (over-the-shoulder camera)
    const shoulderOffset = new THREE.Vector3(0.55, 0.15, 0)
    shoulderOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYawRef.current - Math.PI / 2)

    const targetCamPos = groupRef.current.position.clone()
      .add(cameraOffset)
      .add(shoulderOffset)

    camera.position.lerp(targetCamPos, 0.09) // smooth follow with camera lag

    // Add movement head-bob camera shake
    if (moving) {
      const bobFreq = keys.sprint ? 0.016 : 0.010
      const bobAmp = keys.sprint ? 0.035 : 0.015
      const bob = Math.sin(Date.now() * bobFreq) * bobAmp
      camera.position.y += bob
      camera.position.x += bob * 0.3
    }

    // Dynamic FOV based on speed/sprint
    const targetFov = keys.sprint ? 72 : 60
    if (Math.abs(camera.fov - targetFov) > 0.1) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.1)
      camera.updateProjectionMatrix()
    }

    // Look at player chest/head
    camera.lookAt(
      groupRef.current.position.x + shoulderOffset.x * 0.5,
      groupRef.current.position.y + 1.25,
      groupRef.current.position.z + shoulderOffset.z * 0.5
    )

    // Update store
    const p = groupRef.current.position
    setPlayerPosition([p.x, p.y, p.z])
    setPlayerRotation(rotationRef.current)

    // Area detection
    let nearest = null, nearDist = Infinity
    for (const area of campusAreas) {
      const dx = p.x - area.position[0], dz = p.z - area.position[2]
      const d = Math.sqrt(dx * dx + dz * dz)
      const thresh = Math.max(area.size[0], area.size[2]) * 0.8
      if (d < thresh && d < nearDist) { nearDist = d; nearest = area.name }
    }
    setCurrentArea(nearest)

    // Task interaction
    if (keys.interact && nearest) {
      const task = tasks.find(t => t.location === nearest && !t.completed)
      if (task) {
        const now = Date.now()
        if (ws && now - lastTaskSentRef.current > 200) {
          ws.send(JSON.stringify({ action: 'TASK_PROGRESS', task_id: task.task_id, delta: 0.05 }))
          lastTaskSentRef.current = now
        } else if (!ws) {
          const next = Math.min(1, (task.progress || 0) + delta * 0.25)
          updateTask({ ...task, progress: next, completed: next >= 1 })
        }
      }
    }

    // Send movement to server
    movSendTimer.current += delta
    if (ws && movSendTimer.current > 0.1) {
      movSendTimer.current = 0
      ws.send(JSON.stringify({
        action: 'PLAYER_MOVE',
        position: { x: p.x, y: p.y, z: p.z },
        rotation: rotationRef.current,
        area: nearest || '',
      }))
    }
  })

  return (
    <>
      {/* Self player */}
      <group ref={groupRef} position={[0, 0, 0]}>
        {/* Player character */}
        <StudentBody
          role={role}
          isWalking={isWalkingRef.current}
          isRunning={isRunningRef.current}
          bodyRef={bodyRef}
        />

        {/* Ground shadow ring */}
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.32, 24]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.35} />
        </mesh>

        {/* Role-colored ground glow */}
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.32, 0.44, 32]} />
          <meshBasicMaterial
            color={role === 'MASTERMIND' || role === 'CONSPIRATOR' ? '#ef4444' : '#f43f5e'}
            transparent opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Subtle personal point light */}
        <pointLight
          position={[0, 1.5, 0]}
          intensity={3}
          distance={5}
          color={role === 'DETECTIVE' ? '#60a8ff' : '#ff6090'}
        />
      </group>

      {/* Other players */}
      {Object.entries(otherPlayers).map(([pid, data]) => (
        <OtherPlayerCharacter key={pid} data={{ ...data, player_id: pid }} />
      ))}
    </>
  )
}
