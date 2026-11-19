import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  haversineKm, cumulativeKm, pointAtKm, evenKms, elevationKms, weatherKms, elevationStats, etaMs, vnHourKey,
  extractPointWx, assessPoint, maxLevel, summarizeRoute, summarizeDay, cloudText, TH, ELEV_MAX_POINTS, decodePolyline6, fetchRoute, parseOsrmTable, dawnHours,
  httpErrorText, FETCH_TIMEOUT_MS, compactRoute, saveUserRoute, loadUserRoutes, exportUserRoutesJson, USER_ROUTES_MAX, ROUTE_RULES_VERSION,
  type PointWx, type RouteSample,
} from '../services/routeService';

const CALM: PointWx = {
  tempC: 18, rh: 70, precipMm: 0, precipProb: 10, wmo: 1, visibilityM: 20000, gustKmh: 10, cloudLow: 10,
  rain24h: 0, rain72h: 0, isDark: false,
};
const w = (o: Partial<PointWx>): PointWx => ({ ...CALM, ...o });
const kinds = (wx: PointWx, elev = 1500) => assessPoint(wx, elev).map(h => `${h.kind}${h.level}`);

describe('hình học tuyến', () => {
  it('haversine: 1 độ vĩ ~ 111 km', () => {
    expect(haversineKm({ lat: 21, lon: 105 }, { lat: 22, lon: 105 })).toBeCloseTo(111.2, 0);
  });
  it('pointAtKm nội suy đúng giữa đoạn và kẹp hai đầu', () => {
    const c = [{ lat: 21, lon: 105 }, { lat: 22, lon: 105 }];
    const cum = cumulativeKm(c);
    expect(pointAtKm(c, cum, cum[1] / 2).lat).toBeCloseTo(21.5, 5);
    expect(pointAtKm(c, cum, -5)).toEqual(c[0]);
    expect(pointAtKm(c, cum, 1e6)).toEqual(c[1]);
  });
  it('evenKms luôn có 0 và cuối, bỏ mốc sát đích', () => {
    expect(evenKms(100, 30, 5)).toEqual([0, 30, 60, 90, 100]);
    expect(evenKms(92, 30, 5)).toEqual([0, 30, 60, 92]);   // 90 cách đích 2 km -> bỏ
    expect(evenKms(0, 10)).toEqual([0]);
  });
  it('profile cao độ không vượt giới hạn 1 lần gọi Elevation API', () => {
    for (const t of [3, 50, 203, 700, 1600]) {
      const k = elevationKms(t);
      expect(k.length).toBeLessThanOrEqual(ELEV_MAX_POINTS);
      expect(k[0]).toBe(0);
      expect(k[k.length - 1]).toBeCloseTo(t, 6);
    }
  });
  it('điểm thời tiết: bước 12-40 km', () => {
    const k = weatherKms(203);
    expect(k[0]).toBe(0);
    expect(k[k.length - 1]).toBe(203);
    expect(k.length).toBeGreaterThanOrEqual(10);
    expect(k.length).toBeLessThanOrEqual(18);
    expect(weatherKms(1500).length).toBeLessThanOrEqual(40);
  });
});

describe('thống kê cao độ', () => {
  it('tìm đèo nổi bật, bỏ gò nhỏ và điểm thấp', () => {
    const kms = [0, 10, 20, 30, 40, 50, 60, 70];
    const el = [100, 400, 1300, 700, 760, 680, 1800, 1500];
    const s = elevationStats(kms, el)!;
    expect(s.maxElev).toBe(1800);
    expect(s.maxKm).toBe(60);
    expect(s.passes.map(p => p.km)).toEqual([20, 60]);   // 760 chỉ nhô 60-80 m -> không tính
    expect(s.climbM).toBe(300 + 900 + 60 + 1120);
  });
  it('thiếu cao độ (NaN) thì bỏ qua, dưới 2 điểm thì null', () => {
    expect(elevationStats([0, 1], [NaN, NaN])).toBeNull();
    expect(elevationStats([0, 1, 2], [100, NaN, 300])!.maxElev).toBe(300);
  });
});

