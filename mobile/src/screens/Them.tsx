import { useState } from 'react';
import { useNguoiDung, useXacThuc } from '../auth/XacThuc';
import { LaSo } from '../components/LaSo';
import { useThongBao } from '../components/ThongBao';
import { useGiaTri } from '../hooks/useGiaTri';
import { coQuyen } from '../quyen/phanQuyen';
import { taoTaiKhoanChoNhanSu } from '../services/taiKhoan';
import { chamCong } from '../services/quanLy';
import type { NhanSu, TaiKhoan } from '../types/duLieu';
import { Kho } from './quanly/Kho';
import { ThuChi } from './quanly/ThuChi';
import { BaoCao } from './quanly/BaoCao';
import { HoiVienQL } from './quanly/HoiVienQL';
import { NhanSuQL } from './quanly/NhanSuQL';

type TrangQL = 'bao_cao' | 'thu_chi' | 'kho' | 'hoi_vien' | 'nhan_su';

export function Them() {
  const user = useNguoiDung();
  const { dangXuat } = useXacThuc();
  const { xacNhan } = useThongBao();
  const [moTaiKhoan, setMoTaiKhoan] = useState(false);
  const [trang, setTrang] = useState<TrangQL | null>(null);
  const dongTrang = () => setTrang(null);

  // Menu hiện theo quyền (ẩn nút chỉ là lớp phụ — mỗi hàm service vẫn tự kiểm tra quyền)
  const menu: [TrangQL, string, boolean][] = [
    ['bao_cao', '📊 Báo cáo doanh thu', coQuyen(user, 'view_history')],
    ['thu_chi', '💰 Thu chi', coQuyen(user, 'manage_expense')],
    ['kho', '📦 Kho nguyên liệu', coQuyen(user, 'manage_stock')],
    ['hoi_vien', '⭐ Hội viên', coQuyen(user, 'order') || coQuyen(user, 'manage_member')],
    ['nhan_su', '🧑‍🍳 Nhân sự & chấm công', coQuyen(user, 'manage_staff')],
  ];

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

      <ChamCongCuaToi />

      <div className="ds-lua-chon">
        {menu.filter(([, , duoc]) => duoc).map(([k, ten]) => (
          <button key={k} className="lua-chon" onClick={() => setTrang(k)}>{ten}<span aria-hidden>›</span></button>
        ))}
        {coQuyen(user, 'manage_staff') && (
          <button className="lua-chon" onClick={() => setMoTaiKhoan(true)}>🔑 Tài khoản đăng nhập</button>
        )}
        <button className="lua-chon nguy-hiem" onClick={async () => {
          if (await xacNhan('Đăng xuất khỏi app?', { nutDongY: 'Đăng xuất', nguyHiem: true })) await dangXuat();
        }}>🚪 Đăng xuất</button>
      </div>
      <p className="phien-ban">Phở Túy POS mobile · v0.2.0 · <a href="/">mở app cũ</a></p>

      <TaiKhoanNhanVien mo={moTaiKhoan} dong={() => setMoTaiKhoan(false)} />
      {trang === 'kho' && <Kho dong={dongTrang} />}
      {trang === 'thu_chi' && <ThuChi dong={dongTrang} />}
      {trang === 'bao_cao' && <BaoCao dong={dongTrang} />}
      {trang === 'hoi_vien' && <HoiVienQL dong={dongTrang} />}
      {trang === 'nhan_su' && <NhanSuQL dong={dongTrang} />}
    </div>
  );
}

/** Mỗi nhân viên tự vào ca / tan ca cho chính mình. */
function ChamCongCuaToi() {
  const user = useNguoiDung();
  const { chay } = useThongBao();
  const { giaTri: ns } = useGiaTri<{ daVaoCa?: boolean; daTanCa?: boolean }>(`NhanSu/${user.nhanSuId}`);
  const [dangGui, setDangGui] = useState(false);
  const dangLam = !!ns?.daVaoCa && !ns?.daTanCa;
  return (
    <section className={`the-cham-cong ${dangLam ? 'dang-lam' : ''}`}>
      <div>
        <div className="dong-chinh">{dangLam ? '🟢 Đang trong ca' : '⚪ Chưa vào ca'}</div>
        <div className="phu">Chấm công của bạn</div>
      </div>
      <button className={`nut ${dangLam ? 'nut-phu' : 'nut-xanh'}`} disabled={dangGui || !ns} onClick={async () => {
        setDangGui(true);
        await chay(async () => {
          const gio = await chamCong(user, user.nhanSuId, dangLam ? 'ra' : 'vao');
          return gio;
        }, dangLam ? 'Đã tan ca' : 'Đã vào ca');
        setDangGui(false);
      }}>{dangLam ? 'Tan ca' : 'Vào ca'}</button>
    </section>
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
