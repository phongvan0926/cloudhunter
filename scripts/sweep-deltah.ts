/**
 * sweep-deltah.ts — quét ngưỡng ΔH của LUẬT ĐÁNG ĐI trên toàn bộ lịch sử đã chấm.
 * Dùng đúng cách ghép cặp (dự báo × sự thật) của calibrate.ts, chỉ thay mỗi điều kiện ΔH.
 * Mục đích: chọn ngưỡng bằng SỐ ĐO, và nhìn rõ mỗi bước siết thì MẤT ngày nào.
 *   npx vite-node scripts/sweep-deltah.ts
 */
import { readdirSync, readFileSync, existsSync } from 'fs';
import { MOUNTAIN_DB } from '../constants/mountains';
import { WORTH_GOING_AGREEMENT, verdictOf, ENGINE_VERSION } from '../services/cloudScoreEngine';

const DIR = 'data/observations';
/** Cache do replay-engine.ts tạo: kết quả của ENGINE HIỆN TẠI trên chính những ngày đã có sự
 *  thật. Có nó thì quét ngưỡng mới có nghĩa — bản chụp cũ (engine ≤2.3) không hề có ΔH. */
const REPLAY = process.argv[2];
type Truth = 'SEA' | 'NO_SEA';
interface Row { date: string; key: string; name: string; truth: Truth; truthSrc: string;
  status: string; agreement: number; deltaH?: number | null; replayed?: boolean }

function nameToKey(name: string): string | null {
  if (MOUNTAIN_DB[name]) return name;
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
  const t = norm(name);
  for (const [k, m] of Object.entries(MOUNTAIN_DB)) {
    if (norm(m.name) === t) return k;
    if ((m.aliases || []).some(a => norm(a) === t)) return k;
  }
  return null;
}

let replay: Record<string, Record<string, any>> | null = null;
if (REPLAY) {
  const j = JSON.parse(readFileSync(REPLAY, 'utf-8'));
  if (j.engine !== ENGINE_VERSION)
    throw new Error(`Cache replay là của ${j.engine} nhưng engine hiện tại là ${ENGINE_VERSION} — chạy lại replay-engine.ts`);
  replay = j.days;
  console.log(`\n(dùng cache tính lại bằng ${j.engine} lúc ${j.ranAt} — KHÔNG phải thứ app đã hiện hôm đó:\n Open-Meteo có sửa lại quá khứ, số này chỉ dùng để so CÁC LUẬT với nhau)`);
}
const files = readdirSync(DIR);
const fc: Record<string, Record<string, any>> = {};
for (const f of files.filter(f => f.endsWith('-forecast.json'))) {
  const j = JSON.parse(readFileSync(`${DIR}/${f}`, 'utf-8'));
  fc[j.date] = Object.fromEntries(j.spots.map((s: any) => [s.key, s]));
}
/** Ưu tiên số tính lại bằng engine hiện tại; không có thì rơi về bản chụp. */
function pick(date: string, key: string, snap: any) {
  const r = replay?.[date]?.[key];
  return r ? { status: r.status, agreement: r.agreement, deltaH: r.deltaH, replayed: true }
           : { status: snap?.status, agreement: snap?.agreement ?? 0, deltaH: snap?.deltaH, replayed: false };
}

const rows: Row[] = [];
for (const f of files.filter(f => f.endsWith('-satellite.json'))) {
  for (const o of JSON.parse(readFileSync(`${DIR}/${f}`, 'utf-8'))) {
    const p = fc[o.date]?.[o.key];
    if (!p) continue;
    if (o.verdict === 'BLOCKED_ABOVE' || o.verdict === 'NO_DATA') continue;
    rows.push({ date: o.date, key: o.key, name: o.name,
      truth: (o.verdict === 'SEA_CONFIRMED' || o.verdict === 'SEA_MARGINAL') ? 'SEA' : 'NO_SEA',
      truthSrc: 'vệ tinh', ...pick(o.date, o.key, p) });
  }
}
const repoReports = `${DIR}/field-reports.json`;
if (existsSync(repoReports)) {
  for (const r of JSON.parse(readFileSync(repoReports, 'utf-8'))) {
    const key = r.spotKey || nameToKey(r.locationName);
    if (!key) continue;
    const p = fc[r.date]?.[key];
    const status = r.predictedStatus ?? p?.status;
    if (status === undefined) continue;
    const row: Row = { date: r.date, key, name: MOUNTAIN_DB[key]?.name || r.locationName,
      truth: (r.seaLevel === 'BELOW' || r.seaLevel === 'AT_EYE') ? 'SEA' : 'NO_SEA',
      truthSrc: 'người đi', ...pick(r.date, key, p ?? { status, agreement: 0 }) };
    const i = rows.findIndex(x => x.date === r.date && x.key === key);
    if (i >= 0) rows[i] = row; else rows.push(row);
  }
}

