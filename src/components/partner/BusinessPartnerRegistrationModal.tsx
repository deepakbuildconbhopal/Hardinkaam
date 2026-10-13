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
  ExternalLink,
  Banknote,
  PhoneCall,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { razorpayClientService } from '../../services/razorpayClientService';
import { MembershipSuccessModal } from '../common/MembershipSuccessModal';
import { PhotoCaptureWidget } from '../common/PhotoCaptureWidget';
import { MemberNotificationResult } from '../../services/memberNotificationService';

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
  const [membershipResult, setMembershipResult] = useState<MemberNotificationResult | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('Franchise Partner');
  const [gstinOrPan, setGstinOrPan] = useState('');
  const [assignedZone, setAssignedZone] = useState('Bhopal Central & MP Nagar');
  const [fleetSize, setFleetSize] = useState('5-10 Technicians');
  const [contactName, setContactName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [noCriminalRecordOath, setNoCriminalRecordOath] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'cash'>('cash');
  const [cashApprovalPendingResult, setCashApprovalPendingResult] = useState<{
    name: string;
    phone: string;
    businessName: string;
    amount: number;
    memberCode?: string;
  } | null>(null);

  if (!isOpen) return null;

  const PARTNER_REGISTRATION_FEE = 1021; // Non-refundable standard partner onboarding fee in INR

  const handleCashRegistration = async () => {
    setLoading(true);
    setError(null);
    try {
      const partnerLicenseNo = `HDK-BP-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const nowIso = new Date().toISOString();

      const userCred = await signUpWithEmail(contactName, email, password, 'business_partner', phone, {
        isCash: true,
        paymentMethod: 'cash',
        amount: PARTNER_REGISTRATION_FEE,
        avatar: photo,
        fatherName,
        motherName,
        noCriminalRecordOath: true,
        businessName,
        businessType,
        gstin: gstinOrPan || 'N/A',
        zone: assignedZone,
        fleetSize,
        partnerLicenseNumber: partnerLicenseNo,
      });

      const partnerDocId = `partner_${userCred?.user?.uid || Math.random().toString(36).substring(2, 8)}`;
      await setDoc(doc(db, 'business_partners', partnerDocId), {
        id: partnerDocId,
        userId: userCred?.user?.uid || 'usr_' + partnerDocId,
        businessName,
        businessType,
        contactPerson: contactName,
        fatherName: fatherName.trim(),
        motherName: motherName.trim(),
        noCriminalRecordOath: true,
        email,
        phone,
        gstin: gstinOrPan || 'N/A',
        zone: assignedZone,
        fleetSize,
        partnerLicenseNumber: partnerLicenseNo,
        registrationFee: PARTNER_REGISTRATION_FEE,
        paymentMethod: 'cash',
        kycStatus: 'pending',
        status: 'pending_approval',
        totalFleetTechnicians: 0,
        totalRevenueGenerated: 0,
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      setLoading(false);
      setCashApprovalPendingResult({
        name: contactName,
        phone,
        businessName,
        amount: PARTNER_REGISTRATION_FEE,
        memberCode: userCred?.profile?.memberCode,
      });
    } catch (cashErr: any) {
      console.error('Cash partner registration error:', cashErr);
      setError(cashErr.message || 'नकद रजिस्ट्रेशन अनुरोध भेजने में त्रुटि आई।');
      setLoading(false);
    }
  };

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
    if (!fatherName.trim()) {
      setError('कृपया पिता का नाम दर्ज करें (Father\'s Name is required)');
      return;
    }
    if (!motherName.trim()) {
      setError('कृपया माता का नाम दर्ज करें (Mother\'s Name is required)');
      return;
    }
    if (!noCriminalRecordOath) {
      setError('रजिस्ट्रेशन के लिए आपराधिक रिकॉर्ड न होने की शपथ (I take an oath that I don\'t have any criminal record) पर टिक करना अनिवार्य है।');
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
    setError(null);
    setLoading(true);

    try {
      const partnerLicenseNo = `HDK-BP-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const nowIso = new Date().toISOString();
      const userCred = await signUpWithEmail(email, password, contactName, phone, 'business_partner', {
        businessName,
        businessType,
        zone: assignedZone,
        gstin: gstinOrPan || 'N/A',
        fleetSize,
        partnerLicenseNumber: partnerLicenseNo,
        amount: PARTNER_REGISTRATION_FEE,
        avatar: photo,
        fatherName,
        motherName,
        noCriminalRecordOath: true,
        isCash: false,
      });

      const uid = userCred?.user?.uid;
      if (!uid) {
        throw new Error('Failed to create partner user account.');
      }

      const partnerDocId = `partner_${uid}`;
      await setDoc(doc(db, 'business_partners', partnerDocId), {
        id: partnerDocId,
        userId: uid,
        businessName,
        businessType,
        contactPerson: contactName,
        fatherName: fatherName.trim(),
        motherName: motherName.trim(),
        noCriminalRecordOath: true,
        email,
        phone,
        gstin: gstinOrPan || 'N/A',
        zone: assignedZone,
        fleetSize,
        partnerLicenseNumber: partnerLicenseNo,
        registrationFee: PARTNER_REGISTRATION_FEE,
        paymentMethod: 'razorpay',
        paymentStatus: 'pending',
        kycStatus: 'pending',
        status: 'pending_approval',
        totalFleetTechnicians: 0,
        totalRevenueGenerated: 0,
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      const idToken = await userCred.user.getIdToken(true);
      await razorpayClientService.openCheckout({
        purpose: 'partner_registration',
        referenceId: partnerDocId,
        idToken,
        name: 'HARDINKAAM Partner License',
        description: `Partner Registration for ${businessName}`,
        prefill: {
          name: contactName,
          email,
          contact: phone,
        },
        onSuccess: async (verifyResult) => {
          await setDoc(doc(db, 'business_partners', partnerDocId), {
            paymentStatus: 'paid',
            kycStatus: 'approved',
            status: 'active',
            razorpayOrderId: verifyResult.orderId,
            razorpayPaymentId: verifyResult.paymentId,
            razorpaySignature: verifyResult.signature,
            updatedAt: new Date().toISOString(),
          }, { merge: true });

          setLoading(false);
          setCashApprovalPendingResult({
            name: contactName,
            phone,
            businessName,
            amount: PARTNER_REGISTRATION_FEE,
            memberCode: userCred?.profile?.memberCode,
          });
        },
        onFailure: (err) => {
          setLoading(false);
          setError(err.message || 'Razorpay checkout failed or was cancelled.');
        }
      });
    } catch (payErr: any) {
      console.error('Razorpay partner registration error:', payErr);
      setError(payErr.message || 'रजिस्ट्रेशन या पेमेंट शुरू करने में त्रुटि आई।');
      setLoading(false);
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
                  <User className="w-3.5 h-3.5 text-purple-600" /> Authorized Contact Person / अधिकृत व्यक्ति का नाम *
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

              {/* Father's Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-purple-600" /> पिता का नाम (Father's Name) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="पिता का पूरा नाम"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:outline-hidden focus:border-purple-600 bg-stone-50"
                />
              </div>

              {/* Mother's Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-purple-600" /> माता का नाम (Mother's Name) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="माता का पूरा नाम"
                  value={motherName}
                  onChange={(e) => setMotherName(e.target.value)}
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
                  placeholder="e.g. 6267546945"
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

            {/* Photo Capture for Partner ID Card */}
            <div className="pt-1">
              <PhotoCaptureWidget
                photo={photo}
                onPhotoChange={setPhoto}
                label="अधिकृत पार्टनर ID फोटो (Selfie / ID Photo)"
              />
            </div>

            {/* Criminal Record Oath Checkbox */}
            <div className="pt-2">
              <div className="p-3.5 rounded-2xl bg-amber-50/90 border-2 border-amber-300 text-stone-900 shadow-xs">
                <label className="flex items-start gap-2.5 text-xs text-stone-900 font-semibold cursor-pointer select-none">
                  <input
                    id="partner-criminal-record-oath-checkbox"
                    type="checkbox"
                    required
                    checked={noCriminalRecordOath}
                    onChange={(e) => setNoCriminalRecordOath(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-stone-300 cursor-pointer accent-purple-600 shrink-0"
                  />
                  <span className="leading-snug">
                    <strong className="text-stone-900 font-black">शपथ पत्र (Mandatory Oath): </strong>
                    "I take an oath that I don't have any criminal record" / मैं शपथ लेता/लेती हूँ कि मेरा कोई आपराधिक रिकॉर्ड (Criminal Record) नहीं है।
                    <span className="text-red-600 font-bold ml-1">* (अनिवार्य)</span>
                  </span>
                </label>
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="pt-1">
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
            {/* Payment Option Selector */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                भुगतान का माध्यम चुनें (Payment Option):
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('razorpay')}
                  className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    paymentMethod === 'razorpay'
                      ? 'bg-purple-50 border-purple-500 text-purple-950 ring-2 ring-purple-500/20 shadow-xs'
                      : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <CreditCard className="w-4 h-4 text-purple-600" />
                    <span>ऑनलाइन पेमेंट</span>
                  </div>
                  <span className="text-[10px] text-stone-500 leading-tight">
                    Razorpay / UPI / कार्ड (तुरंत एक्टिवेशन)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    paymentMethod === 'cash'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    <span>नकद भुगतान (Cash)</span>
                  </div>
                  <span className="text-[10px] text-stone-500 leading-tight">
                    एडमिन अप्रूवल आवश्यक (Pay to Admin)
                  </span>
                </button>
              </div>

              {paymentMethod === 'cash' && (
                <div className="mt-2 p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-200 text-[11px] text-emerald-900 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>नकद भुगतान सूचना:</strong> आपका पार्टनर रजिस्ट्रेशन अनुरोध सुपर एडमिन को भेजा जाएगा। एडमिन द्वारा ₹{PARTNER_REGISTRATION_FEE} कैश प्राप्त कर अप्रूव करते ही खाता सक्रिय हो जाएगा।
                  </span>
                </div>
              )}
            </div>

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
                  <span>Payment Mode:</span>
                  <strong className={paymentMethod === 'cash' ? 'text-emerald-400' : 'text-purple-400'}>
                    {paymentMethod === 'cash' ? '💵 नकद भुगतान (Cash to Admin - Verification Pending)' : '💳 Razorpay Standard Online Checkout'}
                  </strong>
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

              {paymentMethod === 'cash' ? (
                <button
                  type="button"
                  onClick={handleCashRegistration}
                  disabled={loading}
                  className="flex-2 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-xl shadow-emerald-950/20 flex items-center justify-center gap-2 cursor-pointer transition transform active:scale-98 disabled:opacity-60"
                >
                  <Banknote className="w-4 h-4" />
                  <span>{loading ? 'अनुरोध भेजा जा रहा है...' : `नकद भुगतान अनुरोध भेजें (₹${PARTNER_REGISTRATION_FEE})`}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleInitiateRazorpayPayment}
                  disabled={loading}
                  className="flex-2 py-3.5 rounded-2xl bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-black text-xs shadow-xl shadow-purple-950/20 flex items-center justify-center gap-2 cursor-pointer transition transform active:scale-98 disabled:opacity-60"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{loading ? 'Opening Razorpay...' : `Pay ₹${PARTNER_REGISTRATION_FEE} & Complete Registration`}</span>
                </button>
              )}
            </div>

          </div>
        )}
      </div>

      {/* Cash Registration Pending Admin Approval Modal */}
      {cashApprovalPendingResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center shadow-2xl border border-stone-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-black uppercase tracking-wider inline-block mb-2">
                ⏳ पेंडिंग एडमिन अप्रूवल (Pending Approval)
              </span>
              <h3 className="text-lg font-black text-stone-900">
                बिजनेस पार्टनर नकद अनुरोध दर्ज!
              </h3>
              <p className="text-xs text-stone-600 mt-1 max-w-sm mx-auto">
                नमस्ते <strong>{cashApprovalPendingResult.name}</strong> ({cashApprovalPendingResult.businessName}), आपका पार्टनर रजिस्ट्रेशन अनुरोध प्राप्त हो गया है। आपने <strong>₹{cashApprovalPendingResult.amount} नकद (Cash) भुगतान</strong> चुना है।
              </p>
            </div>

            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 text-left space-y-2 text-xs">
              <div className="flex justify-between items-center text-stone-600">
                <span>फर्म / कंपनी:</span>
                <span className="font-bold text-stone-900">{cashApprovalPendingResult.businessName}</span>
              </div>
              <div className="flex justify-between items-center text-stone-600">
                <span>भुगतान मोड:</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  💵 नकद भुगतान (Cash to Admin)
                </span>
              </div>
              <div className="flex justify-between items-center text-stone-600">
                <span>लाइसेंस शुल्क:</span>
                <span className="font-black text-stone-900 text-sm">
                  ₹{cashApprovalPendingResult.amount}
                </span>
              </div>
              {cashApprovalPendingResult.memberCode && (
                <div className="flex justify-between items-center text-stone-600">
                  <span>रेफरेंस कोड:</span>
                  <span className="font-mono font-bold text-purple-700">
                    {cashApprovalPendingResult.memberCode}
                  </span>
                </div>
              )}
            </div>

            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-left text-[11px] text-purple-900 space-y-1">
              <p className="font-bold">ℹ️ अगली प्रक्रिया:</p>
              <p className="text-purple-800 leading-relaxed">
                सुपर एडमिन (Deepak Buildcon) को आपका पार्टनर अनुरोध भेज दिया गया है। एडमिन द्वारा ₹{cashApprovalPendingResult.amount} नकद प्राप्त कर अप्रूव करते ही आपका पार्टनर पोर्टल सक्रिय हो जाएगा।
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={`https://wa.me/916267546945?text=${encodeURIComponent(
                  `नमस्ते एडमिन सर! मैंने HardinKaam पर Business Partner (${cashApprovalPendingResult.businessName}) के रूप में ₹${cashApprovalPendingResult.amount} नकद (Cash) रजिस्ट्रेशन अनुरोध भेजा है।\nनाम: ${cashApprovalPendingResult.name}\nफोन: ${cashApprovalPendingResult.phone}\nकोड: ${cashApprovalPendingResult.memberCode || ''}\nकृपया कैश प्राप्त कर मेरा पार्टनर खाता अप्रूव करें।`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>💬 WhatsApp एडमिन</span>
              </a>
              <a
                href="tel:+916267546945"
                className="py-2.5 px-3 rounded-xl bg-stone-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>📞 कॉल हेड ऑफिस</span>
              </a>
            </div>

            <button
              type="button"
              onClick={() => {
                setCashApprovalPendingResult(null);
                onClose();
              }}
              className="w-full py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition cursor-pointer"
            >
              <span>समझ गया, बंद करें (Close)</span>
            </button>
          </div>
        </div>
      )}

      {membershipResult && (
        <MembershipSuccessModal
          isOpen={Boolean(membershipResult)}
          onClose={() => {
            setMembershipResult(null);
            if (onSuccess) onSuccess();
            onClose();
          }}
          notificationResult={membershipResult}
          userName={contactName || businessName}
          userPhone={phone}
          photoUrl={photo}
          onProceed={() => {
            setMembershipResult(null);
            if (onSuccess) onSuccess();
            onClose();
          }}
        />
      )}
    </div>
  );
};
