/**
 * replay-engine.ts — TÍNH LẠI bằng ENGINE HIỆN TẠI cho đúng những (điểm × ngày) đã có sự thật.
 *
 * Vì sao cần: bản chụp trong data/observations/ đóng băng kết quả của engine LÚC ĐÓ. Ngày
 * 22-25/8 chụp bằng engine-2.2/2.3 nên KHÔNG có ΔH ⇒ mọi phép thử ngưỡng ΔH trên các dòng đó
 * đều trả "không khuyên", tức là bịa ra một cận dưới chứ không phải số thật.
 *
 * CẢNH BÁO khi đọc kết quả: Open-Meteo có SỬA LẠI dữ liệu quá khứ (đã bắt gặp 25/8 Suôi Thầu).
 * Con số ở đây là "engine hôm nay chấm dữ liệu hôm nay đang kể về ngày đó", KHÔNG phải thứ
 * người dùng đã nhìn thấy hôm đó. Chỉ dùng để so sánh CÁC LUẬT với nhau trên cùng một nền.
 *
 *   npx vite-node scripts/replay-engine.ts        # ghi ra file cache trong /tmp scratchpad
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
import { scoreOneModel, combineModels, ENGINE_VERSION } from '../services/cloudScoreEngine';

const DIR = 'data/observations';
const OUT = process.argv[2] || 'replay-cache.json';
const MODELS: WeatherModelId[] = ['gfs_seamless', 'icon_seamless', 'ukmo_seamless'];

function norm(s: string) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase(); }
function nameToKey(name: string): string | null {
  if (MOUNTAIN_DB[name]) return name;
  const t = norm(name);
  for (const [k, m] of Object.entries(MOUNTAIN_DB)) {
    if (norm(m.name) === t) return k;
    if ((m.aliases || []).some(a => norm(a) === t)) return k;
  }
  return null;
}

async function main() {
  const files = readdirSync(DIR);
  const need: Record<string, Set<string>> = {};   // date -> keys
  for (const f of files.filter(f => f.endsWith('-satellite.json')))
    for (const o of JSON.parse(readFileSync(`${DIR}/${f}`, 'utf-8')))
      if (MOUNTAIN_DB[o.key]) (need[o.date] ||= new Set()).add(o.key);
  const rep = `${DIR}/field-reports.json`;
  if (existsSync(rep))
    for (const r of JSON.parse(readFileSync(rep, 'utf-8'))) {
      const k = r.spotKey || nameToKey(r.locationName);
      if (k && MOUNTAIN_DB[k]) (need[r.date] ||= new Set()).add(k);
    }

  // Gộp tiếp vào cache cũ: Open-Meteo có hạn ngạch giờ, một lần chạy thường không lấy hết
  // được — chạy lại sẽ chỉ xin những ngày còn thiếu thay vì nã lại từ đầu.
  const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf-8')) : null;
  const out: Record<string, Record<string, any>> = (prev && prev.engine === ENGINE_VERSION) ? prev.days : {};
  const valleys = await valleyElevationsForAll();
  for (const date of Object.keys(need).sort()) {
    if (out[date] && Object.keys(out[date]).length >= [...need[date]].length) continue;
    const keys = [...need[date]].filter(k => typeof valleys[k] === 'number');
    if (!keys.length) continue;
    // Chia lô 20 điểm/lần: gọi 56 toạ độ trong một URL bị Open-Meteo tính là 56 lượt và
    // ăn ngay HTTP 429. Cào lịch sự thì mới chạy lại được nhiều lần.
    out[date] ||= {};
    const CHUNK = 20;
    for (let c = 0; c < keys.length; c += CHUNK) {
      const spots = keys.slice(c, c + CHUNK).map(k => [k, MOUNTAIN_DB[k]] as const);
      const url = `https://api.open-meteo.com/v1/forecast`
        + `?latitude=${spots.map(([, m]) => m.lat.toFixed(4)).join(',')}`
        + `&longitude=${spots.map(([, m]) => m.lon.toFixed(4)).join(',')}`
        + `&elevation=${spots.map(([k]) => Math.round(valleys[k])).join(',')}`
        + `&hourly=${HOURLY_VARS.join(',')}&models=${MODELS.join(',')}`
        + `&start_date=${addDaysStr(date, -1)}&end_date=${date}&timezone=Asia%2FBangkok`;
      const res = await fetch(url);
      if (!res.ok) { console.error(`  ${date} lô ${c / CHUNK + 1}: HTTP ${res.status} — bỏ lô này`); await new Promise(r => setTimeout(r, 5000)); continue; }
      const data = await res.json();
      const arr: any[] = Array.isArray(data) ? data : [data];
      spots.forEach(([key, mt], i) => {
        const loc = arr[i];
        if (!loc?.hourly) return;
        const block = makeHourlyBlock(loc.hourly);
        const ctx = { valleyElevation: Math.round(valleys[key]), observerAlt: mt.elevation, zone: mt.zone, lat: mt.lat };
        const per = [];
        for (const model of MODELS) {
          const agg = aggregateDayModel(block, block, model, date, addDaysStr(date, -1));
          if (agg) per.push(scoreOneModel(model, agg, ctx, date));
        }
        if (!per.length) return;
        const cc = combineModels(per);
        out[date][key] = { score: cc.score, status: cc.status, agreement: cc.agreement,
          cloudTop: cc.cloudTop, deltaH: cc.cloudTop !== null ? mt.elevation - cc.cloudTop : null };
      });
      await new Promise(r => setTimeout(r, 2000));
    }
    console.log(`  ${date}: tính lại ${Object.keys(out[date]).length}/${keys.length} điểm`);
    await new Promise(r => setTimeout(r, 1500));   // cào lịch sự
  }
  writeFileSync(OUT, JSON.stringify({ engine: ENGINE_VERSION, ranAt: new Date().toISOString(), days: out }, null, 1));
  console.log(`\n→ ${OUT}  (engine ${ENGINE_VERSION})`);
}
main();
