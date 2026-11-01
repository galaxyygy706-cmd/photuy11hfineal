/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // Build ra thư mục ../m để Firebase Hosting (public: ".") phục vụ app mới tại /m/,
  // chạy song song với app cũ ở / trong giai đoạn chuyển đổi.
  base: '/m/',
  build: {
    outDir: '../m',
    emptyOutDir: true,
    // 2 trang: app nhân viên (index.html) + trang gọi món QR của khách (khach.html, không đăng nhập,
    // bundle riêng nên khách không phải tải màn hình nhân viên/Firebase Auth).
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        khach: fileURLToPath(new URL('./khach.html', import.meta.url)),
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/*'],
      manifest: {
        name: 'Phở Túy POS',
        short_name: 'Phở Túy',
        description: 'Bán hàng Phở Túy trên điện thoại — sơ đồ bàn, gọi món, thanh toán.',
        lang: 'vi',
        id: '/m/',
        start_url: '/m/',
        scope: '/m/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f6f6f6',
        theme_color: '#d32f2f',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Chỉ cache "vỏ" app. Dữ liệu Firebase đi qua WebSocket/long-poll, không bao giờ vào cache.
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        navigateFallback: '/m/index.html',
        // Máy nhân viên đã cài PWA mở link QR khách thì phải ra đúng trang khách, không bị đổi sang app nhân viên
        navigateFallbackDenylist: [/^\/m\/khach/],
        runtimeCaching: [
          {
            // Ảnh món ăn (postimg) -> dùng bản cache trước cho nhanh, cập nhật nền.
            urlPattern: ({ url }) => url.hostname === 'i.postimg.cc',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'anh-mon', expiration: { maxEntries: 60 } },
          },
        ],
      },
    }),
  ],
  test: { environment: 'node' },
});
