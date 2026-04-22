# Edge Security API

Flask API nhận dữ liệu từ sensor, mã hóa AES-256-GCM và lưu SQLite.
Hỗ trợ WebSocket (flask-socketio) để push realtime đến frontend.

## Yêu cầu

- Python 3.10+
- Các package trong `requirements.txt`

## Cài đặt

```bash
cd backend/api
pip install -r requirements.txt
```

## Cấu hình

Shared keys (`API_KEY`, `HMAC_SECRET`, `AES_KEY`) được đọc từ **root `.env`**.
File `backend/api/.env` chứa cấu hình riêng:

| Biến | Mô tả | Mặc định |
|---|---|---|
| `TIMESTAMP_TOLERANCE` | Độ trễ tối đa chấp nhận (giây) | 30 |
| `DB_PATH` | Đường dẫn file SQLite | edge_data.db |
| `USE_HTTPS` | Bật HTTPS với self-signed cert | false |

## Chạy server

```bash
python app.py
```

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

| Code | Layer | Lý do |
|---|---|---|
| 200  | OK  | Đã lưu, chữ ký hợp lệ |
| 401  | L1  | API key sai |
| 403  | L2a | Timestamp hết hạn (> 30s) |
| 403  | L2b | Nonce đã dùng (replay) |
| 403  | L3  | HMAC sai — record vẫn được lưu với `isValidSignature=0` |
| 422  | —   | Thiếu field hoặc body không phải JSON |
| 429  | L4  | Rate limit exceeded (30 req/min per IP) |

**WebSocket event emitted:** `data_update { id, isValid }` sau mỗi request thành công (kể cả tampered).

---

### GET /api/data — Lấy 50 record gần nhất

Trả về dữ liệu đã decrypt. Không yêu cầu xác thực (nhiệt độ vẫn được mã hóa trong DB).

```json
[
  {
    "id":               1,
    "deviceId":         "sensor-001",
    "temperature":      35.72,
    "encryptedTemp":    "base64AES256GCMciphertext==",
    "timestamp":        1713600000,
    "isValidSignature": true
  }
]
```

---

### GET /api/audit — Audit log

20 auth event gần nhất (in-memory, reset khi restart server).

```json
[{ "time": 1713600000, "code": 403, "reason": "...", "device": "sensor-001", "layer": "L2b" }]
```

---

### GET /api/stats — Thống kê

```json
{ "replayAttempts": 3, "activeDevices": 1 }
```

---

### POST /api/reset — Reset demo

Xóa toàn bộ DB records và audit log. Emit WebSocket `data_update { reset: true }`.

```json
{ "status": "ok", "message": "Demo reset — DB and audit log cleared" }
```

---

## Cấu trúc thư mục

```
backend/api/
├── app.py              ← Entry point + WebSocket + Rate limiting
├── audit.py            ← In-memory audit log (deque maxlen=20)
├── config.py           ← Đọc biến môi trường
├── requirements.txt
├── crypto/
│   ├── aes_helper.py   ← AES-256-GCM encrypt/decrypt
│   └── hmac_verifier.py← Verify chữ ký HMAC-SHA256
├── db/
│   └── database.py     ← SQLite init + CRUD
└── middleware/
    └── auth.py         ← 4-layer auth middleware (L1→L3 + rate limit L4)
```

## Unit Tests

```bash
cd backend
python -m pytest tests/ -v
# 37 tests: test_crypto, test_audit, test_database, test_middleware
```
