/**
 * study-observer-lowcloud.ts - phiếu g9214. Đo luật R đã ĐĂNG KÝ TRƯỚC trong NHAT-KY-HIEU-CHINH.md (20/11/2026):
 * nới cổng `observerInCloud` khi ΔH > 100m VÀ cloud_low_dawn >= 62,5% (5/8 okta). Không dò ngưỡng nào khác.
 *
 * Tập: mọi dòng bản chụp có nhãn (người đi > Facebook >= 0,6 > vệ tinh) mà nhãn tổng hợp là FOG, ΔH > 100m,
 * đồng thuận >= 50%. Mỗi ngày tải lại dữ liệu mô hình MỘT lần, chấm luật cũ và luật R trên cùng mẻ.
 * Ca 19/11 Tà Xùa (ca nghĩ ra giả thuyết) in riêng, KHÔNG vào số đếm.
 * Chạy: npx vite-node scripts/study-observer-lowcloud.ts   (cần Open-Meteo hết 429)
 */
if (typeof (globalThis as any).localStorage === 'undefined') {
  const mem = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); },
    removeItem: (k: string) => { mem.delete(k); },
  };
}
import { readdirSync, readFileSync, existsSync } from 'fs';
import { MOUNTAIN_DB } from '../constants/mountains';
import { addDaysStr, aggregateDayModel, makeHourlyBlock, HOURLY_VARS, WeatherModelId } from '../services/weatherService';
import { scoreOneModel, combineModels, isWorthGoing } from '../services/cloudScoreEngine';
import { fbUsable } from './fb-auto';

const DIR = 'data/observations';
const MODELS: WeatherModelId[] = ['gfs_seamless', 'icon_seamless', 'ukmo_seamless'];
const RELAX = 62.5;                       // CHỐT TRƯỚC (5/8 okta). Không chỉnh theo kết quả.
const CASE_USED = { date: '2026-11-19', key: 'TA_XUA_SON_LA' };

type Row = { date: string; key: string; truth: 'SEA' | 'NO_SEA'; src: string; snap: any };
const fc: Record<string, Record<string, any>> = {};
for (const f of readdirSync(DIR).filter(f => f.endsWith('-forecast.json'))) {
  const j = JSON.parse(readFileSync(`${DIR}/${f}`, 'utf-8'));
  fc[j.date] = Object.fromEntries(j.spots.map((s: any) => [s.key, s]));
}
const rows = new Map<string, Row>();
const put = (r: Row) => rows.set(r.date + '|' + r.key, r);
for (const f of readdirSync(DIR).filter(f => f.endsWith('-satellite.json'))) {
  for (const o of JSON.parse(readFileSync(`${DIR}/${f}`, 'utf-8'))) {
    const p = fc[o.date]?.[o.key]; if (!p) continue;
    if (o.verdict === 'BLOCKED_ABOVE' || o.verdict === 'NO_DATA') continue;
    put({ date: o.date, key: o.key, truth: /^SEA_/.test(o.verdict) ? 'SEA' : 'NO_SEA', src: 'vệ tinh', snap: p });
  }
}
if (existsSync(`${DIR}/fb-auto-reports.json`)) {
  for (const r of JSON.parse(readFileSync(`${DIR}/fb-auto-reports.json`, 'utf-8'))) {
    if (!fbUsable(r) || (r.timeOfDay && r.timeOfDay !== 'DAWN')) continue;
    const p = fc[r.date]?.[r.spotKey]; if (!p) continue;
    put({ date: r.date, key: r.spotKey, truth: (r.seaLevel === 'BELOW' || r.seaLevel === 'AT_EYE') ? 'SEA' : 'NO_SEA', src: 'facebook', snap: p });
  }
}
for (const r of JSON.parse(readFileSync(`${DIR}/field-reports.json`, 'utf-8'))) {
  const key = r.spotKey; if (!key) continue;
  const POS = r.seaLevel === 'BELOW' || r.seaLevel === 'AT_EYE';
  if (r.timeOfDay && r.timeOfDay !== 'DAWN' && !(POS && r.timeOfDay !== 'NIGHT')) continue;
  const p = fc[r.date]?.[key]; if (!p) continue;
  put({ date: r.date, key, truth: POS ? 'SEA' : 'NO_SEA', src: 'người đi', snap: p });
}

const cls = [...rows.values()].filter(r => r.snap.status === 'FOG' && typeof r.snap.deltaH === 'number'
  && r.snap.deltaH > 100 && r.snap.agreement >= 50);
console.log(`Lớp bị cổng chặn (FOG, ΔH > 100m, đồng thuận >= 50%): ${cls.length} dòng có nhãn / ${rows.size} dòng có nhãn.`);

