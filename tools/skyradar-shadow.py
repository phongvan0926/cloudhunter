#!/usr/bin/env python3
"""Chụp phán quyết "săn mây" (sanMay) của skyradar.vn cho các điểm của CloudHunter, để ĐỐI CHỨNG về sau.

Chỉ đọc, mỗi điểm một lượt như người dùng bấm vào bản đồ, tuần tự, giãn GAP_S giây giữa hai điểm.
KHÔNG dùng để vào engine, KHÔNG là nhãn sự thật: skyradar tự gắn nhãn 'shadow: true' / 'Đang thử nghiệm'.
Mục đích: khi có nhãn vệ tinh/người đi của ngày D, calibrate.ts in bảng ĐỐI CHỨNG (họ vs mình vs nhãn),
xem scripts/shadow-contrast.ts và docs/skyradar-doi-chung.md.

Dùng:  python tools/skyradar-shadow.py [KEY ...]   (không KEY = bộ mặc định; trên máy anh: pw-python)
Ra:    data/skyradar-shadow/<YYYY-MM-DDTHHMM giờ VN lúc chụp>.json (đã có bản trong 6 giờ qua thì không chụp lại)
       {"chup_luc": ISO+07:00, "nguon": ..., "diem": {key: [{t, bienMay, cheTamNhin, tamNhin, index, viewClear, below, spread}]}}
       t là giờ địa phương VN của skyradar; chỉ giữ giờ GIU_GIO (rạng sáng) để kho không phình.
Mã thoát: 0 đủ điểm | 3 thiếu điểm (vẫn ghi phần đọc được, job phải ĐỎ) | 1 không đọc được điểm nào (KHÔNG ghi tệp).
"""
import json, os, re, sys, time, datetime, pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
DEFAULT = ['TA_XUA_SON_LA','FANSIPAN','PHINH_HO','PU_LUONG','SUOI_THAU','HANG_KIA_PA_CO','PA_PHACH','SAPA_HAM_RONG',
           'DEO_THUNG_KHE','CUC_TAY_A_PA_CHAI','KY_QUAN_SAN','LAO_THAN','NHIU_CO_SAN','BA_VI','TAM_DAO','LANG_BIANG',
           'BACH_MA','SI_THAU_CHAI']
GAP_S = 6                       # nghỉ giữa hai điểm (ngoài ~10 s trang tự tải), nhịp như người bấm
GIU_GIO = range(3, 10)          # 03:00-09:00 giờ VN: khung rạng sáng mà CloudHunter dự báo
UA = ('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) '
      'Chrome/130.0.0.0 Safari/537.36')
VN = datetime.timezone(datetime.timedelta(hours=7))


def main() -> int:
    keys = sys.argv[1:] or DEFAULT
    src = (ROOT / 'constants/mountains.ts').read_text()
    pts = {}
    for k in keys:
        m = re.search(r'\b' + re.escape(k) + r':\s*\{[^}]*?lat:\s*([\d.]+),\s*lon:\s*([\d.]+)', src, re.S)
        if not m:
            print('LỖI: không tìm thấy toạ độ', k, file=sys.stderr)
            continue
        pts[k] = (m[1], m[2])
    if not pts:
        print('LỖI: không có điểm nào', file=sys.stderr)
        return 1
    now = datetime.datetime.now(VN)
    out_dir = pathlib.Path(os.environ.get('SHADOW_OUT_DIR') or ROOT / 'data/skyradar-shadow')  # biến môi trường: chạy thử
    dest = out_dir / f'{now:%Y-%m-%dT%H%M}.json'
    for f in out_dir.glob('*.json') if out_dir.exists() else []:
        at = datetime.datetime.fromisoformat(json.loads(f.read_text())['chup_luc'])
        if now - at < datetime.timedelta(hours=6):
            print('đã có bản chụp trong 6 giờ qua, không chụp lại:', f.name)
            return 0
    out = {}
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        pg = b.new_page(viewport={'width': 1280, 'height': 900}, user_agent=UA)
        pg.goto('https://skyradar.vn/', wait_until='networkidle', timeout=90000)
        # Màn chào/đồng ý đổi theo phiên bản trang (19/11 sáng có "Dong y"+"Start", 10h đã không còn):
        # bấm nếu có, rồi kiểm cái thật sự cần là hàm tải dự báo của trang.
        for txt in ('Dong y', 'Đồng ý', 'Start', 'Keep exploring', 'Tiếp tục khám phá'):
            loc = pg.get_by_text(txt, exact=True)
            if loc.count() and loc.first.is_visible():
                loc.first.click(); pg.wait_for_timeout(500)
        pg.wait_for_function("()=>typeof window.fetchWeatherData==='function'", timeout=30000)
        for i, (k, (la, lo)) in enumerate(pts.items()):
            if i:
                time.sleep(GAP_S)
            pg.evaluate('()=>{window.currentSelectedHours=[]}')
            pg.evaluate(f"window.fetchWeatherData('{la}','{lo}','{k}')")
            try:
                pg.wait_for_function("()=>(window.currentSelectedHours||[]).some(h=>h.sanMay&&h.sanMay.verdict)", timeout=45000)
            except Exception as e:
                print('LỖI: hết giờ chờ', k, type(e).__name__, file=sys.stderr)  # đọc hụt thì kêu, không ghi []
                continue
            pg.wait_for_timeout(3000)
            hs = pg.evaluate("()=>(window.currentSelectedHours||[]).filter(h=>h.sanMay&&h.sanMay.verdict).map(h=>({t:h.time,sm:h.sanMay}))")
            rows = [{'t': h['t'], **{x: h['sm']['verdict'].get(x) for x in ('bienMay', 'cheTamNhin', 'tamNhin')},
                     **{x: h['sm'].get(x) for x in ('index', 'viewClear', 'below', 'spread')}}
                    for h in hs if int(h['t'][11:13]) in GIU_GIO]
            if not rows:
                print('LỖI: có dữ liệu nhưng không có giờ rạng sáng nào', k, file=sys.stderr)
                continue
            out[k] = rows
            print(k, len(rows), 'giờ', flush=True)
        b.close()
    if not out:
        print('LỖI: không đọc được điểm nào, KHÔNG ghi tệp', file=sys.stderr)
        return 1
    out_dir.mkdir(exist_ok=True)
    dest.write_text(json.dumps({'chup_luc': now.isoformat(timespec='minutes'),
                                'nguon': 'skyradar.vn sanMay (shadow, KHÔNG phải nhãn sự thật)',
                                'diem': out}, ensure_ascii=False))
    print('đã ghi', dest.name, len(out), 'điểm')
    if len(out) < len(keys):   # tính cả điểm không tìm thấy toạ độ
        print(f'LỖI: chỉ {len(out)}/{len(keys)} điểm đọc được', file=sys.stderr)
        return 3
    return 0


if __name__ == '__main__':
    sys.exit(main())
