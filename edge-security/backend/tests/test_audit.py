"""Tests for the in-memory audit log module."""
import audit


def setup_function():
    audit.reset()


class TestAuditLog:
    def test_push_adds_entry(self):
        audit.push(200, "OK", "sensor-001", "OK")
        log = audit.get_log()
        assert len(log) == 1
        assert log[0]["code"] == 200
        assert log[0]["reason"] == "OK"
        assert log[0]["device"] == "sensor-001"
        assert log[0]["layer"] == "OK"

    def test_push_newest_first(self):
        audit.push(200, "first", "d1")
        audit.push(401, "second", "d2")
        log = audit.get_log()
        assert log[0]["code"] == 401   # newest at index 0
        assert log[1]["code"] == 200

    def test_max_20_entries(self):
        for i in range(25):
            audit.push(200, f"entry {i}", "d")
        assert len(audit.get_log()) == 20

    def test_reset_clears_log(self):
        audit.push(200, "entry", "d")
        audit.reset()
        assert audit.get_log() == []

    def test_reset_clears_replay_count(self):
        audit.increment_replay()
        audit.increment_replay()
        audit.reset()
        assert audit.get_replay_count() == 0

    def test_replay_counter_increments(self):
        audit.increment_replay()
        audit.increment_replay()
        assert audit.get_replay_count() == 2

    def test_entry_has_time_field(self):
        import time
        before = int(time.time())
        audit.push(200, "ok", "d")
        after = int(time.time())
        t = audit.get_log()[0]["time"]
        assert before <= t <= after
