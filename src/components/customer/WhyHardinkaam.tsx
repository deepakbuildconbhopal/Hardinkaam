import React from 'react';
import {
  ShieldCheck,
  Tag,
  Clock,
  CheckCircle,
  Zap,
  MapPin,
  Calendar,
  MessageSquare,
  Award,
  Star,
  Layers,
  Sparkles,
  HelpCircle,
  RefreshCw,
  LucideIcon,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export interface ValuePropCard {
  id: string;
  titleKey?: string;
  title: string;
  descKey?: string;
  description: string;
  icon?: LucideIcon;
  badge?: string;
  badgeKey?: string;
  iconBgColor: string;
  iconTextColor: string;
  accentBorder: string;
}

export interface WhyHardinkaamProps {
  id?: string;
  items?: ValuePropCard[];
  variant?: 'dark' | 'light';
  title?: string;
  subtitle?: string;
  badgeText?: string;
  className?: string;
  onItemClick?: (item: ValuePropCard) => void;
  emptyStateTitle?: string;
  emptyStateMessage?: string;
  onResetItems?: () => void;
}

export const CORE_VALUE_PROPOSITIONS: ValuePropCard[] = [
  {
    id: 'verified-professionals',
    titleKey: 'why1Title',
    title: 'Verified Professionals',
    descKey: 'why1Desc',
    description: 'आधार, ट्रेड सर्टिफिकेट व पुलिस बैकग्राउंड वेरिफाइड कुशल कारीगर।',
    icon: ShieldCheck,
    badge: '100% Verified',
    iconBgColor: 'bg-orange-500/15 text-orange-500',
    iconTextColor: 'text-orange-500',
    accentBorder: 'hover:border-orange-500/40 group-hover:border-orange-500/50',
  },
  {
    id: 'easy-booking',
    titleKey: 'why3Title',
    title: 'Easy Booking',
    descKey: 'why3Desc',
    description: 'मात्र 60 सेकंड में बिना किसी झंझट के अपनी सुविधानुसार समय और तारीख चुनें।',
    icon: Clock,
    badge: '60 Seconds',
    iconBgColor: 'bg-cyan-500/15 text-cyan-400',
    iconTextColor: 'text-cyan-400',
    accentBorder: 'hover:border-cyan-500/40 group-hover:border-cyan-500/50',
  },
  {
    id: 'transparent-pricing',
    titleKey: 'why2Title',
    title: 'Transparent Pricing',
    descKey: 'why2Desc',
    description: 'पहले से तय मानक दरें, काम के बाद कोई अप्रत्याशित या छुपा हुआ शुल्क नहीं।',
    icon: Tag,
    badge: 'No Hidden Fees',
    iconBgColor: 'bg-amber-500/15 text-amber-400',
    iconTextColor: 'text-amber-400',
    accentBorder: 'hover:border-amber-500/40 group-hover:border-amber-500/50',
  },
  {
    id: 'secure-payments',
    titleKey: 'why4Title',
    title: 'Secure Payments',
    descKey: 'why4Desc',
    description: 'काम संतोषजनक पूरा होने और OTP सत्यापन के बाद UPI, कार्ड या कैश से सुरक्षित भुगतान।',
    icon: CheckCircle,
    badge: 'Post-Work Pay',
    iconBgColor: 'bg-emerald-500/15 text-emerald-400',
    iconTextColor: 'text-emerald-400',
    accentBorder: 'hover:border-emerald-500/40 group-hover:border-emerald-500/50',
  },
  {
    id: 'customer-ratings',
    titleKey: 'why5Title',
    title: 'Customer Reviews & Ratings',
    descKey: 'why5Desc',
    description: 'स्थानीय भोपाल परिवारों के 100% वास्तविक फीडबैक, स्टार रेटिंग व अनुभव।',
    icon: Star,
    badge: '4.8★ Rating',
    iconBgColor: 'bg-yellow-500/15 text-yellow-400',
    iconTextColor: 'text-yellow-400',
    accentBorder: 'hover:border-yellow-500/40 group-hover:border-yellow-500/50',
  },
  {
    id: 'multiple-services',
    titleKey: 'why6Title',
    title: 'Multiple Home Services',
    descKey: 'why6Desc',
    description: 'इलेक्ट्रीशियन, प्लंबर, कारपेंटर, एसी, वेल्डर से सिविल कंस्ट्रक्शन तक संपूर्ण समाधान।',
    icon: Layers,
    badge: '20+ Categories',
    iconBgColor: 'bg-purple-500/15 text-purple-400',
    iconTextColor: 'text-purple-400',
    accentBorder: 'hover:border-purple-500/40 group-hover:border-purple-500/50',
  },
  {
    id: 'booking-tracking',
    titleKey: 'why7Title',
    title: 'Live Tracking & Reschedule',
    descKey: 'why7Desc',
    description: 'रियल-टाइम एसएमएस व ऐप अपडेट्स, प्रो लोकेशन और कभी भी आसान री-शेड्यूल।',
    icon: Calendar,
    badge: 'Live Status',
    iconBgColor: 'bg-rose-500/15 text-rose-400',
    iconTextColor: 'text-rose-400',
    accentBorder: 'hover:border-rose-500/40 group-hover:border-rose-500/50',
  },
  {
    id: 'dedicated-support',
    titleKey: 'why8Title',
    title: 'Dedicated Customer Support',
    descKey: 'why8Desc',
    description: 'भोपाल लोकल हेल्पलाइन और डायरेक्ट WhatsApp सपोर्ट के साथ तुरंत सहायता।',
    icon: MessageSquare,
    badge: '24x7 Help',
    iconBgColor: 'bg-blue-500/15 text-blue-400',
    iconTextColor: 'text-blue-400',
    accentBorder: 'hover:border-blue-500/40 group-hover:border-blue-500/50',
  },
];

export const WhyHardinkaam: React.FC<WhyHardinkaamProps> = ({
  id = 'why-hardinkaam-section',
  items = CORE_VALUE_PROPOSITIONS,
  variant = 'dark',
  title,
  subtitle,
  badgeText,
  className = '',
  onItemClick,
  emptyStateTitle,
  emptyStateMessage,
  onResetItems,
}) => {
  const { t } = useLanguage();

  const isDark = variant === 'dark';
  const hasItems = Array.isArray(items) && items.length > 0;

  const resolvedTitle = title || t('whyTitle', 'क्यों चुनें HARDINKAAM?');
  const resolvedSubtitle =
    subtitle ||
    t('whySubtitle', 'भोपाल के नागरिकों के विश्वास, सुरक्षा और समय पर खरा उतरने वाली होम सर्विसेज');
  const resolvedBadge = badgeText || t('whyBadge', 'भोपाल का विश्वसनीय मंच');

  return (
    <section
      id={id}
      aria-label={resolvedTitle}
      className={`rounded-3xl p-6 sm:p-10 transition-all ${
        isDark
          ? 'bg-gradient-to-br from-stone-900 via-stone-900 to-stone-950 text-white shadow-xl border border-stone-800'
          : 'bg-white text-stone-900 border border-stone-200 shadow-xs'
      } ${className}`}
    >
      {/* Header Section */}
      <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10 space-y-2">
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
            isDark
              ? 'bg-orange-600/20 text-orange-400 border border-orange-500/30'
              : 'bg-orange-50 text-orange-600 border border-orange-200'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>{resolvedBadge}</span>
        </div>
        <h2
          className={`text-2xl sm:text-3xl font-black tracking-tight ${
            isDark ? 'text-white' : 'text-stone-900'
          }`}
        >
          {resolvedTitle}
        </h2>
        <p
          className={`text-xs sm:text-sm font-medium leading-relaxed ${
            isDark ? 'text-stone-400' : 'text-stone-600'
          }`}
        >
          {resolvedSubtitle}
        </p>
      </div>

      {/* Responsive 4x2 Grid Cards */}
      {hasItems ? (
        <div
          id="why-hardinkaam-grid"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
        >
          {items.map((item) => {
            const Icon = item.icon || Sparkles;
            const itemTitle = item.titleKey ? t(item.titleKey, item.title) : item.title;
            const itemDesc = item.descKey ? t(item.descKey, item.description) : item.description;
            const isClickable = Boolean(onItemClick);

            const CardElement = isClickable ? 'button' : 'div';

            return (
              <CardElement
                key={item.id}
                id={`why-card-${item.id}`}
                type={isClickable ? 'button' : undefined}
                onClick={isClickable ? () => onItemClick?.(item) : undefined}
                className={`group text-left p-5 rounded-2xl transition-all duration-200 flex flex-col justify-between relative ${
                  isDark
                    ? `bg-white/5 border border-white/10 ${item.accentBorder} hover:bg-white/8 shadow-xs`
                    : `bg-stone-50/90 border border-stone-200 ${item.accentBorder} hover:bg-white hover:shadow-md`
                } ${isClickable ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.99]' : ''}`}
              >
                <div className="space-y-3">
                  {/* Icon & Badge Header */}
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-xs ${
                        item.iconBgColor
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-black tracking-wide uppercase px-2 py-0.5 rounded-full ${
                          isDark
                            ? 'bg-white/10 text-stone-300 border border-white/10'
                            : 'bg-stone-200/80 text-stone-700 border border-stone-300/60'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3
                    className={`text-sm sm:text-base font-extrabold tracking-tight leading-snug ${
                      isDark ? 'text-white' : 'text-stone-900'
                    }`}
                  >
                    {itemTitle}
                  </h3>

                  {/* Description */}
                  <p
                    className={`text-xs leading-relaxed font-medium ${
                      isDark ? 'text-stone-400' : 'text-stone-600'
                    }`}
                  >
                    {itemDesc}
                  </p>
                </div>
              </CardElement>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div
          id="why-hardinkaam-empty-state"
          className={`p-8 sm:p-12 text-center rounded-2xl border flex flex-col items-center justify-center max-w-md mx-auto ${
            isDark
              ? 'bg-white/5 border-white/10 text-stone-300'
              : 'bg-stone-50 border-stone-200 text-stone-600'
          }`}
        >
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-inner ${
              isDark ? 'bg-stone-800 text-orange-400' : 'bg-orange-100 text-orange-600'
            }`}
          >
            <HelpCircle className="w-7 h-7" />
          </div>
          <h4
            className={`text-base font-extrabold mb-1 ${
              isDark ? 'text-white' : 'text-stone-900'
            }`}
          >
            {emptyStateTitle || t('whyEmptyTitle', 'कोई विवरण उपलब्ध नहीं है')}
          </h4>
          <p className="text-xs leading-relaxed max-w-sm mb-4">
            {emptyStateMessage ||
              t(
                'whyEmptyMessage',
                'वर्तमान में प्रदर्शित करने के लिए कोई मूल्य प्रस्ताव (Value Props) मौजूद नहीं है।'
              )}
          </p>
          {onResetItems && (
            <button
              type="button"
              onClick={onResetItems}
              className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                isDark
                  ? 'bg-orange-600 hover:bg-orange-500 text-white'
                  : 'bg-orange-600 hover:bg-orange-700 text-white'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('restoreDefaults', 'डिफ़ॉल्ट रीसेट करें')}</span>
            </button>
          )}
        </div>
      )}
    </section>
  );
};

export default WhyHardinkaam;
