> Tách từ AGENTS.md ngày 30/10/2026, nguyên văn.

# Vòng kiểm chứng độ chính xác (3 nguồn sự thật) và nhãn tự động từ Facebook

### 🔁 Vòng kiểm chứng độ chính xác (24/8/2026)

Không được lấy mô hình dự báo ra chấm chính mô hình — ô lưới 9-25km không phân giải nổi
biển mây thung lũng, đó chính là lỗ hổng đã làm app trượt ngày 23/8. Nên app có **ba nguồn
sự thật độc lập**, xếp theo độ tin cậy:

| Nguồn | Tin cậy | Độ phủ | Điểm mù |
| :--- | :--- | :--- | :--- |
| Báo cáo thực địa người dùng (`FieldReportPanel`) | cao nhất | thưa | chỉ có khi có người đi |
| Vệ tinh Himawari-9 (`tools/verify_satellite.py`) | cao | mọi điểm, mỗi ngày | **mù khi có tầng mây cao che phía trên** |
| Mô hình dự báo | — | — | *không dùng làm sự thật* |

**Vệ tinh đo đúng đại lượng engine dự báo.** Sản phẩm NOAA `AHI-L2-FLDK-Clouds/CldTopHght`
(Himawari-9, 2km, 10 phút/lần, S3 công khai không cần khoá) cho **độ cao đỉnh mây**; so với
`observerAlt` là ra ngay "đứng trên biển mây" hay "chìm trong mây". Chiếu toạ độ bằng phép
chiếu địa tĩnh chuẩn (đã kiểm bằng mắt: mũi Hải Nam rơi đúng vào đảo).

Hồng ngoại **chỉ đọc được lớp mây trên cùng** → hôm nào có tầng mây cao (mùa mưa Tây Bắc gần
như ngày nào cũng có) thì tool trả `BLOCKED_ABOVE` và bị **loại khỏi phép chấm**, tuyệt đối
không đoán bừa. Thực đo tháng 8/2026: 10/10 điểm đều `BLOCKED_ABOVE`; kênh này phát huy tác
dụng mùa khô (khoảng tháng 10-4), đúng mùa săn mây chính.

**Nhịp chạy hằng ngày** (mắt xích quan trọng nhất là chụp dự báo TRƯỚC, vì Open-Meteo chỉ
phục vụ lại quá khứ gần — chụp muộn là mất bằng chứng vĩnh viễn):

```bash
npx vite-node scripts/snapshot-forecast.ts                  # ~20h: app dự báo gì cho rạng sáng mai
~/.venvs/ch-verify/bin/python tools/verify_satellite.py $(date +%F)   # ~8h: thực tế ra sao
npx vite-node scripts/calibrate.ts                          # bất cứ lúc nào: chấm điểm chính app
```

`data/observations/` là **kho dữ liệu tích luỹ, phải commit** — mỗi ngày trôi qua mà không
chụp là một ngày không bao giờ lấy lại được.

`scripts/calibrate.ts` in ra tỉ lệ đúng, **số ngày BỎ SÓT** (thực tế có mà app không báo) và
**số ngày BÁO NHẦM**, kèm chi tiết từng ca để biết chỉnh hằng số nào. Bỏ sót nguy hiểm hơn
báo nhầm: người dùng bỏ lỡ chuyến đi đẹp và mất niềm tin vào app.

### 📥 Facebook: từ "không cào" sang nhãn tự động hằng ngày (sửa 19/10/2026)

Mục này trước ghi "vì sao KHÔNG cào Facebook/TikTok". Các lý do khi ấy là thật và vẫn đúng: API tìm
bài công khai đóng từ 2018, CrowdTangle ngừng 14/8/2024, TikTok Research API chỉ cấp cho học thuật.
Nhưng ngày 13/10/2026 anh Phong chốt: rào chặn là vấn đề cần xử lý, không phải lý do dừng. Ngày
18/10 anh tìm được hai người tại chỗ đăng thời tiết gần như mỗi ngày (Tà Xùa: một người làm xe
ôm/tour đăng "thời tiết tà xùa hôm nay: ..." khoảng 07-11h; Fansipan: bài "Thời tiết FSP", nhiều
lần mỗi ngày, ảnh hay có dấu Timemark). Nút ghi tay trong app vẫn giữ nguyên.

