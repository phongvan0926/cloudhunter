/**
 * ab-valley.ts - chấm nhánh A (thung lũng = toạ độ đỉnh, hạ elevation) với nhánh B (toạ độ điểm thung lũng THẬT
 * dò bằng DEM 20 km) trên CÙNG mẻ dữ liệu do replay-valley.ts lấy. Điều kiện ĐẠT chốt trước trong
 * NHAT-KY-HIEU-CHINH.md mục "dự báo tại điểm thung lũng" (19/11/2026); không thêm biến thể sau khi xem kết quả.
 *
 *   npx --no-install vite-node scripts/ab-valley.ts <raw.json>
 */
import { readdirSync, readFileSync } from 'fs';
import { MOUNTAIN_DB } from '../constants/mountains';
import { scoreOneModel, combineModels, isWorthGoing } from '../services/cloudScoreEngine';
import { fbUsable } from './fb-auto';
import { cleanLowCloudTop } from './audit-cloud-top';

const DIR = 'data/observations';
const RAW = JSON.parse(readFileSync(process.argv[2], 'utf-8'));
const raw = RAW.days as Record<string, Record<string, any>>;
const vp = RAW.vp as Record<string, { lat: number; lon: number; dem: number; km: number }>;
type Src = 'người đi' | 'facebook' | 'vệ tinh';
interface Row { date: string; key: string; truth: boolean; src: Src; sat?: any }

// Sự thật: người đi > Facebook > vệ tinh (ghi đè theo thứ tự tăng dần độ tin), giống ab-cloudtop.ts
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
function run(row: Row, arm: 'A' | 'B'): Out | null {
  const e = raw[row.date]?.[row.key]; if (!e) return null;
  const per = Object.entries(e['per' + arm]).map(([m, d]: any) => scoreOneModel(m, d, e['ctx' + arm], row.date));
  if (!per.length) return null;
  const c = combineModels(per);
  const dH = c.cloudTop !== null ? e['ctx' + arm].observerAlt - c.cloudTop : null;
  return { score: c.score, status: c.status, worth: isWorthGoing({ status: c.status, agreement: c.agreement, deltaH: dH } as any), top: c.cloudTop };
}
const med = (a: number[]) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : NaN; };
const elev = (k: string) => MOUNTAIN_DB[k].elevation;
const grp = (r: Row) => r.key === 'BA_VI' ? 'Ba Vì' : r.key === 'TA_XUA_SON_LA' ? 'Tà Xùa' : r.key === 'FANSIPAN' ? 'Fansipan' : elev(r.key) >= 2400 ? '>=2400m' : '<2400m';
const inGroup = (r: Row, g: string) => g === '>=2400m' ? elev(r.key) >= 2400 : g === '<2400m' ? elev(r.key) < 2400 : grp(r) === g;

const res = { A: new Map<string, Out>(), B: new Map<string, Out>() };
for (const r of rows.values()) {
  const a = run(r, 'A'), b = run(r, 'B');
  if (a && b) { res.A.set(r.date + r.key, a); res.B.set(r.date + r.key, b); }
}
const have = [...rows.values()].filter(r => res.A.has(r.date + r.key));
const K = (r: Row) => r.date + r.key;
console.log(`Hàng có sự thật: ${rows.size}, có dữ liệu thô cả hai nhánh: ${have.length}`);
console.log('Theo nguồn:', (['người đi', 'facebook', 'vệ tinh'] as Src[]).map(s => `${s} ${have.filter(r => r.src === s).length}`).join(' · '));
console.log(`Số ngày: ${new Set(have.map(r => r.date)).size} (người đi + FB: ${new Set(have.filter(r => r.src !== 'vệ tinh').map(r => r.date)).size})`);

