import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { app, DUNG_EMULATOR } from './khoiTao';

export function ketNoiEmulatorAuth(a: Auth): void {
  if (DUNG_EMULATOR) connectAuthEmulator(a, 'http://127.0.0.1:9099', { disableWarnings: true });
}

export const auth: Auth = getAuth(app);
ketNoiEmulatorAuth(auth);

/** Firebase Auth chỉ có đăng nhập bằng email, nên "tên đăng nhập" của nhân viên được map
    sang một email nội bộ thuộc domain của chính project (không ai nhận thư ở địa chỉ này). */
export function emailTuTenDangNhap(tenDangNhap: string): string {
  return `${tenDangNhap.trim().toLowerCase()}@pho-tuy.firebaseapp.com`;
}
