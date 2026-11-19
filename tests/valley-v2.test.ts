import { describe, it, expect } from 'vitest';
import { V2, gridSpec, bilinear, visible, quadrant, pickV2, kmBetween } from '../scripts/valley-v2-points';

// Địa hình giả: nón núi cao 1.800 m tại tâm, dốc đều 200 m/km, sàn 100 m.
function cone(lat: number, lon: number, ridge?: (p: { lat: number; lon: number }) => number) {
  const g = gridSpec(lat, lon);
  const dem: number[][] = [];
  for (let i = 0; i < g.size; i++) {
    dem.push([]);
    for (let j = 0; j < g.size; j++) {
      const p = { lat: g.lat0 + i * V2.STEP, lon: g.lon0 + j * V2.STEP };
      let z = Math.max(100, 1800 - 200 * kmBetween({ lat, lon }, p));
      if (ridge) z = Math.max(z, ridge(p));
      dem[i].push(z);
    }
  }
  return { g, dem };
}
const O = { lat: 21.25, lon: 104.45, elevation: 1800 };

describe('valley v2 - luật chọn điểm (đăng ký trước 19/11)', () => {
  it('nội suy song tuyến đúng tại nút lưới và null ngoài lưới', () => {
    const { g, dem } = cone(O.lat, O.lon);
    expect(bilinear(g, dem, g.lat0 + 3 * V2.STEP, g.lon0 + 5 * V2.STEP)).toBeCloseTo(dem[3][5], 6);
    expect(bilinear(g, dem, g.lat0 - 1, g.lon0)).toBeNull();
  });
  it('góc phần tư theo hướng chính', () => {
    expect(quadrant(O, { lat: O.lat + 0.05, lon: O.lon })).toBe(0);
    expect(quadrant(O, { lat: O.lat, lon: O.lon + 0.05 })).toBe(1);
    expect(quadrant(O, { lat: O.lat - 0.05, lon: O.lon })).toBe(2);
    expect(quadrant(O, { lat: O.lat, lon: O.lon - 0.05 })).toBe(3);
  });
  it('nón đều: 4 góc, mọi điểm trong vành 3-8 km, chênh 300-1.500 m, DEM >= 50, khác ô 0,1°', () => {
    const { g, dem } = cone(O.lat, O.lon);
    const r = pickV2(O, g, dem);
    expect(r.ok).toBe(true);
    expect(r.points.length).toBe(4);
    for (const p of r.points) {
      expect(p.km).toBeGreaterThanOrEqual(V2.R_MIN_KM); expect(p.km).toBeLessThanOrEqual(V2.R_MAX_KM);
      expect(r.eye - p.dem).toBeGreaterThanOrEqual(V2.DROP_MIN); expect(r.eye - p.dem).toBeLessThanOrEqual(V2.DROP_MAX);
      expect(Math.floor(p.lat / 0.1) !== Math.floor(O.lat / 0.1) || Math.floor(p.lon / 0.1) !== Math.floor(O.lon / 0.1)).toBe(true);
    }
  });
  it('sống núi chắn phía nam: góc N không có điểm, vẫn đủ >= 2 góc', () => {
    // tường cao 1.900 m chạy ngang cách tâm ~2 km về phía nam
    const wall = (p: { lat: number; lon: number }) => (p.lat < O.lat - 0.017 && p.lat > O.lat - 0.022 ? 1900 : 0);
    const { g, dem } = cone(O.lat, O.lon, wall);
    const r = pickV2(O, g, dem);
    expect(r.points.some((p: any) => p.q === 2)).toBe(false);
    expect(r.ok).toBe(true);
    // đối chứng: đường ngắm qua tường bị chặn, không tường thì thấy
    const tgt = { lat: O.lat - 0.05, lon: O.lon };
    expect(visible(g, dem, O, 1802, tgt, 800)).toBe(false);
    const flat = cone(O.lat, O.lon);
    expect(visible(flat.g, flat.dem, O, 1802, tgt, 800)).toBe(true);
  });
  it('đồi thấp (mọi điểm chênh < 300 m) -> loại', () => {
    const { g, dem } = cone(O.lat, O.lon);
    const low = dem.map(r => r.map(z => 500 + (z - 100) * 0.1));
    expect(pickV2({ ...O, elevation: 670 }, g, low).ok).toBe(false);
  });
});
