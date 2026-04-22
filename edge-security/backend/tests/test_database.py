"""Tests for SQLite database helpers."""
import os
import pytest
import tempfile


# Patch DB_PATH before importing db.database
@pytest.fixture(autouse=True)
def tmp_db(monkeypatch, tmp_path):
    db_file = str(tmp_path / "test.db")
    import config
    monkeypatch.setattr(config, "DB_PATH", db_file)
    # Re-import db module to pick up patched path
    import importlib
    import db.database as db_mod
    importlib.reload(db_mod)
    db_mod.init_db()
    yield db_mod


class TestDatabase:
    def test_save_and_get_record(self, tmp_db):
        rid = tmp_db.save_record("sensor-001", "enc_data", 1700000000, "nonce-001", True)
        assert isinstance(rid, int)
        records = tmp_db.get_records()
        assert len(records) == 1
        r = records[0]
        assert r["deviceId"]         == "sensor-001"
        assert r["encryptedTemp"]    == "enc_data"
        assert r["timestamp"]        == 1700000000
        assert r["nonce"]            == "nonce-001"
        assert r["isValidSignature"] == 1

    def test_save_tampered_record(self, tmp_db):
        tmp_db.save_record("sensor-001", "enc", 1700000001, "nonce-002", False)
        r = tmp_db.get_records()[0]
        assert r["isValidSignature"] == 0

    def test_nonce_exists_true(self, tmp_db):
        tmp_db.save_record("d", "enc", 1700000002, "unique-nonce", True)
        assert tmp_db.nonce_exists("unique-nonce") is True

    def test_nonce_exists_false(self, tmp_db):
        assert tmp_db.nonce_exists("never-seen") is False

    def test_get_records_limit(self, tmp_db):
        for i in range(10):
            tmp_db.save_record("d", "enc", 1700000000 + i, f"nonce-{i}", True)
        records = tmp_db.get_records(limit=5)
        assert len(records) == 5

    def test_get_records_newest_first(self, tmp_db):
        tmp_db.save_record("d", "enc", 1700000001, "n1", True)
        tmp_db.save_record("d", "enc", 1700000002, "n2", True)
        records = tmp_db.get_records()
        assert records[0]["nonce"] == "n2"   # highest id first

    def test_clear_records(self, tmp_db):
        tmp_db.save_record("d", "enc", 1700000001, "n1", True)
        tmp_db.clear_records()
        assert tmp_db.get_records() == []

    def test_duplicate_nonce_raises(self, tmp_db):
        tmp_db.save_record("d", "enc", 1700000001, "dup-nonce", True)
        with pytest.raises(Exception):
            tmp_db.save_record("d", "enc", 1700000002, "dup-nonce", True)
