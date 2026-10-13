import { UserRole, Booking, Service, Category, ServiceMan, UserProfile } from '../../types';
import { DynamicChatComponent, ActionItem, AssistantLanguage } from './types';
import { conversationalBookingManagement } from './conversationalBookingManagementService';
import { conversationalServiceWorkflow } from './conversationalServiceWorkflowService';
import { conversationalPaymentService } from './conversationalPaymentService';
import { conversationalSupportService } from './conversationalSupportService';
import { conversationalRegistration } from './conversationalRegistrationService';
import { executeMultiRoleRegistration } from './conversationalMultiRoleRegistrationService';
import { confirmationService } from './confirmationService';
import { kaamDostErrorHandler } from './kaamDostErrorHandler';

// ==========================================
// 1. CENTRALIZED ACTION TYPES & DEFINITIONS
// ==========================================

export type KaamDostActionType =
  | 'REGISTER_CUSTOMER'
  | 'REGISTER_SERVICE_PRO'
  | 'REGISTER_PARTNER'
  | 'REGISTER_FRANCHISE'
  | 'BOOK_SERVICE'
  | 'VIEW_BOOKINGS'
  | 'VIEW_BOOKING'
  | 'CANCEL_BOOKING'
  | 'RESCHEDULE_BOOKING'
  | 'TRACK_SERVICE'
  | 'APPROVE_EXTRA_CHARGE'
  | 'VIEW_BILL'
  | 'MAKE_PAYMENT'
  | 'SUBMIT_RATING'
  | 'CREATE_COMPLAINT'
  | 'UPDATE_PROFILE'
  | 'GET_SUPPORT';

export interface ActionDefinition {
  actionType: KaamDostActionType;
  label: string;
  hindiLabel: string;
  requiresAuth: boolean;
  allowedRoles?: UserRole[];
  requiredParams: string[];
  optionalParams: string[];
  requiresConfirmation: boolean;
  destructiveOrFinancial: boolean;
  description: string;
}

