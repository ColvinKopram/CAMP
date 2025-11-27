from flask import Flask, request
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
import pandas as pd
import random
import string
from math import radians, cos, sin, asin, sqrt
import time

app = Flask(__name__)
app.config["SECRET_KEY"] = "your-secret-key"
CORS(app, resources={r"/*": {"origins": "*"}})

# SocketIO setup
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode="threading",
    ping_timeout=60,
    ping_interval=25,
)

# Load crime data
try:
    CSV_PATH = (
        r"C:\Users\Mohammed Al-Muqsit\Desktop\Repo\ctpFinal\backend\sample_df_50k.csv"
    )
    df = pd.read_csv(CSV_PATH)
    print(f"✓ Loaded {len(df)} crime records")
except Exception as e:
    print(f"✗ ERROR loading CSV: {e}")
    df = None

# Game state
games = {}

# Config
GOOGLE_MAPS_API_KEY = None  # Replace with your key later  # Replace with your key later
MAX_ROUNDS = 3


# Utility functions
def generate_room_code():
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


def haversine_distance(lat1, lon1, lat2, lon2):
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    return 6371 * 2 * asin(sqrt(a))


def calculate_score(distance_km):
    if distance_km < 0.1:
        return 5000
    elif distance_km < 1:
        return int(5000 * (1 - distance_km))
    elif distance_km < 10:
        return int(3000 * (1 - distance_km / 10))
    elif distance_km < 50:
        return int(1000 * (1 - distance_km / 50))
    else:
        return 0


def get_random_location():
    if df is None or df.empty:
        return None

    row = df.sample(n=1).iloc[0]
    if GOOGLE_MAPS_API_KEY:
        street_view_url = f"https://maps.googleapis.com/maps/api/streetview?size=600x400&location={row['Latitude']},{row['Longitude']}&key={GOOGLE_MAPS_API_KEY}"
    else:
        street_view_url = ""  # Empty if no key
    return {
        "latitude": float(row["Latitude"]),
        "longitude": float(row["Longitude"]),
        "street_view_url": street_view_url,
    }


# Start a round
def start_round(room_code):
    if room_code not in games:
        print(f"⚠️ Cannot start round - room {room_code} does not exist")
        return

    game = games[room_code]

    if game["current_round"] >= MAX_ROUNDS:
        # End game
        final_scores = [
            {"player_name": p["name"], "score": p["score"]}
            for p in game["players"].values()
        ]
        final_scores.sort(key=lambda x: x["score"], reverse=True)

        print(
            f"🏆 Game ended in room {room_code}. Winner: {final_scores[0]['player_name']}"
        )

        socketio.emit(
            "game_end",
            {"final_scores": final_scores, "winner": final_scores[0]["player_name"]},
            room=room_code,
        )
        game["status"] = "game_end"
        return

    game["current_round"] += 1
    location = get_random_location()

    if location is None:
        print(f"✗ Failed to get location for room {room_code}")
        socketio.emit("error", {"message": "Failed to get location"}, room=room_code)
        return

    game["current_location"] = location
    game["round_start_time"] = time.time()
    game["status"] = "playing"

    # Reset guesses
    for p in game["players"].values():
        p["guess"] = None

    print(f"✓ Round {game['current_round']} started in room {room_code}")

    socketio.emit(
        "round_start",
        {
            "round": game["current_round"],
            "total_rounds": MAX_ROUNDS,
            "location": {"street_view_url": location["street_view_url"]},
            "time_limit": 30,
        },
        room=room_code,
    )


# Socket handlers
@socketio.on("connect")
def handle_connect():
    print(f"✓ Client connected: {request.sid}")
    emit("connected", {"data": "Connected"})


@socketio.on("disconnect")
def handle_disconnect():
    sid = request.sid
    print(f"✗ Client disconnected: {sid}")

    for room_code, game in list(games.items()):
        if sid in game["players"]:
            # Get list of player IDs before modifying
            player_ids = list(game["players"].keys())

            # Check if disconnecting player was the host (first player)
            is_host = player_ids[0] == sid if player_ids else False

            # Remove the disconnected player
            del game["players"][sid]

            if len(game["players"]) == 0:
                # Delete empty game
                del games[room_code]
                print(f"✗ Deleted empty room: {room_code}")
            elif is_host:
                # Host left - close the entire room
                print(f"✗ Host left room {room_code} - closing room")
                emit(
                    "room_closed",
                    {"message": "Host left the game. Room has been closed."},
                    room=room_code,
                )
                # Delete the room
                del games[room_code]
            else:
                # Non-host player left - update remaining players
                print(
                    f"✗ Player left room {room_code} - {len(game['players'])} player(s) remaining"
                )
                emit(
                    "player_left",
                    {
                        "message": "Other player left the game",
                        "players": game["players"],
                    },
                    room=room_code,
                )


