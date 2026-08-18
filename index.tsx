/// <reference types="vite-plugin-pwa/client" />
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { importKeyFromUrlHash } from './services/modelDiscoveryService';
import { registerSW } from 'virtual:pwa-register';

// Nhận API key chuyển từ thiết bị khác qua link/QR (#gkey=...) TRƯỚC khi render
importKeyFromUrlHash();

// PWA: cache app shell + dữ liệu đã tải để dùng offline trên núi (tự cập nhật bản mới)
registerSW({ immediate: true });

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
