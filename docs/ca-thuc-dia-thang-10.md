> Tách từ AGENTS.md ngày 30/10/2026, nguyên văn.

# Các ca thực địa tháng 10/2026, ngày diện rộng, mức điểm >= 65, estimateCloudTop 30/10

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
**Kiểm lại sau 2 tuần (29/10/2026):** trong 17 ngày (`13->29/10`), trang chỉ đăng ảnh `fansipan-*` ở **6/17 ngày** (`13, 14, 15, 23, 26, 29/10` - bỏ trống liền 7 ngày `16->22/10`), trong khi nguồn bài Facebook hằng ngày tại Fansipan đã thu tự động mỗi sáng cùng bộ ảnh Timemark. Kết luận: **không dựng job định kỳ riêng** cho trang này; chỉ tra cứu bổ sung khi cần (ngày `29/10` có bộ 6 ảnh Timemark `07:27` xác nhận biển mây dày dưới đỉnh ~2.880m trong khi cờ trên đỉnh 3.143m bay ngang theo gió tầng trên nắp nghịch nhiệt - đã ghi vào `field-reports.json`).

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

**ĐÃ DỰNG CÔNG CỤ ĐO TOÀN KHO (`scripts/audit-cloud-top.ts`, 29/10/2026):** lọc cả fill âm `-999` (tệp trước 05/10) lẫn các khung mây tầng cao (`> min(6.000m, observerAlt + 1.500m)`) bị trộn vào `cloudTopMedian_m` (ví dụ Lảo Thẩn 26/10 `4.302m`). Đo trên **329 cặp có mây tầng thấp thuộc 34 ngày** (22 ngày có `>= 5` điểm đo được):
- Sai số `(vệ tinh - app)` có **trung vị `+668m`** (IQR `+246m..+1.101m`), `|sai số|` trung vị **`727m`**; giả định cũ "±200m" chỉ đúng ở **12%** số ca (`<= 500m`: 34%).
- Riêng đỉnh cao `>= 2.400m` (`n = 208`): trung vị **`+824m`** (`|sai số|` trung vị `829m`, chỉ `8%` nằm trong `±200m`); khi app khuyên đi (`n = 118`), trung vị `+854m`.
- Nguyên nhân lộ rõ trên bảng 22 ngày: ở **21/22 ngày**, trung vị mặt mây app ghim cứng vào dải **`2.130-2.236m`** (`800hPa + 150m`; tỉ lệ ghim cụm này là GFS `20%`, ICON `33%`, UKMO `33%`), trong khi mặt mây thật của vệ tinh nằm ở **`2.540-3.340m`** - đúng vào **khe mù thẳng đứng `1.130m` giữa mực `800hPa (~2.060m)` và `700hPa (~3.190m)`** nơi Open-Meteo không có mực `750hPa`. Ở mặt đối diện, trên `239` cặp đỉnh `>= 2.400m` vệ tinh quang cả 5 khung (`CLEAR`), engine vẫn dựng `cloudTop != null` ở **190/239 (`79%`)** và khuyên đi ở **133/239 (`56%`)**.

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
thung lũng, nên chưa chắc là nhầm. Đúng vậy: anh gửi ảnh Pha Luông sáng 20/10 (bài nhóm leo núi, ~6-8h ước theo mặt trời), biển
mây dày phủ kín bên dưới - app `72 FLUCTUATING · 100% · ΔH +117m` khuyên đi ĐÚNG, vệ tinh CLEAR lần thứ hai ở chính đỉnh này. Các điểm có biển mây thật lại là nhóm đỉnh cao Hoàng Liên Sơn (Lảo Thẩn, Nhìu Cồ San, Ngũ
Chỉ Sơn, Cú Nhù San, Putaleng, Tả Liên Sơn, Ky Quan San), đỉnh mây vệ tinh đo 2.610-3.210m, và app chỉ cho 18-49 điểm ở nhóm này.
Ky Quan San (`40 FOG`, ΔH +1.361m) và Nhìu Cồ San (`43 FOG`, ΔH +333m) **bỏ sót kiểu tự mâu thuẫn**: mặt mây app tính nằm dưới
chân, nhãn vẫn là "chìm trong mây". Nhiều khả năng mặt mây thật nằm sát đỉnh, cách 100-250m, nên RH nội suy tại chỗ đứng cao
và cổng `observerInCloud` bật, trong khi `estimateCloudTop` lại đặt mặt mây quá thấp. Hai lỗi này cùng một gốc: mặt mây bám
lưới mực áp suất. Vì vậy dòng "đêm nay nhiều đỉnh đẹp" nếu đưa lên app chỉ được nói về NGÀY, không được kèm danh sách đỉnh.
21/10 (ngoài mẫu thứ hai): A bật với 6 đỉnh, vệ tinh thấy 8/37 điểm có biển mây ⇒ đúng ngày lần thứ hai. Lần này 3/6 đỉnh được
vệ tinh xác nhận (Sa Mu 76, Lùng Cúng 70, Phu Sa Phìn 69); Pù Luông và Ba Vì CLEAR (núi thấp, vệ tinh hay mù), Kim Bon FOGGED_IN.
Ba Vì 21/10 (ảnh bài trang địa phương, đăng ~09:45, không rõ giờ chụp): mây tích rời, mỏng, tan nhanh, ngang và dưới đỉnh đền
Bác. App `69 STATIC ΔH +555m` khuyên đi. Lúc đầu ghi MORNING vì không rõ giờ chụp; anh gửi thêm live video cùng trang phát lúc
**08:29** (giờ Facebook ghi, tin được) ⇒ chấm như rạng sáng: app ĐÚNG, vệ tinh CLEAR bị đè (ca báo nhầm theo vệ tinh hoá ra là đúng).
Ảnh có khung thông số anh gửi thêm hoá ra là của **20/10 lúc 08:06** (không phải 21/10): mây rời, mỏng, đang bốc lên ngang và dưới
đường lên đỉnh. Bản chụp 20/10 `55 STATIC · 67% · ΔH +599m` khuyên đi ⇒ ĐÚNG, vệ tinh CLEAR - người đi đè. Toạ độ in trong khung
ảnh là vùng UAE, nên khung có thể do ứng dụng ghép; giờ khớp với độ cao mặt trời nên vẫn dùng. 20/10 nay 13 điểm có biển mây.
22/10 (ngoài mẫu thứ ba): **A trượt lần đầu.** Bản chụp chỉ có 1 đỉnh ≥ 65 nên A đoán ngày thường, mà vệ tinh thấy 6/40 điểm có biển mây
(Fansipan, Phu Sa Phìn, Chiêu Lầu Thi, Tây Côn Lĩnh, Sa Mu, Tà Xùa). Bỏ Fansipan (ảnh 07:49 còn trong sương) thì vẫn 5, vẫn diện rộng theo
định nghĩa đã chốt. Ngoài mẫu A nay đúng 2 · bỏ sót 1 · nhầm 0. Không đổi ngưỡng A hay ngưỡng "diện rộng" theo kết quả này.
23/10 (ngoài mẫu thứ tư): **A trượt lần hai liền.** Bản chụp có 2 đỉnh ≥ 65, vệ tinh thấy 11/49 điểm có biển mây. Ngoài mẫu A nay
đúng 2 · bỏ sót 2 · nhầm 0. Đọc kỹ: A chưa báo nhầm lần nào, nhưng hai ngày trượt cho thấy nó chỉ bắt được những ngày mà engine đã thấy
rõ, đúng như trong mẫu (bỏ sót 4/7). A có ích như tín hiệu "chắc chắn có", không phải "chắc chắn không".
24/10 (ngoài mẫu thứ năm): A trượt lần ba (3 đỉnh ≥ 65, vệ tinh 8/43 điểm). Ngoài mẫu A nay đúng 2 · bỏ sót 3 · nhầm 0. Bản chụp
25/10 có 4 đỉnh ⇒ A đoán diện rộng; đó là phép thử tiếp theo cho chiều "có".
25/10 (ngoài mẫu thứ sáu): A bật với 4 đỉnh, vệ tinh và Facebook thấy 13/44 điểm có ⇒ **A đúng lần ba**. Ngoài mẫu A nay đúng 3 · bỏ sót 3 ·
nhầm 0: vẫn chưa báo nhầm lần nào. Bản chụp 26/10 có 5 đỉnh ⇒ A lại đoán diện rộng.
Ba Vì 24/10, **06:50** (giờ người đăng ghi trong bài, đăng 07:02): biển mây trắng dày, phẳng, phủ kín bên dưới, trời xanh bên trên. Bản
chụp `59/100 FOG · 100% · mặt mây 2.168m, ΔH −872m · không khuyên đi` ⇒ **BỎ SÓT**, cả ba mô hình nói "chìm trong mây". Mặt mây 2.168m đúng
là mốc bám lưới (800hPa + 150m) đã ghi ở mục Facebook. Vệ tinh FOGGED_IN (2.454-2.814m) cùng chiều với app, nhưng ảnh có dải mây tầng giữa mỏng
phía trên, nhiều khả năng là thứ vệ tinh đo; người đi đè. Ca này cho thấy lỗi bám lưới cũng làm BỎ SÓT ở núi thấp chứ không chỉ ở Tà Xùa
(ba mô hình đồng thuận 100%, điểm 59, chỉ riêng mặt mây là sai). Riêng nguồn người đi nay 32 cặp: 14 đúng · 10 bỏ sót · 1 nhầm.
**Kinh nghiệm anh Phong (25/10/2026, ý kiến cá nhân, CHƯA đo bằng số):** Ba Vì nên coi là điểm tham khảo. Núi thấp (1.296m), đứng lẻ giữa
đồng bằng chứ không nằm trong vùng nhiều núi giữ ẩm, và không lạnh bằng các nơi khác, nên biển mây ở đây hiếm hơn. Khớp vật lý: biển mây Ba
Vì là sương bức xạ của đồng bằng xung quanh, lớp mỏng, tan sớm (20 và 21/10 đều mỏng, tan nhanh). Ba báo cáo có mây 20, 21, 24/10 KHÔNG bác
được ý này, vì người ta chỉ đăng hôm có mây. Cách xử lý: Ba Vì vẫn ở trong thư viện và trong phép chấm (bỏ ra là chọn dữ liệu cho vừa ý),
nhưng **không dùng ca Ba Vì làm lý do chính cho bất kỳ bản sửa engine nào**; bản sửa `estimateCloudTop` phải đứng được trên các đỉnh vùng
núi (Tà Xùa, Hoàng Liên Sơn) trước, Ba Vì chỉ là ca phụ. Khi làm bảng chấm cho bản sửa đó thì tách riêng núi thấp đứng lẻ (Ba Vì) với vùng núi.
26/10 (ngoài mẫu thứ bảy): A bật với 5 đỉnh, vệ tinh thấy 10/39 điểm ⇒ **A đúng lần bốn**. Ngoài mẫu A nay đúng 4 · bỏ sót 3 · nhầm 0.
Cùng lúc, mức "đáng đi ∧ điểm ≥ 65" (mục 13/10) đã có ca trúng ở **9 ngày độc lập** (02, 13, 18, 19, 20, 21, 23, 25, 26/10), vượt ngưỡng
5 ngày tự đặt; chính xác 47% (27 trúng · 30 nhầm) so với 17% của luật đáng đi. Bước tiếp theo là soi 30 ca nhầm (bao nhiêu ca ở núi thấp
nơi vệ tinh mù sương mỏng) rồi mới đề xuất đưa lên app, theo luật cổng.
27-29/10 (ngoài mẫu thứ tám đến mười, đợt không khí lạnh 1.021hPa, `t850` Sa Pa hạ từ 19,7 xuống 15,3°C):
- **27/10:** đầu đợt lạnh nhiều mây cao (che 30/56 điểm), A 0 đỉnh, B tắt; vệ tinh thấy 6/26 điểm nhìn được có ⇒ diện rộng (A và B cùng sót).
- **28/10:** khô lạnh sau front (`t850` Sa Pa 15,3°C, gió 2,9km/h, đêm khô, `dpd2m` 0°C ⇒ **B bật đúng**), A 0 đỉnh (cao nhất Pù Luông 64); vệ tinh thấy 9/39 điểm có, app khuyên đi trúng nhóm đỉnh cao Hoàng Liên Sơn (Lảo Thẩn 62, Nhìu Cồ San 62, Pusilung 56, Ky Quan San 51, Putaleng 40, Tả Liên Sơn 18).
- **29/10:** khí chìm ổn định mạnh (`lapse850_700` Sa Pa 6,0°C/km, Hà Giang 3,9°C/km, gió 850 Sa Pa 1,9km/h), A 2 đỉnh (Pù Luông 74, Kim Bon 65), B tắt do mây cao đêm 33%; vệ tinh thấy 8/39 điểm có, nguyên dải 8 đỉnh cao Hoàng Liên Sơn - Lai Châu. App khuyên đi trúng 4 đỉnh (Nhìu Cồ San 60, Lảo Thẩn 59, Cú Nhù San 59, Ky Quan San 43) và **bỏ sót đúng 4 đỉnh thuộc `Zone B`** (Fansipan 36, Putaleng 27, Tả Liên Sơn 27, Ngũ Chỉ Sơn 32 - đều `DISSIPATING` dù ΔH +634 đến +1.413m). Đo bằng `hindcast.ts` ngày 29/10 xác nhận nghi vấn treo từ ca Fansipan 25/10: gió nội suy 850↔700hPa về 3.049-3.143m ra 15,2-25,5km/h, vượt ngưỡng `> 15km/h` của `Zone B` (Putaleng GFS 15,2km/h vượt đúng 0,2km/h), nên engine gán "gió xé nát cấu trúc mây" trong khi mặt mây nằm sâu dưới nắp nghịch nhiệt và gió 850hPa chỉ 2-3km/h.
- **Tổng kết 10 ngày ngoài mẫu (20→29/10):** A đúng 4 · bỏ sót 6 · nhầm 0 · **đúng không 0**; B đúng 3 · bỏ sót 7 · nhầm 0 · **đúng không 0**. Phát hiện phương pháp: cả 10/10 ngày cuối tháng 10 đều có 6-13 điểm có mây thấp (0 ngày âm tính theo định nghĩa "≥ 4 điểm"). Vào chính vụ khô lạnh, ngưỡng sự thật "≥ 4/55 điểm" thành nền hằng ngày (100%), không còn tách được ngày đặc biệt khỏi ngày thường.
- **Anh báo 31/10 (sáng sớm, chữ, không ảnh/giờ cụ thể):** Tà Xùa, Tà Chì Nhù và Ba Vì đều có biển mây ⇒ ba báo cáo người nhìn `BELOW DAWN`, không độ dày. Bản chụp (làm 30/10 22:15 VN): Tà Xùa `60/100 STATIC · 67% · ΔH +664m · ĐÁNG ĐI` ⇒ **ĐÚNG**; Tà Chì Nhù `44/100 FLOWING · 100% · ΔH +759m · ĐÁNG ĐI` ⇒ **ĐÚNG**; Ba Vì `63/100 FOG · 67% · mặt mây 592m, ΔH +704m · không khuyên đi` ⇒ **BỎ SÓT**, app tự mâu thuẫn (đứng cao hơn mặt mây 704m mà nhãn "chìm trong mây", cùng kiểu cổng `observerInCloud` như Ba Vì 24/10). Ba Vì là ca phụ theo kinh nghiệm anh 25/10. Ngày 31/10 diện rộng (calibrate: 10/47 điểm có), A chỉ có 3 đỉnh ⇒ A **bỏ sót**; ngoài mẫu A nay đúng 4 · bỏ sót 7 · nhầm 0 · đúng không 1. Riêng nguồn người đi nay 38 cặp: 16 đúng · 13 bỏ sót · 1 nhầm. Đây là lần đầu Tà Xùa được khuyên đi đúng với báo cáo của anh sau chuỗi ngày bỏ sót.
**Chưa đưa lên app** (kiểu "đêm nay nhiều đỉnh đẹp"): trước khi xét tiếp phải định nghĩa lại sự thật ngày diện rộng cho mùa chính (theo tỉ lệ điểm nhìn được hoặc theo cụm núi), không giữ ngưỡng phẳng 4 điểm.

