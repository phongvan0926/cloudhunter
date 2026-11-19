/**
 * Cấp độ rủi ro lũ quét, sạt lở đất do mưa theo QUY ĐỊNH NHÀ NƯỚC (phiếu gcc29 vòng 6, 19/11/2026).
 *
 * NGUỒN: Quyết định 18/2021/QĐ-TTg của Thủ tướng (22/4/2021, hiệu lực 01/7/2021; văn bản tháng 5/2026 của Bộ Xây dựng
 * vẫn viện dẫn, chưa thấy văn bản thay thế), Điều 46 và Bảng 6 Phụ lục XII. Bản gốc tải từ Vụ Quản lý đê điều và
 * phòng chống thiên tai: https://vupc.mae.gov.vn/Data/files/18_2021_QD-TTg.doc (đối chiếu từng ô Bảng 6 với lời văn
 * Điều 46 ngày 19/11/2026, khớp hết).
 *
 * Luật trong văn bản: cấp độ phụ thuộc 4 thứ.
 *  1. Tổng lượng mưa 24 giờ: 100-200 mm | trên 200 đến 400 | trên 400. Dưới 100 mm: văn bản KHÔNG xếp cấp.
 *  2. Mưa đã xảy ra trước đó: 100-200 mm đi với "1-2 ngày"; hai mức trên đi với "trên 2 ngày".
 *  3. Khu vực (theo tỉnh, tên tỉnh TRƯỚC sáp nhập 2025): KV1 Lai Châu, Sơn La, Điện Biên, Hoà Bình, Lào Cai, Yên Bái,
 *     Hà Giang; KV2 Tuyên Quang, Bắc Kạn, Lạng Sơn, Cao Bằng, Thanh Hoá, Nghệ An, Quảng Ngãi; KV3, KV4: xem văn bản.
 *  4. Vùng nguy cơ (thấp / trung bình / cao / rất cao) theo bản đồ phân vùng nguy cơ sạt lở.
 *
 * Giới hạn của app (nói thẳng trên UI): app KHÔNG có bản đồ vùng nguy cơ và không tra tỉnh cho từng điểm, nên chỉ
 * báo KHOẢNG cấp có thể (thấp nhất - cao nhất) cho nhóm KV1-2 (miền núi phía Bắc, Thanh Hoá, Nghệ An, Quảng Ngãi) và
 * nhóm KV3-4. Mưa 24h là mưa mô hình (quá khứ gần là phân tích của mô hình, không phải đo trạm) cho 24 giờ kết thúc ở
 * giờ đi qua; văn bản dùng lượng mưa CẢNH BÁO của cơ quan KTTV, nên đây là phép áp gần đúng, không phải cảnh báo chính thức.
 *
 * QUY ƯỚC CỦA APP (văn bản không định nghĩa): "một ngày có mưa trước đó" = khối 24 giờ có tổng >= 1 mm (ngưỡng ngày
 * có mưa của WMO/ETCCDI, cùng ngưỡng STH.WET_DAY_MM của stabilityService). Đếm các khối liền nhau ngay trước khối 24h.
 * QUY ƯỚC CỦA APP: chỉ xét điểm cao >= TH.SLIDE_MIN_ELEV (300 m, cùng cổng với cờ sạt lở cũ trong assessPoint), vì văn bản
 * áp cho "vùng có nguy cơ" mà app không có bản đồ; đo 19/11/2026: không có cổng này thì đồng bằng Huế (3-12 m) cũng bị xếp cấp.
 */
import { TH, type PointWx } from './routeService';

export const SLIDE_SOURCE = 'QĐ 18/2021/QĐ-TTg, Điều 46 + Bảng 6 Phụ lục XII';
export const SLIDE_SOURCE_URL = 'https://vupc.mae.gov.vn/Data/files/18_2021_QD-TTg.doc';
export const SLIDE_WET_DAY_MM = 1;
export const SLIDE_RAIN_EDGES = [100, 200, 400];   // mm/24h: [100,200] | (200,400] | > 400

