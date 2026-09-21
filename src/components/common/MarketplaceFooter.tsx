import React from 'react';
import {
  Wrench,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Award,
  Globe,
  CheckCircle,
  Clock,
  Heart,
  Smartphone,
  Download,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '../../utils/translations';

interface Props {
  onSelectTab: (tab: string) => void;
  onOpenHelp: () => void;
  onOpenPlayStoreApk?: () => void;
}

export const MarketplaceFooter: React.FC<Props> = ({ onSelectTab, onOpenHelp, onOpenPlayStoreApk }) => {
  const { t, language, setLanguage } = useLanguage();

  return (
    <footer className="bg-stone-950 text-stone-300 border-t border-stone-800 mt-16 pt-12 pb-24 sm:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Top brand & helpline bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-orange-600 via-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-600/20">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <span className="font-black text-2xl tracking-tight text-white">
                HARDIN<span className="text-orange-500">KAAM</span>
              </span>
              <p className="text-xs text-stone-400 font-medium">
                {t('brandTagline', 'Everyday Services • Trusted Partner')} • भोपाल • <strong className="text-amber-400 font-bold">DEEPAK BUILDCON</strong>
              </p>
            </div>
          </div>

          {/* Quick Helplines & Android App Hub */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {onOpenPlayStoreApk && (
              <button
                type="button"
                onClick={onOpenPlayStoreApk}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold border border-orange-400/30 transition shadow-sm active:scale-95 cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-amber-200" />
                <span>📲 Download App (PWA / APK)</span>
              </button>
            )}

            <a
              href="tel:+919826012345"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-800 transition-colors"
            >
              <Phone className="w-4 h-4 text-orange-500" />
              <span>+91 98260 12345 (Helpline)</span>
            </a>
            <a
              href="https://wa.me/919826012345"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800/40 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>WhatsApp: +91 98260 12345</span>
            </a>
          </div>
        </div>

        {/* 4 Main Columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-xs">
          {/* Col 1: About HARDINKAAM */}
          <div className="space-y-3 col-span-2 md:col-span-1">
            <h4 className="font-bold text-white text-sm uppercase tracking-wider">
              {t('aboutHardinkaam', 'About HARDINKAAM')}
            </h4>
            <p className="text-stone-400 leading-relaxed">
              Bhopal's homegrown, on-demand home services platform connecting thousands of local households with KYC and police-verified electricians, plumbers, AC technicians, painters, and cleaning pros.
            </p>
            <div className="flex items-start gap-2 text-stone-400 pt-1">
              <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
              <span>S-2, Ashirwad Complex, Zone-1, M.P. Nagar, Bhopal, MP - 462011</span>
            </div>
          </div>

          {/* Col 2: For Customers */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-white text-sm uppercase tracking-wider">
              {t('customerServices', 'For Customers')}
            </h4>
            <ul className="space-y-2 text-stone-400">
              <li>
                <button
                  onClick={() => onSelectTab('home')}
                  className="hover:text-orange-400 transition-colors cursor-pointer text-left"
                >
                  {t('showAllCategories', 'All Services & Categories')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTab('bookings')}
                  className="hover:text-orange-400 transition-colors cursor-pointer text-left"
                >
                  {t('myBookings', 'My Bookings & History')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTab('wallet')}
                  className="hover:text-orange-400 transition-colors cursor-pointer text-left"
                >
                  HARDINKAAM Wallet
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenHelp}
                  className="hover:text-orange-400 transition-colors cursor-pointer text-left"
                >
                  {t('customerHelp', 'Help & FAQs')}
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenHelp}
                  className="hover:text-orange-400 transition-colors cursor-pointer text-left"
                >
                  7-Day Service Warranty
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: For Professionals & Partners */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-white text-sm uppercase tracking-wider">
              {t('forProfessionals', 'For Professionals')}
            </h4>
            <ul className="space-y-2 text-stone-400">
              <li>
                <button
                  onClick={() => onSelectTab('pro_dashboard')}
                  className="hover:text-orange-400 transition-colors cursor-pointer text-left"
                >
                  {t('becomeAPro', 'Service Pro Dashboard')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTab('pro_kyc')}
                  className="hover:text-orange-400 transition-colors cursor-pointer text-left"
                >
                  KYC Verification &amp; Police Check
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTab('partner_dashboard')}
                  className="hover:text-orange-400 transition-colors cursor-pointer text-left"
                >
                  {t('partnerWithUs', 'Business Partner Fleet')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTab('pro_wallet')}
                  className="hover:text-orange-400 transition-colors cursor-pointer text-left"
                >
                  Daily Instant Payouts
                </button>
              </li>
              <li className="pt-1">
                <button
                  onClick={() => onSelectTab('franchise')}
                  className="text-amber-400 hover:text-amber-300 font-bold transition-colors cursor-pointer text-left flex items-center gap-1.5 bg-amber-950/60 px-2 py-1 rounded-lg border border-amber-600/40"
                >
                  <span>🤝 पूरे भारत में फ्रेंचाइज़ी लें</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Trust, Safety & Language */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-sm uppercase tracking-wider">
              {t('trustTitle', 'Trust & Security')}
            </h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-stone-400">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Police &amp; KYC Verified Pros</span>
              </div>
              <div className="flex items-center gap-2 text-stone-400">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>Zero Advance Payment</span>
              </div>
              <div className="flex items-center gap-2 text-stone-400">
                <Award className="w-4 h-4 text-emerald-500" />
                <span>7-Day Revisit Assurance</span>
              </div>
            </div>

            {/* Language Selector in Footer */}
            <div className="pt-2">
              <label className="text-[11px] font-bold text-stone-400 block mb-1.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-orange-500" />
                <span>भाषा चुनें / Select Language:</span>
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
                className="w-full text-xs p-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 focus:outline-hidden focus:border-orange-500"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.nativeName} ({lang.name})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Bhopal Localities Coverage strip */}
        <div className="pt-6 border-t border-stone-800/80 text-[11px] text-stone-400">
          <p className="font-bold text-stone-300 mb-1.5">
            Serving Bhopal Localities:
          </p>
          <p className="leading-relaxed">
            MP Nagar Zone 1 &amp; 2 • Arera Colony (E1-E7) • Kolar Road • Indrapuri • TT Nagar • New Market • Hoshangabad Road • Ayodhya Bypass • Shahpura • Chunabhatti • Bairagarh • Ashoka Garden • Govindpura • Katara Hills • Karond • Nehru Nagar • Piplani.
          </p>
        </div>

        {/* Bottom copyright */}
        <div className="pt-6 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-stone-400">
          <p>© {new Date().getFullYear()} HARDINKAAM. {t('allRightsReserved', 'All Rights Reserved.')}</p>
          <p className="flex items-center gap-1 text-stone-300">
            {t('madeWithLoveInBhopal', 'Proudly built for Bhopal ❤️')}
          </p>
        </div>
      </div>
    </footer>
  );
};
