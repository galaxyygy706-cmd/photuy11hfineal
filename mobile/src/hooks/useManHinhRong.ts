import { createContext, useContext, useEffect, useState } from 'react';

/* GIAO DIỆN PC: từ 1025px trở lên (mốc 1024 của CLAUDE.md §4) app đổi sang khung máy tính —
   thanh bên trái + bán hàng 3 cột. Dưới mốc này giữ nguyên giao diện điện thoại. */
const TRUY_VAN = '(min-width: 1025px)';

export function useManHinhRong(): boolean {
  const [rong, setRong] = useState(() => window.matchMedia(TRUY_VAN).matches);
  useEffect(() => {
    const mq = window.matchMedia(TRUY_VAN);
    const doi = () => setRong(mq.matches);
    mq.addEventListener('change', doi);
    return () => mq.removeEventListener('change', doi);
  }, []);
  return rong;
}

/** true = trang đang được NHÚNG trong khung PC (không phủ toàn màn hình, không có nút quay lại,
    không chiếm nút Back của trình duyệt). */
export const NhungContext = createContext(false);
export const useNhung = () => useContext(NhungContext);
