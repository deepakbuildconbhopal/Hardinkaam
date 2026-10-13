import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneForwarded,
  PhoneOff,
  Radio,
  Play,
  Pause,
  Square,
  Plus,
  Trash2,
  Edit,
  Save,
  RefreshCw,
  Search,
  Filter,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  Sparkles,
  Bot,
  Sliders,
  ShieldCheck,
  Headphones,
  Mic,
  MicOff,
  Volume2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  FileText,
  Building,
  Zap,
  Check,
  X,
  Send,
  HelpCircle,
  Settings,
  ChevronDown,
  Layers,
  Calendar,
  VolumeX,
} from 'lucide-react';
import { auth, db } from '../../firebase/config';
import { collection, onSnapshot, query, orderBy, limit, doc, setDoc } from 'firebase/firestore';
import { checkAndHandleQuotaError, isResourceExhausted } from '../../utils/sparkQuotaGuard';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { AdminAccessDenied } from './AdminAccessDenied';
import {
  AICallCampaign,
  AICallQueueItem,
  AICallLog,
  AICallScript,
  AICallSettings,
  AICallOverviewStats,
  CallOutcome,
  CallStatus,
} from '../../types/aiCalling';

interface Props {
  initialSubTab?: 'overview' | 'campaigns' | 'queue' | 'scripts' | 'simulator' | 'logs' | 'settings';
  onSelectTab?: (tab: string) => void;
  onNavigateToLeads?: () => void;
}