**Bộ thu chạy ở máy nhà, NGOÀI repo** (đường dẫn trong sổ tay riêng, không ghi vào repo public):
trình duyệt chỉ đọc, theo nhịp người, hai lần mỗi ngày. Mỗi bài được một lượt Claude gắn nhãn, và
lượt đó **không được xem app dự báo gì**. Sau đó code thuần gộp nhãn theo ngày. Repo chỉ nhận
nhãn: không ảnh, không tên người đăng, không mã bài, không đường dẫn nhóm.

Vì sao nguồn này đáng giá: cùng một chỗ, gần như mỗi ngày, và **nói được cả "ít mây"**. Mẫu âm
tính là thứ video mạng xã hội không bao giờ cho (xem mục "Nguồn của 5 báo cáo này"). Các giới hạn
phải nhớ:
- Người đăng làm dịch vụ, nên chữ có thể thiên lạc quan. Không có bài KHÔNG có nghĩa là không có mây.
- Ảnh có thể là ảnh cũ dùng minh hoạ (bộ gắn nhãn tự nghi điều này ở bài 16/10).
- "Nhiều mây" / "ít mây" không phân biệt mây dưới chân với mây trên trời. Đo 19/10: cùng câu "ít
  mây", bộ gắn nhãn cho BELOW ở ngày 12 và 15/10 nhưng NONE ở ngày 16 và 17/10. Cả bốn ngày đều có
  độ tin ≤ 0,6 nên không được chấm. Đây chính là lý do phải có ngưỡng độ tin.

#### Thứ bậc nguồn và cách chấm

Khi cùng điểm và ngày: **người đi / ảnh có giờ > FB_AUTO > vệ tinh.** Facebook đứng trên vệ tinh
vì ở Tà Xùa vệ tinh mù với sương thung lũng (đã thấy từ 02/09). Lượt đầu đo được: ba ngày Facebook
nói có biển mây dày mà vệ tinh không bị che (27/09, 02/10, 03/10), vệ tinh ghi CLEAR cả ba. Ngày
03/10 người dùng cũng báo có biển mây.

- `scripts/import-fb-auto.ts <nhan-ngay.json>` dựng lại `data/observations/fb-auto-reports.json` (commit
  tệp này) và in bảng đối chiếu với `field-reports.json`, tức độ tin của chính bộ gắn nhãn.
- `calibrate.ts` chỉ chấm nhãn có độ tin ≥ `FB_MIN_CONFIDENCE` = 0,6 (`scripts/fb-auto.ts`), không
  cần người xem, seaLevel rõ. Ngưỡng này **chốt trước khi chấm**, đừng chỉnh cho vừa kết quả.
  `--kem-nhan-yeu` chấm thêm nhãn yếu để so. Luật "đáng đi" được in thêm từng dòng riêng theo nguồn.

**Việc phải làm mỗi lần bộ thu báo có nhãn mới:**
1. Chạy import, đọc bảng đối chiếu. Có dòng `✗ LỆCH` với người nhìn thì dừng lại, ghi vào mục này,
   và xem lại lời nhắc của bộ gắn nhãn trước khi tin tiếp.
2. Chạy calibrate, xem dòng "riêng nguồn facebook" và các ca BỎ SÓT / BÁO NHẦM gắn `[facebook]`.
3. Ngày `needsReview` không tự chọn hộ. Ngày nào quan trọng (app khuyên đi, hoặc có điểm ≥ 65) thì hỏi anh.
4. Commit `fb-auto-reports.json`. Không sửa engine vì một ngày mới, mà làm theo "Luật cổng" ngay dưới.

#### Lượt đầu (19/10/2026): 21 nhãn ngày, 10 nhãn đủ tin

Khớp có/không với báo cáo người nhìn **6/6** (bộ gắn nhãn bỏ trống thêm 2 ngày, Fansipan 15 và 18/10,
vì các bài nói ngược nhau). Có 4 cặp chấm mới (các ngày khác đã có người đi đè, hoặc thuộc ngày bản
chụp đã mất): Tà Xùa 27/09, 02/10 và 08/10 **có biển mây, app không khuyên đi cả ba**; 30/09 "ít mây",
app không khuyên đi, đúng.

