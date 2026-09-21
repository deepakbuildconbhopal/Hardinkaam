import express from 'express';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import multer from 'multer';
import Razorpay from 'razorpay';
import { createServer as createViteServer } from 'vite';
import { db } from './src/firebase/config';
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  runTransaction,
  writeBatch,
  arrayUnion,
} from 'firebase/firestore';
import {
  processZipDeployment,
  rollbackDeployment,
  getDeploymentHistory,
  getCurrentLiveDeployment,
  getJobStatus,
  getNextVersionString,
  validateZipArchive,
  validateZipArchiveAsync,
  checkDuplicateZip,
  retryDeploymentJob,
  preAuditZipBuffer,
  continueDeploymentAudit,
} from './server/deploymentService';

dotenv.config();

const app = express();
const PORT = 3000;

// Body parser
app.use(express.json());

// Configure Multer for secure ZIP uploads in memory (supports up to 100MB archives)
const uploadZip = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: (parseInt(process.env.MAX_DEPLOY_ZIP_SIZE_MB || '100', 10) || 100) * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const isZip =
      file.mimetype === 'application/zip' ||
      file.mimetype === 'application/x-zip-compressed' ||
      file.originalname.toLowerCase().endsWith('.zip');

    if (isZip) {
      cb(null, true);
    } else {
      cb(new Error('Only valid .zip archives are allowed for website deployment.'));
    }
  },
});

// Admin Authorization Middleware for Deployment API
const requireAdminAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization || '';
  const adminEmail = (req.headers['x-admin-email'] as string) || req.body?.adminEmail || (req.query?.adminEmail as string);
  const adminRole = (req.headers['x-admin-role'] as string) || req.body?.adminRole || (req.query?.adminRole as string);

  const authorizedEmails = ['deepakbuildconbhopal@gmail.com', 'admin@hardinkaam.in'];

  const isAuthorized =
    authHeader.length > 10 ||
    adminRole === 'admin' ||
    (adminEmail && authorizedEmails.includes(adminEmail.toLowerCase().trim()));

  if (!isAuthorized) {
    return res.status(403).json({
      success: false,
      error: 'Unauthorized: Deployment and version management requires verified HARDINKAAM Admin access.',
    });
  }
  next();
};

// Lazy-initialized Razorpay client
let razorpayInstance: Razorpay | null = null;

function getRazorpayInstance(): Razorpay {
  const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_TcON4i11rzp3bL';
  const key_secret = process.env.RAZORPAY_KEY_SECRET || 'ZoKwhf1OeEyQdasKYhtQoaw6';

  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id,
      key_secret,
    });
  }
  return razorpayInstance;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

/**
 * STEP 1: BACKEND - Create Order
 * Endpoint: POST /api/create-order
 * Request body: { amount (paise or rupees handled), currency, receipt, notes }
 * Minimum amount: 100 paise (Rs 1)
 */
app.post('/api/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt, notes } = req.body;

    // Validate amount
    const parsedAmount = parseInt(String(amount), 10);
    if (isNaN(parsedAmount) || parsedAmount < 100) {
      return res.status(400).json({
        error: 'Invalid amount. Minimum amount is 100 paise (₹1).',
      });
    }

    const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_TcON4i11rzp3bL';
    const razorpay = getRazorpayInstance();

    const options = {
      amount: parsedAmount, // amount in the smallest currency unit (paise)
      currency: currency || 'INR',
      receipt: receipt || `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      notes: notes || {},
    };

    const order = await razorpay.orders.create(options);

    return res.status(200).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status,
      key_id: key_id,
    });
  } catch (err: any) {
    console.error('Error creating Razorpay order:', err);
    if (err?.statusCode === 401 || err?.error?.code === 'BAD_REQUEST_ERROR') {
      return res.status(err.statusCode || 400).json({
        error: err.error?.description || err.message || 'Authentication or validation failed with Razorpay',
      });
    }
    return res.status(500).json({
      error: err.message || 'Failed to create Razorpay order',
    });
  }
});

// Alias for cloud functions route
app.post('/api/razorpay/order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt, notes, purpose, role } = req.body;
    let finalAmount = parseInt(String(amount), 10);

    if (purpose === 'registration_fee' && role) {
      if (role === 'business_partner') finalAmount = 1021 * 100;
      else finalAmount = 121 * 100;
    }

    const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_TcON4i11rzp3bL';
    const razorpay = getRazorpayInstance();

    const order = await razorpay.orders.create({
      amount: finalAmount,
      currency: currency || 'INR',
      receipt: receipt || `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      notes: { ...(notes || {}), purpose: purpose || 'service_booking', role: role || 'customer' },
    });

    return res.status(200).json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status,
      key_id: key_id,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * STEP 3: BACKEND - Verify Signature
 * Endpoint: POST /api/verify-payment & /api/razorpay/verify
 * Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
 * Compare generated signature with razorpay_signature
 */
app.post(['/api/verify-payment', '/api/razorpay/verify'], (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing required payment verification parameters (order_id, payment_id, signature)',
      });
    }

    const key_secret = process.env.RAZORPAY_KEY_SECRET || 'ZoKwhf1OeEyQdasKYhtQoaw6';

    // Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generated_signature = crypto
      .createHmac('sha256', key_secret)
      .update(payload)
      .digest('hex');

    // Secure constant-time comparison
    const isMatch = crypto.timingSafeEqual(
      Buffer.from(generated_signature, 'utf8'),
      Buffer.from(razorpay_signature, 'utf8')
    );

    if (isMatch) {
      return res.status(200).json({
        success: true,
        message: 'Payment signature verified successfully',
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed: Signature mismatch',
      });
    }
  } catch (err: any) {
    console.error('Error verifying Razorpay payment:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error verifying signature',
    });
  }
});

/**
 * HARDINKAAM ADVANCED SERVICE TRACKING: ARRIVAL OTP SYSTEM
 * Server-authoritative generation and verification
 */
const ARRIVAL_OTP_SALT = 'HARDINKAAM_ARRIVAL_OTP_SALT_2026';

function computeArrivalOtpHash(bookingId: string, otp: string): string {
  return crypto
    .createHash('sha256')
    .update(`${bookingId.trim()}:${otp.trim()}:${ARRIVAL_OTP_SALT}`)
    .digest('hex');
}

/**
 * Endpoint: POST /api/bookings/generate-arrival-otp
 * Generates secure arrival OTP, hashes with SHA-256 and stores hash on booking.
 * Returns plaintext OTP only to customer response.
 */
