# ☁️ CloudHunter AI v5 — Dự báo Biển Mây Tây Bắc (Engine Deterministic + AI Lời Bình)

[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Vitest-28_golden_tests-6E9F18?logo=vitest)](https://vitest.dev/)
[![Open-Meteo](https://img.shields.io/badge/Open--Meteo-3_models-00B4D8)](https://open-meteo.com/)

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
- 🎯 **Đồng thuận mô hình THẬT**: ECMWF IFS + GFS + ICON trong cùng 1 call; điểm = median,
  trạng thái = đa số, kèm % đồng thuận và độ lệch thật giữa các mô hình.
- 🔍 **"Vì sao điểm này?"**: mỗi ngày liệt kê từng yếu tố cộng/trừ điểm (mây thấp bình minh,
  nghịch nhiệt, ẩm, gió theo vùng địa hình, mây cao che đêm, mưa, mùa) — minh bạch 100%.
- ⛔ **Trung thực dữ liệu**: ngày ngoài phạm vi dự báo hiện UNKNOWN + "ngoài phạm vi dữ
  liệu" thay vì số bịa; ngày xa (4–15 ngày) dán nhãn "chỉ là xu hướng".
- 📸 **Chỉ số "cháy mây" bình minh** riêng cho nhiếp ảnh (một ít mây cao 15–55% = trời đẹp
  nhất để hứng màu).
- 📍 **Phân giải địa danh nhiều tầng có nhãn nguồn**: thư viện 39 núi đã xác thực →
  Nominatim/Open-Meteo geocoding (tọa độ thật) → AI ước tính (cảnh báo rõ).
- 🕘 **Lịch sử dự báo** (localStorage): mở lại tức thì, và là nền tảng để đối chiếu
  "app đoán gì vs thực tế" sau chuyến đi.
- 📥 **Xuất GPX/TXT offline** với tọa độ thật của địa điểm.

## 📐 Engine (tóm tắt — chi tiết trong AGENTS.md)

| Chỉ số | Công thức / cách tính |
| :--- | :--- |
| LCL (đáy mây) | `thung_lũng + 125 × (T_valley − Td_valley)` |
| Nghịch nhiệt | anomaly = T_tầng − (T_valley − 6.5°C/km × Δh); ≥3°C = Strong |
| Mặt mây (top) | tầng cao nhất có RH ≥ 80% (+150m), ràng buộc với đáy mây |
| ΔH | vị_trí_đứng − top → STATIC / FLUCTUATING(±250m) / FOG |
| FSI | 2(T−Td) + 2(T_valley − T850) + gió — tham chiếu thung lũng |
| VRII | 85 − 12·spread − 2.5·gió_đêm + bonus nghịch nhiệt − phạt mây cao đêm |
| Gió theo vùng | Zone A: 10/15/20 km/h · Zone B (ống gió Lai Châu): 5/8/15 km/h |
| Điểm ngày | mây thấp bình minh (nặng nhất) + nghịch nhiệt + ẩm − gió − mây cao đêm − mưa ± mùa |

## 🚀 Chạy & kiểm tra

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint     # type-check
npm test         # 28 golden tests engine (vitest)
npm run build
```

AI (tùy chọn): nhập Gemini API Key qua nút 🔑 trong app (lưu localStorage máy bạn —
không nhúng key vào code/bundle).

## 🤖 Cho AI assistant tiếp tục phát triển

Đọc kỹ **`AGENTS.md`** — kiến trúc, ràng buộc vật lý, quy tắc "không bịa dữ liệu",
và backlog. Trước khi kết thúc mọi phiên sửa code: `npm run lint && npm test && npm run build`.

## 📄 Giấy phép & Tác quyền

Dự án của **phongvan0926**. Dữ liệu khí tượng: [Open-Meteo](https://open-meteo.com/)
(ECMWF/GFS/ICON). Geocoding: [Nominatim/OpenStreetMap](https://nominatim.org/).
Dự báo chỉ mang tính tham khảo — luôn quan sát thời tiết thực tế khi trekking.
