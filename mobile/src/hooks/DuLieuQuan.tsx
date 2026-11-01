/* Dữ liệu realtime dùng chung: bàn, thực đơn, mọi đơn đang mở, phiếu bếp.
   Lắng nghe MỘT lần ở gốc app (app cũ có chỗ đăng ký listener lặp lại mỗi lần chọn bàn). */

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useGiaTri } from './useGiaTri';
import { veMang, veMangCoKey } from '../services/donHangThuan';
import type { Ban, DongMon, Mon, PhieuBep } from '../types/duLieu';

interface GiaTri {
  dangTai: boolean;
  loi: Error | null;
  ban: Ban[];
  menu: { key: string; giaTri: Mon }[];
  /** orders theo tableId */
  donTheoBan: Record<string, DongMon[]>;
  phieuBep: PhieuBep[];
}

const NguCanh = createContext<GiaTri | null>(null);

export function DuLieuQuanProvider({ children }: { children: ReactNode }) {
  const tables = useGiaTri<unknown>('tables');
  const menu = useGiaTri<unknown>('menu');
  const orders = useGiaTri<Record<string, unknown>>('orders');
  const bep = useGiaTri<unknown>('kitchen_orders');

  const giaTri = useMemo<GiaTri>(() => {
    const donTheoBan: Record<string, DongMon[]> = {};
    for (const [k, v] of Object.entries(orders.giaTri ?? {})) donTheoBan[k] = veMang<DongMon>(v);
    return {
      dangTai: tables.dangTai || menu.dangTai,
      loi: tables.loi ?? menu.loi ?? orders.loi ?? bep.loi,
      ban: veMang<Ban>(tables.giaTri).filter((b) => b && b.id != null),
      menu: veMangCoKey<Mon>(menu.giaTri),
      donTheoBan,
      phieuBep: veMang<PhieuBep>(bep.giaTri),
    };
  }, [tables, menu, orders, bep]);

  return <NguCanh.Provider value={giaTri}>{children}</NguCanh.Provider>;
}

export function useDuLieuQuan(): GiaTri {
  const v = useContext(NguCanh);
  if (!v) throw new Error('useDuLieuQuan phải nằm trong <DuLieuQuanProvider>');
  return v;
}
