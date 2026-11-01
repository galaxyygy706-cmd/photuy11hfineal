import { useState } from 'react';
import { useNguoiDung } from '../../auth/XacThuc';
import { LaSo } from '../../components/LaSo';
import { useThongBao } from '../../components/ThongBao';
import { useDuLieuQuan } from '../../hooks/DuLieuQuan';
import { anhMon } from '../../services/dinhLuong';
import { suatConLai } from '../../services/donHangThuan';
import { themMon } from '../../services/donHang';
import { dinhDangTien } from '../../services/tinhTien';
import type { Mon } from '../../types/duLieu';

export function ThucDon({ mo, dong, tableId }: { mo: boolean; dong: () => void; tableId: number }) {
  const user = useNguoiDung();
  const { menu, donTheoBan } = useDuLieuQuan();
  const { chay, bao } = useThongBao();
  const [loai, setLoai] = useState<'don' | 'combo'>('don');
  const dsMenu = menu.map((m) => m.giaTri);
  const items = donTheoBan[tableId] ?? [];

  const chon = (mon: Mon) => {
    navigator.vibrate?.(10);
    void chay(async () => {
      const thongDiep = await themMon(user, tableId, mon, dsMenu);
      bao(thongDiep ?? `+1 ${mon.ten}`, thongDiep ? 'thanh_cong' : 'thong_tin');
    });
  };

  return (
    <LaSo mo={mo} dong={dong} tieuDe="Thực đơn" cao="day"
      chan={<button className="nut nut-chinh nut-to" onClick={dong}>Xong · {items.reduce((s, i) => s + i.sl, 0)} món</button>}>
      <div className="chip-hang" role="tablist">
        <button role="tab" aria-selected={loai === 'don'} className={`chip ${loai === 'don' ? 'chon' : ''}`} onClick={() => setLoai('don')}>Món đơn</button>
        <button role="tab" aria-selected={loai === 'combo'} className={`chip ${loai === 'combo' ? 'chon' : ''}`} onClick={() => setLoai('combo')}>Combo</button>
      </div>
      <div className="luoi-mon">
        {dsMenu.filter((m) => (m.loai ?? 'don') === loai).map((m) => {
          const conLai = suatConLai(dsMenu, m.id);
          const het = conLai <= 0;
          const daGoi = items.filter((i) => i.id_mon === m.id && !i.isReward).reduce((s, i) => s + i.sl, 0);
          const anh = anhMon(m.id, m.img);
          return (
            <button key={m.id} className={`the-mon ${het ? 'het' : ''}`} onClick={() => chon(m)} disabled={het}>
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
    </LaSo>
  );
}
