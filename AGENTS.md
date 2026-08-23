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

## 🔬 Vật lý biển mây (ràng buộc khi sửa engine)

### ⚠️ engine-2.2 (23/8/2026) — hiệu chỉnh sau ca kiểm chứng thật đầu tiên

Người dùng báo **Tà Xùa (Bắc Yên, Sơn La) có biển mây CẢ NGÀY 23/8/2026**, app trả về
`0/100 · RAIN · "hoãn kế hoạch săn mây"`. Mổ xẻ ra **năm** lỗi độc lập, mỗi lỗi nay có test khóa:

1. **Toạ độ sai 16km** — `TA_XUA_SON_LA` ghi `21.2655,104.2800` (DEM 324m) trong khi khu du
   lịch ở `21.2796,104.4326` (DEM 1.556m). Rà cả thư viện: **28/56 điểm sai >300m**. Xem
   `scripts/audit-coords.ts` + test ảnh chụp DEM.
2. **`cloud_cover_low` KHÔNG đủ để dò biển mây Việt Nam.** Ô lưới 9–25km của mô hình toàn cầu
   không phân giải nổi lớp sương dày 300–800m trong thung lũng hẹp. Hôm đó phân tích cho
   RH 96–99%, T−Td 0,2–0,5°C (**đã bão hoà**) mà `cloud_cover_low` chỉ 0–55%.
   → thêm `valleySaturation()`; engine lấy **max(tín hiệu mây thấp, tín hiệu bão hoà)**.
3. **Phạt hai lần cùng một cơ chế.** "Mây cao ban đêm ≥60% → −15" chỉ là *biến thay thế* để
   đoán "sẽ không có nghịch nhiệt". Hôm đó mây cao 100% mà nghịch nhiệt vẫn +4,6°C và lớp biên
   đêm 20m → phỏng đoán đã sai, không được trừ tiếp. Nay chỉ trừ −5 khi nghịch nhiệt đã hiện diện.
4. **Mưa bị coi là bằng chứng CHỐNG biển mây.** Ở mùa mưa Tây Bắc thì ngược lại: mưa nạp ẩm
   cho thung lũng, tạnh trước bình minh là kịch bản *"biển mây sau mưa"* kinh điển. Nay:
   phạt theo **cường độ mm/h** thay vì ngưỡng cứng, giảm còn 40% khi có "chữ ký biển mây",
   mưa đêm tạnh trước sáng chỉ −3, và **`RAIN` không còn xoá kết luận biển mây** — nhưng
   cảnh báo mưa thì bám vào **lượng mưa thật**, không bám vào trạng thái (không được nuốt cảnh báo).
5. **Chọn sai tầng gió.** Nắp nghịch nhiệt sinh ra chính là để **chặn xáo trộn thẳng đứng**;
   khi mặt biển mây nằm hẳn dưới nắp thì gió 850hPa (~1.500m) thổi ở tầng *bên trên*, không
   với xuống lớp mây. Hôm đó gió 850 = 22km/h (bị chấm "phá vỡ biển mây") còn gió 925 trong
   lớp mây chỉ 3–9km/h. Nay engine tự chọn **925hPa khi biển mây bị nhốt**, 850hPa khi không.
   Thang gió Zone A cũng nới `10/15/20` → `12/18/26` km/h.

**Chữ ký biển mây** (`seaSignature`) = thung lũng bão hoà **+** có nắp nghịch nhiệt (hoặc lớp
biên đêm ≤300m) **+** người đứng cao hơn đáy mây ≥300m. Khi đủ ba, các hình phạt *gián tiếp*
không được phép xoá kết luận — chúng chỉ còn nói "đi có sướng không".

> ⚠️ Thang gió Zone A và hệ số giảm phạt mưa hiện dựa trên **một** ngày kiểm chứng thật.
> Có thêm báo cáo thực địa thì phải hiệu chuẩn lại, đừng coi là hằng số thiêng.

### 🔁 Vòng kiểm chứng độ chính xác (24/8/2026)

Không được lấy mô hình dự báo ra chấm chính mô hình — ô lưới 9-25km không phân giải nổi
biển mây thung lũng, đó chính là lỗ hổng đã làm app trượt ngày 23/8. Nên app có **ba nguồn
sự thật độc lập**, xếp theo độ tin cậy:

