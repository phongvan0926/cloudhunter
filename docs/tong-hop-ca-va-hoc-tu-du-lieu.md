# Tổng hợp ca đơn lẻ để sửa engine theo dữ liệu (phiếu g36d5, 23/11/2026)

Câu anh hỏi: báo nhiều ca lẻ mà không sửa engine, sau này có gom lại để tối ưu theo dữ liệu (kiểu machine learning) không?

## Có, và đang gom tự động
Mỗi ca anh báo vào `data/observations/field-reports.json`; nhãn FB vào `fb-auto-reports.json`; vệ tinh mỗi ngày một tệp.
`scripts/calibrate.ts` ghép MỌI nhãn với bản chụp dự báo đã đóng băng TRƯỚC rạng sáng (không dùng số viết đè sau),
rồi đếm đúng/sai theo từng nguồn. Không sửa theo từng ca là vì một ca chỉ cho biết "sai", không cho biết sửa thế nào
mà không làm hỏng ca khác; gom đủ ca cùng kiểu mới thấy quy luật.

## Số đo hôm nay (23/11, calibrate + đếm lại theo trạng thái)
Người đi: 56 cặp, luật đáng đi đúng có 24, BỎ SÓT 22, báo nhầm 2, đúng không 8. Nghĩa là app đang quá DÈ DẶT:
hiếm khi báo nhầm, nhưng bỏ sót gần nửa số ngày có biển mây.
Trong các ca BELOW người đi bị bỏ sót, theo trạng thái app đã báo: **FOG 11**, DISSIPATING 6, RAIN 3, CLEAR 1, ROLLING 1.
FOG 11 ca: Tà Xùa 25/8, 3/10, 4/10, 19/11, 23/11; Hang Kia 1/10; Ô Quy Hồ 16/10; Kỳ Quan San 20/10; Ba Vì 24/10, 31/10; Pha Luông 23/11.
=> Kiểu lỗi lớn nhất đã lộ rõ: cổng FOG (`observerInCloud` / mặt mây mô hình đặt quá cao, ~800 hPa) chặn nhầm ngày có biển mây.

## Vì sao chưa dùng machine learning thật
- 56 nhãn người + 26 nhãn FB là quá ít cho một mô hình học: với vài chục biến đầu vào nó sẽ "học thuộc" các ca
  (overfit), đẹp trên kho cũ, sai trên ngày mới. Vệ tinh có 1876 cặp nhưng mù biển mây thấp dưới mây cao, nên
  học theo vệ tinh là học sai thứ cần đoán.
- Cách đang dùng là bản "ML thủ công có kiểm soát": giả thuyết + phép đo chốt TRƯỚC, chấm luật cũ/mới trên toàn kho,
  không được tăng bỏ sót, agent khí tượng phản biện (Luật cổng trong AGENTS.md). Nó chính là huấn luyện + kiểm định,
  chỉ là mỗi lần đổi một nút, có lý do vật lý, nên không overfit.
- Khi nào học máy có ích: khoảng >= 150 nhãn người/FB (tốc độ hiện tại + bước khám phá FB mới, ước 2-4 tháng).
  Lúc đó cách hợp lý là một lớp HIỆU CHỈNH nhỏ (hồi quy logistic trên vài số engine đã tính: ΔH, đồng thuận, RH mực
  chỗ đứng, gió, mây tầng cao) chạy BÓNG cạnh engine, chấm ngoài mẫu theo thời gian (học tháng cũ, thử tháng mới),
  chỉ bật khi thắng engine trên ngày chưa thấy. Số vẫn do code tính, không giao AI.

## Lịch đợt tổng hợp tiếp theo (chốt trước, không chỉnh theo kết quả)
- **Đợt FOG**: bắt đầu khi có >= 15 ca người đi/FB BELOW mà app báo FOG (23/11: 11), hoặc ngày 15/12/2026, cái nào tới trước.
  Cập nhật 27/11 (phiếu gb324): 12 ca (thêm Tà Xùa 27/11; 26/11 Fansipan là DISSIPATING, không đếm). Hai kiểu con cần đo riêng: mặt mây mô hình cao hơn chỗ đứng vs cổng `observerInCloud` khi mặt mây đã thấp hơn; xem `NHAT-KY-HIEU-CHINH.md` mục 27/11.
  Giả thuyết + phép đo viết vào `NHAT-KY-HIEU-CHINH.md` TRƯỚC khi chấm; ca dùng để nghĩ ra bản sửa không tính là lợi ích.
- Bước khám phá FB (phiếu geb97) sẽ đẩy số nhãn lên nhanh hơn; nhãn đó chấm tách 2 tuần rồi mới gộp.
