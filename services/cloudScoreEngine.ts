/**
 * cloudScoreEngine — engine chấm điểm biển mây DETERMINISTIC (thay AI làm toán).
 *
 * Nguyên tắc: "con số = code, tư vấn = AI". Mọi chỉ số, điểm số, trạng thái trong app
 * do engine này tính từ dữ liệu Open-Meteo; AI chỉ viết lời bình từ kết quả đã tính.
 * Cùng dữ liệu vào → luôn cùng kết quả ra (test được bằng golden tests).
 *
 * Vật lý nền (ràng buộc phải giữ khi sửa):
 *  - Biển mây bức xạ hình thành trong THUNG LŨNG, không phải trên đỉnh. Mọi chỉ số ẩm/nghịch
 *    nhiệt phải tham chiếu đáy thung lũng; đỉnh chỉ là VỊ TRÍ QUAN SÁT (dùng cho ΔH).
 *  - Nghịch nhiệt KHÔNG được suy ra từ "T850 > T_đỉnh" (điều này luôn đúng với đỉnh >1500m
 *    trong mọi khí quyển). Phải so T tầng với nhiệt độ kỳ vọng theo suy giảm chuẩn 6.5°C/km
 *    tính từ thung lũng.
 *  - Độ cao gần đúng các mực áp suất: 925hPa≈760m, 850hPa≈1500m, 700hPa≈3100m (ASL).
 */
import {
  DailyForecast, DataQuality, StatusCode, SunTimes, TechnicalIndices, TerrainPoint,
} from '../types';
import { DayData, DayModelData, WeatherModelId, MODEL_LABELS } from './weatherService';

export const ENGINE_VERSION = 'engine-2.3.0';

/** Ngưỡng điểm "đáng đi" DUY NHẤT cho toàn app — engine/bộ lọc UI/xếp hạng phải cùng số này. */
export const WORTH_GOING_SCORE = 60;

// Độ cao XẤP XỈ các mực — CHỈ là fallback khi model không trả geopotential_height thật.
// engine-2.0: khi DayModelData.levels có mặt, mọi phép tính dùng độ cao THẬT từng ngày.
export const LEVEL_HEIGHTS = { p925: 760, p850: 1500, p700: 3100 } as const;
const LAPSE_RATE = 6.5; // °C / km — suy giảm nhiệt chuẩn

export type Zone = 'A_CLOUD_TRAP' | 'B_WIND_TUNNEL';

export interface DayContext {
  valleyElevation: number;
  observerAlt: number;
  zone: Zone;
  lat?: number;          // vĩ độ điểm — để hiệu chỉnh mùa theo vùng khí hậu
  peakAltitude?: number;
  profile?: TerrainPoint[];
}

export interface EngineDayResult {
  score: number;
  status: StatusCode;
  statusText: string;
  reasons: string[];
  indices: TechnicalIndices;
  sunriseColorPotential: number;
  recommendedPosition?: string;
  warnings: string[];
  summary: { temp: string; humidity: string; wind: string };
}

// ---------------------------------------------------------------- vật lý ----

/**
 * Nghịch nhiệt tham chiếu THUNG LŨNG: anomaly = T_tầng − T_kỳ_vọng(suy giảm chuẩn từ thung lũng).
 * engine-2.0: quét TOÀN BỘ profile tầng (7 mực GFS/ICON, độ cao geopotential thật) và trả thêm
 * ĐỘ CAO của tầng nghịch nhiệt cực đại; fallback 925/850 xấp xỉ khi model không có profile.
 */
export function computeInversion(m: DayModelData, valleyElev: number): {
  strength: 'Strong' | 'Moderate' | 'Weak' | 'None';
  anomaly: number;
  height: number | null; // m ASL của tầng anomaly cực đại (null nếu None)
} {
  const expectAt = (h: number) => m.t_valley_dawn - (LAPSE_RATE * (h - valleyElev)) / 1000;
  const samples: { h: number; a: number }[] = [];
  // Chỉ quét tầng THẤP: nắp nghịch nhiệt nhốt biển mây nằm trong ~1-2km trên đáy thung lũng;
  // ấm tầng cao hơn nữa KHÔNG được tính (tái phạm lỗi "đỉnh cao nào cũng Strong").
  // Trần TƯƠNG ĐỐI max(2600, valley+1300): thung lũng cao (Trạm Tôn 1900m của Fansipan)
  // từng rơi vào khe hở (1980-2600m không có mực nào) → không bao giờ phát hiện được
  // nghịch nhiệt và bị trừ điểm oan vĩnh viễn — lỗi audit vòng 2, có test khóa.
  const ceiling = Math.max(2600, valleyElev + 1300);
  const profile = (m.levels ?? []).filter(
    l => Number.isFinite(l.t) && l.h > valleyElev + 80 && l.h <= ceiling
  );
  if (profile.length > 0) {
    for (const l of profile) samples.push({ h: l.h, a: l.t - expectAt(l.h) });
  } else {
    if (Number.isFinite(m.t925) && LEVEL_HEIGHTS.p925 > valleyElev + 80) {
      samples.push({ h: LEVEL_HEIGHTS.p925, a: m.t925 - expectAt(LEVEL_HEIGHTS.p925) });
    }
    if (Number.isFinite(m.t850) && LEVEL_HEIGHTS.p850 > valleyElev + 80) {
      samples.push({ h: LEVEL_HEIGHTS.p850, a: m.t850 - expectAt(LEVEL_HEIGHTS.p850) });
    }
    // Thung lũng cao (>1500m): 925/850hPa nằm dưới/sát đáy → phải xét cả 700hPa
    if (valleyElev > 1500 && Number.isFinite(m.t700) && LEVEL_HEIGHTS.p700 <= ceiling) {
      samples.push({ h: LEVEL_HEIGHTS.p700, a: m.t700 - expectAt(LEVEL_HEIGHTS.p700) });
    }
  }
  if (samples.length === 0) return { strength: 'None', anomaly: 0, height: null };
  const best = samples.reduce((a, b) => (b.a > a.a ? b : a));
  const anomaly = best.a;
  const strength = anomaly >= 3 ? 'Strong' : anomaly >= 1 ? 'Moderate' : anomaly >= -1 ? 'Weak' : 'None';
  return { strength, anomaly: +anomaly.toFixed(1), height: strength === 'None' ? null : Math.round(best.h) };
}

/** LCL từ THUNG LŨNG → đáy mây ASL (m). */
export function computeCloudBase(m: DayModelData, valleyElev: number): number {
  const spread = Math.max(0, m.t_valley_dawn - m.td_valley_dawn);
  return Math.round(valleyElev + 125 * spread);
}

