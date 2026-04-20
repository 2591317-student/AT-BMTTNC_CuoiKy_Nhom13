"""
AES-256-GCM encryption / decryption.

Storage format (base64-encoded):
    [ nonce (12 bytes) | ciphertext (n bytes) | tag (16 bytes) ]

GCM provides both confidentiality and integrity in one pass (AEAD),
so no separate MAC is needed for the stored ciphertext.
"""

import os
import base64
import hashlib
from Crypto.Cipher import AES

from config import AES_KEY


def _derive_key() -> bytes:
    # SHA-256 digest of the raw key string → always exactly 32 bytes (AES-256)
    return hashlib.sha256(AES_KEY.encode('utf-8')).digest()


def encrypt(plaintext: str) -> str:
    """Encrypt a plaintext string. Returns a base64 string safe for DB storage."""
    key    = _derive_key()
    nonce  = os.urandom(12)                        # 96-bit random nonce
    cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
    ciphertext, tag = cipher.encrypt_and_digest(plaintext.encode('utf-8'))
    return base64.b64encode(nonce + ciphertext + tag).decode('utf-8')


def decrypt(encrypted_b64: str) -> str:
    """Decrypt a base64 string produced by encrypt(). Raises ValueError on tampered data."""
    key     = _derive_key()
    raw     = base64.b64decode(encrypted_b64.encode('utf-8'))
    nonce   = raw[:12]
    tag     = raw[-16:]
    ciphertext = raw[12:-16]
    cipher  = AES.new(key, AES.MODE_GCM, nonce=nonce)
    return cipher.decrypt_and_verify(ciphertext, tag).decode('utf-8')
