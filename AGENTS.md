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
| `components/AnalysisResult.tsx` | UI kết quả: quality badge, "Vì sao", consensus thật, mô phỏng ΔH theo waypoint, GPX/TXT export. |

## 🛠️ Quy tắc dev

1. **Mọi call AI qua `executeWithFallback`** — không gọi `ai.models.generateContent` trực tiếp.
2. **Không thêm lại dữ liệu giả dưới mọi hình thức** (số mặc định "an toàn", consensus cứng,
   tọa độ placeholder...). Thiếu dữ liệu = nói thật là thiếu.
3. **Không giao phép tính cho AI.** Cần chỉ số mới → thêm vào engine + viết golden test.
4. **Prompt AI không được gợi ý AI "tìm kiếm Internet"** — model không có tool search trong
   app này; câu lệnh như vậy chỉ tạo ảo giác "đã nghiên cứu".
5. Sửa engine xong PHẢI chạy: `npm run lint && npm test && npm run build`.
6. UI giữ glassmorphism dark-mode; Tailwind build-time (index.css, không CDN).
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
npm test       # vitest — 58 golden tests engine
npm run build  # vite build (Tailwind build-time, copy vercel.json vào dist)
```

Deploy: push `main` → GitHub Pages (base `/cloudhunter/`) + Vercel (huntercloud.vercel.app,
base `/` qua env VERCEL). Nhánh `gh-pages` bị Vercel bỏ qua nhờ vercel.json nằm trong dist.
