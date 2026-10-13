import { GoogleGenAI } from '@google/genai';

/**
 * CANONICAL GEMINI MODEL CONFIGURATION FOR HARDINKAAM
 * Production Standard: gemini-3.8-flash
 */
export const GEMINI_CANONICAL_MODEL = 'gemini-3.8-flash';
export const GEMINI_MODEL = process.env.GEMINI_MODEL || GEMINI_CANONICAL_MODEL;

/**
 * Normalizes any model identifier to the authoritative production model: gemini-3.8-flash.
 * Strips legacy references like gemini-2.5-flash, gemini-3.7-flash, gemini-1.5, etc.
 */
export function normalizeGeminiModel(model?: string): string {
  if (!model) return GEMINI_CANONICAL_MODEL;
  const clean = model.trim().toLowerCase();
  if (
    clean === 'gemini-3.8-flash' ||
    clean === 'gemini-3.8' ||
    clean === 'gemini 3.8 flash'
  ) {
    return GEMINI_CANONICAL_MODEL;
  }
  // Any legacy or unrecognized string must resolve strictly to canonical gemini-3.8-flash
  return GEMINI_CANONICAL_MODEL;
}

// Global Diagnostics & Telemetry Tracker (In-memory, Admin Accessible)
interface AIDiagnosticsState {
  activeModel: string;
  sdkStatus: 'initialized' | 'missing_api_key';
  aiServiceStatus: 'online' | 'degraded' | 'rate_limited';
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  lastSuccessfulRequestAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  rateLimitStatus: 'healthy' | 'warning' | 'throttled';
}

const diagnosticsState: AIDiagnosticsState = {
  activeModel: GEMINI_CANONICAL_MODEL,
  sdkStatus: process.env.GEMINI_API_KEY ? 'initialized' : 'missing_api_key',
  aiServiceStatus: process.env.GEMINI_API_KEY ? 'online' : 'degraded',
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  lastSuccessfulRequestAt: null,
  lastErrorAt: null,
  lastErrorMessage: null,
  rateLimitStatus: 'healthy',
};

export function recordAISuccess(): void {
  diagnosticsState.totalRequests += 1;
  diagnosticsState.successfulRequests += 1;
  diagnosticsState.lastSuccessfulRequestAt = new Date().toISOString();
  diagnosticsState.aiServiceStatus = 'online';
  diagnosticsState.rateLimitStatus = 'healthy';
}

export function recordAIError(error: any): void {
  diagnosticsState.totalRequests += 1;
  diagnosticsState.failedRequests += 1;
  diagnosticsState.lastErrorAt = new Date().toISOString();

  const msg = String(error?.message || error || '');
  diagnosticsState.lastErrorMessage = msg.slice(0, 200);

  if (msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate')) {
    diagnosticsState.rateLimitStatus = 'throttled';
    diagnosticsState.aiServiceStatus = 'rate_limited';
  } else {
    diagnosticsState.aiServiceStatus = 'degraded';
  }
}

export function getAIDiagnostics(): AIDiagnosticsState {
  diagnosticsState.sdkStatus = process.env.GEMINI_API_KEY ? 'initialized' : 'missing_api_key';
  return { ...diagnosticsState };
}

// Shared, Singleton GoogleGenAI Client
let sharedAIClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!sharedAIClient) {
    const apiKey = process.env.GEMINI_API_KEY || '';
    sharedAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return sharedAIClient;
}

/**
 * Standardized Gemini 3.8 Flash Generation Helper
 * Filters obsolete parameters (temperature, top_p, top_k, candidate_count)
 * Maps thinking budget to supported thinkingLevel
 */
export async function generateWithGemini38(params: {
  contents: any;
  systemInstruction?: string;
  responseMimeType?: string;
  tools?: any[];
  toolConfig?: any;
  thinkingLevel?: 'low' | 'medium' | 'high';
}): Promise<string> {
  const ai = getGeminiClient();
  const config: any = {};

  if (params.systemInstruction) {
    config.systemInstruction = params.systemInstruction;
  }
  if (params.responseMimeType) {
    config.responseMimeType = params.responseMimeType;
  }
  if (params.tools && params.tools.length > 0) {
    config.tools = params.tools;
  }
  if (params.toolConfig) {
    config.toolConfig = params.toolConfig;
  }
  if (params.thinkingLevel) {
    config.thinkingConfig = {
      thinkingLevel: params.thinkingLevel,
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_CANONICAL_MODEL,
      contents: params.contents,
      ...(Object.keys(config).length > 0 ? { config } : {}),
    });

    recordAISuccess();
    return response.text || '';
  } catch (err: any) {
    recordAIError(err);
    throw err;
  }
}
