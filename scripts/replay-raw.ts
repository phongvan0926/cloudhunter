/**
 * replay-raw.ts - LẤY LẠI dữ liệu thô Open-Meteo (đã gộp theo ngày) cho mọi (điểm × ngày) đã có
 * sự thật, lưu ra file để chấm NHIỀU biến thể engine trên CÙNG một mẻ dữ liệu (đợt estimateCloudTop,
 * 30/10/2026). Khác replay-engine.ts: nó lưu dữ liệu ĐẦU VÀO của engine (DayModelData), không lưu kết quả.
 *
 * CẢNH BÁO như replay-engine.ts: Open-Meteo viết đè quá khứ, đây không phải thứ app đã thấy hôm đó.
 * Chỉ dùng để so các biến thể với nhau.
 *
 *   npx --no-install vite-node scripts/replay-raw.ts <file-ra.json>     # chạy lại được, chỉ xin phần còn thiếu
 *
 * Hạn ngạch: gộp cả khoảng ngày vào MỘT lô (≤ 14 ngày/lô tính 1 lượt) thay vì mỗi ngày một lô.
 */
if (typeof (globalThis as any).localStorage === 'undefined') {
  const mem = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => { mem.set(k, v); },
    removeItem: (k: string) => { mem.delete(k); },
  };
}
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { MOUNTAIN_DB } from '../constants/mountains';
import { addDaysStr, aggregateDayModel, makeHourlyBlock, HOURLY_VARS, WeatherModelId } from '../services/weatherService';
import { valleyElevationsForAll } from '../services/rankingService';

const DIR = 'data/observations';
const OUT = process.argv[2];
if (!OUT) throw new Error('Thiếu đường dẫn file ra');
const MODELS: WeatherModelId[] = ['gfs_seamless', 'icon_seamless', 'ukmo_seamless'];
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function main() {
  const need: Record<string, Set<string>> = {};
  for (const f of readdirSync(DIR).filter(f => f.endsWith('-satellite.json')))
    for (const o of JSON.parse(readFileSync(`${DIR}/${f}`, 'utf-8')))
      if (MOUNTAIN_DB[o.key]) (need[o.date] ||= new Set()).add(o.key);
  for (const f of ['field-reports.json']) {
    for (const r of JSON.parse(readFileSync(`${DIR}/${f}`, 'utf-8')))
      if (r.spotKey && MOUNTAIN_DB[r.spotKey]) (need[r.date] ||= new Set()).add(r.spotKey);
  }
  for (const r of JSON.parse(readFileSync(`${DIR}/fb-auto-reports.json`, 'utf-8')))
    if (r.spotKey && MOUNTAIN_DB[r.spotKey]) (need[r.date] ||= new Set()).add(r.spotKey);
  // chỉ ngày đã có bản chụp (chấm được) và nằm trong cửa sổ quá khứ mà API còn phục vụ
  const snap = new Set(readdirSync(DIR).filter(f => f.endsWith('-forecast.json')).map(f => f.slice(0, 10)));
  const dates = Object.keys(need).filter(d => snap.has(d)).sort();
  const keys = [...new Set(dates.flatMap(d => [...need[d]]))];
  console.log(`${dates.length} ngày (${dates[0]} → ${dates[dates.length - 1]}), ${keys.length} điểm`);

  const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf-8')) : { days: {} };
  const out: Record<string, Record<string, any>> = prev.days;
  const valleys = await valleyElevationsForAll();

  // lô 13 ngày liên tiếp (+1 ngày trước để có đêm hôm trước)
  const WIN = Number(process.env.WIN || 20), CHUNK = 20;
  const MAXW = Number(process.env.MAXW || 999);
  for (let w = 0; w < dates.length && w / WIN < MAXW; w += WIN) {
    const win = dates.slice(w, w + WIN);
    const first = win[0], last = win[win.length - 1];
    const keysW = [...new Set(win.flatMap(d => [...need[d]]))].filter(k => typeof valleys[k] === 'number');
    const todo = keysW.filter(k => win.some(d => need[d].has(k) && !(out[d]?.[k])));
    for (let c = 0; c < todo.length; c += CHUNK) {
      const spots = todo.slice(c, c + CHUNK).map(k => [k, MOUNTAIN_DB[k]] as const);
      const url = `https://historical-forecast-api.open-meteo.com/v1/forecast`
        + `?latitude=${spots.map(([, m]) => m.lat.toFixed(4)).join(',')}`
        + `&longitude=${spots.map(([, m]) => m.lon.toFixed(4)).join(',')}`
        + `&elevation=${spots.map(([k]) => Math.round(valleys[k])).join(',')}`
        + `&hourly=${HOURLY_VARS.join(',')}&models=${MODELS.join(',')}`
        + `&start_date=${addDaysStr(first, -1)}&end_date=${last}&timezone=Asia%2FBangkok`;
      let data: any = null;
      for (let attempt = 0; attempt < 4 && !data; attempt++) {
        const res = await fetch(url);
        const txt = await res.text();
        if (res.ok) { try { data = JSON.parse(txt); } catch { console.error(`  trả 200 nhưng không phải JSON: ${txt.slice(0, 80)}`); } }
        else { console.error(`  ${first}..${last} lô ${c / CHUNK + 1}: HTTP ${res.status} ${txt.slice(0, 100)} - chờ`); await sleep(60000 * (attempt + 1)); }
      }
      if (!data) { console.error('  bỏ lô này'); continue; }
      const arr: any[] = Array.isArray(data) ? data : [data];
      console.log(`  nhận ${arr.length} vị trí, ${arr[0]?.hourly?.time?.length ?? 'không có hourly'} giờ, error=${data?.error ? data.reason : '-'}`);
      spots.forEach(([key, mt], i) => {
        const loc = arr[i]; if (!loc?.hourly) return;
        const block = makeHourlyBlock(loc.hourly);
        for (const d of win) {
          if (!need[d].has(key)) continue;
          if (process.env.DBG) console.log('  thử', d, key);
          const ctx = { valleyElevation: Math.round(valleys[key]), observerAlt: mt.elevation, zone: mt.zone, lat: mt.lat };
          const per: Record<string, any> = {};
          for (const model of MODELS) {
            const agg = aggregateDayModel(block, block, model, d, addDaysStr(d, -1));
            if (agg) per[model] = agg; else if (process.env.DBG) console.log('   agg null', model);
          }
          if (Object.keys(per).length) (out[d] ||= {})[key] = { ctx, per };
        }
      });
      writeFileSync(OUT, JSON.stringify({ ranAt: new Date().toISOString(), days: out }));
      console.log(`  ${first}..${last} lô ${c / CHUNK + 1}/${Math.ceil(todo.length / CHUNK)} xong`);
      await sleep(8000);
    }
  }
  const n = Object.values(out).reduce((a, d) => a + Object.keys(d).length, 0);
  console.log(`xong: ${n} (điểm×ngày) → ${OUT}`);
}
main().catch(e => { console.error(e); process.exit(1); });
