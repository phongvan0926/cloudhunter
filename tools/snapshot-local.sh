#!/usr/bin/env bash
# KÊNH CHỤP THỨ HAI (17/11/2026, phiếu gb369): chạy trên máy anh bằng systemd timer, song song với
# GitHub Actions (cron GitHub trễ 3-10 giờ, có hôm không nổ). Ai chụp trước thì giữ, bên sau thấy
# file đã có thì bỏ qua (snapshot-forecast.ts không đè). Dùng bản clone riêng, không đụng thư mục làm việc.
set -uo pipefail
R="${CH_SNAP_DIR:-$HOME/.local/share/cloudhunter-snapshot}"
export PATH=/usr/bin:/bin:/usr/local/bin
cd "$R" || exit 1
TZ=Asia/Ho_Chi_Minh
D="${1:-$(TZ=Asia/Ho_Chi_Minh date -d tomorrow +%F)}"   # rạng sáng cần chụp
T="$(TZ=Asia/Ho_Chi_Minh date -d "$D -1 day" +%F)"       # ngày chụp xa (lead 1-7)
for try in 1 2 3; do
  git fetch -q origin main && git reset -q --hard origin/main && break
  sleep 60
done
if [ -f "data/observations/$D-forecast.json" ]; then echo "đã có bản chụp $D (GitHub hoặc lần trước), không làm gì"; exit 0; fi
ok=0
for wait in 0 180 480 900; do
  [ "$wait" -gt 0 ] && { echo "chụp $D lỗi, chờ ${wait}s"; sleep "$wait"; }
  npx --no-install vite-node scripts/snapshot-forecast.ts "$D" && { ok=1; break; }
done
[ "$ok" = 1 ] || { echo "❌ chụp $D thất bại sau 4 lần"; exit 1; }
npx --no-install vite-node scripts/snapshot-week.ts "$T" || echo "cảnh báo: chụp tuần $T lỗi, bản chính vẫn giữ"
git config user.name "cloudhunter-snapshot-local"; git config user.email "cloudhunter-snapshot-local@users.noreply.github.com"
git add data/observations/ data/valley-dem-seed.json
git diff --cached --quiet && { echo "không có gì mới"; exit 0; }
git commit -q -m "chụp dự báo $D [máy nhà]"
for try in 1 2 3; do
  git pull -q --rebase origin main && git push -q origin HEAD:main && { echo "✅ đã đẩy bản chụp $D"; exit 0; }
  git rebase --abort 2>/dev/null; sleep 20
done
echo "❌ không đẩy được bản chụp $D (file vẫn nằm ở $R)"; exit 1
