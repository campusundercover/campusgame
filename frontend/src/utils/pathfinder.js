import * as THREE from 'three'

// Grid resolution: 1 cell = 1 unit. Map bounds: -50 to 50 in X and Z.
const GRID_MIN = -50
const GRID_MAX = 50
const GRID_SIZE = 100 // 100x100 grid

export function getGridCoords(x, z) {
  const gx = Math.round(x - GRID_MIN)
  const gz = Math.round(z - GRID_MIN)
  return [
    THREE.MathUtils.clamp(gx, 0, GRID_SIZE),
    THREE.MathUtils.clamp(gz, 0, GRID_SIZE)
  ]
}

export function getWorldCoords(gx, gz) {
  return [gx + GRID_MIN, gz + GRID_MIN]
}

// Generate the walkability grid based on campus buildings
export function generateGrid(campusAreas) {
  const grid = Array(GRID_SIZE + 1).fill(null).map(() => Array(GRID_SIZE + 1).fill(true))

  for (const area of campusAreas) {
    // Courts, parks, gates and parking areas don't block movement on the grid map
    if (
      area.id === 'basketball_court' ||
      area.id === 'basketball_court_left' ||
      area.id === 'hockey_court' ||
      area.id === 'front_gate' ||
      area.id === 'back_gate' ||
      area.id === 'plants_trees' ||
      area.id === 'park_garden' ||
      area.id === 'birds_park' ||
      area.id === 'sitting_area' ||
      area.id === 'parking'
    ) {
      continue
    }

    const [ax, , az] = area.position
    const [aw, , ad] = area.size

    // Determine cell range that is blocked by the building
    const minX = ax - aw / 2 - 0.5
    const maxX = ax + aw / 2 + 0.5
    const minZ = az - ad / 2 - 0.5
    const maxZ = az + ad / 2 + 0.5

    const [gMinX, gMinZ] = getGridCoords(minX, minZ)
    const [gMaxX, gMaxZ] = getGridCoords(maxX, maxZ)

    for (let x = gMinX; x <= gMaxX; x++) {
      for (let z = gMinZ; z <= gMaxZ; z++) {
        if (x >= 0 && x <= GRID_SIZE && z >= 0 && z <= GRID_SIZE) {
          grid[x][z] = false // Mark cell as blocked
        }
      }
    }
  }

  // Explicitly handle front gate and back gate pillars
  // Front gate: centered at [0, 0, -48], width 14, depth 4
  // Pillars are left of -1.8 and right of 1.8
  const gateZMin = -50
  const gateZMax = -46
  for (let z = Math.round(gateZMin - GRID_MIN); z <= Math.round(gateZMax - GRID_MIN); z++) {
    for (let x = 0; x <= GRID_SIZE; x++) {
      const worldX = x + GRID_MIN
      if ((worldX >= -7 && worldX < -1.8) || (worldX > 1.8 && worldX <= 7)) {
        if (z >= 0 && z <= GRID_SIZE && x >= 0 && x <= GRID_SIZE) {
          grid[x][z] = false
        }
      }
    }
  }

  return grid
}

// Simple A* pathfinder
export function findPath(startPos, endPos, grid) {
  const [sx, sz] = getGridCoords(startPos.x, startPos.z)
  let [ex, ez] = getGridCoords(endPos.x, endPos.z)

  // If destination is blocked, find the nearest walkable cell
  if (!grid[ex][ez]) {
    let nearestDist = Infinity
    let nx = ex, nz = ez
    for (let dx = -5; dx <= 5; dx++) {
      for (let dz = -5; dz <= 5; dz++) {
        const tx = ex + dx
        const tz = ez + dz
        if (tx >= 0 && tx <= GRID_SIZE && tz >= 0 && tz <= GRID_SIZE && grid[tx][tz]) {
          const dist = dx * dx + dz * dz
          if (dist < nearestDist) {
            nearestDist = dist
            nx = tx
            nz = tz
          }
        }
      }
    }
    ex = nx
    ez = nz
  }

  const openSet = []
  const closedSet = new Set()

  const startNode = { x: sx, z: sz, g: 0, h: heuristic(sx, sz, ex, ez), f: 0, parent: null }
  startNode.f = startNode.g + startNode.h
  openSet.push(startNode)

  const nodeMap = new Map()
  nodeMap.set(`${sx},${sz}`, startNode)

  let foundNode = null

  while (openSet.length > 0) {
    // Get node with lowest f score
    openSet.sort((a, b) => a.f - b.f)
    const current = openSet.shift()

    if (current.x === ex && current.z === ez) {
      foundNode = current
      break
    }

    const key = `${current.x},${current.z}`
    closedSet.add(key)

    // Check 8 neighbors
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dz === 0) continue

        const nx = current.x + dx
        const nz = current.z + dz

        if (nx < 0 || nx > GRID_SIZE || nz < 0 || nz > GRID_SIZE) continue
        if (!grid[nx][nz]) continue

        const neighborKey = `${nx},${nz}`
        if (closedSet.has(neighborKey)) continue

        const isDiagonal = dx !== 0 && dz !== 0
        const moveCost = isDiagonal ? 1.414 : 1.0
        const tentativeG = current.g + moveCost

        let neighbor = nodeMap.get(neighborKey)
        if (!neighbor) {
          neighbor = {
            x: nx,
            z: nz,
            g: tentativeG,
            h: heuristic(nx, nz, ex, ez),
            f: 0,
            parent: current
          }
          neighbor.f = neighbor.g + neighbor.h
          nodeMap.set(neighborKey, neighbor)
          openSet.push(neighbor)
        } else if (tentativeG < neighbor.g) {
          neighbor.parent = current
          neighbor.g = tentativeG
          neighbor.f = neighbor.g + neighbor.h
        }
      }
    }
  }

  if (!foundNode) return []

  // Reconstruct path
  const path = []
  let curr = foundNode
  while (curr) {
    const [wx, wz] = getWorldCoords(curr.x, curr.z)
    path.push(new THREE.Vector3(wx, 0.5, wz))
    curr = curr.parent
  }
  path.reverse()

  // Smooth path (omit redundant collinear points to make it straight-line where possible)
  return path
}

function heuristic(x1, z1, x2, z2) {
  const dx = Math.abs(x1 - x2)
  const dz = Math.abs(z1 - z2)
  return Math.min(dx, dz) * 1.414 + Math.abs(dx - dz)
}
