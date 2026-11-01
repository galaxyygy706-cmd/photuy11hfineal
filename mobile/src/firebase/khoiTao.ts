import { initializeApp, type FirebaseApp } from 'firebase/app';
import { connectDatabaseEmulator, getDatabase } from 'firebase/database';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';

/** `VITE_EMULATOR=1 npm run dev` -> chạy trên Firebase Emulator (máy local), không đụng dữ liệu thật. */
export const DUNG_EMULATOR = import.meta.env.VITE_EMULATOR === '1';

// Cùng project với app cũ (../app.js) -> dữ liệu đồng bộ realtime giữa hai app.
// apiKey của Firebase web là định danh công khai, không phải bí mật; bảo mật thật nằm ở
// Security Rules (database.rules.json) + Firebase Auth.
export const firebaseConfig = DUNG_EMULATOR
  ? {
      apiKey: 'demo-key',
      authDomain: 'demo-pho-tuy.firebaseapp.com',
      databaseURL: 'http://127.0.0.1:9000/?ns=demo-pho-tuy-default-rtdb',
      projectId: 'demo-pho-tuy',
    }
  : {
      apiKey: 'AIzaSyAtwr87l4pjnInOvL_9TMkBRi-xzkp2YGA',
      authDomain: 'pho-tuy.firebaseapp.com',
      databaseURL: 'https://pho-tuy-default-rtdb.asia-southeast1.firebasedatabase.app',
      projectId: 'pho-tuy',
    };

export function ketNoiEmulatorAuth(a: Auth): void {
  if (DUNG_EMULATOR) connectAuthEmulator(a, 'http://127.0.0.1:9099', { disableWarnings: true });
}

export const app: FirebaseApp = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
if (DUNG_EMULATOR) connectDatabaseEmulator(db, '127.0.0.1', 9000);
ketNoiEmulatorAuth(auth);

/** Firebase Auth chỉ có đăng nhập bằng email, nên "tên đăng nhập" của nhân viên được map
    sang một email nội bộ thuộc domain của chính project (không ai nhận thư ở địa chỉ này). */
export function emailTuTenDangNhap(tenDangNhap: string): string {
  return `${tenDangNhap.trim().toLowerCase()}@pho-tuy.firebaseapp.com`;
}
