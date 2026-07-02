import random
import string
from typing import Dict, List, Any, Optional
from fastapi import WebSocket

class PlayerLobbyState:
    def __init__(self, player_id: int, username: str):
        self.player_id = player_id
        self.username = username
        self.is_ready = False
        self.role: Optional[str] = None
        self.websocket: Optional[WebSocket] = None

    def to_dict(self) -> dict:
        return {
            "player_id": self.player_id,
            "username": self.username,
            "is_ready": self.is_ready,
            "role": self.role
        }

class RoomLobbyState:
    def __init__(self, room_code: str, host_id: int, difficulty: str = "medium", max_players: int = 6):
        self.room_code = room_code
        self.host_id = host_id
        self.difficulty = difficulty
        self.max_players = max_players
        self.status = "waiting" # waiting, playing, finished
        self.players: Dict[int, PlayerLobbyState] = {}

    def to_dict(self) -> dict:
        return {
            "room_code": self.room_code,
            "status": self.status,
            "difficulty": self.difficulty,
            "host_id": self.host_id,
            "max_players": self.max_players,
            "players": [p.to_dict() for p in self.players.values()]
        }

class LobbyManager:
    def __init__(self):
        self.rooms: Dict[str, RoomLobbyState] = {}

    def generate_room_code(self) -> str:
        while True:
            code = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
            if code not in self.rooms:
                return code

    def create_room(self, host_id: int, host_username: str, difficulty: str = "medium", max_players: int = 6) -> RoomLobbyState:
        room_code = self.generate_room_code()
        room = RoomLobbyState(room_code, host_id, difficulty, max_players)
        
        # Add host as first player
        host_player = PlayerLobbyState(host_id, host_username)
        room.players[host_id] = host_player
        
        self.rooms[room_code] = room
        return room

    def get_room(self, room_code: str) -> Optional[RoomLobbyState]:
        return self.rooms.get(room_code.upper())

    def join_room(self, room_code: str, player_id: int, username: str) -> Optional[RoomLobbyState]:
        room = self.get_room(room_code)
        if not room:
            return None
        if len(room.players) >= room.max_players:
            return None
        if room.status != "waiting":
            return None
            
        if player_id not in room.players:
            room.players[player_id] = PlayerLobbyState(player_id, username)
        return room

    def leave_room(self, room_code: str, player_id: int) -> Optional[RoomLobbyState]:
        room = self.get_room(room_code)
        if not room:
            return None
            
        if player_id in room.players:
            del room.players[player_id]
            
        # If room is empty, delete it
        if not room.players:
            if room_code in self.rooms:
                del self.rooms[room_code]
            return None
            
        # If host leaves, assign a new host
        if room.host_id == player_id and room.players:
            room.host_id = next(iter(room.players.keys()))
            
        return room

    def toggle_ready(self, room_code: str, player_id: int) -> Optional[RoomLobbyState]:
        room = self.get_room(room_code)
        if not room or player_id not in room.players:
            return None
        room.players[player_id].is_ready = not room.players[player_id].is_ready
        return room

    async def broadcast_state(self, room_code: str):
        room = self.get_room(room_code)
        if not room:
            return
        payload = {
            "type": "LOBBY_STATE_UPDATE",
            "payload": room.to_dict()
        }
        for player in room.players.values():
            if player.websocket:
                try:
                    await player.websocket.send_json(payload)
                except Exception:
                    # Connection might be dead, handled by WS listener
                    pass

lobby_manager = LobbyManager()
