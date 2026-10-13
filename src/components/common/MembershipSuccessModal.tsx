import React, { useState } from 'react';
import { CheckCircle, Copy, Check, MessageSquare, ArrowRight, ShieldCheck, Sparkles, CreditCard, UserCheck, Download } from 'lucide-react';
import { MemberNotificationResult } from '../../services/memberNotificationService';
import { DigitalIdCard } from './DigitalIdCard';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  notificationResult: MemberNotificationResult;
  userName: string;
  userPhone: string;
  photoUrl?: string | null;
  roleTitle?: string;
  onProceed?: () => void;
}

export const MembershipSuccessModal: React.FC<Props> = ({
  isOpen,
  onClose,
  notificationResult,
  userName,
  userPhone,
  photoUrl,
  onProceed,
}) => {
  const [activeTab, setActiveTab] = useState<'id_card' | 'details'>('id_card');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(
      `HARDINKAAM Official Membership Details:\nName: ${userName}\nMember ID: ${notificationResult.memberCode}\nRole: ${notificationResult.roleHindiTitle} (${notificationResult.roleEnglishTitle})\nPhone: ${userPhone}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleProceed = () => {
    onClose();
    if (onProceed) onProceed();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-emerald-100 flex flex-col my-auto max-h-[92vh]">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-5 text-white text-center relative shrink-0">
          <div className="flex items-center justify-center gap-1.5 text-emerald-100 text-xs font-semibold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>रजिस्ट्रेशन व सदस्यता सत्यापित ✅</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">बधाई हो, {userName}!</h2>
          <p className="text-emerald-100 text-xs mt-0.5">
            आपका <strong>{notificationResult.roleHindiTitle}</strong> डिजिटल ID कार्ड व मेम्बर कोड सक्रिय हो चुका है।
          </p>

          {/* Tab Switcher */}
          <div className="flex justify-center mt-3 bg-black/20 p-1 rounded-xl max-w-xs mx-auto">
            <button
              type="button"
              onClick={() => setActiveTab('id_card')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'id_card' ? 'bg-white text-emerald-800 shadow-sm' : 'text-emerald-100 hover:text-white'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>डिजिटल ID कार्ड</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'details' ? 'bg-white text-emerald-800 shadow-sm' : 'text-emerald-100 hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>सदस्यता विवरण</span>
            </button>
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {activeTab === 'id_card' ? (
            /* Digital ID Card with Canvas PNG Downloader */
            <DigitalIdCard
              userName={userName}
              userPhone={userPhone}
              photoUrl={photoUrl}
              notificationResult={notificationResult}
            />
          ) : (
            /* Membership Details View */
            <div className="space-y-3">
              <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-inner border border-slate-700 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                      MEMBERSHIP VERIFICATION
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    ACTIVE ✅
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-[10px] font-medium text-slate-400 uppercase">सदस्य का नाम</p>
                    <p className="font-bold text-white text-sm">{userName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-slate-400 uppercase">मोबाइल नंबर</p>
                    <p className="font-bold text-slate-200">{userPhone}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-slate-400 uppercase">पद / श्रेणी (Role)</p>
                    <p className="font-bold text-amber-300">{notificationResult.roleHindiTitle}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-slate-400 uppercase">रजिस्ट्रेशन शुल्क</p>
                    <p className="font-bold text-emerald-400">₹121 (Paid &amp; Active)</p>
                  </div>
                </div>

                <div className="mt-2 p-3 bg-white/10 rounded-xl border border-white/10 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-semibold text-emerald-300 uppercase">यूनिक मेम्बर कोड (Member ID)</p>
                    <p className="text-base sm:text-lg font-mono font-black text-white tracking-wider">
                      {notificationResult.memberCode}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 transition active:scale-95 shadow-xs cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy ID'}</span>
                  </button>
                </div>
              </div>

              {/* WhatsApp Notification Info */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-xs text-emerald-900 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-base">📲</span>
                  <div>
                    <p className="font-bold">आपके मोबाइल पर विवरण भेज दिया गया है!</p>
                    <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                      SMS और WhatsApp पर आपका मेम्बर कोड, पद विवरण और एक्टिवेशन कन्फर्मेशन भेज दिया गया है।
                    </p>
                  </div>
                </div>

                {notificationResult.whatsappDirectUrl && (
                  <a
                    href={notificationResult.whatsappDirectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition active:scale-98 text-center"
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-100" />
                    <span>WhatsApp पर पूरा विवरण खोलें / भेजें</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Action Continue Button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleProceed}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-98 cursor-pointer"
            >
              <span>सेवाओं का आनंद लें / Continue to App</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
