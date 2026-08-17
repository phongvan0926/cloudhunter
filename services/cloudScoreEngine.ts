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

export const ENGINE_VERSION = 'engine-1.0.0';

export const LEVEL_HEIGHTS = { p925: 760, p850: 1500, p700: 3100 } as const;
const LAPSE_RATE = 6.5; // °C / km — suy giảm nhiệt chuẩn

export type Zone = 'A_CLOUD_TRAP' | 'B_WIND_TUNNEL';

export interface DayContext {
  valleyElevation: number;
  observerAlt: number;
  zone: Zone;
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

/** Nghịch nhiệt tham chiếu THUNG LŨNG: anomaly = T_tầng − T_kỳ_vọng(suy giảm chuẩn từ thung lũng). */
export function computeInversion(m: DayModelData, valleyElev: number): {
  strength: 'Strong' | 'Moderate' | 'Weak' | 'None';
  anomaly: number;
} {
  const anomalies: number[] = [];
  const expectAt = (h: number) => m.t_valley_dawn - (LAPSE_RATE * (h - valleyElev)) / 1000;
  if (Number.isFinite(m.t925) && LEVEL_HEIGHTS.p925 > valleyElev + 80) {
    anomalies.push(m.t925 - expectAt(LEVEL_HEIGHTS.p925));
  }
  if (Number.isFinite(m.t850) && LEVEL_HEIGHTS.p850 > valleyElev + 80) {
    anomalies.push(m.t850 - expectAt(LEVEL_HEIGHTS.p850));
  }
  if (anomalies.length === 0) return { strength: 'None', anomaly: 0 };
  const anomaly = Math.max(...anomalies);
  const strength = anomaly >= 3 ? 'Strong' : anomaly >= 1 ? 'Moderate' : anomaly >= -1 ? 'Weak' : 'None';
  return { strength, anomaly: +anomaly.toFixed(1) };
}

/** LCL từ THUNG LŨNG → đáy mây ASL (m). */
export function computeCloudBase(m: DayModelData, valleyElev: number): number {
  const spread = Math.max(0, m.t_valley_dawn - m.td_valley_dawn);
  return Math.round(valleyElev + 125 * spread);
}

/**
 * Ước tính mặt trên biển mây (cloud top, ASL) từ profile ẩm các tầng.
 * Trả null nếu mô hình không nhìn thấy mây tầng thấp (không có biển mây).
 */
export function estimateCloudTop(m: DayModelData, valleyElev: number): number | null {
  if (m.cloud_low_dawn < 15) return null;
  const base = computeCloudBase(m, valleyElev);
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
  return Math.max(top, base + 100);
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
  if (wind850 < 10) return { level: 'Low', impact: 0, detail: `${wind850}km/h — lặng, mây tĩnh` };
  if (wind850 < 15) return { level: 'Medium', impact: wind850, detail: `${wind850}km/h — mây luồn đẹp` };
  if (wind850 <= 20) return { level: 'High', impact: wind850, detail: `${wind850}km/h — mây bị đẩy mạnh` };
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
export function sunriseColorPotential(m: DayModelData): number {
  const c = Math.max(m.cloud_mid_dawn * 0.7, m.cloud_high_dawn);
  if (c >= 15 && c <= 55) return Math.round(95 - Math.abs(c - 35));
  if (c < 15) return 45;   // trời trong — bình minh sạch nhưng màu nhạt
  if (c <= 75) return 30;
  return 10;               // trời phủ kín — mất bình minh
}

// ---------------------------------------------------------- mùa (Module 7) ----

export function seasonAdjust(dateStr: string): { delta: number; label: string; warnings: string[] } {
  const month = parseInt(dateStr.slice(5, 7), 10);
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

const STATUS_TEXT: Record<StatusCode, string> = {
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
  const wind = assessWind(m.wind850_dawn_max, ctx.zone);
  const top = estimateCloudTop(m, ctx.valleyElevation);
  const spread = m.t_valley_dawn - m.td_valley_dawn;
  const seaRH = ctx.valleyElevation < 900 ? m.rh925 : m.rh850;

  let score = 0;
  const add = (delta: number, why: string) => { score += delta; reasons.push(`${delta >= 0 ? '+' : ''}${Math.round(delta)} · ${why}`); };

  add(m.cloud_low_dawn * 0.45, `Mây tầng thấp bình minh ${m.cloud_low_dawn}% (mô hình "nhìn thấy" biển mây)`);
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

  if (wind.level === 'Medium') add(-6, `Gió 850hPa: ${wind.detail}`);
  else if (wind.level === 'High') add(-14, `Gió 850hPa: ${wind.detail}`);
  else if (wind.level === 'Destructive') add(-28, `Gió 850hPa: ${wind.detail}`);
  else reasons.push(`±0 · Gió 850hPa: ${wind.detail}`);

  if (m.cloud_high_night >= 60) add(-15, `Mây cao che ${m.cloud_high_night}% ban đêm — chặn bức xạ, khó hình thành nghịch nhiệt`);
  else if (m.cloud_high_night >= 30) add(-7, `Mây cao ban đêm ${m.cloud_high_night}% — bức xạ giảm một phần`);

  if (m.precip_dawn > 1.5) add(-25, `Mưa sáng sớm ${m.precip_dawn}mm`);
  else if (m.precip_dawn > 0.3) add(-8, `Mưa phùn sáng sớm ${m.precip_dawn}mm`);
  if (m.precip_night > 8) add(-15, `Mưa đêm lớn ${m.precip_night}mm`);

  const season = seasonAdjust(dateStr);
  if (season.delta !== 0) add(season.delta, `Hiệu chỉnh mùa: ${season.label}`);

  score = Math.round(Math.max(0, Math.min(100, score)));

  // Cây quyết định trạng thái (Module 3/4/5/6 gộp, thứ tự ưu tiên từ chặn-đứng → chi tiết)
  let status: StatusCode;
  const deltaH = top !== null ? ctx.observerAlt - top : null;
  const deepOvercast = Number.isFinite(m.rh700) && m.rh700 >= 85 && m.cloud_mid_dawn >= 70;
  if (m.precip_dawn > 1.5 || m.precip_night > 8) status = 'RAIN';
  else if (wind.level === 'Destructive') status = 'DISSIPATING';
  else if (deepOvercast) status = 'FOG';
  else if (top === null) status = 'CLEAR';
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
  for (const [st, c] of counts) if (c > best) { best = c; status = st; }
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
  const season = seasonAdjust(day.date);
  const colorPotential = sunriseColorPotential(rep);

  const moisture: TechnicalIndices['moisture_type'] =
    Number.isFinite(rep.rh850) ? (rep.rh850 >= 80 ? 'Deep' : rep.rh850 <= 60 ? 'Shallow' : (rep.rh700 >= 70 ? 'Deep' : 'Shallow')) : 'Unknown';

  const warnings: string[] = [...season.warnings];
  if (wind.level === 'Destructive') warnings.push(`Gió tầng 1.500m tới ${rep.wind850_dawn_max}km/h — nguy hiểm khi đứng sống núi/mỏm đá.`);
  if (combined.status === 'RAIN') warnings.push('Có mưa trong khung giờ săn mây — đường trơn, vách đá nguy hiểm.');

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
    .filter(o => o.forecast.score >= 60)
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
