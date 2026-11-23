# Thu bằng chứng biển mây hằng ngày trên diện rộng (phiếu gb9be, 23/11/2026)

## Vấn đề (có số)
- Nhãn hằng ngày hiện chỉ đến từ 2 nguồn Facebook cố định (Tà Xùa, Fansipan) + vệ tinh + anh báo tay.
  Calibrate 23/11: 54 cặp người đi, 26 cặp Facebook, 1876 cặp vệ tinh trên 59 điểm.
- Ngày 23/11 có biển mây ở Pa Phách, Best View Sa Pa, Tà Xùa và (theo anh) Hang Kia - Pà Cò, nhưng
  chỉ 2 điểm có nhãn, và nhãn nào cũng phải anh tự đi tìm. Lớp ca khó (cổng FOG, ca bỏ sót) thiếu nhãn
  người nên không đo được (xem kết quả g9214).

## Đã thử 23/11/2026 khoảng 13:00-13:30 (đã đo, mỗi đường một lượt)
| Đường | Kết quả |
| :--- | :--- |
| curl DuckDuckGo HTML | 0 kết quả (bị chặn) |
| curl Bing | 10 kết quả lạc đề (từ điển Cambridge), không dùng được |
| Playwright headless thường -> Google | CAPTCHA "lưu lượng bất thường" ngay lượt đầu |
| WebSearch của Claude (lọc facebook.com) | Chỉ ra trang giới thiệu/video CŨ, không có bài hôm nay. Dùng được để TÌM TRANG NGUỒN, không dùng được để lấy tin trong ngày |
| Ô tìm kiếm Facebook (hồ sơ Cloak quét, lọc "bài mới") | Ra bài mới nhất của cả Facebook bất kể liên quan (tarot, spa...): vô dụng |
| **Google trong hồ sơ Cloak quét (đã đăng nhập)** | **5 truy vấn, 0 CAPTCHA, 7-9 kết quả mỗi truy vấn**, có bài trong ngày: Best View Sa Pa 23/11, Tà Xùa "6h00 ngày 23/11/2026", Fansipan "thời tiết 23/11/2026 ... trời trong", Na Ngoi "sáng nay bồng bềnh mây", nhóm SAPA/Tà Xùa/Mộc Châu review "sáng nay săn mây thành công" |

## Bẫy đã thấy trong lượt thử
- Đoạn trích Google ghép chữ của NHIỀU bài/bình luận khác ngày (một kết quả "Tà Xùa 21-22/11" kèm câu "sáng nay (3/12)").
  "x giờ trước" là lúc Google thấy trang, không chắc là giờ đăng. => Đoạn trích KHÔNG phải nhãn; chỉ là danh sách ứng viên.
- Nhiều kết quả là quảng cáo tour, hỏi đường, rao vặt có chữ "săn mây". Bài quảng cáo có lợi khi nói "có mây".
- Hang Kia - Pà Cò 23/11: 1 truy vấn không ra bài trong ngày nào (chỉ quảng cáo tour, bài cũ). Không có nghĩa là không có mây.

## Đề xuất (chờ anh chọn, xem thẻ hỏi trên Trạm)
Mở rộng bộ thu `cloudhunter-mxh` (đã có: Cloak, bóc bài có giờ đăng thật, gắn nhãn bằng ảnh có dấu giờ, nhập kho bằng `import-fb-auto.ts`), không dựng hệ mới:
1. **Khám phá** (mỗi tối, sau 20:30): 6-8 truy vấn Google trong hồ sơ Cloak quét, nhịp 35-60 giây, dạng
   `site:facebook.com "biển mây" after:<hôm qua>` + tên vùng (Sa Pa, Tà Xùa, Mộc Châu/Pa Phách, Hang Kia, Y Tý, Hà Giang...).
   Ra danh sách ứng viên (url, đoạn trích), khử trùng lặp. Gặp CAPTCHA thì dừng lượt, báo, không thử vòng.
2. **Xác minh**: mở tối đa 15 bài/ngày bằng chính bộ bóc hiện có để lấy giờ đăng thật + ảnh; gắn nhãn bằng
   quy tắc v2 hiện tại (ảnh có dấu giờ là chính, chữ chỉ tham khảo, bài khác ngày bỏ).
3. **Gán điểm**: so chữ với `aliases` của thư viện (`data/spots.json`); không khớp thì vào danh sách "chỗ có biển mây
   nhưng chưa có điểm" để xét thêm điểm theo quy tắc 8 (cần toạ độ xác minh).
4. **Nhập kho như nguồn riêng** (`source: FB_TIM`), chấm TÁCH khỏi FB cố định ít nhất 2 tuần rồi mới gộp vào calibrate;
   ngưỡng độ tin vẫn `FB_MIN_CONFIDENCE`, không chỉnh theo kết quả.
5. Nhánh phụ không rủi ro: dùng các nhóm review cố định (SAPA/Tà Xùa/Mộc Châu "tất tần tật") làm thêm nguồn trong `nguon.json`.

Rủi ro: hồ sơ Cloak quét mở thêm ~15 bài + 6-8 lượt Google/ngày (hiện mở 2 trang/ngày): tăng nguy cơ Facebook/Google
nghi bot. Khoá nick là quyết định của anh (luật chung). Chi phí tiền: 0 (gói Claude sẵn có cho bước gắn nhãn ảnh).

## Quyết định (anh Phong, 23/11/2026, thẻ q4c0b): chọn A
Làm đủ bước khám phá; nếu Facebook đòi đăng nhập thì dùng hồ sơ vẫn quét Facebook (cloak-r02, đã đăng nhập).
Đã dựng `kham_pha.py` trong bộ thu (ngoài repo) ở CHẾ ĐỘ BÓNG, gắn vào lượt 20:30. Lượt thử 23/11 13:30:
8 truy vấn trong hồ sơ Cloak không CAPTCHA, ra 14/23/19/21/23/15/6/23 bài FB; mở 4 bài đều lấy được giờ đăng thật
(06:33-09:56 ngày 23/11) và ảnh chụp màn hình bài. Chưa gắn nhãn, chưa nhập calibrate: xét sau 1 tuần bóng.
