export type SupportedPageId =
  | 'home'
  | 'services'
  | 'why_us'
  | 'bookings'
  | 'pro_dashboard'
  | 'franchise'
  | 'partner_dashboard';

export type BgStyleType =
  | 'default'
  | 'glass'
  | 'dark'
  | 'sunset'
  | 'emerald'
  | 'warm_amber'
  | 'cyber'
  | 'royal_blue';

export type SectionType =
  | 'hero'
  | 'colossal_gallery'
  | 'custom_banner'
  | 'features_grid'
  | 'service_cards'
  | 'custom_html_text'
  | 'testimonial_reviews'
  | 'why_hardinkaam'
  | 'categories_grid'
  | 'verified_pros'
  | 'cta_action'
  | 'faq'
  | 'video_media'
  | 'contact_box';

export interface PageSectionItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  badge?: string;
  linkUrl?: string;
  buttonText?: string;
  price?: string;
  rating?: number;
  highlight?: boolean;
}

export interface DynamicSectionConfig {
  id: string;
  type: SectionType;
  title: string;
  subtitle?: string;
  badge?: string;
  visible: boolean;
  order: number;
  bgColor?: string;
  textColor?: string;
  buttonText?: string;
  buttonLink?: string;
  buttonBgColor?: string;
  bannerImage?: string;
  items: PageSectionItem[];
  customHtml?: string;
  isCustom?: boolean;
}

export interface PageThemeSettings {
  primaryColor: string;
  secondaryColor: string;
  bgStyle: BgStyleType;
  cardStyle: 'glass' | 'solid_white' | 'dark_elevated' | 'bordered';
  bannerHeadline?: string;
  bannerSubheadline?: string;
  bannerBadgeText?: string;
  heroBgImage?: string;
  customCss?: string;
}

export interface DynamicPageConfig {
  pageId: SupportedPageId;
  pageName: string;
  pageNameHindi: string;
  theme: PageThemeSettings;
  sections: DynamicSectionConfig[];
  updatedAt: string;
  updatedBy?: string;
}
