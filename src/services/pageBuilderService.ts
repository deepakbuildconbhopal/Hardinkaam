import { db } from '../firebase/config';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { DynamicPageConfig, DynamicSection, SUPPORTED_PAGES } from '../types/pageBuilder';
import { USER_UPLOADED_SHOWCASE_IMAGES, BRAND_LOGO_IMAGE } from '../data/userImages';

const STORAGE_PREFIX = 'hardinkaam_page_layout_';

/**
 * Baseline default configurations for each page.
 * If no custom config exists in Firestore, these defaults are used.
 */
export const DEFAULT_PAGE_CONFIGS: Record<string, DynamicPageConfig> = {
  home: {
    pageId: 'home',
    pageName: 'होमपेज (Home Page)',
    pagePath: '#home',
    pageDescription: 'मुख्य होमपेज, बैनर, श्रेणियां, सेवाएँ व कार्य गैलरी',
    backgroundColor: '#f5f5f4',
    backgroundGradient: 'linear-gradient(135deg, #1c1917 0%, #0c0a09 50%, #431407 100%)',
    headerTextColor: '#ffffff',
    accentColor: '#ea580c',
    sections: [
      {
        id: 'sec_home_hero',
        type: 'hero_banner',
        name: 'मुख्य हीरो बैनर (Hero Section)',
        title: 'घर का हर काम, अब HARDINKAAM के साथ आसान',
        subtitle: 'Verified professionals को खोजें, service book करें और अपने घर का काम भरोसे के साथ करवाएं।',
        isVisible: true,
        order: 1,
        backgroundColor: '#1c1917',
        backgroundGradient: 'linear-gradient(135deg, #1c1917 0%, #0c0a09 50%, #431407 100%)',
        textColor: '#ffffff',
        subtitleColor: '#fed7aa',
        accentColor: '#ea580c',
        badgeText: "Bhopal's Premier Home Services Network",
        badgeColor: '#ea580c',
        badgeTextColor: '#fed7aa',
        buttonText: 'Service खोजें',
        buttonLink: '#services-list-section',
        buttonColor: '#ea580c',
        buttonTextColor: '#ffffff',
        buttonSecondaryText: 'Service Provider बनें',
        buttonSecondaryLink: '#pro_auth',
        images: [
          {
            id: 'img_hero_logo',
            url: BRAND_LOGO_IMAGE,
            title: 'HARDINKAAM Official Brand Logo',
            aspectRatio: '1:1',
          },
        ],
        isDeletable: false,
      },
      {
        id: 'sec_home_custom_promo',
        type: 'custom_banner',
        name: 'विशेष प्रोमो व वेलकम ऑफर स्ट्रिप (Promo Strip)',
        title: '🎉 पहली बुकिंग पर विशेष छूट व 100% संतोष गारंटी!',
        subtitle: 'भोपाल व मध्य प्रदेश के 500+ क्षेत्रों में 60 मिनट त्वरित आगमन और 7 दिन की वारंटी।',
        isVisible: true,
        order: 2,
        backgroundColor: '#ea580c',
        backgroundGradient: 'linear-gradient(90deg, #ea580c 0%, #d97706 100%)',
        textColor: '#ffffff',
        subtitleColor: '#ffedd5',
        buttonText: 'ऑफर देखें व बुक करें',
        buttonLink: '#services-list-section',
        buttonColor: '#ffffff',
        buttonTextColor: '#9a3412',
        badgeText: 'सीमित समय ऑफर',
        badgeColor: '#ffffff',
        badgeTextColor: '#ea580c',
        isDeletable: true,
      },
      {
        id: 'sec_home_showcase',
        type: 'image_gallery',
        name: 'कार्य एवं प्रोजेक्ट्स गैलरी (Colossal Work Showcase)',
        title: 'हमारे द्वारा किए गए प्रमुख कार्य और प्रोजेक्ट्स की झलकियाँ',
        subtitle: 'इलेक्ट्रिकल वायरिंग, AC जेट सर्विसिंग, प्लंबिंग, डीप क्लीनिंग, कारपेंट्री और आधुनिक इंटीरियर कार्य जो हमने भोपाल और आसपास सफलतापूर्वक संपन्न किए हैं।',
        isVisible: true,
        order: 3,
        backgroundColor: '#ffffff',
        textColor: '#1c1917',
        subtitleColor: '#78716c',
        badgeText: 'COLOSSAL WORK GALLERY • 26+ LIVE PROJECTS',
        badgeColor: '#ea580c',
        badgeTextColor: '#ffffff',
        images: USER_UPLOADED_SHOWCASE_IMAGES.map((img) => ({
          id: img.id,
          url: img.url,
          title: `${img.title} (${img.category})`,
          link: '#services-list-section',
          aspectRatio: '1:1',
        })),
        isDeletable: true,
      },
      {
        id: 'sec_home_features',
        type: 'feature_grid',
        name: 'विशेषताएं व हार्डिनकाम के फायदे (Key Features)',
        title: 'हार्डिनकाम ही क्यों चुनें? (Why Hardinkaam?)',
        subtitle: 'सुरक्षा, विश्वास, निश्चित दरें और कुशल कारीगरों का सबसे बड़ा नेटवर्क',
        isVisible: true,
        order: 4,
        backgroundColor: '#f8fafc',
        textColor: '#0f172a',
        cards: [
          {
            id: 'card_1',
            iconName: 'ShieldCheck',
            title: '100% पुलिस व KYC सत्यापित',
            description: 'प्रत्येक कारीगर का आधार, पैन और बैकग्राउंड परीक्षण किया जाता है।',
            badge: 'Verified',
          },
          {
            id: 'card_2',
            iconName: 'Clock',
            title: '60 मिनट में त्वरित आगमन',
            description: 'आपके निकटतम इलाके से सबसे तेज़ तकनीशियन आपके दरवाजे पर।',
            badge: 'Fast ETA',
          },
          {
            id: 'card_3',
            iconName: 'Award',
            title: '7 दिनों की सर्विस वारंटी',
            description: 'काम में कोई भी समस्या होने पर बिना किसी अतिरिक्त शुल्क के सुधार।',
            badge: 'Warranty',
          },
          {
            id: 'card_4',
            iconName: 'DollarSign',
            title: 'पारदर्शी व निश्चित दरें',
            description: 'कोई छुपा हुआ शुल्क नहीं। काम से पहले पक्की दरें देखें।',
            badge: 'No Hidden Fee',
          },
        ],
        isDeletable: true,
      },
      {
        id: 'sec_home_cta',
        type: 'cta_banner',
        name: 'हेल्पलाइन व बुकिंग कॉल टू एक्शन (Call To Action)',
        title: 'घर के किसी भी काम के लिए अभी कॉल करें या ऑनलाइन बुक करें!',
        subtitle: 'दीपक बिल्डकॉन भोपाल द्वारा संचालित • 24x7 ग्राहक सेवा व विशेषज्ञ समाधान',
        isVisible: true,
        order: 5,
        backgroundColor: '#0f172a',
        backgroundGradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        textColor: '#ffffff',
        subtitleColor: '#94a3b8',
        buttonText: '📞 कॉल करें: +91 62675 46945',
        buttonLink: 'tel:+916267546945',
        buttonColor: '#ea580c',
        buttonTextColor: '#ffffff',
        buttonSecondaryText: '💬 WhatsApp पर बात करें',
        buttonSecondaryLink: 'https://api.whatsapp.com/send?phone=916267546945',
        badgeText: '24x7 सपोर्ट लाइव',
        badgeColor: '#10b981',
        badgeTextColor: '#ffffff',
        isDeletable: true,
      },
    ],
    updatedAt: new Date().toISOString(),
    updatedBy: 'system',
  },
  categories: {
    pageId: 'categories',
    pageName: 'श्रेणियां (Categories Page)',
    pagePath: '#categories',
    pageDescription: 'सभी ट्रेड श्रेणियां व सेवा सूची',
    backgroundColor: '#f5f5f4',
    headerTextColor: '#1c1917',
    accentColor: '#ea580c',
    sections: [
      {
        id: 'sec_cat_header',
        type: 'custom_banner',
        name: 'श्रेणी हेडर बैनर',
        title: 'सभी घरेलू सेवाएं व ट्रेड श्रेणियां',
        subtitle: 'इलेक्ट्रिशियन, प्लंबर, कारपेंटर, एसी मैकेनिक, पेंटिंग और डीप क्लीनिंग सेवाएं',
        isVisible: true,
        order: 1,
        backgroundColor: '#ea580c',
        backgroundGradient: 'linear-gradient(90deg, #ea580c 0%, #f59e0b 100%)',
        textColor: '#ffffff',
        subtitleColor: '#ffedd5',
        badgeText: 'पूर्ण कैटलॉग',
        isDeletable: false,
      },
    ],
    updatedAt: new Date().toISOString(),
    updatedBy: 'system',
  },
  bookings: {
    pageId: 'bookings',
    pageName: 'मेरी बुकिंग्स (My Bookings)',
    pagePath: '#bookings',
    pageDescription: 'ग्राहक बुकिंग इतिहास व सेवा ट्रैकिंग',
    backgroundColor: '#f5f5f4',
    headerTextColor: '#1c1917',
    accentColor: '#ea580c',
    sections: [
      {
        id: 'sec_bookings_header',
        type: 'custom_banner',
        name: 'बुकिंग्स सूचना बैनर',
        title: 'आपकी सक्रिय एवं पिछली सेवा बुकिंग्स',
        subtitle: 'रीयल-टाइम स्टेटस ट्रैकिंग, सर्विसमैन से संपर्क व डिजिटल इनवॉइस डाउनलोड',
        isVisible: true,
        order: 1,
        backgroundColor: '#0f172a',
        backgroundGradient: 'linear-gradient(90deg, #0f172a 0%, #1e293b 100%)',
        textColor: '#ffffff',
        subtitleColor: '#94a3b8',
        badgeText: 'लाइव ट्रैकिंग सक्रिय',
        isDeletable: false,
      },
    ],
    updatedAt: new Date().toISOString(),
    updatedBy: 'system',
  },
  wallet: {
    pageId: 'wallet',
    pageName: 'वॉलेट (Customer Wallet)',
    pagePath: '#wallet',
    pageDescription: 'रिवार्ड पॉइंट्स, बैलेंस व कैश बैक',
    backgroundColor: '#f5f5f4',
    headerTextColor: '#1c1917',
    accentColor: '#ea580c',
    sections: [
      {
        id: 'sec_wallet_header',
        type: 'custom_banner',
        name: 'वॉलेट प्रोमो बैनर',
        title: 'HARDINKAAM रिवार्ड पॉइंट्स व कैशबैक वॉलेट',
        subtitle: 'हर बुकिंग पर पॉइंट्स कमाएं और अगली सर्विस पर 100% तक रिडीम करें!',
        isVisible: true,
        order: 1,
        backgroundColor: '#059669',
        backgroundGradient: 'linear-gradient(90deg, #059669 0%, #0d9488 100%)',
        textColor: '#ffffff',
        subtitleColor: '#ccfbf1',
        badgeText: '100 पॉइंट्स = ₹100 छूट',
        isDeletable: false,
      },
    ],
    updatedAt: new Date().toISOString(),
    updatedBy: 'system',
  },
  franchise: {
    pageId: 'franchise',
    pageName: 'फ्रेंचाइज़ी पोर्टल (Franchise Portal)',
    pagePath: '#franchise',
    pageDescription: 'अखिल भारतीय फ्रेंचाइज़ी व जिला विस्तार पेज',
    backgroundColor: '#f8fafc',
    headerTextColor: '#0f172a',
    accentColor: '#ea580c',
    sections: [
      {
        id: 'sec_franchise_header',
        type: 'custom_banner',
        name: 'फ्रेंचाइज़ी लीडरशिप बैनर',
        title: 'अपने जिले या तहसील में HARDINKAAM फ्रेंचाइज़ी शुरू करें!',
        subtitle: 'दीपक बिल्डकॉन भोपाल द्वारा समर्थित अखिल भारतीय नेटवर्क • उच्च मासिक लाभ व शून्य रॉयल्टी जोखिम',
        isVisible: true,
        order: 1,
        backgroundColor: '#d97706',
        backgroundGradient: 'linear-gradient(90deg, #d97706 0%, #ea580c 100%)',
        textColor: '#ffffff',
        subtitleColor: '#fef3c7',
        buttonText: 'फ्रेंचाइज़ी आवेदन फॉर्म भरें',
        buttonLink: '#franchise_application',
        badgeText: '500+ जिले उपलब्ध',
        isDeletable: false,
      },
    ],
    updatedAt: new Date().toISOString(),
    updatedBy: 'system',
  },
  profile: {
    pageId: 'profile',
    pageName: 'प्रोफ़ाइल व सेटिंग्स (Profile View)',
    pagePath: '#profile',
    pageDescription: 'उपयोगकर्ता प्रोफ़ाइल, KYC व सेटिंग्स',
    backgroundColor: '#f5f5f4',
    headerTextColor: '#1c1917',
    accentColor: '#ea580c',
    sections: [
      {
        id: 'sec_profile_header',
        type: 'custom_banner',
        name: 'प्रोफ़ाइल हेडर बैनर',
        title: 'आपकी खाता जानकारी व सुरक्षा सेटिंग्स',
        subtitle: 'सत्यापित पहचान, डिजिटल मेंबरशिप कार्ड व प्राथमिक पता',
        isVisible: true,
        order: 1,
        backgroundColor: '#1e293b',
        textColor: '#ffffff',
        subtitleColor: '#cbd5e1',
        badgeText: 'सुरक्षित खाता',
        isDeletable: false,
      },
    ],
    updatedAt: new Date().toISOString(),
    updatedBy: 'system',
  },
};

