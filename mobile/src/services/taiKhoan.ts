/* CHUYỂN NHÂN VIÊN SANG FIREBASE AUTH.
   Mỗi hồ sơ NhanSu cần 1 tài khoản Auth (email nội bộ từ `username`) + 1 bản ghi
   tai_khoan/{uid} = { nhanSuId } để nối hai bên. capDo/vaiTro vẫn chỉ nằm ở NhanSu (một nguồn duy nhất). */

import { deleteApp, initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { db, firebaseConfig } from '../firebase/khoiTao';
import { emailTuTenDangNhap, ketNoiEmulatorAuth } from '../firebase/xacThuc';
import { batBuocQuyen, type NguoiDung } from '../quyen/phanQuyen';
import type { NhanSu } from '../types/duLieu';

export async function taoTaiKhoanChoNhanSu(user: NguoiDung | null, ns: NhanSu & { key: string }, matKhau: string): Promise<void> {
  batBuocQuyen(user, 'manage_staff');
  if (!ns.username) throw new Error(`Nhân sự "${ns.ten}" chưa có tên đăng nhập (username).`);
  if (matKhau.length < 6) throw new Error('Mật khẩu tối thiểu 6 ký tự.');

  // createUserWithEmailAndPassword tự đăng nhập bằng tài khoản vừa tạo -> chạy trên một
  // app Firebase phụ để admin đang dùng máy không bị đăng xuất.
  const appPhu = initializeApp(firebaseConfig, `tao-tk-${Date.now()}`);
  try {
    const authPhu = getAuth(appPhu);
    ketNoiEmulatorAuth(authPhu);
    const cred = await createUserWithEmailAndPassword(authPhu, emailTuTenDangNhap(ns.username), matKhau);
    await signOut(authPhu);
    await set(ref(db, `tai_khoan/${cred.user.uid}`), { nhanSuId: ns.key });
  } catch (e) {
    const ma = (e as { code?: string }).code;
    if (ma === 'auth/email-already-in-use') throw new Error(`Tên đăng nhập "${ns.username}" đã có tài khoản.`);
    if (ma === 'auth/operation-not-allowed') throw new Error('Chưa bật đăng nhập Email/Password trong Firebase Console.');
    throw e;
  } finally {
    await deleteApp(appPhu);
  }
}
