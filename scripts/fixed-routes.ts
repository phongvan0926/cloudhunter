/** Bộ tuyến cố định dùng chung cho snapshot-routes.ts (chụp hằng tối) và climate-monthly.ts (khí hậu theo tháng). */
import type { LatLon, Vehicle } from '../services/routeService';

/** Nơi xuất phát: trung tâm thành phố (xấp xỉ, node place=city của OSM). Chỉ là gốc tuyến, không phải điểm dự báo. */
export const ORIGINS: Record<string, { name: string } & LatLon> = {
  HN: { name: 'Hà Nội (Hồ Gươm)', lat: 21.0285, lon: 105.8542 },
  YB: { name: 'Yên Bái (TP)', lat: 21.7229, lon: 104.9113 },
  HUE: { name: 'Huế (TP)', lat: 16.4637, lon: 107.5909 },
  // Thêm 19/11/2026 (gcc29 vòng 3): node OSM place=city "Sa Pa" (qua Photon), để ghép nhãn FB đèo Ô Quy Hồ.
  SAPA: { name: 'Sa Pa (TT)', lat: 22.3334, lon: 103.8427 },
};
/** Bộ tuyến cố định: đổi bộ này thì các ngày trước và sau không còn so được với nhau, nên chỉ THÊM, đừng sửa. */
export const ROUTES: { id: string; from: keyof typeof ORIGINS; to: string; vehicle: Vehicle }[] = [
  { id: 'HN-TA_XUA-moto', from: 'HN', to: 'TA_XUA_SON_LA', vehicle: 'motorbike' },
  { id: 'HN-PU_LUONG-moto', from: 'HN', to: 'PU_LUONG', vehicle: 'motorbike' },
  { id: 'HN-HANG_KIA-moto', from: 'HN', to: 'HANG_KIA_PA_CO', vehicle: 'motorbike' },
  { id: 'YB-PHINH_HO-moto', from: 'YB', to: 'PHINH_HO', vehicle: 'motorbike' },
  { id: 'HN-BA_VI-moto', from: 'HN', to: 'BA_VI', vehicle: 'motorbike' },
  { id: 'HN-SAPA-car', from: 'HN', to: 'SAPA_HAM_RONG', vehicle: 'car' },
  { id: 'HUE-BACH_MA-car', from: 'HUE', to: 'BACH_MA', vehicle: 'car' },
  // Thêm 19/11/2026: QL4D Sa Pa -> đèo Ô Quy Hồ, có nhãn FB hằng ngày (Ô Quy Hồ / Cầu Kính Rồng Mây) để chấm.
  { id: 'SAPA-O_QUY_HO-moto', from: 'SAPA', to: 'DEO_O_QUY_HO', vehicle: 'motorbike' },
];
