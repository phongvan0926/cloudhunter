/**
 * dump-rank.ts — kết xuất bảng xếp hạng ra JSON để SO SÁNH TRƯỚC/SAU một thay đổi engine.
 *
 * Cách dùng (đo tác động thật, không đoán):
 *   npx vite-node scripts/dump-rank.ts truoc.json 2026-08-27 2026-08-26 …
 *   (sửa engine)
 *   npx vite-node scripts/dump-rank.ts sau.json   2026-08-27 2026-08-26 …
 *   npx vite-node scripts/diff-rank.ts truoc.json sau.json
 */
if (typeof (globalThis as any).localStorage === 'undefined') {
  const mem = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => { mem.set(k, v); },
    removeItem: (k: string) => { mem.delete(k); },
  };
}
import { writeFileSync } from 'node:fs';
import { rankSpotsForDawn } from '../services/rankingService';
import { vnTodayStr } from '../services/weatherService';

const OUT = process.argv[2];
const DATES = process.argv.slice(3).length ? process.argv.slice(3) : [vnTodayStr()];
if (!OUT) { console.error('Thiếu tên file kết xuất'); process.exit(1); }

async function main() {
  const out: any[] = [];
  for (const [i, date] of DATES.entries()) {
    // Nghỉ giữa các ngày: Open-Meteo trả 429 nếu bắn liên tiếp 50 điểm × 6 mô hình.
    if (i > 0) await new Promise(r => setTimeout(r, 45_000));
    const rows = await rankSpotsForDawn(date);
    for (const r of rows) {
      out.push({ date, key: r.key ?? r.name, name: r.name, score: r.score,
                 status: r.status, agreement: r.agreement});
    }
    console.log(`${date}: ${rows.length} điểm`);
  }
  writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.log(`→ ${OUT}  (${out.length} dòng)`);
}
main().catch(e => { console.error('❌', e?.message || e); process.exit(1); });
