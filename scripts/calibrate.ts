/**
 * calibrate.ts — CHẤM ĐIỂM CHÍNH APP: ghép "app dự báo gì" với "thực tế ra sao", rồi in ra
 * bảng đúng/sai và những ngày trượt để biết phải chỉnh chỗ nào.
 *
 * Ba nguồn sự thật, xếp theo độ tin cậy:
 *   1. Báo cáo thực địa của người dùng (file JSON xuất từ app) — chuẩn nhất, nhưng thưa.
 *   2. Nhãn vệ tinh Himawari (tools/verify_satellite.py) — dày đặc và tự động, nhưng MÙ khi
 *      có tầng mây cao che phía trên; những ngày đó bị loại khỏi phép chấm, không đoán bừa.
 *   3. (không dùng mô hình dự báo làm sự thật — đó chính là thứ đang bị đem ra chấm.)
 *
 * Chạy:
 *   npx vite-node scripts/calibrate.ts                          # dùng data/observations/
 *   npx vite-node scripts/calibrate.ts bao-cao-thuc-dia.json    # kèm báo cáo người dùng
 */
import { readdirSync, readFileSync, existsSync } from 'fs';
import { MOUNTAIN_DB } from '../constants/mountains';
import { WORTH_GOING_SCORE } from '../services/cloudScoreEngine';

const DIR = 'data/observations';

type Truth = 'SEA' | 'NO_SEA';
interface Row {
  date: string; key: string; name: string;
  truth: Truth; truthSrc: string; truthDetail: string;
  score: number; status: string; agreement: number;
  perModel?: { model: string; score: number; status: string; cloudTop: number | null }[];
  engineVersion?: string;   // engine nào đã TẠO RA bản chụp — để cảnh báo số liệu cũ
}

/** Trạng thái engine nào nghĩa là "ngắm được biển mây". FOG = chìm trong mây, KHÔNG tính. */
const SEA_STATUS = new Set(['STATIC', 'FLOWING', 'FLUCTUATING', 'ROLLING']);

function nameToKey(name: string): string | null {
  if (MOUNTAIN_DB[name]) return name;
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
  const t = norm(name);
  for (const [k, m] of Object.entries(MOUNTAIN_DB)) {
    if (norm(m.name) === t) return k;
    if ((m.aliases || []).some(a => norm(a) === t)) return k;
  }
  return null;
}

