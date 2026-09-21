import React, { useState } from 'react';
import {
  X,
  PhoneCall,
  MessageSquare,
  ShieldAlert,
  Clock,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  FileQuestion,
  Send,
  MapPin,
  Video,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { Booking } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  recentBookings?: Booking[];
}

export const CustomerHelpModal: React.FC<Props> = ({ isOpen, onClose, recentBookings = [] }) => {
  const { t, language } = useLanguage();
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [ticketSent, setTicketSent] = useState(false);

  if (!isOpen) return null;

  const faqs = [
    {
      q: language === 'hi' ? 'बुकिंग कैसे रद्द या पुनर्निर्धारित करें?' : 'How do I cancel or reschedule a booking?',
      a: language === 'hi'
        ? 'आप "मेरी बुकिंग्स" टैब में जाकर सेवा शुरू होने के 2 घंटे पहले तक बिना किसी शुल्क के आसानी से बुकिंग रद्द या पुनर्निर्धारित कर सकते हैं।'
        : 'You can easily reschedule or cancel up to 2 hours before the scheduled time slot from "My Bookings" with zero cancellation penalty.',
    },
    {
      q: language === 'hi' ? 'क्या सर्विस चार्जेस निश्चित हैं?' : 'Are the service rates fixed?',
      a: language === 'hi'
        ? 'हाँ, HARDINKAAM पर सभी मानक सेवाओं के रेट कार्ड पारदर्शी और निश्चित हैं। यदि किसी अतिरिक्त स्पेयर पार्ट की आवश्यकता होती है तो प्रो आपको पहले एमआरपी बिल दिखाएगा।'
        : 'Yes, all standard service rates are 100% transparent and pre-fixed. If replacement parts are needed, the pro will provide an MRP invoice before installation.',
    },
    {
      q: language === 'hi' ? '7-दिवसीय सर्विस वारंटी क्या है?' : 'What is the 7-day service warranty?',
      a: language === 'hi'
        ? 'काम पूरा होने के 7 दिनों के भीतर यदि उसी काम में कोई खराबी दोबारा आती है, तो हमारे विशेषज्ञ बिना किसी विजिट चार्ज के पुनः आकर समस्या हल करते हैं।'
        : 'If the same problem recurs within 7 days of service completion, our technician will visit and fix it free of visit charges.',
    },
    {
      q: language === 'hi' ? 'क्या मुझे ऑनलाइन अग्रिम भुगतान करना होगा?' : 'Do I need to pay online in advance?',
      a: language === 'hi'
        ? 'बिल्कुल नहीं! HARDINKAAM में आप काम पूर्णतः और संतुष्टिपूर्वक संपन्न होने के बाद कैश या UPI से भुगतान कर सकते हैं।'
        : 'Not at all! You only pay after the job is completely finished and verified to your satisfaction via Cash or UPI.',
    },
  ];

  const handleSendTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketMessage.trim()) return;
    setTicketSent(true);
    setTimeout(() => {
      setTicketSent(false);
      setTicketSubject('');
      setTicketMessage('');
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-orange-600 to-amber-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-xs">
              <HelpCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-black">{t('customerHelp', 'HARDINKAAM 24x7 Support')}</h3>
              <p className="text-xs text-orange-100 font-medium">Bhopal Customer Care &amp; Assistance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-stone-800">
          {/* Quick Contact Banners */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href="tel:+919826012345"
              className="p-3.5 rounded-2xl bg-orange-50 border border-orange-200 flex items-center gap-3 hover:bg-orange-100/80 transition-colors"
            >
              <div className="p-2.5 rounded-xl bg-orange-600 text-white">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-orange-950/70 font-bold uppercase tracking-wider block">
                  Customer Helpline / Toll-Free
                </span>
                <span className="text-sm font-black text-orange-950">+91 98260 12345</span>
              </div>
            </a>

            <a
              href="https://wa.me/919826012345?text=Hello%20HARDINKAAM%20Support%2C%20I%20need%20assistance%20with%20my%20service."
              target="_blank"
              rel="noopener noreferrer"
              className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 hover:bg-emerald-100/80 transition-colors"
            >
              <div className="p-2.5 rounded-xl bg-emerald-600 text-white">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">
                  WhatsApp Support
                </span>
                <span className="text-sm font-black text-emerald-950">+91 98260 12345</span>
              </div>
            </a>

            {/* Direct WhatsApp Video Call Help */}
            <a
              href={`https://wa.me/919826012345?text=${encodeURIComponent(
                'नमस्ते HARDINKAAM (दीपक बिल्डकॉन) सपोर्ट! मुझे फॉल्ट डायग्नोसिस / रिमोट निरीक्षण के लिए लाइव WhatsApp वीडियो कॉल सहायता चाहिए।'
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 flex items-center gap-3 hover:bg-teal-100/80 transition-colors col-span-1 sm:col-span-2"
            >
              <div className="p-2.5 rounded-xl bg-teal-600 text-white">
                <Video className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-teal-800 font-bold uppercase tracking-wider block">
                    WhatsApp Live Video Call
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md bg-teal-200 text-teal-900 text-[9px] font-black">
                    लाइव वीडियो सहायता
                  </span>
                </div>
                <span className="text-xs font-bold text-teal-950 block mt-0.5">
                  व्हाट्सएप पर इंजीनियर से लाइव वीडियो कॉल पर फॉल्ट दिखाएं
                </span>
              </div>
            </a>
          </div>

          {/* Registered Bhopal Office Address */}
          <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-orange-100 text-orange-700 mt-0.5">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider block">
                Registered Office Address
              </span>
              <span className="text-xs font-bold text-stone-900 block mt-0.5">
                S-2, Ashirwad Complex, Zone-1, M.P. Nagar, Bhopal, MP - 462011
              </span>
              <span className="text-[11px] text-stone-500">
                Mon – Sat: 8:00 AM – 9:00 PM | Helpline: +91 98260 12345
              </span>
            </div>
          </div>

          {/* FAQs Accordion */}
          <div>
            <h4 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-1.5">
              <FileQuestion className="w-4 h-4 text-orange-600" /> Frequently Asked Questions
            </h4>
            <div className="space-y-2">
              {faqs.map((faq, idx) => {
                const isOpen = activeFaq === idx;
                return (
                  <div
                    key={idx}
                    className="border border-stone-200 rounded-xl overflow-hidden transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => setActiveFaq(isOpen ? null : idx)}
                      className="w-full p-3.5 text-left text-xs font-bold text-stone-900 bg-stone-50 hover:bg-stone-100/80 flex items-center justify-between cursor-pointer"
                    >
                      <span>{faq.q}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-stone-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-stone-500" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="p-3.5 text-xs text-stone-600 leading-relaxed bg-white border-t border-stone-100">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Help Ticket Form */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
            <h4 className="text-xs font-bold text-stone-900 mb-2 uppercase tracking-wider">
              Send Support Message
            </h4>
            {ticketSent ? (
              <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Your query has been recorded. Our team will call you within 15 minutes.</span>
              </div>
            ) : (
              <form onSubmit={handleSendTicket} className="space-y-2.5">
                {recentBookings.length > 0 && (
                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                      Related Booking (Optional)
                    </label>
                    <select
                      value={selectedBookingId}
                      onChange={(e) => setSelectedBookingId(e.target.value)}
                      className="w-full text-xs p-2 rounded-xl bg-white border border-stone-200 text-stone-800 focus:outline-hidden"
                    >
                      <option value="">General inquiry (No specific booking)</option>
                      {recentBookings.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.serviceName} - #{b.id.slice(0, 6)} ({b.status})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <input
                    type="text"
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    placeholder="Subject / Issue topic"
                    className="w-full text-xs p-2.5 rounded-xl bg-white border border-stone-200 text-stone-800 focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <textarea
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    placeholder="Describe your question or feedback..."
                    rows={3}
                    className="w-full text-xs p-2.5 rounded-xl bg-white border border-stone-200 text-stone-800 focus:outline-hidden"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" /> Submit Support Request
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
