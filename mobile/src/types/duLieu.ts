/* ============================================================================
   SCHEMA DỮ LIỆU FIREBASE RTDB — "HỢP ĐỒNG" CHUNG VỚI APP CŨ (../app.js)
   ----------------------------------------------------------------------------
   App cũ và app mới cùng ghi lên một database trong giai đoạn chạy song song.
   Mọi kiểu dưới đây được đối chiếu với chỗ app cũ GHI dữ liệu (đã ghi dòng
   tham chiếu). Không đổi tên field, không đổi kiểu — chỉ được THÊM field tuỳ chọn.
   ========================================================================== */

/** Trạng thái bàn. Vòng đời: empty → ordering → waiting → eating → paid → empty */
export type TrangThaiBan = 'empty' | 'ordering' | 'waiting' | 'eating' | 'paid';

/** Node `tables` — MẢNG, ghi theo CHỈ SỐ mảng (tables/{index}), không theo id. (app.js:265) */
export interface Ban {
  id: number;
  name: string;
  status: TrangThaiBan;
  type: 'table' | 'bar';
  /** Phần trăm giảm giá: 0 | 5 | 10 | 15 (app.js:4537) */
  discount?: number;
  /** Key trong node `members`. Chuỗi rỗng / null = không có khách. */
  customerId?: string | null;
  customerName?: string | null;
  /** Mốc gửi bếp (ms) — tính phút "Đợi" */
  timeAtBep?: number | null;
  /** Mốc giao món (ms) — tính phút "Đang ăn" và eating_history */
  timeGiaoMon?: number | null;
}

/** Node `menu` — MẢNG theo chỉ số. (app.js:123 MENU_MASTER) */
export interface Mon {
  id: string;
  ten: string;
  gia: number;
  loai: 'don' | 'combo';
  desc?: string;
  /** Số suất đã bán hôm nay — reset lúc 05:00 (app.js:4650) */
  soldToday?: number;
  /** Giới hạn suất/ngày. 0 hoặc không có = không giới hạn */
  limit?: number;
  img?: string;
}

/** Một dòng món trong đơn. Node `orders/{tableId}` là MẢNG các dòng này. (app.js:2205) */
export interface DongMon {
  /** Mốc thời gian tạo dòng (Date.now()) — KHÔNG phải id món */
  id: number;
  /** Id món gốc trong menu */
  id_mon: string;
  ten: string;
  gia: number;
  sl: number;
  /** Đã gửi bếp chưa. Dòng đã gửi không được cộng dồn số lượng nữa. */
  isSent?: boolean;
  /** Món tặng (0đ hoặc giá ưu đãi) — không tính điểm, không cộng dồn */
  isReward?: boolean;
  cooked?: boolean;
  note?: string;
  img?: string;
  loai?: string;
  desc?: string;
}

/** Node `members/{pushKey}` (app.js:3606 themHoiVien) */
export interface HoiVien {
  ten: string;
  sdt: string;
  ngaysinh?: string; // yyyy-mm-dd
  sothich?: string;
  joinedDate?: string; // dd/mm/yyyy
  /** Hai bộ đếm dùng thật để tích điểm "bát" (app.js:2223) */
  tuy_tam_count?: number;
  tuy_thuong_count?: number;
  /** Field cũ, app cũ không còn cập nhật đúng — không dùng */
  diem_tich_luy?: number;
  rank?: 'VIP' | 'ACTIVE' | 'NEW' | string;
}

/** Node `kitchen_orders/{pushKey}` (app.js:2829) */
export interface PhieuBep {
  tableId: number;
  tableName: string;
  timestamp: number;
  items: DongMon[];
  isDoneByChef?: boolean;
}

/** Node `history_orders/{pushKey}` (app.js:2908). vat/paidBy là field MỚI, tuỳ chọn. */
export interface LichSuDon {
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  tableName: string;
  subTotal: number;
  /** Số TIỀN giảm (không phải %) */
  discount: number;
  total: number;
  totalBowls: number;
  timestamp: number;
  items: DongMon[];
  vat?: number;
  paidBy?: string;
}

/** Node `eating_history/{pushKey}` (app.js:2950) */
export interface LichSuAn {
  tableId: number;
  tableName: string;
  customerName: string;
  startTime: number;
  endTime: number;
  duration: number;
  date: string;
}

/** Node `kho` — MẢNG theo chỉ số (app.js:68 KHO_MASTER) */
export interface NguyenLieu {
  id: string;
  ten: string;
  ton: number;
  limit: number;
  dvt: string;
  loai: 'chinh' | 'phu' | 'nuoc';
}

/** Node `NhanSu/{id}` (app.js:7080). capDo là nguồn quyết định ADMIN/STAFF. */
export interface NhanSu {
  id: string;
  ten: string;
  username: string;
  capDo: 'ADMIN' | 'STAFF';
  vaiTro: string;
  ca?: string;
  viTri?: string;
  sdt?: string;
  avatarUrl?: string;
  isOnline?: boolean;
  /** App cũ lưu mật khẩu dạng chữ thường ở đây — app mới KHÔNG đọc/ghi field này. */
  password?: string;
}

/** Node MỚI `tai_khoan/{authUid}` — nối tài khoản Firebase Auth với hồ sơ NhanSu. */
export interface TaiKhoan {
  nhanSuId: string;
}
