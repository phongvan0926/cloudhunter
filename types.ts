export interface WeatherInput {
  locationName: string;
  startDate: string;
  endDate: string;
  observerAlt?: number;
  lat?: number;
  lon?: number;
  model?: string;
}

export interface SunTimes {
  sunrise: string;
  sunset: string;
  goldenHourMorning: string;
  goldenHourEvening: string;
  solarElevationMaxDeg?: number;
}

// Chất lượng dữ liệu từng ngày — KHÔNG BAO GIỜ hiển thị số bịa:
// FORECAST  = trong phạm vi dự báo tin cậy (≤3 ngày tới)
// UNCERTAIN = có dữ liệu mô hình nhưng xa (4-15 ngày), độ tin cậy giảm dần
// NO_DATA   = ngoài phạm vi dữ liệu — không có con số nào, chỉ UNKNOWN
export type DataQuality = 'FORECAST' | 'UNCERTAIN' | 'NO_DATA';

export type StatusCode =
  | 'STATIC' | 'FLOWING' | 'CLEAR' | 'FOG' | 'DISSIPATING'
  | 'FLUCTUATING' | 'ROLLING' | 'RAIN' | 'UNKNOWN';

export interface TechnicalIndices {
  T_surf?: string;       // nhiệt độ tại vị trí đứng (giờ vàng sáng)
  Td_surf?: string;
  T_850?: string;
  T_700?: string;
  T_valley?: string;     // nhiệt độ đáy thung lũng — nơi biển mây hình thành
  Td_valley?: string;
  LCL_base: string;      // đáy mây tính từ THUNG LŨNG (ASL), vd "1650m"
  FSI_score: number;
  cloud_top_estimated: string; // vd "1900m (±200m)" hoặc "N/A"
  cloud_top_m?: number | null; // giá trị số để tính ΔH động trên UI
  delta_h?: number | null;     // observerAlt - cloud_top
  cloud_low_pct?: number;      // % mây tầng thấp bình minh (chính là biển mây trong mô hình)
  cloud_high_night_pct?: number; // % mây cao ban đêm (chặn bức xạ)
  rh850_pct?: number;
  precip_night_mm?: number;
  precip_dawn_mm?: number;
  wind_impact_level: 'Low' | 'Medium' | 'High' | 'Destructive' | 'Unknown';
  wind_detail?: string;
  moisture_type: 'Deep' | 'Shallow' | 'Unknown';
  inversion_strength?: 'Strong' | 'Moderate' | 'Weak' | 'None' | 'Unknown';
  inversion_height_m?: number | null; // độ cao tầng nghịch nhiệt cực đại (geopotential thật nếu có)
  boundary_status?: string;
  vrii_score?: number;
  vrii_label?: 'Excellent' | 'Favorable' | 'Moderate' | 'Poor';
}

/**
 * Mây theo TẦNG ÁP SUẤT × GIỜ (12h hôm trước → 12h ngày dự báo) cho biểu đồ
 * time × altitude — dữ liệu thật từ 1 mô hình (model có nhiều tầng nhất).
 */
export interface HourlyLevelProfile {
  model: string;                                       // id mô hình nguồn
  times: string[];                                     // ISO giờ địa phương (ICT)
  levels: { p: number; h: number; hReal: boolean }[];  // tăng dần theo độ cao; hReal = geopotential thật
  cc: (number | null)[][];                             // [tầng][giờ] % mây; null = thiếu, không bịa
}

/**
 * Độ bất định THẬT từ tổ hợp 51 kịch bản ECMWF (ensemble) — mỗi kịch bản là một lần
 * chạy mô hình với nhiễu ban đầu khác nhau; % kịch bản đồng ý = xác suất có cơ sở vật lý.
 */
export interface EnsembleDay {
  members: number;      // số kịch bản có dữ liệu (tối đa 51)
  probCloudSea: number; // % kịch bản có mây thấp bình minh ≥40%
  probRain: number;     // % kịch bản có mưa >0.3mm trong khung 4-9h
  p10: number;          // phân vị 10 của % mây thấp bình minh
  p50: number;
  p90: number;
}

export interface WeatherAnalysis {
  general: string;
  cloud_behavior: string;
  topography_effect: string;
  risk_factors?: string;
}

