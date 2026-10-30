> Tách từ AGENTS.md ngày 30/10/2026, nguyên văn.

# Engine 2.2 đến 2.6: các ca kiểm chứng thực địa đầu tiên (Tà Xùa, Suôi Thầu)

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

