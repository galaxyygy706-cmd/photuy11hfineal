/* THAO TÁC FIREBASE CHO GĐ 4 — kho, thu chi, hội viên, nhân sự, chấm công.
   Mọi hàm kiểm tra quyền ở dòng đầu. Ghi đúng schema app cũ, chỉ THÊM field tuỳ chọn
   (timestamp, nguoi_*), để app cũ vẫn đọc được. */

import { get, push, ref, remove, runTransaction, update } from 'firebase/database';
import { db } from '../firebase/khoiTao';
import { batBuocQuyen, coQuyen, LoiKhongCoQuyen, type NguoiDung } from '../quyen/phanQuyen';
import type { HoiVien, NguyenLieu, NhanSu, TaiKhoan } from '../types/duLieu';
import { taoTaiKhoanChoNhanSu } from './taiKhoan';
import {
  chuanHoaSdt, chuanHoaTen, khoaNgay, luongGio, tinhTonMoi, vietThoiGian, xepHangHoiVien, type KhoanThuChi,
} from './quanLyThuan';
import { veMangCoKey } from './donHangThuan';

// ---------------------------------------------------------------- KHO

/** Nhập (+) hoặc xuất (−) kho, ghi nhật ký lich_su_kho (capNhatKho ở app cũ). */
export async function nhapXuatKho(user: NguoiDung | null, key: string, thayDoi: number): Promise<number> {
  batBuocQuyen(user, 'manage_stock');
  if (!Number.isFinite(thayDoi) || thayDoi === 0) throw new Error('Số lượng không hợp lệ.');
  let nl: NguyenLieu | null = null;
  let tonMoi = 0;
  const kq = await runTransaction(ref(db, `kho/${key}`), (cu: NguyenLieu | null) => {
    if (cu === null) return cu;
    nl = cu;
    tonMoi = tinhTonMoi(cu.ton, thayDoi);
    if (tonMoi < 0) return undefined; // huỷ: không đủ tồn để xuất
    return { ...cu, ton: tonMoi };
  });
  const daDoc = nl as NguyenLieu | null;
  if (!daDoc) throw new Error('Không tìm thấy nguyên liệu.');
  if (!kq.committed) throw new Error(`Không đủ tồn để xuất (còn ${daDoc.ton} ${daDoc.dvt}).`);
  const now = new Date();
  await push(ref(db, 'lich_su_kho'), {
    thoi_gian: vietThoiGian(now),
    timestamp: now.getTime(),
    ten_sp: daDoc.ten,
    hanh_dong: thayDoi > 0 ? 'Nhập kho' : 'Xuất kho',
    so_luong: Math.abs(thayDoi),
    dvt: daDoc.dvt,
    ton_moi: tonMoi,
    // App cũ ghi cố định "Nguyễn Kim Anh" cho mọi người
    nguoi_thuc_hien: user.ten,
  });
  return tonMoi;
}

export async function datDinhMuc(user: NguoiDung | null, key: string, dinhMuc: number): Promise<void> {
  batBuocQuyen(user, 'manage_stock');
  if (!Number.isFinite(dinhMuc) || dinhMuc < 0) throw new Error('Định mức không hợp lệ.');
  await update(ref(db, `kho/${key}`), { limit: dinhMuc });
}

export async function xoaLichSuKho(user: NguoiDung | null): Promise<void> {
  batBuocQuyen(user, 'full_control');
  await remove(ref(db, 'lich_su_kho'));
}

// ---------------------------------------------------------------- THU CHI

export interface DuLieuThuChi {
  loai: 'thu' | 'chi';
  so_tien: number;
  noi_dung: string;
  danh_muc: string;
  phuong_thuc: string;
  /** yyyy-mm-dd; trống = hôm nay */
  ngay?: string;
}

function kiemTraThuChi(d: DuLieuThuChi) {
  if (!(d.so_tien > 0)) throw new Error('Nhập số tiền lớn hơn 0.');
  if (!d.noi_dung.trim()) throw new Error('Nhập nội dung khoản thu/chi.');
}

/** Ngày chọn + giờ hiện tại (giống app cũ). */
function thoiDiemTuNgay(ngay?: string): Date {
  const now = new Date();
  if (!ngay) return now;
  const [y, m, d] = ngay.split('-').map(Number);
  return new Date(y!, m! - 1, d!, now.getHours(), now.getMinutes(), now.getSeconds());
}