#### Kiểm định mức "đáng đi ∧ điểm ≥ 65" theo luật cổng (29/10/2026): ĐỨNG VỮNG ở ≥ 2.400m nhưng CHƯA ĐƯA LÊN GIAO DIỆN

Mức `worthGoing && score >= 65` (đặt ngày 14/10 từ dữ liệu `<= 13/10`) đã vượt ngưỡng 5 ngày độc lập (9 ngày trúng: `02, 13, 18, 19, 20, 21, 23, 25, 26/10`). Trước khi đưa thành bậc hiển thị phụ bên trong "đáng đi", đã thực hiện đủ quy trình luật cổng trên **1.485 cặp** (cắt ngoài mẫu nghiêm ngặt tại `>= 14/10`, `n = 601`) kèm một lượt phản biện độc lập từ agent chuyên gia khí tượng núi cao:

1. **Số đo phân tầng (cùng một mẻ dữ liệu):**
   - Toàn kho (`1.485` cặp): `score >= 65` đạt **45,8%** (`27 TP - 32 FP`) so với **14,9%** (`56 TP - 319 FP`) của `score < 65`. Ngoài mẫu `>= 14/10` (`601` cặp): `43,2%` (`19 TP - 25 FP`, 7 ngày TP) so với `29,2%` (`45 TP - 109 FP`).
   - Nguồn người đi (`33` cặp): `score >= 65` đạt **100%** (`9 TP - 0 FP`, trong đó 6/9 ca vệ tinh gốc hôm đó ghi `CLEAR` vì mù sương mỏng).
   - **Tách theo cao độ chỗ đứng (`calibrate.ts` nay in trực tiếp hai dòng này):**
     - **Đỉnh cao `>= 2.400m` (`506` cặp):** `score >= 65` đạt **85,2%** (`23 TP - 4 FP`; riêng ngoài mẫu `>= 14/10` đạt **80,0%**, `16 TP - 4 FP`, tỷ số hợp lý dương `LR+ = 4,70` trên nền tỷ lệ mây thật `46,0%`), bỏ xa nhánh `score < 65` (`19,4%` toàn kho, `37,4%` ngoài mẫu, `LR+ = 0,70`). Lý do vật lý: để vượt 65 ở đỉnh cao, hạng mục ngưng tụ phải đóng góp `25-34` điểm (ép buộc có thảm stratocumulus dày thật), chặn sạch lớp mặt mây giả `~2.200m` do `rootedLowLayer` (`RH >= 80%` dù `cc = 0%`) sinh ra ở nhánh `< 65`.
     - **Điểm `< 2.400m` (`979` cặp):** `score >= 65` chỉ đạt **12,5%** (`4 TP` đều từ người đi - `28 FP` đều từ vệ tinh, gồm `25 CLEAR` + `1 FOGGED_IN` ở `< 2.000m`, `1 CLEAR` ở `2.190m`, `1 FOGGED_IN` ở `2.402m` sát ranh). Riêng **`PU_LUONG` (`1.700m`, đáy `400m`) chiếm `12/32` ca FP toàn kho** (nổ `>= 65` ở `13/52` ngày bản chụp, đứng Top 1 toàn quốc `6/15` đêm ngoài mẫu; `KIM_BON` đáy `120m` cũng nổ với tốc độ `3/12 = 25%` ngày).