describe('giờ đi qua', () => {
  it('ETA tỉ lệ theo quãng đường', () => {
    const d = Date.parse('2026-11-20T01:00:00+07:00');
    expect(etaMs(100, 200, 4, d) - d).toBe(2 * 3600_000);
  });
  it('khoá giờ theo giờ VN, không theo UTC (0-7h VN vẫn đúng ngày)', () => {
    expect(vnHourKey(Date.parse('2026-11-20T01:10:00+07:00'))).toBe('2026-11-20T01:00');
    expect(vnHourKey(Date.parse('2026-11-20T05:40:00+07:00'))).toBe('2026-11-20T06:00');
    expect(vnHourKey(Date.parse('2026-11-20T23:45:00+07:00'))).toBe('2026-11-21T00:00');
  });
});

describe('đọc phản hồi Open-Meteo', () => {
  const hours = Array.from({ length: 96 }, (_, i) => {
    const d = new Date(Date.UTC(2026, 10, 17, i));
    return d.toISOString().slice(0, 13) + ':00';
  });
  const om = {
    hourly: {
      time: hours,
      temperature_2m: hours.map(() => 8), relative_humidity_2m: hours.map(() => 90),
      precipitation: hours.map(() => 1), precipitation_probability: hours.map(() => 50),
      weather_code: hours.map(() => 61), visibility: hours.map(() => 5000),
      wind_gusts_10m: hours.map(() => 20), cloud_cover_low: hours.map(() => 50),
    },
    daily: { time: ['2026-11-20'], sunrise: ['2026-11-20T06:15'], sunset: ['2026-11-20T17:20'] },
  };
  it('lấy đúng giờ, tính mưa 24h/72h', () => {
    const wx = extractPointWx(om, hours[75])!;
    expect(wx.rain24h).toBe(24);
    expect(wx.rain72h).toBe(72);
    expect(wx.tempC).toBe(8);
  });
  it('không đủ 72 giờ phía trước thì rain72h = null, không coi là 0', () => {
    const wx = extractPointWx(om, hours[30])!;
    expect(wx.rain24h).toBe(24);
    expect(wx.rain72h).toBeNull();
  });
  it('giờ ngoài phạm vi dự báo -> null (NO_DATA)', () => {
    expect(extractPointWx(om, '2026-12-30T06:00')).toBeNull();
    expect(extractPointWx({}, hours[5])).toBeNull();
  });
  it('trời tối: trước bình minh / sau hoàng hôn', () => {
    expect(extractPointWx(om, '2026-11-20T06:00')!.isDark).toBe(true);
    expect(extractPointWx(om, '2026-11-20T07:00')!.isDark).toBe(false);
    expect(extractPointWx(om, '2026-11-20T18:00')!.isDark).toBe(true);
  });
  it('lỗ trong chuỗi mưa làm tổng tích luỹ null', () => {
    const holed = { ...om, hourly: { ...om.hourly, precipitation: om.hourly.precipitation.map((v, i) => (i === 70 ? null : v)) } };
    expect(extractPointWx(holed, hours[75])!.rain24h).toBeNull();
  });
});

