/**
 * Khí hậu theo THÁNG dọc cung đường và tại điểm săn mây (19/11/2026, phiếu gcc29 vòng 4, định hướng số 1:
 * "độ khó về mặt thời tiết, khí hậu của cung đường").
 *
 * Số do scripts/climate-monthly.ts tính SẴN từ Open-Meteo Historical (ERA5 / ERA5-Land, archive-api), gộp 10 năm
 * 2016-2025, ghi vào public/climate/monthly-v1.json. App chỉ đọc tệp tĩnh đó (không gọi API lúc dùng).
 * Đây là "tháng này THƯỜNG thế nào", không phải dự báo; không tham gia điểm/trạng thái/đáng đi.
 *
 * Ngưỡng (nguồn cạnh từng dòng): dùng lại TH của routeService cho mưa/lạnh, thêm hai ngưỡng rét của KTTV.
 * ERA5 lưới ~9-25 km nên làm mượt mưa lớn ở vùng núi: số ngày mưa to là CẬN DƯỚI, nói rõ trên giao diện.
 */
import { TH, haversineKm, type LatLon } from './routeService';

export const CLIMATE_FILE_VERSION = 'climate-monthly-v1';
export const CLIMATE_YEARS = { from: 2016, to: 2025 } as const;
export const CLIMATE_DAILY_VARS = ['precipitation_sum', 'temperature_2m_mean', 'temperature_2m_min', 'relative_humidity_2m_min'] as const;

export const CTH = {
  // Mưa ngày: dùng lại thang mưa 24h vùng núi của TH (Trung tâm Dự báo KTTV quốc gia): >= 20 đáng để ý,
  // 50-100 mưa to, > 100 mưa rất to. Đợt 3 ngày >= 150 mm = đất bão hoà, nguy cơ sạt lở (TH.R72_HARD).
  R_NOTE: TH.R24_NOTE, R_HARD: TH.R24_HARD, R_DANGER: TH.R24_DANGER, R3_SLIDE: TH.R72_HARD,
  // Rét đậm: nhiệt độ trung bình ngày <= 15°C; rét hại: <= 13°C (định nghĩa Trung tâm Dự báo KTTV quốc gia dùng
  // trong bản tin không khí lạnh; vùng núi cao thì gần như cả mùa đông dưới ngưỡng, nên đọc kèm nhiệt độ đêm).
  RET_DAM: 15, RET_HAI: 13,
  // Có thể có băng giá/sương muối ở vùng núi: nhiệt độ thấp nhất <= 3°C (TH.COLD_FROST, cùng ngưỡng cảnh báo khi đi xe).
  FROST: TH.COLD_FROST,
  // Ẩm suốt ngày: độ ẩm THẤP NHẤT trong ngày >= 90%. KHÔNG phải định nghĩa sương mù (WMO: tầm nhìn < 1 km);
  // ERA5 không có tầm nhìn nên đây chỉ là chỉ báo thay thế ĐOÁN, chưa kiểm với quan trắc: ngày ẩm cả ngày thì hay
  // có mù/mây sát đất trên đèo. Giao diện ghi rõ là chỉ báo.
  HUMID_ALLDAY: 90,
  // Tháng đủ dữ liệu: >= 25 ngày có số trong tháng đó của một năm.
  MIN_DAYS: 25,
};

/** Một tháng (trung bình theo năm). Số ngày là số ngày/tháng trung bình; r3Years là số NĂM có ít nhất một đợt 3 ngày >= 150 mm. */
export interface MonthStat {
  years: number;          // số năm đủ dữ liệu cho tháng này
  rainMm: number | null;  // tổng mưa tháng trung bình
  d20: number | null; d50: number | null; d100: number | null;
  r3Years: number | null;
  retDam: number | null; retHai: number | null; frost: number | null;
  humid: number | null;
  tMean: number | null; tMin: number | null;   // trung bình tháng của Tmean ngày, của Tmin ngày
}

