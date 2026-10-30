/** rh-vs-cc.ts - đo H4/H5 (NHAT-KY-HIEU-CHINH.md, 30/10/2026): mặt mây dựng từ cc trực tiếp hay chỉ RH. */
import { readdirSync, readFileSync } from 'fs';
import { MOUNTAIN_DB } from '../constants/mountains';
import { scoreOneModel } from '../services/cloudScoreEngine';
import { cleanLowCloudTop } from './audit-cloud-top';
const DIR = 'data/observations';
const raw = JSON.parse(readFileSync(process.argv[2], 'utf-8')).days;
const sat = new Map<string, any>();
for (const f of readdirSync(DIR).filter(f => f.endsWith('-satellite.json')))
  for (const o of JSON.parse(readFileSync(`${DIR}/${f}`, 'utf-8'))) sat.set(o.date + o.key, o);
const med = (a: number[]) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : NaN; };
interface R { date: string; v: string; direct: boolean; mid: number; err: number | null }
const rows: R[] = []; let noTop = 0, tot = 0;
for (const [date, spots] of Object.entries<any>(raw)) for (const [key, e] of Object.entries<any>(spots)) {
  const o = sat.get(date + key); if (!o || !MOUNTAIN_DB[key] || MOUNTAIN_DB[key].elevation < 2400) continue;
  if (o.verdict === 'BLOCKED_ABOVE' || o.verdict === 'NO_DATA') continue;
  for (const [m, d] of Object.entries<any>(e.per)) {
    tot++;
    const s = scoreOneModel(m as any, d, e.ctx, date); if (s.cloudTop === null) { noTop++; continue; }
    const lay = (d.levels ?? []).filter((l: any) => l.h > e.ctx.valleyElevation && l.h <= s.cloudTop! - 150 + 1);
    const direct = lay.some((l: any) => Number.isFinite(l.cc) && l.cc >= 45);
    const c = cleanLowCloudTop(o);
    rows.push({ date, v: o.verdict, direct, mid: d.cloud_mid_dawn, err: c.top !== null && (o.verdict.startsWith('SEA')) ? c.top - s.cloudTop : null });
  }
}
console.log(`Đỉnh >=2400m, mô hình×điểm×ngày: ${tot}, không dựng mặt mây: ${noTop}, có: ${rows.length}`);
const grp = (f: (r: R) => boolean) => rows.filter(f);
for (const [name, f] of [['CLEAR', (r: R) => r.v === 'CLEAR'], ['SEA_*', (r: R) => r.v.startsWith('SEA')], ['FOGGED_IN', (r: R) => r.v === 'FOGGED_IN']] as const) {
  const g = grp(f); const only = g.filter(r => !r.direct).length;
  console.log(`  ${name.padEnd(10)} n=${String(g.length).padStart(4)} ngày=${new Set(g.map(r => r.date)).size} | chỉ RH ${only} (${(100 * only / Math.max(1, g.length)).toFixed(0)}%) | cloud_mid trung vị ${med(g.map(r => r.mid)).toFixed(0)}%`);
}
const e = rows.filter(r => r.err !== null);
const mx = e.map(r => r.mid), ey = e.map(r => r.err!);
const rank = (a: number[]) => a.map(x => a.filter(y => y < x).length + a.filter(y => y === x).length / 2);
const corr = (a: number[], b: number[]) => { const ma = a.reduce((x, y) => x + y, 0) / a.length, mb = b.reduce((x, y) => x + y, 0) / b.length; let n = 0, da = 0, db = 0; a.forEach((x, i) => { n += (x - ma) * (b[i] - mb); da += (x - ma) ** 2; db += (b[i] - mb) ** 2; }); return n / Math.sqrt(da * db); };
console.log(`Sai số (TV - app) vs cloud_mid_dawn, ngày SEA: n=${e.length} Spearman ${corr(rank(mx), rank(ey)).toFixed(2)}`);
const direct = e.filter(r => r.direct), only = e.filter(r => !r.direct);
console.log(`  sai số trung vị: có mây trực tiếp ${med(direct.map(r => r.err!)).toFixed(0)}m (n=${direct.length}) · chỉ RH ${med(only.map(r => r.err!)).toFixed(0)}m (n=${only.length})`);
