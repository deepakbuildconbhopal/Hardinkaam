import React, { useState } from 'react';
import {
  Sparkles,
  Maximize2,
  X,
  Check,
  Eye,
  CheckCircle2,
  RefreshCw,
  ShoppingBag,
  Star,
  ShieldCheck,
  Calendar,
  Languages,
  Palette,
  ArrowRight,
} from 'lucide-react';
import { FestivalTheme } from '../../types/theme';

interface ThemePreviewCardProps {
  theme: FestivalTheme;
  isActive: boolean;
  isPreviewing: boolean;
  isSaving: boolean;
  onPreview: () => void;
  onActivate: () => void;
}

export const ThemePreviewCard: React.FC<ThemePreviewCardProps> = ({
  theme,
  isActive,
  isPreviewing,
  isSaving,
  onPreview,
  onActivate,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const metadata = theme.metadata;

  return (
    <>
      {/* Embedded Live Preview Card (Embedded Mockup inside each Festival card) */}
      <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-stone-600" />
            <span>लाइव यूआई प्रिव्यू (Theme UI Preview)</span>
          </span>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="text-[11px] font-bold text-stone-600 hover:text-stone-900 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-stone-200/70 hover:bg-stone-200 transition-colors cursor-pointer"
            title="विस्तृत प्रिव्यू कार्ड खोलें"
          >
            <Maximize2 className="w-3 h-3" />
            <span>बड़ा प्रिव्यू</span>
          </button>
        </div>

        {/* Mini Simulated Platform Mockup */}
        <div
          className="rounded-xl p-3 border shadow-2xs space-y-2.5 transition-all"
          style={{
            backgroundColor: theme.colors.backgroundTint || '#fafaf9',
            borderColor: theme.colors.headerBorder,
          }}
        >
          {/* Mock Navigation Header */}
          <div
            className="rounded-lg p-2 flex items-center justify-between text-white shadow-xs"
            style={{ background: theme.colors.bannerGradient }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl filter drop-shadow-xs">{theme.greetingIcon}</span>
              <div className="leading-tight">
                <div className="text-[11px] font-extrabold truncate text-white drop-shadow-2xs">
                  HARDINKAAM
                </div>
                <div className="text-[9px] text-white/90 truncate font-medium">
                  {theme.nameHindi}
                </div>
              </div>
            </div>
            <span
              className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md backdrop-blur-xs"
              style={{
                backgroundColor: theme.colors.badgeBg,
                color: theme.colors.badgeText,
              }}
            >
              उत्सव स्पेशल
            </span>
          </div>

          {/* Mock Booking Service Item */}
          <div className="bg-white rounded-lg p-2.5 border border-stone-200/80 flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0"
                style={{
                  backgroundColor: theme.colors.primaryLight,
                  color: theme.colors.primaryDark,
                }}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-stone-800 truncate">
                  इलेक्ट्रीशियन सर्विस
                </div>
                <div className="text-[10px] text-stone-500 flex items-center gap-1 font-medium">
                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                  <span>4.9 &bull; ₹249</span>
                </div>
              </div>
            </div>

            {/* Simulated CTA Button */}
            <button
              type="button"
              className="px-2.5 py-1 rounded-md text-[10px] font-bold text-white shrink-0 shadow-xs cursor-default flex items-center gap-1"
              style={{ backgroundColor: theme.colors.primary }}
            >
              <span>बुक करें</span>
            </button>
          </div>
        </div>

        {/* Color Palette Breakdown with Functional Role Labels */}
        <div className="grid grid-cols-4 gap-1.5 pt-0.5">
          <div className="text-center space-y-1">
            <div
              className="h-6 rounded-lg border border-black/10 shadow-2xs"
              style={{ backgroundColor: theme.colors.primary }}
              title={`Primary: ${theme.colors.primary}`}
            />
            <div className="text-[9px] font-bold text-stone-600 truncate">प्राइमरी</div>
            <div className="text-[8px] font-mono text-stone-400 truncate">{theme.colors.primary}</div>
          </div>
          <div className="text-center space-y-1">
            <div
              className="h-6 rounded-lg border border-black/10 shadow-2xs"
              style={{ backgroundColor: theme.colors.secondary }}
              title={`Secondary: ${theme.colors.secondary}`}
            />
            <div className="text-[9px] font-bold text-stone-600 truncate">सेकेंडरी</div>
            <div className="text-[8px] font-mono text-stone-400 truncate">{theme.colors.secondary}</div>
          </div>
          <div className="text-center space-y-1">
            <div
              className="h-6 rounded-lg border border-black/10 shadow-2xs"
              style={{ backgroundColor: theme.colors.accent }}
              title={`Accent: ${theme.colors.accent}`}
            />
            <div className="text-[9px] font-bold text-stone-600 truncate">एक्सेंट</div>
            <div className="text-[8px] font-mono text-stone-400 truncate">{theme.colors.accent}</div>
          </div>
          <div className="text-center space-y-1">
            <div
              className="h-6 rounded-lg border border-black/10 shadow-2xs"
              style={{ backgroundColor: theme.colors.badgeBg }}
              title={`Badge: ${theme.colors.badgeBg}`}
            />
            <div className="text-[9px] font-bold text-stone-600 truncate">बैज हाईलाइट</div>
            <div className="text-[8px] font-mono text-stone-400 truncate">{theme.colors.badgeBg}</div>
          </div>
        </div>
      </div>

      {/* Detailed High-Fidelity Modal Preview */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div
            className="bg-white rounded-3xl max-w-2xl w-full border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              className="p-6 relative text-white"
              style={{ background: theme.colors.bannerGradient }}
            >
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="बंद करें"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3">
                <span className="text-4xl p-2.5 rounded-2xl bg-white/20 backdrop-blur-xs shadow-xs">
                  {theme.greetingIcon}
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-xs">
                      {theme.nameHindi}
                    </h2>
                    {metadata?.dates.seasonHindi && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-white/25 text-white backdrop-blur-xs">
                        {metadata.dates.seasonHindi}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/90 font-medium">{theme.name}</p>
                  {metadata?.localizedNames.regional && (
                    <div className="text-xs text-white/95 mt-1 font-medium flex items-center gap-1.5">
                      <Languages className="w-3.5 h-3.5 opacity-80" />
                      <span>{metadata.localizedNames.regional}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Content - Scrollable Detailed Preview */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Festival Dates & Panchang Summary */}
              {metadata && (
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 text-stone-700 font-medium">
                    <Calendar className="w-4 h-4 text-orange-600 shrink-0" />
                    <span>
                      <strong>तारीख:</strong> {metadata.dates.displayDatesHindi} (
                      {metadata.dates.isFixedDate ? 'नियत सौर तिथि' : 'पंचांग तिथि'})
                    </span>
                  </div>
                  {metadata.dates.tithiPanchang && (
                    <div className="flex items-center gap-2 text-stone-700 font-medium">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        <strong>पंचांग:</strong> {metadata.dates.tithiPanchang}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Live UI Mockup Simulation */}
              <div className="space-y-3">
                <div className="text-xs font-black uppercase tracking-wider text-stone-500">
                  प्लेटफ़ॉर्म इंटरफ़ेस सिमुलेशन (Platform UI Preview)
                </div>

                <div
                  className="rounded-2xl p-5 border shadow-xs space-y-4"
                  style={{
                    backgroundColor: theme.colors.backgroundTint || '#ffffff',
                    borderColor: theme.colors.headerBorder,
                  }}
                >
                  {/* Festive Announcement Banner */}
                  <div
                    className="rounded-xl p-3.5 flex items-center justify-between text-white shadow-xs"
                    style={{ background: theme.colors.bannerGradient }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl filter drop-shadow-xs">{theme.greetingIcon}</span>
                      <div>
                        <div className="text-xs font-extrabold">{theme.greetingHindi}</div>
                        <div className="text-[10px] text-white/90 font-medium">
                          {theme.taglineHindi}
                        </div>
                      </div>
                    </div>
                    <span
                      className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg"
                      style={{
                        backgroundColor: theme.colors.badgeBg,
                        color: theme.colors.badgeText,
                      }}
                    >
                      उत्सव ऑफर
                    </span>
                  </div>

                  {/* Sample Service Cards Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-white rounded-xl p-3.5 border border-stone-200/80 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-900">
                          होम डीप क्लीनिंग
                        </span>
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: theme.colors.primaryLight,
                            color: theme.colors.primaryDark,
                          }}
                        >
                          लोकप्रिय
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500">
                        {theme.nameHindi} स्पेशल संपूर्ण घर स्वच्छता सेवा।
                      </p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs font-black text-stone-800">₹799</span>
                        <button
                          type="button"
                          className="px-3 py-1 rounded-lg text-xs font-bold text-white shadow-2xs"
                          style={{ backgroundColor: theme.colors.primary }}
                        >
                          बुक करें
                        </button>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-3.5 border border-stone-200/80 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-900">
                          इलेक्ट्रिकल व लाइटिंग
                        </span>
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: theme.colors.badgeBg,
                            color: theme.colors.badgeText,
                          }}
                        >
                          उत्सव विशेष
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500">
                        सुरक्षित वायरिंग, डेकोरेटिव लाइट्स व फैन इंस्टॉलेशन।
                      </p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs font-black text-stone-800">₹249</span>
                        <button
                          type="button"
                          className="px-3 py-1 rounded-lg text-xs font-bold text-white shadow-2xs"
                          style={{ backgroundColor: theme.colors.primary }}
                        >
                          बुक करें
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Complete Color Specs Table */}
              <div className="space-y-3">
                <div className="text-xs font-black uppercase tracking-wider text-stone-500">
                  कलर स्पेसिफिकेशन (Color Palette Details)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-center space-y-1">
                    <div
                      className="h-8 rounded-lg border border-black/10 shadow-2xs mx-auto"
                      style={{ backgroundColor: theme.colors.primary }}
                    />
                    <div className="text-xs font-bold text-stone-800">Primary</div>
                    <div className="text-[10px] font-mono text-stone-500">{theme.colors.primary}</div>
                  </div>

                  <div className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-center space-y-1">
                    <div
                      className="h-8 rounded-lg border border-black/10 shadow-2xs mx-auto"
                      style={{ backgroundColor: theme.colors.secondary }}
                    />
                    <div className="text-xs font-bold text-stone-800">Secondary</div>
                    <div className="text-[10px] font-mono text-stone-500">{theme.colors.secondary}</div>
                  </div>

                  <div className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-center space-y-1">
                    <div
                      className="h-8 rounded-lg border border-black/10 shadow-2xs mx-auto"
                      style={{ backgroundColor: theme.colors.accent }}
                    />
                    <div className="text-xs font-bold text-stone-800">Accent</div>
                    <div className="text-[10px] font-mono text-stone-500">{theme.colors.accent}</div>
                  </div>

                  <div className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-center space-y-1">
                    <div
                      className="h-8 rounded-lg border border-black/10 shadow-2xs mx-auto"
                      style={{ backgroundColor: theme.colors.badgeBg }}
                    />
                    <div className="text-xs font-bold text-stone-800">Badge Bg</div>
                    <div className="text-[10px] font-mono text-stone-500">{theme.colors.badgeBg}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Action Footer */}
            <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 text-xs font-bold transition-all cursor-pointer"
              >
                बंद करें
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onPreview();
                    setIsModalOpen(false);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                    isPreviewing
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-300'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 text-amber-600" />
                  <span>{isPreviewing ? 'लाइव प्रिव्यू बंद करें' : 'लाइव प्रिव्यू चालू करें'}</span>
                </button>

                <button
                  type="button"
                  disabled={isActive || isSaving}
                  onClick={() => {
                    onActivate();
                    setIsModalOpen(false);
                  }}
                  style={isActive ? undefined : { backgroundColor: theme.colors.primary }}
                  className={`px-5 py-2 rounded-xl text-xs font-extrabold text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 cursor-default opacity-90'
                      : 'hover:opacity-90'
                  }`}
                >
                  {isActive ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>वर्तमान में सक्रिय</span>
                    </>
                  ) : isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>लागू हो रहा है...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>यह थीम लागू करें</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
