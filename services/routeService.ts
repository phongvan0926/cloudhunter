/**
 * Thời tiết + độ khó dọc CUNG ĐƯỜNG tới điểm săn mây (19/11/2026, phiếu gcc29).
 *
 * Định hướng số 1 của dự án: người đi phượt cần biết cả đường đi, không chỉ điểm đến.
 * Ý tưởng học từ skyradar.vn (họ khoá sau gói Pro): lấy tuyến OSRM, chia điểm dọc đường, ước giờ
 * đi qua từng điểm, lấy dự báo ĐÚNG giờ đó. Họ chỉ xét mưa + mây. Bản này tự viết, thêm thứ dân
 * phượt đèo cần: cao độ từng điểm (DEM), đèo cao nhất, tổng leo dốc, tầm nhìn/đi trong mây, gió giật,
 * nhiệt độ ở cao độ mặt đường, mưa tích luỹ 24h/72h (trơn, sạt lở), và qua đèo lúc trời tối.
 *
 * Triết lý giữ nguyên: mọi con số do code tính; thiếu dữ liệu thì nói thiếu (noData), không bịa.
 * Ngưỡng dưới đây là ngưỡng THAM KHẢO cho người đi đường (nguồn ghi cạnh từng hằng số), không
 * phải engine biển mây và không đụng điểm/trạng thái/đáng đi.
 */

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
export function elevationKms(total: number): number[] {
  const step = Math.max(1, total / (ELEV_MAX_POINTS - 1));
  return evenKms(total, step, step * 0.3).slice(0, ELEV_MAX_POINTS);
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
  isDark: boolean | null;        // trước bình minh / sau hoàng hôn
}

