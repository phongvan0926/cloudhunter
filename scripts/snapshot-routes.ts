/**
 * snapshot-routes.ts - CHỤP LẠI app đã phán gì về độ khó một số CUNG ĐƯỜNG cố định cho chuyến
 * "tới nơi trước bình minh" sáng ngày D (phiếu gcc29 vòng 2, 19/11/2026).
 *
 * Vì sao: ngưỡng độ khó trong services/routeService.ts (TH) chưa có sự thật nào. Không chỉnh
 * theo cảm giác; chụp lại phán quyết TRƯỚC chuyến đi, để khi có báo cáo chuyến đi thật (người
 * đi, bài phượt trên Facebook) thì chấm được. Cách chấm: docs/cung-duong-kiem-chung.md.
 *
 * Dùng ĐÚNG luật giờ đi của nút "Tới nơi trước bình minh" trong components/RouteWeather.tsx:
 * tới nơi = bình minh ước tại đích - 30 phút, đi ngược theo tốc độ trung bình mặc định.
 *
 *   npx vite-node scripts/snapshot-routes.ts             # rạng sáng NGÀY MAI (giờ VN)
 *   npx vite-node scripts/snapshot-routes.ts 2026-11-21
 * Ra: data/observations/<D>-routes.json. Đã có thì KHÔNG đè (bản chụp là bằng chứng).
 * Mã thoát: 0 đủ tuyến | 3 thiếu tuyến hoặc thiếu phần phụ (vẫn ghi phần lấy được) | 1 không tuyến nào (không ghi).
 *
 * Phần phụ (vòng 6, 19/11/2026), mỗi tuyến, để chấm sau 4-6 tuần (cách chấm: docs/cung-duong-kiem-chung.md mục 6-8):
 * - `stability`: phán quyết độ ổn định dự báo tại ĐÍCH cho các ngày D..D+5 (services/stabilityService.ts), kèm số ngày còn
 *   lại tới 06h ngày đó và số từng mô hình x 3 lần chạy (thứ tự mô hình ở `models`).
 * - `storm`: dông dọc tuyến theo 4 mô hình (services/stormService.ts), theo đoạn + từng điểm.
 * - `slide`: cấp rủi ro lũ quét/sạt lở theo QĐ 18/2021 tại từng điểm (services/slideService.ts), chỉ ghi điểm đạt >= 100 mm/24h.
 * Phần phụ hỏng thì ghi `<phần>Error` và mã thoát 3, không bỏ tuyến (phán quyết độ khó chính vẫn là bằng chứng).
 */
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { MOUNTAIN_DB } from '../constants/mountains';
import { vnTodayStr, addDaysStr, computeSunTimes } from '../services/weatherService';
import {
  planRoute, compactRoute, setFetchHeaders, ROUTE_RULES_VERSION, DEFAULT_SPEED_KMH, LEVEL_LABEL, 
} from '../services/routeService';

const DATE = process.argv[2] || addDaysStr(vnTodayStr(), 1);
if (!/^\d{4}-\d{2}-\d{2}$/.test(DATE)) { console.error('LỖI: ngày phải dạng YYYY-MM-DD'); process.exit(1); }
const OUT = `data/observations/${DATE}-routes.json`;

// ORIGINS/ROUTES tách ra fixed-routes.ts (19/11/2026, vòng 4) để script khí hậu dùng chung mà không chạy main ở đây.
import { ORIGINS, ROUTES } from './fixed-routes';
import { fetchRouteStorm, compactStorm } from '../services/stormService';
import { slideRiskQD18, SLIDE_SOURCE } from '../services/slideService';
import { fetchStability, assessStability, leadDaysOf, STABILITY_MODELS } from '../services/stabilityService';
const STAB_DAYS = 6;   // D..D+5
export { ORIGINS, ROUTES };
const GAP_MS = 1500;
/** Open-Meteo 429 tạm thời (đo 19/11/2026 khi chạy thử: 1 lần ở tuyến thứ 6): nguội 65 s rồi thử lại, tối đa 2 lần. */
async function retry429<T>(label: string, fn: () => Promise<T>): Promise<T> {
  for (let t = 0; ; t++) {
    try { return await fn(); }
    catch (e: any) { if (t >= 2 || !/429/.test(e.message)) throw e; console.warn(`${label}: ${e.message}, chờ 65 s`); await new Promise(res => setTimeout(res, 65_000)); }
  }
}   // FOSSGIS: tối đa 1 yêu cầu/giây; mỗi tuyến gọi Valhalla đúng 1 lần