Gộp mọi nguồn đủ tin, Tà Xùa có biển mây ở 6 ngày có bản chụp (27/09, 02, 03, 04, 08, 18/10), và
**app khuyên đi đúng 1/6** (18/10). Đây là điểm app trượt có hệ thống.

**Manh mối (CHƯA sửa, vì là sửa lớn):** những ngày trượt đó, ICON/UKMO đặt mặt mây ở đúng
~2.200m (2.167-2.207m vào 27/09, 02/10, 03/10, 15/10, 16/10), nên ΔH ≈ −400m và nhãn ra FOG. Trên
toàn kho, **1.268/5.482 (23%) mặt mây của từng mô hình rơi vào 2.150-2.215m, và 715 (13%) rơi vào
3.540-3.590m.** Nguyên nhân là `estimateCloudTop` tính mặt mây = mực ẩm cuối cùng + 150m (hoặc mực
700hPa + 400m), nên mặt mây bám vào lưới mực áp suất. Chỉ cần RH ≥ 80% ở 800hPa (~2.050m) là engine
coi lớp mây liên tục kéo tới đó, trong khi RH 80% chưa phải mây. Đây là lỗi gốc đã ghi ("dựng mây
trong ngày quang", mục 01-04/10). Nay chuỗi Tà Xùa cho thấy nó còn làm **BỎ SÓT** ngày có biển mây
thật, chứ không chỉ báo nhầm.

#### Quy tắc gắn nhãn v2 (19/10/2026, anh Phong chốt): ảnh có dấu giờ là bằng chứng chính

Bộ thu cũ bỏ sót ảnh của 19 bài đăng dạng lưới, nay đã sửa (12 bài có ảnh trở lại). Quy tắc mới: ảnh
có dấu giờ là chính, chữ người bán tour chỉ để tham khảo, và có dải mây mỏng dưới chân thì ghi BELOW
kèm độ dày. So v1 và v2 với báo cáo người nhìn (`nhan-ngay.v1.json` là bản cũ, nằm ở bộ thu):

```
                 v1                v2                   người nhìn
Fansipan 15/10   bỏ trống 0,4      AT_EYE 0,8 (06:16)   ABOVE ("~06:00 trùm một phần")   ← ranh giới, gần như cùng ý
Fansipan 16/10   không có          ABOVE 0,9 (07:24)    ABOVE 07:25                       ✓
Fansipan 18/10   bỏ trống 0,4      BELOW 0,5 (06:08)    BELOW 06:09                       ✓
Fansipan 19/10   BELOW 0,5         BELOW 0,85 (06:21)   —
Tà Xùa 11/10     NONE 0,45         BELOW MONG 0,5       NONE                              ✗ (cả hai đều cần người xem)
khớp có/không    6/6               6/8
```

**Đọc bảng này cẩn thận: nó KHÔNG phải phép thử độc lập.** Ảnh Timemark Fansipan anh gửi (06:09,
07:09, 08:08, 10:03 ngày 18/10) có đúng những mốc giờ như ảnh trong bài Facebook, nên rất có thể là
cùng một bộ ảnh. Còn báo cáo Tà Xùa 11/10 là anh chép chữ của chính người đăng này. Vậy "khớp" ở đây
chỉ đo hai người đọc cùng một bằng chứng có ra cùng kết luận hay không, chưa đo sự thật.

Kết luận:
- **Fansipan: v2 tốt hơn rõ.** Ảnh có giờ, nhãn cụ thể tới từng phút, độ tin cao. Ngày 19/10 thành ca
  chấm được: BELOW lúc 06:21, độ tin 0,85, trong khi bản chụp ghi `41 DISSIPATING ΔH +447m`, không khuyên đi ⇒ **BỎ SÓT**.
- **Tà Xùa: v2 làm mất lớp âm tính.** Ảnh của người đăng không có giờ và có thể là ảnh cũ dùng lại
  (bộ gắn nhãn tự nghi ở ngày 11 và 16/10). Với quy tắc "có dải mỏng là BELOW", 21/22 ngày thành BELOW.
  Chấm thêm cả nhãn yếu (`--kem-nhan-yeu`) thì nguồn Facebook có 11 cặp, cả 11 đều là ngày CÓ, 0 ngày KHÔNG.
  Nguồn như vậy chỉ đo được bỏ sót, không đo được báo nhầm. Đa số ngày Tà Xùa giờ ở mức 0,5 nên không
  được chấm, đúng như ngưỡng đã định.
- Chấm sau v2 (độ tin ≥ 0,6): 4 cặp Facebook, gồm Tà Xùa 27/09 và 07/10, Fansipan 19/10 bỏ sót, và Tà Xùa
  19/10 khuyên đi đúng (`39 FLUCTUATING ΔH +354m`). **Không sửa thuật toán** từ đợt này. Hướng sửa vẫn
  là `estimateCloudTop` bám lưới mực áp suất, làm theo luật cổng.
- Nhãn 20/10 (bộ thu tự báo): **Fansipan BELOW, độ tin 0,85**, hai ảnh có dấu giờ 08:19 và 09:19 ("trời có nắng, biển mây
  gió nhẹ"). Bản chụp `45/100 DISSIPATING · 33% · mặt mây 3.185m, ΔH −42m · không khuyên đi` ⇒ calibrate chấm **BỎ SÓT**
  (08:19 nằm trong khung 04-09h nên tính là rạng sáng, theo đúng luật đã có). Nhưng vệ tinh 04:30-05:30 đo đỉnh mây
  3.206-3.719m, TRÊN đỉnh 3.143m (FOGGED_IN, độ phát xạ 0,65 nên có thể là mây mỏng tầng trên), và nhãn của app là
  "mây đang tan" với mặt mây ngang đỉnh. Nhiều khả năng lúc rạng sáng đỉnh còn trong mây, tới 08:19 mới tan xuống thành
  biển mây, giống 15/10. Ảnh sau 8h không nói được lúc 5-6h ra sao, nên ca này giữ là bỏ sót trong bảng mà không dùng để
  sửa gì. Tà Xùa 20/10 BELOW lưa thưa, độ tin 0,5, không chấm (app khuyên đi `42 STATIC ΔH +600m`). Nguồn Facebook nay
  5 cặp: 1 đúng · 4 bỏ sót.
- Nhãn 21/10: **Fansipan BELOW mỏng, độ tin 0,85**, ảnh có dấu giờ 05:56-05:58 và 07:37 ("trời quang, gió nhẹ, 9 độ"). Lần
  này ảnh nằm đúng lúc rạng sáng. Bản chụp `69/100 RAIN · 33%` (gfs 69 FOG · icon 73 ROLLING · ukmo 67 RAIN), chia ba kết luận 1-1-1
  nên luật hoà phiếu chọn nhãn nặng nhất. Cả ba mô hình đặt mặt mây ở 3.182-3.194m, chỉ cao hơn chỗ đứng 40-50m ⇒ **BỎ SÓT**. Vệ
  tinh FOGGED_IN (04:30-05:30 đỉnh mây 3.090-3.677m), khung 05:00 thì đỉnh mây dưới chỗ đứng; ảnh người tại chỗ đè.
  **Ba ngày liền Fansipan bỏ sót theo cùng một kiểu** (19/10 `41 DISSIPATING`, 20/10 `45 DISSIPATING ΔH −42m`, 21/10 `69 RAIN ΔH −51m`).
  Mặt mây app tính nằm ngay ngang đỉnh, trong khi thật ra biển mây mỏng nằm dưới chân. Đây là mặt ngược của lỗi bám lưới: ở các
  đỉnh 2.900-3.050m mặt mây bị đặt quá thấp, còn ở Fansipan nó bị kéo lên mực 700hPa (~3.100m) + đệm. Ba ngày này là cùng một
  điểm và cùng một đợt thời tiết, nên chúng là bằng chứng cho bản sửa `estimateCloudTop` theo luật cổng, không phải lý do để
  chỉnh riêng Fansipan. Nguồn Facebook nay 6 cặp: 1 đúng · 5 bỏ sót.
- Nhãn 22/10: **Fansipan KHONG_RO, cần người xem** (không chấm). Ba bài có dấu giờ kể một diễn biến: 07:49 và 08:38 đỉnh còn trong
  sương ("trời sương, gió nhẹ, 12 độ"), 09:38-09:40 nắng, biển mây mỏng bên dưới. Bản chụp `24/100 DISSIPATING · 67% · mặt mây 3.186m,
  ΔH −43m · không khuyên đi` khớp đúng diễn biến đó ("mây đang tan"). Vệ tinh lại ghi SEA_CONFIRMED (04:30-05:30 đỉnh mây 2.857-3.083m,
  dưới chỗ đứng; 06:00 lên 4.137m), nên calibrate đang chấm ngày này là BỎ SÓT theo vệ tinh. Ảnh 07:49 nói ngược vệ tinh, nhưng theo
  luật thì nhãn cần người xem không tự chọn hộ, và app không khuyên đi, điểm dưới 65 nên không thuộc loại phải hỏi anh. Giữ nguyên.
- Nhãn 23/10, cả hai cần người xem (không chấm):
  - **Fansipan KHONG_RO, độ tin 0,2.** Ảnh 07:18-07:19 đỉnh còn trong mây, 10:15 mây ngang tầm mắt; hai bài khác khoe "biển mây"
    nhưng không có ảnh mang giờ. Bản chụp `35/100 DISSIPATING · 100% · không khuyên đi` (ba mô hình đều "mây đang tan"). Vệ tinh lại
    SEA_CONFIRMED, đỉnh mây 2.727-3.001m dưới chỗ đứng. Ngày thứ hai liền ảnh có giờ nói "trong mây lúc 7h" còn vệ tinh nói "biển mây
    dưới chân". Ô 2km nhìn từ trên không tách được lớp mây mỏng ôm đỉnh, giống 02/09. Chưa đủ để đè nhãn vệ tinh bằng nhãn yếu.
  - **Tà Xùa BELOW mỏng, độ tin 0,5**, chỉ có chữ "nắng đẹp + nhiều mây" lúc 10:28, không ảnh có giờ. App KHUYÊN ĐI (`37 FLOWING ·
    67% · ΔH +453m`), vệ tinh CLEAR 5/5 khung không có số. Theo luật, ngày app khuyên đi mà nhãn cần người xem thì hỏi anh, không
    tự chọn.
    **Anh trả lời (25/10):** có biển mây mỏng, kèm ảnh bài của một người làm tour đăng 08:00 "Tà Xùa sáng 23/10, mây sáng nay hơi
    ít": mây trắng lưa thưa trong thung lũng bên dưới. Đã ghi thành báo cáo người nhìn (`SPARSE`, DAWN) ⇒ app khuyên đi **ĐÚNG**, vệ tinh
    CLEAR bị đè. Riêng nguồn người đi nay 31 cặp: 14 đúng · 9 bỏ sót · 1 nhầm.
- Nhãn 24/10: **Fansipan ABOVE, độ tin 0,95** (chấm được). Ba bài có ảnh mang giờ 07:23, 08:24-08:25 và 09:16, cả ba "trời mù, gió mạnh,
  11-14 độ". Bản chụp `37/100 DISSIPATING · 100% · không khuyên đi` ⇒ **ĐÚNG**. Nguồn Facebook nay 7 cặp: 2 đúng · 5 bỏ sót.
  Vệ tinh lại ghi SEA_CONFIRMED (04:30-06:00 đỉnh mây 2.745-2.954m, dưới chỗ đứng); nhãn Facebook đè. **Ba ngày liền (22, 23, 24/10)
  ảnh có giờ thấy đỉnh trong mây mà vệ tinh đo đỉnh mây thấp hơn đỉnh 200-400m.** Trong khi 08-14/10 vệ tinh khớp người nhìn 5/5 ở
  chính đỉnh này. Cách giải thích hợp nhất: một lớp mây mỏng ôm đỉnh, gió mạnh, ô 2km gần như toàn sườn thấp hơn đỉnh nên đỉnh mây
  đo được là của biển mây bên dưới, không thấy cái mũ mây trên chóp. Hệ quả: với Fansipan, nhãn vệ tinh SEA ngày gió mạnh có thể là
  đúng-cho-vùng nhưng sai-cho-chỗ-đứng. Chưa sửa gì trong tool vệ tinh, ghi lại để soi khi làm công cụ so cloudTop với vệ tinh.
- Nhãn 25/10: **Fansipan BELOW, độ tin 0,9**, ảnh có dấu giờ 07:06-07:07 ("Fan lại có biển mây rồi"), bài 08:05 khoe "đứng trên thiên đình".
  Bản chụp `42/100 DISSIPATING · 67% · mặt mây 2.199m, ΔH +944m · không khuyên đi` ⇒ **BỎ SÓT**. ICON và UKMO đặt mặt mây ~2.200m, dưới
  chân gần 1.000m, mà nhãn vẫn là "mây đang tan" (GFS `44 FOG` mặt mây 3.554m). Bản chụp không lưu lý do từng mô hình nên chưa biết cổng nào
  đổi sang DISSIPATING; nghi cổng gió tại chỗ đứng (đã ra nhãn đúng ngày 15/10) nhưng CHƯA kiểm. Vệ tinh CLEAR, 5/5 khung không có số.
  Nguồn Facebook nay 8 cặp: 2 đúng · 6 bỏ sót. Fansipan đã có 5 ca bỏ sót theo Facebook (19, 20, 21, 25/10 và 15/10 trong bảng đối chiếu),
  đủ để khi làm bản sửa `estimateCloudTop` thì in thêm cổng nào ra nhãn ở từng ca. Không chỉnh riêng Fansipan.
- Nhãn 26/10: **Fansipan KHONG_RO, độ tin 0,5, cần người xem** (không chấm). Ảnh có dấu giờ 06:13-06:15, 07:16-07:17 và 08:16-08:17
  đều là biển mây mỏng dưới chân ("trời nắng, có mây, 8 độ"), tới 09:17-09:18 thì "lúc nắng, lúc mù" (mây dâng lên đỉnh, giống 18/10).
  Bộ gắn nhãn hạ độ tin vì trong chữ có một ngày lệch (31/10) và vì bài 09:17 nói ngược. Bản chụp `74/100 FOG · 67% · mặt mây 2.623m,
  ΔH +520m · không khuyên đi` (gfs 57 FOG mặt mây 2.056m · icon 83 FOG 3.189m · ukmo 74 FLOWING 2.215m): lại tự mâu thuẫn, mặt mây gộp
  dưới chân 520m mà nhãn vẫn "chìm trong mây". Vệ tinh CLEAR, khung 06:00 đỉnh mây 2.861m (dưới chỗ đứng). Nếu nhận là BELOW thì là ca
  **BỎ SÓT** thứ 7 của Fansipan theo cùng kiểu. Điểm 74 ≥ 65 nên theo luật phải hỏi anh, không tự chọn (đã đưa vào "Cần anh quyết").
  **Anh trả lời (26/10 tối): để "không rõ".** Giữ nguyên nhãn của bộ gắn nhãn, ngày này không được chấm và không tính là bỏ sót.
- Nhãn 27/10: **Fansipan KHONG_RO, độ tin 0,4, cần người xem** (không chấm). Bài 07:57 khoe "có biển mây" nhưng không có ảnh mang giờ;
  ảnh có dấu giờ 08:06-08:07 và 10:00 đều "trời mù, mưa nhỏ, 12-17 độ", tức đỉnh trong mây. Bản chụp `54/100 RAIN · 67% · mặt mây 3.403m,
  ΔH −260m · không khuyên đi` cùng chiều với ảnh có giờ. Vệ tinh BLOCKED_ABOVE (đỉnh mây 4.842-5.470m). App không khuyên đi, điểm dưới 65
  nên không thuộc loại phải hỏi anh. Giữ nguyên.
- Nhãn 28-29/10 (bộ gắn nhãn chạy bù sau lúc Claude hết hạn mức):
  - **Fansipan 28/10 KHONG_RO, độ tin 0,6, cần người xem** (không chấm). Ảnh có giờ 06:10-06:12 và 09:09-09:10 là BELOW ("nắng đẹp, 5 độ", "nắng, biển mây, 11 độ"),
    nhưng ảnh 07:11 là ABOVE ("có mây và hửng nắng"), diễn biến lúc trong lúc dưới nên bộ gắn nhãn không chốt. Bản chụp `46/100 DISSIPATING · 33% · mặt mây 2.229m,
    ΔH +914m · không khuyên đi`; vệ tinh CLEAR (đỉnh mây 2.824m). Điểm dưới 65 và app không khuyên đi nên không hỏi anh; nếu nhận BELOW thì là thêm một ca bỏ sót.
  - **Fansipan 29/10 BELOW, độ tin 0,85** (ảnh 07:27, 08:23-08:24 "nắng đẹp"), khớp báo cáo người nhìn cùng ngày (✓), nên người nhìn đè và không thêm cặp Facebook mới.
    Bản chụp `36/100 DISSIPATING · 100% · ΔH +916m · không khuyên đi` ⇒ bỏ sót (vệ tinh SEA_CONFIRMED 2.883m dưới chỗ đứng). Cùng kiểu cổng gió Zone B đã ghi ở mục 27-29/10.
  - **Tà Xùa 29/10 BELOW, độ tin 0,4**, chỉ có chữ "nắng đẹp + nhiều mây" 10:49, không ảnh có giờ. Bản chụp `36/100 FOG · 100% · ΔH −424m · không khuyên đi`, vệ tinh CLEAR.
    Không chấm, không hỏi anh (không khuyên đi, điểm < 65). Nguồn Facebook vẫn 8 cặp: 2 đúng · 6 bỏ sót.
- Nhãn 30/10: **Fansipan BELOW mỏng, độ tin 0,85** (chấm được; ảnh có dấu giờ 06:10, "trời nắng đẹp, biển mây"). Bản chụp `30/100 DISSIPATING · 100% · mặt mây 2.263m, ΔH +880m · không khuyên đi` (gfs 30 · icon 24 · ukmo 48, cả ba DISSIPATING, mặt mây 2.237-2.350m) ⇒ **BỎ SÓT**, vệ tinh CLEAR. Lại đúng kiểu cổng gió `Zone B` đã ghi ở mục 27-29/10: mặt mây dưới chân gần 900m mà nhãn vẫn "mây đang tan". Đối chiếu có 3 dòng ✗ LỆCH, đều đã biết (Fansipan 15/10, Tà Xùa 11/10, Tà Xùa 29/10 độ tin 0,4 không chấm). Nguồn Facebook nay 9 cặp: 2 đúng · 7 bỏ sót. Không sửa engine vì ca này, làm cùng đợt cổng gió theo luật cổng (nay Fansipan có >= 6 ca bỏ sót cùng kiểu).
- Nhãn 31/10: **Fansipan ABOVE, độ tin 0,9** (chấm được; ảnh có dấu giờ 06:10 "trời sương mù, 6 độ", sau đó "có lúc hửng nắng, 12 độ"). Bản chụp `30/100 DISSIPATING · 100% · mặt mây 2.219m, ΔH +924m · không khuyên đi` ⇒ **ĐÚNG** (đứng trong mây, app không khuyên đi); vệ tinh SEA_MARGINAL (đỉnh mây 3.122m, sát đỉnh 3.143m), nhãn Facebook đè. Ngày kế sau ca bỏ sót 30/10: cùng nhãn "mây đang tan" nhưng ngày này trúng. **Tà Xùa BELOW mỏng, độ tin 0,75**, chỉ có chữ "nắng đẹp + biển mây" (không giờ), nhưng đã có báo cáo người nhìn của anh cùng ngày (BELOW DAWN) đè nên không thêm cặp mới; app `60 STATIC ΔH +664m` khuyên đi ĐÚNG, vệ tinh CLEAR. Đối chiếu: khớp 10/13, 3 dòng ✗ LỆCH đều đã biết. Nguồn Facebook nay 10 cặp: 3 đúng (1 đúng-có, 2 đúng-không) · 7 bỏ sót. Không sửa engine.
- **Anh báo 29/10 (30/10, kèm 2 ảnh):** Sì Thâu Chải có biển mây dày phẳng (bài đăng 07:47) ⇒ báo cáo người nhìn `BELOW THICK DAWN`. Bản chụp `35/100 ROLLING · 67% · mặt mây 1.705m, ΔH −245m · không khuyên đi` ⇒ **BỎ SÓT**, vệ tinh CLEAR (sương thung lũng hồng ngoại không thấy). Tà Xùa cùng sáng: mây nhiều nhưng bốc cao, khối mây tích ngang và trên tầm mắt, không có biển mây phẳng bên dưới ⇒ `ABOVE`, anh xác nhận chụp trước 09:00 nên tính rạng sáng và chấm: app không khuyên đi ⇒ ĐÚNG; bản chụp `36 FOG ΔH −424m` cùng chiều. Cùng một đợt lạnh, Fansipan và Sì Thâu Chải có biển mây còn Tà Xùa thì mây dâng cao. Riêng nguồn người đi nay 35 cặp: 14 đúng · 12 bỏ sót · 1 nhầm.

