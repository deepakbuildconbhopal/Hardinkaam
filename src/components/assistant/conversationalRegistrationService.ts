import { AssistantLanguage, DynamicChatComponent, ActionItem } from './types';
import { generateSecureOtp } from '../../services/otpService';
import { normalizePhoneDigits } from '../../context/AuthContext';
import {
  TargetRegistrationRole,
  RoleSelectorOption,
  RoleSelectorCardComponent,
  MediaDocumentUploadCardComponent,
  MultiRoleRegistrationSummaryCardComponent,
  RegistrationSuccessCardComponent,
  TradeSkillSelectorComponent,
} from './componentTypes';

export type MultiRoleRegistrationStep =
  | 'idle'
  | 'select_role'
  | 'ask_name'
  | 'ask_business_name'
  | 'ask_contact_person'
  | 'ask_mobile'
  | 'verify_otp'
  | 'ask_email'
  | 'ask_trade_skill'
  | 'ask_experience'
  | 'ask_business_type'
  | 'ask_zone_fleet'
  | 'ask_franchise_district'
  | 'ask_marketing_channel'
  | 'ask_address'
  | 'ask_documents'
  | 'ask_payout_details'
  | 'review_summary'
  | 'completed';

export interface UploadedDocMeta {
  name: string;
  docType: string;
  source: 'camera' | 'gallery' | 'pdf' | 'document';
  url?: string;
  size?: string;
}

export interface RegistrationFlowState {
  step: MultiRoleRegistrationStep;
  targetRole?: TargetRegistrationRole;
  name?: string;
  businessName?: string;
  contactPerson?: string;
  mobile?: string;
  generatedOtp?: string;
  otpAttempts?: number;
  email?: string;
  tradeSkill?: string;
  experienceYears?: number;
  businessType?: string;
  assignedDistrict?: string;
  assignedZone?: string;
  fleetSize?: string;
  marketingChannel?: string;
  preferredPromoCode?: string;
  address?: string;
  area?: string;
  city?: string;
  district?: string;
  avatar?: string;
  payoutUpiId?: string;
  documents?: UploadedDocMeta[];
  isReadyToRegister?: boolean;
}

export interface StepProcessResult {
  text: string;
  nextState: RegistrationFlowState;
  dynamicComponent?: DynamicChatComponent;
  actions?: ActionItem[];
  suggestedChips?: string[];
  completeRegistrationNow?: boolean;
}

export const ROLE_SELECTOR_OPTIONS: RoleSelectorOption[] = [
  {
    role: 'customer',
    title: 'Customer (ग्राहक)',
    hindiTitle: 'ग्राहक रजिस्ट्रेशन',
    subtitle: 'घर बैठे विश्वसनीय कारीगर व सेवाएं बुक करें',
    badge: '🎁 ₹200 वेलकम बोनस',
    icon: 'Home',
    benefits: ['60 मिनट में डोरस्टेप सर्विस', '100% वेरिफाइड प्रोफेशनल्स', 'सुरक्षित ऑनलाइन / कैश भुगतान'],
    earningsHighlight: '₹200 वेलकम बोनस वॉलेट में प्राप्त करें',
    registrationFee: 0,
  },
  {
    role: 'service_man',
    title: 'Service Pro (कारीगर / टेक्नीशियन)',
    hindiTitle: 'सर्विसमैन / प्रो रजिस्ट्रेशन',
    subtitle: 'दैनिक बुकिंग्स और 100% सुरक्षित भुगतान',
    badge: '⚡ डायरेक्ट बुकिंग्स',
    icon: 'Wrench',
    benefits: ['दैनिक गारंटीड जॉब्स', 'तुरंत बैंक / UPI ट्रांसफर', 'मुफ्त टूलकिट सपोर्ट व ट्रेनिंग'],
    earningsHighlight: 'मासिक ₹25,000 से ₹65,000 तक कमाएं',
    registrationFee: 121,
  },
  {
    role: 'business_partner',
    title: 'Business Partner (बिजनेस पार्टनर)',
    hindiTitle: 'बिजनेस पार्टनर रजिस्ट्रेशन',
    subtitle: 'अपनी टीम या एजेंसी को HARDINKAAM से जोड़ें',
    badge: '💼 फ्लीट व एजेंसी',
    icon: 'Briefcase',
    benefits: ['बल्क बुकिंग्स व कॉन्ट्रैक्ट्स', 'मल्टीपल प्रोफेशनल्स मैनेजमेंट', 'डेडिकेटेड सपोर्ट मैनेजर'],
    earningsHighlight: 'मासिक ₹80,000+ बिजनेस रेवेन्यू',
    registrationFee: 1021,
  },
  {
    role: 'brand_promoter',
    title: 'Brand Promoter (ब्रांड प्रमोटर)',
    hindiTitle: 'ब्रांड प्रमोटर रजिस्ट्रेशन',
    subtitle: 'सोशल मीडिया व नेटवर्क से रेफर करके कमाएं',
    badge: '📢 अनलिमिटेड रेफरल कमीशन',
    icon: 'Megaphone',
    benefits: ['हर बुकिंग पर लाइफटाइम कमीशन', 'एक्सक्लूसिव प्रोमो कोड व डैशबोर्ड', 'वीकली डायरेक्ट पेआउट'],
    earningsHighlight: 'घर बैठे ₹15,000 से ₹40,000 मासिक इंसेंटिव',
    registrationFee: 0,
  },
  {
    role: 'franchise_admin',
    title: 'Franchise Partner (जिला फ्रेंचाइजी)',
    hindiTitle: 'डिस्ट्रिक्ट फ्रेंचाइजी पार्टनर',
    subtitle: 'पूरे जिले का मास्टर फ्रेंचाइजी राइट्स प्राप्त करें',
    badge: '🏛️ जिला ऑपरेशंस हेड',
    icon: 'Building2',
    benefits: ['जिले की प्रत्येक सर्विस पर 10-15% रेवेन्यू शेयर', 'ऑफिशियल फ्रेंचाइजी लाइसेंस', 'फुल ब्रांडिंग व टेक सपोर्ट'],
    earningsHighlight: 'मासिक ₹1.5 लाख से ₹5 लाख तक का पोटेंशियल',
    registrationFee: 2021,
  },
];

