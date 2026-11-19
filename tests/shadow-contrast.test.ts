import { describe, it, expect } from 'vitest';
import { skyradarDawn, contrastLines, tally, type ShadowCapture, type ContrastRow } from '../scripts/shadow-contrast';

const h = (t: string, bienMay: 'co' | 'co_the' | 'khong', che = false) => ({ t, bienMay, cheTamNhin: che });
const caps: ShadowCapture[] = [
  { chupLuc: '2026-11-19T20:00+07:00', diem: { A: [h('2026-11-20T04:00', 'co'), h('2026-11-20T05:00', 'khong'), h('2026-11-20T06:00', 'co_the', true)] } },
  { chupLuc: '2026-11-19T09:19+07:00', diem: { A: [h('2026-11-20T06:00', 'co')] } },
  // chụp SAU 03:00 ngày D: không được dùng cho D
  { chupLuc: '2026-11-20T04:00+07:00', diem: { A: [h('2026-11-20T06:00', 'co')] } },
];

describe('skyradarDawn', () => {
  it('lấy bản chụp muộn nhất trước 03:00 ngày D, chỉ khung 05-07h', () => {
    const s = skyradarDawn(caps, '2026-11-20', 'A')!;
    expect(s.chupLuc).toBe('2026-11-19T20:00+07:00');
    expect(s.verdict).toBe('co_the');   // 04h 'co' nằm ngoài khung
    expect(s.che).toBe(true);
    expect(s.leadH).toBe(10);
  });
  it('không có bản chụp hợp lệ thì null, không bịa', () => {
    expect(skyradarDawn(caps, '2026-11-21', 'A')).toBeNull();
    expect(skyradarDawn(caps, '2026-11-20', 'B')).toBeNull();
    expect(skyradarDawn([caps[2]], '2026-11-20', 'A')).toBeNull();
  });
});

describe('contrastLines', () => {
  const row = (truth: 'SEA' | 'NO_SEA', oursSea: boolean): ContrastRow => ({ date: '2026-11-20', key: 'A', name: 'Điểm A',
    truth, truthSrc: 'vệ tinh', truthDetail: '', oursSea, oursWorth: false, status: oursSea ? 'STATIC' : 'FOG' });
  it('đếm hai bên trên cùng tập cặp, in ca khác nhau', () => {
    const L = contrastLines([row('SEA', false)], caps).join('\n');
    expect(L).toContain('1 cặp');
    expect(L).toMatch(/họ "co"\/"co_the" +đúng 100%/);
    expect(L).toMatch(/mình trạng thái +đúng 0% · báo đúng có 0 · BỎ SÓT 1/);
  });
  it('chưa có bản chụp thì nói thẳng', () => {
    expect(contrastLines([row('SEA', true)], []).join('\n')).toContain('CHƯA có bản chụp');
  });
  it('tally đúng ma trận', () => {
    expect(tally([row('SEA', true), row('NO_SEA', true), row('NO_SEA', false)], r => r.oursSea)).toEqual({ tp: 1, fn: 0, fp: 1, tn: 1 });
  });
});
