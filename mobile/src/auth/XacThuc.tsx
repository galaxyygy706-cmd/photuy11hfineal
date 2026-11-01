/* NGƯỜI DÙNG ĐANG ĐĂNG NHẬP — nguồn duy nhất (tương đương currentUser của app cũ).
   Không đọc tên/vai trò từ DOM; mọi chỗ cần biết "ai đang thao tác" đều lấy từ useNguoiDung(). */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { get, ref, set, update } from 'firebase/database';
import { db } from '../firebase/khoiTao';
import { auth, emailTuTenDangNhap } from '../firebase/xacThuc';
import { tinhQuyen, type NguoiDung } from '../quyen/phanQuyen';
import type { NhanSu, TaiKhoan } from '../types/duLieu';

type TrangThai =
  | { loai: 'dang_kiem_tra' }
  | { loai: 'chua_dang_nhap' }
  | { loai: 'chua_lien_ket'; email: string } // đăng nhập Auth được nhưng chưa nối với hồ sơ NhanSu
  | { loai: 'da_dang_nhap'; nguoiDung: NguoiDung };

interface GiaTriXacThuc {
  trangThai: TrangThai;
  dangNhap: (tenDangNhap: string, matKhau: string) => Promise<void>;
  dangXuat: () => Promise<void>;
}

const NguCanh = createContext<GiaTriXacThuc | null>(null);

async function taiNguoiDung(uid: string): Promise<NguoiDung | null> {
  const tk = (await get(ref(db, `tai_khoan/${uid}`))).val() as TaiKhoan | null;
  if (!tk?.nhanSuId) return null;
  const ns = (await get(ref(db, `NhanSu/${tk.nhanSuId}`))).val() as NhanSu | null;
  if (!ns) return null;
  const capDo = ns.capDo === 'ADMIN' ? 'ADMIN' : 'STAFF';
  return {
    uid,
    nhanSuId: tk.nhanSuId,
    ten: ns.ten,
    vaiTro: ns.vaiTro,
    capDo,
    avatarUrl: ns.avatarUrl,
    ca: ns.ca,
    quyen: tinhQuyen(capDo, ns.vaiTro),
  };
}

/** Firebase Auth bắt mật khẩu ≥6 ký tự, app cũ thì không. Mật khẩu ngắn được nối thêm một đuôi cố định
    (chỉ khi <6 ký tự) để nhân viên vẫn gõ đúng mật khẩu cũ. Tài khoản do quản lý cấp luôn ≥6 nên không bị ảnh hưởng. */
/** true trong lúc chuyenTaiKhoanCu đang chạy: onAuthStateChanged bỏ qua lần kích hoạt do tạo tài khoản
    (lúc đó chưa ghi tai_khoan) — dangNhap tự nạp hồ sơ khi xong. */
let dangChuyenTaiKhoan = false;

const matKhauChoAuth = (mk: string) => (mk.length >= 6 ? mk : `${mk}#photuy`);

/** CHUYỂN TÀI KHOẢN CŨ TỰ ĐỘNG: đăng nhập Auth thất bại thì đối chiếu với username/password trong NhanSu
    (đúng như app cũ vẫn làm). Khớp -> tạo tài khoản Auth + tai_khoan/{uid} ngay, lần sau đăng nhập Auth bình thường.
    Trả về uid nếu đã chuyển, null nếu không khớp hồ sơ nào.
    Chỉ chạy được khi NhanSu còn đọc được lúc chưa đăng nhập (rules hiện tại). Khi deploy
    database.rules.draft.json thì bước này tự hết tác dụng (permission-denied -> coi như sai mật khẩu). */