2. **Bốn phát hiện phản biện độc lập chặn việc đưa ngay bậc `>= 65` lên giao diện:**
   - **Nghịch lý hàm điểm ngược ở đuôi cao `77-80` do cộng trùng 3 lần ẩm đáy thung lũng thấp (`scoreOneModel`):** trong 59 cặp `worthGoing && score >= 65`, dải `65-72` đúng `54,8%` (`23/42`), `73-76` đúng `44,4%` (`4/9`), nhưng dải cao nhất **`77-80` đúng `0,0%` (`0 TP - 8 FP`, `7/8` là `PU_LUONG`)**! Ở thung lũng thấp `120-400m` đón ẩm vịnh Bắc Bộ, khi `T - Td <= 0,4°C` và `RH >= 95%`, code cộng `valleySaturation (+34)` rồi cộng trùng tiếp `spread <= 1,5 (+12)` và `seaRH >= 90 (+8)` = **`54` điểm dù `cloud_low_dawn = 0%`**, thêm mùa thu `+8` và ổn định cột `+18` thành `80/100` cho một lớp sương đáy ruộng mỏng `560-610m`. Cộng thêm `PU_LUONG` đang ghi cao độ cứng `1.700m` (DEM tại toạ độ là `1.468m`, còn khách săn mây thực tế đứng ở `400-1.200m`), gắn huy hiệu mạnh lúc này sẽ làm `Pù Luông` / `Kim Bon` chiếm sóng đầu bảng `TonightRanking` ngay trong các đêm Hoàng Liên Sơn mới là nơi có biển mây thật (như `29/10`).
   - **Vách đá `seasonAdjust` ngày `01/12`:** cả `27/27` ca TP đều rơi vào tháng 10 khi miền Bắc được cộng cứng `+8` điểm, và `18/27` (`67%`) ca TP nằm ở `66-72` điểm. Ngày `01/12`, `seasonAdjust` miền Bắc tụt từ `+8` về `0`, sẽ tự động xoá 2/3 số ngày biển mây mạnh thật khỏi ngưỡng cứng `65` (và miền Trung đang chịu `-12`).
   - **Bỏ sót hành vi & lật bậc 3-so-với-6 mô hình:** nhánh `< 65` đang giữ `67,5%` (`56/83`) tổng số ca khuyên đúng, gồm **100% ca trúng ở Tà Xùa** (`0/52` ngày `>= 65`) và **100% đợt biển mây hậu không khí lạnh khô** (`28-29/10`, các đỉnh cao đạt `40-62` điểm). Ngoài ra `12/27` ca TP nằm sát mép `65-69`, dễ bị lật huy hiệu khi bấm từ `TonightRanking` (3 mô hình) vào `AnalysisResult` (6 mô hình, lệch trung bình `~4` điểm).
   - **Lỗi biên trong `verify_satellite.py`:** tham số `OPAQUE_EMISS` chưa dùng và `SEA_CONFIRMED >= 2` xét trước `BLOCKED_ABOVE`, làm 4 ngày nhiễu mây ti mỏng (`emiss 0,00-0,14` cạnh khung `11,8-13,7km`) ở `BA_DEN` bị gán nhầm `SEA_CONFIRMED`.

