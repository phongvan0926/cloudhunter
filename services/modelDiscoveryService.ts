import { GoogleGenAI } from "@google/genai";

export interface DiscoveredModel {
  id: string;             // e.g. "gemini-2.5-flash"
  name: string;           // e.g. "gemini-2.5-flash"
  displayName: string;    // e.g. "Gemini 2.5 Flash"
  description?: string;
  tier: 'flash' | 'pro' | 'experimental' | 'custom';
  tierLabel: string;      // e.g. "⚡ Nhanh / Tiết kiệm (Flash)"
  isDefaultCandidate?: boolean;
}

export function formatModelDisplayName(modelId: string, discoveredModels?: DiscoveredModel[]): { displayName: string; rawId: string; tierLabel: string } {
  const cleanId = (modelId || '').replace(/^models\//, '');
  
  // Try matching from discovered models
  if (discoveredModels && discoveredModels.length > 0) {
    const found = discoveredModels.find(m => m.id === cleanId || m.name === cleanId);
    if (found) {
      return {
        displayName: found.displayName,
        rawId: found.id,
        tierLabel: found.tierLabel
      };
    }
  }

  // Friendly name mapping for common / alias model IDs
  // Alias "-latest" do Google tự trỏ sang bản mới nhất — KHÔNG ghi số phiên bản ở đây (sẽ lỗi thời).
  const friendlyMap: Record<string, { displayName: string; tierLabel: string }> = {
    'gemini-flash-latest': { displayName: 'Gemini Flash (luôn bản mới nhất)', tierLabel: '⚡ Flash' },
    'gemini-flash-lite-latest': { displayName: 'Gemini Flash-Lite (luôn bản mới nhất)', tierLabel: '⚡ Flash-Lite' },
    'gemini-pro-latest': { displayName: 'Gemini Pro (luôn bản mới nhất)', tierLabel: '🚀 Cao cấp' },
  };

  if (friendlyMap[cleanId]) {
    return {
      displayName: friendlyMap[cleanId].displayName,
      rawId: cleanId,
      tierLabel: friendlyMap[cleanId].tierLabel
    };
  }

  // General formatting: e.g. "gemini-2.5-flash-preview-0514" -> "Gemini 2.5 Flash Preview 0514"
  const formatted = cleanId
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  let tierLabel = '🤖 AI Model';
  const t = classifyTier(cleanId);
  if (t === 'flash') tierLabel = '⚡ Flash';
  else if (t === 'pro') tierLabel = '🚀 Cao cấp';
  else if (t === 'experimental') tierLabel = '🧪 Preview';

  return {
    displayName: formatted,
    rawId: cleanId,
    tierLabel
  };
}

export type ErrorClassification = 'AUTH' | 'RETRYABLE' | 'OTHER';

const STORAGE_KEY = 'cloudhunter_selected_model';

const PREMIUM_TIER_LABEL = '🚀 Cao cấp (thường cần gói trả phí)';

// Danh sách dự phòng khi không gọi được list-models (thiếu key / lỗi mạng).
// Ưu tiên ALIAS "-latest": Google tự trỏ nó sang bản mới nhất nên danh sách này không lỗi thời
// mỗi khi có model mới. Tên số cụ thể chỉ là phương án sau (đối chiếu trang models 14/10/2026).
const FALLBACK_DEFAULT_MODELS: DiscoveredModel[] = [
  {
    id: 'gemini-flash-latest',
    name: 'gemini-flash-latest',
    displayName: 'Gemini Flash (luôn bản mới nhất)',
    description: 'Alias do Google tự cập nhật sang bản Flash mới nhất — có hạn mức miễn phí',
    tier: 'flash',
    tierLabel: '⚡ Nhanh / Tiết kiệm (Flash)',
    isDefaultCandidate: true,
  },
  {
    id: 'gemini-3.8-flash',
    name: 'gemini-3.8-flash',
    displayName: 'Gemini 3.8 Flash',
    description: 'Flash ổn định (14/10/2026) — có hạn mức miễn phí',
    tier: 'flash',
    tierLabel: '⚡ Nhanh / Tiết kiệm (Flash)',
  },
  {
    id: 'gemini-3.5-flash-lite',
    name: 'gemini-3.5-flash-lite',
    displayName: 'Gemini 3.5 Flash-Lite',
    description: 'Nhẹ, rẻ — có hạn mức miễn phí',
    tier: 'flash',
    tierLabel: '⚡ Nhanh / Tiết kiệm (Flash)',
  },
  {
    id: 'gemini-4-argon',
    name: 'gemini-4-argon',
    displayName: 'Gemini 4 Argon',
    description: 'Model lập luận hàng đầu — CHỈ gói trả phí, không có hạn mức miễn phí',
    tier: 'pro',
    tierLabel: PREMIUM_TIER_LABEL,
  },
];

/** Id dùng khi chưa biết gì (không có danh sách) — alias tự cập nhật, không ghim phiên bản. */
export const DEFAULT_MODEL_ID = 'gemini-flash-latest';

const API_KEY_STORAGE_KEY = 'cloudhunter_custom_api_key';

/**
 * Phân hạng theo TÊN model. "Cao cấp" = model lập luận hàng đầu, thường chỉ có ở gói trả phí
 * (Gemini 4 Argon: "not available on the Free tier", đo 14/10/2026). Model cao cấp chỉ chạy khi
 * người dùng TỰ CHỌN — không bao giờ là mặc định, không bao giờ được dùng làm dự phòng tự động.
 * Họ model mới có tên mã chưa biết (vd "gemini-5-xyz") rơi vào 'custom': hiện trong danh sách để
 * chọn tay, nhưng cũng KHÔNG vào chuỗi dự phòng — chưa biết giá thì không tự tiêu tiền.
 */
const PREMIUM_WORDS = ['pro', 'ultra', 'argon', 'thinking', 'reasoning'];
export function classifyTier(id: string): DiscoveredModel['tier'] {
  const lower = id.toLowerCase();
  if (lower.includes('flash')) return 'flash';
  if (PREMIUM_WORDS.some(w => lower.includes(w))) return 'pro';
  if (lower.includes('exp') || lower.includes('preview')) return 'experimental';
  return 'custom';
}

/**
 * Model mặc định: alias `gemini-flash-latest` nếu key thấy nó (Google tự trỏ sang Flash mới
 * nhất ⇒ app tự lên đời mà không cần sửa code); không có thì Flash ổn định, không Lite,
 * điểm cao nhất theo `fallbackPriority`.
 */
export function pickDefaultModel(models: DiscoveredModel[]): DiscoveredModel | undefined {
  const alias = models.find(m => m.id === DEFAULT_MODEL_ID);
  if (alias) return alias;
  const flash = models.filter(m => m.tier === 'flash');
  const stable = flash.filter(m => !/lite|preview|exp/.test(m.id.toLowerCase()));
  const pool = stable.length ? stable : flash.length ? flash : models;
  return [...pool].sort((a, b) => fallbackPriority(b.id) - fallbackPriority(a.id))[0];
}

/**
 * Chỉ giữ model PHÂN TÍCH VĂN BẢN. Loại: embedding, TTS, model TẠO ẢNH
 * ("Nano Banana" = Gemini image, id chứa 'image'), model realtime audio/video (Live API).
 * Model ảnh hỗ trợ generateContent nên lọt qua filter cũ và từng hiện trong dropdown.
 */
export function isTextAnalysisModel(id: string, displayName: string): boolean {
  const lower = id.toLowerCase();
  const dn = (displayName || '').toLowerCase();
  const banned = [
    'embedding', 'imagen', 'tts', 'aqa', 'robotics', 'computer-use', 'gecko', 'bison',
    'image',        // gemini-*-image* = model tạo ảnh (Nano Banana)
    '-live',        // Live API (realtime audio/video), không dùng cho phân tích
    'native-audio', 'veo',
    // họ mới trên trang models 14/10/2026 — không phải model phân tích văn bản:
    'banana',       // gemini-nano-banana-2.1 (tạo ảnh, id không chứa 'image')
    'transcribe', 'translate', 'lyria', 'omni', 'deep-research', 'antigravity',
  ];
  if (banned.some(b => lower.includes(b))) return false;
  if (dn.includes('nano banana') || dn.includes('image')) return false;
  return true;
}

export function getStoredApiKey(): string {
  try {
    return localStorage.getItem(API_KEY_STORAGE_KEY) || process.env.GEMINI_API_KEY || '';
  } catch {
    return process.env.GEMINI_API_KEY || '';
  }
}

/**
 * Chuyển key giữa các thiết bị qua URL fragment (#gkey=...).
 * Fragment KHÔNG bao giờ được trình duyệt gửi lên server — key đi thẳng thiết bị-tới-thiết bị.
 */
export function parseKeyFromHash(hash: string): string | null {
  const m = (hash || '').match(/[#&]gkey=([^&]+)/);
  if (!m) return null;
  const key = decodeURIComponent(m[1]).trim();
  // kiểm tra hình dạng key Google (AIza...) hoặc tối thiểu 20 ký tự an toàn
  if (/^AIza[0-9A-Za-z_-]{20,}$/.test(key) || /^[0-9A-Za-z_-]{20,}$/.test(key)) return key;
  return null;
}

/** Gọi lúc khởi động app: nhận key từ link/QR thiết bị khác, lưu rồi XÓA ngay khỏi thanh địa chỉ. */
export function importKeyFromUrlHash(): boolean {
  try {
    const key = parseKeyFromHash(window.location.hash);
    if (!key) return false;
    setStoredApiKey(key);
    // xóa fragment để key không nằm lại trên thanh địa chỉ / lịch sử tab
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    return true;
  } catch {
    return false;
  }
}

export function buildKeyTransferUrl(key: string): string {
  return `${window.location.origin}${window.location.pathname}#gkey=${encodeURIComponent(key)}`;
}

export function setStoredApiKey(key: string): void {
  try {
    if (!key.trim()) {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
    } else {
      localStorage.setItem(API_KEY_STORAGE_KEY, key.trim());
    }
  } catch (err) {
    console.warn("Could not save custom API key to localStorage:", err);
  }
}

export function getStoredModel(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredModel(modelId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, modelId);
  } catch (err) {
    console.warn("Could not save selected model to localStorage:", err);
  }
}

/**
 * R1 & R2: Dynamic Model Discovery
 * Queries Generative Language REST API for all available models matching user's API key.
 * Filters out embeddings, imagen, TTS, etc.
 * Sorts Flash/Free models first, Pro models last.
 */
export async function discoverModels(apiKey?: string): Promise<DiscoveredModel[]> {
  const key = apiKey || getStoredApiKey();
  if (!key) {
    console.warn("Missing GEMINI_API_KEY. Returning default model list.");
    return FALLBACK_DEFAULT_MODELS;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error(`AUTH_ERROR:${response.status}`);
      }
      return FALLBACK_DEFAULT_MODELS;
    }

    const data = await response.json();
    if (!data.models || !Array.isArray(data.models)) {
      return FALLBACK_DEFAULT_MODELS;
    }

    const discovered: DiscoveredModel[] = [];
    const seenIds = new Set<string>();

    for (const item of data.models) {
      const rawName: string = item.name || '';
      const cleanId = rawName.replace(/^models\//, '');
      if (seenIds.has(cleanId)) continue;
      seenIds.add(cleanId);

      const methods: string[] = item.supportedGenerationMethods || [];

      // Filter requirement R1: Must support generateContent
      if (!methods.includes('generateContent')) continue;

      // Filter out non-text models
      if (!isTextAnalysisModel(cleanId, item.displayName || '')) continue;
      const lower = cleanId.toLowerCase();

      // Classify Tiers (R2)
      const tier = classifyTier(cleanId);
      const tierLabel = tier === 'flash' ? '⚡ Nhanh / Tiết kiệm (Flash)'
        : tier === 'pro' ? PREMIUM_TIER_LABEL
        : tier === 'experimental' ? '🧪 Thử nghiệm (Preview)'
        : '🤖 Khác';

      const displayName = item.displayName || cleanId;
      const description = item.description || `Model ${cleanId}`;

      discovered.push({
        id: cleanId,
        name: cleanId,
        displayName,
        description,
        tier,
        tierLabel,
      });
    }

    if (discovered.length === 0) {
      return FALLBACK_DEFAULT_MODELS;
    }

    // Sắp xếp: Flash trước, rồi Khác, Cao cấp, Preview; trong mỗi nhóm theo fallbackPriority
    // (bản cũ sort chữ cái ngược: 'gemini-flash-lite-latest' > 'gemini-3.8-flash' vì 'f' > '3',
    // nên Lite thành mặc định). Model mặc định đưa lên ĐẦU danh sách vì geminiService dùng
    // discovered[0] khi người dùng chưa chọn gì.
    discovered.sort((a, b) => {
      const tierRank = { flash: 1, custom: 2, pro: 3, experimental: 4 };
      const rankA = tierRank[a.tier] || 5;
      const rankB = tierRank[b.tier] || 5;
      if (rankA !== rankB) return rankA - rankB;
      return fallbackPriority(b.id) - fallbackPriority(a.id);
    });

    const def = pickDefaultModel(discovered);
    if (def) {
      def.isDefaultCandidate = true;
      discovered.splice(discovered.indexOf(def), 1);
      discovered.unshift(def);
    }

    return discovered;
  } catch (error: any) {
    if (error?.message?.startsWith('AUTH_ERROR')) {
      throw error;
    }
    console.warn("Dynamic model discovery failed. Falling back to default list:", error);
    return FALLBACK_DEFAULT_MODELS;
  }
}

/**
 * R5: Error Classifier
 * Differentiates auth errors (STOP) from rate limits / missing models / 5xx (RETRYABLE)
 */
export function classifyError(error: any): ErrorClassification {
  if (!error) return 'OTHER';
  
  const msg = (error.message || String(error)).toLowerCase();
  const status = error.status || error.code || 0;

  // 401 / 403 Invalid Key or Permission Denied -> STOP IMMEDIATELY
  if (status === 401 || status === 403 || msg.includes('api key') || msg.includes('unauthorized') || msg.includes('permission denied') || msg.includes('auth_error')) {
    return 'AUTH';
  }

  // 429 Rate Limit / Quota, 404 Model Not Found, 400 Bad Request Model, 5xx Server Error -> RETRYABLE
  if (
    status === 429 ||
    status === 404 ||
    status === 400 ||
    status >= 500 ||
    msg.includes('429') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('resource_exhausted') ||
    msg.includes('not found') ||
    msg.includes('deprecated') ||
    msg.includes('unavailable') ||
    msg.includes('timeout')
  ) {
    return 'RETRYABLE';
  }

  return 'OTHER';
}

export interface FallbackResult<T> {
  result: T;
  modelUsed: string;
  fallbackOccurred: boolean;
  attemptedModels: string[];
  attemptErrors: Record<string, string>; // model → lỗi ngắn gọn (để UI giải thích vì sao fallback)
}

/**
 * Điểm ưu tiên khi chọn model DỰ PHÒNG: model bạn chọn lỗi thì thử model
 * GẦN NHẤT VỀ CHẤT LƯỢNG trước, Lite luôn là phương án cuối cùng.
 * (Bản cũ sort theo chữ cái ngược → 'gemini-flash-lite-latest' xếp trước mọi
 * model số vì 'l' > chữ số, khiến chọn 3.7 Flash lỗi 1 phát là rơi thẳng
 * xuống Flash-Lite — lỗi người dùng đã gặp thật.)
 */
export function fallbackPriority(id: string): number {
  const lower = id.toLowerCase();
  const m = lower.match(/(\d+(?:\.\d+)?)/);
  const version = m ? parseFloat(m[1]) : (lower.includes('latest') ? 900 : 0);
  let score = version * 10;
  if (lower.includes('latest')) score += 5;                                  // alias -latest nhỉnh hơn bản số cùng loại
  if (lower.includes('preview') || lower.includes('exp')) score -= 100;      // bản thử nghiệm sau bản ổn định
  if (lower.includes('lite')) score -= 100000;                               // Lite = gần cuối hàng
  // Gemma là họ model khác (open-weights, nhỏ hơn) — KHÔNG được chen vào bậc thang Flash.
  // Bug cũ: "gemma-3-27b" bắt số 3 → 30 điểm, cao hơn gemini-2.5-flash (25) → người dùng
  // chọn 3.7 Flash quá tải lại bị đưa về Gemma thay vì 2.5 Flash. Gemma chỉ là phương án
  // CUỐI CÙNG tuyệt đối (sau cả Lite), vì không có AI thì app vẫn đủ số liệu.
  if (lower.includes('gemma')) score -= 1000000;
  return score;
}

/** Chuỗi thử: [model người dùng chọn, rồi các Flash khác xếp theo chất lượng giảm dần]. */
export function buildFallbackChain(primaryModel: string, discoveredModels: DiscoveredModel[]): string[] {
  const chain: string[] = [primaryModel];
  const safeFallbacks = discoveredModels
    // Chỉ Flash (có hạn mức miễn phí) + Gemma ở cuối. KHÔNG có Cao cấp/Preview/họ mới chưa biết giá:
    // model trả phí chỉ chạy khi người dùng tự chọn nó làm model chính.
    .filter(m => m.tier === 'flash' || m.id.toLowerCase().includes('gemma'))
    .map(m => m.id)
    .sort((a, b) => fallbackPriority(b) - fallbackPriority(a));
  for (const fb of safeFallbacks) {
    if (!chain.includes(fb)) chain.push(fb);
  }
  return chain;
}

/**
 * R5: Automatic Fallback Execution Engine
 * Stops on AUTH errors; retries on RATE_LIMIT / BAD_MODEL / 5XX.
 * Prevents calling expensive PRO models automatically unless user selected it.
 */
export async function executeWithFallback<T>(
  primaryModel: string,
  discoveredModels: DiscoveredModel[],
  fn: (modelId: string) => Promise<T>
): Promise<FallbackResult<T>> {
  const chain = buildFallbackChain(primaryModel, discoveredModels);

  let lastError: any = null;
  const attemptedModels: string[] = [];
  const attemptErrors: Record<string, string> = {};

  for (const modelId of chain) {
    attemptedModels.push(modelId);
    try {
      const result = await fn(modelId);
      return {
        result,
        modelUsed: modelId,
        fallbackOccurred: modelId !== primaryModel,
        attemptedModels,
        attemptErrors,
      };
    } catch (err: any) {
      const classification = classifyError(err);

      if (classification === 'AUTH') {
        // STOP IMMEDIATELY (R5). Do not cycle through remaining models on bad key
        throw new Error(`Xác thực thất bại (401/403): Vui lòng kiểm tra lại GEMINI_API_KEY. Cụ thể: ${err.message || 'Key không hợp lệ'}`);
      }

      const brief = String(err?.message || err).slice(0, 120);
      attemptErrors[modelId] = brief;
      if (classification === 'RETRYABLE') {
        console.warn(`[Fallback Engine] Model ${modelId} không khả dụng (${brief}). Đang tự động chuyển sang model tiếp theo...`);
      }
      lastError = err;
    }
  }

  throw lastError || new Error("Tất cả các model trong chuỗi tự động đều không khả dụng. Vui lòng thử lại sau.");
}
