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

// Đổi số này MỖI KHI hành vi chấm điểm đổi: nó là khoá cache xếp hạng (bản cũ tự hết
// hiệu lực) và là nhãn đóng vào bản chụp dự báo — quên đổi thì vòng kiểm chứng không
// phân biệt được số của luật nào. Đã quên một lần ở engine-2.8b.
export const ENGINE_VERSION = 'engine-2.8.2';

/**
 * "ĐÁNG ĐI" — engine-2.8 (03/09/2026): KHÔNG còn là ngưỡng điểm.
 *
 * Trước đây: đáng đi ⇔ score ≥ 60. Đo trên 6 ngày kiểm chứng CÓ biển mây: app khuyên đi
 * 0/6 — kể cả những hôm chính engine nói "biển mây tĩnh, thảm mây phẳng, bạn đứng trên mặt
 * mây" (23/8: 35 STATIC, 24/8: 35 FLUCTUATING, 25/8: 32 FLUCTUATING). Điểm đo "nguyên liệu
 * sương bức xạ có sách vở không" (T−Td ≈ 0, trời quang đêm, không mưa); còn biển mây mùa mưa
 * hình thành nhờ nạp ẩm + nắp nghịch nhiệt, nên điểm thấp mãi dù kết luận đúng. Ngưỡng điểm
 * đạt tỉ lệ báo nhầm hoàn hảo bằng cách KHÔNG BAO GIỜ khuyên đi.
 *
 * Nay: đáng đi ⇔ kết luận CÓ biển mây (verdict SEA) + đủ mô hình đồng thuận + người đứng
 * TRÊN mặt mây (ΔH > 0). Không có hằng số nào phải bịa ngoài mức đồng thuận. Điểm chỉ còn
 * dùng để XẾP THỨ TỰ giữa các ngày/điểm cùng đáng đi, và để tô màu.
 *
 * Cái giá đã nói rõ với người dùng: app sẽ khuyên đi nhiều hơn hẳn, và tỉ lệ báo nhầm CHƯA
 * đo được (chưa có mẫu âm tính kiểm chứng tại chỗ). Người dùng chốt phương án này 03/09/2026.
 */
export const WORTH_GOING_AGREEMENT = 50;   // % mô hình cùng kết luận SEA, tối thiểu
/** Ngưỡng điểm CŨ — nay chỉ để tô màu badge/ô ngày, KHÔNG quyết định "đáng đi". */
export const WORTH_GOING_SCORE = 60;

/**
 * Người đứng phải cao hơn mặt mây ÍT NHẤT ngần này mới khuyên đi (engine-2.8.2, 09/09/2026,
 * người dùng chốt 100m).
 *
 * Đo trên 96 cặp (dự báo × sự thật) bằng scripts/sweep-deltah.ts, quét 0→500m: KHÔNG có
 * ngưỡng nào trong khoảng đó làm mất một ngày thật nào. Mọi ngày đã xác nhận có biển mây đều
 * có ΔH ≥ 503m; những ngày thật còn lại nằm SÂU DƯỚI mây (−488…−1107m) và đã bị nhãn FOG loại.
 * Báo nhầm giảm dần 15 → 11 khi siết từ 0 lên 500m.
 *
 * Vậy sao không lấy luôn 500m? Vì ΔH ≤ (chỗ đứng − đáy thung lũng): mặt mây không bao giờ
 * nằm dưới đáy. Đo cả thư viện: 6/56 điểm có chênh cao < 250m và 18/56 < 500m (Linh Quy Pháp
 * Ấn 121m, Đồi chè Cầu Đất 150m, Măng Đen 169m…). Ngưỡng lớn không "chính xác hơn", nó XOÁ
 * SỔ vĩnh viễn cả một nhóm điểm địa hình thoải, bất kể thời tiết. 100m chỉ chạm 1 điểm duy
 * nhất (Làng Nhì, chênh 5m — vốn đã bị rào MIN_GAP_M loại).
 *
 * Đừng tưởng đây là dụng cụ chính xác: so bản chụp dự báo tối hôm trước với chính engine tính
 * lại ngày đó sau, ΔH lệch TRUNG VỊ 207m (30/55 ca lệch > 100m). Ngưỡng này để chặn kiểu "app
 * bảo bạn đứng trên mặt mây 5m", không phải để tinh chỉnh theo bước 10-50m.
 *
 * Bằng chứng dương hiện chỉ có 4 ngày, 3 trong đó cùng một điểm (Tà Xùa) — chưa đủ để nói
 * ngưỡng nào trong 50-250m tốt hơn. Có thêm báo cáo thực địa thì quét lại trước khi động vào.
 */