async function chuyenTaiKhoanCu(tenDangNhap: string, matKhau: string): Promise<string | null> {
  let ds: Record<string, NhanSu | null> | (NhanSu | null)[] | null;
  try {
    ds = (await get(ref(db, 'NhanSu'))).val();
  } catch {
    return null;
  }
  if (!ds) return null;
  const ten = tenDangNhap.trim().toLowerCase();
  const khop = Object.entries(ds).find(
    ([, ns]) => ns && String(ns.username ?? '').trim().toLowerCase() === ten && String(ns.password ?? '') === matKhau,
  );
  if (!khop) return null;
  try {
    const cred = await createUserWithEmailAndPassword(auth, emailTuTenDangNhap(tenDangNhap), matKhauChoAuth(matKhau));
    await set(ref(db, `tai_khoan/${cred.user.uid}`), { nhanSuId: khop[0] });
    return cred.user.uid;
  } catch (e) {
    // Đã có tài khoản Auth (mật khẩu mới khác mật khẩu cũ) -> để lỗi đăng nhập gốc hiện ra
    if ((e as { code?: string }).code === 'auth/email-already-in-use') return null;
    throw e;
  }
}

export function XacThucProvider({ children }: { children: ReactNode }) {
  const [trangThai, setTrangThai] = useState<TrangThai>({ loai: 'dang_kiem_tra' });

  useEffect(
    () =>
      onAuthStateChanged(auth, async (u) => {
        if (!u) return setTrangThai({ loai: 'chua_dang_nhap' });
        if (dangChuyenTaiKhoan) return;
        try {
          const nd = await taiNguoiDung(u.uid);
          if (!nd) return setTrangThai({ loai: 'chua_lien_ket', email: u.email ?? '' });
          setTrangThai({ loai: 'da_dang_nhap', nguoiDung: nd });
          update(ref(db, `NhanSu/${nd.nhanSuId}`), { isOnline: true }).catch(() => {});
        } catch (e) {
          console.error('Lỗi tải hồ sơ nhân sự:', e);
          setTrangThai({ loai: 'chua_lien_ket', email: u.email ?? '' });
        }
      }),
    [],
  );

  const dangNhap = async (tenDangNhap: string, matKhau: string) => {
    try {
      await signInWithEmailAndPassword(auth, emailTuTenDangNhap(tenDangNhap), matKhauChoAuth(matKhau));
    } catch (e) {
      const ma = (e as { code?: string }).code ?? '';
      if (!['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password'].includes(ma)) throw e;
      dangChuyenTaiKhoan = true;
      let uid: string | null;
      try {
        uid = await chuyenTaiKhoanCu(tenDangNhap, matKhau);
      } finally {
        dangChuyenTaiKhoan = false;
      }
      if (!uid) throw e;
      // onAuthStateChanged đã bị bỏ qua lúc tạo tài khoản (xem dangChuyenTaiKhoan) -> tự nạp hồ sơ
      const nd = await taiNguoiDung(uid);
      if (!nd) return setTrangThai({ loai: 'chua_lien_ket', email: emailTuTenDangNhap(tenDangNhap) });
      setTrangThai({ loai: 'da_dang_nhap', nguoiDung: nd });
      update(ref(db, `NhanSu/${nd.nhanSuId}`), { isOnline: true }).catch(() => {});
    }
  };

  const dangXuat = async () => {
    if (trangThai.loai === 'da_dang_nhap') {
      // Dùng id từ người dùng hiện tại, không suy ra từ tên hiển thị (lỗi cũ của dangXuat()).
      await update(ref(db, `NhanSu/${trangThai.nguoiDung.nhanSuId}`), { isOnline: false }).catch(() => {});
    }
    await signOut(auth);
  };

  return <NguCanh.Provider value={{ trangThai, dangNhap, dangXuat }}>{children}</NguCanh.Provider>;
}

export function useXacThuc(): GiaTriXacThuc {
  const v = useContext(NguCanh);
  if (!v) throw new Error('useXacThuc phải nằm trong <XacThucProvider>');
  return v;
}

/** Chỉ dùng bên trong màn hình đã đăng nhập. */
export function useNguoiDung(): NguoiDung {
  const { trangThai } = useXacThuc();
  if (trangThai.loai !== 'da_dang_nhap') throw new Error('Chưa đăng nhập');
  return trangThai.nguoiDung;
}
