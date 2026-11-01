/* Thông tin nhận chuyển khoản cho mã VietQR (lấy từ capNhatQRThanhToan ở app cũ, app.js:6509). */
export const NGAN_HANG = {
  maNganHang: 'VCB',
  soTaiKhoan: '030093020397',
  tenTaiKhoan: 'Nguyễn Kim Anh',
};

export function linkVietQR(soTien: number, noiDung: string): string {
  const { maNganHang, soTaiKhoan, tenTaiKhoan } = NGAN_HANG;
  return (
    `https://img.vietqr.io/image/${maNganHang}-${soTaiKhoan}-compact2.png` +
    `?amount=${Math.round(soTien)}&addInfo=${encodeURIComponent(noiDung)}&accountName=${encodeURIComponent(tenTaiKhoan)}`
  );
}
