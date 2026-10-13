import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Database,
  Trash2,
  Search,
  RefreshCw,
  Eye,
  X,
  Check,
  CheckCircle2,
  AlertTriangle,
  Download,
  FileSpreadsheet,
  Copy,
  FileText,
  Layers,
  ShieldAlert,
  ArrowUpDown,
  Filter,
  Code2,
  Calendar,
  DollarSign,
  Users,
  MessageSquare,
  Wrench,
  Building2,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Radio,
  FileCode,
} from 'lucide-react';
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  limit as firestoreLimit,
  query,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';

interface Props {
  onSelectTab?: (tab: string) => void;
  onOpenZeroDataModal?: () => void;
}

interface CollectionMeta {
  id: string;
  nameEn: string;
  nameHi: string;
  category: 'core' | 'financial' | 'communication' | 'compliance' | 'system';
  icon: any;
  dangerLevel: 'low' | 'medium' | 'high';
  description: string;
}

const KNOWN_COLLECTIONS: CollectionMeta[] = [
  // Core Business
  {
    id: 'bookings',
    nameEn: 'Bookings & Orders',
    nameHi: 'बुकिंग्स व ऑर्डर्स',
    category: 'core',
    icon: Calendar,
    dangerLevel: 'medium',
    description: 'ग्राहक बुकिंग्स, ऑर्डर स्थिति, भुगतान मोड व टाइम-स्लॉट',
  },
  {
    id: 'services',
    nameEn: 'Catalog Services',
    nameHi: 'कैटलॉग सेवाएँ (रेट कार्ड)',
    category: 'core',
    icon: Wrench,
    dangerLevel: 'high',
    description: 'प्लेटफ़ॉर्म की सभी सेवाएँ, कीमतें व विवरण (कैटलॉग)',
  },
  {
    id: 'categories',
    nameEn: 'Service Categories',
    nameHi: 'सेवा श्रेणियां (Categories)',
    category: 'core',
    icon: Layers,
    dangerLevel: 'high',
    description: 'मुख्य श्रेणियां যেমন प्लंबिंग, एसी, इलेक्ट्रिकल आदि',
  },
  {
    id: 'users',
    nameEn: 'User Profiles',
    nameHi: 'उपयोगकर्ता प्रोफ़ाइल (Users)',
    category: 'core',
    icon: Users,
    dangerLevel: 'high',
    description: 'सभी रजिस्टर्ड ग्राहक, एडमिन व पार्टनर खाते',
  },
  {
    id: 'service_men',
    nameEn: 'Service Professionals',
    nameHi: 'कारीगर / तकनीशियन (Pros)',
    category: 'core',
    icon: ShieldCheck,
    dangerLevel: 'high',
    description: 'सत्यापित व गैर-सत्यापित सर्विसमैन प्रोफ़ाइल',
  },
  {
    id: 'business_partners',
    nameEn: 'Business Partners',
    nameHi: 'बिजनेस पार्टनर / फ्लीट',
    category: 'core',
    icon: Building2,
    dangerLevel: 'medium',
    description: 'स्थानीय फ्लीट व वेंडर पार्टनर्स',
  },

  // Financial
  {
    id: 'transactions',
    nameEn: 'Transactions Ledger',
    nameHi: 'लेनदेन लेजर (Transactions)',
    category: 'financial',
    icon: DollarSign,
    dangerLevel: 'medium',
    description: 'सभी ऑनलाइन/कैश भुगतान व ट्रांजैक्शन रिकॉर्ड्स',
  },
  {
    id: 'payments',
    nameEn: 'Payment Gateway Logs',
    nameHi: 'पेमेंट गेटवे रिकॉर्ड्स',
    category: 'financial',
    icon: DollarSign,
    dangerLevel: 'medium',
    description: 'Razorpay / UPI भुगतान सत्यापन रिकॉर्ड्स',
  },
  {
    id: 'wallets',
    nameEn: 'User Wallets',
    nameHi: 'उपयोगकर्ता वॉलेट्स',
    category: 'financial',
    icon: DollarSign,
    dangerLevel: 'high',
    description: 'ग्राहकों व तकनीशियनों के वॉलेट बैलेंस व लेजर',
  },
  {
    id: 'wallet_transactions',
    nameEn: 'Wallet Transactions',
    nameHi: 'वॉलेट पासबुक एंट्रीज',
    category: 'financial',
    icon: DollarSign,
    dangerLevel: 'medium',
    description: 'वॉलेट क्रेडिट, डेबिट, पेआउट व कमीशन एंट्रीज',
  },
  {
    id: 'serviceman_payouts',
    nameEn: 'Technician Payouts',
    nameHi: 'सर्विसमैन पेआउट रिकॉर्ड्स',
    category: 'financial',
    icon: DollarSign,
    dangerLevel: 'medium',
    description: 'कंपनी कमीशन (15%) व TDS काटकर किए गए ट्रांसफर',
  },

  // Communication
  {
    id: 'messages',
    nameEn: 'In-App Chat Messages',
    nameHi: 'चैट संदेश (Messages)',
    category: 'communication',
    icon: MessageSquare,
    dangerLevel: 'low',
    description: 'ग्राहक और कारीगर के बीच लाइव चैट संदेश',
  },
  {
    id: 'chat_conversations',
    nameEn: 'Chat Conversations',
    nameHi: 'चैट वार्तालाप थ्रेड्स',
    category: 'communication',
    icon: MessageSquare,
    dangerLevel: 'low',
    description: 'सक्रिय और पूर्व वार्तालाप मेटाडेटा',
  },
  {
    id: 'whatsapp_logs',
    nameEn: 'WhatsApp Dispatches',
    nameHi: 'व्हाट्सएप संदेश लॉग्स',
    category: 'communication',
    icon: MessageSquare,
    dangerLevel: 'low',
    description: 'ऑटोमैटिक बुकिंग पुष्टि व OTP व्हाट्सएप लॉग्स',
  },
  {
    id: 'bulk_campaigns',
    nameEn: 'Bulk SMS Campaigns',
    nameHi: 'बल्क SMS अभियान',
    category: 'communication',
    icon: Radio,
    dangerLevel: 'low',
    description: 'DLT बल्क SMS अभियान व स्टेटस रिकॉर्ड्स',
  },
  {
    id: 'sms_logs',
    nameEn: 'SMS Delivery Logs',
    nameHi: 'SMS डिलीवरी लॉग्स',
    category: 'communication',
    icon: Radio,
    dangerLevel: 'low',
    description: 'व्यक्तिगत SMS डिलीवरी इतिहास',
  },
  {
    id: 'video_calls',
    nameEn: 'Live Video Sessions',
    nameHi: 'वीडियो कॉल रूम्स',
    category: 'communication',
    icon: Radio,
    dangerLevel: 'low',
    description: 'रिमोट टेक्निकल इंस्पेक्शन व लाइव KYC कॉल रूम्स',
  },
  {
    id: 'notifications',
    nameEn: 'In-App Notifications',
    nameHi: 'ऐप नोटिफिकेशन्स',
    category: 'communication',
    icon: MessageSquare,
    dangerLevel: 'low',
    description: 'उपयोगकर्ताओं को भेजे गए पुश व इन-ऐप अलर्ट',
  },

  // Compliance & Governance
  {
    id: 'reviews',
    nameEn: 'Customer Reviews & Ratings',
    nameHi: 'ग्राहक समीक्षाएं व रेटिंग',
    category: 'compliance',
    icon: ShieldCheck,
    dangerLevel: 'medium',
    description: 'सेवाओं और तकनीशियनों को मिली समीक्षाएं',
  },
  {
    id: 'kyc_documents',
    nameEn: 'KYC Document Proofs',
    nameHi: 'केवाईसी दस्तावेज (KYC Proofs)',
    category: 'compliance',
    icon: FileText,
    dangerLevel: 'high',
    description: 'कारीगरों के आधार, पैन व तकनीकी प्रमाणपत्र',
  },
  {
    id: 'franchise_applications',
    nameEn: 'Franchise Leads',
    nameHi: 'फ्रेंचाइज़ी आवेदन (MP)',
    category: 'compliance',
    icon: Building2,
    dangerLevel: 'medium',
    description: 'इंदौर, जबलपुर, ग्वालियर आदि से आए फ्रेंचाइजी आवेदन',
  },
  {
    id: 'franchise_cities',
    nameEn: 'Franchise Cities',
    nameHi: 'फ्रेंचाइज़ी शहर डेटा',
    category: 'compliance',
    icon: Building2,
    dangerLevel: 'medium',
    description: 'शहरवार जनसंख्या, लक्ष्य व राजस्व डेटा',
  },
  {
    id: 'password_reset_tickets',
    nameEn: 'Password Reset Tickets',
    nameHi: 'पासवर्ड रीसेट अनुरोध',
    category: 'compliance',
    icon: Users,
    dangerLevel: 'low',
    description: 'उपयोगकर्ताओं द्वारा किए गए पासवर्ड रीसेट अनुरोध',
  },
  {
    id: 'audit_logs',
    nameEn: 'Admin Audit Logs',
    nameHi: 'ऑडिट व गतिविधि लॉग',
    category: 'compliance',
    icon: ShieldAlert,
    dangerLevel: 'medium',
    description: 'प्रशासनिक गतिविधियों के सुरक्षा लॉग्स',
  },

  // System
  {
    id: 'settings',
    nameEn: 'Platform Settings',
    nameHi: 'सिस्टम सेटिंग्स (Settings)',
    category: 'system',
    icon: Layers,
    dangerLevel: 'high',
    description: 'कमीशन दर, डोमेन कॉन्फ़िग, सुरक्षा व न्यूनतम निकासी',
  },
  {
    id: 'deployments',
    nameEn: 'Deployments History',
    nameHi: 'वेबसाइट डिप्लॉयमेंट रिकॉर्ड्स',
    category: 'system',
    icon: FileCode,
    dangerLevel: 'low',
    description: 'Google AI Studio ZIP अपलोड व डिप्लॉयमेंट इतिहास',
  },
];

