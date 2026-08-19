/**
 * Công cụ đo lệch giữa XẾP HẠNG NHANH (3 model GFS/ICON/UKMO, 1 điểm tại đáy thung lũng)
 * và PHÂN TÍCH ĐẦY ĐỦ (6 model, 2 điểm) — cùng bộ biến HOURLY_VARS, cùng engine.
 * Chạy: npx vite-node scripts/compare-rank-vs-full.ts
 * (gọi API thật; dùng để hiệu chuẩn định kỳ, không phải unit test)
 */
import { MOUNTAIN_DB } from '../constants/mountains';
import {
  addDaysStr, vnTodayStr, aggregateDayModel, makeHourlyBlock,
  estimateValleyElevation, fetchMountainWeather, WeatherModelId,
} from '../services/weatherService';
import { scoreOneModel, combineModels, computeDayForecast } from '../services/cloudScoreEngine';

const SAMPLE = [
  'TA_XUA_SON_LA', 'PHA_LUONG', 'HANG_KIA_PA_CO', 'PHINH_HO', 'DON_DEN',
  'BINH_LIEU', 'PHIA_OAC', 'BACH_MA', 'BA_DEN', 'MANG_DEN', 'LANG_BIANG', 'KEO_LOM',
];
const RANK_MODELS: WeatherModelId[] = ['gfs_seamless', 'icon_seamless', 'ukmo_seamless'];
import { HOURLY_VARS as RANK_VARS } from '../services/weatherService';

async function main() {
  const target = addDaysStr(vnTodayStr(), 1);
  const prev = vnTodayStr();
  const rows: { name: string; rank: number; full: number; sRank: string; sFull: string }[] = [];

  for (const key of SAMPLE) {
    const mt = MOUNTAIN_DB[key];
    if (!mt) { console.log(`bỏ qua ${key} (không có trong DB)`); continue; }
    try {
      const { elevation: valley } = await estimateValleyElevation(mt.lat, mt.lon);
      const ctx = { valleyElevation: valley, observerAlt: mt.elevation, zone: mt.zone, lat: mt.lat };

      // CHẾ ĐỘ XẾP HẠNG NHANH
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${mt.lat}&longitude=${mt.lon}` +
        `&elevation=${Math.round(valley)}&hourly=${RANK_VARS.join(',')}` +
        `&models=${RANK_MODELS.join(',')}&start_date=${prev}&end_date=${target}&timezone=Asia%2FBangkok`;
      const res = await fetch(url);
      const data = await res.json();
      const block = makeHourlyBlock(data.hourly);
      const per = [];
      for (const model of RANK_MODELS) {
        const agg = aggregateDayModel(block, block, model, target, prev);
        if (agg) per.push(scoreOneModel(model, agg, ctx, target));
      }
      if (per.length === 0) { console.log(`${mt.name}: thiếu dữ liệu rank`); continue; }
      const rank = combineModels(per);

      // CHẾ ĐỘ ĐẦY ĐỦ
      const pkg = await fetchMountainWeather(key, mt.name, target, target);
      const day = pkg.days[0];
      const full = computeDayForecast(day, { ...ctx, valleyElevation: pkg.valleyElevation });

      rows.push({
        name: mt.name.slice(0, 30),
        rank: rank.score, full: full.forecast.score,
        sRank: rank.status, sFull: full.forecast.status_code,
      });
      console.log(
        `${mt.name.slice(0, 30).padEnd(32)} rank=${String(rank.score).padStart(3)} full=${String(full.forecast.score).padStart(3)} ` +
        `Δ=${String(rank.score - full.forecast.score).padStart(4)}  ${rank.status.padEnd(11)} vs ${full.forecast.status_code}`
      );
    } catch (e: any) {
      console.log(`${mt.name}: LỖI ${e?.message}`);
    }
  }

  const diffs = rows.map(r => Math.abs(r.rank - r.full));
  const statusMatch = rows.filter(r => r.sRank === r.sFull).length;
  const cloudSea = (s: string) => ['STATIC', 'FLOWING', 'FLUCTUATING', 'ROLLING', 'FOG'].includes(s);
  const verdictMatch = rows.filter(r => cloudSea(r.sRank) === cloudSea(r.sFull)).length;
  console.log('\n===== TỔNG KẾT =====');
  console.log(`n = ${rows.length} điểm, ngày ${target}`);
  console.log(`|Δđiểm| trung bình = ${(diffs.reduce((a, b) => a + b, 0) / diffs.length).toFixed(1)}, max = ${Math.max(...diffs)}`);
  console.log(`Trùng trạng thái chi tiết: ${statusMatch}/${rows.length}`);
  console.log(`Trùng kết luận CÓ/KHÔNG biển mây: ${verdictMatch}/${rows.length}`);
}

main();
