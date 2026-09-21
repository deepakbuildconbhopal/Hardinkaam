import React, { useState, useEffect, useRef } from 'react';

export interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  placeholderClassName?: string;
  rootMargin?: string;
  threshold?: number;
}

/**
 * High-performance LazyImage component utilizing Intersection Observer pattern
 * with native loading="lazy", decoding="async", and graceful fallback error handling.
 */
export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  fallbackSrc,
  className = '',
  placeholderClassName = '',
  rootMargin = '250px 0px',
  threshold = 0.01,
  loading = 'lazy',
  decoding = 'async',
  onError,
  onLoad,
  ...rest
}) => {
  const [isIntersecting, setIsIntersecting] = useState<boolean>(() => {
    // Data URLs and empty strings can be loaded immediately without deferral
    return typeof src === 'string' && (src.startsWith('data:') || src.startsWith('blob:'));
  });
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [currentSrc, setCurrentSrc] = useState<string>(() => {
    return typeof src === 'string' && (src.startsWith('data:') || src.startsWith('blob:')) ? src : '';
  });
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (typeof src === 'string' && (src.startsWith('data:') || src.startsWith('blob:'))) {
      setIsIntersecting(true);
      setCurrentSrc(src);
      setIsLoaded(false);
      setHasError(false);
      return;
    }

    setIsLoaded(false);
    setHasError(false);

    if (!src) return;

    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      let isSubscribed = true;
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && isSubscribed) {
              setIsIntersecting(true);
              setCurrentSrc(src);
              if (imgRef.current) {
                observer.unobserve(imgRef.current);
              }
            }
          });
        },
        { rootMargin, threshold }
      );

      if (imgRef.current) {
        observer.observe(imgRef.current);
      }

      return () => {
        isSubscribed = false;
        observer.disconnect();
      };
    } else {
      // Fallback for environments lacking IntersectionObserver
      setIsIntersecting(true);
      setCurrentSrc(src);
    }
  }, [src, rootMargin, threshold]);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!hasError && fallbackSrc && currentSrc !== fallbackSrc) {
      setHasError(true);
      setCurrentSrc(fallbackSrc);
    }
    if (onError) onError(e);
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoaded(true);
    if (onLoad) onLoad(e);
  };

  // If not yet intersecting and no data URL, use 1x1 transparent placeholder or empty src
  // so browser doesn't pre-fetch bandwidth
  const effectiveSrc = isIntersecting
    ? currentSrc || src
    : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>';

  return (
    <img
      ref={imgRef}
      src={effectiveSrc}
      alt={alt}
      loading={loading}
      decoding={decoding}
      referrerPolicy="no-referrer"
      onError={handleImageError}
      onLoad={handleImageLoad}
      className={`${className} ${
        isLoaded ? 'opacity-100' : 'opacity-90'
      } transition-opacity duration-200`}
      {...rest}
    />
  );
};
