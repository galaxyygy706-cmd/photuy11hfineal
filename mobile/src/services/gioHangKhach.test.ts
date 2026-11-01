import { describe, expect, it } from 'vitest';
import { conThemDuoc, demMon, doiSoLuong, mucSuat, suaGhiChu, taoDonQR, themVaoGio, tinhTienGio } from './gioHangKhach';
import { gopDonQR } from './donHangThuan';
import type { Mon } from '../types/duLieu';

const MENU: Mon[] = [
  { id: 'tuy_tam', ten: 'Túy Tâm', gia: 50000, loai: 'don', limit: 10, soldToday: 7 },
  { id: 'tuy_thuong', ten: 'Túy Thượng', gia: 80000, loai: 'don', limit: 5, soldToday: 0 },
  { id: 'quay', ten: 'Quẩy', gia: 10000, loai: 'don' },
  { id: 'combo_tam_chau', ten: 'Combo Tâm Châu', gia: 55000, loai: 'combo', desc: '1 Túy Tâm + 1 Hỏa Châu' },
];

describe('giỏ hàng khách', () => {
  it('thêm cùng món thì cộng dồn, dòng đã ghi chú thì mở dòng mới', () => {
    let g = themVaoGio([], 'tuy_tam', 1);
    g = themVaoGio(g, 'tuy_tam', 2);
    expect(g).toEqual([{ ma: 1, idMon: 'tuy_tam', sl: 2, note: '' }]);
    g = suaGhiChu(g, 1, 'ít hành');
    g = themVaoGio(g, 'tuy_tam', 3);
    expect(g.map((d) => [d.sl, d.note])).toEqual([[2, 'ít hành'], [1, '']]);
    expect(demMon(g)).toBe(3);
  });

  it('bớt về 0 thì bỏ dòng', () => {
    const g = doiSoLuong(themVaoGio([], 'quay', 1), 1, -1);
    expect(g).toEqual([]);
  });

  it('tiền lấy giá từ menu + VAT 2% (giống khach.html: làm tròn VAT)', () => {
    const g = [{ ma: 1, idMon: 'tuy_tam', sl: 1, note: '' }, { ma: 2, idMon: 'quay', sl: 3, note: '' }];
    expect(tinhTienGio(g, MENU)).toEqual({ tamTinh: 80000, tienGiam: 0, tienVat: 1600, tongCong: 81600 });
  });

  it('suất còn thêm được trừ cả bát combo đang nằm trong giỏ', () => {
    expect(conThemDuoc(MENU, [], 'tuy_tam')).toBe(3);
    const g = [{ ma: 1, idMon: 'combo_tam_chau', sl: 2, note: '' }];
    expect(conThemDuoc(MENU, g, 'tuy_tam')).toBe(1);
    expect(conThemDuoc(MENU, g, 'combo_tam_chau')).toBe(1);
    expect(conThemDuoc(MENU, [], 'quay')).toBe(Infinity);
  });

  it('đơn gửi đúng định dạng pending_qr_orders, bỏ món đã xoá khỏi menu, không có undefined', () => {
    const g = [
      { ma: 1, idMon: 'tuy_tam', sl: 2, note: '  ít hành ' },
      { ma: 2, idMon: 'mon_da_xoa', sl: 1, note: '' },
    ];
    const don = taoDonQR(g, MENU, 3, 1000);
    expect(don).toEqual({
      tableId: '3', timestamp: 1000, status: 'waiting',
      items: [{ id: 'tuy_tam', ten: 'Túy Tâm', gia: 50000, sl: 2, note: 'ít hành', desc: '' }],
    });
    expect(JSON.stringify(don)).not.toContain('undefined');
  });

  it('màn duyệt đơn của nhân viên (gopDonQR) đọc được đơn khách gửi', () => {
    const don = taoDonQR([{ ma: 1, idMon: 'combo_tam_chau', sl: 1, note: '' }], MENU, 1, 5);
    const { items, boQua } = gopDonQR([], don.items, MENU, 5);
    expect(boQua).toEqual([]);
    expect(items[0]).toMatchObject({ id_mon: 'combo_tam_chau', sl: 1, gia: 55000, isSent: false });
  });

  it('mức suất: ngưỡng sắp hết Túy Tâm 25, Túy Thượng 15', () => {
    expect(mucSuat('tuy_tam', 26)).toBe('du');
    expect(mucSuat('tuy_tam', 25)).toBe('sap_het');
    expect(mucSuat('tuy_thuong', 16)).toBe('du');
    expect(mucSuat('tuy_thuong', 0)).toBe('het');
  });
});
