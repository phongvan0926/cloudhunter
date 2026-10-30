/**
 * snapshot-week.ts - CHỤP dự báo XA NGÀY (lead 1-7) của các điểm miền Bắc, để sau vài tuần đo được
 * dự báo 3-7 ngày đúng bao nhiêu (30/10/2026, phiếu #g28a2). Cùng nguyên tắc với snapshot-forecast.ts:
 * bản chụp là BẰNG CHỨNG, không đè; quá khứ không chụp bù được.
 *
 * Một file cho mỗi ngày chụp: data/observations/far/<ngày-chụp>-week.json, chứa cả các rạng sáng
 * ngày chụp + 1 .. + 7. Ngày chụp neo vào lịch cron (ngày UTC của lần chạy), giống job snapshot.
 *
 *   npx --no-install vite-node scripts/snapshot-week.ts <ngày-chụp>     # mặc định: hôm nay theo giờ VN
 */
if (typeof (globalThis as any).localStorage === 'undefined') {
  const mem = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => { mem.set(k, v); },
    removeItem: (k: string) => { mem.delete(k); },
  };
}
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { rankSpotsForWeek } from '../services/rankingService';
import { vnTodayStr, addDaysStr } from '../services/weatherService';
import { ENGINE_VERSION } from '../services/cloudScoreEngine';

const TODAY = process.argv.filter(a => !a.startsWith('--'))[2] || vnTodayStr();
const path = `data/observations/far/${TODAY}-week.json`;
if (existsSync(path)) { console.log(`đã có ${path}, không đè (bản chụp là bằng chứng)`); process.exit(0); }

const dates = Array.from({ length: 7 }, (_, i) => addDaysStr(TODAY, i + 1));
rankSpotsForWeek(TODAY, dates, m => console.log('   ' + m)).then(rows => {
  if (!rows.length) throw new Error('không có điểm nào - không ghi file rỗng');
  mkdirSync('data/observations/far', { recursive: true });
  writeFileSync(path, JSON.stringify({
    capturedOn: TODAY, engineVersion: ENGINE_VERSION, snapshotAt: new Date().toISOString(),
    spots: rows.map(r => ({
      key: r.key, name: r.name, observerAlt: r.elevation,
      days: r.days.map(d => ({ date: d.date, lead: d.leadDays, score: d.score, status: d.status,
        agreement: d.agreement, deltaH: d.deltaH, worthGoing: d.worthGoing })),
    })),
  }) + '\n');
  console.log(`✅ ${rows.length} điểm × ${dates.length} ngày → ${path} (${ENGINE_VERSION})`);
}).catch(e => { console.error('❌', e?.message || e); process.exit(1); });
