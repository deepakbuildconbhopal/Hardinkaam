import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  X,
  QrCode,
  Copy,
  Check,
  Download,
  ShieldCheck,
  Smartphone,
  CreditCard,
  Banknote,
  Send,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { doc, updateDoc, setDoc, collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Booking, PaymentMethod, PaymentStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface Props {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (bookingId: string) => void;
}

const UPI_ID_PRESETS = [
  { label: 'HARDINKAAM Official (OKAXIS)', upiId: 'hardinkaam.payments@okaxis' },
  { label: 'Deepak Buildcon Bhopal (OKBIZ)', upiId: 'deepakbuildconbhopal@okbizaxis' },
  { label: 'SBI Merchant UPI (SBIPAY)', upiId: '6267546945.sbi@ybl' },
  { label: 'HDFC Business UPI', upiId: 'hardinkaam.hdfc@paytm' },
];

export const AdminBookingUpiPaymentModal: React.FC<Props> = ({
  booking,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentUser, userProfile } = useAuth();
  const [selectedUpiId, setSelectedUpiId] = useState<string>('hardinkaam.payments@okaxis');
  const [customUpiId, setCustomUpiId] = useState<string>('');
  const [payeeName, setPayeeName] = useState<string>('HARDINKAAM - Deepak Buildcon');
  const [payableAmount, setPayableAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMethod>('upi');
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [successState, setSuccessState] = useState<boolean>(false);

  useEffect(() => {
    if (booking) {
      const amount = booking.finalBill?.finalAmount ?? booking.finalAmount ?? booking.amount ?? 0;
      setPayableAmount(amount);
      setSuccessState(booking.paymentStatus === 'paid');
    }
  }, [booking]);

  const activeUpiId = (customUpiId.trim() || selectedUpiId).trim();
  const transactionRef = booking ? `HDK_${booking.id}_${Date.now()}` : 'HDK_PAY_001';
  const transactionNote = booking ? `Payment for Booking #${booking.id} - ${booking.serviceName}` : 'HARDINKAAM Service Payment';

  // Standard NPCI UPI URI
  const upiUri = `upi://pay?pa=${encodeURIComponent(activeUpiId)}&pn=${encodeURIComponent(payeeName)}&am=${Number(payableAmount).toFixed(2)}&tn=${encodeURIComponent(transactionNote)}&cu=INR&tr=${transactionRef}`;

  // Generate QR Code data URL using qrcode library
  useEffect(() => {
    if (!isOpen || !booking) return;
    QRCode.toDataURL(upiUri, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => {
        setQrCodeDataUrl(url);
      })
      .catch((err) => {
        console.warn('QR Code generation error:', err);
      });
  }, [isOpen, booking, upiUri, payableAmount, activeUpiId]);

  if (!isOpen || !booking) return null;

  const handleCopyUpiId = () => {
    navigator.clipboard.writeText(activeUpiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handleCopyUpiLink = () => {
    navigator.clipboard.writeText(upiUri);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleDownloadQr = () => {
    if (!qrCodeDataUrl) return;
    const link = document.createElement('a');
    link.href = qrCodeDataUrl;
    link.download = `HARDINKAAM_UPI_QR_Booking_${booking.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmPayment = async () => {
    if (payableAmount <= 0) {
      alert('Please enter a valid payable amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const nowIso = new Date().toISOString();
      const adminName = userProfile?.name || currentUser?.email || 'Admin Deepak Buildcon';
      const txnId = utrNumber.trim() || transactionRef;

      // 1. Update Booking payment status
      const bookingRef = doc(db, 'bookings', booking.id);
      const updatePayload: any = {
        paymentStatus: 'paid' as PaymentStatus,
        paymentMethod: paymentMode,
        paidAt: nowIso,
        paymentTransactionId: txnId,
        paymentConfirmedBy: adminName,
        updatedAt: nowIso,
      };

      if (booking.finalBill) {
        updatePayload.finalBill = {
          ...booking.finalBill,
          paymentStatus: 'paid',
          paymentMethod: paymentMode,
          paidAt: nowIso,
          paymentTransactionId: txnId,
          finalAmount: payableAmount,
        };
      }

      await updateDoc(bookingRef, updatePayload);

      // 2. Persist Transaction in transactions collection
      try {
        await setDoc(
          doc(db, 'transactions', txnId),
          {
            id: txnId,
            transactionId: txnId,
            bookingId: booking.id,
            customerId: booking.customerId,
            serviceManId: booking.serviceManId || '',
            partnerId: booking.partnerId || '',
            districtId: booking.districtId || '',
            amount: payableAmount,
            currency: 'INR',
            paymentMethod: paymentMode,
            type: paymentMode === 'cash' ? 'CASH_TRANSACTION' : 'UPI_TRANSACTION',
            status: 'APPROVED',
            approvedAt: nowIso,
            approvedBy: adminName,
            createdAt: nowIso,
            updatedAt: nowIso,
          },
          { merge: true }
        );
      } catch (txnErr) {
        console.warn('Transaction record save notice:', txnErr);
      }

      // 3. Persist Commission Ledgers in ledgers collection if not already created
      try {
        const ledgersRef = collection(db, 'ledgers');
        const existingLedgerSnap = await getDocs(
          query(ledgersRef, where('bookingId', '==', booking.id))
        );
        if (existingLedgerSnap.empty) {
          const companyLedgerId = `ledger_company_${booking.id}`;
          const companyShare = Math.round(payableAmount * 0.15);
          await setDoc(doc(db, 'ledgers', companyLedgerId), {
            id: companyLedgerId,
            bookingId: booking.id,
            ledgerOwnerId: 'admin_deepak_root',
            ledgerOwnerRole: 'ADMIN',
            commissionType: 'company_margin',
            grossBookingAmount: payableAmount,
            commissionPercent: 15,
            amount: companyShare,
            isPayableToHardinkaam: false,
            status: 'cleared',
            collectionStatus: 'paid',
            createdAt: nowIso,
            notes: `HARDINKAAM Company Share from Booking #${booking.id}`,
          });

          if (booking.serviceManId) {
            const proLedgerId = `ledger_serviceman_${booking.id}`;
            const proShare = Math.round(payableAmount * 0.70);
            await setDoc(doc(db, 'ledgers', proLedgerId), {
              id: proLedgerId,
              bookingId: booking.id,
              ledgerOwnerId: booking.serviceManId,
              ledgerOwnerRole: 'SERVICE_PRO',
              commissionType: 'serviceman_share',
              grossBookingAmount: payableAmount,
              commissionPercent: 70,
              amount: proShare,
              isPayableToHardinkaam: false,
              status: 'cleared',
              collectionStatus: 'paid',
              createdAt: nowIso,
              notes: `Technician Payout Earnings from Booking #${booking.id}`,
            });
          }
        }
      } catch (ledgerErr) {
        console.warn('Commission ledger persistence notice:', ledgerErr);
      }

      // 4. Create Notification for Customer
      try {
        await addDoc(collection(db, 'notifications'), {
          userId: booking.customerId,
          title: `Payment Received (₹${payableAmount}) ✓`,
          message: `Your payment of ₹${payableAmount} for booking #${booking.id} (${booking.serviceName}) has been successfully verified and confirmed by ADMIN.`,
          type: 'success',
          bookingId: booking.id,
          read: false,
          createdAt: nowIso,
        });
      } catch (e) {
        console.warn('Customer notification dispatch notice:', e);
      }

      setSuccessState(true);
      setIsSubmitting(false);
      onSuccess(booking.id);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Payment confirmation error:', err);
      alert('Failed to update payment status: ' + (err.message || 'Unknown error'));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 border border-stone-200 relative my-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center hover:bg-stone-200 transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-stone-900 tracking-tight">
              Dynamic UPI QR & Payment Verification
            </h2>
            <p className="text-xs text-stone-500">
              Booking <span className="font-mono font-bold text-stone-800">#{booking.id}</span> • {booking.serviceName}
            </p>
          </div>
        </div>

        {successState ? (
          <div className="py-10 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border-2 border-emerald-300 animate-bounce">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <div>
              <h3 className="text-base font-black text-emerald-900">Payment Successfully Confirmed!</h3>
              <p className="text-xs text-stone-500 mt-1">
                Booking #{booking.id} is marked as <strong>PAID</strong> (₹{payableAmount}).
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Booking Summary Box */}
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 text-xs space-y-2">
              <div className="flex justify-between items-center text-stone-600">
                <span>Customer Name:</span>
                <strong className="text-stone-900">{booking.customerName} ({booking.customerPhone})</strong>
              </div>
              <div className="flex justify-between items-center text-stone-600">
                <span>Service Scheduled:</span>
                <strong className="text-stone-900">{booking.scheduledDate} at {booking.scheduledTime}</strong>
              </div>
              <div className="flex justify-between items-center text-stone-600 pt-1 border-t border-stone-200">
                <span className="font-bold text-stone-900">Total Payable Amount:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-stone-400">₹</span>
                  <input
                    type="number"
                    value={payableAmount}
                    onChange={(e) => setPayableAmount(Number(e.target.value))}
                    className="w-24 px-2 py-1 text-sm font-black text-stone-900 bg-white border border-stone-300 rounded-lg text-right focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* UPI Merchant ID Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-stone-600 block">Select Merchant UPI ID (VPA):</label>
              <select
                value={selectedUpiId}
                onChange={(e) => setSelectedUpiId(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl bg-white border border-stone-200 font-medium text-stone-800"
              >
                {UPI_ID_PRESETS.map((p) => (
                  <option key={p.upiId} value={p.upiId}>
                    {p.label} ({p.upiId})
                  </option>
                ))}
              </select>
            </div>

            {/* QR Code Canvas Card */}
            <div className="bg-gradient-to-b from-stone-900 to-stone-950 p-5 rounded-3xl text-white text-center shadow-lg border border-stone-800 flex flex-col items-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black tracking-wider uppercase mb-3 border border-emerald-500/30">
                <span>HARDINKAAM SECURE UPI GATEWAY</span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl shadow-xl inline-block">
                {qrCodeDataUrl ? (
                  <img src={qrCodeDataUrl} alt="UPI Payment QR Code" className="w-48 h-48 sm:w-56 sm:h-56 object-contain" />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-stone-400 text-xs">Generating QR...</div>
                )}
              </div>

              <div className="mt-4 space-y-1">
                <div className="text-xl font-black text-amber-300 tracking-tight">₹{payableAmount.toLocaleString('en-IN')}</div>
                <div className="text-[11px] text-stone-400">Scan using GPay, PhonePe, Paytm, BHIM, or any UPI App</div>
              </div>

              <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-stone-800 w-full flex-wrap">
                <button
                  type="button"
                  onClick={handleCopyUpiId}
                  className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUpi ? 'Copied UPI ID!' : 'Copy UPI ID'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 text-stone-950" />
                  <span>Download QR PNG</span>
                </button>
              </div>
            </div>

            {/* Payment Mode & UTR Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-600 block">Payment Mode:</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as PaymentMethod)}
                  className="w-full p-2.5 text-xs rounded-xl bg-white border border-stone-200 font-medium text-stone-800"
                >
                  <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="cash">Cash / Handover (COD Paid)</option>
                  <option value="card">Card Swipe (POS)</option>
                  <option value="razorpay">Razorpay Online Gateway</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-600 block">Transaction UTR / Ref ID:</label>
                <input
                  type="text"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  placeholder="e.g. 429182910294"
                  className="w-full p-2.5 text-xs rounded-xl bg-white border border-stone-200 font-mono"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-2xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all cursor-pointer shadow-md shadow-emerald-900/20 flex items-center gap-2 disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-200" />
                <span>{isSubmitting ? 'Verifying & Saving...' : `Confirm Paid (₹${payableAmount}) ✓`}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
