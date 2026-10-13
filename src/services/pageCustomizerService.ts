import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  SupportedPageId,
  DynamicPageConfig,
  DynamicSectionConfig,
  PageSectionItem,
  PageThemeSettings,
} from '../types/pageCustomizer';
import { USER_UPLOADED_SHOWCASE_IMAGES } from '../data/userImages';

const STORAGE_KEY_PREFIX = 'hardinkaam_page_layout_v2_';
const LISTENERS: Map<SupportedPageId, Set<(config: DynamicPageConfig) => void>> = new Map();

/**
 * Default configurations for each page in the application
 */
export const DEFAULT_PAGE_CONFIGS: Record<SupportedPageId, DynamicPageConfig> = {
  home: {
    pageId: 'home',
    pageName: 'Customer Home',
    pageNameHindi: 'मुख्य पृष्ठ (होम पेज)',
    theme: {
      primaryColor: '#ea580c',
      secondaryColor: '#0f766e',
      bgStyle: 'default',
      cardStyle: 'glass',
      bannerHeadline: 'घर का हर काम, अब HARDINKAAM के साथ आसान',
      bannerSubheadline: 'Verified professionals को खोजें, service book करें और अपने घर का काम भरोसे के साथ करवाएं।',
      bannerBadgeText: "Bhopal's Premier Home Services Network",
      heroBgImage: '',
    },
    sections: [
      {
        id: 'sec_hero',
        type: 'hero',
        title: 'Hero Banner & Search',
        subtitle: 'Main entry banner with quick search, locality selection, and urgent booking CTA',
        badge: "Bhopal's #1 Network",
        visible: true,
        order: 1,
        bgColor: 'transparent',
        textColor: '#ffffff',
        buttonText: 'तुरंत बुक करें',
        buttonLink: '#categories',
        items: [],
      },
      {
        id: 'sec_colossal_gallery',
        type: 'colossal_gallery',
        title: 'Colossal Work Showcase (हमारे कार्य की लाइव तस्वीरें)',
        subtitle: 'भोपाल और मध्य प्रदेश में हमारे कुशल कारीगरों द्वारा किए गए वास्तविक कार्यों की विशाल गैलरी',
        badge: '100% Real Field Work Gallery',
        visible: true,
        order: 2,
        bgColor: '#1c1917',
        textColor: '#f8fafc',
        items: USER_UPLOADED_SHOWCASE_IMAGES.map((img) => ({
          id: img.id,
          title: img.title,
          subtitle: img.category,
          imageUrl: img.url,
          badge: img.category,
        })),
      },
      {
        id: 'sec_promo_banner',
        type: 'custom_banner',
        title: '🔥 महा बचत ऑफर: पहली सर्विस पर फ्लैट ₹150 की छूट',
        subtitle: 'कूपन कोड "FIRST150" का उपयोग करें | 100% संतोष की गारंटी या री-सर्विस फ्री',
        badge: 'LIMITED TIME DEAL',
        visible: true,
        order: 3,
        bgColor: '#ea580c',
        textColor: '#ffffff',
        buttonText: 'ऑफर क्लेम करें',
        buttonLink: '#services',
        buttonBgColor: '#000000',
        items: [],
      },
      {
        id: 'sec_categories_grid',
        type: 'categories_grid',
        title: 'प्रमुख सेवाएं (All Top Categories)',
        subtitle: 'इलेक्ट्रीशियन, प्लंबर, एसी रिपेयर, कारपेंटर और होम डीप क्लीनिंग सेवाएं',
        badge: 'ALL CATEGORIES',
        visible: true,
        order: 4,
        items: [],
      },
      {
        id: 'sec_verified_pros',
        type: 'verified_pros',
        title: 'सत्यापित प्रो कारीगर (Bhopal Top Verified Pros)',
        subtitle: 'आधार व पुलिस रिकॉर्ड सत्यापित अनुभवी कारीगर आपके दरवाजे पर',
        badge: 'TOP RATED EXPERTS',
        visible: true,
        order: 5,
        items: [],
      },
      {
        id: 'sec_why_hardinkaam',
        type: 'why_hardinkaam',
        title: 'HARDINKAAM ही क्यों चुनें? (Why Us)',
        subtitle: 'सुरक्षित, विश्वसनीय, फिक्स रेट और तुरंत रिस्पांस',
        badge: 'OUR PROMISE',
        visible: true,
        order: 6,
        items: [],
      },
      {
        id: 'sec_faq',
        type: 'faq',
        title: 'अक्सर पूछे जाने वाले सवाल (FAQ)',
        subtitle: 'बुकिंग, पेमेंट और सर्विस वारंटी से जुड़े आपके सारे जवाब',
        badge: 'HELP & SUPPORT',
        visible: true,
        order: 7,
        items: [
          {
            id: 'faq_1',
            title: 'सर्विस बुकिंग के बाद कारीगर कितनी देर में पहुंचेगा?',
            description: 'भोपाल के सभी क्षेत्रों में अमूमन 30 से 45 मिनट के भीतर हमारे प्रमाणित कारीगर आपके स्थान पर पहुंच जाते हैं।',
          },
          {
            id: 'faq_2',
            title: 'क्या मुझे सर्विस की गारंटी मिलती है?',
            description: 'हां, HARDINKAAM की प्रत्येक रिपेयरिंग व मेंटेनेंस सर्विस पर 30 दिन की सर्विस गारंटी प्रदान की जाती है।',
          },
          {
            id: 'faq_3',
            title: 'पेमेंट कैसे करना होता है?',
            description: 'आप ऑनलाइन UPI, क्यूआर कोड, नेट बैंकिंग या काम पूरा होने पर कैश ऑन डिलीवरी कर सकते हैं।',
          },
        ],
      },
    ],
    updatedAt: new Date().toISOString(),
  },

  services: {
    pageId: 'services',
    pageName: 'Services Catalog',
    pageNameHindi: 'सर्विस कैटलॉग व रेट सूची',
    theme: {
      primaryColor: '#ea580c',
      secondaryColor: '#0369a1',
      bgStyle: 'default',
      cardStyle: 'glass',
      bannerHeadline: 'सभी घरेलू सेवाएं व पारदर्शी रेट लिस्ट',
      bannerSubheadline: 'बिना किसी छुपे चार्ज के मानक दरों पर उच्च गुणवत्ता वाली सेवाएं',
      bannerBadgeText: 'TRANSPARENT PRICING',
    },
    sections: [
      {
        id: 'sec_srv_header',
        type: 'hero',
        title: 'सर्विस खोजें और रेट देखें',
        subtitle: '100+ घर की आवश्यक सेवाएं एक ही स्थान पर',
        badge: 'RATE CARD',
        visible: true,
        order: 1,
        items: [],
      },
      {
        id: 'sec_srv_banner',
        type: 'custom_banner',
        title: '⚡ 100% फिक्स रेट कार्ड गारंटी',
        subtitle: 'काम से पहले रेट जानें, कोई अतिरिक्त विजिट चार्ज नहीं।',
        badge: 'FIXED RATES',
        visible: true,
        order: 2,
        bgColor: '#0f766e',
        textColor: '#ffffff',
        buttonText: 'रेट कार्ड डाउनलोड करें',
        buttonLink: '#',
        items: [],
      },
      {
        id: 'sec_srv_list',
        type: 'service_cards',
        title: 'सभी उपलब्ध सेवाएं',
        subtitle: 'विस्तृत विवरण, वारंटी व मूल्य सूची',
        badge: 'CATALOG',
        visible: true,
        order: 3,
        items: [],
      },
    ],
    updatedAt: new Date().toISOString(),
  },

  why_us: {
    pageId: 'why_us',
    pageName: 'Why Hardinkaam',
    pageNameHindi: 'हमारे बारे में व विशेषताएं',
    theme: {
      primaryColor: '#ea580c',
      secondaryColor: '#15803d',
      bgStyle: 'default',
      cardStyle: 'solid_white',
      bannerHeadline: 'भरोसेमंद काम, सही दाम — यही है HARDINKAAM',
      bannerSubheadline: 'मध्य प्रदेश का सबसे बड़ा और विश्वसनीय होम सर्विस प्लेटफॉर्म',
      bannerBadgeText: 'TRUST & SAFETY',
    },
    sections: [
      {
        id: 'sec_why_hero',
        type: 'hero',
        title: 'मध्य प्रदेश के हर घर का भरोसेमंद साथी',
        subtitle: '50,000+ संतुष्ट ग्राहक और 1,200+ वेरिफाइड सर्विस पार्टनर्स',
        badge: 'ESTABLISHED 2024',
        visible: true,
        order: 1,
        items: [],
      },
      {
        id: 'sec_why_features',
        type: 'features_grid',
        title: 'हमारी 5 प्रमुख विशेषताएं',
        subtitle: 'जो हमें अन्य सभी से बेहतर बनाती हैं',
        badge: 'OUR ADVANTAGES',
        visible: true,
        order: 2,
        items: [
          {
            id: 'feat_1',
            title: '100% पुलिस व आधार वेरिफाइड कारीगर',
            description: 'सुरक्षा से कोई समझौता नहीं। प्रत्येक कारीगर की पृष्ठभूमि गहनता से जांची जाती है।',
            badge: 'SAFETY FIRST',
          },
          {
            id: 'feat_2',
            title: '30 मिनट में त्वरित आगमन',
            description: 'भोपाल के हर कोने में हमारी स्थानीय टीम 30 मिनट में पहुंचने को तत्पर रहती है।',
            badge: 'FAST ARRIVAL',
          },
          {
            id: 'feat_3',
            title: 'पारदर्शी व निश्चित दरें',
            description: 'छिपा हुआ कोई खर्च नहीं। काम शुरू होने से पहले तय दरें बताई जाती हैं।',
            badge: 'NO HIDDEN COST',
          },
          {
            id: 'feat_4',
            title: '30 दिन की सर्विस गारंटी',
            description: 'यदि काम से संतुष्ट नहीं हैं, तो 30 दिनों में मुफ्त री-विजिट व सुधार किया जाएगा।',
            badge: '30-DAY WARRANTY',
          },
        ],
      },
      {
        id: 'sec_why_testimonials',
        type: 'testimonial_reviews',
        title: 'ग्राहकों का अनुभव व समीक्षाएं',
        subtitle: 'भोपाल के हजारों खुश परिवारों की सच्ची प्रतिक्रियाएं',
        badge: 'CUSTOMER VOICES',
        visible: true,
        order: 3,
        items: [
          {
            id: 'rev_1',
            title: 'राजेश शर्मा, एमपी नगर भोपाल',
            description: 'एसी रिपेयर के लिए तुरंत कारीगर आए और बेहद वाजिब दाम में काम कर दिया। बहुत बढ़िया सर्विस!',
            rating: 5,
            badge: 'VERIFIED CUSTOMER',
          },
          {
            id: 'rev_2',
            title: 'सुनीता पटेल, अरेरा कॉलोनी',
            description: 'इलेक्ट्रिकल वायरिंग का काम बहुत साफ-सुथरा हुआ। कारीगर बहुत विनम्र और पेशेवर थे।',
            rating: 5,
            badge: 'VERIFIED CUSTOMER',
          },
        ],
      },
    ],
    updatedAt: new Date().toISOString(),
  },

  bookings: {
    pageId: 'bookings',
    pageName: 'My Bookings',
    pageNameHindi: 'मेरी बुकिंग्स व लाइव ट्रैकिंग',
    theme: {
      primaryColor: '#ea580c',
      secondaryColor: '#4f46e5',
      bgStyle: 'default',
      cardStyle: 'glass',
      bannerHeadline: 'आपकी समस्त बुकिंग्स व लाइव सर्विस स्टेटस',
      bannerSubheadline: 'कारीगर की लोकेशन ट्रैक करें, ओटीपी सत्यापित करें और बिल डाउनलोड करें',
      bannerBadgeText: 'LIVE TRACKING',
    },
    sections: [
      {
        id: 'sec_bk_banner',
        type: 'custom_banner',
        title: '🛡️ ग्राहक सुरक्षा सहायता केंद्र 24x7',
        subtitle: 'बुकिंग से संबंधित किसी भी समस्या के लिए हमारे हेल्पलाइन नंबर पर संपर्क करें',
        badge: 'SUPPORT ACTIVE',
        visible: true,
        order: 1,
        bgColor: '#1e293b',
        textColor: '#ffffff',
        buttonText: 'सहायता पाएं',
        buttonLink: '#help',
        items: [],
      },
      {
        id: 'sec_bk_list',
        type: 'features_grid',
        title: 'सक्रिय एवं पिछली बुकिंग्स',
        subtitle: 'ऑर्डर इतिहास और इनवॉइस डाउनलोड',
        badge: 'MY ORDERS',
        visible: true,
        order: 2,
        items: [],
      },
    ],
    updatedAt: new Date().toISOString(),
  },

  pro_dashboard: {
    pageId: 'pro_dashboard',
    pageName: 'Pro / Technician Portal',
    pageNameHindi: 'कारीगर / सर्विसमैन पोर्टल',
    theme: {
      primaryColor: '#0f766e',
      secondaryColor: '#ea580c',
      bgStyle: 'default',
      cardStyle: 'glass',
      bannerHeadline: 'कारीगर साथी पोर्टल — काम पाएं, ज्यादा कमाएं',
      bannerSubheadline: 'दैनिक नई बुकिंग्स, तुरंत वॉलेट पेमेंट और डिजिटल पहचान पत्र',
      bannerBadgeText: 'HARDINKAAM PARTNER',
    },
    sections: [
      {
        id: 'sec_pro_welcome',
        type: 'hero',
        title: 'कारीगर डैशबोर्ड व लाइव जॉब्स',
        subtitle: 'अपने क्षेत्र के नए कस्टमर ऑर्डर्स स्वीकार करें',
        badge: 'ONLINE',
        visible: true,
        order: 1,
        items: [],
      },
      {
        id: 'sec_pro_incentive_banner',
        type: 'custom_banner',
        title: '🎁 इस हफ्ते 10 बुकिंग्स पूरी करने पर ₹1,000 अतिरिक्त बोनस!',
        subtitle: 'ग्राहकों से 5-स्टार रेटिंग पाएं और गोल्ड प्रो बैज हासिल करें।',
        badge: 'WEEKLY BONUS',
        visible: true,
        order: 2,
        bgColor: '#047857',
        textColor: '#ffffff',
        items: [],
      },
    ],
    updatedAt: new Date().toISOString(),
  },

  franchise: {
    pageId: 'franchise',
    pageName: 'All-India Franchise Portal',
    pageNameHindi: 'अखिल भारतीय फ्रैंचाइज़ पोर्टल',
    theme: {
      primaryColor: '#1e3a8a',
      secondaryColor: '#ea580c',
      bgStyle: 'dark',
      cardStyle: 'dark_elevated',
      bannerHeadline: 'अपने जिले में HARDINKAAM फ्रैंचाइज़ शुरू करें',
      bannerSubheadline: 'मध्य प्रदेश व भारत के 750+ जिलों में डिजिटल होम सर्विस का व्यापार स्वामित्व पाएं',
      bannerBadgeText: 'DISTRICT EXCLUSIVE',
    },
    sections: [
      {
        id: 'sec_fra_hero',
        type: 'hero',
        title: 'जिला फ्रैंचाइज़ पार्टनरशिप',
        subtitle: 'हर बुकिंग पर आजीवन 12% से 18% निश्चित कमीशन कमाएं',
        badge: 'BUSINESS OPPORTUNITY',
        visible: true,
        order: 1,
        items: [],
      },
      {
        id: 'sec_fra_benefits',
        type: 'features_grid',
        title: 'फ्रैंचाइज़ पार्टनर के प्रमुख लाभ',
        subtitle: 'कंपनी की पूरी मार्केटिंग व तकनीकी सहायता',
        badge: 'PARTNERSHIP BENEFITS',
        visible: true,
        order: 2,
        items: [
          {
            id: 'fra_1',
            title: 'जिले का एकाधिकार (Sole Monopoly)',
            description: 'एक जिले में केवल एक ही अधिकृत मास्टर फ्रैंचाइज़ पार्टनर को अधिकार दिया जाता है।',
            badge: 'EXCLUSIVE',
          },
          {
            id: 'fra_2',
            title: 'सॉफ्टवेयर और सीआरएम सिस्टम',
            description: 'फ्रैंचाइज़ एडमिन पोर्टल, ऑटोमैटिक अकाउंटिंग, और लाइव मैपिंग सॉफ्टवेयर मुफ्त मिलता है।',
            badge: 'AUTOMATED',
          },
        ],
      },
    ],
    updatedAt: new Date().toISOString(),
  },

  partner_dashboard: {
    pageId: 'partner_dashboard',
    pageName: 'Business Vendor Portal',
    pageNameHindi: 'बिजनेस वेंडर व फ्लीट पोर्टल',
    theme: {
      primaryColor: '#6b21a8',
      secondaryColor: '#ea580c',
      bgStyle: 'default',
      cardStyle: 'glass',
      bannerHeadline: 'वेंडर फ्लीट मैनेजमेंट पोर्टल',
      bannerSubheadline: 'अपनी तकनीशियन टीम को प्रबंधित करें और थोक ऑर्डर्स पूरे करें',
      bannerBadgeText: 'ENTERPRISE VENDOR',
    },
    sections: [
      {
        id: 'sec_vnd_hero',
        type: 'hero',
        title: 'वेंडर डैशबोर्ड',
        subtitle: 'अपनी टीम के कारीगरों को जॉब्स असाइन करें',
        badge: 'VENDOR SUITE',
        visible: true,
        order: 1,
        items: [],
      },
    ],
    updatedAt: new Date().toISOString(),
  },
};

