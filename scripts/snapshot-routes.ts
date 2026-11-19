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
 * Mã thoát: 0 đủ tuyến | 3 thiếu tuyến (vẫn ghi phần lấy được) | 1 không tuyến nào (không ghi).
 */
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { MOUNTAIN_DB } from '../constants/mountains';
import { vnTodayStr, addDaysStr, computeSunTimes } from '../services/weatherService';
import {
  planRoute, setFetchHeaders, ROUTE_RULES_VERSION, DEFAULT_SPEED_KMH, LEVEL_LABEL, type LatLon, type Vehicle,
} from '../services/routeService';

const DATE = process.argv[2] || addDaysStr(vnTodayStr(), 1);
if (!/^\d{4}-\d{2}-\d{2}$/.test(DATE)) { console.error('LỖI: ngày phải dạng YYYY-MM-DD'); process.exit(1); }
const OUT = `data/observations/${DATE}-routes.json`;

/** Nơi xuất phát: trung tâm thành phố (xấp xỉ, node place=city của OSM). Chỉ là gốc tuyến, không phải điểm dự báo. */
export const ORIGINS: Record<string, { name: string } & LatLon> = {
  HN: { name: 'Hà Nội (Hồ Gươm)', lat: 21.0285, lon: 105.8542 },
  YB: { name: 'Yên Bái (TP)', lat: 21.7229, lon: 104.9113 },
  HUE: { name: 'Huế (TP)', lat: 16.4637, lon: 107.5909 },
};
/** Bộ tuyến cố định: đổi bộ này thì các ngày trước và sau không còn so được với nhau, nên chỉ THÊM, đừng sửa. */
export const ROUTES: { id: string; from: keyof typeof ORIGINS; to: string; vehicle: Vehicle }[] = [
  { id: 'HN-TA_XUA-moto', from: 'HN', to: 'TA_XUA_SON_LA', vehicle: 'motorbike' },
  { id: 'HN-PU_LUONG-moto', from: 'HN', to: 'PU_LUONG', vehicle: 'motorbike' },
  { id: 'HN-HANG_KIA-moto', from: 'HN', to: 'HANG_KIA_PA_CO', vehicle: 'motorbike' },
  { id: 'YB-PHINH_HO-moto', from: 'YB', to: 'PHINH_HO', vehicle: 'motorbike' },
  { id: 'HN-BA_VI-moto', from: 'HN', to: 'BA_VI', vehicle: 'motorbike' },
  { id: 'HN-SAPA-car', from: 'HN', to: 'SAPA_HAM_RONG', vehicle: 'car' },
  { id: 'HUE-BACH_MA-car', from: 'HUE', to: 'BACH_MA', vehicle: 'car' },
];
const GAP_MS = 1500;   // FOSSGIS: tối đa 1 yêu cầu/giây; mỗi tuyến gọi Valhalla đúng 1 lần

async function main(): Promise<number> {
  if (existsSync(OUT)) { console.log('đã có', OUT, '- không đè'); return 0; }
  // FOSSGIS đòi UA nêu tên ứng dụng (UA của thư viện không đủ). Chỉ áp cho script này.
  setFetchHeaders({ 'User-Agent': 'CloudHunter-route-snapshot/1.0 (+https://github.com/phongvan0926/cloudhunter)' });
  const out: any[] = [];
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
      out.push({
        id: r.id, from: o.name, to: r.to, toName: d.name, vehicle: r.vehicle, speedKmh: p.speedKmh,
        router: p.router, fallbackNote: p.fallbackNote ?? null,
        departVN: new Date(p.departMs + 7 * 3600_000).toISOString().slice(0, 16), sunrise: sr,
        distanceKm: Math.round(p.distanceKm * 10) / 10, durationH: Math.round(p.durationH * 100) / 100,
        maxElev: p.stats?.maxElev ?? null, cautionNote: p.cautionNote ?? null,
        level: p.summary.level, levelLabel: LEVEL_LABEL[p.summary.level], noDataCount: p.summary.noDataCount,
        worst: p.summary.worst.map(w => ({ kind: w.kind, level: w.level, km: Math.round(w.km), text: w.text })),
        samples: p.samples.map(s => ({
          km: Math.round(s.km), elev: s.elev, hour: s.hourKey, level: s.level,
          wx: s.wx && { t: s.wx.tempC, rh: s.wx.rh, mm: s.wx.precipMm, pop: s.wx.precipProb, wmo: s.wx.wmo, vis: s.wx.visibilityM, gust: s.wx.gustKmh, r24: s.wx.rain24h, r72: s.wx.rain72h },
          hz: s.hazards.map(h => `${h.kind}${h.level}`),
        })),
      });
      console.log(`${r.id}: ${p.router} ${p.distanceKm.toFixed(0)} km, ${LEVEL_LABEL[p.summary.level]}, thiếu dự báo ${p.summary.noDataCount}/${p.samples.length}`);
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
  return out.length < ROUTES.length ? 3 : 0;
}

main().then(c => process.exit(c), e => { console.error('LỖI:', e); process.exit(1); });
