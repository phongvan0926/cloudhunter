# 🤖 AGENTS.md — CloudHunter AI System Architecture & AI Developer Guidelines

Tài liệu kiến trúc + quy tắc phát triển cho AI assistant (Claude, Gemini, Cursor...) tiếp tục
maintain **CloudHunter AI** — app dự báo biển mây cho núi cao Việt Nam.

> **Bản v5 (2026-08): tái kiến trúc lớn.** AI không còn tính điểm; mọi con số do
> `services/cloudScoreEngine.ts` tính deterministic. Dữ liệu giả (synthetic weather,
> consensus cứng 94%, tọa độ GPX bịa, fallback Y Tý ngầm) đã bị loại bỏ toàn bộ.
> **Engine 2.0 (18/8/2026):** profile 7 mực áp suất với geopotential THẬT, cloud cover
> từng tầng, boundary layer height đêm, mực đóng băng — xem mục Vật lý.
> **19/8/2026: 6 mô hình** — thêm JMA, UKMO 10km (lưới mịn nhất miễn phí, đủ 7 mực),
> ECMWF AIFS (model AI, id phải là `ecmwf_aifs025_single` — `ecmwf_aifs025` trả toàn null).
> KMA không phủ VN; CMA có trường mây không đáng tin (đã kiểm chứng) — KHÔNG dùng.

---

## 📌 Triết lý bắt buộc

1. **Con số = code, tư vấn = AI.** Điểm số, trạng thái, LCL, mặt mây, ΔH, FSI, VRII... đều
   tính trong engine TypeScript thuần (test được, tái lập được). Gemini CHỈ viết lời bình
   từ kết quả engine và bị cấm sửa/bịa số (xem `NARRATIVE_SYSTEM` trong geminiService).
2. **Không bao giờ bịa dữ liệu.** Ngày ngoài phạm vi dự báo → `data_quality: NO_DATA`,
   trạng thái UNKNOWN, chỉ số N/A. "Fail-safe" nghĩa là app không crash và nói thật
   "chưa có dữ liệu" — KHÔNG phải sinh số giả. (Quy tắc này thay thế "Rule 2" cũ.)
3. **Mọi nguồn dữ liệu phải dán nhãn.** Địa danh: DB / GEOCODE / AI-ước-tính. Địa hình:
   HARDCODED / DEM. Từng ngày: FORECAST / UNCERTAIN / NO_DATA. Đồng thuận mô hình:
   tính thật từ dữ liệu từng mô hình, không có giá trị mặc định.

## 🔬 Vật lý biển mây (ràng buộc khi sửa engine)

### ⚠️ engine-2.2 (23/8/2026) — hiệu chỉnh sau ca kiểm chứng thật đầu tiên

Người dùng báo **Tà Xùa (Bắc Yên, Sơn La) có biển mây CẢ NGÀY 23/8/2026**, app trả về
`0/100 · RAIN · "hoãn kế hoạch săn mây"`. Mổ xẻ ra **năm** lỗi độc lập, mỗi lỗi nay có test khóa:

1. **Toạ độ sai 16km** — `TA_XUA_SON_LA` ghi `21.2655,104.2800` (DEM 324m) trong khi khu du
   lịch ở `21.2796,104.4326` (DEM 1.556m). Rà cả thư viện: **28/56 điểm sai >300m**. Xem
   `scripts/audit-coords.ts` + test ảnh chụp DEM.
2. **`cloud_cover_low` KHÔNG đủ để dò biển mây Việt Nam.** Ô lưới 9–25km của mô hình toàn cầu
   không phân giải nổi lớp sương dày 300–800m trong thung lũng hẹp. Hôm đó phân tích cho
   RH 96–99%, T−Td 0,2–0,5°C (**đã bão hoà**) mà `cloud_cover_low` chỉ 0–55%.
   → thêm `valleySaturation()`; engine lấy **max(tín hiệu mây thấp, tín hiệu bão hoà)**.
3. **Phạt hai lần cùng một cơ chế.** "Mây cao ban đêm ≥60% → −15" chỉ là *biến thay thế* để
   đoán "sẽ không có nghịch nhiệt". Hôm đó mây cao 100% mà nghịch nhiệt vẫn +4,6°C và lớp biên
   đêm 20m → phỏng đoán đã sai, không được trừ tiếp. Nay chỉ trừ −5 khi nghịch nhiệt đã hiện diện.
4. **Mưa bị coi là bằng chứng CHỐNG biển mây.** Ở mùa mưa Tây Bắc thì ngược lại: mưa nạp ẩm
   cho thung lũng, tạnh trước bình minh là kịch bản *"biển mây sau mưa"* kinh điển. Nay:
   phạt theo **cường độ mm/h** thay vì ngưỡng cứng, giảm còn 40% khi có "chữ ký biển mây",
   mưa đêm tạnh trước sáng chỉ −3, và **`RAIN` không còn xoá kết luận biển mây** — nhưng
   cảnh báo mưa thì bám vào **lượng mưa thật**, không bám vào trạng thái (không được nuốt cảnh báo).
5. **Chọn sai tầng gió.** Nắp nghịch nhiệt sinh ra chính là để **chặn xáo trộn thẳng đứng**;
   khi mặt biển mây nằm hẳn dưới nắp thì gió 850hPa (~1.500m) thổi ở tầng *bên trên*, không
   với xuống lớp mây. Hôm đó gió 850 = 22km/h (bị chấm "phá vỡ biển mây") còn gió 925 trong
   lớp mây chỉ 3–9km/h. Nay engine tự chọn **925hPa khi biển mây bị nhốt**, 850hPa khi không.
   Thang gió Zone A cũng nới `10/15/20` → `12/18/26` km/h.

**Chữ ký biển mây** (`seaSignature`) = thung lũng bão hoà **+** có nắp nghịch nhiệt (hoặc lớp
biên đêm ≤300m) **+** người đứng cao hơn đáy mây ≥300m. Khi đủ ba, các hình phạt *gián tiếp*
không được phép xoá kết luận — chúng chỉ còn nói "đi có sướng không".

> ⚠️ Thang gió Zone A và hệ số giảm phạt mưa hiện dựa trên **một** ngày kiểm chứng thật.
> Có thêm báo cáo thực địa thì phải hiệu chuẩn lại, đừng coi là hằng số thiêng.

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

### 🧭 Luật cổng khi tự sửa engine (anh Phong uỷ quyền 18/10/2026)

Lời anh, nguyên văn: *"Phiên CloudHunter có quyền sửa, nhưng nói họ kiểm tra thật kỹ và nếu cần gọi
agent độc lập về chuyên ngành này kiểm định lại 1 lần trước khi sửa lớn, còn tinh chỉnh nhỏ theo dữ
liệu thực tế cung cấp thì k quá cần. tôi chỉ cần review lại theo 1 thời gian, tôi không phải chuyên
gia thời tiết nên hãy chọn cách nào mà có sự chính xác tự quyết tốt nhất và sát thực tế nhất"*

1. **Tinh chỉnh nhỏ** (nhập dữ liệu, công cụ đo, chữ hiển thị, hằng số phụ không quyết định lời
   khuyên): tự làm. Vẫn chấm trên toàn kho nếu có đụng tới số, và ghi vào `NHAT-KY-HIEU-CHINH.md`.
2. **Sửa lớn** gồm: đổi cấu trúc engine (`estimateCloudTop`, `combineModels`, các cổng trạng thái),
   đổi ngưỡng lõi (luật "đáng đi", biên ΔH, `observerInCloud`, thang gió), đổi trọng số chính của
   điểm, hoặc trọng số hoá mô hình. Bắt buộc theo thứ tự:
   a. Viết giả thuyết và phép đo TRƯỚC khi nhìn kết quả.
   b. Chấm luật cũ và luật mới trên **toàn kho bản chụp, cùng một mẻ dữ liệu**, tách theo nguồn sự
      thật. In danh sách mọi ca đổi kết luận, theo cả hai chiều.
   c. **Không được làm tăng BỎ SÓT** trên các ca người đi + Facebook. Nếu báo nhầm tăng thì phải nêu
      rõ đổi lấy gì. Ca dùng để nghĩ ra bản sửa không được tính là lợi ích của nó.
   d. Gọi **một agent độc lập** đóng vai chuyên gia khí tượng / vi khí hậu vùng núi để phản biện một
      lần. Đưa cho agent đó giả thuyết, số đo và danh sách ca đổi, nhưng không đưa kết luận mình mong
      muốn. Ghi lại từng ý phản biện và cách đã xử lý ý đó.
   e. Đổi `ENGINE_VERSION`, cập nhật AGENTS.md/README, rồi ghi một mục vào `NHAT-KY-HIEU-CHINH.md`
      để anh xem lại theo đợt.
3. **Không bao giờ:** chụp bù bản chụp, sửa nhãn sự thật cho vừa app, chỉnh `FB_MIN_CONFIDENCE` hay
   ngưỡng nào khác theo kết quả chấm.

### ⚠️ engine-2.3 (24/8/2026) — ca kiểm chứng thứ hai, cùng một điểm

Tà Xùa **lại** có biển mây sáng 24/8 (ngày thứ hai liên tiếp), app trả `22/100 · FOG`.
Lần này phân tích best_match cho thấy **đêm mưa 21mm và sáng vẫn mưa ~2mm/h** trong khi
thung lũng bão hoà liên tục (RH 96-98%, T−Td 0,3-0,6°C). Tức là **mưa dầm và biển mây cùng
tồn tại** — không phải ngoại lệ, mà là kiểu thời tiết đặc trưng của mùa mưa Tây Bắc.

Ba lỗi nữa, đều có test khoá:

1. **`deepOvercast` đè lên ΔH đã biết.** Quy tắc "RH700 ≥85% + mây tầng giữa ≥70% ⇒ FOG"
   chạy TRƯỚC cả nhánh ΔH, nên GFS tính được mặt mây 1.582m < chỗ đứng 1.600m (đúng thực tế)
   vẫn bị đổi thành "Mù trùm — bạn chìm trong mây". Mây tầng giữa ở 3.000m không đặt người
   đứng 1.600m vào trong mây. Nay `deepOvercast` chỉ còn dùng khi **chưa** tính được đỉnh mây.

2. **Mặt mây không bị kẹp bởi nắp nghịch nhiệt.** Trời mưa ⇒ RH ≥80% liên tục từ thung lũng
   lên 700hPa ⇒ "lớp mây liên tục" chạy suốt cột ⇒ **5/6 mô hình đều ra đỉnh mây 3.499m**.
   Nhưng mây thấp *không vươn qua nắp được* — đó là định nghĩa của nắp. Nay `estimateCloudTop`
   kẹp trần về `inv.height` khi ước lượng vượt nắp **hơn 300m** (vượt ít là phần đệm bình
   thường của phép ước lượng; vượt cả cây số là đã gộp nhầm một tầng mây khác vào lớp thấp).

3. **Phạt chồng phạt.** Mưa đêm kéo sang sáng vẫn bị −15 dù có chữ ký biển mây (nay −6), và
   hiệu chỉnh mùa hè −12 vẫn cộng dồn (nay giảm nửa khi có chữ ký). Hiệu chỉnh mùa là
   **tiên nghiệm khí hậu**; khi các trường của mô hình đã cho thấy tận mắt chữ ký biển mây thì
   bằng chứng cụ thể đã thay thế tiên nghiệm — trừ tiếp là đếm hai lần. *Chỉ giảm phạt,
   không bao giờ tăng thưởng.*

**Sau sửa**: GFS cho `65/100 · FLUCTUATING` — vượt ngưỡng đáng đi, đúng thực tế.
Bản gộp vẫn thấp vì **các mô hình bất đồng tận gốc** (đồng thuận 33-50%): chỉ GFS phân giải
được lớp mây nông, ICON/UKMO/JMA/ECMWF đặt mặt mây lên trên đầu người đứng. **Đây là giới hạn
của dữ liệu, không phải của công thức** — không quy tắc gộp nào cứu được nếu đa số sai.

### ⚠️ engine-2.4 (25/8/2026) — ca kiểm chứng thứ ba, ĐIỂM MỚI: Thảo nguyên Suôi Thầu

Người dùng báo biển mây ở Suôi Thầu (Xín Mần) và đưa plus code `MCJQ+7R` — điểm này **chưa
hề có trong thư viện**. Giải mã ra `22.68069, 104.43956`, DEM 1.199m (khớp con số 1.200m thường
được ghi cho thảo nguyên này), đáy thung lũng sông Chảy 274m. Hindcast engine-2.3: `12/100 · RAIN`.

Ca này khác hẳn hai ca Tà Xùa: **các mô hình không hề bất đồng**. Cả GFS, ICON và UKMO đều cho
RH 80-85% **liên tục từ 250m lên 948m rồi rớt xuống 64-72% tại 1.441m** — tức chính chúng đang
mô tả một lớp ẩm dày ~700m nằm gọn DƯỚI chỗ đứng 1.200m. Engine không bao giờ đọc tới đó.

Bốn lỗi, mỗi lỗi đều có SỐ ĐO đi kèm chứ không chỉ lý lẽ:

1. **Lỗi câm: `relative_humidity_2m` được ĐỌC nhưng chưa bao giờ được FETCH.**
   `valleySaturation` đọc `rh2m_valley_night`, nhưng biến không có trong `HOURLY_VARS` → luôn
   `NaN` → nhánh "ẩm sát đất ban đêm ≥92%" **chưa từng chạy một lần nào** trong thực tế.
   80 test vẫn xanh vì fixture gán thẳng số, không đi qua tầng fetch. Nay có
   `scripts/audit-vars.ts` đối chiếu HAI CHIỀU + một test làm điều tương tự.
   *Bài học: test đơn vị không bảo vệ được ranh giới giữa "cái ta gọi API xin" và "cái ta đọc".*

2. **Cổng vào bỏ qua chính profile tầng mà engine tin ở mọi chỗ khác.** `estimateCloudTop`
   chỉ hỏi `cloud_cover_low` (0%) và T−Td tại 2m rồi trả `null` ⇒ trạng thái `CLEAR`. Nghịch lý
   lộ liễu: cùng lúc ấy engine vẫn cộng +18 nghịch nhiệt mạnh và +12 "thung lũng cận bão hoà" —
   cộng điểm cho nguyên liệu rồi kết luận không có mây. Nay có bộ dò thứ ba `rootedLowLayer`:
   lớp mây/ẩm liên tục **bắt đầu sát đáy thung lũng**. Điều kiện "bám gốc" là then chốt — lớp ẩm
   ở 3.110m (ICON hôm đó RH 94%) là mây tầng cao, không phải biển mây.

   *Đã đo trước khi giữ (50 điểm × 3 mô hình):* cổng cũ bật 64%, cổng mới 80% → cứu thêm 16%,
   trong đó 18/24 ca người đứng cao hơn mặt mây. Trên bảng xếp hạng thật ngày 25/8: **6/50 → 19/50**
   điểm có trạng thái nhóm CÓ MÂY, còn **điểm số thì GIẢM** (cao nhất 50 → 43). Đây là dấu hiệu
   tốt: sửa làm engine *nhìn thấy* mây nhiều hơn chứ không *lạc quan* hơn.

3. **RH xác nhận đo sai tầng.** Mực xác nhận chọn theo độ cao ĐÁY THUNG LŨNG: đáy <900m ⇒ luôn
   dùng 925hPa ≈ 760m. Suôi Thầu đáy 274m, đáy mây ~440m, lớp sương chỉ dày tới ~950m — đo RH ở
   760m là đo gần ĐỈNH lớp mây; với thung lũng nông hơn thì đo hẳn không khí BÊN TRÊN nó. Điều
   kiện ấy vì thế **chỉ có thể bác bỏ, không bao giờ khẳng định được**. Nay `seaLayerRH` lấy mực
   có geopotential thật gần `đáy mây + 100m`.

4. **`boundary_layer_height` tạo thiên vị GIỮA CÁC MÔ HÌNH.** Thưởng +8 khi BLH ≤200m. Nhưng đo
   trên toàn thư viện: **46/50 ca của GFS có BLH ≤200m (trung vị 15m), còn ICON/UKMO không có biến
   này ở ca nào**. Phần thưởng ấy không phân biệt ngày tốt với ngày xấu — nó chỉ nâng GFS lên 8
   điểm trong hầu hết mọi so sánh. Mà chính bảng "mô hình nào đúng hơn" là thứ app dùng để tự hiệu
   chuẩn ⇒ thiên vị ăn thẳng vào vòng học. Đã bỏ phần thưởng (giữ phần phạt BLH ≥1200m vì nó hiếm:
   0/50 ca, nên khi bật thì thực sự có nghĩa), và bỏ luôn BLH khỏi `seaSignature` / `inversionObserved`.

   **Hệ quả phải nói thẳng:** bảng `gfs 5/5 · icon 1/5 · ukmo 1/5` báo cáo ngày 24/8 **có phần là
   sản phẩm của thiên vị này**, không thuần tuý là GFS giỏi hơn. `calibrate.ts` nay tự in cảnh báo đó.

**Kết quả (hindcast — xem `data/observations/hindcast-engine-2.4.json`):**

| ngày | điểm | engine ghi nhận lúc đó | engine-2.4 |
|---|---|---|---|
| 23/8 | Tà Xùa | 27 · DISSIPATING | 35 · FOG (4/6 mô hình đặt mặt mây dưới chỗ đứng, 2 vẫn trên) |
| 24/8 | Tà Xùa | 25 · RAIN | 23 · RAIN — **vẫn bỏ sót** |
| 25/8 | Suôi Thầu | 12 · RAIN | **24 · FLUCTUATING** — trạng thái ĐÚNG |

⚠️ **Ba dòng trên KHÔNG phải bằng chứng engine-2.4 tốt hơn** — đó là chấm lại chính những ca đã
dùng để sửa engine. engine-2.4 hiện có **đúng 0 ngày kiểm chứng độc lập**.

⚠️ Bỏ +8 của GFS khiến Tà Xùa 24/8 tụt từ 65 (engine-2.3) xuống 51. Giữ lại phần thưởng đó để
"cứu" một ca chính là kiểu chiều dữ liệu mà tài liệu này cấm — thiên vị đo được thì phải bỏ, kể
cả khi bỏ xong bảng điểm nhìn xấu đi.

### ⚠️ engine-2.5 (25/8/2026) — ca thứ tư: Tà Xùa, ngày thứ BA liên tiếp

Bản chụp engine-2.2 (làm từ 24/8) ghi `34/100 · FOG`, hạng 8/49. Thực tế có biển mây.

