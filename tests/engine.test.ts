/**
 * Golden tests cho cloudScoreEngine — khóa hành vi vật lý & chấm điểm.
 * Chạy: npm test
 */
import { describe, it, expect } from 'vitest';
import {
  computeInversion, computeCloudBase, estimateCloudTop, assessWind, computeFSI,
  computeVRII, sunriseColorPotential, seasonAdjust, scoreOneModel, combineModels,
  computeDayForecast,
} from '../services/cloudScoreEngine';
import { DayModelData, DayData, qualityForDaysAhead, computeSunTimes, aggregateDayModel, vnTodayStr, addDaysStr } from '../services/weatherService';

/** Kịch bản "đêm bức xạ vàng" ở thung lũng 600m: lặng gió, cận bão hòa, nghịch nhiệt rõ. */
function goldenNight(overrides: Partial<DayModelData> = {}): DayModelData {
  return {
    t_valley_dawn: 12.0, td_valley_dawn: 11.2, t_obs_dawn: 8.0, td_obs_dawn: 6.0,
    cloud_low_dawn: 85, cloud_mid_dawn: 10, cloud_high_dawn: 20,
    precip_dawn: 0, wind850_dawn_max: 5, wind925_dawn_max: 4, wind_dir850: 90,
    // thung lũng 600m, T kỳ vọng tại 850hPa (1500m) = 12 − 6.5×0.9 ≈ 6.15 → t850=10 là nghịch nhiệt mạnh (+3.9)
    t925: 11.5, t850: 10.0, t700: 2.0,
    rh925: 95, rh850: 88, rh700: 30,
    cloud_high_night: 5, wind925_night: 3, precip_night: 0, rh2m_valley_night: 97,
    ...overrides,
  };
}

const CTX_A = { valleyElevation: 600, observerAlt: 2000, zone: 'A_CLOUD_TRAP' as const };
const CTX_B = { valleyElevation: 600, observerAlt: 2000, zone: 'B_WIND_TUNNEL' as const };

describe('computeInversion — vật lý tham chiếu thung lũng', () => {
  it('phát hiện nghịch nhiệt thật (t850 ấm hơn suy giảm chuẩn từ thung lũng)', () => {
    const inv = computeInversion(goldenNight(), 600);
    expect(inv.strength).toBe('Strong');
    expect(inv.anomaly).toBeGreaterThan(3);
  });

  it('HỒI QUY LỖI CŨ: khí quyển suy giảm chuẩn KHÔNG được coi là nghịch nhiệt, kể cả với đỉnh cao', () => {
    // Khí quyển hoàn toàn bình thường: T giảm đều 6.5°C/km từ thung lũng 600m
    // (code cũ so "T850 > T_đỉnh" nên với đỉnh 2860m LUÔN ra Strong — lỗi hệ thống)
    const normal = goldenNight({ t_valley_dawn: 15, t925: 13.9, t850: 9.1, t700: -1 });
    const inv = computeInversion(normal, 600);
    expect(['Weak', 'None']).toContain(inv.strength);
  });

  it('khí quyển bất ổn định (giảm nhiệt nhanh hơn chuẩn) → None', () => {
    const unstable = goldenNight({ t_valley_dawn: 18, t925: 15, t850: 8, t700: -3 });
    expect(computeInversion(unstable, 600).strength).toBe('None');
  });
});

describe('computeCloudBase & estimateCloudTop', () => {
  it('LCL tính từ thung lũng: spread 0.8°C → đáy mây thấp ngay trên thung lũng', () => {
    expect(computeCloudBase(goldenNight(), 600)).toBe(600 + Math.round(125 * 0.8));
  });

  it('không có mây tầng thấp → không có biển mây (top = null), KHÔNG bịa số', () => {
    expect(estimateCloudTop(goldenNight({ cloud_low_dawn: 5 }), 600)).toBeNull();
  });

  it('ẩm bão hòa tới 850hPa → mặt mây quanh 1650m', () => {
    const top = estimateCloudTop(goldenNight(), 600);
    expect(top).toBe(1650); // 1500 (850hPa) + 150
  });

  it('ẩm sâu tới 700hPa → mây trùm rất dày', () => {
    const top = estimateCloudTop(goldenNight({ rh700: 90 }), 600);
    expect(top).toBeGreaterThanOrEqual(3100);
  });
});

describe('assessWind — ngưỡng theo vùng địa hình (Module 6)', () => {
  it('Zone A chịu được gió 12km/h (Medium), Zone B thì không (High)', () => {
    expect(assessWind(12, 'A_CLOUD_TRAP').level).toBe('Medium');
    expect(assessWind(12, 'B_WIND_TUNNEL').level).toBe('High');
  });
  it('Zone B chỉ Low khi ≤5km/h', () => {
    expect(assessWind(5, 'B_WIND_TUNNEL').level).toBe('Low');
    expect(assessWind(6, 'B_WIND_TUNNEL').level).toBe('Medium');
  });
  it('gió >20km/h là Destructive ở mọi vùng', () => {
    expect(assessWind(25, 'A_CLOUD_TRAP').level).toBe('Destructive');
    expect(assessWind(25, 'B_WIND_TUNNEL').level).toBe('Destructive');
  });
});

