/**
 * hindcast.ts — Soi lại MỘT ngày đã qua: engine chấm điểm bao nhiêu, vì sao, và các
 * biến vật lý thô là gì. Dùng khi thực tế trên núi khác với app (vd 23/8/2026 Tà Xùa
 * Sơn La có biển mây cả ngày nhưng app không báo).
 *
 * Chạy: npx vite-node scripts/hindcast.ts [KEY] [YYYY-MM-DD]
 * Mặc định: TA_XUA_SON_LA, hôm nay. Gọi API thật, không phải unit test.
 */
// localStorage giả cho môi trường node (weatherService cache đáy thung lũng qua nó)
if (typeof (globalThis as any).localStorage === 'undefined') {
  const mem = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => { mem.set(k, v); },
    removeItem: (k: string) => { mem.delete(k); },
  };
}

import { MOUNTAIN_DB } from '../constants/mountains';
import { vnTodayStr, fetchMountainWeather, WeatherModelId, DayModelData } from '../services/weatherService';
import { computeDayForecast, scoreOneModel, computeInversion, computeCloudBase, estimateCloudTop, assessWind } from '../services/cloudScoreEngine';
import { findBestMatchingPeak } from '../services/geminiService';

const KEY = process.argv[2] || 'TA_XUA_SON_LA';
const DATE = process.argv[3] || vnTodayStr();

async function main() {
  const mt = MOUNTAIN_DB[KEY];
  if (!mt) throw new Error(`Không có điểm ${KEY} trong thư viện`);
  console.log(`\n📍 ${mt.name}  (${mt.lat}, ${mt.lon})  đỉnh ${mt.elevation}m  zone ${mt.zone}`);
  console.log(`📅 Ngày soi: ${DATE}\n`);

  // Đi ĐÚNG đường của app thật: có truyền mặt cắt địa hình đã xác thực (App gọi qua
  // geminiService.analyzeWeatherData và luôn kèm matchedPreset.elevation_profile).
  const preset = findBestMatchingPeak(mt.name);
  // pastDays = 90: hindcast tồn tại để soi NGÀY ĐÃ QUA, nên không dùng cửa sổ 2 ngày của app.
  const pkg = await fetchMountainWeather(KEY, mt.name, DATE, DATE, undefined, undefined,
                                         undefined, preset?.elevation_profile, 90);
  const day = pkg.days.find(d => d.date === DATE);
  if (!day) throw new Error('Không có dữ liệu cho ngày này');
  const ctx = { valleyElevation: pkg.valleyElevation, observerAlt: mt.elevation, zone: mt.zone,
                lat: mt.lat, peakAltitude: preset?.altitude, profile: preset?.elevation_profile };
  console.log(`🔗 Mặt cắt địa hình khớp: ${preset ? preset.name : 'KHÔNG có → dùng DEM'}`);
  console.log(`🏞️  Đáy thung lũng dùng để chấm: ${pkg.valleyElevation}m (${pkg.valleySource}), người đứng ${mt.elevation}m`);
  console.log(`🧪 Chất lượng dữ liệu: ${day.quality}, mô hình có mặt: ${Object.keys(day.models).join(', ')}\n`);

  console.log('── BIẾN THÔ TỪNG MÔ HÌNH (cửa sổ bình minh 04–09h) ─────────────────');
  const hdr = ['model', 'Tđáy', 'Tdđáy', 'Tđứng', 'mâyThấp', 'mâyCao', 'mâyCaoĐêm',
               'mưaĐêm', 'mưaSớm', 'W850', 'W925đêm', 'RH925', 'RH850', 'T925', 'T850'];
  console.log(hdr.map((h, i) => h.padEnd(i === 0 ? 22 : 9)).join(''));
  for (const [id, m] of Object.entries(day.models) as [WeatherModelId, DayModelData][]) {
    const row = [id, m.t_valley_dawn, m.td_valley_dawn, m.t_obs_dawn, m.cloud_low_dawn,
                 m.cloud_high_dawn, m.cloud_high_night, m.precip_night, m.precip_dawn,
                 m.wind850_dawn_max, m.wind925_night, m.rh925, m.rh850, m.t925, m.t850];
    console.log(row.map((v, i) => String(typeof v === 'number' ? Math.round(v * 10) / 10 : v)
      .padEnd(i === 0 ? 22 : 9)).join(''));
  }

  console.log('\n── ENGINE CHẤM TỪNG MÔ HÌNH ────────────────────────────────────────');
  for (const [id, m] of Object.entries(day.models) as [WeatherModelId, DayModelData][]) {
    const s = scoreOneModel(id, m, ctx, DATE);
    const inv = computeInversion(m, ctx.valleyElevation);
    const base = computeCloudBase(m, ctx.valleyElevation);
    const top = estimateCloudTop(m, ctx.valleyElevation);
    const w = assessWind(m.wind850_dawn_max, ctx.zone);
    console.log(`\n  ${id}: ${s.score}/100  ${s.status}`);
    console.log(`     ổn định cột: ${inv.strength} (anomaly ${inv.anomaly}°C, đỉnh anomaly ${inv.anomalyHeight ?? '—'}m`
      + `${inv.ramp ? ' — DỐC, không phải đỉnh thật' : ''}) | nắp dùng để kẹp: ${inv.height ?? 'KHÔNG XÁC ĐỊNH'}`);
    console.log(`     đáy mây ${Math.round(base)}m | đỉnh mây ${top === null ? '—' : Math.round(top) + 'm'} | người đứng ${mt.elevation}m`);
    console.log(`     gió850 ${m.wind850_dawn_max.toFixed(0)}km/h → ${w.level} (${w.detail})`);
    // Mặt cắt áp suất là thứ engine-2.4 trở đi dùng để tìm MẶT biển mây; không in ra thì
    // không thể kiểm chứng vì sao đỉnh mây lại ra con số đó.
    if (m.levels?.length) {
      const prof = [...m.levels].sort((a, b) => a.h - b.h)
        .map(l => `${Math.round(l.h)}m:rh${Math.round(l.rh)}${Number.isFinite(l.cc) ? '/cc' + Math.round(l.cc) : ''}${Number.isFinite(l.t) ? '/T' + l.t.toFixed(1) : ''}`)
        .join('  ');
      console.log(`     mặt cắt: ${prof}`);
    }
    s.reasons.forEach(r => console.log(`     • ${r}`));
  }

  const out = computeDayForecast(day, ctx);
  console.log('\n══ KẾT LUẬN CỦA APP ════════════════════════════════════════════════');
  console.log(`   ĐIỂM ${out.forecast.score}/100 — ${out.forecast.status_code} (${out.forecast.status_text})`);
  console.log(`   đồng thuận ${out.agreement}%, chênh điểm giữa mô hình ${out.scoreSpread}`);
  out.forecast.reasons?.forEach(r => console.log(`   • ${r}`));
  out.warnings.forEach(w => console.log(`   ⚠️  ${w}`));
  console.log(`   ngưỡng "đáng đi" = 60 → app ${out.forecast.score >= 60 ? 'CÓ' : 'KHÔNG'} khuyên đi\n`);
}

main().catch(e => { console.error('❌', e?.message || e); process.exit(1); });
