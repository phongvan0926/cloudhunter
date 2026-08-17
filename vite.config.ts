import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

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
      plugins: [react()],
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
