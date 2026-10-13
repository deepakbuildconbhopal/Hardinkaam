import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Booking, ExtraChargeItem, BillSnapshot } from '../../types';
import { respondExtraChargeServer } from '../../services/billingTrackingService';

export type ServiceWorkflowIntentType =
  | 'arrival_check'
  | 'otp_inquiry'
  | 'work_status_timer'
  | 'extra_charge_inquiry'
  | 'final_bill_inquiry';

export class ConversationalServiceWorkflowService {
  /**
   * Detect specific Phase 12 service workflow intent
   */
  public detectWorkflowIntent(query: string): ServiceWorkflowIntentType | null {
    const q = query.toLowerCase().trim();

    // 1. Arrival OTP Inquiry
    if (
      q.includes('otp kahan hai') ||
      q.includes('otp kya hai') ||
      q.includes('show otp') ||
      q.includes('arrival otp') ||
      q.includes('start otp') ||
      q.includes('मेरा otp') ||
      q.includes('ओटीपी क्या है') ||
      q.includes('ओटीपी कहाँ है') ||
      q.includes('otp code') ||
      q === 'otp'
    ) {
      return 'otp_inquiry';
    }

    // 2. Service Man Arrival Check
    if (
      q.includes('service man aa gaya') ||
      q.includes('aa gaya hai') ||
      q.includes('has service man arrived') ||
      q.includes('is technician here') ||
      q.includes('gate pe') ||
      q.includes('सर्विसमैन आ गया') ||
      q.includes('कारीगर आ गया') ||
      q.includes('पहुँच गए क्या') ||
      q.includes('पहुँचा या नहीं')
    ) {
      return 'arrival_check';
    }

    // 3. Work Started & Timer Status
    if (
      q.includes('work start hua') ||
      q.includes('work started') ||
      q.includes('timer') ||
      q.includes('time hua') ||
      q.includes('service start') ||
      q.includes('काम शुरू हुआ') ||
      q.includes('टाइमर') ||
      q.includes('कितना समय हुआ') ||
      q.includes('काम कब से चल रहा')
    ) {
      return 'work_status_timer';
    }

    // 4. Extra Charges & Customer Approval
    if (
      q.includes('extra charge') ||
      q.includes('extra charges') ||
      q.includes('material charge') ||
      q.includes('spare part') ||
      q.includes('additional charge') ||
      q.includes('सामान का चार्ज') ||
      q.includes('अतिरिक्त चार्ज') ||
      q.includes('एक्स्ट्रा चार्ज') ||
      q.includes('पार्ट्स का खर्च') ||
      q.includes('अप्रूवल')
    ) {
      return 'extra_charge_inquiry';
    }

    // 5. Final Bill & Payment Summary
    if (
      q.includes('final bill') ||
      q.includes('bill dikhao') ||
      q.includes('show bill') ||
      q.includes('invoice') ||
      q.includes('kitna paisa') ||
      q.includes('kitna hua') ||
      q.includes('total bill') ||
      q.includes('फाइनल बिल') ||
      q.includes('बिल दिखाओ') ||
      q.includes('रसीद') ||
      q.includes('कितना भुगतान करना') ||
      q.includes('भुगतान कितना')
    ) {
      return 'final_bill_inquiry';
    }

    return null;
  }

