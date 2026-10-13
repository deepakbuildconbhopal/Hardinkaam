import { auth } from '../firebase/config';

/**
 * Safe API Handler Wrapper
 * Prevents app-wide crashes caused by trying to parse non-JSON (e.g. HTML 404/502/504 fallback pages) as JSON.
 * Validates 'Content-Type: application/json' before calling .json().
 * Automatically attaches 'Authorization: Bearer <Firebase ID Token>' for authenticated requests.
 */

export interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  statusText: string;
  data: T | null;
  error: string | null;
  response: Response | null;
}

export interface ApiFetchOptions extends RequestInit {
  /**
   * Optional custom timeout in milliseconds (default: 30000ms)
   */
  timeoutMs?: number;
  /**
   * Skip automatic Firebase token injection if explicitly requested
   */
  skipAuthToken?: boolean;
}

/**
 * Helper to fetch valid Firebase ID Token or Admin Session Token
 */
export async function getAuthBearerToken(): Promise<string | null> {
  try {
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken(false);
      if (token && token.trim() && token !== 'null' && token !== 'undefined') return token.trim();
    }
  } catch (err) {
    console.warn('[apiHandler] Unable to retrieve auth token:', err);
  }
  return null;
}

/**
 * Ensures a valid admin bearer token is available from authenticated Firebase user.
 * Strictly verifies authenticated administrator credentials.
 */
export async function ensureAdminAuthToken(): Promise<string> {
  if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken(false);
    if (token && token.trim() && token !== 'null' && token !== 'undefined') {
      return token.trim();
    }
  }
  throw new Error('Authentication required: Please sign in with an authorized Administrator account.');
}

/**
 * Wraps fetch requests with safety checks for JSON Content-Type, structured error handling,
 * and automatic Firebase Bearer authentication.
 *
 * @template T Type of expected JSON data
 * @param input URL or Request object
 * @param init Fetch options with optional timeoutMs
 * @returns Standardized ApiResponse<T>
 */
