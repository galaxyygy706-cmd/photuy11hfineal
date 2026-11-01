import { describe, expect, it } from 'vitest';
import {
  chuanHoaTen, docThoiGian, khoangKy, luongGio, mucTonKho, phanTramTang, soPhutCa, taoCSV, tinhTonMoi,
  tongHopDoanhThu, tongHopThuChi, vietThoiGian, xepHangHoiVien, type KhoanThuChi,
} from './quanLyThuan';
import type { LichSuDon } from '../types/duLieu';

const NOW = new Date(2026, 10, 4, 15, 0, 0); // Thứ Tư 04/11/2026 15:00

describe('đọc thời gian app cũ', () => {
  it('dạng "d/m/yyyy, hh:mm:ss"', () => {
    expect(docThoiGian('28/4/2026, 09:05:07')?.getTime()).toBe(new Date(2026, 3, 28, 9, 5, 7).getTime());
  });
  it('dạng mặc định "hh:mm:ss d/m/yyyy" (bộ lọc app cũ không đọc được)', () => {
    expect(docThoiGian('09:05:07 28/4/2026')?.getTime()).toBe(new Date(2026, 3, 28, 9, 5, 7).getTime());
  });
  it('chuỗi rác -> null', () => {
    expect(docThoiGian('abc')).toBeNull();
    expect(docThoiGian(undefined)).toBeNull();
  });
  it('ghi ra dạng app cũ đọc được, đọc lại khớp', () => {
    const d = new Date(2026, 0, 5, 7, 8, 9);
    expect(vietThoiGian(d)).toBe('5/1/2026, 07:08:09');
    expect(docThoiGian(vietThoiGian(d))?.getTime()).toBe(d.getTime());
  });
  it('tuần bắt đầu Thứ Hai', () => {
    expect(new Date(khoangKy('tuan', NOW)[0]).getDate()).toBe(2);
  });
});

describe('kho', () => {
  it('mức tồn', () => {
    expect([mucTonKho({ ton: 0, limit: 5 }), mucTonKho({ ton: 3, limit: 5 }), mucTonKho({ ton: 9, limit: 5 })])
      .toEqual(['het', 'sap_het', 'du']);
  });
  it('nhập 0.25kg không bị làm tròn mất', () => {
    expect(tinhTonMoi(9.74, 0.25)).toBe(9.99);
  });
});

describe('thu chi', () => {
  const k = (p: Partial<KhoanThuChi>): KhoanThuChi =>
    ({ loai: 'thu', so_tien: 0, noi_dung: '', danh_muc: 'Khác', phuong_thuc: 'Tiền mặt', thoi_gian: '', ...p });
  const ds = [
    { key: 'a', giaTri: k({ loai: 'thu', so_tien: 1_000_000, thoi_gian: '10:00:00 4/11/2026' }) }, // dạng mặc định
    { key: 'b', giaTri: k({ loai: 'chi', so_tien: 300_000, danh_muc: 'Nguyên liệu', thoi_gian: '4/11/2026, 08:00:00' }) },
    { key: 'c', giaTri: k({ loai: 'chi', so_tien: 50_000, thoi_gian: '1/10/2026, 08:00:00' }) },
    { key: 'd', giaTri: k({ loai: 'thu', so_tien: 7, timestamp: new Date(2026, 10, 4, 1).getTime(), thoi_gian: 'rác' }) },
  ];
  it('Hôm nay gồm cả khoản ghi theo dạng mặc định và khoản có timestamp', () => {
    const r = tongHopThuChi(ds, 'hom_nay', NOW);
    expect(r.ds.map((x) => x.key)).toEqual(['a', 'b', 'd']);
    expect([r.thu, r.chi, r.chenhLech]).toEqual([1_000_007, 300_000, 700_007]);
    expect(r.theoDanhMuc).toEqual({ 'Nguyên liệu': 300_000 });
  });
  it('Tất cả', () => {
    expect(tongHopThuChi(ds, 'tat_ca', NOW).chi).toBe(350_000);
  });
});

describe('báo cáo doanh thu', () => {
  const don = (p: Partial<LichSuDon>): LichSuDon => ({
    customerId: null, customerName: 'Khách vãng lai', customerPhone: '', tableName: 'Bàn 1', subTotal: 0,
    discount: 0, total: 0, totalBowls: 0, timestamp: 0, items: [], ...p,
  });
  const ngay = (d: number, h: number) => new Date(2026, 10, d, h).getTime();
  const ds = [
    { key: '1', giaTri: don({ total: 100_000, timestamp: ngay(4, 11), customerId: 'HV1', customerName: 'An',
      items: [{ id: 1, id_mon: 'tuy_tam', ten: 'Túy Tâm', gia: 50_000, sl: 2 }] }) },
    { key: '2', giaTri: don({ total: 80_000, timestamp: ngay(4, 12), discount: 5_000, tableName: 'Bar 2',
      items: [{ id: 2, id_mon: 'tuy_thuong', ten: 'Túy Thượng', gia: 80_000, sl: 1 }] }) },
    { key: '3', giaTri: don({ total: 60_000, timestamp: ngay(3, 11) }) },
  ];
  const [tu, den] = [ngay(4, 0), ngay(5, 0)];

  it('tổng, số đơn, TB, hội viên/vãng lai, theo giờ, món bán chạy', () => {
    const r = tongHopDoanhThu(ds, tu, den);
    expect([r.tong, r.soDon, r.trungBinh, r.hoiVien, r.vangLai, r.giamGia]).toEqual([180_000, 2, 90_000, 100_000, 80_000, 5_000]);
    expect(r.theoGio[11]).toBe(100_000);
    expect(r.topMon[0]).toEqual({ ten: 'Túy Tâm', sl: 2, tien: 100_000 });
    expect(r.ds[0]?.key).toBe('2'); // mới nhất trước
  });
  it('so với kỳ trước cùng độ dài', () => {
    expect(tongHopDoanhThu(ds, tu, den).kyTruoc).toEqual({ tong: 60_000, soDon: 1 });
    expect(phanTramTang(180_000, 60_000)).toBe(200);
    expect(phanTramTang(5, 0)).toBeNull();
  });
  it('lọc hội viên + tìm kiếm', () => {
    expect(tongHopDoanhThu(ds, tu, den, 'hoi_vien').tong).toBe(100_000);
    expect(tongHopDoanhThu(ds, tu, den, 'tat_ca', 'bar').soDon).toBe(1);
  });
});

describe('hội viên / nhân sự', () => {
  it('xếp hạng như app cũ', () => {
    expect([xepHangHoiVien(5_000_000, 1), xepHangHoiVien(0, 15), xepHangHoiVien(0, 2), xepHangHoiVien(0, 1)])
      .toEqual(['VIP', 'VIP', 'ACTIVE', 'NEW']);
  });
  it('chuẩn hoá tên', () => {
    expect(chuanHoaTen('  nguyễn   văn   AN ')).toBe('Nguyễn Văn An');
  });
  it('lương giờ', () => {
    expect(luongGio(7_500_000)).toBe(36058);
  });
  it('giờ công, kể cả ca qua nửa đêm', () => {
    expect(soPhutCa('05:00', '12:30')).toBe(450);
    expect(soPhutCa('17:00', '00:15')).toBe(435);
    expect(soPhutCa('17:00', '')).toBeNull();
  });
  it('CSV có BOM và escape dấu phẩy', () => {
    expect(taoCSV([['a', 'b,c'], [1, 'x"y']])).toBe('﻿a,"b,c"\r\n1,"x""y"');
  });
});
