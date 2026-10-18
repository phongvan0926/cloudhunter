/** Luật dùng chung cho nhãn tự động từ Facebook (import-fb-auto.ts ghi, calibrate.ts đọc). */

/** Ngưỡng độ tin để calibrate CHẤM nhãn. Chốt 19/10/2026 TRƯỚC khi chạy calibrate trên nhãn, từ chính
 *  thang của bộ gắn nhãn: bài chỉ có giờ đăng mà không rõ buổi bị kẹp ≤0,5, nhãn mâu thuẫn hoặc lệch
 *  ngày cũng ≤0,5. Đừng chỉnh số này cho vừa kết quả chấm. */
export const FB_MIN_CONFIDENCE = 0.6;

export function fbUsable(o: { seaLevel: string; confidence: number; needsReview?: boolean }) {
  return o.seaLevel !== 'UNKNOWN' && !o.needsReview && o.confidence >= FB_MIN_CONFIDENCE;
}
