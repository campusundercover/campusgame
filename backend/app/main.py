import time
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Optional

from app.core.config import settings
from app.api.v1.api import api_router
from app.game.lobby_manager import lobby_manager
from app.game.role_service import assign_roles
from app.game.evidence_manager import evidence_manager
from app.game.task_manager import task_manager
from app.game.npc_manager import npc_manager
from app.game.ability_manager import ability_manager
from app.game.meeting_manager import meeting_manager
from app.game.resolution_service import resolve_game

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

app.include_router(api_router, prefix=settings.API_V1_STR)

# CORS
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# ──────────────────────────────────────────────────────────────
# In-memory game session state (per room)
# ──────────────────────────────────────────────────────────────
class GameSessionState:
    def __init__(self):
        self.assignments: Dict[str, str] = {}       # player_id -> role
        self.mastermind_id: Optional[str] = None
        self.conspirator_id: Optional[str] = None
        self.modifiers: dict = {}
        self.started_at: float = 0.0
        self.is_active: bool = False

    @property
    def elapsed_seconds(self) -> int:
        if not self.is_active:
            return 0
        return int(time.time() - self.started_at)

# room_code -> GameSessionState
active_game_states: Dict[str, GameSessionState] = {}


# ──────────────────────────────────────────────────────────────
# WebSocket broadcast helpers
# ──────────────────────────────────────────────────────────────
async def broadcast_to_room(room_code: str, message: dict):
    """Send a message to every connected player in the room."""
    room = lobby_manager.get_room(room_code)
    if not room:
        return
    for player in room.players.values():
        if player.websocket:
            try:
                await player.websocket.send_json(message)
            except Exception:
                pass


async def send_to_player(room_code: str, player_id: int, message: dict):
    """Send a private message to one specific player."""
    room = lobby_manager.get_room(room_code)
    if not room:
        return
    player = room.players.get(player_id)
    if player and player.websocket:
        try:
            await player.websocket.send_json(message)
        except Exception:
            pass


# ──────────────────────────────────────────────────────────────
# Health endpoints
# ──────────────────────────────────────────────────────────────
@app.get("/")
def read_root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API Server",
        "environment": settings.ENVIRONMENT,
        "status": "healthy"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}


# ──────────────────────────────────────────────────────────────
# Lobby WebSocket — waiting room management
# ──────────────────────────────────────────────────────────────
@app.websocket("/ws/lobby/{room_code}/{player_id}")
async def websocket_lobby_endpoint(websocket: WebSocket, room_code: str, player_id: str):
    await websocket.accept()

    room = lobby_manager.get_room(room_code)
    if not room:
        await websocket.send_json({"type": "ERROR", "payload": {"message": f"Room '{room_code}' not found."}})
        await websocket.close(code=1008)
        return

    try:
        p_id = int(player_id)
    except ValueError:
        await websocket.send_json({"type": "ERROR", "payload": {"message": "Invalid player ID."}})
        await websocket.close(code=1008)
        return

    player = room.players.get(p_id)
    if not player:
        await websocket.send_json({"type": "ERROR", "payload": {"message": f"Player {player_id} not in room {room_code}."}})
        await websocket.close(code=1008)
        return

    player.websocket = websocket
    await lobby_manager.broadcast_state(room_code)

    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")

            if action == "TOGGLE_READY":
                lobby_manager.toggle_ready(room_code, p_id)
                await lobby_manager.broadcast_state(room_code)

            elif action == "START_GAME":
                if room.host_id != p_id:
                    continue
                players = list(room.players.keys())
                if len(players) < 4:
                    await send_to_player(room_code, p_id, {
                        "type": "ERROR",
                        "payload": {"message": "Need at least 4 players to start."}
                    })
                    continue

                # Assign roles
                player_ids_str = [str(pid) for pid in players]
                result = assign_roles(player_ids_str, difficulty=room.difficulty)

                # Store game state
                gs = GameSessionState()
                gs.assignments = result['assignments']
                gs.mastermind_id = result['mastermind_id']
                gs.conspirator_id = result['conspirator_id']
                gs.modifiers = result['modifiers']
                gs.started_at = time.time()
                gs.is_active = True
                active_game_states[room_code] = gs

                # Generate world data
                player_names = {str(pid): p.username for pid, p in room.players.items()}
                npc_manager.spawn_npcs_for_room(room_code)
                evidence_manager.generate_evidence_for_room(
                    room_code, player_ids_str, result['assignments'],
                    difficulty=room.difficulty, modifiers=result['modifiers']
                )
                task_manager.assign_tasks_for_room(room_code, result['assignments'])
                ability_manager.assign_abilities(room_code, result['assignments'], difficulty=room.difficulty)

                # Update lobby status
                room.status = "playing"

                # Send private role reveal to each player
                for pid_str, reveal in result['reveals'].items():
                    pid_int = int(pid_str)
                    partner_name = player_names.get(reveal['partner_id']) if reveal.get('partner_id') else None
                    await send_to_player(room_code, pid_int, {
                        "type": "ROLE_REVEAL",
                        "payload": {
                            **reveal,
                            "partner_name": partner_name,
                            "timer_seconds": result['modifiers']['timer_seconds'],
                            "difficulty": room.difficulty,
                        }
                    })

                # Broadcast game started to all
                await broadcast_to_room(room_code, {
                    "type": "GAME_STARTED",
                    "payload": {
                        "npcs": npc_manager.get_room_npcs(room_code),
                        "timer_seconds": result['modifiers']['timer_seconds'],
                    }
                })

    except WebSocketDisconnect:
        lobby_manager.leave_room(room_code, p_id)
        await lobby_manager.broadcast_state(room_code)


