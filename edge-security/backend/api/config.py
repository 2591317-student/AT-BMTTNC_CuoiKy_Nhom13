import os
from dotenv import load_dotenv

load_dotenv()

API_KEY              = os.getenv("API_KEY",              "dev-api-key")
HMAC_SECRET          = os.getenv("HMAC_SECRET",          "dev-hmac-secret")
AES_KEY              = os.getenv("AES_KEY",              "dev-aes-key")
TIMESTAMP_TOLERANCE  = int(os.getenv("TIMESTAMP_TOLERANCE", "30"))
DB_PATH              = os.getenv("DB_PATH",              "edge_data.db")
