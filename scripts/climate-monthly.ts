/**
 * climate-monthly.ts - tính SẴN khí hậu theo tháng (phiếu gcc29 vòng 4) cho 8 tuyến cố định (scripts/fixed-routes.ts)
 * và các điểm trong thư viện, ghi public/climate/monthly-v1.json (app đọc tệp tĩnh, không gọi API lúc dùng).
 *
 *   npx --no-install vite-node scripts/climate-monthly.ts [--budget 5000] [--cache <thư-mục>] [--pace 100]
 *
 * Nguồn: Open-Meteo Historical (archive-api, ERA5 / ERA5-Land), 2016-01-01 .. 2025-12-31, 4 biến ngày.
 * Chi phí (đo cách tính của Open-Meteo: biến/10 x ngày/14): ~104 lượt quy đổi / vị trí. Hạn miễn phí 600/phút,
 * 5.000/giờ, 10.000/ngày, dùng chung IP với job chụp hằng đêm, nên:
 *   - --budget: trần lượt quy đổi cho MỘT lần chạy (mặc định 5.000), hết trần thì dừng, ghi phần đã có.
 *   - --pace: giây chờ giữa hai vị trí (mặc định 100 s, ~3.700 lượt/giờ, dưới trần giờ).
 *   - Thứ tự: đích 8 tuyến -> mốc dọc tuyến -> các điểm còn lại. Dữ liệu thô từng vị trí lưu đệm, chạy lại là NỐI TIẾP.
 *   - Nối tiếp cả khi KHÔNG có đệm thô (GitHub Actions, vòng 5): vị trí đã có trong tệp ra (cùng id, lat, lon, cao độ) thì
 *     dùng lại số tháng của nó, không gọi API. Mốc dọc tuyến lấy từ `data/climate-route-points.json` (commit trong repo) để
 *     mọi máy ra đúng cùng bộ mốc; tuyến chưa có trong tệp đó mới đi lấy hình tuyến.
 *   - Lỗi mạng: thử lại 4 lần (30/60/90/120 s); 429 theo phút: chờ 65 s; 429 theo giờ: chờ 10 phút; 429 theo ngày: dừng.
 *   - Vị trí thiếu (chưa lấy hoặc lỗi) ghi vào `missing` của tệp ra kèm lý do, và in ra cuối. Ngày thiếu số đếm riêng.
 * Mã thoát: 0 đủ | 3 còn thiếu vị trí (vẫn ghi tệp) | 1 lỗi.
 *
 * Tuyến: xe máy qua Valhalla FOSSGIS (<= 1 yêu cầu/giây, UA nêu tên app), ô tô OSRM; hình tuyến lưu đệm.
 * Mốc dọc tuyến: cách đều 40 km + điểm cao nhất (profile cao độ Open-Meteo Elevation). Gộp mốc cùng ô 0,1° và lệch cao
 * độ < 150 m (ERA5-Land lưới 0,1°).
 */
import { countCallsAs } from './count-calls';
countCallsAs('climate-monthly');   // log 1 dòng lượt gọi theo máy chủ khi kết thúc (vòng 7)
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { MOUNTAIN_DB } from '../constants/mountains';
import { ORIGINS, ROUTES } from './fixed-routes';
import { fetchRoute, fetchElevations, elevationKms, evenKms, pointAtKm, setFetchHeaders } from '../services/routeService';
import { aggregateMonthly, seaSeason, CTH, CLIMATE_YEARS, CLIMATE_DAILY_VARS, CLIMATE_FILE_VERSION, SEA_MIN_N, type SeaLabel, type ClimateLoc } from '../services/climateService';
import { fbUsable } from './fb-auto';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const BUDGET = +arg('--budget', '5000');
const CACHE = arg('--cache', `${homedir()}/.cache/cloudhunter-climate`);
const PACE_S = +arg('--pace', '100');
const OUT = 'public/climate/monthly-v1.json';
const ROUTE_POINTS = 'data/climate-route-points.json';
type RoutePts = { km: number; lat: number; lon: number; elev: number | null }[];
const ROUTE_STEP_KM = 40;
const COST = (CLIMATE_DAILY_VARS.length / 10) * ((CLIMATE_YEARS.to - CLIMATE_YEARS.from + 1) * 365.25 / 14);
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const log = (...a: any[]) => console.log(new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }), ...a);

