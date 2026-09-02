/**
 * find-spot.ts — TÌM toạ độ điểm ngắm cho một địa danh, bằng DEM chứ không bằng phỏng đoán.
 *
 * Vì sao cần: 5 điểm trong thư viện bị gắn cờ `needsReview` vì toạ độ trỏ nhầm chỗ (trỏ vào
 * thị trấn dưới lòng thung lũng, hoặc lệch hẳn sang vùng chỉ cao 610m). Người săn mây đứng
 * trên CAO ĐIỂM quanh địa danh, không đứng giữa chợ. Trước đây chỗ này chờ người dùng gửi
 * plus code; script này tự làm được phần lớn.
 *
 * Ba bước:
 *   1. Overpass (OSM) dịch tên → toạ độ đối tượng thật.
 *   2. Quét lưới DEM thô quanh trung tâm (Open-Meteo Elevation) → tìm vùng cao.
 *   3. Quét mịn quanh điểm cao nhất → toạ độ điểm ngắm.
 *
 * Chạy: npx vite-node scripts/find-spot.ts "Lũng Vân" 20.61 105.18 [bán_kính_km] [nửa_cạnh_hộp]
 *   hoặc npx vite-node scripts/find-spot.ts --at 20.61 105.18 [bán_kính_km] [mốc_độ_cao_m]
 *
 * KHÔNG tự ghi vào thư viện: kết quả cần người đọc xác nhận là đúng CHỖ NGƯỜI TA ĐỨNG,
 * chứ DEM chỉ biết chỗ nào cao.
 */
const UA = 'CloudHunterAI/1.0 (coordinate audit for cloud-hunting spots)'; // ASCII-only: header HTTP không nhận ký tự tiếng Việt

/**
 * Dịch TÊN → toạ độ bằng Overpass (OSM). Không dùng Nominatim: máy chạy script này không
 * phân giải được nominatim.openstreetmap.org, còn overpass-api.de thì được — và Overpass
 * đọc thẳng dữ liệu OSM nên còn chính xác hơn cho địa danh nhỏ.
 *
 * Bắt buộc truyền hộp giới hạn quanh vùng nghi ngờ: quét tên trên cả nước vừa chậm vừa
 * dính trùng tên (Việt Nam có rất nhiều "Bản Hang Đá").
 */
async function findByName(name: string, lat: number, lon: number, box: number) {
  const bbox = `${(lat - box).toFixed(3)},${(lon - box).toFixed(3)},${(lat + box).toFixed(3)},${(lon + box).toFixed(3)}`;
  const q = `[out:json][timeout:60];(`
    + `node["name"~"${name}",i](${bbox});`
    + `way["name"~"${name}",i](${bbox});`
    + `relation["name"~"${name}",i](${bbox});`
    + `);out center 25;`;
  // Overpass CHỈ nhận truy vấn qua trường form `data=`; gửi text/plain thì nó trả trang HTML lỗi.
  const r = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ data: q }).toString(),
  });
  const text = await r.text();
  let j: any;
  try { j = JSON.parse(text); }
  catch { console.log(`   ❌ Overpass trả về không phải JSON: ${text.slice(0, 120)}`); return null; }
  const hits = (j.elements ?? []).map((e: any) => ({
    lat: e.lat ?? e.center?.lat, lon: e.lon ?? e.center?.lon,
    name: e.tags?.name, kind: [e.tags?.natural, e.tags?.place, e.tags?.tourism, e.tags?.highway]
      .filter(Boolean).join('/') || e.type, ele: e.tags?.ele,
  })).filter((h: any) => typeof h.lat === 'number');
  if (!hits.length) { console.log('   ❌ Overpass không tìm thấy tên này trong hộp giới hạn'); return null; }
  console.log(`   Overpass tìm được ${hits.length} đối tượng:`);
  hits.slice(0, 10).forEach((h: any, i: number) =>
    console.log(`     ${i + 1}. ${String(h.name).slice(0, 40).padEnd(42)} ${h.kind.padEnd(14)}`
      + `${h.ele ? 'ele=' + h.ele + ' ' : ''}(${h.lat.toFixed(4)}, ${h.lon.toFixed(4)})`));
  return hits[0];
}

