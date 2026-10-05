#!/usr/bin/env python3
"""
audit_cloudmask.py — KIỂM CHỨNG nhãn CLEAR của verify_satellite.py bằng một sản phẩm ĐỘC LẬP.

Vì sao cần (05/10/2026): `CldTopHght` dùng -999 cho "không có số". Vì -999 nhỏ hơn mọi đáy
thung lũng nên classify() trả CLEAR — tức "không đo được" và "trời quang" đi ra CÙNG một nhãn.
Đo trên 43 file đã thu: 44% khung mang -999, và 650/789 dòng CLEAR (82%) KHÔNG có lấy một
khung nào đo được đỉnh mây thật. Nếu -999 nghĩa là "trượt phép truy hồi" thì 32% tập sự thật
là âm tính giả và mọi bảng hiệu chuẩn từ 03/09 đều vô nghĩa.

Script này hỏi sản phẩm `AHI-CMSK` (cùng thư mục, cùng mốc thời gian) — dataset `CloudMask`
với flag_meanings = "clear probably_clear probably_cloudy cloudy". Đó là mặt nạ trời quang
chính thức, độc lập với phép truy hồi độ cao.

KẾT QUẢ LẦN ĐẦU (05/10/2026, 143 dòng CLEAR-toàn-no-data trên 6 ngày rải từ 02/09 đến 05/10):

    khung:  clear 580 (81%) · probably_clear 135 (19%) · cloudy 0
    dòng:   143/143 mask xác nhận QUANG  →  nhãn CLEAR cũ ĐÚNG

⇒ -999 ở sản phẩm này nghĩa là "không có mây nên không có đỉnh mây", KHÔNG phải trượt truy hồi.
Tập sự thật KHÔNG bị nhiễm, và 650 dòng CLEAR kia là mẫu ÂM TÍNH thật — đúng thứ bộ kiểm chứng
vẫn thiếu. Vì thế classify() GIỮ NGUYÊN việc trả CLEAR cho no-data; đổi sang NO_DATA sẽ ném đi
650 nhãn âm tính hợp lệ.

Chạy lại khi nghi ngờ (vd thấy một ngày CLEAR mà thực địa báo có biển mây):
    ~/.venvs/ch-verify/bin/python tools/audit_cloudmask.py 2026-09-02 2026-10-02
    ~/.venvs/ch-verify/bin/python tools/audit_cloudmask.py --all        # mọi ngày đã có nhãn
"""
from __future__ import annotations
import argparse, collections, glob, json, os, re, sys, urllib.request
from datetime import datetime, timedelta
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from verify_satellite import BUCKET, DAWN_UTC_SLOTS, row_col   # noqa: E402

MEANING = ['clear', 'probably_clear', 'probably_cloudy', 'cloudy']