@socketio.on("create_room")
def handle_create_room(data):
    if df is None:
        emit("error", {"message": "Server error: Crime data not loaded"})
        return

    room_code = generate_room_code()
    player_name = data.get("player_name", "Player 1")
    player_id = request.sid

    games[room_code] = {
        "players": {player_id: {"name": player_name, "score": 0, "guess": None}},
        "current_round": 0,
        "total_rounds": MAX_ROUNDS,
        "current_location": None,
        "status": "waiting",
    }

    join_room(room_code)
    print(f"✓ Room created: {room_code} by {player_name}")

    emit("room_created", {"room_code": room_code, "player_id": player_id})
    emit("player_joined", {"players": games[room_code]["players"]}, room=room_code)


@socketio.on("join_room")
def handle_join_room(data):
    room_code = data.get("room_code", "").upper()
    player_name = data.get("player_name", "Player 2")
    player_id = request.sid

    if room_code not in games:
        emit("error", {"message": "Room not found"})
        return

    if len(games[room_code]["players"]) >= 2:
        emit("error", {"message": "Room full"})
        return

    games[room_code]["players"][player_id] = {
        "name": player_name,
        "score": 0,
        "guess": None,
    }

    join_room(room_code)
    print(f"✓ Player joined room {room_code}: {player_name}")

    emit("room_joined", {"room_code": room_code, "player_id": player_id})
    emit("player_joined", {"players": games[room_code]["players"]}, room=room_code)

    if len(games[room_code]["players"]) == 2:
        emit("ready_to_start", {}, room=room_code)


@socketio.on("start_game")
def handle_start_game(data):
    room_code = data.get("room_code")

    if room_code not in games:
        emit("error", {"message": "Room not found"})
        return

    game = games[room_code]
    if len(game["players"]) < 2:
        emit("error", {"message": "Need 2 players to start"})
        return

    print(f"✓ Starting game in room {room_code}")
    start_round(room_code)


@socketio.on("submit_guess")
def handle_submit_guess(data):
    room_code = data.get("room_code")
    player_id = request.sid
    guess_lat = data.get("latitude")
    guess_lng = data.get("longitude")

    if room_code not in games or player_id not in games[room_code]["players"]:
        emit("error", {"message": "Invalid game or player"})
        return

    game = games[room_code]
    game["players"][player_id]["guess"] = {
        "latitude": guess_lat,
        "longitude": guess_lng,
    }

    print(
        f"✓ Guess submitted in room {room_code} by {game['players'][player_id]['name']}"
    )

    # Check if all players guessed
    if all(p["guess"] is not None for p in game["players"].values()):
        actual = game["current_location"]
        round_results = []

        for pid, player in game["players"].items():
            dist = haversine_distance(
                actual["latitude"],
                actual["longitude"],
                player["guess"]["latitude"],
                player["guess"]["longitude"],
            )
            score = calculate_score(dist)
            player["score"] += score
            round_results.append(
                {
                    "player_id": pid,
                    "player_name": player["name"],
                    "distance_km": round(dist, 2),
                    "round_score": score,
                    "total_score": player["score"],
                    "guess": player["guess"],
                }
            )

        print(f"✓ Round {game['current_round']} completed in room {room_code}")

        emit(
            "round_end",
            {
                "actual_location": actual,
                "results": round_results,
                "current_round": game["current_round"],
            },
            room=room_code,
        )

        game["status"] = "round_end"

        # Don't auto-start next round - wait for any player to click "Next Round"


@socketio.on("ready_for_next_round")
def handle_ready_for_next_round(data):
    """Handle player clicking 'Next Round' button - advances immediately"""
    room_code = data.get("room_code")
    player_id = request.sid

    if room_code not in games or player_id not in games[room_code]["players"]:
        emit("error", {"message": "Invalid game or player"})
        return

    game = games[room_code]
    player_name = game["players"][player_id]["name"]

    print(f"✓ Player {player_name} clicked next round - advancing room {room_code}")

    # Start next round immediately when any player clicks
    start_round(room_code)


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("NYC Crime GeoGuessr Server")
    print("=" * 60)
    if df is not None:
        print(f"✓ Crime data: {len(df)} records loaded")
    else:
        print("✗ Crime data: FAILED TO LOAD")
    print(f"✓ Server starting on http://localhost:8080")
    print("=" * 60 + "\n")

    socketio.run(app, host="0.0.0.0", port=8080, debug=True, allow_unsafe_werkzeug=True)