function conf(sub: Row[], arm: 'A' | 'B') {
  let tp = 0, fn = 0, fp = 0, tn = 0;
  for (const r of sub) { const w = res[arm].get(K(r))!.worth; if (r.truth && w) tp++; else if (r.truth) fn++; else if (w) fp++; else tn++; }
  const ba = ((tp + fn ? tp / (tp + fn) : NaN) + (fp + tn ? tn / (fp + tn) : NaN)) / 2;
  return { tp, fn, fp, tn, ba };
}
const fmt = (c: ReturnType<typeof conf>) => `đúng ${c.tp} sót ${c.fn} nhầm ${c.fp} đúng-không ${c.tn} BA ${isNaN(c.ba) ? '-' : c.ba.toFixed(3)}`;
function tally(sel: (r: Row) => boolean, label: string) {
  const sub = have.filter(sel);
  console.log(`  ${label.padEnd(22)} n=${String(sub.length).padStart(4)} | A: ${fmt(conf(sub, 'A'))} | B: ${fmt(conf(sub, 'B'))}`);
}
console.log('\n== Luật "đáng đi" theo NGUỒN ==');
for (const s of ['người đi', 'facebook', 'vệ tinh']) tally(r => r.src === s, s);
tally(r => r.src !== 'vệ tinh', 'người đi + facebook');
tally(() => true, 'mọi nguồn');
console.log('\n== Theo NHÓM (mọi nguồn) ==');
for (const g of ['>=2400m', '<2400m', 'Ba Vì', 'Tà Xùa', 'Fansipan']) tally(r => inGroup(r, g), g);
console.log('\n== Theo NHÓM, riêng người đi + facebook ==');
for (const g of ['>=2400m', '<2400m', 'Ba Vì', 'Tà Xùa', 'Fansipan']) tally(r => r.src !== 'vệ tinh' && inGroup(r, g), g);

// Bốn điều kiện chốt trước
const hf = have.filter(r => r.src !== 'vệ tinh');
const cA = conf(hf, 'A'), cB = conf(hf, 'B'), allA = conf(have, 'A'), allB = conf(have, 'B');
const days = [...new Set(have.map(r => r.date))].sort();
const fpByDay = new Map(days.map(d => [d, [0, 0]]));
for (const r of have) if (!r.truth) { const v = fpByDay.get(r.date)!; if (res.A.get(K(r))!.worth) v[0]++; if (res.B.get(K(r))!.worth) v[1]++; }
let seed = 20261119; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const diffs: number[] = [];
for (let i = 0; i < 2000; i++) { let s = 0; for (let j = 0; j < days.length; j++) { const v = fpByDay.get(days[Math.floor(rnd() * days.length)])!; s += v[0] - v[1]; } diffs.push(s); }
diffs.sort((x, y) => x - y);
const lo = diffs[Math.floor(0.05 * diffs.length)], hi = diffs[Math.floor(0.95 * diffs.length) - 1];
const c1 = cB.fn <= cA.fn, c2 = allB.fp <= 0.8 * allA.fp, c3 = lo > 0, c4 = cB.ba >= cA.ba;
console.log('\n== ĐIỀU KIỆN ĐẠT (chốt trước) ==');
console.log(`  1. sót người đi+FB: A ${cA.fn} B ${cB.fn} -> ${c1 ? 'ĐẠT' : 'TRƯỢT'}`);
console.log(`  2. nhầm mọi nguồn: A ${allA.fp} B ${allB.fp} (trần 0,8×A = ${(0.8 * allA.fp).toFixed(1)}) -> ${c2 ? 'ĐẠT' : 'TRƯỢT'}`);
console.log(`  3. bootstrap ngày (n ngày ${days.length}, 2000 lần) khoảng 90% của nhầm A - nhầm B: [${lo}, ${hi}] -> ${c3 ? 'ĐẠT' : 'TRƯỢT'}`);
console.log(`  4. BA người đi+FB: A ${cA.ba.toFixed(3)} B ${cB.ba.toFixed(3)} -> ${c4 ? 'ĐẠT' : 'TRƯỢT'}`);
console.log(`  => ${c1 && c2 && c3 && c4 ? 'ĐẠT CẢ 4' : 'KHÔNG ĐẠT, không gộp vào engine'}`);
console.log(`  khuyên đi tổng: A ${allA.tp + allA.fp} (đúng ${allA.tp}) | B ${allB.tp + allB.fp} (đúng ${allB.tp})`);
const nDayFp = (arm: 0 | 1) => [...fpByDay.values()].filter(v => v[arm] > 0).length;
console.log(`  số ngày có ít nhất 1 báo nhầm: A ${nDayFp(0)} B ${nDayFp(1)}`);