/**
 * Ước tính mặt trên biển mây (cloud top, ASL) từ profile các tầng.
 * engine-2.0: ưu tiên cloud_cover THEO TỪNG TẦNG (mô hình nói thẳng "mây nằm ở đâu")
 * kết hợp RH≥80%, trên độ cao geopotential thật; fallback 3 mực RH xấp xỉ như cũ.
 * Trả null nếu mô hình không nhìn thấy mây tầng thấp (không có biển mây).
 */
/**
 * TÍN HIỆU BÃO HOÀ THUNG LŨNG — bộ dò biển mây thứ HAI, độc lập với cloud_cover_low.
 *
 * Vì sao cần (đo thật 23/8/2026 tại Tà Xùa, Bắc Yên — hôm người dùng thấy biển mây cả ngày):
 * phân tích best_match cho RH 96–99%, T−Td = 0,2–0,5°C ở cao độ đáy thung lũng, tức KHÔNG KHÍ
 * ĐÃ BÃO HOÀ — nhưng cloud_cover_low chỉ 0–55%. Lý do: mô hình toàn cầu có ô lưới 9–25km,
 * không phân giải nổi lớp sương dày 300–800m nằm lọt trong thung lũng hẹp Tây Bắc. Nếu chỉ
 * tin cloud_cover_low thì engine bỏ sót đúng loại biển mây phổ biến nhất ở Việt Nam.
 *
 * Ở đây T−Td ≈ 0 nghĩa là mực ngưng tụ nằm NGAY TRÊN mặt đất thung lũng → có mây/sương tại chỗ.
 */
export interface SaturationSignal {
  spread: number;      // T−Td tại đáy thung lũng lúc bình minh
  seaRH: number;       // RH mực ngay trên đáy thung lũng
  nightRH: number;     // RH 2m trong thung lũng ban đêm
  saturated: boolean;  // đủ điều kiện ngưng tụ tại chỗ
  points: number;      // điểm quy đổi, so sánh ngang với cloud_cover_low × 0,45
}

export function valleySaturation(m: DayModelData, valleyElev: number): SaturationSignal {
  const spread = m.t_valley_dawn - m.td_valley_dawn;
  const seaRH = valleyElev < 900 ? m.rh925 : valleyElev < 1700 ? m.rh850 : m.rh700;
  const nightRH = m.rh2m_valley_night;
  const rhOk = Number.isFinite(seaRH) ? seaRH >= 88 : false;
  const nightOk = Number.isFinite(nightRH) ? nightRH >= 92 : false;
  const saturated = spread <= 1.0 && (rhOk || nightOk);
  let points = 0;
  if (saturated) {
    points = spread <= 0.4 ? 34 : spread <= 0.7 ? 28 : 22;
    if (!(Number.isFinite(seaRH) && seaRH >= 95) && !(Number.isFinite(nightRH) && nightRH >= 96)) {
      points = Math.round(points * 0.85);
    }
  }
  return { spread: +spread.toFixed(1), seaRH, nightRH, saturated, points };
}

/**
 * Mặt biển mây KHÔNG THỂ cao hơn nắp nghịch nhiệt — đó chính là định nghĩa của nắp.
 *
 * Vì sao phải kẹp (lỗi thật, Tà Xùa 24/8/2026): hôm đó trời mưa nên RH ≥80% liên tục từ
 * thung lũng lên tận 700hPa, khiến "lớp mây liên tục" chạy suốt cột khí và 5/6 mô hình đều
 * ra đỉnh mây 3.499m → engine kết luận người đứng 1.600m "chìm trong mây". Thực tế người
 * dùng đứng TRÊN biển mây cả buổi sáng. Cột khí mưa thì đúng là có mây từ dưới lên trên
 * thật, nhưng cái người săn mây nhìn thấy là LỚP THẤP bị nhốt dưới nắp; mọi thứ phía trên
 * nắp là tầng mây khác. GFS — mô hình duy nhất đặt đỉnh mây dưới chỗ đứng — đã đúng.
 */
function capByInversion(top: number, m: DayModelData, valleyElev: number, base: number): number {
  const inv = computeInversion(m, valleyElev);
  if (inv.height === null) return top;
  if (inv.strength !== 'Strong' && inv.strength !== 'Moderate') return top;
  if (inv.height <= base + 100) return top;      // nắp quá sát đáy mây → không tin
  // CHỈ can thiệp khi ước lượng vượt HẲN nắp (>300m). Vượt chút ít là phần đệm bình thường
  // của phép ước lượng; vượt cả cây số nghĩa là đã gộp nhầm một tầng mây khác vào lớp thấp.
  if (top <= inv.height + 300) return top;
  return inv.height;
}

export function estimateCloudTop(m: DayModelData, valleyElev: number): number | null {
  // Cổng cloud_cover_low một mình từng làm engine trả "CLEAR" cho ngày thung lũng bão hoà
  // (AIFS 23/8/2026 báo mây thấp 7% giữa lúc RH 99%) → nhận thêm tín hiệu bão hoà.
  if (m.cloud_low_dawn < 15 && !valleySaturation(m, valleyElev).saturated) return null;
  const base = computeCloudBase(m, valleyElev);
  const profile = (m.levels ?? [])
    .filter(l => l.h > valleyElev)
    .sort((a, b) => a.h - b.h);
  if (profile.length > 0) {
    const isCloudy = (l: { rh: number; cc: number }) =>
      (Number.isFinite(l.cc) && l.cc >= 45) || (Number.isFinite(l.rh) && l.rh >= 80);
    // Mặt biển mây = đỉnh của LỚP MÂY LIÊN TỤC từ tầng thấp nhất có mây đi lên.
    // Không nhảy cóc lên tầng mây trung/cao tách rời phía trên (đó là lớp mây khác).
    const firstCloudy = profile.findIndex(isCloudy);
    let moistTop = -1;
    if (firstCloudy >= 0) {
      let i = firstCloudy;
      while (i < profile.length && isCloudy(profile[i])) {
        moistTop = profile[i].h;
        i++;
      }
    }
    let top: number;
    if (moistTop < 0) top = base + 350;              // mây thấp nông, không tầng nào rõ mây
    else if (moistTop >= 2900) top = moistTop + 400; // lớp mây liên tục tới ~700hPa → trùm dày
    else top = moistTop + 150;
    return Math.max(capByInversion(top, m, valleyElev, base), base + 100);
  }
  const levels = [
    { h: LEVEL_HEIGHTS.p925, rh: m.rh925 },
    { h: LEVEL_HEIGHTS.p850, rh: m.rh850 },
    { h: LEVEL_HEIGHTS.p700, rh: m.rh700 },
  ].filter(l => Number.isFinite(l.rh) && l.h > valleyElev);
  let moistTop = -1;
  for (const l of levels) if (l.rh >= 80) moistTop = Math.max(moistTop, l.h);
  let top: number;
  if (moistTop < 0) {
    top = base + 350; // mây thấp nông, không tầng nào bão hòa rõ
  } else if (moistTop >= LEVEL_HEIGHTS.p700) {
    top = LEVEL_HEIGHTS.p700 + 400; // ẩm sâu tới 700hPa → mây trùm dày
  } else {
    top = moistTop + 150;
  }
  return Math.max(capByInversion(top, m, valleyElev, base), base + 100);
}

