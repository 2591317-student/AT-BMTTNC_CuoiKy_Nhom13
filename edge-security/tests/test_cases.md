# Test Cases — Secure IoT Temperature Monitoring System

## Môi trường test

- API server: `http://localhost:5000`
- Frontend:   `http://localhost:5173`
- DB file:    `backend/api/edge_data.db`
- Tool:       VS Code REST Client (`tests/api-tests.http`), trình duyệt, DB Browser for SQLite

---

## TC-01 — Normal payload (happy path)

**Mục đích:** Kiểm tra luồng hoạt động bình thường

**Cách chạy:**
```bash
cd backend/sensor-simulator && python sensor.py
# Hoặc click nút "Send Normal" trên UI
```

**Expected:**
- Terminal API: `✅ [200] OK — temp=35.x°C saved`
- UI: badge xanh **✓ Valid**, nhiệt độ hiển thị bình thường
- DB: `isValidSignature = 1`, `encryptedTemp` là chuỗi base64

**Kết quả:** ✅ Pass

---

## TC-02 — Tampered payload (HMAC mismatch)

**Mục đích:** Kiểm tra phát hiện giả mạo dữ liệu

**Cách chạy:**
```bash
python tamper_sensor.py   # Scene 2
# Hoặc click nút "Send Tampered" trên UI
```

**Mô tả:** Temperature bị sửa từ `35.x` → `99.9`, signature giữ nguyên

**Expected:**
- Terminal API: `❌ [403] HMAC mismatch — record saved as tampered`
- UI: badge đỏ **✗ Tampered**, temp = 99.9°C
- DB: record được lưu với `isValidSignature = 0`

**Kết quả:** ✅ Pass

---

## TC-03 — Replay attack (nonce đã dùng)

**Mục đích:** Kiểm tra chống gửi lại gói tin cũ

**Cách chạy:**
```bash
python tamper_sensor.py   # Scene 3 (tự động sau Scene 1)
# Hoặc click nút "Replay Attack" trên UI (sau khi đã Send Normal)
```

**Mô tả:** Gửi lại đúng payload + signature hợp lệ từ TC-01

**Expected:**
- Terminal API: `❌ [403] Replay detected — nonce already used`
- UI: không xuất hiện record mới
- DB: không có record mới được thêm

**Kết quả:** ✅ Pass

---

## TC-04 — Timestamp hết hạn

**Mục đích:** Kiểm tra reject gói tin quá cũ (> 30 giây)

**Cách chạy:** Dùng `tests/api-tests.http` → TC-04 (timestamp = 1000000000)

**Expected:**
- Response: `403 Forbidden`
- Body: `{ "reason": "Timestamp expired" }`
- DB: không lưu

**Kết quả:** ✅ Pass

---

## TC-05 — Sai API Key

**Mục đích:** Kiểm tra reject thiết bị không xác thực

**Cách chạy:**
```bash
# tests/api-tests.http → TC-02
# Hoặc click nút "Wrong API Key" trên UI
```

**Expected:**
- Terminal API: `❌ [401] Unauthorized — Invalid API key`
- Response: `401 Unauthorized`
- DB: không lưu

**Kết quả:** ✅ Pass

---

## TC-06 — Thiếu field bắt buộc

**Mục đích:** Kiểm tra validation đầu vào

**Cách chạy:** Dùng `tests/api-tests.http` → TC-03 (payload thiếu `nonce`)

**Expected:**
- Response: `422 Unprocessable`
- Body: `{ "reason": "Missing fields: ['nonce']" }`

**Kết quả:** ✅ Pass

---

## TC-07 — Dữ liệu mã hóa trong DB

**Mục đích:** Kiểm tra AES-GCM encrypt trước khi lưu

**Cách chạy:** Sau TC-01, mở DB Browser for SQLite → load `backend/api/edge_data.db`

**Expected:**
- Cột `encryptedTemp`: chuỗi base64 (ví dụ: `a3Fd9kL2mNp...==`)
- Không thể đọc được nhiệt độ thực từ DB mà không có AES key

**Kết quả:** ✅ Pass

---

## TC-08 — GET /api/data trả về đã decrypt

**Mục đích:** Kiểm tra AES-GCM decrypt khi GET

**Cách chạy:** Dùng `tests/api-tests.http` → TC-07

**Expected:**
- Response: `200 OK`
- Body: array JSON, field `temperature` là số thực (ví dụ: `35.72`)

**Kết quả:** ✅ Pass

---

## TC-09 — UI badge Valid

**Mục đích:** Kiểm tra UI hiển thị đúng trạng thái hợp lệ

**Cách chạy:** Sau TC-01, quan sát UI tại `http://localhost:5173`

**Expected:**
- Record mới xuất hiện với badge xanh **✓ Valid**
- Stat card "Valid Signatures" tăng thêm 1

**Kết quả:** ✅ Pass

---

## TC-10 — UI badge Tampered

**Mục đích:** Kiểm tra UI hiển thị đúng trạng thái bị giả mạo

**Cách chạy:** Sau TC-02, quan sát UI

**Expected:**
- Record mới xuất hiện với badge đỏ **✗ Tampered**
- Stat card "Tampered Detected" tăng thêm 1
- Nhiệt độ hiển thị `99.90°C`

**Kết quả:** ✅ Pass

---

## TC-11 — Auto-refresh UI

**Mục đích:** Kiểm tra UI tự động cập nhật

**Cách chạy:** Để UI mở, chạy `python sensor.py`, không thao tác trình duyệt

**Expected:**
- Bảng tự cập nhật sau tối đa 3 giây khi có record mới
- Row mới flash xanh lá trong ~1.5 giây

**Kết quả:** ✅ Pass

---

## TC-12 — HMAC ký trong browser khớp với Python

**Mục đích:** Kiểm tra JS Web Crypto API tạo signature giống Python

**Cách chạy:** Click "Send Normal" trên UI → server nhận và verify thành công

**Expected:**
- Response: `200 OK` (nếu sai thì 403 HMAC mismatch)

**Kết quả:** ✅ Pass

---

## Tổng kết

| Nhóm | Test case | Pass |
|---|---|---|
| Backend security | TC-01 đến TC-06 | 6/6 |
| Crypto layer | TC-07, TC-08 | 2/2 |
| Frontend UI | TC-09 đến TC-12 | 4/4 |
| **Tổng** | **12** | **12/12 (100%)** |
