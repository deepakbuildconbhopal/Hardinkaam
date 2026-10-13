import { db } from '../../firebase/config';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { AssistantLanguage, QuickActionChip } from './types';
import { KaamDostActionType } from './actionRouter';

export interface ActionPermissionSetting {
  enabled: boolean;
  requiresConfirmation: boolean;
  allowedRoles: string[];
  description: string;
}

export interface KaamDostAdminConfig {
  // 1. General & Identity Controls
  isAiEnabled: boolean;
  assistantName: string;
  defaultLanguage: AssistantLanguage;
  maintenanceMessage: {
    hi: string;
    en: string;
    hinglish: string;
  };

  // 2. Welcome & Prompts
  welcomeMessage: {
    hi: string;
    en: string;
    hinglish: string;
  };
  suggestedPrompts: Array<{
    id: string;
    label: string;
    query: string;
    icon?: string;
  }>;
  quickActionChips: Record<AssistantLanguage, QuickActionChip[]>;

  // 3. Voice Controls
  isVoiceEnabled: boolean;
  isTtsEnabled: boolean;
  defaultTtsSpeed: number;

  // 4. File Upload & Multimedia Controls
  isFileUploadEnabled: boolean;
  maxAttachmentSizeBytes: number; // in bytes (e.g., 10 * 1024 * 1024 = 10MB)
  allowedFileTypes: string[]; // e.g., ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'application/pdf']
  allowedExtensions: string[]; // e.g., ['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.mov', '.pdf', '.doc', '.docx']

  // 5. Question Flows Configuration
  serviceSpecificQuestions: Record<
    string,
    {
      category: string;
      diagnosisQuestion: string;
      suggestedOptions: string[];
    }
  >;
  registrationQuestions: {
    customer: string[];
    service_man: string[];
    business_partner: string[];
    franchise_admin: string[];
  };
  bookingQuestions: {
    serviceTypePrompt: string;
    locationPrompt: string;
    datePrompt: string;
    timePrompt: string;
    contactPrompt: string;
  };
  supportQuestions: {
    issueCategoryPrompt: string;
    descriptionPrompt: string;
    priorityPrompt: string;
  };

  // 6. Action Permissions Matrix
  actionPermissions: Record<KaamDostActionType, ActionPermissionSetting>;

  // Metadata
  lastUpdated: string;
  updatedBy: string;
  version: number;
}