export interface WindAssessment {
  level: 'Low' | 'Medium' | 'High' | 'Destructive';
  impact: number;
  detail: string;
}

/** Module 6: ngưỡng gió theo vùng địa hình — Zone B (ống gió Lai Châu) khắt khe hơn hẳn. */
export function assessWind(wind850: number, zone: Zone): WindAssessment {
  if (zone === 'B_WIND_TUNNEL') {
    if (wind850 <= 5) return { level: 'Low', impact: 0, detail: `${wind850}km/h — cực lặng (chuẩn Zone B)` };
    if (wind850 <= 8) return { level: 'Medium', impact: wind850, detail: `${wind850}km/h — ranh giới chịu đựng của ống gió` };
    if (wind850 <= 15) return { level: 'High', impact: wind850 * 1.5, detail: `${wind850}km/h — xáo trộn cơ học trong ống gió` };
    return { level: 'Destructive', impact: wind850 * 2, detail: `${wind850}km/h — gió xé nát cấu trúc mây` };
  }
  // Hiệu chỉnh 23/8/2026: thang cũ (Destructive từ >20km/h) chấm "phá vỡ biển mây" cho ngày
  // Tà Xùa gió 22-23km/h — hôm đó biển mây thực tế nằm nguyên cả ngày. 23km/h ≈ 6,4m/s ở
  // 1.500m là gió vừa; muốn xé nát một lớp mây bị nghịch nhiệt nhốt thường phải >28km/h.
  // ⚠️ Thang này mới dựa trên MỘT ngày kiểm chứng thật — cần thêm quan sát để chốt.
  if (wind850 < 12) return { level: 'Low', impact: 0, detail: `${wind850}km/h — lặng, mây tĩnh` };
  if (wind850 < 18) return { level: 'Medium', impact: wind850, detail: `${wind850}km/h — mây luồn đẹp` };
  if (wind850 <= 26) return { level: 'High', impact: wind850, detail: `${wind850}km/h — mây bị đẩy mạnh` };
  return { level: 'Destructive', impact: wind850 * 2, detail: `${wind850}km/h — phá vỡ biển mây` };
}

/** FSI cổ điển nhưng tham chiếu THUNG LŨNG (đúng cách dùng của chỉ số). Càng thấp càng tốt. */
export function computeFSI(m: DayModelData, wind: WindAssessment): number {
  const spread = m.t_valley_dawn - m.td_valley_dawn;
  return Math.round(2 * spread + 2 * (m.t_valley_dawn - m.t850) + wind.impact);
}

/** VRII — chỉ số bức xạ thung lũng, đầu vào là đêm TRƯỚC ngày dự báo. */
export function computeVRII(m: DayModelData, inversionAnomaly: number): {
  score: number; label: 'Excellent' | 'Favorable' | 'Moderate' | 'Poor';
} {
  const spread = Math.max(0, m.t_valley_dawn - m.td_valley_dawn);
  const inversionBonus = inversionAnomaly >= 3 ? 30 : inversionAnomaly >= 1 ? 15 : 0;
  const highCloudPenalty = m.cloud_high_night >= 60 ? 20 : m.cloud_high_night >= 30 ? 10 : 0;
  let score = 85 - spread * 12 - m.wind925_night * 2.5 + inversionBonus - highCloudPenalty;
  score = Math.round(Math.max(0, Math.min(100, score)));
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Favorable' : score >= 40 ? 'Moderate' : 'Poor';
  return { score, label };
}

/** Tiềm năng "cháy mây" bình minh cho nhiếp ảnh: cần MỘT ÍT mây cao/trung để hứng màu. */
export function sunriseColorPotential(m: DayModelData, air?: { aod: number; pm25: number }): number {
  const c = Math.max(m.cloud_mid_dawn * 0.7, m.cloud_high_dawn);
  let base: number;
  if (c >= 15 && c <= 55) base = Math.round(95 - Math.abs(c - 35));
  else if (c < 15) base = 45;   // trời trong — bình minh sạch nhưng màu nhạt
  else if (c <= 75) base = 30;
  else base = 10;               // trời phủ kín — mất bình minh
  // Độ đục khí quyển THẬT (AOD từ CAMS): mù khô/bụi làm mặt trời mọc xỉn màu, mất tương phản.
  // AOD ≲0.25 = khí quyển trong (màu rực); ≳0.6 = đục nặng (thường mù khô mùa đốt nương).
  if (air && Number.isFinite(air.aod)) {
    if (air.aod >= 0.8) base -= 25;
    else if (air.aod >= 0.55) base -= 15;
    else if (air.aod >= 0.35) base -= 6;
    else if (air.aod <= 0.2) base += 5;   // khí quyển rất trong — màu sạch, tương phản cao
  }
  return Math.max(0, Math.min(100, Math.round(base)));
}

// ---------------------------------------------------------- mùa (Module 7) ----

export type ClimateRegion = 'NORTH' | 'CENTRAL' | 'SOUTH';

/**
 * Phân vùng khí hậu theo vĩ độ (thư viện 58 điểm phủ toàn quốc, nhịp mùa 3 miền khác hẳn):
 * NORTH ≥17.5° (Bắc Bộ — nhịp Tây Bắc cũ); CENTRAL 15.5–17.5° (Trung Trung Bộ — mưa bão
 * 9-12, khô 1-5); SOUTH <15.5° (Tây Nguyên + Nam Bộ — khô 11-4, mưa 5-10).
 */
export function climateRegion(lat?: number): ClimateRegion {
  if (typeof lat !== 'number') return 'NORTH'; // mặc định nhịp Tây Bắc (hành vi cũ)
  if (lat >= 17.5) return 'NORTH';
  if (lat >= 15.5) return 'CENTRAL';
  return 'SOUTH';
}

