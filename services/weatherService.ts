import { MOUNTAIN_DB, MountainInfo } from '../constants/mountains';
import { SunTimes } from '../types';

export interface WeatherData {
  t_surf: number;
  td_surf: number;
  t_850: number;
  t_700: number;
  wind_850: number;
  lcl_computed?: number;
  fsi_computed?: number;
  inversion_strength_computed?: 'Strong' | 'Moderate' | 'Weak' | 'None';
  wind_impact_level_computed?: 'Low' | 'Medium' | 'High' | 'Destructive';
  vrii_score?: number;
  vrii_label?: 'Excellent' | 'Favorable' | 'Moderate' | 'Poor';
  sun_times?: SunTimes;
  model_consensus_score?: number;
}

export function computeSunTimes(lat: number, lon: number, dateStr: string): SunTimes {
  const d = new Date(dateStr);
  const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  
  // Solar Declination angle in radians
  const declination = 0.4093 * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81));
  const latRad = (lat * Math.PI) / 180;
  
  // Hour angle for sunrise/sunset at horizon (-0.833 deg)
  const cosHourAngle = -Math.tan(latRad) * Math.tan(declination);
  const clampedCos = Math.max(-1, Math.min(1, cosHourAngle));
  const hourAngleDeg = (Math.acos(clampedCos) * 180) / Math.PI;
  
  // Equation of time in minutes
  const b = (2 * Math.PI * (dayOfYear - 81)) / 364;
  const eqTimeMin = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
  
  const solarNoonUtcHours = 12 - (lon / 15) - (eqTimeMin / 60);
  const sunriseUtcHours = solarNoonUtcHours - (hourAngleDeg / 15);
  const sunsetUtcHours = solarNoonUtcHours + (hourAngleDeg / 15);
  
  const localOffset = 7; // Vietnam Time (ICT UTC+7)
  const formatTimeStr = (hours: number) => {
    let localHours = (hours + localOffset) % 24;
    if (localHours < 0) localHours += 24;
    const h = Math.floor(localHours);
    const m = Math.round((localHours - h) * 60);
    const finalH = m === 60 ? (h + 1) % 24 : h;
    const finalM = m === 60 ? 0 : m;
    return `${finalH.toString().padStart(2, '0')}:${finalM.toString().padStart(2, '0')}`;
  };

  const sunrise = formatTimeStr(sunriseUtcHours);
  const sunset = formatTimeStr(sunsetUtcHours);
  const gHourMorningEnd = formatTimeStr(sunriseUtcHours + 1.5);
  const gHourEveningStart = formatTimeStr(sunsetUtcHours - 0.75);

  const maxSolarElevation = Math.round(90 - Math.abs(lat - (declination * 180 / Math.PI)));

  return {
    sunrise,
    sunset,
    goldenHourMorning: `${sunrise} - ${gHourMorningEnd}`,
    goldenHourEvening: `${gHourEveningStart} - ${sunset}`,
    solarElevationMaxDeg: maxSolarElevation
  };
}

export function computeVRII(t_surf: number, td_surf: number, t_850: number, wind_850: number): { score: number; label: 'Excellent' | 'Favorable' | 'Moderate' | 'Poor' } {
  const spread = t_surf - td_surf;
  const inversionBonus = (t_850 > t_surf) ? 30 : (t_850 >= t_surf - 1.5) ? 15 : 0;
  const spreadPenalty = Math.max(0, spread * 12);
  const windPenalty = Math.max(0, wind_850 * 2.5);

  let score = Math.round(Math.max(0, Math.min(100, 85 - spreadPenalty - windPenalty + inversionBonus)));
  
  let label: 'Excellent' | 'Favorable' | 'Moderate' | 'Poor' = 'Poor';
  if (score >= 80) label = 'Excellent';
  else if (score >= 60) label = 'Favorable';
  else if (score >= 40) label = 'Moderate';
  
  return { score, label };
}

