/* "Lá sớ" — bottom-sheet trượt từ đáy màn hình (giữ tên gọi của app cũ). */

import { useEffect, useState, type ReactNode } from 'react';
import { useNutQuayLai } from '../hooks/useNutQuayLai';

interface Props {
  mo: boolean;
  dong: () => void;
  tieuDe: ReactNode;
  children: ReactNode;
  /** Chân cố định (nút hành động) — luôn nằm trên safe-area */
  chan?: ReactNode;
  cao?: 'vua' | 'day';
}

export function LaSo({ mo, dong, tieuDe, children, chan, cao = 'vua' }: Props) {
  useNutQuayLai(mo, dong);
  // Giữ DOM thêm một nhịp sau khi đóng để chạy hiệu ứng trượt xuống.
  const [hienThi, setHienThi] = useState(mo);
  useEffect(() => {
    if (mo) setHienThi(true);
    else {
      const t = setTimeout(() => setHienThi(false), 220);
      return () => clearTimeout(t);
    }
  }, [mo]);

  if (!hienThi) return null;
  return (
    <div className={`la-so-nen ${mo ? 'mo' : ''}`} onClick={dong}>
      <section
        className={`la-so la-so-${cao} ${mo ? 'mo' : ''}`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="la-so-tay-cam" aria-hidden />
        <header className="la-so-dau">
          <h2>{tieuDe}</h2>
          <button className="nut-icon" onClick={dong} aria-label="Đóng">✕</button>
        </header>
        <div className="la-so-than">{children}</div>
        {chan && <footer className="la-so-chan">{chan}</footer>}
      </section>
    </div>
  );
}
