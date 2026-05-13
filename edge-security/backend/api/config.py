import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent / '.env', override=True)

AES_KEY             = os.getenv("AES_KEY",             "dev-aes-key").strip()
TIMESTAMP_TOLERANCE = int(os.getenv("TIMESTAMP_TOLERANCE", "30").strip())
DB_PATH             = os.getenv("DB_PATH",             "edge_data.db").strip()

# Device registry: api_key → hmac_secret
# Each device has its own key pair — auth middleware looks up by API key
DEVICE_REGISTRY: dict[str, str] = {
    os.getenv("API_KEY_001", "").strip(): os.getenv("HMAC_SECRET_001", "").strip(),
    os.getenv("API_KEY_002", "").strip(): os.getenv("HMAC_SECRET_002", "").strip(),
    os.getenv("API_KEY_003", "").strip(): os.getenv("HMAC_SECRET_003", "").strip(),
}

# Remove any blank keys (safety guard if env vars are missing)
DEVICE_REGISTRY = {k: v for k, v in DEVICE_REGISTRY.items() if k and v}