export async function themThuChi(user: NguoiDung | null, d: DuLieuThuChi): Promise<void> {
  // App cũ: thêm/sửa không kiểm tra quyền, chỉ xoá có
  batBuocQuyen(user, 'manage_expense');
  kiemTraThuChi(d);
  const luc = thoiDiemTuNgay(d.ngay);
  const khoan: KhoanThuChi = {
    loai: d.loai, so_tien: d.so_tien, noi_dung: d.noi_dung.trim(), danh_muc: d.danh_muc, phuong_thuc: d.phuong_thuc,
    thoi_gian: vietThoiGian(luc), timestamp: luc.getTime(), trang_thai: 'Đã duyệt', nguoi_tao: user.ten,
  };
  await push(ref(db, 'thu_chi'), khoan);
}

export async function suaThuChi(user: NguoiDung | null, key: string, d: DuLieuThuChi): Promise<void> {
  batBuocQuyen(user, 'manage_expense');
  kiemTraThuChi(d);
  await runTransaction(ref(db, `thu_chi/${key}`), (cu: KhoanThuChi | null) => {
    if (cu === null) return cu;
    const lichSu = [...(cu.lich_su_sua ?? []), {
      thoi_gian_sua: vietThoiGian(new Date()), nguoi_sua: user.ten, noi_dung_cu: cu.noi_dung, so_tien_cu: cu.so_tien,
    }];
    const moi: KhoanThuChi = {
      ...cu, loai: d.loai, so_tien: d.so_tien, noi_dung: d.noi_dung.trim(), danh_muc: d.danh_muc,
      phuong_thuc: d.phuong_thuc, lich_su_sua: lichSu,
    };
    if (d.ngay) {
      const luc = thoiDiemTuNgay(d.ngay);
      moi.thoi_gian = vietThoiGian(luc);
      moi.timestamp = luc.getTime();
    }
    return moi;
  });
}

export async function xoaThuChi(user: NguoiDung | null, key: string): Promise<void> {
  batBuocQuyen(user, 'manage_expense');
  await remove(ref(db, `thu_chi/${key}`));
}

// ---------------------------------------------------------------- HỘI VIÊN

export interface DuLieuHoiVien { ten: string; sdt: string; ngaysinh?: string; sothich?: string }

/** Thêm (id = null) hoặc sửa hội viên. Phục vụ được THÊM khách mới ngay tại bàn; sửa cần manage_member. */
export async function luuHoiVien(user: NguoiDung | null, id: string | null, d: DuLieuHoiVien): Promise<string> {
  if (id) batBuocQuyen(user, 'manage_member');
  else if (!coQuyen(user, 'manage_member') && !coQuyen(user, 'order')) throw new LoiKhongCoQuyen('manage_member');
  const ten = chuanHoaTen(d.ten);
  const sdt = chuanHoaSdt(d.sdt);
  if (!ten) throw new Error('Nhập tên hội viên.');
  if (sdt.replace('+', '').length < 9) throw new Error('Số điện thoại chưa đúng.');

  const tatCa = ((await get(ref(db, 'members'))).val() ?? {}) as Record<string, HoiVien>;
  const trung = Object.entries(tatCa).find(([k, v]) => k !== id && chuanHoaSdt(String(v?.sdt ?? '')) === sdt);
  if (trung) throw new Error(`Số ${sdt} đã thuộc hội viên ${trung[1].ten}.`);

  const duLieu = { ten, sdt, ngaysinh: d.ngaysinh ?? '', sothich: d.sothich ?? '' };
  if (id) {
    await update(ref(db, `members/${id}`), duLieu);
    return id;
  }
  const n = new Date();
  const moi = await push(ref(db, 'members'), {
    ...duLieu,
    joinedDate: `${String(n.getDate()).padStart(2, '0')}/${String(n.getMonth() + 1).padStart(2, '0')}/${n.getFullYear()}`,
    tuy_tam_count: 0, tuy_thuong_count: 0, diem_tich_luy: 0, rank: 'NEW',
  });
  return moi.key!;
}

export async function xoaHoiVien(user: NguoiDung | null, id: string): Promise<void> {
  batBuocQuyen(user, 'manage_member');
  await remove(ref(db, `members/${id}`));
}

