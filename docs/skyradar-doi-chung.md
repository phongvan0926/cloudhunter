# Đối chiếu skyradar.vn (nghiên cứu 19/11/2026, phiếu g5c77)

Đã đo ngày 19/11/2026: đọc toàn bộ 73 tệp JS/CSS công khai của skyradar.vn, gọi các API công khai như một người dùng, chạy trình duyệt (Playwright) bấm/chọn điểm, chụp phán quyết cho 18 điểm. KHÔNG đọc được mã phía máy chủ (Worker): thuật toán chấm "biển mây" nằm ở `POST /api/assess`, chỉ thấy đầu vào và đầu ra.

## Là gì
Sky Radar (tác giả Duy Chris, có app Android) = bản đồ dự báo SĂN ẢNH: ráng bình minh/hoàng hôn (Burn Score), Ngân Hà (Astro Score), bản đồ ô nhiễm ánh sáng Bortle, điểm trời tối, thời tiết dọc tuyến đường, bão, sét, thiên tai, sao chổi, lịch thiên văn, trợ lý AI, gói Pro trả tiền (thanh toán VietQR). Biển mây chỉ là MỘT mục ("SĂN MÂY", "Tìm kèo thơm") trong số đó, và họ tự gắn nhãn **"Đang thử nghiệm - kết quả có thể chưa đúng ở mọi nơi"**, cờ `shadow: true`.

## Nền tảng / build (đo được)
- Frontend: JS thuần đã nén (`*.min.js?v=...`), không framework; MapLibre GL + PMTiles + Chart.js; Supabase (đăng nhập Google, đóng góp, Pro); Cloudflare (Pages + Worker + RUM).
- Dữ liệu thời tiết: Worker riêng `skyradar-weather-api...workers.dev/v1/forecast` là proxy Open-Meteo, 4 mô hình (`ecmwf_ifs025, jma_seamless, icon_seamless, gfs_seamless`), có lớp `om-quota` (cache + đếm hạn mức, biết mô hình nào thiếu biến gì). Không-khí: CAMS. Địa hình: Copernicus DEM GLO-90 + `aws-terrain-tiles/terrarium` zoom 11. Vệ tinh mây: Himawari (JMA), lớp xem trực tiếp.
- Điểm API riêng: `/api/terrain`, `/api/assess`, `/api/lp` (+timeline), `/api/route`, `/api/typhoon`, `/api/lightning`, `/api/disaster`, `/api/comets`, `/api/assistant`, `/api/geocode`, `/api/feature-policy`, `/api/billing/web-qr`.

## Thuật toán biển mây của họ (suy từ đầu vào/ra)
1. `/api/terrain?lat&lng`: dựng DEM bán kính 20 km, trả `viewer.elev` (chỗ đứng), `valley` (điểm thung lũng đại diện: toạ độ, cao độ, khoảng cách km, hướng), `floor/base/top/relief`, `visibleFrac` (tỉ lệ nhìn thấy, dò tia).
2. Tải dự báo TẠI ĐIỂM THUNG LŨNG với `elevation=` bằng cao độ thung lũng (mây thấp, RH, nhiệt độ) từ 4 mô hình, song song với dự báo tại chỗ đứng.
3. Mỗi giờ, Worker trả `sanMay`: `index` (xác suất "có biển mây", mục tiêu `cloudsea_occurrence_v1`), `viewClear` (xác suất chỗ đứng quang), `below` (mức mây phía dưới), `jointShare` (tỉ lệ mô hình đồng thời thoả cả hai), `spread` (bất đồng giữa mô hình), `valleyFog`, `relief`, rồi `verdict {bienMay: co|co_the|khong, cheTamNhin, tamNhin}`.
4. Ngưỡng đo từ 172 giờ-điểm: `index >= ~0,45` -> "co"; `0,30..0,45` -> "co_the"; dưới -> "khong". `cheTamNhin` bật khi ẩm ở tầm người đứng rất cao (đứng TRONG mây).
5. Phụ: bản tổng hợp theo buổi sáng (`san-may-mornings`: khung giờ, ngày), quét "Tìm kèo thơm" quanh bạn bán kính 500 km, lọc theo ngày đi/về.

## So với CloudHunter
- Đã có và sâu hơn: mặt cắt mực áp suất thật + nghịch nhiệt + mặt mây (`estimateCloudTop`), 6 mô hình, bỏ phiếu theo KẾT LUẬN, kiểm chứng bằng vệ tinh + người đi + Facebook (hàng trăm dòng sự thật). Họ chưa công bố độ chính xác nào.
- Họ có mà mình chưa: (a) chuỗi THEO GIỜ cho cả ngày và gom thành "khung giờ có biển mây"; (b) dự báo tại điểm thung lũng được dò từ DEM bán kính 20 km thay vì một cao độ cố định; (c) đầu ra là XÁC SUẤT thay vì một điểm 0-100; (d) quét địa điểm quanh vị trí người dùng.
- KHÔNG áp dụng vào engine: chưa có bằng chứng họ đúng hơn; luật cổng AGENTS.md cấm sửa lõi khi chưa chấm trên toàn kho. Tuyệt đối không dùng phán quyết của họ làm nhãn sự thật.

## Đối chiếu thật 19/11 (rạng sáng 05-07h, 18 điểm, chưa có sự thật)
- 11/18 điểm họ báo "không" + `cheTamNhin=true` (đứng trong mây), trong đó 10/11 điểm engine mình cũng ra FOG/DISSIPATING và 17/18 điểm mình không khuyên đi - hai bên khớp ở hướng "ngày mù, không đáng đi".
- Họ báo CÓ ở 5 điểm mình xếp FOG với ΔH âm (Đèo Thung Khe, Ba Vì, Tam Đảo, Lang Biang, Bạch Mã): đó là điểm THẤP/vùng mây thấp, đúng loại 16/17 ca báo nhầm mà AGENTS.md đã chẩn đoán (mây "dựng" trong ngày trời quang). Chờ nhãn vệ tinh 19/11 để biết bên nào đúng.
- Số liệu: `data/skyradar-shadow/2026-11-19.json`. Công cụ chụp: `tools/skyradar-shadow.py` (chạy tay, ~4 phút/18 điểm, không hẹn giờ).

## Việc tiếp theo (chưa làm, cần anh quyết)
1. Hẹn giờ chụp skyradar hằng ngày (cùng lúc `snapshot-local`) 3-4 tuần rồi chấm họ vs engine trên nhãn vệ tinh/người đi. Chi phí: 1 phiên trình duyệt ~4 phút/ngày, gọi API công khai của họ nhịp chậm. Chưa làm vì là gọi ra dịch vụ bên thứ ba lặp lại.
2. Nếu họ thắng ở một nhóm điểm: thử ý (b) dự báo tại điểm thung lũng DEM - đó là SỬA LỚN, phải theo luật cổng (giả thuyết trước, chấm toàn kho, agent phản biện).
3. Ý (a) chuỗi theo giờ là việc UI, nhỏ; chờ anh chốt có muốn trên app không (anh từng ghi: biển mây giữ tới mấy giờ, mùa này chỉ yên sáng sớm).
