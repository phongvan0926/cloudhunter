# Đối chiếu skyradar.vn (nghiên cứu 19/11/2026, phiếu g5c77 + gcc29)

Cách làm: tải 71 tệp JS/CSS công khai của skyradar.vn, định dạng lại bằng esbuild rồi đọc; chạy Playwright (mobile + desktop) bấm các nút, ghi toàn bộ request mạng; gửi 17 lần thí nghiệm có kiểm soát tới `POST /api/assess` như một khách chưa đăng nhập (giãn 12-30 giây/lần, gặp HTTP 503 ba lần thì dừng). Không đăng nhập, không trả tiền.

Nhãn độ chắc trong tài liệu này:
- **ĐÃ ĐỌC** = thấy trực tiếp trong mã JS phía trình duyệt.
- **ĐÃ ĐO** = suy từ thí nghiệm đầu vào / đầu ra trên Worker của họ (mã máy chủ KHÔNG đọc được).
- **ĐOÁN** = suy luận, chưa kiểm.

Không chép mã của họ. Mọi thứ áp dụng vào CloudHunter đều tự viết lại theo triết lý "con số = code, không bịa dữ liệu". Phán quyết của họ KHÔNG bao giờ là nhãn sự thật.

## 1. Là gì, nền tảng, build (ĐÃ ĐỌC)
- Sky Radar (tác giả Duy Chris, có app Android): bản đồ dự báo SĂN ẢNH. Ráng bình minh/hoàng hôn (Burn Score), Ngân Hà (Astro Score), ô nhiễm ánh sáng Bortle, Tóm tắt ngày, thời tiết tuyến đường, bão, sét, thiên tai, sao chổi, lịch thiên văn, trợ lý AI, gói Pro (VietQR). Biển mây ("SĂN MÂY") là một mục nhỏ, tự gắn nhãn "Đang thử nghiệm", cờ `shadow: true`.
- Frontend JS thuần đã nén, không framework; MapLibre GL + PMTiles + Chart.js + SunCalc; Supabase (đăng nhập Google, yêu thích, Pro); Cloudflare Pages + Worker + RUM.
- Dữ liệu: Worker proxy Open-Meteo `.../v1/forecast`, 4 mô hình `ecmwf_ifs025, jma_seamless, icon_seamless, gfs_seamless`, có lớp `om-cache` + `om-quota` (đếm hạn mức). Không khí: CAMS. Địa hình: Copernicus DEM GLO-90 + terrarium tiles. Vệ tinh: Himawari.
- API riêng: `/api/terrain`, `/api/assess`, `/api/lp`, `/api/route`, `/api/typhoon`, `/api/lightning`, `/api/disaster`, `/api/comets`, `/api/assistant`, `/api/geocode`, `/api/feature-policy`, `/api/billing/web-qr`.
- Chính sách tính năng (`feature-policy`): khách 3 ngày dự báo, 3 yêu thích, quét 100 km; Pro 7 ngày, 500 km; VIP 14 ngày. `route` (tuyến đường), `analysis`, nhiều mục thiên văn là Pro.

## 2. Gộp mô hình và độ tin (ĐÃ ĐỌC, `ensemble-normalize`, `forecast-confidence`)
- Trọng số theo hạn: giờ đầu ECMWF 0,30 / JMA 0,35 / ICON 0,25 / GFS 0,10; tới 168h ECMWF 0,70 / JMA 0,15 / ICON 0,05 / GFS 0,10.
- Gió, giật, CAPE lấy MAX giữa mô hình (thiên về an toàn). Mưa: trung bình có trọng số kéo về phía max bằng smoothstep. Mã thời tiết: lấy mã nặng nhất nếu >= 30, ngoài ra theo đa số. Mây tầng: loại mô hình có các tầng không khớp tổng mây.
- Độ tin = 100 - 2,2 x độ lệch chuẩn có trọng số (mây thấp 1, trung 0,85, cao 0,4, xác suất mưa 0,7); >= 75 Cao, >= 50 Vừa.
- Ổn định giữa các lần chạy: so `cloud_cover`, `cloud_cover_high` với `_previous_day1/2`: chênh <= 15 Cao, <= 40 Vừa, còn lại "Dao động MẠNH, chưa nên cam kết đi xa".