/** Xếp lại hạng mọi hội viên theo history_orders (tuDongCapNhatHangKhachHang). Trả về số người đổi hạng. */
export async function capNhatHangHoiVien(user: NguoiDung | null): Promise<number> {
  batBuocQuyen(user, 'manage_member');
  const [mSnap, oSnap] = await Promise.all([get(ref(db, 'members')), get(ref(db, 'history_orders'))]);
  const members = (mSnap.val() ?? {}) as Record<string, HoiVien>;
  const thongKe: Record<string, { tien: number; lan: number }> = {};
  for (const o of Object.values((oSnap.val() ?? {}) as Record<string, { customerId?: string; total?: number }>)) {
    if (!o?.customerId) continue;
    thongKe[o.customerId] ??= { tien: 0, lan: 0 };
    thongKe[o.customerId]!.tien += Number(o.total) || 0;
    thongKe[o.customerId]!.lan += 1;
  }
  const capNhat: Record<string, string> = {};
  for (const [id, v] of Object.entries(members)) {
    if (!v) continue;
    const t = thongKe[id] ?? { tien: 0, lan: 0 };
    const hang = xepHangHoiVien(t.tien, t.lan);
    if (v.rank !== hang) capNhat[`members/${id}/rank`] = hang;
  }
  if (Object.keys(capNhat).length) await update(ref(db), capNhat);
  return Object.keys(capNhat).length;
}

// ---------------------------------------------------------------- NHÂN SỰ

export interface DuLieuNhanSu {
  ten: string; sdt: string; ngaySinh: string; cccd: string; diachi: string;
  username: string; capDo: 'ADMIN' | 'STAFF'; vaiTro: string; ca: string; viTri: string; luongCoBan: number;
  /** Chỉ khi thêm mới: tạo luôn tài khoản đăng nhập (Firebase Auth). Không lưu vào NhanSu. */
  matKhau?: string;
}

/** Thêm (id = null) / sửa hồ sơ nhân sự (themNhanSuMoi). KHÔNG ghi field `password` dạng chữ thường. */
export async function luuNhanSu(user: NguoiDung | null, id: string | null, d: DuLieuNhanSu): Promise<string> {
  batBuocQuyen(user, 'manage_staff');
  const ten = chuanHoaTen(d.ten);
  const username = d.username.trim().toLowerCase();
  if (!ten || !username) throw new Error('Nhập ít nhất Tên và Tên đăng nhập.');
  if (!/^[a-z0-9._-]{3,}$/.test(username)) throw new Error('Tên đăng nhập chỉ gồm chữ không dấu, số, dấu . _ - (tối thiểu 3 ký tự).');
  if (!id && (d.matKhau ?? '').length < 6) throw new Error('Đặt mật khẩu tối thiểu 6 ký tự cho nhân sự mới.');
  if (id === user.nhanSuId && d.capDo !== 'ADMIN' && user.capDo === 'ADMIN') {
    throw new Error('Không tự hạ quyền ADMIN của chính mình.');
  }

  const tatCa = ((await get(ref(db, 'NhanSu'))).val() ?? {}) as Record<string, NhanSu>;
  const trung = Object.entries(tatCa).find(([k, v]) => k !== id && String(v?.username ?? '').trim().toLowerCase() === username);
  if (trung) throw new Error(`Tên đăng nhập "${username}" đã dùng cho ${trung[1].ten}.`);
  if (id && String(tatCa[id]?.username ?? '').trim().toLowerCase() !== username) {
    // Email đăng nhập Firebase Auth suy ra từ username; client không đổi được email của người khác
    const tk = ((await get(ref(db, 'tai_khoan'))).val() ?? {}) as Record<string, TaiKhoan>;
    if (Object.values(tk).some((t) => t?.nhanSuId === id)) {
      throw new Error('Nhân viên này đã có tài khoản app mới — không đổi được tên đăng nhập. Xoá hồ sơ và tạo lại nếu cần.');
    }
  }

  const nsId = id ?? `nv_${Date.now()}`;
  const hoSo: Record<string, unknown> = {
    id: nsId, ten, sdt: d.sdt.trim(), ngaySinh: d.ngaySinh, cccd: d.cccd.trim(), diachi: d.diachi.trim(),
    username, capDo: d.capDo, vaiTro: d.vaiTro, ca: d.ca, viTri: d.viTri,
    luongCoBan: d.luongCoBan, luong: luongGio(d.luongCoBan), updatedAt: Date.now(),
  };
  if (!id) Object.assign(hoSo, { createdAt: Date.now(), danhGia: 100, lastCheckInDate: 'chưa có', daVaoCa: false, daTanCa: false, isOnline: false });
  await update(ref(db, `NhanSu/${nsId}`), hoSo);

  if (!id && d.matKhau) {
    try {
      await taoTaiKhoanChoNhanSu(user, { ...(hoSo as unknown as NhanSu), key: nsId }, d.matKhau);
    } catch (e) {
      throw new Error(`Đã lưu hồ sơ nhưng CHƯA tạo được tài khoản đăng nhập: ${(e as Error).message} — cấp lại ở mục Tài khoản nhân viên.`);
    }
  }
  return nsId;
}

