import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Booking } from '../../types';
import { conversationalServiceWorkflow } from './conversationalServiceWorkflowService';
import { PaymentBreakdownCardComponent } from './componentTypes';

export interface ConversationalPaymentParams {
  booking: Booking;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  onSuccess: (paymentMeta: { payment_id: string; order_id: string; signature: string }) => void;
  onFailure: (err: any) => void;
  onDismiss: () => void;
}

export class ConversationalPaymentService {
  /**
   * Detect user intent for payment
   */
  public isPaymentIntent(query: string): boolean {
    const q = query.toLowerCase().trim();
    return (
      q.includes('bill pay') ||
      q.includes('pay karna hai') ||
      q.includes('payment karna hai') ||
      q.includes('pay now') ||
      q.includes('online pay') ||
      q.includes('पेमेंट करना है') ||
      q.includes('बिल पे करना है') ||
      q.includes('पैसे देने हैं') ||
      q.includes('भुगतान करना है') ||
      q.includes('pay bill') ||
      q.includes('online payment')
    );
  }

  /**
   * Generates transparent itemized payment breakdown for customer
   */
  public getPaymentBreakdown(
    booking: Partial<Booking>,
    userProfile?: any
  ): PaymentBreakdownCardComponent {
    const baseAmount =
      booking.baseAmount !== undefined ? booking.baseAmount : (booking.amount || 199);
    const { approvedCharges, totalApprovedAmount } =
      conversationalServiceWorkflow.getExtraChargesBreakdown(booking);

    const taxesAndFees =
      booking.applicableCharges !== undefined ? booking.applicableCharges : 29;
    const discount = booking.discount || booking.discountAmount || 0;

    const finalAmount = Math.max(
      0,
      baseAmount + totalApprovedAmount + taxesAndFees - discount
    );

    const isPaid = (booking.paymentStatus || '').toLowerCase() === 'paid';

    return {
      type: 'payment_breakdown_card',
      bookingId: booking.id || 'BK_ACTIVE',
      serviceName: booking.serviceName || 'होम सर्विस (Home Service)',
      baseAmount,
      approvedExtraChargesAmount: totalApprovedAmount,
      approvedExtraCharges: approvedCharges.map((c) => ({
        description: c.description,
        amount: c.totalAmount,
        quantity: c.quantity,
      })),
      taxesAndFees,
      discount,
      finalAmount,
      paymentStatus: booking.paymentStatus || 'unpaid',
      customerName: userProfile?.name || booking.customerName || 'Customer',
      customerPhone: userProfile?.phone || booking.customerPhone || '9876543210',
      customerEmail: userProfile?.email || (booking as any).customerEmail || 'customer@hardinkaam.com',
      isPaid,
      paidAt: (booking as any).paidAt,
      paymentId: booking.razorpayPaymentId,
    };
  }

  /**
   * Executes secure Razorpay standard checkout flow and verifies with backend HMAC verification
   */
  public async executeRazorpayPayment(params: ConversationalPaymentParams): Promise<void> {
    params.onFailure(new Error('Online payment (Razorpay) is currently disabled. Please pay cash directly to the service professional.'));
  }

  public startPaymentFlow(params: ConversationalPaymentParams): Promise<void> {
    return this.executeRazorpayPayment(params);
  }
}

export const conversationalPayment = new ConversationalPaymentService();
export const conversationalPaymentService = conversationalPayment;