interface RawDoc {
  id: string;
  data: Record<string, any>;
}

export const AdminDataExplorer: React.FC<Props> = ({
  onSelectTab,
  onOpenZeroDataModal,
}) => {
  // Collection state
  const [selectedCollection, setSelectedCollection] = useState<string>('bookings');
  const [customCollectionInput, setCustomCollectionInput] = useState<string>('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');

  // Documents state
  const [documents, setDocuments] = useState<RawDoc[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [recordLimit, setRecordLimit] = useState<number>(100);

  // Search & Sorting
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchScopeField, setSearchScopeField] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'id_asc' | 'id_desc'>('newest');

  // Field Value dropdown filter
  const [filterField, setFilterField] = useState<string>('');
  const [filterValue, setFilterValue] = useState<string>('');

  // Date Range filter
  const [datePreset, setDatePreset] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedDateField, setSelectedDateField] = useState<string>('auto');

  // Selection for bulk actions
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());

  // Inspect Modal
  const [inspectDoc, setInspectDoc] = useState<RawDoc | null>(null);

  // Single Delete Modal
  const [docToDelete, setDocToDelete] = useState<RawDoc | null>(null);
  const [isDeletingSingle, setIsDeletingSingle] = useState<boolean>(false);

  // Batch Delete Modal
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState<boolean>(false);
  const [isDeletingBatch, setIsDeletingBatch] = useState<boolean>(false);

  // Feedback Notification
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Copied state indicator
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 20;

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  // Fetch documents whenever selectedCollection or recordLimit changes
  const fetchCollectionDocs = async (targetCollection: string) => {
    setLoading(true);
    setFetchError(null);
    setSelectedDocIds(new Set());
    setCurrentPage(1);
    // Reset filters on collection switch
    setSearchQuery('');
    setSearchScopeField('all');
    setFilterField('');
    setFilterValue('');
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setSelectedDateField('auto');

    try {
      const colRef = collection(db, targetCollection.trim());
      const q = query(colRef, firestoreLimit(recordLimit));
      const snap = await getDocs(q);

      const list: RawDoc[] = [];
      snap.forEach((d) => {
        list.push({
          id: d.id,
          data: d.data() || {},
        });
      });

      setDocuments(list);
    } catch (err: any) {
      console.error('Error fetching collection documents:', err);
      setFetchError(err?.message || 'कलेक्शन लोड करने में त्रुटि आई। कृपया अनुमतियां जांचें।');
      setDocuments([]);
      handleFirestoreError(err, OperationType.GET, targetCollection);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCollection) {
      fetchCollectionDocs(selectedCollection);
    }
  }, [selectedCollection, recordLimit]);

  // Handle custom collection submit
  const handleLoadCustomCollection = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = customCollectionInput.trim();
    if (!clean) return;
    setSelectedCollection(clean);
  };

  // Perform single delete
  const confirmDeleteSingleDoc = async () => {
    if (!docToDelete) return;
    setIsDeletingSingle(true);

    try {
      const docRef = doc(db, selectedCollection, docToDelete.id);
      await deleteDoc(docRef);

      // Remove from state
      setDocuments((prev) => prev.filter((d) => d.id !== docToDelete.id));
      setSelectedDocIds((prev) => {
        const next = new Set(prev);
        next.delete(docToDelete.id);
        return next;
      });

      showToast(
        `दस्तावेज़ ID '${docToDelete.id}' को संग्रह '${selectedCollection}' से सफलतापूर्वक डिलीट कर दिया गया।`,
        'success'
      );

      // If inspect modal was open for this doc, close it
      if (inspectDoc?.id === docToDelete.id) {
        setInspectDoc(null);
      }

      setDocToDelete(null);
    } catch (err: any) {
      console.error('Single delete error:', err);
      showToast(`डिलीट विफल रहा: ${err?.message || 'Permission denied'}`, 'error');
    } finally {
      setIsDeletingSingle(false);
    }
  };

  // Perform batch delete
  const confirmBatchDelete = async () => {
    if (selectedDocIds.size === 0) return;
    setIsDeletingBatch(true);

    const idsToDelete: string[] = Array.from(selectedDocIds);
    let deletedCount = 0;

    try {
      // Chunk into batches of 400 (Firestore batch limit is 500)
      const chunkSize = 400;
      for (let i = 0; i < idsToDelete.length; i += chunkSize) {
        const chunk: string[] = idsToDelete.slice(i, i + chunkSize);
        const batch = writeBatch(db);

        chunk.forEach((id: string) => {
          const docRef = doc(db, selectedCollection, id);
          batch.delete(docRef);
        });

        await batch.commit();
        deletedCount += chunk.length;
      }

      // Update state
      setDocuments((prev) => prev.filter((d) => !selectedDocIds.has(d.id)));
      setSelectedDocIds(new Set());
      setIsBatchDeleteModalOpen(false);

      showToast(
        `सफलतापूर्वक ${deletedCount} दस्तावेज़ों को '${selectedCollection}' से डिलीट कर दिया गया।`,
        'success'
      );
    } catch (err: any) {
      console.error('Batch delete error:', err);
      showToast(`बैच डिलीट त्रुटि: ${err?.message || 'Unknown error'}`, 'error');
    } finally {
      setIsDeletingBatch(false);
    }
  };

  // Helper to extract a display date
  const extractDate = (data: Record<string, any>): string | null => {
    const candidate =
      data.createdAt ||
      data.updatedAt ||
      data.timestamp ||
      data.date ||
      data.scheduledDate ||
      data.appliedAt ||
      data.submittedAt;

    if (!candidate) return null;

    try {
      // If Firestore timestamp object
      if (typeof candidate === 'object' && typeof candidate.toDate === 'function') {
        return candidate.toDate().toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
      if (typeof candidate === 'object' && candidate.seconds) {
        return new Date(candidate.seconds * 1000).toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
      const d = new Date(candidate);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    } catch {
      return String(candidate);
    }
    return String(candidate);
  };

  // Helper to extract primary title / name
  const extractPrimaryLabel = (d: RawDoc): { title: string; subtitle?: string } => {
    const data = d.data;

    // Specific collections priority
    if (data.serviceName) {
      return {
        title: data.serviceName,
        subtitle: data.customerName || data.customerPhone || data.categoryName,
      };
    }
    if (data.name) {
      return {
        title: data.name,
        subtitle: data.email || data.phone || data.category || data.slug,
      };
    }
    if (data.customerName) {
      return {
        title: data.customerName,
        subtitle: data.customerPhone || data.serviceName,
      };
    }
    if (data.title) {
      return {
        title: data.title,
        subtitle: data.category || data.status,
      };
    }
    if (data.email) {
      return {
        title: data.email,
        subtitle: data.phone || data.role,
      };
    }
    if (data.phone) {
      return {
        title: data.phone,
        subtitle: data.role || data.city,
      };
    }
    if (data.recipientPhone) {
      return {
        title: data.recipientPhone,
        subtitle: data.templateName || data.status,
      };
    }
    if (data.applicantName) {
      return {
        title: data.applicantName,
        subtitle: data.city || data.phone,
      };
    }
    if (data.city) {
      return {
        title: data.city,
        subtitle: data.state || `Target: ₹${data.monthlyTarget || 0}`,
      };
    }
    if (data.action) {
      return {
        title: data.action,
        subtitle: data.userEmail || data.performedBy,
      };
    }

    // Fallback: pick first string key
    for (const [key, val] of Object.entries(data)) {
      if (typeof val === 'string' && val.length > 0 && val.length < 50 && key !== 'id') {
        return { title: val, subtitle: key };
      }
    }

    return { title: d.id, subtitle: 'Document' };
  };

  // Helper to identify key badges (status, amount, role)
  const extractBadges = (data: Record<string, any>) => {
    const badges: { text: string; color: string }[] = [];

    if (data.status) {
      const s = String(data.status).toLowerCase();
      let color = 'bg-stone-100 text-stone-700 border-stone-200';
      if (['completed', 'active', 'paid', 'verified', 'success', 'delivered'].includes(s)) {
        color = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      } else if (['pending', 'requested', 'in_progress', 'on_the_way'].includes(s)) {
        color = 'bg-amber-50 text-amber-700 border-amber-200';
      } else if (['cancelled', 'rejected', 'failed', 'suspended'].includes(s)) {
        color = 'bg-red-50 text-red-700 border-red-200';
      }
      badges.push({ text: `Status: ${data.status}`, color });
    }

    if (data.role) {
      badges.push({
        text: `Role: ${data.role}`,
        color: 'bg-purple-50 text-purple-700 border-purple-200',
      });
    }

    if (data.amount !== undefined && data.amount !== null) {
      badges.push({
        text: `₹${Number(data.amount).toLocaleString('en-IN')}`,
        color: 'bg-emerald-50 text-emerald-800 font-bold border-emerald-200',
      });
    } else if (data.price !== undefined && data.price !== null) {
      badges.push({
        text: `₹${Number(data.price).toLocaleString('en-IN')}`,
        color: 'bg-emerald-50 text-emerald-800 font-bold border-emerald-200',
      });
    }

    if (data.city) {
      badges.push({
        text: String(data.city),
        color: 'bg-orange-50 text-orange-700 border-orange-200',
      });
    }

    if (data.category) {
      badges.push({
        text: String(data.category),
        color: 'bg-blue-50 text-blue-700 border-blue-200',
      });
    }

    return badges;
  };

  // Discover all unique fields and date fields across current collection documents
  const collectionFieldStats = useMemo(() => {
    const fieldCounts: Record<string, number> = {};
    const fieldValuesMap: Record<string, Set<string>> = {};
    const dateFieldKeys = new Set<string>();

    documents.forEach((d) => {
      fieldCounts['id'] = (fieldCounts['id'] || 0) + 1;

      Object.entries(d.data || {}).forEach(([k, v]) => {
        fieldCounts[k] = (fieldCounts[k] || 0) + 1;

        // Check if value looks like a date or field name implies date
        if (v !== undefined && v !== null) {
          const vObj = v as any;
          if (
            v instanceof Date ||
            (typeof v === 'object' &&
              (typeof vObj?.toDate === 'function' ||
                typeof (vObj?.seconds ?? vObj?._seconds) === 'number')) ||
            (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) ||
            (/(date|time|created|updated|timestamp|scheduled|expiry|at$)/i.test(k) &&
              typeof v === 'number' &&
              v > 1000000000)
          ) {
            dateFieldKeys.add(k);
          }
        }

        // Collect distinct primitive values (limit to 100 for performant dropdowns)
        if (v !== undefined && v !== null && typeof v !== 'object') {
          if (!fieldValuesMap[k]) fieldValuesMap[k] = new Set();
          if (fieldValuesMap[k].size < 100) {
            fieldValuesMap[k].add(String(v));
          }
        }
      });
    });

    const allKeys = Object.keys(fieldCounts).sort((a, b) => {
      const priorityOrder = [
        'id',
        'status',
        'category',
        'city',
        'role',
        'type',
        'paymentStatus',
        'name',
        'customerName',
        'phone',
        'email',
        'price',
        'amount',
        'createdAt',
        'updatedAt',
      ];
      const idxA = priorityOrder.indexOf(a);
      const idxB = priorityOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    return {
      allFields: allKeys,
      dateFields: Array.from(dateFieldKeys).sort((a, b) => a.localeCompare(b)),
      fieldValuesMap,
    };
  }, [documents]);

  // Distinct values for currently selected field filter
  const availableFieldValues = useMemo(() => {
    if (!filterField || !collectionFieldStats.fieldValuesMap[filterField]) {
      return [];
    }
    return (Array.from(collectionFieldStats.fieldValuesMap[filterField]) as string[]).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [filterField, collectionFieldStats]);

  // Helper to parse date from raw field value
  const parseRawDate = (raw: any): Date | null => {
    if (raw === undefined || raw === null) return null;
    if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
    if (typeof raw === 'object') {
      if (typeof raw.toDate === 'function') {
        try {
          const d = raw.toDate();
          return isNaN(d.getTime()) ? null : d;
        } catch {
          return null;
        }
      }
      const sec = raw.seconds ?? raw._seconds;
      if (typeof sec === 'number') {
        const ns = (raw.nanoseconds ?? raw._nanoseconds) || 0;
        const d = new Date(sec * 1000 + ns / 1000000);
        return isNaN(d.getTime()) ? null : d;
      }
    }
    if (typeof raw === 'number') {
      if (raw > 1000000000000 && raw < 3000000000000) {
        const d = new Date(raw);
        return isNaN(d.getTime()) ? null : d;
      }
      if (raw > 1000000000 && raw < 3000000000) {
        const d = new Date(raw * 1000);
        return isNaN(d.getTime()) ? null : d;
      }
    }
    if (typeof raw === 'string') {
      const clean = raw.trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(clean) || !isNaN(Date.parse(clean))) {
        const parsed = Date.parse(clean);
        if (!isNaN(parsed)) return new Date(parsed);
      }
    }
    return null;
  };

  // Extract date from document data
  const getDocDate = (data: Record<string, any>, specificField?: string): Date | null => {
    if (specificField && specificField !== 'auto') {
      return parseRawDate(data[specificField]);
    }
    const candidateKeys = [
      'createdAt',
      'timestamp',
      'date',
      'updatedAt',
      'scheduledDate',
      'bookingDate',
      'time',
      'expiryDate',
    ];
    for (const key of candidateKeys) {
      if (data[key] !== undefined && data[key] !== null) {
        const d = parseRawDate(data[key]);
        if (d) return d;
      }
    }
    for (const key of Object.keys(data)) {
      if (/(date|time|created|updated|timestamp|scheduled|at$)/i.test(key)) {
        const d = parseRawDate(data[key]);
        if (d) return d;
      }
    }
    return null;
  };

  // Handle date preset changes
  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset);
    setCurrentPage(1);

    const now = new Date();
    const formatDateStr = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      const todayStr = formatDateStr(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yestStr = formatDateStr(yesterday);
      setStartDate(yestStr);
      setEndDate(yestStr);
    } else if (preset === 'last7days') {
      const past7 = new Date(now);
      past7.setDate(now.getDate() - 6);
      setStartDate(formatDateStr(past7));
      setEndDate(formatDateStr(now));
    } else if (preset === 'last30days') {
      const past30 = new Date(now);
      past30.setDate(now.getDate() - 29);
      setStartDate(formatDateStr(past30));
      setEndDate(formatDateStr(now));
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(formatDateStr(firstDay));
      setEndDate(formatDateStr(now));
    } else if (preset === 'custom') {
      if (!startDate) setStartDate(formatDateStr(now));
      if (!endDate) setEndDate(formatDateStr(now));
    }
  };

  // Clear all search and filter conditions
  const handleClearAllFilters = () => {
    setSearchQuery('');
    setSearchScopeField('all');
    setFilterField('');
    setFilterValue('');
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setSelectedDateField('auto');
    setCurrentPage(1);
  };

  // Filter and Sort documents
  const filteredAndSortedDocs = useMemo(() => {
    let list = [...documents];

    // 1. Search filter with optional field scoping
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((d) => {
        if (searchScopeField === 'all') {
          if (d.id.toLowerCase().includes(q)) return true;
          try {
            const rawStr = JSON.stringify(d.data).toLowerCase();
            return rawStr.includes(q);
          } catch {
            return false;
          }
        } else if (searchScopeField === 'id') {
          return d.id.toLowerCase().includes(q);
        } else {
          const val = d.data[searchScopeField];
          if (val === undefined || val === null) return false;
          return String(val).toLowerCase().includes(q);
        }
      });
    }

    // 2. Field Value Dropdown Filter
    if (filterField && filterValue !== '' && filterValue !== 'all') {
      const targetVal = filterValue.toLowerCase().trim();
      list = list.filter((d) => {
        if (filterField === 'id') {
          return d.id.toLowerCase().trim() === targetVal;
        }
        const actual = d.data[filterField];
        if (actual === undefined || actual === null) return false;
        return String(actual).toLowerCase().trim() === targetVal;
      });
    }

    // 3. Date Range Filter
    if (startDate || endDate) {
      const startEpoch = startDate ? new Date(`${startDate}T00:00:00`).getTime() : 0;
      const endEpoch = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : Infinity;

      list = list.filter((d) => {
        const docDate = getDocDate(d.data, selectedDateField);
        if (!docDate) return false;
        const time = docDate.getTime();
        return time >= startEpoch && time <= endEpoch;
      });
    }

    // 4. Sorting
    list.sort((a, b) => {
      if (sortOrder === 'id_asc') return a.id.localeCompare(b.id);
      if (sortOrder === 'id_desc') return b.id.localeCompare(a.id);

      const dateA = getDocDate(a.data, selectedDateField);
      const dateB = getDocDate(b.data, selectedDateField);

      const timeA = dateA ? dateA.getTime() : 0;
      const timeB = dateB ? dateB.getTime() : 0;

      if (sortOrder === 'newest') return timeB - timeA;
      if (sortOrder === 'oldest') return timeA - timeB;
      return 0;
    });

    return list;
  }, [
    documents,
    searchQuery,
    searchScopeField,
    filterField,
    filterValue,
    datePreset,
    startDate,
    endDate,
    selectedDateField,
    sortOrder,
  ]);

  // Paginated docs
  const totalPages = Math.ceil(filteredAndSortedDocs.length / pageSize) || 1;
  const paginatedDocs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedDocs.slice(start, start + pageSize);
  }, [filteredAndSortedDocs, currentPage, pageSize]);

  // Toggle select all on current view
  const handleToggleSelectAll = () => {
    if (selectedDocIds.size === filteredAndSortedDocs.length && filteredAndSortedDocs.length > 0) {
      setSelectedDocIds(new Set());
    } else {
      const next = new Set<string>();
      filteredAndSortedDocs.forEach((d) => next.add(d.id));
      setSelectedDocIds(next);
    }
  };

  // Toggle single row selection
  const handleToggleSelectRow = (id: string) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Reference to select-all header checkbox for indeterminate state
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectAllRef.current) {
      const isAll =
        selectedDocIds.size === filteredAndSortedDocs.length &&
        filteredAndSortedDocs.length > 0;
      const isSome = selectedDocIds.size > 0 && !isAll;
      selectAllRef.current.indeterminate = isSome;
    }
  }, [selectedDocIds, filteredAndSortedDocs]);

  // Copy helper
  const handleCopy = (text: string, idForFeedback: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(idForFeedback);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export view to JSON
  const handleExportJson = () => {
    try {
      const dataStr =
        'data:text/json;charset=utf-8,' +
        encodeURIComponent(
          JSON.stringify(
            filteredAndSortedDocs.map((d) => ({ _id: d.id, ...d.data })),
            null,
            2
          )
        );
      const dlAnchor = document.createElement('a');
      dlAnchor.setAttribute('href', dataStr);
      dlAnchor.setAttribute(
        'download',
        `firestore_${selectedCollection}_${new Date().toISOString().slice(0, 10)}.json`
      );
      document.body.appendChild(dlAnchor);
      dlAnchor.click();
      dlAnchor.remove();
      showToast(`JSON फ़ाइल डाउनलोड हो गई (${filteredAndSortedDocs.length} रिकॉर्ड्स)`, 'info');
    } catch (err: any) {
      showToast(`डाउनलोड विफल: ${err.message}`, 'error');
    }
  };

  // Helper to format values for CSV export with proper date and numeric types
  const formatCsvCell = (key: string, rawVal: any): string => {
    if (rawVal === undefined || rawVal === null) {
      return '""';
    }

    // 1. DATE / TIMESTAMP HANDLING
    let dateObj: Date | null = null;
    if (rawVal instanceof Date) {
      dateObj = rawVal;
    } else if (
      typeof rawVal === 'object' &&
      typeof rawVal.toDate === 'function'
    ) {
      try {
        dateObj = rawVal.toDate();
      } catch {
        dateObj = null;
      }
    } else if (
      typeof rawVal === 'object' &&
      typeof (rawVal.seconds ?? rawVal._seconds) === 'number'
    ) {
      const sec = rawVal.seconds ?? rawVal._seconds;
      const nanosec = (rawVal.nanoseconds ?? rawVal._nanoseconds) || 0;
      dateObj = new Date(sec * 1000 + nanosec / 1000000);
    }

    // Check if field key or string value implies date
    const isDateKey = /(date|time|created|updated|timestamp|scheduled|expiry|expires|completed|cancelled|dob|login|at$)/i.test(key);
    if (!dateObj && isDateKey) {
      if (typeof rawVal === 'number') {
        if (rawVal > 1000000000000 && rawVal < 3000000000000) {
          // Epoch milliseconds
          dateObj = new Date(rawVal);
        } else if (rawVal > 1000000000 && rawVal < 3000000000) {
          // Epoch seconds
          dateObj = new Date(rawVal * 1000);
        }
      } else if (typeof rawVal === 'string' && /^\d{4}-\d{2}-\d{2}/.test(rawVal.trim())) {
        const parsed = Date.parse(rawVal.trim());
        if (!isNaN(parsed)) {
          dateObj = new Date(parsed);
        }
      }
    }

    // Format identified date nicely as YYYY-MM-DD HH:mm:ss
    if (dateObj && !isNaN(dateObj.getTime())) {
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const hh = String(dateObj.getHours()).padStart(2, '0');
      const min = String(dateObj.getMinutes()).padStart(2, '0');
      const ss = String(dateObj.getSeconds()).padStart(2, '0');
      // If time is 00:00:00 and original string was pure date (YYYY-MM-DD), keep date only
      if (typeof rawVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawVal.trim())) {
        return `"${yyyy}-${mm}-${dd}"`;
      }
      return `"${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}"`;
    }

    // 2. NUMERIC VALUE HANDLING
    if (typeof rawVal === 'number') {
      if (!Number.isFinite(rawVal)) return '""';
      if (Number.isInteger(rawVal)) {
        return `${rawVal}`; // Numeric cell without quotes for Excel
      }
      // Clean decimal with max 4 decimal digits, eliminating floating inaccuracies
      const cleanNum = Number(Math.round(Number(rawVal + 'e4')) + 'e-4');
      return `${cleanNum}`;
    }

    // Check for numeric strings in financial / quantity columns
    const isNumericColumn = /(amount|price|cost|fee|charge|balance|rating|count|total|quantity|commission|discount|tax|percent|points|coins|hours|days|duration)/i.test(key);
    if (isNumericColumn && typeof rawVal === 'string') {
      const trimmed = rawVal.trim();
      // Remove currency prefix and commas
      const numericCandidate = trimmed.replace(/^[₹$€£\s]+/, '').replace(/,/g, '').trim();
      if (numericCandidate !== '' && !isNaN(Number(numericCandidate))) {
        const parsed = Number(numericCandidate);
        if (Number.isFinite(parsed)) {
          return Number.isInteger(parsed) ? `${parsed}` : `${Number(Math.round(Number(parsed + 'e4')) + 'e-4')}`;
        }
      }
    }

    // 3. BOOLEAN VALUES
    if (typeof rawVal === 'boolean') {
      return rawVal ? 'TRUE' : 'FALSE';
    }

    // 4. ARRAYS
    if (Array.isArray(rawVal)) {
      const allSimple = rawVal.every(
        (item) => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean'
      );
      if (allSimple) {
        const joined = rawVal.join('; ').replace(/"/g, '""');
        return `"${joined}"`;
      }
      const jsonStr = JSON.stringify(rawVal).replace(/"/g, '""');
      return `"${jsonStr}"`;
    }

    // 5. GEOPOINTS / COORDINATES
    if (
      typeof rawVal === 'object' &&
      ((rawVal.latitude !== undefined && rawVal.longitude !== undefined) ||
        (rawVal.lat !== undefined && rawVal.lng !== undefined))
    ) {
      const lat = rawVal.latitude ?? rawVal.lat;
      const lng = rawVal.longitude ?? rawVal.lng;
      return `"${lat}, ${lng}"`;
    }

    // 6. OBJECTS
    if (typeof rawVal === 'object') {
      try {
        const jsonStr = JSON.stringify(rawVal).replace(/"/g, '""');
        return `"${jsonStr}"`;
      } catch {
        return `"[Object]"`;
      }
    }

    // 7. STRINGS
    const str = String(rawVal).replace(/"/g, '""');
    return `"${str}"`;
  };

  // Export view to CSV with correct date and numeric formatting
  const handleExportCsv = (onlySelected = false) => {
    try {
      const docsToExport = onlySelected
        ? filteredAndSortedDocs.filter((d) => selectedDocIds.has(d.id))
        : filteredAndSortedDocs;

      if (docsToExport.length === 0) {
        showToast(
          onlySelected
            ? 'कोई दस्तावेज़ चयनित नहीं है।'
            : 'डाउनलोड के लिए कोई दस्तावेज़ उपलब्ध नहीं है।',
          'info'
        );
        return;
      }

      // Collect all unique keys across docs being exported
      const keysSet = new Set<string>();
      docsToExport.forEach((d) => {
        Object.keys(d.data).forEach((k) => keysSet.add(k));
      });

      // Priority ordering for primary fields
      const priorityOrder = [
        'id',
        'title',
        'name',
        'serviceName',
        'customerName',
        'userName',
        'category',
        'status',
        'price',
        'amount',
        'totalAmount',
        'city',
        'phone',
        'email',
        'date',
        'scheduledDate',
        'createdAt',
        'updatedAt',
      ];

      const presentPriorityKeys = priorityOrder.filter(
        (pk) => pk === 'id' || keysSet.has(pk)
      );
      const remainingKeys = Array.from(keysSet)
        .filter((k) => !priorityOrder.includes(k))
        .sort((a, b) => a.localeCompare(b));

      const orderedKeys = ['id', ...presentPriorityKeys.filter((k) => k !== 'id'), ...remainingKeys];

      // Build header row
      const headerRow = orderedKeys.map((k) => `"${k.replace(/"/g, '""')}"`).join(',');

      // Build data rows
      const dataRows = docsToExport.map((d) => {
        return orderedKeys
          .map((k) => {
            const rawVal = k === 'id' ? d.id : d.data[k];
            return formatCsvCell(k, rawVal);
          })
          .join(',');
      });

      // Join rows using standard CRLF
      const csvString = [headerRow, ...dataRows].join('\r\n');

      // Prepend UTF-8 BOM (\uFEFF) so Excel on Windows / Mac displays Hindi and symbols properly
      const blob = new Blob(['\uFEFF' + csvString], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const dlAnchor = document.createElement('a');
      dlAnchor.setAttribute('href', url);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      dlAnchor.setAttribute(
        'download',
        `edusuper_${selectedCollection}_${timestamp}.csv`
      );
      document.body.appendChild(dlAnchor);
      dlAnchor.click();
      dlAnchor.remove();
      URL.revokeObjectURL(url);

      showToast(
        `CSV फ़ाइल सफलतापूर्वक डाउनलोड हो गई (${docsToExport.length} रिकॉर्ड्स)`,
        'success'
      );
    } catch (err: any) {
      showToast(`CSV डाउनलोड विफल: ${err.message}`, 'error');
    }
  };

  const selectedMeta = KNOWN_COLLECTIONS.find((c) => c.id === selectedCollection);

  const categories = [
    { id: 'all', label: 'सभी श्रेणियां (All)' },
    { id: 'core', label: 'कोर बिज़नेस (Core)' },
    { id: 'financial', label: 'वित्तीय (Financial)' },
    { id: 'communication', label: 'मैसेजिंग व संचार' },
    { id: 'compliance', label: 'अनुपालन (Compliance)' },
    { id: 'system', label: 'सिस्टम व सेटिंग्स' },
  ];

  const visibleCollections = useMemo(() => {
    if (activeCategoryFilter === 'all') return KNOWN_COLLECTIONS;
    return KNOWN_COLLECTIONS.filter((c) => c.category === activeCategoryFilter);
  }, [activeCategoryFilter]);

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-2xl flex items-center gap-3 border text-sm font-semibold max-w-md transition-all animate-bounce ${
            toastMessage.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-500 shadow-emerald-950/50'
              : toastMessage.type === 'error'
              ? 'bg-red-900 text-white border-red-500 shadow-red-950/50'
              : 'bg-stone-900 text-white border-stone-700 shadow-stone-950/50'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : toastMessage.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
          )}
          <div className="flex-1">{toastMessage.text}</div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-white/20 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-indigo-950 to-stone-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-indigo-900/50">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3 border border-indigo-500/30">
              <Database className="w-3.5 h-3.5" /> Firestore Database Record Explorer
            </div>
            <h1 className="text-xl sm:text-3xl font-black tracking-tight">
              Admin Data Explorer (डेटाबेस रिकॉर्ड अन्वेषक)
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-2xl">
              Firestore के किसी भी संग्रह (Collection) के रिकॉर्ड्स को तालिका रूप में देखें, खोजें, JSON डेटा
              निरीक्षण करें और प्रत्येक प्रविष्टि के आगे दिए गए <strong>'Delete'</strong> बटन से चुनिंदा
              अवांछित रिकॉर्ड्स को स्थायी रूप से हटाएं।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            {onOpenZeroDataModal && (
              <button
                type="button"
                id="data-explorer-top-zero-modal-btn"
                onClick={onOpenZeroDataModal}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-red-950/40 border border-red-400/80"
                title="थोक रीसेट या शून्य करने के लिए जीरो डेटा सेंटर खोलें"
              >
                <Trash2 className="w-4 h-4" />
                <span>थोक रीसेट (Zero Data Center)</span>
              </button>
            )}

            {onSelectTab && (
              <button
                type="button"
                id="data-explorer-back-dashboard-btn"
                onClick={() => onSelectTab('admin_dashboard')}
                className="px-4 py-2.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-stone-700"
              >
                <span>वापस डैशबोर्ड</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Collection Selector & Filter Section */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div>
            <h2 className="text-base font-black text-stone-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <span>संग्रह चुनें (Select Firestore Collection)</span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              कलेक्शन चुनकर उसके सभी डॉक्युमेंट्स लोड करें अथवा कोई भी कस्टम कलेक्शन का नाम लिखें।
            </p>
          </div>

          {/* Custom Collection Form */}
          <form onSubmit={handleLoadCustomCollection} className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                id="custom-collection-input"
                value={customCollectionInput}
                onChange={(e) => setCustomCollectionInput(e.target.value)}
                placeholder="कस्टम कलेक्शन नाम लिखें..."
                className="pl-3 pr-8 py-1.5 text-xs rounded-xl bg-stone-100 border border-stone-300 focus:bg-white focus:border-indigo-600 focus:outline-hidden w-48 sm:w-56 font-mono text-stone-800"
              />
              {customCollectionInput && (
                <button
                  type="button"
                  onClick={() => setCustomCollectionInput('')}
                  className="absolute right-2.5 top-2 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <button
              type="submit"
              id="custom-collection-load-btn"
              disabled={!customCollectionInput.trim()}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>लोड करें</span>
            </button>
          </form>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              id={`col-cat-${cat.id}`}
              onClick={() => setActiveCategoryFilter(cat.id)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeCategoryFilter === cat.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Collections Chips Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 pt-1">
          {visibleCollections.map((col) => {
            const Icon = col.icon;
            const isSelected = selectedCollection === col.id;
            return (
              <button
                key={col.id}
                type="button"
                id={`select-collection-${col.id}`}
                onClick={() => setSelectedCollection(col.id)}
                className={`p-2.5 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-indigo-50/80 border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'bg-stone-50/70 hover:bg-white border-stone-200 hover:border-indigo-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-stone-200 text-stone-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  {col.dangerLevel === 'high' && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                      संवेदनशील
                    </span>
                  )}
                </div>
                <div>
                  <div
                    className={`text-xs font-bold truncate ${
                      isSelected ? 'text-indigo-950' : 'text-stone-900'
                    }`}
                  >
                    {col.nameHi}
                  </div>
                  <div className="text-[10px] text-stone-500 font-mono truncate">{col.id}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Collection Active Summary Bar */}
        <div className="bg-indigo-50/50 rounded-2xl p-3.5 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-mono font-bold text-[11px]">
              /{selectedCollection}
            </span>
            <span className="font-bold text-stone-800">
              {selectedMeta ? `${selectedMeta.nameHi} (${selectedMeta.nameEn})` : 'कस्टम संग्रह'}
            </span>
            {selectedMeta && (
              <span className="text-stone-500 text-[11px] hidden md:inline">
                • {selectedMeta.description}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="font-bold text-stone-700 text-xs">
              दस्तावेज़: <strong className="text-indigo-700 text-sm">{documents.length}</strong>
              {filteredAndSortedDocs.length !== documents.length && (
                <span className="text-stone-500 font-normal ml-1">
                  (प्रदर्शित: {filteredAndSortedDocs.length})
                </span>
              )}
            </span>

            <button
              type="button"
              id="header-export-to-csv-btn"
              onClick={() => handleExportCsv(false)}
              disabled={filteredAndSortedDocs.length === 0}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="वर्तमान प्रदर्शित Firestore संग्रह डेटा को CSV में डाउनलोड करें"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100" />
              <span>Export to CSV</span>
            </button>

            <button
              type="button"
              id="refresh-collection-btn"
              onClick={() => fetchCollectionDocs(selectedCollection)}
              disabled={loading}
              className="p-1.5 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 cursor-pointer disabled:opacity-50"
              title="रीफ़्रेश करें (Reload from Firestore)"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
        {/* Table Toolbar, Search & Advanced Filters */}
        <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-50/60 space-y-3.5">
          {/* Top Row: Search Bar + Field Filter Dropdown + Date Range Filter Dropdown */}
          <div className="flex flex-col xl:flex-row xl:items-center gap-3">
            {/* 1. Search Bar with Field Scoping */}
            <div className="flex-1 flex items-center bg-white border border-stone-300 rounded-2xl focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100 shadow-2xs overflow-hidden transition-all min-w-[280px]">
              <div className="pl-3.5 pr-1 text-stone-400 shrink-0">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                id="explorer-search-input"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={
                  searchScopeField === 'all'
                    ? `इस संग्रह में खोजें (ID, नाम, फ़ोन, स्टेटस, मान)...`
                    : `फील्ड '${searchScopeField}' में खोजें...`
                }
                className="w-full py-2.5 px-2 text-xs bg-transparent focus:outline-hidden text-stone-900 placeholder:text-stone-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  id="explorer-clear-search-btn"
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg mr-1 cursor-pointer"
                  title="सर्च टेक्स्ट हटाएं"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              {/* Search Scope Selector */}
              <div className="border-l border-stone-200 pl-1.5 pr-2 shrink-0 bg-stone-50/50">
                <select
                  id="explorer-search-scope-select"
                  value={searchScopeField}
                  onChange={(e) => {
                    setSearchScopeField(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="text-[11px] font-bold text-stone-600 bg-transparent py-2 pr-1 focus:outline-hidden cursor-pointer"
                  title="सर्च का दायरा चुनें"
                >
                  <option value="all">सभी फ़ील्ड (All Fields)</option>
                  <option value="id">केवल ID</option>
                  {collectionFieldStats.allFields
                    .filter((f) => f !== 'id')
                    .slice(0, 25)
                    .map((f) => (
                      <option key={f} value={f}>
                        फ़ील्ड: {f}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* 2. Field Value Dropdown Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-white border border-stone-300 rounded-2xl px-3 py-1.5 shadow-2xs">
                <Filter className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="text-[11px] font-bold text-stone-600 shrink-0">फ़ील्ड फ़िल्टर:</span>
                <select
                  id="explorer-filter-field-select"
                  value={filterField}
                  onChange={(e) => {
                    setFilterField(e.target.value);
                    setFilterValue('');
                    setCurrentPage(1);
                  }}
                  className="text-xs font-bold text-stone-900 bg-transparent focus:outline-hidden cursor-pointer max-w-[140px] truncate"
                >
                  <option value="">कोई नहीं (Select Field)</option>
                  {collectionFieldStats.allFields.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              {/* Value Dropdown (when field is selected) */}
              {filterField && (
                <div className="flex items-center gap-1.5 bg-white border border-indigo-300 rounded-2xl px-3 py-1.5 shadow-2xs animate-in fade-in duration-150">
                  <span className="text-[11px] font-bold text-indigo-700 shrink-0">मान:</span>
                  {availableFieldValues.length > 0 && availableFieldValues.length <= 60 ? (
                    <select
                      id="explorer-filter-value-select"
                      value={filterValue}
                      onChange={(e) => {
                        setFilterValue(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="text-xs font-black text-indigo-900 bg-transparent focus:outline-hidden cursor-pointer max-w-[160px] truncate"
                    >
                      <option value="">सभी मान (All Values)</option>
                      {availableFieldValues.map((val) => (
                        <option key={val} value={val}>
                          {val}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      id="explorer-filter-value-input"
                      value={filterValue}
                      onChange={(e) => {
                        setFilterValue(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="वैल्यू टाइप करें..."
                      className="text-xs font-bold text-indigo-900 bg-transparent focus:outline-hidden w-28"
                    />
                  )}
                  {filterValue && (
                    <button
                      type="button"
                      onClick={() => {
                        setFilterValue('');
                        setCurrentPage(1);
                      }}
                      className="text-stone-400 hover:text-stone-700 ml-0.5 cursor-pointer"
                      title="मान हटाएं"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {/* 3. Date Range Filter Dropdown */}
              <div className="flex items-center gap-1.5 bg-white border border-stone-300 rounded-2xl px-3 py-1.5 shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="text-[11px] font-bold text-stone-600 shrink-0">तारीख:</span>
                <select
                  id="explorer-date-preset-select"
                  value={datePreset}
                  onChange={(e) => handleDatePresetChange(e.target.value)}
                  className="text-xs font-bold text-stone-900 bg-transparent focus:outline-hidden cursor-pointer"
                >
                  <option value="all">सभी तिथियां (All Time)</option>
                  <option value="today">आज (Today)</option>
                  <option value="yesterday">कल (Yesterday)</option>
                  <option value="last7days">पिछले 7 दिन (Last 7 Days)</option>
                  <option value="last30days">पिछले 30 दिन (Last 30 Days)</option>
                  <option value="thisMonth">इस महीने (This Month)</option>
                  <option value="custom">कस्टम रेंज (Custom Range...)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Expanded Date Range Pickers (Active when preset or date selected) */}
          {(datePreset !== 'all' || startDate || endDate) && (
            <div className="flex flex-wrap items-center gap-2.5 p-2.5 bg-amber-50/70 rounded-2xl border border-amber-200 text-xs animate-in fade-in duration-150">
              <span className="font-bold text-amber-900 flex items-center gap-1.5 shrink-0">
                <Calendar className="w-3.5 h-3.5 text-amber-700" />
                <span>दिनांक सीमा (Date Range):</span>
              </span>

              <div className="flex items-center gap-1.5">
                <span className="text-stone-500 text-[11px]">आरंभ:</span>
                <input
                  type="date"
                  id="explorer-start-date-input"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDatePreset('custom');
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1 bg-white border border-amber-300 rounded-xl font-mono text-xs text-stone-800 focus:outline-hidden focus:border-amber-600"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-stone-500 text-[11px]">समाप्ति:</span>
                <input
                  type="date"
                  id="explorer-end-date-input"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDatePreset('custom');
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1 bg-white border border-amber-300 rounded-xl font-mono text-xs text-stone-800 focus:outline-hidden focus:border-amber-600"
                />
              </div>

              {/* Date Field Picker if multiple date fields available */}
              {collectionFieldStats.dateFields.length > 0 && (
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="text-stone-500 text-[11px]">फील्ड:</span>
                  <select
                    id="explorer-date-field-select"
                    value={selectedDateField}
                    onChange={(e) => {
                      setSelectedDateField(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 bg-white border border-amber-300 rounded-xl text-[11px] font-bold text-stone-800 focus:outline-hidden cursor-pointer"
                  >
                    <option value="auto">ऑटो-डिटेक्ट (Any Date Field)</option>
                    {collectionFieldStats.dateFields.map((df) => (
                      <option key={df} value={df}>
                        {df}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                id="explorer-reset-date-filter-btn"
                onClick={() => {
                  setDatePreset('all');
                  setStartDate('');
                  setEndDate('');
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[11px] cursor-pointer ml-1 transition-colors"
              >
                रीसेट
              </button>
            </div>
          )}

          {/* Active Filter Pills, Result Count, & Action Controls Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-stone-200">
            {/* Left: Result Counter & Active Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-stone-600 bg-white border border-stone-200 rounded-xl px-2.5 py-1">
                प्रदर्शित:{' '}
                <strong className="text-indigo-700">{filteredAndSortedDocs.length}</strong>
                <span className="text-stone-400 font-normal"> / {documents.length}</span>
              </span>

              {/* Active Search Pill */}
              {searchQuery && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-bold">
                  <Search className="w-3 h-3 text-indigo-500" />
                  <span>
                    खोज {searchScopeField !== 'all' ? `(${searchScopeField})` : ''}: "{searchQuery}"
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setCurrentPage(1);
                    }}
                    className="hover:text-indigo-950 cursor-pointer"
                    title="हटाएं"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Active Field Filter Pill */}
              {filterField && filterValue && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-bold">
                  <Filter className="w-3 h-3 text-blue-500" />
                  <span>
                    {filterField}: <strong>{filterValue}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterField('');
                      setFilterValue('');
                      setCurrentPage(1);
                    }}
                    className="hover:text-blue-950 cursor-pointer"
                    title="हटाएं"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Active Date Range Pill */}
              {(startDate || endDate) && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold">
                  <Calendar className="w-3 h-3 text-amber-600" />
                  <span>
                    तारीख: {startDate || 'शुरुआत'} से {endDate || 'वर्तमान'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setDatePreset('all');
                      setStartDate('');
                      setEndDate('');
                      setCurrentPage(1);
                    }}
                    className="hover:text-amber-950 cursor-pointer"
                    title="हटाएं"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Clear All Filters Button */}
              {(searchQuery || (filterField && filterValue) || startDate || endDate) && (
                <button
                  type="button"
                  id="explorer-clear-all-filters-btn"
                  onClick={handleClearAllFilters}
                  className="px-2.5 py-1 text-[11px] font-black text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl cursor-pointer transition-colors shadow-2xs"
                >
                  सभी फ़िल्टर हटाएं (Reset)
                </button>
              )}
            </div>

            {/* Right: Controls & Actions (Limit, Sort, Export, Bulk Delete) */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Limit Selector */}
              <div className="flex items-center gap-1.5 text-xs text-stone-600 bg-white border border-stone-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
                <span>सीमा:</span>
                <select
                  id="explorer-limit-select"
                  value={recordLimit}
                  onChange={(e) => setRecordLimit(Number(e.target.value))}
                  className="font-bold text-stone-900 bg-transparent focus:outline-hidden cursor-pointer"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                  <option value={500}>500</option>
                </select>
              </div>

              {/* Sort Order */}
              <div className="flex items-center gap-1.5 text-xs text-stone-600 bg-white border border-stone-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
                <ArrowUpDown className="w-3 h-3 text-stone-400" />
                <select
                  id="explorer-sort-select"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  className="font-bold text-stone-900 bg-transparent focus:outline-hidden cursor-pointer"
                >
                  <option value="newest">नवीनतम पहले (Newest)</option>
                  <option value="oldest">पुरातन पहले (Oldest)</option>
                  <option value="id_asc">ID (A से Z)</option>
                  <option value="id_desc">ID (Z से A)</option>
                </select>
              </div>

              {/* Export Buttons */}
              <button
                type="button"
                id="explorer-export-json-btn"
                onClick={handleExportJson}
                disabled={documents.length === 0}
                className="px-3 py-1.5 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40 shadow-2xs"
                title="इस डेटा को JSON फॉर्मेट में बैकअप लें"
              >
                <Download className="w-3.5 h-3.5 text-stone-500" />
                <span>JSON</span>
              </button>

              {/* Export to CSV Button */}
              <button
                type="button"
                id="explorer-export-csv-btn"
                onClick={() => handleExportCsv(false)}
                disabled={filteredAndSortedDocs.length === 0}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-800 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                title="वर्तमान प्रदर्शित Firestore संग्रह डेटा को सही दिनांक और संख्यात्मक फॉर्मेट के साथ CSV में डाउनलोड करें"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Export to CSV</span>
                {filteredAndSortedDocs.length > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-emerald-200/80 text-emerald-950 text-[10px] font-mono">
                    {filteredAndSortedDocs.length}
                  </span>
                )}
              </button>

              {/* Bulk Delete Trigger Button */}
              <button
                type="button"
                id="explorer-bulk-delete-btn"
                onClick={() => {
                  if (selectedDocIds.size === 0) {
                    showToast('कृपया पहले तालिका में चेकबॉक्स चुनकर दस्तावेज़ सेलेक्ट करें।', 'info');
                    return;
                  }
                  setIsBatchDeleteModalOpen(true);
                }}
                disabled={selectedDocIds.size === 0}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
                  selectedDocIds.size > 0
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/30 ring-2 ring-red-300 animate-pulse'
                    : 'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed opacity-60'
                }`}
                title={
                  selectedDocIds.size > 0
                    ? `Bulk Delete: चयनित ${selectedDocIds.size} दस्तावेज़ों को एक साथ डिलीट करें`
                    : 'दस्तावेज़ों को बल्क में डिलीट करने के लिए पहले चेकबॉक्स चुनें'
                }
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Bulk Delete {selectedDocIds.size > 0 ? `(${selectedDocIds.size})` : ''}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Active Selection Info Strip */}
        {selectedDocIds.size > 0 && (
          <div className="bg-red-50 px-5 py-2.5 border-b border-red-200 flex flex-wrap items-center justify-between gap-3 text-xs text-red-900 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
              <span className="px-2 py-0.5 rounded-md bg-red-200/70 text-red-900 font-mono text-[11px]">
                {selectedDocIds.size} Selected
              </span>
              <span>
                संग्रह <strong>'{selectedCollection}'</strong> के <strong>{selectedDocIds.size}</strong> दस्तावेज़ बल्क एक्शन के लिए चुने गए हैं।
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                id="selection-strip-export-csv-btn"
                onClick={() => handleExportCsv(true)}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                title="केवल चयनित दस्तावेज़ों को CSV में डाउनलोड करें"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Selected to CSV ({selectedDocIds.size})</span>
              </button>
              <button
                type="button"
                id="select-all-filtered-btn"
                onClick={handleToggleSelectAll}
                className="px-2.5 py-1 rounded-lg bg-white border border-red-200 hover:bg-red-100 text-red-800 font-bold text-[11px] cursor-pointer transition-colors"
              >
                {selectedDocIds.size === filteredAndSortedDocs.length
                  ? 'चयन रद्द करें'
                  : `सभी ${filteredAndSortedDocs.length} चुनें`}
              </button>
              <button
                type="button"
                id="deselect-all-btn"
                onClick={() => setSelectedDocIds(new Set())}
                className="px-2.5 py-1 rounded-lg hover:bg-red-100 text-red-700 font-bold text-[11px] cursor-pointer transition-colors"
              >
                Deselect All
              </button>
              <button
                type="button"
                id="selection-strip-bulk-delete-btn"
                onClick={() => setIsBatchDeleteModalOpen(true)}
                className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="चयनित सभी दस्तावेज़ों को एक साथ डिलीट करें"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Bulk Delete ({selectedDocIds.size})</span>
              </button>
            </div>
          </div>
        )}

        {/* Error State */}
        {fetchError && (
          <div className="p-6 bg-red-50 text-red-800 text-xs flex items-start gap-3 border-b border-red-200">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">डेटाबेस एरर:</p>
              <p className="mt-0.5">{fetchError}</p>
            </div>
          </div>
        )}

        {/* Table Content */}
        <div className="overflow-x-auto min-h-[300px]">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
              <p className="text-sm font-bold text-stone-800">
                Firestore संग्रह '{selectedCollection}' से दस्तावेज़ लोड हो रहे हैं...
              </p>
              <p className="text-xs text-stone-500 mt-1">कृपया एक क्षण प्रतीक्षा करें</p>
            </div>
          ) : filteredAndSortedDocs.length === 0 ? (
            <div className="py-16 text-center text-stone-500">
              <Database className="w-12 h-12 mx-auto text-stone-300 mb-3" />
              <p className="text-sm font-bold text-stone-800">कोई दस्तावेज़ नहीं मिला</p>
              <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? `खोज क्वेरी "${searchQuery}" से मेल खाता कोई रिकॉर्ड नहीं है।`
                  : `संग्रह '${selectedCollection}' में वर्तमान में 0 रिकॉर्ड्स हैं।`}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-stone-700 divide-y divide-stone-200">
              <thead className="bg-stone-100/75 text-[11px] font-bold uppercase tracking-wider text-stone-600 select-none">
                <tr>
                  <th className="py-3.5 pl-4 pr-2 w-12 text-center">
                    <label
                      htmlFor="explorer-select-all-checkbox"
                      className="inline-flex items-center justify-center p-1 rounded hover:bg-stone-200/70 cursor-pointer"
                      title="सभी दस्तावेज़ चुनें या हटाएं (Select/Deselect All)"
                    >
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        id="explorer-select-all-checkbox"
                        aria-label="Select all documents"
                        checked={
                          selectedDocIds.size === filteredAndSortedDocs.length &&
                          filteredAndSortedDocs.length > 0
                        }
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 rounded border-stone-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                      />
                    </label>
                  </th>
                  <th className="py-3.5 px-3 min-w-[180px]">दस्तावेज़ ID (Document ID)</th>
                  <th className="py-3.5 px-3 min-w-[200px]">शीर्षक / मुख्य पहचान (Identifier)</th>
                  <th className="py-3.5 px-3 min-w-[220px]">मुख्य फ़ील्ड्स (Key Attributes)</th>
                  <th className="py-3.5 px-3 min-w-[140px]">दिनांक (Timestamp)</th>
                  <th className="py-3.5 pr-4 pl-3 text-right min-w-[160px]">कार्रवाई (Action)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-white">
                {paginatedDocs.map((docItem, idx) => {
                  const isSelected = selectedDocIds.has(docItem.id);
                  const { title, subtitle } = extractPrimaryLabel(docItem);
                  const badges = extractBadges(docItem.data);
                  const dateStr = extractDate(docItem.data);

                  return (
                    <tr
                      key={docItem.id}
                      id={`doc-row-${docItem.id}`}
                      className={`hover:bg-indigo-50/30 transition-colors ${
                        isSelected
                          ? 'bg-red-50/60 border-l-4 border-l-red-500 ring-1 ring-inset ring-red-100'
                          : idx % 2 === 0
                          ? 'bg-white'
                          : 'bg-stone-50/40'
                      }`}
                    >
                      {/* Checkbox */}
                      <td
                        className="py-3 pl-4 pr-2 w-12 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <label
                          htmlFor={`select-doc-${docItem.id}`}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg hover:bg-red-100/60 cursor-pointer transition-colors"
                          title={`दस्तावेज़ '${docItem.id}' को चुनें / हटाएं`}
                        >
                          <input
                            type="checkbox"
                            id={`select-doc-${docItem.id}`}
                            aria-label={`Select document ${docItem.id}`}
                            checked={isSelected}
                            onChange={() => handleToggleSelectRow(docItem.id)}
                            className="w-4 h-4 rounded border-stone-300 text-red-600 focus:ring-red-500 cursor-pointer accent-red-600"
                          />
                        </label>
                      </td>

                      {/* Doc ID */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-stone-800 font-semibold">
                          <span
                            className="truncate max-w-[140px] sm:max-w-[180px]"
                            title={docItem.id}
                          >
                            {docItem.id}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(docItem.id, docItem.id)}
                            className="p-1 text-stone-400 hover:text-indigo-600 rounded transition-colors cursor-pointer"
                            title="ID कॉपी करें"
                          >
                            {copiedId === docItem.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Primary Label */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-stone-900 truncate max-w-[220px]" title={title}>
                          {title}
                        </div>
                        {subtitle && (
                          <div
                            className="text-[11px] text-stone-500 truncate max-w-[220px] font-mono"
                            title={subtitle}
                          >
                            {subtitle}
                          </div>
                        )}
                      </td>

                      {/* Key Badges */}
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap items-center gap-1 max-w-[280px]">
                          {badges.length > 0 ? (
                            badges.map((b, i) => (
                              <span
                                key={i}
                                className={`px-2 py-0.5 rounded text-[10px] border ${b.color}`}
                              >
                                {b.text}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-stone-400 italic">
                              {Object.keys(docItem.data).length} फ़ील्ड्स उपलब्ध
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 text-[11px] text-stone-500">
                        {dateStr || <span className="text-stone-300">-</span>}
                      </td>

                      {/* Actions: View JSON & Delete */}
                      <td className="py-3 pr-4 pl-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Inspect / View JSON Button */}
                          <button
                            type="button"
                            id={`inspect-doc-btn-${docItem.id}`}
                            onClick={() => setInspectDoc(docItem)}
                            className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-[11px] transition-all flex items-center gap-1 cursor-pointer"
                            title="डॉक्युमेंट का पूरा JSON डेटा देखें"
                          >
                            <Eye className="w-3.5 h-3.5 text-stone-500" />
                            <span className="hidden sm:inline">JSON</span>
                          </button>

                          {/* DELETE Button (The primary requested feature) */}
                          <button
                            type="button"
                            id={`delete-doc-btn-${docItem.id}`}
                            onClick={() => setDocToDelete(docItem)}
                            className="px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200 hover:border-red-600 font-black text-[11px] transition-all flex items-center gap-1 cursor-pointer group shadow-2xs"
                            title={`Delete record '${docItem.id}' from '${selectedCollection}'`}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600 group-hover:text-white transition-colors" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {filteredAndSortedDocs.length > 0 && (
          <div className="p-4 border-t border-stone-200 bg-stone-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-600">
            <div>
              कुल <strong>{filteredAndSortedDocs.length}</strong> में से{' '}
              <strong>{(currentPage - 1) * pageSize + 1}</strong> से{' '}
              <strong>{Math.min(currentPage * pageSize, filteredAndSortedDocs.length)}</strong> रिकॉर्ड्स
              प्रदर्शित
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                id="explorer-prev-page-btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 font-bold text-stone-900">
                पेज {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                id="explorer-next-page-btn"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SINGLE DOCUMENT DELETE CONFIRMATION MODAL */}
      {docToDelete && (
        <div
          id="single-delete-confirm-modal"
          className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-red-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-stone-900">
                    दस्तावेज़ डिलीट की पुष्टि (Confirm Record Deletion)
                  </h3>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  क्या आप वाकई Firestore से इस व्यक्तिगत रिकॉर्ड को स्थायी रूप से हटाना चाहते हैं?
                </p>
              </div>
            </div>

            {/* Document Details Card */}
            <div className="bg-red-50/60 rounded-2xl p-4 border border-red-100 space-y-2 text-xs">
              <div className="flex items-center justify-between text-stone-600">
                <span className="font-bold">संग्रह (Collection):</span>
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-red-200 text-red-800 font-bold">
                  {selectedCollection}
                </span>
              </div>
              <div className="flex items-center justify-between text-stone-600">
                <span className="font-bold">दस्तावेज़ ID:</span>
                <span className="font-mono font-bold text-stone-900 select-all truncate max-w-[240px]">
                  {docToDelete.id}
                </span>
              </div>
              {(() => {
                const { title, subtitle } = extractPrimaryLabel(docToDelete);
                return (
                  <div className="flex items-center justify-between text-stone-600 pt-1 border-t border-red-100">
                    <span className="font-bold">पहचान / विवरण:</span>
                    <span className="font-bold text-stone-800 truncate max-w-[240px]">{title}</span>
                  </div>
                );
              })()}
            </div>

            {/* Warning Banner */}
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                सावधानी: यह कार्रवाई पूर्ववत (Undo) नहीं की जा सकती। डेटाबेस से यह दस्तावेज़ तुरंत नष्ट हो जाएगा।
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                id="cancel-single-delete-btn"
                onClick={() => setDocToDelete(null)}
                disabled={isDeletingSingle}
                className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-all cursor-pointer"
              >
                रद्द करें (Cancel)
              </button>

              <button
                type="button"
                id="confirm-single-delete-btn"
                onClick={confirmDeleteSingleDoc}
                disabled={isDeletingSingle}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-red-600/30 disabled:opacity-50"
              >
                {isDeletingSingle ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>डिलीट हो रहा है...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>स्थायी रूप से हटाएं (Delete Document)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BATCH DELETE CONFIRMATION MODAL */}
      {isBatchDeleteModalOpen && (
        <div
          id="batch-delete-confirm-modal"
          className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-red-300 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-black text-stone-900">
                  Bulk Delete: चयनित {selectedDocIds.size} दस्तावेज़ों को डिलीट करें?
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  आप संग्रह <strong>'{selectedCollection}'</strong> से {selectedDocIds.size} रिकॉर्ड्स को
                  Firestore <code className="text-red-700 bg-red-50 px-1 py-0.5 rounded font-mono font-bold">writeBatch()</code> द्वारा एक सिंगल बैच ऑपरेशन में हटाने जा रहे हैं।
                </p>
              </div>
            </div>

            <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 max-h-40 overflow-y-auto space-y-1 text-[11px] font-mono">
              <p className="text-stone-500 font-bold mb-1">डिलीट होने वाले प्रमुख IDs ({selectedDocIds.size}):</p>
              {Array.from(selectedDocIds)
                .slice(0, 10)
                .map((id) => (
                  <div key={id} className="text-stone-700 flex items-center gap-1">
                    <span className="text-red-500">•</span> {id}
                  </div>
                ))}
              {selectedDocIds.size > 10 && (
                <div className="text-stone-400 italic pt-1">
                  ...तथा {selectedDocIds.size - 10} अन्य दस्तावेज़
                </div>
              )}
            </div>

            <div className="bg-red-50 p-3 rounded-xl border border-red-200 text-xs text-red-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>प्रशासक ध्यान दें: यह सिंगल बैच ऑपरेशन सभी चयनित रिकॉर्ड्स को तत्काल प्रभाव से हटा देगा।</span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                id="cancel-batch-delete-btn"
                onClick={() => setIsBatchDeleteModalOpen(false)}
                disabled={isDeletingBatch}
                className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold cursor-pointer"
              >
                रद्द करें (Cancel)
              </button>

              <button
                type="button"
                id="confirm-batch-delete-btn"
                onClick={confirmBatchDelete}
                disabled={isDeletingBatch}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-red-600/30 disabled:opacity-50"
              >
                {isDeletingBatch ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>हटाया जा रहा है...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm Bulk Delete ({selectedDocIds.size})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INSPECT / RAW JSON MODAL */}
      {inspectDoc && (
        <div
          id="inspect-doc-modal"
          className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-stone-900 text-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-stone-800 space-y-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-stone-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-sm font-black tracking-tight text-white">
                    दस्तावेज़ विवरण (Document JSON Viewer)
                  </h3>
                </div>
                <p className="text-xs text-stone-400 mt-0.5 font-mono">
                  {selectedCollection} / <strong className="text-white">{inspectDoc.id}</strong>
                </p>
              </div>

              <button
                type="button"
                id="close-inspect-modal-btn"
                onClick={() => setInspectDoc(null)}
                className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Code Body */}
            <div className="flex-1 overflow-y-auto bg-stone-950 rounded-2xl p-4 border border-stone-800/80 font-mono text-xs text-emerald-400">
              <pre className="whitespace-pre-wrap break-all leading-relaxed">
                {JSON.stringify(
                  {
                    _id: inspectDoc.id,
                    _collection: selectedCollection,
                    ...inspectDoc.data,
                  },
                  null,
                  2
                )}
              </pre>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-stone-800 text-xs">
              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    JSON.stringify({ _id: inspectDoc.id, ...inspectDoc.data }, null, 2),
                    'inspect_json'
                  )
                }
                className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {copiedId === 'inspect_json' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>कॉपी हो गया!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-stone-400" />
                    <span>JSON कॉपी करें</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = inspectDoc;
                    setInspectDoc(null);
                    setDocToDelete(target);
                  }}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>यह दस्तावेज़ हटाएं</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInspectDoc(null)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold cursor-pointer"
                >
                  बंद करें
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
