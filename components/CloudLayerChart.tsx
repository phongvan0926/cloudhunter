import React from 'react';
import { HourlyLevelProfile } from '../types';
import { MODEL_LABELS } from '../services/weatherService';

/**
 * CloudLayerChart — biểu đồ mây THEO THỜI GIAN × ĐỘ CAO (kiểu meteogram meteoblue):
 * mỗi hàng = 1 tầng áp suất (độ cao geopotential thật), mỗi cột = 1 giờ; ô càng SÁNG
 * càng nhiều mây. Vạch ngang cyan = vị trí bạn đứng → nhìn 1 giây biết mây nằm DƯỚI
 * chân (biển mây) hay TRÙM ĐẦU (mù). Toàn bộ là dữ liệu thật; ô thiếu dữ liệu để trống.
 */
interface Props {
  profile: HourlyLevelProfile;
  observerAlt?: number;   // m ASL
  valleyElev?: number;    // m ASL
  sunrise?: string;       // "HH:MM"
}

export const CloudLayerChart: React.FC<Props> = ({ profile, observerAlt, valleyElev, sunrise }) => {
  const levels = [...profile.levels].map((l, i) => ({ ...l, cc: profile.cc[i] }))
    .sort((a, b) => a.h - b.h); // tăng dần theo độ cao
  const n = profile.times.length;
  if (levels.length < 3 || n === 0) return null;

  // Thang độ cao tuyến tính (m → % từ đáy)
  const altMin = Math.min(valleyElev ?? levels[0].h, levels[0].h) - 150;
  const altMax = Math.max(observerAlt ?? 0, levels[levels.length - 1].h) + 250;
  const yPct = (alt: number) => 100 - ((alt - altMin) / (altMax - altMin)) * 100;

  // Ranh giới dải mỗi tầng = trung điểm với tầng kề
  const bands = levels.map((l, i) => {
    const lower = i === 0 ? altMin : (levels[i - 1].h + l.h) / 2;
    const upper = i === levels.length - 1 ? l.h + (l.h - lower) : (l.h + levels[i + 1].h) / 2;
    return { ...l, topPct: yPct(upper), heightPct: yPct(lower) - yPct(upper) };
  });

  const hourOf = (iso: string) => parseInt(iso.slice(11, 13), 10);
  const sunriseHour = sunrise ? parseInt(sunrise.slice(0, 2), 10) + parseInt(sunrise.slice(3, 5), 10) / 60 : null;
  // vị trí cột của giờ bình minh (times liên tục theo giờ, ngày dự báo ở nửa sau)
  let sunriseCol: number | null = null;
  if (sunriseHour !== null) {
    for (let i = 1; i < n; i++) {
      if (hourOf(profile.times[i]) === Math.floor(sunriseHour) && hourOf(profile.times[i - 1]) < hourOf(profile.times[i])) {
        sunriseCol = i; // cột đầu tiên có giờ = giờ bình minh (thuộc ngày dự báo)
      }
    }
  }

  const gridCols = { gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` } as const;
  const allReal = levels.every(l => l.hReal);

  return (
    <div className="space-y-2">
      <div className="flex">
        {/* Trục độ cao */}
        <div className="relative w-14 shrink-0 h-52 text-[11px] font-mono text-slate-400">
          {levels.map(l => (
            <span key={l.p} className="absolute right-1 -translate-y-1/2" style={{ top: `${yPct(l.h)}%` }}>
              {l.h}m
            </span>
          ))}
        </div>
        {/* Vùng heatmap */}
        <div className="relative flex-1 h-52 rounded-lg overflow-hidden border border-slate-700 bg-slate-950">
          {bands.map(b => (
            <div
              key={b.p}
              className="absolute left-0 right-0 grid"
              style={{ top: `${b.topPct}%`, height: `${b.heightPct}%`, ...gridCols }}
            >
              {b.cc.map((v, ti) => (
                <div
                  key={ti}
                  title={v === null ? 'thiếu dữ liệu' : `${hourOf(profile.times[ti])}h · ${b.p}hPa (${b.h}m): mây ${v}%`}
                  style={v === null ? undefined : { backgroundColor: `rgba(226,232,240,${(v / 100) * 0.92})` }}
                />
              ))}
            </div>
          ))}
          {/* Vạch bình minh */}
          {sunriseCol !== null && (
            <div
              className="absolute top-0 bottom-0 border-l-2 border-amber-400/70 border-dashed pointer-events-none"
              style={{ left: `${(sunriseCol / n) * 100}%` }}
            >
              <span className="absolute top-0.5 left-1 text-[11px]">🌄</span>
            </div>
          )}
          {/* Vạch vị trí đứng */}
          {typeof observerAlt === 'number' && observerAlt > altMin && observerAlt < altMax && (
            <div
              className="absolute left-0 right-0 border-t-2 border-cyan-400 pointer-events-none"
              style={{ top: `${yPct(observerAlt)}%` }}
            >
              <span className="absolute right-1 -top-5 px-1.5 py-0.5 rounded bg-cyan-950/90 text-cyan-300 text-[11px] font-bold">
                📍 Bạn {observerAlt}m
              </span>
            </div>
          )}
          {/* Vạch đáy thung lũng */}
          {typeof valleyElev === 'number' && valleyElev > altMin && valleyElev < altMax && (
            <div
              className="absolute left-0 right-0 border-t border-amber-500/50 border-dotted pointer-events-none"
              style={{ top: `${yPct(valleyElev)}%` }}
            >
              <span className="absolute left-1 -top-4 text-[11px] text-amber-400/80">thung lũng {valleyElev}m</span>
            </div>
          )}
        </div>
      </div>
      {/* Trục giờ */}
      <div className="flex">
        <div className="w-14 shrink-0" />
        <div className="grid flex-1 text-[11px] font-mono text-slate-500" style={gridCols}>
          {profile.times.map((t, i) => {
            const h = hourOf(t);
            return (
              <span key={i} className="text-center overflow-visible whitespace-nowrap">
                {h % 6 === 0 ? `${h}h` : ''}
              </span>
            );
          })}
        </div>
      </div>
      <p className="text-[11px] text-slate-500 leading-relaxed">
        Ô càng <b className="text-slate-300">sáng</b> càng nhiều mây ở tầng đó. Biển mây đẹp = dải sáng
        nằm <b className="text-cyan-300">dưới vạch 📍</b> lúc bình minh 🌄. Khung giờ: 12h hôm trước → 12h ngày
        dự báo. Nguồn: {MODEL_LABELS[profile.model] || profile.model}
        {allReal ? ' · độ cao geopotential thật' : ' · một số độ cao là xấp xỉ chuẩn'}.
      </p>
    </div>
  );
};
