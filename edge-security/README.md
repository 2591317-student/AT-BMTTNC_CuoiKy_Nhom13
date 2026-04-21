# Secure IoT Temperature Monitoring System

Đồ án môn **An Toàn và Bảo Mật Thông Tin Nâng Cao**
Chủ đề: **Bảo mật dữ liệu trong hệ thống Edge Computing**

## Mô tả

Hệ thống demo bảo mật dữ liệu IoT end-to-end với 3 cơ chế chính:

| Cơ chế | Kỹ thuật | Bảo vệ |
|---|---|---|
| Mã hóa dữ liệu | AES-256-GCM | Confidentiality |
| Xác thực payload | HMAC-SHA256 | Integrity |
| Chống replay | Nonce + Timestamp | Freshness |

## Cấu trúc

```
edge-security/
├── backend/
│   ├── api/               ← Flask API + Crypto + DB
│   └── sensor-simulator/  ← Sensor giả lập (normal + tamper)
├── frontend/              ← React + Vite dashboard
├── shared/                ← API contract, payload mẫu
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

## Thành viên

| Thành viên | Phụ trách |
|---|---|
| [Tên 1] | Backend API + Crypto Layer |
| [Tên 2] | Sensor Simulator |
| [Tên 3] | Frontend React + Demo |
