"""Phiếu g9518: 'tầng thấp bão hoà + nghịch nhiệt có nắp' có tách ngày diện rộng khỏi ngày thường không?
Chạy: DUMP_WIDE_DAYS=/tmp/wide.json npx vite-node scripts/calibrate.ts; python3 scripts/capped-fog-study.py /tmp/wide.json
Luật C chốt TRƯỚC khi chấm (từ mô tả 14/11, không chỉnh theo kết quả):
  một cụm bất kỳ trong 4 cụm có: rh925>=90, dpd2m<=1, lapse850_700<=5.0 (ổn định), rh700<=40 (khô trên nắp),
  wind850<=10, rainNight<=0.3.  Cũng in từng điều kiện riêng và biến thể bỏ-1-điều-kiện."""
import json, sys, itertools
reg = json.load(open('data/observations/regional-days.json'))['days']
wide = {x['d']: x for x in json.load(open(sys.argv[1]))}
CONDS = {
 'bão hoà thấp (rh925>=90)': lambda c: c['rh925'] >= 90,
 'sát đất (dpd2m<=1)': lambda c: c['dpd2m'] <= 1,
 'ổn định 850-700 (lapse<=5)': lambda c: c['lapse850_700'] <= 5.0,
 'khô trên nắp (rh700<=40)': lambda c: c['rh700'] <= 40,
 'gió yếu (wind850<=10)': lambda c: c['wind850'] <= 10,
 'đêm không mưa (rainNight<=0.3)': lambda c: c['rainNight'] <= 0.3,
}
def day_hit(d, names):
    return any(all(CONDS[n](c) for n in names) for c in reg[d].values())
def table(names, label):
    tp=fp=fn=tn=0; hit_days=[]
    for d,w in sorted(wide.items()):
        if w['truth'] is None or d not in reg: continue
        p = day_hit(d, names)
        if p: hit_days.append((d, w['truth']))
        if w['truth']: tp+=p; fn+=(not p)
        else: fp+=p; tn+=(not p)
    print(f"{label:48s} bật {tp+fp:2d} ngày: trúng {tp} · nhầm {fp} | sót {fn} · đúng-không {tn}")
    return hit_days
allc = list(CONDS)
print('--- ngày có sự thật (diện rộng: %d, không: %d; bỏ %d ngày không rõ)' % (
  sum(1 for w in wide.values() if w['truth'] is True), sum(1 for w in wide.values() if w['truth'] is False),
  sum(1 for w in wide.values() if w['truth'] is None)))
hd = table(allc, 'LUẬT C (đủ 6 điều kiện)')
print('   ngày bật:', [(d, 'CÓ' if t else 'không') for d,t in hd])
for n in allc: table([n], '  riêng: '+n)
for n in allc: table([m for m in allc if m!=n], '  bỏ: '+n)
print('--- 14/11 và các ngày trước (số vùng 05h, cụm bật nhiều điều kiện nhất)')
for d in sorted(reg)[-8:]:
    best = max(reg[d].items(), key=lambda kv: sum(f(kv[1]) for f in CONDS.values()))
    print(d, best[0], sum(f(best[1]) for f in CONDS.values()), '/6',
          'thật:', wide.get(d,{}).get('sea'), '/', wide.get(d,{}).get('seen'))
print('--- mọi ngày bật C (kể cả ngày không rõ):')
print([d for d in sorted(reg) if day_hit(d, allc)])