export const AVAILABLE_TRADES = [
  { id: 'electrician', label: 'Electrician (इलेक्ट्रीशियन)', hindiLabel: 'इलेक्ट्रीशियन', icon: 'Zap', category: 'Electrical' },
  { id: 'plumber', label: 'Plumber (नलसाज / प्लंबर)', hindiLabel: 'प्लंबर', icon: 'Wrench', category: 'Plumbing' },
  { id: 'ac_service', label: 'AC & Cooling Expert (AC टेक्नीशियन)', hindiLabel: 'AC टेक्नीशियन', icon: 'AirVent', category: 'HVAC' },
  { id: 'appliance_repair', label: 'Appliance Repair (होम अप्लायंस)', hindiLabel: 'अप्लायंस रिपेयर', icon: 'Tv', category: 'Appliances' },
  { id: 'carpenter', label: 'Carpenter (बढ़ई / कारपेंटर)', hindiLabel: 'कारपेंटर', icon: 'Hammer', category: 'Carpentry' },
  { id: 'painter', label: 'Painter (पेंटर / पुताई)', hindiLabel: 'पेंटर', icon: 'Paintbrush', category: 'Painting' },
  { id: 'cleaning_deep', label: 'Deep Cleaning (सफाई विशेषज्ञ)', hindiLabel: 'डीप क्लीनिंग', icon: 'Sparkles', category: 'Cleaning' },
  { id: 'mason_civil', label: 'Mason & Civil (राजमिस्त्री)', hindiLabel: 'राजमिस्त्री', icon: 'Layers', category: 'Construction' },
  { id: 'ro_purifier', label: 'RO & Water Purifier (RO सर्विस)', hindiLabel: 'RO सर्विस', icon: 'Droplets', category: 'Appliances' },
  { id: 'mechanic', label: 'Two/Four Wheeler Mechanic', hindiLabel: 'वाहन मैकेनिक', icon: 'Car', category: 'Automotive' },
];

export function detectRegistrationRoleIntent(query: string): TargetRegistrationRole | 'generic' | null {
  const q = query.toLowerCase().trim();

  // 1. ServiceMan / Technician
  if (
    q.includes('serviceman') ||
    q.includes('service man') ||
    q.includes('technician') ||
    q.includes('techician') ||
    q.includes('pro banna') ||
    q.includes('कारीगर') ||
    q.includes('मिस्त्री') ||
    q.includes('प्लंबर बनना') ||
    q.includes('इलेक्ट्रीशियन बनना') ||
    q.includes('काम चाहिए') ||
    q.includes('काम करना है') ||
    q.includes('job chahiye') ||
    q.includes('service pro') ||
    q.includes('kaam dost me judna')
  ) {
    return 'service_man';
  }

  // 2. Franchise
  if (
    q.includes('franchise') ||
    q.includes('फ्रेंचाइजी') ||
    q.includes('फ्रैंचाइज़ी') ||
    q.includes('district partner') ||
    q.includes('master franchise') ||
    q.includes('जिला पार्टनर')
  ) {
    return 'franchise_admin';
  }

  // 3. Business Partner
  if (
    q.includes('business partner') ||
    q.includes('partner banna') ||
    q.includes('पार्टनर') ||
    q.includes('agency') ||
    q.includes('fleet') ||
    q.includes('ठेकेदार') ||
    q.includes('contractor')
  ) {
    return 'business_partner';
  }

  // 4. Brand Promoter
  if (
    q.includes('brand promoter') ||
    q.includes('promoter') ||
    q.includes('प्रमोटर') ||
    q.includes('refer and earn') ||
    q.includes('referral') ||
    q.includes('earn with us') ||
    q.includes('मार्केटिंग') ||
    q.includes('campus ambassador')
  ) {
    return 'brand_promoter';
  }

  // 5. Customer
  if (
    q.includes('account banana') ||
    q.includes('account banaye') ||
    q.includes('खाता बनाना') ||
    q.includes('अकाउंट बनाना') ||
    q.includes('naya customer') ||
    q.includes('customer register') ||
    q.includes('ग्राहक रजिस्ट्रेशन') ||
    q.includes('dost mujhe account banana')
  ) {
    return 'customer';
  }

  // 6. Generic Registration
  if (
    q.includes('register') ||
    q.includes('registration') ||
    q.includes('रजिस्टर') ||
    q.includes('रजिस्ट्रेशन') ||
    q.includes('sign up') ||
    q.includes('signup') ||
    q.includes('join') ||
    q.includes('जुड़ना')
  ) {
    return 'generic';
  }

  return null;
}

export function isRegistrationIntent(query: string): boolean {
  return detectRegistrationRoleIntent(query) !== null;
}

export class ConversationalRegistrationEngine {
  /**
   * Starts a registration flow for a specific or generic role
   */
  public startFlow(
    roleHint?: TargetRegistrationRole,
    lang: AssistantLanguage = 'hi'
  ): StepProcessResult {
    // If no role or generic, show Role Selector Card
    if (!roleHint) {
      const roleCard: RoleSelectorCardComponent = {
        type: 'role_selector_card',
        title: 'HARDINKAAM मल्टी-रोल रजिस्ट्रेशन 🤝',
        description: 'कृपया चुनें कि आप HARDINKAAM से किस रूप में जुड़ना चाहते हैं:',
        roles: ROLE_SELECTOR_OPTIONS,
      };

      const text =
        lang === 'hi'
          ? '🤝 **HARDINKAAM में आपका स्वागत है!**\n\nआप हमारे साथ ग्राहक (Customer), सर्विसमैन (Service Pro), बिजनेस पार्टनर (Business Partner), ब्रांड प्रमोटर (Brand Promoter) या जिला फ्रेंचाइजी (Franchise) के रूप में जुड़ सकते हैं।\n\nकृपया नीचे से अपना पसंदीदा रोल चुनें:'
          : '🤝 **Welcome to HARDINKAAM!**\n\nPlease select your preferred role to register as a Customer, Service Pro, Business Partner, Brand Promoter, or District Franchise:';

      return {
        text,
        nextState: { step: 'select_role' },
        dynamicComponent: roleCard,
        suggestedChips: [
          '🛠️ सर्विसमैन बनना है',
          '🏛️ फ्रेंचाइजी लेना है',
          '💼 पार्टनर बनना है',
          '📢 प्रमोटर बनना है',
          '👤 ग्राहक रजिस्ट्रेशन',
        ],
      };
    }

    return this.initRoleFlow(roleHint, lang);
  }