describe('FSI & VRII — tham chiếu thung lũng', () => {
  it('đêm vàng → FSI thấp (tốt)', () => {
    const m = goldenNight();
    const fsi = computeFSI(m, assessWind(m.wind850_dawn_max, 'A_CLOUD_TRAP'));
    expect(fsi).toBeLessThan(30);
  });
  it('VRII cao khi đêm lặng + ẩm + nghịch nhiệt; thấp khi mây cao che đêm', () => {
    const good = computeVRII(goldenNight(), 3.9);
    const blocked = computeVRII(goldenNight({ cloud_high_night: 80 }), 3.9);
    expect(good.score).toBeGreaterThanOrEqual(80);
    expect(blocked.score).toBeLessThan(good.score);
  });
});

describe('sunriseColorPotential — cho nhiếp ảnh', () => {
  it('mây cao vừa phải (~35%) → tiềm năng cháy mây cao nhất', () => {
    expect(sunriseColorPotential(goldenNight({ cloud_high_dawn: 35, cloud_mid_dawn: 0 }))).toBeGreaterThanOrEqual(90);
  });
  it('trời phủ kín → mất bình minh', () => {
    expect(sunriseColorPotential(goldenNight({ cloud_high_dawn: 90 }))).toBeLessThanOrEqual(10);
  });
});

describe('seasonAdjust (Module 7)', () => {
  it('tháng 10-11 cộng điểm; mùa hè trừ điểm + cảnh báo sạt lở', () => {
    expect(seasonAdjust('2026-10-15').delta).toBeGreaterThan(0);
    const summer = seasonAdjust('2026-07-15');
    expect(summer.delta).toBeLessThan(0);
    expect(summer.warnings.join(' ')).toMatch(/sạt lở/);
  });
});

describe('scoreOneModel — cây trạng thái', () => {
  it('đêm vàng + đứng 2000m trên mặt mây 1650m → STATIC điểm cao', () => {
    const r = scoreOneModel('ecmwf_ifs025', goldenNight(), CTX_A, '2026-11-05');
    expect(r.status).toBe('STATIC');
    expect(r.score).toBeGreaterThanOrEqual(75);
    expect(r.reasons.length).toBeGreaterThan(3);
  });

  it('mưa sáng → RAIN bất kể các chỉ số khác đẹp', () => {
    const r = scoreOneModel('ecmwf_ifs025', goldenNight({ precip_dawn: 4 }), CTX_A, '2026-11-05');
    expect(r.status).toBe('RAIN');
  });

  it('Zone B gió 18km/h → gió phá mây (DISSIPATING), Zone A cùng gió thì chưa', () => {
    const windy = goldenNight({ wind850_dawn_max: 18 });
    expect(scoreOneModel('gfs_seamless', windy, CTX_B, '2026-11-05').status).toBe('DISSIPATING');
    expect(scoreOneModel('gfs_seamless', windy, CTX_A, '2026-11-05').status).not.toBe('DISSIPATING');
  });

  it('khô + không mây thấp → CLEAR điểm thấp', () => {
    const dry = goldenNight({ cloud_low_dawn: 3, td_valley_dawn: 4, rh925: 45, rh850: 35, rh700: 20 });
    const r = scoreOneModel('icon_seamless', dry, CTX_A, '2026-11-05');
    expect(r.status).toBe('CLEAR');
    expect(r.score).toBeLessThan(50);
  });

  it('đứng DƯỚI mặt mây sâu → FOG', () => {
    const r = scoreOneModel('ecmwf_ifs025', goldenNight(), { ...CTX_A, observerAlt: 1000 }, '2026-11-05');
    expect(r.status).toBe('FOG');
  });

  it('đứng NGAY mặt mây → FLUCTUATING/ROLLING (quy tắc ranh giới Module 5)', () => {
    const r = scoreOneModel('ecmwf_ifs025', goldenNight(), { ...CTX_A, observerAlt: 1700 }, '2026-11-05');
    expect(['FLUCTUATING', 'ROLLING']).toContain(r.status);
  });
});

describe('combineModels — đồng thuận THẬT', () => {
  it('median điểm + trạng thái đa số + spread thật', () => {
    const mk = (score: number, status: any) => ({ model: 'ecmwf_ifs025' as const, score, status, cloudTop: 1650, reasons: [] });
    const c = combineModels([mk(80, 'STATIC'), mk(70, 'STATIC'), mk(40, 'DISSIPATING')]);
    expect(c.score).toBe(70);
    expect(c.status).toBe('STATIC');
    expect(c.agreement).toBe(67);
    expect(c.scoreSpread).toBe(40);
  });
});

