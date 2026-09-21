export type FestivalThemeId =
  | 'default'
  | 'holi'
  | 'ganesh_chaturthi'
  | 'navratri'
  | 'diwali'
  | 'christmas'
  | 'makar_sankranti'
  | 'lohri'
  | 'republic_day'
  | 'vasant_panchami'
  | 'maha_shivratri'
  | 'ramadan'
  | 'eid_ul_fitr'
  | 'gudi_padwa'
  | 'ugadi'
  | 'ram_navami'
  | 'baisakhi'
  | 'mahavir_jayanti'
  | 'buddha_purnima'
  | 'eid_ul_adha'
  | 'rath_yatra'
  | 'independence_day'
  | 'raksha_bandhan'
  | 'janmashtami'
  | 'onam'
  | 'durga_puja'
  | 'dussehra'
  | 'karwa_chauth'
  | 'dhanteras'
  | 'govardhan_puja'
  | 'bhai_dooj'
  | 'chhath_puja'
  | 'guru_nanak_jayanti'
  | 'new_year'
  | 'pongal'
  | 'maha_shivratri_premium'
  | 'gandhi_jayanti';

export interface ThemeColors {
  primary: string;         // Main brand/accent color (buttons, active states, highlights)
  primaryHover: string;    // Hover state for primary buttons
  primaryLight: string;    // Light tint (background cards, pills, subtle areas)
  primaryDark: string;     // Dark tone for high-contrast text/headers
  secondary: string;       // Secondary festival accent
  secondaryLight: string;  // Light tint of secondary
  accent: string;          // Sparkling festival accent color
  bannerGradient: string;  // Festive hero/banner gradient
  badgeBg: string;         // Festive badge pill background
  badgeText: string;       // Festive badge pill text
  headerBorder: string;    // Subtle header accent/border
}

export interface FestivalDateInfo {
  displayDates: string;             // e.g. "3 - 4 March", "15 August (Annual)"
  displayDatesHindi: string;        // e.g. "3 - 4 मार्च", "15 अगस्त (प्रतिवर्ष)"
  approximateMonth: string;         // e.g. "March", "January", "October"
  approximateMonthHindi: string;    // e.g. "मार्च", "जनवरी", "अक्टूबर"
  startDate?: string;               // Approximate/canonical date
  endDate?: string;
  tithiPanchang?: string;           // Traditional Hindu / Islamic / Lunar Calendar Panchang tithi
  isFixedDate?: boolean;            // true if fixed to Gregorian calendar (e.g. Republic Day, Independence Day, Christmas)
  seasonHindi?: string;             // Traditional Indian Ritu (वसंत, ग्रीष्म, वर्षा, शरद, हेमंत, शिशिर)
}

export interface LocalizedDisplayNames {
  en: string;                       // English display name
  hi: string;                       // Hindi display name
  regional?: string;                // Native/Regional script or title (e.g., मराठी, தமிழ், বাংলা, ਪੰਜਾਬੀ)
  regionalLanguage?: string;        // Name of regional language or dialect
}

export interface FestivalMetadata {
  dates: FestivalDateInfo;
  icons: {
    primary: string;                // Primary emoji or symbol
    symbols: string[];              // Collection of festive symbols/emojis
  };
  localizedNames: LocalizedDisplayNames;
  culturalRegion?: string;          // Regional cultural association
  culturalRegionHindi?: string;     // Hindi description of region
}

export interface FestivalTheme {
  id: FestivalThemeId;
  name: string;
  nameHindi: string;
  tagline: string;
  taglineHindi: string;
  description: string;
  greeting: string;
  greetingHindi: string;
  greetingIcon: string; // Emoji / Icon representation
  category: 'standard' | 'festival';
  colors: ThemeColors;
  previewPalette: string[];
  metadata?: FestivalMetadata;
}

export interface ThemeSettingsDocument {
  activeThemeId: FestivalThemeId;
  updatedAt: string;
  updatedBy?: string;
  updatedByEmail?: string;
}
