/**
 * Thời tiết + độ khó dọc CUNG ĐƯỜNG tới điểm săn mây (19/11/2026, phiếu gcc29).
 *
 * Định hướng số 1 của dự án: người đi phượt cần biết cả đường đi, không chỉ điểm đến.
 * Ý tưởng học từ skyradar.vn (họ khoá sau gói Pro): lấy tuyến (Valhalla xe máy / OSRM ô tô), chia điểm dọc đường, ước giờ
 * đi qua từng điểm, lấy dự báo ĐÚNG giờ đó. Họ chỉ xét mưa + mây. Bản này tự viết, thêm thứ dân
 * phượt đèo cần: cao độ từng điểm (DEM), đèo cao nhất, tổng leo dốc, tầm nhìn/đi trong mây, gió giật,
 * nhiệt độ ở cao độ mặt đường, mưa 24h và số ngày mưa trước đó (trơn; sạt lở theo QĐ 18/2021), và qua đèo lúc trời tối.
 *
 * Triết lý giữ nguyên: mọi con số do code tính; thiếu dữ liệu thì nói thiếu (noData), không bịa.
 * Ngưỡng dưới đây là ngưỡng THAM KHẢO cho người đi đường (nguồn ghi cạnh từng hằng số), không
 * phải engine biển mây và không đụng điểm/trạng thái/đáng đi.
 */
import { slideRiskQD18, fmtRange, SLIDE_MIN_ELEV } from './slideService';

export interface LatLon { lat: number; lon: number }

export type Vehicle = 'motorbike' | 'car';
/**
 * Giờ đi qua = quãng đường / TỐC ĐỘ TRUNG BÌNH người dùng chọn (mặc định theo xe), không lấy giờ OSRM:
 * OSRM bản công khai chỉ có hồ sơ ô tô, tính theo tốc độ loại đường của OSM, quá lạc quan trên đèo
 * (đo 19/11/2026: Hà Nội - Tà Xùa 203 km, OSRM báo 2h47 = 73 km/h trung bình). Giờ OSRM vẫn hiện để tham khảo.
 */
export const DEFAULT_SPEED_KMH: Record<Vehicle, number> = { motorbike: 40, car: 50 };
export const SPEED_CHOICES = [30, 40, 50, 60];
export const VEHICLE_LABEL: Record<Vehicle, string> = { motorbike: 'Xe máy', car: 'Ô tô' };

const R_KM = 6371;
export function haversineKm(a: LatLon, b: LatLon): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Quãng đường cộng dồn (km) tại từng đỉnh của đường gấp khúc. */
export function cumulativeKm(coords: LatLon[]): number[] {
  const out = [0];
  for (let i = 1; i < coords.length; i++) out.push(out[i - 1] + haversineKm(coords[i - 1], coords[i]));
  return out;
}

/** Toạ độ tại quãng đường `km` tính từ đầu tuyến (nội suy tuyến tính trên đoạn chứa nó). */
export function pointAtKm(coords: LatLon[], cum: number[], km: number): LatLon {
  if (coords.length === 0) throw new Error('Tuyến rỗng');
  if (km <= 0) return coords[0];
  const last = cum.length - 1;
  if (km >= cum[last]) return coords[last];
  let lo = 0, hi = last;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= km) lo = mid; else hi = mid; }
  const seg = cum[hi] - cum[lo];
  const t = seg > 0 ? (km - cum[lo]) / seg : 0;
  return { lat: coords[lo].lat + t * (coords[hi].lat - coords[lo].lat), lon: coords[lo].lon + t * (coords[hi].lon - coords[lo].lon) };
}

/** Các mốc km cách đều `step`, luôn có 0 và `total`; bỏ mốc sát đích hơn `minGap` km (trùng đích). */
export function evenKms(total: number, step: number, minGap = 0): number[] {
  if (!(total > 0)) return [0];
  const out: number[] = [];
  for (let k = 0; k < total; k += step) out.push(k);
  while (out.length > 1 && total - out[out.length - 1] < minGap) out.pop();
  out.push(total);
  return out;
}

/** Profile cao độ: tối đa 100 điểm (giới hạn 1 lần gọi Elevation API), bước >= 1 km. */
export const ELEV_MAX_POINTS = 100;
export function elevationKms(total: number, maxPoints = ELEV_MAX_POINTS): number[] {
  const step = Math.max(1, total / (maxPoints - 1));
  return evenKms(total, step, step * 0.3).slice(0, maxPoints);
}

/**
 * Điểm lấy thời tiết: bước 12-40 km tuỳ độ dài (tối đa ~16 điểm), luôn có đầu, cuối.
 * Miền núi đổi nhanh nên mịn hơn skyradar (họ lấy bước max(25, dài/10)).
 */
export function weatherKms(total: number): number[] {
  const step = Math.min(40, Math.max(12, total / 15));
  return evenKms(total, step, 5);
}

export interface ElevStats {
  maxElev: number; maxKm: number;   // điểm cao nhất tuyến (thường là đèo)
  minElev: number;
  climbM: number;                   // tổng leo (cộng mọi đoạn đi lên)
  passes: { km: number; elev: number }[];  // các đỉnh đèo nổi bật
}
/** Đỉnh nổi bật = cực đại cục bộ cao >= 600 m và nhô >= 150 m so với điểm thấp nhất hai bên. */
export const PASS_MIN_ELEV = 600;
export const PASS_MIN_PROMINENCE = 150;
export function elevationStats(kms: number[], elevs: number[]): ElevStats | null {
  const pts = kms.map((k, i) => ({ k, e: elevs[i] })).filter(p => Number.isFinite(p.e));
  if (pts.length < 2) return null;
  let maxI = 0, minE = Infinity, climb = 0;
  pts.forEach((p, i) => {
    if (p.e > pts[maxI].e) maxI = i;
    minE = Math.min(minE, p.e);
    if (i > 0 && p.e > pts[i - 1].e) climb += p.e - pts[i - 1].e;
  });
  const passes: { km: number; elev: number }[] = [];
  for (let i = 0; i < pts.length; i++) {
    const e = pts[i].e;
    if (e < PASS_MIN_ELEV) continue;
    if ((i > 0 && pts[i - 1].e > e) || (i < pts.length - 1 && pts[i + 1].e >= e)) continue;
    // nhô so với điểm thấp nhất trước khi gặp điểm cao hơn, hai phía
    let leftMin = e, rightMin = e;
    for (let j = i - 1; j >= 0 && pts[j].e <= e; j--) leftMin = Math.min(leftMin, pts[j].e);
    for (let j = i + 1; j < pts.length && pts[j].e <= e; j++) rightMin = Math.min(rightMin, pts[j].e);
    if (e - Math.max(leftMin, rightMin) >= PASS_MIN_PROMINENCE) passes.push({ km: pts[i].k, elev: Math.round(e) });
  }
  return { maxElev: Math.round(pts[maxI].e), maxKm: pts[maxI].k, minElev: Math.round(minE), climbM: Math.round(climb), passes };
}

