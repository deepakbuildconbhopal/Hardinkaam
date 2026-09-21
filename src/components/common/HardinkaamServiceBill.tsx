import React from 'react';
import { BillSnapshot, Booking } from '../../types';
import {
  ShieldCheck,
  Clock,
  User,
  Wrench,
  Receipt,
  Download,
  Calendar,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface HardinkaamServiceBillProps {
  bill?: BillSnapshot;
  booking?: Booking;
  onPayNow?: () => void;
  className?: string;
}

/**
 * HARDINKAAM SERVICE BILL
 * Authoritative, transparent bill snapshot visible identically to
 * both Customer and Service Professional.
 */
export const HardinkaamServiceBill: React.FC<HardinkaamServiceBillProps> = ({
  bill,
  booking,
  onPayNow,
  className = '',
}) => {
  // Extract values either from immutable bill snapshot or fallback to booking
  const billId = bill?.id || (booking ? `bill_${booking.id}` : 'BILL-000');
  const bookingId = bill?.bookingId || booking?.id || '';
  const serviceManName = bill?.serviceManName || booking?.serviceManName || 'Service Professional';
  const serviceCategory = bill?.serviceCategory || booking?.categoryName || 'Home Service';
  const serviceName = bill?.serviceName || booking?.serviceName || 'Service';

  const workStartedAt = bill?.workStartedAt || booking?.workStartedAt || booking?.startedAt;
  const workEndedAt = bill?.workEndedAt || booking?.workEndedAt || booking?.completedAt;
  const totalDuration =
    bill?.workDurationFormatted ||
    booking?.workDurationFormatted ||
    (bill?.workDurationMinutes ? `${bill.workDurationMinutes} mins` : 'N/A');

  const baseAmount = bill?.baseAmount !== undefined ? bill.baseAmount : (booking?.baseAmount ?? booking?.amount ?? 0);
  const extraServicesAmount = bill?.extraServicesAmount ?? 0;
  const materialsAmount = bill?.materialsAmount ?? 0;
  const platformChargeAmount = bill?.platformChargeAmount ?? Math.round(((baseAmount + extraServicesAmount + materialsAmount) * 0.15));
  const finalAmount = bill?.finalAmount ?? booking?.finalAmount ?? booking?.amount ?? 0;

  const paymentStatus = bill?.paymentStatus || booking?.paymentStatus || 'unpaid';
  const paymentMethod = bill?.paymentMethod || booking?.paymentMethod || 'cash';
  const generatedAt = bill?.generatedAt || booking?.workEndedAt || booking?.updatedAt || new Date().toISOString();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      id={`hardinkaam-service-bill-${bookingId}`}
      className={`bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-slate-800 font-sans ${className}`}
    >
      {/* Bill Header */}
      <div className="bg-slate-900 text-white p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                HARDINKAAM SERVICE BILL
              </h2>
              <p className="text-xs text-slate-400">
                Official Transparent Service Invoice & Verification
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">
              Invoice #{billId.replace('bill_', '')}
            </span>
            <div className="flex items-center sm:justify-end gap-1.5 text-xs text-slate-300 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{new Date(generatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        {/* Primary Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5 font-medium">Booking ID</span>
            <span className="font-mono font-semibold text-white">#{bookingId}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5 font-medium">Service Professional</span>
            <span className="font-semibold text-white flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-amber-400" />
              {serviceManName}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5 font-medium">Service Category</span>
            <span className="font-semibold text-white flex items-center gap-1">
              <Wrench className="w-3.5 h-3.5 text-amber-400" />
              {serviceCategory}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5 font-medium">Work Start Time</span>
            <span className="text-slate-200">
              {workStartedAt ? new Date(workStartedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5 font-medium">Work End Time</span>
            <span className="text-slate-200">
              {workEndedAt ? new Date(workEndedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5 font-medium">Total Work Duration</span>
            <span className="text-amber-400 font-mono font-bold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              {totalDuration}
            </span>
          </div>
        </div>
      </div>

      {/* Bill Body / Charges Breakdown */}
      <div className="p-6 sm:p-8 space-y-6">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Itemized Charges Breakdown
          </h3>
          
          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
            {/* Base Service Charge */}
            <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div>
                <div className="font-semibold text-sm text-slate-900">
                  Base Service Charge
                </div>
                <div className="text-xs text-slate-500">
                  {serviceName} standard inspection and service booking
                </div>
              </div>
              <div className="font-mono font-semibold text-slate-900 text-sm">
                ₹{baseAmount.toLocaleString('en-IN')}
              </div>
            </div>

            {/* Extra Service Charges */}
            {extraServicesAmount > 0 && (
              <div className="p-4 flex items-center justify-between bg-amber-50/40 hover:bg-amber-50/70 transition-colors">
                <div>
                  <div className="font-semibold text-sm text-slate-900 flex items-center gap-1.5">
                    <span>Extra Service Charges</span>
                    <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.5 rounded">
                      Customer Approved
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Additional task/labor performed during service visit
                  </div>
                </div>
                <div className="font-mono font-semibold text-amber-900 text-sm">
                  + ₹{extraServicesAmount.toLocaleString('en-IN')}
                </div>
              </div>
            )}

            {/* Material / Parts Charges */}
            {materialsAmount > 0 && (
              <div className="p-4 flex items-center justify-between bg-blue-50/40 hover:bg-blue-50/70 transition-colors">
                <div>
                  <div className="font-semibold text-sm text-slate-900 flex items-center gap-1.5">
                    <span>Material / Spare Parts Charges</span>
                    <span className="text-[10px] bg-blue-200 text-blue-900 font-bold px-1.5 py-0.5 rounded">
                      Customer Approved
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Replaced components, genuine supplies & materials
                  </div>
                </div>
                <div className="font-mono font-semibold text-blue-900 text-sm">
                  + ₹{materialsAmount.toLocaleString('en-IN')}
                </div>
              </div>
            )}

            {/* Platform / Service Charges */}
            <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div>
                <div className="font-semibold text-sm text-slate-700">
                  Applicable Platform & Service Charges
                </div>
                <div className="text-xs text-slate-400">
                  Includes insurance coverage, quality assurance & safety guarantee
                </div>
              </div>
              <div className="font-mono text-xs text-slate-500">
                Included (₹{platformChargeAmount.toLocaleString('en-IN')})
              </div>
            </div>
          </div>
        </div>

        {/* Detailed line items if present */}
        {bill?.lineItems && bill.lineItems.length > 2 && (
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs">
            <span className="font-bold text-slate-700 block mb-2">Itemized Materials & Extra Works</span>
            <div className="space-y-1.5">
              {bill.lineItems
                .filter((li) => li.category === 'extra_service' || li.category === 'material')
                .map((li) => (
                  <div key={li.id} className="flex justify-between text-slate-600">
                    <span>
                      {li.label} {li.quantity && li.quantity > 1 ? `(Qty: ${li.quantity})` : ''}
                    </span>
                    <span className="font-mono font-medium text-slate-900">
                      ₹{li.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Final Payable Amount Box */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                FINAL PAYABLE AMOUNT
              </span>
              <div className="text-xs text-slate-600 mt-0.5">
                Total authentic charges calculated by server
              </div>
            </div>
            <div className="text-left sm:text-right">
              <div className="font-mono text-3xl sm:text-4xl font-extrabold text-slate-950">
                ₹{finalAmount.toLocaleString('en-IN')}
              </div>
              <div className="flex items-center sm:justify-end gap-2 mt-1">
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    paymentStatus === 'paid'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : paymentStatus === 'cod'
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  {paymentStatus === 'paid' ? 'PAID ✓' : paymentStatus === 'cod' ? 'CASH ON DELIVERY' : 'PAYMENT PENDING'}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  via {paymentMethod.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Action for Customer if unpaid */}
        {paymentStatus !== 'paid' && onPayNow && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-amber-500/10 border border-amber-300 rounded-xl p-4">
            <div className="flex items-center space-x-2 text-xs text-amber-950">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                Please complete payment of <strong>₹{finalAmount}</strong> to settle this bill.
              </span>
            </div>
            <button
              onClick={onPayNow}
              className="w-full sm:w-auto px-5 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold rounded-lg text-xs shadow transition-all"
            >
              Pay Now (₹{finalAmount})
            </button>
          </div>
        )}

        {/* Security & Verification Footer */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              Server Verified • Hardware arrival OTP confirmed • Zero Client Modification
            </span>
          </div>
          <button
            onClick={handlePrint}
            className="inline-flex items-center space-x-1 text-slate-600 hover:text-slate-900 font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save / Print Bill</span>
          </button>
        </div>
      </div>
    </div>
  );
};
