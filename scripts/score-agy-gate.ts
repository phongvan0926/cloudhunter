/**
 * Chấm cổng BÓNG của nhánh agy (phiếu gd355). Tiêu chí, cổng G, ngưỡng X=25 và quy tắc xử lý đóng băng trong NHAT-KY-HIEU-CHINH.md
 * (đăng ký trước 3788b79). Chấm MỘT lần vào ngày chấm: FIELD >= 30 điểm-ngày mới (có cột agyGate) hoặc 20/12/2026.
 *
 *   npx vite-node scripts/score-agy-gate.ts [--dir data/observations] [--xem-trung-gian] [--hom-nay YYYY-MM-DD]
 *
 * Trước ngày chấm chỉ in ĐẾM (bản ghi có cột, ca lỗi/thiếu dữ liệu, số nhãn, số báo đúng/nhầm CỦA CLOUDHUNTER); số phụ thuộc cổng bị ẩn.
 * `--xem-trung-gian` bắt buộc để xem sớm và bị GHI vào data/agy-gate-runs.log (đăng ký: mọi lần chạy đều phải ghi).
 * Luật gán nhãn chép từ calibrate.ts (người đi > Facebook > vệ tinh); `--kiem-nhan` in số nhãn theo nguồn trên TOÀN kho để đối chiếu calibrate.
 */
import { readdirSync, readFileSync, existsSync, appendFileSync } from 'fs';
import { MOUNTAIN_DB } from '../constants/mountains';
import { fbUsable } from './fb-auto';

type Src = 'người đi' | 'facebook' | 'vệ tinh';
export interface Row { date: string; key: string; src: Src; sea: boolean; worth: boolean; gate: string | null; nMod: number | null; engine: string; post: boolean }

const arg = (n: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const DIR = arg('--dir') || 'data/observations';
const SEED = 19112026, BOOT = 2000, BLOCK_DAYS = 3;
export const X_PCT = 25;
/** Điều kiện chấm đăng ký (g2448 sửa 3): FIELD >= 30 điểm-ngày mới VÀ >= 10 ca CÓ, hoặc từ 20/12/2026. MỘT hằng dùng chung. */
export function isReady(field: { sea: boolean }[], today: string): boolean {
  return (field.length >= 30 && field.filter(r => r.sea).length >= 10) || today >= '2026-12-20';
}

function nameToKey(name: string): string | null {
  if (MOUNTAIN_DB[name]) return name;
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
  const t = norm(name);
  for (const [k, m] of Object.entries(MOUNTAIN_DB)) { if (norm(m.name) === t) return k; if ((m.aliases || []).some(a => norm(a) === t)) return k; }
  return null;
}

/** Gán nhãn đúng như calibrate.ts (đóng băng). Chỉ điểm-ngày CÓ bản chụp; `onlyShadow` = chỉ bản chụp có cột agyGate. */
export function buildRows(dir: string, onlyShadow: boolean): Row[] {
  const files = readdirSync(dir);
  const fc: Record<string, Record<string, any>> = {};
  const hasCol: Record<string, boolean> = {};
  for (const f of files.filter(f => f.endsWith('-forecast.json'))) {
    const j = JSON.parse(readFileSync(`${dir}/${f}`, 'utf-8'));
    hasCol[j.date] = j.spots.some((x: any) => 'agyGate' in x);
    fc[j.date] = Object.fromEntries(j.spots.map((s: any) => [s.key, { ...s, engineVersion: j.engineVersion }]));
  }
  const rows: Row[] = [];
  const mk = (date: string, key: string, src: Src, sea: boolean): Row | null => {
    const p = fc[date]?.[key];
    if (!p || (typeof p.worthGoing !== 'boolean' && !process.argv.includes('--kiem-nhan'))) return null;
    if (onlyShadow && !hasCol[date]) return null;
    const g = p.agyGate;
    // điểm thiếu cột trong bản chụp ĐÃ có cột = LOI (g2448 sửa 4), không lọc im lặng
    return { date, key, src, sea, worth: (p.worthGoingBase ?? p.worthGoing) === true, gate: g ? (g.error ? 'LOI' : g.ketLuan) : (hasCol[date] ? 'LOI' : null), nMod: g?.soMoHinh ?? null, engine: p.engineVersion, post: p.worthGoingBase !== undefined };
  };
  const put = (r: Row | null) => { if (!r) return; const i = rows.findIndex(x => x.date === r.date && x.key === r.key); if (i >= 0) rows[i] = r; else rows.push(r); };
  for (const f of files.filter(f => f.endsWith('-satellite.json'))) {
    for (const o of JSON.parse(readFileSync(`${dir}/${f}`, 'utf-8'))) {
      if (o.verdict === 'BLOCKED_ABOVE' || o.verdict === 'NO_DATA') continue;
      put(mk(o.date, o.key, 'vệ tinh', o.verdict === 'SEA_CONFIRMED' || o.verdict === 'SEA_MARGINAL'));
    }
  }
  const fbFile = `${dir}/fb-auto-reports.json`;
  if (existsSync(fbFile)) for (const r of JSON.parse(readFileSync(fbFile, 'utf-8'))) {
    if (!fbUsable(r)) continue;
    if (r.timeOfDay && r.timeOfDay !== 'DAWN') continue;
    put(mk(r.date, r.spotKey, 'facebook', r.seaLevel === 'BELOW' || r.seaLevel === 'AT_EYE'));
  }
  const rep = `${dir}/field-reports.json`;
  if (existsSync(rep)) for (const r of JSON.parse(readFileSync(rep, 'utf-8'))) {
    const key = r.spotKey || nameToKey(r.locationName);
    if (!key) continue;
    const POS = r.seaLevel === 'BELOW' || r.seaLevel === 'AT_EYE';
    if (r.timeOfDay && r.timeOfDay !== 'DAWN' && !(POS && r.timeOfDay !== 'NIGHT')) continue;
    put(mk(r.date, key, 'người đi', POS));
  }
  return rows;
}

// ---- thống kê ----
export function clopperUpper(k: number, n: number, conf = 0.95): number {   // cận trên một phía của tỷ lệ, tìm nhị phân
  if (n === 0) return NaN; if (k >= n) return 1;
  const cdf = (p: number) => { let s = 0, c = 1; for (let i = 0; i <= k; i++) { if (i > 0) c = c * (n - i + 1) / i; s += c * Math.pow(p, i) * Math.pow(1 - p, n - i); } return s; };
  let lo = k / n, hi = 1; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (cdf(m) > 1 - conf) lo = m; else hi = m; } return hi;
}
function mulberry32(a: number) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const epochDay = (d: string) => Math.floor(Date.parse(d + 'T00:00:00Z') / 86400000);
const f1 = (tp: number, fp: number, fn: number) => (2 * tp + fp + fn) ? 2 * tp / (2 * tp + fp + fn) : NaN;
const blocked = (r: Row) => r.gate === 'khong';              // chua_co_du_lieu / LOI / null => KHÔNG chặn (đăng ký)
const kept = (r: Row) => r.worth && !blocked(r);

