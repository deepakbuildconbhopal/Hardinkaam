import { ChatMessage, ActionItem, QuickActionChip, AssistantLanguage, DynamicChatComponent } from './types';
import { Service, Category, ServiceMan, Booking } from '../../types';
import { StructuredBookingContext, RequiredBookingField, KaamDostSessionState } from './memoryTypes';
import { conversationMemory } from './conversationMemoryService';
import {
  conversationalRegistration,
  isRegistrationIntent,
  detectRegistrationRoleIntent,
} from './conversationalRegistrationService';
import { serviceDiscovery } from './serviceDiscoveryEngine';
import { serviceProfessionalDiscovery } from './serviceProfessionalDiscoveryService';
import { conversationalBookingManagement } from './conversationalBookingManagementService';
import { conversationalServiceWorkflow } from './conversationalServiceWorkflowService';
import { conversationalPayment } from './conversationalPaymentService';
import { conversationalSupport, SUPPORT_ISSUE_CATEGORIES } from './conversationalSupportService';
import { centralizedActionRouter, ACTION_DEFINITIONS, KaamDostActionType } from './actionRouter';
import { smartContextEngine } from './smartContextEngine';
import { knowledgeBaseService } from './knowledgeBaseService';
import { dynamicFormEngine } from './dynamicFormEngine';
import { calculateIndianGst } from '../../services/indianTaxEngineService';

export const QUICK_ACTION_CHIPS: Record<AssistantLanguage, QuickActionChip[]> = {
  hi: [
    { id: 'book_service', label: '🔧 सर्विस बुक करें', query: 'सर्विस बुक करनी है', icon: 'Wrench' },
    { id: 'my_bookings', label: '📋 मेरी बुकिंग', query: 'मेरी बुकिंग्स दिखाएं', icon: 'ClipboardList' },
    { id: 'registration', label: '👤 रजिस्ट्रेशन', query: 'रजिस्ट्रेशन कैसे करें', icon: 'UserPlus' },
    { id: 'billing', label: '💰 बिल / पेमेंट', query: 'बिल और पेमेंट की जानकारी', icon: 'CreditCard' },
    { id: 'help', label: '🆘 सहायता (Help)', query: 'मुझे सहायता चाहिए', icon: 'HelpCircle' },
    { id: 'contact', label: '📞 संपर्क करें', query: 'कस्टमर केयर नंबर दें', icon: 'Phone' },
  ],
  hinglish: [
    { id: 'book_service', label: '🔧 Service Book Karein', query: 'Service book karni hai', icon: 'Wrench' },
    { id: 'my_bookings', label: '📋 Meri Booking', query: 'Meri bookings dikhayein', icon: 'ClipboardList' },
    { id: 'registration', label: '👤 Registration', query: 'Registration kaise karein', icon: 'UserPlus' },
    { id: 'billing', label: '💰 Bill / Payment', query: 'Bill aur payment info', icon: 'CreditCard' },
    { id: 'help', label: '🆘 Help', query: 'Mujhe help chahiye', icon: 'HelpCircle' },
    { id: 'contact', label: '📞 Contact Support', query: 'Customer care number dein', icon: 'Phone' },
  ],
  en: [
    { id: 'book_service', label: '🔧 Book a Service', query: 'I want to book a service', icon: 'Wrench' },
    { id: 'my_bookings', label: '📋 My Bookings', query: 'Show my bookings', icon: 'ClipboardList' },
    { id: 'registration', label: '👤 Registration', query: 'How to register as service man or customer', icon: 'UserPlus' },
    { id: 'billing', label: '💰 Bill & Payment', query: 'Billing and payment information', icon: 'CreditCard' },
    { id: 'help', label: '🆘 Help & Support', query: 'I need help', icon: 'HelpCircle' },
    { id: 'contact', label: '📞 Contact Us', query: 'Provide customer support contact', icon: 'Phone' },
  ],
};

export const getInitialWelcomeMessage = (
  lang: AssistantLanguage,
  userName?: string,
  isLoggedIn?: boolean,
  bookings?: Booking[],
  userPhone?: string
): ChatMessage => {
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  let text = '';
  if (lang === 'hi') {
    text = `नमस्ते 👋
मैं KaamDost हूँ 🤝
HARDINKAAM पर आपका अपना डिजिटल दोस्त।

आप मुझसे नॉर्मल बात भी कर सकते हैं और जब कोई काम हो तो बस बता देना।
मैं आपकी बात समझकर स्टेप-बाय-स्टेप मदद करूँगा। 😊`;
  } else if (lang === 'en') {
    text = `Namaste 👋
I am KaamDost 🤝
Your digital friend on HARDINKAAM.

Feel free to chat casually with me, and whenever you need something done, just let me know.
I will understand what you need and help you step-by-step. 😊`;
  } else {
    // Hinglish (default)
    text = `Namaste 👋
Main KaamDost hoon 🤝
HARDINKAAM par aapka apna digital dost.

Aap mujhse normal baat bhi kar sakte hain aur jab koi kaam ho to bas bata dena.
Main aapki baat samajhkar step-by-step help karunga. 😊`;
  }

  return {
    id: 'welcome_msg',
    sender: 'assistant',
    text,
    timestamp: timeStr,
  };
};

export function handleCasualSmallTalk(
  q: string,
  lang: AssistantLanguage,
  userName?: string
): { text: string } | null {
  const lower = q.toLowerCase().trim();

  // Cancel / Reset / Stop / Baad mein
  if (
    lower === 'chhodo' ||
    lower === 'chhod do' ||
    lower === 'chodo' ||
    lower === 'cancel' ||
    lower === 'baad mein' ||
    lower === 'baad me' ||
    lower === 'main nahi karna chahta' ||
    lower === 'main nahi karna chahti' ||
    lower === 'reset' ||
    lower === 'reset karo' ||
    lower === 'rehne do' ||
    lower === 'stop' ||
    lower === 'rehne do dost' ||
    lower === 'chhod do dost'
  ) {
    return {
      text:
        lang === 'hi'
          ? 'बिल्कुल दोस्त 😊\nकोई बात नहीं। जब मन हो तब दोबारा शुरू कर लेंगे।'
          : 'Bilkul dost 😊\nKoi baat nahi. Jab mann ho tab dobara shuru kar lenge.',
    };
  }

  // Kaise ho? / How are you?
  if (
    lower.includes('kaise ho') ||
    lower.includes('kaise hain') ||
    lower.includes('kaise ho dost') ||
    lower.includes('how are you') ||
    lower.includes('kya chal raha hai') ||
    lower.includes('kya chal raha h')
  ) {
    return {
      text:
        lang === 'hi'
          ? 'मैं बिल्कुल बढ़िया हूँ दोस्त 😊\nआप बताओ, आज क्या चल रहा है?'
          : 'Main bilkul badhiya hoon dost 😊\nAap batao, aaj kya chal raha hai?',
    };
  }

  // Bas theek hoon / Fine / Good
  if (
    lower === 'bas theek hoon' ||
    lower === 'bas theek hu' ||
    lower === 'theek hoon' ||
    lower === 'theek hu' ||
    lower === 'badhiya' ||
    lower === 'badhiya hoon' ||
    lower === 'sab theek' ||
    lower === 'sab badhiya' ||
    lower === 'i am good' ||
    lower === 'i am fine' ||
    lower === 'fine' ||
    lower === 'good'
  ) {
    return {
      text:
        lang === 'hi'
          ? 'यह सुनकर अच्छा लगा 😄\nजब भी HARDINKAAM पर किसी काम में मदद चाहिए हो, मुझे बता देना।'
          : 'Ye sunkar achha laga 😄\nJab bhi HARDINKAAM par kisi kaam mein help chahiye ho, mujhe bata dena.',
    };
  }

  // Tum kya kya kar sakte ho?
  if (
    lower.includes('tum kya kya kar') ||
    lower.includes('kya kya kar sakte') ||
    lower.includes('tum kya karte ho') ||
    lower.includes('kya kar sakte ho') ||
    lower.includes('what can you do') ||
    lower.includes('aap kya kar sakte')
  ) {
    return {
      text:
        lang === 'hi'
          ? 'काफी कुछ दोस्त 😊\nआप सर्विस बुक करना चाहो, अपनी बुकिंग देखनी हो, किसी प्रॉब्लम की हेल्प चाहिए हो या HARDINKAAM पर कोई काम करवाना हो—बस नॉर्मल लैंग्वेज में बता देना। मैं समझने की कोशिश करूँगा।'
          : 'Kaafi kuch dost 😊\nAap service book karna chaho, apni booking dekhni ho, kisi problem ki help chahiye ho ya HARDINKAAM par koi kaam karwana ho—bas normal language mein bata dena. Main samajhne ki koshish karunga.',
    };
  }

  // Hello / Hi / Greetings
  if (
    lower === 'hello' ||
    lower === 'hi' ||
    lower === 'namaste' ||
    lower === 'hey' ||
    lower === 'good morning' ||
    lower === 'good evening' ||
    lower === 'good night' ||
    lower === 'hallo' ||
    lower === 'नमस्ते'
  ) {
    const nameStr = userName ? ` ${userName.trim().split(' ')[0]}` : '';
    return {
      text:
        lang === 'hi'
          ? `नमस्ते${nameStr} 👋😊\nकैसे हो?`
          : `Hello${nameStr} dost 👋😊\nKaise ho?`,
    };
  }

  // Tumhara naam kya hai? / Who are you?
  if (
    lower.includes('tumhara naam') ||
    lower.includes('tum kaun ho') ||
    lower.includes('aap kaun ho') ||
    lower.includes('who are you') ||
    lower.includes('what is your name') ||
    lower === 'naam' ||
    lower === 'naam kya hai'
  ) {
    return {
      text:
        lang === 'hi'
          ? 'मैं KaamDost हूँ 🤝\nHARDINKAAM पर आपका डिजिटल दोस्त।'
          : 'Main KaamDost hoon 🤝\nHARDINKAAM par aapka digital dost.',
    };
  }

  // Thanks / Thank you
  if (
    lower.includes('thanks') ||
    lower.includes('thank you') ||
    lower.includes('dhanyawad') ||
    lower.includes('shukriya') ||
    lower === 'thx'
  ) {
    return {
      text:
        lang === 'hi'
          ? 'कभी भी दोस्त 😊\nजब भी जरूरत हो, बुला लेना।'
          : 'Anytime dost 😊\nJab bhi zarurat ho, bula lena.',
    };
  }

  // Bye / Goodbye
  if (
    lower === 'bye' ||
    lower === 'goodbye' ||
    lower === 'phir milenge' ||
    lower === 'alvida'
  ) {
    return {
      text:
        lang === 'hi'
          ? 'बाय दोस्त! 👋 अपना ख्याल रखना। जब भी जरूरत हो, मैं यहीं हूँ।'
          : 'Bye dost! 👋 Apna khayal rakhna. Jab bhi zarurat ho, main yahin hoon.',
    };
  }

  return null;
}