| Nguồn | Tin cậy | Độ phủ | Điểm mù |
| :--- | :--- | :--- | :--- |
| Báo cáo thực địa người dùng (`FieldReportPanel`) | cao nhất | thưa | chỉ có khi có người đi |
| Vệ tinh Himawari-9 (`tools/verify_satellite.py`) | cao | mọi điểm, mỗi ngày | **mù khi có tầng mây cao che phía trên** |
| Mô hình dự báo | — | — | *không dùng làm sự thật* |

**Vệ tinh đo đúng đại lượng engine dự báo.** Sản phẩm NOAA `AHI-L2-FLDK-Clouds/CldTopHght`
(Himawari-9, 2km, 10 phút/lần, S3 công khai không cần khoá) cho **độ cao đỉnh mây**; so với
`observerAlt` là ra ngay "đứng trên biển mây" hay "chìm trong mây". Chiếu toạ độ bằng phép
chiếu địa tĩnh chuẩn (đã kiểm bằng mắt: mũi Hải Nam rơi đúng vào đảo).

Hồng ngoại **chỉ đọc được lớp mây trên cùng** → hôm nào có tầng mây cao (mùa mưa Tây Bắc gần
như ngày nào cũng có) thì tool trả `BLOCKED_ABOVE` và bị **loại khỏi phép chấm**, tuyệt đối
không đoán bừa. Thực đo tháng 8/2026: 10/10 điểm đều `BLOCKED_ABOVE`; kênh này phát huy tác
dụng mùa khô (khoảng tháng 10-4), đúng mùa săn mây chính.

**Nhịp chạy hằng ngày** (mắt xích quan trọng nhất là chụp dự báo TRƯỚC, vì Open-Meteo chỉ
phục vụ lại quá khứ gần — chụp muộn là mất bằng chứng vĩnh viễn):

```bash
npx vite-node scripts/snapshot-forecast.ts                  # ~20h: app dự báo gì cho rạng sáng mai
~/.venvs/ch-verify/bin/python tools/verify_satellite.py $(date +%F)   # ~8h: thực tế ra sao
npx vite-node scripts/calibrate.ts                          # bất cứ lúc nào: chấm điểm chính app
```

`data/observations/` là **kho dữ liệu tích luỹ, phải commit** — mỗi ngày trôi qua mà không
chụp là một ngày không bao giờ lấy lại được.

`scripts/calibrate.ts` in ra tỉ lệ đúng, **số ngày BỎ SÓT** (thực tế có mà app không báo) và
**số ngày BÁO NHẦM**, kèm chi tiết từng ca để biết chỉnh hằng số nào. Bỏ sót nguy hiểm hơn
báo nhầm: người dùng bỏ lỡ chuyến đi đẹp và mất niềm tin vào app.

### 🚫 Vì sao KHÔNG cào Facebook/TikTok

Đã tra kỹ, không phải ngại làm:
- Facebook đóng API tìm bài công khai từ 2018; **CrowdTangle ngừng hẳn 14/8/2024**; bản thay
  thế Meta Content Library chỉ mở cho nghiên cứu học thuật/phi lợi nhuận có duyệt hồ sơ.
- TikTok Research API cũng chỉ cấp cho học thuật; Display API chỉ đọc được nội dung của
  chính tài khoản mình.
- Cào bằng trình duyệt vi phạm điều khoản, vỡ mỗi lần Meta đổi DOM, và dễ bị khoá tài khoản.

Thay vào đó: người dùng thấy bài trên Facebook thì bấm **một nút trong app** để ghi lại —
mất 5 giây, dữ liệu sạch hơn hẳn scraping (có toạ độ, có ngày, có mốc so với chỗ đứng).

### 🗺️ Toạ độ điểm — quy tắc bắt buộc khi thêm/sửa

- Toạ độ phải có **nguồn** ghi ngay trong comment (node OSM có tên, hoặc cực đại DEM có mốc đối chiếu).
- Chạy `npx vite-node scripts/snapshot-dem.ts` rồi `npm test`: lệch |khai báo − DEM| > 400m là **fail**.
- Không chắc thì gắn `needsReview: '<lý do>'` — điểm đó **bị loại khỏi bảng xếp hạng** và
  hiện cảnh báo khi phân tích. Thà nói "chưa chắc chỗ này" còn hơn dự báo tự tin cho nhầm nơi.
