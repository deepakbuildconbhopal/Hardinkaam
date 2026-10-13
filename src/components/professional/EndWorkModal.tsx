import React, { useState, useEffect } from 'react';
import { Booking, BillSnapshot } from '../../types';
import {
  completeWorkServer,
  calculateCurrentBillServer,
  CurrentBillBreakdown,
} from '../../services/billingTrackingService';
import { WorkServiceTimer } from '../common/WorkServiceTimer';
import {
  CheckCircle2,
  AlertTriangle,
  Receipt,
  X,
  Loader2,
  ShieldCheck,
  Clock,
  Sparkles,
} from 'lucide-react';

interface EndWorkModalProps {
  booking: Booking;
  serviceManId: string;
  isOpen: boolean;
  onClose: () => void;
  onCompleted: (finalBill: BillSnapshot) => void;
}

export const EndWorkModal: React.FC<EndWorkModalProps> = ({
  booking,
  serviceManId,
  isOpen,
  onClose,
  onCompleted,
}) => {
  const [breakdown, setBreakdown] = useState<CurrentBillBreakdown | null>(null);
  const [loadingBreakdown, setLoadingBreakdown] = useState(true);
  const [notes, setNotes] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setConfirmed(false);
    setErrorMessage(null);
    setLoadingBreakdown(true);

    calculateCurrentBillServer(booking.id).then((res) => {
      setLoadingBreakdown(false);
      if (res.success && res.breakdown) {
        setBreakdown(res.breakdown);
      } else {
        // Fallback calculation from booking directly
        const base = Number(booking.baseAmount !== undefined ? booking.baseAmount : (booking.amount || 0));
        const approved = (booking.extraCharges || []).filter((c) => (c.approvalStatus || c.status) === 'approved');
        const pending = (booking.extraCharges || []).filter((c) => (c.approvalStatus || c.status) === 'pending');
        const extraServ = approved.filter((c) => c.type === 'service').reduce((s, c) => s + c.total, 0);
        const mat = approved.filter((c) => c.type === 'material' || c.type === 'other').reduce((s, c) => s + c.total, 0);
        const approvedExtra = extraServ + mat;
        const appCharges = Number(booking.applicableCharges !== undefined ? booking.applicableCharges : 29);
        const disc = Number(booking.discount !== undefined ? booking.discount : (booking.discountAmount || 0));
        const pend = pending.reduce((s, c) => s + c.total, 0);
        setBreakdown({
          baseAmount: base,
          approvedExtraChargesAmount: approvedExtra,
          extraServicesAmount: extraServ,
          materialsAmount: mat,
          applicableCharges: appCharges,
          discount: disc,
          pendingTotal: pend,
          currentEstimatedFinal: Math.max(0, base + approvedExtra + appCharges - disc),
          approvedCount: approved.length,
          pendingCount: pending.length,
        });
      }
    });
  }, [isOpen, booking]);

  if (!isOpen) return null;

  const handleComplete = async () => {
    if (isSubmitting) return;
    if (!confirmed) {
      setErrorMessage('Please confirm that you have completed the service with customer satisfaction.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await completeWorkServer({
      bookingId: booking.id,
      serviceManId,
      notes: notes.trim() || undefined,
    });

    setIsSubmitting(false);

    if (res.success && res.finalBill) {
      onCompleted(res.finalBill);
      onClose();
    } else {
      setErrorMessage(res.error || 'Could not complete work. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                काम पूरा करें (Complete Service)
              </h3>
              <p className="text-xs text-slate-400">
                Booking #{booking.id} • {booking.serviceName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Live Work Timer */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
              Service Work Duration (कार्य अवधि)
            </label>
            <WorkServiceTimer
              workStartedAt={booking.workStartedAt || booking.startedAt}
              status={booking.status}
              compact={false}
            />
          </div>

          {/* Current Estimated Charges Breakdown */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Transparent Charges Breakdown (पारदर्शी शुल्क)
              </label>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Server-Calculated
              </span>
            </div>

            {loadingBreakdown ? (
              <div className="p-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                <span>Calculating server charges...</span>
              </div>
            ) : breakdown ? (
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 divide-y divide-slate-200 text-xs">
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-600">Base Service Charge</span>
                  <span className="font-mono font-semibold text-slate-900">
                    ₹{breakdown.baseAmount}
                  </span>
                </div>
                {(breakdown.approvedExtraChargesAmount || (breakdown.extraServicesAmount + breakdown.materialsAmount)) > 0 && (
                  <div className="flex justify-between py-1.5 text-amber-900">
                    <span>Approved Extra Charges</span>
                    <span className="font-mono font-semibold">
                      + ₹{breakdown.approvedExtraChargesAmount ?? (breakdown.extraServicesAmount + breakdown.materialsAmount)}
                    </span>
                  </div>
                )}
                {(breakdown.applicableCharges ?? 0) > 0 && (
                  <div className="flex justify-between py-1.5 text-slate-600">
                    <span>Applicable Charges (Safety & Platform Fee)</span>
                    <span className="font-mono font-semibold">+ ₹{breakdown.applicableCharges}</span>
                  </div>
                )}
                {(breakdown.discount ?? 0) > 0 && (
                  <div className="flex justify-between py-1.5 text-emerald-700">
                    <span>Discount Applied</span>
                    <span className="font-mono font-semibold">- ₹{breakdown.discount}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 pt-3 font-bold text-slate-900 border-t border-slate-300">
                  <span className="text-sm">Final Amount</span>
                  <span className="font-mono text-base text-emerald-700">
                    ₹{breakdown.currentEstimatedFinal}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          {/* Pending extra charges warning */}
          {breakdown && breakdown.pendingCount > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Warning: {breakdown.pendingCount} extra charge(s)</strong> are currently pending customer approval.
                Only charges approved by the customer will be included in the final bill.
              </div>
            </div>
          )}

          {/* Work Completion Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Completion Notes / Remarks (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g., Repaired wiring, replaced burnt capacitor, tested appliance in customer presence."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Confirmation Checkbox */}
          <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-800">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span className="font-medium">
                I confirm the requested work is fully finished, tested, and demonstrated to the customer. Once submitted, the work timer will stop and the final HARDINKAAM SERVICE BILL will be generated.
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!confirmed || isSubmitting}
              onClick={handleComplete}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>काम पूरा करें & बिल बनाएं (Complete & Generate Bill)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
