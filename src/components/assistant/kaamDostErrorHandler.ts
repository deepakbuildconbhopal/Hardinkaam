import { AssistantLanguage } from './types';

export type KaamDostErrorCode =
  | 'NETWORK_ERROR'
  | 'FIREBASE_ERROR'
  | 'AUTH_EXPIRED'
  | 'OTP_FAILURE'
  | 'PAYMENT_FAILURE'
  | 'UPLOAD_FAILURE'
  | 'NO_SERVICE_AVAILABLE'
  | 'NO_SERVICEMAN_AVAILABLE'
  | 'BOOKING_CONFLICT'
  | 'INVALID_DATA'
  | 'PERMISSION_DENIED'
  | 'AI_UNAVAILABLE'
  | 'AI_RATE_LIMITED'
  | 'AI_TIMEOUT'
  | 'AI_MALFORMED_RESPONSE'
  | 'UNKNOWN_ERROR';

export interface UserFriendlyError {
  code: KaamDostErrorCode;
  title: string;
  hindiMessage: string;
  hinglishMessage: string;
  englishMessage: string;
  retryAction?: {
    actionType: string;
    payload?: any;
    label?: string;
  };
  supportContact?: string;
}

export const ERROR_MAPPINGS: Record<KaamDostErrorCode, Omit<UserFriendlyError, 'code'>> = {
  NETWORK_ERROR: {
    title: '🌐 इंटरनेट कनेक्शन जांचें',
    hindiMessage: 'थोड़ा इंटरनेट कनेक्शन स्लो या डिस्कनेक्ट हो गया है दोस्त 😕 कृपया इंटरनेट ऑन करके पुनः प्रयास करें।',
    hinglishMessage: 'Internet connection slow ya disconnect ho gaya hai dost 😕 Dobara try karein.',
    englishMessage: 'Network connection seems unstable. Please check your internet and try again.',
  },
  FIREBASE_ERROR: {
    title: '☁️ सर्वर सिंक इश्यू',
    hindiMessage: 'डेटाबेस सर्वर सिंक करने में थोड़ा समय लग रहा है। चिंता न करें, आपका डेटा सुरक्षित है।',
    hinglishMessage: 'Thoda technical issue aa gaya dost 😕 Aap dobara try karein.',
    englishMessage: 'Temporary cloud sync delay. Please retry in a moment.',
  },
  AUTH_EXPIRED: {
    title: '🔐 सेशन की मियाद समाप्त',
    hindiMessage: 'सुरक्षा कारणों से आपका सेशन समाप्त हो गया है। कृपया 1-क्लिक में पुनः लॉग इन करें।',
    hinglishMessage: 'Aapka login session expire ho gaya hai dost. Plz dobara login karein.',
    englishMessage: 'Your login session has expired for security. Please sign in again.',
  },
  OTP_FAILURE: {
    title: '🔑 अमान्य स्टार्ट कोड / OTP',
    hindiMessage: 'दर्ज किया गया OTP या कोड सही नहीं मिला। कृपया SMS में आया 4-अंकों का कोड पुनः जांचें।',
    hinglishMessage: 'OTP sahi nahi hai dost 😕 SMS wala 4-digit code dobara enter karein.',
    englishMessage: 'Invalid OTP code entered. Please re-check the 4-digit SMS code.',
  },
  PAYMENT_FAILURE: {
    title: '💳 पेमेंट प्रक्रिया पूरी नहीं हुई',
    hindiMessage: 'यूपीआई या बैंक गेटवे से रिस्पॉन्स मिलने में देरी हुई है। आपके पैसे कटे हैं तो 100% सेफ हैं।',
    hinglishMessage: 'Payment complete nahi ho paya dost. Dobara pay karein ya COD chunein.',
    englishMessage: 'Payment attempt timed out or failed. If debited, your money is 100% safe.',
  },
  UPLOAD_FAILURE: {
    title: '📤 फाइल अपलोड नहीं हो सकी',
    hindiMessage: 'फोटो या डॉक्यूमेंट अपलोड करने में समस्या आई। कृपया फाइल साइज (10MB से कम) जांचें।',
    hinglishMessage: 'Photo upload nahi ho payi dost. File size 10MB se kam honi chahiye.',
    englishMessage: 'File upload failed. Please ensure file size is under 10MB and retry.',
  },
  NO_SERVICE_AVAILABLE: {
    title: '🔍 सेवा उपलब्ध नहीं',
    hindiMessage: 'यह सर्विस फिलहाल आपकी चुनी गई लोकेशन पर उपलब्ध नहीं है। हम जल्द ही भोपाल में इसे ला रहे हैं।',
    hinglishMessage: 'Yeh service filhaal is location par available nahi hai dost.',
    englishMessage: 'This service is currently unavailable in this specific location.',
  },
  NO_SERVICEMAN_AVAILABLE: {
    title: '👨‍🔧 सभी कारीगर व्यस्त हैं',
    hindiMessage: 'आपके चुने गए समय स्लॉट पर हमारे भोपाल के सभी एक्सपर्ट्स व्यस्त हैं। कृपया दूसरा स्लॉट चुनें।',
    hinglishMessage: 'Is time slot par sabhi technicians busy hain dost. Doosra slot chunein.',
    englishMessage: 'All service professionals are booked for this slot. Please pick another time.',
  },
  BOOKING_CONFLICT: {
    title: '📅 बुकिंग समय टकराव',
    hindiMessage: 'इस समय स्लॉट पर आपकी पहले से ही एक बुकिंग दर्ज है। कृपया अलग समय चुनें।',
    hinglishMessage: 'Is time par aapki pehle se ek booking hai dost. Doosra time slot chunein.',
    englishMessage: 'Schedule conflict detected with an existing booking.',
  },
  INVALID_DATA: {
    title: '⚠️ अधूरी जानकारी',
    hindiMessage: 'कुछ आवश्यक जानकारी छूट गई है। कृपया फॉर्म या सवालों का उत्तर पूरा भरें।',
    hinglishMessage: 'Kuch zaroori details reh gayi hain dost. Kripya details check karein.',
    englishMessage: 'Incomplete or invalid input received. Please review your entries.',
  },
  PERMISSION_DENIED: {
    title: '🔒 अनुमति अस्वीकृत',
    hindiMessage: 'कंट्रोल सेटिंग्स या सुरक्षा नियमों के कारण इस एक्शन की अनुमति नहीं है।',
    hinglishMessage: 'Aapko is action ki permission nahi hai dost.',
    englishMessage: 'Action restricted due to role or platform permissions.',
  },
  AI_UNAVAILABLE: {
    title: '🛠️ KaamDost AI मेंटेनेंस',
    hindiMessage: 'थोड़ा टेक्निकल इश्यू आ गया दोस्त 😕 हमारे सिस्टम को अपग्रेड किया जा रहा है। हेल्पलाइन कॉल करें।',
    hinglishMessage: 'Thoda technical issue aa gaya dost 😕 Helpline 62675 46945 par call karein.',
    englishMessage: 'AI service is temporarily undergoing maintenance. Call support for urgent help.',
  },
  AI_RATE_LIMITED: {
    title: '⏳ AI अनुरोध सीमा',
    hindiMessage: 'AI सेवा पर अभी भारी ट्रैफिक है। कृपया 10-15 सेकंड रुककर पुनः प्रयास करें।',
    hinglishMessage: 'AI service par thoda traffic hai dost. 15 second baad try karein.',
    englishMessage: 'AI service rate limit reached. Please wait a moment and retry.',
  },
  AI_TIMEOUT: {
    title: '⏱️ रिस्पॉन्स समय समाप्त',
    hindiMessage: 'नेटवर्क देरी के कारण अनुरोध समय समाप्त हो गया। कृपया पुनः प्रयास करें।',
    hinglishMessage: 'Network delay ki wajah se timeout ho gaya dost. Dobara try karein.',
    englishMessage: 'Request timed out due to network latency. Please try again.',
  },
  AI_MALFORMED_RESPONSE: {
    title: '💬 संदेश स्पष्ट करें',
    hindiMessage: 'उत्तर समझने में थोड़ी असुविधा हुई। कृपया अपनी समस्या संक्षेप में दोबारा लिखें।',
    hinglishMessage: 'Baat samajhne me thodi dikkat hui dost. Apni baat dobara likhein.',
    englishMessage: 'Unable to parse AI response. Please rephrase your query.',
  },
  UNKNOWN_ERROR: {
    title: '😕 थोड़ा इश्यू आ गया',
    hindiMessage: 'थोड़ा टेक्निकल इश्यू आ गया दोस्त 😕 आप दोबारा ट्राई करें।',
    hinglishMessage: 'Thoda technical issue aa gaya dost 😕 Aap dobara try karein.',
    englishMessage: 'Something went wrong. Please retry your request.',
  },
};

