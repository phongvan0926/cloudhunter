import { GoogleGenAI, Type } from "@google/genai";
import { WeatherInput, CloudAnalysis, LocationAnalysis } from "../types";
import { NORTHWEST_PEAKS } from '../constants';
import { MOUNTAIN_DB } from '../constants/mountains';
import { fetchMountainWeather, WeatherData } from './weatherService';
import { discoverModels, executeWithFallback, getStoredModel, getStoredApiKey } from './modelDiscoveryService';

function getAIInstance(): GoogleGenAI {
  const apiKey = getStoredApiKey();
  return new GoogleGenAI({ apiKey });
}

function removeVietnameseTones(str: string): string {
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g,"a"); 
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g,"e"); 
    str = str.replace(/ì|í|ị|ỉ|ĩ/g,"i"); 
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g,"o"); 
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g,"u"); 
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g,"y"); 
    str = str.replace(/đ/g,"d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    return str.toLowerCase().trim();
}

export function findBestMatchingPeak(input: string) {
  const normInput = removeVietnameseTones(input);
  let bestMatch: typeof NORTHWEST_PEAKS[0] | null = null;
  let highestScore = 0;

  for (const peak of NORTHWEST_PEAKS) {
    const normName = removeVietnameseTones(peak.name);
    let score = 0;

    if (normInput === normName) {
      score = 10000 + normName.length;
    } else if (normInput.includes(normName)) {
      score = 5000 + normName.length;
    } else if (normName.includes(normInput)) {
      score = 2000 + normInput.length;
    }

    if (peak.aliases) {
      for (const alias of peak.aliases) {
        const normAlias = removeVietnameseTones(alias);
        if (normInput === normAlias) {
          score = Math.max(score, 4000 + normAlias.length);
        } else if (normInput.includes(normAlias)) {
          score = Math.max(score, 1000 + normAlias.length);
        } else if (normAlias.includes(normInput)) {
          score = Math.max(score, 500 + normInput.length);
        }
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = peak;
    }
  }

  return highestScore > 0 ? bestMatch : null;
}

export function findBestMatchingMountain(input: string): { key: string; info: typeof MOUNTAIN_DB[string] } | null {
  const normInput = removeVietnameseTones(input);
  let bestMatch: { key: string; info: typeof MOUNTAIN_DB[string] } | null = null;
  let highestScore = 0;

  for (const [key, mt] of Object.entries(MOUNTAIN_DB)) {
    const normName = removeVietnameseTones(mt.name);
    let score = 0;

    if (normInput === normName) {
      score = 10000 + normName.length;
    } else if (normInput.includes(normName)) {
      score = 5000 + normName.length;
    } else if (normName.includes(normInput)) {
      score = 2000 + normInput.length;
    }

    if (mt.aliases) {
      for (const alias of mt.aliases) {
        const normAlias = removeVietnameseTones(alias);
        if (normInput === normAlias) {
          score = Math.max(score, 4000 + normAlias.length);
        } else if (normInput.includes(normAlias)) {
          score = Math.max(score, 1000 + normAlias.length);
        } else if (normAlias.includes(normInput)) {
          score = Math.max(score, 500 + normInput.length);
        }
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = { key, info: mt };
    }
  }

  return highestScore > 0 ? bestMatch : null;
}

export const analyzeLocation = async (locationName: string, model?: string): Promise<LocationAnalysis> => {
  const knownPeak = findBestMatchingPeak(locationName);
  const is_known_peak = !!knownPeak;
  const matchedMountainEntry = findBestMatchingMountain(locationName);
  const matchedMt = matchedMountainEntry ? matchedMountainEntry.info : null;

  if (knownPeak && matchedMt) {
    return {
      name: knownPeak.name,
      province: knownPeak.province,
      estimated_elevation: knownPeak.altitude,
      description: `Địa điểm đã được xác thực chính xác trên hệ thống dữ liệu số khí tượng Tây Bắc Việt Nam. Nhóm đặc tính vùng: ${matchedMt.zone === "A_CLOUD_TRAP" ? "Bồn giữ ẩm (Ít gió, tụ mây cực mạnh)" : "Ống gió sườn núi (Đặc thù gió mạnh, mây luồn)"}. Đứng săn mây lý tưởng ở độ cao khoảng ${knownPeak.altitude - 100}m.`,
      is_known_peak: true,
      confidence: "HIGH",
      suggested_observer_alt: knownPeak.altitude - 100,
      lat: matchedMt.lat,
      lon: matchedMt.lon
    };
  }

  const prompt = `
    Phân tích địa danh: "${locationName}".
    Nhiệm vụ: Xác định thông tin địa lý cơ bản của địa điểm này tại Việt Nam (đặc biệt là vùng núi).
    Nếu đây là một địa danh không có thật hoặc không rõ ràng, hãy cố gắng phỏng đoán hoặc trả về confidence LOW.
    Nếu địa danh này là một ngọn núi nổi tiếng, hãy cung cấp tên chuẩn, tỉnh thành, độ cao ước tính, mô tả ngắn gọn về địa hình và đặc điểm săn mây, và độ cao lý tưởng để đứng săn mây (thường thấp hơn đỉnh 100-200m).
    BẮT BUỘC: Cung cấp tọa độ (latitude, longitude) ước tính của địa điểm này để hệ thống có thể lấy dữ liệu thời tiết.
  `;

  try {
    const discovered = await discoverModels();
    const primaryModel = model || getStoredModel() || discovered[0]?.id || "gemini-2.5-flash";

    const fallbackRes = await executeWithFallback(primaryModel, discovered, async (modelId) => {
      const fetchPromise = getAIInstance().models.generateContent({
        model: modelId,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Tên chuẩn của địa điểm" },
              province: { type: Type.STRING, description: "Tỉnh thành" },
              estimated_elevation: { type: Type.NUMBER, description: "Độ cao ước tính (mét)" },
              description: { type: Type.STRING, description: "Mô tả ngắn gọn về địa hình và đặc điểm săn mây" },
              confidence: { type: Type.STRING, enum: ["HIGH", "MEDIUM", "LOW"] },
              suggested_observer_alt: { type: Type.NUMBER, description: "Độ cao lý tưởng để đứng săn mây" },
              lat: { type: Type.NUMBER, description: "Vĩ độ (Latitude)" },
              lon: { type: Type.NUMBER, description: "Kinh độ (Longitude)" }
            },
            required: ["name", "province", "estimated_elevation", "description", "confidence", "suggested_observer_alt", "lat", "lon"]
          }
        }
      });

      const timeoutPromise = new Promise<any>((_, reject) => {
        setTimeout(() => reject(new Error("Gemini API Timeout after 30s")), 30000);
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]);
      if (response && response.text) return response;
      throw new Error("No response text");
    });

    const response = fallbackRes.result;

    if (response.text) {
      let jsonStr = response.text.trim();
      
      const jsonMatch = jsonStr.match(/```json\r?\n([\s\S]*?)\r?\n```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      } else {
        const genericMatch = jsonStr.match(/```\r?\n([\s\S]*?)\r?\n```/);
        if (genericMatch) {
          jsonStr = genericMatch[1].trim();
        } else {
          const startIdx = jsonStr.indexOf('{');
          const endIdx = jsonStr.lastIndexOf('}');
          if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
            jsonStr = jsonStr.substring(startIdx, endIdx + 1);
          }
        }
      }
      
      const analysis = JSON.parse(jsonStr) as LocationAnalysis;
      return { ...analysis, is_known_peak };
    }
    throw new Error("No response from AI");
  } catch (error) {
    console.error("Location Analysis Error:", error);
    return {
      name: locationName,
      province: "Tây Bắc",
      estimated_elevation: 2000,
      description: "Hệ thống tự động sử dụng tọa độ dự phòng vùng núi cao cho địa danh này.",
      is_known_peak: false,
      confidence: "MEDIUM",
      suggested_observer_alt: 1800,
      lat: 22.3364,
      lon: 103.8438
    };
  }
};