/** Giờ đi qua mốc `km`: tỉ lệ thuận theo quãng đường (tốc độ trung bình của cả tuyến). */
export function etaMs(km: number, totalKm: number, durationH: number, departMs: number): number {
  if (!(totalKm > 0)) return departMs;
  return departMs + (km / totalKm) * durationH * 3600_000;
}

/** Khoá giờ theo giờ Việt Nam, làm tròn về giờ gần nhất, dạng Open-Meteo trả: 'YYYY-MM-DDTHH:00'. */
export function vnHourKey(ms: number): string {
  const r = Math.round(ms / 3600_000) * 3600_000;
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(r));
  const g = (t: string) => p.find(x => x.type === t)?.value ?? '';
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour')}:00`;
}

// ---------------------------------------------------------------- thời tiết tại một điểm

export interface PointWx {
  tempC: number | null;
  rh: number | null;
  precipMm: number | null;       // mưa trong giờ đi qua
  precipProb: number | null;
  wmo: number | null;
  visibilityM: number | null;
  gustKmh: number | null;
  cloudLow: number | null;
  rain24h: number | null;        // tổng 24h TRƯỚC (gồm) giờ đi qua; null nếu thiếu số liệu
  rain72h: number | null;
  /** Mưa của 3 khối 24h liền TRƯỚC khối rain24h (khối 1 = 24-48h trước giờ đi qua...); null = thiếu số. Dùng cho sạt lở QĐ 18/2021. */
  rainPrior?: (number | null)[];
  isDark: boolean | null;        // trước bình minh / sau hoàng hôn
}

export const ROUTE_HOURLY_VARS = [
  'temperature_2m', 'relative_humidity_2m', 'precipitation', 'precipitation_probability',
  'weather_code', 'visibility', 'wind_gusts_10m', 'cloud_cover_low', 'cloud_cover',
] as const;

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Tổng `n` giờ kết thúc tại chỉ số `i`; thiếu bất kỳ giờ nào thì null (không coi thiếu là 0). */
function windowSum(arr: unknown[] | undefined, i: number, n: number): number | null {
  if (!arr || i - n + 1 < 0) return null;
  let s = 0;
  for (let j = i - n + 1; j <= i; j++) { const v = num(arr[j]); if (v === null) return null; s += v; }
  return Math.round(s * 10) / 10;
}

/**
 * Rút thời tiết tại giờ `hourKey` từ một phần tử phản hồi Open-Meteo (hourly + daily sunrise/sunset).
 * Trả null khi giờ đó nằm ngoài phạm vi dự báo -> UI ghi "chưa có dữ liệu".
 */
export function extractPointWx(om: any, hourKey: string): PointWx | null {
  const h = om?.hourly;
  if (!h || !Array.isArray(h.time)) return null;
  const i = h.time.indexOf(hourKey);
  if (i < 0) return null;
  const wx: PointWx = {
    tempC: num(h.temperature_2m?.[i]),
    rh: num(h.relative_humidity_2m?.[i]),
    precipMm: num(h.precipitation?.[i]),
    precipProb: num(h.precipitation_probability?.[i]),
    wmo: num(h.weather_code?.[i]),
    visibilityM: num(h.visibility?.[i]),
    gustKmh: num(h.wind_gusts_10m?.[i]),
    cloudLow: num(h.cloud_cover_low?.[i]),
    rain24h: windowSum(h.precipitation, i, 24),
    rain72h: windowSum(h.precipitation, i, 72),
    rainPrior: [1, 2, 3].map(b => windowSum(h.precipitation, i - 24 * b, 24)),
    isDark: null,
  };
  const d = om?.daily;
  if (d && Array.isArray(d.time)) {
    const di = d.time.indexOf(hourKey.slice(0, 10));
    const sr: string | undefined = d.sunrise?.[di];
    const ss: string | undefined = d.sunset?.[di];
    // so chuỗi cùng dạng 'YYYY-MM-DDTHH:MM' (giờ VN)
    if (di >= 0 && sr && ss) wx.isDark = hourKey < sr || hourKey > ss;
  }
  // Mọi trường chính đều thiếu = coi như không có dữ liệu
  if (wx.tempC === null && wx.precipMm === null && wx.wmo === null) return null;
  return wx;
}

// ---------------------------------------------------------------- mức độ khó

/** 0 ổn, 1 chú ý, 2 khó, 3 nguy hiểm. */
export type Level = 0 | 1 | 2 | 3;
export const LEVEL_LABEL: Record<Level, string> = { 0: 'Dễ đi', 1: 'Cần chú ý', 2: 'Khó đi', 3: 'Nguy hiểm' };
export type HazardKind = 'storm' | 'rain' | 'fog' | 'wind' | 'cold' | 'ice' | 'landslide' | 'dark';
export interface Hazard { kind: HazardKind; level: Level; text: string }

/** Ngưỡng tham khảo, ghi nguồn. Đổi ngưỡng ở đây, UI đọc từ đây. */
/**
 * Phiên bản bộ luật độ khó cung đường. Đổi ngưỡng/luật thì tăng số, để bản chụp tuyến (scripts/snapshot-routes.ts)
 * biết phán quyết nào do luật nào sinh ra. route-1.1 (19/11/2026): thêm mã thời tiết 45/48 = sương mù.
 * route-1.2 (19/11/2026, gcc29 vòng 7): cờ sạt lở theo QĐ 18/2021 (một nguồn với slideService), bỏ mốc 72h >= 150 mm
 * (không nguồn) và mốc 20 mm (không nguồn); mưa to 50-100 mm/24h thành cờ 'rain' mức 1 (định nghĩa QĐ 18 Điều 3 khoản 17).
 */
export const ROUTE_RULES_VERSION = 'route-1.2';