export function seasonAdjust(dateStr: string, lat?: number): { delta: number; label: string; warnings: string[] } {
  const month = parseInt(dateStr.slice(5, 7), 10);
  const region = climateRegion(lat);

  if (region === 'CENTRAL') {
    if (month >= 9 && month <= 12) {
      return {
        delta: -12, label: 'Mùa mưa bão miền Trung (9-12)',
        warnings: ['Mùa mưa bão miền Trung: lũ quét/sạt lở — kiểm tra tin bão và tình trạng đường trước khi đi.'],
      };
    }
    if (month <= 2) {
      return { delta: 5, label: 'Đầu mùa khô miền Trung — không khí lạnh tràn về tạo mây luồn đẹp', warnings: [] };
    }
    if (month <= 5) {
      return { delta: 2, label: 'Mùa khô miền Trung, trời ổn định', warnings: [] };
    }
    return {
      delta: -4, label: 'Hè miền Trung (gió Lào khô nóng)',
      warnings: ['Dông nhiệt chiều tối: nên xuống núi trước 14:00.'],
    };
  }

  if (region === 'SOUTH') {
    if (month >= 11 || month <= 4) {
      return { delta: 6, label: 'Mùa khô Tây Nguyên/Nam Bộ — sương mù bức xạ sáng sớm thường xuyên', warnings: [] };
    }
    return {
      delta: -8, label: 'Mùa mưa Tây Nguyên/Nam Bộ (5-10)',
      warnings: ['Mưa dông chiều tối gần như mỗi ngày — canh khung 4-9h sáng, cẩn thận đường trơn.'],
    };
  }

  // NORTH — nhịp Tây Bắc (hành vi gốc)
  if (month >= 10 && month <= 11) {
    return { delta: 8, label: 'Thu (mùa vàng săn mây)', warnings: [] };
  }
  if (month === 12 || month <= 2) {
    return {
      delta: 0, label: 'Đông (mùa sương, gió lạnh)',
      warnings: ['Rét đậm trên núi cao — trên 2500m có thể ≤0°C, đề phòng băng giá trơn trượt.'],
    };
  }
  if (month >= 3 && month <= 5) {
    return {
      delta: -6, label: 'Xuân (bất ổn định, dông chiều)',
      warnings: ['Mùa dông chiều: nên xuống núi/về lán trước 14:00.'],
    };
  }
  return {
    delta: -12, label: 'Hè (mùa mưa gió mùa)',
    warnings: ['Mùa mưa: nguy cơ sạt lở và lũ suối cao — kiểm tra tình trạng đường trước khi đi.'],
  };
}

// ------------------------------------------------------- chấm 1 mô hình ----

export const STATUS_TEXT: Record<StatusCode, string> = {
  STATIC: 'Biển mây tĩnh — thảm mây phẳng',
  FLOWING: 'Mây luồn — biển mây chuyển động đẹp',
  CLEAR: 'Trời quang — không có biển mây',
  FOG: 'Mù trùm — bạn chìm trong mây',
  DISSIPATING: 'Mây tan — gió phá vỡ cấu trúc',
  FLUCTUATING: 'Ranh giới mặt mây — mây dâng từng đợt',
  ROLLING: 'Mây trào cuộn qua vị trí đứng',
  RAIN: 'Mưa — hoãn kế hoạch săn mây',
  UNKNOWN: 'Chưa xác định (thiếu dữ liệu)',
};

export interface ModelDayScore {
  model: WeatherModelId;
  score: number;
  status: StatusCode;
  cloudTop: number | null;
  reasons: string[];
}

