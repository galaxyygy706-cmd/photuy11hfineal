import { useEffect, useState } from 'react';
import { useXacThuc } from './auth/XacThuc';
import { DuLieuQuanProvider } from './hooks/DuLieuQuan';
import { kiemTraResetNgay } from './services/donHang';
import { ChiTietDon } from './screens/ChiTietDon';
import { ChuaLienKet, DangNhap } from './screens/DangNhap';
import { SoDoBan } from './screens/SoDoBan';
import { Them } from './screens/Them';
import { CapNhatApp } from './components/CapNhatApp';

type Tab = 'ban' | 'them';

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
  const [tab, setTab] = useState<Tab>('ban');
  const [banDangMo, setBanDangMo] = useState<number | null>(null);

  useEffect(() => {
    kiemTraResetNgay().catch((e) => console.error('Reset suất 05:00 lỗi:', e));
  }, []);

  return (
    <div className={`vo-app ${banDangMo != null ? 'co-ban-mo' : ''}`}>
      <header className="thanh-dau">
        <span className="thanh-dau-logo">🍜 Phở Túy</span>
      </header>
      <main className="noi-dung">{tab === 'ban' ? <SoDoBan moBan={setBanDangMo} /> : <Them />}</main>
      <nav className="thanh-duoi" aria-label="Điều hướng chính">
        <button className={tab === 'ban' ? 'chon' : ''} onClick={() => setTab('ban')} aria-current={tab === 'ban'}>
          <span aria-hidden>🪑</span>Bàn
        </button>
        <button className={tab === 'them' ? 'chon' : ''} onClick={() => setTab('them')} aria-current={tab === 'them'}>
          <span aria-hidden>☰</span>Thêm
        </button>
      </nav>
      {banDangMo != null && (
        <ChiTietDon tableId={banDangMo} dong={() => setBanDangMo(null)} chuyenBan={setBanDangMo} />
      )}
      <CapNhatApp />
    </div>
  );
}