- Đỉnh núi: toạ độ = chóp, độ cao = số đo đã công bố (DEM 90m làm tù đỉnh nhọn 100–250m là bình thường).
  Bản/đèo/điểm ngắm: toạ độ = chính chỗ đứng, độ cao = **đúng DEM** (đừng lấy số quảng cáo du lịch).

- Biển mây bức xạ hình thành trong **THUNG LŨNG**; đỉnh chỉ là vị trí quan sát.
  Mọi chỉ số ẩm/nghịch nhiệt tham chiếu **đáy thung lũng** (estimateValleyElevation:
  profile VALLEY đã xác thực, hoặc min DEM 9 điểm bán kính ~4km).
- **Nghịch nhiệt KHÔNG được suy từ "T850 > T_đỉnh"** — với đỉnh >1500m điều đó đúng trong
  mọi khí quyển (lỗi hệ thống của bản cũ). Phải so T tầng với nhiệt kỳ vọng theo suy giảm
  chuẩn 6.5°C/km từ thung lũng (`computeInversion`). Có test hồi quy khóa lỗi này.
- **Độ cao mực áp suất (engine-2.0): ưu tiên `geopotential_height_XXXhPa` THẬT** từ API
  (biến thiên 20–40m theo ngày); hằng số 925≈760m / 850≈1500m / 700≈3100m chỉ là fallback
  khi model không trả geopotential (`LevelSample.hReal=false`).
- **Profile 7 mực** (`PRESSURE_LEVELS` 975/950/925/900/850/800/700hPa): GFS+ICON+UKMO đủ 7,
  ECMWF ifs025, JMA và AIFS chỉ 925/850/700 — mực thiếu trả null và tự bị bỏ qua, KHÔNG chèn
  mặc định. `computeInversion` quét toàn profile nhưng CHỈ các tầng ≤2600m ASL — ấm ở
  700hPa là ấm tầng cao, không phải nắp nghịch nhiệt thung lũng (có test khóa).
- **Mặt mây (`estimateCloudTop`)**: đỉnh của LỚP MÂY LIÊN TỤC từ dưới lên (cloud_cover
  tầng ≥45% hoặc RH≥80%) + 150m — KHÔNG nhảy cóc lên lớp mây trung tách rời phía trên
  (có test khóa). Fallback 3 mực RH như cũ khi thiếu profile.
- **Boundary layer height đêm** (GFS mới có): BLH min đêm ≤200m = không khí tù đọng
  → +8; ≤500m → +4; ≥1200m → −5. Model khác không có BLH thì bỏ qua, không giả định.
- **Trần quét nghịch nhiệt TƯƠNG ĐỐI** `max(2600, valley+1300)` + fallback xét 700hPa khi
  thung lũng >1500m: trần cứng 2600m từng tạo khe hở chết cho thung lũng cao (Trạm Tôn
  1900m của Fansipan → không bao giờ thấy nghịch nhiệt, trừ 5 điểm oan). Có test khóa.
- **Ẩm "lớp biển mây"** chọn mực NGAY TRÊN đáy thung lũng: <900m→RH925, <1700m→RH850,
  cao hơn→RH700 (trước đây thung lũng 1800m đo RH850 = không khí dưới lòng đất).
- **Lifted index** (GFS): ≤−4 trừ 6 điểm; ≤−2 thêm cảnh báo dông "xuống núi trước 13:00" —
  đối lưu đo thật thay vì đoán qua mùa.
- **AOD/PM2.5** (Air Quality API, CAMS — best-effort): hiệu chỉnh `sunriseColorPotential`
  (≥0.8 −25, ≥0.55 −15, ≥0.35 −6, ≤0.2 +5). Thiếu dữ liệu → giữ nguyên điểm, không bịa.
- **Mực đóng băng thật** (`freezing_level_height`, GFS/ICON): vị trí đứng cao hơn → cảnh
  báo băng giá trong `warnings`.
- Cửa sổ thời gian: pha bức xạ = **19h đêm trước → 6h sáng** (mây cao đêm, gió 925 đêm,
  mưa đêm); pha quan sát = **4h→9h sáng** (mây thấp, nhiệt/ẩm tầng lúc 6h).
