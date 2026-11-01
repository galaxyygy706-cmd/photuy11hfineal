/* Dữ liệu realtime dùng chung: bàn, thực đơn, mọi đơn đang mở, phiếu bếp, đơn QR chờ duyệt.
   Lắng nghe MỘT lần ở gốc app (app cũ có chỗ đăng ký listener lặp lại mỗi lần chọn bàn). */

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useGiaTri } from './useGiaTri';
import { veMang, veMangCoKey } from '../services/donHangThuan';
import type { Ban, DonQR, DongMon, Mon, MonDonQR, PhieuBep } from '../types/duLieu';

export type PhieuBepCoKey = PhieuBep & { key: string };
export type DonQRCoKey = DonQR & { key: string };

interface GiaTri {
  dangTai: boolean;
  loi: Error | null;
  ban: Ban[];
  menu: { key: string; giaTri: Mon }[];
  /** orders theo tableId */
  donTheoBan: Record<string, DongMon[]>;
  /** Sắp theo thời gian gửi bếp, cũ nhất trước */
  phieuBep: PhieuBepCoKey[];
  /** Sắp theo thời gian khách gửi, cũ nhất trước */
  donQR: DonQRCoKey[];
}

const NguCanh = createContext<GiaTri | null>(null);

export function DuLieuQuanProvider({ children }: { children: ReactNode }) {
  const tables = useGiaTri<unknown>('tables');
  const menu = useGiaTri<unknown>('menu');
  const orders = useGiaTri<Record<string, unknown>>('orders');
  const bep = useGiaTri<unknown>('kitchen_orders');
  const qr = useGiaTri<unknown>('pending_qr_orders');

  const giaTri = useMemo<GiaTri>(() => {
    const donTheoBan: Record<string, DongMon[]> = {};
    for (const [k, v] of Object.entries(orders.giaTri ?? {})) donTheoBan[k] = veMang<DongMon>(v);
    const theoGio = (a: { timestamp?: number }, b: { timestamp?: number }) => (a.timestamp ?? 0) - (b.timestamp ?? 0);
    return {
      dangTai: tables.dangTai || menu.dangTai,
      loi: tables.loi ?? menu.loi ?? orders.loi ?? bep.loi ?? qr.loi,
      ban: veMang<Ban>(tables.giaTri).filter((b) => b && b.id != null),
      menu: veMangCoKey<Mon>(menu.giaTri),
      donTheoBan,
      phieuBep: veMangCoKey<PhieuBep>(bep.giaTri)
        .map(({ key, giaTri: p }) => ({ ...p, key, items: veMang<DongMon>(p.items) }))
        .sort(theoGio),
      donQR: veMangCoKey<DonQR>(qr.giaTri)
        .map(({ key, giaTri: d }) => ({ ...d, key, items: veMang<MonDonQR>(d.items) }))
        .sort(theoGio),
    };
  }, [tables, menu, orders, bep, qr]);

  return <NguCanh.Provider value={giaTri}>{children}</NguCanh.Provider>;
}

export function useDuLieuQuan(): GiaTri {
  const v = useContext(NguCanh);
  if (!v) throw new Error('useDuLieuQuan phải nằm trong <DuLieuQuanProvider>');
  return v;
}
