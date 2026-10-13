import crypto from 'crypto';
import express, { Request, Response } from 'express';

// Test suite for Hardinkaam Razorpay Backend

export function buildPaymentApp(mockFirestore?: any, mockRazorpay?: any) {
  const app = express();
  app.disable('x-powered-by');

  app.use(express.json({
    limit: '100kb',
    verify(req: any, res, buf) {
      req.rawBody = Buffer.from(buf);
    },
  }));

  function safeEqualHex(a?: string, b?: string) {
    if (
      typeof a !== 'string' ||
      typeof b !== 'string' ||
      !/^[a-f0-9]+$/i.test(a) ||
      !/^[a-f0-9]+$/i.test(b)
    ) return false;
    const left = Buffer.from(a, 'hex');
    const right = Buffer.from(b, 'hex');
    return left.length === right.length &&
      left.length > 0 &&
      crypto.timingSafeEqual(left, right);
  }

  const REGISTRATION_FEES: Record<string, number> = {
    customer: 12100, // ₹121 in paise
    serviceman: 12100, // ₹121 in paise
    service_pro: 12100, // ₹121 in paise
    business_partner: 102100, // ₹1,021 in paise
  };

  app.post(['/api/create-order', '/api/razorpay/order'], async (req: Request, res: Response) => {
    try {
      const {
        amount,
        currency = 'INR',
        receipt,
        notes = {},
        purpose = 'service_booking',
        role,
        bookingId,
      } = req.body || {};

      let parsedAmount: number;

      // 1. Enforce Registration Fees Server-Side
      if (purpose === 'registration_fee') {
        if (!role) {
          return res.status(400).json({ error: 'Role is required for registration fee.' });
        }
        const expectedFee = REGISTRATION_FEES[role];
        if (!expectedFee) {
          return res.status(400).json({ error: 'Unsupported registration role.' });
        }
        if (amount !== undefined && Number(amount) !== expectedFee) {
          return res.status(400).json({ error: 'Invalid registration amount for role.' });
        }
        parsedAmount = expectedFee;
      }
      // 2. Enforce Booking Payments Server-Side using trusted Firestore record
      else if (purpose === 'booking' || purpose === 'service_booking' || bookingId) {
        const targetBookingId = bookingId || notes.bookingId;
        if (!targetBookingId) {
          return res.status(400).json({ error: 'bookingId is required for service booking payments.' });
        }

        if (!mockFirestore) {
          return res.status(503).json({ error: 'Booking database is unavailable.' });
        }

        const bSnap = await mockFirestore.collection('bookings').doc(targetBookingId).get();
        if (!bSnap || !bSnap.exists) {
          return res.status(404).json({ error: 'Booking record not found.' });
        }

        const bData = bSnap.data();
        const authoritativeGross = Number(bData?.totalAmount ?? bData?.amount ?? 0);
        if (!Number.isFinite(authoritativeGross) || authoritativeGross <= 0) {
          return res.status(400).json({ error: 'Invalid booking amount on record.' });
        }

        const expectedPaise = Math.round(authoritativeGross * 100);
        if (amount !== undefined && Number(amount) !== expectedPaise) {
          return res.status(400).json({ error: 'Submitted amount does not match authoritative booking amount.' });
        }
        parsedAmount = expectedPaise;
      } else {
        return res.status(400).json({ error: 'Invalid payment purpose.' });
      }

      if (currency !== 'INR' || !Number.isSafeInteger(parsedAmount) || parsedAmount < 100) {
        return res.status(400).json({ error: 'Invalid amount or currency.' });
      }

      // Create Razorpay Order
      const rzp = mockRazorpay;
      const order = await rzp.orders.create({
        amount: parsedAmount,
        currency: 'INR',
        receipt: receipt || `hdk_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        notes: {
          ...(typeof notes === 'object' ? notes : {}),
          purpose,
          role: role || 'customer',
          ...(bookingId ? { bookingId } : {}),
        },
      });

      return res.json({
        success: true,
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
        key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_public_key',
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Unable to create payment order.' });
    }
  });

  app.post(['/api/verify-payment', '/api/razorpay/verify'], async (req: Request, res: Response) => {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        bookingId,
      } = req.body || {};

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({
          success: false,
          error: 'Missing payment verification parameters.',
        });
      }

      const secret = process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_test';
      const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (!safeEqualHex(expectedSig, razorpay_signature)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid payment signature.',
        });
      }

      const [payment, order] = await Promise.all([
        mockRazorpay.payments.fetch(razorpay_payment_id),
        mockRazorpay.orders.fetch(razorpay_order_id),
      ]);

      if (
        payment.order_id !== razorpay_order_id ||
        order.id !== razorpay_order_id ||
        payment.status !== 'captured' ||
        order.status !== 'paid' ||
        payment.currency !== 'INR' ||
        order.currency !== 'INR' ||
        payment.amount !== order.amount
      ) {
        return res.status(409).json({
          success: false,
          error: 'Payment is not confirmed as captured for this order.',
        });
      }

      const targetBookingId = bookingId || order.notes?.bookingId;
      if (targetBookingId && mockFirestore) {
        const bSnap = await mockFirestore.collection('bookings').doc(targetBookingId).get();
        if (bSnap?.exists) {
          const bData = bSnap.data();
          const expectedPaise = Math.round(Number(bData.totalAmount ?? bData.amount) * 100);
          if (payment.amount !== expectedPaise) {
            return res.status(409).json({
              success: false,
              error: 'Payment amount mismatch with authoritative booking amount.',
            });
          }
          await mockFirestore.collection('bookings').doc(targetBookingId).update({
            paymentStatus: 'paid',
            razorpayPaymentId: payment.id,
            razorpayOrderId: order.id,
            paidAt: new Date().toISOString(),
          });
        }
      }

      return res.json({
        success: true,
        message: 'Razorpay payment verified.',
        payment_id: payment.id,
        order_id: order.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err.message || 'Unable to verify payment.',
      });
    }
  });

  app.post('/api/razorpay/webhook', async (req: Request, res: Response) => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_whsec_test';
    const receivedSig = req.get('x-razorpay-signature');
    const rawBody = (req as any).rawBody;

    if (!webhookSecret || !rawBody || !receivedSig) {
      return res.status(400).json({ error: 'Invalid webhook request.' });
    }

    const expectedSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (!safeEqualHex(expectedSig, receivedSig)) {
      return res.status(401).json({ error: 'Invalid webhook signature.' });
    }

    const eventId = req.get('x-razorpay-event-id') || req.body?.event_id || req.body?.id;
    if (!eventId) {
      return res.status(400).json({ error: 'Missing webhook event details.' });
    }

    // Idempotent Deduplication Check
    if (mockFirestore) {
      const eventDocRef = mockFirestore.collection('webhook_events').doc(eventId);
      const eventSnap = await eventDocRef.get();
      if (eventSnap && eventSnap.exists) {
        return res.status(200).json({ received: true, duplicate: true, eventId });
      }
      await eventDocRef.set({
        eventId,
        event: req.body?.event,
        receivedAt: new Date().toISOString(),
        status: 'processed',
      });
    }

    return res.status(200).json({ received: true, duplicate: false, eventId });
  });

  return app;
}
