/**
 * BẢN CHÉP NGUYÊN VĂN `cloudSea.ts` v1.0 của nhánh agy (vn-skycast/src/lib/scoring/cloudSea.ts), phiếu gd355 (19/11/2026).
 * CHỈ dùng làm cổng BÓNG chống báo nhầm (xem NHAT-KY-HIEU-CHINH.md, đăng ký trước 3788b79): KHÔNG tham gia điểm/trạng thái/đáng đi của engine.
 * Không sửa thuật toán ở đây - muốn đổi thì đó là một thí nghiệm khác. Chỉ đổi: kiểu dữ liệu chép từ `api/openMeteo.ts` để tệp tự đủ.
 */

// ---- kiểu chép từ vn-skycast/src/lib/api/openMeteo.ts (dòng 44-73) ----
export interface PressureLevelSample {
  pressureHpa: number;
  geopotentialHeightM: number | null;
  temperatureC: number | null;
  relativeHumidityPct: number | null;
  cloudCoverPct: number | null;
  windSpeedKph: number | null;
}

export interface ModelHourlySample {
  model: string;
  temperature2mC: number | null;
  relativeHumidity2mPct: number | null;
  dewPoint2mC: number | null;
  precipitationMm: number | null;
  cloudCoverPct: number | null;
  cloudCoverLowPct: number | null;
  cloudCoverMidPct: number | null;
  cloudCoverHighPct: number | null;
  visibilityM: number | null;
  windSpeed10mKph: number | null;
  windGusts10mKph: number | null;
  boundaryLayerHeightM: number | null;
  pressureLevels: PressureLevelSample[];
}

export interface MultiModelHour {
  time: string;
  models: Record<string, ModelHourlySample>;
}
// ---- hết kiểu chép ----

export type CloudSeaVerdict = 'co' | 'co_the' | 'khong' | 'chua_co_du_lieu';

export interface CloudSeaDetails {
  dinhMayUocTinhM: number | null;
  chenhCaoDinhMayM: number | null;
  nghichNhietDoC: number | null;
  biMuTaiDinh: boolean;
  doDongThuan: number | null; // 0..1
  soMoHinhHopLe: number;
  soMoHinhTong: number;
}

export interface CloudSeaResult {
  ketLuan: CloudSeaVerdict;
  xacSuat?: number; // 0..100; undefined khi ketLuan === 'chua_co_du_lieu'
  lyDo: string[];
  chiTiet?: CloudSeaDetails;
}

export interface CloudSeaSpotContext {
  elevationM: number;
  valleyElevationM?: number | null;
  modelElevationM?: number | null;
}

export const CLOUD_SEA_ALGORITHM_VERSION = 'v1.0';

export const MODEL_WEIGHTS: Readonly<Record<string, number>> = {
  ecmwf_ifs025: 0.35,
  icon_seamless: 0.25,
  jma_seamless: 0.2,
  gfs_seamless: 0.2,
};

export const DAWN_HOURS_VN = ['04:00', '05:00', '06:00', '07:00'] as const;

interface ValidLevel {
  pressureHpa: number;
  zM: number;
  rhPct: number;
  ccPct: number | null;
  tempC: number | null;
  windKph: number | null;
}

interface PerModelEval {
  model: string;
  weight: number;
  score: number;
  verdict: Exclude<CloudSeaVerdict, 'chua_co_du_lieu'>;
  belowSignal: number;
  clearScore: number;
  biMuTaiDinh: boolean;
  rainVeto: boolean;
  windVeto: boolean;
  dinhMayUocTinhM: number | null;
  chenhCaoDinhMayM: number | null;
  nghichNhietDoC: number | null;
  rhObs: number;
  precipMm: number | null;
  windEffKph: number | null;
}

