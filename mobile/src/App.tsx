import { useEffect, useState } from 'react';
import { useNguoiDung, useXacThuc } from './auth/XacThuc';
import { DuLieuQuanProvider, useDuLieuQuan } from './hooks/DuLieuQuan';
import { coQuyen } from './quyen/phanQuyen';
import { kiemTraResetNgay } from './services/donHang';
import { ChiTietDon } from './screens/ChiTietDon';
import { ChuaLienKet, DangNhap } from './screens/DangNhap';
import { NutDonQR } from './screens/DonQRChoDuyet';
import { ChuongBep, ManHinhBep } from './screens/ManHinhBep';
import { SoDoBan } from './screens/SoDoBan';
import { Them } from './screens/Them';
import { CapNhatApp } from './components/CapNhatApp';

type Tab = 'ban' | 'bep' | 'them';

export function App() {
  const { trangThai } = useXacThuc();

  if (trangThai.loai === 'dang_kiem_tra') return <div className="man-cho"><img src="/m/icons/icon.svg" alt="Phở Túy" /></div>;
  if (trangThai.loai === 'chua_dang_nhap') return <DangNhap />;
  if (trangThai.loai === 'chua_lien_ket') return <ChuaLienKet email={trangThai.email} />;

  return (
    <DuLieuQuanProvider>
      <VoApp />
    </DuLieuQuanProvider>
  );
}

function VoApp() {
  const user = useNguoiDung();
  const { phieuBep } = useDuLieuQuan();
  const xemBep = coQuyen(user, 'view_kitchen');
  const nhanQR = coQuyen(user, 'order');
  // Đầu bếp (xem bếp nhưng không thu tiền) mở app là vào thẳng màn hình bếp
  const [tab, setTab] = useState<Tab>(() => (xemBep && !coQuyen(user, 'payment') ? 'bep' : 'ban'));
  const [banDangMo, setBanDangMo] = useState<number | null>(null);
  const soPhieuChuaXong = phieuBep.filter((p) => !p.isDoneByChef).length;

  useEffect(() => {
    kiemTraResetNgay().catch((e) => console.error('Reset suất 05:00 lỗi:', e));
  }, []);

  const nutTab = (t: Tab, icon: string, nhan: string, so = 0) => (
    <button className={tab === t ? 'chon' : ''} onClick={() => setTab(t)} aria-current={tab === t}>
      <span aria-hidden className="thanh-duoi-icon">
        {icon}
        {so > 0 && <span className="thanh-duoi-so">{so}</span>}
      </span>
      {nhan}
    </button>
  );

  return (
    <div className={`vo-app ${banDangMo != null ? 'co-ban-mo' : ''}`}>
      <header className="thanh-dau">
        <span className="thanh-dau-logo">🍜 Phở Túy</span>
        {nhanQR && <NutDonQR />}
      </header>
      <main className="noi-dung">
        {tab === 'ban' && <SoDoBan moBan={setBanDangMo} />}
        {tab === 'bep' && <ManHinhBep />}
        {tab === 'them' && <Them />}
      </main>
      <nav className="thanh-duoi" aria-label="Điều hướng chính">
        {nutTab('ban', '🪑', 'Bàn')}
        {xemBep && nutTab('bep', '👨‍🍳', 'Bếp', soPhieuChuaXong)}
        {nutTab('them', '☰', 'Thêm')}
      </nav>
      {banDangMo != null && (
        <ChiTietDon tableId={banDangMo} dong={() => setBanDangMo(null)} chuyenBan={setBanDangMo} />
      )}
      {xemBep && <ChuongBep />}
      <CapNhatApp />
    </div>
  );
}
