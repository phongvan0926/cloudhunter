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

### 🚫 Vì sao KHÔNG cào Facebook/TikTok

Đã tra kỹ, không phải ngại làm:
- Facebook đóng API tìm bài công khai từ 2018; **CrowdTangle ngừng hẳn 14/8/2024**; bản thay
  thế Meta Content Library chỉ mở cho nghiên cứu học thuật/phi lợi nhuận có duyệt hồ sơ.
- TikTok Research API cũng chỉ cấp cho học thuật; Display API chỉ đọc được nội dung của
  chính tài khoản mình.
- Cào bằng trình duyệt vi phạm điều khoản, vỡ mỗi lần Meta đổi DOM, và dễ bị khoá tài khoản.

Thay vào đó: người dùng thấy bài trên Facebook thì bấm **một nút trong app** để ghi lại —
mất 5 giây, dữ liệu sạch hơn hẳn scraping (có toạ độ, có ngày, có mốc so với chỗ đứng).

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

| giờ VN | việc | ghi vào |
|---|---|---|
| 20:00 | `snapshot-forecast.ts` — chụp dự báo rạng sáng **ngày mai** | `data/observations/<mai>-forecast.json` |
| 08:30 | `verify_satellite.py <hôm nay>` rồi `calibrate.ts` (đọc trong log) | `data/observations/<nay>-satellite.json` |

Bot commit thẳng vào `main`; `deploy.yml` có `paths-ignore: data/observations/**` nên không build lại
site 2 lần/ngày. Snapshot không bao giờ `--force` — đã có bản chụp thì script tự từ chối (bản chụp là
bằng chứng). Vệ tinh trễ thì job chỉ cảnh báo, không bịa nhãn. Chạy tay: tab Actions → "Vòng kiểm
chứng hằng ngày" → Run workflow → chọn `snapshot` hoặc `satellite` (+ `date` để lấy nhãn cho một ngày đã qua).
Lần chạy thử đầu tiên lộ ngay một lỗi: `fsspec.filesystem('http')` cần `aiohttp` mà hướng dẫn cài
trong `verify_satellite.py` không ghi — máy dev có sẵn nên chưa bao giờ thấy. Đã bổ sung.

Kèm theo: báo cáo thực địa có thêm `duration: SHORT | LONG` (ô "mây tan nhanh khi nắng lên"), vì
02/09 cho thấy câu hỏi thật của người đi là "có, nhưng được mấy tiếng?". Kho báo cáo trong repo
đã chuẩn hoá về đúng từ vựng của app (`ABOVE` = chìm trong mây, không dùng `IN_CLOUD` nữa).

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
| `tests/engine.test.ts` | 46 golden tests: vật lý & chấm điểm (kể cả profile geopotential thật, lớp mây liên tục, BLH), bậc thang fallback model, lọc model ảnh, múi giờ VN, alias thư viện (vitest). |
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
npm test       # vitest — 69 golden tests engine
npm run build  # vite build (Tailwind build-time, copy vercel.json vào dist)
```

Deploy: push `main` → GitHub Pages (base `/cloudhunter/`) + Vercel (huntercloud.vercel.app,
base `/` qua env VERCEL). Nhánh `gh-pages` bị Vercel bỏ qua nhờ vercel.json nằm trong dist.
