# Test Cases — Secure IoT Temperature Monitoring System

## Môi trường test

- API server: `http://localhost:5000`
- Frontend:   `http://localhost:5173`
- DB file:    `backend/api/edge_data.db`
- Unit tests: `cd backend && python -m pytest tests/ -v`
- Tool:       trình duyệt, DB Browser for SQLite, curl

---

## TC-01 — Normal payload (happy path)

**Mục đích:** Kiểm tra luồng hoạt động bình thường

**Cách chạy:** Click **▶ Send Normal** trên UI

**Expected:**
- Action log: `✓ 200 OK — temp=xx.x°C`
- Layer Status: L1 ✓ L2a ✓ L2b ✓ L3 ✓ L4 ✓
- UI: badge xanh **✓ Valid**, nhiệt độ hiển thị bình thường
- DB: `isValidSignature = 1`, `encryptedTemp` là chuỗi base64

**Kết quả:** ✅ Pass

---

## TC-02 — Tampered payload (HMAC mismatch)

**Mục đích:** Kiểm tra phát hiện giả mạo dữ liệu

**Cách chạy:** Click **⚠ Send Tampered** trên UI

**Mô tả:** Temperature bị sửa từ `35.x` → `99.9`, signature giữ nguyên

**Expected:**
- Action log: `✗ 403 — HMAC mismatch — record saved as tampered`
- Layer Status: L3 ✗ (đỏ)
- UI: badge đỏ **✗ Tampered**, temp = 99.9°C
- DB: record được lưu với `isValidSignature = 0`

**Kết quả:** ✅ Pass

---

## TC-03 — Replay attack (nonce đã dùng)

**Mục đích:** Kiểm tra chống gửi lại gói tin cũ

**Cách chạy:** Click **▶ Send Normal**, sau đó **↻ Replay Attack**

**Expected:**
- Action log: `✗ 403 — Replay detected — replay blocked`
- Layer Status: L2b ✗ (đỏ)
- UI: không xuất hiện record mới
- Audit Log: `403 · L2b`

**Kết quả:** ✅ Pass

---

## TC-04 — Timestamp hết hạn

**Mục đích:** Kiểm tra reject gói tin quá cũ (> 30 giây)

**Cách chạy:** Click **⏱ Expired Timestamp** trên UI

**Expected:**
- Action log: `✗ 403 — Timestamp expired (35s > 30s tolerance)`
- Layer Status: L2a ✗ (đỏ)
- DB: không lưu

**Kết quả:** ✅ Pass

---

## TC-05 — Sai API Key

**Mục đích:** Kiểm tra reject thiết bị không xác thực

**Cách chạy:** Click **🔑 Wrong API Key** trên UI

**Expected:**
- Action log: `✗ 401 — Invalid API key`
- Layer Status: L1 ✗ (đỏ)
- DB: không lưu

**Kết quả:** ✅ Pass

---

## TC-06 — Thiếu field bắt buộc

**Mục đích:** Kiểm tra validation đầu vào

**Cách chạy:** `curl -X POST http://localhost:5000/api/data -H "X-API-Key: <key>" -d '{"deviceId":"x"}'`

**Expected:**
- Response: `422 Unprocessable`
- Body: `{ "reason": "Missing fields: ['nonce', 'temperature', 'timestamp']" }`

**Kết quả:** ✅ Pass

---

## TC-07 — Dữ liệu mã hóa trong DB

**Mục đích:** Kiểm tra AES-GCM encrypt trước khi lưu

**Cách chạy:** Sau TC-01, mở DB Browser → load `backend/api/edge_data.db`

**Expected:**
- Cột `encryptedTemp`: chuỗi base64 (không đọc được)
- Không thể đọc nhiệt độ từ DB mà không có AES key

**Kết quả:** ✅ Pass

---

## TC-08 — GET /api/data trả về đã decrypt

**Mục đích:** Kiểm tra AES-GCM decrypt khi GET

**Cách chạy:** `curl http://localhost:5000/api/data`

**Expected:**
- Response: `200 OK`
- Body: array JSON, field `temperature` là số thực
- Field `encryptedTemp` là base64 (cả hai đều có)

**Kết quả:** ✅ Pass

---

## TC-09 — UI badge Valid

**Mục đích:** Kiểm tra UI hiển thị đúng trạng thái hợp lệ

**Expected:** Badge xanh, stat card "Valid Signatures" tăng 1

**Kết quả:** ✅ Pass

---

## TC-10 — UI badge Tampered

**Mục đích:** Kiểm tra UI hiển thị đúng trạng thái bị giả mạo

**Expected:** Badge đỏ **✗ Tampered**, temp = 99.90°C, stat card "Tampered Detected" tăng 1

**Kết quả:** ✅ Pass

---

## TC-11 — WebSocket realtime update

**Mục đích:** Kiểm tra UI cập nhật ngay khi có data mới (không chờ 3s poll)

**Cách chạy:** Mở Network tab → ws frame, sau đó click **▶ Send Normal**

**Expected:**
- WebSocket nhận event `data_update` trong < 500ms sau khi gửi
- Bảng cập nhật ngay, không cần chờ poll cycle

**Kết quả:** ✅ Pass

---

## TC-12 — HMAC ký trong browser khớp với Python

**Mục đích:** Kiểm tra JS Web Crypto API tạo signature giống Python

**Cách chạy:** Click **▶ Send Normal** → server verify thành công