function clamp(v: number, min: number, max: number): number {
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function extractValidLevels(levels: readonly PressureLevelSample[]): ValidLevel[] {
  const out: ValidLevel[] = [];
  for (const lv of levels) {
    if (
      typeof lv.geopotentialHeightM === 'number' &&
      Number.isFinite(lv.geopotentialHeightM) &&
      typeof lv.relativeHumidityPct === 'number' &&
      Number.isFinite(lv.relativeHumidityPct)
    ) {
      out.push({
        pressureHpa: lv.pressureHpa,
        zM: lv.geopotentialHeightM,
        rhPct: lv.relativeHumidityPct,
        ccPct:
          typeof lv.cloudCoverPct === 'number' && Number.isFinite(lv.cloudCoverPct)
            ? lv.cloudCoverPct
            : null,
        tempC:
          typeof lv.temperatureC === 'number' && Number.isFinite(lv.temperatureC)
            ? lv.temperatureC
            : null,
        windKph:
          typeof lv.windSpeedKph === 'number' && Number.isFinite(lv.windSpeedKph)
            ? lv.windSpeedKph
            : null,
      });
    }
  }
  out.sort((a, b) => a.zM - b.zM);
  return out;
}

function interpolateSeries(points: readonly { z: number; v: number }[], targetZ: number): number | null {
  if (points.length === 0) return null;
  if (points.length === 1) return points[0]!.v;
  if (targetZ <= points[0]!.z) return points[0]!.v;
  const last = points[points.length - 1]!;
  if (targetZ >= last.z) return last.v;

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    if (targetZ >= a.z && targetZ <= b.z) {
      const dz = b.z - a.z;
      if (dz <= 0) return a.v;
      const frac = (targetZ - a.z) / dz;
      return a.v + frac * (b.v - a.v);
    }
  }
  return last.v;
}

function computeLayerCloudSignal(rh: number, cc: number | null): number {
  const cRh = clamp((rh - 76) / 18, 0, 1);
  if (cc === null) return cRh;
  const cCc = clamp((cc - 20) / 60, 0, 1);
  return Math.max(cRh, 0.85 * cCc);
}