/**
 * Gets the current page layout config from memory/localStorage, or default
 */
export function getPageConfig(pageId: SupportedPageId): DynamicPageConfig {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${pageId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.pageId === pageId && Array.isArray(parsed.sections)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn(`[PageCustomizer] Failed to read localStorage for ${pageId}:`, err);
  }

  return DEFAULT_PAGE_CONFIGS[pageId] || DEFAULT_PAGE_CONFIGS.home;
}

/**
 * Broadcasts updates to all in-memory subscribers
 */
function notifySubscribers(pageId: SupportedPageId, config: DynamicPageConfig) {
  const subs = LISTENERS.get(pageId);
  if (subs) {
    subs.forEach((cb) => {
      try {
        cb(config);
      } catch (e) {
        console.error(`[PageCustomizer] Subscriber error for ${pageId}:`, e);
      }
    });
  }
}

/**
 * Saves page config to LocalStorage and Firestore
 */
export async function savePageConfig(config: DynamicPageConfig): Promise<void> {
  const pageId = config.pageId;
  const updatedConfig: DynamicPageConfig = {
    ...config,
    updatedAt: new Date().toISOString(),
  };

  // 1. Immediately store in localStorage
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${pageId}`, JSON.stringify(updatedConfig));
  } catch (e) {
    console.warn(`[PageCustomizer] Could not write to localStorage for ${pageId}:`, e);
  }

  // 2. Notify local React components immediately
  notifySubscribers(pageId, updatedConfig);

  // 3. Persist to Firestore
  try {
    const docRef = doc(db, 'dynamic_page_layouts', pageId);
    await setDoc(docRef, updatedConfig, { merge: true });
    console.log(`[PageCustomizer] Successfully synced page layout "${pageId}" to Firestore.`);
  } catch (err) {
    console.warn(`[PageCustomizer] Firestore write notice (cached locally):`, err);
  }
}

/**
 * Resets a page to its original system defaults
 */
export async function resetPageConfig(pageId: SupportedPageId): Promise<DynamicPageConfig> {
  const defaultCfg = DEFAULT_PAGE_CONFIGS[pageId] || DEFAULT_PAGE_CONFIGS.home;
  const freshConfig: DynamicPageConfig = {
    ...defaultCfg,
    updatedAt: new Date().toISOString(),
  };

  await savePageConfig(freshConfig);
  return freshConfig;
}

/**
 * Adds a new custom section to a page
 */
export async function addSection(
  pageId: SupportedPageId,
  sectionDraft: Partial<DynamicSectionConfig>
): Promise<DynamicPageConfig> {
  const current = getPageConfig(pageId);
  const newId = `sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const maxOrder = current.sections.reduce((max, s) => Math.max(max, s.order || 0), 0);

  const newSection: DynamicSectionConfig = {
    id: newId,
    type: sectionDraft.type || 'custom_banner',
    title: sectionDraft.title || 'नया सेक्शन (New Custom Section)',
    subtitle: sectionDraft.subtitle || '',
    badge: sectionDraft.badge || 'NEW',
    visible: true,
    order: maxOrder + 1,
    bgColor: sectionDraft.bgColor || '#1e293b',
    textColor: sectionDraft.textColor || '#ffffff',
    buttonText: sectionDraft.buttonText || '',
    buttonLink: sectionDraft.buttonLink || '',
    buttonBgColor: sectionDraft.buttonBgColor || '#ea580c',
    bannerImage: sectionDraft.bannerImage || '',
    items: sectionDraft.items || [],
    customHtml: sectionDraft.customHtml || '',
    isCustom: true,
  };

  const updated: DynamicPageConfig = {
    ...current,
    sections: [...current.sections, newSection],
  };

  await savePageConfig(updated);
  return updated;
}

