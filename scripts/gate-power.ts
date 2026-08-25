/**
 * gate-power.ts — ĐO SỨC PHÂN BIỆT của các cổng "có lớp mây thấp hay không".
 *
 * Vì sao cần: mỗi lần app bỏ sót một ngày có biển mây, cám dỗ tự nhiên là nới ngưỡng cho
 * đúng ca đó. Nhưng một cổng nới tay có thể bật ở KHẮP NƠI — lúc đó app không dự báo nữa,
 * nó chỉ đang nói "có" với mọi thứ. Script này đếm tỉ lệ bật của từng ngưỡng trên TOÀN BỘ
 * thư viện điểm × 6 mô hình, để quyết định bằng số chứ không bằng cảm tính.
 *
 * Chạy: npx vite-node scripts/gate-power.ts [YYYY-MM-DD ...]
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
import { computeInversion, computeCloudBase, rootedLowLayer, valleySaturation, estimateCloudTop } from '../services/cloudScoreEngine';

const MODELS: WeatherModelId[] = ['gfs_seamless', 'icon_seamless', 'ukmo_seamless'];
const DATES = process.argv.slice(2).length ? process.argv.slice(2) : [addDaysStr(vnTodayStr(), 1)];

async function main() {
  const valleys = await valleyElevationsForAll();
  const spots = Object.entries(MOUNTAIN_DB)
    .filter(([k, m]) => !m.needsReview && typeof valleys[k] === 'number' && valleys[k] <= m.elevation - 80);
  console.log(`${spots.length} điểm × ${MODELS.length} mô hình × ${DATES.length} ngày\n`);

  const rows: any[] = [];
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
        const base = computeCloudBase(m, valley);
        const inv = computeInversion(m, valley);
        rows.push({
          date, key, name: mt.name, model, obs: mt.elevation, valley,
          spread: +(m.t_valley_dawn - m.td_valley_dawn).toFixed(2),
          low: m.cloud_low_dawn, rh925: m.rh925, rh850: m.rh850,
          nightRH: m.rh2m_valley_night,
          blh: Number.isFinite(m.blh_night_min as any) ? m.blh_night_min : null,
          base, invH: inv.height, invS: inv.strength,
          gap: mt.elevation - base,
          rooted: rootedLowLayer(m, valley).rooted,
          rootTop: rootedLowLayer(m, valley).top,
          sat: valleySaturation(m, valley).saturated,
          top: estimateCloudTop(m, valley),
        });
      }
    });
  }

  const n = rows.length;
  const pct = (c: number) => `${c} (${Math.round(c / n * 100)}%)`;
  console.log(`Tổng ${n} cặp điểm×mô hình×ngày\n`);
  console.log('CỔNG HIỆN TẠI');
  console.log('  mây thấp >= 15%                     :', pct(rows.filter(r => r.low >= 15).length));
  console.log('  bão hoà (spread<=1.0 & RH cao)      :', pct(rows.filter(r => r.spread <= 1.0 && (r.rh925 >= 88 || r.nightRH >= 92)).length));
  console.log('  → CÓ lớp mây (một trong hai)        :', pct(rows.filter(r => r.low >= 15 || (r.spread <= 1.0 && (r.rh925 >= 88 || r.nightRH >= 92))).length));
  console.log('\nSỨC PHÂN BIỆT CỦA TỪNG BIẾN (phân vị)');
  for (const f of ['spread', 'low', 'nightRH', 'blh', 'gap'] as const) {
    const v = rows.map(r => r[f]).filter((x: any) => typeof x === 'number' && Number.isFinite(x)).sort((a: number, b: number) => a - b);
    if (!v.length) { console.log(`  ${f}: (không có dữ liệu)`); continue; }
    const q = (p: number) => v[Math.min(v.length - 1, Math.floor(v.length * p))];
    console.log(`  ${f.padEnd(8)} p10=${q(.1)} p25=${q(.25)} median=${q(.5)} p75=${q(.75)} p90=${q(.9)}`);
  }
  console.log('\nNẾU NỚI CỔNG BÃO HOÀ — tỉ lệ bật thêm');
  for (const th of [1.0, 1.5, 2.0, 2.5, 3.0]) {
    const fired = rows.filter(r => r.spread <= th && (r.rh925 >= 88 || r.nightRH >= 92));
    const extra = rows.filter(r => r.low < 15 && r.spread <= th && (r.rh925 >= 88 || r.nightRH >= 92));
    console.log(`  spread<=${th.toFixed(1)}: bật ${pct(fired.length)}  · trong đó CỨU thêm (mây thấp<15%) ${pct(extra.length)}`);
  }
  console.log('\nNẾU THÊM ĐIỀU KIỆN "hồ khí lạnh": nghịch nhiệt Strong/Moderate VÀ nắp trên đáy mây');
  for (const th of [1.5, 2.0, 2.5, 3.0]) {
    const extra = rows.filter(r => r.low < 15 && r.spread <= th && (r.rh925 >= 88 || r.nightRH >= 92)
      && (r.invS === 'Strong' || r.invS === 'Moderate') && r.invH !== null && r.invH > r.base + 100);
    console.log(`  spread<=${th.toFixed(1)} + nghịch nhiệt: CỨU thêm ${pct(extra.length)}`);
  }

  console.log('\nCỔNG RH XÁC NHẬN — đo ở tầng nào?');
  const deep = rows.filter(r => r.valley < 500);
  console.log(`  ${deep.length} cặp có đáy thung lũng < 500m (tầng 925hPa ≈ 760m nằm TRÊN đỉnh sương)`);
  const rhOK = (r: any) => r.rh925 >= 88 || r.nightRH >= 92;
  for (const th of [1.0, 1.5, 2.0]) {
    const a = rows.filter(r => r.low < 15 && r.spread <= th && rhOK(r)).length;
    const b = rows.filter(r => r.low < 15 && r.spread <= th).length;
    console.log(`  spread<=${th}: CÓ xác nhận RH ${a}/${n}  ·  BỎ xác nhận RH ${b}/${n}`);
  }

  console.log('\n=== BỘ DÒ MỚI "LỚP MÂY BÁM GỐC" — có thành cửa xả không? ===');
  const fired = (f: (r: any) => boolean) => `${rows.filter(f).length} (${Math.round(rows.filter(f).length / n * 100)}%)`;
  console.log('  cổng CŨ  (mây thấp>=15% HOẶC bão hoà)      :', fired(r => r.low >= 15 || r.sat));
  console.log('  cổng MỚI (thêm "lớp mây bám gốc")          :', fired(r => r.low >= 15 || r.sat || r.rooted));
  console.log('  → CỨU THÊM (trước null, nay có mặt mây)    :', fired(r => !(r.low >= 15 || r.sat) && r.rooted));
  const rescued = rows.filter(r => !(r.low >= 15 || r.sat) && r.rooted);
  const above = rescued.filter(r => r.top !== null && r.obs >= r.top);
  console.log(`     trong số cứu thêm, người đứng CAO HƠN mặt mây: ${above.length}/${rescued.length}`
    + ` (số còn lại engine sẽ gọi là FOG — chìm trong mây, vẫn là tin xấu)`);
  console.log('  đối chứng: tỉ lệ "bám gốc" trên TOÀN BỘ     :', fired(r => r.rooted));

  console.log('\nBLH (chỉ GFS có biến này) — thưởng +8 khi <=200m');
  const g = rows.filter(r => r.model === 'gfs_seamless');
  const gf = g.filter(r => typeof r.blh === 'number');
  console.log(`  GFS có blh: ${gf.length}/${g.length};  <=200m: ${gf.filter(r => r.blh <= 200).length} (${Math.round(gf.filter(r => r.blh <= 200).length / Math.max(1,gf.length) * 100)}%)  · <=500m: ${gf.filter(r => r.blh <= 500).length}  · >=1200m: ${gf.filter(r => r.blh >= 1200).length}`);
  for (const mo of MODELS) {
    const mm = rows.filter(r => r.model === mo);
    console.log(`  ${mo.padEnd(16)} có blh: ${mm.filter(r => typeof r.blh === 'number').length}/${mm.length}`);
  }
  console.log('\nRH XÁC NHẬN ĐO SAI TẦNG — 925hPa=760m so với đỉnh sương ước tính');
  const dv = rows.filter(r => r.valley < 500);
  console.log(`  ${dv.length} cặp đáy thung lũng <500m: rh925 trung vị ${dv.map(r=>r.rh925).sort((a,b)=>a-b)[Math.floor(dv.length/2)]}%`);
  const sv = rows.filter(r => r.valley >= 900);
  console.log(`  ${sv.length} cặp đáy >=900m (dùng rh850=1500m): rh850 trung vị ${sv.length? sv.map(r=>r.rh850).sort((a,b)=>a-b)[Math.floor(sv.length/2)]:'-'}%`);

  const suoi = rows.filter(r => r.key === 'SUOI_THAU');
  if (suoi.length) { console.log('\nSUÔI THẦU:'); for (const r of suoi) console.log('  ', JSON.stringify(r)); }
}
main();
