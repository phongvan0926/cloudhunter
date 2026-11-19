import { describe, it, expect } from 'vitest';
import { aggregateMonthly, seaSeason, routeClimate, monthSentence, seaSentence, nearestLoc, CTH, type ClimateFile, type MonthStat } from '../services/climateService';

// Hai năm tháng 1 giả: năm 1 có đợt mưa 3 ngày 60+60+40 = 160 mm (>= 150), năm 2 khô; nhiệt độ TB 14°C (rét đậm), đêm 2°C.
function janYears() {
  const time: string[] = [], p: (number | null)[] = [], tm: (number | null)[] = [], tn: (number | null)[] = [], rh: (number | null)[] = [];
  for (const y of [2016, 2017]) for (let d = 1; d <= 31; d++) {
    time.push(`${y}-01-${String(d).padStart(2, '0')}`);
    p.push(y === 2016 && d >= 10 && d <= 12 ? [60, 60, 40][d - 10] : 0);
    tm.push(d <= 10 ? 14 : 16); tn.push(d <= 5 ? 2 : 8); rh.push(d <= 3 ? 95 : 70);
  }
  return { time, p, tm, tn, rh };
}

describe('khí hậu theo tháng - gộp số', () => {
  it('đếm đúng ngày mưa, đợt 3 ngày, rét đậm, đêm băng giá, ẩm suốt ngày', () => {
    const { time, p, tm, tn, rh } = janYears();
    const { months, missingDays } = aggregateMonthly(time, p, tm, tn, rh);
    const j = months[0];
    expect(missingDays).toBe(0);
    expect(j.years).toBe(2);
    expect(j.rainMm).toBe(80);                // (160 + 0) / 2
    expect(j.d20).toBe(1.5); expect(j.d50).toBe(1); expect(j.d100).toBe(0);
    expect(j.r3Years).toBeUndefined();        // bỏ chỉ số đợt 3 ngày (mốc 150 mm không nguồn, vòng 7)
    expect(j.retDam).toBe(10); expect(j.retHai).toBe(0);
    expect(j.frost).toBe(5); expect(j.humid).toBe(3);
    expect(months[5].years).toBe(0); expect(months[5].rainMm).toBeNull();   // tháng không có số -> null, không phải 0
  });
  it('thiếu số mưa: không coi là 0; năm-tháng thiếu nhiều bị bỏ', () => {
    const { time, p, tm, tn, rh } = janYears();
    for (let i = 31; i < 31 + 10; i++) p[i] = null;   // năm 2017 thiếu 10 ngày -> còn 21 < MIN_DAYS
    const { months, missingDays } = aggregateMonthly(time, p, tm, tn, rh);
    expect(missingDays).toBe(10);
    expect(months[0].years).toBe(1);
    expect(months[0].rainMm).toBe(160);
  });
  it('ngày mưa >= 100 mm (mức thấp nhất QĐ 18 xét cấp sạt lở) đếm đúng biên', () => {
    const { time, p, tm, tn, rh } = janYears();
    p[9] = 100; p[10] = 99.9;   // năm 2016: một ngày đúng 100 tính, 99,9 không tính; năm 2017: 0
    expect(aggregateMonthly(time, p, tm, tn, rh).months[0].d100).toBe(0.5);
    expect(CTH.R_DANGER).toBe(100);
  });
});

describe('mùa biển mây từ nhãn', () => {
  it('mỗi (ngày, điểm) một nhãn, người đi đè facebook đè vệ tinh', () => {
    const s = seaSeason([
      { date: '2026-10-01', key: 'A', sea: true, src: 'vệ tinh' },
      { date: '2026-10-01', key: 'A', sea: false, src: 'người đi' },
      { date: '2026-10-02', key: 'A', sea: true, src: 'facebook' },
      { date: '2026-10-02', key: 'A', sea: false, src: 'vệ tinh' },
    ]);
    expect(s.A[9]).toEqual({ n: 2, sea: 1, bySrc: { 'người đi': 1, facebook: 1 } });
  });
});

const M = (o: Partial<MonthStat>): MonthStat => ({ years: 10, rainMm: 100, d20: 1, d50: 0, d100: 0, retDam: 0, retHai: 0, frost: 0, humid: 0, tMean: 20, tMin: 16, ...o });
function file(): ClimateFile {
  const months = (o: Partial<MonthStat>) => Array.from({ length: 12 }, () => M(o));
  return {
    version: 'x', generatedAt: '', source: '', years: { from: 2016, to: 2025 }, thresholds: CTH, spots: { A: 'sp:A' }, routes: {}, missing: [],
    locations: {
      'sp:A': { id: 'sp:A', lat: 21.5, lon: 104.5, elev: 1800, kind: 'spot', label: 'A', months: months({ retDam: 20, frost: 4, tMin: 6 }) },
      'rt:1': { id: 'rt:1', lat: 21.0, lon: 105.8, elev: 20, kind: 'route', label: 'r', months: months({ d50: 2, d100: 0.4, rainMm: 300 }) },
    },
    sea: { note: '', minN: 5, dateRange: null, bySpot: { A: Array.from({ length: 12 }, (_, i) => ({ n: i === 9 ? 12 : 2, sea: i === 9 ? 5 : 1, bySrc: {} })) } },
  };
}

describe('tra cứu dọc tuyến', () => {
  it('lấy nơi nặng nhất cho từng chỉ số, bỏ điểm không có mốc trong 30 km', () => {
    const c = file();
    const rc = routeClimate(c, [
      { km: 0, pos: { lat: 21.01, lon: 105.8 }, elev: 15 },
      { km: 100, pos: { lat: 20.0, lon: 103.0 }, elev: 500 },     // xa mọi mốc
      { km: 200, pos: { lat: 21.5, lon: 104.52 }, elev: 1750 },
    ], 1);
    expect(rc.matched).toBe(2); expect(rc.total).toBe(3);
    expect(rc.d50?.km).toBe(0); expect(rc.d50?.value).toBe(2);
    expect(rc.retDam?.km).toBe(200); expect(rc.frost?.value).toBe(4);
    expect(rc.coldest?.value).toBe(6);
    expect(rc.d100?.km).toBe(0); expect(rc.d100?.value).toBe(0.4); expect(rc.d100?.what).toContain('QĐ 18');
    expect(nearestLoc(c, { lat: 20.0, lon: 103.0 })).toBeNull();
  });
  it('câu tháng và câu mùa biển mây nói thẳng khi mẫu nhỏ', () => {
    const c = file();
    expect(monthSentence(c.locations['sp:A'].months[0], 1)).toMatch(/20 ngày rét đậm/);
    expect(monthSentence({ ...M({}), years: 0 }, 3)).toMatch(/Chưa có số/);
    expect(seaSentence(c, 'A', 10)).toMatch(/5\/12/);
    expect(seaSentence(c, 'A', 3)).toMatch(/chưa đủ mẫu/);
    expect(seaSentence(c, 'B', 3)).toMatch(/chưa có buổi sáng/);
  });
});