describe('computeDayForecast — trung thực dữ liệu', () => {
  it('NO_DATA → UNKNOWN, không có con số nào được bịa', () => {
    const day: DayData = {
      date: '2027-01-01', quality: 'NO_DATA', daysAhead: 120, models: {},
      sun_times: computeSunTimes(22.6, 103.6, '2027-01-01'),
    };
    const out = computeDayForecast(day, CTX_A);
    expect(out.forecast.status_code).toBe('UNKNOWN');
    expect(out.forecast.score).toBe(0);
    expect(out.forecast.technical_indices.LCL_base).toBe('N/A');
    expect(out.forecast.technical_indices.cloud_top_m).toBeNull();
  });

  it('ngày đủ dữ liệu → chỉ số đầy đủ + reasons minh bạch + boundary_status', () => {
    const day: DayData = {
      date: '2026-11-05', quality: 'FORECAST', daysAhead: 1,
      models: { ecmwf_ifs025: goldenNight(), gfs_seamless: goldenNight(), icon_seamless: goldenNight() },
      sun_times: computeSunTimes(22.6, 103.6, '2026-11-05'),
    };
    const out = computeDayForecast(day, CTX_A);
    expect(out.forecast.status_code).toBe('STATIC');
    expect(out.agreement).toBe(100);
    expect(out.forecast.technical_indices.delta_h).toBe(350); // 2000 − 1650
    expect(out.forecast.reasons!.length).toBeGreaterThan(3);
    expect(out.forecast.data_quality).toBe('FORECAST');
  });

  it('ngày xa (UNCERTAIN) phải mang ghi chú độ tin cậy', () => {
    const day: DayData = {
      date: '2026-11-05', quality: 'UNCERTAIN', daysAhead: 9,
      models: { ecmwf_ifs025: goldenNight() },
      sun_times: computeSunTimes(22.6, 103.6, '2026-11-05'),
    };
    const out = computeDayForecast(day, CTX_A);
    expect(out.forecast.reliability_note).toMatch(/xa 9 ngày/);
  });
});

describe('qualityForDaysAhead — nhãn tin cậy theo horizon', () => {
  it('≤3 ngày FORECAST, 4-15 UNCERTAIN, ngoài đó NO_DATA', () => {
    expect(qualityForDaysAhead(0)).toBe('FORECAST');
    expect(qualityForDaysAhead(3)).toBe('FORECAST');
    expect(qualityForDaysAhead(4)).toBe('UNCERTAIN');
    expect(qualityForDaysAhead(15)).toBe('UNCERTAIN');
    expect(qualityForDaysAhead(16)).toBe('NO_DATA');
    expect(qualityForDaysAhead(-3)).toBe('NO_DATA');
  });
});

describe('MOUNTAIN_DB mở rộng 8/2026 — nhận diện đúng điểm mới, không đụng điểm cũ', () => {
  it('các điểm hot mới resolve đúng entry (Sa Mu, Bình Liêu, Bà Đen, Cầu Đất, Măng Đen...)', async () => {
    const { findBestMatchingMountain } = await import('../services/geminiService');
    const cases: Array<[string, string]> = [
      ['Sa Mu', 'SA_MU_U_BO'],
      ['đỉnh sa mu u bò', 'SA_MU_U_BO'],
      ['sống lưng khủng long Bình Liêu', 'BINH_LIEU'],
      ['núi Bà Đen', 'BA_DEN'],
      ['đồi chè Cầu Đất', 'CAU_DAT'],
      ['Măng Đen', 'MANG_DEN'],
      ['Lang Biang', 'LANG_BIANG'],
      ['Phia Oắc', 'PHIA_OAC'],
      ['Bạch Mã', 'BACH_MA'],
      ['Tà Năng', 'TA_NANG'],
      ['Linh Quy Pháp Ấn', 'LINH_QUY_PHAP_AN'],
    ];
    for (const [input, key] of cases) {
      const m = findBestMatchingMountain(input);
      expect(m?.key, `input "${input}"`).toBe(key);
    }
  });

  it('đợt 2 — điểm ít người biết user cung cấp resolve đúng, Putaleng giữ nguyên alias tả lèng', async () => {
    const { findBestMatchingMountain } = await import('../services/geminiService');
    const cases: Array<[string, string]> = [
      ['Phình Hồ', 'PHINH_HO'],
      ['đỉnh săn mây Làng Nhì', 'LANG_NHI'],
      ['săn mây Tả Lèng', 'TA_LENG_SAN_MAY'],
      ['săn mây Lai Châu', 'TA_LENG_SAN_MAY'],
      ['điểm săn mây Ngọc Sơn', 'NGOC_SON_LAC_SON'],
      ['Kéo Lồm', 'KEO_LOM'],
      ['săn mây Thung Mài', 'HANG_KIA_PA_CO'],
      ['cốt 1100', 'BA_VI'],
      ['săn mây Đồn Đèn', 'DON_DEN'],
      ['điểm săn mây Bản Nà', 'BAN_NA'],
      ['săn mây Chiềng Công', 'CHIENG_CONG'],
    ];
    for (const [input, key] of cases) {
      expect(findBestMatchingMountain(input)?.key, `input "${input}"`).toBe(key);
    }
    // Putaleng không bị đồi Tả Lèng mới cướp tên gốc
    expect(findBestMatchingMountain('Putaleng')?.key).toBe('PUTALENG');
    expect(findBestMatchingMountain('Tả Lèng')?.key).toBe('PUTALENG');
  });

  it('điểm cũ không bị điểm mới cướp match (Tà Xùa, Sa Pa, U Bò Bắc Yên cũ)', async () => {
    const { findBestMatchingMountain } = await import('../services/geminiService');
    expect(findBestMatchingMountain('Tà Xùa')?.key).toBe('TA_XUA_SON_LA');
    // 'Sapa' vốn match FANSIPAN (cùng khu vực, alias 'sapa' có từ trước) — chỉ cần không rơi ra ngoài vùng Sapa
    expect(['FANSIPAN', 'SAPA_HAM_RONG']).toContain(findBestMatchingMountain('Sapa')?.key);
    expect(findBestMatchingMountain('đỉnh u bò')?.key).toBe('DINH_U_BO');
  });

  it('tọa độ mọi entry nằm trong lãnh thổ VN và độ cao hợp lệ', async () => {
    const { MOUNTAIN_DB } = await import('../constants/mountains');
    for (const [key, mt] of Object.entries(MOUNTAIN_DB)) {
      expect(mt.lat, key).toBeGreaterThan(8);
      expect(mt.lat, key).toBeLessThan(23.6);
      expect(mt.lon, key).toBeGreaterThan(102);
      expect(mt.lon, key).toBeLessThan(110);
      expect(mt.elevation, key).toBeGreaterThan(100);
      expect(mt.elevation, key).toBeLessThanOrEqual(3200);
    }
  });
});

