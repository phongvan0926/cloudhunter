# 🤖 AGENTS.md — CloudHunter AI System Architecture & AI Developer Guidelines

Tài liệu kiến trúc + quy tắc phát triển cho AI assistant (Claude, Gemini, Cursor...) tiếp tục
maintain **CloudHunter AI** — app dự báo biển mây cho núi cao Việt Nam.

> **Bản v5 (2026-08): tái kiến trúc lớn.** AI không còn tính điểm; mọi con số do
> `services/cloudScoreEngine.ts` tính deterministic. Dữ liệu giả (synthetic weather,
> consensus cứng 94%, tọa độ GPX bịa, fallback Y Tý ngầm) đã bị loại bỏ toàn bộ.
> **Engine 2.0 (18/8/2026):** profile 7 mực áp suất với geopotential THẬT, cloud cover
> từng tầng, boundary layer height đêm, mực đóng băng — xem mục Vật lý.
> **19/8/2026: 6 mô hình** — thêm JMA, UKMO 10km (lưới mịn nhất miễn phí, đủ 7 mực),
> ECMWF AIFS (model AI, id phải là `ecmwf_aifs025_single` — `ecmwf_aifs025` trả toàn null).
> KMA không phủ VN; CMA có trường mây không đáng tin (đã kiểm chứng) — KHÔNG dùng.

---

## 📌 Triết lý bắt buộc

1. **Con số = code, tư vấn = AI.** Điểm số, trạng thái, LCL, mặt mây, ΔH, FSI, VRII... đều
   tính trong engine TypeScript thuần (test được, tái lập được). Gemini CHỈ viết lời bình
   từ kết quả engine và bị cấm sửa/bịa số (xem `NARRATIVE_SYSTEM` trong geminiService).
2. **Không bao giờ bịa dữ liệu.** Ngày ngoài phạm vi dự báo → `data_quality: NO_DATA`,
   trạng thái UNKNOWN, chỉ số N/A. "Fail-safe" nghĩa là app không crash và nói thật
   "chưa có dữ liệu" — KHÔNG phải sinh số giả. (Quy tắc này thay thế "Rule 2" cũ.)
3. **Mọi nguồn dữ liệu phải dán nhãn.** Địa danh: DB / GEOCODE / AI-ước-tính. Địa hình:
   HARDCODED / DEM. Từng ngày: FORECAST / UNCERTAIN / NO_DATA. Đồng thuận mô hình:
   tính thật từ dữ liệu từng mô hình, không có giá trị mặc định.


### 🧭 Luật cổng khi tự sửa engine (anh Phong uỷ quyền 18/10/2026)

Lời anh, nguyên văn: *"Phiên CloudHunter có quyền sửa, nhưng nói họ kiểm tra thật kỹ và nếu cần gọi
agent độc lập về chuyên ngành này kiểm định lại 1 lần trước khi sửa lớn, còn tinh chỉnh nhỏ theo dữ
liệu thực tế cung cấp thì k quá cần. tôi chỉ cần review lại theo 1 thời gian, tôi không phải chuyên
gia thời tiết nên hãy chọn cách nào mà có sự chính xác tự quyết tốt nhất và sát thực tế nhất"*

1. **Tinh chỉnh nhỏ** (nhập dữ liệu, công cụ đo, chữ hiển thị, hằng số phụ không quyết định lời
   khuyên): tự làm. Vẫn chấm trên toàn kho nếu có đụng tới số, và ghi vào `NHAT-KY-HIEU-CHINH.md`.
