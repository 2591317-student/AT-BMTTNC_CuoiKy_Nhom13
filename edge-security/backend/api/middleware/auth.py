"""
3-layer authentication middleware for POST /api/data.

Layer 1 — API Key       : reject unknown devices immediately (401)
Layer 2 — Replay guard  : reject reused nonces or expired timestamps (403)
Layer 3 — HMAC signature: verify payload integrity

For Layer 3, we intentionally do NOT hard-reject here.
Instead we set g.is_valid_signature so the route can:
  - save the record with isValidSignature = False
  - still return 403 to the caller
This lets tampered records appear in the UI with the "Tampered" badge
while still being visible in the audit log.
"""

import time
import uuid
from functools import wraps

from flask import g, request, jsonify

import audit
from config import API_KEY, HMAC_SECRET, TIMESTAMP_TOLERANCE
from crypto.hmac_verifier import verify
from db.database import nonce_exists


REQUIRED_FIELDS = {"deviceId", "temperature", "timestamp", "nonce"}
TEMP_MIN = -50.0
TEMP_MAX = 125.0


def _log(code: int, reason: str, device: str = "unknown", layer: str = "") -> None:
    icon = "OK " if code == 200 else "ERR"
    msg  = f"  [{icon}] [{code}] {reason} -- deviceId: {device}"
    print(msg.encode(errors="replace").decode(errors="replace"))
    audit.push(code, reason, device, layer)


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):

        # ── Layer 1: API Key ──────────────────────────────────────────────
        if request.headers.get("X-API-Key") != API_KEY:
            _log(401, "Unauthorized — Invalid API key", layer="L1")
            return jsonify({"error": "Unauthorized", "reason": "Invalid API key"}), 401

        # ── Field validation ──────────────────────────────────────────────
        data = request.get_json(silent=True)
        if not data:
            return jsonify({"error": "Unprocessable", "reason": "Body must be JSON"}), 422

        missing = REQUIRED_FIELDS - set(data.keys())
        if missing:
            return jsonify({"error": "Unprocessable", "reason": f"Missing fields: {sorted(missing)}"}), 422

        device = data.get("deviceId", "unknown")

        # ── Type & range validation ───────────────────────────────────────
        if not isinstance(data["timestamp"], int):
            return jsonify({"error": "Unprocessable", "reason": "timestamp must be an integer"}), 422

        if not isinstance(data["temperature"], (int, float)):
            return jsonify({"error": "Unprocessable", "reason": "temperature must be a number"}), 422

        if not (TEMP_MIN <= data["temperature"] <= TEMP_MAX):
            return jsonify({"error": "Unprocessable", "reason": f"temperature out of range ({TEMP_MIN}–{TEMP_MAX}°C)"}), 422

        try:
            uuid.UUID(str(data["nonce"]), version=4)
        except ValueError:
            return jsonify({"error": "Unprocessable", "reason": "nonce must be a valid UUID v4"}), 422

        # ── Layer 2a: Timestamp tolerance ─────────────────────────────────
        age = abs(int(time.time()) - data["timestamp"])
        if age > TIMESTAMP_TOLERANCE:
            _log(403, f"Timestamp expired (age={age}s)", device, layer="L2a")
            return jsonify({"error": "Forbidden", "reason": "Timestamp expired"}), 403

        # ── Layer 2b: Nonce uniqueness (replay guard) ─────────────────────
        if nonce_exists(data["nonce"]):
            audit.increment_replay()
            _log(403, "Replay detected — nonce already used", device, layer="L2b")
            return jsonify({"error": "Forbidden", "reason": "Replay detected — nonce already used"}), 403

        # ── Layer 3: HMAC signature (soft check — result passed via g) ────
        received_sig      = request.headers.get("X-Signature", "")
        g.is_valid_sig    = verify(data, received_sig, HMAC_SECRET)
        g.validated_data  = data

        return f(*args, **kwargs)

    return decorated
