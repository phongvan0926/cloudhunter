# ☁️ CloudHunter AI v5 — Dự báo Biển Mây Tây Bắc (Engine Deterministic + AI Lời Bình)

[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Vitest-67_golden_tests-6E9F18?logo=vitest)](https://vitest.dev/)
[![Open-Meteo](https://img.shields.io/badge/Open--Meteo-6_models-00B4D8)](https://open-meteo.com/)

**CloudHunter AI** dự báo biển mây cho dân săn mây, trekking và nhiếp ảnh tại núi cao Việt
Nam (Tà Xùa, Lảo Thẩn, Ky Quan San, Fansipan, Putaleng, Tà Chì Nhù...).

**Triết lý v5: "Con số = code, tư vấn = AI."** Toàn bộ điểm số và chỉ số khí tượng do một
engine deterministic tính từ dữ liệu thật của 3 mô hình toàn cầu; Gemini chỉ viết lời bình.
Không có API key AI, app **vẫn dự báo đầy đủ** — chỉ thiếu phần văn tư vấn.

---

## 🌟 Điểm khác biệt v5

- 🏔️ **Vật lý 2 điểm đúng bản chất**: dữ liệu lấy riêng cho **đáy thung lũng** (nơi biển mây
  hình thành — tự ước tính từ DEM hoặc mặt cắt đã xác thực) và **vị trí bạn đứng** (chỉ để
  tính ΔH so với mặt mây). Nghịch nhiệt so với suy giảm chuẩn 6.5°C/km — không còn "đỉnh
  cao nào cũng báo đẹp".
- 🌙 **Cửa sổ đêm-trước**: xét cả pha bức xạ 19h→6h (mây cao che đêm, gió thung lũng đêm,
  mưa đêm) — yếu tố quyết định biển mây có hình thành hay không.
- 🎯 **Đồng thuận mô hình THẬT — 6 mô hình trong cùng 1 call**: ECMWF IFS + GFS + ICON
  + JMA (hợp Đông Á) + **UKMO 10km** (lưới mịn nhất trong các model toàn cầu miễn phí)
  + **ECMWF AIFS** (model AI — trường phái dự báo khác hẳn, tăng độ tin khi đồng thuận);
  điểm = median, trạng thái = đa số, kèm % đồng thuận và độ lệch thật.
- 📡 **Profile khí quyển 7 mực (engine-2.0)**: 975→700hPa với độ cao **geopotential THẬT
  từng ngày** (hết hằng số lệch 20–40m), cloud cover theo từng tầng → mặt mây = đỉnh lớp
  mây LIÊN TỤC từ dưới lên; **boundary layer height đêm** (GFS) bắt không khí tù đọng;
  **mực đóng băng thật** → cảnh báo băng giá; nhiệt độ 2 điểm được API downscale theo
  đúng độ cao thung lũng/vị trí đứng (`&elevation=`).
- 🔍 **"Vì sao điểm này?"**: mỗi ngày liệt kê từng yếu tố cộng/trừ điểm (mây thấp bình minh,
  nghịch nhiệt, ẩm, gió theo vùng địa hình, mây cao che đêm, mưa, mùa) — minh bạch 100%.
- ⛔ **Trung thực dữ liệu**: ngày ngoài phạm vi dự báo hiện UNKNOWN + "ngoài phạm vi dữ
  liệu" thay vì số bịa; ngày xa (4–15 ngày) dán nhãn "chỉ là xu hướng"; **dữ liệu tải từ
  cache offline cũ hơn 1.5h hiện banner "tải cách đây ~X giờ"** thay vì đeo badge tin cậy.
- 📸 **Chỉ số "cháy mây" bình minh** riêng cho nhiếp ảnh (một ít mây cao 15–55% = trời đẹp
  nhất để hứng màu).
- 📍 **Phân giải địa danh nhiều tầng có nhãn nguồn**: thư viện **58 điểm đã xác thực phủ
  toàn quốc** (Tây Bắc + Hà Giang/Cao Bằng/Quảng Ninh + Bạch Mã, Bà Đen, Măng Đen, cụm
  Đà Lạt, và các điểm "ẩn" như Phình Hồ, Kéo Lồm, Chiềng Công, Đồn Đèn...) →
  Nominatim/Open-Meteo geocoding (tọa độ thật) → AI ước tính (cảnh báo rõ).
  Điểm mới được thêm bằng quy trình xác minh: OSM/Nominatim hoặc **giải mã plus code
  Google Maps** + đối chiếu độ cao DEM — không bao giờ đưa tọa độ đoán vào thư viện.
- 🔀 **Chọn model AI minh bạch**: dropdown chỉ hiện model phân tích văn bản (lọc model
  tạo ảnh/Live); model bạn chọn lỗi (429...) thì hạ bậc thang chất lượng (3.7 → flash-latest
  → 3.6 → 3.5..., Lite gần cuối, **Gemma tuyệt đối cuối cùng** — không chen vào bậc thang
  Flash) và app nói rõ model nào đã viết lời bình. Số liệu dự báo không phụ thuộc model AI.
- 🕐 **Ngày giờ neo theo Asia/Ho_Chi_Minh** — đúng ngày Việt Nam kể cả khi thiết bị đặt
  múi giờ khác.
- 🕘 **Lịch sử dự báo** (localStorage): mở lại tức thì, và là nền tảng để đối chiếu
  "app đoán gì vs thực tế" sau chuyến đi.
- 📥 **Xuất GPX/TXT offline** với tọa độ thật của địa điểm.
- 🌄 **"Đêm nay đi đâu săn mây?"**: xếp hạng TOÀN BỘ thư viện cho rạng sáng mai trong
  1 call batch — cùng engine + cùng 41 biến (đủ profile 7 tầng) với bản đầy đủ, chỉ khác
  dùng 3 mô hình GFS+ICON+UKMO (đo lệch thực tế ~4/100 điểm); bấm điểm nào là phân tích
  đầy đủ 6 mô hình điểm đó.
- 🛰️ **"Mây LÚC NÀY"**: vòng lặp ảnh vệ tinh Himawari-9 hồng ngoại (JMA, 10 phút/ảnh,
  nhìn được mây cả ban đêm) — kiểm tra biển mây đang thật sự hình thành trước khi xuất
  phát lúc 3-4h sáng.
- 📊 **Biểu đồ mây theo độ cao × thời gian** (kiểu meteoblue): mỗi tầng áp suất một
  hàng với độ cao geopotential thật + vạch vị trí bạn đứng — nhìn 1 giây biết mây nằm
  dưới chân (biển mây) hay trùm đầu (mù).
- 🌙 **Trăng cho nhiếp ảnh đêm** (tính cục bộ bằng suncalc): pha, độ sáng, giờ lặn/mọc,
  cửa sổ Milky Way hoặc "biển mây dưới trăng" cho từng rạng sáng.
- 🌧️ **Radar mưa RainViewer** quanh điểm (composite có 10 trạm radar VN): "mưa phùn tối
  nay có tan trước sáng không?" — quy luật vàng của biển mây.
- 📴 **PWA offline**: cài lên màn hình chính, mất sóng trên đèo vẫn mở lại được app và
  dự báo đã tải (cache app shell + dữ liệu Open-Meteo 12h).
- 📤 **Chia sẻ ảnh kết quả**: chụp thẻ tổng quan thành PNG ngay trên máy (không server)
  để đăng nhóm săn mây; tên file giữ chữ Việt bỏ dấu đúng cách.
- ⚡ **Tải nhanh**: code-split — SDK AI (~300KB) và màn kết quả chỉ tải khi cần;
  meta/OG đầy đủ để link chia sẻ có preview đẹp.
- 🎲 **Xác suất từ 51 kịch bản tổ hợp ECMWF** (ensemble): "% kịch bản có mây thấp ≥40%
  lúc bình minh" + dải P10–P90 — độ bất định CÓ CƠ SỞ VẬT LÝ, không chỉ so 4 model.
- 🔬 **Đối chiếu với thực tế**: mỗi lần dự báo đã lưu có nút 🔬 — sau chuyến đi ~5 ngày,
  app tự so trạng thái đã đoán với % mây thấp thực tế từ tái phân tích ERA5 và báo
  trúng/trượt từng ngày (sai thì nói sai).
- 🗺️ **Mùa theo 3 miền khí hậu**: Bắc (nhịp Tây Bắc), Trung (mưa bão 9-12), Nam/Tây
  Nguyên (khô 11-4) — hết chuyện Bà Đen tháng 12 bị trừ điểm theo "mùa đông Tây Bắc".

## 📐 Engine (tóm tắt — chi tiết trong AGENTS.md)

| Chỉ số | Công thức / cách tính |
| :--- | :--- |
| LCL (đáy mây) | `thung_lũng + 125 × (T_valley − Td_valley)` |
| Nghịch nhiệt | anomaly = T_tầng − (T_valley − 6.5°C/km × Δh) trên profile 7 mực (độ cao thật, chỉ tầng ≤2600m); ≥3°C = Strong + độ cao tầng |
| Mặt mây (top) | đỉnh LỚP MÂY LIÊN TỤC từ dưới lên (cc tầng ≥45% / RH≥80%) +150m, không nhảy cóc lên lớp mây tách rời |
| ΔH | vị_trí_đứng − top → STATIC / FLUCTUATING(±250m) / FOG |
| FSI | 2(T−Td) + 2(T_valley − T850) + gió — tham chiếu thung lũng |
| VRII | 85 − 12·spread − 2.5·gió_đêm + bonus nghịch nhiệt − phạt mây cao đêm |
| Gió theo vùng | Zone A: 10/15/20 km/h · Zone B (ống gió Lai Châu): 5/8/15 km/h |
| Điểm ngày | mây thấp bình minh (nặng nhất) + nghịch nhiệt + ẩm + lớp biên đêm mỏng − gió − mây cao đêm − mưa ± mùa |

## 🚀 Chạy & kiểm tra

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint     # type-check
npm test         # 67 golden tests: engine + mùa 3 miền + ensemble + ERA5 + trăng + fallback + múi giờ + alias + cache/lịch sử
npm run build
```

AI (tùy chọn): nhập Gemini API Key qua nút 🔑 trong app (lưu localStorage máy bạn —
không nhúng key vào code/bundle). **Dùng nhiều thiết bị:** trong modal 🔑 bấm
"📱 Dùng trên thiết bị khác" → quét QR (hoặc chép link) bằng máy kia → key tự lưu vào
máy đó và tự xóa khỏi thanh địa chỉ. Key nằm trong `#fragment` của link nên không bao
giờ được gửi lên server nào — chỉ quét/gửi cho chính mình.

## 🤖 Cho AI assistant tiếp tục phát triển

Đọc kỹ **`AGENTS.md`** — kiến trúc, ràng buộc vật lý, quy tắc "không bịa dữ liệu",
và backlog. Trước khi kết thúc mọi phiên sửa code: `npm run lint && npm test && npm run build`.

## 📄 Giấy phép & Tác quyền

Dự án của **phongvan0926**. Dữ liệu khí tượng: [Open-Meteo](https://open-meteo.com/)
(ECMWF/GFS/ICON). Geocoding: [Nominatim/OpenStreetMap](https://nominatim.org/).
Dự báo chỉ mang tính tham khảo — luôn quan sát thời tiết thực tế khi trekking.
