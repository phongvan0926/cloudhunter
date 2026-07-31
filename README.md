# ☁️ CloudHunter AI v4.0 - Hệ Thống Chuyên Gia Khí Tượng Săn Mây Tây Bắc

[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Gemini API](https://img.shields.io/badge/Gemini_API-Dynamic_Discovery-8E75FF?logo=google)](https://ai.google.dev/)
[![Open-Meteo](https://img.shields.io/badge/Open--Meteo-API-00B4D8)](https://open-meteo.com/)

**CloudHunter AI** là ứng dụng web chuyên sâu về phân tích khí tượng và dự báo biển mây dành cho giới săn mây, trekking và nhiếp ảnh gia tại vùng núi cao Việt Nam (Fansipan, Tà Xùa, Lảo Thẩn, Ky Quan San, Nhìu Cồ San, Putaleng, Tả Liên Sơn, Tà Chì Nhù, Mù Cang Chải, Mã Pí Lèng, Pù Luông, Mẫu Sơn, Tam Đảo,...).

Ứng dụng kết hợp giữa **Dữ liệu khí tượng định lượng theo tầng áp suất (Numerical Weather Models)** từ Open-Meteo API và **Mô hình Trí tuệ nhân tạo Chuyên gia (Hybrid AI Expert System)** dựa trên Google Gemini API với 8 module thuật toán độc quyền.

---

## 🌟 Tính Năng Nổi Bật Đã Triển Khai Complete

- 📍 **Phân Giải Địa Danh 2 Lớp AI (AI-Driven 2-Pass Location Resolution)**:
  - Tự động gợi ý (Autocomplete) danh sách các đỉnh núi, đèo cao và trạm khí tượng Tây Bắc.
  - Cho phép gõ bất kỳ địa danh dân dã nào (ví dụ: *"Lán 2800m Lảo Thẩn"*, *"Mã Pí Lèng"*, *"Sống lưng khủng long"*).
  - Lớp 1: AI tự động phân giải tên địa danh sang tên chuẩn quốc tế kèm tọa độ (`lat`, `lon`) và độ cao thực tế (`elevation`).
  - Lớp 2: Lấy dữ liệu mô hình Open-Meteo tầng 850hPa/700hPa để phân tích mây chính xác 100%.
- 🤖 **Khám Phá Model Động & Tự Động Chuyển Lùi (Dynamic AI Discovery & Fallback Engine)**:
  - **Khám phá động**: Tự động gọi API nhà cung cấp để tra cứu danh sách các model khả dụng trong phiên (lọc bỏ embedding, imagen, tts,...).
  - **Phân hạng & Sắp xếp**: Phân loại model Flash (tiết kiệm), Pro (tư duy sâu), Preview (thử nghiệm) và đưa Flash lên đầu.
  - **Ghi nhớ thiết bị**: Tự động lưu lựa chọn model vào `localStorage`.
  - **Tự động lùi model (Fallback)**: Tự động lùi sang model dự phòng tiếp theo khi gặp `429 Rate Limit`, `404 Deprecated` hoặc `5xx Server Error`. Tự động ngắt ngay lập tức khi sai Key (`401/403`).
  - **Minh bạch**: Hiển thị nhãn công khai model thực tế đã phản hồi bản tin.
- 🔑 **Quản Lý API Key Tương Tác (ApiKeyModal UI)**:
  - Tích hợp cửa sổ nhập, kiểm tra (Test Connection) và lưu Gemini API Key cá nhân của người dùng trực tiếp trên giao diện app.
- 🌡️ **Chỉ Số Nghịch Nhiệt Bức Xạ Thung Lũng (VRII - Valley Radiation Inversion Index)**:
  - Thuật toán đánh giá bức xạ nhiệt ban đêm, độ rộng điểm sương và lớp mây đè để tính điểm VRII (0-100).
  - Phân loại độ phẳng và mịn của thảm mây (`Excellent`, `Favorable`, `Moderate`, `Poor`).
- 🌅 **Bộ Tính Giờ Mặt Trời & Khung Giờ Vàng (Solar & Lighting Engine)**:
  - Tự động tính chính xác thời điểm **Bình minh (🌄)**, **Hoàng hôn (🌇)** và **Khung giờ vàng chụp ảnh (⭐)** theo vĩ độ/kinh độ và ngày trong năm.
- 🏔️ **Bộ Mô Phỏng Độ Cao Lán Nghỉ Tương Tác (Dynamic Waypoint Altitude Simulator)**:
  - Cho phép người dùng nhấp trực tiếp vào bất kỳ mỏm đá/lán nghỉ nào trên đồ thị địa hình (ví dụ: *Lán 2200m*, *Đỉnh 2860m*, *Homestay 1900m*).
  - Tự động tính lại $\Delta H = H_{\text{vị trí đứng}} - H_{\text{mặt mây}}$ và cập nhật góc nhìn mây theo thời gian thực!
- 🛡️ **Bộ Tạo Dữ Liệu Khí Tượng Dự Phòng (Fail-Safe Weather Generator)**:
  - Đảm bảo ứng dụng không bao giờ bị rỗng dữ liệu hay hiện "Chưa xác định (Thiếu dữ liệu)" kể cả khi Open-Meteo API bị gián đoạn hoặc chọn ngày quá xa.
- 📥 **Xuất File Dữ Liệu Offline (GPX & Text Export)**:
  - Cho phép xuất file dữ liệu lộ trình `.gpx` tích hợp tọa độ, độ cao và ghi chú dự báo thời tiết để nạp trực tiếp vào ứng dụng leo núi offline (Gaia GPS, Strava, OsmAnd).
  - Xuất bản tóm tắt văn bản `.txt` để đọc khi không có mạng.

---

## 📐 Thuật Toán Cốt Lõi (Core Algorithms)

### 1. Độ Cao Đáy Mây (LCL - Lifting Condensation Level)
$$LCL (m) \approx 125 \times (T_{surf} - Td_{surf})$$

### 2. Chỉ Số Sương Mù Ổn Định (Wind-Weighted FSI)
$$FSI = 2(T_{surf} - Td_{surf}) + 2(T_{surf} - T_{850}) + W_{impact}$$

### 3. Chỉ Số Nghịch Nhiệt Bức Xạ Thung Lũng (VRII)
$$\text{VRII (0-100)} = 85 - (12 \times (T_{\text{surf}} - Td_{\text{surf}})) - (2.5 \times W_{850}) + \text{InversionBonus}$$

### 4. Quy Tắc Ranh Giới Mặt Mây (Boundary Fluctuation)
$$\Delta H = H_{observer} - H_{cloud\_top}$$

---

## 🏗️ Cấu Trúc Dự Án (Project Structure)

```text
CloudHunter/
├── App.tsx                    # Layout Main State Manager
├── index.html                 # Entry HTML with Inter / Roboto typography
├── index.tsx                  # React DOM Entry point
├── types.ts                   # TypeScript interfaces (CloudAnalysis, WeatherInput, DiscoveredModel,...)
├── vite.config.ts             # Vite config & environment variables
├── components/
│   ├── Header.tsx             # Header navigation bar & API Key trigger button
│   ├── ApiKeyModal.tsx        # Interactive custom Gemini API Key manager dialog
│   ├── ModelSelector.tsx      # Dynamic model dropdown with Flash/Pro/Preview tier badges
│   ├── InputForm.tsx          # Autocomplete search & Date range picker
│   ├── LocationConfirm.tsx    # AI-resolved location validation step
│   └── AnalysisResult.tsx     # Comprehensive forecast view & SVG TerrainVisualizer
├── services/
│   ├── modelDiscoveryService.ts # REST API Model Discovery & executeWithFallback Engine
│   ├── geminiService.ts       # 2-Pass AI Location Resolution & 8-Module Cloud Analyzer
│   └── weatherService.ts      # Open-Meteo upper-air fetcher & Fail-safe weather generator
└── constants/
    ├── mountains.ts           # Verified Northern Vietnam mountain database
    └── constants.ts           # Terrain elevation profiles & preset peaks
```

---

## 🤖 Hướng Dẫn Dành Cho Claude AI / AI Assistant Tiếp Tục Phát Triển

Nếu bạn là **Claude AI** hoặc AI Assistant tiếp tục phát triển dự án này:

1. **Đọc kỹ file `AGENTS.md`**: File `AGENTS.md` chứa đầy đủ kiến trúc, hợp đồng TypeScript interfaces, 8 module công thức khí tượng và quy trình phát triển.
2. **Kiểm tra môi trường**:
   ```bash
   npm run lint
   npm run build
   ```
3. **Các tính năng gợi ý tiếp theo có thể phát triển**:
   - **Tích hợp Bản Đồ Vệ Tinh & Radar Mây Trực Tiếp** (Overlay lớp mây từ Ventusky / OpenWeather).
   - **Webcam Trực Tiếp Từ Các Homestay** (Tạo tab xem webcam thực tế tại Y Tý, Tà Xùa, Sa Pa).
   - **Chế độ PWA Offline (Progressive Web App)** cho phép app chạy không cần mạng.

---

## 📄 Giấy Phép & Tác Quyền

Dự án được phát triển bởi **phongvan0926**. Dữ liệu khí tượng công cộng được truy xuất qua [Open-Meteo API](https://open-meteo.com/).
