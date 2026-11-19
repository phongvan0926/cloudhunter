/**
 * Cờ cổng agy (phiếu g2448). `data/agy-gate-flag.json` do vòng tự động hoặc người sửa; MẶC ĐỊNH TẮT.
 * Bật: `worthGoing` hiển thị chỉ bị HẠ (không bao giờ nâng) khi cổng nói `khong`. `chua_co_du_lieu`, lỗi, thiếu cột = không chặn.
 */
import flag from '../data/agy-gate-flag.json';
import type { AgyGateColumn } from './agyGate';

export const AGY_GATE_ENABLED: boolean = flag.enabled === true;

export function gatedWorth(base: boolean, gate: AgyGateColumn | undefined | null, enabled: boolean): boolean {
  if (!enabled || !base) return base;
  return !(gate && 'ketLuan' in gate && gate.ketLuan === 'khong');
}
