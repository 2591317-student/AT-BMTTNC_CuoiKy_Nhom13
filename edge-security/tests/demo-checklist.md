# Demo Checklist — Secure IoT Temperature Monitoring System

Chạy theo thứ tự từ trên xuống. Tick từng bước trước khi qua bước tiếp theo.

---

## Chuẩn bị trước khi lên demo

- [ ] Mở **Terminal 1** — chạy API server
- [ ] Mở **Terminal 2** — chờ chạy sensor
- [ ] Mở **trình duyệt** — mở `frontend/index.html`
- [ ] Mở **DB Browser for SQLite** — load file `backend/api/edge_data.db`
- [ ] Mở **VS Code** — mở sẵn `crypto/aes_helper.py` và `middleware/auth.py`

---

## Khởi động

```bash
# Terminal 1
cd backend/api
python app.py

# Terminal 2 (chờ Terminal 1 xong)
cd backend/sensor-simulator
```

- [ ] Server hiện `Server : http://localhost:5000`
- [ ] Trình duyệt load UI không lỗi

---

## Scene 1 — Normal payload (dữ liệu hợp lệ)

```bash
# Terminal 2
python sensor.py
```

- [ ] Terminal 2 hiện `✅ 200 OK`
- [ ] UI hiện record mới, badge **xanh "Valid"**
- [ ] DB Browser → F5 → cột `encryptedTemp` là chuỗi mã hóa (không đọc được)
- [ ] DB Browser → cột `isValidSignature = 1`

**Điểm nói:** *"Nhiệt độ hiển thị trên UI là 35.x°C, nhưng trong database chỉ thấy chuỗi mã hóa — attacker lấy được file DB cũng không đọc được."*

Nhấn `Ctrl+C` để dừng sensor.py.

---

## Scene 2 — Tampered payload (giả mạo dữ liệu)

```bash
# Terminal 2
python tamper_sensor.py
```

- [ ] Terminal 2 — Scene 1: `✅ 200 OK`
- [ ] Terminal 2 — Scene 2: `❌ 403 — HMAC mismatch`
- [ ] UI hiện record mới, badge **đỏ "Tampered"**, nhiệt độ = 99.9°C
- [ ] DB Browser → `isValidSignature = 0`

**Điểm nói:** *"Attacker sửa temperature từ 35.x thành 99.9 nhưng không có HMAC secret để ký lại — server phát hiện ngay, ghi log lại để audit."*

---

## Scene 3 — Replay attack (gửi lại gói hợp lệ)

_(tamper_sensor.py chạy Scene 3 tự động sau Scene 2)_

- [ ] Terminal 2 — Scene 3: `❌ 403 — Replay detected`
- [ ] UI **không** xuất hiện record mới (nonce trùng → không lưu)

**Điểm nói:** *"Gói tin hoàn toàn hợp lệ, chữ ký đúng, nhưng nonce đã được dùng rồi — server từ chối không lưu."*

---

## Scene 4 — Sai API Key (thiết bị lạ)

Dùng `tests/api-tests.http` → chạy **TC-02** trong VS Code REST Client.

- [ ] Response: `401 Unauthorized`
- [ ] UI không thay đổi

**Điểm nói:** *"Thiết bị không có API key thì không thể gửi dữ liệu vào hệ thống."*

---

## Show DB trực tiếp (thêm điểm)

Trong DB Browser:

- [ ] Chỉ cột `encryptedTemp` — chuỗi base64 không đọc được
- [ ] Chỉ cột `isValidSignature` — 1 (valid) và 0 (tampered) cạnh nhau
- [ ] Nói: *"Nếu mở DB mà không có AES key thì không decrypt được — đây là confidentiality."*

---

## Kết thúc

- [ ] Tắt `sensor.py` bằng `Ctrl+C`
- [ ] Tắt `app.py` bằng `Ctrl+C`
- [ ] Chuyển sang slide tổng kết

---

## Nếu có sự cố

| Lỗi | Xử lý |
|-----|-------|
| `Cannot connect to localhost:5000` | Kiểm tra Terminal 1 đã chạy `python app.py` chưa |
| `ModuleNotFoundError` | Chạy lại `pip install -r requirements.txt` |
| UI không load data | Kiểm tra CORS — mở UI qua `http://` thay vì `file://` |
| DB trống | Chạy `sensor.py` ít nhất 1 lần trước khi lên demo |
