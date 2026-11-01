import { useRegisterSW } from 'virtual:pwa-register/react';

/* Báo có bản mới thay vì tự tải lại giữa lúc đang gọi món (app cũ phải nhớ tăng VERSION trong sw.js
   bằng tay; ở đây Workbox tự băm nội dung file nên mỗi lần build là một phiên bản mới). */
export function CapNhatApp() {
  const { needRefresh: [canCapNhat], updateServiceWorker } = useRegisterSW();
  if (!canCapNhat) return null;
  return (
    <div className="bao-cap-nhat" role="status">
      <span>Có bản cập nhật mới</span>
      <button className="nut nut-chinh" onClick={() => updateServiceWorker(true)}>Tải lại</button>
    </div>
  );
}