export const ROUTE_HOURLY_VARS = [
  'temperature_2m', 'relative_humidity_2m', 'precipitation', 'precipitation_probability',
  'weather_code', 'visibility', 'wind_gusts_10m', 'cloud_cover_low',
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
  // Mưa tích luỹ 24h ở vùng đồi núi (>= 300 m): mưa to 50-100 mm/24h, rất to > 100 mm/24h
  // (thang mưa của Trung tâm Dự báo KTTV quốc gia). Đất bão hoà sau 72h >= 150 mm.
  SLIDE_MIN_ELEV: 300, R24_NOTE: 20, R24_HARD: 50, R24_DANGER: 100, R72_HARD: 150,
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

  if (e >= TH.SLIDE_MIN_ELEV) {
    const r24 = wx.rain24h, r72 = wx.rain72h;
    if (r24 !== null && r24 >= TH.R24_DANGER) out.push({ kind: 'landslide', level: 3, text: `Mưa ${r24} mm trong 24h: nguy cơ sạt lở, lũ quét` });
    else if ((r24 !== null && r24 >= TH.R24_HARD) || (r72 !== null && r72 >= TH.R72_HARD)) {
      out.push({ kind: 'landslide', level: 2, text: `Mưa nhiều (24h: ${r24 ?? '?'} mm, 72h: ${r72 ?? '?'} mm): đường đèo dễ sạt, đất đá` });
    } else if (r24 !== null && r24 >= TH.R24_NOTE) out.push({ kind: 'landslide', level: 1, text: `Đã mưa ${r24} mm trong 24h: đường đất lầy, trơn` });
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

// ---------------------------------------------------------------- gọi mạng (không test đơn vị)

const MEM = new Map<string, { ts: number; data: any }>();
async function getJson(url: string, ttlMs: number): Promise<any> {
  const hit = MEM.get(url);
  if (hit && Date.now() - hit.ts < ttlMs) return hit.data;
  let res: Response;
  try { res = await fetch(url); } catch (e: any) { throw new Error(`Không gọi được ${new URL(url).hostname}: ${e?.message || 'lỗi mạng'}`); }
  if (!res.ok) throw new Error(`HTTP ${res.status} từ ${new URL(url).hostname}`);
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

export interface RouteGeom { coords: LatLon[]; cum: number[]; distanceKm: number; durationH: number }
/** Tuyến ô tô từ OSRM bản công khai (miễn phí, CORS mở). */
export async function fetchRoute(a: LatLon, b: LatLon): Promise<RouteGeom> {
  const url = `https://router.project-osrm.org/route/v1/driving/${a.lon.toFixed(5)},${a.lat.toFixed(5)};${b.lon.toFixed(5)},${b.lat.toFixed(5)}?overview=full&geometries=geojson`;
  const d = await getJson(url, 24 * 3600_000);
  const r = d?.routes?.[0];
  if (d?.code !== 'Ok' || !r) throw new Error(`OSRM không tìm được đường (${d?.code || 'không rõ'})`);
  const coords: LatLon[] = r.geometry.coordinates.map(([lon, lat]: [number, number]) => ({ lat, lon }));
  return { coords, cum: cumulativeKm(coords), distanceKm: r.distance / 1000, durationH: r.duration / 3600 };
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
export async function fetchRouteWeather(pts: { pos: LatLon; elev: number | null }[]): Promise<any[]> {
  const lat = pts.map(p => f4(p.pos.lat)).join(',');
  const lon = pts.map(p => f4(p.pos.lon)).join(',');
  const elevParam = pts.every(p => p.elev !== null) ? `&elevation=${pts.map(p => Math.round(p.elev as number)).join(',')}` : '';
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}${elevParam}` +
    `&hourly=${ROUTE_HOURLY_VARS.join(',')}&daily=sunrise,sunset&timezone=Asia%2FHo_Chi_Minh&past_days=3&forecast_days=7`;
  const d = await getJson(url, 30 * 60_000);
  return Array.isArray(d) ? d : [d];
}

export interface RoutePlan {
  from: LatLon; to: LatLon; vehicle: Vehicle; speedKmh: number; departMs: number;
  distanceKm: number; durationH: number;   // theo tốc độ trung bình đã chọn
  osrmH: number;                           // giờ OSRM (hồ sơ ô tô), chỉ để tham khảo
  coords: LatLon[];
  elevKms: number[]; elevs: (number | null)[];
  stats: ElevStats | null;
  samples: RouteSample[];
  summary: RouteSummary;
}

/**
 * Ghép mọi bước: tuyến -> profile cao độ -> điểm mẫu (+ điểm cao nhất) -> thời tiết đúng giờ đi qua.
 * `depart` có thể là hàm nhận số giờ đi (để tính ngược "đến nơi trước bình minh").
 */
export async function planRoute(
  from: LatLon, to: LatLon, vehicle: Vehicle, speedKmh: number, depart: number | ((durationH: number) => number),
): Promise<RoutePlan> {
  const geom = await fetchRoute(from, to);
  const total = geom.cum[geom.cum.length - 1];
  const durationH = geom.distanceKm / speedKmh;
  const departMs = typeof depart === 'function' ? depart(durationH) : depart;

  const eKms = elevationKms(total);
  const elevs = await fetchElevations(eKms.map(k => pointAtKm(geom.coords, geom.cum, k)));
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
  const oms = await fetchRouteWeather(base);
  const samples: RouteSample[] = base.map((b, i) => {
    const eta = etaMs(b.km, total, durationH, departMs);
    const hourKey = vnHourKey(eta);
    const wx = extractPointWx(oms[i], hourKey);
    const hazards = wx ? assessPoint(wx, b.elev, vehicle) : [];
    return { ...b, etaMs: eta, hourKey, wx, hazards, level: maxLevel(hazards), isPeak: !!stats && b.km === stats.maxKm };
  });
  return {
    from, to, vehicle, speedKmh, departMs, distanceKm: geom.distanceKm, durationH, osrmH: geom.durationH,
    coords: geom.coords, elevKms: eKms, elevs, stats, samples, summary: summarizeRoute(samples),
  };
}