interface Loc { id: string; lat: number; lon: number; elev: number; kind: 'spot' | 'route'; label: string }

async function routeLocs(): Promise<{ locs: Loc[]; routes: Record<string, { km: number; loc: string }[]>; missing: { id: string; label: string; reason: string }[] }> {
  setFetchHeaders({ 'User-Agent': 'CloudHunter-climate-precompute/1.0 (+https://github.com/phongvan0926/cloudhunter)' });
  const locs: Loc[] = [], routes: Record<string, { km: number; loc: string }[]> = {}, missing: { id: string; label: string; reason: string }[] = [];
  const saved: Record<string, RoutePts> = existsSync(ROUTE_POINTS) ? JSON.parse(readFileSync(ROUTE_POINTS, 'utf-8')) : {};
  for (const r of ROUTES) {
    const f = `${CACHE}/route-${r.id}.json`;
    let pts: RoutePts | null = saved[r.id] ?? (existsSync(f) ? JSON.parse(readFileSync(f, 'utf-8')) : null);
    if (!pts) {
      try {
        const o = ORIGINS[r.from], d = MOUNTAIN_DB[r.to];
        const g = await fetchRoute(o, d, r.vehicle);
        await sleep(1500);
        const total = g.cum[g.cum.length - 1];
        const eKms = elevationKms(total);
        const elevs = await fetchElevations(eKms.map(k => pointAtKm(g.coords, g.cum, k)));
        let peak = 0; elevs.forEach((v, i) => { if ((v ?? -1) > (elevs[peak] ?? -1)) peak = i; });
        const kms = evenKms(total, ROUTE_STEP_KM, 10);
        if (!kms.some(k => Math.abs(k - eKms[peak]) < 5)) kms.push(eKms[peak]);
        kms.sort((a, b) => a - b);
        const near = (km: number) => { let b = 0; eKms.forEach((k, i) => { if (Math.abs(k - km) < Math.abs(eKms[b] - km)) b = i; }); return elevs[b] ?? null; };
        pts = kms.map(km => ({ km: Math.round(km), ...pointAtKm(g.coords, g.cum, km), elev: near(km) }));
        writeFileSync(f, JSON.stringify(pts));
      } catch (e: any) { missing.push({ id: r.id, label: `tuyến ${r.id}`, reason: `không lấy được hình tuyến: ${e.message}` }); continue; }
    }
    saved[r.id] = pts;
    routes[r.id] = [];
    for (const p of pts) {
      if (p.elev === null) { missing.push({ id: `${r.id}@${p.km}`, label: `${r.id} km ${p.km}`, reason: 'không có cao độ' }); continue; }
      // trùng ô 0,1° và cao độ gần nhau -> dùng chung
      const same = locs.find(l => Math.floor(l.lat * 10) === Math.floor(p.lat * 10) && Math.floor(l.lon * 10) === Math.floor(p.lon * 10) && Math.abs(l.elev - p.elev!) < 150);
      const id = same?.id ?? `rt:${p.lat.toFixed(3)},${p.lon.toFixed(3)}`;
      if (!same) locs.push({ id, lat: +p.lat.toFixed(4), lon: +p.lon.toFixed(4), elev: Math.round(p.elev), kind: 'route', label: `${r.id} km ${p.km}` });
      routes[r.id].push({ km: p.km, loc: id });
    }
  }
  writeFileSync(ROUTE_POINTS, JSON.stringify(saved, null, 1) + '\n');
  return { locs, routes, missing };
}

/** Số tháng đã có trong tệp ra lần trước, dùng lại khi cùng id + lat + lon + cao độ (không có đệm thô vẫn nối tiếp được). */
export function priorLocations(prev: any): Record<string, ClimateLoc> {
  return prev && prev.version === CLIMATE_FILE_VERSION && prev.locations ? prev.locations : {};
}
export function samePlace(a: { lat: number; lon: number; elev: number }, b: { lat: number; lon: number; elev: number }) {
  return Math.abs(a.lat - b.lat) < 1e-4 && Math.abs(a.lon - b.lon) < 1e-4 && Math.round(a.elev) === Math.round(b.elev);
}

