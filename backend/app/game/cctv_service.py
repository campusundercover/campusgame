"""
CCTV Analysis Engine — Document 6 (GDD §6.4)
Records player movements every 5 seconds and generates anonymized CCTV reports.
"""
import time
from typing import Dict, List, Optional
import uuid


class CCTVAnalysisEngine:
    """
    Records player movement logs and generates area-specific CCTV reports.
    Players are identified by anonymous color indices (1–10), never by name.
    """

    # 10 distinct display colors for anonymous CCTV blips
    COLOR_MAP = {
        1: '#3b82f6', 2: '#22c55e', 3: '#ec4899', 4: '#a855f7',
        5: '#eab308', 6: '#8b5cf6', 7: '#f97316', 8: '#06b6d4',
        9: '#ef4444', 10: '#14b8a6',
    }

    def __init__(self, room_id: str):
        self.room_id = room_id
        self.movement_log: List[Dict] = []
        # player_id (str) -> int color index (1-10)
        self.color_assignments: Dict[str, int] = {}
        self._next_color_index = 1

    # ── Color Assignment ──────────────────────────────────────────────────

    def assign_player_color(self, player_id: str) -> int:
        """Assign a consistent color index to a player for this session."""
        if player_id not in self.color_assignments:
            self.color_assignments[player_id] = self._next_color_index
            self._next_color_index = min(self._next_color_index + 1, 10)
        return self.color_assignments[player_id]

    def get_player_color_index(self, player_id: str) -> int:
        return self.color_assignments.get(player_id, 0)

    # ── Recording ─────────────────────────────────────────────────────────

    def record_movement(
        self,
        player_id: str,
        position: Dict,
        area: str,
        game_timestamp: float,
    ) -> None:
        """
        Called every 5 seconds per player by the game loop.
        Stores anonymized movement data — never stores player names.
        """
        color_index = self.assign_player_color(player_id)
        self.movement_log.append({
            'timestamp':    game_timestamp,
            'color_index':  color_index,
            'hex_color':    self.COLOR_MAP.get(color_index, '#ffffff'),
            'position':     position,
            'area':         area,
        })

    # ── Report Generation ─────────────────────────────────────────────────

    def generate_cctv_report(
        self,
        requested_area: str,
        time_window_minutes: int = 5,
        current_game_time: float = 0.0,
    ) -> Dict:
        """
        Returns anonymized movement data for the requested area.
        The detective sees colored dots — never player names.
        """
        window_start = current_game_time - (time_window_minutes * 60)

        relevant = [
            e for e in self.movement_log
            if e['area'] == requested_area and e['timestamp'] >= window_start
        ]

        # Key timeframe: first 8 minutes = when the "crime" was committed
        key_movements = [e for e in relevant if e['timestamp'] <= 480]
        suspects_in_area = list({e['color_index'] for e in key_movements})

        generated_evidence = []
        for color_index in suspects_in_area:
            # Determine how long this color was in the area during key window
            presence = [e for e in key_movements if e['color_index'] == color_index]
            duration_seconds = len(presence) * 5  # recorded every 5s
            generated_evidence.append({
                'evidence_id':   str(uuid.uuid4()),
                'evidence_type': 'CCTV',
                'area':          requested_area,
                'color_index':   color_index,
                'hex_color':     self.COLOR_MAP.get(color_index, '#ffffff'),
                'presence_count': len(presence),
                'duration_seconds': duration_seconds,
                'description': (
                    f"CCTV footage shows Color-{color_index} entity was present "
                    f"in {requested_area} for ~{duration_seconds}s during key window."
                ),
                'reliability_score': min(0.9, 0.4 + (duration_seconds / 480) * 0.5),
            })

        return {
            'area':               requested_area,
            'movement_replay':    relevant,          # for minimap animation
            'generated_evidence': generated_evidence,
            'suspects_count':     len(suspects_in_area),
            'time_window_minutes': time_window_minutes,
            'analysis_complete':  True,
        }

    def get_movement_replay(self, area: str) -> List[Dict]:
        """Return all recorded movements for an area (anonymized)."""
        return [e for e in self.movement_log if e['area'] == area]


# ── Room-keyed registry ────────────────────────────────────────────────────

_cctv_engines: Dict[str, CCTVAnalysisEngine] = {}


def get_or_create_cctv_engine(room_id: str) -> CCTVAnalysisEngine:
    if room_id not in _cctv_engines:
        _cctv_engines[room_id] = CCTVAnalysisEngine(room_id)
    return _cctv_engines[room_id]


def cleanup_cctv_engine(room_id: str) -> None:
    _cctv_engines.pop(room_id, None)
