/**
 * diff-rank.ts — đối chiếu hai lần kết xuất của dump-rank.ts và đếm CHÍNH XÁC bao nhiêu
 * điểm đổi nhãn / đổi kết luận / đổi điểm. Đây là con số quyết định giữ hay bỏ thay đổi.
 */
import { readFileSync } from 'node:fs';
const A = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const B = JSON.parse(readFileSync(process.argv[3], 'utf8'));
const SEA = new Set(['STATIC', 'FLOWING', 'FLUCTUATING', 'ROLLING']);
const verdict = (s: string) => SEA.has(s) ? 'SEA' : s === 'FOG' ? 'IN_CLOUD'
  : (s === 'RAIN' || s === 'DISSIPATING') ? 'BLOCKED' : 'NO_CLOUD';

const key = (r: any) => `${r.date}|${r.name}`;
const mapB = new Map(B.map((r: any) => [key(r), r]));
let n = 0, labelChanged = 0, verdictChanged = 0, dScore = 0, up = 0, down = 0;
const seaA = { n: 0 }, seaB = { n: 0 };
const lines: string[] = [];
for (const a of A) {
  const b: any = mapB.get(key(a)); if (!b) continue;
  n++;
  if (verdict(a.status) === 'SEA') seaA.n++;
  if (verdict(b.status) === 'SEA') seaB.n++;
  dScore += b.score - a.score;
  if (b.score > a.score) up++; else if (b.score < a.score) down++;
  if (a.status !== b.status) {
    labelChanged++;
    if (verdict(a.status) !== verdict(b.status)) verdictChanged++;
    lines.push(`  ${a.date} ${a.name.slice(0, 30).padEnd(32)} ${a.status}→${b.status}  ${a.score}→${b.score}`);
  }
}
console.log(`So sánh ${n} cặp (điểm × ngày)`);
console.log(`  đổi NHÃN:      ${labelChanged}  (${Math.round(labelChanged / n * 100)}%)`);
console.log(`  đổi KẾT LUẬN:  ${verdictChanged}  (${Math.round(verdictChanged / n * 100)}%)`);
console.log(`  "có biển mây": ${seaA.n} → ${seaB.n}`);
console.log(`  điểm: tăng ${up} · giảm ${down} · trung bình ${(dScore / n).toFixed(1)}`);
if (lines.length) { console.log('\nCác ca đổi nhãn:'); lines.slice(0, 60).forEach(l => console.log(l)); }
