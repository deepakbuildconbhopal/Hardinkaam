import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  X,
  RefreshCw,
  Sparkles,
  Info,
} from 'lucide-react';
import { doc, updateDoc, getDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useNotifications } from '../../context/NotificationContext';
import { Booking } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onRescheduleSuccess?: (updatedDate: string, updatedTime: string) => void;
}

export const RescheduleModal: React.FC<Props> = ({
  isOpen,
  onClose,
  booking,
  onRescheduleSuccess,
}) => {
  const { sendNotification } = useNotifications();

  // Compute minimum selectable date (today in YYYY-MM-DD)
  const todayStr = new Date().toISOString().split('T')[0];

  // Helper to format Date to YYYY-MM-DD
  const formatDateISO = (d: Date) => d.toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState<string>(
    booking?.scheduledDate || todayStr
  );
  const [selectedTime, setSelectedTime] = useState<string>(
    booking?.scheduledTime || '10:00 AM - 12:00 PM'
  );
  const [rescheduleReason, setRescheduleReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync state whenever booking changes
  React.useEffect(() => {
    if (booking) {
      setSelectedDate(booking.scheduledDate || todayStr);
      setSelectedTime(booking.scheduledTime || '10:00 AM - 12:00 PM');
      setErrorMsg(null);
      setSuccessMsg(null);
      setRescheduleReason('');
    }
  }, [booking, todayStr]);

  if (!isOpen || !booking) return null;

  const isPending = booking.status === 'pending';

  const timeSlots = [
    '08:00 AM - 10:00 AM',
    '10:00 AM - 12:00 PM',
    '12:00 PM - 02:00 PM',
    '02:00 PM - 04:00 PM',
    '04:00 PM - 06:00 PM',
    '06:00 PM - 08:00 PM',
  ];

  // Quick preset date helpers
  const handleSetPresetDate = (daysFromNow: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    setSelectedDate(formatDateISO(d));
    setErrorMsg(null);
  };

  const handleSetWeekend = () => {
    const d = new Date();
    const day = d.getDay();
    // Days until next Saturday (6)
    const diff = (6 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    setSelectedDate(formatDateISO(d));
    setErrorMsg(null);
  };

  const handleConfirmReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPending) {
      setErrorMsg('This booking cannot be rescheduled because it is no longer in pending status.');
      return;
    }

    if (!selectedDate) {
      setErrorMsg('Please select a valid new appointment date.');
      return;
    }

    if (selectedDate < todayStr) {
      setErrorMsg('Appointment date cannot be in the past.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // 1. Verify fresh status in Firestore
      const bookingRef = doc(db, 'bookings', booking.id);
      const bookingSnap = await getDoc(bookingRef);

      if (!bookingSnap.exists()) {
        throw new Error('Booking record was not found in the database.');
      }

      const currentStatus = bookingSnap.data().status;
      if (currentStatus !== 'pending') {
        throw new Error(
          `Booking has already been updated to "${currentStatus}". Rescheduling is only allowed while status is "pending".`
        );
      }

      const previousDate = booking.scheduledDate;
      const previousTime = booking.scheduledTime;
      const nowIso = new Date().toISOString();
      const newCount = (booking.rescheduleCount || 0) + 1;

      // 2. Update Firestore with new scheduledDate
      await updateDoc(bookingRef, {
        scheduledDate: selectedDate,
        scheduledTime: selectedTime,
        rescheduledAt: nowIso,
        rescheduleCount: newCount,
        rescheduleReason: rescheduleReason || 'Customer requested date change',
        updatedAt: nowIso,
      });

      // 3. Record in audit_logs collection
      try {
        await addDoc(collection(db, 'audit_logs'), {
          entityType: 'booking',
          entityId: booking.id,
          action: 'rescheduled',
          performedBy: booking.customerId,
          performedByRole: 'customer',
          previousDate,
          newDate: selectedDate,
          previousTime,
          newTime: selectedTime,
          reason: rescheduleReason || null,
          timestamp: nowIso,
        });
      } catch (logErr) {
        console.warn('Audit log write skipped:', logErr);
      }

      // 4. Send notification
      sendNotification({
        title: 'Booking Rescheduled',
        message: `Your booking for "${booking.serviceName}" has been successfully rescheduled to ${selectedDate} (${selectedTime}).`,
        type: 'booking',
        link: booking.id,
      });

      setSuccessMsg(`Rescheduled successfully to ${selectedDate}!`);

      if (onRescheduleSuccess) {
        onRescheduleSuccess(selectedDate, selectedTime);
      }

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Failed to reschedule booking:', err);
      setErrorMsg(err.message || 'Failed to update appointment date in Firestore. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="reschedule-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
    >
      <div
        id="reschedule-modal-card"
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-stone-900 leading-tight">
                Reschedule Service
              </h3>
              <p className="text-xs text-stone-500">
                {booking.serviceName} • <span className="font-mono">#{booking.id}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Status Context Banner */}
          {isPending ? (
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900">
              <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Status: Pending Assignment</span>
                <p className="text-amber-800/90 text-[11px] mt-0.5 leading-relaxed">
                  You can modify the appointment date freely while your booking is awaiting technician allocation. Once confirmed by a technician, changes require contacting support.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Rescheduling Not Available</span>
                <p className="text-rose-700 text-[11px] mt-0.5">
                  This booking status is currently <strong>{booking.status}</strong>. Only <strong>pending</strong> bookings can be rescheduled directly through this portal.
                </p>
              </div>
            </div>
          )}

          {/* Current Schedule Summary */}
          <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                Current Scheduled Date
              </span>
              <span className="font-bold text-stone-800 flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-stone-500" />
                {booking.scheduledDate}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                Time Window
              </span>
              <span className="font-semibold text-stone-700 flex items-center gap-1.5 mt-0.5 justify-end">
                <Clock className="w-3.5 h-3.5 text-stone-500" />
                {booking.scheduledTime}
              </span>
            </div>
          </div>

          <form onSubmit={handleConfirmReschedule} className="space-y-4">
            {/* Date Picker Input */}
            <div>
              <label
                htmlFor="reschedule-date-picker"
                className="block text-xs font-bold text-stone-800 mb-1.5"
              >
                Select New Appointment Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="reschedule-date-picker"
                  type="date"
                  min={todayStr}
                  disabled={!isPending || isSubmitting}
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setErrorMsg(null);
                  }}
                  className="w-full px-4 py-2.5 rounded-2xl border border-stone-200 bg-white text-sm font-semibold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all disabled:bg-stone-100 disabled:cursor-not-allowed"
                  required
                />
              </div>

              {/* Quick Presets */}
              {isPending && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[11px] text-stone-400 mr-1">Quick pick:</span>
                  <button
                    type="button"
                    onClick={() => handleSetPresetDate(1)}
                    className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPresetDate(2)}
                    className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    In 2 Days
                  </button>
                  <button
                    type="button"
                    onClick={handleSetWeekend}
                    className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    This Weekend
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPresetDate(7)}
                    className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    In 1 Week
                  </button>
                </div>
              )}
            </div>

            {/* Time Slot Picker */}
            <div>
              <label
                htmlFor="reschedule-time-slot"
                className="block text-xs font-bold text-stone-800 mb-1.5"
              >
                Select Preferred Time Window
              </label>
              <div className="grid grid-cols-2 gap-2">
                {timeSlots.map((slot) => {
                  const isSelected = selectedTime === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={!isPending || isSubmitting}
                      onClick={() => setSelectedTime(slot)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium text-left border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-orange-50 border-orange-500 text-orange-800 font-bold ring-2 ring-orange-500/20'
                          : 'bg-white border-stone-200 hover:border-stone-300 text-stone-700'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Reason Note */}
            <div>
              <label
                htmlFor="reschedule-reason"
                className="block text-xs font-bold text-stone-800 mb-1"
              >
                Reason for Rescheduling <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                id="reschedule-reason"
                type="text"
                disabled={!isPending || isSubmitting}
                placeholder="e.g., Availability changed, out of town, need later slot"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-xs text-stone-800 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              />
            </div>

            {/* Error Feedback */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success Feedback */}
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Footer Actions */}
            <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-reschedule"
                type="submit"
                disabled={!isPending || isSubmitting || !selectedDate}
                className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all shadow-xs shadow-orange-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating Firestore...</span>
                  </>
                ) : (
                  <>
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Confirm Reschedule</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
