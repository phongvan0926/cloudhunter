/**
 * audit-vars.ts — đối chiếu HAI CHIỀU giữa biến ĐƯỢC FETCH và biến ENGINE THẬT SỰ ĐỌC.
 *
 * Vì sao cần (lỗi thật 25/8/2026): một đợt dọn dẹp cắt `relative_humidity_2m` khỏi HOURLY_VARS
 * vì tưởng không ai dùng, nhưng valleySaturation vẫn đọc nó → rh2m_valley_night luôn NaN, nhánh
 * "ẩm sát đất ban đêm ≥92%" của bộ dò bão hoà chết lặng nhiều ngày mà 80 test vẫn xanh — vì
 * fixture gán thẳng giá trị, không đi qua tầng fetch. Đây là loại lỗi test đơn vị KHÔNG bắt được;
 * chỉ có đối chiếu tĩnh như thế này mới thấy.
 *
 * Chạy: npx vite-node scripts/audit-vars.ts   (exit 1 nếu lệch)
 */
import { readFileSync } from 'fs';
import { HOURLY_VARS, OBSERVER_VARS, PRESSURE_LEVELS } from '../services/weatherService';

const src = readFileSync('services/weatherService.ts', 'utf-8');
const read = new Set<string>();
for (const mm of src.matchAll(/pick\((?:valley|observer), '([^']+)'/g)) read.add(mm[1]);
// Profile tầng đọc qua template literal `temperature_${p}hPa` — nở ra theo PRESSURE_LEVELS
for (const mm of src.matchAll(/pick\((?:valley|observer), `([a-z_]+)_\$\{p\}hPa`/g)) {
  for (const { p: lvl } of PRESSURE_LEVELS) read.add(`${mm[1]}_${lvl}hPa`);
}

const fetched = new Set<string>([...HOURLY_VARS, ...OBSERVER_VARS].map(String));
const missing = [...read].filter(v => !fetched.has(v)).sort();
const unused = [...fetched].filter(v => !read.has(v)).sort();

console.log(`Fetch ${fetched.size} biến · engine đọc ${read.size} biến\n`);
if (missing.length) {
  console.log('❌ ĐỌC NHƯNG KHÔNG FETCH (luôn NaN/rỗng — lỗi câm):');
  for (const v of missing) console.log('   ', v);
}
if (unused.length) {
  console.log('\n⚠️  FETCH NHƯNG KHÔNG ĐỌC (tốn chi phí quy đổi):');
  for (const v of unused) console.log('   ', v);
}
if (!missing.length && !unused.length) console.log('✅ Khớp hoàn toàn.');
if (missing.length) process.exit(1);
