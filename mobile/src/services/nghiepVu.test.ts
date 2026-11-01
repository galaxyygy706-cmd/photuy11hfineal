import { describe, expect, it } from 'vitest';
import { tinhTien } from './tinhTien';
import { xuLyTichDiemKhiThemMon, xuLyTichDiemKhiBotMon } from './tichDiem';
import {
  botMotMon, gopDon, gopDonQR, mucChoBep, suatConLai, suatTieuThu, tachMotMon, themMotMon, truKho, veMang,
} from './donHangThuan';
import { demSoBat } from './dinhLuong';
import { coQuyen, tinhQuyen } from '../quyen/phanQuyen';
import type { DongMon, Mon, NguyenLieu } from '../types/duLieu';

const TAM: Mon = { id: 'tuy_tam', ten: 'Túy Tâm', gia: 50000, loai: 'don', limit: 100, soldToday: 0 };
const dong = (p: Partial<DongMon>): DongMon => ({ id: 1, id_mon: 'tuy_tam', ten: 'Túy Tâm', gia: 50000, sl: 1, ...p });

describe('tinhTien', () => {
  it('VAT tính trên số tiền SAU giảm giá (khớp màn hình + QR app cũ)', () => {
    expect(tinhTien([{ gia: 100000, sl: 1 }], 10)).toEqual({
      tamTinh: 100000, tienGiam: 10000, tienVat: 1800, tongCong: 91800,
    });
  });
  it('không giảm giá', () => {
    expect(tinhTien([{ gia: 50000, sl: 2 }, { gia: 10000, sl: 1 }], 0).tongCong).toBe(112200);
  });
  it('đơn rỗng = 0', () => {
    expect(tinhTien([], 15).tongCong).toBe(0);
  });
});

describe('tích điểm hội viên', () => {
  it('món không tích điểm', () => {
    expect(xuLyTichDiemKhiThemMon({}, 'quay').loai).toBe('khong_tich');
  });
  it('cộng 1 bát Tâm', () => {
    const kq = xuLyTichDiemKhiThemMon({ tuy_tam_count: 1 }, 'tuy_tam');
    expect(kq).toEqual({ loai: 'cong_diem', boDem: { tuy_tam_count: 2, tuy_thuong_count: 0 }, tangQuay: false });
  });
  it('chạm mốc 5 -> tặng quẩy', () => {
    const kq = xuLyTichDiemKhiThemMon({ tuy_tam_count: 4 }, 'tuy_tam');
    expect(kq.loai === 'cong_diem' && kq.tangQuay).toBe(true);
  });
  it('Song Long nhảy 4 -> 6 vẫn được tặng quẩy (bug app cũ bỏ lỡ)', () => {
    const kq = xuLyTichDiemKhiThemMon({ tuy_thuong_count: 4 }, 'combo_song_long');
    expect(kq.loai === 'cong_diem' && kq.tangQuay && kq.boDem.tuy_thuong_count === 6).toBe(true);
  });
  it('đủ 10 bát -> ưu đãi, reset bộ đếm; giá 0 nếu chủ yếu ăn Thượng', () => {
    expect(xuLyTichDiemKhiThemMon({ tuy_tam_count: 3, tuy_thuong_count: 7 }, 'tuy_tam'))
      .toEqual({ loai: 'uu_dai_moc_10', boDem: { tuy_tam_count: 0, tuy_thuong_count: 0 }, giaUuDai: 0 });
    const kq = xuLyTichDiemKhiThemMon({ tuy_tam_count: 8, tuy_thuong_count: 2 }, 'tuy_tam');
    expect(kq.loai === 'uu_dai_moc_10' && kq.giaUuDai).toBe(50000);
  });
  it('bớt món trừ điểm, không âm', () => {
    expect(xuLyTichDiemKhiBotMon({ tuy_thuong_count: 1 }, 'combo_song_long'))
      .toEqual({ tuy_tam_count: 0, tuy_thuong_count: 0 });
  });
});

