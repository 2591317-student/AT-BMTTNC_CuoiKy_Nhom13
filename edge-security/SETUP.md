# Hướng dẫn cài đặt & chạy hệ thống

## Yêu cầu

| Công cụ | Phiên bản | Kiểm tra |
|---|---|---|
| Python | 3.10+ | `python --version` |
| Node.js | 18+ | `node --version` |
| npm | 8+ | `npm --version` |

---

## Bước 1 — Cấu hình keys

Keys chung được quản lý tập trung tại **1 file duy nhất**: `.env` ở root.

```
edge-security/
├── .env                    ← API_KEY, HMAC_SECRET, AES_KEY (chỉnh ở đây)
├── backend/api/.env        ← TIMESTAMP_TOLERANCE, DB_PATH, USE_HTTPS
└── backend/sensor-simulator/.env  ← API_ENDPOINT, DEVICE_ID, v.v.
```

Keys đã được tạo sẵn. Nếu muốn sinh key mới:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## Bước 2 — Chạy API server

```bash
cd backend/api
pip install -r requirements.txt
python app.py
```

Kết quả mong đợi:
```
Database : edge_data.db
Server   : http://localhost:5000
 * Running on http://0.0.0.0:5000
```

Kiểm tra nhanh:
```bash
curl http://localhost:5000/api/data
# Trả về: []
```

---

## Bước 3 — Chạy Frontend

Mở terminal mới:

```bash
cd frontend
npm install
npm run dev
```

Kết quả mong đợi:
```
  VITE v5.x  ready in ...ms
  ➜  Local:   http://localhost:5173/
```

Mở trình duyệt tại `http://localhost:5173`

> Vite proxy tự forward `/api/*` và `/socket.io/*` → `localhost:5000` — không cần cấu hình thêm.

---

## Bước 4 — Chạy Sensor (tùy chọn)

Mở terminal mới:

```bash
cd backend/sensor-simulator
pip install -r requirements.txt
python sensor.py
```

> Demo đầy đủ có thể chạy hoàn toàn từ UI — không bắt buộc chạy sensor.py.

---

## Chạy unit tests

```bash
cd backend
python -m pytest tests/ -v
# Expected: 37 passed
```

---

## Chạy tất cả cùng lúc

Mở **3 terminal** song song:

```powershell
# Terminal 1
cd backend/api
python app.py

# Terminal 2
cd frontend
npm run dev

# Terminal 3 (tùy chọn)
cd backend/sensor-simulator
python sensor.py
```

---

## Cấu trúc .env

### `.env` (root — shared keys)

```
API_KEY=<key>
HMAC_SECRET=<secret>
AES_KEY=<key>
```

### `backend/api/.env`

```
TIMESTAMP_TOLERANCE=30
DB_PATH=edge_data.db
USE_HTTPS=false
```

> Để bật HTTPS: đặt `USE_HTTPS=true`, cần cài `pyOpenSSL` (đã có trong requirements.txt).
> Browser sẽ cảnh báo self-signed cert — đây là thiết kế cho demo.

### `backend/sensor-simulator/.env`

```
API_ENDPOINT=http://localhost:5000/api/data
DEVICE_ID=sensor-001
SEND_INTERVAL=2
TEMP_MIN=30.0
TEMP_MAX=40.0
```

---

## Xử lý lỗi thường gặp

| Lỗi | Nguyên nhân | Cách xử lý |
|---|---|---|
| `Cannot connect to localhost:5000` | Server chưa chạy | Chạy `python app.py` trước |
| `ModuleNotFoundError` | Chưa install dependencies | Chạy `pip install -r requirements.txt` |
| `403 HMAC mismatch` khi chạy sensor | `HMAC_SECRET` khác nhau | Đồng bộ key trong 2 file `.env` |
| UI không load data | CORS hoặc server offline | Mở UI qua `http://localhost:5173`, không dùng `file://` |
| `npm run dev` lỗi path | Ký tự `&` trong tên thư mục | Chạy từ PowerShell hoặc terminal của VS Code |
| WebSocket không kết nối | Server cũ chạy | Tắt hết process Python rồi restart `python app.py` |

---

## Demo nhanh (không cần sensor.py)

UI có 7 nút demo chạy thẳng từ trình duyệt:

| Nút | Tác dụng | Layer bị chặn |
|---|---|---|
| ▶ Send Normal | Gửi payload hợp lệ → badge xanh Valid | — (tất cả pass) |
| ⚠ Send Tampered | Sửa nhiệt độ, giữ signature → badge đỏ Tampered | L3 |
| ↻ Replay Attack | Gửi lại gói cũ → 403 Replay detected | L2b |
| ⏱ Expired Timestamp | Timestamp 35s cũ → 403 Timestamp expired | L2a |
| 🔑 Wrong API Key | Gửi với key sai → 401 Unauthorized | L1 |
| ▶▶ Auto-Send | Gửi payload liên tục mỗi 2s | — |
| ⟳ Reset Demo | Xóa toàn bộ DB và audit log | — |
