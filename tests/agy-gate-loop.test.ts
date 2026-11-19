import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { execFileSync, spawnSync } from 'child_process';
import { decide, checkHealth, rollbackWhy, report, type Flag } from '../scripts/agy-gate-loop';
import { evaluateEngine, isReady, type Row } from '../scripts/score-agy-gate';

const ENG = 'engine-test';
const day = (i: number) => new Date(Date.parse('2026-12-01T00:00:00Z') + i * 86400000).toISOString().slice(0, 10);
const row = (date: string, key: string, src: Row['src'], sea: boolean, worth: boolean, gate: string | null, post = false): Row =>
  ({ date, key, src, sea, worth, gate, nMod: 3, engine: ENG, post });
const flag0 = (o: Partial<Flag> = {}): Flag => ({ enabled: false, locked: false, auto: true, engine: ENG, state: 'bong', since: null, looks: [], ...o });
const OK = { ok: true };

/** Thế giới "cổng tốt": chặn 2/3 ca báo nhầm vệ tinh, không chặn báo đúng. 20 ngày, 10 điểm. */
function good(): Row[] {
  const r: Row[] = [];
  for (let i = 0; i < 20; i++) {
    for (let j = 0; j < 3; j++) r.push(row(day(i), `K${(i * 3 + j) % 10}`, 'vệ tinh', false, true, j < 2 ? 'khong' : 'co'));
    r.push(row(day(i), `K${i % 10}`, 'vệ tinh', true, true, 'co'));
    r.push(row(day(i), `K${i % 10}`, 'người đi', true, true, 'co'));
    r.push(row(day(i), `K${(i + 1) % 10}`, 'facebook', false, true, 'khong'));
  }
  return r;
}
/** Thế giới "cổng tệ": chặn báo đúng nhiều như báo nhầm. */
function bad(): Row[] {
  return good().map(r => r.sea && r.gate === 'co' ? { ...r, gate: 'khong' } : r);
}
const TODAY = '2026-12-25';

describe('vòng tự động cổng agy (g2448) - 3 nhánh đột biến', () => {
  it('cổng tệ bị TỪ CHỐI: cờ giữ tắt và khoá', () => {
    const a = decide(flag0(), bad(), OK, TODAY, ENG);
    expect(a.kind).toBe('luot');
    if (a.kind !== 'luot') return;
    expect(a.result).toBe('TRUOT'); expect(a.flag.enabled).toBe(false); expect(a.flag.locked).toBe(true);
    expect(decide(a.flag, good(), OK, '2027-01-30', ENG).kind).toBe('khoa');   // khoá vĩnh viễn, tập tốt sau đó cũng không mở lại
  });
  it('cổng tốt BẬT, nhưng chỉ ở hai lượt liên tiếp (lượt đầu chưa bật)', () => {
    const a1 = decide(flag0(), good(), OK, TODAY, ENG);
    expect(a1.kind).toBe('luot'); if (a1.kind !== 'luot') return;
    expect(a1.result).toBe('DAT'); expect(a1.flag.enabled).toBe(false); expect(a1.flag.looks).toHaveLength(1);
    expect(decide(a1.flag, good(), OK, '2026-12-30', ENG).kind).toBe('cho_luot');      // chưa đủ 14 ngày
    const a2 = decide(a1.flag, good(), OK, '2027-01-08', ENG);
    expect(a2.kind).toBe('luot'); if (a2.kind !== 'luot') return;
    expect(a2.enabled).toBe(true); expect(a2.flag.enabled).toBe(true); expect(a2.flag.since).toBe('2027-01-08');
    // lượt trước CHUA_DU thì DAT lượt này vẫn chưa bật
    const b = decide(flag0({ looks: [{ date: '2026-12-10', result: 'CHUA_DU' }] }), good(), OK, TODAY, ENG);
    expect(b.kind === 'luot' && b.enabled).toBeFalsy();
  });
  it('sau khi bật mà tụt thì TỰ LÙI (R1 hai ngày khác nhau, R2 người đi), cờ khoá', () => {
    const on = flag0({ enabled: true, state: 'bat', since: '2027-01-08' });
    const post = (d: string, src: Row['src'], gate: string) => row(d, 'K1', src, true, true, gate, true);
    const calm = [post('2027-01-09', 'facebook', 'co'), post('2027-01-10', 'facebook', 'co')];
    expect(decide(on, calm, OK, '2027-01-15', ENG).kind).toBe('giu_bat');
    const r1 = decide(on, [...calm, post('2027-01-11', 'facebook', 'khong'), post('2027-01-12', 'facebook', 'khong')], OK, '2027-01-15', ENG);
    expect(r1.kind).toBe('lui'); if (r1.kind === 'lui') { expect(r1.flag.enabled).toBe(false); expect(r1.flag.locked).toBe(true); }
    // hai điểm cùng MỘT ngày: không kích R1 (diện rộng)
    const sameDay = [post('2027-01-11', 'facebook', 'khong'), { ...post('2027-01-11', 'facebook', 'khong'), key: 'K2' }, ...calm];
    expect(rollbackWhy(sameDay, on, '2027-01-15')).toBeNull();
    expect(decide(on, [...calm, post('2027-01-11', 'người đi', 'khong')], OK, '2027-01-15', ENG).kind).toBe('lui');   // R2
    expect(rollbackWhy([post('2027-01-11', 'người đi', 'khong')], on, '2027-04-01')).toBeNull();                       // quá 60 ngày
    expect(decide({ ...on, enabled: false, locked: true, state: 'da_lui' }, calm, OK, '2027-01-16', ENG).kind).toBe('khoa');   // không tự bật lại
  });
  it('mẫu nhỏ: chưa đủ mẫu, KHÔNG in số phụ thuộc cổng', () => {
    const small = good().filter(r => r.date <= day(2));
    const a = decide(flag0(), small, OK, '2026-12-05', ENG);
    expect(a.kind).toBe('chua_du_mau');
    const rep = report(small, '2026-12-05', a, ENG);
    expect(rep.duDieuKienCham).toBe(false); expect(rep.congG).toBeUndefined(); expect(rep.ghiChu).toMatch(/chưa đủ mẫu/);
    expect(report(good(), TODAY, decide(flag0(), good(), OK, TODAY, ENG), ENG).congG.ketLuan).toBe('DU_DIEU_KIEN');
  });
  it('K3/K6 mẫu 0 hoặc < 8 báo đúng: CHƯA ĐỦ, không DAT/TRUOT bừa (phản biện sửa 1)', () => {
    const noTP = good().filter(r => !(r.sea && r.src === 'vệ tinh'));
    const ev = evaluateEngine(noTP.filter(r => r.src === 'vệ tinh'), noTP.filter(r => r.src !== 'vệ tinh').map(r => ({ ...r, sea: false })), []);
    expect(ev.K.K3).toBe('CHUA_DU'); expect(ev.K.K6).toBe('CHUA_DU');
  });
  it('đổi ENGINE_VERSION đặt lại bộ đếm lượt', () => {
    const a = decide(flag0({ engine: 'cu', looks: [{ date: '2026-12-10', result: 'DAT' }] }), good(), OK, TODAY, ENG);
    expect(a.kind === 'luot' && a.flag.looks).toHaveLength(1);   // lượt cũ bị xoá, đây là lượt đầu của engine mới
    expect(a.kind === 'luot' && a.enabled).toBeFalsy();
  });
  it('đủ điều kiện chấm: FIELD>=30 VÀ >=10 CÓ, hoặc 20/12', () => {
    const f = (n: number, pos: number) => Array.from({ length: n }, (_, i) => ({ sea: i < pos }));
    expect(isReady(f(30, 9), '2026-12-01')).toBe(false); expect(isReady(f(30, 10), '2026-12-01')).toBe(true);
    expect(isReady(f(3, 0), '2026-12-20')).toBe(true);
  });
});

