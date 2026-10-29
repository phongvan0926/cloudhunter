/**
 * audit-cloud-top.ts - ĐO SAI SỐ ĐỘ CAO MẶT MÂY THẬT: so `cloudTop` trong bản chụp dự báo
 * tối hôm trước với đỉnh mây tầng thấp mà vệ tinh Himawari-9 (AHI CldTopHght 2km) đo được
 * lúc rạng sáng.
 *
 * Vì sao cần (AGENTS.md mục Ky Quan San 13/10/2026):
 *   Sáng 13/10 mặt biển mây thật nằm ở 2.800-3.060m trong khi app tính ~1.710m (thấp hơn ~1.100m,
 *   lề an toàn ΔH khai gấp 5-10 lần thật). Trước khi sửa `estimateCloudTop`, phải đo sai số ΔH
 *   thật trên toàn kho nhiều ngày thay cho con số giả định "±200m".
 *
 * Hai bẫy dữ liệu phải lọc ngay trong công cụ (đo thật trên kho):
 *   1. Tệp vệ tinh trước 05/10 có fill `-999` chưa lọc -> bỏ mọi `top_m < 0`.
 *   2. `verify_satellite.py` gán `SEA_CONFIRMED`/`SEA_MARGINAL` khi >= 2/5 khung có biển mây, nhưng
 *      trường `cloudTopMedian_m` lại lấy trung vị trên CẢ 5 khung kể cả khung có mây tầng cao bay
 *      ngang (vd Lảo Thẩn 26/10: SEA_MARGINAL nhưng `cloudTopMedian_m = 4.302m`). Vì vậy công cụ này
 *      tính lại trung vị CHỈ trên các khung mây tầng thấp hợp lệ (`valley + 150 < top_m < 6.000` và
 *      `top_m <= observerAlt + 1.500`), đúng ngưỡng `classify()` của `verify_satellite.py`.
 *
 * Chỉ đọc `data/observations/`, không gọi mạng, không ghi tệp.
 *
 * Chạy:
 *   npx --no-install vite-node scripts/audit-cloud-top.ts
 *   npx --no-install vite-node scripts/audit-cloud-top.ts 2026-10-13 2026-10-29
 *   npx --no-install vite-node scripts/audit-cloud-top.ts --spot FANSIPAN
 */
import { existsSync, readdirSync, readFileSync } from 'fs';
import { MOUNTAIN_DB } from '../constants/mountains';

const DIR = 'data/observations';
const HIGH_CLOUD_M = 6000;
const SEPARATE_DECK_M = 1500;
const MARGIN_ABOVE_VALLEY = 150;

interface ForecastSpot {
  key: string;
  name: string;
  score: number;
  status: string;
  agreement: number;
  observerAlt?: number;
  valleyElevation?: number;
  cloudTop?: number | null;
  deltaH?: number | null;
  worthGoing?: boolean;
  perModel?: { model: string; score: number; status: string; cloudTop: number | null }[];
}

export interface SatFrame {
  vn: string;
  top_m: number | null;
  emiss: number | null;
}

export interface SatEntry {
  key: string;
  name: string;
  date: string;
  verdict: string;
  observerAlt: number;
  valleyElevation: number;
  cloudTopMedian_m: number | null;
  frames?: SatFrame[];
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function pctl(xs: number[], p: number): number {
  const s = [...xs].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.max(0, Math.round((s.length - 1) * p)));
  return s[idx];
}

