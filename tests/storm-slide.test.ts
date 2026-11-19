import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  stormLevelOf, assessStormAt, stormSegments, shiftHourKey, capeClass, worstStorm, suffixModel, mergeModels,
  fetchRouteStorm, compactStorm, STORM_MODELS, type ModelStorm, type PointStorm,
} from '../services/stormService';
import { slideRiskQD18, slideRainClass, wetDaysBefore, SLIDE_TABLE, fmtRange } from '../services/slideService';
import { extractPointWx } from '../services/routeService';

const M = (capeMax: number | null, thunder: boolean, rainMax: number | null, model = 'x'): ModelStorm => ({ model, capeMax, thunder, rainMax });

describe('dông: luật gộp chốt trước', () => {
  it('không mô hình dùng được -> NO_DATA', () => {
    expect(stormLevelOf([M(null, false, null)], 0)).toBe('NO_DATA');
  });
  it('>= 2 mô hình báo dông và >= nửa -> HIGH', () => {
    expect(stormLevelOf([M(100, true, 1), M(100, true, 0), M(0, false, 0), M(0, false, 0)], 4)).toBe('HIGH');
  });
  it('1 mô hình báo dông -> MED (không phải HIGH)', () => {
    expect(stormLevelOf([M(100, true, 1), M(0, false, 0), M(0, false, 0), M(0, false, 0)], 4)).toBe('MED');
  });
  it('2 mô hình báo dông nhưng < nửa số dùng được (2/5) -> MED', () => {
    const ms = [M(0, true, 0), M(0, true, 0), M(0, false, 0), M(0, false, 0), M(0, false, 0)];
    expect(stormLevelOf(ms, 5)).toBe('MED');
  });
  it('CAPE >= 1000 ở nửa số mô hình + có mưa -> MED; không mưa -> LOW', () => {
    expect(stormLevelOf([M(1200, false, 0.6), M(1500, false, 0), M(10, false, 0), M(0, false, 0)], 4)).toBe('MED');
    expect(stormLevelOf([M(1200, false, 0.2), M(1500, false, 0), M(10, false, 0), M(0, false, 0)], 4)).toBe('LOW');
  });
  it('ranh 1000 J/kg (NWS/SPC) tính là bất ổn vừa; 999 thì không', () => {
    expect(stormLevelOf([M(1000, false, 0), M(0, false, 0)], 2)).toBe('LOW');
    expect(stormLevelOf([M(999, false, 5), M(0, false, 5)], 2)).toBe('NONE');
  });
  it('thang CAPE', () => {
    expect([null, 0, 999, 1000, 2500, 4001].map(capeClass)).toEqual([null, 'yếu', 'yếu', 'vừa', 'mạnh', 'cực mạnh']);
  });
});

const hours = ['2026-11-21T04:00', '2026-11-21T05:00', '2026-11-21T06:00', '2026-11-21T07:00', '2026-11-21T08:00'];
function om(per: Record<string, { cape?: (number | null)[]; wmo?: (number | null)[]; mm?: (number | null)[] }>) {
  const h: any = { time: hours };
  for (const m of STORM_MODELS) {
    const p = per[m] ?? {};
    h[`cape_${m}`] = p.cape ?? hours.map(() => null);
    h[`weather_code_${m}`] = p.wmo ?? hours.map(() => null);
    h[`precipitation_${m}`] = p.mm ?? hours.map(() => null);
  }
  return { hourly: h };
}

describe('dông tại một điểm', () => {
  it('cửa sổ +-1 giờ: mã 95 lúc 07h được tính cho giờ đi qua 06h, mã 95 lúc 08h thì không', () => {
    const z = [0, 0, 0, 0, 0];
    const a = assessStormAt(om({
      ecmwf_ifs025: { cape: z, wmo: [3, 3, 3, 95, 3], mm: z },
      gfs_seamless: { cape: z, wmo: [3, 3, 3, 3, 95], mm: z },
    }), '2026-11-21T06:00', 12);
    expect(a.usable).toBe(2);
    expect(a.thunderModels).toBe(1);
    expect(a.level).toBe('MED');
    expect(a.km).toBe(12);
  });
  it('mã 99 (dông mưa đá) cũng tính; mã 94 không', () => {
    const z = [0, 0, 0, 0, 0];
    const a = assessStormAt(om({ icon_seamless: { cape: z, wmo: [0, 0, 99, 0, 0] }, ukmo_seamless: { cape: z, wmo: [0, 0, 99, 0, 0] } }), '2026-11-21T06:00');
    expect(a.level).toBe('HIGH');
    const b = assessStormAt(om({ icon_seamless: { cape: z, wmo: [0, 0, 94, 0, 0] } }), '2026-11-21T06:00');
    expect(b.level).toBe('NONE');
  });
  it('giờ ngoài phạm vi -> NO_DATA, không bịa 0', () => {
    expect(assessStormAt(om({ ecmwf_ifs025: { cape: [0, 0, 0, 0, 0] } }), '2026-11-29T06:00').level).toBe('NO_DATA');
  });
  it('dời giờ qua nửa đêm đúng ngày VN', () => {
    expect(shiftHourKey('2026-11-21T23:00', 1)).toBe('2026-11-22T00:00');
    expect(shiftHourKey('2026-11-21T00:00', -1)).toBe('2026-11-20T23:00');
  });
});

