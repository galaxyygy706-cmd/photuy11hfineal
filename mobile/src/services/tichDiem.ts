/* TÍCH ĐIỂM HỘI VIÊN — port logic từ addItem (app.js:2223) và xoaMon (app.js:4140).
   Điểm được cộng NGAY khi gọi món (không phải lúc thanh toán), trừ lại khi xoá món.

   Luật (giữ nguyên app cũ):
   - Mỗi bát Túy Tâm/Túy Thượng (kể cả trong combo) +1 vào bộ đếm tương ứng.
   - Đã đủ ≥10 bát mà gọi tiếp món có tích điểm -> KHÔNG thêm món vừa bấm, thay bằng
     1 "Túy Thượng (Ưu đãi mốc 10)": 0đ nếu khách chủ yếu ăn Túy Thượng, 50.000đ
     (bù chênh lệch nâng cấp) nếu chủ yếu ăn Túy Tâm. Reset cả 2 bộ đếm về 0.
   - Chạm mốc 5 bát -> tặng 1 Quẩy 0đ.
     SỬA BUG: app cũ so `tongSau === 5`, nên combo Song Long (+2 bát) đi từ 4 lên 6
     là bỏ lỡ quà. Ở đây dùng "vượt qua mốc 5". */

import type { HoiVien } from '../types/duLieu';
import { soBatCuaMon } from './dinhLuong';

export type KetQuaTichDiem =
  | { loai: 'khong_tich'; boDem: BoDem }
  | { loai: 'cong_diem'; boDem: BoDem; tangQuay: boolean }
  | { loai: 'uu_dai_moc_10'; boDem: BoDem; giaUuDai: number };

export interface BoDem {
  tuy_tam_count: number;
  tuy_thuong_count: number;
}

export function docBoDem(kh: Partial<HoiVien> | null | undefined): BoDem {
  return {
    tuy_tam_count: Number(kh?.tuy_tam_count) || 0,
    tuy_thuong_count: Number(kh?.tuy_thuong_count) || 0,
  };
}

export function tongBat(b: BoDem): number {
  return b.tuy_tam_count + b.tuy_thuong_count;
}

export function xuLyTichDiemKhiThemMon(kh: Partial<HoiVien> | null | undefined, idMon: string): KetQuaTichDiem {
  const truoc = docBoDem(kh);
  const cong = soBatCuaMon(idMon);
  if (cong.tam === 0 && cong.thuong === 0) return { loai: 'khong_tich', boDem: truoc };

  if (tongBat(truoc) >= 10) {
    const giaUuDai = truoc.tuy_thuong_count >= truoc.tuy_tam_count ? 0 : 50000;
    return { loai: 'uu_dai_moc_10', boDem: { tuy_tam_count: 0, tuy_thuong_count: 0 }, giaUuDai };
  }

  const sau: BoDem = {
    tuy_tam_count: truoc.tuy_tam_count + cong.tam,
    tuy_thuong_count: truoc.tuy_thuong_count + cong.thuong,
  };
  const tangQuay = tongBat(truoc) < 5 && tongBat(sau) >= 5;
  return { loai: 'cong_diem', boDem: sau, tangQuay };
}

/** Trừ điểm khi giảm 1 đơn vị của một dòng món (không áp dụng cho món tặng). */
export function xuLyTichDiemKhiBotMon(kh: Partial<HoiVien> | null | undefined, idMon: string): BoDem {
  const truoc = docBoDem(kh);
  const tru = soBatCuaMon(idMon);
  return {
    tuy_tam_count: Math.max(0, truoc.tuy_tam_count - tru.tam),
    tuy_thuong_count: Math.max(0, truoc.tuy_thuong_count - tru.thuong),
  };
}