export function scoreOneModel(
  model: WeatherModelId, m: DayModelData, ctx: DayContext, dateStr: string
): ModelDayScore {
  const reasons: string[] = [];
  const inv = computeInversion(m, ctx.valleyElevation);
  const top = estimateCloudTop(m, ctx.valleyElevation);
  // GIÓ NÀO mới phá được biển mây? Nắp nghịch nhiệt tồn tại chính là để CHẶN xáo trộn thẳng
  // đứng. Khi mặt biển mây nằm hẳn dưới nắp, gió 850hPa (~1500m) thổi ở tầng BÊN TRÊN nắp,
  // không với xuống lớp mây được — lúc đó gió quyết định là gió TRONG lớp mây (925hPa ~760m).
  // (Tà Xùa 23/8/2026: gió 850 22km/h bị engine cũ chấm "phá vỡ biển mây" trong khi gió 925
  // chỉ 3-9km/h và biển mây thực tế nằm nguyên cả ngày dưới nắp nghịch nhiệt +5°C tại 1450m.)
  const seaCapped = (inv.strength === 'Strong' || inv.strength === 'Moderate')
    && inv.height !== null && inv.height <= LEVEL_HEIGHTS.p850 + 100
    && top !== null && top <= inv.height + 150
    && LEVEL_HEIGHTS.p925 > ctx.valleyElevation
    && Number.isFinite(m.wind925_dawn_max);
  const windLevel = seaCapped ? '925hPa (trong lớp mây)' : '850hPa';
  const wind = assessWind(seaCapped ? m.wind925_dawn_max : m.wind850_dawn_max, ctx.zone);
  const spread = m.t_valley_dawn - m.td_valley_dawn;
  // Ẩm "lớp biển mây" phải là mực NGAY TRÊN đáy thung lũng — thung lũng 1800-1900m mà
  // dùng rh850 (~1500m) là đo không khí DƯỚI LÒNG ĐẤT (lỗi audit vòng 2)
  const seaRH = ctx.valleyElevation < 900 ? m.rh925 : ctx.valleyElevation < 1700 ? m.rh850 : m.rh700;
  const sat = valleySaturation(m, ctx.valleyElevation);
  const blhNight = m.blh_night_min;
  // "Chữ ký biển mây": thung lũng bão hoà + có nắp nghịch nhiệt + người đứng CAO HƠN mặt mây.
  // Đây là định nghĩa vật lý của biển mây; khi cả ba có mặt thì các hình phạt gián tiếp
  // (mây cao ban đêm, mưa) không được phép xoá kết luận — chúng chỉ còn ý nghĩa "đi có sướng không".
  const seaSignature = sat.saturated
    && (inv.strength === 'Strong' || inv.strength === 'Moderate'
        || (blhNight !== undefined && Number.isFinite(blhNight) && blhNight <= 300))
    && ctx.observerAlt >= computeCloudBase(m, ctx.valleyElevation) + 300;

  let score = 0;
  const add = (delta: number, why: string) => { score += delta; reasons.push(`${delta >= 0 ? '+' : ''}${Math.round(delta)} · ${why}`); };

  // Hai bộ dò cùng đo MỘT thứ (có mây trong thung lũng hay không) — lấy bộ nào thấy rõ hơn.
  // cloud_cover_low của mô hình toàn cầu bỏ sót sương thung lũng hẹp (xem valleySaturation).
  const lowCloudPts = m.cloud_low_dawn * 0.45;
  if (sat.points > lowCloudPts) {
    add(sat.points, `Thung lũng BÃO HOÀ lúc bình minh (T−Td = ${sat.spread}°C, RH ${Math.round(sat.seaRH)}%) — `
      + `ngưng tụ ngay trên mặt đất, dù mô hình toàn cầu chỉ "thấy" ${m.cloud_low_dawn}% mây tầng thấp`);
  } else {
    add(lowCloudPts, `Mây tầng thấp bình minh ${m.cloud_low_dawn}% (mô hình "nhìn thấy" biển mây)`);
  }
  if (inv.strength === 'Strong') add(18, `Nghịch nhiệt mạnh (+${inv.anomaly}°C so với suy giảm chuẩn) — mây bị "nhốt" trong thung lũng`);
  else if (inv.strength === 'Moderate') add(10, `Nghịch nhiệt vừa (+${inv.anomaly}°C)`);
  else if (inv.strength === 'Weak') add(3, `Nghịch nhiệt yếu (${inv.anomaly}°C)`);
  else add(-5, `Không có nghịch nhiệt (${inv.anomaly}°C) — khí quyển bất ổn định`);

  if (spread <= 1.5) add(12, `Thung lũng cận bão hòa (T−Td = ${spread.toFixed(1)}°C)`);
  else if (spread <= 3) add(6, `Thung lũng đủ ẩm (T−Td = ${spread.toFixed(1)}°C)`);
  else if (spread > 5) add(-8, `Thung lũng khô (T−Td = ${spread.toFixed(1)}°C) — khó ngưng tụ`);

  if (Number.isFinite(seaRH)) {
    if (seaRH >= 90) add(8, `Ẩm lớp biển mây rất cao (RH ${seaRH}%)`);
    else if (seaRH >= 80) add(4, `Ẩm lớp biển mây tốt (RH ${seaRH}%)`);
  }

  // Lớp biên đêm (boundary layer height — hiện chỉ GFS cung cấp): BLH mỏng ban đêm
  // = không khí lạnh tù đọng sát đáy thung lũng — chỉ báo trực tiếp của nghịch nhiệt bức xạ
  const blh = m.blh_night_min;
  if (blh !== undefined && Number.isFinite(blh)) {
    if (blh <= 200) add(8, `Lớp biên đêm rất mỏng (${Math.round(blh)}m) — không khí lạnh tù đọng trong thung lũng`);
    else if (blh <= 500) add(4, `Lớp biên đêm mỏng (${Math.round(blh)}m) — thuận lợi cho nghịch nhiệt`);
    else if (blh >= 1200) add(-5, `Lớp biên đêm dày (${Math.round(blh)}m) — khí quyển xáo trộn, khó giữ mây trong thung lũng`);
  }

  if (wind.level === 'Medium') add(-6, `Gió ${windLevel}: ${wind.detail}`);
  else if (wind.level === 'High') add(-14, `Gió ${windLevel}: ${wind.detail}`);
  else if (wind.level === 'Destructive') add(-28, `Gió ${windLevel}: ${wind.detail}`);
  else reasons.push(`±0 · Gió ${windLevel}: ${wind.detail}` + (seaCapped ? ' — gió trên nắp nghịch nhiệt không với xuống được' : ''));

  // Mây cao ban đêm chỉ là BIẾN THAY THẾ để đoán "sẽ không có nghịch nhiệt". Nếu mô hình đã
  // nói thẳng nghịch nhiệt CÓ (hoặc lớp biên đêm mỏng dính) thì phỏng đoán đó đã sai — trừ
  // tiếp là phạt hai lần cùng một cơ chế (Tà Xùa 23/8/2026: mây cao 100% mà nghịch nhiệt +4,6°C).
  const inversionObserved = inv.strength === 'Strong' || inv.strength === 'Moderate'
    || (blhNight !== undefined && Number.isFinite(blhNight) && blhNight <= 300);
  if (m.cloud_high_night >= 60) {
    add(inversionObserved ? -5 : -15,
      `Mây cao che ${m.cloud_high_night}% ban đêm — chặn bức xạ`
      + (inversionObserved ? ', nhưng nghịch nhiệt vẫn hình thành nên chỉ trừ nhẹ' : ', khó hình thành nghịch nhiệt'));
  } else if (m.cloud_high_night >= 30) {
    add(inversionObserved ? -2 : -7, `Mây cao ban đêm ${m.cloud_high_night}% — bức xạ giảm một phần`);
  }

  // MƯA — chỉnh lại theo đúng vật lý mùa mưa Tây Bắc (bằng chứng: Tà Xùa 23/8/2026 mưa phùn
  // rạng sáng mà biển mây dày cả ngày). Mưa KHÔNG phải bằng chứng chống lại biển mây; nó làm
  // thung lũng bão hoà, tức là bằng chứng THUẬN. Mưa chỉ trừ điểm ở mức "đi có sướng không",
  // và khi chữ ký biển mây đã đủ thì mức trừ giảm còn 40%.
  const dawnRate = m.precip_dawn / 5;              // mm/giờ trung bình cửa sổ 04–09h
  let rainPenalty = 0;
  let rainWhy = '';
  if (dawnRate >= 1.0)      { rainPenalty = -25; rainWhy = `Mưa to sáng sớm ${m.precip_dawn}mm (${dawnRate.toFixed(1)}mm/h)`; }
  else if (dawnRate >= 0.3) { rainPenalty = -15; rainWhy = `Mưa sáng sớm ${m.precip_dawn}mm (${dawnRate.toFixed(1)}mm/h)`; }
  else if (dawnRate >= 0.06){ rainPenalty = -8;  rainWhy = `Mưa phùn sáng sớm ${m.precip_dawn}mm`; }
  if (rainPenalty !== 0) {
    add(seaSignature ? Math.round(rainPenalty * 0.4) : rainPenalty,
        rainWhy + (seaSignature ? ' — nhưng thung lũng đã bão hoà dưới nắp nghịch nhiệt, mưa nuôi biển mây chứ không phá' : ''));
  }
  // Mưa đêm TẠNH trước bình minh là kịch bản "biển mây sau mưa" kinh điển: hơi ẩm nạp đầy
  // thung lũng rồi trời hửng — chỉ phạt khi mưa còn kéo sang cửa sổ săn mây.
  if (m.precip_night > 8) {
    if (dawnRate < 0.3 && sat.saturated) {
      add(-3, `Mưa đêm ${m.precip_night}mm nhưng tạnh trước bình minh — thung lũng bão hoà, kịch bản "biển mây sau mưa"`);
    } else if (seaSignature) {
      // Kiểm chứng thật 23 VÀ 24/8/2026 tại Tà Xùa: mưa suốt đêm 21mm rồi sáng vẫn mưa ~2mm/h,
      // mà biển mây vẫn dày cả hai hôm. Mưa dầm dưới nắp nghịch nhiệt là mưa TRONG/TRÊN lớp mây,
      // không phải đối lưu xé mây — phạt nặng ở đây là phạt nhầm hiện tượng.
      add(-6, `Mưa đêm ${m.precip_night}mm kéo sang sáng — nhưng dưới nắp nghịch nhiệt, thung lũng vẫn bão hoà`);
    } else {
      add(-15, `Mưa đêm lớn ${m.precip_night}mm, kéo sang cả sáng`);
    }
  }

  // Bất ổn định đối lưu THẬT từ mô hình (lifted index, GFS) — thay vì chỉ đoán qua "mùa":
  // LI càng âm càng dễ dông phá biển mây/nguy hiểm buổi trưa-chiều
  const li = m.lifted_index;
  if (li !== undefined && Number.isFinite(li) && li <= -4) {
    add(-6, `Bất ổn định đối lưu mạnh (Lifted Index ${li}) — nguy cơ dông phát triển`);
  }

  const season = seasonAdjust(dateStr, ctx.lat);
  if (season.delta !== 0) {
    // Hiệu chỉnh mùa là TIÊN NGHIỆM khí hậu: "mùa này thường ít/nhiều biển mây". Khi các
    // trường của mô hình đã cho thấy TẬN MẮT chữ ký biển mây (thung lũng bão hoà + nắp
    // nghịch nhiệt + người đứng trên mặt mây) thì bằng chứng cụ thể đã thay thế tiên nghiệm —
    // trừ tiếp cả 12 điểm là đếm hai lần cùng một thứ. Chỉ giảm phạt, KHÔNG tăng thưởng.
    const delta = seaSignature && season.delta < 0 ? Math.round(season.delta / 2) : season.delta;
    add(delta, `Hiệu chỉnh mùa: ${season.label}`
      + (delta !== season.delta ? ' (giảm nửa vì đã thấy rõ chữ ký biển mây)' : ''));
  }

  score = Math.round(Math.max(0, Math.min(100, score)));

  // Cây quyết định trạng thái (Module 3/4/5/6 gộp, thứ tự ưu tiên từ chặn-đứng → chi tiết)
  let status: StatusCode;
  const deltaH = top !== null ? ctx.observerAlt - top : null;
  const deepOvercast = Number.isFinite(m.rh700) && m.rh700 >= 85 && m.cloud_mid_dawn >= 70;
  // MƯA không còn là nút chặn tuyệt đối: nếu chữ ký biển mây đã đủ thì vẫn báo đúng loại
  // biển mây và đẩy chuyện mưa sang cảnh báo — trước đây một cơn mưa phùn xoá sạch kết luận,
  // khiến ngày 23/8/2026 ở Tà Xùa (biển mây cả ngày) bị app trả về "RAIN — hoãn kế hoạch".
  const rainy = m.precip_dawn / 5 >= 0.3 || (m.precip_night > 8 && m.precip_dawn / 5 >= 0.06);
  if (rainy && !seaSignature) status = 'RAIN';
  else if (wind.level === 'Destructive') status = 'DISSIPATING';
  // "Ẩm sâu tới 700hPa + mây tầng giữa dày" CHỈ có nghĩa khi ta chưa biết mặt biển mây ở đâu.
  // Khi đã tính được đỉnh mây thì ΔH mới là câu trả lời: mây tầng giữa ở 3.000m không hề đặt
  // người đứng 1.600m vào trong mây, nếu mặt biển mây nằm ở 1.582m dưới chân họ.
  // (Lỗi thật: Tà Xùa 24/8/2026 — GFS tính đỉnh mây 1.582m < chỗ đứng 1.600m, tức ĐỨNG TRÊN
  //  biển mây, nhưng bị deepOvercast đè thành "Mù trùm — bạn chìm trong mây".)
  else if (top === null) status = deepOvercast ? 'FOG' : 'CLEAR';
  else if (deltaH !== null && deltaH > 250) status = wind.level === 'Low' ? 'STATIC' : 'FLOWING';
  else if (deltaH !== null && deltaH >= -250) status = wind.level === 'Low' ? 'FLUCTUATING' : 'ROLLING';
  else status = 'FOG';

  return { model, score, status, cloudTop: top, reasons };
}

