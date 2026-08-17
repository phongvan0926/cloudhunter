import React, { useState } from 'react';
import { ApiKeyModal } from './ApiKeyModal';
import { getStoredApiKey } from '../services/modelDiscoveryService';

export const Header: React.FC = () => {
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const activeKey = getStoredApiKey();

  return (
    <header className="pt-12 pb-8 text-center px-4 relative">
      <div className="flex justify-end max-w-5xl mx-auto mb-2">
        <button
          onClick={() => setIsKeyModalOpen(true)}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 shadow-md ${
            activeKey 
              ? 'bg-slate-900/80 text-cyan-400 border-cyan-500/40 hover:border-cyan-400' 
              : 'bg-rose-950/80 text-rose-300 border-rose-500/50 animate-pulse'
          }`}
        >
          <span>🔑</span>
          <span>{activeKey ? 'Đã Cấu Hình Key Gemini' : '⚠️ Nhập API Key'}</span>
        </button>
      </div>

      <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400 tracking-tighter mb-4 filter drop-shadow-lg">
        CloudHunter AI v5
      </h1>
      <p className="text-slate-400 text-lg max-w-xl mx-auto">
        Chuyên gia khí tượng lai & dẫn đường cho những kẻ mộng mơ săn mây Tây Bắc.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
         <span className="px-3 py-1 bg-slate-800 rounded-full text-xs font-mono text-cyan-500 border border-slate-700">Engine deterministic — số không bịa</span>
         <span className="px-3 py-1 bg-purple-900/40 rounded-full text-xs font-mono text-purple-400 border border-purple-700/50">3 mô hình ECMWF · GFS · ICON</span>
         <span className="px-3 py-1 bg-slate-800 rounded-full text-xs font-mono text-cyan-500 border border-slate-700">🤖 AI Gemini viết lời bình</span>
      </div>

      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        onKeyUpdated={() => window.location.reload()}
      />
    </header>
  );
};
