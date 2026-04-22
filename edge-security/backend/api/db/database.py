"""
SQLite helper — init, CRUD, and nonce lookup.

Schema:
    sensor_data(id, deviceId, encryptedTemp, timestamp, nonce UNIQUE, isValidSignature)

Records are always inserted — even tampered ones (isValidSignature=0) — so the
UI can display audit history and the demo can show the "Tampered" badge.
"""

import sqlite3
from contextlib import contextmanager

from config import DB_PATH


def init_db() -> None:
    with _connect() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sensor_data (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                deviceId         TEXT    NOT NULL,
                encryptedTemp    TEXT    NOT NULL,
                timestamp        INTEGER NOT NULL,
                nonce            TEXT    NOT NULL UNIQUE,
                isValidSignature INTEGER NOT NULL DEFAULT 1
            )
        """)


@contextmanager
def _connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def nonce_exists(nonce: str) -> bool:
    with _connect() as conn:
        row = conn.execute(
            "SELECT 1 FROM sensor_data WHERE nonce = ?", (nonce,)
        ).fetchone()
        return row is not None


def save_record(
    device_id:    str,
    encrypted_temp: str,
    timestamp:    int,
    nonce:        str,
    is_valid:     bool,
) -> int:
    with _connect() as conn:
        cursor = conn.execute(
            """INSERT INTO sensor_data
               (deviceId, encryptedTemp, timestamp, nonce, isValidSignature)
               VALUES (?, ?, ?, ?, ?)""",
            (device_id, encrypted_temp, timestamp, nonce, 1 if is_valid else 0),
        )
        return cursor.lastrowid


def clear_records() -> None:
    with _connect() as conn:
        conn.execute("DELETE FROM sensor_data")


def get_records(limit: int = 50) -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM sensor_data ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(row) for row in rows]
