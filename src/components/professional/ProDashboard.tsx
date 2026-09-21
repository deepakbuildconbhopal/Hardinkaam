import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  DollarSign,
  ShieldCheck,
  Power,
  MapPin,
  Phone,
  MessageSquare,
  Navigation,
  Play,
  CheckSquare,
  AlertCircle,
  XCircle,
  FileText,
  Filter,
  Calendar,
  Star,
  ChevronDown,
  ChevronUp,
  KeyRound,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Radio,
  Coffee,
  Zap,
  Receipt,
  ChevronRight,
  X,
  Bell,
  User,
} from 'lucide-react';
import { doc, updateDoc, setDoc, addDoc, collection, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import { Booking, BookingStatus, BookingOffer } from '../../types';
import { bookingOfferService } from '../../services/bookingOfferService';
import {
  LIFECYCLE_STEPS,
  CANCELLED_STATE,
  getStepIndex,
  executeStatusTransition,
} from '../../utils/bookingStateMachine';
import { MessageInterface } from '../common/MessageInterface';
import { ChatModal } from '../customer/ChatModal';
import { ensureBookingHasOtp, regenerateBookingOtp } from '../../services/otpService';
import { ProArrivalVerificationCard } from './ProArrivalVerificationCard';
import { ServicemanBookingLiveMap } from './ServicemanBookingLiveMap';
import { WorkServiceTimer } from '../common/WorkServiceTimer';
import { HardinkaamServiceBill } from '../common/HardinkaamServiceBill';
import { ExtraChargesManager } from '../common/ExtraChargesManager';
import { EndWorkModal } from './EndWorkModal';
import { AdSenseBanner } from '../ads/AdSenseBanner';
import {
  useServicemanLiveGps,
  stopServicemanPeriodicGpsTracking,
} from '../../services/servicemanLiveGpsManager';
import { IncomingBookingScreen } from './IncomingBookingScreen';
import { ServicemanAlarmSettingsModal } from './ServicemanAlarmSettingsModal';
import { bookingAlarmSoundService } from '../../services/bookingAlarmSoundService';
import {
  servicemanAlarmSettingsService,
  ServicemanAlarmPersonalSettings,
  AdminGlobalAlarmSettings,
} from '../../services/servicemanAlarmSettingsService';

interface Props {
  bookings: Booking[];
  onOpenKYC: () => void;
  onOpenWallet: () => void;
}

export const ProDashboard: React.FC<Props> = ({ bookings, onOpenKYC, onOpenWallet }) => {
  const { currentUser, userProfile, activeRole } = useAuth();
  const { sendNotification } = useNotifications();
  const { effectiveTheme } = useTheme();
  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  const [isUpdatingAvailability, setIsUpdatingAvailability] = useState<boolean>(false);
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(null);
  const [activeChatBooking, setActiveChatBooking] = useState<Booking | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'offers' | 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'
  >('all');
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [cancelModalBooking, setCancelModalBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('Technician unavailable');
  const [copiedOtpId, setCopiedOtpId] = useState<string | null>(null);
  const [regeneratingOtpId, setRegeneratingOtpId] = useState<string | null>(null);
  const [endWorkModalBooking, setEndWorkModalBooking] = useState<Booking | null>(null);
  const [viewBillBooking, setViewBillBooking] = useState<Booking | null>(null);

  // HARDINKAAM New Booking Alarm System State
  const [activeAlarmBooking, setActiveAlarmBooking] = useState<Booking | null>(null);
  const [activeOffer, setActiveOffer] = useState<BookingOffer | null>(null);
  const [proOffers, setProOffers] = useState<BookingOffer[]>([]);
  const [isAlarmSettingsOpen, setIsAlarmSettingsOpen] = useState<boolean>(false);
  const [isSubmittingAlarmAction, setIsSubmittingAlarmAction] = useState<boolean>(false);
  const [alarmSettings, setAlarmSettings] = useState<ServicemanAlarmPersonalSettings>(() =>
    servicemanAlarmSettingsService.getPersonalSettings()
  );
  const [adminAlarmConfig, setAdminAlarmConfig] = useState<AdminGlobalAlarmSettings>(() =>
    servicemanAlarmSettingsService.getAdminSettings()
  );

  // Determine current pro ID
  const proId = currentUser?.uid || 'pro_rajesh_electrician';

  // Listen to actionable booking offers in real-time
  useEffect(() => {
    if (!proId) return;
    const unsub = bookingOfferService.listenToProOffers(proId, (offers) => {
      setProOffers(offers);
    });
    return () => unsub();
  }, [proId]);

  // Filter jobs for this professional (or all demo bookings if count is low)
  const myBookings = bookings.filter(
    (b) =>
      b.serviceManId === proId ||
      b.serviceManName?.toLowerCase().includes('rajesh') ||
      bookings.length < 5
  );

  // Load Admin Global Alarm Configuration
  useEffect(() => {
    servicemanAlarmSettingsService.loadAdminGlobalSettings().then((cfg) => {
      setAdminAlarmConfig(cfg);
    });
  }, []);

  // Real-time Detection of New Incoming Actionable Bookings for this Eligible Service Pro
  useEffect(() => {
    // If technician is offline / on break (busy), or global/personal alarm is disabled, halt alarm
    if (!isAvailable) {
      if (activeAlarmBooking) {
        bookingAlarmSoundService.stopLoop();
        setActiveAlarmBooking(null);
        setActiveOffer(null);
      }
      return;
    }

    const currentPersonalSettings = servicemanAlarmSettingsService.getPersonalSettings();
    setAlarmSettings(currentPersonalSettings);

    if (!currentPersonalSettings.alarmEnabled || !adminAlarmConfig.globalAlarmEnabled) {
      if (activeAlarmBooking) {
        bookingAlarmSoundService.stopLoop();
        setActiveAlarmBooking(null);
        setActiveOffer(null);
      }
      return;
    }

    // 1. If an alarm is already ringing, verify that offer/booking is still pending and valid
    if (activeAlarmBooking) {
      if (activeOffer) {
        const liveOffer = proOffers.find((o) => o.offerId === activeOffer.offerId);
        if (
          liveOffer &&
          (liveOffer.status !== 'PENDING' ||
            (liveOffer.expiresAt && new Date(liveOffer.expiresAt).getTime() < Date.now()))
        ) {
          bookingAlarmSoundService.stopLoop();
          servicemanAlarmSettingsService.clearBackgroundBookingNotification();
          servicemanAlarmSettingsService.markAlarmAcknowledged(
            activeAlarmBooking.id,
            proId,
            activeOffer.offerId
          );
          setActiveAlarmBooking(null);
          setActiveOffer(null);
          return;
        }
      }

      // Find latest state in bookings (stop immediately on CANCELLED or accepted elsewhere)
      const liveBooking = bookings.find((b) => b.id === activeAlarmBooking.id);
      if (
        liveBooking &&
        (liveBooking.status !== 'pending' ||
          liveBooking.status === 'cancelled' ||
          (liveBooking.serviceManId &&
            liveBooking.serviceManId !== proId &&
            !liveBooking.serviceManName?.toLowerCase().includes('rajesh')))
      ) {
        bookingAlarmSoundService.stopLoop();
        servicemanAlarmSettingsService.clearBackgroundBookingNotification();
        servicemanAlarmSettingsService.markAlarmAcknowledged(
          activeAlarmBooking.id,
          proId,
          activeOffer?.offerId
        );
        setActiveAlarmBooking(null);
        setActiveOffer(null);
        return;
      }
    }

    // 2. First priority: Actionable Booking Offers from booking_offers collection
    // Deduplicate strictly using composite key: bookingId + serviceManId + offerId
    const pendingOffer = proOffers.find((o) => {
      if (o.status !== 'PENDING') return false;
      if (o.expiresAt && new Date(o.expiresAt).getTime() < Date.now()) return false;
      if (servicemanAlarmSettingsService.isAlarmAcknowledged(o.bookingId, proId, o.offerId)) {
        return false;
      }
      return true;
    });

    if (pendingOffer && (!activeAlarmBooking || activeAlarmBooking.id !== pendingOffer.bookingId)) {
      const existingB = bookings.find((b) => b.id === pendingOffer.bookingId);
      const bookingToAlert: Booking = existingB || {
        id: pendingOffer.bookingId,
        customerId: 'customer',
        customerName: pendingOffer.customerName || 'सत्यापित ग्राहक',
        customerPhone: pendingOffer.customerPhone || '',
        serviceId: pendingOffer.serviceId,
        serviceName: pendingOffer.serviceName || 'Service Request',
        categoryId: pendingOffer.categoryId || '',
        categoryName: pendingOffer.categoryName || '',
        serviceManId: proId,
        serviceManName: userProfile?.name || 'Rajesh Sharma',
        scheduledDate: pendingOffer.scheduledDate || 'आज',
        scheduledTime: pendingOffer.scheduledTime || 'तत्काल सेवा',
        address: pendingOffer.address || 'एमपी नगर, भोपाल',
        city: pendingOffer.city || 'Bhopal',
        pincode: pendingOffer.pincode || '462011',
        amount: pendingOffer.amount || 499,
        estimatedCharge: pendingOffer.estimatedCharge || pendingOffer.amount || 499,
        approxDistanceKm: pendingOffer.approxDistanceKm || 2.4,
        approxDistanceText: pendingOffer.approxDistanceText || '2.4 km (अनुमानित दूरी)',
        status: 'pending',
        paymentStatus: 'paid',
        paymentMethod: 'cash',
        createdAt: pendingOffer.createdAt,
        updatedAt: pendingOffer.createdAt,
      };

      setActiveOffer(pendingOffer);
      setActiveAlarmBooking(bookingToAlert);
      bookingAlarmSoundService.startLoop(
        currentPersonalSettings.volume,
        currentPersonalSettings.vibrationEnabled
      );

      if (typeof document !== 'undefined' && document.hidden) {
        servicemanAlarmSettingsService.showBackgroundBookingNotification(
          bookingToAlert.id,
          bookingToAlert.serviceName,
          bookingToAlert.address || bookingToAlert.city || '',
          bookingToAlert.amount,
          bookingToAlert.approxDistanceText || (bookingToAlert.approxDistanceKm ? `${bookingToAlert.approxDistanceKm} km` : undefined)
        );
      }
      return;
    }

    // 3. Fallback: Detect actionable new booking for this professional directly
    const pendingIncoming = myBookings.find((b) => {
      if (b.status !== 'pending') return false;
      if (servicemanAlarmSettingsService.isAlarmAcknowledged(b.id, proId)) return false;
      // Strict eligibility check if enabled
      if (adminAlarmConfig.strictEligibility) {
        if (
          b.serviceManId &&
          b.serviceManId !== proId &&
          !b.serviceManName?.toLowerCase().includes('rajesh')
        ) {
          return false;
        }
      }
      return true;
    });

    if (pendingIncoming && (!activeAlarmBooking || activeAlarmBooking.id !== pendingIncoming.id)) {
      setActiveOffer(null);
      setActiveAlarmBooking(pendingIncoming);

      // Start looping alarm sound & vibration
      bookingAlarmSoundService.startLoop(
        currentPersonalSettings.volume,
        currentPersonalSettings.vibrationEnabled
      );

      // Background notification where supported
      if (typeof document !== 'undefined' && document.hidden) {
        servicemanAlarmSettingsService.showBackgroundBookingNotification(
          pendingIncoming.id,
          pendingIncoming.serviceName,
          pendingIncoming.address || pendingIncoming.city || '',
          pendingIncoming.amount,
          pendingIncoming.approxDistanceText || (pendingIncoming.approxDistanceKm ? `${pendingIncoming.approxDistanceKm} km` : undefined)
        );
      }
    }
  }, [proOffers, myBookings, bookings, isAvailable, proId, adminAlarmConfig, activeAlarmBooking, activeOffer]);

  // Clean up alarm sound when component unmounts
  useEffect(() => {
    return () => {
      bookingAlarmSoundService.stopLoop();
    };
  }, []);

  // Accept incoming booking from alarm modal
  const handleAcceptAlarmBooking = async (booking: Booking) => {
    setIsSubmittingAlarmAction(true);
    // Stop alarm sound and notification immediately on ACCEPT
    bookingAlarmSoundService.stopLoop();
    servicemanAlarmSettingsService.clearBackgroundBookingNotification();

    const activeProId = proId || userProfile?.id || '';
    const offerId = activeOffer?.offerId || `offer_${booking.id}_${activeProId}`;
    servicemanAlarmSettingsService.markAlarmAcknowledged(booking.id, activeProId, offerId);

    try {
      // CRITICAL ATOMIC ACCEPTANCE: Firestore Transaction
      const atomicResult = await bookingOfferService.acceptBookingOffer({
        offerId,
        bookingId: booking.id,
        serviceManId: activeProId,
        serviceManName: userProfile?.name || 'Rajesh Sharma',
        serviceManPhone: userProfile?.phone || '+91 98260 12345',
      });

      if (!atomicResult.success && atomicResult.code === 'ALREADY_TAKEN') {
        alert(atomicResult.message || 'यह बुकिंग पहले ही किसी अन्य सेवा पेशेवर द्वारा स्वीकार की जा चुकी है।');
        setActiveAlarmBooking(null);
        setActiveOffer(null);
        return;
      }

      // Server-side audit and notification trigger
      fetch('/api/bookings/accept-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          offerId,
          serviceManId: activeProId,
        }),
      }).catch((apiErr) => {
        console.warn('Non-fatal backend notification dispatch:', apiErr);
      });

      await handleStatusTransition(booking, 'accepted');
      setActiveAlarmBooking(null);
      setActiveOffer(null);
      setStatusFilter('accepted');

      setTimeout(() => {
        const el = document.getElementById(`pro-job-${booking.id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 250);
    } catch (err) {
      console.error('Failed to accept incoming booking:', err);
    } finally {
      setIsSubmittingAlarmAction(false);
    }
  };

  // Reject incoming booking from alarm modal
  const handleRejectAlarmBooking = async (booking: Booking, reason?: string) => {
    setIsSubmittingAlarmAction(true);
    // Stop alarm sound and notification immediately on REJECT
    bookingAlarmSoundService.stopLoop();
    servicemanAlarmSettingsService.clearBackgroundBookingNotification();

    const activeProId = proId || userProfile?.id || '';
    const offerId = activeOffer?.offerId || `offer_${booking.id}_${activeProId}`;
    servicemanAlarmSettingsService.markAlarmAcknowledged(booking.id, activeProId, offerId);

    try {
      await bookingOfferService.rejectBookingOffer(offerId, activeProId, reason);

      fetch('/api/booking-offers/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId,
          serviceManId: activeProId,
          reason,
        }),
      }).catch((e) => console.warn('Non-fatal reject notification:', e));

      await handleStatusTransition(
        booking,
        'cancelled',
        reason || 'Technician declined incoming request'
      );
      setActiveAlarmBooking(null);
      setActiveOffer(null);
    } catch (err) {
      console.error('Failed to reject incoming booking:', err);
    } finally {
      setIsSubmittingAlarmAction(false);
    }
  };

  // Alarm countdown timer expired
  const handleExpireAlarmBooking = (booking: Booking) => {
    // Stop alarm sound and notification immediately on EXPIRED
    bookingAlarmSoundService.stopLoop();
    servicemanAlarmSettingsService.clearBackgroundBookingNotification();

    const activeProId = proId || userProfile?.id || '';
    const offerId = activeOffer?.offerId || `offer_${booking.id}_${activeProId}`;
    servicemanAlarmSettingsService.markAlarmAcknowledged(booking.id, activeProId, offerId);

    bookingOfferService.expireBookingOffer(offerId).catch(console.warn);
    setActiveAlarmBooking(null);
    setActiveOffer(null);
    setAvailabilityMessage('बुकिंग अनुरोध समय समाप्त: यह बुकिंग स्वतः अन्य तकनीशियन को री-असाइन की जा रही है।');
    setTimeout(() => setAvailabilityMessage(null), 5000);
  };

  // Direct acceptance from Offers Tab
  const handleDirectAcceptOffer = async (offer: BookingOffer) => {
    setIsSubmittingAlarmAction(true);
    try {
      const activeProId = proId || userProfile?.id || '';
      const res = await bookingOfferService.acceptBookingOffer({
        offerId: offer.offerId,
        bookingId: offer.bookingId,
        serviceManId: activeProId,
        serviceManName: userProfile?.name || 'Rajesh Sharma',
        serviceManPhone: userProfile?.phone || '+91 98260 12345',
      });

      if (!res.success && res.code === 'ALREADY_TAKEN') {
        alert(res.message || 'यह बुकिंग पहले ही किसी अन्य सेवा पेशेवर द्वारा स्वीकार की जा चुकी है।');
        return;
      }

      // Backend sync
      fetch('/api/bookings/accept-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: offer.bookingId,
          offerId: offer.offerId,
          serviceManId: activeProId,
        }),
      }).catch(console.warn);

      setStatusFilter('accepted');

      setTimeout(() => {
        const el = document.getElementById(`pro-job-${offer.bookingId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 250);
    } catch (err) {
      console.error('Error accepting offer directly:', err);
    } finally {
      setIsSubmittingAlarmAction(false);
    }
  };

  // Direct rejection from Offers Tab
  const handleDirectRejectOffer = async (offer: BookingOffer) => {
    try {
      const activeProId = proId || userProfile?.id || '';
      await bookingOfferService.rejectBookingOffer(offer.offerId, activeProId, 'Declined by professional');
      fetch('/api/booking-offers/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: offer.offerId,
          serviceManId: activeProId,
          reason: 'Declined by professional',
        }),
      }).catch(console.warn);
    } catch (err) {
      console.error('Error rejecting offer:', err);
    }
  };

  // Test simulation for technician preview
  const handleSimulateTestBooking = () => {
    servicemanAlarmSettingsService.clearAlarmAcknowledged('SIMULATED-PRO-ALERT-1', proId, 'TEST-OFFER-1');

    const simulatedBooking: Booking = {
      id: 'SIMULATED-PRO-ALERT-1',
      customerId: 'cust_bhopal_live',
      customerName: 'अमित कुमार (Amit Kumar)',
      customerPhone: '+91 98260 54321',
      serviceId: 'srv_elec_repair_01',
      serviceName: 'इलेक्ट्रिकल शॉर्ट-सर्किट व स्विचबोर्ड रिपेयर',
      categoryId: 'cat_electrician',
      categoryName: 'इलेक्ट्रिशियन (Electrician)',
      serviceManId: proId,
      serviceManName: userProfile?.name || 'Rajesh Sharma',
      scheduledDate: 'आज (तुरंत)',
      scheduledTime: 'तत्काल सेवा (Immediate)',
      address: 'मकान नं. 42, एमपी नगर ज़ोन-2, भोपाल',
      city: 'Bhopal',
      pincode: '462011',
      amount: 650,
      estimatedCharge: 650,
      approxDistanceKm: 2.1,
      approxDistanceText: '2.1 km (एमपी नगर ज़ोन-2)',
      status: 'pending',
      paymentStatus: 'unpaid',
      paymentMethod: 'cash',
      notes: 'मेन बोर्ड में स्पार्किंग हो रही है, कृपया 30 मिनट में पहुंचें।',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const simulatedOffer: BookingOffer = {
      offerId: 'TEST-OFFER-1',
      bookingId: 'SIMULATED-PRO-ALERT-1',
      serviceManId: proId,
      serviceId: 'srv_elec_repair_01',
      serviceName: 'इलेक्ट्रिकल शॉर्ट-सर्किट व स्विचबोर्ड रिपेयर',
      categoryId: 'cat_electrician',
      categoryName: 'इलेक्ट्रिशियन (Electrician)',
      customerName: 'अमित कुमार (Amit Kumar)',
      customerPhone: '+91 98260 54321',
      districtId: 'bhopal',
      districtName: 'भोपाल',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 60000).toISOString(),
      createdAt: new Date().toISOString(),
      amount: 650,
      address: 'मकान नं. 42, एमपी नगर ज़ोन-2, भोपाल',
      city: 'Bhopal',
      pincode: '462011',
      scheduledDate: 'आज (तुरंत)',
      scheduledTime: 'तत्काल सेवा',
      approxDistanceKm: 2.1,
      approxDistanceText: '2.1 km (एमपी नगर ज़ोन-2)',
      estimatedCharge: 650,
    };

    setActiveOffer(simulatedOffer);
    setActiveAlarmBooking(simulatedBooking);
    bookingAlarmSoundService.startLoop(
      alarmSettings.volume,
      alarmSettings.vibrationEnabled
    );

    if (typeof document !== 'undefined' && document.hidden) {
      servicemanAlarmSettingsService.showBackgroundBookingNotification(
        simulatedBooking.id,
        simulatedBooking.serviceName,
        simulatedBooking.address || simulatedBooking.city || '',
        simulatedBooking.amount,
        simulatedBooking.approxDistanceText
      );
    }
  };

  // Real-time synchronization of Pro availability from 'service_men' collection
  useEffect(() => {
    if (!proId) return;

    const proRef = doc(db, 'service_men', proId);
    const unsub = onSnapshot(
      proRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (typeof data.isAvailable === 'boolean') {
            setIsAvailable(data.isAvailable);
          } else if (data.status === 'busy' || data.dutyStatus === 'busy') {
            setIsAvailable(false);
          } else {
            setIsAvailable(true);
          }
        }
      },
      (err) => {
        console.warn('Real-time pro availability listener note:', err);
      }
    );

    return () => unsub();
  }, [proId]);

  // Handle toggling Active vs Busy status with Firestore persistence
  const handleToggleAvailability = async (targetState?: boolean) => {
    const nextState = targetState !== undefined ? targetState : !isAvailable;
    setIsUpdatingAvailability(true);
    setAvailabilityMessage(null);

    try {
      setIsAvailable(nextState);

      const timestamp = new Date().toISOString();
      const updates = {
        isAvailable: nextState,
        status: nextState ? 'active' : 'busy',
        dutyStatus: nextState ? 'active' : 'busy',
        lastStatusChangedAt: timestamp,
        updatedAt: timestamp,
      };

      // 1. Update in 'service_men' collection
      await setDoc(doc(db, 'service_men', proId), updates, { merge: true });

      // 2. Also sync to 'users' collection if applicable
      if (currentUser?.uid) {
        await setDoc(doc(db, 'users', currentUser.uid), {
          isAvailable: nextState,
          status: nextState ? 'active' : 'busy',
          updatedAt: timestamp,
        }, { merge: true });
      }

      const msg = nextState
        ? 'ड्यूटी स्थिति: सक्रिय (Active) • आप नए बुकिंग ऑर्डर्स प्राप्त कर सकते हैं।'
        : 'ड्यूटी स्थिति: व्यस्त (Busy / Break) • बुकिंग आबंटन अस्थायी रूप से रोक दिया गया है।';
      setAvailabilityMessage(msg);
      setTimeout(() => setAvailabilityMessage(null), 4000);
    } catch (err) {
      console.error('Failed to update duty status in service_men collection:', err);
      // Revert on error
      setIsAvailable(!nextState);
      setAvailabilityMessage('स्थिति अपडेट करने में त्रुटि हुई। कृपया पुनः प्रयास करें।');
    } finally {
      setIsUpdatingAvailability(false);
    }
  };

  // Phase 2: Live GPS tracking for active assigned bookings
  const {
    isTracking: isGpsTracking,
    activeBookingId: trackingBookingId,
    permission: gpsPermission,
    requestPermissionNow,
  } = useServicemanLiveGps(myBookings, proId);

  // Automatically ensure OTP is initialized for any in_progress jobs
  useEffect(() => {
    myBookings.forEach((job) => {
      if (job.status === 'in_progress' && !job.otp) {
        ensureBookingHasOtp(job).catch((err) =>
          console.warn('Auto-provision OTP for pro job error:', err)
        );
      }
    });
  }, [myBookings]);

  const handleCopyOtp = (otp?: string, jobId?: string) => {
    if (otp && jobId) {
      navigator.clipboard.writeText(otp);
      setCopiedOtpId(jobId);
      setTimeout(() => setCopiedOtpId(null), 2000);
    }
  };

  const handleRegenerateOtp = async (job: Booking) => {
    setRegeneratingOtpId(job.id);
    try {
      await regenerateBookingOtp(job);
    } catch (err) {
      console.error('Failed to regenerate OTP code:', err);
    } finally {
      setRegeneratingOtpId(null);
    }
  };

  const activeJobs = myBookings.filter((b) =>
    ['pending', 'accepted', 'on_the_way', 'in_progress'].includes(b.status)
  );
  const completedJobs = myBookings.filter((b) => b.status === 'completed');
  const cancelledJobs = myBookings.filter((b) => b.status === 'cancelled' || b.status === 'rejected');

  const totalEarnings = completedJobs.reduce(
    (acc, curr) => acc + Math.round(curr.amount * 0.85),
    0
  );

  const displayedJobs = myBookings.filter((b) => {
    if (statusFilter === 'pending') return b.status === 'pending';
    if (statusFilter === 'accepted') return b.status === 'accepted' || b.status === 'on_the_way';
    if (statusFilter === 'in_progress') return b.status === 'in_progress';
    if (statusFilter === 'completed') return b.status === 'completed';
    if (statusFilter === 'cancelled') return b.status === 'cancelled' || b.status === 'rejected';
    return true;
  });

  // State machine transition handler
  const handleStatusTransition = async (
    booking: Booking,
    newStatus: BookingStatus,
    reason?: string
  ) => {
    setUpdatingId(booking.id);
    try {
      await executeStatusTransition(booking, newStatus, {
        cancelledBy: 'service_man',
        reason: reason || cancelReason,
        proShare: Math.round(booking.amount * 0.85),
      });

      // Stop GPS updates if booking is completed or cancelled
      if (newStatus === 'completed' || newStatus === 'cancelled') {
        stopServicemanPeriodicGpsTracking(booking.id);
      }

      // Send Customer Notifications
      if (booking.customerId) {
        if (newStatus === 'accepted') {
          await sendNotification({
            userId: booking.customerId,
            title: 'Booking Accepted! 🛠️',
            message: `${
              userProfile?.name || booking.serviceManName || 'Technician'
            } accepted booking #${booking.id} (${booking.serviceName}). Scheduled for ${
              booking.scheduledDate
            }.`,
            type: 'booking',
            link: booking.id,
          });
        } else if (newStatus === 'in_progress') {
          await sendNotification({
            userId: booking.customerId,
            title: 'Technician Started Service ⚡',
            message: `Work on #${booking.id} (${booking.serviceName}) has started on-site.`,
            type: 'booking',
            link: booking.id,
          });
        } else if (newStatus === 'completed') {
          await sendNotification({
            userId: booking.customerId,
            title: 'Service Completed! ⭐',
            message: `Your service #${booking.id} has been marked complete. Please rate your experience!`,
            type: 'booking',
            link: booking.id,
          });
        } else if (newStatus === 'cancelled') {
          await sendNotification({
            userId: booking.customerId,
            title: 'Booking Cancelled',
            message: `Booking #${booking.id} was cancelled by technician. Reason: ${
              reason || cancelReason
            }`,
            type: 'booking',
            link: booking.id,
          });
        }
      }

      setCancelModalBooking(null);
    } catch (err) {
      console.error('Failed to update booking status in state machine:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Festive Greeting Banner for Service Pro */}
      {effectiveTheme.category === 'festival' && (
        <div
          className="rounded-3xl p-4 sm:p-5 text-white flex items-center justify-between shadow-xs transition-all animate-in fade-in"
          style={{ background: effectiveTheme.colors.bannerGradient }}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl filter drop-shadow-xs">{effectiveTheme.greetingIcon}</span>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-white/85">
                {effectiveTheme.nameHindi} • उत्सव शुभकामना
              </div>
              <div className="text-sm sm:text-base font-extrabold">{effectiveTheme.greetingHindi}</div>
            </div>
          </div>
          <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-bold text-white border border-white/25">
            HARDINKAAM पार्टनर उत्सव
          </span>
        </div>
      )}

      {/* Header with Real-time Active / Busy Toggle Switch */}
      <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl transition-colors shrink-0 shadow-xs"
            style={{
              backgroundColor: effectiveTheme.colors.primaryLight,
              color: effectiveTheme.colors.primaryDark,
            }}
          >
            {userProfile?.name?.charAt(0) || 'R'}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-stone-900">
                Namaste, {userProfile?.name || 'Rajesh Sharma'}
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> KYC VERIFIED PRO
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1.5 transition-all ${
                  isAvailable
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                {isAvailable ? 'ACTIVE • ONLINE' : 'BUSY • ON BREAK'}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Senior Electrician &amp; Appliance Specialist • Rating: 4.9★ (142 Jobs) • Bhopal
            </p>
          </div>
        </div>

        {/* Real-time Duty Status Toggle Switch (Active vs Busy) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-stone-50/90 p-3 rounded-2xl border border-stone-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-700">Duty Status:</span>
            {isUpdatingAvailability && (
              <RefreshCw className="w-3.5 h-3.5 text-orange-500 animate-spin" />
            )}
          </div>

          {/* Segmented Active / Busy Switch */}
          <div
            id="duty-status-segmented-control"
            className="inline-flex p-1 bg-stone-200/80 rounded-xl border border-stone-300/80 shadow-inner"
          >
            {/* Active (Online) Button */}
            <button
              id="pro-status-active-btn"
              type="button"
              disabled={isUpdatingAvailability}
              onClick={() => handleToggleAvailability(true)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isAvailable
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-300/60'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${isAvailable ? 'animate-pulse' : ''}`} />
              <span>Active</span>
            </button>

            {/* Busy (Break/Offline) Button */}
            <button
              id="pro-status-busy-btn"
              type="button"
              disabled={isUpdatingAvailability}
              onClick={() => handleToggleAvailability(false)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                !isAvailable
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-300/60'
              }`}
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>Busy</span>
            </button>
          </div>

          {/* Master Power Toggle Button */}
          <button
            id="duty-status-toggle"
            type="button"
            title={isAvailable ? 'Click to go Busy' : 'Click to go Active'}
            disabled={isUpdatingAvailability}
            onClick={() => handleToggleAvailability()}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              isAvailable
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs'
                : 'bg-stone-300 hover:bg-stone-400 text-stone-700'
            }`}
          >
            <Power className="w-4 h-4" />
          </button>

          {/* New Booking Alarm Settings Quick Action */}
          <button
            id="pro-alarm-settings-btn"
            type="button"
            onClick={() => setIsAlarmSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-100/70 hover:bg-orange-100 text-orange-900 border border-orange-200 font-bold text-xs transition-all cursor-pointer"
            title="नया बुकिंग अलार्म सेटिंग्स व टेस्ट (Booking Alarm Settings)"
          >
            <div className="relative">
              <Bell className={`w-3.5 h-3.5 ${alarmSettings.alarmEnabled ? 'text-orange-600' : 'text-stone-400'}`} />
              {alarmSettings.alarmEnabled && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute -top-0.5 -right-0.5 animate-pulse" />
              )}
            </div>
            <span className="hidden sm:inline">अलार्म</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${alarmSettings.alarmEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'}`}>
              {alarmSettings.alarmEnabled ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>
      </div>

      {/* Real-time Availability Toast Message */}
      {availabilityMessage && (
        <div className="p-3.5 rounded-2xl bg-orange-50 border border-orange-200 text-orange-900 text-xs font-medium flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-orange-600 shrink-0" />
            <span>{availabilityMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setAvailabilityMessage(null)}
            className="text-stone-400 hover:text-stone-700 font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active Jobs</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-stone-900">{activeJobs.length}</p>
          <span className="text-[11px] text-blue-600 font-medium">In lifecycle queue</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-stone-900">{completedJobs.length}</p>
          <span className="text-[11px] text-emerald-600 font-medium">Successfully delivered</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Net Earnings</span>
            <DollarSign className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-stone-900">
            ₹{totalEarnings || 4250}
          </p>
          <button
            onClick={onOpenWallet}
            className="text-[11px] text-orange-600 font-bold hover:underline cursor-pointer"
          >
            View Wallet &amp; Payouts →
          </button>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Rating Score</span>
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-stone-900">4.9 ★</p>
          <span className="text-[11px] text-stone-500">Top 5% in Bhopal</span>
        </div>
      </div>

      {/* Google AdSense Pro Tools & Hardware Sponsor Banner */}
      <AdSenseBanner
        slot="3091827461"
        format="responsive"
        category="tools"
        label="कारीगर उपकरण एवं प्रायोजित ऑफर • GOOGLE ADSENSE"
        className="my-2"
      />

      {/* Phase 2: Serviceman Live GPS Status Indicator */}
      {trackingBookingId && (
        <div
          id="serviceman-gps-status-bar"
          className="bg-white rounded-2xl border border-stone-200 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs"
        >
          <div className="flex items-center gap-2.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isGpsTracking ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <div>
              <span className="font-bold text-stone-800">
                Live GPS Active for Job #{trackingBookingId}
              </span>
              <p className="text-stone-500 text-[11px] mt-0.5">
                {isGpsTracking
                  ? 'Periodic GPS location saving to serviceTracking document enabled.'
                  : 'GPS location updates waiting for device permission.'}
              </p>
            </div>
          </div>
          {gpsPermission !== 'granted' && (
            <button
              id="serviceman-grant-gps-btn"
              type="button"
              onClick={requestPermissionNow}
              className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Enable GPS
            </button>
          )}
        </div>
      )}

      {/* Lifecycle Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { key: 'all', label: `All Jobs (${myBookings.length})` },
          { key: 'offers', label: `Offers (${proOffers.filter((o) => o.status === 'PENDING').length})` },
          { key: 'pending', label: `Pending (${myBookings.filter((b) => b.status === 'pending').length})` },
          { key: 'accepted', label: `Accepted (${myBookings.filter((b) => b.status === 'accepted' || b.status === 'on_the_way').length})` },
          { key: 'in_progress', label: `In Progress (${myBookings.filter((b) => b.status === 'in_progress').length})` },
          { key: 'completed', label: `Completed (${completedJobs.length})` },
          { key: 'cancelled', label: `Cancelled (${cancelledJobs.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setStatusFilter(tab.key as any)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === tab.key
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Offers Tab Rendering */}
      {statusFilter === 'offers' ? (
        <div className="space-y-4">
          {proOffers.length === 0 ? (
            <div className="bg-white rounded-3xl border border-stone-200 p-8 text-center">
              <Bell className="w-10 h-10 text-stone-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-stone-800">No Booking Offers</h3>
              <p className="text-xs text-stone-400 mt-1">
                When customer bookings are created in your district and service category, actionable offers will arrive here in real time.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {proOffers.map((offer) => {
                const isExpired = offer.expiresAt ? new Date(offer.expiresAt).getTime() < Date.now() : false;
                const isPending = offer.status === 'PENDING' && !isExpired;

                return (
                  <div
                    key={offer.offerId}
                    id={`pro-offer-${offer.offerId}`}
                    className={`bg-white rounded-3xl border overflow-hidden shadow-xs hover:shadow-md transition-all ${
                      isPending ? 'border-orange-400 ring-2 ring-orange-400/20' : 'border-stone-200'
                    }`}
                  >
                    <div className="p-4 sm:p-5 bg-stone-50/80 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                            {offer.offerId}
                          </span>
                          <span className="text-stone-300">•</span>
                          <h3 className="text-sm sm:text-base font-extrabold text-stone-900">
                            {offer.serviceName || 'सेवा अनुरोध (Service Request)'}
                          </h3>
                        </div>
                        <p className="text-xs text-stone-500 mt-1">
                          डिस्ट्रिक्ट: <strong className="text-stone-700">{offer.districtName || offer.districtId || 'Bhopal'}</strong> • श्रेणी: {offer.categoryName || offer.categoryId}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`text-xs font-black uppercase px-3 py-1 rounded-full ${
                            isPending
                              ? 'bg-amber-100 text-amber-800 animate-pulse border border-amber-300'
                              : offer.status === 'ACCEPTED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : offer.status === 'REJECTED'
                              ? 'bg-stone-200 text-stone-700'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isExpired && offer.status === 'PENDING' ? 'EXPIRED' : offer.status}
                        </span>
                        <div className="text-right">
                          <span className="text-base font-black text-stone-900 block">
                            ₹{offer.amount || 499}
                          </span>
                          <span className="text-[10px] text-stone-400 font-semibold">
                            (85% शेयर: ₹{Math.round((offer.amount || 499) * 0.85)})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 sm:p-5 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2 text-stone-600">
                          <MapPin className="w-4 h-4 text-stone-400 shrink-0" />
                          <span>{offer.address || 'भोपाल'} {offer.pincode ? `(${offer.pincode})` : ''}</span>
                        </div>
                        <div className="flex items-center gap-2 text-stone-600">
                          <Calendar className="w-4 h-4 text-stone-400 shrink-0" />
                          <span>{offer.scheduledDate || 'आज'} • {offer.scheduledTime || 'तुरंत'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-stone-600">
                          <User className="w-4 h-4 text-stone-400 shrink-0" />
                          <span>ग्राहक: {offer.customerName || 'सत्यापित ग्राहक'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-stone-600">
                          <Clock className="w-4 h-4 text-stone-400 shrink-0" />
                          <span>ऑफ़र समय: {new Date(offer.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      {/* Action Bar for Pending Offers */}
                      {isPending && (
                        <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            id={`btn-reject-offer-${offer.offerId}`}
                            onClick={() => handleDirectRejectOffer(offer)}
                            className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-bold transition-colors cursor-pointer"
                          >
                            अस्वीकार (Reject)
                          </button>
                          <button
                            type="button"
                            id={`btn-accept-offer-${offer.offerId}`}
                            disabled={isSubmittingAlarmAction}
                            onClick={() => handleDirectAcceptOffer(offer)}
                            className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            स्वीकार करें (Accept Offer)
                          </button>
                        </div>
                      )}

                      {offer.status === 'ACCEPTED' && (
                        <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          यह बुकिंग आपके द्वारा स्वीकार कर ली गई है। Accepted Jobs टैब में देखें।
                        </div>
                      )}

                      {(offer.status === 'REJECTED' || (offer.status === 'PENDING' && isExpired)) && (
                        <div className="p-2 rounded-xl bg-stone-100 text-stone-600 text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-stone-400" />
                          यह ऑफ़र समाप्त अथवा अस्वीकृत हो चुका है।
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Jobs List Section */
        <div className="space-y-4">
        {displayedJobs.length === 0 ? (
          <div className="bg-white rounded-3xl border border-stone-200 p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-stone-800">No jobs in this filter</h3>
            <p className="text-xs text-stone-400 mt-1">
              Check other status tabs or keep duty status "Online" to receive incoming customer
              bookings.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedJobs.map((job) => {
              const isUpdating = updatingId === job.id;
              const stepIdx = getStepIndex(job.status);
              const isCancelled = job.status === 'cancelled' || job.status === 'rejected';
              const isExpanded = expandedJobId === job.id;

              return (
                <div
                  key={job.id}
                  id={`pro-job-${job.id}`}
                  className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow"
                >
                  {/* Job Header */}
                  <div className="p-4 sm:p-5 bg-stone-50/80 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-500">#{job.id}</span>
                        <span className="text-stone-300">•</span>
                        <h3 className="text-sm sm:text-base font-extrabold text-stone-900">
                          {job.serviceName}
                        </h3>
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Scheduled: <strong>{job.scheduledDate}</strong> ({job.scheduledTime})
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${
                          isCancelled
                            ? 'bg-rose-100 text-rose-800'
                            : job.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : job.status === 'in_progress'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {job.status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-base font-black text-stone-900">
                        ₹{job.status === 'completed' ? (job.finalBill?.finalAmount ?? job.finalAmount ?? job.amount) : job.amount}
                      </span>
                    </div>
                  </div>

                  {/* Lifecycle Stepper within Pro Card */}
                  {!isCancelled && (
                    <div className="px-4 sm:px-6 py-3 bg-stone-50/40 border-b border-stone-100">
                      <div className="flex items-center justify-between text-[11px]">
                        {LIFECYCLE_STEPS.map((s, idx) => {
                          const isDone = idx < stepIdx;
                          const isCurrent = idx === stepIdx;
                          return (
                            <div key={s.key} className="flex items-center gap-1">
                              <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                  isDone
                                    ? 'bg-orange-600 text-white'
                                    : isCurrent
                                    ? 'bg-orange-600 text-white ring-2 ring-orange-200 animate-pulse'
                                    : 'bg-stone-200 text-stone-500'
                                }`}
                              >
                                {isDone ? '✓' : idx + 1}
                              </span>
                              <span
                                className={`hidden sm:inline font-semibold ${
                                  isCurrent
                                    ? 'text-orange-600 font-bold'
                                    : isDone
                                    ? 'text-stone-800'
                                    : 'text-stone-400'
                                }`}
                              >
                                {s.shortLabel}
                              </span>
                              {idx < LIFECYCLE_STEPS.length - 1 && (
                                <span className="text-stone-300 mx-1 sm:mx-2">›</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Main Job Body */}
                  <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Customer info & Address */}
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                          Customer Details
                        </span>
                        <p className="text-sm font-bold text-stone-900">{job.customerName}</p>
                        <p className="text-stone-500">{job.customerPhone}</p>
                      </div>

                      <div className="pt-2 border-t border-stone-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                          Job Location
                        </span>
                        <p className="font-semibold text-stone-800 flex items-start gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-orange-600 flex-shrink-0 mt-0.5" />
                          <span>
                            {job.address}, {job.city} {job.pincode}
                          </span>
                        </p>
                        {job.notes && (
                          <p className="text-[11px] text-stone-500 italic mt-1 ml-4.5">
                            Customer note: "{job.notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Pro earnings & quick communication */}
                    <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 flex flex-col justify-between">
                      <div className="flex justify-between text-xs mb-3">
                        <span className="text-stone-500">Your Share (85%):</span>
                        <span className="font-black text-emerald-600 text-sm">
                          ₹{Math.round((job.status === 'completed' ? (job.finalBill?.finalAmount ?? job.finalAmount ?? job.amount) : job.amount) * 0.85)}
                        </span>
                      </div>

                      {/* Phase 9: Service charge display for completed booking */}
                      {job.status === 'completed' && (
                        <div className="mb-3 pt-2.5 border-t border-stone-200 text-xs space-y-1.5 bg-white/70 p-2.5 rounded-xl border border-stone-100">
                          <div className="flex justify-between text-stone-600">
                            <span className="font-medium">Service Charge:</span>
                            <span className="font-bold text-stone-900">
                              ₹{job.finalBill?.baseAmount ?? job.baseAmount ?? job.amount}
                            </span>
                          </div>
                          <div className="flex justify-between text-stone-600">
                            <span className="font-medium">Total Amount:</span>
                            <span className="font-black text-stone-950">
                              ₹{job.finalBill?.finalAmount ?? job.finalAmount ?? job.amount}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-stone-600">
                            <span className="font-medium">Payment Status:</span>
                            <span
                              className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-md ${
                                (job.finalBill?.paymentStatus || job.paymentStatus) === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : (job.finalBill?.paymentStatus || job.paymentStatus) === 'cod'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {(job.finalBill?.paymentStatus || job.paymentStatus) === 'paid'
                                ? '● Paid'
                                : (job.finalBill?.paymentStatus || job.paymentStatus) === 'cod'
                                ? '● Cash on Delivery'
                                : '● Unpaid'}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        {job.customerPhone && (
                          <a
                            href={`tel:${job.customerPhone}`}
                            className="flex-1 py-2 px-3 rounded-xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            Call
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => setActiveChatBooking(job)}
                          className="flex-1 py-2 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Live Chat
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Customer Review if Completed */}
                  {job.status === 'completed' && job.isReviewed && (
                    <div className="mx-4 sm:mx-5 mb-4 p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs">
                      <div className="flex items-center gap-1 text-amber-500 mb-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <span key={s} className="text-sm">
                            {s <= (job.rating || 5) ? '★' : '☆'}
                          </span>
                        ))}
                        <span className="text-xs font-bold text-amber-900 ml-1">
                          {job.rating}/5 Customer Rating
                        </span>
                      </div>
                      {job.reviewComment && (
                        <p className="text-stone-700 italic">"{job.reviewComment}"</p>
                      )}
                    </div>
                  )}

                  {/* Phase 5: Serviceman Live Booking Navigation Map */}
                  {['accepted', 'on_the_way', 'arriving', 'arrived', 'otp_pending', 'in_progress', 'work_started'].includes(job.status) && (
                    <div className="mx-4 sm:mx-5 mb-4">
                      <ServicemanBookingLiveMap
                        booking={job}
                        servicemanId={proId}
                      />
                    </div>
                  )}

                  {/* Advanced Service Professional Tracking & Arrival OTP Card */}
                  {['accepted', 'on_the_way', 'arriving', 'arrived', 'otp_pending'].includes(job.status) && (
                    <div className="mx-4 sm:mx-5 mb-4">
                      <ProArrivalVerificationCard
                        booking={job}
                        onStatusUpdated={() => {
                          // Real-time Firestore listener auto-syncs state
                        }}
                      />
                    </div>
                  )}

                  {/* Live Work Timer & Transparent Charges Manager */}
                  {(job.status === 'in_progress' || job.status === 'work_started' || job.workStartedAt) && (
                    <div className="mx-4 sm:mx-5 mb-4 space-y-3">
                      <WorkServiceTimer
                        workStartedAt={job.workStartedAt || job.startedAt}
                        workEndedAt={job.workEndedAt || job.completedAt}
                        status={job.status}
                        workDurationFormatted={job.workDurationFormatted}
                      />
                      {job.status === 'in_progress' && (
                        <ExtraChargesManager
                          booking={job}
                          userRole="service_man"
                          userId={proId}
                          userName={job.serviceManName || userProfile?.name}
                        />
                      )}
                    </div>
                  )}

                  {/* Provider Completion OTP Card for In Progress Jobs */}
                  {job.status === 'in_progress' && (
                    <div className="mx-4 sm:mx-5 mb-4 p-4 rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50/60 to-white border border-amber-200/90 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                            <KeyRound className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-extrabold uppercase tracking-wider text-stone-900">
                                Service Completion Code (Provider OTP)
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-950">
                                Give to Customer
                              </span>
                            </div>
                            <p className="text-[11px] text-stone-600 mt-0.5">
                              Share this 4-digit code with the customer when finished. The customer inputs this code to confirm and verify delivery.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <div className="px-3.5 py-1.5 bg-white rounded-xl border border-amber-300 font-mono text-lg font-black tracking-widest text-amber-950 shadow-xs">
                            {job.otp || '----'}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyOtp(job.otp, job.id)}
                            className="p-2 rounded-xl bg-white border border-amber-200 text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer shadow-xs"
                            title="Copy Completion Code"
                          >
                            {copiedOtpId === job.id ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            disabled={regeneratingOtpId === job.id}
                            onClick={() => handleRegenerateOtp(job)}
                            className="p-2 rounded-xl bg-white border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                            title="Regenerate Code"
                          >
                            <RefreshCw
                              className={`w-4 h-4 ${regeneratingOtpId === job.id ? 'animate-spin' : ''}`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Verified Delivery Badge for Completed Jobs */}
                  {job.status === 'completed' && job.isVerifiedDelivery && (
                    <div className="mx-4 sm:mx-5 mb-4 p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span className="font-bold">
                          Verified Service Delivery Authenticated via Customer Code Entry
                        </span>
                      </div>
                      {job.verifiedAt && (
                        <span className="text-[11px] text-emerald-700 font-medium">
                          {new Date(job.verifiedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                  )}

                  {/* State Machine Status Actions Controls */}
                  <div className="p-4 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs text-stone-500 font-medium">
                      Service Lifecycle Status Machine:
                    </span>

                    <div className="flex items-center gap-2">
                      {/* State: Pending */}
                      {job.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleStatusTransition(job, 'accepted')}
                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-60"
                          >
                            Accept Booking
                          </button>
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => setCancelModalBooking(job)}
                            className="px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold cursor-pointer"
                          >
                            Decline
                          </button>
                        </>
                      )}

                      {/* State: Accepted / On The Way / Arriving / Arrived */}
                      {(job.status === 'accepted' || job.status === 'on_the_way' || job.status === 'arriving' || job.status === 'arrived' || job.status === 'otp_pending') && (
                        <>
                          <span className="text-[11px] font-semibold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200">
                            Use Arrival Verification Card above to verify OTP and start
                          </span>
                          <button
                            type="button"
                            onClick={() => setCancelModalBooking(job)}
                            className="px-3 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 text-xs font-semibold cursor-pointer"
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      {/* State: In Progress */}
                      {job.status === 'in_progress' && (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEndWorkModalBooking(job)}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                            title="काम पूरा करें & अंतिम बिल जनरेट करें"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                            <span>काम पूरा करें (Complete Work)</span>
                          </button>
                          <span className="text-[11px] font-medium text-slate-500">
                            (Code: {job.otp || '----'})
                          </span>
                        </div>
                      )}

                      {/* State: Completed */}
                      {job.status === 'completed' && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Service Completed
                          </span>
                          <button
                            type="button"
                            onClick={() => setViewBillBooking(job)}
                            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                          >
                            <Receipt className="w-3.5 h-3.5 text-amber-400" />
                            <span>HARDINKAAM Bill</span>
                          </button>
                        </div>
                      )}

                      {/* State: Cancelled */}
                      {isCancelled && (
                        <span className="text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
                          Cancelled
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* Technician Cancel Confirmation Modal */}
      {cancelModalBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full space-y-4 border border-stone-200 shadow-2xl">
            <h3 className="text-base font-extrabold text-stone-900">
              Decline / Cancel Booking #{cancelModalBooking.id}
            </h3>
            <p className="text-xs text-stone-500">
              Please specify the reason so our dispatch system can re-assign or notify the customer.
            </p>
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">Reason</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500"
              >
                <option value="Schedule clash / Busy on other job">Schedule clash / Busy</option>
                <option value="Location out of service reach">Location out of reach</option>
                <option value="Required tools/parts unavailable">Parts/tools unavailable</option>
                <option value="Customer unreachable">Customer unreachable</option>
                <option value="Other emergency">Other personal emergency</option>
              </select>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setCancelModalBooking(null)}
                className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() =>
                  handleStatusTransition(cancelModalBooking, 'cancelled', cancelReason)
                }
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl cursor-pointer shadow-xs"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Live Chat Modal with MessageInterface */}
      <ChatModal
        isOpen={Boolean(activeChatBooking)}
        onClose={() => setActiveChatBooking(null)}
        booking={activeChatBooking}
      />

      {/* End Work Confirmation & Bill Generator Modal */}
      {endWorkModalBooking && (
        <EndWorkModal
          booking={endWorkModalBooking}
          serviceManId={proId}
          isOpen={!!endWorkModalBooking}
          onClose={() => setEndWorkModalBooking(null)}
          onCompleted={(finalBill) => {
            setViewBillBooking({ ...endWorkModalBooking, finalBill, status: 'completed' });
            setEndWorkModalBooking(null);
          }}
        />
      )}

      {/* HARDINKAAM Service Bill Modal */}
      {viewBillBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="max-w-2xl w-full my-8 relative">
            <button
              onClick={() => setViewBillBooking(null)}
              className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg hover:bg-slate-800"
              title="Close Bill"
            >
              <X className="w-4 h-4" />
            </button>
            <HardinkaamServiceBill
              bill={viewBillBooking.finalBill}
              booking={viewBillBooking}
            />
          </div>
        </div>
      )}

      {/* HARDINKAAM Incoming Booking Alarm Screen Overlay */}
      {activeAlarmBooking && (
        <IncomingBookingScreen
          booking={activeAlarmBooking}
          offer={activeOffer || undefined}
          countdownSeconds={adminAlarmConfig.countdownDurationSeconds || 60}
          onAccept={handleAcceptAlarmBooking}
          onReject={handleRejectAlarmBooking}
          onExpire={handleExpireAlarmBooking}
          isSubmitting={isSubmittingAlarmAction}
        />
      )}

      {/* HARDINKAAM ServiceMan Alarm & Sound Settings Modal */}
      <ServicemanAlarmSettingsModal
        isOpen={isAlarmSettingsOpen}
        onClose={() => {
          setIsAlarmSettingsOpen(false);
          setAlarmSettings(servicemanAlarmSettingsService.getPersonalSettings());
        }}
        onSimulateTestBooking={handleSimulateTestBooking}
      />
    </div>
  );
};
