# Nhật ký hiệu chỉnh CloudHunter

Để anh Phong xem lại theo đợt. Mỗi thay đổi đụng tới số liệu, nguồn sự thật hay engine ghi một mục:
làm gì, vì sao, đo được gì trước và sau, có phản biện độc lập không. Luật cổng ở AGENTS.md
("Luật cổng khi tự sửa engine").

| ngày | loại | việc | đo được | phản biện độc lập |
| :--- | :--- | :--- | :--- | :--- |
| 19/10/2026 | nhỏ (nguồn sự thật mới) | Thêm nguồn FB_AUTO: nhập nhãn bài Facebook hằng ngày Tà Xùa + Fansipan; calibrate chấm nhãn độ tin ≥ 0,6, thứ bậc người đi > Facebook > vệ tinh, in số riêng theo nguồn. **Engine không đổi.** | 21 nhãn, 10 đủ tin; khớp người nhìn 6/6. 4 cặp chấm mới: Tà Xùa 27/09, 02/10, 08/10 có biển mây, app bỏ sót cả ba; 30/09 âm tính đúng. Gộp mọi nguồn: Tà Xùa có biển mây 6 ngày có bản chụp, app khuyên đi 1/6. | không cần (không đổi engine) |
| 19/10/2026 (tối) | nhỏ (nhãn v2) | Nhập lại nhãn FB theo quy tắc v2 của bộ thu (ảnh có dấu giờ là chính). So v1/v2 với báo cáo người nhìn. **Engine không đổi.** | Khớp người nhìn: v1 6/6, v2 6/8. Hai ca lệch là Fansipan 15/10 (AT_EYE so với "trùm một phần") và Tà Xùa 11/10 (cần người xem). Phép so không độc lập vì ảnh và chữ cùng nguồn. Fansipan 19/10 v2 BELOW lúc 06:21, app bỏ sót. Tà Xùa: v2 cho 21/22 ngày BELOW, mất lớp âm tính. | không cần |
| 20/10/2026 | nhỏ (công cụ đo) | Chấm theo NGÀY "diện rộng" (≥ 4 điểm có biển mây): giả thuyết A = bản chụp có ≥ 4 đỉnh đáng đi ∧ ≥ 65; B = Sa Pa 05h lặng gió, đêm khô, bão hoà, áp không giảm. Thêm `regional-days.ts` ghi bảng thời tiết vùng mỗi ngày. **Engine và lời khuyên không đổi.** | Trong mẫu: A đúng 3 · sót 4 · nhầm 0; B đúng 3 · sót 4 · nhầm 3. 13/10 và 18/10 là hai kiểu thời tiết khác hẳn (khô trên cao sau đợt lạnh / ẩm gió nam). Ngoài mẫu tính từ 20/10. | không cần (không đổi engine) |
| 29/10/2026 | nhỏ (công cụ đo + thực địa) | Thêm `scripts/audit-cloud-top.ts` đo sai số mặt mây thật (bản chụp × vệ tinh, lọc fill `-999` và khung mây cao trộn vào trung vị); `calibrate.ts` tách mức `≥ 65` theo cao độ `≥ 2.400m` / `< 2.400m`; nhập ảnh Timemark `Fansipan 29/10 07:27` (biển mây dày ~2.880m dưới đỉnh, cờ trên chóp bay ngang theo gió tầng trên nắp nghịch nhiệt); soát nhịp đăng `vecaptreosapa.com` sau 2 tuần (`6/17` ngày -> không dựng job riêng). **Engine không đổi.** | 329 cặp mặt mây thấp / 34 ngày: `(sat - app)` trung vị `+668m` (đỉnh `≥ 2.400m`: `+824m`), `|sai số|` TV `727m`, chỉ `12%` nằm trong `±200m`; 21/22 ngày mặt mây app ghim ở `2.130-2.236m` (khe mù `800->700hPa`); ngày `CLEAR` ở `≥ 2.400m` vẫn dựng `cloudTop` ở `79%` cặp. Nguồn người đi nay 33 cặp: 14 đúng - 11 sót - 1 nhầm. | không cần (không đổi engine) |
| 29/10/2026 | kiểm định cổng (giữ nguyên UI) | Kiểm định đề xuất tách bậc hiển thị `worthGoing && score >= 65` trên toàn kho `1.485` cặp (ngoài mẫu nghiêm ngặt `>= 14/10`, `n = 601`). Quyết định: **CHƯA đưa lên giao diện**, giữ 1 bậc "Đủ điều kiện săn mây" và đưa 3 lỗi gốc vào đợt sửa engine lớn. | Đỉnh `≥ 2.400m`: đúng `85%` (`23 TP - 4 FP`; ngoài mẫu `80%`, `LR+ = 4,70`) vs `19%` của `< 65`. Nhưng `< 2.400m` chỉ `13%` (`4 TP - 28 FP`), đuôi cao `77-80` đúng `0%` (`0 TP - 8 FP`, `7/8` là `PU_LUONG` nổ `13/52` ngày do cộng trùng 3 lần ẩm đáy thung lũng `400m`), vách đá `seasonAdjust` ngày `01/12` (`+8 -> 0`) sẽ xoá `18/27 = 67%` ca TP, và `0%` độ nhạy ở Tà Xùa + đợt lạnh khô `28-29/10`. | **Có** (agent khí tượng núi cao độc lập): chỉ ra cộng trùng 3 lần ẩm bề mặt (`+54` điểm), lệch cao độ đại diện `PU_LUONG` (`1.700m` vs DEM `1.468m`), vách đá mùa `01/12`, bỏ sót hành vi ở `< 65` và lật bậc 3-so-với-6 mô hình -> chọn Lộ trình A (sửa gốc vật lý trước, chưa bật huy hiệu UI). |

