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
  const friendlyMap: Record<string, { displayName: string; tierLabel: string }> = {
    'gemini-flash-latest': { displayName: 'Gemini 2.5 Flash (Bản mới nhất)', tierLabel: '⚡ Flash' },
    'gemini-flash-lite-latest': { displayName: 'Gemini 2.5 Flash-Lite (Siêu nhanh / Tiết kiệm)', tierLabel: '⚡ Flash-Lite' },
    'gemini-pro-latest': { displayName: 'Gemini 2.5 Pro (Tư duy sâu / Mới nhất)', tierLabel: '🚀 Pro' },
    'gemini-2.5-flash': { displayName: 'Gemini 2.5 Flash', tierLabel: '⚡ Flash' },
    'gemini-2.5-flash-lite': { displayName: 'Gemini 2.5 Flash-Lite', tierLabel: '⚡ Flash-Lite' },
    'gemini-2.5-pro': { displayName: 'Gemini 2.5 Pro', tierLabel: '🚀 Pro' },
    'gemini-2.0-flash': { displayName: 'Gemini 2.0 Flash', tierLabel: '⚡ Flash' },
    'gemini-2.0-flash-lite': { displayName: 'Gemini 2.0 Flash-Lite', tierLabel: '⚡ Flash-Lite' },
    'gemini-1.5-flash': { displayName: 'Gemini 1.5 Flash', tierLabel: '⚡ Flash' },
    'gemini-1.5-pro': { displayName: 'Gemini 1.5 Pro', tierLabel: '🚀 Pro' },
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
  if (cleanId.toLowerCase().includes('flash')) tierLabel = '⚡ Flash';
  else if (cleanId.toLowerCase().includes('pro')) tierLabel = '🚀 Pro';
  else if (cleanId.toLowerCase().includes('preview') || cleanId.toLowerCase().includes('exp')) tierLabel = '🧪 Preview';

  return {
    displayName: formatted,
    rawId: cleanId,
    tierLabel
  };
}

export type ErrorClassification = 'AUTH' | 'RETRYABLE' | 'OTHER';

const STORAGE_KEY = 'cloudhunter_selected_model';

// Fallback safe default models if API discovery fails or key is missing
const FALLBACK_DEFAULT_MODELS: DiscoveredModel[] = [
  {
    id: 'gemini-2.5-flash',
    name: 'gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash',
    description: 'Mô hình chuẩn mặc định, hạn mức cao và phản hồi nhanh nhất',
    tier: 'flash',
    tierLabel: '⚡ Nhanh / Tiết kiệm (Flash)',
    isDefaultCandidate: true,
  },
  {
    id: 'gemini-1.5-flash',
    name: 'gemini-1.5-flash',
    displayName: 'Gemini 1.5 Flash',
    description: 'Mô hình thế hệ 1.5 ổn định cao',
    tier: 'flash',
    tierLabel: '⚡ Nhanh / Tiết kiệm (Flash)',
  },
  {
    id: 'gemini-2.5-pro',
    name: 'gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro',
    description: 'Mô hình tư duy chuyên sâu (Pro)',
    tier: 'pro',
    tierLabel: '🚀 Cao cấp (Pro)',
  }
];

const API_KEY_STORAGE_KEY = 'cloudhunter_custom_api_key';

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
      let tier: 'flash' | 'pro' | 'experimental' | 'custom' = 'custom';
      let tierLabel = '🤖 Khác';

      if (lower.includes('flash')) {
        tier = 'flash';
        tierLabel = '⚡ Nhanh / Tiết kiệm (Flash)';
      } else if (lower.includes('pro') || lower.includes('thinking')) {
        tier = 'pro';
        tierLabel = '🚀 Cao cấp / Tư duy sâu (Pro)';
      } else if (lower.includes('exp') || lower.includes('preview')) {
        tier = 'experimental';
        tierLabel = '🧪 Thử nghiệm (Preview)';
      }

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

    // Sort order (R2): Flash models first (newest to oldest), then Pro, then Experimental/Other
    discovered.sort((a, b) => {
      const tierRank = { flash: 1, custom: 2, pro: 3, experimental: 4 };
      const rankA = tierRank[a.tier] || 5;
      const rankB = tierRank[b.tier] || 5;
      if (rankA !== rankB) return rankA - rankB;
      return b.id.localeCompare(a.id); // Lexicographical sort descending (newer version numbers first)
    });

    // Mark safe default candidate (R4)
    if (discovered.length > 0) {
      discovered[0].isDefaultCandidate = true;
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
  if (lower.includes('lite')) score -= 100000;                               // Lite = chất lượng thấp nhất → cuối hàng
  return score;
}

/** Chuỗi thử: [model người dùng chọn, rồi các Flash khác xếp theo chất lượng giảm dần]. */
export function buildFallbackChain(primaryModel: string, discoveredModels: DiscoveredModel[]): string[] {
  const chain: string[] = [primaryModel];
  const safeFallbacks = discoveredModels
    .filter(m => m.tier === 'flash' || m.tier === 'custom')
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
