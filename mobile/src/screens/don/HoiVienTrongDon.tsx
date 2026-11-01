import { useMemo, useState } from 'react';
import { useNguoiDung } from '../../auth/XacThuc';
import { LaSo } from '../../components/LaSo';
import { useThongBao } from '../../components/ThongBao';
import { useGiaTri } from '../../hooks/useGiaTri';
import { boHoiVien, ganHoiVien } from '../../services/donHang';
import { docBoDem, tongBat } from '../../services/tichDiem';
import type { Ban, HoiVien } from '../../types/duLieu';

function laSinhNhat(ngaysinh?: string): boolean {
  const p = ngaysinh?.split('-');
  if (!p || p.length !== 3) return false;
  const h = new Date();
  return h.getDate() === Number(p[2]) && h.getMonth() + 1 === Number(p[1]);
}

/** Thẻ hội viên đang ngồi bàn (renderCustomerCard ở app cũ), hoặc nút gắn hội viên. */
export function TheHoiVien({ ban, moChon, duocSua }: { ban: Ban; moChon: () => void; duocSua: boolean }) {
  const user = useNguoiDung();
  const { chay } = useThongBao();
  const { giaTri: hv } = useGiaTri<HoiVien>(ban.customerId ? `members/${ban.customerId}` : null);

  if (!ban.customerId) {
    return duocSua ? <button className="nut-gan-hv" onClick={moChon}>＋ Gắn hội viên (tích điểm)</button> : null;
  }
  const bat = tongBat(docBoDem(hv));
  return (
    <div className="the-hv">
      <div className="the-hv-avatar" aria-hidden>{(hv?.ten ?? ban.customerName ?? '?').trim().charAt(0).toUpperCase()}</div>
      <div className="the-hv-thong-tin">
        <div className="the-hv-ten">{hv?.ten ?? ban.customerName} {hv?.rank && <span className="the-nho">{hv.rank}</span>}</div>
        <div className="the-hv-diem">
          <div className="thanh-tien-do"><div style={{ width: `${Math.min(100, bat * 10)}%` }} /></div>
          <span>{bat}/10 bát</span>
        </div>
        {laSinhNhat(hv?.ngaysinh) && <div className="the-hv-sinh-nhat">🎂 Hôm nay sinh nhật khách</div>}
      </div>
      {duocSua && (
        <button className="nut-icon" aria-label="Bỏ hội viên khỏi bàn" onClick={() => chay(() => boHoiVien(user, ban.id))}>✕</button>
      )}
    </div>
  );
}

export function ChonHoiVien({ mo, dong, tableId }: { mo: boolean; dong: () => void; tableId: number }) {
  const user = useNguoiDung();
  const { chay } = useThongBao();
  const [tuKhoa, setTuKhoa] = useState('');
  // Chỉ tải danh sách hội viên khi lá sớ đang mở.
  const { giaTri, dangTai } = useGiaTri<Record<string, HoiVien>>(mo ? 'members' : null);

  const ketQua = useMemo(() => {
    const k = tuKhoa.trim().toLowerCase().normalize('NFC');
    const ds = Object.entries(giaTri ?? {}).filter(([, v]) => v && v.ten);
    const loc = k ? ds.filter(([, v]) => v.ten.toLowerCase().normalize('NFC').includes(k) || String(v.sdt ?? '').includes(k)) : ds;
    return loc.slice(0, 30);
  }, [giaTri, tuKhoa]);

  return (
    <LaSo mo={mo} dong={dong} tieuDe="Gắn hội viên" cao="day">
      <input className="o-tim" type="search" placeholder="Tìm tên hoặc số điện thoại" value={tuKhoa}
        onChange={(e) => setTuKhoa(e.target.value)} inputMode="search" autoFocus />
      {dangTai ? <div className="trang-thai-trong">Đang tải…</div> : (
        <ul className="ds-hv">
          {ketQua.map(([id, v]) => (
            <li key={id}>
              <button className="lua-chon" onClick={async () => {
                if (await chay(() => ganHoiVien(user, tableId, id, v.ten), `Đã gắn ${v.ten}`)) dong();
              }}>
                <span>{v.ten}</span>
                <span className="phu">{v.sdt} · {tongBat(docBoDem(v))}/10 bát</span>
              </button>
            </li>
          ))}
          {ketQua.length === 0 && <li className="trang-thai-trong">Không tìm thấy hội viên.</li>}
        </ul>
      )}
    </LaSo>
  );
}
