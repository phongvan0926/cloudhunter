/**
 * observer-gate-probe.ts — ĐO cổng `observerInCloud` và tác động của TRẦN ΔH (engine-2.8.4).
 *
 * Vì sao cần (Tà Xùa 03-04/10/2026, hai ngày người dùng xác nhận CÓ biển mây): bản chụp
 * 04/10 in "ΔH +332m" rồi dán nhãn "Mù trùm — bạn chìm trong mây". Cổng `observerInCloud`
 * bật BẤT KỂ ΔH dương bao nhiêu, và nó đọc mực áp suất gần nhất kể cả mực nằm DƯỚI chân
 * người đứng — mà "mực ngay dưới chân có mây" chính là định nghĩa của biển mây dưới chân.
 *
 * Script chấm MỘT mẻ dữ liệu bằng NHIỀU trần ΔH cùng lúc (không bao giờ fetch hai lần rồi
 * so: Open-Meteo viết đè quá khứ, xem AGENTS.md). Trần = Infinity là luật trước 2.8.4.
 *
 * Chạy: npx vite-node scripts/observer-gate-probe.ts [YYYY-MM-DD ...]
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
import {
  scoreOneModel, combineModels, isWorthGoing, estimateCloudTop, observerInCloud,
  levelAtObserver, verdictOf,
} from '../services/cloudScoreEngine';

const MODELS: WeatherModelId[] = ['gfs_seamless', 'icon_seamless', 'ukmo_seamless'];
const DATES = process.argv.slice(2).length ? process.argv.slice(2) : [addDaysStr(vnTodayStr(), 1)];
const CEILINGS = [150, 250, 400, 600, Infinity];
const pct = (n: number, d: number) => d ? `${Math.round(n / d * 100)}%` : '—';

async function main() {
  const valleys = await valleyElevationsForAll();
  const spots = Object.entries(MOUNTAIN_DB)
    .filter(([k, m]) => !m.needsReview && typeof valleys[k] === 'number' && valleys[k] <= m.elevation - 80);
  console.log(`${spots.length} điểm × ${MODELS.length} mô hình × ${DATES.length} ngày`);
  console.log(`trần ΔH đem so: ${CEILINGS.map(c => c === Infinity ? 'vô hạn (luật cũ)' : c + 'm').join(' · ')}\n`);

  let n = 0, gated = 0, levelBelow = 0, levelAbove = 0;
  const dhBucket = new Map<string, number>();
  const bump = (k: string) => dhBucket.set(k, (dhBucket.get(k) || 0) + 1);
  // theo từng trần: bao nhiêu ĐIỂM-NGÀY đổi nhãn / đổi kết luận / đổi lời khuyên
  const chg = new Map<number, { label: number; verdict: number; wgGain: number; wgLose: number }>();
  for (const c of CEILINGS) chg.set(c, { label: 0, verdict: 0, wgGain: 0, wgLose: 0 });
  const examples: string[] = [];

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
      const ctx = { valleyElevation: Math.round(valleys[key]), observerAlt: mt.elevation, zone: mt.zone as any };
      // chấm từng mô hình bằng MỌI trần, trên cùng dữ liệu
      const byCeil = new Map<number, any[]>();
      for (const c of CEILINGS) byCeil.set(c, []);
      for (const model of MODELS) {
        const m = aggregateDayModel(block, block, model, date, prev);
        if (!m) continue;
        n++;
        const top = estimateCloudTop(m, ctx.valleyElevation);
        const dh = top !== null ? ctx.observerAlt - top : null;
        if (observerInCloud(m, ctx)) {
          gated++;
          const lv = levelAtObserver(m, ctx, 250);
          if (lv) { if (lv.h < ctx.observerAlt) levelBelow++; else levelAbove++; }
          if (dh === null) bump('ΔH không tính được');
          else if (dh <= -250) bump('ΔH ≤ −250m  (chìm sâu — cổng không đổi gì)');
          else if (dh <= 0) bump('ΔH −250…0m   (dưới mặt mây)');
          else if (dh <= 250) bump('ΔH 0…250m    (trong sai số ±200m — cổng ĐÚNG việc)');
          else if (dh <= 600) bump('ΔH 250…600m  (mô hình nói đứng TRÊN rõ rệt)');
          else bump('ΔH > 600m    (mô hình nói đứng TRÊN rất rõ)');
        }
        for (const c of CEILINGS) {
          byCeil.get(c)!.push(scoreOneModel(model, m, ctx, date, { observerFogMaxDeltaH: c }));
        }
      }
      if (!byCeil.get(CEILINGS[0])!.length) return;
      const base = combineModels(byCeil.get(Infinity)!);   // luật CŨ làm mốc
      const baseDh = base.cloudTop !== null ? ctx.observerAlt - base.cloudTop : null;
      const baseWg = isWorthGoing({ status: base.status, agreement: base.agreement, deltaH: baseDh });
      for (const c of CEILINGS) {
        if (c === Infinity) continue;
        const out = combineModels(byCeil.get(c)!);
        const dh2 = out.cloudTop !== null ? ctx.observerAlt - out.cloudTop : null;
        const wg = isWorthGoing({ status: out.status, agreement: out.agreement, deltaH: dh2 });
        const r = chg.get(c)!;
        if (out.status !== base.status) r.label++;
        if (verdictOf(out.status) !== verdictOf(base.status)) r.verdict++;
        if (wg && !baseWg) r.wgGain++;
        if (!wg && baseWg) r.wgLose++;
        if (c === 250 && wg !== baseWg && examples.length < 12) {
          examples.push(`   ${date} ${mt.name.slice(0, 30).padEnd(30)} `
            + `${base.status.padEnd(12)}→${out.status.padEnd(12)} ΔH ${String(dh2 ?? '—').padStart(6)}m `
            + `đồng thuận ${String(out.agreement).padStart(3)}%  ${baseWg ? 'MẤT khuyên đi' : 'THÊM khuyên đi'}`);
        }
      }
    });
    console.log(`  xong ${date}`);
  }

  console.log(`\nca (điểm × mô hình × ngày): ${n}`);
  console.log(`cổng observerInCloud bật:   ${gated}  (${pct(gated, n)})`);
  console.log(`   mực nó đọc nằm DƯỚI chân người đứng: ${levelBelow}  (${pct(levelBelow, levelBelow + levelAbove)})`);
  console.log(`   mực nó đọc nằm TRÊN/ngang chân:      ${levelAbove}  (${pct(levelAbove, levelBelow + levelAbove)})`);
  console.log('\nΔH lúc cổng bật — đây là chỗ quyết định trần đặt ở đâu:');
  for (const [k, v] of [...dhBucket.entries()].sort())
    console.log(`   ${k.padEnd(44)} ${String(v).padStart(4)}  (${pct(v, gated)})`);

  console.log('\ntác động lên KẾT LUẬN THEO ĐIỂM-NGÀY (mốc = luật cũ, trần vô hạn):');
  console.log('   trần      đổi nhãn   đổi kết luận   THÊM khuyên đi   MẤT khuyên đi');
  for (const c of CEILINGS) {
    if (c === Infinity) continue;
    const r = chg.get(c)!;
    console.log(`   ${String(c + 'm').padEnd(9)} ${String(r.label).padStart(5)}      ${String(r.verdict).padStart(5)}`
      + `          ${String(r.wgGain).padStart(5)}            ${String(r.wgLose).padStart(5)}`);
  }
  if (examples.length) {
    console.log('\nnhững điểm-ngày đổi LỜI KHUYÊN ở trần 250m (cần nhìn từng ca, không chỉ con số tổng):');
    examples.forEach(e => console.log(e));
  }
}

main().catch(e => { console.error('❌', e?.message || e); process.exit(1); });
