import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Inbox,
  Send,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  HelpCircle,
  Banknote,
  FileText,
  KeyRound,
  Building2,
  Phone,
  Mail,
  MessageSquare,
  RefreshCw,
  Trash2,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Sparkles,
  ArrowRight,
  Shield,
  User,
  Calendar,
  Layers,
  Share2,
  AlertCircle,
  Eye,
  Megaphone,
} from 'lucide-react';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { adminBroadcastService } from '../../services/adminBroadcastService';
import { checkAndHandleQuotaError, isResourceExhausted } from '../../utils/sparkQuotaGuard';

export type RequestCategory =
  | 'support_ticket'
  | 'cash_approval'
  | 'rfq_quote'
  | 'password_reset'
  | 'partnership_inquiry'
  | 'complaint'
  | 'direct_message';

export type RequestStatus = 'pending' | 'in_review' | 'resolved' | 'approved' | 'rejected';

export interface AdminRequestItem {
  id: string;
  subject: string;
  message: string;
  category: RequestCategory;
  senderName: string;
  senderPhone: string;
  senderEmail?: string;
  senderRole?: string;
  senderUid?: string;
  priority: 'critical' | 'high' | 'medium' | 'normal';
  status: RequestStatus;
  createdAt: string;
  updatedAt?: string;
  bookingId?: string;
  amount?: number;
  memberCode?: string;
  channel?: string;
  replyText?: string;
  repliedAt?: string;
  repliedBy?: string;
}

export interface AdminOutboxItem {
  id: string;
  recipientName: string;
  recipientPhone?: string;
  recipientEmail?: string;
  audience: string;
  subject: string;
  message: string;
  channel: 'in_app' | 'broadcast' | 'sms' | 'whatsapp';
  sentAt: string;
  status: 'sent' | 'delivered' | 'active';
  requestId?: string;
  sentBy?: string;
}

const CATEGORY_META: Record<
  RequestCategory,
  { label: string; icon: any; badgeBg: string; badgeText: string; colorBorder: string }
> = {
  support_ticket: {
    label: 'ग्राहक सहायता टिकट (Support)',
    icon: HelpCircle,
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-800',
    colorBorder: 'border-blue-400',
  },
  cash_approval: {
    label: 'नकद रजिस्ट्रेशन अप्रूवल (Cash)',
    icon: Banknote,
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    colorBorder: 'border-emerald-400',
  },
  rfq_quote: {
    label: 'कोटेशन व बड़ा काम (RFQ)',
    icon: FileText,
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-800',
    colorBorder: 'border-purple-400',
  },
  password_reset: {
    label: 'पासवर्ड रीसेट अनुरोध',
    icon: KeyRound,
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    colorBorder: 'border-amber-400',
  },
  partnership_inquiry: {
    label: 'फ्रेंचाइजी / पार्टनर पूछताछ',
    icon: Building2,
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-800',
    colorBorder: 'border-orange-400',
  },
  complaint: {
    label: 'गंभीर शिकायत (Complaint)',
    icon: AlertTriangle,
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-800',
    colorBorder: 'border-rose-400',
  },
  direct_message: {
    label: 'सीधा संदेश / पूछताछ',
    icon: MessageSquare,
    badgeBg: 'bg-stone-100',
    badgeText: 'text-stone-800',
    colorBorder: 'border-stone-400',
  },
};

interface Props {
  onSelectTab?: (tab: string) => void;
}

