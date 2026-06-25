import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import CampusMap from './CampusMap'
import Player from './Player'
import EvidenceItems from './EvidenceItems'
import TaskZones from './TaskZones'
import NPCCharacters from './NPCCharacters'
import GameHUD from '../ui/GameHUD'
import MeetingScreen from '../ui/MeetingScreen'
import AccusationScreen from '../ui/AccusationScreen'
import ResultsScreen from '../ui/ResultsScreen'

function LoadingFallback() {
  return (
    <mesh position={[0, 2, 0]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#f43f5e" wireframe />
    </mesh>
  )
}

export default function GameScene() {
  return (
    <div className="game-viewport" id="game-viewport">
      <Canvas
        shadows
        gl={{
          antialias: true,
          toneMapping: 3,
          toneMappingExposure: 1.2,
        }}
        camera={{ position: [0, 12, 16], fov: 55, near: 0.1, far: 200 }}
      >
        <fog attach="fog" args={['#050510', 40, 90]} />
        <Suspense fallback={<LoadingFallback />}>
          <CampusMap />
          <Player />
          <EvidenceItems />
          <TaskZones />
          <NPCCharacters />
        </Suspense>
      </Canvas>

      {/* 2D HUD Overlay */}
      <GameHUD />

      {/* Modal Overlays */}
      <MeetingScreen />
      <AccusationScreen />
      <ResultsScreen />
    </div>
  )
}