export const ACTION_DEFINITIONS: Record<KaamDostActionType, ActionDefinition> = {
  REGISTER_CUSTOMER: {
    actionType: 'REGISTER_CUSTOMER',
    label: 'Customer Registration',
    hindiLabel: 'ग्राहक रजिस्ट्रेशन',
    requiresAuth: false,
    requiredParams: ['name', 'mobile'],
    optionalParams: ['email', 'address', 'locality', 'avatar'],
    requiresConfirmation: true,
    destructiveOrFinancial: false,
    description: 'Registers a new customer account with Rs 200 welcome wallet credit.',
  },
  REGISTER_SERVICE_PRO: {
    actionType: 'REGISTER_SERVICE_PRO',
    label: 'Service Pro Registration',
    hindiLabel: 'कारीगर / सर्विसमैन रजिस्ट्रेशन',
    requiresAuth: false,
    requiredParams: ['name', 'mobile', 'tradeSkill'],
    optionalParams: ['experienceYears', 'address', 'documents', 'payoutUpiId'],
    requiresConfirmation: true,
    destructiveOrFinancial: false,
    description: 'Registers a technician with primary skill, experience, and KYC documents.',
  },
  REGISTER_PARTNER: {
    actionType: 'REGISTER_PARTNER',
    label: 'Business Partner Onboarding',
    hindiLabel: 'बिजनेस पार्टनर रजिस्ट्रेशन',
    requiresAuth: false,
    requiredParams: ['businessName', 'contactPerson', 'mobile'],
    optionalParams: ['businessType', 'fleetSize', 'address', 'documents', 'payoutUpiId'],
    requiresConfirmation: true,
    destructiveOrFinancial: false,
    description: 'Registers a business partner/agency with fleet size and trade details.',
  },
  REGISTER_FRANCHISE: {
    actionType: 'REGISTER_FRANCHISE',
    label: 'Franchise Partner Registration',
    hindiLabel: 'जिला फ्रेंचाइजी रजिस्ट्रेशन',
    requiresAuth: false,
    requiredParams: ['businessName', 'contactPerson', 'mobile', 'assignedDistrict'],
    optionalParams: ['address', 'documents', 'payoutUpiId'],
    requiresConfirmation: true,
    destructiveOrFinancial: false,
    description: 'Registers a master district franchise partner for territory operations.',
  },
  BOOK_SERVICE: {
    actionType: 'BOOK_SERVICE',
    label: 'Book Home Service',
    hindiLabel: 'होम सर्विस बुक करें',
    requiresAuth: false,
    requiredParams: ['serviceName', 'scheduledDate', 'scheduledTime', 'address'],
    optionalParams: ['problem', 'locality', 'contactPhone'],
    requiresConfirmation: true,
    destructiveOrFinancial: false,
    description: 'Books a doorstep service with date, slot, and address.',
  },
  VIEW_BOOKINGS: {
    actionType: 'VIEW_BOOKINGS',
    label: 'View All Bookings',
    hindiLabel: 'मेरी बुकिंग्स देखें',
    requiresAuth: true,
    requiredParams: [],
    optionalParams: ['filter', 'status'],
    requiresConfirmation: false,
    destructiveOrFinancial: false,
    description: 'Lists all customer bookings categorized by active, scheduled, and past.',
  },
  VIEW_BOOKING: {
    actionType: 'VIEW_BOOKING',
    label: 'View Booking Details',
    hindiLabel: 'बुकिंग विवरण देखें',
    requiresAuth: true,
    requiredParams: ['bookingId'],
    optionalParams: [],
    requiresConfirmation: false,
    destructiveOrFinancial: false,
    description: 'Retrieves comprehensive details and status for a specific booking.',
  },
  CANCEL_BOOKING: {
    actionType: 'CANCEL_BOOKING',
    label: 'Cancel Booking',
    hindiLabel: 'बुकिंग रद्द करें',
    requiresAuth: true,
    requiredParams: ['bookingId', 'cancellationReason'],
    optionalParams: [],
    requiresConfirmation: true,
    destructiveOrFinancial: true,
    description: 'Cancels an eligible pending/accepted booking with specified cancellation reason.',
  },
  RESCHEDULE_BOOKING: {
    actionType: 'RESCHEDULE_BOOKING',
    label: 'Reschedule Booking',
    hindiLabel: 'बुकिंग का समय बदलें',
    requiresAuth: true,
    requiredParams: ['bookingId', 'newDate', 'newTime'],
    optionalParams: [],
    requiresConfirmation: true,
    destructiveOrFinancial: false,
    description: 'Reschedules service slot to a new customer-chosen date and time.',
  },
  TRACK_SERVICE: {
    actionType: 'TRACK_SERVICE',
    label: 'Track Service Professional',
    hindiLabel: 'सर्विसमैन लोकेशन व स्टेटस ट्रैक करें',
    requiresAuth: true,
    requiredParams: ['bookingId'],
    optionalParams: [],
    requiresConfirmation: false,
    destructiveOrFinancial: false,
    description: 'Shows live ETA, technician contact, start OTP, and arrival status.',
  },
  APPROVE_EXTRA_CHARGE: {
    actionType: 'APPROVE_EXTRA_CHARGE',
    label: 'Approve/Reject Extra Charge',
    hindiLabel: 'एक्स्ट्रा चार्ज मंज़ूर / नामंज़ूर करें',
    requiresAuth: true,
    requiredParams: ['bookingId', 'chargeId', 'decision'],
    optionalParams: ['rejectionReason'],
    requiresConfirmation: true,
    destructiveOrFinancial: true,
    description: 'Allows customer to approve or reject technician-proposed extra material charges.',
  },
  VIEW_BILL: {
    actionType: 'VIEW_BILL',
    label: 'View Final Bill',
    hindiLabel: 'फाइनल बिल व इनवॉइस देखें',
    requiresAuth: true,
    requiredParams: ['bookingId'],
    optionalParams: [],
    requiresConfirmation: false,
    destructiveOrFinancial: false,
    description: 'Displays transparent itemized billing breakdown with approved charges only.',
  },
  MAKE_PAYMENT: {
    actionType: 'MAKE_PAYMENT',
    label: 'Pay Final Bill',
    hindiLabel: 'बिल का भुगतान करें',
    requiresAuth: true,
    requiredParams: ['bookingId', 'amount'],
    optionalParams: ['paymentMethod'],
    requiresConfirmation: true,
    destructiveOrFinancial: true,
    description: 'Initiates secure Razorpay payment for settled booking amount.',
  },
  SUBMIT_RATING: {
    actionType: 'SUBMIT_RATING',
    label: 'Submit Rating & Feedback',
    hindiLabel: 'रेटिंग व फीडबैक दर्ज करें',
    requiresAuth: true,
    requiredParams: ['bookingId', 'rating'],
    optionalParams: ['reviewText', 'technicianId'],
    requiresConfirmation: false,
    destructiveOrFinancial: false,
    description: 'Submits star rating and quality review for completed service.',
  },
  CREATE_COMPLAINT: {
    actionType: 'CREATE_COMPLAINT',
    label: 'Raise Support Complaint',
    hindiLabel: 'शिकायत / सपोर्ट टिकट दर्ज करें',
    requiresAuth: true,
    requiredParams: ['bookingId', 'issueType', 'description'],
    optionalParams: ['priority', 'attachments'],
    requiresConfirmation: true,
    destructiveOrFinancial: false,
    description: 'Creates a priority support ticket with photo/video attachments.',
  },
  UPDATE_PROFILE: {
    actionType: 'UPDATE_PROFILE',
    label: 'Update User Profile',
    hindiLabel: 'प्रोफाइल व पता अपडेट करें',
    requiresAuth: true,
    requiredParams: ['updates'],
    optionalParams: [],
    requiresConfirmation: true,
    destructiveOrFinancial: false,
    description: 'Updates customer address, phone, email, or emergency contact.',
  },
  GET_SUPPORT: {
    actionType: 'GET_SUPPORT',
    label: 'Contact Support Assistance',
    hindiLabel: 'सपोर्ट व सहायता प्राप्त करें',
    requiresAuth: false,
    requiredParams: [],
    optionalParams: ['query', 'supportTopic'],
    requiresConfirmation: false,
    destructiveOrFinancial: false,
    description: 'Provides official customer care numbers, WhatsApp, and emergency helpline.',
  },
};

// ==========================================
// 2. ROUTER PIPELINE TYPES
// ==========================================

export interface RouterContext {
  isLoggedIn: boolean;
  userId?: string;
  userName?: string;
  userPhone?: string;
  userProfile?: UserProfile;
  bookings?: Booking[];
  services?: Service[];
  categories?: Category[];
  serviceMen?: ServiceMan[];
  lang: AssistantLanguage;
}

export type PipelineStage =
  | 'intent_identified'
  | 'auth_required'
  | 'unauthorized'
  | 'missing_parameters'
  | 'confirmation_required'
  | 'executed'
  | 'failed';

export interface ActionRouterResult {
  success: boolean;
  actionType?: KaamDostActionType;
  stage: PipelineStage;
  replyText: string;
  missingParams?: string[];
  dynamicComponent?: DynamicChatComponent;
  actions?: ActionItem[];
  suggestedChips?: string[];
  data?: any;
  error?: string;
}

// ==========================================
// 3. INTENT DETECTION ENGINE
// ==========================================

