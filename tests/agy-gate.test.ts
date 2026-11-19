import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeHourlyBlock, PRESSURE_LEVELS, HOURLY_VARS } from '../services/weatherService';
import { buildAgyHours, agyGateColumn, AGY_GATE_VERSION } from '../services/agyGate';

// Dữ liệu TỔNG HỢP (đăng ký: bộ chuyển đổi chỉ thử bằng dữ liệu tổng hợp, không dùng ca cũ để gỡ lỗi).
const MODELS = ['gfs_seamless', 'icon_seamless', 'ukmo_seamless'];
const DATE = '2026-12-01';
function hours(date: string) { return Array.from({ length: 24 }, (_, h) => `${date}T${String(h).padStart(2, '0')}:00`); }
/** Mô hình tổng hợp: lớp ẩm bão hoà dưới `topH`, khô trên đó. */
function synth(wetBelow: number, over: Record<string, number | null> = {}) {
  const time = [...hours('2026-11-30'), ...hours(DATE)];
  const h: Record<string, any> = { time };
  for (const m of MODELS) for (const v of HOURLY_VARS) {
    h[`${v}_${m}`] = time.map(() => {
      let x: number | null = 0;
      const lvl = PRESSURE_LEVELS.find(l => v.endsWith(`_${l.p}hPa`));
      if (lvl) {
        if (v.startsWith('geopotential_height')) x = lvl.approxH;
        else if (v.startsWith('temperature')) x = 26 - 6.5 * lvl.approxH / 1000;
        else if (v.startsWith('relative_humidity')) x = lvl.approxH <= wetBelow ? 97 : 30;
        else if (v.startsWith('cloud_cover')) x = lvl.approxH <= wetBelow ? 90 : 5;
        else x = 8;
      } else if (v === 'relative_humidity_2m') x = 95; else if (v === 'temperature_2m') x = 20; else if (v === 'precipitation') x = 0;
      else x = 10;
      return v in over ? over[v] : x;
    });
  }
  return makeHourlyBlock(h);
}

describe('agyGate - bộ chuyển đổi (cổng bóng gd355)', () => {
  it('lấy đúng 4 giờ 04-07h của ngày D, 3 mô hình, 7 mực, gió chỉ ở 925/850/700', () => {
    const hs = buildAgyHours(synth(1000), MODELS, DATE);
    expect(hs.map(x => x.time.slice(11))).toEqual(['04:00', '05:00', '06:00', '07:00']);
    expect(hs.every(x => x.time.startsWith(DATE))).toBe(true);
    const s = hs[0].models.gfs_seamless;
    expect(Object.keys(hs[0].models)).toEqual(MODELS);
    expect(s.pressureLevels).toHaveLength(7);
    for (const l of s.pressureLevels) {
      if ([925, 850, 700].includes(l.pressureHpa)) expect(l.windSpeedKph).not.toBeNull(); else expect(l.windSpeedKph).toBeNull();
    }
    expect(s.visibilityM).toBeNull();           // đúng sự thật: không có tầm nhìn trong bản chụp xếp hạng
    expect(s.windSpeed10mKph).toBeNull();
  });
  it('thiếu biến thì null (không bịa 0)', () => {
    const b = synth(1000, { relative_humidity_2m: null });
    const s = buildAgyHours(b, MODELS, DATE)[0].models.icon_seamless;
    expect(s.relativeHumidity2mPct).toBeNull();
  });
  it('ngày không có dữ liệu -> chua_co_du_lieu, không ném lỗi', () => {
    const c = agyGateColumn(synth(1000), MODELS, '2027-01-01', { observerAlt: 1800, valleyElev: 700 });
    expect(c.ver).toBe(AGY_GATE_VERSION);
    expect(c.ketLuan).toBe('chua_co_du_lieu');
    expect(c.soGio).toBe(0);
  });
  it('lớp ẩm dưới chân + trên khô + nhiều mô hình -> không phải khong và ghi số mô hình hợp lệ', () => {
    const c = agyGateColumn(synth(1000), MODELS, DATE, { observerAlt: 1800, valleyElev: 700 });
    expect(c.error).toBeUndefined();
    expect(c.soMoHinh).toBe(3);
    expect(c.soGio).toBe(4);
    expect(['co', 'co_the']).toContain(c.ketLuan);
  });
  it('đứng trong lớp mây dày -> khong', () => {
    const c = agyGateColumn(synth(3000), MODELS, DATE, { observerAlt: 1800, valleyElev: 700 });
    expect(c.ketLuan).toBe('khong');
  });
  it('đầu vào hỏng không làm cổng ném lỗi: ghi error', () => {
    const bad: any = { time: [`${DATE}T05:00`], get() { throw new Error('hỏng giả'); } };
    const c = agyGateColumn(bad, MODELS, DATE, { observerAlt: 1800, valleyElev: 700 });
    expect(c.error).toContain('hỏng giả');
    expect(c.ketLuan).toBeUndefined();
  });
});