- `cloud_cover_low` lúc bình minh tại điểm thung lũng ≈ biển mây trong mô hình — yếu tố
  nặng nhất của điểm số. Mây cao ban đêm chặn bức xạ → phạt. Một ít mây cao lúc bình minh
  (15–55%) lại TỐT cho nhiếp ảnh → chỉ số riêng `sunrise_color_potential`.
- LCL = 125 × (T−Td) tính từ THUNG LŨNG → đáy mây ASL; mặt mây (top) ước từ profile RH
  các tầng (`estimateCloudTop`); ΔH = vị trí đứng − top quyết định STATIC/FLUCTUATING/FOG
  (quy tắc ranh giới ±250m).
- Zone A (bồn giữ ẩm — Lào Cai/Yên Bái/Sơn La): ngưỡng gió 10/15/20 km/h.
  Zone B (ống gió — Lai Châu): 5/8/15 km/h, khắt khe hơn hẳn (`assessWind`).
- **Mùa theo 3 miền** (`seasonAdjust(dateStr, lat)` + `climateRegion`): NORTH ≥17.5°
  (nhịp Tây Bắc), CENTRAL 15.5–17.5° (mưa bão 9-12, khô đầu năm), SOUTH <15.5°
  (Tây Nguyên/Nam Bộ: khô 11-4 cộng, mưa 5-10 trừ). Không truyền lat → NORTH (hành vi cũ).
- **Ensemble ECMWF 51 kịch bản** (`fetchEnsembleDays`, best-effort): phân bố % mây thấp
  bình minh qua các member → probCloudSea (ngưỡng 40%), P10/P50/P90, probRain.
  <10 member có dữ liệu → bỏ ngày đó, không bịa xác suất. Lỗi API → app vẫn chạy đủ.

## 🏗️ Luồng dữ liệu v5

```
InputForm → analyzeLocation (DB → Nominatim/Open-Meteo geocode → AI cuối cùng, có nhãn)
  → LocationConfirm (hiện nguồn + độ tin cậy)
  → fetchMountainWeather:  2 ĐIỂM (thung lũng + vị trí đứng) × 6 MÔ HÌNH (ECMWF/GFS/ICON/JMA/UKMO/AIFS)
        1 call/điểm (&elevation= để API downscale nhiệt theo độ cao thật), 41 biến hourly
        (profile 7 mực T/RH/cloud/geopotential + BLH/freezing/lifted) + sunrise/sunset, cache 30 phút
  → cloudScoreEngine.computeDayForecast (per-model score/status → median + đa số + spread THẬT)
  → geminiService.generateNarrative (AI viết lời từ engine digest; fail → văn bản engine,
        aiNarrative=false, app vẫn đầy đủ số liệu)
  → AnalysisResult (badge chất lượng ngày, panel "Vì sao điểm này", ΔH tương tác, GPX tọa độ thật)
  → historyService (localStorage 5 lần gần nhất — nền tảng cho vòng kiểm chứng sau chuyến đi)
```

## 📁 File chính

