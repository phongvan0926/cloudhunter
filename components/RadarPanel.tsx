import React, { useEffect, useMemo, useState } from 'react';

/**
 * RadarPanel — radar mưa RainViewer (đã kiểm chứng: composite phủ Việt Nam thật,
 * 10 trạm NCHMF được nạp vào; API public, CORS *). Trả lời câu hỏi kinh điển của
 * dân săn mây: "mưa phùn tối nay có tan trước sáng không?" (mưa phùn chiều tối +
 * sáng quang = biển mây đẹp).
 *
 * Bản đồ nền: 3×3 tile OpenStreetMap (lọc màu tối cho hợp UI), radar phủ lên trên.
 */
interface Frame { time: number; path: string; }

interface Props { lat: number; lon: number; }

const Z = 7; // ~1.2km/px tại vĩ độ VN — đủ thấy cả vùng núi quanh điểm

function tileXY(lat: number, lon: number, z: number) {
  const n = 2 ** z;
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x, y };
}

export const RadarPanel: React.FC<Props> = ({ lat, lon }) => {
  const [host, setHost] = useState<string | null>(null);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('https://api.rainviewer.com/public/weather-maps.json')
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        const past: Frame[] = d?.radar?.past || [];
        const nowcast: Frame[] = d?.radar?.nowcast || []; // có lúc rỗng — xử lý trung thực
        const all = [...past, ...nowcast];
        if (!d?.host || all.length === 0) { setError('RainViewer không có khung radar nào lúc này.'); return; }
        setHost(d.host);
        setFrames(all);
        setIdx(past.length - 1); // mặc định: khung "hiện tại"
      })
      .catch(() => { if (!cancelled) setError('Không tải được dữ liệu radar (mạng hoặc RainViewer).'); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!playing || frames.length === 0) return;
    const t = setInterval(() => setIdx(p => (p + 1) % frames.length), 500);
    return () => clearInterval(t);
  }, [playing, frames.length]);

  const { x, y } = useMemo(() => tileXY(lat, lon, Z), [lat, lon]);
  const offsets = [-1, 0, 1];
  const frame = frames[idx];
  const timeLabel = frame
    ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' }).format(new Date(frame.time * 1000))
    : '';
  const isNowcast = frame && frame.time * 1000 > Date.now();

  return (
    <details className="bg-slate-900/70 border border-slate-700 rounded-2xl overflow-hidden group">
      <summary className="cursor-pointer select-none px-4 py-3 min-h-11 flex items-center gap-2 text-sm font-bold text-sky-300 hover:bg-slate-800/60 transition-colors">
        <span>🌧️</span>
        <span>Radar mưa quanh điểm (RainViewer · 10 trạm radar VN)</span>
        <span className="ml-auto text-slate-500 text-xs group-open:hidden">mở ▾</span>
      </summary>
      <div className="px-4 pb-4 space-y-3">
        <p className="text-xs text-slate-400 leading-relaxed">
          Quy luật dân săn mây: <b>mưa phùn chiều tối tan trước nửa đêm + trời quang = biển mây đẹp</b>.
          Xem 2h radar gần nhất để biết mưa đang tan hay đang lan tới.
        </p>
        {error && (
          <p className="text-xs text-rose-300 bg-rose-950/50 border border-rose-700/50 rounded-xl p-3">{error}</p>
        )}
        {host && frame && (
          <>
            <div className="relative rounded-xl overflow-hidden border border-slate-700 aspect-square max-w-sm mx-auto">
              <div className="grid grid-cols-3 absolute inset-0">
                {offsets.flatMap(dy => offsets.map(dx => (
                  <div key={`${dx}_${dy}`} className="relative">
                    <img
                      src={`https://tile.openstreetmap.org/${Z}/${x + dx}/${y + dy}.png`}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover"
                      style={{ filter: 'invert(1) hue-rotate(180deg) brightness(0.75) contrast(1.05) saturate(0.4)' }}
                    />
                    <img
                      src={`${host}${frame.path}/256/${Z}/${x + dx}/${y + dy}/2/1_1.png`}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover opacity-80"
                    />
                  </div>
                )))}
              </div>
              {/* Tâm = điểm săn mây */}
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xl drop-shadow-lg pointer-events-none">📍</span>
              <span className={`absolute top-2 right-2 px-2 py-1 rounded-lg text-xs font-mono font-bold ${
                isNowcast ? 'bg-purple-950/80 text-purple-300' : 'bg-slate-950/80 text-sky-300'
              }`}>
                {isNowcast ? `dự báo ${timeLabel}` : `${timeLabel} giờ VN`}
              </span>
            </div>
            <div className="flex items-center gap-3 max-w-sm mx-auto">
              <button
                onClick={() => setPlaying(p => !p)}
                aria-label={playing ? 'Dừng vòng lặp radar' : 'Chạy vòng lặp radar'}
                className="min-h-11 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/30 font-bold text-xs transition-all shrink-0"
              >
                {playing ? '⏸ Dừng' : '▶ Chạy'}
              </button>
              <input
                type="range"
                min={0}
                max={frames.length - 1}
                value={idx}
                aria-label="Chọn thời điểm khung radar"
                onChange={e => { setPlaying(false); setIdx(Number(e.target.value)); }}
                className="w-full accent-sky-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <p className="text-[10px] text-slate-500 text-center">
              © OpenStreetMap contributors · Radar: RainViewer (composite NCHMF) · vùng không radar phủ sẽ không có màu
            </p>
          </>
        )}
      </div>
    </details>
  );
};
