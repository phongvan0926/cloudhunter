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

0. **ĐỊNH HƯỚNG SỐ 1 CỦA DỰ ÁN (anh Phong chốt 19/11/2026, phiếu gcc29).** Lời anh, nguyên văn:
   *"định hướng đây là app cho dân du lịch, phượt muốn check các điều kiện thời tiết đặc biệt là biển
   mây và độ khó về mặt thời tiết, khí hậu của cung đường đi => CÁI NÀY QUAN TRỌNG NÊN HÃY GHI NHỚ VÀ
   ƯU TIÊN HÀNG ĐẦU TRONG DỰ ÁN"*. Nghĩa là: mọi việc được xếp hạng theo giá trị cho người đi phượt
   (biển mây ở điểm đến + thời tiết/độ khó của CẢ cung đường đi tới đó). Ba triết lý dưới vẫn giữ nguyên.
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
- `docs/cung-duong-kiem-chung.md` - đọc khi đụng ngưỡng độ khó cung đường, bản chụp tuyến, hay có báo cáo chuyến đi thật.
- `docs/skyradar-doi-chung.md` - đọc khi so với đối thủ skyradar.vn, hoặc chạy `tools/skyradar-shadow.py` (chụp phán quyết biển mây của họ để đối chứng; KHÔNG dùng làm nhãn sự thật).

`services/routeService.ts` + `components/RouteWeather.tsx` (19/11/2026, phiếu gcc29, định hướng số 1): thời tiết + độ khó CUNG ĐƯỜNG.
OSRM công khai (tuyến) -> Elevation API (<= 100 điểm, 1 call) -> Open-Meteo đa toạ độ có `elevation=` (1 call, ~16 điểm x 8 biến,
past_days=3 cho mưa 72h). Ngưỡng tham khảo gom ở `TH`, có nguồn; ô tô bỏ cảnh báo lạnh/gió cấp 5. Giờ đi qua theo tốc độ TB người
dùng chọn, KHÔNG theo giờ OSRM (đo 19/11: Hà Nội - Tà Xùa OSRM báo 2h47 cho 203 km). Thiếu dự báo giờ đó -> điểm "chưa có dự báo",
không bịa. `summarizeDay` = Tóm tắt ngày tại đích (dùng `destOm`, không gọi thêm API; mây theo buổi là TỔNG MÂY, không phải biển mây). Là tính năng UI: không tham gia điểm/trạng thái/đáng đi. Test: `tests/route.test.ts`.
Vòng 2 (19/11/2026): xe máy -> Valhalla FOSSGIS (`fetchValhallaMoto`, use_highways 0.5: đo 0 cho tuyến vòng 425 km thay vì 224;
điều khoản: ghi công OSM + link fixthemap luôn hiện, <= 1 yêu cầu/giây, script Node phải `setFetchHeaders` UA nêu tên app), lỗi thì OSRM
+ `fallbackNote` "TUYẾN Ô TÔ"; có thu phí -> `cautionNote`. `fetchRoadDistances` = OSRM table (<= 99 đích/lần, cache 24h) cho km đường
trong TonightRanking. `dawnHours` = bảng 4-9h tại đích dùng luật cung đường, KHÔNG phải điểm biển mây theo giờ (engine chỉ có theo ngày,
đừng bịa). Đổi luật `assessPoint`/`TH` thì tăng `ROUTE_RULES_VERSION`. `scripts/snapshot-routes.ts` chụp 8 tuyến cố định (thứ 8 = Sa Pa - đèo Ô Quy Hồ, 19/11, để ghép nhãn FB) mỗi tối (bước phụ
trong job snapshot) vào `data/observations/<D>-routes.json`; bộ tuyến chỉ THÊM không sửa; cách chấm: `docs/cung-duong-kiem-chung.md`.
Vòng 3 (19/11/2026): `planRoute(..., onStep)` báo 3 bước cho thanh tiến độ; `getJson` trần `FETCH_TIMEOUT_MS` 30 s (AbortController),
lỗi HTTP qua `httpErrorText` (429 nói rõ là giới hạn theo mạng). `compactRoute` = dạng gọn dùng chung cho bản chụp và tuyến người dùng
(`saveUserRoute`/`loadUserRoutes`/`exportUserRoutesJson`, key `ch-user-routes-v1`, tối đa 50, làm tròn 0,01°, chỉ trong máy).
Chân trang `footer-credits`: ghi công OSM/FOSSGIS/Open-Meteo + GitHub Issues + email liên hệ (thêm 19/11 bởi phiếu g35fa, commit ca740b1).
Vòng 4 (19/11/2026): KHÍ HẬU THEO THÁNG. `scripts/climate-monthly.ts` tính sẵn từ Open-Meteo archive-api (ERA5/ERA5-Land 2016-2025,
4 biến ngày, ~104 lượt quy đổi/vị trí) cho đích + mốc dọc 8 tuyến (`scripts/fixed-routes.ts`, dùng chung với snapshot-routes; mốc 40 km
+ điểm cao nhất) rồi các điểm thư viện -> `public/climate/monthly-v1.json`. Có `--budget` (mặc định 5.000/lần, chung IP với job chụp đêm),
`--pace`, đệm thô ở `~/.cache/cloudhunter-climate`: chạy lại là nối tiếp; mục chưa lấy/lỗi ghi vào `missing` của tệp và in ra, mã thoát 3.
`services/climateService.ts`: `aggregateMonthly` (thiếu số không coi là 0), `seaSeason` (người đi > FB > vệ tinh, `SEA_MIN_N` 5 chốt trước),
`routeClimate` (mỗi điểm mẫu lấy mốc gần nhất <= 30 km, chỉ số lấy nơi nặng nhất), ngưỡng `CTH` có nguồn (mưa/lạnh dùng lại `TH`; rét đậm/hại
KTTV; "ẩm suốt ngày" RHmin >= 90 là chỉ báo ĐOÁN thay sương mù). UI: ngày đi > hôm nay + 6 thì khối khí hậu thay phán quyết dự báo.
Không tham gia điểm/trạng thái/đáng đi; không đổi `ROUTE_RULES_VERSION`.
Nhãn Facebook cho cung đường do bộ thu FB (ngoài repo) gắn bằng luật chữ, không LLM; tóm tắt số ở `docs/cung-duong-kiem-chung.md` mục 2.
Shadow skyradar: job `skyradar` (cùng cron snapshot) chạy `tools/skyradar-shadow.py` -> `data/skyradar-shadow/<YYYY-MM-DDTHHMM>.json`
(mã thoát 0/3/1, thiếu thì job ĐỎ); `scripts/shadow-contrast.ts` in bảng đối chứng trong calibrate, luật chọn bản chụp chốt trước, không chỉnh.