**Lỗi: đếm phiếu theo NHÃN thay vì theo KẾT LUẬN.** Hôm đó 6 mô hình cho mặt mây
1.444 · 1.087 · 1.966 · 3.509 · 1.097 · 1.448m so với chỗ đứng 1.600m — tức **4/6 nói bạn
đứng TRÊN biển mây**, 2/6 nói chìm trong mây. Đa số 4-2. Nhưng bốn mô hình đó chia nhau hai
nhãn (`STATIC` ×2 khi ΔH > 250m, `FLUCTUATING` ×2 khi ΔH nhỏ hơn), nên đếm phiếu theo nhãn
ra **hoà ba bên 2-2-2**, và luật "hoà thì lấy nhãn nặng hơn" trao chiến thắng cho `FOG` với
đúng 2 phiếu. App kết luận "Mù trùm — bạn chìm trong mây" trong khi **chính nó tính mặt mây
trung vị 1.446m, thấp hơn chỗ đứng 154m**. Tự mâu thuẫn ngay trong một màn hình.

Gốc rễ: `STATIC / FLOWING / FLUCTUATING / ROLLING` **không phải bốn ý kiến khác nhau** — cả
bốn nói cùng một điều ("mặt mây dưới chân bạn"), chỉ khác khoảng hở và gió. Chúng không được
cạnh tranh phiếu với `FOG` như thể là giả thuyết đối lập.

`combineModels` nay bỏ phiếu **hai bước**: (1) chọn KẾT LUẬN (`SEA` / `IN_CLOUD` /
`NO_CLOUD` / `BLOCKED`), (2) trong nhóm thắng mới chọn nhãn chi tiết. Hoà phiếu **giữa các
kết luận** vẫn nghiêng về phía xấu hơn (thà khuyên ở nhà nhầm còn hơn bắt người ta dậy 3h
sáng) — chỉ bỏ đúng phần "đa số bị chia phiếu nội bộ nên thua oan". `agreement` nay báo theo
kết luận (67%) thay vì theo nhãn (33%), và `cloudTop` lấy trung vị **trong nhóm thắng** chứ
không trộn đỉnh mây của nhóm bất đồng.

*Đã đo trước khi giữ* (`scripts/ab-combine.ts`, 50 điểm × 3 mô hình, cùng một lần lấy dữ
liệu chấm bằng cả hai luật): kết luận CÓ biển mây **14/50 → 17/50**, chỉ **3/50 điểm đổi
nhãn** — cả ba đều đúng kiểu "2 mô hình SEA vs 1 mô hình khác". Không phải cửa xả.

### ⚠️ engine-2.6 (27/8/2026) — ca thứ NĂM: "độ cao nghịch nhiệt" là trần cửa sổ quét

Người dùng báo biển mây đẹp ở Tà Xùa trong khi đồng bằng bên dưới mưa dầm nhiều ngày.
Engine-2.5 chấm **5/100 · RAIN — "hoãn kế hoạch săn mây"**. Cú trượt nặng nhất từ trước tới
nay, và là báo cáo thực địa thứ 5 liên tiếp app dự báo sai (**0/5**).

**Lỗi: `computeInversion` trả về "độ cao nghịch nhiệt" mà 94% số ca chỉ là mép trên của cửa
sổ quét.** anomaly được đo so với suy giảm chuẩn 6,5°C/km **tính từ đáy thung lũng**, nên nó
**cộng dồn theo độ cao**. Trong cột khí ẩm mùa mưa (suy giảm thực ~5°C/km suốt cột) anomaly
tăng đơn điệu, và "tầng anomaly cực đại" **luôn** rơi vào mực cao nhất trong cửa sổ — dù
chẳng có nắp nào. Đo thật (`scripts/inversion-probe.ts`, 50 điểm × 3 mô hình × 4 ngày = 120 ca):

```
inv.height ĐÚNG BẰNG mực cao nhất trong cửa sổ quét   113/120  (94%)
được chấm Strong/Moderate                             103/120  (86%)
  … trong đó height nằm ở mực cao nhất                 97/103  (94%)
đối chứng: có tầng ổn định cục bộ Γ ≤ 3,5°C/km          54/120  (45%)
  … trong đó nắp nằm DƯỚI chỗ đứng                      39/54   (72%)
```

Hai hệ quả, đều nghiêm trọng: `capByInversion` kẹp mặt biển mây **ở sai độ cao**, và điều
kiện "có nghịch nhiệt" của `seaSignature` **bật gần như luôn luôn** (86%) nên gần như không
mang thông tin. Ngày 27/8 GFS bị kẹp ở 1.973m trong khi tầng ổn định thật nằm ở 951→1.449m
(Γ = 2,4°C/km, ổn định hơn hẳn đoạn nhiệt ẩm ~5) — tức mặt biển mây ở **951m, dưới chỗ đứng
1.600m**. Đúng như người dùng nhìn thấy.

Sửa: tách hẳn hai đại lượng vốn bị gộp làm một.

| | ý nghĩa | dùng để |
|---|---|---|
| `anomaly` / `strength` | cả cột khí ổn định hơn chuẩn bao nhiêu — có thật, nhưng **không có địa chỉ** | chấm điểm (giữ nguyên) |
| `anomalyHeight` | mực anomaly cực đại | **chỉ chẩn đoán** |
| `ramp` | anomaly chỉ tăng đều tới mép cửa sổ → **không có đỉnh thật** | chọn cách tìm nắp |
| `height` | ĐÁY NẮP đáng tin, `null` khi không xác định được | kẹp mặt mây, `seaCapped` |

Khi `ramp = false` (có đỉnh thật, tầng trên lạnh/khô hẳn) thì vẫn dùng đỉnh anomaly như cũ.
Khi `ramp = true` thì chuyển sang `capLayerBase()` — mực thấp nhất từ đáy mây trở lên mà ngay
phía trên nó Γ ≤ 3,5°C/km. **Không tìm thấy thì trả `null`, KHÔNG bịa số.** Cần ≥3 mực mới
kết luận được là "dốc": với 1-2 mực thì tăng đơn điệu là chuyện đương nhiên, không phải bằng chứng.

*Đã đo trước khi giữ* (`dump-rank.ts` + `diff-rank.ts`, 50 điểm × 3 ngày = 150 cặp):

```
đổi NHÃN         7/150  (5%)
đổi KẾT LUẬN     6/150  (4%)
"có biển mây"   46 → 48
điểm             tăng 11 · giảm 2 · trung bình +0,9
```

Quan trọng hơn con số tổng: **thay đổi đi CẢ HAI CHIỀU** — Putaleng và Tây Côn Lĩnh
`FLOWING → RAIN`, Linh Quy Pháp Ấn `DISSIPATING → RAIN`. Một sửa đổi chỉ-nới-lỏng thì không
bao giờ làm ngày nào xấu đi; cái này có, nên nó là **thay đổi về khả năng nhìn**, không phải
bơm lạc quan. Và trên ngày kiểm chứng thật 24/8 — ngày lần này KHÔNG hề dùng để chỉnh —
Tà Xùa đi từ `5/100 RAIN` lên `43/100 STATIC`.

⚠️ **Nhưng 27/8 VẪN trượt, và đây mới là điều đáng nói.** Mặt cắt áp suất hôm đó:

```
GFS   258m:rh92  481m:rh92  712m:rh92  951m:rh90  1449m:rh85  1973m:rh86  3108m:rh93
ICON  255m:rh90  479m:rh90  711m:rh90  950m:rh87  1448m:rh90  1972m:rh91  3107m:rh86
UKMO  253m:rh81  484m:rh81  719m:rh81  960m:rh93  1458m:rh95  1980m:rh95  3113m:rh94
```

**RH 81-95% liên tục từ 250m lên 3.100m trong cả 6 mô hình.** Chỉ GFS có một tầng ổn định
cục bộ đủ rõ; 5 mô hình còn lại cho cột khí suy giảm đều ~5°C/km — không có nắp nào để tìm.
Với dữ liệu đó, "biển mây đỉnh 1.400m dưới sống lưng khủng long" và "cả sống lưng chìm trong
mây" là **hai hiện thực khác nhau ứng với cùng một cột số liệu**. Ô lưới 25km làm phẳng địa
hình Tà Xùa xuống còn ~1.000m; mô hình toàn cầu không có cách nào phân giải chuyện đó.

Đây là **giới hạn của dữ liệu, không phải một ngưỡng chưa chỉnh**. Ghi lại rõ ràng ở đây để
lần sau không ai (kể cả AI) nới thêm một cổng nữa với hy vọng bắt được ngày 27/8 — cách duy
nhất bắt được nó bằng dữ liệu hiện có là nới tới mức app nói "có" với mọi ngày mùa mưa.

### 🧠 Vòng kiểm chứng từng mất trí nhớ sau 48 giờ (28/8/2026)

`hindcast.ts` — công cụ CHÍNH để soi lại một ngày đã trượt — dùng chung cửa sổ quá khứ 2 ngày
của giao diện (`qualityForDaysAhead` chặn `daysAhead < -2`, `fetchMountainWeather` kẹp
`apiMin = today − 2`). Hậu quả: **mọi ngày cũ hơn 48 giờ trả về `NO_DATA` và `0/100 UNKNOWN`**,
tức ba báo cáo thực địa đầu tiên không còn soi lại được — trong khi Open-Meteo vẫn trả đủ dữ
liệu cho cả 6 mô hình (đã kiểm bằng curl: 48/48 giờ, đủ cả 7 mực áp suất).

Nay cả hai hàm nhận tham số `pastDays` (mặc định `APP_PAST_DAYS = 2` cho giao diện — **hành vi
app không đổi**), hindcast truyền 90. Có test khoá.

Bài học ghi lại vì nó sẽ tái diễn: **một hằng số hợp lý cho giao diện có thể vô hiệu hoá công
cụ kiểm chứng mà không báo lỗi gì cả.** Triệu chứng duy nhất là "0/100 UNKNOWN" — trông y hệt
một ngày thời tiết xấu.

### 📊 Cả năm ca kiểm chứng, chấm lại bằng engine-2.6

```
23/8 Tà Xùa      35/100  STATIC       đồng thuận 67%   kết luận ĐÚNG
24/8 Tà Xùa      35/100  FLUCTUATING  đồng thuận 83%   kết luận ĐÚNG
25/8 Tà Xùa      32/100  FLUCTUATING  đồng thuận 67%   kết luận ĐÚNG
25/8 Suôi Thầu   24/100  FLUCTUATING  đồng thuận 67%   kết luận ĐÚNG
27/8 Tà Xùa       5/100  RAIN         đồng thuận 50%   TRƯỢT
```

⚠️ **In-sample** — đây là chấm lại trên chính những ca đã dùng để sửa engine, KHÔNG phải kiểm
chứng độc lập. Nhưng nó cho thấy rất rõ chỗ hỏng đã DỊCH CHUYỂN:

**NHÃN nay đúng 4/5. ĐIỂM đúng 0/5** — không ngày nào chạm ngưỡng "đáng đi" 60, kể cả những
ngày app tự nhận là "biển mây tĩnh, thảm mây phẳng, bạn đứng trên mặt mây". App vừa nói
"có biển mây dưới chân bạn" vừa khuyên "đừng đi". Đó là mâu thuẫn nội bộ, không phải thận trọng.

### ⚠️ engine-2.7 (02/09/2026) — MẪU ÂM TÍNH ĐẦU TIÊN: "không có biển mây" ≠ "trời quang"

Sáu báo cáo đầu đều là ngày CÓ biển mây. Ngày 02/09 là ca đầu tiên ngược lại: **đỉnh Fansipan
bị mây mù bao trùm**, và người dùng cho biết hôm đó có vẻ **không nơi nào** có biển mây (hôm
trước nắng to). Đây là thứ đã thiếu suốt để hiệu chuẩn.

Engine-2.6 chấm `0/100 · CLEAR — "Trời quang, không có biển mây"`. Nửa đầu ĐÚNG: thung lũng
1.900m khô cong (T−Td 3-6°C, mây thấp 0-15%, không có lớp mây bám gốc). Nửa sau SAI, và sai
theo kiểu nguy hiểm — "trời quang" mời người ta leo lên chỗ mù.

**Lỗi: engine chưa bao giờ hỏi "CHỖ TÔI ĐỨNG có mây không".** Nó chỉ đi tìm lớp mây bám gốc
thung lũng, tức chỉ biết một loại mây duy nhất. Nhưng cả 6 mô hình đều cho RH 73-93% ngay tại
mực ~3.136m — **đúng cao độ người đứng**:

```
ecmwf 3136m:rh79/cc15   gfs 3135m:rh79   icon 3132m:rh78/cc13
jma   3138m:rh93/cc52   ukmo 3138m:rh73/cc5   aifs 3139m:rh79/cc15
```

Đó là **mây đội đỉnh**: gió thổi qua sườn núi nâng khối khí lên, nó ngưng tụ ngay tại đỉnh,
trong khi thung lũng bên dưới quang. Không phải biển mây, và cũng không phải trời quang — một
hiện tượng thứ ba mà engine không có tên gọi.

Bộ dò mới `summitCloud()` không dùng ngưỡng RH cứng mà so **hai quãng đường**:

| | |
|---|---|
| cần nâng bao nhiêu để ngưng tụ | `LCL_trên_đầu ≈ 25 × (100 − RH)` mét, đo tại mực ngang cao độ người đứng |
| núi nâng được bao nhiêu | `min(600m, ½ × chênh cao đỉnh−đáy)` |

Chìm trong mây khi vế trái ≤ vế phải. Fansipan: cần nâng 525m, núi nâng được 600m ⇒ mù.
Ngưỡng **tự co giãn**: cùng RH 79% đó, một đỉnh chỉ nhô 400m trên đáy thì nâng được 200m nên
KHÔNG mù — và RH lạnh khác RH ấm, một con số RH cứng không phân biệt được. Chặn trên 600m vì
cao hơn nữa thì dòng khí ổn định vòng qua chứ không trèo lên.

Bộ dò này **chỉ được đổi `CLEAR` → `FOG`**, về mặt cấu trúc không bao giờ làm app lạc quan hơn
(nhánh chỉ chạy khi `top === null`, tức khi engine đã kết luận không có biển mây). Có test khoá.

*Đã đo trước khi giữ* (`scripts/summit-cloud-probe.ts`, 287 ca = 50 điểm × 3 mô hình × 3 ngày):

```
                                bật          đổi CLEAR→FOG
ngưỡng RH ≥75% (phẳng)      87 (30%)         23 (19% số ca CLEAR)
ngưỡng RH ≥80% (phẳng)      62 (22%)         13 (11%)   ← bỏ sót Fansipan (chỉ JMA bật)
LCL ≤ ½ độ nhô, chặn 600m   52 (18%)         17 (14%)   ← ĐƯỢC CHỌN: bắt được Fansipan 4/6 mô hình
```

Fansipan 02/09 nay ra `FOG — "Mù trùm — bạn chìm trong mây"`, kèm dòng giải thích lượng nâng.

### ❗ Ngày 02/09: mẫu âm tính hoá ra KHÔNG phải âm tính (đã đính chính)

Ban đầu người dùng cho biết 02/09 có vẻ **không nơi nào** có biển mây (hôm trước nắng to), và
tôi đã ghi đó là mẫu âm tính diện rộng đầu tiên rồi tính luôn "tỉ lệ báo nhầm". **Sai.** Người
dùng đính chính ngay sau đó: Khe Cải (Tà Xùa) và Đồn Đèn (Ba Bể) VẪN có biển mây sáng hôm đó,
chỉ tồn tại khoảng **5-6h rồi tan nhanh khi nắng lên**.

Bảng "tỉ lệ báo nhầm" viết trước đó đã bị gỡ. Thực tế ngày 02/09:

```
app kết luận "có biển mây"    2/50   Núi Lang Biang 67% · Ngải Thầu Thượng 67%  ← CHƯA kiểm chứng
sự thật đã biết               2 điểm Khe Cải (Tà Xùa) · Đồn Đèn (Ba Bể)          ← app TRƯỢT cả hai
   Tà Xùa    6/100 CLEAR
   Đồn Đèn   0/100 DISSIPATING
```

⚠️ **Vẫn CHƯA đo được tỉ lệ báo nhầm.** Hai điểm app gọi tên không ai kiểm chứng, nên không
biết là báo nhầm hay báo đúng. Bài học phương pháp, ghi lại vì tôi vừa vấp: *"người dùng nói
hình như không có" KHÔNG PHẢI là "không có"* — nó là "chưa ai nhìn", và đem một mẫu như thế đi
tính tỉ lệ báo nhầm thì con số ra rất đẹp mà vô nghĩa.

#### Giả thuyết "cửa sổ trung bình làm loãng" — ĐÃ ĐO, ĐÃ BÁC BỎ

Biển mây chỉ sống 5-6h rồi tan, trong khi `cloud_cover_low` lấy trung bình 04–09h ⇒ nghi ngờ
tự nhiên là phép trung bình pha loãng mất hiện tượng. Đo thẳng chuỗi theo giờ ngày 02/09:

```
Tà Xùa  cloud_cover_low   3h   4h   5h   6h   7h   8h   9h        4-9h TB   5-7h TB
        gfs                0    0    0    0    0    0    0            0%        0%
        icon              32   29   25   10   15   20   24           21%       17%
        ukmo               0    0    0    0    0    0    3            1%        0%
Đồn Đèn gfs/icon/ukmo      0    0    0    0    0    0    0            0%        0%
```

**Không có gì để pha loãng** — mô hình cho ~0% mây thấp ở MỌI giờ. Thu cửa sổ về 5-7h không đổi
kết quả. (Ghi thêm: T/Td và mặt cắt áp suất VỐN ĐÃ lấy ở cửa sổ lõi 5-7h, chỉ `cloud_cover_low`
và mưa/gió dùng 04–09h — nên phần nhạy cảm nhất chưa bao giờ bị pha loãng.)

Bộ dò thứ hai (bão hoà thung lũng) cũng không cứu được: T−Td đáy thung lũng Tà Xùa **3,7-6,4°C,
RH 67-80%** lúc 5-7h. Ở Đồn Đèn chỉ UKMO thấy gần bão hoà (T−Td 1,6-1,8°C, RH 90-93%), GFS 3,4
và ICON 5,6.

#### Chế độ thời tiết thứ ba mà mô hình toàn cầu không thấy

Ba ca trượt gần đây thuộc ba loại khác nhau, và loại này là mới:

| ngày | hiện tượng | vì sao mô hình không thấy |
|---|---|---|
| 27/8 Tà Xùa | biển mây dày dưới sống lưng, giữa mùa mưa | cột khí ẩm đều 250→3.100m, không có nắp để tìm |
| 02/09 Fansipan | mây đội đỉnh, thung lũng quang | engine chưa có bộ dò cho loại mây này (đã sửa, engine-2.7) |
| 02/09 Khe Cải + Đồn Đèn | **sương bức xạ NGẮN HẠN sau ngày nắng to**, sống 1-2 tiếng | ô lưới 25km không phân giải lớp sương mỏng trong khe hẹp; grid-mean RH chỉ 67-80% |