export interface DailyForecast {
  date: string;
  dayOfWeek?: string;
  score: number;
  status_code: StatusCode;
  status_text: string;
  data_quality: DataQuality;
  reliability_note?: string;    // vd "Dự báo xa 9 ngày — chỉ mang tính xu hướng"
  reasons?: string[];           // "Vì sao điểm này" — engine ghi từng yếu tố cộng/trừ
  sunrise_color_potential?: number; // 0-100: tiềm năng "cháy mây" bình minh cho nhiếp ảnh
  golden_hours?: string;
  sun_times?: SunTimes;
  recommended_position?: string;
  hourly_profile?: HourlyLevelProfile; // biểu đồ mây theo độ cao (dữ liệu thật, có thể thiếu)
  ensemble?: EnsembleDay;              // 51 kịch bản ECMWF (best-effort, thiếu thì ẩn)
  technical_indices: TechnicalIndices;
  weather_analysis: WeatherAnalysis;
  expert_advice: string;
  weather_summary: {
    temp: string;
    humidity: string;
    wind: string;
    pressure?: string;
  };
}

export interface TerrainPoint {
  label: string;
  altitude: number;
  type: 'VALLEY' | 'SLOPE' | 'PEAK' | 'RIDGE';
  description?: string;
}

export interface TerrainAnalysis {
  // HARDCODED = thư viện đã xác thực; DEM = ước tính từ mô hình độ cao số (dữ liệu thật,
  // độ phân giải thô); RESEARCHED = giá trị cũ (không còn dùng cho dữ liệu mới)
  source?: 'HARDCODED' | 'DEM' | 'RESEARCHED';
  summary: string;
  cloud_trap_potential: 'High' | 'Medium' | 'Low';
  zone_classification?: string;
  topographic_notes?: string;
  elevation_profile: TerrainPoint[];
}

export interface LocationAnalysis {
  name: string;
  province: string;
  estimated_elevation: number;
  description: string;
  is_known_peak: boolean;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  suggested_observer_alt: number;
  lat?: number;
  lon?: number;
  // DB = thư viện núi đã xác thực; GEOCODE = Open-Meteo Geocoding (tọa độ thật);
  // AI = AI ước tính (kém tin cậy nhất, chỉ là phương án cuối)
  source?: 'DB' | 'GEOCODE' | 'AI';
}

// Đồng thuận THẬT giữa các mô hình dự báo — tính từ dữ liệu từng mô hình, không phải hằng số
export interface ModelConsensus {
  models: string[];        // vd ["ECMWF IFS", "GFS", "ICON"]
  agreementPct: number;    // % ngày các mô hình thống nhất về trạng thái
  scoreSpread: number;     // chênh lệch điểm lớn nhất giữa các mô hình (trung bình các ngày)
  note: string;
}

export interface WeatherDataSource {
  locationName: string;
  lat?: number;
  lon?: number;
  elevation?: number;
  valleyElevation?: number;
  source: string;
  models_compared?: string[];
}

export interface CloudAnalysis {
  locationName: string;
  province?: string;
  elevation?: number;
  zoneType?: string;
  overallScore?: number;
  overallStrategy: string;
  seasonalContext?: string;
  dataReliability?: 'HIGH' | 'MEDIUM' | 'LOW';
  consensus?: ModelConsensus;  // đồng thuận thật; không có = không hiển thị
  bestDays: string[];
  dailyForecasts: DailyForecast[];
  goldenTips?: string[];
  gearChecklist: string[];
  safetyWarnings?: string[];
  terrain_analysis: TerrainAnalysis;
  sources?: { title: string; uri: string }[];
  weather_data_source?: WeatherDataSource;
  modelUsed?: string;
  modelRequested?: string;     // model người dùng chọn (có thể khác modelUsed nếu fallback)
  modelFallbackNote?: string;  // giải thích trung thực vì sao phải đổi model
  aiNarrative?: boolean;   // false = AI không phản hồi, phần lời bình là văn bản do engine sinh
  engineVersion?: string;
}

export interface PeakPreset {
  name: string;
  altitude: number;
  province: string;
  elevation_profile?: TerrainPoint[];
  aliases?: string[];
}