Đợt "dự báo tại điểm thung lũng" (19/11/2026, ý b skyradar): luật "điểm DEM thấp nhất trong 20 km" ĐÃ BỊ BÁC (báo nhầm 419 -> 612,
bootstrap ngày [-241, -143]); đừng thử lại cùng luật chọn điểm. Đợt sau nếu làm thì theo đề xuất phản biện trong `NHAT-KY-HIEU-CHINH.md`
(vùng nhìn thấy, cùng lưu vực, 3-8 km, khác ô mô hình, kiểm cơ chế đầu vào trước). Công cụ: `scripts/replay-valley.ts`, `scripts/ab-valley.ts`.

`components/SnapshotHistory.tsx` (17/11/2026): nút "Bản chụp dự báo hằng ngày" đọc `data/observations/<ngày>-forecast.json` qua raw.githubusercontent.com (kho public, CORS mở), chỉ đọc. Đổi tên kho/nhánh hoặc chuyển kho private thì tính năng này hỏng.

Kênh chụp thứ hai (17/11/2026, phiếu gb369): `tools/snapshot-local.sh` + `~/.config/systemd/user/cloudhunter-snapshot.{service,timer}` chạy trên máy anh, dùng bản clone riêng (không đụng thư mục làm việc), commit "[máy nhà]" thẳng lên main. KHÔNG bao giờ `--force`. Bản 17/11 chụp lúc ~01:23 sáng 17/11 (lead ~3,5h; GitHub nổ trễ lúc ~01:50, sau máy nhà, chỉ ghi được bản tuần vì bản chính đã có), vẫn trước rạng sáng nhưng ngắn hơn bản thường.

### 🔎 Cờ theo dõi "giống sáng 14/11" (14/11/2026, phiếu g6102)

`services/capWatch.ts`: tầng thấp bão hoà + nghịch nhiệt có nắp + khô trên cao (6 điều kiện, ngưỡng đóng băng). Là GIẢ THUYẾT
chưa kiểm chứng (1/86 ngày), chỉ hiện ghi chú tím trong app và ghi vào bản chụp; KHÔNG tham gia điểm/trạng thái/đáng đi.
Đừng chỉnh ngưỡng theo kết quả chấm; đưa vào engine chỉ sau >= 5 ngày MATCH trên dự báo thật và qua Luật cổng. Chi tiết:
`docs/ca-thuc-dia-thang-10.md` (cuối tệp).
Dấu hiệu vùng D "đêm quang đầu tiên sau đợt mưa" (phiếu g1a01): chốt trước, in trong calibrate, 2/86 ngày; cùng luật đóng băng như C.
Lịch sử: `historyService` 10 lần phân tích; `rankingService.archiveRanking` lưu bảng xếp hạng 14 ngày (`ch-rank-archive-v1`), xem trong TonightRanking.

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
npm test       # vitest — 218 test (engine + lịch sử + capWatch + cung đường + khí hậu tháng + thung lũng v2 + đối chứng skyradar...)
npm run build  # vite build (Tailwind build-time, copy vercel.json vào dist)
```

Deploy: push `main` → GitHub Pages (base `/cloudhunter/`) + Vercel (huntercloud.vercel.app,
base `/` qua env VERCEL). Nhánh `gh-pages` bị Vercel bỏ qua nhờ vercel.json nằm trong dist.

