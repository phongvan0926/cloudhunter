/**
 * valley-v2-points.ts - chọn điểm thung lũng v2 (phiếu gcc29 vòng 4, đăng ký trước 19/11/2026 trong NHAT-KY-HIEU-CHINH.md,
 * mục "thung lũng v2: điểm nhìn thấy từ đỉnh"). Chỉ dùng DEM, KHÔNG đọc dự báo hay sự thật nào.
 *
 *   npx --no-install vite-node scripts/valley-v2-points.ts [thư-mục-đệm]   # mặc định /tmp/ch-valley-v2-dem
 *   -> ghi data/valley-v2-points.json. Chạy lại được: lưới DEM từng điểm lưu đệm, chỉ xin phần thiếu.
 *
 * DEM: OpenTopoData srtm90m (<= 100 điểm/lần, 1 lần/giây, 1.000 lần/ngày). Lỗi mạng: thử lại 4 lần rồi bỏ điểm đó
 * (in tên), chạy lại sau sẽ nối tiếp.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { MOUNTAIN_DB } from '../constants/mountains';

export const V2 = { STEP: 0.005, R_MIN_KM: 3, R_MAX_KM: 8, MIN_DEM: 50, DROP_MIN: 300, DROP_MAX: 1500, EYE_M: 2, LOS_STEP_KM: 0.25, CELL_DEG: 0.1, MIN_QUADS: 2 } as const;
const CACHE = process.argv[2] || '/tmp/ch-valley-v2-dem';
const OUT = 'data/valley-v2-points.json';
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export function kmBetween(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
/** Lưới vuông (2n+1)^2 quanh (lat, lon), bước STEP; n đủ phủ R_MAX_KM. */
export function gridSpec(lat: number, lon: number) {
  const n = Math.ceil(V2.R_MAX_KM / (111 * Math.cos(lat * Math.PI / 180)) / V2.STEP) + 1;
  return { lat0: lat - n * V2.STEP, lon0: lon - n * V2.STEP, size: 2 * n + 1 };
}
/** Nội suy song tuyến trên lưới dem[i][j] (i theo vĩ, j theo kinh). null nếu ra ngoài hoặc ô thiếu số. */
export function bilinear(g: { lat0: number; lon0: number; size: number }, dem: (number | null)[][], lat: number, lon: number) {
  const x = (lat - g.lat0) / V2.STEP, y = (lon - g.lon0) / V2.STEP;
  const i = Math.floor(x), j = Math.floor(y);
  if (i < 0 || j < 0 || i + 1 >= g.size || j + 1 >= g.size) return null;
  const v = [dem[i][j], dem[i + 1][j], dem[i][j + 1], dem[i + 1][j + 1]];
  if (v.some(z => typeof z !== 'number')) return null;
  const fx = x - i, fy = y - j;
  return (v[0]! * (1 - fx) + v[1]! * fx) * (1 - fy) + (v[2]! * (1 - fx) + v[3]! * fx) * fy;
}
/** Đường ngắm thẳng từ mắt (eye m) tới điểm p (cao độ z): không mẫu trung gian nào cao hơn đường ngắm. Thiếu DEM -> false. */
export function visible(g: any, dem: (number | null)[][], o: { lat: number; lon: number }, eye: number, p: { lat: number; lon: number }, z: number) {
  const km = kmBetween(o, p), n = Math.max(2, Math.ceil(km / V2.LOS_STEP_KM));
  for (let s = 1; s < n; s++) {
    const t = s / n, lat = o.lat + (p.lat - o.lat) * t, lon = o.lon + (p.lon - o.lon) * t;
    const h = bilinear(g, dem, lat, lon);
    if (h === null) return false;
    if (h > eye + (z - eye) * t) return false;
  }
  return true;
}
/** Góc phần tư tâm theo hướng chính: 0=B (315-45°), 1=Đ, 2=N, 3=T. */
export function quadrant(o: { lat: number; lon: number }, p: { lat: number; lon: number }) {
  const dy = p.lat - o.lat, dx = (p.lon - o.lon) * Math.cos(o.lat * Math.PI / 180);
  const brg = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
  return Math.floor(((brg + 45) % 360) / 90);
}
const cell = (v: number) => Math.floor(v / V2.CELL_DEG);

