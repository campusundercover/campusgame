"""
Investigation Service — Document 6 (GDD Part 2)
Handles evidence spawning, reliability scoring, and evidence templates.
"""
import uuid
import random
from typing import List, Dict, Optional

from .evidence_manager import EVIDENCE_TYPES, DIGITAL_TEMPLATES, PHYSICAL_TEMPLATES

# ── Evidence Spawn Points (per GDD §6.3) ──────────────────────────────────
EVIDENCE_SPAWN_POINTS: Dict[str, List[Dict]] = {
    'Research Center': [
        {'id': 'rc_001', 'position': {'x': 12.5, 'y': 0.5, 'z': -8.0}, 'type_pool': ['DIGITAL', 'PHYSICAL']},
        {'id': 'rc_002', 'position': {'x': 14.0, 'y': 0.5, 'z': -6.5}, 'type_pool': ['DIGITAL']},
        {'id': 'rc_003', 'position': {'x': 10.0, 'y': 0.5, 'z': -9.0}, 'type_pool': ['PHYSICAL']},
        {'id': 'rc_004', 'position': {'x': 13.0, 'y': 1.2, 'z': -7.0}, 'type_pool': ['DIGITAL', 'PHYSICAL']},
        {'id': 'rc_005', 'position': {'x': 11.5, 'y': 0.5, 'z': -10.0}, 'type_pool': ['PHYSICAL']},
    ],
    'Computer Lab': [
        {'id': 'cl_001', 'position': {'x': 5.0, 'y': 0.5, 'z': -8.5}, 'type_pool': ['DIGITAL']},
        {'id': 'cl_002', 'position': {'x': 7.0, 'y': 0.5, 'z': -9.0}, 'type_pool': ['DIGITAL']},
        {'id': 'cl_003', 'position': {'x': 6.0, 'y': 0.8, 'z': -7.5}, 'type_pool': ['DIGITAL', 'PHYSICAL']},
        {'id': 'cl_004', 'position': {'x': 4.5, 'y': 0.5, 'z': -10.0}, 'type_pool': ['DIGITAL']},
    ],
    'Security Office': [
        {'id': 'so_001', 'position': {'x': 22.0, 'y': 0.5, 'z': -8.0}, 'type_pool': ['DIGITAL', 'PHYSICAL']},
        {'id': 'so_002', 'position': {'x': 23.5, 'y': 0.5, 'z': -9.0}, 'type_pool': ['DIGITAL']},
        {'id': 'so_003', 'position': {'x': 21.0, 'y': 1.0, 'z': -7.5}, 'type_pool': ['PHYSICAL']},
    ],
    'MCA Department': [
        {'id': 'mca_001', 'position': {'x': -5.0, 'y': 0.5, 'z': 2.0}, 'type_pool': ['PHYSICAL']},
        {'id': 'mca_002', 'position': {'x': -6.5, 'y': 0.5, 'z': 1.0}, 'type_pool': ['DIGITAL', 'PHYSICAL']},
        {'id': 'mca_003', 'position': {'x': -4.0, 'y': 0.5, 'z': 3.0}, 'type_pool': ['PHYSICAL']},
        {'id': 'mca_004', 'position': {'x': -7.0, 'y': 0.8, 'z': 2.5}, 'type_pool': ['DIGITAL']},
    ],
    'Library': [
        {'id': 'lib_001', 'position': {'x': -8.0, 'y': 0.5, 'z': 12.0}, 'type_pool': ['PHYSICAL', 'DIGITAL']},
        {'id': 'lib_002', 'position': {'x': -9.5, 'y': 0.5, 'z': 10.5}, 'type_pool': ['PHYSICAL']},
        {'id': 'lib_003', 'position': {'x': -7.0, 'y': 0.5, 'z': 13.0}, 'type_pool': ['PHYSICAL']},
        {'id': 'lib_004', 'position': {'x': -10.0, 'y': 1.5, 'z': 11.0}, 'type_pool': ['DIGITAL']},
    ],
    'Main Block': [
        {'id': 'mb_001', 'position': {'x': 0.0, 'y': 0.5, 'z': 0.0}, 'type_pool': ['PHYSICAL']},
        {'id': 'mb_002', 'position': {'x': 1.5, 'y': 0.5, 'z': -1.0}, 'type_pool': ['PHYSICAL']},
        {'id': 'mb_003', 'position': {'x': -1.0, 'y': 0.5, 'z': 1.0}, 'type_pool': ['PHYSICAL']},
    ],
    'Auditorium': [
        {'id': 'aud_001', 'position': {'x': 15.0, 'y': 0.5, 'z': 5.0}, 'type_pool': ['PHYSICAL']},
        {'id': 'aud_002', 'position': {'x': 16.5, 'y': 0.5, 'z': 4.0}, 'type_pool': ['PHYSICAL']},
    ],
    'Cafeteria': [
        {'id': 'caf_001', 'position': {'x': 3.0, 'y': 0.5, 'z': 14.0}, 'type_pool': ['PHYSICAL']},
        {'id': 'caf_002', 'position': {'x': 4.5, 'y': 0.5, 'z': 13.0}, 'type_pool': ['PHYSICAL']},
    ],
}

