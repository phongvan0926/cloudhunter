/**
 * pwaUpdate — bản mới của app phải do NGƯỜI DÙNG bấm tải lại, không tự ý reload.
 *
 * Lỗi thật (07/09/2026, người dùng báo): bấm "Đêm nay đi đâu săn mây?" thì bảng xếp hạng hiện
 * ra rồi BIẾN MẤT, phải bấm lần hai mới có kết quả. Nguyên nhân không nằm trong bảng xếp hạng:
 * `VitePWA({ registerType: 'autoUpdate' })` sinh ra service worker `skipWaiting` + đoạn
 *
 *     wb.addEventListener('activated', e => { if (e.isUpdate) window.location.reload() })
 *
 * nên MỖI LẦN có bản deploy mới, service worker mới giành quyền rồi tự gọi `location.reload()`
 * ngay giữa lúc người dùng đang xem. Đã tái hiện bằng Playwright: sau khi giả lập deploy, biến
 * đánh dấu phiên biến mất và trang điều hướng lại 1 lần. Ngày 03/09 repo deploy 6 lần, nên
 * người dùng gặp liên tục.
 *
 * Tệ hơn "mất kết quả": kết quả hiện ra ở lần bấm đầu là do bản app CŨ tính — người dùng nhìn
 * thấy số của phiên bản cũ trong khoảnh khắc trước khi trang reload. "Lần 2 mới ra kết quả
 * thật" đúng theo nghĩa đen.
 *
 * Nay dùng `registerType: 'prompt'`: bản mới tải về rồi ĐỢI, app hiện một thanh nhỏ để người
 * dùng chọn thời điểm. Trên núi mất sóng, tự reload còn có thể làm mất luôn dự báo đang xem.
 */
import { registerSW } from 'virtual:pwa-register';

type Listener = () => void;
const listeners = new Set<Listener>();
let apply: ((reload: boolean) => Promise<void>) | null = null;
let needRefresh = false;
let offlineReady = false;

function emit() { listeners.forEach(l => l()); }

export function initPwaUpdate(): void {
  try {
    apply = registerSW({
      immediate: true,
      onNeedRefresh() { needRefresh = true; emit(); },
      onOfflineReady() { offlineReady = true; emit(); },
    });
  } catch {
    // Không có service worker (trình duyệt cũ, hoặc chạy qua http không phải localhost)
    // → app vẫn chạy bình thường, chỉ là không có cập nhật nền. Không chặn render.
  }
}

export function subscribePwa(l: Listener): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export const hasUpdate = () => needRefresh;
export const isOfflineReady = () => offlineReady;

/**
 * Người dùng bấm "Tải lại" → kích hoạt SW đang chờ rồi tải lại trang.
 *
 * KHÔNG dùng `updateSW(true)` của thư viện: nó chỉ reload khi workbox-window cho rằng đây là
 * "bản cập nhật", mà cờ đó được chốt lúc ĐĂNG KÝ — nếu trang được service worker nhận quyền
 * ngay ở lần truy cập đầu (clientsClaim) thì cờ là false suốt phiên và nút bấm KHÔNG làm gì
 * cả. Đã đo bằng Playwright: SKIP_WAITING gửi đi, `waiting` mất, `controllerchange` bắn, mà
 * trang vẫn đứng yên. Ở đây tự lo phần tải lại nên nút luôn có tác dụng.
 */
export function applyUpdate(): void {
  needRefresh = false;
  emit();
  let done = false;
  const reload = () => { if (!done) { done = true; window.location.reload(); } };
  try {
    navigator.serviceWorker?.addEventListener('controllerchange', reload, { once: true });
  } catch { /* trình duyệt không hỗ trợ SW → rơi xuống hẹn giờ bên dưới */ }
  // Không thấy đổi quyền trong 3s (không có bản chờ, SW bị chặn...) thì vẫn tải lại: người
  // dùng đã bấm, im lặng không làm gì là tệ nhất.
  setTimeout(reload, 3000);
  apply?.(false);   // false = chỉ gửi SKIP_WAITING, phần reload đã tự lo ở trên
}

/** Người dùng gạt đi — không hỏi lại trong phiên này. Bản mới vẫn nằm chờ lần mở app sau. */
export function dismissUpdate(): void {
  needRefresh = false;
  emit();
}