  /**
   * Initializes state machine for a specific role
   */
  public initRoleFlow(role: TargetRegistrationRole, lang: AssistantLanguage = 'hi'): StepProcessResult {
    const state: RegistrationFlowState = {
      step: 'ask_name',
      targetRole: role,
      city: 'Bhopal',
      district: 'Bhopal',
      documents: [],
    };

    if (role === 'business_partner' || role === 'franchise_admin') {
      state.step = 'ask_business_name';
      const prompt =
        role === 'franchise_admin'
          ? '🏛️ **डिस्ट्रिक्ट फ्रेंचाइजी रजिस्ट्रेशन शुरू करते हैं!**\nकृपया अपनी कंपनी, फर्म या प्रस्तावित फ्रेंचाइजी का नाम बताएं:'
          : '💼 **बिजनेस पार्टनर ऑनबोर्डिंग शुरू करते हैं!**\nकृपया अपनी फर्म, एजेंसी या कंपनी का नाम बताएं:';

      const textComp: DynamicChatComponent = {
        type: 'text_input',
        title: role === 'franchise_admin' ? '🏛️ फ्रेंचाइजी / फर्म का नाम' : '💼 कंपनी / एजेंसी का नाम',
        placeholder: 'उदा. भोपाल सर्विसेज प्राइवेट लिमिटेड / मां शारदा एंटरप्राइजेज',
        buttonLabel: 'नाम कन्फर्म करें',
        submitLabel: 'नाम कन्फर्म करें',
      };

      return {
        text: prompt,
        nextState: state,
        dynamicComponent: textComp,
        suggestedChips: ['नाम दर्ज करें', 'रोल बदलें'],
      };
    }

    // Customer, ServiceMan, Brand Promoter
    const roleTitles: Record<TargetRegistrationRole, string> = {
      customer: 'ग्राहक (Customer)',
      service_man: 'सर्विसमैन / प्रो (Service Pro)',
      brand_promoter: 'ब्रांड प्रमोटर (Brand Promoter)',
      business_partner: 'बिजनेस पार्टनर',
      franchise_admin: 'फ्रेंचाइजी पार्टनर',
    };

    const text =
      lang === 'hi'
        ? `🤝 **${roleTitles[role]} रजिस्ट्रेशन!**\n\nकृपया अपना पूरा नाम (Full Name) बताएं:`
        : `🤝 **${roleTitles[role]} Registration!**\n\nPlease enter your full name:`;

    const nameComponent: DynamicChatComponent = {
      type: 'text_input',
      title: `अपना पूरा नाम दर्ज करें (${roleTitles[role]})`,
      placeholder: 'उदा. दीपक कुमार / राहुल शर्मा',
      buttonLabel: 'नाम कन्फर्म करें',
      submitLabel: 'नाम कन्फर्म करें',
    };

    return {
      text,
      nextState: state,
      dynamicComponent: nameComponent,
      suggestedChips: ['नाम दर्ज करें', 'रोल बदलें'],
    };
  }

