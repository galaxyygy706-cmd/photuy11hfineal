// Sinh ../database.rules.draft.json từ vài biểu thức dùng chung (tránh gõ sai khi lặp lại).
// Cách dùng: node scripts/sinh-rules.mjs   (rồi chạy test emulator để kiểm tra)
import fs from 'node:fs';

const TK = "root.child('tai_khoan').child(auth.uid)";
const NV = `root.child('NhanSu').child(${TK}.child('nhanSuId').val())`;
/** Nhân viên đã liên kết tài khoản */
const STAFF = `auth != null && ${TK}.exists()`;
/** Quản lý = capDo ADMIN hoặc vai trò Thu ngân (full_control trong PERMISSIONS_BY_ROLE) */
const QL = `auth != null && (${NV}.child('capDo').val() === 'ADMIN' || ${NV}.child('vaiTro').val() === 'Đại sứ Minh Bạch')`;
/** Chính chủ hồ sơ $id */
const SELF = (bien) => `auth != null && ${TK}.child('nhanSuId').val() === ${bien}`;
const rw = (read, write) => ({ '.read': read, '.write': write });

const rules = {
  rules: {
    '.read': false,
    '.write': false,

    tai_khoan: {
      '.read': QL,
      $uid: {
        '.read': 'auth != null && auth.uid === $uid',
        '.write': QL,
        '.validate': "!newData.exists() || (newData.hasChildren(['nhanSuId']) && root.child('NhanSu').child(newData.child('nhanSuId').val()).exists())",
      },
    },

    NhanSu: {
      '.read': STAFF,
      '.write': QL,
      $id: {
        // Tự chấm công / báo online cho chính mình
        isOnline: { '.write': SELF('$id'), '.validate': 'newData.isBoolean()' },
        daVaoCa: { '.write': SELF('$id'), '.validate': 'newData.isBoolean()' },
        daTanCa: { '.write': SELF('$id'), '.validate': 'newData.isBoolean()' },
        lastCheckInDate: { '.write': SELF('$id'), '.validate': 'newData.isString()' },
      },
    },

    ChamCong: {
      '.read': QL,
      $ngay: {
        $nsId: {
          '.read': SELF('$nsId'),
          '.write': `${SELF('$nsId')} || (${QL})`,
        },
      },
    },

    menu: {
      '.read': true, // khach.html (khách chưa đăng nhập) cần đọc thực đơn
      '.write': QL,
      $i: { soldToday: { '.write': STAFF, '.validate': 'newData.isNumber() && newData.val() >= 0' } },
    },
    tables: rw(true, STAFF), // khach.html đọc danh sách bàn

    pending_qr_orders: {
      '.read': STAFF,
      $id: {
        // Khách tạo đơn mới (không đăng nhập); nhân viên duyệt/xoá
        '.write': `(!data.exists() && newData.exists()) || (${STAFF})`,
        '.validate': "!newData.exists() || newData.hasChildren(['tableId', 'items', 'timestamp'])",
      },
    },

    history_orders: {
      '.read': QL,
      $id: {
        // Nhân viên chỉ TẠO đơn mới khi thanh toán; sửa/xoá đơn cũ chỉ quản lý
        '.write': `(${STAFF} && !data.exists()) || (${QL})`,
        '.validate': "!newData.exists() || newData.hasChildren(['total', 'timestamp', 'items'])",
      },
    },

    thu_chi: rw(QL, QL),
    expenses: rw(QL, QL),
    chitieu: rw(QL, QL),

    lich_su_kho: {
      '.read': STAFF,
      '.write': QL, // xoá toàn bộ nhật ký
      $id: { '.write': `(${STAFF} && !data.exists()) || (${QL})` },
    },

    orders: rw(STAFF, STAFF),
    kitchen_orders: rw(STAFF, STAFF),
    eating_history: rw(STAFF, STAFF),
    members: rw(STAFF, STAFF),
    hoivien: rw(STAFF, STAFF),
    kho: rw(STAFF, STAFF),
    last_reset_date: rw(STAFF, STAFF),
    notifications: rw(true, STAFF), // app cũ ghi khi duyệt đơn QR
  },
};

fs.writeFileSync(new URL('../../database.rules.draft.json', import.meta.url), JSON.stringify(rules, null, 2) + '\n');
console.log('Đã sinh database.rules.draft.json');