export interface Cnt { tp: number; fp: number; fn: number; tn: number; gtp: number; gfp: number; gfn: number }
export function count(set: Row[]): Cnt {
  const c = { tp: 0, fp: 0, fn: 0, tn: 0, gtp: 0, gfp: 0, gfn: 0 };
  for (const r of set) {
    if (r.sea) { r.worth ? c.tp++ : c.fn++; kept(r) ? c.gtp++ : c.gfn++; } else { r.worth ? c.fp++ : c.tn++; if (kept(r)) c.gfp++; }
  }
  return c;
}
export const f1Of = f1;
export const lossFA = (c: Cnt) => c.fp ? (c.fp - c.gfp) / c.fp : NaN;
export const lossTP = (c: Cnt) => c.tp ? (c.tp - c.gtp) / c.tp : NaN;
export function blockBootstrap(set: Row[], draws = BOOT, seed = SEED) {
  const blocks = new Map<number, Row[]>();
  for (const r of set) { const b = Math.floor(epochDay(r.date) / BLOCK_DAYS); (blocks.get(b) ?? blocks.set(b, []).get(b)!).push(r); }
  const arr = [...blocks.values()]; const rnd = mulberry32(seed);
  const a: number[] = [], d: number[] = []; let skipped = 0;
  for (let i = 0; i < draws; i++) {
    const s: Row[] = []; for (let j = 0; j < arr.length; j++) s.push(...arr[Math.floor(rnd() * arr.length)]);
    const c = count(s); const lf = lossFA(c), lt = lossTP(c);
    if (Number.isNaN(lf) || Number.isNaN(lt)) { skipped++; continue; }
    a.push(lf); d.push(lf - lt);
  }
  const q = (v: number[], p: number) => { const x = [...v].sort((m, n) => m - n); return x.length ? x[Math.floor(p * (x.length - 1))] : NaN; };
  return { p5Loss: q(a, 0.05), p5Diff: q(d, 0.05), skipped, usable: a.length, blocks: arr.length };
}