  /**
   * Main step processor for conversational registration
   */
  public processStep(
    input: string,
    currentState: RegistrationFlowState,
    payload?: any,
    lang: AssistantLanguage = 'hi'
  ): StepProcessResult {
    const rawText = (input || '').trim();
    const lower = rawText.toLowerCase();
    const state: RegistrationFlowState = { ...currentState };
    const role = state.targetRole || 'customer';

    // 0. STEP: Role Selection
    if (state.step === 'select_role') {
      let selectedRole: TargetRegistrationRole = 'customer';
      if (payload && payload.role) {
        selectedRole = payload.role;
      } else {
        const detected = detectRegistrationRoleIntent(rawText);
        if (detected && detected !== 'generic') {
          selectedRole = detected;
        }
      }
      return this.initRoleFlow(selectedRole, lang);
    }

    // 1. STEP: Business Name (for Partner / Franchise)
    if (state.step === 'ask_business_name') {
      state.businessName = rawText.replace(/^(meri company|firm ka naam|company|firm|naam hai)\s+/i, '').trim() || 'HARDINKAAM Enterprise';
      state.step = 'ask_contact_person';

      const prompt =
        lang === 'hi'
          ? `🏢 फर्म: **${state.businessName}** नोट कर लिया गया!\n\nअब कृपया अधिकृत संपर्क व्यक्ति (Director / Authorized Contact Person) का नाम बताएं:`
          : `🏢 Firm: **${state.businessName}** noted!\n\nPlease provide authorized contact person name:`;

      const textComp: DynamicChatComponent = {
        type: 'text_input',
        title: 'अधिकृत व्यक्ति का नाम (Authorized Contact Person)',
        placeholder: 'उदा. दीपक विश्वकर्मा (Managing Director)',
        buttonLabel: 'नाम सुरक्षित करें',
        submitLabel: 'नाम सुरक्षित करें',
      };

      return {
        text: prompt,
        nextState: state,
        dynamicComponent: textComp,
      };
    }

    // 1B. STEP: Contact Person (for Partner / Franchise)
    if (state.step === 'ask_contact_person') {
      state.contactPerson = rawText.trim();
      state.name = state.contactPerson;
      state.step = 'ask_mobile';

      const prompt =
        lang === 'hi'
          ? `नमस्ते ${state.contactPerson} जी! 😊 कृपया अपना 10-अंकीय आधिकारिक मोबाइल नंबर दर्ज करें जिसपर वेरिफिकेशन OTP भेजा जा सके:`
          : `Hello ${state.contactPerson}! 😊 Please enter your 10-digit mobile number for OTP verification:`;

      const mobileComp: DynamicChatComponent = {
        type: 'text_input',
        title: '📱 आधिकारिक मोबाइल नंबर (10-Digit Mobile)',
        placeholder: 'उदा. 6267546945',
        buttonLabel: 'OTP भेजें',
        submitLabel: 'OTP भेजें',
      };

      return {
        text: prompt,
        nextState: state,
        dynamicComponent: mobileComp,
      };
    }

    // 1C. STEP: Process Personal Name (Customer / ServiceMan / Promoter)
    if (state.step === 'ask_name') {
      let extractedName = rawText
        .replace(/^(mera naam|my name is|naam|naam hai|i am|मैं हूँ)\s+/i, '')
        .trim();
      if (extractedName.length < 2) extractedName = rawText || 'User';
      state.name = extractedName;
      state.step = 'ask_mobile';

      const text =
        lang === 'hi'
          ? `नमस्ते ${extractedName} जी! 😊 कृपया अपना 10-अंकीय मोबाइल नंबर बताएं जिसपर हम वेरिफिकेशन OTP भेज सकें:`
          : `Hello ${extractedName}! 😊 Please enter your 10-digit mobile number for OTP verification:`;

      const mobileComponent: DynamicChatComponent = {
        type: 'text_input',
        title: '📱 मोबाइल नंबर दर्ज करें (10-Digit Mobile)',
        placeholder: 'उदा. 6267546945',
        buttonLabel: 'OTP भेजें',
        submitLabel: 'OTP भेजें',
      };

      return {
        text,
        nextState: state,
        dynamicComponent: mobileComponent,
        suggestedChips: ['10-अंकीय नंबर डालें', 'रजिस्ट्रेशन रद्द करें'],
      };
    }

    // 2. STEP: Mobile Number -> Generate OTP -> Transition to OTP Verification
    if (state.step === 'ask_mobile') {
      const digits = normalizePhoneDigits(rawText);
      if (!digits) {
        const errorText =
          lang === 'hi'
            ? '⚠️ अमान्य मोबाइल नंबर! कृपया सही 10-अंकीय भारतीय मोबाइल नंबर दर्ज करें (उदा. 6267546945):'
            : '⚠️ Invalid mobile number! Please enter a valid 10-digit Indian mobile number:';

        const retryComponent: DynamicChatComponent = {
          type: 'text_input',
          title: '📱 पुनः 10-अंकीय मोबाइल नंबर दर्ज करें',
          placeholder: 'उदा. 6267546945',
          buttonLabel: 'OTP भेजें',
          submitLabel: 'OTP भेजें',
        };

        return {
          text: errorText,
          nextState: state,
          dynamicComponent: retryComponent,
        };
      }

      state.mobile = digits;
      const generatedOtp = generateSecureOtp(4);
      state.generatedOtp = generatedOtp;
      state.otpAttempts = 0;
      state.step = 'verify_otp';

      const text =
        lang === 'hi'
          ? `📱 +91 ${digits} पर 4-अंकीय वेरिफिकेशन OTP भेजा गया है (सुरक्षा कोड: **${generatedOtp}**)।\nकृपया नीचे OTP दर्ज करके सत्यापित करें:`
          : `📱 4-digit verification OTP sent to +91 ${digits} (Security Code: **${generatedOtp}**).\nPlease enter the OTP below to verify:`;

      const otpComponent: DynamicChatComponent = {
        type: 'otp_input',
        title: 'OTP सत्यापन (Verify Mobile Number)',
        length: 4,
        phoneNumber: `+91 ${digits}`,
        resendIntervalSeconds: 30,
      };

      return {
        text,
        nextState: state,
        dynamicComponent: otpComponent,
        suggestedChips: [generatedOtp, 'OTP दोबारा भेजें', 'नंबर बदलें'],
      };
    }

    // 3. STEP: OTP Verification
    if (state.step === 'verify_otp') {
      let enteredOtp = '';
      if (payload && payload.otp) {
        enteredOtp = String(payload.otp).trim();
      } else {
        const match = rawText.match(/\b\d{4}\b/);
        enteredOtp = match ? match[0] : rawText.replace(/\D/g, '').slice(0, 4);
      }

      // Resend OTP requested
      if (lower.includes('resend') || lower.includes('दोबारा') || lower.includes('फिर से')) {
        const newCode = generateSecureOtp(4);
        state.generatedOtp = newCode;
        return {
          text:
            lang === 'hi'
              ? `🔄 नया OTP भेजा गया है (सुरक्षा कोड: **${newCode}**)। कृपया दर्ज करें:`
              : `🔄 New OTP sent (Security Code: **${newCode}**). Please enter:`,
          nextState: state,
          dynamicComponent: {
            type: 'otp_input',
            title: 'नया OTP दर्ज करें',
            length: 4,
            phoneNumber: `+91 ${state.mobile}`,
            resendIntervalSeconds: 30,
          },
          suggestedChips: [newCode],
        };
      }

      if (enteredOtp !== state.generatedOtp) {
        state.otpAttempts = (state.otpAttempts || 0) + 1;
        const errText =
          lang === 'hi'
            ? `❌ गलत OTP कोड! कृपया सही 4-अंकीय OTP दर्ज करें (सुरक्षा कोड: **${state.generatedOtp}**):`
            : `❌ Invalid OTP! Please enter the correct 4-digit code (Code: **${state.generatedOtp}**):`;

        return {
          text: errText,
          nextState: state,
          dynamicComponent: {
            type: 'otp_input',
            title: 'सही OTP दर्ज करें',
            length: 4,
            phoneNumber: `+91 ${state.mobile}`,
          },
          suggestedChips: [state.generatedOtp || '1234', 'OTP दोबारा भेजें'],
        };
      }

      // OTP Verified successfully! Route to role-specific next step
      state.step = 'ask_email';

      const emailText =
        lang === 'hi'
          ? `✅ मोबाइल नंबर (+91 ${state.mobile}) सत्यापित हो गया!\n\nकृपया अपना आधिकारिक ईमेल पता दर्ज करें (या 'छोड़ें' कहें):`
          : `✅ Mobile number (+91 ${state.mobile}) verified successfully!\n\nPlease enter your email address (or skip):`;

      const emailComponent: DynamicChatComponent = {
        type: 'text_input',
        title: 'ईमेल पता (Email Address)',
        placeholder: 'उदा. contact@example.com (वैकल्पिक)',
        buttonLabel: 'ईमेल सुरक्षित करें',
        submitLabel: 'ईमेल सुरक्षित करें',
      };

      return {
        text: emailText,
        nextState: state,
        dynamicComponent: emailComponent,
        suggestedChips: ['ईमेल छोड़ें (Skip Email)', 'बाद में जोड़ेंगे'],
      };
    }

    // 4. STEP: Process Email -> Route to Role Specific Attributes
    if (state.step === 'ask_email') {
      const isSkip =
        lower.includes('skip') ||
        lower.includes('छोड़ें') ||
        lower.includes('नहीं') ||
        lower.includes('no') ||
        lower.includes('बाद में');

      if (!isSkip) {
        const emailMatch = rawText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/);
        if (emailMatch) {
          state.email = emailMatch[0];
        }
      }

      // Role specific next step:
      if (role === 'service_man') {
        state.step = 'ask_trade_skill';
        const tradeComp: TradeSkillSelectorComponent = {
          type: 'trade_skill_selector',
          title: '🛠️ अपना मुख्य हुनर / ट्रेड चुनें (Select Primary Skill)',
          description: 'आप किस क्षेत्र में अपनी सेवाएं प्रदान करते हैं?',
          availableTrades: AVAILABLE_TRADES,
        };

        return {
          text: '🛠️ **आपका मुख्य हुनर / कौशल (Primary Trade):**\nकृपया नीचे दी गई सूची में से अपनी मुख्य विशेषज्ञता चुनें:',
          nextState: state,
          dynamicComponent: tradeComp,
          suggestedChips: ['⚡ इलेक्ट्रीशियन', '🔧 प्लंबर', '❄️ AC टेक्नीशियन', '🔨 कारपेंटर', '🎨 पेंटर'],
        };
      }

      if (role === 'business_partner') {
        state.step = 'ask_business_type';
        const optionsComp: DynamicChatComponent = {
          type: 'options',
          title: '💼 बिजनेस मॉडल व पार्टनरशिप प्रकार चुनें',
          options: [
            { id: 'fleet', label: '🛠️ फ्लीट ऑपरेटर (5-20 टेक्नीशियन टीम)', description: 'अपनी पूरी टीम को ऑनबोर्ड करें' },
            { id: 'agency', label: '🏢 मल्टी-ट्रेड सर्विस एजेंसी', description: 'विभिन्न सर्विसेज की डीलरशिप' },
            { id: 'contractor', label: '🏗️ सिविल व मेंटेनेंस ठेकेदार', description: 'रेजिडेंशियल व कमर्शियल कॉन्ट्रैक्ट्स' },
            { id: 'franchise_partner', label: '🏛️ एरिया फ्रैंचाइज़ी पार्टनर', description: 'जोनल ऑपरेशंस मैनेजमेंट' },
          ],
        };

        return {
          text: '💼 **बिजनेस पार्टनरशिप मॉडल:**\nकृपया अपनी कंपनी का बिजनेस मॉडल चुनें:',
          nextState: state,
          dynamicComponent: optionsComp,
          suggestedChips: ['🛠️ फ्लीट ऑपरेटर', '🏢 मल्टी-ट्रेड एजेंसी', '🏗️ मेंटेनेंस ठेकेदार'],
        };
      }

      if (role === 'franchise_admin') {
        state.step = 'ask_franchise_district';
        const districtComp: DynamicChatComponent = {
          type: 'options',
          title: '🏛️ जिला फ्रेंचाइजी टेरिटरी चुनें (Select District)',
          options: [
            { id: 'bhopal', label: '📍 भोपाल जिला (Bhopal District Master)', description: 'राजधानी व आसपास के सभी सेक्टर्स' },
            { id: 'indore', label: '📍 इंदौर जिला (Indore District Hub)', description: 'कमर्शियल व इंडस्ट्रियल क्लस्टर' },
            { id: 'gwalior', label: '📍 ग्वालियर जिला (Gwalior Division)', description: 'उत्तर मध्य प्रदेश रीजन' },
            { id: 'jabalpur', label: '📍 जबलपुर जिला (Jabalpur Hub)', description: 'महाकौशल क्षेत्र ऑपरेशंस' },
            { id: 'ujjain', label: '📍 उज्जैन जिला (Ujjain Religious City)', description: 'धार्मिक व तीर्थ नगरी' },
            { id: 'other_dist', label: '📍 अन्य मध्य प्रदेश जिला', description: 'सागर, रीवा, सतना, रतलाम, आदि' },
          ],
        };

        return {
          text: '🏛️ **फ्रेंचाइजी जिला / टेरिटरी:**\nकृपया वह जिला चुनें जहाँ आप HARDINKAAM मास्टर फ्रेंचाइजी स्थापित करना चाहते हैं:',
          nextState: state,
          dynamicComponent: districtComp,
          suggestedChips: ['भोपाल जिला', 'इंदौर जिला', 'ग्वालियर जिला', 'जबलपुर जिला'],
        };
      }

      if (role === 'brand_promoter') {
        state.step = 'ask_marketing_channel';
        const channelComp: DynamicChatComponent = {
          type: 'options',
          title: '📢 मुख्य प्रमोशन माध्यम (Primary Promotion Channel)',
          options: [
            { id: 'instagram_social', label: '📱 इंस्टाग्राम व सोशल मीडिया इन्फ्लुएंसर', description: 'रील्स, स्टोरी और ऑनलाइन कम्युनिटी' },
            { id: 'campus_student', label: '🎓 कॉलेज कैंपस एंबेसडर / यूथ नेटवर्क', description: 'यूनिवर्सिटी और हॉस्टल नेटवर्क' },
            { id: 'whatsapp_community', label: '💬 व्हाट्सएप व टेलीग्राम ग्रुप्स', description: 'रेजिडेंट्स व लोकल कम्युनिटी ग्रुप्स' },
            { id: 'local_offline', label: '🏪 लोकल मार्केट व डायरेक्ट नेटवर्क', description: 'मार्केट व सोसायटी आउटरीच' },
          ],
        };

        return {
          text: '📢 **प्रमोशन व मार्केटिंग चैनल:**\nआप HARDINKAAM सर्विसेज को मुख्य रूप से किस माध्यम से प्रमोट करेंगे?',
          nextState: state,
          dynamicComponent: channelComp,
          suggestedChips: ['📱 इंस्टाग्राम इन्फ्लुएंसर', '🎓 कॉलेज कैंपस', '💬 व्हाट्सएप कम्युनिटी'],
        };
      }

      // Customer goes to Address
      state.step = 'ask_address';
      const addressComponent: DynamicChatComponent = {
        type: 'address_form',
        title: '📍 सेवा का पता दर्ज करें (Enter Doorstep Address)',
        defaultLocality: 'MP Nagar',
        localities: [
          'MP Nagar',
          'Arera Colony',
          'Kolar Road',
          'Indrapuri / BHEL',
          'Hoshangabad Road',
          'Ayodhya Bypass',
          'New Market',
          'Karond',
          'Shahpura',
          'TT Nagar',
          'Chunabhatti',
        ],
        submitLabel: 'यह पता सुरक्षित करें',
      };

      return {
        text: '📍 **सेवा की डोरस्टेप डिलीवरी हेतु पता:**\nकृपया अपना पता व क्षेत्र (Locality) चुनें:',
        nextState: state,
        dynamicComponent: addressComponent,
        suggestedChips: ['MP Nagar Zone 1', 'Arera Colony E-Sector', 'Kolar Road'],
      };
    }