## 3. Thời tiết tuyến đường (ĐÃ ĐỌC, `route-weather.js`, khoá Pro)
- Tìm đường: Google qua `/api/route` (trả phí), dự phòng Valhalla (xe máy: top_speed 60, use_hills 0,5, tránh trạm thu phí) rồi OSRM (xe máy x1,2 thời gian; xe đạp 15 km/h; đi bộ 5 km/h).
- Lấy mẫu: bước max(25, dài/10) km, bỏ điểm cách đích < 5 km, luôn có đầu và cuối. Giờ đi qua: nội suy theo quãng đường + giờ khởi hành.
- Mỗi điểm: Open-Meteo hourly `precipitation, precipitation_probability, cloud_cover, weather_code, temperature_2m`, 3 ngày, lấy đúng giờ. KHÔNG có cao độ, gió, tầm nhìn, lạnh trên đèo, mưa tích luỹ.
- Màu: đỏ khi mưa >= 5 mm hoặc xác suất >= 70%; cam >= 1 mm hoặc >= 40%; vàng >= 20%; còn lại xanh. Nhãn: Giông (wmo >= 95 hoặc >= 10 mm hoặc >= 85%), Mưa vừa, Mưa nhẹ, Sương mù (wmo 45/48), Nhiều mây (mây >= 60), Khô ráo. Tóm tắt "N điểm mưa to / mưa nhẹ / Tuyến khô ráo", nút mở Google Maps.

## 4. Tóm tắt ngày (ĐÃ ĐỌC, `daily-briefing.js`), chọn ngày -1..+7
- Tổng quan: > 6 giờ mưa > 1 mm -> "Nhiều mưa"; >= 8 giờ burn >= 55 -> "Ngày đẹp"; >= 4 -> "Trung bình"; còn lại "Ngày xịt". Mây theo buổi (sáng 5-11, trưa 11-15, chiều 15-19, tối 19-24; < 20 quang, < 45 ít mây, < 70 nhiều mây, còn lại âm u; gộp buổi giống nhau liền nhau). Liệt kê khung giờ mưa. Câu nowcast.
- An toàn: lấy `safetyRisk` của máy chủ; không có thì tự tính (địa hình núi/hẻm với mưa 24h > 80 mm CẢNH BÁO sạt lở, > 150 mm NGUY HIỂM; CAPE > 1500 kèm mưa giờ > 15 mm cảnh báo giông).
- Bình minh / Hoàng hôn (burn ±90 phút), Ngân Hà (cao > 10° khi mặt trời < -18°), Mặt Trăng, sự kiện thiên văn, "Kèo đặc biệt".
- Cảnh báo (tối đa 5): khung mưa > 1 mm/h kèm tổng; CAPE > 800 nguy cơ giông; tầm nhìn < 3 km (giờ thấp nhất); gió > 40 km/h (giờ mạnh nhất).

## 5. Burn Score, kịch bản, địa hình (ĐÃ ĐỌC)
- `calculateBurnScore`: khởi điểm 20, cộng theo mây thấp/trung/cao, trần khi u ám 2-3 tầng, trần theo chỉ số che sáng, trần theo mây giờ trước, hiệu chỉnh UV. >= 75 kèo cháy, >= 55 tiềm năng, >= 35 ráng nhạt.
- `classifyScenario`: ALPENGLOW, VƯỢT MÂY (sanMay co), MÂY LUỒN (RH 85-95, gió < 8, mây thấp < 20), MÙ VEN BIỂN, NGHỊCH NHIỆT ĐÔ THỊ, SƯƠNG MÙ THUNG LŨNG, CỘT NẮNG, TIA NẮNG.
- `getTerrainContext`: > 1000 m núi, > 300 m đồi. Rủi ro dông theo mã WMO 95/96/99.
- ĐOÁN: các request lấy nhiều điểm trên một đường thẳng là dò mây theo hướng mặt trời (`sun-raycast`) cho burn score.