/** Luật chọn v2 trên một lưới đã có DEM. Trả các điểm theo góc (0-4 điểm) và số ứng viên. */
export function pickV2(o: { lat: number; lon: number; elevation: number }, g: any, dem: (number | null)[][]) {
  const zO = bilinear(g, dem, o.lat, o.lon);
  const eye = Math.max(o.elevation, zO ?? -Infinity) + V2.EYE_M;
  const best: any[] = [null, null, null, null];
  let cand = 0;
  for (let i = 0; i < g.size; i++) for (let j = 0; j < g.size; j++) {
    const z = dem[i][j];
    if (typeof z !== 'number' || z < V2.MIN_DEM) continue;
    const p = { lat: g.lat0 + i * V2.STEP, lon: g.lon0 + j * V2.STEP };
    const km = kmBetween(o, p);
    if (km < V2.R_MIN_KM || km > V2.R_MAX_KM) continue;
    const drop = eye - z;
    if (drop < V2.DROP_MIN || drop > V2.DROP_MAX) continue;
    if (cell(p.lat) === cell(o.lat) && cell(p.lon) === cell(o.lon)) continue;
    if (!visible(g, dem, o, eye, p, z)) continue;
    cand++;
    const q = quadrant(o, p), b = best[q];
    if (!b || z < b.dem || (z === b.dem && km < b.km)) best[q] = { lat: +p.lat.toFixed(4), lon: +p.lon.toFixed(4), dem: Math.round(z), km: +km.toFixed(2), q };
  }
  const pts = best.filter(Boolean);
  return { eye: Math.round(eye), cand, points: pts, ok: pts.length >= V2.MIN_QUADS };
}

async function demGrid(key: string, lat: number, lon: number) {
  const f = `${CACHE}/${key}.json`;
  const g = gridSpec(lat, lon);
  if (existsSync(f)) { const c = JSON.parse(readFileSync(f, 'utf-8')); if (c.size === g.size && c.lat0 === g.lat0 && c.lon0 === g.lon0) return { g, dem: c.dem }; }
  const flat: { i: number; j: number; lat: number; lon: number }[] = [];
  for (let i = 0; i < g.size; i++) for (let j = 0; j < g.size; j++) flat.push({ i, j, lat: g.lat0 + i * V2.STEP, lon: g.lon0 + j * V2.STEP });
  const dem: (number | null)[][] = Array.from({ length: g.size }, () => Array(g.size).fill(null));
  for (let k = 0; k < flat.length; k += 100) {
    const c = flat.slice(k, k + 100);
    const url = `https://api.opentopodata.org/v1/srtm90m?locations=${c.map(p => `${p.lat.toFixed(5)},${p.lon.toFixed(5)}`).join('|')}`;
    let data: any = null;
    for (let a = 0; a < 4 && !data; a++) {
      try { const r = await fetch(url); const t = await r.text(); if (r.ok) data = JSON.parse(t); else { console.error(`  ${key}: HTTP ${r.status} ${t.slice(0, 80)}`); await sleep(30_000 * (a + 1)); } }
      catch (e) { console.error(`  ${key}: lỗi mạng (${(e as Error).message}), thử lại`); await sleep(30_000 * (a + 1)); }
    }
    if (data?.status !== 'OK') { console.error(`  THIẾU DEM ${key} (lô ${k / 100 + 1}), bỏ điểm này lần này - chạy lại để nối tiếp`); return null; }
    c.forEach((p, n) => { dem[p.i][p.j] = data.results[n]?.elevation ?? null; });
    await sleep(1100);
  }
  writeFileSync(f, JSON.stringify({ ...g, dem }));
  return { g, dem };
}

async function main() {
  mkdirSync(CACHE, { recursive: true });
  const out: Record<string, any> = {};
  const missing: string[] = [];
  for (const [k, mt] of Object.entries(MOUNTAIN_DB)) {
    const r = await demGrid(k, mt.lat, mt.lon);
    if (!r) { missing.push(k); continue; }
    const p = pickV2({ lat: mt.lat, lon: mt.lon, elevation: mt.elevation }, r.g, r.dem);
    out[k] = p;
    console.log(`  ${k.padEnd(22)} mắt ${p.eye}m, ${p.cand} ứng viên, ${p.points.length} góc ${p.ok ? '' : '-> LOẠI (< 2 góc)'} ${p.points.map((x: any) => `${'BĐNT'[x.q]}:${x.dem}m/${x.km}km`).join(' ')}`);
  }
  if (missing.length) { console.error(`THIẾU DEM ${missing.length} điểm: ${missing.join(', ')} - CHƯA ghi tệp, chạy lại để nối tiếp`); process.exit(3); }
  writeFileSync(OUT, JSON.stringify({ rule: 'valley-v2 (NHAT-KY 19/11/2026)', params: V2, demSource: 'OpenTopoData srtm90m', points: out }, null, 1) + '\n');
  const ok = Object.values(out).filter((p: any) => p.ok).length;
  console.log(`xong: ${ok}/${Object.keys(out).length} điểm đủ >= 2 góc -> ${OUT}`);
}
// test (vitest) chỉ import các hàm thuần, không chạy main
if (!process.env.VITEST) main().catch(e => { console.error(e); process.exit(1); });
