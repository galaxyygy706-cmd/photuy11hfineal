/* TÍNH TIỀN — MỘT HÀM DUY NHẤT cho màn hình, mã QR và bản ghi history_orders.

   App cũ có 2 công thức lệch nhau:
     - renderOrder (màn hình + QR):  (tạm tính − giảm) + 2% VAT của phần đã giảm
     - chuyenBuoc "paid" (lưu sổ):   tạm tính + 2% VAT của tạm tính − giảm
   -> khách quét QR trả 91.800đ nhưng báo cáo ghi 92.000đ (đơn 100k, giảm 10%).
   App mới dùng công thức của màn hình/QR (VAT tính trên số tiền sau giảm giá) cho cả hai. */

export const VAT = 0.02;

export interface KetQuaTinhTien {
  tamTinh: number;
  tienGiam: number;
  tienVat: number;
  tongCong: number;
}

export function tinhTien(
  items: readonly { gia: number; sl: number }[],
  phanTramGiam: number,
): KetQuaTinhTien {
  const tamTinh = items.reduce((s, i) => s + (Number(i.gia) || 0) * (Number(i.sl) || 0), 0);
  const tienGiam = Math.round(tamTinh * ((Number(phanTramGiam) || 0) / 100));
  const sauGiam = tamTinh - tienGiam;
  const tienVat = Math.round(sauGiam * VAT);
  return { tamTinh, tienGiam, tienVat, tongCong: sauGiam + tienVat };
}

export const MUC_GIAM_GIA = [
  { phanTram: 0, ten: 'Không áp dụng' },
  { phanTram: 5, ten: 'Túy Tâm (5%)' },
  { phanTram: 10, ten: 'Túy Thượng (10%)' },
  { phanTram: 15, ten: 'Phở Túy 11 (15%)' },
] as const;

export function dinhDangTien(so: number): string {
  return (Number(so) || 0).toLocaleString('vi-VN') + 'đ';
}
