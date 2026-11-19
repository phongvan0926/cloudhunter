import { describe, it, expect, vi, afterEach } from 'vitest';
import { assessStability, verdictOf, classOf, prevColumn, leadDaysOf, STH, STABILITY_MODELS, mergePerModel, fetchStability } from '../services/stabilityService';

// "Lúc tải" = 19/11/2026 14:00 giờ VN.
const NOW = new Date('2026-11-19T14:00:00+07:00').getTime();
const DATE = '2026-11-22';   // giờ 05-07h ngày này còn L = 3 ngày
const times = Array.from({ length: 24 }, (_, h) => `${DATE}T${String(h).padStart(2, '0')}:00`);

/** Phản hồi giả: mọi mô hình như nhau; `cols` = giá trị theo hậu tố cột (cùng cho mọi giờ). */
function fake(cols: Record<string, number | null>, rain: Record<string, number | null> = {}) {
  const hourly: any = { time: times };
  for (const m of STABILITY_MODELS) {
    for (const [suf, v] of Object.entries(cols)) hourly[`cloud_cover${suf}_${m}`] = times.map(() => v);
    for (const [suf, v] of Object.entries(rain)) hourly[`precipitation${suf}_${m}`] = times.map(() => v);
  }
  return { hourly };
}
const fill = (cur: number, older1: number, older2: number) => ({
  '': cur, _previous_day1: cur, _previous_day2: cur, _previous_day3: cur,   // cột N <= L: Open-Meteo chép lần mới nhất
  _previous_day4: older1, _previous_day5: older2, _previous_day6: 0, _previous_day7: 0,
});

describe('độ ổn định dự báo (Previous Runs API)', () => {
  it('chọn cột theo số ngày còn lại tới giờ đó', () => {
    expect(leadDaysOf(`${DATE}T06:00`, NOW)).toBe(3);
    expect(leadDaysOf('2026-11-19T06:00', NOW)).toBe(0);   // giờ đã qua
    expect(prevColumn(0, 3)).toBe('');
    expect(prevColumn(1, 3)).toBe('_previous_day4');
    expect(prevColumn(2, 5)).toBe('_previous_day7');
    expect(prevColumn(2, 6)).toBeNull();
  });

  it('không bị cột chép lại đánh lừa: day1..day3 giống hệt bản mới, lần chạy cũ thật khác lớp', () => {
    const [d] = assessStability(fake(fill(10, 90, 90)), [DATE], NOW);
    expect(d.dawnCloud.models[0].values).toEqual([10, 90, 90]);
    expect(d.dawnCloud.verdict).toBe('SHIFTING');
    // Nếu đọc nhầm day1/day2 thì sẽ ra "ổn định"; kiểm ngược để chắc phép thử phân biệt được.
    const [same] = assessStability(fake(fill(10, 12, 20)), [DATE], NOW);
    expect(same.dawnCloud.verdict).toBe('STABLE');
  });

  it('ranh giới lớp có nguồn: 1 mm (ETCCDI), 20/50 mm (TH), 25/75% (2 và 6 okta)', () => {
    expect([0.9, 1, 19.9, 20, 50].map(v => classOf(v, STH.RAIN_EDGES))).toEqual([0, 1, 1, 2, 3]);
    expect([25, 25.1, 74, 75].map(v => classOf(v, STH.CLOUD_EDGES))).toEqual([1, 1, 1, 2]);
    expect(classOf(null, STH.RAIN_EDGES)).toBeNull();
  });

  it('luật gộp (quy ước của app): 0 đổi = ổn định, < nửa = hơi, >= nửa = đang dao động, không đủ lần chạy', () => {
    const m = (classes: (number | null)[]) => ({ model: 'x', values: [], classes });
    expect(verdictOf([m([0, 0, 0]), m([1, 1, null])]).verdict).toBe('STABLE');
    expect(verdictOf([m([0, 1, 1]), m([0, 0, 0]), m([2, 2, 2]), m([1, 1, 1])]).verdict).toBe('SLIGHT');
    expect(verdictOf([m([0, 1, 1]), m([0, 0, 0]), m([2, 1, 2]), m([1, 1, 1])]).verdict).toBe('SHIFTING');
    expect(verdictOf([m([0, null, null]), m([null, null, null])])).toEqual({ verdict: 'NO_DATA', usable: 0, changed: 0 });
  });

  it('mưa ngày: thiếu một giờ thì cả ngày là thiếu, không coi là 0', () => {
    const om = fake({}, { '': 0.5, _previous_day4: 0.5, _previous_day5: 0.5, _previous_day3: 0.5 });
    for (const m of STABILITY_MODELS) om.hourly[`precipitation_previous_day4_${m}`][5] = null;   // 05h còn L = 3 -> lần chạy cũ ~1 ngày đọc cột day4
    const [d] = assessStability(om, [DATE], NOW);
    expect(d.rain.models[0].values[0]).toBe(12);
    expect(d.rain.models[0].values[1]).toBeNull();
  });

  it('ghép phản hồi từng mô hình: thêm hậu tố mô hình, bỏ phần lệch trục giờ', () => {
    const om = mergePerModel([
      { model: 'gfs_seamless', om: { hourly: { time: ['a', 'b'], cloud_cover: [1, 2] } } },
      { model: 'icon_seamless', om: { hourly: { time: ['a', 'x'], cloud_cover: [9, 9] } } },
    ]);
    expect(om.hourly).toEqual({ time: ['a', 'b'], cloud_cover_gfs_seamless: [1, 2] });
    expect(mergePerModel([])).toBeNull();
  });
});

describe('fetchStability: gói gộp hỏng thì gọi riêng từng mô hình (fetch giả, không ra mạng)', () => {
  afterEach(() => vi.unstubAllGlobals());
  const json = (status: number, body: any) => Promise.resolve({ ok: status === 200, status, json: () => Promise.resolve(body) });
  it('gộp 500 -> 3/4 mô hình riêng thành công, báo thiếu đúng mô hình hỏng', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', (url: string) => {
      calls.push(url);
      const m = /models=([^&]+)/.exec(url)![1];
      if (m.includes(',') || m === 'ukmo_seamless') return json(500, { error: true, reason: 'x' });
      return json(200, { hourly: { time: ['t'], cloud_cover: [m.length] } });
    });
    const r = await fetchStability(10.1111, 106.2222, 5);
    expect(calls.length).toBe(5);
    expect(r.missingModels).toEqual(['ukmo_seamless']);
    expect(Object.keys(r.om.hourly).sort()).toEqual(['cloud_cover_ecmwf_ifs025', 'cloud_cover_gfs_seamless', 'cloud_cover_icon_seamless', 'time']);
  });
  it('hỏng hết thì ném lỗi gốc, không trả rỗng', async () => {
    vi.stubGlobal('fetch', () => json(500, { error: true, reason: 'x' }));
    await expect(fetchStability(10.3333, 106.4444, 5)).rejects.toThrow(/500/);
  });
});
