# Kiểm chứng độ khó CUNG ĐƯỜNG (chỗ cắm đo, 19/11/2026, phiếu gcc29 vòng 2)

Ngưỡng độ khó trong `services/routeService.ts` (`TH`: mưa, sương, gió giật, lạnh, băng, sạt lở) lấy từ
nguồn công bố (thang mưa KTTV, Beaufort, ngưỡng tầm nhìn đường bộ...), **chưa có sự thật nào cho
tuyến ở VN**. Luật: KHÔNG chỉnh ngưỡng theo cảm giác hay theo một chuyến đi lẻ. Tài liệu này nói cách
gom sự thật và cách chấm khi đã đủ.

## 1. App đã phán gì (bằng chứng có trước chuyến đi)

`scripts/snapshot-routes.ts`, chạy mỗi tối trong job `snapshot` của `verify-loop.yml` (bước phụ,
lỗi không chặn bản chụp chính), ghi `data/observations/<D>-routes.json`:
- 8 tuyến cố định (Hà Nội - Tà Xùa / Pù Luông / Hang Kia / Ba Vì bằng xe máy, Yên Bái - Phình Hồ xe máy,
  Hà Nội - Sa Pa và Huế - Bạch Mã ô tô; từ 19/11/2026 thêm Sa Pa - đèo Ô Quy Hồ xe máy, vì có nhãn Facebook
  hằng ngày cho đoạn QL4D này). Bộ tuyến chỉ được THÊM, không sửa, để các ngày so được với nhau.
- Giờ đi theo đúng luật nút "Tới nơi trước bình minh" của app: tới nơi = bình minh ước - 30 phút, tốc độ
  trung bình mặc định (xe máy 40, ô tô 50 km/h).
- Mỗi tuyến: máy tìm đường đã dùng (`router`, có `fallbackNote` nếu xe máy phải về tuyến ô tô), km, giờ đi,
  mức chung (`level` 0-3), các mối nguy nặng nhất theo loại (`worst`), và từng điểm mẫu (km, cao độ,
  giờ đi qua, thời tiết mô hình, cờ `hz` như `fog2`, `landslide1`).
- `rulesVersion` = `ROUTE_RULES_VERSION` lúc chụp. Đổi luật thì tăng số, và chỉ so bản chụp cùng bản luật,
  hoặc chấm lại bằng `samples[].wx` đã lưu (dữ liệu thô đủ để chạy lại `assessPoint`).
- Đã có tệp thì không đè. Không chụp bù ngày đã qua (Open-Meteo viết đè quá khứ).

Tuyến người dùng tự lập (19/11/2026): mỗi lần lập tuyến thành công, app lưu bản gọn (cùng dạng bản chụp,
`compactRoute`) vào localStorage `ch-user-routes-v1`, tối đa 50 tuyến mới nhất, toạ độ xuất phát làm tròn
0,01 độ (~1 km). Khối "Tuyến bạn đã lập" có nút Tải JSON và Xoá. Chỉ nằm trên máy người dùng, app không
gửi đi đâu; người dùng muốn góp thì tự gửi tệp JSON (kèm báo cáo chuyến đi theo mục 3).

## 2. Nguồn sự thật đề xuất (thứ bậc giống biển mây: người đi > Facebook > dữ liệu trạm)

1. **Báo cáo chuyến đi của người đi thật** (anh, bạn đi cùng, người dùng): một dòng mỗi chuyến theo mẫu ở
   mục 3. Tốt nhất, vì biết cả "đường KHÔNG khó".