export const WORTH_GOING_DELTA_H = 100;

export interface WorthGoingInput { status: StatusCode; agreement: number; deltaH: number | null }
export function isWorthGoing(x: WorthGoingInput): boolean {
  if (verdictOf(x.status) !== 'SEA') return false;
  if (x.agreement < WORTH_GOING_AGREEMENT) return false;
  // Không biết ΔH (không ước được mặt mây) thì KHÔNG khuyên — im lặng còn hơn đoán.
  // Ca +5m nguy hiểm (Fansipan 07/09) đã bị chặn từ engine-2.8b bằng BẰNG CHỨNG TRỰC TIẾP
  // (observerInCloud: "mực ngang chỗ đứng có mây không"); biên 100m là lớp chặn thứ hai cho
  // những ca mà mực áp suất gần chỗ đứng không nói lên điều gì.
  return x.deltaH !== null && x.deltaH > WORTH_GOING_DELTA_H;
}

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
  height: number | null;        // m ASL của NẮP đáng tin — null khi không xác định được
  anomalyHeight: number | null; // m ASL của tầng anomaly cực đại (chỉ để chẩn đoán)
  ramp: boolean;                // anomaly chỉ TĂNG ĐỀU tới mép cửa sổ → không có đỉnh thật
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
  if (samples.length === 0) {
    return { strength: 'None', anomaly: 0, height: null, anomalyHeight: null, ramp: false };
  }
  const best = samples.reduce((a, b) => (b.a > a.a ? b : a));
  const anomaly = best.a;
  const strength = anomaly >= 3 ? 'Strong' : anomaly >= 1 ? 'Moderate' : anomaly >= -1 ? 'Weak' : 'None';

  // "DỐC" thay vì "ĐỈNH" — xem chú thích capLayerBase. Khi anomaly chỉ tăng đều lên tới mực
  // cao nhất của cửa sổ thì không hề có đỉnh nghịch nhiệt; con số best.h chỉ là mép cửa sổ.
  // Cần ≥3 mực mới kết luận được là "dốc": với 1-2 mực thì tăng đơn điệu là chuyện đương nhiên.
  const byH = [...samples].sort((a, b) => a.h - b.h);
  const ramp = byH.length >= 3 && byH.every((s, i) => i === 0 || s.a > byH[i - 1].a);

  const height = ramp
    ? capLayerBase(m, valleyElev)                       // không có đỉnh → tìm tầng ổn định cục bộ
    : (strength === 'Strong' || strength === 'Moderate') ? Math.round(best.h) : null;
  return { strength, anomaly: +anomaly.toFixed(1), height, anomalyHeight: Math.round(best.h), ramp };
}

