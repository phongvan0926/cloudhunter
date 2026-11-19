/**
 * replay-valley.ts - đợt "dự báo tại điểm thung lũng" (phiếu gcc29 vòng 3, 19/11/2026).
 * Giả thuyết, luật chọn điểm thung lũng và điều kiện ĐẠT đã ghi TRƯỚC trong NHAT-KY-HIEU-CHINH.md.
 *
 * Lấy CÙNG MỘT MẺ dữ liệu thô (historical-forecast Open-Meteo) cho hai nhánh, xen kẽ trong một lần chạy:
 *   A: toạ độ ĐỈNH, elevation = đáy thung lũng như valleyElevationsForAll (đúng như bản chụp)
 *   B: toạ độ ĐIỂM THUNG LŨNG (DEM thấp nhất trong 20 km), elevation = DEM điểm đó
 *   O: chỗ đứng (toạ độ đỉnh, cao độ đỉnh, OBSERVER_VARS), dùng chung cho cả hai nhánh
 *
 *   npx --no-install vite-node scripts/replay-valley.ts <file-ra.json>   # chạy lại được, chỉ xin phần thiếu
 *
 * CẢNH BÁO: Open-Meteo viết đè quá khứ (gần lead 0); chỉ so A với B, không đọc số tuyệt đối.
 * Hạn ngạch: ~10.000 lượt quy đổi cho toàn kho; PACE_MS giữ dưới ~3.500/giờ.
 */
if (typeof (globalThis as any).localStorage === 'undefined') {
  const mem = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => { mem.set(k, v); },
    removeItem: (k: string) => { mem.delete(k); },
  };
}
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { MOUNTAIN_DB } from '../constants/mountains';
import { addDaysStr, aggregateDayModel, makeHourlyBlock, HOURLY_VARS, OBSERVER_VARS, WeatherModelId } from '../services/weatherService';
import { valleyElevationsForAll } from '../services/rankingService';
import { seedValleyCache } from './valley-seed';

const DIR = 'data/observations';
const OUT = process.argv[2];
if (!OUT) throw new Error('Thiếu đường dẫn file ra');
const MODELS: WeatherModelId[] = ['gfs_seamless', 'icon_seamless', 'ukmo_seamless'];
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const PACE_MS = Number(process.env.PACE_MS || 9 * 60_000);   // giữa hai lô (mỗi lô ~800 lượt quy đổi)

// ---- Luật chọn điểm thung lũng (chốt trước, NHAT-KY 19/11/2026) ----
export const VP_RADIUS_KM = 20, VP_STEP_DEG = 0.02, VP_MIN_DEM = 2;
function kmBetween(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
export function valleyGrid(lat: number, lon: number) {
  const pts: { lat: number; lon: number; km: number }[] = [];
  const n = Math.ceil(VP_RADIUS_KM / 111 / VP_STEP_DEG) + 2;
  for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
    const p = { lat: lat + i * VP_STEP_DEG, lon: lon + j * VP_STEP_DEG };
    const km = kmBetween({ lat, lon }, p);
    if (km <= VP_RADIUS_KM) pts.push({ ...p, km });
  }
  return pts;
}
export function pickValley(pts: { lat: number; lon: number; km: number; dem: number | null }[]) {
  const ok = pts.filter(p => typeof p.dem === 'number' && Number.isFinite(p.dem) && p.dem > VP_MIN_DEM);
  ok.sort((a, b) => (a.dem! - b.dem!) || (a.km - b.km));
  return ok[0] ?? null;
}

async function getJson(url: string, what: string) {
  for (let attempt = 0, hourly = 0; attempt < 4; attempt++) {
    let res: Response, txt: string;
    try { res = await fetch(url); txt = await res.text(); }
    catch (e) { console.error(`  ${what}: lỗi mạng (${(e as Error).message}), thử lại sau 65 s`); await sleep(65_000 * (attempt + 1)); continue; }
    if (res.ok) { try { return JSON.parse(txt); } catch { console.error(`  ${what}: 200 nhưng không phải JSON: ${txt.slice(0, 80)}`); } }
    else {
      console.error(`  ${what}: HTTP ${res.status} ${txt.slice(0, 120)}`);
      if (/[Dd]aily/.test(txt)) { console.error('  HẾT HẠN NGẠCH NGÀY - dừng, chạy lại sau (đã lưu phần lấy được)'); process.exit(3); }
      // hết hạn ngạch GIỜ: chờ 10 phút rồi thử lại, tối đa 9 lần (không tính vào 4 lần thử thường)
      if (/[Hh]ourly/.test(txt) && hourly++ < 9) { attempt--; await sleep(10 * 60_000); continue; }
      await sleep(65_000 * (attempt + 1));
    }
  }
  return null;
}