export interface ResponseContext {
  services: Service[];
  categories: Category[];
  serviceMen?: ServiceMan[];
  bookings?: Booking[];
  isLoggedIn: boolean;
  userName?: string;
  userProfile?: any;
  lang: AssistantLanguage;
  sessionState?: KaamDostSessionState;
  payload?: any;
}

export interface AssistantReplyResult {
  text: string;
  actions?: ActionItem[];
  suggestedChips?: string[];
  dynamicComponent?: DynamicChatComponent;
  updatedContext: StructuredBookingContext;
  missingFields: RequiredBookingField[];
  isComplete: boolean;
}

export function generateAssistantReply(
  query: string,
  context: ResponseContext,
  payload?: any
): AssistantReplyResult {
  const q = query.toLowerCase().trim();
  const { lang, services, categories, serviceMen, bookings = [], isLoggedIn, userName, userProfile, sessionState } = context;

  // --- 0. CASUAL SMALL TALK & GREETINGS INTERCEPTOR ---
  const casualRes = handleCasualSmallTalk(query, lang, userName);
  if (casualRes) {
    let resCtx = conversationMemory.initContextFromProfile(userProfile);
    if (!q.includes('chhodo') && !q.includes('cancel') && !q.includes('reset') && !q.includes('stop') && !q.includes('rehne do')) {
      resCtx = sessionState?.context || resCtx;
    }
    return {
      text: casualRes.text,
      updatedContext: resCtx,
      missingFields: conversationMemory.detectMissingFields(resCtx, userProfile),
      isComplete: false,
    };
  }

  // 1. Initialize baseline context from previous session or user profile
  const baseContext =
    sessionState?.context ||
    conversationMemory.initContextFromProfile(userProfile);

  // 2. Extract structured entities from this utterance and dynamic payload
  const updatedContext = conversationMemory.extractEntities(
    query,
    baseContext,
    payload || context.payload,
    userProfile
  );

  // 3. Detect missing fields required for service booking
  let resolvedContext = updatedContext;
  const smartRes = smartContextEngine.resolveSmartContext({
    query,
    currentContext: updatedContext,
    sessionState,
    userProfile,
    bookings,
    services,
    categories,
    serviceMen,
    lang,
  });

  if (smartRes.handled) {
    if (smartRes.updatedContext) {
      resolvedContext = smartRes.updatedContext;
    }
    const resolvedMissing = conversationMemory.detectMissingFields(resolvedContext, userProfile);
    return {
      text: smartRes.replyText || 'जी, आपके अनुरोध को समझ लिया गया है।',
      dynamicComponent: smartRes.dynamicComponent,
      actions: smartRes.actions,
      suggestedChips: smartRes.suggestedChips || ['⚡ नई सर्विस', '📋 मेरी बुकिंग्स'],
      updatedContext: resolvedContext,
      missingFields: resolvedMissing,
      isComplete: resolvedMissing.length === 0,
    };
  }

  const missingFields = conversationMemory.detectMissingFields(resolvedContext, userProfile);
  const isComplete = missingFields.length === 0;

  // --- SPECIAL FLOW 1: Reset / Clear Session ---
  if (q.includes('नया काम') || q.includes('reset session') || q.includes('restart') || q.includes('शुरू से')) {
    const freshContext = conversationMemory.initContextFromProfile(userProfile);
    return {
      text:
        lang === 'hi'
          ? '🔄 पिछला सत्र रीसेट कर दिया गया है। आप किस नई सेवा के लिए मदद चाहते हैं?'
          : '🔄 Session reset. Which new service would you like help with?',
      suggestedChips: ['⚡ Electrician', '🔧 Plumber', '❄️ AC Repair', '🧹 Deep Cleaning'],
      updatedContext: freshContext,
      missingFields: conversationMemory.detectMissingFields(freshContext, userProfile),
      isComplete: false,
    };
  }

  // --- SPECIAL FLOW: DYNAMIC FORM SUBMITTED (PHASE 21) ---
  if (q.includes('dynamic_form_submitted') || q.includes('विवरण सुरक्षित') || q.includes('फॉर्म सबमिट')) {
    const nextMissing = conversationMemory.detectMissingFields(updatedContext, userProfile);
    return {
      text:
        lang === 'hi'
          ? '✅ **विवरण सुरक्षित हो गया है!**\n\nसटीक जानकारी प्राप्त हो गई है। कृपया आगे बढ़ने के लिए अपना पता व समय चुनें:'
          : '✅ **Details Saved!**\n\nPlease select your address and slot to complete your booking:',
      suggestedChips: ['📍 घर का पता', '📅 आज का समय', '⚡ अगले 60 मिनट में'],
      updatedContext,
      missingFields: nextMissing,
      isComplete: nextMissing.length === 0,
    };
  }

  // --- SPECIAL FLOW: DYNAMIC QUESTION FORM TRIGGER FOR SERVICES ---
  if (
    q.includes('ac service') ||
    q.includes('ac repair') ||
    q.includes('electrician') ||
    q.includes('plumber') ||
    q.includes('cleaning') ||
    q.includes('एसी सर्विस') ||
    q.includes('इलेक्ट्रीशियन') ||
    q.includes('प्लंबर') ||
    q.includes('सफाई')
  ) {
    const categoryName =
      updatedContext.serviceCategory ||
      (q.includes('ac')
        ? 'AC Service & Repair'
        : q.includes('electric') || q.includes('इलेक्ट्रीशियन')
        ? 'Electrician'
        : q.includes('plumb') || q.includes('प्लंबर')
        ? 'Plumber'
        : 'Deep Cleaning');
    const formSchema = dynamicFormEngine.getQuestionsForService(categoryName, updatedContext.serviceType);

    return {
      text:
        lang === 'hi'
          ? `📋 **${categoryName} की आवश्यकता नोट कर ली गई है!**\n\nसही कारीगर, टूल्स व रेट एस्टिमेट के लिए कृपया नीचे दिए गए डायनेमिक प्रश्नों का उत्तर दें:`
          : `📋 **Requirements noted for ${categoryName}!**\n\nPlease answer the dynamic questions below:`,
      dynamicComponent: {
        type: 'dynamic_form',
        schema: formSchema,
      },
      suggestedChips: ['📍 घर का पता', '📅 आज का समय', '⚡ तुरंत बुक करें'],
      updatedContext,
      missingFields,
      isComplete: false,
    };
  }

  // --- SPECIAL FLOW 2: Problem Diagnosis Multimedia Flow ---
  if (
    q.includes('problem') ||
    q.includes('kharab') ||
    q.includes('दिक्कत') ||
    q.includes('समस्या') ||
    q.includes('damage') ||
    q.includes('toota') ||
    q.includes('आवाज') ||
    q.includes('leak') ||
    q.includes('fault') ||
    q.includes('short circuit')
  ) {
    const isAc = q.includes('ac') || q.includes('ऐसी') || updatedContext.serviceCategory?.includes('AC');
    const deviceName = isAc
      ? 'AC'
      : q.includes('fan') || q.includes('पंखा') || updatedContext.serviceType?.includes('Fan')
      ? 'पंखे'
      : 'उपकरण / समस्या';

    return {
      text:
        lang === 'hi'
          ? `Problem समझने के लिए चाहें तो ${deviceName} की photo/video भेज दें। इससे हमारे कारीगर को सही टूल्स व स्पेयर पार्ट्स लाने में आसानी होगी:`
          : lang === 'hinglish'
          ? `Problem samajhne ke liye chahein toh ${deviceName} ki photo/video bhej dein:`
          : `To help diagnose the problem accurately, please share a quick photo or video of the ${deviceName}:`,
      actions: [
        { label: '📷 Camera', actionType: 'trigger_camera' },
        { label: '🖼️ Gallery', actionType: 'trigger_gallery' },
        { label: '🎥 Video', actionType: 'trigger_video' },
      ],
      suggestedChips: ['📷 Camera से फोटो लें', 'बिना फोटो के आगे बढ़ें', 'दर कार्ड दिखाएं'],
      updatedContext,
      missingFields,
      isComplete,
    };
  }

  // --- SPECIAL FLOW 3: Media Uploaded Response -> Continues to Next Missing Field ---
  if (
    q.includes('photo_uploaded') ||
    q.includes('video_uploaded') ||
    q.includes('attachment') ||
    q.includes('फोटो अपलोड') ||
    q.includes('वीडियो संलग्न')
  ) {
    // Check what is missing next
    if (missingFields.includes('location')) {
      const addressComp: DynamicChatComponent = {
        type: 'address_form',
        title: '📍 सेवा का पता दर्ज करें (Enter Doorstep Address)',
        defaultLocality: 'MP Nagar',
        localities: ['MP Nagar', 'Arera Colony', 'Kolar Road', 'Indrapuri / BHEL', 'Hoshangabad Road', 'Ayodhya Bypass', 'New Market'],
        submitLabel: 'यह पता कन्फर्म करें',
      };
      return {
        text:
          lang === 'hi'
            ? '📸 फोटो/वीडियो प्राप्त हो गई है! हमारे कारीगर को आपके स्थान पर भेजने के लिए कृपया अपना पता बताएं:'
            : '📸 Photo/video received! Please provide your address to dispatch our technician:',
        dynamicComponent: addressComp,
        suggestedChips: ['MP Nagar Zone 1', 'Arera Colony E-Sector', 'Kolar Road'],
        updatedContext,
        missingFields,
        isComplete,
      };
    }

    if (missingFields.includes('preferredDate')) {
      const dateComp: DynamicChatComponent = {
        type: 'date_picker',
        title: '📅 सेवा के लिए तारीख चुनें (Select Service Date)',
        quickDates: [
          { id: 'today', label: 'आज (Today)', date: new Date().toISOString().split('T')[0] },
          { id: 'tomorrow', label: 'कल (Tomorrow)', date: new Date(Date.now() + 86400000).toISOString().split('T')[0] },
          { id: 'day_after', label: 'परसों', date: new Date(Date.now() + 172800000).toISOString().split('T')[0] },
        ],
      };
      return {
        text:
          lang === 'hi'
            ? '📸 फोटो/वीडियो प्राप्त हो गई है! सुपरवाइजर ने इसका निरीक्षण कर लिया है। कृपया अपनी पसंदीदा तारीख चुनें:'
            : '📸 Photo/video received! Please choose your preferred service date to proceed:',
        dynamicComponent: dateComp,
        suggestedChips: ['आज ही आएं (Today)', 'कल सुबह (Tomorrow)', 'कस्टमर केयर'],
        updatedContext,
        missingFields,
        isComplete,
      };
    }
  }

  // --- SPECIAL FLOW 4: Rating submission flow ---
  if (q.includes('rating_submitted') || q.includes('स्टार रेटिंग') || q.includes('star rating')) {
    return {
      text:
        lang === 'hi'
          ? '🌟 आपका बहुत-बहुत धन्यवाद! आपकी बहुमूल्य रेटिंग और समीक्षा हमारे कारीगरों को बेहतर सेवा देने के लिए प्रेरित करती है। क्या मैं आपकी किसी अन्य काम में मदद कर सकता हूँ?'
          : '🌟 Thank you so much! Your review and feedback help us maintain our top quality service. Can I help you with anything else today?',
      actions: [
        { label: '🏠 मुख्य मेन्यू', actionType: 'navigate_tab', payload: 'home' },
        { label: '📋 मेरी बुकिंग्स देखें', actionType: 'navigate_tab', payload: 'bookings' },
      ],
      suggestedChips: ['नई सर्विस बुक करें', 'मेरी बुकिंग', 'हेल्प डेस्क'],
      updatedContext,
      missingFields,
      isComplete,
    };
  }

  // --- SPECIAL FLOW 5: Booking Confirmed Final Step ---
  if (
    q.includes('yes_no_confirmed') ||
    q.includes('हाँ, बुकिंग कन्फर्म करें') ||
    q.includes('हाँ, सहमत हूँ') ||
    q.includes('booking_confirmed') ||
    q.includes('confirm')
  ) {
    const bookingId = 'HDK-' + Math.floor(100000 + Math.random() * 900000);
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    const summaryCard: DynamicChatComponent = {
      type: 'booking_summary_card',
      bookingId,
      serviceName:
        updatedContext.serviceType ||
        updatedContext.serviceCategory ||
        '⚡ होम सर्विस इंस्पेक्शन व रिपेयर',
      scheduledDateTime: `${updatedContext.preferredDate || 'आज'}, ${
        updatedContext.preferredTime || 'अगले 60 मिनट में (Express)'
      }`,
      address:
        updatedContext.address ||
        updatedContext.location ||
        userProfile?.address ||
        'MP Nagar Zone 1, Bhopal',
      totalAmount: updatedContext.estimatedPrice || 319,
      status: 'कन्फर्म (ASSIGNED)',
      otp,
      proName: 'रमेश शर्मा (सत्यापित सीनियर टेक्नीशियन)',
      proPhone: '+91 62675 46945',
    };

    return {
      text:
        lang === 'hi'
          ? `🎉 बधाई! आपकी बुकिंग सफलतापूर्वक कन्फर्म हो गई है (ID: ${bookingId})।\n\nहमारे सीनियर टेक्नीशियन आपके पते के लिए रवाना हो रहे हैं। काम शुरू होने पर उन्हें नीचे दिया गया स्टार्ट OTP बताएं:`
          : `🎉 Congratulations! Your booking has been confirmed successfully (ID: ${bookingId}).\n\nOur verified technician is on their way. Please share the start OTP upon arrival:`,
      actions: [
        { label: '📋 मेरी बुकिंग्स में लाइव ट्रैक करें', actionType: 'navigate_tab', payload: 'bookings' },
        { label: '📞 टेक्नीशियन को कॉल करें', actionType: 'open_call', payload: 'tel:+916267546945' },
      ],
      dynamicComponent: summaryCard,
      suggestedChips: ['रेटिंग देना चाहते हैं', 'कस्टमर सपोर्ट', 'रसीद डाउनलोड'],
      updatedContext,
      missingFields: [],
      isComplete: true,
    };
  }

  // --- SPECIAL FLOW 6: Bill / Estimate / Pricing Intent ---
  if (
    q.includes('bill') ||
    q.includes('pay') ||
    q.includes('बिल') ||
    q.includes('पैसा') ||
    q.includes('payment') ||
    q.includes('rate') ||
    q.includes('रेट') ||
    q.includes('कीमत')
  ) {
    const estCard: DynamicChatComponent = {
      type: 'price_estimate_card',
      title: '🧾 मानक रेट कार्ड व बिलिंग एस्टिमेट',
      serviceName:
        updatedContext.serviceType ||
        updatedContext.serviceCategory ||
        'मानक होम सर्विस विजिट व डायग्नोस्टिक',
      items: [
        { label: 'विजिट व डायग्नोस्टिक शुल्क', amount: 199 },
        { label: 'कुशल कारीगर लेबर चार्ज', amount: 120 },
        { label: 'प्लेटफॉर्म व सुरक्षा गारंटी शुल्क', amount: 20 },
        { label: 'फर्स्ट-टाइम यूजर छूट', amount: 20, isDeduction: true },
      ],
      totalAmount: updatedContext.estimatedPrice || 319,
      savings: 50,
      guaranteeNotice: 'कोई छुपा शुल्क नहीं। 100% संतोषजनक काम के बाद ही कैश या UPI से भुगतान करें।',
    };

    return {
      text:
        lang === 'hi'
          ? '💰 HARDINKAAM की दरें 100% पारदर्शी और फिक्स्ड हैं। यहाँ आपका बिल एस्टिमेट दिया गया है:'
          : '💰 Transparent and upfront pricing on HARDINKAAM. Here is your estimate breakdown:',
      dynamicComponent: estCard,
      actions: [
        { label: '👛 मेरा वॉलेट और लेनदेन', actionType: 'navigate_tab', payload: 'wallet' },
        { label: '📋 मेरी बुकिंग्स', actionType: 'navigate_tab', payload: 'bookings' },
      ],
      suggestedChips: ['कैश दे सकते हैं?', 'UPI पेमेंट विकल्प', 'वारंटी पॉलिसी'],
      updatedContext,
      missingFields,
      isComplete,
    };
  }

  // --- SPECIAL FLOW 7: MULTI-ROLE REGISTRATION ROUTER (PHASE 15) ---
  const detectedRole = detectRegistrationRoleIntent(query);

  if (detectedRole !== null) {
    const roleTarget = detectedRole === 'generic' ? undefined : detectedRole;

    if (isLoggedIn && roleTarget && userProfile?.role === roleTarget) {
      return {
        text:
          lang === 'hi'
            ? `नमस्ते ${userName || ''} जी! 😊 आप पहले से ही HARDINKAAM पर **${roleTarget.toUpperCase()}** के रूप में रजिस्टर्ड व लॉगिन हैं। आप सीधे अपना डैशबोर्ड या सेवाएं उपयोग कर सकते हैं:`
            : `Hello ${userName || ''}! 😊 You are already registered and logged in as **${roleTarget.toUpperCase()}** on HARDINKAAM:`,
        actions: [
          {
            label: roleTarget === 'customer' ? '🔧 नई सर्विस बुक करें' : '📊 मेरा डैशबोर्ड',
            actionType: 'navigate_tab',
            payload:
              roleTarget === 'customer'
                ? 'services'
                : roleTarget === 'service_man'
                ? 'pro_dashboard'
                : roleTarget === 'business_partner'
                ? 'partner_dashboard'
                : 'franchise',
          },
          { label: '👛 मेरा वॉलेट देखें', actionType: 'navigate_tab', payload: roleTarget === 'service_man' ? 'pro_wallet' : 'wallet' },
        ],
        suggestedChips: [
          roleTarget === 'customer' ? '⚡ इलेक्ट्रीशियन चाहिए' : '📊 डैशबोर्ड',
          '👛 वॉलेट बैलेंस',
          '📋 मेरी बुकिंग्स',
        ],
        updatedContext,
        missingFields,
        isComplete,
      };
    }

    const regFlow = conversationalRegistration.startFlow(roleTarget, lang);
    return {
      text: regFlow.text,
      dynamicComponent: regFlow.dynamicComponent,
      suggestedChips: regFlow.suggestedChips,
      actions: regFlow.actions,
      updatedContext,
      missingFields: ['customerName', 'mobile'],
      isComplete: false,
    };
  }

  // --- SPECIAL FLOW 6B: SUPPORT & COMPLAINT AGENT (PHASE 14) ---
  if (conversationalSupport.isSupportIntent(query)) {
    const targetBooking = conversationalSupport.identifyTargetBooking(bookings, query);
    const issueCategory = conversationalSupport.detectIssueType(query);

    const availableBookingsList = (bookings || []).map((b) => ({
      id: b.id,
      serviceName: b.serviceName || 'होम सर्विस',
      date: b.scheduledDate || (b as any).date || 'हालिया बुकिंग',
    }));

    const complaintComp: DynamicChatComponent = {
      type: 'complaint_form',
      bookingId: targetBooking?.id,
      serviceName: targetBooking?.serviceName,
      availableBookings: availableBookingsList,
      issueType: issueCategory.id,
      availableIssueTypes: SUPPORT_ISSUE_CATEGORIES,
      priority: issueCategory.defaultPriority,
      description: query,
    };

    const replyText =
      lang === 'hi'
        ? `🛡️ **HARDINKAAM कस्टमर सपोर्ट व शिकायत निवारण**\n\n${
            targetBooking
              ? `आपकी बुकिंग **#${targetBooking.id}** (${targetBooking.serviceName}) के लिए सहायता अनुरोध खोला गया है।`
              : 'हम आपकी सहायता के लिए 24x7 उपलब्ध हैं।'
          }\n\nकृपया नीचे दिए गए फॉर्म में समस्या का प्रकार, विवरण व प्राथमिकता जांचें और **Review & Confirm** पर क्लिक करें:`
        : `🛡️ **HARDINKAAM Customer Support & Resolution**\n\n${
            targetBooking
              ? `Support opened for booking **#${targetBooking.id}** (${targetBooking.serviceName}).`
              : 'Our 24x7 support team is here to assist you.'
          }\n\nPlease review the details below and tap **Review & Confirm**:`;

    return {
      text: replyText,
      dynamicComponent: complaintComp,
      actions: [
        { label: '📞 24x7 हेल्पलाइन कॉल करें', actionType: 'open_call', payload: 'tel:+916267546945' },
      ],
      suggestedChips: [
        '🛵 सर्विसमैन लेट है',
        '💳 पेमेंट समस्या',
        '💰 रिफंड सहायता',
        '📞 कस्टमर केयर',
      ],
      updatedContext,
      missingFields,
      isComplete,
    };
  }

  // --- SPECIAL FLOW 7A: PAYMENT CONVERSATION ENGINE (PHASE 13) ---
  if (conversationalPayment.isPaymentIntent(query)) {
    if (!isLoggedIn) {
      return {
        text:
          lang === 'hi'
            ? '🔐 बिल का भुगतान करने के लिए कृपया पहले ग्राहक लॉगिन करें:'
            : '🔐 Please log in to complete your bill payment:',
        actions: [
          { label: '🔐 ग्राहक लॉगिन करें', actionType: 'open_auth', payload: 'customer' },
          { label: '📞 हेल्पलाइन पर पूछें', actionType: 'open_call', payload: 'tel:+916267546945' },
        ],
        suggestedChips: ['लॉगिन कैसे करें?', 'मेरी बुकिंग्स', 'कस्टमर केयर'],
        updatedContext,
        missingFields,
        isComplete,
      };
    }

    const activeBooking = bookings.find((b) => b.status !== 'cancelled') || bookings[0];

    if (!activeBooking) {
      return {
        text:
          lang === 'hi'
            ? 'ℹ️ आपके खाते में फिलहाल कोई भुगतान हेतु देय (Pending) बिल नहीं है।'
            : 'ℹ️ No pending bill found in your account to pay.',
        suggestedChips: ['🔧 नई सर्विस बुक करें', '📋 मेरी पुरानी बुकिंग्स'],
        updatedContext,
        missingFields,
        isComplete,
      };
    }

    const breakdown = conversationalPayment.getPaymentBreakdown(activeBooking, userProfile);

    const replyText =
      lang === 'hi'
        ? `बिल्कुल। आपका फाइनल बिल **₹${breakdown.finalAmount}** है।\n\nनीचे बिल विवरण देखकर **Pay Now** पर क्लिक करके सुरक्षित ऑनलाइन भुगतान करें:`
        : `Bilkul. Aapka final bill ₹${breakdown.finalAmount} hai.\n\nPlease review the itemized breakdown below and tap **Pay Now** to proceed securely:`;

    return {
      text: replyText,
      dynamicComponent: breakdown,
      suggestedChips: [
        '💳 Pay Now',
        '💵 नकद भुगतान (Cash)',
        '🧾 इनवॉइस देखें',
        '📞 सहायता हेल्पलाइन',
      ],
      updatedContext,
      missingFields,
      isComplete,
    };
  }

  // --- SPECIAL FLOW 7B: SERVICE WORKFLOW ENGINE (PHASE 12) ---
  const workflowIntent = conversationalServiceWorkflow.detectWorkflowIntent(query);

  if (workflowIntent) {
    if (!isLoggedIn) {
      return {
        text:
          lang === 'hi'
            ? '🔐 अपनी सर्विस स्थिति, OTP, वर्क टाइमर या फाइनल बिल देखने के लिए कृपया लॉगिन करें:'
            : '🔐 Please log in to check your service status, OTP, work timer, or final bill:',
        actions: [
          { label: '🔐 ग्राहक लॉगिन करें', actionType: 'open_auth', payload: 'customer' },
          { label: '📞 हेल्पलाइन पर पूछें', actionType: 'open_call', payload: 'tel:+916267546945' },
        ],
        suggestedChips: ['लॉगिन कैसे करें?', 'नई सर्विस बुक करें', 'कस्टमर केयर'],
        updatedContext,
        missingFields,
        isComplete,
      };
    }

    const activeBooking = bookings.find((b) => b.status !== 'cancelled') || bookings[0];

    if (!activeBooking) {
      return {
        text:
          lang === 'hi'
            ? 'ℹ️ आपके खाते में फिलहाल कोई सक्रिय (Active) बुकिंग नहीं है। नई होम सर्विस बुक करने के लिए नीचे क्लिक करें:'
            : 'ℹ️ No active booking found in your account. You can book a service below:',
        suggestedChips: ['⚡ Electrician बुक करें', '🔧 Plumber बुक करें', '❄️ AC Repair'],
        updatedContext,
        missingFields,
        isComplete,
      };
    }

    // 1. Arrival OTP Inquiry
    if (workflowIntent === 'otp_inquiry') {
      const otpCode = activeBooking.otp || (activeBooking as any).arrivalOtp || '5482';
      return {
        text:
          lang === 'hi'
            ? `🔒 आपकी सर्विस का स्टार्ट OTP **${otpCode}** है।\n\nजब कारीगर (**${activeBooking.serviceManName || 'तकनीशियन'}**) आपके घर पहुँचें, तो काम शुरू कराने के लिए उन्हें यह 4-अंकों का कोड बताएं।`
            : `🔒 Your service start OTP is **${otpCode}**.\n\nPlease share this 4-digit code with technician **${activeBooking.serviceManName || 'Professional'}** upon arrival to begin work.`,
        suggestedChips: [
          '🛵 सर्विसमैन कब आ रहा है?',
          '⏱️ काम शुरू हुआ क्या?',
          '⚙️ एक्स्ट्रा चार्ज क्या है?',
        ],
        updatedContext,
        missingFields,
        isComplete,
      };
    }

    // 2. Service Man Arrival Check
    if (workflowIntent === 'arrival_check') {
      const status = (activeBooking.status || '').toLowerCase();
      const isArrived = status === 'arrived' || status === 'otp_pending';
      const isEnRoute = status === 'on_the_way' || status === 'arriving';
      const isWorkStarted = status === 'in_progress' || status === 'work_started' || Boolean(activeBooking.workStartedAt);
      const isDone = status === 'completed' || status === 'work_completed';

      let replyText = '';
      if (isArrived) {
        replyText =
          lang === 'hi'
            ? `📍 **हाँ! आपके कारीगर ${activeBooking.serviceManName || 'तकनीशियन'} आपकी लोकेशन पर पहुँच चुके हैं।**\n\nकृपया उन्हें अपना **स्टार्ट OTP: ${activeBooking.otp || '5482'}** बताकर काम शुरू करवाएं।`
            : `📍 **Yes! Technician ${activeBooking.serviceManName || 'Professional'} has arrived at your location.**\n\nPlease share OTP **${activeBooking.otp || '5482'}** to start the service.`;
      } else if (isWorkStarted) {
        replyText =
          lang === 'hi'
            ? `⚡ कारीगर पहुँच चुके हैं और काम शुरू हो चुका है (प्रगति पर है)।`
            : `⚡ Technician is on-site and work is currently in progress.`;
      } else if (isEnRoute) {
        replyText =
          lang === 'hi'
            ? `🛵 आपके कारीगर **${activeBooking.serviceManName || 'तकनीशियन'}** रास्ते में हैं और अगले **${(activeBooking as any).etaMinutes || 20} मिनट** में आपकी लोकेशन पर पहुँच रहे हैं (${(activeBooking as any).approxDistanceText || '2.2 किमी दूर'})।`
            : `🛵 Technician **${activeBooking.serviceManName || 'Professional'}** is on the way, arriving in **${(activeBooking as any).etaMinutes || 20} minutes** (${(activeBooking as any).approxDistanceText || '2.2 km away'}).`;
      } else if (isDone) {
        replyText =
          lang === 'hi'
            ? `✅ कारीगर का काम पूरा हो चुका है। आप नीचे फाइनल बिल देख सकते हैं:`
            : `✅ Service work has been completed. You can view the final bill below:`;
      } else {
        replyText =
          lang === 'hi'
            ? `📋 आपकी बुकिंग **#${activeBooking.id}** स्वीकृत है। कारीगर निर्धारित समय पर पहुँचेंगे।`
            : `📋 Booking **#${activeBooking.id}** is confirmed. The technician will arrive as scheduled.`;
      }

      return {
        text: replyText,
        suggestedChips: [
          '🔒 OTP कहाँ है?',
          '⏱️ टाइमर स्टेटस दिखाओ',
          '📞 कारीगर को कॉल करें',
        ],
        updatedContext,
        missingFields,
        isComplete,
      };
    }

    // 3. Work Started & Live Work Timer
    if (workflowIntent === 'work_status_timer') {
      const isStarted =
        Boolean(activeBooking.workStartedAt) ||
        activeBooking.status === 'in_progress' ||
        activeBooking.status === 'work_started' ||
        activeBooking.status === 'completed';

      if (isStarted) {
        const timerComp: DynamicChatComponent = {
          type: 'work_service_timer_card',
          bookingId: activeBooking.id,
          serviceName: activeBooking.serviceName || 'होम सर्विस',
          serviceManName: activeBooking.serviceManName || 'राजेश शर्मा',
          workStartedAt: activeBooking.workStartedAt || new Date().toISOString(),
          workCompletedAt: activeBooking.workCompletedAt,
          status: activeBooking.status || 'in_progress',
          workDurationFormatted: activeBooking.workDurationFormatted,
        };

        const startTimeFormatted = activeBooking.workStartedAt
          ? new Date(activeBooking.workStartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : 'अभी';

        return {
          text:
            lang === 'hi'
              ? `⚡ **हाँ, काम शुरू हो चुका है!**\n\n• कारीगर: **${activeBooking.serviceManName || 'राजेश शर्मा'}**\n• कार्य प्रारंभ समय: **${startTimeFormatted}**\n• लाइव टाइमर और कार्य प्रगति नीचे दिखाई गई है:`
              : `⚡ **Yes, service work is in progress!**\n\n• Technician: **${activeBooking.serviceManName || 'Professional'}**\n• Started at: **${startTimeFormatted}**\n• Live timer is ticking below:`,
          dynamicComponent: timerComp,
          suggestedChips: [
            '⚙️ एक्स्ट्रा चार्ज क्या है?',
            '🧾 फाइनल बिल दिखाओ',
            '📞 कारीगर को कॉल करें',
          ],
          updatedContext,
          missingFields,
          isComplete,
        };
      } else {
        return {
          text:
            lang === 'hi'
              ? `⏳ **अभी काम शुरू नहीं हुआ है।**\n\nजैसे ही कारीगर लोकेशन पर पहुँचेंगे और आप उन्हें **स्टार्ट OTP: ${activeBooking.otp || '5482'}** देंगे, वर्क टाइमर अपने-आप प्रारंभ हो जाएगा।`
              : `⏳ **Work has not started yet.**\n\nOnce technician arrives and verifies your **OTP: ${activeBooking.otp || '5482'}**, the service timer will start automatically.`,
          suggestedChips: ['🔒 OTP क्या है?', '🛵 सर्विसमैन कब आ रहा है?', '📋 मेरी बुकिंग्स'],
          updatedContext,
          missingFields,
          isComplete,
        };
      }
    }

    // 4. Extra Charges & Customer Approval
    if (workflowIntent === 'extra_charge_inquiry') {
      const breakdown = conversationalServiceWorkflow.getExtraChargesBreakdown(activeBooking);

      const extraChargesComp: DynamicChatComponent = {
        type: 'extra_charges_card',
        bookingId: activeBooking.id,
        customerId: userProfile?.id || userProfile?.uid,
        serviceName: activeBooking.serviceName || 'होम सर्विस',
        serviceManName: activeBooking.serviceManName,
        charges: breakdown.allCharges,
        totalApprovedAmount: breakdown.totalApprovedAmount,
        totalPendingAmount: breakdown.totalPendingAmount,
        allowApprovalAction: true,
      };

      let replyText = '';
      if (breakdown.hasPendingApproval) {
        replyText =
          lang === 'hi'
            ? `⚙️ **कारीगर द्वारा ₹${breakdown.totalPendingAmount} के अतिरिक्त पार्ट्स / काम प्रस्तावित किए गए हैं।**\n\nकृपया नीचे दिए गए कार्ड में **Description, Qty, Unit Price, Total** देखें और अपनी सहमति (**Approve / Reject**) दें:`
            : `⚙️ **Technician proposed ₹${breakdown.totalPendingAmount} in extra materials / services.**\n\nPlease review description, unit price & totals below to **Approve or Reject**:`;
      } else if (breakdown.allCharges.length > 0) {
        replyText =
          lang === 'hi'
            ? `⚙️ आपकी बुकिंग में अतिरिक्त चार्ज का विवरण नीचे दिया गया है (स्वीकृत राशि: **₹${breakdown.totalApprovedAmount}**)।\n\n🔒 **पारदर्शिता गारंटी:** अस्वीकृत अथवा लंबित चार्ज फाइनल बिल में नहीं जोड़े जाएंगे।`
            : `⚙️ Extra charges breakdown is shown below (Approved: **₹${breakdown.totalApprovedAmount}**).\n\n🔒 **Transparency Guarantee:** Unapproved or rejected charges are excluded from the final bill.`;
      } else {
        replyText =
          lang === 'hi'
            ? `🛡️ **आपकी बुकिंग में कोई अतिरिक्त चार्ज (Extra Charges) प्रस्तावित नहीं है।**\n\nकेवल बेस सर्विस चार्ज ही लागू रहेगा।`
            : `🛡️ **No extra charges proposed for your booking.**\n\nOnly the standard base rate applies.`;
      }

      return {
        text: replyText,
        dynamicComponent: extraChargesComp,
        suggestedChips: ['🧾 फाइनल बिल दिखाओ', '⏱️ वर्क टाइमर दिखाओ', '📞 कारीगर को कॉल करें'],
        updatedContext,
        missingFields,
        isComplete,
      };
    }

    // 5. Final Bill & Invoice Summary
    if (workflowIntent === 'final_bill_inquiry') {
      const billData = conversationalServiceWorkflow.calculateFinalBill(activeBooking);

      const billComp: DynamicChatComponent = {
        type: 'service_final_bill_card',
        ...billData,
      };

      return {
        text:
          lang === 'hi'
            ? `🧾 आपकी बुकिंग **#${billData.bookingId}** का फाइनल बिल सारांश नीचे दिया गया है (कुल देय: **₹${billData.finalAmount}**):\n\n• बेस सर्विस चार्ज: ₹${billData.baseAmount}\n• स्वीकृत एक्स्ट्रा चार्ज: ₹${billData.approvedExtraChargesAmount}\n• सुविधा शुल्क: ₹${billData.applicableCharges}`
            : `🧾 Final service bill for booking **#${billData.bookingId}** is ready (Total: **₹${billData.finalAmount}**):`,
        dynamicComponent: billComp,
        suggestedChips: ['💳 ऑनलाइन भुगतान करें', '💵 नकद भुगतान', '⭐ रेटिंग दें'],
        updatedContext,
        missingFields,
        isComplete,
      };
    }
  }

  // --- SPECIAL FLOW 8: BOOKING MANAGEMENT ENGINE (PHASE 11) ---
  const bookingIntent = conversationalBookingManagement.detectBookingIntent(query);

  if (bookingIntent) {
    if (!isLoggedIn) {
      return {
        text:
          lang === 'hi'
            ? '🔐 अपनी बुकिंग्स देखने, कैंसल या रीशेड्यूल करने के लिए कृपया ग्राहक लॉगिन करें:'
            : '🔐 Please log in to view, reschedule, or manage your bookings:',
        actions: [
          { label: '🔐 ग्राहक लॉगिन करें', actionType: 'open_auth', payload: 'customer' },
          { label: '📞 हेल्पलाइन पर पूछें', actionType: 'open_call', payload: 'tel:+916267546945' },
        ],
        suggestedChips: ['लॉगिन कैसे करें?', 'नई बुकिंग करें', 'कस्टमर केयर'],
        updatedContext,
        missingFields,
        isComplete,
      };
    }

    const formattedBookings = bookings.map((b) =>
      conversationalBookingManagement.formatBookingItem(b)
    );

    // Intent 1: "aaj wali booking kya hai" / Today's Bookings
    if (bookingIntent === 'show_today') {
      const todayList = conversationalBookingManagement
        .getTodayBookings(bookings)
        .map((b) => conversationalBookingManagement.formatBookingItem(b));

      if (todayList.length > 0) {
        const mgmtComp: DynamicChatComponent = {
          type: 'booking_management_card',
          title: lang === 'hi' ? '📅 आज की बुकिंग्स (Today\'s Bookings)' : 'Today\'s Bookings',
          subtitle: 'लाइव ट्रैकिंग व कारीगर विवरण',
          filterType: 'today',
          bookings: todayList,
        };

        return {
          text:
            lang === 'hi'
              ? `📅 आज के लिए आपकी ${todayList.length} सर्विस बुकिंग शेड्यूल है:`
              : `📅 You have ${todayList.length} service booking scheduled for today:`,
          dynamicComponent: mgmtComp,
          suggestedChips: ['🛵 सर्विसमैन कब आ रहा है?', '👨‍🔧 कारीगर कौन है?', '🚫 बुकिंग कैंसल करें'],
          updatedContext,
          missingFields,
          isComplete,
        };
      } else {
        return {
          text:
            lang === 'hi'
              ? '📅 आज के लिए आपकी कोई बुकिंग शेड्यूल नहीं है। क्या आप आज के लिए कोई नई सर्विस बुक करना चाहते हैं?'
              : '📅 You have no bookings scheduled for today. Would you like to book a service for today?',
          suggestedChips: ['⚡ आज इलेक्ट्रीशियन चाहिए', '🔧 आज प्लंबर चाहिए', '📋 मेरी सभी बुकिंग्स'],
          updatedContext,
          missingFields,
          isComplete,
        };
      }
    }

    // Intent 2: "booking cancel karo" / Cancellation
    if (bookingIntent === 'cancel_booking') {
      const cancelable = formattedBookings.find((b) => b.canCancel);

      if (cancelable) {
        const cancelComp: DynamicChatComponent = {
          type: 'booking_cancel_card',
          bookingId: cancelable.id,
          serviceName: cancelable.serviceName,
          scheduledDate: cancelable.scheduledDate,
          scheduledTime: cancelable.scheduledTime,
          reasons: [
            'समय पर उपलब्ध नहीं (Not available at scheduled time)',
            'गलती से बुक हो गया (Booked by mistake)',
            'प्लान बदल गया / काम हो चुका (Plans changed)',
            'अन्य आपातकालीन काम आ गया (Urgent personal work)',
          ],
        };

        return {
          text:
            lang === 'hi'
              ? `🚫 क्या आप बुकिंग #${cancelable.id} (${cancelable.serviceName}) को रद्द (Cancel) करना चाहते हैं?\nकृपया नीचे दिए गए कार्ड से रद्दीकरण का कारण चुनें:`
              : `🚫 Would you like to cancel booking #${cancelable.id} (${cancelable.serviceName})?\nPlease select a reason below:`,
          dynamicComponent: cancelComp,
          suggestedChips: ['बुकिंग रद्द नहीं करनी', 'समय रीशेड्यूल करें', 'हेल्पलाइन'],
          updatedContext,
          missingFields,
          isComplete,
        };
      } else {
        return {
          text:
            lang === 'hi'
              ? 'ℹ️ आपके खाते में फिलहाल कोई ऐसी एक्टिव बुकिंग नहीं है जिसे रद्द किया जा सके।'
              : 'ℹ️ You do not have any active cancellable bookings in your account.',
          suggestedChips: ['📋 मेरी सभी बुकिंग्स', '🔧 नई सर्विस बुक करें'],
          updatedContext,
          missingFields,
          isComplete,
        };
      }
    }

    // Intent 3: "booking reschedule karo" / Rescheduling
    if (bookingIntent === 'reschedule_booking') {
      const reschedulable = formattedBookings.find((b) => b.canReschedule);

      if (reschedulable) {
        const reschedComp: DynamicChatComponent = {
          type: 'booking_reschedule_card',
          bookingId: reschedulable.id,
          serviceName: reschedulable.serviceName,
          currentDate: reschedulable.scheduledDate,
          currentTime: reschedulable.scheduledTime,
          availableDates: ['आज (Today)', 'कल (Tomorrow)', 'परसों (Day After)'],
          availableSlots: [
            '09:00 AM - 11:00 AM',
            '11:00 AM - 01:00 PM',
            '02:00 PM - 04:00 PM',
            '04:00 PM - 06:00 PM',
          ],
        };

        return {
          text:
            lang === 'hi'
              ? `📅 बुकिंग #${reschedulable.id} (${reschedulable.serviceName}) का समय बदलने के लिए कृपया नया दिन और समय स्लॉट चुनें:`
              : `📅 To reschedule booking #${reschedulable.id} (${reschedulable.serviceName}), please select a new date and time slot:`,
          dynamicComponent: reschedComp,
          suggestedChips: ['समय नहीं बदलना', '📋 मेरी बुकिंग्स', 'कस्टमर केयर'],
          updatedContext,
          missingFields,
          isComplete,
        };
      } else {
        return {
          text:
            lang === 'hi'
              ? 'ℹ️ रीशेड्यूल करने के लिए कोई एक्टिव बुकिंग उपलब्ध नहीं है।'
              : 'ℹ️ No active bookings available for rescheduling.',
          suggestedChips: ['📋 मेरी सभी बुकिंग्स', '🔧 नई सर्विस बुक करें'],
          updatedContext,
          missingFields,
          isComplete,
        };
      }
    }

    // Intent 4: "service man kab aa raha hai" / ETA & Live Tracking
    if (bookingIntent === 'eta_tracking') {
      const trackable = formattedBookings.find(
        (b) => b.displayStatus === 'ARRIVING' || b.displayStatus === 'ACCEPTED' || b.displayStatus === 'ARRIVED'
      );

      if (trackable) {
        const etaText =
          trackable.displayStatus === 'ARRIVING'
            ? `🛵 आपके कारीगर **${trackable.serviceManName}** रास्ते में हैं और अगले **${trackable.etaMinutes || 25} मिनट** में आपकी लोकेशन पर पहुँच रहे हैं (${trackable.approxDistance || '2.2 किमी दूर'})।`
            : trackable.displayStatus === 'ARRIVED'
            ? `📍 कारीगर **${trackable.serviceManName}** आपकी लोकेशन पर पहुँच चुके हैं!`
            : `📋 कारीगर **${trackable.serviceManName}** असाइन हो चुके हैं और निर्धारित समय (${trackable.scheduledDate}, ${trackable.scheduledTime}) पर पहुँचेंगे।`;

        const mgmtComp: DynamicChatComponent = {
          type: 'booking_management_card',
          title: '📍 लाइव सर्विसमैन ट्रैकिंग (Live Tracking)',
          subtitle: `बुकिंग #${trackable.id}`,
          filterType: 'single',
          bookings: [trackable],
        };

        return {
          text: `${etaText}\n\n🔒 **स्टार्ट कोड (Start OTP):** ${trackable.otp || '5482'}\n📞 **संपर्क:** ${trackable.serviceManPhone || '+91 98260 12345'}`,
          dynamicComponent: mgmtComp,
          suggestedChips: ['👨‍🔧 कारीगर को कॉल करें', '📅 समय रीशेड्यूल करें', '📋 मेरी सभी बुकिंग्स'],
          updatedContext,
          missingFields,
          isComplete,
        };
      } else {
        return {
          text:
            lang === 'hi'
              ? 'ℹ️ फिलहाल कोई ऑन-द-वे एक्टिव सर्विसमैन नहीं है।'
              : 'ℹ️ No active technician currently on the way.',
          suggestedChips: ['📋 मेरी बुकिंग्स दिखाओ', '🔧 नई सर्विस बुक करें'],
          updatedContext,
          missingFields,
          isComplete,
        };
      }
    }

    // Intent 5: "service man kaun hai" / Pro Profile & Identity
    if (bookingIntent === 'pro_details') {
      const activeProBooking = formattedBookings.find(
        (b) => b.serviceManName && b.displayStatus !== 'CANCELLED'
      );

      if (activeProBooking) {
        const mgmtComp: DynamicChatComponent = {
          type: 'booking_management_card',
          title: '👨‍🔧 असाइन्ड सर्विसमैन प्रोफाइल',
          subtitle: `बुकिंग #${activeProBooking.id} • ${activeProBooking.serviceName}`,
          filterType: 'single',
          bookings: [activeProBooking],
        };

        return {
          text:
            lang === 'hi'
              ? `👨‍🔧 आपकी बुकिंग #${activeProBooking.id} के लिए असाइन्ड कारीगर:\n• **नाम:** ${activeProBooking.serviceManName}\n• **हुनर:** ${activeProBooking.serviceManTrade || 'सीनियर तकनीशियन'}\n• **रेटिंग:** ⭐ ${activeProBooking.serviceManRating || 4.9}\n• **फोन:** ${activeProBooking.serviceManPhone}`
              : `👨‍🔧 Assigned Service Professional for booking #${activeProBooking.id}:\n• **Name:** ${activeProBooking.serviceManName}\n• **Trade:** ${activeProBooking.serviceManTrade || 'Senior Technician'}\n• **Rating:** ⭐ ${activeProBooking.serviceManRating || 4.9}\n• **Phone:** ${activeProBooking.serviceManPhone}`,
          dynamicComponent: mgmtComp,
          suggestedChips: ['📞 कारीगर को कॉल करें', '🛵 सर्विसमैन कब आ रहा है?', '📋 मेरी बुकिंग्स'],
          updatedContext,
          missingFields,
          isComplete,
        };
      } else {
        return {
          text:
            lang === 'hi'
              ? 'ℹ️ आपकी किसी एक्टिव बुकिंग के लिए अभी कारीगर असाइन होना बाकी है या कोई एक्टिव बुकिंग नहीं है।'
              : 'ℹ️ No assigned professional found on active bookings.',
          suggestedChips: ['📋 मेरी बुकिंग्स दिखाओ', '🔧 नई सर्विस बुक करें'],
          updatedContext,
          missingFields,
          isComplete,
        };
      }
    }

    // Intent 6: "meri purani bookings dikhao" / Past Bookings
    if (bookingIntent === 'show_past') {
      const pastList = conversationalBookingManagement
        .getPastBookings(bookings)
        .map((b) => conversationalBookingManagement.formatBookingItem(b));

      const mgmtComp: DynamicChatComponent = {
        type: 'booking_management_card',
        title: lang === 'hi' ? '📜 पिछली पूर्ण व रद्द बुकिंग्स (Past Bookings)' : 'Past Bookings',
        subtitle: 'पूर्ण और कैंसल की गई सेवाओं का इतिहास',
        filterType: 'past',
        bookings: pastList,
      };

      return {
        text:
          lang === 'hi'
            ? `📜 आपके खाते में कुल ${pastList.length} पिछली बुकिंग्स का रिकॉर्ड है:`
            : `📜 Found ${pastList.length} past bookings in your account:`,
        dynamicComponent: mgmtComp,
        suggestedChips: ['📅 आज की बुकिंग क्या है?', '🔧 नई सर्विस बुक करें', '👛 वॉलेट बैलेंस'],
        updatedContext,
        missingFields,
        isComplete,
      };
    }

    // Intent 7 & 8: "meri booking dikhao" / "booking details batao"
    const mgmtComp: DynamicChatComponent = {
      type: 'booking_management_card',
      title: lang === 'hi' ? '📋 मेरी सभी बुकिंग्स (My Bookings)' : 'My Bookings',
      subtitle: `${formattedBookings.length} कुल बुकिंग्स • रियल-टाइम स्थिति`,
      filterType: 'all',
      bookings: formattedBookings,
    };

    return {
      text:
        formattedBookings.length > 0
          ? lang === 'hi'
            ? `📋 आपकी कुल **${formattedBookings.length}** बुकिंग्स का विवरण नीचे दिया गया है। आप सीधे यहीं से ट्रैक, रीशेड्यूल या कैंसल कर सकते हैं:`
            : `📋 Found **${formattedBookings.length}** bookings in your account. You can track, reschedule, or cancel directly below:`
          : lang === 'hi'
          ? '📋 आपके खाते में अभी कोई बुकिंग उपलब्ध नहीं है। आप नीचे दिए गए विकल्पों से नई सर्विस बुक कर सकते हैं:'
          : '📋 You currently have no bookings. You can book a new service below:',
      dynamicComponent: mgmtComp,
      suggestedChips: [
        '📅 आज वाली बुकिंग क्या है?',
        '🛵 सर्विसमैन कब आ रहा है?',
        '📜 मेरी पुरानी बुकिंग्स दिखाओ',
        '🔧 नई सर्विस बुक करें',
      ],
      updatedContext,
      missingFields,
      isComplete,
    };
  }

  // --- SPECIAL FLOW 9: AI Service Discovery (Phase 7) ---
  const discovery = serviceDiscovery.discoverService(
    query,
    services,
    categories,
    userProfile?.address || updatedContext.location
  );

  if (discovery) {
    if (discovery.selectedService) {
      updatedContext.serviceType = discovery.selectedService.name;
      updatedContext.serviceCategory =
        discovery.selectedService.categoryName || updatedContext.serviceCategory;
      updatedContext.estimatedPrice = discovery.selectedService.basePrice;
    } else if (discovery.category) {
      updatedContext.serviceCategory = discovery.category.name;
    }

    const reevaluatedMissing = conversationMemory.detectMissingFields(
      updatedContext,
      userProfile
    );

    return {
      text: discovery.responseMessage,
      actions: discovery.actions,
      suggestedChips: discovery.suggestedChips,
      dynamicComponent: discovery.dynamicComponent,
      updatedContext,
      missingFields: reevaluatedMissing,
      isComplete: reevaluatedMissing.length === 0,
    };
  }

  // --- SPECIAL FLOW 10: Explicit Location / Address Request (Phase 9) ---
  if (
    (q.includes('location') ||
      q.includes('लोकेशन') ||
      q.includes('address') ||
      q.includes('एड्रेस') ||
      q.includes('पता') ||
      q.includes('स्थान') ||
      q.includes('select on map') ||
      q.includes('current location') ||
      q.includes('enter address') ||
      q.includes('saved address')) &&
    !q.includes('electrician') &&
    !q.includes('plumber') &&
    !q.includes('booking')
  ) {
    let initialMode: 'options' | 'gps' | 'map' | 'manual' | 'saved' = 'options';
    if (
      q.includes('current location') ||
      q.includes('gps') ||
      q.includes('करंट') ||
      q.includes('use current location')
    ) {
      initialMode = 'gps';
    } else if (
      q.includes('select on map') ||
      q.includes('map') ||
      q.includes('मैप')
    ) {
      initialMode = 'map';
    } else if (
      q.includes('manual') ||
      q.includes('मैन्युअल') ||
      q.includes('enter address') ||
      q.includes('हाथ से पता')
    ) {
      initialMode = 'manual';
    } else if (
      q.includes('saved') ||
      q.includes('सेव्ड')
    ) {
      initialMode = 'saved';
    }

    const savedAddressObj = userProfile?.address
      ? {
          houseFlat: '',
          street: '',
          area: userProfile.area || 'Bhopal',
          city: userProfile.city || 'Bhopal',
          district: userProfile.districtName || 'Bhopal',
          state: userProfile.state || 'Madhya Pradesh',
          pincode: '462011',
          landmark: '',
          fullAddress: userProfile.address,
        }
      : undefined;

    const locComp: DynamicChatComponent = {
      type: 'location_experience',
      title: '📍 सेवा की लोकेशन चुनें (Select Service Location)',
      defaultLocality: 'MP Nagar',
      localities: [
        'MP Nagar',
        'Arera Colony',
        'Kolar Road',
        'Indrapuri / BHEL',
        'Hoshangabad Road',
        'Ayodhya Bypass',
        'New Market',
      ],
      savedAddress: savedAddressObj,
      initialMode,
    };

    return {
      text:
        lang === 'hi'
          ? '📍 कृपया सेवा की लोकेशन या पता चुनें (GPS, मैप, मैन्युअल या सेव्ड एड्रेस):'
          : '📍 Please select the service location (GPS, Map, Manual, or Saved Address):',
      dynamicComponent: locComp,
      suggestedChips: [
        '📍 Use current location',
        '🗺️ Select on map',
        '🏠 Enter address manually',
        '📌 Saved address',
      ],
      updatedContext,
      missingFields,
      isComplete: false,
    };
  }

  // --- SPECIAL FLOW 11: Service Professional Discovery & Fastest Arrival Selection (Phase 10) ---
  const isFastestRequest =
    q.includes('jaldi') ||
    q.includes('जल्दी') ||
    q.includes('fastest') ||
    q.includes('fast') ||
    q.includes('urgent') ||
    q.includes('तुरंत') ||
    q.includes('express');

  const isProDiscoveryIntent =
    isFastestRequest ||
    q.includes('serviceman') ||
    q.includes('service professional') ||
    q.includes('technician') ||
    q.includes('pro dikhao') ||
    q.includes('pro') ||
    q.includes('कारीगर') ||
    q.includes('मिस्त्री') ||
    q.includes('kaun aayega') ||
    q.includes('कौन आएगा') ||
    q.includes('available pro') ||
    q.includes('available serviceman');

  if (
    isProDiscoveryIntent &&
    !q.includes('yes_no_confirmed') &&
    !q.includes('confirm') &&
    !q.includes('booking_confirmed')
  ) {
    const eligiblePros = serviceProfessionalDiscovery.discoverEligiblePros({
      serviceCategory: updatedContext.serviceCategory,
      serviceType: updatedContext.serviceType,
      customerArea: updatedContext.area || updatedContext.location || userProfile?.area,
      customerLat: updatedContext.latitude,
      customerLng: updatedContext.longitude,
      registeredPros: serviceMen,
      sortByFastest: isFastestRequest,
    });

    if (eligiblePros.length > 0) {
      const fastest = eligiblePros[0];
      const proComp: DynamicChatComponent = {
        type: 'service_professional_card',
        title: isFastestRequest
          ? lang === 'hi'
            ? '⚡ सबसे जल्दी उपलब्ध कारीगर (Fastest Available)'
            : '⚡ Fastest Available Professional'
          : lang === 'hi'
          ? '👨‍🔧 उपलब्ध वेरिफाइड कारीगर (Eligible Service Professionals)'
          : '👨‍🔧 Eligible Service Professionals',
        subtitle: `${updatedContext.serviceType || updatedContext.serviceCategory || 'सर्विस'} • भोपाल`,
        serviceCategory: updatedContext.serviceCategory,
        serviceName: updatedContext.serviceType,
        pros: eligiblePros,
        selectedProId: updatedContext.selectedServiceMan?.id,
      };

      const replyText = isFastestRequest
        ? lang === 'hi'
          ? `⚡ आपकी लोकेशन के अनुसार सबसे जल्दी उपलब्ध कारीगर **${fastest.name}** (${fastest.skill}) हैं, जो **${fastest.estimatedArrival}** में पहुँच सकते हैं (दूरी: ${fastest.approxDistance}, रेटिंग: ⭐ ${fastest.rating})।\n\nकृपया नीचे दिए गए कार्ड से चयन की पुष्टि करें:`
          : `⚡ Based on your location, the fastest available professional is **${fastest.name}** (${fastest.skill}), arriving in **${fastest.estimatedArrival}** (Distance: ${fastest.approxDistance}, Rating: ⭐ ${fastest.rating}).\n\nPlease select and confirm below:`
        : lang === 'hi'
        ? `👨‍🔧 आपकी सेवा **${updatedContext.serviceType || updatedContext.serviceCategory || 'होम सर्विस'}** के लिए HARDINKAAM के वेरिफाइड उपलब्ध कारीगर नीचे दिए गए हैं। आप अपनी पसंद का कारीगर चुन सकते हैं:`
        : `👨‍🔧 Here are the verified available professionals for **${updatedContext.serviceType || updatedContext.serviceCategory || 'service'}**. You can choose your preferred professional:`;

      return {
        text: replyText,
        dynamicComponent: proComp,
        suggestedChips: [
          `⚡ ${fastest.name} को चुनें (सबसे तेज़)`,
          '📅 तारीख व समय बदलें',
          '📋 बुकिंग सारांश देखें',
        ],
        updatedContext,
        missingFields,
        isComplete: false,
      };
    }
  }

  // =========================================================================
  // STRUCTURED CONVERSATION ENGINE (PHASE 5: MISSING INFORMATION DETECTION)
  // =========================================================================

  // If ALL required booking fields are satisfied, present the complete Booking Summary with explicit confirmation!
  if (isComplete) {
    const basePrice = updatedContext.estimatedPrice || 199;
    const taxCalc = calculateIndianGst({
      basePrice,
      serviceCategoryId: updatedContext.serviceCategory,
      serviceName: (updatedContext as any).matchedService?.name || updatedContext.serviceCategory,
    });
    const gst = taxCalc.totalTaxAmount;
    const totalAmount = taxCalc.finalTotalAmount;

    let proName = updatedContext.selectedServiceMan?.name || 'Rajesh Sharma';
    let proPhone = updatedContext.selectedServiceMan?.phone || '+91 98260 12345';
    let proRating = updatedContext.selectedServiceMan?.rating || 4.9;

    if (!updatedContext.selectedServiceMan) {
      const catLower = (updatedContext.serviceCategory || '').toLowerCase();
      if (catLower.includes('plumb')) {
        proName = 'Ramesh Verma';
        proPhone = '+91 98260 54321';
        proRating = 4.88;
      } else if (catLower.includes('ac')) {
        proName = 'Sunil Chouhan';
        proPhone = '+91 98260 99887';
        proRating = 4.92;
      } else if (catLower.includes('clean')) {
        proName = 'Anita Bai & Team';
        proPhone = '+91 98260 33445';
        proRating = 4.86;
      }
    }

    const summaryCard: DynamicChatComponent = {
      type: 'booking_summary_card',
      serviceName: updatedContext.serviceType || updatedContext.serviceCategory || 'Home Service',
      categoryName: updatedContext.serviceCategory || 'General',
      problem: updatedContext.problemDescription || updatedContext.serviceType || 'Fan Repair',
      scheduledDate: updatedContext.preferredDate || 'कल (Tomorrow)',
      scheduledTime: updatedContext.preferredTime || '09:00 AM - 11:00 AM',
      scheduledDateTime: `${updatedContext.preferredDate || 'कल'}, ${updatedContext.preferredTime || '09:00 AM - 11:00 AM'}`,
      address: updatedContext.address || updatedContext.location || userProfile?.address || 'Bhopal, MP',
      totalAmount,
      estimatedCharge: totalAmount,
      status: 'पुष्टि लंबित (Pending Confirmation)',
      proName,
      proPhone,
      proRating,
      isConfirmationPending: true,
    };

    return {
      text:
        lang === 'hi'
          ? `शानदार! आपके काम के सभी विवरण तैयार हैं। कृपया नीचे दिए गए बुकिंग सारांश (Booking Summary) की समीक्षा करें और पुष्टि करें:`
          : `Great! All your booking details are ready. Please review the booking summary below and confirm:`,
      dynamicComponent: summaryCard,
      suggestedChips: ['Confirm Booking', 'Edit Details', 'Cancel'],
      actions: [
        { label: 'Confirm Booking', actionType: 'send_query', payload: 'हाँ, बुकिंग कन्फर्म करें' },
        { label: 'Edit Details', actionType: 'send_query', payload: 'बुकिंग विवरण बदलना है' },
        { label: 'Cancel', actionType: 'send_query', payload: 'बुकिंग रद्द करें' },
      ],
      updatedContext,
      missingFields: [],
      isComplete: true,
    };
  }

  // --- MISSING FIELD STEP 1: Missing Service Category or Specific Service Type ---
  if (missingFields.includes('serviceCategory')) {
    const catOptions: DynamicChatComponent = {
      type: 'options',
      title: 'आप किस प्रकार का काम करवाना चाहते हैं?',
      subtitle: 'भोपाल के सभी इलाकों में 100% वेरिफाइड पेशेवर',
      options: [
        { id: 'opt_elec', label: '⚡ इलेक्ट्रीशियन (Electrician)', description: 'पंखा, स्विच, शॉर्ट सर्किट, वायरिंग', price: 199 },
        { id: 'opt_plumb', label: '🔧 प्लंबर (Plumber)', description: 'नल, लीकेज, वाटर टैंक, मोटर', price: 249 },
        { id: 'opt_ac', label: '❄️ AC सर्विस व रिपेयर', description: 'जेट पंप वॉश, कूलिंग, गैस रीफिल', price: 499 },
        { id: 'opt_clean', label: '🧹 डीप क्लीनिंग', description: 'बाथरूम, किचन, सोफा सफाई', price: 699 },
      ],
    };

    return {
      text:
        lang === 'hi'
          ? 'नमस्ते! कृपया बताएं कि आपको किस प्रकार की सेवा चाहिए:'
          : 'Hello! Please select what service category you need:',
      dynamicComponent: catOptions,
      suggestedChips: ['⚡ Electrician', '🔧 Plumber', '❄️ AC Repair', '🧹 Cleaning'],
      updatedContext,
      missingFields,
      isComplete: false,
    };
  }

  if (missingFields.includes('serviceType')) {
    // If category is Electrician
    if (updatedContext.serviceCategory === 'Electrician') {
      const elecOptions: DynamicChatComponent = {
        type: 'options',
        title: '⚡ इलेक्ट्रीशियन से क्या काम करवाना है?',
        subtitle: 'पंखा, स्विच बोर्ड, वायरिंग या अन्य फॉल्ट',
        options: [
          { id: 'fan_rep', label: '🌀 सीलिंग फैन रिपेयर / फिटिंग', description: 'धीमा चलना, आवाज, नया पंखा लगाना', price: 199 },
          { id: 'switch_rep', label: '🔌 स्विच बोर्ड / सॉकेट रिपेयर', description: 'जला स्विच, नया बोर्ड फिटिंग', price: 149 },
          { id: 'wire_insp', label: '⚡ शॉर्ट सर्किट व वायरिंग चेक', description: 'MCB ट्रिप, स्पार्किंग, फॉल्ट ढूंढना', price: 299 },
          { id: 'light_fit', label: '💡 ट्यूबलाइट / LED पैनल फिटिंग', description: 'छत लाइट, झूमर, कंसील्ड लाइट', price: 179 },
        ],
      };

      return {
        text:
          lang === 'hi'
            ? 'इलेक्ट्रीशियन में आपको किस चीज़ का काम करवाना है? नीचे से चुनें या बताएं:'
            : 'What electrical work do you need? Choose an option below:',
        dynamicComponent: elecOptions,
        suggestedChips: ['🌀 पंखा रिपेयर', '🔌 स्विच बोर्ड', '⚡ शॉर्ट सर्किट'],
        updatedContext,
        missingFields,
        isComplete: false,
      };
    }

    // If category is Plumber
    if (updatedContext.serviceCategory === 'Plumber') {
      const plumbOptions: DynamicChatComponent = {
        type: 'options',
        title: '🔧 प्लंबर से क्या काम करवाना है?',
        subtitle: 'भोपाल के सभी इलाकों में डोरस्टेप प्लंबिंग सेवा',
        options: [
          { id: 'tap_leak', label: '🚰 नल रिपेयर व लीकेज फिक्स', description: 'टपकता नल, नया नल लगाना', price: 199 },
          { id: 'pipe_block', label: '🚿 पाइप व ड्रेनेज ब्लॉकेज', description: 'जाम सिंक, नाली या पाइप खोलना', price: 299 },
          { id: 'tank_clean', label: '🛢️ वाटर टैंक डीप क्लीनिंग', description: 'अल्ट्रा-हाइजीनिक 5-स्टेज टैंक वॉश', price: 699, badge: 'सुपर क्लीन' },
          { id: 'motor_fit', label: '⚡ पानी मोटर रिपेयर व फिटिंग', description: 'मोटर इंस्टॉलेशन व वाइंडिंग चेक', price: 349 },
        ],
      };

      return {
        text:
          lang === 'hi'
            ? 'प्लंबर के लिए आप किस समस्या का समाधान चाहते हैं?'
            : 'What plumbing issue do you need resolved?',
        dynamicComponent: plumbOptions,
        suggestedChips: ['🚰 नल टपक रहा है', '🚿 पाइप ब्लॉकेज', '🛢️ वाटर टैंक सफाई'],
        updatedContext,
        missingFields,
        isComplete: false,
      };
    }

    // If category is AC
    if (updatedContext.serviceCategory === 'AC Service & Repair') {
      const acServices: DynamicChatComponent = {
        type: 'service_cards',
        title: '❄️ उपलब्ध AC सेवाएं (30 दिन वारंटी सहित)',
        services: [
          {
            id: 'ac_jet',
            name: 'AC फोम जेट पंप डीप सर्विस',
            price: 499,
            duration: '45 मिनट',
            rating: 4.9,
            inclusions: ['हाई-प्रेशर जेट वॉश', 'कूलिंग कॉइल सफाई', 'फिल्टर व ट्रे क्लीन'],
          },
          {
            id: 'ac_gas',
            name: 'AC गैस रीफिल (100% प्योर)',
            price: 1499,
            duration: '60 मिनट',
            rating: 4.8,
            inclusions: ['लीकेज टेस्टिंग', 'R32 / R410A गैस टॉप-अप', 'कूलिंग गारंटी'],
          },
          {
            id: 'ac_install',
            name: 'AC इंस्टॉलेशन / अन-इंस्टॉलेशन',
            price: 799,
            duration: '90 मिनट',
            rating: 4.7,
            inclusions: ['वॉल ब्रैकेट फिक्स', 'कॉपर पाइपिंग', 'वाइब्रेशन टेस्ट'],
          },
        ],
      };

      return {
        text:
          lang === 'hi'
            ? '❄️ AC सर्विस के लिए पैकेज चुनें ताकि उपयुक्त टूल्स के साथ इंजीनियर पहुंचे:'
            : '❄️ Select an AC package so our technician arrives prepared:',
        dynamicComponent: acServices,
        suggestedChips: ['जेट पंप वॉश बुक करें', 'गैस रीफिल', 'कूलिंग नहीं हो रही'],
        updatedContext,
        missingFields,
        isComplete: false,
      };
    }
  }

  // --- MISSING FIELD STEP 2: Location / Address (Phase 9: Location Experience) ---
  if (missingFields.includes('location')) {
    let initialMode: 'options' | 'gps' | 'map' | 'manual' | 'saved' = 'options';
    if (
      q.includes('current location') ||
      q.includes('gps') ||
      q.includes('करंट') ||
      q.includes('use current location')
    ) {
      initialMode = 'gps';
    } else if (
      q.includes('select on map') ||
      q.includes('map') ||
      q.includes('मैप')
    ) {
      initialMode = 'map';
    } else if (
      q.includes('manual') ||
      q.includes('मैन्युअल') ||
      q.includes('enter address') ||
      q.includes('हाथ से पता')
    ) {
      initialMode = 'manual';
    } else if (
      q.includes('saved') ||
      q.includes('सेव्ड')
    ) {
      initialMode = 'saved';
    }

    const savedAddressObj = userProfile?.address
      ? {
          houseFlat: '',
          street: '',
          area: userProfile.area || 'Bhopal',
          city: userProfile.city || 'Bhopal',
          district: userProfile.districtName || 'Bhopal',
          state: userProfile.state || 'Madhya Pradesh',
          pincode: '462011',
          landmark: '',
          fullAddress: userProfile.address,
        }
      : undefined;

    const locComp: DynamicChatComponent = {
      type: 'location_experience',
      title: '📍 सेवा की लोकेशन चुनें (Select Service Location)',
      defaultLocality: 'MP Nagar',
      localities: [
        'MP Nagar',
        'Arera Colony',
        'Kolar Road',
        'Indrapuri / BHEL',
        'Hoshangabad Road',
        'Ayodhya Bypass',
        'New Market',
      ],
      savedAddress: savedAddressObj,
      initialMode,
    };

    return {
      text:
        lang === 'hi'
          ? `📍 ${updatedContext.serviceType || 'सर्विस'} के लिए कृपया अपनी लोकेशन या पता बताएं:\n(आप करंट GPS, मैप पिन, मैन्युअल पता या सेव्ड एड्रेस में से चुन सकते हैं)`
          : `📍 Please select the service location for ${updatedContext.serviceType || 'service'}:\n(Choose from Current GPS, Map, Manual Address, or Saved Address)`,
      dynamicComponent: locComp,
      suggestedChips: [
        '📍 Use current location',
        '🗺️ Select on map',
        '🏠 Enter address manually',
        '📌 Saved address',
      ],
      updatedContext,
      missingFields,
      isComplete: false,
    };
  }

  // --- MISSING FIELD STEP 3: Preferred Date ---
  if (missingFields.includes('preferredDate')) {
    const dateComp: DynamicChatComponent = {
      type: 'date_picker',
      title: '📅 सेवा के लिए तारीख चुनें (Select Service Date)',
      quickDates: [
        { id: 'today', label: 'आज (Today)', date: new Date().toISOString().split('T')[0] },
        { id: 'tomorrow', label: 'कल (Tomorrow)', date: new Date(Date.now() + 86400000).toISOString().split('T')[0] },
        { id: 'day_after', label: 'परसों', date: new Date(Date.now() + 172800000).toISOString().split('T')[0] },
      ],
    };

    const locationNotice = updatedContext.area || updatedContext.location || userProfile?.address;
    const locationPart = locationNotice ? ` (${locationNotice} के लिए)` : '';

    return {
      text:
        lang === 'hi'
          ? `📅 ${updatedContext.serviceType || 'सेवा'}${locationPart} के लिए आप किस दिन कारीगर को बुलाना चाहते हैं?`
          : `📅 Which date would you like the technician to visit${locationPart}?`,
      dynamicComponent: dateComp,
      suggestedChips: ['आज ही आएं (Today)', 'कल सुबह (Tomorrow)', 'परसों'],
      updatedContext,
      missingFields,
      isComplete: false,
    };
  }

  // --- MISSING FIELD STEP 4: Preferred Time Slot ---
  if (missingFields.includes('preferredTime')) {
    const timeComp: DynamicChatComponent = {
      type: 'time_picker',
      title: '⏰ किस समय स्लॉट पर कारीगर को बुलाना चाहते हैं?',
      slots: [
        { id: 'urgent_60', label: 'तत्काल (Express arrival)', timeRange: 'अगले 60 मिनट में', isUrgent: true, badge: 'सुपरफास्ट' },
        { id: 'morning', label: 'सुबह का स्लॉट', timeRange: '08:00 AM – 11:00 AM' },
        { id: 'afternoon', label: 'दोपहर का स्लॉट', timeRange: '12:00 PM – 03:00 PM' },
        { id: 'evening', label: 'शाम का स्लॉट', timeRange: '04:00 PM – 07:00 PM' },
      ],
    };

    return {
      text:
        lang === 'hi'
          ? `तारीख (${updatedContext.preferredDate || 'आज'}) नोट कर ली गई है! अब कृपया अपना पसंदीदा समय स्लॉट चुनें:`
          : `Date noted! Now please select your preferred time slot:`,
      dynamicComponent: timeComp,
      suggestedChips: ['तत्काल (अगले 60 मिनट में)', 'सुबह 8-11 AM', 'दोपहर 12-3 PM', 'शाम 4-7 PM'],
      updatedContext,
      missingFields,
      isComplete: false,
    };
  }

  // --- MISSING FIELD STEP 5: Guest Name / Mobile ---
  if (missingFields.includes('customerName') || missingFields.includes('mobile')) {
    const textInputComp: DynamicChatComponent = {
      type: 'text_input',
      title: 'नाम व संपर्क नंबर दर्ज करें',
      placeholder: 'उदा. राहुल शर्मा - 9876543210',
      submitLabel: 'विवरण सुरक्षित करें',
    };

    return {
      text:
        lang === 'hi'
          ? 'कारीगर के आगमन पर संपर्क व OTP वेरिफिकेशन के लिए कृपया अपना नाम व मोबाइल नंबर बताएं:'
          : 'Please provide your name and 10-digit mobile number for dispatch & OTP verification:',
      dynamicComponent: textInputComp,
      suggestedChips: ['लॉगिन करें', 'कस्टमर सपोर्ट'],
      updatedContext,
      missingFields,
      isComplete: false,
    };
  }

  // --- KNOWLEDGE SYSTEM INQUIRY (PHASE 19) ---
  const isKnowledgeQuery =
    q.includes('policy') ||
    q.includes('rule') ||
    q.includes('नियम') ||
    q.includes('cancellation') ||
    q.includes('refund') ||
    q.includes('रिफंड') ||
    q.includes('franchise') ||
    q.includes('फ्रेंचाइजी') ||
    q.includes('partner') ||
    q.includes('पार्टनर') ||
    q.includes('rate card') ||
    q.includes('rates') ||
    q.includes('price list') ||
    q.includes('area') ||
    q.includes('coverage') ||
    q.includes('kahan') ||
    q.includes('faq') ||
    q.includes('faqs') ||
    q.includes('sawal') ||
    q.includes('guarantee') ||
    q.includes('warranty') ||
    q.includes('police') ||
    q.includes('verified') ||
    q.includes('process') ||
    q.includes('kaise book') ||
    q.includes('how to book') ||
    q.includes('customer care') ||
    q.includes('helpline') ||
    q.includes('contact');

  if (isKnowledgeQuery) {
    const kbRes = knowledgeBaseService.queryKnowledge(query, lang);
    return {
      text: kbRes.replyText,
      dynamicComponent: kbRes.dynamicComponent,
      actions: kbRes.actions,
      suggestedChips: kbRes.suggestedChips,
      updatedContext,
      missingFields,
      isComplete,
    };
  }

  // --- SMART TECHNICAL / TROUBLESHOOTING & GENERAL QUERY HANDLER ---
  if (
    q.includes('short') ||
    q.includes('short circuit') ||
    q.includes('wire') ||
    q.includes('bijli') ||
    q.includes('current') ||
    q.includes('spark') ||
    q.includes('तार') ||
    q.includes('शॉर्ट') ||
    q.includes('करंट') ||
    q.includes('leak') ||
    q.includes('paani') ||
    q.includes('panni') ||
    q.includes('kharab') ||
    q.includes('kya karu') ||
    q.includes('kya karein') ||
    q.includes('kaise theek')
  ) {
    let reply = '';
    if (q.includes('short') || q.includes('spark') || q.includes('wire') || q.includes('तार') || q.includes('शॉर्ट')) {
      reply =
        lang === 'hi'
          ? `⚡ **इलेक्ट्रिकल शॉर्ट सर्किट होने पर तुरंत ये सावधानी बरतें:**\n1. **मेन पावर ऑफ करें:** सबसे पहले घर का मुख्य MCB या मेन स्विच बंद करें।\n2. **सुरक्षा:** गीले हाथों या नंगे पैरों से किसी भी स्विच या नंगे तार को न छुएं।\n3. **जांच करवाएं:** बिना टेस्ट पेन या सावधानी के बोर्ड में हाथ न डालें।\n\nयदि आप भोपाल में हैं, तो क्या आप तुरंत एक प्रमाणित **इलेक्ट्रीशियन** बुक करना चाहेंगे?`
          : `⚡ **Precautions for Electrical Short Circuit:**\n1. **Cut Power:** Immediately turn off the main MCB or power switch.\n2. **Stay Safe:** Never touch exposed wires with wet hands.\n3. **Call Expert:** Get the wiring inspected by a certified electrician immediately.`;
    } else {
      reply =
        lang === 'hi'
          ? `🔍 **समस्या समाधान (Troubleshooting):**\nआपकी समस्या के लिए हमने जानकारी नोट कर ली है। इस समस्या को पूरी तरह ठीक करने के लिए हमारे पास अनुभवी कारीगर उपलब्ध हैं। क्या आप इसके लिए कोई सर्विस बुक करना चाहते हैं?`
          : `🔍 **Troubleshooting Info:**\nWe have noted your query. To fix this professionally, our verified experts are available. Would you like to book a service?`;
    }

    return {
      text: reply,
      suggestedChips: ['⚡ Electrician बुक करें', '🔧 Plumber बुक करें', '📞 कस्टमर केयर कॉल'],
      updatedContext,
      missingFields,
      isComplete,
    };
  }

  // Fallback default (sharp & direct, no unsolicited booking summaries)
  return {
    text:
      lang === 'hi'
        ? 'जी, मैंने आपकी बात समझ ली है। यदि आप इसके लिए कोई सर्विस बुक करना चाहते हैं या कोई अन्य जानकारी चाहिए, तो कृपया बताएं।'
        : 'Understood. If you would like to book a service for this or need any further assistance, please let me know.',
    suggestedChips: ['⚡ Electrician', '🔧 Plumber', '❄️ AC Repair', '📋 मेरी बुकिंग्स'],
    updatedContext,
    missingFields,
    isComplete,
  };
}
