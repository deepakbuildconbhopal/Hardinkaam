import React from 'react';
import {
  DynamicSectionConfig,
  PageSectionItem,
} from '../../types/pageCustomizer';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Star,
  ExternalLink,
  ChevronDown,
  Info,
  PhoneCall,
  MessageSquare,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface Props {
  section: DynamicSectionConfig;
  onOpenBooking?: () => void;
  onSelectTab?: (tab: string) => void;
  onImageClick?: (item: PageSectionItem) => void;
}

export const DynamicCustomSectionRenderer: React.FC<Props> = ({
  section,
  onOpenBooking,
  onSelectTab,
  onImageClick,
}) => {
  const [openFaqIndex, setOpenFaqIndex] = React.useState<number | null>(0);

  if (!section.visible) return null;

  const bgStyle = section.bgColor
    ? { backgroundColor: section.bgColor }
    : undefined;
  const textColor = section.textColor || 'inherit';

  // 1. Promotional Banner / Announcement
  if (section.type === 'custom_banner') {
    return (
      <div
        className="rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl transition-transform hover:scale-[1.01] border border-white/20"
        style={{
          backgroundColor: section.bgColor || '#ea580c',
          color: section.textColor || '#ffffff',
        }}
      >
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            {section.badge && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-black/25 text-white border border-white/30 backdrop-blur-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                {section.badge}
              </span>
            )}
            <h3 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-snug">
              {section.title}
            </h3>
            {section.subtitle && (
              <p className="text-sm sm:text-base opacity-95 leading-relaxed font-medium">
                {section.subtitle}
              </p>
            )}
          </div>

          {section.buttonText && (
            <button
              type="button"
              onClick={() => {
                if (section.buttonLink?.startsWith('#') && onSelectTab) {
                  onSelectTab(section.buttonLink.replace('#', ''));
                } else if (onOpenBooking) {
                  onOpenBooking();
                }
              }}
              className="px-6 py-3.5 rounded-2xl font-black text-sm tracking-wide shadow-xl flex items-center gap-2 cursor-pointer transition-all hover:scale-105 shrink-0"
              style={{
                backgroundColor: section.buttonBgColor || '#000000',
                color: '#ffffff',
              }}
            >
              <span>{section.buttonText}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // 2. Features Grid / Guarantees
  if (section.type === 'features_grid') {
    return (
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          {section.badge && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              {section.badge}
            </span>
          )}
          <h2 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white">
            {section.title}
          </h2>
          {section.subtitle && (
            <p className="text-sm text-stone-600 dark:text-stone-300 font-medium">
              {section.subtitle}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(section.items || []).map((item, idx) => (
            <div
              key={item.id || idx}
              className="glass-card p-5 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-3 hover:border-orange-500/50 transition-all hover:shadow-lg"
            >
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center font-black">
                {idx + 1}
              </div>
              <h4 className="text-base font-bold text-stone-900 dark:text-white">
                {item.title}
              </h4>
              {item.description && (
                <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                  {item.description}
                </p>
              )}
              {item.badge && (
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                  {item.badge}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  }

  // 3. Testimonials & Reviews
  if (section.type === 'testimonial_reviews') {
    return (
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          {section.badge && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              {section.badge}
            </span>
          )}
          <h2 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white">
            {section.title}
          </h2>
          {section.subtitle && (
            <p className="text-sm text-stone-600 dark:text-stone-300 font-medium">
              {section.subtitle}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(section.items || []).map((rev, idx) => (
            <div
              key={rev.id || idx}
              className="glass-card p-6 rounded-3xl border border-stone-200 dark:border-stone-800 space-y-4 hover:shadow-xl transition-all"
            >
              <div className="flex items-center gap-1 text-amber-400">
                {[...Array(rev.rating || 5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
              <p className="text-sm text-stone-700 dark:text-stone-200 italic leading-relaxed">
                "{rev.description}"
              </p>
              <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900 dark:text-white">
                  {rev.title}
                </span>
                {rev.badge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    {rev.badge}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // 4. FAQ Accordion
  if (section.type === 'faq') {
    return (
      <section className="space-y-6 max-w-4xl mx-auto">
        <div className="text-center space-y-2">
          {section.badge && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400">
              <Info className="w-3.5 h-3.5" />
              {section.badge}
            </span>
          )}
          <h2 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white">
            {section.title}
          </h2>
          {section.subtitle && (
            <p className="text-sm text-stone-600 dark:text-stone-300 font-medium">
              {section.subtitle}
            </p>
          )}
        </div>

        <div className="space-y-3">
          {(section.items || []).map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={faq.id || idx}
                className="glass-card rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left font-bold text-stone-900 dark:text-white text-sm sm:text-base cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800/50"
                >
                  <span>{faq.title}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-stone-500 transition-transform ${
                      isOpen ? 'rotate-180 text-orange-500' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 pt-1 text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed border-t border-stone-100 dark:border-stone-800/80 animate-in fade-in">
                    {faq.description}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  // 5. Custom HTML / Rich Content
  if (section.type === 'custom_html_text') {
    return (
      <section
        className="glass-card p-6 sm:p-8 rounded-3xl border border-stone-200 dark:border-stone-800 space-y-4"
        style={bgStyle}
      >
        <div className="space-y-1">
          {section.badge && (
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-500/10 text-orange-600">
              {section.badge}
            </span>
          )}
          <h3 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white">
            {section.title}
          </h3>
          {section.subtitle && (
            <p className="text-sm text-stone-600 dark:text-stone-300">
              {section.subtitle}
            </p>
          )}
        </div>
        {section.customHtml ? (
          <div
            className="prose dark:prose-invert max-w-none text-sm text-stone-700 dark:text-stone-300"
            dangerouslySetInnerHTML={{ __html: section.customHtml }}
          />
        ) : (
          <div className="text-sm text-stone-600 dark:text-stone-300">
            {section.items?.[0]?.description || ''}
          </div>
        )}
      </section>
    );
  }

  // 6. Action CTA / Emergency Help Box
  if (section.type === 'cta_action' || section.type === 'contact_box') {
    return (
      <div
        className="rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl border border-white/20 text-white"
        style={{
          backgroundColor: section.bgColor || '#0f766e',
        }}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            {section.badge && (
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-black/20 text-white border border-white/20">
                {section.badge}
              </span>
            )}
            <h3 className="text-xl sm:text-2xl font-black">{section.title}</h3>
            {section.subtitle && (
              <p className="text-sm opacity-90">{section.subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <a
              href="tel:0755-4920202"
              className="px-5 py-3 rounded-2xl bg-white text-stone-900 font-bold text-sm shadow-lg flex items-center gap-2 hover:bg-stone-100 transition-all cursor-pointer"
            >
              <PhoneCall className="w-4 h-4 text-emerald-600" />
              <span>कॉल करें</span>
            </a>
            <a
              href="https://wa.me/917554920202"
              target="_blank"
              rel="noreferrer"
              className="px-5 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-sm shadow-lg flex items-center gap-2 hover:bg-emerald-700 transition-all cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>व्हाट्सएप</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 7. General Custom Grid Section
  return (
    <section className="space-y-6">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        {section.badge && (
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400">
            {section.badge}
          </span>
        )}
        <h2 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white">
          {section.title}
        </h2>
        {section.subtitle && (
          <p className="text-sm text-stone-600 dark:text-stone-300 font-medium">
            {section.subtitle}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {(section.items || []).map((item, idx) => (
          <div
            key={item.id || idx}
            onClick={() => onImageClick && onImageClick(item)}
            className="glass-card rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 hover:shadow-xl transition-all cursor-pointer group"
          >
            {item.imageUrl && (
              <div className="aspect-video w-full overflow-hidden bg-stone-100 dark:bg-stone-800">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            )}
            <div className="p-4 space-y-1">
              {item.badge && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600">
                  {item.badge}
                </span>
              )}
              <h4 className="font-bold text-sm text-stone-900 dark:text-white truncate">
                {item.title}
              </h4>
              {item.description && (
                <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2">
                  {item.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
