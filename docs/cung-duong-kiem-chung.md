# Kiểm chứng độ khó CUNG ĐƯỜNG (chỗ cắm đo, 19/11/2026, phiếu gcc29 vòng 2)

Ngưỡng độ khó trong `services/routeService.ts` (`TH`: mưa, sương, gió giật, lạnh, băng, sạt lở) lấy từ
nguồn công bố (thang mưa KTTV, Beaufort, ngưỡng tầm nhìn đường bộ...), **chưa có sự thật nào cho
tuyến ở VN**. Luật: KHÔNG chỉnh ngưỡng theo cảm giác hay theo một chuyến đi lẻ. Tài liệu này nói cách
gom sự thật và cách chấm khi đã đủ.

## 1. App đã phán gì (bằng chứng có trước chuyến đi)

`scripts/snapshot-routes.ts`, chạy mỗi tối trong job `snapshot` của `verify-loop.yml` (bước phụ,
lỗi không chặn bản chụp chính), ghi `data/observations/<D>-routes.json`:
- 7 tuyến cố định (Hà Nội - Tà Xùa / Pù Luông / Hang Kia / Ba Vì bằng xe máy, Yên Bái - Phình Hồ xe máy,
  Hà Nội - Sa Pa và Huế - Bạch Mã ô tô). Bộ tuyến chỉ được THÊM, không sửa, để các ngày so được với nhau.
- Giờ đi theo đúng luật nút "Tới nơi trước bình minh" của app: tới nơi = bình minh ước - 30 phút, tốc độ
  trung bình mặc định (xe máy 40, ô tô 50 km/h).
- Mỗi tuyến: máy tìm đường đã dùng (`router`, có `fallbackNote` nếu xe máy phải về tuyến ô tô), km, giờ đi,
  mức chung (`level` 0-3), các mối nguy nặng nhất theo loại (`worst`), và từng điểm mẫu (km, cao độ,
  giờ đi qua, thời tiết mô hình, cờ `hz` như `fog2`, `landslide1`).
- `rulesVersion` = `ROUTE_RULES_VERSION` lúc chụp. Đổi luật thì tăng số, và chỉ so bản chụp cùng bản luật,
  hoặc chấm lại bằng `samples[].wx` đã lưu (dữ liệu thô đủ để chạy lại `assessPoint`).
- Đã có tệp thì không đè. Không chụp bù ngày đã qua (Open-Meteo viết đè quá khứ).

Mở rộng sau (chưa làm): ghi cả các tuyến người dùng tự lập trong app (localStorage, có nút xuất), để có
tuyến thật mà người đi hay chọn.

## 2. Nguồn sự thật đề xuất (thứ bậc giống biển mây: người đi > Facebook > dữ liệu trạm)

1. **Báo cáo chuyến đi của người đi thật** (anh, bạn đi cùng, người dùng): một dòng mỗi chuyến theo mẫu ở
   mục 3. Tốt nhất, vì biết cả "đường KHÔNG khó".
2. **Bài phượt trên Facebook**, dùng lại bộ thu FB sẵn có (cùng nhóm đang gắn nhãn biển mây). Bài review
   chuyến kiểu "đi Tà Xùa hôm qua, đèo mù đặc, đường trơn". Cần thêm bộ gắn nhãn riêng cho tuyến (ngày đi,
   đoạn đường, mưa/sương/trơn/sạt/lạnh, mức "đi bình thường / phải chậm / phải dừng / quay về"), cùng luật
   độ tin chốt trước như `FB_MIN_CONFIDENCE`. Hạn chế: người ta hay đăng khi đường khó, ít khi đăng
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
