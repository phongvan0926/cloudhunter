> Tách từ AGENTS.md ngày 30/10/2026, nguyên văn.

# Luồng dữ liệu v5, bảng file chính, backlog

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
| `components/WeekRanking.tsx` + `rankSpotsForWeek` | "Cuối tuần đi đâu" (30/10/2026): điểm miền Bắc (`climateRegion` NORTH) × 7 rạng sáng, 1 call batch cho cả cửa sổ, cùng engine/`isWorthGoing`. KHÔNG sinh xác suất (đồng thuận 3 mô hình ≠ tần suất). Dự báo > `WEEK_CONFIDENT_LEAD_DAYS`=3 ngày hiện viền đứt. Từ 30/10/2026 job snapshot chụp thêm lead 1-7 mỗi ngày (`scripts/snapshot-week.ts` → `data/observations/far/<ngày-chụp>-week.json`, không đè, lỗi không chặn bản chụp chính); sau ≥ 2-3 tuần mới chấm được dự báo xa đúng bao nhiêu theo lead (chưa có script chấm, viết khi có dữ liệu). |
| `services/astroService.ts` | Trăng/bình minh thiên văn cục bộ (suncalc) — pha, độ sáng, moonset, cửa sổ Milky Way; deterministic, có golden test. |
| `components/SatellitePanel.tsx` | Vòng lặp ảnh Himawari-9 Band13 hồng ngoại của JMA (`se1_b13_{HHMM}.jpg`, UTC bước 10 phút, lùi 40 phút cho chắc ảnh đã đăng, `<img>` thuần nên không vướng CORS); khung lỗi bị bỏ qua, không ảnh thay thế. |
| `components/CloudLayerChart.tsx` | Heatmap mây tầng × giờ bằng CSS grid (KHÔNG SVG — chữ không bị co trên mobile), thang độ cao tuyến tính theo geopotential thật, vạch vị trí đứng/thung lũng/bình minh. |
| `components/RadarPanel.tsx` | Radar mưa RainViewer (weather-maps.json, CORS *; composite phủ VN thật) trên nền 3×3 tile OSM lọc màu tối; khung nowcast dán nhãn "dự báo". |
| `services/verificationService.ts` | Vòng đối chiếu: dự báo đã lưu vs ERA5 archive (cloud_cover_low 4-9h, trễ ~5 ngày, ngưỡng biển mây 40%); ngày chưa có ERA5 → hit=null, không phán. |
| `components/VerificationPanel.tsx` | UI trúng/trượt/chờ từng ngày + tổng kết; nói rõ ERA5 là proxy, không phải mắt thấy. |
| `tests/engine.test.ts` | 128 golden tests: vật lý & chấm điểm (kể cả profile geopotential thật, lớp mây liên tục, BLH), bậc thang fallback model, lọc model ảnh, lọc nhiễu khung vệ tinh đo mặt mây, múi giờ VN, alias thư viện (vitest). |
| `constants/mountains.ts`, `constants.ts` | **58 điểm toàn quốc** đã xác thực + mặt cắt địa hình (tài sản quý — giữ cập nhật). |
| `components/AnalysisResult.tsx` | UI kết quả **verdict-first**: khối phán quyết ĐI/KHÔNG ở đầu trang, thẻ ngày là `<details>` thu gọn (chỉ ngày tốt nhất mở sẵn — trang từng dài 11.1 màn hình mobile, nay ~5.8), quality badge, "Vì sao", consensus thật, ΔH theo waypoint, GPX/TXT/PNG export, banner dữ liệu cũ. |


## 🚀 Backlog gợi ý

1. ~~Vòng kiểm chứng độ chính xác~~ ✅ đã có (verificationService + nút 🔬 trên lịch sử) từ 19/8/2026.
2. ~~Ảnh vệ tinh Himawari~~ ✅ đã có SatellitePanel (JMA se1_b13) từ 19/8/2026; nguồn dự
   phòng nếu JMA đổi format: NASA GIBS WMTS Band13 (`{time}` dùng `default`).
3. ~~PWA offline~~ ✅ đã có (vite-plugin-pwa, registerSW trong index.tsx, cache Open-Meteo NetworkFirst 12h) từ 19/8/2026. LƯU Ý: scope/start_url theo `base` nên build GH Pages và Vercel tự đúng, không cần build riêng.
4. ~~Giờ-theo-giờ~~ ✅ đã có CloudLayerChart (12h hôm trước → 12h) từ 19/8/2026.
5. Mở rộng MOUNTAIN_DB + profile cho núi phía Nam (Lang Biang, Chư Yang Sin, Bà Đen...).

