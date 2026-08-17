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
  });
});
