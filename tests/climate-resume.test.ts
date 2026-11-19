import { describe, it, expect } from 'vitest';
import { priorLocations, samePlace } from '../scripts/climate-monthly';
import { CLIMATE_FILE_VERSION } from '../services/climateService';

describe('climate-monthly nối tiếp từ tệp cũ (chạy trên GitHub Actions không có đệm thô)', () => {
  it('chỉ dùng lại tệp cùng phiên bản', () => {
    const loc: any = { lat: 21, lon: 104, elev: 1500, months: [] };
    expect(Object.keys(priorLocations({ version: CLIMATE_FILE_VERSION, locations: { a: loc } }))).toEqual(['a']);
    expect(priorLocations({ version: 'khac', locations: { a: loc } })).toEqual({});
    expect(priorLocations(null)).toEqual({});
  });
  it('đổi toạ độ hay độ cao thì lấy lại, không dùng số cũ', () => {
    const a: any = { lat: 21.1234, lon: 104.5678, elev: 1500.2 };
    expect(samePlace(a, { lat: 21.1234, lon: 104.5678, elev: 1500 })).toBe(true);
    expect(samePlace(a, { lat: 21.1334, lon: 104.5678, elev: 1500 })).toBe(false);
    expect(samePlace(a, { lat: 21.1234, lon: 104.5678, elev: 1520 })).toBe(false);
  });
});