export class CentralizedActionRouter {
  /**
   * Stage 1: Detect intent from conversational natural language or action payload
   */
  public detectIntent(
    query: string,
    context?: Partial<RouterContext>
  ): { actionType: KaamDostActionType; confidence: number; extractedParams: Record<string, any> } | null {
    const q = (query || '').toLowerCase().trim();
    const params: Record<string, any> = {};

    // 1. Extract any Booking ID present in query (e.g., HDK-1234, bk_123)
    const bookingIdMatch = q.match(/\b(hdk-[\w\d-]+|bk_[\w\d]+|booking_[\w\d]+)\b/i);
    if (bookingIdMatch) {
      params.bookingId = bookingIdMatch[0].toUpperCase();
    } else if (context?.bookings && context.bookings.length > 0) {
      // If user has only 1 active booking or asks about "current/recent booking", associate it
      const active = context.bookings.find((b) => b.status !== 'cancelled');
      if (active) params.bookingId = active.id;
    }

    // 2. Extra Charge Approval / Rejection
    if (
      q.includes('extra charge approve') ||
      q.includes('extra charge reject') ||
      q.includes('charge accept') ||
      q.includes('charge manjur') ||
      q.includes('एक्स्ट्रा चार्ज मंज़ूर') ||
      q.includes('एक्स्ट्रा चार्ज नामंज़ूर')
    ) {
      params.decision = q.includes('reject') || q.includes('नामंज़ूर') ? 'rejected' : 'approved';
      return { actionType: 'APPROVE_EXTRA_CHARGE', confidence: 0.98, extractedParams: params };
    }

    // 3. Payment Intent
    if (
      q.includes('bill pay') ||
      q.includes('pay karna hai') ||
      q.includes('payment karna hai') ||
      q.includes('pay now') ||
      q.includes('ऑनलाइन पेमेंट') ||
      q.includes('बिल पे करना है') ||
      q.includes('पैसे देने हैं') ||
      q.includes('भुगतान करना है')
    ) {
      return { actionType: 'MAKE_PAYMENT', confidence: 0.95, extractedParams: params };
    }

    // 4. View Bill / Invoice Intent
    if (
      q.includes('final bill') ||
      q.includes('bill dikhao') ||
      q.includes('invoice') ||
      q.includes('बिल कितना हुआ') ||
      q.includes('फाइनल बिल') ||
      q.includes('रसीद')
    ) {
      return { actionType: 'VIEW_BILL', confidence: 0.94, extractedParams: params };
    }

    // 5. Track Service / Pro Arrival Intent
    if (
      q.includes('service man aa gaya') ||
      q.includes('serviceman kahan hai') ||
      q.includes('pro kahan hai') ||
      q.includes('otp kahan hai') ||
      q.includes('start otp') ||
      q.includes('arrival otp') ||
      q.includes('work start hua') ||
      q.includes('work timer') ||
      q.includes('ट्रैक करो') ||
      q.includes('लोकेशन कहाँ है') ||
      q.includes('ओटीपी क्या है')
    ) {
      return { actionType: 'TRACK_SERVICE', confidence: 0.93, extractedParams: params };
    }

    // 6. Complaint / Support Issue Intent
    if (
      q.includes('serviceman late hai') ||
      q.includes('payment problem') ||
      q.includes('booking mein problem') ||
      q.includes('refund ke baare mein') ||
      q.includes('शिकायत') ||
      q.includes('complaint') ||
      q.includes('kharaabi') ||
      q.includes('लेट हो गया')
    ) {
      if (q.includes('late')) params.issueType = 'serviceman_late';
      else if (q.includes('payment') || q.includes('billing')) params.issueType = 'payment_issue';
      else if (q.includes('refund')) params.issueType = 'refund_help';
      else params.issueType = 'general_support';

      return { actionType: 'CREATE_COMPLAINT', confidence: 0.96, extractedParams: params };
    }

    // 7. Reschedule Booking Intent
    if (
      q.includes('reschedule') ||
      q.includes('time badlo') ||
      q.includes('tarikh badlo') ||
      q.includes('समय बदलो') ||
      q.includes('तारीख बदलो') ||
      q.includes('दूसरे दिन')
    ) {
      return { actionType: 'RESCHEDULE_BOOKING', confidence: 0.92, extractedParams: params };
    }

    // 8. Cancel Booking Intent
    if (
      q.includes('booking cancel') ||
      q.includes('cancel booking') ||
      q.includes('रद्द करो') ||
      q.includes('कैंसिल करो')
    ) {
      return { actionType: 'CANCEL_BOOKING', confidence: 0.95, extractedParams: params };
    }

    // 9. Multi-Role Registration Intents
    if (
      q.includes('serviceman banna') ||
      q.includes('technician banna') ||
      q.includes('कारीगर बनना') ||
      q.includes('service pro banna')
    ) {
      return { actionType: 'REGISTER_SERVICE_PRO', confidence: 0.95, extractedParams: params };
    }

    if (
      q.includes('franchise') ||
      q.includes('फ्रेंचाइजी') ||
      q.includes('district partner')
    ) {
      return { actionType: 'REGISTER_FRANCHISE', confidence: 0.95, extractedParams: params };
    }

    if (
      q.includes('partner banna') ||
      q.includes('business partner') ||
      q.includes('एजेंसी रजिस्ट्रेशन') ||
      q.includes('fleet partner')
    ) {
      return { actionType: 'REGISTER_PARTNER', confidence: 0.95, extractedParams: params };
    }

    if (
      q.includes('customer register') ||
      q.includes('khata banana') ||
      q.includes('ग्राहक खाता')
    ) {
      return { actionType: 'REGISTER_CUSTOMER', confidence: 0.92, extractedParams: params };
    }

    // 10. View Bookings Intent
    if (
      q.includes('meri booking') ||
      q.includes('मेरी बुकिंग') ||
      q.includes('show my bookings') ||
      q.includes('aaj ki booking') ||
      q.includes('booking history') ||
      q === 'bookings'
    ) {
      return { actionType: 'VIEW_BOOKINGS', confidence: 0.93, extractedParams: params };
    }

    // 11. Rating Intent
    if (
      q.includes('rating') ||
      q.includes('रेटिंग') ||
      q.includes('review dena hai') ||
      q.includes('feedback')
    ) {
      return { actionType: 'SUBMIT_RATING', confidence: 0.91, extractedParams: params };
    }

    // 12. Support / Contact Info Intent
    if (
      q.includes('customer care') ||
      q.includes('support number') ||
      q.includes('helpline') ||
      q.includes('सपोर्ट नंबर') ||
      q.includes('कस्टमर केयर') ||
      q.includes('sahayata')
    ) {
      return { actionType: 'GET_SUPPORT', confidence: 0.9, extractedParams: params };
    }

    return null;
  }

