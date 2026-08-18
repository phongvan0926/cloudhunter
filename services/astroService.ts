/**
 * astroService — thiên văn cho nhiếp ảnh đêm/bình minh, tính HOÀN TOÀN cục bộ (suncalc).
 * Không gọi mạng, deterministic → test được. Mọi giờ hiển thị theo Asia/Ho_Chi_Minh.
 */
import * as SunCalc from 'suncalc';

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
  const illum = SunCalc.getMoonIllumination(dawnRef);
  const pos = SunCalc.getMoonPosition(dawnRef, lat, lon);
  const times = SunCalc.getMoonTimes(dawnRef, lat, lon); // rise/set trong ngày (giờ địa phương máy — chỉ dùng để hiển thị HH:MM VN)
  const sun = SunCalc.getTimes(dawnRef, lat, lon);

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
