/**
 * snapshot-forecast.ts — CHỤP LẠI app đã dự báo gì cho rạng sáng một ngày, để sau này đối
 * chiếu với sự thật (vệ tinh / báo cáo thực địa) mà không cần gọi lại API.
 *
 * Phải chụp TRƯỚC hoặc ĐÚNG ngày đó: Open-Meteo chỉ phục vụ lại quá khứ gần, chụp muộn là
 * mất bằng chứng. Đây là mắt xích khiến vòng kiểm chứng chạy được lâu dài.
 *
 * Chạy (nên đặt lịch chạy hằng ngày lúc ~20h giờ VN cho rạng sáng hôm sau):
 *   npx vite-node scripts/snapshot-forecast.ts            # rạng sáng NGÀY MAI
 *   npx vite-node scripts/snapshot-forecast.ts 2026-08-25
 */
if (typeof (globalThis as any).localStorage === 'undefined') {
  const mem = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => { mem.set(k, v); },
    removeItem: (k: string) => { mem.delete(k); },
  };
}
import { mkdirSync, writeFileSync } from 'fs';
import { rankSpotsForDawn } from '../services/rankingService';
import { vnTodayStr, addDaysStr } from '../services/weatherService';
import { ENGINE_VERSION } from '../services/cloudScoreEngine';

const DATE = process.argv[2] || addDaysStr(vnTodayStr(), 1);

rankSpotsForDawn(DATE, m => console.log('   ' + m)).then(rows => {
  mkdirSync('data/observations', { recursive: true });
  const path = `data/observations/${DATE}-forecast.json`;
  writeFileSync(path, JSON.stringify({
    date: DATE,
    engineVersion: ENGINE_VERSION,
    snapshotAt: new Date().toISOString(),
    spots: rows.map(r => ({
      key: r.key, name: r.name, score: r.score, status: r.status,
      agreement: r.agreement, observerAlt: r.elevation, valleyElevation: r.valleyElev,
      perModel: r.perModel,
    })),
  }, null, 2) + '\n');
  console.log(`✅ ${rows.length} điểm → ${path} (${ENGINE_VERSION})`);
}).catch(e => { console.error('❌', e?.message || e); process.exit(1); });
