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
import { HoSoNho, Them, TrangQuanLy, mucQuanLy, type TrangQL } from './screens/Them';
import { LuoiThucDon } from './screens/don/ThucDon';
import { CapNhatApp } from './components/CapNhatApp';
import { NhungContext, useManHinhRong } from './hooks/useManHinhRong';
import { ChipSuat } from './components/SuatBan';

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
  const rong = useManHinhRong();
  useEffect(() => {
    kiemTraResetNgay().catch((e) => console.error('Reset suất 05:00 lỗi:', e));
  }, []);
  return rong ? <VoPC /> : <VoDienThoai />;
}

function VoDienThoai() {
  const user = useNguoiDung();
  const { phieuBep } = useDuLieuQuan();
  const xemBep = coQuyen(user, 'view_kitchen');
  const nhanQR = coQuyen(user, 'order');
  // Đầu bếp (xem bếp nhưng không thu tiền) mở app là vào thẳng màn hình bếp
  const [tab, setTab] = useState<Tab>(() => (xemBep && !coQuyen(user, 'payment') ? 'bep' : 'ban'));
  const [banDangMo, setBanDangMo] = useState<number | null>(null);
  const soPhieuChuaXong = phieuBep.filter((p) => !p.isDoneByChef).length;

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
        <div className="thanh-dau-phai">
          <ChipSuat />
          {nhanQR && <NutDonQR />}
        </div>
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

/* GIAO DIỆN PC (≥1025px): thanh bên trái thay cho thanh dưới; mục "Bán hàng" là 3 cột cố định
   Sơ đồ bàn | Thực đơn | Đơn của bàn đang chọn — bấm món là vào đơn ngay, không mở lá sớ.
   Các trang quản lý hiện trong vùng chính (chế độ nhúng, xem NhungContext). */
type MucPC = 'ban' | 'bep' | TrangQL;

function VoPC() {
  const user = useNguoiDung();
  const { phieuBep } = useDuLieuQuan();
  const xemBep = coQuyen(user, 'view_kitchen');
  const nhanQR = coQuyen(user, 'order');
  const [muc, setMuc] = useState<MucPC>(() => (xemBep && !coQuyen(user, 'payment') ? 'bep' : 'ban'));
  const [banDangMo, setBanDangMo] = useState<number | null>(null);
  const soPhieuChuaXong = phieuBep.filter((p) => !p.isDoneByChef).length;
  const dsQuanLy = mucQuanLy(user);

  const nutMuc = (m: MucPC, icon: string, nhan: string, so = 0) => (
    <button key={m} className={`muc-ben ${muc === m ? 'chon' : ''}`} onClick={() => setMuc(m)} aria-current={muc === m}>
      <span aria-hidden className="muc-ben-icon">{icon}</span>
      <span className="muc-ben-nhan">{nhan}</span>
      {so > 0 && <span className="muc-ben-so">{so}</span>}
    </button>
  );

  return (
    <NhungContext.Provider value={true}>
      <div className="vo-pc">
        <nav className="thanh-ben" aria-label="Điều hướng chính">
          <div className="thanh-ben-dau">
            <span className="thanh-ben-logo"><span aria-hidden>🍜</span> <b>Phở Túy</b></span>
            {nhanQR && <NutDonQR />}
          </div>
          <div className="thanh-ben-ds">
            {nutMuc('ban', '🪑', 'Bán hàng')}
            {xemBep && nutMuc('bep', '👨‍🍳', 'Bếp', soPhieuChuaXong)}
            {dsQuanLy.length > 0 && <div className="thanh-ben-nhom">Quản lý</div>}
            {dsQuanLy.map(({ k, icon, ten }) => nutMuc(k, icon, ten))}
          </div>
          <HoSoNho />
        </nav>

        <main className="vung-chinh">
          {muc === 'ban' && (
            <div className="ban-hang-pc">
              <section className="cot-pc cot-ban" aria-label="Sơ đồ bàn">
                <SoDoBan moBan={setBanDangMo} dangChon={banDangMo} />
              </section>
              <section className="cot-pc cot-thuc-don" aria-label="Thực đơn">
                <LuoiThucDon tableId={banDangMo} hienTatCa />
              </section>
              <section className="cot-don" aria-label="Đơn của bàn">
                {banDangMo != null ? (
                  <ChiTietDon key={banDangMo} tableId={banDangMo} dong={() => setBanDangMo(null)} chuyenBan={setBanDangMo} />
                ) : (
                  <div className="trang-thai-trong">
                    <div className="bieu-tuong-lon" aria-hidden>🧾</div>
                    Chọn một bàn ở sơ đồ bên trái để xem và gọi món.
                  </div>
                )}
              </section>
            </div>
          )}
          {muc === 'bep' && <div className="noi-dung"><ManHinhBep /></div>}
          {muc !== 'ban' && muc !== 'bep' && <TrangQuanLy trang={muc} dong={() => setMuc('ban')} />}
        </main>
        {xemBep && <ChuongBep />}
        <CapNhatApp />
      </div>
    </NhungContext.Provider>
  );
}
