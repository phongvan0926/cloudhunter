import React, { useMemo, useState } from 'react';
import { MOUNTAIN_DB } from '../constants/mountains';
import { computeSunTimes, vnTodayStr, addDaysStr } from '../services/weatherService';
import {
  planRoute, geocodeVN, DEFAULT_SPEED_KMH, SPEED_CHOICES, VEHICLE_LABEL, LEVEL_LABEL, TH,
  summarizeDay, type RoutePlan, type Vehicle, type Level, type GeoHit, type HazardKind,
  ROUTER_LABEL, dawnHours, saveUserRoute, loadUserRoutes, exportUserRoutesJson, USER_ROUTES_KEY, USER_ROUTES_MAX,
} from '../services/routeService';

interface Props {
  /** Mở phân tích biển mây đầy đủ cho điểm đích (điểm thư viện). */
  onPickSpot: (name: string, elevation: number) => void;
}

interface Place { name: string; lat: number; lon: number }

const LEVEL_CLS: Record<Level, string> = {
  0: 'text-emerald-300 border-emerald-500/50 bg-emerald-950/40',
  1: 'text-amber-300 border-amber-500/50 bg-amber-950/30',
  2: 'text-orange-300 border-orange-500/60 bg-orange-950/40',
  3: 'text-rose-300 border-rose-500/60 bg-rose-950/50',
};
const LEVEL_FILL: Record<Level, string> = { 0: '#34d399', 1: '#fbbf24', 2: '#fb923c', 3: '#fb7185' };
const KIND_ICON: Record<HazardKind, string> = {
  storm: '⛈️', rain: '🌧️', fog: '🌫️', wind: '💨', cold: '🥶', ice: '🧊', landslide: '⛰️', dark: '🌙',
};

