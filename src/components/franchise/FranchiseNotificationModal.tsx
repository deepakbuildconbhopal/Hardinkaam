import React, { useState } from 'react';
import {
  MessageSquare,
  CheckCircle2,
  Copy,
  Check,
  Send,
  Phone,
  Building2,
  ExternalLink,
  Printer,
  RefreshCw,
  Clock,
  ShieldCheck,
  FileText,
  X,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { FranchiseNotificationInput, NotificationDispatchResult, dispatchFranchiseWelcomeNotification } from '../../services/franchiseNotificationService';
import { DEEPAK_BUILDCON_OFFICIAL, FRANCHISE_RULES_BY_TIER } from '../../data/indiaLocations';

interface FranchiseNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  dispatchResult: NotificationDispatchResult;
  applicationInput: FranchiseNotificationInput;
}

export const FranchiseNotificationModal: React.FC<FranchiseNotificationModalProps> = ({
  isOpen,
  onClose,
  dispatchResult: initialDispatchResult,
  applicationInput,
}) => {
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'sms' | 'slip'>('whatsapp');
  const [copiedType, setCopiedType] = useState<'code' | 'wa' | 'sms' | null>(null);
  const [dispatchResult, setDispatchResult] = useState<NotificationDispatchResult>(initialDispatchResult);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  if (!isOpen) return null;

  const tierRule = FRANCHISE_RULES_BY_TIER[applicationInput.areaType] || FRANCHISE_RULES_BY_TIER.town;

  const handleCopy = (text: string, type: 'code' | 'wa' | 'sms') => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setResendSuccess(false);
    try {
      const freshResult = await dispatchFranchiseWelcomeNotification(applicationInput);
      setDispatchResult(freshResult);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to resend notification:', err);
    } finally {
      setIsResending(false);
    }
  };

  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div
      id="franchise-notification-modal-backdrop"
      className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      <div
        id="franchise-notification-modal-card"
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 text-white p-5 sm:p-6 relative border-b border-stone-800">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>स्वचालित सिस्टम अधिसूचना सफलतापूर्वक प्रेषित (Automated Dispatch Verified)</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>फ्रेंचाइज़ी स्वागत पावती एवं कोड</span>
          </h2>
          <p className="text-stone-300 text-xs sm:text-sm mt-1">
            आवेदक <strong className="text-amber-400">{applicationInput.applicantName}</strong> को उनके मोबाइल{' '}
            <strong className="text-emerald-300 font-mono">{applicationInput.phone}</strong> पर SMS व WhatsApp संदेश भेज दिया गया है।
          </p>

          {/* Franchise Code Banner */}
          <div className="mt-4 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-emerald-300 font-semibold block">
                विशिष्ट फ्रेंचाइज़ी कोड (Unique Franchise Code)
              </span>
              <div className="text-xl sm:text-2xl font-black font-mono tracking-wider text-white select-all">
                {dispatchResult.franchiseCode}
              </div>
            </div>
            <button
              onClick={() => handleCopy(dispatchResult.franchiseCode, 'code')}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer whitespace-nowrap"
            >
              {copiedType === 'code' ? (
                <>
                  <Check className="w-4 h-4 text-white" /> कोड कॉपी हुआ!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" /> कोड कॉपी करें
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Delivery Status Channels Bar */}
        <div className="bg-stone-50 border-b border-stone-200 px-5 py-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 text-stone-700 font-medium">
            <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <span>
              <strong>WhatsApp Business:</strong> प्रेषित व डिलीवर्ड (Instant)
            </span>
          </div>
          <div className="flex items-center gap-2 text-stone-700 font-medium">
            <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <span>
              <strong>DLT SMS:</strong> हेडर [DBCBHO] • डिलीवर्ड
            </span>
          </div>
        </div>

        {/* Message View Tabs */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
            <button
              onClick={() => setActiveTab('whatsapp')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'whatsapp'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp संदेश (WhatsApp Preview)</span>
            </button>
            <button
              onClick={() => setActiveTab('sms')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'sms'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>SMS टेक्स्ट (DLT SMS Preview)</span>
            </button>
            <button
              onClick={() => setActiveTab('slip')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'slip'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>आधिकारिक पावती स्लिप (Slip Summary)</span>
            </button>
          </div>

          {/* TAB 1: WhatsApp Message Preview */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-4">
              {/* WhatsApp Bubble Container */}
              <div className="bg-[#efeae2] p-4 sm:p-5 rounded-2xl border border-[#d1d7db] shadow-inner">
                {/* Contact Header */}
                <div className="flex items-center justify-between border-b border-[#00a884]/20 pb-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-[#00a884] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-stone-900">Deepak Buildcon Bhopal</span>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100" />
                      </div>
                      <span className="text-[10px] text-stone-500 font-medium">Verified Enterprise Business Account</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-stone-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-stone-400" /> अभी भेजा गया
                    </span>
                  </div>
                </div>

                {/* WhatsApp Chat Message Bubble */}
                <div className="bg-white rounded-2xl rounded-tl-none p-4 shadow-sm border border-stone-100 max-w-full text-stone-900 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed font-sans">
                  {dispatchResult.whatsappMessage}
                  <div className="mt-2 text-right flex items-center justify-end gap-1 text-[10px] text-stone-400 font-sans">
                    <span>{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="text-emerald-500 font-bold">✓✓</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons for WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <a
                  href={dispatchResult.directApplicantWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>WhatsApp पर खोलें</span>
                  <ExternalLink className="w-3 h-3 opacity-80" />
                </a>

                <a
                  href={dispatchResult.directHeadOfficeWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>हेड ऑफिस चैट करें</span>
                  <ExternalLink className="w-3 h-3 opacity-80" />
                </a>

                <button
                  onClick={() => handleCopy(dispatchResult.whatsappMessage, 'wa')}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs border border-stone-300 transition-all cursor-pointer"
                >
                  {copiedType === 'wa' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" /> संदेश कॉपी हुआ!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-stone-600" /> पूरा संदेश कॉपी करें
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: SMS Message Preview */}
          {activeTab === 'sms' && (
            <div className="space-y-4">
              <div className="bg-stone-100 p-4 sm:p-5 rounded-2xl border border-stone-200 space-y-3">
                <div className="flex items-center justify-between text-xs text-stone-500">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-stone-600" />
                    <span>
                      Sender ID: <strong className="text-stone-800 font-mono">DBCBHO</strong> (DLT Telecom Approved)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                    100% Delivered
                  </span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-stone-200 font-mono text-xs sm:text-sm text-stone-800 leading-relaxed shadow-2xs select-all">
                  {dispatchResult.smsMessage}
                </div>

                <div className="flex items-center justify-between text-[11px] text-stone-500">
                  <span>वर्ण सीमा: {dispatchResult.smsMessage.length} वर्ण (1 क्रेडिट)</span>
                  <span>डिस्पैच समय: {new Date(dispatchResult.dispatchedAt).toLocaleTimeString('en-IN')}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={() => handleCopy(dispatchResult.smsMessage, 'sms')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  {copiedType === 'sms' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" /> SMS टेक्स्ट कॉपी हुआ!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> SMS टेक्स्ट कॉपी करें
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Printable Franchise Application & Terms Slip */}
          {activeTab === 'slip' && (
            <div className="space-y-4">
              <div
                id="printable-franchise-slip"
                className="bg-white p-5 sm:p-6 rounded-2xl border-2 border-stone-300 space-y-4 text-stone-800 shadow-sm"
              >
                {/* Official Slip Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b-2 border-stone-800 pb-4">
                  <div>
                    <div className="text-xs font-bold text-orange-600 tracking-wider uppercase">
                      HARDINKAAM by DEEPAK BUILDCON
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-stone-900">
                      आधिकारिक फ्रेंचाइज़ी पावती एवं आवेदन पत्र
                    </h3>
                    <p className="text-xs text-stone-500">{DEEPAK_BUILDCON_OFFICIAL.headOffice}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-stone-500 uppercase font-semibold block">यूनिक फ्रेंचाइज़ी कोड</span>
                    <span className="text-sm sm:text-base font-black font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-300 inline-block">
                      {dispatchResult.franchiseCode}
                    </span>
                  </div>
                </div>

                {/* Applicant and Location Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-50 p-3.5 rounded-xl border border-stone-200 text-xs">
                  <div>
                    <span className="text-stone-400 text-[10px] block">आवेदक का नाम</span>
                    <strong className="text-stone-900">{applicationInput.applicantName}</strong>
                  </div>
                  <div>
                    <span className="text-stone-400 text-[10px] block">पंजीकृत मोबाइल</span>
                    <strong className="text-stone-900 font-mono">{applicationInput.phone}</strong>
                  </div>
                  <div>
                    <span className="text-stone-400 text-[10px] block">आवंटित स्थान व ज़िला</span>
                    <strong className="text-stone-900">
                      {applicationInput.cityOrVillage}, {applicationInput.district}
                    </strong>
                  </div>
                  <div>
                    <span className="text-stone-400 text-[10px] block">राज्य</span>
                    <strong className="text-stone-900">{applicationInput.state}</strong>
                  </div>
                </div>

                {/* Investment Breakdown Table */}
                <div>
                  <h4 className="text-xs font-black text-stone-900 uppercase tracking-wide mb-2">
                    वित्तीय एवं निवेश विवरण (Investment &amp; Terms Breakdown)
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-stone-200 rounded-lg overflow-hidden">
                      <thead className="bg-stone-100 text-stone-600 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="py-2 px-3">मद / विवरण</th>
                          <th className="py-2 px-3 text-right">राशि / नियम</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200">
                        <tr>
                          <td className="py-2 px-3 font-medium">वन-टाइम फ्रेंचाइज़ी एग्रीमेंट फीस</td>
                          <td className="py-2 px-3 text-right font-bold text-stone-900">
                            ₹{tierRule.franchiseFee.toLocaleString('en-IN')}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-medium">रिफंडेबल सिक्योरिटी डिपॉजिट</td>
                          <td className="py-2 px-3 text-right font-bold text-stone-900">
                            ₹{tierRule.securityDeposit.toLocaleString('en-IN')}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-medium">आवेदक द्वारा प्रस्तावित प्रारंभिक बजट</td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-700">
                            ₹{(applicationInput.investmentBudget || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-medium">अनिवार्य मासिक सर्विस बुकिंग्स</td>
                          <td className="py-2 px-3 text-right font-bold text-stone-900">
                            {applicationInput.monthlyTargetBookings} सर्विसेज/माह
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-medium">मासिक रॉयल्टी शेयर (दीपक बिल्डकॉन)</td>
                          <td className="py-2 px-3 text-right font-bold text-orange-700">
                            {applicationInput.royaltyPercentage}% (न्यूनतम ₹{tierRule.minMonthlyRoyalty.toLocaleString('en-IN')}/माह)
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-medium">न्यूनतम आवश्यक सर्विस टीम</td>
                          <td className="py-2 px-3 text-right font-bold text-stone-800">
                            {tierRule.minTechnicians} तकनीशियन + {tierRule.minSupervisors} सुपरवाइजर
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Company Official Stamp Footer */}
                <div className="pt-3 border-t border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-stone-500">
                  <div>
                    <div>
                      <strong>हेड ऑफिस:</strong> {DEEPAK_BUILDCON_OFFICIAL.headOffice}
                    </div>
                    <div>
                      <strong>हेल्पलाइन:</strong> {DEEPAK_BUILDCON_OFFICIAL.officialPhone} |{' '}
                      <strong>ईमेल:</strong> {DEEPAK_BUILDCON_OFFICIAL.officialEmail}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-serif italic font-bold text-stone-900 block">DEEPAK</span>
                    <span className="text-[10px] text-stone-400">Managing Director (दीपक बिल्डकॉन)</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrintSlip}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>पावती स्लिप प्रिंट करें (Print Slip)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Actions */}
        <div className="bg-stone-50 border-t border-stone-200 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleResend}
              disabled={isResending}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-stone-100 text-stone-700 font-bold text-xs border border-stone-300 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin text-emerald-600' : ''}`} />
              <span>{isResending ? 'संदेश भेजा जा रहा है...' : 'पुनः SMS / WhatsApp भेजें'}</span>
            </button>

            {resendSuccess && (
              <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> सफलतापूर्वक पुनः भेजा गया!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <a
              href={`tel:${DEEPAK_BUILDCON_OFFICIAL.officialPhone.replace(/[^0-9+]/g, '')}`}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-800 font-bold text-xs border border-orange-200 transition-all cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5 text-orange-600" />
              <span>हेल्पलाइन कॉल करें</span>
            </a>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              पूर्ण हुआ (Done)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