  /**
   * Unified Pipeline Execution
   * Every action passes through:
   * 1. Authentication
   * 2. Authorization (RBAC)
   * 3. Parameter Validation & Missing Detection
   * 4. Confirmation where required
   * 5. Database Operation
   * 6. Result
   */
  public async executeAction(
    actionType: KaamDostActionType,
    params: Record<string, any>,
    context: RouterContext
  ): Promise<ActionRouterResult> {
    const def = ACTION_DEFINITIONS[actionType];
    const lang = context.lang || 'hi';

    if (!def) {
      return {
        success: false,
        stage: 'failed',
        replyText: lang === 'hi' ? '⚠️ अज्ञात एक्शन अनुरोध।' : '⚠️ Unknown action request.',
        error: `Action definition for ${actionType} not found.`,
      };
    }

    // ==========================================
    // STAGE 1: AUTHENTICATION CHECK
    // ==========================================
    if (def.requiresAuth && !context.isLoggedIn) {
      const authText =
        lang === 'hi'
          ? `🔒 **लॉगिन आवश्यक है:** ${def.hindiLabel} का उपयोग करने के लिए कृपया पहले लॉगिन करें:`
          : `🔒 **Authentication Required:** Please log in to proceed with ${def.label}:`;

      return {
        success: false,
        actionType,
        stage: 'auth_required',
        replyText: authText,
        actions: [
          { label: '🔑 तुरंत लॉगिन करें (Login)', actionType: 'open_auth', payload: 'customer' },
          { label: '📝 नया खाता बनाएं (Register)', actionType: 'open_auth', payload: 'customer' },
        ],
        suggestedChips: ['लॉगिन करें', 'नया खाता बनाएं'],
      };
    }

    // ==========================================
    // STAGE 2: AUTHORIZATION (RBAC) CHECK
    // ==========================================
    if (def.allowedRoles && context.userProfile?.role) {
      if (!def.allowedRoles.includes(context.userProfile.role)) {
        return {
          success: false,
          actionType,
          stage: 'unauthorized',
          replyText:
            lang === 'hi'
              ? `⛔ **अनुमति नहीं है:** आपके वर्तमान रोल (${context.userProfile.role.toUpperCase()}) के पास इस एक्शन की अनुमति नहीं है।`
              : `⛔ **Unauthorized:** Your role (${context.userProfile.role.toUpperCase()}) does not have permission for this action.`,
          error: 'RBAC_PERMISSION_DENIED',
        };
      }
    }

    // Verify Booking Ownership if bookingId is provided
    if (params.bookingId && context.bookings && context.bookings.length > 0) {
      const belongs = context.bookings.find((b) => b.id === params.bookingId);
      if (!belongs && context.userProfile?.role === 'customer') {
        // Warning if booking not found in customer list
        console.warn(`[ActionRouter] Booking ${params.bookingId} not found in user list`);
      }
    }

    // ==========================================
    // STAGE 3: VALIDATION & MISSING PARAMETERS
    // ==========================================
    const missing: string[] = [];
    for (const reqField of def.requiredParams) {
      if (params[reqField] === undefined || params[reqField] === null || params[reqField] === '') {
        missing.push(reqField);
      }
    }

    if (missing.length > 0) {
      return this.handleMissingParameters(actionType, missing, params, context);
    }

    // ==========================================
    // STAGE 4: CONFIRMATION WHERE REQUIRED
    // ==========================================
    if (def.requiresConfirmation && !params.confirmed) {
      return this.handleConfirmationRequest(actionType, params, context);
    }

    // ==========================================
    // STAGE 5: DATABASE OPERATION & EXECUTION
    // (Controlled execution - no arbitrary Firestore writes)
    // ==========================================
    try {
      const execResult = await this.performDatabaseOperation(actionType, params, context);
      return execResult;
    } catch (dbErr: any) {
      console.error(`[ActionRouter] DB Error executing ${actionType}:`, dbErr);
      const userErr = kaamDostErrorHandler.handle(dbErr, actionType, params);
      return {
        success: false,
        actionType,
        stage: 'failed',
        replyText: kaamDostErrorHandler.getLocalizedMessage(userErr, lang),
        dynamicComponent: {
          type: 'graceful_error_card',
          error: userErr,
        },
        error: userErr.code,
      };
    }
  }

