/**
 * fieldReportService — BÁO CÁO THỰC ĐỊA của người dùng: nguồn sự thật đáng tin nhất của app.
 *
 * Vì sao đây là nền tảng chứ không phải phụ trợ:
 *  - Không thể lấy chính mô hình dự báo ra chấm điểm mô hình (ô lưới 9-25km không phân giải
 *    nổi biển mây thung lũng — chính là lỗ hổng đã làm app trượt ngày 23/8/2026).
 *  - Vệ tinh (tools/verify_satellite.py) đo thật nhưng MÙ khi có tầng mây cao che phía trên,
 *    mà mùa mưa Tây Bắc thì gần như ngày nào cũng có.
 *  - Người đứng tại chỗ thì luôn biết, và biết đúng thứ engine dự báo: mặt mây nằm TRÊN hay
 *    DƯỚI chỗ mình đứng.
 *
 * Dữ liệu nằm trong localStorage máy người dùng, không gửi đi đâu. Muốn dùng để hiệu chuẩn
 * thì bấm xuất JSON rồi chạy `npx vite-node scripts/calibrate.ts <file>`.
 */

const KEY = 'cloudhunter_field_reports_v1';
const MAX = 300;

/** Mặt mây so với chỗ đứng — chính là đại lượng ΔH mà engine dự báo. */
export type SeaLevelRelative = 'BELOW' | 'AT_EYE' | 'ABOVE' | 'NONE';

export interface FieldReport {
  id: string;
  spotKey: string | null;      // key trong MOUNTAIN_DB nếu là điểm có sẵn
  locationName: string;
  date: string;                // YYYY-MM-DD — ngày RẠNG SÁNG quan sát
  seaLevel: SeaLevelRelative;
  note?: string;
  /** Điểm & trạng thái app đã dự báo cho đúng ngày đó (chốt lại lúc báo cáo, để đối chiếu sau) */
  predictedScore?: number;
  predictedStatus?: string;
  engineVersion?: string;
  reportedAt: string;          // ISO
}

export const SEA_LEVEL_TEXT: Record<SeaLevelRelative, string> = {
  BELOW: 'Có biển mây — mặt mây THẤP HƠN chỗ đứng (đứng trên biển mây)',
  AT_EYE: 'Mây dập dềnh NGANG tầm mắt, lúc trên lúc dưới',
  ABOVE: 'Mây/mù trùm QUA đầu — chìm trong mây, không thấy gì',
  NONE: 'Trời quang, không có biển mây',
};

/** Có phải là "biển mây ngắm được" không — dùng làm nhãn đúng/sai khi chấm engine. */
export function isSeaObserved(r: FieldReport): boolean {
  return r.seaLevel === 'BELOW' || r.seaLevel === 'AT_EYE';
}

export function listReports(): FieldReport[] {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(all) ? all : [];
  } catch { return []; }
}

export function findReport(spotKey: string | null, locationName: string, date: string): FieldReport | null {
  return listReports().find(r =>
    r.date === date && (spotKey ? r.spotKey === spotKey : r.locationName === locationName)) || null;
}

export function saveReport(r: Omit<FieldReport, 'id' | 'reportedAt'>): FieldReport {
  const entry: FieldReport = { ...r, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, reportedAt: new Date().toISOString() };
  // Một điểm + một ngày chỉ giữ MỘT báo cáo — báo lại là sửa, không nhân bản dữ liệu sai
  const all = listReports().filter(x => !(x.date === entry.date &&
    (entry.spotKey ? x.spotKey === entry.spotKey : x.locationName === entry.locationName)));
  all.unshift(entry);
  try { localStorage.setItem(KEY, JSON.stringify(all.slice(0, MAX))); }
  catch (e) { console.warn('Không lưu được báo cáo thực địa:', e); }
  return entry;
}

export function deleteReport(id: string): void {
  try { localStorage.setItem(KEY, JSON.stringify(listReports().filter(r => r.id !== id))); }
  catch { /* bỏ qua */ }
}

/** Xuất JSON để chạy hiệu chuẩn offline (scripts/calibrate.ts). */
export function exportReports(): string {
  return JSON.stringify(listReports(), null, 2);
}

/** Nhập lại từ file đã xuất (gộp, bản mới đè bản cũ cùng điểm+ngày). */
export function importReports(json: string): { added: number; total: number } {
  const incoming = JSON.parse(json);
  if (!Array.isArray(incoming)) throw new Error('File không đúng định dạng (phải là mảng báo cáo)');
  const cur = listReports();
  const seen = new Set(cur.map(r => `${r.spotKey || r.locationName}|${r.date}`));
  let added = 0;
  for (const r of incoming) {
    if (!r?.date || !r?.seaLevel) continue;
    const k = `${r.spotKey || r.locationName}|${r.date}`;
    if (seen.has(k)) continue;
    seen.add(k); cur.push(r); added++;
  }
  cur.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  try { localStorage.setItem(KEY, JSON.stringify(cur.slice(0, MAX))); } catch { /* bỏ qua */ }
  return { added, total: Math.min(cur.length, MAX) };
}
