/**
 * HARDINKAAM Canonical Gemini AI Model Configuration (Client & Shared)
 * Production Standard Model: gemini-3.8-flash
 */
export const GEMINI_CANONICAL_MODEL = 'gemini-3.8-flash';
export const GEMINI_MODEL = GEMINI_CANONICAL_MODEL;

export function normalizeGeminiModel(model?: string): string {
  if (!model) return GEMINI_CANONICAL_MODEL;
  const clean = model.trim().toLowerCase();
  if (clean === 'gemini-3.8-flash' || clean === 'gemini-3.8' || clean === 'gemini 3.8 flash') {
    return GEMINI_CANONICAL_MODEL;
  }
  return GEMINI_CANONICAL_MODEL;
}
