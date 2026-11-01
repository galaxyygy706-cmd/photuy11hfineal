/* NGƯỜI DÙNG ĐANG ĐĂNG NHẬP — nguồn duy nhất (tương đương currentUser của app cũ).
   Không đọc tên/vai trò từ DOM; mọi chỗ cần biết "ai đang thao tác" đều lấy từ useNguoiDung(). */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { get, ref, update } from 'firebase/database';
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

export function XacThucProvider({ children }: { children: ReactNode }) {
  const [trangThai, setTrangThai] = useState<TrangThai>({ loai: 'dang_kiem_tra' });

  useEffect(
    () =>
      onAuthStateChanged(auth, async (u) => {
        if (!u) return setTrangThai({ loai: 'chua_dang_nhap' });
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
    await signInWithEmailAndPassword(auth, emailTuTenDangNhap(tenDangNhap), matKhau);
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
