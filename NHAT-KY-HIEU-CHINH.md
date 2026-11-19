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