## 6. Biển mây ("SĂN MÂY")
- ĐÃ ĐỌC: `/api/terrain` dò DEM bán kính 20 km, trả `viewer.elev`, `valley` (toạ độ, cao độ, khoảng cách, hướng), `floor/base/top/relief`, `visibleFrac`. Ca Tà Xùa: thung lũng 482 m cách 15 km hướng 146°. Trình duyệt tải thêm dự báo TẠI thung lũng (`elevation=` cao độ thung lũng; mây thấp, RH, nhiệt) cho 4 mô hình, gửi cả gói (gzip) vào `/api/assess` kèm `_prevRuns`, `_aqi`, `bortle`, `cloudSeaElevation`, `weatherValley`.
- ĐÃ ĐỌC: đầu ra mỗi giờ `sanMay {index, viewClear, below, jointShare, spread, verdict {bienMay: co|co_the|khong, cheTamNhin, tamNhin}}`; `san-may-mornings` gom theo ngày, ưu tiên co > co_the > che > khong, khung giờ dạng "05-07h", tối đa 3 ngày.
- ĐÃ ĐO (thí nghiệm sửa dữ liệu gửi lên, giờ 06h 20/11, Tà Xùa):
  - Thung lũng RH 100 / mây thấp 100, chỗ đứng RH 60 / mây 0 -> index 1, `co`.
  - Như trên nhưng chỗ đứng RH 97 -> vẫn `co`, `tamNhin: thoang`. Vậy `cheTamNhin` KHÔNG bật chỉ vì RH 2 m cao; ĐOÁN dựa vào mây thấp / profile ở chỗ đứng.
  - Thung lũng RH 75 / mây 10 -> index 0,063, below 0,1, `khong`. Vậy `below` ~ mây thấp thung lũng / 100.
- ĐÃ ĐO (đợt trước, 172 giờ-điểm): index >= ~0,45 -> co; 0,30-0,45 -> co_the.
- Họ KHÔNG có (ĐÃ ĐỌC đầu vào): mặt cắt nghịch nhiệt / mực áp suất, mặt mây so với chỗ đứng, kiểm chứng bằng người đi. Chưa công bố độ chính xác.

## 7. Cảnh báo an toàn `safetyRisk` (ĐÃ ĐO trên Worker, Tà Xùa 1.817 m, mưa giả lập)
| Mưa gửi lên | Mưa 24h | Kết quả |
|---|---|---|
| 0 hoặc đều 0,4 mm/h | 0-10 | không cảnh báo |
| đều 0,8 mm/h | 20 | CAUTION `prolonged_rain` (tổng ~4 ngày 77 mm) |
| đều 1,4 và 3 mm/h | 35, 75 | CAUTION `moderate_rain_mountain` "đường đèo có thể trơn trượt" |
| đều 4,5 và 7 mm/h | 113, 175 | WARNING `heavy_rain` |
| đều 10 mm/h | 250 | DANGER `heavy_rain` |
| 6 giờ x 10 mm | 60 (6h: 60) | WARNING |
| 2 giờ x 40 mm | 80 | WARNING |
Có trường `glofasRatio` (lũ sông thượng nguồn GloFAS) luôn null ở đây. Loại `flash_flood_landslide` chỉ thấy trong mẫu test của họ, không kích được. ĐOÁN: ngưỡng WARNING ~ 100 mm/24h hoặc ~ 50-60 mm/6h; DANGER ~ 200+ mm/24h.