describe('mức độ khó tại một điểm', () => {
  it('trời êm = không cảnh báo, mức 0', () => {
    expect(assessPoint(CALM, 1500)).toEqual([]);
  });
  it('dông luôn nguy hiểm', () => {
    expect(kinds(w({ wmo: 95 }))).toContain('storm3');
    expect(assessPoint(w({ wmo: 96 }), 100)[0].text).toMatch(/mưa đá/);
  });
  it('mưa theo bậc', () => {
    expect(kinds(w({ precipMm: TH.RAIN_HEAVY }))).toContain('rain3');
    expect(kinds(w({ precipMm: TH.RAIN_MOD }))).toContain('rain2');
    expect(kinds(w({ precipMm: TH.RAIN_LIGHT }))).toContain('rain1');
    expect(kinds(w({ precipMm: 0, precipProb: 80 }))).toContain('rain1');
    expect(kinds(w({ precipMm: 0.2, precipProb: 30 }))).not.toContain('rain1');
  });
  it('sương mù theo tầm nhìn; đi trong mây chỉ xét ở đèo cao', () => {
    expect(kinds(w({ visibilityM: 150 }))).toContain('fog3');
    expect(kinds(w({ visibilityM: 800 }))).toContain('fog2');
    const inCloud = w({ rh: 100, cloudLow: 100, visibilityM: 4720 });   // ca đo Tà Xùa 19/11
    expect(kinds(inCloud, 1770)).toContain('fog2');
    expect(kinds(inCloud, 300)).not.toContain('fog2');
    expect(kinds(w({ rh: 96, cloudLow: 100 }), 1770)).not.toContain('fog2');
  });
  it('gió giật theo cấp', () => {
    expect(kinds(w({ gustKmh: 65 }))).toContain('wind3');
    expect(kinds(w({ gustKmh: 45 }))).toContain('wind2');
    expect(kinds(w({ gustKmh: 30 }))).toContain('wind1');
    expect(kinds(w({ gustKmh: 25 }))).toEqual([]);
  });
  it('lạnh, băng giá, đóng băng mặt đường', () => {
    expect(kinds(w({ tempC: -1, rh: 98 }))).toContain('ice3');
    expect(kinds(w({ tempC: -1, rh: 60, precipMm: 0 }))).toContain('ice2');
    expect(kinds(w({ tempC: 2 }))).toContain('ice2');
    expect(kinds(w({ tempC: 9 }))).toContain('cold1');
    expect(kinds(w({ tempC: 11 }))).toEqual([]);
  });
  it('mưa tích luỹ chỉ cảnh báo sạt lở ở vùng đồi núi', () => {
    expect(kinds(w({ rain24h: 120 }), 900)).toContain('landslide3');
    expect(kinds(w({ rain24h: 60 }), 900)).toContain('landslide2');
    expect(kinds(w({ rain24h: 10, rain72h: 160 }), 900)).toContain('landslide2');
    expect(kinds(w({ rain24h: 25 }), 900)).toContain('landslide1');
    expect(kinds(w({ rain24h: 120 }), 50)).toEqual([]);
    expect(kinds(w({ rain24h: null, rain72h: null }), 900)).toEqual([]);
  });
  it('ô tô bỏ cảnh báo nhẹ chỉ hợp xe máy (lạnh, gió cấp 5), giữ cảnh báo nặng', () => {
    expect(assessPoint(w({ tempC: 9 }), 1500, 'car')).toEqual([]);
    expect(assessPoint(w({ gustKmh: 30 }), 1500, 'car')).toEqual([]);
    expect(assessPoint(w({ gustKmh: 45 }), 1500, 'car').map(h => h.kind)).toEqual(['wind']);
    expect(assessPoint(w({ tempC: 2 }), 1500, 'car').map(h => h.kind)).toEqual(['ice']);
  });
  it('trời tối chỉ đáng nói ở đoạn núi', () => {
    expect(kinds(w({ isDark: true }), 1200)).toContain('dark1');
    expect(kinds(w({ isDark: true }), 100)).toEqual([]);
  });
});

describe('tổng hợp tuyến', () => {
  const mk = (km: number, wx: PointWx | null, elev = 1000): RouteSample => {
    const hazards = wx ? assessPoint(wx, elev) : [];
    return { km, pos: { lat: 0, lon: 0 }, elev, etaMs: 0, hourKey: '', wx, hazards, level: maxLevel(hazards) };
  };
  it('mức tuyến = mức nặng nhất; đếm điểm thiếu dữ liệu; mỗi loại giữ dòng nặng nhất', () => {
    const s = summarizeRoute([
      mk(0, CALM), mk(30, w({ precipMm: 1 })), mk(60, w({ precipMm: 5, tempC: 7 })), mk(90, null),
    ]);
    expect(s.level).toBe(2);
    expect(s.noDataCount).toBe(1);
    expect(s.worst.find(x => x.kind === 'rain')).toMatchObject({ level: 2, km: 60 });
    expect(s.rainKm).toEqual([30, 60]);
    // cùng mức: mưa thật được chọn thay cho dòng chỉ có xác suất
    const s2 = summarizeRoute([mk(0, w({ precipMm: 0, precipProb: 80 })), mk(30, w({ precipMm: 1 }))]);
    expect(s2.worst.find(x => x.kind === 'rain')).toMatchObject({ km: 30 });
    expect(s.tempRange).toEqual([7, 18]);
  });
  it('toàn bộ thiếu dữ liệu: mức 0 nhưng noDataCount đủ, không có khoảng nhiệt', () => {
    const s = summarizeRoute([mk(0, null), mk(10, null)]);
    expect(s.noDataCount).toBe(2);
    expect(s.tempRange).toBeNull();
  });
});