def find_cmsk(date: str, hhmm: str) -> str | None:
    url = (f'{BUCKET}?list-type=2&prefix=AHI-L2-FLDK-Clouds/'
           f'{date[:4]}/{date[5:7]}/{date[8:10]}/{hhmm}/AHI-CMSK&max-keys=5')
    try:
        body = urllib.request.urlopen(url, timeout=30).read().decode()
    except Exception:
        return None
    keys = re.findall(r'<Key>([^<]+)</Key>', body)
    return keys[0] if keys else None


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('dates', nargs='*', help='ngày rạng sáng cần soi (YYYY-MM-DD)')
    ap.add_argument('--all', action='store_true', help='mọi ngày đã có file nhãn vệ tinh')
    args = ap.parse_args()
    import fsspec, h5py

    if args.all:
        dates = sorted(os.path.basename(p)[:10]
                       for p in glob.glob(os.path.join(ROOT, 'data/observations/*-satellite.json')))
    else:
        dates = args.dates
    if not dates:
        raise SystemExit('❌ cần ít nhất một ngày, hoặc --all')

    spots = {s['key']: s for s in json.load(
        open(os.path.join(ROOT, 'data/spots.json'), encoding='utf-8'))}

    # chỉ soi những dòng mà nhãn = CLEAR và KHÔNG khung nào đo được đỉnh mây thật —
    # đúng tập hợp mà câu hỏi "no-data hay trời quang?" có thể làm đổi kết luận
    targets: dict[str, set[str]] = {}
    for d in dates:
        f = os.path.join(ROOT, f'data/observations/{d}-satellite.json')
        if not os.path.exists(f):
            print(f'   (bỏ {d}: chưa có nhãn)', file=sys.stderr)
            continue
        for o in json.load(open(f)):
            frames = o.get('frames') or []
            measured = [x['top_m'] for x in frames
                        if x['top_m'] is not None and x['top_m'] >= 0]
            if o['verdict'] == 'CLEAR' and not measured and o['key'] in spots:
                targets.setdefault(d, set()).add(o['key'])
    if not targets:
        print('Không có dòng CLEAR-toàn-no-data nào trong các ngày này — không có gì phải kiểm.')
        return
    print('dòng CLEAR-toàn-no-data sẽ soi: '
          + ', '.join(f'{d}:{len(v)}' for d, v in sorted(targets.items())), flush=True)

    fs = fsspec.filesystem('http')
    frame_tally: collections.Counter = collections.Counter()
    per_row: dict[tuple[str, str], list[str]] = collections.defaultdict(list)

    for d, keys in sorted(targets.items()):
        rc = {k: row_col(spots[k]['lat'], spots[k]['lon']) for k in keys}
        rows = [r for r, _ in rc.values()]
        cols = [c for _, c in rc.values()]
        r0, r1 = min(rows) - 1, max(rows) + 2
        c0, c1 = min(cols) - 1, max(cols) + 2
        prev = (datetime.strptime(d, '%Y-%m-%d') - timedelta(days=1)).strftime('%Y-%m-%d')
        for date, hhmm in [(prev if h >= '2100' else d, h) for h in DAWN_UTC_SLOTS]:
            key = find_cmsk(date, hhmm)
            if not key:
                continue
            try:
                f = fs.open(BUCKET + key, block_size=1024 * 1024, cache_type='readahead')
                with h5py.File(f, 'r') as h:
                    mask = h['CloudMask'][r0:r1, c0:c1]
            except Exception as e:      # mạng/S3 hỏng thì KÊU, không im lặng bỏ qua
                print(f'   ⚠️  {date} {hhmm}Z đọc lỗi: {e}', file=sys.stderr)
                continue
            for k in keys:
                r, c = rc[k]
                w = mask[r - r0 - 1:r - r0 + 2, c - c0 - 1:c - c0 + 2].ravel()
                w = w[w >= 0]                       # -128 = fill của chính mặt nạ
                if w.size == 0:
                    frame_tally['mask cũng không có số'] += 1
                    per_row[(d, k)].append('fill')
                    continue
                lab = MEANING[int(np.median(w))]
                frame_tally[lab] += 1
                per_row[(d, k)].append(lab)
        print(f'   xong {d}', flush=True)

    total = sum(frame_tally.values())
    print(f'\n=== KHUNG ({total}) ===')
    for k, v in frame_tally.most_common():
        print(f'   {k:26} {v:5}  {v / total * 100:5.1f}%')

    agg: collections.Counter = collections.Counter()
    wrong: list[tuple[str, str]] = []
    for (d, k), labs in per_row.items():
        cloudy = sum(1 for x in labs if x in ('probably_cloudy', 'cloudy'))
        if cloudy >= 2:
            agg['mask nói CÓ MÂY → nhãn CLEAR cũ SAI'] += 1
            wrong.append((d, k))
        elif cloudy == 1:
            agg['có mây 1 khung (ranh giới)'] += 1
        else:
            agg['mask xác nhận QUANG → CLEAR cũ ĐÚNG'] += 1
    n = sum(agg.values())
    print(f'\n=== DÒNG điểm-ngày ({n}) ===')
    for k, v in agg.most_common():
        print(f'   {k:40} {v:4}  {v / n * 100:5.1f}%')
    if wrong:
        print('\n⚠️  NHỮNG DÒNG PHẢI GÁN NHÃN LẠI:')
        for d, k in wrong:
            print(f'   {d}  {k}')
    else:
        print('\n✅ Không dòng nào sai: -999 ở sản phẩm này đúng là "không có mây".')


if __name__ == '__main__':
    main()
