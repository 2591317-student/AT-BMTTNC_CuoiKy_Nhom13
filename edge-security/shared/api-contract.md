# API Contract — Sensor → Edge API

## POST /api/data

Nhận dữ liệu từ sensor. Yêu cầu xác thực đầy đủ qua 4 lớp bảo vệ.

### Headers

| Header | Bắt buộc | Mô tả |
|---|---|---|
| Content-Type | ✅ | `application/json` |
| X-API-Key | ✅ | API key của thiết bị |
| X-Signature | ✅ | HMAC-SHA256 của body (hex) |

### Request Body

```json
{
  "deviceId":    "sensor-001",
  "nonce":       "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "temperature": 35.72,
  "timestamp":   1713600000
}
```

| Field | Kiểu | Ràng buộc |
|---|---|---|
| deviceId | string | required |
| temperature | float | required, -50.0 đến 125.0 |
| timestamp | integer | required, Unix seconds |
| nonce | string | required, UUID v4, dùng một lần |

### Cách tính X-Signature

```python
import hmac, hashlib, json

canonical = json.dumps(payload, sort_keys=True, separators=(',', ':'))
signature = hmac.new(HMAC_SECRET.encode(), canonical.encode(), hashlib.sha256).hexdigest()
```

> **Quan trọng:** `sort_keys=True` — các field phải được sắp xếp cố định trước khi hash.

### Response Codes

| Code | Layer | Ý nghĩa |
|---|---|---|
| 200 | OK | Dữ liệu hợp lệ, đã lưu vào DB |
| 401 | L1 | Unauthorized — API key sai |
| 403 | L2a | Timestamp expired (> 30s) |
| 403 | L2b | Replay detected — nonce đã dùng |
| 403 | L3 | HMAC mismatch — record vẫn lưu với `isValidSignature=0` |
| 422 | — | Unprocessable — thiếu field / type sai / UUID không hợp lệ |
| 429 | L4 | Rate limit exceeded — 30 requests/minute per IP |

### WebSocket Event

Mỗi POST /api/data thành công (kể cả tampered) phát sự kiện:
```json
{ "id": 42, "isValid": true }
```

---

## GET /api/data

Lấy danh sách 50 record gần nhất, đã decrypt.

> **Không yêu cầu xác thực** — thiết kế có chủ ý cho demo UI.

### Response Body

```json
[
  {
    "id":               1,
    "deviceId":         "sensor-001",
    "temperature":      35.72,
    "encryptedTemp":    "base64encodedAES256GCMciphertext==",
    "timestamp":        1713600000,
    "isValidSignature": true
  }
]
```

---

## GET /api/audit

Trả về 20 auth event gần nhất (in-memory, reset khi restart server).

> **Không yêu cầu xác thực** — dùng cho demo UI audit log.

### Response Body

```json
[
  {
    "time":   1713600000,
    "code":   403,
    "reason": "Replay detected — nonce already used",
    "device": "sensor-001",
    "layer":  "L2b"
  }
]
```

| Field | Mô tả |
|---|---|
| time | Unix timestamp của request |
| code | HTTP status code (200, 401, 403, 429) |
| reason | Mô tả kết quả auth |
| device | deviceId từ payload (hoặc "unknown" nếu L1 fail) |
| layer | `L1` / `L2a` / `L2b` / `L3` / `L4` / `OK` |

---

## GET /api/stats

Trả về thống kê tổng hợp.

### Response Body

```json
{
  "replayAttempts": 3,
  "activeDevices":  1
}
```

---

## POST /api/reset

Xóa toàn bộ DB records và audit log. Dùng cho demo.

### Response Body

```json
{ "status": "ok", "message": "Demo reset — DB and audit log cleared" }
```

Phát WebSocket event: `{ "reset": true }`

---

## WebSocket Events (socket.io)

Kết nối tại `ws://localhost:5000/socket.io/`

| Event | Hướng | Payload | Khi nào |
|---|---|---|---|
| `data_update` | Server → Client | `{ id, isValid }` | Sau mỗi POST /api/data |
| `data_update` | Server → Client | `{ reset: true }` | Sau POST /api/reset |

---

## Timestamp Tolerance

Server chấp nhận request nếu: `|now - timestamp| <= 30 giây`

Request cũ hơn 30 giây bị reject với `403 Timestamp expired`.
