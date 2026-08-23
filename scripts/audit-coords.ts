/**
 * audit-coords.ts — Đối chiếu TỌA ĐỘ thư viện với ĐỘ CAO DEM THẬT (Open-Meteo Elevation).
 * Sai tọa độ là lỗi âm thầm nguy hiểm nhất: mọi biến thời tiết vẫn "hợp lý" nhưng của
 * một nơi khác, và đáy thung lũng đo được cũng sai theo → engine chấm điểm cho nhầm chỗ.
 * Chạy: npx vite-node scripts/audit-coords.ts
 */
import { MOUNTAIN_DB } from '../constants/mountains';

const TOL = 300; // m — lệch quá ngần này là đáng ngờ

async function main() {
  const keys = Object.keys(MOUNTAIN_DB);
  const rows: { key: string; name: string; declared: number; dem: number; diff: number }[] = [];
  for (let i = 0; i < keys.length; i += 100) {
    const chunk = keys.slice(i, i + 100);
    const url = `https://api.open-meteo.com/v1/elevation`
      + `?latitude=${chunk.map(k => MOUNTAIN_DB[k].lat.toFixed(4)).join(',')}`
      + `&longitude=${chunk.map(k => MOUNTAIN_DB[k].lon.toFixed(4)).join(',')}`;
    const data = await (await fetch(url)).json();
    chunk.forEach((k, j) => {
      const dem = data.elevation?.[j];
      if (typeof dem !== 'number') return;
      const m = MOUNTAIN_DB[k];
      rows.push({ key: k, name: m.name, declared: m.elevation, dem, diff: m.elevation - dem });
    });
  }
  rows.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  console.log(`\nĐối chiếu ${rows.length}/${keys.length} điểm (DEM ~90m nên lệch ±150m ở sườn dốc là bình thường)\n`);
  console.log('lệch(m)  khai báo  DEM     điểm');
  for (const r of rows) {
    const flag = Math.abs(r.diff) > TOL ? '❌' : Math.abs(r.diff) > 150 ? '⚠️ ' : '   ';
    console.log(`${flag}${String(Math.round(r.diff)).padStart(6)}  ${String(r.declared).padStart(7)}  ${String(Math.round(r.dem)).padStart(6)}  ${r.name}  [${r.key}]`);
  }
  const bad = rows.filter(r => Math.abs(r.diff) > TOL);
  console.log(`\n❌ ${bad.length} điểm lệch > ${TOL}m — cần soi lại tọa độ`);
}
main().catch(e => { console.error('❌', e?.message || e); process.exit(1); });
