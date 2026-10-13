import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Download,
  Upload,
  Plus,
  Trash2,
  Edit3,
  Phone,
  MessageSquare,
  Filter,
  CheckSquare,
  Square,
  Sparkles,
  ExternalLink,
  Users,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Globe,
  FileSpreadsheet,
  Layers,
  ChevronDown,
  UserCheck,
  Send,
  X,
  Eye,
  Star,
  MapPin,
  Building,
  Briefcase,
  Sliders,
  Copy,
  Check,
  FileUp,
  Tag,
  Settings2,
  Wand2,
  ArrowRight,
  HelpCircle,
  FileCheck2,
} from 'lucide-react';
import {
  MarketingLead,
  MARKETING_CATEGORIES_CATALOG,
  fetchAllMarketingLeads,
  saveMarketingLead,
  bulkSaveMarketingLeads,
  bulkDeleteMarketingLeads,
  bulkUpdateMarketingLeads,
  downloadMarketingLeadsExcelTemplate,
  exportMarketingLeadsToExcel,
  parseUploadedLeadsFile,
  cleanPhoneNumber,
  RawExcelSheetData,
  ColumnMapping,
  DefaultFallbackOptions,
  TEMPLATE_FIELD_DEFINITIONS,
  readRawExcelFile,
  autoDetectColumnMapping,
  convertRawExcelDataToTemplate,
  exportConvertedToStandardTemplateExcel,
} from '../../services/marketingLeadsService';
import { searchServicemenLeads, DiscoveredLead } from '../../services/marketingAgentClientService';
import { ALL_INDIA_LOCATIONS } from '../../data/indiaLocations';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

interface Props {
  onNavigateToPros?: () => void;
}

