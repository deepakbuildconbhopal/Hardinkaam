/**
 * Razorpay Standard Web Checkout Integration Helper
 * 
 * Provides:
 * 1. createRazorpayOrder: Calls backend POST /api/create-order
 * 2. verifyRazorpayPayment: Calls backend POST /api/verify-payment
 * 3. openRazorpayCheckout: Loads SDK and triggers Razorpay Modal popup
 */

import { auth } from '../firebase/config';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export interface RazorpayOrderResponse {
  order_id: string;
  amount: number;
  currency: string;
  receipt?: string;
  status?: string;
  key_id?: string;
  error?: string;
}

export interface RazorpayPaymentSuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayCheckoutOptions {
  amount: number; // in Rupees (e.g. 499) or paise if isPaise: true
  isPaise?: boolean;
  currency?: string;
  receipt?: string;
  name?: string;
  description?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  themeColor?: string;
  onSuccess: (response: {
    payment_id: string;
    order_id: string;
    signature: string;
    verificationResult: any;
  }) => void;
  onFailure?: (error: { code?: string; description?: string; source?: string; step?: string; reason?: string }) => void;
  onDismiss?: () => void;
}

/**
 * Ensure Razorpay script is loaded dynamically if not already available
 */
export async function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (window.Razorpay) return true;

  return new Promise((resolve) => {
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Step 1: Create Order via Backend API
 */
export async function createRazorpayOrder(params: {
  amount: number; // Amount in Rupees or paise
  isPaise?: boolean;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrderResponse> {
  const amountInPaise = params.isPaise ? Math.round(params.amount) : Math.round(params.amount * 100);

  if (amountInPaise < 100) {
    throw new Error('Minimum order amount is ₹1.00 (100 paise).');
  }

  const token = await auth.currentUser?.getIdToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch('/api/create-order', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      amount: amountInPaise,
      currency: params.currency || 'INR',
      receipt: params.receipt || `rcpt_${Date.now()}`,
      notes: params.notes || {},
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to create Razorpay order');
  }

  return data;
}

/**
 * Step 3: Verify Payment Signature via Backend API
 */
export async function verifyRazorpayPayment(payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  bookingId?: string;
}): Promise<{ success: boolean; message: string; payment_id?: string; order_id?: string; error?: string }> {
  const token = await auth.currentUser?.getIdToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch('/api/verify-payment', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Payment signature verification failed.');
  }

  return data;
}

/**
 * Complete Flow: Create Order -> Open Modal -> Handle Success / Failure / Dismiss -> Verify
 */
export async function processRazorpayPayment(options: RazorpayCheckoutOptions): Promise<void> {
  // 1. Ensure SDK is available
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded || !window.Razorpay) {
    throw new Error('Razorpay SDK could not be loaded. Please check your internet connection.');
  }

  // 2. Create Order on Backend
  const order = await createRazorpayOrder({
    amount: options.amount,
    isPaise: options.isPaise,
    currency: options.currency || 'INR',
    receipt: options.receipt,
    notes: options.notes,
  });

  const razorpayKey =
    order.key_id ||
    (import.meta.env.VITE_RAZORPAY_KEY_ID as string) ||
    'rzp_test_TcON4i11rzp3bL';

  // 3. Configure Razorpay Standard Checkout options
  const rzpOptions = {
    key: razorpayKey,
    amount: order.amount,
    currency: order.currency || 'INR',
    name: options.name || 'HARDINKAAM - Home Services',
    description: options.description || 'Verified Service Booking & Wallet Payment',
    order_id: order.order_id,
    image: '/icon.svg',
    prefill: {
      name: options.prefill?.name || '',
      email: options.prefill?.email || '',
      contact: options.prefill?.contact || '',
    },
    notes: {
      ...(options.notes || {}),
      order_id: order.order_id,
    },
    theme: {
      color: options.themeColor || '#ea580c', // HARDINKAAM Brand Orange
    },
    modal: {
      ondismiss: function () {
        if (options.onDismiss) {
          options.onDismiss();
        }
      },
      escape: true,
      backdropclose: false,
    },
    handler: async function (response: RazorpayPaymentSuccessResponse) {
      try {
        // 4. Verify signature on backend
        const verification = await verifyRazorpayPayment({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        });

        // 5. Notify frontend callback
        options.onSuccess({
          payment_id: response.razorpay_payment_id,
          order_id: response.razorpay_order_id,
          signature: response.razorpay_signature,
          verificationResult: verification,
        });
      } catch (verifyErr: any) {
        if (options.onFailure) {
          options.onFailure({
            reason: verifyErr.message || 'Signature verification failed',
            description: 'Could not verify payment authenticity with backend.',
          });
        }
      }
    },
  };

  const razorpayInstance = new window.Razorpay(rzpOptions);

  // Handle payment failure event
  razorpayInstance.on('payment.failed', function (resp: any) {
    if (options.onFailure) {
      options.onFailure(resp.error || { description: 'Payment failed' });
    }
  });

  // Open Checkout modal
  razorpayInstance.open();
}

/**
 * Utility to calculate platform commission, tax deduction, and net professional payout
 */
export async function calculateServiceSplitAPI(params: {
  bookingId?: string;
  amount: number;
  commissionRate?: number;
  taxRate?: number;
}): Promise<{
  success: boolean;
  grossAmount: number;
  commissionRate: number;
  companyCommission: number;
  taxRate: number;
  taxDeduction: number;
  payoutAmount: number;
  servicemanPayoutAmount: number;
  bookingUpdated?: boolean;
}> {
  const token = await auth.currentUser?.getIdToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch('/api/functions/calculateServiceSplit', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to calculate split');
  }

  return data;
}