const r1 = (x: number) => Math.round(x * 10) / 10;
const ok = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Gộp chuỗi ngày (cùng độ dài, ngày dạng YYYY-MM-DD) thành 12 tháng. Năm-tháng thiếu > (số ngày - MIN_DAYS) giá trị mưa
 * thì bỏ cả năm-tháng đó (không coi thiếu là 0). Trả kèm số ngày thiếu để báo.
 */
export function aggregateMonthly(time: string[], precip: (number | null)[], tmean: (number | null)[], tmin: (number | null)[], rhmin: (number | null)[]) {
  type Acc = { n: number; rain: number; d20: number; d50: number; d100: number; r3: boolean; retDam: number; retHai: number; frost: number; humid: number; tm: number[]; tn: number[]; nT: number; nRh: number };
  const ym = new Map<string, Acc>();
  let missingDays = 0;
  for (let i = 0; i < time.length; i++) {
    const key = time[i].slice(0, 7);
    let a = ym.get(key);
    if (!a) { a = { n: 0, rain: 0, d20: 0, d50: 0, d100: 0, r3: false, retDam: 0, retHai: 0, frost: 0, humid: 0, tm: [], tn: [], nT: 0, nRh: 0 }; ym.set(key, a); }
    const p = precip[i];
    if (!ok(p)) { missingDays++; continue; }
    a.n++; a.rain += p;
    if (p >= CTH.R_NOTE) a.d20++;
    if (p >= CTH.R_HARD) a.d50++;
    if (p >= CTH.R_DANGER) a.d100++;
    // đợt 3 ngày kết thúc hôm nay (cả 3 ngày phải có số), tính cho tháng của ngày kết thúc
    if (i >= 2 && ok(precip[i - 1]) && ok(precip[i - 2]) && p + precip[i - 1]! + precip[i - 2]! >= CTH.R3_SLIDE) a.r3 = true;
    const t = tmean[i], tn = tmin[i], rh = rhmin[i];
    if (ok(t)) { a.tm.push(t); a.nT++; if (t <= CTH.RET_DAM) a.retDam++; if (t <= CTH.RET_HAI) a.retHai++; }
    if (ok(tn)) { a.tn.push(tn); if (tn <= CTH.FROST) a.frost++; }
    if (ok(rh)) { a.nRh++; if (rh >= CTH.HUMID_ALLDAY) a.humid++; }
  }
  const months: MonthStat[] = [];
  for (let m = 1; m <= 12; m++) {
    const accs = [...ym.entries()].filter(([k, a]) => +k.slice(5, 7) === m && a.n >= CTH.MIN_DAYS).map(([, a]) => a);
    const n = accs.length;
    const mean = (f: (a: Acc) => number, need: (a: Acc) => boolean = () => true) => {
      const xs = accs.filter(need); return xs.length ? r1(xs.reduce((s, a) => s + f(a), 0) / xs.length) : null;
    };
    const hasT = (a: Acc) => a.nT >= CTH.MIN_DAYS, hasRh = (a: Acc) => a.nRh >= CTH.MIN_DAYS;
    const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
    months.push({
      years: n,
      rainMm: n ? Math.round(accs.reduce((s, a) => s + a.rain, 0) / n) : null,
      d20: mean(a => a.d20), d50: mean(a => a.d50), d100: mean(a => a.d100),
      r3Years: n ? accs.filter(a => a.r3).length : null,
      retDam: mean(a => a.retDam, hasT), retHai: mean(a => a.retHai, hasT),
      frost: mean(a => a.frost, a => a.tn.length >= CTH.MIN_DAYS),
      humid: mean(a => a.humid, hasRh),
      tMean: mean(a => avg(a.tm), hasT), tMin: mean(a => avg(a.tn), a => a.tn.length >= CTH.MIN_DAYS),
    });
  }
  return { months, missingDays };
}

// ---------------------------------------------------------------- mùa biển mây từ nhãn quan sát

