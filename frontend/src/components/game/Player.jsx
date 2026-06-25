import React, { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import useGameStore from '../../store/gameStore'

const PLAYER_HEIGHT = 1.0
const PLAYER_RADIUS = 0.35
const COLLISION_MARGIN = 0.5

export default function Player() {
  const meshRef = useRef()
  const { camera } = useThree()
  const velocity = useRef(new THREE.Vector3())
  const direction = useRef(new THREE.Vector3())
  const rotationRef = useRef(0)

  const playerSpeed = useGameStore((s) => s.playerSpeed)
  const sprintMultiplier = useGameStore((s) => s.sprintMultiplier)
  const campusAreas = useGameStore((s) => s.campusAreas)
  const setPlayerPosition = useGameStore((s) => s.setPlayerPosition)
  const setPlayerRotation = useGameStore((s) => s.setPlayerRotation)
  const setCurrentArea = useGameStore((s) => s.setCurrentArea)
  const setSprinting = useGameStore((s) => s.setSprinting)
  const tasks = useGameStore((s) => s.tasks)
  const updateTask = useGameStore((s) => s.updateTask)
  const ws = useGameStore((s) => s.ws)

  const lastTaskProgressSentRef = useRef(0)

  const keysRef = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    interact: false,
  })

  useEffect(() => {
    const keyMap = {
      KeyW: 'forward', ArrowUp: 'forward',
      KeyS: 'backward', ArrowDown: 'backward',
      KeyA: 'left', ArrowLeft: 'left',
      KeyD: 'right', ArrowRight: 'right',
      ShiftLeft: 'sprint', ShiftRight: 'sprint',
      KeyE: 'interact',
    }

    const onKeyDown = (e) => {
      const action = keyMap[e.code]
      if (action) {
        keysRef.current[action] = true
        if (action === 'sprint') setSprinting(true)
      }
    }

    const onKeyUp = (e) => {
      const action = keyMap[e.code]
      if (action) {
        keysRef.current[action] = false
        if (action === 'sprint') setSprinting(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [setSprinting])

  // Simple AABB collision check against buildings
  function checkCollision(pos) {
    for (const area of campusAreas) {
      const [ax, , az] = area.position
      const [aw, , ad] = area.size
      const halfW = aw / 2 + COLLISION_MARGIN
      const halfD = ad / 2 + COLLISION_MARGIN

      if (
        pos.x > ax - halfW &&
        pos.x < ax + halfW &&
        pos.z > az - halfD &&
        pos.z < az + halfD
      ) {
        return area
      }
    }
    return null
  }

  useFrame((_, delta) => {
    if (!meshRef.current) return
    const keys = keysRef.current
    const speed = keys.sprint ? playerSpeed * sprintMultiplier : playerSpeed

    // Calculate movement direction
    direction.current.set(0, 0, 0)
    if (keys.forward) direction.current.z -= 1
    if (keys.backward) direction.current.z += 1
    if (keys.left) direction.current.x -= 1
    if (keys.right) direction.current.x += 1

    if (direction.current.lengthSq() > 0) {
      direction.current.normalize()
      // Rotate the direction based on camera's facing
      const cameraAngle = Math.atan2(
        camera.position.x - meshRef.current.position.x,
        camera.position.z - meshRef.current.position.z
      )
      direction.current.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraAngle + Math.PI)

      // Update player rotation to face movement direction
      rotationRef.current = Math.atan2(direction.current.x, direction.current.z)
    }

    // Apply velocity with damping
    velocity.current.lerp(
      direction.current.multiplyScalar(speed),
      0.15
    )

    // Compute candidate position
    const candidate = meshRef.current.position.clone().add(
      velocity.current.clone().multiplyScalar(delta)
    )

    // Clamp to world bounds
    candidate.x = THREE.MathUtils.clamp(candidate.x, -55, 55)
    candidate.z = THREE.MathUtils.clamp(candidate.z, -55, 55)
    candidate.y = PLAYER_HEIGHT / 2

    // Collision detection
    const collidedArea = checkCollision(candidate)
    if (!collidedArea) {
      meshRef.current.position.copy(candidate)
    } else {
      // Slide along collision — try x-only, then z-only
      const xOnly = meshRef.current.position.clone()
      xOnly.x = candidate.x
      if (!checkCollision(xOnly)) {
        meshRef.current.position.x = candidate.x
      }
      const zOnly = meshRef.current.position.clone()
      zOnly.z = candidate.z
      if (!checkCollision(zOnly)) {
        meshRef.current.position.z = candidate.z
      }
    }

    // Smooth rotation
    meshRef.current.rotation.y = THREE.MathUtils.lerp(
      meshRef.current.rotation.y,
      rotationRef.current,
      0.12
    )

    // Camera follow — elevated isometric-style third-person
    const cameraOffset = new THREE.Vector3(0, 22, 20)
    const targetCameraPos = meshRef.current.position.clone().add(cameraOffset)
    camera.position.lerp(targetCameraPos, 0.06)
    camera.lookAt(
      meshRef.current.position.x,
      meshRef.current.position.y,
      meshRef.current.position.z - 2
    )

    // Update store with current position
    const pos = meshRef.current.position
    setPlayerPosition([pos.x, pos.y, pos.z])
    setPlayerRotation(rotationRef.current)

    // Detect which area the player is near (proximity check)
    let nearestArea = null
    let nearestDist = Infinity
    for (const area of campusAreas) {
      const dx = pos.x - area.position[0]
      const dz = pos.z - area.position[2]
      const dist = Math.sqrt(dx * dx + dz * dz)
      const threshold = Math.max(area.size[0], area.size[2]) * 0.8
      if (dist < threshold && dist < nearestDist) {
        nearestDist = dist
        nearestArea = area.name
      }
    }
    setCurrentArea(nearestArea)

    // Task progression loop
    if (keys.interact) {
      const task = tasks.find(t => t.location === nearestArea && !t.completed)
      if (task) {
        if (ws) {
          // Online: throttle to once every 200ms
          const now = Date.now()
          if (now - lastTaskProgressSentRef.current > 200) {
            ws.send(JSON.stringify({
              action: 'TASK_PROGRESS',
              task_id: task.task_id,
              delta: 0.05
            }))
            lastTaskProgressSentRef.current = now
          }
        } else {
          // Offline demo: progress smoothly locally
          const currentProgress = task.progress || 0
          const nextProgress = Math.min(1, currentProgress + delta * 0.25)
          updateTask({
            ...task,
            progress: nextProgress,
            completed: nextProgress >= 1
          })
        }
      }
    } else {
      // Release interaction: reset current zone task
      const activeTask = tasks.find(t => t.location === nearestArea && !t.completed && (t.progress || 0) > 0)
      if (activeTask) {
        if (ws) {
          ws.send(JSON.stringify({
            action: 'TASK_RESET',
            task_id: activeTask.task_id
          }))
        } else {
          updateTask({
            ...activeTask,
            progress: 0
          })
        }
      }
    }

    // Proactive reset of any tasks outside the nearest area that have progress
    tasks.forEach(t => {
      if (!t.completed && (t.progress || 0) > 0 && t.location !== nearestArea) {
        if (ws) {
          ws.send(JSON.stringify({
            action: 'TASK_RESET',
            task_id: t.task_id
          }))
        } else {
          updateTask({
            ...t,
            progress: 0
          })
        }
      }
    })
  })

  return (
    <group ref={meshRef} position={[8, PLAYER_HEIGHT / 2, 34]}>
      {/* Body */}
      <mesh castShadow>
        <capsuleGeometry args={[PLAYER_RADIUS, PLAYER_HEIGHT * 0.5, 8, 16]} />
        <meshStandardMaterial
          color="#f43f5e"
          emissive="#f43f5e"
          emissiveIntensity={0.15}
          roughness={0.4}
          metalness={0.2}
        />
      </mesh>

      {/* Head indicator */}
      <mesh position={[0, PLAYER_HEIGHT * 0.55, 0]} castShadow>
        <sphereGeometry args={[PLAYER_RADIUS * 0.7, 16, 16]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#fbbf24"
          emissiveIntensity={0.2}
          roughness={0.3}
        />
      </mesh>

      {/* Player glow ring */}
      <mesh position={[0, -PLAYER_HEIGHT / 2 + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.65, 32]} />
        <meshBasicMaterial
          color="#f43f5e"
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}
