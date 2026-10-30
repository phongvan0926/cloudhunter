> Tách từ AGENTS.md ngày 30/10/2026, nguyên văn.

# Ràng buộc vật lý khi sửa engine (nghịch nhiệt, mực áp suất, mặt mây, gió, mùa, ensemble)


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

