import React, { useState, useEffect } from 'react';
import { TRADE_IMAGES } from '../../utils/tradeImages';

interface TradeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  tradeKey?: 'carpenter' | 'handicraft' | 'electrician' | 'painting' | 'plumber' | 'mechanic' | 'security';
  fallbackSrc?: string;
  alt: string;
}

export const TradeImage: React.FC<TradeImageProps> = ({
  tradeKey,
  src,
  fallbackSrc,
  alt,
  className = '',
  ...rest
}) => {
  const meta = tradeKey ? TRADE_IMAGES[tradeKey] : undefined;
  const initialSrc = src || (meta ? meta.uploaded : '');
  const resolvedFallback = fallbackSrc || (meta ? meta.fallback : '');

  const [currentSrc, setCurrentSrc] = useState<string>(initialSrc);
  const [hasFailed, setHasFailed] = useState<boolean>(false);

  useEffect(() => {
    setCurrentSrc(src || (meta ? meta.uploaded : ''));
    setHasFailed(false);
  }, [src, tradeKey, meta]);

  const handleError = () => {
    if (!hasFailed && resolvedFallback && currentSrc !== resolvedFallback) {
      setHasFailed(true);
      setCurrentSrc(resolvedFallback);
    }
  };

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      onError={handleError}
      loading="lazy"
      decoding="async"
      {...rest}
    />
  );
};