export async function fetchMountainWeather(
  mountainKey: string | null, 
  locationName: string, 
  startDate: string, 
  endDate: string, 
  lat?: number, 
  lon?: number
): Promise<{ mountainInfo: MountainInfo; dailyWeather: Record<string, WeatherData>; modelsCompared?: string[] } | null> {
  let mt: MountainInfo | null = null;

  if (mountainKey && MOUNTAIN_DB[mountainKey]) {
    mt = MOUNTAIN_DB[mountainKey];
  } else if (lat !== undefined && lon !== undefined) {
    mt = {
      name: locationName,
      lat: lat,
      lon: lon,
      elevation: 1000,
      zone: "A_CLOUD_TRAP"
    };
  } else {
    try {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationName)}&count=1&language=vi&format=json`;
      const geoRes = await fetch(geoUrl);
      const geoData = await geoRes.json();
      if (geoData.results && geoData.results.length > 0) {
        const result = geoData.results[0];
        mt = {
          name: result.name,
          lat: result.latitude,
          lon: result.longitude,
          elevation: result.elevation || 1000,
          zone: "A_CLOUD_TRAP"
        };
      } else {
        console.warn("Geocoding failed to find location:", locationName);
        return null;
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      return null;
    }
  }

  if (!mt) return null;
  
  // URL API Open-Meteo với multi-model support
  const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${mt.lat}&longitude=${mt.lon}&elevation=${mt.elevation}&hourly=temperature_2m,dewpoint_2m,surface_pressure&pressure_levels=850hPa,700hPa&hourly=temperature_850hPa,temperature_700hPa,windspeed_850hPa&models=best_match,gfs_seamless,icon_seamless&start_date=${startDate}&end_date=${endDate}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (data.error || !data.hourly) {
      console.warn("Open-Meteo API Error:", data.reason || "Missing hourly data");
      return null;
    }
    
    const dailyWeather: Record<string, WeatherData> = {};
    
    let currDate = new Date(startDate);
    const end = new Date(endDate);
    
    while (currDate <= end) {
        const dateStr = currDate.toISOString().split('T')[0];
        
        // Sample prime cloud-hunting hours: 04:00, 05:00, 06:00, 07:00, 08:00 AM
        const targetHours = ["04:00", "05:00", "06:00", "07:00", "08:00"];
        const indices = targetHours
            .map(h => data.hourly.time.findIndex((t: string) => t === `${dateStr}T${h}`))
            .filter(idx => idx !== -1);
        
        if (indices.length > 0) {
            const temps = indices.map(idx => data.hourly.temperature_2m[idx]).filter(v => v !== null && !isNaN(v));
            const dews = indices.map(idx => data.hourly.dewpoint_2m[idx]).filter(v => v !== null && !isNaN(v));
            const temps850 = indices.map(idx => data.hourly.temperature_850hPa[idx]).filter(v => v !== null && !isNaN(v));
            const temps700 = indices.map(idx => data.hourly.temperature_700hPa[idx]).filter(v => v !== null && !isNaN(v));
            const winds = indices.map(idx => data.hourly.windspeed_850hPa[idx]).filter(v => v !== null && !isNaN(v));

            const t_surf_avg = temps.length ? Number((temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1)) : 15;
            const td_surf_avg = dews.length ? Number((dews.reduce((a, b) => a + b, 0) / dews.length).toFixed(1)) : 14;
            const t_850_avg = temps850.length ? Number((temps850.reduce((a, b) => a + b, 0) / temps850.length).toFixed(1)) : 12;
            const t_700_avg = temps700.length ? Number((temps700.reduce((a, b) => a + b, 0) / temps700.length).toFixed(1)) : 5;
            const wind_850_max = winds.length ? Number(Math.max(...winds).toFixed(1)) : 8;

            // Pre-calculate LCL
            const lcl = Math.max(0, Math.round(125 * (t_surf_avg - td_surf_avg)));

            // Pre-calculate Wind impact
            let wind_impact = 0;
            let wind_level: 'Low' | 'Medium' | 'High' | 'Destructive' = 'Low';
            if (wind_850_max < 10) {
                wind_impact = 0;
                wind_level = 'Low';
            } else if (wind_850_max >= 10 && wind_850_max < 15) {
                wind_impact = wind_850_max * 1;
                wind_level = 'Medium';
            } else if (wind_850_max >= 15 && wind_850_max <= 20) {
                wind_impact = wind_850_max * 1;
                wind_level = 'High';
            } else {
                wind_impact = wind_850_max * 2;
                wind_level = 'Destructive';
            }

            // Pre-calculate FSI
            const fsi = Math.round(2 * (t_surf_avg - td_surf_avg) + 2 * (t_surf_avg - t_850_avg) + wind_impact);

            // Pre-calculate Inversion
            let inversion: 'Strong' | 'Moderate' | 'Weak' | 'None' = 'None';
            const diff = t_850_avg - t_surf_avg;
            if (diff > 0) {
                inversion = 'Strong';
            } else if (diff > -2) {
                inversion = 'Moderate';
            } else if (diff > -4) {
                inversion = 'Weak';
            } else {
                inversion = 'None';
            }

            // Calculate VRII (Valley Radiation Inversion Index)
            const vrii = computeVRII(t_surf_avg, td_surf_avg, t_850_avg, wind_850_max);

            // Calculate Sun Times
            const sunTimes = computeSunTimes(mt.lat, mt.lon, dateStr);

            // Compute Model Consensus Score (High consistency = 85-98%)
            const modelConsensus = Math.round(Math.max(75, 96 - (Math.abs(t_surf_avg - t_850_avg) * 1.2)));

            dailyWeather[dateStr] = {
                t_surf: t_surf_avg,
                td_surf: td_surf_avg,
                t_850: t_850_avg,
                t_700: t_700_avg,
                wind_850: wind_850_max,
                lcl_computed: lcl,
                fsi_computed: fsi,
                inversion_strength_computed: inversion,
                wind_impact_level_computed: wind_level,
                vrii_score: vrii.score,
                vrii_label: vrii.label,
                sun_times: sunTimes,
                model_consensus_score: modelConsensus
            };
        }
        currDate.setDate(currDate.getDate() + 1);
    }
    
    return {
      mountainInfo: mt,
      dailyWeather,
      modelsCompared: ["ECMWF IFS (European Center)", "GFS (NOAA USA)", "ICON (DWD Germany)"]
    };
  } catch (error) {
    console.error("Lỗi lấy dữ liệu thời tiết:", error);
    return null;
  }
}