// --------------------------------------------- đồng thuận & kết quả ngày ----

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
};

// Hòa phiếu giữa các trạng thái → trạng thái AN TOÀN HƠN thắng (RAIN > DISSIPATING > FOG...)
// — trước đây hòa 3-3 thì model đứng đầu danh sách (ECMWF) thắng ngầm, kể cả RAIN vs STATIC.
const STATUS_SEVERITY: Record<StatusCode, number> = {
  RAIN: 8, DISSIPATING: 7, FOG: 6, ROLLING: 5, FLUCTUATING: 4,
  CLEAR: 3, FLOWING: 2, STATIC: 1, UNKNOWN: 0,
};

export function combineModels(perModel: ModelDayScore[]): {
  score: number; status: StatusCode; cloudTop: number | null;
  agreement: number; scoreSpread: number; representative: ModelDayScore;
} {
  const scores = perModel.map(p => p.score);
  const score = median(scores);
  const counts = new Map<StatusCode, number>();
  for (const p of perModel) counts.set(p.status, (counts.get(p.status) || 0) + 1);
  let status: StatusCode = perModel[0].status;
  let best = 0;
  for (const [st, c] of counts) {
    if (c > best || (c === best && STATUS_SEVERITY[st] > STATUS_SEVERITY[status])) {
      best = c; status = st;
    }
  }
  const agreement = Math.round((best / perModel.length) * 100);
  const scoreSpread = Math.max(...scores) - Math.min(...scores);
  // Đại diện: mô hình cùng trạng thái đa số, điểm gần median nhất
  const candidates = perModel.filter(p => p.status === status);
  const representative = candidates.reduce((a, b) =>
    Math.abs(a.score - score) <= Math.abs(b.score - score) ? a : b);
  const tops = perModel.map(p => p.cloudTop).filter((t): t is number => t !== null);
  const cloudTop = status === 'CLEAR' ? null : tops.length ? median(tops) : null;
  return { score, status, cloudTop, agreement, scoreSpread, representative };
}

function recommendPosition(deltaH: number | null, top: number | null, ctx: DayContext): string | undefined {
  if (top === null || deltaH === null) return undefined;
  if (deltaH > 250) return `Vị trí ${ctx.observerAlt}m cao hơn mặt mây ~${Math.round(deltaH)}m — đứng đâu cũng đẹp, ưu tiên hướng đón nắng.`;
  const higher = (ctx.profile || [])
    .filter(p => p.altitude >= top + 300)
    .sort((a, b) => a.altitude - b.altitude)[0];
  if (deltaH >= -250) {
    return higher
      ? `Đang ở ranh giới mặt mây — muốn chắc chắn đứng trên mây, di chuyển lên "${higher.label}" (${higher.altitude}m).`
      : `Đang ở ranh giới mặt mây (ΔH=${Math.round(deltaH)}m) — kiên nhẫn chờ mây "thở", hoặc lên điểm cao nhất có thể.`;
  }
  return higher
    ? `Vị trí hiện tại chìm trong mây — cần lên "${higher.label}" (${higher.altitude}m) để thoát mù.`
    : `Vị trí hiện tại chìm trong mây ~${Math.abs(Math.round(deltaH))}m — địa hình này không có điểm đủ cao để thoát mù hôm nay.`;
}

export interface EngineDayOutput {
  forecast: DailyForecast;
  agreement: number;   // % mô hình đồng thuận trạng thái (100 nếu chỉ 1 mô hình)
  scoreSpread: number;
  warnings: string[];
}

