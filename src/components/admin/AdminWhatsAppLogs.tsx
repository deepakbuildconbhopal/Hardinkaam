import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, CheckCircle2, Clock, Phone, Search, AlertCircle, Video, ExternalLink, Sparkles } from 'lucide-react';
import { collection, onSnapshot, addDoc, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { WhatsAppLog } from '../../types';
import { formatWhatsAppPhone, formatWhatsAppVideoInviteMessage } from '../../utils/whatsappVideoCall';

export const AdminWhatsAppLogs: React.FC = () => {
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [recipientPhone, setRecipientPhone] = useState('+91 98260 12345');
  const [recipientName, setRecipientName] = useState('Customer');
  const [includeVideoCall, setIncludeVideoCall] = useState(false);
  const [messageBody, setMessageBody] = useState(
    'Namaste from HARDINKAAM! Your booking has been confirmed. Technician Rajesh Sharma will arrive at your location today.'
  );
  const [sending, setSending] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'whatsapp_logs'), limit(50));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: WhatsAppLog[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as WhatsAppLog));
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setLogs(list);
      },
      (err) => {
        console.warn('WhatsApp logs snapshot notice:', err);
      }
    );
    return () => unsub();
  }, []);

  const handleSendManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientPhone.trim() || !messageBody.trim()) return;

    setSending(true);
    try {
      const cleanPhone = formatWhatsAppPhone(recipientPhone);
      const roomCode = 'DBC-' + Math.floor(100000 + Math.random() * 900000);
      const videoMeetingUrl = `${window.location.origin}/#call-${roomCode}`;
      
      let finalMessage = messageBody.trim();
      if (includeVideoCall) {
        finalMessage += `\n\n📹 *लाइव वीडियो कॉल लिंक:*\n${videoMeetingUrl}\n🔑 रूम कोड: ${roomCode}`;
      }

      // 1. Log to Firestore
      await addDoc(collection(db, 'whatsapp_logs'), {
        recipientPhone: recipientPhone.trim(),
        recipientName: recipientName.trim(),
        type: includeVideoCall ? 'video_call_invite' : 'manual_notification',
        messageBody: finalMessage,
        status: 'sent',
        roomCode: includeVideoCall ? roomCode : null,
        timestamp: new Date().toISOString(),
      });

      // 2. Open WhatsApp Web / App directly
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(finalMessage)}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');

      setShowSendModal(false);
      setIncludeVideoCall(false);
    } catch (err) {
      console.error('Failed to send WhatsApp dispatch log:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            WhatsApp Dispatch &amp; Notification Logs
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Real-time audit of automated customer updates, booking confirmations, and pro dispatches
          </p>
        </div>

        <button
          onClick={() => setShowSendModal(true)}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Send className="w-4 h-4" /> Send Test Notification
        </button>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Recipient</th>
                <th className="py-3.5 px-4">Notification Type</th>
                <th className="py-3.5 px-4">Message Body</th>
                <th className="py-3.5 px-4">Delivery Status</th>
                <th className="py-3.5 px-4">Delivery Status</th>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-stone-400">
                    <MessageSquare className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                    No WhatsApp dispatches recorded yet. Place a booking or send a test alert.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-50/50">
                    <td className="py-3.5 px-4 font-semibold text-stone-800">
                      <div>{log.recipientName || 'Customer'}</div>
                      <div className="text-stone-400 text-[11px] font-mono">{log.recipientPhone}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 font-bold text-[10px] uppercase">
                        {log.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-stone-600 max-w-sm">
                      <p className="line-clamp-2 leading-relaxed">{log.messageBody}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Sent
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-stone-400 text-[11px]">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Recently'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={`https://wa.me/${formatWhatsAppPhone(log.recipientPhone)}?text=${encodeURIComponent(log.messageBody)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 inline-flex items-center gap-1"
                          title="WhatsApp पर खोलें"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Dispatch Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-stone-200">
            <h3 className="font-bold text-base text-stone-900 mb-1">Dispatch WhatsApp Message</h3>
            <p className="text-xs text-stone-500 mb-4">
              Send immediate alert to customer or service pro via the HARDINKAAM gateway
            </p>

            <form onSubmit={handleSendManual} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Recipient Name</label>
                <input
                  type="text"
                  required
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full p-2 text-xs rounded-xl border border-stone-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Recipient Mobile Number</label>
                <input
                  type="tel"
                  required
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  className="w-full p-2 text-xs rounded-xl border border-stone-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Message Content</label>
                <textarea
                  rows={3}
                  required
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  className="w-full p-2 text-xs rounded-xl border border-stone-200"
                />
              </div>

              {/* Video Call Attachment Checkbox */}
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <Video className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="font-bold text-emerald-950 block">लाइव वीडियो कॉल लिंक जोड़ें</span>
                    <span className="text-[10px] text-emerald-700">1080p HD वीडियो रूम लिंक स्वतः जुड़ जाएगा</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={includeVideoCall}
                  onChange={(e) => setIncludeVideoCall(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-60 flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{sending ? 'Sending...' : 'WhatsApp पर भेजें'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