describe('buildFallbackChain — thứ tự model dự phòng', () => {
  it('HỒI QUY: model chọn lỗi phải rơi xuống Flash GẦN NHẤT, Lite luôn cuối hàng', async () => {
    const { buildFallbackChain } = await import('../services/modelDiscoveryService');
    const mk = (id: string) => ({ id, name: id, displayName: id, tier: 'flash' as const, tierLabel: '⚡' });
    const models = [
      mk('gemini-flash-lite-latest'), mk('gemini-flash-latest'), mk('gemini-2.5-flash-lite'),
      mk('gemini-2.5-flash'), mk('gemini-3.5-flash'), mk('gemini-3.7-flash-preview'),
    ];
    const chain = buildFallbackChain('gemini-3.7-flash', models);
    expect(chain[0]).toBe('gemini-3.7-flash');            // luôn ưu tiên lựa chọn của người dùng
    expect(chain[1]).toBe('gemini-flash-latest');         // alias flash mới nhất kế tiếp
    // mọi bản "lite" phải đứng SAU mọi bản flash thường (bug cũ: lite-latest nhảy lên đầu)
    const firstLite = chain.findIndex(id => id.includes('lite'));
    const lastNonLite = chain.reduce((acc, id, i) => (!id.includes('lite') ? i : acc), 0);
    expect(firstLite).toBeGreaterThan(lastNonLite);
    // bản preview đứng sau bản ổn định cùng đẳng cấp
    expect(chain.indexOf('gemini-3.5-flash')).toBeLessThan(chain.indexOf('gemini-3.7-flash-preview'));
  });
});

describe('buildFallbackChain — bậc thang đúng với danh sách model thật của user (18/8/2026)', () => {
  it('3.7 lỗi → flash-latest → 3.6 → 3.5 → 2.5 → preview → mọi bản Lite cuối cùng', async () => {
    const { buildFallbackChain } = await import('../services/modelDiscoveryService');
    const mk = (id: string) => ({ id, name: id, displayName: id, tier: 'flash' as const, tierLabel: '⚡' });
    const models = [
      mk('gemini-flash-lite-latest'), mk('gemini-flash-latest'), mk('gemini-3.7-flash'),
      mk('gemini-3.6-flash'), mk('gemini-3.5-flash-lite'), mk('gemini-3.5-flash'),
      mk('gemini-3.1-flash-lite-preview'), mk('gemini-3.1-flash-lite'),
      mk('gemini-3-flash-preview'), mk('gemini-2.5-flash-lite'), mk('gemini-2.5-flash'),
    ];
    const chain = buildFallbackChain('gemini-3.7-flash', models);
    expect(chain.slice(0, 5)).toEqual([
      'gemini-3.7-flash',      // lựa chọn của người dùng
      'gemini-flash-latest',   // alias flash mạnh nhất hiện có
      'gemini-3.6-flash',      // xuống dần từng bậc...
      'gemini-3.5-flash',
      'gemini-2.5-flash',
    ]);
    const firstLite = chain.findIndex(id => id.includes('lite'));
    expect(chain.slice(0, firstLite)).not.toContain('gemini-3.5-flash-lite');
    expect(firstLite).toBeGreaterThanOrEqual(6); // toàn bộ flash thường + preview đứng trước Lite
  });

  it('isTextAnalysisModel loại model tạo ảnh (Nano Banana) và Live/audio khỏi danh sách', async () => {
    const { isTextAnalysisModel } = await import('../services/modelDiscoveryService');
    expect(isTextAnalysisModel('gemini-3.1-flash-image', 'Nano Banana 2')).toBe(false);
    expect(isTextAnalysisModel('gemini-2.5-flash-image-preview', 'Nano Banana')).toBe(false);
    expect(isTextAnalysisModel('gemini-2.5-flash-live', 'Gemini Live')).toBe(false);
    expect(isTextAnalysisModel('gemini-3.7-flash', 'Gemini 3.7 Flash')).toBe(true);
    expect(isTextAnalysisModel('gemini-2.5-flash-lite', 'Gemini 2.5 Flash-Lite')).toBe(true);
  });
});

describe('parseKeyFromHash — chuyển API key giữa thiết bị qua #gkey', () => {
  it('nhận key hợp lệ, từ chối rác/thiếu, hỗ trợ URL-encode', async () => {
    const { parseKeyFromHash } = await import('../services/modelDiscoveryService');
    expect(parseKeyFromHash('#gkey=AIzaSyABCDEFGHIJKLMNOPQRSTUV123')).toBe('AIzaSyABCDEFGHIJKLMNOPQRSTUV123');
    expect(parseKeyFromHash('#foo=1&gkey=AIzaSyABCDEFGHIJKLMNOPQRSTUV123')).toBe('AIzaSyABCDEFGHIJKLMNOPQRSTUV123');
    expect(parseKeyFromHash('#gkey=AIzaSy%41BCDEFGHIJKLMNOPQRSTUV123')).toBe('AIzaSyABCDEFGHIJKLMNOPQRSTUV123');
    expect(parseKeyFromHash('#gkey=short')).toBeNull();          // quá ngắn
    expect(parseKeyFromHash('#gkey=co%20khoang%20trang%20abcdef')).toBeNull(); // ký tự lạ
    expect(parseKeyFromHash('#other=x')).toBeNull();
    expect(parseKeyFromHash('')).toBeNull();
  });
});