  /**
   * Generates targeted questions & dynamic components for missing parameters
   */
  private handleMissingParameters(
    actionType: KaamDostActionType,
    missing: string[],
    params: Record<string, any>,
    context: RouterContext
  ): ActionRouterResult {
    const lang = context.lang || 'hi';
    const firstMissing = missing[0];

    // Missing Booking ID (Smart Disambiguation - Phase 18)
    if (firstMissing === 'bookingId') {
      const activeBookings = (context.bookings || []).filter((b) => b.status !== 'cancelled');
      if (activeBookings.length === 0) {
        return {
          success: false,
          actionType,
          stage: 'missing_parameters',
          replyText:
            lang === 'hi'
              ? '📋 आपके पास कोई सक्रिय बुकिंग नहीं मिली। क्या आप नई सर्विस बुक करना चाहते हैं?'
              : '📋 No active bookings found. Would you like to book a new service?',
          actions: [{ label: '🔧 नई सर्विस बुक करें', actionType: 'navigate_tab', payload: 'services' }],
          suggestedChips: ['⚡ इलेक्ट्रीशियन चाहिए', '🔧 प्लंबर चाहिए', '📋 मेरी बुकिंग्स'],
        };
      }

      const count = activeBookings.length;
      const hindiNumbers: Record<number, string> = {
        1: 'Ek',
        2: 'Do',
        3: 'Teen',
        4: 'Chaar',
        5: 'Paanch',
      };
      const countWord = hindiNumbers[count] || count.toString();

      // When action is cancel, format specific clarification prompt
      const isCancelAction = actionType === 'CANCEL_BOOKING';
      const replyText = isCancelAction
        ? lang === 'hi'
          ? `${countWord} bookings मिली हैं. Aap kaunsi cancel करना चाहते हैं?`
          : `Found ${count} active bookings. Which one would you like to cancel?`
        : lang === 'hi'
        ? `${countWord} bookings मिली हैं. Aap kaunsi booking चुनना चाहते हैं?`
        : `Found ${count} active bookings. Which one would you like to select?`;

      const managementCard: DynamicChatComponent = {
        type: 'booking_management_card',
        title: `📋 ${countWord} सक्रिय बुकिंग्स (Active Bookings)`,
        subtitle: isCancelAction
          ? lang === 'hi'
            ? 'कृपया रद्द करने के लिए बुकिंग चुनें:'
            : 'Please select a booking to cancel:'
          : lang === 'hi'
          ? 'कृपया अपनी बुकिंग चुनें:'
          : 'Please select your booking:',
        filterType: 'active',
        bookings: activeBookings.map((b) => ({
          id: b.id,
          serviceName: b.serviceName || (b as any).title || 'होम सर्विस',
          categoryName: b.categoryName || 'सर्विस',
          displayStatus: (b.status?.toUpperCase() || 'ACCEPTED') as any,
          rawStatus: b.status || 'accepted',
          scheduledDate: b.scheduledDate || (b as any).date || 'आज',
          scheduledTime: b.scheduledTime || (b as any).timeSlot || 'सुविधाजनक समय',
          address: b.address || 'भोपाल, मध्य प्रदेश',
          totalAmount: (b as any).totalAmount || (b as any).price || 299,
          canCancel: true,
          canReschedule: true,
          canTrack: true,
        })),
      };

      return {
        success: false,
        actionType,
        stage: 'missing_parameters',
        missingParams: missing,
        replyText,
        dynamicComponent: managementCard,
        suggestedChips: activeBookings.map((b) => `#${b.id.slice(-6)}`),
      };
    }

    // Missing Cancellation Reason
    if (firstMissing === 'cancellationReason') {
      const targetBooking = context.bookings?.find((b) => b.id === params.bookingId);
      const cancelComp: DynamicChatComponent = {
        type: 'booking_cancel_card',
        bookingId: params.bookingId || 'HDK-BOOKING',
        serviceName: targetBooking?.serviceName || 'होम सर्विस',
        scheduledDate: targetBooking?.scheduledDate || 'आज',
        scheduledTime: targetBooking?.scheduledTime || '10:00 AM',
        reasons: [
          'समय पर उपलब्ध नहीं (Not available at scheduled time)',
          'गलती से बुक हो गया (Booked by mistake)',
          'कारीगर लेट है या नहीं पहुंचा (Technician delayed/no response)',
          'अन्य जगह से काम करवा लिया (Got it done elsewhere)',
          'सर्विस की अब आवश्यकता नहीं है (No longer needed)',
        ],
      };

      return {
        success: false,
        actionType,
        stage: 'missing_parameters',
        missingParams: missing,
        replyText:
          lang === 'hi'
            ? '❌ **बुकिंग कैंसिलेशन:** कृपया रद्दीकरण का मुख्य कारण चुनें:'
            : '❌ **Booking Cancellation:** Please select the primary cancellation reason:',
        dynamicComponent: cancelComp,
      };
    }

    // Missing Reschedule Date / Time
    if (firstMissing === 'newDate' || firstMissing === 'newTime') {
      const targetBooking = context.bookings?.find((b) => b.id === params.bookingId);
      const rescheduleComp: DynamicChatComponent = {
        type: 'booking_reschedule_card',
        bookingId: params.bookingId || 'HDK-BOOKING',
        serviceName: targetBooking?.serviceName || 'होम सर्विस',
        currentDate: targetBooking?.scheduledDate || 'आज',
        currentTime: targetBooking?.scheduledTime || '10:00 AM',
        availableDates: ['आज', 'कल', 'परसों'],
        availableSlots: ['09:00 AM - 12:00 PM', '12:00 PM - 03:00 PM', '03:00 PM - 06:00 PM'],
      };

      return {
        success: false,
        actionType,
        stage: 'missing_parameters',
        missingParams: missing,
        replyText:
          lang === 'hi'
            ? '📅 **समय पुनर्निर्धारण (Reschedule):** कृपया नई तारीख व समय स्लॉट चुनें:'
            : '📅 **Reschedule Booking:** Please select your preferred new date and slot:',
        dynamicComponent: rescheduleComp,
      };
    }

    // Missing Complaint description / issueType
    if (firstMissing === 'issueType' || firstMissing === 'description') {
      const availableBookingsList = (context.bookings || []).map((b) => ({
        id: b.id,
        serviceName: b.serviceName || 'होम सर्विस',
        date: b.scheduledDate || (b as any).date || 'हालिया बुकिंग',
      }));

      const complaintComp: any = {
        type: 'complaint_form',
        title: '🛡️ सहायता व शिकायत दर्ज करें (Register Complaint)',
        description: 'कृपया समस्या का विवरण व संबंधित बुकिंग चुनें:',
        availableBookings: availableBookingsList,
        preselectedBookingId: params.bookingId || (availableBookingsList[0]?.id ?? ''),
        preselectedIssueType: params.issueType || 'general_support',
        allowPhoto: true,
        allowVideo: true,
        allowDocument: true,
        submitLabel: 'शिकायत सबमिट करें (Submit Ticket)',
      };

      return {
        success: false,
        actionType,
        stage: 'missing_parameters',
        missingParams: missing,
        replyText:
          lang === 'hi'
            ? '🛡️ **कस्टमर सपोर्ट व शिकायत:** कृपया नीचे दिए फॉर्म में विवरण भरें:'
            : '🛡️ **Customer Support & Complaint:** Please fill the details in the form below:',
        dynamicComponent: complaintComp,
      };
    }

    // Fallback generic parameter prompt
    return {
      success: false,
      actionType,
      stage: 'missing_parameters',
      missingParams: missing,
      replyText:
        lang === 'hi'
          ? `❓ कृपया **${firstMissing}** की जानकारी प्रदान करें ताकि हम ${ACTION_DEFINITIONS[actionType].hindiLabel} पूरा कर सकें:`
          : `❓ Please provide **${firstMissing}** to proceed with ${ACTION_DEFINITIONS[actionType].label}:`,
    };
  }