/**
 * ĐÁY NẮP CHẶN — mực thấp nhất (từ đáy mây trở lên) mà ngay phía trên nó khí quyển ổn định
 * bất thường. Dùng khi phép đo anomaly không cho ra đỉnh nào (xem `ramp`).
 *
 * Vì sao phải có (lỗi thật, Tà Xùa 27/8/2026): anomaly được đo so với suy giảm chuẩn
 * 6,5°C/km TÍNH TỪ ĐÁY THUNG LŨNG, nên nó CỘNG DỒN theo độ cao. Trong cột khí ẩm mùa mưa
 * (suy giảm thực ~5°C/km suốt cột) anomaly tăng đơn điệu và "tầng cực đại" luôn rơi vào mực
 * CAO NHẤT của cửa sổ quét — dù chẳng có nắp nào. Đo trên 120 ca (50 điểm × 3 mô hình ×
 * 4 ngày): **94% số ca có height đúng bằng mực cao nhất trong cửa sổ**, và 86% số ca được
 * chấm Strong/Moderate. Tức là trước đây "độ cao nghịch nhiệt" là trần cửa sổ quét chứ không
 * phải một phép đo, và capByInversion kẹp đỉnh mây ở sai chỗ.
 *
 * Ngưỡng: đoạn nhiệt ẩm ở nền nhiệt Tây Bắc mùa hè ~5°C/km, nên Γ ≤ 3,5°C/km là ổn định
 * HƠN HẲN nền chung — đó mới đáng gọi là nắp. Không tìm thấy thì trả null (KHÔNG bịa số).
 */
export const CAP_LAPSE_RATE = 3.5;

