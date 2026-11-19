/**
 * Chấm vòng 1 phiếu g95c6 (đăng ký trước trong NHAT-KY-HIEU-CHINH.md, commit d7e5c56): các chỗ khác của luật cung đường
 * nhánh agy (`routeDifficulty.ts`) so với route-1.2, trên nhãn đường Facebook. Mỗi biến thể thay ĐÚNG một nhóm cờ.
 *
 *   npx vite-node scripts/score-agy-route.ts <nhan-duong.json> [--cache <tệp om.json>]
 *
 * Thời tiết: Open-Meteo historical-forecast (best_match), 1 lần gọi mỗi nơi. Là công cụ chấm, không vào app.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { countCallsAs } from './count-calls';
import { assessPoint, extractPointWx, ROUTE_HOURLY_VARS, TH, type Hazard, type Level, type PointWx } from '../services/routeService';

countCallsAs('score-agy-route');

const PLACES: Record<string, { lat: number; lon: number; elev: number }> = {
  DEO_O_QUY_HO: { lat: 22.355, lon: 103.774, elev: 2035 },
  TA_XUA_SON_LA: { lat: 21.2764, lon: 104.4239, elev: 1770 },
};
function placeKey(place: string, spotKey?: string): string | null {
  if (spotKey && PLACES[spotKey]) return spotKey;
  if (/Ô Quy Hồ|Rồng Mây/.test(place)) return 'DEO_O_QUY_HO';
  if (/Tà Xùa/.test(place)) return 'TA_XUA_SON_LA';
  return null;
}

// ---------------------------------------------------------------- biến thể (chép luật agy, số y như routeDifficulty.ts)
const lv = (n: number) => n as Level;
/** Td từ T và RH theo Magnus (a 17,62, b 243,12 °C; WMO-No. 8). */
export function dewPointC(t: number, rh: number): number {
  const g = Math.log(Math.max(rh, 1) / 100) + (17.62 * t) / (243.12 + t);
  return (243.12 * g) / (17.62 - g);
}
function agyFog(wx: PointWx, e: number): Hazard[] {
  const out: Hazard[] = [];
  const v = wx.visibilityM;
  if (v !== null && v < 200) out.push({ kind: 'fog', level: 3, text: 'vis<200' });
  else if (v !== null && v < 500) out.push({ kind: 'fog', level: 2, text: 'vis<500' });
  else if (v !== null && v < 1000) out.push({ kind: 'fog', level: 1, text: 'vis<1000' });
  else if (wx.wmo === 45 || wx.wmo === 48) out.push({ kind: 'fog', level: 2, text: 'wmo fog' }); // nhánh app, giữ
  if (e >= 500 && wx.tempC !== null && wx.rh !== null && wx.cloudLow !== null) {
    const lcl = Math.max(0, 125 * (wx.tempC - dewPointC(wx.tempC, wx.rh)));
    if (lcl <= 125 && wx.rh >= 95 && wx.cloudLow >= 75) {
      const severe = (v !== null && v < 300) || (e >= 1200 && wx.isDark === true);
      out.push({ kind: 'fog', level: lv(severe ? 3 : 2), text: 'agy in-cloud' });
    } else if (lcl <= 250 && wx.rh >= 90 && wx.cloudLow >= 60) {
      out.push({ kind: 'fog', level: 1, text: 'agy in-cloud mod' });
    }
  }
  return out;
}
function agyRain(wx: PointWx): Hazard[] {
  const p = wx.precipMm;
  if (p === null) return [];
  if (p >= 10) return [{ kind: 'rain', level: 3, text: 'r>=10' }];
  if (p >= 4) return [{ kind: 'rain', level: 2, text: 'r>=4' }];
  if (p >= 1) return [{ kind: 'rain', level: 1, text: 'r>=1' }];
  return [];
}
export function windChillC(t: number, vKmh: number): number {
  if (t > 10 || vKmh < 4.8) return t;
  const vp = Math.pow(vKmh, 0.16);
  return Math.min(t, 13.12 + 0.6215 * t - 11.37 * vp + 0.3965 * t * vp);
}
function agyCold(wx: PointWx): Hazard[] {
  const t = wx.tempC;
  if (t === null) return [];
  const f = windChillC(t, 40); // xe máy 40 km/h (tốc độ mặc định của app); không xin gió 10 m, gió lùa của xe trội hơn
  if (f <= 3 || t <= 2) return [{ kind: 'cold', level: 3, text: 'wc<=3' }];
  if (f <= 8) return [{ kind: 'cold', level: 2, text: 'wc<=8' }];
  if (f <= 12) return [{ kind: 'cold', level: 1, text: 'wc<=12' }];
  return [];
}
const RAIN_HOURLY = new Set(['Mưa to', 'Mưa vừa', 'Mưa nhẹ', 'Khả năng mưa']);
type Variant = 'base' | 'D1' | 'D2' | 'D3';
export function assessVariant(variant: Variant, wx: PointWx, e: number): Hazard[] {
  const base = assessPoint(wx, e, 'motorbike');
  if (variant === 'D1') return [...base.filter(h => h.kind !== 'fog'), ...agyFog(wx, e)];
  if (variant === 'D2') return [...base.filter(h => !(h.kind === 'rain' && [...RAIN_HOURLY].some(s => h.text.startsWith(s)))), ...agyRain(wx)];
  if (variant === 'D3') return [...base.filter(h => h.kind !== 'cold' && h.kind !== 'ice'), ...agyCold(wx)];
  return base;
}
const KIND_MAP: Record<string, string[]> = { fog: ['fog'], rain: ['rain', 'storm', 'landslide'], cold: ['cold', 'ice'] };