/** Chấm 1 ngày: gộp mọi mô hình có dữ liệu → DailyForecast hoàn chỉnh (chưa có lời bình AI). */
export function computeDayForecast(day: DayData, ctx: DayContext): EngineDayOutput {
  const sun = day.sun_times;
  const base = {
    date: day.date,
    data_quality: day.quality,
    sun_times: sun,
    golden_hours: sun.goldenHourMorning,
  };

  const modelEntries = Object.entries(day.models) as [WeatherModelId, DayModelData][];
  if (day.quality === 'NO_DATA' || modelEntries.length === 0) {
    return {
      forecast: {
        ...base,
        score: 0,
        status_code: 'UNKNOWN',
        status_text: STATUS_TEXT.UNKNOWN,
        data_quality: 'NO_DATA',
        reliability_note: day.daysAhead > 15
          ? `Ngày này xa hơn ${day.daysAhead} ngày — ngoài phạm vi mọi mô hình dự báo (tối đa 15 ngày).`
          : 'Không mô hình nào có dữ liệu cho ngày này.',
        reasons: [],
        technical_indices: {
          LCL_base: 'N/A', FSI_score: 0, cloud_top_estimated: 'N/A', cloud_top_m: null,
          delta_h: null, wind_impact_level: 'Unknown', moisture_type: 'Unknown',
          inversion_strength: 'Unknown',
        },
        weather_analysis: {
          general: 'Không có dữ liệu khí tượng đáng tin cậy cho ngày này — app không hiển thị số liệu ước đoán.',
          cloud_behavior: 'Chưa thể nhận định.',
          topography_effect: 'Chưa thể nhận định.',
        },
        expert_advice: 'Hãy tra lại khi ngày này vào phạm vi 15 ngày trước chuyến đi; dự báo đáng tin nhất trong vòng 3 ngày.',
        weather_summary: { temp: 'N/A', humidity: 'N/A', wind: 'N/A' },
      },
      agreement: 0, scoreSpread: 0, warnings: [],
    };
  }

  const perModel = modelEntries.map(([id, m]) => scoreOneModel(id, m, ctx, day.date));
  const combined = combineModels(perModel);
  const rep = day.models[combined.representative.model]!;
  const inv = computeInversion(rep, ctx.valleyElevation);
  const wind = assessWind(rep.wind850_dawn_max, ctx.zone);
  const fsi = computeFSI(rep, wind);
  const vrii = computeVRII(rep, inv.anomaly);
  const cloudBase = computeCloudBase(rep, ctx.valleyElevation);
  const deltaH = combined.cloudTop !== null ? ctx.observerAlt - combined.cloudTop : null;
  const season = seasonAdjust(day.date, ctx.lat);
  const colorPotential = sunriseColorPotential(rep, day.air);

  const moisture: TechnicalIndices['moisture_type'] =
    Number.isFinite(rep.rh850) ? (rep.rh850 >= 80 ? 'Deep' : rep.rh850 <= 60 ? 'Shallow' : (rep.rh700 >= 70 ? 'Deep' : 'Shallow')) : 'Unknown';

  const warnings: string[] = [...season.warnings];
  if (wind.level === 'Destructive') warnings.push(`Gió tầng 1.500m tới ${rep.wind850_dawn_max}km/h — nguy hiểm khi đứng sống núi/mỏm đá.`);
  // Cảnh báo mưa bám vào LƯỢNG MƯA THẬT, không bám vào trạng thái: từ engine-2.2 một ngày
  // vẫn có thể là STATIC/FLOWING (biển mây thật) trong khi trời mưa phùn — người đi vẫn phải
  // biết là đường trơn. Bám theo status như trước sẽ nuốt mất cảnh báo đúng lúc cần nhất.
  if (rep.precip_dawn / 5 >= 0.3) {
    warnings.push(`Có mưa trong khung giờ săn mây (${rep.precip_dawn}mm) — đường trơn, vách đá nguy hiểm.`);
  } else if (rep.precip_dawn > 0.3) {
    warnings.push(`Mưa phùn trong khung giờ săn mây (${rep.precip_dawn}mm) — mang áo mưa, giữ khô máy ảnh.`);
  }
  if (rep.precip_night > 8 && rep.precip_dawn / 5 < 0.3) {
    warnings.push(`Đêm trước mưa ${rep.precip_night}mm — đường mòn lầy trơn dù sáng đã tạnh.`);
  }
  // Mực đóng băng thật từ mô hình (GFS/ICON) — cảnh báo băng giá khi vị trí đứng ở trên nó
  if (rep.freezing_level !== undefined && Number.isFinite(rep.freezing_level) && ctx.observerAlt >= rep.freezing_level) {
    warnings.push(`Vị trí đứng ${ctx.observerAlt}m ở TRÊN mực đóng băng (~${Math.round(rep.freezing_level)}m) — nguy cơ băng giá, mặt đá/ván gỗ trơn trượt.`);
  }
  // Lifted index đo bất ổn định đối lưu THẬT — cảnh báo dông thay vì chỉ đoán theo mùa
  if (rep.lifted_index !== undefined && Number.isFinite(rep.lifted_index) && rep.lifted_index <= -2) {
    warnings.push(`⚡ Khí quyển bất ổn định (Lifted Index ${rep.lifted_index}) — nguy cơ dông từ trưa, nên xuống núi/về lán trước 13:00.`);
  }

  const reliability_note =
    day.quality === 'UNCERTAIN'
      ? `Dự báo xa ${day.daysAhead} ngày — chỉ mang tính xu hướng, hãy tra lại khi còn ≤3 ngày.`
      : undefined;

  const indices: TechnicalIndices = {
    T_surf: `${rep.t_obs_dawn}°C`,
    Td_surf: `${rep.td_obs_dawn}°C`,
    T_valley: `${rep.t_valley_dawn}°C`,
    Td_valley: `${rep.td_valley_dawn}°C`,
    T_850: `${rep.t850}°C`,
    T_700: Number.isFinite(rep.t700) ? `${rep.t700}°C` : undefined,
    LCL_base: `${cloudBase}m`,
    FSI_score: fsi,
    cloud_top_estimated: combined.cloudTop !== null ? `${combined.cloudTop}m (±200m)` : 'N/A',
    cloud_top_m: combined.cloudTop,
    delta_h: deltaH !== null ? Math.round(deltaH) : null,
    cloud_low_pct: rep.cloud_low_dawn,
    cloud_high_night_pct: rep.cloud_high_night,
    rh850_pct: Number.isFinite(rep.rh850) ? rep.rh850 : undefined,
    precip_night_mm: rep.precip_night,
    precip_dawn_mm: rep.precip_dawn,
    wind_impact_level: wind.level,
    wind_detail: wind.detail,
    moisture_type: moisture,
    inversion_strength: inv.strength,
    inversion_height_m: inv.height,
    boundary_status: deltaH !== null
      ? (deltaH > 250 ? `Trên mây ${Math.round(deltaH)}m` : deltaH >= -250 ? `Ranh giới mặt mây (ΔH=${Math.round(deltaH)}m)` : `Chìm dưới mặt mây ${Math.abs(Math.round(deltaH))}m`)
      : 'Không có biển mây',
    vrii_score: vrii.score,
    vrii_label: vrii.label,
  };

  return {
    forecast: {
      ...base,
      score: combined.score,
      status_code: combined.status,
      status_text: STATUS_TEXT[combined.status],
      reliability_note,
      reasons: combined.representative.reasons,
      sunrise_color_potential: colorPotential,
      air_quality: day.air,
      hourly_profile: day.hourly_profile,
      ensemble: day.ensemble,
      recommended_position: recommendPosition(deltaH, combined.cloudTop, ctx),
      technical_indices: indices,
      // Lời bình mặc định do engine sinh — AI sẽ thay bằng văn hay hơn nếu khả dụng
      weather_analysis: buildFallbackAnalysis(combined.status, rep, inv.strength, ctx),
      expert_advice: buildFallbackAdvice(combined.status, deltaH, sun, colorPotential),
      weather_summary: {
        temp: `${rep.t_obs_dawn}°C (vị trí đứng, rạng sáng)`,
        humidity: Number.isFinite(rep.rh850) ? `RH850 ${rep.rh850}%` : 'N/A',
        wind: `${rep.wind850_dawn_max}km/h @850hPa`,
      },
    },
    agreement: combined.agreement,
    scoreSpread: combined.scoreSpread,
    warnings,
  };
}