function main() {
  if (!existsSync(DIR)) throw new Error(`Chưa có thư mục ${DIR} — chạy snapshot-forecast.ts và verify_satellite.py trước.`);
  const files = readdirSync(DIR);

  // "app dự báo gì": date -> key -> {score,status,agreement}
  const fc: Record<string, Record<string, { score: number; status: string; agreement: number }>> = {};
  for (const f of files.filter(f => f.endsWith('-forecast.json'))) {
    const j = JSON.parse(readFileSync(`${DIR}/${f}`, 'utf-8'));
    fc[j.date] = Object.fromEntries(j.spots.map((s: any) => [s.key, { ...s, engineVersion: j.engineVersion }]));
  }

  const rows: Row[] = [];
  const skipped: string[] = [];

  // Nguồn 2 — vệ tinh
  for (const f of files.filter(f => f.endsWith('-satellite.json'))) {
    for (const o of JSON.parse(readFileSync(`${DIR}/${f}`, 'utf-8'))) {
      const p = fc[o.date]?.[o.key];
      if (!p) { skipped.push(`${o.date} ${o.key}: chưa chụp dự báo cho ngày này`); continue; }
      if (o.verdict === 'BLOCKED_ABOVE' || o.verdict === 'NO_DATA') {
        skipped.push(`${o.date} ${o.key}: vệ tinh không nhìn được xuống dưới (${o.verdict})`); continue;
      }
      const truth: Truth = (o.verdict === 'SEA_CONFIRMED' || o.verdict === 'SEA_MARGINAL') ? 'SEA' : 'NO_SEA';
      rows.push({ date: o.date, key: o.key, name: o.name, truth, truthSrc: 'vệ tinh',
        truthDetail: `${o.verdict}, đỉnh mây ${o.cloudTopMedian_m ?? '—'}m`,
        score: p.score, status: p.status, agreement: p.agreement, perModel: (p as any).perModel,
        engineVersion: (p as any).engineVersion });
    }
  }

  // Nguồn 1 — báo cáo thực địa (ưu tiên: cùng điểm+ngày thì ĐÈ nhãn vệ tinh).
  // Đọc cả kho trong repo lẫn file người dùng truyền vào dòng lệnh.
  const repoReports = `${DIR}/field-reports.json`;
  const reportFiles = [...(existsSync(repoReports) ? [repoReports] : []), ...process.argv.slice(2)];
  for (const arg of reportFiles) {
    for (const r of JSON.parse(readFileSync(arg, 'utf-8'))) {
      const key = r.spotKey || nameToKey(r.locationName);
      if (!key) { skipped.push(`${r.date} ${r.locationName}: không map được về điểm trong thư viện`); continue; }
      const p = fc[r.date]?.[key];
      const score = r.predictedScore ?? p?.score;
      const status = r.predictedStatus ?? p?.status;
      if (score === undefined || status === undefined) {
        skipped.push(`${r.date} ${key}: không biết app đã dự báo gì (báo cáo không kèm điểm, cũng chưa chụp)`); continue;
      }
      const truth: Truth = (r.seaLevel === 'BELOW' || r.seaLevel === 'AT_EYE') ? 'SEA' : 'NO_SEA';
      const i = rows.findIndex(x => x.date === r.date && x.key === key);
      const row: Row = { date: r.date, key, name: MOUNTAIN_DB[key]?.name || r.locationName, truth,
        truthSrc: 'người đi', truthDetail: r.seaLevel + (r.note ? ` — "${r.note}"` : ''),
        score, status, agreement: p?.agreement ?? 0, perModel: (p as any)?.perModel,
        engineVersion: (p as any)?.engineVersion };
      if (i >= 0) rows[i] = row; else rows.push(row);
    }
  }

  if (rows.length === 0) {
    console.log('Chưa có cặp (dự báo × sự thật) nào để chấm.\n');
    skipped.slice(0, 10).forEach(s => console.log('   bỏ qua: ' + s));
    console.log(`\nCần: (1) chạy snapshot-forecast.ts hằng ngày, (2) verify_satellite.py sau rạng sáng,`);
    console.log(`     (3) xuất báo cáo thực địa từ app rồi truyền vào lệnh này.`);
    return;
  }

  const evalOne = (label: string, predSea: (r: Row) => boolean) => {
    let tp = 0, fp = 0, fn = 0, tn = 0;
    for (const r of rows) {
      const p = predSea(r);
      if (r.truth === 'SEA') p ? tp++ : fn++;
      else p ? fp++ : tn++;
    }
    const acc = (tp + tn) / rows.length * 100;
    const recall = tp + fn ? tp / (tp + fn) * 100 : NaN;
    const prec = tp + fp ? tp / (tp + fp) * 100 : NaN;
    console.log(`\n  ${label}`);
    console.log(`    đúng ${acc.toFixed(0)}%  |  bắt được ${Number.isNaN(recall) ? '—' : recall.toFixed(0) + '%'} số ngày CÓ biển mây`
      + `  |  khi app báo có thì đúng ${Number.isNaN(prec) ? '—' : prec.toFixed(0) + '%'}`);
    console.log(`    báo đúng có ${tp} · BỎ SÓT ${fn} · báo nhầm có ${fp} · báo đúng không ${tn}`);
    return { fn, fp };
  };

  console.log(`\n📊 Hiệu chuẩn CloudHunter — ${rows.length} cặp (dự báo × sự thật), `
    + `${rows.filter(r => r.truthSrc === 'người đi').length} từ người đi, `
    + `${rows.filter(r => r.truthSrc === 'vệ tinh').length} từ vệ tinh`);

  evalOne(`Theo TRẠNG THÁI (STATIC/FLOWING/FLUCTUATING/ROLLING = có biển mây)`, r => SEA_STATUS.has(r.status));
  evalOne(`Theo NGƯỠNG ĐIỂM (>= ${WORTH_GOING_SCORE}/100 = khuyên đi)`, r => r.score >= WORTH_GOING_SCORE);

  // Mô hình nào đúng? — bảng này là căn cứ để sau này quyết định có nên trọng số hoá mô hình.
  const perModel: Record<string, { hit: number; n: number }> = {};
  for (const r of rows) {
    for (const pm of r.perModel || []) {
      const s = (perModel[pm.model] ||= { hit: 0, n: 0 });
      s.n++;
      if ((r.truth === 'SEA') === SEA_STATUS.has(pm.status)) s.hit++;
    }
  }
  const pmRows = Object.entries(perModel).sort((a, b) => (b[1].hit / b[1].n) - (a[1].hit / a[1].n));
  if (pmRows.length) {
    console.log(`\n  TỪNG MÔ HÌNH đúng bao nhiêu ngày (chưa đủ số liệu để trọng số hoá, chỉ để theo dõi):`);
    for (const [m, v] of pmRows) console.log(`     ${m.padEnd(22)} ${v.hit}/${v.n}`);
    const stale = rows.filter(r => r.engineVersion && r.engineVersion < 'engine-2.4').length;
    if (stale > 0) {
      console.log(`     ⚠️  ${stale}/${rows.length} dòng đến từ bản chụp engine ≤2.3, thời điểm mà GFS được`);
      console.log(`        cộng thêm +8 "lớp biên đêm mỏng" trong 92% số ca còn ICON/UKMO không bao giờ có`);
      console.log(`        biến đó. Phần chênh lệch giữa GFS và các mô hình khác vì thế CÓ PHẦN là do`);
      console.log(`        thiên vị của engine, không thuần tuý là mô hình giỏi hơn. Thiên vị đã bỏ ở`);
      console.log(`        engine-2.4 — chỉ tin bảng này sau khi đủ ngày chụp bằng engine ≥2.4.`);
    }
  }

  const misses = rows.filter(r => r.truth === 'SEA' && !SEA_STATUS.has(r.status));
  const alarms = rows.filter(r => r.truth === 'NO_SEA' && SEA_STATUS.has(r.status));
  if (misses.length) {
    console.log(`\n  ❌ BỎ SÓT (thực tế có, app không báo) — đây là chỗ cần chỉnh trước:`);
    misses.slice(0, 20).forEach(r => console.log(
      `     ${r.date} ${r.name.slice(0, 28).padEnd(30)} app: ${r.score}/100 ${r.status.padEnd(12)} · thật: ${r.truthDetail} [${r.truthSrc}]`));
  }
  if (alarms.length) {
    console.log(`\n  ⚠️  BÁO NHẦM (app báo có, thực tế không):`);
    alarms.slice(0, 20).forEach(r => console.log(
      `     ${r.date} ${r.name.slice(0, 28).padEnd(30)} app: ${r.score}/100 ${r.status.padEnd(12)} · thật: ${r.truthDetail} [${r.truthSrc}]`));
  }
  if (skipped.length) {
    console.log(`\n  (bỏ qua ${skipped.length} mục không chấm được — ${skipped.length && skipped[0]})`);
  }
}

main();
