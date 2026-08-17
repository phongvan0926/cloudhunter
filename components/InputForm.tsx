import React, { useState, useMemo, useEffect } from 'react';
import { WeatherInput, PeakPreset } from '../types';
import { NORTHWEST_PEAKS } from '../constants';
import { MOUNTAIN_DB } from '../constants/mountains';
import { ModelSelector } from './ModelSelector';

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2-lat1);
  const dLon = deg2rad(lon2-lon1); 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI/180)
}

interface InputFormProps {
  onSubmit: (data: WeatherInput) => void;
  isLoading: boolean;
}

export const InputForm: React.FC<InputFormProps> = ({ onSubmit, isLoading }) => {
  // Default range: Today to +3 days
  const today = new Date();
  const threeDaysLater = new Date(today);
  threeDaysLater.setDate(today.getDate() + 3);

  const [formData, setFormData] = useState<WeatherInput>({
    locationName: '',
    startDate: today.toISOString().split('T')[0],
    endDate: threeDaysLater.toISOString().split('T')[0],
    observerAlt: 2200,
    model: undefined, // để engine model-discovery tự chọn model khả dụng mới nhất
  });

  const [suggestions, setSuggestions] = useState<{name: string, distance: number, altitude: number}[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const text = formData.locationName.trim();
      if (text.length < 3) {
        setSuggestions([]);
        return;
      }

      // Check if it's already a known peak
      const isKnown = NORTHWEST_PEAKS.some(p => p.name.toLowerCase() === text.toLowerCase() || p.name.toLowerCase().includes(text.toLowerCase()) || text.toLowerCase().includes(p.name.toLowerCase()));
      if (isKnown) {
        setSuggestions([]);
        return;
      }

      setIsSearching(true);
      try {
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(text)}&count=1&language=vi&format=json`;
        const res = await fetch(geoUrl);
        const data = await res.json();
        
        if (data.results && data.results.length > 0) {
          const { latitude, longitude } = data.results[0];
          
          const distances = Object.values(MOUNTAIN_DB).map(mt => {
            const dist = getDistanceFromLatLonInKm(latitude, longitude, mt.lat, mt.lon);
            return {
              name: mt.name,
              distance: Math.round(dist),
              altitude: mt.elevation
            };
          });
          
          // Sort by distance and take top 3
          distances.sort((a, b) => a.distance - b.distance);
          setSuggestions(distances.slice(0, 3));
        } else {
          setSuggestions([]);
        }
      } catch (error) {
        console.error("Error fetching suggestions:", error);
      } finally {
        setIsSearching(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [formData.locationName]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'observerAlt' ? Number(value) : value }));
  };

  // Handler for the "Quick Select" dropdown
  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value) {
        // Extract altitude from the value string to set observerAlt
        const match = value.match(/Alt: (\d+)m/);
        const alt = match ? parseInt(match[1], 10) - 100 : 2200; // Default to 100m below peak
        setFormData(prev => ({ ...prev, locationName: value, observerAlt: alt }));
        setSuggestions([]);
    }
  };

  const handleSuggestionClick = (name: string, altitude: number) => {
    setFormData(prev => ({ ...prev, locationName: name, observerAlt: altitude - 100 }));
    setSuggestions([]);
  };

  const isFormValid = 
    formData.locationName.trim().length > 0 && 
    formData.startDate <= formData.endDate;

  // Group peaks by province
  const groupedPeaks = useMemo(() => {
    const groups: { [key: string]: PeakPreset[] } = {};
    NORTHWEST_PEAKS.forEach(peak => {
      if (!groups[peak.province]) {
        groups[peak.province] = [];
      }
      groups[peak.province].push(peak);
    });
    return groups;
  }, []);

  return (
    <div className="bg-slate-800/50 backdrop-blur-md p-6 rounded-2xl border border-slate-700 shadow-xl max-w-xl mx-auto">
      <h2 className="text-xl font-bold text-cyan-400 mb-6 flex items-center">
        <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Phân tích theo Lịch trình
      </h2>
      
      <div className="space-y-6">
        
        {/* Location Selection Area */}
        <div className="space-y-3">
            <label className="block text-slate-400 text-sm">Địa điểm săn mây (Location)</label>
            
            {/* 1. Quick Select Dropdown (Helper) */}
            <div className="relative">
                <select
                    onChange={handlePresetChange}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-t-lg p-3 text-sm text-cyan-500 font-medium focus:ring-1 focus:ring-cyan-500 outline-none appearance-none cursor-pointer hover:bg-slate-800 transition-colors"
                    defaultValue=""
                >
                    <option value="" disabled>✨ Chọn nhanh điểm nổi tiếng (Gợi ý)...</option>
                    {Object.keys(groupedPeaks).map(province => (
                        <optgroup key={province} label={`--- ${province} ---`} className="text-slate-400 font-bold bg-slate-900">
                        {groupedPeaks[province].map(peak => (
                            <option key={peak.name} value={`${peak.name} (Alt: ${peak.altitude}m)`} className="text-slate-100 font-normal">
                            {peak.name} ({peak.altitude}m)
                            </option>
                        ))}
                        </optgroup>
                    ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-cyan-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
            </div>

            {/* 2. Manual Text Input (Main Source) */}
            <div className="relative">
                 <input
                    type="text"
                    name="locationName"
                    value={formData.locationName}
                    onChange={handleChange}
                    placeholder="Hoặc nhập địa điểm bất kỳ (VD: Đồi Đa Phú, Đà Lạt...)"
                    className="w-full bg-slate-900 border border-slate-600 border-t-0 rounded-b-lg p-4 text-slate-100 text-lg placeholder-slate-600 focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                 />
                 <div className="absolute right-3 top-4 text-slate-500">
                    {isSearching ? (
                      <svg className="animate-spin w-6 h-6 text-cyan-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    )}
                 </div>

                 {/* Suggestions Dropdown */}
                 {suggestions.length > 0 && (
                   <div className="absolute z-20 w-full mt-2 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl overflow-hidden animate-fade-in-up">
                     <div className="px-4 py-2 bg-slate-900/50 border-b border-slate-700 text-xs font-bold text-slate-400 uppercase tracking-wider">
                       Đỉnh núi nổi tiếng gần đó
                     </div>
                     <ul className="max-h-60 overflow-y-auto">
                       {suggestions.map((sug, idx) => (
                         <li 
                           key={idx}
                           onClick={() => handleSuggestionClick(sug.name, sug.altitude)}
                           className="px-4 py-3 hover:bg-slate-700 cursor-pointer border-b border-slate-700/50 last:border-0 transition-colors flex justify-between items-center"
                         >
                           <div>
                             <div className="text-slate-200 font-medium">{sug.name}</div>
                             <div className="text-xs text-slate-400 mt-0.5">Cách khoảng {sug.distance}km</div>
                           </div>
                           <div className="text-cyan-400 font-mono text-sm">{sug.altitude}m</div>
                         </li>
                       ))}
                     </ul>
                   </div>
                 )}
            </div>
            
            <p className="text-xs text-slate-500 italic">
               * Nếu nhập thủ công, AI sẽ tự động tìm kiếm thông tin địa hình và độ cao của địa điểm đó.
            </p>
        </div>

        {/* Date Range Input */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-400 text-sm mb-2">Từ ngày (Start)</label>
            <input 
              type="date" 
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-2">Đến ngày (End)</label>
            <input 
              type="date" 
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              min={formData.startDate}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none"
            />
          </div>
        </div>

        {/* AI Model Selection */}
        {/* Dynamic AI Model Selector (R1-R5) */}
        <div>
          <ModelSelector 
            selectedModel={formData.model} 
            onSelectModel={(modelId) => setFormData(prev => ({ ...prev, model: modelId }))} 
          />
        </div>

        {/* Observer Altitude */}
        <div className="space-y-2">
          <label className="block text-slate-400 text-sm">
            🧭 Độ cao quan sát (Vị trí đứng): <span className="text-cyan-400 font-mono">{formData.observerAlt?.toLocaleString()}m</span>
          </label>
          <input 
            type="range" 
            name="observerAlt"
            min={500} 
            max={3200} 
            step={50} 
            value={formData.observerAlt}
            onChange={handleChange}
            className="w-full accent-cyan-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>500m (Bản làng)</span>
            <span>1500m (Lán)</span>
            <span>2500m+ (Đỉnh)</span>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <button 
          onClick={() => onSubmit(formData)}
          disabled={isLoading || !isFormValid}
          className={`w-full py-4 rounded-xl font-bold text-lg tracking-wide transition-all shadow-lg flex justify-center items-center
            ${isLoading || !isFormValid
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-900/20'
            }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Đang nhận diện địa điểm...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              PHÂN TÍCH LỊCH TRÌNH
            </>
          )}
        </button>
      </div>
    </div>
  );
};
