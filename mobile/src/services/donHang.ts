/* THAO TÁC ĐƠN HÀNG TRÊN FIREBASE — luồng bán hàng cốt lõi (GĐ 2).
   Tương ứng app cũ: addItem, xoaMon, suaNote, chuyenBuoc(printed/paid/empty), xacNhanGiaoMon,
   apDungGiamGia, chonKhachVaoBan, thucHienGopBan, thucHienTach.

   Khác biệt có chủ đích so với app cũ:
   - Mọi hàm kiểm tra quyền ở đầu hàm (lớp chặn chính), không chỉ ẩn nút.
   - Sửa đơn dùng runTransaction -> 2 máy cùng thêm món không ghi đè mất món của nhau.
   - Ghi nhiều node cùng lúc (bàn + đơn + lịch sử) bằng một lệnh update đa đường dẫn -> không
     còn trạng thái "nửa vời" khi rớt mạng giữa chừng.
   - Bàn được tìm theo KEY thật trong node `tables` (không dùng indexOf trên mảng cục bộ). */

import { get, increment, push, ref, runTransaction, update } from 'firebase/database';
import { db } from '../firebase/khoiTao';
import { batBuocQuyen, coQuyen, LoiKhongCoQuyen, type NguoiDung, type Quyen } from '../quyen/phanQuyen';
import type { Ban, DongMon, HoiVien, LichSuAn, LichSuDon, Mon, NguyenLieu, PhieuBep } from '../types/duLieu';
import { anhMon, demSoBat, soBatCuaMon } from './dinhLuong';
import {
  botMotMon, gopDon, suatConLai, suatTieuThu, tachMotMon, themMotMon, truKho, veMang, veMangCoKey,
} from './donHangThuan';
import { xuLyTichDiemKhiBotMon, xuLyTichDiemKhiThemMon, type KetQuaTichDiem } from './tichDiem';
import { tinhTien } from './tinhTien';

function batBuocMotTrong(user: NguoiDung | null, ...ds: Quyen[]): asserts user is NguoiDung {
  if (!ds.some((q) => coQuyen(user, q))) throw new LoiKhongCoQuyen(ds[0]!);
}

async function layBan(tableId: number): Promise<{ key: string; ban: Ban }> {
  const ds = veMangCoKey<Ban>((await get(ref(db, 'tables'))).val());
  const tim = ds.find((x) => String(x.giaTri.id) === String(tableId));
  if (!tim) throw new Error(`Không tìm thấy bàn ${tableId}`);
  return { key: tim.key, ban: tim.giaTri };
}

async function layDon(tableId: number): Promise<DongMon[]> {
  return veMang<DongMon>((await get(ref(db, `orders/${tableId}`))).val());
}

/** Các field cần xoá để đưa bàn về trống. */
function datLaiBan(key: string): Record<string, unknown> {
  return {
    [`tables/${key}/status`]: 'empty',
    [`tables/${key}/discount`]: 0,
    [`tables/${key}/customerName`]: '',
    [`tables/${key}/customerId`]: '',
    [`tables/${key}/timeAtBep`]: null,
    [`tables/${key}/timeGiaoMon`]: null,
  };
}

// ---------------------------------------------------------------- GỌI MÓN

/** Thêm 1 suất. Trả về câu thông báo quà tặng (nếu có) để UI hiện. */
export async function themMon(user: NguoiDung | null, tableId: number, mon: Mon, menu: readonly Mon[]): Promise<string | null> {
  batBuocQuyen(user, 'order');
  if (suatConLai(menu, mon.id) <= 0) throw new Error(`Hết hàng: ${mon.ten}`);

  const { key, ban } = await layBan(tableId);
  if (ban.status === 'paid') throw new Error('Bàn đã thanh toán — dọn bàn trước khi gọi món mới.');

  let tichDiem: KetQuaTichDiem | null = null;
  const b = soBatCuaMon(mon.id);
  if (ban.customerId && (b.tam || b.thuong)) {
    await runTransaction(ref(db, `members/${ban.customerId}`), (kh: HoiVien | null) => {
      if (kh === null) return kh; // chưa có dữ liệu cache -> Firebase sẽ chạy lại với dữ liệu thật
      tichDiem = xuLyTichDiemKhiThemMon(kh, mon.id);
      return { ...kh, ...tichDiem.boDem };
    });
  }
  const kq = tichDiem as KetQuaTichDiem | null;

  await runTransaction(ref(db, `orders/${tableId}`), (cu: unknown) => {
    const now = Date.now();
    let ds = veMang<DongMon>(cu);
    if (kq?.loai === 'uu_dai_moc_10') {
      ds = [...ds, { id: now, id_mon: 'tuy_thuong', ten: 'Túy Thượng (Ưu đãi mốc 10)', gia: kq.giaUuDai, sl: 1, isReward: true, isSent: false }];
    } else {
      ds = themMotMon(ds, mon, now);
      if (kq?.loai === 'cong_diem' && kq.tangQuay) {
        ds = [...ds, { id: now + 1, id_mon: 'quay', ten: 'Quẩy (Quà tặng 5 bát)', gia: 0, sl: 1, isReward: true, isSent: false }];
      }
    }
    return ds;
  });

  await update(ref(db, `tables/${key}`), { status: 'ordering' });

  if (kq?.loai === 'uu_dai_moc_10') return '🎁 Khách đủ 10 bát — đã áp dụng bát ưu đãi!';
  if (kq?.loai === 'cong_diem' && kq.tangQuay) return '🎯 Khách đủ 5 bát — tặng 1 Quẩy!';
  return null;
}

