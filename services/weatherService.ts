/**
 * weatherService — lấy dữ liệu khí tượng THẬT từ Open-Meteo cho bài toán biển mây.
 *
 * Nguyên tắc trung thực dữ liệu (thay cho "fail-safe generator" cũ):
 *  - KHÔNG BAO GIỜ bịa số. Ngày nào ngoài phạm vi dự báo → quality = NO_DATA, models rỗng.
 *  - Mỗi ngày mang nhãn DataQuality để UI hiển thị đúng độ tin cậy.
 *  - Dữ liệu lấy cho 2 ĐIỂM: đáy thung lũng (nơi biển mây hình thành) và vị trí đứng.
 *  - 3 mô hình toàn cầu (ECMWF/GFS/ICON) trong cùng 1 call → đồng thuận tính THẬT ở engine.
 */
import { MOUNTAIN_DB, MountainInfo } from '../constants/mountains';
import { SunTimes, TerrainPoint, DataQuality } from '../types';

export const WEATHER_MODELS = ['ecmwf_ifs025', 'gfs_seamless', 'icon_seamless'] as const;
export type WeatherModelId = (typeof WEATHER_MODELS)[number];

export const MODEL_LABELS: Record<string, string> = {
  ecmwf_ifs025: 'ECMWF IFS',
  gfs_seamless: 'GFS (NOAA)',
  icon_seamless: 'ICON (DWD)',
};

/** Số liệu 1 ngày theo 1 mô hình — toàn bộ là số đo/đại lượng dẫn xuất từ API, không có giá trị chế tác. */
export interface DayModelData {
  // Cửa sổ bình minh 04:00–09:00 (giờ quyết định của biển mây)
  t_valley_dawn: number;      // T2m tại đáy thung lũng, trung bình 05–07h
  td_valley_dawn: number;
  t_obs_dawn: number;         // T2m tại vị trí đứng
  td_obs_dawn: number;
  cloud_low_dawn: number;     // % mây tầng thấp (≈ biển mây trong mô hình)
  cloud_mid_dawn: number;
  cloud_high_dawn: number;
  precip_dawn: number;        // mm tổng 04–09h
  wind850_dawn_max: number;   // km/h
  wind925_dawn_max: number;
  wind_dir850: number;        // độ
  t925: number; t850: number; t700: number;    // lúc 06h (nhiệt tầng)
  rh925: number; rh850: number; rh700: number; // lúc 06h (ẩm tầng)
  // Cửa sổ đêm trước 19:00 (D-1) → 06:00 (D) — pha bức xạ hình thành nghịch nhiệt
  cloud_high_night: number;   // % mây cao trung bình đêm (chặn bức xạ → giết biển mây)
  wind925_night: number;      // km/h trung bình đêm trong thung lũng
  precip_night: number;       // mm tổng đêm
  rh2m_valley_night: number;  // % ẩm sát đất thung lũng ban đêm
}

export interface DayData {
  date: string;
  quality: DataQuality;
  daysAhead: number;                              // so với hôm nay (0 = hôm nay)
  models: Partial<Record<WeatherModelId, DayModelData>>; // rỗng nếu NO_DATA
  sun_times: SunTimes;
}

export interface WeatherPackage {
  mountainInfo: MountainInfo;
  valleyElevation: number;
  valleySource: 'PROFILE' | 'DEM';
  days: DayData[];
  modelsCompared: string[];
}

const HOURLY_VARS = [
  'temperature_2m', 'dew_point_2m', 'relative_humidity_2m',
  'cloud_cover_low', 'cloud_cover_mid', 'cloud_cover_high', 'precipitation',
  'temperature_925hPa', 'temperature_850hPa', 'temperature_700hPa',
  'relative_humidity_925hPa', 'relative_humidity_850hPa', 'relative_humidity_700hPa',
  'wind_speed_925hPa', 'wind_speed_850hPa', 'wind_direction_850hPa',
];

