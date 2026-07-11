
import React, { useState } from 'react';
import { Header } from './components/Header';
import { InputForm } from './components/InputForm';
import { AnalysisResult } from './components/AnalysisResult';
import { LocationConfirm } from './components/LocationConfirm';
import { CloudAnalysis, WeatherInput, LocationAnalysis } from './types';
import { analyzeWeatherData, analyzeLocation } from './services/geminiService';

const App: React.FC = () => {
  const [analysis, setAnalysis] = useState<CloudAnalysis | null>(null);
  const [locationAnalysis, setLocationAnalysis] = useState<LocationAnalysis | null>(null);
  const [pendingInput, setPendingInput] = useState<WeatherInput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputSubmit = async (data: WeatherInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const locAnalysis = await analyzeLocation(data.locationName, data.model);
      setLocationAnalysis(locAnalysis);
      setPendingInput({
        ...data,
        lat: locAnalysis.lat,
        lon: locAnalysis.lon
      });
    } catch (err) {
      setError("Không thể nhận diện địa điểm. Vui lòng thử lại.");
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
      setLocationAnalysis(null); // Hide confirmation after success
    } catch (err) {
      setError("Có lỗi xảy ra trong quá trình phân tích lịch trình. Vui lòng thử lại.");
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
            <div className="max-w-2xl mx-auto bg-red-900/30 border border-red-500 text-red-200 p-4 rounded-lg mb-6 text-center">
              {error}
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
    </div>
  );
};

export default App;