app.post('/api/bookings/generate-arrival-otp', async (req, res) => {
  try {
    const { bookingId, customerId } = req.body;
    if (!bookingId) {
      return res.status(400).json({ success: false, error: 'Missing bookingId' });
    }

    const bookingRef = doc(db, 'bookings', bookingId);
    const snap = await getDoc(bookingRef);
    if (!snap.exists()) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const booking = snap.data();
    if (customerId && booking.customerId && booking.customerId !== customerId) {
      return res.status(403).json({ success: false, error: 'Unauthorized customer' });
    }

    // Generate 6-digit cryptographically random numerical code
    const code = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 25 * 60 * 1000).toISOString();
    const hash = computeArrivalOtpHash(bookingId, code);
    const nowIso = new Date().toISOString();

    await updateDoc(bookingRef, {
      arrivalOtpHash: hash,
      otpExpiresAt: expiresAt,
      otpAttempts: 0,
      trackingStatus: 'otp_pending',
      updatedAt: nowIso,
    });

    return res.status(200).json({
      success: true,
      arrivalOtp: code,
      expiresAt,
    });
  } catch (err: any) {
    console.error('Error generating arrival OTP:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

/**
 * Endpoint: POST /api/bookings/verify-arrival-otp
 * Server-authoritative OTP verification.
 * Only after verification does booking transition to WORK_STARTED.
 */
app.post('/api/bookings/verify-arrival-otp', async (req, res) => {
  try {
    const { bookingId, enteredOtp, serviceManId } = req.body;
    if (!bookingId || !enteredOtp) {
      return res.status(400).json({ success: false, error: 'Missing bookingId or enteredOtp' });
    }

    const cleanOtp = String(enteredOtp).trim();
    if (!/^\d{4,6}$/.test(cleanOtp)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid OTP format. Must be a valid numerical code.',
      });
    }

    const bookingRef = doc(db, 'bookings', bookingId);
    const snap = await getDoc(bookingRef);
    if (!snap.exists()) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const booking = snap.data();

    // Verify assigned technician
    if (serviceManId && booking.serviceManId && booking.serviceManId !== serviceManId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Only assigned service professional can verify arrival.',
      });
    }

    // If already verified
    if (
      booking.status === 'in_progress' ||
      booking.status === 'work_started' ||
      booking.workStartedAt
    ) {
      return res.status(200).json({
        success: true,
        message: 'OTP already verified. Work is in progress.',
        workStartedAt: booking.workStartedAt || booking.startedAt,
      });
    }

    // Check attempts limit (Max 5 attempts)
    const attempts = booking.otpAttempts || 0;
    if (attempts >= 5) {
      return res.status(400).json({
        success: false,
        isLocked: true,
        error:
          'Too many incorrect attempts. Please ask customer to refresh their screen for a new OTP.',
      });
    }

    // Check expiration
    if (booking.otpExpiresAt && new Date(booking.otpExpiresAt).getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        isExpired: true,
        error: 'Arrival OTP has expired. Customer must refresh to get a new code.',
      });
    }

    const expectedHash = booking.arrivalOtpHash;
    const computedHash = computeArrivalOtpHash(bookingId, cleanOtp);

    let isMatch = false;
    if (expectedHash && expectedHash.length === computedHash.length) {
      try {
        isMatch = crypto.timingSafeEqual(
          Buffer.from(expectedHash, 'hex'),
          Buffer.from(computedHash, 'hex')
        );
      } catch {
        isMatch = expectedHash === computedHash;
      }
    } else if (booking.otp && String(booking.otp).trim() === cleanOtp) {
      isMatch = true;
    }

    const nowIso = new Date().toISOString();

    if (!isMatch) {
      const newAttempts = attempts + 1;
      await updateDoc(bookingRef, {
        otpAttempts: newAttempts,
        updatedAt: nowIso,
      });
      const remaining = Math.max(0, 5 - newAttempts);
      return res.status(400).json({
        success: false,
        error:
          remaining > 0
            ? `Incorrect OTP. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`
            : 'Maximum attempts exceeded. Code locked.',
        attemptsRemaining: remaining,
        isLocked: remaining <= 0,
      });
    }

    // Successful verification: Atomically transition to WORK_STARTED and invalidate OTP for one-time use
    await updateDoc(bookingRef, {
      status: 'in_progress',
      trackingStatus: 'WORK_STARTED',
      workStatus: 'in_progress',
      otpVerifiedAt: nowIso,
      workStartedAt: nowIso,
      startedAt: nowIso,
      arrivalOtpHash: null,
      arrivalOtp: null,
      otp: null,
      baseAmount: booking.baseAmount !== undefined ? booking.baseAmount : (booking.amount || 0),
      deliveryStatus: 'in_progress',
      otpAttempts: 0,
      updatedAt: nowIso,
    });

    // Phase 8: Update existing tracking status to WORK_STARTED in serviceTracking collection
    try {
      const trackingRef = doc(db, 'serviceTracking', bookingId);
      await updateDoc(trackingRef, {
        status: 'WORK_STARTED',
        lastUpdatedAt: nowIso,
      });
    } catch (trackErr) {
      console.warn('Could not update serviceTracking document to WORK_STARTED:', trackErr);
    }

    // Add audit log
    try {
      await addDoc(collection(db, 'audit_logs'), {
        action: 'ARRIVAL_OTP_VERIFIED',
        bookingId,
        serviceManId: serviceManId || booking.serviceManId || null,
        customerId: booking.customerId,
        verifiedAt: nowIso,
        districtId: booking.districtId || null,
        createdAt: nowIso,
      });
    } catch (auditErr) {
      console.warn('Could not write audit log:', auditErr);
    }

    // Add notification for customer
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: booking.customerId,
        title: 'Work Started',
        message: `Arrival OTP verified. Service professional ${
          booking.serviceManName || ''
        } has started work.`,
        bookingId,
        type: 'work_started',
        isRead: false,
        createdAt: nowIso,
      });
    } catch (notifErr) {
      console.warn('Could not write notification:', notifErr);
    }

    return res.status(200).json({
      success: true,
      message: 'OTP Verified ✓',
      workStartedAt: nowIso,
    });
  } catch (err: any) {
    console.error('Error verifying arrival OTP:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

/**
 * Endpoint: POST /api/bookings/propose-extra-charge
 * Service Professional proposes an additional charge (material or service).
 * Stored with status 'pending' awaiting Customer Approval.
 * Does NOT alter final payable amount until customer approves.
 */
app.post('/api/bookings/propose-extra-charge', async (req, res) => {
  try {
    const {
      bookingId,
      serviceManId,
      serviceManName,
      type,
      description,
      quantity,
      unitPrice,
      notes,
    } = req.body;

    if (!bookingId || !serviceManId || !description || unitPrice === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: bookingId, serviceManId, description, unitPrice',
      });
    }

    const cleanDescription = String(description).trim();
    if (cleanDescription.length < 2 || cleanDescription.length > 200) {
      return res.status(400).json({
        success: false,
        error: 'Description must be between 2 and 200 characters.',
      });
    }

    const numQuantity = Math.max(1, Math.round(Number(quantity) || 1));
    const numUnitPrice = Math.max(0, Math.round(Number(unitPrice) || 0));
    const calculatedTotal = numQuantity * numUnitPrice;

    const bookingRef = doc(db, 'bookings', bookingId);
    const snap = await getDoc(bookingRef);
    if (!snap.exists()) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const booking = snap.data();

    // Verify assigned technician
    if (booking.serviceManId && booking.serviceManId !== serviceManId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Only the assigned service professional can propose extra charges.',
      });
    }

    // Verify booking is in progress
    if (booking.status !== 'in_progress' && booking.status !== 'work_started' && booking.trackingStatus !== 'work_started') {
      return res.status(400).json({
        success: false,
        error: 'Extra charges can only be proposed while service work is actively in progress.',
      });
    }

    const nowIso = new Date().toISOString();
    const newChargeId = `chg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newCharge = {
      id: newChargeId,
      type: (type === 'service' || type === 'material') ? type : 'material',
      description: cleanDescription,
      quantity: numQuantity,
      unitPrice: numUnitPrice,
      total: calculatedTotal,
      addedBy: serviceManId,
      addedByName: serviceManName || booking.serviceManName || 'Service Professional',
      addedAt: nowIso,
      status: 'pending', // Pending customer approval
      notes: notes ? String(notes).trim() : undefined,
    };

    const currentCharges = Array.isArray(booking.extraCharges) ? booking.extraCharges : [];
    const updatedCharges = [...currentCharges, newCharge];

    await updateDoc(bookingRef, {
      extraCharges: updatedCharges,
      updatedAt: nowIso,
    });

    // Notify customer in real-time
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: booking.customerId,
        title: 'Additional Charge Proposed',
        message: `${booking.serviceManName || 'Service Professional'} proposed an additional charge: ${cleanDescription} (₹${calculatedTotal}). Please review and approve or reject.`,
        bookingId,
        chargeId: newChargeId,
        type: 'extra_charge_proposed',
        isRead: false,
        createdAt: nowIso,
      });
    } catch (notifErr) {
      console.warn('Could not write notification:', notifErr);
    }

    // Audit log
    try {
      await addDoc(collection(db, 'audit_logs'), {
        action: 'EXTRA_CHARGE_PROPOSED',
        bookingId,
        chargeId: newChargeId,
        serviceManId,
        amount: calculatedTotal,
        description: cleanDescription,
        status: 'pending',
        timestamp: nowIso,
      });
    } catch (auditErr) {
      console.warn('Could not write audit log:', auditErr);
    }

    return res.status(200).json({
      success: true,
      message: 'Extra charge proposed successfully. Awaiting customer approval.',
      charge: newCharge,
      extraCharges: updatedCharges,
    });
  } catch (err: any) {
    console.error('Error proposing extra charge:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

/**
 * Endpoint: POST /api/bookings/respond-extra-charge
 * Customer approves or rejects a proposed extra charge.
 * Records approval status, approvedBy, approvedAt.
 */
app.post('/api/bookings/respond-extra-charge', async (req, res) => {
  try {
    const { bookingId, customerId, chargeId, decision, rejectionReason } = req.body;

    if (!bookingId || !customerId || !chargeId || !decision) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: bookingId, customerId, chargeId, decision',
      });
    }

    if (decision !== 'approve' && decision !== 'reject' && decision !== 'approved' && decision !== 'rejected') {
      return res.status(400).json({
        success: false,
        error: "Decision must be either 'approve' or 'reject'.",
      });
    }

    const isApproved = decision === 'approve' || decision === 'approved';
    const bookingRef = doc(db, 'bookings', bookingId);
    const snap = await getDoc(bookingRef);
    if (!snap.exists()) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const booking = snap.data();

    // Verify customer authorization
    if (booking.customerId && booking.customerId !== customerId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Only the customer who booked this service can approve or reject charges.',
      });
    }

    const charges: any[] = Array.isArray(booking.extraCharges) ? booking.extraCharges : [];
    const chargeIndex = charges.findIndex((c) => c.id === chargeId);
    if (chargeIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Charge item not found in booking.',
      });
    }

    const targetCharge = charges[chargeIndex];
    const nowIso = new Date().toISOString();

    const updatedTarget = {
      ...targetCharge,
      status: isApproved ? 'approved' : 'rejected',
      approvedBy: isApproved ? customerId : undefined,
      approvedAt: isApproved ? nowIso : undefined,
      rejectionReason: !isApproved ? (rejectionReason || 'Declined by customer') : undefined,
      respondedAt: nowIso,
    };

    const updatedCharges = [...charges];
    updatedCharges[chargeIndex] = updatedTarget;

    await updateDoc(bookingRef, {
      extraCharges: updatedCharges,
      updatedAt: nowIso,
    });

    // Notify Service Professional
    try {
      if (booking.serviceManId) {
        await addDoc(collection(db, 'notifications'), {
          userId: booking.serviceManId,
          title: isApproved ? 'Extra Charge Approved ✓' : 'Extra Charge Declined ✕',
          message: `Customer ${isApproved ? 'approved' : 'declined'} the charge for "${targetCharge.description}" (₹${targetCharge.total}).`,
          bookingId,
          type: isApproved ? 'extra_charge_approved' : 'extra_charge_rejected',
          isRead: false,
          createdAt: nowIso,
        });
      }
    } catch (notifErr) {
      console.warn('Could not write notification:', notifErr);
    }

    // Audit log
    try {
      await addDoc(collection(db, 'audit_logs'), {
        action: isApproved ? 'EXTRA_CHARGE_APPROVED' : 'EXTRA_CHARGE_REJECTED',
        bookingId,
        chargeId,
        customerId,
        amount: targetCharge.total,
        status: isApproved ? 'approved' : 'rejected',
        timestamp: nowIso,
      });
    } catch (auditErr) {
      console.warn('Could not write audit log:', auditErr);
    }

    return res.status(200).json({
      success: true,
      message: isApproved ? 'Charge approved successfully.' : 'Charge rejected.',
      charge: updatedTarget,
      extraCharges: updatedCharges,
    });
  } catch (err: any) {
    console.error('Error responding to extra charge:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

/**
 * Format duration into human readable string
 */
function formatWorkDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00 (${hours}h ${mins}m)`;
  }
  return `00:${mins.toString().padStart(2, '0')}:00 (${mins} mins)`;
}