/**
 * Bảng 6, chép nguyên: SLIDE_TABLE[khuVuc 0..3][lớp mưa 0..2] = cấp theo vùng nguy cơ [thấp, trung bình, cao, rất cao];
 * 0 = văn bản không xếp cấp (ô trống).
 */
export const SLIDE_TABLE: number[][][] = [
  [[1, 1, 2, 3], [1, 2, 3, 3], [2, 2, 3, 3]],   // KV1
  [[0, 1, 2, 3], [1, 2, 3, 3], [2, 2, 3, 3]],   // KV2
  [[0, 0, 1, 2], [0, 1, 2, 3], [1, 2, 2, 3]],   // KV3
  [[0, 0, 1, 1], [0, 0, 1, 2], [0, 1, 2, 2]],   // KV4
];

/** Lớp mưa 24h theo Điều 46; null = dưới 100 mm (không xếp cấp) hoặc thiếu số. */
export function slideRainClass(r24: number | null): 0 | 1 | 2 | null {
  if (r24 === null || r24 < SLIDE_RAIN_EDGES[0]) return null;
  if (r24 <= SLIDE_RAIN_EDGES[1]) return 0;
  if (r24 <= SLIDE_RAIN_EDGES[2]) return 1;
  return 2;
}

/** Số khối 24h có mưa liền trước; `exact` = false khi gặp khối thiếu số trước khi gặp khối khô (số thật >= n). */
export function wetDaysBefore(prior: (number | null)[] | undefined): { n: number; exact: boolean } {
  let n = 0;
  for (const v of prior ?? []) {
    if (v === null) return { n, exact: false };
    if (v < SLIDE_WET_DAY_MM) return { n, exact: true };
    n++;
  }
  return { n, exact: n > 2 };   // hết số mà vẫn mưa: đủ 3 khối thì chắc chắn 'trên 2 ngày', ít hơn thì chưa biết
}

export type SlideStatus = 'BELOW' | 'NO_PRIOR' | 'LEVEL' | 'NO_DATA' | 'LOWLAND';
export interface SlideRisk {
  status: SlideStatus;
  r24: number | null; wetDays: number; wetExact: boolean;
  /** Khoảng cấp [thấp nhất, cao nhất] trên mọi vùng nguy cơ có xếp cấp; null nếu nhóm đó không có ô nào xếp cấp. */
  kv12: [number, number] | null; kv34: [number, number] | null;
}

function range(kvs: number[], rc: number): [number, number] | null {
  const v = kvs.flatMap(k => SLIDE_TABLE[k][rc]).filter(x => x > 0);
  return v.length ? [Math.min(...v), Math.max(...v)] : null;
}

/** Áp Điều 46 cho một điểm. Thuần, test được. */
export function slideRiskQD18(wx: Pick<PointWx, 'rain24h' | 'rainPrior'> | null, elevM: number | null = null): SlideRisk {
  const base = { r24: wx?.rain24h ?? null, wetDays: 0, wetExact: true, kv12: null, kv34: null };
  if (elevM !== null && elevM < TH.SLIDE_MIN_ELEV) return { ...base, status: 'LOWLAND' };
  if (!wx || wx.rain24h === null) return { ...base, status: 'NO_DATA' };
  const rc = slideRainClass(wx.rain24h);
  const wd = wetDaysBefore(wx.rainPrior);
  const out = { ...base, wetDays: wd.n, wetExact: wd.exact };
  if (rc === null) return { ...out, status: 'BELOW' };
  // Điều kiện mưa trước: lớp 0 cần 1-2 ngày, lớp 1-2 cần trên 2 ngày. Thiếu số thì xét cả khả năng số thật lớn hơn.
  const canShort = wd.n <= 2 && (wd.n >= 1 || !wd.exact);
  const canLong = wd.n > 2 || !wd.exact;
  const ok = rc === 0 ? canShort : canLong;
  if (!ok) return { ...out, status: 'NO_PRIOR' };
  return { ...out, status: 'LEVEL', kv12: range([0, 1], rc), kv34: range([2, 3], rc) };
}

export const fmtRange = (r: [number, number] | null) => (r === null ? 'không xếp cấp' : r[0] === r[1] ? `cấp ${r[0]}` : `cấp ${r[0]}-${r[1]}`);
