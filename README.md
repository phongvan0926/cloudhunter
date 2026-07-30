# ☁️ CloudHunter AI v4.0 - Hệ Thống Chuyên Gia Khí Tượng Săn Mây Tây Bắc

[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Gemini API](https://img.shields.io/badge/Gemini_API-3.5_Flash-8E75FF?logo=google)](https://ai.google.dev/)
[![Open-Meteo](https://img.shields.io/badge/Open--Meteo-API-00B4D8)](https://open-meteo.com/)

**CloudHunter AI** là ứng dụng web chuyên sâu về phân tích khí tượng và dự báo biển mây dành cho giới săn mây, trekking và nhiếp ảnh gia tại vùng núi cao Tây Bắc Việt Nam (Fansipan, Tà Xùa, Lảo Thẩn, Ky Quan San, Nhìu Cồ San, Putaleng, Tả Liên Sơn,...).

Ứng dụng kết hợp giữa **Dữ liệu khí tượng định lượng theo tầng áp suất (Numerical Weather Models)** từ Open-Meteo API và **Mô hình Trí tuệ nhân tạo Chuyên gia (Hybrid AI Expert System)** dựa trên Google Gemini API với 8 module thuật toán độc quyền.

---

## 🌟 Tính Năng Nổi Bật

- 📍 **Độ Phủ Địa Danh Rộng & Tìm Kiếm Thông Minh**:
  - Tự động gợi ý (Autocomplete) danh sách các đỉnh núi, đèo cao và trạm khí tượng Tây Bắc.
  - Tự động chuẩn hóa tiếng Việt, nhận diện tên viết tắt (`KQS`, `Bạch Mộc`, `Sống lưng khủng long`,...).
  - Tích hợp công cụ định vị tọa độ và xác nhận thông tin địa lý (`LocationConfirm`).
- 🤖 **Khám Phá Model Động & Tự Động Chuyển Lùi (Dynamic AI Discovery & Fallback Engine)**:
  - **Khám phá động (R1)**: Tự động gọi API nhà cung cấp để khám phá danh sách các model khả dụng trong phiên (lọc bỏ embedding, imagen, tts,...).
  - **Phân hạng & Sắp xếp (R2)**: Tự động phân loại model nhẹ/tiết kiệm (Flash), cao cấp (Pro), thử nghiệm (Preview) và đưa model Flash lên đầu.
  - **Ghi nhớ thiết bị (R3)**: Cho phép chọn model bất kỳ và tự động lưu vào `localStorage`.
  - **Mặc định an toàn (R4)**: Tự động trỏ tới model Flash mới nhất có hạn mức thoáng nhất khi người dùng chưa chọn.
  - **Tự động lùi model (R5 Fallback)**: Tự động lùi sang model dự phòng tiếp theo khi gặp lỗi `429 Rate Limit`, `404 Deprecated` hoặc `5xx Server Error`. Tự động ngắt ngay lập tức khi sai Key (`401/403`). Không tự động gọi model trả phí ngoài ý muốn.
  - **Minh bạch (R6)**: Hiển thị nhãn công khai model thực tế đã phản hồi bản tin.
- 🌡️ **Chỉ Số Nghịch Nhiệt Bức Xạ Thung Lũng (VRII - Valley Radiation Inversion Index)**:
  - Thuật toán mới đánh giá bức xạ nhiệt ban đêm, độ rộng điểm sương và lớp mây đè để tính điểm VRII (0-100).
  - Phân loại độ phẳng và mịn của thảm mây (`Excellent`, `Favorable`, `Moderate`, `Poor`).
- 🌅 **Bộ Tính Giờ Mặt Trời & Khung Giờ Vàng (Solar & Lighting Engine)**:
  - Tự động tính chính xác thời điểm **Bình minh (🌄)**, **Hoàng hôn (🌇)** và **Khung giờ vàng chụp ảnh (⭐)** theo vĩ độ/kinh độ và ngày trong năm.
- 🏔️ **Bộ Mô Phỏng Độ Cao Lán Nghỉ Tương Tác (Dynamic Waypoint Altitude Simulator)**:
  - Cho phép người dùng nhấp trực tiếp vào bất kỳ mỏm đá/lán nghỉ nào trên đồ thị địa hình (ví dụ: *Lán 2200m*, *Đỉnh 2860m*, *Homestay 1900m*).
  - Tự động tính lại $\Delta H = H_{\text{vị trí đứng}} - H_{\text{mặt mây}}$ và cập nhật ngay lập tức góc nhìn mây từ đúng độ cao đó theo thời gian thực!
- 📥 **Xuất File Dữ Liệu Offline (GPX & Text Export)**:
  - Cho phép xuất file dữ liệu lộ trình `.gpx` tích hợp tọa độ, độ cao và ghi chú dự báo thời tiết để nạp trực tiếp vào các ứng dụng leo núi offline (Gaia GPS, Strava, OsmAnd).
  - Xuất bản tóm tắt văn bản `.txt` để tra cứu khi mất sóng điện thoại trên núi.

---

## 📐 Thuật Toán Cốt Lõi (Core Algorithms)

### 1. Độ Cao Đáy Mây (LCL - Lifting Condensation Level)
$$LCL (m) \approx 125 \times (T_{surf} - Td_{surf})$$
* **LCL < 500m**: Mây rất thấp, nguy cơ mù đặc từ chân núi.
* **LCL > Elevation**: Mây treo cao hơn đỉnh núi, đỉnh thoáng hoặc mù khô.

### 2. Chỉ Số Sương Mù Ổn Định (Wind-Weighted FSI)
$$FSI = 2(T_{surf} - Td_{surf}) + 2(T_{surf} - T_{850}) + W_{impact}$$
* $T_{850}$: Nhiệt độ tầng 850hPa (~1500m).
* $W_{impact}$: Hệ số gió ($W < 10\text{km/h} \Rightarrow 0$; $10\le W \le 20 \Rightarrow W \times 1$; $W > 20 \Rightarrow W \times 2$).
* **FSI < 30**: Rất tốt (Biển mây dày vững chắc).
* **30 ≤ FSI ≤ 50**: Trung bình (Mây luồn / Mù nhẹ).
* **FSI > 50**: Xấu (Mây bị xé tan hoặc quang mây).

### 3. Nghịch Nhiệt Bức Xạ & Mặt Mây (Inversion & Cloud Top)
Khi $T_{850hPa} > T_{surf}$ (Nghịch nhiệt sát đất), khối khí ấm đè lên khối khí lạnh dưới thung lũng, nhốt hơi ẩm tạo thành biển mây tĩnh phẳng lỳ dưới chân.

### 4. Quy Tắc Ranh Giới Mặt Mây (Boundary Fluctuation)
$$\Delta H = H_{observer} - H_{cloud\_top}$$
* **$\Delta H > 300m$**: Vị trí quan sát vượt hẳn lên trên biển mây $\rightarrow$ Biển mây tĩnh, không bị mù.
* **$\Delta H \le 200m$**: Khu vực ranh giới (Fluctuating Zone) $\rightarrow$ Mây dâng lên hạ xuống từng lớp do dòng thăng nhiệt (Thermal updrafts).

---

## 🏗️ Kiến Trúc Dự Án (Project Structure)

```text
CloudHunter/
├── App.tsx                    # Main App component (State & Layout orchestration)
├── index.html                 # Entry HTML with Google Fonts & Tailwind CDN
├── index.tsx                  # React DOM Entry point
├── types.ts                   # TypeScript interfaces (WeatherInput, DailyForecast, CloudAnalysis,...)
├── vite.config.ts             # Vite configuration with aliases & env definitions
├── components/
│   ├── Header.tsx             # App Banner & Branding Header
│   ├── InputForm.tsx          # Autocomplete search & Date range picker
│   ├── LocationConfirm.tsx    # Location validation & Altitude preview step
│   └── AnalysisResult.tsx     # Comprehensive forecast view & Elevation profile SVG
├── services/
│   ├── geminiService.ts       # Gemini 3.5 Flash Hybrid AI Engine & Prompt construction
│   └── weatherService.ts      # Open-Meteo API Client (850hPa/700hPa upper-air sampling)
└── constants/
    ├── mountains.ts           # Extended mountain database (Coords, Zones, Altitudes)
    └── constants.ts           # Preset elevation profiles & aliases for Northwest peaks
```

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Cục Bộ (Setup & Local Run)

### Yêu Cầu Tiền Đề
- Node.js $\ge$ 18.x
- npm $\ge$ 9.x
- Google Gemini API Key (lấy tại [Google AI Studio](https://aistudio.google.com/))

### Các Bước Cài Đặt

1. **Clone Repository & Chuyển Thư Mục**:
   ```bash
   git clone https://github.com/phongvan0926/cloudhunter.git
   cd cloudhunter
   ```

2. **Cài Đặt Package Dependencies**:
   ```bash
   npm install
   ```

3. **Cấu Hình Biến Môi Trường (`.env`)**:
   Tạo file `.env` tại thư mục gốc dự án:
   ```env
   GEMINI_API_KEY=AIzaSy...Your_Gemini_API_Key_Here...
   ```

4. **Khởi Chạy Máy Chủ Phát Triển (Dev Server)**:
   ```bash
   npm run dev
   ```
   Ứng dụng sẽ chạy tại: `http://localhost:3000/`

5. **Build Sản Phẩm (Production Build)**:
   ```bash
   npm run build
   ```

---

## 🗺️ Đề Xuất Phát Triển & Nâng Cấp Tương Lai (Roadmap)

1. **Ensemble Multi-Model API Integration**: Tích hợp đồng thời mô hình GFS 13km, ECMWF IFS 9km, ICON-EU 7km từ Open-Meteo để tính chỉ số đồng thuận (Model Consensus Confidence Score).
2. **Dynamic Altitude Simulator**: Cho phép người dùng tùy chỉnh trực tiếp độ cao lán nghỉ/homestay trên UI để cập nhật lại $\Delta H$ và dự báo ranh giới mặt mây theo thời gian thực.
3. **Live Camera & Crowd-sourced Reports**: Tích hợp kênh báo cáo mây trực tiếp từ cộng đồng trekker tại các homestay Y Tý, Tà Xùa, Sapa.
4. **Golden Hour Sunset/Sunrise Calculator**: Tự động tính chính xác góc chiếu sáng mặt trời và thời điểm bình minh/hoàng hôn cho từng tọa độ núi.

---

## 📄 Giấy Phép & Tác Quyền

Dự án được phát triển dưới giấy phép MIT. Dữ liệu khí tượng công cộng được truy xuất qua [Open-Meteo API](https://open-meteo.com/).