export class KaamDostErrorHandler {
  /**
   * Translates any raw error or exception into a user-friendly structured error
   */
  public handle(
    rawError: any,
    failedActionType?: string,
    failedPayload?: any,
    overrideCode?: KaamDostErrorCode
  ): UserFriendlyError {
    let code: KaamDostErrorCode = overrideCode || 'UNKNOWN_ERROR';

    if (!overrideCode) {
      const msg = String(rawError?.message || rawError || '').toLowerCase();

      if (msg.includes('429') || msg.includes('quota') || msg.includes('rate limit') || msg.includes('resource_exhausted')) {
        code = 'AI_RATE_LIMITED';
      } else if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('deadline')) {
        code = 'AI_TIMEOUT';
      } else if (msg.includes('malformed') || msg.includes('syntaxerror') || msg.includes('unexpected token') || msg.includes('empty response')) {
        code = 'AI_MALFORMED_RESPONSE';
      } else if (msg.includes('invalid model') || msg.includes('model not found') || msg.includes('503') || msg.includes('service unavailable')) {
        code = 'AI_UNAVAILABLE';
      } else if (msg.includes('network') || msg.includes('offline') || msg.includes('fetch')) {
        code = 'NETWORK_ERROR';
      } else if (msg.includes('permission') || msg.includes('denied') || msg.includes('403') || msg.includes('401')) {
        code = 'PERMISSION_DENIED';
      } else if (msg.includes('auth') || msg.includes('token') || msg.includes('unauthorized')) {
        code = 'AUTH_EXPIRED';
      } else if (msg.includes('otp') || msg.includes('pin')) {
        code = 'OTP_FAILURE';
      } else if (msg.includes('payment') || msg.includes('razorpay')) {
        code = 'PAYMENT_FAILURE';
      } else if (msg.includes('upload') || msg.includes('storage') || msg.includes('file')) {
        code = 'UPLOAD_FAILURE';
      } else if (msg.includes('serviceman') || msg.includes('technician') || msg.includes('busy')) {
        code = 'NO_SERVICEMAN_AVAILABLE';
      } else if (msg.includes('firebase') || msg.includes('firestore')) {
        code = 'FIREBASE_ERROR';
      }
    }

    const mapping = ERROR_MAPPINGS[code] || ERROR_MAPPINGS.UNKNOWN_ERROR;

    return {
      code,
      ...mapping,
      retryAction: failedActionType
        ? {
            actionType: failedActionType,
            payload: failedPayload,
            label: '🔄 पुनः प्रयास करें (Retry)',
          }
        : undefined,
      supportContact: '+91 62675 46945',
    };
  }

  public getLocalizedMessage(err: UserFriendlyError, lang: AssistantLanguage): string {
    if (lang === 'hi') return err.hindiMessage;
    if (lang === 'hinglish') return err.hinglishMessage;
    return err.englishMessage;
  }
}

export const kaamDostErrorHandler = new KaamDostErrorHandler();
