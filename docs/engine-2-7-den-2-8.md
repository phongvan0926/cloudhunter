> Tách từ AGENTS.md ngày 30/10/2026, nguyên văn.

# Engine 2.7 và 2.8, vòng kiểm chứng tự chạy trên GitHub Actions, lịch chụp

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

