import uuid
import random
from typing import Dict, List, Optional, Tuple

# Evidence types
EVIDENCE_TYPES = ['DIGITAL', 'PHYSICAL', 'TESTIMONIAL']

# Area evidence slot counts per GDD
AREA_EVIDENCE_SLOTS = {
    'Research Center':  5,
    'Computer Lab':     4,
    'Security Office':  3,
    'MCA Department':   4,
    'Main Block':       3,
    'Auditorium':       2,
    'Library':          4,
    'Cafeteria':        2,
}

DIGITAL_TEMPLATES = [
    "Server access log showing entry at {time}",
    "Email fragment mentioning 'the transfer'",
    "USB device transfer record",
    "Login timestamp from workstation",
    "Deleted file metadata recovered",
]

PHYSICAL_TEMPLATES = [
    "ID card scan logged at entrance",
    "Handwritten note with partial address",
    "Keycard access log",
    "Security camera footage excerpt",
    "Personal item left behind",
]


class EvidenceItem:
    def __init__(
        self,
        area: str,
        evidence_type: str,
        points_to_player_id: str,
        reliability_score: float,
        game_timestamp: int = 0,
        is_fabricated: bool = False,
    ):
        self.evidence_id = str(uuid.uuid4())
        self.evidence_type = evidence_type
        self.area_found = area
        self.timestamp_in_game = game_timestamp
        self.points_to_player_id = points_to_player_id
        self.reliability_score = reliability_score
        self.collected_by: Optional[str] = None
        self.destruction_possible = True
        self.is_fabricated = is_fabricated

        if evidence_type == 'DIGITAL':
            template = random.choice(DIGITAL_TEMPLATES)
        else:
            template = random.choice(PHYSICAL_TEMPLATES)
        self.description = template.format(time=f"{random.randint(18,23)}:{random.randint(0,59):02d}")

    def to_dict(self, include_hidden: bool = False) -> dict:
        data = {
            'evidence_id': self.evidence_id,
            'evidence_type': self.evidence_type,
            'area_found': self.area_found,
            'timestamp_in_game': self.timestamp_in_game,
            'points_to_player_id': self.points_to_player_id,
            'reliability_score': round(self.reliability_score, 2),
            'collected_by': self.collected_by,
            'destruction_possible': self.destruction_possible,
            'description': self.description,
        }
        if include_hidden:
            data['is_fabricated'] = self.is_fabricated
        return data


class EvidenceManager:
    def __init__(self):
        # room_code -> list of EvidenceItem
        self.room_evidence: Dict[str, List[EvidenceItem]] = {}

    def generate_evidence_for_room(
        self,
        room_code: str,
        player_ids: List[str],
        assignments: Dict[str, str],
        difficulty: str = 'medium',
        modifiers: dict = None,
    ) -> List[EvidenceItem]:
        """Generate initial evidence items scattered across campus areas."""
        multiplier = modifiers.get('evidence_density_multiplier', 1.0) if modifiers else 1.0
        rel_min, rel_max = (0.60, 0.85)
        if modifiers:
            rel_min, rel_max = modifiers.get('npc_reliability_range', (0.60, 0.85))

        # Innocent players (excluding villains — evidence will point to them)
        innocent_ids = [pid for pid, role in assignments.items()
                        if role in ('DETECTIVE', 'INVESTIGATOR')]
        villain_ids = [pid for pid, role in assignments.items()
                       if role in ('MASTERMIND', 'CONSPIRATOR')]

        items = []
        for area, slots in AREA_EVIDENCE_SLOTS.items():
            count = max(1, int(slots * multiplier))
            for _ in range(count):
                etype = random.choice(EVIDENCE_TYPES[:2])  # DIGITAL or PHYSICAL at start
                # Majority of evidence points to villains (it's a crime scene)
                target = random.choice(villain_ids) if random.random() < 0.65 else random.choice(innocent_ids)
                reliability = round(random.uniform(rel_min, rel_max), 2)
                item = EvidenceItem(
                    area=area,
                    evidence_type=etype,
                    points_to_player_id=target,
                    reliability_score=reliability,
                )
                items.append(item)

        self.room_evidence[room_code] = items
        return items

    def get_room_evidence(self, room_code: str) -> List[EvidenceItem]:
        return self.room_evidence.get(room_code, [])

    def collect_evidence(self, room_code: str, evidence_id: str, collector_id: str) -> Optional[EvidenceItem]:
        items = self.room_evidence.get(room_code, [])
        for item in items:
            if item.evidence_id == evidence_id and item.collected_by is None:
                item.collected_by = collector_id
                return item
        return None

    def destroy_evidence(self, room_code: str, evidence_id: str) -> bool:
        items = self.room_evidence.get(room_code, [])
        for item in items:
            if item.evidence_id == evidence_id and item.collected_by is None and item.destruction_possible:
                items.remove(item)
                return True
        return False

    def plant_fake_evidence(
        self,
        room_code: str,
        area: str,
        target_player_id: str,
        game_timestamp: int,
        difficulty: str = 'medium',
    ) -> Optional[EvidenceItem]:
        items = self.room_evidence.get(room_code, [])
        # Limit 3 fabricated items per room
        fabricated_count = sum(1 for i in items if i.is_fabricated)
        if fabricated_count >= 3:
            return None
        # Reliability is low for fabricated items
        reliability = round(random.uniform(0.3, 0.6), 2)
        item = EvidenceItem(
            area=area,
            evidence_type='FABRICATED',
            points_to_player_id=target_player_id,
            reliability_score=reliability,
            game_timestamp=game_timestamp,
            is_fabricated=True,
        )
        items.append(item)
        return item

    def get_area_evidence(self, room_code: str, area: str) -> List[dict]:
        """Public-facing evidence in an area (uncollected, shown in 3D world)."""
        return [
            i.to_dict() for i in self.room_evidence.get(room_code, [])
            if i.area_found == area and i.collected_by is None
        ]

    def get_detective_board(self, room_code: str) -> List[dict]:
        """All collected evidence for the Detective's evidence board."""
        return [
            i.to_dict() for i in self.room_evidence.get(room_code, [])
            if i.collected_by is not None
        ]


evidence_manager = EvidenceManager()
