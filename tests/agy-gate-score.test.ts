import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { count, clopperUpper, blockBootstrap, buildRows } from '../scripts/score-agy-gate';

const R = (date: string, sea: boolean, worth: boolean, gate: string | null, src: any = 'vệ tinh') =>
  ({ date, key: 'K', src, sea, worth, gate, nMod: 3, engine: 'e', post: false });

describe('score-agy-gate - công cụ chấm cổng bóng (dữ liệu tổng hợp)', () => {
  it('đếm: cổng chỉ chặn, không bao giờ thêm báo đúng/nhầm; thiếu dữ liệu/lỗi KHÔNG chặn', () => {
    const rows = [
      R('2026-12-01', false, true, 'khong'), R('2026-12-01', false, true, 'co'), R('2026-12-02', false, true, 'chua_co_du_lieu'), R('2026-12-02', false, true, 'LOI'),
      R('2026-12-03', true, true, 'khong'), R('2026-12-03', true, true, 'co_the'), R('2026-12-04', true, false, 'co'),
    ];
    const c = count(rows);
    expect(c).toMatchObject({ tp: 2, fp: 4, fn: 1, tn: 0, gtp: 1, gfp: 3, gfn: 2 });
    expect(c.gfp).toBeLessThanOrEqual(c.fp); expect(c.gtp).toBeLessThanOrEqual(c.tp);
  });
  it('cận trên Clopper-Pearson: 0/8 ~ 31%, 0/30 ~ 9,5%, k=n -> 1', () => {
    expect(clopperUpper(0, 8)).toBeCloseTo(0.3123, 3);
    expect(clopperUpper(0, 30)).toBeCloseTo(0.0950, 3);
    expect(clopperUpper(5, 5)).toBe(1);
  });
  it('bootstrap khối: cùng hạt giống ra cùng số; cổng "chặn mọi FA, giữ mọi TP" có cận dưới > 0', () => {
    const rows = [];
    for (let d = 1; d <= 30; d++) { const dd = `2026-12-${String(d).padStart(2, '0')}`; rows.push(R(dd, false, true, 'khong'), R(dd, true, true, 'co')); }
    const a = blockBootstrap(rows, 300), b = blockBootstrap(rows, 300);
    expect(a).toEqual(b);
    expect(a.p5Loss).toBeGreaterThan(0.99);
    expect(a.p5Diff).toBeGreaterThan(0.99);
    expect(a.blocks).toBeGreaterThanOrEqual(10);
  });
  it('cổng làm mỏng ngẫu nhiên: cận dưới của (lossFA - lossTP) không dương', () => {
    const rows = [];
    for (let d = 1; d <= 30; d++) { const dd = `2026-12-${String(d).padStart(2, '0')}`; const g = d % 2 ? 'khong' : 'co'; rows.push(R(dd, false, true, g), R(dd, true, true, g)); }
    expect(blockBootstrap(rows, 400).p5Diff).toBeLessThanOrEqual(0);
  });
  it('buildRows: người đi đè Facebook đè vệ tinh; chỉ lấy bản chụp có cột agyGate', () => {
    const dir = mkdtempSync(join(tmpdir(), 'agygate-'));
    try {
      const spot = (extra: any) => ({ key: 'FANSIPAN', worthGoing: true, ...extra });
      writeFileSync(join(dir, '2026-12-01-forecast.json'), JSON.stringify({ date: '2026-12-01', engineVersion: 'e', spots: [spot({ agyGate: { ver: 'v', ketLuan: 'khong', soMoHinh: 3 } })] }));
      writeFileSync(join(dir, '2026-12-02-forecast.json'), JSON.stringify({ date: '2026-12-02', engineVersion: 'e', spots: [spot({})] }));
      writeFileSync(join(dir, '2026-12-01-satellite.json'), JSON.stringify([{ key: 'FANSIPAN', date: '2026-12-01', verdict: 'CLEAR' }]));
      writeFileSync(join(dir, '2026-12-02-satellite.json'), JSON.stringify([{ key: 'FANSIPAN', date: '2026-12-02', verdict: 'CLEAR' }]));
      writeFileSync(join(dir, 'fb-auto-reports.json'), JSON.stringify([{ date: '2026-12-01', spotKey: 'FANSIPAN', seaLevel: 'BELOW', confidence: 0.9 }]));
      writeFileSync(join(dir, 'field-reports.json'), JSON.stringify([{ date: '2026-12-01', spotKey: 'FANSIPAN', seaLevel: 'ABOVE' }]));
      const rows = buildRows(dir, true);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ src: 'người đi', sea: false, gate: 'khong', worth: true });
      expect(buildRows(dir, false)).toHaveLength(2);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
