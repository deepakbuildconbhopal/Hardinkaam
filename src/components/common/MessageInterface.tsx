import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Phone,
  MessageSquare,
  CheckCheck,
  User,
  Wrench,
  X,
  Sparkles,
  ShieldCheck,
  Camera,
  RefreshCw,
  MessageCircle,
} from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Booking, Message } from '../../types';
import { compressImageForWeb, formatBytes } from '../../utils/imageCompression';

interface Props {
  booking: Booking;
  onClose?: () => void;
  embedded?: boolean;
}

export const MessageInterface: React.FC<Props> = ({ booking, onClose, embedded = false }) => {
  const { currentUser, userProfile, activeRole } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [compressingImage, setCompressingImage] = useState(false);
  const [compressionNotice, setCompressionNotice] = useState<string | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number>(10);
  const [showEtaPicker, setShowEtaPicker] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatPhotoInputRef = useRef<HTMLInputElement>(null);

  const isCustomer = activeRole === 'customer';
  const partnerName = isCustomer
    ? booking.serviceManName || 'HARDINKAAM Professional'
    : booking.customerName || 'Customer';
  const partnerPhone = isCustomer ? booking.serviceManPhone : booking.customerPhone;

  // Mask phone number to avoid unnecessary full exposure
  const maskedPartnerPhone = partnerPhone
    ? partnerPhone.replace(/(\+?\d{2})?(\d{2})\d+(\d{4})/, '$1 $2•••• •$3')
    : null;

  // Real-time listener for messages in this booking (Protected by bookingId)
  useEffect(() => {
    if (!booking?.id) return;

    const q = query(
      collection(db, 'messages'),
      where('bookingId', '==', booking.id)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: Message[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Message);
        });
        list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setMessages(list);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      },
      (err) => {
        console.warn('Message stream notice:', err.message);
      }
    );

    return () => unsub();
  }, [booking?.id]);

  const handleSendMessage = async (textToSend?: string, attachedImageUrl?: string) => {
    const text = textToSend !== undefined ? textToSend : inputText;
    if ((!text.trim() && !attachedImageUrl) || sending) return;

    setSending(true);
    const nowIso = new Date().toISOString();

    const senderId = currentUser
      ? currentUser.uid
      : isCustomer
      ? booking.customerId
      : booking.serviceManId || 'pro_serviceman';

    const senderName =
      userProfile?.name ||
      currentUser?.displayName ||
      (isCustomer ? booking.customerName || 'Customer' : booking.serviceManName || 'Technician');

    const receiverId = isCustomer
      ? booking.serviceManId || 'pro_serviceman'
      : booking.customerId;

    try {
      const messagePayload: any = {
        bookingId: booking.id,
        senderId,
        senderName,
        receiverId,
        text: text.trim() || (attachedImageUrl ? '📷 Photo' : ''),
        timestamp: nowIso,
        read: false,
      };

      if (attachedImageUrl) {
        messagePayload.imageUrl = attachedImageUrl;
      }

      await addDoc(collection(db, 'messages'), messagePayload);
      setInputText('');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  // WhatsApp click-to-chat triggered EXCLUSIVELY by explicit user click
  const handleOpenWhatsApp = async () => {
    if (!partnerPhone) return;
    const cleanPhone = partnerPhone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
    const initialText = isCustomer
      ? `नमस्ते, मैं HARDINKAAM बुकिंग #${booking.id} (${booking.serviceName}) के संबंध में संपर्क कर रहा हूँ।`
      : `नमस्ते, मैं HARDINKAAM सर्विसमैन आपकी बुकिंग #${booking.id} (${booking.serviceName}) के लिए संपर्क कर रहा हूँ।`;

    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(initialText)}`;

    // User explicitly opened/tapped WhatsApp -> record log only on this user action
    try {
      await addDoc(collection(db, 'whatsapp_logs'), {
        bookingId: booking.id,
        initiatedBy: currentUser?.uid || (isCustomer ? booking.customerId : booking.serviceManId),
        initiatorRole: isCustomer ? 'customer' : 'serviceman',
        recipientPhone: partnerPhone,
        openedAt: new Date().toISOString(),
        action: 'user_opened_whatsapp_chat',
      });
    } catch (err) {
      console.warn('WhatsApp log notice:', err);
    }

    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  // Automatically compress photo for chat transmission
  const handleChatImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressingImage(true);
    setCompressionNotice('फोटो कंप्रेस हो रही है...');
    try {
      const compressed = await compressImageForWeb(file, {
        maxDimension: 900,
        quality: 0.82,
        maxSizeKB: 180,
      });

      setCompressionNotice(`ऑप्टिमाइज़्ड (${formatBytes(compressed.compressedSize)}, ${compressed.compressionRatio}% हल्का)`);
      await handleSendMessage('', compressed.dataUrl);
      setTimeout(() => setCompressionNotice(null), 3000);
    } catch (err: any) {
      console.error('Chat image compression failed:', err);
      setCompressionNotice('फोटो लोड विफल।');
      setTimeout(() => setCompressionNotice(null), 3000);
    } finally {
      setCompressingImage(false);
      if (chatPhotoInputRef.current) chatPhotoInputRef.current.value = '';
    }
  };

  // Explicitly requested quick message phrases
  const customerQuickMessages = [
    'मैं आपका इंतजार कर रहा हूँ',
    'आप कितनी देर में पहुँचेंगे?',
    'कृपया पहुँचने पर कॉल करें',
    'मैं घर पर उपलब्ध हूँ',
    'पता / लोकेशन ढूंढने में सहायता चाहिए?',
  ];

  const servicemanQuickMessages = [
    'मैं रास्ते में हूँ',
    `मैं लगभग ${etaMinutes} मिनट में पहुँचूँगा`,
    'मैं पहुँच गया हूँ',
    'कृपया कॉल उठाएं या दरवाजा खोलें',
    'काम शुरू करने के लिए OTP की आवश्यकता है',
  ];

  return (
    <div
      id={`message-interface-${booking.id}`}
      className={`flex flex-col bg-white overflow-hidden ${
        embedded
          ? 'rounded-2xl border border-stone-200 h-[490px]'
          : 'rounded-3xl border border-stone-200 h-[590px] max-h-[85vh] shadow-2xl'
      }`}
    >
      {/* Header */}
      <div className="p-3.5 sm:p-4 bg-gradient-to-r from-stone-900 to-orange-950 text-white flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-orange-600/30 border border-orange-500/40 flex items-center justify-center text-orange-400 font-bold">
            {isCustomer ? <Wrench className="w-5 h-5" /> : <User className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-xs sm:text-sm text-white truncate max-w-[180px] sm:max-w-xs">
                {partnerName}
              </h3>
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
              <span className="text-[10px] bg-white/15 text-stone-200 px-1.5 py-0.2 rounded font-medium">
                {isCustomer ? 'Service Professional' : 'Customer'}
              </span>
            </div>
            <p className="text-[11px] text-stone-300 truncate">
              Booking #{booking.id} • {booking.serviceName}
              {maskedPartnerPhone && (
                <span className="ml-1.5 text-stone-400 font-mono">({maskedPartnerPhone})</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {partnerPhone && (
            <>
              {/* Direct Native Call where capability supports it */}
              <a
                href={`tel:${partnerPhone}`}
                title={`Call ${partnerName}`}
                className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1 text-xs font-semibold shadow-xs"
              >
                <Phone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Call</span>
              </a>

              {/* Explicit User-Triggered WhatsApp Chat */}
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                title="Open WhatsApp Chat"
                className="p-2 rounded-xl bg-emerald-700/80 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1 text-xs font-semibold"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-300" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>
            </>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Security & Access Protection Banner */}
      <div className="bg-orange-50/70 px-3 py-1.5 border-b border-orange-100 flex items-center justify-between text-[11px] text-orange-900">
        <span className="flex items-center gap-1 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-orange-600 flex-shrink-0" />
          <span>HARDINKAAM Verified Booking Channel</span>
        </span>
        <span className="text-[10px] text-orange-700/80 font-bold uppercase tracking-wider">
          Status: {booking.status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50/60">
        {messages.length === 0 ? (
          <div className="text-center py-10 px-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-2.5">
              <MessageSquare className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-stone-800">Direct Chat with {partnerName}</p>
            <p className="text-[11px] text-stone-500 mt-1 max-w-xs mx-auto">
              Coordinate arrival timings, address landmarks, or service details in real-time.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isMine = currentUser
              ? m.senderId === currentUser.uid
              : isCustomer
              ? m.senderName === booking.customerName || m.senderId === booking.customerId
              : m.senderName === booking.serviceManName || m.senderId === booking.serviceManId;

            return (
              <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[82%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-xs ${
                    isMine
                      ? 'bg-orange-600 text-white rounded-br-xs'
                      : 'bg-white text-stone-900 border border-stone-200/90 rounded-bl-xs'
                  }`}
                >
                  {!isMine && (
                    <div className="text-[10px] font-bold text-orange-600 mb-0.5 flex items-center gap-1">
                      <span>{m.senderName}</span>
                    </div>
                  )}
                  {m.imageUrl && (
                    <div className="mb-1.5 rounded-lg overflow-hidden border border-stone-200/50 bg-stone-900/5">
                      <img
                        src={m.imageUrl}
                        alt="Shared Photo"
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="max-h-52 w-auto object-cover rounded-lg cursor-pointer hover:opacity-95 transition-opacity"
                        onClick={() => window.open(m.imageUrl, '_blank')}
                      />
                    </div>
                  )}
                  {m.text && m.text !== '📷 Photo' && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                  <div
                    className={`text-[9px] mt-1.5 flex items-center justify-end gap-1 ${
                      isMine ? 'text-orange-200' : 'text-stone-400'
                    }`}
                  >
                    <span>
                      {m.timestamp
                        ? new Date(m.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                    </span>
                    {isMine && <CheckCheck className="w-3 h-3 text-white" />}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ServiceMan ETA minute selector (for dynamic X minutes prompt) */}
      {!isCustomer && showEtaPicker && (
        <div className="px-3 py-1.5 bg-amber-50 border-t border-amber-200 flex items-center justify-between text-xs">
          <span className="font-semibold text-amber-900 text-[11px]">
            अनुमानित समय (ETA):
          </span>
          <div className="flex items-center gap-1">
            {[5, 10, 15, 20, 30].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => {
                  setEtaMinutes(mins);
                  handleSendMessage(`मैं लगभग ${mins} मिनट में पहुँचूँगा`);
                  setShowEtaPicker(false);
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  etaMinutes === mins
                    ? 'bg-orange-600 text-white'
                    : 'bg-white border border-amber-300 text-amber-900 hover:bg-amber-100'
                }`}
              >
                {mins}m
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowEtaPicker(false)}
              className="ml-1 text-[11px] text-stone-500 hover:text-stone-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Quick Responses Carousel */}
      <div className="p-2 bg-white border-t border-stone-100 overflow-x-auto flex gap-1.5 no-scrollbar">
        {(isCustomer ? customerQuickMessages : servicemanQuickMessages).map((qr, idx) => {
          const isEtaOption = !isCustomer && qr.includes('मिनट में पहुँचूँगा');
          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                if (isEtaOption) {
                  setShowEtaPicker(!showEtaPicker);
                }
                handleSendMessage(qr);
              }}
              className="text-[11px] whitespace-nowrap bg-stone-100 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 text-stone-700 px-2.5 py-1 rounded-full border border-stone-200 transition-colors flex-shrink-0 cursor-pointer font-medium"
            >
              {qr}
            </button>
          );
        })}
      </div>

      {/* Status Notice (e.g. compression in progress) */}
      {compressionNotice && (
        <div className="px-3 py-1 bg-amber-50 border-t border-amber-200/60 flex items-center justify-between text-[11px] text-amber-800">
          <span className="flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>{compressionNotice}</span>
          </span>
          {compressingImage && <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" />}
        </div>
      )}

      {/* Input Box */}
      <div className="p-2.5 sm:p-3 bg-white border-t border-stone-200 flex items-center gap-2">
        <input
          type="file"
          ref={chatPhotoInputRef}
          onChange={handleChatImageSelect}
          accept="image/*"
          className="hidden"
        />
        <button
          type="button"
          disabled={compressingImage || sending}
          onClick={() => chatPhotoInputRef.current?.click()}
          title="फोटो भेजें (ऑटो-कंप्रेस्ड)"
          className="p-2 rounded-xl bg-stone-100 hover:bg-orange-50 text-stone-600 hover:text-orange-600 border border-stone-200 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {compressingImage ? (
            <RefreshCw className="w-4 h-4 animate-spin text-orange-600" />
          ) : (
            <Camera className="w-4 h-4" />
          )}
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSendMessage();
          }}
          placeholder={`Message ${partnerName}...`}
          className="flex-1 py-2 px-3 text-xs rounded-xl bg-stone-100 border border-transparent focus:bg-white focus:border-orange-500 focus:outline-hidden focus:ring-2 focus:ring-orange-100 transition-all"
        />
        <button
          type="button"
          disabled={!inputText.trim() || sending}
          onClick={() => handleSendMessage()}
          className="p-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