export const TH = {
  // Mưa theo giờ: nhẹ < 2,5 mm/h, vừa 2,5-7,6, to > 7,6 (thang AMS/WMO hay dùng). Lấy 0,5 / 3 / 10 mm/h.
  RAIN_LIGHT: 0.5, RAIN_MOD: 3, RAIN_HEAVY: 10,
  RAIN_PROB_HIGH: 70,
  // Sương mù: tầm nhìn < 1 km (định nghĩa WMO); < 200 m là sương mù dày, lái xe rất nguy hiểm.
  VIS_FOG: 1000, VIS_DENSE: 200,
  // Đi trong mây trên đèo: mô hình hay báo tầm nhìn vài km dù chỗ đó ẩm 100% và mây thấp kín
  // (đo 19/11/2026 Tà Xùa 1.770m 06h: RH 100, mây thấp 100%, visibility 4.720 m). Nên cờ riêng.
  INCLOUD_RH: 97, INCLOUD_LOW: 90, INCLOUD_MIN_ELEV: 800,
  // Gió giật: cấp 6 (39-49 km/h) xe máy bắt đầu chao; cấp 8 (>= 62 km/h) nguy hiểm (thang Beaufort).
  GUST_NOTE: 29, GUST_HARD: 39, GUST_DANGER: 62,
  // Lạnh khi đi xe: <= 10°C cần đồ ấm; <= 3°C có thể có băng giá vùng núi cao; <= 0°C kèm ẩm/mưa = mặt đường đóng băng.
  COLD_NOTE: 10, COLD_FROST: 3, COLD_ICE: 0,
  // Mưa 24h: mưa to trên 50 đến 100 mm, mưa rất to trên 100 mm (QĐ 18/2021/QĐ-TTg Điều 3 khoản 17). Cờ sạt lở KHÔNG dùng
  // trực tiếp hai mốc này mà theo Điều 46 + Bảng 6 (slideRiskQD18). R24_NOTE 20 chỉ còn là ranh lớp so sánh của khối độ
  // ổn định và khí hậu tháng (chưa có nguồn riêng), không sinh cờ nào. SLIDE_MIN_ELEV 300 m là quy ước của app.
  SLIDE_MIN_ELEV, R24_NOTE: 20, R24_HARD: 50, R24_DANGER: 100,
  // Đi đèo lúc tối: điểm >= 600 m.
  DARK_MIN_ELEV: 600,
};

export function assessPoint(wx: PointWx, elevM: number | null, vehicle: Vehicle = 'motorbike'): Hazard[] {
  const bike = vehicle === 'motorbike';
  const out: Hazard[] = [];
  const e = elevM ?? 0;
  if (wx.wmo !== null && wx.wmo >= 95) {
    out.push({ kind: 'storm', level: 3, text: wx.wmo >= 96 ? 'Dông kèm mưa đá' : 'Dông, sét' });
  }
  const p = wx.precipMm;
  if (p !== null && p >= TH.RAIN_HEAVY) out.push({ kind: 'rain', level: 3, text: `Mưa to ${p} mm/h` });
  else if (p !== null && p >= TH.RAIN_MOD) out.push({ kind: 'rain', level: 2, text: `Mưa vừa ${p} mm/h, đường trơn` });
  else if (p !== null && p >= TH.RAIN_LIGHT) out.push({ kind: 'rain', level: 1, text: `Mưa nhẹ ${p} mm/h` });
  else if (wx.precipProb !== null && wx.precipProb >= TH.RAIN_PROB_HIGH) out.push({ kind: 'rain', level: 1, text: `Khả năng mưa ${wx.precipProb}%` });

  const v = wx.visibilityM;
  if (v !== null && v < TH.VIS_DENSE) out.push({ kind: 'fog', level: 3, text: `Sương mù dày, tầm nhìn ~${Math.round(v)} m` });
  else if (v !== null && v < TH.VIS_FOG) out.push({ kind: 'fog', level: 2, text: `Sương mù, tầm nhìn ~${Math.round(v)} m` });
  else if (wx.wmo === 45 || wx.wmo === 48) out.push({ kind: 'fog', level: 2, text: `Mô hình báo sương mù${wx.wmo === 48 ? ' đóng băng' : ''} (mã thời tiết ${wx.wmo})` });
  else if (e >= TH.INCLOUD_MIN_ELEV && wx.rh !== null && wx.rh >= TH.INCLOUD_RH && wx.cloudLow !== null && wx.cloudLow >= TH.INCLOUD_LOW) {
    out.push({ kind: 'fog', level: 2, text: 'Có thể đi trong mây (ẩm ~100%, mây thấp kín), tầm nhìn có thể rất ngắn' });
  }

  const g = wx.gustKmh;
  if (g !== null && g >= TH.GUST_DANGER) out.push({ kind: 'wind', level: 3, text: `Gió giật ${Math.round(g)} km/h` });
  else if (g !== null && g >= TH.GUST_HARD) out.push({ kind: 'wind', level: 2, text: `Gió giật ${Math.round(g)} km/h, xe máy dễ chao` });
  else if (bike && g !== null && g >= TH.GUST_NOTE) out.push({ kind: 'wind', level: 1, text: `Gió giật ${Math.round(g)} km/h` });

  const t = wx.tempC;
  const wet = (p !== null && p > 0) || (wx.rh !== null && wx.rh >= 95);
  if (t !== null && t <= TH.COLD_ICE && wet) out.push({ kind: 'ice', level: 3, text: `${t}°C và ẩm: nguy cơ mặt đường đóng băng` });
  else if (t !== null && t <= TH.COLD_FROST) out.push({ kind: 'ice', level: 2, text: `${t}°C: có thể có băng giá` });
  else if (bike && t !== null && t <= TH.COLD_NOTE) out.push({ kind: 'cold', level: 1, text: `Lạnh ${t}°C, cần áo ấm, găng tay` });

  // Sạt lở, lũ quét: QĐ 18/2021 Điều 46 + Bảng 6 qua slideRiskQD18 (cùng luật khối 'Dông và sạt lở'). Ánh xạ sang mức
  // của app là QUY ƯỚC: văn bản xếp cấp (LEVEL) -> 3; mưa rất to >= 100 mm nhưng chưa đủ điều kiện ngày mưa trước
  // (NO_PRIOR) -> 2; mưa to (> 50 mm, QĐ 18 khoản 17) -> cờ mưa mức 1. Dưới SLIDE_MIN_ELEV: không xét (LOWLAND).
  const sr = slideRiskQD18(wx, e);
  const wetTxt = `${sr.wetDays}${sr.wetExact ? '' : '+'} ngày mưa trước đó`;
  if (sr.status === 'LEVEL') {
    out.push({ kind: 'landslide', level: 3, text: `Mưa ${sr.r24} mm/24h sau ${wetTxt}: QĐ 18/2021 xếp rủi ro sạt lở, lũ quét ${fmtRange(sr.kv12)} ở miền núi phía Bắc` });
  } else if (sr.status === 'NO_PRIOR') {
    out.push({ kind: 'landslide', level: 2, text: `Mưa rất to ${sr.r24} mm/24h (${wetTxt}, chưa đủ điều kiện để QĐ 18 xếp cấp): đề phòng sạt lở, đá lăn` });
  } else if (sr.status === 'BELOW' && sr.r24 !== null && sr.r24 > TH.R24_HARD) {
    out.push({ kind: 'rain', level: 1, text: `Đã mưa to ${sr.r24} mm trong 24h: đường đèo trơn` });
  }

  if (wx.isDark && e >= TH.DARK_MIN_ELEV) out.push({ kind: 'dark', level: 1, text: 'Qua đoạn núi lúc trời tối' });
  return out;
}

