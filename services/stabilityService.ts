/**
 * Độ ổn định dự báo 3-5 ngày tới tại điểm đích (phiếu gcc29 vòng 5, phương án 2).
 *
 * Câu hỏi cho dân phượt: "dự báo cho ngày mình đi có đang đổi qua mỗi lần chạy không?" Nếu ba lần chạy gần nhất
 * của cùng một mô hình (nay, 1 ngày trước, 2 ngày trước) cho cùng một giờ mà rơi vào các LỚP khác nhau, thì dự báo
 * cho ngày đó chưa chắc, nên chờ thêm rồi mới chốt. Chỉ HIỂN THỊ: không tham gia điểm, trạng thái hay luật đáng đi.
 *
 * Nguồn: Open-Meteo Previous Runs API (previous-runs-api.open-meteo.com). Theo tài liệu, `<var>_previous_dayN` = giá trị
 * dự báo N x 24 giờ TRƯỚC GIỜ HIỆU LỰC (không phải "lần chạy N ngày trước tính từ hôm nay"). Đo 19/11/2026 14h, ECMWF
 * Tà Xùa 22/11 06h: day0..day3 = 30, 30, 30, 30 rồi day4 = 51, day5 = 56: cột có N nhỏ hơn số ngày còn lại tới giờ đó chỉ
 * chép lần chạy mới nhất. Vì vậy với một giờ T còn L ngày nữa (L = trần((T - lúc tải)/24h), tối thiểu 0) thì lần chạy
 * "cũ hơn khoảng 1 ngày" là cột N = L+1, "cũ hơn khoảng 2 ngày" là N = L+2 (mỗi cột chắc chắn cũ hơn lúc tải >= 24h,
 * >= 48h). N tối đa 7, nên ngày càng xa càng ít lần chạy để so (đúng tầm 3-5 ngày). Cũng đo 19/11/2026: chỉ endpoint này trả số (api.open-meteo.com trả null);
 * có số cho `cloud_cover` (tổng mây) và `precipitation`, còn `cloud_cover_low/mid` toàn null nên KHÔNG dùng mây
 * thấp; mô hình có số: ECMWF IFS, GFS, ICON, UKMO (UKMO hết sớm, ~6 ngày). Một lần gọi: 1 vị trí x 6 biến x 4 mô
 * hình (8 cột mỗi biến), khoảng 6-7 lượt quy đổi; đệm 60 phút.
 *
 * Lớp (ranh giới có nguồn):
 *  - Mưa cả ngày (0-23h giờ VN): < 1 mm "khô" (ngưỡng "ngày có mưa" của WMO/ETCCDI, chỉ số R1mm);
 *    1-20 mm; 20-50 mm; >= 50 mm (TH.R24_NOTE / TH.R24_HARD trong routeService, thang mưa KTTV).
 *  - Tổng mây lúc rạng sáng 05-07h (trung bình 3 giờ) theo okta của WMO (1 okta = 12,5%):
 *    <= 25% (<= 2 okta, trời quang/ít mây), 25-75% (3-5 okta, mây rải rác/nhiều), >= 75% (>= 6 okta, gần kín).
 *    Đây là TỔNG MÂY tại chỗ, không phải biển mây.
 * Luật gộp (QUY ƯỚC CỦA APP, không có nguồn ngoài; chốt trước, không chỉnh theo kết quả):
 *  - mỗi mô hình cần >= 2 lần chạy có số cho ngày đó, ít hơn thì không tính mô hình đó;
 *  - "đổi lớp" = các lần chạy của mô hình đó không cùng một lớp;
 *  - không mô hình nào đổi lớp -> "ổn định"; số mô hình đổi lớp >= một nửa số mô hình tính được -> "đang dao động";
 *    còn lại -> "hơi dao động"; không mô hình nào tính được -> "chưa đủ lần chạy".
 */
import { getJson, fetchedAtOf, TH } from './routeService';