/**
 * Deletes a section completely from a page
 */
export async function deleteSection(
  pageId: SupportedPageId,
  sectionId: string
): Promise<DynamicPageConfig> {
  const current = getPageConfig(pageId);
  const updatedSections = current.sections.filter((s) => s.id !== sectionId);

  const updated: DynamicPageConfig = {
    ...current,
    sections: updatedSections,
  };

  await savePageConfig(updated);
  return updated;
}

/**
 * Toggles a section's visibility (Hide / Show)
 */
export async function toggleSectionVisibility(
  pageId: SupportedPageId,
  sectionId: string
): Promise<DynamicPageConfig> {
  const current = getPageConfig(pageId);
  const updatedSections = current.sections.map((s) =>
    s.id === sectionId ? { ...s, visible: !s.visible } : s
  );

  const updated: DynamicPageConfig = {
    ...current,
    sections: updatedSections,
  };

  await savePageConfig(updated);
  return updated;
}

/**
 * Reorders a section up or down
 */
export async function reorderSections(
  pageId: SupportedPageId,
  sectionId: string,
  direction: 'up' | 'down'
): Promise<DynamicPageConfig> {
  const current = getPageConfig(pageId);
  const sorted = [...current.sections].sort((a, b) => (a.order || 0) - (b.order || 0));
  const idx = sorted.findIndex((s) => s.id === sectionId);

  if (idx === -1) return current;
  if (direction === 'up' && idx === 0) return current;
  if (direction === 'down' && idx === sorted.length - 1) return current;

  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  const temp = sorted[idx];
  sorted[idx] = sorted[targetIdx];
  sorted[targetIdx] = temp;

  // Re-assign 1-based order numbers
  const reindexed = sorted.map((sec, i) => ({
    ...sec,
    order: i + 1,
  }));

  const updated: DynamicPageConfig = {
    ...current,
    sections: reindexed,
  };

  await savePageConfig(updated);
  return updated;
}

