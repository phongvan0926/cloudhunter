/**
 * valley-seed.ts - đáy thung lũng từ DEM là ĐỊA HÌNH (không đổi), nhưng máy chạy GitHub Actions bắt đầu
 * với localStorage trống, nên MỖI lần chụp dự báo phải gọi lại Elevation API cho cả 26 điểm. 13/11/2026
 * API đó "fetch failed" suốt 27 phút (4 lần thử) và mất vĩnh viễn bản chụp 14/11, dù chính lượt dự báo
 * mới là thứ cần. Giải pháp: lưu bảng đáy đã đo vào data/valley-dem-seed.json (có vân tay toạ độ như
 * cache gốc), nạp vào cache trước khi chạy, ghi lại sau khi chạy. Sửa toạ độ một điểm thì vân tay lệch
 * và điểm đó tự đo lại (getCachedValley), nên không có drift ngầm.
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { readValleyCache } from '../services/weatherService';

export const SEED_PATH = 'data/valley-dem-seed.json';
const CACHE_KEY = 'cloudhunter_valley_dem_v2'; // phải khớp VALLEY_CACHE_KEY trong weatherService

/** Nạp bảng đã lưu vào cache (chỉ thêm điểm cache chưa có). */
export function seedValleyCache(): number {
  if (!existsSync(SEED_PATH)) return 0;
  try {
    const seed = JSON.parse(readFileSync(SEED_PATH, 'utf-8'));
    const cur = readValleyCache();
    let n = 0;
    for (const [k, e] of Object.entries(seed as Record<string, any>)) {
      if (!cur[k] && typeof (e as any)?.v === 'number') { cur[k] = e as any; n++; }
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cur));
    return n;
  } catch (e: any) { console.error('⚠️ không nạp được ' + SEED_PATH + ': ' + (e?.message || e)); return 0; }
}

/** Ghi cache hiện tại ra file (gộp với file cũ, giữ thứ tự khoá ổn định để diff gọn). */
export function dumpValleyCache(): number {
  const cur = readValleyCache();
  let old: Record<string, any> = {};
  try { if (existsSync(SEED_PATH)) old = JSON.parse(readFileSync(SEED_PATH, 'utf-8')); } catch { /* ghi đè file hỏng */ }
  const all = { ...old, ...cur };
  const sorted = Object.fromEntries(Object.keys(all).sort().map(k => [k, all[k]]));
  const text = JSON.stringify(sorted, null, 1) + '\n';
  if (!existsSync(SEED_PATH) || readFileSync(SEED_PATH, 'utf-8') !== text) writeFileSync(SEED_PATH, text);
  return Object.keys(sorted).length;
}