    // 5A. STEP: Trade Skill (ServiceMan) -> Experience
    if (state.step === 'ask_trade_skill') {
      const selectedSkill = payload?.trade || payload?.tradeSkill || rawText;
      state.tradeSkill = selectedSkill;
      state.step = 'ask_experience';

      const expComp: DynamicChatComponent = {
        type: 'options',
        title: '⏳ आपका कार्य अनुभव (Years of Experience)',
        options: [
          { id: 'exp_1', label: '🌱 1 से 2 वर्ष (Junior Pro)', description: 'बेसिक इंस्टॉलेशन व रिपेयर का अनुभव' },
          { id: 'exp_3', label: '⚡ 3 से 5 वर्ष (Experienced Pro)', description: 'सभी प्रकार के फॉल्ट डायग्नोसिस व रिपेयर' },
          { id: 'exp_5', label: '🏆 5 से 10 वर्ष (Senior Master)', description: 'एडवांस्ड व इंडस्ट्रियल कार्य में निपुण' },
          { id: 'exp_10', label: '👑 10+ वर्ष (Veteran Expert)', description: 'मास्टर टेक्नीशियन व टीम लीडर' },
        ],
      };

      return {
        text: `🛠️ ट्रेड: **${selectedSkill}**!\n\nआपका इस फील्ड में कितने वर्षों का अनुभव है?`,
        nextState: state,
        dynamicComponent: expComp,
        suggestedChips: ['3 से 5 वर्ष', '5 से 10 वर्ष', '10+ वर्ष', '1 से 2 वर्ष'],
      };
    }