/**
 * Updates a single section's properties
 */
export async function updateSection(
  pageId: SupportedPageId,
  sectionId: string,
  updates: Partial<DynamicSectionConfig>
): Promise<DynamicPageConfig> {
  const current = getPageConfig(pageId);
  const updatedSections = current.sections.map((s) =>
    s.id === sectionId ? { ...s, ...updates } : s
  );

  const updated: DynamicPageConfig = {
    ...current,
    sections: updatedSections,
  };

  await savePageConfig(updated);
  return updated;
}

/**
 * Adds an image or item to a section (e.g. adding new picture to Colossal Gallery)
 */
export async function addSectionItem(
  pageId: SupportedPageId,
  sectionId: string,
  item: PageSectionItem
): Promise<DynamicPageConfig> {
  const current = getPageConfig(pageId);
  const updatedSections = current.sections.map((s) => {
    if (s.id === sectionId) {
      return {
        ...s,
        items: [item, ...(s.items || [])],
      };
    }
    return s;
  });

  const updated: DynamicPageConfig = {
    ...current,
    sections: updatedSections,
  };

  await savePageConfig(updated);
  return updated;
}

/**
 * Removes an image or item from a section
 */
export async function removeSectionItem(
  pageId: SupportedPageId,
  sectionId: string,
  itemId: string
): Promise<DynamicPageConfig> {
  const current = getPageConfig(pageId);
  const updatedSections = current.sections.map((s) => {
    if (s.id === sectionId) {
      return {
        ...s,
        items: (s.items || []).filter((item) => item.id !== itemId),
      };
    }
    return s;
  });

  const updated: DynamicPageConfig = {
    ...current,
    sections: updatedSections,
  };

  await savePageConfig(updated);
  return updated;
}