2. **Sửa lớn** gồm: đổi cấu trúc engine (`estimateCloudTop`, `combineModels`, các cổng trạng thái),
   đổi ngưỡng lõi (luật "đáng đi", biên ΔH, `observerInCloud`, thang gió), đổi trọng số chính của
   điểm, hoặc trọng số hoá mô hình. Bắt buộc theo thứ tự:
   a. Viết giả thuyết và phép đo TRƯỚC khi nhìn kết quả.
   b. Chấm luật cũ và luật mới trên **toàn kho bản chụp, cùng một mẻ dữ liệu**, tách theo nguồn sự
      thật. In danh sách mọi ca đổi kết luận, theo cả hai chiều.
   c. **Không được làm tăng BỎ SÓT** trên các ca người đi + Facebook. Nếu báo nhầm tăng thì phải nêu
      rõ đổi lấy gì. Ca dùng để nghĩ ra bản sửa không được tính là lợi ích của nó.
   d. Gọi **một agent độc lập** đóng vai chuyên gia khí tượng / vi khí hậu vùng núi để phản biện một
      lần. Đưa cho agent đó giả thuyết, số đo và danh sách ca đổi, nhưng không đưa kết luận mình mong
      muốn. Ghi lại từng ý phản biện và cách đã xử lý ý đó.
   e. Đổi `ENGINE_VERSION`, cập nhật AGENTS.md/README, rồi ghi một mục vào `NHAT-KY-HIEU-CHINH.md`
      để anh xem lại theo đợt.
3. **Không bao giờ:** chụp bù bản chụp, sửa nhãn sự thật cho vừa app, chỉnh `FB_MIN_CONFIDENCE` hay
   ngưỡng nào khác theo kết quả chấm.


### 🗺️ Toạ độ điểm — quy tắc bắt buộc khi thêm/sửa

- Toạ độ phải có **nguồn** ghi ngay trong comment (node OSM có tên, hoặc cực đại DEM có mốc đối chiếu).
- Chạy `npx vite-node scripts/snapshot-dem.ts` rồi `npm test`: lệch |khai báo − DEM| > 400m là **fail**.
- Không chắc thì gắn `needsReview: '<lý do>'` — điểm đó **bị loại khỏi bảng xếp hạng** và
  hiện cảnh báo khi phân tích. Thà nói "chưa chắc chỗ này" còn hơn dự báo tự tin cho nhầm nơi.
- Đỉnh núi: toạ độ = chóp, độ cao = số đo đã công bố (DEM 90m làm tù đỉnh nhọn 100–250m là bình thường).
  Bản/đèo/điểm ngắm: toạ độ = chính chỗ đứng, độ cao = **đúng DEM** (đừng lấy số quảng cáo du lịch).

## 📚 Chi tiết đã tách sang `docs/` (nguyên văn, không nạp sẵn)

Mục lục: đọc đúng tệp khi làm việc tương ứng. Không viết `@docs/...` trong tài liệu này (dấu `@` làm Claude Code tự nạp tệp).

- `docs/engine-2-2-den-2-6.md` - đọc khi sửa `cloudScoreEngine` phần mưa/nghịch nhiệt/mặt mây/bỏ phiếu mô hình (lịch sử 5 ca Tà Xùa, Suôi Thầu).
- `docs/vong-kiem-chung-va-facebook.md` - đọc khi chạy calibrate, nhập nhãn Facebook, hay hỏi nguồn sự thật nào đáng tin hơn (thứ bậc nguồn, nhãn FB từng ngày).
- `docs/engine-2-7-den-2-8.md` - đọc khi đụng luật đáng đi, bộ dò mây đội đỉnh, hoặc workflow vòng kiểm chứng GitHub Actions và lịch cron.
- `docs/ca-thuc-dia-thang-10.md` - đọc khi xét ca thực địa tháng 10, ngày diện rộng (giả thuyết A/B), mức điểm >= 65, kết quả đợt `estimateCloudTop` 30/10.
- `docs/kiem-chung-ngoai-mau-va-ve-tinh.md` - đọc khi so vệ tinh với người đi, nghi mẫu âm tính, lỗi PWA tự reload, hay số đo đầu tiên của luật đáng đi.
- `docs/engine-2-8-x-va-diem-needsreview.md` - đọc khi động tới biên ΔH, `observerInCloud`, gió tại chỗ đứng, hindcast, hay thêm/sửa điểm trong thư viện.
- `docs/rang-buoc-vat-ly.md` - đọc TRƯỚC khi sửa vật lý engine (nghịch nhiệt, mực áp suất, estimateCloudTop, BLH, gió theo zone, mùa, ensemble).
- `docs/luong-du-lieu-file-chinh-backlog.md` - đọc khi cần bảng file chính, luồng dữ liệu v5, hoặc backlog.

