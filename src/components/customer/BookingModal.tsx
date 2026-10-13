import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  CreditCard,
  CheckCircle2,
  ShieldCheck,
  User,
  Phone,
  AlertCircle,
  FileText,
  ChevronRight,
  Sparkles,
  MessageSquare,
  Play,
  RotateCcw,
  CheckSquare,
  XCircle,
  ArrowRight,
  Timer,
  Award,
  Navigation,
  ExternalLink,
  WifiOff,
  Database,
} from 'lucide-react';
import {
  addDoc,
  collection,
  doc,
  setDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { offlineBookingSyncService } from '../../services/offlineBookingSyncService';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Service, ServiceMan, Booking, PaymentMethod, BookingStatus } from '../../types';
import { razorpayClientService } from '../../services/razorpayClientService';
import {
  LIFECYCLE_STEPS,
  CANCELLED_STATE,
  getStepIndex,
  canTransitionStatus,
  executeStatusTransition,
} from '../../utils/bookingStateMachine';
import { MessageInterface } from '../common/MessageInterface';
import { ReviewSubmitForm } from './ReviewComponent';
import {
  notifyBookingCreated,
  notifyBookingAccepted,
  notifyWorkStarted,
  notifyWorkCompleted,
  notifyCancellation,
} from '../../services/bookingNotificationIntegrationService';
import { bookingOfferService } from '../../services/bookingOfferService';
import { LazyImage } from '../common/LazyImage';
import {
  calculateIndianGst,
  recordTaxAuditLog,
} from '../../services/indianTaxEngineService';
import { TaxCalculationResult } from '../../types/tax';
import {
  getCustomerRewardWallet,
  getRewardSettings,
  validateRewardRedemption,
  reserveRewardPoints,
  finalizePointRedemption,
  releaseRewardPoints,
  reverseRewardRedemption,
  CustomerRewardWallet,
  RewardSettings,
} from '../../services/rewardService';
import { AuthModal } from '../auth/AuthModal';
import { DeliveryOtpPrompt } from './DeliveryOtpPrompt';
import { RescheduleModal } from './RescheduleModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  service?: Service | null;
  initialPro?: ServiceMan | null;
  serviceMen?: ServiceMan[];
  onBookingSuccess?: (booking: Booking) => void;
  existingBooking?: Booking | null;
}

