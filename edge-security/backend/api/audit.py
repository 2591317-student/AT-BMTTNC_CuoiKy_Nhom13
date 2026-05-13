"""
In-memory audit log for API requests.

Stores the last 20 auth events, a lifetime replay attempt counter,
and per-layer blocked-request counts (L1/L2a/L2b/L3/L4).
Reset on server restart — intentional for demo purposes.
"""

from collections import deque
from time import time

_buffer: deque = deque(maxlen=20)
_replay_count: int = 0
_layer_counts: dict[str, int] = {"L1": 0, "L2a": 0, "L2b": 0, "L3": 0, "L4": 0}


def push(code: int, reason: str, device: str = "unknown", layer: str = "") -> None:
    _buffer.appendleft({
        "time":   int(time()),
        "code":   code,
        "reason": reason,
        "device": device,
        "layer":  layer,
    })
    if layer in _layer_counts and code != 200:
        _layer_counts[layer] += 1


def increment_replay() -> None:
    global _replay_count
    _replay_count += 1


def get_log() -> list[dict]:
    return list(_buffer)


def get_replay_count() -> int:
    return _replay_count


def get_layer_counts() -> dict[str, int]:
    return dict(_layer_counts)


def reset() -> None:
    """Clear audit log and reset all counters (used by POST /api/reset)."""
    global _replay_count
    _buffer.clear()
    _replay_count = 0
    for k in _layer_counts:
        _layer_counts[k] = 0
