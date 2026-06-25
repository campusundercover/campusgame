import uuid
import random
from typing import Dict, List, Optional

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


class PlayerTask:
    def __init__(self, definition: dict):
        self.task_id = str(uuid.uuid4())
        self.task_type = definition['task_type']
        self.name = definition['name']
        self.location = definition['location']
        self.duration_seconds = definition['duration_seconds']
        self.points = definition['points']
        self.role_restricted = definition['role_restricted']
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
            eligible = [
                t for t in TASK_DEFINITIONS
                if t['role_restricted'] is None or t['role_restricted'] == role
            ]
            selected = random.sample(eligible, min(3, len(eligible)))
            player_tasks = [PlayerTask(d) for d in selected]
            self.room_tasks[room_code][player_id] = player_tasks
            result[player_id] = [t.to_dict() for t in player_tasks]

        return result

    def get_player_tasks(self, room_code: str, player_id: str) -> List[dict]:
        tasks = self.room_tasks.get(room_code, {}).get(player_id, [])
        return [t.to_dict() for t in tasks]

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

    def get_player_score(self, room_code: str, player_id: str) -> int:
        tasks = self.room_tasks.get(room_code, {}).get(player_id, [])
        return sum(t.points for t in tasks if t.completed)

    def get_tasks_completed_count(self, room_code: str, player_id: str) -> int:
        tasks = self.room_tasks.get(room_code, {}).get(player_id, [])
        return sum(1 for t in tasks if t.completed)


task_manager = TaskManager()