export function cleanLowCloudTop(o: SatEntry): { top: number | null; contaminated: boolean; lowFrames: number } {
  const ceiling = Math.min(HIGH_CLOUD_M, o.observerAlt + SEPARATE_DECK_M);
  const floor = o.valleyElevation + MARGIN_ABOVE_VALLEY;
  if (Array.isArray(o.frames) && o.frames.length > 0) {
    const validAll = o.frames.map(f => f.top_m).filter((t): t is number => t !== null && t >= 0);
    const low = validAll.filter(t => t > floor && t <= ceiling);
    const contaminated = o.cloudTopMedian_m !== null && o.cloudTopMedian_m > ceiling && low.length >= 2;
    return { top: low.length >= 2 ? Math.round(median(low)) : null, contaminated, lowFrames: low.length };
  }
  const raw = o.cloudTopMedian_m;
  if (raw !== null && raw > floor && raw <= ceiling) {
    return { top: Math.round(raw), contaminated: false, lowFrames: 2 };
  }
  return { top: null, contaminated: false, lowFrames: 0 };
}

function fmtSigned(n: number): string {
  const r = Math.round(n);
  return (r >= 0 ? '+' : '') + r + 'm';
}

function summarizeDiffs(label: string, diffs: number[]) {
  if (!diffs.length) {
    console.log(`  ${label.padEnd(46)} n=   0`);
    return;
  }
  const abs = diffs.map(d => Math.abs(d));
  const medBias = median(diffs);
  const meanBias = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const medMae = median(abs);
  const within200 = Math.round(abs.filter(a => a <= 200).length / diffs.length * 100);
  const within500 = Math.round(abs.filter(a => a <= 500).length / diffs.length * 100);
  const p25 = pctl(diffs, 0.25);
  const p75 = pctl(diffs, 0.75);
  console.log(
    `  ${label.padEnd(46)} n=${String(diffs.length).padStart(4)} | `
    + `lệch (sat-app): trung vị ${fmtSigned(medBias).padStart(7)} (IQR ${fmtSigned(p25)}..${fmtSigned(p75)}, TB ${fmtSigned(meanBias)}) | `
    + `|sai số| TV ${String(Math.round(medMae) + 'm').padStart(5)} | <=200m: ${String(within200).padStart(2)}% · <=500m: ${String(within500).padStart(2)}%`
  );
}

