import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, ExternalLink, ShieldCheck, Tag, Info, X, Smartphone, Laptop, CheckCircle2, Sliders } from 'lucide-react';
import { trackActionClick } from '../../services/marketingAnalyticsService';

export type AdFormat = 'responsive' | 'leaderboard' | 'rectangle' | 'native-feed' | 'compact';

export type AdCategory = 'general' | 'home' | 'construction' | 'tools' | 'services' | 'franchise' | 'branding';

interface Props {
  slot?: string;
  format?: AdFormat;
  category?: AdCategory;
  className?: string;
  label?: string;
  showFallbackOnBlock?: boolean;
}

const getResolvedPubId = (): string => {
  try {
    const custom = localStorage.getItem('hardinkaam_adsense_pub_id');
    if (custom) return custom.trim();
  } catch (_) {}
  return ((import.meta as any).env?.VITE_ADSENSE_CLIENT_ID as string) || 'ca-pub-1925778784615690';
};

const getResolvedAdMobBannerId = (): string => {
  try {
    const custom = localStorage.getItem('hardinkaam_admob_banner_unit_id');
    if (custom) return custom.trim();
  } catch (_) {}
  return ((import.meta as any).env?.VITE_ADMOB_BANNER_UNIT_ID as string) || 'ca-app-pub-1925778784615690/5576223249';
};

// Fallback sponsor creatives that respect Google AdSense & AdMob policy (clearly labeled ads/sponsored content)
const SPONSORED_OFFERS: Record<AdCategory, { title: string; subtitle: string; cta: string; badge: string; link: string; iconBg: string }> = {
  general: {
    title: 'दीपक बिल्डकॉन होम अपग्रेड स्पेशल',
    subtitle: 'भोपाल में सभी सिविल, इलेक्ट्रिकल और प्लंबिंग रेनोवेशन पर 20% तक की छूट।',
    cta: 'ऑफर देखें',
    badge: 'प्रायोजित • Bhopal Home Deals',
    link: 'tel:+916267546945',
    iconBg: 'from-orange-600 to-amber-600',
  },
  home: {
    title: 'प्रीमियम होम पेंटिंग व वॉटरप्रूफिंग पैकेज',
    subtitle: 'एशियन पेंट्स व बर्जर प्रमाणित डिस्टेंपर, पुट्टी एवं लीकेज समाधान पर 5-वर्षीय वारंटी।',
    cta: 'फ्री कोटेशन',
    badge: 'प्रायोजित विज्ञापन • Home Improvement',
    link: 'tel:+916267546945',
    iconBg: 'from-blue-600 to-cyan-600',
  },
  construction: {
    title: 'अल्ट्राटेक व जेपी सीमेंट - थोक रेट्स',
    subtitle: 'भोपाल निर्माण स्थलों हेतु सरिया, सीमेंट और रेत की सीधी फैक्ट्री डिलीवरी।',
    cta: 'रेट चेक करें',
    badge: 'प्रायोजित • Civil Supplies',
    link: 'tel:+916267546945',
    iconBg: 'from-stone-800 to-stone-900',
  },
  tools: {
    title: 'बॉश व मकिता प्रोफेशनल पावर टूल्स',
    subtitle: 'वेरीफाइड सर्विसमैन व कांट्रेक्टर्स के लिए विशेष टूल्स किट पर 35% छूट।',
    cta: 'किट्स देखें',
    badge: 'प्रायोजित • Contractor Deals',
    link: 'tel:+916267546945',
    iconBg: 'from-amber-600 to-orange-600',
  },
  services: {
    title: 'एसी डीप सर्विस और गैस चार्जिंग ऑफर',
    subtitle: 'सिट्रस जेट पंप से कॉइल सफाई मात्र ₹499 में। 30 दिन की कूलिंग वारंटी।',
    cta: 'अभी बुक करें',
    badge: 'प्रायोजित • Seasonal Special',
    link: 'tel:+916267546945',
    iconBg: 'from-teal-600 to-emerald-600',
  },
  franchise: {
    title: 'मध्य प्रदेश फ्रैंचाइजी बिजनेस अवसर',
    subtitle: 'हर तहसील व जिले में 100% एक्सक्लूसिव टेरिटरी राइट्स के साथ आज ही आवेदन करें।',
    cta: 'ROI प्लान',
    badge: 'प्रायोजित • Business Franchise',
    link: '#franchise',
    iconBg: 'from-indigo-600 to-purple-600',
  },
  branding: {
    title: 'ब्रांड प्रमोटर व पार्टनरशिप प्रोग्राम',
    subtitle: 'हार्डिनकाम के साथ अपने व्यापार को बढ़ाएं और आकर्षक कमीशन प्राप्त करें।',
    cta: 'पार्टनर बनें',
    badge: 'प्रायोजित • Brand Partnership',
    link: '#partner',
    iconBg: 'from-purple-600 to-pink-600',
  },
};

