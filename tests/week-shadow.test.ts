import { describe, it, expect } from 'vitest';
import { makeHourlyBlock, PRESSURE_LEVELS, HOURLY_VARS, WeatherModelId } from '../services/weatherService';
import { weekDaysFromBlock, WEEK_SHADOW_MODELS } from '../services/rankingService';

// Bóng 6 mô hình của bản chụp tuần (gf1b7 27/11/2026). Dữ liệu TỔNG HỢP: 3 mô hình của bảng khô,
// 3 mô hình thêm (ECMWF IFS, JMA, AIFS) ẩm bão hoà dưới 1.000 m, để bóng và bảng chắc chắn khác nhau.
const RANK3: WeatherModelId[] = ['gfs_seamless', 'icon_seamless', 'ukmo_seamless'];
const DATES = ['2026-12-01', '2026-12-02'];
const hours = (d: string) => Array.from({ length: 24 }, (_, h) => `${d}T${String(h).padStart(2, '0')}:00`);
function synth(models: WeatherModelId[], wetBelow: (m: string) => number) {
  const time = ['2026-11-30', ...DATES].flatMap(hours);
  const h: Record<string, any> = { time };
  for (const m of models) for (const v of HOURLY_VARS) {
    const wet = wetBelow(m);
    h[`${v}_${m}`] = time.map(() => {
      const lvl = PRESSURE_LEVELS.find(l => v.endsWith(`_${l.p}hPa`));
      if (lvl) {
        if (v.startsWith('geopotential_height')) return lvl.approxH;
        if (v.startsWith('temperature')) return lvl.approxH <= wet ? 20 - 6.5 * lvl.approxH / 1000 : 22 - 3 * lvl.approxH / 1000;
        if (v.startsWith('relative_humidity')) return lvl.approxH <= wet ? 98 : 25;
        if (v.startsWith('cloud_cover')) return lvl.approxH <= wet ? 95 : 0;
        return 5;
      }
      if (v === 'relative_humidity_2m') return lvl === undefined && wet > 0 ? 99 : 60;
      if (v === 'temperature_2m') return 14;
      if (v === 'dew_point_2m') return wet > 0 ? 13.8 : 6;
      if (v === 'cloud_cover_low') return wet > 0 ? 95 : 0;
      if (v === 'precipitation') return 0;
      return 5;
    });
  }
  return makeHourlyBlock(h);
}
const MT = { elevation: 1800, zone: 'A_CLOUD_TRAP' as any, lat: 21.6 };
const wet = (m: string) => (RANK3.includes(m as WeatherModelId) ? 0 : 1000);

describe('bản chụp tuần - bóng 6 mô hình (gf1b7)', () => {
  it('bóng gồm đúng 3 mô hình của bảng + ECMWF IFS, JMA, AIFS', () => {
    expect(WEEK_SHADOW_MODELS).toEqual([...RANK3, 'ecmwf_ifs025', 'jma_seamless', 'ecmwf_aifs025_single']);
  });

  it('trường hiển thị khi tải 6 mô hình GIỐNG HỆT khi tải 3 mô hình (bóng không chạm bảng)', () => {
    const three = weekDaysFromBlock(synth(RANK3, wet), RANK3, DATES, '2026-11-30', MT, 600);
    const six = weekDaysFromBlock(synth(WEEK_SHADOW_MODELS, wet), WEEK_SHADOW_MODELS, DATES, '2026-11-30', MT, 600);
    expect(three).toHaveLength(2);
    const strip = (x: any) => { const { shadow, ...rest } = x; return rest; };
    expect(six.map(strip)).toEqual(three);
    expect(three.every(d => d.shadow === undefined)).toBe(true);
  });

  it('bóng chấm thật cả 6 mô hình và khác bảng khi 3 mô hình thêm nói khác', () => {
    const six = weekDaysFromBlock(synth(WEEK_SHADOW_MODELS, wet), WEEK_SHADOW_MODELS, DATES, '2026-11-30', MT, 600);
    for (const d of six) {
      expect(d.shadow).toBeDefined();
      expect(Object.keys(d.shadow!.perModel).sort()).toEqual([...WEEK_SHADOW_MODELS].sort());
      expect(d.shadow!.models).toHaveLength(6);
      // 3 mô hình thêm ẩm => chúng phải ra mặt mây; 3 mô hình bảng khô => không có
      expect(d.shadow!.perModel.ecmwf_ifs025.cloudTop).not.toBeNull();
      expect(d.shadow!.perModel.gfs_seamless.cloudTop).toBeNull();
    }
    expect(six.some(d => d.shadow!.status !== d.status || d.shadow!.agreement !== d.agreement || d.shadow!.score !== d.score)).toBe(true);
  });
});
