/**
 * verificationService — vòng đối chiếu "app đoán gì vs thực tế": lấy dữ liệu TÁI PHÂN TÍCH
 * ERA5 (archive-api.open-meteo.com — quan trắc đồng hóa, trễ ~5 ngày) cho các ngày đã qua
 * của một lần dự báo đã lưu, so % mây thấp bình minh thực tế với trạng thái app đã đoán.
 *
 * Trung thực:
 *  - ERA5 là proxy tốt nhất không cần backend, KHÔNG phải quan sát bằng mắt — nói rõ trên UI.
 *  - Ngày chưa đủ xa (ERA5 chưa có) → actual = null, không phán đúng/sai.
 *  - Ngưỡng: "có biển mây" = mây thấp trung bình 4-9h ≥ 40% (cùng ngưỡng ensemble).
 */
import { CloudAnalysis, StatusCode } from '../types';
import { vnTodayStr, addDaysStr } from './weatherService';

// Trạng thái mà engine coi là "mô hình thấy mây thấp lúc bình minh"
const CLOUD_SEA_STATUSES: StatusCode[] = ['STATIC', 'FLOWING', 'FLUCTUATING', 'ROLLING', 'FOG'];
const ERA5_DELAY_DAYS = 5;
const CLOUD_SEA_THRESHOLD = 40; // % mây thấp

export interface DayVerification {
  date: string;
  predictedScore: number;
  predictedStatus: StatusCode;
  predictedCloudSea: boolean;
  actualCloudLowPct: number | null; // null = ERA5 chưa có dữ liệu ngày này
  actualCloudSea: boolean | null;
  hit: boolean | null;
}

export interface RunVerification {
  locationName: string;
  days: DayVerification[];
  hits: number;
  misses: number;
  pending: number; // ngày chưa có ERA5
}

export async function verifyRun(analysis: CloudAnalysis): Promise<RunVerification> {
  const lat = analysis.weather_data_source?.lat;
  const lon = analysis.weather_data_source?.lon;
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    throw new Error('Lần dự báo này không lưu tọa độ đã xác thực — không thể đối chiếu.');
  }
  const cutoff = addDaysStr(vnTodayStr(), -ERA5_DELAY_DAYS);
  const pastDays = analysis.dailyForecasts
    .filter(f => f.date <= cutoff && f.status_code !== 'UNKNOWN')
    .sort((a, b) => a.date.localeCompare(b.date));
  if (pastDays.length === 0) {
    throw new Error(`Chưa có ngày nào đủ xa để đối chiếu — ERA5 trễ ~${ERA5_DELAY_DAYS} ngày sau thời điểm thực tế.`);
  }

  const url =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}` +
    `&hourly=cloud_cover_low&start_date=${pastDays[0].date}&end_date=${pastDays[pastDays.length - 1].date}` +
    `&timezone=Asia%2FBangkok`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ERA5 archive: HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(`ERA5 archive: ${data.reason || 'lỗi không rõ'}`);
  const time: string[] = data.hourly?.time || [];
  const cloud: (number | null)[] = data.hourly?.cloud_cover_low || [];

  const days: DayVerification[] = pastDays.map(f => {
    const vals: number[] = [];
    for (let i = 0; i < time.length; i++) {
      if (!time[i].startsWith(f.date)) continue;
      const h = parseInt(time[i].slice(11, 13), 10);
      const v = cloud[i];
      if (h >= 4 && h <= 9 && typeof v === 'number') vals.push(v);
    }
    const actual = vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    const predictedCloudSea = CLOUD_SEA_STATUSES.includes(f.status_code);
    const actualCloudSea = actual === null ? null : actual >= CLOUD_SEA_THRESHOLD;
    return {
      date: f.date,
      predictedScore: f.score,
      predictedStatus: f.status_code,
      predictedCloudSea,
      actualCloudLowPct: actual,
      actualCloudSea,
      hit: actualCloudSea === null ? null : predictedCloudSea === actualCloudSea,
    };
  });

  return {
    locationName: analysis.locationName,
    days,
    hits: days.filter(d => d.hit === true).length,
    misses: days.filter(d => d.hit === false).length,
    pending: days.filter(d => d.hit === null).length,
  };
}