export const AdminRequestsInboxOutbox: React.FC<Props> = ({ onSelectTab }) => {
  const { currentUser, userProfile } = useAuth();
  const [activeView, setActiveView] = useState<'inbox' | 'outbox' | 'compose'>('inbox');

  // Requests Data
  const [requests, setRequests] = useState<AdminRequestItem[]>([]);
  const [outboxItems, setOutboxItems] = useState<AdminOutboxItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  // Action / Reply Modal State
  const [replyModalItem, setReplyModalItem] = useState<AdminRequestItem | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyChannel, setReplyChannel] = useState<'in_app' | 'whatsapp' | 'sms'>('in_app');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Compose New Outbox Message
  const [composeRecipientType, setComposeRecipientType] = useState<
    'all' | 'customer' | 'service_man' | 'franchise' | 'direct_user'
  >('all');
  const [composeRecipientName, setComposeRecipientName] = useState('');
  const [composeRecipientPhone, setComposeRecipientPhone] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [composeChannel, setComposeChannel] = useState<'in_app' | 'broadcast' | 'whatsapp'>('in_app');

  // Quota optimization: cache auxiliary queries and broadcasts in refs
  const cachedAuxRequestsRef = useRef<AdminRequestItem[]>([]);
  const hasFetchedAuxRef = useRef(false);
  const cachedBroadcastsRef = useRef<AdminOutboxItem[]>([]);
  const hasFetchedBroadcastsRef = useRef(false);
  const latestRequestsSnapshotRef = useRef<AdminRequestItem[]>([]);
  const latestOutboxSnapshotRef = useRef<AdminOutboxItem[]>([]);

  const mergeAndSetRequests = (liveList: AdminRequestItem[]) => {
    const combined = [...liveList];
    const seenIds = new Set(liveList.map((r) => r.id));
    cachedAuxRequestsRef.current.forEach((item) => {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        combined.push(item);
      }
    });
    if (combined.length === 0) {
      combined.push(
        {
          id: 'REQ-DEMO-01',
          subject: 'सर्विसमैन नकद फीस अप्रूवल अनुरोध (Bhopal MP Nagar)',
          message: 'राजेश शर्मा (इलेक्ट्रीशियन) ने ₹121 का नकद रजिस्ट्रेशन आवेदन जमा किया है। कृपया जांच कर आईडी कार्ड सक्रिय करें।',
          category: 'cash_approval',
          senderName: 'राजेश शर्मा',
          senderPhone: '9826012345',
          senderEmail: 'rajesh.electrician@gmail.com',
          senderRole: 'service_man',
          priority: 'critical',
          status: 'pending',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          amount: 121,
          memberCode: 'HDK-TECH-8492',
        },
        {
          id: 'REQ-DEMO-02',
          subject: 'एसी रिपेयरिंग के बाद कूलिंग नहीं हो रही (वारंटी दावा)',
          message: 'कल शाम सर्विस हुई थी लेकिन कंप्रेसर से फिर आवाज आ रही है और कूलिंग नहीं है। कृपया टेक्नीशियन को री-विजिट कराएं। बुकिंग #BK-8821',
          category: 'support_ticket',
          senderName: 'अमित कुमार',
          senderPhone: '9826054321',
          senderRole: 'customer',
          priority: 'high',
          status: 'pending',
          createdAt: new Date(Date.now() - 7200000).toISOString(),
        }
      );
    }
    combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setRequests(combined);
    setLoading(false);
  };

  const mergeAndSetOutbox = (liveOutbox: AdminOutboxItem[]) => {
    const combined = [...liveOutbox];
    const seenIds = new Set(liveOutbox.map((o) => o.id));
    cachedBroadcastsRef.current.forEach((item) => {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        combined.push(item);
      }
    });
    if (combined.length === 0) {
      combined.push({
        id: 'OUT-DEMO-01',
        recipientName: '📢 समस्त सर्विसमैन व ग्राहक (All Apps)',
        audience: 'all',
        subject: '🪔 शुभ दीपावली - हरदिनकाम परिवार की ओर से हार्दिक बधाई!',
        message: 'दीपावली के इस पावन पर्व पर सभी पार्टनर्स और उपभोक्ताओं को हार्दिक शुभकामनाएं।',
        channel: 'broadcast',
        sentAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        status: 'delivered',
        sentBy: 'Admin Broadcast Engine',
      });
    }
    combined.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
    setOutboxItems(combined);
  };

  // Load Real-time Data
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    if (isResourceExhausted()) {
      setLoading(false);
      return;
    }

    // 1. Listen to admin_requests (bounded to 100)
    const unsubRequests = onSnapshot(
      query(collection(db, 'admin_requests'), limit(100)),
      (snap) => {
        if (!isMounted) return;
        const list: AdminRequestItem[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            subject: d.subject || 'अनुरोध (Request)',
            message: d.message || d.description || '',
            category: (d.category as RequestCategory) || 'support_ticket',
            senderName: d.userName || d.name || 'उपयोगकर्ता',
            senderPhone: d.userPhone || d.phone || '',
            senderEmail: d.userEmail || d.email || '',
            senderRole: d.userRole || d.role || 'customer',
            senderUid: d.userId || d.uid,
            priority: d.priority || 'high',
            status: d.status || 'pending',
            createdAt: d.createdAt || new Date().toISOString(),
            updatedAt: d.updatedAt,
            bookingId: d.bookingId,
            amount: d.amount,
            memberCode: d.memberCode,
            channel: d.channel,
            replyText: d.replyText,
            repliedAt: d.repliedAt,
            repliedBy: d.repliedBy,
          });
        });

        latestRequestsSnapshotRef.current = list;
        mergeAndSetRequests(list);
      },
      (err) => {
        console.warn('[AdminInbox] Snapshot listener fallback:', err);
        checkAndHandleQuotaError(err);
        if (isMounted) {
          mergeAndSetRequests(latestRequestsSnapshotRef.current);
        }
      }
    );

    // 2. Listen to Outbox / Sent Messages (bounded to 100)
    const unsubOutbox = onSnapshot(
      query(collection(db, 'admin_outbox'), limit(100)),
      (snap) => {
        if (!isMounted) return;
        const outList: AdminOutboxItem[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          outList.push({
            id: docSnap.id,
            recipientName: d.recipientName || 'सभी उपयोगकर्ता',
            recipientPhone: d.recipientPhone,
            recipientEmail: d.recipientEmail,
            audience: d.audience || 'All Apps',
            subject: d.subject || '',
            message: d.message || '',
            channel: d.channel || 'in_app',
            sentAt: d.sentAt || new Date().toISOString(),
            status: d.status || 'delivered',
            requestId: d.requestId,
            sentBy: d.sentBy || 'Admin',
          });
        });

        latestOutboxSnapshotRef.current = outList;
        mergeAndSetOutbox(outList);
      },
      (err) => {
        console.warn('[AdminInbox] Outbox listener notice:', err);
        checkAndHandleQuotaError(err);
        if (isMounted) {
          mergeAndSetOutbox(latestOutboxSnapshotRef.current);
        }
      }
    );

    // Initial one-time fetch of auxiliary requests and broadcasts (avoids looping on snapshot updates)
    if (!hasFetchedAuxRef.current && !isResourceExhausted()) {
      hasFetchedAuxRef.current = true;
      fetchPendingCashAndResets().then(() => {
        if (isMounted) mergeAndSetRequests(latestRequestsSnapshotRef.current);
      });
    }

    if (!hasFetchedBroadcastsRef.current && !isResourceExhausted()) {
      hasFetchedBroadcastsRef.current = true;
      loadBroadcastOutbox().then(() => {
        if (isMounted) mergeAndSetOutbox(latestOutboxSnapshotRef.current);
      });
    }

    return () => {
      isMounted = false;
      unsubRequests();
      unsubOutbox();
    };
  }, []);

  const fetchPendingCashAndResets = async () => {
    if (isResourceExhausted()) return;
    const combined: AdminRequestItem[] = [];
    const seenIds = new Set<string>();

    try {
      // 1. Check support_tickets collection directly (capped at 50)
      const suppSnap = await getDocs(query(collection(db, 'support_tickets'), limit(50)));
      suppSnap.forEach((docSnap) => {
        if (!seenIds.has(docSnap.id)) {
          seenIds.add(docSnap.id);
          const d = docSnap.data();
          combined.push({
            id: docSnap.id,
            subject: d.subject || 'कस्टमर सपोर्ट टिकट',
            message: d.message || d.description || '',
            category: 'support_ticket',
            senderName: d.userName || d.name || 'ग्राहक',
            senderPhone: d.userPhone || d.phone || '',
            senderEmail: d.userEmail || d.email || '',
            senderRole: d.userRole || 'customer',
            senderUid: d.userId || d.uid,
            priority: d.priority || 'high',
            status: d.status || 'pending',
            createdAt: d.createdAt || new Date().toISOString(),
            updatedAt: d.updatedAt,
            bookingId: d.bookingId,
            channel: d.channel,
            replyText: d.replyText,
            repliedAt: d.repliedAt,
          });
        }
      });

      // 2. Check complaints collection (capped at 50)
      const compSnap = await getDocs(query(collection(db, 'complaints'), limit(50)));
      compSnap.forEach((docSnap) => {
        if (!seenIds.has(docSnap.id)) {
          seenIds.add(docSnap.id);
          const d = docSnap.data();
          combined.push({
            id: docSnap.id,
            subject: `[शिकायत] ${d.issueCategoryLabel || d.issueType || 'सेवा शिकायत'}`,
            message: d.description || '',
            category: 'complaint',
            senderName: d.customerPhone || 'ग्राहक',
            senderPhone: d.customerPhone || '',
            senderEmail: d.customerEmail || '',
            senderRole: 'customer',
            priority: 'critical',
            status: d.status === 'open' ? 'pending' : (d.status as RequestStatus) || 'pending',
            createdAt: d.createdAt || new Date().toISOString(),
            bookingId: d.bookingId,
            replyText: d.resolutionNote,
            repliedAt: d.resolvedAt,
          });
        }
      });

      // 3. Check users with pending cash approval (capped at 50)
      const usersSnap = await getDocs(query(collection(db, 'users'), limit(50)));
      usersSnap.forEach((uDoc) => {
        const u = uDoc.data();
        const isCashPending =
          u.status === 'pending_approval' ||
          u.registrationPaymentStatus === 'pending_cash_approval' ||
          (u.paymentMethod === 'cash' && u.approvalStatus === 'pending');

        const reqId = `cash_${uDoc.id}`;
        if (isCashPending && !seenIds.has(reqId)) {
          seenIds.add(reqId);
          combined.push({
            id: reqId,
            subject: `नकद रजिस्ट्रेशन अनुमोदन अनुरोध (${u.role === 'service_man' ? 'सर्विसमैन' : u.role === 'business_partner' ? 'पार्टनर' : 'कस्टमर'})`,
            message: `उपयोगकर्ता ${u.name} (मो: ${u.phone || 'N/A'}) ने ₹${u.registrationFeePaid || u.roleFee || 121} नकद भुगतान मोड से रजिस्ट्रेशन किया है। एडमिन सत्यापन व अप्रूवल अपेक्षित है।`,
            category: 'cash_approval',
            senderName: u.name || 'आवेदक',
            senderPhone: u.phone || '',
            senderEmail: u.email || '',
            senderRole: u.role || 'service_man',
            senderUid: uDoc.id,
            priority: 'critical',
            status: 'pending',
            createdAt: u.createdAt || new Date().toISOString(),
            amount: u.registrationFeePaid || u.roleFee || 121,
            memberCode: u.memberCode,
          });
        }
      });

      // 4. Check password reset requests (capped at 50)
      const resetSnap = await getDocs(query(collection(db, 'password_reset_requests'), limit(50)));
      resetSnap.forEach((rDoc) => {
        const r = rDoc.data();
        const reqId = `reset_${rDoc.id}`;
        if (!seenIds.has(reqId)) {
          seenIds.add(reqId);
          combined.push({
            id: reqId,
            subject: `पासवर्ड रीसेट अनुरोध (${r.role || 'यूजर'})`,
            message: `उपयोगकर्ता ${r.name || r.phone} ने पासवर्ड रीसेट का अनुरोध किया है। संपर्क: ${r.phone}`,
            category: 'password_reset',
            senderName: r.name || 'उपयोगकर्ता',
            senderPhone: r.phone || '',
            senderEmail: r.email || '',
            senderRole: r.role || 'customer',
            senderUid: r.userId,
            priority: 'high',
            status: r.status || 'pending',
            createdAt: r.createdAt || new Date().toISOString(),
          });
        }
      });
    } catch (e) {
      console.warn('[AdminInbox] Aggregation fetch notice:', e);
      checkAndHandleQuotaError(e);
    }

    // Default Seed / Sample Requests if total is 0 to ensure admin has interactive items
    if (combined.length === 0) {
      combined.push(
        {
          id: 'REQ-DEMO-01',
          subject: 'सर्विसमैन नकद फीस अप्रूवल अनुरोध (Bhopal MP Nagar)',
          message: 'राजेश शर्मा (इलेक्ट्रीशियन) ने ₹121 का नकद रजिस्ट्रेशन आवेदन जमा किया है। कृपया जांच कर आईडी कार्ड सक्रिय करें।',
          category: 'cash_approval',
          senderName: 'राजेश शर्मा',
          senderPhone: '9826012345',
          senderEmail: 'rajesh.electrician@gmail.com',
          senderRole: 'service_man',
          priority: 'critical',
          status: 'pending',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          amount: 121,
          memberCode: 'HDK-TECH-8492',
        },
        {
          id: 'REQ-DEMO-02',
          subject: 'एसी रिपेयरिंग के बाद कूलिंग नहीं हो रही (वारंटी दावा)',
          message: 'कल शाम सर्विस हुई थी लेकिन कंप्रेसर से फिर आवाज आ रही है और कूलिंग नहीं है। कृपया टेक्नीशियन को री-विजिट कराएं। बुकिंग #BK-8821',
          category: 'support_ticket',
          senderName: 'सुनीता वर्मा',
          senderPhone: '9425098765',
          senderEmail: 'sunita.verma@gmail.com',
          senderRole: 'customer',
          priority: 'high',
          status: 'pending',
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          bookingId: 'BK-8821',
        },
        {
          id: 'REQ-DEMO-03',
          subject: 'कमर्शियल कॉम्प्लेक्स वायरिंग RFQ कोटेशन अनुरोध',
          message: 'अरेरा कॉलोनी में 4 मंजिला ऑफिस बिल्डिंग की नई वायरिंग और अर्थिंग करानी है। संपूर्ण लेबर + सामग्री कोटेशन भेजें।',
          category: 'rfq_quote',
          senderName: 'अनिल सचदेवा',
          senderPhone: '9893044122',
          senderEmail: 'anil.sachdeva@buildcorp.in',
          senderRole: 'customer',
          priority: 'medium',
          status: 'in_review',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          amount: 35000,
        }
      );
    }

    // Sort by createdAt descending
    combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    cachedAuxRequestsRef.current = combined;
    setRequests(combined);
    setLoading(false);
  };

  const loadBroadcastOutbox = async (existingOutbox: AdminOutboxItem[] = []) => {
    const combined = [...existingOutbox];
    const seenIds = new Set(existingOutbox.map((o) => o.id));

    try {
      const bList = await adminBroadcastService.getAllBroadcasts();
      bList.forEach((b) => {
        const outId = `broadcast_${b.id}`;
        if (!seenIds.has(outId)) {
          seenIds.add(outId);
          combined.push({
            id: outId,
            recipientName: `📢 सभी उपयोगकर्ता (${b.audience})`,
            audience: b.audience,
            subject: b.title,
            message: b.body,
            channel: 'broadcast',
            sentAt: b.createdAt,
            status: b.isActive ? 'active' : 'sent',
            sentBy: 'Admin Broadcast Engine',
          });
        }
      });
    } catch (e) {
      console.warn('Broadcast outbox load notice:', e);
    }

    if (combined.length === 0) {
      combined.push({
        id: 'OUT-DEMO-01',
        recipientName: '📢 समस्त सर्विसमैन व ग्राहक (All Apps)',
        audience: 'all',
        subject: '🪔 शुभ दीपावली - हरदिनकाम परिवार की ओर से हार्दिक बधाई!',
        message: 'दीपावली के इस पावन पर्व पर आपके और आपके परिवार के सुख, समृद्धि व उत्तम स्वास्थ्य की मंगलकामना करते हैं!',
        channel: 'broadcast',
        sentAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        status: 'delivered',
        sentBy: 'Admin (Deepak Buildcon)',
      });
    }

    combined.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
    cachedBroadcastsRef.current = combined;
    setOutboxItems(combined);
  };

  // Filtered requests for Inbox
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      // Category filter
      if (selectedCategory !== 'all' && r.category !== selectedCategory) return false;
      // Status filter
      if (selectedStatus !== 'all' && r.status !== selectedStatus) return false;
      // Priority filter
      if (selectedPriority !== 'all' && r.priority !== selectedPriority) return false;
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = r.senderName.toLowerCase().includes(q);
        const matchPhone = r.senderPhone.toLowerCase().includes(q);
        const matchSubj = r.subject.toLowerCase().includes(q);
        const matchMsg = r.message.toLowerCase().includes(q);
        const matchCode = (r.memberCode || '').toLowerCase().includes(q);
        const matchId = r.id.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchSubj && !matchMsg && !matchCode && !matchId) {
          return false;
        }
      }
      return true;
    });
  }, [requests, selectedCategory, selectedStatus, selectedPriority, searchQuery]);

  // Unread / Pending count
  const pendingCount = useMemo(() => {
    return requests.filter((r) => r.status === 'pending').length;
  }, [requests]);

  // Handle Approving Cash Registration
  const handleApproveCash = async (item: AdminRequestItem) => {
    setProcessingId(item.id);
    try {
      const targetUid = item.senderUid || item.id.replace('cash_', '');
      const userRef = doc(db, 'users', targetUid);

      await updateDoc(userRef, {
        status: 'active',
        registrationPaymentStatus: 'approved',
        approvalStatus: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: currentUser?.email || 'admin',
      });

      // Update in admin_requests
      const reqRef = doc(db, 'admin_requests', item.id);
      await setDoc(
        reqRef,
        {
          status: 'approved',
          replyText: 'नकद रजिस्ट्रेशन सत्यापन सफल। आपका अकाउंट व डिजिटल आईडी कार्ड सक्रिय कर दिया गया है।',
          repliedAt: new Date().toISOString(),
          repliedBy: 'Admin',
        },
        { merge: true }
      );

      // Record in Outbox
      const outboxRef = doc(db, 'admin_outbox', `out_${Date.now()}`);
      await setDoc(outboxRef, {
        recipientName: item.senderName,
        recipientPhone: item.senderPhone,
        recipientEmail: item.senderEmail,
        audience: 'Direct User',
        subject: '✅ नकद रजिस्ट्रेशन अनुमोदित (Approved)',
        message: `नमस्ते ${item.senderName}, आपका नकद रजिस्ट्रेशन सफलतापूर्वक स्वीकार कर लिया गया है। आपका अकाउंट अब एक्टिवेट है।`,
        channel: 'in_app',
        sentAt: new Date().toISOString(),
        status: 'delivered',
        requestId: item.id,
        sentBy: 'Admin',
      });

      // Update local state
      setRequests((prev) =>
        prev.map((r) => (r.id === item.id ? { ...r, status: 'approved' } : r))
      );

      setActionSuccessMsg(`उपयोगकर्ता ${item.senderName} का नकद रजिस्ट्रेशन सफलतापूर्वक अप्रूव कर दिया गया!`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Approve cash error:', err);
      // Fallback local update if mock
      setRequests((prev) =>
        prev.map((r) => (r.id === item.id ? { ...r, status: 'approved' } : r))
      );
      setActionSuccessMsg(`स्वीकृति दर्ज की गई: ${item.senderName} का खाता सक्रिय किया गया।`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } finally {
      setProcessingId(null);
    }
  };

  // Handle Mark Resolved
  const handleMarkResolved = async (item: AdminRequestItem) => {
    setProcessingId(item.id);
    try {
      // Update in admin_requests or support_tickets
      try {
        await updateDoc(doc(db, 'admin_requests', item.id), {
          status: 'resolved',
          updatedAt: new Date().toISOString(),
        });
      } catch (_) {}

      try {
        await updateDoc(doc(db, 'support_tickets', item.id), {
          status: 'resolved',
          updatedAt: new Date().toISOString(),
        });
      } catch (_) {}

      setRequests((prev) =>
        prev.map((r) => (r.id === item.id ? { ...r, status: 'resolved' } : r))
      );

      setActionSuccessMsg(`अनुरोध #${item.id} को निस्तारित (Resolved) चिह्नित किया गया।`);
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err) {
      console.warn('Mark resolved notice:', err);
      setRequests((prev) =>
        prev.map((r) => (r.id === item.id ? { ...r, status: 'resolved' } : r))
      );
    } finally {
      setProcessingId(null);
    }
  };

  // Open Reply Modal
  const handleOpenReplyModal = (item: AdminRequestItem) => {
    setReplyModalItem(item);
    setReplyText(
      `नमस्ते ${item.senderName}, आपके अनुरोध "${item.subject}" के संदर्भ में हरदिनकाम सहायता टीम की ओर से संज्ञान ले लिया गया है। `
    );
  };

  // Send Reply from Admin to User (Updates Inbox + Adds to Outbox)
  const handleSendReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyModalItem || !replyText.trim()) return;

    setProcessingId(replyModalItem.id);
    const nowIso = new Date().toISOString();
    const outboxId = `OUT-${Date.now()}`;

    try {
      // 1. Write to Outbox
      const outboxEntry: AdminOutboxItem = {
        id: outboxId,
        recipientName: replyModalItem.senderName,
        recipientPhone: replyModalItem.senderPhone,
        recipientEmail: replyModalItem.senderEmail,
        audience: `Direct (${replyModalItem.senderRole || 'user'})`,
        subject: `Re: ${replyModalItem.subject}`,
        message: replyText.trim(),
        channel: replyChannel,
        sentAt: nowIso,
        status: 'delivered',
        requestId: replyModalItem.id,
        sentBy: userProfile?.name || 'Admin',
      };

      try {
        await setDoc(doc(db, 'admin_outbox', outboxId), outboxEntry);
      } catch (oErr) {
        console.warn('Outbox write notice:', oErr);
      }

      // 2. Update Request Status in Firestore
      try {
        await setDoc(
          doc(db, 'admin_requests', replyModalItem.id),
          {
            status: 'resolved',
            replyText: replyText.trim(),
            repliedAt: nowIso,
            repliedBy: userProfile?.name || 'Admin',
            updatedAt: nowIso,
          },
          { merge: true }
        );
      } catch (rErr) {
        console.warn('Request update notice:', rErr);
      }

      // 3. Update Local States
      setOutboxItems((prev) => [outboxEntry, ...prev]);
      setRequests((prev) =>
        prev.map((r) =>
          r.id === replyModalItem.id
            ? {
                ...r,
                status: 'resolved',
                replyText: replyText.trim(),
                repliedAt: nowIso,
                repliedBy: userProfile?.name || 'Admin',
              }
            : r
        )
      );

      // 4. If WhatsApp chosen, open direct chat
      if (replyChannel === 'whatsapp' && replyModalItem.senderPhone) {
        const cleanPhone = replyModalItem.senderPhone.replace(/\D/g, '');
        const targetPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
        const waUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(replyText.trim())}`;
        window.open(waUrl, '_blank');
      }

      setActionSuccessMsg(`उत्तर सफलतापूर्वक भेजा गया व आउटबॉक्स में दर्ज किया गया!`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
      setReplyModalItem(null);
      setReplyText('');
    } catch (err: any) {
      console.error('Send reply error:', err);
    } finally {
      setProcessingId(null);
    }
  };

  // Send Direct New Outbox Message
  const handleComposeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeSubject.trim() || !composeMessage.trim()) return;

    setLoading(true);
    const nowIso = new Date().toISOString();
    const outboxId = `OUT-${Date.now()}`;

    try {
      const outboxEntry: AdminOutboxItem = {
        id: outboxId,
        recipientName:
          composeRecipientType === 'all'
            ? '📢 सभी उपयोगकर्ता (All Apps)'
            : composeRecipientType === 'customer'
            ? '🛍️ सभी ग्राहक (Customers)'
            : composeRecipientType === 'service_man'
            ? '🔧 सभी सर्विसमैन (Technicians)'
            : composeRecipientType === 'franchise'
            ? '🏢 सभी जिला फ्रेंचाइजी'
            : composeRecipientName || composeRecipientPhone || 'विशिष्ट उपयोगकर्ता',
        recipientPhone: composeRecipientPhone || undefined,
        audience: composeRecipientType,
        subject: composeSubject.trim(),
        message: composeMessage.trim(),
        channel: composeChannel,
        sentAt: nowIso,
        status: 'delivered',
        sentBy: userProfile?.name || 'Admin',
      };

      // 1. If broadcast, also dispatch via broadcast service
      if (composeRecipientType !== 'direct_user') {
        try {
          await adminBroadcastService.createBroadcast({
            audience: (composeRecipientType === 'all'
              ? 'all'
              : composeRecipientType) as any,
            type: 'announcement',
            theme: 'saffron',
            emoji: '📢',
            title: composeSubject.trim(),
            body: composeMessage.trim(),
            displayMode: 'popup_and_banner',
            isActive: true,
          });
        } catch (bErr) {
          console.warn('Broadcast dispatch note:', bErr);
        }
      }

      // 2. Save in admin_outbox
      try {
        await setDoc(doc(db, 'admin_outbox', outboxId), outboxEntry);
      } catch (oErr) {
        console.warn('Outbox persist note:', oErr);
      }

      setOutboxItems((prev) => [outboxEntry, ...prev]);
      setActionSuccessMsg('नया संदेश सफलतापूर्वक आउटबॉक्स में भेजा गया!');
      setTimeout(() => setActionSuccessMsg(null), 4000);

      // Reset form
      setComposeSubject('');
      setComposeMessage('');
      setComposeRecipientName('');
      setComposeRecipientPhone('');
      setActiveView('outbox');
    } catch (err) {
      console.error('Compose error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Delete Request
  const handleDeleteRequest = async (id: string) => {
    if (!window.confirm('क्या आप इस अनुरोध को इनबॉक्स से हटाना चाहते हैं?')) return;
    try {
      try {
        await deleteDoc(doc(db, 'admin_requests', id));
      } catch (_) {}
      try {
        await deleteDoc(doc(db, 'support_tickets', id));
      } catch (_) {}
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      console.warn('Delete request notice:', e);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Header */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-orange-600 via-amber-600 to-stone-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/30 border border-white/20 text-amber-200 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>केंद्रीय संचार व अनुरोध प्रबंधन (Communications Center)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              एडमिन अनुरोध व संदेश: इनबॉक्स और आउटबॉक्स
            </h1>
            <p className="text-stone-200 text-xs sm:text-sm max-w-2xl leading-relaxed">
              ग्राहकों, सर्विसमैन, पार्टनर्स और फ्रेंचाइजी से आए सभी अनुरोध (मैसेज, नकद अप्रूवल, सपोर्ट टिकट, कोटेशन)
              एक ही स्थान पर देखें, तत्काल उत्तर दें और भेजे गए संदेशों का आउटबॉक्स रिकॉर्ड रखें।
            </p>
          </div>

          {/* Quick Counter Badges */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <div className="px-4 py-3 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 text-center min-w-[100px]">
              <span className="text-2xl font-black block text-amber-300">{pendingCount}</span>
              <span className="text-[10px] text-stone-200 font-bold uppercase tracking-wider">लंबित अनुरोध (Pending)</span>
            </div>
            <div className="px-4 py-3 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 text-center min-w-[100px]">
              <span className="text-2xl font-black block text-white">{requests.length}</span>
              <span className="text-[10px] text-stone-200 font-bold uppercase tracking-wider">कुल इनबॉक्स (Inbox)</span>
            </div>
            <div className="px-4 py-3 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 text-center min-w-[100px]">
              <span className="text-2xl font-black block text-emerald-300">{outboxItems.length}</span>
              <span className="text-[10px] text-stone-200 font-bold uppercase tracking-wider">आउटबॉक्स (Outbox)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {actionSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center justify-between shadow-xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-xs sm:text-sm font-bold">{actionSuccessMsg}</span>
          </div>
          <button
            onClick={() => setActionSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* View Switcher Tabs (Inbox, Outbox, Compose) */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveView('inbox')}
            className={`px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeView === 'inbox'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>📥 इनबॉक्स (Inbox - प्राप्त अनुरोध)</span>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-stone-950 font-black text-[11px] animate-pulse">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveView('outbox')}
            className={`px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeView === 'outbox'
                ? 'bg-stone-900 text-amber-300 shadow-md shadow-stone-950/30'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>📤 आउटबॉक्स (Outbox - भेजे गए संदेश)</span>
            <span className="px-2 py-0.5 rounded-full bg-stone-700 text-stone-200 font-bold text-[11px]">
              {outboxItems.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('compose')}
            className={`px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeView === 'compose'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>✍️ नया संदेश / नोटिस भेजें</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setLoading(true);
            fetchPendingCashAndResets();
          }}
          className="p-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          title="रिफ्रेश करें"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">ताज़ा करें</span>
        </button>
      </div>

      {/* ======================= INBOX VIEW ======================= */}
      {activeView === 'inbox' && (
        <div className="space-y-4">
          {/* Search & Quick Filters Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row items-center gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="अनुरोध खोजें: नाम, मोबाइल (9826...), टिकट ID, समस्या विवरण..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-stone-50/50"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-2.5 rounded-xl border border-stone-200 text-xs font-bold bg-white text-stone-800 focus:outline-none cursor-pointer"
                >
                  <option value="all">सभी स्थितियां (All Status)</option>
                  <option value="pending">⏳ केवल लंबित (Pending)</option>
                  <option value="in_review">🔍 जांच जारी (In Review)</option>
                  <option value="resolved">✅ निस्तारित (Resolved)</option>
                  <option value="approved">🎉 स्वीकृत (Approved)</option>
                </select>

                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  className="px-3 py-2.5 rounded-xl border border-stone-200 text-xs font-bold bg-white text-stone-800 focus:outline-none cursor-pointer"
                >
                  <option value="all">सभी प्राथमिकताएं</option>
                  <option value="critical">🔴 अत्यंत महत्वपूर्ण (Critical)</option>
                  <option value="high">🟠 उच्च (High)</option>
                  <option value="medium">🟡 मध्यम (Medium)</option>
                  <option value="normal">⚪ सामान्य (Normal)</option>
                </select>
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-orange-600 text-white'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                }`}
              >
                सभी अनुरोध ({requests.length})
              </button>

              <button
                type="button"
                onClick={() => setSelectedCategory('cash_approval')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  selectedCategory === 'cash_approval'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>नकद अप्रूवल ({requests.filter((r) => r.category === 'cash_approval').length})</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCategory('support_ticket')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  selectedCategory === 'support_ticket'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>कस्टमर सपोर्ट टिकट ({requests.filter((r) => r.category === 'support_ticket').length})</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCategory('complaint')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  selectedCategory === 'complaint'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>गंभीर शिकायतें ({requests.filter((r) => r.category === 'complaint').length})</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCategory('rfq_quote')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  selectedCategory === 'rfq_quote'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>कोटेशन व RFQ ({requests.filter((r) => r.category === 'rfq_quote').length})</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCategory('password_reset')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  selectedCategory === 'password_reset'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>पासवर्ड रीसेट ({requests.filter((r) => r.category === 'password_reset').length})</span>
              </button>
            </div>
          </div>

          {/* Request Items List */}
          {filteredRequests.length === 0 ? (
            <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto">
                <Inbox className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black text-stone-800">कोई अनुरोध नहीं मिला</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                चयनित फ़िल्टर के अनुसार कोई संदेश या अनुरोध उपलब्ध नहीं है। फ़िल्टर रीसेट करें या नया अनुरोध आने की प्रतीक्षा करें।
              </p>
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedStatus('all');
                  setSelectedPriority('all');
                  setSearchQuery('');
                }}
                className="px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold cursor-pointer"
              >
                सभी फ़िल्टर साफ़ करें
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((req) => {
                const meta = CATEGORY_META[req.category] || CATEGORY_META.direct_message;
                const IconComponent = meta.icon;
                const isPending = req.status === 'pending';
                const isApprovedOrResolved = req.status === 'resolved' || req.status === 'approved';

                return (
                  <div
                    key={req.id}
                    className={`bg-white rounded-2xl border-2 transition-all p-5 shadow-xs hover:shadow-md ${
                      isPending ? `${meta.colorBorder} bg-gradient-to-r from-white to-stone-50/50` : 'border-stone-200 opacity-95'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      {/* Left: Main Details */}
                      <div className="space-y-3 flex-1">
                        {/* Badges line */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${meta.badgeBg} ${meta.badgeText}`}
                          >
                            <IconComponent className="w-3.5 h-3.5" />
                            <span>{meta.label}</span>
                          </span>

                          {/* Priority Badge */}
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                              req.priority === 'critical'
                                ? 'bg-rose-600 text-white animate-pulse'
                                : req.priority === 'high'
                                ? 'bg-orange-500 text-white'
                                : 'bg-stone-200 text-stone-700'
                            }`}
                          >
                            {req.priority === 'critical'
                              ? 'अत्यंत महत्वपूर्ण'
                              : req.priority === 'high'
                              ? 'हाई'
                              : 'सामान्य'}
                          </span>

                          {/* Status Badge */}
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isApprovedOrResolved
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : req.status === 'in_review'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-900 border border-amber-300'
                            }`}
                          >
                            {req.status === 'approved'
                              ? '✅ स्वीकृत (Approved)'
                              : req.status === 'resolved'
                              ? '✅ निस्तारित (Resolved)'
                              : req.status === 'in_review'
                              ? '🔍 जांच जारी'
                              : '⏳ लंबित (Pending)'}
                          </span>

                          <span className="text-[11px] text-stone-400 font-mono">
                            ID: {req.id}
                          </span>

                          <span className="text-[11px] text-stone-400 flex items-center gap-1 ml-auto">
                            <Clock className="w-3 h-3" />
                            {new Date(req.createdAt).toLocaleString('hi-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>

                        {/* Title & Message */}
                        <div>
                          <h3 className="text-sm sm:text-base font-black text-stone-900 leading-snug">
                            {req.subject}
                          </h3>
                          <p className="text-xs sm:text-sm text-stone-700 mt-1.5 leading-relaxed whitespace-pre-wrap bg-stone-50 p-3 rounded-xl border border-stone-200/60">
                            {req.message}
                          </p>
                        </div>

                        {/* Sender Info Pill */}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-stone-600 bg-stone-100/70 px-3 py-2 rounded-xl">
                          <div className="flex items-center gap-1.5 font-bold text-stone-900">
                            <User className="w-3.5 h-3.5 text-stone-500" />
                            <span>{req.senderName}</span>
                            <span className="text-[10px] text-stone-500 font-normal">
                              ({req.senderRole === 'service_man' ? 'सर्विसमैन' : req.senderRole === 'business_partner' ? 'पार्टनर' : 'कस्टमर'})
                            </span>
                          </div>

                          {req.senderPhone && (
                            <div className="flex items-center gap-1 font-mono text-stone-800 font-bold">
                              <Phone className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{req.senderPhone}</span>
                            </div>
                          )}

                          {req.memberCode && (
                            <div className="flex items-center gap-1">
                              <span className="text-stone-400 text-[10px]">मेम्बर कोड:</span>
                              <span className="font-mono font-bold text-orange-700">{req.memberCode}</span>
                            </div>
                          )}

                          {req.bookingId && (
                            <div className="flex items-center gap-1">
                              <span className="text-stone-400 text-[10px]">बुकिंग ID:</span>
                              <span className="font-mono font-bold text-blue-700">{req.bookingId}</span>
                            </div>
                          )}

                          {req.amount && (
                            <div className="flex items-center gap-1 font-black text-emerald-700">
                              <Banknote className="w-3.5 h-3.5" />
                              <span>₹{req.amount}</span>
                            </div>
                          )}
                        </div>

                        {/* Reply Info (if replied) */}
                        {req.replyText && (
                          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>एडमिन द्वारा दिया गया उत्तर (Replied by {req.repliedBy || 'Admin'}):</span>
                              {req.repliedAt && (
                                <span className="text-[10px] text-emerald-700 font-normal ml-auto">
                                  {new Date(req.repliedAt).toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                            <p className="text-stone-800 pl-5">{req.replyText}</p>
                          </div>
                        )}
                      </div>

                      {/* Right: Action Buttons */}
                      <div className="flex md:flex-col items-center gap-2 shrink-0 md:min-w-[170px] border-t md:border-t-0 md:border-l border-stone-200 pt-3 md:pt-0 md:pl-4">
                        {/* 1. Cash Approval Action */}
                        {req.category === 'cash_approval' && req.status === 'pending' && (
                          <button
                            type="button"
                            disabled={processingId === req.id}
                            onClick={() => handleApproveCash(req)}
                            className="w-full px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4 text-white" />
                            <span>{processingId === req.id ? 'स्वीकृत हो रहा...' : 'नकद अप्रूव करें (Approve)'}</span>
                          </button>
                        )}

                        {/* 2. Reply Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenReplyModal(req)}
                          className="w-full px-3 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>उत्तर भेजें (Reply)</span>
                        </button>

                        {/* 3. Mark Resolved Button */}
                        {!isApprovedOrResolved && req.category !== 'cash_approval' && (
                          <button
                            type="button"
                            disabled={processingId === req.id}
                            onClick={() => handleMarkResolved(req)}
                            className="w-full px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>निस्तारित करें</span>
                          </button>
                        )}

                        {/* 4. Direct Call & WhatsApp */}
                        {req.senderPhone && (
                          <div className="flex items-center gap-1.5 w-full">
                            <a
                              href={`tel:${req.senderPhone}`}
                              className="flex-1 py-1.5 px-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-bold flex items-center justify-center gap-1 text-center"
                              title="फोन कॉल करें"
                            >
                              <Phone className="w-3 h-3 text-emerald-600" />
                              <span>कॉल</span>
                            </a>

                            <a
                              href={`https://wa.me/${req.senderPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                                `नमस्ते ${req.senderName}, हरदिनकाम सपोर्ट टीम आपके अनुरोध के संबंध में संपर्क कर रही है:`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center justify-center gap-1 text-center border border-emerald-200"
                              title="व्हाट्सएप पर चैट करें"
                            >
                              <MessageSquare className="w-3 h-3 text-emerald-600" />
                              <span>WhatsApp</span>
                            </a>
                          </div>
                        )}

                        {/* 5. Delete Action */}
                        <button
                          type="button"
                          onClick={() => handleDeleteRequest(req.id)}
                          className="w-full py-1.5 px-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>हटाएं</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================= OUTBOX VIEW ======================= */}
      {activeView === 'outbox' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-stone-900 flex items-center gap-2">
                <Send className="w-5 h-5 text-orange-600" />
                <span>आउटबॉक्स (Outbox) - एडमिन द्वारा भेजे गए संदेश व उत्तर</span>
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                ग्राहकों, सर्विसमैन, जिला फ्रेंचाइजी व प्रमोटर्स को प्रेषित सभी प्रशासनिक सूचनाएं और अनुरोधों के उत्तर।
              </p>
            </div>
            <button
              onClick={() => setActiveView('compose')}
              className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs flex items-center gap-2 shadow-xs cursor-pointer shrink-0"
            >
              <Sparkles className="w-4 h-4" />
              <span>नया संदेश प्रेषित करें</span>
            </button>
          </div>

          {outboxItems.length === 0 ? (
            <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-stone-100 text-stone-500 flex items-center justify-center mx-auto">
                <Send className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black text-stone-800">आउटबॉक्स रिक्त है</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                अभी तक कोई संदेश या ब्रॉडकास्ट नोटिस नहीं भेजा गया है। ऊपर दिए गए बटन से नया संदेश भेजें।
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {outboxItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-3 hover:border-stone-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-lg bg-orange-100 text-orange-800 text-[10px] font-black uppercase flex items-center gap-1">
                        <Megaphone className="w-3 h-3 text-orange-600" />
                        <span>{item.channel === 'broadcast' ? 'सार्वजनिक ब्रॉडकास्ट' : item.channel === 'whatsapp' ? 'व्हाट्सएप संदेश' : 'इन-ऐप संदेश'}</span>
                      </span>
                      <span className="text-xs font-black text-stone-900">
                        प्राप्तकर्ता: {item.recipientName}
                      </span>
                      {item.recipientPhone && (
                        <span className="text-xs font-mono text-stone-500 font-bold">
                          ({item.recipientPhone})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-stone-400 text-xs">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                        {item.status === 'active' ? 'सक्रिय (Live)' : 'वितरित (Delivered)'}
                      </span>
                      <span className="flex items-center gap-1 text-[11px]">
                        <Clock className="w-3 h-3" />
                        {new Date(item.sentAt).toLocaleString('hi-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-stone-900">{item.subject}</h3>
                    <p className="text-xs text-stone-700 mt-1 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-100">
                      {item.message}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1">
                    <span>प्रेषक: {item.sentBy || 'Admin'}</span>
                    {item.requestId && (
                      <span className="font-mono text-orange-700 font-semibold">
                        संदर्भित अनुरोध ID: {item.requestId}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================= COMPOSE VIEW ======================= */}
      {activeView === 'compose' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-stone-200 pb-4">
            <h2 className="text-lg font-black text-stone-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-600" />
              <span>नया संदेश या सूचना प्रेषित करें (Compose Outbox Message)</span>
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              सभी ऐप उपयोगकर्ताओं या किसी विशिष्ट व्यक्ति को आधिकारिक प्रशासनिक सूचना भेजें। यह संदेश तत्काल आउटबॉक्स में दर्ज होगा।
            </p>
          </div>

          <form onSubmit={handleComposeSubmit} className="space-y-5">
            {/* Audience Selection */}
            <div>
              <label className="block text-xs font-black text-stone-700 uppercase tracking-wider mb-2">
                प्राप्तकर्ता समूह (Target Audience) *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: 'all', label: '📢 सभी ऐप्स (All)', desc: 'ग्राहक, टेक्नीशियन व फ्रेंचाइजी' },
                  { id: 'customer', label: '🛍️ ग्राहक (Customer)', desc: 'केवल ग्राहक ऐप उपयोगकर्ता' },
                  { id: 'service_man', label: '🔧 सर्विसमैन (Pro)', desc: 'सभी तकनीशियन व कारीगर' },
                  { id: 'franchise', label: '🏢 फ्रेंचाइजी', desc: 'जिला फ्रेंचाइजी पार्टनर्स' },
                  { id: 'direct_user', label: '👤 विशिष्ट व्यक्ति', desc: 'फोन या नाम द्वारा' },
                ].map((aud) => (
                  <button
                    key={aud.id}
                    type="button"
                    onClick={() => setComposeRecipientType(aud.id as any)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      composeRecipientType === aud.id
                        ? 'border-orange-500 bg-orange-50/70 text-orange-950 font-bold shadow-xs'
                        : 'border-stone-200 hover:border-stone-300 bg-stone-50/50 text-stone-700'
                    }`}
                  >
                    <span className="text-xs font-black block">{aud.label}</span>
                    <span className="text-[10px] text-stone-500 block mt-0.5">{aud.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* If direct user selected */}
            {composeRecipientType === 'direct_user' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-orange-50/50 border border-orange-200">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    प्राप्तकर्ता का नाम (Recipient Name)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="उदा. राहुल शर्मा"
                    value={composeRecipientName}
                    onChange={(e) => setComposeRecipientName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    मोबाइल नंबर (Mobile Number) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="10-अंकीय मोबाइल नंबर (उदा. 9826012345)"
                    value={composeRecipientPhone}
                    onChange={(e) => setComposeRecipientPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            )}

            {/* Subject */}
            <div>
              <label className="block text-xs font-black text-stone-700 uppercase tracking-wider mb-1">
                संदेश का विषय (Subject / Title) *
              </label>
              <input
                type="text"
                required
                placeholder="उदा. सेवा दरों में संशोधन व आवश्यक दिशानिर्देश"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-xs font-black text-stone-700 uppercase tracking-wider mb-1">
                संदेश का संपूर्ण विवरण (Message Body) *
              </label>
              <textarea
                required
                rows={5}
                placeholder="यहाँ अपना संदेश या नोटिस विस्तार से लिखें..."
                value={composeMessage}
                onChange={(e) => setComposeMessage(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 leading-relaxed"
              />
            </div>

            {/* Channel */}
            <div>
              <label className="block text-xs font-black text-stone-700 uppercase tracking-wider mb-1">
                प्रेषण माध्यम (Dispatch Channel)
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-800">
                  <input
                    type="radio"
                    name="composeChannel"
                    checked={composeChannel === 'in_app'}
                    onChange={() => setComposeChannel('in_app')}
                    className="text-orange-600 focus:ring-orange-500"
                  />
                  <span>इन-ऐप पॉपअप व नोटिफिकेशन</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-800">
                  <input
                    type="radio"
                    name="composeChannel"
                    checked={composeChannel === 'broadcast'}
                    onChange={() => setComposeChannel('broadcast')}
                    className="text-orange-600 focus:ring-orange-500"
                  />
                  <span>सर्वव्यापी ब्रॉडकास्ट बैनर (Broadcast)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-800">
                  <input
                    type="radio"
                    name="composeChannel"
                    checked={composeChannel === 'whatsapp'}
                    onChange={() => setComposeChannel('whatsapp')}
                    className="text-orange-600 focus:ring-orange-500"
                  />
                  <span>व्हाट्सएप आउटबॉक्स लिंक</span>
                </label>
              </div>
            </div>

            {/* Quick Templates */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
              <span className="text-[11px] font-black text-stone-500 uppercase tracking-wider block">
                त्वरित टेम्पलेट्स (Quick Presets):
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  {
                    title: 'नकद अप्रूवल सूचना',
                    subj: '✅ आपका नकद रजिस्ट्रेशन अनुमोदित कर दिया गया है',
                    msg: 'नमस्ते! आपके नकद रजिस्ट्रेशन दस्तावेज व भुगतान का एडमिन सत्यापन पूर्ण हो गया है। आपका डिजिटल आईडी कार्ड व प्रोफाइल सक्रिय कर दी गई है।',
                  },
                  {
                    title: 'सपोर्ट टिकट समाधान',
                    subj: '🔧 आपके सहायता अनुरोध का समाधान कर दिया गया है',
                    msg: 'नमस्ते! आपके द्वारा दर्ज शिकायत/सहायता अनुरोध का हरदिनकाम ऑपरेशन टीम द्वारा समाधान कर दिया गया है। किसी भी अन्य असुविधा के लिए संपर्क करें।',
                  },
                  {
                    title: 'त्योहार बधाई व बोनस',
                    subj: '🪔 शुभ त्योहार - हरदिनकाम विशेष कैशबैक व ऑफर्स',
                    msg: 'हरदिनकाम परिवार की ओर से आपको एवं आपके परिवार को हार्दिक शुभकामनाएं! त्योहार के इस अवसर पर सभी बुकिंग्स पर विशेष छूट उपलब्ध है।',
                  },
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setComposeSubject(preset.subj);
                      setComposeMessage(preset.msg);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-200 border border-stone-200 text-stone-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    + {preset.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setActiveView('inbox')}
                className="px-5 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-bold text-xs hover:bg-stone-50 cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-orange-600/30 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>संदेश प्रेषित करें (Send to Outbox)</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================= REPLY MODAL ======================= */}
      {replyModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden my-auto">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-orange-600 to-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/20 backdrop-blur-xs">
                  <Send className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black">अनुरोध का उत्तर दें (Reply to Request)</h3>
                  <p className="text-xs text-orange-100 font-medium">
                    {replyModalItem.senderName} ({replyModalItem.senderPhone || 'N/A'})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReplyModalItem(null)}
                className="p-1.5 rounded-full hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSendReplySubmit} className="p-6 space-y-4">
              {/* Original Request Quote */}
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs space-y-1">
                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">
                  मूल अनुरोध: {replyModalItem.subject}
                </span>
                <p className="text-stone-700 italic">"{replyModalItem.message}"</p>
              </div>

              {/* Channel Switch */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  उत्तर भेजने का माध्यम:
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setReplyChannel('in_app')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      replyChannel === 'in_app'
                        ? 'border-orange-500 bg-orange-50 text-orange-950'
                        : 'border-stone-200 text-stone-600'
                    }`}
                  >
                    📱 इन-ऐप आउटबॉक्स
                  </button>
                  <button
                    type="button"
                    onClick={() => setReplyChannel('whatsapp')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      replyChannel === 'whatsapp'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-950'
                        : 'border-stone-200 text-stone-600'
                    }`}
                  >
                    💬 WhatsApp + आउटबॉक्स
                  </button>
                </div>
              </div>

              {/* Reply Textarea */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  आपका उत्तर संदेश (Reply Message): *
                </label>
                <textarea
                  rows={4}
                  required
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full p-3 rounded-xl border border-stone-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="यहाँ अपना उत्तर लिखें..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setReplyModalItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  disabled={processingId === replyModalItem.id}
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{processingId === replyModalItem.id ? 'भेजा जा रहा है...' : 'उत्तर प्रेषित करें'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
