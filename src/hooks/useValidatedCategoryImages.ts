import { useState, useEffect, useRef, useCallback } from 'react';
import { Category } from '../types';

/**
 * In-memory global validation cache:
 * Key: trimmed image URL string
 * Value: boolean (true = verified successfully loaded, false = broken/invalid)
 */
const globalImageValidityCache = new Map<string, boolean>();

/**
 * Checks if a category has a syntactically valid image URL format
 * (non-empty string, valid protocol/format, not a default placeholder/dummy)
 */
export function isValidImageUrlFormat(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.length < 10) return false;
  if (
    trimmed === 'null' ||
    trimmed === 'undefined' ||
    trimmed.includes('default-icon') ||
    trimmed.includes('placeholder-icon') ||
    trimmed === 'icon'
  ) {
    return false;
  }
  // Must be an HTTP(S) URL, Firebase Storage URL, or a valid data/blob image
  return (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('/')
  );
}

/**
 * Asynchronously verifies if an image URL loads successfully without errors
 * and has positive dimensions.
 */
export function verifyImageUrl(url: string, timeoutMs = 7000): Promise<boolean> {
  const trimmed = url.trim();
  if (!isValidImageUrlFormat(trimmed)) {
    globalImageValidityCache.set(trimmed, false);
    return Promise.resolve(false);
  }

  if (globalImageValidityCache.has(trimmed)) {
    return Promise.resolve(globalImageValidityCache.get(trimmed)!);
  }

  return new Promise<boolean>((resolve) => {
    let hasResolved = false;
    const img = new Image();
    img.referrerPolicy = 'no-referrer';

    const timer = setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true;
        globalImageValidityCache.set(trimmed, false);
        resolve(false);
      }
    }, timeoutMs);

    img.onload = () => {
      if (!hasResolved) {
        hasResolved = true;
        clearTimeout(timer);
        const isValid = img.naturalWidth > 0 && img.naturalHeight > 0;
        globalImageValidityCache.set(trimmed, isValid);
        resolve(isValid);
      }
    };

    img.onerror = () => {
      if (!hasResolved) {
        hasResolved = true;
        clearTimeout(timer);
        globalImageValidityCache.set(trimmed, false);
        resolve(false);
      }
    };

    try {
      img.src = trimmed;
    } catch {
      if (!hasResolved) {
        hasResolved = true;
        clearTimeout(timer);
        globalImageValidityCache.set(trimmed, false);
        resolve(false);
      }
    }
  });
}

/**
 * Custom Hook: useValidatedCategoryImages
 * 
 * Strict Category Image Visibility Rule for Home/Landing Page:
 * 1. ONLY service categories with a valid, non-empty, successfully loaded image
 *    are displayed on the Home page.
 * 2. Categories with null, undefined, empty, broken, or failed-to-load images
 *    are strictly hidden from the Home page.
 * 3. As soon as Admin uploads or assigns a valid image in Firebase, the category
 *    automatically appears on the Home page.
 * 4. If Admin removes the image or it becomes invalid, it automatically hides.
 * 5. Admin Panel retains access to all categories in the database.
 */
export function useValidatedCategoryImages(categories: Category[]) {
  // Store the set of verified valid category IDs
  const [validCategoryIds, setValidCategoryIds] = useState<Set<string>>(() => {
    const initialSet = new Set<string>();
    for (const cat of categories) {
      if (cat.imageUrl && isValidImageUrlFormat(cat.imageUrl)) {
        if (globalImageValidityCache.get(cat.imageUrl.trim()) === true) {
          initialSet.add(cat.id);
        }
      }
    }
    return initialSet;
  });

  const [isValidating, setIsValidating] = useState<boolean>(true);

  // Track active verification lifecycle to avoid stale state updates
  const activeVerificationIdRef = useRef(0);

  useEffect(() => {
    let isSubscribed = true;
    const currentVerificationId = ++activeVerificationIdRef.current;

    // Filter categories that have potentially valid URLs
    const categoriesToVerify = categories.filter(
      (cat) => cat.imageUrl && isValidImageUrlFormat(cat.imageUrl)
    );

    // If no categories have valid image URLs, visible set is empty
    if (categoriesToVerify.length === 0) {
      setValidCategoryIds(new Set());
      setIsValidating(false);
      return;
    }

    // Check synchronous cache first to provide instant rendering for already validated URLs
    const syncValidSet = new Set<string>();
    const pendingCategories: Category[] = [];

    for (const cat of categoriesToVerify) {
      const url = cat.imageUrl!.trim();
      const cached = globalImageValidityCache.get(url);
      if (cached === true) {
        syncValidSet.add(cat.id);
      } else if (cached === false) {
        // Known invalid - skip
      } else {
        // Needs asynchronous network validation
        pendingCategories.push(cat);
      }
    }

    // Update state with any instantly available cached valid IDs
    setValidCategoryIds((prev) => {
      const updated = new Set(syncValidSet);
      // Clean up any ID that was deleted or whose image URL changed
      for (const id of prev) {
        const cat = categories.find((c) => c.id === id);
        if (
          cat &&
          cat.imageUrl &&
          isValidImageUrlFormat(cat.imageUrl) &&
          globalImageValidityCache.get(cat.imageUrl.trim()) === true
        ) {
          updated.add(id);
        }
      }
      return updated;
    });

    if (pendingCategories.length === 0) {
      setIsValidating(false);
      return;
    }

    setIsValidating(true);

    // Verify all pending category images concurrently
    Promise.all(
      pendingCategories.map(async (cat) => {
        const isValid = await verifyImageUrl(cat.imageUrl!);
        return { id: cat.id, url: cat.imageUrl!.trim(), isValid };
      })
    ).then((results) => {
      if (!isSubscribed || activeVerificationIdRef.current !== currentVerificationId) {
        return;
      }

      setValidCategoryIds((prev) => {
        const next = new Set(prev);
        // Ensure all current categories in next still match valid image criteria
        for (const id of next) {
          const cat = categories.find((c) => c.id === id);
          if (
            !cat ||
            !cat.imageUrl ||
            !isValidImageUrlFormat(cat.imageUrl) ||
            globalImageValidityCache.get(cat.imageUrl.trim()) === false
          ) {
            next.delete(id);
          }
        }
        for (const { id, isValid } of results) {
          if (isValid) {
            next.add(id);
          } else {
            next.delete(id);
          }
        }
        return next;
      });

      setIsValidating(false);
    });

    return () => {
      isSubscribed = false;
    };
  }, [categories]);

  // Callback to immediately hide a category if DOM <img /> encounters a runtime load error
  const handleCategoryMediaError = useCallback((categoryId: string, imageUrl?: string) => {
    if (imageUrl) {
      globalImageValidityCache.set(imageUrl.trim(), false);
    }
    setValidCategoryIds((prev) => {
      if (!prev.has(categoryId)) return prev;
      const next = new Set(prev);
      next.delete(categoryId);
      return next;
    });
  }, []);

  // Filtered categories containing ONLY those with successfully loaded & validated pictures
  const visibleCategories = categories.filter((cat) => validCategoryIds.has(cat.id));

  return {
    visibleCategories,
    isValidating,
    handleCategoryMediaError,
  };
}
