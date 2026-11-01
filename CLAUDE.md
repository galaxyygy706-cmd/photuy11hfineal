# CLAUDE.md — Bộ luật dự án Phở Túy POS

Tài liệu này định hướng cách làm việc trên codebase này. Đọc trước khi sửa bất cứ thứ gì.

## 1. Tổng quan dự án

- App POS (bán hàng) cho quán phở, chạy hoàn toàn trên trình duyệt — **không có build tool, không có bundler, không có test suite/CI**.
- 2 file lõi:
  - `app.js` — toàn bộ logic (~10.700 dòng).
  - `index.html` — toàn bộ giao diện + CSS (~4.100 dòng), nạp `app.js` như script thường.
- `khach.html` — màn hình dành cho khách (tách riêng khỏi app quản lý chính).
- Backend: **Firebase Realtime Database** (project `pho-tuy`), khởi tạo qua `firebaseConfig` ở đầu `app.js`. Deploy qua Firebase Hosting, cấu hình trong `firebase.json`.
- PWA: có `manifest.webmanifest`, `sw.js` (service worker), icon trong `icons/`.
- **App mobile mới** trong `mobile/` (React + TypeScript + Vite), build ra `m/`, chạy tại `/m/` song song với app cũ — xem mục 8. Các quy tắc "không build tool / không tách file" ở trên chỉ áp dụng cho app cũ.

## 2. Cách điều hướng file lớn (bắt buộc)

- **Không đọc nguyên `app.js` hay `index.html` một lần.** Cả hai đều vượt giới hạn đọc file — luôn dùng `Grep` để định vị trước, rồi `Read` với `offset`/`limit` đúng đoạn cần.
- `app.js` có outline dạng comment `/*N. Tên chức năng*/` rải theo từng khối chức năng (VD `/*88. ĐĂNG XUẤT*/`). Số thứ tự **bị trùng/nhảy** ở nhiều chỗ — chỉ dùng để định hướng sơ bộ, không tin tuyệt đối, luôn Grep tên hàm để xác nhận vị trí thật.
- `index.html` có khối `<style id="responsive-optimization-v2">` gần cuối file và một khối lớn hơn ngay sau nó (comment "GIAO DIỆN ĐIỆN THOẠI RÚT GỌN") — đây là **nơi ghi đè CSS mobile mới nhất**, đặt cuối để thắng các rule gốc phía trên bằng `!important`. Mọi chỉnh sửa responsive nên vào đây trước, tránh sửa trực tiếp CSS gốc phía trên trừ khi thật sự cần.

## 3. Quy ước code hiện có — giữ nguyên phong cách

- Tên hàm/biến bằng **tiếng Việt không dấu**, kiểu camelCase: `themNhanSuMoi`, `xoaNhanSu`, `daDangNhap`, `coQuyen`... Không tự ý đổi sang tiếng Anh.
- Phần lớn style là **inline trong HTML** (`style="..."`), xen lẫn một số khối CSS tách riêng trong `<style>`. Khi thêm style mới, ưu tiên theo đúng cách khu vực đó đang làm (đừng trộn 2 phong cách trong cùng 1 component).
- Không tự ý tách `app.js`/`index.html` thành nhiều file, không tự thêm bundler/framework/module hệ thống trừ khi được yêu cầu rõ ràng — đây là quyết định kiến trúc có chủ đích của dự án (tải trực tiếp qua script tag, không cần bước build).
- Comment giải thích bằng tiếng Việt, khá dày trong CSS — tiếp tục phong cách đó khi thêm rule mới có logic không hiển nhiên (đặc biệt các con số magic number liên quan viewport/safe-area).

## 4. Quy tắc Mobile / Responsive