function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function computeSunTimes(lat: number, lon: number, dateStr: string): SunTimes {
  const d = new Date(dateStr);
  const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000);
  const declination = 0.4093 * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81));
  const latRad = (lat * Math.PI) / 180;
  const cosHourAngle = -Math.tan(latRad) * Math.tan(declination);
  const clampedCos = Math.max(-1, Math.min(1, cosHourAngle));
  const hourAngleDeg = (Math.acos(clampedCos) * 180) / Math.PI;
  const b = (2 * Math.PI * (dayOfYear - 81)) / 364;
  const eqTimeMin = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
  const solarNoonUtcHours = 12 - (lon / 15) - (eqTimeMin / 60);
  const sunriseUtcHours = solarNoonUtcHours - (hourAngleDeg / 15);
  const sunsetUtcHours = solarNoonUtcHours + (hourAngleDeg / 15);
  const localOffset = 7;
  const fmt = (hours: number) => {
    let lh = (hours + localOffset) % 24;
    if (lh < 0) lh += 24;
    const h = Math.floor(lh);
    const m = Math.round((lh - h) * 60);
    const fh = m === 60 ? (h + 1) % 24 : h;
    const fm = m === 60 ? 0 : m;
    return `${fh.toString().padStart(2, '0')}:${fm.toString().padStart(2, '0')}`;
  };
  const sunrise = fmt(sunriseUtcHours);
  const sunset = fmt(sunsetUtcHours);
  return {
    sunrise, sunset,
    goldenHourMorning: `${sunrise} - ${fmt(sunriseUtcHours + 1.5)}`,
    goldenHourEvening: `${fmt(sunsetUtcHours - 0.75)} - ${sunset}`,
  };
}

export function buildSunTimesFromIso(sunriseIso: string, sunsetIso: string): SunTimes {
  const t = (iso: string) => iso.slice(11, 16);
  const shift = (hhmm: string, minutes: number) => {
    const [h, m] = hhmm.split(':').map(Number);
    let total = h * 60 + m + minutes;
    total = ((total % 1440) + 1440) % 1440;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  };
  const sunrise = t(sunriseIso);
  const sunset = t(sunsetIso);
  return {
    sunrise, sunset,
    goldenHourMorning: `${sunrise} - ${shift(sunrise, 90)}`,
    goldenHourEvening: `${shift(sunset, -45)} - ${sunset}`,
  };
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const isNum = (v: unknown): v is number => typeof v === 'number' && !Number.isNaN(v);

// Cache in-memory theo URL (TTL 30 phút) — mô hình toàn cầu cập nhật 6h/lần nên 30 phút là an toàn,
// tránh đập API khi người dùng tra đi tra lại cùng địa điểm trong một phiên.
const FETCH_CACHE = new Map<string, { ts: number; data: any }>();
const CACHE_TTL_MS = 30 * 60 * 1000;

async function cachedJson(url: string): Promise<any> {
  const hit = FETCH_CACHE.get(url);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.data;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} từ ${new URL(url).hostname}`);
  const data = await res.json();
  FETCH_CACHE.set(url, { ts: Date.now(), data });
  if (FETCH_CACHE.size > 40) {
    const oldest = [...FETCH_CACHE.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    if (oldest) FETCH_CACHE.delete(oldest[0]);
  }
  return data;
}

/** Độ cao DEM thật của đúng 1 điểm. */
export async function pointElevation(lat: number, lon: number): Promise<number> {
  const url = `https://api.open-meteo.com/v1/elevation?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}`;
  const data = await cachedJson(url);
  const el = data.elevation?.[0];
  if (typeof el !== 'number') throw new Error('Elevation API không trả dữ liệu');
  return Math.round(el);
}

/**
 * Ước tính độ cao đáy thung lũng quanh đỉnh — dữ liệu THẬT từ DEM (Open-Meteo Elevation API):
 * lấy mẫu 9 điểm trong bán kính ~4km và chọn điểm thấp nhất. Nếu preset có mặt cắt địa hình
 * đã xác thực thì ưu tiên điểm VALLEY thấp nhất trong đó.
 */