2. **Bài phượt trên Facebook**, dùng lại bộ thu FB sẵn có (cùng nhóm đang gắn nhãn biển mây). Bài review
   chuyến kiểu "đi Tà Xùa hôm qua, đèo mù đặc, đường trơn". Cần thêm bộ gắn nhãn riêng cho tuyến (ngày đi,
   đoạn đường, mưa/sương/trơn/sạt/lạnh, mức "đi bình thường / phải chậm / phải dừng / quay về"), cùng luật
   độ tin chốt trước như `FB_MIN_CONFIDENCE`. **Đã có bản đầu (19/11/2026)** trong bộ thu FB (ngoài repo):
   luật chữ cố định, không LLM, chỉ đọc bài đã thu; mỗi nhãn có `date`, `observedByVN` (giờ đăng), `segments`
   (`place` thay cho km, `kinds`, `kindsAbsent`, `hard` 0-3 hoặc null khi bài không nói nặng nhẹ),
   `confidence` (0.8 bài cập nhật theo mẫu, 0.6 chú thích thường hoặc nói chung cả khu Tà Xùa, 0.3 khi ngày
   trong chữ khác ngày đăng), dùng được khi >= 0.6. Chạy thử trên 242 bài: 77 nhãn dùng được trên 53 cặp
   (nguồn, ngày), gần hết là đoạn Ô Quy Hồ / Cầu Kính Rồng Mây; fog có 6 / vắng 61, rain có 4 / vắng 67;
   chưa bài nào nói trơn hay sạt (0 nhãn `hard >= 2`). Lưu ý khi chấm: giờ đăng thường 7-15h, còn bản chụp
   tuyến là giờ đi trước bình minh, nên luật "giờ lệch <= 3 giờ" ở mục 4 loại phần lớn cặp; nhãn FB dùng
   được nhất cho chấm `wx` theo giờ đăng, không cho mức chung của chuyến đi đêm. Hạn chế: người ta hay đăng khi đường khó, ít khi đăng
   "đường bình thường", nên mẫu âm tính hiếm; nhóm hỏi đường ("ai vừa đi Tà Xùa đường thế nào") cho mẫu
   âm tính tốt hơn.
3. **Tin sạt lở / cấm đường** của báo địa phương, thông báo của Sở GTVT, Cổng TTĐT tỉnh: chỉ xác nhận ca
   NẶNG (mức 3 sạt lở), không nói được mức 1-2.
4. **Mưa đo ở trạm** (KTTV, VRAIN nếu đọc công khai được): kiểm riêng đầu vào mưa 24h/72h của mô hình,
   không kiểm trực tiếp "độ khó".

## 3. Mẫu một báo cáo chuyến đi

```json
{ "date": "2026-11-22", "routeId": "HN-TA_XUA-moto", "vehicle": "motorbike", "departVN": "2026-11-22T00:30",
  "segments": [ { "fromKm": 150, "toKm": 203, "hard": 2, "kinds": ["fog", "rain"], "note": "đèo Tà Xùa mù đặc, tầm nhìn ~30 m" } ],
  "overall": 2, "source": "người đi" }
```
`hard` dùng cùng thang với app: 0 dễ đi, 1 cần chú ý, 2 khó đi (phải chậm hẳn), 3 nguy hiểm (phải dừng /
quay đầu / có sạt). Tuyến người đi không thuộc bộ cố định thì ghi toạ độ đầu và cuối thay cho `routeId`.

## 4. Cách chấm (chốt TRƯỚC khi có số)

- Cặp hợp lệ: bản chụp `routes.json` của ngày D cùng tuyến (hoặc tuyến người đi trùng >= 80% km với tuyến
  cố định) VÀ báo cáo của ngày D, giờ đi lệch giờ chụp giả định <= 3 giờ.
- Chấm theo TỪNG LOẠI mối nguy (fog, rain, landslide, wind, cold, ice), không chỉ mức chung: với mỗi loại,
  app "báo" = có cờ loại đó mức >= 2 ở bất kỳ điểm mẫu nào; sự thật "có" = báo cáo có đoạn `hard >= 2`
  gắn loại đó. Ghi bảng BỎ SÓT / BÁO NHẦM theo loại, tách theo nguồn sự thật.
- Ưu tiên của dân phượt: **bỏ sót nguy hiểm tệ hơn báo nhầm**. Một ngưỡng chỉ được nới khi có >= 10 cặp
  của loại đó và số bỏ sót không tăng; giống Luật cổng của engine (AGENTS.md): viết giả thuyết trước, chấm
  luật cũ và mới trên toàn kho, in mọi ca đổi kết luận, ca dùng để nghĩ ra bản sửa không tính là lợi ích.
- Đổi ngưỡng xong: tăng `ROUTE_RULES_VERSION`, ghi `NHAT-KY-HIEU-CHINH.md`.

