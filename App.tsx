import React, { useState } from 'react';
import { Header } from './components/Header';
import { InputForm } from './components/InputForm';
import { AnalysisResult } from './components/AnalysisResult';
import { LocationConfirm } from './components/LocationConfirm';
import { ApiKeyModal } from './components/ApiKeyModal';
import { CloudAnalysis, WeatherInput, LocationAnalysis } from './types';
import { analyzeWeatherData, analyzeLocation } from './services/geminiService';
import { listRuns, loadRun, saveRun } from './services/historyService';

const App: React.FC = () => {
  const [analysis, setAnalysis] = useState<CloudAnalysis | null>(null);
  const [locationAnalysis, setLocationAnalysis] = useState<LocationAnalysis | null>(null);
  const [pendingInput, setPendingInput] = useState<WeatherInput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [historyList, setHistoryList] = useState(() => listRuns());

  const handleLoadHistory = (id: string) => {
    const saved = loadRun(id);
    if (saved) setAnalysis(saved);
  };

  const handleInputSubmit = async (data: WeatherInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const locAnalysis = await analyzeLocation(data.locationName, data.model);
      setLocationAnalysis(locAnalysis);
      // Kẹp độ cao đứng theo núi THẬT: slider mặc định 2200m từng cao hơn cả đỉnh
      // (vd Bà Đen 986m) → ΔH sai toàn bộ. Vượt đỉnh thì hạ về vị trí gợi ý/đỉnh.
      const peak = locAnalysis.estimated_elevation;
      let obsAlt = data.observerAlt;
      if (typeof obsAlt === 'number' && typeof peak === 'number' && peak > 0 && obsAlt > peak) {
        const suggested = locAnalysis.suggested_observer_alt;
        obsAlt = typeof suggested === 'number' && suggested > 0 && suggested <= peak ? suggested : peak;
      }
      setPendingInput({
        ...data,
        observerAlt: obsAlt,
        lat: locAnalysis.lat,
        lon: locAnalysis.lon
      });
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('403') || msg.includes('leaked') || msg.includes('Xác thực thất bại')) {
        setError("⚠️ API Key Gemini không hợp lệ hoặc đã bị vô hiệu hóa. Nhấp nút bên dưới để nhập API Key cá nhân.");
      } else if (msg.includes('Không nhận diện được địa điểm')) {
        setError(msg); // lỗi trung thực từ bộ phân giải địa danh — hiển thị nguyên văn
      } else {
        setError(`Không thể nhận diện địa điểm: ${msg}`);
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmLocation = async () => {
    if (!pendingInput || !locationAnalysis) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await analyzeWeatherData(pendingInput);
      setAnalysis(result);
      saveRun(result);
      setHistoryList(listRuns());
      setLocationAnalysis(null); // Hide confirmation after success
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('403') || msg.includes('leaked') || msg.includes('Xác thực thất bại')) {
        setError("⚠️ API Key Gemini không hợp lệ hoặc đã bị vô hiệu hóa. Nhấp nút bên dưới để nhập API Key cá nhân.");
      } else if (msg.includes('Open-Meteo') || msg.includes('Elevation')) {
        setError(`Không lấy được dữ liệu khí tượng (${msg}). Kiểm tra kết nối mạng rồi thử lại — app không hiển thị số liệu bịa thay thế.`);
      } else {
        setError(`Có lỗi khi phân tích: ${msg}`);
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelLocation = () => {
    setLocationAnalysis(null);
    setPendingInput(null);
  };

  const handleReset = () => {
    setAnalysis(null);
    setLocationAnalysis(null);
    setPendingInput(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-white font-sans">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-blue-900/10 to-transparent"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-900/10 blur-[100px] rounded-full"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 pb-12">
        <Header />
        
        <main className="transition-all duration-500 ease-in-out">
          {error && (
            <div className="max-w-2xl mx-auto bg-red-900/40 border border-red-500 text-red-200 p-5 rounded-2xl mb-6 text-center shadow-xl space-y-3">
              <p className="font-semibold text-sm leading-relaxed">{error}</p>
              <button
                onClick={() => setIsApiKeyModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-xs border border-red-400 transition-all shadow-md inline-flex items-center gap-1.5"
              >
                <span>🔑</span>
                <span>Cấu hình API Key Mới Tùy Chỉnh ngay</span>
              </button>
            </div>
          )}

          {!analysis ? (
            locationAnalysis && pendingInput ? (
              <LocationConfirm 
                analysis={locationAnalysis} 
                inputData={pendingInput} 
                onConfirm={handleConfirmLocation} 
                onCancel={handleCancelLocation} 
                isLoading={isLoading} 
              />
            ) : (
              <div className="animate-fade-in-up">
                <InputForm onSubmit={handleInputSubmit} isLoading={isLoading} />
                {historyList.length > 0 && (
                  <div className="max-w-xl mx-auto mt-4">
                    <span className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">
                      🕘 Lần tra gần đây (mở lại tức thì, không tốn API)
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {historyList.map(h => (
                        <button
                          key={h.id}
                          onClick={() => handleLoadHistory(h.id)}
                          className="px-3 py-1.5 rounded-full text-xs bg-slate-800/80 text-slate-300 border border-slate-700 hover:border-cyan-500 hover:text-cyan-300 transition-all"
                          title={`Dự báo lưu lúc ${new Date(h.savedAt).toLocaleString('vi-VN')} — dùng để đối chiếu với thực tế sau chuyến đi`}
                        >
                          {h.locationName} · {h.dateRange}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          ) : (
            <AnalysisResult result={analysis} onReset={handleReset} />
          )}
        </main>
        
        <footer className="mt-16 text-center text-slate-600 text-sm">
          <p>© 2026 CloudHunter AI. Dữ liệu mang tính chất tham khảo. Luôn kiểm tra thời tiết thực tế.</p>
        </footer>
      </div>

      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onKeyUpdated={() => window.location.reload()}
      />
    </div>
  );
};

export default App;
