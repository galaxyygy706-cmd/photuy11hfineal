/* ĐƠN QR CHỜ DUYỆT (modal-qr-list ở app cũ): nút chuông trên thanh đầu có số đơn,
   kêu chuông khi có đơn mới, mở lá sớ để Nhận / Huỷ từng đơn. */

import { useState } from 'react';
import { useNguoiDung } from '../auth/XacThuc';
import { LaSo } from '../components/LaSo';
import { useThongBao } from '../components/ThongBao';
import { useDuLieuQuan, type DonQRCoKey } from '../hooks/DuLieuQuan';
import { phatChuong, useBaoKhiCoMoi } from '../hooks/useChuong';
import { huyDonQR, nhanDonQR } from '../services/donHang';
import { dinhDangTien } from '../services/tinhTien';

export function NutDonQR() {
  const { donQR, ban, dangTai } = useDuLieuQuan();
  const { bao } = useThongBao();
  const [mo, setMo] = useState(false);
  const tenBan = (id: string | number) => ban.find((b) => String(b.id) === String(id))?.name ?? `Bàn ${id}`;

  useBaoKhiCoMoi(donQR.map((d) => d.key), dangTai, (moi) => {
    phatChuong();
    const ten = donQR.filter((d) => moi.includes(d.key)).map((d) => tenBan(d.tableId)).join(', ');
    bao(`🔔 Khách ${ten} vừa gửi đơn QR`, 'thong_tin');
  });

  return (
    <>
      <button className={`nut-chuong ${donQR.length ? 'co-don' : ''}`} onClick={() => setMo(true)}
        aria-label={donQR.length ? `${donQR.length} đơn QR chờ duyệt` : 'Đơn QR — không có đơn chờ'}>
        🔔{donQR.length > 0 && <span className="nut-chuong-so">{donQR.length}</span>}
      </button>
      <LaSo mo={mo} dong={() => setMo(false)} tieuDe={`Đơn QR chờ duyệt (${donQR.length})`} cao="day">
        {donQR.length === 0
          ? <div className="trang-thai-trong"><div className="bieu-tuong-lon" aria-hidden>📭</div>Không có đơn nào đang chờ.</div>
          : <div className="ds-don-qr">{donQR.map((d) => <TheDonQR key={d.key} don={d} tenBan={tenBan(d.tableId)} />)}</div>}
      </LaSo>
    </>
  );
}

function TheDonQR({ don, tenBan }: { don: DonQRCoKey; tenBan: string }) {
  const user = useNguoiDung();
  const { chay, xacNhan, bao } = useThongBao();
  const { menu } = useDuLieuQuan();
  const [dangGui, setDangGui] = useState(false);
  // Hiện giá theo MENU (giá thật sẽ tính), không theo giá khách gửi lên
  const giaThat = (id: string | undefined, ten: string) =>
    menu.find((m) => (id && m.giaTri.id === id) || m.giaTri.ten === ten)?.giaTri.gia;
  const tong = don.items.reduce((s, i) => s + (giaThat(i.id, i.ten) ?? 0) * (Number(i.sl) || 0), 0);

  const lam = async (viec: () => Promise<unknown>) => {
    setDangGui(true);
    await chay(viec);
    setDangGui(false);
  };

  return (
    <article className="don-qr">
      <header className="don-qr-dau">
        <b>{tenBan}</b>
        <span className="phu">{new Date(don.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
      </header>
      <ul className="don-qr-mon">
        {don.items.map((i, k) => {
          const gia = giaThat(i.id, i.ten);
          return (
            <li key={k}>
              <span>{i.sl} × {i.ten}{i.note && <span className="phieu-ghi-chu"> — {i.note}</span>}</span>
              <span>{gia == null ? <span className="loi">Không có trong menu</span> : dinhDangTien(gia * i.sl)}</span>
            </li>
          );
        })}
      </ul>
      <div className="don-qr-tong"><span>Tạm tính</span><b>{dinhDangTien(tong)}</b></div>
      <div className="hang-nut">
        <button className="nut nut-phu" disabled={dangGui} onClick={async () => {
          if (await xacNhan(`Huỷ đơn QR của ${tenBan}?`, { nutDongY: 'Huỷ đơn', nguyHiem: true })) await lam(() => huyDonQR(user, don.key));
        }}>Huỷ</button>
        <button className="nut nut-chinh nut-gian" disabled={dangGui} onClick={() => lam(async () => {
          const kq = await nhanDonQR(user, don.key);
          bao(kq.boQua.length
            ? `Đã nhận đơn ${kq.tenBan}. Bỏ qua (không có trong menu): ${kq.boQua.join(', ')}`
            : `Đã nhận đơn ${kq.tenBan} — nhớ bấm Gửi bếp`, kq.boQua.length ? 'loi' : 'thanh_cong');
        })}>
          {dangGui ? 'Đang xử lý…' : 'Nhận đơn'}
        </button>
      </div>
    </article>
  );
}