/**
 * Endpoint: POST /api/bookings/complete-work
 * Server-authoritative service completion, work timer stop, transparent charges calculation,
 * and immutable HARDINKAAM SERVICE BILL snapshot generation.
 */
app.post('/api/bookings/complete-work', async (req, res) => {
  try {
    const { bookingId, serviceManId, notes } = req.body;

    if (!bookingId || !serviceManId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: bookingId, serviceManId',
      });
    }

    const bookingRef = doc(db, 'bookings', bookingId);
    const snap = await getDoc(bookingRef);
    if (!snap.exists()) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const booking = snap.data();

    // Verify assigned technician
    if (booking.serviceManId && booking.serviceManId !== serviceManId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Only the assigned service professional can complete this booking.',
      });
    }

    // Already completed guard
    if (booking.status === 'completed' && booking.finalBill) {
      return res.status(200).json({
        success: true,
        message: 'Service is already marked as completed.',
        finalBill: booking.finalBill,
        finalAmount: booking.finalAmount || booking.amount,
      });
    }

    const nowIso = new Date().toISOString();
    const workStartedAt = booking.workStartedAt || booking.startedAt || booking.otpVerifiedAt || nowIso;
    const workEndedAt = nowIso;

    // Calculate duration strictly from server timestamps
    const startTimeMs = new Date(workStartedAt).getTime();
    const endTimeMs = new Date(workEndedAt).getTime();
    const elapsedMs = Math.max(0, endTimeMs - startTimeMs);
    const workDurationMinutes = Math.max(1, Math.round(elapsedMs / (60 * 1000)));
    const formattedDuration = formatWorkDuration(workDurationMinutes);

    // 1. Base Service Charge (Server-Authoritative)
    const baseAmount = Math.max(0, Number(booking.baseAmount !== undefined ? booking.baseAmount : (booking.amount || 0)));

    // 2. Extra charges (Strictly ONLY approved ones are factored in)
    const allCharges: any[] = Array.isArray(booking.extraCharges) ? booking.extraCharges : [];
    const approvedCharges = allCharges.filter((c) => c.status === 'approved');

    const extraServicesAmount = approvedCharges
      .filter((c) => c.type === 'service')
      .reduce((sum, c) => sum + Math.max(0, Number(c.total) || 0), 0);

    const materialsAmount = approvedCharges
      .filter((c) => c.type === 'material' || c.type === 'other')
      .reduce((sum, c) => sum + Math.max(0, Number(c.total) || 0), 0);

    // 3. Final gross amount
    const finalAmount = Math.round(baseAmount + extraServicesAmount + materialsAmount);

    // 4. Existing HARDINKAAM business logic for platform split
    // 15% platform commission + 5% tax deduction
    const commissionRate = 15;
    const taxRate = 5;
    const platformChargeAmount = Math.round((finalAmount * commissionRate) / 100);
    const taxAmount = Math.round((finalAmount * taxRate) / 100);
    const servicemanPayoutAmount = Math.max(0, finalAmount - platformChargeAmount - taxAmount);

    // 5. Build transparent itemized line items
    const lineItems: any[] = [
      {
        id: 'li_base',
        label: booking.serviceName || 'Base Service',
        category: 'base_service',
        quantity: 1,
        unitPrice: baseAmount,
        amount: baseAmount,
        notes: booking.categoryName ? `Category: ${booking.categoryName}` : undefined,
      },
    ];

    approvedCharges.forEach((c) => {
      lineItems.push({
        id: `li_${c.id}`,
        label: c.description,
        category: c.type === 'service' ? 'extra_service' : 'material',
        quantity: c.quantity || 1,
        unitPrice: c.unitPrice || c.total,
        amount: c.total,
        notes: `Approved on ${c.approvedAt ? new Date(c.approvedAt).toLocaleTimeString() : 'N/A'}`,
      });
    });

    lineItems.push({
      id: 'li_platform',
      label: 'Applicable Platform & Quality Safety Charge',
      category: 'platform_charge',
      amount: platformChargeAmount,
      notes: `HARDINKAAM Guaranteed Service Fee (${commissionRate}%)`,
    });

    // 6. Generate immutable Bill Snapshot
    const billId = `bill_${bookingId}_${Date.now()}`;
    const billSnapshot = {
      id: billId,
      bookingId,
      customerId: booking.customerId,
      customerName: booking.customerName || 'Valued Customer',
      serviceManId: booking.serviceManId || serviceManId,
      serviceManName: booking.serviceManName || 'Service Professional',
      serviceCategory: booking.categoryName || 'Home Service',
      serviceName: booking.serviceName || 'Home Service',
      districtId: booking.districtId || 'bhopal_central',
      districtName: booking.districtName || 'Bhopal',
      workStartedAt,
      workEndedAt,
      workDurationMinutes,
      workDurationFormatted: formattedDuration,
      baseAmount,
      extraServicesAmount,
      materialsAmount,
      platformChargeAmount,
      taxAmount,
      finalAmount,
      lineItems,
      // Bill generation and payment confirmation are separate states
      // If customer previously prepaid exact base amount and no extra charges were added, remains paid.
      // If extra charges were added or COD was selected, keep unpaid/cod until collected.
      paymentStatus: (booking.paymentStatus === 'paid' && finalAmount === baseAmount)
        ? 'paid'
        : (booking.paymentStatus === 'cod' ? 'cod' : (booking.paymentStatus === 'paid' ? 'unpaid' : (booking.paymentStatus || 'unpaid'))),
      paymentMethod: booking.paymentMethod || 'cash',
      generatedAt: workEndedAt,
      notes: notes ? String(notes).trim() : undefined,
    };

    // 7. Update booking atomically
    await updateDoc(bookingRef, {
      status: 'completed',
      trackingStatus: 'COMPLETED',
      workStatus: 'completed',
      workEndedAt,
      workDurationMinutes,
      workDurationFormatted: formattedDuration,
      finalBill: billSnapshot,
      finalAmount,
      amount: finalAmount,
      baseAmount,
      companyCommission: platformChargeAmount,
      taxDeduction: taxAmount,
      servicemanPayoutAmount,
      completedAt: workEndedAt,
      deliveryStatus: 'verified',
      isVerifiedDelivery: true,
      verifiedAt: workEndedAt,
      isTrackingActive: false, // Stop live tracking / location sharing
      updatedAt: workEndedAt,
    });

    // Phase 8: Update existing tracking status to COMPLETED in serviceTracking collection
    try {
      const trackingRef = doc(db, 'serviceTracking', bookingId);
      await updateDoc(trackingRef, {
        status: 'COMPLETED',
        lastUpdatedAt: workEndedAt,
      });
    } catch (trackErr) {
      console.warn('Could not update serviceTracking document to COMPLETED:', trackErr);
    }

    // 8. Save bill snapshot to 'bills' collection for permanent audit record
    try {
      await setDoc(doc(db, 'bills', billId), billSnapshot);
    } catch (billSaveErr) {
      console.warn('Could not write to bills collection:', billSaveErr);
    }

    // 9. Audit trail
    try {
      await addDoc(collection(db, 'audit_logs'), {
        action: 'WORK_COMPLETED_FINAL_BILL_GENERATED',
        bookingId,
        billId,
        serviceManId,
        customerId: booking.customerId,
        finalAmount,
        baseAmount,
        extraServicesAmount,
        materialsAmount,
        workDurationMinutes,
        timestamp: workEndedAt,
      });
    } catch (auditErr) {
      console.warn('Could not write audit log:', auditErr);
    }

    // 10. Send customer notification
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: booking.customerId,
        title: 'Service Completed & Final Bill Ready',
        message: `Service completed by ${booking.serviceManName || 'professional'}. Total work duration: ${formattedDuration}. Final payable amount: ₹${finalAmount}.`,
        bookingId,
        billId,
        type: 'work_completed',
        isRead: false,
        createdAt: workEndedAt,
      });
    } catch (notifErr) {
      console.warn('Could not write notification:', notifErr);
    }

    return res.status(200).json({
      success: true,
      message: 'Work completed and final bill generated successfully.',
      finalBill: billSnapshot,
      finalAmount,
    });
  } catch (err: any) {
    console.error('Error completing work:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

/**
 * Endpoint: POST /api/bookings/calculate-current-bill
 * Real-time calculation of current transparent breakdown without completing the booking.
 */
app.post('/api/bookings/calculate-current-bill', async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) {
      return res.status(400).json({ success: false, error: 'Missing bookingId' });
    }

    const bookingRef = doc(db, 'bookings', bookingId);
    const snap = await getDoc(bookingRef);
    if (!snap.exists()) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const booking = snap.data();
    const baseAmount = Math.max(0, Number(booking.baseAmount !== undefined ? booking.baseAmount : (booking.amount || 0)));
    const allCharges: any[] = Array.isArray(booking.extraCharges) ? booking.extraCharges : [];

    const approvedCharges = allCharges.filter((c) => c.status === 'approved');
    const pendingCharges = allCharges.filter((c) => c.status === 'pending');

    const extraServicesAmount = approvedCharges
      .filter((c) => c.type === 'service')
      .reduce((sum, c) => sum + Math.max(0, Number(c.total) || 0), 0);

    const materialsAmount = approvedCharges
      .filter((c) => c.type === 'material' || c.type === 'other')
      .reduce((sum, c) => sum + Math.max(0, Number(c.total) || 0), 0);

    const pendingTotal = pendingCharges.reduce((sum, c) => sum + Math.max(0, Number(c.total) || 0), 0);
    const currentEstimatedFinal = Math.round(baseAmount + extraServicesAmount + materialsAmount);

    return res.status(200).json({
      success: true,
      breakdown: {
        baseAmount,
        extraServicesAmount,
        materialsAmount,
        pendingTotal,
        currentEstimatedFinal,
        approvedCount: approvedCharges.length,
        pendingCount: pendingCharges.length,
      },
    });
  } catch (err: any) {
    console.error('Error calculating bill:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

// =============================================================================
// PHASE 2: BOOKING ALERT & ATOMIC ASSIGNMENT BACKEND ENDPOINTS
// =============================================================================

/**
 * Endpoint: POST /api/bookings/dispatch-alert
 * Backend trigger that determines eligible ServiceMen, creates assignment offers,
 * and initiates push notifications without exposing credentials to the client.
 */
app.post(['/api/bookings/dispatch-alert', '/api/booking-offers/create'], async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId || typeof bookingId !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing or invalid bookingId' });
    }

    const bookingRef = doc(db, 'bookings', bookingId);
    const snap = await getDoc(bookingRef);
    if (!snap.exists()) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const booking = snap.data() as any;
    const currentStatus = (booking.status || 'pending').toLowerCase();

    // Idempotency & Lifecycle Guard
    if (['accepted', 'in_progress', 'work_started', 'completed', 'cancelled', 'rejected'].includes(currentStatus)) {
      return res.status(200).json({
        success: false,
        code: 'ALREADY_PROCESSED',
        message: `Booking is already in '${currentStatus}' status. Dispatch skipped.`,
      });
    }

    // Duplicate check: if already dispatched recently, avoid flood
    if (booking.offersDispatched === true && booking.alertDispatchedAt) {
      const elapsedMinutes = (Date.now() - new Date(booking.alertDispatchedAt).getTime()) / (60 * 1000);
      if (elapsedMinutes < 5) {
        return res.status(200).json({
          success: true,
          code: 'ALREADY_DISPATCHED',
          message: `Offers already dispatched ${Math.round(elapsedMinutes)}m ago. Duplicate prevented.`,
        });
      }
    }

    const nowIso = new Date().toISOString();

    // Query all service_men for eligibility
    const prosRef = collection(db, 'service_men');
    const prosSnap = await getDocs(prosRef);

    const bookingDistrictId = (booking.districtId || '').toLowerCase().trim();
    const bookingDistrictName = (booking.districtName || '').toLowerCase().trim();
    const bookingCity = (booking.city || '').toLowerCase().trim();
    const bookingCategoryId = (booking.categoryId || '').trim();

    const eligiblePros: any[] = [];

    prosSnap.forEach((docSnap) => {
      const pro = docSnap.data() as any;
      const proId = docSnap.id;

      // 1. Account status & active check
      const accountStatus = (pro.status || 'active').toLowerCase();
      if (accountStatus === 'suspended' || accountStatus === 'blocked' || accountStatus === 'inactive' || pro.isActive === false) {
        return;
      }

      // 2. Approved / verified according to existing rules
      const isKycVerified = pro.kycStatus === 'verified' || pro.kycStatus === 'approved';
      const isVerifiedFlag = pro.isVerified === true;
      if (!isVerifiedFlag && !isKycVerified) {
        return;
      }

      // 3. Online / Available check
      const isOnline = pro.isAvailable === true;
      const dutyStatus = (pro.dutyStatus || '').toLowerCase();
      if (!isOnline || dutyStatus === 'busy' || accountStatus === 'busy') {
        return;
      }

      // 4. Category / service match
      if (bookingCategoryId && Array.isArray(pro.categoryIds) && pro.categoryIds.length > 0) {
        if (!pro.categoryIds.includes(bookingCategoryId)) {
          return;
        }
      }

      // 5. District / permitted service area match
      if (bookingDistrictId || bookingDistrictName || bookingCity) {
        const proDistrictId = (pro.districtId || pro.assignedDistrictId || '').toLowerCase();
        const proDistrictName = (pro.districtName || pro.assignedDistrictName || '').toLowerCase();
        const proCity = (pro.city || '').toLowerCase();
        const serviceArea = (pro.serviceArea || '').toLowerCase();

        const matchesDistrictId = bookingDistrictId && proDistrictId === bookingDistrictId;
        const matchesDistrictName = bookingDistrictName && (proDistrictName === bookingDistrictName || serviceArea.includes(bookingDistrictName));
        const matchesCity = bookingCity && (proCity === bookingCity || serviceArea.includes(bookingCity));
        const matchesArea = !proDistrictId && !proCity;

        if (!matchesDistrictId && !matchesDistrictName && !matchesCity && !matchesArea) {
          return;
        }
      }

      eligiblePros.push({
        id: proId,
        userId: pro.userId || proId,
        name: pro.name || 'Service Pro',
        phone: pro.phone || '',
        email: pro.email || '',
        fcmTokens: Array.isArray(pro.fcmTokens) ? pro.fcmTokens : (pro.fcmToken ? [pro.fcmToken] : []),
      });
    });

    // Write safe audit log: SERVICEMAN_MATCHED
    try {
      await addDoc(collection(db, 'audit_logs'), {
        action: 'SERVICEMAN_MATCHED',
        bookingId,
        matchedCount: eligiblePros.length,
        timestamp: nowIso,
      });
    } catch (e) {
      console.warn('Audit note:', e);
    }

    if (eligiblePros.length === 0) {
      return res.status(200).json({
        success: true,
        code: 'NO_ELIGIBLE_SERVICEMAN',
        message: 'No available ServiceMen currently matched.',
        offersCount: 0,
      });
    }

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const createdOffers: any[] = [];

    // Create assignment offers & booking_offers in Firestore
    for (const pro of eligiblePros) {
      const offerId = `offer_${bookingId}_${pro.id}`;
      const assignmentId = `asgn_${bookingId}_${pro.id}`;
      const offerRef = doc(db, 'booking_offers', offerId);
      const assignmentRef = doc(db, 'booking_assignments', assignmentId);

      const existingOfferSnap = await getDoc(offerRef);
      if (existingOfferSnap.exists()) {
        const data = existingOfferSnap.data() as any;
        if (['PENDING', 'ACCEPTED'].includes(data.status)) {
          createdOffers.push({ offerId, assignmentId, proId: pro.id, status: data.status });
          continue;
        }
      }

      // Exact Booking Offer schema
      const offerData = {
        offerId,
        bookingId,
        serviceManId: pro.id,
        serviceManName: pro.name,
        serviceManPhone: pro.phone,
        districtId: booking.districtId || '',
        districtName: booking.districtName || booking.city || 'Central',
        serviceId: booking.serviceId || '',
        serviceName: booking.serviceName || '',
        categoryId: booking.categoryId || '',
        categoryName: booking.categoryName || '',
        amount: Number(booking.amount) || 0,
        scheduledDate: booking.scheduledDate || '',
        scheduledTime: booking.scheduledTime || '',
        address: booking.address || '',
        city: booking.city || '',
        pincode: booking.pincode || '',
        customerName: booking.customerName || '',
        customerPhone: booking.customerPhone || '',
        status: 'PENDING',
        createdAt: nowIso,
        expiresAt,
        updatedAt: nowIso,
      };

      await setDoc(offerRef, offerData, { merge: true });

      // Backwards-compatible booking_assignments
      const legacyData = {
        id: assignmentId,
        bookingId,
        serviceManId: pro.id,
        serviceManName: pro.name,
        serviceManPhone: pro.phone,
        district: offerData.districtName,
        districtId: offerData.districtId,
        service: offerData.serviceName,
        serviceId: offerData.serviceId,
        amount: offerData.amount,
        status: 'offered',
        createdAt: nowIso,
        expiresAt,
        updatedAt: nowIso,
      };
      await setDoc(assignmentRef, legacyData, { merge: true });

      // Safe Log: OFFER_CREATED
      try {
        await addDoc(collection(db, 'audit_logs'), {
          action: 'OFFER_CREATED',
          bookingId,
          serviceManId: pro.id,
          offerId,
          assignmentId,
          timestamp: nowIso,
        });
      } catch (e) {
        console.warn('Audit note:', e);
      }

      createdOffers.push({
        offerId,
        assignmentId,
        proId: pro.id,
        status: 'PENDING',
      });
    }

    // Update booking document
    await updateDoc(bookingRef, {
      offersDispatched: true,
      offersCount: createdOffers.length,
      alertDispatchedAt: nowIso,
      updatedAt: nowIso,
    });

    return res.status(200).json({
      success: true,
      code: 'OFFERS_DISPATCHED',
      offersCreated: createdOffers.length,
      offers: createdOffers,
    });
  } catch (err: any) {
    console.error('dispatch-alert error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

/**
 * Endpoint: POST /api/bookings/accept-offer
 * Atomic Server-Authoritative Offer Acceptance to resolve race conditions.
 * Prevents two technicians from ever claiming the same exclusive booking.
 */
app.post(['/api/bookings/accept-offer', '/api/booking-offers/accept'], async (req, res) => {
  try {
    const { bookingId, serviceManId } = req.body;
    const offerId = req.body.offerId || (req.body.assignmentId ? req.body.assignmentId.replace('asgn_', 'offer_') : `offer_${bookingId}_${serviceManId}`);
    const assignmentId = req.body.assignmentId || (req.body.offerId ? req.body.offerId.replace('offer_', 'asgn_') : `asgn_${bookingId}_${serviceManId}`);

    if (!bookingId || !serviceManId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: bookingId, serviceManId',
      });
    }

    const bookingRef = doc(db, 'bookings', bookingId);
    const offerRef = doc(db, 'booking_offers', offerId);
    const assignmentRef = doc(db, 'booking_assignments', assignmentId);
    const nowIso = new Date().toISOString();

    // Atomic Transaction
    const result = await runTransaction(db, async (transaction) => {
      const bookingDoc = await transaction.get(bookingRef);
      if (!bookingDoc.exists()) {
        throw new Error('BOOKING_NOT_FOUND');
      }

      const bookingData = bookingDoc.data() as any;

      // Guard 1: Booking must not already be claimed by someone else
      if (['accepted', 'on_the_way', 'arriving', 'arrived', 'in_progress', 'work_started', 'completed'].includes(bookingData.status)) {
        if (bookingData.serviceManId === serviceManId) {
          return { alreadyAccepted: true, bookingData };
        }
        throw new Error('BOOKING_ALREADY_TAKEN');
      }

      if (['cancelled', 'rejected'].includes(bookingData.status)) {
        throw new Error('BOOKING_UNAVAILABLE');
      }

      // Guard 2: Offer validity check
      const offerDoc = await transaction.get(offerRef);
      let offerData: any = null;

      if (offerDoc.exists()) {
        offerData = offerDoc.data();
      } else {
        const asgnDoc = await transaction.get(assignmentRef);
        if (asgnDoc.exists()) {
          offerData = asgnDoc.data();
        }
      }

      if (!offerData) {
        throw new Error('OFFER_NOT_FOUND');
      }

      // Prevent arbitrary self-assignment
      if (offerData.serviceManId !== serviceManId) {
        throw new Error('UNAUTHORIZED_ASSIGNMENT');
      }

      // Enforce: ONLY PENDING → ACCEPTED allowed for first valid acceptance
      const normalizedStatus = (offerData.status || '').toUpperCase();
      if (normalizedStatus !== 'PENDING' && offerData.status !== 'offered') {
        if (normalizedStatus === 'ACCEPTED' || offerData.status === 'accepted') {
          return { alreadyAccepted: true, bookingData };
        }
        throw new Error('OFFER_NO_LONGER_VALID');
      }

      // Expiry check
      if (offerData.expiresAt && new Date(offerData.expiresAt).getTime() < Date.now()) {
        throw new Error('OFFER_EXPIRED');
      }

      // 1. Assign & Accept Booking
      transaction.update(bookingRef, {
        status: 'accepted',
        serviceManId,
        serviceManName: offerData.serviceManName || bookingData.serviceManName || 'Technician',
        serviceManPhone: offerData.serviceManPhone || bookingData.serviceManPhone || '',
        acceptedAt: nowIso,
        updatedAt: nowIso,
      });

      // 2. Mark this Offer as ACCEPTED
      transaction.set(
        offerRef,
        {
          status: 'ACCEPTED',
          respondedAt: nowIso,
          updatedAt: nowIso,
        },
        { merge: true }
      );

      // 3. Mark legacy assignment as accepted
      transaction.set(
        assignmentRef,
        {
          status: 'accepted',
          acceptedAt: nowIso,
          updatedAt: nowIso,
        },
        { merge: true }
      );

      return {
        success: true,
        bookingId,
        serviceManId,
      };
    });

    // Close and expire all other pending offers for this booking
    try {
      // Expire all pending booking_offers
      const otherOffersQ = query(
        collection(db, 'booking_offers'),
        where('bookingId', '==', bookingId),
        where('status', '==', 'PENDING')
      );
      const otherOffersSnap = await getDocs(otherOffersQ);
      if (!otherOffersSnap.empty) {
        const batch = writeBatch(db);
        otherOffersSnap.forEach((docSnap) => {
          if (docSnap.id !== offerId) {
            batch.update(docSnap.ref, {
              status: 'EXPIRED',
              respondedAt: nowIso,
              rejectionReason: 'Claimed by another service professional',
              updatedAt: nowIso,
            });
          }
        });
        await batch.commit();
      }

      // Expire all pending booking_assignments
      const otherAsgnQ = query(
        collection(db, 'booking_assignments'),
        where('bookingId', '==', bookingId),
        where('status', '==', 'offered')
      );
      const otherAsgnSnap = await getDocs(otherAsgnQ);
      if (!otherAsgnSnap.empty) {
        const batch = writeBatch(db);
        otherAsgnSnap.forEach((docSnap) => {
          if (docSnap.id !== assignmentId) {
            batch.update(docSnap.ref, {
              status: 'closed',
              closedReason: 'taken_by_another_serviceman',
              closedAt: nowIso,
              updatedAt: nowIso,
            });
          }
        });
        await batch.commit();
      }
    } catch (closeErr) {
      console.warn('Non-fatal cleanup of other offers:', closeErr);
    }

    // Safe Log: ACCEPT_SUCCESS
    try {
      await addDoc(collection(db, 'audit_logs'), {
        action: 'ACCEPT_SUCCESS',
        bookingId,
        serviceManId,
        assignmentId,
        status: 'accepted',
        timestamp: nowIso,
      });
    } catch (e) {
      console.warn('Audit note:', e);
    }

    return res.status(200).json({
      success: true,
      message: 'Booking successfully accepted ✓',
      bookingId,
      serviceManId,
      status: 'accepted',
      acceptedAt: nowIso,
    });
  } catch (err: any) {
    const code = err.message || 'TRANSACTION_FAILED';

    if (code === 'BOOKING_ALREADY_TAKEN') {
      try {
        await addDoc(collection(db, 'audit_logs'), {
          action: 'BOOKING_ALREADY_TAKEN',
          bookingId: req.body?.bookingId,
          serviceManId: req.body?.serviceManId,
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Audit note:', e);
      }

      return res.status(409).json({
        success: false,
        code: 'BOOKING_ALREADY_TAKEN',
        error: 'Yeh booking pehle hi kisi anya service professional dwara accept ki ja chuki hai.',
      });
    }

    if (code === 'BOOKING_NOT_FOUND' || code === 'ASSIGNMENT_NOT_FOUND') {
      return res.status(404).json({ success: false, code, error: code });
    }

    if (code === 'UNAUTHORIZED_ASSIGNMENT') {
      return res.status(403).json({ success: false, code, error: 'Unauthorized to accept this assignment' });
    }

    console.error('accept-offer transaction error:', code);
    return res.status(400).json({
      success: false,
      code,
      error: code === 'OFFER_NO_LONGER_VALID' ? 'Offer is no longer active or has expired.' : code,
    });
  }
});

/**
 * Endpoint: POST /api/booking-offers/reject
 * Reject a pending offer explicitly by the professional
 */
app.post('/api/booking-offers/reject', async (req, res) => {
  try {
    const { offerId, serviceManId, reason = 'Declined by professional' } = req.body;
    if (!offerId || !serviceManId) {
      return res.status(400).json({ success: false, error: 'Missing offerId or serviceManId' });
    }

    const offerRef = doc(db, 'booking_offers', offerId);
    const offerSnap = await getDoc(offerRef);

    if (!offerSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Offer not found' });
    }

    const data = offerSnap.data() as any;
    if (data.serviceManId !== serviceManId) {
      return res.status(403).json({ success: false, error: 'Unauthorized to reject this offer' });
    }

    if (data.status !== 'PENDING' && data.status !== 'offered') {
      return res.status(400).json({ success: false, error: 'Offer is not in PENDING status' });
    }

    const nowIso = new Date().toISOString();
    await updateDoc(offerRef, {
      status: 'REJECTED',
      respondedAt: nowIso,
      rejectionReason: reason,
      updatedAt: nowIso,
    });

    return res.status(200).json({ success: true, message: 'Offer rejected successfully' });
  } catch (err: any) {
    console.error('reject-offer error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
});

/**
 * Endpoint: POST /api/serviceman/register-fcm-token
 * Securely registers an FCM device token for a ServiceMan account.
 */
app.post('/api/serviceman/register-fcm-token', async (req, res) => {
  try {
    const { token, serviceManId, deviceType = 'web' } = req.body;

    if (!token || typeof token !== 'string' || token.trim().length < 10) {
      return res.status(400).json({ success: false, error: 'Valid FCM token string is required' });
    }

    if (!serviceManId || typeof serviceManId !== 'string') {
      return res.status(400).json({ success: false, error: 'serviceManId is required' });
    }

    const cleanToken = token.trim();
    const cleanId = serviceManId.trim();
    const nowIso = new Date().toISOString();

    // 1. Save in device_tokens collection
    const tokenDocId = crypto.createHash('sha256').update(cleanToken).digest('hex').substring(0, 32);
    await setDoc(doc(db, 'device_tokens', tokenDocId), {
      token: cleanToken,
      userId: cleanId,
      role: 'service_man',
      deviceType,
      updatedAt: nowIso,
      createdAt: nowIso,
    }, { merge: true });

    // 2. Also save on service_men doc if present
    try {
      const proRef = doc(db, 'service_men', cleanId);
      const proSnap = await getDoc(proRef);
      if (proSnap.exists()) {
        await updateDoc(proRef, {
          fcmTokens: arrayUnion(cleanToken),
          lastTokenRefreshedAt: nowIso,
          updatedAt: nowIso,
        });
      }
    } catch (e) {
      console.warn('service_men token union note:', e);
    }

    return res.status(200).json({
      success: true,
      message: 'FCM device token registered successfully ✓',
      serviceManId: cleanId,
    });
  } catch (err: any) {
    console.error('register-fcm-token error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

/**
 * Endpoint: GET /api/bookings/:bookingId/offers
 * Queries existing assignment offers for a booking (Admin & authorized inspect)
 */
app.get('/api/bookings/:bookingId/offers', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const offersQuery = query(
      collection(db, 'booking_assignments'),
      where('bookingId', '==', bookingId)
    );
    const snap = await getDocs(offersQuery);
    const offers: any[] = [];
    snap.forEach((d) => offers.push(d.data()));

    return res.status(200).json({
      success: true,
      bookingId,
      count: offers.length,
      offers,
    });
  } catch (err: any) {
    console.error('get offers error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

/**
 * STEP 4: SERVICE SPLIT CALCULATION UTILITY & ENDPOINT
 * Endpoint: POST /api/functions/calculateServiceSplit & POST /api/payouts/calculate-split
 * Accepts booking amount, calculates platform commission (e.g. 10%) + tax (5%), and determines net payoutAmount for professional
 */
app.post(['/api/functions/calculateServiceSplit', '/api/payouts/calculate-split'], (req, res) => {
  try {
    const {
      bookingId,
      amount,
      bookingAmount,
      grossAmount,
      commissionRate = 10,
      taxRate = 5,
    } = req.body;

    const targetGross = parseFloat(amount !== undefined ? amount : (bookingAmount !== undefined ? bookingAmount : grossAmount || 0));

    if (isNaN(targetGross) || targetGross < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or missing booking amount',
      });
    }

    const commRate = parseFloat(commissionRate !== undefined ? commissionRate : 10);
    const tRate = parseFloat(taxRate !== undefined ? taxRate : 5);

    const companyCommission = Math.round((targetGross * commRate) / 100);
    const taxDeduction = Math.round((targetGross * tRate) / 100);
    const payoutAmount = Math.max(0, targetGross - companyCommission - taxDeduction);

    return res.status(200).json({
      success: true,
      bookingId: bookingId || null,
      grossAmount: targetGross,
      commissionRate: commRate,
      companyCommission,
      taxRate: tRate,
      taxDeduction,
      payoutAmount,
      servicemanPayoutAmount: payoutAmount,
      message: `Split calculation complete: Commission ₹${companyCommission} (${commRate}%), Tax ₹${taxDeduction} (${tRate}%), Net Payout ₹${payoutAmount}`,
    });
  } catch (err: any) {
    console.error('Error calculating service split:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to calculate split' });
  }
});

/**
 * STEP 5: ADMIN SERVICEMAN PAYOUT DISBURSEMENT
 * Endpoint: POST /api/payouts/process & /api/razorpay/split-payout
 * Enforces admin authorization, server-side split calculation, and prohibits fake payout IDs or premature 'paid'/'settled' states.
 */
app.post(['/api/payouts/process', '/api/razorpay/split-payout'], requireAdminAuth, async (req, res) => {
  try {
    const {
      bookingId,
      serviceManId,
      serviceManName,
      serviceManPhone,
      grossAmount,
      companyCommissionRate = 15, // 15% default platform charge
      taxRate = 5, // 5% TDS / tax deduction
      payoutMethod = 'razorpay_instant',
      upiOrBank,
      adminUsername,
    } = req.body;

    if (!bookingId || !serviceManId || grossAmount === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required payout fields (bookingId, serviceManId, grossAmount)',
      });
    }

    const gross = Math.max(0, parseFloat(grossAmount) || 0);
    const commRate = Math.max(0, parseFloat(companyCommissionRate) || 15);
    const tRate = Math.max(0, parseFloat(taxRate) || 5);

    const companyServiceCharge = Math.round((gross * commRate) / 100);
    const taxDeduction = Math.round((gross * tRate) / 100);
    const netPayoutAmount = Math.max(0, gross - companyServiceCharge - taxDeduction);

    // Internal tracking reference (NOT a fake Razorpay ID; real payout ID is assigned upon Razorpay API/webhook confirmation)
    const internalPayoutRef = `payout_ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    return res.status(200).json({
      success: true,
      message: `Payout request of ₹${netPayoutAmount} queued for processing to ${serviceManName}. Settlement will be confirmed via bank transfer / Razorpay webhook.`,
      payout: {
        payoutReference: internalPayoutRef,
        payoutRazorpayId: null,
        bookingId,
        serviceManId,
        serviceManName: serviceManName || 'Verified Professional',
        serviceManPhone: serviceManPhone || '',
        grossAmount: gross,
        companyCommissionRate: commRate,
        companyServiceCharge,
        taxRate: tRate,
        taxDeduction,
        netPayoutAmount,
        payoutMethod,
        upiOrBank: upiOrBank || 'Direct Verified Account',
        processedBy: adminUsername || 'DEEPAK (Admin)',
        processedAt: nowIso,
        status: 'processing',
        payoutStatus: 'processing',
      },
    });
  } catch (err: any) {
    console.error('Error processing serviceman payout:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to disburse serviceman payout',
    });
  }
});

// Cache for Express server webhook idempotency
const processedWebhookEvents = new Set<string>();

/**
 * STEP 6: ASYNCHRONOUS RAZORPAY WEBHOOK HANDLER
 * Endpoints: POST /api/razorpay/webhook & POST /api/functions/handleRazorpayWebhook
 * Handles: payment.authorized, payment.captured, payout.processed, payout.settled, payout.failed
 */
app.post(['/api/razorpay/webhook', '/api/functions/handleRazorpayWebhook'], (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    if (!signature) {
      return res.status(401).json({ success: false, error: 'Missing required webhook signature header.' });
    }

    const webhookSecret = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET || 'ZoKwhf1OeEyQdasKYhtQoaw6';
    const rawBody = JSON.stringify(req.body);

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    let isSignatureValid = false;
    try {
      const expBuf = Buffer.from(expectedSignature, 'utf8');
      const actBuf = Buffer.from(signature, 'utf8');
      if (expBuf.length === actBuf.length) {
        isSignatureValid = crypto.timingSafeEqual(expBuf, actBuf);
      }
    } catch (e) {
      isSignatureValid = false;
    }

    if (!isSignatureValid) {
      return res.status(400).json({ success: false, error: 'Invalid webhook signature.' });
    }

    const payload = req.body || {};
    const event = payload.event;
    if (!event) {
      return res.status(400).json({ success: false, error: 'Malformed webhook payload: missing event.' });
    }

    const eventId = payload.event_id || (req.headers['x-razorpay-event-id'] as string) || `ev_${Date.now()}`;

    // Idempotency check
    if (processedWebhookEvents.has(eventId)) {
      return res.status(200).json({ success: true, message: 'Event already processed (idempotent).' });
    }
    processedWebhookEvents.add(eventId);

    console.log(`[Express Webhook] Received Razorpay Event: ${event} (${eventId})`);

    const result: any = { event, eventId, status: 'processed', receivedAt: new Date().toISOString() };

    if (event === 'payment.authorized' || event === 'payment.captured' || event === 'order.paid') {
      const payment = payload.payload?.payment?.entity || {};
      const notes = payment.notes || {};
      const amountInRupees = payment.amount ? Math.round(payment.amount / 100) : 0;

      // Compute split-commission breakdown (10% platform commission, 5% TDS/Tax)
      const companyCommission = Math.round(amountInRupees * 0.10);
      const taxDeduction = Math.round(amountInRupees * 0.05);
      const payoutAmount = Math.max(0, amountInRupees - companyCommission - taxDeduction);

      result.payment = {
        id: payment.id,
        orderId: payment.order_id,
        amount: amountInRupees,
        bookingId: notes.bookingId || notes.booking_id,
        companyCommission,
        taxDeduction,
        payoutAmount,
        servicemanPayoutAmount: payoutAmount,
        paymentStatus: 'paid',
        payoutStatus: 'pending_disbursement',
      };
      result.documentStatus = 'paid';
    } else if (event === 'payout.processed' || event === 'payout.settled' || event === 'payout.updated') {
      const payout = payload.payload?.payout?.entity || {};
      result.payout = {
        id: payout.id,
        amount: payout.amount ? Math.round(payout.amount / 100) : 0,
        status: 'settled',
        payoutStatus: 'settled',
        utr: payout.utr || null,
        settledAt: new Date().toISOString(),
      };
      result.documentStatus = 'settled';
    }

    return res.status(200).json({ success: true, result });
  } catch (err: any) {
    console.error('Webhook execution error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error processing webhook.' });
  }
});

/**
 * ====================================================================
 * HARDINKAAM ONE-CLICK WEBSITE ZIP UPDATE & DEPLOYMENT SYSTEM ENDPOINTS
 * ====================================================================
 */

/**
 * GET /api/admin/deploy/status
 * Returns current LIVE version, target live URL, next version tag, and system readiness
 */
app.get('/api/admin/deploy/status', requireAdminAuth, (req, res) => {
  try {
    const liveVersion = getCurrentLiveDeployment();
    const nextVersion = getNextVersionString();
    const history = getDeploymentHistory();

    return res.status(200).json({
      success: true,
      currentVersion: liveVersion?.version || 'v1.0.3',
      currentLiveDeployment: liveVersion,
      nextSuggestedVersion: nextVersion,
      liveUrl: 'https://hardinkaam-5cc6a.web.app',
      firebaseProjectId: 'hardinkaam-5cc6a',
      totalDeployments: history.length,
      isSystemReady: true,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Error fetching deployment status:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/deploy/history
 * Returns the complete list of deployment records and build logs
 */
app.get('/api/admin/deploy/history', requireAdminAuth, (req, res) => {
  try {
    const history = getDeploymentHistory();
    return res.status(200).json({
      success: true,
      deployments: history,
      count: history.length,
    });
  } catch (err: any) {
    console.error('Error fetching deployment history:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/deploy/job/:jobId
 * Real-time progress monitoring endpoint for ongoing deployment builds
 */
app.get('/api/admin/deploy/job/:jobId', requireAdminAuth, async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await getJobStatus(jobId);

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found or completed' });
    }

    return res.status(200).json({
      success: true,
      job,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/deploy/retry-job
 * Retries a failed or stalled deployment without re-uploading
 */
app.post('/api/admin/deploy/retry-job', requireAdminAuth, async (req, res) => {
  try {
    const { jobId, stripUnsupportedFiles, excludeSpecificFiles, excludeFiles } = req.body;
    if (!jobId) {
      return res.status(400).json({ success: false, error: 'Missing jobId parameter' });
    }

    const adminEmail = (req.headers['x-admin-email'] as string) || req.body?.adminEmail || 'deepakbuildconbhopal@gmail.com';
    const adminName = (req.headers['x-admin-name'] as string) || req.body?.adminName || 'DEEPAK (Admin)';
    const adminUid = (req.headers['x-admin-uid'] as string) || req.body?.adminUid || 'admin_user';

    const filesToExclude = excludeSpecificFiles || excludeFiles || [];

    retryDeploymentJob({
      jobId,
      adminUser: { uid: adminUid, email: adminEmail, name: adminName },
      stripUnsupportedFiles: stripUnsupportedFiles === true || filesToExclude.length > 0,
      excludeSpecificFiles: filesToExclude,
    }).catch((err) => {
      console.error(`[Retry Deployment Error for Job ${jobId}]:`, err);
    });

    return res.status(200).json({
      success: true,
      message: 'Retry initiated successfully.',
      jobId,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/deploy/continue-audit
 * Resumes deployment after Pre-Deploy Audit flagged executables, non-destructively
 * excluding selected files ONLY from the staging directory before deployment.
 * The original uploaded ZIP archive is completely preserved and untouched.
 */
app.post('/api/admin/deploy/continue-audit', requireAdminAuth, async (req, res) => {
  try {
    const { jobId, excludeFiles, excludeAllFlagged = true } = req.body;
    if (!jobId) {
      return res.status(400).json({ success: false, error: 'Missing jobId parameter' });
    }

    const adminEmail = (req.headers['x-admin-email'] as string) || req.body?.adminEmail || 'deepakbuildconbhopal@gmail.com';
    const adminName = (req.headers['x-admin-name'] as string) || req.body?.adminName || 'DEEPAK (Admin)';
    const adminUid = (req.headers['x-admin-uid'] as string) || req.body?.adminUid || 'admin_user';

    continueDeploymentAudit({
      jobId,
      adminUser: { uid: adminUid, email: adminEmail, name: adminName },
      excludeFiles: Array.isArray(excludeFiles) ? excludeFiles : undefined,
      stripUnsupportedFiles: excludeAllFlagged === true,
    }).catch((err) => {
      console.error(`[Continue Audit Deployment Error for Job ${jobId}]:`, err);
    });

    return res.status(200).json({
      success: true,
      message: 'Pre-deployment audit exclusion applied. Deployment proceeding with clean staging directory.',
      jobId,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/deploy/pre-audit
 * Inspects an uploaded ZIP for executable binaries without deploying
 */
app.post('/api/admin/deploy/pre-audit', requireAdminAuth, (req, res) => {
  uploadZip.single('zipFile')(req, res, async (uploadErr: any) => {
    if (uploadErr) {
      return res.status(400).json({
        success: false,
        error: uploadErr.message || 'ZIP upload failed for pre-audit inspection.',
      });
    }

    try {
      const file = req.file;
      if (!file || !file.buffer) {
        return res.status(400).json({
          success: false,
          error: 'No ZIP file provided for pre-audit.',
        });
      }

      const auditResult = await preAuditZipBuffer(file.buffer);
      return res.status(200).json({
        success: true,
        audit: auditResult,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
});

/**
 * POST /api/admin/deploy/upload
 * Handles ZIP upload, security verification, isolated extraction, npm install, build, and Firebase Hosting deployment
 */
app.post('/api/admin/deploy/upload', requireAdminAuth, (req, res) => {
  uploadZip.single('zipFile')(req, res, async (uploadErr: any) => {
    if (uploadErr) {
      return res.status(400).json({
        success: false,
        error: uploadErr.message || 'ZIP upload failed. Ensure file is .zip format under max size limit.',
      });
    }

    try {
      const file = req.file;
      if (!file || !file.buffer) {
        return res.status(400).json({
          success: false,
          error: 'No ZIP file was uploaded. Please attach a valid HARDINKAAM project ZIP file.',
        });
      }

      const adminEmail = (req.headers['x-admin-email'] as string) || req.body?.adminEmail || 'deepakbuildconbhopal@gmail.com';
      const adminName = (req.headers['x-admin-name'] as string) || req.body?.adminName || 'DEEPAK (Admin)';
      const adminUid = (req.headers['x-admin-uid'] as string) || req.body?.adminUid || 'admin_user';
      const customVersion = req.body?.customVersion;
      const stripUnsupportedFiles = req.body?.stripUnsupportedFiles === 'true' || req.body?.stripUnsupportedFiles === true;
      const isForce = req.query?.force === 'true' || req.body?.force === 'true' || req.body?.force === true;
      const jobId = req.body?.jobId || `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      console.log(`[Deploy Request] Admin "${adminEmail}" initiated deployment of "${file.originalname}" (${file.size} bytes), JobId: ${jobId}`);

      // Idempotency check: Check if identical ZIP is already live unless forced
      if (!isForce) {
        const dupCheck = checkDuplicateZip(file.buffer);
        if (dupCheck.isDuplicate) {
          return res.status(200).json({
            success: true,
            isDuplicate: true,
            existingVersion: dupCheck.existingVersion,
            zipHash: dupCheck.zipHash,
            message: `This exact ZIP was already uploaded (Version ${dupCheck.existingVersion}). You can deploy again or cancel.`,
          });
        }
      }

      // Fast non-blocking async pre-validation of the ZIP archive structure
      const validation = await validateZipArchiveAsync(file.buffer);
      if (!validation.isValid) {
        return res.status(422).json({
          success: false,
          error: validation.error || 'अमान्य ज़िप फ़ाइल: HARDINKAAM प्रोजेक्ट फ़ाइलें (package.json या dist/index.html) नहीं मिलीं।',
        });
      }

      // Check if client explicitly requested synchronous execution
      const isSync = req.query?.sync === 'true';

      if (isSync) {
        const result = await processZipDeployment({
          jobId,
          zipBuffer: file.buffer,
          fileName: file.originalname,
          fileSize: file.size,
          adminUser: { uid: adminUid, email: adminEmail, name: adminName },
          customVersion,
          stripUnsupportedFiles,
        });

        if (result.status === 'LIVE') {
          return res.status(200).json({
            success: true,
            message: `Version ${result.version} has been built and deployed LIVE to ${result.siteUrl}!`,
            deployment: result,
          });
        } else {
          return res.status(422).json({
            success: false,
            error: result.errorMessage || 'Deployment build failed. Existing live version is unchanged.',
            deployment: result,
          });
        }
      }

      // Asynchronous background execution (prevents 504 Gateway Timeout on Cloud Run / reverse proxy)
      processZipDeployment({
        jobId,
        zipBuffer: file.buffer,
        fileName: file.originalname,
        fileSize: file.size,
        adminUser: { uid: adminUid, email: adminEmail, name: adminName },
        customVersion,
        stripUnsupportedFiles,
      }).catch((deployErr) => {
        console.error(`[Background Deployment Error for Job ${jobId}]:`, deployErr);
      });

      // Immediate JSON response to the client
      return res.status(200).json({
        success: true,
        jobId,
        message: 'ZIP फ़ाइल सफलतापूर्वक प्राप्त हुई। बैकग्राउंड बिल्ड व सत्यापन पाइपलाइन प्रारंभ कर दी गई है।',
        stage: 'VALIDATING',
        deploymentMode: validation.deploymentMode,
        filesCount: validation.filesCount,
      });
    } catch (err: any) {
      console.error('Fatal deployment execution error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Fatal error occurred during deployment execution.',
      });
    }
  });
});

/**
 * POST /api/admin/deploy/rollback
 * Restores a previously verified successful build version to LIVE
 */
app.post('/api/admin/deploy/rollback', requireAdminAuth, async (req, res) => {
  try {
    const { targetVersionId } = req.body;

    if (!targetVersionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing targetVersionId parameter for rollback.',
      });
    }

    const adminEmail = (req.headers['x-admin-email'] as string) || req.body?.adminEmail || 'deepakbuildconbhopal@gmail.com';
    const adminName = (req.headers['x-admin-name'] as string) || req.body?.adminName || 'DEEPAK (Admin)';
    const adminUid = (req.headers['x-admin-uid'] as string) || req.body?.adminUid || 'admin_user';

    const rollbackResult = await rollbackDeployment(targetVersionId, {
      uid: adminUid,
      email: adminEmail,
      name: adminName,
    });

    if (rollbackResult.success) {
      return res.status(200).json({
        success: true,
        message: rollbackResult.message,
        deployment: rollbackResult.deployment,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: rollbackResult.message,
      });
    }
  } catch (err: any) {
    console.error('Error executing rollback:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error during rollback',
    });
  }
});

// Vite middleware / production serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HARDINKAAM Server with Razorpay running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