export const AdminAICallingAgent: React.FC<Props> = ({ initialSubTab = 'overview', onSelectTab, onNavigateToLeads }) => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  // Active Sub-tab
  const [activeTab, setActiveTab] = useState<
    'overview' | 'campaigns' | 'queue' | 'scripts' | 'simulator' | 'logs' | 'settings'
  >(initialSubTab);

  // Sync activeTab when initialSubTab changes
  useEffect(() => {
    if (initialSubTab) {
      setActiveTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Loading States
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Data States
  const [stats, setStats] = useState<AICallOverviewStats | null>(null);
  const [campaigns, setCampaigns] = useState<AICallCampaign[]>([]);
  const [queue, setQueue] = useState<AICallQueueItem[]>([]);
  const [logs, setLogs] = useState<AICallLog[]>([]);
  const [scripts, setScripts] = useState<AICallScript[]>([]);
  const [settings, setSettings] = useState<AICallSettings | null>(null);

  // Campaign Form Modal
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Partial<AICallCampaign> | null>(null);

  // Script Form Modal
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<Partial<AICallScript> | null>(null);

  // Queue Populate Modal
  const [isPopulateModalOpen, setIsPopulateModalOpen] = useState(false);
  const [populateFilters, setPopulateFilters] = useState({
    campaignId: '',
    cityFilter: 'Bhopal',
    tradeFilter: '',
    limitCount: 50,
  });

  // Direct Call Modal
  const [isDirectCallModalOpen, setIsDirectCallModalOpen] = useState(false);
  const [directCallData, setDirectCallData] = useState({
    phone: '',
    contactName: '',
    trade: 'इलेक्ट्रीशियन',
    city: 'Bhopal',
    scriptId: '',
  });

  // Selected Call Log for Detail Modal
  const [selectedLog, setSelectedLog] = useState<AICallLog | null>(null);

  // Call Queue Category Filter State
  const [queueFilterStatus, setQueueFilterStatus] = useState<string>('ALL');

  // Voice Simulator Interactive State
  const [simulatorState, setSimulatorState] = useState<{
    leadName: string;
    phone: string;
    trade: string;
    city: string;
    scriptPrompt: string;
    language: 'hi' | 'hinglish' | 'en';
    isActive: boolean;
    history: { role: 'ai' | 'customer' | 'system'; text: string; timestamp: string }[];
    currentInput: string;
    isGenerating: boolean;
    isMuted: boolean;
    detectedIntent: string;
    detectedOutcome: CallOutcome | '';
    sentiment: string;
    confidenceScore: number;
    callDurationSeconds: number;
  }>({
    leadName: 'दीपक शर्मा',
    phone: '+919826012345',
    trade: 'इलेक्ट्रीशियन & वायरिंग',
    city: 'भोपाल (MP)',
    scriptPrompt: 'आप HARDINKAAM के AI वॉइस कॉलर हैं। सर्विसमैन को बताएं कि 0% कमीशन पर अनलिमिटेड काम मिलता है।',
    language: 'hinglish',
    isActive: false,
    history: [],
    currentInput: '',
    isGenerating: false,
    isMuted: false,
    detectedIntent: 'IDLE',
    detectedOutcome: '',
    sentiment: 'neutral',
    confidenceScore: 0.95,
    callDurationSeconds: 0,
  });

  const simTimerRef = useRef<any>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Helper for authenticated API calls with Firebase Token
  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    let token = '';
    try {
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken(true);
      }
    } catch (_) {}

    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'x-admin-email': user?.email || 'deepakbuildconbhopal@gmail.com',
      'x-admin-role': 'admin',
      'x-admin-uid': user?.id || auth.currentUser?.uid || 'admin_root',
    };
  };

  // Fetch all Calling Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();

      const [overviewRes, campRes, qRes, logsRes, scriptsRes, settingsRes] = await Promise.all([
        fetch('/api/ai-calling/overview', { headers }),
        fetch('/api/ai-calling/campaigns', { headers }),
        fetch('/api/ai-calling/queue', { headers }),
        fetch('/api/ai-calling/logs', { headers }),
        fetch('/api/ai-calling/scripts', { headers }),
        fetch('/api/ai-calling/settings', { headers }),
      ]);

      if (overviewRes.ok) {
        const d = await overviewRes.json();
        if (d.success) setStats(d.stats);
      }

      if (campRes.ok) {
        const d = await campRes.json();
        if (d.success) setCampaigns(d.campaigns || []);
      }

      if (qRes.ok) {
        const d = await qRes.json();
        if (d.success) setQueue(d.queue || []);
      }

      if (logsRes.ok) {
        const d = await logsRes.json();
        if (d.success) setLogs(d.logs || []);
      }

      if (scriptsRes.ok) {
        const d = await scriptsRes.json();
        if (d.success) setScripts(d.scripts || []);
      }

      if (settingsRes.ok) {
        const d = await settingsRes.json();
        if (d.success) setSettings(d.settings);
      }
    } catch (err: any) {
      console.error('Failed to load AI calling data:', err);
      showToast('डेटा लोड करने में त्रुटि आई।', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Real-time Firestore subscription to 'ai_call_logs' collection for live statistics calculation (bounded)
  useEffect(() => {
    if (!isAdmin || isResourceExhausted()) return;
    try {
      const q = query(collection(db, 'ai_call_logs'), orderBy('startedAt', 'desc'), limit(50));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const liveLogs = snapshot.docs.map((doc) => doc.data() as AICallLog);
            setLogs(liveLogs);
          }
        },
        (error) => {
          console.warn('[AdminAICallingAgent] Live logs snapshot notice:', error.message);
          checkAndHandleQuotaError(error);
        }
      );
      return () => unsubscribe();
    } catch (e) {
      console.warn('[AdminAICallingAgent] Firestore listener setup notice:', e);
      checkAndHandleQuotaError(e);
    }
  }, [isAdmin]);

  // Real-time Firestore subscription to 'ai_call_queue' collection (bounded)
  useEffect(() => {
    if (!isAdmin || isResourceExhausted()) return;
    try {
      const q = query(collection(db, 'ai_call_queue'), limit(50));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const liveQueue = snapshot.docs.map((doc) => doc.data() as AICallQueueItem);
            setQueue(liveQueue);
          }
        },
        (error) => {
          console.warn('[AdminAICallingAgent] Live queue snapshot notice:', error.message);
          checkAndHandleQuotaError(error);
        }
      );
      return () => unsubscribe();
    } catch (e) {
      console.warn('[AdminAICallingAgent] Firestore queue listener setup notice:', e);
      checkAndHandleQuotaError(e);
    }
  }, [isAdmin]);

  // Real-time Categorization of Leads in Call Queue
  const queueStatusSummary = useMemo(() => {
    const total = queue.length;
    const pending = queue.filter((item) => item.status === 'PENDING' || item.status === 'QUEUED').length;
    const calling = queue.filter((item) => item.status === 'CALLING').length;
    const connected = queue.filter((item) => item.status === 'CONNECTED').length;
    const humanTransfer = queue.filter((item) => item.status === 'HUMAN_TRANSFER').length;
    const followUp = queue.filter((item) => item.status === 'FOLLOW_UP').length;
    const completed = queue.filter((item) => item.status === 'COMPLETED').length;
    const failed = queue.filter(
      (item) => item.status === 'FAILED' || item.status === 'NO_ANSWER' || item.status === 'BUSY'
    ).length;
    const doNotCall = queue.filter((item) => item.status === 'DO_NOT_CALL' || item.doNotCall === true).length;

    const pendingPercent = total > 0 ? Math.round((pending / total) * 100) : 0;
    const callingPercent = total > 0 ? Math.round((calling / total) * 100) : 0;
    const connectedPercent = total > 0 ? Math.round((connected / total) * 100) : 0;
    const humanTransferPercent = total > 0 ? Math.round((humanTransfer / total) * 100) : 0;
    const completedPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      pending,
      calling,
      connected,
      humanTransfer,
      followUp,
      completed,
      failed,
      doNotCall,
      pendingPercent,
      callingPercent,
      connectedPercent,
      humanTransferPercent,
      completedPercent,
    };
  }, [queue]);

  // Dynamically Filtered Queue List based on Selected Category
  const filteredQueue = useMemo(() => {
    if (queueFilterStatus === 'ALL') return queue;
    if (queueFilterStatus === 'PENDING') return queue.filter((q) => q.status === 'PENDING' || q.status === 'QUEUED');
    if (queueFilterStatus === 'CALLING') return queue.filter((q) => q.status === 'CALLING');
    if (queueFilterStatus === 'CONNECTED') return queue.filter((q) => q.status === 'CONNECTED');
    if (queueFilterStatus === 'HUMAN_TRANSFER') return queue.filter((q) => q.status === 'HUMAN_TRANSFER');
    if (queueFilterStatus === 'FOLLOW_UP') return queue.filter((q) => q.status === 'FOLLOW_UP');
    if (queueFilterStatus === 'COMPLETED') return queue.filter((q) => q.status === 'COMPLETED');
    if (queueFilterStatus === 'FAILED')
      return queue.filter((q) => ['FAILED', 'NO_ANSWER', 'BUSY'].includes(q.status));
    if (queueFilterStatus === 'DO_NOT_CALL') return queue.filter((q) => q.status === 'DO_NOT_CALL' || q.doNotCall);
    return queue;
  }, [queue, queueFilterStatus]);

  // Real-time calculation of key Calling Statistics directly from ai_call_logs collection
  const computedMetrics = useMemo(() => {
    const totalCalls = logs.length;
    const connected = logs.filter(
      (l) =>
        ['CONNECTED', 'COMPLETED', 'FOLLOW_UP', 'HUMAN_TRANSFER'].includes(l.status) ||
        (l.durationSeconds && l.durationSeconds > 0)
    ).length;

    const interested = logs.filter(
      (l) =>
        l.outcome === 'INTERESTED' ||
        l.outcome === 'REGISTRATION_REQUEST' ||
        l.outcome === 'BOOKING_REQUEST'
    ).length;

    const busy = logs.filter((l) => l.status === 'BUSY' || l.outcome === 'BUSY').length;

    const noAnswer = logs.filter((l) => l.status === 'NO_ANSWER' || l.outcome === 'NO_ANSWER').length;

    const notInterested = logs.filter(
      (l) => l.outcome === 'NOT_INTERESTED' || l.outcome === 'DO_NOT_CALL'
    ).length;

    const followUps = logs.filter(
      (l) => l.outcome === 'CALL_LATER' || l.status === 'FOLLOW_UP'
    ).length;

    const humanTransfers = logs.filter(
      (l) => l.humanTransferRequested || l.status === 'HUMAN_TRANSFER'
    ).length;

    const totalSeconds = logs.reduce((acc, curr) => acc + (curr.durationSeconds || 0), 0);
    const totalMinutes = totalSeconds > 0 ? (totalSeconds / 60).toFixed(1) : '0.0';
    const totalMinutesNumber = Math.round(totalSeconds / 60);

    const connectionRate = totalCalls > 0 ? Math.round((connected / totalCalls) * 100) : 0;
    const conversionRate = connected > 0 ? Math.round((interested / connected) * 100) : 0;

    return {
      totalCalls,
      connected,
      interested,
      busy,
      noAnswer,
      notInterested,
      followUps,
      humanTransfers,
      totalSeconds,
      totalMinutes,
      totalMinutesNumber,
      connectionRate,
      conversionRate,
    };
  }, [logs]);

  // Scroll to bottom of simulator chat
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [simulatorState.history, simulatorState.isGenerating]);

  // Simulator Call Timer
  useEffect(() => {
    if (simulatorState.isActive) {
      simTimerRef.current = setInterval(() => {
        setSimulatorState((prev) => ({ ...prev, callDurationSeconds: prev.callDurationSeconds + 1 }));
      }, 1000);
    } else {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    }
    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, [simulatorState.isActive]);

  // =========================================================================
  // ACTIONS: CAMPAIGN CONTROLS
  // =========================================================================
  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaign?.name) {
      showToast('अभियान का नाम आवश्यक है।', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const campaignId = editingCampaign.id || `camp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const nowIso = new Date().toISOString();
      const campaignPayload = {
        ...editingCampaign,
        id: campaignId,
        createdAt: editingCampaign.createdAt || nowIso,
        updatedAt: nowIso,
      };

      // Direct Client-side Firestore Save for Authenticated Admin
      try {
        await setDoc(doc(db, 'ai_call_campaigns', campaignId), campaignPayload, { merge: true });
      } catch (_) {}

      const headers = await getAuthHeaders();
      const res = await fetch('/api/ai-calling/campaigns', {
        method: 'POST',
        headers,
        body: JSON.stringify(campaignPayload),
      });

      const data = await res.json();
      if (data.success) {
        showToast('अभियान सफलतापूर्वक सुरक्षित किया गया!', 'success');
        setIsCampaignModalOpen(false);
        setEditingCampaign(null);
        fetchData();
      } else {
        showToast(data.error || 'अभियान सहेजने में विफल।', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartCampaign = async (id: string) => {
    setActionLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/ai-calling/campaigns/${id}/start`, {
        method: 'POST',
        headers,
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'कॉलिंग अभियान शुरू किया गया!', 'success');
        fetchData();
      } else {
        showToast(data.error || 'अभियान शुरू करने में विफल।', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePauseCampaign = async (id: string) => {
    try {
      const headers = await getAuthHeaders();
      await fetch(`/api/ai-calling/campaigns/${id}/pause`, { method: 'POST', headers });
      showToast('अभियान को रोका गया (Paused)', 'info');
      fetchData();
    } catch (_) {}
  };

  const handleStopCampaign = async (id: string) => {
    try {
      const headers = await getAuthHeaders();
      await fetch(`/api/ai-calling/campaigns/${id}/stop`, { method: 'POST', headers });
      showToast('अभियान समाप्त किया गया (Stopped)', 'info');
      fetchData();
    } catch (_) {}
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!window.confirm('क्या आप वाकई इस अभियान को हटाना चाहते हैं?')) return;
    try {
      const headers = await getAuthHeaders();
      await fetch(`/api/ai-calling/campaigns/${id}`, { method: 'DELETE', headers });
      showToast('अभियान हटाया गया।', 'info');
      fetchData();
    } catch (_) {}
  };

  // =========================================================================
  // ACTIONS: POPULATE QUEUE FROM MARKETING LEADS
  // =========================================================================
  const handlePopulateQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!populateFilters.campaignId) {
      showToast('कृपया पहले एक अभियान चुनें।', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/ai-calling/queue/populate', {
        method: 'POST',
        headers,
        body: JSON.stringify(populateFilters),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message || `${data.addedCount} लीड्स कॉलिंग कतार में जोड़ी गईं!`, 'success');
        setIsPopulateModalOpen(false);
        fetchData();
      } else {
        showToast(data.error || 'कतार में जोड़ने में विफल।', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTriggerNextInQueue = async (campaignId?: string, count: number = 3) => {
    setActionLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/ai-calling/queue/trigger-next', {
        method: 'POST',
        headers,
        body: JSON.stringify({ campaignId, count }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message || `${count} कॉल्स ट्रिगर की गईं!`, 'success');
        fetchData();
      } else {
        showToast(data.error || 'कॉल ट्रिगर विफल।', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // =========================================================================
  // ACTIONS: DIRECT CALL NOW
  // =========================================================================
  const handleDirectCallNow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directCallData.phone) {
      showToast('फोन नंबर दर्ज करें।', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/ai-calling/call-now', {
        method: 'POST',
        headers,
        body: JSON.stringify(directCallData),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`कॉल इनिशियेट की गई: ${directCallData.phone}`, 'success');
        setIsDirectCallModalOpen(false);
        fetchData();
      } else {
        showToast(data.error || 'कॉल शुरू करने में विफल।', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // =========================================================================
  // ACTIONS: SCRIPT BUILDER
  // =========================================================================
  const handleSaveScript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScript?.name) {
      showToast('स्क्रिप्ट का नाम आवश्यक है।', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const scriptId = editingScript.id || `script_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const payload = {
        ...editingScript,
        id: scriptId,
      };

      const headers = await getAuthHeaders();
      const res = await fetch('/api/ai-calling/scripts', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        showToast('AI स्क्रिप्ट सुरक्षित की गई!', 'success');
        setIsScriptModalOpen(false);
        setEditingScript(null);
        fetchData();
      } else {
        showToast(data.error || 'स्क्रिप्ट सहेजने में विफल।', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteScript = async (id: string) => {
    if (!window.confirm('क्या आप वाकई इस AI स्क्रिप्ट को हटाना चाहते हैं?')) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/ai-calling/scripts/${id}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();
      if (data.success) {
        showToast('AI स्क्रिप्ट सफलतापूर्वक हटा दी गई।', 'info');
        fetchData();
      } else {
        showToast(data.error || 'स्क्रिप्ट हटाने में विफल।', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleTestTtsAudio = (textToSpeak: string) => {
    if (!('speechSynthesis' in window)) {
      showToast('आपका ब्राउज़र Text-to-Speech (TTS) का समर्थन नहीं करता है।', 'warning');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'hi-IN';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
    showToast('🔊 TTS वॉइस प्रीव्यू चलाया जा रहा है...', 'success');
  };

  const handleDownloadCallingLogsCsv = () => {
    if (!logs || logs.length === 0) {
      showToast('डाउनलोड करने के लिए कोई कॉल लॉग उपलब्ध नहीं है।', 'warning');
      return;
    }

    const headers = ['Call ID', 'Contact Name', 'Phone', 'Direction', 'Provider', 'Status', 'Outcome', 'Duration (s)', 'Started At', 'Summary'];
    const rows = logs.map((l) => [
      l.id,
      `"${(l.contactName || '').replace(/"/g, '""')}"`,
      `"${(l.phone || '').replace(/"/g, '""')}"`,
      l.direction || 'outbound',
      l.provider || 'jiocx',
      l.status || 'COMPLETED',
      l.outcome || 'INTERESTED',
      l.durationSeconds || 0,
      `"${l.startedAt || ''}"`,
      `"${(l.summary || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hardinkaam_ai_calling_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('📊 कॉलिंग लॉग्स CSV रिपोर्ट सफलतापूर्वक डाउनलोड हो गई!', 'success');
  };

  // =========================================================================
  // ACTIONS: SETTINGS SAVE
  // =========================================================================
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setActionLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/ai-calling/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (data.success) {
        showToast('टेलीफोनी & AI सेटिंग्स सुरक्षित की गईं!', 'success');
        if (data.settings) setSettings(data.settings);
      } else {
        showToast(data.error || 'सेटिंग्स सहेजने में विफल।', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // =========================================================================
  // ACTIONS: INTERACTIVE VOICE SIMULATOR
  // =========================================================================
  const startSimulatorCall = async () => {
    setSimulatorState((prev) => ({
      ...prev,
      isActive: true,
      callDurationSeconds: 0,
      history: [
        {
          role: 'system',
          text: `कॉल शुरू: HARDINKAAM AI कॉलर कनेक्टेड -> ${prev.leadName} (${prev.trade}, ${prev.city})`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ],
      isGenerating: true,
    }));

    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/ai-calling/simulator/turn', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          scriptPrompt: simulatorState.scriptPrompt,
          leadName: simulatorState.leadName,
          trade: simulatorState.trade,
          city: simulatorState.city,
          language: simulatorState.language,
          isFirstTurn: true,
          conversationHistory: [],
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSimulatorState((prev) => ({
          ...prev,
          history: [
            ...prev.history,
            {
              role: 'ai',
              text: data.aiResponseText,
              timestamp: new Date().toLocaleTimeString(),
            },
          ],
          detectedIntent: data.detectedIntent,
          detectedOutcome: data.detectedOutcome,
          confidenceScore: data.confidenceScore || 0.95,
          isGenerating: false,
        }));
      }
    } catch (err) {
      setSimulatorState((prev) => ({ ...prev, isGenerating: false }));
    }
  };

  const sendSimulatorUserReply = async (customText?: string) => {
    const textToSend = customText || simulatorState.currentInput.trim();
    if (!textToSend || !simulatorState.isActive) return;

    const userEntry = {
      role: 'customer' as const,
      text: textToSend,
      timestamp: new Date().toLocaleTimeString(),
    };

    const newHistory = [...simulatorState.history, userEntry];

    setSimulatorState((prev) => ({
      ...prev,
      currentInput: '',
      history: newHistory,
      isGenerating: true,
    }));

    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/ai-calling/simulator/turn', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          scriptPrompt: simulatorState.scriptPrompt,
          leadName: simulatorState.leadName,
          trade: simulatorState.trade,
          city: simulatorState.city,
          language: simulatorState.language,
          customerInputText: textToSend,
          conversationHistory: newHistory.filter((h) => h.role !== 'system'),
        }),
      });

      const data = await res.json();
      if (data.success) {
        const aiEntry = {
          role: 'ai' as const,
          text: data.aiResponseText,
          timestamp: new Date().toLocaleTimeString(),
        };

        setSimulatorState((prev) => ({
          ...prev,
          history: [...prev.history, aiEntry],
          detectedIntent: data.detectedIntent,
          detectedOutcome: data.detectedOutcome,
          confidenceScore: data.confidenceScore || 0.95,
          isGenerating: false,
        }));

        if (data.shouldEndCall) {
          setTimeout(() => endSimulatorCall(), 3000);
        }
      }
    } catch (err) {
      setSimulatorState((prev) => ({ ...prev, isGenerating: false }));
    }
  };

  const endSimulatorCall = async () => {
    setSimulatorState((prev) => ({ ...prev, isActive: false, isGenerating: true }));

    try {
      const headers = await getAuthHeaders();
      const transcriptEntries = simulatorState.history
        .filter((h) => h.role !== 'system')
        .map((h) => ({
          speaker: h.role === 'ai' ? 'ai' : ('customer' as any),
          text: h.text,
          timestamp: h.timestamp,
        }));

      const res = await fetch('/api/ai-calling/simulator/finish', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          transcript: transcriptEntries,
          leadName: simulatorState.leadName,
          phone: simulatorState.phone,
          trade: simulatorState.trade,
          city: simulatorState.city,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast('टेस्ट कॉल संपन्न और लॉग में सुरक्षित किया गया!', 'success');
        setSimulatorState((prev) => ({
          ...prev,
          history: [
            ...prev.history,
            {
              role: 'system',
              text: `🏁 कॉल समाप्त | सारांश: ${data.summary?.summary || 'कॉल पूर्ण हुई'}`,
              timestamp: new Date().toLocaleTimeString(),
            },
          ],
          isGenerating: false,
        }));
        fetchData();
      }
    } catch (_) {
      setSimulatorState((prev) => ({ ...prev, isGenerating: false }));
    }
  };

  // =========================================================================
  // STRICT ADMIN ROLE ENFORCEMENT & ZERO-LEAK LOADING GUARD
  // =========================================================================
  if (authLoading) {
    return (
      <div className="min-h-[60vh] bg-stone-950 flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-stone-900 border border-stone-800 text-orange-400 flex items-center justify-center shadow-2xl animate-pulse">
          <Bot className="w-8 h-8" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-xs font-black text-stone-200 flex items-center justify-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-400" />
            <span>AI Calling Agent: सुरक्षित एडमिन प्रमाणीकरण जांच जारी है...</span>
          </p>
          <p className="text-2xs text-stone-500">
            Strictly verifying verified ADMIN role with Firebase Authentication
          </p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <AdminAccessDenied
        onBackToHome={() => onSelectTab?.('landing')}
        onOpenAdminLogin={() => onSelectTab?.('admin_dashboard')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 p-4 md:p-6 lg:p-8 space-y-6">
      {/* ========================================================================= */}
      {/* HEADER & BRAND TELEPHONY BADGE */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-900 to-stone-850 p-5 md:p-6 rounded-3xl border border-stone-800 shadow-2xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20 text-white font-black">
            <Bot className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                HARDINKAAM AI Calling Agent
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-2xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                24x7 Voice AI Engine
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-2xs font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                JioCX Telephony Ready
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-1 flex items-center gap-2">
              <span>डेडीकेटेड बिज़नेस नंबर:</span>
              <strong className="text-amber-300 font-mono">
                {settings?.jioCxConfig?.businessNumber || '+91 62675 46945'}
              </strong>
              <span>| मोड:</span>
              <span className="font-semibold text-stone-300 uppercase">
                {settings?.telephonyProvider || 'MOCK TEST'}
              </span>
            </p>
          </div>
        </div>

        {/* Quick Trigger Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsDirectCallModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/30 transition-all cursor-pointer"
          >
            <PhoneCall className="w-4 h-4" />
            <span>डायरेक्ट कॉल करें (Call Now)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingCampaign({
                name: '',
                targetAudience: 'marketing_leads',
                language: 'hinglish',
                maxAttempts: 3,
                callingHoursStart: '10:00',
                callingHoursEnd: '18:00',
                delayBetweenCallsSeconds: 15,
                maxConcurrentCalls: 2,
                recordingEnabled: true,
                transcriptionEnabled: true,
              });
              setIsCampaignModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-orange-950/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>नया अभियान (New Campaign)</span>
          </button>

          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-all border border-stone-700 cursor-pointer"
            title="रिफ्रेश डेटा"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* NAVIGATION TABS */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-stone-800">
        {[
          { id: 'overview', label: '📊 अवलोकन (Overview)', count: null },
          { id: 'campaigns', label: '🎯 अभियान (Campaigns)', count: campaigns.length },
          { id: 'queue', label: '📋 कॉल कतार (Queue)', count: stats?.pendingQueueCount || queue.length },
          { id: 'simulator', label: '🎙️ लाइव वॉइस सिम्युलेटर (Simulator)', count: null },
          { id: 'scripts', label: '📜 AI स्क्रिप्ट्स (Scripts)', count: scripts.length },
          { id: 'logs', label: '📞 कॉल हिस्ट्री & ट्रांसक्रिप्ट्स (Logs)', count: logs.length },
          { id: 'settings', label: '⚙️ टेलीफोनी & AI सेटिंग्स', count: null },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === tab.id
                ? 'bg-orange-500 text-stone-950 shadow-lg shadow-orange-500/20'
                : 'bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-800'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== null && (
              <span
                className={`px-2 py-0.5 rounded-full text-2xs font-bold ${
                  activeTab === tab.id
                    ? 'bg-stone-950 text-orange-300'
                    : 'bg-stone-800 text-stone-400'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & LIVE METRICS */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Dedicated Calling Overview Real-time Showcase Card */}
          <div
            id="admin-dedicated-calling-overview-card"
            className="bg-gradient-to-r from-stone-900 via-stone-900 to-stone-850 p-6 rounded-3xl border-2 border-orange-500/40 shadow-2xl space-y-5 relative overflow-hidden"
          >
            {/* Header with Real-time Sync Indicator */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-stone-950 flex items-center justify-center font-black shadow-lg shadow-orange-500/30">
                  <Radio className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg md:text-xl font-black text-white tracking-tight">
                      Calling Overview (कॉलिंग ओवरव्यू)
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-2xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Live `ai_call_logs` Stream
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Firestore डेटाबेस से रियल-टाइम गणना: कुल कॉल्स, लाइव कनेक्शन, लीड्स रुचि व टॉक टाइम।
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-2xs font-mono text-stone-400 bg-stone-950 px-3 py-1.5 rounded-xl border border-stone-800">
                  लॉग्स रिकॉर्ड: <strong className="text-amber-300">{computedMetrics.totalCalls}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleDownloadCallingLogsCsv}
                  className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  title="Export filtered ai_call_logs as CSV report"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>CSV डाउनलोड</span>
                </button>
                <button
                  type="button"
                  onClick={fetchData}
                  className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>सिंक</span>
                </button>
              </div>
            </div>

            {/* 4 Featured Core Statistics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Stat 1: Connected */}
              <div className="bg-stone-950/80 p-5 rounded-2xl border border-emerald-500/30 shadow-md flex flex-col justify-between space-y-2 group hover:border-emerald-400 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <PhoneCall className="w-4 h-4 text-emerald-400" />
                    Connected
                  </span>
                  <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                    {computedMetrics.connectionRate}% Rate
                  </span>
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white group-hover:text-emerald-300 transition-colors">
                    {computedMetrics.connected}
                  </h3>
                  <p className="text-2xs text-stone-400 mt-0.5">सफलतापूर्वक कनेक्टेड कॉल्स</p>
                </div>
                <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(5, computedMetrics.connectionRate))}%` }}
                  />
                </div>
              </div>

              {/* Stat 2: Interested */}
              <div className="bg-stone-950/80 p-5 rounded-2xl border border-amber-500/30 shadow-md flex flex-col justify-between space-y-2 group hover:border-amber-400 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Interested
                  </span>
                  <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                    {computedMetrics.conversionRate}% Conv.
                  </span>
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white group-hover:text-amber-300 transition-colors">
                    {computedMetrics.interested}
                  </h3>
                  <p className="text-2xs text-stone-400 mt-0.5">रुचि दिखाई (इच्छुक / कनवर्टेड लीड्स)</p>
                </div>
                <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(5, computedMetrics.conversionRate))}%` }}
                  />
                </div>
              </div>

              {/* Stat 3: Busy */}
              <div className="bg-stone-950/80 p-5 rounded-2xl border border-rose-500/30 shadow-md flex flex-col justify-between space-y-2 group hover:border-rose-400 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <PhoneOff className="w-4 h-4 text-rose-400" />
                    Busy
                  </span>
                  <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
                    Line Busy
                  </span>
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white group-hover:text-rose-300 transition-colors">
                    {computedMetrics.busy}
                  </h3>
                  <p className="text-2xs text-stone-400 mt-0.5">लाइन व्यस्त / पुनः प्रयास आवश्यक</p>
                </div>
                <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-500 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        computedMetrics.totalCalls > 0
                          ? Math.min(100, Math.round((computedMetrics.busy / computedMetrics.totalCalls) * 100))
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Stat 4: Total Minutes */}
              <div className="bg-stone-950/80 p-5 rounded-2xl border border-blue-500/30 shadow-md flex flex-col justify-between space-y-2 group hover:border-blue-400 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-400" />
                    Total Minutes
                  </span>
                  <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                    {computedMetrics.totalSeconds}s Speech
                  </span>
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white group-hover:text-blue-300 transition-colors">
                    {computedMetrics.totalMinutes} <span className="text-sm font-bold text-stone-400">min</span>
                  </h3>
                  <p className="text-2xs text-stone-400 mt-0.5">कुल AI वॉइस कॉल अवधि (Talk Time)</p>
                </div>
                <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full transition-all duration-500 w-full" />
                </div>
              </div>
            </div>

            {/* Secondary Granular Telemetry Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-800/80 flex items-center justify-between">
                <span className="text-2xs text-stone-400 font-bold">No Answer (अनुत्तरित):</span>
                <span className="text-xs font-black text-stone-200">{computedMetrics.noAnswer}</span>
              </div>
              <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-800/80 flex items-center justify-between">
                <span className="text-2xs text-stone-400 font-bold">Follow-ups Scheduled:</span>
                <span className="text-xs font-black text-amber-300">{computedMetrics.followUps}</span>
              </div>
              <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-800/80 flex items-center justify-between">
                <span className="text-2xs text-stone-400 font-bold">Human Transfer:</span>
                <span className="text-xs font-black text-purple-300">{computedMetrics.humanTransfers}</span>
              </div>
              <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-800/80 flex items-center justify-between">
                <span className="text-2xs text-stone-400 font-bold">Not Interested / DNC:</span>
                <span className="text-xs font-black text-rose-300">{computedMetrics.notInterested}</span>
              </div>
            </div>
          </div>

          {/* Quick Action Banner & Campaign Snapshot */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-stone-900/90 p-5 md:p-6 rounded-3xl border border-stone-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Play className="w-5 h-5 text-orange-400" />
                  <h2 className="text-base font-black text-white">सक्रिय AI कॉलिंग अभियान (Active Campaigns)</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('campaigns')}
                  className="text-xs text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>सभी देखें</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {campaigns.filter((c) => c.status === 'active').length === 0 ? (
                <div className="p-8 text-center bg-stone-950/60 rounded-2xl border border-stone-800/80 space-y-3">
                  <Bot className="w-10 h-10 text-stone-600 mx-auto" />
                  <p className="text-sm text-stone-400">वर्तमान में कोई सक्रिय कॉलिंग अभियान नहीं चल रहा है।</p>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCampaign({
                        name: 'भोपाल सर्विसमैन ऑनबोर्डिंग मुहीम',
                        targetAudience: 'marketing_leads',
                        cityFilter: 'Bhopal',
                        tradeFilter: 'Electrician',
                        language: 'hinglish',
                        callingHoursStart: '10:00',
                        callingHoursEnd: '18:00',
                        maxAttempts: 3,
                        delayBetweenCallsSeconds: 15,
                        maxConcurrentCalls: 2,
                        recordingEnabled: true,
                        transcriptionEnabled: true,
                      });
                      setIsCampaignModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>पहला अभियान शुरू करें</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {campaigns
                    .filter((c) => c.status === 'active')
                    .map((camp) => (
                      <div
                        key={camp.id}
                        className="p-4 rounded-2xl bg-stone-950/80 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                            <h4 className="text-sm font-black text-white">{camp.name}</h4>
                            <span className="text-2xs px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 font-bold uppercase">
                              {camp.language}
                            </span>
                          </div>
                          <p className="text-xs text-stone-400 mt-1">
                            ऑडियंस: <strong className="text-amber-300">{camp.cityFilter || 'All India'}</strong> | समय:{' '}
                            {camp.callingHoursStart} - {camp.callingHoursEnd} IST
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleTriggerNextInQueue(camp.id, 2)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                            <span>कॉल बैच चलाएं</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePauseCampaign(camp.id)}
                            className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-400 cursor-pointer"
                            title="पॉज़ करें"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Telephony Connection Box */}
            <div className="bg-stone-900/90 p-5 md:p-6 rounded-3xl border border-stone-800 space-y-4">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-black text-white">टेलीफोनी गेटवे स्थिति</h3>
              </div>

              <div className="p-4 rounded-2xl bg-stone-950/70 border border-stone-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-400">प्रदाता (Provider):</span>
                  <span className="font-bold text-amber-300 uppercase">
                    {settings?.telephonyProvider === 'jiocx' ? 'JioCX Cloud Voice' : 'Mock Telephony Simulator'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-400">बिजनेस नंबर:</span>
                  <span className="font-mono font-bold text-white">
                    {settings?.jioCxConfig?.businessNumber || '+91 62675 46945'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-400">AI मॉडल:</span>
                  <span className="font-bold text-emerald-300 font-mono">
                    {settings?.geminiVoiceConfig?.model || 'gemini-3.8-flash'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-400">कॉलिंग आवर्स:</span>
                  <span className="font-bold text-stone-300">
                    {settings?.globalCallingHours?.start || '10:00'} -{' '}
                    {settings?.globalCallingHours?.end || '18:00'} IST
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('simulator')}
                  className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Headphones className="w-4 h-4" />
                  <span>लाइव टेस्ट सिम्युलेटर खोलें</span>
                </button>
              </div>
            </div>
          </div>

          {/* Recent Call Logs Table Preview */}
          <div className="bg-stone-900/90 p-5 md:p-6 rounded-3xl border border-stone-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PhoneOutgoing className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-black text-white">हालिया कॉल्स (Recent AI Calls)</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('logs')}
                className="text-xs text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>सभी लॉग्स देखें ({logs.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {logs.length === 0 ? (
              <p className="text-xs text-stone-500 py-6 text-center">अभी कोई कॉल लॉग रिकॉर्ड नहीं हुआ है।</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone-800 text-stone-400 uppercase text-2xs">
                      <th className="py-2.5 px-3">कस्टमर / सर्विसमैन</th>
                      <th className="py-2.5 px-3">फोन नंबर</th>
                      <th className="py-2.5 px-3">स्थिति</th>
                      <th className="py-2.5 px-3">परिणाम (Outcome)</th>
                      <th className="py-2.5 px-3">अवधि</th>
                      <th className="py-2.5 px-3">समय</th>
                      <th className="py-2.5 px-3 text-right">विवरण</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60">
                    {logs.slice(0, 5).map((log) => (
                      <tr key={log.id} className="hover:bg-stone-800/40">
                        <td className="py-3 px-3 font-bold text-white">{log.contactName || 'अनजान'}</td>
                        <td className="py-3 px-3 font-mono text-stone-300">{log.phone}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-2xs font-bold ${
                              log.outcome === 'INTERESTED' || log.outcome === 'REGISTRATION_REQUEST'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : log.outcome === 'NOT_INTERESTED'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {log.outcome}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-stone-300">{log.durationSeconds}s</td>
                        <td className="py-3 px-3 text-stone-400">
                          {new Date(log.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedLog(log)}
                            className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-2xs font-bold cursor-pointer"
                          >
                            ट्रांसक्रिप्ट देखें
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CAMPAIGN MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-black text-white">AI कॉलिंग अभियान प्रबंधन</h2>
              <p className="text-xs text-stone-400">
                ऑल-इंडिया या जिला स्तर पर सर्विसमैन ऑनबोर्डिंग व कस्टमर कॉलिंग अभियान चलाएं।
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingCampaign({
                  name: '',
                  targetAudience: 'marketing_leads',
                  language: 'hinglish',
                  maxAttempts: 3,
                  callingHoursStart: '10:00',
                  callingHoursEnd: '18:00',
                  delayBetweenCallsSeconds: 15,
                  maxConcurrentCalls: 2,
                  recordingEnabled: true,
                  transcriptionEnabled: true,
                });
                setIsCampaignModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-orange-950/40"
            >
              <Plus className="w-4 h-4" />
              <span>नया अभियान बनाएं</span>
            </button>
          </div>

          {campaigns.length === 0 ? (
            <div className="p-12 text-center bg-stone-900/60 rounded-3xl border border-stone-800 space-y-4">
              <Bot className="w-12 h-12 text-stone-600 mx-auto" />
              <h3 className="text-base font-bold text-white">कोई अभियान नहीं मिला</h3>
              <p className="text-xs text-stone-400 max-w-md mx-auto">
                सर्विसमैन भर्ती या कस्टमर प्रमोशन के लिए नया AI वॉइस कॉलिंग अभियान बनाएं।
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {campaigns.map((camp) => (
                <div
                  key={camp.id}
                  className="bg-stone-900/90 rounded-3xl border border-stone-800 p-5 space-y-4 shadow-xl relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-2xs font-black uppercase mb-1.5 ${
                          camp.status === 'active'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : camp.status === 'paused'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-stone-800 text-stone-400'
                        }`}
                      >
                        {camp.status}
                      </span>
                      <h3 className="text-base font-black text-white">{camp.name}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCampaign(camp.id)}
                      className="p-1.5 rounded-xl hover:bg-rose-950/40 text-stone-500 hover:text-rose-400 transition-all cursor-pointer"
                      title="डिलीट करें"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-stone-400 line-clamp-2">
                    {camp.description || 'HARDINKAAM AI Voice Outbound Campaign'}
                  </p>

                  <div className="p-3.5 rounded-2xl bg-stone-950/70 border border-stone-800 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-stone-500">भाषा:</span>
                      <span className="font-bold text-stone-300 uppercase">{camp.language}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">कॉलिंग आवर्स:</span>
                      <span className="font-bold text-stone-300">
                        {camp.callingHoursStart} - {camp.callingHoursEnd} IST
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">कुल लीड्स:</span>
                      <span className="font-bold text-amber-300">{camp.totalLeads || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">सफल / कनवर्टेड:</span>
                      <span className="font-bold text-emerald-300">{camp.successfulLeads || 0}</span>
                    </div>
                  </div>

                  {/* Campaign Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-stone-800">
                    {camp.status === 'active' ? (
                      <button
                        type="button"
                        onClick={() => handlePauseCampaign(camp.id)}
                        className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Pause className="w-3.5 h-3.5" />
                        <span>रोकें (Pause)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStartCampaign(camp.id)}
                        className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>शुरू करें (Start)</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setPopulateFilters((prev) => ({ ...prev, campaignId: camp.id }));
                        setIsPopulateModalOpen(true);
                      }}
                      className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                      title="लीड्स जोड़ें"
                    >
                      <Users className="w-3.5 h-3.5 text-amber-300" />
                      <span>लीड्स जोड़ें</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CALL QUEUE & REUSING MARKETING LEADS */}
      {/* ========================================================================= */}
      {activeTab === 'queue' && (
        <div className="space-y-6">
          {/* Dedicated Call Queue Visual Summary Showcase Card */}
          <div
            id="admin-call-queue-visual-summary-card"
            className="bg-gradient-to-r from-stone-900 via-stone-900 to-stone-850 p-6 rounded-3xl border-2 border-emerald-500/40 shadow-2xl space-y-5 relative overflow-hidden"
          >
            {/* Summary Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-black shadow-lg shadow-emerald-500/30">
                  <Layers className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg md:text-xl font-black text-white tracking-tight">
                      Call Queue Visual Summary (कॉल कतार विज़ुअल सारांश)
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-2xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Live `ai_call_queue` Stream
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">
                    मार्केटिंग लीड्स डेटाबेस से चुनी गई लीड्स का लाइव स्टेटस वर्गीकरण (Categorized Queue Telemetry)।
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsPopulateModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>लीड्स इम्पोर्ट करें</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTriggerNextInQueue(undefined, 3)}
                  disabled={actionLoading || queueStatusSummary.pending === 0}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>अगली 3 कॉल्स डायल करें</span>
                </button>
              </div>
            </div>

            {/* Categorized Queue Status Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Category 1: Pending */}
              <div
                onClick={() => setQueueFilterStatus(queueFilterStatus === 'PENDING' ? 'ALL' : 'PENDING')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                  queueFilterStatus === 'PENDING'
                    ? 'bg-amber-950/60 border-amber-400 ring-2 ring-amber-400/30'
                    : 'bg-stone-950/80 border-amber-500/20 hover:border-amber-400/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xs font-bold text-amber-400 uppercase flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Pending
                  </span>
                  <span className="text-2xs font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                    {queueStatusSummary.pendingPercent}%
                  </span>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white">{queueStatusSummary.pending}</h3>
                  <p className="text-2xs text-stone-400 mt-0.5">प्रतीक्षारत लीड्स</p>
                </div>
              </div>

              {/* Category 2: Calling */}
              <div
                onClick={() => setQueueFilterStatus(queueFilterStatus === 'CALLING' ? 'ALL' : 'CALLING')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                  queueFilterStatus === 'CALLING'
                    ? 'bg-blue-950/60 border-blue-400 ring-2 ring-blue-400/30'
                    : 'bg-stone-950/80 border-blue-500/20 hover:border-blue-400/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xs font-bold text-blue-400 uppercase flex items-center gap-1">
                    <Radio className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                    Calling
                  </span>
                  <span className="text-2xs font-bold px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                    Active
                  </span>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white">{queueStatusSummary.calling}</h3>
                  <p className="text-2xs text-stone-400 mt-0.5">लाइव डायलिंग जारी</p>
                </div>
              </div>

              {/* Category 3: Connected */}
              <div
                onClick={() => setQueueFilterStatus(queueFilterStatus === 'CONNECTED' ? 'ALL' : 'CONNECTED')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                  queueFilterStatus === 'CONNECTED'
                    ? 'bg-emerald-950/60 border-emerald-400 ring-2 ring-emerald-400/30'
                    : 'bg-stone-950/80 border-emerald-500/20 hover:border-emerald-400/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xs font-bold text-emerald-400 uppercase flex items-center gap-1">
                    <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                    Connected
                  </span>
                  <span className="text-2xs font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                    {queueStatusSummary.connectedPercent}%
                  </span>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white">{queueStatusSummary.connected}</h3>
                  <p className="text-2xs text-stone-400 mt-0.5">सफल कनेक्टेड</p>
                </div>
              </div>

              {/* Category 4: Human Transfer Requested */}
              <div
                onClick={() =>
                  setQueueFilterStatus(queueFilterStatus === 'HUMAN_TRANSFER' ? 'ALL' : 'HUMAN_TRANSFER')
                }
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                  queueFilterStatus === 'HUMAN_TRANSFER'
                    ? 'bg-purple-950/60 border-purple-400 ring-2 ring-purple-400/30'
                    : 'bg-stone-950/80 border-purple-500/20 hover:border-purple-400/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xs font-bold text-purple-400 uppercase flex items-center gap-1">
                    <Headphones className="w-3.5 h-3.5 text-purple-400" />
                    Transfer
                  </span>
                  <span className="text-2xs font-bold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                    Agent Req.
                  </span>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white">{queueStatusSummary.humanTransfer}</h3>
                  <p className="text-2xs text-stone-400 mt-0.5">ह्यूमन ट्रांसफर रिक्वेस्ट</p>
                </div>
              </div>

              {/* Category 5: Follow-up / Call Later */}
              <div
                onClick={() => setQueueFilterStatus(queueFilterStatus === 'FOLLOW_UP' ? 'ALL' : 'FOLLOW_UP')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                  queueFilterStatus === 'FOLLOW_UP'
                    ? 'bg-orange-950/60 border-orange-400 ring-2 ring-orange-400/30'
                    : 'bg-stone-950/80 border-orange-500/20 hover:border-orange-400/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xs font-bold text-orange-400 uppercase flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-orange-400" />
                    Follow-up
                  </span>
                  <span className="text-2xs font-bold px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300">
                    Call Later
                  </span>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white">{queueStatusSummary.followUp}</h3>
                  <p className="text-2xs text-stone-400 mt-0.5">फॉलो-अप शेड्यूल</p>
                </div>
              </div>

              {/* Category 6: Failed / Busy / DNC */}
              <div
                onClick={() => setQueueFilterStatus(queueFilterStatus === 'FAILED' ? 'ALL' : 'FAILED')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                  queueFilterStatus === 'FAILED'
                    ? 'bg-rose-950/60 border-rose-400 ring-2 ring-rose-400/30'
                    : 'bg-stone-950/80 border-rose-500/20 hover:border-rose-400/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xs font-bold text-rose-400 uppercase flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    Failed / DNC
                  </span>
                  <span className="text-2xs font-bold px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
                    Retry / Block
                  </span>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white">
                    {queueStatusSummary.failed + queueStatusSummary.doNotCall}
                  </h3>
                  <p className="text-2xs text-stone-400 mt-0.5">व्यस्त / विफल / DNC</p>
                </div>
              </div>
            </div>

            {/* Visual Multi-Segment Distribution Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-2xs font-bold text-stone-400">
                <span>कतार स्थिति वितरण (Queue Distribution)</span>
                <span>कुल कतारबद्ध: <strong className="text-white">{queueStatusSummary.total} Leads</strong></span>
              </div>
              <div className="w-full h-3 rounded-full bg-stone-950 overflow-hidden flex border border-stone-800">
                {queueStatusSummary.total === 0 ? (
                  <div className="w-full h-full bg-stone-800" />
                ) : (
                  <>
                    <div
                      style={{ width: `${(queueStatusSummary.pending / queueStatusSummary.total) * 100}%` }}
                      className="h-full bg-amber-500 transition-all duration-500"
                      title={`Pending: ${queueStatusSummary.pending}`}
                    />
                    <div
                      style={{ width: `${(queueStatusSummary.calling / queueStatusSummary.total) * 100}%` }}
                      className="h-full bg-blue-500 transition-all duration-500 animate-pulse"
                      title={`Calling: ${queueStatusSummary.calling}`}
                    />
                    <div
                      style={{ width: `${(queueStatusSummary.connected / queueStatusSummary.total) * 100}%` }}
                      className="h-full bg-emerald-500 transition-all duration-500"
                      title={`Connected: ${queueStatusSummary.connected}`}
                    />
                    <div
                      style={{
                        width: `${(queueStatusSummary.humanTransfer / queueStatusSummary.total) * 100}%`,
                      }}
                      className="h-full bg-purple-500 transition-all duration-500"
                      title={`Human Transfer: ${queueStatusSummary.humanTransfer}`}
                    />
                    <div
                      style={{ width: `${(queueStatusSummary.followUp / queueStatusSummary.total) * 100}%` }}
                      className="h-full bg-orange-500 transition-all duration-500"
                      title={`Follow-up: ${queueStatusSummary.followUp}`}
                    />
                    <div
                      style={{
                        width: `${
                          ((queueStatusSummary.failed + queueStatusSummary.doNotCall) /
                            queueStatusSummary.total) *
                          100
                        }%`,
                      }}
                      className="h-full bg-rose-500 transition-all duration-500"
                      title={`Failed/DNC: ${queueStatusSummary.failed + queueStatusSummary.doNotCall}`}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Interactive Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-stone-800">
              <span className="text-2xs font-bold text-stone-400 whitespace-nowrap mr-1">फ़िल्टर:</span>
              {[
                { id: 'ALL', label: `सभी (${queue.length})` },
                { id: 'PENDING', label: `🟡 Pending (${queueStatusSummary.pending})` },
                { id: 'CALLING', label: `🔵 Calling (${queueStatusSummary.calling})` },
                { id: 'CONNECTED', label: `🟢 Connected (${queueStatusSummary.connected})` },
                { id: 'HUMAN_TRANSFER', label: `🟣 Human Transfer (${queueStatusSummary.humanTransfer})` },
                { id: 'FOLLOW_UP', label: `🟠 Follow-up (${queueStatusSummary.followUp})` },
                { id: 'COMPLETED', label: `✅ Completed (${queueStatusSummary.completed})` },
                { id: 'FAILED', label: `🔴 Failed / Busy (${queueStatusSummary.failed})` },
                { id: 'DO_NOT_CALL', label: `⛔ DNC (${queueStatusSummary.doNotCall})` },
              ].map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setQueueFilterStatus(chip.id)}
                  className={`px-3 py-1 rounded-xl text-2xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                    queueFilterStatus === chip.id
                      ? 'bg-orange-500 text-stone-950 border-orange-400 shadow-sm'
                      : 'bg-stone-950 hover:bg-stone-800 text-stone-300 border-stone-800'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Queue Leads Table */}
          {filteredQueue.length === 0 ? (
            <div className="p-12 text-center bg-stone-900/60 rounded-3xl border border-stone-800 space-y-4">
              <PhoneOff className="w-12 h-12 text-stone-600 mx-auto" />
              <h3 className="text-base font-bold text-white">
                {queueFilterStatus === 'ALL'
                  ? 'कॉल कतार खाली है'
                  : `इस फ़िल्टर (${queueFilterStatus}) में कोई लीड नहीं है`}
              </h3>
              <p className="text-xs text-stone-400 max-w-md mx-auto">
                मार्केटिंग लीड्स से लीड्स इम्पोर्ट करें या फ़िल्टर बदलकर सभी रिकॉर्ड्स देखें।
              </p>
            </div>
          ) : (
            <div className="bg-stone-900/90 rounded-3xl border border-stone-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone-800 text-stone-400 uppercase text-2xs bg-stone-950/60">
                      <th className="py-3 px-4">नाम / फर्म</th>
                      <th className="py-3 px-4">फोन नंबर</th>
                      <th className="py-3 px-4">ट्रेड / पेशा</th>
                      <th className="py-3 px-4">शहर / ज़िला</th>
                      <th className="py-3 px-4">अभियान</th>
                      <th className="py-3 px-4">स्थिति (State)</th>
                      <th className="py-3 px-4">प्रयास (Attempts)</th>
                      <th className="py-3 px-4 text-right">कार्रवाई</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60">
                    {filteredQueue.map((item) => (
                      <tr key={item.id} className="hover:bg-stone-800/40">
                        <td className="py-3.5 px-4 font-bold text-white">{item.contactName}</td>
                        <td className="py-3.5 px-4 font-mono text-amber-300">{item.phone}</td>
                        <td className="py-3.5 px-4 text-stone-300">{item.trade || 'सर्विसमैन'}</td>
                        <td className="py-3.5 px-4 text-stone-300">{item.city || 'Bhopal'}</td>
                        <td className="py-3.5 px-4 text-stone-400 text-2xs">{item.campaignName}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-2xs font-bold inline-flex items-center gap-1 ${
                              item.status === 'PENDING' || item.status === 'QUEUED'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : item.status === 'CALLING'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 animate-pulse'
                                : item.status === 'CONNECTED'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : item.status === 'HUMAN_TRANSFER'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : item.status === 'FOLLOW_UP'
                                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                                : item.status === 'COMPLETED'
                                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {item.status === 'CALLING' && (
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                            )}
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-stone-400">
                          {item.attemptCount || 0} / {item.maxAttempts || 3}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setDirectCallData({
                                phone: item.phone,
                                contactName: item.contactName,
                                trade: item.trade || 'सर्विसमैन',
                                city: item.city || 'Bhopal',
                                scriptId: '',
                              });
                              setIsDirectCallModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-2xs font-bold cursor-pointer transition-all"
                          >
                            डायल करें
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: INTERACTIVE VOICE SIMULATOR (Browser Live Test Call) */}
      {/* ========================================================================= */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel: Target Contact & Script Config */}
          <div className="bg-stone-900/90 p-5 md:p-6 rounded-3xl border border-stone-800 space-y-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-black text-white">सिम्युलेटर सेटिंग्स</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-400 font-bold mb-1">लीड का नाम:</label>
                <input
                  type="text"
                  value={simulatorState.leadName}
                  onChange={(e) => setSimulatorState((prev) => ({ ...prev, leadName: e.target.value }))}
                  disabled={simulatorState.isActive}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-white font-medium focus:border-orange-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-stone-400 font-bold mb-1">ट्रेड / पेशा:</label>
                <input
                  type="text"
                  value={simulatorState.trade}
                  onChange={(e) => setSimulatorState((prev) => ({ ...prev, trade: e.target.value }))}
                  disabled={simulatorState.isActive}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-white font-medium focus:border-orange-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-stone-400 font-bold mb-1">शहर (City):</label>
                <input
                  type="text"
                  value={simulatorState.city}
                  onChange={(e) => setSimulatorState((prev) => ({ ...prev, city: e.target.value }))}
                  disabled={simulatorState.isActive}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-white font-medium focus:border-orange-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-stone-400 font-bold mb-1">कॉलिंग स्क्रिप्ट टेम्पलेट:</label>
                <select
                  onChange={(e) => {
                    const s = scripts.find((x) => x.id === e.target.value);
                    if (s) {
                      setSimulatorState((prev) => ({
                        ...prev,
                        scriptPrompt: s.systemPrompt,
                        language: s.language,
                      }));
                    }
                  }}
                  disabled={simulatorState.isActive}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-200 text-xs focus:border-orange-500 outline-none"
                >
                  {scripts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.language})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-stone-400 font-bold mb-1">AI सिस्टम प्रॉम्प्ट:</label>
                <textarea
                  rows={4}
                  value={simulatorState.scriptPrompt}
                  onChange={(e) => setSimulatorState((prev) => ({ ...prev, scriptPrompt: e.target.value }))}
                  disabled={simulatorState.isActive}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-200 text-xs focus:border-orange-500 outline-none"
                />
              </div>
            </div>

            {/* Start / Stop Call Button */}
            <div className="pt-2">
              {!simulatorState.isActive ? (
                <button
                  type="button"
                  onClick={startSimulatorCall}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
                >
                  <PhoneCall className="w-5 h-5 animate-bounce" />
                  <span>टेस्ट कॉल शुरू करें (Start Test Call)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={endSimulatorCall}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-950/40 transition-all cursor-pointer"
                >
                  <PhoneOff className="w-5 h-5" />
                  <span>कॉल समाप्त करें (End Call)</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Panel: Live Voice Call Interactive Stage */}
          <div className="lg:col-span-2 bg-stone-900/90 rounded-3xl border border-stone-800 flex flex-col h-[650px] shadow-2xl overflow-hidden">
            {/* Call Header */}
            <div className="p-4 bg-stone-950/80 border-b border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                    simulatorState.isActive
                      ? 'bg-emerald-500 text-stone-950 animate-pulse'
                      : 'bg-stone-800 text-stone-400'
                  }`}
                >
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">{simulatorState.leadName}</h4>
                  <p className="text-2xs text-stone-400">
                    {simulatorState.trade} | {simulatorState.city}
                  </p>
                </div>
              </div>

              {simulatorState.isActive && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>
                      {Math.floor(simulatorState.callDurationSeconds / 60)
                        .toString()
                        .padStart(2, '0')}
                      :{(simulatorState.callDurationSeconds % 60).toString().padStart(2, '0')}
                    </span>
                  </div>

                  {simulatorState.detectedIntent && (
                    <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-2xs font-bold">
                      इरादा: {simulatorState.detectedIntent}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Conversation Stream */}
            <div className="flex-1 p-4 md:p-5 overflow-y-auto space-y-3">
              {simulatorState.history.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-stone-500 space-y-3">
                  <Bot className="w-12 h-12 text-stone-700 animate-pulse" />
                  <p className="text-sm">
                    सिम्युलेटर टेस्ट कॉल शुरू करने के लिए बाईं ओर 'टेस्ट कॉल शुरू करें' बटन पर क्लिक करें।
                  </p>
                </div>
              ) : (
                simulatorState.history.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${
                      msg.role === 'system'
                        ? 'justify-center'
                        : msg.role === 'customer'
                        ? 'justify-end'
                        : 'justify-start'
                    }`}
                  >
                    {msg.role === 'system' ? (
                      <div className="px-3 py-1 rounded-full bg-stone-950 text-stone-400 text-2xs border border-stone-800">
                        {msg.text}
                      </div>
                    ) : (
                      <div
                        className={`max-w-[80%] rounded-2xl p-3.5 space-y-1 ${
                          msg.role === 'customer'
                            ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-br-none'
                            : 'bg-stone-800 text-stone-100 rounded-bl-none border border-stone-700'
                        }`}
                      >
                        <div className="flex items-center justify-between text-2xs opacity-75 gap-4">
                          <span className="font-bold uppercase">
                            {msg.role === 'customer' ? `कस्टमर (${simulatorState.leadName})` : 'HARDINKAAM AI Agent'}
                          </span>
                          <span>{msg.timestamp}</span>
                        </div>
                        <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    )}
                  </div>
                ))
              )}

              {simulatorState.isGenerating && (
                <div className="flex justify-start">
                  <div className="bg-stone-800 text-stone-300 rounded-2xl rounded-bl-none p-3 text-xs flex items-center gap-2 border border-stone-700">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span>AI वॉइस एजेंट बोल रहा है...</span>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Quick Customer Response Chips & Input Bar */}
            {simulatorState.isActive && (
              <div className="p-3 bg-stone-950/90 border-t border-stone-800 space-y-2.5">
                {/* Simulated Customer Reactions */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  <span className="text-2xs text-stone-500 font-bold whitespace-nowrap">सुझाव:</span>
                  {[
                    'हाँ मैं इलेक्ट्रीशियन का काम करता हूँ, क्या ऑफर है?',
                    'कमीशन कितना लगेगा?',
                    'अभी व्यस्त हूँ, कल सुबह 11 बजे कॉल करें।',
                    'मुझे इंटरेस्ट नहीं है, नंबर हटा दो।',
                    'रजिस्ट्रेशन कैसे होगा?',
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => sendSimulatorUserReply(chip)}
                      className="px-2.5 py-1 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 text-2xs whitespace-nowrap border border-stone-800 hover:border-amber-500/40 cursor-pointer"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Text Message Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="कस्टमर की तरफ से बोलें या टाइप करें..."
                    value={simulatorState.currentInput}
                    onChange={(e) => setSimulatorState((prev) => ({ ...prev, currentInput: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') sendSimulatorUserReply();
                    }}
                    className="flex-1 px-4 py-2.5 rounded-2xl bg-stone-900 border border-stone-800 text-white text-xs focus:border-orange-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => sendSimulatorUserReply()}
                    disabled={!simulatorState.currentInput.trim() || simulatorState.isGenerating}
                    className="p-2.5 rounded-2xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white transition-all cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: AI SCRIPTS BUILDER */}
      {/* ========================================================================= */}
      {activeTab === 'scripts' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-black text-white">AI कॉलिंग स्क्रिप्ट्स & प्रॉम्प्ट्स</h2>
              <p className="text-xs text-stone-400">
                अलग-अलग परिदृश्यों (भर्ती, डिस्काउंट, री-एंगेजमेंट) के लिए AI वॉइस कॉलिंग गाइडलाइन्स बनाएं।
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingScript({
                  name: '',
                  category: 'recruitment',
                  language: 'hinglish',
                  openingGreeting: 'नमस्ते!',
                  objective: '',
                  systemPrompt: '',
                  keyTalkingPoints: [],
                  faqResponses: [],
                  objectionHandling: [],
                  closingRemark: 'धन्यवाद!',
                });
                setIsScriptModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>नई स्क्रिप्ट बनाएं</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {scripts.map((sc) => (
              <div
                key={sc.id}
                className="bg-stone-900/90 rounded-3xl border border-stone-800 p-5 space-y-4 shadow-xl flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 uppercase">
                        {sc.category} | {sc.language}
                      </span>
                      <h3 className="text-base font-black text-white mt-1">{sc.name}</h3>
                    </div>
                  </div>

                  <p className="text-xs text-stone-300 italic">"{sc.openingGreeting}"</p>

                  <div className="p-3 rounded-2xl bg-stone-950/70 border border-stone-800 space-y-2 text-xs">
                    <p className="text-stone-400">
                      <strong>उद्देश्य:</strong> {sc.objective || 'सर्विसमैन भर्ती'}
                    </p>
                    {sc.keyTalkingPoints && sc.keyTalkingPoints.length > 0 && (
                      <div>
                        <strong className="text-stone-400">मुख्य बिंदु:</strong>
                        <ul className="list-disc list-inside text-stone-300 text-2xs mt-1 space-y-0.5">
                          {sc.keyTalkingPoints.slice(0, 3).map((pt, idx) => (
                            <li key={idx}>{pt}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 pt-3 border-t border-stone-800">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingScript(sc);
                      setIsScriptModalOpen(true);
                    }}
                    className="flex-1 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-2xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>एडिट</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTestTtsAudio(sc.openingGreeting || 'नमस्ते!')}
                    className="py-2 px-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-2xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                    title="TTS ऑडियो प्रीव्यू सुनें"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSimulatorState((prev) => ({
                        ...prev,
                        scriptPrompt: sc.systemPrompt,
                        language: sc.language,
                      }));
                      setActiveTab('simulator');
                    }}
                    className="py-2 px-2.5 rounded-xl bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border border-orange-500/30 text-2xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                    title="सिम्युलेटर में टेस्ट करें"
                  >
                    <Headphones className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteScript(sc.id)}
                    className="py-2 px-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-2xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                    title="स्क्रिप्ट हटाएं (Delete)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: CALL LOGS & DETAILED TRANSCRIPTS */}
      {/* ========================================================================= */}
      {activeTab === 'logs' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-black text-white">कॉल इतिहास & ट्रांसक्रिप्ट्स (Call History Logs)</h2>
              <p className="text-xs text-stone-400">
                AI द्वारा की गई सभी आउटबाउंड व इनबाउंड कॉल्स की विस्तृत रिकॉर्डिंग, ट्रांसक्रिप्ट व सारांश।
              </p>
            </div>
            <button
              type="button"
              onClick={fetchData}
              className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>रिफ्रेश</span>
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="p-12 text-center bg-stone-900/60 rounded-3xl border border-stone-800 space-y-4">
              <PhoneOff className="w-12 h-12 text-stone-600 mx-auto" />
              <h3 className="text-base font-bold text-white">कोई कॉल लॉग उपलब्ध नहीं है</h3>
            </div>
          ) : (
            <div className="bg-stone-900/90 rounded-3xl border border-stone-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone-800 text-stone-400 uppercase text-2xs bg-stone-950/60">
                      <th className="py-3 px-4">नाम</th>
                      <th className="py-3 px-4">फोन नंबर</th>
                      <th className="py-3 px-4">प्रदाता</th>
                      <th className="py-3 px-4">दिशा</th>
                      <th className="py-3 px-4">स्थिति</th>
                      <th className="py-3 px-4">परिणाम (Outcome)</th>
                      <th className="py-3 px-4">अवधि</th>
                      <th className="py-3 px-4">तारीख व समय</th>
                      <th className="py-3 px-4 text-right">कार्रवाई</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-stone-800/40">
                        <td className="py-3.5 px-4 font-bold text-white">{log.contactName || 'अज्ञात'}</td>
                        <td className="py-3.5 px-4 font-mono text-amber-300">{log.phone}</td>
                        <td className="py-3.5 px-4 uppercase text-2xs text-stone-400">{log.provider}</td>
                        <td className="py-3.5 px-4">
                          <span className="text-2xs font-bold text-stone-300">
                            {log.direction === 'outbound' ? 'आउटबाउंड ↗' : 'इनबाउंड ↙'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-emerald-500/20 text-emerald-300">
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-2xs font-bold ${
                              log.outcome === 'INTERESTED' || log.outcome === 'REGISTRATION_REQUEST'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : log.outcome === 'NOT_INTERESTED'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {log.outcome}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-stone-300">{log.durationSeconds}s</td>
                        <td className="py-3.5 px-4 text-stone-400">
                          {new Date(log.startedAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedLog(log)}
                            className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-orange-300 text-xs font-bold cursor-pointer"
                          >
                            ट्रांसक्रिप्ट देखें
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: TELEPHONY & VOICE SETTINGS */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && settings && (
        <form onSubmit={handleSaveSettings} className="space-y-6 max-w-4xl">
          <div className="bg-stone-900/90 rounded-3xl border border-stone-800 p-5 md:p-6 space-y-5 shadow-xl">
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-orange-400" />
              <h3 className="text-base font-black text-white">JioCX Cloud Telephony & Number Integration</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-stone-400 font-bold mb-1">टेलीफोनी मोड:</label>
                <select
                  value={settings.telephonyProvider}
                  onChange={(e) =>
                    setSettings({ ...settings, telephonyProvider: e.target.value as any })
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-white font-bold outline-none"
                >
                  <option value="mock">MOCK TELEPHONY (सुरक्षित टेस्ट मोड - ज़ीरो शुल्क)</option>
                  <option value="jiocx">JIOCX TELEPHONY (लाइव टेलीफोनी - Jio Business SIM)</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-400 font-bold mb-1">HARDINKAAM बिजनेस नंबर:</label>
                <input
                  type="text"
                  value={settings.jioCxConfig.businessNumber}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      jioCxConfig: { ...settings.jioCxConfig, businessNumber: e.target.value },
                    })
                  }
                  placeholder="+916267546945"
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-amber-300 font-mono font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-stone-400 font-bold mb-1">JioCX Account ID / Project:</label>
                <input
                  type="text"
                  value={settings.jioCxConfig.accountId}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      jioCxConfig: { ...settings.jioCxConfig, accountId: e.target.value },
                    })
                  }
                  placeholder="e.g. jiocx_acc_hardinkaam_mp"
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-white font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-stone-400 font-bold mb-1">JioCX API Key:</label>
                <input
                  type="password"
                  value={settings.jioCxConfig.apiKey}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      jioCxConfig: { ...settings.jioCxConfig, apiKey: e.target.value },
                    })
                  }
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-white font-mono outline-none"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 text-xs space-y-1">
              <span className="text-stone-400 font-bold">JioCX Webhook Endpoint URL (Set in JioCX Portal):</span>
              <p className="font-mono text-emerald-400 text-2xs select-all">
                https://hardinkaam.online/api/ai-calling/webhook/jiocx
              </p>
            </div>
          </div>

          {/* Gemini 3.8 Flash AI Engine & Diagnostics */}
          <div className="bg-stone-900/90 rounded-3xl border border-stone-800 p-5 md:p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-400" />
                <h3 className="text-base font-black text-white">Gemini 3.8 Flash AI वॉयस इंजन (Production AI Configuration)</h3>
              </div>
              <span className="px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 font-mono font-bold text-xs border border-violet-500/30">
                gemini-3.8-flash
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-stone-400 font-bold mb-1">एक्टिव AI मॉडल (Canonical Model):</label>
                <input
                  type="text"
                  readOnly
                  value="gemini-3.8-flash"
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-emerald-300 font-mono font-bold outline-none cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-stone-400 font-bold mb-1">वॉयस पर्सोना (Voice Persona):</label>
                <select
                  value={settings.geminiVoiceConfig?.voiceName || 'Puck'}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      geminiVoiceConfig: {
                        ...settings.geminiVoiceConfig,
                        model: 'gemini-3.8-flash',
                        voiceName: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-amber-300 font-bold outline-none"
                >
                  <option value="Puck">Puck (उत्साही व स्पष्ट - हिंदी/इंग्लिश)</option>
                  <option value="Zephyr">Zephyr (शांत व गंभीर - कस्टमर केयर)</option>
                  <option value="Kore">Kore (मधुर व विनम्र - महिला स्वर)</option>
                  <option value="Charon">Charon (गहरा व आधिकारिक)</option>
                  <option value="Fenrir">Fenrir (स्पष्ट व प्रभावशाली)</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-400 font-bold mb-1">थिंकिंग लेवल (Thinking Level):</label>
                <select
                  value={settings.geminiVoiceConfig?.thinkingLevel || 'low'}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      geminiVoiceConfig: {
                        ...settings.geminiVoiceConfig,
                        model: 'gemini-3.8-flash',
                        thinkingLevel: e.target.value as any,
                      },
                    })
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-violet-300 font-bold outline-none"
                >
                  <option value="low">Low (फास्ट रिस्पॉन्स &lt;1s - वॉयस कॉलिंग अनुकूल)</option>
                  <option value="medium">Medium (संतुलित विश्लेषण)</option>
                  <option value="high">High (गहन परामर्श व बहु-चरणीय तर्क)</option>
                </select>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-stone-950/70 border border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-stone-300 font-bold">AI सर्विस स्टेटस:</span>
                <span className="text-emerald-400 font-mono">ONLINE (SDK @google/genai ^2.4.0)</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span className="text-stone-300 font-bold">कोटा सुरक्षा:</span>
                <span className="text-cyan-400 font-mono">Spark-Protected & Throttled</span>
              </div>
            </div>
          </div>

          {/* Calling Hours & Safety Controls */}
          <div className="bg-stone-900/90 rounded-3xl border border-stone-800 p-5 md:p-6 space-y-5 shadow-xl">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-black text-white">कॉलिंग आवर्स & सुरक्षा सीमाएं (Compliance & Safety)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-stone-400 font-bold mb-1">शुरुआती समय (Start Time IST):</label>
                <input
                  type="time"
                  value={settings.globalCallingHours.start}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      globalCallingHours: { ...settings.globalCallingHours, start: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-white font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-stone-400 font-bold mb-1">समाप्ति समय (End Time IST):</label>
                <input
                  type="time"
                  value={settings.globalCallingHours.end}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      globalCallingHours: { ...settings.globalCallingHours, end: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-white font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-stone-400 font-bold mb-1">प्रति लीड अधिकतम प्रयास:</label>
                <input
                  type="number"
                  value={settings.safetyLimits.maxAttemptsPerLead}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      safetyLimits: { ...settings.safetyLimits, maxAttemptsPerLead: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-white font-bold outline-none"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={actionLoading}
            className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>सेटिंग्स सुरक्षित करें (Save Telephony Settings)</span>
          </button>
        </form>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DIRECT CALL NOW */}
      {/* ========================================================================= */}
      {isDirectCallModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-black text-white">डायरेक्ट आउटबाउंड कॉल करें</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDirectCallModalOpen(false)}
                className="p-1 rounded-xl text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDirectCallNow} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-400 font-bold mb-1">फोन नंबर (10 डिजिट या +91):</label>
                <input
                  type="text"
                  required
                  value={directCallData.phone}
                  onChange={(e) => setDirectCallData({ ...directCallData, phone: e.target.value })}
                  placeholder="+91 98260 00000"
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-white font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-stone-400 font-bold mb-1">कस्टमर / सर्विसमैन का नाम:</label>
                <input
                  type="text"
                  value={directCallData.contactName}
                  onChange={(e) => setDirectCallData({ ...directCallData, contactName: e.target.value })}
                  placeholder="दीपक जी"
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-stone-400 font-bold mb-1">ट्रेड / पेशा:</label>
                <input
                  type="text"
                  value={directCallData.trade}
                  onChange={(e) => setDirectCallData({ ...directCallData, trade: e.target.value })}
                  placeholder="इलेक्ट्रीशियन / प्लंबर"
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-white outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                >
                  <Phone className="w-4 h-4" />
                  <span>तुरंत डायल करें</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: POPULATE QUEUE FROM MARKETING LEADS */}
      {/* ========================================================================= */}
      {isPopulateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-white">मार्केटिंग लीड्स से कतार भरें</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPopulateModalOpen(false)}
                className="p-1 rounded-xl text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePopulateQueue} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-400 font-bold mb-1">टारगेट अभियान:</label>
                <select
                  required
                  value={populateFilters.campaignId}
                  onChange={(e) => setPopulateFilters({ ...populateFilters, campaignId: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-white font-bold outline-none"
                >
                  <option value="">-- अभियान चुनें --</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.cityFilter || 'All India'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-stone-400 font-bold mb-1">शहर / जिला फ़िल्टर:</label>
                <input
                  type="text"
                  value={populateFilters.cityFilter}
                  onChange={(e) => setPopulateFilters({ ...populateFilters, cityFilter: e.target.value })}
                  placeholder="e.g. Bhopal, Indore, Gwalior"
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-stone-400 font-bold mb-1">ट्रेड फ़िल्टर (वैकल्पिक):</label>
                <input
                  type="text"
                  value={populateFilters.tradeFilter}
                  onChange={(e) => setPopulateFilters({ ...populateFilters, tradeFilter: e.target.value })}
                  placeholder="e.g. Electrician, Plumber, Painter"
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-stone-400 font-bold mb-1">अधिकतम लीड्स संख्या:</label>
                <input
                  type="number"
                  value={populateFilters.limitCount}
                  onChange={(e) => setPopulateFilters({ ...populateFilters, limitCount: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-white font-bold outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                >
                  <Users className="w-4 h-4" />
                  <span>लीड्स कतार में जोड़ें</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CAMPAIGN CREATE/EDIT */}
      {/* ========================================================================= */}
      {isCampaignModalOpen && editingCampaign && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-orange-400" />
                <h3 className="text-base font-black text-white">AI कॉलिंग अभियान बनाएं</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCampaignModalOpen(false)}
                className="p-1 rounded-xl text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCampaign} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-400 font-bold mb-1">अभियान का नाम:</label>
                <input
                  type="text"
                  required
                  value={editingCampaign.name || ''}
                  onChange={(e) => setEditingCampaign({ ...editingCampaign, name: e.target.value })}
                  placeholder="e.g. भोपाल सर्विसमैन भर्ती मुहीम"
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-white outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-400 font-bold mb-1">भाषा (Language):</label>
                  <select
                    value={editingCampaign.language || 'hinglish'}
                    onChange={(e) => setEditingCampaign({ ...editingCampaign, language: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-white outline-none"
                  >
                    <option value="hinglish">Hinglish (हिंदी + इंग्लिश मिक्स)</option>
                    <option value="hi">हिंदी (शुद्ध हिंदी)</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-400 font-bold mb-1">टारगेट शहर:</label>
                  <input
                    type="text"
                    value={editingCampaign.cityFilter || 'Bhopal'}
                    onChange={(e) => setEditingCampaign({ ...editingCampaign, cityFilter: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-400 font-bold mb-1">कॉलिंग शुरू समय:</label>
                  <input
                    type="time"
                    value={editingCampaign.callingHoursStart || '10:00'}
                    onChange={(e) => setEditingCampaign({ ...editingCampaign, callingHoursStart: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-white outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-stone-400 font-bold mb-1">कॉलिंग समाप्ति समय:</label>
                  <input
                    type="time"
                    value={editingCampaign.callingHoursEnd || '18:00'}
                    onChange={(e) => setEditingCampaign({ ...editingCampaign, callingHoursEnd: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-white outline-none font-bold"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-3 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                >
                  <Save className="w-4 h-4" />
                  <span>अभियान सहेजें</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CALL LOG TRANSCRIPT DETAIL */}
      {/* ========================================================================= */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white">{selectedLog.contactName}</h3>
                <p className="text-2xs text-stone-400 font-mono">
                  {selectedLog.phone} | कॉल आईडी: {selectedLog.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-xl text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Structured Summary & Sentiment */}
            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-stone-400 font-bold">AI सारांश:</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-2xs font-bold ${
                    selectedLog.sentiment === 'positive'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-stone-800 text-stone-300'
                  }`}
                >
                  सेंटीमेंट: {selectedLog.sentiment || 'neutral'}
                </span>
              </div>
              <p className="text-stone-200">{selectedLog.summary || 'कोई सारांश दर्ज नहीं है।'}</p>
              {selectedLog.nextAction && (
                <p className="text-amber-300 text-2xs font-semibold">
                  ⚡ अगला कदम: {selectedLog.nextAction}
                </p>
              )}
            </div>

            {/* Transcript Stream */}
            <div className="flex-1 overflow-y-auto space-y-2.5 p-2">
              <h4 className="text-2xs font-bold text-stone-400 uppercase">कॉल ट्रांसक्रिप्ट</h4>
              {!selectedLog.transcript || selectedLog.transcript.length === 0 ? (
                <p className="text-xs text-stone-500">कोई ट्रांसक्रिप्ट रिकॉर्ड नहीं है।</p>
              ) : (
                selectedLog.transcript.map((t, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl text-xs space-y-1 ${
                      t.speaker === 'ai'
                        ? 'bg-stone-800/80 text-stone-200 border border-stone-700/60 mr-8'
                        : t.speaker === 'system'
                        ? 'bg-stone-950 text-stone-400 text-2xs text-center border border-stone-800'
                        : 'bg-orange-950/40 text-orange-200 border border-orange-500/30 ml-8'
                    }`}
                  >
                    <div className="flex items-center justify-between text-2xs opacity-75">
                      <span className="font-bold uppercase">
                        {t.speaker === 'ai' ? 'HARDINKAAM AI' : t.speaker === 'system' ? 'System' : 'Contact'}
                      </span>
                      <span>{t.timestamp}</span>
                    </div>
                    <p>{t.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SCRIPT BUILDER & TTS CONFIGURATION */}
      {/* ========================================================================= */}
      {isScriptModalOpen && editingScript && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="text-base font-black text-white">
                {editingScript.id ? 'AI स्क्रिप्ट एडिट करें' : 'नई AI स्क्रिप्ट बनाएं'}
              </h3>
              <button
                type="button"
                onClick={() => setIsScriptModalOpen(false)}
                className="p-1 rounded-xl text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveScript} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-stone-400 font-bold mb-1">स्क्रिप्ट का नाम:</label>
                <input
                  type="text"
                  required
                  value={editingScript.name || ''}
                  onChange={(e) => setEditingScript({ ...editingScript, name: e.target.value })}
                  placeholder="e.g. भोपाल इलेक्ट्रीशियन भर्ती अभियान"
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-white outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-400 font-bold mb-1">श्रेणी (Category):</label>
                  <select
                    value={editingScript.category || 'recruitment'}
                    onChange={(e) => setEditingScript({ ...editingScript, category: e.target.value as any })}
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-white outline-none font-medium"
                  >
                    <option value="recruitment">Recruitment (भर्ती)</option>
                    <option value="retention">Retention (री-एंगेजमेंट)</option>
                    <option value="booking">Booking (बुकिंग इंक्वायरी)</option>
                    <option value="support">Support (कस्टमर केयर)</option>
                    <option value="general">General (सामान्य)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-400 font-bold mb-1">भाषा (Language):</label>
                  <select
                    value={editingScript.language || 'hinglish'}
                    onChange={(e) => setEditingScript({ ...editingScript, language: e.target.value as any })}
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-white outline-none font-medium"
                  >
                    <option value="hinglish">Hinglish (हिन्ग्लिश)</option>
                    <option value="hi">Hindi (शुद्ध हिंदी)</option>
                    <option value="en">English (अंग्रेज़ी)</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-stone-400 font-bold">शुरुआती अभिवादन (Opening Greeting):</label>
                  <button
                    type="button"
                    onClick={() => handleTestTtsAudio(editingScript.openingGreeting || 'नमस्ते!')}
                    className="text-2xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>TTS प्रीव्यू सुनें</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={editingScript.openingGreeting || ''}
                  onChange={(e) => setEditingScript({ ...editingScript, openingGreeting: e.target.value })}
                  placeholder="नमस्ते! मैं HARDINKAAM से बोल रहा हूँ..."
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-stone-400 font-bold mb-1">कॉल उद्देश्य (Objective):</label>
                <input
                  type="text"
                  value={editingScript.objective || ''}
                  onChange={(e) => setEditingScript({ ...editingScript, objective: e.target.value })}
                  placeholder="e.g. सर्विसमैन को 0% कमीशन की जानकारी देना"
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-stone-400 font-bold mb-1">AI सिस्टम प्रॉम्प्ट (System Prompt & Guidance):</label>
                <textarea
                  rows={4}
                  value={editingScript.systemPrompt || ''}
                  onChange={(e) => setEditingScript({ ...editingScript, systemPrompt: e.target.value })}
                  placeholder="AI को निर्देश दें कि वह किस प्रकार बात करे और क्या जानकारी साझा करे..."
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-white outline-none font-mono text-2xs"
                />
              </div>

              <div>
                <label className="block text-stone-400 font-bold mb-1">मुख्य बातें (Talking Points - कॉमा से अलग करें):</label>
                <input
                  type="text"
                  value={
                    Array.isArray(editingScript.keyTalkingPoints)
                      ? editingScript.keyTalkingPoints.join(', ')
                      : ''
                  }
                  onChange={(e) =>
                    setEditingScript({
                      ...editingScript,
                      keyTalkingPoints: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  placeholder="0% कमीशन, डेली पेआउट, फ्री लीड्स"
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-stone-400 font-bold mb-1">समापन वाक्य (Closing Remark):</label>
                <input
                  type="text"
                  value={editingScript.closingRemark || ''}
                  onChange={(e) => setEditingScript({ ...editingScript, closingRemark: e.target.value })}
                  placeholder="HARDINKAAM चुनने के लिए धन्यवाद।"
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-white outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-3 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                >
                  <Save className="w-4 h-4" />
                  <span>स्क्रिप्ट सहेजें</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
