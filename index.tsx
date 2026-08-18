import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { importKeyFromUrlHash } from './services/modelDiscoveryService';

// Nhận API key chuyển từ thiết bị khác qua link/QR (#gkey=...) TRƯỚC khi render
importKeyFromUrlHash();

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
