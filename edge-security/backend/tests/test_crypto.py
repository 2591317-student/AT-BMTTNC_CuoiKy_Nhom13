"""Tests for AES-256-GCM encrypt/decrypt and HMAC-SHA256 verification."""
import pytest
from crypto.aes_helper import encrypt, decrypt
from crypto.hmac_verifier import verify


# ── AES-256-GCM ──────────────────────────────────────────────────────────────

class TestAes:
    def test_roundtrip_basic(self):
        assert decrypt(encrypt("25.5")) == "25.5"

    def test_roundtrip_float_string(self):
        assert decrypt(encrypt("99.9")) == "99.9"

    def test_roundtrip_negative(self):
        assert decrypt(encrypt("-10.0")) == "-10.0"

    def test_each_encrypt_produces_different_ciphertext(self):
        # Random nonce means same plaintext → different ciphertexts
        a, b = encrypt("25.5"), encrypt("25.5")
        assert a != b

    def test_ciphertext_is_base64(self):
        import base64
        ct = encrypt("25.5")
        decoded = base64.b64decode(ct.encode())
        # nonce(12) + min 1 byte ciphertext + tag(16)
        assert len(decoded) >= 29

    def test_tampered_ciphertext_raises(self):
        import base64
        ct = encrypt("25.5")
        raw = bytearray(base64.b64decode(ct))
        raw[15] ^= 0xFF   # flip a byte in the ciphertext area
        bad = base64.b64encode(bytes(raw)).decode()
        with pytest.raises(Exception):
            decrypt(bad)

    def test_empty_string_roundtrip(self):
        assert decrypt(encrypt("")) == ""


# ── HMAC-SHA256 ───────────────────────────────────────────────────────────────

PAYLOAD = {
    "deviceId":    "sensor-001",
    "temperature": 25.5,
    "timestamp":   1700000000,
    "nonce":       "550e8400-e29b-41d4-a716-446655440000",
}
SECRET = "test-secret-key"


class TestHmac:
    def _sign(self, payload, secret=SECRET):
        import hmac, hashlib, json
        canonical = json.dumps(payload, sort_keys=True, separators=(',', ':'))
        return hmac.new(secret.encode(), canonical.encode(), hashlib.sha256).hexdigest()

    def test_valid_signature(self):
        sig = self._sign(PAYLOAD)
        assert verify(PAYLOAD, sig, SECRET) is True

    def test_wrong_secret(self):
        sig = self._sign(PAYLOAD, "wrong-secret")
        assert verify(PAYLOAD, sig, SECRET) is False

    def test_tampered_temperature(self):
        sig  = self._sign(PAYLOAD)
        tampered = {**PAYLOAD, "temperature": 99.9}
        assert verify(tampered, sig, SECRET) is False

    def test_tampered_device_id(self):
        sig  = self._sign(PAYLOAD)
        tampered = {**PAYLOAD, "deviceId": "evil-device"}
        assert verify(tampered, sig, SECRET) is False

    def test_empty_signature(self):
        assert verify(PAYLOAD, "", SECRET) is False

    def test_garbage_signature(self):
        assert verify(PAYLOAD, "not-a-hex-string", SECRET) is False

    def test_signature_is_deterministic(self):
        sig1 = self._sign(PAYLOAD)
        sig2 = self._sign(PAYLOAD)
        assert sig1 == sig2
