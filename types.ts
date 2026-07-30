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

export interface TechnicalIndices {
  T_surf?: string;
  Td_surf?: string;
  T_850?: string;
  T_700?: string;
  LCL_base: string; // e.g., "200m"
  FSI_score: number;
  cloud_top_estimated: string; // e.g., "2400m"
  wind_impact_level: 'Low' | 'Medium' | 'High' | 'Destructive' | 'Unknown';
  wind_detail?: string;
  moisture_type: 'Deep' | 'Shallow' | 'Unknown';
  inversion_strength?: 'Strong' | 'Moderate' | 'Weak' | 'None' | 'Unknown';
  boundary_status?: string;
  vrii_score?: number; // Valley Radiation Inversion Index (0-100)
  vrii_label?: 'Excellent' | 'Favorable' | 'Moderate' | 'Poor';
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
  status_code: 'STATIC' | 'FLOWING' | 'CLEAR' | 'FOG' | 'DISSIPATING' | 'FLUCTUATING' | 'ROLLING' | 'UNKNOWN';
  status_text: string;
  golden_hours?: string;
  sun_times?: SunTimes;
  recommended_position?: string;
  technical_indices: TechnicalIndices; // Replaces old technical_data
  weather_analysis: WeatherAnalysis;   // New field
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
  description?: string; // Added to describe the waypoint (e.g. "Rừng hoa đỗ quyên")
}

export interface TerrainAnalysis {
  source?: 'HARDCODED' | 'RESEARCHED'; // New field to track data origin
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
}

export interface WeatherDataSource {
  locationName: string;
  lat?: number;
  lon?: number;
  elevation?: number;
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
  modelConsensusScore?: number; // 0 - 100% agreement across ECMWF, GFS, ICON
  modelSpread?: string;
  bestDays: string[]; 
  dailyForecasts: DailyForecast[];
  goldenTips?: string[];
  gearChecklist: string[];
  safetyWarnings?: string[];
  terrain_analysis: TerrainAnalysis;
  sources?: { title: string; uri: string }[];
  weather_data_source?: WeatherDataSource;
  modelUsed?: string;
}

export interface PeakPreset {
  name: string;
  altitude: number;
  province: string;
  elevation_profile?: TerrainPoint[]; // Added for static terrain consistency
  aliases?: string[]; // Added for better matching (e.g. "Bach Moc" for "Ky Quan San")
}
