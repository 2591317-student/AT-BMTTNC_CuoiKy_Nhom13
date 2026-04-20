"""
Edge Security API

Routes:
    POST /api/data  — receive sensor payload (authenticated + signed)
    GET  /api/data  — return last 50 records (decrypted temperature)

Run:
    pip install -r requirements.txt
    cp .env.example .env
    python app.py
"""

from flask import Flask, g, jsonify, request
from flask_cors import CORS

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
        _log(403, "HMAC mismatch — record saved as tampered", data["deviceId"])
        return jsonify({
            "error":  "Forbidden",
            "reason": "HMAC mismatch — record saved as tampered",
        }), 403

    _log(200, f"OK — temp={data['temperature']}°C saved (encrypted)", data["deviceId"])
    return jsonify({"status": "ok"}), 200


@app.get("/api/data")
def get_data():
    records = get_records(limit=50)
    result  = []
    for r in records:
        try:
            temperature = float(decrypt(r["encryptedTemp"]))
        except Exception:
            temperature = None

        result.append({
            "id":               r["id"],
            "deviceId":         r["deviceId"],
            "temperature":      temperature,
            "timestamp":        r["timestamp"],
            "isValidSignature": bool(r["isValidSignature"]),
        })

    return jsonify(result), 200


# ── Startup ───────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    init_db()
    print(f"Database : {DB_PATH}")
    print("Server   : http://localhost:5000\n")
    app.run(debug=True, host="0.0.0.0", port=5000)
