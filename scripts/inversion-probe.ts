/**
 * inversion-probe.ts — KIỂM TRA xem `computeInversion` có thật sự đo "nắp nghịch nhiệt"
 * hay chỉ đang đo "cột khí ẩm nên mát chậm hơn suy giảm chuẩn".
 *
 * Nghi ngờ (Tà Xùa 27/8/2026): anomaly được tính so với suy giảm chuẩn 6,5°C/km TÍNH TỪ
 * ĐÁY THUNG LŨNG. Trong một cột khí ẩm mùa mưa, suy giảm thực ~5°C/km trên toàn cột, nên
 * anomaly TĂNG ĐƠN ĐIỆU theo độ cao — và "tầng anomaly cực đại" luôn rơi vào mực CAO NHẤT
 * trong cửa sổ quét, bất kể có nắp hay không. Nếu đúng, `inv.height` là một con số vô nghĩa
 * và `capByInversion` đang kẹp đỉnh mây ở sai chỗ.
 *
 * Đối chứng: suy giảm CỤC BỘ giữa hai mực liền nhau. Nắp thật = tầng có Γ nhỏ bất thường.
 *
 * Chạy: npx vite-node scripts/inversion-probe.ts [YYYY-MM-DD ...]
 */
if (typeof (globalThis as any).localStorage === 'undefined') {
  const mem = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => { mem.set(k, v); },
    removeItem: (k: string) => { mem.delete(k); },
  };
}
import { MOUNTAIN_DB } from '../constants/mountains';
import {
  addDaysStr, vnTodayStr, aggregateDayModel, makeHourlyBlock, HOURLY_VARS, WeatherModelId,
} from '../services/weatherService';
import { valleyElevationsForAll } from '../services/rankingService';
import { computeInversion } from '../services/cloudScoreEngine';

// Chỉ 3 mô hình có đủ 7 mực áp suất — 3 mô hình còn lại chỉ có 3 mực, không đủ để bàn.
const MODELS: WeatherModelId[] = ['gfs_seamless', 'icon_seamless', 'ukmo_seamless'];
const DATES = process.argv.slice(2).length ? process.argv.slice(2) : [vnTodayStr()];

const pct = (n: number, d: number) => d ? `${Math.round(n / d * 100)}%` : '—';

async function main() {
  const valleys = await valleyElevationsForAll();
  const spots = Object.entries(MOUNTAIN_DB)
    .filter(([k, m]) => !m.needsReview && typeof valleys[k] === 'number' && valleys[k] <= m.elevation - 80);
  console.log(`${spots.length} điểm × ${MODELS.length} mô hình × ${DATES.length} ngày\n`);

  let n = 0, atCeiling = 0, strongOrMod = 0, strongAtCeiling = 0;
  const localCap: number[] = [];
  let hasLocalCap = 0, capBelowObs = 0, engineCapBelowObs = 0;

  for (const date of DATES) {
    const prev = addDaysStr(date, -1);
    const url = `https://api.open-meteo.com/v1/forecast`
      + `?latitude=${spots.map(([, m]) => m.lat.toFixed(4)).join(',')}`
      + `&longitude=${spots.map(([, m]) => m.lon.toFixed(4)).join(',')}`
      + `&elevation=${spots.map(([k]) => Math.round(valleys[k])).join(',')}`
      + `&hourly=${HOURLY_VARS.join(',')}&models=${MODELS.join(',')}`
      + `&start_date=${prev}&end_date=${date}&timezone=Asia%2FBangkok`;
    const arr: any[] = await (await fetch(url)).json();
    spots.forEach(([key, mt], i) => {
      const loc = arr[i]; if (!loc?.hourly) return;
      const block = makeHourlyBlock(loc.hourly);
      for (const model of MODELS) {
        const m = aggregateDayModel(block, block, model, date, prev);
        if (!m) continue;
        const valley = Math.round(valleys[key]);
        const inv = computeInversion(m, valley);
        const ceiling = Math.max(2600, valley + 1300);
        const scanned = (m.levels ?? [])
          .filter(l => Number.isFinite(l.t) && l.h > valley + 80 && l.h <= ceiling)
          .sort((a, b) => a.h - b.h);
        if (scanned.length < 2) continue;
        n++;
        const topScanned = scanned[scanned.length - 1].h;
        if (inv.height !== null && Math.abs(inv.height - topScanned) < 1) atCeiling++;
        if (inv.strength === 'Strong' || inv.strength === 'Moderate') {
          strongOrMod++;
          if (inv.height !== null && Math.abs(inv.height - topScanned) < 1) strongAtCeiling++;
          if (inv.height !== null && inv.height < mt.elevation) engineCapBelowObs++;
        }
        // Đối chứng: tầng ổn định CỤC BỘ thấp nhất (Γ ≤ 3,5°C/km — dưới hẳn đoạn nhiệt ẩm ~5).
        const all = (m.levels ?? []).filter(l => Number.isFinite(l.t) && l.h > valley)
          .sort((a, b) => a.h - b.h);
        let cap: number | null = null;
        for (let j = 0; j + 1 < all.length; j++) {
          const g = (all[j].t - all[j + 1].t) / (all[j + 1].h - all[j].h) * 1000;
          if (g <= 3.5 && all[j].h <= ceiling) { cap = all[j].h; break; }
        }
        if (cap !== null) { hasLocalCap++; localCap.push(cap); if (cap < mt.elevation) capBelowObs++; }
      }
    });
  }

  console.log(`Tổng số ca (điểm×mô hình×ngày, có ≥2 mực):        ${n}`);
  console.log(`inv.height ĐÚNG BẰNG mực cao nhất trong cửa sổ:   ${atCeiling}  (${pct(atCeiling, n)})`);
  console.log(`  → nếu tỉ lệ này gần 100%, "độ cao nghịch nhiệt" chỉ là trần cửa sổ quét.\n`);
  console.log(`Ca được chấm Strong/Moderate:                     ${strongOrMod}  (${pct(strongOrMod, n)})`);
  console.log(`  trong đó height nằm ở mực cao nhất:             ${strongAtCeiling}  (${pct(strongAtCeiling, strongOrMod)})`);
  console.log(`  trong đó nắp nằm DƯỚI chỗ đứng:                 ${engineCapBelowObs}  (${pct(engineCapBelowObs, strongOrMod)})\n`);
  console.log(`── Đối chứng: tầng ổn định cục bộ Γ ≤ 3,5°C/km ─────────────────`);
  console.log(`Ca tìm được tầng ổn định cục bộ:                  ${hasLocalCap}  (${pct(hasLocalCap, n)})`);
  console.log(`  trong đó nắp nằm DƯỚI chỗ đứng:                 ${capBelowObs}  (${pct(capBelowObs, hasLocalCap)})`);
  if (localCap.length) {
    const s = [...localCap].sort((a, b) => a - b);
    console.log(`  độ cao nắp: min ${s[0]}m · trung vị ${s[Math.floor(s.length / 2)]}m · max ${s[s.length - 1]}m`);
  }
}

main().catch(e => { console.error('❌', e?.message || e); process.exit(1); });
