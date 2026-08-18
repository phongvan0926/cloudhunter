import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { getStoredApiKey, setStoredApiKey, discoverModels, buildKeyTransferUrl } from '../services/modelDiscoveryService';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyUpdated?: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onKeyUpdated }) => {
  const [apiKey, setApiKey] = useState<string>(getStoredApiKey());
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Chuẩn dialog: Esc để đóng, khóa scroll nền, focus vào ô nhập khi mở
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    inputRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const storedKey = getStoredApiKey();

  const handleShowQr = async () => {
    if (!storedKey) return;
    if (qrDataUrl) { setQrDataUrl(null); return; } // bấm lần nữa để ẩn
    const url = buildKeyTransferUrl(storedKey);
    const dataUrl = await QRCode.toDataURL(url, { width: 220, margin: 1, color: { dark: '#0f172a', light: '#e2e8f0' } });
    setQrDataUrl(dataUrl);
  };

  const handleCopyLink = async () => {
    if (!storedKey) return;
    try {
      await navigator.clipboard.writeText(buildKeyTransferUrl(storedKey));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard bị chặn thì thôi, QR vẫn dùng được */ }
  };

  const handleTestAndSave = async () => {
    setTesting(true);
    setTestResult(null);

    const trimmed = apiKey.trim();
    if (!trimmed) {
      setTestResult({ success: false, message: 'Vui lòng nhập API Key' });
      setTesting(false);
      return;
    }

    try {
      const models = await discoverModels(trimmed);
      if (models.length > 0) {
        setStoredApiKey(trimmed);
        setTestResult({ 
          success: true, 
          message: `✅ Kết nối thành công! Đã tìm thấy ${models.length} model khả dụng.` 
        });
        if (onKeyUpdated) onKeyUpdated();
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setTestResult({ success: false, message: 'API Key không hợp lệ hoặc không truy cập được model nào.' });
      }
    } catch (err: any) {
      setTestResult({ 
        success: false, 
        message: err?.message?.includes('AUTH') || err?.message?.includes('leaked')
          ? '❌ Key bị vô hiệu hóa do công khai (Leaked) hoặc không hợp lệ. Vui lòng tạo Key mới tại AI Studio.'
          : `❌ Lỗi xác thực: ${err?.message || 'Không thể kiểm tra'}`
      });
    } finally {
      setTesting(false);
    }
  };

  const handleClearKey = () => {
    setStoredApiKey('');
    setApiKey('');
    setTestResult({ success: true, message: 'Đã xóa Key tùy chỉnh. Đang sử dụng Key mặc định.' });
    if (onKeyUpdated) onKeyUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Cấu hình Gemini API Key"
        onClick={e => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative max-h-[90vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          aria-label="Đóng hộp thoại"
          className="absolute top-4 right-4 min-w-11 min-h-11 flex items-center justify-center text-slate-400 hover:text-white rounded-full hover:bg-slate-800"
        >
          ✕
        </button>

        <h3 className="text-xl font-bold text-cyan-400 mb-2 flex items-center gap-2">
          <span>🔑</span>
          <span>Cấu hình Gemini API Key</span>
        </h3>
        <p className="text-slate-300 text-xs mb-4 leading-relaxed">
          Nếu Key mặc định bị quá hạn hoặc bị Google vô hiệu hóa (Leaked Key), bạn có thể nhập Key Gemini cá nhân tại đây. Key được lưu an toàn trên trình duyệt của bạn (localStorage).
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              GEMINI API KEY CỦA BẠN
            </label>
            <input
              ref={inputRef}
              type="password"
              aria-label="Gemini API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-slate-950 text-slate-100 border border-slate-700 rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-cyan-500 transition-all"
            />
          </div>

          {testResult && (
            <div className={`p-3 rounded-xl text-xs ${testResult.success ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-200' : 'bg-rose-950/80 border border-rose-500/50 text-rose-200'}`}>
              {testResult.message}
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={handleTestAndSave}
              disabled={testing}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs tracking-wider transition-all shadow-lg flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {testing ? '⏳ Đang kiểm tra Key...' : '💾 Kiểm Tra & Lưu Key'}
            </button>

            <div className="flex justify-between items-center text-xs mt-2">
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>👉 Lấy API Key miễn phí tại Google AI Studio</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </a>

              {apiKey && (
                <button
                  onClick={handleClearKey}
                  className="text-slate-400 hover:text-rose-400 text-[11px] underline"
                >
                  Xóa Key
                </button>
              )}
            </div>

            {/* Chuyển key sang thiết bị khác qua QR / link (#gkey — fragment không lên server) */}
            {storedKey && (
              <div className="mt-3 pt-3 border-t border-slate-700/60">
                <div className="flex gap-2">
                  <button
                    onClick={handleShowQr}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 font-bold text-xs transition-all"
                  >
                    {qrDataUrl ? '🙈 Ẩn mã QR' : '📱 Dùng trên thiết bị khác (QR)'}
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 font-bold text-xs transition-all"
                  >
                    {copied ? '✅ Đã chép link!' : '🔗 Chép link chuyển key'}
                  </button>
                </div>
                {qrDataUrl && (
                  <div className="mt-3 flex flex-col items-center gap-2 bg-slate-950/60 rounded-2xl p-4 border border-slate-700/50">
                    <img src={qrDataUrl} alt="QR chuyển API key" className="rounded-lg" width={220} height={220} />
                    <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                      Mở camera/trình quét QR trên thiết bị kia → mở link → key tự lưu vào thiết bị đó
                      và tự xóa khỏi thanh địa chỉ.
                    </p>
                  </div>
                )}
                <p className="text-[10px] text-amber-300/80 mt-2 leading-relaxed">
                  ⚠️ Link/QR này CHỨA key của bạn — chỉ quét/gửi cho chính mình, đừng đăng công khai.
                  Key không đi qua server nào (nằm trong phần #fragment của link).
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
