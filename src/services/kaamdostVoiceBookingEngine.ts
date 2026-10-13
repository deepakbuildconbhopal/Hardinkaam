import { INITIAL_SERVICES } from '../firebase/seed';
import { VoiceBookingEntityDraft } from '../types';

export interface VoiceParsingResult {
  isBookingIntent: boolean;
  isStatusIntent: boolean;
  draft: VoiceBookingEntityDraft;
  missingFields: string[];
  replyMessageHindi: string;
  replyMessageEnglish: string;
  readyForConfirmation: boolean;
}

export class KaamDostVoiceBookingEngine {
  /**
   * Analyzes spoken transcript (Hindi, Hinglish, or English) to extract booking entities
   */
  public parseVoiceInput(
    transcript: string,
    existingDraft: VoiceBookingEntityDraft = {},
    userProfile?: any
  ): VoiceParsingResult {
    const text = transcript.toLowerCase();
    const draft: VoiceBookingEntityDraft = { ...existingDraft };

    // 1. Check for Status Intent ("पिछली बुकिंग का स्टेटस", "my booking status")
    if (
      text.includes('स्टेटस') ||
      text.includes('status') ||
      text.includes('pichhli') ||
      text.includes('पिछली') ||
      text.includes('booking check')
    ) {
      return {
        isBookingIntent: false,
        isStatusIntent: true,
        draft,
        missingFields: [],
        replyMessageHindi: 'आपकी हालिया बुकिंग की स्थिति जांचने के लिए मैं "My Bookings" स्क्रीन खोल रहा हूँ।',
        replyMessageEnglish: 'Opening My Bookings screen to show your current booking status.',
        readyForConfirmation: false,
      };
    }

    // 2. Identify Service Category / Keyword
    if (!draft.matchedServiceId) {
      if (text.includes('ac') || text.includes('एसी') || text.includes('air conditioner')) {
        const srv = INITIAL_SERVICES.find((s) => s.id === 'srv_ac_service_repair') || INITIAL_SERVICES[0];
        draft.matchedServiceId = srv.id;
        draft.matchedServiceName = srv.name;
        draft.serviceKeyword = 'एसी सर्विस एवं रिपेयर';
        draft.estimatedPrice = srv.price;
      } else if (text.includes('plumber') || text.includes('प्लंबर') || text.includes('नल') || text.includes('पानी')) {
        const srv = INITIAL_SERVICES.find((s) => s.id === 'srv_plumber_leakage') || INITIAL_SERVICES[2];
        draft.matchedServiceId = srv.id;
        draft.matchedServiceName = srv.name;
        draft.serviceKeyword = 'प्लंबिंग एवं पाइप लीकेज रिपेयर';
        draft.estimatedPrice = srv.price;
      } else if (text.includes('electric') || text.includes('इलेक्ट्रीशियन') || text.includes('लाइट') || text.includes('पंखा') || text.includes('स्विच')) {
        const srv = INITIAL_SERVICES.find((s) => s.id === 'srv_fan_install_repair') || INITIAL_SERVICES[1];
        draft.matchedServiceId = srv.id;
        draft.matchedServiceName = srv.name;
        draft.serviceKeyword = 'इलेक्ट्रिकल रिपेयर एवं इंस्टॉलेशन';
        draft.estimatedPrice = srv.price;
      } else if (text.includes('ro') || text.includes('water purifier') || text.includes('प्यूरीफायर') || text.includes('फिल्टर')) {
        const srv = INITIAL_SERVICES.find((s) => s.id === 'srv_ro_service') || INITIAL_SERVICES[4];
        draft.matchedServiceId = srv.id;
        draft.matchedServiceName = srv.name;
        draft.serviceKeyword = 'RO वाटर प्यूरीफायर सर्विस';
        draft.estimatedPrice = srv.price;
      } else if (text.includes('cleaning') || text.includes('क्लीनिंग') || text.includes('सफाई') || text.includes('झाड़ू')) {
        const srv = INITIAL_SERVICES.find((s) => s.id === 'srv_deep_home_cleaning') || INITIAL_SERVICES[3];
        draft.matchedServiceId = srv.id;
        draft.matchedServiceName = srv.name;
        draft.serviceKeyword = 'डीप होम क्लीनिंग';
        draft.estimatedPrice = srv.price;
      }
    }

    // 3. Identify Scheduled Date (आज, कल, परसों)
    const now = new Date();
    if (!draft.scheduledDate) {
      if (text.includes('कल') || text.includes('tomorrow') || text.includes('kal')) {
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        draft.scheduledDate = tomorrow.toISOString().split('T')[0];
      } else if (text.includes('आज') || text.includes('today') || text.includes('aaj')) {
        draft.scheduledDate = now.toISOString().split('T')[0];
      } else if (text.includes('परसों') || text.includes('parson')) {
        const dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        draft.scheduledDate = dayAfter.toISOString().split('T')[0];
      } else {
        // Default to tomorrow if not specified
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        draft.scheduledDate = tomorrow.toISOString().split('T')[0];
      }
    }

    // 4. Identify Time Slot (सुबह, दोपहर, शाम, 10 बजे, 2 बजे, etc.)
    if (!draft.scheduledTime) {
      if (text.includes('सुबह') || text.includes('morning') || text.includes('subah') || text.includes('10')) {
        draft.scheduledTime = '10:00 AM - 12:00 PM';
      } else if (text.includes('दोपहर') || text.includes('afternoon') || text.includes('dopahar') || text.includes('2') || text.includes('3')) {
        draft.scheduledTime = '02:00 PM - 04:00 PM';
      } else if (text.includes('शाम') || text.includes('evening') || text.includes('shaam') || text.includes('5') || text.includes('6')) {
        draft.scheduledTime = '05:00 PM - 07:00 PM';
      } else {
        draft.scheduledTime = '11:00 AM - 01:00 PM';
      }
    }

    // 5. Identify Location / Household (माता-पिता, अरेरा कॉलोनी, एमपी नगर, कोलार)
    if (!draft.householdOrAddress) {
      if (text.includes('parents') || text.includes('माता-पिता') || text.includes('mummy') || text.includes('papa')) {
        draft.householdOrAddress = 'माता-पिता का घर (Parents Residence, Bhopal)';
      } else if (text.includes('arera') || text.includes('अरेरा')) {
        draft.householdOrAddress = 'Arera Colony, Bhopal';
      } else if (text.includes('kolar') || text.includes('कोलार')) {
        draft.householdOrAddress = 'Kolar Road, Bhopal';
      } else if (text.includes('mp nagar') || text.includes('एमपी नगर')) {
        draft.householdOrAddress = 'MP Nagar Zone 2, Bhopal';
      } else if (userProfile?.address) {
        draft.householdOrAddress = userProfile.address;
      } else {
        draft.householdOrAddress = 'भोपाल स्थानीय पता (Bhopal Home Address)';
      }
    }

    draft.city = 'Bhopal';

    // 6. Check for missing required entities
    const missing: string[] = [];
    if (!draft.matchedServiceName) missing.push('सेवा का नाम (Service)');
    if (!draft.scheduledDate) missing.push('दिनांक (Date)');
    if (!draft.scheduledTime) missing.push('समय (Time Slot)');

    const readyForConfirmation = missing.length === 0;

    let replyHi = '';
    let replyEn = '';

    if (!readyForConfirmation) {
      replyHi = `नमस्ते! कृपया बताएं कि आपको कौन सी सेवा और किस समय चाहिए? (जैसे: 'कल सुबह एसी रिपेयर करवाना है')`;
      replyEn = `Hello! Please tell me which service and time slot you need (e.g. 'AC repair tomorrow morning').`;
    } else {
      replyHi = `मैंने आपकी बुकिंग का विवरण तैयार कर लिया है: ${draft.matchedServiceName}, दिनांक: ${draft.scheduledDate} (${draft.scheduledTime}), पता: ${draft.householdOrAddress}। अनुमानित शुल्क ₹${draft.estimatedPrice} है। क्या आप इस बुकिंग की पुष्टि करना चाहते हैं?`;
      replyEn = `I have prepared your booking details: ${draft.matchedServiceName} for ${draft.scheduledDate} (${draft.scheduledTime}) at ${draft.householdOrAddress}. Estimated price is ₹${draft.estimatedPrice}. Would you like to confirm this booking?`;
    }

    return {
      isBookingIntent: true,
      isStatusIntent: false,
      draft,
      missingFields: missing,
      replyMessageHindi: replyHi,
      replyMessageEnglish: replyEn,
      readyForConfirmation,
    };
  }
}

export const kaamDostVoiceBookingEngine = new KaamDostVoiceBookingEngine();