describe('seasonAdjust theo vùng khí hậu (Đợt 4)', () => {
  it('không có vĩ độ → giữ nguyên nhịp Tây Bắc (hành vi cũ)', () => {
    expect(seasonAdjust('2026-10-15').delta).toBe(8);
    expect(seasonAdjust('2026-07-15').delta).toBe(-12);
  });
  it('miền Trung (Bạch Mã 16.17°): mùa mưa bão 9-12 trừ nặng + cảnh báo; đầu năm cộng', () => {
    const storm = seasonAdjust('2026-10-15', 16.175);
    expect(storm.delta).toBeLessThan(0);
    expect(storm.warnings.join(' ')).toMatch(/bão/);
    expect(seasonAdjust('2026-01-15', 16.175).delta).toBeGreaterThan(0);
  });
  it('Nam/Tây Nguyên (Bà Đen 11.38°, Măng Đen 14.58°): mùa khô 11-4 cộng, mùa mưa 5-10 trừ', () => {
    expect(seasonAdjust('2026-12-15', 11.38).delta).toBeGreaterThan(0);
    expect(seasonAdjust('2026-12-15', 14.577).delta).toBeGreaterThan(0);
    expect(seasonAdjust('2026-07-15', 11.38).delta).toBeLessThan(0);
  });
  it('cùng ngày tháng 12: Bắc = 0 (rét), Nam = +6 (mùa khô) — nhịp mùa 3 miền khác nhau', () => {
    expect(seasonAdjust('2026-12-15', 21.27).delta).toBe(0);
    expect(seasonAdjust('2026-12-15', 11.38).delta).toBe(6);
  });
});

describe('fetchEnsembleDays — xác suất từ tổ hợp ECMWF (fetch mock)', () => {
  it('probCloudSea/p10/p90/probRain đúng theo phân bố member; giữ nguyên khi <10 member thì bỏ', async () => {
    const { fetchEnsembleDays } = await import('../services/weatherService');
    const time: string[] = [];
    for (let h = 0; h < 24; h++) time.push(`2026-11-05T${String(h).padStart(2, '0')}:00`);
    const hourly: any = { time };
    // 20 kịch bản: 10 kịch bản mây thấp 80%, 10 kịch bản 10%; 5 kịch bản có mưa
    for (let m = 1; m <= 20; m++) {
      const v = m <= 10 ? 80 : 10;
      hourly[`cloud_cover_low_member${String(m).padStart(2, '0')}`] = time.map(() => v);
      hourly[`precipitation_member${String(m).padStart(2, '0')}`] = time.map(() => (m <= 5 ? 0.2 : 0));
    }
    const origFetch = globalThis.fetch;
    globalThis.fetch = (async () => ({ ok: true, json: async () => ({ hourly }) })) as any;
    try {
      const out = await fetchEnsembleDays(21.3, 104.3, 600, '2026-11-05', '2026-11-05');
      const d = out['2026-11-05'];
      expect(d.members).toBe(20);
      expect(d.probCloudSea).toBe(50);
      expect(d.p10).toBe(10);
      expect(d.p90).toBe(80);
      expect(d.probRain).toBe(25); // 5/20 kịch bản có mưa >0.3mm trong 4-9h
    } finally { globalThis.fetch = origFetch; }
  });
});

describe('verifyRun — đối chiếu dự báo đã lưu với ERA5 (fetch mock)', () => {
  it('STATIC + thực tế mây 80% = trúng; CLEAR + thực tế 70% = trượt; ngày null = chờ', async () => {
    const { verifyRun } = await import('../services/verificationService');
    const d1 = addDaysStr(vnTodayStr(), -10);
    const d2 = addDaysStr(vnTodayStr(), -9);
    const d3 = addDaysStr(vnTodayStr(), -8);
    const mkFc = (date: string, status: string, score: number) => ({
      date, score, status_code: status, status_text: '', data_quality: 'FORECAST',
      technical_indices: {}, weather_analysis: {}, expert_advice: '', weather_summary: {},
    });
    const analysis: any = {
      locationName: 'Test',
      weather_data_source: { lat: 21.3, lon: 104.3 },
      dailyForecasts: [mkFc(d1, 'STATIC', 80), mkFc(d2, 'CLEAR', 20), mkFc(d3, 'STATIC', 70)],
    };
    const time: string[] = [];
    const cloud: (number | null)[] = [];
    for (const [d, v] of [[d1, 80], [d2, 70], [d3, null]] as [string, number | null][]) {
      for (let h = 0; h < 24; h++) { time.push(`${d}T${String(h).padStart(2, '0')}:00`); cloud.push(v); }
    }
    const origFetch = globalThis.fetch;
    globalThis.fetch = (async () => ({ ok: true, json: async () => ({ hourly: { time, cloud_cover_low: cloud } }) })) as any;
    try {
      const r = await verifyRun(analysis);
      expect(r.days).toHaveLength(3);
      expect(r.days[0].hit).toBe(true);   // đoán có, thực tế 80% ≥40 → trúng
      expect(r.days[1].hit).toBe(false);  // đoán không, thực tế 70% → trượt
      expect(r.days[2].hit).toBeNull();   // ERA5 chưa có → không phán
      expect(r.hits).toBe(1); expect(r.misses).toBe(1); expect(r.pending).toBe(1);
    } finally { globalThis.fetch = origFetch; }
  });

  it('chưa có ngày nào đủ xa → báo lỗi trung thực, không tự phán', async () => {
    const { verifyRun } = await import('../services/verificationService');
    const analysis: any = {
      locationName: 'Test',
      weather_data_source: { lat: 21.3, lon: 104.3 },
      dailyForecasts: [{ date: vnTodayStr(), score: 50, status_code: 'STATIC' }],
    };
    await expect(verifyRun(analysis)).rejects.toThrow(/đủ xa/);
  });
});

