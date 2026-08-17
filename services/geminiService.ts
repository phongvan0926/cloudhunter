/**
 * geminiService — phân giải địa danh + lời bình chuyên gia bằng AI.
 *
 * Phân vai (nguyên tắc "con số = code, tư vấn = AI"):
 *  - Mọi con số, điểm, trạng thái: cloudScoreEngine tính deterministic từ Open-Meteo.
 *  - AI CHỈ viết phần lời: chiến thuật tổng quan, nhận định từng ngày, tips, đồ mang theo.
 *    AI bị cấm thay đổi/bịa số; nếu AI không phản hồi, app vẫn hiển thị đầy đủ dự báo
 *    với lời bình do engine sinh (aiNarrative=false).
 *  - Phân giải địa danh: thư viện núi đã xác thực → Geocoding thật (Open-Meteo) → AI ước
 *    tính là phương án CUỐI và bị dán nhãn rõ. Không bao giờ âm thầm dùng tọa độ mặc định.
 */
import { GoogleGenAI, Type } from "@google/genai";
import { WeatherInput, CloudAnalysis, LocationAnalysis, DailyForecast, TerrainAnalysis } from "../types";
import { NORTHWEST_PEAKS } from '../constants';
import { MOUNTAIN_DB } from '../constants/mountains';
import { fetchMountainWeather, pointElevation } from './weatherService';
import {
  computeDayForecast, computeTripSummary, seasonAdjust, ENGINE_VERSION, EngineDayOutput,
} from './cloudScoreEngine';
import { discoverModels, executeWithFallback, getStoredModel, getStoredApiKey } from './modelDiscoveryService';

function getAIInstance(): GoogleGenAI {
  const apiKey = getStoredApiKey();
  return new GoogleGenAI({ apiKey });
}

function removeVietnameseTones(str: string): string {
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g,"a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g,"e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g,"i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g,"o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g,"u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g,"y");
    str = str.replace(/đ/g,"d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    return str.toLowerCase().trim();
}

export function findBestMatchingPeak(input: string) {
  const normInput = removeVietnameseTones(input);
  let bestMatch: typeof NORTHWEST_PEAKS[0] | null = null;
  let highestScore = 0;
  for (const peak of NORTHWEST_PEAKS) {
    const normName = removeVietnameseTones(peak.name);
    let score = 0;
    if (normInput === normName) score = 10000 + normName.length;
    else if (normInput.includes(normName)) score = 5000 + normName.length;
    else if (normName.includes(normInput)) score = 2000 + normInput.length;
    if (peak.aliases) {
      for (const alias of peak.aliases) {
        const normAlias = removeVietnameseTones(alias);
        if (normInput === normAlias) score = Math.max(score, 4000 + normAlias.length);
        else if (normInput.includes(normAlias)) score = Math.max(score, 1000 + normAlias.length);
        else if (normAlias.includes(normInput)) score = Math.max(score, 500 + normInput.length);
      }
    }
    if (score > highestScore) { highestScore = score; bestMatch = peak; }
  }
  return highestScore > 0 ? bestMatch : null;
}

export function findBestMatchingMountain(input: string): { key: string; info: typeof MOUNTAIN_DB[string] } | null {
  const normInput = removeVietnameseTones(input);
  let bestMatch: { key: string; info: typeof MOUNTAIN_DB[string] } | null = null;
  let highestScore = 0;
  for (const [key, mt] of Object.entries(MOUNTAIN_DB)) {
    const normName = removeVietnameseTones(mt.name);
    let score = 0;
    if (normInput === normName) score = 10000 + normName.length;
    else if (normInput.includes(normName)) score = 5000 + normName.length;
    else if (normName.includes(normInput)) score = 2000 + normInput.length;
    if (mt.aliases) {
      for (const alias of mt.aliases) {
        const normAlias = removeVietnameseTones(alias);
        if (normInput === normAlias) score = Math.max(score, 4000 + normAlias.length);
        else if (normInput.includes(normAlias)) score = Math.max(score, 1000 + normAlias.length);
        else if (normAlias.includes(normInput)) score = Math.max(score, 500 + normInput.length);
      }
    }
    if (score > highestScore) { highestScore = score; bestMatch = { key, info: mt }; }
  }
  return highestScore > 0 ? bestMatch : null;
}

// -------------------------------------------------- phân giải địa danh ----

const inVietnam = (lat: number, lon: number) => lat >= 8 && lat <= 23.6 && lon >= 102 && lon <= 110;

async function geocodeLocation(locationName: string): Promise<{
  name: string; lat: number; lon: number; elevation?: number; admin?: string;
} | null> {
  // 1) Nominatim (OpenStreetMap) — nhận diện địa danh tiếng Việt có dấu tốt nhất
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationName)}&format=json&limit=1&countrycodes=vn&accept-language=vi`;
    const res = await fetch(url);
    if (res.ok) {
      const results = await res.json();
      const r = results?.[0];
      if (r) {
        const lat = parseFloat(r.lat), lon = parseFloat(r.lon);
        if (inVietnam(lat, lon)) {
          const parts = (r.display_name || '').split(',').map((s: string) => s.trim());
          return {
            name: parts[0] || locationName,
            lat, lon,
            admin: parts.slice(-3, -1).join(', ') || 'Việt Nam',
          };
        }
      }
    }
  } catch { /* thử nguồn tiếp theo */ }

  // 2) Open-Meteo Geocoding — chỉ hoạt động tốt với tên KHÔNG DẤU, không dùng language=vi
  //    (language=vi từng match sai "Đà Lạt" → "Đã Tịch"; đã kiểm chứng thực tế)
  const tryOm = async (q: string) => {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&format=json`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.results?.[0] || null;
  };
  const cleanName = locationName
    .replace(/Đỉnh|Núi|Đèo|Thị trấn|Khu du lịch|Homestay|Bản|Xã|Huyện/gi, '')
    .replace(/\(.*\)/g, '')
    .trim();
  const normName = removeVietnameseTones(cleanName || locationName);
  if (normName.length >= 2) {
    const r = await tryOm(normName).catch(() => null);
    if (r && inVietnam(r.latitude, r.longitude)) {
      return {
        name: r.name || locationName,
        lat: r.latitude, lon: r.longitude,
        elevation: typeof r.elevation === 'number' ? Math.round(r.elevation) : undefined,
        admin: [r.admin1, r.country].filter(Boolean).join(', '),
      };
    }
  }
  return null;
}

