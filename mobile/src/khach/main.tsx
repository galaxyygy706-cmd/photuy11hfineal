/* Trang gọi món QR của KHÁCH — entry riêng (khach.html), không đăng nhập, không tải màn nhân viên. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GoiMon } from './GoiMon';
import './khach.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoiMon />
  </StrictMode>,
);