3. **Quyết định kỹ thuật (chọn Lộ trình A):** **Giữ nguyên giao diện 1 bậc "Đủ điều kiện săn mây", chưa tách bậc hiển thị `>= 65`** (`ENGINE_VERSION` không đổi). Xếp 3 gốc vật lý vừa bóc tách (khử cộng trùng 3 lần ẩm đáy thung lũng trong `scoreOneModel`, chuẩn hoá cao độ điểm ngắm `PU_LUONG`, tách `seasonAdjust` khỏi `ingredientScore`) vào đợt sửa engine lớn cùng `estimateCloudTop` và cổng gió `Zone B`; sau đợt đó mới chấm lại bậc phân tầng trên `ingredientScore`.

#### Đợt `estimateCloudTop` 30/10/2026: thử 4 biến thể, KHÔNG đổi engine

Nội suy giao điểm RH (V1) giảm sai số mặt mây 3%, nâng ngưỡng RH 80→90 (V2a) làm tệ đi 23%, nên không đổi gì (`engine-2.8.3`). Phản biện độc lập: sai số +650m so với vệ tinh là chênh giữa HAI ước lượng, vệ tinh IR có thể lệch cao ở chế độ nghịch nhiệt, nên đừng viết "app thấp 650m" như sự thật. Việc kế tiếp: hiệu chuẩn vệ tinh bằng ảnh có dấu giờ + DEM, rồi tách theo `cloud_cover_mid`. Hai phép đo tiếp (mặt mây dựng từ RH thuần: 80% ngày quang so với 69% ngày có biển mây; `cloud_mid` tương quan -0,10 với sai số) đều bác giả thuyết, không có gốc rẻ nào còn lại ở phía engine. Chi tiết và 14 ý phản biện ở `NHAT-KY-HIEU-CHINH.md`; công cụ `scripts/replay-raw.ts`, `scripts/ab-cloudtop.ts`.

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
về khoảng 15-18 UTC — có thể GitHub gom các lần chạy hạng thấp, không phụ thuộc giờ đặt.
Đo lại sau 3 tuần (29/10/2026, 23 lần chạy): giờ nổ 12:20-18:08 UTC, trung vị **14:38 UTC (21:38 VN)**;
riêng 12 ngày liên tiếp 17→28/10 sau khi ghim `vite-node` đều thành công 12/12, nổ 12:20-15:48 UTC
(19:20-22:48 VN, 0 lần qua nửa đêm VN, kho bản chụp phủ kín 18→29/10). Giữ nguyên lịch 08:37 UTC.

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

