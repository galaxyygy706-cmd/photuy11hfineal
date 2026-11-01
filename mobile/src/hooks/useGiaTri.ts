import { useEffect, useState } from 'react';
import { onValue, ref } from 'firebase/database';
import { db } from '../firebase/khoiTao';

/** Lắng nghe realtime một node. `dangTai` = chưa nhận snapshot đầu tiên. */
export function useGiaTri<T>(duongDan: string | null): { giaTri: T | null; dangTai: boolean; loi: Error | null } {
  const [trangThai, setTrangThai] = useState<{ giaTri: T | null; dangTai: boolean; loi: Error | null }>({
    giaTri: null,
    dangTai: !!duongDan,
    loi: null,
  });

  useEffect(() => {
    if (!duongDan) {
      setTrangThai({ giaTri: null, dangTai: false, loi: null });
      return;
    }
    setTrangThai((s) => ({ ...s, dangTai: true }));
    return onValue(
      ref(db, duongDan),
      (snap) => setTrangThai({ giaTri: snap.val() as T | null, dangTai: false, loi: null }),
      (loi) => setTrangThai({ giaTri: null, dangTai: false, loi }),
    );
  }, [duongDan]);

  return trangThai;
}

/** Đồng hồ phút — dùng để cập nhật "Đợi 5p" / "Đang ăn 12p" mà không cần dữ liệu đổi. */
export function useBayGio(chuKyMs = 30000): number {
  const [bayGio, setBayGio] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setBayGio(Date.now()), chuKyMs);
    return () => clearInterval(t);
  }, [chuKyMs]);
  return bayGio;
}
