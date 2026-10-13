/**
 * Centralized Frontend Payment Service for Cloudflare Worker Razorpay Integration
 */

export interface CreateOrderParams {
  purpose: 'partner_registration' | 'service_booking' | 'registration' | 'booking' | 'wallet_topup';
  referenceId?: string;
  amount?: number;
  idToken: string;
}

export interface VerifyPaymentParams {
  orderId: string;
  paymentId: string;
  signature: string;
  purpose?: string;
  referenceId?: string;
  idToken: string;
}

const getWorkerBaseUrl = () => {
  return (import.meta as any).env?.VITE_CLOUDFLARE_WORKER_URL || 'https://hardinkaam-razorpay-worker.workers.dev';
};

// Helper to load Razorpay checkout script dynamically
export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const razorpayClientService = {
  async createOrder(params: CreateOrderParams) {
    const workerUrl = getWorkerBaseUrl();
    const res = await fetch(`${workerUrl}/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${params.idToken}`,
      },
      body: JSON.stringify({
        purpose: params.purpose,
        referenceId: params.referenceId || '',
        amount: params.amount,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to create payment order via Cloudflare Worker');
    }
    return data;
  },

  async verifyPayment(params: VerifyPaymentParams) {
    const workerUrl = getWorkerBaseUrl();
    const res = await fetch(`${workerUrl}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${params.idToken}`,
      },
      body: JSON.stringify({
        orderId: params.orderId,
        paymentId: params.paymentId,
        signature: params.signature,
        purpose: params.purpose,
        referenceId: params.referenceId,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Payment verification failed on server');
    }
    return data;
  },

  async openCheckout(options: {
    purpose: 'partner_registration' | 'service_booking' | 'registration' | 'booking' | 'wallet_topup';
    referenceId?: string;
    amount?: number;
    idToken: string;
    name?: string;
    description?: string;
    prefill?: {
      name?: string;
      email?: string;
      contact?: string;
    };
    onSuccess: (verifyResult: any) => void;
    onFailure: (err: any) => void;
  }) {
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      options.onFailure(new Error('Razorpay SDK failed to load. Please check your internet connection.'));
      return;
    }

    try {
      const orderData = await this.createOrder({
        purpose: options.purpose,
        referenceId: options.referenceId,
        amount: options.amount,
        idToken: options.idToken,
      });

      const rzpOptions = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: options.name || 'HARDINKAAM',
        description: options.description || 'Secure Online Payment',
        order_id: orderData.orderId,
        prefill: options.prefill || {},
        theme: {
          color: '#7c3aed',
        },
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          try {
            const verifyResult = await this.verifyPayment({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              purpose: options.purpose,
              referenceId: options.referenceId,
              idToken: options.idToken,
            });
            options.onSuccess(verifyResult);
          } catch (verifyErr: any) {
            options.onFailure(verifyErr);
          }
        },
        modal: {
          ondismiss: () => {
            options.onFailure(new Error('Payment cancelled by user.'));
          },
        },
      };

      const rzp = new (window as any).Razorpay(rzpOptions);
      rzp.open();
    } catch (err: any) {
      options.onFailure(err);
    }
  },
};
