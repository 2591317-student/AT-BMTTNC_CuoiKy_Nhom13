# API Contract — Sensor → Edge API

## POST /api/data

Nhận dữ liệu từ sensor. Yêu cầu xác thực đầy đủ.

### Headers

| Header        | Bắt buộc | Mô tả                          |
|---------------|----------|--------------------------------|
| Content-Type  | ✅        | `application/json`             |
| X-API-Key     | ✅        | API key của thiết bị           |
| X-Signature   | ✅        | HMAC-SHA256 của body (hex)     |

### Request Body

```json
{
  "deviceId":    "sensor-001",
  "nonce":       "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "temperature": 35.72,
  "timestamp":   1713600000
}
```

| Field       | Kiểu    | Mô tả                                        |
|-------------|---------|----------------------------------------------|
| deviceId    | string  | ID của thiết bị                              |
| temperature | float   | Nhiệt độ (°C), 2 chữ số thập phân           |
| timestamp   | integer | Unix timestamp (giây) tại thời điểm gửi      |
| nonce       | string  | UUID v4, mỗi request một giá trị khác nhau  |

### Cách tính X-Signature

```python
import hmac, hashlib, json

canonical = json.dumps(payload, sort_keys=True, separators=(',', ':'))
signature = hmac.new(HMAC_SECRET.encode(), canonical.encode(), hashlib.sha256).hexdigest()
```

> **Quan trọng:** `sort_keys=True` — các field phải được sắp xếp cố định trước khi hash.

### Response Codes

| Code | Ý nghĩa                                |
|------|----------------------------------------|
| 200  | OK — dữ liệu hợp lệ, đã lưu vào DB   |
| 401  | Unauthorized — API key sai            |
| 403  | Forbidden — HMAC sai / nonce trùng / timestamp hết hạn |
| 422  | Unprocessable — thiếu field           |

---

## GET /api/data

Lấy danh sách 50 record gần nhất, đã decrypt.

> **Không yêu cầu xác thực** — đây là thiết kế có chủ ý cho demo UI.
> Dữ liệu nhiệt độ được mã hóa AES-256-GCM trong DB nên ciphertext có thể public mà không lộ plaintext.

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

| Field  | Mô tả |
|--------|-------|
| time   | Unix timestamp của request |
| code   | HTTP status code (200, 401, 403) |
| reason | Mô tả kết quả auth |
| device | deviceId từ payload (hoặc "unknown" nếu L1 fail) |
| layer  | Layer nào xử lý: `L1` / `L2a` / `L2b` / `L3` / `OK` |

---

## GET /api/stats

Trả về thống kê tổng hợp.

> **Không yêu cầu xác thực** — dùng cho stat cards trên UI.

### Response Body

```json
{
  "replayAttempts": 3,
  "activeDevices":  1
}
```

| Field          | Mô tả |
|----------------|-------|
| replayAttempts | Số lần nonce bị dùng lại (L2b reject), reset khi restart |
| activeDevices  | Số deviceId unique trong DB |

---

## Timestamp Tolerance

Server chấp nhận request nếu: `|now - timestamp| <= 30 giây`

Request cũ hơn 30 giây sẽ bị reject với `403 Timestamp expired`.
