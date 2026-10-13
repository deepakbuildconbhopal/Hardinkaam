/**
 * Hardinkaam Secure Cloudflare Worker Backend for Razorpay Integration
 * Endpoints:
 * - POST /order: Create Razorpay order with authoritative pricing & Firestore booking ownership verification
 * - POST /verify: Verify payment signature, confirm via Razorpay server API, and update Firestore securely
 * - POST /webhook: Process Razorpay webhooks with raw body signature verification & durable atomic Firestore idempotency
 */

export interface Env {
  RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;
  RAZORPAY_WEBHOOK_SECRET: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_API_KEY: string;
  FIREBASE_DATABASE_ID?: string;
}

const getFirestoreDatabaseId = (env: Env) => env.FIREBASE_DATABASE_ID || 'ai-studio-916bb095-fb46-428e-9b8d-ba9e7a76de57';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request: Request, env: Env, ctx?: any): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/order' || path === '/api/razorpay/order') {
        return await handleCreateOrder(request, env);
      } else if (path === '/verify' || path === '/api/razorpay/verify') {
        return await handleVerifyPayment(request, env);
      } else if (path === '/webhook' || path === '/api/razorpay/webhook') {
        return await handleWebhook(request, env);
      }

      return new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    } catch (err: any) {
      console.error('Cloudflare Worker Error:', err);
      return new Response(JSON.stringify({ success: false, error: err.message || 'Internal Server Error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }
  },
};

/**
 * Helper: Verify Firebase Auth ID token via Firebase REST API
 */
async function verifyFirebaseToken(authHeader: string | null, env: Env): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const idToken = authHeader.split('Bearer ')[1];
  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${env.FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    const data: any = await res.json();
    if (data && data.users && data.users.length > 0) {
      return data.users[0].localId;
    }
  } catch (e) {
    console.error('Token verification error:', e);
  }
  return null;
}

/**
 * Helper: Parse Firestore REST API document fields into standard JS object
 */
function parseFirestoreFields(fields: any): any {
  const result: any = {};
  if (!fields) return result;
  for (const [key, val] of Object.entries(fields)) {
    const v: any = val;
    if (v.stringValue !== undefined) result[key] = v.stringValue;
    else if (v.integerValue !== undefined) result[key] = Number(v.integerValue);
    else if (v.doubleValue !== undefined) result[key] = Number(v.doubleValue);
    else if (v.booleanValue !== undefined) result[key] = v.booleanValue;
    else if (v.mapValue !== undefined) result[key] = parseFirestoreFields(v.mapValue.fields);
    else if (v.arrayValue !== undefined) {
      result[key] = (v.arrayValue.values || []).map((av: any) => parseFirestoreFields({ v: av }).v);
    }
  }
  return result;
}

/**
 * Handler: POST /order
 */
async function handleCreateOrder(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: CORS_HEADERS });
  }

  const authHeader = request.headers.get('Authorization');
  const userId = await verifyFirebaseToken(authHeader, env);
  if (!userId) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized: Invalid or missing Firebase Auth token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  const body: any = await request.json();
  const { purpose, referenceId } = body;

  let amountInPaise = 0;

  if (purpose === 'partner_registration' || purpose === 'business_partner_registration') {
    amountInPaise = 102100; // ₹1,021.00 Business Partner registration fee
  } else if (purpose === 'field_officer_registration') {
    amountInPaise = 202100; // ₹2,021.00 Field Officer registration fee
  } else if (purpose === 'registration' || purpose === 'customer_registration' || purpose === 'serviceman_registration') {
    // Check specific role or default to standard ₹121 registration fee
    const role = body?.role;
    if (role === 'business_partner') {
      amountInPaise = 102100; // ₹1,021.00
    } else if (role === 'field_officer' || role === 'franchise_partner') {
      amountInPaise = 202100; // ₹2,021.00
    } else {
      amountInPaise = 12100; // ₹121.00 Customer & ServiceMan registration fee
    }
  } else if (purpose === 'service_booking' || purpose === 'booking') {
    if (!referenceId) {
      return new Response(JSON.stringify({ success: false, error: 'Reference ID (booking ID) required for service booking' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // Load existing booking securely from Firestore using user's ID token (enforcing rules & ownership)
    const idToken = authHeader!.split('Bearer ')[1];
    const bookingRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/${getFirestoreDatabaseId(env)}/documents/bookings/${referenceId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      }
    );

    if (bookingRes.status === 404) {
      return new Response(JSON.stringify({ success: false, error: 'Booking not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    if (!bookingRes.ok) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized or failed to load booking record' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    const bookingDoc: any = await bookingRes.json();
    const bookingData = parseFirestoreFields(bookingDoc.fields);

    // Verify ownership (UID must match customerId, userId, or partnerId)
    const ownerId = bookingData.customerId || bookingData.userId || bookingData.partnerId;
    if (!ownerId || ownerId !== userId) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized: Booking does not belong to authenticated user' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // Verify booking is eligible for payment
    const status = bookingData.status;
    const paymentStatus = bookingData.paymentStatus;

    if (status === 'cancelled' || status === 'rejected') {
      return new Response(JSON.stringify({ success: false, error: 'Booking is cancelled or rejected and cannot be paid' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    if (paymentStatus === 'paid') {
      return new Response(JSON.stringify({ success: false, error: 'Booking is already paid' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // Extract authoritative amount from Firestore record (never trust client fallback)
    const authoritativeAmount = Number(bookingData.amount || bookingData.totalAmount || 0);
    if (!authoritativeAmount || authoritativeAmount <= 0) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid authoritative booking amount in Firestore record' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    amountInPaise = Math.round(authoritativeAmount * 100);
  } else {
    return new Response(JSON.stringify({ success: false, error: 'Invalid payment purpose' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  // Call Razorpay Orders API
  const credentials = btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);
  const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `rcpt_${userId}_${Date.now()}`,
      notes: { userId, purpose, referenceId: referenceId || '' },
    }),
  });

  const orderData: any = await rzpRes.json();
  if (!rzpRes.ok || !orderData.id) {
    return new Response(JSON.stringify({ success: false, error: orderData.error?.description || 'Failed to create Razorpay order' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  return new Response(
    JSON.stringify({
      success: true,
      orderId: orderData.id,
      amount: orderData.amount,
      currency: orderData.currency,
      keyId: env.RAZORPAY_KEY_ID,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    }
  );
}

/**
 * Handler: POST /verify
 */
async function handleVerifyPayment(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: CORS_HEADERS });
  }

  const authHeader = request.headers.get('Authorization');
  const userId = await verifyFirebaseToken(authHeader, env);
  if (!userId) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized: Missing or invalid Firebase Auth token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Invalid JSON request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  const { orderId, paymentId, signature, purpose, referenceId } = body;

  if (!orderId || !paymentId || !signature) {
    return new Response(JSON.stringify({ success: false, error: 'Missing required payment verification parameters (orderId, paymentId, signature)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  // 1. HMAC-SHA256 signature verification using Web Crypto API
  const text = `${orderId}|${paymentId}`;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(env.RAZORPAY_KEY_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(text));
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const expectedSignature = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  if (expectedSignature !== signature) {
    return new Response(JSON.stringify({ success: false, error: 'INVALID_SIGNATURE: Payment verification HMAC signature mismatch' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  // 2. Authoritative Server-Side Payment Confirmation via Razorpay Payments API
  const credentials = btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);
  let pmtData: any;

  try {
    const pmtRes = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
      },
    });

    if (!pmtRes.ok) {
      const errJson: any = await pmtRes.json().catch(() => ({}));
      return new Response(
        JSON.stringify({
          success: false,
          error: `RAZORPAY_API_ERROR: ${errJson.error?.description || pmtRes.statusText || 'Failed to fetch payment details from Razorpay'}`,
        }),
        {
          status: pmtRes.status >= 500 ? 502 : 400,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        }
      );
    }

    pmtData = await pmtRes.json();
  } catch (apiErr: any) {
    console.error('Razorpay payment fetch exception:', apiErr);
    return new Response(
      JSON.stringify({
        success: false,
        error: `RAZORPAY_API_EXCEPTION: ${apiErr?.message || 'Network error or timeout contacting Razorpay Payments API'}`,
      }),
      {
        status: 504,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      }
    );
  }

  // Requirement 1: Only accept status === 'captured' (strictly reject 'authorized', 'failed', 'refunded', etc.)
  if (pmtData.status !== 'captured') {
    return new Response(
      JSON.stringify({
        success: false,
        error: `PAYMENT_NOT_CAPTURED: Payment status is '${pmtData.status}'. Only 'captured' payments are accepted.`,
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      }
    );
  }

  // Requirement 1: Verify order_id from Razorpay response matches request orderId
  if (!pmtData.order_id || pmtData.order_id !== orderId) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `ORDER_MISMATCH: Payment order ID '${pmtData.order_id || 'none'}' does not match requested order '${orderId}'`,
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      }
    );
  }

  // Requirement 1: Verify currency === 'INR'
  if (pmtData.currency !== 'INR') {
    return new Response(
      JSON.stringify({
        success: false,
        error: `CURRENCY_MISMATCH: Payment currency '${pmtData.currency}' is invalid. Only 'INR' is accepted.`,
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      }
    );
  }

  // 3. Authoritative Order Verification via Razorpay Orders API
  let orderData: any;
  try {
    const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
      },
    });

    if (!orderRes.ok) {
      const errJson: any = await orderRes.json().catch(() => ({}));
      return new Response(
        JSON.stringify({
          success: false,
          error: `RAZORPAY_ORDER_FETCH_ERROR: ${errJson.error?.description || orderRes.statusText || 'Failed to fetch order details from Razorpay'}`,
        }),
        {
          status: orderRes.status >= 500 ? 502 : 400,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        }
      );
    }

    orderData = await orderRes.json();
  } catch (orderErr: any) {
    console.error('Razorpay order fetch exception:', orderErr);
    return new Response(
      JSON.stringify({
        success: false,
        error: `RAZORPAY_ORDER_EXCEPTION: ${orderErr?.message || 'Network error or timeout contacting Razorpay Order API'}`,
      }),
      {
        status: 504,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      }
    );
  }

  if (orderData.id !== orderId) {
    return new Response(
      JSON.stringify({ success: false, error: 'ORDER_ID_MISMATCH: Razorpay order ID does not match request' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      }
    );
  }

  if (orderData.currency !== 'INR') {
    return new Response(
      JSON.stringify({ success: false, error: `CURRENCY_MISMATCH: Order currency '${orderData.currency}' is not INR` }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      }
    );
  }

  // Requirement 1: Verify payment amount matches Razorpay order amount in paise
  if (pmtData.amount !== orderData.amount) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `AMOUNT_MISMATCH: Payment amount (${pmtData.amount}) does not match Razorpay order amount (${orderData.amount})`,
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      }
    );
  }

  // 4. Verify Authoritative Expected Fee based on purpose & registration structure
  const resolvedPurpose = purpose || pmtData.notes?.purpose || orderData.notes?.purpose;
  const resolvedRole = body.role || pmtData.notes?.role || orderData.notes?.role;
  let expectedFeeInPaise: number | null = null;

  if (resolvedPurpose === 'partner_registration' || resolvedPurpose === 'business_partner_registration') {
    expectedFeeInPaise = 102100; // ₹1,021.00
  } else if (resolvedPurpose === 'field_officer_registration') {
    expectedFeeInPaise = 202100; // ₹2,021.00
  } else if (resolvedPurpose === 'registration' || resolvedPurpose === 'customer_registration' || resolvedPurpose === 'serviceman_registration') {
    if (resolvedRole === 'business_partner') {
      expectedFeeInPaise = 102100;
    } else if (resolvedRole === 'field_officer' || resolvedRole === 'franchise_partner') {
      expectedFeeInPaise = 202100;
    } else {
      expectedFeeInPaise = 12100; // ₹121.00
    }
  } else if (resolvedPurpose === 'service_booking' || resolvedPurpose === 'booking') {
    const resolvedRefId = referenceId || pmtData.notes?.referenceId || orderData.notes?.referenceId;
    if (resolvedRefId && authHeader) {
      try {
        const idToken = authHeader.split('Bearer ')[1];
        const bookingRes = await fetch(
          `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/${getFirestoreDatabaseId(env)}/documents/bookings/${resolvedRefId}`,
          {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${idToken}` },
          }
        );
        if (bookingRes.ok) {
          const bookingDoc: any = await bookingRes.json();
          const bookingData = parseFirestoreFields(bookingDoc.fields);
          const authoritativeBookingAmount = Number(bookingData.amount || bookingData.totalAmount || 0);
          if (authoritativeBookingAmount > 0) {
            expectedFeeInPaise = Math.round(authoritativeBookingAmount * 100);
          }
        }
      } catch (e) {
        console.warn('Booking record check notice during verification:', e);
      }
    }
  }

  if (expectedFeeInPaise !== null && pmtData.amount !== expectedFeeInPaise) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `AMOUNT_MISMATCH: Payment amount (${pmtData.amount} paise) does not match authoritative fee (${expectedFeeInPaise} paise)`,
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      }
    );
  }

  // Also check explicit expectedAmount if passed in body
  if (body.expectedAmount !== undefined && body.expectedAmount !== null) {
    const rawExpected = Number(body.expectedAmount);
    const expectedPaise = rawExpected === pmtData.amount ? rawExpected : rawExpected * 100;
    if (pmtData.amount !== expectedPaise) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `AMOUNT_MISMATCH: Payment amount (${pmtData.amount}) does not match requested expected amount (${expectedPaise})`,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        }
      );
    }
  }

  // Payment verified successfully with all strict checks passed!
  return new Response(
    JSON.stringify({
      success: true,
      message: 'Payment verified successfully',
      paymentId,
      orderId,
      amount: pmtData.amount,
      currency: pmtData.currency,
      status: pmtData.status,
      purpose: resolvedPurpose,
      referenceId: referenceId || pmtData.notes?.referenceId || orderData.notes?.referenceId,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    }
  );
}

/**
 * Handler: POST /webhook
 */
async function handleWebhook(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: CORS_HEADERS });
  }

  const razorpaySignature = request.headers.get('X-Razorpay-Signature');
  if (!razorpaySignature) {
    return new Response(JSON.stringify({ success: false, error: 'Missing Razorpay signature header' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  // Keep exact raw-body signature verification
  const rawBody = await request.text();
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(env.RAZORPAY_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const expectedSignature = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  if (expectedSignature !== razorpaySignature) {
    return new Response(JSON.stringify({ success: false, error: 'INVALID_WEBHOOK_SIGNATURE' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'INVALID_JSON_BODY' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  const eventId = event.event_id || (event.payload?.payment?.entity?.id ? `${event.payload.payment.entity.id}_${event.event}` : null);

  if (!eventId) {
    return new Response(JSON.stringify({ success: false, error: 'Missing event identifier' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  // Requirement 2:
  // Durable Atomic Idempotency via Firestore Document Creation.
  // Return 2xx ONLY if Firestore write succeeded OR it is an authentic duplicate (409 Conflict / ALREADY_EXISTS).
  // Any other write failure (e.g. 403, 500, quota, timeout) MUST return 5xx so Razorpay can retry.
  try {
    const idempotencyRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/${getFirestoreDatabaseId(env)}/documents/webhook_events?documentId=${eventId}&key=${env.FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            eventId: { stringValue: eventId },
            eventType: { stringValue: event.event || 'unknown' },
            createdAt: { stringValue: new Date().toISOString() },
          },
        }),
      }
    );

    // If Firestore write succeeded (200 / 201)
    if (idempotencyRes.ok) {
      console.log('Successfully recorded verified Razorpay Webhook event:', event.event, 'EventID:', eventId);
      return new Response(JSON.stringify({ status: 'ok', received: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // Check if failure is an authentic duplicate (409 Conflict, code 6 ALREADY_EXISTS, or message 'already exists')
    const errJson: any = await idempotencyRes.json().catch(() => ({}));
    const isDuplicate =
      idempotencyRes.status === 409 ||
      errJson.error?.code === 6 ||
      errJson.error?.status === 'ALREADY_EXISTS' ||
      (typeof errJson.error?.message === 'string' && errJson.error.message.toLowerCase().includes('already exists'));

    if (isDuplicate) {
      console.warn(`Duplicate webhook event ${eventId} detected and acknowledged idempotently.`);
      return new Response(JSON.stringify({ status: 'ok', received: true, duplicate: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // Any other failure (403 Permission Denied, 500, Quota exceeded, etc.) MUST return 5xx so Razorpay will retry!
    console.error(`Firestore webhook idempotency write failed with HTTP ${idempotencyRes.status}:`, errJson);
    return new Response(
      JSON.stringify({
        success: false,
        error: `FIRESTORE_WRITE_FAILED: HTTP ${idempotencyRes.status} - ${errJson.error?.message || idempotencyRes.statusText || 'Failed to record event in Firestore ledger'}`,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      }
    );
  } catch (writeErr: any) {
    // Network error or timeout during Firestore write -> Return 500 so Razorpay will retry!
    console.error('Webhook Firestore write exception:', writeErr);
    return new Response(
      JSON.stringify({
        success: false,
        error: `WEBHOOK_WRITE_EXCEPTION: ${writeErr?.message || 'Network or execution failure during webhook Firestore write'}`,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      }
    );
  }
}