// ------------------------------------------- văn bản fallback (không AI) ----

function buildFallbackAnalysis(
  status: StatusCode, m: DayModelData, invStrength: string, ctx: DayContext
): { general: string; cloud_behavior: string; topography_effect: string; risk_factors?: string } {
  const general = `Rạng sáng: thung lũng ${m.t_valley_dawn}°C (điểm sương ${m.td_valley_dawn}°C), mây tầng thấp ${m.cloud_low_dawn}%, gió 850hPa ${m.wind850_dawn_max}km/h, nghịch nhiệt ${invStrength}.`;
  const behavior: Record<StatusCode, string> = {
    STATIC: 'Thảm mây nằm im trong thung lũng nhờ nghịch nhiệt và gió lặng — dạng biển mây đẹp và bền nhất.',
    FLOWING: 'Mây bị gió đẩy chảy thành luồng qua các khe núi — chuyển động đẹp cho ảnh phơi sáng.',
    CLEAR: 'Không đủ ẩm/mây tầng thấp để hình thành biển mây; trời quang.',
    FOG: 'Lớp mây dày vượt quá vị trí đứng — bạn ở TRONG mây, tầm nhìn rất thấp.',
    DISSIPATING: 'Gió mạnh xáo trộn cơ học phá cấu trúc mây; mây rách và tan nhanh.',
    FLUCTUATING: 'Mặt mây quanh vị trí đứng, "thở" theo dòng nhiệt — lúc quang lúc mù, thay đổi liên tục.',
    ROLLING: 'Mây trào qua vị trí đứng theo từng đợt gió — cảnh tượng mạnh nhưng khó đoán.',
    RAIN: 'Hệ mây mưa chiếm ưu thế; không phải điều kiện biển mây.',
    UNKNOWN: 'Chưa thể nhận định.',
  };
  const topo = ctx.zone === 'B_WIND_TUNNEL'
    ? 'Địa hình ống gió (Zone B): thung lũng rộng thẳng khiến gió tăng tốc — biển mây chỉ bền khi gió cực lặng.'
    : 'Địa hình bồn giữ ẩm (Zone A): thung lũng kín gió, dễ tụ và giữ mây.';
  return { general, cloud_behavior: behavior[status], topography_effect: topo };
}

function buildFallbackAdvice(
  status: StatusCode, deltaH: number | null, sun: SunTimes, colorPotential: number
): string {
  const parts: string[] = [];
  if (status === 'STATIC' || status === 'FLOWING') {
    parts.push(`Có mặt tại điểm ngắm trước ${sun.sunrise} (bình minh) — khung ảnh đẹp nhất trong ${sun.goldenHourMorning}.`);
  } else if (status === 'FLUCTUATING' || status === 'ROLLING') {
    parts.push('Đừng vội thất vọng khi thấy mù: bạn ở ngay ranh giới mặt mây, chờ các đợt gió đẩy mây xuống là có khoảnh khắc mây trào rất ảo.');
  } else if (status === 'FOG' && deltaH !== null) {
    parts.push(`Cần lên cao thêm ~${Math.abs(Math.round(deltaH)) + 100}m mới thoát khỏi lớp mù.`);
  } else if (status === 'RAIN') {
    parts.push('Nên dời lịch: mưa trong khung giờ săn mây, rủi ro cao hơn phần thưởng.');
  } else if (status === 'CLEAR') {
    parts.push('Khả năng có biển mây thấp — nếu vẫn đi, coi đây là buổi ngắm bình minh trời quang.');
  }
  if (colorPotential >= 60) parts.push(`Tiềm năng "cháy mây" bình minh cao (${colorPotential}/100) — mang chân máy và kính lọc GND.`);
  return parts.join(' ') || 'Theo dõi lại dự báo khi gần ngày đi.';
}

// ---------------------------------------------------------- tổng chuyến ----

export function computeTripSummary(outputs: EngineDayOutput[]): {
  bestDays: string[];
  overallScore: number;
  agreementPct: number;
  scoreSpread: number;
  dataReliability: 'HIGH' | 'MEDIUM' | 'LOW';
} {
  const withData = outputs.filter(o => o.forecast.data_quality !== 'NO_DATA');
  const bestDays = withData
    .filter(o => o.forecast.score >= WORTH_GOING_SCORE)
    .sort((a, b) => b.forecast.score - a.forecast.score)
    .slice(0, 3)
    .map(o => o.forecast.date);
  const overallScore = withData.length
    ? Math.round(withData.reduce((s, o) => s + o.forecast.score, 0) / withData.length) : 0;
  const agreementPct = withData.length
    ? Math.round(withData.reduce((s, o) => s + o.agreement, 0) / withData.length) : 0;
  const scoreSpread = withData.length
    ? Math.round(withData.reduce((s, o) => s + o.scoreSpread, 0) / withData.length) : 0;
  const nearRatio = outputs.length
    ? outputs.filter(o => o.forecast.data_quality === 'FORECAST').length / outputs.length : 0;
  const dataReliability = nearRatio >= 0.7 ? 'HIGH' : nearRatio >= 0.3 ? 'MEDIUM' : 'LOW';
  return { bestDays, overallScore, agreementPct, scoreSpread, dataReliability };
}

export function modelLabelList(ids: string[]): string[] {
  return ids.map(id => MODEL_LABELS[id] || id);
}
