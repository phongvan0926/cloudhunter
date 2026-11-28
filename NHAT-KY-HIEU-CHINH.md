# Nhật ký hiệu chỉnh CloudHunter

Để anh Phong xem lại theo đợt. Mỗi thay đổi đụng tới số liệu, nguồn sự thật hay engine ghi một mục:
làm gì, vì sao, đo được gì trước và sau, có phản biện độc lập không. Luật cổng ở AGENTS.md
("Luật cổng khi tự sửa engine").

| ngày | loại | việc | đo được | phản biện độc lập |
| :--- | :--- | :--- | :--- | :--- |
| 19/10/2026 | nhỏ (nguồn sự thật mới) | Thêm nguồn FB_AUTO: nhập nhãn bài Facebook hằng ngày Tà Xùa + Fansipan; calibrate chấm nhãn độ tin ≥ 0,6, thứ bậc người đi > Facebook > vệ tinh, in số riêng theo nguồn. **Engine không đổi.** | 21 nhãn, 10 đủ tin; khớp người nhìn 6/6. 4 cặp chấm mới: Tà Xùa 27/09, 02/10, 08/10 có biển mây, app bỏ sót cả ba; 30/09 âm tính đúng. Gộp mọi nguồn: Tà Xùa có biển mây 6 ngày có bản chụp, app khuyên đi 1/6. | không cần (không đổi engine) |
| 19/10/2026 (tối) | nhỏ (nhãn v2) | Nhập lại nhãn FB theo quy tắc v2 của bộ thu (ảnh có dấu giờ là chính). So v1/v2 với báo cáo người nhìn. **Engine không đổi.** | Khớp người nhìn: v1 6/6, v2 6/8. Hai ca lệch là Fansipan 15/10 (AT_EYE so với "trùm một phần") và Tà Xùa 11/10 (cần người xem). Phép so không độc lập vì ảnh và chữ cùng nguồn. Fansipan 19/10 v2 BELOW lúc 06:21, app bỏ sót. Tà Xùa: v2 cho 21/22 ngày BELOW, mất lớp âm tính. | không cần |
| 20/10/2026 | nhỏ (công cụ đo) | Chấm theo NGÀY "diện rộng" (≥ 4 điểm có biển mây): giả thuyết A = bản chụp có ≥ 4 đỉnh đáng đi ∧ ≥ 65; B = Sa Pa 05h lặng gió, đêm khô, bão hoà, áp không giảm. Thêm `regional-days.ts` ghi bảng thời tiết vùng mỗi ngày. **Engine và lời khuyên không đổi.** | Trong mẫu: A đúng 3 · sót 4 · nhầm 0; B đúng 3 · sót 4 · nhầm 3. 13/10 và 18/10 là hai kiểu thời tiết khác hẳn (khô trên cao sau đợt lạnh / ẩm gió nam). Ngoài mẫu tính từ 20/10. | không cần (không đổi engine) |
| 29/10/2026 | nhỏ (công cụ đo + thực địa) | Thêm `scripts/audit-cloud-top.ts` đo sai số mặt mây thật (bản chụp × vệ tinh, lọc fill `-999` và khung mây cao trộn vào trung vị); `calibrate.ts` tách mức `≥ 65` theo cao độ `≥ 2.400m` / `< 2.400m`; nhập ảnh Timemark `Fansipan 29/10 07:27` (biển mây dày ~2.880m dưới đỉnh, cờ trên chóp bay ngang theo gió tầng trên nắp nghịch nhiệt); soát nhịp đăng `vecaptreosapa.com` sau 2 tuần (`6/17` ngày -> không dựng job riêng). **Engine không đổi.** | 329 cặp mặt mây thấp / 34 ngày: `(sat - app)` trung vị `+668m` (đỉnh `≥ 2.400m`: `+824m`), `|sai số|` TV `727m`, chỉ `12%` nằm trong `±200m`; 21/22 ngày mặt mây app ghim ở `2.130-2.236m` (khe mù `800->700hPa`); ngày `CLEAR` ở `≥ 2.400m` vẫn dựng `cloudTop` ở `79%` cặp. Nguồn người đi nay 33 cặp: 14 đúng - 11 sót - 1 nhầm. | không cần (không đổi engine) |
| 29/10/2026 | kiểm định cổng (giữ nguyên UI) | Kiểm định đề xuất tách bậc hiển thị `worthGoing && score >= 65` trên toàn kho `1.485` cặp (ngoài mẫu nghiêm ngặt `>= 14/10`, `n = 601`). Quyết định: **CHƯA đưa lên giao diện**, giữ 1 bậc "Đủ điều kiện săn mây" và đưa 3 lỗi gốc vào đợt sửa engine lớn. | Đỉnh `≥ 2.400m`: đúng `85%` (`23 TP - 4 FP`; ngoài mẫu `80%`, `LR+ = 4,70`) vs `19%` của `< 65`. Nhưng `< 2.400m` chỉ `13%` (`4 TP - 28 FP`), đuôi cao `77-80` đúng `0%` (`0 TP - 8 FP`, `7/8` là `PU_LUONG` nổ `13/52` ngày do cộng trùng 3 lần ẩm đáy thung lũng `400m`), vách đá `seasonAdjust` ngày `01/12` (`+8 -> 0`) sẽ xoá `18/27 = 67%` ca TP, và `0%` độ nhạy ở Tà Xùa + đợt lạnh khô `28-29/10`. | **Có** (agent khí tượng núi cao độc lập): chỉ ra cộng trùng 3 lần ẩm bề mặt (`+54` điểm), lệch cao độ đại diện `PU_LUONG` (`1.700m` vs DEM `1.468m`), vách đá mùa `01/12`, bỏ sót hành vi ở `< 65` và lật bậc 3-so-với-6 mô hình -> chọn Lộ trình A (sửa gốc vật lý trước, chưa bật huy hiệu UI). |

## Đợt `estimateCloudTop` (30/10/2026) - GIẢ THUYẾT VIẾT TRƯỚC KHI ĐO

Viết và commit TRƯỚC khi chạy bất kỳ phép đo nào của đợt này (theo bước a của luật cổng). Không thêm biến thể nào sau khi đã thấy kết quả.

**Vấn đề đã đo (29/10, `scripts/audit-cloud-top.ts`, 329 cặp):** vệ tinh đo mặt mây cao hơn app trung vị +668m, chỉ 12% số ca nằm trong ±200m. Ở 21/22 ngày, mặt mây app ghim vào 2.130-2.236m (mực 800hPa + 150m). Ngược lại, ở 239 cặp đỉnh ≥ 2.400m mà vệ tinh quang cả 5 khung, engine vẫn dựng mặt mây ở 79% số ca.

**Hai nguyên nhân giả định, hai thay đổi, thiết kế giai thừa 2×2 (chỉ 4 biến thể, không thêm):**
- **V0:** engine-2.8.3 hiện tại (đối chứng).
- **V1 "nội suy giao điểm":** khi lớp mây liên tục kết thúc ở mực L_i mà mực kế tiếp L_(i+1) không có mây và hai mực cách nhau ≤ 1.300m (`LEVEL_GAP_INTERP_MAX`, tức khe 800↔700hPa của GFS/ICON/UKMO), mặt mây = độ cao nơi RH nội suy tuyến tính cắt ngưỡng RH, thay cho "L_i + 150m". Mô hình không có mực 800 (khe 1.640m) giữ nguyên hành vi cũ. Lý do vật lý: mực quan trắc chỉ cho biết mây đến ÍT NHẤT đó, mặt mây thật nằm giữa hai mực.
- **V2a "ngưỡng RH thống nhất":** ngưỡng "có mây" theo RH trong `estimateCloudTop` đổi 80% → 90%, đúng bằng ngưỡng engine đã dùng ở `observerInCloud`. Lý do: một cột đã dùng hai tiêu chuẩn "mây" khác nhau; RH 80% trung bình ô lưới chưa phải mây. Đây là thống nhất nội bộ, không phải số chỉnh theo kết quả.
- **V2 = V1 + V2a.**

**Dự đoán (có thể bị bác bỏ):**
- H1: V1 làm sai số mặt mây vệ tinh-app ở đỉnh ≥ 2.400m giảm (trung vị |sai số| giảm ≥ 25%).
- H2: V2a giảm số lần dựng mặt mây ở ngày vệ tinh CLEAR ở đỉnh ≥ 2.400m. Cái giá chưa biết; sẽ báo đủ.
- H3 (đối chứng): Tà Xùa (1.800m) KHÔNG được V1 cứu, vì lỗi ở đó là mặt mây quá CAO (ẩm ≥ 80% cả cột), V1 chỉ chỉnh phía trên lớp mây. Nếu V2a cứu Tà Xùa thì đó mới là bằng chứng cho nguyên nhân ngưỡng ẩm.

**Dữ liệu và cách chấm:** tính lại bằng dữ liệu Open-Meteo hôm nay cho mọi (điểm × ngày) đã có sự thật (`replay`), CÙNG một mẻ cho cả 4 biến thể. Đây KHÔNG phải thứ app đã thấy hôm đó (API viết đè quá khứ), chỉ dùng để so các luật. Sự thật: người đi > Facebook (độ tin ≥ 0,6) > vệ tinh, đúng như `calibrate.ts`.

**Quy tắc quyết định (chốt trước):**
1. Điều kiện cứng: BỎ SÓT trên các ca người đi + Facebook (luật "đáng đi" tính lại) KHÔNG được tăng so với V0.
2. Điều kiện cần cho H1: trung vị |sai số mặt mây| ở đỉnh ≥ 2.400m giảm ≥ 25%, và không xấu đi ở điểm < 2.400m.
3. Báo nhầm tăng thì nêu rõ đổi lấy gì. Ca dùng để nghĩ ra bản sửa (Fansipan 25-29/10, Tà Xùa 04/10) không được tính là lợi ích.
4. Số tách riêng: đỉnh ≥ 2.400m / < 2.400m, Ba Vì tách hẳn (núi thấp đứng lẻ), Tà Xùa và Fansipan riêng.
5. Mọi ca đổi kết luận liệt kê theo cả hai chiều rồi đưa agent khí tượng độc lập phản biện. Không đạt điều kiện 1 thì KHÔNG đổi engine, chỉ ghi kết quả.

### Kết quả đợt `estimateCloudTop` (30/10/2026) - KHÔNG ĐỔI ENGINE

Chấm 4 biến thể đã đăng ký trước trên cùng một mẻ dữ liệu thô (`scripts/replay-raw.ts` lấy từ
historical-forecast-api, 2.723 điểm×ngày; `scripts/ab-cloudtop.ts` chấm; 1.494 hàng có sự thật:
36 người đi, 8 Facebook, 1.450 vệ tinh). Số liệu chính (đỉnh >= 2.400m, ngày vệ tinh thấy biển mây, khung sạch, n=120):

```
              V0      V1      V2a     V2
sai số TV    650m    628m    800m    805m     (vệ tinh - app, |.| trung vị 663/642/803/816m)
người đi+FB  đúng22 sót12 nhầm2 | V1 y hệt | V2a đúng25 sót9 nhầm3 | V2 đúng25 sót9 nhầm3
vệ tinh      đúng65 sót64 nhầm333 | V1 nhầm320 | V2a đúng73 sót56 nhầm410 | V2 nhầm410
ngày vệ tinh quang, đỉnh >=2400m: app vẫn dựng mặt mây 81% / 81% / 80% / 80%
```

**Kết luận theo luật đã ghi trước:** H1 (nội suy giảm sai số >= 25%) BỊ BÁC: V1 giảm 3%, V2a làm tệ đi 23%.
Điều kiện 2 thất bại nên không đổi engine, `ENGINE_VERSION` giữ `engine-2.8.3`. Hai tham số `rhCloudy`/`interp`
của `estimateCloudTop` giữ lại làm công cụ đo (mặc định không đổi, 128 test xanh). H3: V2a cứu 3 ca Tà Xùa/Fansipan/Suôi Thầu
(đúng hơn 3 ca người đi/FB) nhưng mất ca Suôi Thầu 25/8, thêm 1 báo nhầm Tà Xùa 29/10 và +77 "nhầm" theo vệ tinh.

**Phản biện của agent khí tượng độc lập và cách xử lý:**
1. V1 thua vì toán học (RH rớt mạnh giữa 800 và 700hPa thì giao điểm xấp xỉ +150m cũ). Ghi nhận, không thêm biến thể cứu.
2. CldTopHght (IR) có thể lệch CAO ở chế độ nghịch nhiệt (profile NWP làm trơn, đỉnh sương tự lạnh, thị sai vệ tinh, ô 2km trên sườn dốc). Nên "sai số 650m" là chênh giữa HAI ước lượng, chưa phải lỗi của app. Xử lý: từ nay không viết "app thấp 650m" như sự thật; việc kế tiếp là hiệu chuẩn vệ tinh bằng 10-20 ca ảnh có dấu giờ + DEM.
3. Mây tầng giữa mỏng có thể bị vệ tinh ghi thay biển mây. Xử lý: phép đo kế tiếp tách sai số theo `cloud_cover_mid` và `CldTopEmss` (hiện là tham số chết trong `classify`).
4. Chưa dùng `cloud_cover_mid`, sát khe 800-700hPa. Xử lý: đưa vào đề xuất phép đo kế tiếp, viết giả thuyết trước.
5. "V2a cứu Tà Xùa nên RH80 là gốc" không vững: 3 ca cùng vùng, nút xoay đơn điệu, số ngày độc lập 2-3. Xử lý: không dùng làm bằng chứng; H3 chỉ là đối chứng yếu. Phép phân biệt đề xuất: quét ngưỡng RH 70..98 xem có "đầu gối", tách < 2.400m, dùng sự thật không phải vệ tinh.
6. 81% dựng mặt mây ngày vệ tinh quang: chưa kết luận được lỗi engine hay vệ tinh mù. Phép thử rẻ nhất: trong ca đó, mặt mây dựng từ cloud_cover thật hay chỉ từ RH >= 80%.
7. Thứ tự đo đề xuất: (1) hiệu chuẩn vệ tinh bằng ảnh có giờ, (2) tách cc thật với chỉ RH, (3) thử cloud_cover_mid, (4) đổi đầu ra thành KHOẢNG [mực cuối còn ẩm, mực đầu tiên khô] với ΔH có cận, (5) ERA5 37 mực chỉ để đo khe mù. Không chỉnh ngưỡng RH tiếp.
8. Sai số chỉ tính trên ngày vệ tinh thấy biển mây và có top: thu hẹp về mẫu thuận lợi. Ghi nhận; lần sau in tỉ lệ ca bị loại mỗi biến thể.
9. Số ngày hiệu dụng ~34 (người đi+FB ~17-20 ngày), nên "+77 nhầm" không phải 77 quan sát. Xử lý: lần sau bootstrap theo ngày.
10. Replay là dữ liệu gần lead 0, tuyệt đối chỉ là cận trên; chỉ so tương đối giữa biến thể là hợp lệ.
11. Rò rỉ in-sample nhẹ (giả thuyết nghĩ sau khi đã xem Tà Xùa/Fansipan). Đã loại các ca đó khỏi "lợi ích" theo luật 3.
12. "đúng-không" bị lớp phủ định chi phối; lần sau báo LR+/LR- hoặc balanced accuracy theo nhóm.
13. Nhãn vệ tinh và thước đo sai số dùng chung CldTopHght, không độc lập. Ghi nhận như điểm 2.
14. Giữ đúng luật: điều kiện 2 thất bại thì không đổi engine, không lấy +3 ca người đi để lách. Đã làm theo.

