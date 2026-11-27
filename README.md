# ☁️ CloudHunter AI v5 — Dự báo Biển Mây Tây Bắc (Engine Deterministic + AI Lời Bình)

[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Vitest-251_tests-6E9F18?logo=vitest)](https://vitest.dev/)
[![Open-Meteo](https://img.shields.io/badge/Open--Meteo-6_models-00B4D8)](https://open-meteo.com/)

**CloudHunter AI** dự báo biển mây cho dân săn mây, trekking và nhiếp ảnh tại núi cao Việt
Nam (Tà Xùa, Lảo Thẩn, Ky Quan San, Fansipan, Putaleng, Tà Chì Nhù...).

**Triết lý v5: "Con số = code, tư vấn = AI."** Toàn bộ điểm số và chỉ số khí tượng do một
engine deterministic tính từ dữ liệu thật của 3 mô hình toàn cầu; Gemini chỉ viết lời bình.
Không có API key AI, app **vẫn dự báo đầy đủ** — chỉ thiếu phần văn tư vấn.

---

## 🌟 Điểm khác biệt v5

- 🏔️ **Vật lý 2 điểm đúng bản chất**: dữ liệu lấy riêng cho **đáy thung lũng** (nơi biển mây
  hình thành — tự ước tính từ DEM hoặc mặt cắt đã xác thực) và **vị trí bạn đứng** (chỉ để
  tính ΔH so với mặt mây). Nghịch nhiệt so với suy giảm chuẩn 6.5°C/km — không còn "đỉnh
  cao nào cũng báo đẹp".
- 🌙 **Cửa sổ đêm-trước**: xét cả pha bức xạ 19h→6h (mây cao che đêm, gió thung lũng đêm,
  mưa đêm) — yếu tố quyết định biển mây có hình thành hay không.
- 🎯 **Đồng thuận mô hình THẬT — 6 mô hình trong cùng 1 call**: ECMWF IFS + GFS + ICON
  + JMA (hợp Đông Á) + **UKMO 10km** (lưới mịn nhất trong các model toàn cầu miễn phí)
  + **ECMWF AIFS** (model AI — trường phái dự báo khác hẳn, tăng độ tin khi đồng thuận);
  điểm = median, trạng thái = đa số, kèm % đồng thuận và độ lệch thật.
- 📡 **Profile khí quyển 7 mực (engine-2.0)**: 975→700hPa với độ cao **geopotential THẬT
  từng ngày** (hết hằng số lệch 20–40m), cloud cover theo từng tầng → mặt mây = đỉnh lớp
  mây LIÊN TỤC từ dưới lên; **boundary layer height đêm** (GFS) bắt không khí tù đọng;
  **mực đóng băng thật** → cảnh báo băng giá; nhiệt độ 2 điểm được API downscale theo
  đúng độ cao thung lũng/vị trí đứng (`&elevation=`).
- 🎯 **Trang kết quả "phán quyết trước"**: màn hình đầu tiên trả lời thẳng ĐI hay KHÔNG
  (ngày đẹp nhất, điểm, giờ có mặt, lời khuyên) — các ngày còn lại thu gọn 1 dòng, bấm mở
  chi tiết; nút "Đêm nay đi đâu" nằm trên cùng, không cần nhập gì.
- 🔍 **"Vì sao điểm này?"**: mỗi ngày liệt kê từng yếu tố cộng/trừ điểm (mây thấp bình minh,
  nghịch nhiệt, ẩm, gió theo vùng địa hình, mây cao che đêm, mưa, mùa) — minh bạch 100%.
- 🔄 **Bản mới KHÔNG tự tải lại**: service worker cập nhật nền rồi hiện thanh hỏi — bấm "Tải lại"
  mới đổi bản. Trước đây dùng `autoUpdate` nên mỗi lần deploy là trang tự `location.reload()` ngay
  giữa lúc đang xem kết quả (lỗi thật 07/09/2026). Bảng xếp hạng cũng được cache trong localStorage
  theo phiên bản engine nên mở lại tức thì, không nã lại API.
- ⛔ **Trung thực dữ liệu**: ngày ngoài phạm vi dự báo hiện UNKNOWN + "ngoài phạm vi dữ
  liệu" thay vì số bịa; ngày xa (4–15 ngày) dán nhãn "chỉ là xu hướng"; **dữ liệu tải từ
  cache offline cũ hơn 1.5h hiện banner "tải cách đây ~X giờ"** thay vì đeo badge tin cậy.
- 📸 **Chỉ số "cháy mây" bình minh** riêng cho nhiếp ảnh: một ít mây cao 15–55% = trời đẹp
  nhất để hứng màu, **hiệu chỉnh theo độ đục khí quyển THẬT** (AOD/PM2.5 từ CAMS — mù khô
  mùa đốt nương làm mặt trời mọc xỉn màu dù mây đẹp).
- 🔗 **Link chia sẻ kết quả**: URL tự mang `?spot=&from=&to=&alt=` — gửi cho bạn đồng hành
  là họ mở đúng dự báo đó, không cần mô tả thao tác.
- 📍 **Phân giải địa danh nhiều tầng có nhãn nguồn**: thư viện **60 điểm đã xác thực phủ
  toàn quốc** (Tây Bắc + Hà Giang/Cao Bằng/Quảng Ninh + Bạch Mã, Bà Đen, Măng Đen, cụm
  Đà Lạt, và các điểm "ẩn" như Phình Hồ, Kéo Lồm, Chiềng Công, Đồn Đèn...) →
  Nominatim/Open-Meteo geocoding (tọa độ thật) → AI ước tính (cảnh báo rõ).
  Điểm mới được thêm bằng quy trình xác minh: OSM/Nominatim hoặc **giải mã plus code
  Google Maps** + đối chiếu độ cao DEM — không bao giờ đưa tọa độ đoán vào thư viện.
- 🔀 **Chọn model AI minh bạch**: dropdown chỉ hiện model phân tích văn bản (lọc model
  tạo ảnh/Live); model bạn chọn lỗi (429...) thì hạ bậc thang chất lượng (3.7 → flash-latest
  → 3.6 → 3.5..., Lite gần cuối, **Gemma tuyệt đối cuối cùng** — không chen vào bậc thang
  Flash) và app nói rõ model nào đã viết lời bình. Số liệu dự báo không phụ thuộc model AI.
  **Tự lên đời model:** danh sách lấy từ API theo key của bạn mỗi lần mở app (hoặc bấm 🔄 Cập
  nhật); mặc định là bản Flash có số phiên bản cao nhất mà key thấy (hiện 3.8 Flash), nên ra
  model Flash mới thì app dùng ngay không cần sửa code. Alias `gemini-flash-latest` vẫn chọn tay
  được, nhưng Google không nói nó đang trỏ bản nào (16/10/2026 nó ra 2.5 Flash), nên kết quả
  hiện thêm tên model Google báo đã chạy thật. Khi phải dự phòng, alias đứng SAU mọi bản Flash có số
  (26/10/2026), và ghi chú dự phòng nói luôn bản Google báo đã chạy. Model cao cấp (vd **Gemini 4 Argon**,
  chỉ gói trả phí) chọn tay được, kèm cảnh báo, nhưng không bao giờ là mặc định hay dự phòng
  tự động; họ model mới chưa rõ giá cũng vậy.
- 🕐 **Ngày giờ neo theo Asia/Ho_Chi_Minh** — đúng ngày Việt Nam kể cả khi thiết bị đặt
  múi giờ khác.
- 🕘 **Lịch sử dự báo** (localStorage): mở lại tức thì, và là nền tảng để đối chiếu
  "app đoán gì vs thực tế" sau chuyến đi.
- 📥 **Xuất GPX/TXT offline** với tọa độ thật của địa điểm.
- 📅 **"Cuối tuần đi đâu?"** (30/10/2026): bảng điểm miền Bắc × 7 rạng sáng tới (1 call Open-Meteo, cùng engine và luật "đáng đi"), cột T7/CN nổi bật, ô viền đứt = dự báo xa hơn 3 ngày. Không có % xác suất; ★ = điểm đã kiểm chứng thực địa (Tà Xùa, Fansipan).
- 🌄 **"Đêm nay đi đâu săn mây?"**: xếp hạng TOÀN BỘ thư viện cho rạng sáng mai trong
  1 call batch — cùng engine + cùng 41 biến (đủ profile 7 tầng) với bản đầy đủ, chỉ khác
  dùng 3 mô hình GFS+ICON+UKMO (đo lệch thực tế ~4/100 điểm); bấm điểm nào là phân tích
  đầy đủ 6 mô hình điểm đó.
- 🛵 **"Cung đường tới điểm săn mây"** (19/11/2026): chọn nơi xuất phát + điểm trong thư viện, app lấy tuyến OSRM, cao độ DEM 100 điểm dọc đường (đèo cao nhất, tổng leo dốc), rồi lấy dự báo Open-Meteo ĐÚNG GIỜ đi qua ~15 điểm: mưa, dông, sương mù / đi trong mây, gió giật, lạnh ở cao độ mặt đường, mưa 24h và số ngày mưa trước đó (đường trơn; sạt lở theo QĐ 18/2021), qua đèo lúc tối. Mặc định tính ngược giờ xuất phát để tới nơi 30 phút trước bình minh. Kèm **Tóm tắt ngày tại đích** (3 ngày): mây theo buổi, khung giờ mưa, dông, gió giật mạnh nhất, tầm nhìn kém nhất, giờ mặt trời - dùng lại dự báo đã tải, không gọi thêm API. Giờ đi qua = quãng đường / tốc độ trung bình người dùng chọn (OSRM quá lạc quan trên đèo). Ngưỡng tham khảo trong `services/routeService.ts` (`TH`), không đụng engine biển mây. Component `RouteWeather.tsx` (tải lười).
  - Vòng 2 (19/11/2026): **xe máy đi tuyến Valhalla hồ sơ motorcycle** (máy chủ FOSSGIS miễn phí, CORS mở, ghi công © OpenStreetMap + link sửa bản đồ ngay dưới kết quả); lỗi thì về OSRM và giao diện ghi rõ "TUYẾN Ô TÔ". Tuyến có đoạn thu phí/cao tốc thì nhắc xem biển cấm xe máy. Ô tô vẫn OSRM. Tóm tắt ngày có **bảng rạng sáng 4-9h tại đích** (nhiệt, ẩm, mây thấp, tầm nhìn, cờ nguy hiểm cùng luật cung đường; KHÔNG phải điểm biển mây theo giờ, engine chỉ chấm theo ngày). Mã thời tiết 45/48 = sương mù (`ROUTE_RULES_VERSION` route-1.1).
  - **Kèo thơm theo km đường thật**: nút "📍 Km đường từ chỗ tôi" trong bảng xếp hạng, một lần gọi OSRM `table` cho cả thư viện (cache 24h, làm tròn vị trí 2 số lẻ), lọc ≤100/200/300 km; xếp hạng vẫn theo cơ hội biển mây.
  - Vòng 3 (19/11/2026): **thanh tiến độ "Bước n/3"** (tìm đường, đo cao độ, lấy dự báo) đếm giây; mỗi yêu cầu mạng có trần 30 giây và báo lỗi rõ theo dịch vụ (429 = dịch vụ miễn phí đang giới hạn lượt theo mạng của bạn), không quay mãi. **Tuyến bạn đã lập**: mỗi tuyến thành công lưu bản gọn trong máy (localStorage, tối đa 50, toạ độ xuất phát làm tròn ~1 km), có nút Tải JSON và Xoá, app không gửi đi đâu. Chân trang ghi công © OpenStreetMap, Valhalla (FOSSGIS), Open-Meteo và link báo lỗi GitHub Issues và email liên hệ buiha261193@gmail.com (19/11, theo điều khoản FOSSGIS Valhalla). Đo trên Pages 19/11: 3/3 lượt thành công trong 3,8-5,8 giây (Valhalla 1,4-2,1 giây là bước chậm nhất).
  - Thử nghiệm engine vòng 3: lấy dự báo tại điểm thung lũng thấp nhất trong 20 km (DEM) **không đạt** luật cổng (báo nhầm tăng 419 -> 612), engine giữ nguyên; chi tiết trong `NHAT-KY-HIEU-CHINH.md`.
  - Vòng 4 (19/11/2026): **khí hậu theo tháng dọc tuyến và tại đích**. Chọn ngày đi quá 7 ngày dự báo (ô ngày cho chọn tới 1 năm) thì phán quyết đầu trang là "Khí hậu tháng X dọc đường": mưa cả tháng, số ngày mưa to >= 50 mm, số ngày mưa >= 100 mm (mức thấp nhất QĐ 18/2021 xét cấp sạt lở), ngày rét đậm, đêm <= 3°C, ngày ẩm suốt ngày (chỉ báo thay sương mù), mỗi chỉ số kèm km nặng nhất. Ngày trong tầm dự báo thì khối này nằm thu gọn sau Tóm tắt ngày; Tóm tắt ngày có thêm câu "Tháng X ở đây thường..." và mùa biển mây đếm từ nhãn quan sát (ghi cỡ mẫu, dưới 5 buổi sáng thì nói chưa đủ mẫu). Số tính sẵn bằng `scripts/climate-monthly.ts` từ Open-Meteo Historical (ERA5/ERA5-Land, 2016-2025), ghi `public/climate/monthly-v1.json` (8 tuyến cố định + điểm thư viện); tuyến tự lập lấy mốc gần nhất trong 30 km và ghi rõ là xấp xỉ. ERA5 làm mượt mưa lớn ở núi nên số ngày mưa to là cận dưới. Code: `services/climateService.ts`, test `tests/climate.test.ts`. Phần vị trí còn thiếu do workflow `.github/workflows/climate.yml` lấy tiếp trên GitHub Actions (chế độ nối tiếp: dùng lại vị trí đã có trong tệp, điểm mốc tuyến ghi sẵn ở `data/climate-route-points.json`), chạy hằng ngày 10:17 giờ VN và tự tắt lịch khi hết mục thiếu. Lượt đầu 19/11/2026 đã lấy đủ 89/89 vị trí (8 tuyến cố định + điểm thư viện) và tự tắt lịch.
  - Vòng 5 (19/11/2026): **độ ổn định dự báo** tại đích (khối thu gọn "Dự báo tại đích có đang đổi không?", chỉ tải khi mở) và dòng "Dự báo tải lúc HH:MM" giờ VN. So 3 lần chạy gần nhất (mới nhất, cũ hơn ~1 và ~2 ngày) của ECMWF/GFS/ICON/UKMO từ Open-Meteo Previous Runs về mưa cả ngày và TỔNG MÂY rạng sáng 05-07h (không phải biển mây). Cột lần chạy cũ chọn theo số ngày còn lại tới giờ đó, vì `<biến>_previous_dayN` là giá trị dự báo N x 24 giờ TRƯỚC GIỜ HIỆU LỰC; ngày càng xa càng ít lần chạy để so. Lớp: mưa < 1 mm khô (WMO/ETCCDI), 20 và 50 mm (thang KTTV); mây theo okta WMO (<= 2 okta, >= 6 okta). Luật "ổn định / hơi dao động / đang dao động" là quy ước của app, chốt trước. Chỉ hiển thị, không tham gia điểm/trạng thái/đáng đi. Code: `services/stabilityService.ts`, test `tests/stability.test.ts`.
  - Vòng 6 (19/11/2026): **dông và sạt lở dọc tuyến** (khối thu gọn sau Độ ổn định, chỉ tải khi mở, 1 lần gọi Open-Meteo cho mọi điểm). Dông: CAPE + số mô hình (ECMWF/GFS/ICON/UKMO) báo mã 95-99 + mưa giờ trong cửa sổ giờ đi qua +- 1 giờ, hiện theo đoạn đường và từng điểm. Thang CAPE theo NWS/SPC (< 1000 yếu, 1000-2500 vừa, 2500-4000 mạnh, > 4000 cực mạnh, J/kg); luật gộp 4 mức là QUY ƯỚC CỦA APP chốt trước (`STORM_RULES_VERSION` storm-1.0). Sạt lở, lũ quét: áp Điều 46 + Bảng 6 Phụ lục XII Quyết định 18/2021/QĐ-TTg (mưa 24h >= 100 mm kèm số ngày mưa trước), báo KHOẢNG cấp cho nhóm khu vực 1-2 và 3-4 vì app không có bản đồ vùng nguy cơ; chỉ xét điểm >= 300 m. Chỉ hiển thị, không tham gia điểm/trạng thái/đáng đi. Bản chụp tuyến hằng tối ghi thêm độ ổn định (ngày đích D..D+5), dông và sạt lở để chấm sau (cách chấm chốt trước: `docs/cung-duong-kiem-chung.md` mục 6-8). Code: `services/stormService.ts`, `services/slideService.ts`, test `tests/storm-slide.test.ts`.
  - Cổng bóng agy (19/11/2026, phiếu gd355): cột `agyGate` ghi vào bản chụp dự báo mới để thử khung 8 mực áp suất của nhánh agy làm cổng chống báo nhầm; không đổi gì hiển thị, chấm một lần ~20/12 (`scripts/score-agy-gate.ts`, tiêu chí đăng ký trước trong `NHAT-KY-HIEU-CHINH.md`).
  - Bóng 6 mô hình cho bảng 7 ngày (27/11/2026, phiếu gf1b7): bản chụp tuần (`far/<ngày>-week.json`) ghi thêm cột `shadow` tính bằng cả 6 mô hình, bảng hiển thị vẫn 3 mô hình. Đo cùng ngày: dấu ✓ của bảng 3 mô hình không hơn tỉ lệ nền khi so vệ tinh. Chấm bóng một lần khoảng 18-20/12, kế hoạch đăng ký trước trong `NHAT-KY-HIEU-CHINH.md`.
  - Vòng 7 (19/11/2026): **một luật sạt lở, tuyến chưa tới đích, đếm lượt gọi**. Cờ sạt lở trong mức độ khó của tuyến nay dùng chính luật QĐ 18/2021 của khối chi tiết (bản luật `route-1.2`): đạt điều kiện xếp cấp -> mức 3, mưa >= 100 mm mà chưa đủ ngày mưa trước -> mức 2, mưa to 50-100 mm -> "đường đèo trơn" mức 1; bỏ mốc 72 giờ không có nguồn (khí hậu tháng cũng bỏ "đợt 3 ngày >= 150 mm"). Đích ở cuối đường mòn (đo 19/11: Pù Luông, Bạch Mã hở hơn 2 km) thì app nói "Tuyến CHƯA TỚI ĐÍCH ... X km", và Tóm tắt ngày, giờ rạng sáng, độ ổn định lấy thời tiết + độ cao TẠI ĐÍCH (thêm 1 toạ độ vào cùng lần gọi, không thêm lần gọi). `scripts/check-route-ends.ts` kiểm điểm cuối 8 tuyến cố định không cần Open-Meteo. Các script chụp/khí hậu in một dòng `[đếm gọi mạng]` theo máy chủ khi kết thúc (`scripts/count-calls.ts`).
  - **Chụp phán quyết cung đường mỗi tối** (`scripts/snapshot-routes.ts` -> `data/observations/<D>-routes.json`, 8 tuyến cố định, thêm Sa Pa - đèo Ô Quy Hồ 19/11 để ghép nhãn Facebook): chỗ cắm để sau này chấm ngưỡng độ khó với báo cáo chuyến đi thật, xem `docs/cung-duong-kiem-chung.md`. Ngưỡng hiện CHƯA có sự thật, không chỉnh theo cảm giác.
- 🕵️ **Chụp shadow skyradar.vn hằng ngày** (job `skyradar` trong `verify-loop.yml`, 19/11/2026): 18 điểm, chỉ đọc, giãn 6 s, giữ 03-09h, vào `data/skyradar-shadow/`. Chỉ để ĐỐI CHỨNG, không phải nhãn: calibrate in bảng "ĐỐI CHỨNG skyradar" (họ vs mình vs nhãn vệ tinh/Facebook/người đi), cần >= 20 ngày mới đọc. Lỗi chụp làm đỏ job, không ghi tệp rỗng.
- 📸 **"Bản chụp dự báo hằng ngày"** (17/11/2026): xem lại 14 ngày qua app đã dự báo gì cho từng rạng sáng (đọc `data/observations/<ngày>-forecast.json` từ kho GitHub công khai, không tính lại; vòng kiểm chứng chụp khoảng 22-24h mỗi tối). Component `SnapshotHistory.tsx`.
- 🔁 **Hai kênh chụp dự báo** (17/11/2026): GitHub Actions (cron hay trễ 3-10h, có hôm không nổ) + máy nhà (`tools/snapshot-local.sh`, systemd user timer `cloudhunter-snapshot` 19:30 và 22:30 giờ VN, bản clone riêng `~/.local/share/cloudhunter-snapshot`). Ai chụp trước thì giữ, bên sau thấy file có rồi thì bỏ qua. Máy nhà gặp Open-Meteo 429 "hết hạn mức NGÀY" thì tự kích Actions `verify-loop` job=snapshot chụp hộ (IP khác) và chờ tệp lên main, chỉ báo lỗi khi cả Actions cũng hỏng (28/11/2026).
- 🛰️ **"Mây LÚC NÀY"**: vòng lặp ảnh vệ tinh Himawari-9 hồng ngoại (JMA, 10 phút/ảnh,
  nhìn được mây cả ban đêm) — kiểm tra biển mây đang thật sự hình thành trước khi xuất
  phát lúc 3-4h sáng.
- 📊 **Biểu đồ mây theo độ cao × thời gian** (kiểu meteoblue): mỗi tầng áp suất một
  hàng với độ cao geopotential thật + vạch vị trí bạn đứng — nhìn 1 giây biết mây nằm
  dưới chân (biển mây) hay trùm đầu (mù).
- 🌙 **Trăng cho nhiếp ảnh đêm** (tính cục bộ bằng astronomy-engine, khớp USNO trong 1 phút; tải lười): pha, độ sáng, giờ lặn/mọc,
  cửa sổ Milky Way hoặc "biển mây dưới trăng" cho từng rạng sáng.
- 🌧️ **Radar mưa RainViewer** quanh điểm (composite có 10 trạm radar VN): "mưa phùn tối
  nay có tan trước sáng không?" — quy luật vàng của biển mây.
- 📴 **PWA offline**: cài lên màn hình chính, mất sóng trên đèo vẫn mở lại được app và
  dự báo đã tải (cache app shell + dữ liệu Open-Meteo 12h).
- 📤 **Chia sẻ ảnh kết quả**: chụp thẻ tổng quan thành PNG ngay trên máy (không server)
  để đăng nhóm săn mây; tên file giữ chữ Việt bỏ dấu đúng cách.
- ⚡ **Tải nhanh**: code-split — SDK AI (~300KB) và màn kết quả chỉ tải khi cần;
  meta/OG đầy đủ để link chia sẻ có preview đẹp.
- 🎲 **Xác suất từ 51 kịch bản tổ hợp ECMWF** (ensemble): "% kịch bản có mây thấp ≥40%
  lúc bình minh" + dải P10–P90 — độ bất định CÓ CƠ SỞ VẬT LÝ, không chỉ so 4 model.
- 🔬 **Đối chiếu với thực tế**: mỗi lần dự báo đã lưu có nút 🔬 — sau chuyến đi ~5 ngày,
  app tự so trạng thái đã đoán với % mây thấp thực tế từ tái phân tích ERA5 và báo
  trúng/trượt từng ngày (sai thì nói sai).
- 🗺️ **Mùa theo 3 miền khí hậu**: Bắc (nhịp Tây Bắc), Trung (mưa bão 9-12), Nam/Tây
  Nguyên (khô 11-4) — hết chuyện Bà Đen tháng 12 bị trừ điểm theo "mùa đông Tây Bắc".

## 📐 Engine (tóm tắt — chi tiết trong AGENTS.md)

| Chỉ số | Công thức / cách tính |
| :--- | :--- |
| LCL (đáy mây) | `thung_lũng + 125 × (T_valley − Td_valley)` |
| Ổn định cột khí | anomaly = T_tầng − (T_valley − 6.5°C/km × Δh) trên profile 7 mực (độ cao thật, chỉ tầng ≤2600m); ≥3°C = Strong. Đo **cả cột ổn định hơn chuẩn bao nhiêu** — có thật, nhưng KHÔNG có địa chỉ |
| Đáy nắp chặn | mực thấp nhất từ đáy mây trở lên có Γ ≤ 3,5°C/km (đoạn nhiệt ẩm ~5 ⇒ ≤3,5 là ổn định hẳn). Không tìm thấy thì trả `null`, **không bịa số**. Cần vì anomaly cộng dồn theo độ cao nên "tầng cực đại" rơi vào mực cao nhất cửa sổ ở **113/120 ca đo được (94%)** — một trần cửa sổ quét, không phải phép đo |
| Mặt mây (top) | đỉnh LỚP MÂY LIÊN TỤC từ dưới lên (cc tầng ≥45% / RH≥80%) +150m, không nhảy cóc lên lớp mây tách rời |
| ΔH | vị_trí_đứng − top → STATIC / FLUCTUATING(±250m) / FOG |
| Đứng trong mây | mực áp suất gần cao độ người đứng nhất (±250m) mà có mây ≥45% hoặc RH ≥90% ⇒ nhãn FOG, **bất kể ΔH**. Số đọc trực tiếp thắng số suy ra: đỉnh mây là ước lượng ±200m. Ca thật Fansipan 07/09: ΔH = +5m nên app khuyên đi, trong khi chính mực đó có mây 72% và vệ tinh báo đỉnh mây 3.915m |
| **Đáng đi** (engine-2.8.2) | **không phải ngưỡng điểm**: kết luận CÓ biển mây + đồng thuận ≥50% mô hình + ΔH > 100m (đứng CAO HƠN mặt mây ít nhất 100m — biên này chặn kiểu "trên mặt mây 5m", vì so dự báo tối hôm trước với thực tế thì chính ΔH lệch trung vị 207m). Không nới lên 250-500m dù báo nhầm có giảm: `ΔH ≤ chỗ đứng − đáy thung lũng`, nên ngưỡng 500m sẽ **xoá sổ 18/56 điểm** địa hình thoải (Linh Quy Pháp Ấn, Đồi chè Cầu Đất, Măng Đen…) bất kể thời tiết. Điểm chỉ xếp thứ tự. Lý do: 6 ngày kiểm chứng có biển mây, ngưỡng điểm ≥60 khuyên đi 0/6 — nó đo nguyên liệu sương bức xạ sách vở, còn biển mây mùa mưa không đi đường đó |
| Gộp nhiều mô hình | bỏ phiếu **hai bước**: chọn KẾT LUẬN (có biển mây / chìm trong mây / trời quang / bị chặn) trước, rồi mới chọn nhãn chi tiết trong nhóm thắng. Bốn nhãn STATIC/FLOWING/FLUCTUATING/ROLLING là MỘT kết luận, không phải bốn ý kiến — trước đây đa số 4-2 bị chia phiếu nội bộ 2-2 nên thua FOG có 2 phiếu |
| FSI | 2(T−Td) + 2(T_valley − T850) + gió — tham chiếu thung lũng |
| VRII | 85 − 12·spread − 2.5·gió_đêm + bonus nghịch nhiệt − phạt mây cao đêm |
| Gió theo vùng | Zone A: 12/18/26 km/h · Zone B (ống gió Lai Châu): 5/8/15 km/h |
| Mặt mây bị kẹp | không vươn qua **đáy nắp** được — trời mưa làm cả cột khí ẩm, nếu không kẹp thì mọi mô hình đều báo "chìm trong mây". Kẹp bằng đỉnh anomaly khi có đỉnh THẬT, bằng tầng ổn định cục bộ khi anomaly chỉ là một cái dốc |
| Chọn tầng gió | biển mây bị nhốt dưới nắp nghịch nhiệt → xét gió **925hPa trong lớp mây**; không có nắp → 850hPa |
| Bão hoà thung lũng | T−Td ≤1°C + RH cao → tín hiệu biển mây **độc lập** với `cloud_cover_low` (mô hình toàn cầu bỏ sót sương thung lũng hẹp) |
| Mây đội đỉnh | mây do nâng địa hình sinh ra NGAY TẠI đỉnh, thung lũng bên dưới quang — không phải biển mây, cũng không phải trời quang. Nhận bằng cách so hai quãng đường: cần nâng `25 × (100 − RH)` m để ngưng tụ, núi nâng được `min(600m, ½ × chênh cao đỉnh−đáy)`. Tự co giãn theo độ nhô của đỉnh và theo nền nhiệt, không dùng ngưỡng RH cứng. Chỉ được đổi CLEAR → FOG |
| Lớp mây bám gốc | bộ dò thứ ba: lớp ẩm/mây **liên tục bắt đầu sát đáy thung lũng** trên profile 7 mực. Cần vì mô hình có thể báo `cloud_cover_low = 0%` trong khi chính nó cho RH 80-85% suốt từ đáy lên 950m rồi rớt hẳn ở 1.450m — đúng một biển mây dày 700m |
| Ẩm lớp biển mây | đo ở mực gần **đáy mây + 100m** (geopotential thật), không chọn cứng theo độ cao thung lũng — thung lũng 274m mà đo ở 760m là đo gần đỉnh lớp sương, có khi đo hẳn không khí bên trên nó |
| Điểm ngày | **max(mây thấp, bão hoà)** + nghịch nhiệt + ẩm − gió − mây cao đêm − mưa(theo mm/h) ± mùa |
| Lớp biên đêm | **chỉ còn trừ điểm**, không thưởng: chỉ GFS có biến này và 46/50 ca của GFS đều ≤200m ⇒ thưởng +8 không phân biệt được ngày tốt/xấu, chỉ nâng riêng GFS lên trong mọi so sánh — mà so sánh giữa các mô hình chính là thứ app dùng để tự hiệu chuẩn |
| Mưa | không còn xoá kết luận biển mây; phạt theo cường độ, giảm 40% khi có "chữ ký biển mây"; cảnh báo mưa luôn hiện theo lượng mưa thật |

## 🚀 Chạy & kiểm tra

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint     # type-check
npm test         # 288 test: bóng 6 mô hình bản chụp tuần + engine + mùa 3 miền + ensemble + ERA5 + AOD + trăng + fallback + múi giờ + alias + cache/lịch sử + chọn model mới + lọc nhiễu khung vệ tinh + khí hậu tháng + thung lũng v2 + dông/sạt lở dọc tuyến
npm run build

# công cụ kiểm chứng (gọi API thật, không phải unit test)
npx vite-node scripts/audit-coords.ts              # đối chiếu toạ độ thư viện với DEM
npx vite-node scripts/find-spot.ts "Vân Sơn" 20.61 105.18 8   # tìm toạ độ điểm ngắm: OSM + quét DEM 2 vòng
npx vite-node scripts/pluscode.ts "8VFJ+9V2" 22.30 103.89     # giải plus code (kể cả mã NGẮN) → toạ độ + DEM
npx vite-node scripts/snapshot-dem.ts              # chụp lại DEM cho test offline
npx vite-node scripts/hindcast.ts TA_XUA_SON_LA    # soi lại 1 ngày: engine chấm gì, vì sao
npx vite-node scripts/rank-now.ts                  # chạy bảng xếp hạng ngoài trình duyệt
npx vite-node scripts/audit-vars.ts                # đối chiếu 2 chiều: biến FETCH ↔ biến engine ĐỌC
npx vite-node scripts/gate-power.ts                # đo sức phân biệt của các ngưỡng trước khi nới
npx vite-node scripts/ab-combine.ts                # so luật gộp cũ/mới trên cùng 1 lần lấy dữ liệu
npx vite-node scripts/inversion-probe.ts           # "độ cao nghịch nhiệt" là phép đo hay là trần cửa sổ quét?
npx vite-node scripts/summit-cloud-probe.ts        # đo tần suất bật của bộ dò mây đội đỉnh
npx vite-node scripts/observer-gate-probe.ts       # cổng "chỗ tôi đứng có mây không": tần suất bật + quét trần ΔH
~/.venvs/ch-verify/bin/python tools/audit_cloudmask.py --all   # nhãn CLEAR của vệ tinh có thật là trời quang? (AHI-CMSK)
npx vite-node scripts/dump-rank.ts truoc.json …    # kết xuất bảng xếp hạng để so TRƯỚC/SAU một thay đổi engine
npx vite-node scripts/diff-rank.ts truoc.json sau.json   # đếm chính xác bao nhiêu điểm đổi nhãn/kết luận

# VÒNG KIỂM CHỨNG ĐỘ CHÍNH XÁC — GitHub Actions tự chạy 2 lần/ngày (.github/workflows/verify-loop.yml); chạy tay:
npx vite-node scripts/snapshot-forecast.ts [YYYY-MM-DD]               # tối hôm trước: chụp dự báo rạng sáng mai (để trống = mai)
~/.venvs/ch-verify/bin/python tools/verify_satellite.py 2026-08-24    # ~8h : nhãn thật từ vệ tinh
npx vite-node scripts/import-fb-auto.ts <nhan-ngay.json>              # nhập nhãn Facebook tự động (khi bộ thu báo)
npx vite-node scripts/regional-days.ts                                # bảng thời tiết vùng 05h, tìm ngày diện rộng tương tự
npx vite-node scripts/audit-cloud-top.ts                              # đo sai số độ cao mặt mây thật (bản chụp × vệ tinh Himawari)
npx vite-node scripts/calibrate.ts                                    # chấm điểm chính app
DUMP_ROWS=/tmp/rows.json npx vite-node scripts/calibrate.ts             # như trên + xuất từng dòng điểm-ngày đã ghép sự thật (phân tích ngoài)
```

### 🔁 App tự biết mình sai ở đâu

Ba nguồn sự thật độc lập, **không dùng mô hình dự báo để chấm mô hình**:

1. **Báo cáo thực địa** — sau chuyến đi bấm một nút ngay trong trang kết quả:
   *đứng trên biển mây / mây ngang tầm mắt / chìm trong mây / trời quang*. Đúng bằng đại lượng
   engine dự báo (mặt mây so với chỗ đứng). Lưu trong máy bạn, xuất JSON để hiệu chuẩn.
2. **Vệ tinh Himawari-9** — NOAA phát công khai độ cao đỉnh mây 2km/10 phút trên S3 (không cần
   khoá). `tools/verify_satellite.py` dán nhãn tự động cho mọi điểm mỗi ngày.
   Trung thực: hồng ngoại chỉ thấy lớp trên cùng, hôm nào có mây tầng cao che thì trả
   `BLOCKED_ABOVE` và **bị loại khỏi phép chấm** thay vì đoán bừa.
3. **`scripts/calibrate.ts`** ghép hai nguồn trên với dự báo đã chụp, in ra tỉ lệ đúng,
   danh sách ngày **BỎ SÓT** và ngày **BÁO NHẦM** — chỉnh hằng số nào là nhìn thẳng vào đó.
   Từ 14/10/2026 nó in thêm mức theo dõi "đáng đi ∧ điểm ≥ 65" kèm số NGÀY độc lập và tách theo cao độ
   (đỉnh ≥ 2.400m đạt 85% toàn kho / 80% ngoài mẫu, nhưng chưa đưa lên giao diện do lỗi cộng trùng ẩm ở
   thung lũng thấp và bước nhảy mùa ngày 01/12 - xem `AGENTS.md`), và bỏ qua báo cáo không phải rạng sáng (`timeOfDay`).

> **Nhãn tự động từ Facebook (từ 19/10/2026):** bài "thời tiết hôm nay" của người làm du lịch tại
> chỗ ở Tà Xùa và Fansipan được đọc hằng ngày ở máy nhà, mỗi bài gắn nhãn bởi một lượt AI không được
> xem dự báo. Repo chỉ nhận nhãn (`data/observations/fb-auto-reports.json`, nhập bằng
> `scripts/import-fb-auto.ts`), không ảnh, không tên. Thứ bậc: người đi > Facebook > vệ tinh;
> calibrate chỉ chấm nhãn độ tin ≥ 0,6 và in số riêng theo nguồn. Xem AGENTS.md.

> **Kiểm chứng thực địa 25/8/2026 (Tà Xùa — ngày thứ BA liên tiếp):** app ghi `34/100 · FOG`
> từ hôm trước. Truy ra lỗi gộp phiếu: 4/6 mô hình đặt mặt mây **dưới** chỗ đứng nhưng chia
> nhau hai nhãn nên hoà 2-2-2, rồi thua `FOG` chỉ có 2 phiếu — trong khi app vẫn hiển thị mặt
> mây trung vị 1.446m dưới chỗ đứng 1.600m. Nay gộp theo KẾT LUẬN trước, nhãn chi tiết sau:
> ra `FLUCTUATING`, đồng thuận 67%. Đo trên 50 điểm: chỉ 3 điểm đổi nhãn, không phải cửa xả.

> **Kiểm chứng thực địa 25/8/2026 (Thảo nguyên Suôi Thầu, Xín Mần):** người dùng báo biển mây
> kèm plus code cho một điểm **chưa hề có trong thư viện**. Ca này lộ ra bốn lỗi nữa, đáng nhớ nhất
> là một **lỗi câm**: engine đọc `relative_humidity_2m` nhưng biến đó chưa bao giờ được xin từ API →
> luôn `NaN` → cả một nhánh của bộ dò bão hoà chưa từng chạy, mà 80 test vẫn xanh vì fixture gán
> thẳng số. Nay có `scripts/audit-vars.ts` đối chiếu hai chiều. Sau sửa: `12/100 · RAIN` →
> `24/100 · FLUCTUATING` (trạng thái đúng), và trên toàn bảng xếp hạng số điểm **giảm** trong khi số
> điểm nhận ra được biển mây **tăng** — engine nhìn rõ hơn chứ không lạc quan hơn. Chi tiết + số đo
> trong `AGENTS.md`.

> **Kiểm chứng thực địa 23/8/2026 (Tà Xùa, Bắc Yên):** người dùng thấy biển mây cả ngày,
> app cũ trả `0/100 · RAIN`. Truy ra 5 lỗi độc lập — toạ độ lệch 16km, bỏ sót tín hiệu bão hoà,
> phạt hai lần cùng một cơ chế, coi mưa là bằng chứng chống biển mây, và xét sai tầng gió.
> Chi tiết + ràng buộc mới trong `AGENTS.md`. Toàn bộ thư viện điểm đã được rà lại bằng DEM.

AI (tùy chọn): nhập Gemini API Key qua nút 🔑 trong app (lưu localStorage máy bạn —
không nhúng key vào code/bundle). **Dùng nhiều thiết bị:** trong modal 🔑 bấm
"📱 Dùng trên thiết bị khác" → quét QR (hoặc chép link) bằng máy kia → key tự lưu vào
máy đó và tự xóa khỏi thanh địa chỉ. Key nằm trong `#fragment` của link nên không bao
giờ được gửi lên server nào — chỉ quét/gửi cho chính mình.

## 🤖 Cho AI assistant tiếp tục phát triển

Đọc kỹ **`AGENTS.md`** — kiến trúc, ràng buộc vật lý, quy tắc "không bịa dữ liệu",
và backlog. Trước khi kết thúc mọi phiên sửa code: `npm run lint && npm test && npm run build`.

## 📄 Giấy phép & Tác quyền

Dự án của **phongvan0926**. Dữ liệu khí tượng: [Open-Meteo](https://open-meteo.com/)
(ECMWF/GFS/ICON). Geocoding: [Nominatim/OpenStreetMap](https://nominatim.org/).
Dự báo chỉ mang tính tham khảo — luôn quan sát thời tiết thực tế khi trekking.

**Cờ theo dõi "giống sáng 14/11"** (`services/capWatch.ts`): nhắc người dùng khi dự báo có tầng thấp bão hoà + nghịch nhiệt có nắp + khô trên cao như sáng 14/11/2026. Là giả thuyết chưa kiểm chứng, không đổi điểm hay lời khuyên; bản chụp dự báo ghi lại cờ để chấm sau.

**Dấu hiệu D "đêm quang đầu tiên sau đợt mưa"** (14/11/2026, `scripts/post-rain-clearing-study.py`, dòng D trong `calibrate.ts`): >= 3/4 cụm vùng có đêm quang trên cao sau >= 2/3 ngày mưa/âm u và khô trên cao (rh700 <= 40). Chốt trước khi chấm, mới bật 2/86 ngày (22/09 chưa có ai đi, 14/11 có biển mây 6 nơi); chỉ theo dõi, chưa vào app.

**Xem lại lịch sử:** "Lần tra gần đây" giữ 10 lần phân tích (trước là 5); bảng "Đêm nay đi đâu săn mây?" tự lưu một bản mỗi ngày rạng sáng, 14 ngày gần nhất, mở lại trong mục "🗂️ Bảng đã lưu" (không gọi API, không tính lại). Hết chỗ localStorage thì tự bỏ bản cũ nhất. Lưu trên máy người dùng, không đồng bộ giữa máy.

- **Vòng đối chiếu cổng agy tự động (g2448)**: timer đêm đo, ghi `data/agy-gate-doichieu.md`, bật/tắt cờ `data/agy-gate-flag.json` theo tiêu chí đăng ký trước (xem AGENTS.md).