export interface SeaMonth { n: number; sea: number; bySrc: Record<string, number> }
/** Cỡ mẫu tối thiểu để nói "tháng này hay có biển mây": dưới mức này chỉ ghi "chưa đủ mẫu". Chốt trước, không chỉnh theo kết quả. */
export const SEA_MIN_N = 5;
export interface SeaLabel { date: string; key: string; sea: boolean; src: 'người đi' | 'facebook' | 'vệ tinh' }
/** Đếm theo điểm x tháng: mỗi (ngày, điểm) một nhãn, nguồn tin hơn đè nguồn kém (người đi > facebook > vệ tinh). */
export function seaSeason(labels: SeaLabel[]): Record<string, SeaMonth[]> {
  const rank = { 'vệ tinh': 0, 'facebook': 1, 'người đi': 2 } as const;
  const best = new Map<string, SeaLabel>();
  for (const l of labels) {
    const k = l.date + '|' + l.key, o = best.get(k);
    if (!o || rank[l.src] >= rank[o.src]) best.set(k, l);
  }
  const out: Record<string, SeaMonth[]> = {};
  for (const l of best.values()) {
    const arr = out[l.key] ||= Array.from({ length: 12 }, () => ({ n: 0, sea: 0, bySrc: {} }));
    const m = arr[+l.date.slice(5, 7) - 1];
    m.n++; if (l.sea) m.sea++;
    m.bySrc[l.src] = (m.bySrc[l.src] || 0) + 1;
  }
  return out;
}

// ---------------------------------------------------------------- đọc tệp tĩnh + tra cứu

export interface ClimateLoc { id: string; lat: number; lon: number; elev: number; kind: 'spot' | 'route'; label: string; months: MonthStat[] }
export interface ClimateFile {
  version: string; generatedAt: string; source: string; years: { from: number; to: number };
  thresholds: typeof CTH;
  locations: Record<string, ClimateLoc>;
  /** khoá điểm thư viện -> id vị trí khí hậu */
  spots: Record<string, string>;
  /** id tuyến cố định -> các mốc */
  routes: Record<string, { km: number; loc: string }[]>;
  sea: { note: string; minN: number; dateRange: [string, string] | null; bySpot: Record<string, SeaMonth[]> };
  missing: { id: string; label: string; reason: string }[];
}

let cache: Promise<ClimateFile | null> | null = null;
/** Tải lười một lần. Hỏng thì trả null và lần sau thử lại (không nhớ lỗi). */
export function loadClimate(base = (import.meta as any).env?.BASE_URL || '/'): Promise<ClimateFile | null> {
  if (!cache) {
    cache = fetch(`${base}climate/monthly-v1.json`).then(r => (r.ok ? r.json() : null)).catch(() => null)
      .then(d => { if (!d) cache = null; return d; });
  }
  return cache;
}

/** Vị trí khí hậu gần nhất trong maxKm; null nếu không có. */
export function nearestLoc(c: ClimateFile, p: LatLon, maxKm = 30): { loc: ClimateLoc; km: number } | null {
  let best: { loc: ClimateLoc; km: number } | null = null;
  for (const loc of Object.values(c.locations)) {
    const km = haversineKm(p, loc);
    if (km <= maxKm && (!best || km < best.km)) best = { loc, km };
  }
  return best;
}

/** Vị trí khí hậu cho điểm thư viện: đúng điểm nếu có, không thì gần nhất (xấp xỉ). */
export function spotClimate(c: ClimateFile, key: string, p: LatLon): { loc: ClimateLoc; km: number; exact: boolean } | null {
  const id = c.spots[key];
  if (id && c.locations[id]) return { loc: c.locations[id], km: 0, exact: true };
  const n = nearestLoc(c, p);
  return n ? { ...n, exact: false } : null;
}

export interface RouteClimateRow { what: string; value: number; unit: string; km: number; elev: number | null; locKm: number }
export interface RouteClimate {
  month: number; matched: number; total: number; maxLocKm: number;
  rainMax: RouteClimateRow | null; d50: RouteClimateRow | null; r3: RouteClimateRow | null;
  retDam: RouteClimateRow | null; frost: RouteClimateRow | null; humid: RouteClimateRow | null;
  coldest: RouteClimateRow | null;
}
/**
 * Khí hậu tháng `month` (1-12) dọc tuyến: mỗi điểm mẫu lấy vị trí khí hậu gần nhất trong 30 km; mỗi chỉ số lấy
 * nơi NẶNG nhất trên tuyến (để người đi chuẩn bị cho đoạn khó nhất), kèm km và khoảng cách tới mốc.
 */
