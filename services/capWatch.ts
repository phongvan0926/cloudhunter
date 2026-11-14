/**
 * capWatch.ts - cờ THEO DÕI "ngày giống sáng 14/11/2026": tầng thấp bão hoà + nghịch nhiệt có nắp + khô trên nắp.
 *
 * ĐÂY LÀ GIẢ THUYẾT CHƯA KIỂM CHỨNG, không phải phán quyết và KHÔNG tham gia điểm/trạng thái/đáng đi.
 * Chốt từ mô tả 14/11 (phiếu g9518/g6102), trước khi có mẫu thứ hai: trong bảng vùng 05h 86 ngày, luật này
 * chỉ bật đúng 14/11 (xem docs/ca-thuc-dia-thang-10.md). Mỗi lần bật, bản chụp dự báo ghi lại cờ này, để
 * `calibrate.ts` chấm trên dự báo THẬT khi đủ >= 5 ngày bật. Cấm chỉnh ngưỡng theo kết quả chấm.
 *
 * Cùng 6 điều kiện với predC trong scripts/calibrate.ts (bảng vùng ECMWF 05h); ở đây áp lên từng mô hình
 * tại điểm cụ thể (đáy thung lũng, 06h), nên số có thể lệch chút so với bảng vùng.
 */
import type { DayModelData } from './weatherService';

export const CAP_WATCH_THRESHOLDS = {
  rh925Min: 90,        // tầng thấp bão hoà
  dewGapMax: 1,        // T - Td sát đất (°C)
  stableMax: 5,        // T850 - T700 (°C): nhỏ = tầng 850-700 ổn định, có nắp
  rh700Max: 40,        // khô trên nắp
  wind850Max: 10,      // km/h
  precipNightMax: 0.3, // mm
} as const;

export interface CapWatchModel {
  met: number;      // số điều kiện thoả trên 6 (bỏ qua điều kiện thiếu số liệu: tính là KHÔNG thoả)
  all: boolean;     // đủ cả 6
  key: boolean;     // hai điều kiện hiếm: ổn định 850-700 và khô trên nắp
}

export interface CapWatch {
  /** MATCH = từ nửa số mô hình trở lên (tối thiểu 2) thoả đủ 6 điều kiện. */
  tier: 'MATCH' | 'NONE';
  modelsAll: number;     // số mô hình thoả đủ 6
  modelsKey: number;     // số mô hình có cả hai điều kiện hiếm
  modelsTotal: number;
}

export function capWatchModel(m: DayModelData): CapWatchModel {
  const T = CAP_WATCH_THRESHOLDS;
  const ok = (v: number, f: (x: number) => boolean) => Number.isFinite(v) && f(v);
  const stable = ok(m.t850 - m.t700, x => x <= T.stableMax);
  const dry = ok(m.rh700, x => x <= T.rh700Max);
  const conds = [
    ok(m.rh925, x => x >= T.rh925Min),
    ok(m.t_valley_dawn - m.td_valley_dawn, x => x <= T.dewGapMax),
    stable, dry,
    ok(m.wind850_dawn_max, x => x <= T.wind850Max),
    ok(m.precip_night, x => x <= T.precipNightMax),
  ];
  const met = conds.filter(Boolean).length;
  return { met, all: met === conds.length, key: stable && dry };
}

export function capWatchOf(models: Partial<Record<string, DayModelData>>): CapWatch {
  const list = Object.values(models).filter((m): m is DayModelData => !!m).map(capWatchModel);
  const modelsAll = list.filter(x => x.all).length;
  const modelsKey = list.filter(x => x.key).length;
  const tier = list.length >= 2 && modelsAll >= 2 && modelsAll * 2 >= list.length ? 'MATCH' : 'NONE';
  return { tier, modelsAll, modelsKey, modelsTotal: list.length };
}

export const CAP_WATCH_TEXT =
  'Điều kiện giống sáng 14/11 (có biển mây rất đẹp ở Tà Xùa, Fansipan, Nhìu Cồ San, Ky Quan San): ' +
  'tầng thấp bão hoà, nghịch nhiệt có nắp, không khí trên cao khô. Đây mới là giả thuyết theo dõi, chưa kiểm chứng ' +
  '(trong kho mới có đúng 1 ngày như vậy) và KHÔNG làm đổi điểm hay lời khuyên.';
