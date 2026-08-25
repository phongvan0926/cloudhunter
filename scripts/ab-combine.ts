/**
 * ab-combine.ts — so CÁCH GỘP CŨ (đếm phiếu theo nhãn chi tiết) với CÁCH MỚI
 * (bỏ phiếu cho KẾT LUẬN trước, rồi mới chọn nhãn trong nhóm thắng).
 *
 * Chỉ gọi API MỘT lần rồi chấm bằng cả hai luật trên cùng bộ perModel — chênh lệch quan
 * sát được là do đúng luật gộp, không lẫn nhiễu thời tiết hay phiên bản dữ liệu.
 *
 * Chạy: npx vite-node scripts/ab-combine.ts [YYYY-MM-DD]
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
import { scoreOneModel, combineModels, verdictOf, ModelDayScore } from '../services/cloudScoreEngine';
import { StatusCode } from '../types';

const MODELS: WeatherModelId[] = ['gfs_seamless', 'icon_seamless', 'ukmo_seamless'];
const DATE = process.argv[2] || vnTodayStr();

const SEVERITY: Record<StatusCode, number> = {
  RAIN: 8, DISSIPATING: 7, FOG: 6, ROLLING: 5, FLUCTUATING: 4,
  CLEAR: 3, FLOWING: 2, STATIC: 1, UNKNOWN: 0,
};

/** Bản gộp CŨ: mode trên nhãn chi tiết, hoà thì lấy nhãn nặng hơn. */
function combineOld(per: ModelDayScore[]): StatusCode {
  const counts = new Map<StatusCode, number>();
  for (const p of per) counts.set(p.status, (counts.get(p.status) || 0) + 1);
  let status = per[0].status, best = 0;
  for (const [st, c] of counts) {
    if (c > best || (c === best && SEVERITY[st] > SEVERITY[status])) { best = c; status = st; }
  }
  return status;
}

async function main() {
  const valleys = await valleyElevationsForAll();
  const spots = Object.entries(MOUNTAIN_DB)
    .filter(([k, m]) => !m.needsReview && typeof valleys[k] === 'number' && valleys[k] <= m.elevation - 80);
  const prev = addDaysStr(DATE, -1);
  const url = `https://api.open-meteo.com/v1/forecast`
    + `?latitude=${spots.map(([, m]) => m.lat.toFixed(4)).join(',')}`
    + `&longitude=${spots.map(([, m]) => m.lon.toFixed(4)).join(',')}`
    + `&elevation=${spots.map(([k]) => Math.round(valleys[k])).join(',')}`
    + `&hourly=${HOURLY_VARS.join(',')}&models=${MODELS.join(',')}`
    + `&start_date=${prev}&end_date=${DATE}&timezone=Asia%2FBangkok`;
  const arr: any[] = await (await fetch(url)).json();

  let nSeaOld = 0, nSeaNew = 0, changed: string[] = [], n = 0;
  spots.forEach(([key, mt], i) => {
    const loc = arr[i]; if (!loc?.hourly) return;
    const block = makeHourlyBlock(loc.hourly);
    const ctx = { valleyElevation: Math.round(valleys[key]), observerAlt: mt.elevation, zone: mt.zone, lat: mt.lat };
    const per: ModelDayScore[] = [];
    for (const model of MODELS) {
      const agg = aggregateDayModel(block, block, model, DATE, prev);
      if (agg) per.push(scoreOneModel(model, agg, ctx, DATE));
    }
    if (!per.length) return;
    n++;
    const oldSt = combineOld(per);
    const neu = combineModels(per);
    const oldSea = verdictOf(oldSt) === 'SEA', newSea = verdictOf(neu.status) === 'SEA';
    if (oldSea) nSeaOld++;
    if (newSea) nSeaNew++;
    if (oldSt !== neu.status) {
      changed.push(`   ${mt.name.slice(0, 30).padEnd(32)} ${oldSt.padEnd(12)} → ${neu.status.padEnd(12)}`
        + ` [${per.map(p => `${p.model.slice(0, 4)}:${p.status}`).join(' ')}]`);
    }
  });

  console.log(`\nNgày ${DATE} · ${n} điểm × ${MODELS.length} mô hình\n`);
  console.log(`  Kết luận CÓ BIỂN MÂY:  cũ ${nSeaOld}/${n}  →  mới ${nSeaNew}/${n}`);
  console.log(`  Đổi nhãn: ${changed.length}/${n} điểm\n`);
  changed.slice(0, 25).forEach(c => console.log(c));
  if (changed.length > 25) console.log(`   … và ${changed.length - 25} điểm nữa`);
}
main();