### Phép đo kế tiếp (30/10/2026) - GIẢ THUYẾT VIẾT TRƯỚC KHI ĐO: mặt mây dựng từ RH thuần hay từ mây trực tiếp

Đây là việc 2 và 3 trong thứ tự agent đề xuất; chỉ ĐO, không đổi engine.
- Với mỗi (mô hình × điểm × ngày) ở đỉnh >= 2.400m mà V0 dựng được mặt mây, gọi lớp là "có mây trực tiếp" nếu ít nhất một mực trong lớp (từ đáy thung lũng tới mặt mây - 150m) có `cc >= 45`, ngược lại là "chỉ RH".
- **H4:** tỉ lệ "chỉ RH" ở ngày vệ tinh CLEAR cao gấp >= 2 lần ở ngày vệ tinh SEA_*. Nếu đúng, lớp chỉ-RH là bằng chứng yếu, hướng sửa sau này là đòi mây trực tiếp (làm theo luật cổng, không làm ở lượt này). Nếu không đúng, bỏ giả thuyết "dựng mây từ RH" là gốc.
- **H5 (cloud_mid):** `cloud_mid_dawn` trung vị cao hơn ở ngày vệ tinh SEA/FOGGED_IN so với CLEAR, và sai số mặt mây (vệ tinh - app) tương quan dương với `cloud_mid_dawn`. Nếu không thì cloud_mid không giải thích khe mù.
- Báo cáo kèm tỉ lệ ca bị loại và số NGÀY (không chỉ số hàng).

**Kết quả (30/10/2026, `scripts/rh-vs-cc.ts`, đỉnh >= 2.400m, 1.261 ca mô hình×điểm×ngày có mặt mây, 254 ca không dựng):**
```
vệ tinh     n    số ngày   mặt mây chỉ từ RH   cloud_mid trung vị
CLEAR      647     37            80%                 0%
SEA_*      348     26            69%                 0%
FOGGED_IN  259     24            49%                 3%
```
- **H4 BỊ BÁC:** tỉ lệ chỉ-RH ở ngày CLEAR / ngày SEA = 80/69 = 1,16, xa ngưỡng 2. Lớp chỉ-RH xuất hiện nhiều ở CẢ ngày có biển mây thật, nên "dựng mây từ RH" không phải gốc phân biệt được ngày quang. Không đòi mây trực tiếp.
- **H5 BỊ BÁC:** `cloud_mid_dawn` trung vị gần 0 ở mọi nhóm, Spearman với sai số = -0,10 (n=348). Cloud_mid không giải thích khe mù, bỏ hướng này.
- Quan sát phụ (không phải giả thuyết đã đăng ký, chỉ ghi lại): sai số (vệ tinh - app) lớn hơn khi mặt mây chỉ từ RH (768m, n=239) so với có mây trực tiếp (537m, n=109). Cả hai đều còn xa 0, nên cũng không cứu được.
- Hai hướng rẻ nhất của agent đều không ra gì, nên bước đáng làm tiếp là hiệu chuẩn chính vệ tinh bằng ảnh có dấu giờ (việc 1), vì phần lớn khoảng cách 650m có thể nằm ở phía vệ tinh. Cần ảnh từ anh hoặc từ bộ thu: ca có giờ 05:30-07:00 và nhìn thấy địa hình nhô khỏi biển mây.

## Đợt "dự báo tại điểm thung lũng" (19/11/2026, phiếu gcc29 vòng 3) - GIẢ THUYẾT VIẾT TRƯỚC KHI ĐO

Viết và commit TRƯỚC khi lấy dữ liệu hay chạy phép đo nào của đợt này (bước a luật cổng). Đây là ý (b) trong
`docs/skyradar-doi-chung.md` (anh đã duyệt): tìm điểm thung lũng THẬT bằng DEM trong bán kính 20 km rồi xin dự báo
TẠI toạ độ đó. Không thêm biến thể nào sau khi đã thấy kết quả.

**Vấn đề đã đo, nối với đợt trước:**
- Luật "đáng đi" khuyên đi 181 điểm-ngày, đúng 9 (5%); 16/17 ca báo nhầm vệ tinh thấy QUANG (CLEAR)
  (`docs/kiem-chung-ngoai-mau-va-ve-tinh.md`). Ở đỉnh >= 2.400m ngày vệ tinh quang, engine vẫn dựng mặt mây 79-81%.
- Đợt 30/10 đã bác hai hướng sửa trong `estimateCloudTop` (nội suy, ngưỡng RH 90) và H4/H5.
- Còn một hướng chưa thử, nằm ở ĐẦU VÀO chứ không ở công thức: hôm nay "thung lũng" của engine là dự báo tại
  toạ độ ĐỈNH, chỉ hạ `elevation=` xuống cao độ đáy (đáy = min DEM 5 điểm trong ~3,3 km, hoặc mặt cắt preset).
  Ô lưới mô hình chứa đỉnh là ô núi: ẩm/mây thấp của nó có thể là ẩm sườn núi, không phải đáy thung lũng, nên
  cổng `cloud_low_dawn < 15 && !valleySaturation && !rootedLowLayer` hay mở sai ở ngày quang.

**Điểm thung lũng (chốt trước):** lưới DEM (Open-Meteo Elevation, cùng nguồn app) bước 0,02° vĩ và 0,02° kinh,
trong đĩa bán kính 20 km quanh toạ độ đỉnh; bỏ điểm DEM <= 2 m (biển, đầm); lấy điểm THẤP NHẤT, hoà thì lấy điểm gần
đỉnh hơn. Không chỉnh bán kính, bước lưới hay luật chọn sau khi thấy kết quả.

**Hai nhánh, cùng một mẻ dữ liệu** (historical-forecast Open-Meteo, mô hình gfs_seamless, icon_seamless,
ukmo_seamless như đợt 30/10; hai nhánh xin xen kẽ trong cùng một lần chạy `scripts/replay-valley.ts`):
- A (hiện tại): toạ độ đỉnh, `elevation=` đáy thung lũng như `valleyElevationsForAll` (đúng như bản chụp).
- B (ý b): toạ độ điểm thung lũng, `elevation=` cao độ DEM điểm đó; `ctx.valleyElevation` = cao độ đó.
- Điểm quan sát (chỗ đứng): toạ độ đỉnh, `elevation=` cao độ đỉnh, `OBSERVER_VARS`; DÙNG CHUNG cho cả hai nhánh.
  (Khác `replay-raw.ts` cũ: bản đó lấy luôn khối thung lũng làm chỗ đứng.)
- Engine, ngưỡng, `isWorthGoing` giữ nguyên; chỉ đầu vào thung lũng đổi.

**Mẫu:** mọi (điểm × ngày) có sự thật VÀ có bản chụp: người đi, Facebook (`fbUsable`, giờ DAWN), vệ tinh
(bỏ BLOCKED_ABOVE, NO_DATA). Thứ bậc trùng: người đi > Facebook > vệ tinh. Ước tính ~71 ngày, ~60 điểm.

**Giả thuyết H-TL:** nhánh B giảm báo nhầm "đáng đi" vì ô lưới thung lũng khô hơn ô đỉnh ở ngày quang.

**Điều kiện ĐẠT (tất cả):**
1. Bỏ sót trên người đi + Facebook: B <= A (cứng, luật cổng c).
2. Báo nhầm "đáng đi" mọi nguồn: B <= 0,8 × A.
3. Bootstrap theo NGÀY (2.000 lần lấy lại ngày): khoảng 90% của (báo nhầm A - báo nhầm B) nằm hẳn trên 0.
4. Balanced accuracy trên người đi + Facebook: B >= A.
Không đạt một điều kiện thì KHÔNG gộp vào engine; ghi số và lý do.

**Báo cáo kèm (không phải cổng):** bảng đúng/sót/nhầm theo nguồn và theo nhóm (>= 2.400m, < 2.400m, Ba Vì, Tà Xùa,
Fansipan); bỏ sót theo vệ tinh (đổi lấy gì); tỉ lệ dựng mặt mây ở ngày vệ tinh CLEAR đỉnh >= 2.400m; sai số mặt mây
so với vệ tinh khung sạch; số ngày hiệu dụng; phân bố khoảng cách và cao độ điểm thung lũng; MỌI ca đổi kết luận
theo cả hai chiều. Replay là dữ liệu gần lead 0, chỉ so tương đối A với B là hợp lệ.

**Sửa đổi trước khi có kết quả (19/11/2026, 10:50):** lần chạy đầu bị Open-Meteo trả 429 "Hourly API request limit"
ngay ở lệnh DEM đầu tiên (hạn ngạch giờ đã hết từ trước, chưa lấy được số nào). Lưới 20 km cần ~270 điểm/đỉnh × 58 đỉnh,
nên phần dò DEM chuyển sang OpenTopoData `srtm90m` (SRTM 90 m, cùng độ phân giải với DEM của Open-Meteo) để không
ăn vào hạn ngạch dự báo. Luật chọn điểm (bán kính, bước lưới, bỏ <= 2 m, lấy thấp nhất) giữ nguyên. Dự báo A/B/O vẫn lấy
từ Open-Meteo historical-forecast như đã ghi. Chưa xem dữ liệu dự báo nào khi sửa.

**KẾT QUẢ (19/11/2026, 12:40): KHÔNG ĐẠT, engine giữ nguyên, không đổi `ENGINE_VERSION`.**
Chạy `scripts/replay-valley.ts` (69 ngày 23/8-18/11, 58 điểm, 1.954 điểm-ngày có dữ liệu cả hai nhánh) rồi
`scripts/ab-valley.ts`. Trúng/trượt dùng đúng `isWorthGoing` của engine, không dùng điểm số.

| Nguồn | n | A đúng/sót/nhầm/đúng-không, BA | B đúng/sót/nhầm/đúng-không, BA |
|---|---|---|---|
| người đi | 49 | 25/13/3/8, 0,693 | 28/10/3/8, 0,732 |
| Facebook | 23 | 1/12/0/10, 0,538 | 5/8/0/10, 0,692 |
| vệ tinh | 1.882 | 78/116/416/1.272, 0,578 | 82/112/609/1.079, 0,531 |

Bốn điều kiện: (1) sót người đi+FB A 25, B 18: đạt. (2) báo nhầm mọi nguồn A 419, B 612, trần 335: TRƯỢT.
(3) bootstrap theo ngày, khoảng 90% của (nhầm A - nhầm B) = [-241, -143]: TRƯỢT. (4) BA người đi+FB 0,683 -> 0,752: đạt.
Kèm: tổng lời khuyên đi A 523 (đúng 104), B 727 (đúng 115); ngày có báo nhầm A 51, B 58. Nhóm < 2.400m nhầm 211 -> 406.
Sai số mặt mây (vệ tinh - app) ngày SEA khung sạch: >= 2.400m trung vị +624 -> +990 m; < 2.400m -162 -> +122 m.
Ngày CLEAR đỉnh >= 2.400m dựng mặt mây 83% -> 78%. Điểm thung lũng: khoảng cách trung vị 18,8 km, 24/58 ở rìa đĩa
(>= 19 km), 5 điểm <= 20 m (Ba Vì 8, Bạch Mã 4, Tam Đảo 7, Bà Đen 3, Bình Liêu 11). Ca đổi kết luận: người đi+FB 17 ca
(11 bắt thêm, 4 sót thêm, 1 nhầm thêm, 1 bớt nhầm; danh sách in đủ bởi ab-valley); vệ tinh 278 nhầm thêm, 85 bớt nhầm,
12 sót thêm, 16 bắt thêm. Cơ chế thấy được: B dựng mặt mây thấp hẳn (từ ~2.000 m xuống 500-900 m) nên mặt mây nằm dưới
đỉnh và thành "biển mây" -> nói "đi" nhiều hơn; NGƯỢC với giả thuyết H-TL (ô thung lũng khô hơn -> ít nhầm).
Công bố: trước lượt đầy đủ đã chạy thử script chấm trên 16 ngày đầu (167 hàng) để kiểm script; không đổi luật sau đó.

**Phản biện độc lập (agent đóng vai chuyên gia khí tượng vùng núi, nhận giả thuyết + số + ca đổi, không nhận kết luận):**
1. Luật "thấp nhất trong 20 km" sai về vật lý: điểm do biên đĩa quyết định, rơi vào đồng bằng/ven biển hoặc ô mô hình
   khác hẳn (GFS ~25 km, ICON/UKMO ~10 km), tức đưa vào "khí hậu ô đồng bằng lân cận". -> Nhận. Ghi là cái bị bác là
   CÁCH HIỆN THỰC này, chưa phải ý "dự báo tại thung lũng thật".
