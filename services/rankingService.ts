/**
 * rankingService — "Đêm nay đi đâu săn mây?": chấm điểm rạng sáng NGÀY MAI cho toàn bộ
 * thư viện điểm đã xác thực trong 1 call Open-Meteo batch (đã kiểm chứng API nhận danh
 * sách latitude/longitude/elevation, trả JSON array đúng thứ tự).
 *
 * Trung thực dữ liệu:
 *  - Đây là XẾP HẠNG NHANH: 2 mô hình (GFS+ICON), điểm dữ liệu tại tọa độ điểm săn mây
 *    với &elevation= ĐÁY THUNG LŨNG (nơi biển mây hình thành) — đúng vật lý của engine.
 *  - Đáy thung lũng ước tính từ DEM thật (min 5 điểm mẫu ~3km quanh đỉnh), cache
 *    localStorage vĩnh viễn (địa hình không đổi).
 *  - Điểm nào thiếu dữ liệu thì bị loại khỏi bảng, không chèn số mặc định.
 */
import { MOUNTAIN_DB } from '../constants/mountains';
import { NORTHWEST_PEAKS } from '../constants';
import { addDaysStr, aggregateDayModel, makeHourlyBlock, WeatherModelId, HOURLY_VARS } from './weatherService';
import { scoreOneModel, combineModels } from './cloudScoreEngine';
import { StatusCode } from '../types';

const RANK_MODELS: WeatherModelId[] = ['gfs_seamless', 'icon_seamless'];
// Dùng CÙNG bộ 41 biến với phân tích đầy đủ: GFS+ICON chính là 2 model có đủ profile
// 7 tầng + BLH → vật lý xếp hạng giống hệt bản đầy đủ, chỉ còn khác 2 vs 4 model.
// (Đo 19/8: bộ 16 biến cũ lệch điểm max 11/100 vì thiếu profile — đã nâng lên 41 biến.)
const RANK_VARS = HOURLY_VARS;
const VALLEY_CACHE_KEY = 'cloudhunter_valley_dem_v1';

export interface SpotRank {
  key: string;
  name: string;
  lat: number;
  lon: number;
  elevation: number;    // độ cao điểm đứng (đỉnh) trong thư viện
  valleyElev: number;   // đáy thung lũng ước tính DEM
  zone: string;
  score: number;
  status: StatusCode;
  agreement: number;    // % 2 mô hình đồng thuận trạng thái
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} từ ${new URL(url).hostname}`);
  const data = await res.json();
  if (data && !Array.isArray(data) && data.error) throw new Error(`Open-Meteo: ${data.reason || 'lỗi không rõ'}`);
  return data;
}

/**
 * Đáy thung lũng DEM cho TOÀN BỘ thư viện — 5 điểm mẫu/điểm (~3km), lấy min,
 * cache localStorage vĩnh viễn (chỉ đo lại khi thư viện có điểm mới).
 */
export async function valleyElevationsForAll(
  onProgress?: (msg: string) => void
): Promise<Record<string, number>> {
  let cache: Record<string, number> = {};
  try { cache = JSON.parse(localStorage.getItem(VALLEY_CACHE_KEY) || '{}'); } catch { /* cache hỏng → đo lại */ }
  let missing = Object.entries(MOUNTAIN_DB).filter(([k]) => typeof cache[k] !== 'number');
  // Ưu tiên mặt cắt ĐÃ XÁC THỰC: điểm nào có preset với điểm VALLEY thì dùng luôn
  // (cùng nguồn với phân tích đầy đủ), chỉ điểm còn lại mới đo DEM.
  for (const [key, mt] of missing) {
    const preset = NORTHWEST_PEAKS.find(p => p.name === mt.name && p.elevation_profile?.length);
    const valleys = (preset?.elevation_profile || []).filter(p => p.type === 'VALLEY').map(p => p.altitude);
    if (valleys.length > 0) cache[key] = Math.max(80, Math.min(...valleys));
  }
  missing = missing.filter(([k]) => typeof cache[k] !== 'number');
  if (missing.length > 0) {
    onProgress?.(`Đo đáy thung lũng ${missing.length} điểm từ DEM (chỉ lần đầu)...`);
    const d = 0.03; // ≈ 3.3km
    const coords = missing.flatMap(([key, mt]) => ([
      [mt.lat, mt.lon], [mt.lat + d, mt.lon], [mt.lat - d, mt.lon], [mt.lat, mt.lon + d], [mt.lat, mt.lon - d],
    ] as [number, number][]).map(([lat, lon]) => ({ key, lat, lon })));
    for (let i = 0; i < coords.length; i += 100) {
      const chunk = coords.slice(i, i + 100);
      const url = `https://api.open-meteo.com/v1/elevation?latitude=${chunk.map(c => c.lat.toFixed(4)).join(',')}&longitude=${chunk.map(c => c.lon.toFixed(4)).join(',')}`;
      const data = await fetchJson(url);
      const els: unknown[] = data.elevation || [];
      chunk.forEach((c, j) => {
        const el = els[j];
        if (typeof el === 'number' && !Number.isNaN(el)) {
          const cur = cache[c.key];
          cache[c.key] = typeof cur === 'number' ? Math.min(cur, Math.round(el)) : Math.round(el);
        }
      });
    }
    for (const [k] of missing) {
      if (typeof cache[k] === 'number') cache[k] = Math.max(80, cache[k]);
    }
    try { localStorage.setItem(VALLEY_CACHE_KEY, JSON.stringify(cache)); } catch { /* private mode */ }
  }
  return cache;
}