export type KV = 'DAT' | 'TRUOT' | 'CHUA_DU';
export interface EngineEval { cv: Cnt; cf: Cnt; cp: Cnt; bs: ReturnType<typeof blockBootstrap>; faRows: Row[]; K: Record<string, KV>; noDataVT: number; verdict: 'DU_DIEU_KIEN' | 'KHONG_GIU' | 'CHUA_DU' }
const days = (s: Row[]) => new Set(s.map(r => r.date)).size;
const share = (s: Row[], f: (r: Row) => string) => { const m = new Map<string, number>(); s.forEach(r => m.set(f(r), (m.get(f(r)) || 0) + 1)); return s.length ? Math.max(...m.values()) / s.length : 0; };
export const noDataOf = (s: Row[]) => s.filter(r => r.gate !== 'co' && r.gate !== 'co_the' && r.gate !== 'khong').length;
/** Tiêu chí K1-K6 đóng băng (NHAT-KY-HIEU-CHINH.md, gd355) cho MỘT phiên bản engine. Dùng chung cho công cụ chấm và vòng tự động (g2448). */
export function evaluateEngine(v: Row[], fl: Row[], pe: Row[]): EngineEval {
  const cv = count(v), cf = count(fl), cp = count(pe);
  const bs = blockBootstrap(v);
  const faRows = v.filter(r => r.worth && !r.sea);
  const K: Record<string, KV> = {
    K1: cv.fp < 40 || days(faRows) < 15 ? 'CHUA_DU' : (lossFA(cv) * 100 >= X_PCT && share(faRows, r => r.date) <= 0.2 && share(faRows, r => r.key) <= 0.25 ? 'DAT' : 'TRUOT'),
    K2: Number.isNaN(bs.p5Loss) ? 'CHUA_DU' : (bs.p5Loss > 0 && bs.p5Diff > 0 ? 'DAT' : 'TRUOT'),
    K3: cv.tp < 8 || Number.isNaN(lossFA(cv)) ? 'CHUA_DU' : ((lossTP(cv) <= lossFA(cv) - 0.15 && f1(cv.gtp, cv.gfp, cv.gfn) >= f1(cv.tp, cv.fp, cv.fn)) ? 'DAT' : 'TRUOT'),
    K4: cf.tp + cf.fn < 8 ? 'CHUA_DU' : (cf.gtp === cf.tp && f1(cf.gtp, cf.gfp, cf.gfn) >= f1(cf.tp, cf.fp, cf.fn) ? 'DAT' : 'TRUOT'),
    K5: cp.tp + cp.fn < 8 ? 'CHUA_DU' : (cp.gtp === cp.tp ? 'DAT' : 'TRUOT'),
    K6: cf.tp < 8 || Number.isNaN(lossTP(cf)) || Number.isNaN(lossFA(cf)) ? 'CHUA_DU' : ((lossTP(cf) > lossFA(cf)) ? 'TRUOT' : 'DAT'),
  };
  const all = Object.values(K);
  const noDataVT = noDataOf(v);
  const lowData = noDataVT / Math.max(1, v.length) > 0.1;
  const verdict = all.includes('TRUOT') ? 'KHONG_GIU' : (all.every(x => x === 'DAT') && !lowData ? 'DU_DIEU_KIEN' : 'CHUA_DU');
  return { cv, cf, cp, bs, faRows, K, noDataVT, verdict };
}

