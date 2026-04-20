import os
from dotenv import load_dotenv

load_dotenv()

API_ENDPOINT  = os.getenv("API_ENDPOINT",  "http://localhost:5000/api/data")
API_KEY       = os.getenv("API_KEY",       "dev-api-key")
HMAC_SECRET   = os.getenv("HMAC_SECRET",   "dev-hmac-secret")
DEVICE_ID     = os.getenv("DEVICE_ID",     "sensor-001")
SEND_INTERVAL = int(os.getenv("SEND_INTERVAL", "2"))
TEMP_MIN      = float(os.getenv("TEMP_MIN", "30.0"))
TEMP_MAX      = float(os.getenv("TEMP_MAX", "40.0"))