- 3 breakpoint chính đã dùng: `max-width: 1024px` (tablet), `max-width: 768px` (điện thoại), `max-width: 380px` (điện thoại rất nhỏ). Tái sử dụng đúng 3 mốc này, không tự tạo breakpoint mới trừ khi có lý do cụ thể.
- Trên `≤768px`, app dùng pattern **"2 lá sớ"**: cột Thực đơn (`#menu-column.center`) và cột Chi tiết đơn (`#order-column.right`) trở thành bottom-sheet trượt từ đáy màn hình lên (`transform: translateY(...)` + class `.mo-ra` khi mở). Không phá cấu trúc này khi sửa layout mobile.
- Luôn dùng `dvh` (không phải `vh`) và `env(safe-area-inset-bottom)` cho các phần tử chạm đáy màn hình, để không bị thanh địa chỉ Safari/notch iPhone che mất.
- Vùng chạm tối thiểu cho nút bấm trên mobile: **44×44px**. Icon bên trong có thể nhỏ hơn, nhưng vùng có thể bấm phải đủ 44px.
- Khi thêm CSS mobile mới: viết trong khối `responsive-optimization-v2` (hoặc khối "GIAO DIỆN ĐIỆN THOẠI RÚT GỌN" ngay sau đó), dùng `!important` nếu cần thắng rule gốc — **không sửa trực tiếp rule CSS gốc phía trên** để tránh phá layout desktop/tablet đang hoạt động tốt.
- Bảng dữ liệu (kho, thu chi, lịch sử...) trên mobile nên chuyển sang dạng thẻ (card) xếp dọc thay vì bắt cuộn ngang, theo cách `.member-row` đã làm — đây là hướng ưu tiên hơn `overflow-x: auto`.

## 5. Quy tắc Phân quyền người dùng

- Chỉ có **một** bảng quyền canonical duy nhất trong toàn bộ `app.js` (đặt gần đầu file, khu vực `/*1.PHÂN QUYỀN*/`). **Tuyệt đối không tạo bảng quyền cục bộ thứ hai** bên trong một hàm khác — đây chính là lỗi đã xảy ra trước đây (`HE_THONG_QUYEN` là code chết trong khi `PHAN_QUYEN` định nghĩa lại y hệt bên trong `chonDaiSu()` mới là bản chạy thật) và phải tránh lặp lại.
- Trạng thái người dùng đang đăng nhập lưu trong **một** biến global duy nhất (`currentUser`), không đọc lại tên/vai trò từ DOM (`innerText` của thẻ hiển thị) để suy luận ai đang thao tác.
- Mọi hành động nhạy cảm (xoá dữ liệu, sửa giá, xem báo cáo doanh thu, quản lý nhân sự, thu chi...) **bắt buộc gọi `coQuyen('<permission>')` ở đầu hàm xử lý**, không chỉ ẩn nút trên UI. Ẩn nút là lớp bảo vệ phụ (UX), không phải lớp chặn chính.
- Không hardcode tài khoản/mật khẩu trong mã nguồn (kiểu `admin/123456` từng có trước đây). Tài khoản quản trị phải là tài khoản thật trong hệ thống đăng nhập (Firebase Authentication), không lộ trong source.
- Không hiển thị lại mật khẩu cũ (dù đã hash hay chưa) vào form khi sửa thông tin nhân viên.
- Khi thêm field/permission mới, cập nhật đồng thời: bảng quyền canonical trong `app.js` **và** `database.rules.json` nếu field đó ảnh hưởng tới quyền đọc/ghi dữ liệu trên Firebase.

## 6. Firebase

- Cấu trúc node RTDB chính: `NhanSu` (nhân viên — bắt buộc field `capDo`: `STAFF`/`ADMIN`), `orders`, `kho`, và các node khác được `db.ref(...)` khai báo rải trong `app.js` — **luôn Grep `db.ref(` để xác nhận tên node chính xác** trước khi viết rule hay thêm code mới, không đoán tên.
- `database.rules.json` (khi đã có) là nguồn quyết định bảo mật thật ở tầng server. Không nới rule về `true` cho tiện trong lúc debug rồi quên siết lại.
- Thay đổi Security Rules là thay đổi hạ tầng production — **không tự động chạy `firebase deploy`**, luôn đưa lệnh/rule cho người dùng tự xác nhận và chạy.

## 7. Kiểm thử

- Không có test suite hay CI. Mọi thay đổi phải tự kiểm tra bằng cách mở `index.html` qua local server (VD `npx serve` hoặc Live Server) và test tay:
  - Responsive: DevTools ở các mốc 375px / 414px / 768px / 1024px.
  - Phân quyền: đăng nhập lần lượt các vai trò khác nhau, xác nhận đúng hành vi được phép/bị chặn.
- Theo dõi tab Console/Network của DevTools để phát hiện lỗi Firebase (`permission-denied`, `invalid-api-key`...).

## 8. App mobile mới (`mobile/`)

Ngoại lệ có chủ đích với mục 1/3: người dùng yêu cầu app mobile-first bằng TypeScript + PWA, nên `mobile/` có build tool. App cũ giữ nguyên kiến trúc, hai app **chạy song song trên cùng database** cho tới khi app mới đủ chức năng.

