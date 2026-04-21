"""
Edge Security API

Routes:
    POST /api/data   — receive sensor payload (authenticated + signed)
    GET  /api/data   — return last 50 records (decrypted temperature)
    GET  /api/audit  — return last 20 auth events (in-memory)
    GET  /api/stats  — return replay attempt count + active device count

Run:
    pip install -r requirements.txt
    cp .env.example .env
    python app.py
"""

from flask import Flask, g, jsonify
from flask_cors import CORS

import audit
from config import DB_PATH
from crypto.aes_helper import encrypt, decrypt
from db.database import init_db, save_record, get_records
from middleware.auth import require_auth, _log

app = Flask(__name__)
CORS(app)


# ── Routes ────────────────────────────────────────────────────────────────────

@app.post("/api/data")
@require_auth
def receive_data():
    data = g.validated_data

    encrypted_temp = encrypt(str(data["temperature"]))
    save_record(
        device_id     = data["deviceId"],
        encrypted_temp= encrypted_temp,
        timestamp     = int(data["timestamp"]),
        nonce         = data["nonce"],
        is_valid      = g.is_valid_sig,
    )

    if not g.is_valid_sig:
        _log(403, "HMAC mismatch — record saved as tampered", data["deviceId"], layer="L3")
        return jsonify({
            "error":  "Forbidden",
            "reason": "HMAC mismatch — record saved as tampered",
        }), 403

    _log(200, f"OK — temp={data['temperature']}°C saved (encrypted)", data["deviceId"], layer="OK")
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
    init_db()
    print(f"Database : {DB_PATH}")
    print("Server   : http://localhost:5000\n")
    app.run(debug=False, host="0.0.0.0", port=5000)
