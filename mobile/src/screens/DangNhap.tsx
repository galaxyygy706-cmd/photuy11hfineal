import { useState, type FormEvent } from 'react';
import { useXacThuc } from '../auth/XacThuc';
import { DUNG_EMULATOR } from '../firebase/khoiTao';

function thongDiepLoi(e: unknown): string {
  const ma = (e as { code?: string }).code ?? '';
  if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email'].includes(ma))
    return DUNG_EMULATOR
      ? 'Sai tên đăng nhập hoặc mật khẩu. Bản demo dùng: quanly / thungan / phucvu / daubep, mật khẩu 123456.'
      : 'Sai tên đăng nhập hoặc mật khẩu. Lưu ý: tài khoản demo (quanly, phucvu…) KHÔNG có trên hệ thống thật.';
  if (ma === 'auth/too-many-requests') return 'Nhập sai quá nhiều lần. Thử lại sau ít phút.';
  if (ma === 'auth/network-request-failed')
    return DUNG_EMULATOR ? 'Không kết nối được máy chủ demo (Firebase Emulator chưa chạy?).' : 'Không có mạng. Kiểm tra Wi-Fi/4G rồi thử lại.';
  // Project chưa bật Email/Password trong Firebase Console
  if (ma === 'auth/operation-not-allowed' || ma === 'auth/configuration-not-found')
    return 'Hệ thống thật chưa bật đăng nhập Email/Password trong Firebase Console (xem mobile/README.md).';
  return `Không đăng nhập được (${ma || 'lỗi không rõ'}).`;
}

export function DangNhap() {
  const { dangNhap } = useXacThuc();
  const [ten, setTen] = useState('');
  const [mk, setMk] = useState('');
  const [loi, setLoi] = useState('');
  const [dangGui, setDangGui] = useState(false);

  const gui = async (e: FormEvent) => {
    e.preventDefault();
    if (!ten.trim() || !mk) return setLoi('Nhập đủ tên đăng nhập và mật khẩu.');
    setDangGui(true);
    setLoi('');
    try {
      await dangNhap(ten, mk);
    } catch (err) {
      setLoi(thongDiepLoi(err));
    } finally {
      setDangGui(false);
    }
  };

  return (
    <main className="dang-nhap">
      <img src="/m/icons/icon.svg" alt="" className="dang-nhap-logo" />
      <h1>Phở Túy</h1>
      <p className="mo-ta">Đăng nhập để vào ca</p>
      {/* Cho biết đang nối vào đâu — tài khoản demo chỉ tồn tại ở bản DEMO */}
      <p className={`nhan-moi-truong ${DUNG_EMULATOR ? 'demo' : 'that'}`}>
        {DUNG_EMULATOR ? 'BẢN DEMO · dữ liệu giả trên máy này' : 'HỆ THỐNG THẬT · dữ liệu quán'}
      </p>
      <form onSubmit={gui} className="dang-nhap-form">
        <label>
          Tên đăng nhập
          <input
            value={ten}
            onChange={(e) => setTen(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="username"
            inputMode="text"
          />
        </label>
        <label>
          Mật khẩu
          <input type="password" value={mk} onChange={(e) => setMk(e.target.value)} autoComplete="current-password" />
        </label>
        {loi && <div className="loi" role="alert">{loi}</div>}
        <button className="nut nut-chinh nut-to" disabled={dangGui}>
          {dangGui ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
      </form>
    </main>
  );
}

export function ChuaLienKet({ email }: { email: string }) {
  const { dangXuat } = useXacThuc();
  return (
    <main className="dang-nhap">
      <h1>Chưa liên kết hồ sơ</h1>
      <p className="mo-ta">
        Tài khoản <b>{email}</b> đăng nhập được nhưng chưa được nối với hồ sơ nhân sự nào. Nhờ quản lý vào
        <b> Thêm → Tài khoản nhân viên</b> để cấp lại.
      </p>
      <button className="nut nut-phu nut-to" onClick={dangXuat}>Đăng xuất</button>
    </main>
  );
}