Chưa có script chấm: viết khi có báo cáo đầu tiên (đọc `data/observations/*-routes.json` và
`data/observations/route-reports.json`), để định dạng báo cáo không bị đoán trước sai.

## 5. Khí hậu theo tháng (19/11/2026, gcc29 vòng 4) - KHÔNG phải phán quyết, không chấm như mục 4
Khối "Khí hậu tháng X dọc đường" (`services/climateService.ts`, tệp `public/climate/monthly-v1.json`) chỉ là số trung bình
ERA5/ERA5-Land 2016-2025 tại các mốc, không có mức "Dễ đi / Khó đi" nên không có gì để chấm đúng sai theo từng chuyến.
Kiểm được sau này: (a) so số ngày mưa >= 50 mm của ERA5 với trạm KTTV gần tuyến nếu có số công khai (dự kiến ERA5 thấp hơn,
nên giao diện ghi "cận dưới"); (b) chỉ báo "ẩm suốt ngày" (RH thấp nhất >= 90%) so với báo cáo sương mù trong bài phượt
có ngày, khi gom đủ >= 20 báo cáo. Chưa làm cả hai; đừng đổi ngưỡng `CTH` trước khi có phép so đó.

## 6. Độ ổn định dự báo tại đích (19/11/2026, gcc29 vòng 5) - chỉ hiển thị, không chấm như mục 4

Mục đích: người tính đi xa 3-5 ngày tới biết dự báo cho ngày đó còn đang đổi hay đã yên. Code `services/stabilityService.ts`,
khối `ForecastStability` trong RouteWeather (thu gọn, chỉ gọi mạng khi mở). Không tham gia điểm, trạng thái hay luật đáng đi.

- Nguồn: Open-Meteo Previous Runs (`previous-runs-api.open-meteo.com`), 4 mô hình ECMWF IFS, GFS, ICON, UKMO.
  `<biến>_previous_dayN` = giá trị dự báo N x 24 giờ TRƯỚC GIỜ HIỆU LỰC (tài liệu Open-Meteo). Đo 19/11 14h, ECMWF
  Tà Xùa 22/11 06h: day0..day3 = 30, 30, 30, 30, day4 = 51, day5 = 56. Cột có N nhỏ hơn số ngày còn lại chỉ chép lần
  chạy mới nhất. Vì vậy với giờ còn L ngày (trần, tối thiểu 0) thì lần chạy "cũ hơn ~1 ngày" = cột L+1, "~2 ngày" = L+2,
  tối đa day7. Test đột biến: đọc nhầm cột day1/day2 thì 2 test đỏ.
- Không dùng được (đo 19/11): `cloud_cover_low/mid` toàn null ở endpoint này; `api.open-meteo.com` trả null cho previous_day.
- Lớp, có nguồn: mưa cả ngày < 1 mm khô (WMO/ETCCDI), 1-20, 20-50, >= 50 mm (`TH.R24_NOTE/R24_HARD`, thang KTTV);
  tổng mây trung bình 05-07h <= 25% (<= 2 okta), 25-75%, >= 75% (>= 6 okta), okta theo WMO.
- Luật gộp, QUY ƯỚC CỦA APP (không có nguồn ngoài, chốt trước khi xem số, không chỉnh theo kết quả): mô hình cần >= 2 lần
  chạy có số; không mô hình nào đổi lớp = "ổn định"; số đổi lớp >= một nửa số mô hình tính được = "đang dao động"; còn lại
  "hơi dao động"; không mô hình nào tính được = "chưa đủ lần chạy". Điểm yếu đã biết: giá trị sát ranh lớp (vd mây 27% với 25%)
  đổi chút ít cũng tính là đổi lớp.
- Kiểm chứng sau này (chưa làm, cần dữ liệu): bản chụp tuyến hằng tối có thể ghi thêm phán quyết ổn định cho đích, rồi so với
  sai số thật của dự báo D+3..D+5 (dự báo mới nhất so với quan trắc/ERA5 khi có). Chỉ khi đó mới biết "đang dao động" có đi
  kèm sai số lớn hơn không.
