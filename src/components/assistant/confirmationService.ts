import { ActionConfirmationCardComponent } from './componentTypes';
import { AssistantLanguage, ActionItem } from './types';

export type ConfirmationIntentType = 'CONFIRMED' | 'EDIT' | 'CANCELLED' | 'AMBIGUOUS';

export interface PendingConfirmationState {
  actionType:
    | 'create_booking'
    | 'cancel_booking'
    | 'make_payment'
    | 'approve_extra_charge'
    | 'reject_extra_charge'
    | 'submit_registration'
    | 'update_profile'
    | 'create_complaint';
  title: string;
  summary: string;
  amount?: number;
  payload: Record<string, any>;
  createdAt: number;
}

export class ConfirmationService {
  /**
   * Recognizes natural language confirmation responses in Hindi, Hinglish, and English
   */
  public classifyConfirmationIntent(input: string): ConfirmationIntentType {
    const raw = (input || '').trim().toLowerCase();

    // 1. AFFIRMATIVE / YES / CONFIRM
    // Matches: "yes", "haan", "ha", "haanji", "confirm", "kar do", "kardo", "approve", "theek hai",
    // "yes confirm", "proceed", "aage badho", "sahi hai", "ok", "done", "manjur hai", "agree", "han"
    const isAffirmative =
      /^(yes|confirm|yes confirm|proceed|approve|ok|done|agree|sure|go ahead|do it)$/i.test(raw) ||
      /^(हाँ|हाँजी|हाँ कन्फर्म|कन्फर्म|कर दो|करदो|हां|हांजी|ठीक है|मंज़ूर है|सही है|आगे बढ़ो|बिलकुल|हाँ कर दो)$/i.test(raw) ||
      raw === 'yes, confirm' ||
      raw === 'हाँ, कन्फर्म करें' ||
      raw === 'haan' ||
      raw === 'ha' ||
      raw === 'han' ||
      raw === 'haanji' ||
      raw === 'kardo' ||
      raw === 'kar do' ||
      raw === 'ha kardo' ||
      raw === 'haan kardo' ||
      raw === 'theek hai' ||
      raw === 'confirm karo' ||
      raw === 'aage badho' ||
      raw === 'sahi hai' ||
      raw === 'approve karo' ||
      raw === 'manzoor hai' ||
      raw === 'manjur hai' ||
      raw.includes('haan confirm') ||
      raw.includes('yes confirm') ||
      raw.includes('kar do') ||
      raw.includes('kardo');

    if (isAffirmative) {
      return 'CONFIRMED';
    }

    // 2. EDIT / CHANGE / MODIFY
    // Matches: "edit", "change", "badlo", "badalna hai", "modify", "kuch aur", "dusra time"
    const isEdit =
      /^(edit|change|modify|update)$/i.test(raw) ||
      /^(बदलें|बदलो|एडिट|संशोधन|बदलना है)$/i.test(raw) ||
      raw === 'edit' ||
      raw === 'change' ||
      raw === 'badlo' ||
      raw === 'badalna hai' ||
      raw === 'change karo' ||
      raw === 'edit karo' ||
      raw.includes('badalna') ||
      raw.includes('change karna');

    if (isEdit) {
      return 'EDIT';
    }

    // 3. NEGATIVE / CANCEL / REJECT
    // Matches: "no", "cancel", "stop", "abort", "don't", "nahi", "mat karo", "rehne do", "mana karo"
    const isCancelled =
      /^(no|cancel|stop|abort|don't|dont|never mind)$/i.test(raw) ||
      /^(नहीं|रद्द करें|कैंसिल|मत करो|रहने दो|रुकिए|मना करो)$/i.test(raw) ||
      raw === 'no' ||
      raw === 'nahi' ||
      raw === 'na' ||
      raw === 'cancel' ||
      raw === 'cancel karo' ||
      raw === 'mat karo' ||
      raw === 'rehne do' ||
      raw === 'rehney do' ||
      raw === 'mana karo' ||
      raw === 'nahi chahiye';

    if (isCancelled) {
      return 'CANCELLED';
    }

    // 4. AMBIGUOUS
    // If user says something vague like "shayad", "dekhte hain", "baad mein", "kya pata" or unrelated
    return 'AMBIGUOUS';
  }

  /**
   * Generates standard ActionConfirmationCardComponent for critical actions
   */
  public generateConfirmationCard(
    actionType: PendingConfirmationState['actionType'],
    data: Record<string, any>,
    lang: AssistantLanguage = 'hi'
  ): { replyText: string; cardComponent: ActionConfirmationCardComponent; suggestedChips: string[]; actions: ActionItem[] } {
    switch (actionType) {
      // 1. CREATE BOOKING
      case 'create_booking': {
        const serviceName = data.serviceName || 'होम सर्विस';
        const date = data.scheduledDate || 'आज';
        const time = data.scheduledTime || '10:00 AM - 12:00 PM';
        const amount = data.amount || data.estimatedCharge || 199;
        const address = data.address || 'भोपाल, मध्य प्रदेश';

        const replyText =
          lang === 'hi'
            ? `Main ₹${amount} ki **${serviceName}** booking **${date} (${time})** ke liye confirm karne wala hoon.\n\nKya aap confirm karte hain?`
            : `I am about to confirm your **${serviceName}** booking for ₹${amount} on **${date} (${time})**.\n\nDo you confirm?`;

        const card: ActionConfirmationCardComponent = {
          type: 'action_confirmation_card',
          actionType: 'create_booking',
          title: '📋 बुकिंग पुष्टिकरण (Booking Confirmation)',
          summary: `Main ₹${amount} ki **${serviceName}** booking confirm karne wala hoon.`,
          promptQuestion: 'Kya aap confirm karte hain?',
          amount,
          highlightBadge: '⚡ 60-मिनट डोरस्टेप गारंटी',
          details: [
            { label: 'सेवा (Service):', value: serviceName },
            { label: 'दिनांक व स्लॉट:', value: `${date} (${time})` },
            { label: 'पता (Address):', value: address },
            { label: 'अनुमानित शुल्क:', value: `₹${amount}`, highlight: true },
          ],
          yesLabel: 'Yes, Confirm (हाँ, कन्फर्म करें)',
          editLabel: 'Edit (विवरण बदलें)',
          cancelLabel: 'Cancel (रद्द करें)',
          payload: data,
        };

        return {
          replyText,
          cardComponent: card,
          suggestedChips: ['Yes, Confirm', 'Edit', 'Cancel'],
          actions: [
            { label: '✅ Yes, Confirm', actionType: 'send_query', payload: 'confirm' },
            { label: '✏️ Edit', actionType: 'send_query', payload: 'edit' },
            { label: '❌ Cancel', actionType: 'send_query', payload: 'cancel' },
          ],
        };
      }

      // 2. CANCEL BOOKING
      case 'cancel_booking': {
        const bookingId = data.bookingId || 'HDK-BOOKING';
        const serviceName = data.serviceName || 'होम सर्विस';
        const reason = data.cancellationReason || 'ग्राहक द्वारा अनुरोध';

        const replyText =
          lang === 'hi'
            ? `Main Booking **#${bookingId}** (${serviceName}) ko cancel karne wala hoon.\n\nKya aap confirm karte hain?`
            : `I am about to cancel booking **#${bookingId}** (${serviceName}).\n\nDo you confirm?`;

        const card: ActionConfirmationCardComponent = {
          type: 'action_confirmation_card',
          actionType: 'cancel_booking',
          title: '🚫 बुकिंग रद्दीकरण पुष्टि (Cancel Booking)',
          summary: `Main Booking #${bookingId} ko cancel karne wala hoon.`,
          promptQuestion: 'Kya aap confirm karte hain?',
          highlightBadge: '⚠️ 100% फुल रिफंड लागू',
          details: [
            { label: 'बुकिंग आईडी:', value: `#${bookingId}` },
            { label: 'सेवा का नाम:', value: serviceName },
            { label: 'रद्दीकरण कारण:', value: reason },
          ],
          yesLabel: 'Yes, Confirm Cancel',
          editLabel: 'Keep Booking (जारी रखें)',
          cancelLabel: 'Dismiss (बंद करें)',
          payload: data,
        };

        return {
          replyText,
          cardComponent: card,
          suggestedChips: ['Yes, Confirm', 'Keep Booking', 'Cancel'],
          actions: [
            { label: '❌ Yes, Confirm Cancel', actionType: 'send_query', payload: 'confirm' },
            { label: 'बुकिंग जारी रखें', actionType: 'send_query', payload: 'cancel' },
          ],
        };
      }

      // 3. APPROVE EXTRA CHARGE
      case 'approve_extra_charge': {
        const chargeAmount = data.chargeAmount || data.amount || 450;
        const chargeReason = data.chargeReason || data.reason || 'अतिरिक्त स्पेयर पार्ट्स व सामग्री';
        const bookingId = data.bookingId || 'HDK-BOOKING';

        const replyText =
          lang === 'hi'
            ? `Main ₹${chargeAmount} ka extra charge approve karne wala hoon.\n\nKya aap confirm karte hain?`
            : `I am about to approve the extra charge of ₹${chargeAmount}.\n\nDo you confirm?`;

        const card: ActionConfirmationCardComponent = {
          type: 'action_confirmation_card',
          actionType: 'approve_extra_charge',
          title: '⚡ अतिरिक्त चार्ज स्वीकृति (Approve Extra Charge)',
          summary: `Main ₹${chargeAmount} ka extra charge approve karne wala hoon.`,
          promptQuestion: 'Kya aap confirm karte hain?',
          amount: chargeAmount,
          highlightBadge: '🧾 पारदर्शी बिलिंग',
          details: [
            { label: 'बुकिंग आईडी:', value: `#${bookingId}` },
            { label: 'अतिरिक्त सामग्री/काम:', value: chargeReason },
            { label: 'स्वीकृत होने वाली राशि:', value: `+₹${chargeAmount}`, highlight: true },
          ],
          yesLabel: 'Yes, Confirm (हाँ, मंज़ूर करें)',
          editLabel: 'View Details (विवरण देखें)',
          cancelLabel: 'Reject Charge (नामंज़ूर करें)',
          payload: data,
        };

        return {
          replyText,
          cardComponent: card,
          suggestedChips: ['Yes, Confirm', 'Reject Charge', 'Cancel'],
          actions: [
            { label: '✅ Yes, Confirm', actionType: 'send_query', payload: 'confirm' },
            { label: '❌ Reject Charge', actionType: 'send_query', payload: 'reject' },
          ],
        };
      }

      // 4. REJECT EXTRA CHARGE
      case 'reject_extra_charge': {
        const chargeAmount = data.chargeAmount || data.amount || 450;
        const bookingId = data.bookingId || 'HDK-BOOKING';

        const replyText =
          lang === 'hi'
            ? `Main ₹${chargeAmount} ka extra charge reject karne wala hoon. Yeh aapke bill mein shamil nahi hoga.\n\nKya aap confirm karte hain?`
            : `I am about to reject the extra charge of ₹${chargeAmount}.\n\nDo you confirm?`;

        const card: ActionConfirmationCardComponent = {
          type: 'action_confirmation_card',
          actionType: 'reject_extra_charge',
          title: '❌ अतिरिक्त चार्ज अस्वीकृति (Reject Extra Charge)',
          summary: `Main ₹${chargeAmount} ka extra charge reject karne wala hoon.`,
          promptQuestion: 'Kya aap confirm karte hain?',
          details: [
            { label: 'बुकिंग आईडी:', value: `#${bookingId}` },
            { label: 'अस्वीकृत राशि:', value: `₹${chargeAmount}` },
            { label: 'परिणाम:', value: 'बिल में यह चार्ज नहीं जुड़ेगा' },
          ],
          yesLabel: 'Yes, Confirm Reject',
          editLabel: 'Re-check Charge',
          cancelLabel: 'Cancel',
          payload: data,
        };

        return {
          replyText,
          cardComponent: card,
          suggestedChips: ['Yes, Confirm', 'Cancel'],
          actions: [
            { label: '❌ Yes, Confirm Reject', actionType: 'send_query', payload: 'confirm' },
            { label: 'वापस जाएं', actionType: 'send_query', payload: 'cancel' },
          ],
        };
      }

      // 5. MAKE PAYMENT
      case 'make_payment': {
        const amount = data.amount || 235;
        const bookingId = data.bookingId || 'HDK-BOOKING';
        const serviceName = data.serviceName || 'होम सर्विस';

        const replyText =
          lang === 'hi'
            ? `Main Booking **#${bookingId}** ke liye ₹${amount} ka online payment confirm karne wala hoon.\n\nKya aap confirm karte hain?`
            : `I am about to process online payment of ₹${amount} for Booking **#${bookingId}**.\n\nDo you confirm?`;

        const card: ActionConfirmationCardComponent = {
          type: 'action_confirmation_card',
          actionType: 'make_payment',
          title: '💳 ऑनलाइन भुगतान पुष्टिकरण (Payment Confirmation)',
          summary: `Main Booking #${bookingId} ke liye ₹${amount} ka payment shuru karne wala hoon.`,
          promptQuestion: 'Kya aap confirm karte hain?',
          amount,
          highlightBadge: '🔒 100% सुरक्षित Razorpay पेमेंट',
          details: [
            { label: 'बुकिंग आईडी:', value: `#${bookingId}` },
            { label: 'सेवा:', value: serviceName },
            { label: 'भुगतान राशि:', value: `₹${amount}`, highlight: true },
            { label: 'माध्यम:', value: 'UPI / Cards / NetBanking' },
          ],
          yesLabel: 'Yes, Pay Now (हाँ, भुगतान करें)',
          editLabel: 'View Bill (बिल देखें)',
          cancelLabel: 'Pay Later / COD',
          payload: data,
        };

        return {
          replyText,
          cardComponent: card,
          suggestedChips: ['Yes, Confirm', 'View Bill', 'Pay Later'],
          actions: [
            { label: '💳 Yes, Pay Now', actionType: 'send_query', payload: 'confirm' },
            { label: '🧾 View Bill', actionType: 'send_query', payload: 'final bill dikhao' },
          ],
        };
      }

      // 6. SUBMIT REGISTRATION
      case 'submit_registration': {
        const role = data.targetRole || data.role || 'customer';
        const name = data.name || data.contactPerson || 'सदस्य';
        const mobile = data.mobile || data.phone || '6267546945';
        const roleName =
          role === 'service_man'
            ? 'Service Pro (कारीगर)'
            : role === 'business_partner'
            ? 'Business Partner (बिजनेस पार्टनर)'
            : role === 'franchise_admin'
            ? 'District Franchise'
            : 'Customer (ग्राहक)';

        const replyText =
          lang === 'hi'
            ? `Main aapka **${roleName}** registration submit karne wala hoon (${name}, +91 ${mobile}).\n\nKya aap confirm karte hain?`
            : `I am about to submit your **${roleName}** registration (${name}, +91 ${mobile}).\n\nDo you confirm?`;

        const card: ActionConfirmationCardComponent = {
          type: 'action_confirmation_card',
          actionType: 'submit_registration',
          title: '🤝 सदस्यता रजिस्ट्रेशन पुष्टि (Confirm Registration)',
          summary: `Main aapka **${roleName}** registration submit karne wala hoon.`,
          promptQuestion: 'Kya aap confirm karte hain?',
          highlightBadge: role === 'customer' ? '🎁 ₹200 वेलकम बोनस' : '⚡ 24-घंटे फास्ट अप्रूवल',
          details: [
            { label: 'रोल (Role):', value: roleName },
            { label: 'नाम (Name):', value: name },
            { label: 'मोबाइल:', value: `+91 ${mobile}` },
          ],
          yesLabel: 'Yes, Register Now (हाँ, रजिस्टर करें)',
          editLabel: 'Edit Details (विवरण बदलें)',
          cancelLabel: 'Cancel',
          payload: data,
        };

        return {
          replyText,
          cardComponent: card,
          suggestedChips: ['Yes, Confirm', 'Edit Details', 'Cancel'],
          actions: [
            { label: '✅ Yes, Confirm', actionType: 'send_query', payload: 'confirm' },
            { label: '✏️ Edit', actionType: 'send_query', payload: 'edit' },
            { label: '❌ Cancel', actionType: 'send_query', payload: 'cancel' },
          ],
        };
      }

      // 7. CREATE COMPLAINT
      case 'create_complaint': {
        const bookingId = data.bookingId || 'HDK-BOOKING';
        const issueLabel = data.issueLabel || data.issueType || 'कस्टमर सहायता';
        const description = data.description || 'सर्विस संबंधित समस्या';

        const replyText =
          lang === 'hi'
            ? `Main Booking **#${bookingId}** ke liye priority complaint ticket raise karne wala hoon.\n\nKya aap confirm karte hain?`
            : `I am about to raise a priority complaint ticket for Booking **#${bookingId}**.\n\nDo you confirm?`;

        const card: ActionConfirmationCardComponent = {
          type: 'action_confirmation_card',
          actionType: 'create_complaint',
          title: '🛡️ सहायता व शिकायत टिकट पुष्टि (Confirm Complaint)',
          summary: `Main Booking #${bookingId} ke liye complaint ticket raise karne wala hoon.`,
          promptQuestion: 'Kya aap confirm karte hain?',
          highlightBadge: '⚡ 1-घंटे में रेजोल्यूशन कॉल',
          details: [
            { label: 'बुकिंग आईडी:', value: `#${bookingId}` },
            { label: 'समस्या प्रकार:', value: issueLabel },
            { label: 'विवरण:', value: description },
          ],
          yesLabel: 'Yes, Submit Ticket (हाँ, टिकट दर्ज करें)',
          editLabel: 'Edit Description (विवरण बदलें)',
          cancelLabel: 'Cancel',
          payload: data,
        };

        return {
          replyText,
          cardComponent: card,
          suggestedChips: ['Yes, Confirm', 'Edit Description', 'Cancel'],
          actions: [
            { label: '🛡️ Yes, Submit Ticket', actionType: 'send_query', payload: 'confirm' },
            { label: '✏️ Edit Description', actionType: 'send_query', payload: 'edit' },
            { label: '❌ Cancel', actionType: 'send_query', payload: 'cancel' },
          ],
        };
      }

      // 8. UPDATE PROFILE
      default: {
        const replyText =
          lang === 'hi'
            ? `Main aapka profile aur contact information update karne wala hoon.\n\nKya aap confirm karte hain?`
            : `I am about to update your profile and contact information.\n\nDo you confirm?`;

        const card: ActionConfirmationCardComponent = {
          type: 'action_confirmation_card',
          actionType: 'update_profile',
          title: '👤 प्रोफाइल अपडेट पुष्टिकरण (Update Profile)',
          summary: 'Main aapka profile update karne wala hoon.',
          promptQuestion: 'Kya aap confirm karte hain?',
          details: [{ label: 'अपडेट्स:', value: JSON.stringify(data) }],
          yesLabel: 'Yes, Confirm',
          editLabel: 'Edit',
          cancelLabel: 'Cancel',
          payload: data,
        };

        return {
          replyText,
          cardComponent: card,
          suggestedChips: ['Yes, Confirm', 'Edit', 'Cancel'],
          actions: [
            { label: '✅ Yes, Confirm', actionType: 'send_query', payload: 'confirm' },
            { label: '❌ Cancel', actionType: 'send_query', payload: 'cancel' },
          ],
        };
      }
    }
  }

  /**
   * Generates ambiguous response clarification prompt
   */
  public generateAmbiguousResponsePrompt(
    pending: PendingConfirmationState,
    lang: AssistantLanguage = 'hi'
  ): { replyText: string; cardComponent: ActionConfirmationCardComponent; suggestedChips: string[] } {
    const cardData = this.generateConfirmationCard(pending.actionType, pending.payload, lang);

    const clarifyText =
      lang === 'hi'
        ? `⚠️ **स्पष्टीकरण आवश्यक है:** मुझे आपका पिछला उत्तर स्पष्ट नहीं मिला। सुरक्षा कारणों से बिना स्पष्ट पुष्टि के यह एक्शन निष्पादित नहीं किया गया है।\n\n👉 **${pending.summary}**\n\nकृपया नीचे दिए बटन दबाकर या सीधे "हाँ / Yes" अथवा "रद्द करें / Cancel" लिखकर बताएं:`
        : `⚠️ **Clarification Required:** I could not clearly understand your response. For security, this action has not been executed yet.\n\n👉 **${pending.summary}**\n\nPlease select an option below:`;

    return {
      replyText: clarifyText,
      cardComponent: cardData.cardComponent,
      suggestedChips: ['Yes, Confirm', 'Edit', 'Cancel'],
    };
  }
}

export const confirmationService = new ConfirmationService();
