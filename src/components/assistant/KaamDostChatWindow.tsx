import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Minimize2,
  Maximize2,
  RotateCcw,
  Trash2,
  Send,
  Bot,
  Sparkles,
  Phone,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  Wrench,
  ShieldCheck,
  UserCheck,
  Calendar,
  Wallet,
  HelpCircle,
  Clock,
  CheckCheck,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  Radio,
  Sliders,
  AlertCircle,
  Check,
  Paperclip,
  Image as ImageIcon,
  Film,
  FileText,
  Upload,
  Camera
} from 'lucide-react';
import { ChatMessage, ActionItem, AssistantLanguage, QuickActionChip } from './types';
import { ChatAttachment } from './attachmentTypes';
import { QUICK_ACTION_CHIPS, getInitialWelcomeMessage, generateAssistantReply } from './assistantLogic';
import { DynamicChatRenderer } from './DynamicChatRenderer';
import { DynamicChatComponent, ComplaintSummaryConfirmationComponent } from './componentTypes';
import { MessageAttachments } from './MessageAttachments';
import { AttachmentPreviewTray, AttachmentActionMenu } from './AttachmentPreviewTray';
import { validateAttachment, processUpload, formatFileSize } from './uploadService';
import { KaamDostSessionState } from './memoryTypes';
import { conversationMemory } from './conversationMemoryService';
import { SessionMemoryCard } from './SessionMemoryCard';
import { LiveBookingSummaryCard } from './LiveBookingSummaryCard';
import {
  conversationalRegistration,
  RegistrationFlowState,
  isRegistrationIntent,
} from './conversationalRegistrationService';
import { executeMultiRoleRegistration } from './conversationalMultiRoleRegistrationService';
import { conversationalBooking } from './conversationalBookingService';
import { conversationalBookingManagement } from './conversationalBookingManagementService';
import { conversationalServiceWorkflow } from './conversationalServiceWorkflowService';
import { conversationalPayment } from './conversationalPaymentService';
import { conversationalSupport, SUPPORT_ISSUE_CATEGORIES } from './conversationalSupportService';
import { centralizedActionRouter } from './actionRouter';
import { confirmationService, PendingConfirmationState } from './confirmationService';
import {
  voiceService,
  SpeechSpeed,
  VoicePlaybackState,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported
} from './voiceService';
import { Service, Category, ServiceMan, Booking } from '../../types';

interface KaamDostChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  lang: AssistantLanguage;
  onLanguageChange: (lang: AssistantLanguage) => void;
  services: Service[];
  categories: Category[];
  serviceMen?: ServiceMan[];
  bookings?: Booking[];
  isLoggedIn: boolean;
  userName?: string;
  userProfile?: any;
  userId?: string;
  onNavigateTab: (tab: string) => void;
  onBookService: (service: Service) => void;
  onOpenAuth: (role?: any) => void;
  onOpenHelp: () => void;
  onRegisterCustomer?: (data: any) => Promise<any>;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

