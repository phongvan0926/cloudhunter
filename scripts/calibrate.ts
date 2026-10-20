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
 *   npx vite-node scripts/calibrate.ts --kem-nhan-yeu           # chấm cả nhãn Facebook độ tin thấp (để so)
 *
 * Từ 19/10/2026 có thêm nguồn giữa hai nguồn trên: nhãn tự động từ bài Facebook hằng ngày của người
 * làm du lịch tại chỗ (fb-auto-reports.json, xem AGENTS.md "Nhãn tự động từ Facebook"). Thứ bậc khi
 * cùng điểm + ngày: người đi ĐÈ Facebook ĐÈ vệ tinh. Số in ra tách theo nguồn.
 */
import { readdirSync, readFileSync, existsSync } from 'fs';
import { MOUNTAIN_DB } from '../constants/mountains';
import { WORTH_GOING_SCORE, isWorthGoing } from '../services/cloudScoreEngine';
import { fbUsable, FB_MIN_CONFIDENCE } from './fb-auto';

const DIR = 'data/observations';

type Truth = 'SEA' | 'NO_SEA';
interface Row {
  date: string; key: string; name: string;
  truth: Truth; truthSrc: string; truthDetail: string;
  score: number; status: string; agreement: number;
  deltaH?: number | null; worthGoing?: boolean;   // có từ engine-2.8; bản chụp cũ không có
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
        deltaH: (p as any).deltaH, worthGoing: (p as any).worthGoing,
        engineVersion: (p as any).engineVersion });
    }
  }

  // Nguồn 1 — báo cáo thực địa (ưu tiên: cùng điểm+ngày thì ĐÈ nhãn vệ tinh).
  // Đọc cả kho trong repo lẫn file người dùng truyền vào dòng lệnh.
  const repoReports = `${DIR}/field-reports.json`;
  const args = process.argv.slice(2);
  const withWeak = args.includes('--kem-nhan-yeu');

  // Nguồn 1,5 — nhãn tự động từ Facebook. Đè vệ tinh (người tại chỗ thấy được sương mỏng thung lũng
  // mà hồng ngoại 2km không thấy, xem 02/09), bị báo cáo người đi đè ở bước dưới.
  const fbFile = `${DIR}/fb-auto-reports.json`;
  const fbWeak: string[] = [];
  if (existsSync(fbFile)) {
    for (const r of JSON.parse(readFileSync(fbFile, 'utf-8'))) {
      if (!fbUsable(r) && !(withWeak && r.seaLevel !== 'UNKNOWN')) { fbWeak.push(`${r.date} ${r.spotKey} ${r.seaLevel} tin ${r.confidence}${r.needsReview ? ' cần người xem' : ''}`); continue; }
      if (r.timeOfDay && r.timeOfDay !== 'DAWN') continue;
      const p = fc[r.date]?.[r.spotKey];
      if (!p) { skipped.push(`${r.date} ${r.spotKey}: chưa chụp dự báo cho ngày này (nhãn Facebook)`); continue; }
      const truth: Truth = (r.seaLevel === 'BELOW' || r.seaLevel === 'AT_EYE') ? 'SEA' : 'NO_SEA';
      const row: Row = { date: r.date, key: r.spotKey, name: MOUNTAIN_DB[r.spotKey]?.name || r.locationName, truth,
        truthSrc: 'facebook', truthDetail: `${r.seaLevel}${r.thickness ? ' ' + r.thickness : ''} tin ${r.confidence} — "${r.evidence?.[0]?.text ?? ''}"`,
        score: p.score, status: p.status, agreement: p.agreement, perModel: (p as any).perModel,
        deltaH: (p as any).deltaH, worthGoing: (p as any).worthGoing, engineVersion: (p as any).engineVersion };
      const i = rows.findIndex(x => x.date === r.date && x.key === r.spotKey);
      if (i >= 0) rows[i] = row; else rows.push(row);
    }
  }

  const reportFiles = [...(existsSync(repoReports) ? [repoReports] : []), ...args.filter(a => !a.startsWith('--'))];
  for (const arg of reportFiles) {
    for (const r of JSON.parse(readFileSync(arg, 'utf-8'))) {
      const key = r.spotKey || nameToKey(r.locationName);
      if (!key) { skipped.push(`${r.date} ${r.locationName}: không map được về điểm trong thư viện`); continue; }
      // App chỉ dự báo RẠNG SÁNG. Báo cáo quan sát ban đêm/chiều (vd ảnh đăng 23:29 ngày 12/10)
      // mà ghép vào dự báo rạng sáng cùng ngày là chấm app trên một thời điểm cách 18 tiếng.
      // Giữ trong kho làm tư liệu, nhưng KHÔNG chấm — và nói ra, không lặng lẽ bỏ.
      // 'DAWN' = trong khung quan sát 04:00-09:00 của engine (chuẩn hoá 15/10/2026); sau 09:00 là MORNING.
      if (r.timeOfDay && r.timeOfDay !== 'DAWN') {
        skipped.push(`${r.date} ${key}: quan sát lúc ${r.timeOfDay}${r.observedAt ? ' ' + r.observedAt : ''}, không phải rạng sáng — không chấm`); continue;
      }
      const p = fc[r.date]?.[key];
      const score = r.predictedScore ?? p?.score;
      const status = r.predictedStatus ?? p?.status;
      if (score === undefined || status === undefined) {
        skipped.push(`${r.date} ${key}: không biết app đã dự báo gì (báo cáo không kèm điểm, cũng chưa chụp)`); continue;
      }
      const truth: Truth = (r.seaLevel === 'BELOW' || r.seaLevel === 'AT_EYE') ? 'SEA' : 'NO_SEA';
      const i = rows.findIndex(x => x.date === r.date && x.key === key);
      const row: Row = { date: r.date, key, name: MOUNTAIN_DB[key]?.name || r.locationName, truth,
        truthSrc: 'người đi', truthDetail: r.seaLevel + (r.duration === 'SHORT' ? ' (tan nhanh)' : '') + (r.note ? ` — "${r.note}"` : ''),
        score, status, agreement: p?.agreement ?? 0, perModel: (p as any)?.perModel,
        deltaH: (p as any)?.deltaH, worthGoing: (p as any)?.worthGoing,
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

  const evalOne = (label: string, predSea: (r: Row) => boolean, only?: Row[]) => {
    const set = only ?? rows;
    let tp = 0, fp = 0, fn = 0, tn = 0;
    for (const r of set) {
      const p = predSea(r);
      if (r.truth === 'SEA') p ? tp++ : fn++;
      else p ? fp++ : tn++;
    }
    const acc = (tp + tn) / set.length * 100;
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
    + `${rows.filter(r => r.truthSrc === 'facebook').length} từ nhãn Facebook${withWeak ? ' (KỂ CẢ nhãn yếu)' : ` (độ tin ≥ ${FB_MIN_CONFIDENCE})`}, `
    + `${rows.filter(r => r.truthSrc === 'vệ tinh').length} từ vệ tinh`);

  evalOne(`Theo TRẠNG THÁI (STATIC/FLOWING/FLUCTUATING/ROLLING = có biển mây)`, r => SEA_STATUS.has(r.status));
  evalOne(`Theo NGƯỠNG ĐIỂM CŨ (>= ${WORTH_GOING_SCORE}/100 = khuyên đi) — chỉ để so sánh`, r => r.score >= WORTH_GOING_SCORE);
  // Luật "đáng đi" hiện hành (engine-2.8). Bản chụp cũ không có deltaH → không ước được ΔH,
  // luật này trả false ⇒ với dữ liệu cũ dòng dưới là cận DƯỚI của độ nhạy, không phải số thật.
  const oldRows = rows.filter(r => r.deltaH === undefined).length;
  // TÍNH LẠI từ nguyên liệu (status/agreement/ΔH) chứ KHÔNG đọc cờ worthGoing đã đóng băng
  // trong bản chụp: nếu đọc cờ cũ thì mọi thay đổi luật đều "không thấy tác dụng gì" trên
  // lịch sử — đúng cái bẫy đã mắc một lần khi thử siết ngưỡng ΔH.
  evalOne(`Theo LUẬT ĐÁNG ĐI hiện hành, tính lại trên lịch sử`
    + (oldRows ? ` — ${oldRows}/${rows.length} dòng từ bản chụp cũ thiếu ΔH, tính là KHÔNG khuyên` : ''),
    r => isWorthGoing({ status: r.status as any, agreement: r.agreement, deltaH: r.deltaH ?? null }));
  // MỨC "CHẮC ĂN" ĐANG THEO DÕI — CHƯA phải luật của app (14/10/2026).
  // Ngày 13/10 app khuyên đi đúng Tà Chì Nhù + Fansipan (người đi xác nhận, Fansipan có ảnh
  // Timemark 06:19) với điểm 66, và đo trên cả kho thì "đáng đi ∧ điểm ≥ 65" đúng ~53% so với
  // ~7,5% của luật hiện hành. Nhưng 7/8 ca trúng đến từ CÙNG một buổi sáng 13/10 — chỉ 2 ngày
  // độc lập. Đổi luật app trên 2 ngày là đúng kiểu overfit đã ghi trong AGENTS.md. Nên chỉ in ra
  // đây để mỗi ngày tự cộng mẫu; số NGÀY độc lập trong các ca trúng là con số phải nhìn trước.
  const STRONG_SCORE = 65;
  const strongPred = (r: Row) => isWorthGoing({ status: r.status as any, agreement: r.agreement, deltaH: r.deltaH ?? null })
    && r.score >= STRONG_SCORE;
  evalOne(`Mức "CHẮC ĂN" đang theo dõi: đáng đi ∧ điểm ≥ ${STRONG_SCORE} (CHƯA dùng trong app)`, strongPred);
  // Cùng luật, tách theo NGUỒN sự thật — vệ tinh mù sương mỏng thung lũng (02/09), Facebook chỉ có
  // vài điểm và người đăng làm dịch vụ; số gộp che mất chỗ từng nguồn nói khác nhau.
  for (const src of ['người đi', 'facebook', 'vệ tinh']) {
    const sub = rows.filter(r => r.truthSrc === src);
    if (sub.length) evalOne(`   └ luật đáng đi, riêng nguồn ${src} (${sub.length} cặp)`,
      r => isWorthGoing({ status: r.status as any, agreement: r.agreement, deltaH: r.deltaH ?? null }), sub);
  }
  const strongDays = new Set(rows.filter(r => strongPred(r) && r.truth === 'SEA').map(r => r.date));
  console.log(`    ca trúng đến từ ${strongDays.size} NGÀY độc lập: ${[...strongDays].sort().join(', ') || '—'}`
    + (strongDays.size < 5 ? '  ⚠️  <5 ngày — chưa đủ để đổi luật' : ''));

  // NGÀY DIỆN RỘNG (20/10/2026) — chấm theo NGÀY, không theo điểm. Hai giả thuyết, ngưỡng chốt hôm đặt ra
  // (từ 13, 18, 19/10, tức trong mẫu), từ 20/10 trở đi mới là phép thử thật:
  //   A. bản chụp tối hôm trước có ≥ 4 đỉnh "đáng đi ∧ điểm ≥ 65"  ⇒ ngày nhiều đỉnh có biển mây
  //   B. Sa Pa 05h (regional-days.json): gió 850 ≤ 3 km/h, mưa 0-6h ≤ 0,3mm, T−Td 2m ≤ 0,3°C, khí áp 24h không giảm
  // Sự thật "diện rộng" = ≥ 4 điểm có biển mây (mọi nguồn, đã đè theo thứ bậc). Ngày nhìn được < 15 điểm
  // mà chưa tới 4 điểm có thì là KHÔNG RÕ, không tính là âm tính. Đừng chỉnh các số này theo kết quả.
  const WIDE_PEAKS = 4, WIDE_TRUTH = 4, WIDE_MIN_SEEN = 15, WIDE_IN_SAMPLE_END = '2026-10-19';
  const regFile = `${DIR}/regional-days.json`;
  const reg = existsSync(regFile) ? JSON.parse(readFileSync(regFile, 'utf-8')).days : {};
  const predB = (d: string): boolean | null => {
    const s = reg[d]?.SAPA;
    return s ? s.wind850 <= 3 && s.rainNight <= 0.3 && s.dpd2m <= 0.3 && s.dmsl24 >= 0 : null;
  };
  const wideRows = Object.keys(fc).sort().map(d => {
    const peaks = Object.values(fc[d]).filter((s: any) => s.score >= STRONG_SCORE
      && isWorthGoing({ status: s.status, agreement: s.agreement, deltaH: s.deltaH ?? null })).length;
    const day = rows.filter(r => r.date === d);
    const sea = day.filter(r => r.truth === 'SEA').length;
    const truth: boolean | null = sea >= WIDE_TRUTH ? true : day.length >= WIDE_MIN_SEEN ? false : null;
    return { d, peaks, seen: day.length, sea, truth, a: peaks >= WIDE_PEAKS, b: predB(d) };
  });
  const score = (pick: (w: typeof wideRows[0]) => boolean | null, set: typeof wideRows) => {
    let tp = 0, fp = 0, fn = 0, tn = 0;
    for (const w of set) {
      const p = pick(w);
      if (w.truth === null || p === null) continue;
      if (w.truth) p ? tp++ : fn++; else p ? fp++ : tn++;
    }
    return `báo đúng ${tp} · bỏ sót ${fn} · báo nhầm ${fp} · đúng không ${tn}`;
  };
  console.log(`\n  NGÀY DIỆN RỘNG (≥ ${WIDE_TRUTH} điểm có biển mây) — chấm theo ngày, CHƯA dùng trong app`);
  for (const [lbl, set] of [['trong mẫu ≤ ' + WIDE_IN_SAMPLE_END, wideRows.filter(w => w.d <= WIDE_IN_SAMPLE_END)],
    ['NGOÀI MẪU (phép thử thật)', wideRows.filter(w => w.d > WIDE_IN_SAMPLE_END)]] as const) {
    console.log(`    ${lbl}:  A (≥ ${WIDE_PEAKS} đỉnh ≥ ${STRONG_SCORE}) ${score(w => w.a, set)}`);
    console.log(`    ${' '.repeat(lbl.length)}   B (Sa Pa lặng, khô đêm, bão hoà)  ${score(w => w.b, set)}`);
  }
  const shown = wideRows.filter(w => w.a || w.b || w.truth || w.d > WIDE_IN_SAMPLE_END);
  console.log(`    ngày đáng xem (A hoặc B bật, hoặc diện rộng thật, hoặc ngoài mẫu):`);
  for (const w of shown) console.log(`      ${w.d}  A ${String(w.peaks).padStart(2)} đỉnh${w.a ? ' ✓' : '  '}  B ${w.b === null ? '—' : w.b ? '✓' : '·'}`
    + `   thật: ${w.sea}/${w.seen} điểm có  ⇒ ${w.truth === null ? 'không rõ' : w.truth ? 'DIỆN RỘNG' : 'không'}`);

  // …và app THỰC SỰ đã khuyên gì lúc đó (cờ lưu trong bản chụp) — hai dòng lệch nhau nghĩa là
  // luật đã đổi kể từ lần chụp.
  const withFlag = rows.filter(r => r.worthGoing !== undefined);
  if (withFlag.length) {
    const tp = withFlag.filter(r => r.worthGoing && r.truth === 'SEA').length;
    const fp = withFlag.filter(r => r.worthGoing && r.truth !== 'SEA').length;
    console.log(`\n  App ĐÃ khuyên đi lúc chụp (cờ lưu trong bản chụp, ${withFlag.length} dòng): `
      + `báo đúng ${tp} · báo nhầm ${fp}`);
  }

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
  if (fbWeak.length) console.log(`\n  Nhãn Facebook KHÔNG chấm (độ tin < ${FB_MIN_CONFIDENCE} hoặc cần người xem; --kem-nhan-yeu để chấm thử): ${fbWeak.length}\n     ${fbWeak.join('\n     ')}`);
  if (skipped.length) {
    console.log(`\n  (bỏ qua ${skipped.length} mục không chấm được — ${skipped.length && skipped[0]})`);
  }
}

main();
