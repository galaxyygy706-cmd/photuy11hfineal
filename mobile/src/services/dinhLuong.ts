/* Định lượng & ánh xạ món — port từ ../app.js (RECIPES, MENU_IMAGES, các if-else id món
   rải trong addItem/chuyenBuoc/xoaMon/renderTables). Gom về một chỗ để mọi nơi tính giống nhau. */

/** Gram/ml hoặc đơn vị đếm cho mỗi suất. kg/lít trong kho được quy đổi /1000 khi trừ. (app.js:99) */
export const RECIPES: Record<string, Record<string, number>> = {
  tuy_tam: { banh_pho: 150, thit_bo: 65, nuoc_dung: 350 },
  tuy_thuong: { banh_pho: 200, thit_bo: 65, nuoc_dung: 350 },
  hoa_chau: { trung: 1 },
  tiem_thuy: { trung: 1 },
  quay: { quay: 4 },
  combo_thuong_thuy: { banh_pho: 200, thit_bo: 65, nuoc_dung: 350, trung: 1 },
  combo_tam_chau: { banh_pho: 150, thit_bo: 65, nuoc_dung: 350, trung: 1 },
  combo_song_long: { banh_pho: 400, thit_bo: 130, nuoc_dung: 700, trung: 2, quay: 4 },
};

/** Ảnh món dự phòng khi menu trên Firebase không có `img`. (app.js:2297) */
export const MENU_IMAGES: Record<string, string> = {
  tuy_tam: 'https://i.postimg.cc/8cd71X1v/tam.png',
  tuy_thuong: 'https://i.postimg.cc/Y0NvpDpY/Thuong.png',
  tiem_thuy: 'https://i.postimg.cc/GtP4cgcv/Tiem-thuy.png',
  hoa_chau: 'https://i.postimg.cc/cCGKGGNR/Hoa-chau.png',
  quay: 'https://i.postimg.cc/W4Qz0czM/quay.png',
  combo_thuong_thuy: 'https://i.postimg.cc/7h15xtx7/Thuong-thuy.png',
  combo_tam_chau: 'https://i.postimg.cc/mkWcWWGw/Tam-chau.png',
  combo_song_long: 'https://i.postimg.cc/SRbXbbpD/Song-long.png',
};

export function anhMon(idMon: string, img?: string): string | undefined {
  return img || MENU_IMAGES[idMon];
}

/** Mỗi món "ăn" mấy bát Túy Tâm / Túy Thượng. Dùng chung cho: tích điểm hội viên,
    trừ suất bán (soldToday), đếm số khách trên sơ đồ bàn, totalBowls khi thanh toán. */
export function soBatCuaMon(idMon: string): { tam: number; thuong: number } {
  switch (idMon) {
    case 'tuy_tam':
    case 'combo_tam_chau':
      return { tam: 1, thuong: 0 };
    case 'tuy_thuong':
    case 'combo_thuong_thuy':
      return { tam: 0, thuong: 1 };
    case 'combo_song_long':
      return { tam: 0, thuong: 2 };
    default:
      return { tam: 0, thuong: 0 };
  }
}

/** Tổng số bát (suất phở) trong danh sách dòng món. Món tặng không tính. */
export function demSoBat(items: readonly { id_mon: string; sl: number; isReward?: boolean }[]): number {
  return items.reduce((tong, i) => {
    if (i.isReward) return tong;
    const b = soBatCuaMon(i.id_mon);
    return tong + (b.tam + b.thuong) * (Number(i.sl) || 0);
  }, 0);
}
