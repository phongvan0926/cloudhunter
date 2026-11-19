/**
 * check-route-ends.ts - kiểm ĐIỂM CUỐI của bộ tuyến cố định (phiếu gcc29 vòng 7, 19/11/2026).
 *
 * Vì sao: máy tìm đường bám điểm đích vào đoạn đường gần nhất mà nó cho đi. Đích là đỉnh núi/điểm ngắm
 * ở cuối đường mòn thì tuyến dừng sớm (đo vòng 6: Huế - Bạch Mã dừng ở độ cao 151 m). Script in khoảng
 * hở (km chim bay từ điểm cuối tuyến tới đích) và độ cao điểm cuối so với độ cao khai báo của điểm.
 *
 * KHÔNG gọi Open-Meteo (vòng 7: IP máy nhà đã chạm trần ngày): độ cao lấy từ Valhalla /height (FOSSGIS,
 * SRTM), 1 yêu cầu cho cả tuyến; nhịp >= 1,2 s giữa các yêu cầu theo điều khoản FOSSGIS.
 *   npx vite-node scripts/check-route-ends.ts
 * Mã thoát: 0 mọi tuyến tới đích | 3 có tuyến lệch (in danh sách) | 1 lỗi mạng.
 */
import { countCallsAs } from './count-calls';
countCallsAs('check-route-ends');   // log 1 dòng lượt gọi theo máy chủ khi kết thúc (vòng 7)
import { MOUNTAIN_DB } from '../constants/mountains';
import { fetchRoute, setFetchHeaders, getJson, endGapOf, END_GAP_WARN_KM } from '../services/routeService';
import { ORIGINS, ROUTES } from './fixed-routes';

const ELEV_WARN_M = 200;   // ngưỡng in của phiếu vòng 7 (lệch độ cao điểm cuối so với điểm khai báo)
const pause = () => new Promise(r => setTimeout(r, 1200));

async function heights(pts: { lat: number; lon: number }[]): Promise<(number | null)[]> {
  const q = { shape: pts.map(p => ({ lat: +p.lat.toFixed(5), lon: +p.lon.toFixed(5) })) };
  const d = await getJson(`https://valhalla1.openstreetmap.de/height?json=${encodeURIComponent(JSON.stringify(q))}`, 3600_000);
  return (d?.height || []).map((v: unknown) => (typeof v === 'number' && v > -1000 ? v : null));
}

async function main(): Promise<number> {
  setFetchHeaders({ 'User-Agent': 'CloudHunter-route-check/1.0 (+https://github.com/phongvan0926/cloudhunter)' });
  let bad = 0;
  for (const r of ROUTES) {
    const o = ORIGINS[r.from], d = MOUNTAIN_DB[r.to];
    const g = await fetchRoute(o, d, r.vehicle); await pause();
    const end = g.coords[g.coords.length - 1];
    const [hEnd, hSpot] = await heights([end, d]); await pause();
    const gap = endGapOf(g.coords, d);
    const dElev = hEnd !== null ? d.elevation - hEnd : null;
    const flag = gap > END_GAP_WARN_KM || (dElev !== null && Math.abs(dElev) > ELEV_WARN_M);
    if (flag) bad++;
    console.log(`${flag ? 'LỆCH' : 'ok  '} ${r.id.padEnd(20)} ${g.router.padEnd(19)} ${g.distanceKm.toFixed(1).padStart(6)} km | cuối tuyến cách đích ${gap.toFixed(2)} km | độ cao cuối ${hEnd ?? '?'} m, điểm khai báo ${d.elevation} m (DEM tại điểm ${hSpot ?? '?'} m), lệch ${dElev ?? '?'} m${g.fallbackNote ? ' | ' + g.fallbackNote : ''}`);
  }
  console.log(`\n${bad} / ${ROUTES.length} tuyến lệch (khoảng hở > ${END_GAP_WARN_KM} km hoặc độ cao lệch > ${ELEV_WARN_M} m).`);
  return bad ? 3 : 0;
}
main().then(c => process.exit(c), e => { console.error('LỖI:', e?.message || e); process.exit(1); });
