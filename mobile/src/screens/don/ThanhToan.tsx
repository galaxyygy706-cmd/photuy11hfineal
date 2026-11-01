import { useState } from 'react';
import { useNguoiDung } from '../../auth/XacThuc';
import { LaSo } from '../../components/LaSo';
import { useThongBao } from '../../components/ThongBao';
import { linkVietQR } from '../../services/cauHinh';
import { thanhToan } from '../../services/donHang';
import { dinhDangTien, tinhTien } from '../../services/tinhTien';
import type { Ban, DongMon } from '../../types/duLieu';

export function ThanhToan({ mo, dong, ban, items }: { mo: boolean; dong: () => void; ban: Ban; items: DongMon[] }) {
  const user = useNguoiDung();
  const { chay } = useThongBao();
  const [cachTra, setCachTra] = useState<'tien_mat' | 'chuyen_khoan'>('tien_mat');
  const [dangGui, setDangGui] = useState(false);
  const tien = tinhTien(items, ban.discount ?? 0);

  const xacNhan = async () => {
    setDangGui(true);
    const ok = await chay(() => thanhToan(user, ban.id), `${ban.name}: đã thu ${dinhDangTien(tien.tongCong)}`);
    setDangGui(false);
    if (ok) dong();
  };

  return (
    <LaSo mo={mo} dong={dong} tieuDe={`Thanh toán · ${ban.name}`} cao="day"
      chan={
        <button className="nut nut-chinh nut-to" onClick={xacNhan} disabled={dangGui}>
          {dangGui ? 'Đang lưu…' : `Đã thu ${dinhDangTien(tien.tongCong)}`}
        </button>
      }>
      <div className="hoa-don">
        {items.map((i) => (
          <div key={i.id} className="hoa-don-dong">
            <span>{i.sl} × {i.ten}</span><span>{dinhDangTien(i.gia * i.sl)}</span>
          </div>
        ))}
        <hr />
        <div className="hoa-don-dong"><span>Tạm tính</span><span>{dinhDangTien(tien.tamTinh)}</span></div>
        {tien.tienGiam > 0 && <div className="hoa-don-dong giam"><span>Giảm {ban.discount}%</span><span>−{dinhDangTien(tien.tienGiam)}</span></div>}
        <div className="hoa-don-dong"><span>VAT 2%</span><span>{dinhDangTien(tien.tienVat)}</span></div>
        <div className="hoa-don-dong tong"><span>Tổng cộng</span><span>{dinhDangTien(tien.tongCong)}</span></div>
      </div>

      <div className="chip-hang">
        <button className={`chip ${cachTra === 'tien_mat' ? 'chon' : ''}`} onClick={() => setCachTra('tien_mat')}>💵 Tiền mặt</button>
        <button className={`chip ${cachTra === 'chuyen_khoan' ? 'chon' : ''}`} onClick={() => setCachTra('chuyen_khoan')}>📱 Chuyển khoản</button>
      </div>
      {cachTra === 'chuyen_khoan' && (
        <div className="qr-vung">
          <img src={linkVietQR(tien.tongCong, `Thanh toan ${ban.name}`)} alt={`Mã QR chuyển khoản ${dinhDangTien(tien.tongCong)}`} />
          <p>Khách quét mã để chuyển đúng {dinhDangTien(tien.tongCong)}. Kiểm tra tiền đã về rồi mới bấm xác nhận.</p>
        </div>
      )}
    </LaSo>
  );
}