describe('tóm tắt ngày tại điểm đến', () => {
  const day = (over: Record<string, (h: number) => number | null>) => {
    const time: string[] = [];
    for (const d of ['2026-11-20', '2026-11-21']) for (let h = 0; h < 24; h++) time.push(`${d}T${String(h).padStart(2, '0')}:00`);
    const hr = (i: number) => i % 24;
    const f = (k: string, def: (h: number) => number | null) => time.map((_, i) => (over[k] ?? def)(hr(i)));
    return {
      hourly: {
        time,
        temperature_2m: f('t', h => 8 + h / 2), precipitation: f('p', () => 0), cloud_cover: f('c', () => 10),
        wind_gusts_10m: f('g', h => (h === 14 ? 40 : 10)), visibility: f('v', h => (h === 6 ? 300 : 20000)),
        weather_code: f('w', () => 1),
      },
      daily: { time: ['2026-11-20', '2026-11-21'], sunrise: ['2026-11-20T06:15', '2026-11-21T06:16'], sunset: ['2026-11-20T17:20', '2026-11-21T17:20'] },
    };
  };
  it('ngày khô: khô ráo, nhiệt min/max, giờ gió mạnh nhất, giờ tầm nhìn kém nhất, giờ mặt trời', () => {
    const s = summarizeDay(day({}), '2026-11-20');
    expect(s.headline).toBe('Khô ráo');
    expect(s.hours).toBe(24);
    expect([s.tempMin, s.tempMax]).toEqual([8, 19.5]);
    expect(s.maxGust).toEqual({ kmh: 40, hour: 14 });
    expect(s.minVis).toEqual({ m: 300, hour: 6 });
    expect(s.sunrise).toBe('06:15');
    expect(s.parts.map(p => p.cloudText)).toEqual(['quang', 'quang', 'quang', 'quang']);
  });
  it('gom khung mưa liền nhau và đếm "Nhiều mưa" khi > 6 giờ', () => {
    const s = summarizeDay(day({ p: h => (h >= 13 && h < 16 ? 2 : h >= 20 ? 1 : 0) }), '2026-11-20');
    expect(s.rainWindows).toEqual([{ from: 13, to: 16, mm: 6 }, { from: 20, to: 24, mm: 4 }]);
    expect(s.headline).toBe('Nhiều mưa');
    const s2 = summarizeDay(day({ p: h => (h === 7 ? 1 : 0) }), '2026-11-20');
    expect(s2.headline).toBe('Có mưa');
  });
  it('mây theo buổi và dông', () => {
    const s = summarizeDay(day({ c: h => (h < 9 ? 100 : 30), w: h => (h === 16 ? 95 : 1) }), '2026-11-20');
    expect(s.parts[0]).toMatchObject({ label: 'Sáng sớm', cloud: 100, cloudText: 'âm u' });
    expect(s.parts[1].cloudText).toBe('ít mây');
    expect(s.storm).toBe(true);
  });
  it('ngày không có trong dữ liệu -> Chưa có dữ liệu, không bịa', () => {
    const s = summarizeDay(day({}), '2026-12-01');
    expect(s.headline).toBe('Chưa có dữ liệu');
    expect(s.tempMin).toBeNull();
    expect(summarizeDay({}, '2026-11-20').hours).toBe(0);
  });
  it('mây thiếu thì "không rõ", không coi là quang', () => {
    expect(cloudText(null)).toBe('không rõ');
    const s = summarizeDay(day({ c: () => null }), '2026-11-20');
    expect(s.parts[0].cloudText).toBe('không rõ');
  });
});

