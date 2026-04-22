# Secure IoT Temperature Monitoring System

Đồ án môn **An Toàn và Bảo Mật Thông Tin Nâng Cao**
Chủ đề: **Bảo mật dữ liệu trong hệ thống Edge Computing**

## Mô tả

Hệ thống demo bảo mật dữ liệu IoT end-to-end với 4 lớp bảo vệ:

| Layer | Cơ chế | Kỹ thuật | Bảo vệ |
|---|---|---|---|
| L1 | API Key | `X-API-Key` header | Authentication |
| L2a | Timestamp | Tolerance ±30s | Freshness |
| L2b | Nonce | UUID v4 + DB check | Replay prevention |
| L3 | HMAC-SHA256 | `X-Signature` header | Integrity |
| L4 | Rate Limiting | flask-limiter 30 req/min | DoS prevention |
| — | AES-256-GCM | AEAD encrypt in DB | Confidentiality |

## Cấu trúc

```
edge-security/
├── backend/
│   ├── api/               ← Flask API + Crypto + DB + WebSocket
│   └── sensor-simulator/  ← Sensor giả lập (normal + tamper)
├── frontend/              ← React + Vite dashboard
├── shared/                ← API contract
└── tests/                 ← Test cases, demo checklist
```

## Chạy nhanh

```powershell
# Terminal 1 — API server
cd backend/api
pip install -r requirements.txt
python app.py

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev

# Terminal 3 — Sensor (tùy chọn)
cd backend/sensor-simulator
python sensor.py
```

Chi tiết xem [SETUP.md](SETUP.md)

## Tính năng

**Backend:**
- 4-layer security middleware (L1→L4)
- AES-256-GCM encrypt trước khi lưu SQLite
- In-memory audit log (20 entries)
- WebSocket push (flask-socketio) — UI cập nhật realtime
- HTTPS qua `USE_HTTPS=true` trong `.env`
- 37 unit tests (`pytest tests/`)

**Frontend:**
- Dashboard realtime (WebSocket + polling fallback)
- Biểu đồ nhiệt độ (recharts)
- Filter bảng: All / Valid / Tampered
- Export CSV cho records và audit log
- Layer Status Indicator sau mỗi demo
- Auto-send mode (gửi tự động mỗi 2s)
- Payload Inspector + AES-GCM breakdown modal
- Countdown đến lần refresh tiếp theo

## Chạy unit tests

```bash
cd backend
python -m pytest tests/ -v
```

## Thành viên

| Thành viên | Phụ trách |
|---|---|
| [Tên 1] | Backend API + Crypto Layer |
| [Tên 2] | Sensor Simulator |
| [Tên 3] | Frontend React + Demo |
