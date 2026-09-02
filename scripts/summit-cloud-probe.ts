/**
 * summit-cloud-probe.ts — ĐO tần suất bật của bộ dò "MÂY ĐỘI ĐỈNH".
 *
 * Vì sao cần (ca thật, Fansipan 02/09/2026): thung lũng KHÔ (T−Td 3-6°C, mây thấp 0%) nên
 * engine kết luận đúng "không có biển mây" — rồi dán nhãn CLEAR "Trời quang". Thực tế đỉnh
 * bị mây mù bao trùm. Cả 6 mô hình đều cho RH 73-93% ngay tại mực 3.136m = cao độ đỉnh:
 * mây hình thành do nâng địa hình TẠI ĐỈNH, không phải biển mây dâng từ thung lũng. Engine
 * chỉ đi tìm lớp mây "bám gốc thung lũng" nên không hề nhìn tới cao độ người đứng.
 *
 * Bộ dò mới chỉ được phép đổi CLEAR → FOG (không bao giờ làm app lạc quan hơn), nhưng vẫn
 * phải đo: một cổng bật ở khắp nơi thì app chỉ đang nói "mù" với mọi đỉnh cao.
 *
 * Chạy: npx vite-node scripts/summit-cloud-probe.ts [YYYY-MM-DD ...]
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
import { scoreOneModel } from '../services/cloudScoreEngine';

const MODELS: WeatherModelId[] = ['gfs_seamless', 'icon_seamless', 'ukmo_seamless'];
const DATES = process.argv.slice(2).length ? process.argv.slice(2) : [vnTodayStr()];
const RH_THRESHOLDS = [70, 75, 80, 85, 90];

const pct = (n: number, d: number) => d ? `${Math.round(n / d * 100)}%` : '—';

/** Mực gần cao độ người đứng nhất (trong ±400m) — nơi phải hỏi "chỗ tôi đứng có mây không". */
function levelAtObserver(levels: any[] | undefined, obsAlt: number) {
  if (!levels?.length) return null;
  let best: any = null;
  for (const l of levels) {
    if (!Number.isFinite(l.rh)) continue;
    if (Math.abs(l.h - obsAlt) > 400) continue;
    if (!best || Math.abs(l.h - obsAlt) < Math.abs(best.h - obsAlt)) best = l;
  }
  return best;
}

async function main() {
  const valleys = await valleyElevationsForAll();
  const spots = Object.entries(MOUNTAIN_DB)
    .filter(([k, m]) => !m.needsReview && typeof valleys[k] === 'number' && valleys[k] <= m.elevation - 80);
  console.log(`${spots.length} điểm × ${MODELS.length} mô hình × ${DATES.length} ngày\n`);

  let n = 0, hasLevel = 0, clearCases = 0;
  const fire: Record<number, number> = {}, flip: Record<number, number> = {};
  for (const t of RH_THRESHOLDS) { fire[t] = 0; flip[t] = 0; }
  // Biến thể VẬT LÝ: đỉnh chìm trong mây khi mực ngưng tụ của không khí NGANG ĐỈNH nằm thấp
  // hơn lượng nâng địa hình mà chính ngọn núi đó tạo ra. Không có ngưỡng RH cứng: RH lạnh và
  // RH ấm cần lượng nâng rất khác nhau, và núi nhô cao 1.200m nâng khoẻ hơn đồi nhô 300m.
  const LIFT_FRAC = [0.3, 0.4, 0.5], LIFT_CAP = 600;
  const fireL: Record<number, number> = {}, flipL: Record<number, number> = {};
  for (const f of LIFT_FRAC) { fireL[f] = 0; flipL[f] = 0; }

  for (const [di, date] of DATES.entries()) {
    if (di > 0) await new Promise(r => setTimeout(r, 30_000));
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
        n++;
        const lv = levelAtObserver(m.levels, mt.elevation);
        if (!lv) continue;
        hasLevel++;
        const s = scoreOneModel(model, m,
          { valleyElevation: Math.round(valleys[key]), observerAlt: mt.elevation, zone: mt.zone as any },
          date);
        const isClear = s.status === 'CLEAR';
        if (isClear) clearCases++;
        for (const t of RH_THRESHOLDS) {
          if (lv.rh >= t) { fire[t]++; if (isClear) flip[t]++; }
        }
        // spread ≈ (100 − RH)/5 (đủ chính xác khi RH > 50%) → LCL cách đầu ~125 × spread mét
        const lclAbove = 125 * (100 - lv.rh) / 5;
        const relief = mt.elevation - Math.round(valleys[key]);
        for (const f of LIFT_FRAC) {
          if (lclAbove <= Math.min(LIFT_CAP, f * relief)) { fireL[f]++; if (isClear) flipL[f]++; }
        }
      }
    });
  }

  console.log(`ca có mực áp suất ở ngang cao độ người đứng: ${hasLevel}/${n}  (${pct(hasLevel, n)})`);
  console.log(`ca engine đang trả CLEAR:                     ${clearCases}/${hasLevel}  (${pct(clearCases, hasLevel)})\n`);
  console.log('ngưỡng RH   bật         trong đó ĐỔI CLEAR→FOG (phần thật sự thay đổi kết luận)');
  for (const t of RH_THRESHOLDS) {
    console.log(`  ≥${t}%      ${String(fire[t]).padStart(4)} (${pct(fire[t], hasLevel).padStart(4)})`
      + `      ${String(flip[t]).padStart(4)} (${pct(flip[t], clearCases).padStart(4)} số ca CLEAR)`);
  }
  console.log('\nbiến thể vật lý: LCL_trên_đầu ≤ min(600m, k × chênh_cao_đỉnh−đáy)');
  for (const f of LIFT_FRAC) {
    console.log(`  k=${f}      ${String(fireL[f]).padStart(4)} (${pct(fireL[f], hasLevel).padStart(4)})`
      + `      ${String(flipL[f]).padStart(4)} (${pct(flipL[f], clearCases).padStart(4)} số ca CLEAR)`);
  }
}

main().catch(e => { console.error('❌', e?.message || e); process.exit(1); });