// Hiển thị không đổi: chạy xếp hạng với cổng thật và với cổng bị thay bằng chỗ giữ chỗ; phần tính điểm phải giống hệt.
describe('agyGate - không đổi kết quả hiển thị', () => {
  beforeEach(() => {
    const mem = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); }, removeItem: (k: string) => { mem.delete(k); } });
    vi.stubGlobal('fetch', vi.fn(async (u: string) => {
      const url = new URL(u);
      const n = (url.searchParams.get('latitude') || '').split(',').length;
      if (url.pathname.endsWith('/elevation')) return new Response(JSON.stringify({ elevation: Array(n).fill(600) }));
      const b = synth(1100);
      const hourly: Record<string, any> = { time: b.time };
      for (const v of HOURLY_VARS) for (const m of MODELS) hourly[`${v}_${m}`] = b.get(v, m);
      return new Response(JSON.stringify(Array.from({ length: n }, () => ({ hourly }))));
    }));
    vi.resetModules();
  });
  it('cờ cổng (g2448): chỉ HẠ worthGoing khi cổng nói khong; tắt thì y hệt; base luôn giữ', async () => {
    const { gatedWorth } = await import('../services/agyGateFlag');
    const g = (k: string) => ({ ver: 'v', ketLuan: k } as any);
    expect(gatedWorth(true, g('khong'), true)).toBe(false);
    for (const k of ['co', 'co_the', 'chua_co_du_lieu']) expect(gatedWorth(true, g(k), true)).toBe(true);
    expect(gatedWorth(true, { ver: 'v', error: 'x' } as any, true)).toBe(true);     // lỗi = không chặn
    expect(gatedWorth(true, undefined, true)).toBe(true);
    expect(gatedWorth(false, g('co'), true)).toBe(false);                            // không bao giờ NÂNG
    expect(gatedWorth(true, g('khong'), false)).toBe(true);                          // cờ tắt = không đổi
    vi.resetModules();
    const on = await (await import('../services/rankingService')).rankSpotsForDawn(DATE, undefined, { gateEnabled: true });
    localStorage.removeItem('ch-rank-cache-v1');
    vi.resetModules();   // bộ đệm xếp hạng theo ngày, không theo cờ
    const off = await (await import('../services/rankingService')).rankSpotsForDawn(DATE, undefined, { gateEnabled: false });
    expect(on.length).toBe(off.length);
    for (const r of on) {
      const o = off.find(x => x.key === r.key)!;
      expect(r.worthGoingBase).toBe(o.worthGoing);                                   // base = quyết định khi cờ tắt
      expect(r.worthGoing).toBe(o.worthGoing && !(r.agyGate && 'ketLuan' in r.agyGate && r.agyGate.ketLuan === 'khong'));
      expect(o.worthGoingBase).toBeUndefined();
    }
  });
  it('không bật shadow thì app không tính cổng (cột trống)', async () => {
    const real = await import('../services/rankingService');
    const a = await real.rankSpotsForDawn(DATE);
    expect(a.length).toBeGreaterThan(5);
    expect(a.every(r => r.agyGate === undefined)).toBe(true);
  });
  it('score/status/cloudTop/worthGoing/thứ tự giống hệt khi bỏ cổng', async () => {
    const real = await import('../services/rankingService');
    const a = await real.rankSpotsForDawn(DATE, undefined, { shadow: true });
    expect(a.length).toBeGreaterThan(5);
    expect(a.every(r => r.agyGate && r.agyGate.ver === AGY_GATE_VERSION)).toBe(true);
    localStorage.removeItem('ch-rank-cache-v1');
    vi.resetModules();
    vi.doMock('../services/agyGate', () => ({ agyGateColumn: () => ({ ver: 'giữ chỗ' }) }));
    const stub = await import('../services/rankingService');
    const b = await stub.rankSpotsForDawn(DATE, undefined, { shadow: true });
    vi.doUnmock('../services/agyGate');
    const strip = (r: any) => { const { agyGate, ...x } = r; return x; };
    expect(a.map(strip)).toEqual(b.map(strip));
  });
});
