#!/usr/bin/env bash
# VÒNG ĐỐI CHIẾU HẰNG ĐÊM cổng bóng agy (phiếu g2448). Chạy sau bản chụp 22:30 bằng systemd timer, dùng bản clone riêng
# của kênh chụp (không đụng thư mục làm việc). Đo -> ghi bảng -> (nếu có lượt quyết định) đổi cờ -> commit + push -> deploy khi cờ đổi.
# Thoát 1 = LỖI ĐO (báo đỏ, không đổi gì). KHÔNG --force. Không LLM, không gọi Open-Meteo.
set -uo pipefail
R="${CH_SNAP_DIR:-$HOME/.local/share/cloudhunter-snapshot}"
export PATH=/usr/bin:/bin:/usr/local/bin
cd "$R" || exit 1
for try in 1 2 3; do git fetch -q origin main && git reset -q --hard origin/main && break; sleep 30; done
flagval() { node -e 'try{const f=JSON.parse(require("fs").readFileSync("data/agy-gate-flag.json","utf8"));console.log(String(f.enabled))}catch(e){console.log("loi")}'; }
before="$(flagval)"
npx --no-install vite-node scripts/agy-gate-loop.ts; rc=$?
[ "$rc" = 0 ] || { echo "❌ vòng đối chiếu thoát mã $rc, không commit"; exit "$rc"; }
git config user.name "cloudhunter-snapshot-local"; git config user.email "cloudhunter-snapshot-local@users.noreply.github.com"
git add data/agy-gate-flag.json data/agy-gate-doichieu.json data/agy-gate-doichieu.md NHAT-KY-HIEU-CHINH.md
git diff --cached --quiet && { echo "không có gì mới"; exit 0; }
git commit -q -m "đối chiếu cổng agy $(TZ=Asia/Ho_Chi_Minh date +%F) [máy nhà]"
for try in 1 2 3; do
  git pull -q --rebase origin main && git push -q origin HEAD:main && break
  git rebase --abort 2>/dev/null; sleep 20; [ "$try" = 3 ] && { echo "❌ không đẩy được"; exit 1; }
done
after="$(flagval)"
if [ "$before" != "$after" ]; then echo "cờ đổi $before -> $after: chạy deploy"; gh workflow run deploy.yml || { echo "❌ deploy không gọi được"; exit 1; }; fi
echo "✅ xong"