export const STABILITY_MODELS = ['ecmwf_ifs025', 'gfs_seamless', 'icon_seamless', 'ukmo_seamless'] as const;
export const STABILITY_MODEL_LABEL: Record<string, string> = {
  ecmwf_ifs025: 'ECMWF', gfs_seamless: 'GFS', icon_seamless: 'ICON', ukmo_seamless: 'UKMO',
};
export const MAX_PREV_DAY = 7;
/** Cột của lần chạy cũ hơn `k` ngày (k = 0 là mới nhất) cho một giờ còn `leadDays` ngày nữa. null nếu vượt day7. */
export function prevColumn(k: number, leadDays: number): string | null {
  if (k === 0) return '';
  const n = leadDays + k;
  return n <= MAX_PREV_DAY ? `_previous_day${n}` : null;
}
export const RUN_LABEL = ['mới nhất', 'cũ hơn ~1 ngày', 'cũ hơn ~2 ngày'];
export function leadDaysOf(time: string, nowMs: number): number {
  const t = new Date(time + ':00+07:00').getTime();
  return Math.max(0, Math.ceil((t - nowMs) / 86_400_000));
}

export const STH = {
  WET_DAY_MM: 1,                 // WMO/ETCCDI: ngày có mưa >= 1 mm
  RAIN_EDGES: [1, TH.R24_NOTE, TH.R24_HARD] as number[],
  RAIN_LABEL: ['khô (< 1 mm)', `1-${TH.R24_NOTE} mm`, `${TH.R24_NOTE}-${TH.R24_HARD} mm`, `>= ${TH.R24_HARD} mm`],
  CLOUD_EDGES: [25, 75] as number[],   // 2 okta, 6 okta
  CLOUD_LABEL: ['quang (<= 2 okta)', 'mây vừa (3-5 okta)', 'gần kín (>= 6 okta)'],
  DAWN_HOURS: ['05', '06', '07'],
};

export type StabVerdict = 'STABLE' | 'SLIGHT' | 'SHIFTING' | 'NO_DATA';
export const STAB_LABEL: Record<StabVerdict, string> = {
  STABLE: 'ổn định', SLIGHT: 'hơi dao động', SHIFTING: 'đang dao động', NO_DATA: 'chưa đủ lần chạy',
};
export interface ModelRuns { model: string; classes: (number | null)[]; values: (number | null)[] }
export interface Indicator { verdict: StabVerdict; usable: number; changed: number; models: ModelRuns[] }
export interface DayStability { date: string; rain: Indicator; dawnCloud: Indicator }

export function classOf(v: number | null, edges: number[]): number | null {
  if (v === null || !Number.isFinite(v)) return null;
  let c = 0;
  for (const e of edges) if (v >= e) c++;
  return c;
}

export function verdictOf(models: ModelRuns[]): Pick<Indicator, 'verdict' | 'usable' | 'changed'> {
  let usable = 0, changed = 0;
  for (const m of models) {
    const cs = m.classes.filter((c): c is number => c !== null);
    if (cs.length < 2) continue;
    usable++;
    if (new Set(cs).size > 1) changed++;
  }
  const verdict: StabVerdict = usable === 0 ? 'NO_DATA' : changed === 0 ? 'STABLE' : changed * 2 >= usable ? 'SHIFTING' : 'SLIGHT';
  return { verdict, usable, changed };
}

/** Giá trị một biến theo lần chạy k tại chỉ số giờ i (đã chọn đúng cột theo số ngày còn lại). */
function runValue(h: any, v: string, m: string, k: number, time: string, i: number, nowMs: number): number | null {
  const col = prevColumn(k, leadDaysOf(time, nowMs));
  if (col === null) return null;
  const x = h?.[`${v}${col}_${m}`]?.[i];
  return x === null || x === undefined || !Number.isFinite(x) ? null : x;
}
/** Tổng mưa một ngày theo một lần chạy; thiếu bất kỳ giờ nào thì null (không coi thiếu là 0). */
function dayRain(h: any, m: string, k: number, date: string, nowMs: number): number | null {
  const times: string[] = h?.time ?? [];
  let sum = 0, n = 0;
  for (let i = 0; i < times.length; i++) {
    if (!times[i].startsWith(date)) continue;
    const x = runValue(h, 'precipitation', m, k, times[i], i, nowMs);
    if (x === null) return null;
    sum += x; n++;
  }
  return n === 24 ? Math.round(sum * 10) / 10 : null;
}
function dawnMean(h: any, m: string, k: number, date: string, nowMs: number): number | null {
  const times: string[] = h?.time ?? [];
  const xs: number[] = [];
  for (const hh of STH.DAWN_HOURS) {
    const time = `${date}T${hh}:00`;
    const i = times.indexOf(time);
    const x = i >= 0 ? runValue(h, 'cloud_cover', m, k, time, i, nowMs) : null;
    if (x === null) return null;
    xs.push(x);
  }
  return Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
}

