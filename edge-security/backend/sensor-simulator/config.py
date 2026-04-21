import os
from pathlib import Path
from dotenv import load_dotenv

# Load shared keys from root .env first
load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / '.env')
# Load sensor-specific settings (API_ENDPOINT, DEVICE_ID, v.v.)
load_dotenv()

API_ENDPOINT  = os.getenv("API_ENDPOINT",  "http://localhost:5000/api/data")
API_KEY       = os.getenv("API_KEY",       "dev-api-key")
HMAC_SECRET   = os.getenv("HMAC_SECRET",   "dev-hmac-secret")
DEVICE_ID     = os.getenv("DEVICE_ID",     "sensor-001")
SEND_INTERVAL = int(os.getenv("SEND_INTERVAL", "2"))
TEMP_MIN      = float(os.getenv("TEMP_MIN", "30.0"))
TEMP_MAX      = float(os.getenv("TEMP_MAX", "40.0"))

if SEND_INTERVAL <= 0:
    raise ValueError(f"SEND_INTERVAL must be > 0, got {SEND_INTERVAL}")
if TEMP_MIN >= TEMP_MAX:
    raise ValueError(f"TEMP_MIN ({TEMP_MIN}) must be < TEMP_MAX ({TEMP_MAX})")
