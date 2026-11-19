/**
 * Dông dọc CUNG ĐƯỜNG theo nhiều mô hình (phiếu gcc29 vòng 6, 19/11/2026; định hướng số 1: độ khó thời tiết của cung đường).
 *
 * Là UI + bản chụp: KHÔNG tham gia điểm/trạng thái/đáng đi của engine biển mây, KHÔNG đổi luật `assessPoint`
 * (cờ "Dông, sét" cũ theo mã thời tiết của best_match vẫn giữ nguyên, ROUTE_RULES_VERSION không đổi).
 *
 * Dữ liệu: Open-Meteo forecast, 4 mô hình ECMWF IFS / GFS / ICON / UKMO (đo 19/11/2026: cả 4 trả `cape`; JMA không có
 * cape nên không dùng), biến `cape`, `weather_code`, `precipitation`, mọi điểm mẫu dọc tuyến trong 1 lần gọi.
 * Ngân sách: ~16 điểm x 4 mô hình x 1 (3 biến < 10) ~ 64 lượt quy đổi mỗi tuyến; chỉ tải khi người dùng mở khối.
 *
 * NGƯỠNG CÓ NGUỒN
 * - CAPE (J/kg): < 1000 bất ổn định yếu, 1000-2500 vừa, 2500-4000 mạnh, > 4000 cực mạnh. Nguồn: NWS (văn phòng
 *   Lincoln IL) https://www.weather.gov/ilx/swop-severetopics-CAPE và bảng tham số của SPC (bản lưu
 *   https://webarchive.library.unt.edu/eot2008/20080916110558/http://www.spc.noaa.gov/sfctest/help/sfcoa.html).
 *   Chính NWS ghi đây là thang trượt, tuỳ nơi tuỳ mùa, và "không có số ma thuật": CAPE cao chưa chắc có dông
 *   (cần cơ chế nâng), CAPE thấp vẫn có thể có dông. Nên CAPE chỉ là MỘT đầu vào.
 * - Mã thời tiết 95-99 (WMO 4677: 95 dông, 96/99 dông kèm mưa đá): mô hình tự báo dông tại giờ đó.
 * - Mưa giờ: dùng lại TH.RAIN_LIGHT (0,5 mm/h) của routeService.
 *
 * LUẬT GỘP = QUY ƯỚC CỦA APP (không có nguồn ngoài; chốt 19/11/2026 TRƯỚC khi nhìn số của bất kỳ tuyến nào):
 * - Cửa sổ: giờ đi qua điểm +- 1 giờ (3 giờ), vì giờ đi qua chỉ là ước theo tốc độ trung bình.
 * - Mô hình "dùng được" tại điểm = có ít nhất một số cape hoặc weather_code trong cửa sổ.
 * - HIGH  "Nguy cơ dông cao":   >= 2 mô hình báo mã 95-99 VÀ số đó >= nửa số mô hình dùng được.
 * - MED   "Có thể có dông":     >= 1 mô hình báo mã 95-99; HOẶC >= nửa số mô hình có CAPE >= 1000 kèm >= 1 mô hình mưa >= 0,5 mm/h.
 * - LOW   "Khí quyển bất ổn":   >= 1 mô hình có CAPE >= 1000 (chưa thấy mô hình nào báo dông hay mưa đi kèm).
 * - NONE  "Không thấy dấu hiệu dông".   NO_DATA: không mô hình nào dùng được (ngoài phạm vi dự báo / lỗi đọc).
 * Đừng chỉnh luật này theo kết quả chấm; muốn đổi thì đổi STORM_RULES_VERSION và chấm lại toàn bộ bản chụp.
 */
import { TH, getJson, fetchedAtOf, type RouteSample } from './routeService';

export const STORM_RULES_VERSION = 'storm-1.0';
export const STORM_MODELS = ['ecmwf_ifs025', 'gfs_seamless', 'icon_seamless', 'ukmo_seamless'] as const;
export const STORM_MODEL_LABEL: Record<string, string> = {
  ecmwf_ifs025: 'ECMWF', gfs_seamless: 'GFS', icon_seamless: 'ICON', ukmo_seamless: 'UKMO',
};
export const STORM_VARS = ['cape', 'weather_code', 'precipitation'] as const;
export const STH_STORM = {
  CAPE_EDGES: [1000, 2500, 4000],   // NWS/SPC: yếu | vừa | mạnh | cực mạnh
  THUNDER_MIN: 95, THUNDER_MAX: 99, // WMO 4677
  WINDOW_H: 1,                      // quy ước app: giờ đi qua +- 1 giờ
};
export const CAPE_LABEL = ['yếu', 'vừa', 'mạnh', 'cực mạnh'];
export function capeClass(c: number | null): string | null {
  if (c === null) return null;
  let i = 0;
  for (const e of STH_STORM.CAPE_EDGES) if (c >= e) i++;
  return CAPE_LABEL[i];
}