DENSITY_MULTIPLIER = {'easy': 1.4, 'medium': 1.0, 'hard': 0.7}


def get_evidence_template(evidence_type: str) -> str:
    """Return a random description template for the evidence type."""
    if evidence_type == 'DIGITAL':
        tpl = random.choice(DIGITAL_TEMPLATES)
        return tpl.format(time=f"{random.randint(18,23)}:{random.randint(0,59):02d}")
    return random.choice(PHYSICAL_TEMPLATES).format(time='')


def generate_reliability_score(difficulty: str, evidence_type: str) -> float:
    """Generate a reliability score based on difficulty and type."""
    base_ranges = {
        'easy':   (0.70, 0.95),
        'medium': (0.55, 0.85),
        'hard':   (0.35, 0.75),
    }
    lo, hi = base_ranges.get(difficulty, (0.55, 0.85))
    # Digital evidence is slightly more reliable
    if evidence_type == 'DIGITAL':
        hi = min(1.0, hi + 0.05)
    return round(random.uniform(lo, hi), 2)


def determine_evidence_target(
    difficulty: str,
    actual_mastermind_id: str,
    player_ids: List[str]
) -> Optional[str]:
    """
    Returns the player ID that the evidence points to.
    None = neutral (circumstantial, points to nobody).
    """
    innocent_players = [pid for pid in player_ids if pid != actual_mastermind_id]
    if not innocent_players:
        innocent_players = player_ids

    r = random.random()

    if difficulty == 'easy':
        if r < 0.80:
            return actual_mastermind_id
        return None

    elif difficulty == 'medium':
        if r < 0.70:
            return actual_mastermind_id
        if r < 0.90:
            return None
        return random.choice(innocent_players)

    else:  # hard
        if r < 0.60:
            return actual_mastermind_id
        if r < 0.80:
            return None
        return random.choice(innocent_players)


def spawn_initial_evidence(
    room_id: str,
    difficulty: str,
    actual_mastermind_id: str,
    player_ids: List[str],
) -> List[Dict]:
    """
    Spawn initial evidence at game start using the GDD §6.3 algorithm.
    Returns a list of evidence dicts ready to be stored.
    """
    multiplier = DENSITY_MULTIPLIER.get(difficulty, 1.0)

    all_spawn_points = []
    for area, points in EVIDENCE_SPAWN_POINTS.items():
        all_spawn_points.extend([(area, point) for point in points])

    total_possible = len(all_spawn_points)
    active_count = int(total_possible * multiplier)

    # Always include Research Center and Computer Lab (crime scene core)
    required_areas = {'Research Center', 'Computer Lab'}
    required_points = [(a, p) for a, p in all_spawn_points if a in required_areas]
    optional_points = [(a, p) for a, p in all_spawn_points if a not in required_areas]
    random.shuffle(optional_points)

    remaining = max(0, active_count - len(required_points))
    selected = required_points + optional_points[:remaining]

    evidence_items: List[Dict] = []
    for area, spawn_point in selected:
        ev_type = random.choice(spawn_point['type_pool'])
        points_to = determine_evidence_target(difficulty, actual_mastermind_id, player_ids)
        reliability = generate_reliability_score(difficulty, ev_type)

        evidence_items.append({
            'evidence_id':        str(uuid.uuid4()),
            'room_id':            room_id,
            'evidence_type':      ev_type,
            'area':               area,
            'spawn_point_id':     spawn_point['id'],
            'position':           spawn_point['position'],
            'points_to_player_id': points_to,
            'reliability_score':  reliability,
            'is_fabricated':      False,
            'is_destroyed':       False,
            'is_collected':       False,
            'collected_by':       None,
            'description':        get_evidence_template(ev_type),
        })

    return evidence_items