/** Độ cao DEM cho tối đa 100 toạ độ mỗi lần gọi. */
async function elevations(pts: { lat: number; lon: number }[]): Promise<(number | null)[]> {
  const out: (number | null)[] = [];
  for (let i = 0; i < pts.length; i += 100) {
    const c = pts.slice(i, i + 100);
    const url = `https://api.open-meteo.com/v1/elevation`
      + `?latitude=${c.map(p => p.lat.toFixed(5)).join(',')}`
      + `&longitude=${c.map(p => p.lon.toFixed(5)).join(',')}`;
    const j: any = await (await fetch(url)).json();
    if (j.error) throw new Error(j.reason);
    for (let k = 0; k < c.length; k++) out.push(j.elevation?.[k] ?? null);
    if (i + 100 < pts.length) await new Promise(r => setTimeout(r, 400));
  }
  return out;
}

/** Lưới n×n quanh (lat,lon) với nửa-cạnh radiusKm. */
function grid(lat: number, lon: number, radiusKm: number, n: number) {
  const dLat = radiusKm / 111;
  const dLon = radiusKm / (111 * Math.cos(lat * Math.PI / 180));
  const pts: { lat: number; lon: number }[] = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    pts.push({
      lat: lat - dLat + (2 * dLat * i) / (n - 1),
      lon: lon - dLon + (2 * dLon * j) / (n - 1),
    });
  }
  return pts;
}

async function scan(lat: number, lon: number, radiusKm: number, n: number, label: string,
                    target?: number) {
  const pts = grid(lat, lon, radiusKm, n);
  const els = await elevations(pts);
  const rows = pts.map((p, i) => ({ ...p, ele: els[i] }))
    .filter(r => typeof r.ele === 'number') as { lat: number; lon: number; ele: number }[];
  rows.sort((a, b) => b.ele - a.ele);
  const lo = [...rows].sort((a, b) => a.ele - b.ele);
  console.log(`\n   ${label}: lưới ${n}×${n} bán kính ${radiusKm}km — ${rows.length} điểm`);
  console.log(`   cao nhất:`);
  rows.slice(0, 5).forEach(r => console.log(`     ${String(Math.round(r.ele)).padStart(5)}m  ${r.lat.toFixed(4)}, ${r.lon.toFixed(4)}`));
  console.log(`   thấp nhất (đáy thung lũng quanh vùng): ${Math.round(lo[0].ele)}m  ${lo[0].lat.toFixed(4)}, ${lo[0].lon.toFixed(4)}`);
  if (target) {
    // "Cao nhất" là quy tắc chọn SAI cho điểm ngắm có độ cao đã biết: đỉnh cao nhất quanh
    // Bắc Yên là sống Tà Xùa 1.900m, không phải đồi Pu Nhi 1.000m. Khi đã biết độ cao mục
    // tiêu thì chọn theo ĐỘ KHỚP, không theo độ cao.
    const near = [...rows].sort((a, b) => Math.abs(a.ele - target) - Math.abs(b.ele - target));
    console.log(`   gần mốc ${target}m nhất:`);
    near.slice(0, 5).forEach(r => console.log(`     ${String(Math.round(r.ele)).padStart(5)}m  ${r.lat.toFixed(4)}, ${r.lon.toFixed(4)}`));
  }
  return rows;
}

async function main() {
  const args = process.argv.slice(2);
  let lat: number, lon: number, radius: number, target: number | undefined;
  if (args[0] === '--at') {
    lat = +args[1]; lon = +args[2]; radius = +(args[3] ?? 10);
    target = args[4] ? +args[4] : undefined;
    console.log(`\n📍 Quét quanh toạ độ cho sẵn (${lat}, ${lon})${target ? ` — mốc độ cao ${target}m` : ''}`);
  } else {
    // find-spot.ts "<tên>" <lat gần đúng> <lon gần đúng> [bán kính km] [nửa cạnh hộp độ]
    const [name, nearLat, nearLon, rad, box] = args;
    radius = +(rad ?? 10);
    console.log(`\n📍 Tra "${name}" quanh (${nearLat}, ${nearLon})`);
    const hit = await findByName(name, +nearLat, +nearLon, +(box ?? 0.35));
    if (!hit) return;
    lat = hit.lat; lon = hit.lon;
  }
  const coarse = await scan(lat, lon, radius, 10, 'VÒNG THÔ', target);
  // Vòng mịn quanh điểm ĐÁNG QUAN TÂM: cao nhất, hoặc khớp mốc độ cao nếu có mốc.
  const focus = target
    ? [...coarse].sort((a, b) => Math.abs(a.ele - target) - Math.abs(b.ele - target))[0]
    : coarse[0];
  await new Promise(r => setTimeout(r, 800));
  await scan(focus.lat, focus.lon, Math.max(1.5, radius / 5), 10,
             target ? `VÒNG MỊN quanh điểm khớp mốc ${target}m` : 'VÒNG MỊN quanh điểm cao nhất', target);
}

main().catch(e => { console.error('❌', e?.message || e); process.exit(1); });
