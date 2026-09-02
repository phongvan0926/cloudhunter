/**
 * rank-now.ts — Chạy đúng bảng "Đêm nay đi đâu săn mây?" ngoài trình duyệt để đối chiếu
 * với thực tế. Chạy: npx vite-node scripts/rank-now.ts [YYYY-MM-DD]
 */
if (typeof (globalThis as any).localStorage === 'undefined') {
  const mem = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => { mem.set(k, v); },
    removeItem: (k: string) => { mem.delete(k); },
  };
}
import { rankSpotsForDawn } from '../services/rankingService';
import { vnTodayStr, addDaysStr } from '../services/weatherService';
import { STATUS_TEXT } from '../services/cloudScoreEngine';

const DATE = process.argv[2] || addDaysStr(vnTodayStr(), 1);
const SEA = ['STATIC', 'FLOWING', 'FLUCTUATING', 'ROLLING']; // FOG = chìm trong mây, KHÔNG phải có biển mây

rankSpotsForDawn(DATE, m => console.log('   ' + m)).then(rows => {
  console.log(`\n🌄 Xếp hạng rạng sáng ${DATE} — ${rows.length} điểm\n`);
  rows.slice(0, 15).forEach((r, i) => {
    console.log(`${r.worthGoing ? '✅' : '  '}${String(i + 1).padStart(2)}. ${String(r.score).padStart(3)}/100  ${r.status.padEnd(12)} `
      + `${r.name.slice(0, 34).padEnd(36)} đứng ${String(r.elevation).padStart(4)}m / đáy ${String(r.valleyElev).padStart(4)}m`
      + `  ΔH ${r.deltaH === null ? '   —' : String(Math.round(r.deltaH)).padStart(5) + 'm'}  đồng thuận ${r.agreement}%`);
  });
  const sea = rows.filter(r => SEA.includes(r.status));
  const worth = rows.filter(r => r.worthGoing);
  console.log(`\n   ${sea.length}/${rows.length} điểm có trạng thái thuộc nhóm CÓ MÂY, `
    + `${worth.length} điểm ĐÁNG ĐI (có biển mây + đồng thuận ≥50% + đứng trên mặt mây)`);
}).catch(e => { console.error('❌', e?.message || e); process.exit(1); });
