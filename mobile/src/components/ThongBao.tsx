/* Toast + hộp xác nhận thay cho alert()/confirm() của app cũ (chặn toàn màn hình, xấu trên mobile). */

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

type LoaiToast = 'thanh_cong' | 'loi' | 'thong_tin';
interface Toast { id: number; noiDung: string; loai: LoaiToast }
interface HopXacNhan { tieuDe: string; chiTiet?: string; nutDongY: string; nguyHiem?: boolean; tra: (v: boolean) => void }

interface GiaTri {
  bao: (noiDung: string, loai?: LoaiToast) => void;
  xacNhan: (tieuDe: string, tuyChon?: { chiTiet?: string; nutDongY?: string; nguyHiem?: boolean }) => Promise<boolean>;
  /** Chạy thao tác async, tự hiện lỗi thành toast. Trả về false nếu lỗi. */
  chay: (viec: () => Promise<unknown>, thanhCong?: string) => Promise<boolean>;
}

const NguCanh = createContext<GiaTri | null>(null);

export function ThongBaoProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [hop, setHop] = useState<HopXacNhan | null>(null);
  const idRef = useRef(0);

  const bao = useCallback((noiDung: string, loai: LoaiToast = 'thong_tin') => {
    const id = ++idRef.current;
    setToasts((t) => [...t.slice(-2), { id, noiDung, loai }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), loai === 'loi' ? 4500 : 2500);
  }, []);

  const xacNhan = useCallback<GiaTri['xacNhan']>(
    (tieuDe, tuyChon = {}) =>
      new Promise((tra) =>
        setHop({ tieuDe, chiTiet: tuyChon.chiTiet, nutDongY: tuyChon.nutDongY ?? 'Đồng ý', nguyHiem: tuyChon.nguyHiem, tra }),
      ),
    [],
  );

  // Esc / Enter cho hộp xác nhận trên PC. Bắt ở pha capture + preventDefault để Esc
  // không đóng luôn lá sớ / trang phía sau (xem useNutQuayLai).
  useEffect(() => {
    if (!hop) return;
    const phim = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      hop.tra(false);
      setHop(null);
    };
    window.addEventListener('keydown', phim, true);
    return () => window.removeEventListener('keydown', phim, true);
  }, [hop]);

  const chay = useCallback<GiaTri['chay']>(
    async (viec, thanhCong) => {
      try {
        await viec();
        if (thanhCong) bao(thanhCong, 'thanh_cong');
        return true;
      } catch (e) {
        console.error(e);
        bao(e instanceof Error ? e.message : String(e), 'loi');
        return false;
      }
    },
    [bao],
  );

  const dongHop = (v: boolean) => {
    hop?.tra(v);
    setHop(null);
  };

  return (
    <NguCanh.Provider value={{ bao, xacNhan, chay }}>
      {children}
      <div className="toast-vung" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.loai}`}>{t.noiDung}</div>
        ))}
      </div>
      {hop && (
        <div className="hop-nen" onClick={() => dongHop(false)}>
          <div className="hop" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="hop-tieu-de">{hop.tieuDe}</div>
            {hop.chiTiet && <div className="hop-chi-tiet">{hop.chiTiet}</div>}
            <div className="hop-nut">
              <button className="nut nut-phu" onClick={() => dongHop(false)}>Huỷ</button>
              <button className={`nut ${hop.nguyHiem ? 'nut-nguy-hiem' : 'nut-chinh'}`} onClick={() => dongHop(true)} autoFocus>
                {hop.nutDongY}
              </button>
            </div>
          </div>
        </div>
      )}
    </NguCanh.Provider>
  );
}

export function useThongBao(): GiaTri {
  const v = useContext(NguCanh);
  if (!v) throw new Error('useThongBao phải nằm trong <ThongBaoProvider>');
  return v;
}
