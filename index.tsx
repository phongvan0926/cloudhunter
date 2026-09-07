/// <reference types="vite-plugin-pwa/client" />
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { importKeyFromUrlHash } from './services/modelDiscoveryService';
import { initPwaUpdate } from './services/pwaUpdate';

// Nhận API key chuyển từ thiết bị khác qua link/QR (#gkey=...) TRƯỚC khi render
importKeyFromUrlHash();

// PWA: cache app shell + dữ liệu đã tải để dùng offline trên núi. Bản mới KHÔNG tự reload —
// app hiện thanh hỏi, người dùng chọn lúc (xem services/pwaUpdate.ts).
initPwaUpdate();

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
