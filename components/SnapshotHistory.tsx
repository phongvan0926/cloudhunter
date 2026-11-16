import React, { useEffect, useState } from 'react';
import { STATUS_TEXT } from '../services/cloudScoreEngine';
import { addDaysStr, vnTodayStr } from '../services/weatherService';

/**
 * SnapshotHistory - "Bản chụp dự báo hằng ngày": đọc các tệp data/observations/<ngày>-forecast.json
 * do vòng kiểm chứng (GitHub Actions) ghi mỗi tối, TRƯỚC khi biết sự thật. Chỉ đọc, không tính lại:
 * đây là điều app đã nói cho rạng sáng từng ngày, dùng để đối chiếu. Lấy thẳng từ kho GitHub công khai
 * nên không cần build lại site mỗi lần có bản chụp mới.
 */
const RAW = 'https://raw.githubusercontent.com/phongvan0926/cloudhunter/main/data/observations';
const DAYS_BACK = 14;

interface SnapSpot {
  key: string; name: string; score: number; status: string; agreement: number;
  deltaH: number | null; worthGoing: boolean;
}
interface Snap { date: string; engineVersion: string; snapshotAt: string; spots: SnapSpot[] }

const dm = (d: string) => `${parseInt(d.slice(8), 10)}/${parseInt(d.slice(5, 7), 10)}`;
const DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const dow = (d: string) => DOW[new Date(d + 'T12:00:00+07:00').getDay()];

function vnTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export const SnapshotHistory: React.FC = () => {
  const [snaps, setSnaps] = useState<Snap[] | null>(null);
  const [failed, setFailed] = useState(0);
  const [sel, setSel] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const today = vnTodayStr();
    const dates = Array.from({ length: DAYS_BACK + 1 }, (_, i) => addDaysStr(today, 1 - i)); // mai ... 14 ngày trước
    Promise.all(dates.map(async d => {
      try {
        const r = await fetch(`${RAW}/${d}-forecast.json`);
        if (r.status === 404) return { d, snap: null as Snap | null, err: false };
        if (!r.ok) return { d, snap: null, err: true };
        return { d, snap: (await r.json()) as Snap, err: false };
      } catch { return { d, snap: null, err: true }; }
    })).then(res => {
      if (cancelled) return;
      const ok = res.filter(x => x.snap).map(x => x.snap as Snap);
      setSnaps(ok);
      setFailed(res.filter(x => x.err).length);
      setSel(ok[0]?.date ?? null);
    });
    return () => { cancelled = true; };
  }, []);

  const cur = snaps?.find(s => s.date === sel) ?? null;
  const spots = cur ? [...cur.spots].sort((a, b) => Number(b.worthGoing) - Number(a.worthGoing) || b.score - a.score) : [];
  const visible = showAll ? spots : spots.filter(s => s.worthGoing).slice(0, 20);
  const missing = snaps ? Array.from({ length: DAYS_BACK }, (_, i) => addDaysStr(vnTodayStr(), -i)).filter(d => !snaps.some(s => s.date === d)) : [];

  return (
    <div className="max-w-xl mx-auto mt-4 bg-slate-800/50 backdrop-blur-md p-4 rounded-2xl border border-slate-700 shadow-xl animate-fade-in-up">
      <h3 className="text-base font-bold text-sky-300 flex items-center gap-2"><span>📸</span><span>Bản chụp dự báo hằng ngày</span></h3>
      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
        Mỗi tối (khoảng 22-24h, giờ chạy của GitHub có thể lệch) máy chụp lại app đã dự báo gì cho rạng sáng hôm sau, TRƯỚC khi biết sự thật,
        và không sửa lại về sau. Đây là bản đã lưu, không tính lại; muốn dự báo mới nhất thì dùng "Đêm nay đi đâu".
      </p>
      {!snaps && <p className="mt-3 text-xs text-cyan-300">⏳ Đang tải các bản chụp...</p>}
      {snaps && snaps.length === 0 && (
        <p className="mt-3 text-xs text-rose-300 bg-rose-950/50 border border-rose-700/50 rounded-xl p-3">
          {failed > 0 ? 'Không tải được bản chụp (lỗi mạng hoặc GitHub). Thử lại sau.' : 'Chưa có bản chụp nào trong 14 ngày qua.'}
        </p>
      )}
      {snaps && snaps.length > 0 && (
        <>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {snaps.map(s => (
              <button key={s.date} onClick={() => setSel(s.date)} aria-label={`Xem bản chụp cho rạng sáng ${dm(s.date)}`}
                className={`min-h-11 px-3 rounded-lg text-xs font-bold border ${sel === s.date ? 'bg-sky-500/25 text-sky-200 border-sky-400/60' : 'bg-slate-900/60 text-slate-300 border-slate-700'}`}>
                {dow(s.date)} {dm(s.date)}
              </button>
            ))}
          </div>
          {missing.length > 0 && (
            <p className="mt-2 text-[11px] text-amber-300/90">
              Không có bản chụp: {missing.map(dm).join(', ')}
              {missing.includes(vnTodayStr()) ? ' (bản của hôm nay có thể chỉ chậm do GitHub chạy trễ; các ngày cũ hơn không chụp bù được vì dự báo cũ bị viết lại)' : ' (không chụp bù được vì dự báo cũ bị viết lại)'}.
            </p>
          )}
          {failed > 0 && <p className="mt-1 text-[11px] text-amber-300/90">{failed} ngày không tải được do lỗi mạng, có thể còn thiếu.</p>}
          {cur && (
            <>
              <p className="mt-3 text-xs text-slate-200 bg-slate-900/60 border border-slate-700 rounded-xl p-2.5">
                Rạng sáng <b>{dow(cur.date)} {dm(cur.date)}</b>, chụp lúc {vnTime(cur.snapshotAt)} ({cur.engineVersion}):
                {' '}<b className="text-emerald-300">{cur.spots.filter(s => s.worthGoing).length}/{cur.spots.length} điểm đáng đi</b>.
              </p>
              <ul className="mt-2 space-y-1">
                {visible.map(s => (
                  <li key={s.key} className="flex items-center justify-between gap-2 text-[12px] bg-slate-900/40 rounded-lg px-2.5 py-1.5">
                    <span className="font-semibold text-slate-100 truncate">{s.worthGoing ? '✓ ' : ''}{s.name}</span>
                    <span className="shrink-0 text-slate-400">
                      {(STATUS_TEXT as Record<string, string>)[s.status] ?? s.status} · {s.score} · {s.agreement}%{s.deltaH != null ? ` · ΔH ${s.deltaH > 0 ? '+' : ''}${Math.round(s.deltaH)}m` : ''}
                    </span>
                  </li>
                ))}
                {visible.length === 0 && <li className="text-xs text-slate-400">Hôm đó không điểm nào được báo đáng đi.</li>}
              </ul>
              <button onClick={() => setShowAll(v => !v)} className="mt-2 min-h-11 w-full text-xs font-bold text-sky-300 rounded-lg border border-slate-700">
                {showAll ? 'Chỉ hiện điểm đáng đi' : `Hiện cả ${cur.spots.length} điểm`}
              </button>
              <p className="mt-2 text-[10px] text-slate-500">Mỗi dòng: trạng thái · điểm (chỉ để xếp hạng) · đồng thuận mô hình · ΔH = độ cao điểm đứng trừ mặt mây.</p>
            </>
          )}
        </>
      )}
    </div>
  );
};