async function main() {
  const byDate = new Map<string, Row[]>();
  for (const r of cls) byDate.set(r.date, [...(byDate.get(r.date) || []), r]);
  const out: any[] = []; let replicate = 0, total = 0;
  for (const [di, [date, rs]] of [...byDate.entries()].entries()) {
    if (di > 0) await new Promise(r => setTimeout(r, 3000));
    const prev = addDaysStr(date, -1);
    const spots = rs.map(r => ({ r, mt: (MOUNTAIN_DB as any)[r.key] })).filter(x => x.mt);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${spots.map(x => x.mt.lat.toFixed(4)).join(',')}`
      + `&longitude=${spots.map(x => x.mt.lon.toFixed(4)).join(',')}`
      + `&elevation=${spots.map(x => Math.round(x.r.snap.valleyElevation)).join(',')}`
      + `&hourly=${HOURLY_VARS.join(',')}&models=${MODELS.join(',')}&start_date=${prev}&end_date=${date}&timezone=Asia%2FBangkok`;
    const res = await fetch(url);
    if (!res.ok) { console.error(`❌ HTTP ${res.status} ${date} - LỖI ĐO, không kết luận`); process.exit(1); }
    const arr: any = await res.json(); const list = Array.isArray(arr) ? arr : [arr];
    spots.forEach((x, i) => {
      const loc = list[i]; if (!loc?.hourly) return;
      const block = makeHourlyBlock(loc.hourly);
      const ctx = { valleyElevation: Math.round(x.r.snap.valleyElevation), observerAlt: x.r.snap.observerAlt ?? x.mt.elevation, zone: x.mt.zone as any, lat: x.mt.lat };
      const oldS: any[] = [], newS: any[] = []; const lows: number[] = [];
      for (const model of MODELS) {
        const m = aggregateDayModel(block, block, model, date, prev); if (!m) continue;
        lows.push(m.cloud_low_dawn);
        oldS.push(scoreOneModel(model, m, ctx, date));
        newS.push(scoreOneModel(model, m, ctx, date, { observerFogRelaxLowCloud: RELAX }));
      }
      if (!oldS.length) return;
      const wg = (ss: any[]) => { const c = combineModels(ss); const dh = c.cloudTop !== null ? ctx.observerAlt - c.cloudTop : null;
        return { c, dh, w: isWorthGoing({ status: c.status, agreement: c.agreement, deltaH: dh }) }; };
      const o = wg(oldS), n = wg(newS);
      total++; if (o.c.status === x.r.snap.status) replicate++;
      out.push({ date, key: x.r.key, src: x.r.src, truth: x.r.truth, snapStatus: x.r.snap.status, oldStatus: o.c.status, newStatus: n.c.status,
        oldW: o.w, newW: n.w, lows: lows.join('/'), used: date === CASE_USED.date && x.r.key === CASE_USED.key });
    });
  }
  console.log(`Tính lại luật CŨ trùng nhãn bản chụp: ${replicate}/${total} (lệch do Open-Meteo viết đè quá khứ)\n`);
  const flipped = out.filter(o => o.oldW !== o.newW);
  console.log('Mọi dòng đổi LỜI KHUYÊN (cả hai chiều):');
  for (const o of flipped) console.log(`  ${o.date} ${o.key.padEnd(18)} ${o.src.padEnd(9)} thật ${o.truth.padEnd(6)} ${o.oldStatus}->${o.newStatus} khuyên ${o.oldW}->${o.newW} mây thấp ${o.lows}${o.used ? '  [CA DÙNG NGHĨ RA - KHÔNG TÍNH]' : ''}`);
  const cnt = flipped.filter(o => !o.used);
  const gain = cnt.filter(o => !o.oldW && o.newW), lose = cnt.filter(o => o.oldW && !o.newW);
  const tp = gain.filter(o => o.truth === 'SEA'), fa = gain.filter(o => o.truth === 'NO_SEA');
  const days = new Set(tp.map(o => o.date)).size, human = tp.filter(o => o.src !== 'vệ tinh').length;
  console.log(`\nTHÊM khuyên đi: ${gain.length} (đúng ${tp.length} trên ${days} ngày, báo nhầm ${fa.length}; đúng nhờ người/FB ${human}); MẤT khuyên đi: ${lose.length}`);
  for (const s of ['người đi', 'facebook', 'vệ tinh']) {
    const g = gain.filter(o => o.src === s); console.log(`   ${s}: thêm ${g.length}, đúng ${g.filter(o => o.truth === 'SEA').length}`);
  }
  const prec = gain.length ? tp.length / gain.length : NaN;
  const ok = prec >= 0.5 && days >= 3 && human >= 2 && lose.length === 0;
  console.log(`\nTiêu chí: chính xác >= 50% (${(prec * 100).toFixed(0)}%), >= 3 ngày (${days}), >= 2 ca người/FB (${human}), không mất ca (${lose.length}) => ${ok ? 'ĐẠT' : 'KHÔNG ĐẠT'}`);
  const usedRow = out.find(o => o.used); if (usedRow) console.log(`Ca dùng nghĩ ra: ${JSON.stringify(usedRow)}`);
}
main().catch(e => { console.error('❌', e?.message || e); process.exit(1); });
