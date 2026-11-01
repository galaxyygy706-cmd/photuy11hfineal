// Nạp dữ liệu mẫu vào Firebase Emulator (KHÔNG BAO GIỜ chạy vào project thật — URL cố định 127.0.0.1).
// Tạo: 13 bàn, thực đơn, kho, 2 hội viên, lịch sử đơn/thu chi/chấm công mẫu, 4 nhân sự + tài khoản:
//   quanly (ADMIN) · thungan (Đại sứ Minh Bạch, STAFF) · phucvu (Ngoại Giao) · daubep (Hương Vị) — mật khẩu 123456
// Cách dùng: node scripts/nap-du-lieu-emulator.mjs

const DB = 'http://127.0.0.1:9000';
const NS = 'demo-pho-tuy-default-rtdb';
const PROJECT = 'demo-pho-tuy';
const AUTH = 'http://127.0.0.1:9099';

const ban = [
  ...Array.from({ length: 8 }, (_, i) => ({ id: i + 1, name: `Bàn ${i + 1}`, status: 'empty', type: 'table' })),
  ...Array.from({ length: 5 }, (_, i) => ({ id: i + 9, name: `Bar ${i + 1}`, status: 'empty', type: 'bar' })),
];
const menu = [
  { id: 'tuy_tam', ten: 'Túy Tâm', gia: 50000, loai: 'don', desc: 'Phở Thường', soldToday: 0, limit: 100, img: '' },
  { id: 'tuy_thuong', ten: 'Túy Thượng', gia: 80000, loai: 'don', desc: 'Phở Đặc Biệt', soldToday: 0, limit: 50, img: '' },
  { id: 'hoa_chau', ten: 'Túy Long Hỏa Châu', gia: 10000, loai: 'don', desc: 'Trứng Chần', soldToday: 0, limit: 30, img: '' },
  { id: 'tiem_thuy', ten: 'Túy Long Tiềm Thủy', gia: 20000, loai: 'don', desc: 'Trứng Hấp', soldToday: 0, limit: 30, img: '' },
  { id: 'quay', ten: 'Quẩy', gia: 10000, loai: 'don', desc: '4 chiếc', soldToday: 0, limit: 200, img: '' },
  { id: 'combo_thuong_thuy', ten: 'Combo Thượng Thủy', gia: 89000, loai: 'combo', desc: 'Túy Thượng + Tiềm Thủy', soldToday: 0, limit: 20, img: '' },
  { id: 'combo_tam_chau', ten: 'Combo Tâm Châu', gia: 55000, loai: 'combo', desc: 'Túy Tâm + Hỏa Châu', soldToday: 0, limit: 25, img: '' },
  { id: 'combo_song_long', ten: 'Combo Song Long Hội Tụ', gia: 175000, loai: 'combo', desc: '2 Túy Thượng + 2 Tiềm Thủy + quẩy', soldToday: 0, limit: 10, img: '' },
];
const kho = [
  { id: 'thit_bo', ten: '🥩 Thịt bò', ton: 10, limit: 5, dvt: 'kg', loai: 'chinh' },
  { id: 'banh_pho', ten: '🍜 Bánh phở', ton: 20, limit: 5, dvt: 'kg', loai: 'chinh' },
  { id: 'nuoc_dung', ten: '🍲 Nước dùng', ton: 50, limit: 10, dvt: 'lít', loai: 'chinh' },
  { id: 'trung', ten: '🥚 Trứng', ton: 100, limit: 20, dvt: 'quả', loai: 'phu' },
  { id: 'quay', ten: '🥖 Quẩy', ton: 200, limit: 30, dvt: 'cái', loai: 'phu' },
];
const nhanSu = {
  NV_QUANLY: { id: 'NV_QUANLY', ten: 'Chị Quản Lý', username: 'quanly', capDo: 'ADMIN', vaiTro: 'Đại sứ Minh Bạch', ca: 'Cả ngày' },
  NV_PHUCVU: { id: 'NV_PHUCVU', ten: 'Anh Phục Vụ', username: 'phucvu', capDo: 'STAFF', vaiTro: 'Đại sứ Ngoại Giao', ca: 'Sáng' },
  NV_DAUBEP: { id: 'NV_DAUBEP', ten: 'Chú Đầu Bếp', username: 'daubep', capDo: 'STAFF', vaiTro: 'Đại sứ Hương Vị', ca: 'Sáng', viTri: 'Bếp trưởng', luongCoBan: 12000000 },
  NV_THUNGAN: { id: 'NV_THUNGAN', ten: 'Cô Thu Ngân', username: 'thungan', capDo: 'STAFF', vaiTro: 'Đại sứ Minh Bạch', ca: 'Sáng', viTri: 'Thu ngân', luongCoBan: 7500000 },
};
const members = {
  HV1: { ten: 'Nguyễn Văn An', sdt: '0901111111', tuy_tam_count: 4, tuy_thuong_count: 0, joinedDate: '01/10/2026' },
  HV2: { ten: 'Trần Thị Bình', sdt: '0902222222', tuy_tam_count: 2, tuy_thuong_count: 8, joinedDate: '01/09/2026', rank: 'VIP' },
};

