/**
 * Vòng TỰ ĐO / TỰ BẬT CỜ / TỰ LÙI cho cổng bóng agy (phiếu g2448). Luật đăng ký trước trong NHAT-KY-HIEU-CHINH.md
 * (4ec0db6 + 824f85b). Chỉ code, 0 token, 0 lượt Open-Meteo (chỉ đọc kho). "Tự điều chỉnh" = bật/tắt `data/agy-gate-flag.json`.
 *
 *   npx vite-node scripts/agy-gate-loop.ts [--dir data/observations] [--flag data/agy-gate-flag.json] [--out data] [--log NHAT-KY-HIEU-CHINH.md]
 *                                          [--hom-nay YYYY-MM-DD] [--khong-bao]
 * Thoát 0 = đo xong (kể cả "chưa đủ mẫu"); 1 = LỖI ĐO (báo đỏ, KHÔNG đổi cờ, không ghi 0); 3 = lỗi đọc/ghi.
 * Báo tin: biến môi trường BAO_CHUNG = đường dẫn bao_chung.py (đặt trong unit systemd, không ghi vào kho công khai).
 */
import './agy-lib-mode';
import { readFileSync, writeFileSync, appendFileSync, existsSync, readdirSync } from 'fs';
import { spawnSync } from 'child_process';
import { buildRows, evaluateEngine, isReady, count, lossFA, lossTP, type Row } from './score-agy-gate';

export interface Look { date: string; result: 'DAT' | 'CHUA_DU' }
export interface Flag {
  enabled: boolean; locked: boolean; auto: boolean; engine: string | null;
  state: 'bong' | 'bat' | 'khong_giu' | 'het_luot_chua_du' | 'da_lui';
  since: string | null; looks: Look[]; note?: string;
}
export type Action =
  | { kind: 'loi_do'; why: string }
  | { kind: 'chua_du_mau' } | { kind: 'cho_luot'; next: string } | { kind: 'khoa' } | { kind: 'giu_bat' }
  | { kind: 'luot'; result: 'DAT' | 'CHUA_DU' | 'TRUOT'; flag: Flag; enabled?: boolean; ev: ReturnType<typeof evaluateEngine> }
  | { kind: 'lui'; why: string; flag: Flag };