| File | Trách nhiệm |
| :--- | :--- |
| `services/cloudScoreEngine.ts` | **Engine chấm điểm deterministic** — toàn bộ Modules 1–8 cũ chuyển thành code: inversion/LCL/cloud-top/FSI/VRII/gió-theo-zone/mùa/trạng thái/điểm + reasons từng yếu tố. |
| `services/weatherService.ts` | Fetch Open-Meteo đa mô hình 2 điểm, gộp cửa sổ đêm+bình minh (`aggregateDayModel`), nhãn DataQuality theo horizon, DEM valley/point elevation, cache TTL. KHÔNG có synthetic data. |
| `services/geminiService.ts` | Phân giải địa danh nhiều tầng có nhãn nguồn + lời bình AI (schema chỉ chứa trường văn bản). |
| `services/modelDiscoveryService.ts` | Discover model Gemini động + executeWithFallback (429/404/5xx retry, 401/403 dừng). |
| `services/historyService.ts` | Lưu/mở lại các lần dự báo (localStorage). |
| `services/rankingService.ts` | "Đêm nay đi đâu": batch 1 call toàn thư viện (lat/lon/elevation dạng danh sách — API trả JSON array theo thứ tự), CÙNG 41 biến HOURLY_VARS với bản đầy đủ (GFS+ICON+UKMO đủ 7 tầng), đáy thung lũng ưu tiên profile VALLEY đã xác thực rồi mới DEM (cache localStorage vĩnh viễn), chấm bằng CHÍNH scoreOneModel/combineModels. Đo lệch vs bản đầy đủ: `npx vite-node scripts/compare-rank-vs-full.ts` (~4/100 điểm, khác biệt còn lại = 3 vs 6 model). |
| `services/astroService.ts` | Trăng/bình minh thiên văn cục bộ (suncalc) — pha, độ sáng, moonset, cửa sổ Milky Way; deterministic, có golden test. |
| `components/SatellitePanel.tsx` | Vòng lặp ảnh Himawari-9 Band13 hồng ngoại của JMA (`se1_b13_{HHMM}.jpg`, UTC bước 10 phút, lùi 40 phút cho chắc ảnh đã đăng, `<img>` thuần nên không vướng CORS); khung lỗi bị bỏ qua, không ảnh thay thế. |
| `components/CloudLayerChart.tsx` | Heatmap mây tầng × giờ bằng CSS grid (KHÔNG SVG — chữ không bị co trên mobile), thang độ cao tuyến tính theo geopotential thật, vạch vị trí đứng/thung lũng/bình minh. |
| `components/RadarPanel.tsx` | Radar mưa RainViewer (weather-maps.json, CORS *; composite phủ VN thật) trên nền 3×3 tile OSM lọc màu tối; khung nowcast dán nhãn "dự báo". |
| `services/verificationService.ts` | Vòng đối chiếu: dự báo đã lưu vs ERA5 archive (cloud_cover_low 4-9h, trễ ~5 ngày, ngưỡng biển mây 40%); ngày chưa có ERA5 → hit=null, không phán. |
| `components/VerificationPanel.tsx` | UI trúng/trượt/chờ từng ngày + tổng kết; nói rõ ERA5 là proxy, không phải mắt thấy. |
| `tests/engine.test.ts` | 46 golden tests: vật lý & chấm điểm (kể cả profile geopotential thật, lớp mây liên tục, BLH), bậc thang fallback model, lọc model ảnh, múi giờ VN, alias thư viện (vitest). |
| `constants/mountains.ts`, `constants.ts` | **58 điểm toàn quốc** đã xác thực + mặt cắt địa hình (tài sản quý — giữ cập nhật). |
| `components/AnalysisResult.tsx` | UI kết quả **verdict-first**: khối phán quyết ĐI/KHÔNG ở đầu trang, thẻ ngày là `<details>` thu gọn (chỉ ngày tốt nhất mở sẵn — trang từng dài 11.1 màn hình mobile, nay ~5.8), quality badge, "Vì sao", consensus thật, ΔH theo waypoint, GPX/TXT/PNG export, banner dữ liệu cũ. |

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

## 🚀 Backlog gợi ý

1. ~~Vòng kiểm chứng độ chính xác~~ ✅ đã có (verificationService + nút 🔬 trên lịch sử) từ 19/8/2026.
2. ~~Ảnh vệ tinh Himawari~~ ✅ đã có SatellitePanel (JMA se1_b13) từ 19/8/2026; nguồn dự
   phòng nếu JMA đổi format: NASA GIBS WMTS Band13 (`{time}` dùng `default`).
3. ~~PWA offline~~ ✅ đã có (vite-plugin-pwa, registerSW trong index.tsx, cache Open-Meteo NetworkFirst 12h) từ 19/8/2026. LƯU Ý: scope/start_url theo `base` nên build GH Pages và Vercel tự đúng, không cần build riêng.
4. ~~Giờ-theo-giờ~~ ✅ đã có CloudLayerChart (12h hôm trước → 12h) từ 19/8/2026.
5. Mở rộng MOUNTAIN_DB + profile cho núi phía Nam (Lang Biang, Chư Yang Sin, Bà Đen...).

## 🧪 Lệnh kiểm tra

```bash
npm run lint   # tsc --noEmit
npm test       # vitest — 69 golden tests engine
npm run build  # vite build (Tailwind build-time, copy vercel.json vào dist)
```

Deploy: push `main` → GitHub Pages (base `/cloudhunter/`) + Vercel (huntercloud.vercel.app,
base `/` qua env VERCEL). Nhánh `gh-pages` bị Vercel bỏ qua nhờ vercel.json nằm trong dist.
