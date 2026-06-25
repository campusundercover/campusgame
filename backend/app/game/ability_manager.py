import time
from typing import Dict, Optional

# Ability definitions per role per GDD
ABILITY_DEFINITIONS = {
    'DETECTIVE': [
        {
            'ability_id': 'CCTV_ANALYSIS',
            'name': 'CCTV Analysis',
            'description': 'Review surveillance footage from the Security Office',
            'location_required': 'Security Office',
            'duration_seconds': 90,
            'cooldown_easy': 240, 'cooldown_medium': 240, 'cooldown_hard': 240,
            'max_uses': 99,
        },
        {
            'ability_id': 'DIGITAL_ANALYSIS',
            'name': 'Digital Evidence Analysis',
            'description': 'Recover server access logs from the Computer Lab',
            'location_required': 'Computer Lab',
            'duration_seconds': 60,
            'cooldown_easy': 180, 'cooldown_medium': 180, 'cooldown_hard': 180,
            'max_uses': 99,
        },
        {
            'ability_id': 'RECOVER_LOGS',
            'name': 'Recover Logs',
            'description': 'Recover deleted file metadata from Research Center',
            'location_required': 'Research Center',
            'duration_seconds': 45,
            'cooldown_easy': 300, 'cooldown_medium': 300, 'cooldown_hard': 300,
            'max_uses': 99,
        },
        {
            'ability_id': 'CORRELATE_EVIDENCE',
            'name': 'Correlate Evidence',
            'description': 'Link two pieces of evidence on the Evidence Board',
            'location_required': None,
            'duration_seconds': 0,
            'cooldown_easy': 0, 'cooldown_medium': 0, 'cooldown_hard': 0,
            'max_uses': 10,
        },
    ],
    'INVESTIGATOR': [
        {
            'ability_id': 'SUBMIT_OBSERVATION',
            'name': 'Submit Observation',
            'description': 'Log what you witnessed in an area',
            'location_required': None,
            'duration_seconds': 0,
            'cooldown_easy': 0, 'cooldown_medium': 0, 'cooldown_hard': 0,
            'max_uses': 99,
        },
    ],
    'MASTERMIND': [
        {
            'ability_id': 'PLANT_FAKE_EVIDENCE',
            'name': 'Plant Fake Evidence',
            'description': 'Create fabricated evidence to frame an innocent player',
            'location_required': None,  # any area
            'duration_seconds': 30,
            'cooldown_easy': 240, 'cooldown_medium': 180, 'cooldown_hard': 120,
            'max_uses': 3,
        },
        {
            'ability_id': 'TRIGGER_MEETING',
            'name': 'Trigger Emergency Meeting',
            'description': 'Force all players to the Auditorium for a discussion',
            'location_required': 'Auditorium',
            'duration_seconds': 0,
            'cooldown_easy': 480, 'cooldown_medium': 480, 'cooldown_hard': 480,
            'max_uses': 1,
        },
        {
            'ability_id': 'FRAME_PLAYER',
            'name': 'Frame Innocent Player',
            'description': 'Generate a false NPC witness statement against a target',
            'location_required': None,  # near target player
            'duration_seconds': 10,
            'cooldown_easy': 360, 'cooldown_medium': 360, 'cooldown_hard': 360,
            'max_uses': 2,
        },
        {
            'ability_id': 'MANIPULATE_NPC',
            'name': 'Manipulate NPC',
            'description': 'Prime an NPC to give a false statement about a target',
            'location_required': None,  # near NPC
            'duration_seconds': 15,
            'cooldown_easy': 300, 'cooldown_medium': 300, 'cooldown_hard': 300,
            'max_uses': 99,
        },
    ],
    'CONSPIRATOR': [
        {
            'ability_id': 'DESTROY_EVIDENCE',
            'name': 'Destroy Evidence',
            'description': 'Remove a piece of evidence from the campus',
            'location_required': None,  # near evidence
            'duration_seconds': 20,
            'cooldown_easy': 60, 'cooldown_medium': 30, 'cooldown_hard': 20,
            'max_uses': 99,
        },
        {
            'ability_id': 'SECURE_PERIMETER',
            'name': 'Secure Perimeter',
            'description': 'Disable CCTV feeds in one area for 2 minutes',
            'location_required': 'Security Office',
            'duration_seconds': 30,
            'cooldown_easy': 300, 'cooldown_medium': 240, 'cooldown_hard': 180,
            'max_uses': 2,
        },
        {
            'ability_id': 'CREATE_ALIBI',
            'name': 'Create Alibi',
            'description': 'Generate a witness statement supporting the Mastermind',
            'location_required': None,
            'duration_seconds': 20,
            'cooldown_easy': 240, 'cooldown_medium': 180, 'cooldown_hard': 120,
            'max_uses': 2,
        },
    ],
}


