import React, { useEffect, useState } from 'react';
import { rankSpotsForDawn, SpotRank, listRankArchive, RankArchiveEntry } from '../services/rankingService';
import { STATUS_TEXT } from '../services/cloudScoreEngine';
import { MOUNTAIN_DB } from '../constants/mountains';
import { CAP_WATCH_TEXT } from '../services/capWatch';

const TOTAL_SPOTS = Object.keys(MOUNTAIN_DB).length;

/**
 * TonightRanking — "Đêm nay đi đâu săn mây?": bảng xếp hạng toàn thư viện cho rạng
 * sáng ngày mai (1 call batch GFS+ICON+UKMO). Bấm một điểm → chạy phân tích đầy đủ 6 mô hình.
 */
interface Props {
  targetDate: string;               // YYYY-MM-DD (ngày mai theo giờ VN)
  onPickSpot: (name: string, elevation: number) => void;
}

// Màu xanh = ĐÁNG ĐI (engine-2.8.2: kết luận có biển mây + đồng thuận + đứng CAO HƠN mặt mây ≥100m),
// KHÔNG phải điểm cao. Vàng = điểm khá nhưng chưa đủ điều kiện. Điểm chỉ xếp thứ tự.
const scoreBadge = (r: SpotRank) =>
  r.worthGoing ? 'bg-emerald-900/60 text-emerald-300 border-emerald-500/50'
  : r.score >= 45 ? 'bg-amber-900/50 text-amber-300 border-amber-500/40'
  : 'bg-slate-800 text-slate-400 border-slate-700';

export const TonightRanking: React.FC<Props> = ({ targetDate, onPickSpot }) => {
  const [ranks, setRanks] = useState<SpotRank[] | null>(null);
  const [progress, setProgress] = useState('Chuẩn bị...');
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  // Xem lại bảng đã lưu (phiếu g1a01): null = bảng của targetDate đang tính.
  const [viewing, setViewing] = useState<RankArchiveEntry | null>(null);
  const [archive, setArchive] = useState<RankArchiveEntry[]>(() => listRankArchive());

  useEffect(() => {
    let cancelled = false;
    setRanks(null); setError(null);
    rankSpotsForDawn(targetDate, msg => { if (!cancelled) setProgress(msg); })
      .then(r => { if (!cancelled) { setRanks(r); setArchive(listRankArchive()); } })
      .catch(e => { if (!cancelled) setError(e?.message || String(e)); });
    return () => { cancelled = true; };
  }, [targetDate]);

  const fmtDate = (d: string) => new Date(d + 'T12:00:00+07:00')
    .toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' });
  const dateVN = fmtDate(viewing ? viewing.targetDate : targetDate);
  const shown = viewing ? viewing.results : ranks;
  const visible = shown ? (showAll ? shown : shown.slice(0, 12)) : [];
  const others = archive.filter(e => e.targetDate !== targetDate || viewing);

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

      {viewing && (
        <div className="mt-3 text-[11px] text-sky-200 bg-sky-950/40 border border-sky-500/30 rounded-xl p-2.5 leading-relaxed">
          🗂️ Đang xem <b>bảng đã lưu</b> lúc {new Date(viewing.savedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
          {' '}({viewing.engine}). Đây là điều app nói LÚC ĐÓ, không tính lại. Bấm một điểm sẽ chạy phân tích mới.
          <button onClick={() => { setViewing(null); setShowAll(false); }}
            className="mt-2 block w-full min-h-11 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold">
            ← Về bảng rạng sáng {fmtDate(targetDate)}
          </button>
        </div>
      )}

      {error && (
        <p className="mt-3 text-xs text-rose-300 bg-rose-950/50 border border-rose-700/50 rounded-xl p-3">
          Không xếp hạng được: {error}
        </p>
      )}
      {!shown && !error && (
        <p className="mt-3 text-xs text-cyan-300 flex items-center gap-2">
          <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          {progress}
        </p>
      )}

      {shown && shown.some(r => r.capWatch?.tier === 'MATCH') && (
        <p className="mt-3 text-[11px] text-violet-200 bg-violet-950/30 border border-violet-500/30 rounded-xl p-2.5 leading-relaxed">
          🔎 <b>{shown.filter(r => r.capWatch?.tier === 'MATCH').length} điểm có điều kiện giống sáng 14/11</b>:{' '}
          {shown.filter(r => r.capWatch?.tier === 'MATCH').map(r => r.name).slice(0, 8).join(', ')}
          {shown.filter(r => r.capWatch?.tier === 'MATCH').length > 8 && '...'}. {CAP_WATCH_TEXT}
        </p>
      )}

      {shown && (
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
                      {r.worthGoing && <b className="text-emerald-300">✓ Đáng đi · </b>}{STATUS_TEXT[r.status]} · đứng {r.elevation}m
                      {r.deltaH !== null && ` · ${r.deltaH > 0 ? 'trên mặt mây' : 'dưới mặt mây'} ${Math.abs(Math.round(r.deltaH))}m`}
                      {' '}· đồng thuận {r.agreement}%
                    </span>
                  </span>
                  <span className={`shrink-0 px-2.5 py-1 rounded-lg border font-mono font-bold text-sm ${scoreBadge(r)}`}>
                    {r.score}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {shown.length > 12 && (
            <button
              onClick={() => setShowAll(v => !v)}
              className="mt-3 w-full min-h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-xs transition-all"
            >
              {showAll ? '▲ Thu gọn' : `▼ Xem cả ${shown.length} điểm`}
            </button>
          )}
          <p className="mt-2 text-[10px] text-slate-500">
            "✓ Đáng đi" = các mô hình kết luận có biển mây và bạn đứng cao hơn mặt mây; con số bên phải là
            điểm nguyên liệu, chỉ để xếp hạng, KHÔNG phải mức khuyên (điểm thấp vẫn có thể đáng đi). {shown.length}/{TOTAL_SPOTS} điểm có đủ dữ liệu · cùng engine + cùng 41 biến (đủ profile
            7 tầng) với bản đầy đủ — chỉ khác dùng 3 mô hình GFS+ICON+UKMO thay vì 6 nên điểm
            có thể lệch vài đơn vị (đo thực tế: trung bình ~4/100).
          </p>
        </>
      )}

      {others.length > 0 && (
        <details className="mt-3 text-xs text-slate-300">
          <summary className="cursor-pointer min-h-11 flex items-center font-bold text-slate-400">
            🗂️ Bảng đã lưu ({others.length} ngày) - xem lại nhanh, không tốn API
          </summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {others.map(e => (
              <button key={e.targetDate}
                onClick={() => { setViewing(e.targetDate === targetDate ? null : e); setShowAll(false); }}
                aria-label={`Xem lại bảng xếp hạng rạng sáng ${fmtDate(e.targetDate)}`}
                className={`min-h-11 px-3 rounded-full border text-xs transition-all ${viewing?.targetDate === e.targetDate ? 'border-sky-400 text-sky-200 bg-sky-950/50' : 'border-slate-700 bg-slate-900/60 hover:border-cyan-500/60'}`}>
                {e.targetDate.slice(8, 10)}/{+e.targetDate.slice(5, 7)} · {e.results.filter(r => r.worthGoing).length} đáng đi
              </button>
            ))}
          </div>
        </details>
      )}
    </div>
  );
};