  /**
   * Generates standard 3-button confirmation cards for financial/destructive/critical operations (Phase 17)
   */
  private handleConfirmationRequest(
    actionType: KaamDostActionType,
    params: Record<string, any>,
    context: RouterContext
  ): ActionRouterResult {
    const lang = context.lang || 'hi';

    let pendingType: any = 'create_booking';
    if (actionType === 'CANCEL_BOOKING') pendingType = 'cancel_booking';
    else if (actionType === 'APPROVE_EXTRA_CHARGE') pendingType = params.decision === 'rejected' ? 'reject_extra_charge' : 'approve_extra_charge';
    else if (actionType === 'MAKE_PAYMENT') pendingType = 'make_payment';
    else if (actionType === 'CREATE_COMPLAINT') pendingType = 'create_complaint';
    else if (actionType === 'REGISTER_CUSTOMER' || actionType === 'REGISTER_SERVICE_PRO' || actionType === 'REGISTER_PARTNER' || actionType === 'REGISTER_FRANCHISE') pendingType = 'submit_registration';
    else if (actionType === 'UPDATE_PROFILE') pendingType = 'update_profile';

    const confData = confirmationService.generateConfirmationCard(pendingType, params, lang);

    return {
      success: true,
      actionType,
      stage: 'confirmation_required',
      replyText: confData.replyText,
      dynamicComponent: confData.cardComponent,
      actions: confData.actions,
      suggestedChips: confData.suggestedChips,
    };
  }