async function main() {
  const need: Record<string, Set<string>> = {};
  const add = (d: string, k: string) => { if (MOUNTAIN_DB[k]) (need[d] ||= new Set()).add(k); };
  for (const f of readdirSync(DIR).filter(f => f.endsWith('-satellite.json')))
    for (const o of JSON.parse(readFileSync(`${DIR}/${f}`, 'utf-8')))
      if (o.verdict !== 'BLOCKED_ABOVE' && o.verdict !== 'NO_DATA') add(o.date, o.key);
  for (const r of JSON.parse(readFileSync(`${DIR}/field-reports.json`, 'utf-8'))) if (r.spotKey) add(r.date, r.spotKey);
  for (const r of JSON.parse(readFileSync(`${DIR}/fb-auto-reports.json`, 'utf-8'))) if (r.spotKey) add(r.date, r.spotKey);
  const snap = new Set(readdirSync(DIR).filter(f => f.endsWith('-forecast.json')).map(f => f.slice(0, 10)));
  const dates = Object.keys(need).filter(d => snap.has(d)).sort();
  const keys = [...new Set(dates.flatMap(d => [...need[d]]))];
  console.log(`${dates.length} ngày (${dates[0]} → ${dates[dates.length - 1]}), ${keys.length} điểm`);

  const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf-8')) : {};
  const vp: Record<string, any> = prev.vp || {};
  const days: Record<string, Record<string, any>> = prev.days || {};
  const save = () => writeFileSync(OUT, JSON.stringify({ ranAt: new Date().toISOString(), rule: { VP_RADIUS_KM, VP_STEP_DEG, VP_MIN_DEM }, vp, days }));

  // 1) điểm thung lũng từ DEM
  for (const k of keys.filter(k => !vp[k])) {
    const mt = MOUNTAIN_DB[k];
    const pts: any[] = valleyGrid(mt.lat, mt.lon);
    for (let i = 0; i < pts.length; i += 100) {
      const c = pts.slice(i, i + 100);
      // DEM: OpenTopoData srtm90m (<= 100 điểm/lần, 1 lần/giây, 1.000 lần/ngày) - xem sửa đổi 19/11 trong NHAT-KY
      const data = await getJson(`https://api.opentopodata.org/v1/srtm90m?locations=${c.map(p => `${p.lat.toFixed(4)},${p.lon.toFixed(4)}`).join('|')}`, `DEM ${k}`);
      if (data?.status !== 'OK' || !Array.isArray(data.results)) { console.error(`  LỖI DEM ${k}, bỏ điểm`); break; }
      c.forEach((p, j) => { p.dem = data.results[j]?.elevation ?? null; });
      await sleep(1200);
    }
    const best = pickValley(pts);
    if (!best) { console.error(`  LỖI: ${k} không có điểm thung lũng`); continue; }
    vp[k] = { lat: +best.lat.toFixed(4), lon: +best.lon.toFixed(4), dem: Math.round(best.dem!), km: +best.km.toFixed(1), n: pts.filter(p => typeof p.dem === 'number').length };
    console.log(`  ${k.padEnd(22)} đỉnh ${mt.elevation}m -> thung lũng ${vp[k].dem}m cách ${vp[k].km} km`);
    save();
  }

  // 2) ba khối A / B / O, xen kẽ trong từng lô
  // A = đúng như bản chụp: snapshot-forecast.ts nạp bảng đáy đã đo (data/valley-dem-seed.json) rồi mới gọi hàm này
  console.log(`  nạp ${seedValleyCache()} đáy thung lũng từ bảng seed`);
  const valleys = await valleyElevationsForAll();
  const WIN = 20, CHUNK = 20;
  let first = true;
  for (let w = 0; w < dates.length; w += WIN) {
    const win = dates.slice(w, w + WIN);
    const keysW = [...new Set(win.flatMap(d => [...need[d]]))].filter(k => typeof valleys[k] === 'number' && vp[k]);
    const todo = keysW.filter(k => win.some(d => need[d].has(k) && !days[d]?.[k]));
    for (let c = 0; c < todo.length; c += CHUNK) {
      if (!first) await sleep(PACE_MS);
      first = false;
      const spots = todo.slice(c, c + CHUNK);
      const tail = `&models=${MODELS.join(',')}&start_date=${addDaysStr(win[0], -1)}&end_date=${win[win.length - 1]}&timezone=Asia%2FBangkok`;
      const base = 'https://historical-forecast-api.open-meteo.com/v1/forecast';
      const mk = (lat: (k: string) => number, lon: (k: string) => number, el: (k: string) => number, vars: string[]) =>
        `${base}?latitude=${spots.map(k => lat(k).toFixed(4)).join(',')}&longitude=${spots.map(k => lon(k).toFixed(4)).join(',')}`
        + `&elevation=${spots.map(k => Math.round(el(k))).join(',')}&hourly=${vars.join(',')}${tail}`;
      const tag = `${win[0]}..${win[win.length - 1]} lô ${c / CHUNK + 1}/${Math.ceil(todo.length / CHUNK)}`;
      const A = await getJson(mk(k => MOUNTAIN_DB[k].lat, k => MOUNTAIN_DB[k].lon, k => valleys[k], HOURLY_VARS), `A ${tag}`);
      await sleep(5000);
      const B = A && await getJson(mk(k => vp[k].lat, k => vp[k].lon, k => vp[k].dem, HOURLY_VARS), `B ${tag}`);
      await sleep(5000);
      const O = B && await getJson(mk(k => MOUNTAIN_DB[k].lat, k => MOUNTAIN_DB[k].lon, k => MOUNTAIN_DB[k].elevation, OBSERVER_VARS), `O ${tag}`);
      if (!A || !B || !O) { console.error(`  LỖI ${tag}: thiếu khối, bỏ lô (cả hai nhánh, để giữ cùng mẻ)`); continue; }
      const arr = (x: any) => Array.isArray(x) ? x : [x];
      const [aA, aB, aO] = [arr(A), arr(B), arr(O)];
      spots.forEach((key, i) => {
        if (!aA[i]?.hourly || !aB[i]?.hourly || !aO[i]?.hourly) { console.error(`  thiếu hourly ${key}`); return; }
        const bA = makeHourlyBlock(aA[i].hourly), bB = makeHourlyBlock(aB[i].hourly), bO = makeHourlyBlock(aO[i].hourly);
        const mt = MOUNTAIN_DB[key];
        for (const d of win) {
          if (!need[d].has(key)) continue;
          const perA: Record<string, any> = {}, perB: Record<string, any> = {};
          for (const model of MODELS) {
            const a = aggregateDayModel(bA, bO, model, d, addDaysStr(d, -1));
            const b = aggregateDayModel(bB, bO, model, d, addDaysStr(d, -1));
            if (a && b) { perA[model] = a; perB[model] = b; }   // chỉ giữ mô hình có ở CẢ hai nhánh
          }
          if (!Object.keys(perA).length) continue;
          (days[d] ||= {})[key] = {
            ctxA: { valleyElevation: Math.round(valleys[key]), observerAlt: mt.elevation, zone: mt.zone, lat: mt.lat },
            ctxB: { valleyElevation: vp[key].dem, observerAlt: mt.elevation, zone: mt.zone, lat: mt.lat },
            perA, perB,
          };
        }
      });
      save();
      console.log(`  ${tag} xong (${aA[0]?.hourly?.time?.length} giờ)`);
    }
  }
  const n = Object.values(days).reduce((a, d) => a + Object.keys(d).length, 0);
  console.log(`xong: ${n} (điểm×ngày), ${Object.keys(vp).length} điểm thung lũng → ${OUT}`);
}
main().catch(e => { console.error(e); process.exit(1); });