describe('tìm đường xe máy (Valhalla) và dự phòng', () => {
  it('decodePolyline6 giải đúng ví dụ chuẩn (độ chính xác 6 = ví dụ Google chia 10)', () => {
    const pts = decodePolyline6('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    expect(pts.map(p => [p.lat, p.lon])).toEqual([[3.85, -12.02], [4.07, -12.095], [4.3252, -12.6453]]);
  });
  const osrmOk = { code: 'Ok', routes: [{ distance: 10000, duration: 600, geometry: { coordinates: [[105, 21], [105.1, 21]] } }] };
  const valOk = { trip: { status: 0, summary: { length: 12, time: 1800 }, legs: [{ shape: '_p~iF~ps|U_ulLnnqC' }] } };
  const stub = (val: () => Response) => vi.stubGlobal('fetch', vi.fn(async (u: string) =>
    String(u).includes('valhalla') ? val() : new Response(JSON.stringify(osrmOk))));
  afterEach(() => vi.unstubAllGlobals());
  it('xe máy dùng Valhalla khi được', async () => {
    stub(() => new Response(JSON.stringify(valOk)));
    const g = await fetchRoute({ lat: 21.001, lon: 105.001 }, { lat: 21.2, lon: 105.2 }, 'motorbike');
    expect(g.router).toBe('valhalla-motorcycle');
    expect(g.distanceKm).toBe(12);
    expect(g.fallbackNote).toBeUndefined();
  });
  it('Valhalla hỏng thì rơi về OSRM và NÓI RÕ là tuyến ô tô', async () => {
    stub(() => new Response('{}', { status: 503 }));
    const g = await fetchRoute({ lat: 21.002, lon: 105.002 }, { lat: 21.2, lon: 105.2 }, 'motorbike');
    expect(g.router).toBe('osrm-car');
    expect(g.fallbackNote).toMatch(/TUYẾN Ô TÔ/);
  });
  it('tuyến xe máy có thu phí thì kèm lời nhắc xem biển cấm; không thu phí thì không', async () => {
    stub(() => new Response(JSON.stringify({ trip: { ...valOk.trip, summary: { length: 12, time: 1800, has_toll: true } } })));
    const g = await fetchRoute({ lat: 21.004, lon: 105.004 }, { lat: 21.2, lon: 105.2 }, 'motorbike');
    expect(g.cautionNote).toMatch(/cấm xe máy/);
    stub(() => new Response(JSON.stringify(valOk)));
    expect((await fetchRoute({ lat: 21.005, lon: 105.005 }, { lat: 21.2, lon: 105.2 }, 'motorbike')).cautionNote).toBeUndefined();
  });
  it('gọi Valhalla với use_highways 0.5 (0 làm tuyến vòng gấp đôi, đo 19/11)', async () => {
    stub(() => new Response(JSON.stringify(valOk)));
    await fetchRoute({ lat: 21.006, lon: 105.006 }, { lat: 21.2, lon: 105.2 }, 'motorbike');
    const u = decodeURIComponent(String((fetch as any).mock.calls[0][0]));
    expect(u).toContain('"use_highways":0.5');
  });
  it('ô tô dùng OSRM, không gọi Valhalla', async () => {
    stub(() => { throw new Error('không được gọi'); });
    const g = await fetchRoute({ lat: 21.003, lon: 105.003 }, { lat: 21.2, lon: 105.2 }, 'car');
    expect(g.router).toBe('osrm-car');
  });
});

describe('km đường tới các điểm (OSRM table)', () => {
  it('đọc hàng đầu, bỏ ô gốc, null khi không có đường', () => {
    const d = { code: 'Ok', distances: [[0, 12000, null, 250500]], durations: [[0, 900, null, 18000]] };
    expect(parseOsrmTable(d, 3)).toEqual([{ km: 12, h: 0.25 }, null, { km: 250.5, h: 5 }]);
  });
  it('phản hồi lỗi thì NÉM, không trả mảng rỗng', () => {
    expect(() => parseOsrmTable({ code: 'TooBig' }, 2)).toThrow(/TooBig/);
  });
});

describe('rạng sáng theo giờ tại đích', () => {
  it('đủ 6 giờ 04-09, giờ thiếu dữ liệu ghi null, không có cờ đèo tối', () => {
    const time = ['2026-11-20T04:00', '2026-11-20T05:00', '2026-11-20T06:00'];
    const om = { hourly: { time, temperature_2m: [5, 6, 7], relative_humidity_2m: [99, 99, 80], precipitation: [0, 0, 0],
      precipitation_probability: [0, 0, 0], weather_code: [45, 45, 1], visibility: [150, 150, 20000], wind_gusts_10m: [5, 5, 5],
      cloud_cover_low: [100, 100, 10], cloud_cover: [100, 100, 10] }, daily: { time: ['2026-11-20'], sunrise: ['2026-11-20T06:15'], sunset: ['2026-11-20T17:20'] } };
    const hs = dawnHours(om, '2026-11-20', 1800);
    expect(hs.map(h => h.hour)).toEqual([4, 5, 6, 7, 8, 9]);
    expect(hs[0].hazards.some(z => z.kind === 'fog')).toBe(true);
    expect(hs.some(h => h.hazards.some(z => z.kind === 'dark'))).toBe(false);
    expect(hs[3].wx).toBeNull();
  });
});

describe('mã thời tiết sương mù (route-1.1)', () => {
  const base: PointWx = { tempC: 15, rh: 90, precipMm: 0, precipProb: 0, wmo: 45, visibilityM: 8000, gustKmh: 5, cloudLow: 20, rain24h: 0, rain72h: 0, isDark: false };
  it('wmo 45 dù tầm nhìn mô hình 8 km vẫn báo sương mù mức 2', () => {
    const h = assessPoint(base, 500).find(x => x.kind === 'fog');
    expect(h?.level).toBe(2);
  });
  it('tầm nhìn < 200 m vẫn thắng (mức 3), không bị cờ mã thời tiết đè', () => {
    expect(assessPoint({ ...base, visibilityM: 100 }, 500).find(x => x.kind === 'fog')?.level).toBe(3);
  });
});

describe('vòng 3: hạn chờ, lời báo 429, tuyến người dùng tự lập', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
  it('429 nói rõ là dịch vụ đang giới hạn lượt, không chỉ "HTTP 429"', () => {
    expect(httpErrorText(429, 'api.open-meteo.com')).toMatch(/giới hạn lượt gọi.*thử lại sau vài phút/);
    expect(httpErrorText(503, 'x')).toMatch(/đang lỗi/);
  });
  it('máy chủ treo thì báo lỗi sau FETCH_TIMEOUT_MS, không quay mãi', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_u: string, init?: RequestInit) => new Promise((_res, rej) => {
      init?.signal?.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    })));
    const p = fetchRoute({ lat: 21.011, lon: 105.011 }, { lat: 21.2, lon: 105.2 }, 'car');
    const caught = p.catch(e => e);
    await vi.advanceTimersByTimeAsync(FETCH_TIMEOUT_MS + 10);
    expect(String((await caught).message)).toMatch(/không trả lời sau 30 giây/);
  });
  const plan = {
    from: { lat: 21.028512, lon: 105.854234 }, to: { lat: 21.3, lon: 104.5 }, vehicle: 'motorbike', speedKmh: 40,
    departMs: Date.parse('2026-11-22T00:30:00+07:00'), distanceKm: 203.44, durationH: 5.0861, routerH: 4, router: 'valhalla-motorcycle',
    coords: [], elevKms: [], elevs: [], stats: { maxElev: 1800 },
    samples: [{ km: 10.4, elev: 20, hourKey: '2026-11-22T01:00', level: 2, wx: w({ visibilityM: 300 }), hazards: [{ kind: 'fog', level: 2, text: 'sương' }] }],
    summary: { level: 2, worst: [{ kind: 'fog', level: 2, km: 10.4, text: 'sương' }], noDataCount: 0 },
  } as any;
  it('compactRoute cùng định dạng bản chụp tuyến (giờ VN, làm tròn, có wx thô và cờ hz)', () => {
    const c = compactRoute(plan);
    expect(c.departVN).toBe('2026-11-22T00:30');
    expect(c.distanceKm).toBe(203.4);
    expect(c.samples[0]).toMatchObject({ km: 10, hour: '2026-11-22T01:00', hz: ['fog2'], wx: { vis: 300 } });
  });
  it('lưu tuyến: mới nhất lên đầu, tối đa USER_ROUTES_MAX, toạ độ xuất phát làm tròn ~1 km', () => {
    const m = new Map<string, string>();
    const store = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } };
    for (let i = 0; i < USER_ROUTES_MAX + 3; i++) saveUserRoute(plan, `Nơi ${i}`, 'TA_XUA_SON_LA', store, Date.parse('2026-11-19T03:00:00Z') + i * 60_000);
    const list = loadUserRoutes(store);
    expect(list).toHaveLength(USER_ROUTES_MAX);
    expect(list[0].fromName).toBe(`Nơi ${USER_ROUTES_MAX + 2}`);
    expect(list[0].from).toEqual({ lat: 21.03, lon: 105.85 });
    expect(list[0].rulesVersion).toBe(ROUTE_RULES_VERSION);
    expect(JSON.parse(exportUserRoutesJson(list)).routes).toHaveLength(USER_ROUTES_MAX);
  });
  it('dữ liệu hỏng trong localStorage thì trả rỗng, không vỡ app', () => {
    expect(loadUserRoutes({ getItem: () => '{hỏng' })).toEqual([]);
  });
});
