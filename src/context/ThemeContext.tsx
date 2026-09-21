import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { FestivalTheme, FestivalThemeId, ThemeSettingsDocument, FestivalMetadata } from '../types/theme';
import { FESTIVAL_THEMES, THEME_LIST, DEFAULT_THEME_ID } from '../config/themes';

const STORAGE_KEY = 'hardinkaam_active_theme_id';

interface ThemeContextType {
  activeThemeId: FestivalThemeId;
  activeTheme: FestivalTheme;
  previewThemeId: FestivalThemeId | null;
  effectiveTheme: FestivalTheme;
  availableThemes: FestivalTheme[];
  activateTheme: (themeId: FestivalThemeId, adminName?: string, adminEmail?: string) => Promise<boolean>;
  previewTheme: (themeId: FestivalThemeId | null) => void;
  resetPreview: () => void;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Metadata & Calendar Helpers
  activeMetadata?: FestivalMetadata;
  effectiveMetadata?: FestivalMetadata;
  getUpcomingThemes: () => FestivalTheme[];
  getThemesByMonth: (month: string) => FestivalTheme[];
  searchThemesWithMetadata: (query: string) => FestivalTheme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper to inject CSS variables into document.documentElement for universal styling
function applyThemeToDom(theme: FestivalTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  root.style.setProperty('--theme-primary', theme.colors.primary);
  root.style.setProperty('--theme-primary-hover', theme.colors.primaryHover);
  root.style.setProperty('--theme-primary-light', theme.colors.primaryLight);
  root.style.setProperty('--theme-primary-dark', theme.colors.primaryDark);
  root.style.setProperty('--theme-secondary', theme.colors.secondary);
  root.style.setProperty('--theme-secondary-light', theme.colors.secondaryLight);
  root.style.setProperty('--theme-accent', theme.colors.accent);
  root.style.setProperty('--theme-badge-bg', theme.colors.badgeBg);
  root.style.setProperty('--theme-badge-text', theme.colors.badgeText);
  root.style.setProperty('--theme-header-border', theme.colors.headerBorder);

  // Set data attributes for custom CSS hooks
  root.setAttribute('data-theme', theme.id);
  root.setAttribute('data-theme-category', theme.category);
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Read initial theme from localStorage for instant 0ms flash-free render
  const initialThemeId: FestivalThemeId = (() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as FestivalThemeId;
      if (stored && FESTIVAL_THEMES[stored]) {
        return stored;
      }
    } catch {
      // ignore
    }
    return DEFAULT_THEME_ID;
  })();

  const [activeThemeId, setActiveThemeId] = useState<FestivalThemeId>(initialThemeId);
  const [previewThemeId, setPreviewThemeId] = useState<FestivalThemeId | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Resolved active theme
  const activeTheme = useMemo(
    () => FESTIVAL_THEMES[activeThemeId] || FESTIVAL_THEMES.default,
    [activeThemeId]
  );

  // Effective theme currently shown on screen (either live preview or active)
  const effectiveTheme = useMemo(() => {
    if (previewThemeId && FESTIVAL_THEMES[previewThemeId]) {
      return FESTIVAL_THEMES[previewThemeId];
    }
    return activeTheme;
  }, [previewThemeId, activeTheme]);

  // Apply CSS variables whenever effectiveTheme changes
  useEffect(() => {
    applyThemeToDom(effectiveTheme);
  }, [effectiveTheme]);

  // Real-time synchronization with Firebase Firestore (collection: 'themeSettings', doc: 'global')
  useEffect(() => {
    setIsLoading(true);
    const themeDocRef = doc(db, 'themeSettings', 'global');

    const unsubscribe = onSnapshot(
      themeDocRef,
      (snapshot) => {
        setIsLoading(false);
        if (snapshot.exists()) {
          const data = snapshot.data() as ThemeSettingsDocument;
          const remoteThemeId = data.activeThemeId;
          if (remoteThemeId && FESTIVAL_THEMES[remoteThemeId]) {
            setActiveThemeId(remoteThemeId);
            try {
              localStorage.setItem(STORAGE_KEY, remoteThemeId);
            } catch {
              // ignore
            }
          }
        } else {
          // Document does not exist yet; initialize default theme in Firestore
          setDoc(
            themeDocRef,
            {
              activeThemeId: DEFAULT_THEME_ID,
              updatedAt: new Date().toISOString(),
              version: 1,
            },
            { merge: true }
          ).catch((err) => {
            console.warn('Initial themeSettings bootstrap note:', err);
          });
        }
      },
      (err) => {
        console.warn('Firestore themeSettings listener notice:', err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Activate theme and save to Firebase Firestore
  const activateTheme = useCallback(
    async (themeId: FestivalThemeId, adminName?: string, adminEmail?: string): Promise<boolean> => {
      if (!FESTIVAL_THEMES[themeId]) {
        setError('अमान्य थीम चयन (Invalid theme selection)');
        return false;
      }

      setIsSaving(true);
      setError(null);

      // Immediately activate theme locally and persist to localStorage
      setActiveThemeId(themeId);
      setPreviewThemeId(null);
      try {
        localStorage.setItem(STORAGE_KEY, themeId);
      } catch {
        // ignore
      }

      try {
        const themeDocRef = doc(db, 'themeSettings', 'global');
        const payload: ThemeSettingsDocument = {
          activeThemeId: themeId,
          updatedAt: new Date().toISOString(),
          updatedBy: adminName || 'Administrator',
          updatedByEmail: adminEmail || '',
        };

        await setDoc(themeDocRef, payload, { merge: true });
        setIsSaving(false);
        return true;
      } catch (err: any) {
        console.warn('Firebase theme sync note:', err);
        // Even if remote Firebase has a temporary delay or sync issue, local activation remains active
        setIsSaving(false);
        return true;
      }
    },
    []
  );

  // In-memory preview function (does not write to Firebase until activated)
  const previewTheme = useCallback((themeId: FestivalThemeId | null) => {
    if (themeId && FESTIVAL_THEMES[themeId]) {
      setPreviewThemeId(themeId);
    } else {
      setPreviewThemeId(null);
    }
  }, []);

  const resetPreview = useCallback(() => {
    setPreviewThemeId(null);
  }, []);

  const activeMetadata = useMemo(() => activeTheme.metadata, [activeTheme]);
  const effectiveMetadata = useMemo(() => effectiveTheme.metadata, [effectiveTheme]);

  const monthOrder: Record<string, number> = useMemo(() => ({
    january: 1, 'जनवरी': 1,
    february: 2, 'फरवरी': 2,
    march: 3, 'मार्च': 3,
    april: 4, 'अप्रैल': 4,
    may: 5, 'मई': 5,
    june: 6, 'जून': 6,
    july: 7, 'जुलाई': 7,
    august: 8, 'अगस्त': 8,
    september: 9, 'सितंबर': 9,
    october: 10, 'अक्टूबर': 10,
    november: 11, 'नवंबर': 11,
    december: 12, 'दिसंबर': 12,
  }), []);

  const getUpcomingThemes = useCallback((): FestivalTheme[] => {
    const currentMonth = new Date().getMonth() + 1; // 1 to 12
    return [...THEME_LIST]
      .filter((t) => t.category === 'festival' && t.metadata?.dates)
      .sort((a, b) => {
        const monthA = a.metadata?.dates.approximateMonth?.toLowerCase() || '';
        const monthB = b.metadata?.dates.approximateMonth?.toLowerCase() || '';
        const orderA = monthOrder[monthA] || 12;
        const orderB = monthOrder[monthB] || 12;
        const diffA = (orderA - currentMonth + 12) % 12;
        const diffB = (orderB - currentMonth + 12) % 12;
        return diffA - diffB;
      });
  }, [monthOrder]);

  const getThemesByMonth = useCallback((month: string): FestivalTheme[] => {
    if (!month) return THEME_LIST;
    const q = month.toLowerCase().trim();
    return THEME_LIST.filter((t) => {
      const m = t.metadata?.dates.approximateMonth?.toLowerCase() || '';
      const mh = t.metadata?.dates.approximateMonthHindi?.toLowerCase() || '';
      return m.includes(q) || mh.includes(q);
    });
  }, []);

  const searchThemesWithMetadata = useCallback((query: string): FestivalTheme[] => {
    if (!query.trim()) return THEME_LIST;
    const q = query.toLowerCase().trim();
    return THEME_LIST.filter((t) => {
      if (
        t.name.toLowerCase().includes(q) ||
        t.nameHindi.toLowerCase().includes(q) ||
        t.tagline.toLowerCase().includes(q) ||
        t.taglineHindi.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
      ) {
        return true;
      }
      const meta = t.metadata;
      if (!meta) return false;
      return (
        meta.localizedNames.en.toLowerCase().includes(q) ||
        meta.localizedNames.hi.toLowerCase().includes(q) ||
        (meta.localizedNames.regional && meta.localizedNames.regional.toLowerCase().includes(q)) ||
        (meta.localizedNames.regionalLanguage && meta.localizedNames.regionalLanguage.toLowerCase().includes(q)) ||
        meta.dates.displayDates.toLowerCase().includes(q) ||
        meta.dates.displayDatesHindi.toLowerCase().includes(q) ||
        meta.dates.approximateMonth.toLowerCase().includes(q) ||
        meta.dates.approximateMonthHindi.toLowerCase().includes(q) ||
        (meta.dates.tithiPanchang && meta.dates.tithiPanchang.toLowerCase().includes(q)) ||
        (meta.culturalRegion && meta.culturalRegion.toLowerCase().includes(q)) ||
        (meta.culturalRegionHindi && meta.culturalRegionHindi.toLowerCase().includes(q)) ||
        meta.icons.symbols.some((s) => s.includes(q))
      );
    });
  }, []);

  const contextValue: ThemeContextType = {
    activeThemeId,
    activeTheme,
    previewThemeId,
    effectiveTheme,
    availableThemes: THEME_LIST,
    activateTheme,
    previewTheme,
    resetPreview,
    isLoading,
    isSaving,
    error,
    activeMetadata,
    effectiveMetadata,
    getUpcomingThemes,
    getThemesByMonth,
    searchThemesWithMetadata,
  };

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
