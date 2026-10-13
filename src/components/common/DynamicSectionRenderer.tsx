import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Clock,
  Award,
  DollarSign,
  Phone,
  MessageSquare,
  HelpCircle,
  ExternalLink,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { DynamicSection, DynamicSectionImage } from '../../types/pageBuilder';

interface Props {
  section: DynamicSection;
  onActionClick?: (link?: string) => void;
  onOpenImageModal?: (img: DynamicSectionImage) => void;
}

export const DynamicSectionRenderer: React.FC<Props> = ({
  section,
  onActionClick,
  onOpenImageModal,
}) => {
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  if (!section.isVisible) {
    return null;
  }

  const handleLinkNavigation = (link?: string) => {
    if (!link) return;
    if (onActionClick) {
      onActionClick(link);
      return;
    }
    if (link.startsWith('http://') || link.startsWith('https://')) {
      window.open(link, '_blank');
    } else if (link.startsWith('#')) {
      const el = document.getElementById(link.replace('#', ''));
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.location.hash = link;
      }
    } else if (link.startsWith('tel:')) {
      window.location.href = link;
    }
  };

  const getIcon = (name?: string) => {
    switch (name) {
      case 'ShieldCheck':
        return <ShieldCheck className="w-5 h-5 text-emerald-500" />;
      case 'Clock':
        return <Clock className="w-5 h-5 text-amber-500" />;
      case 'Award':
        return <Award className="w-5 h-5 text-orange-500" />;
      case 'DollarSign':
        return <DollarSign className="w-5 h-5 text-teal-500" />;
      default:
        return <CheckCircle2 className="w-5 h-5 text-orange-500" />;
    }
  };

  // 1. Custom Announcement / Promo Banner
  if (section.type === 'custom_banner') {
    return (
      <div
        id={section.id}
        className="rounded-3xl p-5 sm:p-7 shadow-md border transition-all duration-300 relative overflow-hidden"
        style={{
          background: section.backgroundGradient || section.backgroundColor || '#ea580c',
          color: section.textColor || '#ffffff',
          borderColor: section.borderColor || 'transparent',
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5 max-w-3xl">
            {section.badgeText && (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider shadow-xs"
                style={{
                  backgroundColor: section.badgeColor || '#ffffff',
                  color: section.badgeTextColor || '#9a3412',
                }}
              >
                <Sparkles className="w-3 h-3" />
                {section.badgeText}
              </span>
            )}
            <h3 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: section.textColor || '#ffffff' }}>
              {section.title}
            </h3>
            {section.subtitle && (
              <p className="text-xs sm:text-sm font-medium" style={{ color: section.subtitleColor || '#ffedd5' }}>
                {section.subtitle}
              </p>
            )}
            {section.content && (
              <p className="text-xs opacity-90 pt-1 leading-relaxed">{section.content}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {section.buttonText && (
              <button
                type="button"
                onClick={() => handleLinkNavigation(section.buttonLink)}
                className="px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm transition-all shadow-md hover:scale-102 cursor-pointer flex items-center gap-1.5"
                style={{
                  backgroundColor: section.buttonColor || '#ffffff',
                  color: section.buttonTextColor || '#9a3412',
                }}
              >
                <span>{section.buttonText}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            {section.buttonSecondaryText && (
              <button
                type="button"
                onClick={() => handleLinkNavigation(section.buttonSecondaryLink)}
                className="px-4 py-2.5 rounded-2xl font-bold text-xs bg-black/20 hover:bg-black/30 text-white border border-white/20 transition-all cursor-pointer"
              >
                {section.buttonSecondaryText}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. Dynamic Image Showcase / Gallery
  if (section.type === 'image_gallery') {
    const images = section.images || [];
    return (
      <div
        id={section.id}
        className="rounded-3xl p-5 sm:p-8 shadow-sm border space-y-6"
        style={{
          backgroundColor: section.backgroundColor || '#ffffff',
          color: section.textColor || '#1c1917',
          borderColor: section.borderColor || '#e7e5e4',
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            {section.badgeText && (
              <span
                className="inline-block px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider mb-1.5"
                style={{
                  backgroundColor: section.badgeColor || '#ea580c',
                  color: section.badgeTextColor || '#ffffff',
                }}
              >
                {section.badgeText}
              </span>
            )}
            <h3 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: section.textColor || '#1c1917' }}>
              {section.title}
            </h3>
            {section.subtitle && (
              <p className="text-xs sm:text-sm mt-0.5" style={{ color: section.subtitleColor || '#78716c' }}>
                {section.subtitle}
              </p>
            )}
          </div>

          {images.length > 0 && (
            <span className="text-xs font-bold px-3 py-1 rounded-xl bg-stone-100 text-stone-700 self-start sm:self-auto shrink-0">
              🖼️ {images.length} तस्वीरें
            </span>
          )}
        </div>

        {images.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-stone-50 border border-dashed border-stone-200 text-stone-400 text-xs">
            एडमिन पैनल से इस गैलरी में नई तस्वीरें जोड़ें।
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {images.map((img) => (
              <div
                key={img.id}
                onClick={() => onOpenImageModal && onOpenImageModal(img)}
                className="group relative rounded-2xl overflow-hidden bg-stone-900 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border border-stone-200 hover:border-orange-500 aspect-square"
              >
                <img
                  src={img.url}
                  alt={img.title || 'Work Image'}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2.5">
                  <p className="text-xs font-black text-white leading-tight truncate">
                    {img.title || 'Project Photo'}
                  </p>
                  <span className="text-[10px] font-bold text-amber-300 mt-0.5 flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>बड़ा देखें</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 3. Feature Cards Grid
  if (section.type === 'feature_grid') {
    const cards = section.cards || [];
    return (
      <div
        id={section.id}
        className="rounded-3xl p-6 sm:p-8 shadow-sm border space-y-6"
        style={{
          backgroundColor: section.backgroundColor || '#f8fafc',
          color: section.textColor || '#0f172a',
          borderColor: section.borderColor || '#e2e8f0',
        }}
      >
        <div className="text-center max-w-2xl mx-auto space-y-1">
          {section.badgeText && (
            <span
              className="inline-block px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
              style={{
                backgroundColor: section.badgeColor || '#ea580c',
                color: section.badgeTextColor || '#ffffff',
              }}
            >
              {section.badgeText}
            </span>
          )}
          <h3 className="text-2xl font-black tracking-tight" style={{ color: section.textColor || '#0f172a' }}>
            {section.title}
          </h3>
          {section.subtitle && (
            <p className="text-xs sm:text-sm text-stone-500" style={{ color: section.subtitleColor }}>
              {section.subtitle}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <div
              key={card.id}
              className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs hover:shadow-md transition-all space-y-2 group"
            >
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center group-hover:scale-105 transition-transform">
                {getIcon(card.iconName)}
              </div>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-stone-900">{card.title}</h4>
                {card.badge && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-stone-100 text-stone-600">
                    {card.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 leading-relaxed">{card.description}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 4. Call-To-Action (CTA) Banner
  if (section.type === 'cta_banner') {
    return (
      <div
        id={section.id}
        className="rounded-3xl p-6 sm:p-10 shadow-xl border relative overflow-hidden"
        style={{
          background: section.backgroundGradient || section.backgroundColor || '#0f172a',
          color: section.textColor || '#ffffff',
          borderColor: section.borderColor || '#334155',
        }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            {section.badgeText && (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider"
                style={{
                  backgroundColor: section.badgeColor || '#10b981',
                  color: section.badgeTextColor || '#ffffff',
                }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                {section.badgeText}
              </span>
            )}
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              {section.title}
            </h3>
            {section.subtitle && (
              <p className="text-xs sm:text-sm font-medium" style={{ color: section.subtitleColor || '#94a3b8' }}>
                {section.subtitle}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {section.buttonText && (
              <button
                type="button"
                onClick={() => handleLinkNavigation(section.buttonLink)}
                className="px-6 py-3 rounded-2xl font-black text-xs sm:text-sm transition-all shadow-lg hover:scale-102 cursor-pointer flex items-center gap-2"
                style={{
                  backgroundColor: section.buttonColor || '#ea580c',
                  color: section.buttonTextColor || '#ffffff',
                }}
              >
                <span>{section.buttonText}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            {section.buttonSecondaryText && (
              <button
                type="button"
                onClick={() => handleLinkNavigation(section.buttonSecondaryLink)}
                className="px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer"
              >
                {section.buttonSecondaryText}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 5. Text / Notice Block
  if (section.type === 'text_block') {
    return (
      <div
        id={section.id}
        className="rounded-3xl p-6 sm:p-8 shadow-xs border space-y-3"
        style={{
          backgroundColor: section.backgroundColor || '#ffffff',
          color: section.textColor || '#1c1917',
          borderColor: section.borderColor || '#e7e5e4',
        }}
      >
        <h3 className="text-lg font-black">{section.title}</h3>
        {section.subtitle && <p className="text-xs font-semibold text-stone-500">{section.subtitle}</p>}
        {section.content && <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line text-stone-700">{section.content}</p>}
      </div>
    );
  }

  // 6. FAQ Accordion Block
  if (section.type === 'faq') {
    const faqs = section.faqs || [];
    return (
      <div
        id={section.id}
        className="rounded-3xl p-6 sm:p-8 shadow-xs border space-y-4"
        style={{
          backgroundColor: section.backgroundColor || '#ffffff',
          color: section.textColor || '#1c1917',
          borderColor: section.borderColor || '#e7e5e4',
        }}
      >
        <div>
          <h3 className="text-xl font-black">{section.title}</h3>
          {section.subtitle && <p className="text-xs text-stone-500 mt-0.5">{section.subtitle}</p>}
        </div>

        <div className="space-y-2 pt-2">
          {faqs.map((faq) => {
            const isExpanded = expandedFaqId === faq.id;
            return (
              <div key={faq.id} className="border border-stone-200 rounded-2xl overflow-hidden bg-stone-50">
                <button
                  type="button"
                  onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                  className="w-full text-left p-4 flex items-center justify-between font-bold text-xs sm:text-sm text-stone-900 cursor-pointer"
                >
                  <span>{faq.question}</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-stone-500" /> : <ChevronDown className="w-4 h-4 text-stone-500" />}
                </button>
                {isExpanded && (
                  <div className="p-4 pt-0 text-xs text-stone-600 border-t border-stone-100 bg-white leading-relaxed">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
};
