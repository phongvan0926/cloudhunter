/** Đo đáy thung lũng DEM cho mọi điểm và ghi data/valley-dem-seed.json. KHÔNG chụp dự báo. */
if (typeof (globalThis as any).localStorage === 'undefined') {
  const mem = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => { mem.set(k, v); },
    removeItem: (k: string) => { mem.delete(k); },
  };
}
import { seedValleyCache, dumpValleyCache } from './valley-seed';
import { valleyElevationsForAll } from '../services/rankingService';
console.log('nạp', seedValleyCache());
valleyElevationsForAll(m => console.log('  ' + m)).then(() => {
  console.log('bảng đáy:', dumpValleyCache(), 'điểm');
}).catch(e => { console.error('❌', e?.message || e); process.exit(1); });