    // 5B. STEP: Experience (ServiceMan) -> Address & Area
    if (state.step === 'ask_experience') {
      const expNum = parseInt(rawText.replace(/\D/g, ''), 10) || 3;
      state.experienceYears = expNum;
      state.step = 'ask_address';

      const addressComp: DynamicChatComponent = {
        type: 'address_form',
        title: '📍 आपका कार्य क्षेत्र व पता (Service Area / Base Address)',
        defaultLocality: 'Bhopal Central',
        localities: ['Bhopal Central', 'MP Nagar', 'Kolar Road', 'Indrapuri', 'Karond', 'Bairagarh', 'Hoshangabad Road'],
        submitLabel: 'कार्य क्षेत्र सुरक्षित करें',
      };

      return {
        text: `👍 अनुभव: **${expNum} वर्ष** नोट कर लिया गया!\n\nअब कृपया अपना कार्य क्षेत्र या बेस पता बताएं जहाँ आप सर्विस देना चाहते हैं:`,
        nextState: state,
        dynamicComponent: addressComp,
      };
    }

    // 5C. STEP: Business Type (Partner) -> Zone & Fleet Size
    if (state.step === 'ask_business_type') {
      state.businessType = payload?.label || rawText;
      state.step = 'ask_zone_fleet';

      const fleetComp: DynamicChatComponent = {
        type: 'options',
        title: '👥 फ्लीट साइज व कवरेज जोन (Fleet Size & Zone)',
        options: [
          { id: 'fleet_small', label: '3 से 5 टेक्नीशियन (Small Fleet)', description: 'स्थानीय वार्ड स्तर पर कवरेज' },
          { id: 'fleet_medium', label: '5 से 15 टेक्नीशियन (Standard Fleet)', description: 'संपूर्ण भोपाल सिटी कवरेज' },
          { id: 'fleet_large', label: '15 से 50+ टेक्नीशियन (Large Fleet)', description: 'भोपाल संभाग व संभाग स्तरीय कार्य' },
        ],
      };

      return {
        text: `💼 मॉडल: **${state.businessType}**!\n\nआपकी वर्तमान टीम में कितने प्रोफेशनल्स / टेक्नीशियन हैं?`,
        nextState: state,
        dynamicComponent: fleetComp,
        suggestedChips: ['5 से 15 टेक्नीशियन', '3 से 5 टेक्नीशियन', '15 से 50+ टेक्नीशियन'],
      };
    }

    // 5D. STEP: Zone & Fleet (Partner) -> Address
    if (state.step === 'ask_zone_fleet') {
      state.fleetSize = payload?.label || rawText;
      state.assignedZone = 'Bhopal Central & Suburbs';
      state.step = 'ask_address';

      const addrComp: DynamicChatComponent = {
        type: 'address_form',
        title: '📍 फर्म का ऑफिस पता (Registered Office Address)',
        defaultLocality: 'MP Nagar Zone 1',
        localities: ['MP Nagar Zone 1', 'MP Nagar Zone 2', 'Arera Hills', 'Indrapuri', 'Govindpura Industrial Area'],
        submitLabel: 'ऑफिस पता सुरक्षित करें',
      };

      return {
        text: `👥 फ्लीट साइज: **${state.fleetSize}**!\n\nकृपया अपनी फर्म का ऑफिस पता दर्ज करें:`,
        nextState: state,
        dynamicComponent: addrComp,
      };
    }

    // 5E. STEP: Franchise District -> Address
    if (state.step === 'ask_franchise_district') {
      state.assignedDistrict = payload?.label || rawText;
      state.step = 'ask_address';

      const addrComp: DynamicChatComponent = {
        type: 'address_form',
        title: '📍 प्रस्तावित फ्रेंचाइजी ऑफिस पता (Proposed Franchise Office)',
        defaultLocality: 'Bhopal Commercial District',
        localities: ['MP Nagar Zone 1', 'Arera Colony', 'Hoshangabad Road', 'Malviya Nagar', 'New Market'],
        submitLabel: 'पता सुरक्षित करें',
      };

      return {
        text: `🏛️ टेरिटरी: **${state.assignedDistrict}** चयनित!\n\nकृपया फ्रेंचाइजी ऑफिस / हेडक्वार्टर का पता दर्ज करें:`,
        nextState: state,
        dynamicComponent: addrComp,
      };
    }

    // 5F. STEP: Marketing Channel (Brand Promoter) -> Address
    if (state.step === 'ask_marketing_channel') {
      state.marketingChannel = payload?.label || rawText;
      state.preferredPromoCode = `HDK-${state.name ? state.name.slice(0, 4).toUpperCase() : 'PROMO'}-${Math.floor(100 + Math.random() * 900)}`;
      state.step = 'ask_address';

      const addrComp: DynamicChatComponent = {
        type: 'address_form',
        title: '📍 आपका शहर व पता (Your Base Location)',
        defaultLocality: 'Bhopal',
        localities: ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur', 'Ujjain'],
        submitLabel: 'पता सुरक्षित करें',
      };

      return {
        text: `📢 माध्यम: **${state.marketingChannel}**!\nआपके लिए कस्टम प्रोमो कोड जनरेट किया जाएगा: **${state.preferredPromoCode}**\n\nकृपया अपना शहर व पता बताएं:`,
        nextState: state,
        dynamicComponent: addrComp,
      };
    }

