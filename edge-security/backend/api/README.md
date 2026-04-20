# Edge Security API

Flask API nhận dữ liệu từ sensor, mã hóa AES-256-GCM và lưu SQLite.

## Yêu cầu

- Python 3.10+
- Các package trong `requirements.txt`

## Cài đặt

```bash
cd backend/api
pip install -r requirements.txt
```

## Cấu hình

File `.env` đã có sẵn key khớp với sensor. Nếu cần tạo lại:

```bash
cp .env.example .env
# Điền API_KEY, HMAC_SECRET, AES_KEY — phải giống với backend/sensor-simulator/.env
```

| Biến                | Mô tả                                      | Mặc định       |
|---------------------|--------------------------------------------|----------------|
| `API_KEY`           | Key xác thực thiết bị                      | dev-api-key    |
| `HMAC_SECRET`       | Secret để verify chữ ký HMAC-SHA256        | dev-hmac-secret|
| `AES_KEY`           | Key để mã hóa/giải mã nhiệt độ (AES-GCM)  | dev-aes-key    |
| `TIMESTAMP_TOLERANCE` | Độ trễ tối đa chấp nhận (giây)           | 30             |
| `DB_PATH`           | Đường dẫn file SQLite                      | edge_data.db   |

## Chạy server

```bash
python app.py
```

Server khởi động tại `http://localhost:5000`

## API Endpoints

### POST /api/data — Nhận dữ liệu sensor

**Headers bắt buộc:**
```
Content-Type: application/json
X-API-Key:   <API_KEY>
X-Signature: <HMAC-SHA256 của body>
```

**Body:**
```json
{
  "deviceId":    "sensor-001",
  "temperature": 35.72,
  "timestamp":   1713600000,
  "nonce":       "uuid-v4"
}
```

**Response codes:**

| Code | Lý do                                          |
|------|------------------------------------------------|
| 200  | OK — đã lưu, chữ ký hợp lệ                    |
| 401  | API key sai                                    |
| 403  | HMAC sai / nonce trùng / timestamp hết hạn     |
| 422  | Thiếu field hoặc body không phải JSON          |

> Lưu ý: khi HMAC sai (dữ liệu bị giả mạo), record **vẫn được lưu** với `isValidSignature=0`
> để hiển thị badge "Tampered" trên UI.

---

### GET /api/data — Lấy 50 record gần nhất

Trả về dữ liệu đã decrypt.

**Response:**
```json
[
  {
    "id": 1,
    "deviceId": "sensor-001",
    "temperature": 35.72,
    "timestamp": 1713600000,
    "isValidSignature": true
  }
]
```

## Cấu trúc thư mục

```
backend/api/
├── app.py              ← Entry point
├── config.py           ← Đọc biến môi trường
├── crypto/
│   ├── aes_helper.py   ← AES-256-GCM encrypt/decrypt
│   └── hmac_verifier.py← Verify chữ ký HMAC
├── db/
│   └── database.py     ← SQLite init + CRUD
└── middleware/
    └── auth.py         ← 3-layer auth decorator
```

## Chạy cùng sensor

Mở 2 terminal:

```bash
# Terminal 1 — API server
cd backend/api && python app.py

# Terminal 2 — Sensor bình thường
cd backend/sensor-simulator && python sensor.py

# Hoặc chạy demo tấn công
cd backend/sensor-simulator && python tamper_sensor.py
```