export const maxLevel = (hs: Hazard[]): Level => hs.reduce<Level>((m, h) => (h.level > m ? h.level : m), 0);

// ---------------------------------------------------------------- tổng hợp tuyến

export interface RouteSample {
  km: number;
  pos: LatLon;
  elev: number | null;
  etaMs: number;
  hourKey: string;
  wx: PointWx | null;      // null = ngoài phạm vi dự báo / lỗi đọc
  hazards: Hazard[];
  level: Level;
  isPeak?: boolean;        // điểm cao nhất tuyến được chèn thêm
}

export interface RouteSummary {
  level: Level;
  noDataCount: number;
  worst: { kind: HazardKind; level: Level; text: string; km: number }[];  // mỗi loại một dòng, nặng nhất
  rainKm: number[];        // các mốc km có mưa >= nhẹ
  tempRange: [number, number] | null;
}

export function summarizeRoute(samples: RouteSample[]): RouteSummary {
  const byKind = new Map<HazardKind, { kind: HazardKind; level: Level; text: string; km: number }>();
  let level: Level = 0, noData = 0;
  const temps: number[] = [];
  const rainKm: number[] = [];
  for (const s of samples) {
    if (!s.wx) { noData++; continue; }
    if (s.wx.tempC !== null) temps.push(s.wx.tempC);
    if (s.level > level) level = s.level;
    for (const h of s.hazards) {
      const cur = byKind.get(h.kind);
      const probOnly = (x: { text: string }) => x.text.startsWith('Khả năng');
      if (!cur || h.level > cur.level || (h.level === cur.level && probOnly(cur) && !probOnly(h))) byKind.set(h.kind, { ...h, km: s.km });
      if (h.kind === 'rain' && h.level >= 1 && !h.text.startsWith('Khả năng')) rainKm.push(Math.round(s.km));
    }
  }
  const worst = [...byKind.values()].sort((a, b) => b.level - a.level);
  return {
    level, noDataCount: noData, worst, rainKm,
    tempRange: temps.length ? [Math.min(...temps), Math.max(...temps)] : null,
  };
}

// ---------------------------------------------------------------- tóm tắt một ngày tại điểm đến

export interface DayPart { label: string; from: number; to: number; cloud: number | null; cloudText: string; rainMm: number | null }
export interface RainWindow { from: number; to: number; mm: number }
export interface DaySummary {
  date: string;
  headline: 'Nhiều mưa' | 'Có mưa' | 'Khô ráo' | 'Chưa có dữ liệu';
  hours: number;                       // số giờ có dữ liệu
  tempMin: number | null; tempMax: number | null;
  parts: DayPart[];
  rainWindows: RainWindow[];
  maxGust: { kmh: number; hour: number } | null;
  minVis: { m: number; hour: number } | null;
  storm: boolean;
  sunrise: string | null; sunset: string | null;
}
/** Các buổi (giờ VN, [from, to)). Sáng bắt đầu 5h vì người săn mây có mặt từ trước bình minh. */
export const DAY_PARTS = [
  { label: 'Sáng sớm', from: 5, to: 9 }, { label: 'Trưa', from: 9, to: 15 },
  { label: 'Chiều', from: 15, to: 19 }, { label: 'Tối', from: 19, to: 24 },
];
/** Nhãn mây theo tổng mây trung bình: < 20 quang, < 45 ít mây, < 70 nhiều mây, còn lại âm u. */
export function cloudText(c: number | null): string {
  if (c === null) return 'không rõ';
  return c < 20 ? 'quang' : c < 45 ? 'ít mây' : c < 70 ? 'nhiều mây' : 'âm u';
}
/** Ngưỡng "Nhiều mưa": > 6 giờ có mưa từ RAIN_LIGHT trở lên. */
export const RAINY_DAY_HOURS = 6;

export function summarizeDay(om: any, date: string): DaySummary {
  const h = om?.hourly;
  const idx: number[] = [];
  if (h && Array.isArray(h.time)) h.time.forEach((t: string, i: number) => { if (t.startsWith(date)) idx.push(i); });
  const val = (k: string, i: number) => num(h?.[k]?.[i]);
  const hourOf = (i: number) => Number(String(h.time[i]).slice(11, 13));
  const have = idx.filter(i => val('temperature_2m', i) !== null || val('precipitation', i) !== null);
  const d = om?.daily; const di = d && Array.isArray(d.time) ? d.time.indexOf(date) : -1;
  const base: DaySummary = {
    date, headline: 'Chưa có dữ liệu', hours: have.length, tempMin: null, tempMax: null, parts: [], rainWindows: [],
    maxGust: null, minVis: null, storm: false,
    sunrise: di >= 0 ? (d.sunrise?.[di] ?? '').slice(11, 16) || null : null,
    sunset: di >= 0 ? (d.sunset?.[di] ?? '').slice(11, 16) || null : null,
  };
  if (have.length === 0) return base;
  const temps = have.map(i => val('temperature_2m', i)).filter((x): x is number => x !== null);
  base.tempMin = temps.length ? Math.min(...temps) : null;
  base.tempMax = temps.length ? Math.max(...temps) : null;
  base.parts = DAY_PARTS.map(p => {
    const ii = have.filter(i => hourOf(i) >= p.from && hourOf(i) < p.to);
    const cs = ii.map(i => val('cloud_cover', i)).filter((x): x is number => x !== null);
    const rs = ii.map(i => val('precipitation', i)).filter((x): x is number => x !== null);
    const cloud = cs.length ? Math.round(cs.reduce((a, b) => a + b, 0) / cs.length) : null;
    return { ...p, cloud, cloudText: cloudText(cloud), rainMm: rs.length ? Math.round(rs.reduce((a, b) => a + b, 0) * 10) / 10 : null };
  });
  let rainHours = 0; let cur: RainWindow | null = null;
  for (const i of have) {
    const p = val('precipitation', i); const hr = hourOf(i);
    if (p !== null && p >= TH.RAIN_LIGHT) {
      rainHours++;
      if (cur && cur.to === hr) { cur.to = hr + 1; cur.mm += p; } else { cur = { from: hr, to: hr + 1, mm: p }; base.rainWindows.push(cur); }
    } else cur = null;
    const g = val('wind_gusts_10m', i); if (g !== null && (!base.maxGust || g > base.maxGust.kmh)) base.maxGust = { kmh: Math.round(g), hour: hr };
    const v = val('visibility', i); if (v !== null && (!base.minVis || v < base.minVis.m)) base.minVis = { m: Math.round(v), hour: hr };
    const w = val('weather_code', i); if (w !== null && w >= 95) base.storm = true;
  }
  base.rainWindows.forEach(r => { r.mm = Math.round(r.mm * 10) / 10; });
  base.headline = rainHours > RAINY_DAY_HOURS ? 'Nhiều mưa' : rainHours > 0 ? 'Có mưa' : 'Khô ráo';
  return base;
}