describe('dông: gom đoạn', () => {
  const P = (km: number, level: PointStorm['level'], t = 0, cape: number | null = 0): PointStorm => ({
    km, hourKey: `2026-11-21T0${Math.min(9, Math.floor(km / 20))}:00`, level, usable: 4, thunderModels: t, cape1000Models: 0, rainModels: 0, capeMax: cape, rainMax: 0, models: [],
  });
  it('liền nhau cùng mức gom một đoạn', () => {
    const s = stormSegments([P(0, 'NONE'), P(20, 'NONE'), P(40, 'MED', 1, 1200), P(60, 'MED', 2, 800), P(80, 'NONE')]);
    expect(s.map(x => [x.fromKm, x.toKm, x.level])).toEqual([[0, 20, 'NONE'], [40, 60, 'MED'], [80, 80, 'NONE']]);
    expect(s[1].maxThunder).toBe(2);
    expect(s[1].capeMax).toBe(1200);
    expect(worstStorm([P(0, 'NO_DATA'), P(1, 'LOW')])).toBe('LOW');
  });
});

describe('dông: gọi mạng có dự phòng từng mô hình', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('gói gộp 500 thì gọi riêng, thiếu mô hình nào thì ghi missingModels', async () => {
    const one = (m: string) => ({ hourly: { time: hours, cape: [0, 0, 1500, 0, 0], weather_code: [0, 0, m === 'gfs_seamless' ? 95 : 3, 0, 0], precipitation: [0, 0, 2, 0, 0] } });
    vi.stubGlobal('fetch', vi.fn(async (u: string) => {
      const models = new URL(u).searchParams.get('models')!;
      if (models.includes(',') || models === 'ukmo_seamless') return new Response('x', { status: 500 });
      return new Response(JSON.stringify([one(models), one(models)]), { status: 200 });
    }));
    const smp = [{ km: 0, pos: { lat: 21.5, lon: 104.5 }, elev: 500, hourKey: '2026-11-21T06:00' }, { km: 20, pos: { lat: 21.6, lon: 104.6 }, elev: 900, hourKey: '2026-11-21T06:00' }];
    const r = await fetchRouteStorm(smp);
    expect(r.missingModels).toEqual(['ukmo_seamless']);
    expect(r.points[0].usable).toBe(3);
    expect(r.points[0].thunderModels).toBe(1);
    expect(r.points[0].level).toBe('MED');
    const c = compactStorm(r);
    expect(c.points[1].cape).toEqual([1500, 1500, 1500, null]);
    expect(c.worst).toBe('MED');
  });
  it('hậu tố mô hình và ghép', () => {
    const a = suffixModel({ hourly: { time: ['t'], cape: [1] } }, 'gfs_seamless');
    expect(a.hourly.cape_gfs_seamless).toEqual([1]);
    expect(mergeModels([a, suffixModel({ hourly: { time: ['u'], cape: [2] } }, 'icon_seamless')]).hourly.cape_icon_seamless).toBeUndefined();
  });
});

