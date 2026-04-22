# Demo Checklist — Secure IoT Temperature Monitoring System

Chạy theo thứ tự từ trên xuống. Tick từng bước trước khi qua bước tiếp theo.

> **Nhanh nhất:** Tất cả scene đều có thể demo bằng nút trên UI — không cần chạy sensor.py.

---

## Chuẩn bị trước khi lên demo

- [ ] Mở **Terminal 1** — chạy API server: `cd backend/api && python app.py`
- [ ] Mở **Terminal 2** — chạy frontend: `cd frontend && npm run dev`
- [ ] Mở trình duyệt tại `http://localhost:5173`
- [ ] Nhấn **⟳ Reset Demo** để bắt đầu từ trạng thái sạch
- [ ] Mở **DB Browser for SQLite** — load `backend/api/edge_data.db` (tùy chọn)
- [ ] Mở sẵn `crypto/aes_helper.py` và `middleware/auth.py` trong VS Code (tùy chọn)

---

## Khởi động

- [ ] Server hiện `Server : http://localhost:5000`
- [ ] UI load không lỗi, 5 stat cards hiện `0`
- [ ] Header hiện dot xanh "Online"

---

## Scene 1 — Normal payload (dữ liệu hợp lệ)

Nhấn nút **▶ Send Normal** trên UI.

- [ ] Action log hiện `✓ 200 OK — temp=xx.x°C`
- [ ] Layer Status Indicator: L1 ✓, L2a ✓, L2b ✓, L3 ✓, L4 ✓ (tất cả xanh)
- [ ] Bảng xuất hiện record mới, badge **✓ Valid** (xanh)
- [ ] Biểu đồ nhiệt độ cập nhật ngay (WebSocket push)
- [ ] Audit Log: entry `200 · OK · sensor-001`

**Điểm nói:** *"Nhiệt độ hiển thị trên UI là 35.x°C, nhưng trong database chỉ thấy chuỗi mã hóa — attacker lấy được file DB cũng không đọc được."*

**Bonus:** Click icon 🔍 trên row → mở AES-GCM Breakdown Modal, chỉ nonce/cipher/tag.

---

## Scene 2 — Tampered payload (giả mạo dữ liệu)

Nhấn nút **⚠ Send Tampered** trên UI.

- [ ] Action log hiện `✗ 403 — HMAC mismatch — record saved as tampered`
- [ ] Layer Status Indicator: L1 ✓, L2a ✓, L2b ✓, L3 ✗ (đỏ), L4 ✓
- [ ] Bảng xuất hiện record mới, badge **✗ Tampered** (đỏ), nhiệt độ = 99.9°C
- [ ] Audit Log: entry đỏ `403 · L3 · sensor-001 · HMAC mismatch`

**Điểm nói:** *"Attacker sửa temperature từ 35.x thành 99.9 nhưng không có HMAC secret để ký lại — server phát hiện ngay, vẫn lưu record để audit."*

---

## Scene 3 — Replay attack (gửi lại gói hợp lệ)

Nhấn **▶ Send Normal** trước (cần replayReady), sau đó nhấn **↻ Replay Attack**.

- [ ] Action log hiện `✗ 403 — Replay detected — replay blocked`
- [ ] Layer Status Indicator: L1 ✓, L2a ✓, L2b ✗ (đỏ), L3 —, L4 ✓
- [ ] Bảng **không** xuất hiện record mới
- [ ] Audit Log: entry cam `403 · L2b · sensor-001 · Replay detected`

**Điểm nói:** *"Gói tin hoàn toàn hợp lệ, chữ ký đúng, nhưng nonce đã được dùng rồi — server từ chối, không lưu."*

---

## Scene 4 — Expired Timestamp (freshness attack)

Nhấn nút **⏱ Expired Timestamp** trên UI.

- [ ] Action log hiện `✗ 403 — Timestamp expired (35s > 30s tolerance)`
- [ ] Layer Status Indicator: L1 ✓, L2a ✗ (đỏ), L2b —, L3 —, L4 ✓
- [ ] Bảng không xuất hiện record mới
- [ ] Audit Log: entry cam `403 · L2a · sensor-001 · Timestamp expired`

**Điểm nói:** *"Chữ ký hợp lệ nhưng gói tin gửi lại sau 35 giây — vượt tolerance 30s. Ngăn attacker capture và delay gói tin."*

---

## Scene 5 — Wrong API Key (thiết bị lạ)

Nhấn nút **🔑 Wrong API Key** trên UI.

- [ ] Action log hiện `✗ 401 — Invalid API key — unknown device rejected`
- [ ] Layer Status Indicator: L1 ✗ (đỏ), L2a —, L2b —, L3 —, L4 ✓
- [ ] Audit Log: entry đỏ `401 · L1 · unknown · Invalid API key`

**Điểm nói:** *"Thiết bị không có API key thì không thể gửi dữ liệu vào hệ thống — bị chặn ngay tại L1."*

---

## Scene 6 — Rate Limiting L4 (DoS prevention)

Nhấn **▶▶ Auto-Send** để bật chế độ gửi liên tục 2s/lần, chờ ~60 giây.

- [ ] Sau ~60 giây (hoặc 30 requests), action log hiện `✗ 429 — Rate limit exceeded`
- [ ] Audit Log: entry tím `429 · L4 · sensor-001 · Rate limit exceeded`

**Điểm nói:** *"Hệ thống giới hạn 30 requests/phút để ngăn tấn công flood — layer bảo vệ thứ 4."*

> Nhấn **▶▶ Auto-Send** lần nữa để tắt, sau đó nhấn **⟳ Reset Demo**.

---

## Show thêm tính năng (bonus điểm)

### Biểu đồ nhiệt độ

- [ ] Chỉ biểu đồ: dot xanh = valid, dot đỏ = tampered, spike 99.9°C rõ ràng
- [ ] Reference line màu cam ở 38°C

### Inspect Payload

Nhấn **🔍 Inspect Payload**:
- [ ] Chỉ các fields và layer references (L1/L2a/L2b/L3)
- [ ] Chỉ X-Signature hash phía dưới

### Filter bảng

- [ ] Click **✗ Tampered** → chỉ hiện records bị giả mạo
- [ ] Click **All** để về lại

### Export CSV

- [ ] Click **↓ Export CSV** trên bảng records → file `records_<timestamp>.csv`
- [ ] Click **↓ Export CSV** trên Audit Log → file `audit_<timestamp>.csv`

### WebSocket realtime

- [ ] Mở Terminal 3: `cd backend/sensor-simulator && python sensor.py`
- [ ] UI cập nhật ngay sau mỗi gói tin — không cần chờ 3s poll

---

## Kết thúc

- [ ] Nhấn **⟳ Reset Demo** — bảng và audit log về trống
- [ ] Tắt `sensor.py` bằng `Ctrl+C`
- [ ] Tắt `app.py` bằng `Ctrl+C`
- [ ] Chuyển sang slide tổng kết

---

## Nếu có sự cố

| Lỗi | Xử lý |
|---|---|
| `Cannot connect to localhost:5000` | Kiểm tra Terminal 1 đã chạy `python app.py` chưa |
| `ModuleNotFoundError` | Chạy lại `pip install -r requirements.txt` |
| UI không load data | Đảm bảo mở qua `http://localhost:5173` |
| WebSocket không kết nối | Khởi động lại server, tải lại trang |
| Replay button disabled | Nhấn **▶ Send Normal** trước để kích hoạt |
| Rate limit còn active | Chờ 60s hoặc restart server |