// Báo cáo kèm
console.log('\n== Ngày vệ tinh CLEAR, đỉnh >=2400m ==');
for (const arm of ['A', 'B'] as const) {
  const sub = have.filter(r => r.sat?.verdict === 'CLEAR' && elev(r.key) >= 2400);
  const built = sub.filter(r => res[arm].get(K(r))!.top !== null).length, worth = sub.filter(r => res[arm].get(K(r))!.worth).length;
  console.log(`  ${arm}: n=${sub.length} dựng mặt mây ${built} (${(100 * built / Math.max(1, sub.length)).toFixed(0)}%) khuyên đi ${worth}`);
}
console.log('\n== Sai số mặt mây (vệ tinh - app), ngày vệ tinh SEA, khung sạch ==');
for (const g of ['>=2400m', '<2400m']) {
  const line = (['A', 'B'] as const).map(arm => {
    const d: number[] = []; let drop = 0, tot = 0;
    for (const r of have) {
      if (!r.sat || !(r.sat.verdict === 'SEA_CONFIRMED' || r.sat.verdict === 'SEA_MARGINAL') || !inGroup(r, g)) continue;
      tot++; const c = cleanLowCloudTop(r.sat), o = res[arm].get(K(r))!;
      if (c.top === null || o.top === null) { drop++; continue; }
      d.push(c.top - o.top);
    }
    return `${arm}: n=${d.length} (loại ${drop}/${tot}) trung vị ${Math.round(med(d))}m |sai số| ${Math.round(med(d.map(Math.abs)))}m`;
  });
  console.log(`  ${g.padEnd(8)} ${line.join(' | ')}`);
}
console.log('\n== Điểm thung lũng (nhánh B) ==');
const ks = [...new Set(have.map(r => r.key))];
const dist = ks.map(k => vp[k].km), dem = ks.map(k => vp[k].dem);
console.log(`  ${ks.length} điểm | khoảng cách trung vị ${med(dist).toFixed(1)} km, >= 19 km: ${dist.filter(x => x >= 19).length} | cao độ trung vị ${med(dem)} m, <= 20 m: ${dem.filter(x => x <= 20).length}`);
console.log(`  chênh cao đỉnh - đáy B trung vị ${med(ks.map(k => elev(k) - vp[k].dem))} m; đáy A trung vị ${med(ks.map(k => raw[days[0]]?.[k]?.ctxA?.valleyElevation ?? NaN).filter(x => !isNaN(x)))} m`);

console.log('\n== MỌI ca đổi "đáng đi" B so với A ==');
let n = 0;
for (const r of [...have].sort((x, y) => (x.date + x.key).localeCompare(y.date + y.key))) {
  const a = res.A.get(K(r))!, b = res.B.get(K(r))!;
  if (a.worth === b.worth) continue; n++;
  const kq = r.truth ? (b.worth ? 'bắt thêm' : 'SÓT thêm') : (b.worth ? 'NHẦM thêm' : 'bớt nhầm');
  console.log(`  ${r.date} ${r.key.padEnd(20)} ${r.src.padEnd(8)} sự thật ${r.truth ? 'CÓ   ' : 'KHÔNG'} | A ${a.score} ${a.status} top ${a.top} -> B ${b.score} ${b.status} top ${b.top} | ${kq}`);
}
console.log(`  (tổng ${n} ca đổi)`);
