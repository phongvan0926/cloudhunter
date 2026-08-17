import fs from 'fs';
import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

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
      plugins: [react(), tailwindcss(), copyVercelJson()],
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