export const BookingModal: React.FC<Props> = ({
  isOpen,
  onClose,
  service,
  initialPro,
  serviceMen = [],
  onBookingSuccess,
  existingBooking,
}) => {
  const { currentUser, userProfile, activeRole } = useAuth();
  const { sendNotification } = useNotifications();

  // Active view mode in modal:
  // If existingBooking is provided -> 'lifecycle'
  // Else -> 'create'
  const [activeBooking, setActiveBooking] = useState<Booking | null>(existingBooking || null);
  const [activeTab, setActiveTab] = useState<'lifecycle' | 'chat' | 'details'>('lifecycle');

  // Step for booking creation
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedProId, setSelectedProId] = useState<string>(initialPro ? initialPro.id : 'auto');

  // Sync selectedProId whenever initialPro or modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialPro) {
        setSelectedProId(initialPro.id);
      } else {
        setSelectedProId('auto');
      }
      setStep(1);
    }
  }, [initialPro, isOpen]);

  // Date & Time
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const [scheduledDate, setScheduledDate] = useState<string>(todayStr);
  const [scheduledTime, setScheduledTime] = useState<string>('11:00 AM - 01:00 PM');
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Address
  const [customerName, setCustomerName] = useState(
    userProfile?.name || currentUser?.displayName || ''
  );
  const [customerPhone, setCustomerPhone] = useState(userProfile?.phone || '');
  const [address, setAddress] = useState(userProfile?.address || '');
  const [city, setCity] = useState(userProfile?.city || 'Bhopal');
  const [pincode, setPincode] = useState(userProfile?.pincode || '462011');
  const [notes, setNotes] = useState('');

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentFailureInfo, setPaymentFailureInfo] = useState<{
    code?: string;
    reason?: string;
    description: string;
    orderId?: string;
  } | null>(null);

  // State machine transition dialog state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Change of plans');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);

  // Reward Points Redemption State
  const [rewardWallet, setRewardWallet] = useState<CustomerRewardWallet | null>(null);
  const [rewardSettings, setRewardSettings] = useState<RewardSettings | null>(null);
  const [isUsingRewards, setIsUsingRewards] = useState(false);
  const [pointsToRedeemInput, setPointsToRedeemInput] = useState<string>('');
  const [rewardError, setRewardError] = useState<string | null>(null);

  // Load reward wallet and settings on modal open
  useEffect(() => {
    if (!isOpen || !currentUser?.uid) return;
    let isMounted = true;
    const fetchRewards = async () => {
      try {
        const [w, s] = await Promise.all([
          getCustomerRewardWallet(currentUser.uid),
          getRewardSettings(),
        ]);
        if (isMounted) {
          setRewardWallet(w);
          setRewardSettings(s);
          setIsUsingRewards(false);
          setPointsToRedeemInput('');
          setRewardError(null);
        }
      } catch (err) {
        console.warn('Notice fetching reward wallet:', err);
      }
    };
    fetchRewards();
    return () => {
      isMounted = false;
    };
  }, [isOpen, currentUser?.uid]);

  // Sync state if existingBooking prop changes
  useEffect(() => {
    if (existingBooking) {
      setActiveBooking(existingBooking);
      setActiveTab('lifecycle');
    } else if (!service && !existingBooking) {
      setActiveBooking(null);
    }
  }, [existingBooking, service]);

  // Real-time listener on the active booking document
  useEffect(() => {
    if (!activeBooking?.id || !isOpen) return;

    const unsub = onSnapshot(
      doc(db, 'bookings', activeBooking.id),
      (docSnap) => {
        if (docSnap.exists()) {
          setActiveBooking({ id: docSnap.id, ...docSnap.data() } as Booking);
        }
      },
      (err) => {
        console.warn('Booking realtime sync notice:', err.message);
      }
    );

    return () => unsub();
  }, [activeBooking?.id, isOpen]);

  if (!isOpen) return null;

  // Matching pros for service (sorted so active pros appear first)
  const allCategoryPros = service
    ? serviceMen.filter((pro) => pro.categoryIds.includes(service.categoryId))
    : [];

  const availablePros = allCategoryPros.filter((pro) => pro.isAvailable !== false);
  const matchingPros = [...allCategoryPros].sort((a, b) => {
    const aAvail = a.isAvailable !== false ? 1 : 0;
    const bAvail = b.isAvailable !== false ? 1 : 0;
    if (aAvail !== bAvail) return bAvail - aAvail;
    return (b.rating || 0) - (a.rating || 0);
  });

  // Auto-assign preferentially to the best rated active/available pro
  const autoSelectedPro = availablePros.length > 0 ? availablePros[0] : allCategoryPros[0];
  const assignedPro =
    selectedProId !== 'auto'
      ? serviceMen.find((p) => p.id === selectedProId)
      : autoSelectedPro;

  const basePrice = service ? service.basePrice : activeBooking?.amount || 299;
  const otherDiscount = 0; // Other configured discounts

  // Authoritative available reward points & limits
  const availableRewardPoints = rewardWallet
    ? (rewardWallet.pointsBalance !== undefined ? rewardWallet.pointsBalance : (rewardWallet.availablePoints || 0))
    : 0;
  const conversionRate = rewardSettings?.pointsToRupeeConversion || 10;
  const maxDiscountPercentage = rewardSettings?.maxBookingDiscountPercent || 50;
  const maxDiscountRupees = Math.floor(basePrice * (maxDiscountPercentage / 100));
  const maxPointsByPercentage = maxDiscountRupees * conversionRate;
  const maxAllowedPoints = Math.min(
    availableRewardPoints,
    rewardSettings?.maxPointsUsablePerBooking || 5000,
    maxPointsByPercentage
  );

  const parsedPointsInput = parseInt(pointsToRedeemInput) || 0;
  const effectivePointsToUse = isUsingRewards
    ? Math.max(0, Math.min(parsedPointsInput, maxAllowedPoints))
    : 0;
  const rewardDiscount = Math.round(effectivePointsToUse / conversionRate);

  const taxCalculation = React.useMemo<TaxCalculationResult>(() => {
    return calculateIndianGst({
      basePrice,
      standardDiscount: otherDiscount,
      rewardPointsDiscount: rewardDiscount,
      serviceCategoryId: service?.categoryId,
      serviceId: service?.id,
      serviceName: service?.name,
      customerPincode: pincode,
    });
  }, [basePrice, otherDiscount, rewardDiscount, service, pincode]);

  const taxableBase = taxCalculation.taxableAmount;
  const gst = taxCalculation.totalTaxAmount;
  const totalAmount = taxCalculation.finalTotalAmount;

  const TIME_SLOTS = [
    '09:00 AM - 11:00 AM',
    '11:00 AM - 01:00 PM',
    '02:00 PM - 04:00 PM',
    '04:00 PM - 06:00 PM',
    '06:00 PM - 08:00 PM',
  ];

  // ================= STATE MACHINE TRANSITIONS =================
  const handleTransition = async (nextStatus: BookingStatus, customPayload?: any) => {
    if (!activeBooking) return;
    setIsTransitioning(true);
    setError(null);

    try {
      await executeStatusTransition(activeBooking, nextStatus, {
        cancelledBy: activeRole,
        reason: customPayload?.reason || cancelReason,
        ...customPayload,
      });

      // Send deduplicated notifications for important state shifts
      if (nextStatus === 'accepted') {
        await notifyBookingAccepted(
          activeBooking,
          activeBooking.serviceManName || 'Your pro'
        );
      } else if (nextStatus === 'in_progress') {
        await notifyWorkStarted(activeBooking);
      } else if (nextStatus === 'completed') {
        await notifyWorkCompleted(activeBooking, activeBooking.finalAmount || activeBooking.amount);
      } else if (nextStatus === 'cancelled') {
        // Reverse redeemed reward points if any were used on this booking
        if ((activeBooking as any).rewardPointsUsed && (activeBooking as any).rewardPointsUsed > 0 && activeBooking.customerId) {
          reverseRewardRedemption(
            activeBooking.customerId,
            activeBooking.id,
            customPayload?.reason || cancelReason || 'Booking cancelled / refunded'
          ).catch((e) => console.warn('Reward reversal notice:', e));
        }
        await notifyCancellation(
          activeBooking,
          activeRole,
          customPayload?.reason || cancelReason || 'Booking cancelled'
        );
      }

      setCancelModalOpen(false);
    } catch (err: any) {
      console.error('State transition error:', err);
      setError(err.message || 'Failed to update booking status.');
    } finally {
      setIsTransitioning(false);
    }
  };

  // ================= BOOKING CREATION SUBMISSION =================
  const handleConfirmBooking = async (overrideMethod?: PaymentMethod) => {
    if (!service || loading) return;

    if (!currentUser) {
      setError('Please sign in or create an account to confirm and save your booking to your dashboard.');
      setIsAuthOpen(true);
      return;
    }

    if (!customerName.trim()) {
      setError('Please enter customer name');
      setStep(2);
      return;
    }
    if (!customerPhone.trim()) {
      setError('Please enter contact phone number');
      setStep(2);
      return;
    }
    if (!address.trim()) {
      setError('Please enter complete service address');
      setStep(2);
      return;
    }

    const cleanOverrideMethod = typeof overrideMethod === 'string' ? overrideMethod : undefined;
    const effectivePaymentMethod = cleanOverrideMethod || paymentMethod;
    if (cleanOverrideMethod) {
      setPaymentMethod(cleanOverrideMethod);
    }

    setLoading(true);
    setError(null);
    setPaymentFailureInfo(null);

    const bookingId = 'BK_' + Math.random().toString(36).substring(2, 9).toUpperCase();
    const nowIso = new Date().toISOString();

    // Validate & Reserve Reward Points if customer chose to redeem
    if (isUsingRewards && effectivePointsToUse > 0) {
      const validation = await validateRewardRedemption({
        customerId: currentUser.uid,
        pointsToRedeem: effectivePointsToUse,
        baseServiceAmount: basePrice,
      });

      if (!validation.isValid) {
        setError(validation.error || 'Reward points redemption validation failed.');
        setLoading(false);
        return;
      }

      const reserveResult = await reserveRewardPoints(
        currentUser.uid,
        effectivePointsToUse,
        bookingId,
        basePrice
      );

      if (!reserveResult.success) {
        setError(reserveResult.error || 'Failed to reserve reward points. Please retry.');
        setLoading(false);
        return;
      }
    }

    const gross = totalAmount;
    const companyComm = Math.round(gross * 0.15); // 15% company service charge
    const taxDed = Math.round(gross * 0.05); // 5% tax deduction
    const proPayout = Math.max(0, gross - companyComm - taxDed); // 80% net serviceman share

    const newBooking: Booking = {
      id: bookingId,
      customerId: currentUser.uid,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      serviceId: service.id,
      serviceName: service.name,
      categoryId: service.categoryId,
      categoryName: service.categoryName,
      serviceManId: assignedPro ? assignedPro.id : 'pro_rajesh_electrician',
      serviceManName: assignedPro ? assignedPro.name : 'Rajesh Sharma',
      serviceManPhone: assignedPro ? assignedPro.phone : '+91 98260 12345',
      partnerId: assignedPro?.partnerId || '',
      scheduledDate,
      scheduledTime,
      address: address.trim(),
      city,
      pincode,
      notes: notes.trim(),
      amount: totalAmount,
      status: 'pending',
      paymentStatus: effectivePaymentMethod === 'cash' ? 'cod' : 'paid',
      paymentMethod: effectivePaymentMethod,
      companyCommission: companyComm,
      taxDeduction: taxDed,
      taxRate: taxCalculation.gstRatePercent,
      taxCalculation: taxCalculation as any,
      sacCode: taxCalculation.sacCode,
      gstAmount: gst,
      statutoryTaxLiability: taxCalculation.statutoryTaxLiability,
      servicemanPayoutAmount: proPayout,
      payoutStatus: 'pending',
      isReviewed: false,
      createdAt: nowIso,
      updatedAt: nowIso,
      ...(isUsingRewards && effectivePointsToUse > 0 ? {
        rewardPointsUsed: effectivePointsToUse,
        rewardDiscountUsed: rewardDiscount,
      } as any : {}),
    };

    const proceedWithFirestoreBooking = async (razorpayMeta?: { order_id: string; payment_id: string; signature: string }) => {
      try {
        const finalBooking: Booking = {
          ...newBooking,
          paymentMethod: effectivePaymentMethod,
          paymentStatus: razorpayMeta ? 'paid' : (effectivePaymentMethod === 'cash' ? 'cod' : 'paid'),
          ...(razorpayMeta ? {
            razorpayOrderId: razorpayMeta.order_id,
            razorpayPaymentId: razorpayMeta.payment_id,
            razorpaySignature: razorpayMeta.signature,
          } : {})
        };

        const isDeviceOffline = typeof navigator !== 'undefined' && !navigator.onLine;

        // If offline: save to IndexedDB Pending Synchronization queue
        if (isDeviceOffline) {
          const offlineItem = await offlineBookingSyncService.savePendingBooking(finalBooking, {
            taxCalculation,
            customerPhone,
            customerName,
            scheduledDate,
            scheduledTime,
            serviceName: service.name,
            totalAmount,
            effectivePaymentMethod,
            source: 'booking_modal',
          });

          if (onBookingSuccess) {
            onBookingSuccess(offlineItem.booking);
          }
          setActiveBooking(offlineItem.booking);
          setActiveTab('lifecycle');
          return;
        }

        // 1. Save to Firestore bookings collection
        try {
          const bookingDocRef = doc(db, 'bookings', bookingId);
          await setDoc(bookingDocRef, finalBooking);
        } catch (firestoreWriteErr: any) {
          const isNetworkError =
            !navigator.onLine ||
            firestoreWriteErr?.code === 'unavailable' ||
            firestoreWriteErr?.message?.includes('offline') ||
            firestoreWriteErr?.message?.includes('network') ||
            firestoreWriteErr?.message?.includes('Failed to fetch');

          if (isNetworkError) {
            console.warn('[BookingModal] Firestore network write failed; queueing in IndexedDB Pending Synchronization queue:', firestoreWriteErr);
            const offlineItem = await offlineBookingSyncService.savePendingBooking(finalBooking, {
              taxCalculation,
              customerPhone,
              customerName,
              scheduledDate,
              scheduledTime,
              serviceName: service.name,
              totalAmount,
              effectivePaymentMethod,
              source: 'booking_modal',
            });

            if (onBookingSuccess) {
              onBookingSuccess(offlineItem.booking);
            }
            setActiveBooking(offlineItem.booking);
            setActiveTab('lifecycle');
            return;
          }
          throw firestoreWriteErr;
        }

        // Record statutory tax calculation audit log
        recordTaxAuditLog(bookingId, taxCalculation, {
          customerId: currentUser.uid,
          serviceManId: newBooking.serviceManId,
        }).catch((err) => console.warn('Non-fatal tax audit log record:', err));

        // Finalize reward points redemption now that booking is confirmed
        if (isUsingRewards && effectivePointsToUse > 0) {
          await finalizePointRedemption(currentUser.uid, bookingId);
          // Refresh local reward wallet
          getCustomerRewardWallet(currentUser.uid).then((updatedW) => setRewardWallet(updatedW)).catch(() => {});
        }

        // Create actionable booking offers for eligible Service Professionals
        bookingOfferService.createBookingOffersForBooking(finalBooking).catch((err) => {
          console.warn('[BookingOfferEngine] Non-fatal client offer generation:', err);
        });

        // Auto-trigger booking alert dispatch via backend Express API (idempotent)
        fetch('/api/bookings/dispatch-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId }),
        }).catch((err) => console.warn('Non-fatal dispatch alert trigger:', err));

        // 2. WhatsApp dispatch record
        try {
          await addDoc(collection(db, 'whatsapp_logs'), {
            recipientPhone: customerPhone,
            recipientName: customerName,
            type: 'booking_confirmation',
            messageBody: `Namaste ${customerName}! Your HARDINKAAM booking #${bookingId} for ${service.name} has been booked for ${scheduledDate} (${scheduledTime}). Assigned Pro: ${newBooking.serviceManName} (${newBooking.serviceManPhone}).${razorpayMeta ? ` Paid ₹${totalAmount} via Razorpay (${razorpayMeta.payment_id}).` : ''}`,
            status: 'sent',
            timestamp: nowIso,
          });
        } catch (e) {
          console.warn('WhatsApp log notice:', e);
        }

        // 3. Deduplicated booking created in-app notifications
        await notifyBookingCreated(finalBooking);

        // 4. Audit log
        try {
          await addDoc(collection(db, 'audit_logs'), {
            userId: currentUser?.uid || 'guest',
            userEmail: currentUser?.email || customerPhone,
            action: 'create_booking',
            details: `Booking ${bookingId} created for ${service.name} (₹${totalAmount}) [Method: ${effectivePaymentMethod}]`,
            timestamp: nowIso,
          });
        } catch (e) {
          console.warn('Audit log notice:', e);
        }

        if (onBookingSuccess) {
          onBookingSuccess(finalBooking);
        }

        // Transition immediately into the Lifecycle State Machine view for this booking!
        setActiveBooking(finalBooking);
        setActiveTab('lifecycle');
      } catch (err: any) {
        console.error('Failed to create booking:', err);
        handleFirestoreError(err, OperationType.CREATE, `bookings/${bookingId}`);
      } finally {
        setLoading(false);
      }
    };

    const isOnline = effectivePaymentMethod === 'razorpay' || effectivePaymentMethod === 'upi';

    if (isOnline) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setError('आप वर्तमान में ऑफ़लाइन हैं। ऑनलाइन भुगतान के लिए इंटरनेट कनेक्शन आवश्यक है। कृपया "Pay Cash After Service (COD)" चुनें या इंटरनेट कनेक्ट करें।');
        setLoading(false);
        return;
      }
      try {
        const digitsOnly = customerPhone.replace(/\D/g, '');
        const cleanPhone = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : (digitsOnly || undefined);
        const cleanEmail = currentUser.email && currentUser.email.includes('@') ? currentUser.email.trim() : undefined;

        // Pre-persist pending booking to guarantee server-side commission attribution resolution
        await setDoc(doc(db, 'bookings', bookingId), {
          ...newBooking,
          paymentMethod: 'razorpay',
          paymentStatus: 'pending',
          status: 'pending',
          paymentDestination: 'hardinkaam_admin_razorpay',
        }, { merge: true });

        const idToken = await currentUser.getIdToken(true);
        await razorpayClientService.openCheckout({
          purpose: 'service_booking',
          referenceId: bookingId,
          idToken,
          name: 'HARDINKAAM Service Booking',
          description: `Booking #${bookingId} for ${service.name}`,
          prefill: {
            name: customerName,
            email: cleanEmail,
            contact: cleanPhone,
          },
          onSuccess: async (verifyResult) => {
            await proceedWithFirestoreBooking({
              order_id: verifyResult.orderId,
              payment_id: verifyResult.paymentId,
              signature: verifyResult.signature,
            });
          },
          onFailure: (err) => {
            if (isUsingRewards && effectivePointsToUse > 0) {
              releaseRewardPoints(currentUser.uid, bookingId, err?.message || 'Razorpay checkout failed').catch(() => {});
            }
            setError(err.message || 'Could not complete Razorpay checkout.');
            setLoading(false);
          }
        });
        return;
      } catch (payErr: any) {
        console.warn('Razorpay initiate notice:', payErr?.message || payErr);
        if (isUsingRewards && effectivePointsToUse > 0) {
          releaseRewardPoints(currentUser.uid, bookingId, 'Razorpay init error').catch(() => {});
        }
        const isAuthError =
          payErr?.message?.toLowerCase().includes('authentication') ||
          payErr?.message?.toLowerCase().includes('credential') ||
          payErr?.message?.toLowerCase().includes('key');

        const friendlyMsg = isAuthError
          ? 'ऑनलाइन पेमेंट गेटवे प्रमाणीकरण लंबित है। आप अभी "Pay Cash After Service (COD)" चुनकर बिना किसी रुकावट के अपनी बुकिंग पूरी कर सकते हैं।'
          : (payErr.message || 'Could not initiate Razorpay checkout.');

        setPaymentFailureInfo({
          code: isAuthError ? 'GATEWAY_CREDENTIALS_PENDING' : 'INIT_FAILED',
          reason: isAuthError ? 'gateway_credentials_pending' : 'init_failed',
          description: friendlyMsg,
        });
        setError(friendlyMsg);
        setLoading(false);
      }
    } else {
      await proceedWithFirestoreBooking();
    }
  };

  // ================= RENDER: LIFECYCLE STATE MACHINE VIEW =================
  if (activeBooking) {
    const currentStepIndex = getStepIndex(activeBooking.status);
    const isCancelled =
      activeBooking.status === 'cancelled' || activeBooking.status === 'rejected';

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
        <div
          id="booking-lifecycle-modal"
          className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-stone-200 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-stone-900 to-orange-950 text-white flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-orange-400 tracking-wider">
                  Booking #{activeBooking.id}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                <span className="text-[11px] text-stone-300 capitalize">
                  {activeBooking.status.replace(/_/g, ' ')}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight truncate max-w-xs sm:max-w-md">
                {activeBooking.serviceName}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs (Lifecycle State Machine vs Chat vs Details) */}
          <div className="flex border-b border-stone-200 bg-stone-50 px-3 sm:px-5">
            <button
              type="button"
              onClick={() => setActiveTab('lifecycle')}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'lifecycle'
                  ? 'border-orange-600 text-orange-600 bg-white'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Timer className="w-4 h-4" />
              <span>Service Lifecycle</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'chat'
                  ? 'border-orange-600 text-orange-600 bg-white'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-orange-500" />
              <span>Real-Time Chat</span>
              <span className="w-2 h-2 rounded-full bg-orange-600 inline-block animate-pulse" />
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'details'
                  ? 'border-orange-600 text-orange-600 bg-white'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Details &amp; Bill</span>
            </button>
          </div>

          {/* Tab 1: Service Lifecycle State Machine */}
          {activeTab === 'lifecycle' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Status Header Badge */}
              <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                    Current Service Status
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`text-sm font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                        isCancelled
                          ? 'bg-rose-100 text-rose-800'
                          : activeBooking.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : activeBooking.status === 'in_progress'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {activeBooking.status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-stone-500">
                      Total ₹{activeBooking.amount} ({activeBooking.paymentStatus.toUpperCase()})
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-stone-400 block">Scheduled</span>
                  <span className="text-xs font-bold text-stone-800">
                    {activeBooking.scheduledDate}
                  </span>
                </div>
              </div>

              {/* Visual 4-Step Lifecycle State Machine Stepper */}
              {!isCancelled ? (
                <div className="py-2">
                  <div className="relative">
                    {/* Background line */}
                    <div className="absolute top-5 left-4 right-4 h-1 bg-stone-200 -z-0" />
                    {/* Active progress fill */}
                    <div
                      className="absolute top-5 left-4 h-1 bg-orange-600 transition-all duration-300 -z-0"
                      style={{
                        width: `${Math.min(100, Math.max(0, (currentStepIndex / 3) * 100))}%`,
                      }}
                    />

                    <div className="relative z-10 flex justify-between">
                      {LIFECYCLE_STEPS.map((stepItem, idx) => {
                        const isDone = idx < currentStepIndex;
                        const isCurrent = idx === currentStepIndex;

                        return (
                          <div
                            key={stepItem.key}
                            className="flex flex-col items-center text-center max-w-[80px]"
                          >
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all ${
                                isDone
                                  ? 'bg-orange-600 border-orange-600 text-white shadow-xs'
                                  : isCurrent
                                  ? 'bg-white border-orange-600 text-orange-600 shadow-md ring-4 ring-orange-100 animate-pulse'
                                  : 'bg-white border-stone-300 text-stone-400'
                              }`}
                            >
                              {isDone ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                            </div>
                            <span
                              className={`text-[11px] mt-1.5 font-bold leading-tight ${
                                isCurrent
                                  ? 'text-orange-600 font-extrabold'
                                  : isDone
                                  ? 'text-stone-800'
                                  : 'text-stone-400'
                              }`}
                            >
                              {stepItem.shortLabel}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step Description Box */}
                  <div className="mt-6 p-4 rounded-2xl bg-orange-50/60 border border-orange-200/80">
                    <h4 className="text-xs font-bold text-orange-950 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                      {LIFECYCLE_STEPS[currentStepIndex]?.label || 'Status Overview'}
                    </h4>
                    <p className="text-xs text-orange-800/90 mt-1">
                      {LIFECYCLE_STEPS[currentStepIndex]?.description}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-1 text-center">
                  <XCircle className="w-8 h-8 text-rose-500 mx-auto" />
                  <h4 className="text-sm font-bold text-rose-950">Service Booking Cancelled</h4>
                  <p className="text-xs text-rose-700">
                    Reason: "{activeBooking.cancellationReason || 'Cancelled by user'}"
                  </p>
                  {activeBooking.cancelledAt && (
                    <p className="text-[10px] text-rose-500">
                      Cancelled at: {new Date(activeBooking.cancelledAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {/* Technician Info Card */}
              <div className="p-4 rounded-2xl border border-stone-200 bg-white flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-orange-100 text-orange-700 font-bold flex items-center justify-center">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-stone-400 block">
                      Assigned Professional
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-stone-900">
                      {activeBooking.serviceManName || 'Rajesh Sharma'}
                    </h4>
                    <span className="text-[11px] text-stone-500">
                      {activeBooking.serviceManPhone || '+91 98260 12345'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {activeBooking.serviceManPhone && (
                    <a
                      href={`tel:${activeBooking.serviceManPhone}`}
                      className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
                      title="Call Pro"
                    >
                      <Phone className="w-4 h-4 text-emerald-600" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveTab('chat')}
                    className="py-2 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat</span>
                  </button>
                </div>
              </div>

              {/* State Machine Interactive Actions Controls */}
              <div className="space-y-3 pt-2 border-t border-stone-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                    Lifecycle Actions &amp; Transitions
                  </h4>
                  <span className="text-[10px] text-stone-400">
                    Role: <strong className="text-stone-700 uppercase">{activeRole}</strong>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Status: Pending */}
                  {activeBooking.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setRescheduleModalOpen(true)}
                        className="px-4 py-2.5 rounded-xl border border-orange-200 bg-orange-50/80 hover:bg-orange-100 text-orange-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <Calendar className="w-4 h-4 text-orange-600" />
                        <span>Reschedule Date</span>
                      </button>
                      <button
                        type="button"
                        disabled={isTransitioning}
                        onClick={() => handleTransition('accepted')}
                        className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-60"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Accept Booking (Move to Accepted)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCancelModalOpen(true)}
                        className="px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Cancel Booking
                      </button>
                    </>
                  )}

                  {/* Status: Accepted */}
                  {(activeBooking.status === 'accepted' ||
                    activeBooking.status === 'on_the_way') && (
                    <>
                      <button
                        type="button"
                        disabled={isTransitioning}
                        onClick={() => handleTransition('in_progress')}
                        className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-60"
                      >
                        <Play className="w-4 h-4" />
                        <span>Start Work (Move to In Progress)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCancelModalOpen(true)}
                        className="px-3.5 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Cancel with Reason
                      </button>
                    </>
                  )}

                  {/* Status: In Progress - Customer OTP Verification Flow */}
                  {activeBooking.status === 'in_progress' && (
                    <div className="w-full space-y-3">
                      <DeliveryOtpPrompt
                        booking={activeBooking}
                        onVerified={() => {
                          // onSnapshot will update activeBooking status
                        }}
                      />
                      {(activeRole === 'admin' || activeRole === 'service_man') && (
                        <div className="pt-2 border-t border-stone-200/80 flex items-center justify-between">
                          <span className="text-[11px] text-stone-500">
                            Staff Override (Admin/Technician):
                          </span>
                          <button
                            type="button"
                            disabled={isTransitioning}
                            onClick={() => handleTransition('completed')}
                            className="px-3.5 py-1.5 rounded-xl border border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs font-bold transition-colors cursor-pointer"
                          >
                            Mark Completed Directly
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Status: Completed -> Show Review Form if not reviewed */}
                  {activeBooking.status === 'completed' && (
                    <div className="w-full space-y-4 pt-2">
                      <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>
                          Service completed successfully on{' '}
                          {activeBooking.completedAt
                            ? new Date(activeBooking.completedAt).toLocaleDateString()
                            : activeBooking.scheduledDate}
                          . Payment verified.
                        </span>
                      </div>

                      {/* Integrated Review Submission */}
                      {!activeBooking.isReviewed ? (
                        <div className="pt-2">
                          <ReviewSubmitForm
                            booking={activeBooking}
                            onReviewSubmitted={() => {
                              // Firestore listener updates activeBooking.isReviewed
                            }}
                          />
                        </div>
                      ) : (
                        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
                          <span className="text-[10px] uppercase font-bold text-stone-400 block mb-1">
                            Your Submitted Review
                          </span>
                          <div className="flex items-center gap-1 text-amber-500 mb-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <span key={s} className="text-sm">
                                {s <= (activeBooking.rating || 5) ? '★' : '☆'}
                              </span>
                            ))}
                            <span className="text-xs font-bold text-stone-700 ml-1">
                              {activeBooking.rating || 5}/5
                            </span>
                          </div>
                          {activeBooking.reviewComment && (
                            <p className="text-xs text-stone-700 italic">
                              "{activeBooking.reviewComment}"
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Status: Cancelled -> Option to re-book */}
                  {isCancelled && service && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveBooking(null);
                        setStep(1);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Re-Book Service</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Cancellation Dialog inside Modal */}
              {cancelModalOpen && (
                <div className="p-4 bg-rose-50/90 rounded-2xl border border-rose-200 space-y-3 animate-in fade-in">
                  <h4 className="text-xs font-bold text-rose-900">
                    Confirm Service Cancellation
                  </h4>
                  <p className="text-xs text-rose-700">
                    Are you sure you want to cancel this booking? This will update the status to
                    'Cancelled' in real-time.
                  </p>
                  <div>
                    <label className="text-[11px] font-semibold text-rose-800 block mb-1">
                      Reason for cancellation:
                    </label>
                    <select
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="w-full text-xs p-2 rounded-xl bg-white border border-rose-300 focus:outline-hidden"
                    >
                      <option value="Change of plans">Change of plans / Not required</option>
                      <option value="Booked another pro">Booked another pro</option>
                      <option value="Timing mismatch">Scheduled timing no longer convenient</option>
                      <option value="Price concern">Pricing or scope issue</option>
                      <option value="Other">Other / Personal emergency</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setCancelModalOpen(false)}
                      className="px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-200 rounded-lg cursor-pointer"
                    >
                      Keep Booking
                    </button>
                    <button
                      type="button"
                      disabled={isTransitioning}
                      onClick={() => handleTransition('cancelled')}
                      className="px-4 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg cursor-pointer shadow-xs disabled:opacity-60"
                    >
                      Confirm Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Real-time MessageInterface component */}
          {activeTab === 'chat' && (
            <div className="p-3 sm:p-4 flex-1 overflow-hidden">
              <MessageInterface booking={activeBooking} embedded />
            </div>
          )}

          {/* Tab 3: Details & Bill */}
          {activeTab === 'details' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                  Service Location &amp; Customer
                </span>
                <p className="text-sm font-bold text-stone-900">{activeBooking.customerName}</p>
                <p className="text-stone-600">{activeBooking.customerPhone}</p>
                <p className="text-stone-700 font-medium flex items-start gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <span>
                    {activeBooking.address}, {activeBooking.city} {activeBooking.pincode}
                  </span>
                </p>
                {activeBooking.notes && (
                  <p className="text-stone-500 italic pt-1 border-t border-stone-200">
                    Special Note: "{activeBooking.notes}"
                  </p>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                  Billing Summary
                </span>
                <div className="flex justify-between text-stone-600">
                  <span>Base Service Charge:</span>
                  <span className="font-semibold">₹{Math.round(activeBooking.amount / 1.18)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>GST Tax (18%):</span>
                  <span className="font-semibold">
                    ₹{activeBooking.amount - Math.round(activeBooking.amount / 1.18)}
                  </span>
                </div>
                <div className="flex justify-between text-stone-900 font-black text-sm pt-2 border-t border-stone-200">
                  <span>Total Amount:</span>
                  <span className="text-orange-600">₹{activeBooking.amount}</span>
                </div>
                <div className="flex justify-between text-[11px] text-stone-500 pt-1">
                  <span>Payment Mode:</span>
                  <span className="font-bold uppercase">{activeBooking.paymentMethod}</span>
                </div>
                <div className="flex justify-between text-[11px] text-stone-500">
                  <span>Payment Status:</span>
                  <span className="font-bold uppercase text-emerald-600">
                    {activeBooking.paymentStatus}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="p-4 bg-white border-t border-stone-200 flex items-center justify-between">
            <span className="text-xs text-stone-400 font-medium">
              HARDINKAAM Service Guarantee Included
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ================= RENDER: BOOKING CREATION 4-STEP FLOW =================
  if (!service) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
      <div
        id="booking-flow-modal"
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden border border-stone-200 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-stone-900 to-orange-950 text-white flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-orange-400 tracking-wider">
              Step {step} of 4 • Book Service
            </span>
            <h2 className="text-base sm:text-lg font-extrabold tracking-tight truncate max-w-xs sm:max-w-md">
              {service.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="grid grid-cols-4 bg-stone-100 h-1">
          <div className={`h-full ${step >= 1 ? 'bg-orange-600' : 'bg-transparent'}`} />
          <div className={`h-full ${step >= 2 ? 'bg-orange-600' : 'bg-transparent'}`} />
          <div className={`h-full ${step >= 3 ? 'bg-orange-600' : 'bg-transparent'}`} />
          <div className={`h-full ${step >= 4 ? 'bg-orange-600' : 'bg-transparent'}`} />
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {paymentFailureInfo ? (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-3 shadow-xs animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-amber-950 text-sm">
                    Online Payment Verification Issue
                  </div>
                  <p className="text-amber-800 leading-relaxed">
                    {paymentFailureInfo.description}
                  </p>
                  {paymentFailureInfo.orderId && (
                    <div className="text-[10px] text-amber-700 font-mono bg-amber-100/90 px-2 py-0.5 rounded inline-block">
                      Razorpay Order Ref: {paymentFailureInfo.orderId}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-amber-200/90 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleConfirmBooking('cash')}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{loading ? 'Confirming...' : 'Book with Pay Cash After Service (COD)'}</span>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setPaymentFailureInfo(null);
                    setError(null);
                    setPaymentMethod('upi');
                  }}
                  className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors disabled:opacity-60"
                >
                  <span>Switch to UPI on Delivery</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentFailureInfo(null);
                    setError(null);
                    setPaymentMethod('cash');
                  }}
                  className="px-3 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-xs cursor-pointer transition-colors"
                >
                  <span>Pay Cash (COD)</span>
                </button>
              </div>
            </div>
          ) : error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Professional Selection */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Quick Rebook Pro Pre-Selection Banner */}
              {initialPro && (
                <div className="p-3.5 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-between gap-3 animate-in fade-in">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <RotateCcw className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-orange-950">
                        Quick Rebook Pre-selected: {initialPro.name}
                      </h4>
                      <p className="text-[11px] text-orange-800">
                        Assigned based on your completed service history. You can keep or change below.
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-orange-200 text-orange-900">
                    Previous Pro
                  </span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-stone-800 uppercase tracking-wider block mb-2">
                  Select Service Professional
                </label>
                <div className="space-y-2">
                  <label
                    onClick={() => setSelectedProId('auto')}
                    className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                      selectedProId === 'auto'
                        ? 'border-orange-600 bg-orange-50/50 shadow-xs'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-stone-900 block">
                          Auto-Assign Best Available Pro
                        </span>
                        <span className="text-[11px] text-stone-500">
                          {availablePros.length > 0
                            ? `Instantly routes to top active pro (${availablePros[0].name})`
                            : 'Fastest arrival with highest rating in Bhopal'}
                        </span>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="proSelect"
                      checked={selectedProId === 'auto'}
                      onChange={() => setSelectedProId('auto')}
                      className="text-orange-600 focus:ring-orange-500"
                    />
                  </label>

                  {matchingPros.map((p) => {
                    const isProActive = p.isAvailable !== false;
                    const isPreviousPro = initialPro?.id === p.id;
                    return (
                      <label
                        key={p.id}
                        onClick={() => setSelectedProId(p.id)}
                        className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                          selectedProId === p.id
                            ? 'border-orange-600 bg-orange-50/50 shadow-xs ring-1 ring-orange-500/20'
                            : 'border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <LazyImage
                              src={
                                p.photoUrl ||
                                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80'
                              }
                              alt={p.name}
                              className="w-10 h-10 rounded-xl object-cover"
                            />
                            <span
                              className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                                isProActive ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                              title={isProActive ? 'Active (Online)' : 'Busy (On Break)'}
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-stone-900">{p.name}</span>
                              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded">
                                ★ {p.rating}
                              </span>
                              <span
                                className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full ${
                                  isProActive
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {isProActive ? '● Active' : '● Busy'}
                              </span>
                              {isPreviousPro && (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-orange-100 text-orange-800 border border-orange-200 flex items-center gap-0.5">
                                  <RotateCcw className="w-2.5 h-2.5" /> Previous Pro
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-stone-500">
                              {p.experienceYears} yrs exp • {p.totalJobs} jobs completed
                            </span>
                          </div>
                        </div>
                        <input
                          type="radio"
                          name="proSelect"
                          checked={selectedProId === p.id}
                          onChange={() => setSelectedProId(p.id)}
                          className="text-orange-600 focus:ring-orange-500"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Guaranteed Protection Banner */}
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <p className="text-[11px] text-stone-600 leading-tight">
                  All technicians are KYC verified with background checks. 30-day service warranty
                  included.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: Date & Time */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-800 uppercase tracking-wider block mb-2">
                  Select Service Date
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setScheduledDate(todayStr)}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                      scheduledDate === todayStr
                        ? 'border-orange-600 bg-orange-50/50 font-bold text-orange-950 shadow-xs'
                        : 'border-stone-200 hover:border-stone-300 text-stone-700'
                    }`}
                  >
                    <span className="text-xs block font-bold">Today</span>
                    <span className="text-[11px] text-stone-500">{todayStr}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduledDate(tomorrowStr)}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                      scheduledDate === tomorrowStr
                        ? 'border-orange-600 bg-orange-50/50 font-bold text-orange-950 shadow-xs'
                        : 'border-stone-200 hover:border-stone-300 text-stone-700'
                    }`}
                  >
                    <span className="text-xs block font-bold">Tomorrow</span>
                    <span className="text-[11px] text-stone-500">{tomorrowStr}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-800 uppercase tracking-wider block mb-2">
                  Select Time Slot
                </label>
                <div className="space-y-2">
                  {TIME_SLOTS.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setScheduledTime(slot)}
                      className={`w-full p-3 rounded-2xl border flex items-center justify-between text-xs transition-all cursor-pointer ${
                        scheduledTime === slot
                          ? 'border-orange-600 bg-orange-50/50 text-orange-950 font-bold shadow-xs'
                          : 'border-stone-200 hover:border-stone-300 text-stone-700'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-orange-600" />
                        {slot}
                      </span>
                      {scheduledTime === slot && (
                        <CheckCircle2 className="w-4 h-4 text-orange-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Address & Contact Details */}
          {step === 3 && (
            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-stone-800 block mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Ramesh Verma"
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-800 block mb-1">
                  Contact Phone Number *
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. +91 98260 00000"
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-800 block mb-1">
                  Complete Address (House/Flat, Street, Landmark) *
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Flat 302, Maple Heights, MP Nagar Zone 2"
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-stone-800 block mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-800 block mb-1">Pincode</label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-800 block mb-1">
                  Special Instructions (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Please ring doorbell twice, watch for dogs"
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          )}

          {/* STEP 4: Payment Method & Confirmation */}
          {step === 4 && (
            <div className="space-y-4">
              {/* Reward Points Redemption Section */}
              {rewardSettings?.enabled !== false && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
                          Available Reward Points
                        </span>
                        <span className="font-extrabold text-stone-900 text-sm">
                          {availableRewardPoints} Points{' '}
                          <span className="text-amber-700 text-xs font-semibold">
                            (₹{Math.round((availableRewardPoints / conversionRate) * 10) / 10} value)
                          </span>
                        </span>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <span className="font-bold text-xs text-stone-800">Use Reward Points</span>
                      <input
                        type="checkbox"
                        checked={isUsingRewards}
                        disabled={availableRewardPoints < (rewardSettings?.minPointsForRedemption || 100) || maxAllowedPoints <= 0}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setIsUsingRewards(checked);
                          if (checked && !pointsToRedeemInput) {
                            setPointsToRedeemInput(String(maxAllowedPoints));
                          }
                          setRewardError(null);
                        }}
                        className="w-4 h-4 accent-orange-600 rounded cursor-pointer"
                      />
                    </label>
                  </div>

                  {/* If user enabled rewards, show interactive input controls */}
                  {isUsingRewards && (
                    <div className="pt-2 border-t border-amber-200/60 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1">
                          <label className="text-[11px] font-bold text-stone-700 block mb-1">
                            Enter Points to Redeem (Max {maxAllowedPoints} Pts allowed for this booking)
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              max={maxAllowedPoints}
                              value={pointsToRedeemInput}
                              onChange={(e) => {
                                const val = e.target.value;
                                setPointsToRedeemInput(val);
                                const num = parseInt(val) || 0;
                                if (num > maxAllowedPoints) {
                                  setRewardError(`Max points allowed for this booking is ${maxAllowedPoints}.`);
                                } else if (num > availableRewardPoints) {
                                  setRewardError(`Insufficient balance. You have ${availableRewardPoints} points.`);
                                } else {
                                  setRewardError(null);
                                }
                              }}
                              placeholder={`e.g. ${maxAllowedPoints}`}
                              className="w-full px-3 py-2 rounded-xl bg-white border border-amber-300 font-bold text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setPointsToRedeemInput(String(maxAllowedPoints));
                                setRewardError(null);
                              }}
                              className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-[11px] transition-colors whitespace-nowrap cursor-pointer shrink-0 shadow-xs"
                            >
                              Max Points
                            </button>
                          </div>
                        </div>
                      </div>

                      {rewardError ? (
                        <div className="text-[11px] text-rose-700 font-semibold flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>{rewardError}</span>
                        </div>
                      ) : effectivePointsToUse > 0 ? (
                        <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold flex items-center justify-between">
                          <span>🎁 Reward Points Discount Applied:</span>
                          <span className="text-emerald-700 font-extrabold">-₹{rewardDiscount}</span>
                        </div>
                      ) : null}

                      <p className="text-[10px] text-stone-500 italic">
                        Conversion: {conversionRate} Points = ₹1. Up to {maxDiscountPercentage}% of service can be paid via reward points.
                      </p>
                    </div>
                  )}

                  {availableRewardPoints < (rewardSettings?.minPointsForRedemption || 100) && (
                    <p className="text-[10px] text-stone-500">
                      Minimum {rewardSettings?.minPointsForRedemption || 100} points required to redeem on bookings.
                    </p>
                  )}
                </div>
              )}

              {/* Order Summary Box */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2 text-xs">
                <span className="text-[10px] uppercase font-bold text-stone-400 block">
                  Service Summary
                </span>
                <div className="flex justify-between text-stone-700">
                  <span className="font-bold">{service.name}</span>
                  <span>₹{basePrice}</span>
                </div>

                {otherDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Other Discount:</span>
                    <span>-₹{otherDiscount}</span>
                  </div>
                )}

                {rewardDiscount > 0 && (
                  <div className="flex justify-between text-amber-700 font-bold">
                    <span>Reward Points Discount ({effectivePointsToUse} Pts):</span>
                    <span>-₹{rewardDiscount}</span>
                  </div>
                )}

                <div className="flex justify-between text-stone-600 text-[11px] font-medium">
                  <span>
                    GST Tax (SAC {taxCalculation.sacCode} - {taxCalculation.gstRatePercent}%):
                  </span>
                  <span className="font-semibold text-stone-800">₹{gst}</span>
                </div>
                {taxCalculation.isInterState ? (
                  <div className="flex justify-between text-stone-400 text-[10px] pl-2">
                    <span>IGST ({taxCalculation.igstPercent}%):</span>
                    <span>₹{taxCalculation.igstAmount}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-stone-400 text-[10px] pl-2">
                    <span>CGST ({taxCalculation.cgstPercent}%): ₹{taxCalculation.cgstAmount}</span>
                    <span>SGST ({taxCalculation.sgstPercent}%): ₹{taxCalculation.sgstAmount}</span>
                  </div>
                )}
                <div className="flex justify-between text-stone-900 font-extrabold text-sm pt-2 border-t border-stone-200">
                  <span>Final Payable Amount:</span>
                  <span className="text-orange-600">₹{totalAmount}</span>
                </div>
              </div>

              {/* Offline Advisory Notice if navigator is offline */}
              {typeof navigator !== 'undefined' && !navigator.onLine && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1.5 shadow-xs">
                  <div className="flex items-center gap-2 font-bold text-amber-950">
                    <WifiOff className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>ऑफ़लाइन मोड सक्रिय (Offline Booking Mode)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-800">
                    इंटरनेट कनेक्शन उपलब्ध नहीं है। आपकी बुकिंग डिवाइस के सुरक्षित <strong>IndexedDB (Pending Synchronization Queue)</strong> में सहेजी जाएगी। ऑनलाइन होते ही यह स्वचालित रूप से Firestore पर सिंक होगी। ऑफ़लाइन में &quot;Pay Cash After Service&quot; समर्थित है।
                  </p>
                </div>
              )}

              {/* Payment Methods */}
              <div>
                <label className="text-xs font-bold text-stone-800 uppercase tracking-wider block mb-2">
                  Select Payment Method
                </label>
                <div className="space-y-2">
                  <label
                    onClick={() => setPaymentMethod('cash')}
                    className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                      paymentMethod === 'cash'
                        ? 'border-orange-600 bg-orange-50/50 shadow-xs'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                        ₹
                      </div>
                      <div>
                        <span className="text-xs font-bold text-stone-900 block">
                          Pay Cash After Service (COD)
                        </span>
                        <span className="text-[11px] text-stone-500">
                          Inspect work and pay cash to technician after service is completed
                        </span>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="payMethod"
                      checked={paymentMethod === 'cash'}
                      onChange={() => setPaymentMethod('cash')}
                      className="text-orange-600"
                    />
                  </label>

                  <label
                    onClick={() => setPaymentMethod('upi')}
                    className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                      paymentMethod === 'upi'
                        ? 'border-orange-600 bg-orange-50/50 shadow-xs ring-2 ring-orange-500/20'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                        UPI
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-stone-900 block">
                            Direct UPI / Cash on Delivery
                          </span>
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800">
                            GPay / PhonePe / QR
                          </span>
                        </div>
                        <span className="text-[11px] text-stone-500">
                          Fast &amp; verified UPI payment directly to technician
                        </span>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="payMethod"
                      checked={paymentMethod === 'upi'}
                      onChange={() => setPaymentMethod('upi')}
                      className="text-orange-600"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as any)}
              className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
            >
              Back
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-stone-500 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 2 && (!scheduledDate || !scheduledTime)) {
                  setError('Please select date and time slot');
                  return;
                }
                setError(null);
                setStep((s) => (s + 1) as any);
              }}
              className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-orange-600/20"
            >
              <span>Next Step</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              id="booking-confirm-pay-btn"
              disabled={loading}
              onClick={() => handleConfirmBooking()}
              className="px-6 py-2.5 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 disabled:opacity-60"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {loading ? 'Confirming...' : `Confirm & Book (₹${totalAmount})`}
              </span>
            </button>
          )}
        </div>
      </div>

      {isAuthOpen && (
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          defaultRole="customer"
        />
      )}

      {/* Reschedule Date Modal for existing bookings */}
      {rescheduleModalOpen && activeBooking && (
        <RescheduleModal
          isOpen={rescheduleModalOpen}
          onClose={() => setRescheduleModalOpen(false)}
          booking={activeBooking}
          onRescheduleSuccess={(newDate, newTime) => {
            setActiveBooking((prev) =>
              prev ? { ...prev, scheduledDate: newDate, scheduledTime: newTime } : null
            );
          }}
        />
      )}
    </div>
  );
};
