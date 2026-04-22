"""Integration tests for the auth middleware via Flask test client."""
import json
import hmac
import hashlib
import uuid
import time
import pytest


def _sign(payload: dict, secret: str) -> str:
    canonical = json.dumps(payload, sort_keys=True, separators=(',', ':'))
    return hmac.new(secret.encode(), canonical.encode(), hashlib.sha256).hexdigest()


def _payload(overrides=None):
    p = {
        "deviceId":    "sensor-001",
        "temperature": 25.5,
        "timestamp":   int(time.time()),
        "nonce":       str(uuid.uuid4()),
    }
    if overrides:
        p.update(overrides)
    return p


@pytest.fixture
def client(monkeypatch, tmp_path):
    # Patch DB path before importing app
    import config
    monkeypatch.setattr(config, "DB_PATH", str(tmp_path / "test.db"))

    import importlib
    import db.database as db_mod
    importlib.reload(db_mod)

    import app as app_mod
    importlib.reload(app_mod)
    db_mod.init_db()

    app_mod.app.config["TESTING"] = True
    with app_mod.app.test_client() as c:
        yield c


def _post(client, payload, sig, api_key=None):
    from config import API_KEY, HMAC_SECRET
    return client.post(
        "/api/data",
        json=payload,
        headers={
            "X-API-Key":   api_key or API_KEY,
            "X-Signature": sig,
        },
    )


class TestMiddleware:
    def test_valid_request_returns_200(self, client):
        from config import HMAC_SECRET
        p   = _payload()
        res = _post(client, p, _sign(p, HMAC_SECRET))
        assert res.status_code == 200

    def test_wrong_api_key_returns_401(self, client):
        from config import HMAC_SECRET
        p   = _payload()
        res = _post(client, p, _sign(p, HMAC_SECRET), api_key="wrong-key")
        assert res.status_code == 401

    def test_expired_timestamp_returns_403(self, client):
        from config import HMAC_SECRET
        p = _payload({"timestamp": int(time.time()) - 35})
        res = _post(client, p, _sign(p, HMAC_SECRET))
        assert res.status_code == 403
        assert "Timestamp" in res.get_json()["reason"]

    def test_replay_returns_403(self, client):
        from config import HMAC_SECRET
        p   = _payload()
        sig = _sign(p, HMAC_SECRET)
        _post(client, p, sig)           # first request OK
        res = _post(client, p, sig)     # replay
        assert res.status_code == 403
        assert "Replay" in res.get_json()["reason"]

    def test_tampered_payload_returns_403(self, client):
        from config import HMAC_SECRET
        p   = _payload()
        sig = _sign(p, HMAC_SECRET)
        tampered = {**p, "temperature": 99.9}
        res = _post(client, tampered, sig)
        assert res.status_code == 403
        assert "HMAC" in res.get_json()["reason"]

    def test_missing_fields_returns_422(self, client):
        from config import API_KEY
        res = client.post(
            "/api/data",
            json={"deviceId": "sensor-001"},
            headers={"X-API-Key": API_KEY, "X-Signature": "x"},
        )
        assert res.status_code == 422

    def test_invalid_nonce_uuid_returns_422(self, client):
        from config import HMAC_SECRET
        p   = _payload({"nonce": "not-a-uuid"})
        res = _post(client, p, _sign(p, HMAC_SECRET))
        assert res.status_code == 422

    def test_temperature_out_of_range_returns_422(self, client):
        from config import HMAC_SECRET
        p   = _payload({"temperature": 200.0})
        res = _post(client, p, _sign(p, HMAC_SECRET))
        assert res.status_code == 422