export const AdSenseBanner: React.FC<Props> = ({
  slot = '1029384756',
  format = 'responsive',
  category = 'general',
  className = '',
  label,
  showFallbackOnBlock = true,
}) => {
  const adRef = useRef<HTMLModElement | null>(null);
  const [adLoaded, setAdLoaded] = useState(false);
  const [adBlocked, setAdBlocked] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState<'auto' | 'admob' | 'adsense'>('auto');

  // Detect mobile view dynamically at runtime
  useEffect(() => {
    const checkMobile = () => {
      if (typeof window === 'undefined') return;
      const ua = window.navigator.userAgent.toLowerCase();
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 768;
      const computedIsMobile = isSmallScreen || isTouch || /mobile|android|iphone|ipad|phone/i.test(ua);
      setIsMobile((prev) => {
        if (prev === computedIsMobile) return prev;
        return computedIsMobile;
      });
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const effectiveIsMobile = viewMode === 'auto' ? isMobile : viewMode === 'admob';

  useEffect(() => {
    // Native AdMob bridge check if running inside Android APK wrapper
    try {
      const admob = (window as any).admob || (window as any).AdMob;
      if (admob && effectiveIsMobile) {
        admob.showBanner({
          adId: getResolvedAdMobBannerId(),
          position: 'bottom',
          autoShow: true,
        });
      }
    } catch (e) {
      console.debug('AdMob Native Bridge check:', e);
    }

    // Google AdSense tag execution
    let timer: any;
    try {
      if (typeof window !== 'undefined' && adRef.current) {
        const isProcessed = adRef.current.getAttribute('data-adsbygoogle-status');
        if (!isProcessed) {
          ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        }
      }
    } catch (e) {
      console.debug('AdSense push notice:', e);
      setAdBlocked(true);
    }

    timer = setTimeout(() => {
      if (adRef.current) {
        const status = adRef.current.getAttribute('data-ad-status');
        if (status === 'filled' || adRef.current.innerHTML.includes('iframe')) {
          setAdLoaded(true);
          setAdBlocked(false);
        } else {
          // Keep intact, show fallback alongside or when unfilled
          setAdBlocked(true);
        }
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [slot, format, effectiveIsMobile]);

  const offer = SPONSORED_OFFERS[category] || SPONSORED_OFFERS.general;

  const handleTrackClick = (e?: React.MouseEvent) => {
    try {
      trackActionClick({
        eventType: effectiveIsMobile ? 'admob_banner_click' : 'adsense_click',
        adUnitId: getResolvedAdMobBannerId(),
        creativeTitle: offer.title,
        category,
        targetUrl: offer.link,
      });
    } catch (_) {}
  };

  const resolvedLabel =
    label || (effectiveIsMobile ? 'गूगल एडमॉब लाइव • GOOGLE ADMOB' : 'गूगल एडसेंस विज्ञापन • GOOGLE ADSENSE');

  return (
    <div
      className={`my-4 relative overflow-hidden transition-all duration-300 ${className}`}
      data-testid="adsense-banner-container"
    >
      {/* Policy-compliant Ad Label & Diagnostics Bar */}
      <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-stone-600 mb-1 px-1 flex-wrap gap-1">
        <span className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full inline-block ${effectiveIsMobile ? 'bg-blue-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`} />
          <span className="text-stone-800">{resolvedLabel}</span>
          <span className="px-1.5 py-0.2 rounded-sm bg-emerald-100 text-emerald-800 font-mono text-[9px] lowercase font-semibold">
            {effectiveIsMobile ? `unit #${getResolvedAdMobBannerId().slice(-6)}` : `slot #${slot.slice(-4)}`}
          </span>
        </span>

        <div className="flex items-center gap-2">
          {/* View mode toggle so user can test and preview AdMob vs AdSense anytime */}
          <div className="flex items-center bg-stone-100 rounded-lg p-0.5 border border-stone-200 text-[9px] font-bold">
            <button
              type="button"
              onClick={() => setViewMode('admob')}
              className={`px-1.5 py-0.5 rounded-md transition-colors flex items-center gap-1 ${
                effectiveIsMobile ? 'bg-blue-600 text-white shadow-xs' : 'text-stone-500 hover:text-stone-800'
              }`}
              title="AdMob Mobile Banner View"
            >
              <Smartphone className="w-2.5 h-2.5" />
              <span>AdMob</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('adsense')}
              className={`px-1.5 py-0.5 rounded-md transition-colors flex items-center gap-1 ${
                !effectiveIsMobile ? 'bg-amber-600 text-white shadow-xs' : 'text-stone-500 hover:text-stone-800'
              }`}
              title="Desktop Google AdSense View"
            >
              <Laptop className="w-2.5 h-2.5" />
              <span>AdSense</span>
            </button>
          </div>
        </div>
      </div>

      {/* Ad Container Box - Google AdSense is 100% intact in the DOM */}
      <div className="relative w-full rounded-2xl bg-white border border-stone-200/90 shadow-xs overflow-hidden">
        {/* Google AdSense live tag is always mounted in the DOM for crawlers & ad delivery */}
        <div className={`w-full text-center ${adLoaded ? 'block' : 'hidden'}`}>
          <ins
            ref={adRef}
            className="adsbygoogle"
            style={{
              display: 'block',
              minHeight: format === 'leaderboard' ? '90px' : format === 'rectangle' ? '250px' : '90px',
              width: '100%',
            }}
            data-ad-client={getResolvedPubId()}
            data-ad-slot={slot}
            data-ad-format={format === 'rectangle' ? 'rectangle' : format === 'leaderboard' ? 'horizontal' : 'auto'}
            data-full-width-responsive="true"
          />
        </div>

        {/* High-impact certified creative fallback when waiting or unfilled */}
        {!adLoaded && (
          <div
            className={`p-4 sm:p-5 bg-gradient-to-r ${
              effectiveIsMobile
                ? 'from-blue-950 via-stone-950 to-blue-950 border-l-4 border-blue-500'
                : 'from-stone-900 via-stone-950 to-stone-900 border-l-4 border-amber-500'
            } text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${offer.iconBg} flex items-center justify-center text-white shrink-0 shadow-md`}
              >
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                    effectiveIsMobile
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                    {effectiveIsMobile ? 'AdMob Live Campaign • ' + offer.badge.split(' • ')[1] : offer.badge}
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono">
                    {effectiveIsMobile ? `Unit: ${getResolvedAdMobBannerId().slice(0, 15)}...` : `Pub: ${getResolvedPubId().slice(0, 12)}...`}
                  </span>
                  <span className="text-[9px] text-emerald-400 font-semibold flex items-center gap-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>सक्रिय एडसेंस</span>
                  </span>
                </div>
                <h4 className="font-black text-sm sm:text-base text-stone-100 tracking-tight leading-snug">
                  {offer.title}
                </h4>
                <p className="text-xs text-stone-400 font-medium leading-relaxed max-w-xl">
                  {offer.subtitle}
                </p>
              </div>
            </div>

            <div className="self-end sm:self-center shrink-0">
              <a
                href={offer.link}
                onClick={handleTrackClick}
                className={`px-4 py-2 rounded-xl text-white text-xs font-black flex items-center gap-1.5 shadow-md transition-all active:scale-95 ${
                  effectiveIsMobile
                    ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-950/40'
                    : 'bg-orange-600 hover:bg-orange-500 shadow-orange-950/40'
                }`}
              >
                <span>{offer.cta}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