Loại thứ ba đáng ghi riêng vì nó **ngược với trực giác của engine**: hôm trước nắng to ⇒ trời
quang, bức xạ đêm mạnh ⇒ đúng công thức sương bức xạ kinh điển — nhưng lượng ẩm chỉ đủ cho một
lớp mỏng, tan ngay khi mặt trời lên. Engine hiện chỉ trả lời "có/không", trong khi câu hỏi thật
của người đi là **"có, nhưng được mấy tiếng?"**. Chưa làm, và chưa nên làm bằng 2 mẫu.

### ✅ engine-2.8 (03/09/2026) — "ĐÁNG ĐI" không còn là ngưỡng điểm

Người dùng chốt phương án B sau ba lần được hỏi. Luật mới, một hàm duy nhất cho cả app
(`isWorthGoing`, engine → `forecast.worth_going`, ranking → `SpotRank.worthGoing`):

```
đáng đi  ⇔  kết luận CÓ biển mây (verdict SEA)
         ∧  đồng thuận ≥ 50% mô hình
         ∧  ΔH > 0  (người đứng TRÊN mặt mây — FLUCTUATING/ROLLING cho phép tới −250m, khuyên đi thì không)
```

Điểm số **chỉ còn để xếp thứ tự** giữa các ngày/điểm cùng đáng đi, và để tô màu. `WORTH_GOING_SCORE = 60`
vẫn tồn tại nhưng không còn quyết định gì; `calibrate.ts` in cả hai luật cạnh nhau để so.

Vì sao đổi (bằng chứng đã ghi ở các mục trên): 6 ngày kiểm chứng CÓ biển mây, luật cũ khuyên đi **0/6**
— kể cả 23/8 (`35 STATIC`), 24/8 (`35 FLUCTUATING`), 25/8 (`32 FLUCTUATING`) là những hôm chính engine
nói "bạn đứng trên mặt mây". Điểm đo nguyên liệu sương bức xạ sách vở; biển mây mùa mưa không đi
đường đó. Luật cũ đạt tỉ lệ báo nhầm hoàn hảo bằng cách không bao giờ khuyên đi.

*Đo sau khi đổi* — nỗi lo "app sẽ khuyên đi tràn lan" hoá ra nhỏ hơn dự đoán:

```
Xếp hạng rạng sáng 04/09/2026 (55 điểm):  3 điểm ĐÁNG ĐI  (5%)
   51/100 STATIC   Cực Tây A Pa Chải   ΔH +554m   67%
   31/100 ROLLING  Núi Lang Biang      ΔH  +84m   67%
   14/100 FLOWING  Pusilung            ΔH +1076m  67%
Soi lại: Tà Xùa 25/8 (có biển mây thật) → CÓ khuyên đi · Fansipan 02/09 (chìm trong mây) → KHÔNG
```

Nhìn dòng thứ ba: **14/100 mà vẫn đáng đi** — đó chính là điểm cốt lõi của thay đổi này và cũng là
chỗ cần nhìn kỹ nhất. Pusilung 3.083m, ba mô hình đều đặt mặt mây ở ~2.000m: kết luận nhất quán
dù "nguyên liệu" kém. Đúng hay sai thì chỉ báo cáo thực địa mới trả lời được.

⚠️ **Cái giá, chưa đo được:** tỉ lệ báo nhầm của luật mới. Chưa có mẫu âm tính kiểm chứng TẠI CHỖ
(02/09 hoá ra không phải, xem trên). Bảng xếp hạng nay hiện ✅ và ΔH ở từng dòng để người dùng
kiểm chứng được từng lời khuyên; `snapshot-forecast.ts` lưu thêm `cloudTop/deltaH/worthGoing` để
calibrate chấm được luật mới trên bản chụp về sau (bản chụp cũ thiếu ΔH → tính là "không khuyên",
là cận DƯỚI của độ nhạy, calibrate có ghi chú).

### 🤖 Vòng kiểm chứng tự chạy trên GitHub Actions (03/09/2026)

Từ 28/8 đã biết bằng chứng dự báo biến mất sau 48 giờ, và tới 03/09 vẫn **không có bản chụp nào**
cho 26/8→03/09 — tức 4 báo cáo thực địa gần nhất đều không có "app đã nói gì TRƯỚC" để đối chiếu,
chỉ có hindcast (in-sample). Một vòng kiểm chứng phụ thuộc vào việc nhớ chạy lệnh mỗi tối thì không
phải vòng kiểm chứng. `.github/workflows/verify-loop.yml`:

| lịch đặt (VN) | nổ thật (VN, đo) | việc | ghi vào |
|---|---|---|---|
| 15:37 | 18:22-22:35, trung vị ~20:00 | `snapshot-forecast.ts <mai>` — chụp dự báo rạng sáng **ngày mai** | `data/observations/<mai>-forecast.json` |
| 08:30 | 13:10-14:35 | `verify_satellite.py <hôm nay>` rồi `calibrate.ts` (đọc trong log) | `data/observations/<nay>-satellite.json` |

⚠️ GitHub trả cron trễ **2,8-7 giờ** (đo 32 lần chạy, trung vị 4,4h). Vì thế (1) ngày mục tiêu neo
vào lịch, không tính từ `now` — xem "Vòng tự chạy đã ÂM THẦM mất 6 ngày bằng chứng"; và (2) lịch
chụp đặt SỚM để giờ nổ thật rơi đúng buổi tối — xem mục ngay dưới đó.

Bot commit thẳng vào `main`; `deploy.yml` có `paths-ignore: data/observations/**` nên không build lại
site 2 lần/ngày. Snapshot không bao giờ `--force` — đã có bản chụp thì script tự từ chối (bản chụp là
bằng chứng). Vệ tinh trễ thì job chỉ cảnh báo, không bịa nhãn. Chạy tay: tab Actions → "Vòng kiểm
chứng hằng ngày" → Run workflow → chọn `snapshot` hoặc `satellite` (+ `date` để lấy nhãn cho một ngày đã qua).
Lần chạy thử đầu tiên lộ ngay một lỗi: `fsspec.filesystem('http')` cần `aiohttp` mà hướng dẫn cài
trong `verify_satellite.py` không ghi — máy dev có sẵn nên chưa bao giờ thấy. Đã bổ sung.

Kèm theo: báo cáo thực địa có thêm `duration: SHORT | LONG` (ô "mây tan nhanh khi nắng lên"), vì
02/09 cho thấy câu hỏi thật của người đi là "có, nhưng được mấy tiếng?". Kho báo cáo trong repo
đã chuẩn hoá về đúng từ vựng của app (`ABOVE` = chìm trong mây, không dùng `IN_CLOUD` nữa).

#### 🕳️ Vòng tự chạy đã ÂM THẦM mất 6 ngày bằng chứng (sửa 05/10/2026)

Vòng chạy từ 03/09 trông như hoạt động tốt: 32/32 lần chạy buổi tối đều nổ, 28 lần báo success.
Nhưng kho bản chụp **trống 6 ngày** trong 04/09→06/10: `08, 15, 22, 26, 28/09` và `05/10`.

**Nguyên nhân: ngày cần chụp được tính từ GIỜ CHẠY THẬT, mà cron của GitHub về trễ 3-7 giờ.**
Cron đặt 13:00 UTC (20:00 VN) nhưng thực tế nổ rải rác **15:45-19:58 UTC** — tức hai bên mốc
17:00 UTC = **00:00 giờ VN**. Script lấy mặc định `addDaysStr(vnTodayStr(), 1)`, nên:

```
10-02 18:11 UTC = 10-03 01:11 VN  →  "mai" = 10-04  → ghi 10-04 ✓
10-03 16:56 UTC = 10-03 23:56 VN  →  "mai" = 10-04  → ĐỤNG, script từ chối đè, exit 1
10-04 17:15 UTC = 10-05 00:15 VN  →  "mai" = 10-06  → ghi 10-06 ✓   ⇒ 10-05 không bao giờ có
```

Một lần trễ qua nửa đêm VN làm **nhảy vượt** một ngày; lần nổ sớm kế tiếp **đụng** bản chụp đã có
rồi `exit 1`. Chấm lại cả 32 lần chạy bằng hai luật:

```
luật cũ (giờ VN lúc chạy)       4 lần đụng · 3 lần nhảy vượt  →  6 ngày mất
luật mới (neo vào ngày UTC cron)  0 lần đụng · 0 lần nhảy vượt  →  phủ kín 04/09→05/10
```

Sửa: workflow tự chốt ngày bằng `date -u -d tomorrow +%F` rồi truyền vào script
(`snapshot-forecast.ts` vốn đã nhận tham số ngày ở `argv[2]`, chỉ chưa ai truyền). Cron 13:00 UTC
ngày D = 20:00 VN ngày D ⇒ rạng sáng mai = D+1 = (ngày UTC) + 1, đúng miễn độ trễ < 11 giờ.
Job vệ tinh neo theo `date -u +%F` cùng lý do — nó chưa mất ngày nào vì cron 01:30 UTC còn xa mốc,
nhưng để nguyên thì một hôm trễ nặng sẽ đi xin nhãn cho ngày MAI.

**6 ngày đó mất vĩnh viễn** — Open-Meteo chỉ phục vụ lại quá khứ gần và còn viết đè nó (xem mục
"Open-Meteo SỬA LẠI quá khứ"). Tuyệt đối không chụp bù bằng dữ liệu hôm nay rồi dán nhãn ngày cũ:
đó là engine tự viết lại lịch sử của chính nó.

⚠️ Bài học dùng được cho mọi vòng tự chạy: **"job success" không có nghĩa "dữ liệu đủ"**. Ba lần
`failure` thì thấy ngay trong tab Actions, nhưng ba lần *nhảy vượt* thì job báo **success** và vẫn
commit đàng hoàng — chỉ đếm file trong kho mới phát hiện được. Phép đo đúng là *đếm ngày trong kho*,
không phải *đếm lần chạy thành công*. Và **đừng bao giờ tính ngày mục tiêu từ `now`** khi bộ hẹn giờ
có thể về trễ qua mốc nửa đêm của múi giờ đang dùng — hãy neo vào lịch đã đặt.

#### ⏰ Lịch chụp dời từ 13:00 sang 08:37 UTC — để GIỜ NỔ THẬT khớp ý định "tối hôm trước" (05/10/2026)

Sau khi neo ngày, vòng chụp không còn mất ngày — nhưng vẫn chụp SAI GIỜ. Lịch cũ đặt 20:00 VN mà
áp phân bố trễ đo được thì **trung vị nổ thật là 01:34 sáng**, 18/32 lần qua nửa đêm VN, có lần chỉ
2 giờ trước bình minh. Bản chụp như vậy đo một dự báo NGẮN HẠN mà người dùng chưa bao giờ thấy —
người săn mây quyết định đi hay không vào buổi tối, trước khi đặt báo thức 3h sáng. Calibrate chấm
app trên những bản đó là chấm một app tốt hơn cái người dùng thật sự dùng.

```
lịch UTC    giờ VN nổ thật (sớm · trung vị · muộn)   lead tối thiểu   qua nửa đêm VN
0 13        00:02 · 01:34 · 03:58                     2,0h            18/32   ← cũ
0 9         18:45 · 20:21 · 22:58                     6,0h             0/32
37 8        18:22 · 19:58 · 22:35                     6,4h             0/32   ← chọn
0 7         16:45 · 18:21 · 20:58                     8,0h             0/32
```

`37 8` đưa trung vị về **19:58 VN** — không đổi quyết định "chụp tối hôm trước", mà là lần đầu tiên
thực hiện đúng nó. Phút lẻ :37 để tránh mốc tròn giờ, nơi hàng đợi cron của GitHub đông nhất. Nếu
một ngày GitHub hết trễ thì bản chụp rơi vào 15:37 VN, lead 14h — vẫn là chiều hôm trước.

Workflow nay in lead tới rạng sáng mục tiêu và `::warning::` khi dưới 4 giờ: bản chụp vẫn giữ (là
bằng chứng), nhưng phải biết nó đo dự báo ngắn hạn.

⚠️ Hệ quả cho bảng hiệu chuẩn: **bản chụp 04/09→06/10 phần lớn là dự báo trước bình minh 2-6 giờ**,
từ 06/10 trở đi là dự báo trước 7-11 giờ. Dự báo xa hơn thường kém hơn, nên nếu tỉ lệ đúng tụt nhẹ
sau 06/10 thì đó có thể là ĐO ĐÚNG HƠN, không phải engine tệ đi. `snapshotAt` trong mỗi file đủ để
tách hai nhóm khi so.

### 🏔️ 13/10/2026 — lần đầu app nói ĐÚNG "có biển mây" cho đỉnh cao, và đúng TRƯỚC khi nó xảy ra

Người dùng gửi ảnh (14/10): **Tà Chì Nhù** biển mây dày, phẳng, nắng đẹp bên trên; **Fansipan** cùng
sáng, ảnh có dấu **Timemark xác thực 06:19** — báo cáo đầu tiên có mốc giờ thật. Bản chụp làm tối
12/10 (trước khi biết) đã nói đúng cả hai:

```
Tà Chì Nhù 2.979m   66/100 STATIC  ΔH +1.272m  đồng thuận 100%  mặt mây 1.704 · 1.707 · 1.711m  ĐÁNG ĐI ✅
Fansipan   3.143m   66/100 STATIC  ΔH   +916m  đồng thuận 100%  mặt mây 2.300 · 2.224 · 2.227m  ĐÁNG ĐI ✅
```

