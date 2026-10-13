import { useState, useEffect, useCallback } from 'react';
import {
  SupportedPageId,
  DynamicPageConfig,
  DynamicSectionConfig,
  PageThemeSettings,
} from '../types/pageCustomizer';
import {
  getPageConfig,
  subscribeToPageConfig,
  DEFAULT_PAGE_CONFIGS,
} from '../services/pageCustomizerService';

export function usePageCustomizer(pageId: SupportedPageId = 'home') {
  const [config, setConfig] = useState<DynamicPageConfig>(() => getPageConfig(pageId));

  useEffect(() => {
    const unsubscribe = subscribeToPageConfig(pageId, (updatedConfig) => {
      setConfig(updatedConfig);
    });

    return () => {
      unsubscribe();
    };
  }, [pageId]);

  const refresh = useCallback(() => {
    setConfig(getPageConfig(pageId));
  }, [pageId]);

  const visibleSections = (config?.sections || [])
    .filter((s) => s.visible)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const isSectionVisible = useCallback(
    (sectionId: string) => {
      const found = config?.sections?.find((s) => s.id === sectionId);
      return found ? found.visible : true;
    },
    [config]
  );

  const getSection = useCallback(
    (sectionId: string): DynamicSectionConfig | undefined => {
      return config?.sections?.find((s) => s.id === sectionId);
    },
    [config]
  );

  return {
    config: config || DEFAULT_PAGE_CONFIGS[pageId],
    sections: config?.sections || [],
    visibleSections,
    theme: config?.theme || DEFAULT_PAGE_CONFIGS[pageId].theme,
    isSectionVisible,
    getSection,
    refresh,
  };
}
