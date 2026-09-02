#!/usr/bin/env python3
"""
verify_satellite.py — DÁN NHÃN SỰ THẬT cho từng điểm săn mây bằng vệ tinh Himawari-9.

Vì sao cần: mô hình dự báo toàn cầu (ô lưới 9-25km) không phân giải nổi biển mây trong
thung lũng Tây Bắc, nên không thể lấy chính mô hình ra chấm điểm mô hình. Vệ tinh thì ĐO
THẬT: sản phẩm NOAA AHI-L2 "CldTopHght" cho ĐỘ CAO ĐỈNH MÂY 2km/pixel, 10 phút/lần,
lưu trữ công khai trên S3 (không cần tài khoản, không cần khoá).

Chính con số đó là thứ engine dự báo: biển mây = đỉnh mây nằm TRÊN đáy thung lũng nhưng
DƯỚI chỗ đứng. So được trực tiếp, không phải suy diễn.

GIỚI HẠN TRUNG THỰC: vệ tinh hồng ngoại chỉ thấy LỚP MÂY TRÊN CÙNG. Hôm nào có mây cao
dày che kín (vd 23/8/2026, ti tầng ở 13.800m, phát xạ 0.9) thì KHÔNG thể biết bên dưới có
biển mây hay không — lúc đó tool trả 'BLOCKED_HIGH', KHÔNG đoán bừa.

Cài (một lần):
    python3 -m venv ~/.venvs/ch-verify && ~/.venvs/ch-verify/bin/pip install h5py fsspec requests aiohttp

Chạy:
    npx vite-node scripts/export-spots.ts            # làm mới data/spots.json
    ~/.venvs/ch-verify/bin/python tools/verify_satellite.py 2026-08-23
    ~/.venvs/ch-verify/bin/python tools/verify_satellite.py 2026-08-23 --spots TA_XUA_SON_LA
"""
from __future__ import annotations

import argparse
import json
import math
import os
import re
import sys
import urllib.request
from datetime import datetime, timedelta

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUCKET = 'https://noaa-himawari9.s3.amazonaws.com/'
SUB_LON, EA, EB, SAT_H = 140.7, 6378.137, 6356.7523, 42164.0
FULL = 5500                      # lưới 2km của AHI
COFF = LOFF = FULL / 2 + 0.5
CFAC = LFAC = 20466275

# Cửa sổ săn mây 04:00-07:00 giờ VN = 21:00-00:00 UTC (VN = UTC+7)
DAWN_UTC_SLOTS = ['2130', '2200', '2230', '2300', '2330']

# Ngưỡng phân loại (m)
MARGIN_BELOW = 100      # đỉnh mây phải thấp hơn chỗ đứng ít nhất ngần này mới tính "đứng trên biển mây"
MARGIN_ABOVE = 150      # đỉnh mây phải cao hơn đáy thung lũng ngần này mới coi là có lớp mây thật
HIGH_CLOUD_M = 6000     # trên mức này coi như mây tầng cao che mất tầm nhìn xuống dưới
OPAQUE_EMISS = 0.6      # phát xạ >= mức này thì lớp trên đục, không nhìn xuyên được


def row_col(lat: float, lon: float) -> tuple[int, int]:
    """Toạ độ địa lý -> (hàng, cột) trên lưới địa tĩnh của Himawari."""
    phi, lam, slon = math.radians(lat), math.radians(lon), math.radians(SUB_LON)
    phi_c = math.atan(EB * EB / (EA * EA) * math.tan(phi))
    re_ = EB / math.sqrt(1 - (EA * EA - EB * EB) / (EA * EA) * math.cos(phi_c) ** 2)
    r1 = SAT_H - re_ * math.cos(phi_c) * math.cos(lam - slon)
    r2 = -re_ * math.cos(phi_c) * math.sin(lam - slon)
    r3 = re_ * math.sin(phi_c)
    rn = math.sqrt(r1 * r1 + r2 * r2 + r3 * r3)
    x = math.degrees(math.atan2(-r2, r1))
    y = math.degrees(math.asin(-r3 / rn))
    return int(round(LOFF + y * 2 ** -16 * LFAC)), int(round(COFF + x * 2 ** -16 * CFAC))


