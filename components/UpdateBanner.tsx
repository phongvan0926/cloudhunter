import React, { useEffect, useState } from 'react';
import { subscribePwa, hasUpdate, applyUpdate, dismissUpdate } from '../services/pwaUpdate';

/**
 * Thanh "có bản mới" — thay cho việc app tự reload giữa chừng (xem services/pwaUpdate.ts).
 * Đặt cố định dưới đáy màn hình để không đẩy nội dung đang đọc.
 */
export const UpdateBanner: React.FC = () => {
  const [show, setShow] = useState(hasUpdate());
  useEffect(() => subscribePwa(() => setShow(hasUpdate())), []);
  if (!show) return null;
  return (
    <div className="fixed bottom-3 inset-x-3 z-50 max-w-md mx-auto animate-fade-in-up">
      <div className="flex items-center gap-3 bg-slate-900/95 backdrop-blur-md border border-cyan-500/50 rounded-2xl px-4 py-3 shadow-2xl">
        <span className="text-lg">✨</span>
        <span className="flex-1 text-xs text-slate-200 leading-snug">
          Có bản CloudHunter mới. Tải lại để dùng — <b className="text-slate-400 font-normal">kết quả đang xem sẽ mất</b>.
        </span>
        <button onClick={dismissUpdate}
          className="shrink-0 min-h-9 px-3 rounded-xl text-xs text-slate-400 hover:text-slate-200 transition-colors">
          Để sau
        </button>
        <button onClick={applyUpdate}
          className="shrink-0 min-h-9 px-3.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors">
          Tải lại
        </button>
      </div>
    </div>
  );
};
