import React from 'react';
import { LocationAnalysis, WeatherInput } from '../types';

interface LocationConfirmProps {
  analysis: LocationAnalysis;
  inputData: WeatherInput;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const LocationConfirm: React.FC<LocationConfirmProps> = ({ analysis, inputData, onConfirm, onCancel, isLoading }) => {
  return (
    <div className="bg-slate-800/50 backdrop-blur-md p-6 rounded-2xl border border-slate-700 shadow-xl max-w-xl mx-auto animate-fade-in-up">
      <h2 className="text-xl font-bold text-cyan-400 mb-4 flex items-center">
        <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Xác nhận địa điểm
      </h2>
      
      <div className="bg-slate-900/60 rounded-xl p-5 border border-slate-700/50 mb-6 space-y-4">
        <div>
          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Tên địa điểm nhận diện</span>
          <div className="text-xl font-bold text-white flex items-center gap-2">
            {analysis.name}
            {analysis.is_known_peak && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-900/50 text-emerald-400 border border-emerald-700/50">
                VERIFIED
              </span>
            )}
          </div>
          <div className="text-sm text-slate-400">{analysis.province}</div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30">
            <span className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Độ cao đỉnh (Ước tính)</span>
            <div className="font-mono font-bold text-amber-400 text-lg">{analysis.estimated_elevation}m</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30">
            <span className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Độ cao đứng săn mây</span>
            <div className="font-mono font-bold text-cyan-400 text-lg">{inputData.observerAlt}m</div>
          </div>
        </div>

        <div>
           <span className="text-xs text-slate-500 uppercase font-bold tracking-wider block mb-1">Đặc điểm địa hình</span>
           <p className="text-sm text-slate-300 leading-relaxed italic border-l-2 border-slate-600 pl-3">
             "{analysis.description}"
           </p>
        </div>
        
        {analysis.confidence === 'LOW' && (
          <div className="bg-rose-900/20 border border-rose-500/30 rounded-lg p-3 flex items-start gap-3">
             <svg className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
             <p className="text-xs text-rose-300/90">
               Hệ thống không chắc chắn về địa điểm này. Vui lòng kiểm tra lại tên hoặc tiếp tục nếu bạn chắc chắn.
             </p>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button 
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 py-3 rounded-xl font-bold text-sm transition-all border border-slate-600 text-slate-300 hover:bg-slate-800 disabled:opacity-50"
        >
          Quay lại sửa
        </button>
        <button 
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-[2] py-3 rounded-xl font-bold text-sm transition-all shadow-lg flex justify-center items-center bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Đang phân tích lịch trình...
            </>
          ) : (
            "Tiến hành Phân tích Lịch trình"
          )}
        </button>
      </div>
    </div>
  );
};