/**
 * Reads the cached config from localStorage (for instant rendering)
 */
export function getLocalPageConfig(pageId: string): DynamicPageConfig {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${pageId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.sections)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn(`Local page config load notice for ${pageId}:`, e);
  }
  return DEFAULT_PAGE_CONFIGS[pageId] || DEFAULT_PAGE_CONFIGS['home'];
}

/**
 * Saves config to localStorage and Firestore
 */
export async function savePageConfig(config: DynamicPageConfig, adminEmail: string = 'admin'): Promise<void> {
  const updatedConfig: DynamicPageConfig = {
    ...config,
    updatedAt: new Date().toISOString(),
    updatedBy: adminEmail,
  };

  // 1. Immediately cache in localStorage
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${config.pageId}`, JSON.stringify(updatedConfig));
  } catch (e) {
    console.warn('Failed to cache page config locally:', e);
  }

  // 2. Persist in Firestore
  try {
    const pageRef = doc(db, 'dynamic_page_layouts', config.pageId);
    await setDoc(pageRef, {
      ...updatedConfig,
      sectionsJson: JSON.stringify(updatedConfig.sections),
    }, { merge: true });
    console.log(`[PageBuilder] Saved dynamic layout for ${config.pageId} to Firestore.`);
  } catch (err: any) {
    console.warn(`[PageBuilder] Firestore save notice (local state preserved):`, err.message);
  }
}

/**
 * Subscribes to real-time updates for a given page
 */
export function subscribePageConfig(pageId: string, callback: (config: DynamicPageConfig) => void): () => void {
  // First callback with local or default config
  const initial = getLocalPageConfig(pageId);
  callback(initial);

  try {
    const pageRef = doc(db, 'dynamic_page_layouts', pageId);
    const unsub = onSnapshot(
      pageRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          let sections = data.sections;
          if (!sections && data.sectionsJson) {
            try {
              sections = JSON.parse(data.sectionsJson);
            } catch {}
          }
          if (Array.isArray(sections)) {
            const config: DynamicPageConfig = {
              pageId: data.pageId || pageId,
              pageName: data.pageName || initial.pageName,
              pagePath: data.pagePath || initial.pagePath,
              pageDescription: data.pageDescription || initial.pageDescription,
              backgroundColor: data.backgroundColor || initial.backgroundColor,
              backgroundGradient: data.backgroundGradient || initial.backgroundGradient,
              headerTextColor: data.headerTextColor || initial.headerTextColor,
              accentColor: data.accentColor || initial.accentColor,
              sections: sections.sort((a, b) => (a.order || 0) - (b.order || 0)),
              updatedAt: data.updatedAt || new Date().toISOString(),
              updatedBy: data.updatedBy || 'admin',
            };
            try {
              localStorage.setItem(`${STORAGE_PREFIX}${pageId}`, JSON.stringify(config));
            } catch {}
            callback(config);
          }
        }
      },
      (err) => {
        console.warn(`[PageBuilder] Snapshot listener notice for ${pageId}:`, err.message);
      }
    );
    return unsub;
  } catch (err) {
    console.warn(`[PageBuilder] Realtime subscription init notice:`, err);
    return () => {};
  }
}

/**
 * Resets a page layout to its default initial state
 */
export async function resetPageConfigToDefault(pageId: string, adminEmail: string = 'admin'): Promise<DynamicPageConfig> {
  const defaultConfig = DEFAULT_PAGE_CONFIGS[pageId] || DEFAULT_PAGE_CONFIGS['home'];
  await savePageConfig(defaultConfig, adminEmail);
  return defaultConfig;
}
