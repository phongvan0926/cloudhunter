import { MOUNTAIN_DB, MountainInfo } from '../constants/mountains';

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
}

export async function fetchMountainWeather(mountainKey: string | null, locationName: string, startDate: string, endDate: string, lat?: number, lon?: number): Promise<{ mountainInfo: MountainInfo; dailyWeather: Record<string, WeatherData> } | null> {
  let mt: MountainInfo | null = null;

  if (mountainKey && MOUNTAIN_DB[mountainKey]) {
    mt = MOUNTAIN_DB[mountainKey];
  } else if (lat !== undefined && lon !== undefined) {
    mt = {
      name: locationName,
      lat: lat,
      lon: lon,
      elevation: 1000, // Default elevation
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
          zone: "A_CLOUD_TRAP" // Default zone for unknown locations
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
  
  // URL API của Open-Meteo (Sử dụng mô hình tốt nhất tự động)
  const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${mt.lat}&longitude=${mt.lon}&elevation=${mt.elevation}&hourly=temperature_2m,dewpoint_2m,surface_pressure&pressure_levels=850hPa,700hPa&hourly=temperature_850hPa,temperature_700hPa,windspeed_850hPa&start_date=${startDate}&end_date=${endDate}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (data.error || !data.hourly) {
      console.warn("Open-Meteo API Error:", data.reason || "Missing hourly data");
      return null;
    }
    
    const dailyWeather: Record<string, WeatherData> = {};
    
    // Loop through days
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
            const temps = indices.map(idx => data.hourly.temperature_2m[idx]);
            const dews = indices.map(idx => data.hourly.dewpoint_2m[idx]);
            const temps850 = indices.map(idx => data.hourly.temperature_850hPa[idx]);
            const temps700 = indices.map(idx => data.hourly.temperature_700hPa[idx]);
            const winds = indices.map(idx => data.hourly.windspeed_850hPa[idx]);

            const t_surf_avg = Number((temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1));
            const td_surf_avg = Number((dews.reduce((a, b) => a + b, 0) / dews.length).toFixed(1));
            const t_850_avg = Number((temps850.reduce((a, b) => a + b, 0) / temps850.length).toFixed(1));
            const t_700_avg = Number((temps700.reduce((a, b) => a + b, 0) / temps700.length).toFixed(1));
            const wind_850_max = Number(Math.max(...winds).toFixed(1));

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

            dailyWeather[dateStr] = {
                t_surf: t_surf_avg,
                td_surf: td_surf_avg,
                t_850: t_850_avg,
                t_700: t_700_avg,
                wind_850: wind_850_max,
                lcl_computed: lcl,
                fsi_computed: fsi,
                inversion_strength_computed: inversion,
                wind_impact_level_computed: wind_level
            };
        }
        currDate.setDate(currDate.getDate() + 1);
    }
    
    return {
      mountainInfo: mt,
      dailyWeather
    };
  } catch (error) {
    console.error("Lỗi lấy dữ liệu thời tiết:", error);
    return null;
  }
}