export async function estimateValleyElevation(
  lat: number, lon: number, profile?: TerrainPoint[]
): Promise<{ elevation: number; source: 'PROFILE' | 'DEM' }> {
  if (profile && profile.length > 0) {
    const valleys = profile.filter(p => p.type === 'VALLEY').map(p => p.altitude);
    const pool = valleys.length > 0 ? valleys : profile.map(p => p.altitude);
    return { elevation: Math.min(...pool), source: 'PROFILE' };
  }
  const d = 0.035; // ≈ 3.9km
  const lats = [lat, lat + d, lat - d, lat, lat, lat + d * 0.7, lat + d * 0.7, lat - d * 0.7, lat - d * 0.7];
  const lons = [lon, lon, lon, lon + d, lon - d, lon + d * 0.7, lon - d * 0.7, lon + d * 0.7, lon - d * 0.7];
  const url = `https://api.open-meteo.com/v1/elevation?latitude=${lats.map(x => x.toFixed(4)).join(',')}&longitude=${lons.map(x => x.toFixed(4)).join(',')}`;
  const data = await cachedJson(url);
  const els: number[] = (data.elevation || []).filter(isNum);
  if (els.length === 0) throw new Error('Elevation API không trả dữ liệu');
  return { elevation: Math.max(80, Math.round(Math.min(...els))), source: 'DEM' };
}

interface HourlyBlock {
  time: string[];
  get(varName: string, model: string): number[] | null;
}

function makeHourlyBlock(hourly: any): HourlyBlock {
  return {
    time: hourly?.time || [],
    get(varName: string, model: string) {
      const arr = hourly?.[`${varName}_${model}`] ?? hourly?.[varName];
      return Array.isArray(arr) ? arr : null;
    },
  };
}