describe('buildHourlyProfile — dữ liệu biểu đồ mây time × altitude', () => {
  const mkTime = () => {
    const time: string[] = [];
    for (const d of ['2026-11-04', '2026-11-05']) {
      for (let h = 0; h < 24; h++) time.push(`${d}T${String(h).padStart(2, '0')}:00`);
    }
    return time;
  };

  it('chọn model nhiều tầng nhất, cửa sổ 12h hôm trước → 12h ngày dự báo, null giữ nguyên', async () => {
    const { buildHourlyProfile } = await import('../services/weatherService');
    const time = mkTime();
    const constant = (v: number) => time.map(() => v);
    const series: Record<string, number[]> = {
      // icon có 4 tầng cc, gfs chỉ 3 → phải chọn icon
      'cloud_cover_925hPa_icon_seamless': constant(80),
      'cloud_cover_900hPa_icon_seamless': constant(60),
      'cloud_cover_850hPa_icon_seamless': constant(40),
      'cloud_cover_700hPa_icon_seamless': constant(0),
      'geopotential_height_850hPa_icon_seamless': constant(1470),
      'cloud_cover_925hPa_gfs_seamless': constant(70),
      'cloud_cover_850hPa_gfs_seamless': constant(30),
      'cloud_cover_700hPa_gfs_seamless': constant(0),
    };
    const block = {
      time,
      get: (v: string, model: string) => series[`${v}_${model}`] || null,
    };
    const p = buildHourlyProfile(block as any, '2026-11-05', '2026-11-04')!;
    expect(p.model).toBe('icon_seamless');
    expect(p.levels.map(l => l.p)).toEqual([925, 900, 850, 700]);
    expect(p.times).toHaveLength(25); // 12→23 (12 giờ) + 0→12 (13 giờ)
    expect(p.times[0]).toBe('2026-11-04T12:00');
    expect(p.times[24]).toBe('2026-11-05T12:00');
    const l850 = p.levels.find(l => l.p === 850)!;
    expect(l850.h).toBe(1470);
    expect(l850.hReal).toBe(true);
    expect(p.levels.find(l => l.p === 925)!.hReal).toBe(false); // không có gph → xấp xỉ, dán nhãn thật
  });

  it('không model nào đủ 3 tầng → undefined (không vẽ biểu đồ bịa)', async () => {
    const { buildHourlyProfile } = await import('../services/weatherService');
    const time = mkTime();
    const series: Record<string, number[]> = {
      'cloud_cover_925hPa_gfs_seamless': time.map(() => 50),
    };
    const block = { time, get: (v: string, m: string) => series[`${v}_${m}`] || null };
    expect(buildHourlyProfile(block as any, '2026-11-05', '2026-11-04')).toBeUndefined();
  });
});

describe('astroService — trăng cho nhiếp ảnh (tính cục bộ, deterministic)', () => {
  it('cùng đầu vào → cùng kết quả; illumination 0-100; logic Milky Way nhất quán', async () => {
    const { moonInfoForDawn } = await import('../services/astroService');
    const a = moonInfoForDawn('2026-11-05', 21.35, 104.41);
    const b = moonInfoForDawn('2026-11-05', 21.35, 104.41);
    expect(a).toEqual(b);
    expect(a.illumination).toBeGreaterThanOrEqual(0);
    expect(a.illumination).toBeLessThanOrEqual(100);
    expect(a.phaseLabel.length).toBeGreaterThan(0);
    if (!a.moonUpAtDawn) expect(a.milkyWayWindow).toBe(true);
  });

  it('trăng tròn vs trăng non cho illumination khác nhau rõ rệt (chu kỳ ~29.5 ngày)', async () => {
    const { moonInfoForDawn } = await import('../services/astroService');
    // quét 30 ngày liên tiếp phải có cả ngày rất sáng (>90) và ngày rất tối (<10)
    const ills: number[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(Date.UTC(2026, 10, 1 + i)).toISOString().slice(0, 10);
      ills.push(moonInfoForDawn(d, 21.35, 104.41).illumination);
    }
    expect(Math.max(...ills)).toBeGreaterThan(90);
    expect(Math.min(...ills)).toBeLessThan(10);
  });
});

