"""
Normal sensor simulator.
Sends a signed temperature payload every SEND_INTERVAL seconds.

Usage:
    pip install -r requirements.txt
    cp .env.example .env   # fill in API_KEY and HMAC_SECRET
    python sensor.py
"""

import time
import uuid
import random
import requests

from config import (
    API_ENDPOINT, API_KEY, HMAC_SECRET,
    DEVICE_ID, SEND_INTERVAL, TEMP_MIN, TEMP_MAX,
)
from hmac_signer import sign


def build_payload() -> dict:
    return {
        "deviceId":    DEVICE_ID,
        "temperature": round(random.uniform(TEMP_MIN, TEMP_MAX), 2),
        "timestamp":   int(time.time()),
        "nonce":       str(uuid.uuid4()),
    }


def send_payload(payload: dict, signature: str) -> None:
    headers = {
        "Content-Type": "application/json",
        "X-API-Key":    API_KEY,
        "X-Signature":  signature,
    }
    try:
        res = requests.post(API_ENDPOINT, json=payload, headers=headers, timeout=5)
        status = "✅ 200 OK" if res.status_code == 200 else f"❌ {res.status_code} {res.text}"
        print(f"[NORMAL]  device={payload['deviceId']}  "
              f"temp={payload['temperature']}°C  "
              f"nonce={payload['nonce'][:8]}...  "
              f"{status}")
    except requests.exceptions.ConnectionError:
        print(f"[ERROR] Cannot connect to {API_ENDPOINT} — is the server running?")
    except requests.exceptions.Timeout:
        print(f"[ERROR] Request timed out after 5s — server may be overloaded")
    except requests.exceptions.RequestException as e:
        print(f"[ERROR] Request failed: {e}")


def main():
    print(f"Sensor '{DEVICE_ID}' started.")
    print(f"Sending to {API_ENDPOINT} every {SEND_INTERVAL}s\n")
    try:
        while True:
            payload = build_payload()
            signature = sign(payload, HMAC_SECRET)
            send_payload(payload, signature)
            time.sleep(SEND_INTERVAL)
    except KeyboardInterrupt:
        print("\nSensor stopped.")


if __name__ == "__main__":
    main()
