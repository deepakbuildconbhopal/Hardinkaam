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
  ArrowLeft,
} from 'lucide-react';
import {
  SearchResultItem,
  SearchEntityType,
  executeUniversalSearch,
  getDeepEntityDetails,
  RelatedEntitySummary,
  loadUniversalDatabaseIndex,
} from '../../../services/adminUniversalSearchService';

interface Props {
  onSelectTab?: (tab: string) => void;
  onBack?: () => void;
}

export const AdminUniversalSearchManager: React.FC<Props> = ({ onSelectTab, onBack }) => {
  const [queryText, setQueryText] = useState('');
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

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const runSearch = async () => {
      setIsLoading(true);
      try {
        const res = await executeUniversalSearch(queryText, filterType, 60);
        if (isMounted) {
          setResults(res);
          if (!selectedItem && res.length > 0) {
            setSelectedItem(res[0]);
          }
        }
      } catch (err) {
        console.warn('[AdminUniversalSearchManager] Search error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    const timer = setTimeout(runSearch, 150);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [queryText, filterType]);

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

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

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

  const handleJumpToTab = (item: SearchResultItem) => {
    if (!onSelectTab) return;
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

  const CATEGORIES: Array<{ type: 'all' | SearchEntityType; label: string; icon: any }> = [
    { type: 'all', label: 'सभी डेटा (All Database)', icon: Database },
    { type: 'customer', label: 'ग्राहक (Customers)', icon: User },
    { type: 'serviceman', label: 'सर्विसमैन (ServiceMen)', icon: Briefcase },
    { type: 'booking', label: 'बुकिंग्स (Bookings)', icon: Calendar },
    { type: 'ledger', label: 'वित्तीय लेज़र (Ledgers)', icon: DollarSign },
    { type: 'franchise', label: 'फ्रेंचाइज़ी (Franchise)', icon: Building2 },
    { type: 'business_partner', label: 'पार्टनर्स (Partners)', icon: Building2 },
    { type: 'service', label: 'सर्विस कैटलॉग (Services)', icon: Layers },
    { type: 'rfq', label: 'RFQ कोट्स', icon: FileText },
  ];

  return (
    <div className="bg-stone-900 rounded-3xl border border-stone-800 overflow-hidden shadow-2xl flex flex-col h-[82vh] text-stone-100">
      {/* Top Header & Search Input Bar */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-emerald-950 p-6 text-white border-b border-stone-800 relative">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button onClick={onBack} className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center shadow-inner">
              <Search className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>Universal Database Search</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                  Live Firestore Search
                </span>
              </h2>
              <p className="text-xs text-stone-300">
                Instant search across customers, servicemen, bookings, transactions, mobile numbers, and service catalog.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleForceRefresh}
              disabled={isRefreshingIndex}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-stone-200 text-xs font-bold transition-all flex items-center gap-1.5 border border-white/10 cursor-pointer disabled:opacity-50"
              title="Refresh Firestore cache index"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingIndex ? 'animate-spin text-emerald-400' : ''}`} />
              <span className="hidden sm:inline">Refresh Index</span>
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
            placeholder="Type name, phone number (9826...), transaction ID, booking ID, email, or city..."
            className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-stone-800/90 border-2 border-emerald-500/50 text-white placeholder-stone-400 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-emerald-500/30 focus:border-emerald-400 shadow-inner transition-all"
          />
          {queryText && (
            <button
              type="button"
              onClick={() => setQueryText('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white text-xs font-bold bg-stone-700/80 px-2 py-1 rounded-md"
            >
              Clear
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
                className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500 text-stone-950 shadow-md font-black'
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

      {/* Content Body: Split View */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-stone-950">
        {/* Left Panel: Search Results List */}
        <div className="w-full md:w-5/12 border-r border-stone-800 bg-stone-900 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-stone-800 flex items-center justify-between text-xs text-stone-400 bg-stone-900/50">
            <span>Found <strong className="text-white">{results.length}</strong> matching records</span>
            {isLoading && <span className="text-emerald-400 animate-pulse">Searching...</span>}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-stone-800/60 p-2 space-y-1">
            {results.length === 0 ? (
              <div className="py-16 text-center text-stone-400 space-y-2">
                <Database className="w-8 h-8 text-stone-600 mx-auto" />
                <p className="text-xs">No records found matching "{queryText}".</p>
              </div>
            ) : (
              results.map((item, idx) => {
                const itemKey = item.uniqueKey || `${item.collectionName || item.entityType}_${item.id}_${idx}`;
                const isSelected = (selectedItem?.uniqueKey || selectedItem?.id) === (item.uniqueKey || item.id);
                return (
                  <div
                    key={itemKey}
                    onClick={() => setSelectedItem(item)}
                    className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                        : 'bg-stone-800/40 border-stone-800 hover:bg-stone-800 text-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-black text-white text-xs">{item.title}</span>
                      <span className="px-2 py-0.5 rounded bg-stone-700 text-stone-300 font-bold uppercase text-[9px]">
                        {item.entityType}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-400 truncate">{item.subtitle}</div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-700/40 text-[10px] text-stone-500">
                      <span>ID: {item.id}</span>
                      <span className="text-emerald-400 font-bold">Inspect →</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Detailed Inspector */}
        <div className="w-full md:w-7/12 bg-stone-950 flex flex-col overflow-y-auto p-6 space-y-6">
          {selectedItem ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-stone-800 pb-4">
                <div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase">
                    {selectedItem.entityType} Record Inspector
                  </span>
                  <h3 className="text-xl font-black text-white mt-1">{selectedItem.title}</h3>
                  <p className="text-xs text-stone-400">{selectedItem.subtitle}</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleJumpToTab(selectedItem)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <span>Open Module</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Attributes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(selectedItem.metadata || {}).map(([key, val]) => (
                  <div key={key} className="p-3 bg-stone-900 rounded-2xl border border-stone-800 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-stone-500">{key}</span>
                    <div className="text-xs font-semibold text-stone-200 break-all">{String(val || 'N/A')}</div>
                  </div>
                ))}
              </div>

              {/* Related Entities */}
              <div className="space-y-3 pt-4 border-t border-stone-800">
                <h4 className="text-xs font-black text-white uppercase tracking-wider">Related Database Entities</h4>
                {isLoadingDetails ? (
                  <div className="text-xs text-stone-400 py-4 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>Loading related connections...</span>
                  </div>
                ) : relatedDetails ? (
                  <div className="space-y-2 text-xs">
                    {relatedDetails.parentBooking && (
                      <div className="p-3 bg-stone-900 rounded-2xl border border-stone-800 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-stone-500 block">Parent Booking</span>
                          <span className="font-bold text-white">#{relatedDetails.parentBooking.id} • ₹{relatedDetails.parentBooking.amount}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">{relatedDetails.parentBooking.status}</span>
                      </div>
                    )}
                    {relatedDetails.childBookings && relatedDetails.childBookings.length > 0 && (
                      <div className="p-3 bg-stone-900 rounded-2xl border border-stone-800 space-y-2">
                        <span className="text-[10px] uppercase font-bold text-stone-500 block">Associated Bookings ({relatedDetails.childBookings.length})</span>
                        {relatedDetails.childBookings.map((b) => (
                          <div key={b.id} className="flex justify-between text-stone-300 border-t border-stone-800 pt-1">
                            <span>#{b.id} ({b.serviceName})</span>
                            <span className="font-bold">₹{b.amount}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-stone-500">No linked related records found.</div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-32 text-center space-y-3 text-stone-500">
              <Database className="w-12 h-12 text-stone-700 mx-auto" />
              <p className="text-xs">Select any record from the left search results list to inspect details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
