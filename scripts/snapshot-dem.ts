/**
 * snapshot-dem.ts — Chụp lại độ cao DEM THẬT tại toạ độ từng điểm để test chạy OFFLINE.
 * Chạy lại mỗi khi thêm/sửa điểm trong MOUNTAIN_DB:
 *   npx vite-node scripts/snapshot-dem.ts
 */
import { writeFileSync } from 'fs';
import { MOUNTAIN_DB } from '../constants/mountains';

async function main() {
  const keys = Object.keys(MOUNTAIN_DB);
  const out: Record<string, number> = {};
  for (let i = 0; i < keys.length; i += 100) {
    const chunk = keys.slice(i, i + 100);
    const url = `https://api.open-meteo.com/v1/elevation`
      + `?latitude=${chunk.map(k => MOUNTAIN_DB[k].lat.toFixed(4)).join(',')}`
      + `&longitude=${chunk.map(k => MOUNTAIN_DB[k].lon.toFixed(4)).join(',')}`;
    const data = await (await fetch(url)).json();
    chunk.forEach((k, j) => { if (typeof data.elevation?.[j] === 'number') out[k] = data.elevation[j]; });
  }
  writeFileSync('tests/fixtures/dem-elevations.json', JSON.stringify(out, null, 2) + '\n');
  console.log(`✅ ${Object.keys(out).length}/${keys.length} điểm → tests/fixtures/dem-elevations.json`);
}
main();
