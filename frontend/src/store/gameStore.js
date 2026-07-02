import { create } from 'zustand'

const useGameStore = create((set, get) => ({
  // ── Player State ──
  playerPosition: [0, 0.5, 0],
  playerRotation: 0,
  playerSpeed: 4,
  sprintMultiplier: 1.8,
  isSprinting: false,

  // ── Other Players ──
  otherPlayers: {},  // player_id -> { position, rotation, username }

  // ── Game Session ──
  gamePhase: 'loading',   // loading | role_reveal | exploration | meeting | accusation | results
  timeRemaining: 20 * 60,
  timerSeconds: 20 * 60,
  difficulty: 'medium',
  role: null,
  partnerInfo: null,      // { partner_id, partner_name, partner_role } for villains
  roomCode: null,
  playerId: null,
  playerName: null,

  // ── Campus Areas ──
  campusAreas: [
    { id: 'front_gate',      name: 'Front Gate',      position: [0, 0, -42],  size: [14, 5, 4],   color: '#5a4a3a' },
    { id: 'audi_block',      name: 'Auditorium',      position: [-28, 0, -28],size: [16, 9, 12],  color: '#7c3412' },
    { id: 'junior_college',  name: 'Junior College',  position: [-28, 0, -14],size: [18, 6, 8],   color: '#7c2d12' },
    { id: 'central_block',   name: 'Main Block',      position: [-10, 0, -8], size: [22, 12, 18], color: '#8a3412' },
    { id: 'block_1',         name: 'Research Center', position: [28, 0, -20], size: [14, 8, 12],  color: '#3b1c57' },
    { id: 'computer_lab',    name: 'Computer Lab',    position: [28, 0, 0],   size: [14, 7, 12],  color: '#1a1a4e' },
    { id: 'canteen_right',   name: 'Cafeteria',       position: [32, 0, 16],  size: [10, 4, 8],   color: '#7c3d00' },
    { id: 'block_2',         name: 'MCA Department',  position: [8, 0, 14],   size: [16, 8, 12],  color: '#7c3412' },
    { id: 'security_office', name: 'Security Office', position: [-30, 0, 4],  size: [8, 4, 8],    color: '#2d2d2d' },
    { id: 'library',         name: 'Library',         position: [-24, 0, 22], size: [14, 7, 10],  color: '#1a3a2d' },
    { id: 'block_4',         name: 'Block 4',         position: [-10, 0, 30], size: [14, 7, 10],  color: '#7c3412' },
    { id: 'she_block',       name: 'She Block',       position: [-28, 0, 34], size: [10, 5, 8],   color: '#7c185d' },
    { id: 'rd_block',        name: 'R&D Block',       position: [-28, 0, 44], size: [12, 6, 8],   color: '#3b1c57' },
    { id: 'girls_hostel',    name: 'Girls Hostel',    position: [6, 0, 40],   size: [18, 6, 8],   color: '#7c3412' },
    { id: 'basketball_court',name: 'Basketball Court',position: [20, 0, -32], size: [16, 1, 12],  color: '#1d4ed8' },
  ],
  currentArea: null,

  // ── Evidence ──
  worldEvidence: [],         // evidence items visible in 3D world
  evidenceBoard: [],         // Detective only: all collected evidence
  correlations: [],          // Detective only: linked evidence pairs
  evidenceCollectedCount: 0,

  // ── Tasks ──
  tasks: [],
  activeTaskId: null,
  taskProgress: 0,

  // ── NPCs ──
  npcs: [],
  npcDialogVisible: false,
  npcDialogContent: null,    // { npc_name, statement }

  // ── Chat ──
  chatMessages: [],          // { channel, sender_name, message, timestamp }
  chatChannel: 'public',
  chatOpen: false,

  // ── Abilities ──
  abilities: [],
  abilityMenuOpen: false,

  // ── Meeting ──
  meetingActive: false,
  meetingTimeRemaining: 90,

  // ── CCTV Report ──
  cctvReport: null,        // { area, movement_replay, generated_evidence } from server

  // ── Results ──
  gameResult: null,

  // ── WebSocket ──
  ws: null,

  // ── Actions ──
  setPlayerPosition: (position) => set({ playerPosition: position }),
  setPlayerRotation: (rotation) => set({ playerRotation: rotation }),
  setSprinting: (isSprinting) => set({ isSprinting }),
  setCurrentArea: (area) => set({ currentArea: area }),
  setGamePhase: (phase) => set({ gamePhase: phase }),
  setRole: (role) => set({ role }),
  setPartnerInfo: (info) => set({ partnerInfo: info }),
  setRoomCode: (code) => set({ roomCode: code }),
  setPlayerId: (id) => set({ playerId: id }),
  setPlayerName: (name) => set({ playerName: name }),
  setTimerSeconds: (s) => set({ timerSeconds: s, timeRemaining: s }),

  tickTimer: () => set((state) => {
    const newTime = Math.max(0, state.timeRemaining - 1)
    if (newTime === 0 && state.gamePhase === 'exploration') {
      return { timeRemaining: 0, gamePhase: 'accusation' }
    }
    return { timeRemaining: newTime }
  }),

  // Evidence actions
  setWorldEvidence: (ev) => set({ worldEvidence: ev }),
  addWorldEvidence: (item) => set((s) => ({ worldEvidence: [...s.worldEvidence, item] })),
  removeWorldEvidence: (id) => set((s) => ({ worldEvidence: s.worldEvidence.filter(e => e.evidence_id !== id) })),
  setEvidenceBoard: (board) => set({ evidenceBoard: board }),
  addCorrelation: (a, b, data = null) => set((s) => ({
    correlations: [...s.correlations.filter(c => !(c[0] === a && c[1] === b || c[0] === b && c[1] === a)), [a, b, data]]
  })),
  incrementEvidenceCollected: () => set((s) => ({ evidenceCollectedCount: s.evidenceCollectedCount + 1 })),

  // Task actions
  setTasks: (tasks) => set({ tasks }),
  updateTask: (updated) => set((s) => ({
    tasks: s.tasks.map(t => t.task_id === updated.task_id ? updated : t)
  })),
  setActiveTask: (id) => set({ activeTaskId: id }),
  setTaskProgress: (p) => set({ taskProgress: p }),

  // NPC actions
  setNpcs: (npcs) => set({ npcs }),
  showNpcDialog: (content) => set({ npcDialogVisible: true, npcDialogContent: content }),
  hideNpcDialog: () => set({ npcDialogVisible: false, npcDialogContent: null }),

  // Chat actions
  addChatMessage: (msg) => set((s) => ({ chatMessages: [...s.chatMessages.slice(-100), msg] })),
  setChatChannel: (ch) => set({ chatChannel: ch }),
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),

  // Ability actions
  setAbilities: (abilities) => set({ abilities }),
  updateAbility: (updated) => set((s) => ({
    abilities: s.abilities.map(a => a.ability_id === updated.ability_id ? updated : a)
  })),
  toggleAbilityMenu: () => set((s) => ({ abilityMenuOpen: !s.abilityMenuOpen })),

  // Meeting actions
  setMeetingActive: (active) => set({ meetingActive: active }),
  setMeetingTimeRemaining: (t) => set({ meetingTimeRemaining: t }),

  // CCTV report
  setCctvReport: (report) => set({ cctvReport: report }),

  // Game result
  setGameResult: (result) => set({ gameResult: result, gamePhase: 'results' }),

  // WS
  setWs: (ws) => set({ ws }),

  // Other players
  updateOtherPlayer: (pid, data) => set((s) => ({
    otherPlayers: { ...s.otherPlayers, [pid]: { ...(s.otherPlayers[pid] || {}), ...data } }
  })),
  removeOtherPlayer: (pid) => set((s) => {
    const rest = { ...s.otherPlayers }
    delete rest[pid]
    return { otherPlayers: rest }
  }),
}))

export default useGameStore
