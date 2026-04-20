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
  "temperature": 35.72,
  "timestamp":   1713600000,
  "nonce":       "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
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

### Response Body

```json
[
  {
    "id":               1,
    "deviceId":         "sensor-001",
    "temperature":      35.72,
    "timestamp":        1713600000,
    "isValidSignature": true
  }
]
```

---

## Timestamp Tolerance

Server chấp nhận request nếu: `|now - timestamp| <= 30 giây`

Request cũ hơn 30 giây sẽ bị reject với `403 Expired`.