  /**
   * Calculates extra charges breakdown with strict guarantee that unapproved/rejected are excluded from total
   */
  public getExtraChargesBreakdown(booking: Partial<Booking>) {
    const rawCharges: ExtraChargeItem[] = Array.isArray(booking.extraCharges)
      ? booking.extraCharges
      : [];

    const formattedCharges = rawCharges.map((c: any, index) => {
      const status = (c.approvalStatus || c.status || 'pending').toLowerCase() as
        | 'pending'
        | 'approved'
        | 'rejected';
      const quantity = c.quantity || 1;
      const unitPrice = c.unitPrice || c.amount || 0;
      const totalAmount = c.amount || quantity * unitPrice;

      return {
        id: c.id || `chg_${index + 1}`,
        description: c.description || 'अतिरिक्त सामग्री / सेवा (Extra item)',
        type: c.type || 'material',
        quantity,
        unitPrice,
        totalAmount,
        status,
        rejectionReason: c.rejectionReason,
      };
    });

    const approvedCharges = formattedCharges.filter((c) => c.status === 'approved');
    const pendingCharges = formattedCharges.filter((c) => c.status === 'pending');
    const rejectedCharges = formattedCharges.filter((c) => c.status === 'rejected');

    const totalApprovedAmount = approvedCharges.reduce((sum, c) => sum + c.totalAmount, 0);
    const totalPendingAmount = pendingCharges.reduce((sum, c) => sum + c.totalAmount, 0);

    return {
      allCharges: formattedCharges,
      approvedCharges,
      pendingCharges,
      rejectedCharges,
      totalApprovedAmount,
      totalPendingAmount,
      hasPendingApproval: pendingCharges.length > 0,
    };
  }

  /**
   * Computes the authoritative Final Bill adhering strictly to the rule:
   * Only approved extra charges are included in final amount.
   */
  public calculateFinalBill(booking: Partial<Booking>) {
    const baseAmount = booking.baseAmount !== undefined ? booking.baseAmount : (booking.amount || 199);
    const { approvedCharges, totalApprovedAmount, rejectedCharges } =
      this.getExtraChargesBreakdown(booking);

    const applicableCharges = booking.applicableCharges !== undefined ? booking.applicableCharges : 29;
    const discount = booking.discount || booking.discountAmount || 0;

    // Unapproved and rejected charges are STRICTLY EXCLUDED
    const finalAmount = Math.max(
      0,
      baseAmount + totalApprovedAmount + applicableCharges - discount
    );

    const workDurationFormatted =
      booking.workDurationFormatted ||
      (booking.workDurationMinutes ? `${booking.workDurationMinutes} मिनट` : '35 मिनट');

    return {
      bookingId: booking.id || 'BK_ACTIVE',
      serviceName: booking.serviceName || 'होम सर्विस (Home Service)',
      serviceCategory: booking.categoryName || 'सामान्य सर्विस',
      serviceManName: booking.serviceManName || 'राजेश शर्मा (सीनियर तकनीशियन)',
      workDurationFormatted,
      workStartedAt: booking.workStartedAt || booking.startedAt,
      workEndedAt: booking.workCompletedAt || booking.workEndedAt || booking.completedAt,
      baseAmount,
      approvedExtraCharges: approvedCharges.map((c) => ({
        description: c.description,
        amount: c.totalAmount,
        quantity: c.quantity,
      })),
      approvedExtraChargesAmount: totalApprovedAmount,
      rejectedExtraChargesCount: rejectedCharges.length,
      applicableCharges,
      discount,
      finalAmount,
      paymentStatus: booking.paymentStatus || 'unpaid',
      paymentMethod: booking.paymentMethod || 'cash',
      generatedAt: booking.updatedAt || new Date().toISOString(),
    };
  }

  /**
   * Handles Customer Approval or Rejection of an Extra Charge
   */
  public async respondToExtraCharge(
    bookingId: string,
    customerId: string,
    chargeId: string,
    decision: 'approve' | 'reject',
    rejectionReason?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const res = await respondExtraChargeServer({
        bookingId,
        customerId: customerId || 'cust_user',
        chargeId,
        decision,
        rejectionReason,
      });

      if (res.success) {
        return {
          success: true,
          message:
            decision === 'approve'
              ? '✅ एक्स्ट्रा चार्ज को आपकी मंजूरी मिल गई है। इसे फाइनल बिल में जोड़ दिया गया है।'
              : '❌ एक्स्ट्रा चार्ज को अस्वीकार (Reject) कर दिया गया है। इसे बिल में शामिल नहीं किया जाएगा।',
        };
      }
      return { success: false, message: res.error || 'Failed to update extra charge' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Error updating charge status' };
    }
  }
}

export const conversationalServiceWorkflow = new ConversationalServiceWorkflowService();
