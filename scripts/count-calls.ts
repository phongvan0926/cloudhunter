/**
 * count-calls.ts - đếm lượt gọi mạng của một script theo máy chủ, in một dòng khi script kết thúc
 * (phiếu gcc29 vòng 7, 19/11/2026: IP máy nhà chạm trần Open-Meteo 10.000/ngày lúc 16:30 mà không đo được ai tiêu).
 *
 * Dùng: dòng import ĐẦU TIÊN của script: `import { countCallsAs } from './count-calls'; countCallsAs('snapshot-forecast');`
 * Bọc globalThis.fetch nên đếm được mọi đường gọi (weatherService, routeService, stormService...).
 * Dòng log: `[đếm gọi mạng] nguồn=<script>: <máy chủ> <n> lần (~<w> lượt quy đổi); ...`.
 * `w` là lượt QUY ĐỔI ƯỚC theo công thức Open-Meteo công bố (trang pricing/terms: số toạ độ x biến/10, x số mô hình,
 * x số ngày/14 nếu > 14), chỉ để so các script với nhau, không phải con số Open-Meteo đếm thật.
 * Không đổi hành vi gọi (không chặn, không thử lại).
 */
export function omWeight(url: string): number {
  let u: URL;
  try { u = new URL(url); } catch { return 0; }
  if (!/(^|\.)open-meteo\.com$/.test(u.hostname)) return 0;
  const cnt = (k: string) => (u.searchParams.get(k) || '').split(',').filter(Boolean).length;
  const locs = Math.max(1, cnt('latitude'));
  const vars = cnt('hourly') + cnt('daily') + cnt('minutely_15') + cnt('current');
  const days = (+(u.searchParams.get('past_days') || 0)) + (+(u.searchParams.get('forecast_days') || 7));
  const archiveDays = u.searchParams.get('start_date') && u.searchParams.get('end_date')
    ? (Date.parse(u.searchParams.get('end_date')!) - Date.parse(u.searchParams.get('start_date')!)) / 86_400_000 + 1 : 0;
  return locs * Math.max(1, vars / 10) * Math.max(1, cnt('models')) * Math.max(1, (archiveDays || days) / 14);
}

export type CallCounts = Map<string, { n: number; weight: number; fail: number }>;
export function formatCounts(source: string, c: CallCounts): string {
  const parts = [...c.entries()].sort().map(([h, x]) =>
    `${h} ${x.n} lần${x.fail ? ` (${x.fail} hỏng)` : ''}${x.weight ? ` (~${Math.round(x.weight)} lượt quy đổi)` : ''}`);
  return `[đếm gọi mạng] nguồn=${source}: ${parts.join('; ') || 'không gọi'}`;
}

let installed = false;
export const COUNTS: CallCounts = new Map();
export function countCallsAs(source: string): void {
  if (installed) return;
  installed = true;
  const orig = globalThis.fetch;
  globalThis.fetch = (async (input: any, init?: any) => {
    const url = typeof input === 'string' ? input : input?.url ?? String(input);
    let host = '?';
    try { host = new URL(url).hostname; } catch { /* để '?' */ }
    const c = COUNTS.get(host) || { n: 0, weight: 0, fail: 0 };
    c.n++; c.weight += omWeight(url); COUNTS.set(host, c);
    try {
      const r = await orig(input, init);
      if (!r.ok) c.fail++;
      return r;
    } catch (e) { c.fail++; throw e; }
  }) as typeof fetch;
  process.on('exit', () => console.log(formatCounts(source, COUNTS)));
}
