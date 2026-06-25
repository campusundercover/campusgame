import uuid
import random
import time
from typing import Dict, List, Optional, Tuple

# NPC counts per area per GDD
AREA_NPC_CONFIG = {
    'Research Center':  {'count': 2, 'names': ['Dr. Priya Nair', 'Prof. Ramesh Kumar']},
    'Computer Lab':     {'count': 1, 'names': ['Lab Assistant Suresh']},
    'Security Office':  {'count': 1, 'names': ['Guard Venkatesh']},
    'MCA Department':   {'count': 2, 'names': ['Prof. Anitha Rao', 'Student Coordinator Deepak']},
    'Main Block':       {'count': 3, 'names': ['Receptionist Meena', 'Admin Staff Jacob', 'Peon Raju']},
    'Auditorium':       {'count': 1, 'names': ['AV Technician Kiran']},
    'Library':          {'count': 2, 'names': ['Librarian Ms. Stella', 'Library Staff Arun']},
    'Cafeteria':        {'count': 4, 'names': ['Chef Murugan', 'Cashier Kavitha', 'Student Rohit', 'Student Fatima']},
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

# NPC positions mapped to campus world coords
AREA_POSITIONS = {
    'Research Center':  [[-21, -22], [-19, -18]],
    'Computer Lab':     [[0, -22]],
    'Security Office':  [[21, -21]],
    'MCA Department':   [[-21, 1], [-19, -1]],
    'Main Block':       [[-2, 1], [0, -1], [2, 1]],
    'Auditorium':       [[21, 1]],
    'Library':          [[-21, 21], [-19, 19]],
    'Cafeteria':        [[-2, 21], [0, 19], [2, 21], [1, 20]],
}


class NPCCharacterState:
    def __init__(self, npc_id: str, name: str, area: str, position: List[float]):
        self.npc_id = npc_id
        self.name = name
        self.area = area
        self.position = position
        self.is_primed: bool = False
        self.primed_by: Optional[str] = None          # mastermind player_id
        self.primed_target: Optional[str] = None      # player to frame
        self.primed_at: float = 0.0

    def to_dict(self) -> dict:
        return {
            'npc_id': self.npc_id,
            'name': self.name,
            'area': self.area,
            'position': self.position,
        }


class NPCManager:
    def __init__(self):
        self.room_npcs: Dict[str, List[NPCCharacterState]] = {}
        # room_code -> {player_id: {npc_id: last_interaction_time}}
        self.interaction_cooldowns: Dict[str, Dict[str, Dict[str, float]]] = {}

    def spawn_npcs_for_room(self, room_code: str) -> List[dict]:
        npcs = []
        for area, config in AREA_NPC_CONFIG.items():
            positions = AREA_POSITIONS.get(area, [[0, 0]])
            for i, name in enumerate(config['names']):
                pos = positions[min(i, len(positions) - 1)]
                npc = NPCCharacterState(
                    npc_id=str(uuid.uuid4()),
                    name=name,
                    area=area,
                    position=pos,
                )
                npcs.append(npc)
        self.room_npcs[room_code] = npcs
        return [n.to_dict() for n in npcs]

    def get_room_npcs(self, room_code: str) -> List[dict]:
        return [n.to_dict() for n in self.room_npcs.get(room_code, [])]

    def can_interact(self, room_code: str, player_id: str, npc_id: str) -> bool:
        cooldowns = self.interaction_cooldowns.get(room_code, {})
        player_cooldowns = cooldowns.get(player_id, {})
        last = player_cooldowns.get(npc_id, 0.0)
        return (time.time() - last) >= 180  # 3 min cooldown

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
        """Generate NPC witness statement. Returns statement dict."""
        npcs = self.room_npcs.get(room_code, [])
        npc = next((n for n in npcs if n.npc_id == npc_id), None)
        if not npc:
            return {}

        # Record interaction cooldown
        room_cooldowns = self.interaction_cooldowns.setdefault(room_code, {})
        player_cooldowns = room_cooldowns.setdefault(player_id, {})
        player_cooldowns[npc_id] = time.time()

        reliability = round(random.uniform(*reliability_range), 2)

        # If primed, give framing statement
        if npc.is_primed and npc.primed_target and (time.time() - npc.primed_at) < 300:
            target_name = player_names.get(npc.primed_target, 'someone')
            statement_text = f"I'm fairly certain I saw {target_name} near the Research Center around {game_elapsed_seconds // 60} minutes ago."
            target = npc.primed_target
            npc.is_primed = False  # consume priming
        else:
            # Real statement — villain players are more likely to be mentioned
            villain_ids = [pid for pid, role in assignments.items()
                          if role in ('MASTERMIND', 'CONSPIRATOR')]
            innocent_ids = [pid for pid, role in assignments.items()
                           if role in ('DETECTIVE', 'INVESTIGATOR')]

            if random.random() < reliability:
                # Accurate — points toward a villain
                target = random.choice(villain_ids) if villain_ids else None
                templates = STATEMENT_TEMPLATES
            else:
                # Inaccurate — points toward innocent or vague
                target = random.choice(innocent_ids) if innocent_ids else None
                templates = MISLEADING_TEMPLATES

            target_name = player_names.get(target, 'someone') if target else 'someone'
            template = random.choice(templates)
            time_str = f"{18 + random.randint(0, 5)}:{random.randint(0, 59):02d}"
            statement_text = template.format(
                suspect=target_name,
                innocent=target_name,
                location=npc.area,
                time=time_str,
            )

        return {
            'npc_id': npc_id,
            'npc_name': npc.name,
            'player_id': player_id,
            'statement': statement_text,
            'points_to_player_id': target,
            'reliability': reliability,
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
