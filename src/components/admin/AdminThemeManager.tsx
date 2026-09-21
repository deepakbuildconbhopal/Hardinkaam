import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Palette,
  CheckCircle2,
  Eye,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Clock,
  ShieldCheck,
  Check,
  Search,
  X,
  Calendar,
  MapPin,
  Languages,
  Filter,
  CalendarDays,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { FestivalTheme } from '../../types/theme';
import { ThemePreviewCard } from './ThemePreviewCard';

export const AdminThemeManager: React.FC = () => {
  const {
    activeThemeId,
    activeTheme,
    previewThemeId,
    effectiveTheme,
    availableThemes,
    activateTheme,
    previewTheme,
    resetPreview,
    isSaving,
    error,
    getUpcomingThemes,
  } = useTheme();

  const { currentUser, userProfile } = useAuth();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [justAppliedTheme, setJustAppliedTheme] = useState<FestivalTheme | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'upcoming' | 'national' | 'festivals'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const handleActivate = async (theme: FestivalTheme) => {
    const adminName = userProfile?.name || 'Admin';
    const adminEmail = currentUser?.email || 'admin@hardinkaam.com';
    const ok = await activateTheme(theme.id, adminName, adminEmail);
    if (ok) {
      setJustAppliedTheme(theme);
      setSuccessMessage(`थीम "${theme.nameHindi}" सफलतापूर्वक पूरे प्लेटफ़ॉर्म पर सक्रिय कर दी गई है!`);
      setTimeout(() => setSuccessMessage(null), 5000);
      setTimeout(() => setJustAppliedTheme(null), 4000);
    }
  };

  const nationalThemeIds = ['republic_day', 'independence_day', 'gandhi_jayanti'];

  // Months list for easy calendar-based filtering
  const months = [
    { key: 'all', labelHindi: 'सभी माह' },
    { key: 'January', labelHindi: 'जनवरी' },
    { key: 'February', labelHindi: 'फरवरी' },
    { key: 'March', labelHindi: 'मार्च' },
    { key: 'April', labelHindi: 'अप्रैल' },
    { key: 'May', labelHindi: 'मई' },
    { key: 'June', labelHindi: 'जून' },
    { key: 'July', labelHindi: 'जुलाई' },
    { key: 'August', labelHindi: 'अगस्त' },
    { key: 'September', labelHindi: 'सितंबर' },
    { key: 'October', labelHindi: 'अक्टूबर' },
    { key: 'November', labelHindi: 'नवंबर' },
    { key: 'December', labelHindi: 'दिसंबर' },
  ];

  const upcomingList = useMemo(() => {
    return getUpcomingThemes ? getUpcomingThemes() : [];
  }, [getUpcomingThemes]);

  const filteredThemes = useMemo(() => {
    let list = availableThemes;

    // Upcoming sorting/filtering
    if (filterType === 'upcoming') {
      list = upcomingList.length > 0 ? upcomingList : availableThemes;
    }

    return list.filter((theme) => {
      // Category filter
      if (filterType === 'active') {
        if (theme.id !== activeThemeId && theme.id !== previewThemeId) return false;
      } else if (filterType === 'national') {
        if (!nationalThemeIds.includes(theme.id)) return false;
      } else if (filterType === 'festivals') {
        if (theme.category !== 'festival' || nationalThemeIds.includes(theme.id)) return false;
      }

      // Month filter
      if (selectedMonth !== 'all') {
        const themeMonth = theme.metadata?.dates.approximateMonth;
        if (themeMonth && themeMonth !== 'All' && !themeMonth.toLowerCase().includes(selectedMonth.toLowerCase())) {
          return false;
        }
      }

      // Search query (Searches across English, Hindi, Regional names, dates, and Panchang tithi)
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const meta = theme.metadata;

      const basicMatch =
        theme.name.toLowerCase().includes(q) ||
        theme.nameHindi.toLowerCase().includes(q) ||
        theme.tagline.toLowerCase().includes(q) ||
        theme.taglineHindi.toLowerCase().includes(q) ||
        theme.id.toLowerCase().includes(q);

      if (basicMatch) return true;
      if (!meta) return false;

      return (
        meta.localizedNames.en.toLowerCase().includes(q) ||
        meta.localizedNames.hi.toLowerCase().includes(q) ||
        (meta.localizedNames.regional && meta.localizedNames.regional.toLowerCase().includes(q)) ||
        (meta.localizedNames.regionalLanguage && meta.localizedNames.regionalLanguage.toLowerCase().includes(q)) ||
        meta.dates.displayDates.toLowerCase().includes(q) ||
        meta.dates.displayDatesHindi.toLowerCase().includes(q) ||
        meta.dates.approximateMonth.toLowerCase().includes(q) ||
        meta.dates.approximateMonthHindi.toLowerCase().includes(q) ||
        (meta.dates.tithiPanchang && meta.dates.tithiPanchang.toLowerCase().includes(q)) ||
        (meta.dates.seasonHindi && meta.dates.seasonHindi.toLowerCase().includes(q)) ||
        (meta.culturalRegion && meta.culturalRegion.toLowerCase().includes(q)) ||
        (meta.culturalRegionHindi && meta.culturalRegionHindi.toLowerCase().includes(q)) ||
        meta.icons.symbols.some((s) => s.includes(q))
      );
    });
  }, [availableThemes, searchQuery, filterType, selectedMonth, activeThemeId, previewThemeId, upcomingList]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-orange-500/10 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-900 border border-orange-200/80">
              <Palette className="w-3.5 h-3.5 text-orange-600" />
              <span>त्योहार व थीम इंजन (Festival Theme Engine)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              Theme Manager
            </h1>
            <p className="text-sm text-stone-600 leading-relaxed">
              पूरे HARDINKAAM प्लेटफ़ॉर्म (कस्टमर वेबसाइट व सर्विस प्रो इंटरफ़ेस) के लिए उत्सव थीम, तिथियाँ,
              पंचांग विवरण, क्षेत्रीय नाम व उत्सव चिन्ह (Icons & Symbols) प्रबंधित करें।
            </p>
          </div>

          {/* Active Theme Summary Card with Rich Metadata */}
          <motion.div
            key={effectiveTheme.id}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="bg-stone-50 rounded-2xl p-4 sm:p-5 border border-stone-200 shrink-0 lg:max-w-md w-full lg:w-auto shadow-2xs transition-colors duration-500"
          >
            <div className="text-[11px] font-black text-stone-500 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                वर्तमान सक्रिय थीम (Active Theme)
              </span>
              <span className="inline-flex items-center gap-1 font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[10px]">
                <Check className="w-3 h-3" /> लाइव सक्रिय
              </span>
            </div>

            <div className="flex items-start gap-3 mt-2">
              <motion.span
                key={effectiveTheme.greetingIcon}
                initial={{ scale: 0.8, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="text-3xl p-2 bg-white rounded-2xl border border-stone-200 shadow-2xs"
              >
                {activeTheme.greetingIcon}
              </motion.span>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-stone-900 text-base flex items-center gap-2">
                  <span className="truncate">{activeTheme.nameHindi}</span>
                  {activeTheme.metadata?.dates.seasonHindi && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 shrink-0">
                      {activeTheme.metadata.dates.seasonHindi}
                    </span>
                  )}
                </div>
                <div className="text-xs text-stone-500 font-medium truncate">
                  {activeTheme.name} &bull; {activeTheme.metadata?.dates.displayDatesHindi || 'सदाबहार'}
                </div>
                {activeTheme.metadata?.localizedNames.regional && (
                  <div className="text-[11px] text-orange-800 font-medium mt-1 truncate">
                    {activeTheme.metadata.localizedNames.regional}
                  </div>
                )}
              </div>
            </div>

            {/* Active Theme Symbols & Palette */}
            <div className="mt-3 pt-2.5 border-t border-stone-200 flex items-center justify-between text-xs gap-2">
              <div className="flex items-center gap-1.5">
                {activeTheme.previewPalette.map((color, idx) => (
                  <div
                    key={idx}
                    className="w-4 h-4 rounded-full border border-black/10 shadow-2xs transition-transform hover:scale-125"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              {activeTheme.metadata?.icons.symbols && (
                <div className="flex items-center gap-1">
                  {activeTheme.metadata.icons.symbols.slice(0, 4).map((symbol, idx) => (
                    <span key={idx} className="text-xs p-1 bg-white rounded-lg border border-stone-200 shadow-2xs">
                      {symbol}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Dynamic Theme Change Animation Ripple Banner */}
        <AnimatePresence>
          {justAppliedTheme && (
            <motion.div
              initial={{ opacity: 0, y: -15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.98 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="mt-6 p-4.5 rounded-3xl text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 overflow-hidden relative"
              style={{ background: justAppliedTheme.colors.bannerGradient }}
            >
              <div className="flex items-center gap-3 relative z-10">
                <motion.span
                  animate={{ scale: [1, 1.3, 1], rotate: [0, 12, -12, 0] }}
                  transition={{ duration: 0.7 }}
                  className="text-3xl p-2 rounded-2xl bg-white/20 backdrop-blur-xs shadow-xs"
                >
                  {justAppliedTheme.greetingIcon}
                </motion.span>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-wider text-white/90">
                    थीम रंग सक्रिय (Color Scheme Applied Smoothly)
                  </div>
                  <div className="text-sm sm:text-base font-extrabold text-white">
                    "{justAppliedTheme.nameHindi}" ({justAppliedTheme.name}) का उत्सव रंग पूरे प्लेटफ़ॉर्म पर लागू हो गया है
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 relative z-10 shrink-0">
                {justAppliedTheme.previewPalette.map((color, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: idx * 0.08, type: 'spring', stiffness: 400, damping: 25 }}
                    className="w-7 h-7 rounded-xl border-2 border-white/70 shadow-sm"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live Preview Mode Banner */}
        {previewThemeId && (
          <div className="mt-6 p-4 rounded-2xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <Eye className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>लाइव प्रिव्यू मोड चालू है:</strong> आप <strong>"{effectiveTheme.nameHindi}"</strong> (
                {effectiveTheme.metadata?.dates.displayDatesHindi || ''}) का प्रिव्यू देख रहे हैं। यह बदलाव अभी डेटाबेस में सेव नहीं हुआ है।
              </span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleActivate(effectiveTheme)}
                disabled={isSaving}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>स्थायी लागू करें</span>
              </button>
              <button
                type="button"
                onClick={resetPreview}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 text-xs font-bold transition-all cursor-pointer"
              >
                प्रिव्यू रद्द करें
              </button>
            </div>
          </div>
        )}

        {/* Notifications & Error Feedback */}
        {successMessage && (
          <div className="mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 rounded-2xl bg-red-50 border border-red-300 text-red-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search input with multi-lingual metadata support */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="खोजें: त्योहार, तारीख (उदा. 15 अगस्त, 8 नवंबर), पंचांग तिथि, क्षेत्रीय नाम (उदा. पोंगल, লোহড়ী), राज्य..."
              className="w-full pl-10 pr-9 py-2 rounded-2xl border border-stone-200 bg-stone-50 focus:bg-white focus:border-orange-500 focus:outline-hidden text-xs sm:text-sm font-medium text-stone-800 transition-all placeholder:text-stone-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Pill Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterType === 'all'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              सभी ({availableThemes.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('upcoming')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                filterType === 'upcoming'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>आगामी उत्सव</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('active')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterType === 'active'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              सक्रिय थीम
            </button>
            <button
              type="button"
              onClick={() => setFilterType('national')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterType === 'national'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-orange-50 text-orange-800 hover:bg-orange-100 border border-orange-200'
              }`}
            >
              राष्ट्रीय पर्व (3)
            </button>
            <button
              type="button"
              onClick={() => setFilterType('festivals')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterType === 'festivals'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
              }`}
            >
              त्योहार ({availableThemes.length - 4})
            </button>
          </div>
        </div>

        {/* Month Selector Bar */}
        <div className="pt-2 border-t border-stone-100 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-stone-400 font-bold shrink-0 flex items-center gap-1 mr-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>माह (Month):</span>
          </span>
          {months.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setSelectedMonth(m.key)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap text-[11px] ${
                selectedMonth === m.key
                  ? 'bg-orange-600 text-white shadow-2xs'
                  : 'bg-stone-50 hover:bg-stone-100 text-stone-600 border border-stone-200'
              }`}
            >
              {m.labelHindi}
            </button>
          ))}
        </div>
      </div>

      {/* Themes Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-black uppercase tracking-wider text-stone-500">
            दिखाई गई थीम्स ({filteredThemes.length} / {availableThemes.length})
          </div>
          <div className="text-xs text-stone-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>हर त्योहार के उत्सव प्रतीक, पंचांग तिथि व क्षेत्रीय नाम सम्मिलित हैं</span>
          </div>
        </div>

        {filteredThemes.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 space-y-3">
            <Palette className="w-10 h-10 text-stone-300 mx-auto" />
            <div className="text-stone-700 font-bold text-sm">
              "{searchQuery}" के लिए कोई थीम नहीं मिली
            </div>
            <p className="text-xs text-stone-500">
              कृपया दूसरा नाम खोजें या 'सभी' फ़िल्टर का चयन करें।
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setFilterType('all');
                setSelectedMonth('all');
              }}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              फ़िल्टर रीसेट करें
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredThemes.map((theme) => {
              const isActive = activeThemeId === theme.id;
              const isPreviewing = previewThemeId === theme.id;
              const metadata = theme.metadata;

              return (
                <motion.div
                  layout
                  key={theme.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className={`bg-white rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md ${
                    isActive
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-emerald-50'
                      : isPreviewing
                      ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-amber-50'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  {/* Theme Visual Preview Header */}
                  <div
                    className="p-5 relative text-white transition-all duration-500"
                    style={{
                      background: theme.colors.bannerGradient,
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-3xl filter drop-shadow-xs">{theme.greetingIcon}</span>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {isActive && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-white text-emerald-800 shadow-xs">
                            <Check className="w-3 h-3 text-emerald-600" />
                            सक्रिय (Active)
                          </span>
                        )}
                        {isPreviewing && !isActive && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-white text-amber-900 shadow-xs">
                            <Eye className="w-3 h-3 text-amber-600" />
                            प्रिव्यू जारी
                          </span>
                        )}
                        {!isActive && !isPreviewing && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/25 backdrop-blur-xs text-white/95">
                            {nationalThemeIds.includes(theme.id)
                              ? 'राष्ट्रीय पर्व'
                              : theme.category === 'standard'
                              ? 'ब्रांड डिफ़ॉल्ट'
                              : 'उत्सव थीम'}
                          </span>
                        )}
                        {metadata?.dates.seasonHindi && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 backdrop-blur-xs text-white">
                            {metadata.dates.seasonHindi}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3">
                      <h3 className="text-lg font-black tracking-tight drop-shadow-2xs">{theme.nameHindi}</h3>
                      <p className="text-xs text-white/90 font-medium drop-shadow-2xs">{theme.name}</p>

                      {/* Regional / Localized Name badge */}
                      {metadata?.localizedNames.regional && (
                        <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/20 text-white text-[11px] font-medium backdrop-blur-xs">
                          <Languages className="w-3 h-3 opacity-80" />
                          <span className="truncate">{metadata.localizedNames.regional}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Theme Details, Dates & Rich Metadata */}
                  <div className="p-5 space-y-3.5 flex-1 flex flex-col justify-between">
                    <div className="space-y-3">
                      {/* Dates & Panchang Tithi Box */}
                      {metadata && (
                        <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 text-xs space-y-1.5">
                          <div className="flex items-center justify-between text-stone-700 font-bold">
                            <span className="flex items-center gap-1.5 text-stone-900">
                              <Calendar className="w-3.5 h-3.5 text-orange-600" />
                              <span>{metadata.dates.displayDatesHindi}</span>
                            </span>
                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-stone-200 text-stone-700">
                              {metadata.dates.isFixedDate ? 'नियत तिथि' : 'पंचांग तिथि'}
                            </span>
                          </div>

                          {metadata.dates.tithiPanchang && (
                            <div className="text-[11px] text-stone-600 font-medium flex items-center gap-1">
                              <Clock className="w-3 h-3 text-stone-400 shrink-0" />
                              <span className="truncate">{metadata.dates.tithiPanchang}</span>
                            </div>
                          )}

                          {metadata.culturalRegionHindi && (
                            <div className="text-[11px] text-stone-600 font-medium flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                              <span className="truncate">{metadata.culturalRegionHindi}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Festival Icons & Symbols Row */}
                      {metadata?.icons.symbols && (
                        <div>
                          <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                            <span>उत्सव प्रतीक (Icons & Symbols)</span>
                            <span className="text-[10px] text-stone-400 font-normal">
                              {metadata.localizedNames.regionalLanguage || 'भारतीय संस्कृति'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {metadata.icons.symbols.map((sym, idx) => (
                              <div
                                key={idx}
                                className="w-8 h-8 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-base hover:scale-110 transition-transform cursor-default shadow-2xs"
                                title={`प्रतीक: ${sym}`}
                              >
                                {sym}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Description */}
                      <p className="text-xs text-stone-600 leading-relaxed line-clamp-2">
                        {theme.description}
                      </p>

                      {/* Interactive Theme Preview Card component with Simulated Mockup & Color breakdown */}
                      <ThemePreviewCard
                        theme={theme}
                        isActive={isActive}
                        isPreviewing={isPreviewing}
                        isSaving={isSaving}
                        onPreview={() => previewTheme(isPreviewing ? null : theme.id)}
                        onActivate={() => handleActivate(theme)}
                      />
                    </div>

                    {/* Action Controls */}
                    <div className="pt-3 border-t border-stone-100 flex items-center gap-2">
                      {/* Preview Button */}
                      <button
                        type="button"
                        onClick={() => previewTheme(isPreviewing ? null : theme.id)}
                        className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                          isPreviewing
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{isPreviewing ? 'प्रिव्यू बंद करें' : 'प्रिव्यू'}</span>
                      </button>

                      {/* Activate Button */}
                      <button
                        type="button"
                        disabled={isActive || isSaving}
                        onClick={() => handleActivate(theme)}
                        style={
                          isActive
                            ? undefined
                            : {
                                backgroundColor: theme.colors.primary,
                              }
                        }
                        className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold text-white transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                          isActive
                            ? 'bg-emerald-600 text-white cursor-default opacity-90'
                            : 'hover:opacity-90'
                        }`}
                      >
                        {isActive ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>सक्रिय (Active)</span>
                          </>
                        ) : isSaving ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>सेव हो रहा है...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>लागू करें</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