def find_chgt(date: str, hhmm: str) -> str | None:
    url = (f'{BUCKET}?list-type=2&prefix=AHI-L2-FLDK-Clouds/'
           f'{date[:4]}/{date[5:7]}/{date[8:10]}/{hhmm}/AHI-CHGT&max-keys=5')
    try:
        body = urllib.request.urlopen(url, timeout=30).read().decode()
    except Exception:
        return None
    keys = re.findall(r'<Key>([^<]+)</Key>', body)
    return keys[0] if keys else None


# Trên chỗ đứng bao nhiêu thì coi là MỘT LỚP MÂY KHÁC (không phải lớp đang trùm lên mình)
SEPARATE_DECK_M = 1500


def classify(top: float | None, emiss: float | None, obs: int, valley: int) -> tuple[str, str]:
    """Một khung ảnh -> nhãn. Nguyên tắc: thà nói KHÔNG BIẾT còn hơn đoán."""
    if top is None:
        return 'CLEAR', 'Vệ tinh không thấy mây ở ô này'
    if top >= HIGH_CLOUD_M or top > obs + SEPARATE_DECK_M:
        # Lớp mây nằm CAO HẲN so với chỗ đứng là một tầng khác. Vệ tinh hồng ngoại chỉ đọc
        # được lớp trên cùng, nên bên dưới có biển mây hay không là KHÔNG THỂ BIẾT — kể cả khi
        # lớp trên mỏng, vì mây mỏng làm sai lệch luôn phép tính độ cao của lớp dưới.
        return 'BLOCKED_ABOVE', f'Có tầng mây ở {top:.0f}m phía trên — không nhìn được xuống dưới'
    if top <= valley + MARGIN_ABOVE:
        return 'CLEAR', f'Đỉnh mây {top:.0f}m chưa vượt đáy thung lũng {valley}m'
    if top <= obs - MARGIN_BELOW:
        return 'SEA_CONFIRMED', f'Đỉnh mây {top:.0f}m — dưới chỗ đứng {obs}m: ĐỨNG TRÊN BIỂN MÂY'
    if top <= obs + 250:
        return 'SEA_MARGINAL', f'Đỉnh mây {top:.0f}m ngang chỗ đứng {obs}m — mây dập dềnh qua mặt'
    return 'FOGGED_IN', f'Đỉnh mây {top:.0f}m trùm qua chỗ đứng {obs}m — chìm trong mây'


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('date', help='ngày giờ VN, YYYY-MM-DD')
    ap.add_argument('--spots', help='danh sách key, phân cách bằng dấu phẩy')
    ap.add_argument('--out', default=None)
    args = ap.parse_args()

    import fsspec, h5py                                     # noqa: E402  (chỉ cần khi chạy thật)

    spots = json.load(open(os.path.join(ROOT, 'data', 'spots.json'), encoding='utf-8'))
    if args.spots:
        want = set(args.spots.split(','))
        spots = [s for s in spots if s['key'] in want]
    if not spots:
        raise SystemExit('❌ Không có điểm nào để kiểm chứng')

    # Rạng sáng ngày D giờ VN = 21:00-24:00 UTC ngày D-1 và 00:00 UTC ngày D
    d = datetime.strptime(args.date, '%Y-%m-%d')
    prev = (d - timedelta(days=1)).strftime('%Y-%m-%d')
    slots = [(prev if h >= '2100' else args.date, h) for h in DAWN_UTC_SLOTS]

    rc = {s['key']: row_col(s['lat'], s['lon']) for s in spots}
    rows = [r for r, _ in rc.values()]
    cols = [c for _, c in rc.values()]
    r0, r1 = min(rows) - 3, max(rows) + 4
    c0, c1 = min(cols) - 3, max(cols) + 4

    fs = fsspec.filesystem('http')
    # key -> danh sách (giờ VN, đỉnh mây, phát xạ)
    series: dict[str, list[tuple[str, float | None, float | None]]] = {s['key']: [] for s in spots}

    for date, hhmm in slots:
        key = find_chgt(date, hhmm)
        if not key:
            print(f'   {hhmm}Z: không có dữ liệu', file=sys.stderr)
            continue
        f = fs.open(BUCKET + key, block_size=1024 * 1024, cache_type='readahead')
        with h5py.File(f, 'r') as h:
            hgt = h['CldTopHght'][r0:r1, c0:c1].astype('float64')
            ems = h['CldTopEmss'][r0:r1, c0:c1].astype('float64')
        hgt[hgt < -1e10] = np.nan
        ems[ems < -1e10] = np.nan
        vn = (int(hhmm[:2]) + 7) % 24
        for s in spots:
            r, c = rc[s['key']]
            win = hgt[r - r0 - 1:r - r0 + 2, c - c0 - 1:c - c0 + 2]
            wem = ems[r - r0 - 1:r - r0 + 2, c - c0 - 1:c - c0 + 2]
            top = None if np.all(np.isnan(win)) else float(np.nanmedian(win))
            emi = None if np.all(np.isnan(wem)) else float(np.nanmedian(wem))
            series[s['key']].append((f'{vn:02d}:{hhmm[2:]}', top, emi))
        print(f'   {hhmm}Z ({vn:02d}h VN) ✓', file=sys.stderr)

    out = []
    for s in spots:
        obs, valley = s['elevation'], s['valleyElevation'] or max(80, s['elevation'] - 900)
        marks = [classify(t, e, obs, valley) for _, t, e in series[s['key']]]
        labels = [m[0] for m in marks]
        # Nhãn của NGÀY: ưu tiên bằng chứng dương (chỉ cần vài khung có biển mây là có thật),
        # nhưng nếu đa số khung bị mây cao che thì phải thừa nhận là KHÔNG kiểm chứng được.
        if labels.count('SEA_CONFIRMED') >= 2:
            verdict = 'SEA_CONFIRMED'
        elif labels.count('SEA_CONFIRMED') + labels.count('SEA_MARGINAL') >= 2:
            verdict = 'SEA_MARGINAL'
        elif labels.count('BLOCKED_ABOVE') >= max(2, len(labels) // 2):
            verdict = 'BLOCKED_ABOVE'
        elif labels.count('FOGGED_IN') >= 2:
            verdict = 'FOGGED_IN'
        elif labels:
            verdict = 'CLEAR'
        else:
            verdict = 'NO_DATA'
        tops = [t for _, t, _ in series[s['key']] if t is not None]
        out.append({
            'key': s['key'], 'name': s['name'], 'date': args.date, 'verdict': verdict,
            'observerAlt': obs, 'valleyElevation': valley,
            'cloudTopMedian_m': None if not tops else round(float(np.median(tops))),
            'frames': [{'vn': v, 'top_m': None if t is None else round(t), 'emiss': None if e is None else round(e, 2)}
                       for (v, t, e) in series[s['key']]],
            'source': 'NOAA AHI-L2-FLDK-Clouds (Himawari-9) CldTopHght, 2km',
        })

    out.sort(key=lambda o: ['SEA_CONFIRMED', 'SEA_MARGINAL', 'FOGGED_IN', 'CLEAR', 'BLOCKED_ABOVE', 'NO_DATA'].index(o['verdict']))
    path = args.out or os.path.join(ROOT, 'data', 'observations', f'{args.date}-satellite.json')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    json.dump(out, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

    print(f'\n🛰️  Nhãn vệ tinh rạng sáng {args.date} ({len(out)} điểm)\n')
    for o in out:
        top = '—' if o['cloudTopMedian_m'] is None else f"{o['cloudTopMedian_m']}m"
        print(f"  {o['verdict']:14s} {o['name'][:34]:36s} đỉnh mây {top:>7} / đứng {o['observerAlt']}m")
    from collections import Counter
    print('\n  ' + ', '.join(f'{k}={v}' for k, v in Counter(o['verdict'] for o in out).items()))
    print(f'  → {path}')


if __name__ == '__main__':
    main()