function main() {
  if (!existsSync(DIR)) {
    throw new Error(`Chưa có thư mục ${DIR}.`);
  }
  const args = process.argv.slice(2);
  let spotFilter: string | null = null;
  const dateFilter = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--spot' && args[i + 1]) {
      spotFilter = args[++i];
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(args[i])) {
      dateFilter.add(args[i]);
    }
  }

  const files = readdirSync(DIR);
  const fc: Record<string, Record<string, ForecastSpot>> = {};
  for (const f of files.filter(x => x.endsWith('-forecast.json')).sort()) {
    const j = JSON.parse(readFileSync(`${DIR}/${f}`, 'utf-8'));
    if (dateFilter.size && !dateFilter.has(j.date)) continue;
    fc[j.date] = Object.fromEntries((j.spots || []).map((s: ForecastSpot) => [s.key, s]));
  }

  interface Pair {
    date: string;
    key: string;
    name: string;
    obs: number;
    valley: number;
    verdict: string;
    satTop: number;
    appTop: number;
    diff: number; // satTop - appTop (>0 nghĩa là mặt mây thật CAO HƠN app tính -> app khai khống ΔH)
    status: string;
    score: number;
    worthGoing: boolean;
    perModel: { model: string; status: string; cloudTop: number | null }[];
  }

  const pairs: Pair[] = [];
  let lowDeckNoAppTop = 0;
  let contaminatedFixed = 0;
  const clearRows: { date: string; key: string; obs: number; appTop: number | null; status: string; worthGoing: boolean }[] = [];

  for (const f of files.filter(x => x.endsWith('-satellite.json')).sort()) {
    const arr: SatEntry[] = JSON.parse(readFileSync(`${DIR}/${f}`, 'utf-8'));
    for (const o of arr) {
      if (dateFilter.size && !dateFilter.has(o.date)) continue;
      if (spotFilter && o.key !== spotFilter) continue;
      const p = fc[o.date]?.[o.key];
      if (!p) continue;
      if (o.verdict === 'BLOCKED_ABOVE' || o.verdict === 'NO_DATA') continue;

      const obs = p.observerAlt ?? o.observerAlt ?? MOUNTAIN_DB[o.key]?.elevation ?? 0;
      const clean = cleanLowCloudTop(o);
      if (clean.contaminated) contaminatedFixed++;

      if (o.verdict === 'CLEAR') {
        if (clean.lowFrames === 0 && p.cloudTop !== undefined) {
          clearRows.push({
            date: o.date,
            key: o.key,
            obs,
            appTop: p.cloudTop ?? null,
            status: p.status,
            worthGoing: !!p.worthGoing,
          });
        }
        continue;
      }

      // SEA_CONFIRMED, SEA_MARGINAL, FOGGED_IN
      if (clean.top === null) continue;
      if (p.cloudTop === null || p.cloudTop === undefined) {
        lowDeckNoAppTop++;
        continue;
      }
      pairs.push({
        date: o.date,
        key: o.key,
        name: o.name,
        obs,
        valley: p.valleyElevation ?? o.valleyElevation,
        verdict: o.verdict,
        satTop: clean.top,
        appTop: Math.round(p.cloudTop),
        diff: clean.top - Math.round(p.cloudTop),
        status: p.status,
        score: p.score,
        worthGoing: !!p.worthGoing,
        perModel: p.perModel || [],
      });
    }
  }

  const uniqueDays = [...new Set(pairs.map(p => p.date))].sort();
  console.log(`\n📏 Kiểm định độ cao mặt mây (bản chụp dự báo × vệ tinh Himawari-9)`);
  console.log(`   ${pairs.length} cặp có mặt mây tầng thấp trên ${uniqueDays.length} ngày`
    + (lowDeckNoAppTop ? ` · ${lowDeckNoAppTop} ca vệ tinh thấy mây thấp nhưng app trả cloudTop=null` : '')
    + (contaminatedFixed ? ` · đã lọc ${contaminatedFixed} ca trung vị vệ tinh lẫn khung mây cao` : ''));
  console.log(`   Quy ước dấu: (sat - app) > 0 nghĩa là mặt mây THẬT cao hơn app tính (app khai khống khoảng hở ΔH).\n`);

  summarizeDiffs('Toàn bộ ca có mây thấp (SEA + FOGGED_IN)', pairs.map(p => p.diff));
  summarizeDiffs('  ├─ Khi vệ tinh báo BIỂN MÂY (SEA_*)', pairs.filter(p => p.verdict.startsWith('SEA_')).map(p => p.diff));
  summarizeDiffs('  ├─ Khi vệ tinh báo TRÙM ĐỈNH (FOGGED_IN)', pairs.filter(p => p.verdict === 'FOGGED_IN').map(p => p.diff));
  summarizeDiffs('  ├─ Khi app KHUYÊN ĐI (worthGoing=true)', pairs.filter(p => p.worthGoing).map(p => p.diff));
  summarizeDiffs('  ├─ Đỉnh cao >= 2.400m', pairs.filter(p => p.obs >= 2400).map(p => p.diff));
  summarizeDiffs('  └─ Núi thấp / tầm trung < 2.400m', pairs.filter(p => p.obs < 2400).map(p => p.diff));

  // Theo từng mô hình
  const byModel = new Map<string, { diffs: number[]; allTops: number[] }>();
  for (const d of Object.values(fc)) {
    for (const s of Object.values(d)) {
      if (spotFilter && s.key !== spotFilter) continue;
      for (const pm of s.perModel || []) {
        if (pm.cloudTop === null || pm.cloudTop === undefined) continue;
        const rec = byModel.get(pm.model) ?? { diffs: [], allTops: [] };
        rec.allTops.push(pm.cloudTop);
        byModel.set(pm.model, rec);
      }
    }
  }
  for (const p of pairs) {
    for (const pm of p.perModel) {
      if (pm.cloudTop === null || pm.cloudTop === undefined) continue;
      const rec = byModel.get(pm.model) ?? { diffs: [], allTops: [] };
      rec.diffs.push(p.satTop - pm.cloudTop);
      byModel.set(pm.model, rec);
    }
  }

  console.log(`\n  THEO TỪNG MÔ HÌNH (sai số khi có mây thấp + tỉ lệ ghim cụm lưới trên toàn bản chụp):`);
  for (const [m, rec] of [...byModel.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    summarizeDiffs(`  • ${m}`, rec.diffs);
    if (rec.allTops.length) {
      const pin800 = Math.round(rec.allTops.filter(t => t >= 2150 && t <= 2235).length / rec.allTops.length * 100);
      const pin700 = Math.round(rec.allTops.filter(t => t >= 3500 && t <= 3620).length / rec.allTops.length * 100);
      console.log(`      ghim lưới trên ${rec.allTops.length} lượt có cloudTop: cụm ~2.200m (800hPa+150) = ${pin800}% · cụm ~3.550m (700hPa+400) = ${pin700}%`);
    }
  }

  // Theo từng ngày (chỉ in ngày có >= 5 điểm đo được, hoặc khi người dùng truyền ngày cụ thể)
  const minDayCount = dateFilter.size ? 1 : 5;
  const byDay = new Map<string, Pair[]>();
  for (const p of pairs) {
    const arr = byDay.get(p.date) ?? [];
    arr.push(p);
    byDay.set(p.date, arr);
  }
  const bigDays = [...byDay.entries()].filter(([, arr]) => arr.length >= minDayCount).sort((a, b) => a[0].localeCompare(b[0]));
  console.log(`\n  THEO NGÀY (các ngày có >= ${minDayCount} điểm đo được mặt mây thấp: ${bigDays.length} ngày):`);
  for (const [d, arr] of bigDays) {
    const diffs = arr.map(x => x.diff);
    const satMed = Math.round(median(arr.map(x => x.satTop)));
    const appMed = Math.round(median(arr.map(x => x.appTop)));
    console.log(
      `    ${d}  n=${String(arr.length).padStart(2)} | app TV ${String(appMed + 'm').padStart(6)} vs vệ tinh TV ${String(satMed + 'm').padStart(6)} `
      + `| lệch TV ${fmtSigned(median(diffs)).padStart(7)} (|sai số| TV ${Math.round(median(diffs.map(Math.abs)))}m)`
    );
  }

  if (dateFilter.size || spotFilter) {
    console.log(`\n  CHI TIẾT TỪNG ĐIỂM:`);
    for (const p of pairs) {
      console.log(
        `    ${p.date} ${p.key.padEnd(20)} đứng ${String(p.obs).padStart(4)}m | app ${String(p.appTop).padStart(4)}m (${p.status.padEnd(11)}) `
        + `vs sat ${String(p.satTop).padStart(4)}m (${p.verdict.padEnd(13)}) | sat-app = ${fmtSigned(p.diff).padStart(7)}`
      );
    }
  }

  // Mặt kia của lỗi: dựng mặt mây trong ngày CLEAR (nhất là đỉnh >= 2.400m nơi vệ tinh không mù sương thung lũng)
  const clearHigh = clearRows.filter(r => r.obs >= 2400);
  if (clearHigh.length) {
    const built = clearHigh.filter(r => r.appTop !== null).length;
    const wgClear = clearHigh.filter(r => r.worthGoing).length;
    console.log(`\n  MẶT ĐỐI DIỆN - ngày vệ tinh QUANG cả 5 khung ở đỉnh >= 2.400m (${clearHigh.length} cặp):`);
    console.log(`    engine vẫn dựng cloudTop khác null ở ${built}/${clearHigh.length} cặp (${Math.round(built / clearHigh.length * 100)}%), `
      + `và khuyên đi ở ${wgClear}/${clearHigh.length} cặp (${Math.round(wgClear / clearHigh.length * 100)}%).`);
  }
}

if (typeof process !== 'undefined' && !process.env.VITEST) {
  main();
}
