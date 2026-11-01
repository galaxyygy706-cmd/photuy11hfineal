import { useState } from 'react';
import { useNguoiDung } from '../../auth/XacThuc';
import { DaiSuat } from '../../components/SuatBan';
import { LaSo } from '../../components/LaSo';
import { useThongBao } from '../../components/ThongBao';
import { useDuLieuQuan } from '../../hooks/DuLieuQuan';
import { anhMon } from '../../services/dinhLuong';
import { suatConLai } from '../../services/donHangThuan';
import { themMon } from '../../services/donHang';
import { dinhDangTien } from '../../services/tinhTien';
import type { Mon } from '../../types/duLieu';

/** Lá sớ thực đơn trên điện thoại. */
export function ThucDon({ mo, dong, tableId }: { mo: boolean; dong: () => void; tableId: number }) {
  const { donTheoBan } = useDuLieuQuan();
  const items = donTheoBan[tableId] ?? [];
  return (
    <LaSo mo={mo} dong={dong} tieuDe="Thực đơn" cao="day"
      chan={<button className="nut nut-chinh nut-to" onClick={dong}>Xong · {items.reduce((s, i) => s + i.sl, 0)} món</button>}>
      <LuoiThucDon tableId={tableId} />
    </LaSo>
  );
}

/** Lưới món dùng chung: trong lá sớ (điện thoại, có tab Món đơn/Combo) hoặc cột giữa màn bán hàng PC
    (`hienTatCa`: hiện cả hai nhóm, không cần bấm tab). tableId = null -> chưa chọn bàn, khoá bấm. */
export function LuoiThucDon({ tableId, hienTatCa = false }: { tableId: number | null; hienTatCa?: boolean }) {
  const user = useNguoiDung();
  const { menu, donTheoBan, ban } = useDuLieuQuan();
  const { chay, bao } = useThongBao();
  const [loai, setLoai] = useState<'don' | 'combo'>('don');
  const dsMenu = menu.map((m) => m.giaTri);
  const items = tableId == null ? [] : (donTheoBan[tableId] ?? []);
  const daThanhToan = ban.find((b) => b.id === tableId)?.status === 'paid';
  const khoa = tableId == null || daThanhToan;

  const chon = (mon: Mon) => {
    if (tableId == null) return;
    navigator.vibrate?.(10);
    void chay(async () => {
      const thongDiep = await themMon(user, tableId, mon, dsMenu);
      bao(thongDiep ?? `+1 ${mon.ten}`, thongDiep ? 'thanh_cong' : 'thong_tin');
    });
  };

  const luoi = (nhom: 'don' | 'combo') => (
    <div className="luoi-mon">
      {dsMenu.filter((m) => (m.loai ?? 'don') === nhom).map((m) => {
        const conLai = suatConLai(dsMenu, m.id);
        const het = conLai <= 0;
        const daGoi = items.filter((i) => i.id_mon === m.id && !i.isReward).reduce((s, i) => s + i.sl, 0);
        const anh = anhMon(m.id, m.img);
        return (
          <button key={m.id} className={`the-mon ${het ? 'het' : ''}`} onClick={() => chon(m)} disabled={het || khoa}
            title={tableId == null ? 'Chọn bàn trước' : undefined}>
            <div className="the-mon-anh">
              {anh ? <img src={anh} alt="" loading="lazy" /> : <span aria-hidden>🍜</span>}
              {daGoi > 0 && <span className="the-mon-da-goi">{daGoi}</span>}
            </div>
            <span className="the-mon-ten">{m.ten}</span>
            {m.desc && <span className="the-mon-mo-ta">{m.desc}</span>}
            <span className="the-mon-gia">{dinhDangTien(m.gia)}</span>
            {het ? <span className="the-mon-con het">Hết hàng</span>
              : Number.isFinite(conLai) && conLai <= 10 ? <span className="the-mon-con">Còn {conLai} suất</span> : null}
          </button>
        );
      })}
    </div>
  );

  if (hienTatCa) {
    return (
      <>
        {tableId == null && <p className="goi-y">← Chọn một bàn để bắt đầu gọi món</p>}
        {daThanhToan && <p className="goi-y">Bàn đã thanh toán — dọn bàn để gọi món mới</p>}
        <DaiSuat />
        <h3 className="nhom-tieu-de">Món đơn</h3>
        {luoi('don')}
        <h3 className="nhom-tieu-de">Combo</h3>
        {luoi('combo')}
      </>
    );
  }
  return (
    <>
      <div className="chip-hang" role="tablist">
        <button role="tab" aria-selected={loai === 'don'} className={`chip ${loai === 'don' ? 'chon' : ''}`} onClick={() => setLoai('don')}>Món đơn</button>
        <button role="tab" aria-selected={loai === 'combo'} className={`chip ${loai === 'combo' ? 'chon' : ''}`} onClick={() => setLoai('combo')}>Combo</button>
      </div>
      {luoi(loai)}
    </>
  );
}