export type StormLevel = 'NONE' | 'LOW' | 'MED' | 'HIGH' | 'NO_DATA';
export const STORM_LABEL: Record<StormLevel, string> = {
  NONE: 'Không thấy dấu hiệu dông', LOW: 'Khí quyển bất ổn', MED: 'Có thể có dông', HIGH: 'Nguy cơ dông cao', NO_DATA: 'Chưa có dữ liệu',
};
export const STORM_RANK: Record<StormLevel, number> = { NO_DATA: -1, NONE: 0, LOW: 1, MED: 2, HIGH: 3 };

export interface ModelStorm { model: string; capeMax: number | null; thunder: boolean; rainMax: number | null }
export interface PointStorm {
  km: number; hourKey: string; level: StormLevel;
  usable: number; thunderModels: number; cape1000Models: number; rainModels: number;
  capeMax: number | null; rainMax: number | null; models: ModelStorm[];
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const maxOf = (xs: (number | null)[]) => { const v = xs.filter((x): x is number => x !== null); return v.length ? Math.max(...v) : null; };

/** Cộng/trừ `h` giờ trên khoá 'YYYY-MM-DDTHH:00' (giờ VN, không có giờ mùa hè nên cộng thẳng được). */
export function shiftHourKey(key: string, h: number): string {
  const ms = Date.parse(`${key}:00+07:00`) + h * 3600_000;
  return new Date(ms + 7 * 3600_000).toISOString().slice(0, 13) + ':00';
}

/** Luật gộp (xem đầu tệp). Thuần, test được. */
export function stormLevelOf(models: ModelStorm[], usable: number): StormLevel {
  if (usable === 0) return 'NO_DATA';
  const nT = models.filter(m => m.thunder).length;
  const nC = models.filter(m => m.capeMax !== null && m.capeMax >= STH_STORM.CAPE_EDGES[0]).length;
  const nR = models.filter(m => m.rainMax !== null && m.rainMax >= TH.RAIN_LIGHT).length;
  if (nT >= 2 && nT >= usable / 2) return 'HIGH';
  if (nT >= 1 || (nC >= usable / 2 && nR >= 1)) return 'MED';
  if (nC >= 1) return 'LOW';
  return 'NONE';
}

/** Đánh giá một điểm từ phần tử phản hồi đa mô hình (khoá có hậu tố `_<model>`). */
export function assessStormAt(om: any, hourKey: string, km = 0): PointStorm {
  const h = om?.hourly;
  const idx: number[] = [];
  if (h && Array.isArray(h.time)) {
    for (let d = -STH_STORM.WINDOW_H; d <= STH_STORM.WINDOW_H; d++) {
      const i = h.time.indexOf(shiftHourKey(hourKey, d));
      if (i >= 0) idx.push(i);
    }
  }
  let usable = 0;
  const models: ModelStorm[] = STORM_MODELS.map(m => {
    const cape = idx.map(i => num(h?.[`cape_${m}`]?.[i]));
    const wmo = idx.map(i => num(h?.[`weather_code_${m}`]?.[i]));
    const rain = idx.map(i => num(h?.[`precipitation_${m}`]?.[i]));
    if (cape.some(x => x !== null) || wmo.some(x => x !== null)) usable++;
    return {
      model: m, capeMax: maxOf(cape), rainMax: maxOf(rain),
      thunder: wmo.some(w => w !== null && w >= STH_STORM.THUNDER_MIN && w <= STH_STORM.THUNDER_MAX),
    };
  });
  return {
    km, hourKey, level: stormLevelOf(models, usable), usable,
    thunderModels: models.filter(m => m.thunder).length,
    cape1000Models: models.filter(m => m.capeMax !== null && m.capeMax >= STH_STORM.CAPE_EDGES[0]).length,
    rainModels: models.filter(m => m.rainMax !== null && m.rainMax >= TH.RAIN_LIGHT).length,
    capeMax: maxOf(models.map(m => m.capeMax)), rainMax: maxOf(models.map(m => m.rainMax)), models,
  };
}

export interface StormSegment { fromKm: number; toKm: number; fromHour: string; toHour: string; level: StormLevel; maxThunder: number; capeMax: number | null }
/** Gom các điểm liền nhau cùng mức thành một đoạn đường. */
export function stormSegments(pts: PointStorm[]): StormSegment[] {
  const out: StormSegment[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (last && last.level === p.level) {
      last.toKm = p.km; last.toHour = p.hourKey;
      last.maxThunder = Math.max(last.maxThunder, p.thunderModels);
      last.capeMax = maxOf([last.capeMax, p.capeMax]);
    } else out.push({ fromKm: p.km, toKm: p.km, fromHour: p.hourKey, toHour: p.hourKey, level: p.level, maxThunder: p.thunderModels, capeMax: p.capeMax });
  }
  return out;
}
export const worstStorm = (pts: PointStorm[]): StormLevel =>
  pts.reduce<StormLevel>((w, p) => (STORM_RANK[p.level] > STORM_RANK[w] ? p.level : w), 'NO_DATA');

// ---------------------------------------------------------------- gọi mạng

export function stormUrl(pts: { pos: { lat: number; lon: number }; elev: number | null }[], models: readonly string[] = STORM_MODELS): string {
  const f = (x: number) => x.toFixed(4);
  const elev = pts.every(p => p.elev !== null) ? `&elevation=${pts.map(p => Math.round(p.elev as number)).join(',')}` : '';
  return 'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${pts.map(p => f(p.pos.lat)).join(',')}&longitude=${pts.map(p => f(p.pos.lon)).join(',')}${elev}` +
    `&hourly=${STORM_VARS.join(',')}&models=${models.join(',')}&timezone=Asia%2FHo_Chi_Minh&forecast_days=7`;
}

/** Gọi riêng một mô hình thì khoá KHÔNG có hậu tố (đo 19/11 với Previous Runs, cùng cơ chế): thêm hậu tố cho đồng dạng. */
export function suffixModel(om: any, model: string): any {
  const h = om?.hourly;
  if (!h?.time) return null;
  const hourly: any = { time: h.time };
  for (const [k, v] of Object.entries(h)) if (k !== 'time') hourly[k.endsWith(`_${model}`) ? k : `${k}_${model}`] = v;
  return { hourly };
}
/** Ghép nhiều phản hồi một-mô-hình của CÙNG một điểm; trục giờ lệch thì bỏ phần lệch. */
export function mergeModels(parts: any[]): any {
  const ok = parts.filter(p => p?.hourly?.time);
  if (!ok.length) return null;
  const hourly: any = { time: ok[0].hourly.time };
  for (const p of ok) {
    if (p.hourly.time.join() !== hourly.time.join()) continue;
    for (const [k, v] of Object.entries(p.hourly)) if (k !== 'time') hourly[k] = v;
  }
  return { hourly };
}

const asList = (x: any) => (Array.isArray(x) ? x : [x]);

/**
 * Tải dông cho các điểm mẫu của tuyến. Gói gộp hỏng (HTTP 500 từng gặp với Previous Runs) thì gọi riêng từng mô hình;
 * mô hình nào vẫn hỏng thì ghi vào missingModels; hỏng hết thì ném lỗi gốc.
 */
export async function fetchRouteStorm(samples: Pick<RouteSample, 'km' | 'pos' | 'elev' | 'hourKey'>[]): Promise<{ points: PointStorm[]; fetchedAt: number; missingModels: string[] }> {
  const url = stormUrl(samples);
  let oms: any[]; let fetchedAt: number; let missing: string[] = [];
  try {
    oms = asList(await getJson(url, 30 * 60_000));
    fetchedAt = fetchedAtOf(url) ?? Date.now();
  } catch (first) {
    const got = await Promise.allSettled(STORM_MODELS.map(async m => {
      const u = stormUrl(samples, [m]);
      return { model: m, list: asList(await getJson(u, 30 * 60_000)), at: fetchedAtOf(u) ?? Date.now() };
    }));
    const ok = got.flatMap(g => (g.status === 'fulfilled' ? [g.value] : []));
    if (!ok.length) throw first;
    missing = STORM_MODELS.filter(m => !ok.some(x => x.model === m));
    oms = samples.map((_, i) => mergeModels(ok.map(x => suffixModel(x.list[i], x.model))));
    fetchedAt = Math.min(...ok.map(x => x.at));
  }
  return { points: samples.map((s, i) => assessStormAt(oms[i], s.hourKey, s.km)), fetchedAt, missingModels: missing };
}

/** Dạng gọn ghi vào bản chụp tối (scripts/snapshot-routes.ts). */
export function compactStorm(r: { points: PointStorm[]; fetchedAt: number; missingModels: string[] }) {
  return {
    rulesVersion: STORM_RULES_VERSION, fetchedAt: new Date(r.fetchedAt).toISOString(), missingModels: r.missingModels,
    worst: worstStorm(r.points),
    segments: stormSegments(r.points).map(s => ({ ...s, fromKm: Math.round(s.fromKm), toKm: Math.round(s.toKm) })),
    points: r.points.map(p => ({
      km: Math.round(p.km), hour: p.hourKey, level: p.level, usable: p.usable, thunder: p.thunderModels,
      cape: p.models.map(m => m.capeMax), rain: p.models.map(m => m.rainMax),
    })),
  };
}