async function fetchArchive(l: Loc): Promise<any | 'DAILY_LIMIT' | null> {
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${l.lat}&longitude=${l.lon}&elevation=${l.elev}`
    + `&start_date=${CLIMATE_YEARS.from}-01-01&end_date=${CLIMATE_YEARS.to}-12-31&daily=${CLIMATE_DAILY_VARS.join(',')}&timezone=Asia%2FBangkok`;
  for (let a = 0; a < 5; a++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'CloudHunter-climate-precompute/1.0' } });
      const t = await r.text();
      if (r.ok) return JSON.parse(t);
      if (r.status === 429) {
        if (/daily/i.test(t)) { log(`  429 theo NGÀY: ${t.slice(0, 120)}`); return 'DAILY_LIMIT'; }
        const w = /hourly/i.test(t) ? 600_000 : 65_000;
        log(`  429 (${t.slice(0, 100)}), chờ ${w / 1000} s`); await sleep(w); continue;
      }
      log(`  HTTP ${r.status} ${t.slice(0, 100)}`); await sleep(30_000 * (a + 1));
    } catch (e) { log(`  lỗi mạng (${(e as Error).message}), thử lại sau ${30 * (a + 1)} s`); await sleep(30_000 * (a + 1)); }
  }
  return null;
}

function seaLabels(): { labels: SeaLabel[]; range: [string, string] | null } {
  const DIR = 'data/observations', labels: SeaLabel[] = [];
  for (const f of readdirSync(DIR).filter(f => f.endsWith('-satellite.json')))
    for (const o of JSON.parse(readFileSync(`${DIR}/${f}`, 'utf-8'))) {
      if (o.verdict === 'BLOCKED_ABOVE' || o.verdict === 'NO_DATA') continue;
      labels.push({ date: o.date, key: o.key, sea: o.verdict === 'SEA_CONFIRMED' || o.verdict === 'SEA_MARGINAL', src: 'vệ tinh' });
    }
  for (const r of JSON.parse(readFileSync(`${DIR}/fb-auto-reports.json`, 'utf-8'))) {
    if (!fbUsable(r) || (r.timeOfDay && r.timeOfDay !== 'DAWN')) continue;
    labels.push({ date: r.date, key: r.spotKey, sea: r.seaLevel === 'BELOW' || r.seaLevel === 'AT_EYE', src: 'facebook' });
  }
  for (const r of JSON.parse(readFileSync(`${DIR}/field-reports.json`, 'utf-8'))) {
    if (!r.spotKey || (r.timeOfDay && r.timeOfDay !== 'DAWN')) continue;
    labels.push({ date: r.date, key: r.spotKey, sea: r.seaLevel === 'BELOW' || r.seaLevel === 'AT_EYE', src: 'người đi' });
  }
  const ds = labels.map(l => l.date).sort();
  return { labels: labels.filter(l => MOUNTAIN_DB[l.key]), range: ds.length ? [ds[0], ds[ds.length - 1]] : null };
}

async function main() {
  mkdirSync(CACHE, { recursive: true });
  const { locs: rLocs, routes, missing } = await routeLocs();
  const dests = new Set(ROUTES.map(r => r.to));
  const spotLoc = (k: string): Loc => ({ id: `sp:${k}`, lat: MOUNTAIN_DB[k].lat, lon: MOUNTAIN_DB[k].lon, elev: MOUNTAIN_DB[k].elevation, kind: 'spot', label: MOUNTAIN_DB[k].name });
  const keys = Object.keys(MOUNTAIN_DB);
  const order: Loc[] = [...keys.filter(k => dests.has(k)).map(spotLoc), ...rLocs, ...keys.filter(k => !dests.has(k)).map(spotLoc)];
  log(`${order.length} vị trí (${rLocs.length} mốc tuyến, ${keys.length} điểm), ~${Math.round(COST)} lượt quy đổi/vị trí, trần lần này ${BUDGET}`);

  const prevFile = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf-8')) : null;
  const prior = priorLocations(prevFile);
  const priorRainGaps = new Map<string, any>((prevFile?.missing ?? []).filter((m: any) => String(m.reason).startsWith('thiếu số mưa')).map((m: any) => [m.id, m]));
  const locations: Record<string, ClimateLoc> = {};
  let spent = 0, stopped = '', reused = 0, fetched = 0;
  for (const l of order) {
    const f = `${CACHE}/${l.id.replace(/[^\w.,-]/g, '_')}.json`;
    let d: any = existsSync(f) ? JSON.parse(readFileSync(f, 'utf-8')) : null;
    const p = prior[l.id];
    if (!d && p && samePlace(p, l)) {
      locations[l.id] = { ...l, months: p.months }; reused++;
      const g = priorRainGaps.get(l.id); if (g) missing.push(g);
      continue;
    }
    if (!d) {
      if (stopped) { missing.push({ id: l.id, label: l.label, reason: stopped }); continue; }
      if (spent + COST > BUDGET) { stopped = `chưa lấy (hết trần ${BUDGET} lượt của lần chạy này)`; missing.push({ id: l.id, label: l.label, reason: stopped }); continue; }
      if (spent > 0) await sleep(PACE_S * 1000);
      const r = await fetchArchive(l);
      spent += COST;
      if (r === 'DAILY_LIMIT') { stopped = 'chưa lấy (Open-Meteo báo hết hạn mức ngày)'; missing.push({ id: l.id, label: l.label, reason: stopped }); continue; }
      if (!r?.daily?.time) { missing.push({ id: l.id, label: l.label, reason: 'lỗi mạng/HTTP sau 5 lần thử' }); continue; }
      d = r; fetched++; writeFileSync(f, JSON.stringify(d));
    }
    const dd = d.daily;
    const { months, missingDays } = aggregateMonthly(dd.time, dd.precipitation_sum, dd.temperature_2m_mean, dd.temperature_2m_min, dd.relative_humidity_2m_min);
    if (missingDays > 0) missing.push({ id: l.id, label: l.label, reason: `thiếu số mưa ${missingDays} ngày (đã bỏ các năm-tháng thiếu nhiều)` });
    locations[l.id] = { ...l, months };
    log(`  ${l.id.padEnd(30)} ${l.elev} m  T1: rét đậm ${months[0].retDam} ngày, T7: mưa ${months[6].rainMm} mm, ${months[6].d50} ngày >= 50 mm`);
  }
  const spots: Record<string, string> = {};
  for (const k of keys) if (locations[`sp:${k}`]) spots[k] = `sp:${k}`;
  const { labels, range } = seaLabels();
  mkdirSync('public/climate', { recursive: true });
  writeFileSync(OUT, JSON.stringify({
    version: CLIMATE_FILE_VERSION, generatedAt: new Date().toISOString(),
    source: `Open-Meteo Historical Weather API (ERA5/ERA5-Land, archive-api), ${CLIMATE_YEARS.from}-${CLIMATE_YEARS.to}, biến ngày: ${CLIMATE_DAILY_VARS.join(', ')}`,
    years: CLIMATE_YEARS, thresholds: CTH, locations, spots, routes,
    sea: { note: 'Đếm buổi sáng (DAWN) có nhãn: người đi > facebook > vệ tinh (bỏ BLOCKED_ABOVE/NO_DATA). Chỉ có dữ liệu từ 2026, không phải khí hậu nhiều năm.', minN: SEA_MIN_N, dateRange: range, bySpot: seaSeason(labels) },
    missing,
  }) + '\n');
  log(`đã ghi ${OUT}: ${Object.keys(locations).length}/${order.length} vị trí (dùng lại ${reused} từ tệp cũ, lấy mới ${fetched}), lần này tốn ~${Math.round(spent)} lượt`);
  if (missing.length) {
    console.error(`CÒN THIẾU ${missing.length} mục:`);
    for (const m of missing) console.error(`  - ${m.label}: ${m.reason}`);
  }
  return Object.keys(locations).length < order.length || missing.some(m => !m.reason.startsWith('thiếu số mưa')) ? 3 : 0;
}
if (!process.env.VITEST) main().then(c => process.exit(c), e => { console.error('LỖI:', e); process.exit(1); });
