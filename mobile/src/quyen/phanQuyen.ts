/* PHÂN QUYỀN — BẢNG QUYỀN DUY NHẤT CỦA APP MỚI.
   Port nguyên từ PERMISSIONS_BY_ROLE ở ../app.js (khu vực "1.PHÂN QUYỀN").
   Hai bảng phải giữ giống nhau cho tới khi app cũ ngừng chạy.
   Không tạo bảng quyền cục bộ nào khác — permission mới khai báo ở đây. */

export type Quyen =
  | 'full_control'
  | 'order'
  | 'print'
  | 'print_kitchen'
  | 'view_table'
  | 'payment'
  | 'discount'
  | 'view_kitchen'
  | 'confirm_done'
  | 'status_check'
  | 'clear_table'
  | 'clear_table_status'
  | 'manage_member'
  | 'manage_staff'
  | 'manage_expense'
  | 'view_history';

export const PERMISSIONS_BY_ROLE: Record<string, readonly Quyen[]> = {
  'Đại sứ Minh Bạch': ['full_control'], // Thu ngân
  'Đại sứ Ngoại Giao': ['order', 'print', 'print_kitchen', 'view_table', 'payment', 'discount'], // Phục vụ
  'Đại sứ Hương Vị': ['view_kitchen', 'confirm_done', 'order', 'print'], // Đầu bếp
  'Đại sứ Đón Tiếp': ['view_table', 'status_check'], // Bảo vệ
  'Đại sứ Sạch Sẽ': ['clear_table', 'clear_table_status'], // Vệ sinh
};

export interface NguoiDung {
  uid: string;
  nhanSuId: string;
  ten: string;
  vaiTro: string;
  capDo: 'ADMIN' | 'STAFF';
  avatarUrl?: string;
  ca?: string;
  quyen: readonly Quyen[];
}

/** capDo "ADMIN" luôn full_control, bất kể vaiTro (giống chonDaiSu() ở app cũ). */
export function tinhQuyen(capDo: string | undefined, vaiTro: string | undefined): readonly Quyen[] {
  if (capDo === 'ADMIN') return ['full_control'];
  return (vaiTro && PERMISSIONS_BY_ROLE[vaiTro]) || [];
}

export function coQuyen(user: Pick<NguoiDung, 'quyen'> | null | undefined, quyen: Quyen): boolean {
  if (!user) return false;
  return user.quyen.includes('full_control') || user.quyen.includes(quyen);
}

/** Lỗi ném ra khi gọi hành động nhạy cảm mà thiếu quyền — lớp chặn chính, ẩn nút chỉ là phụ. */
export class LoiKhongCoQuyen extends Error {
  constructor(quyen: Quyen) {
    super(`Bạn không có quyền thực hiện thao tác này (${quyen}).`);
  }
}

export function batBuocQuyen(user: NguoiDung | null | undefined, quyen: Quyen): asserts user is NguoiDung {
  if (!coQuyen(user, quyen)) throw new LoiKhongCoQuyen(quyen);
}