2. Phần lời trên người đi+FB là hệ quả của việc nói "có" nhiều hơn trên nguồn chọn lọc dương (FB 0 báo nhầm cả hai
   nhánh; người đi 38 có / 11 không); Fansipan 18-20/10 là một đợt thời tiết đếm ba lần; riêng Tà Xùa BA còn giảm. -> Nhận;
   không dùng nhóm con để cứu.
3. Nghi định nghĩa "trúng" theo trạng thái (Fansipan B 30 vẫn trúng). -> Đã kiểm: dùng `isWorthGoing` (SEA + đồng thuận
   + ΔH > 100 m), điểm số không quyết định lời khuyên. Không sai.
4. Vệ tinh có thể sót biển mây hẹp dưới đỉnh, nhưng sai số đó chung cho A và B; nhầm gần gấp đôi ở < 2.400m và CI theo
   ngày quá xa 0 nên không đổ cho nhãn được. -> Nhận.
5. FAIL đúng; không có gì làm phép thử mất hiệu lực. Nhánh A cũng không trung tính (`elevation=` chỉ chỉnh nhiệt theo
   gradient). -> Ghi lại.
6. Đề xuất đợt sau (CHƯA làm, chỉ ghi để đăng ký trước nếu anh muốn): điểm thung lũng trong vùng nhìn thấy từ đỉnh,
   cùng lưu vực, 3-8 km, thấp hơn đỉnh 300-1.500 m, loại DEM < 50 m, bắt buộc khác ô mô hình, trung bình 3-4 điểm;
   kiểm cơ chế trên đầu vào (RH 2 m, mây thấp, BLH ngày quang) TRƯỚC khi chấm điểm; bán kính 5/10/20 km đăng ký trước;
   bootstrap theo đợt thời tiết; thu thêm nhãn âm người đi; kiểm công suất (72 nhãn không phân biệt nổi chênh 7 ca);
   xác nhận ngoài mẫu từ 20/11 bằng dự báo thật.

## Đợt "thung lũng v2: điểm nhìn thấy từ đỉnh" (đăng ký 19/11/2026, phiếu gcc29 vòng 4) - VIẾT TRƯỚC, CHẤM NGOÀI MẪU

Viết và commit TRƯỚC khi có dữ liệu chấm. Nối từ đợt "dự báo tại điểm thung lũng" ở trên (bị bác bằng số). Luật chọn điểm
mới theo phản biện độc lập của đợt đó. **Chỉ chấm trên các ngày 20/11/2026 trở đi** (ngoài mẫu: chưa ai nhìn ngày nào
trong đó). KHÔNG chấm lại trên 69 ngày 23/8-18/11 đã nhìn. Ngày chấm dự kiến: **20/12/2026**, khi có đủ 30 ngày
(20/11-19/12). Không gộp vào engine nếu không đạt, kể cả khi đạt một phần.

**Luật chọn điểm (chốt trước, tính bằng `scripts/valley-v2-points.ts`, kết quả commit ở `data/valley-v2-points.json`
TRƯỚC khi có ngày chấm nào):**
- Lưới DEM SRTM 90 m (OpenTopoData `srtm90m`) bước 0,005° (~550 m), trong vành 3-8 km quanh toạ độ điểm thư viện.
- Ứng viên hợp lệ khi: DEM >= 50 m; thấp hơn mắt người đứng 300-1.500 m (mắt = max(cao độ thư viện, DEM tại toạ độ) + 2 m);
  NHÌN THẤY từ chỗ đứng (đường ngắm thẳng, lấy mẫu mỗi ~250 m bằng nội suy song tuyến trên lưới, không mẫu nào cao hơn
  đường ngắm; bỏ qua cong Trái Đất, ~4 m ở 8 km); nằm ở ô 0,1° khác ô chứa chỗ đứng (xấp xỉ "khác ô" của ICON/UKMO ~10 km;
  GFS 0,25° có thể vẫn chung ô, ghi nhận là giới hạn).
- "Cùng lưu vực" chỉ được XẤP XỈ bằng điều kiện nhìn thấy (đường ngắm không vướng sống núi). Không có phân lưu vực thật.
- Mỗi góc phần tư (B, Đ, N, T, tâm theo hướng chính, 90°) lấy ứng viên THẤP NHẤT; hoà thì gần hơn. Điểm thư viện cần
  ít nhất 2 góc có ứng viên, thiếu thì loại khỏi đợt (ghi tên, không thay luật).
- Không chỉnh bán kính, bước lưới, ngưỡng cao độ, luật chọn sau khi đã ghi tệp điểm.

**Hai nhánh, cùng một mẻ** (historical-forecast Open-Meteo, gfs_seamless/icon_seamless/ukmo_seamless như đợt trước;
replay gần lead 0 nên chỉ so tương đối):
- A (hiện tại): như đợt trước.
- C: khối thung lũng = TRUNG BÌNH từng giờ, từng biến của dự báo tại 2-4 điểm v2 (mỗi điểm `elevation=` DEM của nó);
  giờ nào thiếu quá nửa số điểm thì giờ đó null. `ctx.valleyElevation` = trung bình DEM các điểm.
- Chỗ đứng O dùng chung. Engine, ngưỡng, `isWorthGoing` giữ nguyên.

**Bước 0, kiểm cơ chế (chấm TRƯỚC điểm số; trượt thì DỪNG, không chấm bước sau):** trên các điểm-ngày vệ tinh CLEAR,
giờ 05-07 VN: trung vị của (A - C) mây tầng thấp > 0 VÀ trung vị (A - C) RH 2 m > 0 (tức C khô hơn A ở ngày quang,
đúng cơ chế giả thuyết). In cả BLH để tham khảo, không làm cổng.

**Mẫu:** mọi (điểm × ngày) 20/11-19/12 có sự thật: người đi, Facebook (`fbUsable`, DAWN), vệ tinh (bỏ BLOCKED_ABOVE,
NO_DATA). Thứ bậc: người đi > Facebook > vệ tinh.

**Điều kiện ĐẠT (tất cả):**
1. Bỏ sót người đi + Facebook: C <= A.
2. Báo nhầm "đáng đi" mọi nguồn: C <= 0,8 × A.
3. Bootstrap theo KHỐI 5 ngày liên tiếp (xấp xỉ đợt thời tiết; 2.000 lần): khoảng 90% của (nhầm A - nhầm C) hẳn trên 0.
4. Balanced accuracy người đi + Facebook: C >= A.
**Kiểm công suất:** nếu người đi + Facebook có < 20 hàng hoặc < 5 hàng "có", điều kiện 1 và 4 KHÔNG chấm được ->
kết luận "CHƯA ĐỦ MẪU", không gộp, kéo dài thêm 30 ngày với đúng luật này (ghi ngày kéo dài vào đây).
Nhóm chính chia trước: >= 2.400m / < 2.400m. Không thêm nhóm sau khi thấy kết quả.

**Báo cáo kèm (không phải cổng):** như đợt trước, cộng phân bố khoảng cách/cao độ/số góc của điểm v2, và mọi ca đổi.

**Tệp điểm đã ghi 19/11/2026 13:05 (trước mọi ngày chấm):** `data/valley-v2-points.json`, chạy một lượt đủ 58/58 điểm thư viện,
không thiếu DEM. 45/58 điểm có >= 2 góc. 13 điểm bị loại theo luật (không thay luật): SAPA_HAM_RONG, DEO_KHAU_PHA,
DOI_MAM_XOI, DEO_O_QUY_HO, DEO_PHA_DIN, DEO_MA_PI_LENG, BA_DEN, MANG_DEN, CAU_DAT, LINH_QUY_PHAP_AN, TA_NANG, KEO_LOM, DON_DEN.
Lúc chấm 20/12, các điểm này không có nhánh C và nằm ngoài mẫu so sánh A/C (ghi số hàng bị bỏ vì lý do này).

## Đợt "mượn module của nhánh agy" (đăng ký 19/11/2026, phiếu g95c6) - VIẾT TRƯỚC KHI TẢI SỐ

