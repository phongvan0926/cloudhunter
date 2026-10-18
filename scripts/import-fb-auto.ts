/**
 * import-fb-auto.ts — nhập nhãn tự động từ bài Facebook hằng ngày (bộ thu chạy ở máy nhà, ngoài repo;
 * đường dẫn ghi trong sổ tay riêng, không ghi vào repo public) vào kho `data/observations/fb-auto-reports.json`. Xem AGENTS.md mục "Nhãn tự động từ Facebook".
 *
 * Chỉ nhập NHÃN. Không chép ảnh, tên người đăng, mã bài hay đường dẫn nhóm (repo public).
 * Tệp đích được dựng lại từ đầu mỗi lần (nhãn của bộ thu có thể đổi khi gom thêm bài cùng ngày) —
 * khác bản chụp dự báo, nhãn sự thật không phải bằng chứng "app đã nói gì trước".
 *
 * Chạy: npx vite-node scripts/import-fb-auto.ts <đường-dẫn-nhan-ngay.json>   (hoặc biến CH_FB_LABELS)
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { MOUNTAIN_DB } from '../constants/mountains';
import { FB_MIN_CONFIDENCE, fbUsable } from './fb-auto';

const SRC = process.argv[2] || process.env.CH_FB_LABELS || '';
const DIR = 'data/observations';
const OUT = `${DIR}/fb-auto-reports.json`;

const DAY: Record<string, string> = { DAY: 'THICK', MONG: 'THIN', LUA_THUA: 'SPARSE' };

function main() {
  if (!SRC) throw new Error('Cần đường dẫn nhan-ngay.json (tham số hoặc CH_FB_LABELS).');
  if (!existsSync(SRC)) throw new Error(`Không thấy ${SRC} — bộ thu chưa chạy, hoặc đang ở máy khác.`);
  const src = JSON.parse(readFileSync(SRC, 'utf-8'));
  if (!Array.isArray(src) || src.length === 0) throw new Error(`${SRC} rỗng hoặc sai dạng — không ghi đè kho bằng 0 nhãn.`);

  const out = src.map((r: any) => {
    if (!MOUNTAIN_DB[r.spotKey]) throw new Error(`spotKey lạ: ${r.spotKey}`);
    // Dấu giờ in trên ảnh (Timemark) sớm nhất. Có và nằm trong khung 04-09h thì là DAWN thật;
    // còn lại chỉ biết giờ ĐĂNG, nên để trống timeOfDay như các bài MXH khác (vẫn được chấm).
    const stamps = r.bang_chung.flatMap((b: any) => (b.theo_gio || []).map((t: any) => t.gio)).sort();
    const first = stamps[0] as string | undefined;
    const dawn = first && first >= '04:00' && first <= '09:00';
    return {
      id: `${r.date}-${r.spotKey}-fb`,
      spotKey: r.spotKey, locationName: MOUNTAIN_DB[r.spotKey].name, date: r.date,
      source: 'FB_AUTO',
      seaLevel: r.seaLevel === 'KHONG_RO' ? 'UNKNOWN' : r.seaLevel,
      duration: r.duration ?? undefined,
      thickness: DAY[r.do_day] ?? undefined,
      ...(dawn ? { timeOfDay: 'DAWN', observedAt: first } : {}),
      confidence: r.do_tin,
      needsReview: r.can_nguoi_xem || undefined,
      firstPostAt: r.gio_bai_som_nhat,
      evidence: r.bang_chung.map((b: any) => ({
        postedAt: b.gio_dang, seaLevel: b.seaLevel, text: b.trich,
        stamps: (b.theo_gio || []).map((t: any) => `${t.gio} ${t.seaLevel}`),
      })),
    };
  });
  writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');

  // Đối chiếu với kho báo cáo người nhìn — đo độ tin của chính bộ gắn nhãn, mỗi lần nhập.
  const field = JSON.parse(readFileSync(`${DIR}/field-reports.json`, 'utf-8'))
    .filter((f: any) => !f.timeOfDay || f.timeOfDay === 'DAWN');
  const sea = (s: string) => s === 'BELOW' || s === 'AT_EYE';
  let same = 0, diff = 0;
  console.log(`Đã ghi ${out.length} nhãn → ${OUT}  (đủ điều kiện chấm, độ tin ≥ ${FB_MIN_CONFIDENCE}: `
    + `${out.filter((o: any) => fbUsable(o)).length})`);
  console.log('\nĐối chiếu với báo cáo người nhìn cùng điểm + ngày (rạng sáng hoặc không rõ giờ):');
  for (const o of out) {
    const f = field.find((x: any) => x.spotKey === o.spotKey && x.date === o.date);
    if (!f) continue;
    const ok = o.seaLevel !== 'UNKNOWN' && sea(o.seaLevel) === sea(f.seaLevel);
    if (o.seaLevel !== 'UNKNOWN') ok ? same++ : diff++;
    console.log(`   ${o.date} ${o.spotKey.padEnd(14)} FB ${o.seaLevel.padEnd(7)} tin ${o.confidence}  ·  người nhìn ${f.seaLevel}`
      + `  ${o.seaLevel === 'UNKNOWN' ? '(FB bỏ trống)' : ok ? '✓' : '✗ LỆCH'}`);
  }
  console.log(`   ⇒ khớp có/không ${same}/${same + diff}`);
  const review = out.filter((o: any) => o.needsReview);
  if (review.length) console.log(`\nCần người xem (calibrate KHÔNG chấm): ${review.map((o: any) => `${o.date} ${o.spotKey}`).join(', ')}`);
}

main();
