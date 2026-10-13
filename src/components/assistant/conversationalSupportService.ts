import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Booking } from '../../types';

export interface SupportIssueCategory {
  id: string;
  label: string;
  icon: string;
  defaultPriority: 'low' | 'medium' | 'high' | 'urgent';
  defaultResolutionHours: number;
}

export const SUPPORT_ISSUE_CATEGORIES: SupportIssueCategory[] = [
  {
    id: 'serviceman_late',
    label: 'सर्विसमैन लेट / नहीं पहुँचा (ServiceMan Late / No Show)',
    icon: '🛵',
    defaultPriority: 'high',
    defaultResolutionHours: 1,
  },
  {
    id: 'payment_issue',
    label: 'पेमेंट व बिलिंग समस्या (Payment / Billing Issue)',
    icon: '💳',
    defaultPriority: 'high',
    defaultResolutionHours: 2,
  },
  {
    id: 'refund_help',
    label: 'रिफंड व कैंसिलेशन सहायता (Refund / Cancellation Help)',
    icon: '💰',
    defaultPriority: 'medium',
    defaultResolutionHours: 4,
  },
  {
    id: 'booking_problem',
    label: 'बुकिंग में तकनीकी खराबी (Booking Problem)',
    icon: '📋',
    defaultPriority: 'medium',
    defaultResolutionHours: 2,
  },
  {
    id: 'service_quality',
    label: 'काम की गुणवत्ता / असंतुष्टि (Service Quality / Workmanship)',
    icon: '⚠️',
    defaultPriority: 'high',
    defaultResolutionHours: 2,
  },
  {
    id: 'general_support',
    label: 'अन्य सहायता / सामान्य पूछताछ (General Support)',
    icon: '💬',
    defaultPriority: 'low',
    defaultResolutionHours: 6,
  },
];

export interface SubmitComplaintParams {
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  bookingId?: string;
  serviceName?: string;
  issueType: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  photos?: string[];
  videoUrl?: string;
  documentUrl?: string;
  attachments?: any[];
}

export class ConversationalSupportService {
  /**
   * Detects if user query is a complaint or support request
   */
  public isSupportIntent(query: string): boolean {
    const q = query.toLowerCase().trim();

    return (
      q.includes('serviceman late') ||
      q.includes('service man late') ||
      q.includes('late hai') ||
      q.includes('nahi aaya') ||
      q.includes('let hai') ||
      q.includes('payment problem') ||
      q.includes('payment issue') ||
      q.includes('paise kat gaye') ||
      q.includes('booking mein problem') ||
      q.includes('booking problem') ||
      q.includes('refund') ||
      q.includes('refund help') ||
      q.includes('complaint') ||
      q.includes('शिकायत') ||
      q.includes('help chahiye') ||
      q.includes('support') ||
      q.includes('कस्टमर केयर') ||
      q.includes('हेल्पलाइन') ||
      q.includes('मदद चाहिए') ||
      q.includes('समस्या है')
    );
  }

  /**
   * Identifies matching issue category from user query
   */
  public detectIssueType(query: string): SupportIssueCategory {
    const q = query.toLowerCase().trim();

    if (q.includes('late') || q.includes('nahi aaya') || q.includes('लेट') || q.includes('पहुँचा नहीं')) {
      return SUPPORT_ISSUE_CATEGORIES[0]; // serviceman_late
    }
    if (q.includes('payment') || q.includes('paise') || q.includes('पेमेंट') || q.includes('पैसे')) {
      return SUPPORT_ISSUE_CATEGORIES[1]; // payment_issue
    }
    if (q.includes('refund') || q.includes('रिफंड') || q.includes('पैसे वापस')) {
      return SUPPORT_ISSUE_CATEGORIES[2]; // refund_help
    }
    if (q.includes('booking') || q.includes('बुकिंग')) {
      return SUPPORT_ISSUE_CATEGORIES[3]; // booking_problem
    }
    if (q.includes('quality') || q.includes('kharab') || q.includes('काम सही नहीं') || q.includes('खराब')) {
      return SUPPORT_ISSUE_CATEGORIES[4]; // service_quality
    }
    return SUPPORT_ISSUE_CATEGORIES[5]; // general_support
  }

  /**
   * Identifies the most relevant booking for complaint
   */
  public identifyTargetBooking(bookings: Booking[], query: string): Booking | undefined {
    if (!bookings || bookings.length === 0) return undefined;

    // Check if a specific booking ID is in the query (e.g. "#123" or "BK-")
    const match = query.match(/#?([a-zA-Z0-9_-]{4,})/);
    if (match) {
      const found = bookings.find((b) => b.id.toLowerCase() === match[1].toLowerCase());
      if (found) return found;
    }

    // Default to active or most recent booking
    const active = bookings.find(
      (b) => b.status === 'in_progress' || b.status === 'on_the_way' || b.status === 'arrived' || b.status === 'accepted'
    );
    return active || bookings[0];
  }

  /**
   * Submits a support complaint to Firestore and generates tracking ticket
   */
  public async submitComplaint(params: SubmitComplaintParams): Promise<{
    success: boolean;
    ticketId: string;
    message: string;
    expectedResolution: string;
  }> {
    const ticketId = `HD-CMP-${Math.floor(10000 + Math.random() * 90000)}`;
    const nowIso = new Date().toISOString();

    const cat = SUPPORT_ISSUE_CATEGORIES.find((c) => c.id === params.issueType) || SUPPORT_ISSUE_CATEGORIES[5];
    const expectedHours = cat.defaultResolutionHours || 2;
    const expectedResolution = `${expectedHours} घंटे के भीतर (Within ${expectedHours} Hours)`;

    const complaintRecord = {
      id: ticketId,
      ticketNumber: ticketId,
      customerId: params.customerId || 'cust_guest',
      customerName: params.customerName || 'Customer',
      customerPhone: params.customerPhone || '9876543210',
      customerEmail: params.customerEmail || 'customer@hardinkaam.com',
      bookingId: params.bookingId || 'GENERAL',
      serviceName: params.serviceName || 'Home Service',
      issueType: params.issueType,
      issueCategoryLabel: cat.label,
      description: params.description || 'Customer raised complaint via KaamDost Assistant',
      priority: params.priority || cat.defaultPriority,
      photos: params.photos || [],
      videoUrl: params.videoUrl || null,
      documentUrl: params.documentUrl || null,
      status: 'open',
      channel: 'kaamdost_ai',
      expectedResolution,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    try {
      // 1. Save in complaints collection
      await setDoc(doc(db, 'complaints', ticketId), complaintRecord);

      // 2. Also register in support_tickets for admin dashboard visibility
      try {
        await setDoc(doc(db, 'support_tickets', ticketId), complaintRecord);
      } catch (tErr) {
        console.warn('Support ticket mirrored note:', tErr);
      }

      return {
        success: true,
        ticketId,
        expectedResolution,
        message: `आपकी शिकायत (Ticket #${ticketId}) सफलतापूर्वक दर्ज कर ली गई है। हमारी कस्टमर सपोर्ट टीम ${expectedResolution} आपसे संपर्क करेगी।`,
      };
    } catch (err: any) {
      console.error('[ConversationalSupport] Submit failed:', err);
      return {
        success: false,
        ticketId,
        expectedResolution,
        message: `शिकायत दर्ज करने में समस्या आई: ${err.message || 'Firestore error'}`,
      };
    }
  }
}

export const conversationalSupport = new ConversationalSupportService();
export const conversationalSupportService = conversationalSupport;