describe('sức khoẻ phép đo: rỗng/hụt là LỖI ĐO, không phải 0', () => {
  const sp = (g?: any) => ({ key: 'K', ...(g === undefined ? {} : { agyGate: g }) });
  const snap = (date: string, spots: any[]) => ({ date, spots });
  it('các ca hỏng', () => {
    expect(checkHealth([], '2026-11-22').ok).toBe(false);
    expect(checkHealth([snap('2026-11-21', [sp(), sp()])], '2026-11-22').ok).toBe(false);           // từ 21/11 phải có cột
    expect(checkHealth([snap('2026-11-20', [sp()])], '2026-11-22').ok).toBe(true);                   // trước đó chưa bắt buộc
    expect(checkHealth([snap('2026-11-21', [sp({ ketLuan: 'co' })])], '2026-11-28').ok).toBe(false); // bản chụp cũ > 3 ngày
    const mixed = [snap('2026-11-21', Array.from({ length: 10 }, (_, i) => sp(i < 8 ? { ketLuan: 'co' } : { error: 'x' })))];
    expect(checkHealth(mixed, '2026-11-22').ok).toBe(false);                                         // 20% lỗi
    const okSnap = [snap('2026-11-21', Array.from({ length: 20 }, (_, i) => sp(i < 19 ? { ketLuan: 'co' } : { ketLuan: 'chua_co_du_lieu' })))];
    expect(checkHealth(okSnap, '2026-11-22').ok).toBe(true);
    const lostCol = [snap('2026-11-21', [sp({ ketLuan: 'co' })]), snap('2026-11-22', [sp()])];
    expect(checkHealth(lostCol, '2026-11-22').ok).toBe(false);                                       // mất cột giữa chừng
  });
  it('đọc hụt thật: chạy script, thoát 1, cờ KHÔNG đổi', () => {
    const d = mkdtempSync(`${tmpdir()}/agyloop-`);
    try {
      mkdirSync(`${d}/obs`);
      writeFileSync(`${d}/obs/2026-11-21-forecast.json`, JSON.stringify({ date: '2026-11-21', engineVersion: ENG, spots: [{ key: 'X', worthGoing: true }] }));
      const fp = `${d}/flag.json`; const txt = JSON.stringify(flag0(), null, 2) + '\n'; writeFileSync(fp, txt);
      writeFileSync(`${d}/log.md`, '');
      const r = spawnSync('npx', ['--no-install', 'vite-node', 'scripts/agy-gate-loop.ts', '--dir', `${d}/obs`, '--flag', fp, '--out', d, '--log', `${d}/log.md`, '--hom-nay', '2026-11-22', '--khong-bao'], { encoding: 'utf-8', env: { ...process.env, VITEST: '' } });
      expect(r.status).toBe(1); expect(r.stderr).toMatch(/LỖI ĐO/); expect(r.stdout).not.toMatch(/Điểm-ngày/);   // không rò báo cáo của công cụ chấm
      expect(readFileSync(fp, 'utf-8')).toBe(txt); expect(readFileSync(`${d}/log.md`, 'utf-8')).toBe('');
    } finally { rmSync(d, { recursive: true, force: true }); }
  }, 60000);
});
