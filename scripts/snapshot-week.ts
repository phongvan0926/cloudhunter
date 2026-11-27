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
import { countCallsAs } from './count-calls';
countCallsAs('snapshot-week');   // log 1 dòng lượt gọi theo máy chủ khi kết thúc (vòng 7)
import { seedValleyCache, dumpValleyCache } from './valley-seed';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { rankSpotsForWeek, rankSpotsForWeekWithShadow, WEEK_SHADOW_MODELS } from '../services/rankingService';
import { vnTodayStr, addDaysStr } from '../services/weatherService';
import { ENGINE_VERSION } from '../services/cloudScoreEngine';

const TODAY = process.argv.filter(a => !a.startsWith('--'))[2] || vnTodayStr();
const path = `data/observations/far/${TODAY}-week.json`;
if (existsSync(path)) { console.log(`đã có ${path}, không đè (bản chụp là bằng chứng)`); process.exit(0); }

const dates = Array.from({ length: 7 }, (_, i) => addDaysStr(TODAY, i + 1));
console.log(`   nạp ${seedValleyCache()} đáy thung lũng từ data/valley-dem-seed.json`);
// Bóng 6 mô hình (gf1b7 27/11/2026): một call 6 mô hình, các trường hiển thị vẫn tính từ 3 mô hình của app.
// Gọi bóng lỗi thì lùi về đúng bảng 3 mô hình và ghi `shadowError` - bản chụp chính không được mất vì bóng.
let shadowError: string | null = null;
const load = () => rankSpotsForWeekWithShadow(TODAY, dates, m => console.log('   ' + m)).catch(e => {
  shadowError = String(e?.message || e);
  console.log(`   cảnh báo: bóng ${WEEK_SHADOW_MODELS.length} mô hình lỗi (${shadowError}), chụp lại bằng 3 mô hình`);
  return new Promise(r => setTimeout(r, 65_000)).then(() => rankSpotsForWeek(TODAY, dates, m => console.log('   ' + m)));
});
load().then(rows => {
  if (!rows.length) throw new Error('không có điểm nào - không ghi file rỗng');
  mkdirSync('data/observations/far', { recursive: true });
  writeFileSync(path, JSON.stringify({
    capturedOn: TODAY, engineVersion: ENGINE_VERSION, snapshotAt: new Date().toISOString(),
    shadowModels: shadowError ? null : WEEK_SHADOW_MODELS, ...(shadowError ? { shadowError } : {}),
    spots: rows.map(r => ({
      key: r.key, name: r.name, observerAlt: r.elevation,
      days: r.days.map(d => ({ date: d.date, lead: d.leadDays, score: d.score, status: d.status,
        agreement: d.agreement, deltaH: d.deltaH, worthGoing: d.worthGoing, capWatch: d.capWatch,
        ...(d.shadow ? { shadow: d.shadow } : {}) })),
    })),
  }) + '\n');
  console.log(`✅ ${rows.length} điểm × ${dates.length} ngày → ${path} (${ENGINE_VERSION}); bảng đáy ${dumpValleyCache()} điểm`
    + (shadowError ? '; KHÔNG có bóng 6 mô hình' : `; bóng ${rows.reduce((n, r) => n + r.days.filter(d => d.shadow).length, 0)} ô`));
}).catch(e => { console.error('❌', e?.message || e); process.exit(1); });