// ---------------------------------------------------------------- rạng sáng theo giờ tại đích

/**
 * Chuỗi 04-09h tại chỗ đứng ở đích: số thô của mô hình + đúng các cờ `assessPoint` dọc đường đang dùng
 * (sương/đi trong mây, mưa, gió, lạnh), bỏ cờ "đèo lúc tối" vì người đã đứng tại chỗ.
 * KHÔNG phải điểm biển mây theo giờ: engine biển mây tính MỘT kết luận cho cả khung 04-09h
 * (xem aggregateDayModel), không có số theo giờ, nên ở đây không tự chế ra số đó.
 */
export const DAWN_HOURS = [4, 5, 6, 7, 8, 9];
export interface DawnHour { hour: number; wx: PointWx | null; hazards: Hazard[]; level: Level }
export function dawnHours(om: any, date: string, elevM: number | null): DawnHour[] {
  return DAWN_HOURS.map(hour => {
    const wx = extractPointWx(om, `${date}T${String(hour).padStart(2, '0')}:00`);
    const hazards = wx ? assessPoint(wx, elevM, 'motorbike').filter(h => h.kind !== 'dark') : [];
    return { hour, wx, hazards, level: maxLevel(hazards) };
  });
}

// ---------------------------------------------------------------- gọi mạng (không test đơn vị)

const MEM = new Map<string, { ts: number; data: any }>();
/** Chỉ dùng khi chạy script (Node): FOSSGIS đòi User-Agent nêu tên ứng dụng. Trình duyệt tự gửi UA + Referer. */
let EXTRA_HEADERS: Record<string, string> | undefined;
export function setFetchHeaders(h: Record<string, string>) { EXTRA_HEADERS = h; }
/** Hạn chờ mỗi lần gọi mạng (phiếu gcc29 vòng 3: một lượt trên Pages từng quay > 90 s). Quá hạn thì báo lỗi rõ, không quay mãi. */
export const FETCH_TIMEOUT_MS = 30_000;
/** Lời báo lỗi HTTP dễ hiểu; 429 = dịch vụ miễn phí đang giới hạn lượt gọi (thường theo IP), không phải lỗi app. */
export function httpErrorText(status: number, host: string): string {
  if (status === 429) return `${host} đang giới hạn lượt gọi (HTTP 429). Dịch vụ miễn phí này đếm theo mạng của bạn; thử lại sau vài phút.`;
  if (status >= 500) return `${host} đang lỗi (HTTP ${status}), thử lại sau.`;
  return `HTTP ${status} từ ${host}`;
}
/** Lúc tải thật của một URL đang nằm trong đệm (ms), để hiện "dự báo tải lúc HH:MM". */
export function fetchedAtOf(url: string): number | null { return MEM.get(url)?.ts ?? null; }
export async function getJson(url: string, ttlMs: number): Promise<any> {
  const hit = MEM.get(url);
  if (hit && Date.now() - hit.ts < ttlMs) return hit.data;
  const host = new URL(url).hostname;
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS) : null;
  let res: Response;
  try { res = await fetch(url, { ...(EXTRA_HEADERS ? { headers: EXTRA_HEADERS } : {}), ...(ctl ? { signal: ctl.signal } : {}) }); }
  catch (e: any) {
    if (e?.name === 'AbortError') throw new Error(`${host} không trả lời sau ${FETCH_TIMEOUT_MS / 1000} giây`);
    throw new Error(`Không gọi được ${host}: ${e?.message || 'lỗi mạng'}`);
  } finally { if (timer) clearTimeout(timer); }
  if (!res.ok) throw new Error(httpErrorText(res.status, host));
  const data = await res.json();
  if (data && !Array.isArray(data) && data.error) throw new Error(`${new URL(url).hostname}: ${data.reason || data.message || 'lỗi'}`);
  MEM.set(url, { ts: Date.now(), data });
  if (MEM.size > 30) { const o = [...MEM.entries()].sort((a, b) => a[1].ts - b[1].ts)[0]; if (o) MEM.delete(o[0]); }
  return data;
}

