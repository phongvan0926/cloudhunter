/**
 * export-spots.ts — Xuất thư viện điểm ra JSON cho công cụ python (tools/verify_satellite.py).
 * Chạy: npx vite-node scripts/export-spots.ts
 */
import { writeFileSync } from 'fs';
import { MOUNTAIN_DB } from '../constants/mountains';
import { NORTHWEST_PEAKS } from '../constants';

const nameTokens = (n: string) => n.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd')
  .toLowerCase().replace(/[()]/g, ' ').split(/[^a-z0-9]+/).filter(t => t.length > 1).sort();
const same = (a: string, b: string) => {
  const [ta, tb] = [nameTokens(a), nameTokens(b)];
  if (ta.join('|') === tb.join('|')) return true;
  const [s, big] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  return s.length >= 2 && s.every(t => big.includes(t));
};

const out = Object.entries(MOUNTAIN_DB).map(([key, m]) => {
  const preset = NORTHWEST_PEAKS.find(p => p.elevation_profile?.length && same(p.name, m.name));
  const valleys = (preset?.elevation_profile || []).filter(p => p.type === 'VALLEY').map(p => p.altitude);
  return {
    key, name: m.name, lat: m.lat, lon: m.lon, elevation: m.elevation, zone: m.zone,
    valleyElevation: valleys.length ? Math.max(80, Math.min(...valleys)) : null,
    needsReview: m.needsReview ?? null,
  };
});
writeFileSync('data/spots.json', JSON.stringify(out, null, 2) + '\n');
console.log(`✅ ${out.length} điểm → data/spots.json (${out.filter(s => s.valleyElevation).length} điểm có đáy thung lũng xác thực)`);
