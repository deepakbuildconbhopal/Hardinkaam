import React, { useState } from 'react';
import { Booking, ExtraChargeItem } from '../../types';
import {
  proposeExtraChargeServer,
  respondExtraChargeServer,
} from '../../services/billingTrackingService';
import {
  Plus,
  AlertCircle,
  Check,
  X,
  Package,
  Wrench,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';

interface ExtraChargesManagerProps {
  booking: Booking;
  userRole: 'customer' | 'service_man' | 'business_partner' | 'admin';
  userId: string;
  userName?: string;
  onChargesUpdated?: () => void;
  className?: string;
}

export const ExtraChargesManager: React.FC<ExtraChargesManagerProps> = ({
  booking,
  userRole,
  userId,
  userName,
  onChargesUpdated,
  className = '',
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [type, setType] = useState<'material' | 'service'>('material');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const charges: ExtraChargeItem[] = Array.isArray(booking.extraCharges) ? booking.extraCharges : [];
  const isPro = userRole === 'service_man';
  const isCustomer = userRole === 'customer';
  const isBookingActive = booking.status === 'in_progress' || booking.status === 'work_started' || booking.trackingStatus === 'work_started';

  const pendingCharges = charges.filter((c) => c.status === 'pending');
  const approvedCharges = charges.filter((c) => c.status === 'approved');
  const rejectedCharges = charges.filter((c) => c.status === 'rejected');

  const calculatedTotal = Math.max(1, quantity) * Math.max(0, Number(unitPrice) || 0);

  const handleProposeCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !unitPrice) {
      setErrorMessage('Please enter description and unit price.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const result = await proposeExtraChargeServer({
      bookingId: booking.id,
      serviceManId: userId,
      serviceManName: userName || booking.serviceManName,
      type,
      description: description.trim(),
      quantity: Math.max(1, quantity),
      unitPrice: Math.max(0, Number(unitPrice) || 0),
      notes: notes.trim() || undefined,
    });

    setSubmitting(false);

    if (result.success) {
      setDescription('');
      setQuantity(1);
      setUnitPrice('');
      setNotes('');
      setIsAdding(false);
      setSuccessMessage('Extra charge proposed! Awaiting customer approval.');
      setTimeout(() => setSuccessMessage(null), 4000);
      if (onChargesUpdated) onChargesUpdated();
    } else {
      setErrorMessage(result.error || 'Failed to propose extra charge.');
    }
  };

  const handleRespond = async (chargeId: string, decision: 'approve' | 'reject') => {
    setRespondingId(chargeId);
    setErrorMessage(null);

    const result = await respondExtraChargeServer({
      bookingId: booking.id,
      customerId: userId,
      chargeId,
      decision,
    });

    setRespondingId(null);

    if (result.success) {
      setSuccessMessage(decision === 'approve' ? 'Charge approved and added to estimated bill.' : 'Charge rejected.');
      setTimeout(() => setSuccessMessage(null), 4000);
      if (onChargesUpdated) onChargesUpdated();
    } else {
      setErrorMessage(result.error || 'Failed to submit response.');
    }
  };

  return (
    <div id={`extra-charges-manager-${booking.id}`} className={`space-y-4 ${className}`}>
      {/* Alert Messages */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* CUSTOMER VIEW: PENDING CHARGES REQUIRING APPROVAL */}
      {isCustomer && pendingCharges.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 animate-pulse-once">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            <h4 className="font-bold text-amber-950 text-sm">
              Additional Charge Proposed (अतिरिक्त शुल्क अनुमोदन)
            </h4>
          </div>
          <p className="text-xs text-amber-900/80">
            The service professional has requested an additional charge for extra service or required replacement material. Review and decide below:
          </p>

          <div className="space-y-3 pt-1">
            {pendingCharges.map((charge) => (
              <div
                key={charge.id}
                className="bg-white border border-amber-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        charge.type === 'service'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {charge.type === 'service' ? 'Extra Service' : 'Material / Spare Part'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {charge.quantity > 1 ? `${charge.quantity} × ₹${charge.unitPrice}` : ''}
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 text-sm">{charge.description}</div>
                  {charge.notes && <div className="text-xs text-slate-500 italic">{charge.notes}</div>}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="font-mono text-base font-extrabold text-slate-900 sm:text-right">
                    ₹{charge.total}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={respondingId === charge.id}
                      onClick={() => handleRespond(charge.id, 'reject')}
                      className="px-3 py-1.5 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                    <button
                      disabled={respondingId === charge.id}
                      onClick={() => handleRespond(charge.id, 'approve')}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
                    >
                      {respondingId === charge.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>Approve</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-amber-800/70 italic">
            * Until you approve, this charge will NOT be added to your final payable bill.
          </p>
        </div>
      )}

      {/* SERVICE PROFESSIONAL VIEW: PROPOSE EXTRA CHARGE BUTTON & FORM */}
      {isPro && isBookingActive && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          {!isAdding ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-semibold text-sm text-slate-900">
                  Extra Work or Material Charges
                </h4>
                <p className="text-xs text-slate-500">
                  Did customer request additional repairs or need replacement spare parts?
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add Extra Charge (अतिरिक्त शुल्क जोड़ें)</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleProposeCharge} className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h4 className="font-bold text-sm text-slate-900">
                  Add Extra Service / Material Charge
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Type selector */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('material')}
                  className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    type === 'material'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-900'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Package className="w-4 h-4 text-amber-600" />
                  <span>Spare Part / Material</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType('service')}
                  className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    type === 'service'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-900'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Wrench className="w-4 h-4 text-amber-600" />
                  <span>Extra Service Work</span>
                </button>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Description / Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    type === 'material'
                      ? 'e.g., Copper Pipe 2m, Fan Capacitor, Brass Valve'
                      : 'e.g., Additional switchboard repair, deep coil chemical wash'
                  }
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Quantity & Unit Price */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Unit Price (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    placeholder="₹ 0"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Total (₹)</label>
                  <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900">
                    ₹{calculatedTotal}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Notes / Reason (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Old capacitor was burnt; customer requested replacement."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg text-xs hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Propose to Customer (अनुमोदन हेतु भेजें)</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ALL CHARGES RECORD LIST */}
      {charges.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            Additional Charges Log ({charges.length})
          </span>
          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
            {charges.map((c) => (
              <div
                key={c.id}
                className={`p-3 flex items-center justify-between ${
                  c.status === 'approved'
                    ? 'bg-emerald-50/40'
                    : c.status === 'rejected'
                    ? 'bg-rose-50/30'
                    : 'bg-amber-50/30'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-900">{c.description}</span>
                    <span className="text-[11px] text-slate-400">
                      ({c.quantity} × ₹{c.unitPrice})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="capitalize">{c.type}</span>
                    <span>•</span>
                    <span>Added {new Date(c.addedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-bold text-slate-900">₹{c.total}</span>
                  {c.status === 'approved' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Approved
                    </span>
                  )}
                  {c.status === 'pending' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                      <Clock className="w-3 h-3 text-amber-600" />
                      Pending Approval
                    </span>
                  )}
                  {c.status === 'rejected' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                      <XCircle className="w-3 h-3 text-rose-600" />
                      Rejected
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