class PlayerAbilityState:
    def __init__(self, ability_def: dict, difficulty: str):
        self.ability_id = ability_def['ability_id']
        self.name = ability_def['name']
        self.description = ability_def['description']
        self.location_required = ability_def['location_required']
        self.duration_seconds = ability_def['duration_seconds']
        self.max_uses = ability_def['max_uses']
        cooldown_key = f'cooldown_{difficulty}'
        self.cooldown_seconds = ability_def.get(cooldown_key, ability_def.get('cooldown_medium', 60))
        self.uses_remaining = ability_def['max_uses']
        self.last_used_at: float = 0.0

    @property
    def is_on_cooldown(self) -> bool:
        return (time.time() - self.last_used_at) < self.cooldown_seconds

    @property
    def cooldown_remaining(self) -> int:
        remaining = self.cooldown_seconds - (time.time() - self.last_used_at)
        return max(0, int(remaining))

    def use(self) -> bool:
        if self.is_on_cooldown or self.uses_remaining <= 0:
            return False
        self.last_used_at = time.time()
        if self.max_uses < 99:
            self.uses_remaining -= 1
        return True

    def to_dict(self) -> dict:
        return {
            'ability_id': self.ability_id,
            'name': self.name,
            'description': self.description,
            'location_required': self.location_required,
            'duration_seconds': self.duration_seconds,
            'is_on_cooldown': self.is_on_cooldown,
            'cooldown_remaining': self.cooldown_remaining,
            'uses_remaining': self.uses_remaining,
            'max_uses': self.max_uses,
        }


class AbilityManager:
    def __init__(self):
        # room_code -> player_id -> list of PlayerAbilityState
        self.room_abilities: Dict[str, Dict[str, list]] = {}

    def assign_abilities(
        self,
        room_code: str,
        assignments: Dict[str, str],
        difficulty: str = 'medium',
    ) -> Dict[str, list]:
        self.room_abilities[room_code] = {}
        result = {}
        for player_id, role in assignments.items():
            defs = ABILITY_DEFINITIONS.get(role, [])
            states = [PlayerAbilityState(d, difficulty) for d in defs]
            self.room_abilities[room_code][player_id] = states
            result[player_id] = [s.to_dict() for s in states]
        return result

    def get_player_abilities(self, room_code: str, player_id: str) -> list:
        states = self.room_abilities.get(room_code, {}).get(player_id, [])
        return [s.to_dict() for s in states]

    def use_ability(
        self,
        room_code: str,
        player_id: str,
        ability_id: str,
    ) -> Optional[dict]:
        states = self.room_abilities.get(room_code, {}).get(player_id, [])
        for state in states:
            if state.ability_id == ability_id:
                success = state.use()
                return {
                    'ability_id': ability_id,
                    'success': success,
                    'message': 'Ability used successfully.' if success else (
                        'On cooldown.' if state.is_on_cooldown else 'No uses remaining.'
                    ),
                    'cooldown_remaining': state.cooldown_remaining,
                }
        return None


ability_manager = AbilityManager()
