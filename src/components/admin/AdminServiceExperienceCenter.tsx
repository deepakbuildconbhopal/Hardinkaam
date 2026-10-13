import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Home,
  Heart,
  Building2,
  GraduationCap,
  Mic,
  WifiOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Search,
  RefreshCw,
  Plus,
  Clock,
  Eye,
  Award,
  Layers,
  Settings,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  GuaranteeClaim,
  ServiceGuarantee,
  BusinessOrganization,
  BusinessWorkOrder,
  AcademyCourse,
} from '../../types';
import { serviceGuaranteeService } from '../../services/serviceGuaranteeService';
import { businessCareService } from '../../services/businessCareService';
import { skillAcademyService } from '../../services/skillAcademyService';

export const AdminServiceExperienceCenter: React.FC = () => {
  const { userProfile, currentUser } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<
    'guarantee' | 'passport' | 'family' | 'business' | 'academy' | 'voice' | 'low_network'
  >('guarantee');

  // Guarantee Claims
  const [claims, setClaims] = useState<GuaranteeClaim[]>([]);
  const [loadingClaims, setLoadingClaims] = useState<boolean>(false);
  const [selectedClaim, setSelectedClaim] = useState<GuaranteeClaim | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [processingClaim, setProcessingClaim] = useState<boolean>(false);

  // Business Organizations
  const [orgs, setOrgs] = useState<BusinessOrganization[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState<boolean>(false);

  // Academy Courses
  const [courses, setCourses] = useState<AcademyCourse[]>([]);
  const [loadingCourses, setLoadingCourses] = useState<boolean>(false);

  useEffect(() => {
    loadTabData();
  }, [activeTab]);

  const loadTabData = async () => {
    if (activeTab === 'guarantee') {
      setLoadingClaims(true);
      serviceGuaranteeService
        .getAllClaims()
        .then(setClaims)
        .finally(() => setLoadingClaims(false));
    } else if (activeTab === 'business') {
      setLoadingOrgs(true);
      businessCareService
        .getAllOrganizations()
        .then(setOrgs)
        .finally(() => setLoadingOrgs(false));
    } else if (activeTab === 'academy') {
      setLoadingCourses(true);
      skillAcademyService
        .getCourses()
        .then(setCourses)
        .finally(() => setLoadingCourses(false));
    }
  };

  const handleApproveClaim = async (claim: GuaranteeClaim) => {
    if (window.confirm(`क्या आप दावा #${claim.id} को स्वीकृत कर मुफ़्त रिविजिट बुकिंग बनाना चाहते हैं?`)) {
      setProcessingClaim(true);
      try {
        const res = await serviceGuaranteeService.adminApproveClaim(claim.id);
        addToast(
          `दावा स्वीकृत! मुफ़्त रिविजिट बुकिंग #${res.revisitBooking.id} बनाई गई।`,
          'success'
        );
        setSelectedClaim(null);
        await loadTabData();
      } catch (e: any) {
        addToast(e.message || 'स्वीकृति में त्रुटि', 'error');
      } finally {
        setProcessingClaim(false);
      }
    }
  };

  const handleRejectClaim = async (claim: GuaranteeClaim) => {
    if (!rejectionReason.trim()) {
      addToast('कृपया अस्वीकृति का कारण लिखें।', 'warning');
      return;
    }
    setProcessingClaim(true);
    try {
      await serviceGuaranteeService.adminRejectClaim(claim.id, rejectionReason.trim());
      addToast('दावा अस्वीकृत किया गया।', 'info');
      setSelectedClaim(null);
      setRejectionReason('');
      await loadTabData();
    } catch (e: any) {
      addToast(e.message || 'अस्वीकृति में त्रुटि', 'error');
    } finally {
      setProcessingClaim(false);
    }
  };

  const handleResolveClaim = async (claim: GuaranteeClaim) => {
    setProcessingClaim(true);
    try {
      await serviceGuaranteeService.adminResolveClaim(claim.id);
      addToast('दावा समाधान संपन्न हुआ!', 'success');
      setSelectedClaim(null);
      await loadTabData();
    } catch (e: any) {
      addToast(e.message || 'त्रुटि', 'error');
    } finally {
      setProcessingClaim(false);
    }
  };

  const handleVerifyOrg = async (orgId: string) => {
    try {
      await businessCareService.setOrganizationStatus(orgId, 'verified');
      addToast('संस्थान सत्यापित किया गया!', 'success');
      await loadTabData();
    } catch (e) {
      addToast('सत्यापन में त्रुटि', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-stone-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-black uppercase tracking-wider border border-orange-500/30">
              Admin Supervisor Control
            </span>
            <span className="text-xs text-stone-400">7-Feature Growth Hub</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
            Service Experience &amp; Growth — सेवा अनुभव एवं नियंत्रण
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            सर्विस गारंटी दावे, होम पासपोर्ट, परिवार देखभाल, बिज़नेस पोर्टल, प्रो ट्रेनिंग एवं वॉयस एनालिटिक्स का केंद्रीय प्रबंधन।
          </p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('guarantee')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'guarantee'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-stone-700 hover:bg-stone-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>1. सर्विस गारंटी दावे ({claims.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('passport')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'passport'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'bg-white text-stone-700 hover:bg-stone-100'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>2. होम पासपोर्ट कॉन्फ़िग</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('family')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'family'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-white text-stone-700 hover:bg-stone-100'
          }`}
        >
          <Heart className="w-4 h-4" />
          <span>3. परिवार देखभाल ऑडिट</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('business')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'business'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-stone-700 hover:bg-stone-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>4. बिज़नेस एवं सोसाइटी</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('academy')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'academy'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'bg-white text-stone-700 hover:bg-stone-100'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>5. स्किल अकादमी प्रबंधक</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('voice')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'voice'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white text-stone-700 hover:bg-stone-100'
          }`}
        >
          <Mic className="w-4 h-4" />
          <span>6. कामदोस्त वॉयस एनालिटिक्स</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('low_network')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'low_network'
              ? 'bg-stone-800 text-white shadow-sm'
              : 'bg-white text-stone-700 hover:bg-stone-100'
          }`}
        >
          <WifiOff className="w-4 h-4" />
          <span>7. लो-नेटवर्क डायग्नोस्टिक्स</span>
        </button>
      </div>

      {/* TAB 1: Service Guarantee & Claims */}
      {activeTab === 'guarantee' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-stone-900 text-base">
              लंबित गारंटी दावे (Guarantee Claims Queue)
            </h3>
            <button
              type="button"
              onClick={loadTabData}
              className="px-3 py-1 text-xs font-bold bg-stone-100 hover:bg-stone-200 rounded-lg flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              रिफ्रेश
            </button>
          </div>

          {loadingClaims ? (
            <div className="py-8 text-center text-stone-400 text-xs">लोड हो रहा है...</div>
          ) : claims.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-stone-200 text-xs text-stone-500">
              कतार में कोई गारंटी दावा नहीं है। सभी सेवाएँ संतोषजनक रूप से संचालित हैं।
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {claims.map((claim) => (
                <div
                  key={claim.id}
                  className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-extrabold text-stone-900 text-sm block">
                        {claim.serviceName}
                      </span>
                      <span className="text-xs text-stone-500">
                        दावा #{claim.id} • बुकिंग #{claim.bookingId}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        claim.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : claim.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : claim.status === 'resolved'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {claim.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="p-2.5 bg-stone-50 rounded-xl text-xs text-stone-700 space-y-1">
                    <p>
                      <strong>ग्राहक:</strong> {claim.customerName} ({claim.customerPhone})
                    </p>
                    <p>
                      <strong>समस्या:</strong> {claim.description}
                    </p>
                    <p>
                      <strong>संपर्क समय:</strong> {claim.preferredContactTime}
                    </p>
                    {claim.revisitBookingId && (
                      <p className="text-emerald-700 font-bold">
                        ✓ मुफ़्त रिविजिट बुकिंग: #{claim.revisitBookingId}
                      </p>
                    )}
                  </div>

                  {claim.status === 'submitted' && (
                    <div className="flex items-center gap-2 pt-1 border-t border-stone-100">
                      <button
                        type="button"
                        onClick={() => handleApproveClaim(claim)}
                        disabled={processingClaim}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition"
                      >
                        स्वीकृत करें (Free Revisit)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedClaim(claim)}
                        disabled={processingClaim}
                        className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-xs rounded-xl transition"
                      >
                        अस्वीकार
                      </button>
                    </div>
                  )}

                  {claim.status === 'approved' && (
                    <button
                      type="button"
                      onClick={() => handleResolveClaim(claim)}
                      disabled={processingClaim}
                      className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition"
                    >
                      समाधान संपन्न चिह्नित करें (Mark Resolved)
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Rejection Modal */}
          {selectedClaim && (
            <div
              role="dialog"
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs"
            >
              <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-3 shadow-2xl border border-stone-200">
                <h4 className="font-bold text-stone-900 text-sm">
                  दावा अस्वीकृति का कारण लिखें (Reject Reason)
                </h4>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="उदा. उपकरण के साथ बाहरी छेड़छाड़ पाई गई, गारंटी शर्तों से बाहर है।"
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-300"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedClaim(null)}
                    className="flex-1 py-2 text-xs font-semibold bg-stone-100 rounded-xl"
                  >
                    रद्द करें
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRejectClaim(selectedClaim)}
                    className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 rounded-xl"
                  >
                    अस्वीकृत करें
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Home Passport Config */}
      {activeTab === 'passport' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 space-y-4">
          <h3 className="font-extrabold text-stone-900 text-base">
            डिजिटल होम पासपोर्ट नीति एवं श्रेणियाँ (Appliance Passport Policy)
          </h3>
          <p className="text-xs text-stone-500 leading-relaxed">
            भोपाल क्षेत्र में पंजीकृत सभी होम एप्लायंसेज के लिए डिफ़ॉल्ट मेंटेनेंस अंतराल और अनुस्मारक नियम सक्रिय हैं।
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200">
              <span className="font-bold text-xs text-orange-900 block">एसी डीप मेंटेनेंस</span>
              <span className="text-xs text-stone-600">अनुशंसित अंतराल: 6 माह</span>
            </div>
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
              <span className="font-bold text-xs text-blue-900 block">वाटर प्यूरीफायर (RO)</span>
              <span className="text-xs text-stone-600">अनुशंसित अंतराल: 3 माह</span>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
              <span className="font-bold text-xs text-emerald-900 block">इलेक्ट्रिकल वायरिंग जांच</span>
              <span className="text-xs text-stone-600">अनुशंसित अंतराल: 12 माह</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Family Care Audit */}
      {activeTab === 'family' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 space-y-3">
          <h3 className="font-extrabold text-stone-900 text-base">
            परिवार देखभाल पहुंच एवं दुरुपयोग नियंत्रण (Family Care Audit &amp; Safety)
          </h3>
          <p className="text-xs text-stone-500 leading-relaxed">
            सभी पारिवारिक पते केवल अधिकृत परिवारजनों द्वारा नियंत्रित हैं। ओटीपी और भुगतान जानकारी किसी भी अनधिकृत खाते को प्रदर्शित नहीं की जाती। 7 दिन के बाद लंबित आमंत्रण स्वतः निरस्त हो जाते हैं।
          </p>
          <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-stone-700 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>सुरक्षा स्थिति: समस्त पारिवारिक प्रोफाइल सख्त Firestore एक्सेस नियमों के तहत सुरक्षित हैं।</span>
          </div>
        </div>
      )}

      {/* TAB 4: Business Organizations */}
      {activeTab === 'business' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-stone-900 text-base">
              पंजीकृत संस्थाएं एवं आरडब्ल्यूए ({orgs.length})
            </h3>
            <button
              type="button"
              onClick={loadTabData}
              className="px-3 py-1 text-xs font-bold bg-stone-100 hover:bg-stone-200 rounded-lg flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              रिफ्रेश
            </button>
          </div>

          {loadingOrgs ? (
            <div className="py-8 text-center text-stone-400 text-xs">लोड हो रहा है...</div>
          ) : orgs.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-stone-200 text-xs text-stone-500">
              कोई संस्था पंजीकृत नहीं है।
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {orgs.map((org) => (
                <div
                  key={org.id}
                  className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-stone-900 text-sm">{org.name}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        org.status === 'verified'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {org.status === 'verified' ? 'सत्यापित' : 'सत्यापन बाकी'}
                    </span>
                  </div>

                  <div className="text-xs text-stone-600 space-y-1">
                    <p>
                      <strong>संपर्क:</strong> {org.contactPerson} ({org.contactPhone})
                    </p>
                    <p>
                      <strong>पता:</strong> {org.billingAddress}
                    </p>
                    {org.gstin && (
                      <p>
                        <strong>जीएसटी:</strong> {org.gstin}
                      </p>
                    )}
                  </div>

                  {org.status !== 'verified' && (
                    <button
                      type="button"
                      onClick={() => handleVerifyOrg(org.id)}
                      className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition"
                    >
                      संस्थान को सत्यापित करें (Verify Org)
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: Skill Academy Manager */}
      {activeTab === 'academy' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-stone-900 text-base">
              प्रशिक्षण पाठ्यक्रम एवं बैज ({courses.length})
            </h3>
            <button
              type="button"
              onClick={loadTabData}
              className="px-3 py-1 text-xs font-bold bg-stone-100 hover:bg-stone-200 rounded-lg flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              रिफ्रेश
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {courses.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-stone-900 text-sm">{c.title}</span>
                  <span className="text-xl">{c.badgeIcon}</span>
                </div>
                <p className="text-xs text-stone-500">{c.description}</p>
                <div className="text-xs text-stone-600 pt-1 border-t border-stone-100 flex items-center justify-between">
                  <span>मॉड्यूल: {c.modules.length}</span>
                  <span>उत्तीर्ण मानक: {c.assessment.passingScore}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: KaamDost Voice Analytics */}
      {activeTab === 'voice' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 space-y-4">
          <h3 className="font-extrabold text-stone-900 text-base">
            कामदोस्त वॉयस बुकिंग विन्यास एवं एनालिटिक्स (KaamDost Voice Engine)
          </h3>
          <p className="text-xs text-stone-500 leading-relaxed">
            हिंदी (hi-IN) एवं अंग्रेजी (en-IN) में प्राकृतिक वाणी पहचान (Speech-to-Text) व पुष्टि प्रणाली सक्रिय है।
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200">
              <span className="font-bold text-xs text-purple-900 block">सक्रिय भाषा मॉडल</span>
              <span className="text-xs text-stone-600">Hindi Natural + Hinglish Entity Extraction</span>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
              <span className="font-bold text-xs text-emerald-900 block">वॉयस बुकिंग पुष्टि दर</span>
              <span className="text-xs text-stone-600">100% स्पष्ट सहमति कार्ड के साथ</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: Low-Network Sync Diagnostics */}
      {activeTab === 'low_network' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 space-y-4">
          <h3 className="font-extrabold text-stone-900 text-base">
            लो-नेटवर्क सिंक्रोनाइज़ेशन डायग्नोस्टिक्स (Pro Low-Network Diagnostics)
          </h3>
          <p className="text-xs text-stone-500 leading-relaxed">
            कमजोर सिग्नल वाले क्षेत्रों में सर्विस प्रोफ़ेशनल्स के लिए IndexedDB आधारित जॉब कैशिंग और ऑटोमैटिक रिकनेक्ट सिंक इंजन सक्रिय है।
          </p>
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-stone-500">लोकल डेटाबेस:</span>
              <span className="font-mono font-bold text-stone-900">Hardinkaam_ProOfflineDB_v1</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-500">बैकऑफ़ रीट्राय रणनीति:</span>
              <span className="font-bold text-stone-900">Exponential Bounded Backoff</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-500">सुरक्षा प्रतिबंध:</span>
              <span className="font-bold text-emerald-700">ऑफ़लाइन पेमेंट/ओटीपी बायपास सख्त वर्जित</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
