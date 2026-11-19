/**
 * Cổng BÓNG của nhánh agy (phiếu gd355, đăng ký trước NHAT-KY-HIEU-CHINH.md 3788b79).
 * Đưa dữ liệu mà bản chụp xếp hạng ĐÃ tải (GFS + ICON + UKMO, 7 mực) vào `evaluateCloudSeaDawn` của agy, KHÔNG gọi thêm API.
 * Kết quả chỉ được GHI vào bản chụp (cột `agyGate`); không tham gia điểm/trạng thái/đáng đi/thứ hạng.
 * Lệch so với agy (đã đăng ký): 3 mô hình, 7 mực (thiếu 1000 và 600 hPa), không gió 10 m/giật/tầm nhìn, `modelElevationM` null.
 */
import { evaluateCloudSeaDawn, CLOUD_SEA_ALGORITHM_VERSION, type MultiModelHour, type ModelHourlySample, type PressureLevelSample } from './agyCloudSea';
import { PRESSURE_LEVELS, type HourlyBlock } from './weatherService';

export const AGY_GATE_VERSION = `agy-${CLOUD_SEA_ALGORITHM_VERSION}-shadow-1`;
/** Gió theo mực chỉ có ở các mực này (HOURLY_VARS); mực khác để null, đúng sự thật. */
const WIND_LEVELS = new Set([925, 850, 700]);
const DAWN = ['04', '05', '06', '07'] as const;

export interface AgyGateColumn {
  ver: string;
  ketLuan?: 'co' | 'co_the' | 'khong' | 'chua_co_du_lieu';
  xacSuat?: number | null;
  doDongThuan?: number | null;
  soMoHinh?: number;       // số mô hình hợp lệ của giờ tốt nhất
  soGio?: number;          // số giờ rạng sáng có dữ liệu đưa vào
  gioTot?: string | null;
  error?: string;
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Dựng các giờ 04-07h VN của ngày `date` thành MultiModelHour (chỉ giờ có trong dữ liệu). */
export function buildAgyHours(block: HourlyBlock, models: readonly string[], date: string): MultiModelHour[] {
  const out: MultiModelHour[] = [];
  block.time.forEach((t, i) => {
    if (!t.startsWith(date) || !(DAWN as readonly string[]).includes(t.slice(11, 13))) return;
    const at = (v: string, m: string) => num(block.get(v, m)?.[i]);
    const ms: Record<string, ModelHourlySample> = {};
    for (const m of models) {
      const levels: PressureLevelSample[] = PRESSURE_LEVELS.map(({ p }) => ({
        pressureHpa: p,
        geopotentialHeightM: at(`geopotential_height_${p}hPa`, m),
        temperatureC: at(`temperature_${p}hPa`, m),
        relativeHumidityPct: at(`relative_humidity_${p}hPa`, m),
        cloudCoverPct: at(`cloud_cover_${p}hPa`, m),
        windSpeedKph: WIND_LEVELS.has(p) ? at(`wind_speed_${p}hPa`, m) : null,
      }));
      ms[m] = {
        model: m,
        temperature2mC: at('temperature_2m', m), relativeHumidity2mPct: at('relative_humidity_2m', m),
        dewPoint2mC: at('dew_point_2m', m), precipitationMm: at('precipitation', m),
        cloudCoverPct: null, cloudCoverLowPct: at('cloud_cover_low', m),
        cloudCoverMidPct: at('cloud_cover_mid', m), cloudCoverHighPct: at('cloud_cover_high', m),
        visibilityM: null, windSpeed10mKph: null, windGusts10mKph: null,
        boundaryLayerHeightM: at('boundary_layer_height', m),
        pressureLevels: levels,
      };
    }
    out.push({ time: t, models: ms });
  });
  return out;
}

/** Tính cột bóng. Không bao giờ ném lỗi ra ngoài: lỗi thì ghi `error` (đăng ký: lỗi = không chặn, đếm riêng). */
export function agyGateColumn(
  block: HourlyBlock, models: readonly string[], date: string,
  ctx: { observerAlt: number; valleyElev: number },
): AgyGateColumn {
  try {
    const hours = buildAgyHours(block, models, date);
    const r = evaluateCloudSeaDawn(hours, { elevationM: ctx.observerAlt, valleyElevationM: ctx.valleyElev, modelElevationM: null });
    const best = r.lyDo[0]?.startsWith('Khung giờ tốt nhất rạng sáng: ') ? r.lyDo[0].slice(-5) : null;
    return {
      ver: AGY_GATE_VERSION, ketLuan: r.ketLuan, xacSuat: r.xacSuat ?? null,
      doDongThuan: r.chiTiet?.doDongThuan ?? null, soMoHinh: r.chiTiet?.soMoHinhHopLe ?? 0,
      soGio: hours.length, gioTot: best,
    };
  } catch (e: any) {
    return { ver: AGY_GATE_VERSION, error: String(e?.message || e).slice(0, 120) };
  }
}
