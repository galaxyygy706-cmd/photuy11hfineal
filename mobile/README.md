# Phở Túy POS — app mobile

App bán hàng tối ưu cho điện thoại (PWA, cài được lên màn hình chính). Chạy tại `/m/`, song song với app cũ ở `/`, dùng chung database Firebase.

**Đã có (GĐ 0–2):** đăng nhập bằng Firebase Auth, sơ đồ bàn, gọi món, ghi chú, gửi bếp (trừ suất + trừ kho), xác nhận bếp xong / đã giao, thanh toán (tiền mặt / VietQR), dọn bàn, giảm giá, gắn hội viên + tích điểm, gộp bàn, tách món, reset suất 05:00, cấp tài khoản cho nhân viên.
**Chưa có (vẫn dùng app cũ):** màn hình bếp, đơn QR của khách, kho, thu chi, báo cáo, nhân sự & chấm công.

## Lệnh

```bash
npm install
npm run dev         # chạy thử, kết nối database THẬT
npm test            # test nghiệp vụ (tính tiền, tích điểm, gộp/tách, trừ kho, phân quyền)
npm run build       # xuất ra ../m/ để deploy
```

Chạy thử trên database giả lập (an toàn, không đụng dữ liệu quán): xem mục 8 trong `../CLAUDE.md`.

## Đưa vào dùng thật — các bước cần anh/chị tự làm

1. **Bật đăng nhập Email/Password**: Firebase Console → Authentication → Sign-in method → Email/Password → Enable.
2. **Tạo tài khoản quản lý đầu tiên** (chỉ làm một lần):
   - Authentication → Users → Add user: email `<tên đăng nhập của quản lý>@pho-tuy.firebaseapp.com`, mật khẩu mạnh (≥ 6 ký tự, đừng dùng 123456). Copy **User UID**.
   - Realtime Database → thêm node `tai_khoan` → `<User UID>` → `nhanSuId`: key của hồ sơ quản lý trong `NhanSu` (hồ sơ phải có `capDo: "ADMIN"`).
3. `npm run build`, rồi ở thư mục gốc chạy `firebase deploy --only hosting`. Mở `https://pho-tuy.web.app/m/`, đăng nhập bằng tài khoản quản lý.
4. Vào **Thêm → Tài khoản nhân viên**, cấp mật khẩu cho từng người.
5. Sau khi app cũ cũng chuyển sang Firebase Auth (việc sau này): xoá field `password` khỏi mọi bản ghi `NhanSu`, rồi mới áp dụng `../database.rules.draft.json`.

## Khác biệt có chủ đích so với app cũ

| App cũ | App mới |
|---|---|
| Màn hình/QR tính VAT trên tiền **sau** giảm giá, nhưng `history_orders` lại tính trên tiền **trước** giảm → lệch sổ | Một hàm `tinhTien` duy nhất (VAT sau giảm giá) cho cả màn hình, QR và sổ |
| Báo hết hàng dùng hằng số trong code (luôn còn hàng) | Dùng `soldToday`/`limit` thật trên Firebase, combo tính theo món gốc |
| Combo Song Long nhảy 4→6 bát bỏ lỡ quà mốc 5 | Tính "vượt qua mốc 5" |
| `totalBowls` đếm cả quẩy, nước là "bát" | Chỉ đếm suất Túy Tâm/Túy Thượng |
| Gộp/tách gộp món chưa gửi bếp vào món đã gửi → món mới không xuống bếp | Chỉ gộp dòng cùng trạng thái gửi bếp |
| Ghi đè cả mảng đơn → 2 máy cùng gọi món có thể mất món | `runTransaction` |
| Giảm giá không kiểm tra quyền | Bắt buộc quyền `discount` |
| Tài khoản cứng `admin/123456`, mật khẩu lưu dạng chữ thường trong `NhanSu` | Firebase Auth, không đọc/ghi `password` |
