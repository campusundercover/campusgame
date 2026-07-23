import uuid
import random
from typing import Dict, List, Optional

# ── Area → world [x, z] positions (mirrored from frontend/src/components/game/TaskZones.jsx)
# Must be kept in sync with AREA_WORLD_POSITIONS in TaskZones.jsx.
AREA_WORLD_POSITIONS: Dict[str, tuple] = {
    'Research Center': (28.0, -20.0),
    'Computer Lab':    (28.0,   0.0),
    'Security Office': (-30.0,  4.0),
    'MCA Department':  (  8.0, 14.0),
    'Main Block':      (-10.0, -8.0),
    'Auditorium':      (-28.0,-28.0),
    'Library':         (-24.0, 22.0),
    'Cafeteria':       ( 32.0, 16.0),
}

# Task definitions per GDD
TASK_DEFINITIONS = [
    {
        'task_type': 'REPAIR_NETWORK',
        'name': 'Repair Network Terminal',
        'location': 'Computer Lab',
        'duration_seconds': 45,
        'points': 10,
        'role_restricted': None,
    },
    {
        'task_type': 'ARCHIVE_FILES',
        'name': 'Archive Research Files',
        'location': 'Library',
        'duration_seconds': 60,
        'points': 15,
        'role_restricted': None,
    },
    {
        'task_type': 'SUBMIT_ATTENDANCE',
        'name': 'Submit Attendance',
        'location': 'MCA Department',
        'duration_seconds': 30,
        'points': 8,
        'role_restricted': None,
    },
    {
        'task_type': 'CHECK_CCTV',
        'name': 'Check CCTV Feeds',
        'location': 'Security Office',
        'duration_seconds': 90,
        'points': 20,
        'role_restricted': 'DETECTIVE',
    },
    {
        'task_type': 'RETRIEVE_PRINT',
        'name': 'Retrieve Print Job',
        'location': 'Main Block',
        'duration_seconds': 20,
        'points': 5,
        'role_restricted': None,
    },
    {
        'task_type': 'RESTOCK_LAB',
        'name': 'Restock Lab Supplies',
        'location': 'Research Center',
        'duration_seconds': 45,
        'points': 10,
        'role_restricted': None,
    },
    {
        'task_type': 'SETUP_AUDITORIUM',
        'name': 'Set Up Auditorium',
        'location': 'Auditorium',
        'duration_seconds': 50,
        'points': 12,
        'role_restricted': None,
    },
    {
        'task_type': 'PLACE_LUNCH',
        'name': 'Place Lunch Order',
        'location': 'Cafeteria',
        'duration_seconds': 15,
        'points': 3,
        'role_restricted': None,
    },
]

# ── Villain roles that receive is_sabotage=True tasks
VILLAIN_ROLES = {'MASTERMIND', 'CONSPIRATOR'}

# ── What happens server-side when a villain completes a task at a given location.
# Each entry describes the sabotage effect type and optional metadata.
# main.py reads this and calls into evidence_manager / npc_manager accordingly.
SABOTAGE_EFFECTS = {
    # task_type -> effect descriptor
    'REPAIR_NETWORK':    {'effect': 'CORRUPT_EVIDENCE', 'area': 'Computer Lab',
                          'description': 'A keylogger corrupts nearby digital evidence.'},
    'ARCHIVE_FILES':     {'effect': 'CORRUPT_EVIDENCE', 'area': 'Library',
                          'description': 'Research database corruption wipes an evidence trail.'},
    'SUBMIT_ATTENDANCE': {'effect': 'NPC_SUSPICION_SHIFT', 'area': 'MCA Department',
                          'description': 'Falsified records deflect NPC suspicion to an innocent.'},
    'CHECK_CCTV':        {'effect': 'CORRUPT_EVIDENCE', 'area': 'Security Office',
                          'description': 'Camera feeds are wiped; a digital evidence item is destroyed.'},
    'RETRIEVE_PRINT':    {'effect': 'NPC_SUSPICION_SHIFT', 'area': 'Main Block',
                          'description': 'Intercepted keycard printout implicates an innocent.'},
    'RESTOCK_LAB':       {'effect': 'CORRUPT_EVIDENCE', 'area': 'Research Center',
                          'description': 'Contamination destroys a piece of physical evidence.'},
    'SETUP_AUDITORIUM':  {'effect': 'NPC_SUSPICION_SHIFT', 'area': 'Auditorium',
                          'description': 'Rigged lights cause panic; NPCs misremember who was present.'},
    'PLACE_LUNCH':       {'effect': 'NPC_SUSPICION_SHIFT', 'area': 'Cafeteria',
                          'description': 'Food tampering incident draws attention away from the villains.'},
}