function evaluateSingleModel(
  sample: ModelHourlySample,
  elevationM: number,
  valleyElevationM: number,
  reliefM: number,
  modelElevationM: number | null,
): PerModelEval | null {
  const validLevels = extractValidLevels(sample.pressureLevels);
  if (validLevels.length < 2) {
    return null;
  }

  const rhPoints = validLevels.map((lv) => ({ z: lv.zM, v: lv.rhPct }));
  const ccPoints = validLevels
    .filter((lv) => lv.ccPct !== null)
    .map((lv) => ({ z: lv.zM, v: lv.ccPct! }));
  const tempPoints = validLevels
    .filter((lv) => lv.tempC !== null)
    .map((lv) => ({ z: lv.zM, v: lv.tempC! }));
  const windPoints = validLevels
    .filter((lv) => lv.windKph !== null)
    .map((lv) => ({ z: lv.zM, v: lv.windKph! }));

  const interpRh = (z: number): number => interpolateSeries(rhPoints, z)!;
  const interpCc = (z: number): number | null => interpolateSeries(ccPoints, z);
  const interpWind = (z: number): number | null => interpolateSeries(windPoints, z);

  // 1. Quét lưới dọc 50m từ valleyElevationM tới zScanMax
  const zScanMax = Math.max(elevationM + 800, 3600);
  const stepM = 50;
  const gridZ: number[] = [];
  const gridC: number[] = [];
  const gridRh: number[] = [];

  for (let z = valleyElevationM; z <= zScanMax; z += stepM) {
    const rh = interpRh(z);
    const cc = interpCc(z);
    gridZ.push(z);
    gridRh.push(rh);
    gridC.push(computeLayerCloudSignal(rh, cc));
  }
  if (gridZ.length === 0 || gridZ[gridZ.length - 1]! < zScanMax) {
    const rh = interpRh(zScanMax);
    const cc = interpCc(zScanMax);
    gridZ.push(zScanMax);
    gridRh.push(rh);
    gridC.push(computeLayerCloudSignal(rh, cc));
  }

  // Trụ cột 1: Lớp ẩm / mây nằm DƯỚI cao độ chỗ đứng
  const belowTopZ = Math.max(valleyElevationM, elevationM - 100);
  let cBelowMax = 0;
  let rhBelowMax = 0;
  for (let i = 0; i < gridZ.length; i++) {
    if (gridZ[i]! <= belowTopZ) {
      if (gridC[i]! > cBelowMax) cBelowMax = gridC[i]!;
      if (gridRh[i]! > rhBelowMax) rhBelowMax = gridRh[i]!;
    }
  }
  // Bổ sung điểm biên belowTopZ chính xác
  {
    const rhEnd = interpRh(belowTopZ);
    const ccEnd = interpCc(belowTopZ);
    const cEnd = computeLayerCloudSignal(rhEnd, ccEnd);
    if (cEnd > cBelowMax) cBelowMax = cEnd;
    if (rhEnd > rhBelowMax) rhBelowMax = rhEnd;
  }

  const cLow =
    sample.cloudCoverLowPct !== null ? clamp((sample.cloudCoverLowPct - 15) / 65, 0, 1) : 0;
  const maxLowRh =
    sample.relativeHumidity2mPct !== null
      ? Math.max(rhBelowMax, sample.relativeHumidity2mPct)
      : rhBelowMax;
  const mLowRh = clamp((maxLowRh - 70) / 22, 0, 1);
  const belowSignal = Math.max(cBelowMax, 0.75 * cLow * mLowRh);

  // Ước tính trần mây thấp dinhMayUocTinhM
  const cloudThreshold = 0.35;
  let firstCloudIdx = -1;
  for (let i = 0; i < gridZ.length; i++) {
    if (gridZ[i]! > elevationM + 500) break;
    if (gridC[i]! >= cloudThreshold) {
      firstCloudIdx = i;
      break;
    }
  }

  let dinhMayUocTinhM: number | null = null;
  if (firstCloudIdx !== -1) {
    let exitIdx = -1;
    for (let i = firstCloudIdx + 1; i < gridZ.length; i++) {
      if (gridC[i]! < cloudThreshold) {
        exitIdx = i;
        break;
      }
    }
    if (exitIdx === -1) {
      dinhMayUocTinhM = zScanMax;
    } else {
      const z0 = gridZ[exitIdx - 1]!;
      const z1 = gridZ[exitIdx]!;
      const c0 = gridC[exitIdx - 1]!;
      const c1 = gridC[exitIdx]!;
      const denom = c0 - c1;
      const frac = denom > 0 ? clamp((c0 - cloudThreshold) / denom, 0, 1) : 0.5;
      dinhMayUocTinhM = Math.round(z0 + frac * (z1 - z0));
    }
  }

  const chenhCaoDinhMayM =
    dinhMayUocTinhM !== null ? Math.round(elevationM - dinhMayUocTinhM) : null;

  // Trụ cột 2: Kiểm tra chỗ đứng có bị mù / đứng trong mây không
  const rhObs = interpRh(elevationM);
  const ccObs = interpCc(elevationM);

  const biMuTaiDinh =
    (rhObs >= 92 && (ccObs === null || ccObs >= 50)) ||
    (ccObs !== null && ccObs >= 75 && rhObs >= 85) ||
    (dinhMayUocTinhM !== null &&
      chenhCaoDinhMayM !== null &&
      chenhCaoDinhMayM <= -100 &&
      rhObs >= 85) ||
    (sample.visibilityM !== null &&
      sample.visibilityM < 800 &&
      modelElevationM !== null &&
      Math.abs(elevationM - modelElevationM) <= 300 &&
      rhObs >= 88);

  const sRh = clamp((94 - rhObs) / 22, 0, 1);
  const sCc = ccObs !== null ? clamp((80 - ccObs) / 60, 0, 1) : null;
  const sPeak = sCc !== null ? Math.min(sRh, sCc) : sRh;

  let clearScore: number;
  if (dinhMayUocTinhM !== null && chenhCaoDinhMayM !== null) {
    const sMargin = clamp((chenhCaoDinhMayM + 150) / 400, 0, 1);
    clearScore = 0.6 * sPeak + 0.4 * sMargin;
  } else {
    clearScore = sPeak;
  }

  const midCloudFactor =
    sample.cloudCoverMidPct !== null && sample.cloudCoverMidPct >= 85 ? 0.88 : 1.0;

  // Trụ cột 3: Ổn định tầng khí quyển & nghịch nhiệt
  let nghichNhietDoC: number | null = null;
  let minLapseRate: number | null = null;
  if (tempPoints.length >= 2) {
    const candidatePairs: { dt: number; lapse: number; midDist: number }[] = [];
    const allPairs: { dt: number; lapse: number; midDist: number }[] = [];
    for (let i = 0; i < tempPoints.length - 1; i++) {
      const a = tempPoints[i]!;
      const b = tempPoints[i + 1]!;
      const dz = b.z - a.z;
      if (dz <= 10) continue;
      const dt = b.v - a.v;
      const lapse = -(dt / (dz / 1000));
      const mid = (a.z + b.z) / 2;
      const pair = { dt, lapse, midDist: Math.abs(mid - elevationM) };
      allPairs.push(pair);
      if (mid >= valleyElevationM - 200 && mid <= elevationM + 600) {
        candidatePairs.push(pair);
      }
    }
    const chosen =
      candidatePairs.length > 0
        ? candidatePairs
        : allPairs.length > 0
          ? [allPairs.reduce((best, cur) => (cur.midDist < best.midDist ? cur : best))]
          : [];
    if (chosen.length > 0) {
      nghichNhietDoC = round1(Math.max(...chosen.map((p) => p.dt)));
      minLapseRate = Math.min(...chosen.map((p) => p.lapse));
    }
  }

  let stabilityScore = 0.55;
  if (minLapseRate !== null) {
    if (minLapseRate <= 0) {
      stabilityScore = 1.0;
    } else if (minLapseRate <= 5.5) {
      stabilityScore = 1.0 - (minLapseRate / 5.5) * 0.55;
    } else if (minLapseRate <= 8.0) {
      stabilityScore = 0.45 - ((minLapseRate - 5.5) / 2.5) * 0.3;
    } else {
      stabilityScore = 0.15;
    }
  }
  const stabMod = 0.72 + 0.28 * stabilityScore;

  // Trụ cột 4: Mưa, gió mạnh, độ chênh cao địa hình
  const precip = sample.precipitationMm;
  let rainFactor = 1.0;
  let rainVeto = false;
  if (precip !== null) {
    if (precip > 1.5) {
      rainFactor = 0.0;
      rainVeto = true;
    } else if (precip > 0.5) {
      rainFactor = 0.35;
    } else if (precip > 0.1) {
      rainFactor = 0.75;
    }
  }

  const windCandidates: number[] = [];
  const windObs = interpWind(elevationM);
  if (windObs !== null) windCandidates.push(windObs);
  if (sample.windSpeed10mKph !== null) windCandidates.push(sample.windSpeed10mKph);
  if (sample.windGusts10mKph !== null && sample.windGusts10mKph > 50) {
    windCandidates.push(0.8 * sample.windGusts10mKph);
  }
  const windEffKph = windCandidates.length > 0 ? Math.max(...windCandidates) : null;

  let windFactor = 1.0;
  let windVeto = false;
  if (windEffKph !== null) {
    if (windEffKph > 40) {
      windFactor = 0.15;
      windVeto = true;
    } else if (windEffKph > 25) {
      windFactor = 0.8 - ((windEffKph - 25) / 15) * 0.45;
    } else if (windEffKph > 15) {
      windFactor = 1.0 - ((windEffKph - 15) / 10) * 0.2;
    }
  }

  let reliefFactor = 1.0;
  if (reliefM < 150) {
    reliefFactor = 0.4;
  } else if (reliefM < 250) {
    reliefFactor = 0.7 + ((reliefM - 150) / 100) * 0.3;
  }

  // Điểm từng mô hình
  const core = Math.pow(belowSignal, 0.65) * Math.pow(clearScore, 0.85);
  let score = clamp(
    100 * core * stabMod * rainFactor * windFactor * reliefFactor * midCloudFactor,
    0,
    100,
  );
  if (belowSignal < 0.25) {
    score = Math.min(score, 25);
  }
  if (biMuTaiDinh) {
    score = Math.min(score, 20);
  }

  let verdict: Exclude<CloudSeaVerdict, 'chua_co_du_lieu'>;
  if (score >= 55 && !biMuTaiDinh && !rainVeto && !windVeto && reliefM >= 150) {
    verdict = 'co';
  } else if (score >= 35 && !biMuTaiDinh && !rainVeto) {
    verdict = 'co_the';
  } else {
    verdict = 'khong';
  }

  return {
    model: sample.model,
    weight: MODEL_WEIGHTS[sample.model] ?? 0.2,
    score,
    verdict,
    belowSignal,
    clearScore,
    biMuTaiDinh,
    rainVeto,
    windVeto,
    dinhMayUocTinhM,
    chenhCaoDinhMayM,
    nghichNhietDoC,
    rhObs,
    precipMm: precip,
    windEffKph,
  };
}

