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
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { rankSpotsForDawn } from '../services/rankingService';
import { vnTodayStr, addDaysStr } from '../services/weatherService';
import { ENGINE_VERSION } from '../services/cloudScoreEngine';

const DATE = process.argv.filter(a => a !== '--force')[2] || addDaysStr(vnTodayStr(), 1);
const FORCE = process.argv.includes('--force');

// TÍNH TOÀN VẸN CỦA VÒNG KIỂM CHỨNG: bản chụp là BẰNG CHỨNG "app đã nói gì TRƯỚC khi biết
// sự thật". Nếu chạy lại đè lên được thì mỗi engine mới sẽ tự viết lại lịch sử của chính nó
// rồi chấm điểm mình trên đó — bảng hiệu chuẩn lập tức thành vô nghĩa mà không ai thấy.
// Muốn xem engine mới chấm ngày cũ thế nào thì dùng scripts/hindcast.ts, đừng đè bản chụp.
const path = `data/observations/${DATE}-forecast.json`;
if (existsSync(path) && !FORCE) {
  const old = JSON.parse(readFileSync(path, 'utf-8'));
  console.error(`❌ Đã có bản chụp cho ${DATE} (${old.engineVersion}, chụp lúc ${old.snapshotAt}).`);
  console.error('   Không đè: bản chụp là bằng chứng dự báo, không phải kết quả tính lại.');
  console.error('   Muốn soi engine hiện tại trên ngày này: npx vite-node scripts/hindcast.ts <KEY> ' + DATE);
  console.error('   Thật sự cần ghi đè (vd bản chụp hỏng): thêm --force');
  process.exit(1);
}

rankSpotsForDawn(DATE, m => console.log('   ' + m)).then(rows => {
  mkdirSync('data/observations', { recursive: true });
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
