/* Trang con toàn màn hình (kho, thu chi, báo cáo...) — cùng kiểu trang chi tiết đơn:
   đầu cố định có nút quay lại, thân cuộn, nút Back của điện thoại đóng trang. */

import { useState, type ReactNode } from 'react';
import { useNutQuayLai } from '../hooks/useNutQuayLai';

export function TrangCon({ tieuDe, dong, phai, children, chan }: {
  tieuDe: string; dong: () => void; phai?: ReactNode; children: ReactNode; chan?: ReactNode;
}) {
  useNutQuayLai(true, dong);
  return (
    <div className="trang">
      <header className="trang-dau">
        <button className="nut-icon" onClick={dong} aria-label="Quay lại">‹</button>
        <div className="trang-dau-giua"><h1>{tieuDe}</h1></div>
        {phai ?? <span className="nut-icon-cho" />}
      </header>
      <div className="trang-than">{children}</div>
      {chan && <footer className="trang-chan">{chan}</footer>}
    </div>
  );
}

/** Ô nhập tiền: hiện 1.500.000, giữ giá trị số. */
export function OTien({ giaTri, doi, ...props }: { giaTri: number; doi: (v: number) => void; id?: string; 'aria-label'?: string }) {
  const [chu, setChu] = useState(giaTri ? giaTri.toLocaleString('vi-VN') : '');
  return (
    <input {...props} className="o-nhap" inputMode="numeric" value={chu} placeholder="0"
      onChange={(e) => {
        const so = Number(e.target.value.replace(/\D/g, '')) || 0;
        setChu(so ? so.toLocaleString('vi-VN') : '');
        doi(so);
      }} />
  );
}

export function taiFile(noiDung: string, tenFile: string, loai = 'text/csv;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob([noiDung], { type: loai }));
  const a = document.createElement('a');
  a.href = url;
  a.download = tenFile;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Thanh chọn kỳ (Hôm nay / Tuần / Tháng / Năm / Tất cả) */
export function ChonKy<K extends string>({ ky, doi, ds }: { ky: K; doi: (k: K) => void; ds: readonly (readonly [K, string])[] }) {
  return (
    <div className="chip-hang" role="tablist">
      {ds.map(([k, ten]) => (
        <button key={k} role="tab" aria-selected={ky === k} className={`chip ${ky === k ? 'chon' : ''}`} onClick={() => doi(k)}>{ten}</button>
      ))}
    </div>
  );
}
