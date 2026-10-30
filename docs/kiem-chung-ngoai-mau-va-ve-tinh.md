> Tách từ AGENTS.md ngày 30/10/2026, nguyên văn.

# Ngoài mẫu đầu tiên, vệ tinh vs người đi, PWA, số đầu tiên của luật đáng đi

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

