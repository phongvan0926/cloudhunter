import React, { useEffect, useState } from 'react';
import { CloudAnalysis } from '../types';
import { verifyRun, RunVerification } from '../services/verificationService';

/**
 * VerificationPanel — "App đoán gì vs thực tế": đối chiếu một lần dự báo đã lưu với
 * dữ liệu tái phân tích ERA5 (proxy quan trắc, trễ ~5 ngày). Đây là vòng kiểm chứng
 * độ chính xác đầu tiên của app — sai thì nói sai, không giấu.
 */
interface Props {
  analysis: CloudAnalysis;
  onClose: () => void;
}

export const VerificationPanel: React.FC<Props> = ({ analysis, onClose }) => {
  const [result, setResult] = useState<RunVerification | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setResult(null); setError(null);
    verifyRun(analysis)
      .then(r => { if (!cancelled) setResult(r); })
      .catch(e => { if (!cancelled) setError(e?.message || String(e)); });
    return () => { cancelled = true; };
  }, [analysis]);

  const fmtDate = (d: string) =>
    new Date(d + 'T12:00:00+07:00').toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' });

  return (
    <div className="max-w-xl mx-auto mt-3 bg-slate-800/60 backdrop-blur-md p-5 rounded-2xl border border-slate-700 shadow-xl animate-fade-in-up">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold text-teal-300 flex items-center gap-2">
          <span>🔬</span>
          <span>App đoán gì vs thực tế — {analysis.locationName}</span>
        </h3>
        <button
          onClick={onClose}
          aria-label="Đóng bảng đối chiếu"
          className="min-w-11 min-h-11 flex items-center justify-center text-slate-400 hover:text-white rounded-full hover:bg-slate-700 -mt-2 -mr-2"
        >
          ✕
        </button>
      </div>
      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
        "Thực tế" = % mây tầng thấp 4-9h từ tái phân tích <b>ERA5</b> (quan trắc đồng hóa,
        trễ ~5 ngày) — proxy tốt nhất không cần backend, không phải ảnh mắt thấy tại chỗ.
        Ngưỡng có biển mây: ≥40%.
      </p>

      {error && (
        <p className="mt-3 text-xs text-amber-300 bg-amber-950/40 border border-amber-700/40 rounded-xl p-3">{error}</p>
      )}
      {!result && !error && <p className="mt-3 text-xs text-cyan-300">⏳ Đang tải ERA5...</p>}

      {result && (
        <>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
            <span className="px-3 py-1.5 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-600/40">
              ✅ Trúng {result.hits}
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-rose-950/60 text-rose-300 border border-rose-600/40">
              ❌ Trượt {result.misses}
            </span>
            {result.pending > 0 && (
              <span className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 border border-slate-700">
                ⏳ Chưa có ERA5: {result.pending}
              </span>
            )}
          </div>
          <ul className="mt-3 space-y-1.5">
            {result.days.map(d => (
              <li key={d.date} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-700/60 text-xs">
                <span className="w-16 shrink-0 font-mono text-slate-300">{fmtDate(d.date)}</span>
                <span className="flex-1 text-slate-400">
                  Đoán: <b className={d.predictedCloudSea ? 'text-cyan-300' : 'text-slate-300'}>
                    {d.predictedCloudSea ? 'có biển mây' : 'không'}
                  </b> ({d.predictedStatus} · {d.predictedScore} điểm)
                  {' '}· Thực tế: {d.actualCloudLowPct === null
                    ? <i>chưa có dữ liệu</i>
                    : <b className={d.actualCloudSea ? 'text-cyan-300' : 'text-slate-300'}>mây thấp {d.actualCloudLowPct}%</b>}
                </span>
                <span className="shrink-0 text-base">
                  {d.hit === null ? '⏳' : d.hit ? '✅' : '❌'}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};