/** Bớt 1 suất của một dòng (xoá dòng nếu còn 1). */
export async function botMon(user: NguoiDung | null, tableId: number, idDong: number): Promise<void> {
  batBuocQuyen(user, 'order');
  const { key, ban } = await layBan(tableId);

  let dongBiBot: DongMon | undefined;
  let conLai = 0;
  await runTransaction(ref(db, `orders/${tableId}`), (cu: unknown) => {
    const ds = veMang<DongMon>(cu);
    dongBiBot = ds.find((i) => i.id === idDong);
    const moi = botMotMon(ds, idDong);
    conLai = moi.length;
    return moi;
  });

  const dong = dongBiBot as DongMon | undefined;
  if (dong && !dong.isReward && ban.customerId) {
    const b = soBatCuaMon(dong.id_mon);
    if (b.tam || b.thuong) {
      await runTransaction(ref(db, `members/${ban.customerId}`), (kh: HoiVien | null) =>
        kh === null ? kh : { ...kh, ...xuLyTichDiemKhiBotMon(kh, dong.id_mon) },
      );
    }
  }
  if (conLai === 0) await update(ref(db), datLaiBan(key));
}

export async function suaGhiChu(user: NguoiDung | null, tableId: number, idDong: number, ghiChu: string): Promise<void> {
  batBuocQuyen(user, 'order');
  await runTransaction(ref(db, `orders/${tableId}`), (cu: unknown) =>
    veMang<DongMon>(cu).map((i) => (i.id === idDong ? { ...i, note: ghiChu } : i)),
  );
}

// ---------------------------------------------------------------- BẾP

/** Gửi các món mới xuống bếp: đánh dấu đã gửi, cộng soldToday, trừ kho, tạo phiếu bếp. */
export async function guiBep(user: NguoiDung | null, tableId: number, menu: readonly { key: string; giaTri: Mon }[]): Promise<number> {
  batBuocMotTrong(user, 'order', 'print_kitchen', 'print');
  const { key, ban } = await layBan(tableId);

  let monMoi: DongMon[] = [];
  const kq = await runTransaction(ref(db, `orders/${tableId}`), (cu: unknown) => {
    const ds = veMang<DongMon>(cu);
    monMoi = ds.filter((i) => i.isSent !== true);
    if (monMoi.length === 0) return undefined; // huỷ transaction
    return ds.map((i) => ({ ...i, isSent: true }));
  });
  if (!kq.committed || monMoi.length === 0) throw new Error('Bàn này không có món mới để gửi bếp.');

  const now = Date.now();
  const capNhat: Record<string, unknown> = {
    [`tables/${key}/status`]: 'waiting',
    [`tables/${key}/timeAtBep`]: now,
  };
  for (const [idMon, sl] of Object.entries(suatTieuThu(monMoi))) {
    const m = menu.find((x) => x.giaTri.id === idMon);
    if (m) capNhat[`menu/${m.key}/soldToday`] = increment(sl);
  }
  const phieu: PhieuBep = {
    tableId,
    tableName: ban.name,
    timestamp: now,
    items: monMoi.map((i) => ({ ...i, img: anhMon(i.id_mon, i.img) ?? '' })),
  };
  capNhat[`kitchen_orders/${push(ref(db, 'kitchen_orders')).key}`] = phieu;
  await update(ref(db), capNhat);

  // Trừ kho tách riêng: nếu lỗi thì đơn vẫn đã xuống bếp, chỉ log lại để kiểm kho.
  await runTransaction(ref(db, 'kho'), (kho: (NguyenLieu | null)[] | null) =>
    Array.isArray(kho) ? truKho(kho, monMoi) : kho,
  ).catch((e) => console.error('Trừ kho thất bại:', e));

  return monMoi.length;
}