class PlayerTask:
    def __init__(self, definition: dict, is_sabotage: bool = False):
        self.task_id = str(uuid.uuid4())
        self.task_type = definition['task_type']
        self.name = definition['name']
        self.location = definition['location']
        self.duration_seconds = definition['duration_seconds']
        # Villain tasks grant 0 points to the team score; the real reward is the sabotage effect.
        self.points = 0 if is_sabotage else definition['points']
        self.role_restricted = definition['role_restricted']
        self.is_sabotage: bool = is_sabotage
        self.progress: float = 0.0
        self.completed: bool = False

    def to_dict(self) -> dict:
        return {
            'task_id': self.task_id,
            'task_type': self.task_type,
            'name': self.name,
            'location': self.location,
            'duration_seconds': self.duration_seconds,
            'points': self.points,
            'role_restricted': self.role_restricted,
            # is_sabotage is intentionally sent to the client so the villain HUD can
            # show flavor text, but is_sabotage is NOT broadcast to innocent players.
            'is_sabotage': self.is_sabotage,
            'progress': round(self.progress, 3),
            'completed': self.completed,
        }


class TaskManager:
    def __init__(self):
        # room_code -> player_id -> list of tasks
        self.room_tasks: Dict[str, Dict[str, List[PlayerTask]]] = {}

    def assign_tasks_for_room(
        self,
        room_code: str,
        assignments: Dict[str, str],
    ) -> Dict[str, List[dict]]:
        """Assign 3 tasks per player on game start."""
        self.room_tasks[room_code] = {}
        result = {}

        for player_id, role in assignments.items():
            is_villain = role in VILLAIN_ROLES
            eligible = [
                t for t in TASK_DEFINITIONS
                if t['role_restricted'] is None or t['role_restricted'] == role
            ]
            selected = random.sample(eligible, min(3, len(eligible)))
            # Villain tasks look identical to innocent tasks from the outside
            # (same task_type/location) but are flagged is_sabotage=True.
            player_tasks = [PlayerTask(d, is_sabotage=is_villain) for d in selected]
            self.room_tasks[room_code][player_id] = player_tasks
            result[player_id] = [t.to_dict() for t in player_tasks]

        return result

    def get_player_tasks(self, room_code: str, player_id: str) -> List[dict]:
        tasks = self.room_tasks.get(room_code, {}).get(player_id, [])
        return [t.to_dict() for t in tasks]

    def get_task_by_id(self, room_code: str, player_id: str, task_id: str) -> Optional['PlayerTask']:
        """Return the raw PlayerTask object for server-side validation (not a serialised dict)."""
        tasks = self.room_tasks.get(room_code, {}).get(player_id, [])
        return next((t for t in tasks if t.task_id == task_id), None)

    def update_task_progress(
        self,
        room_code: str,
        player_id: str,
        task_id: str,
        delta_progress: float,
    ) -> Optional[dict]:
        """Increment task progress. Returns task dict if updated."""
        tasks = self.room_tasks.get(room_code, {}).get(player_id, [])
        for task in tasks:
            if task.task_id == task_id and not task.completed:
                task.progress = min(1.0, task.progress + delta_progress)
                if task.progress >= 1.0:
                    task.completed = True
                return task.to_dict()
        return None

    def reset_task_progress(self, room_code: str, player_id: str, task_id: str) -> Optional[dict]:
        """Reset task progress when player exits zone."""
        tasks = self.room_tasks.get(room_code, {}).get(player_id, [])
        for task in tasks:
            if task.task_id == task_id and not task.completed:
                task.progress = 0.0
                return task.to_dict()
        return None

    def apply_sabotage_effect(
        self,
        room_code: str,
        task_type: str,
    ) -> Optional[dict]:
        """Return the sabotage effect descriptor for main.py to execute.

        The caller (main.py) is responsible for actually mutating evidence/NPC state
        because task_manager must not import evidence_manager or npc_manager (avoids
        circular imports).  Returns None if no effect is registered.
        """
        return SABOTAGE_EFFECTS.get(task_type)

    def get_player_score(self, room_code: str, player_id: str) -> int:
        """Sum points for completed non-sabotage tasks only (villains score 0)."""
        tasks = self.room_tasks.get(room_code, {}).get(player_id, [])
        return sum(t.points for t in tasks if t.completed and not t.is_sabotage)

    def get_room_completion_percent(self, room_code: str) -> dict:
        """Compute completed vs total tasks across all non-villain players in the room."""
        player_tasks_map = self.room_tasks.get(room_code, {})
        non_villain_tasks = [
            task
            for tasks in player_tasks_map.values()
            for task in tasks
            if not task.is_sabotage
        ]
        total = len(non_villain_tasks)
        completed = sum(1 for t in non_villain_tasks if t.completed)
        percent = round((completed / total * 100), 1) if total > 0 else 0.0
        return {
            'percent': percent,
            'completed': completed,
            'total': total,
        }

    def get_tasks_completed_count(self, room_code: str, player_id: str) -> int:
        tasks = self.room_tasks.get(room_code, {}).get(player_id, [])
        return sum(1 for t in tasks if t.completed)


task_manager = TaskManager()