Đây đúng là mẫu mục engine-2.8.3 bên dưới đã xin từ 11/09 ("một đỉnh ≥2.400m THẬT SỰ có biển mây
và app phải nói đúng"). Nỗi lo ở đó — các cổng 2.8.3 (nội suy mực, gió tại chỗ đứng) sẽ giết sạch
ngày tốt của nhóm đỉnh cao — **không xảy ra trong ca này**. Ngày 13/10 là một sự kiện diện rộng:
14/16 điểm Hoàng Liên Sơn được khuyên đi, 7 điểm đạt ≥65, và vệ tinh xác nhận SEA ở 12 điểm.

**Nhưng phải đọc cùng con số này:** ở riêng Tà Chì Nhù, luật "đáng đi" đã bật 13 lần trong lịch sử;
9 lần có sự thật đối chiếu thì đúng 1 (13/10), sai 8. Trên cả kho (933 cặp) luật hiện hành đúng
**8%** khi nó nói "đi". Tức 13/10 trúng một phần vì app nói "đi" quá thường xuyên.

Cái tách 13/10 khỏi các ngày báo nhầm là **điểm**: hôm đó 64-74, còn các lần nhầm ở Tà Chì Nhù đều
5-44. Đo trên toàn kho, không riêng điểm này:

```
luật                         khuyên  đúng  nhầm   chính xác   bắt được
đáng đi (hiện hành)             262    20   242       8%         48%
đáng đi ∧ điểm ≥ 65              15     8     7      53%         19%
```

**CHƯA đưa vào app.** 7/8 ca trúng của mức ≥65 đến từ CÙNG buổi sáng 13/10 (ca còn lại: Hang Kia
02/10) — 2 ngày độc lập. Bảy ca nhầm thì dồn vào núi thấp (Pù Luông ×4, Ba Vì, Pha Luông, Lũng Vân),
nơi sương thung lũng mỏng mà vệ tinh hay bỏ sót, nên "nhầm" ở đó cũng chưa chắc là nhầm. Đổi luật
trên chừng ấy là overfit (xem mục "ĐÃ THỬ SỬA CỔNG NÀY, VÀ ĐÃ BỎ"). `calibrate.ts` nay in mức này
mỗi ngày kèm **số ngày độc lập** trong các ca trúng và tự cảnh báo khi dưới 5. Đủ 5 ngày rồi mới quyết.

Hai lỗi đo lường lộ ra trong lúc soi ca này, đều đã sửa:
- `dump-rank.ts` **không ghi** ΔH / mặt mây / "đáng đi" — mọi so sánh dựa trên file đó đọc ra
  "đáng đi = 0, ΔH = None" cho cả thư viện. Suýt báo với người dùng "mấy ngày tới không điểm nào
  đáng đi" trong khi đó chỉ là cột bị thiếu.
- Báo cáo ban đêm (ảnh Tà Xùa đăng 23:29 ngày 12/10) mà ghép vào dự báo rạng sáng cùng ngày là chấm
  app trên một thời điểm cách 18 tiếng. Báo cáo nay có `timeOfDay`; `calibrate.ts` bỏ qua mọi báo
  cáo không phải `DAWN` và nói rõ lý do.

#### Ngay hôm sau, 14/10: Fansipan KHÔNG có biển mây mà app vẫn khuyên đi

Trang `vecaptreosapa.com/thoi-tiet-dinh-fansipan/` đăng ảnh thật từ đỉnh mỗi sáng (14/10 lúc 08:12:
"trời xanh, nắng rõ, núi và mây phía xa"), người dùng xác nhận không có biển mây. Bản chụp 14/10 ghi
`34/100 FLOWING ΔH +874m đồng thuận 67% · đáng đi` (gfs 24 CLEAR · icon 34 FLOWING · ukmo 58 FLOWING),
vệ tinh CLEAR cả 5 khung 04:30-06:30. Đây là một ca báo nhầm có cả người nhìn lẫn vệ tinh, và nó rơi
đúng vào kiểu mà mức "điểm ≥ 65" loại được (34 điểm). Báo cáo ghi `seaLevel: NONE`, `timeOfDay:
MORNING` (08:12 là hơn 2 giờ sau bình minh nên không tự chấm như rạng sáng; ngày này vẫn được chấm
qua nhãn vệ tinh).

Trang đó là nguồn sự thật mới đáng giá nhất từ trước tới nay: **cùng một chỗ, mỗi ngày, có giờ, và nói
được cả "không có"** - đúng thứ kênh video mạng xã hội không bao giờ cho. Trang chỉ giữ ảnh ngày hiện
tại; người dùng có lưu ảnh từ 08/10. Nhưng trang chạy WordPress nên ảnh cũ VẪN nằm trong thư viện
media, đọc được qua API công khai (robots.txt không cấm):
`/wp-json/wp/v2/media?after=<ngày>&per_page=100&_fields=date,source_url,alt_text,caption`. Đo 14/10:
loạt ảnh hằng ngày bắt đầu từ 13/10 (7 ảnh, chú thích "biển mây lúc 13:35" ⇒ báo cáo 13/10 có
`duration: LONG`) và 14/10 (5 ảnh, 08:12). Ảnh 08-12/10 không có trên máy chủ, chỉ người dùng có.
Lưu ý: cùng thư viện đó lộ cả PDF vé của khách - lọc `fansipan-` trong tên tệp, không mở thứ khác.
Chưa dựng job tự lấy: ảnh còn trên máy chủ nên chưa có gì mất, và nhãn phải do người nhìn ảnh.

Người dùng gửi thêm ảnh có dấu giờ của 08, 10 và 12/10, cả ba KHÔNG có biển mây. Chuỗi Fansipan 5 ngày,
mỗi ngày đều có bản chụp dự báo làm TRƯỚC, ảnh người nhìn và nhãn vệ tinh:

```
ngày    ảnh (giờ)     người nhìn   vệ tinh   app (bản chụp)                       lời khuyên
08/10   08:28         không có     CLEAR     30 CLEAR                             không đi  ✅
10/10   05:57         không có     CLEAR     52 DISSIPATING ΔH +451m  67%         không đi  ✅
12/10   06:08         không có     CLEAR     18 DISSIPATING           33%         không đi  ✅
13/10   06:19, 13:35  CÓ, cả ngày  SEA       66 STATIC      ΔH +916m  100%        ĐI        ✅
14/10   08:12         không có     CLEAR     34 FLOWING     ΔH +874m  67%         ĐI        ✗
```

App đúng 4/5 ở đỉnh này. Và vệ tinh khớp người nhìn **5/5** — lần đầu có bằng chứng độc lập rằng nhãn
vệ tinh ở một đỉnh cao, mùa khô, là tin được (khác hẳn sương mỏng thung lũng thấp, xem 02/09). Ca sai
duy nhất là 34 điểm; ca đúng là 66. Thêm một dữ kiện cùng chiều cho mức "điểm ≥ 65", nhưng vẫn là cùng
hai ngày 13/10 và 14/10, chưa phải ngày độc lập mới.

#### Ky Quan San 13 và 14/10: mù trùm đỉnh lúc 15h — và mặt mây app tính thấp ~1.100m

Người dùng báo (14/10): hai ngày 13 và 14/10 Ky Quan San (3.046m) bị **mây mù dày bao trùm cả đỉnh**.
Ban đầu tôi ghi là buổi sáng và chấm thành hai ca báo nhầm (mức "điểm ≥ 65" tụt còn 7/15). **Sai giờ:**
người dùng đính chính ngay, cả hai lần mù đều vào **giữa chiều, khoảng 15h**. Dự báo của app là cho
rạng sáng; mây chiều dâng trùm đỉnh là hiện tượng khác (đối lưu ban ngày, biển mây dâng khi nắng
nóng thung lũng). Hai báo cáo nay có `timeOfDay: AFTERNOON`, calibrate bỏ qua, hai ngày đó chấm bằng
vệ tinh như cũ (13/10 SEA, 14/10 CLEAR ⇒ một đúng, một báo nhầm); mức ≥65 trở lại **8/15**.
Bài học lặp lại lần thứ hai trong một ngày: **chưa biết giờ thì hỏi, đừng tự điền "buổi sáng".**

Nhưng soi ca này lộ ra một chuyện không phụ thuộc giờ quan sát: **độ cao mặt mây app tính sai xa.**
So mặt mây app tính (bản chụp) với đỉnh mây vệ tinh đo được, cùng sáng 13/10, các điểm Hoàng Liên Sơn:

```
                 app     vệ tinh   đứng      (vệ tinh − app)
Fansipan        2.227    3.040    3.143        +813     ảnh: biển mây ngay dưới đỉnh
Tà Chì Nhù      1.707    3.000    2.979      +1.293     ảnh: biển mây dày phẳng
Ky Quan San     1.711    2.830    3.046      +1.119     15h chiều: chìm trong mây
Nhìu Cồ San     1.711    2.810    2.965      +1.099
Lùng Cúng       1.711    3.061    2.913      +1.350
trung vị 22 điểm miền Bắc có số đo: vệ tinh cao hơn app ~1.100m
```

Hôm đó mặt biển mây thật (vệ tinh, 04:30-06:30) nằm ở **~2.800-3.050m**, sát ngang các đỉnh cao
nhất, chứ không phải ~1.700m như app tính. App nói "bạn đứng trên mặt mây 1.300m" trong khi khoảng hở
thật chỉ **0-300m**. Ky Quan San thấp hơn Fansipan 100m và mặt mây chỉ cách đỉnh ~200m lúc sáng — chiều
nó dâng lên trùm đỉnh là rất hợp lý. Nghĩa là **Tà Chì Nhù và Fansipan 13/10 trúng một phần nhờ may**:
kết luận đúng, nhưng lề an toàn app khai (1.300m) gấp ~5-10 lần lề thật.

**CHƯA sửa engine.** Một ngày, một sự kiện; chỉnh `estimateCloudTop` cho khớp 13/10 là overfit. Nhưng
đây là phép đo đáng làm thành công cụ: mỗi ngày vệ tinh đo được đỉnh mây thấp (không bị mây cao che),
so với mặt mây app đã chụp, sẽ ra **sai số ΔH thật** trên hàng chục điểm/ngày — thay cho con số
"±200m" vẫn ghi từ trước tới nay mà chưa ai đo bằng sự thật. Lưu ý khi làm: lọc `BLOCKED_ABOVE`
(đỉnh mây 9-15km ở Lang Biang, Măng Đen… là mây tầng cao, không phải biển mây).

Ngũ Chỉ Sơn 09/10 (người dùng báo nắng, quang) không chấm được: bản chụp 09/10 là ngày đã mất. Vệ tinh
CLEAR, khớp người đi.

#### Fansipan 11:13 cùng ngày 14/10: biển mây DÂNG LÊN sau bình minh

08:12 trời trong không có biển mây; ảnh có dấu giờ **11:13** cùng ngày thì biển mây trắng dày kín
tới chân trời, trùm gần hết sườn đỉnh. Cùng kiểu với Ky Quan San mù trùm đỉnh ~15h. App chỉ dự báo
rạng sáng nên hai ca này không chấm (`timeOfDay: MIDDAY/AFTERNOON`), nhưng chúng cho thấy với đỉnh
cao mùa này có cả **biển mây ban ngày** (mây thung lũng nâng lên khi nắng đốt) — một câu hỏi app
chưa trả lời. Gom thêm ca có giờ rồi mới tính có nên dự báo khung trưa hay không.

**Kinh nghiệm người dùng (anh Phong, 14/10/2026 — kinh nghiệm thực địa, CHƯA đo bằng số):** mùa này
biển mây chỉ yên lúc sáng sớm lạnh; trưa nắng nóng thì mây **bốc dần lên**. Riêng tháng 12-1 trời lạnh
thì biển mây có thể nằm cả ngày. Khớp với vật lý (nắng đốt mặt đất phá nắp nghịch nhiệt, lớp mây nâng
lên theo lớp xáo trộn; mùa đông có không khí lạnh tràn về giữ nắp suốt ngày) và khớp các ca có giờ đã
ghi: Fansipan 13/10 biển mây còn dưới đỉnh lúc 13:35 (đỉnh 3.143m đủ cao để mây dâng chưa tới), Fansipan
14/10 mây dâng sát đỉnh lúc 11:13, Ky Quan San (3.046m, thấp hơn) bị trùm lúc ~15h hai ngày liền.
Hệ quả cho lời khuyên: tháng 10-11 và 2-4 thì **đi sớm**, đỉnh càng thấp càng sớm bị trùm sau trưa.
Nếu sau này làm dự báo "biển mây giữ được tới mấy giờ", đây là giả thuyết cần kiểm bằng các báo cáo
có giờ (trường `observedAt`, `duration`), nhất là đối chiếu tháng 12-1 với tháng 10.

#### Fansipan 15/10: app nói "mây đang tan" — và ĐÚNG (tôi đọc nhầm ảnh rồi phải đính chính)

Ba ảnh có dấu giờ: 07:22, 09:11, 13:01. Tôi đọc ảnh 07:22 thành "biển mây dưới đỉnh", kết luận app
**bỏ sót**, rồi lần ra thủ phạm là cổng gió (cả 6 mô hình −28 vì gió nội suy về 3.143m 17-22km/h) và
ghi đó là "lỗi thật". **Sai.** Người dùng đính chính: khoảng **06:00 đỉnh bị mây mù trùm một phần**,
mặt trời lên thì tan dần; ảnh 07:22 là **mây mỏng đang tan**; trưa lại mù trùm (13:01).

Vậy bản chụp `34/100 DISSIPATING ("mây đang tan") · đồng thuận 100% · không khuyên đi` là **đúng**,
đúng cả nhãn chi tiết, và chính cổng gió tôi định gỡ là thứ đã cho ra nhãn đúng. Vệ tinh ghi
SEA_CONFIRMED nhưng đỉnh mây 2.802-3.027m — sát ngang đỉnh 3.143m, khớp "trùm một ít"; báo cáo
người đi đè nhãn vệ tinh. Ca này nay là bằng chứng ỦNG HỘ việc đo gió tại chỗ đứng cho đỉnh cao,
không phải chống.

Bài học, lần thứ ba trong hai ngày: **một ảnh tĩnh không cho biết mây đang dày lên hay đang tan.**
Trước khi kết luận app đúng/sai từ ảnh, hỏi người gửi diễn biến quanh giờ đó. Và đừng vội tìm "thủ
phạm" cho một ca trượt chưa được xác nhận — lần này suýt đề xuất gỡ một cổng đang làm đúng việc.

Fansipan 16/10, ảnh Timemark **07:25**: sương mù đặc trùm kín cột mốc, sàn ướt. Bản chụp (lead ~9h)
`37/100 DISSIPATING · đồng thuận 100% · mặt mây 3.161m, ΔH −18m · không khuyên đi` ⇒ lời khuyên ĐÚNG;
chính app đặt mặt mây ngang đỉnh. Nhãn chi tiết "mây đang tan" thì chưa kiểm được vì chưa biết diễn biến
sau 07:25. Chuỗi Fansipan có ảnh người nhìn: lời khuyên đúng 6/7 ngày (08, 10, 12, 13, 15, 16/10; sai 14/10).
Ảnh Timemark 12:05 cùng ngày vẫn mù trùm kín (không chấm, MIDDAY): hai lần nhìn 07:25 và 12:05 đều chìm
trong mây, chưa thấy dấu hiệu tan; giữa hai mốc thì không biết.
Anh chuyển lời một thông báo (không rõ giờ, không nêu tên điểm): chỉ ĐỈNH Fan mù, các điểm bên dưới khá
quang ⇒ giống mây đội đỉnh hơn là lớp mây dày từ thung lũng lên; app đặt mặt mây 3.161m theo kiểu lớp liên
tục từ dưới, nên lời khuyên đúng mà cơ chế có thể sai. Nguồn gián tiếp, không tạo báo cáo cho điểm khác.
Chiều cùng ngày có thêm hai ảnh có giờ (không chấm, AFTERNOON): Fansipan 14:07 vẫn mù trùm ("gió nhẹ, 14 độ"),
còn Cầu Kính Rồng Mây (đèo Ô Quy Hồ phía Lai Châu) 15:10 nắng đẹp, thung lũng quang, một khối mây dày ôm
đỉnh và sống núi cao dãy Hoàng Liên. Đây là bằng chứng có giờ đầu tiên cho MÂY ĐỘI ĐỈNH: ngày 16/10 đỉnh
Fansipan chìm trong mây cả ba lần nhìn (07:25, 12:05, 14:07) trong khi bên dưới quang.

Tà Xùa 16/10 (1.800m, anh báo 08:57, không có giờ nhìn cụ thể): **trời trong, không có mây**. Bản chụp
`25/100 FOG · đồng thuận 67% · mặt mây 2.182m, ΔH −382m · không khuyên đi` ⇒ lời khuyên đúng nhưng NHÃN
SAI: app bảo "chìm trong mây" giữa một ngày quang (gfs 65 FOG mặt mây 2.182m, icon 5 FOG, ukmo 25 FLOWING
1.188m). Thêm một ca cho lỗi gốc đã ghi ở mục 01-04/10: engine dựng mây/mặt mây trong ngày quang. Chưa sửa.
Cùng sáng, Đèo Ô Quy Hồ (ảnh ~08:00): người đứng trong nắng, mây trắng dày trong thung lũng bên dưới
đang vỡ và bốc lên. Bản chụp `58/100 FOG · 67% · mặt mây 2.799m, ΔH −764m` nói chìm trong mây ⇒ chấm là
BỎ SÓT (tính rạng sáng vì 08:00 nằm trong khung 04-09h); gfs `65 ROLLING` mặt mây 2.029m gần ảnh nhất. Chỉ
là lớp mây đang tan (duration SHORT), lúc 5-6h ra sao không ai biết.

Fansipan 17/10 (bài #thoitietsapa, ~08:30): mù, gió to, 12 độ; vệ tinh FOGGED_IN đỉnh mây 3.882m, khớp. Không có
bản chụp ngày này (xem "Mất thêm ngày 17/10") nên không chấm được lời khuyên.

Fansipan 18/10, bốn ảnh Timemark **06:09, 06:09, 07:09, 08:08**: bình minh quang rồi nắng, **biển mây trải kín bên
dưới đỉnh** tới chân trời, nằm yên ít nhất 2 giờ (08:08 mới có vài dải mây vờn quanh chóp). Bản chụp
(làm 17/10 19:23 VN, lead ~10h) `66/100 FLOWING · đồng thuận 67% · mặt mây 2.208m, ΔH +935m · ĐÁNG ĐI` ⇒ lời
khuyên ĐÚNG (gfs 63 FOG mặt mây 3.172m · icon 66 FLOWING · ukmo 66 FLOWING). Đây cũng là ca trúng của mức
"đáng đi ∧ điểm ≥ 65" ở một **ngày độc lập mới** (ngoài 13/10 và 02/10). Vệ tinh ghi CLEAR (4/5 khung không có số,
khung 06:00 đỉnh mây 2.821m, dưới chỗ đứng) - báo cáo người nhìn đè nhãn này. Ảnh **10:03** cùng ngày thì sương
đặc trùm kín sàn (MORNING, không chấm): biển mây dâng lên trùm đỉnh trong vòng 2 giờ, đúng kiểu 14/10 và đúng
kinh nghiệm "tháng 10 thì đi sớm". Chuỗi Fansipan có ảnh người nhìn: lời khuyên đúng 7/8 ngày.

Tà Xùa 18/10 cùng sáng (bài Facebook "biển mây lớn nhất năm", đăng ~09:30, ảnh không dấu giờ): biển mây dày phủ kín
thung lũng, người đứng trên mặt mây. Bản chụp `45/100 STATIC · đồng thuận 100% · mặt mây 1.198m, ΔH +602m · ĐÁNG ĐI`
⇒ lời khuyên ĐÚNG (gfs 63 · icon 32 · ukmo 45, cả ba STATIC). Điểm 45 nên mức "≥ 65" sẽ BỎ SÓT ca này - dữ kiện
ngược chiều cho mức đó. Vệ tinh ghi CLEAR, 5/5 khung không có số (lại kiểu sương thung lũng hồng ngoại không thấy,
như 02/09); báo cáo người đi đè.

**Đính chính cùng tối (anh Phong):** biển mây 18/10 ở CẢ Fansipan lẫn Tà Xùa đều **lưa thưa, mỏng, không đậm đặc,
nhanh tan** - tôi đọc ảnh thành "dày", và bài Facebook gọi là "biển mây lớn nhất năm". Hai báo cáo nay có
`duration: SHORT`, vẫn tính là CÓ biển mây. Hệ quả: app khuyên đi đúng về có/không, nhưng nhãn STATIC/FLOWING và
66 điểm ở Fansipan hứa hẹn hơn thực tế; app chưa có cách nói "có nhưng mỏng, tan sớm". Bài học thứ tư về đọc ảnh:
ảnh chọn lọc trên mạng xã hội phóng đại độ dày, và một ảnh không cho biết mây giữ được bao lâu.

Cũng sáng 18/10, anh chuyển lời (20/10, không ảnh, không dấu giờ): **Pha Luông và Ngũ Chỉ Sơn có biển mây đẹp
khoảng 6-7h.** Bản chụp đã khuyên đi cả hai: Pha Luông `72/100 FLUCTUATING · 100% · mặt mây 1.750m, ΔH +130m`,
Ngũ Chỉ Sơn `51/100 FLOWING · 67% · mặt mây 2.208m, ΔH +650m` ⇒ hai lời khuyên ĐÚNG. Vệ tinh: Ngũ Chỉ Sơn
SEA_CONFIRMED (đỉnh mây 2.677m, dưới chỗ đứng 2.858m) khớp; Pha Luông CLEAR 5/5 khung không có số, lại là sương
thung lũng hồng ngoại không thấy. Đáng ghi: Pha Luông từng nằm trong nhóm "báo nhầm" của mức ≥ 65 (chấm bằng vệ
tinh), nay có một ngày người đi xác nhận ở chính điểm đó - thêm lý do đọc "nhầm" ở núi thấp bằng vệ tinh cho thận
trọng. Mức ≥ 65 bắt được Pha Luông nhưng bỏ sót Ngũ Chỉ Sơn (51). Cả hai cùng ngày 18/10 nên không thêm ngày độc lập
(mức ≥ 65 vẫn 4 ngày: 02, 13, 18, 19/10). Riêng nguồn người đi, luật đáng đi nay 7 đúng · 8 bỏ sót · 1 nhầm.

Anh báo thêm Lùng Cúng cùng sáng cũng có biển mây đẹp: bản chụp `74/100 STATIC · 100% · mặt mây 2.209m, ΔH +704m · ĐÁNG ĐI`
⇒ đúng. **18/10 là sự kiện diện rộng thứ hai sau 13/10:** app khuyên đi 22/55 điểm, trong đó 11 điểm ≥ 65 (nhiều nhất
kho, 13/10 có 9); vệ tinh thấy SEA ở 5 điểm (13/10: 10), nhưng 15 điểm bị mây cao che và 10 điểm FOGGED_IN nên vệ tinh
đếm thiếu. Có người nhìn xác nhận 6 điểm (Fansipan, Tà Xùa, Pha Luông, Ngũ Chỉ Sơn, Lùng Cúng, Phu Sa Phìn; Tà Xùa và Fansipan
mỏng, tan nhanh), app khuyên đi cả 6. Phu Sa Phìn (báo thêm 20/10): `74/100 STATIC · 100% · mặt mây 2.058m, ΔH +807m`;
vệ tinh ghi CLEAR nhưng khung 04:30 đo đỉnh mây 2.726m, dưới chỗ đứng 2.865m. Cũng như 13/10, mặt mây app tính bám ~2.208m ở hầu hết đỉnh Hoàng Liên Sơn còn vệ tinh đo
2.650-3.110m (Tà Chì Nhù 2.715m, Lùng Cúng ~3.067m): lời khuyên đúng, nhưng khoảng hở thật nhỏ hơn app khai 500-900m.
Thêm bằng chứng cho lỗi bám lưới của `estimateCloudTop`.

#### Ngày diện rộng: chấm theo NGÀY, tìm ngày tương tự (20/10/2026)

Hai buổi sáng nhiều đỉnh có biển mây nhất kho là 13/10 và 18/10. Anh gợi ý tìm điều kiện thời tiết chung để
nhận ra ngày tương tự. Đo bằng bảng thời tiết vùng 05h (ECMWF, lưu trữ historical-forecast) cho 4 cụm núi:

- **Hai ngày thuộc hai kiểu khác hẳn.** 13/10 (Sa Pa): RH 700hPa 30%, gió 850 đông bắc, tầng 850-700 rất ổn
  định, một tuần sau đợt lạnh 05-06/10 - kiểu khí chìm có nắp, sách vở. 18/10: RH 700 86%, gió nam yếu, mây
  cao đêm 86%. Không có một "khuôn" thông số chung.
- **Điểm chung cần mà chưa đủ:** gió 850 gần lặng, đêm không mưa, sát đất gần bão hoà, khí áp không giảm. Bộ
  lọc này (giả thuyết B) bật 6 ngày trong mẫu, trúng 3; 14/10 giống 13/10 gần như mọi số vùng mà gần như không
  có biển mây. Số vùng 25km không đủ tách ngày tốt khỏi ngày thường.
- **Tín hiệu tốt hơn nằm sẵn trong bản chụp (giả thuyết A):** số đỉnh "đáng đi ∧ điểm ≥ 65" tối hôm trước. Ngày có
  ≥ 4 đỉnh (13, 18, 19/10) đều là ngày diện rộng, 0 báo nhầm; nhưng bỏ sót 4 ngày diện rộng (06/09, 27/09, 03/10,
  15/10) mà app chỉ cho 0-2 đỉnh.

```
trong mẫu (≤ 19/10)   A ≥4 đỉnh: đúng 3 · sót 4 · nhầm 0 · đúng không 19
                      B Sa Pa:   đúng 3 · sót 4 · nhầm 3 · đúng không 16
```

Cả hai ngưỡng chốt ngày 20/10 từ chính các ngày trên, nên bảng là TRONG MẪU. `calibrate.ts` in mục "NGÀY DIỆN
RỘNG" mỗi ngày, tách trong/ngoài mẫu; sự thật = ≥ 4 điểm có biển mây (mọi nguồn), ngày nhìn được < 15 điểm thì
"không rõ". Ngày ngoài mẫu đầu tiên: 20/10, bản chụp có 5 đỉnh ⇒ A dự đoán diện rộng.
`scripts/regional-days.ts` ghi bảng vùng vào `data/observations/regional-days.json` (job vệ tinh chạy mỗi ngày,
chỉ thêm ngày thiếu). Lưu ý: số này gần với phân tích, không phải thứ app thấy tối hôm trước; muốn dùng để dự báo
phải kiểm lại trên dự báo.
**Kết quả 20/10 (ngày ngoài mẫu đầu tiên): A đoán ĐÚNG ngày, nhưng SAI chỗ.** Có 11/44 điểm có biển mây: vệ tinh thấy 9,
anh báo thêm Tà Xùa và Ky Quan San (sáng sớm). Nhưng 5 đỉnh ≥ 65 mà app nêu tên (A Pa Chải 80, Pù Luông 80, Kim Bon 74, Pha
Luông 72, Chiêu Lầu Thi 69) không có đỉnh nào được vệ tinh xác nhận: 3 đỉnh CLEAR là núi thấp, nơi vệ tinh hay mù với sương
thung lũng, nên chưa chắc là nhầm. Các điểm có biển mây thật lại là nhóm đỉnh cao Hoàng Liên Sơn (Lảo Thẩn, Nhìu Cồ San, Ngũ
Chỉ Sơn, Cú Nhù San, Putaleng, Tả Liên Sơn, Ky Quan San), đỉnh mây vệ tinh đo 2.610-3.210m, và app chỉ cho 18-49 điểm ở nhóm này.
Ky Quan San (`40 FOG`, ΔH +1.361m) và Nhìu Cồ San (`43 FOG`, ΔH +333m) **bỏ sót kiểu tự mâu thuẫn**: mặt mây app tính nằm dưới
chân, nhãn vẫn là "chìm trong mây". Nhiều khả năng mặt mây thật nằm sát đỉnh, cách 100-250m, nên RH nội suy tại chỗ đứng cao
và cổng `observerInCloud` bật, trong khi `estimateCloudTop` lại đặt mặt mây quá thấp. Hai lỗi này cùng một gốc: mặt mây bám
lưới mực áp suất. Vì vậy dòng "đêm nay nhiều đỉnh đẹp" nếu đưa lên app chỉ được nói về NGÀY, không được kèm danh sách đỉnh.
**Chưa đưa lên app** (kiểu "đêm nay nhiều đỉnh đẹp"): chờ A đúng ở ≥ 5 ngày ngoài mẫu. Khi có ~8-10 ngày diện
rộng thì tìm lại kiểu thời tiết theo từng nhóm (khí chìm sau đợt lạnh / ẩm gió nam), không theo một khuôn.

#### Tà Xùa chuẩn = 1.800m, chỗ cao nhất xe lên được (14/10/2026)

Người dùng phát hiện mục chọn nhanh "Tà Xùa (Sống lưng Khủng Long)" vẫn ghi **2.865m** — đó là đỉnh
Phu Sa Phìn (Yên Bái) đã tách tên từ trước, nhưng `constants.ts` (danh sách chọn nhanh) bị bỏ sót
khi tách. Hậu quả thật: chọn Tà Xùa từ danh sách thì độ cao đứng = 2.865 − 100 = **2.765m**, mọi
phân tích theo đường đó tính cho một người đứng gần đỉnh Phu Sa Phìn. Người dùng chốt mốc chuẩn
1.800m (cao nhất xe lên được). Đo: đường xe cao nhất trong OSM quanh Tà Xùa là nhánh lên trạm phát
sóng, DEM 1.770m tại 21.2764,104.4243 — trùng plus code 7CGF+HH. Nên `TA_XUA_SON_LA` chuyển về đó
(1.800m) và **gộp** `TA_XUA_TRAM_PHAT`; bản chụp/báo cáo cũ giữ nguyên khoá (bằng chứng của chỗ
đứng 1.600m khi ấy). Có test khoá. Bài học: tách/đổi tên một điểm thì sửa CẢ HAI danh sách
(`constants/mountains.ts` và `constants.ts`), chúng nối với nhau chỉ bằng tên.

#### Điểm mới: Đỉnh Kim Bon (15/10/2026)

Người dùng giới thiệu "Đồi gió và cỏ Đỉnh Kim Bon", plus code `4JC7+C39` (bản Kim Bon, Sơn La), ô tô
lên tận đỉnh ~1.100m. Giải mã `7PH64JC7+C39` = 21.121038, 104.612734, DEM 1.055m; cực đại DEM lân
cận 1.146m cách ~450m. Quét DEM vòng 2-8km: đáy 116-145m — chính là mặt hồ Hòa Bình trên sông Đà,
chênh cao ~950m. Mặt cắt chỉ ghi hai mốc đã đo (lòng hồ 120m, đỉnh 1.100m); không thêm mốc giữa
chưa đo. Dự báo thử 16-18/10 (6 mô hình, lúc thêm): 16/10 mặt mây trên đầu (ΔH −571m, không khuyên);
17 và 18/10 khuyên đi nhưng ΔH chỉ +155m/+138m — sát biên, và 13/10 đã cho thấy ΔH có thể lệch cả
nghìn mét. Từ đêm nay điểm này vào bản chụp hằng ngày nên sẽ tự có bằng chứng.

16/10: người dùng chốt độ cao đứng đúng 1.100m. Mục chọn nhanh có cờ mới `standAtTop` (xe lên tận
nơi ⇒ đứng đúng mốc, không trừ 100m như các đỉnh khác); hàm `defaultObserverAlt` trong InputForm, có
test. Tà Xùa vẫn theo quy tắc chung (1.700m) vì người dùng chỉ chốt cho Kim Bon. Người dùng cũng cho
biết chỗ này hẻo lánh, gần như không có ảnh có giờ ⇒ sự thật ở Kim Bon sẽ CHỈ đến từ vệ tinh, mà
vệ tinh hay bỏ sót sương mỏng thấp trên mặt hồ (xem 02/09). Đọc nhãn CLEAR ở đây thận trọng.

#### Vòng chụp mất thêm ngày 09/10 — Open-Meteo trả chữ thay vì JSON

Lần chạy 08/10 nhận HTTP **200** với thân là chữ "Unexpected…", `res.json()` chết với
`Unexpected token 'U'` và bản chụp 09/10 mất vĩnh viễn. Sửa: `fetchJson` đọc chữ trước rồi mới
parse, lỗi nói thẳng "trả HTTP 200 nhưng KHÔNG phải JSON: …" (đã gọi thật vào một trang HTML để
kiểm); workflow tự thử lại 4 lần, chờ 3 → 8 → 15 phút. Chạy lại an toàn vì script chỉ ghi ở bước
cuối và từ chối đè.

Và lịch 08:37 UTC **không** cho giờ nổ như đã tính: 7 lần chạy từ 06/10 nổ 14:38-18:08 UTC (trễ
6-9,5 giờ, so với 2,8-7 giờ đo ở lịch cũ), tức 21:38-01:08 giờ VN, lead tới rạng sáng 3,9-7,4 giờ.
Vẫn tốt hơn lịch cũ (trung vị 01:34 sáng) nhưng sai số dự đoán lớn. Đáng chú ý: cả hai lịch đều đổ
về khoảng 15-18 UTC — có thể GitHub gom các lần chạy hạng thấp, không phụ thuộc giờ đặt. Mới 7 điểm
đo, chưa đổi tiếp; kiểm lại sau 2 tuần.

#### Mất thêm ngày 17/10 — `npx vite-node` tự đi tải gói và npm chết giữa chừng

Lần chạy 16/10 13:28 UTC (lead ~8h, đúng giờ) chết cả 4 lần thử với cùng một lỗi
`npm error Cannot read properties of null (reading 'edgesOut')`, ngay ở bước `npx vite-node`,
trước khi script kịp chạy dòng nào. Gốc: `vite-node` **chưa bao giờ nằm trong `package.json`**,
nên mỗi lần chạy `npx` lại tải bản mới nhất từ mạng (nay là 6.0.0, kéo theo vite 8 riêng), và
lần này chính npm của runner (10.8.2) vấp lỗi khi dựng cây gói. Thử lại 4 lần không cứu được vì
lỗi không phải chập chờn mạng. Bản chụp 17/10 mất vĩnh viễn; hai báo cáo Fansipan và Ô Quy Hồ
sáng 17/10 vì thế chỉ chấm được bằng nhãn vệ tinh, không chấm được lời khuyên của app.

Sửa: ghim `vite-node@3.2.4` vào devDependencies (bản này nhận vite 5-7 nên dùng chung vite 6.4
của repo, không kéo vite thứ hai), và workflow gọi `npx --no-install vite-node` để thiếu gói thì
chết ngay, rõ ràng, chứ không lặng lẽ đi tải. Đã kiểm: `npm ci` sạch trên bản sao rồi chạy
`calibrate.ts` qua vite-node cục bộ, chạy được. Bài học: **công cụ mà vòng tự chạy cần thì phải
ghim trong lockfile**; `npx <gói>` không khai báo là phụ thuộc vào npm registry và npm của ngày hôm đó.

### 🎯 Năm ngày kiểm chứng NGOÀI MẪU đầu tiên — và lần khuyên đi ĐÚNG đầu tiên (01-04/10/2026)

Người dùng báo (05/10) hai đợt: **03/10 và 04/10 có biển mây trên Tà Xùa**, và **Hang Kia
(Pà Cò) có biển mây 3 ngày liên tiếp 01-02-03/10.** Đây là lần đầu tiên có báo cáo thực địa cho
những ngày **đã có bản chụp dự báo thật** trong kho — tức bằng chứng "app đã nói gì TRƯỚC khi
biết sự thật", không phải hindcast in-sample như 6 ca trước. Và Hang Kia là **điểm thứ hai** có
nhiều ngày liên tiếp, gỡ bớt thế lệch "gần như chỉ Tà Xùa" của bộ mẫu cũ.

```
                                 bản chụp (chụp TRƯỚC 1-2 ngày, engine-2.8.3)
01/10  Hang Kia - Pà Cò          40/100  FOG          ΔH -708m  đồng thuận  33%   KHÔNG  ✗
02/10  Hang Kia - Pà Cò          70/100  FLOWING      ΔH +374m  đồng thuận  67%   CÓ     ✅
03/10  Hang Kia - Pà Cò          48/100  DISSIPATING  ΔH +309m  đồng thuận  33%   KHÔNG  ✗
```

**Ngày 02/10 là lần khuyên đi ĐẦU TIÊN của luật engine-2.8 được thực địa xác nhận.** Từ 03/09
tới nay tài liệu này vẫn ghi "⚠️ cái giá chưa đo được: tỉ lệ báo nhầm của luật mới" và "luật cũ
đạt tỉ lệ báo nhầm hoàn hảo bằng cách không bao giờ khuyên đi" — nay đã có một ca dương tính thật,
và nó là ca điểm cao nhất trong cả kho (70/100, ΔH +374m, hai mô hình cùng nhóm SEA).

Hai ngày kia trượt, mỗi ngày vì một lý do khác nhau và **không ngày nào là lỗi vật lý**:

- **01/10**: ba mô hình bất đồng tận gốc (gfs `FOG` top 2.191m · icon `STATIC` top 1.178m ·
  ukmo `CLEAR`), đồng thuận 33%. ICON đúng và bị bỏ phiếu loại. Đây là giới hạn dữ liệu đã ghi
  từ engine-2.3: không luật gộp nào cứu được khi đa số sai.
- **03/10**: chia ba kết luận **1-1-1** (gfs 80 `STATIC` · icon 38 `FOG` · ukmo 48 `DISSIPATING`)
  nên luật hoà-phiếu-chọn-nặng-hơn của engine-2.5 trao cho `BLOCKED` → `DISSIPATING`.
  GFS chấm **80/100 STATIC** — lời gọi đúng, điểm cao nhất từng thấy — bị luật an toàn loại.
  ΔH +309m đã vượt biên 100m; chỉ thiếu đồng thuận. Đây **không phải bug**: engine-2.5 đã chốt
  "thà khuyên ở nhà nhầm còn hơn bắt người ta dậy 3h sáng". Nhưng giờ đã đo được cái giá của nó:
  1 trong 3 ngày thật ở điểm này mất vì luật hoà phiếu, không vì vật lý.

Còn Tà Xùa thì trượt sạch:

```
                                 bản chụp (engine-2.8.3, chụp TRƯỚC 1-2 ngày)
03/10  Tà Xùa                    50/100  FOG   ΔH  -10m   đồng thuận 67%   KHÔNG khuyên đi
       Trạm phát sóng Tà Xùa     46/100  FOG   ΔH +143m   đồng thuận 100%  KHÔNG khuyên đi
04/10  Tà Xùa                    50/100  FOG   ΔH +332m   đồng thuận 67%   KHÔNG khuyên đi
       Trạm phát sóng Tà Xùa     50/100  FOG   ΔH +485m   đồng thuận 67%   KHÔNG khuyên đi
```

Chỗ đáng chú ý không phải con số điểm — mà là
**app tự mâu thuẫn ngay trong một dòng**: ngày 04/10 nó nói người đứng **cao hơn mặt mây 332m**
(Trạm phát sóng: 485m) rồi dán nhãn *"Mù trùm — bạn chìm trong mây"*.

Thủ phạm, xác định bằng loại trừ trên cây quyết định của `scoreOneModel`: với `top ≠ null` và
`ΔH > 250` thì nhánh duy nhất còn trả `FOG` là **`observerInCloud`** (dòng 831). Bản chụp 04/10
cho thấy GFS tự tính đỉnh mây 1.019m dưới chỗ đứng 1.600m — ΔH **+581m** của riêng nó — mà vẫn ra
`FOG`. ICON tương tự (đỉnh mây 1.517m, ΔH +83m → `FOG`). Cổng này **bật bất kể ΔH dương bao nhiêu**:

```js
else if (deltaH !== null && deltaH > -250 && observerInCloud(m, ctx)) status = 'FOG';
```

Và nó đọc mực áp suất gần chỗ đứng nhất trong **±250m** — với Tà Xùa 1.600m thì đó là mực 850hPa
ở ~1.516m, tức **mực nằm NGAY DƯỚI chân người đứng**. Mực ấy có mây chính là *định nghĩa* của
biển mây dưới chân; engine lại đọc nó thành "bạn đang ở trong mây". Cửa sổ ±250m không phân biệt
"mây dưới chân tôi 84m" với "mây ngang mặt tôi".

Nhìn thế thì đây y hệt loại lỗi engine-2.5 từng sửa ("tự mâu thuẫn ngay trong một màn hình"), tái
diễn ở một cổng khác, và chính là mẫu phản chứng mà mục engine-2.8.3 bên dưới đã xin:
*"cổng này chỉ đi MỘT CHIỀU, chưa lần nào thêm một nhãn biển mây"*.

**Lập luận đó đúng về cơ chế nhưng sai về kết luận.** Phần dưới là phép đo, và nó bác bỏ bản sửa.
Giữ cả đoạn phân tích trên vì cơ chế đọc sai là thật và sẽ còn phải xử — chỉ là không xử ở đây.

**ĐÃ THỬ SỬA CỔNG NÀY, VÀ ĐÃ BỎ — phép đo bác bỏ.** Bản sửa: thêm trần ΔH 250m cho cổng, neo
vào sai số ±200m của chính ΔH (không phải hệ số chỉnh cho vừa dữ liệu). Chấm trên **645 dòng bản
chụp có sự thật đối chiếu**, dùng bằng chứng đã lưu chứ không fetch lại:

```
luật        đúng  bỏ sót  báo nhầm   bắt được   báo có thì đúng
cũ             9      19       172        32%            5%
trần 250m     10      18       189        36%            5%
```

18 dòng đổi sang "khuyên đi": **17 SAI, 1 ĐÚNG** — và đúng duy nhất là Tà Xùa 04/10, chính ngày
dùng để nghĩ ra bản sửa. Overfit một ca, đúng thứ tài liệu này cấm. Đã hoàn nguyên
(`OBSERVER_FOG_MAX_DELTA_H = Infinity`); giữ tham số `observerFogMaxDeltaH` của `scoreOneModel`
để `scripts/observer-gate-probe.ts` (mới) đo lại được về sau.

**Thu hoạch thật của lần này nằm ở 17 ca sai đó: 16/17 có nhãn vệ tinh `CLEAR`** — hôm ấy
**không có mây gì cả**, chứ không phải "người đứng trong mây". Nghĩa là cổng `observerInCloud`
lâu nay **đúng vì lý do sai**: nó che một lỗi khác, `estimateCloudTop` dựng ra một "mặt biển mây"
từ các tầng RH ≥80% trong những ngày trời quang. Gỡ cổng đi thì lỗi gốc lộ ra ngay thành 17 lời
khuyên sai. Đủ tên để soi tiếp: A Pa Chải (3 ngày), Thung Khe (2), Phình Hồ (2), Sì Thâu Chải (2),
Ba Vì (2), Pusilung (2), Ky Quan San, Bạch Mã, Hang Kia, Chiềng Công.

⇒ **Việc tiếp theo đúng chỗ: `estimateCloudTop` đừng dựng mặt mây khi mô hình không thấy mây.**
Nhưng đo trước, và đo cả hai chiều: cổng `cloud_low_dawn < 15` hiện bị `valleySaturation` /
`rootedLowLayer` vượt qua, mà chính hai bộ dò đó sinh ra để cứu những ngày thung lũng bão hoà mà
mô hình báo 0% mây (Tà Xùa 23/8, Suôi Thầu 25/8). Siết tay là xoá luôn công của chúng.

Probe tần suất (`observer-gate-probe.ts`, 495 ca = 55 điểm × 3 mô hình × 3 ngày) còn cho một số
đáng nhớ: cổng bật **39%** số ca, **nhưng 70% số lần bật là ca ΔH ≤ −250m, nơi nhãn vẫn FOG dù có
cổng hay không** — cổng chỉ thật sự đổi kết luận ở 25/192 lần bật. Mực nó đọc nằm DƯỚI chân người
đứng trong 44% số lần, nên cơ chế đọc sai là thật; chỉ là sửa nó chưa cải thiện được gì.

⚠️ Và hindcast 03-04/10 **không** dùng để chấm được — đã kiểm 05/10: API trả ΔH −590m cho ngày
04/10 trong khi bản chụp ghi +332m. Chỉ bản chụp là bằng chứng.

#### Nguồn của 5 báo cáo này: VIDEO MẠNG XÃ HỘI, không phải người đo tại chỗ

Người dùng cho biết (05/10): *"không ai đo cả, chỉ check video trên mạng xã hội thấy có thì báo
lại lên đây thôi."* Đúng theo đường đã thiết kế (xem mục "Facebook: từ không cào sang nhãn tự động" - hồi đó:
người dùng thấy bài thì bấm một nút, không cào). Nhưng phải ghi rõ kênh này đo được gì:

| | |
|---|---|
| **CÓ biển mây** | bằng chứng MẠNH — một video thấy biển mây thì khó sai |
| **giờ và thời lượng** | **không lấy được** — video không nói nó quay lúc mấy giờ, tan lúc nào |
| **vị trí trong điểm** | mờ — "Tà Xùa" rộng vài km; Khe Cải khác sống lưng khác trạm phát sóng |
| **KHÔNG có biển mây** | **kênh này KHÔNG BAO GIỜ nói được** — không ai đăng video "hôm nay không có mây" |

Vì thế `duration` để trống ở cả 5 báo cáo (không đoán). Và **đừng chờ mẫu âm tính từ kênh này** —
điều tài liệu này vẫn ghi là việc-cần-làm từ 25/8. Mẫu âm tính phải đến từ vệ tinh, và mục "Tập
sự thật của vệ tinh KHÔNG bị nhiễm" ngay dưới vừa chứng minh 650 dòng `CLEAR` đó là thật.

### ✅ Tập sự thật của vệ tinh KHÔNG bị nhiễm — một báo động hụt, đã đo xong (05/10/2026)

Mục này ban đầu tôi viết là "32% tập sự thật là no-data bị khai thành trời quang" và coi đó là
lỗi nặng nhất của dự án. **Kết luận đó SAI, và phép đo tiếp theo của chính tôi đã bác bỏ nó.**
Giữ lại cả quá trình vì cái bẫy này sẽ còn gặp.

Cơ chế thì có thật: `CldTopHght` dùng `-999` cho "không có số", mặt nạ cũ chỉ bắt `< -1e10` nên
`-999` sống sót như số hợp lệ, rồi vì nhỏ hơn mọi đáy thung lũng nên rơi vào nhánh trả `CLEAR`.
Đo trên 43 file: **44% khung mang `-999`**, và **650/789 dòng `CLEAR` (82%) không có lấy một
khung nào đo được đỉnh mây thật**. Nhìn thế thì đúng là "không đo được" và "trời quang" đi ra
cùng một nhãn, và 32% kho sự thật thành âm tính giả.

Nhưng "cùng một nhãn" chưa có nghĩa là "nhãn sai". Câu hỏi thật: `-999` nghĩa là *trượt phép
truy hồi* hay *không có mây nên không có đỉnh mây*? Trả lời bằng một sản phẩm ĐỘC LẬP —
`AHI-CMSK` nằm cùng thư mục, cùng mốc thời gian, dataset `CloudMask` với
`flag_meanings = "clear probably_clear probably_cloudy cloudy"`. Đó là mặt nạ trời quang chính
thức, không dính gì tới phép truy hồi độ cao. `tools/audit_cloudmask.py` (mới) hỏi đúng nó.

Kết quả trên 143 dòng `CLEAR`-toàn-no-data, 6 ngày rải từ 02/09 đến 05/10:

```
khung:  clear 580 (81%)  ·  probably_clear 135 (19%)  ·  cloudy 0
dòng:   143/143 mask xác nhận QUANG   →  nhãn CLEAR cũ ĐÚNG, 0 dòng phải gán lại
```

Ca đối chứng mạnh nhất: `2026-09-02 Tà Xùa`, nhãn `CLEAR` dựng trên 5/5 khung no-data — ngày
người dùng xác nhận Khe Cải CÓ biển mây. Mask cho `clear` cả 5 khung, `P(mây) = 0.00`. Tức vệ
tinh **thật sự không thấy gì**, và mục "Vệ tinh và người đi CÃI NHAU" bên dưới đã kết luận ĐÚNG
từ đầu: lớp sương mỏng ngắn hạn thì hồng ngoại 2km không thấy. Lời "đính chính" tôi viết ở bản
trước — rằng lý do trực tiếp là script tự điền "trời quang" — là sai, nay đã gỡ.

**Hệ quả ngược hẳn với báo động ban đầu, và nó là tin tốt:** 650 dòng `CLEAR` kia là **mẫu ÂM
TÍNH thật** — đúng thứ mà tài liệu này từ 25/8 vẫn ghi là "chưa có, cần báo cáo ngày KHÔNG có
biển mây trước đã". Hoá ra bộ kiểm chứng đã có hàng trăm ngày âm tính hợp lệ từ vệ tinh. Vì thế
`classify()` **GIỮ NGUYÊN** việc trả `CLEAR` cho no-data: đổi sang `NO_DATA` sẽ ném đi 650 nhãn
âm tính đúng, làm bộ kiểm chứng tệ đi chứ không sạch hơn.

Đã sửa, và chỉ sửa đúng phần hỏng thật: mặt nạ nay loại mọi giá trị âm (`hgt < 0`), vì không một
độ cao đỉnh mây nào âm. **Nhãn ngày không đổi một dòng nào**; cái hết là 850 dòng từng báo ra
`cloudTopMedian_m` ÂM — con số vô nghĩa mà `calibrate.ts` vẫn in ra làm bằng chứng
("SEA_MARGINAL, đỉnh mây -999m").

⚠️ Bài học phương pháp, ghi vì tôi vừa vấp: **"hai thứ khác nhau đi ra cùng một nhãn" là lý do
để ĐI ĐO, không phải một kết luận.** Tôi đã viết thẳng vào tài liệu con số "32% tập sự thật là
âm tính giả" khi chỉ mới chứng minh được cơ chế, chưa kiểm hệ quả — rồi phải tự gỡ. Có một sản
phẩm độc lập nằm ngay cạnh trong cùng bucket mà chưa hỏi thì chưa được kết luận. Và `CldTopEmss`
vẫn là tham số chết trong `classify()` (đọc rồi truyền vào, thân hàm không dùng) — không còn cấp
bách nữa, nhưng vẫn nên dọn.

### 🛰️ Vệ tinh và người đi CÃI NHAU ngay ngày đầu (02/09/2026) — người đi thắng, và đây là vì sao

Lần chạy thật đầu tiên của job vệ tinh (Himawari, độ cao đỉnh mây 2km) cho 02/09:

```
vệ tinh:  Tà Xùa CLEAR · Fansipan CLEAR · Đồn Đèn BLOCKED_ABOVE (mây cao che)
người đi: Khe Cải (Tà Xùa) CÓ biển mây 5-6h rồi tan · Fansipan CHÌM trong mây · Đồn Đèn CÓ, tan nhanh
```

Sai cả ba, theo ba cách khác nhau, và không cái nào là lỗi code:
- **Sương mỏng ngắn hạn** (Tà Xùa, Đồn Đèn): lớp sương thung lũng 100-300m dày, tan trước 8h — hồng
  ngoại 2km nhìn từ 36.000km chỉ thấy "mặt đất hơi mát", không thấy mây. Đồn Đèn còn bị mây cao che.
- **Mây đội đỉnh** (Fansipan): mây bám sườn ở 3.100m nhìn từ trên xuống trùng màu với nền, ô 2km
  không tách được cái mũ mây khỏi núi.

Kết luận cho calibrate (đã là luật từ đầu, nay có bằng chứng): **báo cáo thực địa ĐÈ nhãn vệ tinh khi
cùng điểm + ngày.** Vệ tinh chỉ đáng tin cho biển mây DÀY, RỘNG, còn tồn tại lúc nó chụp — tức đúng
loại mà mô hình cũng thấy. Hai loại app đang trượt (sương ngắn hạn, mây đội đỉnh) thì vệ tinh cũng mù.
Nghĩa là **nhãn vệ tinh không giúp đo được hai lỗi lớn nhất hiện nay; chỉ báo cáo người đi mới đo được.**

### 🐛 "Bấm lần 1 ra kết quả rồi biến mất" — thủ phạm là PWA, không phải bảng xếp hạng (07/09/2026)

Người dùng báo: bấm 🌄 *Đêm nay đi đâu săn mây?* thì bảng hiện ra rồi **biến mất**, phải bấm lần
hai mới có "kết quả thật". Không có lỗi nào trong `TonightRanking` cả — `VitePWA({ registerType:
'autoUpdate' })` sinh ra service worker `skipWaiting` cộng đoạn client:

```js
wb.addEventListener('activated', e => { if (e.isUpdate) window.location.reload() })
```

nên **mỗi lần repo có bản deploy mới, trang tự gọi `location.reload()` giữa chừng**. Ngày 03/09
repo deploy 6 lần nên người dùng gặp liên tục. Đã tái hiện bằng Playwright (giả lập deploy bằng
cách đổi nội dung `sw.js`): biến đánh dấu phiên biến mất, trang điều hướng lại 1 lần.

Chi tiết đáng sợ hơn "mất kết quả": bảng hiện ra ở **lần bấm đầu là do bản app CŨ tính** — người
dùng nhìn thấy số của phiên bản trước trong khoảnh khắc trước khi reload. Chữ *"lần 2 mới ra kết
quả thật"* đúng theo nghĩa đen.

Sửa: `registerType: 'prompt'` + thanh hỏi (`components/UpdateBanner.tsx`). Bản mới tải về rồi ĐỢI,
người dùng chọn lúc tải lại. Trên núi mất sóng, tự reload còn có thể làm mất luôn dự báo đang xem.

Hai cái bẫy gặp khi sửa, ghi lại vì cả hai đều im lặng:

1. **`prompt` mặc định tắt `clientsClaim`** ⇒ lần truy cập ĐẦU không được SW nhận quyền, tức mất
   offline cho tới lần tải thứ hai. Phải bật lại tay: `clientsClaim: true, skipWaiting: false` —
   hai cờ này độc lập, chỉ `skipWaiting` mới là thứ quyết định "có giành quyền giữa chừng không".
2. **`updateSW(true)` của thư viện có thể KHÔNG làm gì cả.** Nó chỉ reload khi workbox-window cho
   rằng đây là "bản cập nhật", mà cờ `isUpdate` được chốt lúc đăng ký: trang được claim ngay ở lần
   đầu thì cờ là false suốt phiên. Đo được: SKIP_WAITING gửi đi, `waiting` mất, `controllerchange`
   bắn, trang vẫn đứng yên — nút bấm vô tác dụng mà không báo lỗi gì. `applyUpdate()` nay tự nghe
   `controllerchange` và tự reload, kèm hẹn giờ 3s phòng khi không có gì xảy ra.

Kèm theo: cache bảng xếp hạng nay ghi xuống `localStorage` (khoá gồm `ENGINE_VERSION` nên engine
mới tự vô hiệu cache cũ, không bao giờ hiện điểm của phiên bản trước). Trước đây cache chỉ nằm
trong biến module nên mọi lần tải lại trang đều nã lại API cho cả thư viện. Đo sau khi sửa: mở
lại bảng sau khi tải lại trang có kết quả trong **1,03s**.

Kiểm chứng đầy đủ bằng Playwright (`pw-python`, xem CLAUDE.md): bấm nút → 12 điểm hiện ra → giả
lập deploy mới → **bảng còn nguyên 12 điểm** → bấm "Tải lại" → trang tải lại → mở lại bảng ra
ngay từ cache. Và ngắt mạng sau lần truy cập đầu, app vẫn mở được.

### 📏 Số đầu tiên cho luật "đáng đi" — và cổng đo trực tiếp sinh ra từ đó (07/09/2026)

Vòng kiểm chứng tự chạy từ 03/09 đã gom đủ 5 ngày bản chụp. `calibrate.ts` lần đầu chấm được
**96 cặp** (93 nhãn vệ tinh, 3 báo cáo người đi):

```
                              đúng   bắt được   khi app báo CÓ thì đúng
theo TRẠNG THÁI                72%      13%              5%     (1 đúng · 7 sót · 20 nhầm)
theo NGƯỠNG ĐIỂM CŨ ≥60        90%       0%              0%     (0 đúng · 8 sót ·  2 nhầm)
theo LUẬT ĐÁNG ĐI (engine-2.8) 75%      13%              6%     (1 đúng · 7 sót · 17 nhầm)
```

Ngưỡng điểm cũ vẫn "đúng 90%" theo đúng cái cách đã nói từ đầu: **không bao giờ khuyên đi**.

⚠️ Trước khi đọc bảng này: một lỗi của chính commit engine-2.8 làm nó vô nghĩa suốt mấy ngày —
`Row` có trường `deltaH/worthGoing` nhưng **không chỗ nào điền vào**, nên luật mới luôn trả
false và calibrate báo "96/96 dòng thiếu ΔH, bắt được 0%". Bản chụp thì CÓ đủ hai trường.
Cùng loại lỗi câm với `relative_humidity_2m` ngày 25/8: thêm trường mới mà quên nối dây, số
liệu vẫn ra, chỉ là ra số của một câu hỏi khác. Và calibrate nay **tính lại** luật từ nguyên
liệu chứ không đọc cờ đã đóng băng trong bản chụp — nếu đọc cờ cũ thì mọi thay đổi luật đều
trông như "không có tác dụng gì" (đã mắc bẫy này một lần khi thử siết ngưỡng).

**11/17 ca báo nhầm là kiểu `FOGGED_IN`** — vệ tinh báo đỉnh mây nằm TRÊN đầu người đứng, còn
app nói "bạn đứng trên biển mây". Soi Fansipan 07/09:

```
sáu mô hình đặt đỉnh mây 3.138 · 3.138 · 3.138 · 3.148 · 3.140 · 3.141 m
người đứng 3.143m  ⇒  ΔH = +5m  ⇒  app KHUYÊN ĐI
mà chính mực 3.138m đó có RH 88-100%, mây 35-100%   ⇒ người ta đứng GIỮA đám mây
vệ tinh: FOGGED_IN, đỉnh mây 3.915m
```

Engine so chỗ đứng với MẶT BIỂN MÂY THẤP nhưng chưa bao giờ hỏi liệu người đó có đang nằm
trong một TẦNG MÂY KHÁC ngay tại cao độ của mình. Thêm `observerInCloud()`: mực áp suất gần
chỗ đứng nhất (trong ±250m) mà có mây ≥45% hoặc RH ≥90% thì nhãn là `FOG`, bất kể ΔH.
**Số đọc trực tiếp thắng số suy ra** — đỉnh mây là ước lượng ±200m, còn "mực này có mây" là
mô hình nói thẳng. Cổng chỉ làm app bi quan hơn, không có đường nào ngược lại.

*Đã đo trước khi giữ:*

```
Fansipan 07/09          FLUCTUATING "đáng đi"  →  FOG "không khuyên"  ✅ khớp vệ tinh
4 ngày đã kiểm chứng    23/8 STATIC ΔH 617m · 24/8 FLOWING ΔH 704m · 25/8 ΔH 332m → VẪN khuyên đi
                        (Suôi Thầu 25/8 nay ra RAIN, nhưng engine CŨ trên cùng dữ liệu cũng ra
                         RAIN — do Open-Meteo đổi dữ liệu ngày quá khứ, không phải do cổng này)
toàn thư viện 08/09     10/55 điểm (18%) đổi SEA → FOG
```

18% là nhiều hơn hẳn các cổng trước (5%), nhưng 08/09 là ngày ẩm diện rộng và nhóm đổi nhãn
toàn đỉnh cao (Fansipan, Pusilung, Putaleng, A Pa Chải, Ô Quy Hồ) — đúng nhóm nhô vào tầng mây.
Cần theo dõi tiếp: nếu những ngày quang mà vẫn bật 18% thì ngưỡng RH 90% là quá rộng.

#### ✅ engine-2.8.2 (09/09/2026) — siết biên "đáng đi" lên ΔH > 100m

Ngày 07/09 tôi đã trình bày biên 250m như một đánh đổi *độ nhạy lấy độ chính xác*, viện cớ nó
loại Tà Xùa 24/8 (ΔH 154m). **Con số đó không đứng vững.** Tính lại chính ngày đó bằng engine
hôm nay: ΔH = **665m** (đáy 700m PROFILE, đỉnh mây GFS 935m, người đứng 1.600m) — cả đường
6 mô hình (`hindcast.ts`) lẫn đường xếp hạng 3 mô hình (`replay-engine.ts`) đều ra 665m. Ngày
đó chưa bao giờ nằm gần biên.

Người dùng chọn 100m. Đo lại tử tế trước khi làm (`scripts/sweep-deltah.ts`, 96 cặp, 73/96
dòng đã tính lại bằng engine hiện tại):

```
ΔH >    khuyên đi   đúng   nhầm   bỏ sót   chính xác   bắt được
   0m         19      4     15       4        21%        50%
  50m         18      4     14       4        22%        50%
 100m         18      4     14       4        22%        50%   ← chọn
 250m         16      4     12       4        25%        50%
 500m         15      4     11       4        27%        50%
```

**Không ngưỡng nào trong 0-500m làm mất một ngày thật nào.** In hết các ngày sự thật CÓ biển mây
thì rõ vì sao:

```
ΔH  -1107m FOG      07/09 Tây Côn Lĩnh        ΔH   503m STATIC  23/8 Tà Xùa
ΔH   -778m FOG      06/09 Sa Mu - U Bò        ΔH   513m STATIC  25/8 Tà Xùa
ΔH   -556m FOG      06/09 Tà Chì Nhù          ΔH   665m STATIC  24/8 Tà Xùa
ΔH   -488m FOG      06/09 Putaleng            ΔH   777m STATIC  06/09 Phu Sa Phìn
```

Ngày thật hoặc nằm SÂU DƯỚI mây (đã bị `FOG` loại), hoặc ở trên rất cao. Trống hoác khoảng
0-500m.

**Vậy sao không lấy luôn 500m cho chính xác hơn?** Vì `ΔH ≤ (chỗ đứng − đáy thung lũng)` —
mặt mây không bao giờ nằm dưới đáy. Đo cả thư viện:

```
chênh cao chỗ đứng − đáy < 100m:  1/56 điểm      < 250m:  6/56 điểm      < 500m: 18/56 điểm
   Linh Quy Pháp Ấn 121m · Đồi chè Cầu Đất 150m · Măng Đen 169m · Tà Năng 176m · Xím Vàng 250m
```

Ngưỡng lớn **không "chính xác hơn"** — nó xoá sổ vĩnh viễn cả nhóm điểm địa hình thoải, bất kể
thời tiết, và phần "báo nhầm giảm" chính là tiếng của nhóm đó bị bịt miệng. 500m sẽ khiến
18/56 điểm không bao giờ được khuyên đi nữa. 100m chỉ chạm đúng 1 điểm (Làng Nhì, chênh 5m —
vốn đã bị rào `MIN_GAP_M` loại). Đây mới là lý do dừng ở 100m, không phải bảng số ở trên.

**Đừng tưởng ΔH là dụng cụ chính xác.** So bản chụp dự báo tối hôm trước với chính engine tính
lại ngày đó sau khi đã xảy ra (55 cặp):

```
trung vị |lệch| 207m · trung bình 537m · lớn nhất 2.571m · 30/55 ca lệch > 100m
06/09 Đèo Khau Phạ: dự báo ΔH -24m FLUCTUATING → tính lại -2.595m FOG
06/09 Bình Liêu:    dự báo ΔH -1.411m FOG      → tính lại  +665m DISSIPATING
```

Biên 100m vì thế là **cái chặn "app bảo bạn đứng trên mặt mây 5m"**, không phải một hệ số
chỉnh cho vừa dữ liệu. Ai định chỉnh nó theo bước 10-50m: sai số đầu vào là 200m.

Giới hạn phải nói thẳng: bằng chứng dương hiện có **4 ngày, 3 trong đó cùng một điểm (Tà Xùa)**.
Bảng trên không đủ để nói 100m tốt hơn 50m hay 250m — nó chỉ đủ để nói cả ba đều không mất gì.
Có thêm báo cáo thực địa thì chạy lại `sweep-deltah.ts` trước khi động vào hằng số.

#### Hai công cụ sinh ra từ lần này

- `scripts/replay-engine.ts` — tính lại bằng ENGINE HIỆN TẠI đúng những (điểm × ngày) đã có sự
  thật, ghi ra file cache. **Bắt buộc** khi thử luật mới trên lịch sử: bản chụp 22-25/8 do
  engine-2.2/2.3 tạo, KHÔNG hề có ΔH — quét ngưỡng trên chúng chỉ ra "không khuyên" ở mọi
  ngưỡng, tức là một cận dưới giả. Chia lô 20 điểm/lần và nghỉ 2s: gọi 56 toạ độ một URL bị
  tính là 56 lượt và ăn HTTP 429 ngay.
- `scripts/sweep-deltah.ts` — quét ngưỡng, in luôn *mỗi bước siết thì MẤT ngày nào* (đúng hay
  nhầm). Bảng tổng không cho thấy điều đó; danh sách mất mát mới là thứ ra quyết định.

⚠️ **`ENGINE_VERSION` đã quên đổi ở engine-2.8b.** Nó là khoá cache xếp hạng và là nhãn đóng vào
bản chụp; quên đổi thì người dùng cũ giữ điểm của luật cũ (tới 30 phút) và calibrate không phân
biệt nổi số của luật nào. Đã sửa thành 2.8.1 rồi 2.8.2. Đổi hành vi chấm ⇒ đổi số này, luôn.

### ✅ engine-2.8.3 (10-11/09/2026) — ba sửa trung thực số liệu

Bản này do Antigravity làm trong lúc phiên Claude nghỉ, Claude đo lại rồi tách thành từng
commit. Ba việc dưới đây không đụng tới thứ app khuyên người dùng, chỉ sửa chỗ đang nói sai:

1. **Không chép điểm sương thung lũng lên cho đỉnh núi.** `td_obs_dawn` trước đây thiếu số
   thì lấy `td_valley` — chênh nhau cả nghìn mét độ cao. Nay trả `NaN`, UI hiện `N/A`. (Đã
   lần dấu: biến này chỉ dùng để hiển thị, `NaN` không chui vào phép tính nào.)
2. **`seaCapped` dùng geopotential 925hPa THẬT** thay hằng số 760m. Thung lũng 780m vẫn nằm
   dưới mực 925 nếu hôm đó geopotential là 810m — dùng số cứng thì kết luận ngược.
3. **Lỗi ngoại vi không còn im lặng.** `.catch(() => ({}))` ở `fetchEnsembleDays` /
   `fetchAirQualityDays` nay `console.warn` trước khi bỏ qua.

Kèm một sửa giao diện: khối phán quyết đặt **kết luận vật lý trước, điểm số sau** và gọi
đúng tên là "điểm nguyên liệu". Từ engine-2.8 app có thể khuyên đi một ngày 14/100; để con
số trần trụi ở đầu dòng thì người đọc tưởng app tự mâu thuẫn.

#### Chống "nghịch nhiệt ma" — thôi cộng điểm khống

Cột khí ẩm giảm đều ~5°C/km vẫn ấm dần so với chuẩn 6.5°C/km, nên anomaly dương và tăng đều.
Engine cũ gọi đó là "nghịch nhiệt vừa" và cộng +10, dù không có nắp nào nhốt mây. Nay: `ramp`
bật mà `capLayerBase` cũng không tìm ra tầng nào Γ ≤ 3,5°C/km thì hạ `strength` xuống Weak/None.

Tác động thật lớn hơn "+10 điểm oan" như bản khai của agy nói: `strength` còn quyết định
`inversionObserved`, biến này đổi hình phạt "mây cao ban đêm" từ −5 thành −15 — một ngày có
thể mất tới ~20 điểm.

Đo trên toàn thư viện rạng sáng 11/09, **cùng một mẻ dữ liệu chấm bằng hai engine**:

```
đổi nhãn 0/55  ·  đổi kết luận "đáng đi" 0/55  ·  lệch điểm trung bình 0,9
```

Không đổi lời khuyên nào; chỉ thôi cộng điểm khống. Điểm vẫn quan trọng vì nó xếp thứ tự và
tô màu, và vì mọi bản chụp kiểm chứng từ nay ghi con số mới.

#### Bịt lỗ mù 2.200-2.850m của `observerInCloud` — bằng NỘI SUY, và biết rõ giá của nó

Giữa 800hPa (~1.950m) và 700hPa (~3.100m) không có mực nào, nên mọi đỉnh 2.200-2.850m luôn
trả `null` ⇒ `observerInCloud` luôn `false`. Cả nhóm đỉnh trekking cao nhất Tây Bắc — Tà Chì
Nhù, Sa Mu, Lảo Thẩn, Cú Nhù San, Ngũ Chỉ Sơn — chưa từng được hỏi "chỗ tôi đứng có mây không".
Nay nội suy tuyến tính RH/mây giữa hai mực kẹp, **chỉ khi chúng cách nhau ≤1.300m**
(`LEVEL_GAP_INTERP_MAX`): con số đó vừa ôm khe 800↔700 của GFS/ICON/UKMO (~1.120m) và vừa CHẶN
khe 850↔700 của ECMWF/JMA/AIFS (~1.640m) — ba mô hình không có mực 800, nội suy qua 1,6km là bịa.

Đo, cùng một mẻ dữ liệu chấm bằng hai engine:

```
Toàn thư viện 11/09 (55 điểm)   đổi nhãn 6/55, TẤT CẢ sang FOG · mất "đáng đi" 1 · thêm 0
Ngày có sự thật 06+07/09        báo nhầm 8 → 6   ·  bỏ sót 5 → 5
```

Bỏ được hai lượt khuyên sai (Lảo Thẩn và Cú Nhù San 07/09, vệ tinh nói không có biển mây) mà
không thêm ca bỏ sót nào.

**Ba điều phải nhớ trước khi tin bảng này.** Một: nội suy RH qua 1.100m là phép ĐOÁN, không
phải số đọc — đã bắt gặp nó nói "trong mây" cho Sa Mu 06/09, ngày vệ tinh xác nhận biển mây
với đỉnh mây 2.346m trong khi người đứng 2.756m, tức TRÊN mặt mây 410m. Hai: trong 47 dòng có
sự thật chỉ có **5 dòng thật sự CÓ biển mây, và app trượt cả 5 ở mọi phiên bản** — nghĩa là ta
mới chỉ đo được mặt báo nhầm; mọi thay đổi khiến app nói "không" nhiều hơn đều đẹp trên bảng
này. Ba: thay đổi này chỉ đi MỘT CHIỀU, chưa lần nào thêm một nhãn biển mây.

⚠️ Việc cần làm để bảng trên có nghĩa: kiếm cho được ngày mà một đỉnh ≥2.400m THẬT SỰ có biển
mây và app phải nói đúng. Chưa có mẫu đó thì không biết cái giá của nhóm sửa này.

#### Gió tại cao độ người đứng — và vì sao KHÔNG lấy thẳng gió 700hPa

Mọi đỉnh trước đây đều chấm bằng gió 850hPa (~1.500m). Với Fansipan 3.143m hay Tà Chì Nhù
2.979m đó là gió ở lưng chừng dưới chân núi. Bản Antigravity thay hẳn bằng gió 700hPa cho đỉnh
≥2.200m. **Không giữ cách đó**: thang `assessWind` được hiệu chỉnh CHO GIÓ 850hPa — ngưỡng
Destructive >26km/h đến từ đúng một ngày kiểm chứng (Tà Xùa 23/8, 22-23km/h mà biển mây nằm
nguyên) — đổ số của tầng 3.100m vào thang đó là đổi thước mà giữ nguyên vạch.

Nay nội suy tuyến tính 850↔700 về ĐÚNG cao độ người đứng (`HIGH_PEAK_WIND_ALT = 2200`): đỉnh
2.400m nhận gió của 2.400m. Đo cả hai cách, cùng một mẻ dữ liệu:

```
                          toàn thư viện 11/09        ngày có sự thật 06+07/09
gió 700hPa thẳng (agy)    10/55 đổi nhãn, mất 2 ✅    báo nhầm 8 → 5, bỏ sót 5 → 5
nội suy về chỗ đứng       10/55 đổi nhãn, mất 2 ✅    báo nhầm 8 → 5, bỏ sót 5 → 5
```

Giống hệt nhau — hôm đó gió mạnh thật, nội suy hay không cũng vượt vạch. Giữ bản nội suy vì nó
không mượn số của chỗ khác, chứ không phải vì nó đo tốt hơn.

⚠️ Hệ quả phải theo dõi: 10/55 điểm cao chuyển sang DISSIPATING/FOG trong MỘT ngày bình thường.
Nếu Fansipan hay Tà Chì Nhù thật sự có biển mây, nay ta sẽ trượt — và bộ kiểm chứng hiện không
có lấy một ví dụ nào để cảnh báo, vì app vốn đã trượt sạch nhóm đỉnh cao (5/5 ngày CÓ biển mây
trong mẫu đều bị trượt ở MỌI phiên bản). Bảng số ở trên mới chỉ đo được mặt báo nhầm.

#### 🚨 Open-Meteo SỬA LẠI quá khứ nhiều hơn ta tưởng — hindcast ngày cũ không dùng để chấm được

Hôm qua đo được ΔH lệch trung vị 207m giữa bản chụp dự báo và bản tính lại. Hôm nay, cùng một
script, cùng một điểm, cách nhau vài giờ:

```
Tà Xùa 23/8   sáng 10/09: STATIC      ΔH  +617m  ⇒ đáng đi
              tối 11/09:  FOG         ΔH −1.919m ⇒ không
Tà Xùa 25/8   sáng 10/09: FLUCTUATING ΔH  +332m  ⇒ đáng đi
              tối 11/09:  FOG         ΔH −1.909m ⇒ không
```

Đã kiểm: chạy lại bằng CHÍNH engine-2.8.2 ở worktree cũng ra y hệt số mới ⇒ **không phải do
thay đổi code, mà do dữ liệu quá khứ bị viết lại**. Ba ngày Tà Xùa này là bằng chứng thực địa
mạnh nhất đang có, và giờ API kể một câu chuyện khác hẳn về chúng.

Rút ra: **chỉ bản chụp `data/observations/*-forecast.json` mới là bằng chứng**. Mọi phép "tính
lại ngày cũ" (`replay-engine.ts`, `hindcast.ts`) chỉ dùng để SO CÁC LUẬT với nhau trên cùng
một mẻ dữ liệu, tuyệt đối không dùng làm sự thật, và không được kết luận "engine đã tệ đi" từ
chúng. Vòng chụp hằng ngày vì thế không phải chuyện tiện tay — nó là thứ duy nhất giữ được
bằng chứng trước khi API viết đè.

### 📉 Vì sao ĐIỂM vẫn thấp — và vì sao KHÔNG phải do hiệu chỉnh mùa

Giả thuyết đầu tiên của tôi (trần điểm mùa hè khoá ngưỡng 60) **đã bị số liệu bác bỏ**. Chấm
một ngày biển mây HOÀN HẢO bằng cùng một bộ số, chỉ đổi tháng:

```
01/2026  79/100 ✅      07/2026  73/100 ✅      10/2026  87/100 ✅
04/2026  76/100 ✅      08/2026  73/100 ✅      11/2026  87/100 ✅
```

Mùa hè vẫn thừa sức vượt 60. Và ngày Tà Xùa 25/8 thật, nếu đem sang tháng 10, cũng chỉ lên
48 — **bỏ sạch hiệu chỉnh mùa vẫn không tới 60**. Nguyên nhân điểm thấp là nguyên liệu thật:
T−Td 1,0°C (không phải ~0), RH lớp biển mây 88% (không phải 98%), mây cao ban đêm 95%, có mưa.

Kết luận đúng: **thang điểm đang đo "nguyên liệu sương bức xạ có sách vở không", chứ không đo
"có biển mây dưới chân bạn không".** Hai thứ này TÁCH NHAU trong mùa mưa: biển mây sau mưa
hình thành nhờ nạp ẩm + nắp nghịch nhiệt, không nhờ trời quang bức xạ đêm.

⚠️ **Bằng chứng cho thấy chỗ cần sửa tiếp: ΔH — khoảng cách từ chỗ đứng xuống mặt mây, con số
quyết định nhất — hiện đóng góp ĐÚNG 0 điểm.** Nó chỉ chọn nhãn, không vào điểm. Một ngày
đứng cao hơn mặt mây 500m và một ngày chìm dưới mặt mây 20m có thể ra cùng một điểm.
**CHƯA sửa** vì thêm trọng số cho ΔH là quyết định có hệ số tuỳ chọn, mà bộ kiểm chứng hiện
tại **toàn mẫu dương tính** (5/5 báo cáo đều là ngày CÓ biển mây, 0 báo cáo ngày KHÔNG có).
Đặt hệ số bằng cảm tính rồi tự chấm điểm mình trên 5 ca đã dùng để sửa engine thì chắc chắn
"đẹp" mà vô nghĩa. Cần báo cáo ngày KHÔNG có biển mây trước.

### 🔒 Bản chụp dự báo là BẰNG CHỨNG, không được ghi đè

`snapshot-forecast.ts` nay **từ chối đè** file đã có (cần `--force`). Lý do: bản chụp trả lời câu
"app đã nói gì TRƯỚC khi biết sự thật". Nếu chạy lại đè được thì mỗi engine mới sẽ tự viết lại
lịch sử của chính nó rồi chấm điểm mình trên đó — bảng hiệu chuẩn thành vô nghĩa mà không ai thấy.
Muốn xem engine hiện tại chấm ngày cũ ra sao thì dùng `hindcast.ts` và ghi vào file `hindcast-*.json`
có nhãn rõ ràng.

### 🚧 Ngưỡng "đáng đi" 60/100 trong mùa mưa — (LỊCH SỬ: đã thay bằng engine-2.8, giữ lại để hiểu vì sao từng không đụng)

Ngày 25/8, **0/50 điểm** đạt 60 dù người dùng nhìn thấy biển mây thật. **Năm** báo cáo thực địa đã có
đều là ngày CÓ biển mây. Bảng chấm lại bằng engine-2.6 ở trên cho thêm một dữ kiện: **4/5 ca nay
đúng NHÃN nhưng 0/5 vượt ngưỡng** — tức ngưỡng theo điểm đang phủ nhận chính kết luận của engine. Cám dỗ là hạ ngưỡng hoặc nới hiệu chỉnh mùa — **không làm**, vì bộ báo cáo
hiện tại **thiên lệch một chiều theo đúng nghĩa thống kê**: người ta báo hôm thấy mây, không báo hôm
leo lên rồi về không. Hiệu chỉnh ngưỡng bằng toàn mẫu dương tính chỉ đảm bảo một điều — app sẽ khuyên
đi mọi ngày. Cần báo cáo **ngày KHÔNG có** trước đã.

### 📈 Theo dõi độ chính xác TỪNG MÔ HÌNH (chưa trọng số hoá)

`snapshot-forecast.ts` nay lưu kết quả **từng mô hình**, `calibrate.ts` in bảng đúng/sai
theo mô hình. Số liệu hiện tại (n=5, quá ít để kết luận):

```
gfs_seamless    5/5
icon_seamless   1/5
ukmo_seamless   1/5
```

⚠️ **KHÔNG trọng số hoá mô hình cho tới khi có ≥30 ngày kiểm chứng**, và phải gồm cả ngày
CÓ lẫn ngày KHÔNG có biển mây — hiện 3/5 dòng là ngày dễ (không có biển mây). Trọng số hoá
sớm dựa trên vài ngày ở một điểm là cách chắc chắn nhất để tạo ra một lỗi hệ thống mới.

### 📍 Gỡ SẠCH 5 điểm `needsReview` (03/09/2026) — thư viện lần đầu 0 điểm bị loại

Năm điểm bị loại khỏi bảng xếp hạng vì toạ độ trỏ nhầm chỗ; trước đây chỗ này chờ người dùng
gửi plus code (hỏi 4 lần không có). Nay xong cả 5 — **3 tự tra được, 2 do người dùng gửi mã.**

| điểm | kết quả | nguồn |
|---|---|---|
| **Lũng Vân** | (20.5976, 105.1529) DEM **1202m** | xã Lũng Vân **đã sáp nhập thành xã Vân Sơn năm 2020** nên OSM không còn tên cũ; tra tên mới ra relation rồi quét DEM trong xã |
| **Hang Kia - Pà Cò** | (20.7366, 104.8833) **1483m** | node OSM `Núi Hang Kia` ele=1483 (DEM 1406m) |
| **Đồng Văn** | (23.2400, 105.3762) DEM **1511m** | quét DEM đoạn đèo Mã Pí Lèng; hẻm Nho Quế bên dưới 477m ⇒ chênh cao 1.034m |
| **Bản Hang Đá** | (22.3234, 103.8821) DEM **1590m** | plus code `8VFJ+9V2` (Tả Van, Lào Cai) người dùng gửi |
| ~~Pu Nhi Farm~~ → **Trạm phát sóng Tà Xùa** | (21.2764, 104.4239) DEM **1753m** | plus code `7CGF+HH` người dùng gửi. Pu Nhi bị **gỡ hẳn**: ~700m, chỉ cao hơn đáy thung lũng ~400m, không đáng là điểm săn mây |

`npx vite-node scripts/audit-coords.ts` → **0/56 điểm lệch >300m so với DEM.**

#### Ba bài học, ghi lại vì cả ba sẽ tái diễn

1. **Địa danh Việt Nam đổi tên nhanh hơn OSM.** Lũng Vân tra mãi không ra không phải vì OSM
   thiếu, mà vì cái tên đó đã bị xoá khỏi bản đồ hành chính từ 2020 (nay là xã Vân Sơn). Tra
   không thấy thì hỏi "đơn vị hành chính này còn tồn tại không" TRƯỚC khi kết luận "OSM không có".
2. **"Điểm cao nhất quanh đây" là quy tắc chọn SAI khi đã biết độ cao mục tiêu.** Cao nhất
   quanh Bắc Yên là sống Tà Xùa 1.916m chứ không phải đồi Pu Nhi; cao nhất quanh Hầu Thào là
   sườn Fansipan 2.638m chứ không phải bản Hang Đá. `find-spot.ts` nay nhận **mốc độ cao** và
   chọn theo ĐỘ KHỚP.
3. ⚠️ **Nguồn du lịch tiếng Việt chép chéo nhau — hai trang cùng sai vẫn trông như hai nguồn
   độc lập.** Tôi tra ra "bản Hang Đá: thôn Hầu Chư Ngài, xã Mường Hoa, trên 1.800m", quét DEM
   trong xã Mường Hoa thấy có đúng nền 1.799m nên tưởng đã được hai nguồn xác nhận, và suýt
   chốt. Plus code thật của người dùng chỉ ra **xã Tả Van, 1.590m** — sai cả xã lẫn ~200m độ
   cao. "DEM xác nhận có nền đúng độ cao đó trong xã" KHÔNG phải bằng chứng: gần như xã miền
   núi nào cũng có nền ở mọi độ cao trong khoảng của nó.

`scripts/pluscode.ts` (mới) giải plus code đầy đủ lẫn NGẮN. Mã ngắn ("8VFJ+9V2, Tả Van") bỏ
4 ký tự đầu, phải khôi phục từ địa danh tham chiếu rồi **dịch ô nếu tâm ô rơi xa điểm tham
chiếu hơn nửa ô** — bước này giải tay hay quên và lệch nguyên một ô 1° (~110km). Bộ giải được
kiểm chứng bằng mã Suôi Thầu đã biết: `7PJ6MCJQ+7R` → 22.680687, 104.439562, DEM 1199m, khớp
đúng số đã ghi trong thư viện từ 25/8.

### 🗺️ Toạ độ điểm — quy tắc bắt buộc khi thêm/sửa

- Toạ độ phải có **nguồn** ghi ngay trong comment (node OSM có tên, hoặc cực đại DEM có mốc đối chiếu).
- Chạy `npx vite-node scripts/snapshot-dem.ts` rồi `npm test`: lệch |khai báo − DEM| > 400m là **fail**.
- Không chắc thì gắn `needsReview: '<lý do>'` — điểm đó **bị loại khỏi bảng xếp hạng** và
  hiện cảnh báo khi phân tích. Thà nói "chưa chắc chỗ này" còn hơn dự báo tự tin cho nhầm nơi.
- Đỉnh núi: toạ độ = chóp, độ cao = số đo đã công bố (DEM 90m làm tù đỉnh nhọn 100–250m là bình thường).
  Bản/đèo/điểm ngắm: toạ độ = chính chỗ đứng, độ cao = **đúng DEM** (đừng lấy số quảng cáo du lịch).

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

## 🏗️ Luồng dữ liệu v5

```
InputForm → analyzeLocation (DB → Nominatim/Open-Meteo geocode → AI cuối cùng, có nhãn)
  → LocationConfirm (hiện nguồn + độ tin cậy)
  → fetchMountainWeather:  2 ĐIỂM (thung lũng + vị trí đứng) × 6 MÔ HÌNH (ECMWF/GFS/ICON/JMA/UKMO/AIFS)
        1 call/điểm (&elevation= để API downscale nhiệt theo độ cao thật), 41 biến hourly
        (profile 7 mực T/RH/cloud/geopotential + BLH/freezing/lifted) + sunrise/sunset, cache 30 phút
  → cloudScoreEngine.computeDayForecast (per-model score/status → median + đa số + spread THẬT)
  → geminiService.generateNarrative (AI viết lời từ engine digest; fail → văn bản engine,
        aiNarrative=false, app vẫn đầy đủ số liệu)
  → AnalysisResult (badge chất lượng ngày, panel "Vì sao điểm này", ΔH tương tác, GPX tọa độ thật)
  → historyService (localStorage 5 lần gần nhất — nền tảng cho vòng kiểm chứng sau chuyến đi)
```

## 📁 File chính

| File | Trách nhiệm |
| :--- | :--- |
| `services/cloudScoreEngine.ts` | **Engine chấm điểm deterministic** — toàn bộ Modules 1–8 cũ chuyển thành code: inversion/LCL/cloud-top/FSI/VRII/gió-theo-zone/mùa/trạng thái/điểm + reasons từng yếu tố. |
| `services/weatherService.ts` | Fetch Open-Meteo đa mô hình 2 điểm, gộp cửa sổ đêm+bình minh (`aggregateDayModel`), nhãn DataQuality theo horizon, DEM valley/point elevation, cache TTL. KHÔNG có synthetic data. |
| `services/geminiService.ts` | Phân giải địa danh nhiều tầng có nhãn nguồn + lời bình AI (schema chỉ chứa trường văn bản). |
| `services/modelDiscoveryService.ts` | Discover model Gemini động + executeWithFallback (429/404/5xx retry, 401/403 dừng). |
| `services/historyService.ts` | Lưu/mở lại các lần dự báo (localStorage). |
| `services/rankingService.ts` | "Đêm nay đi đâu": batch 1 call toàn thư viện (lat/lon/elevation dạng danh sách — API trả JSON array theo thứ tự), CÙNG 41 biến HOURLY_VARS với bản đầy đủ (GFS+ICON+UKMO đủ 7 tầng), đáy thung lũng ưu tiên profile VALLEY đã xác thực rồi mới DEM (cache localStorage vĩnh viễn), chấm bằng CHÍNH scoreOneModel/combineModels. Đo lệch vs bản đầy đủ: `npx vite-node scripts/compare-rank-vs-full.ts` (~4/100 điểm, khác biệt còn lại = 3 vs 6 model). |
| `services/astroService.ts` | Trăng/bình minh thiên văn cục bộ (suncalc) — pha, độ sáng, moonset, cửa sổ Milky Way; deterministic, có golden test. |
| `components/SatellitePanel.tsx` | Vòng lặp ảnh Himawari-9 Band13 hồng ngoại của JMA (`se1_b13_{HHMM}.jpg`, UTC bước 10 phút, lùi 40 phút cho chắc ảnh đã đăng, `<img>` thuần nên không vướng CORS); khung lỗi bị bỏ qua, không ảnh thay thế. |
| `components/CloudLayerChart.tsx` | Heatmap mây tầng × giờ bằng CSS grid (KHÔNG SVG — chữ không bị co trên mobile), thang độ cao tuyến tính theo geopotential thật, vạch vị trí đứng/thung lũng/bình minh. |
| `components/RadarPanel.tsx` | Radar mưa RainViewer (weather-maps.json, CORS *; composite phủ VN thật) trên nền 3×3 tile OSM lọc màu tối; khung nowcast dán nhãn "dự báo". |
| `services/verificationService.ts` | Vòng đối chiếu: dự báo đã lưu vs ERA5 archive (cloud_cover_low 4-9h, trễ ~5 ngày, ngưỡng biển mây 40%); ngày chưa có ERA5 → hit=null, không phán. |
| `components/VerificationPanel.tsx` | UI trúng/trượt/chờ từng ngày + tổng kết; nói rõ ERA5 là proxy, không phải mắt thấy. |
| `tests/engine.test.ts` | 125 golden tests: vật lý & chấm điểm (kể cả profile geopotential thật, lớp mây liên tục, BLH), bậc thang fallback model, lọc model ảnh, múi giờ VN, alias thư viện (vitest). |
| `constants/mountains.ts`, `constants.ts` | **58 điểm toàn quốc** đã xác thực + mặt cắt địa hình (tài sản quý — giữ cập nhật). |
| `components/AnalysisResult.tsx` | UI kết quả **verdict-first**: khối phán quyết ĐI/KHÔNG ở đầu trang, thẻ ngày là `<details>` thu gọn (chỉ ngày tốt nhất mở sẵn — trang từng dài 11.1 màn hình mobile, nay ~5.8), quality badge, "Vì sao", consensus thật, ΔH theo waypoint, GPX/TXT/PNG export, banner dữ liệu cũ. |

## 🛠️ Quy tắc dev

1. **Mọi call AI qua `executeWithFallback`** — không gọi `ai.models.generateContent` trực tiếp.
2. **Không thêm lại dữ liệu giả dưới mọi hình thức** (số mặc định "an toàn", consensus cứng,
   tọa độ placeholder...). Thiếu dữ liệu = nói thật là thiếu.
3. **Không giao phép tính cho AI.** Cần chỉ số mới → thêm vào engine + viết golden test.
4. **Prompt AI không được gợi ý AI "tìm kiếm Internet"** — model không có tool search trong
   app này; câu lệnh như vậy chỉ tạo ảo giác "đã nghiên cứu".
5. Sửa engine xong PHẢI chạy: `npm run lint && npm test && npm run build`.
6. UI giữ glassmorphism dark-mode; Tailwind build-time (index.css, không CDN).
   **Trang kết quả phải verdict-first**: thêm khối mới thì đặt SAU phán quyết và mặc định
   thu gọn (`<details>`); Header nhận `compact` khi đang xem kết quả (bỏ logo+chip ~400px).
   Điểm chọn từ thư viện xác thực (source='DB') bỏ qua màn "Xác nhận địa điểm".
   **A11y bắt buộc:** phần tử bấm được là `<button>` thật với aria-label, tap target
   ≥44px (min-h-11), không dùng chữ <10px, modal phải có role=dialog + Esc + khóa scroll.
   Nhãn chữ TRONG SVG viewBox bị co theo màn hình → ẩn ở mobile (`hidden md:block`),
   thông tin phải có ở HTML bên ngoài. Tên file tải về dùng `vnSlug` (bỏ dấu đúng cách).
7. **Mọi thay đổi có ý nghĩa phải cập nhật README.md + AGENTS.md trong CÙNG commit và
   push lên GitHub ngay** — tài liệu lệch code là coi như chưa xong việc (yêu cầu của chủ dự án).
8. **Thêm điểm săn mây mới vào thư viện** theo quy trình xác minh: (a) OSM/Nominatim, hoặc
   (b) giải mã plus code Google Maps user cung cấp (OLC alphabet `23456789CFGHJMPQRVWX`,
   khôi phục prefix từ xã tham chiếu, BẮT BUỘC bước hiệu chỉnh nearest-to-reference ±nửa ô
   — từng suýt sai 111km với xã nằm ranh ô 1°), (c) đối chiếu độ cao DEM (Open-Meteo
   Elevation API). Không xác minh được → KHÔNG thêm; xin user plus code.
9. **Fallback model AI**: giữ bậc thang chất lượng trong `fallbackPriority` (Lite gần cuối,
   **Gemma −1000000 = tuyệt đối cuối** — bug thật: "gemma-3-27b" bắt số 3 → 30 điểm, chen
   trước gemini-2.5-flash làm user chọn 3.7 Flash bị đưa về Gemma; có test hồi quy), lọc
   model ảnh/Live qua `isTextAnalysisModel`, và luôn hiển thị `modelFallbackNote` khi model
   người dùng chọn bị thay.
   **Không ghim tên model (14/10/2026, khi ra Gemini 4 Argon):** mặc định = `pickDefaultModel`
   = Flash có SỐ phiên bản, ổn định, số cao nhất key thấy (ra 3.9 Flash thì tự lên 3.9) — KHÔNG
   sort chữ cái: bản cũ chọn nhầm `gemini-flash-lite-latest` vì 'f' > '3'. **Alias
   `gemini-flash-latest` KHÔNG làm mặc định nữa (16/10/2026):** anh Phong chọn alias mà kết quả
   ra 2.5 Flash; Google không công bố alias đang trỏ tới bản nào (trang models 13/10 chỉ ghi
   "stable, preview hoặc experimental"). Alias chỉ dùng khi key không thấy bản số nào. Mặc định
   tự dò thì KHÔNG lưu xuống máy (lưu là ghim người dùng ở mặc định cũ); `getStoredModel` xoá
   một lần alias mà bản 14/10 đã tự lưu. Kết quả hiện thêm `→ Google chạy: <modelVersion>` khi
   tên Google báo trong phản hồi khác tên đã gọi, để luôn biết alias phân giải ra bản nào. `classifyTier` xếp
   pro/ultra/argon/thinking vào **Cao cấp**: chỉ chạy khi người dùng tự chọn, không mặc định,
   không vào `buildFallbackChain` (Argon: "not available on the Free tier", đo trang pricing
   14/10). Chuỗi dự phòng chỉ gồm Flash + Gemma cuối; họ model tên mã lạ ('custom') cũng bị
   loại vì chưa biết giá. Ra họ cao cấp mới có tên mã khác thì thêm từ khoá vào `PREMIUM_WORDS`.
   `isTextAnalysisModel` chặn thêm banana/transcribe/translate/lyria/omni/deep-research/antigravity.
10. **Ngày giờ**: mọi phép "hôm nay" dùng `vnTodayStr()` (Asia/Ho_Chi_Minh) — cấm
   `toISOString().split('T')` cho ngày hiển thị (đó là ngày UTC, lùi 1 ngày lúc 0-7h VN).
   Hiển thị 1 ngày cụ thể: `new Date(d + 'T12:00:00+07:00')` (không `new Date(d)` = 0h UTC).
11. **Ngân sách API Open-Meteo** (miễn phí: 600/phút, 5.000/giờ, 10.000/ngày; 1 call ≈
   locations × vars/10 × models): 1 lần xếp hạng ≈ 600+ call quy đổi → BẮT BUỘC cache
   (RANK_CACHE 30 phút) và không thêm biến vào `HOURLY_VARS` nếu engine không đọc.
   Điểm quan sát chỉ xin `OBSERVER_VARS` (5 biến), không xin cả bộ profile.
   Đáy thung lũng dùng chung cache `cloudhunter_valley_dem_v2` (CÓ vân tay lat/lon —
   sửa tọa độ là tự đo lại) giữa xếp hạng và phân tích đầy đủ, tránh 429 chuỗi.
12. **Ngưỡng "đáng đi" = `WORTH_GOING_SCORE`** (engine export) — cấm hard-code 60/65 rời rạc.
   Hòa phiếu trạng thái → trạng thái AN TOÀN hơn thắng (`STATUS_SEVERITY`), không theo thứ tự model.

## 🚀 Backlog gợi ý

1. ~~Vòng kiểm chứng độ chính xác~~ ✅ đã có (verificationService + nút 🔬 trên lịch sử) từ 19/8/2026.
2. ~~Ảnh vệ tinh Himawari~~ ✅ đã có SatellitePanel (JMA se1_b13) từ 19/8/2026; nguồn dự
   phòng nếu JMA đổi format: NASA GIBS WMTS Band13 (`{time}` dùng `default`).
3. ~~PWA offline~~ ✅ đã có (vite-plugin-pwa, registerSW trong index.tsx, cache Open-Meteo NetworkFirst 12h) từ 19/8/2026. LƯU Ý: scope/start_url theo `base` nên build GH Pages và Vercel tự đúng, không cần build riêng.
4. ~~Giờ-theo-giờ~~ ✅ đã có CloudLayerChart (12h hôm trước → 12h) từ 19/8/2026.
5. Mở rộng MOUNTAIN_DB + profile cho núi phía Nam (Lang Biang, Chư Yang Sin, Bà Đen...).

## 🧪 Lệnh kiểm tra

```bash
npm run lint   # tsc --noEmit
npm test       # vitest — 125 golden tests engine
npm run build  # vite build (Tailwind build-time, copy vercel.json vào dist)
```

Deploy: push `main` → GitHub Pages (base `/cloudhunter/`) + Vercel (huntercloud.vercel.app,
base `/` qua env VERCEL). Nhánh `gh-pages` bị Vercel bỏ qua nhờ vercel.json nằm trong dist.
