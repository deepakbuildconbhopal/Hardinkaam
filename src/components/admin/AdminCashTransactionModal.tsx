import React, { useState } from 'react';
import {
  X,
  Banknote,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Receipt,
  User,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Booking } from '../../types';
import {
  approveCashTransaction,
  rejectCashTransaction,
  getAuthoritativePayableAmount,
  CashTransactionRecord,
} from '../../services/cashTransactionService';
import { useAuth } from '../../context/AuthContext';

interface AdminCashTransactionModalProps {
  booking: Booking | null;
  transaction?: CashTransactionRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AdminCashTransactionModal: React.FC<AdminCashTransactionModalProps> = ({
  booking,
  transaction,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { userProfile, currentUser } = useAuth();
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'review' | 'rejecting'>('review');

  if (!isOpen || !booking) return null;

  const transactionId = transaction?.transactionId || booking.cashTransactionId || `tx_cash_${booking.id}`;
  const payableAmount = transaction?.amount || getAuthoritativePayableAmount(booking);
  const adminName = userProfile?.name || currentUser?.email || 'DEEPAK (Super Admin)';

  const handleApprove = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await approveCashTransaction({
      transactionId,
      bookingId: booking.id,
      adminName,
      adminNotes: adminNotes.trim() || undefined,
    });

    setIsSubmitting(false);

    if (res.success) {
      setSuccessMessage('नकद भुगतान सत्यापित व स्वीकृत! बुकिंग का स्टेटस "Paid" हो गया है और कमीशन लेजर प्रविष्टियां दर्ज हो चुकी हैं।');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } else {
      setErrorMessage(res.userMessage || res.error || 'स्वीकृति प्रक्रिया में त्रुटि आई।');
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setErrorMessage('कृपया अस्वीकार करने का कारण दर्ज करें।');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await rejectCashTransaction({
      transactionId,
      bookingId: booking.id,
      rejectionReason: rejectionReason.trim(),
      adminName,
    });

    setIsSubmitting(false);

    if (res.success) {
      setSuccessMessage('नकद भुगतान अस्वीकार (Rejected) कर दिया गया है।');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } else {
      setErrorMessage(res.userMessage || res.error || 'अस्वीकार प्रक्रिया में त्रुटि आई।');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-stone-200">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-base text-white">
                नकद लेनदेन सत्यापन (Admin Cash Approval)
              </h3>
              <p className="text-xs text-slate-400">
                Booking #{booking.id} • {booking.serviceName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5">
          {successMessage ? (
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <p className="text-xs font-bold text-emerald-900">{successMessage}</p>
            </div>
          ) : (
            <>
              {errorMessage && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-semibold">{errorMessage}</span>
                </div>
              )}

              {/* Transaction Summary */}
              <div className="rounded-2xl bg-stone-50 border border-stone-200 p-4 space-y-2.5 text-xs">
                <div className="flex justify-between items-center border-b border-stone-200 pb-2">
                  <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                    Cash Transaction Details
                  </span>
                  <span className="font-mono text-[10px] text-stone-400">
                    {transactionId}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-stone-600">
                  <div>
                    <span className="text-stone-400 block">Customer:</span>
                    <strong className="text-stone-900">{booking.customerName || 'Customer'}</strong>
                  </div>
                  <div>
                    <span className="text-stone-400 block">Assigned Service Pro:</span>
                    <strong className="text-stone-900">{booking.serviceManName || 'Service Pro'}</strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-200 flex justify-between items-center text-sm font-black text-stone-900">
                  <span>Authoritative Amount (देय राशि):</span>
                  <span className="font-mono text-base text-emerald-700">₹{payableAmount}</span>
                </div>
              </div>

              {/* Multi-Level Commission Preview */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-200 text-xs text-indigo-950 space-y-1.5">
                <div className="font-bold text-[11px] flex items-center gap-1.5 text-indigo-900">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Commission Ledger Auto-Settlement Preview (On Approval):</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                  <div className="p-2 bg-white rounded-xl border border-indigo-100">
                    <span className="text-stone-400 block text-[9px]">Company (15%)</span>
                    <strong className="text-indigo-900 font-mono">₹{Math.round(payableAmount * 0.15)}</strong>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-indigo-100">
                    <span className="text-stone-400 block text-[9px]">Franchise Due (15%)</span>
                    <strong className="text-amber-800 font-mono">₹{Math.round(payableAmount * 0.15)}</strong>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-indigo-100">
                    <span className="text-stone-400 block text-[9px]">Technician (70%)</span>
                    <strong className="text-emerald-800 font-mono">₹{Math.round(payableAmount * 0.70)}</strong>
                  </div>
                </div>
              </div>

              {actionType === 'review' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      एडमिन टिप्पणी (Optional Admin Notes)
                    </label>
                    <input
                      type="text"
                      placeholder="उदा. नकद भुगतान सत्यापित व स्वीकृत किया गया।"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setActionType('rejecting')}
                      className="px-4 py-2.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition cursor-pointer"
                    >
                      अस्वीकार करें (Reject)
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleApprove}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold flex items-center gap-2 shadow-md transition cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      <span>नकद भुगतान स्वीकार करें (Approve & Settle)</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-rose-800 mb-1">
                      अस्वीकार करने का कारण (Rejection Reason) *
                    </label>
                    <input
                      type="text"
                      placeholder="उदा. नकद राशि अप्राप्त / मिसमैच"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full px-3 py-2 border border-rose-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setActionType('review')}
                      className="px-4 py-2.5 rounded-xl text-stone-600 hover:bg-stone-100 text-xs font-bold transition cursor-pointer"
                    >
                      पीछे जाएं (Back)
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting || !rejectionReason.trim()}
                      onClick={handleReject}
                      className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-2 shadow-md transition cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      <span>अस्वीकार की पुष्टि करें (Confirm Reject)</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