export interface GeoHit { name: string; detail: string; lat: number; lon: number }
/** Tìm địa danh Việt Nam bằng Open-Meteo Geocoding (miễn phí, không khoá). */
export async function geocodeVN(q: string): Promise<GeoHit[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q.trim())}&count=6&language=vi&countryCode=VN`;
  const d = await getJson(url, 24 * 3600_000);
  return (d.results || []).map((r: any) => ({
    name: r.name, detail: [r.admin2, r.admin1].filter(Boolean).join(', '), lat: r.latitude, lon: r.longitude,
  }));
}

/** Giải mã polyline độ chính xác 6 chữ số (định dạng `shape` của Valhalla). */
export function decodePolyline6(str: string): LatLon[] {
  const out: LatLon[] = [];
  let i = 0, lat = 0, lon = 0;
  const next = () => {
    let res = 0, shift = 0, b: number;
    do { b = str.charCodeAt(i++) - 63; res |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    return res & 1 ? ~(res >> 1) : res >> 1;
  };
  while (i < str.length) { lat += next(); lon += next(); out.push({ lat: lat / 1e6, lon: lon / 1e6 }); }
  return out;
}

export type RouterId = 'valhalla-motorcycle' | 'osrm-car';
export const ROUTER_LABEL: Record<RouterId, string> = {
  'valhalla-motorcycle': 'tuyến xe máy (Valhalla)',
  'osrm-car': 'tuyến ô tô (OSRM)',
};
export interface RouteGeom {
  coords: LatLon[]; cum: number[]; distanceKm: number; durationH: number;
  router: RouterId;
  /** Có khi xe máy phải rơi về tuyến ô tô: lý do, để giao diện nói thẳng. */
  fallbackNote?: string;
  /** Tuyến xe máy có đoạn thu phí (thường là cao tốc/đường cao cấp): nhắc người đi xem biển cấm xe máy. */
  cautionNote?: string;
  /** Km chim bay từ điểm cuối tuyến tới đích (vòng 7). > END_GAP_WARN_KM = tuyến chưa tới đích. */
  endGapKm: number;
}

/** Tuyến ô tô từ OSRM bản công khai (miễn phí, CORS mở). */
export async function fetchOsrmCar(a: LatLon, b: LatLon): Promise<RouteGeom> {
  const url = `https://router.project-osrm.org/route/v1/driving/${a.lon.toFixed(5)},${a.lat.toFixed(5)};${b.lon.toFixed(5)},${b.lat.toFixed(5)}?overview=full&geometries=geojson`;
  const d = await getJson(url, 24 * 3600_000);
  const r = d?.routes?.[0];
  if (d?.code !== 'Ok' || !r) throw new Error(`OSRM không tìm được đường (${d?.code || 'không rõ'})`);
  const coords: LatLon[] = r.geometry.coordinates.map(([lon, lat]: [number, number]) => ({ lat, lon }));
  return { coords, cum: cumulativeKm(coords), distanceKm: r.distance / 1000, durationH: r.duration / 3600, router: 'osrm-car', endGapKm: endGapOf(coords, b) };
}

/**
 * Tuyến XE MÁY từ Valhalla của FOSSGIS (valhalla1.openstreetmap.de; CORS mở, đo 19/11/2026).
 * Điều khoản FOSSGIS (ĐÃ ĐỌC 19/11/2026): tối đa 1 request/giây, ghi nguồn OSM + link sửa bản đồ,
 * không dùng cho site lưu lượng lớn, không tải hàng loạt. App gọi 1 lần cho mỗi lần bấm, có cache 24h.
 * use_highways 0.5 (mặc định): đo 19/11/2026 Hà Nội - Tà Xùa, use_highways 0 cho 425 km/13h (né cả quốc lộ trunk),
 * 0.1 cho 320 km, 0.5 cho 224 km (has_highway=false, nhưng có đoạn thu phí CT.03). Cấm xe máy trên cao tốc dựa vào
 * thẻ access của OSM; thẻ thiếu thì Valhalla vẫn có thể chọn, nên tuyến có thu phí thì giao diện nhắc xem biển.
 */
export const VALHALLA_URL = 'https://valhalla1.openstreetmap.de/route';
export async function fetchValhallaMoto(a: LatLon, b: LatLon): Promise<RouteGeom> {
  const q = {
    locations: [{ lat: +a.lat.toFixed(5), lon: +a.lon.toFixed(5) }, { lat: +b.lat.toFixed(5), lon: +b.lon.toFixed(5) }],
    costing: 'motorcycle', costing_options: { motorcycle: { use_highways: 0.5, use_tolls: 0 } },
    units: 'kilometers', directions_type: 'none',
  };
  const d = await getJson(`${VALHALLA_URL}?json=${encodeURIComponent(JSON.stringify(q))}`, 24 * 3600_000);
  const legs = d?.trip?.legs;
  if (!legs?.length || d?.trip?.status !== 0) throw new Error(`Valhalla không tìm được đường (${d?.trip?.status_message || d?.error || 'không rõ'})`);
  const coords = legs.flatMap((l: any) => decodePolyline6(l.shape));
  const s = d.trip.summary;
  return { coords, cum: cumulativeKm(coords), distanceKm: s.length, durationH: s.time / 3600, router: 'valhalla-motorcycle', endGapKm: endGapOf(coords, b),
    cautionNote: s.has_toll || s.has_highway ? 'Tuyến xe máy này có đoạn thu phí/cao tốc theo bản đồ OSM. Có đoạn cấm xe máy mà bản đồ chưa ghi; tới nơi theo biển báo.' : undefined };
}

/**
 * Khoảng hở điểm cuối (phiếu gcc29 vòng 7): km chim bay từ điểm cuối tuyến tới đích. Máy tìm đường bám đích vào
 * đoạn đường gần nhất nó cho đi; đích là đỉnh/điểm ngắm cuối đường mòn thì tuyến dừng sớm (đo 19/11/2026: OSRM
 * Huế - Bạch Mã dừng cách đỉnh 2,25 km). Hở > END_GAP_WARN_KM thì giao diện và bản chụp nói rõ "chưa tới đích".
 */
export const END_GAP_WARN_KM = 0.5;   // quy ước app: dưới mức này coi là bãi đỗ/điểm xuống xe sát đích
export function endGapOf(coords: LatLon[], dest: LatLon): number {
  return coords.length ? haversineKm(coords[coords.length - 1], dest) : Infinity;
}
export function endGapNote(gapKm: number): string | undefined {
  if (!(gapKm > END_GAP_WARN_KM)) return undefined;
  return `Tuyến CHƯA TỚI ĐÍCH: đường xe trên bản đồ dừng cách điểm đến ${gapKm.toFixed(1)} km chim bay (đoạn cuối là đường mòn, đường nội bộ hoặc bản đồ chưa có). Thời tiết và độ khó ở đây chỉ tính tới điểm cuối của tuyến; đoạn còn lại tự tìm hiểu.`;
}

/** Xe máy: Valhalla, hỏng thì OSRM ô tô kèm ghi chú. Ô tô: OSRM. */
export async function fetchRoute(a: LatLon, b: LatLon, vehicle: Vehicle = 'car'): Promise<RouteGeom> {
  if (vehicle === 'car') return fetchOsrmCar(a, b);
  try { return await fetchValhallaMoto(a, b); }
  catch (e: any) {
    const g = await fetchOsrmCar(a, b);
    return { ...g, fallbackNote: `Không lấy được tuyến xe máy (${e?.message || 'lỗi'}), đang dùng TUYẾN Ô TÔ: có thể đi qua cao tốc xe máy không được vào.` };
  }
}

// ---------------------------------------------------------------- km đường thật tới các điểm (kèo thơm)