# ──────────────────────────────────────────────────────────────
# Game WebSocket — live gameplay events
# ──────────────────────────────────────────────────────────────
@app.websocket("/ws/game/{room_code}/{player_id}")
async def websocket_game_endpoint(websocket: WebSocket, room_code: str, player_id: str):
    # Always accept first — returning before accept causes HTTP 500 on client
    await websocket.accept()

    room = lobby_manager.get_room(room_code)
    if not room:
        await websocket.send_json({"type": "ERROR", "payload": {"message": f"Room '{room_code}' not found. Join via lobby first."}})
        await websocket.close(code=1008)
        return

    try:
        p_id = int(player_id)
    except ValueError:
        await websocket.send_json({"type": "ERROR", "payload": {"message": "Invalid player ID."}})
        await websocket.close(code=1008)
        return

    player = room.players.get(p_id)
    if not player:
        await websocket.send_json({"type": "ERROR", "payload": {"message": f"Player {player_id} not in room {room_code}."}})
        await websocket.close(code=1008)
        return

    player.websocket = websocket

    gs = active_game_states.get(room_code)
    if not gs:
        # Game not started yet — send waiting status and keep connection open
        await websocket.send_json({"type": "WAITING", "payload": {"message": "Waiting for game to start..."}})
        # Keep alive until disconnected
        try:
            while True:
                await websocket.receive_text()
                gs = active_game_states.get(room_code)
                if gs:
                    break
        except WebSocketDisconnect:
            player.websocket = None
            return

    player_names = {str(pid): p.username for pid, p in room.players.items()}

    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")
            pid_str = str(p_id)

            # ── Position update (broadcast to all) ──
            if action == "POSITION_UPDATE":
                await broadcast_to_room(room_code, {
                    "type": "PLAYER_MOVED",
                    "payload": {
                        "player_id": pid_str,
                        "position": data.get("position"),
                        "rotation": data.get("rotation"),
                    }
                })

            # ── Collect evidence ──
            elif action == "COLLECT_EVIDENCE":
                ev_id = data.get("evidence_id")
                item = evidence_manager.collect_evidence(room_code, ev_id, pid_str)
                if item:
                    await broadcast_to_room(room_code, {
                        "type": "EVIDENCE_COLLECTED",
                        "payload": {"evidence": item.to_dict(), "collector_id": pid_str}
                    })
                    # Update detective's board privately
                    detective_id = next(
                        (int(pid) for pid, role in gs.assignments.items() if role == 'DETECTIVE'), None
                    )
                    if detective_id:
                        await send_to_player(room_code, detective_id, {
                            "type": "EVIDENCE_BOARD_UPDATE",
                            "payload": {"board": evidence_manager.get_detective_board(room_code)}
                        })

            # ── Use ability ──
            elif action == "USE_ABILITY":
                ability_id = data.get("ability_id")
                target_player = data.get("target_player_id")
                target_area = data.get("target_area")
                target_npc = data.get("target_npc_id")

                result = ability_manager.use_ability(room_code, pid_str, ability_id)
                if result and result['success']:

                    # Handle ability-specific effects
                    if ability_id == "PLANT_FAKE_EVIDENCE":
                        item = evidence_manager.plant_fake_evidence(
                            room_code, target_area or "Main Block",
                            target_player or "", gs.elapsed_seconds
                        )
                        if item:
                            await broadcast_to_room(room_code, {
                                "type": "EVIDENCE_APPEARED",
                                "payload": {"evidence": item.to_dict()}
                            })

                    elif ability_id == "DESTROY_EVIDENCE":
                        ev_id = data.get("evidence_id")
                        destroyed = evidence_manager.destroy_evidence(room_code, ev_id)
                        if destroyed:
                            await broadcast_to_room(room_code, {
                                "type": "EVIDENCE_DESTROYED",
                                "payload": {"evidence_id": ev_id}
                            })

                    elif ability_id == "TRIGGER_MEETING":
                        if meeting_manager.can_trigger_mastermind_meeting(room_code):
                            mtg = meeting_manager.start_meeting(room_code, pid_str, is_mastermind=True)
                            if mtg:
                                await broadcast_to_room(room_code, {
                                    "type": "MEETING_STARTED",
                                    "payload": mtg.to_dict()
                                })

                    elif ability_id == "MANIPULATE_NPC":
                        npc_manager.prime_npc(room_code, target_npc, pid_str, target_player or "")

                    elif ability_id == "FRAME_PLAYER":
                        # Generate fake testimonial evidence
                        item = evidence_manager.plant_fake_evidence(
                            room_code, "Research Center",
                            target_player or "", gs.elapsed_seconds
                        )
                        if item:
                            # Secretly add to board, appears as testimonial
                            item.evidence_type = "TESTIMONIAL"
                            detective_id = next(
                                (int(pid) for pid, role in gs.assignments.items() if role == 'DETECTIVE'), None
                            )
                            if detective_id:
                                await send_to_player(room_code, detective_id, {
                                    "type": "EVIDENCE_BOARD_UPDATE",
                                    "payload": {"board": evidence_manager.get_detective_board(room_code)}
                                })

                await send_to_player(room_code, p_id, {
                    "type": "ABILITY_RESULT",
                    "payload": result or {"success": False, "message": "Unknown ability."}
                })

            # ── Task events ──
            elif action == "TASK_PROGRESS":
                task_id = data.get("task_id")
                delta = data.get("delta", 0.05)
                updated = task_manager.update_task_progress(room_code, pid_str, task_id, delta)
                if updated:
                    await send_to_player(room_code, p_id, {
                        "type": "TASK_UPDATED", "payload": updated
                    })
                    if updated.get("completed"):
                        await broadcast_to_room(room_code, {
                            "type": "TASK_COMPLETED",
                            "payload": {"player_id": pid_str, "task": updated}
                        })

            elif action == "TASK_RESET":
                task_id = data.get("task_id")
                updated = task_manager.reset_task_progress(room_code, pid_str, task_id)
                if updated:
                    await send_to_player(room_code, p_id, {
                        "type": "TASK_UPDATED", "payload": updated
                    })

            # ── NPC Interaction ──
            elif action == "NPC_INTERACT":
                npc_id = data.get("npc_id")
                if not npc_manager.can_interact(room_code, pid_str, npc_id):
                    await send_to_player(room_code, p_id, {
                        "type": "ERROR",
                        "payload": {"message": "NPC is not available yet (cooldown)."}
                    })
                    continue
                rel_range = gs.modifiers.get('npc_reliability_range', (0.60, 0.85))
                statement = npc_manager.generate_statement(
                    room_code, npc_id, pid_str,
                    gs.assignments, player_names, rel_range, gs.elapsed_seconds
                )
                # Send statement to player
                await send_to_player(room_code, p_id, {
                    "type": "NPC_STATEMENT", "payload": statement
                })
                # Also add to Detective's board as testimonial evidence
                detective_id = next(
                    (int(pid) for pid, role in gs.assignments.items() if role == 'DETECTIVE'), None
                )
                if detective_id and statement:
                    await send_to_player(room_code, detective_id, {
                        "type": "NPC_REPORT_RECEIVED",
                        "payload": statement
                    })

            # ── Chat ──
            elif action == "CHAT_MESSAGE":
                channel = data.get("channel", "public")
                message = data.get("message", "")[:300]
                role = gs.assignments.get(pid_str)

                # Validate villain chat access
                if channel == "villain" and role not in ("MASTERMIND", "CONSPIRATOR"):
                    continue

                # For villain chat: send only to Mastermind and Conspirator
                if channel == "villain":
                    villain_ids = [
                        int(pid) for pid, r in gs.assignments.items()
                        if r in ("MASTERMIND", "CONSPIRATOR")
                    ]
                    for vid in villain_ids:
                        await send_to_player(room_code, vid, {
                            "type": "CHAT_MESSAGE",
                            "payload": {
                                "channel": "villain",
                                "sender_id": pid_str,
                                "sender_name": player_names.get(pid_str, "Unknown"),
                                "message": message,
                                "timestamp": time.time(),
                            }
                        })
                else:
                    await broadcast_to_room(room_code, {
                        "type": "CHAT_MESSAGE",
                        "payload": {
                            "channel": channel,
                            "sender_id": pid_str,
                            "sender_name": player_names.get(pid_str, "Unknown"),
                            "message": message,
                            "timestamp": time.time(),
                        }
                    })

            # ── Meeting end ──
            elif action == "MEETING_END_ACK":
                # Host can end meeting
                if room.host_id == p_id:
                    meeting_manager.end_meeting(room_code)
                    await broadcast_to_room(room_code, {
                        "type": "MEETING_ENDED",
                        "payload": {"resumed": True}
                    })

            # ── Midpoint meeting check ──
            elif action == "TIMER_TICK":
                elapsed = gs.elapsed_seconds
                if meeting_manager.check_midpoint(room_code, elapsed):
                    mtg = meeting_manager.start_meeting(room_code, "SYSTEM")
                    if mtg:
                        await broadcast_to_room(room_code, {
                            "type": "MEETING_STARTED",
                            "payload": {**mtg.to_dict(), "triggered_by": "MIDPOINT"}
                        })

            # ── Final Accusation ──
            elif action == "SUBMIT_ACCUSATION":
                # Only Detective can accuse
                if gs.assignments.get(pid_str) != "DETECTIVE":
                    continue
                accusation = {
                    "mastermind_accusation": data.get("mastermind_accusation"),
                    "conspirator_accusation": data.get("conspirator_accusation"),
                }
                result = resolve_game(
                    room_code=room_code,
                    assignments=gs.assignments,
                    mastermind_id=gs.mastermind_id,
                    conspirator_id=gs.conspirator_id,
                    accusation=accusation,
                    player_names=player_names,
                    session_db_id=None,
                    db=None,
                )
                gs.is_active = False
                room.status = "finished"
                await broadcast_to_room(room_code, {
                    "type": "GAME_OVER",
                    "payload": result
                })

    except WebSocketDisconnect:
        player.websocket = None
        await broadcast_to_room(room_code, {
            "type": "PLAYER_DISCONNECTED",
            "payload": {"player_id": pid_str}
        })