/** Xếp hạng toàn thư viện cho rạng sáng targetDate (YYYY-MM-DD). */
export async function rankSpotsForDawn(
  targetDate: string,
  onProgress?: (msg: string) => void
): Promise<SpotRank[]> {
  const spots = Object.entries(MOUNTAIN_DB);
  const valleys = await valleyElevationsForAll(onProgress);
  const usable = spots.filter(([k]) => typeof valleys[k] === 'number');
  if (usable.length === 0) throw new Error('Không đo được độ cao thung lũng từ DEM — kiểm tra kết nối mạng.');

  onProgress?.(`Tải dự báo GFS+ICON cho ${usable.length} điểm (1 call batch)...`);
  const prevDate = addDaysStr(targetDate, -1);
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${usable.map(([, m]) => m.lat.toFixed(4)).join(',')}` +
    `&longitude=${usable.map(([, m]) => m.lon.toFixed(4)).join(',')}` +
    `&elevation=${usable.map(([k]) => Math.round(valleys[k])).join(',')}` +
    `&hourly=${RANK_VARS.join(',')}&models=${RANK_MODELS.join(',')}` +
    `&start_date=${prevDate}&end_date=${targetDate}&timezone=Asia%2FBangkok`;
  const data = await fetchJson(url);
  const arr: any[] = Array.isArray(data) ? data : [data];

  const results: SpotRank[] = [];
  usable.forEach(([key, mt], i) => {
    const loc = arr[i];
    if (!loc?.hourly) return; // điểm này thiếu dữ liệu → loại, không bịa
    const block = makeHourlyBlock(loc.hourly);
    const ctx = { valleyElevation: Math.round(valleys[key]), observerAlt: mt.elevation, zone: mt.zone, lat: mt.lat };
    const per = [];
    for (const model of RANK_MODELS) {
      const agg = aggregateDayModel(block, block, model, targetDate, prevDate);
      if (agg) per.push(scoreOneModel(model, agg, ctx, targetDate));
    }
    if (per.length === 0) return;
    const c = combineModels(per);
    results.push({
      key, name: mt.name, lat: mt.lat, lon: mt.lon, elevation: mt.elevation,
      valleyElev: Math.round(valleys[key]), zone: mt.zone,
      score: c.score, status: c.status, agreement: c.agreement,
    });
  });

  results.sort((a, b) => b.score - a.score);
  return results;
}
