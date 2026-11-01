import { useState } from 'react';
import { useNguoiDung, useXacThuc } from '../auth/XacThuc';
import { LaSo } from '../components/LaSo';
import { useThongBao } from '../components/ThongBao';
import { useGiaTri } from '../hooks/useGiaTri';
import { coQuyen } from '../quyen/phanQuyen';
import { taoTaiKhoanChoNhanSu } from '../services/taiKhoan';
import type { NhanSu, TaiKhoan } from '../types/duLieu';

export function Them() {
  const user = useNguoiDung();
  const { dangXuat } = useXacThuc();
  const { xacNhan } = useThongBao();
  const [moTaiKhoan, setMoTaiKhoan] = useState(false);

  return (
    <div className="them">
      <section className="the-ho-so">
        {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="the-ho-so-anh" />
          : <div className="the-ho-so-anh" aria-hidden>{user.ten.charAt(0).toUpperCase()}</div>}
        <div>
          <div className="the-ho-so-ten">{user.ten}</div>
          <div className="phu">{user.vaiTro}{user.capDo === 'ADMIN' ? ' · Quản trị' : ''}</div>
          {user.ca && <div className="phu">Ca: {user.ca}</div>}
        </div>
      </section>

      <div className="ds-lua-chon">
        {coQuyen(user, 'manage_staff') && (
          <button className="lua-chon" onClick={() => setMoTaiKhoan(true)}>👥 Tài khoản nhân viên</button>
        )}
        {/* Các chức năng chưa chuyển sang app mới (GĐ 4) vẫn dùng ở app cũ. */}
        <a className="lua-chon" href="/">🗂️ Mở app đầy đủ (kho, thu chi, báo cáo, nhân sự…)</a>
        <button className="lua-chon nguy-hiem" onClick={async () => {
          if (await xacNhan('Kết thúc ca và đăng xuất?', { nutDongY: 'Đăng xuất', nguyHiem: true })) await dangXuat();
        }}>🚪 Đăng xuất</button>
      </div>
      <p className="phien-ban">Phở Túy POS mobile · v0.1.0</p>

      <TaiKhoanNhanVien mo={moTaiKhoan} dong={() => setMoTaiKhoan(false)} />
    </div>
  );
}

function TaiKhoanNhanVien({ mo, dong }: { mo: boolean; dong: () => void }) {
  const user = useNguoiDung();
  const { chay } = useThongBao();
  const nhanSu = useGiaTri<Record<string, NhanSu>>(mo ? 'NhanSu' : null);
  const taiKhoan = useGiaTri<Record<string, TaiKhoan>>(mo ? 'tai_khoan' : null);
  const [dangCap, setDangCap] = useState<string | null>(null);
  const [matKhau, setMatKhau] = useState('');

  const daCoTK = new Set(Object.values(taiKhoan.giaTri ?? {}).map((t) => t.nhanSuId));
  const ds = Object.entries(nhanSu.giaTri ?? {}).filter(([, v]) => v && v.ten);

  return (
    <LaSo mo={mo} dong={dong} tieuDe="Tài khoản nhân viên" cao="day">
      <p className="phu">
        Cấp mật khẩu đăng nhập app mới cho từng nhân viên. Tên đăng nhập giữ như app cũ. Mật khẩu tối thiểu 6 ký tự.
      </p>
      {nhanSu.dangTai || taiKhoan.dangTai ? <div className="trang-thai-trong">Đang tải…</div> : (
        <ul className="ds-hv">
          {ds.map(([key, v]) => (
            <li key={key} className="dong-tk">
              <div>
                <div>{v.ten} <span className="the-nho">{v.capDo}</span></div>
                <div className="phu">{v.username ? `@${v.username}` : 'Chưa có tên đăng nhập'} · {v.vaiTro}</div>
              </div>
              {daCoTK.has(key) ? <span className="the-nho moi">Đã có TK</span> : dangCap === key ? (
                <form className="form-tk" onSubmit={async (e) => {
                  e.preventDefault();
                  if (await chay(() => taoTaiKhoanChoNhanSu(user, { ...v, key }, matKhau), `Đã cấp tài khoản cho ${v.ten}`)) {
                    setDangCap(null);
                    setMatKhau('');
                  }
                }}>
                  <input type="password" placeholder="Mật khẩu mới" value={matKhau} onChange={(e) => setMatKhau(e.target.value)}
                    autoComplete="new-password" minLength={6} autoFocus />
                  <button className="nut nut-chinh">Cấp</button>
                </form>
              ) : (
                <button className="nut nut-phu" disabled={!v.username} onClick={() => { setDangCap(key); setMatKhau(''); }}>Cấp TK</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </LaSo>
  );
}
