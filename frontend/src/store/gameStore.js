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
    { id: 'research_center', name: 'Research Center', position: [-20, 0, -20], size: [12, 6, 10], color: '#4a1942' },
    { id: 'computer_lab',    name: 'Computer Lab',    position: [0, 0, -20],   size: [12, 5, 10], color: '#1a1a4e' },
    { id: 'security_office', name: 'Security Office', position: [20, 0, -20],  size: [10, 4, 8],  color: '#2d1b30' },
    { id: 'mca_department',  name: 'MCA Department',  position: [-20, 0, 0],   size: [12, 5, 12], color: '#1b2d3a' },
    { id: 'main_block',      name: 'Main Block',      position: [0, 0, 0],     size: [14, 7, 14], color: '#2a1a3a' },
    { id: 'auditorium',      name: 'Auditorium',      position: [20, 0, 0],    size: [14, 8, 12], color: '#3a1a2a' },
    { id: 'library',         name: 'Library',         position: [-20, 0, 20],  size: [12, 5, 10], color: '#1a3a2d' },
    { id: 'cafeteria',       name: 'Cafeteria',        position: [0, 0, 20],   size: [12, 4, 10], color: '#3a2d1a' },
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
  addCorrelation: (a, b) => set((s) => ({ correlations: [...s.correlations, [a, b]] })),
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
