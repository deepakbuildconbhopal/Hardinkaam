export type DynamicSectionType =
  | 'hero_banner'
  | 'custom_banner'
  | 'image_gallery'
  | 'feature_grid'
  | 'promo_cards'
  | 'text_block'
  | 'faq'
  | 'cta_banner';

export interface DynamicSectionImage {
  id: string;
  url: string;
  title?: string;
  link?: string;
  aspectRatio?: '1:1' | '16:9' | '4:3';
}

export interface DynamicSectionCard {
  id: string;
  iconName?: string;
  title: string;
  description: string;
  badge?: string;
  link?: string;
}

export interface DynamicSectionFaq {
  id: string;
  question: string;
  answer: string;
}

export interface DynamicSection {
  id: string;
  type: DynamicSectionType;
  name: string;
  title: string;
  subtitle?: string;
  content?: string;
  isVisible: boolean;
  order: number;
  // Styling & Theme
  backgroundColor?: string;
  backgroundGradient?: string;
  textColor?: string;
  subtitleColor?: string;
  accentColor?: string;
  borderColor?: string;
  borderRadius?: 'none' | 'rounded-xl' | 'rounded-2xl' | 'rounded-3xl' | 'rounded-full';
  // Action CTA
  badgeText?: string;
  badgeColor?: string;
  badgeTextColor?: string;
  buttonText?: string;
  buttonLink?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  buttonSecondaryText?: string;
  buttonSecondaryLink?: string;
  // Data items
  images?: DynamicSectionImage[];
  cards?: DynamicSectionCard[];
  faqs?: DynamicSectionFaq[];
  // Permissions
  isDeletable?: boolean;
}

export interface DynamicPageConfig {
  pageId: string;
  pageName: string;
  pagePath: string;
  pageDescription?: string;
  backgroundColor?: string;
  backgroundGradient?: string;
  headerTextColor?: string;
  accentColor?: string;
  sections: DynamicSection[];
  updatedAt: string;
  updatedBy?: string;
}

export const SUPPORTED_PAGES: Array<{ id: string; name: string; description: string; path: string }> = [
  { id: 'home', name: 'होमपेज (Home Page)', description: 'मुख्य होमपेज, बैनर, श्रेणियां, सेवाएँ व कार्य गैलरी', path: '#home' },
  { id: 'categories', name: 'श्रेणियां (Categories Page)', description: 'सभी ट्रेड श्रेणियां व सेवा सूची', path: '#categories' },
  { id: 'bookings', name: 'मेरी बुकिंग्स (My Bookings)', description: 'ग्राहक बुकिंग इतिहास व सेवा ट्रैकिंग', path: '#bookings' },
  { id: 'wallet', name: 'वॉलेट (Customer Wallet)', description: 'रिवार्ड पॉइंट्स, बैलेंस व कैश बैक', path: '#wallet' },
  { id: 'franchise', name: 'फ्रेंचाइज़ी पोर्टल (Franchise Portal)', description: 'अखिल भारतीय फ्रेंचाइज़ी व जिला विस्तार पेज', path: '#franchise' },
  { id: 'profile', name: 'प्रोफ़ाइल व सेटिंग्स (Profile View)', description: 'उपयोगकर्ता प्रोफ़ाइल, KYC व सेटिंग्स', path: '#profile' },
];
