"""
In-memory audit log for API requests.

Stores the last 20 auth events and a lifetime replay attempt counter.
Reset on server restart — intentional for demo purposes.
"""

from collections import deque
from time import time

_buffer: deque = deque(maxlen=20)
_replay_count: int = 0


def push(code: int, reason: str, device: str = "unknown", layer: str = "") -> None:
    _buffer.appendleft({
        "time":   int(time()),
        "code":   code,
        "reason": reason,
        "device": device,
        "layer":  layer,
    })


def increment_replay() -> None:
    global _replay_count
    _replay_count += 1


def get_log() -> list[dict]:
    return list(_buffer)


def get_replay_count() -> int:
    return _replay_count
