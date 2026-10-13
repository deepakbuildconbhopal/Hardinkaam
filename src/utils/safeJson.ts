/**
 * Safely parses JSON from a fetch Response.
 * Protects against "Unexpected token '<', '<!doctype ...' is not valid JSON"
 * when an API route returns HTML (due to 404, 502 warmup, or SPA fallback).
 */
export async function safeFetchJson<T = any>(
  res: Response
): Promise<{ ok: boolean; data: T | null; error?: string }> {
  try {
    const rawText = await res.text();
    const trimmed = rawText.trim();

    // 1. Check if response body is valid JSON string regardless of Content-Type header
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const data = JSON.parse(trimmed);
        return { ok: res.ok && data?.success !== false, data };
      } catch (jsonErr) {
        // Fall through to error format
      }
    }

    // 2. Check if response is HTML fallback
    if (trimmed.startsWith('<') || trimmed.includes('<!doctype') || trimmed.includes('<html')) {
      return {
        ok: false,
        data: null,
        error: `सर्वर रिस्पॉन्स HTML है (HTTP ${res.status}): API रूट प्रतिक्रिया देने में असमर्थ है या सर्वर रीस्टार्ट हो रहा है।`,
      };
    }

    // 3. Plain text response
    return {
      ok: res.ok,
      data: null,
      error: trimmed || `HTTP Error ${res.status}`,
    };
  } catch (err: any) {
    return {
      ok: false,
      data: null,
      error: `रिस्पॉन्स पार्सिंग त्रुटि: ${err?.message || 'अमान्य प्रतिक्रिया (Invalid response)'}`,
    };
  }
}

