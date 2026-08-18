import React, { useState } from 'react';
import { CloudAnalysis, TerrainAnalysis, TerrainPoint, DailyForecast } from '../types';
import { formatModelDisplayName } from '../services/modelDiscoveryService';

interface AnalysisResultProps {
  result: CloudAnalysis;
  onReset: () => void;
}

// Trusted meteorological domains
const TRUSTED_DOMAINS = [
    'windy.com', 
    'mountain-forecast.com', 
    'meteoblue.com', 
    'accuweather.com', 
    'noaa.gov', 
    'weather.com',
    'yr.no',
    'wunderground.com',
    'timeanddate.com',
    'ventusky.com',
    'open-meteo.com'
];

const isTrustedSource = (uri: string) => {
    return TRUSTED_DOMAINS.some(domain => uri.toLowerCase().includes(domain));
};

const TerrainVisualizer: React.FC<{ 
  analysis: TerrainAnalysis;
  selectedPoint: TerrainPoint | null;
  onSelectPoint: (point: TerrainPoint | null) => void;
}> = ({ analysis, selectedPoint, onSelectPoint }) => {
  const points = analysis.elevation_profile || [];
  if (points.length < 2) return null;

  const width = 900;
  const height = 400; 
  const paddingX = 80;
  const paddingY = 100;
  
  const altitudes = points.map(p => p.altitude);
  const maxAlt = Math.max(...altitudes) + 100;
  const minAlt = Math.min(...altitudes) - 100;
  const altRange = maxAlt - minAlt || 1; 

  const getX = (index: number) => paddingX + (index * (width - 2 * paddingX) / (points.length - 1));
  const getY = (alt: number) => height - paddingY - ((alt - minAlt) / altRange) * (height - 2 * paddingY);

  let pathD = `M ${getX(0)} ${height}`; 
  pathD += ` L ${getX(0)} ${getY(points[0].altitude)}`; 
  points.forEach((p, i) => {
    if (i > 0) pathD += ` L ${getX(i)} ${getY(p.altitude)}`;
  });
  pathD += ` L ${getX(points.length - 1)} ${height} Z`;

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700 rounded-3xl p-6 mt-6 shadow-2xl overflow-hidden relative group">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-full bg-cyan-900/10 blur-[100px] pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:justify-between md:items-start mb-6 gap-6">
             <div>
                <h3 className="text-cyan-400 font-extrabold text-lg uppercase flex items-center tracking-wide">
                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.806-.982l-4.661-2.51m-4.661 2.51l-4.661 2.51m16.5 16.5L12 14.272l-7.5 7.732" /></svg>
                    Mặt cắt Địa hình Tương tác (Interactive Elevation Profile)
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                    {analysis.source === 'HARDCODED' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-900/50 text-purple-300 border border-purple-700/50 flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            ĐỊA HÌNH ĐÃ XÁC THỰC
                        </span>
                    ) : analysis.source === 'DEM' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-900/50 text-blue-300 border border-blue-700/50 flex items-center"
                              title="Độ cao lấy từ mô hình độ cao số (DEM) — dữ liệu đo đạc thật, độ phân giải thô">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7l6-3 5.447 2.724A1 1 0 0121 7.618v10.764a1 1 0 01-1.447.894L15 17l-6 3z" /></svg>
                            ƯỚC TÍNH TỪ DEM (DỮ LIỆU THẬT, ĐỘ PHÂN GIẢI THÔ)
                        </span>
                    ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-900/50 text-amber-300 border border-amber-700/50 flex items-center">
                            ⚠️ ƯỚC TÍNH CŨ — CHƯA XÁC THỰC
                        </span>
                    )}
                    <span className="text-xs text-slate-400 italic">👉 Nhấp vào một điểm trên đồ thị để xem góc nhìn mây tại độ cao đó</span>
                </div>
                <p className="text-slate-300 text-sm mt-3 max-w-2xl leading-relaxed border-l-2 border-cyan-500/50 pl-3">
                    {analysis.summary}
                </p>
             </div>
             
             <div className="flex-shrink-0 flex flex-col gap-2">
                <div className={`px-4 py-2 rounded-lg border backdrop-blur-md shadow-lg flex items-center gap-3 ${
                    analysis.cloud_trap_potential === 'High' ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-400' : 
                    analysis.cloud_trap_potential === 'Medium' ? 'bg-amber-950/50 border-amber-500/40 text-amber-400' : 
                    'bg-rose-950/50 border-rose-500/40 text-rose-400'
                }`}>
                    <div>
                        <span className="block text-[10px] uppercase text-slate-400 font-bold tracking-wider">Khả năng tụ mây</span>
                        <div className="text-xl font-black">{analysis.cloud_trap_potential}</div>
                    </div>
                    <div className="text-2xl">
                        {analysis.cloud_trap_potential === 'High' ? '🌫️' : analysis.cloud_trap_potential === 'Medium' ? '⛅' : '🌬️'}
                    </div>
                </div>

                {selectedPoint && (
                  <div className="bg-cyan-950/80 border border-cyan-500/60 p-2 rounded-lg text-xs text-cyan-200 flex justify-between items-center animate-pulse">
                    <div>
                      <span className="font-bold block">📍 {selectedPoint.label}</span>
                      <span className="font-mono text-cyan-400">{selectedPoint.altitude}m</span>
                    </div>
                    <button 
                      onClick={() => onSelectPoint(null)}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-600 ml-2"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                )}
             </div>
        </div>

        {/* Dynamic Waypoint Selector Pills */}
        <div className="flex flex-wrap gap-2 mb-4 relative z-10">
          <span className="text-xs text-slate-400 self-center font-bold mr-1">Vị trí đứng:</span>
          {points.map((p, i) => {
            const isSelected = selectedPoint?.label === p.label;
            return (
              <button
                key={i}
                onClick={() => onSelectPoint(isSelected ? null : p)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                  isSelected 
                    ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-lg shadow-cyan-500/30 scale-105 font-bold' 
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-500 hover:text-white'
                }`}
              >
                <span>{p.label}</span>
                <span className={`font-mono text-[10px] ${isSelected ? 'text-slate-900' : 'text-cyan-400'}`}>{p.altitude}m</span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full aspect-[16/10] md:aspect-[21/9] bg-gradient-to-b from-slate-800/80 to-slate-950 rounded-2xl overflow-hidden border border-slate-700/50 shadow-inner">
            <div className="absolute inset-0 opacity-20 pointer-events-none flex flex-col justify-between py-12 px-12">
                <div className="border-t border-dashed border-slate-400 w-full"></div>
                <div className="border-t border-dashed border-slate-400 w-full"></div>
                <div className="border-t border-dashed border-slate-400 w-full"></div>
            </div>

            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full cursor-pointer" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="terrainGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#0891b2" stopOpacity="0.3" />
                        <stop offset="50%" stopColor="#1e293b" stopOpacity="0.7" />
                        <stop offset="100%" stopColor="#020617" stopOpacity="0.95" />
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>

                <path d={pathD} fill="url(#terrainGradient)" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                {points.map((p, i) => {
                    const cx = getX(i);
                    const cy = getY(p.altitude);
                    const isSelected = selectedPoint?.label === p.label;
                    const isPeak = p.type === 'PEAK' || p.type === 'RIDGE';
                    const isValley = p.type === 'VALLEY';
                    
                    const pointColor = isSelected ? '#38bdf8' : isPeak ? '#f472b6' : isValley ? '#4ade80' : '#38bdf8'; 
                    const labelBgColor = isSelected ? '#0369a1' : isPeak ? '#831843' : isValley ? '#14532d' : '#0c4a6e';
                    const staggerOffset = i % 2 === 0 ? 60 : 35; 

                    return (
                        <g 
                          key={i} 
                          onClick={() => onSelectPoint(isSelected ? null : p)}
                          className="group/point cursor-pointer"
                        >
                            <line x1={cx} y1={cy} x2={cx} y2={height} stroke={isSelected ? "#38bdf8" : "white"} strokeOpacity={isSelected ? "0.6" : "0.1"} strokeDasharray="4 4" strokeWidth={isSelected ? "2" : "1"} />
                            <circle cx={cx} cy={cy} r={isSelected ? "9" : "6"} fill={pointColor} stroke="#0f172a" strokeWidth="3" className="drop-shadow-lg transition-all" />
                            <circle cx={cx} cy={cy} r={isSelected ? "16" : "10"} fill={pointColor} opacity={isSelected ? "0.5" : "0.2"} className="animate-pulse" />
                            
                            <rect 
                                x={cx - 30} 
                                y={cy - 28} 
                                width="60" 
                                height="22" 
                                rx="11" 
                                fill="#0f172a" 
                                stroke={pointColor} 
                                strokeWidth={isSelected ? "2.5" : "1.5"}
                                fillOpacity="0.9"
                            />
                            <text x={cx} y={cy - 13} textAnchor="middle" fill={pointColor} fontSize="12" fontWeight="bold" fontFamily="monospace">
                                {p.altitude}m
                            </text>

                            <g transform={`translate(${cx}, ${cy - staggerOffset})`}>
                                <rect 
                                    x="-70" 
                                    y={p.description ? "-28" : "-16"} 
                                    width="140" 
                                    height={p.description ? "44" : "24"} 
                                    rx="4" 
                                    fill={labelBgColor} 
                                    fillOpacity={isSelected ? "0.95" : "0.8"}
                                    stroke={pointColor}
                                    strokeWidth={isSelected ? "2" : "1"}
                                    strokeOpacity={isSelected ? "1" : "0.3"}
                                />
                                <text 
                                    x="0" 
                                    y={p.description ? "-5" : "0"} 
                                    textAnchor="middle" 
                                    fill="#ffffff" 
                                    fontSize="12" 
                                    fontWeight={isSelected ? "800" : "600"}
                                    dy="4" 
                                    className="uppercase tracking-tight"
                                >
                                    {p.label.length > 20 ? p.label.substring(0, 18) + '...' : p.label}
                                </text>
                                {p.description && (
                                  <text 
                                    x="0" 
                                    y="14" 
                                    textAnchor="middle" 
                                    fill="#cbd5e1" 
                                    fontSize="9" 
                                    fontWeight="400"
                                    className="italic"
                                  >
                                      {p.description.length > 25 ? p.description.substring(0, 23) + '...' : p.description}
                                  </text>
                                )}
                                <line x1="0" y1={p.description ? "20" : "10"} x2="0" y2={staggerOffset - 22} stroke={pointColor} strokeOpacity="0.5" strokeWidth="1" />
                            </g>

                            <text x={cx} y={height - 15} textAnchor="middle" fill={isSelected ? "#38bdf8" : "#94a3b8"} fontSize="11" fontWeight="bold" letterSpacing="0.05em">
                                {p.type === 'VALLEY' ? 'THUNG LŨNG' : p.type === 'PEAK' ? 'ĐỈNH' : p.type === 'RIDGE' ? 'SỐNG NÚI' : 'SƯỜN'}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    </div>
  );
};

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ result, onReset }) => {
  const [selectedWaypoint, setSelectedWaypoint] = useState<TerrainPoint | null>(null);
  const [filterGoldenOnly, setFilterGoldenOnly] = useState<boolean>(false);
  const [bookmarkedDates, setBookmarkedDates] = useState<string[]>([]);

  const toggleBookmark = (date: string) => {
    setBookmarkedDates(prev => 
      prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
    );
  };

  const getStatusColor = (code: string) => {
    switch (code) {
      case 'STATIC': return 'text-cyan-400';
      case 'FLOWING': return 'text-yellow-400';
      case 'CLEAR': return 'text-orange-400';
      case 'FOG': return 'text-red-500';
      case 'DISSIPATING': return 'text-pink-400';
      case 'FLUCTUATING': return 'text-indigo-400';
      case 'ROLLING': return 'text-teal-400';
      case 'RAIN': return 'text-blue-400';
      default: return 'text-slate-400';
    }
  };

  const getCardStyle = (code: string) => {
    switch (code) {
      case 'STATIC': return 'bg-cyan-900/10 border-cyan-500/30';
      case 'FLOWING': return 'bg-yellow-900/10 border-yellow-500/30';
      case 'CLEAR': return 'bg-orange-900/10 border-orange-500/30';
      case 'FOG': return 'bg-red-900/10 border-red-500/30';
      case 'DISSIPATING': return 'bg-pink-900/10 border-pink-500/30';
      case 'FLUCTUATING': return 'bg-indigo-900/10 border-indigo-500/30';
      case 'ROLLING': return 'bg-teal-900/10 border-teal-500/30';
      case 'RAIN': return 'bg-blue-900/10 border-blue-500/30';
      case 'UNKNOWN': return 'bg-slate-900/40 border-slate-700 border-dashed opacity-80';
      default: return 'bg-slate-800/50 border-slate-700';
    }
  };

  // Nhãn chất lượng dữ liệu từng ngày — hiển thị trung thực độ tin cậy
  const getQualityBadge = (quality?: string) => {
    switch (quality) {
      case 'FORECAST':
        return { text: '✅ Dự báo tin cậy (≤3 ngày)', cls: 'bg-emerald-950/60 text-emerald-300 border-emerald-600/40' };
      case 'UNCERTAIN':
        return { text: '🔶 Dự báo xa — chỉ là xu hướng', cls: 'bg-amber-950/60 text-amber-300 border-amber-600/40' };
      case 'NO_DATA':
        return { text: '⛔ Ngoài phạm vi dữ liệu', cls: 'bg-slate-800 text-slate-400 border-slate-600' };
      default:
        return null;
    }
  };

  const getStatusIcon = (code: string) => {
    const className = "w-10 h-10 mb-2 opacity-90";
    switch (code) {
      case 'STATIC':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          </svg>
        );
      case 'FLOWING':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.59 4.59A2 2 0 1111 8H2m10.59 11.41A2 2 0 1014 16H2m15.73-8.27A2.5 2.5 0 1119.5 12H2" />
          </svg>
        );
      case 'CLEAR':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      case 'FOG':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15h18M3 10h18M3 20h18" />
          </svg>
        );
      case 'DISSIPATING':
        return (
           <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" opacity="0.6" />
           </svg>
        );
      case 'FLUCTUATING':
        return (
           <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 6v12m8-12v12" opacity="0.5" />
           </svg>
        );
      case 'ROLLING':
        return (
           <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
           </svg>
        );
      case 'RAIN':
        return (
           <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 13z" />
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 19v2m4-2v2m4-2v2" />
           </svg>
        );
      default:
        return (
           <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
           </svg>
        );
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' });
  };

  // Export GPX File Helper for Offline Trekking
  const handleExportGPX = () => {
    const waypoints = result.terrain_analysis?.elevation_profile || [];
    const location = result.locationName.replace(/[^a-zA-Z0-9]/g, '_');
    // Tọa độ THẬT của địa điểm đã phân giải — các waypoint dùng chung tọa độ tham chiếu này
    // (app không có tọa độ riêng từng lán); độ cao <ele> là dữ liệu thật từng điểm.
    const lat = result.weather_data_source?.lat;
    const lon = result.weather_data_source?.lon;
    if (lat === undefined || lon === undefined) {
      alert('Không có tọa độ đã xác thực cho địa điểm này — không thể xuất GPX trung thực.');
      return;
    }

    let gpxContent = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    gpxContent += `<gpx version="1.1" creator="CloudHunter AI" xmlns="http://www.topografix.com/GPX/1/1">\n`;
    gpxContent += `  <metadata>\n    <name>CloudHunter - ${result.locationName}</name>\n    <desc>Toa do la diem tham chieu cua nui; do cao tung waypoint la du lieu that.</desc>\n  </metadata>\n`;

    waypoints.forEach((p) => {
      gpxContent += `  <wpt lat="${lat.toFixed(5)}" lon="${lon.toFixed(5)}">\n`;
      gpxContent += `    <ele>${p.altitude}</ele>\n`;
      gpxContent += `    <name>${p.label}</name>\n`;
      gpxContent += `    <desc>${p.description || p.type}</desc>\n`;
      gpxContent += `  </wpt>\n`;
    });

    gpxContent += `</gpx>`;

    const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CloudHunter_${location}_Route.gpx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export Markdown Summary Text for Offline Reading
  const handleExportSummary = () => {
    const location = result.locationName.replace(/[^a-zA-Z0-9]/g, '_');
    let text = `# CLOUDHUNTER AI FORECAST: ${result.locationName}\n`;
    text += `Chiến thuật tổng quan: ${result.overallStrategy}\n\n`;
    text += `## Dự báo từng ngày:\n`;

    result.dailyForecasts.forEach(fc => {
      text += `\n--- Ngày ${fc.date} (Score: ${fc.score}/100) ---\n`;
      text += `Trạng thái: ${fc.status_text} (${fc.status_code})\n`;
      text += `Khung giờ vàng: ${fc.golden_hours || fc.sun_times?.goldenHourMorning || 'N/A (thiếu dữ liệu)'}\n`;
      text += `LCL: ${fc.technical_indices.LCL_base} | Mặt mây: ${fc.technical_indices.cloud_top_estimated} | FSI: ${fc.technical_indices.FSI_score}\n`;
      text += `Lời khuyên: ${fc.expert_advice}\n`;
    });

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CloudHunter_${location}_OfflineSummary.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sortedForecasts = [...result.dailyForecasts].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const filteredForecasts = filterGoldenOnly
    ? sortedForecasts.filter(day => day.score >= 65 || bookmarkedDates.includes(day.date))
    : sortedForecasts;
  
  const sources = result.sources || [];
  const weatherSources = sources.filter(s => isTrustedSource(s.uri));
  const otherSources = sources.filter(s => !isTrustedSource(s.uri));

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      
      {/* Top Section */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 relative z-10">
           <div>
             <h2 className="text-3xl font-black text-white mb-1 tracking-tight">Dự báo: {result.locationName}</h2>
             <div className="flex flex-wrap items-center gap-2">
                 <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-900 text-cyan-300 border border-cyan-700">CLOUDHUNTER V5</span>
                 {result.consensus && (
                   <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-950 text-purple-300 border border-purple-600/80 flex items-center gap-1"
                         title={`Tính thật từ ${result.consensus.models.join(', ')} — % ngày các mô hình thống nhất trạng thái`}>
                     🎯 {result.consensus.models.length} mô hình đồng thuận {result.consensus.agreementPct}%
                   </span>
                 )}
                 {result.dataReliability && (
                   <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                     result.dataReliability === 'HIGH' ? 'bg-emerald-950 text-emerald-300 border-emerald-700' :
                     result.dataReliability === 'MEDIUM' ? 'bg-amber-950 text-amber-300 border-amber-700' :
                     'bg-rose-950 text-rose-300 border-rose-700'
                   }`}>
                     Độ tin cậy dữ liệu: {result.dataReliability}
                   </span>
                 )}
                 <p className="text-slate-400 text-xs">Engine deterministic + Open-Meteo 4 mô hình toàn cầu</p>
              </div>
           </div>

           <div className="mt-4 md:mt-0 flex flex-wrap gap-2 items-center">
             {result.bestDays.length > 0 && (
               <div className="bg-gradient-to-r from-emerald-900/60 to-green-900/60 border border-emerald-500/40 px-4 py-2.5 rounded-2xl shadow-lg shadow-emerald-900/20">
                 <span className="block text-[9px] text-emerald-400 font-bold uppercase tracking-widest mb-0.5">NGÀY SĂN TỐT NHẤT</span>
                 <div className="flex gap-2 text-white font-mono font-bold text-base">
                   {result.bestDays.map(d => (
                     <span key={d} className="bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">{formatDate(d)}</span>
                   ))}
                 </div>
               </div>
             )}

             {/* Export Actions */}
             <div className="flex gap-2">
               <button
                 onClick={handleExportGPX}
                 title="Tải tệp GPX xem lộ trình và độ cao trên ứng dụng trekking offline (Gaia GPS, Strava)"
                 className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 hover:border-cyan-400 text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
               >
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                 Tải GPX Offline
               </button>
               <button
                 onClick={handleExportSummary}
                 title="Tải bản tóm tắt text dự báo để đọc khi không có mạng"
                 className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 hover:border-purple-400 text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
               >
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                 Tóm Tắt Text
               </button>
             </div>
           </div>
        </div>
        
        <div className="bg-slate-800/40 rounded-xl p-5 border border-slate-700/50 backdrop-blur-sm relative z-10 mb-6">
           <h3 className="text-amber-400 font-bold text-xs uppercase mb-2 flex items-center tracking-wider">
             <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
             CHIẾN THUẬT TỔNG QUAN
           </h3>
           <p className="text-slate-200 leading-relaxed text-sm font-light">
             {result.overallStrategy}
           </p>

           <div className="mt-4 pt-3 border-t border-slate-700/50 flex flex-wrap justify-between items-center text-xs text-slate-300 gap-2">
             <div className="flex flex-wrap items-center gap-2">
               <span className="text-slate-400 font-semibold">🔢 Số liệu & điểm: engine deterministic ({result.engineVersion || 'engine'})</span>
               {result.aiNarrative && result.modelUsed ? (() => {
                 const modelInfo = formatModelDisplayName(result.modelUsed);
                 return (
                   <div className="inline-flex items-center gap-1.5 flex-wrap">
                     <span className="text-slate-400 font-semibold">· 🤖 Lời bình:</span>
                     <span className="font-bold text-cyan-300 font-sans bg-slate-900 px-2.5 py-1 rounded-lg border border-cyan-500/40 shadow-sm flex items-center gap-1">
                       <span>{modelInfo.displayName}</span>
                       <span className="text-[10px] text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-500/30 font-mono">
                         {modelInfo.tierLabel}
                       </span>
                     </span>
                   </div>
                 );
               })() : (
                 <span className="text-amber-300/90 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-700/40">
                   ⚠️ AI không phản hồi — lời bình do engine sinh tự động (số liệu không ảnh hưởng)
                 </span>
               )}
             </div>
             {result.consensus && (
               <span className="text-purple-300 font-mono" title="Đồng thuận tính thật từ dữ liệu từng mô hình">
                 ℹ️ {result.consensus.note}
               </span>
             )}
            </div>

           {result.modelFallbackNote && (
             <div className="mt-3 bg-amber-950/40 border border-amber-600/40 rounded-lg p-3 text-xs text-amber-200 flex items-start gap-2">
               <span>🔀</span>
               <span>{result.modelFallbackNote}</span>
             </div>
           )}

           {result.safetyWarnings && result.safetyWarnings.length > 0 && (
             <div className="mt-3 bg-rose-950/40 border border-rose-600/40 rounded-lg p-3">
               <span className="text-rose-300 text-[10px] font-bold uppercase tracking-wider block mb-1">⚠️ Cảnh báo an toàn</span>
               <ul className="text-rose-200 text-xs space-y-1 list-disc list-inside">
                 {result.safetyWarnings.map((w, i) => <li key={i}>{w}</li>)}
               </ul>
             </div>
           )}
         </div>

        {result.terrain_analysis && (
          <TerrainVisualizer 
            analysis={result.terrain_analysis} 
            selectedPoint={selectedWaypoint}
            onSelectPoint={setSelectedWaypoint}
          />
        )}
      </div>

      {/* Filter & View Control */}
      <div className="flex justify-between items-center px-2">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
          <span>Dự báo chi tiết từng ngày</span>
          <span className="text-xs font-normal text-slate-400">({filteredForecasts.length} ngày)</span>
        </h3>
        <button
          onClick={() => setFilterGoldenOnly(!filterGoldenOnly)}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${
            filterGoldenOnly 
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20' 
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
          }`}
        >
          <span>⭐ Chỉ xem Ngày Đáng Đi (Score ≥ 65)</span>
        </button>
      </div>

      {/* Daily List */}
      {filteredForecasts.length === 0 && (
        <div className="bg-slate-900/70 border border-slate-700 rounded-2xl p-8 text-center space-y-3">
          <p className="text-slate-300 text-sm leading-relaxed">
            😕 Không có ngày nào đạt ≥65 điểm trong khoảng đã tra — điều kiện biển mây kém
            (thường gặp mùa mưa). Xem tất cả các ngày để biết vì sao điểm thấp.
          </p>
          <button
            onClick={() => setFilterGoldenOnly(false)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 font-bold text-xs transition-all"
          >
            Hiện tất cả các ngày
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 gap-5">
        {filteredForecasts.map((day, idx) => {
          // Dynamic calculation if user selected a custom waypoint altitude
          // — chỉ tính khi engine THẬT SỰ ước tính được mặt mây (cloud_top_m là số, không mặc định)
          let dynamicBoundaryNote = null;
          if (selectedWaypoint && typeof day.technical_indices.cloud_top_m === 'number') {
            const cloudTopAlt = day.technical_indices.cloud_top_m;
            const deltaH = selectedWaypoint.altitude - cloudTopAlt;
            
            let deltaText = "";
            let deltaColor = "";
            if (deltaH > 300) {
              deltaText = `Mặt mây (${cloudTopAlt}m) thấp hơn ${selectedWaypoint.label} (${selectedWaypoint.altitude}m) ${deltaH}m ➔ Biển mây tĩnh tuyệt đẹp, nằm hoàn toàn bên trên mây!`;
              deltaColor = "bg-emerald-950/80 border-emerald-500/50 text-emerald-300";
            } else if (deltaH >= -200 && deltaH <= 200) {
              deltaText = `Đang ở ranh giới mặt mây (${selectedWaypoint.altitude}m vs mây ${cloudTopAlt}m, ΔH=${deltaH}m) ➔ Vùng mây dâng trùm từng lớp, cần kiên nhẫn chờ gió thổi mù đi!`;
              deltaColor = "bg-indigo-950/80 border-indigo-500/50 text-indigo-300";
            } else {
              deltaText = `Chìm trong mây (${selectedWaypoint.altitude}m thấp hơn mặt mây ${cloudTopAlt}m ${Math.abs(deltaH)}m) ➔ Sương mù đặc quánh, nên di chuyển lên điểm cao hơn!`;
              deltaColor = "bg-rose-950/80 border-rose-500/50 text-rose-300";
            }

            dynamicBoundaryNote = { text: deltaText, color: deltaColor };
          }

          const isBookmarked = bookmarkedDates.includes(day.date);

          return (
            <div 
              key={idx}
              className={`backdrop-blur-md rounded-2xl border p-6 transition-all duration-300 hover:shadow-xl relative ${getCardStyle(day.status_code)}`}
            >
              {/* Bookmark Star Icon */}
              <button
                onClick={() => toggleBookmark(day.date)}
                title={isBookmarked ? "Bỏ đánh dấu ngày này" : "Đánh dấu lưu ngày này"}
                className={`absolute top-4 right-4 p-2 rounded-full border transition-all ${
                  isBookmarked ? 'bg-amber-500/20 border-amber-400 text-amber-400' : 'bg-slate-800/60 border-slate-700 text-slate-500 hover:text-amber-400'
                }`}
              >
                <svg className="w-5 h-5" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </button>

              <div className="flex flex-col xl:flex-row gap-6">
                
                {/* Left: Date & Status */}
                <div className="flex-shrink-0 xl:w-48 border-b xl:border-b-0 xl:border-r border-white/10 pb-4 xl:pb-0 xl:pr-6">
                  <div className="text-xl font-bold text-white mb-1">{formatDate(day.date)}</div>
                  {(() => {
                    const badge = getQualityBadge(day.data_quality);
                    return badge ? (
                      <span className={`inline-block mb-2 px-2 py-0.5 rounded text-[10px] font-bold border ${badge.cls}`}>
                        {badge.text}
                      </span>
                    ) : null;
                  })()}
                  {day.status_code !== 'UNKNOWN' ? (
                    <div className={`text-4xl font-black tracking-tighter ${getStatusColor(day.status_code)}`}>
                      {day.score}
                      <span className="text-sm font-medium text-slate-500 ml-1">/100</span>
                    </div>
                  ) : (
                    <div className="text-2xl font-black tracking-tighter text-slate-500">—</div>
                  )}

                  <div className="mt-4 flex flex-col items-start">
                      <div className={getStatusColor(day.status_code)}>
                          {getStatusIcon(day.status_code)}
                      </div>
                      <h3 className={`text-lg font-bold flex items-center gap-2 leading-tight ${getStatusColor(day.status_code)}`}>
                          {day.status_text}
                      </h3>
                      <div className="mt-2 text-[10px] text-slate-500 uppercase tracking-widest font-bold border border-slate-700 rounded px-2 py-1 inline-block">
                          {day.status_code}
                      </div>
                  </div>
                </div>

                {/* Middle: Technical Indices */}
                <div className="flex-grow space-y-4">
                  
                  {/* Dynamic Altitude Simulation Alert */}
                  {dynamicBoundaryNote && (
                    <div className={`p-3 rounded-xl border text-xs leading-relaxed font-semibold flex items-center gap-2 ${dynamicBoundaryNote.color}`}>
                      <span>📍</span>
                      <span>{dynamicBoundaryNote.text}</span>
                    </div>
                  )}

                  {/* Technical Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-6 gap-2.5">
                      <div className="bg-slate-900/60 rounded-lg p-2.5 border border-slate-700/50">
                          <span className="block text-[9px] text-slate-400 uppercase font-bold mb-0.5">LCL Base</span>
                          <div className="font-mono font-bold text-white text-base">{day.technical_indices.LCL_base}</div>
                          <div className="text-[9px] text-slate-500">Đáy mây</div>
                      </div>
                      <div className="bg-slate-900/60 rounded-lg p-2.5 border border-slate-700/50">
                          <span className="block text-[9px] text-slate-400 uppercase font-bold mb-0.5">Cloud Top</span>
                          <div className="font-mono font-bold text-purple-300 text-base">{day.technical_indices.cloud_top_estimated}</div>
                          <div className="text-[9px] text-slate-500">Mặt mây</div>
                      </div>
                      <div className="bg-slate-900/60 rounded-lg p-2.5 border border-slate-700/50">
                          <span className="block text-[9px] text-slate-400 uppercase font-bold mb-0.5">FSI Score</span>
                          <div className={`font-mono font-bold text-base ${day.technical_indices.FSI_score < 30 ? 'text-green-400' : 'text-yellow-400'}`}>
                              {day.technical_indices.FSI_score}
                          </div>
                          <div className="text-[9px] text-slate-500">Stability</div>
                      </div>
                      <div className="bg-slate-900/60 rounded-lg p-2.5 border border-slate-700/50">
                          <span className="block text-[9px] text-slate-400 uppercase font-bold mb-0.5">VRII Bức Xạ</span>
                          {/* KHÔNG bịa số: thiếu VRII thì hiện N/A, không mặc định 75 */}
                          {typeof day.technical_indices.vrii_score === 'number' ? (
                            <>
                              <div className={`font-mono font-bold text-base ${day.technical_indices.vrii_score >= 80 ? 'text-emerald-400' : 'text-cyan-300'}`}>
                                  {day.technical_indices.vrii_score}/100
                              </div>
                              <div className="text-[9px] text-slate-500">{day.technical_indices.vrii_label || 'Thung lũng'}</div>
                            </>
                          ) : (
                            <>
                              <div className="font-mono font-bold text-base text-slate-500">N/A</div>
                              <div className="text-[9px] text-slate-500">Thiếu dữ liệu</div>
                            </>
                          )}
                      </div>
                      <div className="bg-slate-900/60 rounded-lg p-2.5 border border-slate-700/50">
                          <span className="block text-[9px] text-slate-400 uppercase font-bold mb-0.5">Wind Impact</span>
                          <div className={`font-mono font-bold text-base ${day.technical_indices.wind_impact_level === 'High' ? 'text-red-400' : 'text-slate-200'}`}>
                              {day.technical_indices.wind_impact_level}
                          </div>
                          <div className="text-[9px] text-slate-500">Gió xé mây</div>
                      </div>
                       <div className="bg-slate-900/60 rounded-lg p-2.5 border border-slate-700/50">
                          <span className="block text-[9px] text-slate-400 uppercase font-bold mb-0.5">Moisture</span>
                          <div className={`font-mono font-bold text-base ${day.technical_indices.moisture_type === 'Deep' ? 'text-blue-400' : 'text-orange-300'}`}>
                              {day.technical_indices.moisture_type}
                          </div>
                          <div className="text-[9px] text-slate-500">Ẩm tầng cao</div>
                      </div>
                  </div>

                  {/* Nhãn tin cậy + vị trí đứng gợi ý + tiềm năng cháy mây */}
                  {day.reliability_note && (
                    <div className="bg-amber-950/30 border border-amber-600/30 rounded-lg p-2.5 text-[11px] text-amber-200">
                      ⏳ {day.reliability_note}
                    </div>
                  )}
                  {day.recommended_position && (
                    <div className="bg-cyan-950/30 border border-cyan-600/30 rounded-lg p-2.5 text-[11px] text-cyan-200">
                      🧭 {day.recommended_position}
                    </div>
                  )}
                  {typeof day.sunrise_color_potential === 'number' && day.status_code !== 'UNKNOWN' && (
                    <div className={`rounded-lg p-2.5 text-[11px] border flex items-center justify-between ${
                      day.sunrise_color_potential >= 60
                        ? 'bg-orange-950/40 border-orange-500/40 text-orange-200'
                        : 'bg-slate-800/40 border-slate-700 text-slate-400'
                    }`}>
                      <span>📸 Tiềm năng "cháy mây" bình minh (cho nhiếp ảnh)</span>
                      <span className="font-mono font-bold">{day.sunrise_color_potential}/100</span>
                    </div>
                  )}

                  {/* "Vì sao điểm này?" — minh bạch từng yếu tố engine cộng/trừ */}
                  {day.reasons && day.reasons.length > 0 && (
                    <details className="bg-slate-900/40 border border-slate-700/60 rounded-lg overflow-hidden group/why">
                      <summary className="cursor-pointer px-3 py-2 text-[11px] font-bold text-slate-300 hover:text-white select-none">
                        🔍 Vì sao {day.score} điểm? (bấm xem từng yếu tố)
                      </summary>
                      <ul className="px-4 pb-3 pt-1 space-y-1">
                        {day.reasons.map((r, i) => (
                          <li key={i} className={`text-[11px] font-mono ${r.startsWith('-') ? 'text-rose-300' : r.startsWith('+') ? 'text-emerald-300' : 'text-slate-400'}`}>
                            {r}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}

                  {/* Sun & Golden Hour Info Banner */}
                  {day.sun_times && day.status_code !== 'UNKNOWN' && (
                    <div className="bg-gradient-to-r from-amber-950/40 to-orange-950/40 rounded-xl p-3 border border-amber-500/30 flex flex-wrap justify-between items-center text-xs text-amber-200 gap-2">
                      <div className="flex items-center gap-3">
                        <span>🌄 <b>Bình minh:</b> {day.sun_times.sunrise}</span>
                        <span>🌇 <b>Hoàng hôn:</b> {day.sun_times.sunset}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-amber-500/20 px-2.5 py-1 rounded-full border border-amber-500/40 text-amber-300 font-bold">
                          ⭐ Khung giờ vàng chụp ảnh: {day.sun_times.goldenHourMorning}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Weather Analysis Text */}
                  <div className="bg-slate-800/30 rounded-lg p-4 border border-white/5 space-y-3">
                      <div>
                          <span className="text-cyan-500 text-[10px] font-bold uppercase tracking-wider block mb-1">PHÂN TÍCH HÌNH THẾ KHÍ TƯỢNG</span>
                          <p className="text-slate-300 text-sm leading-relaxed">{day.weather_analysis.general}</p>
                      </div>
                      <div className="border-t border-slate-700/50 pt-2">
                           <span className="text-purple-400 text-[10px] font-bold uppercase tracking-wider block mb-1">HÀNH VI CỦA MÂY (CLOUD BEHAVIOR)</span>
                           <p className="text-slate-300 text-sm leading-relaxed italic">"{day.weather_analysis.cloud_behavior}"</p>
                      </div>
                  </div>
                </div>

                {/* Right: Expert Advice */}
                <div className="xl:w-64 flex-shrink-0 flex flex-col justify-between border-t xl:border-t-0 xl:border-l border-white/10 pt-4 xl:pt-0 xl:pl-6">
                   <div>
                      <h4 className="text-cyan-400 font-bold text-xs uppercase mb-2 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                          Lời Khuyên Chuyên Gia
                      </h4>
                      <p className="text-slate-300 text-xs leading-relaxed">
                          {day.expert_advice}
                      </p>
                   </div>
                   
                   <div className="mt-4 pt-3 border-t border-white/5 flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>🌡️ {day.weather_summary.temp}</span>
                      <span>💨 {day.weather_summary.wind}</span>
                   </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* Gear & Sources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-2xl p-6">
            <h3 className="text-blue-400 font-bold text-sm uppercase mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              Trang bị khuyến nghị cho chuyến đi
            </h3>
            <div className="flex flex-wrap gap-2">
              {result.gearChecklist.map((item, i) => (
                <span key={i} className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-600 flex items-center gap-1">
                  <span>🎒</span>
                  <span>{item}</span>
                </span>
              ))}
            </div>
         </div>

         {sources.length > 0 && (
           <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-2xl p-6">
              <h3 className="text-slate-400 font-bold text-sm uppercase mb-4 flex items-center">
                  Nguồn Dữ Liệu Khí Tượng (Data Sources)
                  <span className="ml-2 text-[10px] normal-case font-normal text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
                      Verified
                  </span>
              </h3>
              
              <div className="space-y-4">
                  {weatherSources.length > 0 && (
                      <div className="bg-emerald-950/30 rounded-lg p-3 border border-emerald-500/20">
                          <h4 className="text-emerald-400 text-xs font-bold uppercase mb-3 flex items-center gap-2 pb-2 border-b border-emerald-500/20">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                              Dữ liệu Mô Hình & Trạm Quan Trắc
                          </h4>
                          <ul className="space-y-2">
                              {weatherSources.map((source, idx) => (
                                  <li key={`weather-${idx}`} className="flex items-center gap-2 group">
                                      <svg className="w-3 h-3 text-emerald-500 flex-shrink-0 group-hover:text-emerald-300 transition-colors" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                      <a href={source.uri} target="_blank" rel="noreferrer" className="text-xs block truncate transition-colors text-emerald-400/80 font-medium hover:text-emerald-300">
                                          {source.title || source.uri}
                                      </a>
                                  </li>
                              ))}
                          </ul>
                      </div>
                  )}

                  {otherSources.length > 0 && (
                      <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
                          <h4 className="text-slate-400 text-xs font-bold uppercase mb-3 flex items-center gap-2 pb-2 border-b border-slate-700/50">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 005.656-5.656l-1.1 1.1" /></svg>
                              Bài Viết & Thông Tin Tham Khảo Khác
                          </h4>
                          <ul className="space-y-2">
                              {otherSources.map((source, idx) => (
                                  <li key={`other-${idx}`} className="flex items-center gap-2 group">
                                       <svg className="w-3 h-3 text-slate-600 flex-shrink-0 group-hover:text-slate-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                       <a href={source.uri} target="_blank" rel="noreferrer" className="text-xs block truncate transition-colors text-slate-500 hover:text-slate-300">
                                           {source.title || source.uri}
                                       </a>
                                  </li>
                              ))}
                          </ul>
                      </div>
                  )}
              </div>
           </div>
         )}
      </div>

      <div className="text-center pt-8">
        <button 
          onClick={onReset}
          className="px-6 py-2.5 rounded-full border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 hover:bg-slate-800 transition-all text-sm font-semibold shadow-lg"
        >
          🔍 Tra cứu địa điểm khác
        </button>
      </div>
    </div>
  );
};