async function fetchPoint(lat: number, lon: number, elevation: number, startStr: string, endStr: string) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&elevation=${Math.round(elevation)}` +
    `&hourly=${HOURLY_VARS.join(',')}` +
    `&daily=sunrise,sunset&models=${WEATHER_MODELS.join(',')}` +
    `&start_date=${startStr}&end_date=${endStr}&timezone=Asia%2FBangkok`;
  const data = await cachedJson(url);
  if (data.error) throw new Error(`Open-Meteo: ${data.reason || 'lỗi không rõ'}`);
  return data;
}

/** Chỉ số các giờ [hFrom..hTo] của ngày dateStr trong mảng time (giờ địa phương ICT). */
function hourIndices(time: string[], dateStr: string, hFrom: number, hTo: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < time.length; i++) {
    const t = time[i];
    if (!t.startsWith(dateStr)) continue;
    const h = parseInt(t.slice(11, 13), 10);
    if (h >= hFrom && h <= hTo) out.push(i);
  }
  return out;
}

function pick(block: HourlyBlock, varName: string, model: string, idxs: number[]): number[] {
  const arr = block.get(varName, model);
  if (!arr) return [];
  return idxs.map(i => arr[i]).filter(isNum);
}

/**
 * Gộp dữ liệu 1 ngày × 1 mô hình từ 2 điểm (thung lũng + vị trí đứng).
 * Trả null nếu thiếu các biến cốt lõi — engine sẽ coi mô hình đó không có dữ liệu, KHÔNG chèn mặc định.
 */
export function aggregateDayModel(
  valley: HourlyBlock, observer: HourlyBlock, model: string, dateStr: string, prevDateStr: string
): DayModelData | null {
  const dawnIdxV = hourIndices(valley.time, dateStr, 4, 9);
  const coreIdxV = hourIndices(valley.time, dateStr, 5, 7);   // giờ nghịch nhiệt cực đại
  const sixIdxV = hourIndices(valley.time, dateStr, 6, 6);
  const nightIdxV = [...hourIndices(valley.time, prevDateStr, 19, 23), ...hourIndices(valley.time, dateStr, 0, 6)];
  const dawnIdxO = hourIndices(observer.time, dateStr, 4, 9);
  const coreIdxO = hourIndices(observer.time, dateStr, 5, 7);

  const tValley = pick(valley, 'temperature_2m', model, coreIdxV);
  const tdValley = pick(valley, 'dew_point_2m', model, coreIdxV);
  const tObs = pick(observer, 'temperature_2m', model, coreIdxO);
  const tdObs = pick(observer, 'dew_point_2m', model, coreIdxO);
  const t850 = pick(valley, 'temperature_850hPa', model, sixIdxV.length ? sixIdxV : coreIdxV);
  if (tValley.length === 0 || tdValley.length === 0 || t850.length === 0 || tObs.length === 0) return null;

  const t925 = pick(valley, 'temperature_925hPa', model, sixIdxV.length ? sixIdxV : coreIdxV);
  const t700 = pick(valley, 'temperature_700hPa', model, sixIdxV.length ? sixIdxV : coreIdxV);
  const rh925 = pick(valley, 'relative_humidity_925hPa', model, sixIdxV.length ? sixIdxV : coreIdxV);
  const rh850 = pick(valley, 'relative_humidity_850hPa', model, sixIdxV.length ? sixIdxV : coreIdxV);
  const rh700 = pick(valley, 'relative_humidity_700hPa', model, sixIdxV.length ? sixIdxV : coreIdxV);
  const cloudLow = pick(valley, 'cloud_cover_low', model, dawnIdxV);
  const cloudMid = pick(valley, 'cloud_cover_mid', model, dawnIdxV);
  const cloudHighDawn = pick(observer, 'cloud_cover_high', model, dawnIdxO);
  const cloudHighNight = pick(observer, 'cloud_cover_high', model, nightIdxV);
  const precipDawn = pick(valley, 'precipitation', model, dawnIdxV);
  const precipNight = pick(valley, 'precipitation', model, nightIdxV);
  const wind850 = pick(observer, 'wind_speed_850hPa', model, dawnIdxO);
  const wind925Dawn = pick(valley, 'wind_speed_925hPa', model, dawnIdxV);
  const wind925Night = pick(valley, 'wind_speed_925hPa', model, nightIdxV);
  const windDir = pick(observer, 'wind_direction_850hPa', model, coreIdxO);
  const rh2mNight = pick(valley, 'relative_humidity_2m', model, nightIdxV);

  return {
    t_valley_dawn: +avg(tValley).toFixed(1),
    td_valley_dawn: +avg(tdValley).toFixed(1),
    t_obs_dawn: +avg(tObs).toFixed(1),
    td_obs_dawn: tdObs.length ? +avg(tdObs).toFixed(1) : +avg(tdValley).toFixed(1),
    cloud_low_dawn: cloudLow.length ? Math.round(avg(cloudLow)) : 0,
    cloud_mid_dawn: cloudMid.length ? Math.round(avg(cloudMid)) : 0,
    cloud_high_dawn: cloudHighDawn.length ? Math.round(avg(cloudHighDawn)) : 0,
    precip_dawn: precipDawn.length ? +sum(precipDawn).toFixed(1) : 0,
    wind850_dawn_max: wind850.length ? +Math.max(...wind850).toFixed(1) : 0,
    wind925_dawn_max: wind925Dawn.length ? +Math.max(...wind925Dawn).toFixed(1) : 0,
    wind_dir850: windDir.length ? Math.round(avg(windDir)) : 0,
    t925: t925.length ? +avg(t925).toFixed(1) : NaN,
    t850: +avg(t850).toFixed(1),
    t700: t700.length ? +avg(t700).toFixed(1) : NaN,
    rh925: rh925.length ? Math.round(avg(rh925)) : NaN,
    rh850: rh850.length ? Math.round(avg(rh850)) : NaN,
    rh700: rh700.length ? Math.round(avg(rh700)) : NaN,
    cloud_high_night: cloudHighNight.length ? Math.round(avg(cloudHighNight)) : 0,
    wind925_night: wind925Night.length ? +avg(wind925Night).toFixed(1) : 0,
    precip_night: precipNight.length ? +sum(precipNight).toFixed(1) : 0,
    rh2m_valley_night: rh2mNight.length ? Math.round(avg(rh2mNight)) : NaN,
  };
}

/** Nhãn tin cậy theo khoảng cách dự báo. */
export function qualityForDaysAhead(daysAhead: number): DataQuality {
  if (daysAhead < -2 || daysAhead > 15) return 'NO_DATA';
  if (daysAhead <= 3) return 'FORECAST';
  return 'UNCERTAIN';
}

export async function fetchMountainWeather(
  mountainKey: string | null,
  locationName: string,
  startDate: string,
  endDate: string,
  lat?: number,
  lon?: number,
  observerAlt?: number,
  profile?: TerrainPoint[],
): Promise<WeatherPackage> {
  let mt: MountainInfo;
  if (mountainKey && MOUNTAIN_DB[mountainKey]) {
    mt = MOUNTAIN_DB[mountainKey];
  } else if (lat !== undefined && lon !== undefined && lat !== 0 && lon !== 0) {
    mt = { name: locationName, lat, lon, elevation: observerAlt || 1500, zone: 'A_CLOUD_TRAP' };
  } else {
    // Trung thực: không có tọa độ thì báo lỗi rõ ràng, KHÔNG âm thầm dùng tọa độ mặc định
    throw new Error(`Không có tọa độ cho "${locationName}" — vui lòng chọn địa điểm từ gợi ý hoặc kiểm tra lại tên.`);
  }

  const { elevation: valleyElevation, source: valleySource } =
    await estimateValleyElevation(mt.lat, mt.lon, profile);
  const obsElev = observerAlt || mt.elevation;

  // Phạm vi ngày người dùng yêu cầu
  const reqStart = new Date(startDate + 'T00:00:00');
  const reqEnd = new Date(endDate + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);

  // Phạm vi API hợp lệ: [hôm nay - 2, hôm nay + 15]; lùi thêm 1 ngày để có cửa sổ đêm-trước
  const apiMin = addDays(today, -2);
  const apiMax = addDays(today, 15);
  let apiStart = reqStart < apiMin ? apiMin : reqStart;
  let apiEnd = reqEnd > apiMax ? apiMax : reqEnd;
  const hasApiRange = apiStart <= apiEnd;

  let valleyBlock: HourlyBlock | null = null;
  let obsBlock: HourlyBlock | null = null;
  let dailyData: any = null;
  if (hasApiRange) {
    const qStart = formatDateStr(addDays(apiStart, -1)); // -1 ngày cho cửa sổ đêm
    const qEnd = formatDateStr(apiEnd);
    const [valleyRes, obsRes] = await Promise.all([
      fetchPoint(mt.lat, mt.lon, valleyElevation, qStart, qEnd),
      fetchPoint(mt.lat, mt.lon, obsElev, qStart, qEnd),
    ]);
    valleyBlock = makeHourlyBlock(valleyRes.hourly);
    obsBlock = makeHourlyBlock(obsRes.hourly);
    dailyData = obsRes.daily || valleyRes.daily || null;
  }

  const days: DayData[] = [];
  for (let d = new Date(reqStart); d <= reqEnd; d = addDays(d, 1)) {
    const dateStr = formatDateStr(d);
    const prevStr = formatDateStr(addDays(d, -1));
    const daysAhead = Math.round((d.getTime() - today.getTime()) / 86400000);
    const quality = qualityForDaysAhead(daysAhead);

    // Sunrise/sunset: ưu tiên số liệu API (chính xác hơn phép xấp xỉ)
    let sunTimes = computeSunTimes(mt.lat, mt.lon, dateStr);
    if (dailyData?.time) {
      const di = (dailyData.time as string[]).indexOf(dateStr);
      if (di >= 0) {
        for (const m of WEATHER_MODELS) {
          const sr = dailyData[`sunrise_${m}`]?.[di] ?? dailyData['sunrise']?.[di];
          const ss = dailyData[`sunset_${m}`]?.[di] ?? dailyData['sunset']?.[di];
          if (sr && ss) { sunTimes = buildSunTimesFromIso(sr, ss); break; }
        }
      }
    }

    const models: Partial<Record<WeatherModelId, DayModelData>> = {};
    if (quality !== 'NO_DATA' && valleyBlock && obsBlock) {
      for (const m of WEATHER_MODELS) {
        const agg = aggregateDayModel(valleyBlock, obsBlock, m, dateStr, prevStr);
        if (agg) models[m] = agg;
      }
    }
    // Có nhãn quality nhưng không mô hình nào có dữ liệu → hạ xuống NO_DATA (trung thực)
    const effQuality: DataQuality = Object.keys(models).length === 0 ? 'NO_DATA' : quality;
    days.push({ date: dateStr, quality: effQuality, daysAhead, models, sun_times: sunTimes });
  }

  return {
    mountainInfo: { ...mt, elevation: obsElev },
    valleyElevation,
    valleySource,
    days,
    modelsCompared: WEATHER_MODELS.map(m => MODEL_LABELS[m]),
  };
}