function weightedAverage(items: readonly { val: number; w: number }[]): number | null {
  if (items.length === 0) return null;
  let wSum = 0;
  let vSum = 0;
  for (const it of items) {
    wSum += it.w;
    vSum += it.val * it.w;
  }
  return wSum > 0 ? vSum / wSum : null;
}

/**
 * Đánh giá khả năng có biển mây cho 1 giờ cụ thể từ dự báo đa mô hình.
 */
export function evaluateCloudSeaHour(
  hour: MultiModelHour | null | undefined,
  context: CloudSeaSpotContext,
): CloudSeaResult {
  if (!hour || !hour.models || !Number.isFinite(context.elevationM)) {
    return {
      ketLuan: 'chua_co_du_lieu',
      xacSuat: undefined,
      lyDo: ['Thiếu dữ liệu dự báo đầu vào cho khung giờ này'],
      chiTiet: {
        dinhMayUocTinhM: null,
        chenhCaoDinhMayM: null,
        nghichNhietDoC: null,
        biMuTaiDinh: false,
        doDongThuan: null,
        soMoHinhHopLe: 0,
        soMoHinhTong: 0,
      },
    };
  }

  const elevationM = context.elevationM;
  const hasExplicitValley =
    typeof context.valleyElevationM === 'number' &&
    Number.isFinite(context.valleyElevationM) &&
    context.valleyElevationM < elevationM;
  const valleyElevationM = hasExplicitValley
    ? context.valleyElevationM!
    : Math.max(0, elevationM - 500);
  const reliefM = Math.max(0, elevationM - valleyElevationM);
  const modelElevationM =
    typeof context.modelElevationM === 'number' && Number.isFinite(context.modelElevationM)
      ? context.modelElevationM
      : null;

  const modelEntries = Object.values(hour.models);
  const totalModels = modelEntries.length;

  const evals: PerModelEval[] = [];
  for (const sample of modelEntries) {
    const res = evaluateSingleModel(sample, elevationM, valleyElevationM, reliefM, modelElevationM);
    if (res !== null) {
      evals.push(res);
    }
  }

  if (evals.length === 0) {
    return {
      ketLuan: 'chua_co_du_lieu',
      xacSuat: undefined,
      lyDo: ['Không có mô hình thời tiết nào đủ dữ liệu mực áp suất hợp lệ'],
      chiTiet: {
        dinhMayUocTinhM: null,
        chenhCaoDinhMayM: null,
        nghichNhietDoC: null,
        biMuTaiDinh: false,
        doDongThuan: null,
        soMoHinhHopLe: 0,
        soMoHinhTong: totalModels,
      },
    };
  }

  // Chuẩn hóa trọng số trên tập mô hình hợp lệ
  const weightSum = evals.reduce((s, e) => s + e.weight, 0);
  const normEvals = evals.map((e) => ({ ...e, normW: e.weight / weightSum }));

  const meanP = normEvals.reduce((s, e) => s + e.normW * e.score, 0);
  const variance = normEvals.reduce((s, e) => s + e.normW * Math.pow(e.score - meanP, 2), 0);
  const sigmaP = Math.sqrt(variance);

  const doDongThuan =
    normEvals.length === 1 ? 0.5 : round2(clamp(1 - sigmaP / 35, 0, 1));

  const pFinal =
    normEvals.length >= 2 && doDongThuan < 0.45
      ? Math.round(meanP * (0.75 + 0.25 * (doDongThuan / 0.45)))
      : Math.round(meanP);

  const fCo = normEvals.filter((e) => e.verdict === 'co').reduce((s, e) => s + e.normW, 0);
  const fFog = normEvals.filter((e) => e.biMuTaiDinh).reduce((s, e) => s + e.normW, 0);
  const fRain = normEvals.filter((e) => e.rainVeto).reduce((s, e) => s + e.normW, 0);
  const fWind = normEvals.filter((e) => e.windVeto).reduce((s, e) => s + e.normW, 0);

  const biMuTaiDinh = fFog >= 0.5;
  const avgBelow = normEvals.reduce((s, e) => s + e.normW * e.belowSignal, 0);

  const avgCloudTop = weightedAverage(
    normEvals
      .filter((e) => e.dinhMayUocTinhM !== null)
      .map((e) => ({ val: e.dinhMayUocTinhM!, w: e.normW })),
  );
  const dinhMayUocTinhM = avgCloudTop !== null ? Math.round(avgCloudTop) : null;
  const chenhCaoDinhMayM =
    dinhMayUocTinhM !== null ? Math.round(elevationM - dinhMayUocTinhM) : null;

  const avgInv = weightedAverage(
    normEvals
      .filter((e) => e.nghichNhietDoC !== null)
      .map((e) => ({ val: e.nghichNhietDoC!, w: e.normW })),
  );
  const nghichNhietDoC = avgInv !== null ? round1(avgInv) : null;

  // Phán quyết cuối theo bảng ngưỡng đã chốt
  let ketLuan: Exclude<CloudSeaVerdict, 'chua_co_du_lieu'>;
  if (biMuTaiDinh || fRain >= 0.5) {
    ketLuan = 'khong';
  } else if (reliefM < 150) {
    ketLuan = pFinal >= 35 ? 'co_the' : 'khong';
  } else if (
    pFinal >= 55 &&
    (normEvals.length === 1 || (fCo >= 0.45 && doDongThuan >= 0.4))
  ) {
    ketLuan = 'co';
  } else if (pFinal >= 35) {
    ketLuan = 'co_the';
  } else {
    ketLuan = 'khong';
  }

  // Tổng hợp lý do vật lý minh bạch
  const lyDo: string[] = [];
  if (fRain >= 0.5) {
    lyDo.push('Có mưa lớn phá vỡ biển mây và che tầm nhìn');
  }
  if (biMuTaiDinh) {
    lyDo.push('Chỗ đứng có nguy cơ cao chìm trong mây/sương mù (ẩm bão hòa tại mực đỉnh)');
  }
  if (fWind >= 0.5) {
    lyDo.push('Gió tầng mây/đỉnh mạnh (>40 km/h) làm tan và xé lớp mây');
  }
  if (reliefM < 150) {
    lyDo.push(`Độ chênh cao địa hình thấp (${Math.round(reliefM)} m < 150 m)`);
  }
  if (avgBelow < 0.25 && !biMuTaiDinh && fRain < 0.5) {
    lyDo.push('Tầng thấp dưới thung lũng khô thoáng, thiếu lớp ẩm tạo biển mây');
  } else if (dinhMayUocTinhM !== null && chenhCaoDinhMayM !== null && !biMuTaiDinh) {
    if (chenhCaoDinhMayM >= 150) {
      lyDo.push(
        `Lớp mây thấp nằm dưới chỗ đứng khoảng ${chenhCaoDinhMayM} m (trần mây ~${dinhMayUocTinhM} m ASL)`,
      );
    } else if (chenhCaoDinhMayM >= 0) {
      lyDo.push(
        `Trần mây ước tính ~${dinhMayUocTinhM} m ASL, khá sát cao độ chỗ đứng (+${chenhCaoDinhMayM} m)`,
      );
    } else {
      lyDo.push(
        `Trần mây ước tính ~${dinhMayUocTinhM} m ASL vượt cao độ chỗ đứng (${chenhCaoDinhMayM} m)`,
      );
    }
  }
  if (nghichNhietDoC !== null && nghichNhietDoC > 0) {
    lyDo.push(`Có lớp nghịch nhiệt giữ nắp mây (+${nghichNhietDoC}°C)`);
  }
  if (normEvals.length >= 2 && doDongThuan < 0.45) {
    lyDo.push(
      `Các mô hình thời tiết bất đồng đáng kể (độ đồng thuận ${Math.round(doDongThuan * 100)}%)`,
    );
  } else if (normEvals.length === 1) {
    lyDo.push('Chỉ có 1 mô hình hợp lệ, chưa thể đối chiếu chéo đa mô hình');
  }
  if (!hasExplicitValley) {
    lyDo.push(
      `Ước lượng tạm cao độ đáy thung lũng (${Math.round(valleyElevationM)} m ASL) do thiếu dữ liệu địa hình`,
    );
  }
  if (lyDo.length === 0) {
    lyDo.push(
      ketLuan === 'co'
        ? 'Điều kiện tầng ẩm dưới thung lũng và độ quang đỉnh thuận lợi cho biển mây'
        : 'Tín hiệu biển mây ở mức trung bình, cần theo dõi thêm sát giờ',
    );
  }

  return {
    ketLuan,
    xacSuat: pFinal,
    lyDo,
    chiTiet: {
      dinhMayUocTinhM,
      chenhCaoDinhMayM,
      nghichNhietDoC,
      biMuTaiDinh,
      doDongThuan,
      soMoHinhHopLe: normEvals.length,
      soMoHinhTong: totalModels,
    },
  };
}