## 8. Tìm kèo thơm (ĐÃ ĐỌC, `performAutoScan`)
Lấy các điểm gợi ý + điểm yêu thích trong bán kính (khách 100 km, Pro 500 km), gọi OSRM `table` để đổi khoảng cách chim bay thành km đường đi, tải dự báo đa toạ độ theo lô 20 điểm, chấm từng giờ, lọc cơ hội > 50% trong khoảng ngày đi/về. Có chế độ quét riêng cho mây.

## 9. Chưa kiểm được và lý do
- Mã thuật toán phía máy chủ (`/api/assess`, `/api/terrain`, `/api/route`): không công khai; chỉ suy từ đầu vào/ra.
- Ca biển mây "thung lũng RH 95 / mây 40" và cơ chế `cheTamNhin`: Worker trả 503 (giới hạn nhịp), dừng để không gây tải.
- Trợ lý AI, tuyến đường (bản chạy thật), phân tích Pro, 7-14 ngày: cần đăng nhập/Pro, anh dặn không cần đăng nhập.
- Lớp bão, sét, thiên tai, sao chổi, Bortle: chỉ đọc lướt mã, không thí nghiệm vì không phục vụ biển mây/cung đường.
- Độ chính xác phán quyết biển mây của họ: chờ đủ ngày chụp shadow + nhãn vệ tinh/người đi.

## 10. Đã áp dụng vào CloudHunter
- **19/11/2026 - Cung đường tới điểm săn mây** (`services/routeService.ts`, `components/RouteWeather.tsx`). Học ý lấy mẫu dọc tuyến + giờ đi qua; tự viết và làm hơn ở chỗ dân phượt cần: cao độ DEM, đèo cao nhất, tổng leo dốc, sương mù / đi trong mây, gió giật, lạnh và băng giá ở cao độ mặt đường, mưa tích luỹ 24h/72h (ngưỡng thang mưa KTTV quốc gia), qua đèo lúc tối, tính ngược giờ đi để tới trước bình minh. Đường dùng OSRM miễn phí (không Google). Giờ đi theo tốc độ TB người dùng chọn vì OSRM quá lạc quan (Hà Nội - Tà Xùa 203 km báo 2h47).
- **19/11/2026 - Tóm tắt ngày tại đích** (`summarizeDay`): học khung của họ (mây theo buổi, khung giờ mưa, gió, tầm nhìn), bỏ phần burn score/thiên văn; buổi sáng tính từ 5h cho người săn mây.
- Chụp shadow (`tools/skyradar-shadow.py`, `data/skyradar-shadow/`): đối chứng, không là nhãn. Từ 19/11/2026 (vòng 2 gcc29) chạy hằng ngày trong job `skyradar` của `verify-loop.yml` (cùng lịch với job snapshot, 18 điểm, giãn 6 s, UA trình duyệt chung chung, chỉ giữ 03-09h). Thiếu điểm thì vẫn ghi phần đọc được rồi ĐỎ; không đọc được điểm nào thì không ghi tệp và ĐỎ. `scripts/shadow-contrast.ts` in bảng ĐỐI CHỨNG trong calibrate (luật chọn bản chụp chốt trước: bản muộn nhất trước 03:00 ngày D, khung 05-07h).
- **19/11/2026 vòng 2 - Xe máy đi Valhalla** (FOSSGIS, CORS mở, miễn phí, tối đa 1 yêu cầu/giây, phải ghi công OSM): giống họ ở chỗ dùng Valhalla cho xe máy, khác ở chỗ không có Google trả phí; hỏng thì về OSRM và giao diện ghi rõ "TUYẾN Ô TÔ". Km đường thật cho Kèo thơm bằng OSRM `table` (giống ý `performAutoScan`), một lần gọi cho cả thư viện.
- **19/11/2026 vòng 2 - Sương mù theo mã thời tiết 45/48**: họ dùng mã này làm nhãn "Sương mù"; mình thêm làm cờ mức 2 khi tầm nhìn mô hình chưa đủ thấp để tự bật (`ROUTE_RULES_VERSION` route-1.1).

