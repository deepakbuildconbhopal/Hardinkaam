import React, { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  FileArchive,
  UserCheck,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  Phone,
  Mail,
  RefreshCw,
  Sliders,
  Check,
} from 'lucide-react';
import { FranchisePartner } from '../../types';
import { ALL_INDIA_LOCATIONS } from '../../data/indiaLocations';
import { generateSecureTemporaryPassword } from '../../utils/secureCredentials';
import {
  createFranchisePartner,
  updateFranchiseStatus,
  subscribeAllFranchisePartners,
} from '../../services/franchisePartnerService';
import {
  validateDistrictZip,
  commitApprovedDistrictZip,
  DistrictZipValidationResult,
} from '../../services/districtZipService';
import { logAuditEvent } from '../../services/auditService';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  preselectedDistrict?: string;
  preselectedState?: string;
  onActivated?: (districtId: string, partnerId: string) => void;
}

export const DistrictActivationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  preselectedDistrict = 'Gwalior',
  preselectedState = 'Madhya Pradesh',
  onActivated,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedState, setSelectedState] = useState(preselectedState);
  const [selectedDistrict, setSelectedDistrict] = useState(preselectedDistrict);

  // Partner selection / creation
  const [existingPartners, setExistingPartners] = useState<FranchisePartner[]>([]);
  const [partnerMode, setPartnerMode] = useState<'existing' | 'new'>('existing');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');

  // New partner fields
  const [newPartnerName, setNewPartnerName] = useState('');
  const [newPartnerEmail, setNewPartnerEmail] = useState('');
  const [newPartnerPhone, setNewPartnerPhone] = useState('');
  const [newPartnerPassword, setNewPartnerPassword] = useState(() => generateSecureTemporaryPassword());

  // ZIP Upload
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [zipValidation, setZipValidation] = useState<DistrictZipValidationResult | null>(null);
  const [zipValidating, setZipValidating] = useState(false);

  // Status & loading
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activationSuccess, setActivationSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeAllFranchisePartners((partners) => {
      setExistingPartners(partners);
    });
    return () => unsub();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || existingPartners.length === 0) return;
    const match = existingPartners.find(
      (p) => p.assignedDistrictId.toLowerCase() === selectedDistrict.toLowerCase()
    );
    if (match) {
      setSelectedPartnerId(match.franchisePartnerId);
    } else if (!selectedPartnerId) {
      setSelectedPartnerId(existingPartners[0].franchisePartnerId);
    }
  }, [isOpen, selectedDistrict, existingPartners]);

  if (!isOpen) return null;

  const currentStateObj = ALL_INDIA_LOCATIONS.find((s) => s.state === selectedState);
  const availableDistricts = currentStateObj ? currentStateObj.districts : [];

  const handleZipSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setZipFile(file);
    setZipValidating(true);
    setErrorMsg(null);
    try {
      const res = await validateDistrictZip(file, selectedDistrict.toLowerCase(), selectedDistrict);
      setZipValidation(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'ZIP सत्यापन विफल');
    } finally {
      setZipValidating(false);
    }
  };

  const handleActivateDistrict = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    const currentUser = auth.currentUser;
    const adminEmail = currentUser?.email || 'deepakbuildconbhopal@gmail.com';
    const districtId = selectedDistrict.toLowerCase();
    const districtName = selectedDistrict;

    try {
      let finalPartnerId = selectedPartnerId;

      // 1. If creating new partner
      if (partnerMode === 'new') {
        if (!newPartnerName.trim() || !newPartnerEmail.trim() || !newPartnerPhone.trim()) {
          throw new Error('कृपया पार्टनर का नाम, ईमेल और फोन नंबर भरें।');
        }
        const createRes = await createFranchisePartner({
          name: newPartnerName.trim(),
          email: newPartnerEmail.trim().toLowerCase(),
          phone: newPartnerPhone.trim(),
          assignedDistrictId: districtId,
          assignedDistrictName: districtName,
          stateName: selectedState,
          initialPassword: newPartnerPassword,
        });
        if (!createRes.success || !createRes.partner) {
          throw new Error(createRes.error || 'नया फ्रेंचाइज़ी पार्टनर बनाने में विफल।');
        }
        finalPartnerId = createRes.partner.franchisePartnerId;
      } else {
        // Activate existing partner
        if (!finalPartnerId) {
          throw new Error('कृपया एक फ्रेंचाइज़ी पार्टनर चुनें।');
        }
        await updateFranchiseStatus(finalPartnerId, 'ACTIVE');
      }

      // 2. Commit ZIP assets if provided
      if (zipValidation && zipValidation.isValid) {
        await commitApprovedDistrictZip(zipValidation, zipFile || undefined, adminEmail);
      }

      // 3. Create or activate franchise_cities registry entry (inheriting clean Bhopal base template configuration)
      const now = new Date().toISOString();
      await setDoc(
        doc(db, 'franchise_cities', districtId),
        {
          district: districtName,
          state: selectedState,
          status: 'active',
          activatedAt: now,
          activatedBy: adminEmail,
          assignedPartnerId: finalPartnerId,
          templateInheritedFrom: 'Bhopal_Standard_Template',
          activeSince: now.split('T')[0],
        },
        { merge: true }
      );

      // 4. Secure Audit Logging
      await logAuditEvent({
        action: 'DISTRICT_ACTIVATION',
        actorId: currentUser?.uid || 'SUPER_ADMIN',
        actorEmail: adminEmail,
        targetDistrictId: districtId,
        targetDistrictName: districtName,
        targetPartnerId: finalPartnerId,
        details: `Successfully activated district ${districtName} (${selectedState}) with assigned partner ${finalPartnerId}. Bhopal baseline template inherited.`,
        metadata: {
          districtId,
          districtName,
          stateName: selectedState,
          partnerId: finalPartnerId,
          hasCustomZipAssets: !!zipValidation?.isValid,
        },
      });

      setActivationSuccess(true);
      setStep(5);
      if (onActivated) {
        onActivated(districtId, finalPartnerId);
      }
    } catch (err: any) {
      console.error('District activation error:', err);
      setErrorMsg(err.message || 'जिला सक्रिय करने में त्रुटि हुई');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-stone-900 via-amber-950 to-stone-900 text-white p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  सुपर एडमिन नियंत्रण (Super Admin Master)
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black mt-0.5">
                नया जिला सक्रियण विजार्ड (District Activation Wizard)
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-stone-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Steps Indicator */}
        <div className="bg-stone-100 px-6 py-3 border-b border-stone-200 flex items-center justify-between text-xs font-bold text-stone-600">
          <div className={`flex items-center gap-1.5 ${step === 1 ? 'text-orange-600' : 'text-stone-700'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 1 ? 'bg-orange-600 text-white' : 'bg-stone-300 text-stone-800'}`}>1</span>
            <span>जिला</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-stone-400" />
          <div className={`flex items-center gap-1.5 ${step === 2 ? 'text-orange-600' : 'text-stone-700'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 2 ? 'bg-orange-600 text-white' : 'bg-stone-300 text-stone-800'}`}>2</span>
            <span>पार्टनर</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-stone-400" />
          <div className={`flex items-center gap-1.5 ${step === 3 ? 'text-orange-600' : 'text-stone-700'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 3 ? 'bg-orange-600 text-white' : 'bg-stone-300 text-stone-800'}`}>3</span>
            <span>ZIP (वैकल्पिक)</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-stone-400" />
          <div className={`flex items-center gap-1.5 ${step === 4 || step === 5 ? 'text-orange-600' : 'text-stone-700'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step >= 4 ? 'bg-orange-600 text-white' : 'bg-stone-300 text-stone-800'}`}>4</span>
            <span>समीक्षा व सक्रियण</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-stone-800 flex-1">
          {/* STEP 1: Select District */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-black text-stone-900">चरण 1: सक्रिय करने हेतु राज्य व जिले का चयन करें</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  पूरे भारत के 500+ जिलों में से लक्षित जिला चुनें जिसे आज लाइव संचालित करना है।
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">राज्य (State)</label>
                  <select
                    value={selectedState}
                    onChange={(e) => {
                      setSelectedState(e.target.value);
                      const s = ALL_INDIA_LOCATIONS.find((loc) => loc.state === e.target.value);
                      if (s && s.districts.length > 0) {
                        setSelectedDistrict(s.districts[0].district);
                      }
                    }}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {ALL_INDIA_LOCATIONS.map((s) => (
                      <option key={s.state} value={s.state}>
                        {s.hindiState} ({s.state})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">जिला (District)</label>
                  <select
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {availableDistricts.map((d) => (
                      <option key={d.district} value={d.district}>
                        {d.hindiDistrict} ({d.district})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center gap-3 text-xs text-orange-900">
                <MapPin className="w-5 h-5 text-orange-600 shrink-0" />
                <div>
                  <span className="font-bold">चयनित कार्यक्षेत्र:</span> {selectedDistrict}, {selectedState}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Assign Franchise Partner */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-black text-stone-900">चरण 2: जिला फ्रेंचाइज़ी पार्टनर असाइन करें</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  इस जिले के संचालन, बुकिंग प्रबंधन व टीम सुपरविज़न हेतु अधिकृत एडमिन पार्टनर संबद्ध करें।
                </p>
              </div>

              <div className="flex gap-2 border-b border-stone-200 pb-2">
                <button
                  type="button"
                  onClick={() => setPartnerMode('existing')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    partnerMode === 'existing' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  मौजूदा पार्टनर चुनें ({existingPartners.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPartnerMode('new')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    partnerMode === 'new' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  + नया पार्टनर बनाएं
                </button>
              </div>

              {partnerMode === 'existing' && (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-stone-700">पार्टनर सूची (Registered Partners)</label>
                  <select
                    value={selectedPartnerId}
                    onChange={(e) => setSelectedPartnerId(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {existingPartners.map((p) => (
                      <option key={p.franchisePartnerId} value={p.franchisePartnerId}>
                        {p.name} ({p.franchiseCode}) — {p.assignedDistrictName} [{p.status}]
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {partnerMode === 'new' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-stone-50 p-4 rounded-2xl border border-stone-200">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">पार्टनर का पूरा नाम *</label>
                    <input
                      type="text"
                      value={newPartnerName}
                      onChange={(e) => setNewPartnerName(e.target.value)}
                      placeholder="उदा. अमित तोमर"
                      className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">आधिकारिक लॉगिन ईमेल *</label>
                    <input
                      type="email"
                      value={newPartnerEmail}
                      onChange={(e) => setNewPartnerEmail(e.target.value)}
                      placeholder="gwalior.admin@hardinkaam.in"
                      className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">मोबाइल नंबर *</label>
                    <input
                      type="tel"
                      value={newPartnerPhone}
                      onChange={(e) => setNewPartnerPhone(e.target.value)}
                      placeholder="9826011223"
                      className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-stone-700">प्रारंभिक सुरक्षित पासवर्ड *</label>
                      <button
                        type="button"
                        onClick={() => setNewPartnerPassword(generateSecureTemporaryPassword())}
                        className="text-[11px] font-bold text-orange-600 hover:text-orange-700 underline cursor-pointer"
                      >
                        नया पासवर्ड जनरेट करें
                      </button>
                    </div>
                    <input
                      type="text"
                      value={newPartnerPassword}
                      onChange={(e) => setNewPartnerPassword(e.target.value)}
                      className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Optional ZIP Upload */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-black text-stone-900">चरण 3: जिला ZIP पैकेज अपलोड (वैकल्पिक)</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  यदि आपके पास {selectedDistrict} हेतु स्थानीय बैनर, लोगो या कस्टम कॉन्फ़िगरेशन ZIP है तो यहाँ अपलोड करें।
                  अन्यथा यह चरण छोड़कर डिफ़ॉल्ट टेम्पलेट उपयोग किया जा सकता है।
                </p>
              </div>

              <div className="border-2 border-dashed border-stone-300 rounded-3xl p-6 text-center bg-stone-50">
                <input
                  type="file"
                  id="district-wizard-zip-input"
                  accept=".zip,application/zip"
                  onChange={handleZipSelected}
                  className="hidden"
                />
                <label
                  htmlFor="district-wizard-zip-input"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <FileArchive className="w-12 h-12 text-orange-600" />
                  <span className="text-xs font-black text-stone-900">
                    {zipFile ? zipFile.name : 'ZIP फ़ाइल चुनने के लिए क्लिक करें'}
                  </span>
                  <span className="text-[11px] text-stone-500">
                    स्वीकृत: बैनर, छवियां, लोगो, JSON कॉन्फ़िगरेशन (Zero Code Execution Sandbox)
                  </span>
                </label>
              </div>

              {zipValidating && (
                <div className="text-xs text-orange-600 font-bold flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>ZIP सुरक्षा सत्यापन जारी है...</span>
                </div>
              )}

              {zipValidation && (
                <div
                  className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between ${
                    zipValidation.isValid
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : 'bg-rose-50 border-rose-300 text-rose-950'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {zipValidation.isValid ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-600" />
                    )}
                    <span className="font-bold">
                      {zipValidation.isValid
                        ? `सत्यापन सफल: ${zipValidation.totalFiles} एसेट्स स्वीकृत`
                        : 'अमान्य ZIP पैकेज'}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold">
                    {Math.round(zipValidation.totalSizeBytes / 1024)} KB
                  </span>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Review Configuration & Activation */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-black text-stone-900">चरण 4: कॉन्फ़िगरेशन समीक्षा एवं अंतिम सक्रियण</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  सक्रियण उपरांत यह जिला तुरंत लाइव हो जाएगा। ग्राहक इस जिले में सेवा बुक कर सकेंगे।
                </p>
              </div>

              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-stone-200">
                  <span className="text-stone-500 font-bold">लक्षित जिला व राज्य:</span>
                  <span className="font-black text-stone-900">
                    {selectedDistrict}, {selectedState}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-200">
                  <span className="text-stone-500 font-bold">फ्रेंचाइज़ी पार्टनर:</span>
                  <span className="font-black text-stone-900">
                    {partnerMode === 'new' ? newPartnerName : selectedPartnerId}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-200">
                  <span className="text-stone-500 font-bold">कस्टम ZIP एसेट्स:</span>
                  <span className="font-black text-stone-900">
                    {zipValidation?.isValid ? `${zipValidation.totalFiles} एसेट्स जुड़े` : 'मानक डिफ़ॉल्ट टेम्पलेट'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-stone-500 font-bold">डेटा सुरक्षा गारंटी:</span>
                  <span className="font-bold text-emerald-700">
                    🛡️ भोपाल के निजी ग्राहक/बुकिंग डेटा कॉपी नहीं होंगे (Strict Zero Leakage)
                  </span>
                </div>
              </div>

              {errorMsg && (
                <div className="bg-rose-500 text-white rounded-2xl p-3.5 flex items-center gap-2 text-xs">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: Success Banner */}
          {step === 5 && activationSuccess && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <Check className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-black text-stone-900">
                  🎉 {selectedDistrict} जिला सफलतापूर्वक सक्रिय हो गया!
                </h3>
                <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
                  {selectedDistrict} के फ्रेंचाइज़ी पार्टनर को एडमिन एक्सेस प्रदान कर दी गई है। जिला सुरक्षा ऑडिट लॉग में
                  इवेंट दर्ज हो चुका है।
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="bg-stone-50 border-t border-stone-200 p-4 sm:p-5 flex items-center justify-between gap-3">
          {step > 1 && step < 5 ? (
            <button
              onClick={() => setStep((prev) => (prev - 1) as any)}
              className="px-4 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 font-bold text-xs text-stone-700 flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>पीछे (Back)</span>
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 font-bold text-xs text-stone-700 cursor-pointer"
            >
              रद्द करें (Cancel)
            </button>
          )}

          {step < 4 && (
            <button
              onClick={() => setStep((prev) => (prev + 1) as any)}
              className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>आगे बढ़ें (Next)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {step === 4 && (
            <button
              onClick={handleActivateDistrict}
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/20 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>सक्रिय किया जा रहा है...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>जिला सक्रिय करें (Activate District)</span>
                </>
              )}
            </button>
          )}

          {step === 5 && (
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs cursor-pointer"
            >
              संपन्न (Finish)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
