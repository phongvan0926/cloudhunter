import React from 'react';
import { getStoredApiKey } from '../services/modelDiscoveryService';

// Modal API key do App quản lý DUY NHẤT một instance (trước đây Header mount thêm
// một modal riêng → 2 instance với state lệch nhau, lỗi audit #3)
export const Header: React.FC<{ onOpenApiKey: () => void; compact?: boolean }> = ({ onOpenApiKey, compact }) => {
  const activeKey = getStoredApiKey();

  // compact = đang xem kết quả: bỏ logo lớn + chip giới thiệu (~400px) để phán quyết
  // nằm ngay màn hình đầu thay vì dưới nếp gấp
  return (
    <header className={`px-4 relative ${compact ? 'pt-4 pb-2' : 'pt-12 pb-8 text-center'}`}>
      <div className="flex justify-end max-w-5xl mx-auto mb-2">
        <button
          onClick={onOpenApiKey}
          aria-label="Cấu hình Gemini API Key"
          className={`min-h-11 px-4 py-2 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 shadow-md ${
            activeKey 
              ? 'bg-slate-900/80 text-cyan-400 border-cyan-500/40 hover:border-cyan-400' 
              : 'bg-rose-950/80 text-rose-300 border-rose-500/50 animate-pulse'
          }`}
        >
          <span>🔑</span>
          <span>{activeKey ? 'Đã Cấu Hình Key Gemini' : '⚠️ Nhập API Key'}</span>
        </button>
      </div>

      {!compact && (
        <>
          <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400 tracking-tighter mb-4 filter drop-shadow-lg">
            CloudHunter AI v5
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Chuyên gia khí tượng lai & dẫn đường cho những kẻ mộng mơ săn mây Tây Bắc.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <span className="px-3 py-1 bg-slate-800 rounded-full text-xs font-mono text-cyan-500 border border-slate-700">Engine deterministic — số không bịa</span>
            <span className="px-3 py-1 bg-purple-900/40 rounded-full text-xs font-mono text-purple-400 border border-purple-700/50">6 mô hình: ECMWF · GFS · ICON · JMA · UKMO 10km · AIFS (AI)</span>
            <span className="px-3 py-1 bg-slate-800 rounded-full text-xs font-mono text-cyan-500 border border-slate-700">🤖 AI Gemini viết lời bình</span>
          </div>
        </>
      )}
    </header>
  );
};