/**
 * Tính độ ổn định từng ngày từ phản hồi Previous Runs API (đa mô hình). Hàm thuần, test bằng dữ liệu mẫu.
 * `nowMs` = lúc tải dữ liệu (để chọn đúng cột lần chạy cũ).
 */
export function assessStability(om: any, dates: string[], nowMs: number): DayStability[] {
  const h = om?.hourly;
  return dates.map(date => {
    const rainModels: ModelRuns[] = [], cloudModels: ModelRuns[] = [];
    for (const m of STABILITY_MODELS) {
      const rv = [0, 1, 2].map(k => dayRain(h, m, k, date, nowMs));
      const cv = [0, 1, 2].map(k => dawnMean(h, m, k, date, nowMs));
      rainModels.push({ model: m, values: rv, classes: rv.map(v => classOf(v, STH.RAIN_EDGES)) });
      cloudModels.push({ model: m, values: cv, classes: cv.map(v => classOf(v, STH.CLOUD_EDGES)) });
    }
    return {
      date,
      rain: { ...verdictOf(rainModels), models: rainModels },
      dawnCloud: { ...verdictOf(cloudModels), models: cloudModels },
    };
  });
}

export function stabilityUrl(lat: number, lon: number, elev: number | null, models: readonly string[] = STABILITY_MODELS): string {
  const cols = [''].concat(Array.from({ length: MAX_PREV_DAY }, (_, i) => `_previous_day${i + 1}`));
  const vars = ['cloud_cover', 'precipitation'].flatMap(v => cols.map(c => v + c));
  return `https://previous-runs-api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
    (elev !== null ? `&elevation=${Math.round(elev)}` : '') +
    `&hourly=${vars.join(',')}&models=${models.join(',')}&timezone=Asia%2FHo_Chi_Minh&forecast_days=7`;
}

/**
 * Ghép phản hồi gọi riêng từng mô hình thành một phản hồi đa mô hình. Gọi riêng thì Open-Meteo đặt tên khoá KHÔNG
 * có hậu tố mô hình, nên thêm `_<model>` vào. Mô hình lỗi thì bỏ qua (thiếu, không bịa).
 */
export function mergePerModel(parts: { model: string; om: any }[]): any {
  const hourly: any = {};
  for (const { model, om } of parts) {
    const h = om?.hourly;
    if (!h?.time) continue;
    if (!hourly.time) hourly.time = h.time;
    else if (hourly.time.join() !== h.time.join()) continue;   // trục giờ lệch thì không ghép
    for (const [k, v] of Object.entries(h)) {
      if (k === 'time') continue;
      hourly[k.endsWith(`_${model}`) ? k : `${k}_${model}`] = v;
    }
  }
  return hourly.time ? { hourly } : null;
}

/**
 * Trả dữ liệu kèm lúc tải (lúc tải thật, kể cả khi lấy từ đệm 60 phút). Đo 19/11/2026 15:11: một lần gói gộp 4 mô hình
 * bị HTTP 500 sau 32 giây, gọi lại vài phút sau thì 1,4 giây. Gộp hỏng thì gọi riêng từng mô hình rồi ghép;
 * mô hình nào vẫn hỏng thì thiếu mô hình đó; hỏng hết thì báo lỗi gốc.
 */
export async function fetchStability(lat: number, lon: number, elev: number | null): Promise<{ om: any; fetchedAt: number; missingModels: string[] }> {
  const url = stabilityUrl(lat, lon, elev);
  try {
    const om = await getJson(url, 60 * 60_000);
    return { om, fetchedAt: fetchedAtOf(url) ?? Date.now(), missingModels: [] };
  } catch (first) {
    const got = await Promise.allSettled(STABILITY_MODELS.map(async m => {
      const u = stabilityUrl(lat, lon, elev, [m]);
      return { model: m, om: await getJson(u, 60 * 60_000), at: fetchedAtOf(u) ?? Date.now() };
    }));
    const ok = got.flatMap(g => (g.status === 'fulfilled' ? [g.value] : []));
    const om = mergePerModel(ok);
    if (!om) throw first;
    return {
      om, fetchedAt: Math.min(...ok.map(x => x.at)),
      missingModels: STABILITY_MODELS.filter(m => !ok.some(x => x.model === m)),
    };
  }
}