## 11. So `route-weather.js` + `safetyRisk` của họ với Cung đường của mình (19/11/2026, vòng 2)
Mình đã có mà họ không có (ĐÃ ĐỌC mã của họ): cao độ DEM dọc tuyến, đèo cao nhất, tổng leo, gió giật, lạnh/băng theo cao độ mặt đường, đi trong mây, tầm nhìn, mưa tích luỹ 24h/72h tại từng điểm, qua đèo lúc tối, tính ngược giờ đi.

Cảnh báo sạt lở theo mưa tích: luật R24/R72 của mình (20 / 50 / 100 mm trong 24h, 150 mm trong 72h, chỉ áp khi cao độ >= 300 m) so với các ca ĐÃ ĐO ở mục 7:
| Ca của họ | Họ | Mình |
|---|---|---|
| 24h 20 mm | CAUTION | mức 1 |
| 24h 35, 75 mm | CAUTION | mức 1, mức 2 |
| 24h 113, 175 mm | WARNING | mức 3 |
| 24h 250 mm | DANGER | mức 3 |
| 6 giờ x 10 mm (60) | WARNING | mức 2 |
| 2 giờ x 40 mm (80) | WARNING | mức 2 |
Mọi ca đã đo, mình báo bằng hoặc nặng hơn họ, nên một luật "mưa 6h" riêng không thêm được gì trên các ca này. Không chỉnh ngưỡng của mình theo bảng này (họ không phải sự thật).

Họ có mà mình chưa có (đưa vào danh sách phương án, chưa làm):
- **GloFAS lưu lượng sông** (`glofasRatio`, luôn null trong mọi lần đo): Open-Meteo có Flood API miễn phí, lưới ~5 km, chỉ thấy sông lớn; suối nhỏ gây lũ quét trên đường đèo không có trong lưới. Giá trị cho dân phượt: thấp tới vừa (cảnh báo ngập ngầm tràn ở tuyến ven sông lớn). Cần chọn điểm qua sông trên tuyến, chưa làm.
- **Giông theo CAPE** (> 800 / > 1500 J/kg): thêm 1 biến vào lời gọi thời tiết tuyến. Giá trị vừa (giông chiều mùa hè). Nhỏ, nhưng là ngưỡng mới chưa có sự thật nên chờ kho chụp tuyến.
- **`prolonged_rain`** (mưa kéo dài ~4 ngày): mình có R72 + ghi chú R24, gần tương đương.

## Đối chiếu thật 19/11 (rạng sáng 05-07h, 18 điểm, chưa có sự thật)
- 11/18 điểm họ báo "không" + `cheTamNhin=true`; 10/11 điểm đó engine mình cũng FOG/DISSIPATING, 17/18 điểm mình không khuyên đi.
- Họ báo CÓ ở 5 điểm mình xếp FOG với ΔH âm (Đèo Thung Khe, Ba Vì, Tam Đảo, Lang Biang, Bạch Mã): đúng loại điểm thấp hay báo nhầm. Chờ nhãn vệ tinh 19/11.
- **19/11/2026 vòng 3 - Dự báo TẠI điểm thung lũng (ý b): ĐÃ THỬ, KHÔNG ĐẠT, KHÔNG gộp.** Chọn điểm thấp nhất DEM trong
  20 km rồi xin dự báo tại đó (`scripts/replay-valley.ts` + `scripts/ab-valley.ts`, 69 ngày, 1.954 điểm-ngày): bỏ sót
  người đi+FB giảm 25 -> 18 nhưng báo nhầm mọi nguồn tăng 419 -> 612 (trần 335), bootstrap theo ngày [-241, -143].
  Điểm "thấp nhất" phần lớn nằm ở rìa 20 km, có điểm là đồng bằng 3-11 m, nên cái bị bác là cách chọn điểm này, chưa phải
  ý tưởng. Số, phản biện và đề xuất đợt sau: `NHAT-KY-HIEU-CHINH.md` (mục "dự báo tại điểm thung lũng").