describe('vnTodayStr / addDaysStr — ngày theo giờ Việt Nam', () => {
  it('vnTodayStr trả đúng ngày hiện tại ở Asia/Ho_Chi_Minh (không phải UTC)', () => {
    expect(vnTodayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const expected = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
    expect(vnTodayStr()).toBe(expected);
    // Hồi quy bug: sau 17h UTC (= 0h VN hôm sau), toISOString() lùi 1 ngày so với giờ VN
    const utcDate = new Date().toISOString().slice(0, 10);
    const diffDays = (new Date(vnTodayStr() + 'T00:00:00Z').getTime() - new Date(utcDate + 'T00:00:00Z').getTime()) / 86400000;
    expect([0, 1]).toContain(diffDays); // VN luôn bằng hoặc NHANH hơn UTC 1 ngày, không bao giờ chậm hơn
  });

  it('addDaysStr cộng ngày an toàn qua ranh giới tháng/năm', () => {
    expect(addDaysStr('2026-08-18', 3)).toBe('2026-08-21');
    expect(addDaysStr('2026-08-30', 3)).toBe('2026-09-02');
    expect(addDaysStr('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysStr('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('engine-2.0 — profile tầng thật (geopotential + cloud cover từng tầng)', () => {
  // Thung lũng 600m, đêm bức xạ: mây phủ liên tục 975→850hPa, khô từ 800hPa trở lên,
  // độ cao là geopotential THẬT (khác hằng số xấp xỉ vài chục mét)
  const realLevels = () => [
    { p: 975, h: 320, hReal: true, t: 11.0, rh: 96, cc: 90 },
    { p: 950, h: 540, hReal: true, t: 11.4, rh: 95, cc: 85 },
    { p: 925, h: 745, hReal: true, t: 11.5, rh: 95, cc: 80 },
    { p: 900, h: 985, hReal: true, t: 11.8, rh: 92, cc: 70 },
    { p: 850, h: 1462, hReal: true, t: 10.0, rh: 88, cc: 55 },
    { p: 800, h: 1940, hReal: true, t: 4.5, rh: 40, cc: 5 },
    { p: 700, h: 3105, hReal: true, t: 2.0, rh: 30, cc: 0 },
  ];

  it('nghịch nhiệt quét TOÀN profile, trả độ cao tầng cực đại theo geopotential thật', () => {
    const inv = computeInversion(goldenNight({ levels: realLevels() }), 600);
    // anomaly cực đại tại 850hPa (1462m): 10.0 − (12 − 6.5×0.862) = +3.6 → Strong
    expect(inv.strength).toBe('Strong');
    expect(inv.height).toBe(1462);
    expect(inv.anomaly).toBeGreaterThan(3);
  });

  it('fallback không có profile: độ cao nghịch nhiệt lấy xấp xỉ 850hPa=1500m', () => {
    const inv = computeInversion(goldenNight(), 600);
    expect(inv.strength).toBe('Strong');
    expect(inv.height).toBe(1500);
  });

  it('mặt mây = đỉnh LỚP MÂY LIÊN TỤC (cc≥45 hoặc RH≥80) + 150m, theo độ cao thật', () => {
    const top = estimateCloudTop(goldenNight({ levels: realLevels() }), 600);
    expect(top).toBe(1462 + 150); // lớp mây liền mạch 320→1462m, 800hPa khô chặn trên
  });

  it('KHÔNG nhảy cóc lên lớp mây trung tách rời: 850 khô + 700 có mây → top vẫn ở ~900hPa', () => {
    const lv = realLevels().map(l =>
      l.p === 850 ? { ...l, rh: 40, cc: 5 } : l.p === 700 ? { ...l, rh: 90, cc: 80 } : l
    );
    const top = estimateCloudTop(goldenNight({ levels: lv }), 600);
    expect(top).toBe(985 + 150); // dừng ở 900hPa (985m), không phải 3105m
    expect(top!).toBeLessThan(2000);
  });

  it('lớp biên đêm mỏng (GFS) cộng điểm; lớp biên dày trừ điểm', () => {
    const base = scoreOneModel('gfs_seamless', goldenNight(), CTX_A, '2026-11-05');
    const thin = scoreOneModel('gfs_seamless', goldenNight({ blh_night_min: 150 }), CTX_A, '2026-11-05');
    const thick = scoreOneModel('gfs_seamless', goldenNight({ blh_night_min: 1500, cloud_low_dawn: 40 }), CTX_A, '2026-11-05');
    const thickBase = scoreOneModel('gfs_seamless', goldenNight({ cloud_low_dawn: 40 }), CTX_A, '2026-11-05');
    expect(thin.score).toBeGreaterThanOrEqual(base.score); // đêm vàng có thể đã kịch 100 → chỉ cần không giảm
    expect(thin.reasons.join(' ')).toMatch(/Lớp biên đêm rất mỏng/);
    expect(thick.score).toBeLessThan(thickBase.score);
  });

  it('vị trí đứng trên mực đóng băng thật → cảnh báo băng giá', () => {
    const day: DayData = {
      date: '2026-12-20', quality: 'FORECAST', daysAhead: 1,
      models: { gfs_seamless: goldenNight({ freezing_level: 1800 }) },
      sun_times: computeSunTimes(22.6, 103.6, '2026-12-20'),
    };
    const out = computeDayForecast(day, { ...CTX_A, observerAlt: 2800 });
    expect(out.warnings.join(' ')).toMatch(/đóng băng/);
    expect(out.forecast.technical_indices.inversion_height_m).not.toBeUndefined();
  });
});

describe('WEATHER_MODELS — 4 mô hình toàn cầu', () => {
  it('gồm ECMWF/GFS/ICON/JMA (KMA không phủ Việt Nam nên không dùng)', async () => {
    const { WEATHER_MODELS, MODEL_LABELS } = await import('../services/weatherService');
    expect(WEATHER_MODELS).toHaveLength(4);
    expect(WEATHER_MODELS).toContain('jma_seamless');
    for (const m of WEATHER_MODELS) expect(MODEL_LABELS[m]).toBeTruthy();
  });
});

describe('aggregateDayModel — parser dữ liệu Open-Meteo', () => {
  it('thiếu biến cốt lõi → null (không chèn giá trị mặc định)', () => {
    const empty = { time: [], get: () => null };
    expect(aggregateDayModel(empty as any, empty as any, 'ecmwf_ifs025', '2026-11-05', '2026-11-04')).toBeNull();
  });

  it('gộp đúng cửa sổ giờ: đêm hôm TRƯỚC 19h→6h + bình minh 4h→9h', () => {
    // 48 giờ: 2026-11-04T00:00 → 2026-11-05T23:00
    const time: string[] = [];
    for (const d of ['2026-11-04', '2026-11-05']) {
      for (let h = 0; h < 24; h++) time.push(`${d}T${String(h).padStart(2, '0')}:00`);
    }
    const constant = (v: number) => time.map(() => v);
    // temperature_2m: đêm 04 = 20°C, ngày 05 = 10°C → t_valley (05-07h ngày 05) phải là 10
    const t2m = time.map(t => (t.startsWith('2026-11-04') ? 20 : 10));
    const series: Record<string, number[]> = {
      temperature_2m: t2m, dew_point_2m: constant(9), relative_humidity_2m: constant(95),
      cloud_cover_low: constant(80), cloud_cover_mid: constant(10), cloud_cover_high: constant(10),
      precipitation: constant(0), temperature_925hPa: constant(11), temperature_850hPa: constant(8),
      temperature_700hPa: constant(0), relative_humidity_925hPa: constant(90),
      relative_humidity_850hPa: constant(85), relative_humidity_700hPa: constant(30),
      wind_speed_925hPa: constant(4), wind_speed_850hPa: constant(6), wind_direction_850hPa: constant(90),
    };
    const block = { time, get: (v: string) => series[v] || null };
    const agg = aggregateDayModel(block as any, block as any, 'ecmwf_ifs025', '2026-11-05', '2026-11-04')!;
    expect(agg.t_valley_dawn).toBe(10);
    expect(agg.cloud_low_dawn).toBe(80);
    expect(agg.precip_night).toBe(0);
    // engine-2.0: profile chỉ chứa các mực model THẬT SỰ có nhiệt độ (925/850/700),
    // không có geopotential → dùng độ cao xấp xỉ, đánh dấu hReal=false trung thực
    expect(agg.levels!.map(l => l.p)).toEqual([925, 850, 700]);
    expect(agg.levels!.every(l => l.hReal === false)).toBe(true);
    expect(Number.isFinite(agg.blh_night_min!)).toBe(false); // không có BLH → NaN, không bịa
  });

  it('geopotential thật được ưu tiên thay độ cao xấp xỉ; BLH đêm lấy MIN', () => {
    const time: string[] = [];
    for (const d of ['2026-11-04', '2026-11-05']) {
      for (let h = 0; h < 24; h++) time.push(`${d}T${String(h).padStart(2, '0')}:00`);
    }
    const constant = (v: number) => time.map(() => v);
    // BLH: đêm 04 sau 19h = 80m (tù đọng), còn lại 600m → min cửa sổ đêm phải là 80
    const blh = time.map(t => (t.startsWith('2026-11-04') && parseInt(t.slice(11, 13), 10) >= 19 ? 80 : 600));
    const series: Record<string, number[]> = {
      temperature_2m: constant(12), dew_point_2m: constant(11), relative_humidity_2m: constant(95),
      cloud_cover_low: constant(80), cloud_cover_mid: constant(10), cloud_cover_high: constant(10),
      precipitation: constant(0),
      temperature_925hPa: constant(11), temperature_850hPa: constant(8), temperature_700hPa: constant(0),
      relative_humidity_925hPa: constant(90), relative_humidity_850hPa: constant(85), relative_humidity_700hPa: constant(30),
      geopotential_height_925hPa: constant(742), geopotential_height_850hPa: constant(1465), geopotential_height_700hPa: constant(3120),
      cloud_cover_925hPa: constant(85), cloud_cover_850hPa: constant(60), cloud_cover_700hPa: constant(0),
      wind_speed_925hPa: constant(4), wind_speed_850hPa: constant(6), wind_direction_850hPa: constant(90),
      boundary_layer_height: blh, freezing_level_height: constant(4200), lifted_index: constant(4),
    };
    const block = { time, get: (v: string) => series[v] || null };
    const agg = aggregateDayModel(block as any, block as any, 'gfs_seamless', '2026-11-05', '2026-11-04')!;
    const l850 = agg.levels!.find(l => l.p === 850)!;
    expect(l850.h).toBe(1465);
    expect(l850.hReal).toBe(true);
    expect(l850.cc).toBe(60);
    expect(agg.blh_night_min).toBe(80);
    expect(agg.freezing_level).toBe(4200);
  });
});