export function capLayerBase(m: DayModelData, valleyElev: number): number | null {
  const prof = (m.levels ?? [])
    .filter(l => Number.isFinite(l.t) && l.h > valleyElev)
    .sort((a, b) => a.h - b.h);
  if (prof.length < 2) return null;
  const base = computeCloudBase(m, valleyElev);
  const ceiling = Math.max(2600, valleyElev + 1300);
  for (let i = 0; i + 1 < prof.length; i++) {
    if (prof[i].h > ceiling) break;
    if (prof[i].h < base - 100) continue;   // nắp không thể nằm dưới đáy mây
    const lapse = (prof[i].t - prof[i + 1].t) / (prof[i + 1].h - prof[i].h) * 1000;
    if (lapse <= CAP_LAPSE_RATE) return Math.round(prof[i].h);
  }
  return null;
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

/**
 * ẨM CỦA CHÍNH LỚP BIỂN MÂY — lấy ở mực gần ngay trên ĐÁY MÂY, dùng geopotential thật.
 *
 * Lỗi cũ (Suôi Thầu 25/8/2026): mực xác nhận được chọn theo độ cao ĐÁY THUNG LŨNG —
 * đáy < 900m thì luôn dùng 925hPa ≈ 760m. Thảo nguyên Suôi Thầu có đáy 274m và đáy mây
 * ~440m, nên lớp sương chỉ dày tới ~700-950m; đo RH ở 760m là đo gần ĐỈNH lớp mây, và
 * với thung lũng nông hơn nữa thì đo hẳn không khí BÊN TRÊN nó. Điều kiện xác nhận vì
 * thế chỉ có thể bác bỏ, không bao giờ khẳng định được.
 */
export function seaLayerRH(m: DayModelData, valleyElev: number): number {
  const target = computeCloudBase(m, valleyElev) + 100;
  const cands = (m.levels ?? []).filter(l => Number.isFinite(l.rh) && l.h > valleyElev);
  if (cands.length > 0) {
    const best = cands.reduce((a, b) => (Math.abs(a.h - target) <= Math.abs(b.h - target) ? a : b));
    return best.rh;
  }
  return valleyElev < 900 ? m.rh925 : valleyElev < 1700 ? m.rh850 : m.rh700;
}

/**
 * LỚP MÂY BÁM GỐC THUNG LŨNG — bộ dò thứ BA, và là bộ mạnh nhất vì nó dùng đúng thứ dữ
 * liệu mà engine đã tin ở mọi chỗ khác: profile mây/ẩm theo từng mực áp suất.
 *
 * Vì sao cần (Suôi Thầu 25/8/2026 — ngày người dùng thấy biển mây thật):
 * cả GFS, ICON và UKMO đều cho RH 80-85% liên tục từ 250m lên 950m rồi RỚT xuống 64-72%
 * tại 1.441m. Tức là chính các mô hình đó đang mô tả một lớp ẩm dày ~700m nằm gọn DƯỚI
 * chỗ đứng 1.200m — đúng định nghĩa biển mây. Nhưng engine không bao giờ đọc tới đó: cổng
 * vào chỉ hỏi `cloud_cover_low` (0%) và T−Td tại 2m (1,3-2,6°C) rồi trả null → trạng thái
 * CLEAR. Nghịch lý lộ liễu: cùng lúc ấy engine vẫn cộng +18 nghịch nhiệt mạnh và +12
 * "thung lũng cận bão hoà" — cộng điểm cho nguyên liệu rồi kết luận không có mây.
 *
 * "Bám gốc" là điều kiện then chốt: lớp ẩm phải BẮT ĐẦU sát đáy thung lũng. Một lớp ẩm
 * ở 3.100m (ICON hôm đó cho RH 94% ở 700hPa) là mây tầng cao, không phải biển mây.
 */
export function rootedLowLayer(m: DayModelData, valleyElev: number): { rooted: boolean; top: number | null } {
  const profile = (m.levels ?? []).filter(l => l.h > valleyElev).sort((a, b) => a.h - b.h);
  if (profile.length === 0) return { rooted: false, top: null };
  const isCloudy = (l: { rh: number; cc: number }) =>
    (Number.isFinite(l.cc) && l.cc >= 45) || (Number.isFinite(l.rh) && l.rh >= 80);
  const first = profile.findIndex(isCloudy);
  if (first < 0) return { rooted: false, top: null };
  const base = computeCloudBase(m, valleyElev);
  // Mực có mây thấp nhất phải nằm quanh đáy mây ước tính, chứ không lơ lửng trên cao.
  if (profile[first].h > Math.max(base + 300, valleyElev + 500)) return { rooted: false, top: null };
  let i = first, top = profile[first].h;
  while (i < profile.length && isCloudy(profile[i])) { top = profile[i].h; i++; }
  return { rooted: true, top };
}

export function valleySaturation(m: DayModelData, valleyElev: number): SaturationSignal {
  const spread = m.t_valley_dawn - m.td_valley_dawn;
  const seaRH = seaLayerRH(m, valleyElev);
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
  // inv.height nay ĐÃ là "nắp đáng tin": hoặc đỉnh anomaly thật, hoặc tầng ổn định cục bộ.
  // Cổng `strength` đã chuyển vào computeInversion (đỉnh yếu → height = null).
  if (inv.height === null) return top;
  if (inv.height <= base + 100) return top;      // nắp quá sát đáy mây → không tin
  // CHỈ can thiệp khi ước lượng vượt HẲN nắp (>300m). Vượt chút ít là phần đệm bình thường
  // của phép ước lượng; vượt cả cây số nghĩa là đã gộp nhầm một tầng mây khác vào lớp thấp.
  if (top <= inv.height + 300) return top;
  return inv.height;
}

export function estimateCloudTop(m: DayModelData, valleyElev: number): number | null {
  // Cổng cloud_cover_low một mình từng làm engine trả "CLEAR" cho ngày thung lũng bão hoà
  // (AIFS 23/8/2026 báo mây thấp 7% giữa lúc RH 99%) → nhận thêm tín hiệu bão hoà.
  if (m.cloud_low_dawn < 15
      && !valleySaturation(m, valleyElev).saturated
      && !rootedLowLayer(m, valleyElev).rooted) return null;
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

/**
 * MÂY ĐỘI ĐỈNH — mây do NÂNG ĐỊA HÌNH sinh ra ngay tại đỉnh, trong khi thung lũng bên dưới
 * quang. KHÔNG phải biển mây, và cũng không phải "trời quang".
 *
 * Ca thật, Fansipan 02/09/2026: thung lũng 1.900m khô (T−Td 3-6°C, mây thấp 0-15%) nên engine
 * kết luận đúng "không có biển mây" — rồi dán nhãn `CLEAR` "Trời quang, không có biển mây".
 * Thực tế đỉnh bị mây mù bao trùm cả buổi sáng. Cả 6 mô hình đều cho RH 73-93% ngay tại mực
 * ~3.136m, tức ĐÚNG cao độ người đứng; engine chưa bao giờ hỏi "chỗ tôi đứng có mây không"
 * vì nó chỉ đi tìm lớp mây bám gốc thung lũng.
 *
 * Cách nhận: khối khí ngang đỉnh cần được nâng thêm `LCL` mét nữa mới ngưng tụ; ngọn núi tự
 * nó nâng khối khí lên khi gió thổi qua. Nếu lượng nâng ĐỦ thì đỉnh chìm trong mây.
 *   · LCL trên đầu ≈ 125 × (T − Td), với T − Td ≈ (100 − RH)/5 khi RH > 50% ⇒ 25 × (100 − RH) m.
 *   · Lượng nâng khả dụng ≈ MỘT NỬA chênh cao đỉnh−đáy (dòng khí ổn định bị chặn một phần,
 *     không vượt trọn chiều cao vật cản), chặn trên ở 600m (cao hơn nữa thì gió vòng qua chứ
 *     không trèo lên). Nhờ vậy ngưỡng TỰ CO GIÃN: đỉnh nhô 1.200m khắt khe khác đồi nhô 300m,
 *     và RH lạnh khác RH ấm — không phải một con số RH cứng.
 *
 * Bộ dò này CHỈ được đổi CLEAR → FOG, không bao giờ làm app lạc quan hơn. Đo trên 287 ca
 * (50 điểm × 3 mô hình × 3 ngày): bật ở 18% số ca, đổi kết luận ở 14% số ca đang là CLEAR.
 */
export const SUMMIT_LIFT_FRACTION = 0.5;
export const SUMMIT_LIFT_CAP = 600;

/** Mực áp suất gần cao độ người đứng nhất (trong ±dist mét). */
function levelAtObserver(m: DayModelData, ctx: DayContext, dist = 400): { h: number; rh: number; cc: number } | null {
  let best: { h: number; rh: number; cc: number } | null = null;
  for (const l of m.levels ?? []) {
    if (!Number.isFinite(l.rh)) continue;
    if (Math.abs(l.h - ctx.observerAlt) > dist) continue;
    if (!best || Math.abs(l.h - ctx.observerAlt) < Math.abs(best.h - ctx.observerAlt)) {
      best = { h: l.h, rh: l.rh, cc: l.cc };
    }
  }
  return best;
}

/**
 * ĐO THẲNG "chỗ tôi đứng có mây không", thay vì chỉ suy từ đỉnh mây ước tính.
 *
 * Vì sao cần (đo trên 96 cặp dự báo × sự thật, 07/09/2026): 11/17 ca báo nhầm là kiểu vệ tinh
 * trả FOGGED_IN — đỉnh mây nằm TRÊN đầu người đứng — trong khi app nói "bạn đứng trên biển
 * mây". Engine so chỗ đứng với MẶT BIỂN MÂY THẤP nhưng không bao giờ hỏi người đó có đang nằm
 * trong một TẦNG MÂY KHÁC ngay tại cao độ của mình hay không. Fansipan 07/09: mực 3.138m có
 * RH 88-100%, mây 35-100%; người đứng 3.143m ở giữa đám đó.
 *
 * Số đọc TRỰC TIẾP phải thắng số SUY RA: đỉnh mây là ước lượng (±200m), còn "mực này có mây"
 * là mô hình nói thẳng. Cổng này chỉ làm app bi quan hơn, không có đường nào ngược lại.
 */
export function observerInCloud(m: DayModelData, ctx: DayContext): boolean {
  const lv = levelAtObserver(m, ctx, 250);
  if (!lv) return false;
  return (Number.isFinite(lv.cc) && lv.cc >= 45) || (Number.isFinite(lv.rh) && lv.rh >= 90);
}

export function summitCloud(m: DayModelData, ctx: DayContext): {
  inCloud: boolean; lclAbove: number | null; lift: number; rh: number | null;
} {
  const lift = Math.min(SUMMIT_LIFT_CAP,
    SUMMIT_LIFT_FRACTION * Math.max(0, ctx.observerAlt - ctx.valleyElevation));
  let best: { h: number; rh: number } | null = null;
  for (const l of m.levels ?? []) {
    if (!Number.isFinite(l.rh)) continue;
    if (Math.abs(l.h - ctx.observerAlt) > 400) continue;   // quá xa thì không nói được gì
    if (!best || Math.abs(l.h - ctx.observerAlt) < Math.abs(best.h - ctx.observerAlt)) {
      best = { h: l.h, rh: l.rh };
    }
  }
  if (!best) return { inCloud: false, lclAbove: null, lift, rh: null };
  const lclAbove = 25 * (100 - best.rh);
  return { inCloud: lclAbove <= lift, lclAbove: Math.round(lclAbove), lift, rh: best.rh };
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
  // Ẩm "lớp biển mây" phải đo Ở CHÍNH LỚP MÂY — xem seaLayerRH.
  const seaRH = seaLayerRH(m, ctx.valleyElevation);
  const sat = valleySaturation(m, ctx.valleyElevation);
  const rooted = rootedLowLayer(m, ctx.valleyElevation);
  // "Chữ ký biển mây": có lớp mây bám gốc thung lũng + có nắp nghịch nhiệt + người đứng CAO
  // HƠN MẶT MÂY. Đây là định nghĩa vật lý của biển mây; khi cả ba có mặt thì các hình phạt
  // gián tiếp (mây cao ban đêm, mưa, hiệu chỉnh mùa) không được phép xoá kết luận — chúng
  // chỉ còn ý nghĩa "đi có sướng không".
  //
  // Hai chỗ sửa ngày 25/8/2026:
  //  · KHÔNG còn nhận lớp biên đêm mỏng thay cho nghịch nhiệt. boundary_layer_height chỉ GFS
  //    có, và đo trên toàn thư viện thì 92% số ca của GFS nằm dưới 200m — điều kiện gần như
  //    luôn đúng, nên nó không "thay thế" nghịch nhiệt mà chỉ xoá bỏ yêu cầu đó, RIÊNG cho GFS.
  //  · Điều kiện độ cao so với ĐÁY mây (nay đổi thành MẶT mây khi biết) — chú thích vẫn ghi
  //    "cao hơn mặt mây" trong khi code so với đáy, tức là dễ dãi hơn hẳn ý định.
  const seaSignature = (sat.saturated || rooted.rooted)
    && (inv.strength === 'Strong' || inv.strength === 'Moderate')
    && ctx.observerAlt >= computeCloudBase(m, ctx.valleyElevation) + 300
    && (top === null || ctx.observerAlt >= top);

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

  // Lớp biên đêm (boundary layer height) — CHỈ GFS cung cấp, và đó chính là vấn đề.
  // Đo trên toàn thư viện ngày 25/8/2026: 46/50 ca của GFS có BLH ≤ 200m (trung vị 15m),
  // trong khi ICON và UKMO không có biến này ở bất kỳ ca nào. Phần thưởng +8 vì thế không
  // phân biệt được ngày tốt với ngày xấu — nó chỉ cộng thêm 8 điểm cho RIÊNG GFS trong hầu
  // hết mọi so sánh, tức là làm lệch chính cái bảng "mô hình nào đúng hơn" mà app đang dùng
  // để tự hiệu chuẩn. Đã bỏ phần thưởng; GIỮ phần phạt vì nó hiếm (0/50 ca) nên khi bật thì
  // thực sự có nghĩa: lớp biên dày ban đêm = khí quyển xáo trộn.
  const blh = m.blh_night_min;
  if (blh !== undefined && Number.isFinite(blh) && blh >= 1200) {
    add(-5, `Lớp biên đêm dày (${Math.round(blh)}m) — khí quyển xáo trộn, khó giữ mây trong thung lũng`);
  }

  if (wind.level === 'Medium') add(-6, `Gió ${windLevel}: ${wind.detail}`);
  else if (wind.level === 'High') add(-14, `Gió ${windLevel}: ${wind.detail}`);
  else if (wind.level === 'Destructive') add(-28, `Gió ${windLevel}: ${wind.detail}`);
  else reasons.push(`±0 · Gió ${windLevel}: ${wind.detail}` + (seaCapped ? ' — gió trên nắp nghịch nhiệt không với xuống được' : ''));

  // Mây cao ban đêm chỉ là BIẾN THAY THẾ để đoán "sẽ không có nghịch nhiệt". Nếu mô hình đã
  // nói thẳng nghịch nhiệt CÓ (hoặc lớp biên đêm mỏng dính) thì phỏng đoán đó đã sai — trừ
  // tiếp là phạt hai lần cùng một cơ chế (Tà Xùa 23/8/2026: mây cao 100% mà nghịch nhiệt +4,6°C).
  const inversionObserved = inv.strength === 'Strong' || inv.strength === 'Moderate';
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
  else if (top === null) status = (deepOvercast || summitCloud(m, ctx).inCloud) ? 'FOG' : 'CLEAR';
  // Trước khi kết luận "đứng trên biển mây": mô hình có báo mây NGAY tại cao độ này không?
  else if (deltaH !== null && deltaH > -250 && observerInCloud(m, ctx)) status = 'FOG';
  else if (deltaH !== null && deltaH > 250) status = wind.level === 'Low' ? 'STATIC' : 'FLOWING';
  else if (deltaH !== null && deltaH >= -250) status = wind.level === 'Low' ? 'FLUCTUATING' : 'ROLLING';
  else status = 'FOG';

  // Giải thích cho người đọc VÌ SAO "không có biển mây" lại không phải "trời quang".
  if (top === null && status === 'FOG' && !deepOvercast) {
    const sc = summitCloud(m, ctx);
    if (sc.inCloud) {
      reasons.push(`±0 · Mây đội đỉnh: không khí ngang ${ctx.observerAlt}m chỉ cần nâng thêm `
        + `~${sc.lclAbove}m là ngưng tụ (RH ${Math.round(sc.rh!)}%), mà chính ngọn núi nâng được `
        + `~${Math.round(sc.lift)}m — thung lũng quang nhưng ĐỈNH nhiều khả năng chìm trong mây`);
    }
  }

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

/**
 * NHÓM KẾT LUẬN — bốn nhãn STATIC/FLOWING/FLUCTUATING/ROLLING KHÔNG phải bốn ý kiến khác
 * nhau: cả bốn đều nói CÙNG một điều — "mặt mây nằm dưới chỗ bạn đứng, có biển mây để
 * ngắm" — chỉ khác nhau ở khoảng hở và gió. Chúng không được phép cạnh tranh phiếu với
 * FOG như thể là các giả thuyết đối lập.
 */
export type Verdict = 'SEA' | 'IN_CLOUD' | 'NO_CLOUD' | 'BLOCKED';

export function verdictOf(st: StatusCode): Verdict {
  if (st === 'STATIC' || st === 'FLOWING' || st === 'FLUCTUATING' || st === 'ROLLING') return 'SEA';
  if (st === 'FOG') return 'IN_CLOUD';
  if (st === 'RAIN' || st === 'DISSIPATING') return 'BLOCKED';
  return 'NO_CLOUD';
}

const VERDICT_SEVERITY: Record<Verdict, number> = {
  BLOCKED: 3, IN_CLOUD: 2, NO_CLOUD: 1, SEA: 0,
};

export function combineModels(perModel: ModelDayScore[]): {
  score: number; status: StatusCode; cloudTop: number | null;
  agreement: number; scoreSpread: number; representative: ModelDayScore;
} {
  const scores = perModel.map(p => p.score);
  const score = median(scores);

  // BƯỚC 1 — bỏ phiếu cho KẾT LUẬN, không phải cho nhãn chi tiết.
  //
  // Lỗi thật (Tà Xùa 25/8/2026, ngày thứ BA liên tiếp người dùng thấy biển mây): 4/6 mô
  // hình đặt mặt mây dưới chỗ đứng 1.600m (1.444 · 1.087 · 1.097 · 1.448m) và 2/6 đặt lên
  // trên (1.966 · 3.509m). Tức đa số 4-2 nói CÓ biển mây. Nhưng 4 mô hình đó chia nhau hai
  // nhãn — STATIC ×2 (ΔH > 250m) và FLUCTUATING ×2 (ΔH nhỏ hơn) — nên khi đếm phiếu theo
  // nhãn thì thành hoà ba bên 2-2-2, và luật "hoà thì lấy nhãn nặng hơn" trao chiến thắng
  // cho FOG với đúng 2 phiếu. App kết luận "Mù trùm — bạn chìm trong mây" trong khi chính
  // nó tính mặt mây trung vị 1.446m, tức THẤP HƠN chỗ đứng 154m. Tự mâu thuẫn.
  const vCounts = new Map<Verdict, number>();
  for (const p of perModel) {
    const v = verdictOf(p.status);
    vCounts.set(v, (vCounts.get(v) || 0) + 1);
  }
  let verdict: Verdict = verdictOf(perModel[0].status);
  let vBest = 0;
  for (const [v, c] of vCounts) {
    // Hoà phiếu vẫn nghiêng về kết luận XẤU HƠN — thà khuyên ở nhà nhầm còn hơn bắt người
    // ta dậy từ 3h sáng leo núi. Chỉ bỏ phần "chia phiếu nội bộ làm thua oan".
    if (c > vBest || (c === vBest && VERDICT_SEVERITY[v] > VERDICT_SEVERITY[verdict])) {
      vBest = c; verdict = v;
    }
  }

  // BƯỚC 2 — trong nhóm thắng mới chọn nhãn chi tiết (mode, hoà thì lấy nhãn nặng hơn).
  const inGroup = perModel.filter(p => verdictOf(p.status) === verdict);
  const counts = new Map<StatusCode, number>();
  for (const p of inGroup) counts.set(p.status, (counts.get(p.status) || 0) + 1);
  let status: StatusCode = inGroup[0].status;
  let best = 0;
  for (const [st, c] of counts) {
    if (c > best || (c === best && STATUS_SEVERITY[st] > STATUS_SEVERITY[status])) {
      best = c; status = st;
    }
  }

  // Đồng thuận báo theo KẾT LUẬN (có biển mây hay không) chứ không theo nhãn chi tiết —
  // đó mới là con số người dùng cần để quyết định đi hay ở. Trước đây ngày 25/8 hiện
  // "đồng thuận 33%" trong khi thực chất 4/6 mô hình đồng ý là có biển mây (67%).
  const agreement = Math.round((vBest / perModel.length) * 100);
  const scoreSpread = Math.max(...scores) - Math.min(...scores);
  const representative = inGroup.reduce((a, b) =>
    Math.abs(a.score - score) <= Math.abs(b.score - score) ? a : b);
  // Mặt mây đại diện lấy từ CHÍNH NHÓM THẮNG: gộp cả đỉnh mây của mô hình bất đồng vào
  // trung vị thì ra một con số không mô tả kịch bản nào cả.
  const tops = inGroup.map(p => p.cloudTop).filter((t): t is number => t !== null);
  const cloudTop = verdict === 'NO_CLOUD' ? null : tops.length ? median(tops) : null;
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
      worth_going: isWorthGoing({ status: combined.status, agreement: combined.agreement, deltaH }),
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
    .filter(o => o.forecast.worth_going)
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