export const analyzeLocation = async (locationName: string, model?: string): Promise<LocationAnalysis> => {
  const knownPeak = findBestMatchingPeak(locationName);
  const matchedMountainEntry = findBestMatchingMountain(locationName);
  const matchedMt = matchedMountainEntry ? matchedMountainEntry.info : null;

  // 1) Thư viện đã xác thực — nguồn tin cậy nhất
  if (knownPeak && matchedMt) {
    return {
      name: knownPeak.name,
      province: knownPeak.province,
      estimated_elevation: knownPeak.altitude,
      description: `Địa điểm có trong thư viện núi đã xác thực. Nhóm địa hình: ${matchedMt.zone === "A_CLOUD_TRAP" ? "Bồn giữ ẩm (kín gió, tụ mây mạnh)" : "Ống gió sườn núi (gió mạnh, chỉ đẹp khi lặng gió)"}. Vị trí săn mây gợi ý ~${knownPeak.altitude - 100}m.`,
      is_known_peak: true,
      confidence: "HIGH",
      suggested_observer_alt: knownPeak.altitude - 100,
      lat: matchedMt.lat,
      lon: matchedMt.lon,
      source: 'DB',
    };
  }
  if (matchedMt) {
    return {
      name: matchedMt.name,
      province: 'Tây Bắc',
      estimated_elevation: matchedMt.elevation,
      description: `Địa điểm có trong thư viện núi đã xác thực (tọa độ thật).`,
      is_known_peak: true,
      confidence: 'HIGH',
      suggested_observer_alt: matchedMt.elevation,
      lat: matchedMt.lat, lon: matchedMt.lon,
      source: 'DB',
    };
  }

  // 2) Geocoding thật (Open-Meteo) — tọa độ đo đạc, không phải AI đoán
  const geo = await geocodeLocation(locationName).catch(() => null);
  if (geo) {
    let elevation = geo.elevation;
    if (elevation === undefined) {
      try {
        elevation = await pointElevation(geo.lat, geo.lon); // DEM thật của đúng điểm đó
      } catch { elevation = 1200; }
    }
    // AI chỉ bổ sung MÔ TẢ (không quyết định tọa độ) — best effort
    let description = `Tọa độ từ Open-Meteo Geocoding (${geo.lat.toFixed(4)}, ${geo.lon.toFixed(4)}); độ cao ~${elevation}m.`;
    try {
      const aiDesc = await aiDescribeLocation(locationName, geo.admin || '', elevation, model);
      if (aiDesc) description = aiDesc + ` (Tọa độ thật từ Geocoding: ${geo.lat.toFixed(4)}, ${geo.lon.toFixed(4)}.)`;
    } catch { /* mô tả AI là tùy chọn */ }
    return {
      name: geo.name,
      province: geo.admin || 'Việt Nam',
      estimated_elevation: elevation,
      description,
      is_known_peak: false,
      confidence: 'MEDIUM',
      suggested_observer_alt: Math.max(elevation, 300),
      lat: geo.lat, lon: geo.lon,
      source: 'GEOCODE',
    };
  }

  // 3) AI ước tính tọa độ — phương án CUỐI, dán nhãn LOW rõ ràng
  const aiLoc = await aiResolveLocation(locationName, model);
  if (aiLoc) {
    return {
      ...aiLoc,
      is_known_peak: false,
      confidence: 'LOW',
      description: `⚠️ Tọa độ do AI ước tính (không tìm thấy trong thư viện lẫn dữ liệu geocoding) — hãy kiểm tra bản đồ trước khi tin kết quả. ${aiLoc.description}`,
      source: 'AI',
    };
  }

  // 4) Trung thực: không nhận diện được thì báo lỗi, không đổi ngầm sang địa điểm khác
  throw new Error(`Không nhận diện được địa điểm "${locationName}". Hãy thử tên phổ biến hơn (vd "Tà Xùa", "Lảo Thẩn") hoặc chọn từ danh sách gợi ý.`);
};

