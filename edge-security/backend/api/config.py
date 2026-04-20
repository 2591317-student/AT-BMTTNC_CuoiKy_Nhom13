import os
from pathlib import Path
from dotenv import load_dotenv

# Load shared keys from root .env first
load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / '.env')
# Load api-specific settings (TIMESTAMP_TOLERANCE, DB_PATH)
load_dotenv()

API_KEY             = os.getenv("API_KEY",             "dev-api-key")
HMAC_SECRET         = os.getenv("HMAC_SECRET",         "dev-hmac-secret")
AES_KEY             = os.getenv("AES_KEY",             "dev-aes-key")
TIMESTAMP_TOLERANCE = int(os.getenv("TIMESTAMP_TOLERANCE", "30"))
DB_PATH             = os.getenv("DB_PATH",             "edge_data.db")