const LOOK_GAP = 14, MAX_LOOKS = 3, WATCH_DAYS = 60, FIRST_COL_DATE = '2026-11-21';
const addDays = (d: string, n: number) => new Date(Date.parse(d + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);

/** Sức khoẻ phép đo (g2448 sửa 4/5): rỗng khi đáng lẽ có, bản chụp cũ, > 10% điểm lỗi/thiếu cột trên 7 bản chụp có cột mới nhất. */
export function checkHealth(snaps: { date: string; spots: any[] }[], today: string): { ok: boolean; why?: string } {
  if (!snaps.length) return { ok: false, why: 'không đọc được bản chụp nào' };
  const sorted = [...snaps].sort((a, b) => a.date.localeCompare(b.date));
  const newest = sorted[sorted.length - 1];
  if (addDays(newest.date, 3) < today) return { ok: false, why: `bản chụp mới nhất ${newest.date} cũ hơn 3 ngày so với ${today}` };
  const withCol = sorted.filter(s => s.spots.some(x => 'agyGate' in x));
  if (!withCol.length) return newest.date >= FIRST_COL_DATE ? { ok: false, why: `bản chụp ${newest.date} (từ ${FIRST_COL_DATE}) không có cột agyGate` } : { ok: true };
  if (newest.date >= FIRST_COL_DATE && !newest.spots.some(x => 'agyGate' in x)) return { ok: false, why: `bản chụp mới nhất ${newest.date} mất cột agyGate` };
  const last = withCol.slice(-7).flatMap(s => s.spots);
  const bad = last.filter(x => !x.agyGate || x.agyGate.error).length;
  if (!last.length) return { ok: false, why: 'bản chụp có cột nhưng không có điểm nào' };
  if (bad / last.length > 0.1) return { ok: false, why: `${bad}/${last.length} điểm lỗi/thiếu cột trên 7 bản chụp mới nhất (> 10%)` };
  return { ok: true };
}

/** Tự lùi (R1-R3) trên CA MỚI từ khi bật (bản chụp có worthGoingBase). Chỉ trong 60 ngày sau khi bật. */
export function rollbackWhy(rows: Row[], flag: Flag, today: string): string | null {
  if (!flag.since || addDays(flag.since, WATCH_DAYS) < today) return null;
  const post = rows.filter(r => r.post && r.date >= flag.since! && r.src !== 'vệ tinh');
  const lost = post.filter(r => r.sea && r.worth && r.gate === 'khong');
  const lostDays = new Set(lost.map(r => r.date)).size;
  if (lostDays >= 2) return `R1: cổng loại ca CÓ biển mây của FIELD ở ${lostDays} ngày khác nhau`;
  if (lost.some(r => r.src === 'người đi')) return 'R2: cổng loại ca CÓ biển mây do người đi tận nơi báo';
  const c = count(post);
  if (c.tp + c.fn >= 8 && lossTP(c) > lossFA(c)) return 'R3: FIELD mới loại báo đúng nhiều hơn báo nhầm';
  return null;
}

export function decide(flag: Flag, rows: Row[], health: { ok: boolean; why?: string }, today: string, engine: string): Action {
  if (!health.ok) return { kind: 'loi_do', why: health.why || 'phép đo hỏng' };
  if (flag.enabled) {
    const why = rollbackWhy(rows, flag, today);
    if (why) return { kind: 'lui', why, flag: { ...flag, enabled: false, locked: true, state: 'da_lui', note: `lùi ${today}: ${why.slice(0, 2)}` } };
    return { kind: 'giu_bat' };
  }
  if (flag.locked || flag.looks.length >= MAX_LOOKS) return { kind: 'khoa' };
  let f = flag;
  if (f.engine !== engine) f = { ...f, engine, looks: [], note: `engine ${engine}: đặt lại bộ đếm lượt (${today})` };   // g2448 sửa 11
  const set = rows.filter(r => r.engine === engine);
  const field = set.filter(r => r.src !== 'vệ tinh');
  if (!isReady(field, today)) return { kind: 'chua_du_mau' };
  const last = f.looks[f.looks.length - 1];
  if (last && addDays(last.date, LOOK_GAP) > today) return { kind: 'cho_luot', next: addDays(last.date, LOOK_GAP) };
  const ev = evaluateEngine(set.filter(r => r.src === 'vệ tinh'), field, set.filter(r => r.src === 'người đi'));
  if (ev.verdict === 'KHONG_GIU') return { kind: 'luot', result: 'TRUOT', ev, flag: { ...f, locked: true, state: 'khong_giu', looks: [...f.looks, { date: today, result: 'CHUA_DU' }] } };
  const result = ev.verdict === 'DU_DIEU_KIEN' ? 'DAT' : 'CHUA_DU';
  const looks = [...f.looks, { date: today, result } as Look];
  if (result === 'DAT' && last?.result === 'DAT') return { kind: 'luot', result, ev, enabled: true, flag: { ...f, looks, enabled: true, state: 'bat', since: today } };
  return { kind: 'luot', result, ev, flag: { ...f, looks, state: looks.length >= MAX_LOOKS ? 'het_luot_chua_du' : 'bong' } };
}

// ---------------------------------------------------------------- IO
const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const vnToday = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
function notify(kind: 'hong' | 'on' | 'viec', text: string) {
  if (process.argv.includes('--khong-bao')) return;
  const bc = process.env.BAO_CHUNG;
  if (!bc) { console.error('⚠️ chưa đặt BAO_CHUNG: không gửi được tin báo'); return; }
  const a = kind === 'viec' ? ['viec', 'cloudhunter-doichieu', text] : ['ghi', 'cloudhunter-doichieu', 'doichieu-cong-agy', kind, text];
  const r = spawnSync('python3', [bc, ...a], { encoding: 'utf-8' });
  if (r.status !== 0) console.error('⚠️ gửi tin báo lỗi:', r.stderr || r.status);
}

export function report(rows: Row[], today: string, a: Action, engine: string) {
  const vt = rows.filter(r => r.src === 'vệ tinh'), fl = rows.filter(r => r.src !== 'vệ tinh'), pe = rows.filter(r => r.src === 'người đi');
  const ready = isReady(fl, today);
  const days = (s: Row[]) => new Set(s.map(r => r.date)).size;
  const raw = (s: Row[]) => { const c = count(s); return { n: s.length, ngay: days(s), baoDung: c.tp, botSot: c.fn, baoNham: c.fp, dungKhong: c.tn }; };
  const out: any = { ngay: today, engine, hanhDong: a.kind, duDieuKienCham: ready, vt: raw(vt), field: raw(fl), nguoiDi: raw(pe) };
  if (!ready) out.ghiChu = `chưa đủ mẫu: FIELD ${fl.length}/30 điểm-ngày và ${fl.filter(r => r.sea).length}/10 ca CÓ (hoặc từ 2026-12-20); không in số phụ thuộc cổng, không kết luận`;
  else {
    const ev = evaluateEngine(vt, fl, pe), pct = (x: number) => Number.isNaN(x) ? null : +(x * 100).toFixed(1);
    out.congG = { lossFA_vt: pct(lossFA(ev.cv)), lossTP_vt: pct(lossTP(ev.cv)), lossFA_field: pct(lossFA(ev.cf)), lossTP_field: pct(lossTP(ev.cf)),
      thieuDuLieuCong_vt: ev.noDataVT, p5LossFA: pct(ev.bs.p5Loss), p5Hieu: pct(ev.bs.p5Diff), K: ev.K, ketLuan: ev.verdict };
  }
  return out;
}

function main() {
  const DIR = arg('--dir', 'data/observations'), FLAG = arg('--flag', 'data/agy-gate-flag.json'), OUT = arg('--out', 'data'), LOG = arg('--log', 'NHAT-KY-HIEU-CHINH.md');
  const today = arg('--hom-nay', vnToday());
  let flag: Flag, rows: Row[], snaps: any[];
  try {
    flag = JSON.parse(readFileSync(FLAG, 'utf-8'));
    snaps = readdirSync(DIR).filter(f => f.endsWith('-forecast.json')).map(f => JSON.parse(readFileSync(`${DIR}/${f}`, 'utf-8')));
    rows = buildRows(DIR, true);
  } catch (e: any) { console.error('❌ LỖI ĐO: đọc hụt:', e?.message || e); notify('hong', `Đối chiếu cổng agy: đọc hụt kho (${String(e?.message || e).slice(0, 120)})`); process.exit(1); }
  const engine = snaps.length ? [...snaps].sort((a, b) => a.date.localeCompare(b.date)).pop()!.engineVersion : '';
  const a = decide(flag, rows, checkHealth(snaps, today), today, engine);
  if (a.kind === 'loi_do') { console.error(`❌ LỖI ĐO: ${a.why}`); notify('hong', `Đối chiếu cổng agy: LỖI ĐO - ${a.why}. Cờ giữ nguyên.`); process.exit(1); }
  notify('on', 'Đối chiếu cổng agy: phép đo chạy bình thường');
  const rep = report(rows, today, a, engine);
  let hist: any[] = []; const hp = `${OUT}/agy-gate-doichieu.json`;
  if (existsSync(hp)) { try { hist = JSON.parse(readFileSync(hp, 'utf-8')).lichSu || []; } catch { console.error('❌ LỖI ĐO: tệp lịch sử đối chiếu hỏng'); process.exit(1); } }
  hist = [...hist.filter(h => h.ngay !== today), rep];
  writeFileSync(hp, JSON.stringify({ moiNhat: rep, lichSu: hist }, null, 1) + '\n');
  writeFileSync(`${OUT}/agy-gate-doichieu.md`, `# Đối chiếu cổng bóng agy (tự sinh ${today})\n\n- Hành động đêm nay: **${a.kind}**; điều kiện chấm: ${rep.duDieuKienCham ? 'ĐỦ' : 'chưa đủ'}\n- Vệ tinh: ${JSON.stringify(rep.vt)}\n- FIELD: ${JSON.stringify(rep.field)}\n- Người đi: ${JSON.stringify(rep.nguoiDi)}\n${rep.ghiChu ? '- ' + rep.ghiChu + '\n' : ''}${rep.congG ? '- Cổng G: ' + JSON.stringify(rep.congG) + '\n' : ''}\nĐọc: \`data/agy-gate-doichieu.json\` (lịch sử). Cờ: \`data/agy-gate-flag.json\`.\n`);
  if (a.kind === 'luot' || a.kind === 'lui') {
    writeFileSync(FLAG, JSON.stringify(a.flag, null, 2) + '\n');
    const back = JSON.parse(readFileSync(FLAG, 'utf-8'));   // đọc lại (g2448 sửa 5): lượt chỉ tính khi đã ghi + đọc lại
    if (back.state !== a.flag.state || back.enabled !== a.flag.enabled) { console.error('❌ ghi cờ không khớp khi đọc lại'); process.exit(3); }
    const line = a.kind === 'lui' ? `TỰ LÙI ${today}: cờ cổng agy TẮT và KHOÁ (${a.why}). Lùi là hành vi dự kiến, không phải bằng chứng cổng sai.`
      : a.enabled ? `TỰ BẬT ${today}: cờ cổng agy BẬT (mọi K đạt ở hai lượt liên tiếp; engine ${engine}). Theo dõi tự lùi 60 ngày.`
      : a.result === 'TRUOT' ? `KHÔNG GIỮ ${today}: có tiêu chí TRƯỢT, cờ giữ tắt và khoá.` : `Lượt ${a.flag.looks.length}/${MAX_LOOKS} ${today}: ${a.result}${a.flag.state === 'het_luot_chua_du' ? '; hết lượt, cờ tắt, bóng chạy tiếp, người quyết' : ''}.`;
    appendFileSync(LOG, `\n- [vòng tự động g2448] ${line}\n`);
    console.log(line);
    if (a.kind === 'lui' || a.kind === 'luot' && (a.enabled || a.result === 'TRUOT' || a.flag.state === 'het_luot_chua_du')) notify('viec', `Cổng agy: ${line}`);
  }
  console.log(`✅ ${today} engine ${engine}: ${a.kind}${rep.ghiChu ? ' - ' + rep.ghiChu : ''}`);
}
if (!process.env.VITEST) main();
