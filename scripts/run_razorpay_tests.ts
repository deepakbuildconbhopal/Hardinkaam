import http from 'http';
import crypto from 'crypto';
import { buildPaymentApp } from './test_razorpay_suite';

async function main() {
  console.log('--- STARTING FOCUSED RAZORPAY TEST SUITE ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${msg}`);
      failed++;
    }
  }

  // Set mock environment
  process.env.RAZORPAY_KEY_ID = 'rzp_test_public_123';
  process.env.RAZORPAY_KEY_SECRET = 'rzp_secret_456';
  process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_789';

  // Mock In-Memory Firestore
  const mockDbState: Record<string, Record<string, any>> = {
    bookings: {
      'bk_valid_100': {
        amount: 500,
        totalAmount: 500,
        service: 'Electrician Fan Repair',
        paymentStatus: 'pending',
      },
    },
    webhook_events: {},
  };

  const mockFirestore = {
    collection: (col: string) => ({
      doc: (docId: string) => ({
        get: async () => ({
          exists: !!mockDbState[col]?.[docId],
          data: () => mockDbState[col]?.[docId],
        }),
        set: async (data: any) => {
          if (!mockDbState[col]) mockDbState[col] = {};
          mockDbState[col][docId] = data;
        },
        update: async (data: any) => {
          if (!mockDbState[col]) mockDbState[col] = {};
          mockDbState[col][docId] = { ...(mockDbState[col][docId] || {}), ...data };
        },
      }),
    }),
  };

  // Mock Razorpay SDK
  const mockRazorpay = {
    orders: {
      create: async (params: any) => ({
        id: `order_${Date.now()}_test`,
        amount: params.amount,
        currency: params.currency,
        status: 'created',
        receipt: params.receipt,
        notes: params.notes,
      }),
      fetch: async (orderId: string) => ({
        id: orderId,
        amount: 50000,
        currency: 'INR',
        status: 'paid',
        notes: { bookingId: 'bk_valid_100' },
      }),
    },
    payments: {
      fetch: async (pmtId: string) => {
        if (pmtId === 'pay_failed') {
          return { id: pmtId, order_id: 'order_test', status: 'failed', currency: 'INR', amount: 50000 };
        }
        if (pmtId === 'pay_amount_mismatch') {
          return { id: pmtId, order_id: 'order_test', status: 'captured', currency: 'INR', amount: 10000 };
        }
        return {
          id: pmtId,
          order_id: 'order_test',
          status: 'captured',
          currency: 'INR',
          amount: 50000,
        };
      },
    },
  };

  const app = buildPaymentApp(mockFirestore, mockRazorpay);
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  async function postJson(endpoint: string, body: any, headers: Record<string, string> = {}) {
    const raw = Buffer.from(JSON.stringify(body), 'utf8');
    const res = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: raw,
    });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, json };
  }

  try {
    // 1. Registration Fee: Unsupported role
    const r1 = await postJson('/api/create-order', {
      purpose: 'registration_fee',
      role: 'super_admin_unsupported',
    });
    assert(r1.status === 400 && r1.json.error?.includes('Unsupported registration role'), 'Rejects unsupported registration role');

    // 2. Registration Fee: Missing role
    const r2 = await postJson('/api/create-order', {
      purpose: 'registration_fee',
    });
    assert(r2.status === 400 && r2.json.error?.includes('Role is required'), 'Rejects registration fee without role');

    // 3. Registration Fee: Invalid client amount for customer (tried ₹50 instead of ₹121)
    const r3 = await postJson('/api/create-order', {
      purpose: 'registration_fee',
      role: 'customer',
      amount: 5000,
    });
    assert(r3.status === 400 && r3.json.error?.includes('Invalid registration amount'), 'Rejects manipulated registration amount');

    // 4. Registration Fee: Valid Customer fee (₹121 = 12100 paise)
    const r4 = await postJson('/api/create-order', {
      purpose: 'registration_fee',
      role: 'customer',
    });
    assert(r4.status === 200 && r4.json.amount === 12100 && r4.json.key_id === 'rzp_test_public_123', 'Creates Customer registration order for ₹121');

    // 5. Registration Fee: Valid ServiceMan fee (₹121 = 12100 paise)
    const r5 = await postJson('/api/create-order', {
      purpose: 'registration_fee',
      role: 'serviceman',
    });
    assert(r5.status === 200 && r5.json.amount === 12100, 'Creates ServiceMan registration order for ₹121');

    // 6. Registration Fee: Valid Business Partner fee (₹1,021 = 102100 paise)
    const r6 = await postJson('/api/create-order', {
      purpose: 'registration_fee',
      role: 'business_partner',
    });
    assert(r6.status === 200 && r6.json.amount === 102100, 'Creates Business Partner registration order for ₹1,021');

    // 7. Booking: Missing bookingId
    const b1 = await postJson('/api/create-order', {
      purpose: 'booking',
      amount: 50000,
    });
    assert(b1.status === 400 && b1.json.error?.includes('bookingId is required'), 'Rejects booking payment without bookingId');

    // 8. Booking: Non-existent bookingId
    const b2 = await postJson('/api/create-order', {
      purpose: 'booking',
      bookingId: 'bk_does_not_exist',
    });
    assert(b2.status === 404 && b2.json.error?.includes('not found'), 'Rejects non-existent bookingId');

    // 9. Booking: Browser attempts arbitrary tampered price (₹1 instead of authoritative ₹500)
    const b3 = await postJson('/api/create-order', {
      purpose: 'booking',
      bookingId: 'bk_valid_100',
      amount: 100, // 100 paise = ₹1
    });
    assert(b3.status === 400 && b3.json.error?.includes('does not match authoritative'), 'Rejects tampered booking amount submitted by browser');

    // 10. Booking: Authoritative ₹500 order created from server record
    const b4 = await postJson('/api/create-order', {
      purpose: 'booking',
      bookingId: 'bk_valid_100',
    });
    assert(b4.status === 200 && b4.json.amount === 50000, 'Enforces authoritative booking price (₹500 / 50000 paise) from server record');

    // 11. Payment Verification: Invalid signature
    const v1 = await postJson('/api/verify-payment', {
      razorpay_order_id: 'order_test',
      razorpay_payment_id: 'pay_123',
      razorpay_signature: 'fake_tampered_signature_hex_1234567890abcdef',
    });
    assert(v1.status === 400 && v1.json.error?.includes('Invalid payment signature'), 'Rejects invalid HMAC-SHA256 signature');

    // 12. Payment Verification: Valid HMAC signature but payment status not captured
    const secret = process.env.RAZORPAY_KEY_SECRET!;
    const failedPmtSig = crypto.createHmac('sha256', secret).update('order_test|pay_failed').digest('hex');
    const v2 = await postJson('/api/verify-payment', {
      razorpay_order_id: 'order_test',
      razorpay_payment_id: 'pay_failed',
      razorpay_signature: failedPmtSig,
    });
    assert(v2.status === 409 && v2.json.error?.includes('not confirmed as captured'), 'Rejects uncaptured / failed payment status');

    // 13. Payment Verification: Valid signature with captured payment
    const validSig = crypto.createHmac('sha256', secret).update('order_test|pay_valid_123').digest('hex');
    const v3 = await postJson('/api/verify-payment', {
      razorpay_order_id: 'order_test',
      razorpay_payment_id: 'pay_valid_123',
      razorpay_signature: validSig,
      bookingId: 'bk_valid_100',
    });
    assert(v3.status === 200 && v3.json.success === true && mockDbState.bookings['bk_valid_100'].paymentStatus === 'paid', 'Verifies valid captured payment and marks booking paid in Firestore');

    // 14. Webhook: Invalid webhook signature
    const w1 = await postJson('/api/razorpay/webhook', { event: 'payment.captured' }, {
      'x-razorpay-signature': 'invalid_signature_hex',
      'x-razorpay-event-id': 'evt_123',
    });
    assert(w1.status === 401 && w1.json.error?.includes('Invalid webhook signature'), 'Rejects webhook with invalid signature');

    // 15. Webhook: Valid signature first delivery
    const whSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;
    const whBody = { event: 'payment.captured', id: 'evt_test_first' };
    const whBodyStr = JSON.stringify(whBody);
    const validWhSig = crypto.createHmac('sha256', whSecret).update(Buffer.from(whBodyStr)).digest('hex');

    const w2 = await postJson('/api/razorpay/webhook', whBody, {
      'x-razorpay-signature': validWhSig,
      'x-razorpay-event-id': 'evt_test_first',
    });
    assert(w2.status === 200 && w2.json.received === true && w2.json.duplicate === false, 'Processes valid webhook event');

    // 16. Webhook: Retry of same event (Idempotency)
    const w3 = await postJson('/api/razorpay/webhook', whBody, {
      'x-razorpay-signature': validWhSig,
      'x-razorpay-event-id': 'evt_test_first',
    });
    assert(w3.status === 200 && w3.json.received === true && w3.json.duplicate === true, 'Handles webhook retry idempotently without reprocessing');

    // 17. Security: No secrets leaked in response
    const leakedSecrets = JSON.stringify([r4.json, v3.json, w2.json]).includes('rzp_secret_456') ||
                          JSON.stringify([r4.json, v3.json, w2.json]).includes('whsec_789');
    assert(!leakedSecrets, 'Never exposes Key Secret or Webhook Secret in responses');

  } finally {
    server.close();
  }

  console.log(`\nTEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Test runner encountered error:', err);
  process.exit(1);
});
