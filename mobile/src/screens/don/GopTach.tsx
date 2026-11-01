import { useState } from 'react';
import { useNguoiDung } from '../../auth/XacThuc';
import { LaSo } from '../../components/LaSo';
import { useThongBao } from '../../components/ThongBao';
import { useDuLieuQuan } from '../../hooks/DuLieuQuan';
import { gopBan, tachMon } from '../../services/donHang';
import type { Ban, DongMon } from '../../types/duLieu';
import { NHAN_TRANG_THAI } from '../SoDoBan';

function DsBanDich({ tableId, chon }: { tableId: number; chon: (b: Ban) => void }) {
  const { ban } = useDuLieuQuan();
  return (
    <div className="luoi-ban nho">
      {ban.filter((b) => b.id !== tableId && b.status !== 'paid').map((b) => (
        <button key={b.id} className={`the-ban-chinh tt-${b.status}`} onClick={() => chon(b)}>
          <span className="the-ban-ten">{b.name}</span>
          <span className="the-ban-phu">{b.customerName || NHAN_TRANG_THAI[b.status]}</span>
        </button>
      ))}
    </div>
  );
}

export function GopBan({ mo, dong, tableId, sauKhiGop }: { mo: boolean; dong: () => void; tableId: number; sauKhiGop: (id: number) => void }) {
  const user = useNguoiDung();
  const { chay, xacNhan } = useThongBao();
  return (
    <LaSo mo={mo} dong={dong} tieuDe="Gộp sang bàn nào?" cao="day">
      <DsBanDich tableId={tableId} chon={async (b) => {
        if (!(await xacNhan(`Chuyển toàn bộ món sang ${b.name}?`, { nutDongY: 'Gộp bàn' }))) return;
        if (await chay(() => gopBan(user, tableId, b.id), `Đã gộp sang ${b.name}`)) {
          dong();
          sauKhiGop(b.id);
        }
      }} />
    </LaSo>
  );
}

export function TachMon({ mo, dong, tableId, items }: { mo: boolean; dong: () => void; tableId: number; items: DongMon[] }) {
  const user = useNguoiDung();
  const { chay } = useThongBao();
  const [dongChon, setDongChon] = useState<DongMon | null>(null);
  const dongHet = () => { setDongChon(null); dong(); };

  return (
    <LaSo mo={mo} dong={dongHet} tieuDe={dongChon ? `Tách 1 "${dongChon.ten}" sang…` : 'Chọn món muốn tách'} cao="day">
      {!dongChon ? (
        <div className="ds-lua-chon">
          {items.map((d) => (
            <button key={d.id} className="lua-chon" onClick={() => setDongChon(d)}>
              <span>{d.ten}</span><span className="phu">SL {d.sl}{d.isSent ? ' · đã gửi bếp' : ''}</span>
            </button>
          ))}
        </div>
      ) : (
        <>
          <button className="nut nut-phu" onClick={() => setDongChon(null)}>‹ Chọn món khác</button>
          <DsBanDich tableId={tableId} chon={async (b) => {
            // Mỗi lần tách 1 suất, giữ lá sớ mở để tách tiếp nếu cần (giống app cũ).
            await chay(() => tachMon(user, tableId, b.id, dongChon.id), `Đã tách 1 ${dongChon.ten} sang ${b.name}`);
            const conLai = items.find((i) => i.id === dongChon.id);
            if (!conLai || conLai.sl <= 1) dongHet();
          }} />
        </>
      )}
    </LaSo>
  );
}