async function aiDescribeLocation(locationName: string, admin: string, elevation: number, model?: string): Promise<string | null> {
  const discovered = await discoverModels();
  const primaryModel = model || getStoredModel() || discovered[0]?.id || "gemini-2.5-flash";
  const res = await executeWithFallback(primaryModel, discovered, async (modelId) => {
    const p = getAIInstance().models.generateContent({
      model: modelId,
      contents: `Mô tả ngắn (≤2 câu, tiếng Việt) về "${locationName}" (${admin}, độ cao ~${elevation}m) dưới góc nhìn săn mây/trekking. Không bịa số liệu, không nêu tọa độ.`,
    });
    const t = new Promise<any>((_, rej) => setTimeout(() => rej(new Error('timeout')), 15000));
    const r = await Promise.race([p, t]);
    if (r?.text) return r;
    throw new Error('No response text');
  });
  return res.result.text?.trim() || null;
}

async function aiResolveLocation(locationName: string, model?: string): Promise<Omit<LocationAnalysis, 'is_known_peak' | 'confidence' | 'source'> | null> {
  try {
    const discovered = await discoverModels();
    const primaryModel = model || getStoredModel() || discovered[0]?.id || "gemini-2.5-flash";
    const fallbackRes = await executeWithFallback(primaryModel, discovered, async (modelId) => {
      const fetchPromise = getAIInstance().models.generateContent({
        model: modelId,
        contents: `Xác định địa danh "${locationName}" tại Việt Nam: tên chuẩn, tỉnh, độ cao ước tính (m), tọa độ lat/lon, mô tả ngắn về đặc điểm săn mây, độ cao đứng ngắm gợi ý. Nếu không chắc, để mô tả nói rõ là không chắc.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              province: { type: Type.STRING },
              estimated_elevation: { type: Type.NUMBER },
              description: { type: Type.STRING },
              suggested_observer_alt: { type: Type.NUMBER },
              lat: { type: Type.NUMBER },
              lon: { type: Type.NUMBER },
            },
            required: ["name", "province", "estimated_elevation", "description", "suggested_observer_alt", "lat", "lon"],
          },
        },
      });
      const timeoutPromise = new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Gemini API Timeout after 30s")), 30000));
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      if (response && response.text) return response;
      throw new Error("No response text");
    });
    return JSON.parse(extractJson(fallbackRes.result.text));
  } catch (e) {
    console.warn('AI location resolve failed:', e);
    return null;
  }
}

function extractJson(text: string): string {
  let s = text.trim();
  const jsonMatch = s.match(/```json\r?\n([\s\S]*?)\r?\n```/) || s.match(/```\r?\n([\s\S]*?)\r?\n```/);
  if (jsonMatch) return jsonMatch[1].trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start !== -1 && end > start) return s.substring(start, end + 1);
  return s;
}

// ------------------------------------------------------- phân tích chính ----

const NARRATIVE_SYSTEM = `
Bạn là chuyên gia khí tượng săn mây Tây Bắc, viết BẢN TIN LỜI BÌNH bằng tiếng Việt cho người
đi trekking, du lịch và nhiếp ảnh.

QUY TẮC SẮT (vi phạm = bản tin bị loại):
1. MỌI CON SỐ đã được engine tính sẵn và gửi kèm (điểm, trạng thái, LCL, mặt mây, ΔH, gió,
   nghịch nhiệt, lý do cộng/trừ điểm). Bạn KHÔNG được thay đổi, làm tròn khác, hay bịa thêm
   bất kỳ con số nào. Chỉ được trích dẫn đúng số đã cho.
2. KHÔNG suy đoán về những ngày được đánh dấu NO_DATA — chỉ nói "chưa có dữ liệu".
3. Ngày UNCERTAIN (dự báo xa) phải nhắc người đọc tra lại khi gần ngày đi.
4. Viết thực dụng, có hành động cụ thể (mấy giờ có mặt ở đâu, khi nào rút), giọng đồng hành
   không màu mè. Với nhiếp ảnh: khai thác chỉ số "tiềm năng cháy mây bình minh" đã cho.
`;

export const analyzeWeatherData = async (data: WeatherInput): Promise<CloudAnalysis> => {
  // 1) Nhận diện địa hình
  const matchedPreset = findBestMatchingPeak(data.locationName);
  const matchedMountainEntry = findBestMatchingMountain(data.locationName);
  const mountainKey = matchedMountainEntry ? matchedMountainEntry.key : null;

  // 2) Dữ liệu khí tượng thật (2 điểm × 3 mô hình) — lỗi ở đây phải nổi lên, không nuốt
  const pkg = await fetchMountainWeather(
    mountainKey, data.locationName, data.startDate, data.endDate,
    data.lat, data.lon, data.observerAlt, matchedPreset?.elevation_profile,
  );

  const zone = pkg.mountainInfo.zone;
  const observerAlt = data.observerAlt || pkg.mountainInfo.elevation;

  // 3) Engine chấm điểm deterministic từng ngày
  const dayOutputs: EngineDayOutput[] = pkg.days.map(day => computeDayForecast(day, {
    valleyElevation: pkg.valleyElevation,
    observerAlt,
    zone,
    peakAltitude: matchedPreset?.altitude,
    profile: matchedPreset?.elevation_profile,
  }));
  const trip = computeTripSummary(dayOutputs);
  const season = seasonAdjust(data.startDate);
  const warnings = [...new Set(dayOutputs.flatMap(o => o.warnings))];

  // 4) Địa hình: thư viện xác thực, hoặc mặt cắt tối thiểu từ dữ liệu THẬT (DEM + geocode)
  let terrain: TerrainAnalysis;
  if (matchedPreset?.elevation_profile?.length) {
    terrain = {
      source: 'HARDCODED',
      summary: `Mặt cắt địa hình đã xác thực của ${matchedPreset.name} (${matchedPreset.province}).`,
      cloud_trap_potential: zone === 'A_CLOUD_TRAP' ? 'High' : 'Medium',
      zone_classification: zone,
      elevation_profile: matchedPreset.elevation_profile,
    };
  } else {
    terrain = {
      source: 'DEM',
      summary: `Mặt cắt ước tính từ mô hình độ cao số (DEM) quanh tọa độ — đáy thung lũng ~${pkg.valleyElevation}m, vị trí đứng ${observerAlt}m. Độ phân giải thô, chỉ dùng tham khảo tương đối.`,
      cloud_trap_potential: zone === 'A_CLOUD_TRAP' ? 'Medium' : 'Low',
      zone_classification: zone,
      elevation_profile: [
        { label: 'Đáy thung lũng (DEM)', altitude: pkg.valleyElevation, type: 'VALLEY', description: 'Điểm thấp nhất trong bán kính ~4km — nơi biển mây hình thành' },
        { label: 'Vị trí đứng', altitude: observerAlt, type: 'SLOPE', description: 'Độ cao quan sát bạn đã chọn' },
        { label: pkg.mountainInfo.name, altitude: Math.max(observerAlt, pkg.mountainInfo.elevation), type: 'PEAK', description: 'Độ cao tham chiếu của địa điểm' },
      ],
    };
  }

  const engineForecasts: DailyForecast[] = dayOutputs.map(o => o.forecast);

  const base: CloudAnalysis = {
    locationName: pkg.mountainInfo.name,
    province: matchedPreset?.province,
    elevation: pkg.mountainInfo.elevation,
    zoneType: zone,
    overallScore: trip.overallScore,
    overallStrategy: buildFallbackStrategy(engineForecasts, trip.bestDays, season.label),
    seasonalContext: season.label,
    dataReliability: trip.dataReliability,
    consensus: {
      models: pkg.modelsCompared,
      agreementPct: trip.agreementPct,
      scoreSpread: trip.scoreSpread,
      note: `${pkg.modelsCompared.length} mô hình toàn cầu; đồng thuận trạng thái ${trip.agreementPct}%, chênh lệch điểm trung bình ${trip.scoreSpread}.`,
    },
    bestDays: trip.bestDays,
    dailyForecasts: engineForecasts,
    gearChecklist: defaultGear(season.label),
    safetyWarnings: warnings,
    terrain_analysis: terrain,
    weather_data_source: {
      locationName: pkg.mountainInfo.name,
      lat: pkg.mountainInfo.lat,
      lon: pkg.mountainInfo.lon,
      elevation: pkg.mountainInfo.elevation,
      valleyElevation: pkg.valleyElevation,
      source: 'Open-Meteo API (đa mô hình)',
      models_compared: pkg.modelsCompared,
    },
    aiNarrative: false,
    modelUsed: undefined,
    engineVersion: ENGINE_VERSION,
  };

  // 5) AI viết lời bình (best-effort) — thất bại thì trả kết quả engine nguyên vẹn
  try {
    const narrative = await generateNarrative(base, data.model);
    if (narrative) return narrative;
  } catch (e) {
    console.warn('AI narrative unavailable, serving engine-only forecast:', e);
  }
  return base;
};

function buildFallbackStrategy(forecasts: DailyForecast[], bestDays: string[], seasonLabel: string): string {
  const withData = forecasts.filter(f => f.data_quality !== 'NO_DATA');
  if (withData.length === 0) {
    return 'Toàn bộ khoảng ngày nằm ngoài phạm vi dữ liệu dự báo (tối đa 15 ngày tới) — hãy tra lại khi gần ngày đi.';
  }
  const best = bestDays.length
    ? `Ngày đáng đi nhất: ${bestDays.join(', ')}.`
    : 'Chưa có ngày nào đạt ngưỡng "đáng đi" (≥60 điểm) trong khoảng này.';
  const avg = Math.round(withData.reduce((s, f) => s + f.score, 0) / withData.length);
  return `${seasonLabel}. Điểm trung bình khoảng ngày: ${avg}/100. ${best} Điểm số do engine tính từ dữ liệu 3 mô hình toàn cầu; xem chi tiết "vì sao" ở từng ngày.`;
}

function defaultGear(seasonLabel: string): string[] {
  const base = ['Đèn pin đội đầu (xuất phát trước bình minh)', 'Áo khoác chắn gió', 'Găng tay + mũ ấm', 'Nước 1.5L+', 'Sạc dự phòng'];
  if (seasonLabel.startsWith('Đông')) base.push('Lớp giữ nhiệt (có thể ≤0°C trên cao)');
  if (seasonLabel.startsWith('Hè')) base.push('Áo mưa + túi chống nước cho máy ảnh');
  return base;
}

async function generateNarrative(base: CloudAnalysis, model?: string): Promise<CloudAnalysis | null> {
  const engineDigest = {
    location: base.locationName,
    zone: base.zoneType,
    season: base.seasonalContext,
    bestDays: base.bestDays,
    consensus: base.consensus,
    safetyWarnings: base.safetyWarnings,
    days: base.dailyForecasts.map(f => ({
      date: f.date,
      quality: f.data_quality,
      score: f.score,
      status: f.status_code,
      reasons: f.reasons,
      sunrise: f.sun_times?.sunrise,
      golden: f.golden_hours,
      lcl: f.technical_indices.LCL_base,
      cloud_top: f.technical_indices.cloud_top_estimated,
      delta_h: f.technical_indices.delta_h,
      wind: f.technical_indices.wind_detail,
      inversion: f.technical_indices.inversion_strength,
      sunrise_color: f.sunrise_color_potential,
      recommended_position: f.recommended_position,
    })),
  };

  const discovered = await discoverModels();
  const primaryModel = model || getStoredModel() || discovered[0]?.id || "gemini-2.5-flash";
  const fallbackRes = await executeWithFallback(primaryModel, discovered, async (modelId) => {
    const fetchPromise = getAIInstance().models.generateContent({
      model: modelId,
      contents: `Kết quả engine (số liệu CHỐT, không được sửa):\n${JSON.stringify(engineDigest, null, 1)}\n\nViết lời bình cho bản tin này.`,
      config: {
        systemInstruction: NARRATIVE_SYSTEM,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallStrategy: { type: Type.STRING, description: 'Chiến thuật tổng quan 3-5 câu, nhắc ngày tốt nhất và nhịp di chuyển' },
            goldenTips: { type: Type.ARRAY, items: { type: Type.STRING }, description: '3-5 mẹo thực dụng cho chuyến này' },
            gearChecklist: { type: Type.ARRAY, items: { type: Type.STRING } },
            days: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING },
                  general: { type: Type.STRING, description: 'Nhận định hình thế 1-2 câu, trích số engine' },
                  cloud_behavior: { type: Type.STRING, description: 'Mây sẽ hành xử thế nào, 1-2 câu' },
                  topography_effect: { type: Type.STRING },
                  risk_factors: { type: Type.STRING },
                  expert_advice: { type: Type.STRING, description: 'Lời khuyên hành động cụ thể: giờ, vị trí, phương án B' },
                },
                required: ["date", "general", "cloud_behavior", "topography_effect", "expert_advice"],
              },
            },
          },
          required: ["overallStrategy", "days"],
        },
      },
    });
    const timeoutPromise = new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Gemini API Timeout after 60s")), 60000));
    const response = await Promise.race([fetchPromise, timeoutPromise]);
    if (response && response.text) return response;
    throw new Error("No response text");
  });

  const parsed = JSON.parse(extractJson(fallbackRes.result.text));
  const byDate = new Map<string, any>((parsed.days || []).map((d: any) => [d.date, d]));

  const merged: DailyForecast[] = base.dailyForecasts.map(f => {
    const n = byDate.get(f.date);
    if (!n || f.data_quality === 'NO_DATA') return f; // ngày NO_DATA giữ nguyên văn bản engine
    return {
      ...f,
      weather_analysis: {
        general: n.general || f.weather_analysis.general,
        cloud_behavior: n.cloud_behavior || f.weather_analysis.cloud_behavior,
        topography_effect: n.topography_effect || f.weather_analysis.topography_effect,
        risk_factors: n.risk_factors,
      },
      expert_advice: n.expert_advice || f.expert_advice,
    };
  });

  return {
    ...base,
    overallStrategy: parsed.overallStrategy || base.overallStrategy,
    goldenTips: parsed.goldenTips,
    gearChecklist: parsed.gearChecklist?.length ? parsed.gearChecklist : base.gearChecklist,
    dailyForecasts: merged,
    aiNarrative: true,
    modelUsed: fallbackRes.modelUsed,
  };
}
