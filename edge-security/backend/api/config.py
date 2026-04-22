import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent / '.env', override=True)

API_KEY             = os.getenv("API_KEY",             "dev-api-key").strip()
HMAC_SECRET         = os.getenv("HMAC_SECRET",         "dev-hmac-secret").strip()
AES_KEY             = os.getenv("AES_KEY",             "dev-aes-key").strip()
TIMESTAMP_TOLERANCE = int(os.getenv("TIMESTAMP_TOLERANCE", "30").strip())
DB_PATH             = os.getenv("DB_PATH",             "edge_data.db").strip()
