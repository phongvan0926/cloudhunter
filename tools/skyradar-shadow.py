#!/usr/bin/env python3
"""Chụp phán quyết "săn mây" (sanMay) của skyradar.vn cho các điểm của CloudHunter, để ĐỐI CHỨNG về sau.

Chỉ đọc, mỗi điểm một lượt như người dùng bấm vào bản đồ (~12s/điểm, tuần tự). KHÔNG dùng để vào engine:
skyradar tự gắn nhãn 'shadow: true' / 'Đang thử nghiệm'. Mục đích: khi có nhãn vệ tinh/người đi của ngày D,
chấm xem phán quyết của họ so với engine của mình đúng/sai bao nhiêu (xem docs/skyradar-doi-chung.md).

Dùng:  pw-python tools/skyradar-shadow.py [KEY ...]   (không KEY = bộ mặc định)
Ra:    data/skyradar-shadow/<ngày chạy>.json  {key: [{t, bienMay, cheTamNhin, tamNhin, index, viewClear, below, spread}]}
"""
import json, re, sys, datetime, pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
DEFAULT = ['TA_XUA_SON_LA','FANSIPAN','PHINH_HO','PU_LUONG','SUOI_THAU','HANG_KIA_PA_CO','PA_PHACH','SAPA_HAM_RONG',
           'DEO_THUNG_KHE','CUC_TAY_A_PA_CHAI','KY_QUAN_SAN','LAO_THAN','NHIU_CO_SAN','BA_VI','TAM_DAO','LANG_BIANG',
           'BACH_MA','SI_THAU_CHAI']
keys = sys.argv[1:] or DEFAULT
src = (ROOT / 'constants/mountains.ts').read_text()
pts = {}
for k in keys:
    m = re.search(r'\b' + re.escape(k) + r':\s*\{[^}]*?lat:\s*([\d.]+),\s*lon:\s*([\d.]+)', src, re.S)
    if not m:
        print('KHÔNG TÌM THẤY toạ độ', k, file=sys.stderr); continue
    pts[k] = (m[1], m[2])
if not pts:
    sys.exit('không có điểm nào')
out = {}
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={'width': 1280, 'height': 900})
    pg.goto('https://skyradar.vn/', wait_until='networkidle', timeout=60000)
    pg.get_by_text('Dong y').click(); pg.get_by_text('Start', exact=True).click()
    for k, (la, lo) in pts.items():
        pg.evaluate('()=>{window.currentSelectedHours=[]}')
        pg.evaluate(f"window.fetchWeatherData('{la}','{lo}','{k}')")
        try:
            pg.wait_for_function("()=>(window.currentSelectedHours||[]).some(h=>h.sanMay&&h.sanMay.verdict)", timeout=30000)
        except Exception:
            print('HẾT GIỜ', k, file=sys.stderr)  # đọc hụt thì kêu, không ghi []
            continue
        pg.wait_for_timeout(3000)
        hs = pg.evaluate("()=>(window.currentSelectedHours||[]).filter(h=>h.sanMay&&h.sanMay.verdict).map(h=>({t:h.time,sm:h.sanMay}))")
        out[k] = [{'t': h['t'], **{x: h['sm']['verdict'].get(x) for x in ('bienMay', 'cheTamNhin', 'tamNhin')},
                   **{x: h['sm'].get(x) for x in ('index', 'viewClear', 'below', 'spread')}} for h in hs]
        print(k, len(out[k]), flush=True)
    b.close()
if len(out) < len(pts):
    print(f'CHỈ {len(out)}/{len(pts)} điểm đọc được', file=sys.stderr)
day = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).strftime('%Y-%m-%d')
(ROOT / 'data/skyradar-shadow').mkdir(exist_ok=True)
(ROOT / f'data/skyradar-shadow/{day}.json').write_text(json.dumps(out, ensure_ascii=False))
print('đã ghi', day, len(out), 'điểm')
