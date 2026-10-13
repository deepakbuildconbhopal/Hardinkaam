import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Briefcase,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldCheck,
  ChevronRight,
  MapPin,
  Phone,
  FileSpreadsheet,
  UserCheck,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  BusinessOrganization,
  BusinessWorkOrder,
  WorkOrderPriority,
} from '../../types';
import { businessCareService } from '../../services/businessCareService';
import { INITIAL_SERVICES } from '../../firebase/seed';

export const BusinessCarePortal: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const { addToast } = useToast();
  const [orgs, setOrgs] = useState<BusinessOrganization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<BusinessOrganization | null>(null);
  const [workOrders, setWorkOrders] = useState<BusinessWorkOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showCreateOrgModal, setShowCreateOrgModal] = useState<boolean>(false);
  const [showWorkOrderModal, setShowWorkOrderModal] = useState<boolean>(false);

  // New Organization Form
  const [orgName, setOrgName] = useState<string>('');
  const [orgType, setOrgType] = useState<BusinessOrganization['type']>('society_rwa');
  const [contactPerson, setContactPerson] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [gstin, setGstin] = useState<string>('');
  const [billingAddress, setBillingAddress] = useState<string>('');
  const [initialAddressLabel, setInitialAddressLabel] = useState<string>('मुख्य ब्लॉक / Main Premises');
  const [savingOrg, setSavingOrg] = useState<boolean>(false);

  // New Work Order Form
  const [woTitle, setWoTitle] = useState<string>('');
  const [woServiceId, setWoServiceId] = useState<string>(INITIAL_SERVICES[0].id);
  const [woPriority, setWoPriority] = useState<WorkOrderPriority>('medium');
  const [woLocationId, setWoLocationId] = useState<string>('');
  const [woDate, setWoDate] = useState<string>('');
  const [woSlot, setWoSlot] = useState<string>('11:00 AM - 01:00 PM');
  const [woBudget, setWoBudget] = useState<number>(500);
  const [woNotes, setWoNotes] = useState<string>('');
  const [savingWo, setSavingWo] = useState<boolean>(false);

  const loadData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const userOrgs = await businessCareService.getOrganizationsForUser(currentUser.uid);
      setOrgs(userOrgs);
      if (userOrgs.length > 0) {
        const active = selectedOrg || userOrgs[0];
        setSelectedOrg(active);
        const wos = await businessCareService.getWorkOrdersForOrg(active.id);
        setWorkOrders(wos);
      }
    } catch (e) {
      console.warn('Error loading business care data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim() || !contactPerson.trim() || !billingAddress.trim()) {
      addToast('कृपया सभी आवश्यक फ़ील्ड भरें।', 'warning');
      return;
    }
    if (!currentUser) return;

    setSavingOrg(true);
    try {
      const newOrg = await businessCareService.createOrganization({
        name: orgName.trim(),
        type: orgType,
        contactPerson: contactPerson.trim(),
        contactPhone: contactPhone.trim() || userProfile?.phone || '',
        contactEmail: contactEmail.trim() || currentUser.email || '',
        gstin: gstin.trim() || undefined,
        billingAddress: billingAddress.trim(),
        registeredAddresses: [
          {
            id: `addr_${Date.now()}`,
            label: initialAddressLabel,
            address: billingAddress.trim(),
            pincode: '462001',
          },
        ],
        members: [
          {
            userId: currentUser.uid,
            name: userProfile?.name || contactPerson.trim(),
            phone: contactPhone.trim(),
            role: 'org_admin',
            addedAt: new Date().toISOString(),
          },
        ],
        recurringContracts: [
          {
            id: `contract_${Date.now()}`,
            title: 'मासिक सामान्य विद्युत एवं सुरक्षा रखरखाव (Monthly Electrical AMC)',
            serviceId: 'srv_fan_install_repair',
            serviceName: 'इलेक्ट्रिकल सिस्टम सुरक्षा जांच',
            frequency: 'monthly',
            nextScheduledDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            estimatedAmount: 2500,
            status: 'active',
          },
        ],
      });

      addToast('संस्था प्रोफ़ाइल बनाई गई! व्यवस्थापक सत्यापन के लिए भेजी गई।', 'success');
      setShowCreateOrgModal(false);
      setSelectedOrg(newOrg);
      await loadData();
    } catch (err: any) {
      addToast(err.message || 'संस्था जोड़ने में त्रुटि', 'error');
    } finally {
      setSavingOrg(false);
    }
  };

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg || !woTitle.trim()) return;

    setSavingWo(true);
    try {
      const srv = INITIAL_SERVICES.find((s) => s.id === woServiceId) || INITIAL_SERVICES[0];
      const addr = selectedOrg.registeredAddresses[0]?.address || selectedOrg.billingAddress;

      await businessCareService.createWorkOrder({
        orgId: selectedOrg.id,
        orgName: selectedOrg.name,
        title: woTitle.trim(),
        serviceId: srv.id,
        serviceName: srv.name,
        locationId: woLocationId || selectedOrg.registeredAddresses[0]?.id || 'main',
        address: addr,
        priority: woPriority,
        preferredDate: woDate || new Date().toISOString().split('T')[0],
        preferredSlot: woSlot,
        estimatedBudget: woBudget,
        notes: woNotes.trim() || undefined,
      });

      addToast('कार्य आदेश (Work Order) सफलतापूर्वक जारी किया गया!', 'success');
      setShowWorkOrderModal(false);
      setWoTitle('');
      if (selectedOrg) {
        const updatedWos = await businessCareService.getWorkOrdersForOrg(selectedOrg.id);
        setWorkOrders(updatedWos);
      }
    } catch (err: any) {
      addToast(err.message || 'वर्क आर्डर त्रुटि', 'error');
    } finally {
      setSavingWo(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 rounded-3xl p-5 sm:p-6 text-white shadow-lg shadow-blue-700/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/30 text-white shadow-xs">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-white/25 text-white text-[10px] font-black uppercase tracking-wider">
                संस्था एवं व्यावसायिक सेवाएँ
              </span>
              <span className="text-xs text-blue-100 font-medium">
                {orgs.length} पंजीकृत संस्थान
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white mt-0.5">
              HARDINKAAM Business Care — बिज़नेस एवं सोसाइटी
            </h2>
            <p className="text-xs text-white/85">
              अपार्टमेंट सोसाइटी, आरडब्ल्यूए, कॉर्पोरेट ऑफिस, क्लीनिक व व्यावसायिक परिसरों के लिए संगठित वर्क-ऑर्डर व एएमसी।
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setShowCreateOrgModal(true)}
            className="px-4 py-2.5 rounded-xl bg-white text-blue-950 hover:bg-blue-50 font-bold text-xs shadow-sm transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-blue-600" />
            <span>नया संस्थान जोड़ें (Add Org)</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-stone-400">
          <Building2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-xs">बिज़नेस केयर पोर्टल लोड हो रहा है...</p>
        </div>
      ) : orgs.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-8 sm:p-12 text-center max-w-md mx-auto shadow-xs space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
            <Building2 className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-base text-stone-800">
            कोई व्यावसायिक या सोसाइटी खाता पंजीकृत नहीं है
          </h3>
          <p className="text-xs text-stone-500 leading-relaxed">
            यदि आप किसी हाउसिंग सोसाइटी (RWA), ऑफिस, क्लिनिक या दुकान के प्रबंधक हैं, तो संस्थान पंजीकृत करके कार्य आदेश और एएमसी प्रबंधित करें।
          </p>
          <button
            type="button"
            onClick={() => setShowCreateOrgModal(true)}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-xs"
          >
            संस्थान पंजीकृत करें (Register Organization)
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Active Org Selector Bar */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-stone-900 text-sm sm:text-base">
                    {selectedOrg?.name}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    {selectedOrg?.type === 'society_rwa'
                      ? 'सोसाइटी / RWA'
                      : selectedOrg?.type === 'office'
                      ? 'कॉर्पोरेट ऑफिस'
                      : selectedOrg?.type === 'clinic'
                      ? 'क्लिनिक / अस्पताल'
                      : 'व्यावसायिक परिसर'}
                  </span>
                </div>
                <p className="text-xs text-stone-500 truncate max-w-md">
                  {selectedOrg?.billingAddress}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowWorkOrderModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>नया वर्क ऑर्डर जारी करें (New Work Order)</span>
              </button>
            </div>
          </div>

          {/* Work Orders List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-stone-800 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-blue-600" />
                सक्रिय कार्य आदेश (Work Orders) — {workOrders.length}
              </h4>
            </div>

            {workOrders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-6 text-center text-stone-400 text-xs">
                इस संस्था के लिए अभी कोई कार्य आदेश नहीं है। ऊपर दिए गए बटन से नया वर्क ऑर्डर बनाएं।
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {workOrders.map((wo) => (
                  <div
                    key={wo.id}
                    className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs space-y-2.5 flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-extrabold text-stone-900 text-sm truncate">
                          {wo.title}
                        </span>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            wo.priority === 'emergency'
                              ? 'bg-rose-100 text-rose-800'
                              : wo.priority === 'high'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {wo.priority.toUpperCase()}
                        </span>
                      </div>

                      <span className="text-xs text-blue-600 font-semibold block">
                        {wo.serviceName}
                      </span>

                      <div className="text-xs text-stone-500 space-y-1 pt-1">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-stone-400" />
                          <span>{wo.preferredDate} ({wo.preferredSlot})</span>
                        </div>
                        <div className="flex items-center gap-1 truncate">
                          <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span className="truncate">{wo.address}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                      <span className="font-extrabold text-stone-900">
                        अनुमानित बजट: ₹{wo.estimatedBudget}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                        {wo.status === 'created'
                          ? 'समीक्षाधीन'
                          : wo.status === 'approved'
                          ? 'स्वीकृत'
                          : wo.status === 'in_progress'
                          ? 'प्रगति पर'
                          : 'पूर्ण'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal to Register Organization */}
      {showCreateOrgModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs animate-fadeIn"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
              <h3 className="font-bold text-stone-900 text-base">
                व्यावसायिक / सोसाइटी खाता पंजीकृत करें
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateOrgModal(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOrg} className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  संस्था का नाम (Organization / Society Name) *
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="उदा. आशीर्वाद हाइट्स RWA, कोलार"
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-300"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    संस्था प्रकार (Type) *
                  </label>
                  <select
                    value={orgType}
                    onChange={(e) => setOrgType(e.target.value as any)}
                    className="w-full p-2.5 text-xs rounded-xl border border-stone-300 bg-white"
                  >
                    <option value="society_rwa">सोसाइटी / RWA</option>
                    <option value="office">ऑफिस / कॉर्पोरेट</option>
                    <option value="clinic">क्लिनिक / अस्पताल</option>
                    <option value="retail_store">रिटेल स्टोर / शोरूम</option>
                    <option value="property_management">प्रॉपर्टी मैनेजमेंट</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    अधिकृत संपर्क व्यक्ति (Manager Name) *
                  </label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="उदा. राजेश वर्मा"
                    className="w-full p-2.5 text-xs rounded-xl border border-stone-300"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    मोबाइल नंबर (Phone)
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+91 98260 XXXXX"
                    className="w-full p-2.5 text-xs rounded-xl border border-stone-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    जीएसटी नंबर (GSTIN, Optional)
                  </label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="23AAAAA0000A1Z5"
                    className="w-full p-2.5 text-xs rounded-xl border border-stone-300"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  परिसर का पूरा पता (Address) *
                </label>
                <textarea
                  rows={2}
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder="सोसाइटी या ऑफिस का पूरा पता, भोपाल"
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-300"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingOrg}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition disabled:opacity-50"
                >
                  {savingOrg ? 'पंजीकृत हो रहा है...' : 'संस्थान पंजीकृत करें'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal to Create Work Order */}
      {showWorkOrderModal && selectedOrg && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs animate-fadeIn"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
              <h3 className="font-bold text-stone-900 text-base">
                नया वर्क ऑर्डर जारी करें (Create Work Order)
              </h3>
              <button
                type="button"
                onClick={() => setShowWorkOrderModal(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateWorkOrder} className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  कार्य का शीर्षक (Work Title) *
                </label>
                <input
                  type="text"
                  value={woTitle}
                  onChange={(e) => setWoTitle(e.target.value)}
                  placeholder="उदा. ब्लॉक बी लिफ्ट रूम वायरिंग रिपेयर"
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-300"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    सेवा श्रेणी (Service)
                  </label>
                  <select
                    value={woServiceId}
                    onChange={(e) => setWoServiceId(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl border border-stone-300 bg-white"
                  >
                    {INITIAL_SERVICES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    प्राथमिकता (Priority)
                  </label>
                  <select
                    value={woPriority}
                    onChange={(e) => setWoPriority(e.target.value as any)}
                    className="w-full p-2.5 text-xs rounded-xl border border-stone-300 bg-white"
                  >
                    <option value="medium">Medium (सामान्य)</option>
                    <option value="high">High (उच्च)</option>
                    <option value="emergency">Emergency (आपातकालीन)</option>
                    <option value="low">Low (कम)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    अपेक्षित तिथि (Preferred Date)
                  </label>
                  <input
                    type="date"
                    value={woDate}
                    onChange={(e) => setWoDate(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl border border-stone-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    अनुमानित बजट (Budget ₹)
                  </label>
                  <input
                    type="number"
                    value={woBudget}
                    onChange={(e) => setWoBudget(Number(e.target.value))}
                    className="w-full p-2.5 text-xs rounded-xl border border-stone-300"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingWo}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition disabled:opacity-50"
                >
                  {savingWo ? 'जारी हो रहा है...' : 'वर्क ऑर्डर जारी करें (Issue Work Order)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
