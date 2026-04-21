# Demo Checklist — Secure IoT Temperature Monitoring System

Chạy theo thứ tự từ trên xuống. Tick từng bước trước khi qua bước tiếp theo.

> **Nhanh nhất:** Tất cả 4 scene đều có thể demo bằng nút trên UI — không cần chạy sensor.py.
> Dùng `python sensor.py` / `tamper_sensor.py` nếu muốn show terminal output song song.

---

## Chuẩn bị trước khi lên demo

- [ ] Mở **Terminal 1** — chạy API server
- [ ] Mở **trình duyệt** — mở `http://localhost:5173`
- [ ] Mở **DB Browser for SQLite** — load file `backend/api/edge_data.db`
- [ ] Mở **VS Code** — mở sẵn `crypto/aes_helper.py` và `middleware/auth.py`

---

## Khởi động

```powershell
# Terminal 1
cd backend/api
python app.py

# Terminal 2 — Frontend
cd frontend
npm run dev
```

- [ ] Server hiện `Server : http://localhost:5000`
- [ ] Trình duyệt load UI tại `http://localhost:5173` không lỗi

---

## Scene 1 — Normal payload (dữ liệu hợp lệ)

**Cách A (nhanh):** Nhấn nút **▶ Send Normal** trên UI.

**Cách B (terminal):**
```powershell
cd backend/sensor-simulator
python sensor.py
```

- [ ] Action log hiện `✓ 200 OK — temp=xx.x°C`
- [ ] UI hiện record mới, badge **xanh "Valid"**
- [ ] DB Browser → F5 → cột `encryptedTemp` là chuỗi base64 (không đọc được)
- [ ] DB Browser → cột `isValidSignature = 1`

**Điểm nói:** *"Nhiệt độ hiển thị trên UI là 35.x°C, nhưng trong database chỉ thấy chuỗi mã hóa — attacker lấy được file DB cũng không đọc được."*

---

## Scene 2 — Tampered payload (giả mạo dữ liệu)

**Cách A (nhanh):** Nhấn nút **⚠ Send Tampered** trên UI.

**Cách B (terminal):**
```powershell
python tamper_sensor.py
```

- [ ] Action log hiện `✗ 403 — HMAC mismatch`
- [ ] UI hiện record mới, badge **đỏ "Tampered"**, nhiệt độ = 99.9°C
- [ ] DB Browser → `isValidSignature = 0`

**Điểm nói:** *"Attacker sửa temperature từ 35.x thành 99.9 nhưng không có HMAC secret để ký lại — server phát hiện ngay, ghi log lại để audit."*

---

## Scene 3 — Replay attack (gửi lại gói hợp lệ)

**Cách A (nhanh):** Nhấn **▶ Send Normal** trước, sau đó nhấn **↻ Replay Attack**.

**Cách B (terminal):** _(tamper_sensor.py chạy Scene 3 tự động sau Scene 2)_

- [ ] Action log hiện `✗ 403 — Replay detected`
- [ ] UI **không** xuất hiện record mới (nonce trùng → không lưu)

**Điểm nói:** *"Gói tin hoàn toàn hợp lệ, chữ ký đúng, nhưng nonce đã được dùng rồi — server từ chối không lưu."*

---

## Scene 4 — Sai API Key (thiết bị lạ)

**Cách A (nhanh):** Nhấn nút **🔑 Wrong API Key** trên UI.

**Cách B (REST Client):** Dùng `tests/api-tests.http` → chạy **TC-02** trong VS Code REST Client.

- [ ] Action log / Response hiện `✗ 401 — Invalid API key`
- [ ] UI không thay đổi
- [ ] Audit Log Panel hiện entry đỏ `401 · L1 · unknown · Invalid API key`

**Điểm nói:** *"Thiết bị không có API key thì không thể gửi dữ liệu vào hệ thống."*

---

## Scene 5 — Timestamp hết hạn (freshness attack)

**Cách A (nhanh):** Nhấn nút **⏱ Expired Timestamp** trên UI.

- [ ] Action log hiện `✗ 403 — Timestamp expired — timestamp too old (35s > 30s tolerance)`
- [ ] UI không xuất hiện record mới
- [ ] Audit Log Panel hiện entry cam `403 · L2a · sensor-001 · Timestamp expired`

**Điểm nói:** *"Gói tin có chữ ký hợp lệ nhưng được gửi lại sau 35 giây — server từ chối vì vượt quá tolerance 30s. Cơ chế này chống attacker capture và delay gói tin."*

---

## Show Audit Log trực tiếp (thêm điểm)

Trên UI — phần **Request Audit Log** ở cuối trang:

- [ ] Chỉ màu sắc khác nhau theo layer: xanh (200·OK), cam (403·L2), đỏ (401·L1)
- [ ] Chỉ cột **Layer** — L1/L2a/L2b/L3 thể hiện rõ 3-layer defense
- [ ] Nói: *"Mỗi request thất bại đều ghi lại đủ thông tin để forensics."*

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
