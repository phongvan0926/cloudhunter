import React from 'react';
import { CloudAnalysis, TerrainAnalysis } from '../types';

interface AnalysisResultProps {
  result: CloudAnalysis;
  onReset: () => void;
}

// Danh sách các tên miền uy tín về khí tượng
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
    'ventusky.com'
];

const isTrustedSource = (uri: string) => {
    return TRUSTED_DOMAINS.some(domain => uri.toLowerCase().includes(domain));
};

const TerrainVisualizer: React.FC<{ analysis: TerrainAnalysis }> = ({ analysis }) => {
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
                    Mặt cắt Địa hình (Elevation Profile)
                </h3>
                <div className="flex items-center gap-2 mt-2">
                    {analysis.source === 'HARDCODED' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-900/50 text-purple-300 border border-purple-700/50 flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            VERIFIED DATA (HARDCODED)
                        </span>
                    ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-900/50 text-blue-300 border border-blue-700/50 flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            AI RESEARCHED
                        </span>
                    )}
                </div>
                <p className="text-slate-300 text-sm mt-3 max-w-2xl leading-relaxed border-l-2 border-cyan-500/50 pl-3">
                    {analysis.summary}
                </p>
             </div>
             
             <div className="flex-shrink-0">
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
             </div>
        </div>

        <div className="relative w-full aspect-[16/10] md:aspect-[21/9] bg-gradient-to-b from-slate-800/80 to-slate-950 rounded-2xl overflow-hidden border border-slate-700/50 shadow-inner">
            <div className="absolute inset-0 opacity-20 pointer-events-none flex flex-col justify-between py-12 px-12">
                <div className="border-t border-dashed border-slate-400 w-full"></div>
                <div className="border-t border-dashed border-slate-400 w-full"></div>
                <div className="border-t border-dashed border-slate-400 w-full"></div>
            </div>

            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="terrainGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#0891b2" stopOpacity="0.3" />
                        <stop offset="50%" stopColor="#1e293b" stopOpacity="0.7" />
                        <stop offset="100%" stopColor="#020617" stopOpacity="0.95" />
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
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
                    const isPeak = p.type === 'PEAK' || p.type === 'RIDGE';
                    const isValley = p.type === 'VALLEY';
                    
                    const pointColor = isPeak ? '#f472b6' : isValley ? '#4ade80' : '#38bdf8'; 
                    const labelBgColor = isPeak ? '#831843' : isValley ? '#14532d' : '#0c4a6e';
                    const staggerOffset = i % 2 === 0 ? 60 : 35; 

                    return (
                        <g key={i} className="group/point hover:opacity-100 transition-opacity">
                            <line x1={cx} y1={cy} x2={cx} y2={height} stroke="white" strokeOpacity="0.1" strokeDasharray="4 4" strokeWidth="1" />
                            <circle cx={cx} cy={cy} r="6" fill={pointColor} stroke="#0f172a" strokeWidth="3" className="drop-shadow-lg" />
                            <circle cx={cx} cy={cy} r="10" fill={pointColor} opacity="0.2" className="animate-pulse" />
                            
                            <rect 
                                x={cx - 30} 
                                y={cy - 28} 
                                width="60" 
                                height="22" 
                                rx="11" 
                                fill="#0f172a" 
                                stroke={pointColor} 
                                strokeWidth="1.5"
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
                                    fillOpacity="0.8"
                                    stroke={pointColor}
                                    strokeOpacity="0.3"
                                />
                                <text 
                                    x="0" 
                                    y={p.description ? "-5" : "0"} 
                                    textAnchor="middle" 
                                    fill="#ffffff" 
                                    fontSize="12" 
                                    fontWeight="600"
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

                            <text x={cx} y={height - 15} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="bold" letterSpacing="0.05em">
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

const getModelDisplayName = (modelKey?: string) => {
  if (!modelKey) return "Gemini 3.5 Flash";
  switch (modelKey) {
    case 'gemini-3.5-flash': return 'Gemini 3.5 Flash';
    case 'gemini-3.1-pro-preview': return 'Gemini 3.1 Pro';
    case 'gemini-3-flash-preview': return 'Gemini 3.0 Flash';
    case 'gemini-3.1-flash-lite-preview': return 'Gemini 3.1 Flash Lite';
    default: return modelKey;
  }
};

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ result, onReset }) => {
  const getStatusColor = (code: string) => {
    switch (code) {
      case 'STATIC': return 'text-cyan-400';
      case 'FLOWING': return 'text-yellow-400';
      case 'CLEAR': return 'text-orange-400';
      case 'FOG': return 'text-red-500';
      case 'DISSIPATING': return 'text-pink-400';
      case 'FLUCTUATING': return 'text-indigo-400';
      case 'ROLLING': return 'text-teal-400';
      case 'UNKNOWN': return 'text-slate-400';
      default: return 'text-slate-300';
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
      case 'UNKNOWN': return 'bg-slate-800/50 border-slate-600/50';
      default: return 'bg-slate-800/50 border-slate-700';
    }
  };

  const getStatusIcon = (code: string) => {
    const className = "w-10 h-10 mb-2 opacity-90";
    switch (code) {
      case 'STATIC':
        // Cloud icon representing stability
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          </svg>
        );
      case 'FLOWING':
        // Wind icon representing movement/flow
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.59 4.59A2 2 0 1111 8H2m10.59 11.41A2 2 0 1014 16H2m15.73-8.27A2.5 2.5 0 1119.5 12H2" />
          </svg>
        );
      case 'CLEAR':
        // Sun icon
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      case 'FOG':
        // Fog/Mist icon
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15h18M3 10h18M3 20h18" />
          </svg>
        );
      case 'DISSIPATING':
        // Sun peeking through broken clouds
        return (
           <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" opacity="0.6" />
           </svg>
        );
      case 'FLUCTUATING':
        // Waves/Layers icon
        return (
           <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 6v12m8-12v12" opacity="0.5" />
           </svg>
        );
      case 'ROLLING':
        // Rolling waves icon
        return (
           <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
           </svg>
        );
      case 'UNKNOWN':
        // Question mark / Unknown icon
        return (
           <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
           </svg>
        );
      default:
        // Default generic weather icon
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

  const sortedForecasts = [...(result.dailyForecasts || [])].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
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
             <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-900 text-cyan-400 border border-cyan-700">CLOUDHUNTER V4.0</span>
                 <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-900 text-blue-400 border border-blue-700">{getModelDisplayName(result.modelUsed)}</span>
                {result.zoneType && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-900 text-purple-400 border border-purple-700">{result.zoneType}</span>}
                {result.province && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-900 text-indigo-400 border border-indigo-700">{result.province}</span>}
                {result.elevation && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-900 text-amber-400 border border-amber-700">{result.elevation}m ASL</span>}
                {result.dataReliability && <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${result.dataReliability === 'HIGH' ? 'bg-emerald-900 text-emerald-400 border-emerald-700' : result.dataReliability === 'MEDIUM' ? 'bg-yellow-900 text-yellow-400 border-yellow-700' : 'bg-rose-900 text-rose-400 border-rose-700'}`}>DATA: {result.dataReliability}</span>}
                <p className="text-slate-400 text-sm ml-2">Hybrid Algorithm: 8 Modules</p>
             </div>
           </div>
           {result.bestDays && result.bestDays.length > 0 && (
             <div className="mt-4 md:mt-0 bg-gradient-to-r from-emerald-900/60 to-green-900/60 border border-emerald-500/40 px-5 py-3 rounded-2xl shadow-lg shadow-emerald-900/20">
               <span className="block text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-1">NGÀY SĂN TỐT NHẤT</span>
               <div className="flex gap-3 text-white font-mono font-bold text-lg">
                 {result.bestDays.map(d => (
                   <span key={d}>{formatDate(d)}</span>
                 ))}
               </div>
             </div>
           )}
        </div>
        
        <div className="bg-slate-800/40 rounded-xl p-5 border border-slate-700/50 backdrop-blur-sm relative z-10 mb-6">
           <h3 className="text-amber-400 font-bold text-xs uppercase mb-2 flex items-center tracking-wider">
             <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
             CHIẾN THUẬT TỔNG QUAN
           </h3>
           <p className="text-slate-200 leading-relaxed text-sm font-light mb-2">
             {result.overallStrategy}
           </p>
           {result.seasonalContext && (
             <p className="text-slate-400 text-xs italic">
               🍂 {result.seasonalContext}
             </p>
           )}
        </div>

        {result.terrain_analysis && (
          <TerrainVisualizer analysis={result.terrain_analysis} />
        )}
      </div>

      {/* Daily List */}
      <div className="grid grid-cols-1 gap-5">
        {sortedForecasts.map((day, idx) => (
          <div 
            key={idx}
            className={`backdrop-blur-md rounded-2xl border p-6 transition-all duration-300 hover:shadow-xl ${getCardStyle(day.status_code)}`}
          >
            <div className="flex flex-col xl:flex-row gap-6">
              
              {/* Left: Date & Status */}
              <div className="flex-shrink-0 xl:w-48 border-b xl:border-b-0 xl:border-r border-white/10 pb-4 xl:pb-0 xl:pr-6">
                <div className="text-xl font-bold text-white mb-1">{day.dayOfWeek ? `${day.dayOfWeek}, ` : ''}{formatDate(day.date)}</div>
                <div className={`text-4xl font-black tracking-tighter ${getStatusColor(day.status_code)}`}>
                  {day.score}
                  <span className="text-sm font-medium text-slate-500 ml-1">/100</span>
                </div>
                
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
                
                {/* V4.0 Technical Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700/50">
                        <span className="block text-[10px] text-slate-400 uppercase font-bold mb-1">LCL Base</span>
                        <div className="font-mono font-bold text-white text-lg">{day.technical_indices?.LCL_base || 'N/A'}</div>
                        <div className="text-[10px] text-slate-500">Đáy mây dự kiến</div>
                    </div>
                    <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700/50">
                        <span className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Cloud Top</span>
                        <div className="font-mono font-bold text-purple-300 text-lg">{day.technical_indices?.cloud_top_estimated || 'N/A'}</div>
                        <div className="text-[10px] text-slate-500">Mặt mây</div>
                    </div>
                    <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700/50">
                        <span className="block text-[10px] text-slate-400 uppercase font-bold mb-1">FSI Score</span>
                        <div className={`font-mono font-bold text-lg ${(day.technical_indices?.FSI_score || 0) < 30 ? 'text-green-400' : 'text-yellow-400'}`}>
                            {day.technical_indices?.FSI_score || 'N/A'}
                        </div>
                        <div className="text-[10px] text-slate-500">Stability</div>
                    </div>
                    <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700/50">
                        <span className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Wind Impact</span>
                        <div className={`font-mono font-bold text-lg ${day.technical_indices?.wind_impact_level === 'High' || day.technical_indices?.wind_impact_level === 'Destructive' ? 'text-red-400' : 'text-slate-200'}`}>
                            {day.technical_indices?.wind_impact_level || 'N/A'}
                        </div>
                        <div className="text-[10px] text-slate-500">{day.technical_indices?.wind_detail || 'Gió xé mây'}</div>
                    </div>
                     <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700/50">
                        <span className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Moisture</span>
                        <div className={`font-mono font-bold text-lg ${day.technical_indices?.moisture_type === 'Deep' ? 'text-blue-400' : 'text-orange-300'}`}>
                            {day.technical_indices?.moisture_type || 'N/A'}
                        </div>
                        <div className="text-[10px] text-slate-500">Cấu trúc ẩm</div>
                    </div>
                </div>

                {/* Additional Tech Details */}
                <div className="flex flex-wrap gap-2 text-xs">
                    {day.golden_hours && <span className="bg-amber-900/40 text-amber-300 px-2 py-1 rounded border border-amber-700/50">⏰ Giờ Vàng: {day.golden_hours}</span>}
                    {day.technical_indices?.inversion_strength && <span className="bg-orange-900/40 text-orange-300 px-2 py-1 rounded border border-orange-700/50">🌡️ Nghịch nhiệt: {day.technical_indices.inversion_strength}</span>}
                    {day.technical_indices?.boundary_status && <span className="bg-indigo-900/40 text-indigo-300 px-2 py-1 rounded border border-indigo-700/50">📏 {day.technical_indices.boundary_status}</span>}
                </div>

                {/* Weather Analysis Text */}
                <div className="bg-slate-800/30 rounded-lg p-4 border border-white/5 space-y-3">
                    <div>
                        <span className="text-cyan-600 text-[10px] font-bold uppercase tracking-wider block mb-1">PHÂN TÍCH HÌNH THẾ</span>
                        <p className="text-slate-300 text-sm leading-relaxed">{day.weather_analysis?.general || 'Không có dữ liệu'}</p>
                    </div>
                    <div className="border-t border-slate-700/50 pt-2">
                         <span className="text-purple-500 text-[10px] font-bold uppercase tracking-wider block mb-1">HÀNH VI CỦA MÂY (CLOUD BEHAVIOR)</span>
                         <p className="text-slate-300 text-sm leading-relaxed italic">"{day.weather_analysis?.cloud_behavior || 'Không có dữ liệu'}"</p>
                    </div>
                    {day.weather_analysis?.topography_effect && (
                      <div className="border-t border-slate-700/50 pt-2">
                           <span className="text-emerald-500 text-[10px] font-bold uppercase tracking-wider block mb-1">HIỆU ỨNG ĐỊA HÌNH (TOPOGRAPHY EFFECT)</span>
                           <p className="text-slate-300 text-sm leading-relaxed">"{day.weather_analysis.topography_effect}"</p>
                      </div>
                    )}
                    {day.weather_analysis?.risk_factors && (
                      <div className="border-t border-slate-700/50 pt-2">
                           <span className="text-rose-500 text-[10px] font-bold uppercase tracking-wider block mb-1">YẾU TỐ RỦI RO (RISK FACTORS)</span>
                           <p className="text-slate-300 text-sm leading-relaxed">"{day.weather_analysis.risk_factors}"</p>
                      </div>
                    )}
                </div>
              </div>

              {/* Right: Expert Advice */}
              <div className="xl:w-64 flex-shrink-0 flex flex-col justify-between border-t xl:border-t-0 xl:border-l border-white/10 pt-4 xl:pt-0 xl:pl-6">
                 <div>
                    <h4 className="text-cyan-400 font-bold text-xs uppercase mb-2 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                        Expert Advice
                    </h4>
                    <p className="text-slate-300 text-xs leading-relaxed">
                        {day.expert_advice || 'Không có lời khuyên cụ thể.'}
                    </p>
                    {day.recommended_position && (
                      <div className="mt-3 bg-amber-900/20 border border-amber-700/30 rounded p-2 text-xs text-amber-200">
                        📍 <strong>Vị trí:</strong> {day.recommended_position}
                      </div>
                    )}
                 </div>
                 
                 <div className="mt-4 pt-3 border-t border-white/5 flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>{day.weather_summary?.temp || 'N/A'}</span>
                    <span>{day.weather_summary?.wind || 'N/A'}</span>
                 </div>
              </div>

            </div>
          </div>
        ))}
      </div>

      {/* Gear & Sources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-2xl p-6">
            <h3 className="text-blue-400 font-bold text-sm uppercase mb-4">Trang bị khuyến nghị</h3>
            <div className="flex flex-wrap gap-2">
              {(result.gearChecklist || []).map((item, i) => (
                <span key={i} className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-600">{item}</span>
              ))}
            </div>
            
            {result.goldenTips && result.goldenTips.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-700/50">
                <h3 className="text-amber-400 font-bold text-sm uppercase mb-3">✨ Mẹo Vàng</h3>
                <ul className="space-y-2">
                  {result.goldenTips.map((tip, i) => (
                    <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">★</span> {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {result.safetyWarnings && result.safetyWarnings.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-700/50">
                <h3 className="text-rose-400 font-bold text-sm uppercase mb-3">⚠️ Cảnh báo an toàn</h3>
                <ul className="space-y-2">
                  {result.safetyWarnings.map((warning, i) => (
                    <li key={i} className="text-xs text-rose-300/80 flex items-start gap-2">
                      <span className="text-rose-500 mt-0.5">!</span> {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}
         </div>

         <div className="space-y-6">
           {result.weather_data_source && (
             <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-2xl p-6">
                <h3 className="text-slate-500 font-bold text-sm uppercase mb-4 flex items-center">
                    Nguồn Dữ Liệu Khí Tượng
                </h3>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <div className="flex items-start gap-3">
                        <div className="mt-1 text-cyan-500">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </div>
                        <div>
                            <div className="text-sm font-bold text-slate-200">{result.weather_data_source.locationName}</div>
                            <div className="text-xs text-slate-400 mt-1 flex gap-3">
                                {result.weather_data_source.lat && result.weather_data_source.lon && (
                                    <span>Tọa độ: {result.weather_data_source.lat.toFixed(4)}, {result.weather_data_source.lon.toFixed(4)}</span>
                                )}
                                {result.weather_data_source.elevation && (
                                    <span>Độ cao: {result.weather_data_source.elevation}m</span>
                                )}
                            </div>
                            <div className="mt-2 text-xs font-mono text-emerald-400 bg-emerald-900/20 inline-block px-2 py-1 rounded border border-emerald-800/50">
                                Source: {result.weather_data_source.source}
                            </div>
                        </div>
                    </div>
                </div>
             </div>
           )}

           {sources.length > 0 && (
             <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-2xl p-6">
                <h3 className="text-slate-500 font-bold text-sm uppercase mb-4 flex items-center">
                    Dữ liệu tham khảo (Sources)
                    <span className="ml-2 text-[10px] normal-case font-normal text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                        V4.0 Verified
                    </span>
                </h3>
                
                <div className="space-y-4">
                    {weatherSources.length > 0 && (
                        <div className="bg-emerald-950/30 rounded-lg p-3 border border-emerald-500/20">
                            <h4 className="text-emerald-400 text-xs font-bold uppercase mb-3 flex items-center gap-2 pb-2 border-b border-emerald-500/20">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                Dữ liệu Thời tiết / Kỹ thuật
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
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                Thông tin Khác (Review/News)
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
      </div>

      <div className="text-center pt-8">
        <button 
          onClick={onReset}
          className="px-6 py-2 rounded-full border border-slate-600 text-slate-400 hover:text-white hover:border-slate-400 transition-all text-sm"
        >
          Tra cứu địa điểm khác
        </button>
      </div>
    </div>
  );
};
