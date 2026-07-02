from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class RoleReveal(BaseModel):
    role: str
    partner_id: Optional[str] = None
    partner_role: Optional[str] = None


class EvidenceItemSchema(BaseModel):
    evidence_id: str
    evidence_type: str          # DIGITAL | PHYSICAL | TESTIMONIAL | FABRICATED
    area_found: str
    timestamp_in_game: int      # seconds since match start
    points_to_player_id: Optional[str] = None
    reliability_score: float
    collected_by: Optional[str] = None
    destruction_possible: bool = True


class EvidenceCollectEvent(BaseModel):
    evidence_id: str
    collector_player_id: str


class TaskSchema(BaseModel):
    task_id: str
    task_type: str
    location: str
    duration_seconds: int
    points: int
    role_restricted: Optional[str] = None   # None = all roles


class TaskProgressEvent(BaseModel):
    task_id: str
    player_id: str
    progress: float   # 0.0 – 1.0


class NPCSchema(BaseModel):
    npc_id: str
    name: str
    area: str
    position: List[float]   # [x, z]


class NPCStatement(BaseModel):
    npc_id: str
    player_id: str    # player who talked to NPC
    statement: str
    points_to_player_id: Optional[str] = None
    reliability: float


class ChatMessage(BaseModel):
    channel: str      # public | meeting | villain
    sender_id: str
    sender_name: str
    message: str
    timestamp: float


class AbilityUseRequest(BaseModel):
    ability_id: str
    target_player_id: Optional[str] = None
    target_area: Optional[str] = None
    target_npc_id: Optional[str] = None


class AbilityResult(BaseModel):
    ability_id: str
    success: bool
    message: str
    cooldown_seconds: int


class AccusationSubmit(BaseModel):
    mastermind_accusation: str     # player_id
    conspirator_accusation: str    # player_id


class PlayerResultStats(BaseModel):
    player_id: str
    username: str
    role: str
    evidence_collected: int
    tasks_completed: int
    points_earned: int
    won: bool


class GameOverResult(BaseModel):
    winner_faction: str    # 'INVESTIGATORS' | 'VILLAINS'
    correct_accusation: bool
    mastermind_id: str
    conspirator_id: str
    player_stats: List[PlayerResultStats]
