import uuid
import random
import time
from typing import Dict, List, Optional, Tuple

# NPC config per area
AREA_NPC_CONFIG = {
    'Research Center':  {'count': 2, 'names': ['Dr. Priya Nair', 'Prof. Ramesh Kumar'], 'types': ['FACULTY', 'FACULTY']},
    'Computer Lab':     {'count': 1, 'names': ['Lab Assistant Suresh'], 'types': ['STAFF']},
    'Security Office':  {'count': 1, 'names': ['Guard Venkatesh'], 'types': ['SECURITY']},
    'MCA Department':   {'count': 2, 'names': ['Prof. Anitha Rao', 'Student Coordinator Deepak'], 'types': ['FACULTY', 'STUDENT']},
    'Main Block':       {'count': 3, 'names': ['Receptionist Meena', 'Admin Staff Jacob', 'Peon Raju'], 'types': ['STAFF', 'STAFF', 'STAFF']},
    'Auditorium':       {'count': 1, 'names': ['AV Technician Kiran'], 'types': ['STAFF']},
    'Library':          {'count': 2, 'names': ['Librarian Ms. Stella', 'Library Staff Arun'], 'types': ['STAFF', 'STAFF']},
    'Cafeteria':        {'count': 4, 'names': ['Chef Murugan', 'Cashier Kavitha', 'Student Rohit', 'Student Fatima'], 'types': ['STAFF', 'STAFF', 'STUDENT', 'STUDENT']},
}

NPC_PATROL_PATHS = {
    'Research Center': [
        [[-22, -22], [-18, -22], [-18, -18], [-22, -18]],
        [[-20, -20], [-19, -21], [-21, -19]]
    ],
    'Computer Lab': [
        [[0, -22], [2, -20], [-2, -20]]
    ],
    'Security Office': [
        [[20, -22], [22, -20], [20, -18]]
    ],
    'MCA Department': [
        [[-21, 1], [-19, -1], [-22, 2], [-18, -2]],
        [[-20, 0], [-22, 0], [-18, 0]]
    ],
    'Main Block': [
        [[-2, 1], [2, 1], [0, -1]],
        [[0, 0], [3, 3], [-3, -3]],
        [[-1, -2], [1, -2], [0, 2]]
    ],
    'Auditorium': [
        [[21, 1], [19, -1], [20, 2]]
    ],
    'Library': [
        [[-21, 21], [-19, 19], [-22, 20]],
        [[-20, 20], [-18, 18], [-20, 22]]
    ],
    'Cafeteria': [
        [[-2, 21], [2, 21], [0, 19]],
        [[1, 20], [-1, 20], [0, 22]],
        [[-3, 19], [-3, 21]],
        [[3, 19], [3, 21]]
    ]
}

STATEMENT_TEMPLATES = [
    "I saw someone near the {location} around {time}. They seemed to be in a hurry.",
    "Earlier I noticed {suspect} walking toward the Research Center at {time}.",
    "I heard footsteps coming from the Server Room at {time}. Very suspicious.",
    "Someone was at the computer terminals well past closing time — around {time}.",
    "I don't know who it was, but I saw someone near {location} carrying something.",
]

MISLEADING_TEMPLATES = [
    "I didn't notice anything unusual tonight. Everything seemed normal.",
    "I can't be sure, but I thought I saw {innocent} near the Research Center.",
    "It's hard to say — I was on break most of the evening.",
    "I only arrived at {time}, so I can't speak to earlier events.",
]

GENERIC_STATEMENTS = [
    "I haven't noticed anything unusual today.",
    "It's been a quiet evening. Is something wrong?",
    "I was just finishing up some work. I didn't see anything.",
    "Sorry, I wasn't paying attention to anyone else.",
]


class NPCCharacterState:
    def __init__(self, npc_id: str, name: str, area: str, path: List[List[float]], walk_speed: float = 1.2, npc_type: str = 'STUDENT'):
        self.npc_id = npc_id
        self.name = name
        self.area = area
        self.npc_type = npc_type  # STUDENT, FACULTY, SECURITY, STAFF
        self.path = path
        self.walk_speed = walk_speed
        self.current_waypoint_index = 0
        self.position = list(path[0]) if path else [0.0, 0.0]
        self.idle_timer = 0.0
        self.is_idle = False
        self.idle_duration = 3.0
        self.observation_radius = 5.0 if npc_type in ('FACULTY', 'SECURITY') else 3.0
        self.reliability_score = 0.75
        
        self.is_primed = False
        self.primed_by = None
        self.primed_target = None
        self.primed_at = 0.0
        self.primed_statement_area = 'Research Center'
        
        # Observations: [{player_id, action_type, area, description, timestamp, reliability}]
        self.observations = []

    def update_position(self, dt: float):
        if not self.path or len(self.path) < 2:
            return
            
        if self.is_idle:
            self.idle_timer -= dt
            if self.idle_timer <= 0:
                self.is_idle = False
                self.current_waypoint_index = (self.current_waypoint_index + 1) % len(self.path)
            return

        target = self.path[self.current_waypoint_index]
        dx = target[0] - self.position[0]
        dz = target[1] - self.position[1]
        dist = (dx**2 + dz**2)**0.5
        
        if dist < 0.15:
            self.position = list(target)
            self.is_idle = True
            self.idle_timer = self.idle_duration
        else:
            step = self.walk_speed * dt
            if step >= dist:
                self.position = list(target)
                self.is_idle = True
                self.idle_timer = self.idle_duration
            else:
                self.position[0] += (dx / dist) * step
                self.position[1] += (dz / dist) * step

    def to_dict(self) -> dict:
        return {
            'npc_id': self.npc_id,
            'name': self.name,
            'area': self.area,
            'position': self.position,
            'npc_type': self.npc_type,
            'is_primed': self.is_primed,
            'reliability_score': self.reliability_score,
        }