// ---- Dữ liệu GĐ 4: lịch sử đơn (hôm nay + hôm qua), thu chi (cả 2 định dạng thời gian của app cũ), chấm công
const now = new Date();
const luc = (luiNgay, gio, phut = 0) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - luiNgay, gio, phut).getTime();
const mon = (id_mon, ten, gia, sl) => ({ id: Math.random(), id_mon, ten, gia, sl, isSent: true });
const don = (t, total, extra) => ({ customerName: 'Khách vãng lai', customerPhone: '', tableName: 'Bàn 2', subTotal: total, discount: 0, total, totalBowls: 1, timestamp: t, ...extra });
const history_orders = {
  D1: don(luc(0, 7, 10), 102000, { items: [mon('tuy_tam', 'Túy Tâm', 50000, 2)], customerId: 'HV1', customerName: 'Nguyễn Văn An', customerPhone: '0901111111', totalBowls: 2 }),
  D2: don(luc(0, 8, 30), 81600, { items: [mon('tuy_thuong', 'Túy Thượng', 80000, 1)], tableName: 'Bar 1' }),
  D3: don(luc(0, 8, 45), 178500, { items: [mon('combo_song_long', 'Combo Song Long Hội Tụ', 175000, 1)], totalBowls: 2 }),
  D4: don(luc(1, 19, 0), 51000, { items: [mon('tuy_tam', 'Túy Tâm', 50000, 1)] }),
};
const p2 = (n) => String(n).padStart(2, '0');
const dangMacDinh = (t) => { const d = new Date(t); return `${p2(d.getHours())}:${p2(d.getMinutes())}:00 ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`; };
const dangChonNgay = (t) => { const d = new Date(t); return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}, ${p2(d.getHours())}:${p2(d.getMinutes())}:00`; };
const thu_chi = {
  // Dạng mặc định "hh:mm:ss d/m/yyyy" — app cũ KHÔNG lọc ra được ở mục Hôm nay
  TC1: { loai: 'chi', so_tien: 1500000, noi_dung: 'Mua thịt bò', danh_muc: 'Nguyên liệu', phuong_thuc: 'Tiền mặt', thoi_gian: dangMacDinh(luc(0, 6)), trang_thai: 'Đã duyệt', nguoi_tao: 'Nguyễn Kim Anh' },
  TC2: { loai: 'thu', so_tien: 3000000, noi_dung: 'Doanh thu ca sáng', danh_muc: 'Doanh thu bán hàng', phuong_thuc: 'Chuyển khoản', thoi_gian: dangChonNgay(luc(0, 12)), trang_thai: 'Đã duyệt', nguoi_tao: 'Nguyễn Kim Anh' },
  TC3: { loai: 'chi', so_tien: 400000, noi_dung: 'Tiền gas', danh_muc: 'Chi phí năng lượng', phuong_thuc: 'Tiền mặt', thoi_gian: dangChonNgay(luc(40, 9)), trang_thai: 'Đã duyệt', nguoi_tao: 'Nguyễn Kim Anh' },
};
const khoaNgay = (t) => { const d = new Date(t); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; };
const ChamCong = {
  [khoaNgay(luc(1, 0))]: {
    NV_PHUCVU: { C1: { ten: 'Anh Phục Vụ', gioVao: '05:00', gioRa: '12:30', timestamp: luc(1, 5) } },
    NV_DAUBEP: { C2: { ten: 'Chú Đầu Bếp', gioVao: '17:00', gioRa: '00:15', timestamp: luc(1, 17) } }, // ca qua nửa đêm
  },
};

async function goi(url, opts) {
  const r = await fetch(url, opts);
  const t = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${url}: ${t}`);
  return t ? JSON.parse(t) : null;
}

// Xoá sạch tài khoản cũ trong Auth emulator rồi tạo lại
await goi(`${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
const taiKhoan = {};
for (const [key, ns] of Object.entries(nhanSu)) {
  const kq = await goi(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `${ns.username}@pho-tuy.firebaseapp.com`, password: '123456' }),
  });
  taiKhoan[kq.localId] = { nhanSuId: key };
}

// "Bearer owner" = quyền quản trị của emulator, bỏ qua Security Rules khi nạp dữ liệu
await goi(`${DB}/.json?ns=${NS}`, {
  method: 'PUT',
  headers: { Authorization: 'Bearer owner' },
  body: JSON.stringify({ tables: ban, menu, kho, NhanSu: nhanSu, members, tai_khoan: taiKhoan, history_orders, thu_chi, ChamCong }),
});
console.log('Đã nạp dữ liệu mẫu. Đăng nhập: quanly / thungan / phucvu / daubep, mật khẩu 123456');