// ---------------------------------------------------------------- chạy
async function main() {
  const args = process.argv.slice(2);
  const labelsPath = args[0];
  const ci = args.indexOf('--cache');
  const cachePath = ci >= 0 ? args[ci + 1] : null;
  const doc = JSON.parse(readFileSync(labelsPath, 'utf8'));
  const labels = (doc.nhan as any[]).filter(x => (x.confidence ?? 0) >= 0.6);
  const dates = labels.map(x => x.date as string).sort();
  const start = new Date(dates[0] + 'T12:00:00+07:00'); start.setDate(start.getDate() - 4);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = dates[dates.length - 1];

  let om: Record<string, any> = cachePath && existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : {};
  for (const [k, p] of Object.entries(PLACES)) {
    if (om[k]) continue;
    const url = `https://historical-forecast-api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&elevation=${p.elev}` +
      `&hourly=${ROUTE_HOURLY_VARS.join(',')}&daily=sunrise,sunset&timezone=Asia%2FHo_Chi_Minh&start_date=${startStr}&end_date=${endStr}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${k}: HTTP ${r.status} ${await r.text()}`);
    om[k] = await r.json();
  }
  if (cachePath) writeFileSync(cachePath, JSON.stringify(om));

  const variants: Variant[] = ['base', 'D1', 'D2', 'D3'];
  type Cell = { yes: number; no: number; hit: number; miss: number; fa: number; cn: number };
  const tab: Record<string, Cell> = {};
  const cell = (k: string) => (tab[k] ??= { yes: 0, no: 0, hit: 0, miss: 0, fa: 0, cn: 0 });
  const rows: string[] = [];
  let missingHours = 0, nullVis = 0, nullProb = 0, hoursSeen = 0, skippedPlace = 0;
  for (const lab of labels) {
    const obs: string = lab.observedByVN; // 'YYYY-MM-DDTHH:MM' giờ VN
    const hours: string[] = [];
    const t0 = new Date(obs.slice(0, 13) + ':00:00+07:00').getTime();
    for (let k = 3; k >= 0; k--) {
      const d = new Date(t0 - k * 3600e3 + 7 * 3600e3).toISOString();
      hours.push(d.slice(0, 13) + ':00');
    }
    for (const seg of lab.segments ?? []) {
      const pk = placeKey(seg.place ?? '', seg.spotKey);
      if (!pk) { skippedPlace++; continue; }
      const e = PLACES[pk].elev;
      const wxs = hours.map(h => extractPointWx(om[pk], h));
      for (const w of wxs) {
        hoursSeen++;
        if (!w) { missingHours++; continue; }
        if (w.visibilityM === null) nullVis++;
        if (w.precipProb === null) nullProb++;
      }
      for (const kind of ['fog', 'rain', 'cold']) {
        const truth = (seg.kinds ?? []).includes(kind) ? true : (seg.kindsAbsent ?? []).includes(kind) ? false : null;
        if (truth === null) continue;
        const parts: string[] = [];
        for (const v of variants) {
          let m = 0;
          for (const w of wxs) if (w) for (const h of assessVariant(v, w, e)) if (KIND_MAP[kind].includes(h.kind) && h.level > m) m = h.level;
          for (const thr of [1, 2]) {
            const c = cell(`${kind}|${v}|>=${thr}`);
            const said = m >= thr;
            if (truth) { c.yes++; said ? c.hit++ : c.miss++; } else { c.no++; said ? c.fa++ : c.cn++; }
          }
          parts.push(`${v}=${m}`);
        }
        rows.push(`${lab.date} ${obs.slice(11)} ${pk.padEnd(13)} ${kind.padEnd(4)} thật=${truth ? 'CÓ ' : 'KHÔNG'} ${parts.join(' ')}`);
      }
    }
  }
  console.log(`Nhãn dùng được: ${labels.length}; đoạn bỏ vì không rõ nơi: ${skippedPlace}; giờ xét ${hoursSeen}, thiếu số ${missingHours}, ` +
    `tầm nhìn null ${nullVis}, xác suất mưa null ${nullProb}`);
  console.log('\nloại | biến thể | ngưỡng | CÓ/KHÔNG | trúng bỏ_sót | báo_nhầm đúng_không');
  for (const [k, c] of Object.entries(tab)) console.log(`${k.padEnd(18)} ${c.yes}/${c.no}  trúng ${c.hit} sót ${c.miss}  nhầm ${c.fa} đúng-không ${c.cn}`);
  console.log('\nMọi ca (mức cao nhất trong 4 giờ):');
  for (const r of rows) console.log(r);
  void TH;
}
main().catch(e => { console.error(e); process.exit(1); });
