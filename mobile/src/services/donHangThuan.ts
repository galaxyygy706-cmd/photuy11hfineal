/* Các phép biến đổi đơn hàng THUẦN (không đụng Firebase) — dùng trong runTransaction
   và để viết test. Mỗi hàm nhận mảng cũ, trả mảng MỚI (không sửa tại chỗ). */

import type { DongMon, Mon, NguyenLieu } from '../types/duLieu';
import { RECIPES, soBatCuaMon } from './dinhLuong';

/** RTDB trả mảng thưa thành object -> chuẩn hoá về mảng đặc, bỏ phần tử rỗng. */
export function veMang<T>(val: unknown): T[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter((x): x is T => x != null);
  if (typeof val === 'object') return Object.values(val as Record<string, T>).filter((x) => x != null);
  return [];
}

/** Như veMang nhưng GIỮ KEY gốc — bắt buộc dùng cho node ghi theo chỉ số (tables, menu, kho),
    vì nếu lọc phần tử rỗng rồi ghi theo vị trí mới sẽ ghi nhầm sang phần tử khác. */
export function veMangCoKey<T>(val: unknown): { key: string; giaTri: T }[] {
  if (!val || typeof val !== 'object') return [];
  return Object.entries(val as Record<string, T>)
    .filter(([, v]) => v != null)
    .map(([key, giaTri]) => ({ key, giaTri }));
}

/** Gộp vào dòng cùng món nếu dòng đó chưa gửi bếp và không phải món tặng; ngược lại thêm dòng mới. */
export function themMotMon(items: readonly DongMon[], mon: Mon, now = Date.now()): DongMon[] {
  const idx = items.findIndex((i) => i.id_mon === mon.id && !i.isReward && i.isSent !== true);
  if (idx !== -1) {
    return items.map((i, k) => (k === idx ? { ...i, sl: i.sl + 1 } : i));
  }
  const dong: DongMon = {
    id: now,
    id_mon: mon.id,
    ten: mon.ten,
    gia: Number(mon.gia) || 0,
    sl: 1,
    isSent: false,
    cooked: false,
    loai: mon.loai,
  };
  if (mon.img) dong.img = mon.img;
  if (mon.desc) dong.desc = mon.desc;
  return [...items, dong];
}

/** Giảm 1 đơn vị dòng có id = idDong; hết thì xoá dòng. */
export function botMotMon(items: readonly DongMon[], idDong: number): DongMon[] {
  return items.flatMap((i) => {
    if (i.id !== idDong) return [i];
    return i.sl > 1 ? [{ ...i, sl: i.sl - 1 }] : [];
  });
}

/** Hai dòng có được gộp số lượng không. SỬA BUG app cũ: gộp/tách trước đây gộp dòng
    CHƯA gửi bếp vào dòng ĐÃ gửi -> món mới không bao giờ được gửi xuống bếp. */
function cungLoaiDong(a: DongMon, b: DongMon): boolean {
  return a.id_mon === b.id_mon && !a.isReward && !b.isReward && !!a.isSent === !!b.isSent;
}

export function gopDon(goc: readonly DongMon[], dich: readonly DongMon[]): DongMon[] {
  const ketQua = dich.map((i) => ({ ...i }));
  for (const g of goc) {
    const trung = ketQua.find((d) => cungLoaiDong(d, g));
    if (trung) trung.sl += g.sl;
    else ketQua.push({ ...g });
  }
  return ketQua;
}

/** Chuyển 1 đơn vị của dòng idDong từ đơn gốc sang đơn đích. */
export function tachMotMon(
  goc: readonly DongMon[],
  dich: readonly DongMon[],
  idDong: number,
  now = Date.now(),
): { goc: DongMon[]; dich: DongMon[] } | null {
  const dong = goc.find((i) => i.id === idDong);
  if (!dong) return null;
  const chuyen: DongMon = { ...dong, sl: 1, id: now };
  return { goc: botMotMon(goc, idDong), dich: gopDon([chuyen], dich) };
}

/** Số suất mỗi món "gốc" (tuy_tam / tuy_thuong) bị tiêu thụ — app cũ chỉ đếm soldToday cho 2 món này. */
export function suatTieuThu(items: readonly DongMon[]): Record<string, number> {
  const ketQua: Record<string, number> = {};
  for (const i of items) {
    const b = soBatCuaMon(i.id_mon);
    if (b.tam) ketQua.tuy_tam = (ketQua.tuy_tam ?? 0) + b.tam * i.sl;
    if (b.thuong) ketQua.tuy_thuong = (ketQua.tuy_thuong ?? 0) + b.thuong * i.sl;
  }
  return ketQua;
}

/** Số suất còn bán được của một món, xét cả các món gốc mà nó tiêu thụ (combo).
    SỬA BUG: app cũ kiểm tra hết hàng bằng MENU_MASTER (hằng số trong code, soldToday luôn = 0)
    nên không bao giờ báo hết hàng. Ở đây dùng menu trực tiếp từ Firebase. */
export function suatConLai(menu: readonly Mon[], idMon: string): number {
  const conLaiCua = (id: string) => {
    const m = menu.find((x) => x.id === id);
    if (!m || !m.limit || m.limit <= 0) return Infinity;
    return m.limit - (Number(m.soldToday) || 0);
  };
  const b = soBatCuaMon(idMon);
  let ketQua = conLaiCua(idMon);
  if (idMon !== 'tuy_tam' && b.tam) ketQua = Math.min(ketQua, Math.floor(conLaiCua('tuy_tam') / b.tam));
  if (idMon !== 'tuy_thuong' && b.thuong) ketQua = Math.min(ketQua, Math.floor(conLaiCua('tuy_thuong') / b.thuong));
  return ketQua;
}

/** Trừ kho theo định lượng cho các dòng món mới gửi bếp. Trả mảng kho mới (giữ nguyên vị trí). */
export function truKho(kho: readonly (NguyenLieu | null)[], items: readonly DongMon[]): (NguyenLieu | null)[] {
  const ketQua = kho.map((k) => (k ? { ...k } : k));
  for (const i of items) {
    const congThuc = RECIPES[i.id_mon];
    if (!congThuc) continue;
    for (const [idNL, dinhMuc] of Object.entries(congThuc)) {
      const nl = ketQua.find((k) => k?.id === idNL);
      if (!nl) continue;
      const quyDoi = nl.dvt === 'kg' || nl.dvt === 'lít' ? (dinhMuc * i.sl) / 1000 : dinhMuc * i.sl;
      nl.ton = Number(Math.max(0, (Number(nl.ton) || 0) - quyDoi).toFixed(2));
    }
  }
  return ketQua;
}
