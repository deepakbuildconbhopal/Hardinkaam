import React, { useState } from 'react';
import {
  X,
  Briefcase,
  ShieldCheck,
  Building2,
  MapPin,
  Users,
  CreditCard,
  FileText,
  Mail,
  Lock,
  Phone,
  User,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { processRazorpayPayment } from '../../services/razorpayService';
import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase/config';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const BusinessPartnerRegistrationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { signUpWithEmail } = useAuth();
  const { addToast } = useToast();

  const [step, setStep] = useState<'details' | 'payment_review' | 'processing'>('details');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('Franchise Partner');
  const [gstinOrPan, setGstinOrPan] = useState('');
  const [assignedZone, setAssignedZone] = useState('Bhopal Central & MP Nagar');
  const [fleetSize, setFleetSize] = useState('5-10 Technicians');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const PARTNER_REGISTRATION_FEE = 1021; // Non-refundable standard partner onboarding fee in INR

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!businessName.trim()) {
      setError('कृपया अपनी कंपनी / फर्म का नाम दर्ज करें (Business Name is required)');
      return;
    }
    if (!contactName.trim()) {
      setError('कृपया अधिकृत संपर्क व्यक्ति का नाम दर्ज करें (Authorized Contact Person required)');
      return;
    }
    if (!phone.trim() || phone.trim().length < 10) {
      setError('कृपया 10-अंकों का वैध मोबाइल नंबर दर्ज करें (Valid 10-digit phone required)');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('कृपया वैध आधिकारिक ईमेल दर्ज करें (Valid official email required)');
      return;
    }
    if (password.length < 6) {
      setError('पासवर्ड कम से कम 6 अक्षरों का होना चाहिए (Password min 6 characters)');
      return;
    }
    if (!agreedToTerms) {
      setError('कृपया नियमों और शर्तों से सहमति स्वीकार करें (Must accept partner terms)');
      return;
    }

    setStep('payment_review');
  };

  const handleInitiateRazorpayPayment = async () => {
    setLoading(true);
    setError(null);
    setStep('processing');

    try {
      await processRazorpayPayment({
        amount: PARTNER_REGISTRATION_FEE,
        name: 'HARDINKAAM Private Limited',
        description: 'Business Partner Onboarding & Franchise License Fee (Non-Refundable)',
        prefill: {
          name: contactName,
          email: email,
          contact: phone,
        },
        notes: {
          role: 'business_partner',
          purpose: 'business_partner_registration',
          business_name: businessName,
          gstin: gstinOrPan || 'N/A',
          zone: assignedZone,
          fee_amount: String(PARTNER_REGISTRATION_FEE),
        },
        onSuccess: async (payResp) => {
          try {
            const partnerLicenseNo = `HDK-BP-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
            const nowIso = new Date().toISOString();

            // 1. Create User Authentication and Profile in Firestore
            const userCred = await signUpWithEmail(contactName, email, password, 'business_partner', phone, {
              paymentId: payResp.payment_id,
              orderId: payResp.order_id,
              amount: PARTNER_REGISTRATION_FEE,
              businessName,
              businessType,
              gstin: gstinOrPan || 'N/A',
              zone: assignedZone,
              fleetSize,
              partnerLicenseNumber: partnerLicenseNo,
              registrationFeePaid: true,
              registrationPaidAt: nowIso,
            });

            // 2. Create entry in business_partners collection
            const partnerDocId = `partner_${userCred?.user?.uid || Math.random().toString(36).substring(2, 8)}`;
            await setDoc(doc(db, 'business_partners', partnerDocId), {
              id: partnerDocId,
              userId: userCred?.user?.uid || 'usr_' + partnerDocId,
              businessName,
              businessType,
              contactPerson: contactName,
              email,
              phone,
              gstin: gstinOrPan || 'N/A',
              zone: assignedZone,
              fleetSize,
              partnerLicenseNumber: partnerLicenseNo,
              onboardingPaymentId: payResp.payment_id,
              onboardingOrderId: payResp.order_id,
              registrationFee: PARTNER_REGISTRATION_FEE,
              kycStatus: 'verified',
              status: 'active',
              totalFleetTechnicians: 0,
              totalRevenueGenerated: 0,
              createdAt: nowIso,
              updatedAt: nowIso,
            });

            // 3. Create initial partner wallet
            const walletId = `wallet_${userCred?.user?.uid || partnerDocId}`;
            await setDoc(doc(db, 'wallets', walletId), {
              userId: userCred?.user?.uid || partnerDocId,
              balance: 0,
              pendingBalance: 0,
              totalEarned: 0,
              currency: 'INR',
              updatedAt: nowIso,
            });

            // 4. Record Transaction
            await addDoc(collection(db, 'transactions'), {
              type: 'partner_registration_fee',
              amount: PARTNER_REGISTRATION_FEE,
              paymentId: payResp.payment_id,
              orderId: payResp.order_id,
              status: 'completed',
              userId: userCred?.user?.uid || partnerDocId,
              userRole: 'business_partner',
              description: `Business Partner Onboarding License Fee for ${businessName}`,
              createdAt: nowIso,
            });

            addToast({
              title: 'पंजीकरण व भुगतान सफल! / Partner Onboarded!',
              message: `Welcome to HARDINKAAM Partner Network. License: ${partnerLicenseNo}`,
              type: 'success',
            });

            setLoading(false);
            if (onSuccess) onSuccess();
            onClose();
          } catch (signupErr: any) {
            console.error('Partner profile creation error:', signupErr);
            setError(signupErr.message || 'Profile setup failed after payment.');
            setLoading(false);
            setStep('payment_review');
          }
        },
        onFailure: (payErr) => {
          console.error('Razorpay payment failed:', payErr);
          setError(payErr.description || payErr.reason || 'Razorpay checkout could not be completed.');
          setLoading(false);
          setStep('payment_review');
        },
        onDismiss: () => {
          setLoading(false);
          setStep('payment_review');
        },
      });
    } catch (err: any) {
      console.error('Payment launch error:', err);
      setError(err.message || 'Unable to open Razorpay payment gateway');
      setLoading(false);
      setStep('payment_review');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full my-8 p-6 sm:p-8 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200 space-y-6">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-900/20">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-stone-900">
                  Business Partner Registration
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold">
                  Franchise Hub
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                HARDINKAAM भोपाल बिजनेस पार्टनर व फ्रेंचाइजी नेटवर्क
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:bg-stone-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: FORM DETAILS */}
        {step === 'details' && (
          <form onSubmit={handleProceedToPayment} className="space-y-4">
            <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">एकमुश्त नॉन-रिफंडेबल पार्टनर शुल्क / One-Time Prerequisite Fee:</strong>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  बिजनेस पार्टनर प्रोफाइल और फ्रेंचाइजी लाइसेंस निर्माण हेतु <strong>₹{PARTNER_REGISTRATION_FEE}</strong> का Razorpay द्वारा ऑनलाइन भुगतान अनिवार्य है।
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Business Name */}
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-purple-600" /> Company / Firm Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bhopal ElectroMech Solutions Pvt Ltd"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:outline-hidden focus:border-purple-600 bg-stone-50"
                />
              </div>

              {/* Business Type */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">Partner Category</label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold focus:outline-hidden focus:border-purple-600 bg-stone-50"
                >
                  <option value="Franchise Partner">City Franchise Partner</option>
                  <option value="Territory Contractor">Territory Service Contractor</option>
                  <option value="Fleet Agency">Technician Fleet Agency</option>
                  <option value="Material & Spares Vendor">Material & Spares Vendor</option>
                </select>
              </div>

              {/* Assigned Zone in Bhopal */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-purple-600" /> Operating Zone (Bhopal)
                </label>
                <select
                  value={assignedZone}
                  onChange={(e) => setAssignedZone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold focus:outline-hidden focus:border-purple-600 bg-stone-50"
                >
                  <option value="Bhopal Central & MP Nagar">Bhopal Central &amp; MP Nagar</option>
                  <option value="Kolar Road & Chunabhatti">Kolar Road &amp; Chunabhatti</option>
                  <option value="Arera Colony & Shahpura">Arera Colony &amp; Shahpura</option>
                  <option value="Hoshangabad Road & Bagsewaniya">Hoshangabad Road &amp; Bagsewaniya</option>
                  <option value="Bairagarh & Airport Road">Bairagarh &amp; Airport Road</option>
                  <option value="Govindpura & BHEL Industrial">Govindpura &amp; BHEL Industrial</option>
                  <option value="Entire Bhopal Territory">Entire Bhopal District</option>
                </select>
              </div>

              {/* GSTIN / PAN */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-purple-600" /> GSTIN or PAN No. (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 23AAAAA0000A1Z5"
                  value={gstinOrPan}
                  onChange={(e) => setGstinOrPan(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:outline-hidden focus:border-purple-600 bg-stone-50 uppercase"
                />
              </div>

              {/* Fleet Size */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-purple-600" /> Technician Fleet Size
                </label>
                <select
                  value={fleetSize}
                  onChange={(e) => setFleetSize(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold focus:outline-hidden focus:border-purple-600 bg-stone-50"
                >
                  <option value="1-5 Technicians">1-5 Active Technicians</option>
                  <option value="5-10 Technicians">5-10 Active Technicians</option>
                  <option value="10-25 Technicians">10-25 Active Technicians</option>
                  <option value="25+ Technicians">25+ Large Fleet</option>
                </select>
              </div>

              {/* Contact Person Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-purple-600" /> Authorized Contact Person *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deepak Sharma"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:outline-hidden focus:border-purple-600 bg-stone-50"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-purple-600" /> Official Phone / Mobile *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9826012345"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:outline-hidden focus:border-purple-600 bg-stone-50"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-purple-600" /> Official Login Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="partner@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:outline-hidden focus:border-purple-600 bg-stone-50"
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-purple-600" /> Account Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:outline-hidden focus:border-purple-600 bg-stone-50"
                />
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 text-xs text-stone-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                />
                <span>
                  मैं पुष्टि करता हूँ कि विवरण सही हैं और मैं <strong>₹{PARTNER_REGISTRATION_FEE}</strong> के गैर-वापसी योग्य (Non-Refundable) फ्रेंचाइजी लाइसेंस शुल्क से सहमत हूँ।
                </span>
              </label>
            </div>

            {/* Next Button */}
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-black text-xs shadow-lg shadow-purple-950/20 flex items-center justify-center gap-2 cursor-pointer transition transform active:scale-98"
            >
              <span>Continue to Payment (₹{PARTNER_REGISTRATION_FEE})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* STEP 2: PAYMENT REVIEW & CHECKOUT TRIGGER */}
        {(step === 'payment_review' || step === 'processing') && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Payment Summary Box */}
            <div className="bg-stone-900 text-white rounded-2xl p-5 border border-purple-500/30 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                    Registration Prerequisite
                  </span>
                  <h3 className="font-bold text-sm text-purple-300">{businessName}</h3>
                </div>
                <div className="text-right">
                  <span className="text-xs text-stone-400 block">Total Due</span>
                  <span className="text-xl font-black text-amber-400">₹{PARTNER_REGISTRATION_FEE}</span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-stone-300">
                <div className="flex justify-between">
                  <span>Partner Category:</span>
                  <strong className="text-white">{businessType}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Assigned Operating Zone:</span>
                  <strong className="text-white">{assignedZone}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Authorized Representative:</span>
                  <strong className="text-white">{contactName} ({phone})</strong>
                </div>
                <div className="flex justify-between">
                  <span>Gateway:</span>
                  <strong className="text-emerald-400">Razorpay Standard Checkout (UPI, Cards, NetBanking)</strong>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-purple-950/50 border border-purple-800/40 text-[11px] text-purple-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>256-Bit SSL Encrypted &amp; Authorized by HARDINKAAM Private Limited</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep('details')}
                disabled={loading}
                className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-700 font-bold text-xs hover:bg-stone-100 transition cursor-pointer"
              >
                Back / Edit Details
              </button>

              <button
                type="button"
                onClick={handleInitiateRazorpayPayment}
                disabled={loading}
                className="flex-2 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-xl shadow-emerald-950/20 flex items-center justify-center gap-2 cursor-pointer transition transform active:scale-98 disabled:opacity-60"
              >
                <CreditCard className="w-4 h-4" />
                <span>{loading ? 'Opening Razorpay...' : `Pay ₹${PARTNER_REGISTRATION_FEE} & Complete Registration`}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