/** Nút ✓ trên sơ đồ bàn. Hai bước như app cũ: lần 1 = bếp báo xong, lần 2 = phục vụ đã giao (bàn -> Đang ăn). */
export async function xacNhanGiaoMon(user: NguoiDung | null, tableId: number): Promise<'bep_xong' | 'da_giao'> {
  batBuocMotTrong(user, 'confirm_done', 'order');
  const { key } = await layBan(tableId);
  const phieu = veMangCoKey<PhieuBep>((await get(ref(db, 'kitchen_orders'))).val())
    .filter((p) => String(p.giaTri.tableId) === String(tableId));

  const chuaXong = phieu.filter((p) => !p.giaTri.isDoneByChef);
  const capNhat: Record<string, unknown> = {};
  if (chuaXong.length > 0) {
    for (const p of chuaXong) capNhat[`kitchen_orders/${p.key}/isDoneByChef`] = true;
    capNhat[`tables/${key}/status`] = 'waiting';
    await update(ref(db), capNhat);
    return 'bep_xong';
  }
  for (const p of phieu) capNhat[`kitchen_orders/${p.key}`] = null;
  capNhat[`tables/${key}/status`] = 'eating';
  capNhat[`tables/${key}/timeGiaoMon`] = Date.now();
  capNhat[`tables/${key}/timeAtBep`] = null;
  await update(ref(db), capNhat);
  return 'da_giao';
}

// ---------------------------------------------------------------- THANH TOÁN / DỌN BÀN

export async function thanhToan(user: NguoiDung | null, tableId: number): Promise<number> {
  batBuocQuyen(user, 'payment');
  const [{ key, ban }, items] = await Promise.all([layBan(tableId), layDon(tableId)]);
  if (items.length === 0) throw new Error('Bàn chưa có món nào.');
  if (ban.status === 'paid') throw new Error('Bàn này đã thanh toán rồi.');

  const tien = tinhTien(items, ban.discount ?? 0);
  const sdt = ban.customerId
    ? (((await get(ref(db, `members/${ban.customerId}/sdt`))).val() as string | null) ?? '')
    : '';

  const lichSu: LichSuDon = {
    customerId: ban.customerId || null,
    customerName: ban.customerName || 'Khách vãng lai',
    customerPhone: sdt,
    tableName: ban.name,
    subTotal: tien.tamTinh,
    discount: tien.tienGiam,
    vat: tien.tienVat,
    total: tien.tongCong,
    // SỬA: app cũ đếm mọi dòng không phải quà (kể cả quẩy, nước) là "bát".
    totalBowls: demSoBat(items),
    timestamp: Date.now(),
    items,
    paidBy: user.ten,
  };
  await update(ref(db), {
    [`history_orders/${push(ref(db, 'history_orders')).key}`]: lichSu,
    [`tables/${key}/status`]: 'paid',
    [`tables/${key}/customerName`]: '',
    [`tables/${key}/customerId`]: '',
  });
  return tien.tongCong;
}

export async function donBan(user: NguoiDung | null, tableId: number): Promise<void> {
  batBuocMotTrong(user, 'clear_table', 'payment', 'order');
  const { key, ban } = await layBan(tableId);
  const capNhat: Record<string, unknown> = { ...datLaiBan(key), [`orders/${tableId}`]: null };
  if (ban.timeGiaoMon) {
    const ketThuc = Date.now();
    const lichSu: LichSuAn = {
      tableId: ban.id,
      tableName: ban.name,
      customerName: ban.customerName || 'Khách vãng lai',
      startTime: ban.timeGiaoMon,
      endTime: ketThuc,
      duration: Math.max(0, Math.floor((ketThuc - ban.timeGiaoMon) / 60000)),
      date: new Date().toLocaleDateString('vi-VN'),
    };
    capNhat[`eating_history/${push(ref(db, 'eating_history')).key}`] = lichSu;
  }
  await update(ref(db), capNhat);
}

// ---------------------------------------------------------------- GIẢM GIÁ / HỘI VIÊN