export const AdminMarketingLeadsManager: React.FC<Props> = ({ onNavigateToPros }) => {
  const { userProfile } = useAuth();
  const { addToast } = useToast();

  // Active Main Tab: 'database' | 'search' | 'upload' | 'broadcast'
  const [activeTab, setActiveTab] = useState<'database' | 'search' | 'upload' | 'broadcast'>('database');

  // Leads Data States
  const [leads, setLeads] = useState<MarketingLead[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>('all');

  // Multi-Selection State
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());

  // Modals & Drawers
  const [showAddEditModal, setShowAddEditModal] = useState<boolean>(false);
  const [editingLead, setEditingLead] = useState<Partial<MarketingLead> | null>(null);
  const [isSavingLead, setIsSavingLead] = useState<boolean>(false);

  // Internet Search States
  const [searchTrade, setSearchTrade] = useState<string>('Electrician');
  const [searchState, setSearchState] = useState<string>('Madhya Pradesh');
  const [searchDistrict, setSearchDistrict] = useState<string>('Bhopal');
  const [searchLocality, setSearchLocality] = useState<string>('MP Nagar Zone 1 & 2');
  const [customSearchQuery, setCustomSearchQuery] = useState<string>('');
  const [isSearchingInternet, setIsSearchingInternet] = useState<boolean>(false);
  const [internetSearchResults, setInternetSearchResults] = useState<DiscoveredLead[]>([]);
  const [selectedInternetLeadIds, setSelectedInternetLeadIds] = useState<Set<string>>(new Set());
  const [internetSearchSummary, setInternetSearchSummary] = useState<string>('');

  // Excel Upload & Template Converter States
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [rawExcelData, setRawExcelData] = useState<RawExcelSheetData | null>(null);
  const [rawFileRef, setRawFileRef] = useState<File | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    businessName: '',
    contactPerson: '',
    phone: '',
    alternativePhone: '',
    category: '',
    city: '',
    area: '',
    state: '',
    pincode: '',
    rating: '',
    email: '',
    website: '',
    notes: '',
    status: '',
  });
  const [defaultFallbackOptions, setDefaultFallbackOptions] = useState<DefaultFallbackOptions>({
    defaultCategory: 'Electrician',
    defaultCity: 'Bhopal',
    defaultState: 'Madhya Pradesh',
    defaultStatus: 'new',
  });
  const [converterMode, setConverterMode] = useState<'smart' | 'manual'>('smart');
  const [showAdvancedMapping, setShowAdvancedMapping] = useState<boolean>(false);
  const [convertedPreview, setConvertedPreview] = useState<{
    validLeads: Partial<MarketingLead>[];
    duplicateCount: number;
    invalidCount: number;
    totalParsed: number;
    errors: string[];
  } | null>(null);

  const [isSavingExcelLeads, setIsSavingExcelLeads] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // WhatsApp Broadcast States
  const [broadcastMessage, setBroadcastMessage] = useState<string>(
    'नमस्ते! HARDINKAAM (हर दिन काम) में आपका स्वागत है। हम आपके शहर में ग्राहकों को सीधे आपसे जोड़ रहे हैं। अपनी सर्विस लिस्ट करें और 100% डायरेक्ट पेमेंट प्राप्त करें। अधिक जानकारी हेतु संपर्क करें: +91 62675 46945'
  );
  const [broadcastTargetStatus, setBroadcastTargetStatus] = useState<string>('all');

  // Load Leads from Firestore
  const loadLeads = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAllMarketingLeads();
      setLeads(data);
    } catch (err) {
      console.error('Failed to load marketing leads:', err);
      addToast('Leads लोड करने में समस्या आई।', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      // Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (l.name || l.businessName || '').toLowerCase().includes(q);
        const matchesPerson = (l.contactPerson || '').toLowerCase().includes(q);
        const matchesPhone = (l.phone || '').includes(q);
        const matchesCat = (l.category || l.trade || '').toLowerCase().includes(q);
        const matchesCity = (l.city || l.district || '').toLowerCase().includes(q);
        const matchesArea = (l.address || l.area || '').toLowerCase().includes(q);
        const matchesNotes = (l.notes || '').toLowerCase().includes(q);
        if (!(matchesName || matchesPerson || matchesPhone || matchesCat || matchesCity || matchesArea || matchesNotes)) {
          return false;
        }
      }

      // Category Filter
      if (selectedCategoryFilter !== 'all' && l.category !== selectedCategoryFilter && l.trade !== selectedCategoryFilter) {
        return false;
      }

      // City Filter
      if (selectedCityFilter !== 'all' && l.city !== selectedCityFilter && l.district !== selectedCityFilter) {
        return false;
      }

      // Status Filter
      if (selectedStatusFilter !== 'all' && l.status !== selectedStatusFilter) {
        return false;
      }

      // Source Filter
      if (selectedSourceFilter !== 'all' && l.source !== selectedSourceFilter) {
        return false;
      }

      return true;
    });
  }, [leads, searchQuery, selectedCategoryFilter, selectedCityFilter, selectedStatusFilter, selectedSourceFilter]);

  // Distinct cities from leads
  const distinctCities = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.city) set.add(l.city);
    });
    return Array.from(set).sort();
  }, [leads]);

  // KPI Metrics
  const metrics = useMemo(() => {
    const total = leads.length;
    const newCount = leads.filter((l) => l.status === 'new').length;
    const contactedCount = leads.filter((l) => l.status === 'contacted').length;
    const interestedCount = leads.filter((l) => l.status === 'interested').length;
    const onboardedCount = leads.filter((l) => l.status === 'onboarded').length;
    const conversionRate = total > 0 ? ((onboardedCount / total) * 100).toFixed(1) : '0.0';

    return { total, newCount, contactedCount, interestedCount, onboardedCount, conversionRate };
  }, [leads]);

  // Selection Handlers
  const handleToggleSelectAll = () => {
    if (selectedLeadIds.size === filteredLeads.length && filteredLeads.length > 0) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(filteredLeads.map((l) => l.id)));
    }
  };

  const handleToggleLeadSelection = (id: string) => {
    const next = new Set(selectedLeadIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedLeadIds(next);
  };

  // Single Lead Save
  const handleSaveSingleLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead?.businessName && !editingLead?.name) {
      addToast('कृपया बिज़नेस या कारीगर का नाम दर्ज करें।', 'error');
      return;
    }
    if (!editingLead?.phone || cleanPhoneNumber(editingLead.phone).length !== 10) {
      addToast('कृपया सही 10-अंकीय मोबाइल नंबर दर्ज करें।', 'error');
      return;
    }

    setIsSavingLead(true);
    try {
      const saved = await saveMarketingLead(editingLead);
      addToast('लीड सफलतापूर्वक सुरक्षित हो गई!', 'success');
      setShowAddEditModal(false);
      setEditingLead(null);
      await loadLeads();
    } catch (err) {
      console.error('Save lead error:', err);
      addToast('लीड सुरक्षित करने में त्रुटि हुई।', 'error');
    } finally {
      setIsSavingLead(false);
    }
  };

  // Bulk Delete Selected
  const handleBulkDelete = async () => {
    if (selectedLeadIds.size === 0) return;
    if (!confirm(`क्या आप चुनी गई ${selectedLeadIds.size} लीड्स को वाकई हटाना चाहते हैं?`)) return;

    try {
      await bulkDeleteMarketingLeads(Array.from(selectedLeadIds));
      addToast(`${selectedLeadIds.size} लीड्स सफलतापूर्वक हटा दी गईं।`, 'success');
      setSelectedLeadIds(new Set());
      await loadLeads();
    } catch (err) {
      console.error('Bulk delete error:', err);
      addToast('लीड्स हटाने में त्रुटि हुई।', 'error');
    }
  };

  // Bulk Status Update
  const handleBulkStatusUpdate = async (status: 'new' | 'contacted' | 'interested' | 'onboarded' | 'rejected') => {
    if (selectedLeadIds.size === 0) return;

    try {
      await bulkUpdateMarketingLeads(Array.from(selectedLeadIds), { status });
      addToast(`${selectedLeadIds.size} लीड्स का स्टेटस "${status.toUpperCase()}" में अपडेट हो गया।`, 'success');
      setSelectedLeadIds(new Set());
      await loadLeads();
    } catch (err) {
      console.error('Bulk update status error:', err);
      addToast('स्टेटस अपडेट करने में त्रुटि हुई।', 'error');
    }
  };

  // Single Delete
  const handleDeleteSingle = async (leadId: string, leadName: string) => {
    if (!confirm(`क्या आप "${leadName}" को वाकई हटाना चाहते हैं?`)) return;
    try {
      await bulkDeleteMarketingLeads([leadId]);
      addToast('लीड सफलतापूर्वक हटा दी गई।', 'success');
      await loadLeads();
    } catch (err) {
      console.error('Delete lead error:', err);
      addToast('लीड हटाने में त्रुटि हुई।', 'error');
    }
  };

  // Convert Lead to Verified Service Professional
  const handleConvertToServicePro = async (lead: MarketingLead) => {
    if (!confirm(`क्या आप "${lead.businessName || lead.name}" को HARDINKAAM कारीगर/सर्विसमैन डायरेक्टरी में ऑनबोर्ड करना चाहते हैं?`)) {
      return;
    }

    try {
      const cleanPhone = cleanPhoneNumber(lead.phone);
      const proId = `pro_${lead.categoryId || 'cat_electrician'}_${cleanPhone || Date.now()}`;
      const payload = {
        id: proId,
        userId: proId,
        name: lead.contactPerson || lead.businessName || lead.name || 'Service Pro',
        phone: cleanPhone ? `+91 ${cleanPhone}` : '+91 98260 00000',
        email: lead.email || '',
        categoryIds: [lead.categoryId || 'cat_electrician'],
        categoryNames: [lead.category || lead.trade || 'Electrician'],
        serviceArea: lead.area ? `${lead.area}, ${lead.city}` : `${lead.city} City`,
        city: lead.city || 'Bhopal',
        state: lead.state || 'Madhya Pradesh',
        experienceYears: 3,
        hourlyRate: 299,
        isAvailable: true,
        isVerified: true,
        rating: lead.rating || 4.8,
        totalJobs: lead.reviewCount || 10,
        status: 'active',
        kycStatus: 'verified',
        approvalStatus: 'approved',
        photoUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500&auto=format&fit=crop&q=80',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'service_men', proId), payload, { merge: true });
      await setDoc(doc(db, 'serviceMen', proId), payload, { merge: true });
      await saveMarketingLead({ ...lead, status: 'onboarded' });

      addToast(`"${payload.name}" को सफलतापूर्वक सर्विसमैन में ऑनबोर्ड कर दिया गया!`, 'success');
      await loadLeads();
      if (onNavigateToPros) onNavigateToPros();
    } catch (err: any) {
      console.error('Onboard pro error:', err);
      addToast(`कारीगर ऑनबोर्ड करने में त्रुटि: ${err?.message || 'Error'}`, 'error');
    }
  };

  // Perform AI Internet & Multi-Engine Lead Search
  const handleExecuteInternetSearch = async () => {
    setIsSearchingInternet(true);
    setInternetSearchResults([]);
    setSelectedInternetLeadIds(new Set());
    setInternetSearchSummary('');

    try {
      const res = await searchServicemenLeads({
        trade: searchTrade,
        state: searchState,
        district: searchDistrict,
        tehsilOrVillage: searchLocality,
        customKeyword: customSearchQuery.trim() || undefined,
      });

      if (res && res.leads && res.leads.length > 0) {
        setInternetSearchResults(res.leads);
        setSelectedInternetLeadIds(new Set(res.leads.map((l) => l.id)));
        setInternetSearchSummary(res.aiSummary || `Found ${res.leads.length} leads across search engines.`);
        addToast(`इंटरनेट से ${res.leads.length} लीड्स सफलतापूर्वक प्राप्त हुईं!`, 'success');
      } else {
        addToast('कोई नई लीड्स नहीं मिलीं। कृपया सर्च कीवर्ड बदलें।', 'info');
      }
    } catch (err: any) {
      console.error('Internet search error:', err);
      addToast(`सर्च विफल: ${err?.message || 'Error'}`, 'error');
    } finally {
      setIsSearchingInternet(false);
    }
  };

  // Save Discovered Internet Leads to Firestore
  const handleSaveInternetLeadsToDatabase = async () => {
    const selectedLeads = internetSearchResults.filter((l) => selectedInternetLeadIds.has(l.id));
    if (selectedLeads.length === 0) {
      addToast('कृपया कम से कम एक लीड चुनें।', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const formatted: Partial<MarketingLead>[] = selectedLeads.map((l) => {
        const cleanPhone = cleanPhoneNumber(l.phone);
        return {
          id: `lead_web_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
          businessName: l.businessName || l.name,
          contactPerson: l.name !== l.businessName ? l.name : '',
          name: l.name,
          phone: cleanPhone,
          trade: l.trade || searchTrade,
          category: searchTrade,
          categoryId: `cat_${searchTrade.toLowerCase().replace(/\s+/g, '_')}`,
          city: searchDistrict || 'Bhopal',
          district: searchDistrict || 'Bhopal',
          area: l.address,
          address: l.address,
          state: searchState || 'Madhya Pradesh',
          rating: l.rating || 4.5,
          userRatingsTotal: l.userRatingsTotal || 12,
          reviewCount: l.userRatingsTotal || 12,
          mapsUri: l.mapsUri || '',
          source: 'internet_search',
          status: 'new',
          notes: l.reviewSnippet || 'Discovered via Multi-Engine Internet Discovery',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });

      const res = await bulkSaveMarketingLeads(formatted);
      addToast(`${res.count} इंटरनेट लीड्स डेटाबेस में सफलतापूर्वक सेव हो गईं!`, 'success');
      await loadLeads();
      setActiveTab('database');
    } catch (err) {
      console.error('Save internet leads error:', err);
      addToast('लीड्स डेटाबेस में सेव करने में त्रुटि हुई।', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Excel File Upload & Initialize Template Converter
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setRawFileRef(file);

    try {
      const rawData = await readRawExcelFile(file);
      setRawExcelData(rawData);

      if (rawData.headers.length === 0 || rawData.rawMatrix.length === 0) {
        addToast('एक्सेल शीट खाली है या डेटा पंक्तियाँ नहीं मिलीं।', 'error');
        setIsUploading(false);
        return;
      }

      // Automatically map columns with regex and language heuristics and sample data rows
      const detectedMapping = autoDetectColumnMapping(rawData.headers, rawData.rawMatrix);
      setColumnMapping(detectedMapping);

      // Perform initial conversion
      const result = convertRawExcelDataToTemplate(
        rawData,
        detectedMapping,
        defaultFallbackOptions,
        leads
      );
      setConvertedPreview(result);

      if (result.validLeads.length > 0) {
        addToast(`✅ फ़ाइल कनवर्ट हो गई! ${result.validLeads.length} मान्य लीड्स तैयार हैं। 'डेटाबेस में स्टोर करें' बटन दबाकर सेव करें।`, 'success');
      } else {
        addToast(`फ़ाइल "${file.name}" लोड हुई! ${rawData.totalRows} पंक्तियाँ स्कैन की गईं।`, 'info');
      }
    } catch (err: any) {
      console.error('File parse error:', err);
      addToast(`एक्सेल फ़ाइल पढ़ने में त्रुटि: ${err?.message || 'Error'}`, 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Change Active Sheet for Multi-Sheet Workbooks
  const handleSwitchSheet = async (sheetName: string) => {
    if (!rawFileRef) return;
    setIsUploading(true);
    try {
      const rawData = await readRawExcelFile(rawFileRef, sheetName);
      setRawExcelData(rawData);
      const detectedMapping = autoDetectColumnMapping(rawData.headers, rawData.rawMatrix);
      setColumnMapping(detectedMapping);
      const result = convertRawExcelDataToTemplate(
        rawData,
        detectedMapping,
        defaultFallbackOptions,
        leads
      );
      setConvertedPreview(result);
      addToast(`शीट "${sheetName}" सक्रिय व कनवर्ट हुई!`, 'info');
    } catch (err: any) {
      addToast(`शीट लोड करने में त्रुटि: ${err?.message}`, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Update a specific Column Mapping
  const handleUpdateMappingField = (fieldKey: string, excelHeader: string) => {
    const nextMapping: ColumnMapping = {
      ...columnMapping,
      [fieldKey]: excelHeader,
    };
    setColumnMapping(nextMapping);

    if (rawExcelData) {
      const result = convertRawExcelDataToTemplate(
        rawExcelData,
        nextMapping,
        defaultFallbackOptions,
        leads
      );
      setConvertedPreview(result);
    }
  };

  // Update Default Fallback Options
  const handleUpdateFallbackOption = (key: keyof DefaultFallbackOptions, value: string) => {
    const nextDefaults: DefaultFallbackOptions = {
      ...defaultFallbackOptions,
      [key]: value as any,
    };
    setDefaultFallbackOptions(nextDefaults);

    if (rawExcelData) {
      const result = convertRawExcelDataToTemplate(
        rawExcelData,
        columnMapping,
        nextDefaults,
        leads
      );
      setConvertedPreview(result);
    }
  };

  // Re-run Auto Smart Mapping
  const handleReapplySmartAutoMapping = () => {
    if (!rawExcelData) return;
    const detected = autoDetectColumnMapping(rawExcelData.headers, rawExcelData.rawMatrix);
    setColumnMapping(detected);
    const result = convertRawExcelDataToTemplate(
      rawExcelData,
      detected,
      defaultFallbackOptions,
      leads
    );
    setConvertedPreview(result);
    addToast('स्मार्ट ऑटो-मैपिंग पुनः लागू कर दी गई!', 'success');
  };

  // Download Converted Leads in Official Standard Template (.xlsx)
  const handleDownloadConvertedExcel = () => {
    if (!convertedPreview || convertedPreview.validLeads.length === 0) {
      addToast('कनवर्ट करने के लिए कोई मान्य डेटा नहीं है।', 'error');
      return;
    }
    const baseName = rawExcelData?.fileName ? rawExcelData.fileName.replace(/\.[^/.]+$/, '') : 'Standard';
    exportConvertedToStandardTemplateExcel(convertedPreview.validLeads, baseName);
    addToast('टेम्पलेट अनुसार कनवर्टेड एक्सेल शीट सफलतापूर्वक डाउनलोड हो गई!', 'success');
  };

  // Commit Converted Excel Leads Directly to Firebase Database
  const handleCommitExcelLeadsToFirebase = async () => {
    if (!convertedPreview || convertedPreview.validLeads.length === 0) {
      addToast('सुरक्षित करने के लिए कोई मान्य लीड उपलब्ध नहीं है।', 'error');
      return;
    }

    setIsSavingExcelLeads(true);
    try {
      const res = await bulkSaveMarketingLeads(convertedPreview.validLeads);
      addToast(`🎉 ${res.count} कनवर्टेड लीड्स डेटाबेस में सफलतापूर्वक स्टोर (सुरक्षित) हो गईं!`, 'success');
      setRawExcelData(null);
      setConvertedPreview(null);
      setRawFileRef(null);
      await loadLeads();
      setActiveTab('database');
    } catch (err: any) {
      console.error('Commit excel leads error:', err);
      addToast(`लीड्स स्टोर करने में त्रुटि: ${err?.message || 'Error'}`, 'error');
    } finally {
      setIsSavingExcelLeads(false);
    }
  };

  // WhatsApp Single Message
  const handleSendWhatsAppSingle = (lead: MarketingLead) => {
    const phone = cleanPhoneNumber(lead.phone);
    if (!phone) {
      addToast('मोबाइल नंबर उपलब्ध नहीं है।', 'error');
      return;
    }
    const message = encodeURIComponent(
      `नमस्ते ${lead.contactPerson || lead.businessName || 'जी'}! HARDINKAAM (हर दिन काम) में आपका स्वागत है। हम आपके शहर ${lead.city} में ग्राहकों को सीधे आपसे जोड़ रहे हैं। अपनी सर्विस लिस्ट करें और 100% डायरेक्ट पेमेंट प्राप्त करें। अधिक जानकारी हेतु संपर्क करें: +91 62675 46945`
    );
    window.open(`https://wa.me/91${phone}?text=${message}`, '_blank');
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Top Banner & Title */}
      <div className="bg-gradient-to-r from-stone-900 via-indigo-950 to-stone-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-black uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Universal Marketing Leads Engine &amp; AI Discovery</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-stone-50">
              मार्केटिंग लीड्स व सर्विसमैन खोज केंद्र
            </h1>
            <p className="text-sm text-stone-300 max-w-2xl mt-1">
              पूरे इंटरनेट (Google, Maps, Directiories) से सर्विस प्रोफेशनल्स खोजें, एक्सेल शीट डाउनलोड/अपलोड करें, और फ़ायरबेस में सुरक्षित मार्केटिंग डाटाबेस प्रबंधित करें।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={downloadMarketingLeadsExcelTemplate}
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-stone-100 font-bold text-xs flex items-center gap-2 transition-all shadow-sm active:scale-95"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>एक्सेल टेम्पलेट डाउनलोड (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                exportMarketingLeadsToExcel(filteredLeads);
                addToast('एक्सेल रिपोर्ट डाउनलोड हो रही है...', 'success');
              }}
              className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs flex items-center gap-2 transition-all shadow-lg active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>लीड्स एक्सेल एक्सपोर्ट ({filteredLeads.length})</span>
            </button>
          </div>
        </div>

        {/* KPI Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <p className="text-[11px] font-bold text-stone-400 uppercase">कुल लीड्स</p>
            <p className="text-xl font-black text-white mt-0.5">{metrics.total}</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <p className="text-[11px] font-bold text-blue-300 uppercase">नई लीड्स (New)</p>
            <p className="text-xl font-black text-blue-400 mt-0.5">{metrics.newCount}</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <p className="text-[11px] font-bold text-amber-300 uppercase">संपर्कित (Contacted)</p>
            <p className="text-xl font-black text-amber-400 mt-0.5">{metrics.contactedCount}</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <p className="text-[11px] font-bold text-purple-300 uppercase">इच्छुक (Interested)</p>
            <p className="text-xl font-black text-purple-400 mt-0.5">{metrics.interestedCount}</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <p className="text-[11px] font-bold text-emerald-300 uppercase">ऑनबोर्डेड कारीगर</p>
            <p className="text-xl font-black text-emerald-400 mt-0.5">{metrics.onboardedCount}</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <p className="text-[11px] font-bold text-amber-300 uppercase">कन्वर्जन रेट</p>
            <p className="text-xl font-black text-amber-300 mt-0.5">{metrics.conversionRate}%</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('database')}
          className={`px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all ${
            activeTab === 'database'
              ? 'bg-stone-900 text-white shadow-md'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <Layers className="w-4 h-4 text-amber-400" />
          <span>सुरक्षित लीड्स डाटाबेस ({leads.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('search')}
          className={`px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all ${
            activeTab === 'search'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <Globe className="w-4 h-4 text-indigo-200" />
          <span>AI इंटरनेट व मैप्स खोज (Multi-Engine Discovery)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all ${
            activeTab === 'upload'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <FileUp className="w-4 h-4 text-emerald-200" />
          <span>एक्सेल अपलोड व श्रेणी प्रबंधन</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('broadcast')}
          className={`px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all ${
            activeTab === 'broadcast'
              ? 'bg-amber-600 text-white shadow-md'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-amber-200" />
          <span>WhatsApp ब्रॉडकास्ट व अभियान</span>
        </button>
      </div>

      {/* TAB 1: DATABASE STORED LEADS EXPLORER & CRUD TABLE */}
      {activeTab === 'database' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="नाम, मोबाइल, श्रेणी, शहर, इलाका या नोट्स से खोजें..."
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-700"
              >
                <option value="all">सभी श्रेणियां (All Categories)</option>
                {MARKETING_CATEGORIES_CATALOG.map((c) => (
                  <option key={c.categoryId} value={c.name}>
                    {c.hindiName} ({c.name})
                  </option>
                ))}
              </select>

              <select
                value={selectedCityFilter}
                onChange={(e) => setSelectedCityFilter(e.target.value)}
                className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-700"
              >
                <option value="all">सभी शहर (All Cities)</option>
                {distinctCities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-700"
              >
                <option value="all">सभी स्थिति (All Status)</option>
                <option value="new">नई (New)</option>
                <option value="contacted">संपर्कित (Contacted)</option>
                <option value="interested">इच्छुक (Interested)</option>
                <option value="onboarded">ऑनबोर्डेड (Onboarded)</option>
                <option value="rejected">रिजेक्टेड (Rejected)</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  setEditingLead({
                    businessName: '',
                    contactPerson: '',
                    phone: '',
                    category: 'Electrician',
                    city: 'Bhopal',
                    state: 'Madhya Pradesh',
                    status: 'new',
                    rating: 4.8,
                    source: 'manual_entry',
                  });
                  setShowAddEditModal(true);
                }}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>नई लीड जोड़ें</span>
              </button>

              <button
                type="button"
                onClick={loadLeads}
                disabled={isLoading}
                className="p-2 bg-stone-100 hover:bg-stone-200 rounded-xl text-stone-600 transition-all active:scale-95"
                title="रिफ्रेश करें"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Sticky Bulk Selection Toolbar */}
          {selectedLeadIds.size > 0 && (
            <div className="bg-amber-500 text-stone-950 p-3 sm:p-4 rounded-2xl shadow-lg flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2 font-black text-xs sm:text-sm">
                <CheckSquare className="w-4 h-4" />
                <span>{selectedLeadIds.size} लीड्स चुनी गईं (Selected)</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleBulkStatusUpdate('contacted')}
                  className="px-3 py-1.5 bg-stone-950 text-white rounded-xl font-bold text-xs hover:bg-stone-800"
                >
                  Mark Contacted
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkStatusUpdate('interested')}
                  className="px-3 py-1.5 bg-purple-900 text-white rounded-xl font-bold text-xs hover:bg-purple-800"
                >
                  Mark Interested
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkStatusUpdate('onboarded')}
                  className="px-3 py-1.5 bg-emerald-900 text-white rounded-xl font-bold text-xs hover:bg-emerald-800"
                >
                  Mark Onboarded
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const selectedList = leads.filter((l) => selectedLeadIds.has(l.id));
                    exportMarketingLeadsToExcel(selectedList, 'Selected_Marketing_Leads');
                  }}
                  className="px-3 py-1.5 bg-white text-stone-950 rounded-xl font-black text-xs hover:bg-stone-100 flex items-center gap-1 shadow"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Selected</span>
                </button>

                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="px-3 py-1.5 bg-rose-600 text-white rounded-xl font-bold text-xs hover:bg-rose-700 flex items-center gap-1 shadow"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedLeadIds(new Set())}
                  className="px-2 py-1 text-stone-900 hover:text-stone-950 font-black text-xs"
                >
                  ✕ Cancel
                </button>
              </div>
            </div>
          )}

          {/* Leads Table */}
          <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-[11px] font-black uppercase tracking-wider text-stone-500">
                    <th className="p-3 pl-4 w-10">
                      <button
                        type="button"
                        onClick={handleToggleSelectAll}
                        className="p-1 text-stone-600 hover:text-stone-900"
                      >
                        {selectedLeadIds.size === filteredLeads.length && filteredLeads.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-amber-600" />
                        ) : (
                          <Square className="w-4 h-4 text-stone-400" />
                        )}
                      </button>
                    </th>
                    <th className="p-3">बिज़नेस / कारीगर नाम</th>
                    <th className="p-3">संपर्क नंबर</th>
                    <th className="p-3">श्रेणी / ट्रेड</th>
                    <th className="p-3">शहर व इलाका</th>
                    <th className="p-3">रेटिंग</th>
                    <th className="p-3">स्रोत (Source)</th>
                    <th className="p-3">स्थिति (Status)</th>
                    <th className="p-3 text-right pr-4">कार्यवाही (Actions)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-xs text-stone-700 font-medium">
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="text-center p-8 text-stone-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
                        <span>डेटाबेस से लीड्स लोड हो रही हैं...</span>
                      </td>
                    </tr>
                  ) : filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center p-8 text-stone-500">
                        <Users className="w-8 h-8 mx-auto text-stone-300 mb-2" />
                        <p className="font-bold text-stone-700">कोई लीड्स नहीं मिलीं।</p>
                        <p className="text-xs text-stone-400 mt-1">
                          "AI इंटरनेट खोज" या "एक्सेल अपलोड" टैब से नई लीड्स जोड़ें।
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => {
                      const isSelected = selectedLeadIds.has(lead.id);
                      const cleanPhone = cleanPhoneNumber(lead.phone);

                      return (
                        <tr
                          key={lead.id}
                          className={`hover:bg-amber-50/40 transition-colors ${
                            isSelected ? 'bg-amber-50/80 font-bold' : ''
                          }`}
                        >
                          {/* Selection Checkbox */}
                          <td className="p-3 pl-4">
                            <button
                              type="button"
                              onClick={() => handleToggleLeadSelection(lead.id)}
                              className="p-1"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-amber-600" />
                              ) : (
                                <Square className="w-4 h-4 text-stone-300 hover:text-stone-500" />
                              )}
                            </button>
                          </td>

                          {/* Business & Contact Name */}
                          <td className="p-3">
                            <div className="font-bold text-stone-900">
                              {lead.businessName || lead.name || 'Service Provider'}
                            </div>
                            {lead.contactPerson && lead.contactPerson !== lead.businessName && (
                              <div className="text-[11px] text-stone-500 flex items-center gap-1">
                                <span>{lead.contactPerson}</span>
                              </div>
                            )}
                          </td>

                          {/* Phone & Instant Contact */}
                          <td className="p-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 font-mono font-bold text-stone-800">
                              <span>+91 {cleanPhone || lead.phone}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {cleanPhone && (
                                <>
                                  <a
                                    href={`tel:+91${cleanPhone}`}
                                    className="p-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700"
                                    title="कॉल करें"
                                  >
                                    <Phone className="w-3 h-3 text-emerald-600" />
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => handleSendWhatsAppSingle(lead)}
                                    className="p-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center gap-1 text-[10px] font-bold"
                                    title="WhatsApp संदेश भेजें"
                                  >
                                    <MessageSquare className="w-3 h-3 text-emerald-600" />
                                    <span>WhatsApp</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </td>

                          {/* Category Badge */}
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-stone-100 text-stone-800 font-bold text-[11px] border border-stone-200">
                              <Tag className="w-3 h-3 text-amber-600" />
                              <span>{lead.category || lead.trade || 'General'}</span>
                            </span>
                          </td>

                          {/* City & Address */}
                          <td className="p-3 max-w-xs">
                            <div className="font-bold text-stone-800 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                              <span>{lead.city || 'Bhopal'}</span>
                            </div>
                            {(lead.address || lead.area) && (
                              <div className="text-[11px] text-stone-500 truncate" title={lead.address || lead.area}>
                                {lead.address || lead.area}
                              </div>
                            )}
                          </td>

                          {/* Rating */}
                          <td className="p-3 whitespace-nowrap">
                            <div className="flex items-center gap-1 text-amber-600 font-bold">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                              <span>{lead.rating || 4.5}</span>
                              <span className="text-[10px] text-stone-400">({lead.reviewCount || 12})</span>
                            </div>
                          </td>

                          {/* Source */}
                          <td className="p-3 whitespace-nowrap">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                lead.source === 'internet_search'
                                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                  : lead.source === 'excel_upload'
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                  : 'bg-stone-100 border-stone-200 text-stone-700'
                              }`}
                            >
                              {lead.source === 'internet_search'
                                ? '🌐 Internet'
                                : lead.source === 'excel_upload'
                                ? '📄 Excel'
                                : '✍️ Manual'}
                            </span>
                          </td>

                          {/* Status Dropdown */}
                          <td className="p-3 whitespace-nowrap">
                            <select
                              value={lead.status || 'new'}
                              onChange={async (e) => {
                                const newStat = e.target.value as any;
                                try {
                                  await saveMarketingLead({ ...lead, status: newStat });
                                  setLeads((prev) =>
                                    prev.map((item) => (item.id === lead.id ? { ...item, status: newStat } : item))
                                  );
                                  addToast('स्टेटस अपडेट हुआ', 'success');
                                } catch (err) {
                                  addToast('स्टेटस अपडेट विफल', 'error');
                                }
                              }}
                              className={`px-2 py-1 rounded-xl font-black text-[11px] border focus:outline-none cursor-pointer ${
                                lead.status === 'onboarded'
                                  ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                                  : lead.status === 'interested'
                                  ? 'bg-purple-100 border-purple-300 text-purple-900'
                                  : lead.status === 'contacted'
                                  ? 'bg-amber-100 border-amber-300 text-amber-900'
                                  : lead.status === 'rejected'
                                  ? 'bg-rose-100 border-rose-300 text-rose-900'
                                  : 'bg-blue-100 border-blue-300 text-blue-900'
                              }`}
                            >
                              <option value="new">NEW</option>
                              <option value="contacted">CONTACTED</option>
                              <option value="interested">INTERESTED</option>
                              <option value="onboarded">ONBOARDED</option>
                              <option value="rejected">REJECTED</option>
                            </select>
                          </td>

                          {/* Actions */}
                          <td className="p-3 text-right pr-4 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {lead.status !== 'onboarded' && (
                                <button
                                  type="button"
                                  onClick={() => handleConvertToServicePro(lead)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] flex items-center gap-1 shadow-sm active:scale-95"
                                  title="सर्विसमैन डायरेक्टरी में जोड़ें"
                                >
                                  <UserCheck className="w-3 h-3" />
                                  <span>Onboard Pro</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setEditingLead(lead);
                                  setShowAddEditModal(true);
                                }}
                                className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700"
                                title="एडिट करें"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteSingle(lead.id, lead.businessName || lead.name || 'Lead')}
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600"
                                title="हटाएं"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AI MULTI-ENGINE INTERNET SEARCH & DISCOVERY */}
      {activeTab === 'search' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base sm:text-lg font-black text-stone-900">
                AI इंटरनेट व मल्टी-सर्च इंजन लीड्स डिस्कवरी
              </h2>
            </div>
            <p className="text-xs text-stone-500">
              Google Maps, Google Search Grounding, Justdial, Sulekha, IndiaMART एवं लोकल डायरेक्टरी डाटा से सक्रिय कारीगरों और दुकानों की तुरंत सूची निकालें।
            </p>

            {/* Search Filters Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              {/* Trade Category */}
              <div>
                <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                  ट्रेड / श्रेणी (Category)
                </label>
                <select
                  value={searchTrade}
                  onChange={(e) => setSearchTrade(e.target.value)}
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:outline-none focus:border-indigo-500"
                >
                  {MARKETING_CATEGORIES_CATALOG.map((c) => (
                    <option key={c.categoryId} value={c.name}>
                      {c.hindiName} ({c.name})
                    </option>
                  ))}
                  <option value="All Services">सभी प्रकार के कारीगर (All Trades)</option>
                </select>
              </div>

              {/* State */}
              <div>
                <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                  राज्य (State)
                </label>
                <select
                  value={searchState}
                  onChange={(e) => setSearchState(e.target.value)}
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Madhya Pradesh">Madhya Pradesh (मध्य प्रदेश)</option>
                  <option value="Uttar Pradesh">Uttar Pradesh (उत्तर प्रदेश)</option>
                  <option value="Rajasthan">Rajasthan (राजस्थान)</option>
                  <option value="Maharashtra">Maharashtra (महाराष्ट्र)</option>
                  <option value="Gujarat">Gujarat (गुजरात)</option>
                  <option value="Delhi">Delhi NCR (दिल्ली)</option>
                  <option value="Chhattisgarh">Chhattisgarh (छत्तीसगढ़)</option>
                  <option value="Bihar">Bihar (बिहार)</option>
                </select>
              </div>

              {/* District / City */}
              <div>
                <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                  जिला / शहर (District / City)
                </label>
                <input
                  type="text"
                  value={searchDistrict}
                  onChange={(e) => setSearchDistrict(e.target.value)}
                  placeholder="उदा. Bhopal, Indore, Gwalior..."
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Locality / Tehsil */}
              <div>
                <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                  इलाका / तहसील (Area / Locality)
                </label>
                <input
                  type="text"
                  value={searchLocality}
                  onChange={(e) => setSearchLocality(e.target.value)}
                  placeholder="उदा. MP Nagar, Arera Colony, City Center..."
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Custom Freeform Query */}
            <div>
              <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                कस्टम सर्च कीवर्ड (वैकल्पिक / Optional Query)
              </label>
              <input
                type="text"
                value={customSearchQuery}
                onChange={(e) => setCustomSearchQuery(e.target.value)}
                placeholder="उदा. Commercial electrician contractors in Bhopal Zone 2, RO plant repairmen..."
                className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Search Execute Button */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleExecuteInternetSearch}
                disabled={isSearchingInternet}
                className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50"
              >
                <Search className={`w-4 h-4 ${isSearchingInternet ? 'animate-spin' : ''}`} />
                <span>{isSearchingInternet ? 'सर्च इंजन स्कैन हो रहे हैं...' : 'पूरे इंटरनेट से लीड्स खोजें (Scan Internet)'}</span>
              </button>
            </div>
          </div>

          {/* AI Search Summary Note */}
          {internetSearchSummary && (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs text-indigo-950 font-medium">
              <div className="font-bold flex items-center gap-2 text-indigo-900 mb-1">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>AI डिस्कवरी सारांश:</span>
              </div>
              <p className="whitespace-pre-line text-stone-700">{internetSearchSummary}</p>
            </div>
          )}

          {/* Discovered Leads Staging Grid */}
          {internetSearchResults.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
                <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-stone-900">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>{internetSearchResults.length} लीड्स मिलीं ({selectedInternetLeadIds.size} चुनी गईं)</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedInternetLeadIds.size === internetSearchResults.length) {
                        setSelectedInternetLeadIds(new Set());
                      } else {
                        setSelectedInternetLeadIds(new Set(internetSearchResults.map((l) => l.id)));
                      }
                    }}
                    className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-xl text-xs font-bold text-stone-700"
                  >
                    {selectedInternetLeadIds.size === internetSearchResults.length ? 'Deselect All' : 'Select All'}
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveInternetLeadsToDatabase}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>डेटाबेस में सेव करें ({selectedInternetLeadIds.size})</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {internetSearchResults.map((item) => {
                  const isSelected = selectedInternetLeadIds.has(item.id);
                  const cleanPhone = cleanPhoneNumber(item.phone);

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        const next = new Set(selectedInternetLeadIds);
                        if (next.has(item.id)) next.delete(item.id);
                        else next.add(item.id);
                        setSelectedInternetLeadIds(next);
                      }}
                      className={`p-4 rounded-3xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-indigo-50/70 border-indigo-300 shadow-md ring-2 ring-indigo-500/20'
                          : 'bg-white border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="font-black text-sm text-stone-900">
                          {item.businessName || item.name}
                        </div>
                        <div className="p-1">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4 text-stone-300" />
                          )}
                        </div>
                      </div>

                      <div className="space-y-1 text-xs text-stone-600 font-medium">
                        <div className="flex items-center gap-1.5 text-stone-800 font-bold">
                          <Tag className="w-3.5 h-3.5 text-amber-500" />
                          <span>{item.trade || searchTrade}</span>
                        </div>

                        {cleanPhone ? (
                          <div className="flex items-center gap-1.5 font-mono font-bold text-stone-900">
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            <span>+91 {cleanPhone}</span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-stone-400 italic">फ़ोन नंबर सार्वजनिक लिस्टिंग में उपलब्ध नहीं</div>
                        )}

                        <div className="flex items-start gap-1.5 text-[11px] text-stone-500">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{item.address || `${searchDistrict}, ${searchState}`}</span>
                        </div>

                        {item.rating && (
                          <div className="flex items-center gap-1 text-[11px] text-amber-600 font-bold pt-1">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                            <span>{item.rating} ★</span>
                            <span className="text-stone-400">({item.userRatingsTotal || 15} reviews)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: EXCEL UPLOAD, TEMPLATE CONVERTER & COLUMN MAPPER */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          {/* Download Guidelines Strip */}
          <div className="bg-gradient-to-r from-emerald-900 via-stone-900 to-emerald-950 p-6 rounded-3xl text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-black text-base sm:text-lg flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <span>HARDINKAAM स्टैंडर्ड एक्सेल टेम्पलेट (.xlsx)</span>
              </h3>
              <p className="text-xs text-stone-300 max-w-xl">
                इस टेम्पलेट में सभी सिस्टम श्रेणियां (Electrician, Plumber, AC, Painter, Mason, आदि) पहले से मौजूद हैं। यदि आपके पास अपनी कोई भी एक्सेल या CSV फ़ाइल है, तो उसे नीचे अपलोड करें - हमारा कनवर्टर उसे स्वचालित रूप से टेम्पलेट अनुसार मैप और कनवर्ट कर देगा।
              </p>
            </div>

            <button
              type="button"
              onClick={downloadMarketingLeadsExcelTemplate}
              className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs flex items-center gap-2 shadow-lg active:scale-95 transition-all shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>खाली टेम्पलेट डाउनलोड करें (.xlsx)</span>
            </button>
          </div>

          {/* Upload Dropzone */}
          {!rawExcelData && (
            <div className="bg-white p-8 sm:p-12 rounded-3xl border-2 border-dashed border-stone-300 hover:border-emerald-500 transition-colors text-center space-y-4 shadow-sm">
              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
                id="excel-leads-file-input"
              />

              <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 shadow-inner">
                <Upload className={`w-8 h-8 ${isUploading ? 'animate-bounce' : ''}`} />
              </div>

              <div>
                <h3 className="text-lg font-black text-stone-900">
                  किसी भी फ़ॉर्मेट की एक्सेल या CSV फ़ाइल यहाँ अपलोड करें
                </h3>
                <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
                  आपकी फ़ाइल में कोई भी कॉलम नाम हो (जैसे <i>नाम, मोबाइल, दुकान, काम, शहर</i>) - हमारा स्मार्ट कनवर्टर उसे टेम्पलेट के अनुसार कन्वर्ट कर देगा।
                </p>
              </div>

              <div className="pt-2">
                <label
                  htmlFor="excel-leads-file-input"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-black text-xs sm:text-sm cursor-pointer shadow-md active:scale-95 transition-all"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>फ़ाइल चुनें (Upload &amp; Convert Excel)</span>
                </label>
              </div>
            </div>
          )}

          {/* ACTIVE TEMPLATE CONVERTER & COLUMN MAPPER WORKSPACE */}
          {rawExcelData && convertedPreview && (
            <div className="space-y-6">
              {/* Green Success Banner for Auto-Conversion */}
              <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 p-4 sm:p-5 rounded-3xl text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
                    <Sparkles className="w-6 h-6 text-emerald-200" />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-black flex items-center gap-2">
                      <span>✨ एक्सेल फ़ाइल टेम्पलेट अनुसार ऑटोमैटिक कनवर्ट हो गई!</span>
                    </h4>
                    <p className="text-xs text-emerald-100 mt-0.5">
                      कुल <strong className="text-white underline">{convertedPreview.validLeads.length} मान्य लीड्स</strong> डेटाबेस में सुरक्षित होने के लिए पूरी तरह तैयार हैं।
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCommitExcelLeadsToFirebase}
                  disabled={isSavingExcelLeads || convertedPreview.validLeads.length === 0}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl active:scale-95 transition-all shrink-0 cursor-pointer"
                >
                  <CheckCircle2 className={`w-5 h-5 text-emerald-600 ${isSavingExcelLeads ? 'animate-spin' : ''}`} />
                  <span>{isSavingExcelLeads ? 'डेटाबेस में सेव हो रहा है...' : `💾 डेटाबेस में स्टोर करें (${convertedPreview.validLeads.length} Leads)`}</span>
                </button>
              </div>

              {/* File & Conversion Control Header */}
              <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-stone-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs flex items-center gap-1.5">
                        <FileCheck2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>एक्सेल कनवर्टर सक्रिय</span>
                      </span>
                      {rawExcelData.sheetNames.length > 1 && (
                        <div className="flex items-center gap-1 bg-stone-100 px-2 py-0.5 rounded-lg text-xs font-bold text-stone-700">
                          <span>शीट:</span>
                          <select
                            value={rawExcelData.selectedSheet}
                            onChange={(e) => handleSwitchSheet(e.target.value)}
                            className="bg-transparent font-black text-stone-900 focus:outline-none cursor-pointer"
                          >
                            {rawExcelData.sheetNames.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
                      <span>फ़ाइल: {rawExcelData.fileName}</span>
                    </h3>
                    <p className="text-xs text-stone-500">
                      कुल पंक्तियाँ: <strong>{convertedPreview.totalParsed}</strong> | मान्य लीड्स: <strong className="text-emerald-600 font-bold">{convertedPreview.validLeads.length}</strong> | डुप्लीकेट नंबर: <strong className="text-amber-600">{convertedPreview.duplicateCount}</strong> | अमान्य नंबर: <strong className="text-rose-600">{convertedPreview.invalidCount}</strong>
                    </p>
                  </div>

                  {/* Primary Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setRawExcelData(null);
                        setConvertedPreview(null);
                        setRawFileRef(null);
                      }}
                      className="px-3.5 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-xs font-bold text-stone-700 active:scale-95 transition-all"
                    >
                      दूसरी फ़ाइल चुनें
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadConvertedExcel}
                      disabled={convertedPreview.validLeads.length === 0}
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center gap-2 shadow-md active:scale-95 transition-all disabled:opacity-50"
                      title="इस डाटा को स्टैंडर्ड टेम्पलेट एक्सेल में बदल कर डाउनलोड करें"
                    >
                      <Download className="w-4 h-4 text-indigo-200" />
                      <span>कनवर्टेड एक्सेल डाउनलोड करें (.xlsx)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCommitExcelLeadsToFirebase}
                      disabled={isSavingExcelLeads || convertedPreview.validLeads.length === 0}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <CheckCircle2 className={`w-4 h-4 ${isSavingExcelLeads ? 'animate-spin' : ''}`} />
                      <span>{isSavingExcelLeads ? 'डेटाबेस में सेव हो रहा है...' : `💾 डेटाबेस में स्टोर करें (${convertedPreview.validLeads.length})`}</span>
                    </button>
                  </div>
                </div>

                {/* Conversion Diagnostics & Errors if any */}
                {convertedPreview.errors.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-amber-900">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>चेतावनी: कुछ पंक्तियों में मोबाइल नंबर अनुपलब्ध या अमान्य थे (10 अंक आवश्यक):</span>
                    </div>
                    {convertedPreview.errors.slice(0, 4).map((err, i) => (
                      <p key={i} className="text-[11px] text-amber-800 ml-5">• {err}</p>
                    ))}
                  </div>
                )}

                {/* Converter Options Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleReapplySmartAutoMapping}
                      className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-bold text-xs flex items-center gap-1.5 transition-all"
                    >
                      <Wand2 className="w-3.5 h-3.5 text-amber-600" />
                      <span>स्मार्ट ऑटो-डिटेक्ट (Auto Re-Map)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowAdvancedMapping(!showAdvancedMapping)}
                      className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs flex items-center gap-1.5 transition-all"
                    >
                      <Settings2 className="w-3.5 h-3.5 text-stone-600" />
                      <span>{showAdvancedMapping ? 'कॉलम मैपिंग छुपाएं' : 'कॉलम मैपिंग बदलें (Customize Columns)'}</span>
                    </button>
                  </div>

                  <div className="text-xs text-stone-500 font-medium">
                    पहचाने गए कॉलम: <span className="font-bold text-stone-800">{rawExcelData.headers.length}</span>
                  </div>
                </div>

                {/* CUSTOM COLUMN MAPPING PANEL (COLLAPSIBLE / EXPANDABLE) */}
                {showAdvancedMapping && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-4 animate-in fade-in">
                    <div>
                      <h4 className="font-black text-xs sm:text-sm text-stone-900 flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-emerald-600" />
                        <span>कॉलम मैपिंग (Map Your Excel Columns to Template Fields)</span>
                      </h4>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        अपनी अपलोड की गई एक्सेल के कॉलम को HARDINKAAM टेम्पलेट के मानक फ़ील्ड्स से मिलान करें:
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {TEMPLATE_FIELD_DEFINITIONS.map((f) => {
                        const currentMapped = (columnMapping as any)[f.key] || '';
                        return (
                          <div key={f.key} className="bg-white p-3 rounded-xl border border-stone-200 shadow-2xs space-y-1">
                            <label className="flex items-center justify-between text-[11px] font-bold text-stone-700">
                              <span>{f.label}</span>
                              {f.required && (
                                <span className="text-[10px] text-rose-600 font-bold uppercase bg-rose-50 px-1.5 py-0.2 rounded">अनिवार्य</span>
                              )}
                            </label>

                            <select
                              value={currentMapped}
                              onChange={(e) => handleUpdateMappingField(f.key, e.target.value)}
                              className={`w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                                currentMapped
                                  ? 'bg-emerald-50/50 border-emerald-300 text-stone-900'
                                  : f.required
                                  ? 'bg-rose-50 border-rose-300 text-rose-900'
                                  : 'bg-stone-50 border-stone-200 text-stone-500'
                              }`}
                            >
                              <option value="">-- छोड़ें / फ़ाइल में उपलब्ध नहीं --</option>
                              {rawExcelData.headers.map((h, i) => (
                                <option key={i} value={h}>
                                  {h}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>

                    {/* Default Fallback Settings */}
                    <div className="pt-3 border-t border-stone-200">
                      <h5 className="font-bold text-xs text-stone-800 mb-2">
                        डिफ़ॉल्ट सेटिंग्स (यदि एक्सेल में कॉलम खाली या अनुपलब्ध हो):
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">
                            डिफ़ॉल्ट कैटिगरी
                          </label>
                          <select
                            value={defaultFallbackOptions.defaultCategory}
                            onChange={(e) => handleUpdateFallbackOption('defaultCategory', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-800"
                          >
                            {MARKETING_CATEGORIES_CATALOG.map((c) => (
                              <option key={c.categoryId} value={c.name}>
                                {c.name} ({c.hindiName})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">
                            डिफ़ॉल्ट शहर
                          </label>
                          <input
                            type="text"
                            value={defaultFallbackOptions.defaultCity}
                            onChange={(e) => handleUpdateFallbackOption('defaultCity', e.target.value)}
                            placeholder="e.g. Bhopal"
                            className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-800"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">
                            डिफ़ॉल्ट राज्य
                          </label>
                          <input
                            type="text"
                            value={defaultFallbackOptions.defaultState}
                            onChange={(e) => handleUpdateFallbackOption('defaultState', e.target.value)}
                            placeholder="e.g. Madhya Pradesh"
                            className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-800"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">
                            डिफ़ॉल्ट स्थिति (Status)
                          </label>
                          <select
                            value={defaultFallbackOptions.defaultStatus}
                            onChange={(e) => handleUpdateFallbackOption('defaultStatus', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-800"
                          >
                            <option value="new">NEW (नई लीड्स)</option>
                            <option value="contacted">CONTACTED (संपर्कित)</option>
                            <option value="interested">INTERESTED (इच्छुक)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* LIVE CONVERTED PREVIEW TABLE */}
              <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-sm text-stone-900 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-indigo-600" />
                    <span>कनवर्टेड लीड्स लाइव प्रिव्यू (Converted Standard Rows)</span>
                  </h4>
                  <span className="text-xs text-stone-500">
                    दिखाए जा रहे हैं: शीर्ष {Math.min(50, convertedPreview.validLeads.length)} of {convertedPreview.validLeads.length}
                  </span>
                </div>

                <div className="overflow-x-auto max-h-96 border border-stone-200 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-stone-50 sticky top-0 border-b border-stone-200 font-black text-[11px] text-stone-600 uppercase">
                      <tr>
                        <th className="p-2.5 text-center">#</th>
                        <th className="p-2.5">बिज़नेस / फर्म</th>
                        <th className="p-2.5">कारीगर / मालिक</th>
                        <th className="p-2.5">मोबाइल नंबर</th>
                        <th className="p-2.5">कैटिगरी</th>
                        <th className="p-2.5">शहर</th>
                        <th className="p-2.5">पता / इलाका</th>
                        <th className="p-2.5">रेटिंग</th>
                        <th className="p-2.5">स्थिति</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                      {convertedPreview.validLeads.slice(0, 50).map((row, idx) => (
                        <tr key={idx} className="hover:bg-emerald-50/40 transition-colors">
                          <td className="p-2.5 text-center text-stone-400 font-mono">{idx + 1}</td>
                          <td className="p-2.5 font-black text-stone-900">{row.businessName}</td>
                          <td className="p-2.5 text-stone-700">{row.contactPerson || '-'}</td>
                          <td className="p-2.5 font-mono font-black text-emerald-700">+91 {row.phone}</td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-900 font-bold text-[10px] border border-stone-200">
                              {row.category}
                            </span>
                          </td>
                          <td className="p-2.5 font-bold text-stone-800">{row.city}</td>
                          <td className="p-2.5 text-stone-500 max-w-xs truncate">{row.address || row.area || '-'}</td>
                          <td className="p-2.5 text-amber-600 font-bold">★ {row.rating || 4.5}</td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-800">
                              {row.status || 'NEW'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Categories Quick Reference Cards */}
          <div className="space-y-3">
            <h4 className="font-black text-sm text-stone-900">
              मान्य सिस्टम श्रेणियां (Allowed Categories in HARDINKAAM)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {MARKETING_CATEGORIES_CATALOG.map((cat) => (
                <div key={cat.categoryId} className="p-3 bg-white rounded-2xl border border-stone-200 shadow-sm text-xs space-y-1">
                  <div className="font-bold text-stone-900 flex items-center justify-between">
                    <span>{cat.hindiName}</span>
                    <span className="text-[10px] font-mono text-stone-400">{cat.categoryId}</span>
                  </div>
                  <div className="text-[11px] text-stone-600 font-bold">{cat.name}</div>
                  <div className="text-[10px] text-stone-400 line-clamp-2">{cat.suggestedTrades}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: WHATSAPP & CAMPAIGN BROADCAST */}
      {activeTab === 'broadcast' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
              <h3 className="font-black text-base sm:text-lg text-stone-900">
                WhatsApp व SMS मार्केटिंग अभियान (Campaign Dispatcher)
              </h3>
            </div>
            <p className="text-xs text-stone-500">
              डेटाबेस में सुरक्षित लीड्स को एक-क्लिक में WhatsApp या SMS प्रचार संदेश भेजें।
            </p>

            {/* Target Leads Filter */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                  टारगेट स्थिति (Target Status)
                </label>
                <select
                  value={broadcastTargetStatus}
                  onChange={(e) => setBroadcastTargetStatus(e.target.value)}
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800"
                >
                  <option value="all">सभी लीड्स ({leads.length})</option>
                  <option value="new">केवल नई लीड्स ({leads.filter((l) => l.status === 'new').length})</option>
                  <option value="contacted">संपर्कित लीड्स ({leads.filter((l) => l.status === 'contacted').length})</option>
                  <option value="interested">इच्छुक लीड्स ({leads.filter((l) => l.status === 'interested').length})</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                  टारगेट शहर (City)
                </label>
                <select
                  value={selectedCityFilter}
                  onChange={(e) => setSelectedCityFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800"
                >
                  <option value="all">सभी शहर (All Cities)</option>
                  {distinctCities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                  टारगेट श्रेणी (Category)
                </label>
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800"
                >
                  <option value="all">सभी श्रेणियां</option>
                  {MARKETING_CATEGORIES_CATALOG.map((c) => (
                    <option key={c.categoryId} value={c.name}>
                      {c.hindiName} ({c.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Message Template Editor */}
            <div>
              <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                प्रचार संदेश टेक्स्ट (Message Template)
              </label>
              <textarea
                rows={4}
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Broadcast Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="text-xs font-bold text-stone-600">
                टारगेट प्राप्तकर्ता: <span className="text-emerald-700 font-black">{filteredLeads.length} नंबर</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (filteredLeads.length === 0) {
                      addToast('कोई मान्य नंबर नहीं मिला।', 'error');
                      return;
                    }
                    const firstLead = filteredLeads[0];
                    const cleanPhone = cleanPhoneNumber(firstLead.phone);
                    const msg = encodeURIComponent(broadcastMessage);
                    window.open(`https://wa.me/91${cleanPhone}?text=${msg}`, '_blank');
                    addToast(`पहला संदेश ${firstLead.phone} को खोला गया।`, 'success');
                  }}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl flex items-center gap-2 shadow-lg active:scale-95 transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>WhatsApp ब्रॉडकास्ट शुरू करें</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT LEAD MODAL */}
      {showAddEditModal && editingLead && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl p-6 border border-stone-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-black text-base text-stone-900">
                {editingLead.id ? 'लीड विवरण अपडेट करें' : 'नई मार्केटिंग लीड जोड़ें'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddEditModal(false);
                  setEditingLead(null);
                }}
                className="p-1 rounded-full text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSingleLead} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-600 mb-1">
                    फर्म / दुकान / बिज़नेस का नाम *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingLead.businessName || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, businessName: e.target.value })}
                    placeholder="उदा. शर्मा इलेक्ट्रिकल्स"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-600 mb-1">
                    संपर्क व्यक्ति का नाम
                  </label>
                  <input
                    type="text"
                    value={editingLead.contactPerson || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, contactPerson: e.target.value })}
                    placeholder="उदा. रमेश शर्मा"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-600 mb-1">
                    मोबाइल नंबर (10 अंक) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={editingLead.phone || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, phone: e.target.value })}
                    placeholder="9826012345"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono font-bold text-stone-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-600 mb-1">
                    ट्रेड श्रेणी (Category) *
                  </label>
                  <select
                    value={editingLead.category || 'Electrician'}
                    onChange={(e) => {
                      const catName = e.target.value;
                      const matched = MARKETING_CATEGORIES_CATALOG.find((c) => c.name === catName);
                      setEditingLead({
                        ...editingLead,
                        category: catName,
                        categoryId: matched?.categoryId || 'cat_electrician',
                        trade: catName,
                      });
                    }}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-800"
                  >
                    {MARKETING_CATEGORIES_CATALOG.map((c) => (
                      <option key={c.categoryId} value={c.name}>
                        {c.hindiName} ({c.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-stone-600 mb-1">शहर (City) *</label>
                  <input
                    type="text"
                    required
                    value={editingLead.city || 'Bhopal'}
                    onChange={(e) => setEditingLead({ ...editingLead, city: e.target.value })}
                    placeholder="Bhopal"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-600 mb-1">इलाका / Area</label>
                  <input
                    type="text"
                    value={editingLead.area || editingLead.address || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, area: e.target.value, address: e.target.value })}
                    placeholder="MP Nagar Zone 2"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-600 mb-1">स्थिति (Status)</label>
                  <select
                    value={editingLead.status || 'new'}
                    onChange={(e) => setEditingLead({ ...editingLead, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-800"
                  >
                    <option value="new">NEW</option>
                    <option value="contacted">CONTACTED</option>
                    <option value="interested">INTERESTED</option>
                    <option value="onboarded">ONBOARDED</option>
                    <option value="rejected">REJECTED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-600 mb-1">रेटिंग (1-5)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={editingLead.rating || 4.8}
                    onChange={(e) => setEditingLead({ ...editingLead, rating: parseFloat(e.target.value) || 4.5 })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-600 mb-1">ईमेल (वैकल्पिक)</label>
                  <input
                    type="email"
                    value={editingLead.email || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, email: e.target.value })}
                    placeholder="email@example.com"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-600 mb-1">विशेष विवरण / नोट्स</label>
                <textarea
                  rows={2}
                  value={editingLead.notes || ''}
                  onChange={(e) => setEditingLead({ ...editingLead, notes: e.target.value })}
                  placeholder="कारीगर के काम का अनुभव, मुख्य सेवाएं, दुकान का पता..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-semibold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddEditModal(false);
                    setEditingLead(null);
                  }}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl"
                >
                  रद्द करें
                </button>

                <button
                  type="submit"
                  disabled={isSavingLead}
                  className="px-6 py-2 bg-stone-900 hover:bg-stone-800 text-white font-black rounded-xl shadow active:scale-95 disabled:opacity-50"
                >
                  {isSavingLead ? 'सेव हो रहा है...' : 'लीड सुरक्षित करें'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
