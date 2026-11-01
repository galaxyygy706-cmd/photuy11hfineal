/* 📊 SUẤT BÁN HÔM NAY — cho màn nhân viên (bản khách nằm ở khach/GoiMon.tsx > TheSuat).
   - Điện thoại: viên nhỏ trên thanh đầu đỏ (ChipSuat), chạm để xổ bảng chi tiết.
   - PC: dải ngang trên đầu cột Thực đơn (DaiSuat trong LuoiThucDon chế độ hienTatCa). */
import { useState } from 'react';
import { useDuLieuQuan } from '../hooks/DuLieuQuan';
import { suatConLai } from '../services/donHangThuan';
import { mucSuat } from '../services/gioHangKhach';
import type { Mon } from '../types/duLieu';

export interface DongSuat { id: string; ten: string; limit: number; conLai: number; muc: 'du' | 'sap_het' | 'het' }

/** Chỉ 2 món "gốc" có đếm suất (combo ăn vào suất của 2 món này) — giống app cũ. */
export function useSuatBan(): DongSuat[] {
  const { menu } = useDuLieuQuan();
  const ds = menu.map((m) => m.giaTri);
  return ['tuy_tam', 'tuy_thuong']
    .map((id) => ds.find((m) => m.id === id))
    .filter((m): m is Mon => !!m && Number(m.limit) > 0)
    .map((m) => {
      const conLai = Math.max(0, suatConLai(ds, m.id));
      return { id: m.id, ten: m.ten, limit: Number(m.limit), conLai, muc: mucSuat(m.id, conLai) };
    });
}

/* ---------------------------------------------------------------- CÁC KIỂU HIỂN THỊ */

/** Dải ngang gọn, 2 thanh tiến độ cạnh nhau. */
export function DaiSuat({ className = '' }: { className?: string }) {
  const ds = useSuatBan();
  if (ds.length === 0) return null;
  return (
    <section className={`dai-suat ${className}`} aria-label="Suất bán hôm nay">
      <div className="dai-suat-dau">📊 Suất bán hôm nay</div>
      <div className="dai-suat-ds">
        {ds.map((d) => (
          <div key={d.id} className={`suat-o muc-${d.muc}`}>
            <div className="suat-o-dong">
              <span>{d.ten}</span>
              <b>{d.conLai}<small>/{d.limit}</small></b>
            </div>
            <div className="suat-thanh"><div style={{ width: `${(d.conLai / d.limit) * 100}%` }} /></div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Viên nhỏ trên thanh đầu, chạm để xổ bảng chi tiết. */
export function ChipSuat() {
  const ds = useSuatBan();
  const [mo, setMo] = useState(false);
  if (ds.length === 0) return null;
  const xauNhat = ds.some((d) => d.muc === 'het') ? 'het' : ds.some((d) => d.muc === 'sap_het') ? 'sap_het' : 'du';
  return (
    <div className="chip-suat-vo">
      <button className={`chip-suat muc-${xauNhat}`} onClick={() => setMo(!mo)} aria-expanded={mo} aria-label="Suất bán hôm nay">
        {ds.map((d) => <span key={d.id}>{d.id === 'tuy_tam' ? 'Tâm' : 'Thượng'} <b>{d.conLai}</b></span>)}
      </button>
      {mo && (
        <>
          <div className="chip-suat-nen" onClick={() => setMo(false)} />
          <div className="chip-suat-bang"><DaiSuat /></div>
        </>
      )}
    </div>
  );
}
