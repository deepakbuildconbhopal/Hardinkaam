import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  X,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  FileText,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Phone,
  User,
  AlertTriangle,
} from 'lucide-react';
import { Booking, ServiceGuarantee, GuaranteeClaim } from '../../types';
import { serviceGuaranteeService } from '../../services/serviceGuaranteeService';
import { useToast } from '../../context/ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
  onClaimSubmitted?: () => void;
}

export const ServiceGuaranteeModal: React.FC<Props> = ({
  isOpen,
  onClose,
  booking,
  onClaimSubmitted,
}) => {
  const { addToast } = useToast();
  const [guarantee, setGuarantee] = useState<ServiceGuarantee | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showClaimForm, setShowClaimForm] = useState<boolean>(false);
  const [claimDescription, setClaimDescription] = useState<string>('');
  const [preferredContactTime, setPreferredContactTime] = useState<string>('11:00 AM - 01:00 PM');
  const [submittingClaim, setSubmittingClaim] = useState<boolean>(false);
  const [existingClaim, setExistingClaim] = useState<GuaranteeClaim | null>(null);

  useEffect(() => {
    if (isOpen && booking) {
      setLoading(true);
      serviceGuaranteeService
        .generateGuaranteeForBooking(booking)
        .then(async (g) => {
          setGuarantee(g);
          if (g && g.claimId) {
            const allClaims = await serviceGuaranteeService.getAllClaims();
            const matching = allClaims.find((c) => c.id === g.claimId);
            if (matching) setExistingClaim(matching);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, booking]);

  if (!isOpen) return null;

  const isExpired = guarantee?.status === 'expired' || (guarantee && new Date(guarantee.expiryDate).getTime() < Date.now());

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimDescription.trim()) {
      addToast('कृपया समस्या का विवरण दर्ज करें।', 'warning');
      return;
    }
    if (!guarantee) return;

    setSubmittingClaim(true);
    try {
      const claim = await serviceGuaranteeService.submitGuaranteeClaim({
        guaranteeId: guarantee.id,
        bookingId: booking.id,
        customerId: booking.customerId,
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        serviceName: booking.serviceName,
        description: claimDescription.trim(),
        preferredContactTime,
      });

      setExistingClaim(claim);
      setShowClaimForm(false);
      setGuarantee({ ...guarantee, status: 'claimed', claimId: claim.id });
      addToast({
        type: 'success',
        title: 'गारंटी दावा दर्ज हुआ!',
        description: 'आपका मुफ़्त रिविजिट दावा सफलतापूर्वक दर्ज कर लिया गया है। सुपरवाइज़र जल्द आपसे संपर्क करेंगे।',
      });
      if (onClaimSubmitted) onClaimSubmitted();
    } catch (err: any) {
      addToast(err.message || 'दावा दर्ज करने में त्रुटि आई।', 'error');
    } finally {
      setSubmittingClaim(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs animate-fadeIn"
    >
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
        {/* Modal Header with Guarantee Shield Accent */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-bold text-white shadow-xs border border-white/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/25 text-white">
                  100% संतोषजनक सेवा
                </span>
                <span className="text-xs text-emerald-100 font-semibold">
                  #{booking.id}
                </span>
              </div>
              <h3 className="font-extrabold text-base sm:text-lg text-white mt-0.5">
                सर्विस गारंटी — Service Guarantee
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-12 text-center text-stone-400">
              <RotateCcw className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-600" />
              <p className="text-xs">गारंटी रिकॉर्ड सत्यापित किया जा रहा है...</p>
            </div>
          ) : !guarantee ? (
            <div className="py-8 text-center text-stone-500">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
              <p className="font-bold text-stone-800">गारंटी रिकॉर्ड उपलब्ध नहीं है</p>
              <p className="text-xs text-stone-500 mt-1">
                गारंटी केवल सफलतापूर्वक संपन्न एवं सत्यापित सेवाओं पर स्वतः सक्रिय होती है।
              </p>
            </div>
          ) : (
            <>
              {/* Guarantee Status Certificate Card */}
              <div
                className={`p-4 rounded-2xl border space-y-3 ${
                  isExpired
                    ? 'bg-stone-50 border-stone-200'
                    : guarantee.status === 'claimed'
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-emerald-50/70 border-emerald-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-stone-900 truncate">
                    {guarantee.serviceName}
                  </span>
                  <span
                    className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                      isExpired
                        ? 'bg-stone-200 text-stone-700'
                        : guarantee.status === 'claimed'
                        ? 'bg-amber-200 text-amber-900'
                        : 'bg-emerald-200 text-emerald-900'
                    }`}
                  >
                    {isExpired
                      ? 'अवधि समाप्त (Expired)'
                      : guarantee.status === 'claimed'
                      ? 'दावा सक्रिय (Claim Active)'
                      : 'सक्रिय गारंटी (Active)'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-stone-600">
                  <div>
                    <span className="text-stone-400 block text-[10px]">सेवा पूर्ण होने का दिन:</span>
                    <span className="font-semibold text-stone-800">
                      {new Date(guarantee.completionDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px]">गारंटी वैधता समाप्ति:</span>
                    <span className="font-semibold text-stone-800">
                      {new Date(guarantee.expiryDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px]">सत्यापित तकनीशियन:</span>
                    <span className="font-semibold text-stone-800">{guarantee.serviceManName}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px]">वैधता अवधि:</span>
                    <span className="font-semibold text-emerald-700">{guarantee.validityDays} दिन</span>
                  </div>
                </div>
              </div>

              {/* Existing Claim Notification */}
              {existingClaim && (
                <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-950 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-blue-600" />
                      दावा स्थिति: #{existingClaim.id}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-200 text-blue-900">
                      {existingClaim.status === 'submitted'
                        ? 'समीक्षा में (Submitted)'
                        : existingClaim.status === 'approved'
                        ? 'स्वीकृत (Revisit Approved)'
                        : existingClaim.status === 'rejected'
                        ? 'अस्वीकृत (Rejected)'
                        : 'समाधान संपन्न (Resolved)'}
                    </span>
                  </div>
                  <p className="text-stone-600 text-[11px]">{existingClaim.description}</p>
                  {existingClaim.revisitBookingId && (
                    <div className="p-2 bg-emerald-100 rounded-xl text-emerald-900 font-semibold text-[11px] flex items-center justify-between">
                      <span>मुफ़्त रिविजिट बुकिंग: #{existingClaim.revisitBookingId}</span>
                      <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded">₹0 (Free)</span>
                    </div>
                  )}
                  {existingClaim.rejectionReason && (
                    <p className="text-rose-700 text-[11px] font-medium">
                      कारण: {existingClaim.rejectionReason}
                    </p>
                  )}
                </div>
              )}

              {/* Raise Claim Form */}
              {showClaimForm ? (
                <form onSubmit={handleSubmitClaim} className="space-y-3 p-4 rounded-2xl border border-stone-200 bg-stone-50">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-stone-900 flex items-center gap-1.5">
                      <RotateCcw className="w-4 h-4 text-emerald-600" />
                      मुफ़्त रिविजिट दावा दर्ज करें (Free Revisit Claim)
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowClaimForm(false)}
                      className="text-xs text-stone-500 hover:text-stone-800"
                    >
                      रद्द करें
                    </button>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-stone-700 block mb-1">
                      समस्या का विवरण (Problem Description) *
                    </label>
                    <textarea
                      rows={3}
                      value={claimDescription}
                      onChange={(e) => setClaimDescription(e.target.value)}
                      placeholder="उपकरण या पूर्व कार्य में क्या तकनीकी समस्या पुनः आ रही है?"
                      className="w-full p-2.5 text-xs rounded-xl border border-stone-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-stone-700 block mb-1">
                      सुविधाजनक संपर्क समय (Preferred Contact Slot)
                    </label>
                    <select
                      value={preferredContactTime}
                      onChange={(e) => setPreferredContactTime(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-xl border border-stone-300 bg-white"
                    >
                      <option value="10:00 AM - 12:00 PM">सुबह (10:00 AM - 12:00 PM)</option>
                      <option value="12:00 PM - 03:00 PM">दोपहर (12:00 PM - 03:00 PM)</option>
                      <option value="03:00 PM - 06:00 PM">शाम (03:00 PM - 06:00 PM)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingClaim}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50"
                  >
                    {submittingClaim ? 'दावा दर्ज हो रहा है...' : 'दावा सबमिट करें (Submit Claim)'}
                  </button>
                </form>
              ) : (
                !isExpired &&
                guarantee.status === 'active' && (
                  <button
                    type="button"
                    onClick={() => setShowClaimForm(true)}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>पुनः समस्या आने पर मुफ़्त रिविजिट मांगें (Request Free Revisit)</span>
                  </button>
                )
              )}

              {/* Terms & Exclusions */}
              <div className="space-y-2 pt-2 border-t border-stone-100 text-xs text-stone-500">
                <span className="font-bold text-stone-700 block">कवर की गई शर्तें (Covered Terms):</span>
                <ul className="list-disc pl-4 space-y-1 text-[11px]">
                  {guarantee.terms.map((t, idx) => (
                    <li key={idx}>{t}</li>
                  ))}
                </ul>

                <span className="font-bold text-stone-700 block pt-1">अपवाद (Exclusions):</span>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-stone-400">
                  {guarantee.exclusions.map((ex, idx) => (
                    <li key={idx}>{ex}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-stone-200 bg-stone-50 flex items-center justify-between text-xs text-stone-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            हार्डिनकाम सर्विस सुरक्षा गारंटी
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold rounded-lg text-xs transition"
          >
            बंद करें
          </button>
        </div>
      </div>
    </div>
  );
};