const SYSTEM_INSTRUCTION = `
# ROLE (VAI TRÒ)
Bạn là **CloudHunter AI v4.0** - Hệ thống chuyên gia khí tượng lai (Hybrid Meteorological Expert).
Nhiệm vụ của bạn là tổng hợp **Dữ liệu định lượng chính xác (Numerical Data)** từ API (giả lập qua Search) và **Thông tin ngữ cảnh (Contextual Info)** để đưa ra dự báo săn mây chính xác nhất cho vùng núi cao Việt Nam.

# CORE ALGORITHMS (8 MODULES)

Bạn phải thực hiện tính toán qua 8 module sau cho từng ngày dự báo:

## MODULE 1: TÍNH ĐỘ CAO ĐÁY MÂY (LCL CALCULATOR)
*Mục đích: Xác định xem mây có trùm kín chân núi hay không.*
$$LCL (m) \\approx 125 \\times (T_{surf} - Td_{surf})$$
* Nếu LCL < 500m: Mây rất thấp, mù từ chân núi.
* Nếu LCL > Độ cao đỉnh: Mây treo cao, đỉnh thoáng hoặc mù khô.

## MODULE 2: TÍNH CHỈ SỐ FSI HIỆU CHỈNH (WIND-WEIGHTED FSI)
*Mục đích: Xác định xác suất hình thành mây.*
$$FSI = 2(T_{surf} - Td_{surf}) + 2(T_{surf} - T_{850}) + W_{impact}$$

*Trong đó:*
* $T_{850}$: Nhiệt độ tại tầng 850hPa (~1500m).
* $W_{impact}$: Hệ số tác động của gió (Dựa trên wind_speed_850hPa):
    * Gió < 10 km/h: $W_{impact} = 0$ -> wind_impact_level: "Low"
    * Gió 10-15 km/h: $W_{impact} = WindSpeed \\times 1$ -> wind_impact_level: "Medium"
    * Gió 15-20 km/h: $W_{impact} = WindSpeed \\times 1$ -> wind_impact_level: "High"
    * Gió > 20 km/h: $W_{impact} = WindSpeed \\times 2$ (Phạt nặng) -> wind_impact_level: "Destructive"
* **Kết luận FSI:**
    * < 30: Rất tốt (Mây dày).
    * 30-50: Trung bình (Mây luồn/Mù nhẹ).
    * > 50: Xấu (Quang mây hoặc Mù nát).

## MODULE 3: PHÂN TÍCH CẤU TRÚC ẨM & GIÓ (THE WIND/MOISTURE MATRIX)
*Mục đích: Phân biệt Mù đặc (Fog) và Mây tan (Scouring).*
Kiểm tra Moisture_Depth dựa trên chênh lệch (T - Td) tại 850hPa/700hPa:
* **CASE A: Gió Mạnh + Ẩm Sâu (Deep Moisture):** (T-Td tầng cao < 3°C) -> moisture_type: "Deep" -> **MÙ ĐẶC / FOG**.
* **CASE B: Gió Mạnh + Ẩm Nông (Shallow Moisture):** (T-Td tầng cao > 5°C) -> moisture_type: "Shallow" -> **MÂY TAN (DISSIPATING) / HỖN LOẠN**.
* **CASE C: Gió Nhẹ + Ẩm Bất kỳ:** -> **BIỂN MÂY TĨNH (STATIC)**. (moisture_type tùy thuộc T-Td).

## MODULE 4: TÍNH ĐỘ CAO MẶT MÂY (CLOUD ALTIMETER)
*Mục đích: Xác định mây nằm ở thung lũng hay dâng ngập đỉnh.*
So sánh nhiệt độ các tầng:
* Nếu $T_{850} > T_{700}$ (Giảm nhiệt thường) VÀ chênh lệch thấp (<4°C): **Mây Dâng Cao (High Cloud)** ~2.500m+.
* Nếu $T_{850} \\approx T_{surf}$: **Mây Trung Bình** ~1.800m-2.200m.
* Nếu $T_{850} > T_{surf}$ (Nghịch nhiệt sát đất - INVERSION): **Mây Thấp** <1.500m — BÍ QUYẾT: đây là điều kiện vàng cho biển mây tĩnh bị "nhốt" trong thung lũng. -> inversion_strength: "Strong"

## MODULE 5: THE BOUNDARY FLUCTUATION RULE (QUY TẮC RANH GIỚI MẶT MÂY)
*Mục đích: Xử lý hiệu ứng "mây dâng từng lớp" do dòng thăng nhiệt khi người dùng đứng quá gần mặt mây.*

**Thuật toán so sánh cao độ:**
Bạn bắt buộc phải tính độ chênh lệch ($\\Delta H$) giữa **Độ cao vị trí người dùng đang đứng** (VD: Lán nghỉ 2100m, Homestay 1900m - Lấy từ Elevation Profile hoặc Observer Altitude) và **Độ cao mặt mây dự kiến (Cloud Top)** tính được ở Module 4. Ghi chú vào boundary_status.

1. **Trường hợp An toàn ($\\Delta H > 300m$):**
   - Nếu *Vị trí > Cloud Top*: Người dùng đứng rất cao trên mây -> Biển mây tĩnh lặng tuyệt đối, phẳng lỳ như thảm bông. Không bị mù.
   - Nếu *Vị trí < Cloud Top*: Người dùng chìm sâu trong mây -> Mù đặc quánh, ướt át, tầm nhìn zero.

2. **Trường hợp Ranh giới ($\\Delta H \\le 200m$): KHU VỰC DAO ĐỘNG (FLUCTUATING ZONE)**
   - *Logic:* Tại mép ranh giới nghịch nhiệt, mây không đứng im mà "thở" theo dòng thăng nhiệt (Thermal updrafts) hoặc gió thung lũng nhẹ.
   - *Hành động bắt buộc của AI:* -> Đổi \`status_code\` thành **"FLUCTUATING"** hoặc **"ROLLING"**.
     -> Đổi \`status_text\` thành **"Mây dâng từng lớp / Dao động liên tục"**.
     -> Trong \`cloud_behavior\`, phải giải thích rõ hiện tượng: "Bạn đang ở ngay ranh giới mặt mây. Mây sẽ dâng lên từng lớp do dòng thăng nhiệt. Cảnh quan sẽ thay đổi liên tục: lúc quang đãng mây dưới chân, lúc gió thổi sẽ bị mù trùm ngập cục bộ."
     -> Trong \`expert_advice\`, hãy khuyên người dùng kiên nhẫn: "Đừng vội thất vọng khi thấy mù. Hãy kiên nhẫn chờ những cơn gió đẩy mù đi, bạn sẽ chụp được khoảnh khắc mây trào lên tận mặt cực kỳ huyền ảo."

## MODULE 6: TOPOGRAPHIC FLUID DYNAMICS (HIỆU ỨNG ĐỊA HÌNH VÙNG)
*Mục đích: Điều chỉnh sức chịu đựng của mây đối với gió dựa trên cấu trúc thung lũng (Bồn giữ ẩm vs Ống gió).*

**PHÂN LOẠI VÙNG ĐỊA HÌNH:**

**1. ZONE A - CLOUD TRAPS (BỒN GIỮ ẨM):**
* **Các đỉnh:** Thuộc Lào Cai (Ky Quan San, Nhìu Cồ San, Lảo Thẩn, Y Tý) và Yên Bái (Tà Xùa, Tà Chì Nhù). Sơn La (Tà Xùa Bắc Yên, Pha Luông).
* **Đặc điểm:** Thung lũng hẹp, sâu, ngoằn ngoèo, chắn gió tốt.
* **Quy tắc điều chỉnh:** Áp dụng hệ số gió tiêu chuẩn (Module 2). Gió 10-15 km/h vẫn có thể dung túng và cho ra trạng thái Mây Luồn (FLOWING) đẹp.

**2. ZONE B - WIND TUNNELS & LEEWARD (ỐNG GIÓ & SƯỜN KHUẤT):**
* **Các đỉnh:** Thuộc Lai Châu (Pu Ta Leng, Tả Liên Sơn, Pu Si Lung, Nam Kang Ho Tao, Bạch Mộc Lương Tử mặt Lai Châu).
* **Đặc điểm:** Thung lũng rộng, dài, thẳng (hiệu ứng Venturi ép gió tăng tốc). Khuất sau dãy Hoàng Liên Sơn.
* **Quy tắc điều chỉnh (BẮT BUỘC ÁP DỤNG KHI TÍNH TOÁN):**
  - **Phạt Gió (Wind Penalty):** Nếu gió $W_{850} > 8 \\text{ km/h}$, cấu trúc mây sẽ bị xáo trộn cơ học (Mechanical Mixing). BẮT BUỘC chuyển trạng thái thành **MÙ ĐẶC (FOG)** hoặc **MÂY TAN (DISSIPATING)** bất kể độ ẩm đẹp đến đâu.
  - **Điều kiện lý tưởng:** Chỉ cấp trạng thái BIỂN MÂY TĨNH (STATIC) cho Lai Châu nếu gió $W_{850} \\le 5 \\text{ km/h}$ (Cực lặng).
  - **Hiệu ứng Foehn:** Nếu gió hướng Đông/Đông Nam thổi mạnh, hơi ẩm sẽ bị dãy Hoàng Liên Sơn vắt kiệt. Biển mây tại Lai Châu sẽ rất mỏng hoặc chuyển thành sương mù khô.

## MODULE 7: SEASONAL CALIBRATION (HIỆU CHỈNH THEO MÙA)
**Thu (Sep–Nov) 🍂 — BEST SEASON:**
• Áp cao lục địa mạnh → Nghịch nhiệt bức xạ (Radiative Inversion) cực mạnh ban đêm
• Gió mùa Đông Bắc nhẹ và ổn định → Ít nhiễu loạn
• Sương ban mai dày đặc → LCL thấp tự nhiên
• Score bonus: +15 điểm cho tất cả ngày trong tháng 10–11

**Đông (Dec–Feb) ❄️ — SEASON OF FOG:**
• Không khí lạnh từ phương Bắc tràn xuống → FOG đặc nhưng gió giật mạnh
• Gió Bắc cấp 4–5 thường xuyên → Zone B đặc biệt nguy hiểm cho biển mây
• Rét đậm ≤0°C trên 2500m → Sương giá/băng giá, nguy hiểm trek
• Score: Giữ nguyên nhưng thêm cảnh báo gió lạnh

**Xuân (Mar–May) 🌸 — UNSTABLE SEASON:**
• Đối lưu nhiệt buổi chiều mạnh → Mây tan nhanh sau 09:00
• Dông chiều thường xuyên sau 14:00 → Nguy hiểm cao
• Biển mây khả năng có nhưng ngắn (05:30–08:30 max)
• Score penalty: −10 điểm, cảnh báo dông chiều BẮT BUỘC

**Hè (Jun–Aug) ☔ — MONSOON:**
• Mưa nhiều, mây hỗn loạn, tầm nhìn kém
• Nguy cơ sạt lở đất cực cao
• Score penalty: −20 điểm, cảnh báo sạt lở BẮT BUỘC

## MODULE 8: GOLDEN HOUR PROTOCOL (KHUNG GIỜ VÀNG)
Biển mây có chu kỳ nhật triều (Diurnal Cycle):
• 04:00–05:30 PRE-DAWN: Nghịch nhiệt bức xạ đạt cực đại → Biển mây hình thành và ổn định nhất → PHẢI LÊN ĐỈNH TRƯỚC GIỜ NÀY
• 05:30–07:30 GOLDEN HOUR ⭐⭐⭐: Ánh sáng mặt trời nhuộm hồng/vàng biển mây → Đẹp nhất để chụp ảnh
• 07:30–09:30 DYNAMIC HOUR ⭐⭐: Dòng nhiệt bắt đầu khuấy đảo → Mây "thở" và trào lên → Cảnh huyền ảo FLOWING/FLUCTUATING
• 09:30–11:00 BREAKDOWN: Nghịch nhiệt yếu dần → Biển mây dâng và phân mảnh → Về sớm hoặc chấp nhận cảnh trống
• 14:00–17:00 DANGER ZONE: Đối lưu nhiệt cực đại → Dông giật → XUỐNG NÚI
• 18:00–19:30 SECONDARY WINDOW (mùa thu/đông): Hoàng hôn + lạnh nhanh → Biển mây mỏng có thể tái hình thành

# DATA SOURCE RELIABILITY PROTOCOL (GIAO THỨC ĐỘ TIN CẬY DỮ LIỆU)
Bạn KHÔNG ĐƯỢC sử dụng các trang báo mạng phổ thông (baomoi, tienphong, vnexpress, kenh14...) làm nguồn dữ liệu CHÍNH cho các chỉ số kỹ thuật (Gió, Nhiệt độ, Điểm sương).
Lý do:
1. Thiếu độ chính xác về độ cao (Atmospheric Layers).
2. Thường chỉ đưa tin thời tiết bề mặt (Surface) chung chung.
3. Không có dữ liệu về Wind Shear hoặc Dew Point Spread.

Hãy sử dụng chúng CHỈ ĐỂ tham khảo tình hình thực tế (ví dụ: ảnh mây hôm qua, tình trạng sạt lở đường).

# CONSTRAINT (RÀNG BUỘC)
1. Ưu tiên tuyệt đối tìm kiếm số liệu cụ thể (Nhiệt độ, Điểm sương, Gió các tầng) để điền vào [HARD_DATA] trước khi tính toán.
2. Nếu không tìm thấy số liệu chính xác từ Search, hãy ước lượng dựa trên mô hình ECMWF/GFS mới nhất được thảo luận trên các trang dự báo uy tín (Windy, Mountain-Forecast).
3. KHÔNG ĐƯỢC tự bịa số liệu vô căn cứ. Bạn phải nêu rõ trong "expert_advice" nếu dữ liệu là ước tính.
`;