/**
 * Lọc các giờ rạng sáng (`04:00, 05:00, 06:00, 07:00`) cho một ngày `YYYY-MM-DD`.
 */
export function selectDawnHoursForDate(
  hours: readonly MultiModelHour[],
  dateIso: string,
): MultiModelHour[] {
  const targets = new Set<string>(DAWN_HOURS_VN.map((hhmm) => `${dateIso}T${hhmm}`));
  return hours.filter((h) => targets.has(h.time.slice(0, 16)));
}

/**
 * Đánh giá tổng hợp cửa sổ rạng sáng (04:00–07:00 giờ VN) cho câu hỏi:
 * "Sáng mai ở điểm X có đáng đi săn biển mây không?"
 */
export function evaluateCloudSeaDawn(
  dawnHours: readonly MultiModelHour[],
  context: CloudSeaSpotContext,
): CloudSeaResult {
  if (dawnHours.length === 0) {
    return {
      ketLuan: 'chua_co_du_lieu',
      xacSuat: undefined,
      lyDo: ['Không có dữ liệu dự báo cho khung giờ rạng sáng (04:00–07:00)'],
      chiTiet: {
        dinhMayUocTinhM: null,
        chenhCaoDinhMayM: null,
        nghichNhietDoC: null,
        biMuTaiDinh: false,
        doDongThuan: null,
        soMoHinhHopLe: 0,
        soMoHinhTong: 0,
      },
    };
  }

  const evaluated = dawnHours.map((h) => ({
    time: h.time,
    res: evaluateCloudSeaHour(h, context),
  }));

  const valid = evaluated.filter(
    (e) => e.res.ketLuan !== 'chua_co_du_lieu' && typeof e.res.xacSuat === 'number',
  );

  if (valid.length === 0) {
    const first = evaluated[0]!.res;
    return {
      ketLuan: 'chua_co_du_lieu',
      xacSuat: undefined,
      lyDo: first.lyDo,
      chiTiet: first.chiTiet,
    };
  }

  const nonFogged = valid.filter((e) => !e.res.chiTiet?.biMuTaiDinh);
  const allFogged = nonFogged.length === 0;
  const pool = allFogged ? valid : nonFogged;

  const sorted = [...pool].sort((a, b) => (b.res.xacSuat ?? 0) - (a.res.xacSuat ?? 0));
  const top1 = sorted[0]!;
  const top2 = sorted[1];

  const dawnScore =
    top2 !== undefined
      ? 0.65 * (top1.res.xacSuat ?? 0) + 0.35 * (top2.res.xacSuat ?? 0)
      : (top1.res.xacSuat ?? 0);
  const xacSuat = Math.round(dawnScore);

  const hasCo = nonFogged.some((e) => e.res.ketLuan === 'co');
  const hasCoOrCoThe = nonFogged.some(
    (e) => e.res.ketLuan === 'co' || e.res.ketLuan === 'co_the',
  );

  let ketLuan: Exclude<CloudSeaVerdict, 'chua_co_du_lieu'>;
  if (allFogged) {
    ketLuan = 'khong';
  } else if (hasCo && dawnScore >= 52) {
    ketLuan = 'co';
  } else if (hasCoOrCoThe && dawnScore >= 35) {
    ketLuan = 'co_the';
  } else {
    ketLuan = 'khong';
  }

  const bestHhmm = top1.time.length >= 16 ? top1.time.slice(11, 16) : top1.time;
  const lyDo = [`Khung giờ tốt nhất rạng sáng: ${bestHhmm}`, ...top1.res.lyDo];

  return {
    ketLuan,
    xacSuat,
    lyDo,
    chiTiet: top1.res.chiTiet,
  };
}

/**
 * Quy ước ánh xạ nhị phân chính thức (đã chốt trong `nghien-cuu/GIA-THUYET.md` trước khi chấm).
 */
export function isWorthGoingCloudSea(result: CloudSeaResult): boolean | null {
  if (result.ketLuan === 'chua_co_du_lieu') return null;
  return result.ketLuan === 'co';
}
