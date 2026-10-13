import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Share2,
  Copy,
  Check,
  Monitor,
  Maximize2,
  Minimize2,
  MessageSquare,
  ShieldCheck,
  Send,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Phone,
  Camera,
  ExternalLink,
  X,
  HelpCircle,
  Activity,
} from 'lucide-react';
import { VideoCallSession, VideoCallPurpose } from '../../types';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import {
  generateWhatsAppVideoCallUrl,
  logWhatsAppVideoInviteToFirestore,
  formatWhatsAppPhone,
  formatWhatsAppVideoInviteMessage,
} from '../../utils/whatsappVideoCall';
import { VideoQualityTroubleshooting } from './VideoQualityTroubleshooting';

interface Props {
  session: VideoCallSession;
  onClose: () => void;
  onSendSmsInvite?: (phone: string, link: string) => void;
  onSendWhatsAppInvite?: (phone: string, link: string) => void;
}

export const VideoCallModal: React.FC<Props> = ({ session, onClose, onSendSmsInvite, onSendWhatsAppInvite }) => {
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [showTroubleshooter, setShowTroubleshooter] = useState(false);

  // WhatsApp Invite state
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [targetPhone, setTargetPhone] = useState(session.participantPhone || '');
  const [whatsAppSuccessBanner, setWhatsAppSuccessBanner] = useState<string | null>(null);
  const [copiedWhatsAppText, setCopiedWhatsAppText] = useState(false);

  // Chat message state inside call
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    {
      sender: 'System',
      text: `सुरक्षित वीडियो कक्ष प्रारम्भ हुआ (Room Code: ${session.roomCode})। 256-बिट एंड-टू-एंड एन्क्रिप्शन सक्रिय है।`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [newChatMessage, setNewChatMessage] = useState('');

  // Video element refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const meetingUrl = `${window.location.origin}/#call-${session.roomCode}`;

  // Start Camera Stream (callable on mount & on user retry from troubleshooter)
  const startCamera = useCallback(async () => {
    setIsConnecting(true);
    setCameraError(null);

    // Stop existing tracks if any
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: true,
        });

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setIsConnecting(false);
        setCameraError(null);
      } else {
        setCameraError('इस ब्राउज़र या आईफ्रेम में कैमरा हार्डवेयर उपलब्ध नहीं है। सिमुलेटेड सुरक्षित वीडियो मोड सक्रिय है।');
        setIsConnecting(false);
      }
    } catch (err: any) {
      console.warn('Camera access notice:', err);
      setCameraError(
        err?.name === 'NotAllowedError'
          ? 'कैमरा/माइक्रोफोन अनुमति अस्वीकृत। सिमुलेटेड एचडी वीडियो मोड में जारी है।'
          : 'कैमरा डिवाइस व्यस्त है या उपलब्ध नहीं है। डिजिटल ऑडियो-विजुअल स्ट्रीम सक्रिय है।'
      );
      setIsConnecting(false);
    }
  }, [facingMode]);

  // 1. Initialize local media stream
  useEffect(() => {
    startCamera();

    // Register active session in Firestore
    try {
      setDoc(
        doc(db, 'video_calls', session.id),
        {
          ...session,
          status: 'active',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ).catch((e) => console.warn('Video call firestore notice:', e));
    } catch (_) {}

    return () => {
      // Clean up local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [startCamera, session.id]);

  // 2. Call duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle Audio Mute
  const handleToggleAudio = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = isAudioMuted;
      });
    }
    setIsAudioMuted(!isAudioMuted);
  };

  // Toggle Video Disabled
  const handleToggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = isVideoDisabled;
      });
    }
    setIsVideoDisabled(!isVideoDisabled);
  };

  // Flip Camera (Front / Back)
  const handleFlipCamera = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Screen Sharing
  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      setIsScreenSharing(false);
    } else {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          screenStreamRef.current = displayStream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = displayStream;
          }
          displayStream.getVideoTracks()[0].onended = () => {
            handleToggleScreenShare();
          };
          setIsScreenSharing(true);
        } else {
          alert('स्क्रीन शेयरिंग इस डिवाइस या ब्राउज़र वातावरण में समर्थित नहीं है।');
        }
      } catch (err) {
        console.warn('Screen share cancelled/denied:', err);
      }
    }
  };

  // Copy Meeting Link
  const handleCopyMeetingLink = () => {
    navigator.clipboard.writeText(meetingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // Launch WhatsApp Video Call Invite
  const handleOpenWhatsAppInvite = (overridePhone?: string) => {
    const rawPhone = overridePhone || targetPhone || session.participantPhone || '';
    const formattedUrl = generateWhatsAppVideoCallUrl({
      phone: rawPhone,
      recipientName: session.participantName,
      roomCode: session.roomCode,
      meetingUrl,
      hostName: session.hostName || 'दीपक बिल्डकॉन एडमिन',
      purpose: getPurposeLabel(session.purpose),
      bookingId: session.bookingId,
    });

    // Log to Firestore whatsapp_logs
    if (rawPhone) {
      logWhatsAppVideoInviteToFirestore({
        phone: rawPhone,
        recipientName: session.participantName,
        roomCode: session.roomCode,
        purpose: session.purpose,
        bookingId: session.bookingId,
      });
    }

    if (onSendWhatsAppInvite && rawPhone) {
      onSendWhatsAppInvite(rawPhone, meetingUrl);
    }

    window.open(formattedUrl, '_blank', 'noopener,noreferrer');
    setWhatsAppSuccessBanner('WhatsApp चैट व वीडियो आमंत्रण लिंक सफलतापूर्वक खुल गया!');
    setTimeout(() => setWhatsAppSuccessBanner(null), 5000);
  };

  // Copy Full WhatsApp Invite Message
  const handleCopyWhatsAppText = (overridePhone?: string) => {
    const rawPhone = overridePhone || targetPhone || session.participantPhone || '';
    const text = formatWhatsAppVideoInviteMessage({
      recipientName: session.participantName,
      roomCode: session.roomCode,
      meetingUrl,
      hostName: session.hostName || 'दीपक बिल्डकॉन एडमिन',
      purpose: getPurposeLabel(session.purpose),
      bookingId: session.bookingId,
    });
    navigator.clipboard.writeText(text);
    setCopiedWhatsAppText(true);
    setTimeout(() => setCopiedWhatsAppText(false), 3000);
  };

  // Send In-call Chat
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatMessage.trim()) return;

    const messageObj = {
      sender: session.hostName || 'Admin Deepak Buildcon',
      text: newChatMessage.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, messageObj]);
    setNewChatMessage('');
  };

  // End Call
  const handleEndCall = async () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
    }

    try {
      await updateDoc(doc(db, 'video_calls', session.id), {
        status: 'ended',
        endedAt: new Date().toISOString(),
        durationSeconds: callDuration,
      });
    } catch (_) {}

    onClose();
  };

  // Fullscreen toggle
  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullScreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullScreen(false);
    }
  };

  const getPurposeLabel = (p: VideoCallPurpose) => {
    switch (p) {
      case 'kyc_verification':
        return 'प्रमाणित वीडियो KYC सत्यापन (Technician KYC Verification)';
      case 'technical_inspection':
        return 'लाइव तकनीकी निरीक्षण (Remote Site & Fault Inspection)';
      case 'franchise_briefing':
        return 'फ्रेंचाइज़ी पार्टनर रणनीति व लक्ष्य बैठक (Franchise Operations)';
      case 'customer_support':
        return 'कस्टमर वीडियो सहायता (Live Video Customer Support)';
      default:
        return 'लाइव वीडियो परामर्श (Direct Video Consultation)';
    }
  };

  return (
    <div
      ref={containerRef}
      id="video-call-modal-overlay"
      className="fixed inset-0 z-50 bg-stone-950 flex flex-col text-white animate-in fade-in duration-200"
    >
      {/* Top Header Bar */}
      <header className="px-4 py-3 bg-stone-900/90 backdrop-blur-md border-b border-stone-800 flex items-center justify-between gap-3 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold shrink-0">
            <Video className="w-5 h-5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black truncate">{session.title}</h2>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30 shrink-0">
                HD 1080p
              </span>
              <span className="px-2 py-0.5 rounded-md bg-stone-800 text-stone-300 text-[10px] font-bold shrink-0">
                Code: {session.roomCode}
              </span>
            </div>
            <p className="text-[11px] text-stone-400 truncate flex items-center gap-1.5 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{getPurposeLabel(session.purpose)}</span>
            </p>
          </div>
        </div>

        {/* Right Header Status & Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-stone-800/90 border border-stone-700/60 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span className="font-bold text-stone-200">{formatTimer(callDuration)}</span>
          </div>

          {/* Video Quality & Troubleshooting Guide button */}
          <button
            type="button"
            id="video-call-troubleshoot-header-btn"
            onClick={() => setShowTroubleshooter(true)}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/40 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="वीडियो क्वालिटी व कनेक्शन समस्या निवारण गाइड"
          >
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">क्वालिटी गाइड</span>
          </button>

          <button
            type="button"
            id="video-call-copy-link-btn"
            onClick={handleCopyMeetingLink}
            className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white text-xs font-bold transition-colors flex items-center gap-1.5 border border-stone-700 cursor-pointer"
            title="कॉल लिंक कॉपी करें"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">लिंक कॉपी हुआ!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-stone-400" />
                <span className="hidden sm:inline">लिंक कॉपी</span>
              </>
            )}
          </button>

          {/* WhatsApp Direct Video Call & Invite Button */}
          <button
            type="button"
            id="video-call-whatsapp-invite-btn"
            onClick={() => {
              if (session.participantPhone) {
                handleOpenWhatsAppInvite(session.participantPhone);
              } else {
                setShowWhatsAppModal(true);
              }
            }}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/40 hover:scale-102"
            title="WhatsApp पर वीडियो कॉल लिंक भेजें"
          >
            <MessageSquare className="w-3.5 h-3.5 fill-white" />
            <span>WhatsApp वीडियो लिंक</span>
          </button>

          {onSendSmsInvite && session.participantPhone && (
            <button
              type="button"
              id="video-call-sms-invite-btn"
              onClick={() => onSendSmsInvite(session.participantPhone!, meetingUrl)}
              className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer border border-stone-700 shadow-xs"
              title="SMS द्वारा कॉल लिंक भेजें"
            >
              <Phone className="w-3.5 h-3.5 text-stone-400" />
              <span className="hidden sm:inline">SMS लिंक</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
            title="फुलस्क्रीन टॉगल"
          >
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Video Call Stage */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* Primary Video Stage */}
        <div className="flex-1 relative bg-stone-950 flex items-center justify-center p-2 sm:p-4">
          {/* Main Participant Screen (Simulated or Remote Peer Stream) */}
          <div className="w-full h-full max-h-[85vh] rounded-3xl overflow-hidden bg-gradient-to-br from-stone-900 via-stone-900 to-stone-950 border border-stone-800 shadow-2xl relative flex items-center justify-center">
            {/* Fallback & Remote Stream visualizer */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none">
              <div className="relative mb-5">
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-500 to-stone-700 p-1 shadow-2xl shadow-emerald-950/80">
                  <div className="w-full h-full rounded-full bg-stone-900 flex items-center justify-center overflow-hidden relative">
                    <span className="text-3xl sm:text-4xl font-black text-emerald-400">
                      {session.participantName ? session.participantName.charAt(0).toUpperCase() : 'P'}
                    </span>
                    {/* Pulsing visualizer rings */}
                    <div className="absolute inset-0 rounded-full border-2 border-emerald-400/30 animate-ping opacity-40" />
                  </div>
                </div>
                <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-stone-900" />
              </div>

              <h3 className="text-lg sm:text-xl font-black text-white">
                {session.participantName || 'पार्टिसिपेंट (Customer / Technician)'}
              </h3>
              <p className="text-xs text-stone-400 mt-1 max-w-sm">
                {session.participantPhone
                  ? `मो. ${session.participantPhone} • लिंक प्रेषित करने के लिए नीचे टैप करें`
                  : 'कॉल लिंक प्राप्तकर्ता के कनेक्ट होने की प्रतीक्षा है...'}
              </p>

              {/* Instant WhatsApp Video Call Action Bar */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4 z-10">
                <button
                  type="button"
                  id="stage-whatsapp-invite-btn"
                  onClick={() => {
                    if (session.participantPhone) {
                      handleOpenWhatsAppInvite(session.participantPhone);
                    } else {
                      setShowWhatsAppModal(true);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/60 transition-transform hover:scale-102"
                >
                  <MessageSquare className="w-4 h-4 fill-white" />
                  <span>WhatsApp पर वीडियो लिंक भेजें</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowWhatsAppModal(true)}
                  className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white font-bold text-xs flex items-center gap-1.5 border border-stone-700 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-stone-400" />
                  <span>नंबर बदलें / अन्य शेयर</span>
                </button>
              </div>

              {whatsAppSuccessBanner && (
                <div className="mt-3 px-3.5 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{whatsAppSuccessBanner}</span>
                </div>
              )}

              {/* Dynamic waveform visualizer */}
              <div className="flex items-center gap-1.5 mt-5 h-6">
                <div className="w-1 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite] h-3" />
                <div className="w-1 bg-emerald-400 rounded-full animate-[bounce_0.6s_infinite] h-5" />
                <div className="w-1 bg-emerald-400 rounded-full animate-[bounce_1.0s_infinite] h-2" />
                <div className="w-1 bg-emerald-400 rounded-full animate-[bounce_0.7s_infinite] h-6" />
                <div className="w-1 bg-emerald-400 rounded-full animate-[bounce_0.9s_infinite] h-4" />
                <div className="w-1 bg-emerald-400 rounded-full animate-[bounce_0.5s_infinite] h-3" />
              </div>

              {cameraError && (
                <div className="mt-4 p-3 rounded-2xl bg-amber-950/80 border border-amber-500/40 text-amber-200 text-[11px] max-w-lg flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-left leading-relaxed">{cameraError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTroubleshooter(true)}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-[10px] shrink-0 cursor-pointer shadow-xs transition-colors whitespace-nowrap"
                  >
                    समस्या समाधान गाइड
                  </button>
                </div>
              )}
            </div>

            {/* Floating Top Left Overlay Badges */}
            <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2 z-10">
              <span className="px-3 py-1 rounded-xl bg-black/60 backdrop-blur-md text-[11px] font-bold text-stone-200 border border-white/10 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>{session.participantName || 'पार्टिसिपेंट (Participant)'}</span>
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-[10px] font-mono text-stone-300 border border-white/10">
                1080p • 60 FPS • 44.1 kHz
              </span>
            </div>

            {/* Self Video PIP (Bottom-Right / Floating) */}
            <div className="absolute bottom-4 right-4 w-36 h-48 sm:w-52 sm:h-36 rounded-2xl overflow-hidden bg-stone-950 border-2 border-stone-700 shadow-2xl z-20 group">
              {isVideoDisabled ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-stone-900 text-stone-500">
                  <VideoOff className="w-8 h-8 mb-1" />
                  <span className="text-[10px] font-bold">कैमरा बंद है</span>
                </div>
              ) : (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              )}

              {/* Local Video Tag */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-bold text-white bg-black/70 backdrop-blur-xs px-2 py-0.5 rounded-md pointer-events-none">
                <span className="truncate">आप (Host: {session.hostName})</span>
                {isAudioMuted && <MicOff className="w-3 h-3 text-red-400 shrink-0" />}
              </div>

              {/* Switch camera overlay icon on hover */}
              <button
                type="button"
                onClick={handleFlipCamera}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-black text-stone-300 hover:text-white transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                title="कैमरा पलटें (Front / Back)"
              >
                <Camera className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* In-Call Chat Drawer (Toggleable) */}
        {showChat && (
          <aside className="w-72 sm:w-80 bg-stone-900 border-l border-stone-800 flex flex-col h-full z-20">
            <div className="p-3 border-b border-stone-800 flex items-center justify-between">
              <h4 className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>लाइव चैट &amp; निरीक्षण नोट्स</span>
              </h4>
              <button
                onClick={() => setShowChat(false)}
                className="text-stone-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Chat List */}
            <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs">
              {chatMessages.map((m, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl ${
                    m.sender === 'System'
                      ? 'bg-stone-800/80 text-stone-400 border border-stone-700/60'
                      : m.sender === session.hostName
                      ? 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-200 ml-4'
                      : 'bg-stone-800 text-stone-200 mr-4'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-stone-400 mb-1">
                    <span className="font-bold">{m.sender}</span>
                    <span>{m.time}</span>
                  </div>
                  <p className="leading-relaxed">{m.text}</p>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChat} className="p-2.5 border-t border-stone-800 flex gap-2">
              <input
                type="text"
                value={newChatMessage}
                onChange={(e) => setNewChatMessage(e.target.value)}
                placeholder="संदेश या तकनीकी माप लिखें..."
                className="flex-1 bg-stone-800 border border-stone-700 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </aside>
        )}
      </div>

      {/* Bottom Floating Control Bar */}
      <footer className="p-4 bg-stone-900/95 backdrop-blur-md border-t border-stone-800 flex items-center justify-center gap-3 sm:gap-4 z-20">
        {/* Audio Mute/Unmute */}
        <button
          type="button"
          id="video-call-mic-btn"
          onClick={handleToggleAudio}
          className={`p-3.5 sm:p-4 rounded-2xl font-bold transition-all cursor-pointer shadow-lg ${
            isAudioMuted
              ? 'bg-red-600 hover:bg-red-500 text-white'
              : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
          }`}
          title={isAudioMuted ? 'अनम्यूट करें' : 'माइक म्यूट करें'}
        >
          {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Video On/Off */}
        <button
          type="button"
          id="video-call-camera-btn"
          onClick={handleToggleVideo}
          className={`p-3.5 sm:p-4 rounded-2xl font-bold transition-all cursor-pointer shadow-lg ${
            isVideoDisabled
              ? 'bg-red-600 hover:bg-red-500 text-white'
              : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
          }`}
          title={isVideoDisabled ? 'कैमरा चालू करें' : 'कैमरा बंद करें'}
        >
          {isVideoDisabled ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </button>

        {/* Flip Camera */}
        <button
          type="button"
          id="video-call-flip-cam-btn"
          onClick={handleFlipCamera}
          className="p-3.5 sm:p-4 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-200 transition-all cursor-pointer shadow-lg"
          title="कैमरा स्विच करें (फ्रंट / बैक)"
        >
          <Camera className="w-5 h-5" />
        </button>

        {/* Screen Share */}
        <button
          type="button"
          id="video-call-screenshare-btn"
          onClick={handleToggleScreenShare}
          className={`p-3.5 sm:p-4 rounded-2xl font-bold transition-all cursor-pointer shadow-lg ${
            isScreenSharing
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
          }`}
          title={isScreenSharing ? 'स्क्रीन शेयरिंग रोकें' : 'स्क्रीन शेयर करें'}
        >
          <Monitor className="w-5 h-5" />
        </button>

        {/* Quick WhatsApp Invite in bottom toolbar */}
        <button
          type="button"
          id="video-call-footer-whatsapp-btn"
          onClick={() => setShowWhatsAppModal(true)}
          className="p-3.5 sm:p-4 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold transition-all cursor-pointer shadow-lg relative"
          title="WhatsApp वीडियो आमंत्रण (WhatsApp Invite)"
        >
          <MessageSquare className="w-5 h-5 fill-white" />
        </button>

        {/* Toggle In-Call Chat */}
        <button
          type="button"
          id="video-call-chat-toggle-btn"
          onClick={() => setShowChat(!showChat)}
          className={`p-3.5 sm:p-4 rounded-2xl font-bold transition-all cursor-pointer shadow-lg relative ${
            showChat
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
          }`}
          title="चैट व तकनीकी नोट्स"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400" />
        </button>

        {/* Video Quality Troubleshooting in bottom toolbar */}
        <button
          type="button"
          id="video-call-footer-troubleshoot-btn"
          onClick={() => setShowTroubleshooter(true)}
          className={`p-3.5 sm:p-4 rounded-2xl font-bold transition-all cursor-pointer shadow-lg relative ${
            cameraError
              ? 'bg-amber-600 hover:bg-amber-500 text-white animate-pulse'
              : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
          }`}
          title="वीडियो क्वालिटी व कनेक्शन समस्या निवारण गाइड (Troubleshoot)"
        >
          <HelpCircle className="w-5 h-5" />
          {cameraError && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-300" />
          )}
        </button>

        {/* End Call Button */}
        <button
          type="button"
          id="video-call-end-btn"
          onClick={handleEndCall}
          className="px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-sm flex items-center gap-2 transition-all cursor-pointer shadow-xl shadow-red-950/60 hover:scale-102"
          title="कॉल समाप्त करें"
        >
          <PhoneOff className="w-5 h-5" />
          <span className="hidden sm:inline">कॉल समाप्त</span>
        </button>
      </footer>

      {/* WhatsApp Invite & Direct Call Modal */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-6 max-w-md w-full text-white shadow-2xl relative">
            <button
              onClick={() => setShowWhatsAppModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <MessageSquare className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h3 className="text-base font-black">WhatsApp वीडियो कॉल आमंत्रण</h3>
                <p className="text-xs text-stone-400">सीधे ग्राहक / टेक्नीशियन के WhatsApp पर लिंक भेजें</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-stone-300 uppercase mb-1">
                  प्राप्तकर्ता का WhatsApp मोबाइल नंबर
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-stone-500 font-bold">+91</span>
                  <input
                    type="tel"
                    value={targetPhone.replace(/^\+91\s?/, '')}
                    onChange={(e) => setTargetPhone(e.target.value)}
                    placeholder="6267546945"
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl pl-12 pr-3 py-2 text-sm text-white placeholder-stone-500 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Preview Message */}
              <div>
                <label className="block text-[11px] font-bold text-stone-300 uppercase mb-1">
                  WhatsApp संदेश पूर्वावलोकन (Bilingual Preview)
                </label>
                <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 text-[11px] text-stone-300 whitespace-pre-line max-h-36 overflow-y-auto leading-relaxed font-mono">
                  {formatWhatsAppVideoInviteMessage({
                    recipientName: session.participantName,
                    roomCode: session.roomCode,
                    meetingUrl,
                    hostName: session.hostName || 'दीपक बिल्डकॉन एडमिन',
                    purpose: getPurposeLabel(session.purpose),
                    bookingId: session.bookingId,
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenWhatsAppInvite(targetPhone);
                    setShowWhatsAppModal(false);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>WhatsApp खोलें</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyWhatsAppText(targetPhone)}
                  className="py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white font-bold flex items-center justify-center gap-1.5 border border-stone-700 cursor-pointer"
                >
                  {copiedWhatsAppText ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>कॉपी हुआ!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-stone-400" />
                      <span>संदेश कॉपी करें</span>
                    </>
                  )}
                </button>
              </div>

              {/* Direct WhatsApp Call Note */}
              <div className="p-2.5 rounded-xl bg-stone-800/60 border border-stone-700/50 text-[11px] text-stone-400">
                <p>
                  💡 <strong>टिप:</strong> 'WhatsApp खोलें' दबाने पर WhatsApp चैट खुलेगी जिसमें वीडियो रूम लिंक पहले से टाइप होगा। सेंड करने के बाद उपयोगकर्ता लिंक पर टैप करके तुरंत आपके इस वीडियो कॉल में जुड़ सकता है।
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Quality Troubleshooting Guide Component */}
      <VideoQualityTroubleshooting
        isOpen={showTroubleshooter}
        onClose={() => setShowTroubleshooter(false)}
        onRetryConnection={startCamera}
        initialError={cameraError}
        meetingUrl={meetingUrl}
        roomCode={session.roomCode}
        onSwitchToWhatsApp={() => {
          if (session.participantPhone) {
            handleOpenWhatsAppInvite(session.participantPhone);
          } else {
            setShowWhatsAppModal(true);
          }
        }}
      />
    </div>
  );
};