const fmtVN = (ms: number, withDate = true) => {
  const p = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(ms));
  const g = (t: string) => p.find(x => x.type === t)?.value ?? '';
  return `${g('hour')}:${g('minute')}${withDate ? ` ${g('day')}/${g('month')}` : ''}`;
};
const fmtH = (h: number) => `${Math.floor(h)}h${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

const SPOTS = Object.entries(MOUNTAIN_DB)
  .map(([key, m]) => ({ key, ...m }))
  .sort((a, b) => a.name.localeCompare(b.name, 'vi'));

/** Giờ VN hiện tại (0-23), để biết "sáng mai" là hôm nay hay ngày mai khi tra lúc nửa đêm. */
const vnHourNow = () => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));

export const RouteWeather: React.FC<Props> = ({ onPickSpot }) => {
  const [fromQuery, setFromQuery] = useState('');
  const [fromHits, setFromHits] = useState<GeoHit[] | null>(null);
  const [from, setFrom] = useState<Place | null>(null);
  const [destKey, setDestKey] = useState('TA_XUA_SON_LA');
  const [vehicle, setVehicle] = useState<Vehicle>('motorbike');
  const [speed, setSpeed] = useState(DEFAULT_SPEED_KMH.motorbike);
  const [mode, setMode] = useState<'dawn' | 'now' | 'custom'>('dawn');
  const [customDate, setCustomDate] = useState(vnTodayStr());
  const [customTime, setCustomTime] = useState('05:00');
  const [plan, setPlan] = useState<RoutePlan | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState<number>(() => { try { return loadUserRoutes().length; } catch { return 0; } });

  const exportRoutes = () => {
    const blob = new Blob([exportUserRoutesJson(loadUserRoutes())], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `cloudhunter-tuyen-da-lap-${vnTodayStr()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const clearRoutes = () => {
    if (!window.confirm(`Xoá ${savedCount} tuyến đã lập khỏi máy này? Không lấy lại được.`)) return;
    try { localStorage.removeItem(USER_ROUTES_KEY); } catch { /* bỏ qua */ }
    setSavedCount(0);
  };

  const dest = MOUNTAIN_DB[destKey];

  const searchFrom = async () => {
    if (!fromQuery.trim()) return;
    setError(null); setBusy('Đang tìm địa danh...');
    try {
      const hits = await geocodeVN(fromQuery);
      setFromHits(hits);
      if (hits.length === 0) setError(`Không tìm thấy "${fromQuery}". Thử tên tỉnh/huyện/xã khác hoặc dùng vị trí của bạn.`);
    } catch (e: any) { setError(e.message); } finally { setBusy(null); }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) { setError('Trình duyệt không hỗ trợ lấy vị trí.'); return; }
    setError(null); setBusy('Đang lấy vị trí...');
    navigator.geolocation.getCurrentPosition(
      p => { setFrom({ name: 'Vị trí của bạn', lat: p.coords.latitude, lon: p.coords.longitude }); setFromHits(null); setBusy(null); },
      e => { setError(`Không lấy được vị trí (${e.message}). Gõ tên nơi xuất phát.`); setBusy(null); },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 },
    );
  };

  const run = async () => {
    if (!from || !dest) return;
    setError(null); setNote(null); setPlan(null);
    // Tiến độ theo bước + số giây đã chờ (phiếu gcc29 vòng 3): mỗi lần gọi mạng có hạn 30 s (FETCH_TIMEOUT_MS),
    // nên người dùng luôn thấy đang kẹt ở bước nào, không quay mãi.
    const t0 = Date.now();
    let step = 'Bước 1/3: Tìm đường';
    const show = () => setBusy(`${step}... ${Math.round((Date.now() - t0) / 1000)} giây`);
    show();
    const tick = setInterval(show, 1000);
    try {
      const now = Date.now();
      let depart: number | ((h: number) => number);
      let lateNote: string | null = null;
      if (mode === 'now') depart = now;
      else if (mode === 'custom') {
        const t = Date.parse(`${customDate}T${customTime}:00+07:00`);
        if (!Number.isFinite(t)) throw new Error('Giờ xuất phát không hợp lệ');
        depart = t;
      } else {
        const day = vnHourNow() < 4 ? vnTodayStr() : addDaysStr(vnTodayStr(), 1);
        const sr = computeSunTimes(dest.lat, dest.lon, day).sunrise;
        const arrive = Date.parse(`${day}T${sr}:00+07:00`) - 30 * 60_000;
        depart = (h: number) => {
          const d = arrive - h * 3600_000;
          if (d < now) {
            lateNote = `Muốn tới trước bình minh (${sr}) sáng ${day.slice(8, 10)}/${day.slice(5, 7)} thì phải đi từ ${fmtVN(d)}, đã qua. App tính theo giờ hiện tại.`;
            return now;
          }
          lateNote = `Tính ngược để tới nơi ${fmtVN(arrive, false)}, 30 phút trước bình minh ước ${sr} (sáng ${day.slice(8, 10)}/${day.slice(5, 7)}).`;
          return d;
        };
      }
      const p = await planRoute({ lat: from.lat, lon: from.lon }, { lat: dest.lat, lon: dest.lon }, vehicle, speed, depart,
        (n, text) => { step = `Bước ${n}/3: ${text}`; show(); });
      setPlan(p); setNote(lateNote);
      try { saveUserRoute(p, from.name, destKey); setSavedCount(loadUserRoutes().length); } catch { /* đầy bộ nhớ: bỏ qua, không chặn kết quả */ }
    } catch (e: any) {
      setError(`Không lập được cung đường (${step.toLowerCase()}): ${e.message}`);
    } finally { clearInterval(tick); setBusy(null); }
  };

  const arriveMs = plan ? plan.departMs + plan.durationH * 3600_000 : 0;
  const s = plan?.summary;

  return (
    <div className="max-w-xl mx-auto mt-4 bg-slate-800/50 backdrop-blur-md p-4 rounded-2xl border border-slate-700 shadow-xl animate-fade-in-up">
      <h3 className="text-base font-bold text-orange-300 flex items-center gap-2"><span>🛵</span><span>Cung đường tới điểm săn mây</span></h3>
      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
        Thời tiết ĐÚNG GIỜ bạn đi qua từng đoạn (mưa, dông, sương mù, gió giật, lạnh ở cao độ mặt đường, mưa tích luỹ gây trơn/sạt), cao độ đèo và tổng leo dốc.
      </p>

      {/* --- Nhập --- */}
      <div className="mt-3 space-y-3">
        <div>
          <label htmlFor="rw-from" className="block text-[11px] font-bold text-slate-300 mb-1">Xuất phát</label>
          {from ? (
            <div className="flex items-center gap-2">
              <span className="flex-1 text-sm text-slate-100 bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2.5 truncate">📍 {from.name}</span>
              <button onClick={() => { setFrom(null); setPlan(null); }} aria-label="Đổi nơi xuất phát" className="min-h-11 px-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:bg-slate-700">Đổi</button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <input id="rw-from" value={fromQuery} onChange={e => setFromQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') searchFrom(); }}
                  placeholder="VD: Hà Nội, Yên Bái, Mộc Châu..."
                  className="flex-1 min-h-11 bg-slate-900/60 border border-slate-700 rounded-xl px-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-400" />
                <button onClick={searchFrom} disabled={!!busy} aria-label="Tìm nơi xuất phát" className="min-h-11 px-3 rounded-xl bg-orange-600/80 hover:bg-orange-500 text-white text-xs font-bold disabled:opacity-50">Tìm</button>
              </div>
              <button onClick={useMyLocation} disabled={!!busy} className="mt-2 min-h-11 w-full rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-50">📍 Dùng vị trí của tôi</button>
              {fromHits && fromHits.length > 0 && (
                <ul className="mt-2 space-y-1" aria-label="Kết quả tìm địa danh">
                  {fromHits.map((h, i) => (
                    <li key={i}>
                      <button onClick={() => { setFrom({ name: h.detail ? `${h.name} (${h.detail})` : h.name, lat: h.lat, lon: h.lon }); setFromHits(null); }}
                        className="w-full min-h-11 text-left px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-700 hover:border-orange-400 text-sm text-slate-100">
                        {h.name}<span className="block text-[11px] text-slate-400">{h.detail}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <div>
          <label htmlFor="rw-dest" className="block text-[11px] font-bold text-slate-300 mb-1">Điểm đến (thư viện điểm săn mây)</label>
          <select id="rw-dest" value={destKey} onChange={e => { setDestKey(e.target.value); setPlan(null); }}
            className="w-full min-h-11 bg-slate-900/60 border border-slate-700 rounded-xl px-3 text-sm text-slate-100 focus:outline-none focus:border-orange-400">
            {SPOTS.map(sp => <option key={sp.key} value={sp.key}>{sp.name} - {sp.elevation}m{sp.needsReview ? ' (toạ độ chưa chắc)' : ''}</option>)}
          </select>
          {dest?.needsReview && <p className="mt-1 text-[11px] text-amber-300">⚠️ Toạ độ điểm này chưa xác minh: {dest.needsReview}</p>}
        </div>

        <fieldset>
          <legend className="block text-[11px] font-bold text-slate-300 mb-1">Phương tiện và tốc độ trung bình</legend>
          <div className="flex flex-wrap gap-2">
            {(['motorbike', 'car'] as Vehicle[]).map(v => (
              <button key={v} onClick={() => { setVehicle(v); setSpeed(DEFAULT_SPEED_KMH[v]); setPlan(null); }} aria-pressed={vehicle === v}
                className={`min-h-11 px-3 rounded-xl border text-xs font-bold ${vehicle === v ? 'bg-orange-500/20 border-orange-400 text-orange-200' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>
                {v === 'motorbike' ? '🛵' : '🚗'} {VEHICLE_LABEL[v]}
              </button>
            ))}
            {SPEED_CHOICES.map(k => (
              <button key={k} onClick={() => { setSpeed(k); setPlan(null); }} aria-pressed={speed === k} aria-label={`Tốc độ trung bình ${k} km/h`}
                className={`min-h-11 px-2.5 rounded-xl border text-xs font-mono ${speed === k ? 'bg-sky-500/20 border-sky-400 text-sky-200' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                {k} km/h
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="block text-[11px] font-bold text-slate-300 mb-1">Giờ xuất phát</legend>
          <div className="flex flex-wrap gap-2">
            {([['dawn', '🌄 Tới trước bình minh sáng mai'], ['now', 'Đi ngay'], ['custom', 'Tự chọn giờ']] as const).map(([m, label]) => (
              <button key={m} onClick={() => { setMode(m); setPlan(null); }} aria-pressed={mode === m}
                className={`min-h-11 px-3 rounded-xl border text-xs font-bold ${mode === m ? 'bg-orange-500/20 border-orange-400 text-orange-200' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>
                {label}
              </button>
            ))}
          </div>
          {mode === 'custom' && (
            <div className="mt-2 flex gap-2">
              <input type="date" aria-label="Ngày xuất phát" value={customDate} min={vnTodayStr()} max={addDaysStr(vnTodayStr(), 6)} onChange={e => setCustomDate(e.target.value)}
                className="flex-1 min-h-11 bg-slate-900/60 border border-slate-700 rounded-xl px-3 text-sm text-slate-100" />
              <input type="time" aria-label="Giờ xuất phát" value={customTime} onChange={e => setCustomTime(e.target.value)}
                className="w-32 min-h-11 bg-slate-900/60 border border-slate-700 rounded-xl px-3 text-sm text-slate-100" />
            </div>
          )}
        </fieldset>

        <button onClick={run} disabled={!from || !!busy}
          className="w-full min-h-11 py-3 rounded-2xl font-bold text-sm bg-gradient-to-r from-orange-600 to-amber-600 text-white border border-orange-400/50 disabled:opacity-40">
          {from ? 'Xem thời tiết dọc cung đường' : 'Chọn nơi xuất phát trước'}
        </button>
      </div>

      {busy && <p className="mt-3 text-xs text-cyan-300" role="status">{busy}</p>}
      {error && <p className="mt-3 text-xs text-rose-300 bg-rose-950/50 border border-rose-700/50 rounded-xl p-3" role="alert">{error}</p>}

      {/* --- Kết quả: phán quyết trước --- */}
      {plan && s && (
        <div className="mt-4 space-y-3" data-testid="route-result">
          <div className={`rounded-2xl border p-3 ${LEVEL_CLS[s.level]}`}>
            <p className="text-[11px] uppercase tracking-wider font-bold opacity-80">Thời tiết dọc đường</p>
            <p className="text-xl font-black" data-testid="route-level">{LEVEL_LABEL[s.level]}</p>
            {s.noDataCount > 0 && (
              <p className="text-xs text-slate-300 mt-1">⚠️ {s.noDataCount}/{plan.samples.length} điểm CHƯA có dự báo cho giờ đi qua (ngoài phạm vi 7 ngày). Mức trên chỉ tính các điểm có dữ liệu.</p>
            )}
            {s.worst.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {s.worst.slice(0, 6).map(w => {
                  const smp = plan.samples.find(x => x.km === w.km);
                  return (
                    <li key={w.kind} className="text-xs text-slate-100 flex gap-1.5">
                      <span aria-hidden>{KIND_ICON[w.kind]}</span>
                      <span>{w.text} <span className="text-slate-400">- km {Math.round(w.km)}{smp ? `, ~${fmtVN(smp.etaMs, false)}` : ''}{smp?.elev != null ? `, ${Math.round(smp.elev)}m` : ''}</span></span>
                    </li>
                  );
                })}
              </ul>
            ) : s.noDataCount < plan.samples.length && <p className="text-xs text-slate-200 mt-1">Không thấy mưa, sương mù, gió giật hay lạnh đáng kể ở các điểm đã lấy mẫu.</p>}
          </div>

          {plan.fallbackNote && <p className="text-xs text-amber-100 bg-amber-950/40 border border-amber-500/40 rounded-xl p-2.5" data-testid="route-fallback">⚠️ {plan.fallbackNote}</p>}
          {plan.cautionNote && <p className="text-xs text-amber-100/90 bg-amber-950/30 border border-amber-500/30 rounded-xl p-2.5" data-testid="route-caution">🚧 {plan.cautionNote}</p>}
          <p className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-2" data-testid="route-router">
            <span>Đang dùng: <b className="text-slate-200">{ROUTER_LABEL[plan.router]}</b> · bản đồ ©</span>
            <a className="min-h-11 inline-flex items-center underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>
            <a className="min-h-11 inline-flex items-center underline" href="https://openstreetmap.org/fixthemap" target="_blank" rel="noopener noreferrer">sửa bản đồ</a>
          </p>

          {note && <p className="text-[11px] text-sky-200 bg-sky-950/30 border border-sky-600/30 rounded-xl p-2.5">{note}</p>}

          <div className="grid grid-cols-2 gap-2 text-xs">
            <Fact label="Quãng đường" value={`${Math.round(plan.distanceKm)} km`} />
            <Fact label={`Thời gian (${plan.speedKmh} km/h TB)`} value={fmtH(plan.durationH)} sub={`${ROUTER_LABEL[plan.router]} ước: ${fmtH(plan.routerH)}`} />
            <Fact label="Xuất phát" value={fmtVN(plan.departMs)} />
            <Fact label="Tới nơi (ước)" value={fmtVN(arriveMs)} />
            <Fact label="Điểm cao nhất" value={plan.stats ? `${plan.stats.maxElev} m` : 'không đo được'} sub={plan.stats ? `km ${Math.round(plan.stats.maxKm)}` : undefined} />
            <Fact label="Tổng leo dốc" value={plan.stats ? `${plan.stats.climbM} m` : 'không đo được'} sub={plan.stats?.passes.length ? `${plan.stats.passes.length} đèo nổi bật` : undefined} />
            {s.tempRange && <Fact label="Nhiệt độ dọc đường" value={`${s.tempRange[0]}° - ${s.tempRange[1]}°C`} sub="ở cao độ mặt đường" />}
          </div>

          <ElevationProfile plan={plan} />

          <DayBrief plan={plan} destName={dest.name} arriveMs={arriveMs} />

          <div className="flex flex-col gap-2">
            <button onClick={() => onPickSpot(dest.name, dest.elevation)}
              className="min-h-11 rounded-xl bg-cyan-700/80 hover:bg-cyan-600 text-white text-sm font-bold border border-cyan-400/50">
              ☁️ Xem biển mây tại {dest.name}
            </button>
            <a href={`https://www.google.com/maps/dir/?api=1&origin=${plan.from.lat},${plan.from.lon}&destination=${plan.to.lat},${plan.to.lon}&travelmode=driving`}
              target="_blank" rel="noopener noreferrer"
              className="min-h-11 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700">
              🧭 Mở chỉ đường trên Google Maps
            </a>
          </div>

          <details className="rounded-xl border border-slate-700 bg-slate-900/40">
            <summary className="min-h-11 flex items-center px-3 text-xs font-bold text-slate-200 cursor-pointer">Từng điểm dọc đường ({plan.samples.length} điểm)</summary>
            <ul className="px-2 pb-2 space-y-1.5">
              {plan.samples.map((p, i) => (
                <li key={i} className={`rounded-lg border p-2 text-[11px] ${LEVEL_CLS[p.level]}`}>
                  <div className="flex justify-between gap-2 font-bold text-slate-100">
                    <span>km {Math.round(p.km)}{p.isPeak ? ' ▲ cao nhất' : ''}{i === 0 ? ' (xuất phát)' : i === plan.samples.length - 1 ? ' (đích)' : ''}</span>
                    <span className="font-mono">~{fmtVN(p.etaMs)} · {p.elev != null ? `${Math.round(p.elev)}m` : '?m'}</span>
                  </div>
                  {p.wx ? (
                    <p className="text-slate-300 mt-0.5 font-mono">
                      {p.wx.tempC ?? '?'}°C · mưa {p.wx.precipMm ?? '?'}mm ({p.wx.precipProb ?? '?'}%) · giật {p.wx.gustKmh != null ? Math.round(p.wx.gustKmh) : '?'}km/h · tầm nhìn {p.wx.visibilityM != null ? `${(p.wx.visibilityM / 1000).toFixed(1)}km` : '?'} · ẩm {p.wx.rh ?? '?'}% · mưa 24h {p.wx.rain24h ?? '?'}mm
                    </p>
                  ) : <p className="text-slate-400 mt-0.5">Chưa có dự báo cho giờ này.</p>}
                  {p.hazards.length > 0 && <p className="mt-0.5 text-slate-100">{p.hazards.map(h => `${KIND_ICON[h.kind]} ${h.text}`).join(' · ')}</p>}
                </li>
              ))}
            </ul>
          </details>

          <details className="rounded-xl border border-slate-700 bg-slate-900/40">
            <summary className="min-h-11 flex items-center px-3 text-xs font-bold text-slate-200 cursor-pointer">Cách tính và giới hạn</summary>
            <div className="px-3 pb-3 text-[11px] text-slate-400 leading-relaxed space-y-1.5">
              <p>Đường: xe máy dùng Valhalla (máy chủ FOSSGIS, hồ sơ xe máy, tránh cao tốc), hỏng thì rơi về OSRM hồ sơ ô tô và báo rõ; ô tô dùng OSRM. Cao độ: DEM Copernicus 90 m qua Open-Meteo, {plan.elevKms.length} điểm dọc tuyến. Dự báo: Open-Meteo (mô hình tốt nhất cho từng điểm), nhiệt độ hạ theo cao độ mặt đường.</p>
              <p>Giờ đi qua mỗi điểm = quãng đường / tốc độ trung bình bạn chọn, CHƯA tính dừng nghỉ. Đi chậm hơn thì giờ thực tế muộn hơn.</p>
              <p>Ngưỡng tham khảo: mưa {TH.RAIN_LIGHT}/{TH.RAIN_MOD}/{TH.RAIN_HEAVY} mm/h (nhẹ/vừa/to); sương mù tầm nhìn &lt; {TH.VIS_FOG} m, dày &lt; {TH.VIS_DENSE} m; đi trong mây khi ẩm ≥ {TH.INCLOUD_RH}% và mây thấp ≥ {TH.INCLOUD_LOW}% ở đoạn ≥ {TH.INCLOUD_MIN_ELEV} m; gió giật {TH.GUST_NOTE}/{TH.GUST_HARD}/{TH.GUST_DANGER} km/h (cấp 5/6/8); lạnh ≤ {TH.COLD_NOTE}°C, băng giá ≤ {TH.COLD_FROST}°C; mưa tích luỹ 24h {TH.R24_NOTE}/{TH.R24_HARD}/{TH.R24_DANGER} mm hoặc 72h ≥ {TH.R72_HARD} mm ở đoạn ≥ {TH.SLIDE_MIN_ELEV} m.</p>
              <p>Dữ liệu bản đồ © <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors (ODbL) · <a className="underline" href="https://openstreetmap.org/fixthemap" target="_blank" rel="noopener noreferrer">báo lỗi / sửa bản đồ</a> · tìm đường: <a className="underline" href="https://www.fossgis.de/" target="_blank" rel="noopener noreferrer">FOSSGIS Valhalla</a>, <a className="underline" href="https://project-osrm.org/" target="_blank" rel="noopener noreferrer">OSRM</a>.</p>
              <p>Tầm nhìn của mô hình hay đánh giá cao hơn thực tế trong mây trên đèo, nên app thêm cờ "có thể đi trong mây". Đây là dự báo, không thay được thông báo đóng đường, sạt lở của địa phương.</p>
            </div>
          </details>
        </div>
      )}

      {savedCount > 0 && (
        <details className="mt-3 rounded-xl bg-slate-900/40 border border-slate-700" data-testid="user-routes">
          <summary className="min-h-11 flex items-center px-3 text-xs font-bold text-slate-200 cursor-pointer">Tuyến bạn đã lập ({savedCount})</summary>
          <div className="px-3 pb-3 text-[11px] text-slate-400 leading-relaxed space-y-2">
            <p>App tự lưu {USER_ROUTES_MAX} tuyến gần nhất NGAY TRÊN MÁY NÀY (không gửi đi đâu), kèm phán quyết độ khó lúc lập. Đi xong, gửi tệp này cùng vài dòng tả đường thật (đoạn nào mưa, sương, trơn, sạt, lạnh) qua GitHub Issues để giúp chấm lại ngưỡng. Vị trí xuất phát đã làm tròn ~1 km.</p>
            <div className="flex gap-2">
              <button onClick={exportRoutes} aria-label="Tải tệp JSON các tuyến đã lập" className="min-h-11 flex-1 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 hover:bg-slate-700">Tải JSON</button>
              <button onClick={clearRoutes} aria-label="Xoá các tuyến đã lập khỏi máy này" className="min-h-11 px-3 rounded-xl bg-slate-800 border border-rose-800/60 text-xs text-rose-300 hover:bg-slate-700">Xoá</button>
            </div>
          </div>
        </details>
      )}
    </div>
  );
};

const Fact: React.FC<{ label: string; value: string; sub?: string }> = ({ label, value, sub }) => (
  <div className="rounded-xl bg-slate-900/60 border border-slate-700 p-2">
    <p className="text-[10px] text-slate-400">{label}</p>
    <p className="text-sm font-bold text-slate-100">{value}</p>
    {sub && <p className="text-[10px] text-slate-500">{sub}</p>}
  </div>
);

/** Mặt cắt cao độ dọc tuyến, chấm màu = mức khó tại các điểm lấy dự báo. */
const ElevationProfile: React.FC<{ plan: RoutePlan }> = ({ plan }) => {
  const W = 600, H = 150, PAD = 12;
  const geo = useMemo(() => {
    const pts = plan.elevKms.map((k, i) => ({ k, e: plan.elevs[i] })).filter((p): p is { k: number; e: number } => p.e != null);
    if (pts.length < 2) return null;
    const total = plan.elevKms[plan.elevKms.length - 1] || 1;
    const min = Math.min(...pts.map(p => p.e)), max = Math.max(...pts.map(p => p.e));
    const span = Math.max(100, max - min);
    const x = (k: number) => PAD + (k / total) * (W - 2 * PAD);
    const y = (e: number) => H - PAD - ((e - min) / span) * (H - 2 * PAD - 10);
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.k).toFixed(1)},${y(p.e).toFixed(1)}`).join(' ');
    const area = `${line} L${x(pts[pts.length - 1].k).toFixed(1)},${H - PAD} L${x(pts[0].k).toFixed(1)},${H - PAD} Z`;
    return { x, y, line, area, min, max };
  }, [plan]);
  if (!geo) return <p className="text-[11px] text-slate-400">Không đo được cao độ dọc tuyến.</p>;
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto rounded-xl bg-slate-900/60 border border-slate-700" role="img"
        aria-label={`Mặt cắt cao độ: thấp nhất ${Math.round(geo.min)} m, cao nhất ${Math.round(geo.max)} m`}>
        <path d={geo.area} fill="rgba(251,146,60,0.12)" />
        <path d={geo.line} fill="none" stroke="#fb923c" strokeWidth={2} />
        {plan.samples.map((s, i) => s.elev != null && (
          <circle key={i} cx={geo.x(s.km)} cy={geo.y(s.elev)} r={s.wx ? 6 : 4}
            fill={s.wx ? LEVEL_FILL[s.level] : 'none'} stroke={s.wx ? '#0f172a' : '#94a3b8'} strokeWidth={1.5} />
        ))}
        <text x={PAD} y={16} className="hidden md:block" fill="#94a3b8" fontSize={11}>{Math.round(geo.max)} m</text>
        <text x={PAD} y={H - 2} className="hidden md:block" fill="#94a3b8" fontSize={11}>{Math.round(geo.min)} m</text>
      </svg>
      <figcaption className="mt-1 text-[10px] text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
        <span>Cao độ {Math.round(geo.min)} - {Math.round(geo.max)} m, trục ngang là km</span>
        {([0, 1, 2, 3] as Level[]).map(l => (
          <span key={l} className="inline-flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: LEVEL_FILL[l] }} />{LEVEL_LABEL[l]}</span>
        ))}
        <span>○ chưa có dự báo</span>
      </figcaption>
    </figure>
  );
};

const PART_ICON: Record<string, string> = { 'quang': '☀️', 'ít mây': '🌤️', 'nhiều mây': '⛅', 'âm u': '☁️', 'không rõ': '❔' };

/** Tóm tắt ngày tại điểm đến: dùng lại dự báo đã tải cho điểm đích (không gọi thêm API). */
const DayBrief: React.FC<{ plan: RoutePlan; destName: string; arriveMs: number }> = ({ plan, destName, arriveMs }) => {
  const arriveDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(arriveMs));
  const dates = [0, 1, 2].map(n => addDaysStr(arriveDate, n));
  const [date, setDate] = useState(arriveDate);
  const d = useMemo(() => summarizeDay(plan.destOm, date), [plan, date]);
  const destElev = plan.elevs[plan.elevs.length - 1] ?? null;
  const dh = useMemo(() => dawnHours(plan.destOm, date, destElev), [plan, date, destElev]);
  const dm = (x: string) => `${x.slice(8, 10)}/${x.slice(5, 7)}`;
  const headCls = d.headline === 'Nhiều mưa' ? 'text-orange-300' : d.headline === 'Có mưa' ? 'text-amber-300' : d.headline === 'Khô ráo' ? 'text-emerald-300' : 'text-slate-400';
  return (
    <details className="rounded-xl border border-slate-700 bg-slate-900/40" data-testid="day-brief">
      <summary className="min-h-11 flex flex-wrap items-center gap-x-1.5 px-3 py-2 text-xs font-bold text-slate-200 cursor-pointer">
        <span>📋 Tóm tắt ngày tại đích, {dm(date)}:</span>
        <span className={headCls}>{d.headline}</span>
        {d.tempMin !== null && <span className="text-slate-400 font-normal">{d.tempMin}° - {d.tempMax}°C</span>}
      </summary>
      <div className="px-3 pb-3 space-y-2 text-[11px] text-slate-300">
        <div className="flex gap-2" role="group" aria-label="Chọn ngày">
          {dates.map(x => (
            <button key={x} onClick={() => setDate(x)} aria-pressed={date === x}
              className={`min-h-11 px-3 rounded-xl border text-xs ${date === x ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
              {x === arriveDate ? `Ngày đến nơi (${dm(x)})` : dm(x)}
            </button>
          ))}
        </div>
        {d.hours === 0 ? <p className="text-slate-400">Chưa có dự báo cho ngày này.</p> : (
          <>
            <p className="text-slate-400">{destName}{d.sunrise ? ` · mặt trời mọc ${d.sunrise}, lặn ${d.sunset}` : ''}</p>
            <ul className="grid grid-cols-2 gap-1.5">
              {d.parts.map(p => (
                <li key={p.label} className="rounded-lg bg-slate-900/60 border border-slate-700 p-2">
                  <span className="block text-slate-400">{p.label} ({p.from}-{p.to}h)</span>
                  <span className="text-slate-100 font-bold">{PART_ICON[p.cloudText]} {p.cloudText}{p.cloud !== null ? ` ${p.cloud}%` : ''}</span>
                  {p.rainMm !== null && p.rainMm > 0 && <span className="block text-sky-300">mưa {p.rainMm} mm</span>}
                </li>
              ))}
            </ul>
            <div data-testid="dawn-hours">
              <p className="text-slate-400 mb-1">Rạng sáng theo giờ tại chỗ đứng:</p>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] font-mono">
                  <thead><tr className="text-slate-500 text-left"><th className="pr-2 font-normal">giờ</th><th className="pr-2 font-normal">°C</th><th className="pr-2 font-normal">ẩm</th><th className="pr-2 font-normal">mây thấp</th><th className="pr-2 font-normal">tầm nhìn</th><th className="font-normal">ghi chú</th></tr></thead>
                  <tbody>
                    {dh.map(h => (
                      <tr key={h.hour} className={h.level >= 2 ? 'text-orange-200' : h.level === 1 ? 'text-amber-100' : 'text-slate-200'}>
                        <td className="pr-2">{h.hour}h</td>
                        {h.wx ? <>
                          <td className="pr-2">{h.wx.tempC ?? '?'}</td>
                          <td className="pr-2">{h.wx.rh ?? '?'}%</td>
                          <td className="pr-2">{h.wx.cloudLow ?? '?'}%</td>
                          <td className="pr-2">{h.wx.visibilityM != null ? `${(h.wx.visibilityM / 1000).toFixed(1)}km` : '?'}</td>
                          <td className="font-sans">{h.hazards.map(z => KIND_ICON[z.kind]).join(' ') || '-'}</td>
                        </> : <td colSpan={5} className="text-slate-500 font-sans">chưa có dự báo</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Số thô của mô hình tại chỗ đứng (ẩm cao + mây thấp nhiều = có thể đang ở TRONG mây). Đây không phải điểm biển mây theo giờ: app chấm biển mây một lần cho cả khung 4-9h, bấm nút bên dưới để xem.</p>
            </div>
            <ul className="space-y-1">
              {d.storm && <li>⛈️ Có giờ dông trong ngày</li>}
              {d.rainWindows.length > 0
                ? <li>🌧️ Mưa: {d.rainWindows.map(r => `${r.from}-${r.to}h (${r.mm} mm)`).join(', ')}</li>
                : <li>🌂 Không có giờ mưa từ {TH.RAIN_LIGHT} mm trở lên</li>}
              {d.maxGust && d.maxGust.kmh >= TH.GUST_NOTE && <li>💨 Gió giật mạnh nhất {d.maxGust.kmh} km/h lúc {d.maxGust.hour}h</li>}
              {d.minVis && d.minVis.m < 3000 && <li>🌫️ Tầm nhìn kém nhất ~{d.minVis.m} m lúc {d.minVis.hour}h</li>}
            </ul>
            <p className="text-[10px] text-slate-500">Mây theo buổi là tổng mây của mô hình tại điểm đích, KHÔNG phải dự báo biển mây; xem biển mây bằng nút bên dưới.</p>
          </>
        )}
      </div>
    </details>
  );
};