/** Xoá hồ sơ + gỡ liên kết đăng nhập (tài khoản Auth còn đó nhưng đăng nhập sẽ báo "chưa liên kết"). */
export async function xoaNhanSu(user: NguoiDung | null, id: string): Promise<void> {
  batBuocQuyen(user, 'manage_staff');
  if (id === user.nhanSuId) throw new Error('Không thể tự xoá hồ sơ của chính mình.');
  const tk = ((await get(ref(db, 'tai_khoan'))).val() ?? {}) as Record<string, TaiKhoan>;
  const capNhat: Record<string, null> = { [`NhanSu/${id}`]: null };
  for (const [uid, v] of Object.entries(tk)) if (v?.nhanSuId === id) capNhat[`tai_khoan/${uid}`] = null;
  await update(ref(db), capNhat);
}

// ---------------------------------------------------------------- CHẤM CÔNG

export interface CaLam { ten: string; gioVao: string; gioRa: string; timestamp: number; timestampRa?: number }

/** Vào ca / tan ca (chamCong ở app cũ). Tự chấm cho mình; chấm hộ người khác cần manage_staff.
    SỬA BUG app cũ: tan ca tìm ca đang mở theo NGÀY VÀO CA (lastCheckInDate), không theo hôm nay —
    ca tối 17:00–00:00 tan sau nửa đêm không còn báo "Không tìm thấy ca đang làm". */
export async function chamCong(user: NguoiDung | null, nhanSuId: string, hanhDong: 'vao' | 'ra'): Promise<string> {
  if (!user) throw new LoiKhongCoQuyen('manage_staff');
  if (nhanSuId !== user.nhanSuId) batBuocQuyen(user, 'manage_staff');
  const ns = (await get(ref(db, `NhanSu/${nhanSuId}`))).val() as (NhanSu & { lastCheckInDate?: string; daVaoCa?: boolean; daTanCa?: boolean }) | null;
  if (!ns) throw new Error('Không tìm thấy hồ sơ nhân sự.');
  const now = new Date();
  const gio = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  if (hanhDong === 'vao') {
    if (ns.daVaoCa && !ns.daTanCa) throw new Error(`${ns.ten} đang trong ca — tan ca trước khi vào ca mới.`);
    const ngay = khoaNgay(now);
    const caKey = push(ref(db, `ChamCong/${ngay}/${nhanSuId}`)).key;
    await update(ref(db), {
      [`ChamCong/${ngay}/${nhanSuId}/${caKey}`]: { ten: ns.ten, gioVao: gio, gioRa: '', timestamp: now.getTime() } satisfies CaLam,
      [`NhanSu/${nhanSuId}/daVaoCa`]: true,
      [`NhanSu/${nhanSuId}/daTanCa`]: false,
      [`NhanSu/${nhanSuId}/isOnline`]: true,
      [`NhanSu/${nhanSuId}/lastCheckInDate`]: ngay,
    });
    return gio;
  }

  const ngayVao = ns.lastCheckInDate && /^\d{4}-\d{2}-\d{2}$/.test(ns.lastCheckInDate) ? ns.lastCheckInDate : khoaNgay(now);
  const cacCa = veMangCoKey<CaLam>((await get(ref(db, `ChamCong/${ngayVao}/${nhanSuId}`))).val());
  const dangMo = [...cacCa].reverse().find((c) => !c.giaTri.gioRa);
  if (!dangMo) throw new Error(`${ns.ten} không có ca nào đang mở.`);
  await update(ref(db), {
    [`ChamCong/${ngayVao}/${nhanSuId}/${dangMo.key}/gioRa`]: gio,
    [`ChamCong/${ngayVao}/${nhanSuId}/${dangMo.key}/timestampRa`]: now.getTime(),
    [`NhanSu/${nhanSuId}/daTanCa`]: true,
    [`NhanSu/${nhanSuId}/isOnline`]: false,
  });
  return gio;
}
