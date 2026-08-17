/**
 * historyService — lưu các lần dự báo gần nhất vào localStorage.
 * Mục đích: (1) mở lại kết quả tức thì không tốn API, (2) sau chuyến đi người dùng có thể
 * đối chiếu "app đã dự báo gì" với thực tế — bước đầu của vòng kiểm chứng độ chính xác.
 */
import { CloudAnalysis } from '../types';

const KEY = 'cloudhunter_history_v1';
const MAX_RUNS = 5;

export interface HistoryEntry {
  id: string;
  savedAt: string;        // ISO — thời điểm dự báo được tạo (để đối chiếu sau chuyến đi)
  locationName: string;
  dateRange: string;
  analysis: CloudAnalysis;
}

export function listRuns(): Omit<HistoryEntry, 'analysis'>[] {
  try {
    const all: HistoryEntry[] = JSON.parse(localStorage.getItem(KEY) || '[]');
    return all.map(({ analysis, ...meta }) => meta);
  } catch { return []; }
}

export function loadRun(id: string): CloudAnalysis | null {
  try {
    const all: HistoryEntry[] = JSON.parse(localStorage.getItem(KEY) || '[]');
    return all.find(e => e.id === id)?.analysis || null;
  } catch { return null; }
}

export function saveRun(analysis: CloudAnalysis): void {
  try {
    const dates = analysis.dailyForecasts.map(f => f.date);
    const entry: HistoryEntry = {
      id: `${Date.now()}`,
      savedAt: new Date().toISOString(),
      locationName: analysis.locationName,
      dateRange: dates.length ? `${dates[0]} → ${dates[dates.length - 1]}` : '',
      analysis,
    };
    let all: HistoryEntry[] = [];
    try { all = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { /* hỏng thì làm mới */ }
    all.unshift(entry);
    all = all.slice(0, MAX_RUNS);
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch (e) {
    console.warn('Không lưu được lịch sử (localStorage đầy?):', e);
  }
}