    // 6. STEP: Process Address -> Multi-Source Document Upload (Camera, Gallery, PDF, Document)
    if (state.step === 'ask_address') {
      if (payload && payload.fullAddress) {
        state.address = payload.fullAddress;
        state.area = payload.locality || 'Bhopal';
        state.city = payload.city || 'Bhopal';
      } else {
        state.address = rawText;
        state.area = 'Bhopal';
        state.city = 'Bhopal';
      }

      state.step = 'ask_documents';

      // Custom document requirements based on role
      const docTypesByRole: Record<TargetRegistrationRole, string[]> = {
        customer: ['पहचान पत्र (ID Proof - Optional)', 'प्रोफाइल फोटो (Profile Photo)'],
        service_man: [
          'आधार कार्ड (Aadhaar Card - अनिवार्य)',
          'ड्राइविंग लाइसेंस (Driving License)',
          'ट्रेड प्रमाण पत्र (ITI / Trade Certificate)',
          'पैन कार्ड (PAN Card)',
        ],
        business_partner: [
          'गुमाश्ता / ट्रेड लाइसेंस (Trade License)',
          'GST रजिस्ट्रेशन प्रमाण पत्र (GSTIN)',
          'फर्म पैन कार्ड (Firm PAN Card)',
          'डायरेक्टर पहचान पत्र (Director ID Proof)',
        ],
        brand_promoter: [
          'आधार कार्ड (Aadhaar Card)',
          'कॉलेज / स्टूडेंट ID (College ID)',
          'पैन कार्ड (PAN Card - For Payouts)',
        ],
        franchise_admin: [
          'कंपनी / फर्म रजिस्ट्रेशन प्रमाण पत्र (Certificate of Incorporation)',
          'GSTIN प्रमाण पत्र',
          'डायरेक्टर आधार व पैन कार्ड',
          'प्रॉपर्टी / ऑफिस रेंट एग्रीमेंट',
        ],
      };

      const docUploadCard: MediaDocumentUploadCardComponent = {
        type: 'media_document_upload_card',
        title:
          role === 'customer'
            ? '📸 प्रोफाइल फोटो व ID (वैकल्पिक / Optional)'
            : '📄 KYC दस्तावेज व सत्यापन (Camera / Gallery / PDF)',
        description:
          role === 'customer'
            ? 'कैमरे से लाइव फोटो लें या गैलरी से अपलोड करें (वैकल्पिक)'
            : 'कैमरे से लाइव फोटो लें, गैलरी से चुनें, या PDF / डॉक्युमेंट फाइल अटैच करें:',
        targetRole: role,
        allowedDocTypes: docTypesByRole[role],
        allowCamera: true,
        allowGallery: true,
        allowPdf: true,
        allowAllDocs: true,
        maxFiles: role === 'customer' ? 1 : 4,
        isOptional: role === 'customer',
        uploadedFiles: state.documents || [],
        submitLabel: role === 'customer' ? 'आगे बढ़ें (Continue)' : 'दस्तावेज सुरक्षित करें (Save Documents)',
        skipLabel: role === 'customer' ? 'दस्तावेज छोड़ें (Skip)' : 'बाद में KYC पूरा करें',
      };

      return {
        text:
          role === 'customer'
            ? '📸 **प्रोफाइल फोटो (वैकल्पिक):**\nआप कैमरे से फोटो ले सकते हैं या गैलरी से चुन सकते हैं:'
            : `📄 **${ROLE_SELECTOR_OPTIONS.find((r) => r.role === role)?.title || 'KYC'} दस्तावेज सत्यापन:**\nसत्यापन हेतु कृपया अपना दस्तावेज अपलोड करें (Camera, Gallery, PDF या Document समर्थित):`,
        nextState: state,
        dynamicComponent: docUploadCard,
        suggestedChips: ['📷 लाइव कैमरा खोलें', '📄 PDF फाइल चुनें', '🖼️ गैलरी से लें', 'बाद में अपलोड करेंगे'],
      };
    }

    // 7. STEP: Process Documents -> Payout or Summary Review
    if (state.step === 'ask_documents') {
      const isSkip =
        lower.includes('skip') ||
        lower.includes('छोड़ें') ||
        lower.includes('बाद में') ||
        lower.includes('later');

      if (payload && payload.documents && Array.isArray(payload.documents)) {
        state.documents = payload.documents;
      } else if (payload && payload.fileName) {
        state.documents = [
          ...(state.documents || []),
          {
            name: payload.fileName,
            docType: payload.docType || 'KYC Document',
            source: payload.source || 'document',
          },
        ];
      }

      if (payload && payload.avatar) {
        state.avatar = payload.avatar;
      }

      // For ServiceMan, Promoter, Partner, ask UPI / Bank for Payouts
      if (role !== 'customer') {
        state.step = 'ask_payout_details';

        const upiComp: DynamicChatComponent = {
          type: 'text_input',
          title: '💳 भुगतान व इंसेंटिव पेआउट UPI ID / बैंक खाता',
          placeholder: 'उदा. 6267546945@upi / deepak@okhdfcbank',
          buttonLabel: 'पेआउट ID सुरक्षित करें',
          submitLabel: 'पेआउट ID सुरक्षित करें',
        };

        return {
          text: '💳 **दैनिक कमाई व इंसेंटिव पेआउट विवरण:**\nअपनी दैनिक कमाई सीधे प्राप्त करने के लिए कृपया अपनी UPI ID या बैंक विवरण दर्ज करें (या बाद में प्रोफाइल में जोड़ें):',
          nextState: state,
          dynamicComponent: upiComp,
          suggestedChips: [`${state.mobile}@upi`, 'बाद में जोड़ेंगे'],
        };
      }

      // Customer goes directly to Review Summary
      return this.renderReviewSummary(state, lang);
    }

    // 8. STEP: Process Payout Details -> Review Summary
    if (state.step === 'ask_payout_details') {
      const isSkip =
        lower.includes('skip') ||
        lower.includes('छोड़ें') ||
        lower.includes('बाद में');

      if (!isSkip) {
        state.payoutUpiId = rawText.trim();
      }

      return this.renderReviewSummary(state, lang);
    }