export async function apiFetch<T = any>(
  input: RequestInfo | URL,
  init?: ApiFetchOptions
): Promise<ApiResponse<T>> {
  const rawUrl = typeof input === 'string' 
    ? input 
    : input instanceof URL 
      ? input.toString() 
      : (input as Request).url || 'unknown-url';

  const apiBaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || 'https://hardinkaam-payment-backend.onrender.com';
  let finalUrl = rawUrl;
  if (rawUrl.startsWith('/api/')) {
    const isLocalDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.port === '3000');
    if (!isLocalDev || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)) {
      finalUrl = `${apiBaseUrl.replace(/\/$/, '')}${rawUrl}`;
    }
  }
  const urlString = finalUrl;

  const { timeoutMs = 30000, skipAuthToken = false, ...fetchInit } = init || {};

  // Setup headers
  const reqHeaders = new Headers(fetchInit.headers || {});

  // Inject Firebase Bearer Token if not already provided and user is signed in
  if (!skipAuthToken && !reqHeaders.has('Authorization')) {
    const token = await getAuthBearerToken();
    if (token) {
      reqHeaders.set('Authorization', `Bearer ${token}`);
    }
  }

  let controller: AbortController | undefined;
  let timeoutId: any;

  if (timeoutMs > 0 && !fetchInit.signal) {
    controller = new AbortController();
    fetchInit.signal = controller.signal;
    timeoutId = setTimeout(() => {
      controller?.abort();
    }, timeoutMs);
  }

  try {
    const response = await fetch(finalUrl, {
      ...fetchInit,
      headers: reqHeaders,
    });
    if (timeoutId) clearTimeout(timeoutId);

    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    const isJson = contentType.includes('application/json');

    if (!isJson) {
      const textPreview = await response.text().catch(() => '');
      const shortPreview = textPreview.trim().slice(0, 150);
      const isUnavailable = response.status === 404 || response.status === 405 || response.status === 502 || response.status === 503;
      const warningMsg = `[apiHandler] Non-JSON response received from ${urlString} (Status: ${response.status} ${response.statusText}, Content-Type: "${contentType || 'none'}"). Body preview: "${shortPreview}"`;
      
      console.warn(warningMsg);

      const userFriendlyError = isUnavailable
        ? 'बैकएंड सेवा वर्तमान में ऑफलाइन है (Backend service is temporarily offline on Spark Free tier). कृपया कैश अथवा सेवा उपरांत विकल्प चुनें या एडमिन से संपर्क करें।'
        : `Expected JSON response but received ${contentType || 'non-JSON content'} (HTTP ${response.status})`;

      return {
        ok: false,
        status: response.status,
        statusText: response.statusText,
        data: null,
        error: userFriendlyError,
        response,
      };
    }

    try {
      const data = await response.json();
      const isOk = response.ok;
      const extractedError = isOk 
        ? null 
        : (data?.error?.description || data?.error?.message || data?.error || data?.message || `Request failed with status ${response.status}`);

      return {
        ok: isOk,
        status: response.status,
        statusText: response.statusText,
        data: data as T,
        error: extractedError,
        response,
      };
    } catch (parseErr: any) {
      console.warn(`[apiHandler] Failed to parse JSON response from ${urlString}:`, parseErr);
      return {
        ok: false,
        status: response.status,
        statusText: response.statusText,
        data: null,
        error: `Malformed JSON received: ${parseErr?.message || 'Invalid JSON syntax'}`,
        response,
      };
    }
  } catch (netErr: any) {
    if (timeoutId) clearTimeout(timeoutId);
    const isAbort = netErr.name === 'AbortError';
    const rawMsg = netErr.message || 'Network request failed';
    const isOffline = rawMsg.includes('Failed to fetch') || rawMsg.includes('NetworkError') || rawMsg.includes('Load failed');
    const userFriendlyError = isOffline
      ? 'सर्वर से संपर्क नहीं हो सका (Unable to connect to backend server: Backend is currently offline).'
      : (isAbort ? `Request to ${urlString} timed out after ${timeoutMs}ms` : rawMsg);

    console.warn(`[apiHandler] Network error when requesting ${urlString}:`, rawMsg);

    return {
      ok: false,
      status: 0,
      statusText: isAbort ? 'Request Timeout' : 'Network Error',
      data: null,
      error: userFriendlyError,
      response: null,
    };
  }
}

/**
 * Convenient helper for GET requests with safe JSON extraction and Firebase Auth
 */
export async function apiGet<T = any>(
  url: string,
  headers?: HeadersInit,
  options?: Omit<ApiFetchOptions, 'method' | 'headers'>
): Promise<ApiResponse<T>> {
  return apiFetch<T>(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...headers,
    },
    ...options,
  });
}

/**
 * Convenient helper for POST requests with automatic JSON serialization, safe JSON extraction, and Firebase Auth
 */
export async function apiPost<T = any>(
  url: string,
  body?: any,
  headers?: HeadersInit,
  options?: Omit<ApiFetchOptions, 'method' | 'headers' | 'body'>
): Promise<ApiResponse<T>> {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  
  return apiFetch<T>(url, {
    method: 'POST',
    headers: isFormData 
      ? { Accept: 'application/json', ...headers }
      : { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
    body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    ...options,
  });
}

/**
 * Convenient helper for PUT requests
 */
export async function apiPut<T = any>(
  url: string,
  body?: any,
  headers?: HeadersInit,
  options?: Omit<ApiFetchOptions, 'method' | 'headers' | 'body'>
): Promise<ApiResponse<T>> {
  return apiFetch<T>(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...options,
  });
}

/**
 * Convenient helper for DELETE requests
 */
export async function apiDelete<T = any>(
  url: string,
  headers?: HeadersInit,
  options?: Omit<ApiFetchOptions, 'method' | 'headers'>
): Promise<ApiResponse<T>> {
  return apiFetch<T>(url, {
    method: 'DELETE',
    headers: { Accept: 'application/json', ...headers },
    ...options,
  });
}

export default apiFetch;
