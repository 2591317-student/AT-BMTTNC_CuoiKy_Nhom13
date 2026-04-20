import hmac
import hashlib
import json


def sign(payload: dict, secret: str) -> str:
    """Sign a payload dict with HMAC-SHA256. Returns hex digest."""
    canonical = json.dumps(payload, sort_keys=True, separators=(',', ':'))
    mac = hmac.new(secret.encode('utf-8'), canonical.encode('utf-8'), hashlib.sha256)
    return mac.hexdigest()


def verify(payload: dict, received_sig: str, secret: str) -> bool:
    """Verify HMAC signature using constant-time comparison (prevents timing attacks)."""
    expected = sign(payload, secret)
    return hmac.compare_digest(expected, received_sig)
