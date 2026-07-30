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

export function getStoredApiKey(): string {
  try {
    return localStorage.getItem(API_KEY_STORAGE_KEY) || process.env.GEMINI_API_KEY || '';
  } catch {
    return process.env.GEMINI_API_KEY || '';
  }
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
      const lower = cleanId.toLowerCase();
      if (
        lower.includes('embedding') ||
        lower.includes('imagen') ||
        lower.includes('tts') ||
        lower.includes('aqa') ||
        lower.includes('robotics') ||
        lower.includes('computer-use') ||
        lower.includes('gecko') ||
        lower.includes('bison')
      ) {
        continue;
      }

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
}

/**
 * R5: Automatic Fallback Execution Engine
 * Priority chain: [primaryModel, ...safeFlashModels]
 * Stops on AUTH errors; retries on RATE_LIMIT / BAD_MODEL / 5XX.
 * Prevents calling expensive PRO models automatically unless user selected it.
 */
export async function executeWithFallback<T>(
  primaryModel: string,
  discoveredModels: DiscoveredModel[],
  fn: (modelId: string) => Promise<T>
): Promise<FallbackResult<T>> {
  // Construct candidate fallback chain
  const chain: string[] = [primaryModel];

  // Safe fallbacks: Include only Flash/Light models (Anti-requirement: DO NOT include expensive Pro models)
  const safeFallbacks = discoveredModels
    .filter(m => m.tier === 'flash' || m.tier === 'custom')
    .map(m => m.id);

  for (const fb of safeFallbacks) {
    if (!chain.includes(fb)) {
      chain.push(fb);
    }
  }

  let lastError: any = null;
  const attemptedModels: string[] = [];

  for (const modelId of chain) {
    attemptedModels.push(modelId);
    try {
      const result = await fn(modelId);
      return {
        result,
        modelUsed: modelId,
        fallbackOccurred: modelId !== primaryModel,
        attemptedModels
      };
    } catch (err: any) {
      const classification = classifyError(err);
      
      if (classification === 'AUTH') {
        // STOP IMMEDIATELY (R5). Do not cycle through remaining models on bad key
        throw new Error(`Xác thực thất bại (401/403): Vui lòng kiểm tra lại GEMINI_API_KEY. Cụ thể: ${err.message || 'Key không hợp lệ'}`);
      }

      if (classification === 'RETRYABLE') {
        console.warn(`[Fallback Engine] Model ${modelId} không khả dụng (${err.message || 'Rate limit / Deprecated'}). Đang tự động chuyển sang model tiếp theo...`);
        lastError = err;
        continue;
      }

      // If OTHER error, save and try next or throw if final
      lastError = err;
    }
  }

  throw lastError || new Error("Tất cả các model trong chuỗi tự động đều không khả dụng. Vui lòng thử lại sau.");
}