export const DEFAULT_KAAMDOST_CONFIG: KaamDostAdminConfig = {
  isAiEnabled: true,
  assistantName: 'KaamDost',
  defaultLanguage: 'hi',
  maintenanceMessage: {
    hi: '🛠️ **KaamDost AI मेंटेनेंस मोड में है:** हम सिस्टम को अपग्रेड कर रहे हैं। कृपया आपातकालीन सहायता के लिए हमारे हेल्पलाइन नंबर **+91 62675 46945** पर कॉल करें।',
    en: '🛠️ **KaamDost AI is undergoing scheduled maintenance:** For immediate assistance, please call our 24x7 helpline at **+91 62675 46945**.',
    hinglish: '🛠️ **KaamDost AI maintenance mode mein hai:** Urgent help ke liye helpline **+91 62675 46945** par call karein.',
  },
  welcomeMessage: {
    hi: 'नमस्ते! 🙏 मैं हूँ कामदोस्त — हार्डिनकाम का डिजिटल साथी।\n\nआपको घर पर जो भी काम कराना है (बिजली, नल, एसी, सफाई), बस मुझे बताएं!',
    en: 'Hello! 👋 I am KaamDost — your personal digital assistant for HARDINKAAM.\n\nTell me what home service you need (Electrician, Plumber, AC, Cleaning), and I will get it done smoothly!',
    hinglish: 'Namaste! 👋 Main hoon KaamDost — HARDINKAAM ka personal assistant.\n\nAapko jo bhi kaam karana hai, bas batayein!',
  },
  suggestedPrompts: [
    { id: 'p1', label: '⚡ इलेक्ट्रीशियन चाहिए', query: 'इलेक्ट्रीशियन चाहिए', icon: 'Zap' },
    { id: 'p2', label: '🔧 नल ठीक कराना है', query: 'प्लंबर की जरूरत है', icon: 'Wrench' },
    { id: 'p3', label: '❄️ एसी सर्विसिंग', query: 'एसी सर्विस करानी है', icon: 'Wind' },
    { id: 'p4', label: '📋 मेरी बुकिंग दिखाओ', query: 'मेरी बुकिंग्स दिखाएं', icon: 'ClipboardList' },
    { id: 'p5', label: '💰 रेट कार्ड क्या है?', query: 'रेट कार्ड और कीमतें बताएं', icon: 'DollarSign' },
  ],
  quickActionChips: {
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
      { id: 'billing', label: '💰 Bill / Payment', query: 'Bill aur payment details', icon: 'CreditCard' },
      { id: 'help', label: '🆘 Help Chahiye', query: 'Mujhe help chahiye', icon: 'HelpCircle' },
      { id: 'contact', label: '📞 Contact Us', query: 'Customer care number dein', icon: 'Phone' },
    ],
    en: [
      { id: 'book_service', label: '🔧 Book a Service', query: 'Book a service', icon: 'Wrench' },
      { id: 'my_bookings', label: '📋 My Bookings', query: 'Show my bookings', icon: 'ClipboardList' },
      { id: 'registration', label: '👤 Registration', query: 'How to register', icon: 'UserPlus' },
      { id: 'billing', label: '💰 Pricing & Bill', query: 'View pricing rate card', icon: 'CreditCard' },
      { id: 'help', label: '🆘 Need Help', query: 'I need customer support', icon: 'HelpCircle' },
      { id: 'contact', label: '📞 Contact Support', query: 'Customer care contact number', icon: 'Phone' },
    ],
  },
  isVoiceEnabled: true,
  isTtsEnabled: true,
  defaultTtsSpeed: 1.0,
  isFileUploadEnabled: true,
  maxAttachmentSizeBytes: 10 * 1024 * 1024, // 10MB
  allowedFileTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4', 'video/webm', 'application/pdf'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.pdf', '.doc', '.docx'],
  serviceSpecificQuestions: {
    Electrician: {
      category: 'Electrician',
      diagnosisQuestion: 'बिजली के काम में क्या समस्या आ रही है? (पंखा, वायरिंग, स्विचबोर्ड, शॉर्ट सर्किट)',
      suggestedOptions: ['पंखा रिपेयर / फिटिंग', 'स्विचबोर्ड व सॉकेट', 'शॉर्ट सर्किट जांच', 'एमसीबी / इन्वर्टर'],
    },
    Plumber: {
      category: 'Plumber',
      diagnosisQuestion: 'प्लंबिंग में क्या काम कराना है? (नल लीकेज, मोटर पंप, पानी टंकी सफाई, पाइप फिटिंग)',
      suggestedOptions: ['नल लीकेज रिपेयर', 'पानी टंकी 5-स्टेज सफाई', 'मोटर पंप रिपेयर', 'पाइपलाइन लीकेज'],
    },
    'AC Service & Repair': {
      category: 'AC Service & Repair',
      diagnosisQuestion: 'एसी में क्या खराबी है? (कूलिंग नहीं हो रही, गैस रीफिल, जेट पंप सर्विस, पानी टपकना)',
      suggestedOptions: ['फोम जेट पंप डीप सर्विस', 'गैस रीफिल / टॉप-अप', 'कूलिंग नहीं हो रही', 'विजिट व डायग्नोस्टिक'],
    },
    'Deep Cleaning': {
      category: 'Deep Cleaning',
      diagnosisQuestion: 'सफाई के लिए कौन सा एरिया चुनना चाहते हैं? (पूरा घर, किचन, बाथरूम, सोफा)',
      suggestedOptions: ['फुल होम डीप क्लीनिंग', 'किचन डीप क्लीनिंग', 'बाथरूम एसिड-फ्री वॉश', 'सोफा व गद्दे सफाई'],
    },
  },
  registrationQuestions: {
    customer: ['आपका पूरा नाम क्या है?', 'आपका 10-अंकों का मोबाइल नंबर दर्ज करें:', 'भोपाल में आपका पता या कॉलोनी क्या है?'],
    service_man: ['आपका मुख्य हुनर / ट्रेड क्या है?', 'काम का कुल अनुभव (सालों में) बताएं:', 'दैनिक उपलब्धता व कार्यक्षेत्र चुनें:'],
    business_partner: ['आपकी फर्म / एजेंसी का नाम क्या है?', 'आपके पास कुल कितने कुशल कारीगर / फ्लीट हैं?', 'सर्विस का प्राथमिक जिला व शहर:'],
    franchise_admin: ['आप किस जिले की फ्रेंचाइजी में रुचि रखते हैं?', 'बिजनेस बैकग्राउंड व निवेश क्षमता:', 'डायरेक्टर / प्रोपराइटर का नाम व फोन:'],
  },
  bookingQuestions: {
    serviceTypePrompt: 'कृपया बताएं कि आप कौन सा काम कराना चाहते हैं:',
    locationPrompt: 'कारीगर को भेजने के लिए भोपाल में अपना पता या लोकैलिटी बताएं:',
    datePrompt: 'आप किस तारीख को सर्विस कराना चाहते हैं? (आज / कल / परसों):',
    timePrompt: 'आपकी सुविधा अनुसार समय स्लॉट चुनें:',
    contactPrompt: 'संपर्क व स्टार्ट OTP के लिए अपना नाम और 10-अंकों का मोबाइल नंबर दें:',
  },
  supportQuestions: {
    issueCategoryPrompt: 'कृपया सहायता या शिकायत का प्रकार चुनें:',
    descriptionPrompt: 'समस्या का संक्षिप्त विवरण बताएं:',
    priorityPrompt: 'समस्या की प्राथमिकता (Priority) चुनें:',
  },
  actionPermissions: {
    REGISTER_CUSTOMER: {
      enabled: true,
      requiresConfirmation: true,
      allowedRoles: ['guest', 'customer', 'admin', 'super_admin'],
      description: 'Allows registering a new customer account',
    },
    REGISTER_SERVICE_PRO: {
      enabled: true,
      requiresConfirmation: true,
      allowedRoles: ['guest', 'customer', 'service_man', 'admin', 'super_admin'],
      description: 'Allows onboarding skilled service technicians',
    },
    REGISTER_PARTNER: {
      enabled: true,
      requiresConfirmation: true,
      allowedRoles: ['guest', 'customer', 'business_partner', 'admin', 'super_admin'],
      description: 'Allows onboarding business partners and agency fleets',
    },
    REGISTER_FRANCHISE: {
      enabled: true,
      requiresConfirmation: true,
      allowedRoles: ['guest', 'customer', 'franchise_admin', 'admin', 'super_admin'],
      description: 'Allows registering interest for district franchise ownership',
    },
    BOOK_SERVICE: {
      enabled: true,
      requiresConfirmation: true,
      allowedRoles: ['guest', 'customer', 'admin', 'super_admin'],
      description: 'Books doorstep services across Bhopal',
    },
    VIEW_BOOKINGS: {
      enabled: true,
      requiresConfirmation: false,
      allowedRoles: ['customer', 'service_man', 'business_partner', 'franchise_admin', 'admin', 'super_admin'],
      description: 'Lists user bookings with live statuses',
    },
    VIEW_BOOKING: {
      enabled: true,
      requiresConfirmation: false,
      allowedRoles: ['customer', 'service_man', 'business_partner', 'franchise_admin', 'admin', 'super_admin'],
      description: 'Views single booking details and tracker',
    },
    CANCEL_BOOKING: {
      enabled: true,
      requiresConfirmation: true,
      allowedRoles: ['customer', 'admin', 'super_admin'],
      description: 'Cancels eligible booking with 100% refund',
    },
    RESCHEDULE_BOOKING: {
      enabled: true,
      requiresConfirmation: true,
      allowedRoles: ['customer', 'admin', 'super_admin'],
      description: 'Reschedules booking date and slot',
    },
    TRACK_SERVICE: {
      enabled: true,
      requiresConfirmation: false,
      allowedRoles: ['customer', 'admin', 'super_admin'],
      description: 'Tracks live technician ETA and location',
    },
    APPROVE_EXTRA_CHARGE: {
      enabled: true,
      requiresConfirmation: true,
      allowedRoles: ['customer', 'admin', 'super_admin'],
      description: 'Approves/rejects additional spare parts or job charges',
    },
    VIEW_BILL: {
      enabled: true,
      requiresConfirmation: false,
      allowedRoles: ['customer', 'admin', 'super_admin'],
      description: 'Displays itemized digital invoice and GST bill',
    },
    MAKE_PAYMENT: {
      enabled: true,
      requiresConfirmation: true,
      allowedRoles: ['customer', 'admin', 'super_admin'],
      description: 'Processes online payment via Razorpay / UPI',
    },
    SUBMIT_RATING: {
      enabled: true,
      requiresConfirmation: false,
      allowedRoles: ['customer', 'admin', 'super_admin'],
      description: 'Submits 5-star rating and customer review',
    },
    CREATE_COMPLAINT: {
      enabled: true,
      requiresConfirmation: true,
      allowedRoles: ['customer', 'service_man', 'business_partner', 'franchise_admin', 'admin', 'super_admin'],
      description: 'Submits support ticket with 60-min resolution SLA',
    },
    UPDATE_PROFILE: {
      enabled: true,
      requiresConfirmation: true,
      allowedRoles: ['customer', 'service_man', 'business_partner', 'franchise_admin', 'admin', 'super_admin'],
      description: 'Updates primary address, phone and details',
    },
    GET_SUPPORT: {
      enabled: true,
      requiresConfirmation: false,
      allowedRoles: ['guest', 'customer', 'service_man', 'business_partner', 'franchise_admin', 'admin', 'super_admin'],
      description: 'Connects with 24x7 customer support helpline',
    },
  },
  lastUpdated: '2026-09-24',
  updatedBy: 'HARDINKAAM Root Administrator',
  version: 1,
};