export interface RoadDist { km: number; h: number }
/** Đọc phản hồi OSRM `table` (1 nguồn -> n đích). Ô không có đường -> null, không bịa số chim bay. */
export function parseOsrmTable(d: any, n: number): (RoadDist | null)[] {
  if (d?.code !== 'Ok' || !Array.isArray(d.distances?.[0])) throw new Error(`OSRM table lỗi (${d?.code || 'không rõ'})`);
  const dist = d.distances[0], dur = d.durations?.[0] || [];
  return Array.from({ length: n }, (_, i) => {
    const m = dist[i + 1];
    return typeof m === 'number' && Number.isFinite(m) ? { km: m / 1000, h: (dur[i + 1] ?? NaN) / 3600 } : null;
  });
}
export const ROAD_TABLE_MAX = 99;   // OSRM demo nhận tối đa 100 toạ độ (đo 19/11/2026: 100 điểm vẫn 200)
/**
 * Km đường ô tô (OSRM `table`) từ `origin` tới mọi đích, gom 1 lần gọi cho tới 99 đích. Toạ độ gốc làm tròn
 * 0,01° (~1 km) để cache trúng nhiều hơn và không gửi vị trí chính xác của người dùng.
 */
export async function fetchRoadDistances(origin: LatLon, dests: LatLon[]): Promise<(RoadDist | null)[]> {
  const o = `${origin.lon.toFixed(2)},${origin.lat.toFixed(2)}`;
  const out: (RoadDist | null)[] = [];
  for (let i = 0; i < dests.length; i += ROAD_TABLE_MAX) {
    const part = dests.slice(i, i + ROAD_TABLE_MAX);
    const url = `https://router.project-osrm.org/table/v1/driving/${o};${part.map(p => `${p.lon.toFixed(4)},${p.lat.toFixed(4)}`).join(';')}?sources=0&annotations=distance,duration`;
    out.push(...parseOsrmTable(await getJson(url, 24 * 3600_000), part.length));
  }
  return out;
}

const f4 = (x: number) => x.toFixed(4);
export async function fetchElevations(pts: LatLon[]): Promise<(number | null)[]> {
  if (pts.length === 0) return [];
  const url = `https://api.open-meteo.com/v1/elevation?latitude=${pts.map(p => f4(p.lat)).join(',')}&longitude=${pts.map(p => f4(p.lon)).join(',')}`;
  const d = await getJson(url, 7 * 24 * 3600_000);
  return (d.elevation || []).map((v: unknown) => num(v));
}

/**
 * Một lần gọi Open-Meteo cho mọi điểm (đa toạ độ), có `elevation=` để nhiệt độ được hạ theo cao độ
 * mặt đường thật. past_days=3 để tính mưa tích luỹ 72h. Ngân sách: ~N điểm x 8 biến / 10 ≈ 1-2 call/điểm.
 */
