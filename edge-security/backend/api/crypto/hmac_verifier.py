"""
HMAC-SHA256 signature verification (server side).

Uses hmac.compare_digest() for constant-time comparison to prevent
timing side-channel attacks.
"""

import hmac
import hashlib
import json


def verify(payload: dict, received_sig: str, secret: str) -> bool:
    """Return True if received_sig matches the HMAC of payload."""
    canonical = json.dumps(payload, sort_keys=True, separators=(',', ':'))
    expected  = hmac.new(secret.encode('utf-8'), canonical.encode('utf-8'), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, received_sig)