## 🛠️ Quy tắc dev

1. **Mọi call AI qua `executeWithFallback`** — không gọi `ai.models.generateContent` trực tiếp.
2. **Không thêm lại dữ liệu giả dưới mọi hình thức** (số mặc định "an toàn", consensus cứng,
   tọa độ placeholder...). Thiếu dữ liệu = nói thật là thiếu.
3. **Không giao phép tính cho AI.** Cần chỉ số mới → thêm vào engine + viết golden test.
4. **Prompt AI không được gợi ý AI "tìm kiếm Internet"** — model không có tool search trong
   app này; câu lệnh như vậy chỉ tạo ảo giác "đã nghiên cứu".
5. Sửa engine xong PHẢI chạy: `npm run lint && npm test && npm run build`.
6. UI giữ glassmorphism dark-mode; Tailwind build-time (index.css, không CDN).
   **Trang kết quả phải verdict-first**: thêm khối mới thì đặt SAU phán quyết và mặc định
   thu gọn (`<details>`); Header nhận `compact` khi đang xem kết quả (bỏ logo+chip ~400px).
   Điểm chọn từ thư viện xác thực (source='DB') bỏ qua màn "Xác nhận địa điểm".
   **A11y bắt buộc:** phần tử bấm được là `<button>` thật với aria-label, tap target
   ≥44px (min-h-11), không dùng chữ <10px, modal phải có role=dialog + Esc + khóa scroll.
   Nhãn chữ TRONG SVG viewBox bị co theo màn hình → ẩn ở mobile (`hidden md:block`),
   thông tin phải có ở HTML bên ngoài. Tên file tải về dùng `vnSlug` (bỏ dấu đúng cách).
7. **Mọi thay đổi có ý nghĩa phải cập nhật README.md + AGENTS.md trong CÙNG commit và
   push lên GitHub ngay** — tài liệu lệch code là coi như chưa xong việc (yêu cầu của chủ dự án).
8. **Thêm điểm săn mây mới vào thư viện** theo quy trình xác minh: (a) OSM/Nominatim, hoặc
   (b) giải mã plus code Google Maps user cung cấp (OLC alphabet `23456789CFGHJMPQRVWX`,
   khôi phục prefix từ xã tham chiếu, BẮT BUỘC bước hiệu chỉnh nearest-to-reference ±nửa ô
   — từng suýt sai 111km với xã nằm ranh ô 1°), (c) đối chiếu độ cao DEM (Open-Meteo
   Elevation API). Không xác minh được → KHÔNG thêm; xin user plus code.