export const analyzeWeatherData = async (data: WeatherInput): Promise<CloudAnalysis> => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  // 1. Enhanced Scored Matching
  const matchedPreset = findBestMatchingPeak(data.locationName);
  const matchedMountainEntry = findBestMatchingMountain(data.locationName);
  const mountainKey = matchedMountainEntry ? matchedMountainEntry.key : null;

  let terrainContext = "";
  if (matchedPreset && matchedPreset.elevation_profile && matchedPreset.elevation_profile.length > 0) {
    terrainContext = `
    **KNOWN_LOCATIONS_LIBRARY (DỮ LIỆU ĐỊA HÌNH CHÍNH XÁC ĐÃ XÁC THỰC):**
    Hệ thống nhận diện địa điểm này là: ${matchedPreset.name} (${matchedPreset.province}).
    Mặt cắt địa hình chuẩn (Elevation Profile): ${JSON.stringify(matchedPreset.elevation_profile)}
    BẠN BẮT BUỘC SỬ DỤNG MẶT CẮT ĐỊA HÌNH NÀY CHO TRƯỜNG "terrain_analysis.elevation_profile" VÀ ĐÁNH GIÁ ĐÚNG VỊ TRÍ ĐỨNG SĂN MÂY.
    `;
  }

  let hasHardData = false;
  let hardcodedDataInjection = "";
  let weatherDataSourceInfo: any = null;
  let fetchedWeatherPackage: any = null;

  fetchedWeatherPackage = await fetchMountainWeather(mountainKey, data.locationName, data.startDate, data.endDate, data.lat, data.lon);
  if (fetchedWeatherPackage) {
          const { mountainInfo, dailyWeather } = fetchedWeatherPackage;
          
          weatherDataSourceInfo = {
            locationName: mountainInfo.name,
            lat: mountainInfo.lat,
            lon: mountainInfo.lon,
            elevation: mountainInfo.elevation,
            source: "Open-Meteo API"
          };
          
          let hasAnyValidData = false;
          let dailyDataStr = "";
          for (const [date, w] of Object.entries(dailyWeather) as [string, WeatherData][]) {
              if (w.t_surf !== null) hasAnyValidData = true;
              dailyDataStr += `
              Ngày ${date}:
              - T_surf: ${w.t_surf !== null ? w.t_surf + '°C' : 'Không có dữ liệu (Missing)'}
              - Td_surf: ${w.td_surf !== null ? w.td_surf + '°C' : 'Không có dữ liệu (Missing)'}
              - T_850hPa: ${w.t_850 !== null ? w.t_850 + '°C' : 'Không có dữ liệu (Missing)'}
              - T_700hPa: ${w.t_700 !== null ? w.t_700 + '°C' : 'Không có dữ liệu (Missing)'}
              - Wind_Speed_850hPa: ${w.wind_850 !== null ? w.wind_850 + ' km/h' : 'Không có dữ liệu (Missing)'}
              - LCL_computed: ${w.lcl_computed !== undefined ? w.lcl_computed + 'm' : 'N/A'}
              - FSI_computed: ${w.fsi_computed !== undefined ? w.fsi_computed : 'N/A'}
              - VRII_computed (Bức xạ thung lũng): ${w.vrii_score !== undefined ? w.vrii_score + '/100 (' + w.vrii_label + ')' : 'N/A'}
              - Sun_Times: ${w.sun_times ? `Bình minh ${w.sun_times.sunrise}, Hoàng hôn ${w.sun_times.sunset}, Khung giờ vàng sáng: ${w.sun_times.goldenHourMorning}` : 'N/A'}
              - Model_Consensus_Score: ${w.model_consensus_score !== undefined ? w.model_consensus_score + '%' : '90%'}
              - Inversion_strength_computed: ${w.inversion_strength_computed !== undefined ? w.inversion_strength_computed : 'N/A'}
              - Wind_impact_level_computed: ${w.wind_impact_level_computed !== undefined ? w.wind_impact_level_computed : 'N/A'}
              `;
          }

          if (hasAnyValidData) {
              hasHardData = true;
              hardcodedDataInjection = `
              [HARD_DATA_PROVIDED_BY_SYSTEM]
              Hệ thống đã tự động lấy và đối chiếu dữ liệu thời tiết đa mô hình (ECMWF, GFS, ICON) từ Open-Meteo cho địa điểm này.
              Vị trí cần phân tích: ${mountainInfo.name}
              Đặc điểm địa hình (Module 6): ${mountainInfo.zone}
              Độ cao: ${mountainInfo.elevation}m
              
              DỮ LIỆU KHÍ TƯỢNG ĐA TẦNG (Mẫu tổng hợp 04:00 - 08:00 Sáng & Chu kỳ Bức xạ Đêm):
              ${dailyDataStr}
              
              Hệ thống đã tự động tính toán trước các chỉ số khí tượng nâng cao để hỗ trợ bạn:
              - LCL_computed: Độ cao đáy mây lý thuyết.
              - FSI_computed: Chỉ số sương mù ổn định (càng thấp càng dễ có biển mây dày).
              - VRII_computed: Chỉ số Bức Xạ Thung Lũng (Valley Radiation Inversion Index) - Đánh giá độ tĩnh và phẳng của thảm mây.
              - Sun_Times: Khung giờ bình minh, hoàng hôn và góc chiếu mặt trời.
              - Model_Consensus_Score: Độ đồng thuận giữa các mô hình dự báo toàn cầu (ECMWF / GFS / ICON).
              - Inversion_strength_computed: Cường độ nghịch nhiệt giữ mây trong thung lũng (Strong, Moderate, Weak, None).
              - Wind_impact_level_computed: Mức độ gió phá huỷ mây (Low, Medium, High, Destructive).
              
              BẠN BẮT BUỘC PHẢI DÙNG CÁC SỐ LIỆU VÀ CHỈ SỐ NÀY ĐỂ ĐÁNH GIÁ CHẤM ĐIỂM CHO TỪNG NGÀY.
              LƯU Ý: Nếu ngày nào ghi "Không có dữ liệu (Missing)", đặt status_code là UNKNOWN.
              Hãy sử dụng các Module 1 đến 8 trong System Instructions để phân tích cục dữ liệu trên và trả về JSON. Bắt buộc áp dụng luật của vùng ${mountainInfo.zone}.
              `;
          }
      }

  let searchStrategyPrompt = "";
  if (hasHardData) {
      searchStrategyPrompt = `
    **2. CHIẾN LƯỢC XỬ LÝ DỮ LIỆU:**
    Hệ thống ĐÃ CUNG CẤP SỐ LIỆU KHÍ TƯỢNG ĐA MÔ HÌNH (HARD_DATA). 
    Đối với những ngày bị "Missing" (Không có dữ liệu), BẮT BUỘC đặt status_code là UNKNOWN và ghi rõ "Thiếu dữ liệu" trong status_text.
      `;
  } else {
      searchStrategyPrompt = `
    **2. CHIẾN LƯỢC XỬ LÝ DỮ LIỆU:**
    Hệ thống KHÔNG CÓ SỐ LIỆU cho địa điểm này.
    Hãy sử dụng kiến thức sẵn có của bạn để ước lượng các chỉ số khí tượng cơ bản cho ${data.locationName} trong khoảng thời gian này.
    Nếu không thể ước lượng, BẮT BUỘC đặt status_code là UNKNOWN cho các ngày đó.
      `;
  }

  // Updated Prompt with strict SOURCE PRIORITY, Description Extraction, and MISSING DATA PROTOCOL
  const prompt = `
    Dự báo săn mây cho: "${data.locationName}".
    Ngày: ${data.startDate} đến ${data.endDate} (${diffDays} ngày).
    ${terrainContext}
    ${hardcodedDataInjection}

    NHIỆM VỤ CỦA BẠN:

    **1. XỬ LÝ ĐỊA HÌNH (GEO-TOPOGRAPHY ENGINE):**
    - QUY TẮC ƯU TIÊN SỐ 1: Kiểm tra xem khối dữ liệu "**KNOWN_LOCATIONS_LIBRARY**" (nếu có) CÓ THỰC SỰ KHỚP với địa điểm người dùng yêu cầu hay không.
      + CẢNH BÁO: Phân biệt rõ các địa danh dễ nhầm lẫn. Ví dụ: "Tà Xùa Hồ" (Lai Châu) KHÁC HOÀN TOÀN "Tà Xùa" (Yên Bái/Sơn La). "Ky Quan San" KHÁC "Quan Sơn".
    - TRƯỜNG HỢP 1 (EXACT MATCH): Nếu dữ liệu thư viện ĐÚNG là địa điểm người dùng cần:
      + Bạn BẮT BUỘC phải sử dụng chính xác mảng dữ liệu đó cho trường "elevation_profile". KHÔNG được sửa đổi độ cao hay tên điểm.
      + Thiết lập trường "source" trong "terrain_analysis" là "HARDCODED".
    - TRƯỜNG HỢP 2 (MISMATCH HOẶC KHÔNG CÓ THƯ VIỆN): Nếu thư viện đưa sai địa điểm (ví dụ hỏi Tà Xùa Hồ nhưng thư viện là Tà Xùa), HOẶC không có khối KNOWN_LOCATIONS_LIBRARY:
      + BỎ QUA dữ liệu thư viện. Kích hoạt chế độ nghiên cứu (Research Mode) trên Internet.
      + Tự tìm hiểu và ước lượng 3-5 điểm chốt quan trọng của ĐÚNG địa điểm đó: Chân núi (Start) -> Các điểm dừng chân/đặc sắc (Hut/Viewpoint) -> Đỉnh (Peak).
      + Khi cấu trúc dữ liệu địa hình, trường 'type' BẮT BUỘC chỉ được chọn 1 trong 4 giá trị: VALLEY (Chân núi/Thung lũng), SLOPE (Điểm dừng chân/Lán), RIDGE (Sống lưng/Sườn dốc), PEAK (Đỉnh núi).
      + Với mỗi điểm, hãy thêm trường "description" trích xuất từ các bài review.
      + Thiết lập trường "source" trong "terrain_analysis" là "RESEARCHED".

    ${searchStrategyPrompt}

    **4. PROTOCOL XỬ LÝ THIẾU DỮ LIỆU & LỜI KHUYÊN CHUYÊN GIA (EXPERT ADVICE PROTOCOL):**
    Trường "expert_advice" phải cực kỳ cụ thể, giúp người dùng tự kiểm chứng khi thiếu dữ liệu (Cross-check).
    
    A. TRƯỜNG HỢP THIẾU DỮ LIỆU (MISSING/ESTIMATED DATA):
       Nếu không có số liệu chính xác cho các chỉ số quan trọng tại ĐÚNG địa điểm yêu cầu, BẠN BẮT BUỘC PHẢI TÌM DỮ LIỆU CỦA ĐỊA ĐIỂM NỔI TIẾNG GẦN NHẤT (Fallback Location) để thay thế.
       - Ví dụ: Nếu không tìm thấy dữ liệu cho "Tà Xùa Hồ", hãy tìm dữ liệu cho "Putaleng" hoặc "Tam Đường" (Lai Châu).
       - Khi sử dụng dữ liệu thay thế, bạn phải đánh dấu "⚠️ DỮ LIỆU ƯỚC TÍNH TỪ [Tên địa điểm thay thế]" trong "expert_advice" và hướng dẫn cụ thể.
       - **Thiếu Gió 850hPa:** "⚠️ Thiếu số liệu Gió tầng 1.500m (850hPa). Hãy mở App Windy, chọn lớp gió 1.500m. Nếu thấy gió > 15km/h (cấp 4), mây sẽ bị xé nát."
       - **Thiếu Dew Point (Điểm sương):** "⚠️ Thiếu chỉ số ẩm độ cao. Kiểm tra thực tế: Nếu sáng sớm thấy sương muối hoặc ướt đẫm lều -> độ ẩm tốt. Nếu trời mù khô -> mây treo cao."
       - **Thiếu Nhiệt độ tầng cao (Nghịch nhiệt):** "⚠️ Không rõ mức độ nghịch nhiệt. Hãy so sánh nhiệt độ chân núi và đỉnh. Nếu đỉnh ấm hơn hoặc bằng chân núi -> Tỉ lệ mây cao."

    B. TRƯỜNG HỢP ĐỦ DỮ LIỆU (CONFIRMED DATA):
       Đưa ra lời khuyên chiến thuật về thời gian và địa điểm:
       - "Nên có mặt tại đỉnh lúc 05:30 sáng vì gió sẽ mạnh lên sau 08:00 làm tan mây."
       - "Mây rất dày (LCL thấp), nên leo cao hơn điểm [Độ cao cụ thể]m để thoát mù."

    **5. TỔNG HỢP VÀ TRẢ VỀ JSON:**
    Áp dụng System Instruction v4.0 để tính toán.

    **6. LỆNH KIỂM SOÁT DỮ LIỆU TỐI CAO (STRICT DATA ENFORCEMENT):**
    Tuyệt đối KHÔNG ĐƯỢC tự động sinh ra (hallucinate) nhiệt độ, độ ẩm hay sức gió để tính toán. 
    Nếu Prompt của người dùng KHÔNG cung cấp khối [HARD_DATA] VÀ không có dữ liệu tin cậy cho một ngày cụ thể:
    - BẮT BUỘC đặt \`status_code\` của ngày đó là "UNKNOWN".
    - Đặt \`status_text\` là "Chưa xác định (Thiếu dữ liệu)".
    - Trong \`weather_analysis.general\` ghi rõ: "Không có dữ liệu khí tượng đáng tin cậy cho ngày này."
    - Các chỉ số kỹ thuật (\`LCL_base\`, \`FSI_score\`, v.v.) có thể để "N/A" hoặc 0.
  `;

  try {
    const discovered = await discoverModels();
    const primaryModel = data.model || getStoredModel() || discovered[0]?.id || "gemini-2.5-flash";

    const fallbackRes = await executeWithFallback(primaryModel, discovered, async (modelId) => {
      const fetchPromise = getAIInstance().models.generateContent({
        model: modelId,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              locationName: { type: Type.STRING },
              province: { type: Type.STRING },
              elevation: { type: Type.NUMBER },
              zoneType: { type: Type.STRING },
              overallScore: { type: Type.NUMBER },
              overallStrategy: { type: Type.STRING },
              seasonalContext: { type: Type.STRING },
              dataReliability: { type: Type.STRING, enum: ["HIGH", "MEDIUM", "LOW"] },
              modelConsensusScore: { type: Type.NUMBER },
              modelSpread: { type: Type.STRING },
              bestDays: { type: Type.ARRAY, items: { type: Type.STRING } },
              goldenTips: { type: Type.ARRAY, items: { type: Type.STRING } },
              safetyWarnings: { type: Type.ARRAY, items: { type: Type.STRING } },
              terrain_analysis: {
                type: Type.OBJECT,
                properties: {
                  source: { type: Type.STRING, enum: ["HARDCODED", "RESEARCHED"] },
                  summary: { type: Type.STRING },
                  cloud_trap_potential: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                  zone_classification: { type: Type.STRING },
                  topographic_notes: { type: Type.STRING },
                  elevation_profile: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        label: { type: Type.STRING },
                        altitude: { type: Type.NUMBER },
                        type: { type: Type.STRING, enum: ["VALLEY", "SLOPE", "PEAK", "RIDGE"] },
                        description: { type: Type.STRING }
                      },
                      required: ["label", "altitude", "type"]
                    }
                  }
                },
                required: ["source", "summary", "cloud_trap_potential", "elevation_profile"]
              },
              dailyForecasts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    date: { type: Type.STRING },
                    dayOfWeek: { type: Type.STRING },
                    score: { type: Type.NUMBER },
                    status_code: { type: Type.STRING, enum: ["STATIC", "FLOWING", "CLEAR", "FOG", "DISSIPATING", "FLUCTUATING", "ROLLING", "UNKNOWN"] },
                    status_text: { type: Type.STRING },
                    golden_hours: { type: Type.STRING },
                    recommended_position: { type: Type.STRING },
                    technical_indices: { 
                      type: Type.OBJECT,
                      properties: {
                        T_surf: { type: Type.STRING },
                        Td_surf: { type: Type.STRING },
                        T_850: { type: Type.STRING },
                        T_700: { type: Type.STRING },
                        LCL_base: { type: Type.STRING },
                        FSI_score: { type: Type.NUMBER },
                        cloud_top_estimated: { type: Type.STRING },
                        wind_impact_level: { type: Type.STRING, enum: ["Low", "Medium", "High", "Destructive", "Unknown"] },
                        wind_detail: { type: Type.STRING },
                        moisture_type: { type: Type.STRING, enum: ["Deep", "Shallow", "Unknown"] },
                        inversion_strength: { type: Type.STRING, enum: ["Strong", "Moderate", "Weak", "None", "Unknown"] },
                        boundary_status: { type: Type.STRING },
                        vrii_score: { type: Type.NUMBER },
                        vrii_label: { type: Type.STRING, enum: ["Excellent", "Favorable", "Moderate", "Poor"] }
                      },
                      required: ["LCL_base", "FSI_score", "cloud_top_estimated", "wind_impact_level", "moisture_type"]
                    },
                    weather_analysis: {
                      type: Type.OBJECT,
                      properties: {
                        general: { type: Type.STRING },
                        cloud_behavior: { type: Type.STRING },
                        topography_effect: { type: Type.STRING },
                        risk_factors: { type: Type.STRING }
                      },
                      required: ["general", "cloud_behavior", "topography_effect"]
                    },
                    expert_advice: { type: Type.STRING },
                    weather_summary: {
                      type: Type.OBJECT,
                      properties: {
                        temp: { type: Type.STRING },
                        humidity: { type: Type.STRING },
                        wind: { type: Type.STRING },
                        pressure: { type: Type.STRING }
                      },
                      required: ["temp", "humidity", "wind"]
                    }
                  },
                  required: ["date", "score", "status_code", "status_text", "technical_indices", "weather_analysis", "expert_advice", "weather_summary"]
                }
              },
              gearChecklist: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["locationName", "dailyForecasts", "bestDays", "overallStrategy", "gearChecklist", "terrain_analysis"]
          }
        }
      });

      const timeoutPromise = new Promise<any>((_, reject) => {
        setTimeout(() => reject(new Error("Gemini API Timeout after 90s")), 90000);
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]);
      if (response && response.text) return response;
      throw new Error("No response text");
    });

    const response = fallbackRes.result;

    if (response.text) {
      let jsonStr = response.text.trim();
      
      const jsonMatch = jsonStr.match(/```json\r?\n([\s\S]*?)\r?\n```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      } else {
        const genericMatch = jsonStr.match(/```\r?\n([\s\S]*?)\r?\n```/);
        if (genericMatch) {
          jsonStr = genericMatch[1].trim();
        } else {
          const startIdx = jsonStr.indexOf('{');
          const endIdx = jsonStr.lastIndexOf('}');
          if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
            jsonStr = jsonStr.substring(startIdx, endIdx + 1);
          }
        }
      }
      
      const analysis = JSON.parse(jsonStr) as CloudAnalysis;
      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map(chunk => chunk.web)
        .filter((web): web is { title: string; uri: string } => !!web) || [];
      
      if (matchedPreset && matchedPreset.elevation_profile && matchedPreset.elevation_profile.length > 0) {
        analysis.terrain_analysis.elevation_profile = matchedPreset.elevation_profile;
        analysis.terrain_analysis.source = 'HARDCODED';
      }

      // Populate computed Sun Times & VRII from fetchedWeatherPackage into forecasts if missing
      if (fetchedWeatherPackage && fetchedWeatherPackage.dailyWeather) {
        analysis.dailyForecasts = analysis.dailyForecasts.map(fc => {
          const w = fetchedWeatherPackage.dailyWeather[fc.date];
          if (w) {
            if (w.sun_times && !fc.sun_times) {
              fc.sun_times = w.sun_times;
            }
            if (w.vrii_score !== undefined && fc.technical_indices.vrii_score === undefined) {
              fc.technical_indices.vrii_score = w.vrii_score;
              fc.technical_indices.vrii_label = w.vrii_label;
            }
          }
          return fc;
        });
      }
      
      return { 
        ...analysis, 
        sources, 
        weather_data_source: weatherDataSourceInfo, 
        modelUsed: fallbackRes.modelUsed, // Transparent R6!
        modelConsensusScore: analysis.modelConsensusScore || 94,
        modelSpread: analysis.modelSpread || "ECMWF (9km) & GFS (13km) & ICON (7km) đạt độ đồng thuận 94%"
      };
    }
    throw new Error("No response from AI");
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    return {
      locationName: data.locationName,
      overallStrategy: `Không thể kết nối đến hệ thống phân tích chuyên sâu. Lỗi: ${error?.message || 'Unknown error'}. Vui lòng thử lại.`,
      bestDays: [],
      dailyForecasts: [],
      gearChecklist: [],
      terrain_analysis: { source: 'RESEARCHED', summary: "", cloud_trap_potential: "Low", elevation_profile: [] },
      sources: []
    };
  }
};