- Stack: Vite + React + TypeScript strict + `vite-plugin-pwa` + Firebase modular SDK. `npm run build` (trong `mobile/`) xuất ra `../m/` (đã gitignore) — Firebase Hosting phục vụ tại `/m/`.
- Tên hàm/biến/file vẫn tiếng Việt không dấu như app cũ (`themMon`, `ChiTietDon.tsx`...).
- **Schema dữ liệu**: `mobile/src/types/duLieu.ts` là "hợp đồng" với app cũ — chỉ được THÊM field tuỳ chọn, không đổi tên/kiểu field mà `app.js` đang đọc/ghi. Node `tables`, `menu`, `kho` là MẢNG ghi theo chỉ số: luôn ghi theo key thật (`veMangCoKey`), không theo vị trí sau khi lọc.
- **Phân quyền**: `mobile/src/quyen/phanQuyen.ts` là bảng quyền duy nhất của app mới, phải giữ GIỐNG HỆT `PERMISSIONS_BY_ROLE` trong `app.js`. Sửa một bên thì sửa cả hai. Mọi hàm trong `mobile/src/services/donHang.ts` gọi `batBuocQuyen` ở dòng đầu.
- **Đăng nhập**: Firebase Auth email/password; email nội bộ = `<username>@pho-tuy.firebaseapp.com`. Node mới `tai_khoan/{uid} = { nhanSuId }` nối Auth với `NhanSu`; `capDo`/`vaiTro` chỉ nằm ở `NhanSu`. Admin cấp tài khoản ở tab Thêm → Tài khoản nhân viên.
- **Nghiệp vụ thuần** (tính tiền, tích điểm, gộp/tách, trừ kho) nằm trong `mobile/src/services/*` không đụng DOM/Firebase, có test Vitest (`npm test`). Sửa logic tiền/điểm phải thêm test.
- **Security Rules**: `database.rules.draft.json` là BẢN NHÁP, cố ý KHÔNG khai báo trong `firebase.json`. Không deploy cho tới khi app cũ cũng đăng nhập bằng Firebase Auth — nếu không app cũ bị `permission-denied` toàn bộ. File này được SINH bởi `mobile/scripts/sinh-rules.mjs` — sửa rule trong script rồi chạy lại, không sửa tay JSON. "Quản lý" trong rule = `capDo` ADMIN hoặc `vaiTro` "Đại sứ Minh Bạch" (khớp `full_control`); đổi bảng quyền thì xem lại script này. Node mới thêm vào app (VD `ChamCong` từng bị sót vì gọi qua `firebase.database().ref`) phải Grep cả hai kiểu `db.ref(` và `firebase.database().ref(`.
- **Kiểm thử trên Emulator** (không đụng dữ liệu thật): ở thư mục gốc chạy `npx firebase-tools@13.35.1 emulators:start --project demo-pho-tuy --config firebase.emulator.json --only auth,database` (bản 13 vì máy có Java 17; bản mới cần Java 21), rồi trong `mobile/`: `node scripts/nap-du-lieu-emulator.mjs` và `VITE_EMULATOR=1 npm run dev`. Tài khoản mẫu: `quanly` (ADMIN) / `thungan` (Thu ngân, STAFF) / `phucvu` / `daubep`, mật khẩu `123456` (chỉ tồn tại trong emulator).
- **Trang gọi món QR của khách** (`mobile/khach.html` → `src/khach/`, chạy tại `/m/khach.html?table=N`): entry Vite RIÊNG, không đăng nhập, không import `firebase/xacThuc` (Auth) hay màn nhân viên để bundle nhẹ. Chỉ đọc `menu`/`tables` và push `pending_qr_orders` đúng định dạng `DonQR` (nghiệp vụ giỏ ở `services/gioHangKhach.ts`, có test). Thay cho `khach.html` cũ ở gốc.
- Trên PC (theme tối) **không dùng `backdrop-filter`** ở khung có chứa lá sớ/hộp thoại: nó làm `position: fixed` bên trong bị nhốt trong khung.
- Khi tự động hoá trình duyệt (Puppeteer) để test: dùng profile tắt trình quản lý mật khẩu — ở chế độ headless, hộp "Lưu mật khẩu?" vô hình sau khi đăng nhập nuốt mọi click/chạm.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