9. **Fallback model AI**: giữ bậc thang chất lượng trong `fallbackPriority` (Lite gần cuối,
   **Gemma −1000000 = tuyệt đối cuối** — bug thật: "gemma-3-27b" bắt số 3 → 30 điểm, chen
   trước gemini-2.5-flash làm user chọn 3.7 Flash bị đưa về Gemma; có test hồi quy), lọc
   model ảnh/Live qua `isTextAnalysisModel`, và luôn hiển thị `modelFallbackNote` khi model
   người dùng chọn bị thay.
   **Không ghim tên model (14/10/2026, khi ra Gemini 4 Argon):** mặc định = `pickDefaultModel`
   = Flash có SỐ phiên bản, ổn định, số cao nhất key thấy (ra 3.9 Flash thì tự lên 3.9) — KHÔNG
   sort chữ cái: bản cũ chọn nhầm `gemini-flash-lite-latest` vì 'f' > '3'. **Alias
   `gemini-flash-latest` KHÔNG làm mặc định nữa (16/10/2026):** anh Phong chọn alias mà kết quả
   ra 2.5 Flash; Google không công bố alias đang trỏ tới bản nào (trang models 13/10 chỉ ghi
   "stable, preview hoặc experimental"). Alias chỉ dùng khi key không thấy bản số nào. Mặc định
   tự dò thì KHÔNG lưu xuống máy (lưu là ghim người dùng ở mặc định cũ); `getStoredModel` xoá
   một lần alias mà bản 14/10 đã tự lưu. Kết quả hiện thêm `→ Google chạy: <modelVersion>` khi
   tên Google báo trong phản hồi khác tên đã gọi, để luôn biết alias phân giải ra bản nào.
   **Dự phòng (26/10/2026):** anh chạy key thật, 3.8 Flash quá 60 giây, app rơi sang `gemini-flash-latest`
   và anh "vẫn không biết model nào trả lời". Nay `fallbackPriority` xếp alias không số SAU mọi Flash có
   số ổn định (vẫn trước preview/Lite/Gemma), và `modelFallbackNote` kèm bản Google báo đã chạy, hoặc nói
   thẳng "Google không báo tên bản". Timeout 60s giữ nguyên: một lần quá giờ chưa đủ để biết 3.8 Flash luôn
   chậm hay chỉ chậm hôm đó. `classifyTier` xếp
   pro/ultra/argon/thinking vào **Cao cấp**: chỉ chạy khi người dùng tự chọn, không mặc định,
   không vào `buildFallbackChain` (Argon: "not available on the Free tier", đo trang pricing
   14/10). Chuỗi dự phòng chỉ gồm Flash + Gemma cuối; họ model tên mã lạ ('custom') cũng bị
   loại vì chưa biết giá. Ra họ cao cấp mới có tên mã khác thì thêm từ khoá vào `PREMIUM_WORDS`.
   `isTextAnalysisModel` chặn thêm banana/transcribe/translate/lyria/omni/deep-research/antigravity.
10. **Ngày giờ**: mọi phép "hôm nay" dùng `vnTodayStr()` (Asia/Ho_Chi_Minh) — cấm
   `toISOString().split('T')` cho ngày hiển thị (đó là ngày UTC, lùi 1 ngày lúc 0-7h VN).
   Hiển thị 1 ngày cụ thể: `new Date(d + 'T12:00:00+07:00')` (không `new Date(d)` = 0h UTC).
11. **Ngân sách API Open-Meteo** (miễn phí: 600/phút, 5.000/giờ, 10.000/ngày; 1 call ≈
   locations × vars/10 × models): 1 lần xếp hạng ≈ 600+ call quy đổi → BẮT BUỘC cache
   (RANK_CACHE 30 phút) và không thêm biến vào `HOURLY_VARS` nếu engine không đọc.
   Điểm quan sát chỉ xin `OBSERVER_VARS` (5 biến), không xin cả bộ profile.
   Đáy thung lũng dùng chung cache `cloudhunter_valley_dem_v2` (CÓ vân tay lat/lon —
   sửa tọa độ là tự đo lại) giữa xếp hạng và phân tích đầy đủ, tránh 429 chuỗi.
12. **Ngưỡng "đáng đi" = `WORTH_GOING_SCORE`** (engine export) — cấm hard-code 60/65 rời rạc.
   Hòa phiếu trạng thái → trạng thái AN TOÀN hơn thắng (`STATUS_SEVERITY`), không theo thứ tự model.

## 🧪 Lệnh kiểm tra

```bash
npm run lint   # tsc --noEmit
npm test       # vitest — 128 golden tests engine
npm run build  # vite build (Tailwind build-time, copy vercel.json vào dist)
```

Deploy: push `main` → GitHub Pages (base `/cloudhunter/`) + Vercel (huntercloud.vercel.app,
base `/` qua env VERCEL). Nhánh `gh-pages` bị Vercel bỏ qua nhờ vercel.json nằm trong dist.

