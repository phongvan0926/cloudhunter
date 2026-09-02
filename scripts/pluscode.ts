/**
 * pluscode.ts — giải Open Location Code (plus code) ra toạ độ, kèm độ cao DEM.
 *
 * Vì sao có file này: người dùng gửi toạ độ điểm săn mây bằng plus code (đây là lần thứ ba),
 * và trước đây mỗi lần đều giải tay rồi chép số vào comment — không kiểm chứng được, không
 * lặp lại được. Đặc biệt plus code NGẮN ("8VFJ+9V2, Tả Van") bỏ mất 4 ký tự đầu và chỉ khôi
 * phục được nếu biết địa danh tham chiếu; giải tay chỗ đó rất dễ ra lệch nguyên một ô 1°.
 *
 * Chạy: npx vite-node scripts/pluscode.ts "8VFJ+9V2" 22.29 103.88
 *       npx vite-node scripts/pluscode.ts "7PJ6MCJQ+7R"        (mã đầy đủ, không cần tham chiếu)
 */
const A = '23456789CFGHJMPQRVWX';
const SEP = 8;                       // vị trí dấu '+' trong mã đầy đủ
const PAIR_RES = [20, 1, 0.05, 0.0025, 0.000125];
const GRID_ROWS = 5, GRID_COLS = 4;  // ký tự tinh chỉnh chia ô thành 5 hàng × 4 cột

/** Giải mã ĐẦY ĐỦ → tâm ô + kích thước ô. */
export function decode(code: string) {
  const c = code.replace(/\+/g, '').replace(/0+$/, '').toUpperCase();
  let lat = -90, lon = -180, latRes = PAIR_RES[0], lonRes = PAIR_RES[0];
  let i = 0;
  for (; i < Math.min(c.length, 10); i += 2) {
    const step = i / 2;
    latRes = PAIR_RES[step]; lonRes = PAIR_RES[step];
    lat += A.indexOf(c[i]) * latRes;
    lon += A.indexOf(c[i + 1]) * lonRes;
  }
  for (; i < c.length; i++) {
    latRes /= GRID_ROWS; lonRes /= GRID_COLS;
    const v = A.indexOf(c[i]);
    lat += Math.floor(v / GRID_COLS) * latRes;
    lon += (v % GRID_COLS) * lonRes;
  }
  return { lat: lat + latRes / 2, lon: lon + lonRes / 2, latRes, lonRes };
}

/** Mã hoá toạ độ → mã đầy đủ 10 ký tự (chỉ cần để lấy tiền tố khi khôi phục mã ngắn). */
export function encode(lat: number, lon: number): string {
  let la = Math.min(89.999999, Math.max(-90, lat)) + 90;
  let lo = ((lon + 180) % 360 + 360) % 360;
  let out = '';
  for (let step = 0; step < 5; step++) {
    const r = PAIR_RES[step];
    const li = Math.floor(la / r), oi = Math.floor(lo / r);
    out += A[li] + A[oi];
    la -= li * r; lo -= oi * r;
  }
  return out.slice(0, SEP) + '+' + out.slice(SEP);
}

/**
 * Khôi phục mã NGẮN quanh một điểm tham chiếu, rồi dịch sang ô liền kề nếu tâm ô rơi xa
 * điểm tham chiếu hơn nửa ô — đây chính là bước hay bị bỏ khi giải tay.
 */
export function recover(short: string, refLat: number, refLon: number) {
  const plus = short.indexOf('+');
  const pad = SEP - plus;
  if (pad <= 0) return decode(short);
  const res = Math.pow(20, 2 - pad / 2);
  const prefix = encode(refLat, refLon).replace('+', '').slice(0, pad);
  const area = decode(prefix + short);
  let { lat, lon } = area;
  if (refLat + res / 2 < lat && lat - res >= -90) lat -= res;
  else if (refLat - res / 2 > lat && lat + res <= 90) lat += res;
  if (refLon + res / 2 < lon && lon - res >= -180) lon -= res;
  else if (refLon - res / 2 > lon && lon + res <= 180) lon += res;
  return { ...area, lat, lon, full: prefix + short };
}

async function main() {
  const [code, refLat, refLon] = process.argv.slice(2);
  if (!code) { console.error('Thiếu plus code'); process.exit(1); }
  const r = code.indexOf('+') < SEP && refLat
    ? recover(code, +refLat, +refLon)
    : decode(code);
  const cellM = Math.round((r as any).latRes * 111000);
  console.log(`\n${code}${(r as any).full ? `  →  mã đầy đủ ${(r as any).full}` : ''}`);
  console.log(`   ${r.lat.toFixed(6)}, ${r.lon.toFixed(6)}   (ô ~${cellM}m)`);
  const j: any = await (await fetch(
    `https://api.open-meteo.com/v1/elevation?latitude=${r.lat.toFixed(5)}&longitude=${r.lon.toFixed(5)}`)).json();
  console.log(`   DEM: ${j.elevation?.[0]}m`);
}
main().catch(e => { console.error('❌', e?.message || e); process.exit(1); });