function main() {
  if (process.argv.includes('--kiem-nhan')) {
    const all = buildRows(DIR, false);
    for (const src of ['người đi', 'facebook', 'vệ tinh']) console.log(`nhãn ${src}: ${all.filter(r => r.src === src).length}`);
    return;
  }
  const rows = buildRows(DIR, true);
  const today = arg('--hom-nay') || new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
  const field = rows.filter(r => r.src !== 'vệ tinh'), person = rows.filter(r => r.src === 'người đi'), vt = rows.filter(r => r.src === 'vệ tinh');
  const noData = noDataOf;
  const ready = isReady(field, today);
  console.log(`Điểm-ngày có cột agyGate và có nhãn: ${rows.length} (VT ${vt.length} / ${days(vt)} ngày, FIELD ${field.length} / ${days(field)} ngày, trong đó người đi ${person.length})`);
  const snaps = readdirSync(DIR).filter(f => f.endsWith('-forecast.json')).map(f => JSON.parse(readFileSync(`${DIR}/${f}`, 'utf-8'))).filter(j => j.spots.some((s: any) => 'agyGate' in s));
  const sp = snaps.flatMap(j => j.spots);
  console.log(`Bản chụp có cột: ${snaps.length} ngày, ${sp.length} điểm; lỗi bộ chuyển đổi ${sp.filter((s: any) => s.agyGate?.error).length}, chua_co_du_lieu ${sp.filter((s: any) => s.agyGate?.ketLuan === 'chua_co_du_lieu').length}`);
  for (const [n, s] of [['VT', vt], ['FIELD', field]] as const) {
    const c = count(s as Row[]);
    console.log(`  ${n}: CloudHunter báo đúng ${c.tp}, bỏ sót ${c.fn}, báo nhầm ${c.fp}, đúng-không ${c.tn}; thiếu dữ liệu cổng ${noData(s as Row[])}/${s.length}; ngày ${days(s as Row[])}`);
  }
  const engines = [...new Set(rows.map(r => r.engine))];
  if (engines.length > 1) console.log(`⚠️ ${engines.length} phiên bản engine trong tập (${engines.join(', ')}): chấm tách theo phiên bản.`);
  if (process.argv.includes('--xem-trung-gian') && existsSync('data/agy-gate-flag.json') && JSON.parse(readFileSync('data/agy-gate-flag.json', 'utf-8')).auto) {
    console.log('Từ chối: vòng tự động (g2448) đang giữ phép chấm, không xem trung gian.'); process.exit(2);
  }
  if (!ready && !process.argv.includes('--xem-trung-gian')) {
    console.log(`\nCHƯA TỚI NGÀY CHẤM (FIELD ${field.length}/30, hôm nay ${today} < 2026-12-20): số phụ thuộc cổng bị ẩn theo đăng ký "chấm MỘT lần".`);
    return;
  }
  if (!ready) { appendFileSync('data/agy-gate-runs.log', `${new Date().toISOString()} xem-trung-gian FIELD=${field.length} VT=${vt.length}\n`); console.log('\n⚠️ XEM TRUNG GIAN (đã ghi data/agy-gate-runs.log) - KHÔNG phải lần chấm chính thức.'); }
  else appendFileSync('data/agy-gate-runs.log', `${new Date().toISOString()} CHAM FIELD=${field.length} VT=${vt.length}\n`);

  for (const eng of engines) {
    const v = vt.filter(r => r.engine === eng), fl = field.filter(r => r.engine === eng), pe = person.filter(r => r.engine === eng);
    const { cv, cf, cp, bs, K } = evaluateEngine(v, fl, pe);
    console.log(`\n=== ENGINE ${eng} ===`);
    console.log(`VT: lossFA ${(lossFA(cv) * 100).toFixed(1)}% (${cv.fp - cv.gfp}/${cv.fp}), lossTP ${(lossTP(cv) * 100).toFixed(1)}% (${cv.tp - cv.gtp}/${cv.tp}); F1 CloudHunter ${(f1(cv.tp, cv.fp, cv.fn) * 100).toFixed(1)}% -> G ${(f1(cv.gtp, cv.gfp, cv.gfn) * 100).toFixed(1)}%`);
    console.log(`    bootstrap khối ${BLOCK_DAYS} ngày (${bs.blocks} khối, ${bs.usable}/${BOOT} lần dùng được): p5 lossFA ${(bs.p5Loss * 100).toFixed(1)}%, p5 (lossFA-lossTP) ${(bs.p5Diff * 100).toFixed(1)}%`);
    console.log(`FIELD: lossFA ${(lossFA(cf) * 100).toFixed(1)}% (${cf.fp - cf.gfp}/${cf.fp}), lossTP ${(lossTP(cf) * 100).toFixed(1)}% (${cf.tp - cf.gtp}/${cf.tp}, cận trên 95% ${(clopperUpper(cf.tp - cf.gtp, cf.tp) * 100).toFixed(0)}%); F1 ${(f1(cf.tp, cf.fp, cf.fn) * 100).toFixed(1)}% -> ${(f1(cf.gtp, cf.gfp, cf.gfn) * 100).toFixed(1)}%`);
    console.log(`NGƯỜI ĐI: ca CÓ ${cp.tp + cp.fn}, mất ${cp.tp - cp.gtp}`);
    console.log('Tiêu chí:', Object.entries(K).map(([k, v]) => `${k}=${v}`).join('  '));
    const all = Object.values(K);
    console.log(all.every(x => x === 'DAT') ? '=> ĐỦ ĐIỀU KIỆN ĐỀ XUẤT BẬT (vẫn phải qua Luật cổng + anh duyệt)' : all.includes('TRUOT') ? '=> KHÔNG GIỮ' : '=> CHƯA ĐỦ MẪU: giữ bóng, chấm lại cùng ngưỡng');
    const noD = noData(v) / Math.max(1, v.length);
    if (noD > 0.1) console.log(`⚠️ thiếu dữ liệu cổng ${(noD * 100).toFixed(0)}% điểm-ngày VT > 10%: kết quả VT chỉ là 'chưa đủ'`);
    console.log(`Báo thêm: số điểm khác nhau ${new Set(v.map(r => r.key)).size}; số mô hình hợp lệ TB ${(v.reduce((s, r) => s + (r.nMod ?? 0), 0) / Math.max(1, v.length)).toFixed(2)}; nhánh sương tầm nhìn: TẮT 100% (bản chụp không có visibility)`);
  }
}
if (!process.env.VITEST) main();