export async function datGiamGia(user: NguoiDung | null, tableId: number, phanTram: number): Promise<void> {
  // App cũ: apDungGiamGia không kiểm tra quyền (chỉ xoaGiamGia có) -> giờ kiểm tra cả hai chiều.
  batBuocQuyen(user, 'discount');
  const { key } = await layBan(tableId);
  await update(ref(db, `tables/${key}`), { discount: phanTram });
}

export async function ganHoiVien(user: NguoiDung | null, tableId: number, memberId: string, ten: string): Promise<void> {
  batBuocQuyen(user, 'order');
  const { key } = await layBan(tableId);
  await update(ref(db, `tables/${key}`), { customerId: memberId, customerName: ten });
}

export async function boHoiVien(user: NguoiDung | null, tableId: number): Promise<void> {
  batBuocQuyen(user, 'order');
  const { key } = await layBan(tableId);
  await update(ref(db, `tables/${key}`), { customerId: '', customerName: '' });
}

// ---------------------------------------------------------------- GỘP / TÁCH

export async function gopBan(user: NguoiDung | null, tuId: number, denId: number): Promise<void> {
  batBuocQuyen(user, 'order');
  const [tu, den, donTu, donDen, phieuBep] = await Promise.all([
    layBan(tuId), layBan(denId), layDon(tuId), layDon(denId), get(ref(db, 'kitchen_orders')),
  ]);
  if (donTu.length === 0) throw new Error('Bàn này không có món để gộp.');
  if (tu.ban.status === 'paid' || den.ban.status === 'paid') throw new Error('Không gộp bàn đã thanh toán.');

  const capNhat: Record<string, unknown> = {
    ...datLaiBan(tu.key),
    [`orders/${tuId}`]: null,
    [`orders/${denId}`]: gopDon(donTu, donDen),
  };
  if (den.ban.status === 'empty') {
    // Bàn đích đang trống -> nhận nguyên trạng thái của bàn gốc (đang chờ bếp / đang ăn...)
    capNhat[`tables/${den.key}/status`] = tu.ban.status;
    capNhat[`tables/${den.key}/timeAtBep`] = tu.ban.timeAtBep ?? null;
    capNhat[`tables/${den.key}/timeGiaoMon`] = tu.ban.timeGiaoMon ?? null;
  }
  // Chuyển phiếu bếp theo bàn để nút ✓ ở bàn đích vẫn tìm thấy phiếu.
  for (const p of veMangCoKey<PhieuBep>(phieuBep.val())) {
    if (String(p.giaTri.tableId) === String(tuId)) {
      capNhat[`kitchen_orders/${p.key}/tableId`] = denId;
      capNhat[`kitchen_orders/${p.key}/tableName`] = den.ban.name;
    }
  }
  await update(ref(db), capNhat);
}

export async function tachMon(user: NguoiDung | null, tuId: number, denId: number, idDong: number): Promise<void> {
  batBuocQuyen(user, 'order');
  const [tu, den, donTu, donDen] = await Promise.all([layBan(tuId), layBan(denId), layDon(tuId), layDon(denId)]);
  if (den.ban.status === 'paid') throw new Error('Không tách sang bàn đã thanh toán.');
  const kq = tachMotMon(donTu, donDen, idDong);
  if (!kq) throw new Error('Không tìm thấy món cần tách.');

  const capNhat: Record<string, unknown> = {
    [`orders/${tuId}`]: kq.goc.length ? kq.goc : null,
    [`orders/${denId}`]: kq.dich,
  };
  if (kq.goc.length === 0) Object.assign(capNhat, datLaiBan(tu.key));
  if (den.ban.status === 'empty') capNhat[`tables/${den.key}/status`] = 'ordering';
  await update(ref(db), capNhat);
}

// ---------------------------------------------------------------- RESET SUẤT 05:00

/** Reset soldToday mỗi ngày sau 05:00 (checkAndResetStockAt5AM ở app cũ). Transaction trên
    last_reset_date đảm bảo chỉ MỘT máy reset, dù app cũ và nhiều điện thoại cùng mở. */
export async function kiemTraResetNgay(): Promise<void> {
  const now = new Date();
  if (now.getHours() < 5) return;
  const homNay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const kq = await runTransaction(ref(db, 'last_reset_date'), (cu: string | null) => (cu === homNay ? undefined : homNay));
  if (!kq.committed) return;
  const menu = veMangCoKey<Mon>((await get(ref(db, 'menu'))).val());
  const capNhat: Record<string, unknown> = {};
  for (const m of menu) capNhat[`menu/${m.key}/soldToday`] = 0;
  if (Object.keys(capNhat).length) await update(ref(db), capNhat);
}
