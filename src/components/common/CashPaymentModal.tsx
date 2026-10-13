import React, { useState } from 'react';
import {
  X,
  Banknote,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Loader2,
  Clock,
  User,
  Info,
} from 'lucide-react';
import { Booking } from '../../types';
import {
  recordCashPaymentRequest,
  getAuthoritativePayableAmount,
  CashTransactionRecord,
} from '../../services/cashTransactionService';

interface CashPaymentModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  callerRole: 'SERVICE_PRO' | 'CUSTOMER';
  onSuccess?: (transactionId: string) => void;
}

export const CashPaymentModal: React.FC<CashPaymentModalProps> = ({
  booking,
  isOpen,
  onClose,
  callerRole,
  onSuccess,
}) => {
  const [confirmed, setConfirmed] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{ transactionId: string; amount: number } | null>(null);

  if (!isOpen || !booking) return null;

  const payableAmount = getAuthoritativePayableAmount(booking);
  const isPro = callerRole === 'SERVICE_PRO';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed) {
      setErrorMessage(
        isPro
          ? 'कृपया पुष्टि करें कि आपने ग्राहक से नकद राशि प्राप्त कर ली है।'
          : 'कृपया पुष्टि करें कि आपने टेक्नीशियन को नकद भुगतान कर दिया है।'
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await recordCashPaymentRequest({
      booking,
      callerRole,
      notes: notes.trim() || undefined,
    });

    setIsSubmitting(false);

    if (res.success && res.transactionId) {
      setSuccessResult({
        transactionId: res.transactionId,
        amount: res.amount || payableAmount,
      });
      if (onSuccess) {
        onSuccess(res.transactionId);
      }
    } else {
      // User-friendly Hindi message requirement:
      setErrorMessage(res.userMessage || 'Cash payment request submit nahi ho saki. Kripya dobara try karein.');
    }
  };

  const handleResetAndClose = () => {
    setConfirmed(false);
    setNotes('');
    setErrorMessage(null);
    setSuccessResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-stone-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white p-5 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-400/30">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-base text-white">
                {isPro ? 'नकद भुगतान दर्ज करें (Report Cash)' : 'नकद भुगतान अनुरोध (Pay in Cash)'}
              </h3>
              <p className="text-xs text-emerald-200/80">
                Booking #{booking.id} • {booking.serviceName}
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            disabled={isSubmitting}
            className="text-white/70 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5">
          {successResult ? (
            /* Success Confirmation View */
            <div className="text-center py-4 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center border-2 border-emerald-300">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <h4 className="text-lg font-black text-stone-900">
                  नकद भुगतान अनुरोध दर्ज हुआ!
                </h4>
                <p className="text-xs text-stone-500 mt-1 font-mono">
                  Txn ID: {successResult.transactionId}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-left text-xs text-emerald-950 space-y-2">
                <div className="flex justify-between font-bold border-b border-emerald-200/60 pb-1.5">
                  <span>Payable Amount:</span>
                  <span className="font-mono text-sm">₹{successResult.amount}</span>
                </div>
                <div className="flex items-start gap-2 pt-1 text-[11px] text-emerald-800">
                  <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    सुपर एडमिन (Deepak Buildcon) को सत्यापन अनुरोध भेज दिया गया है। एडमिन द्वारा सत्यापित करते ही अंतिम पेमेंट स्टेटस 'Paid' अपडेट हो जाएगा और कमीशन लेजर सेटल हो जाएगा।
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetAndClose}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                ठीक है (Close)
              </button>
            </div>
          ) : (
            /* Submission Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Banner */}
              {errorMessage && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-semibold">{errorMessage}</span>
                </div>
              )}

              {/* Authoritative Final Bill Summary (Tamper-Proof) */}
              <div className="rounded-2xl bg-stone-50 border border-stone-200 p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-stone-500 border-b border-stone-200 pb-2">
                  <span className="font-bold uppercase tracking-wider text-[10px]">
                    Authoritative Final Bill (अंतिम बिल)
                  </span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Verified
                  </span>
                </div>

                <div className="flex justify-between text-stone-600">
                  <span>मूल सेवा शुल्क (Base Service):</span>
                  <span className="font-mono font-semibold text-stone-900">
                    ₹{booking.finalBill?.baseAmount ?? booking.baseAmount ?? booking.amount}
                  </span>
                </div>

                {(booking.finalBill?.approvedExtraChargesAmount ?? 0) > 0 && (
                  <div className="flex justify-between text-amber-800">
                    <span>स्वीकृत अतिरिक्त शुल्क (Approved Extra):</span>
                    <span className="font-mono font-semibold">
                      + ₹{booking.finalBill?.approvedExtraChargesAmount}
                    </span>
                  </div>
                )}

                {(booking.finalBill?.applicableCharges ?? 0) > 0 && (
                  <div className="flex justify-between text-stone-600">
                    <span>प्लेटफॉर्म शुल्क (Safety Fee):</span>
                    <span className="font-mono font-semibold">+ ₹{booking.finalBill?.applicableCharges}</span>
                  </div>
                )}

                {(booking.finalBill?.discountAmount ?? booking.discount ?? 0) > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>छूट (Discount Applied):</span>
                    <span className="font-mono font-semibold">
                      - ₹{booking.finalBill?.discountAmount ?? booking.discount}
                    </span>
                  </div>
                )}

                <div className="flex justify-between pt-2 border-t border-stone-300 font-black text-stone-900 text-sm">
                  <span>कुल देय राशि (Total Payable):</span>
                  <span className="font-mono text-base text-emerald-700">₹{payableAmount}</span>
                </div>
              </div>

              {/* Notice Banner */}
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-950 text-xs flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="text-[11px]">
                  {isPro
                    ? 'सर्विसमैन केवल निर्धारित अंतिम बिल राशि का नकद भुगतान अनुरोध भेज सकते हैं। एडमिन सत्यापन के बाद ही पेमेंट स्टेटस "Paid" में बदलेगा।'
                    : 'नकद भुगतान अनुरोध दर्ज होने के बाद एडमिन द्वारा इसकी पुष्टि की जाएगी।'}
                </span>
              </div>

              {/* Remarks/Notes */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  टिप्पणी / विवरण (Optional Notes)
                </label>
                <input
                  type="text"
                  placeholder={isPro ? 'उदा. नकद ₹' + payableAmount + ' ग्राहक से प्राप्त किए' : 'उदा. कार्यस्थल पर नकद भुगतान किया गया'}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Confirmation Checkbox */}
              <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-2xl">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-stone-800">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="font-medium text-[11px] leading-relaxed">
                    {isPro
                      ? `मैं पुष्टि करता हूँ कि मैंने ग्राहक से ₹${payableAmount} की पूरी नकद राशि प्राप्त कर ली है और काम संतोषजनक रूप से पूर्ण हो चुका है।`
                      : `मैं पुष्टि करता हूँ कि मैंने सेवा पूर्ण होने पर ₹${payableAmount} की पूरी राशि नकद में दे दी है।`}
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleResetAndClose}
                  className="px-4 py-2.5 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl transition cursor-pointer"
                >
                  रद्द करें (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={!confirmed || isSubmitting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Banknote className="w-4 h-4" />
                  )}
                  <span>नकद भुगतान अनुरोध भेजें (Submit)</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