    // 9. STEP: Review Summary -> Final Submission
    if (state.step === 'review_summary') {
      const isConfirm =
        lower.includes('confirm') ||
        lower.includes('कन्फर्म') ||
        lower.includes('हाँ') ||
        lower.includes('register') ||
        lower.includes('जमा करें') ||
        payload?.action === 'confirm_registration';

      if (isConfirm) {
        state.step = 'completed';
        state.isReadyToRegister = true;

        const roleMeta = ROLE_SELECTOR_OPTIONS.find((r) => r.role === role);
        const prefixByRole: Record<TargetRegistrationRole, string> = {
          customer: 'HDK-CUST',
          service_man: 'HDK-PRO',
          business_partner: 'HDK-BP',
          brand_promoter: 'HDK-PROMO',
          franchise_admin: 'HDK-FR',
        };

        const generatedMemberCode = `${prefixByRole[role]}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

        const successCard: RegistrationSuccessCardComponent = {
          type: 'registration_success_card',
          role,
          roleDisplayName: roleMeta?.hindiTitle || 'HARDINKAAM पार्टनर',
          userId: 'usr_' + Date.now(),
          memberCode: generatedMemberCode,
          fullName: state.name || state.contactPerson || 'User',
          phone: `+91 ${state.mobile}`,
          status: role === 'customer' ? 'active' : 'verified',
          walletBonusCredited: role === 'customer' ? 200 : undefined,
          assignedTerritory: state.assignedDistrict || state.assignedZone || state.city,
          licenseNumber: role === 'business_partner' || role === 'franchise_admin' ? generatedMemberCode : undefined,
          nextSteps:
            role === 'customer'
              ? [
                  '🎁 ₹200 वेलकम बोनस आपके वॉलेट में जमा हो गया है।',
                  '⚡ अब आप तुरंत 60-मिनट डोरस्टेप सर्विस बुक कर सकते हैं।',
                  '🔒 100% वेरिफाइड टेक्नीशियन गारंटी।',
                ]
              : role === 'service_man'
              ? [
                  '🛠️ आपकी प्रोफाइल 100% सत्यापित हो चुकी है।',
                  '📱 दैनिक कस्टमर लीड्स व नोटिफिकेशन चालू कर दिए गए हैं।',
                  '💰 रोजाना कार्य पूरा होने पर तुरंत वॉलेट व बैंक पेआउट।',
                ]
              : role === 'business_partner'
              ? [
                  '💼 आधिकारिक बिजनेस पार्टनर लाइसेंस कोड जारी किया गया।',
                  '👥 फ्लीट डैशबोर्ड से टेक्नीशियन जोड़ें व जॉब्स मॉनिटर करें।',
                  '📊 मासिक बिजनेस बिलिंग व बल्क पेमेंट्स सपोर्ट।',
                ]
              : role === 'brand_promoter'
              ? [
                  `📢 आपका एक्सक्लूसिव प्रोमो कोड: ${state.preferredPromoCode || generatedMemberCode}`,
                  '🔗 अपने दोस्तों व सोशल मीडिया पर शेयर करके हर बुकिंग पर कमीशन पाएं।',
                  '👛 साप्ताहिक डायरेक्ट UPI पेआउट।',
                ]
              : [
                  `🏛️ जिला फ्रेंचाइजी कोड: ${generatedMemberCode}`,
                  '📈 जिले की सभी बुकिंग्स व रेवेन्यू शेयर डैशबोर्ड पर एक्टिव।',
                  '🤝 हार्डिनकाम हेडक्वार्टर से ऑनबोर्डिंग कॉल व किट डिस्पैच।',
                ],
        };

        const successText =
          lang === 'hi'
            ? `🎉 **रजिस्ट्रेशन सफलतापूर्वक पूरा हुआ!**\n\n• **रोल:** ${roleMeta?.hindiTitle}\n• **सदस्यता / लाइसेंस कोड:** \`${generatedMemberCode}\`\n• **सत्यापित मोबाइल:** +91 ${state.mobile}\n\nHARDINKAAM परिवार में आपका हार्दिक स्वागत है! 🤝`
            : `🎉 **Registration Completed Successfully!**\n\n• **Role:** ${roleMeta?.title}\n• **Member / License Code:** \`${generatedMemberCode}\`\n• **Verified Mobile:** +91 ${state.mobile}\n\nWelcome to HARDINKAAM! 🤝`;

        return {
          text: successText,
          nextState: state,
          dynamicComponent: successCard,
          actions: [
            {
              label: role === 'customer' ? '🔧 सर्विस बुक करें' : '📊 डैशबोर्ड खोलें',
              actionType: 'navigate_tab',
              payload:
                role === 'customer'
                  ? 'home'
                  : role === 'service_man'
                  ? 'pro_dashboard'
                  : role === 'business_partner'
                  ? 'partner_dashboard'
                  : role === 'franchise_admin'
                  ? 'franchise'
                  : 'wallet',
            },
            {
              label: '👛 मेरा वॉलेट देखें',
              actionType: 'navigate_tab',
              payload: role === 'service_man' ? 'pro_wallet' : 'wallet',
            },
          ],
          suggestedChips: [
            role === 'customer' ? '⚡ इलेक्ट्रीशियन बुक करें' : '📊 मेरा डैशबोर्ड',
            '👛 वॉलेट बैलेंस',
            '📞 सपोर्ट हेल्पलाइन',
          ],
          completeRegistrationNow: true,
        };
      }
    }

    // Default fallback
    return {
      text: 'कृपया बताएं कि आप आगे क्या करना चाहते हैं?',
      nextState: state,
    };
  }

  /**
   * Helper to build and return pre-submission summary review card
   */
  private renderReviewSummary(state: RegistrationFlowState, lang: AssistantLanguage = 'hi'): StepProcessResult {
    state.step = 'review_summary';
    const role = state.targetRole || 'customer';
    const roleMeta = ROLE_SELECTOR_OPTIONS.find((r) => r.role === role);

    const summaryCard: MultiRoleRegistrationSummaryCardComponent = {
      type: 'multi_role_registration_summary_card',
      role,
      roleDisplayName: roleMeta?.hindiTitle || 'HARDINKAAM Registration',
      fullName: state.name || state.contactPerson || 'User',
      businessName: state.businessName,
      contactPerson: state.contactPerson,
      phone: `+91 ${state.mobile}`,
      email: state.email,
      tradeSkill: state.tradeSkill,
      experienceYears: state.experienceYears,
      businessType: state.businessType,
      assignedDistrict: state.assignedDistrict,
      assignedZone: state.assignedZone,
      fleetSize: state.fleetSize,
      marketingChannel: state.marketingChannel,
      preferredPromoCode: state.preferredPromoCode,
      address: state.address,
      city: state.city,
      payoutUpiId: state.payoutUpiId,
      documents: state.documents,
      avatarUrl: state.avatar,
      feeAmount: roleMeta?.registrationFee,
      walletBonus: role === 'customer' ? 200 : undefined,
    };

    const text =
      lang === 'hi'
        ? `📋 **रजिस्ट्रेशन विवरण समीक्षा (Review & Confirm):**\n\nकृपया अंतिम रूप से सबमिट करने से पहले अपने विवरण की जांच कर लें:`
        : `📋 **Registration Summary Review:**\n\nPlease review your details before final confirmation:`;

    return {
      text,
      nextState: state,
      dynamicComponent: summaryCard,
      suggestedChips: ['✅ सबमिट व रजिस्टर करें (Confirm)', 'रोल बदलें', 'रजिस्ट्रेशन रद्द करें'],
    };
  }
}

export const conversationalRegistration = new ConversationalRegistrationEngine();
