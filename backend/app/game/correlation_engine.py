"""
Evidence Correlation Engine — Document 6 (GDD §6.5)
Evaluates whether two collected evidence items share a meaningful connection.
"""
import random
from typing import Dict, Optional


class EvidenceCorrelationEngine:
    """
    Evaluates connections between pairs of evidence items on the Detective's board.
    Detects fabricated evidence with a difficulty-scaled probability.
    """

    DETECTION_CHANCE = {'easy': 0.30, 'medium': 0.20, 'hard': 0.10}

    # ── Main Evaluation ────────────────────────────────────────────────────

    def evaluate_correlation(
        self,
        evidence_a: Dict,
        evidence_b: Dict,
        difficulty: str = 'medium',
    ) -> Dict:
        """
        Evaluate whether two evidence items meaningfully correlate.

        Returns a result dict with:
          - correlated (bool)
          - correlation_strength (float 0–1)
          - fabrication_warning (bool)
          - target_player_id (str | None)
          - correlation_note (str)
        """
        target_a = evidence_a.get('points_to_player_id')
        target_b = evidence_b.get('points_to_player_id')

        # Both must point to the same non-null player to correlate
        same_target = (
            target_a is not None
            and target_b is not None
            and target_a == target_b
        )

        # Check if either is fabricated — server-side only; chance of revealing it
        fabrication_warning = False
        is_fab_a = evidence_a.get('is_fabricated', False)
        is_fab_b = evidence_b.get('is_fabricated', False)
        if is_fab_a or is_fab_b:
            chance = self.DETECTION_CHANCE.get(difficulty, 0.20)
            if random.random() < chance:
                fabrication_warning = True

        # Compute strength
        rel_a = evidence_a.get('reliability_score', 0.5)
        rel_b = evidence_b.get('reliability_score', 0.5)

        if same_target:
            # Bonus for matching targets; cap at 1.0
            strength = min((rel_a + rel_b) / 2 + 0.30, 1.0)
        elif target_a is None or target_b is None:
            # One is neutral — weak partial match
            strength = round(min(rel_a, rel_b) * 0.25, 2)
        else:
            # Contradictory targets — no correlation
            strength = 0.0

        return {
            'correlated':           same_target,
            'correlation_strength': round(strength, 2),
            'fabrication_warning':  fabrication_warning,
            'target_player_id':     target_a if same_target else None,
            'correlation_note':     self._generate_note(evidence_a, evidence_b, same_target, fabrication_warning),
        }

    # ── Note Generator ─────────────────────────────────────────────────────

    def _generate_note(
        self,
        a: Dict,
        b: Dict,
        correlated: bool,
        fabrication_warning: bool,
    ) -> str:
        area_a = a.get('area', 'unknown area')
        area_b = b.get('area', 'unknown area')

        if fabrication_warning:
            return (
                "⚠️ ANOMALY DETECTED: One or both items exhibit signs of tampering. "
                "Exercise extreme caution — this evidence may have been fabricated."
            )

        if correlated:
            if area_a == area_b:
                return (
                    f"Both items recovered from {area_a} implicate the same individual. "
                    f"Strong physical correlation confirmed. Cross-reference NPC statements."
                )
            return (
                f"Items from {area_a} and {area_b} converge on the same suspect. "
                f"Pattern suggests deliberate presence in multiple key locations."
            )

        if a.get('points_to_player_id') is None or b.get('points_to_player_id') is None:
            return (
                "One item is circumstantial and provides no direct link. "
                "Additional evidence required to establish a connection."
            )

        return (
            "These items implicate different individuals — no direct correlation found. "
            "Consider alternative investigative angles."
        )


# ── Singleton ──────────────────────────────────────────────────────────────

correlation_engine = EvidenceCorrelationEngine()
