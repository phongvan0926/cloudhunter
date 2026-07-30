import React, { useState, useEffect } from 'react';
import { discoverModels, DiscoveredModel, getStoredModel, setStoredModel } from '../services/modelDiscoveryService';

interface ModelSelectorProps {
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  compact?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onSelectModel,
  compact = false,
}) => {
  const [models, setModels] = useState<DiscoveredModel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const fetchModels = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      const list = await discoverModels();
      setModels(list);

      // Auto-select stored or default candidate if none currently valid
      const stored = getStoredModel();
      const isValidStored = list.some(m => m.id === stored);

      if (stored && isValidStored) {
        onSelectModel(stored);
      } else if (list.length > 0) {
        // Safe default: top Flash / Light model (R4)
        const defaultCandidate = list.find(m => m.isDefaultCandidate) || list[0];
        onSelectModel(defaultCandidate.id);
        setStoredModel(defaultCandidate.id);
      }
    } catch (err: any) {
      if (err.message && err.message.startsWith('AUTH_ERROR')) {
        setAuthError('🔑 Key không hợp lệ hoặc không có quyền truy cập list-models');
      } else {
        setAuthError('Không thể tải danh sách model động. Sử dụng danh sách dự phòng.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    onSelectModel(val);
    setStoredModel(val);
  };

  const activeModelObj = models.find(m => m.id === selectedModel);

  return (
    <div className={`bg-slate-900/80 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3.5 shadow-lg ${compact ? 'max-w-md mx-auto' : ''}`}>
      <div className="flex justify-between items-center mb-2 gap-2">
        <label className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
          <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          Mô hình AI (Dynamic Discovery)
        </label>

        <button
          onClick={fetchModels}
          disabled={loading}
          title="Tải lại danh sách model mới nhất từ nhà cung cấp"
          className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded-md border border-slate-600 flex items-center gap-1 transition-all disabled:opacity-50"
        >
          <span className={loading ? 'animate-spin' : ''}>🔄</span>
          <span>Cập nhật</span>
        </button>
      </div>

      {authError && (
        <div className="text-[11px] text-rose-400 bg-rose-950/40 p-2 rounded border border-rose-800/50 mb-2">
          {authError}
        </div>
      )}

      <div className="relative">
        <select
          value={selectedModel}
          onChange={handleModelChange}
          disabled={loading}
          className="w-full bg-slate-950 text-slate-100 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-cyan-500 transition-all appearance-none cursor-pointer pr-8"
        >
          {models.map(m => (
            <option key={m.id} value={m.id}>
              {m.displayName} [{m.tierLabel}] {m.isDefaultCandidate ? '⭐ Mặc định' : ''}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
      </div>

      {activeModelObj && (
        <div className="mt-2 text-[10px] text-slate-400 flex justify-between items-center">
          <span className="truncate max-w-[280px] italic">{activeModelObj.description}</span>
          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
            activeModelObj.tier === 'flash' ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700' :
            activeModelObj.tier === 'pro' ? 'bg-purple-950/60 text-purple-300 border-purple-700' :
            'bg-amber-950/60 text-amber-300 border-amber-700'
          }`}>
            {activeModelObj.tierLabel}
          </span>
        </div>
      )}
    </div>
  );
};
