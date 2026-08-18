import React, { useEffect, useMemo, useRef, useState } from 'react';

/**
 * SatellitePanel — "Mây lúc này": vòng lặp ảnh Himawari-9 Band13 (hồng ngoại) vùng
 * Đông Nam Á của JMA. Hồng ngoại nhìn được mây CẢ BAN ĐÊM — đúng khung 4-6h săn mây.
 *
 * Nguồn dữ liệu THẬT, không backend: https://www.data.jma.go.jp/mscweb/data/himawari/
 * (ảnh 10 phút/tấm, giữ ~24h, độ trễ 20-45 phút; dùng <img> thuần nên không vướng CORS).
 * Việt Nam nằm ở nửa TRÁI khung ảnh se1; mây thấp/sương hiện XÁM NHẠT, mây đối lưu
 * cao/lạnh hiện TRẮNG SÁNG.
 */
const JMA_SE1 = 'https://www.data.jma.go.jp/mscweb/data/himawari/img/se1/se1_b13_';
const FRAME_COUNT = 12;   // 12 khung × 10 phút = 2 giờ gần nhất
const SAFE_LAG_MIN = 40;  // lùi 40 phút để chắc chắn ảnh đã được JMA đăng

interface Frame {
  hhmm: string;   // UTC HHMM trong URL
  labelVN: string; // giờ VN hiển thị
  url: string;
}

function buildFrames(): Frame[] {
  const frames: Frame[] = [];
  const newest = new Date(Date.now() - SAFE_LAG_MIN * 60000);
  newest.setUTCMinutes(Math.floor(newest.getUTCMinutes() / 10) * 10, 0, 0);
  for (let i = FRAME_COUNT - 1; i >= 0; i--) {
    const t = new Date(newest.getTime() - i * 10 * 60000);
    const hhmm = `${String(t.getUTCHours()).padStart(2, '0')}${String(t.getUTCMinutes()).padStart(2, '0')}`;
    const labelVN = new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(t);
    frames.push({ hhmm, labelVN, url: `${JMA_SE1}${hhmm}.jpg` });
  }
  return frames;
}

export const SatellitePanel: React.FC = () => {
  const frames = useMemo(buildFrames, []);
  const [idx, setIdx] = useState(frames.length - 1);
  const [playing, setPlaying] = useState(false);
  const [broken, setBroken] = useState<Set<number>>(new Set());
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // preload để loop mượt
  useEffect(() => {
    frames.forEach((f, i) => {
      const img = new Image();
      img.onerror = () => setBroken(prev => new Set(prev).add(i));
      img.src = f.url;
    });
  }, [frames]);

  useEffect(() => {
    if (!playing) { if (timer.current) clearInterval(timer.current); return; }
    timer.current = setInterval(() => {
      setIdx(prev => {
        let next = (prev + 1) % frames.length;
        // bỏ qua khung lỗi (ảnh chưa đăng / bị xoá)
        for (let guard = 0; broken.has(next) && guard < frames.length; guard++) {
          next = (next + 1) % frames.length;
        }
        return next;
      });
    }, 350);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [playing, frames.length, broken]);

  const current = frames[idx];
  const allBroken = broken.size >= frames.length;

  return (
    <details className="bg-slate-900/70 border border-slate-700 rounded-2xl overflow-hidden group">
      <summary className="cursor-pointer select-none px-4 py-3 min-h-11 flex items-center gap-2 text-sm font-bold text-cyan-300 hover:bg-slate-800/60 transition-colors">
        <span>🛰️</span>
        <span>Mây LÚC NÀY — vệ tinh Himawari-9 hồng ngoại (10 phút/ảnh)</span>
        <span className="ml-auto text-slate-500 text-xs group-open:hidden">mở ▾</span>
      </summary>
      <div className="px-4 pb-4 space-y-3">
        <p className="text-xs text-slate-400 leading-relaxed">
          Ảnh hồng ngoại nhìn được mây <b>cả ban đêm</b> — kiểm tra biển mây <i>đang thật sự
          hình thành</i> trước khi xuất phát lúc 3-4h sáng. Việt Nam ở <b>nửa trái</b> khung hình;
          mây thấp/sương màu <b>xám nhạt</b>, mây dông cao màu <b>trắng sáng</b>.
          Nguồn: JMA (Cơ quan Khí tượng Nhật Bản), trễ ~20-45 phút.
        </p>
        {allBroken ? (
          <p className="text-xs text-rose-300 bg-rose-950/50 border border-rose-700/50 rounded-xl p-3">
            Không tải được ảnh vệ tinh lúc này (mạng hoặc máy chủ JMA) — app không hiển thị ảnh thay thế.
          </p>
        ) : (
          <>
            <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
              <img
                src={current.url}
                alt={`Ảnh vệ tinh Himawari-9 hồng ngoại lúc ${current.labelVN} giờ VN`}
                className="w-full h-auto block"
                onError={() => setBroken(prev => new Set(prev).add(idx))}
              />
              <span className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-slate-950/80 text-cyan-300 text-xs font-mono font-bold">
                {current.labelVN} giờ VN
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPlaying(p => !p)}
                aria-label={playing ? 'Dừng vòng lặp ảnh vệ tinh' : 'Chạy vòng lặp ảnh vệ tinh'}
                className="min-h-11 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 font-bold text-xs transition-all shrink-0"
              >
                {playing ? '⏸ Dừng' : '▶ Chạy 2h gần nhất'}
              </button>
              <input
                type="range"
                min={0}
                max={frames.length - 1}
                value={idx}
                aria-label="Chọn thời điểm ảnh vệ tinh"
                onChange={e => { setPlaying(false); setIdx(Number(e.target.value)); }}
                className="w-full accent-cyan-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xs font-mono text-slate-400 shrink-0">{idx + 1}/{frames.length}</span>
            </div>
          </>
        )}
      </div>
    </details>
  );
};
