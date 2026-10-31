import React, { useEffect, useState } from 'react';
import { rankSpotsForWeek, WeekRow, WEEK_CONFIDENT_LEAD_DAYS } from '../services/rankingService';
import { STATUS_TEXT } from '../services/cloudScoreEngine';

/**
 * WeekRanking - "7 ngày tới săn mây ở đâu": bảng điểm miền Bắc × 7 rạng sáng, cột Thứ 7/Chủ nhật
 * nổi bật. Dùng cùng engine và luật "đáng đi" với bảng "đêm nay". Không có % khả năng: ô xanh là
 * "engine kết luận đáng đi", ô viền đứt là dự báo xa hơn 3 ngày (tham khảo).
 */
interface Props {
  today: string;
  dates: string[];
  onPickSpot: (name: string, elevation: number) => void;
}

// Điểm đã có nhiều ngày đối chiếu thực địa (người đi + Facebook); các điểm khác chưa kiểm chứng.
const VALIDATED = new Set(['TA_XUA_SON_LA', 'FANSIPAN']);
const dow = (d: string) => new Date(d + 'T12:00:00+07:00').getDay();
const DOW_TEXT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const dm = (d: string) => `${parseInt(d.slice(8), 10)}/${parseInt(d.slice(5, 7), 10)}`;

export const WeekRanking: React.FC<Props> = ({ today, dates, onPickSpot }) => {
  const [rows, setRows] = useState<WeekRow[] | null>(null);
  const [progress, setProgress] = useState('Chuẩn bị...');
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setRows(null); setError(null);
    rankSpotsForWeek(today, dates, m => { if (!cancelled) setProgress(m); })
      .then(r => { if (!cancelled) setRows(r); })
      .catch(e => { if (!cancelled) setError(e?.message || String(e)); });
    return () => { cancelled = true; };
  }, [today, dates.join(',')]);

  const weekend = dates.filter(d => dow(d) === 6 || dow(d) === 0);
  const goodOnWeekend = rows ? rows.filter(r => r.days.some(x => weekend.includes(x.date) && x.worthGoing)) : [];
  const visible = rows ? (showAll ? rows : rows.filter(r => r.worthDays > 0).slice(0, 15)) : [];

  return (
    <div className="max-w-xl mx-auto mt-4 bg-slate-800/50 backdrop-blur-md p-4 rounded-2xl border border-slate-700 shadow-xl animate-fade-in-up">
      <h3 className="text-base font-bold text-emerald-300 flex items-center gap-2"><span>📅</span><span>7 ngày tới săn mây ở đâu? (miền Bắc)</span></h3>
      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
        Mỗi ô là một rạng sáng. <b className="text-emerald-300">✓ Đáng đi</b> = các mô hình kết luận có biển mây và bạn đứng
        cao hơn mặt mây (không dựa vào điểm). <b>Số</b> = điểm nguyên liệu sương bức xạ, chỉ để xếp hạng, KHÔNG phải mức khuyên:
        ô ✓ vẫn có thể kèm điểm thấp. ★ = điểm đã kiểm chứng thực địa. Ô viền đứt = dự báo xa hơn {WEEK_CONFIDENT_LEAD_DAYS} ngày, chỉ để tham khảo, hãy xem lại gần ngày đi.
      </p>
      {error && <p className="mt-3 text-xs text-rose-300 bg-rose-950/50 border border-rose-700/50 rounded-xl p-3">Không xếp hạng được: {error}</p>}
      {!rows && !error && <p className="mt-3 text-xs text-cyan-300">{progress}</p>}
      {rows && (
        <>
          <p className="mt-3 text-xs text-slate-200 bg-slate-900/60 border border-slate-700 rounded-xl p-2.5">
            {goodOnWeekend.length
              ? <>Cuối tuần ({weekend.map(dm).join(', ')}) engine thấy đáng đi: <b className="text-emerald-300">{goodOnWeekend.map(r => r.name).join(', ')}</b>.</>
              : <>Cuối tuần ({weekend.map(dm).join(', ') || 'ngoài 7 ngày'}) <b>chưa điểm nào</b> được engine kết luận đáng đi theo dự báo hiện tại.</>}
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-[11px] border-separate border-spacing-y-1">
              <thead>
                <tr>
                  <th className="text-left text-slate-400 font-normal pr-1">Điểm</th>
                  {dates.map(d => (
                    <th key={d} className={`px-0 font-semibold ${dow(d) === 6 || dow(d) === 0 ? 'text-amber-300' : 'text-slate-400'}`}>
                      {DOW_TEXT[dow(d)]}<br /><span className="font-normal">{dm(d)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map(r => (
                  <tr key={r.key}>
                    <td className="pr-1 max-w-[5.5rem]">
                      <button onClick={() => onPickSpot(r.name, r.elevation)} className="min-h-11 text-left text-slate-100 font-semibold truncate max-w-full hover:text-cyan-300">
                        {VALIDATED.has(r.key) && <span title="đã có ngày kiểm chứng thực địa" className="text-amber-300">★ </span>}{r.name}<span className="block text-[10px] text-slate-500 font-normal">{r.elevation}m</span>
                      </button>
                    </td>
                    {dates.map(d => {
                      const x = r.days.find(y => y.date === d);
                      const far = x ? x.leadDays > WEEK_CONFIDENT_LEAD_DAYS : false;
                      const isWe = dow(d) === 6 || dow(d) === 0;
                      const cls = !x ? 'bg-slate-900 text-slate-600'
                        : x.worthGoing ? 'bg-emerald-900/60 text-emerald-300 border-emerald-500/50'
                        : x.score >= 45 ? 'bg-amber-900/40 text-amber-300 border-amber-500/30'
                        : 'bg-slate-900/70 text-slate-500 border-slate-700';
                      return (
                        <td key={d} className={`text-center ${isWe ? 'bg-amber-500/5' : ''}`}>
                          <span
                            title={x ? `${STATUS_TEXT[x.status]} · điểm ${x.score} · đồng thuận ${x.agreement}%${x.deltaH !== null ? ` · ΔH ${Math.round(x.deltaH)}m` : ''}${far ? ' · dự báo xa, tham khảo' : ''}` : 'thiếu dữ liệu'}
                            className={`inline-block min-w-[1.65rem] px-0.5 py-1.5 rounded-md text-[10px] border font-mono font-bold ${cls} ${far ? 'border-dashed' : ''}`}
                          >
                            {x ? (x.worthGoing
                              ? <span className="flex flex-col leading-tight"><span>✓</span><span className="text-[9px] font-normal opacity-70">{x.score}</span></span>
                              : x.score) : '-'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {!visible.length && <p className="text-xs text-slate-400 py-2">Không điểm nào đáng đi trong 7 ngày tới.</p>}
          </div>
          <button onClick={() => setShowAll(v => !v)} className="mt-2 w-full min-h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-xs">
            {showAll ? '▲ Chỉ điểm có ngày đáng đi' : `▼ Xem cả ${rows.length} điểm miền Bắc`}
          </button>
          <p className="mt-2 text-[10px] text-slate-500 leading-relaxed">
            Đây là kết luận của engine trên 3 mô hình, KHÔNG phải xác suất. Độ chính xác đã đo mới ở dự báo
            trước ~1 ngày và chủ yếu ở Tà Xùa, Fansipan; các điểm khác chưa kiểm chứng. Dự báo 4-7 ngày
            kém tin hơn nhiều, chỉ dùng để chọn ngày đáng theo dõi rồi xem lại tối hôm trước.
          </p>
        </>
      )}
    </div>
  );
};
