"""
Edge Security API

Routes:
    POST /api/data   — receive sensor payload (authenticated + signed)
    GET  /api/data   — return last 50 records (decrypted temperature)
    GET  /api/audit  — return last 20 auth events (in-memory)
    GET  /api/stats  — return replay attempt count + active device count
    POST /api/reset  — clear DB and audit log (demo helper)

WebSocket events emitted:
    data_update — fired after every POST /api/data (valid or tampered)
                  payload: { id, isValid }

Run:
    pip install -r requirements.txt
    python app.py
"""

import os
from flask import Flask, g, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_socketio import SocketIO

import audit
from config import DB_PATH
from crypto.aes_helper import encrypt, decrypt
from db.database import init_db, save_record, get_records, clear_records
from middleware.auth import require_auth, _log

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading", logger=False, engineio_logger=False)

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=[],           # no global limit — apply per-route only
    storage_uri="memory://",
)


@app.errorhandler(429)
def ratelimit_handler(e):
    device = request.get_json(silent=True) or {}
    dev_id = device.get("deviceId", request.headers.get("X-API-Key", "unknown")[:20])
    _log(429, f"Rate limit exceeded — {e.description}", dev_id, layer="L4")
    return jsonify({"error": "Too Many Requests", "reason": f"Rate limit exceeded — {e.description}"}), 429


# ── Routes ────────────────────────────────────────────────────────────────────

@app.post("/api/data")
@limiter.limit("30 per minute")   # L4 — rate limit: max 30 requests/min per IP
@require_auth
def receive_data():
    data = g.validated_data

    encrypted_temp = encrypt(str(data["temperature"]))
    record_id = save_record(
        device_id     = data["deviceId"],
        encrypted_temp= encrypted_temp,
        timestamp     = int(data["timestamp"]),
        nonce         = data["nonce"],
        is_valid      = g.is_valid_sig,
    )

    # Push real-time notification to all connected browsers
    socketio.emit("data_update", {"id": record_id, "isValid": g.is_valid_sig})

    if not g.is_valid_sig:
        _log(403, "HMAC mismatch — record saved as tampered", data["deviceId"], layer="L3")
        return jsonify({
            "error":  "Forbidden",
            "reason": "HMAC mismatch — record saved as tampered",
        }), 403

    _log(200, f"OK — temp={data['temperature']}C saved (encrypted)", data["deviceId"], layer="OK")
    return jsonify({"status": "ok", "message": "Record saved"}), 200


@app.get("/api/data")
# Intentionally unauthenticated — data is AES-encrypted in DB, safe to expose ciphertext for demo UI.
def get_data():
    records = get_records(limit=50)
    result  = []
    for r in records:
        try:
            temperature = float(decrypt(r["encryptedTemp"]))
        except Exception as e:
            _log(500, f"Decryption failed for record {r['id']}: {e}", r["deviceId"])
            temperature = None

        result.append({
            "id":               r["id"],
            "deviceId":         r["deviceId"],
            "temperature":      temperature,
            "encryptedTemp":    r["encryptedTemp"],
            "timestamp":        r["timestamp"],
            "isValidSignature": bool(r["isValidSignature"]),
        })

    return jsonify(result), 200


@app.get("/api/audit")
def get_audit():
    return jsonify(audit.get_log()), 200


@app.post("/api/reset")
def reset_demo():
    """Clear DB records and audit log — demo helper, not a real production endpoint."""
    clear_records()
    audit.reset()
    socketio.emit("data_update", {"reset": True})
    print("[RESET] Demo data cleared")
    return jsonify({"status": "ok", "message": "Demo reset — DB and audit log cleared"}), 200


@app.get("/api/stats")
def get_stats():
    records = get_records(limit=1000)
    devices = len(set(r["deviceId"] for r in records))
    return jsonify({
        "replayAttempts": audit.get_replay_count(),
        "activeDevices":  devices,
    }), 200


# ── Startup ───────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    USE_HTTPS = os.getenv("USE_HTTPS", "false").lower() == "true"
    ssl_ctx   = "adhoc" if USE_HTTPS else None

    init_db()
    print(f"Database : {DB_PATH}")
    scheme = "https" if USE_HTTPS else "http"
    print(f"Server   : {scheme}://localhost:5000\n")
    socketio.run(app, debug=False, host="0.0.0.0", port=5000, ssl_context=ssl_ctx)
