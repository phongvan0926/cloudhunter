import { describe, it, expect } from 'vitest';
import { capWatchModel, capWatchOf } from '../services/capWatch';
import type { DayModelData } from '../services/weatherService';

// Số liệu kiểu sáng 14/11/2026 (Sa Pa 05h): bão hoà thấp, nắp, khô trên cao, gió yếu, đêm không mưa.
const GOOD = {
  t_valley_dawn: 10, td_valley_dawn: 9.6, rh925: 95, t850: 12.9, t700: 8.7, rh700: 16,
  wind850_dawn_max: 7, precip_night: 0,
} as unknown as DayModelData;
const mut = (o: Partial<DayModelData>) => ({ ...GOOD, ...o }) as DayModelData;

describe('capWatch - cờ theo dõi giống sáng 14/11', () => {
  it('đủ 6 điều kiện thì all', () => {
    expect(capWatchModel(GOOD)).toEqual({ met: 6, all: true, key: true });
  });
  it('mỗi điều kiện vi phạm riêng lẻ làm mất all (đối chứng âm)', () => {
    for (const o of [{ rh925: 80 }, { td_valley_dawn: 5 }, { t700: 5 }, { rh700: 70 },
      { wind850_dawn_max: 25 }, { precip_night: 2 }] as Partial<DayModelData>[]) {
      const r = capWatchModel(mut(o));
      expect(r.all).toBe(false);
      expect(r.met).toBe(5);
    }
  });
  it('thiếu số liệu (NaN) tính là KHÔNG thoả, không bịa', () => {
    expect(capWatchModel(mut({ rh700: NaN })).all).toBe(false);
  });
  it('MATCH cần >= 2 mô hình và >= nửa số mô hình', () => {
    const bad = mut({ rh700: 80 });
    expect(capWatchOf({ a: GOOD, b: GOOD, c: GOOD }).tier).toBe('MATCH');
    expect(capWatchOf({ a: GOOD, b: GOOD, c: bad }).tier).toBe('MATCH');
    expect(capWatchOf({ a: GOOD, b: bad, c: bad }).tier).toBe('NONE');
    expect(capWatchOf({ a: GOOD }).tier).toBe('NONE');       // 1 mô hình không đủ
    expect(capWatchOf({}).tier).toBe('NONE');
  });
});
