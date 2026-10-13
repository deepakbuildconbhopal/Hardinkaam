import React from 'react';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  AlertCircle,
  CreditCard,
  RotateCcw,
  ChevronRight,
  ShieldCheck,
  User,
  Wrench,
  Zap,
  Wind,
  Phone,
  Wallet,
  ClipboardList,
} from 'lucide-react';
import { Booking, Service } from '../../types';
import { AssistantLanguage } from './types';

interface PersonalizedCustomerWelcomeWidgetProps {
  isLoggedIn: boolean;
  userName?: string;
  userPhone?: string;
  bookings?: Booking[];
  lang?: AssistantLanguage;
  onSelectAction: (actionType: string, payload?: any) => void;
}

export const PersonalizedCustomerWelcomeWidget: React.FC<PersonalizedCustomerWelcomeWidgetProps> = ({
  isLoggedIn,
  userName,
  userPhone,
  bookings = [],
  lang = 'hi',
  onSelectAction,
}) => {
  const isHindi = lang === 'hi';

  // Privacy protection helper: mask phone number if shown
  const maskedPhone = userPhone
    ? userPhone.replace(/(\+\d{2}\s?\d{2})\d{4}(\d{4})/, '$1 **** $2')
    : undefined;

  // Extract verified first name
  const verifiedFirstName = userName
    ? userName.trim().split(' ')[0]
    : undefined;

  // Find Active Booking (Pending, Accepted, On the way, Arrived, In Progress)
  const activeBooking = bookings.find((b) =>
    ['pending', 'accepted', 'on_the_way', 'arrived', 'in_progress'].includes(b.status)
  );

  // Find Pending Payment Booking
  const pendingPaymentBooking = bookings.find(
    (b) => b.status === 'completed' && (b.paymentStatus === 'pending' || (b as any).isUnpaid)
  );

  // Find Recent Completed Booking
  const recentBooking = bookings.find(
    (b) => b.status === 'completed' && b.id !== pendingPaymentBooking?.id
  );

  // GUEST USER WIDGET
  if (!isLoggedIn || !verifiedFirstName) {
    return (
      <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-orange-950 rounded-3xl p-5 text-white shadow-xl border border-stone-800 space-y-4 my-2 max-w-md w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-wider text-orange-400">
              KaamDost AI Guest Portal
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSelectAction('open_auth', 'customer')}
            className="px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-black rounded-xl transition cursor-pointer shadow-xs"
          >
            🔐 ग्राहक लॉगिन (Login)
          </button>
        </div>

        <div>
          <h3 className="text-lg font-black tracking-tight text-white">
            Namaste 👋 Welcome to HARDINKAAM
          </h3>
          <p className="text-xs text-stone-300 mt-1 leading-relaxed">
            भोपाल में किसी भी डोरस्टेप सर्विस (इलेक्ट्रीशियन, प्लंबर, एसी सर्विस) के लिए यहाँ टाइप करें या लॉगिन करें।
          </p>
        </div>

        {/* Suggested Quick Categories */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {[
            { label: '⚡ इलेक्ट्रीशियन', query: 'इलेक्ट्रीशियन चाहिए' },
            { label: '🔧 प्लंबर', query: 'प्लंबर की जरूरत है' },
            { label: '❄️ AC सर्विस', query: 'एसी सर्विस करानी है' },
            { label: '🧹 डीप क्लीनिंग', query: 'सफाई करानी है' },
          ].map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectAction('send_query', item.query)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-stone-100 text-[11px] font-bold text-center border border-white/10 transition cursor-pointer"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // LOGGED-IN PERSONALIZED USER WIDGET
  return (
    <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-orange-950 rounded-3xl p-5 text-white shadow-xl border border-stone-800 space-y-4 my-2 max-w-md w-full">
      {/* Personalized Greeting */}
      <div className="flex items-start justify-between gap-2 border-b border-stone-800/80 pb-3">
        <div>
          <div className="flex items-center gap-1.5 text-orange-400 text-[10px] font-black uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>सत्यापित ग्राहक खाता (Verified Customer)</span>
          </div>
          <h3 className="text-lg font-black tracking-tight text-white mt-0.5">
            Namaste {verifiedFirstName} 👋
          </h3>
          <p className="text-xs text-stone-300 font-medium">Aaj kya kaam karwana hai?</p>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[10px] text-stone-400 block font-mono">
            {maskedPhone || 'सत्यापित मोबाइल'}
          </span>
          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full inline-block mt-0.5">
            100% Secure
          </span>
        </div>
      </div>

      {/* 1. ACTIVE BOOKING SECTION */}
      {activeBooking && (
        <div className="p-3.5 bg-gradient-to-r from-orange-950/80 to-amber-950/80 rounded-2xl border border-orange-500/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded-md bg-orange-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              लाइव बुकिंग (Active Booking)
            </span>
            <span className="text-[10px] font-mono font-bold text-stone-300">#{activeBooking.id}</span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-black text-white">{activeBooking.serviceName || 'होम सर्विस'}</h4>
              <p className="text-[11px] text-stone-300">
                {activeBooking.scheduledDate || 'आज'}, {activeBooking.scheduledTime || '60 मिनट'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelectAction('track_booking', activeBooking)}
              className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-bold rounded-xl transition cursor-pointer flex items-center gap-1 shadow-xs"
            >
              <span>ट्रैक करें</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 2. PENDING PAYMENT SECTION */}
      {pendingPaymentBooking && (
        <div className="p-3.5 bg-gradient-to-r from-red-950/80 to-rose-950/80 rounded-2xl border border-red-500/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-white" />
              पेमेंट बकाया (Pending Payment)
            </span>
            <span className="text-xs font-black text-red-300">₹{pendingPaymentBooking.amount || 299}</span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-black text-white">{pendingPaymentBooking.serviceName}</h4>
              <p className="text-[11px] text-stone-300">काम पूरा हो चुका है — बिल चुकाएं</p>
            </div>
            <button
              type="button"
              onClick={() => onSelectAction('navigate_tab', 'wallet')}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold rounded-xl transition cursor-pointer flex items-center gap-1 shadow-xs"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>पे करें</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. RECENT BOOKING (1-CLICK REORDER) */}
      {recentBooking && !activeBooking && !pendingPaymentBooking && (
        <div className="p-3 bg-stone-800/80 rounded-2xl border border-stone-700/80 flex items-center justify-between gap-2">
          <div>
            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">
              हालिया सर्विस (Recent)
            </span>
            <h4 className="text-xs font-black text-stone-100">{recentBooking.serviceName}</h4>
          </div>
          <button
            type="button"
            onClick={() => onSelectAction('send_query', `${recentBooking.serviceName} पुनः बुक करें`)}
            className="px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-amber-300 text-[11px] font-bold rounded-xl transition cursor-pointer flex items-center gap-1 border border-stone-600"
          >
            <RotateCcw className="w-3 h-3 text-amber-400" />
            <span>पुनः बुक करें</span>
          </button>
        </div>
      )}

      {/* 4. SUGGESTED SERVICES CHIPS */}
      <div className="space-y-1.5 pt-1">
        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
          सुझाव (Suggested Services)
        </span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onSelectAction('send_query', 'इलेक्ट्रीशियन चाहिए')}
            className="p-2 bg-stone-800/90 hover:bg-stone-700/90 rounded-xl text-[11px] font-bold text-stone-200 border border-stone-700 flex items-center justify-between transition cursor-pointer"
          >
            <span>⚡ इलेक्ट्रीशियन</span>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
          </button>
          <button
            type="button"
            onClick={() => onSelectAction('send_query', 'प्लंबर की जरूरत है')}
            className="p-2 bg-stone-800/90 hover:bg-stone-700/90 rounded-xl text-[11px] font-bold text-stone-200 border border-stone-700 flex items-center justify-between transition cursor-pointer"
          >
            <span>🔧 प्लंबर</span>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
          </button>
          <button
            type="button"
            onClick={() => onSelectAction('send_query', 'एसी सर्विस करानी है')}
            className="p-2 bg-stone-800/90 hover:bg-stone-700/90 rounded-xl text-[11px] font-bold text-stone-200 border border-stone-700 flex items-center justify-between transition cursor-pointer"
          >
            <span>❄️ AC सर्विस</span>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
          </button>
          <button
            type="button"
            onClick={() => onSelectAction('send_query', 'सफाई करानी है')}
            className="p-2 bg-stone-800/90 hover:bg-stone-700/90 rounded-xl text-[11px] font-bold text-stone-200 border border-stone-700 flex items-center justify-between transition cursor-pointer"
          >
            <span>🧹 डीप क्लीनिंग</span>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
          </button>
        </div>
      </div>

      {/* 5. QUICK ACTION SHORTCUTS */}
      <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-[11px]">
        <button
          type="button"
          onClick={() => onSelectAction('navigate_tab', 'bookings')}
          className="text-stone-300 hover:text-orange-400 font-bold flex items-center gap-1 transition cursor-pointer"
        >
          <ClipboardList className="w-3.5 h-3.5 text-orange-400" />
          <span>मेरी बुकिंग्स</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectAction('navigate_tab', 'wallet')}
          className="text-stone-300 hover:text-emerald-400 font-bold flex items-center gap-1 transition cursor-pointer"
        >
          <Wallet className="w-3.5 h-3.5 text-emerald-400" />
          <span>मेरा वॉलेट</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectAction('open_call', 'tel:+916267546945')}
          className="text-stone-300 hover:text-amber-400 font-bold flex items-center gap-1 transition cursor-pointer"
        >
          <Phone className="w-3.5 h-3.5 text-amber-400" />
          <span>24x7 सपोर्ट</span>
        </button>
      </div>
    </div>
  );
};