export function routeClimate(c: ClimateFile, samples: { km: number; pos: LatLon; elev: number | null }[], month: number): RouteClimate {
  const hits = samples.map(s => ({ s, n: nearestLoc(c, s.pos) })).filter(x => x.n && x.n.loc.months[month - 1]?.years);
  const pick = (f: (m: MonthStat) => number | null, what: string, unit: string, lowest = false): RouteClimateRow | null => {
    let best: RouteClimateRow | null = null;
    for (const { s, n } of hits) {
      const v = f(n!.loc.months[month - 1]);
      if (v === null) continue;
      if (!best || (lowest ? v < best.value : v > best.value)) best = { what, value: v, unit, km: s.km, elev: s.elev, locKm: n!.km };
    }
    return best;
  };
  return {
    month, matched: hits.length, total: samples.length, maxLocKm: hits.reduce((m, x) => Math.max(m, x.n!.km), 0),
    rainMax: pick(m => m.rainMm, 'Mưa cả tháng', 'mm'),
    d50: pick(m => m.d50, `Ngày mưa to >= ${CTH.R_HARD} mm`, 'ngày'),
    r3: pick(m => m.r3Years, `Năm có đợt 3 ngày >= ${CTH.R3_SLIDE} mm`, 'năm'),
    retDam: pick(m => m.retDam, `Ngày rét đậm (TB ngày <= ${CTH.RET_DAM}°C)`, 'ngày'),
    frost: pick(m => m.frost, `Đêm <= ${CTH.FROST}°C (có thể băng giá)`, 'ngày'),
    humid: pick(m => m.humid, `Ngày ẩm suốt ngày (thấp nhất >= ${CTH.HUMID_ALLDAY}%)`, 'ngày'),
    coldest: pick(m => m.tMin, 'Đêm trung bình lạnh nhất', '°C', true),
  };
}

/** Một câu "Tháng X ở đây thường..." cho Tóm tắt ngày. */
export function monthSentence(m: MonthStat, month: number): string {
  if (!m.years) return `Chưa có số khí hậu tháng ${month} cho chỗ này.`;
  const parts: string[] = [];
  if (m.rainMm !== null) parts.push(`mưa ~${m.rainMm} mm cả tháng`);
  if (m.d20 !== null) parts.push(`${m.d20} ngày mưa >= ${CTH.R_NOTE} mm`);
  if (m.d50 !== null && m.d50 >= 0.1) parts.push(`${m.d50} ngày mưa to >= ${CTH.R_HARD} mm`);
  if (m.tMean !== null) parts.push(`nhiệt độ TB ${m.tMean}°C, đêm ~${m.tMin}°C`);
  if (m.retDam !== null && m.retDam >= 0.5) parts.push(`${m.retDam} ngày rét đậm`);
  if (m.frost !== null && m.frost >= 0.5) parts.push(`${m.frost} đêm <= ${CTH.FROST}°C`);
  if (m.humid !== null && m.humid >= 0.5) parts.push(`${m.humid} ngày ẩm suốt ngày`);
  return `Tháng ${month} ở đây thường: ${parts.join(', ')}.`;
}

/** Câu mùa biển mây theo nhãn quan sát; nói thẳng khi mẫu nhỏ. */
export function seaSentence(c: ClimateFile, key: string, month: number): string {
  const s = c.sea.bySpot[key]?.[month - 1];
  if (!s || s.n === 0) return `Mùa biển mây: chưa có buổi sáng nào được quan sát tháng ${month} ở điểm này.`;
  if (s.n < c.sea.minN) return `Mùa biển mây: tháng ${month} mới có ${s.n} buổi sáng được quan sát, chưa đủ mẫu để nói.`;
  return `Mùa biển mây (nhãn quan sát, chỉ năm 2026): tháng ${month} có ${s.sea}/${s.n} buổi sáng có biển mây.`;
}
