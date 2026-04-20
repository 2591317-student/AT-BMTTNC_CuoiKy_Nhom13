"""
Tamper sensor demo — demonstrates 3 attack scenarios:

  Scene 1 — Normal     : valid payload + correct signature  → 200 OK
  Scene 2 — Tampered   : payload modified after signing     → 403 (HMAC mismatch)
  Scene 3 — Replay     : original valid packet resent       → 403 (nonce reused)

Usage:
    python tamper_sensor.py
"""

import time
import uuid
import random
import requests

from config import API_ENDPOINT, API_KEY, HMAC_SECRET, DEVICE_ID, TEMP_MIN, TEMP_MAX
from hmac_signer import sign

SEPARATOR = "-" * 60


def build_payload() -> dict:
    return {
        "deviceId":    DEVICE_ID,
        "temperature": round(random.uniform(TEMP_MIN, TEMP_MAX), 2),
        "timestamp":   int(time.time()),
        "nonce":       str(uuid.uuid4()),
    }


def send_payload(payload: dict, signature: str, label: str) -> None:
    headers = {
        "Content-Type": "application/json",
        "X-API-Key":    API_KEY,
        "X-Signature":  signature,
    }
    try:
        res = requests.post(API_ENDPOINT, json=payload, headers=headers, timeout=5)
        status = "✅ 200 OK" if res.status_code == 200 else f"❌ {res.status_code} — {res.text}"
        print(f"  [{label}]  temp={payload['temperature']}°C  "
              f"sig={signature[:16]}...  "
              f"{status}")
    except requests.exceptions.ConnectionError:
        print(f"  [ERROR] Cannot connect to {API_ENDPOINT} — is the server running?")


def scene_normal(payload: dict, signature: str) -> None:
    print(SEPARATOR)
    print("Scene 1 — Normal payload (valid signature)")
    print(f"  Payload  : {payload}")
    print(f"  Signature: {signature}")
    send_payload(payload, signature, "NORMAL")


def scene_tampered(original_payload: dict, original_signature: str) -> None:
    print(SEPARATOR)
    print("Scene 2 — Tampered payload (temperature injected, signature NOT updated)")

    tampered = original_payload.copy()
    tampered["nonce"] = str(uuid.uuid4())   # fresh nonce to bypass replay check
    tampered["temperature"] = 99.9          # attacker injects fake temperature

    print(f"  Original temp : {original_payload['temperature']}°C")
    print(f"  Tampered temp : {tampered['temperature']}°C  ← injected by attacker")
    print(f"  Signature used: {original_signature[:16]}... (unchanged)")
    print("  Expected result: 403 — HMAC mismatch\n")

    # Signature was computed over original payload → will not match tampered payload
    send_payload(tampered, original_signature, "TAMPERED")


def scene_replay(original_payload: dict, original_signature: str) -> None:
    print(SEPARATOR)
    print("Scene 3 — Replay attack (resend the original valid packet)")
    print(f"  Nonce : {original_payload['nonce']} (already used in Scene 1)")
    print("  Expected result: 403 — Nonce already used\n")

    send_payload(original_payload, original_signature, "REPLAY")


def main():
    print("=== Tamper Sensor Demo ===")
    print(f"Target: {API_ENDPOINT}\n")

    # Build one valid payload and signature, reused across scenes
    payload   = build_payload()
    signature = sign(payload, HMAC_SECRET)

    scene_normal(payload, signature)
    time.sleep(1)

    scene_tampered(payload, signature)
    time.sleep(1)

    scene_replay(payload, signature)

    print(SEPARATOR)
    print("Demo complete.")


if __name__ == "__main__":
    main()
