/**
 * ab-cloudtop.ts - chấm 4 biến thể estimateCloudTop (đã đăng ký trước trong NHAT-KY-HIEU-CHINH.md,
 * 30/10/2026) trên CÙNG một mẻ dữ liệu thô do replay-raw.ts lấy. Không thêm biến thể sau khi xem kết quả.
 *
 *   npx --no-install vite-node scripts/ab-cloudtop.ts <raw-cache.json>
 */
import { readdirSync, readFileSync, existsSync } from 'fs';
import { MOUNTAIN_DB } from '../constants/mountains';
import { scoreOneModel, combineModels, isWorthGoing, CloudTopOpts } from '../services/cloudScoreEngine';
import { fbUsable } from './fb-auto';
import { cleanLowCloudTop } from './audit-cloud-top';

const DIR = 'data/observations';
const raw = JSON.parse(readFileSync(process.argv[2], 'utf-8')).days as Record<string, Record<string, any>>;
const VARIANTS: Record<string, CloudTopOpts> = {
  V0: {}, V1: { interp: true }, V2a: { rhCloudy: 90 }, V2: { interp: true, rhCloudy: 90 },
};
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

// 1) Bảng đúng / bỏ sót / báo nhầm theo luật "đáng đi", theo nguồn và theo nhóm
function tally(sel: (r: Row) => boolean, label: string) {
  const sub = have.filter(sel);
  const line = Object.keys(VARIANTS).map(v => {
    let tp = 0, fn = 0, fp = 0, tn = 0;
    for (const r of sub) { const w = res[v].get(r.date + r.key)!.worth; if (r.truth && w) tp++; else if (r.truth) fn++; else if (w) fp++; else tn++; }
    return `${v}: đúng ${tp} sót ${fn} nhầm ${fp} đúng-không ${tn}`;
  });
  console.log(`  ${label.padEnd(22)} n=${String(sub.length).padStart(4)} | ${line.join(' | ')}`);
}
console.log('\n== Luật "đáng đi" theo NGUỒN ==');
for (const s of ['người đi', 'facebook', 'vệ tinh']) tally(r => r.src === s, s);
tally(r => r.src !== 'vệ tinh', 'người đi + facebook');
console.log('\n== Theo NHÓM (mọi nguồn) ==');
for (const g of ['>=2400m', '<2400m', 'Ba Vì', 'Tà Xùa', 'Fansipan']) tally(r => grp(r, MOUNTAIN_DB[r.key].elevation) === g, g);
console.log('\n== Theo NHÓM, riêng người đi + facebook ==');
for (const g of ['>=2400m', '<2400m', 'Ba Vì', 'Tà Xùa', 'Fansipan']) tally(r => r.src !== 'vệ tinh' && grp(r, MOUNTAIN_DB[r.key].elevation) === g, g);

// 2) Sai số mặt mây so với vệ tinh (chỉ ngày vệ tinh SEA và có >=2 khung mây thấp sạch)
console.log('\n== Sai số mặt mây (vệ tinh - app), ngày vệ tinh thấy biển mây, khung sạch ==');
for (const g of ['>=2400m', '<2400m', 'all']) {
  const line = Object.keys(VARIANTS).map(v => {
    const d: number[] = [];
    for (const r of have) {
      if (!r.sat || !(r.sat.verdict === 'SEA_CONFIRMED' || r.sat.verdict === 'SEA_MARGINAL')) continue;
      if (g !== 'all' && grp(r, MOUNTAIN_DB[r.key].elevation) !== g && !(g === '>=2400m' && MOUNTAIN_DB[r.key].elevation >= 2400) && !(g === '<2400m' && MOUNTAIN_DB[r.key].elevation < 2400)) continue;
      const c = cleanLowCloudTop(r.sat); const o = res[v].get(r.date + r.key)!;
      if (c.top === null || o.top === null) continue;
      d.push(c.top - o.top);
    }
    return `${v}: n=${d.length} trung vị ${Math.round(med(d))}m |sai số| ${Math.round(med(d.map(Math.abs)))}m trong±200m ${(100 * d.filter(x => Math.abs(x) <= 200).length / Math.max(1, d.length)).toFixed(0)}%`;
  });
  console.log(`  ${g.padEnd(8)} ${line.join(' | ')}`);
}
// 3) Mặt mây dựng trong ngày vệ tinh quang (>=2400m)
console.log('\n== Ngày vệ tinh CLEAR, đỉnh >=2400m: app vẫn dựng mặt mây? ==');
for (const v of Object.keys(VARIANTS)) {
  const sub = have.filter(r => r.sat?.verdict === 'CLEAR' && MOUNTAIN_DB[r.key].elevation >= 2400);
  const built = sub.filter(r => res[v].get(r.date + r.key)!.top !== null).length;
  const worth = sub.filter(r => res[v].get(r.date + r.key)!.worth).length;
  console.log(`  ${v}: n=${sub.length} dựng mặt mây ${built} (${(100 * built / Math.max(1, sub.length)).toFixed(0)}%) khuyên đi ${worth}`);
}
// 4) Ca đổi kết luận so với V0
for (const v of ['V1', 'V2a', 'V2']) {
  console.log(`\n== Ca đổi "đáng đi" ${v} so với V0 ==`);
  for (const r of have) {
    const a = res.V0.get(r.date + r.key)!, b = res[v].get(r.date + r.key)!;
    if (a.worth === b.worth) continue;
    const kq = (a.worth ? '' : '') + (r.truth ? (b.worth ? 'ĐÚNG hơn (bắt thêm)' : 'SÓT thêm') : (b.worth ? 'NHẦM thêm' : 'bớt nhầm'));
    console.log(`  ${r.date} ${r.key.padEnd(22)} ${r.src.padEnd(8)} sự thật ${r.truth ? 'CÓ ' : 'KHÔNG'} | V0 ${a.score} ${a.status} top ${a.top} -> ${v} ${b.score} ${b.status} top ${b.top} | ${kq}`);
  }
}
