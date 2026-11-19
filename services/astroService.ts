/**
 * astroService — thiên văn cho nhiếp ảnh đêm/bình minh, tính HOÀN TOÀN cục bộ (astronomy-engine, MIT).
 * Không gọi mạng, deterministic → test được. Mọi giờ hiển thị theo Asia/Ho_Chi_Minh.
 *
 * Đổi từ suncalc sang astronomy-engine 19/11/2026 (phiếu g95c6, đăng ký trước trong NHAT-KY-HIEU-CHINH.md): so với USNO
 * (48 điểm-ngày, 4 điểm x ngày 5 mỗi tháng 12/2026-11/2027), cách gọi suncalc cũ cho giờ trăng lặn lệch trung vị 52 phút
 * (48/48 lần, vì getMoonTimes tìm trong cửa sổ 24h theo nửa đêm UTC/múi giờ máy nên ra sự kiện của ngày khác), trăng mọc lệch
 * > 3 phút 16/48 lần (tới 63 phút); astronomy-engine lệch <= 1 phút mọi sự kiện. Mọi sự kiện tìm trong đúng ngày lịch VN.
 * Tệp này được AnalysisResult tải lười (import động) (chunk riêng 25,7 KB gzip).
 */
import { Body, Equator, Horizon, Illumination, MoonPhase, Observer, SearchAltitude, SearchRiseSet, type AstroTime } from 'astronomy-engine';

export interface MoonInfo {
  illumination: number;        // 0-100 % đĩa trăng được chiếu sáng
  phaseLabel: string;          // tên pha tiếng Việt
  phaseEmoji: string;
  moonrise: string | null;     // HH:MM giờ VN (null = không mọc/lặn trong ngày đó)
  moonset: string | null;
  astroDawn: string | null;    // bình minh thiên văn (bắt đầu thấy được chân trời)
  moonUpAtDawn: boolean;       // trăng còn trên trời trong khung săn mây 4-6h?
  milkyWayWindow: boolean;     // trời đủ tối cho Milky Way trước bình minh (trăng lặn/tối)
  note: string;                // 1 câu tư vấn nhiếp ảnh
}

const VN_TZ = 'Asia/Ho_Chi_Minh';

function fmtVN(d: Date | null | undefined): string | null {
  if (!d || Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: VN_TZ, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d);
}

/** Sự kiện trong đúng ngày lịch VN [00:00, 24:00), không thì null. */
function inVnDay(t: AstroTime | null, dayStartMs: number): Date | null {
  if (!t) return null;
  const ms = t.date.getTime();
  return ms >= dayStartMs && ms < dayStartMs + 86_400_000 ? t.date : null;
}

function phaseName(phase: number): { label: string; emoji: string } {
  // phase 0=trăng non, 0.25=thượng huyền, 0.5=trăng tròn, 0.75=hạ huyền
  if (phase < 0.03 || phase > 0.97) return { label: 'Trăng non', emoji: '🌑' };
  if (phase < 0.22) return { label: 'Trăng lưỡi liềm đầu tháng', emoji: '🌒' };
  if (phase < 0.28) return { label: 'Thượng huyền', emoji: '🌓' };
  if (phase < 0.47) return { label: 'Trăng khuyết đầu tháng', emoji: '🌔' };
  if (phase < 0.53) return { label: 'Trăng tròn', emoji: '🌕' };
  if (phase < 0.72) return { label: 'Trăng khuyết cuối tháng', emoji: '🌖' };
  if (phase < 0.78) return { label: 'Hạ huyền', emoji: '🌗' };
  return { label: 'Trăng lưỡi liềm cuối tháng', emoji: '🌘' };
}

/**
 * Thông tin trăng cho RẠNG SÁNG của ngày dateStr (YYYY-MM-DD) tại (lat, lon).
 * Mốc tham chiếu: 05:00 giờ VN của ngày đó — giữa khung săn mây 4-6h.
 */
export function moonInfoForDawn(dateStr: string, lat: number, lon: number): MoonInfo {
  // 05:00 VN = 22:00 UTC hôm trước
  const dawnRef = new Date(`${dateStr}T05:00:00+07:00`);
  const dayStart = new Date(`${dateStr}T00:00:00+07:00`);
  const dayStartMs = dayStart.getTime();
  const obs = new Observer(lat, lon, 0);
  const illum = { fraction: Illumination(Body.Moon, dawnRef).phase_fraction, phase: (((MoonPhase(dawnRef) % 360) + 360) % 360) / 360 };
  const eq = Equator(Body.Moon, dawnRef, obs, true, true);
  const pos = { altitude: Horizon(dawnRef, obs, eq.ra, eq.dec, 'normal').altitude };
  const times = {
    rise: inVnDay(SearchRiseSet(Body.Moon, obs, +1, dayStart, 1), dayStartMs),
    set: inVnDay(SearchRiseSet(Body.Moon, obs, -1, dayStart, 1), dayStartMs),
  };
  const sun = { nightEnd: inVnDay(SearchAltitude(Body.Sun, obs, +1, dayStart, 1, -18), dayStartMs) };

  const illumination = Math.round(illum.fraction * 100);
  const { label, emoji } = phaseName(illum.phase);
  const moonUpAtDawn = pos.altitude > 0;
  // Milky Way cần trời tối thật: trăng dưới chân trời HOẶC rất mỏng (<25%) lúc rạng sáng
  const milkyWayWindow = !moonUpAtDawn || illumination < 25;

  let note: string;
  if (moonUpAtDawn && illumination >= 60) {
    note = `${emoji} Trăng sáng ${illumination}% còn trên trời lúc rạng sáng — biển mây dưới trăng có thể chụp phơi sáng TRƯỚC bình minh.`;
  } else if (milkyWayWindow) {
    note = `${emoji} Trời tối trước bình minh (trăng ${illumination}%${moonUpAtDawn ? '' : ', đã lặn'}) — cửa sổ chụp Milky Way/sao nếu trời quang tầng cao.`;
  } else {
    note = `${emoji} ${label} (${illumination}%).`;
  }

  return {
    illumination,
    phaseLabel: label,
    phaseEmoji: emoji,
    moonrise: fmtVN(times.rise),
    moonset: fmtVN(times.set),
    astroDawn: fmtVN(sun.nightEnd ?? null),
    moonUpAtDawn,
    milkyWayWindow,
    note,
  };
}
