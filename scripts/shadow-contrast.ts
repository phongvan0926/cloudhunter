/**
 * shadow-contrast.ts - BẢNG ĐỐI CHỨNG skyradar.vn (shadow) vs CloudHunter vs nhãn sự thật.
 *
 * Phán quyết "săn mây" của skyradar KHÔNG phải nhãn sự thật (họ tự ghi "Đang thử nghiệm").
 * Bảng này chỉ trả lời: trên CÙNG những cặp (điểm, ngày) có nhãn vệ tinh/Facebook/người đi,
 * bên nào đúng hơn. Không dùng để chỉnh engine; sau 3-4 tuần đọc số rồi mới bàn.
 *
 * Luật chốt TRƯỚC khi có số (19/11/2026, phiếu gcc29), đừng chỉnh theo kết quả:
 *  - Bản chụp của họ dùng cho rạng sáng ngày D = bản chụp MUỘN NHẤT trước D 03:00 giờ VN
 *    (giống bản chụp của mình: dự báo có trước khi biết sự thật). Bản chụp sau 03:00 ngày D bị bỏ.
 *  - Khung rạng sáng 05:00-07:00 giờ VN ngày D. Gộp giờ: co > co_the > khong.
 *  - "Họ báo có" tính hai cách: chỉ `co`, và `co` hoặc `co_the`.
 */
import { existsSync, readdirSync, readFileSync } from 'fs';

export interface ShadowHour { t: string; bienMay: 'co' | 'co_the' | 'khong'; cheTamNhin?: boolean; index?: number }
export interface ShadowCapture { chupLuc: string; diem: Record<string, ShadowHour[]> }
export interface SkyDawn { verdict: 'co' | 'co_the' | 'khong'; che: boolean; leadH: number; chupLuc: string }

export const SHADOW_DIR = 'data/skyradar-shadow';
const RANK = { khong: 0, co_the: 1, co: 2 } as const;

/** Đọc mọi bản chụp; tệp hỏng định dạng thì NÉM lỗi (đọc hụt phải kêu, không im lặng bỏ qua). */
export function loadShadowCaptures(dir = SHADOW_DIR): ShadowCapture[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith('.json')).sort().map(f => {
    const j = JSON.parse(readFileSync(`${dir}/${f}`, 'utf-8'));
    if (typeof j.chup_luc !== 'string' || !j.diem) throw new Error(`${dir}/${f}: thiếu chup_luc/diem`);
    return { chupLuc: j.chup_luc, diem: j.diem };
  });
}

/** Phán quyết rạng sáng ngày `date` của họ cho điểm `key`, hoặc null nếu không có bản chụp hợp lệ. */
export function skyradarDawn(caps: ShadowCapture[], date: string, key: string): SkyDawn | null {
  const cutoff = Date.parse(`${date}T03:00:00+07:00`);
  const dawn = Date.parse(`${date}T06:00:00+07:00`);
  let best: { cap: ShadowCapture; hs: ShadowHour[] } | null = null;
  for (const cap of caps) {
    const at = Date.parse(cap.chupLuc);
    if (!(at < cutoff)) continue;
    const hs = (cap.diem[key] || []).filter(h => h.t.startsWith(date) && +h.t.slice(11, 13) >= 5 && +h.t.slice(11, 13) <= 7);
    if (!hs.length) continue;
    if (!best || at > Date.parse(best.cap.chupLuc)) best = { cap, hs };
  }
  if (!best) return null;
  const verdict = best.hs.reduce((a, h) => (RANK[h.bienMay] ?? 0) > RANK[a] ? h.bienMay : a, 'khong' as SkyDawn['verdict']);
  return { verdict, che: best.hs.some(h => h.cheTamNhin), chupLuc: best.cap.chupLuc,
    leadH: Math.round((dawn - Date.parse(best.cap.chupLuc)) / 36e5) };
}

export interface ContrastRow {
  date: string; key: string; name: string; truth: 'SEA' | 'NO_SEA'; truthSrc: string; truthDetail: string;
  oursSea: boolean; oursWorth: boolean; status: string;
}
type Tally = { tp: number; fn: number; fp: number; tn: number };
export function tally(rows: ContrastRow[], pred: (r: ContrastRow) => boolean): Tally {
  const t = { tp: 0, fn: 0, fp: 0, tn: 0 };
  for (const r of rows) { const p = pred(r); if (r.truth === 'SEA') p ? t.tp++ : t.fn++; else p ? t.fp++ : t.tn++; }
  return t;
}
const fmt = (t: Tally) => {
  const n = t.tp + t.fn + t.fp + t.tn;
  return `đúng ${n ? Math.round((t.tp + t.tn) / n * 100) : 0}% · báo đúng có ${t.tp} · BỎ SÓT ${t.fn} · báo nhầm có ${t.fp} · đúng không ${t.tn}`;
};

/** Trả các dòng để in (tách ra cho test). */
export function contrastLines(rows: ContrastRow[], caps: ShadowCapture[]): string[] {
  const L: string[] = [];
  const paired = rows.map(r => ({ r, s: skyradarDawn(caps, r.date, r.key) })).filter(x => x.s) as { r: ContrastRow; s: SkyDawn }[];
  const days = new Set(paired.map(x => x.r.date));
  L.push(`\n  ĐỐI CHỨNG skyradar.vn (shadow, KHÔNG phải nhãn) - ${paired.length} cặp có cả phán quyết của họ lẫn nhãn sự thật, ${days.size} ngày`
    + (caps.length ? `, ${caps.length} bản chụp của họ` : ' - CHƯA có bản chụp nào'));
  if (!paired.length) { L.push('    (chưa có cặp nào: cần bản chụp của họ TRƯỚC 03:00 ngày D và nhãn của ngày D)'); return L; }
  const sub = (src?: string) => paired.filter(x => !src || x.r.truthSrc === src);
  const byR = new Map(paired.map(x => [x.r, x.s]));
  for (const src of [undefined, 'người đi', 'facebook', 'vệ tinh']) {
    const set = sub(src).map(x => x.r);
    if (!set.length) continue;
    L.push(`    ${src ? `riêng nguồn ${src}` : 'mọi nguồn'} (${set.length} cặp):`);
    L.push(`      họ "co"              ${fmt(tally(set, r => byR.get(r)!.verdict === 'co'))}`);
    L.push(`      họ "co"/"co_the"     ${fmt(tally(set, r => byR.get(r)!.verdict !== 'khong'))}`);
    L.push(`      mình trạng thái      ${fmt(tally(set, r => r.oursSea))}`);
    L.push(`      mình luật đáng đi    ${fmt(tally(set, r => r.oursWorth))}`);
  }
  if (days.size < 20) L.push(`    ⚠️  ${days.size} < 20 ngày - chưa đủ để nói bên nào đúng hơn`);
  const diff = paired.filter(x => (x.s.verdict === 'co') !== x.r.oursSea);
  if (diff.length) {
    L.push(`    ca hai bên nói khác nhau (họ "co" xét với trạng thái của mình), ${diff.length} ca:`);
    for (const { r, s } of diff.slice(0, 25)) L.push(`      ${r.date} ${r.name.slice(0, 26).padEnd(27)} họ ${s.verdict.padEnd(6)}${s.che ? ' che' : '    '} (trước ${s.leadH}h)`
      + ` · mình ${r.status.padEnd(11)} · thật ${r.truth === 'SEA' ? 'CÓ ' : 'không'} [${r.truthSrc}]`);
  }
  return L;
}