export const KaamDostChatWindow: React.FC<KaamDostChatWindowProps> = ({
  isOpen,
  onClose,
  lang,
  onLanguageChange,
  services,
  categories,
  serviceMen,
  bookings = [],
  isLoggedIn,
  userName,
  userProfile,
  userId,
  onNavigateTab,
  onBookService,
  onOpenAuth,
  onOpenHelp,
  onRegisterCustomer,
  messages,
  setMessages,
}) => {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Conversational Customer Registration State (Phase 6)
  const [regState, setRegState] = useState<RegistrationFlowState>({ step: 'idle' });

  // Conversation Memory & Structured Session State (Phase 5)
  const [sessionState, setSessionState] = useState<KaamDostSessionState>(() => {
    const saved = conversationMemory.loadSession(userId);
    if (saved) return saved;

    const baseCtx = conversationMemory.initContextFromProfile(userProfile);
    const missing = conversationMemory.detectMissingFields(baseCtx, userProfile);
    return {
      sessionId: 'sess_' + Date.now(),
      userId,
      context: baseCtx,
      missingFields: missing,
      isComplete: missing.length === 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  // When user profile or userId changes (login/refresh), safely restore or enrich memory
  useEffect(() => {
    if (userId || userProfile) {
      const saved = conversationMemory.loadSession(userId);
      if (saved) {
        setSessionState(saved);
      } else {
        setSessionState((prev) => {
          const enriched = { ...prev.context };
          if (userProfile?.name && !enriched.customerName) enriched.customerName = userProfile.name;
          if (userProfile?.phone && !enriched.mobile) enriched.mobile = userProfile.phone;
          if (userProfile?.email && !enriched.email) enriched.email = userProfile.email;
          if (userProfile?.address && !enriched.address) {
            enriched.address = userProfile.address;
            enriched.location = userProfile.address;
          }
          const missing = conversationMemory.detectMissingFields(enriched, userProfile);
          const updated: KaamDostSessionState = {
            ...prev,
            userId: userId || prev.userId,
            context: enriched,
            missingFields: missing,
            isComplete: missing.length === 0,
            updatedAt: new Date().toISOString(),
          };
          conversationMemory.saveSession(updated, userId);
          return updated;
        });
      }
    }
  }, [userId, userProfile]);

  const handleResetMemory = () => {
    conversationMemory.clearSession(userId);
    setRegState({ step: 'idle' });
    const freshCtx = conversationMemory.initContextFromProfile(userProfile);
    const missing = conversationMemory.detectMissingFields(freshCtx, userProfile);
    const freshSession: KaamDostSessionState = {
      sessionId: 'sess_' + Date.now(),
      userId,
      context: freshCtx,
      missingFields: missing,
      isComplete: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSessionState(freshSession);
    conversationMemory.saveSession(freshSession, userId);
  };

  // Voice State (Phase 3)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [voicePermissionError, setVoicePermissionError] = useState<string | null>(null);
  const [activeSpeakingId, setActiveSpeakingId] = useState<string | null>(null);
  const [ttsPlaybackState, setTtsPlaybackState] = useState<VoicePlaybackState>('idle');
  const [ttsSpeed, setTtsSpeed] = useState<SpeechSpeed>(1.0);
  const [voiceLang, setVoiceLang] = useState<'hi-IN' | 'en-IN'>(lang === 'en' ? 'en-IN' : 'hi-IN');

  // Multimedia Attachments State (Phase 4)
  const [stagedAttachments, setStagedAttachments] = useState<ChatAttachment[]>([]);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  // Critical Action Confirmation Layer State (Phase 17)
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmationState | null>(null);

  // Hidden File Input References
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const multiPhotosInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of conversation
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isOpen, messages, isTyping, isRecording, stagedAttachments]);

  // Keep voice language aligned with assistant language selection
  useEffect(() => {
    setVoiceLang(lang === 'en' ? 'en-IN' : 'hi-IN');
  }, [lang]);

  // Voice Playback Subscription
  useEffect(() => {
    const unsub = voiceService.subscribePlayback((state, msgId) => {
      setTtsPlaybackState(state);
      setActiveSpeakingId(msgId);
    });

    return () => {
      unsub();
      voiceService.stopSpeech();
      voiceService.stopListening();
    };
  }, []);

  // Recording Timer
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      setRecordingDuration(0);
      interval = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingDuration(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  if (!isOpen) return null;

  const currentChips = QUICK_ACTION_CHIPS[lang] || QUICK_ACTION_CHIPS.hi;

  /* -------------------------------------------------------------
   * MULTIMEDIA: FILE PROCESSING & UPLOAD
   * ----------------------------------------------------------- */
  const handleFilesSelected = (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);

    fileArray.forEach((file) => {
      const validation = validateAttachment(file);
      if (!validation.valid) {
        setAttachmentError(validation.error || 'अमान्य फाइल');
        setTimeout(() => setAttachmentError(null), 5000);
        return;
      }

      const attId = 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const newAtt: ChatAttachment = {
        id: attId,
        type: validation.type || 'image',
        name: file.name,
        size: file.size,
        formattedSize: formatFileSize(file.size),
        url: URL.createObjectURL(file),
        status: 'uploading',
        progress: 10,
        file,
      };

      setStagedAttachments((prev) => [...prev, newAtt]);

      // Process upload with visual progress updates
      processUpload(
        file,
        validation.type || 'image',
        (prog) => {
          setStagedAttachments((prev) =>
            prev.map((item) => (item.id === attId ? { ...item, progress: prog } : item))
          );
        },
        (finalUrl) => {
          setStagedAttachments((prev) =>
            prev.map((item) =>
              item.id === attId ? { ...item, status: 'success', progress: 100, url: finalUrl } : item
            )
          );
        },
        (err) => {
          setStagedAttachments((prev) =>
            prev.map((item) =>
              item.id === attId ? { ...item, status: 'error', error: err } : item
            )
          );
        }
      );
    });
  };

  const handleRemoveAttachment = (id: string) => {
    setStagedAttachments((prev) => prev.filter((item) => item.id !== id));
  };

  const handleRetryAttachment = (id: string) => {
    const att = stagedAttachments.find((item) => item.id === id);
    if (!att || !att.file) return;

    setStagedAttachments((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'uploading', progress: 10, error: undefined } : item
      )
    );

    processUpload(
      att.file,
      att.type,
      (prog) => {
        setStagedAttachments((prev) =>
          prev.map((item) => (item.id === id ? { ...item, progress: prog } : item))
        );
      },
      (finalUrl) => {
        setStagedAttachments((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, status: 'success', progress: 100, url: finalUrl } : item
          )
        );
      },
      (err) => {
        setStagedAttachments((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: 'error', error: err } : item))
        );
      }
    );
  };

  const handleReplaceAttachment = (id: string, file: File) => {
    const validation = validateAttachment(file);
    if (!validation.valid) {
      setAttachmentError(validation.error || 'अमान्य फाइल');
      setTimeout(() => setAttachmentError(null), 5000);
      return;
    }

    setStagedAttachments((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              name: file.name,
              size: file.size,
              formattedSize: formatFileSize(file.size),
              type: validation.type || 'image',
              url: URL.createObjectURL(file),
              status: 'uploading',
              progress: 10,
              error: undefined,
              file,
            }
          : item
      )
    );

    processUpload(
      file,
      validation.type || 'image',
      (prog) => {
        setStagedAttachments((prev) =>
          prev.map((item) => (item.id === id ? { ...item, progress: prog } : item))
        );
      },
      (finalUrl) => {
        setStagedAttachments((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, status: 'success', progress: 100, url: finalUrl } : item
          )
        );
      },
      (err) => {
        setStagedAttachments((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: 'error', error: err } : item))
        );
      }
    );
  };

  // Execute conversational booking creation in Firestore
  const executeBookingCreation = async (targetContext: any) => {
    setIsTyping(true);
    try {
      const res = await conversationalBooking.createBooking(
        targetContext || sessionState.context,
        userProfile,
        { uid: userId, displayName: userName },
        services
      );

      if (res.success && res.booking) {
        const proName = res.booking.serviceManName || 'Rajesh Sharma';
        const proPhone = res.booking.serviceManPhone || '+91 98260 12345';
        const replyText =
          lang === 'hi'
            ? `🎉 बधाई हो! आपकी बुकिंग सफलतापूर्वक दर्ज हो गई है (Booking #${res.bookingId})।\n\n🔐 सर्विस स्टार्ट OTP: **${res.otp}**\n👨‍🔧 वेरिफाइड कारीगर: **${proName}** (${proPhone})\n📍 पता: ${res.booking.address}\n📅 समय: ${res.booking.scheduledDate} (${res.booking.scheduledTime})\n💵 कुल शुल्क: ₹${res.booking.amount} (काम पूरा होने व संतुष्टि के बाद नकद या UPI दें)\n\nकारीगर निर्धारित समय पर आपके पते पर पहुँचेंगे।`
            : `🎉 Congratulations! Your booking #${res.bookingId} has been confirmed.\n\n🔐 Service Start OTP: **${res.otp}**\n👨‍🔧 Assigned Pro: **${proName}** (${proPhone})\n📍 Address: ${res.booking.address}\n📅 Time: ${res.booking.scheduledDate} (${res.booking.scheduledTime})\n💵 Total Amount: ₹${res.booking.amount} (Pay COD/UPI after satisfaction)`;

        const confirmedSummary: any = {
          type: 'booking_summary_card',
          bookingId: res.bookingId,
          serviceName: res.booking.serviceName,
          categoryName: res.booking.categoryName,
          problem: res.booking.notes || res.booking.serviceName,
          scheduledDate: res.booking.scheduledDate,
          scheduledTime: res.booking.scheduledTime,
          scheduledDateTime: `${res.booking.scheduledDate}, ${res.booking.scheduledTime}`,
          address: res.booking.address,
          totalAmount: res.booking.amount,
          status: 'Booked & Assigned',
          otp: res.otp,
          proName,
          proPhone,
          isConfirmationPending: false,
        };

        // Reset active session memory draft so future bookings start fresh
        handleResetMemory();

        const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const assistantMessage: ChatMessage = {
          id: 'ast_' + Date.now(),
          sender: 'assistant',
          text: replyText,
          timestamp: replyTime,
          actions: [
            { label: '📋 मेरी बुकिंग्स में देखें', actionType: 'navigate_tab', payload: 'bookings' },
            { label: '📞 कारीगर को कॉल करें', actionType: 'open_call', payload: `tel:${proPhone}` },
          ],
          suggestedChips: ['📋 मेरी बुकिंग्स', '⚡ अन्य सेवा चाहिए', '📞 कस्टमर सपोर्ट'],
          dynamicComponent: confirmedSummary,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setIsTyping(false);
        return;
      } else {
        throw new Error(res.error || 'Failed to create booking');
      }
    } catch (e: any) {
      console.error('Failed to create conversational booking:', e);
      const errMsg: ChatMessage = {
        id: 'ast_' + Date.now(),
        sender: 'assistant',
        text: 'माफ़ कीजिए, बुकिंग दर्ज करने में त्रुटि हुई। कृपया पुनः प्रयास करें।',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedChips: ['पुनः प्रयास करें', 'कस्टमर सपोर्ट'],
      };
      setMessages((prev) => [...prev, errMsg]);
      setIsTyping(false);
    }
  };

  /* -------------------------------------------------------------
   * MESSAGE SENDING
   * ----------------------------------------------------------- */
  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    const hasAttachments = stagedAttachments.some((a) => a.status === 'success');

    if (!query && !hasAttachments) return;
    if (isTyping) return;

    // Stop active speech or recording
    voiceService.stopSpeech();
    if (isRecording) {
      voiceService.stopListening();
      setIsRecording(false);
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const readyAttachments = stagedAttachments.filter((a) => a.status === 'success');

    const userMessage: ChatMessage = {
      id: 'usr_' + Date.now(),
      sender: 'user',
      text:
        query ||
        (readyAttachments.length > 0
          ? lang === 'hi'
            ? '📸 समस्या की फोटो/वीडियो संलग्न है'
            : '📸 Media attachment sent'
          : ''),
      timestamp: timeStr,
      attachments: readyAttachments.length > 0 ? readyAttachments : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setStagedAttachments([]);
    setVoiceNotice(null);
    setIsTyping(true);

    const queryKey = (query || '') + (readyAttachments.length > 0 ? ' photo_uploaded attachment' : '');
    const replyDelay = Math.min(1400, Math.max(700, queryKey.length * 35));

    const inRegFlow = regState.step !== 'idle' && regState.step !== 'completed';
    const isNewRegRequest = !isLoggedIn && isRegistrationIntent(query);

    setTimeout(async () => {
      // 0. CRITICAL ACTION CONFIRMATION LAYER (PHASE 17)
      if (pendingConfirmation) {
        const intent = confirmationService.classifyConfirmationIntent(query);

        if (intent === 'CONFIRMED') {
          const act = pendingConfirmation;
          setPendingConfirmation(null);

          if (act.actionType === 'create_booking') {
            await executeBookingCreation(act.payload || sessionState.context);
            return;
          } else if (act.actionType === 'cancel_booking') {
            const cancelRes = await conversationalBookingManagement.cancelBooking(
              act.payload.bookingId,
              act.payload.cancellationReason || act.payload.reason || 'ग्राहक द्वारा पुष्टिकरण से कैंसल'
            );
            const assistantMessage: ChatMessage = {
              id: 'ast_' + Date.now(),
              sender: 'assistant',
              text: cancelRes.success
                ? lang === 'hi'
                  ? `✅ **बुकिंग #${act.payload.bookingId} सफलतापूर्वक रद्द कर दी गई है।**\nयदि आपने ऑनलाइन पेमेंट किया था तो रिफंड 2-3 कार्यदिवसों में आपके खाते में आ जाएगा।`
                  : `✅ **Booking #${act.payload.bookingId} cancelled successfully.**`
                : cancelRes.message,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              suggestedChips: ['📋 मेरी बुकिंग्स', '🔧 नई सर्विस बुक करें'],
            };
            setMessages((prev) => [...prev, assistantMessage]);
            setIsTyping(false);
            return;
          } else if (act.actionType === 'approve_extra_charge') {
            const resp = await conversationalServiceWorkflow.respondToExtraCharge(
              act.payload.bookingId,
              userId || userProfile?.uid || 'customer',
              act.payload.chargeId,
              'approve'
            );
            const assistantMessage: ChatMessage = {
              id: 'ast_' + Date.now(),
              sender: 'assistant',
              text: resp.success
                ? lang === 'hi'
                  ? `✅ **अतिरिक्त चार्ज स्वीकृत (Approved)!**\n• राशि: **₹${act.payload.chargeAmount || act.payload.amount || 450}**\n• यह राशि आपके फाइनल इनवॉइस में जोड़ दी गई है।`
                  : `✅ **Extra charge approved!**\n• Amount: **₹${act.payload.chargeAmount || act.payload.amount || 450}**`
                : resp.message,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              suggestedChips: ['🧾 फाइनल बिल दिखाओ', '⏱️ वर्क टाइमर दिखाओ', '📋 मेरी बुकिंग्स'],
            };
            setMessages((prev) => [...prev, assistantMessage]);
            setIsTyping(false);
            return;
          } else if (act.actionType === 'reject_extra_charge') {
            const resp = await conversationalServiceWorkflow.respondToExtraCharge(
              act.payload.bookingId,
              userId || userProfile?.uid || 'customer',
              act.payload.chargeId,
              'reject',
              'Customer rejected via confirmation'
            );
            const assistantMessage: ChatMessage = {
              id: 'ast_' + Date.now(),
              sender: 'assistant',
              text: resp.success
                ? lang === 'hi'
                  ? `❌ **अतिरिक्त चार्ज नामंज़ूर (Rejected)!**\n• यह राशि आपके फाइनल बिल में शामिल नहीं की जाएगी।`
                  : `❌ **Extra charge rejected!**`
                : resp.message,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              suggestedChips: ['🧾 फाइनल बिल दिखाओ', '📋 मेरी बुकिंग्स'],
            };
            setMessages((prev) => [...prev, assistantMessage]);
            setIsTyping(false);
            return;
          } else if (act.actionType === 'make_payment') {
            const targetBk = bookings.find((b) => b.id === act.payload.bookingId) || bookings[0];
            if (targetBk && targetBk.id) {
              conversationalPayment.startPaymentFlow({
                booking: targetBk,
                customerName: userName,
                customerPhone: userProfile?.phone,
                customerEmail: userProfile?.email,
                onSuccess: (meta) => {
                  const successMsg: ChatMessage = {
                    id: 'ast_' + Date.now(),
                    sender: 'assistant',
                    text: `🎉 **भुगतान सफल! (Payment ID: ${meta.payment_id})**\nधन्यवाद! आपकी रसीद जनरेट हो गई है।`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  };
                  setMessages((prev) => [...prev, successMsg]);
                },
                onFailure: () => {},
                onDismiss: () => {},
              });
            }
            setIsTyping(false);
            return;
          } else if (act.actionType === 'create_complaint') {
            const subRes = await conversationalSupport.submitComplaint({
              customerId: userId || 'customer',
              customerName: userName || 'ग्राहक',
              customerPhone: userProfile?.phone || '6267546945',
              bookingId: act.payload.bookingId,
              serviceName: act.payload.serviceName || 'होम सर्विस',
              issueType: act.payload.issueType || 'general_support',
              description: act.payload.description || 'सपोर्ट सहायता',
              priority: act.payload.priority || 'high',
              attachments: act.payload.attachments || [],
            });
            const assistantMessage: ChatMessage = {
              id: 'ast_' + Date.now(),
              sender: 'assistant',
              text: lang === 'hi'
                ? `🛡️ **शिकायत सफलतापूर्वक दर्ज! (टिकट #${subRes.ticketId})**\nहमारी सपोर्ट टीम 1 घंटे के भीतर संपर्क करेगी।`
                : `🛡️ **Complaint submitted! (Ticket #${subRes.ticketId})**`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              suggestedChips: ['📋 मेरी बुकिंग्स', '📞 सपोर्ट हेल्पलाइन'],
            };
            setMessages((prev) => [...prev, assistantMessage]);
            setIsTyping(false);
            return;
          } else if (act.actionType === 'submit_registration') {
            const regRes = await executeMultiRoleRegistration(act.payload as any);
            const assistantMessage: ChatMessage = {
              id: 'ast_' + Date.now(),
              sender: 'assistant',
              text: `🎉 **रजिस्ट्रेशन सफल!** सदस्यता कोड: **${regRes.memberCode}** सक्रिय हो गया है।`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              suggestedChips: ['📊 मेरा डैशबोर्ड', '👛 वॉलेट बैलेंस'],
            };
            setMessages((prev) => [...prev, assistantMessage]);
            setIsTyping(false);
            return;
          }
        } else if (intent === 'EDIT') {
          setPendingConfirmation(null);
          const assistantMessage: ChatMessage = {
            id: 'ast_' + Date.now(),
            sender: 'assistant',
            text: lang === 'hi' ? 'कृपया बताएं कि आप कौन सा विवरण बदलना चाहते हैं:' : 'Please let me know which details you would like to edit:',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            suggestedChips: ['📅 तारीख बदलें', '⏰ समय बदलें', '📍 पता बदलें', 'रद्द करें'],
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setIsTyping(false);
          return;
        } else if (intent === 'CANCELLED') {
          setPendingConfirmation(null);
          const assistantMessage: ChatMessage = {
            id: 'ast_' + Date.now(),
            sender: 'assistant',
            text: lang === 'hi' ? 'एक्शन रद्द कर दिया गया है। कोई बदलाव नहीं किया गया। 😊' : 'Action cancelled. No changes were made. 😊',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            suggestedChips: ['📋 मेरी बुकिंग्स', '🔧 नई सर्विस बुक करें', '👛 वॉलेट बैलेंस'],
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setIsTyping(false);
          return;
        } else {
          // AMBIGUOUS: DO NOT EXECUTE ACTION! Re-prompt user with clear confirmation card
          const ambiguousPrompt = confirmationService.generateAmbiguousResponsePrompt(pendingConfirmation, lang);
          const assistantMessage: ChatMessage = {
            id: 'ast_' + Date.now(),
            sender: 'assistant',
            text: ambiguousPrompt.replyText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            dynamicComponent: ambiguousPrompt.cardComponent,
            suggestedChips: ambiguousPrompt.suggestedChips,
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setIsTyping(false);
          return;
        }
      }

      // 1. Explicit Confirmation / Cancellation Check for Completed Booking Draft (Phase 8)
      if (sessionState.isComplete) {
        const qLower = query.toLowerCase().trim();
        const isExplicitConfirm =
          qLower.includes('confirm') ||
          qLower.includes('कन्फर्म') ||
          qLower.includes('हाँ') ||
          qLower.includes('बुक कर दो') ||
          qLower.includes('yes') ||
          qLower.includes('कर दीजिए');

        const isExplicitCancel =
          qLower.includes('cancel') ||
          qLower.includes('रद्द') ||
          qLower.includes('नहीं चाहिए') ||
          qLower.includes('रद्द करें');

        const isExplicitEdit =
          qLower.includes('edit') ||
          qLower.includes('बदलें') ||
          qLower.includes('बदलना');

        if (isExplicitConfirm) {
          await executeBookingCreation(sessionState.context);
          return;
        }

        if (isExplicitCancel) {
          handleResetMemory();
          const replyText =
            lang === 'hi'
              ? 'बुकिंग ड्राफ्ट रद्द कर दिया गया है। जब भी आपको किसी सेवा की आवश्यकता हो, मुझे बताएं! 😊'
              : 'Booking draft cancelled. Whenever you need assistance, just let me know! 😊';

          const assistantMessage: ChatMessage = {
            id: 'ast_' + Date.now(),
            sender: 'assistant',
            text: replyText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            suggestedChips: ['⚡ Electrician', '🔧 Plumber', '❄️ AC Repair', '🧹 Cleaning'],
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setIsTyping(false);
          return;
        }

        if (isExplicitEdit) {
          const replyText =
            lang === 'hi'
              ? 'आप बुकिंग में क्या विवरण बदलना चाहते हैं? कृपया चुनें:'
              : 'Which detail would you like to edit? Please select:';

          const editOptions: DynamicChatComponent = {
            type: 'quick_replies',
            options: [
              { id: 'edit_date', label: '📅 तारीख बदलें', payload: 'तारीख बदलनी है' },
              { id: 'edit_time', label: '⏰ समय स्लॉट बदलें', payload: 'समय स्लॉट बदलना है' },
              { id: 'edit_address', label: '📍 पता बदलें', payload: 'पता बदलना है' },
              { id: 'edit_problem', label: '🔧 समस्या / काम बदलें', payload: 'समस्या बदलनी है' },
            ],
          };

          const assistantMessage: ChatMessage = {
            id: 'ast_' + Date.now(),
            sender: 'assistant',
            text: replyText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            dynamicComponent: editOptions,
            suggestedChips: ['📅 तारीख बदलें', '⏰ समय बदलें', '📍 पता बदलें', '🔧 समस्या बदलें'],
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setIsTyping(false);
          return;
        }
      }

      // 2. Conversational Customer Registration Flow (Phase 6)
      if (inRegFlow || isNewRegRequest) {
        let stepResult;
        if (isNewRegRequest && !inRegFlow) {
          stepResult = conversationalRegistration.startFlow(undefined, lang);
        } else {
          stepResult = conversationalRegistration.processStep(
            query,
            regState,
            readyAttachments.length > 0 ? { attachments: readyAttachments } : undefined,
            lang
          );
        }

        setRegState(stepResult.nextState);

        if (stepResult.completeRegistrationNow) {
          try {
            const regRes = await executeMultiRoleRegistration(stepResult.nextState);
            if (regRes.userProfile) {
              if (onRegisterCustomer && stepResult.nextState.targetRole === 'customer') {
                await onRegisterCustomer({
                  name: stepResult.nextState.name,
                  phone: stepResult.nextState.mobile,
                  email: stepResult.nextState.email,
                  address: stepResult.nextState.address,
                  area: stepResult.nextState.area,
                  city: stepResult.nextState.city,
                  avatar: stepResult.nextState.avatar,
                }).catch(() => {});
              }

              const newProfile = regRes.userProfile;
              setSessionState((prev) => {
                const nextCtx = {
                  ...prev.context,
                  customerName: newProfile.name,
                  mobile: newProfile.phone,
                  email: newProfile.email,
                  address: newProfile.address,
                  area: (newProfile as any).area || 'Bhopal',
                  city: newProfile.city || 'Bhopal',
                };
                const nextMissing = conversationMemory.detectMissingFields(nextCtx, newProfile);
                const nextSess: KaamDostSessionState = {
                  ...prev,
                  context: nextCtx,
                  missingFields: nextMissing,
                  isComplete: nextMissing.length === 0,
                  updatedAt: new Date().toISOString(),
                };
                conversationMemory.saveSession(nextSess, userId);
                return nextSess;
              });
            }
          } catch (regErr: any) {
            console.warn('Conversational registration notice:', regErr);
          }
        }

        const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const assistantMessage: ChatMessage = {
          id: 'ast_' + Date.now(),
          sender: 'assistant',
          text: stepResult.text,
          timestamp: replyTime,
          actions: stepResult.actions,
          suggestedChips: stepResult.suggestedChips,
          dynamicComponent: stepResult.dynamicComponent,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setIsTyping(false);
        return;
      }

      // 3. Normal Booking & Inquiry Flow
      const generated = generateAssistantReply(
        queryKey,
        {
          services,
          categories,
          serviceMen,
          bookings,
          isLoggedIn,
          userName,
          userProfile,
          lang,
          sessionState,
        },
        readyAttachments.length > 0 ? { attachments: readyAttachments } : undefined
      );

      // Persist updated session state
      const nextSession: KaamDostSessionState = {
        ...sessionState,
        context: generated.updatedContext,
        missingFields: generated.missingFields,
        isComplete: generated.isComplete,
        updatedAt: new Date().toISOString(),
      };
      setSessionState(nextSession);
      conversationMemory.saveSession(nextSession, userId);

      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const assistantMessage: ChatMessage = {
        id: 'ast_' + Date.now(),
        sender: 'assistant',
        text: generated.text,
        timestamp: replyTime,
        actions: generated.actions,
        suggestedChips: generated.suggestedChips,
        dynamicComponent: generated.dynamicComponent,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
    }, replyDelay);
  };

  // Handle actions triggered from dynamic interactive components
  const handleComponentAction = (actionType: string, data: any, displayText?: string) => {
    if (isTyping) return;

    if (actionType === 'service_selected' && data) {
      onBookService(data);
    } else if (actionType === 'booking_confirmed') {
      onNavigateTab('bookings');
    }

    const userText = displayText || (typeof data === 'string' ? data : JSON.stringify(data));
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMessage: ChatMessage = {
      id: 'usr_' + Date.now(),
      sender: 'user',
      text: userText,
      timestamp: timeStr,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    const queryKey = `${actionType} ${userText}`;
    const replyDelay = Math.min(1000, Math.max(600, userText.length * 20));
    const inRegFlow = regState.step !== 'idle' && regState.step !== 'completed';

    setTimeout(async () => {
      // 0. ACTION CONFIRMATION BUTTON CLICKS (PHASE 17)
      if (actionType === 'confirm_pending_action') {
        const act = data;
        setPendingConfirmation(null);

        if (act.actionType === 'create_booking') {
          await executeBookingCreation(act.payload || sessionState.context);
          return;
        } else if (act.actionType === 'cancel_booking') {
          const cancelRes = await conversationalBookingManagement.cancelBooking(
            act.payload.bookingId,
            act.payload.cancellationReason || 'ग्राहक द्वारा पुष्टिकरण से कैंसल'
          );
          const assistantMessage: ChatMessage = {
            id: 'ast_' + Date.now(),
            sender: 'assistant',
            text: cancelRes.success
              ? lang === 'hi'
                ? `✅ **बुकिंग #${act.payload.bookingId} सफलतापूर्वक रद्द कर दी गई है।**\nयदि आपने ऑनलाइन पेमेंट किया था तो रिफंड 2-3 कार्यदिवसों में आपके खाते में आ जाएगा।`
                : `✅ **Booking #${act.payload.bookingId} cancelled successfully.**`
              : cancelRes.message,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            suggestedChips: ['📋 मेरी बुकिंग्स', '🔧 नई सर्विस बुक करें'],
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setIsTyping(false);
          return;
        } else if (act.actionType === 'approve_extra_charge') {
          const resp = await conversationalServiceWorkflow.respondToExtraCharge(
            act.payload.bookingId,
            userId || userProfile?.uid || 'customer',
            act.payload.chargeId,
            'approve'
          );
          const assistantMessage: ChatMessage = {
            id: 'ast_' + Date.now(),
            sender: 'assistant',
            text: resp.success
              ? lang === 'hi'
                ? `✅ **अतिरिक्त चार्ज स्वीकृत (Approved)!**\n• राशि: **₹${act.payload.chargeAmount || act.payload.amount || 450}**\n• यह राशि आपके फाइनल इनवॉइस में जोड़ दी गई है।`
                : `✅ **Extra charge approved!**\n• Amount: **₹${act.payload.chargeAmount || act.payload.amount || 450}**`
              : resp.message,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            suggestedChips: ['🧾 फाइनल बिल दिखाओ', '⏱️ वर्क टाइमर दिखाओ', '📋 मेरी बुकिंग्स'],
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setIsTyping(false);
          return;
        } else if (act.actionType === 'reject_extra_charge') {
          const resp = await conversationalServiceWorkflow.respondToExtraCharge(
            act.payload.bookingId,
            userId || userProfile?.uid || 'customer',
            act.payload.chargeId,
            'reject',
            'Customer rejected via confirmation button'
          );
          const assistantMessage: ChatMessage = {
            id: 'ast_' + Date.now(),
            sender: 'assistant',
            text: resp.success
              ? lang === 'hi'
                ? `❌ **अतिरिक्त चार्ज नामंज़ूर (Rejected)!**\n• यह राशि आपके फाइनल बिल में शामिल नहीं की जाएगी।`
                : `❌ **Extra charge rejected!**`
              : resp.message,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            suggestedChips: ['🧾 फाइनल बिल दिखाओ', '📋 मेरी बुकिंग्स'],
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setIsTyping(false);
          return;
        } else if (act.actionType === 'make_payment') {
          const targetBk = bookings.find((b) => b.id === act.payload.bookingId) || bookings[0];
          if (targetBk && targetBk.id) {
            conversationalPayment.startPaymentFlow({
              booking: targetBk,
              customerName: userName,
              customerPhone: userProfile?.phone,
              customerEmail: userProfile?.email,
              onSuccess: (meta) => {
                const successMsg: ChatMessage = {
                  id: 'ast_' + Date.now(),
                  sender: 'assistant',
                  text: `🎉 **भुगतान सफल! (Payment ID: ${meta.payment_id})**\nधन्यवाद! आपकी रसीद जनरेट हो गई है।`,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                };
                setMessages((prev) => [...prev, successMsg]);
              },
              onFailure: () => {},
              onDismiss: () => {},
            });
          }
          setIsTyping(false);
          return;
        } else if (act.actionType === 'create_complaint') {
          const subRes = await conversationalSupport.submitComplaint({
            customerId: userId || 'customer',
            customerName: userName || 'ग्राहक',
            customerPhone: userProfile?.phone || '6267546945',
            bookingId: act.payload.bookingId,
            serviceName: act.payload.serviceName || 'होम सर्विस',
            issueType: act.payload.issueType || 'general_support',
            description: act.payload.description || 'सपोर्ट सहायता',
            priority: act.payload.priority || 'high',
            attachments: act.payload.attachments || [],
          });
          const assistantMessage: ChatMessage = {
            id: 'ast_' + Date.now(),
            sender: 'assistant',
            text: lang === 'hi'
              ? `🛡️ **शिकायत दर्ज हो गई! (टिकट #${subRes.ticketId})**\nहमारी टीम 1 घंटे के भीतर संपर्क करेगी।`
              : `🛡️ **Complaint submitted! (Ticket #${subRes.ticketId})**`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            suggestedChips: ['📋 मेरी बुकिंग्स', '📞 सपोर्ट हेल्पलाइन'],
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setIsTyping(false);
          return;
        } else if (act.actionType === 'submit_registration') {
          const regRes = await executeMultiRoleRegistration(act.payload);
          const assistantMessage: ChatMessage = {
            id: 'ast_' + Date.now(),
            sender: 'assistant',
            text: `🎉 **रजिस्ट्रेशन सफल!** सदस्यता कोड: **${regRes.memberCode}** सक्रिय हो गया है।`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            suggestedChips: ['📊 मेरा डैशबोर्ड', '👛 वॉलेट बैलेंस'],
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setIsTyping(false);
          return;
        }
      }

      if (actionType === 'edit_pending_action') {
        setPendingConfirmation(null);
        const assistantMessage: ChatMessage = {
          id: 'ast_' + Date.now(),
          sender: 'assistant',
          text: lang === 'hi' ? 'कृपया बताएं कि आप कौन सा विवरण बदलना चाहते हैं:' : 'Please specify what details you would like to edit:',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedChips: ['📅 तारीख बदलें', '⏰ समय बदलें', '📍 पता बदलें', 'रद्द करें'],
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setIsTyping(false);
        return;
      }

      if (actionType === 'cancel_pending_action') {
        setPendingConfirmation(null);
        const assistantMessage: ChatMessage = {
          id: 'ast_' + Date.now(),
          sender: 'assistant',
          text: lang === 'hi' ? 'एक्शन रद्द कर दिया गया है। कोई बदलाव नहीं किया गया। 😊' : 'Action cancelled. No changes were made. 😊',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedChips: ['📋 मेरी बुकिंग्स', '🔧 नई सर्विस बुक करें', '👛 वॉलेट बैलेंस'],
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setIsTyping(false);
        return;
      }

      // 1. Explicit Final Booking Confirmation (Phase 8)
      if (actionType === 'confirm_booking_final') {
        await executeBookingCreation(data || sessionState.context);
        return;
      }

      // 2. Booking Draft Cancellation (Phase 8)
      if (actionType === 'cancel_booking_draft') {
        handleResetMemory();
        const replyText =
          lang === 'hi'
            ? 'बुकिंग ड्राफ्ट रद्द कर दिया गया है। जब भी आपको किसी सेवा की आवश्यकता हो, मुझे बताएं! 😊'
            : 'Booking draft cancelled. Whenever you need assistance, just let me know! 😊';

        const assistantMessage: ChatMessage = {
          id: 'ast_' + Date.now(),
          sender: 'assistant',
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedChips: ['⚡ Electrician', '🔧 Plumber', '❄️ AC Repair', '🧹 Cleaning'],
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setIsTyping(false);
        return;
      }

      // 3. Edit Details Choice (Phase 8)
      if (actionType === 'edit_booking_details') {
        const replyText =
          lang === 'hi'
            ? 'आप बुकिंग में क्या विवरण बदलना चाहते हैं? कृपया चुनें:'
            : 'Which detail would you like to edit? Please select:';

        const editOptions: DynamicChatComponent = {
          type: 'quick_replies',
          options: [
            { id: 'edit_date', label: '📅 तारीख बदलें', payload: 'तारीख बदलनी है' },
            { id: 'edit_time', label: '⏰ समय स्लॉट बदलें', payload: 'समय स्लॉट बदलना है' },
            { id: 'edit_address', label: '📍 पता बदलें', payload: 'पता बदलना है' },
            { id: 'edit_problem', label: '🔧 समस्या / काम बदलें', payload: 'समस्या बदलनी है' },
          ],
        };

        const assistantMessage: ChatMessage = {
          id: 'ast_' + Date.now(),
          sender: 'assistant',
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          dynamicComponent: editOptions,
          suggestedChips: ['📅 तारीख बदलें', '⏰ समय बदलें', '📍 पता बदलें', '🔧 समस्या बदलें'],
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setIsTyping(false);
        return;
      }

      // 4. Request Cancel Booking Dialog (Phase 11)
      if (actionType === 'request_cancel_booking') {
        const targetBooking = data;
        const cancelComp: DynamicChatComponent = {
          type: 'booking_cancel_card',
          bookingId: targetBooking.id,
          serviceName: targetBooking.serviceName,
          scheduledDate: targetBooking.scheduledDate,
          scheduledTime: targetBooking.scheduledTime,
          reasons: [
            'समय पर उपलब्ध नहीं (Not available at scheduled time)',
            'गलती से बुक हो गया (Booked by mistake)',
            'प्लान बदल गया / काम हो चुका (Plans changed)',
            'अन्य आपातकालीन काम आ गया (Urgent personal work)',
          ],
        };

        const assistantMessage: ChatMessage = {
          id: 'ast_' + Date.now(),
          sender: 'assistant',
          text:
            lang === 'hi'
              ? `🚫 क्या आप बुकिंग #${targetBooking.id} (${targetBooking.serviceName}) को रद्द (Cancel) करना चाहते हैं?\nकृपया नीचे से कारण चुनकर पुष्टि करें:`
              : `🚫 Would you like to cancel booking #${targetBooking.id} (${targetBooking.serviceName})?\nPlease select a reason to confirm:`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          dynamicComponent: cancelComp,
          suggestedChips: ['बुकिंग रद्द नहीं करनी', 'समय रीशेड्यूल करें', 'हेल्पलाइन'],
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setIsTyping(false);
        return;
      }

      // 5. Confirm Cancel Booking Execution (Phase 11)
      if (actionType === 'cancel_booking_confirmed') {
        const { bookingId, reason } = data;
        const cancelResult = await conversationalBookingManagement.cancelBooking(
          bookingId,
          reason
        );

        const assistantMessage: ChatMessage = {
          id: 'ast_' + Date.now(),
          sender: 'assistant',
          text: cancelResult.success
            ? lang === 'hi'
              ? `✅ **बुकिंग #${bookingId} सफलतापूर्वक रद्द (Cancelled) कर दी गई है।**\n\n• कारण: ${reason}\n• यदि आपने ऑनलाइन अग्रिम भुगतान किया था, तो 3-5 कार्य दिवसों में रिफंड क्रेडिट कर दिया जाएगा।`
              : `✅ **Booking #${bookingId} has been successfully cancelled.**\n\n• Reason: ${reason}\n• If prepaid, your refund will be processed within 3-5 working days.`
            : cancelResult.message,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedChips: ['📋 मेरी सभी बुकिंग्स', '🔧 नई सर्विस बुक करें', '👛 मेरा वॉलेट'],
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setIsTyping(false);
        return;
      }

      // 6. Dismiss Cancel
      if (actionType === 'dismiss_cancel') {
        const assistantMessage: ChatMessage = {
          id: 'ast_' + Date.now(),
          sender: 'assistant',
          text:
            lang === 'hi'
              ? '👍 ठीक है, आपकी बुकिंग एक्टिव और सुरक्षित है। क्या मैं किसी और काम में आपकी मदद करूँ?'
              : '👍 Great, your booking remains active and confirmed. Can I help with anything else?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedChips: ['📅 आज की बुकिंग क्या है?', '🛵 सर्विसमैन कब आ रहा है?', '🔧 नई सर्विस बुक करें'],
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setIsTyping(false);
        return;
      }

      // 7. Request Reschedule Booking Dialog (Phase 11)
      if (actionType === 'request_reschedule_booking') {
        const targetBooking = data;
        const reschedComp: DynamicChatComponent = {
          type: 'booking_reschedule_card',
          bookingId: targetBooking.id,
          serviceName: targetBooking.serviceName,
          currentDate: targetBooking.scheduledDate,
          currentTime: targetBooking.scheduledTime,
          availableDates: ['आज (Today)', 'कल (Tomorrow)', 'परसों (Day After)'],
          availableSlots: [
            '09:00 AM - 11:00 AM',
            '11:00 AM - 01:00 PM',
            '02:00 PM - 04:00 PM',
            '04:00 PM - 06:00 PM',
          ],
        };

        const assistantMessage: ChatMessage = {
          id: 'ast_' + Date.now(),
          sender: 'assistant',
          text:
            lang === 'hi'
              ? `📅 बुकिंग #${targetBooking.id} (${targetBooking.serviceName}) का नया समय चुनें:`
              : `📅 Please select the new date & time slot for booking #${targetBooking.id}:`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          dynamicComponent: reschedComp,
          suggestedChips: ['समय नहीं बदलना', '📋 मेरी बुकिंग्स', 'कस्टमर केयर'],
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setIsTyping(false);
        return;
      }

      // 8. Confirm Reschedule Booking Execution (Phase 11)
      if (actionType === 'reschedule_booking_confirmed') {
        const { bookingId, newDate, newTime } = data;
        const reschedResult = await conversationalBookingManagement.rescheduleBooking(
          bookingId,
          newDate,
          newTime
        );

        const assistantMessage: ChatMessage = {
          id: 'ast_' + Date.now(),
          sender: 'assistant',
          text: reschedResult.success
            ? lang === 'hi'
              ? `🎉 **बुकिंग #${bookingId} का नया समय निर्धारित हो गया है!**\n\n• 📅 **नया दिन:** ${newDate}\n• ⏰ **नया स्लॉट:** ${newTime}\n• हमारे कारीगर निर्धारित समय पर पहुँचेंगे।`
              : `🎉 **Booking #${bookingId} has been successfully rescheduled!**\n\n• 📅 **New Date:** ${newDate}\n• ⏰ **New Slot:** ${newTime}\n• Our technician will arrive as scheduled.`
            : reschedResult.message,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedChips: ['🛵 सर्विसमैन कब आ रहा है?', '👨‍🔧 कारीगर कौन है?', '📋 मेरी बुकिंग्स'],
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setIsTyping(false);
        return;
      }

      // 9. Dismiss Reschedule
      if (actionType === 'dismiss_reschedule') {
        const assistantMessage: ChatMessage = {
          id: 'ast_' + Date.now(),
          sender: 'assistant',
          text:
            lang === 'hi'
              ? '👍 ठीक है, बुकिंग का वर्तमान समय बरकरार रखा गया है।'
              : '👍 Understood, keeping the existing scheduled slot.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedChips: ['📋 मेरी बुकिंग्स दिखाओ', '🛵 सर्विसमैन कब आ रहा है?'],
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setIsTyping(false);
        return;
      }

      // 10. Track Booking Action
      if (actionType === 'track_booking') {
        const targetBooking = data;
        const etaText =
          targetBooking.displayStatus === 'ARRIVING'
            ? `🛵 आपके कारीगर **${targetBooking.serviceManName}** रास्ते में हैं और अगले **${targetBooking.etaMinutes || 25} मिनट** में पहुँच रहे हैं (${targetBooking.approxDistance || '2.2 किमी दूर'})।`
            : targetBooking.displayStatus === 'ARRIVED'
            ? `📍 कारीगर **${targetBooking.serviceManName}** आपकी लोकेशन पर पहुँच चुके हैं!`
            : `📋 कारीगर **${targetBooking.serviceManName}** असाइन हो चुके हैं और निर्धारित समय (${targetBooking.scheduledDate}, ${targetBooking.scheduledTime}) पर पहुँचेंगे।`;

        const mgmtComp: DynamicChatComponent = {
          type: 'booking_management_card',
          title: '📍 लाइव सर्विसमैन स्थिति (Live Tracking)',
          subtitle: `बुकिंग #${targetBooking.id}`,
          filterType: 'single',
          bookings: [targetBooking],
        };

        const assistantMessage: ChatMessage = {
          id: 'ast_' + Date.now(),
          sender: 'assistant',
          text: `${etaText}\n\n🔒 **स्टार्ट कोड (Start OTP):** ${targetBooking.otp || '5482'}\n📞 **संपर्क:** ${targetBooking.serviceManPhone || '+91 98260 12345'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          dynamicComponent: mgmtComp,
          suggestedChips: ['👨‍🔧 कारीगर को कॉल करें', '📅 समय रीशेड्यूल करें', '📋 मेरी सभी बुकिंग्स'],
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setIsTyping(false);
        return;
      }

      // 11. Reorder Booking Action
      if (actionType === 'reorder_booking') {
        const serviceName = data.serviceName;
        const matchedService = services.find((s) => s.name.toLowerCase() === (serviceName || '').toLowerCase()) || services[0];
        if (matchedService) {
          onBookService(matchedService);
          onClose();
        }
        return;
      }

      // 11B. Customer Approves Extra Charge (Phase 12)
      if (actionType === 'approve_extra_charge') {
        const { bookingId, chargeId, amount, description } = data;
        const resp = await conversationalServiceWorkflow.respondToExtraCharge(
          bookingId,
          userId || userProfile?.uid || 'customer',
          chargeId,
          'approve'
        );

        const assistantMessage: ChatMessage = {
          id: 'ast_' + Date.now(),
          sender: 'assistant',
          text: resp.success
            ? lang === 'hi'
              ? `✅ **अतिरिक्त चार्ज स्वीकृत!**\n• सामग्री / काम: **${description}**\n• राशि: **₹${amount}**\n• यह राशि आपके फाइनल इनवॉइस में जोड़ दी गई है।`
              : `✅ **Extra charge approved!**\n• Item: **${description}**\n• Amount: **₹${amount}**\n• Added to your final service invoice.`
            : resp.message,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedChips: ['🧾 फाइनल बिल दिखाओ', '⏱️ वर्क टाइमर दिखाओ', '📋 मेरी बुकिंग्स'],
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setIsTyping(false);
        return;
      }

      // 11C. Customer Rejects Extra Charge (Phase 12)
      if (actionType === 'reject_extra_charge') {
        const { bookingId, chargeId, amount, description } = data;
        const resp = await conversationalServiceWorkflow.respondToExtraCharge(
          bookingId,
          userId || userProfile?.uid || 'customer',
          chargeId,
          'reject',
          'Customer rejected via KaamDost'
        );

        const assistantMessage: ChatMessage = {
          id: 'ast_' + Date.now(),
          sender: 'assistant',
          text: resp.success
            ? lang === 'hi'
              ? `❌ **अतिरिक्त चार्ज अस्वीकार (Rejected)!**\n• सामग्री / काम: **${description}** (₹${amount})\n• **गारंटी:** यह चार्ज आपके फाइनल बिल में नहीं जोड़ा जाएगा।`
              : `❌ **Extra charge rejected!**\n• Item: **${description}** (₹${amount})\n• **Guarantee:** This charge will NOT be added to your bill.`
            : resp.message,
          suggestedChips: ['🧾 फाइनल बिल दिखाओ', '⏱️ वर्क टाइमर दिखाओ', '📞 कारीगर को कॉल करें'],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setIsTyping(false);
        return;
      }

      // 11D. Execute Razorpay Standard Payment Flow (Phase 13)
      if (actionType === 'start_razorpay_payment') {
        const targetBooking =
          bookings.find((b) => b.id === data.bookingId) ||
          bookings.find((b) => b.status !== 'cancelled') ||
          (data as any);

        const amountToPay = data.finalAmount || data.amount || targetBooking.amount || 235;

        setIsTyping(false);

        await conversationalPayment.executeRazorpayPayment({
          booking: targetBooking,
          customerName: userName || userProfile?.name || targetBooking.customerName,
          customerPhone: userProfile?.phone || targetBooking.customerPhone,
          customerEmail: userProfile?.email || targetBooking.customerEmail,
          onSuccess: (paymentMeta) => {
            const successComp: DynamicChatComponent = {
              type: 'payment_status_card',
              bookingId: targetBooking.id,
              serviceName: targetBooking.serviceName,
              status: 'success',
              amount: amountToPay,
              paymentId: paymentMeta.payment_id,
              orderId: paymentMeta.order_id,
              paidAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };

            const successMsg: ChatMessage = {
              id: 'ast_' + Date.now(),
              sender: 'assistant',
              text:
                lang === 'hi'
                  ? `🎉 **₹${amountToPay} का ऑनलाइन भुगतान सफल रहा!**\n\n• Transaction ID: **${paymentMeta.payment_id}**\n• आपकी रसीद जनरेट हो गई है। काम पूरा होने पर कारीगर को रेटिंग देना न भूलें!`
                  : `🎉 **Online payment of ₹${amountToPay} successful!**\n\n• Transaction ID: **${paymentMeta.payment_id}**\n• Your invoice is generated. Thank you for using HARDINKAAM!`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              dynamicComponent: successComp,
              suggestedChips: ['⭐ कारीगर को रेटिंग दें', '📋 मेरी बुकिंग्स', '🔧 नई सर्विस बुक करें'],
            };

            setMessages((prev) => [...prev, successMsg]);
          },
          onFailure: (err) => {
            const failComp: DynamicChatComponent = {
              type: 'payment_status_card',
              bookingId: targetBooking.id,
              serviceName: targetBooking.serviceName,
              status: 'failed',
              amount: amountToPay,
              errorMessage: err?.description || err?.message || 'लेनदेन पूरा नहीं हो सका',
            };

            const failMsg: ChatMessage = {
              id: 'ast_' + Date.now(),
              sender: 'assistant',
              text:
                lang === 'hi'
                  ? `⚠️ **भुगतान असफल रहा (Payment Failed)।**\n\n• कारण: ${err?.description || err?.message || 'लेनदेन में त्रुटि'}\n• आप नीचे दिए गए बटन से पुनः प्रयास कर सकते हैं:`
                  : `⚠️ **Payment Failed.**\n\n• Reason: ${err?.description || err?.message || 'Transaction could not be completed'}\n• You can retry below:`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              dynamicComponent: failComp,
              suggestedChips: ['🔄 दोबारा Pay Now करें', '💵 नकद भुगतान करें', '📞 हेल्पलाइन'],
            };

            setMessages((prev) => [...prev, failMsg]);
          },
          onDismiss: () => {
            const cancelComp: DynamicChatComponent = {
              type: 'payment_status_card',
              bookingId: targetBooking.id,
              serviceName: targetBooking.serviceName,
              status: 'cancelled',
              amount: amountToPay,
            };

            const cancelMsg: ChatMessage = {
              id: 'ast_' + Date.now(),
              sender: 'assistant',
              text:
                lang === 'hi'
                  ? `ℹ️ आपने भुगतान विंडो बंद कर दी है। आप नीचे से कभी भी दोबारा **Pay Now** कर सकते हैं:`
                  : `ℹ️ Payment window was dismissed. You can tap **Pay Now** below whenever you are ready:`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              dynamicComponent: cancelComp,
              suggestedChips: [`💳 Pay Now (₹${amountToPay})`, '💵 नकद भुगतान', '📋 मेरी बुकिंग्स'],
            };

            setMessages((prev) => [...prev, cancelMsg]);
          },
        });
        return;
      }

      // 11E. Pay Online or Pay Cash Direct Trigger
      if (actionType === 'pay_online_click' || actionType === 'pay_cash_click') {
        const isOnline = actionType === 'pay_online_click';
        const amount = data.amount || 235;

        const payComp: DynamicChatComponent = {
          type: 'payment_action_card',
          amount,
          title: isOnline ? '💳 ऑनलाइन भुगतान माध्यम चुनें' : '💵 कैश भुगतान पुष्टि',
          methods: isOnline
            ? [
                { id: 'upi', label: 'UPI / QR कोड (GPay, PhonePe, Paytm)', icon: 'QrCode' },
                { id: 'card', label: 'क्रेडिट / डेबिट कार्ड / नेटबैंकिंग', icon: 'CreditCard' },
              ]
            : [{ id: 'cash', label: 'कैश ऑन सर्विस (कारीगर को नकद भुगतान)', icon: 'Banknote' }],
          allowCash: true,
        };

        const assistantMessage: ChatMessage = {
          id: 'ast_' + Date.now(),
          sender: 'assistant',
          text: isOnline
            ? lang === 'hi'
              ? `💳 ₹${amount} के सुरक्षित ऑनलाइन भुगतान के लिए कृपया विकल्प चुनें:`
              : `💳 Please select your preferred payment method for ₹${amount}:`
            : lang === 'hi'
            ? `💵 काम पूरा होने पर आप कारीगर को ₹${amount} नकद (Cash) दे सकते हैं।`
            : `💵 You can pay ₹${amount} in cash directly to technician upon completion.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          dynamicComponent: payComp,
          suggestedChips: ['⭐ कारीगर को रेटिंग दें', '📋 मेरी बुकिंग्स', '🔧 नई सर्विस बुक करें'],
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setIsTyping(false);
        return;
      }

      // 11E. Extra Charge & Final Bill Trigger
      if (actionType === 'extra_charge_inquiry' || actionType === 'final_bill_inquiry') {
        const textQuery = actionType === 'extra_charge_inquiry' ? 'एक्स्ट्रा चार्ज क्या है?' : 'फाइनल बिल दिखाओ';
        handleSendMessage(textQuery);
        return;
      }

      // 11F. Support Complaint Review & Confirmation (Phase 14)
      if (actionType === 'review_complaint') {
        const summaryData: ComplaintSummaryConfirmationComponent = data;
        const assistantMessage: ChatMessage = {
          id: 'ast_' + Date.now(),
          sender: 'assistant',
          text:
            lang === 'hi'
              ? `📋 **शिकायत सारांश (Review Complaint Details)**\n\nकृपया नीचे दिए गए विवरण की जांच करें और पुष्टि करें:`
              : `📋 **Complaint Summary & Review**\n\nPlease verify details below and confirm submission:`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          dynamicComponent: summaryData,
          suggestedChips: ['✅ हाँ, शिकायत दर्ज करें', '✏️ बदलाव करें', '📞 हेल्पलाइन'],
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setIsTyping(false);
        return;
      }

      // 11G. Edit Complaint Form (Phase 14)
      if (actionType === 'edit_complaint_form') {
        const prevData: ComplaintSummaryConfirmationComponent = data;
        const availableBookingsList = (bookings || []).map((b) => ({
          id: b.id,
          serviceName: b.serviceName || 'होम सर्विस',
          date: b.scheduledDate || b.date || 'हालिया बुकिंग',
        }));

        const editFormComp: DynamicChatComponent = {
          type: 'complaint_form',
          bookingId: prevData.bookingId,
          serviceName: prevData.serviceName,
          availableBookings: availableBookingsList,
          issueType: prevData.issueType,
          availableIssueTypes: SUPPORT_ISSUE_CATEGORIES,
          priority: prevData.priority,
          description: prevData.description,
          photos: prevData.photos,
          videoUrl: prevData.videoUrl,
          documentUrl: prevData.documentUrl,
        };

        const assistantMessage: ChatMessage = {
          id: 'ast_' + Date.now(),
          sender: 'assistant',
          text:
            lang === 'hi'
              ? '✏️ आप शिकायत फॉर्म में बदलाव कर सकते हैं:'
              : '✏️ You can edit the complaint form below:',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          dynamicComponent: editFormComp,
          suggestedChips: ['📋 सारांश देखें', '📞 हेल्पलाइन'],
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setIsTyping(false);
        return;
      }

      // 11H. Submit Complaint Final to Firestore (Phase 14)
      if (actionType === 'submit_complaint_final') {
        const payload: ComplaintSummaryConfirmationComponent = data;
        const submitRes = await conversationalSupport.submitComplaint({
          customerId: userId || userProfile?.uid || 'cust_user',
          customerName: userName || userProfile?.name || payload.customerName,
          customerPhone: userProfile?.phone || payload.customerPhone,
          customerEmail: userProfile?.email || (payload as any).customerEmail,
          bookingId: payload.bookingId,
          serviceName: payload.serviceName,
          issueType: payload.issueType,
          description: payload.description,
          priority: payload.priority,
          photos: payload.photos,
          videoUrl: payload.videoUrl,
          documentUrl: payload.documentUrl,
        });

        const successCard: DynamicChatComponent = {
          type: 'complaint_success_card',
          ticketId: submitRes.ticketId,
          bookingId: payload.bookingId,
          serviceName: payload.serviceName,
          issueLabel: payload.issueLabel,
          priority: payload.priority,
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          expectedResolution: submitRes.expectedResolution,
          supportPhone: '+91 62675 46945',
        };

        const assistantMessage: ChatMessage = {
          id: 'ast_' + Date.now(),
          sender: 'assistant',
          text: submitRes.success
            ? lang === 'hi'
              ? `🛡️ **आपकी शिकायत सफलतापूर्वक दर्ज कर ली गई है!**\n\n• **Ticket Ref:** #${submitRes.ticketId}\n• **अनुमानित समाधान समय:** ${submitRes.expectedResolution}\n• हमारी डेडिकेटेड कस्टमर सपोर्ट टीम इस पर तुरंत कार्यवाही कर रही है।`
              : `🛡️ **Complaint submitted successfully!**\n\n• **Ticket Ref:** #${submitRes.ticketId}\n• **Expected Resolution:** ${submitRes.expectedResolution}\n• Our customer support team is actively reviewing your case.`
            : submitRes.message,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          dynamicComponent: successCard,
          suggestedChips: ['📞 कस्टमर सपोर्ट कॉल करें', '📋 मेरी बुकिंग्स', '⚡ नई सर्विस बुक करें'],
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setIsTyping(false);
        return;
      }

      // 12. Conversational Multi-Role Registration component interaction (Phase 15)
      const isRegAction =
        inRegFlow ||
        actionType === 'select_registration_role' ||
        actionType === 'select_trade_skill' ||
        actionType === 'documents_uploaded' ||
        actionType === 'documents_skipped' ||
        actionType === 'confirm_multi_role_registration';

      if (isRegAction) {
        const stepResult = conversationalRegistration.processStep(
          userText,
          regState.step === 'idle' && actionType === 'select_registration_role'
            ? { step: 'select_role' }
            : regState,
          data,
          lang
        );

        setRegState(stepResult.nextState);

        if (stepResult.completeRegistrationNow) {
          try {
            const regRes = await executeMultiRoleRegistration(stepResult.nextState);
            if (regRes.userProfile) {
              if (onRegisterCustomer && stepResult.nextState.targetRole === 'customer') {
                await onRegisterCustomer({
                  name: stepResult.nextState.name,
                  phone: stepResult.nextState.mobile,
                  email: stepResult.nextState.email,
                  address: stepResult.nextState.address,
                  area: stepResult.nextState.area,
                  city: stepResult.nextState.city,
                  avatar: stepResult.nextState.avatar,
                }).catch(() => {});
              }

              const newProfile = regRes.userProfile;
              setSessionState((prev) => {
                const nextCtx = {
                  ...prev.context,
                  customerName: newProfile.name,
                  mobile: newProfile.phone,
                  email: newProfile.email,
                  address: newProfile.address,
                  area: (newProfile as any).area || 'Bhopal',
                  city: newProfile.city || 'Bhopal',
                };
                const nextMissing = conversationMemory.detectMissingFields(nextCtx, newProfile);
                const nextSess: KaamDostSessionState = {
                  ...prev,
                  context: nextCtx,
                  missingFields: nextMissing,
                  isComplete: nextMissing.length === 0,
                  updatedAt: new Date().toISOString(),
                };
                conversationMemory.saveSession(nextSess, userId);
                return nextSess;
              });
            }
          } catch (regErr: any) {
            console.warn('Conversational multi-role registration notice:', regErr);
          }
        }

        const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const assistantMessage: ChatMessage = {
          id: 'ast_' + Date.now(),
          sender: 'assistant',
          text: stepResult.text,
          timestamp: replyTime,
          actions: stepResult.actions,
          suggestedChips: stepResult.suggestedChips,
          dynamicComponent: stepResult.dynamicComponent,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setIsTyping(false);
        return;
      }

      // 13. Normal Booking & Inquiry Flow
      const generated = generateAssistantReply(
        queryKey,
        {
          services,
          categories,
          serviceMen,
          bookings,
          isLoggedIn,
          userName,
          userProfile,
          lang,
          sessionState,
        },
        data
      );

      // Persist updated session state
      const nextSession: KaamDostSessionState = {
        ...sessionState,
        context: generated.updatedContext,
        missingFields: generated.missingFields,
        isComplete: generated.isComplete,
        updatedAt: new Date().toISOString(),
      };
      setSessionState(nextSession);
      conversationMemory.saveSession(nextSession, userId);

      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const assistantMessage: ChatMessage = {
        id: 'ast_' + Date.now(),
        sender: 'assistant',
        text: generated.text,
        timestamp: replyTime,
        actions: generated.actions,
        suggestedChips: generated.suggestedChips,
        dynamicComponent: generated.dynamicComponent,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
    }, replyDelay);
  };

  // Handle action button clicks inside chat bubbles
  const handleActionClick = (action: ActionItem) => {
    switch (action.actionType) {
      case 'trigger_camera':
        cameraInputRef.current?.click();
        break;
      case 'trigger_gallery':
        galleryInputRef.current?.click();
        break;
      case 'trigger_video':
        videoInputRef.current?.click();
        break;
      case 'trigger_doc':
        docInputRef.current?.click();
        break;
      case 'navigate_tab':
        if (action.payload) onNavigateTab(action.payload);
        break;
      case 'book_service':
        if (action.payload) onBookService(action.payload);
        break;
      case 'open_auth':
        onOpenAuth(action.payload || 'customer');
        break;
      case 'open_help':
        onOpenHelp();
        break;
      case 'open_call':
        window.location.href = action.payload || 'tel:+916267546945';
        break;
      case 'open_whatsapp':
        if (action.payload) window.open(action.payload, '_blank', 'noopener,noreferrer');
        break;
      case 'send_query':
        if (action.payload) handleSendMessage(action.payload);
        break;
      default:
        break;
    }
  };

  // New Conversation
  const handleNewConversation = () => {
    voiceService.stopSpeech();
    voiceService.stopListening();
    setIsRecording(false);
    setStagedAttachments([]);
    handleResetMemory();
    const welcome = getInitialWelcomeMessage(lang, userName);
    setMessages([welcome]);
    setShowClearConfirm(false);
    setVoiceNotice(null);
  };

  // Clear Conversation
  const handleConfirmClear = () => {
    handleNewConversation();
    setShowClearConfirm(false);
  };

  /* -------------------------------------------------------------
   * VOICE: SPEECH-TO-TEXT (STT) RECORDING
   * ----------------------------------------------------------- */
  const handleToggleVoiceRecording = async () => {
    setVoicePermissionError(null);
    setVoiceNotice(null);
    voiceService.stopSpeech();

    if (isRecording) {
      voiceService.stopListening();
      setIsRecording(false);
      return;
    }

    setInterimTranscript('');

    const started = await voiceService.startListening(voiceLang, {
      onInterim: (text) => {
        setInterimTranscript(text);
      },
      onFinal: (finalText) => {
        if (finalText.trim()) {
          setInputText((prev) => (prev ? `${prev} ${finalText.trim()}` : finalText.trim()));
          setVoiceNotice(
            lang === 'hi'
              ? 'वॉयस इनपुट जोड़ा गया! आप इसे एडिट कर सकते हैं या सीधा भेज सकते हैं।'
              : 'Voice input added! You can edit it or send directly.'
          );
        }
        setIsRecording(false);
        setInterimTranscript('');
      },
      onError: (errCode, errMsg) => {
        setIsRecording(false);
        setInterimTranscript('');
        if (errCode === 'permission_denied' || errCode === 'not-allowed') {
          setVoicePermissionError(errMsg);
        } else if (errCode !== 'no-speech') {
          setVoiceNotice(errMsg);
        }
      },
    });

    if (started) {
      setIsRecording(true);
    }
  };

  /* -------------------------------------------------------------
   * VOICE: TEXT-TO-SPEECH (TTS) PLAYBACK
   * ----------------------------------------------------------- */
  const handlePlayVoice = (msgId: string, text: string) => {
    voiceService.speakText(msgId, text, voiceLang, ttsSpeed);
  };

  const handlePauseVoice = () => {
    voiceService.pauseSpeech();
  };

  const handleResumeVoice = () => {
    voiceService.resumeSpeech();
  };

  const handleStopVoice = () => {
    voiceService.stopSpeech();
  };

  const handleCycleSpeed = () => {
    const speeds: SpeechSpeed[] = [1.0, 1.25, 1.5, 0.75];
    const nextIdx = (speeds.indexOf(ttsSpeed) + 1) % speeds.length;
    const next = speeds[nextIdx];
    setTtsSpeed(next);
    voiceService.setSpeed(next);
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
  };

  const getLanguageLabel = (l: AssistantLanguage) => {
    switch (l) {
      case 'hi':
        return 'हिंदी';
      case 'hinglish':
        return 'Hinglish';
      case 'en':
        return 'English';
    }
  };

  if (!isOpen) return null;

  return (
    <aside
      aria-label="KaamDost AI Chat Assistant"
      className={`fixed z-50 transition-all duration-300 flex flex-col overflow-hidden bg-white shadow-2xl border border-stone-300/80 ${
        isMaximized
          ? 'inset-3 sm:bottom-6 sm:right-6 sm:left-auto sm:w-[560px] sm:max-w-[calc(100vw-32px)] sm:h-[80vh] sm:max-h-[720px] rounded-3xl'
          : 'bottom-16 right-3 left-3 sm:bottom-6 sm:right-6 sm:left-auto sm:w-[380px] max-w-[calc(100vw-24px)] h-[480px] max-h-[68vh] rounded-3xl'
      }`}
    >
      {/* Hidden File Pickers for Multimedia (Phase 4) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files)}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files)}
      />
      <input
        ref={multiPhotosInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files)}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files)}
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files)}
      />
      <input
        ref={docInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files)}
      />

      {/* Header */}
      <header className="relative bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white p-3.5 sm:p-4 select-none shrink-0 shadow-md">
        <div className="absolute top-0 right-0 w-36 h-36 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between gap-2">
          {/* Assistant Info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-10 h-10 rounded-full bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center shrink-0 shadow-inner">
              <Bot className="w-5 h-5 text-amber-100" />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-orange-700 animate-pulse" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="font-black text-base tracking-tight text-white truncate flex items-center gap-1">
                  KaamDost AI
                  <span className="text-amber-200">🤝</span>
                </h2>
                <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-bold tracking-wider uppercase text-amber-200">
                  SMART BOT
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-amber-100 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>{lang === 'hi' ? 'ऑनलाइन • वॉयस व मीडिया चैट' : lang === 'hinglish' ? 'Online • Voice & Media' : 'Online • Voice & Media'}</span>
              </div>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Speed Control Badge */}
            <button
              type="button"
              onClick={handleCycleSpeed}
              className="px-2 py-1 rounded-lg bg-black/20 hover:bg-black/30 text-amber-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-white/20"
              title="Voice Playback Speed"
            >
              <span>{ttsSpeed}x</span>
            </button>

            {/* New Conversation Button */}
            <button
              type="button"
              onClick={handleNewConversation}
              className="p-1.5 rounded-lg text-amber-100 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
              title={lang === 'hi' ? 'नई बातचीत शुरू करें' : 'Start New Conversation'}
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Clear Conversation Option */}
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="p-1.5 rounded-lg text-amber-100 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
              title={lang === 'hi' ? 'बातचीत साफ करें' : 'Clear Chat'}
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Minimize / Maximize Option */}
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="hidden sm:inline-flex p-1.5 rounded-lg text-amber-100 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
              title={isMaximized ? 'छोटा करें' : 'बड़ा करें'}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-amber-100 hover:text-white hover:bg-white/20 transition-colors cursor-pointer ml-0.5"
              title={lang === 'hi' ? 'बंद करें' : 'Close'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Language Switcher Bar */}
        <div className="relative z-10 mt-3 pt-2.5 border-t border-white/15 flex items-center justify-between text-xs">
          <span className="text-[11px] text-amber-100 font-semibold flex items-center gap-1">
            <span>भाषा / Language:</span>
          </span>
          <div className="flex items-center gap-1 bg-black/20 p-0.5 rounded-xl border border-white/20">
            {(['hi', 'hinglish', 'en'] as AssistantLanguage[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => onLanguageChange(l)}
                className={`px-2.5 py-0.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  lang === l
                    ? 'bg-white text-orange-700 shadow-sm'
                    : 'text-amber-100 hover:text-white hover:bg-white/10'
                }`}
              >
                {getLanguageLabel(l)}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Clear Confirmation Banner */}
      {showClearConfirm && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-xs text-amber-900 shrink-0">
          <span className="font-semibold">
            {lang === 'hi' ? 'क्या आप पूरी चैट हटाना चाहते हैं?' : 'Clear all conversation history?'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleConfirmClear}
              className="px-2 py-0.5 bg-red-600 text-white font-bold rounded-md hover:bg-red-700 transition cursor-pointer text-[11px]"
            >
              {lang === 'hi' ? 'हाँ, हटाएं' : 'Yes, Clear'}
            </button>
            <button
              type="button"
              onClick={() => setShowClearConfirm(false)}
              className="px-2 py-0.5 bg-stone-200 text-stone-700 font-bold rounded-md hover:bg-stone-300 transition cursor-pointer text-[11px]"
            >
              {lang === 'hi' ? 'नहीं' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* Attachment Validation Error Banner */}
      {attachmentError && (
        <div className="bg-red-50 border-b border-red-200 px-3.5 py-2 flex items-center justify-between text-xs text-red-800 shrink-0 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="font-bold text-[11px]">{attachmentError}</span>
          </div>
          <button
            type="button"
            onClick={() => setAttachmentError(null)}
            className="text-red-500 hover:text-red-800 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Permission Denied Graceful Alert Banner */}
      {voicePermissionError && (
        <div className="bg-red-50 border-b border-red-200 px-3.5 py-2.5 flex items-start justify-between gap-2 text-xs text-red-800 shrink-0">
          <div className="flex items-start gap-2 flex-1">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-900 leading-tight">माइक्रोफोन अनुमति अस्वीकृत (Permission Denied)</p>
              <p className="text-[11px] text-red-700 mt-0.5 leading-snug">
                माइक बंद है। आप नीचे टेक्स्ट बॉक्स में टाइप करके सामान्य रूप से अपनी सेवा बुक कर सकते हैं।
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleToggleVoiceRecording}
              className="px-2 py-1 bg-red-600 text-white rounded-md text-[11px] font-bold hover:bg-red-700 transition cursor-pointer"
            >
              पुनः प्रयास
            </button>
            <button
              type="button"
              onClick={() => setVoicePermissionError(null)}
              className="p-1 text-red-500 hover:text-red-700 rounded-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Booking Summary Card removed per user request */}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50/70 text-sm">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const isThisSpeaking = activeSpeakingId === msg.id && ttsPlaybackState === 'playing';
          const isThisPaused = activeSpeakingId === msg.id && ttsPlaybackState === 'paused';

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} transition-opacity duration-200`}
            >
              {/* Sender Tag */}
              <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-stone-500 font-medium">
                {!isUser ? (
                  <>
                    <Bot className="w-3.5 h-3.5 text-orange-600" />
                    <span className="font-bold text-stone-700">KaamDost AI</span>
                  </>
                ) : (
                  <span>{userName || (lang === 'hi' ? 'आप' : 'You')}</span>
                )}
                <span>•</span>
                <span>{msg.timestamp}</span>
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[88%] sm:max-w-[82%] rounded-2xl px-4 py-3 shadow-sm leading-relaxed whitespace-pre-line ${
                  isUser
                    ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-br-none shadow-orange-500/10'
                    : 'bg-sky-100/90 text-sky-950 border border-sky-200/90 rounded-bl-none shadow-sky-100/50'
                }`}
              >
                {msg.text}

                {/* Multimedia Attachments Rendering (Phase 4) */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <MessageAttachments attachments={msg.attachments} />
                )}

                {/* Voice Audio Toolbar on Assistant Messages (Phase 3 TTS) */}
                {!isUser && (
                  <div className="mt-2.5 pt-2 border-t border-sky-200/60 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {!isThisSpeaking && !isThisPaused ? (
                        <button
                          type="button"
                          onClick={() => handlePlayVoice(msg.id, msg.text)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-200/80 hover:bg-sky-300/80 text-sky-950 text-[11px] font-bold transition cursor-pointer active:scale-95 border border-sky-300/60"
                          title="आवाज़ में सुनें (Listen to response)"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-sky-700" />
                          <span>सुनें (Listen)</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1">
                          {isThisSpeaking && (
                            <button
                              type="button"
                              onClick={handlePauseVoice}
                              className="p-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 transition cursor-pointer"
                              title="रोकें (Pause)"
                            >
                              <Pause className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isThisPaused && (
                            <button
                              type="button"
                              onClick={handleResumeVoice}
                              className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 transition cursor-pointer"
                              title="जारी रखें (Resume)"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={handleStopVoice}
                            className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-900 transition cursor-pointer"
                            title="बंद करें (Stop)"
                          >
                            <Square className="w-3 h-3 fill-red-800 text-red-800" />
                          </button>
                        </div>
                      )}

                      {/* Speaking Waveform Animation */}
                      {isThisSpeaking && (
                        <div className="flex items-center gap-0.5 px-2 py-1 bg-orange-100 rounded-md">
                          <span className="w-1 h-2.5 bg-orange-600 rounded-full animate-pulse" />
                          <span className="w-1 h-4 bg-orange-600 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                          <span className="w-1 h-3 bg-orange-600 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                          <span className="text-[10px] font-bold text-orange-800 ml-1">बोल रहा है...</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleCycleSpeed}
                      className="text-[10px] font-bold text-stone-500 hover:text-stone-800 px-1.5 py-0.5 rounded bg-stone-100 hover:bg-stone-200 transition"
                      title="Speech Rate"
                    >
                      {ttsSpeed}x
                    </button>
                  </div>
                )}

                {/* Dynamic Interactive Component (Phase 2) */}
                {!isUser && msg.dynamicComponent && (
                  <DynamicChatRenderer
                    component={msg.dynamicComponent}
                    lang={lang}
                    onAction={handleComponentAction}
                    disabled={isTyping}
                  />
                )}

                {/* Interactive Action Cards */}
                {!isUser && msg.actions && msg.actions.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-stone-100 flex flex-col gap-1.5">
                    {msg.actions.map((act, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleActionClick(act)}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-200/80 font-bold text-xs transition-all text-left cursor-pointer group active:scale-[0.98]"
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <Sparkles className="w-3.5 h-3.5 text-orange-600 shrink-0 group-hover:rotate-12 transition-transform" />
                          <span className="truncate">{act.label}</span>
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-orange-600 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Inline Suggestions / Followup chips */}
              {!isUser && msg.suggestedChips && msg.suggestedChips.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 max-w-[95%]">
                  {msg.suggestedChips.map((chip, cIdx) => (
                    <button
                      key={cIdx}
                      type="button"
                      onClick={() => handleSendMessage(chip)}
                      className="px-2.5 py-1 rounded-full bg-white hover:bg-orange-50 text-stone-700 hover:text-orange-700 border border-stone-200 hover:border-orange-300 text-[11px] font-semibold transition shadow-xs cursor-pointer"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Typing Animation Indicator */}
        {isTyping && (
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-stone-500 font-medium">
              <Bot className="w-3.5 h-3.5 text-orange-600" />
              <span className="font-bold text-stone-700">KaamDost AI</span>
              <span>•</span>
              <span className="text-orange-600 italic">
                {lang === 'hi' ? 'टाइप कर रहा है...' : lang === 'hinglish' ? 'Typing...' : 'Thinking...'}
              </span>
            </div>

            <div className="bg-sky-100/90 border border-sky-200/90 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-600 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-sky-600 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-sky-600 animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="text-xs text-sky-900 font-medium ml-1">
                {lang === 'hi' ? 'जवाब तैयार कर रहा हूँ...' : 'Preparing response...'}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Active Recording Waveform Overlay (Phase 3 Voice STT) */}
      {isRecording && (
        <div className="bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 text-white p-3.5 shadow-lg flex flex-col gap-2 shrink-0 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-200" />
              </span>
              <span className="text-xs font-black tracking-wide">
                {lang === 'hi' ? 'KaamDost सुन रहा है... बोलिए' : 'Listening to your voice... Speak now'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold bg-black/30 px-2 py-0.5 rounded-md">
                {formatSeconds(recordingDuration)}
              </span>
              <button
                type="button"
                onClick={handleToggleVoiceRecording}
                className="px-2.5 py-1 bg-white text-red-700 hover:bg-stone-100 rounded-lg text-xs font-black shadow transition active:scale-95 cursor-pointer flex items-center gap-1"
              >
                <Square className="w-3 h-3 fill-red-700" />
                <span>पूरा हुआ (Done)</span>
              </button>
            </div>
          </div>

          {/* Real-time Audio Waveform Simulator */}
          <div className="flex items-center justify-center gap-1 py-1">
            {[4, 8, 12, 16, 20, 16, 12, 8, 14, 18, 10, 6].map((h, i) => (
              <span
                key={i}
                className="w-1 bg-white/90 rounded-full animate-pulse"
                style={{
                  height: `${h * 1.5}px`,
                  animationDuration: `${400 + (i % 4) * 150}ms`,
                }}
              />
            ))}
          </div>

          {/* Live Interim Transcript Display */}
          <div className="bg-black/20 rounded-xl px-3 py-1.5 text-xs text-amber-100 min-h-[28px] italic flex items-center">
            {interimTranscript ? (
              <span>"{interimTranscript}..."</span>
            ) : (
              <span className="opacity-70">
                {lang === 'hi' ? 'आवाज़ पहचानी जा रही है (बोलना जारी रखें)...' : 'Detecting voice (keep speaking)...'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Voice Transcript Edit Hint Notice */}
      {voiceNotice && !isRecording && (
        <div className="bg-emerald-50 border-t border-emerald-200 px-3 py-1.5 flex items-center justify-between text-xs text-emerald-800 shrink-0">
          <span className="font-semibold truncate flex items-center gap-1">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>{voiceNotice}</span>
          </span>
          <button
            type="button"
            onClick={() => setVoiceNotice(null)}
            className="text-emerald-600 hover:text-emerald-800 p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Quick Action Chips Bar */}
      <div className="bg-stone-100/90 border-t border-stone-200 px-3 py-2 overflow-x-auto no-scrollbar shrink-0">
        <div className="flex items-center gap-1.5 min-w-max">
          {currentChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => handleSendMessage(chip.query)}
              disabled={isTyping}
              className="px-3 py-1.5 rounded-full bg-white hover:bg-orange-500 hover:text-white text-stone-800 border border-stone-300 hover:border-orange-500 text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <span>{chip.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Attachment Preview Tray (Phase 4: Staged Media above Composer) */}
      <AttachmentPreviewTray
        attachments={stagedAttachments}
        onRemove={handleRemoveAttachment}
        onRetry={handleRetryAttachment}
        onReplace={handleReplaceAttachment}
        lang={lang}
      />

      {/* Message Input Box with Multimedia & Voice */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3 bg-white border-t border-stone-200 shrink-0"
      >
        <div className="flex items-center gap-1.5 bg-stone-100 rounded-2xl p-1.5 border border-stone-300 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-100 transition-all">
          {/* Multimedia Attachment Trigger Button (Phase 4) */}
          <button
            type="button"
            onClick={() => setShowAttachmentMenu(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white hover:bg-orange-100 text-stone-700 hover:text-orange-700 border border-stone-200 transition active:scale-95 cursor-pointer shadow-xs"
            title={lang === 'hi' ? 'फोटो / वीडियो / दस्तावेज़ जोड़ें' : 'Attach photo/video/doc'}
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Microphone Recording Trigger Button (Phase 3) */}
          <button
            type="button"
            onClick={handleToggleVoiceRecording}
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition active:scale-95 cursor-pointer shadow-xs ${
              isRecording
                ? 'bg-red-600 text-white animate-pulse ring-2 ring-red-400'
                : 'bg-white hover:bg-orange-100 text-stone-700 hover:text-orange-700 border border-stone-200'
            }`}
            title={
              isRecording
                ? 'रिकॉर्डिंग रोकें (Stop Recording)'
                : 'बोलकर लिखें (Click to speak in Hindi/English)'
            }
          >
            {isRecording ? <Square className="w-4 h-4 fill-white" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Editable Text Input */}
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isTyping}
            placeholder={
              isRecording
                ? 'आवाज़ रिकॉर्ड हो रही है...'
                : stagedAttachments.length > 0
                ? 'फोटो/वीडियो के साथ विवरण लिखें...'
                : lang === 'hi'
                ? 'यहाँ लिखें या माइक दबाकर बोलें...'
                : lang === 'hinglish'
                ? 'Yahan likhein ya Mic dabakar bolein...'
                : 'Type or attach media...'
            }
            className="flex-1 bg-transparent px-2 py-1.5 text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={(!inputText.trim() && stagedAttachments.length === 0) || isTyping}
            className="w-9 h-9 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white flex items-center justify-center shrink-0 hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer shadow-sm shadow-orange-500/20"
            title={lang === 'hi' ? 'संदेश भेजें' : 'Send'}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[10px] text-stone-400 mt-1.5 px-2">
          <span>HARDINKAAM 🤝 वॉयस + मीडिया चैट</span>
          <span className="flex items-center gap-1 text-emerald-600 font-semibold">
            <ShieldCheck className="w-3 h-3" />
            100% सुरक्षित अपलोड
          </span>
        </div>
      </form>

      {/* Attachment Action Menu Popup */}
      <AttachmentActionMenu
        isOpen={showAttachmentMenu}
        onClose={() => setShowAttachmentMenu(false)}
        onSelectCamera={() => cameraInputRef.current?.click()}
        onSelectGallery={() => galleryInputRef.current?.click()}
        onSelectMultiplePhotos={() => multiPhotosInputRef.current?.click()}
        onSelectVideo={() => videoInputRef.current?.click()}
        onSelectPdf={() => pdfInputRef.current?.click()}
        onSelectDoc={() => docInputRef.current?.click()}
        lang={lang}
      />
    </aside>
  );
};