/**
 * Updates page theme colors, backgrounds, or banner text
 */
export async function updateTheme(
  pageId: SupportedPageId,
  themeUpdates: Partial<PageThemeSettings>
): Promise<DynamicPageConfig> {
  const current = getPageConfig(pageId);
  const updated: DynamicPageConfig = {
    ...current,
    theme: {
      ...current.theme,
      ...themeUpdates,
    },
  };

  await savePageConfig(updated);
  return updated;
}

/**
 * Subscribes to real-time updates for a specific page (both local events and Firestore onSnapshot)
 */
export function subscribeToPageConfig(
  pageId: SupportedPageId,
  callback: (config: DynamicPageConfig) => void
): () => void {
  if (!LISTENERS.has(pageId)) {
    LISTENERS.set(pageId, new Set());
  }
  const subs = LISTENERS.get(pageId)!;
  subs.add(callback);

  // Send current cached value immediately
  const initial = getPageConfig(pageId);
  callback(initial);

  // Connect to Firestore real-time listener
  let unsubscribeFirestore = () => {};
  try {
    const docRef = doc(db, 'dynamic_page_layouts', pageId);
    unsubscribeFirestore = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const remoteData = snapshot.data() as DynamicPageConfig;
          if (remoteData && remoteData.pageId === pageId && Array.isArray(remoteData.sections)) {
            try {
              localStorage.setItem(`${STORAGE_KEY_PREFIX}${pageId}`, JSON.stringify(remoteData));
            } catch (_) {}
            callback(remoteData);
          }
        }
      },
      (err) => {
        console.warn(`[PageCustomizer] Firestore real-time listener notice for ${pageId}:`, err);
      }
    );
  } catch (e) {
    console.warn(`[PageCustomizer] Could not attach Firestore snapshot for ${pageId}:`, e);
  }

  return () => {
    subs.delete(callback);
    unsubscribeFirestore();
  };
}