async function main(): Promise<number> {
  if (existsSync(OUT)) { console.log('đã có', OUT, '- không đè'); return 0; }
  // FOSSGIS đòi UA nêu tên ứng dụng (UA của thư viện không đủ). Chỉ áp cho script này.
  setFetchHeaders({ 'User-Agent': 'CloudHunter-route-snapshot/1.0 (+https://github.com/phongvan0926/cloudhunter)' });
  const out: any[] = [];
  let partial = 0;
  for (const [i, r] of ROUTES.entries()) {
    if (i) await new Promise(res => setTimeout(res, GAP_MS));
    const o = ORIGINS[r.from], d = MOUNTAIN_DB[r.to];
    if (!d) { console.error('LỖI: không có điểm', r.to); continue; }
    const sr = computeSunTimes(d.lat, d.lon, DATE).sunrise;
    const arrive = Date.parse(`${DATE}T${sr}:00+07:00`) - 30 * 60_000;
    try {
      let p;
      for (let t = 0; ; t++) {   // Open-Meteo 429 tạm thời: nguội 65 s rồi thử lại, tối đa 2 lần
        try { p = await planRoute(o, { lat: d.lat, lon: d.lon }, r.vehicle, DEFAULT_SPEED_KMH[r.vehicle], h => arrive - h * 3600_000); break; }
        catch (e: any) { if (t >= 2 || !/429/.test(e.message)) throw e; console.warn(`${r.id}: ${e.message}, chờ 65 s`); await new Promise(res => setTimeout(res, 65_000)); }
      }
      const c = compactRoute(p);
      const extra: any = {};
      try {
        const st = await retry429(`${r.id} độ ổn định`, () => fetchStability(d.lat, d.lon, p.elevs[p.elevs.length - 1] ?? null));
        // Ghi mọi ngày đích D..D+5 (cùng 1 lần gọi): bản chụp tối trước D chỉ có tầm ~1 ngày tới D, còn khối này nhắm tầm 3-5 ngày.
        const dates = Array.from({ length: STAB_DAYS }, (_, k) => addDaysStr(DATE, k));
        const pack = (ind: { verdict: string; usable: number; changed: number; models: { values: (number | null)[] }[] }) =>
          ({ verdict: ind.verdict, usable: ind.usable, changed: ind.changed, values: ind.models.map(m => m.values) });
        extra.stability = {
          arrivalDate: DATE, fetchedAt: new Date(st.fetchedAt).toISOString(), models: [...STABILITY_MODELS], missingModels: st.missingModels,
          days: assessStability(st.om, dates, st.fetchedAt).map(ds => ({
            date: ds.date, leadDays: leadDaysOf(`${ds.date}T06:00`, st.fetchedAt), rain: pack(ds.rain), dawnCloud: pack(ds.dawnCloud),
          })),
        };
      } catch (e: any) { extra.stabilityError = e.message; partial++; console.error(`LỖI: ${r.id} độ ổn định: ${e.message}`); }
      try { extra.storm = compactStorm(await retry429(`${r.id} dông`, () => fetchRouteStorm(p.samples))); }
      catch (e: any) { extra.stormError = e.message; partial++; console.error(`LỖI: ${r.id} dông: ${e.message}`); }
      extra.slide = {
        source: SLIDE_SOURCE,
        points: p.samples.map(s => ({ km: Math.round(s.km), elev: s.elev, ...slideRiskQD18(s.wx, s.elev) })).filter(x => x.status === 'LEVEL' || x.status === 'NO_PRIOR'),
        noDataCount: p.samples.filter(s => slideRiskQD18(s.wx, s.elev).status === 'NO_DATA').length,
      };
      out.push({   // thứ tự khoá giữ như bản chụp cũ: id, from, to, toName, rồi phần gọn dùng chung
        id: r.id, from: o.name, to: r.to, toName: d.name, vehicle: c.vehicle, speedKmh: c.speedKmh,
        router: c.router, fallbackNote: c.fallbackNote, departVN: c.departVN, sunrise: sr,
        distanceKm: c.distanceKm, durationH: c.durationH, maxElev: c.maxElev, cautionNote: c.cautionNote,
        level: c.level, levelLabel: c.levelLabel, noDataCount: c.noDataCount, worst: c.worst, samples: c.samples,
        ...extra,
      });
      console.log(`${r.id}: ${p.router} ${p.distanceKm.toFixed(0)} km, ${LEVEL_LABEL[p.summary.level]}, thiếu dự báo ${p.summary.noDataCount}/${p.samples.length}` +
        `, ổn định mưa D..D+5 ${extra.stability?.days.map((x: any) => x.rain.verdict[0] + x.rain.verdict[1]).join(' ') ?? 'LỖI'}, dông ${extra.storm?.worst ?? 'LỖI'}, sạt lở QĐ18 ${extra.slide.points.length} điểm`);
    } catch (e: any) {
      console.error(`LỖI: ${r.id}: ${e.message}`);   // đọc hụt thì kêu, không ghi tuyến rỗng
    }
  }
  if (!out.length) { console.error('LỖI: không lấy được tuyến nào, KHÔNG ghi tệp'); return 1; }
  mkdirSync('data/observations', { recursive: true });
  writeFileSync(OUT, JSON.stringify({
    date: DATE, rulesVersion: ROUTE_RULES_VERSION, snapshotAt: new Date().toISOString(),
    note: 'Phán quyết độ khó cung đường của app TRƯỚC chuyến đi. Không phải sự thật; chấm theo docs/cung-duong-kiem-chung.md.',
    routes: out,
  }, null, 1));
  console.log('đã ghi', OUT, `${out.length}/${ROUTES.length} tuyến`);
  if (partial) console.error(`LỖI: thiếu ${partial} phần phụ (độ ổn định/dông), xem dòng LỖI ở trên`);
  return out.length < ROUTES.length || partial ? 3 : 0;
}

main().then(c => process.exit(c), e => { console.error('LỖI:', e); process.exit(1); });
