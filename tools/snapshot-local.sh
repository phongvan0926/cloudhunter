#!/usr/bin/env bash
# KÊNH CHỤP THỨ HAI (17/11/2026, phiếu gb369): chạy trên máy anh bằng systemd timer, song song với
# GitHub Actions (cron GitHub trễ 3-10 giờ, có hôm không nổ). Ai chụp trước thì giữ, bên sau thấy
# file đã có thì bỏ qua (snapshot-forecast.ts không đè). Dùng bản clone riêng, không đụng thư mục làm việc.
#
# NHÁNH 429-THEO-NGÀY (28/11/2026, phiếu g2a0b): tối 27/11 cả 19:30 lẫn 22:30 hỏng vì Open-Meteo trả
# 429 "Daily API request limit exceeded" cho IP nhà ngay lượt gọi đầu (hạn mức ngày đã bị các phép
# đo/replay trong ngày dùng hết, giống 19/11). Thử lại 4 lần trong 26 phút là vô ích: hạn mức ngày chỉ
# hồi sau nửa đêm UTC. Nay sau MỖI lần chụp hỏng, script gọi một lượt dò rẻ (1 toạ độ, 1 biến); thấy
# chữ "Daily API request limit" thì nhờ GitHub Actions chụp hộ (IP khác):
# `gh workflow run verify-loop.yml -f job=snapshot -f date=$D`, rồi chờ tệp $D-forecast.json xuất hiện
# trên origin/main. Chỉ thoát đỏ khi cả Actions cũng hỏng / quá giờ chờ.
# Biến môi trường (để test, mặc định là đồ thật): CH_NPX, CH_GH, CH_PROBE (lệnh in thân phản hồi dò),
# CH_RETRY_WAITS, CH_POLL_SEC, CH_DISPATCH_WAIT.
set -uo pipefail
R="${CH_SNAP_DIR:-$HOME/.local/share/cloudhunter-snapshot}"
export PATH=/usr/bin:/bin:/usr/local/bin
cd "$R" || exit 1
TZ=Asia/Ho_Chi_Minh
NPX="${CH_NPX:-npx}"
GH="${CH_GH:-/usr/bin/gh}"
RETRY_WAITS="${CH_RETRY_WAITS:-0 180 480 900}"
POLL_SEC="${CH_POLL_SEC:-60}"
DISPATCH_WAIT="${CH_DISPATCH_WAIT:-2400}"   # đo 27/11: lượt kích tay chạy 5 phút; chờ tối đa 40 phút
D="${1:-$(TZ=Asia/Ho_Chi_Minh date -d tomorrow +%F)}"   # rạng sáng cần chụp
T="$(TZ=Asia/Ho_Chi_Minh date -d "$D -1 day" +%F)"       # ngày chụp xa (lead 1-7)

probe_open_meteo() {
  if [ -n "${CH_PROBE:-}" ]; then bash -c "$CH_PROBE"; return; fi
  curl -s --max-time 30 'https://api.open-meteo.com/v1/forecast?latitude=22.33&longitude=103.84&hourly=temperature_2m&forecast_days=1'
}

on_origin() { git fetch -q origin main 2>/dev/null; git cat-file -e "origin/main:data/observations/$D-forecast.json" 2>/dev/null; }

# Hạn mức ngày của IP nhà đã hết: nhờ Actions chụp. Không kích trùng nếu đã có lượt verify-loop đang chạy/chờ.
dispatch_actions() {
  echo "⚠️ Open-Meteo hết hạn mức NGÀY cho IP nhà; nhờ GitHub Actions chụp $D"
  local busy
  busy="$("$GH" run list --workflow verify-loop.yml --limit 5 --json status --jq '[.[] | select(.status != "completed")] | length' 2>/dev/null || echo 0)"
  if [ "${busy:-0}" -gt 0 ]; then
    echo "đã có $busy lượt verify-loop đang chạy/chờ, không kích thêm, chỉ chờ tệp"
  elif ! "$GH" workflow run verify-loop.yml -f job=snapshot -f date="$D"; then
    echo "❌ không kích được Actions (gh lỗi); bản chụp $D chưa có"; return 1
  fi
  local waited=0
  while [ "$waited" -lt "$DISPATCH_WAIT" ]; do
    if on_origin; then echo "✅ Actions đã chụp $D (đã có trên origin/main sau ~${waited}s)"; return 0; fi
    sleep "$POLL_SEC"; waited=$((waited + POLL_SEC))
  done
  on_origin && { echo "✅ Actions đã chụp $D"; return 0; }
  echo "❌ chờ ${DISPATCH_WAIT}s mà origin/main chưa có $D-forecast.json (xem: gh run list --workflow verify-loop.yml)"
  return 1
}

for try in 1 2 3; do
  git fetch -q origin main && git reset -q --hard origin/main && break
  sleep 60
done
if [ -f "data/observations/$D-forecast.json" ]; then echo "đã có bản chụp $D (GitHub hoặc lần trước), không làm gì"; exit 0; fi
ok=0
for wait in $RETRY_WAITS; do
  [ "$wait" -gt 0 ] && { echo "chụp $D lỗi, chờ ${wait}s"; sleep "$wait"; }
  "$NPX" --no-install vite-node scripts/snapshot-forecast.ts "$D" && { ok=1; break; }
  if probe_open_meteo | grep -q "Daily API request limit"; then
    dispatch_actions; exit $?
  fi
done
[ "$ok" = 1 ] || { echo "❌ chụp $D thất bại sau $(echo $RETRY_WAITS | wc -w) lần"; exit 1; }
"$NPX" --no-install vite-node scripts/snapshot-week.ts "$T" || echo "cảnh báo: chụp tuần $T lỗi, bản chính vẫn giữ"
git config user.name "cloudhunter-snapshot-local"; git config user.email "cloudhunter-snapshot-local@users.noreply.github.com"
git add data/observations/ data/valley-dem-seed.json
git diff --cached --quiet && { echo "không có gì mới"; exit 0; }
git commit -q -m "chụp dự báo $D [máy nhà]"
for try in 1 2 3; do
  git pull -q --rebase origin main && git push -q origin HEAD:main && { echo "✅ đã đẩy bản chụp $D"; exit 0; }
  git rebase --abort 2>/dev/null; sleep 20
done
echo "❌ không đẩy được bản chụp $D (file vẫn nằm ở $R)"; exit 1