const LOCAL_STORAGE_KEY = 'hardinkaam_kaamdost_config_v1';

export class KaamDostConfigService {
  private config: KaamDostAdminConfig = { ...DEFAULT_KAAMDOST_CONFIG };
  private listeners: Array<(cfg: KaamDostAdminConfig) => void> = [];

  constructor() {
    this.loadFromLocalStorage();
    this.initFirestoreSubscription();
  }

  private loadFromLocalStorage() {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.config = { ...DEFAULT_KAAMDOST_CONFIG, ...parsed };
      }
    } catch (e) {
      console.warn('[KaamDostConfigService] Local storage fallback:', e);
    }
  }

  private initFirestoreSubscription() {
    try {
      const configDoc = doc(db, 'platform_settings', 'kaamdost_ai');
      onSnapshot(
        configDoc,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as KaamDostAdminConfig;
            this.config = { ...DEFAULT_KAAMDOST_CONFIG, ...data };
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.config));
            } catch (err) {}
            this.notifyListeners();
          } else {
            // Keep default config locally, do not attempt unauthorized write from guest clients
            this.config = { ...DEFAULT_KAAMDOST_CONFIG };
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.config));
            } catch (err) {}
            this.notifyListeners();
          }
        },
        (err) => {
          console.warn('[KaamDostConfigService] Firestore sync notice (using cached):', err);
        }
      );
    } catch (err) {
      console.warn('[KaamDostConfigService] Subscription error:', err);
    }
  }

  public getConfig(): KaamDostAdminConfig {
    return this.config;
  }

  public async saveConfig(newConfig: KaamDostAdminConfig, updatedBy: string = 'Super Admin'): Promise<boolean> {
    try {
      const updated: KaamDostAdminConfig = {
        ...newConfig,
        lastUpdated: new Date().toISOString().split('T')[0],
        updatedBy,
        version: (this.config.version || 1) + 1,
      };

      const configDoc = doc(db, 'platform_settings', 'kaamdost_ai');
      await setDoc(configDoc, updated, { merge: true });

      this.config = updated;
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {}
      this.notifyListeners();
      return true;
    } catch (err) {
      console.error('[KaamDostConfigService] Failed to save config to Firestore:', err);
      // Fallback local save
      this.config = newConfig;
      this.notifyListeners();
      return false;
    }
  }

  public subscribe(listener: (cfg: KaamDostAdminConfig) => void): () => void {
    this.listeners.push(listener);
    listener(this.config);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    for (const l of this.listeners) {
      try {
        l(this.config);
      } catch (e) {}
    }
  }
}

export const kaamDostConfigService = new KaamDostConfigService();