describe('đơn hàng', () => {
  it('thêm món cộng dồn vào dòng chưa gửi bếp', () => {
    const a = themMotMon([], TAM, 1);
    const b = themMotMon(a, TAM, 2);
    expect(b).toHaveLength(1);
    expect(b[0]?.sl).toBe(2);
  });
  it('món đã gửi bếp -> thêm dòng mới', () => {
    const b = themMotMon([dong({ isSent: true })], TAM, 2);
    expect(b).toHaveLength(2);
    expect(b[1]?.isSent).toBe(false);
  });
  it('bớt món', () => {
    expect(botMotMon([dong({ sl: 2 })], 1)[0]?.sl).toBe(1);
    expect(botMotMon([dong({ sl: 1 })], 1)).toHaveLength(0);
  });
  it('gộp bàn: dòng chưa gửi KHÔNG bị gộp vào dòng đã gửi', () => {
    const kq = gopDon([dong({ id: 1, isSent: false })], [dong({ id: 2, isSent: true })]);
    expect(kq).toHaveLength(2);
  });
  it('tách 1 suất sang bàn khác', () => {
    const kq = tachMotMon([dong({ id: 1, sl: 3 })], [], 1, 9);
    expect(kq?.goc[0]?.sl).toBe(2);
    expect(kq?.dich[0]).toMatchObject({ sl: 1, id: 9 });
  });
  it('suất tiêu thụ quy combo về món gốc', () => {
    expect(suatTieuThu([dong({ id_mon: 'combo_song_long', sl: 2 }), dong({ id_mon: 'tuy_tam' })]))
      .toEqual({ tuy_thuong: 4, tuy_tam: 1 });
  });
  it('suất còn lại của combo bị giới hạn bởi món gốc', () => {
    const menu: Mon[] = [
      { ...TAM, id: 'tuy_thuong', limit: 50, soldToday: 47 },
      { ...TAM, id: 'combo_song_long', limit: 10, soldToday: 0 },
    ];
    expect(suatConLai(menu, 'combo_song_long')).toBe(1);
  });
  it('đếm bát không tính quẩy và món tặng', () => {
    expect(demSoBat([dong({ sl: 2 }), dong({ id_mon: 'quay', sl: 5 }), dong({ isReward: true })])).toBe(2);
  });
  it('trừ kho quy đổi gram -> kg, giữ nguyên vị trí và phần tử rỗng', () => {
    const kho: (NguyenLieu | null)[] = [
      { id: 'thit_bo', ten: 'Thịt bò', ton: 10, limit: 5, dvt: 'kg', loai: 'chinh' },
      null,
      { id: 'trung', ten: 'Trứng', ton: 5, limit: 1, dvt: 'quả', loai: 'phu' },
    ];
    const kq = truKho(kho, [dong({ id_mon: 'combo_tam_chau', sl: 2 })]);
    expect(kq[0]?.ton).toBe(9.87);
    expect(kq[1]).toBeNull();
    expect(kq[2]?.ton).toBe(3);
    expect(kho[0]?.ton).toBe(10); // không sửa mảng gốc
  });
  it('veMang chịu được object thưa từ RTDB', () => {
    expect(veMang({ 0: 'a', 2: 'b' })).toEqual(['a', 'b']);
  });
});

describe('đơn QR của khách', () => {
  const MENU: Mon[] = [TAM, { id: 'tuy_thuong', ten: 'Túy Thượng', gia: 80000, loai: 'don' }];

  it('giá lấy từ menu, KHÔNG lấy giá khách gửi lên', () => {
    const kq = gopDonQR([], [{ id: 'tuy_thuong', ten: 'Túy Thượng', gia: 0, sl: 2 }], MENU, 5);
    expect(kq.items[0]).toMatchObject({ id_mon: 'tuy_thuong', gia: 80000, sl: 2, isSent: false });
  });
  it('khớp theo tên khi không có id', () => {
    expect(gopDonQR([], [{ ten: 'Túy Tâm', sl: 1 }], MENU).items[0]?.id_mon).toBe('tuy_tam');
  });
  it('cộng dồn vào dòng chưa gửi cùng ghi chú; tách dòng nếu khác ghi chú hoặc đã gửi bếp', () => {
    const co = [dong({ id: 1, sl: 1 }), dong({ id: 2, sl: 1, isSent: true })];
    const kq = gopDonQR(co, [
      { id: 'tuy_tam', ten: 'Túy Tâm', sl: 2 },
      { id: 'tuy_tam', ten: 'Túy Tâm', sl: 1, note: 'không hành' },
    ], MENU, 9);
    expect(kq.items).toHaveLength(3);
    expect(kq.items[0]?.sl).toBe(3);
    expect(kq.items[1]?.sl).toBe(1);
    expect(kq.items[2]).toMatchObject({ sl: 1, note: 'không hành', isSent: false });
  });
  it('bỏ qua món không có trong menu và số lượng không hợp lệ', () => {
    const kq = gopDonQR([], [{ ten: 'Món lạ', sl: 1 }, { id: 'tuy_tam', ten: 'Túy Tâm', sl: -3 }], MENU);
    expect(kq.items).toHaveLength(0);
    expect(kq.boQua).toEqual(['Món lạ', 'Túy Tâm']);
  });
  it('mức chờ bếp', () => {
    expect([mucChoBep(60), mucChoBep(200), mucChoBep(420)]).toEqual(['on', 'canh_bao', 'tre']);
  });
});

describe('phân quyền', () => {
  it('ADMIN luôn full_control', () => {
    expect(coQuyen({ quyen: tinhQuyen('ADMIN', 'Đại sứ Sạch Sẽ') }, 'payment')).toBe(true);
  });
  it('phục vụ được thanh toán, không được quản lý nhân sự', () => {
    const u = { quyen: tinhQuyen('STAFF', 'Đại sứ Ngoại Giao') };
    expect(coQuyen(u, 'payment')).toBe(true);
    expect(coQuyen(u, 'manage_staff')).toBe(false);
  });
  it('vai trò lạ / chưa đăng nhập -> không có quyền', () => {
    expect(coQuyen({ quyen: tinhQuyen('STAFF', 'xyz') }, 'order')).toBe(false);
    expect(coQuyen(null, 'order')).toBe(false);
  });
});
