/**
 * regional-days.ts — bảng THỜI TIẾT VÙNG lúc 05h mỗi ngày, để tìm "ngày tương tự" những ngày nhiều
 * đỉnh có biển mây (13/10, 18/10/2026...). Xem AGENTS.md mục "Ngày diện rộng".
 *
 * Nguồn: Open-Meteo historical-forecast (ECMWF IFS 0,25°), tức các giờ đầu của từng lượt chạy được lưu
 * lại — gần với phân tích, KHÔNG phải thứ app đã thấy tối hôm trước. Bảng này để TÌM kiểu thời tiết;
 * muốn dùng nó để dự báo thì phải kiểm lại trên dự báo tối hôm trước.
 *
 * Chỉ THÊM ngày chưa có, không ghi đè ngày cũ (giữ số lấy lần đầu, phòng khi kho lưu trữ đổi về sau).
 *
 * Chạy: npx vite-node scripts/regional-days.ts [ngày-bắt-đầu]
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { vnTodayStr } from '../services/weatherService';

const OUT = 'data/observations/regional-days.json';
const START = process.argv[2] || '2026-08-20';
// Điểm đại diện cho từng cụm núi (tâm vùng, không phải chỗ đứng): ô lưới 25km đằng nào cũng gộp cả vùng.
const POINTS: Record<string, { lat: number; lon: number; note: string }> = {
  SAPA: { lat: 22.33, lon: 103.84, note: 'Hoàng Liên Sơn: Fansipan, Lảo Thẩn, Ngũ Chỉ Sơn...' },
  MU_CANG_CHAI: { lat: 21.85, lon: 104.09, note: 'Lùng Cúng, Tà Chì Nhù, Sa Mu' },
  MOC_CHAU: { lat: 20.75, lon: 104.65, note: 'Tà Xùa, Pha Luông, Hang Kia' },
  HA_GIANG: { lat: 23.2, lon: 105.3, note: 'Đồng Văn, Mã Pí Lèng, Chiêu Lầu Thi' },
};
const VARS = ['pressure_msl', 'temperature_2m', 'dew_point_2m', 'precipitation', 'cloud_cover_low', 'cloud_cover_mid',
  'cloud_cover_high', 'temperature_925hPa', 'relative_humidity_925hPa', 'temperature_850hPa', 'relative_humidity_850hPa',
  'wind_speed_850hPa', 'wind_direction_850hPa', 'temperature_700hPa', 'relative_humidity_700hPa'];

const r1 = (x: number) => Math.round(x * 10) / 10;
const sum = (a: number[]) => a.reduce((s, x) => s + x, 0);
const mean = (a: number[]) => sum(a) / a.length;

async function main() {
  const store = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf-8')) : {
    source: 'Open-Meteo historical-forecast, ecmwf_ifs025, lúc 05:00 giờ VN', points: POINTS, days: {},
  };
  const end = vnTodayStr();
  const keys = Object.keys(POINTS);
  const url = 'https://historical-forecast-api.open-meteo.com/v1/forecast'
    + `?latitude=${keys.map(k => POINTS[k].lat).join(',')}&longitude=${keys.map(k => POINTS[k].lon).join(',')}`
    + `&start_date=${START}&end_date=${end}&hourly=${VARS.join(',')}&models=ecmwf_ifs025&timezone=Asia%2FHo_Chi_Minh`;
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok || !text.startsWith('[')) throw new Error(`historical-forecast trả HTTP ${res.status}: ${text.slice(0, 200)}`);
  const data = JSON.parse(text);

  let added = 0;
  keys.forEach((k, pi) => {
    const h = data[pi].hourly;
    h.time.forEach((t: string, i: number) => {
      if (!t.endsWith('T05:00') || i < 24) return;
      const d = t.slice(0, 10);
      if (store.days[d]?.[k]) return;
      const g = (v: string, j = i) => h[v][j] as number | null;
      const need = [...VARS.map(v => g(v)), g('pressure_msl', i - 24), g('temperature_850hPa', i - 24)];
      if (need.some(x => x === null || x === undefined)) return;   // thiếu số thì bỏ ngày, không điền
      const win = (v: string, a: number, b: number) => h[v].slice(i + a, i + b) as number[];
      (store.days[d] ||= {})[k] = {
        msl: r1(g('pressure_msl')!), dmsl24: r1(g('pressure_msl')! - g('pressure_msl', i - 24)!),
        t850: r1(g('temperature_850hPa')!), dt850_24: r1(g('temperature_850hPa')! - g('temperature_850hPa', i - 24)!),
        lapse850_700: r1(g('temperature_850hPa')! - g('temperature_700hPa')!),
        rh925: g('relative_humidity_925hPa'), rh850: g('relative_humidity_850hPa'), rh700: g('relative_humidity_700hPa'),
        wind850: r1(g('wind_speed_850hPa')!), wdir850: g('wind_direction_850hPa'),
        dpd2m: r1(g('temperature_2m')! - g('dew_point_2m')!),
        low: g('cloud_cover_low'), midNight: r1(mean(win('cloud_cover_mid', -10, 1))), highNight: r1(mean(win('cloud_cover_high', -10, 1))),
        rainPrevAfternoon: r1(sum(win('precipitation', -17, -5))),   // 12h-23h hôm trước
        rainNight: r1(sum(win('precipitation', -5, 2))),             // 00h-06h
      };
      added++;
    });
  });
  store.days = Object.fromEntries(Object.entries(store.days).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(OUT, JSON.stringify(store, null, 1) + '\n');
  console.log(`regional-days: thêm ${added} mục (điểm × ngày), kho có ${Object.keys(store.days).length} ngày → ${OUT}`);
}

main();