class NPCManager:
    def __init__(self):
        # room_code -> list of NPCCharacterState
        self.room_npcs: Dict[str, List[NPCCharacterState]] = {}
        # room_code -> {player_id: {npc_id: last_interaction_time}}
        self.interaction_cooldowns: Dict[str, Dict[str, Dict[str, float]]] = {}
        # room_code -> list of action events: [{player_id, action_type, area, timestamp}]
        self.room_actions: Dict[str, List[dict]] = {}
        # room_code -> timer to run observation checks (runs every 10 ticks)
        self.obs_tick_counters: Dict[str, int] = {}

    def spawn_npcs_for_room(self, room_code: str) -> List[dict]:
        npcs = []
        for area, config in AREA_NPC_CONFIG.items():
            paths = NPC_PATROL_PATHS.get(area, [[[0.0, 0.0]]])
            for i, name in enumerate(config['names']):
                path = paths[i % len(paths)]
                npc_type = config['types'][i % len(config['types'])]
                npc = NPCCharacterState(
                    npc_id=str(uuid.uuid4()),
                    name=name,
                    area=area,
                    path=path,
                    npc_type=npc_type
                )
                npcs.append(npc)
        self.room_npcs[room_code] = npcs
        self.room_actions[room_code] = []
        self.obs_tick_counters[room_code] = 0
        return [n.to_dict() for n in npcs]

    def get_room_npcs(self, room_code: str) -> List[dict]:
        return [n.to_dict() for n in self.room_npcs.get(room_code, [])]

    def can_interact(self, room_code: str, player_id: str, npc_id: str) -> bool:
        cooldowns = self.interaction_cooldowns.get(room_code, {})
        player_cooldowns = cooldowns.get(player_id, {})
        last = player_cooldowns.get(npc_id, 0.0)
        return (time.time() - last) >= 180  # 3 min cooldown

    def log_player_action(self, room_code: str, player_id: str, action_type: str, area: str):
        actions = self.room_actions.setdefault(room_code, [])
        actions.append({
            'player_id': player_id,
            'action_type': action_type,
            'area': area,
            'timestamp': time.time()
        })

    def tick_npc_movements(self, room_code: str, dt: float = 1.0):
        npcs = self.room_npcs.get(room_code, [])
        for npc in npcs:
            npc.update_position(dt)

    def run_observation_check(self, room_code: str, player_positions: Dict[str, dict], elapsed_seconds: int):
        """Called every 10 seconds to check NPC observations on nearby players."""
        npcs = self.room_npcs.get(room_code, [])
        actions = self.room_actions.get(room_code, [])
        now = time.time()

        for npc in npcs:
            # Check proximity to all players
            for player_id, state in player_positions.items():
                p_pos = state.get('position')
                if not p_pos:
                    continue
                
                # Proximity calculation
                dx = npc.position[0] - p_pos.get('x', 0.0)
                dz = npc.position[1] - p_pos.get('z', 0.0)
                dist = (dx**2 + dz**2)**0.5

                if dist <= npc.observation_radius:
                    # Player is within radius! Check recent actions (last 30s) in same area
                    recent_actions = [
                        a for a in actions
                        if a['player_id'] == player_id
                        and a['area'] == npc.area
                        and (now - a['timestamp']) <= 30.0
                    ]
                    
                    for action in recent_actions:
                        if action['action_type'] in ('EVIDENCE_DESTROYED', 'PLANT_FAKE_EVIDENCE', 'MANIPULATE_NPC'):
                            npc.observations.append({
                                'player_id': player_id,
                                'action_type': 'SUSPICIOUS',
                                'area': npc.area,
                                'description': 'Someone appeared to interfere with items in the area.',
                                'timestamp': elapsed_seconds,
                                'reliability': npc.reliability_score
                            })
                            break  # limit to one suspicious observation per tick

                    # Check presence in Research Center
                    if npc.area == 'Research Center':
                        # Fetch player duration from state if available
                        durations = state.get('durations', {})
                        rc_duration = durations.get('Research Center', 0)
                        if rc_duration >= 120:
                            # Verify if presence log not already added
                            already_logged = any(
                                o['player_id'] == player_id and o['action_type'] == 'PRESENCE'
                                for o in npc.observations
                            )
                            if not already_logged:
                                npc.observations.append({
                                    'player_id': player_id,
                                    'action_type': 'PRESENCE',
                                    'area': 'Research Center',
                                    'description': 'I saw someone spending considerable time in the Research Center.',
                                    'timestamp': elapsed_seconds,
                                    'reliability': npc.reliability_score
                                })

    def generate_statement(
        self,
        room_code: str,
        npc_id: str,
        player_id: str,
        assignments: Dict[str, str],
        player_names: Dict[str, str],
        reliability_range: Tuple[float, float],
        game_elapsed_seconds: int,
    ) -> dict:
        """Generate NPC witness statement per GDD §8.5 requirements."""
        npcs = self.room_npcs.get(room_code, [])
        npc = next((n for n in npcs if n.npc_id == npc_id), None)
        if not npc:
            return {}

        # Set/reset NPC's base reliability score
        npc.reliability_score = round(random.uniform(*reliability_range), 2)
        if npc.npc_type == 'FACULTY':
            npc.reliability_score = min(1.0, npc.reliability_score + 0.05)

        # Record interaction cooldown
        room_cooldowns = self.interaction_cooldowns.setdefault(room_code, {})
        player_cooldowns = room_cooldowns.setdefault(player_id, {})
        player_cooldowns[npc_id] = time.time()

        # If primed, give fabricated statement framing target
        if npc.is_primed and npc.primed_target and (time.time() - npc.primed_at) < 300:
            target_name = player_names.get(npc.primed_target, 'someone')
            statement_text = f"I'm fairly certain I saw {target_name} near the Research Center around {game_elapsed_seconds // 60} minutes ago."
            target = npc.primed_target
            npc.is_primed = False  # consume priming
            return {
                'npc_id': npc_id,
                'npc_name': npc.name,
                'player_id': player_id,
                'statement': statement_text,
                'points_to_player_id': target,
                'reliability': npc.reliability_score,
                'statement_type': 'WITNESS_PRIMED',
                'is_accurate': False
            }

        # Apply observation log statement logic
        observations = npc.observations
        if not observations:
            # Fallback to generic template
            statement_text = random.choice(GENERIC_STATEMENTS)
            return {
                'npc_id': npc_id,
                'npc_name': npc.name,
                'player_id': player_id,
                'statement': statement_text,
                'points_to_player_id': None,
                'reliability': 0.0,
                'statement_type': 'GENERIC',
                'is_accurate': True
            }

        # Choose the most reliable observation
        best_obs = max(observations, key=lambda o: o['reliability'])

        # Determine if statement is accurate or inaccurate based on reliability
        is_accurate = random.random() < npc.reliability_score
        target_player_id = best_obs['player_id']
        villain_ids = [pid for pid, role in assignments.items() if role in ('MASTERMIND', 'CONSPIRATOR')]
        innocent_ids = [pid for pid, role in assignments.items() if role in ('DETECTIVE', 'INVESTIGATOR')]

        if is_accurate:
            # Accurate statement
            target_name = player_names.get(target_player_id, 'someone')
            statement_text = f"{best_obs['description'].replace('someone', target_name)} It happened in the {best_obs['area']} around {best_obs['timestamp'] // 60} minutes into the session."
        else:
            # Misremembers: point to an innocent player or random incorrect suspect
            wrong_target = random.choice(innocent_ids) if innocent_ids else target_player_id
            wrong_name = player_names.get(wrong_target, 'someone')
            statement_text = f"I'm not completely sure, but I think I saw {wrong_name} acting suspicious near the {npc.area} earlier."
            target_player_id = wrong_target

        return {
            'npc_id': npc_id,
            'npc_name': npc.name,
            'player_id': player_id,
            'statement': statement_text,
            'points_to_player_id': target_player_id,
            'reliability': npc.reliability_score,
            'statement_type': 'WITNESS_ACCURATE' if is_accurate else 'WITNESS_INACCURATE',
            'is_accurate': is_accurate
        }

    def prime_npc(
        self,
        room_code: str,
        npc_id: str,
        mastermind_id: str,
        target_player_id: str,
    ) -> bool:
        npcs = self.room_npcs.get(room_code, [])
        npc = next((n for n in npcs if n.npc_id == npc_id), None)
        if not npc:
            return False
        npc.is_primed = True
        npc.primed_by = mastermind_id
        npc.primed_target = target_player_id
        npc.primed_at = time.time()
        return True


npc_manager = NPCManager()