export function routeWeatherUrl(pts: { pos: LatLon; elev: number | null }[]): string {
  const lat = pts.map(p => f4(p.pos.lat)).join(',');
  const lon = pts.map(p => f4(p.pos.lon)).join(',');
  const elevParam = pts.every(p => p.elev !== null) ? `&elevation=${pts.map(p => Math.round(p.elev as number)).join(',')}` : '';
  return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}${elevParam}` +
    `&hourly=${ROUTE_HOURLY_VARS.join(',')}&daily=sunrise,sunset&timezone=Asia%2FHo_Chi_Minh&past_days=3&forecast_days=7`;
}
export async function fetchRouteWeather(pts: { pos: LatLon; elev: number | null }[]): Promise<any[]> {
  const d = await getJson(routeWeatherUrl(pts), 30 * 60_000);
  return Array.isArray(d) ? d : [d];
}

export interface RoutePlan {
  from: LatLon; to: LatLon; vehicle: Vehicle; speedKmh: number; departMs: number;
  distanceKm: number; durationH: number;   // theo tốc độ trung bình đã chọn
  routerH: number;                         // giờ do máy tìm đường ước, chỉ để tham khảo
  router: RouterId; fallbackNote?: string; cautionNote?: string;
  coords: LatLon[];
  elevKms: number[]; elevs: (number | null)[];
  stats: ElevStats | null;
  samples: RouteSample[];
  summary: RouteSummary;
  /** Phản hồi Open-Meteo thô tại điểm đích (10 ngày theo giờ) để tóm tắt ngày, không gọi thêm API. */
  destOm: any;
  /**
   * Vòng 7: tuyến chưa tới đích (hở > END_GAP_WARN_KM) thì `destOm`/`destElev` lấy TẠI ĐÍCH (thêm 1 toạ độ vào cùng lần gọi
   * cao độ và dự báo, không thêm lần gọi), không phải tại điểm cuối tuyến. Trước đây "Tóm tắt ngày tại đích" của Pù Luông
   * là thời tiết ở 543 m cuối đường xe thay vì đỉnh 1.700 m.
   */
  destElev: number | null;
  endGapKm: number;
  endNote?: string;
  /** Lúc tải dự báo dọc tuyến thật (ms; lấy từ đệm 30 phút thì là lúc tải lần đầu), để hiện "dự báo tải lúc HH:MM". */
  fetchedAt: number;
}

/**
 * Ghép mọi bước: tuyến -> profile cao độ -> điểm mẫu (+ điểm cao nhất) -> thời tiết đúng giờ đi qua.
 * `depart` có thể là hàm nhận số giờ đi (để tính ngược "đến nơi trước bình minh").
 */
export async function planRoute(
  from: LatLon, to: LatLon, vehicle: Vehicle, speedKmh: number, depart: number | ((durationH: number) => number),
  onStep?: (step: number, text: string) => void,
): Promise<RoutePlan> {
  onStep?.(1, vehicle === 'motorbike' ? 'Tìm đường xe máy (Valhalla)' : 'Tìm đường ô tô (OSRM)');
  const geom = await fetchRoute(from, to, vehicle);
  const total = geom.cum[geom.cum.length - 1];
  const durationH = geom.distanceKm / speedKmh;
  const departMs = typeof depart === 'function' ? depart(durationH) : depart;

  const gapped = geom.endGapKm > END_GAP_WARN_KM;
  const eKms = elevationKms(total, gapped ? ELEV_MAX_POINTS - 1 : ELEV_MAX_POINTS);
  onStep?.(2, 'Đo cao độ dọc tuyến (Open-Meteo)');
  const elevAll = await fetchElevations([...eKms.map(k => pointAtKm(geom.coords, geom.cum, k)), ...(gapped ? [to] : [])]);
  const elevs = elevAll.slice(0, eKms.length);
  const destElev = gapped ? (elevAll[eKms.length] ?? null) : (elevs[elevs.length - 1] ?? null);
  const stats = elevationStats(eKms, elevs.map(v => (v === null ? NaN : v)));

  const elevAt = (km: number): number | null => {
    let best = 0;
    for (let i = 1; i < eKms.length; i++) if (Math.abs(eKms[i] - km) < Math.abs(eKms[best] - km)) best = i;
    return elevs[best] ?? null;
  };
  const wKms = weatherKms(total);
  if (stats && !wKms.some(k => Math.abs(k - stats.maxKm) < 3)) wKms.push(stats.maxKm);
  wKms.sort((a, b) => a - b);

  const base = wKms.map(km => ({ km, pos: pointAtKm(geom.coords, geom.cum, km), elev: elevAt(km) }));
  onStep?.(3, 'Lấy dự báo dọc tuyến (Open-Meteo)');
  const wxPts = gapped ? [...base, { pos: to, elev: destElev }] : base;
  const omsAll = await fetchRouteWeather(wxPts);
  const oms = omsAll.slice(0, base.length);
  const fetchedAt = fetchedAtOf(routeWeatherUrl(wxPts)) ?? Date.now();
  const samples: RouteSample[] = base.map((b, i) => {
    const eta = etaMs(b.km, total, durationH, departMs);
    const hourKey = vnHourKey(eta);
    const wx = extractPointWx(oms[i], hourKey);
    const hazards = wx ? assessPoint(wx, b.elev, vehicle) : [];
    return { ...b, etaMs: eta, hourKey, wx, hazards, level: maxLevel(hazards), isPeak: !!stats && b.km === stats.maxKm };
  });
  return {
    from, to, vehicle, speedKmh, departMs, distanceKm: geom.distanceKm, durationH, routerH: geom.durationH, router: geom.router, fallbackNote: geom.fallbackNote, cautionNote: geom.cautionNote,
    coords: geom.coords, elevKms: eKms, elevs, stats, samples, summary: summarizeRoute(samples), destOm: omsAll[omsAll.length - 1], fetchedAt,
    destElev, endGapKm: geom.endGapKm, endNote: endGapNote(geom.endGapKm),
  };
}

// ---------------------------------------------------------------- bản ghi gọn của một tuyến (bản chụp + tuyến người dùng)

/**
 * Bản ghi gọn một tuyến đã lập, CÙNG định dạng với `routes[]` trong `data/observations/<D>-routes.json`
 * (scripts/snapshot-routes.ts), để tuyến người dùng tự lập chấm được bằng cùng cách (docs/cung-duong-kiem-chung.md).
 * Đủ dữ liệu thô (`samples[].wx`) để chạy lại `assessPoint` khi đổi luật.
 */
export function compactRoute(p: RoutePlan) {
  return {
    vehicle: p.vehicle, speedKmh: p.speedKmh, router: p.router, fallbackNote: p.fallbackNote ?? null,
    departVN: new Date(p.departMs + 7 * 3600_000).toISOString().slice(0, 16),
    distanceKm: Math.round(p.distanceKm * 10) / 10, durationH: Math.round(p.durationH * 100) / 100,
    maxElev: p.stats?.maxElev ?? null, cautionNote: p.cautionNote ?? null,
    endGapKm: Math.round(p.endGapKm * 100) / 100, endNote: p.endNote ?? null,
    level: p.summary.level, levelLabel: LEVEL_LABEL[p.summary.level], noDataCount: p.summary.noDataCount,
    worst: p.summary.worst.map(w => ({ kind: w.kind, level: w.level, km: Math.round(w.km), text: w.text })),
    samples: p.samples.map(s => ({
      km: Math.round(s.km), elev: s.elev, hour: s.hourKey, level: s.level,
      wx: s.wx && { t: s.wx.tempC, rh: s.wx.rh, mm: s.wx.precipMm, pop: s.wx.precipProb, wmo: s.wx.wmo, vis: s.wx.visibilityM, gust: s.wx.gustKmh, r24: s.wx.rain24h, r72: s.wx.rain72h, rp: s.wx.rainPrior ?? null },
      hz: s.hazards.map(h => `${h.kind}${h.level}`),
    })),
  };
}

// ---------------------------------------------------------------- tuyến người dùng tự lập (chỉ trên máy người dùng)

export const USER_ROUTES_KEY = 'ch-user-routes-v1';
export const USER_ROUTES_MAX = 50;
/** Làm tròn toạ độ ~1 km: tuyến chỉ nằm trên máy người dùng, nhưng tệp xuất có thể được gửi đi nên không giữ vị trí chính xác. */
const round2 = (x: number) => Math.round(x * 100) / 100;
export function userRouteRecord(p: RoutePlan, fromName: string, toKey: string, savedAt = Date.now()) {
  return {
    savedAtVN: new Date(savedAt + 7 * 3600_000).toISOString().slice(0, 16), rulesVersion: ROUTE_RULES_VERSION,
    fromName, from: { lat: round2(p.from.lat), lon: round2(p.from.lon) }, to: toKey, ...compactRoute(p),
  };
}
export type UserRoute = ReturnType<typeof userRouteRecord>;
export function loadUserRoutes(store: Pick<Storage, 'getItem'> = localStorage): UserRoute[] {
  try { const v = JSON.parse(store.getItem(USER_ROUTES_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
}
/** Thêm tuyến mới nhất lên đầu, giữ tối đa USER_ROUTES_MAX. Ném lỗi nếu bộ nhớ đầy (người gọi tự bỏ qua). */
export function saveUserRoute(p: RoutePlan, fromName: string, toKey: string, store: Pick<Storage, 'getItem' | 'setItem'> = localStorage, savedAt = Date.now()) {
  const list = [userRouteRecord(p, fromName, toKey, savedAt), ...loadUserRoutes(store)].slice(0, USER_ROUTES_MAX);
  store.setItem(USER_ROUTES_KEY, JSON.stringify(list));
  return list.length;
}
/** Nội dung tệp xuất: kèm ghi chú cách dùng, để ai nhận tệp cũng hiểu đây là phán quyết TRƯỚC chuyến đi, không phải sự thật. */
export function exportUserRoutesJson(list: UserRoute[], exportedAt = Date.now()) {
  return JSON.stringify({
    app: 'CloudHunter', kind: 'user-routes', exportedAtVN: new Date(exportedAt + 7 * 3600_000).toISOString().slice(0, 16),
    note: 'Các tuyến bạn đã lập trong app và phán quyết độ khó app đưa ra TRƯỚC chuyến đi. Kèm báo cáo chuyến đi thật (mẫu trong docs/cung-duong-kiem-chung.md mục 3) thì chấm được luật độ khó.',
    routes: list,
  }, null, 1);
}
