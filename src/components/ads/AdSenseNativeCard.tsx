import React from 'react';
import { Sparkles, ExternalLink, Star, ShieldCheck, Tag } from 'lucide-react';
import { AdSenseBanner } from './AdSenseBanner';

interface Props {
  className?: string;
  title?: string;
  subtitle?: string;
  badge?: string;
  ctaText?: string;
  ctaLink?: string;
}

export const AdSenseNativeCard: React.FC<Props> = ({
  className = '',
  title = 'दीपक बिल्डकॉन भोपाल - बिल्डिंग कंस्ट्रक्शन व रेनोवेशन',
  subtitle = 'घर का नक्शा, 3D एलिवेशन, सुपरवाइज्ड सिविल वर्क एवं लीगल कंसल्टेशन। आज ही संपर्क करें।',
  badge = 'प्रायोजित • Featured Sponsor',
  ctaText = 'मुफ्त साइट विजिट',
  ctaLink = 'tel:+919826012345',
}) => {
  return (
    <div
      className={`rounded-3xl border border-amber-400/40 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/60 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden ${className}`}
    >
      {/* Top Banner Tag */}
      <div className="flex items-center justify-between mb-3">
        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-800 text-[10px] font-black uppercase tracking-wider border border-amber-400/30 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-600" />
          {badge}
        </span>
        <span className="text-[10px] font-bold text-stone-600">विज्ञापन</span>
      </div>

      <div className="space-y-2">
        <h4 className="font-black text-stone-900 text-base leading-snug tracking-tight">
          {title}
        </h4>
        <p className="text-xs text-stone-600 font-medium leading-relaxed">
          {subtitle}
        </p>

        <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-bold text-stone-600">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            100% वेरीफाइड
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
            4.9★ रेटेड
          </span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-amber-200/60 flex items-center justify-between">
        <span className="text-[11px] text-stone-600 font-mono">Google AdSense Partner</span>
        <a
          href={ctaLink}
          className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-colors"
        >
          <span>{ctaText}</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};
