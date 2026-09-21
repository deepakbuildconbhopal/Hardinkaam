import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, ExternalLink, ShieldCheck, Tag, Info, X } from 'lucide-react';

export type AdFormat = 'responsive' | 'leaderboard' | 'rectangle' | 'native-feed' | 'compact';

export type AdCategory = 'general' | 'home' | 'construction' | 'tools' | 'services' | 'franchise';

interface Props {
  slot?: string;
  format?: AdFormat;
  category?: AdCategory;
  className?: string;
  label?: string;
  showFallbackOnBlock?: boolean;
}

const DEFAULT_PUB_ID = ((import.meta as any).env?.VITE_ADSENSE_CLIENT_ID as string) || 'ca-pub-6427755582290432';

// Fallback sponsor creatives that respect Google AdSense policy (clearly labeled ads/sponsored content)
const SPONSORED_OFFERS: Record<AdCategory, { title: string; subtitle: string; cta: string; badge: string; link: string; iconBg: string }> = {
  general: {
    title: 'दीपक बिल्डकॉन होम अपग्रेड स्पेशल',
    subtitle: 'भोपाल में सभी सिविल, इलेक्ट्रिकल और प्लंबिंग रेनोवेशन पर 20% तक की छूट।',
    cta: 'ऑफर देखें',
    badge: 'प्रायोजित • Bhopal Home Deals',
    link: 'tel:+919826012345',
    iconBg: 'from-orange-600 to-amber-600',
  },
  home: {
    title: 'प्रीमियम होम पेंटिंग व वॉटरप्रूफिंग पैकेज',
    subtitle: 'एशियन पेंट्स व बर्जर प्रमाणित डिस्टेंपर, पुट्टी एवं लीकेज समाधान पर 5-वर्षीय वारंटी।',
    cta: 'फ्री कोटेशन',
    badge: 'प्रायोजित विज्ञापन • Home Improvement',
    link: 'tel:+919826012345',
    iconBg: 'from-blue-600 to-cyan-600',
  },
  construction: {
    title: 'अल्ट्राटेक व जेपी सीमेंट - थोक रेट्स',
    subtitle: 'भोपाल निर्माण स्थलों हेतु सरिया, सीमेंट और रेत की सीधी फैक्ट्री डिलीवरी।',
    cta: 'रेट चेक करें',
    badge: 'प्रायोजित • Civil Supplies',
    link: 'tel:+919826012345',
    iconBg: 'from-stone-800 to-stone-900',
  },
  tools: {
    title: 'बॉश व मकिता प्रोफेशनल पावर टूल्स',
    subtitle: 'वेरीफाइड सर्विसमैन व कांट्रेक्टर्स के लिए विशेष टूल्स किट पर 35% छूट।',
    cta: 'किट्स देखें',
    badge: 'प्रायोजित • Contractor Deals',
    link: 'tel:+919826012345',
    iconBg: 'from-amber-600 to-orange-600',
  },
  services: {
    title: 'एसी डीप सर्विस और गैस चार्जिंग ऑफर',
    subtitle: 'सिट्रस जेट पंप से कॉइल सफाई मात्र ₹499 में। 30 दिन की कूलिंग वारंटी।',
    cta: 'अभी बुक करें',
    badge: 'प्रायोजित • Seasonal Special',
    link: 'tel:+919826012345',
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
};

export const AdSenseBanner: React.FC<Props> = ({
  slot = '1029384756',
  format = 'responsive',
  category = 'general',
  className = '',
  label = 'विज्ञापन • ADVERTISEMENT',
  showFallbackOnBlock = true,
}) => {
  const adRef = useRef<HTMLModElement | null>(null);
  const [adLoaded, setAdLoaded] = useState(false);
  const [adBlocked, setAdBlocked] = useState(false);

  useEffect(() => {
    let timer: any;
    try {
      if (typeof window !== 'undefined') {
        const adsbygoogle = (window as any).adsbygoogle || [];
        // Only push if not already loaded in this ins element
        if (adRef.current && !adRef.current.getAttribute('data-ad-status')) {
          adsbygoogle.push({});
        }
      }
    } catch (e) {
      console.debug('AdSense notice:', e);
      setAdBlocked(true);
    }

    // Check if ad loaded after 2.5 seconds; if not loaded (blocked or dev environment), show styled sponsor banner
    timer = setTimeout(() => {
      if (adRef.current) {
        const status = adRef.current.getAttribute('data-ad-status');
        if (status === 'filled') {
          setAdLoaded(true);
        } else if (!status || status === 'unfilled') {
          setAdBlocked(true);
        }
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [slot]);

  const offer = SPONSORED_OFFERS[category] || SPONSORED_OFFERS.general;

  // Render Google AdSense Unit
  return (
    <div
      className={`my-4 relative overflow-hidden transition-all duration-300 ${className}`}
      data-testid="adsense-banner-container"
    >
      {/* Policy-compliant Ad Label */}
      <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-stone-600 mb-1 px-1">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
          {label}
        </span>
        <span className="text-stone-500 font-normal">Google AdSense Partner</span>
      </div>

      {/* Ad Container Box */}
      <div className="relative w-full rounded-2xl bg-white border border-stone-200/90 shadow-xs overflow-hidden">
        {/* Actual Google AdSense <ins> tag */}
        <div className={adBlocked && showFallbackOnBlock ? 'hidden' : 'block min-h-[90px] w-full text-center'}>
          <ins
            ref={adRef}
            className="adsbygoogle block w-full"
            style={{
              display: 'block',
              minHeight: format === 'leaderboard' ? '90px' : format === 'rectangle' ? '250px' : '90px',
            }}
            data-ad-client={DEFAULT_PUB_ID}
            data-ad-slot={slot}
            data-ad-format={format === 'rectangle' ? 'rectangle' : format === 'leaderboard' ? 'horizontal' : 'auto'}
            data-full-width-responsive="true"
          />
        </div>

        {/* Fallback / Native Sponsored Card (shown if adblocker is on or before ad serves) */}
        {adBlocked && showFallbackOnBlock && (
          <div
            className={`p-4 sm:p-5 bg-gradient-to-r from-stone-900 via-stone-950 to-stone-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${offer.iconBg} flex items-center justify-center text-white shrink-0 shadow-md`}
              >
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider">
                    {offer.badge}
                  </span>
                  <span className="text-[10px] text-stone-500 font-medium">Ad • AdSense Slot #{slot.slice(-4)}</span>
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
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-orange-950/40 transition-colors"
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
