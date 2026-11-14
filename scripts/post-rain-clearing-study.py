"""Phiếu g1a01 (14/11/2026 23:10): 14/11 có biển mây gần như khắp Tây Bắc. Có dấu hiệu nào từ thời tiết
hôm đó và các ngày TRƯỚC để nhận ra ngày tương tự không?

Giả thuyết D, CHỐT TRƯỚC khi chấm (viết lúc 23:2x 14/11, chỉ nhìn số liệu 12-14/11, chưa nhìn các ngày khác):
  "Đêm quang đầu tiên sau đợt mưa/âm u, trên diện rộng". Mỗi ngày d, một cụm (SAPA, MU_CANG_CHAI, MOC_CHAU,
  HA_GIANG; số 05h mô hình phân tích trong regional-days.json) BẬT khi đủ cả ba:
    (a) đêm d quang trên cao: midNight <= 20 và highNight <= 20 và rainNight <= 0,3
    (b) ướt trước đó: trong 3 ngày d-1..d-3 có >= 2 ngày "ướt" (rainNight + rainPrevAfternoon >= 1mm, hoặc midNight >= 80)
    (c) khô trên cao: rh700 <= 40
  Ngày d BẬT khi >= 3/4 cụm bật.
Lý do vật lý (sách vở, không phải từ dữ liệu này): đất và thung lũng còn đẫm nước sau mưa, trời quang đột ngột
cho bức xạ đêm mạnh, không khí khô sụt xuống từ trên cao tạo nắp => sương bức xạ dày, phủ rộng.

Sự thật theo ngày: KHÔNG có nguồn tốt cho "rất nhiều nơi". In song song: số điểm người đi + Facebook (tin >= 0,6)
có biển mây, và vệ tinh (SEA_CONFIRMED+SEA_MARGINAL / số điểm vệ tinh nhìn được). Vệ tinh mù sương thung lũng,
người đi thì chỉ báo khi đẹp (không có mẫu âm), nên đây là MÔ TẢ, không phải phép chấm có độ chính xác.

Chạy: python3 scripts/post-rain-clearing-study.py
"""
import json, glob, collections

reg = json.load(open('data/observations/regional-days.json'))['days']
days = sorted(reg)

def wet(c):
    return (c['rainNight'] + c['rainPrevAfternoon']) >= 1 or c['midNight'] >= 80

def cluster_on(d, k):
    c = reg[d][k]
    a = c['midNight'] <= 20 and c['highNight'] <= 20 and c['rainNight'] <= 0.3
    i = days.index(d)
    prev = [reg[days[j]].get(k) for j in range(i - 3, i) if j >= 0 and reg[days[j]].get(k)]
    if len(prev) < 3: return None          # thiếu dữ liệu 3 ngày trước: không đánh giá, không ghi 0
    b = sum(wet(p) for p in prev) >= 2
    cc = c['rh700'] <= 40
    return a and b and cc

sat = {}
for f in glob.glob('data/observations/*-satellite.json'):
    v = collections.Counter(x['verdict'] for x in json.load(open(f)))
    sat[f.split('/')[-1][:10]] = (v['SEA_CONFIRMED'] + v['SEA_MARGINAL'], sum(n for k, n in v.items() if k != 'BLOCKED_ABOVE'))
hum = collections.defaultdict(set)
for x in json.load(open('data/observations/field-reports.json')):
    if x.get('seaLevel') in ('BELOW', 'AT_EYE'): hum[x['date']].add(x.get('spotKey') or x['locationName'])
for x in json.load(open('data/observations/fb-auto-reports.json')):
    if x.get('seaLevel') in ('BELOW', 'AT_EYE') and (x.get('confidence') or 0) >= 0.6 and not x.get('needsReview'):
        hum[x['date']].add(x['spotKey'])

fired, evaluated = [], 0
for d in days:
    res = {k: cluster_on(d, k) for k in reg[d]}
    known = [v for v in res.values() if v is not None]
    if len(known) < 3: continue
    evaluated += 1
    n = sum(1 for v in known if v)
    if n >= 3: fired.append(d)
    if n >= 2 or d in fired:
        s = sat.get(d)
        print(f"{d}  cụm bật {n}/{len(known)} {'<= D BẬT' if d in fired else ''}  | người+FB có biển mây: {len(hum.get(d, []))}"
              f"  | vệ tinh: {s[0]}/{s[1] if s else '-'}" if s else f"{d}  cụm bật {n}/{len(known)} {'<= D BẬT' if d in fired else ''}  | người+FB: {len(hum.get(d, []))} | vệ tinh: -")
print(f"\nD bật {len(fired)}/{evaluated} ngày đánh giá được: {fired}")
top = sorted(hum, key=lambda d: -len(hum[d]))[:6]
print('Ngày nhiều điểm người+FB báo có biển mây nhất:', [(d, len(hum[d])) for d in top])
print('Riêng từng điều kiện (số ngày >= 3 cụm đạt):')
for name, f in [('(a) đêm quang', lambda c, prev: c['midNight'] <= 20 and c['highNight'] <= 20 and c['rainNight'] <= 0.3),
                ('(b) ướt 2/3 ngày trước', lambda c, prev: sum(wet(p) for p in prev) >= 2),
                ('(c) rh700<=40', lambda c, prev: c['rh700'] <= 40)]:
    hit = []
    for d in days:
        i = days.index(d); cnt = 0; ok = 0
        for k, c in reg[d].items():
            prev = [reg[days[j]].get(k) for j in range(i - 3, i) if j >= 0 and reg[days[j]].get(k)]
            if len(prev) < 3: continue
            ok += 1; cnt += bool(f(c, prev))
        if ok >= 3 and cnt >= 3: hit.append(d)
    print(f"  {name}: {len(hit)} ngày")
