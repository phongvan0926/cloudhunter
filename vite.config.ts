import fs from 'fs';
import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// Chép vercel.json vào dist: nhánh gh-pages publish từ dist, và Vercel đọc
// config từ commit được deploy — nhờ đó Vercel bỏ qua các push lên gh-pages.
function copyVercelJson(): Plugin {
  return {
    name: 'copy-vercel-json',
    closeBundle() {
      const src = path.resolve(__dirname, 'vercel.json');
      const dest = path.resolve(__dirname, 'dist/vercel.json');
      if (fs.existsSync(src)) fs.copyFileSync(src, dest);
    },
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    // Vercel serve ở gốc domain (base '/'); chỉ GitHub Pages cần '/cloudhunter/'.
    // Vercel luôn set biến môi trường VERCEL=1 khi build.
    const onVercel = !!process.env.VERCEL;
    return {
      base: mode === 'production' && !onVercel ? '/cloudhunter/' : '/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        tailwindcss(),
        copyVercelJson(),
        // PWA offline: app shell precache + cache dữ liệu Open-Meteo NetworkFirst —
        // trekker mất sóng trên đèo vẫn mở lại được app và dự báo đã tải.
        // Scope/start_url tự lấy theo `base` nên build GH Pages và Vercel đều đúng.
        VitePWA({
          // 'prompt', KHÔNG phải 'autoUpdate': autoUpdate sinh SW skipWaiting + tự gọi
          // window.location.reload() ngay khi có bản deploy mới, cắt ngang việc người dùng
          // đang làm (lỗi thật 07/09/2026 — xem services/pwaUpdate.ts). Nay bản mới đợi
          // người dùng bấm.
          registerType: 'prompt',
          includeAssets: ['pwa-192.png', 'pwa-512.png', 'pwa-maskable-512.png'],
          manifest: {
            name: 'CloudHunter AI — Dự báo Biển Mây',
            short_name: 'CloudHunter',
            description: 'Dự báo biển mây cho trekking & nhiếp ảnh núi cao Việt Nam — engine deterministic, 6 mô hình toàn cầu.',
            theme_color: '#0f172a',
            background_color: '#020617',
            display: 'standalone',
            lang: 'vi',
            icons: [
              { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
              { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
              { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
            ],
          },
          workbox: {
            // clientsClaim: SW nhận quyền ngay ở LẦN TRUY CẬP ĐẦU → offline dùng được luôn,
            //   không phải đợi tải lại lần hai (mặc định của chế độ 'prompt' là false).
            // skipWaiting FALSE: bản mới cài xong thì ĐỢI người dùng bấm, không giành quyền
            //   giữa chừng. Hai cờ này độc lập — đây mới là chỗ quyết định "có tự reload không".
            clientsClaim: true,
            skipWaiting: false,
            runtimeCaching: [
              {
                // dự báo/DEM/geocoding Open-Meteo: mạng trước, offline dùng bản đã tải (tối đa 12h)
                urlPattern: /^https:\/\/(api|air-quality-api|geocoding-api)\.open-meteo\.com\//,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'open-meteo',
                  networkTimeoutSeconds: 8,
                  expiration: { maxEntries: 60, maxAgeSeconds: 12 * 3600 },
                },
              },
              {
                urlPattern: /^https:\/\/nominatim\.openstreetmap\.org\//,
                handler: 'NetworkFirst',
                options: { cacheName: 'nominatim', networkTimeoutSeconds: 8, expiration: { maxEntries: 30, maxAgeSeconds: 7 * 86400 } },
              },
              {
                urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
                handler: 'StaleWhileRevalidate',
                options: { cacheName: 'font-css', expiration: { maxEntries: 8, maxAgeSeconds: 30 * 86400 } },
              },
              {
                urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
                handler: 'CacheFirst',
                options: { cacheName: 'font-files', expiration: { maxEntries: 16, maxAgeSeconds: 365 * 86400 } },
              },
              // Ảnh vệ tinh JMA có timestamp trong URL — không cache (mỗi URL chỉ dùng 1 lần)
            ],
          },
        }),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
