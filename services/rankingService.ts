/**
 * rankingService — "Đêm nay đi đâu săn mây?": chấm điểm rạng sáng NGÀY MAI cho toàn bộ
 * thư viện điểm đã xác thực trong 1 call Open-Meteo batch (đã kiểm chứng API nhận danh
 * sách latitude/longitude/elevation, trả JSON array đúng thứ tự).
 *
 * Trung thực dữ liệu:
 *  - Đây là XẾP HẠNG NHANH: 3 mô hình (GFS+ICON+UKMO), điểm dữ liệu tại tọa độ điểm săn mây
 *    với &elevation= ĐÁY THUNG LŨNG (nơi biển mây hình thành) — đúng vật lý của engine.
 *  - Đáy thung lũng: ưu tiên profile VALLEY đã xác thực (join theo TOKEN chuẩn hóa tên —
 *    so tên nguyên văn từng lệch 2 điểm), rồi cache chung cloudhunter_valley_dem_v2
 *    (CÓ vân tay tọa độ, dùng chung với phân tích đầy đủ), cuối cùng mới đo DEM 5 điểm.
 *  - KẾT QUẢ XẾP HẠNG cache 30 phút theo ngày đích — đóng/mở panel không nã lại API
 *    (1 lần xếp hạng ≈ 600+ call quy đổi, từng vượt hạn mức phút của Open-Meteo).
 *  - Điểm nào thiếu dữ liệu thì bị loại khỏi bảng, không chèn số mặc định.
 */
import { MOUNTAIN_DB } from '../constants/mountains';
import { NORTHWEST_PEAKS } from '../constants';
import {
  addDaysStr, aggregateDayModel, makeHourlyBlock, WeatherModelId, HOURLY_VARS,
  getCachedValley, setCachedValley,
} from './weatherService';
import { scoreOneModel, combineModels } from './cloudScoreEngine';
import { StatusCode } from '../types';

const RANK_MODELS: WeatherModelId[] = ['gfs_seamless', 'icon_seamless', 'ukmo_seamless'];
// Dùng CÙNG bộ 41 biến với phân tích đầy đủ: GFS/ICON/UKMO chính là 3 model có đủ profile
// 7 tầng → vật lý xếp hạng giống hệt bản đầy đủ, chỉ còn khác 3 vs 6 model.
// (Đo 19/8: bộ 16 biến cũ lệch điểm max 11/100 vì thiếu profile — đã nâng lên 41 biến.)
const RANK_VARS = HOURLY_VARS;

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
  agreement: number;    // % các mô hình xếp hạng đồng thuận trạng thái
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} từ ${new URL(url).hostname}`);
  const data = await res.json();
  if (data && !Array.isArray(data) && data.error) throw new Error(`Open-Meteo: ${data.reason || 'lỗi không rõ'}`);
  return data;
}

/** Chuẩn hóa tên thành tập token (bỏ dấu, bỏ ngoặc) — join preset bền hơn so nguyên văn. */
function nameTokens(name: string): string[] {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase()
    .replace(/[()]/g, ' ').split(/[^a-z0-9]+/).filter(t => t.length > 1).sort();
}
function sameSpotName(a: string, b: string): boolean {
  const ta = nameTokens(a), tb = nameTokens(b);
  if (ta.join('|') === tb.join('|')) return true;
  // một bên là tập con của bên kia (vd "Hang Kia - Pà Cò" ⊂ "Hang Kia - Pà Cò (Thung Mài)")
  const [small, big] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  return small.length >= 2 && small.every(t => big.includes(t));
}

/**
 * Đáy thung lũng cho TOÀN BỘ thư viện: preset VALLEY xác thực → cache chung v2 (vân tay
 * tọa độ) → DEM 5 điểm mẫu (~3km, lấy min) chỉ cho điểm còn thiếu.
 */
export async function valleyElevationsForAll(
  onProgress?: (msg: string) => void
): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  const missing: [string, (typeof MOUNTAIN_DB)[string]][] = [];
  for (const [key, mt] of Object.entries(MOUNTAIN_DB)) {
    const cached = getCachedValley(key, mt.lat, mt.lon);
    if (cached !== null) { out[key] = cached; continue; }
    const preset = NORTHWEST_PEAKS.find(p => p.elevation_profile?.length && sameSpotName(p.name, mt.name));
    const valleys = (preset?.elevation_profile || []).filter(p => p.type === 'VALLEY').map(p => p.altitude);
    if (valleys.length > 0) {
      out[key] = Math.max(80, Math.min(...valleys));
      setCachedValley(key, mt.lat, mt.lon, out[key], 'PROFILE');
      continue;
    }
    missing.push([key, mt]);
  }
  if (missing.length > 0) {
    onProgress?.(`Đo đáy thung lũng ${missing.length} điểm từ DEM (chỉ lần đầu)...`);
    const d = 0.03; // ≈ 3.3km
    const coords = missing.flatMap(([key, mt]) => ([
      [mt.lat, mt.lon], [mt.lat + d, mt.lon], [mt.lat - d, mt.lon], [mt.lat, mt.lon + d], [mt.lat, mt.lon - d],
    ] as [number, number][]).map(([lat, lon]) => ({ key, lat, lon })));
    const mins: Record<string, number> = {};
    for (let i = 0; i < coords.length; i += 100) {
      const chunk = coords.slice(i, i + 100);
      const url = `https://api.open-meteo.com/v1/elevation?latitude=${chunk.map(c => c.lat.toFixed(4)).join(',')}&longitude=${chunk.map(c => c.lon.toFixed(4)).join(',')}`;
      const data = await fetchJson(url);
      const els: unknown[] = data.elevation || [];
      chunk.forEach((c, j) => {
        const el = els[j];
        if (typeof el === 'number' && !Number.isNaN(el)) {
          mins[c.key] = typeof mins[c.key] === 'number' ? Math.min(mins[c.key], Math.round(el)) : Math.round(el);
        }
      });
    }
    for (const [key, mt] of missing) {
      if (typeof mins[key] === 'number') {
        out[key] = Math.max(80, mins[key]);
        setCachedValley(key, mt.lat, mt.lon, out[key], 'DEM5');
      }
    }
  }
  return out;
}

/** Xếp hạng toàn thư viện cho rạng sáng targetDate (YYYY-MM-DD). */
// Cache kết quả xếp hạng 30 phút — model toàn cầu cập nhật 6h/lần, đóng/mở panel không nã lại API
let RANK_CACHE: { targetDate: string; ts: number; results: SpotRank[] } | null = null;
const RANK_CACHE_TTL_MS = 30 * 60 * 1000;

export async function rankSpotsForDawn(
  targetDate: string,
  onProgress?: (msg: string) => void
): Promise<SpotRank[]> {
  if (RANK_CACHE && RANK_CACHE.targetDate === targetDate && Date.now() - RANK_CACHE.ts < RANK_CACHE_TTL_MS) {
    return RANK_CACHE.results;
  }
  const spots = Object.entries(MOUNTAIN_DB);
  const valleys = await valleyElevationsForAll(onProgress);
  const usable = spots.filter(([k]) => typeof valleys[k] === 'number');
  if (usable.length === 0) throw new Error('Không đo được độ cao thung lũng từ DEM — kiểm tra kết nối mạng.');

  onProgress?.(`Tải dự báo GFS+ICON+UKMO cho ${usable.length} điểm (1 call batch)...`);
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
  RANK_CACHE = { targetDate, ts: Date.now(), results };
  return results;
}
