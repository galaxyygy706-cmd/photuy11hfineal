import { useEffect, useRef } from 'react';

/* NÚT QUAY LẠI (Android / vuốt cạnh iOS) đóng lớp trên cùng thay vì thoát app.

   Mô hình "một mục chặn": chỉ giữ ĐÚNG MỘT mục history thêm vào khi có ≥1 lớp đang mở
   (trang chi tiết đơn, lá sớ). Không đẩy 1 mục cho mỗi lớp, vì history.back() chạy bất đồng
   bộ — chuyển lá sớ A sang B trong cùng một lần render sẽ làm history lệch 1 bậc.
   - 0 -> 1 lớp: pushState một lần.
   - Bấm Back: đóng lớp trên cùng; nếu vẫn còn lớp thì đặt lại mục chặn.
   - Đóng bằng nút trên UI làm số lớp về 0: tự history.back() để gỡ mục chặn. */

const nganXep: (() => void)[] = [];
let boQuaPop = 0; // số popstate do chính app gây ra (history.back() ở trên) — không đóng lớp nào

function datMucChan() {
  history.pushState({ phoTuyLop: true }, '');
}

window.addEventListener('popstate', () => {
  if (boQuaPop > 0) {
    boQuaPop--;
  } else {
    nganXep.pop()?.();
  }
  if (nganXep.length > 0) datMucChan();
});

// PC: phím Esc đóng lớp trên cùng giống nút Back (app cũ có "ESC thông minh").
// Hộp xác nhận (ThongBao) tự bắt Esc trước và chặn lan truyền.
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !e.defaultPrevented && nganXep.length > 0) history.back();
});

export function useNutQuayLai(dangMo: boolean, dong: () => void): void {
  const dongRef = useRef(dong);
  dongRef.current = dong;

  useEffect(() => {
    if (!dangMo) return;
    let daDongBangBack = false;
    const xuLy = () => {
      daDongBangBack = true;
      dongRef.current();
    };
    nganXep.push(xuLy);
    if (nganXep.length === 1) datMucChan();
    return () => {
      if (daDongBangBack) return; // popstate đã gỡ khỏi ngăn xếp
      const i = nganXep.lastIndexOf(xuLy);
      if (i !== -1) nganXep.splice(i, 1);
      if (nganXep.length === 0) {
        boQuaPop++;
        history.back();
      }
    };
  }, [dangMo]);
}