## Đợt `estimateCloudTop` (30/10/2026) - GIẢ THUYẾT VIẾT TRƯỚC KHI ĐO

Viết và commit TRƯỚC khi chạy bất kỳ phép đo nào của đợt này (theo bước a của luật cổng). Không thêm biến thể nào sau khi đã thấy kết quả.

**Vấn đề đã đo (29/10, `scripts/audit-cloud-top.ts`, 329 cặp):** vệ tinh đo mặt mây cao hơn app trung vị +668m, chỉ 12% số ca nằm trong ±200m. Ở 21/22 ngày, mặt mây app ghim vào 2.130-2.236m (mực 800hPa + 150m). Ngược lại, ở 239 cặp đỉnh ≥ 2.400m mà vệ tinh quang cả 5 khung, engine vẫn dựng mặt mây ở 79% số ca.

**Hai nguyên nhân giả định, hai thay đổi, thiết kế giai thừa 2×2 (chỉ 4 biến thể, không thêm):**
- **V0:** engine-2.8.3 hiện tại (đối chứng).
- **V1 "nội suy giao điểm":** khi lớp mây liên tục kết thúc ở mực L_i mà mực kế tiếp L_(i+1) không có mây và hai mực cách nhau ≤ 1.300m (`LEVEL_GAP_INTERP_MAX`, tức khe 800↔700hPa của GFS/ICON/UKMO), mặt mây = độ cao nơi RH nội suy tuyến tính cắt ngưỡng RH, thay cho "L_i + 150m". Mô hình không có mực 800 (khe 1.640m) giữ nguyên hành vi cũ. Lý do vật lý: mực quan trắc chỉ cho biết mây đến ÍT NHẤT đó, mặt mây thật nằm giữa hai mực.
- **V2a "ngưỡng RH thống nhất":** ngưỡng "có mây" theo RH trong `estimateCloudTop` đổi 80% → 90%, đúng bằng ngưỡng engine đã dùng ở `observerInCloud`. Lý do: một cột đã dùng hai tiêu chuẩn "mây" khác nhau; RH 80% trung bình ô lưới chưa phải mây. Đây là thống nhất nội bộ, không phải số chỉnh theo kết quả.
- **V2 = V1 + V2a.**

**Dự đoán (có thể bị bác bỏ):**
- H1: V1 làm sai số mặt mây vệ tinh-app ở đỉnh ≥ 2.400m giảm (trung vị |sai số| giảm ≥ 25%).
- H2: V2a giảm số lần dựng mặt mây ở ngày vệ tinh CLEAR ở đỉnh ≥ 2.400m. Cái giá chưa biết; sẽ báo đủ.
- H3 (đối chứng): Tà Xùa (1.800m) KHÔNG được V1 cứu, vì lỗi ở đó là mặt mây quá CAO (ẩm ≥ 80% cả cột), V1 chỉ chỉnh phía trên lớp mây. Nếu V2a cứu Tà Xùa thì đó mới là bằng chứng cho nguyên nhân ngưỡng ẩm.

**Dữ liệu và cách chấm:** tính lại bằng dữ liệu Open-Meteo hôm nay cho mọi (điểm × ngày) đã có sự thật (`replay`), CÙNG một mẻ cho cả 4 biến thể. Đây KHÔNG phải thứ app đã thấy hôm đó (API viết đè quá khứ), chỉ dùng để so các luật. Sự thật: người đi > Facebook (độ tin ≥ 0,6) > vệ tinh, đúng như `calibrate.ts`.

**Quy tắc quyết định (chốt trước):**
1. Điều kiện cứng: BỎ SÓT trên các ca người đi + Facebook (luật "đáng đi" tính lại) KHÔNG được tăng so với V0.
2. Điều kiện cần cho H1: trung vị |sai số mặt mây| ở đỉnh ≥ 2.400m giảm ≥ 25%, và không xấu đi ở điểm < 2.400m.
3. Báo nhầm tăng thì nêu rõ đổi lấy gì. Ca dùng để nghĩ ra bản sửa (Fansipan 25-29/10, Tà Xùa 04/10) không được tính là lợi ích.
4. Số tách riêng: đỉnh ≥ 2.400m / < 2.400m, Ba Vì tách hẳn (núi thấp đứng lẻ), Tà Xùa và Fansipan riêng.
5. Mọi ca đổi kết luận liệt kê theo cả hai chiều rồi đưa agent khí tượng độc lập phản biện. Không đạt điều kiện 1 thì KHÔNG đổi engine, chỉ ghi kết quả.