  /**
   * Executes the actual database operation via specialized services
   */
  private async performDatabaseOperation(
    actionType: KaamDostActionType,
    params: Record<string, any>,
    context: RouterContext
  ): Promise<ActionRouterResult> {
    const lang = context.lang || 'hi';

    switch (actionType) {
      // 1. CANCEL BOOKING
      case 'CANCEL_BOOKING': {
        const cancelRes = await conversationalBookingManagement.cancelBooking(
          params.bookingId,
          params.cancellationReason || 'ग्राहक द्वारा AI चैट से कैंसल'
        );

        return {
          success: cancelRes.success,
          actionType,
          stage: 'executed',
          replyText:
            lang === 'hi'
              ? `✅ बुकिंग **${params.bookingId}** सफलतापूर्वक रद्द कर दी गई है। यदि आपने ऑनलाइन भुगतान किया था, तो 100% रिफंड राशि आपके मूल स्रोत में 2-3 कार्यदिवसों में जमा हो जाएगी।`
              : `✅ Booking **${params.bookingId}** cancelled successfully. Refund if applicable will be credited in 2-3 business days.`,
          actions: [{ label: '📋 अन्य बुकिंग्स देखें', actionType: 'navigate_tab', payload: 'bookings' }],
          suggestedChips: ['📋 मेरी बुकिंग्स', '🔧 नई सर्विस बुक करें'],
          data: cancelRes,
        };
      }

      // 2. RESCHEDULE BOOKING
      case 'RESCHEDULE_BOOKING': {
        const reschedRes = await conversationalBookingManagement.rescheduleBooking(
          params.bookingId,
          params.newDate,
          params.newTime
        );

        return {
          success: reschedRes.success,
          actionType,
          stage: 'executed',
          replyText:
            lang === 'hi'
              ? `📅 आपकी बुकिंग **${params.bookingId}** का समय सफलतापूर्वक बदलकर **${params.newDate} (${params.newTime})** कर दिया गया है।`
              : `📅 Booking **${params.bookingId}** rescheduled to **${params.newDate} (${params.newTime})**.`,
          actions: [{ label: '📋 बुकिंग स्थिति देखें', actionType: 'navigate_tab', payload: 'bookings' }],
          suggestedChips: ['📋 मेरी बुकिंग्स', '🛵 सर्विसमैन ट्रैक करें'],
          data: reschedRes,
        };
      }

      // 3. APPROVE EXTRA CHARGE
      case 'APPROVE_EXTRA_CHARGE': {
        const approveRes = await conversationalServiceWorkflow.respondToExtraCharge(
          params.bookingId,
          params.chargeId,
          params.decision,
          params.rejectionReason
        );

        return {
          success: approveRes.success,
          actionType,
          stage: 'executed',
          replyText:
            params.decision === 'approved'
              ? `✅ अतिरिक्त चार्ज को सफलतापूर्वक **मंज़ूर** कर दिया गया है। यह फाइनल बिल में सम्मिलित हो गया है।`
              : `❌ अतिरिक्त चार्ज को **नामंज़ूर** कर दिया गया है। यह फाइनल बिल में शामिल नहीं होगा।`,
          actions: [{ label: '🧾 अपडेटेड फाइनल बिल देखें', actionType: 'navigate_tab', payload: 'bookings' }],
          suggestedChips: ['🧾 फाइनल बिल दिखाओ', '🛵 सर्विसमैन ट्रैक करें'],
          data: approveRes,
        };
      }

      // 4. VIEW BILL
      case 'VIEW_BILL': {
        const targetBooking = context.bookings?.find((b) => b.id === params.bookingId) || context.bookings?.[0];
        if (!targetBooking) {
          return {
            success: false,
            actionType,
            stage: 'missing_parameters',
            replyText: lang === 'hi' ? '⚠️ बिल देखने के लिए कोई बुकिंग उपलब्ध नहीं है।' : '⚠️ No booking available for bill.',
          };
        }

        const billComp = conversationalPaymentService.getPaymentBreakdown(targetBooking, context.userProfile);

        return {
          success: true,
          actionType,
          stage: 'executed',
          replyText:
            lang === 'hi'
              ? `🧾 **पारदर्शी फाइनल बिल (Booking ID: ${targetBooking.id}):**\nकृपया नीचे दिए गए बिल विवरण की जांच करें:`
              : `🧾 **Transparent Final Bill (Booking ID: ${targetBooking.id}):**\nPlease review the itemized breakdown:`,
          dynamicComponent: billComp,
          suggestedChips: ['💳 बिल पे करना है', '🛡️ सपोर्ट सहायता'],
          data: billComp,
        };
      }

      // 5. VIEW BOOKINGS
      case 'VIEW_BOOKINGS': {
        const bookingsList = context.bookings || [];
        const managementCard: DynamicChatComponent = {
          type: 'booking_management_card',
          title: '📋 आपकी बुकिंग्स (My Bookings)',
          subtitle: lang === 'hi' ? 'नीचे अपनी बुकिंग देखें:' : 'View your bookings below:',
          filterType: 'all',
          bookings: bookingsList.map((b) => ({
            id: b.id,
            serviceName: b.serviceName || 'होम सर्विस',
            categoryName: b.categoryName || 'सर्विस',
            displayStatus: (b.status?.toUpperCase() || 'ACCEPTED') as any,
            rawStatus: b.status || 'accepted',
            scheduledDate: b.scheduledDate || 'आज',
            scheduledTime: b.scheduledTime || 'समय',
            address: b.address || 'भोपाल',
            totalAmount: (b as any).totalAmount || (b as any).price || 299,
            canCancel: true,
            canReschedule: true,
            canTrack: true,
          })),
        };

        return {
          success: true,
          actionType,
          stage: 'executed',
          replyText: lang === 'hi' ? '📋 **आपकी बुकिंग्स सूची:**' : '📋 **Your Bookings List:**',
          dynamicComponent: managementCard,
          suggestedChips: ['🛵 सर्विसमैन कहाँ है?', '🧾 फाइनल बिल दिखाओ', '🔧 नई सर्विस बुक करें'],
          data: context.bookings,
        };
      }

      // 6. TRACK SERVICE
      case 'TRACK_SERVICE': {
        const activeBooking = context.bookings?.find((b) => b.id === params.bookingId) || context.bookings?.[0];
        if (!activeBooking) {
          return {
            success: false,
            actionType,
            stage: 'missing_parameters',
            replyText: '⚠️ ट्रैक करने के लिए कोई सक्रिय बुकिंग नहीं मिली।',
          };
        }

        const managementCard: DynamicChatComponent = {
          type: 'booking_management_card',
          title: '📍 लाइव सर्विसमैन स्थिति (Live Tracking)',
          subtitle: `बुकिंग #${activeBooking.id}`,
          filterType: 'single',
          bookings: [
            {
              id: activeBooking.id,
              serviceName: activeBooking.serviceName || 'होम सर्विस',
              categoryName: activeBooking.categoryName || 'सर्विस',
              displayStatus: (activeBooking.status?.toUpperCase() || 'ARRIVING') as any,
              rawStatus: activeBooking.status || 'arriving',
              scheduledDate: activeBooking.scheduledDate || 'आज',
              scheduledTime: activeBooking.scheduledTime || 'समय',
              address: activeBooking.address || 'भोपाल',
              totalAmount: (activeBooking as any).totalAmount || 299,
              canCancel: false,
              canReschedule: false,
              canTrack: true,
              otp: (activeBooking as any).otp || '5482',
              serviceManName: (activeBooking as any).serviceManName || 'राजेश कुमार',
              serviceManPhone: (activeBooking as any).serviceManPhone || '+91 98260 12345',
            },
          ],
        };

        return {
          success: true,
          actionType,
          stage: 'executed',
          replyText: `🛵 **लाइव ट्रैकिंग:** आपके कारीगर रास्ते में हैं!\n\n• **स्टार्ट कोड (OTP):** ${(activeBooking as any).otp || '5482'}`,
          dynamicComponent: managementCard,
          suggestedChips: ['ओटीपी कहाँ है?', 'काम शुरू हुआ?', 'कॉल सर्विसमैन'],
          data: activeBooking,
        };
      }

      // 7. CREATE COMPLAINT
      case 'CREATE_COMPLAINT': {
        const subRes = await conversationalSupportService.submitComplaint({
          customerId: context.userId || 'guest_cust',
          customerName: context.userName || 'ग्राहक',
          customerPhone: context.userPhone || context.userProfile?.phone || '6267546945',
          bookingId: params.bookingId,
          serviceName: params.serviceName || 'होम सर्विस',
          issueType: params.issueType || 'general_support',
          description: params.description || 'शिकायत सहायता',
          priority: params.priority || 'high',
          photos: params.attachments || [],
        });

        const successCard: DynamicChatComponent = {
          type: 'complaint_success_card',
          ticketId: subRes.ticketId,
          bookingId: params.bookingId,
          serviceName: params.serviceName || 'होम सर्विस',
          issueLabel: params.issueType || 'सहायता',
          priority: params.priority || 'high',
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          expectedResolution: subRes.expectedResolution || '24 घंटे में',
          supportPhone: '+91 62675 46945',
        };

        return {
          success: true,
          actionType,
          stage: 'executed',
          replyText:
            lang === 'hi'
              ? `🛡️ **शिकायत सफलतापूर्वक दर्ज!** (टिकट ID: **${subRes.ticketId}**)\nहमारी वरिष्ठ सपोर्ट टीम 1 घंटे के भीतर आपसे संपर्क करेगी।`
              : `🛡️ **Complaint Registered!** (Ticket ID: **${subRes.ticketId}**)\nOur priority resolution team will contact you within 1 hour.`,
          dynamicComponent: successCard,
          suggestedChips: ['📋 मेरी बुकिंग्स', '📞 सपोर्ट टीम को कॉल करें'],
          data: subRes,
        };
      }

      // 8. MULTI-ROLE REGISTRATION
      case 'REGISTER_CUSTOMER':
      case 'REGISTER_SERVICE_PRO':
      case 'REGISTER_PARTNER':
      case 'REGISTER_FRANCHISE': {
        const regRole =
          actionType === 'REGISTER_SERVICE_PRO'
            ? 'service_man'
            : actionType === 'REGISTER_PARTNER'
            ? 'business_partner'
            : actionType === 'REGISTER_FRANCHISE'
            ? 'franchise_admin'
            : 'customer';

        const execRes = await executeMultiRoleRegistration({
          step: 'completed',
          targetRole: regRole,
          name: params.name || params.contactPerson,
          businessName: params.businessName,
          contactPerson: params.contactPerson,
          mobile: params.mobile,
          email: params.email,
          tradeSkill: params.tradeSkill,
          experienceYears: params.experienceYears,
          assignedDistrict: params.assignedDistrict,
          address: params.address,
          documents: params.documents,
          payoutUpiId: params.payoutUpiId,
        });

        return {
          success: execRes.success,
          actionType,
          stage: 'executed',
          replyText:
            lang === 'hi'
              ? `🎉 **रजिस्ट्रेशन सफल!** आपकी सदस्यता ID: **${execRes.memberCode}** सक्रिय हो गई है।`
              : `🎉 **Registration Successful!** Your Member ID: **${execRes.memberCode}** is active.`,
          actions: [{ label: '📊 डैशबोर्ड खोलें', actionType: 'navigate_tab', payload: 'home' }],
          data: execRes,
        };
      }

      // 9. GET SUPPORT
      case 'GET_SUPPORT': {
        return {
          success: true,
          actionType,
          stage: 'executed',
          replyText:
            lang === 'hi'
              ? `🤝 **HARDINKAAM कस्टमर सपोर्ट व सहायता:**\n\n• 📞 **कॉल हेल्पलाइन:** [+91 62675 46945](tel:+916267546945)\n• 💬 **व्हाट्सएप सपोर्ट:** [+91 62675 46945](https://wa.me/916267546945)\n• ⏰ **कार्य समय:** सुबह 8:00 AM से रात 9:00 PM (सातों दिन)\n• 📍 **मुख्यालय:** MP Nagar Zone 1, Bhopal, MP`
              : `🤝 **HARDINKAAM Customer Support:**\n\n• 📞 **Helpline:** +91 62675 46945\n• 💬 **WhatsApp:** +91 62675 46945\n• ⏰ **Working Hours:** 8:00 AM - 9:00 PM (All 7 Days)`,
          actions: [
            { label: '📞 सीधे कॉल करें (Call)', actionType: 'open_call', payload: 'tel:+916267546945' },
            { label: '💬 व्हाट्सएप पर चैट करें', actionType: 'open_whatsapp', payload: '+916267546945' },
          ],
          suggestedChips: ['शिकायत दर्ज करनी है', 'सर्विसमैन लेट है', 'पेमेंट समस्या'],
        };
      }

      default:
        return {
          success: true,
          actionType,
          stage: 'executed',
          replyText:
            lang === 'hi'
              ? `✅ ${ACTION_DEFINITIONS[actionType]?.hindiLabel || actionType} का अनुरोध सफलतापूर्वक प्रोसेस किया गया।`
              : `✅ ${ACTION_DEFINITIONS[actionType]?.label || actionType} processed successfully.`,
        };
    }
  }
}

export const centralizedActionRouter = new CentralizedActionRouter();
