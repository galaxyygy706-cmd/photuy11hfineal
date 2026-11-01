/* GIỎ HÀNG CỦA KHÁCH (trang gọi món QR) — nghiệp vụ thuần, không đụng DOM/Firebase.
   Thay cho biến gioHang + themMon/xoaMon/guiDonHang trong khach.html cũ.
   Đơn gửi lên `pending_qr_orders` giữ ĐÚNG định dạng cũ (DonQR) để màn duyệt đơn (gopDonQR) đọc được. */

import { soBatCuaMon } from './dinhLuong';
import { suatConLai } from './donHangThuan';
import { tinhTien, type KetQuaTinhTien } from './tinhTien';
import type { DonQR, Mon, MonDonQR } from '../types/duLieu';

/** Một dòng trong giỏ. `ma` là khoá React (mỗi lần thêm dòng mới tăng dần), không gửi lên server. */
export interface DongGio {
  ma: number;
  idMon: string;
  sl: number;
  note: string;
}

/** Thêm 1 suất: cộng vào dòng cùng món CHƯA có ghi chú; nếu dòng đó đã ghi chú thì mở dòng mới
    (để mỗi bát có thể dặn riêng, VD "ít hành" chỉ cho 1 bát). */
export function themVaoGio(gio: readonly DongGio[], idMon: string, ma = Date.now()): DongGio[] {
  const idx = gio.findIndex((d) => d.idMon === idMon && d.note.trim() === '');
  if (idx !== -1) return gio.map((d, i) => (i === idx ? { ...d, sl: d.sl + 1 } : d));
  return [...gio, { ma, idMon, sl: 1, note: '' }];
}

/** Đổi số lượng một dòng; về 0 thì bỏ dòng. */
export function doiSoLuong(gio: readonly DongGio[], ma: number, delta: number): DongGio[] {
  return gio
    .map((d) => (d.ma === ma ? { ...d, sl: d.sl + delta } : d))
    .filter((d) => d.sl > 0);
}

export function suaGhiChu(gio: readonly DongGio[], ma: number, note: string): DongGio[] {
  return gio.map((d) => (d.ma === ma ? { ...d, note } : d));
}

export function demMon(gio: readonly DongGio[]): number {
  return gio.reduce((s, d) => s + d.sl, 0);
}

/** Giá luôn lấy từ thực đơn hiện tại (món đã bị xoá khỏi menu tính 0đ và bị loại khi gửi). */
export function tinhTienGio(gio: readonly DongGio[], menu: readonly Mon[]): KetQuaTinhTien {
  return tinhTien(
    gio.map((d) => ({ gia: Number(menu.find((m) => m.id === d.idMon)?.gia) || 0, sl: d.sl })),
    0,
  );
}

/** Số suất còn có thể THÊM vào giỏ cho món này, đã trừ những bát khách đang để trong giỏ
    (combo ăn vào suất Túy Tâm/Túy Thượng). Infinity = không giới hạn. */
export function conThemDuoc(menu: readonly Mon[], gio: readonly DongGio[], idMon: string): number {
  const daGiu: Record<string, number> = {};
  for (const d of gio) {
    const b = soBatCuaMon(d.idMon);
    if (b.tam) daGiu.tuy_tam = (daGiu.tuy_tam ?? 0) + b.tam * d.sl;
    if (b.thuong) daGiu.tuy_thuong = (daGiu.tuy_thuong ?? 0) + b.thuong * d.sl;
    // Món không ăn vào suất phở nhưng tự có giới hạn riêng
    if (!b.tam && !b.thuong) daGiu[d.idMon] = (daGiu[d.idMon] ?? 0) + d.sl;
  }
  const menuAo = menu.map((m) => {
    const giu = daGiu[m.id];
    return giu ? { ...m, soldToday: (Number(m.soldToday) || 0) + giu } : m;
  });
  return Math.max(0, suatConLai(menuAo, idMon));
}

/** Tạo bản ghi cho `pending_qr_orders`. Bỏ dòng có món không còn trong menu.
    Không để giá trị `undefined` (Firebase từ chối ghi). */
export function taoDonQR(gio: readonly DongGio[], menu: readonly Mon[], tableId: string | number, now = Date.now()): DonQR {
  const items: MonDonQR[] = [];
  for (const d of gio) {
    const mon = menu.find((m) => m.id === d.idMon);
    if (!mon || d.sl <= 0) continue;
    items.push({ id: mon.id, ten: mon.ten, gia: Number(mon.gia) || 0, sl: d.sl, note: d.note.trim(), desc: mon.desc ?? '' });
  }
  return { tableId: String(tableId), items, timestamp: now, status: 'waiting' };
}

/* ---- Nội dung hiển thị (giữ nguyên lời văn của khach.html cũ, getMoTa) ---- */

const SIEU_PHAM = ['Túy Thượng', 'Tiềm Thủy', 'Song Long Hội Tụ'];
export const laSieuPham = (mon: Mon): boolean => SIEU_PHAM.some((v) => mon.ten.includes(v));

/** tenLoai: chú thích nhỏ cạnh tên; chayChu: dòng chữ chạy; moTaTinh: dòng mô tả đứng yên. */
export function moTaMon(mon: Mon): { tenLoai?: string; chayChu?: string; moTaTinh?: string } {
  const t = mon.ten;
  if (t.includes('Túy Tâm') && mon.loai !== 'combo')
    return { tenLoai: 'Phở thường', chayChu: 'Nước dùng thanh ngọt, thịt bò tươi thơm ngon, đậm đà vị truyền thống ✨' };
  if (t.includes('Túy Thượng') && mon.loai !== 'combo')
    return { tenLoai: 'Phở đặc biệt', chayChu: 'Thưởng thức tinh túy từ phần thịt lõi rùa quý hiếm, mềm tan trong thực quản 💎' };
  if (t.includes('Hỏa Châu')) return { tenLoai: 'Trứng chần', chayChu: 'Trứng gà tươi chần trong nước dùng thanh ngọt ✨' };
  if (t.includes('Tiềm Thủy')) return { tenLoai: 'Trứng hấp', chayChu: 'Ngâm trong cốt sá sùng quý giá, hấp cách thủy tinh hoa 🥚' };
  if (t.includes('Quẩy')) return { moTaTinh: 'Giòn rụm, thơm ngon (4 cái)' };
  if (mon.loai === 'combo') {
    const slogan = t.includes('Thượng') ? 'Bậc quân tử thưởng thức tinh hoa ✨'
      : t.includes('Tâm') ? 'Năng lượng cho ngày mới ☀️' : 'Chiêu đãi bậc Đế Vương 👑';
    return { moTaTinh: mon.desc || undefined, chayChu: slogan };
  }
  return { moTaTinh: mon.desc || undefined };
}

/** Thanh "Suất bán ngày" — ngưỡng sắp hết giữ như app cũ: Túy Tâm ≤25, Túy Thượng ≤15. */
export function mucSuat(idMon: string, conLai: number): 'du' | 'sap_het' | 'het' {
  if (conLai <= 0) return 'het';
  return conLai <= (idMon === 'tuy_tam' ? 25 : 15) ? 'sap_het' : 'du';
}
