> Tách từ AGENTS.md ngày 30/10/2026, nguyên văn.

# Engine 2.8.2, 2.8.3, điểm needsReview, Open-Meteo viết đè quá khứ

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

