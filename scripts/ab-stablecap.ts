/**
 * ab-stablecap.ts - chấm V0 với VS (kẹp mặt mây ở tầng ổn định, đăng ký trước 27/11/2026, phiếu gee64,
 * NHAT-KY-HIEU-CHINH.md) trên CÙNG một mẻ dữ liệu thô do replay-raw.ts lấy. Không thêm biến thể sau khi xem kết quả.
 *
 *   npx --no-install vite-node scripts/ab-stablecap.ts <raw-cache.json>
 */
import { readdirSync, readFileSync, existsSync } from 'fs';
import { MOUNTAIN_DB } from '../constants/mountains';
import { scoreOneModel, combineModels, isWorthGoing, CloudTopOpts } from '../services/cloudScoreEngine';
import { fbUsable } from './fb-auto';
import { cleanLowCloudTop } from './audit-cloud-top';

const DIR = 'data/observations';
const raw = JSON.parse(readFileSync(process.argv[2], 'utf-8')).days as Record<string, Record<string, any>>;
const VARIANTS: Record<string, CloudTopOpts> = { V0: {}, VS: { stableCap: true } };
type Src = 'người đi' | 'facebook' | 'vệ tinh';
interface Row { date: string; key: string; truth: boolean; src: Src; sat?: any }
const rows = new Map<string, Row>();
const snaps = new Set(readdirSync(DIR).filter(f => f.endsWith('-forecast.json')).map(f => f.slice(0, 10)));
const satAll: any[] = [];
for (const f of readdirSync(DIR).filter(f => f.endsWith('-satellite.json')))
  for (const o of JSON.parse(readFileSync(`${DIR}/${f}`, 'utf-8'))) {
    satAll.push(o);
    if (!snaps.has(o.date) || o.verdict === 'BLOCKED_ABOVE' || o.verdict === 'NO_DATA') continue;
    rows.set(o.date + o.key, { date: o.date, key: o.key, truth: o.verdict === 'SEA_CONFIRMED' || o.verdict === 'SEA_MARGINAL', src: 'vệ tinh', sat: o });
  }
const satByK = new Map(satAll.map(o => [o.date + o.key, o]));
for (const r of JSON.parse(readFileSync(`${DIR}/fb-auto-reports.json`, 'utf-8'))) {
  if (!fbUsable(r) || (r.timeOfDay && r.timeOfDay !== 'DAWN') || !snaps.has(r.date)) continue;
  rows.set(r.date + r.spotKey, { date: r.date, key: r.spotKey, truth: r.seaLevel === 'BELOW' || r.seaLevel === 'AT_EYE', src: 'facebook', sat: satByK.get(r.date + r.spotKey) });
}
for (const r of JSON.parse(readFileSync(`${DIR}/field-reports.json`, 'utf-8'))) {
  if (!r.spotKey || (r.timeOfDay && r.timeOfDay !== 'DAWN') || !snaps.has(r.date)) continue;
  rows.set(r.date + r.spotKey, { date: r.date, key: r.spotKey, truth: r.seaLevel === 'BELOW' || r.seaLevel === 'AT_EYE', src: 'người đi', sat: satByK.get(r.date + r.spotKey) });
}

interface Out { score: number; status: string; worth: boolean; top: number | null }
function run(row: Row, v: string): Out | null {
  const e = raw[row.date]?.[row.key]; if (!e) return null;
  const per = Object.entries(e.per).map(([m, d]: any) => scoreOneModel(m, d, e.ctx, row.date, { cloudTop: VARIANTS[v] }));
  if (!per.length) return null;
  const c = combineModels(per);
  const dH = c.cloudTop !== null ? e.ctx.observerAlt - c.cloudTop : null;
  const worth = isWorthGoing({ status: c.status, agreement: c.agreement, deltaH: dH } as any);
  return { score: c.score, status: c.status, worth, top: c.cloudTop };
}
const med = (a: number[]) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : NaN; };
const grp = (r: Row, alt: number) => r.key === 'BA_VI' || r.key.startsWith('BA_VI') ? 'Ba Vì' : r.key === 'TA_XUA_SON_LA' ? 'Tà Xùa' : r.key === 'FANSIPAN' ? 'Fansipan' : alt >= 2400 ? '>=2400m' : '<2400m';

