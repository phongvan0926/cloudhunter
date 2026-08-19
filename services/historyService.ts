/**
 * historyService — lưu các lần dự báo gần nhất vào localStorage.
 * Mục đích: (1) mở lại kết quả tức thì không tốn API, (2) sau chuyến đi người dùng có thể
 * đối chiếu "app đã dự báo gì" với thực tế — bước đầu của vòng kiểm chứng độ chính xác.
 */
import { CloudAnalysis } from '../types';

const KEY = 'cloudhunter_history_v1';
const MAX_RUNS = 5;
// Bump khi shape CloudAnalysis đổi tới mức UI mới không render nổi bản cũ —
// bản lưu khác version bị bỏ qua lúc đọc (an toàn hơn crash màn trắng)
const SCHEMA_VERSION = 2;

export interface HistoryEntry {
  id: string;
  schemaVersion?: number;
  savedAt: string;        // ISO — thời điểm dự báo được tạo (để đối chiếu sau chuyến đi)
  locationName: string;
  dateRange: string;
  analysis: CloudAnalysis;
}

function readAll(): HistoryEntry[] {
  try {
    const all: HistoryEntry[] = JSON.parse(localStorage.getItem(KEY) || '[]');
    return all.filter(e => e.schemaVersion === SCHEMA_VERSION);
  } catch { return []; }
}

export function listRuns(): Omit<HistoryEntry, 'analysis'>[] {
  return readAll().map(({ analysis, ...meta }) => meta);
}

export function loadRun(id: string): CloudAnalysis | null {
  return readAll().find(e => e.id === id)?.analysis || null;
}

export function saveRun(analysis: CloudAnalysis): void {
  try {
    const dates = analysis.dailyForecasts.map(f => f.date);
    const dateRange = dates.length ? `${dates[0]} → ${dates[dates.length - 1]}` : '';
    const entry: HistoryEntry = {
      id: `${Date.now()}`,
      schemaVersion: SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      locationName: analysis.locationName,
      dateRange,
      analysis,
    };
    let all = readAll();
    // Dedup: tra lại cùng điểm + cùng khoảng ngày thì THAY bản cũ, không chiếm thêm slot
    all = all.filter(e => !(e.locationName === entry.locationName && e.dateRange === dateRange));
    all.unshift(entry);
    all = all.slice(0, MAX_RUNS);
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch (e) {
    console.warn('Không lưu được lịch sử (localStorage đầy?):', e);
  }
}
