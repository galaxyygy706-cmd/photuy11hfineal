/* NGHIỆP VỤ QUẢN LÝ THUẦN (GĐ 4) — kho, thu chi, báo cáo, hội viên, nhân sự.
   Không đụng Firebase/DOM để test được. Port từ app.js, có ghi chú chỗ sửa lỗi. */

import type { DongMon, LichSuDon, NguyenLieu } from '../types/duLieu';

// ---------------------------------------------------------------- THỜI GIAN

/** Đọc chuỗi thời gian app cũ lưu. App cũ ghi bằng toLocaleString('vi-VN') nên có HAI dạng:
     - "28/4/2026, 09:05:07"  (khi người dùng chọn ngày)
     - "09:05:07 28/4/2026"   (mặc định — ICU đặt giờ trước, không có dấu phẩy)
    SỬA BUG: bộ lọc của app cũ chỉ hiểu dạng 1, nên mọi khoản ghi theo dạng 2 không bao giờ
    hiện trong Hôm nay/Tuần/Tháng/Năm. */
export function docThoiGian(s: unknown): Date | null {
  if (typeof s === 'number') return Number.isFinite(s) ? new Date(s) : null;
  if (typeof s !== 'string' || !s.trim()) return null;
  const ngay = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!ngay) return null;
  const gio = s.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  const d = new Date(Number(ngay[3]), Number(ngay[2]) - 1, Number(ngay[1]),
    gio ? Number(gio[1]) : 0, gio ? Number(gio[2]) : 0, gio?.[3] ? Number(gio[3]) : 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Ghi theo dạng "d/m/yyyy, hh:mm:ss" — dạng mà bộ lọc của app cũ đọc được. */
export function vietThoiGian(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}, ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** yyyy-mm-dd theo giờ máy (khoá ngày của node ChamCong). */
export function khoaNgay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export type Ky = 'hom_nay' | 'tuan' | 'thang' | 'nam' | 'tat_ca';

export const TEN_KY: Record<Ky, string> = {
  hom_nay: 'Hôm nay', tuan: 'Tuần này', thang: 'Tháng này', nam: 'Năm nay', tat_ca: 'Tất cả',
};

/** [bắt đầu, kết thúc) của kỳ chứa `now`. Tuần bắt đầu Thứ Hai. */
export function khoangKy(ky: Ky, now = new Date()): [number, number] {
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  switch (ky) {
    case 'hom_nay': return [new Date(y, m, d).getTime(), new Date(y, m, d + 1).getTime()];
    case 'tuan': {
      const lui = (now.getDay() + 6) % 7;
      return [new Date(y, m, d - lui).getTime(), new Date(y, m, d - lui + 7).getTime()];
    }
    case 'thang': return [new Date(y, m, 1).getTime(), new Date(y, m + 1, 1).getTime()];
    case 'nam': return [new Date(y, 0, 1).getTime(), new Date(y + 1, 0, 1).getTime()];
    default: return [0, Number.MAX_SAFE_INTEGER];
  }
}

// ---------------------------------------------------------------- KHO

export function mucTonKho(nl: Pick<NguyenLieu, 'ton' | 'limit'>): 'het' | 'sap_het' | 'du' {
  const ton = Number(nl.ton) || 0;
  if (ton <= 0) return 'het';
  if (ton <= (Number(nl.limit) || 0)) return 'sap_het';
  return 'du';
}

/** Tồn mới sau nhập (+) / xuất (−). Làm tròn 2 chữ số (app cũ làm tròn 1 chữ số -> nhập 0.25kg bị lệch). */
export function tinhTonMoi(ton: number, thayDoi: number): number {
  return Number(((Number(ton) || 0) + thayDoi).toFixed(2));
}

// ---------------------------------------------------------------- THU CHI

export interface KhoanThuChi {
  loai: 'thu' | 'chi';
  so_tien: number;
  noi_dung: string;
  danh_muc: string;
  phuong_thuc: string;
  thoi_gian: string;
  trang_thai?: string;
  nguoi_tao?: string;
  ghi_chu?: string;
  /** Field MỚI (ms) — app cũ không có, đọc thì ưu tiên field này */
  timestamp?: number;
  lich_su_sua?: { thoi_gian_sua: string; nguoi_sua: string; noi_dung_cu: string; so_tien_cu: number }[];
}

export const DANH_MUC_THU_CHI = ['Doanh thu bán hàng', 'Lương nhân viên', 'Nguyên liệu', 'Chi phí năng lượng', 'Khác'] as const;
export const PHUONG_THUC = ['Tiền mặt', 'Chuyển khoản'] as const;

export function thoiDiemKhoan(k: Pick<KhoanThuChi, 'timestamp' | 'thoi_gian'>): number | null {
  if (k.timestamp) return k.timestamp;
  return docThoiGian(k.thoi_gian)?.getTime() ?? null;
}

export function tongHopThuChi<T extends KhoanThuChi>(
  ds: readonly { key: string; giaTri: T }[],
  ky: Ky,
  now = new Date(),
) {
  const [tu, den] = khoangKy(ky, now);
  const loc = ds
    .map((x) => ({ ...x, luc: thoiDiemKhoan(x.giaTri) }))
    .filter((x) => ky === 'tat_ca' || (x.luc != null && x.luc >= tu && x.luc < den))
    .sort((a, b) => (b.luc ?? 0) - (a.luc ?? 0));
  let thu = 0, chi = 0;
  const theoDanhMuc: Record<string, number> = {};
  for (const { giaTri: k } of loc) {
    const tien = Number(k.so_tien) || 0;
    if (k.loai === 'thu') thu += tien;
    else {
      chi += tien;
      theoDanhMuc[k.danh_muc || 'Khác'] = (theoDanhMuc[k.danh_muc || 'Khác'] ?? 0) + tien;
    }
  }
  return { ds: loc, thu, chi, chenhLech: thu - chi, theoDanhMuc };
}

// ---------------------------------------------------------------- BÁO CÁO DOANH THU

export type LocKhach = 'tat_ca' | 'hoi_vien' | 'vang_lai';

export function tongHopDoanhThu(
  ds: readonly { key: string; giaTri: LichSuDon }[],
  tu: number,
  den: number,
  locKhach: LocKhach = 'tat_ca',
  tuKhoa = '',
) {
  const k = tuKhoa.trim().toLowerCase();
  const khop = (o: LichSuDon) =>
    (locKhach === 'tat_ca' || (locKhach === 'hoi_vien' ? !!o.customerId : !o.customerId)) &&
    (!k || (o.tableName ?? '').toLowerCase().includes(k) || (o.customerName ?? '').toLowerCase().includes(k) ||
      String(o.customerPhone ?? '').includes(k));

  const trongKy = ds.filter(({ giaTri: o }) => (o.timestamp ?? 0) >= tu && (o.timestamp ?? 0) < den && khop(o))
    .sort((a, b) => (b.giaTri.timestamp ?? 0) - (a.giaTri.timestamp ?? 0));

  // Kỳ trước cùng độ dài, liền trước (app cũ chỉ so với "hôm qua" bất kể khoảng chọn dài bao nhiêu)
  const doDai = den - tu;
  const kyTruoc = ds.filter(({ giaTri: o }) => (o.timestamp ?? 0) >= tu - doDai && (o.timestamp ?? 0) < tu && khop(o));

  let tong = 0, hoiVien = 0, vangLai = 0, giamGia = 0;
  const theoGio = new Array<number>(24).fill(0);
  const mon: Record<string, { ten: string; sl: number; tien: number }> = {};
  for (const { giaTri: o } of trongKy) {
    const t = Number(o.total) || 0;
    tong += t;
    giamGia += Number(o.discount) || 0;
    if (o.customerId) hoiVien += t; else vangLai += t;
    theoGio[new Date(o.timestamp).getHours()]! += t;
    for (const i of veMangItems(o.items)) {
      const khoa = i.id_mon || i.ten;
      mon[khoa] ??= { ten: i.ten, sl: 0, tien: 0 };
      mon[khoa].sl += Number(i.sl) || 0;
      mon[khoa].tien += (Number(i.gia) || 0) * (Number(i.sl) || 0);
    }
  }
  const tongTruoc = kyTruoc.reduce((s, { giaTri: o }) => s + (Number(o.total) || 0), 0);
  return {
    ds: trongKy,
    tong,
    soDon: trongKy.length,
    trungBinh: trongKy.length ? Math.round(tong / trongKy.length) : 0,
    hoiVien,
    vangLai,
    giamGia,
    theoGio,
    topMon: Object.values(mon).sort((a, b) => b.sl - a.sl || b.tien - a.tien).slice(0, 8),
    kyTruoc: { tong: tongTruoc, soDon: kyTruoc.length },
  };
}

function veMangItems(items: unknown): DongMon[] {
  if (Array.isArray(items)) return items.filter(Boolean);
  if (items && typeof items === 'object') return Object.values(items as Record<string, DongMon>).filter(Boolean);
  return [];
}

/** % thay đổi so với kỳ trước; null khi kỳ trước = 0 (không có cơ sở so sánh). */
export function phanTramTang(nay: number, truoc: number): number | null {
  if (!truoc) return null;
  return Math.round(((nay - truoc) / truoc) * 1000) / 10;
}

// ---------------------------------------------------------------- HỘI VIÊN

/** tuDongCapNhatHangKhachHang ở app cũ (app.js:3290). */
export function xepHangHoiVien(tongChiTieu: number, soLanDen: number): 'VIP' | 'ACTIVE' | 'NEW' {
  if (tongChiTieu >= 5_000_000 || soLanDen >= 15) return 'VIP';
  if (soLanDen >= 2) return 'ACTIVE';
  return 'NEW';
}

export function chuanHoaSdt(s: string): string {
  return s.replace(/[^\d+]/g, '');
}

/** Viết hoa chữ cái đầu mỗi từ (chuanHoaTen ở app cũ). */
export function chuanHoaTen(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase().replace(/(^|\s)(\S)/gu, (_, a: string, b: string) => a + b.toUpperCase());
}

// ---------------------------------------------------------------- NHÂN SỰ

export const VAI_TRO = ['Đại sứ Hương Vị', 'Đại sứ Ngoại Giao', 'Đại sứ Minh Bạch', 'Đại sứ Đón Tiếp', 'Đại sứ Sạch Sẽ'] as const;

/** capNhatViTriTuDong ở app cũ (app.js:8665) */
export const VI_TRI_THEO_VAI_TRO: Record<string, readonly string[]> = {
  'Đại sứ Hương Vị': ['Bếp trưởng', 'Bếp phó'],
  'Đại sứ Ngoại Giao': ['Phục vụ 1', 'Phục vụ 2'],
  'Đại sứ Minh Bạch': ['Thu ngân'],
  'Đại sứ Đón Tiếp': ['Bảo an'],
  'Đại sứ Sạch Sẽ': ['Vệ sinh'],
};

/** BANG_LUONG ở app cũ (app.js:53) — lương tháng gợi ý theo vị trí */
export const BANG_LUONG: Record<string, number> = {
  'Bếp trưởng': 12_000_000, 'Bếp phó': 8_000_000, 'Phục vụ 1': 7_500_000, 'Phục vụ 2': 7_500_000,
  'Thu ngân': 7_500_000, 'Bảo an': 6_500_000, 'Vệ sinh': 6_500_000,
};

export const CA_LAM = ['05:00 - 12:00', '17:00 - 00:00'] as const;

/** Lương giờ = lương tháng / 26 ngày / 8 giờ (themNhanSuMoi ở app cũ). */
export function luongGio(luongThang: number): number {
  return Math.round((Number(luongThang) || 0) / 26 / 8);
}

/** Số phút làm của một ca "HH:mm" -> "HH:mm". Ca qua nửa đêm (17:00 -> 00:30) được cộng 24h. */
export function soPhutCa(gioVao?: string, gioRa?: string): number | null {
  const doc = (s?: string) => {
    const m = s?.match(/^(\d{1,2}):(\d{2})$/);
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  };
  const v = doc(gioVao), r = doc(gioRa);
  if (v == null || r == null) return null;
  return r >= v ? r - v : r + 1440 - v;
}

export function hienGioPhut(phut: number): string {
  const h = Math.floor(phut / 60), m = phut % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** Dòng CSV có BOM để Excel đọc đúng tiếng Việt. */
export function taoCSV(dong: readonly (readonly (string | number)[])[]): string {
  const o = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + dong.map((d) => d.map(o).join(',')).join('\r\n');
}