describe('sạt lở theo QĐ 18/2021 Điều 46', () => {
  it('bảng chép đúng vài ô đối chiếu với lời văn', () => {
    // Đ46 kh3a: 100-200 mm, 1-2 ngày, vùng rất cao, KV1 và KV2 -> cấp 3
    expect(SLIDE_TABLE[0][0][3]).toBe(3); expect(SLIDE_TABLE[1][0][3]).toBe(3);
    // Đ46 kh1a: vùng cao KV3 -> cấp 1; kh2a: vùng rất cao KV3 -> cấp 2
    expect(SLIDE_TABLE[2][0][2]).toBe(1); expect(SLIDE_TABLE[2][0][3]).toBe(2);
    // Đ46 kh1c: >400 mm, vùng thấp KV3 -> cấp 1; vùng TB KV4 -> cấp 1
    expect(SLIDE_TABLE[2][2][0]).toBe(1); expect(SLIDE_TABLE[3][2][1]).toBe(1);
    // KV2 vùng thấp 100-200: ô trống
    expect(SLIDE_TABLE[1][0][0]).toBe(0);
  });
  it('lớp mưa: 100 và 200 thuộc lớp đầu, 200,1 sang lớp hai, 400,1 sang lớp ba; dưới 100 không xếp', () => {
    expect([99.9, 100, 200, 200.1, 400, 400.1, null].map(slideRainClass)).toEqual([null, 0, 0, 1, 1, 2, null]);
  });
  it('đếm ngày mưa trước, thiếu số thì không chắc', () => {
    expect(wetDaysBefore([5, 0.5, 9])).toEqual({ n: 1, exact: true });
    expect(wetDaysBefore([5, 3, 9])).toEqual({ n: 3, exact: true });
    expect(wetDaysBefore([5, null, 9])).toEqual({ n: 1, exact: false });
    expect(wetDaysBefore(undefined)).toEqual({ n: 0, exact: false });
  });
  it('150 mm + mưa 1 ngày trước -> có cấp; KV1-2 cấp 1-3, KV3-4 cấp 1-2', () => {
    const r = slideRiskQD18({ rain24h: 150, rainPrior: [10, 0, 0] });
    expect(r.status).toBe('LEVEL');
    expect(r.kv12).toEqual([1, 3]); expect(r.kv34).toEqual([1, 2]);
    expect(fmtRange(r.kv12)).toBe('cấp 1-3');
  });
  it('150 mm nhưng trước đó khô -> văn bản không xếp cấp (NO_PRIOR)', () => {
    expect(slideRiskQD18({ rain24h: 150, rainPrior: [0, 0, 0] }).status).toBe('NO_PRIOR');
  });
  it('250 mm cần mưa trên 2 ngày: 2 ngày chắc chắn -> NO_PRIOR; 3 ngày -> LEVEL; chưa đủ số -> LEVEL (xét khả năng xấu)', () => {
    expect(slideRiskQD18({ rain24h: 250, rainPrior: [10, 10, 0] }).status).toBe('NO_PRIOR');
    expect(slideRiskQD18({ rain24h: 250, rainPrior: [10, 10, 10] }).status).toBe('LEVEL');
    expect(slideRiskQD18({ rain24h: 250, rainPrior: [10, 10, null] }).status).toBe('LEVEL');
  });
  it('dưới 100 mm -> BELOW; thiếu mưa 24h -> NO_DATA', () => {
    expect(slideRiskQD18({ rain24h: 99, rainPrior: [50, 50, 50] }).status).toBe('BELOW');
    expect(slideRiskQD18({ rain24h: null, rainPrior: [] }).status).toBe('NO_DATA');
    expect(slideRiskQD18(null).status).toBe('NO_DATA');
  });
  it('extractPointWx tính 3 khối 24h trước khối rain24h', () => {
    const n = 24 * 4 + 1;
    const time = Array.from({ length: n }, (_, i) => `k${i}`);
    const precipitation = Array.from({ length: n }, (_, i) => (i <= 24 ? 1 : i <= 48 ? 0 : i <= 72 ? 2 : 0.5));
    const wx = extractPointWx({ hourly: { time, precipitation, temperature_2m: time.map(() => 10) } }, `k${n - 1}`)!;
    // khối rain24h = giờ 73..96; khối 1 = 49..72 (2 mm/h); khối 2 = 25..48 (0); khối 3 = 1..24 (1 mm/h)
    expect(wx.rain24h).toBe(12);
    expect(wx.rainPrior).toEqual([48, 0, 24]);
    const early = extractPointWx({ hourly: { time, precipitation, temperature_2m: time.map(() => 10) } }, 'k40')!;
    expect(early.rainPrior).toEqual([null, null, null]);
  });
});

describe('sạt lở QĐ 18: cổng độ cao (quy ước app, cùng TH.SLIDE_MIN_ELEV)', () => {
  it('điểm < 300 m -> LOWLAND dù mưa 150 mm; >= 300 m -> LEVEL; không rõ độ cao thì vẫn xét', () => {
    const wx = { rain24h: 150, rainPrior: [10, 0, 0] };
    expect(slideRiskQD18(wx, 12).status).toBe('LOWLAND');
    expect(slideRiskQD18(wx, 300).status).toBe('LEVEL');
    expect(slideRiskQD18(wx, null).status).toBe('LEVEL');
  });
});
