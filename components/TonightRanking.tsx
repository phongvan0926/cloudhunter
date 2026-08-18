import React, { useEffect, useState } from 'react';
import { rankSpotsForDawn, SpotRank } from '../services/rankingService';
import { STATUS_TEXT } from '../services/cloudScoreEngine';
import { MOUNTAIN_DB } from '../constants/mountains';

const TOTAL_SPOTS = Object.keys(MOUNTAIN_DB).length;

/**
 * TonightRanking — "Đêm nay đi đâu săn mây?": bảng xếp hạng toàn thư viện cho rạng
 * sáng ngày mai (1 call batch GFS+ICON+UKMO). Bấm một điểm → chạy phân tích đầy đủ 6 mô hình.
 */
interface Props {
  targetDate: string;               // YYYY-MM-DD (ngày mai theo giờ VN)
  onPickSpot: (name: string, elevation: number) => void;
}

const scoreBadge = (score: number) =>
  score >= 65 ? 'bg-emerald-900/60 text-emerald-300 border-emerald-500/50'
  : score >= 45 ? 'bg-amber-900/50 text-amber-300 border-amber-500/40'
  : 'bg-slate-800 text-slate-400 border-slate-700';

export const TonightRanking: React.FC<Props> = ({ targetDate, onPickSpot }) => {
  const [ranks, setRanks] = useState<SpotRank[] | null>(null);
  const [progress, setProgress] = useState('Chuẩn bị...');
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setRanks(null); setError(null);
    rankSpotsForDawn(targetDate, msg => { if (!cancelled) setProgress(msg); })
      .then(r => { if (!cancelled) setRanks(r); })
      .catch(e => { if (!cancelled) setError(e?.message || String(e)); });
    return () => { cancelled = true; };
  }, [targetDate]);

  const dateVN = new Date(targetDate + 'T12:00:00+07:00')
    .toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' });
  const visible = ranks ? (showAll ? ranks : ranks.slice(0, 12)) : [];

  return (
    <div className="max-w-xl mx-auto mt-4 bg-slate-800/50 backdrop-blur-md p-5 rounded-2xl border border-slate-700 shadow-xl animate-fade-in-up">
      <h3 className="text-base font-bold text-amber-300 flex items-center gap-2">
        <span>🌄</span>
        <span>Đêm nay đi đâu săn mây? — rạng sáng {dateVN}</span>
      </h3>
      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
        Xếp hạng nhanh <b>toàn bộ thư viện</b> theo 3 mô hình GFS+ICON+UKMO, dữ liệu lấy tại
        đáy thung lũng từng điểm. Bấm một điểm để phân tích đầy đủ 6 mô hình + biểu đồ.
      </p>

      {error && (
        <p className="mt-3 text-xs text-rose-300 bg-rose-950/50 border border-rose-700/50 rounded-xl p-3">
          Không xếp hạng được: {error}
        </p>
      )}
      {!ranks && !error && (
        <p className="mt-3 text-xs text-cyan-300 flex items-center gap-2">
          <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          {progress}
        </p>
      )}

      {ranks && (
        <>
          <ul className="mt-3 space-y-1.5">
            {visible.map((r, i) => (
              <li key={r.key}>
                <button
                  onClick={() => onPickSpot(r.name, r.elevation)}
                  className="w-full min-h-11 flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-700/60 hover:border-cyan-500/60 hover:bg-slate-900 transition-all text-left"
                >
                  <span className={`w-7 text-center font-black text-sm ${i < 3 ? 'text-amber-300' : 'text-slate-500'}`}>
                    {i + 1}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-slate-100 truncate">{r.name}</span>
                    <span className="block text-[11px] text-slate-400">
                      {STATUS_TEXT[r.status]} · đứng {r.elevation}m · đồng thuận {r.agreement}%
                    </span>
                  </span>
                  <span className={`shrink-0 px-2.5 py-1 rounded-lg border font-mono font-bold text-sm ${scoreBadge(r.score)}`}>
                    {r.score}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {ranks.length > 12 && (
            <button
              onClick={() => setShowAll(v => !v)}
              className="mt-3 w-full min-h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-xs transition-all"
            >
              {showAll ? '▲ Thu gọn' : `▼ Xem cả ${ranks.length} điểm`}
            </button>
          )}
          <p className="mt-2 text-[10px] text-slate-500">
            {ranks.length}/{TOTAL_SPOTS} điểm có đủ dữ liệu · cùng engine + cùng 41 biến (đủ profile
            7 tầng) với bản đầy đủ — chỉ khác dùng 3 mô hình GFS+ICON+UKMO thay vì 6 nên điểm
            có thể lệch vài đơn vị (đo thực tế: trung bình ~4/100).
          </p>
        </>
      )}
    </div>
  );
};