Anh Phong chọn A (19/11 20:00, câu #qa3cf): giữ engine CloudHunter, chỉ mượn `routeDifficulty.ts` và `ephemeris.ts`
của nhánh agy (`vn-skycast`), mỗi module một vòng, đăng ký trước, chấm trên tập chưa thấy rồi mới giữ. Không gộp
khung 8 mực vệ tinh. Cả hai vòng KHÔNG đụng điểm/trạng thái/đáng đi của engine biển mây.

### Vòng 1: luật độ khó cung đường của agy (`evaluateRouteDifficulty`)

**Đối chiếu trước (đọc code, chưa có số):** agy có 7 nhóm (mưa giờ, mưa 24h, mưa 72h, sương/tầm nhìn, đi trong mây,
gió giật, lạnh theo cao độ, đèo lúc tối). CloudHunter route-1.2 đã có đủ các nhóm này (cộng dông, sạt lở QĐ 18), nên
không mượn nguyên module (trùng chức năng, hai luật song song làm người dùng thấy hai mức khác nhau). Chỉ chấm các
CHỖ KHÁC thành từng biến thể, mỗi biến thể thay đúng một nhóm trong `assessPoint`, phần còn lại giữ route-1.2:
- **D1 đi trong mây:** luật agy (cao >= 500 m; LCL = 125 x (T - Td) <= 250 m, RH >= 90, mây thấp >= 60 -> mức 1;
  LCL <= 125, RH >= 95, mây thấp >= 75 -> mức 2; thêm tầm nhìn < 300 m hoặc (>= 1.200 m và trời tối) -> mức 3)
  thay nhánh INCLOUD của app (>= 800 m, RH >= 97, mây thấp >= 90 -> mức 2). Td tính từ T và RH bằng công thức Magnus
  (app không xin `dew_point_2m`). Tầm nhìn: agy 1000/500/200 m thay 1000/200 m.
- **D2 mưa theo giờ:** agy 1 / 4 / 10 mm/h, không có nhánh xác suất mưa; thay 0,5 / 3 / 10 mm/h + xác suất >= 70%.
- **D3 lạnh xe máy theo gió lùa (wind chill NWS, gió = max(gió 10 m, tốc độ xe 40 km/h)):** cảm nhận <= 12 / 8 / 3 °C
  (hoặc không khí <= 2) -> mức 1 / 2 / 3; ô tô 6 / 3 / 1 °C. Thay nhóm lạnh/băng của app.
- Không chấm, không mượn: gió giật (không có nhãn gió nào), đèo lúc tối có leo thang (không có nhãn), mưa 72h
  70/120/200 mm (app đã bỏ mốc 72h vì không có nguồn; nguồn agy ghi "VIGMR/Caine 1980" nhưng Caine là đường cường độ -
  thời gian, không cho ra ba mốc này), điểm rủi ro 0-100 (trọng số tự đặt, không nguồn).

**Tập chấm (chưa luật nào được chỉnh theo nó):** 77 nhãn đường Facebook dùng được (độ tin >= 0,6) trong
`/srv/data/cloudhunter-mxh/nhan-duong.nhap.json` (28/9-18/11/2026, bộ thu FB, luật chữ, không LLM). Ngưỡng route-1.2
lấy từ tài liệu; nhánh INCLOUD của app nghĩ ra từ số đo Tà Xùa 19/11 06h, ngày đó KHÔNG có trong tập. Nơi: "Cầu Kính
Rồng Mây" và "Đèo Ô Quy Hồ" -> toạ độ DEO_O_QUY_HO (22,3550, 103,7740, 2.035 m); "Tà Xùa cả khu" -> TA_XUA_SON_LA
(21,2764, 104,4239), cao 1.770 m (DEM đường xe). Thời tiết: Open-Meteo historical-forecast (`best_match`, cùng biến
`ROUTE_HOURLY_VARS`, `elevation=` như trên). Giới hạn đã biết: đây là chuỗi dự báo gần giờ phân tích, không phải dự báo
có lead như người dùng thấy, nên chỉ kiểm LUẬT, không kiểm tài dự báo.

**Phép đo:** mỗi đoạn nhãn, mỗi loại k thuộc {fog, rain, cold}: sự thật CÓ nếu k trong `kinds`, KHÔNG nếu k trong
`kindsAbsent`, còn lại bỏ. Luật "báo" k = mức cao nhất của cờ loại k (fog = fog; rain = rain, storm, landslide;
cold = cold, ice) trong 4 giờ [giờ đăng - 3h, giờ đăng] >= 1 (chính, vì tập có 0 nhãn `hard >= 2`); in thêm >= 2.
Giờ thiếu số thì không báo, và đếm số giờ thiếu.

**Cổng giữ (mỗi biến thể so route-1.2, cùng mẻ):** (a) bỏ sót mới <= cũ; (b) báo nhầm tăng thêm <= số bỏ sót giảm;
(c) phải tốt hơn hẳn ở ít nhất một trong hai; (d) đủ mẫu: >= 3 nhãn CÓ và >= 10 nhãn KHÔNG cho loại đó, thiếu thì
"CHƯA ĐỦ MẪU" = không giữ. Hoà = không giữ (ít luật hơn). Giữ thì tăng `ROUTE_RULES_VERSION` và gọi agent phản biện
trước khi commit. Tập tiếp theo (kiểm lại, không phải cổng lần này): nhãn FB và bản chụp tuyến từ 21/11/2026.

### Vòng 2: thiên văn agy (`ephemeris.ts`, astronomy-engine 2.1.19) so với `services/astroService.ts` (suncalc 2.0.1)

**Giả thuyết:** suncalc lệch đáng kể ở giờ trăng mọc/lặn (thuật toán gần đúng, và `getMoonTimes` lấy nửa đêm theo
múi giờ CỦA MÁY), astronomy-engine thì không. Thay suncalc chỉ khi điều đó đúng.
**Mẫu chuẩn độc lập:** USNO API `rstt/oneday` (tz=7, độ cao 0 cho cả ba bên), 4 điểm TA_XUA_SON_LA, DEO_O_QUY_HO,
BACH_MA, LANG_BIANG x ngày 5 mỗi tháng 12/2026-11/2027 = 48 điểm-ngày, chưa ai dùng để kiểm. Sự kiện: mặt trời mọc,
lặn, đầu chạng vạng sáng (-6°), trăng mọc, trăng lặn. suncalc chạy hai lần: TZ=Asia/Ho_Chi_Minh (máy người dùng VN)
và TZ=UTC; cổng tính theo lần TZ VN, lần UTC chỉ báo cáo.
**Cổng giữ:** (1) astronomy-engine mọi sự kiện |lệch| <= 1 phút (USNO làm tròn phút); VÀ (2) suncalc TZ VN có trung vị
|lệch| trăng mọc/lặn > 1 phút, HOẶC có sự kiện lệch > 3 phút, HOẶC thiếu/sai ngày sự kiện USNO có. (1) trượt hoặc
(2) không xảy ra -> không giữ, không thêm phụ thuộc. Giữ thì đo thêm cỡ gói (gz) và tải lười nếu > 30 KB.
Độ rọi trăng: chỉ báo cáo, không làm cổng.

### Kết quả đợt "mượn module của nhánh agy" (19/11/2026, chấm sau commit đăng ký d7e5c56)

**Vòng 1 - luật cung đường: KHÔNG GIỮ gì, route-1.2 giữ nguyên.** `npx vite-node scripts/score-agy-route.ts <nhan-duong.json>`, 77 nhãn,
308 giờ, 0 giờ thiếu số, tầm nhìn và xác suất mưa không null giờ nào. Ngưỡng >= 1 (chính):

| Loại (CÓ/KHÔNG) | route-1.2 trúng/sót/nhầm | biến thể trúng/sót/nhầm | cổng |
|---|---|---|---|
| Sương 6/61 - D1 đi trong mây LCL | 5 / 1 / 29 | 5 / 1 / 35 | trượt (a-b): +6 báo nhầm, không bớt sót |
| Mưa 4/67 - D2 mưa giờ 1/4/10, bỏ xác suất | 3 / 1 / 16 | 3 / 1 / 6 | qua (a)-(d) |
| Lạnh 3/0 - D3 gió lùa xe máy | 1 / 2 / - | 2 / 1 / - | CHƯA ĐỦ MẪU (0 nhãn KHÔNG) |

Ngưỡng >= 2: mưa như nhau (0/4/2); sương D1 5/1/28 so 5/1/29. Ca đổi D1 (đều báo nhầm mới, sự thật KHÔNG sương): Ô Quy Hồ 06/11 12:10, 15:34,
08/11 13:35, 15/11 08:17, 08:33; Tà Xùa 05/10 08:30 (mức 3). Ca đổi D2 (đều bớt báo nhầm, sự thật KHÔNG mưa): Ô Quy Hồ 17/10 12:31, 13:15,
02/11 12:14, 03/11 08:01, 04/11 12:26, 13:12, 14:20, 05/11 15:43, 08/11 13:35; Tà Xùa 30/10 15:28. D2 không thêm ca sót nào. Ca D3 bắt thêm: Tà Xùa 06/10 09:30.

**Phản biện độc lập (agent chuyên gia khí tượng vùng núi, một lần) cho D2, từng ý và cách xử lý:**
1. [chặn] D2 đổi ba thứ cùng lúc. -> Đã tách: 6/10 ca bớt nhầm là do bỏ nhánh xác suất (02-05/11, mưa mô hình 0-0,3 mm, xác suất 70-98%),
   4/10 do mưa 0,5-0,9 mm/h (17/10 x2, 08/11, 30/10). 3 ca trúng 12/11 có 1,1-2 mm/h, vẫn trúng với mốc 1 mm. Việc tách làm SAU khi thấy số,
   nên không dùng làm lý do giữ phần nào.
2. [nên xử lý] Chuỗi gần phân tích thiên vị chống nhánh xác suất (ở lead 1-2 ngày, xác suất tổ hợp giữ độ bất định mà mm/h tất định làm mượt).
   -> Đồng ý; 6/10 lợi ích đến đúng từ phần mà phép chấm thiên vị. Không bỏ nhánh xác suất.
3. [ghi chú] 0,1-0,9 mm/h trên đèo hay là mưa phùn giả do nâng địa hình; nâng mốc lên 1 mm hợp lý về khí tượng. -> Ghi nhận, nhưng chỉ có 4 ca
   và việc chọn phần này là sau khi thấy số; chuyển thành biến thể đăng ký trước cho tập sau.
4. [nên xử lý] Mức 2 từ 3 lên 4 mm/h không có số nào ủng hộ (hoà), 3 gần ranh AMS/WMO 2,5 hơn. -> Giữ 3.
5. [nên xử lý] "Nắng đẹp" lúc đăng 12-15h chỉ là sự thật trung bình cho cửa sổ 4 giờ; mưa rào đèo rất cục bộ, nên một phần "báo nhầm" có thể đúng.
   -> Ghi vào cách chấm tập sau: cửa sổ 2 giờ, bản chụp tuyến có lead.
6. [chặn với câu "không tăng bỏ sót"] 4 ca CÓ, 3 cùng ngày 12/11, nên n hiệu dụng ~2: "không thấy tăng", không phải bằng chứng. -> Đúng; ưu tiên
   dân phượt là bỏ sót tệ hơn báo nhầm, nên với bằng chứng mỏng như vậy không hạ độ nhạy cảnh báo.
7. [ghi chú] `TH.RAIN_LIGHT` còn dùng ở Tóm tắt ngày và khối dông. -> Không đổi gì nên không phát sinh hai ngưỡng.
Kết luận vòng 1: không giữ D1, D2, D3. **Đăng ký trước cho tập sau** (bản chụp tuyến `*-routes.json` từ 21/11/2026 có `samples[].wx` theo lead,
ghép nhãn FB đường cùng ngày, cửa sổ [giờ đăng - 2h, giờ đăng], cùng cổng (a)-(d)): D2a = mốc mức 1 lên 1 mm/h, giữ xác suất >= 70% và mức 2 = 3 mm;
D2b = giữ 0,5 mm, bỏ nhánh xác suất. Chấm khi mưa có >= 10 nhãn CÓ hoặc tới 20/12/2026, cái nào trước. D3 chờ có nhãn "không lạnh"
(bộ thu FB hiện chưa gắn `kindsAbsent: cold`).

**Vòng 2 - thiên văn: GIỮ, `astroService` chuyển sang astronomy-engine 2.1.19.** Chuẩn USNO `rstt/oneday`, 48 điểm-ngày (TA_XUA_SON_LA,
DEO_O_QUY_HO, BACH_MA, LANG_BIANG x ngày 5 mỗi tháng 12/2026-11/2027), độ cao 0. |lệch| phút:

| Sự kiện | astronomy-engine trung vị / max | suncalc như app gọi (TZ VN) trung vị / max / số lần > 3 phút |
|---|---|---|
| Mặt trời mọc | 1 / 1 | 1 / 2 / 0 (nhưng là của NGÀY HÔM TRƯỚC: mốc 05:00 VN = 22:00 UTC hôm trước) |
| Mặt trời lặn | 1 / 1 | 1 / 1 / 0 (ngày hôm trước) |
| Đầu chạng vạng -6° | 0 / 1 | 1 / 2 / 0 (ngày hôm trước) |
| Trăng mọc | 0 / 1 | 1 / 63 / 16 |
| Trăng lặn | 1 / 1 | 52 / 67 / 48 (48/48 ra trăng lặn của ngày hôm trước) |

TZ=UTC cho suncalc ra y hệt. Cổng (1) đạt (mọi sự kiện <= 1 phút), cổng (2) đạt (trăng lặn trung vị 52 > 1, có lệch > 3). Thử gọi suncalc kiểu
khác (mốc trưa VN; nửa đêm UTC) vẫn ra sự kiện ngày khác, vì `getMoonTimes` tìm trong cửa sổ 24h theo nửa đêm UTC hoặc múi giờ máy. Độ rọi trăng
không làm cổng. Cỡ gói đo sau build: chunk `astroService` 58,5 KB, gzip 25,7 KB (dưới mốc 30 KB gz đã đăng ký, nên tải lười không bắt buộc), vẫn để
`AnalysisResult` import động cho gói chính không đổi (dòng trăng hiện khi mô-đun về). Bỏ phụ thuộc suncalc. Kiểm đột biến: 3 ca USNO trong `tests/engine.test.ts` trượt cả 3 trên bản suncalc cũ, qua trên bản mới.
Không mượn phần khác của `ephemeris.ts` (đường độ cao 24h, chạng vạng hàng hải): app chưa có chỗ dùng.

## 19/11/2026 (phiếu gd355) - Khung 8 mực áp suất của agy làm CỔNG CHỐNG BÁO NHẦM, chạy BÓNG (đăng ký trước, chưa chạy gì)

Anh Phong chốt (19/11, sau bảng so sánh hai nhánh): giữ engine CloudHunter; thử `cloudSea.ts` của nhánh agy CHỈ như cổng chặn báo nhầm; chạy bóng, không đổi
kết quả hiển thị; chấm trên điểm-ngày chưa thấy. Mục này viết TRƯỚC khi có bất kỳ số nào của cổng trên dữ liệu CloudHunter (commit đăng ký đứng trước commit code).

**Điều đã biết (nguồn: bảng so sánh của Tổng quản, số của agy, chưa tự đo lại):** vệ tinh nghiêm ngặt n=1791, agy báo nhầm 245 / CloudHunter 433; accuracy 82,0% / 72,9%.
Accuracy cao hơn phần lớn do agy báo "có" ít hơn; recall field của agy 20,6% so 64,7%. Nên không có cơ sở tin cổng giữ được ca đúng - đó chính là điều cần chấm.

**Giả thuyết H1.** Khi engine CloudHunter báo "đáng đi" mà thuật toán agy (cửa sổ rạng sáng 04-07h) kết luận `khong`, ca đó nghiêng về BÁO NHẦM nhiều hơn ca còn lại.
Nói cách khác: cổng "đáng đi VÀ agy != khong" loại được tỷ lệ báo nhầm vệ tinh lớn hơn rõ rệt so với tỷ lệ ca đúng (cả vệ tinh lẫn người đi) mà nó loại theo.
H0: cổng chỉ làm mỏng ngẫu nhiên (loại ca đúng và ca nhầm cùng tỷ lệ). Cổng chỉ có chiều CHẶN (veto): không bao giờ thêm báo đúng, không bao giờ thêm báo nhầm.

**Cổng chốt (một biến thể duy nhất, không chọn lại sau khi thấy số):** `G = worthGoing(CloudHunter) VÀ agy.ketLuan != 'khong'` (agy `co` hoặc `co_the` thì giữ). Mọi biến thể khác
(chỉ giữ khi agy `co`; ngưỡng xác suất; theo giờ) nếu có in ra chỉ là THÃM DÒ, không đủ điều kiện để giữ.

**Cách tính cổng (bóng):** chép NGUYÊN VĂN thuật toán `evaluateCloudSeaDawn` v1.0 của agy (cùng hằng số, cùng trọng số) vào `services/agyCloudSea.ts`; một bộ chuyển đổi
đưa dữ liệu CloudHunter vào, KHÔNG gọi thêm API (ngân sách Open-Meteo, quy tắc dev 11). Lệch so với agy, ghi thẳng ra đây vì làm đổi ý nghĩa của phép thử:
1. Mô hình: bản chụp xếp hạng dùng GFS + ICON + UKMO (không có ECMWF/JMA như agy). Trọng số theo bảng của agy: gfs 0,20, icon 0,25, ukmo 0,20 (UKMO không có trong bảng agy, rơi về mặc định 0,20 của chính code agy).
2. Mực áp suất: CloudHunter có 975/950/925/900/850/800/700 hPa (7 mực), agy 1000/950/925/900/850/800/700/600 (8 mực). Không có 1000 và 600 hPa.
3. Gió: chỉ có gió ở 925/850/700 hPa; không có gió 10 m, gió giật, tầm nhìn. Nhánh tầm nhìn trong `biMuTaiDinh` và nhánh gió 10 m/giật không bao giờ chạy; gió cổng lấy từ nội suy mực.
4. Điểm đặt dự báo: lấy `elevation=` đáy thung lũng như engine CloudHunter, nên nhiệt/ẩm 2 m là tại đáy; `modelElevationM` không có (nhánh dùng nó tắt).
5. `valleyElevationM` = đáy DEM của CloudHunter (đủ cho mọi điểm xét), không phải ước tính tạm của agy.
Vì 1-4, đây là "thuật toán agy trên đầu vào CloudHunter", KHÔNG phải bản chạy y nguyên của agy; kết luận của vòng này chỉ áp cho dạng đó. Số của agy (82%/245) không được dùng làm bằng chứng.

**Cột bóng:** mỗi điểm trong `data/observations/<D>-forecast.json` (bản chụp mới) có thêm `agyGate` = `{ ver, ketLuan, xacSuat, doDongThuan, soMoHinh, gioTot }` hoặc
`{ ver, error }` (lỗi thì ghi lỗi, không bỏ trống im lặng). Bản chụp cũ không được vá. Hiển thị, điểm, trạng thái, `worthGoing`, thứ hạng KHÔNG đổi (test so trước/sau).

**Tập chấm (chưa thấy):** chỉ điểm-ngày thuộc bản chụp CÓ cột `agyGate` (tức từ bản chụp đầu tiên sau commit code, không ngày nào trước đó, không chụp bù); nhãn theo đúng
luật `calibrate.ts` hiện tại (vệ tinh bỏ BLOCKED_ABOVE/NO_DATA; nhãn người đi > Facebook > vệ tinh cho cùng điểm-ngày). Ba tập: VT = điểm-ngày mà nhãn cuối là vệ tinh; FIELD = nhãn người đi + Facebook dùng được (độ tin >= 0,6).
Không dùng ca nào để nghĩ ra cổng (cổng chốt trước khi có số nào trên dữ liệu này).

**Khi chấm:** khi FIELD có >= 30 điểm-ngày mới, hoặc ngày 20/12/2026, cái nào TRƯỚC. Công cụ chấm viết trước khi có dữ liệu (`scripts/score-agy-gate.ts`), in cả bảng đếm thô.

**Phản biện độc lập (1 lần, trước khi commit đăng ký) và cách đã xử lý:** 4 ý [chặn] và 7 ý khác, đều đã đưa vào phần dưới: (1) ca `chua_co_du_lieu`/lỗi chuyển đổi = KHÔNG chặn, báo riêng;
(2) K3 viết lại thành hiệu hai tỷ lệ loại có cận bootstrap; (3) K1-K3 trên VT bắt buộc kèm số FIELD, ngược hướng thì không giữ; (4) tương quan ngày: bootstrap theo KHỐI 3 ngày + số ngày độc lập;
(5) K4/K5 là điều kiện LOẠI, kèm cận trên 95% của tỷ lệ mất; (6) công suất: không hạ ngưỡng; (7) in tỷ lệ nhánh sương bị tắt + số mô hình hợp lệ; (8) chấm MỘT lần, ghi mọi lần chạy, đóng băng `calibrate.ts`,
bộ chuyển đổi chỉ test bằng dữ liệu tổng hợp; (9) cắt/phân tầng theo `ENGINE_VERSION`; (10)-(11) trần theo điểm.

**Quy tắc xử lý (đóng băng tại commit đăng ký):**
- Cửa sổ rạng sáng = bốn giờ 04, 05, 06, 07 theo giờ VN của ngày D (`Asia/Bangkok` trong dữ liệu). Giờ nào thiếu mô hình/mực thì agy tự bỏ giờ đó (code agy); không có giờ hợp lệ nào = `chua_co_du_lieu`.
- `chua_co_du_lieu` hoặc lỗi bộ chuyển đổi: G GIỮ nguyên quyết định CloudHunter (không chặn). Đếm riêng theo từng tập; nếu > 10% điểm-ngày của tập thì kết quả tập đó chỉ là "chưa đủ".
- Chỉ xét ca CloudHunter đã báo đáng đi (`worthGoing`) tại bản chụp, cùng một `ENGINE_VERSION`; đổi phiên bản giữa chừng thì cắt tập theo phiên bản, mỗi phần chấm riêng.
- Mã bộ chuyển đổi chỉ được thử bằng dữ liệu tổng hợp trong `tests/`, KHÔNG dùng nhãn/ca cũ để gỡ lỗi nó. Hằng số của agy (52, 55/35, 0,45...) do nhánh agy chỉnh trên dữ liệu có thể chứa các ca cũ: "chưa thấy" chỉ đúng với điểm-ngày mới.
- Đóng băng `scripts/calibrate.ts` (luật gán nhãn) tại commit đăng ký; đổi luật gán nhãn giữa chừng thì tập chấm vẫn dùng bản đóng băng.

**Tiêu chí GIỮ (tất cả phải đạt; X = 25 và các con số dưới do em đặt trước khi chạy, không chỉnh theo kết quả; thiếu mẫu thì CHỜ, không hạ ngưỡng):**
Ký hiệu trên tập VT: FA = ca CloudHunter báo đáng đi mà vệ tinh "không biển mây"; TP = báo đáng đi mà vệ tinh "có". `lossFA` = tỷ lệ FA bị G loại, `lossTP` = tỷ lệ TP bị G loại.
- K1. `lossFA` >= X = 25%, với điều kiện CloudHunter có >= 40 FA trên >= 15 ngày khác nhau, không ngày nào chiếm > 20% số FA, không điểm nào chiếm > 25%; không đủ thì "chưa đủ mẫu", không kết luận.
- K2. Bootstrap theo KHỐI 3 ngày liên tiếp (rút lại các khối có thay thế, 2000 lần, hạt giống 19112026): phân vị 5% của `lossFA` > 0 VÀ phân vị 5% của (`lossFA` - `lossTP`) > 0. Điều thứ hai là phép thử "hơn làm mỏng ngẫu nhiên" (thay cho K3 bản đầu).
- K3. `lossTP` <= `lossFA` - 15 điểm phần trăm (với K1 sát 25% thì `lossTP` <= 10%), và F1 vệ tinh của G >= F1 vệ tinh của CloudHunter.
- K4. FIELD (người đi + Facebook dùng được): G KHÔNG mất báo đúng nào so với CloudHunter và F1 FIELD của G >= của CloudHunter. FIELD cần >= 8 ca CÓ biển mây; ít hơn thì K4 "chưa kiểm được" = chưa đủ để giữ. Đây là điều kiện LOẠI, không phải bằng chứng giữ: báo kèm cận trên 95% (Clopper-Pearson) của tỷ lệ mất (0 mất / 8 ca vẫn cho phép mất tới ~31%).
- K5. Riêng người đi tận nơi: >= 8 ca CÓ mới được tính, không mất ca nào; ít hơn thì ghi "chưa kiểm được". Một ca mất là đủ để không giữ.
- K6. K1-K3 trên VT chỉ chứng minh khớp với vệ tinh, không chứng minh đúng thực địa: bắt buộc in cùng số (`lossFA`, `lossTP` theo định nghĩa tương ứng) trên FIELD; nếu FIELD đi NGƯỢC hướng VT (loại TP nhiều hơn FA) thì không giữ.
Báo thêm (không phải tiêu chí): số điểm khác nhau và số ngày trong từng tập; tỷ lệ CloudHunter nhầm nền; tỷ lệ giờ-điểm bị tắt nhánh sương (không có tầm nhìn) và số mô hình hợp lệ trung bình; biến thể thăm dò (chỉ giữ khi agy `co`) nếu muốn xem độ nhạy.
**Chấm MỘT lần** vào ngày chấm (FIELD >= 30 điểm-ngày mới, hoặc 20/12/2026, cái nào TRƯỚC); cấm xem số trung gian, mọi lần chạy `score-agy-gate.ts` đều ghi ngày giờ vào tệp này. Nếu đến 20/12 còn thiếu mẫu cho K1/K4 thì ghi "chưa đủ mẫu", để bóng chạy tiếp, chấm lại với cùng ngưỡng.
Không đạt một tiêu chí = KHÔNG giữ (bỏ cột bóng hoặc chạy tiếp, ghi kết quả). Đạt hết = chỉ ĐỦ ĐIỀU KIỆN ĐỀ XUẤT bật; bật vào kết quả thật là sửa lớn: theo Luật cổng (chấm lại trên toàn kho,
agent phản biện, anh duyệt, đổi `ENGINE_VERSION`), không tự bật.

**Hạn chế đã biết (ghi trước):** vệ tinh Himawari mù sương mỏng thung lũng và mây cao che (nhãn VT "không có biển mây" có thể sai); cổng có thể "đúng vì lý do sai" khi hai thuật toán cùng thiên về
ẩm đáy; nhánh sương (`biMuTaiDinh`) của agy yếu đi vì thiếu tầm nhìn/gió 10 m, tức cổng yếu đúng ở chỗ nó đáng giá nhất; chỉ còn 3 mô hình nên `fCo >= 0,45` nghĩa là cần 2/3 mô hình đồng thuận; bản chụp xếp hạng có lead
ngắn (~3-12 giờ); hai kênh chụp (GitHub / máy nhà) chạy cùng mã nên không thành biến.

## 19/11/2026 (phiếu g2448, bổ sung gd355) - Vòng TỰ ĐO / TỰ BẬT CỜ / TỰ LÙI cho cổng bóng agy (đăng ký trước, chưa có số nào)

Anh Phong muốn phép đo tự chạy, tự so, không chờ người (lời Tổng quản chuyển, phiếu g2448). Phần dưới SỬA luật "chấm MỘT lần, không tự bật" của mục gd355 ở trên, đăng ký TRƯỚC khi có bản chụp nào mang cột `agyGate`
(0 điểm-ngày có cột lúc viết). Tiêu chí K1-K6, X = 25, quy tắc thiếu dữ liệu, bootstrap, luật gán nhãn: GIỮ NGUYÊN, không chạm. Chỉ đổi QUY TRÌNH:

**Phạm vi "tự điều chỉnh":** chỉ là bật/tắt MỘT cờ `data/agy-gate-flag.json` (`enabled`, mặc định false). Không dò ngưỡng, không đổi tiêu chí, không sửa code engine. Cờ bật: kết quả hiển thị
`worthGoing = worthGoingBase && agyGate.ketLuan != 'khong'` (chỉ HẠ, không bao giờ nâng; `chua_co_du_lieu`/lỗi/null = không chặn). Bản chụp luôn ghi `worthGoingBase` (quyết định CloudHunter chưa qua cổng) để chấm tiếp.

**Bảng đối chiếu hằng đêm (chỉ thông tin):** mỗi đêm ghi `data/agy-gate-doichieu.json` + `.md`: n từng tập, số ngày, đếm thô CloudHunter. Số phụ thuộc cổng (lossFA/lossTP/F1/recall hai bên, khoảng tin cậy)
CHỈ in khi tập đủ ĐIỀU KIỆN CHẤM của đăng ký (FIELD >= 30 điểm-ngày mới VÀ >= 10 ca CÓ, hoặc 20/12/2026); chưa đủ thì ghi "chưa đủ mẫu", không in số, không kết luận. Bảng không phải lần chấm.

**Lượt quyết định (tối đa 3):** L0 = đêm đầu tiên đủ điều kiện chấm; L1 = L0 + 14 ngày; L2 = L0 + 28 ngày (nhớ trong tệp cờ, mỗi lượt chấm đúng một lần, cùng mã, cùng ngưỡng). Tại một lượt, trên tập của `ENGINE_VERSION` mới nhất:
- mọi K đều DAT (và thiếu dữ liệu cổng <= 10%) => BẬT cờ.
- có K nào TRUOT => KHÔNG GIỮ, cờ giữ tắt, KHÓA vĩnh viễn (không còn lượt).
- còn K CHUA_DU => chờ lượt sau; hết L2 vẫn chưa đủ => `het_luot_chua_du`, cờ tắt, bóng chạy tiếp, người quyết.
Ba lượt là ba lần nhìn: khả năng đạt do may tăng nhẹ, ghi trước ở đây, không hạ ngưỡng bù.

**Tự lùi (sau khi bật), chấm trên CA MỚI từ ngày bật (so `worthGoingBase` với cổng), mỗi đêm:** TẮT cờ và KHÓA (chỉ người bật lại) nếu có một trong:
(R1) >= 2 điểm-ngày FIELD có biển mây mà cổng loại; (R2) >= 1 điểm-ngày NGƯỜI ĐI TẬN NƠI có biển mây mà cổng loại (cùng tinh thần K5); (R3) FIELD mới có >= 8 ca CÓ và `lossTP` FIELD > `lossFA` FIELD (cùng tinh thần K6).
Ngược lại giữ bật. Không có luật "tự bật lại" sau khi lùi (chống nhấp nháy).

**Phép đo hỏng:** tập rỗng khi đáng lẽ có (bản chụp từ 21/11 không có cột `agyGate`, hoặc > 10% điểm-ngày của bản chụp mới nhất ghi `error`, đọc tệp lỗi, ngày bản chụp mới nhất cũ > 3 ngày) là LỖI ĐO: thoát mã khác 0,
báo đỏ qua bao_chung, KHÔNG đổi cờ, KHÔNG ghi 0. Mọi lần đổi cờ: commit + một dòng vào tệp này + tin báo một lần + `gh workflow run deploy.yml`.

**Phản biện độc lập cho phần sửa quy trình:** một agent (xem mục kết quả bên dưới khi có).
**Không dùng LLM** trong vòng này; 0 lượt Open-Meteo thêm (chỉ đọc kho). D2a/D2b `routeDifficulty` KHÔNG vào vòng tự bật này (cần gọi Open-Meteo historical và nhãn đường, ngày chấm 20/12 hoặc >= 10 CÓ); chỉ đếm nhãn ghi vào bảng nếu có sẵn.

**Sửa đăng ký sau phản biện độc lập (g2448, vẫn trước khi có số nào và trước khi commit code vòng tự động).** Agent phản biện (đọc đăng ký + score-agy-gate.ts, không được đưa kết luận mong muốn) nêu 5 ý chặn + 6 ý khác. Xử lý:
1. [chặn] K3 và K6 khi mẫu 0/NaN: lỗi viết (NaN so sánh cho DAT/TRUOT bừa, TRUOT lại khoá vĩnh viễn). Sửa: K3 = CHUA_DU khi VT có < 8 báo đúng (TP); K6 = CHUA_DU khi FIELD có < 8 TP hoặc lossTP/lossFA là NaN. Ngưỡng và hướng so sánh giữ nguyên; chỉ thêm cổng mẫu tối thiểu 8 (bằng K4/K5).
2. [chặn] Chấm sau khi bật cờ: mọi phép chấm đọc `worthGoingBase ?? worthGoing` (quyết định TRƯỚC cổng), kèm test đột biến cho cờ bật.
3. [chặn] "Đủ điều kiện chấm" là MỘT hằng dùng chung (công cụ chấm, bảng đêm, vòng tự động): FIELD >= 30 điểm-ngày mới VÀ >= 10 ca CÓ trong FIELD, hoặc hôm nay >= 20/12/2026.
4. [chặn] Thiếu cột: trong bản chụp đã có cột, điểm không có `agyGate` tính là lỗi (vào mẫu số của ngưỡng 10%); ngưỡng 10% tính trên 7 bản chụp mới nhất có cột, không chỉ bản mới nhất.
5. [chặn] Lỗi đo KHÔNG tiêu lượt: lượt chỉ tính khi đã chấm xong và đã ghi + đọc lại tệp cờ; lỗi đo thì hoãn sang đêm sau.
6. Ba lần nhìn dùng dữ liệu cộng dồn nên không độc lập: BẬT cần mọi K = DAT ở HAI lượt liên tiếp (L0&L1 hoặc L1&L2), bật tại lượt thứ hai. Tức bật sớm nhất ~14 ngày sau ngày đủ mẫu. Ngưỡng không đổi.
7-8. R1 đếm số NGÀY khác nhau (>= 2 ngày khác nhau mất ca CÓ FIELD, vì một ngày diện rộng không được tự kích R1); thêm trần "không quá 25% ca bị mất thuộc một điểm" chỉ để báo. Giám sát tự lùi chỉ trong 60 ngày sau khi bật (sau đó coi là đã qua kiểm, vẫn chấm và ghi, không tự lùi nữa). Ghi rõ: tự lùi là HÀNH VI DỰ KIẾN, không phải bằng chứng cổng sai (công suất thấp, lùi nhầm có thể xảy ra); không bật lại tự động.
9. Mốc "ca mới": mỗi bản chụp ghi `worthGoingBase` khi cờ bật; tập sau bật = bản chụp có `worthGoingBase`. Nhãn đến muộn thì lần chấm đêm sau tự gồm.
10. Chống rò số: tệp cờ chỉ ghi trạng thái, ngày, lượt (không số); bảng đêm không in số phụ thuộc cổng, kể cả "thiếu dữ liệu cổng", khi chưa đủ điều kiện chấm; `--xem-trung-gian` bị từ chối khi vòng tự động đang chạy (`auto`). Cột `agyGate` từng điểm vẫn nằm công khai trong kho: không che được, ghi nhận là hạn chế.
11. `ENGINE_VERSION` đổi giữa chừng: quyết định chỉ trên MỘT phiên bản (của bản chụp mới nhất); đổi phiên bản thì đặt lại bộ đếm lượt về L0 và ghi vào tệp cờ.

## 20/11/2026 - Phiếu g9214: Tà Xùa 19/11 có biển mây từ sáng tới trưa, bản chụp gọi FOG (ĐĂNG KÝ TRƯỚC khi đo)

**Ca (đã biết trước khi viết đăng ký):** anh báo 20/11 00:20: 19/11 Tà Xùa biển mây từ sáng tới giữa trưa, sau gió mùa 18/11 (mưa diện rộng, hạ nhiệt mạnh), và nói đã có ngày tương tự. Đã nhập nhãn `2026-11-19-ta-xua` (người đi, BELOW, DAWN) vào `field-reports.json`. Bản chụp 18/11 19:30 VN: FOG 78, đồng thuận 100% (gfs đỉnh mây 1.080m, icon 1.570m, ukmo 2.084m; chỗ đứng 1.800m), ΔH +230m, không khuyên đi. Vệ tinh 19/11 BLOCKED_ABOVE (mây cao), nên không có nhãn vệ tinh. Ca này là ca dùng để nghĩ ra giả thuyết: KHÔNG được tính là lợi ích của bản sửa.

**Đã biết, không làm lại:** `docs/kiem-chung-ngoai-mau-va-ve-tinh.md` (engine-2.8.4): trần ΔH 250m cho cổng `observerInCloud` đã chấm trên 645 dòng và BỊ BÁC (18 dòng đổi, 17 sai; 16/17 có nhãn vệ tinh CLEAR vì `estimateCloudTop` dựng mặt mây giả ngày trời quang). Đừng thử lại trần ΔH. Điều chưa thử: tách ngày "mô hình thấy mây thật dưới chân" khỏi ngày "mô hình không thấy mây".

**Giả thuyết H (chốt trước):** cổng `observerInCloud` đúng vì lý do sai trên ngày quang (che lỗi mặt mây giả) nhưng SAI trên ngày mây thật diện rộng sau gió mùa, nơi mô hình báo mây tầng thấp thật dưới chân. Dấu phân biệt chỉ dùng đầu vào engine đã đọc: `cloud_low_dawn` (mây tầng thấp rạng sáng, trung bình mô hình). Luật R duy nhất: khi nhãn FOG của một mô hình đến từ nhánh `observerInCloud` VÀ ΔH > 100m (WORTH_GOING_DELTA_H) VÀ `cloud_low_dawn` >= 62,5% (5/8 okta = "broken", định nghĩa WMO, không phải số dò theo dữ liệu), thì mô hình đó xếp theo ΔH như không có cổng. Không có ngưỡng nào khác được thử.

**Phép đo (chốt trước):** (1) tập = mọi dòng bản chụp có nhãn (người đi, Facebook >= 0,6, vệ tinh) mà nhãn tổng hợp là FOG với ΔH > 100m và đồng thuận >= 50% (lớp bị cổng chặn); (2) với mỗi dòng, tải lại dữ liệu mô hình của ĐÚNG ngày (một mẻ, không fetch hai lần rồi so), tính luật cũ và luật R, in MỌI dòng đổi kết luận theo cả hai chiều, tách theo nguồn sự thật; (3) loại ca 19/11 Tà Xùa khỏi mọi số đếm. **Tiêu chí nhận R (chỉ khi đủ cả ba):** (a) các dòng đổi sang "khuyên đi" có độ chính xác >= 50% và >= 3 NGÀY khác nhau đúng; (b) >= 2 ca đúng do người đi/Facebook (không chỉ vệ tinh); (c) không ca nào đang khuyên-đi-đúng bị mất (R chỉ thêm khuyến nghị nên BỎ SÓT không thể tăng, báo nhầm tăng thì nêu số). Không đạt thì không đổi engine; chỉ giữ nhãn và ghi kết quả ở đây. Nếu nhận R: đây là sửa lớn (đổi cổng trạng thái), cần agent phản biện độc lập, `ENGINE_VERSION` mới, AGENTS/README. Không chỉnh 62,5% theo kết quả.

**Trạng thái:** chưa đo. Open-Meteo đang trả HTTP 429 (đo 20/11 00:33), dự kiến hết hạn mức sau ~07:00; script đo viết sau khi có số, nhưng tiêu chí ở trên không đổi.

**KẾT QUẢ g9214 (20/11/2026 10:30, `scripts/study-observer-lowcloud.ts`, một mẻ dữ liệu tải lại, lô 6 điểm vì lô lớn bị Open-Meteo trả 200 rỗng): LUẬT R KHÔNG ĐẠT, engine giữ nguyên engine-2.8.3.** Tập 62 dòng có nhãn thuộc lớp FOG/ΔH > 100m/đồng thuận >= 50%; tính lại luật cũ trùng nhãn bản chụp 40/61 (Open-Meteo viết đè quá khứ, ghi để biết độ lệch). R đổi 15 dòng sang "khuyên đi", 0 dòng mất: đúng 4 (trên 2 ngày: 02/11 Lảo Thẩn, Nhìu Cồ San, Ky Quan San; 06/11 Nam Kang Ho Tao), báo nhầm 11 => chính xác 27% (cần >= 50%), 2 ngày (cần >= 3), 0 ca người đi/Facebook (cần >= 2). Cả 15 đều là nhãn vệ tinh; 11 ca nhầm đều có mây thấp mô hình >= 62,5% nhưng vệ tinh nói không có biển mây (Lảo Thẩn, Nhìu Cồ San, Ngũ Chỉ Sơn, Chiêu Lầu Thi 21/10; Pù Luông 25/10, 02/11, 03/11, 06/11...). Tức "mô hình báo mây thấp dày" KHÔNG tách được ngày có biển mây khỏi ngày không. Ca 19/11 Tà Xùa (mây thấp 100/98/91) dưới R vẫn là FOG, khuyên false: R không cứu nổi chính ca đề ra nó. Kết luận: đã thử và bỏ, không chỉnh 62,5%, không thử ngưỡng khác. Tham số `observerFogRelaxLowCloud` giữ lại mặc định tắt cho script đo, như `observerFogMaxDeltaH`. Lỗi gốc của ca 19/11 (cổng đọc mực dưới chân là "trong mây") vẫn mở; hướng còn lại cần dữ liệu khác (nhãn người đi đủ nhiều ở lớp FOG ΔH>100m: hiện chỉ có các ca Tà Xùa 27/9, 1-4/10, 19/11, không đủ để chấm). Ghi nhãn 19/11 để lần chấm sau.

## 23/11/2026 - thêm điểm BEST_VIEW_SAPA + nhãn người đi (phiếu g97f6) - tinh chỉnh nhỏ, engine không đổi
Nhập dữ liệu: điểm thư viện mới từ plus code anh gửi (DEM 1469m, đáy 1161m) + báo cáo BELOW THICK 23/11 8h. Không đổi `ENGINE_VERSION`, không đụng ngưỡng. Ghi nhận ca bỏ sót lân cận (Hàm Rồng/Hang Đá FOG 100% trong bản chụp 22/11, thực tế có biển mây Mường Hoa); chi tiết `docs/vong-kiem-chung-va-facebook.md`.

## 23/11/2026 - nhãn người đi Tà Xùa (phiếu g7dd1), tinh chỉnh nhỏ, engine KHÔNG đổi
Anh báo + ảnh FB 6h00 23/11: biển mây dưới chân Tà Xùa. Bản chụp 23/11: FOG 72, mặt mây 1629m < điểm đứng 1800m, không đáng đi = BỎ SÓT (agy cũng 'không'). Thêm `2026-11-23-ta-xua` vào field-reports. Cùng kiểu ca Sa Pa 23/11 và Tà Xùa 21/11: gom thêm ca người đi trước khi xét cổng FOG theo Luật cổng.

## 23/11/2026 - nhãn người đi Pha Luông (phiếu g0721), tinh chỉnh nhỏ, engine KHÔNG đổi
Video FB + lời anh: biển mây dưới Pha Luông sáng 23/11. Bản chụp: FOG 62, mặt mây 2210m > chỗ đứng 1880m, không đáng đi = BỎ SÓT. Ngày 23/11 đã có 3 ca FOG-bỏ sót có nhãn người (Sa Pa, Tà Xùa, Pha Luông) cùng một vùng khí tượng diện rộng; đây là lý do ưu tiên đo cổng FOG trên toàn kho khi đủ ca, KHÔNG sửa theo 3 ca này. Vệ tinh Himawari 23/11 chưa có (job chạy ~15:40 VN).

## 23/11/2026 - lịch đợt FOG chốt trước (phiếu g36d5), chưa sửa gì
Người đi: 22/56 bỏ sót, 11 trong đó app báo FOG. Đợt sửa cổng FOG mở khi >= 15 ca FOG-bỏ sót (người đi/FB) hoặc 15/12/2026; theo đủ Luật cổng. Chi tiết `docs/tong-hop-ca-va-hoc-tu-du-lieu.md`.

## 23/11/2026 - ảnh Ngũ Chỉ Sơn (phiếu gc42d), chỉ ghi nhận, KHÔNG thêm nhãn, engine không đổi
Anh báo + ảnh FB (đăng ~11h): chân/sườn Ngũ Chỉ Sơn, biển mây trắng phủ thung lũng bên dưới, trời xanh, mây ở mức thấp hơn người chụp. Anh nói "khu vực chân núi", điểm đứng KHÔNG phải đỉnh (thư viện NGU_CHI_SON ở chóp 2858m) và không rõ cao độ, nên không ghép vào điểm nào (cùng cách xử lý Best View trước khi có plus code). Bản chụp 23/11: NGU_CHI_SON DISSIPATING 50, mặt mây 2201m (cả 3 mô hình), không đáng đi; Fansipan cùng khu DISSIPATING 51, mặt mây 2202m. Mô hình đặt mặt mây ~2200m ở cả Sa Pa lẫn Ngũ Chỉ Sơn, trong khi ảnh thật có biển mây dưới người đứng ở sườn: nhất quán với chuỗi ca Sa Pa/Tà Xùa/Pha Luông 23/11 (mặt mây mô hình quá cao so với thực tế), nhưng không có cao độ điểm đứng nên không đếm vào 15 ca của đợt FOG. Muốn đếm: cần plus code/tên điểm đứng.

## 27/11/2026 - Tà Xùa 27/11 + rà ngày diện rộng 26-27/11 (phiếu gb324), tinh chỉnh nhỏ, engine KHÔNG đổi
Anh gửi ảnh livestream Tà Xùa ~07:20 27/11 (biển mây dày dưới chân) và báo 26-27/11 nhiều nơi có biển mây diện rộng (sau đợt gió mùa đông bắc, bài Ba Vì 26/11 có nhắc "hôm qua gió mùa đông bắc thổi mạnh"). Nhập `2026-11-27-ta-xua` (BELOW, SOCIAL_VIDEO). Không thêm nhãn cho "nhiều nơi" vì không có tên điểm.
- Chấm theo bản chụp: 26/11 Tà Xùa STATIC 64 khuyên đi = ĐÚNG, Ba Vì FLOWING 48 khuyên đi = ĐÚNG, Fansipan DISSIPATING 44 = BỎ SÓT. 27/11 Tà Xùa FOG 50 = BỎ SÓT (FOG-bỏ sót người đi thứ 12/15 của lịch đợt FOG).
- Cơ chế 27/11 (đo từ bản chụp): GFS và ICON cho mặt mây 3.560m, tức nhánh `moistTop >= 2900 => +400m` của `estimateCloudTop` (RH >= 80% liên tục tới 700hPa); UKMO 2.207m (nhánh 800hPa + 150m). Thực tế mặt mây dưới 1.800m. 26/11 cả ba mô hình cho ~1.064m nên đúng.
- 11 ca FOG-bỏ sót cũ + ca này tách làm HAI kiểu: (a) mặt mây mô hình CAO HƠN chỗ đứng, ghim ở mực lưới ~2.200m hoặc ~3.560m (Hang Kia 1/10, Ô Quy Hồ 16/10, Ba Vì 24/10, Pha Luông 23/11, Tà Xùa 27/11); (b) mặt mây đã THẤP HƠN chỗ đứng mà vẫn FOG do cổng `observerInCloud` (Kỳ Quan San 20/10, Ba Vì 31/10, Tà Xùa 4/10, 19/11, 23/11). Đợt FOG phải đo hai kiểu riêng, một bản sửa khó cứu cả hai.
- Hồ sơ tải lại (Open-Meteo forecast past_days, tức lần chạy MỚI NHẤT, không phải số lúc chụp; chỉ để gợi giả thuyết) Tà Xùa 27/11 06h: RH 1000-800hPa 73-92% ở cả ba mô hình, GFS nhiệt 925->850hPa gần đẳng nhiệt (14,0 -> 13,8°C trên ~715m) = lớp rất ổn định nhưng không phải nghịch nhiệt nên `capByInversion` không chặn. Ứng viên (ĐOÁN, chưa đo) cho đăng ký đợt FOG: chặn mặt mây ở lớp ổn định (giảm nhiệt chậm bất thường), không chỉ ở nghịch nhiệt thật. Phải viết thành giả thuyết + phép đo trước khi chấm, theo Luật cổng.
- Vệ tinh 26/11: 45/59 điểm BLOCKED_ABOVE (mây tầng cao che), đúng ngày diện rộng. Ngày biển mây sau gió mùa có mây ti phía trên nên nhãn vệ tinh mù; nguồn sự thật cho kiểu ngày này chỉ còn người đi/FB.
- Bổ sung (phiếu ge6ee, 27/11): anh kể Fansipan sáng 27/11 cũng có biển mây, nắng đẹp; nhập `2026-11-27-fansipan`: app DISSIPATING 52, mặt mây 2879m, ΔH +264 = BỎ SÓT lần hai liên tiếp ở Fansipan (kiểu DISSIPATING ΔH > 0 đỉnh cao, không phải FOG, không đếm vào 15 ca FOG). Bài FB Best View Sa Pa: biển mây dày từ ~1h sáng 26/11, ghi NIGHT (không chấm). Ngày 27/11 tóm lại: Tà Xùa và Fansipan đều có biển mây, app không khuyên đi điểm nào trong hai = hai kiểu lỗi khác nhau cùng một sáng.

## 27/11/2026 - ĐĂNG KÝ TRƯỚC: kẹp mặt mây ở tầng ổn định (biến thể VS, phiếu gee64) - ĐÃ CHẤM: BÁC
Anh duyệt hướng (phiếu gee64). Theo Luật cổng đây là sửa lớn (`estimateCloudTop`/nắp), nên ghi giả thuyết + phép đo + tiêu chí TRƯỚC khi lấy dữ liệu và chấm.
- **Giả thuyết H-S:** trong cột khí ẩm sâu (RH >= 80% liên tục lên cao), lớp mây người săn mây thấy bị chặn ở tầng ỔN ĐỊNH đầu tiên trên đáy mây (suy giảm nhiệt <= 3,5°C/km), kể cả khi không có nghịch nhiệt thật. Engine hiện chỉ dùng tầng ổn định đó khi profile anomaly "dốc" (`ramp`); ngoài ra thì không kẹp và mặt mây nhảy lên 2.200m/3.560m. Đây là nguồn của kiểu (a) trong 12 ca FOG-bỏ sót.
- **Biến thể duy nhất VS** (`CloudTopOpts.stableCap`, mặc định tắt): `computeInversion` không cho nắp (`height = null`) thì lấy `capLayerBase` (hàm có sẵn, ngưỡng `CAP_LAPSE_RATE` 3,5 có sẵn, KHÔNG đổi); áp đúng hai luật cũ của `capByInversion` (nắp > đáy mây + 100m, chỉ kẹp khi mặt mây vượt nắp > 300m). Không thêm biến thể khác sau khi xem kết quả.
- **Dữ liệu:** `scripts/replay-raw.ts` mẻ mới (historical-forecast-api, GFS/ICON/UKMO, gần lead 0, KHÔNG phải số app thấy lúc chụp: chỉ so V0 với VS trên cùng mẻ). Chấm bằng `scripts/ab-stablecap.ts`, sự thật: người đi + FB (rạng sáng) và vệ tinh (bỏ BLOCKED_ABOVE/NO_DATA).
- **Tiêu chí (chốt trước):**
  1. Cứng: BỎ SÓT người đi + FB của VS không được nhiều hơn V0.
  2. Cứng: báo nhầm người đi + FB tăng tối đa 1.
  3. Cần: VS bắt thêm >= 2 ca người đi/FB có biển mây mà V0 sót, KHÔNG tính Tà Xùa 27/11 (ca nảy ra ý tưởng).
  4. Vệ tinh: balanced accuracy (đáng đi so với nhãn vệ tinh) bootstrap theo NGÀY 2.000 lần; nếu khoảng 95% của (VS - V0) nằm hẳn dưới 0 thì BÁC.
  5. In mọi ca đổi kết luận theo hai chiều, tách Tà Xùa / Fansipan / Ba Vì / >= 2.400m / < 2.400m, và tỉ lệ ca VS thực sự kẹp.
- Đạt 1-4 thì gọi agent khí tượng độc lập phản biện, rồi mới bật vào engine (đổi `ENGINE_VERSION`). Trượt bất kỳ thì KHÔNG đổi engine, chỉ ghi kết quả. Không chỉnh ngưỡng 3,5 hay luật +300m theo kết quả.
- **KẾT QUẢ (27/11/2026 10:10, cùng ngày): BÁC. Engine không đổi.** Mẻ `replay-raw` WIN=7: 4.267 điểm-ngày (lô 25-27/11 lần đầu dính 429 giới hạn giờ, đã lấy bù; kiểm lại: mọi nhãn người đi >= 20/11 đều có dữ liệu thô). Hàng có sự thật 2.060, có dữ liệu 2.044 (người đi 59, FB 29, vệ tinh 1.956).
  - V0 và VS GIỐNG HỆT ở mọi nguồn và mọi nhóm: người đi + FB đúng 31 / sót 31 / nhầm 3 / đúng-không 23 cho cả hai; vệ tinh balanced accuracy 0,571 = 0,571, KTC [0,000; 0,000]. Tiêu chí 1, 2, 4 đạt vì không đổi gì; **tiêu chí 3 TRƯỢT (bắt thêm 0 ca, cần >= 2)**.
  - Kiểm "đo hụt hay thật": VS có chạy. Gọi thẳng `estimateCloudTop` trên toàn mẻ: đổi 134/12.549 lượt mô hình-ngày, lọt qua `combineModels` thành 80 điểm-ngày đổi mặt mây (vd 9/11 cả loạt Hoàng Liên Sơn 3.610 -> 2.110m). Nhưng cả 80 đều là ngày vệ tinh BLOCKED_ABOVE, trạng thái RAIN/FOG/DISSIPATING giữ nguyên, và không ngày nào có nhãn người đi/FB. Tức là VS chỉ kích vào những ngày ẩm sâu tới 700 hPa có mưa, không phải sáng biển mây.
  - VÌ SAO giả thuyết sai cơ chế (soi trực tiếp các ca): ở Tà Xùa 26-27/11 và Sa Pa 23, 26/11, `computeInversion` ĐÃ thấy nghịch nhiệt Strong (anomaly 5,6-10,2) và CÓ độ cao, nên nhánh VS (`height = null`) không bao giờ chạy tới. Lời em nói với anh ở phiếu gee64 ("app chỉ chặn mặt mây khi nhiệt độ thật sự tăng theo độ cao, nên bỏ qua trường hợp này") là SAI với chính các ca đó. Thứ thật sự chặn: (i) Tà Xùa: profile "dốc" nên nắp = `capLayerBase` = mực 925 (~830m), sát đáy mây (750-890m), bị luật "nắp <= đáy + 100m thì không tin" bỏ qua; (ii) Sa Pa: nắp lấy ở ĐỈNH lớp nghịch nhiệt (~2.045m, mực 800) chứ không ở chân (~1.540m, mực 850), và mặt mây 1.690m đến từ RH 86-96% tại 850 hPa (+150m), không phải do thiếu nắp. Đây là quan sát SAU khi xem kết quả, chỉ được dùng làm giả thuyết cho đợt FOG (>= 15 ca hoặc 15/12/2026), phải đăng ký trước lại, không sửa bây giờ.
  - Mã VS (`stableCap`, mặc định tắt) và `scripts/ab-stablecap.ts` giữ lại làm công cụ đo, không bật. Không gọi agent phản biện vì không qua cổng 1-4.

## 27/11/2026 - Hoàng Liên Sơn sáng 26/11 (phiếu g5fb9), tinh chỉnh nhỏ, engine KHÔNG đổi
Anh báo Đồi Bò (Sa Pa) và Ngũ Chỉ Sơn sáng 26/11 có biển mây, "dọc dãy Hoàng Liên Sơn quanh Sa Pa đều có". Nhập `2026-11-26-ngu-chi-son` (BELOW, lời kể) và `2026-11-26-doi-bo-sapa` (không spotKey, chỉ tham khảo).
- Bản chụp 26/11 cho thấy hai lỗi tách theo độ cao trên CÙNG một sáng: (1) đỉnh >= 2.800m (Fansipan, Ngũ Chỉ Sơn, Lảo Thẩn, Kỳ Quan San, Tả Chì Nhù) app đặt mặt mây 1.690-2.240m, dưới chóp 600-1.350m, đúng hình biển mây, nhưng trạng thái DISSIPATING do cổng gió `Destructive` tại cao độ đứng sau đợt gió mùa 25/11, nên không khuyên đi; (2) điểm thấp quanh Sa Pa (Hàm Rồng, Best View, Hang Đá, Ô Quy Hồ) app đặt mặt mây 1.690-2.200m, CAO hơn chỗ đứng, trong khi Best View thấy biển mây dưới chân từ 1h sáng 26/11.
- Đếm người đi (rạng sáng, có bản chụp): DISSIPATING với ΔH > 0 nay 8 ca, 6 có biển mây (Hang Kia 3/10, Fansipan 29/10, Chiêu Lầu Thi 15/11, Fansipan 26/11, Ngũ Chỉ Sơn 26/11, Fansipan 27/11), 2 không (Fansipan 10/10, 15/10). Đây là VIỆC 3 ý 2 (cổng gió Zone B), vẫn là quan sát, chưa phải phép đo đăng ký trước.
- Cổng bóng agy 26/11 nói CÓ ở Ngũ Chỉ Sơn (63%) và Kỳ Quan San (55%) trong khi engine nói không: ghi để lúc chấm cổng bóng biết. Vệ tinh 26/11 mù ở gần hết các điểm này (BLOCKED_ABOVE).
- Hai nhãn này thêm SAU bản đăng ký VS (0e5b8bc); chúng đi vào phép chấm VS như mọi nhãn khác, không phải ca nảy ra ý tưởng.
- Bổ sung 27/11 (phiếu g1ed7): Phu Sa Phìn sáng 27/11 có biển mây dưới chân (ảnh camera skyview ~8h qua bài FB porter); app DISSIPATING 48, mặt mây 2130m, ΔH +735, không đáng đi = bỏ sót. Đếm người đi/FB DISSIPATING ΔH > 0 nay 7/9 có biển mây. Engine không đổi.

## 27/11/2026 (phiếu gf1b7) - Bóng 6 mô hình cho bản chụp tuần: ĐĂNG KÝ TRƯỚC, chưa có sự thật nào cho cột bóng

Bối cảnh: anh hỏi vì sao bảng 7 ngày (GFS + ICON + UKMO) xanh nhiều hơn phân tích đầy đủ (6 mô hình). Cái này là tinh chỉnh
nhỏ (chỉ thêm cột ghi, engine và bảng hiển thị KHÔNG đổi). Đổi bảng sang 6 mô hình mới là sửa lớn: cần Luật cổng và anh duyệt.

Số nền đã đo hôm nay trên 27 bản chụp xa (`far/`, 30/10-26/11) cộng bản chụp lead 0, cột ✓ (worthGoing) 3 mô hình:
- So với vệ tinh: tỉ lệ có biển mây khi ✓ là 18% ở lead 1-3, 17% ở lead 4-5, 12% ở lead 6-7. Tỉ lệ nền lần lượt là 18%, 18%, 19%.
  Nói cách khác, ✓ không hơn đoán mò ở mọi lead.
- So với người đi + FB: 93% (27/29) ở lead 1-3, 81% ở lead 4-5, 80% ở lead 6-7. Tỉ lệ nền lần lượt là 69%, 72%, 76%.
  Tỉ lệ nền cao vì người ta chủ yếu đăng khi có mây. Lead 1-3 có độ nâng thật, lead 4-7 chỉ nâng yếu.
- Bắt được ít: khoảng 20% số sáng có mây ở lead 1-5, và 3-9% ở lead 6-7.
- Không chấm ngược được bóng 6 mô hình, vì bản chụp cũ không ghi số liệu từng mô hình.

Đã thêm: `scripts/snapshot-week.ts` gọi `rankSpotsForWeekWithShadow`. Đó là MỘT call gồm 6 mô hình (đo 27/11: khoảng 1.279 lượt
quy đổi, gấp đôi bản cũ). Các trường hiển thị vẫn tính từ đúng 3 mô hình. Mỗi ngày có thêm `shadow` gồm
`{models, score, status, agreement, deltaH, worthGoing, perModel}`. Tệp ghi `shadowModels`. Nếu bóng lỗi thì chụp lại bằng 3 mô hình
và ghi `shadowError`. Test `tests/week-shadow.test.ts` khoá hai điều: trường hiển thị khi tải 6 mô hình giống hệt khi tải 3, và bóng
chấm đủ 6 mô hình. Đột biến đã thử: cho bảng dùng cả 6 mô hình thì trượt 2/3; cho bóng chỉ dùng 3 mô hình thì trượt 1/3.

Giả thuyết H (viết trước khi có sự thật): ở lead 1-5, ✓ của bóng 6 mô hình có độ chính xác cao hơn ✓ của bảng 3 mô hình, mà số ca
có mây bắt được không giảm quá 1/3.

Cách chấm, chốt trước:
- Tách riêng (a) người đi + FB và (b) vệ tinh, theo cùng thứ bậc nguồn và cùng bộ lọc như phép đo số nền ở trên.
- Chỉ dùng các ô có cả hai cột trên cùng một bản chụp. Không vá bản chụp cũ, không chụp bù.
- In mọi ca đổi kết luận theo cả hai chiều.
- Ngày chấm: khi có >= 21 ngày chụp có bóng (khoảng 18-20/12/2026), chấm MỘT lần.
- Đạt cả (a) và (b) chỉ có nghĩa là đủ điều kiện ĐỀ XUẤT. Muốn đổi bảng thì phải theo Luật cổng sửa lớn, có agent phản biện và anh
  duyệt. Không đổi ngưỡng nào theo kết quả.
- Lead 6-7: UKMO thường thiếu ở ngày cuối (đo 27/11, ngày 04/12 chỉ có 5 mô hình), nên chỉ báo số, không tính vào H.

Ghi chú để minh bạch: lượt kiểm tra thật lúc 27/11 khoảng 11h40 cho số ô ✓ theo ngày 28/11 -> 04/12 như sau.
- Bảng 3 mô hình: 8 5 5 6 5 3 3.
- Bóng 6 mô hình: 8 0 0 5 3 5 6.
Chưa có sự thật cho các ngày này, nên đây không phải kết quả chấm.
- Bổ sung 27/11 (phiếu g42ec): Chiêu Lầu Thi sáng 27/11 có biển mây dày dưới chân (bài FB của lodge trên đỉnh, ~07h). App DISSIPATING 52, mặt mây 1452m, ΔH +950, không đáng đi = bỏ sót, lần thứ hai ở điểm này sau 15/11. Đếm người đi/FB DISSIPATING ΔH > 0 nay 8/10 có biển mây. Cổng bóng agy nói CÓ (81%). Engine không đổi; ca này vào hàng VIỆC 3 ý 2, không sửa lẻ.
- Bổ sung 27/11 (phiếu g5277): Suôi Thầu sáng 27/11 có biển mây (video FB check-in, góc giống flycam nên chưa chắc chỗ đứng 1200m ở trên mây). App FOG 87, đồng thuận 100%, mặt mây 1695m, ΔH -495 = bỏ sót kiểu FOG, vào hàng đợt FOG (mốc >= 15 ca hoặc 15/12). Cổng bóng agy cũng nói không (15%). Engine không đổi.
- Bổ sung 28/11 (phiếu g85f0, anh báo, không ảnh): sáng 28/11 Sì Thâu Chải và Đồn Đèn có biển mây, Fansipan và Tà Xùa không. Bản chụp 28/11: Sì Thâu Chải FOG 62 (đồng thuận 33%, ΔH -281) = bỏ sót kiểu FOG; Đồn Đèn DISSIPATING 21 (ΔH +85) = bỏ sót kiểu DISSIPATING ΔH > 0; Fansipan DISSIPATING 36 (ΔH +830) và Tà Xùa DISSIPATING 12 không đáng đi = đúng. Cổng bóng agy nói không ở cả 4 (đúng 2, sót 2). Engine không đổi; hai ca sót vào hàng đợt FOG / VIỆC 3 ý 2.
- Bổ sung 28/11 (phiếu g2287): Tả Lèng (Lai Châu) 07h 28/11 có biển mây dưới chân (ảnh bài FB anh gửi; chữ trong bài ghi "Phìn Ngan", anh xác định là Tả Lèng CGJ2+7G, chưa tự xác minh được). App FOG 30, đồng thuận 33%, ΔH -373 = bỏ sót kiểu FOG; riêng UKMO ROLLING mặt mây 1250m khớp ảnh. Engine không đổi, vào hàng đợt FOG.
- Bổ sung 28/11 (phiếu gfbed): Hang Kia - Pà Cò ~07h 28/11 có biển mây phẳng dưới chân (livestream FB homestay). App DISSIPATING 17 (bản chụp 28/11) và 64 (bản chụp 27/11, lead 2), không đáng đi ở mọi lần = bỏ sót. Hindcast 6 mô hình: cả 6 bị cổng gió 850 hPa (35-53 km/h, ngay mực chỗ đứng 1483m) đẩy về DISSIPATING/FLOWING dù 5/6 có nghịch nhiệt mạnh +3..+5°C, đáy bão hoà, mặt mây 1030-1255m dưới chân. Đây là ca Zone A (không chỉ Zone B như giả thuyết ý 2 ban đầu). Đếm thô trên bản chụp rạng sáng ghép nhãn người đi/FB (ngoài luật cổng, chỉ để xếp hàng việc): app DISSIPATING mà thực tế có biển mây 15/21, nền chung có biển mây ~59/73 (mẫu thiên về ca dương, chưa chứng minh). Engine không đổi; đề xuất mở đợt VIỆC 3 ý 2 (cổng gió khi có nắp nghịch nhiệt) theo đủ Luật cổng.

### 28/11/2026 - ĐĂNG KÝ TRƯỚC đợt "cổng gió tách tầng" (VIỆC 3 ý 2, phiếu gcda5). Viết TRƯỚC khi chấm, chưa nhìn kết quả.
Số đo gợi ý (Hang Kia 28/11 05-07h, Open-Meteo forecast 5 mô hình, đọc 12h 28/11): gió ĐỨT TẦNG rõ. Lớp thung lũng 200-900 m chỉ 3-15 km/h (GFS, ICON, UKMO); ECMWF/JMA 22-27 km/h ở 925 hPa; ở 850 hPa (~1.580 m, ngay chỗ đứng 1.483 m) 32-51 km/h ở cả 5. Nghịch nhiệt sát đất (GFS 629 m 16,1°C -> 857 m 16,7°C; JMA 216 m 13,1°C -> 873 m 15,5°C). Richardson khối ước tay trên GFS 07h: lớp 872-1.105 m Ri ~2,6, lớp 1.105-1.586 m Ri ~0,5, đều > 0,25 = gió trên không trộn được xuống. Engine hiện lấy gió 850 hPa (`assessWind`, dòng ~886: Destructive -> DISSIPATING) bất kể gió đó nằm trên hay dưới mặt mây.
Giả thuyết H: "Gió chỉ xé được biển mây khi nó thổi TRONG lớp mây hoặc trộn được xuống lớp đó. Rạng sáng, nếu mặt mây (của chính mô hình) thấp hơn mực 850 hPa và lớp giữa mặt mây và 850 hPa bền (Ri khối >= 0,25), thì gió dùng cho cổng trạng thái = gió lớn nhất các mực NẰM TRONG lớp mây (đáy thung lũng -> mặt mây), không phải gió 850 hPa; gió 850 hPa mạnh khi đó chỉ sinh cảnh báo 'biển mây tan sớm khi nắng lên, đi trước 8h' + cảnh báo gió ở chỗ đứng."
Phép đo (chốt trước): replay-raw trên toàn kho có sự thật (người đi + FB đủ tin + vệ tinh tách riêng), CÙNG một mẻ dữ liệu, chấm luật cũ và luật H. In mọi ca đổi kết luận theo cả hai chiều. Tiêu chí: (1) bỏ sót người đi+FB KHÔNG tăng; (2) báo nhầm người đi+FB tăng <= 2 ca và phải nêu từng ca; (3) vệ tinh: báo nhầm không tăng quá 10% tương đối. Ngưỡng Ri 0,25 là hằng số vật lý chuẩn (Miles-Howard), không dò. Ca Hang Kia 28/11 là ca nghĩ ra H nên KHÔNG tính vào lợi ích. Sau chấm: agent khí tượng độc lập phản biện, rồi mới sửa, đổi ENGINE_VERSION.
Chi tiết hoá cách tính (28/11 12:30, phiếu gb6fe, viết TRƯỚC khi chạy chấm; mẻ thô `replay-raw` lấy bù tới 28/11, 4.330 điểm-ngày): dữ liệu chỉ có gió ở 925/850/700 hPa (không xin thêm biến: luật ngân sách API), nên "gió trong lớp mây" = max(gió 925 nếu mực 925 nằm trong [đáy thung lũng, mặt mây]; gió nội suy tuyến tính 925<->850 theo geopotential thật về đúng độ cao mặt mây, kẹp ở hai đầu). Ri khối lớp mặt mây -> 850 hPa = g·Δθ·Δz / (θ̄·ΔU²), Δθ = (T850 - T tại mặt mây) + 0,0098·Δz, T tại mặt mây nội suy từ profile `levels`; ΔU = gió 850 - gió mặt mây; ΔU <= 0,5 m/s coi là không đứt (Ri vô cùng). Điều kiện bật: mặt mây của mô hình đó có số VÀ thấp hơn mực 850 VÀ Ri >= 0,25. Khi bật, gió này thay gió 850 (và thay cả nhánh 925 `seaCapped`, nhánh gió nội suy về chỗ đứng cho đỉnh cao) trong `assessWind` cho cả trạng thái lẫn điểm; gió 850 vẫn được nói trong lời giải thích. Biến thể duy nhất `windDecouple` (mặc định tắt), chấm bằng `scripts/ab-winddecouple.ts` theo khuôn `ab-stablecap.ts`. Không thêm biến thể sau khi xem kết quả.
- **KẾT QUẢ (28/11/2026 12:35, phiếu gb6fe): BÁC (không bật). Engine giữ `engine-2.8.3`.** Mẻ thô 4.330 điểm-ngày, hàng có sự thật 2.115, có dữ liệu 2.099 (người đi 67, FB 29, vệ tinh 2.003). Đáng đi, luật cũ -> H: người đi đúng 28->30 sót 26->24 nhầm 3->3; FB không đổi (3/11/0/15); vệ tinh đúng 80->84 sót 139->135 nhầm 431->456 (+5,8%); balanced accuracy vệ tinh 0,562->0,564, KTC95% hiệu [-0,006; 0,011] (72 ngày). Trạng thái đổi 107/2.099 hàng. Ca bắt thêm: người đi Chiêu Lầu Thi 27/11, Tà Xùa 27/11; vệ tinh Pù Luông 27/10, Tả Liên Sơn 29/10, Hang Kia 16/11, Putaleng 27/11. 25 ca vệ tinh nhầm thêm (Putaleng 5, Bạch Mã 6, Tả Liên Sơn 3, Tây Côn Lĩnh 2, Pa Phách 2, Phìa Oắc 2, Đèo Thung Khe 2, Bình Liêu 2, Ba Vì 1, Pù Luông 1). H KHÔNG cứu được ca khởi nguồn Hang Kia 28/11 (UKMO mặt mây 1.255 m sát 850, gió nội suy về mặt mây 38,7 km/h vẫn "phá"; GFS không có mặt mây; ICON mặt mây 1.732 m > 850). Đạt hình thức cả 3 tiêu chí.
- **Phản biện độc lập (agent khí tượng vùng núi, 13 ý; xử lý từng ý):** (1 CHẶN) Ri khối lớp dày 300-700 m với ngưỡng 0,25 quá dễ dãi: đứt gió + bước nhảy θ dồn ở nắp mỏng 50-150 m nên Ri cục bộ chỉ 1/3-1/10 Ri khối; ngưỡng cho lớp thô cỡ 0,5-1 -> nhận, là lý do chính không bật. (2) Nội suy gió tuyến tính về mặt mây vừa thổi phồng gió trong lớp vừa ép nhỏ ΔU (thổi phồng Ri); nên ΔU = w850 - w925 -> nhận cho đợt sau. (3) Gió max 04-09h ghép với T lúc 06h là sai cặp (gió max hay rơi 8-9h khi nắp đã vỡ) -> nhận cho đợt sau (cần gió cùng giờ, phải sửa `aggregateDayModel`). (4) Cột 1D bỏ qua sóng núi/rotor; θ khô không phải θv/θe -> ghi chú. (5 CHẶN) Thay cả nhánh gió tại chỗ đứng cho đỉnh >= 2.200 m là thay đổi thứ hai bị gộp: Chiêu Lầu Thi được cứu nhờ bỏ nhánh đỉnh cao, không nhờ tách tầng; nhóm đỉnh cao/Zone B chiếm 10/25 ca nhầm thêm -> nhận: lợi chính danh trên người đi chỉ còn 1 ca (Tà Xùa 27/11), cả hai ca cùng một ngày. Đây là lỗi chi tiết hoá của chính em lúc 12:30. (6 CHẶN) Zone B: gió kênh hoá tầng thấp bị mô hình lưới thô làm mịn nên "gió trong lớp" ở Zone B thấp có hệ thống -> nhận. (7) Bạch Mã là mây tầng tích ven biển do gió mùa đông bắc, không phải sương bức xạ bị nhốt (6 ca nhầm, 0 bắt) -> nhận. (8) `isWorthGoing` không xét điểm, DISSIPATING đang làm cổng lọc ngầm (ca thành đáng đi với điểm 5-16) -> ghi vào việc tồn đọng, đổi thì phải đăng ký riêng. (9) FSI/chỉ số kỹ thuật vẫn đọc gió 850 -> chỉ áp nếu bật. (10 CHẶN) Đổi 25 lời khuyên sai thêm lấy 1 ca người đi chính danh là không đáng -> nhận. (11) Bật riêng dòng cảnh báo "gió 850 trên nắp, có thể tan sớm, lên trước 8h", không đổi điểm/trạng thái/đáng đi -> ĐÃ LÀM (tinh chỉnh nhỏ: chỉ là chữ). (12) Đề xuất biến thể H' hẹp hơn -> ghi dưới. (13) Nếu bật thì chỉ cho cổng trạng thái, giữ phạt điểm phần nào -> ghi chú.
- **Đã làm:** `decoupledCloudWind` (export) + cờ thử nghiệm `windDecouple` (mặc định TẮT) giữ làm công cụ đo; dòng cảnh báo tan sớm luôn hiện trong lời giải thích khi gió 850 >= "High" và lớp mặt mây->850 có Ri khối >= 0,25 (không đổi số nào: chấm lại V0 sau khi sửa vẫn y 37/3/431). Test `tests/engine.test.ts` mục "cổng gió tách tầng" dùng ca thật UKMO Tà Xùa 27/11 (`tests/fixtures/winddecouple-taxua-20261127.json`); đột biến bật H mặc định -> test đỏ (đã thử).
- **Đợt sau (H', chưa đăng ký chính thức):** giữ nguyên nhánh gió đỉnh cao; loại Zone B và điểm ngoài Tây Bắc/Việt Bắc; ΔU = w850 - w925 cùng giờ 06h (cần sửa `aggregateDayModel`); ngưỡng Ri khối cho lớp thô chọn theo tài liệu (vd 1,0), không dò; thêm điều kiện ΔH >= biên đáng đi. VÌ H' được nghĩ ra SAU khi xem danh sách ca của mẻ này, nó KHÔNG được chấm trên mẻ này làm bằng chứng: chỉ chấm trên nhãn mới (>= 20 ca người đi+FB mới sau 28/11, hoặc gộp vào đợt FOG 15/12), và phép chấm phải tách lợi theo cơ chế. Muốn có gió nhiều mực hơn trong lớp mây thì phải xin thêm biến (tốn hạn mức): chưa làm.