const pred = (r: Row, thr: number) =>
  verdictOf(r.status as any) === 'SEA' && r.agreement >= WORTH_GOING_AGREEMENT
  && r.deltaH !== null && r.deltaH !== undefined && r.deltaH > thr;

const noDeltaH = rows.filter(r => r.deltaH === undefined).length;
if (noDeltaH) console.log(`\n⚠️  ${noDeltaH}/${rows.length} dòng vẫn KHÔNG có ΔH (bản chụp engine cũ, replay chưa phủ tới)`
  + ` → những dòng đó luôn "không khuyên" ở MỌI ngưỡng, làm mọi cột dưới đây lệch theo hướng bi quan.`);
const nReplay = rows.filter(r => r.replayed).length;
if (replay) console.log(`   phủ được ${nReplay}/${rows.length} dòng bằng engine hiện tại; `
  + `${rows.length - nReplay} dòng còn lại vẫn là bản chụp của engine lúc đó.`);
console.log(`\n📐 Quét ngưỡng ΔH — ${rows.length} cặp `
  + `(${rows.filter(r => r.truthSrc === 'người đi').length} người đi, ${rows.filter(r => r.truthSrc === 'vệ tinh').length} vệ tinh)\n`);
console.log('  ΔH >    khuyên đi   đúng   nhầm   bỏ sót   độ chính xác   bắt được');
const THRS = [0, 50, 100, 150, 200, 250, 300, 400, 500];
const kept: Record<number, Row[]> = {};
for (const thr of THRS) {
  const rec = rows.filter(r => pred(r, thr));
  kept[thr] = rec;
  const tp = rec.filter(r => r.truth === 'SEA').length;
  const fp = rec.length - tp;
  const fn = rows.filter(r => r.truth === 'SEA' && !pred(r, thr)).length;
  const prec = rec.length ? tp / rec.length * 100 : NaN;
  const recall = tp + fn ? tp / (tp + fn) * 100 : NaN;
  console.log(`  ${String(thr).padStart(4)}m  ${String(rec.length).padStart(9)}  ${String(tp).padStart(5)}  `
    + `${String(fp).padStart(5)}  ${String(fn).padStart(7)}  ${(Number.isNaN(prec)?'—':prec.toFixed(0)+'%').padStart(13)}  `
    + `${(Number.isNaN(recall)?'—':recall.toFixed(0)+'%').padStart(8)}`);
}
for (let i = 1; i < THRS.length; i++) {
  const lost = kept[THRS[i-1]].filter(a => !kept[THRS[i]].some(b => b.date === a.date && b.key === a.key));
  if (!lost.length) continue;
  console.log(`\n  Siết ${THRS[i-1]}m → ${THRS[i]}m thì MẤT ${lost.length} lượt khuyên:`);
  for (const r of lost.sort((a,b)=>(a.deltaH!-b.deltaH!)))
    console.log(`     ${r.truth === 'SEA' ? '❌ mất ngày THẬT CÓ' : '✅ bỏ được ngày nhầm'}  `
      + `${r.date} ${r.name} — ΔH ${r.deltaH}m (${r.truthSrc})`);
}

// Bảng chi tiết: mọi dòng SỰ THẬT LÀ CÓ biển mây, kèm ΔH — để thấy ngưỡng nào cắt vào đâu.
console.log(`\n  Tất cả ${rows.filter(r => r.truth === 'SEA').length} ngày SỰ THẬT CÓ biển mây:`);
for (const r of rows.filter(r => r.truth === 'SEA').sort((a, b) => (a.deltaH ?? -9e9) - (b.deltaH ?? -9e9)))
  console.log(`     ΔH ${String(r.deltaH ?? '—').padStart(6)}m  ${r.status.padEnd(13)} đồng thuận ${String(r.agreement).padStart(3)}%  `
    + `${r.date} ${r.name} (${r.truthSrc}${r.replayed ? ', tính lại' : ', bản chụp cũ'})`);
