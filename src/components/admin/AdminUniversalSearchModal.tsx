import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  User,
  Briefcase,
  Building2,
  Calendar,
  DollarSign,
  Layers,
  FileText,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Command,
  Database,
  ArrowRight,
  Eye,
  Filter,
} from 'lucide-react';
import {
  SearchResultItem,
  SearchEntityType,
  executeUniversalSearch,
  getDeepEntityDetails,
  RelatedEntitySummary,
  loadUniversalDatabaseIndex,
} from '../../services/adminUniversalSearchService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab?: (tab: string) => void;
  initialQuery?: string;
}

export const AdminUniversalSearchModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelectTab,
  initialQuery = '',
}) => {
  const [queryText, setQueryText] = useState(initialQuery);
  const [filterType, setFilterType] = useState<'all' | SearchEntityType>('all');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshingIndex, setIsRefreshingIndex] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SearchResultItem | null>(null);
  const [relatedDetails, setRelatedDetails] = useState<RelatedEntitySummary | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [viewRawJson, setViewRawJson] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
      if (initialQuery) {
        setQueryText(initialQuery);
      }
    }
  }, [isOpen, initialQuery]);

  // Execute search when query or filter changes
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const runSearch = async () => {
      setIsLoading(true);
      try {
        const res = await executeUniversalSearch(queryText, filterType, 60);
        if (isMounted) {
          setResults(res);
          // If previous selection is not in new results, keep it or default to first
          if (!selectedItem && res.length > 0) {
            setSelectedItem(res[0]);
          }
        }
      } catch (err) {
        console.warn('[AdminUniversalSearch] Search error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    const timer = setTimeout(runSearch, 150);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [queryText, filterType, isOpen]);

  // Load deep details when item is selected
  useEffect(() => {
    if (!selectedItem) {
      setRelatedDetails(null);
      return;
    }

    let isMounted = true;
    const fetchDetails = async () => {
      setIsLoadingDetails(true);
      try {
        const details = await getDeepEntityDetails(selectedItem);
        if (isMounted) {
          setRelatedDetails(details);
        }
      } catch (err) {
        console.warn('Error fetching deep details:', err);
      } finally {
        if (isMounted) setIsLoadingDetails(false);
      }
    };

    fetchDetails();
    return () => {
      isMounted = false;
    };
  }, [selectedItem]);

  // Copy helper
  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Force Refresh Index from Firestore
  const handleForceRefresh = async () => {
    setIsRefreshingIndex(true);
    try {
      await loadUniversalDatabaseIndex(true);
      const res = await executeUniversalSearch(queryText, filterType, 60);
      setResults(res);
      if (res.length > 0) setSelectedItem(res[0]);
    } catch (err) {
      console.warn('Refresh error:', err);
    } finally {
      setIsRefreshingIndex(false);
    }
  };

  // Navigate to appropriate admin tab
  const handleJumpToTab = (item: SearchResultItem) => {
    if (!onSelectTab) return;
    onClose();
    switch (item.entityType) {
      case 'booking':
        onSelectTab('admin_bookings');
        break;
      case 'ledger':
        onSelectTab('admin_financial_ledger');
        break;
      case 'serviceman':
      case 'customer':
      case 'business_partner':
      case 'brand_promoter':
        onSelectTab('admin_users');
        break;
      case 'franchise':
        onSelectTab('admin_franchise');
        break;
      case 'service':
        onSelectTab('admin_catalog');
        break;
      case 'rfq':
        onSelectTab('admin_rfq');
        break;
      default:
        onSelectTab('admin_data_explorer');
        break;
    }
  };

  if (!isOpen) return null;

  // Filter Categories
  const CATEGORIES: Array<{ type: 'all' | SearchEntityType; label: string; icon: any }> = [
    { type: 'all', label: 'सभी डेटा (All Database)', icon: Database },
    { type: 'customer', label: 'ग्राहक (Customers)', icon: User },
    { type: 'serviceman', label: 'सर्विसमैन (ServiceMen ₹121)', icon: Briefcase },
    { type: 'booking', label: 'बुकिंग्स (Bookings)', icon: Calendar },
    { type: 'ledger', label: 'वित्तीय लेज़र (Ledgers)', icon: DollarSign },
    { type: 'franchise', label: 'फ्रेंचाइज़ी (Franchise)', icon: Building2 },
    { type: 'business_partner', label: 'पार्टनर्स (Partners)', icon: Building2 },
    { type: 'service', label: 'सर्विस कैटलॉग (Services)', icon: Layers },
    { type: 'rfq', label: 'RFQ कोट्स', icon: FileText },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-6xl w-full border border-stone-200 shadow-2xl overflow-hidden flex flex-col h-[90vh] max-h-[850px] relative">
        {/* Top Header & Search Input Bar */}
        <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-emerald-950 p-4 sm:p-6 text-white border-b border-stone-800 relative">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center shadow-inner">
                <Search className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span>डेटाबेस मास्टर सर्च बार (Universal Database Search)</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                    Live Firestore Search
                  </span>
                </h2>
                <p className="text-xs text-stone-300 font-medium">
                  कस्टमर, सर्विसमैन, बुकिंग, ट्रांजेक्शन ID, मोबाइल नंबर, जिला या सर्विस का पूरा विवरण तुरंत खोजें।
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleForceRefresh}
                disabled={isRefreshingIndex}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-stone-200 text-xs font-bold transition-all flex items-center gap-1.5 border border-white/10 cursor-pointer disabled:opacity-50"
                title="Refresh Firestore cache index"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingIndex ? 'animate-spin text-emerald-400' : ''}`} />
                <span className="hidden sm:inline">री-सिंक डेटाबेस</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer text-sm font-bold"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Master Search Input */}
          <div className="relative mt-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400" />
            <input
              ref={inputRef}
              type="text"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="नाम, फोन नंबर (9826...), Transaction ID, Booking ID, ईमेल, जिला (Bhopal, Indore...), Pincode या कोई भी कीवर्ड टाइप करें..."
              className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-stone-800/90 border-2 border-emerald-500/50 text-white placeholder-stone-400 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-emerald-500/30 focus:border-emerald-400 shadow-inner transition-all"
            />
            {queryText && (
              <button
                type="button"
                onClick={() => setQueryText('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white text-xs font-bold bg-stone-700/80 px-2 py-1 rounded-md"
              >
                क्लियर
              </button>
            )}
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1 scrollbar-none text-xs">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = filterType === cat.type;
              return (
                <button
                  key={cat.type}
                  type="button"
                  onClick={() => setFilterType(cat.type)}
                  className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-500 text-stone-950 shadow-md shadow-emerald-950/40 font-black'
                      : 'bg-stone-800/70 text-stone-300 hover:bg-stone-700/90 border border-stone-700/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-stone-950' : 'text-emerald-400'}`} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Body: Split View (Results List on Left, Detail Inspector on Right) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-stone-50">
          {/* Left Panel: Search Results List */}
          <div className="w-full md:w-5/12 border-r border-stone-200 bg-white flex flex-col overflow-hidden">
            <div className="p-3 border-b border-stone-100 flex items-center justify-between text-xs text-stone-500 bg-stone-50/50">
              <span className="font-bold flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span>कुल {results.length} परिणाम मिले</span>
              </span>
              {isLoading && <span className="text-emerald-600 font-bold animate-pulse">खोज जारी है...</span>}
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
              {isLoading && results.length === 0 ? (
                <div className="p-8 text-center text-stone-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                  <p className="text-xs font-bold text-stone-600">डेटाबेस से सर्च हो रहा है...</p>
                </div>
              ) : results.length === 0 ? (
                <div className="p-8 text-center text-stone-400 space-y-2">
                  <AlertTriangle className="w-8 h-8 mx-auto text-amber-500" />
                  <p className="text-sm font-bold text-stone-700">कोई रिकॉर्ड नहीं मिला</p>
                  <p className="text-xs text-stone-500 max-w-xs mx-auto">
                    "{queryText}" से मेल खाता कोई कस्टमर, सर्विसमैन, बुकिंग या ट्रांजेक्शन नहीं मिला। दूसरा कीवर्ड आज़माएं।
                  </p>
                </div>
              ) : (
                results.map((item) => {
                  const isSelected = selectedItem?.id === item.id && selectedItem?.collectionName === item.collectionName;
                  return (
                    <div
                      key={`${item.collectionName}-${item.id}`}
                      onClick={() => setSelectedItem(item)}
                      className={`p-3.5 transition-all cursor-pointer text-left border-l-4 ${
                        isSelected
                          ? 'bg-emerald-50/80 border-l-emerald-600 shadow-xs'
                          : 'hover:bg-stone-50 border-l-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${item.badge.color}`}>
                          {item.badge.label}
                        </span>
                        {item.date && (
                          <span className="text-[10px] text-stone-400 flex items-center gap-1 shrink-0">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-black text-stone-900 mt-1 truncate">{item.title}</h4>
                      <p className="text-xs text-stone-600 font-medium truncate mt-0.5">{item.subtitle}</p>

                      <div className="flex items-center justify-between text-[11px] text-stone-500 mt-2 pt-1 border-t border-stone-100">
                        <span className="font-mono text-[10px] truncate max-w-[130px] text-stone-400">
                          ID: {item.id}
                        </span>
                        {item.phone && (
                          <span className="font-bold text-emerald-700 flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {item.phone}
                          </span>
                        )}
                        {item.amount !== undefined && item.amount > 0 && (
                          <span className="font-black text-stone-900">₹{item.amount.toLocaleString('en-IN')}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel: Deep Entity Inspector & Details */}
          <div className="w-full md:w-7/12 flex flex-col bg-stone-50/60 overflow-hidden">
            {selectedItem ? (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {/* Header Card of Selected Record */}
                <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border ${selectedItem.badge.color}`}>
                          {selectedItem.badge.label}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 text-[10px] font-mono font-bold">
                          Col: {selectedItem.collectionName}
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-stone-900 mt-2">{selectedItem.title}</h3>
                      <p className="text-xs text-stone-500 font-mono mt-0.5 flex items-center gap-1.5">
                        <span>ID: <strong>{selectedItem.id}</strong></span>
                        <button
                          type="button"
                          onClick={() => handleCopy(selectedItem.id, 'id')}
                          className="p-1 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-700"
                          title="Copy ID"
                        >
                          {copiedKey === 'id' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </p>
                    </div>

                    {/* Jump to Admin Module Button */}
                    {onSelectTab && (
                      <button
                        type="button"
                        onClick={() => handleJumpToTab(selectedItem)}
                        className="px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-emerald-950/20 cursor-pointer shrink-0"
                        title="Open this record in dedicated Admin Module"
                      >
                        <span>मॉड्यूल में खोलें</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Quick Contact & Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100">
                    {selectedItem.phone && (
                      <>
                        <a
                          href={`tel:${selectedItem.phone}`}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-1.5 transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          <span>कॉल करें ({selectedItem.phone})</span>
                        </a>

                        <a
                          href={`https://wa.me/${selectedItem.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                            `नमस्ते ${selectedItem.title}, मैं HARDINKAAM Admin Office से संपर्क कर रहा हूँ।`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-green-50 hover:bg-green-100 border border-green-200 text-green-900 text-xs font-bold flex items-center gap-1.5 transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-green-600" />
                          <span>WhatsApp संदेश</span>
                        </a>
                      </>
                    )}

                    {selectedItem.email && (
                      <a
                        href={`mailto:${selectedItem.email}`}
                        className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5 text-blue-600" />
                        <span>ईमेल भेजें</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => setViewRawJson(!viewRawJson)}
                      className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold flex items-center gap-1.5 transition-colors ml-auto cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-stone-500" />
                      <span>{viewRawJson ? 'फॉर्मेटेड व्यू' : 'कच्चा डेटा (Raw JSON)'}</span>
                    </button>
                  </div>
                </div>

                {/* Formatted Key Details Grid */}
                {!viewRawJson ? (
                  <div className="space-y-4">
                    {/* Primary Properties */}
                    <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3">
                      <h4 className="text-xs font-black text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        मुख्य विवरण (Primary Properties)
                      </h4>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                          <span className="text-[10px] text-stone-400 font-bold block uppercase">Status / स्थिति</span>
                          <strong className="text-stone-900 font-black">
                            {selectedItem.status || 'Active'}
                          </strong>
                        </div>

                        {selectedItem.phone && (
                          <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                            <span className="text-[10px] text-stone-400 font-bold block uppercase">Mobile / फोन</span>
                            <strong className="text-stone-900 font-bold font-mono">{selectedItem.phone}</strong>
                          </div>
                        )}

                        {selectedItem.email && (
                          <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                            <span className="text-[10px] text-stone-400 font-bold block uppercase">Email / ईमेल</span>
                            <strong className="text-stone-900 font-bold truncate block">{selectedItem.email}</strong>
                          </div>
                        )}

                        {(selectedItem.city || selectedItem.district) && (
                          <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                            <span className="text-[10px] text-stone-400 font-bold block uppercase">City / District</span>
                            <strong className="text-stone-900 font-bold">
                              {selectedItem.city || selectedItem.district}
                            </strong>
                          </div>
                        )}

                        {selectedItem.pincode && (
                          <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                            <span className="text-[10px] text-stone-400 font-bold block uppercase">Pincode / पिनकोड</span>
                            <strong className="text-stone-900 font-bold font-mono">{selectedItem.pincode}</strong>
                          </div>
                        )}

                        {selectedItem.amount !== undefined && (
                          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                            <span className="text-[10px] text-emerald-800 font-bold block uppercase">Amount / राशि</span>
                            <strong className="text-emerald-900 font-black text-sm">
                              ₹{selectedItem.amount.toLocaleString('en-IN')}
                            </strong>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Connected Deep Intelligence (Bookings, KYC, Financials) */}
                    {isLoadingDetails ? (
                      <div className="p-6 text-center text-stone-400 bg-white rounded-3xl border border-stone-200">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-600 mb-1" />
                        <span className="text-xs font-bold">संबंधित रिकॉर्ड्स खोजे जा रहे हैं...</span>
                      </div>
                    ) : relatedDetails && (
                      <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3">
                        <h4 className="text-xs font-black text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Database className="w-4 h-4 text-purple-600" />
                          डेटाबेस संबंध व इतिहास (Connected Entity Intelligence)
                        </h4>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                          {relatedDetails.bookingsCount !== undefined && (
                            <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200">
                              <span className="text-[10px] text-indigo-700 font-bold block uppercase">कुल बुकिंग्स</span>
                              <strong className="text-xl font-black text-indigo-950">
                                {relatedDetails.bookingsCount}
                              </strong>
                            </div>
                          )}

                          {relatedDetails.kycStatus && (
                            <div className="p-3 rounded-2xl bg-teal-50 border border-teal-200">
                              <span className="text-[10px] text-teal-700 font-bold block uppercase">KYC सत्यापन</span>
                              <strong className="text-xs font-black text-teal-950 block mt-1">
                                {relatedDetails.kycStatus}
                              </strong>
                            </div>
                          )}

                          {relatedDetails.totalEarnings !== undefined && (
                            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                              <span className="text-[10px] text-emerald-700 font-bold block uppercase">वॉलेट / कमाई</span>
                              <strong className="text-base font-black text-emerald-950">
                                ₹{relatedDetails.totalEarnings.toLocaleString('en-IN')}
                              </strong>
                            </div>
                          )}
                        </div>

                        {/* Recent Connected Bookings List */}
                        {relatedDetails.recentBookings && relatedDetails.recentBookings.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-stone-100">
                            <span className="text-[11px] font-bold text-stone-600 block mb-2">
                              हालिया बुकिंग्स (Recent Bookings):
                            </span>
                            <div className="space-y-1.5 max-h-40 overflow-y-auto">
                              {relatedDetails.recentBookings.slice(0, 5).map((b: any) => (
                                <div
                                  key={b.id}
                                  className="p-2 rounded-xl bg-stone-50 border border-stone-200 text-[11px] flex items-center justify-between"
                                >
                                  <div>
                                    <strong className="font-bold text-stone-900 block truncate max-w-[200px]">
                                      {b.serviceName || b.serviceTitle || 'Booking'}
                                    </strong>
                                    <span className="text-stone-400 font-mono text-[10px]">#{b.id.slice(-6)}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-black text-stone-900">₹{b.amount || b.price || 0}</span>
                                    <span className="block text-[9.5px] font-bold text-emerald-700 uppercase">
                                      {b.status || 'Active'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Raw JSON Inspector */
                  <div className="bg-stone-900 text-emerald-400 rounded-3xl p-5 border border-stone-800 font-mono text-xs overflow-x-auto shadow-inner">
                    <div className="flex items-center justify-between pb-2 border-b border-stone-800 text-stone-400 text-[11px] mb-3">
                      <span>Firestore Document: {selectedItem.collectionName}/{selectedItem.id}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(JSON.stringify(selectedItem.rawData, null, 2), 'rawJson')}
                        className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                      >
                        {copiedKey === 'rawJson' ? '✓ Copied' : 'Copy JSON'}
                      </button>
                    </div>
                    <pre className="whitespace-pre-wrap">{JSON.stringify(selectedItem.rawData, null, 2)}</pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-center text-stone-400">
                <div className="space-y-2 max-w-sm">
                  <Database className="w-12 h-12 text-stone-300 mx-auto" />
                  <h4 className="text-sm font-bold text-stone-700">विवरण देखने के लिए कोई परिणाम चुनें</h4>
                  <p className="text-xs text-stone-500">
                    बाईं सूची से किसी भी कस्टमर, सर्विसमैन या बुकिंग पर क्लिक करके उसका संपूर्ण डेटाबेस रिकॉर्ड देखें।
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Help Bar */}
        <div className="p-3 sm:p-4 bg-stone-100 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-medium">
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-stone-300 font-mono text-[10px] text-stone-700 shadow-xs">
                Esc
              </kbd>{' '}
              बंद करने के लिए
            </span>
            <span className="hidden sm:inline text-stone-300">•</span>
            <span className="hidden sm:flex items-center gap-1 font-medium">
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-stone-300 font-mono text-[10px] text-stone-700 shadow-xs">
                Ctrl + K
              </kbd>{' '}
              मास्टर सर्च शॉर्टकट
            </span>
          </div>

          <div className="font-bold text-emerald-800 text-[11px] flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>HARDINKAAM Real-time Database Engine (100% Admin Power)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