const res: Record<string, Map<string, Out>> = {};
for (const v of Object.keys(VARIANTS)) {
  res[v] = new Map();
  for (const r of rows.values()) { const o = run(r, v); if (o) res[v].set(r.date + r.key, o); }
}
const have = [...rows.values()].filter(r => res.V0.has(r.date + r.key));
console.log(`Hàng có sự thật: ${rows.size}, có dữ liệu thô: ${have.length}`);
console.log('Theo nguồn:', ['người đi', 'facebook', 'vệ tinh'].map(s => `${s} ${have.filter(r => r.src === s).length}`).join(' · '));
const k = (r: Row) => r.date + r.key;
function cm(sub: Row[], v: string) {
  let tp = 0, fn = 0, fp = 0, tn = 0;
  for (const r of sub) { const w = res[v].get(k(r))!.worth; if (r.truth && w) tp++; else if (r.truth) fn++; else if (w) fp++; else tn++; }
  return { tp, fn, fp, tn };
}
function tally(sel: (r: Row) => boolean, label: string) {
  const sub = have.filter(sel);
  console.log(`  ${label.padEnd(22)} n=${String(sub.length).padStart(4)} | ` + Object.keys(VARIANTS).map(v => { const c = cm(sub, v); return `${v}: đúng ${c.tp} sót ${c.fn} nhầm ${c.fp} đúng-không ${c.tn}`; }).join(' | '));
}
console.log('\n== Luật "đáng đi" theo NGUỒN ==');
for (const s of ['người đi', 'facebook', 'vệ tinh']) tally(r => r.src === s, s);
tally(r => r.src !== 'vệ tinh', 'người đi + facebook');
for (const only of [false, true]) {
  console.log(`\n== Theo NHÓM${only ? ', riêng người đi + facebook' : ' (mọi nguồn)'} ==`);
  for (const g of ['>=2400m', '<2400m', 'Ba Vì', 'Tà Xùa', 'Fansipan']) tally(r => (!only || r.src !== 'vệ tinh') && grp(r, MOUNTAIN_DB[r.key].elevation) === g, g);
}
// tỉ lệ ca VS thực sự đổi mặt mây
const changedTop = have.filter(r => res.V0.get(k(r))!.top !== res.VS.get(k(r))!.top).length;
console.log(`\nVS đổi mặt mây ở ${changedTop}/${have.length} hàng (${(100 * changedTop / have.length).toFixed(1)}%)`);
// tiêu chí 4: balanced accuracy vệ tinh, bootstrap theo ngày
const sat = have.filter(r => r.src === 'vệ tinh');
const bacc = (sub: Row[], v: string) => { const c = cm(sub, v); return ((c.tp / Math.max(1, c.tp + c.fn)) + (c.tn / Math.max(1, c.tn + c.fp))) / 2; };
const byDay = new Map<string, Row[]>(); for (const r of sat) (byDay.get(r.date) ?? byDay.set(r.date, []).get(r.date)!).push(r);
const days = [...byDay.keys()];
let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const diffs: number[] = [];
for (let b = 0; b < 2000; b++) { const s: Row[] = []; for (let i = 0; i < days.length; i++) s.push(...byDay.get(days[Math.floor(rnd() * days.length)])!); diffs.push(bacc(s, 'VS') - bacc(s, 'V0')); }
diffs.sort((a, b) => a - b);
console.log(`Vệ tinh balanced accuracy: V0 ${bacc(sat, 'V0').toFixed(3)} VS ${bacc(sat, 'VS').toFixed(3)} | VS-V0 KTC95% [${diffs[49].toFixed(3)}, ${diffs[1949].toFixed(3)}] (${days.length} ngày)`);
console.log(`\n== Ca đổi "đáng đi" VS so với V0 ==`);
for (const r of have) {
  const a = res.V0.get(k(r))!, b = res.VS.get(k(r))!;
  if (a.worth === b.worth) continue;
  const kq = r.truth ? (b.worth ? 'ĐÚNG hơn (bắt thêm)' : 'SÓT thêm') : (b.worth ? 'NHẦM thêm' : 'bớt nhầm');
  console.log(`  ${r.date} ${r.key.padEnd(22)} ${r.src.padEnd(8)} sự thật ${r.truth ? 'CÓ ' : 'KHÔNG'} | V0 ${a.score} ${a.status} top ${a.top} -> VS ${b.score} ${b.status} top ${b.top} | ${kq}`);
}
console.log(`\n== Ca người đi/FB đổi TRẠNG THÁI hoặc mặt mây (không đổi đáng đi) ==`);
for (const r of have.filter(r => r.src !== 'vệ tinh')) {
  const a = res.V0.get(k(r))!, b = res.VS.get(k(r))!;
  if (a.worth !== b.worth || (a.status === b.status && a.top === b.top)) continue;
  console.log(`  ${r.date} ${r.key.padEnd(22)} ${r.src.padEnd(8)} sự thật ${r.truth ? 'CÓ ' : 'KHÔNG'} | V0 ${a.score} ${a.status} top ${a.top} -> VS ${b.score} ${b.status} top ${b.top}`);
}
