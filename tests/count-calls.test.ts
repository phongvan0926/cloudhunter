import { describe, it, expect, vi } from 'vitest';
import { omWeight, formatCounts, countCallsAs, COUNTS } from '../scripts/count-calls';

describe('đếm lượt gọi mạng theo script (vòng 7)', () => {
  it('lượt quy đổi ước của Open-Meteo: toạ độ x biến/10 x mô hình x ngày/14', () => {
    expect(omWeight('https://router.project-osrm.org/route/v1/x')).toBe(0);
    expect(omWeight('https://api.open-meteo.com/v1/forecast?latitude=1&longitude=2&hourly=a,b')).toBe(1);
    expect(omWeight('https://api.open-meteo.com/v1/forecast?latitude=1,2,3&longitude=1,2,3&hourly=a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t&forecast_days=7')).toBe(6);
    expect(omWeight('https://api.open-meteo.com/v1/forecast?latitude=1&longitude=1&hourly=a&models=x,y,z,w')).toBe(4);
    expect(omWeight('https://api.open-meteo.com/v1/forecast?latitude=1&longitude=1&hourly=a&past_days=3&forecast_days=25')).toBeCloseTo(2, 6);
    expect(omWeight('https://archive-api.open-meteo.com/v1/archive?latitude=1&longitude=1&daily=a,b,c,d&start_date=2016-01-01&end_date=2016-01-28')).toBe(2);
    expect(omWeight('không phải url')).toBe(0);
  });
  it('bọc fetch: đếm theo máy chủ, đếm cả lần hỏng, không đổi phản hồi', async () => {
    const orig = vi.fn(async (u: string) => (String(u).includes('bad') ? new Response('x', { status: 429 }) : new Response('{"ok":1}')));
    vi.stubGlobal('fetch', orig);
    countCallsAs('thu');
    const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=1,2&longitude=1,2&hourly=a');
    expect(await r.json()).toEqual({ ok: 1 });
    await fetch('https://api.open-meteo.com/bad?latitude=1&hourly=a');
    await fetch('https://valhalla1.openstreetmap.de/route');
    expect(orig).toHaveBeenCalledTimes(3);
    expect(COUNTS.get('api.open-meteo.com')).toEqual({ n: 2, weight: 3, fail: 1 });
    expect(formatCounts('thu', COUNTS)).toBe('[đếm gọi mạng] nguồn=thu: api.open-meteo.com 2 lần (1 hỏng) (~3 lượt quy đổi); valhalla1.openstreetmap.de 1 lần');
    expect(formatCounts('x', new Map())).toMatch(/không gọi/);
    vi.unstubAllGlobals();
  });
});