**Expected:** Response `200 OK`

**Kết quả:** ✅ Pass

---

## TC-13 — Expired Timestamp attack (Layer 2a)

**Mục đích:** Kiểm tra reject gói tin có timestamp cũ có chữ ký hợp lệ

**Cách chạy:** Click **⏱ Expired Timestamp** (timestamp = now - 35s)

**Expected:** `403 · L2a · Timestamp expired`

**Kết quả:** ✅ Pass

---

## TC-14 — GET /api/audit trả về audit log

**Cách chạy:** `curl http://localhost:5000/api/audit`

**Expected:**
- `200 OK`, array tối đa 20 phần tử
- Mỗi entry có `time`, `code`, `reason`, `device`, `layer`
- Newest first

**Kết quả:** ✅ Pass

---

## TC-15 — GET /api/stats

**Cách chạy:** `curl http://localhost:5000/api/stats`

**Expected:** `{ "replayAttempts": N, "activeDevices": N }`

**Kết quả:** ✅ Pass

---

## TC-16 — AES-GCM Breakdown Modal

**Cách chạy:** Sau TC-01, click 🔍 trên bất kỳ row nào

**Expected:**
- Breakdown: `[nonce · 16 chars]`, `[cipher · N chars]`, `[tag · 24 chars]`
- Badge xanh "✓ Signature verified" cho valid record
- `Esc` hoặc click ngoài để đóng

**Kết quả:** ✅ Pass

---

## TC-17 — Rate limiting (Layer 4)

**Mục đích:** Kiểm tra chặn DoS — 30 requests/minute per IP

**Cách chạy:** Click **▶▶ Auto-Send**, chờ request thứ 31 (sau ~60s)

**Expected:**
- Response: `429 Too Many Requests`
- Audit Log: entry tím `429 · L4 · Rate limit exceeded`

**Kết quả:** ✅ Pass

---

## TC-18 — POST /api/reset

**Mục đích:** Kiểm tra reset xóa DB và audit log

**Cách chạy:** Click **⟳ Reset Demo** (hoặc `curl -X POST localhost:5000/api/reset`)

**Expected:**
- Response: `{ "status": "ok" }`
- Bảng records về trống
- Audit Log về trống
- Stat cards về 0

**Kết quả:** ✅ Pass

---

## TC-19 — Filter table (All / Valid / Tampered)

**Mục đích:** Kiểm tra filter buttons trên bảng records

**Cách chạy:** Gửi 1 Valid + 1 Tampered, sau đó click từng filter

**Expected:**
- **✓ Valid**: chỉ hiện record valid
- **✗ Tampered**: chỉ hiện record tampered
- **All**: hiện tất cả

**Kết quả:** ✅ Pass

---

## TC-20 — Export CSV

**Mục đích:** Kiểm tra export dữ liệu ra file CSV

**Cách chạy:** Click **↓ Export CSV** trên bảng records và audit log

**Expected:**
- File `records_<timestamp>.csv` với header: `id,deviceId,temperature,timestamp,isValidSignature,encryptedTemp`
- File `audit_<timestamp>.csv` với header: `time,code,layer,device,reason`

**Kết quả:** ✅ Pass

---

## TC-21 — Countdown refresh timer

**Mục đích:** Kiểm tra countdown đếm ngược đến lần refresh tiếp theo

**Cách chạy:** Quan sát khu vực toolbar bên phải bảng records

**Expected:**
- Text "refresh in Xs" đếm từ 3 xuống 1 rồi reset về 3
- Countdown reset về 3 khi nhấn bất kỳ demo button nào

**Kết quả:** ✅ Pass

---

## TC-22 — Temperature chart

**Mục đích:** Kiểm tra biểu đồ hiển thị đúng màu theo trạng thái

**Cách chạy:** Gửi một số Valid + Tampered records, quan sát chart

**Expected:**
- Dot xanh = valid, dot đỏ = tampered, dot cam = valid nhưng > 38°C
- Reference line màu cam tại 38°C
- Tooltip hiển thị đúng temp, device, status

**Kết quả:** ✅ Pass

---

## TC-23 — Auto-send mode

**Mục đích:** Kiểm tra gửi payload tự động liên tục

**Cách chạy:** Click **▶▶ Auto-Send**, quan sát trong 10 giây

**Expected:**
- Counter tăng dần (x sent)
- Records mới liên tục xuất hiện trong bảng
- Click lại để dừng, counter reset về 0

**Kết quả:** ✅ Pass

---

## TC-24 — Unit tests backend (pytest)

**Mục đích:** Kiểm tra toàn bộ backend logic qua automated tests

**Cách chạy:** `cd backend && python -m pytest tests/ -v`

**Expected:** `37 passed` — test_crypto (14), test_audit (7), test_database (8), test_middleware (8)

**Kết quả:** ✅ Pass

---

## Tổng kết

| Nhóm | Test case | Pass |
|---|---|---|
| Backend security | TC-01 đến TC-06 | 6/6 |
| Crypto layer | TC-07, TC-08 | 2/2 |
| WebSocket + Realtime | TC-11, TC-12 | 2/2 |
| Frontend UI | TC-09, TC-10 | 2/2 |
| Extended features | TC-13 đến TC-16 | 4/4 |
| New features (v2) | TC-17 đến TC-24 | 8/8 |
| **Tổng** | **24** | **24/24 (100%)** |
