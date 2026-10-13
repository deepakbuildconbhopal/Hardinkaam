import React, { useState, useEffect } from 'react';
import {
  Home,
  Plus,
  Wrench,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldCheck,
  ChevronRight,
  Trash2,
  Bell,
  Sparkles,
  Layers,
  Tag,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { HomePassportAsset } from '../../types';
import { homePassportService, APPLIANCE_CATEGORIES } from '../../services/homePassportService';

interface Props {
  onOpenBookService?: (categoryOrServiceName?: string) => void;
}

export const HomePassportView: React.FC<Props> = ({ onOpenBookService }) => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const [assets, setAssets] = useState<HomePassportAsset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Form states
  const [category, setCategory] = useState<string>(APPLIANCE_CATEGORIES[0].name);
  const [name, setName] = useState<string>('');
  const [householdName, setHouseholdName] = useState<string>('मुख्य घर (Main Residence)');
  const [address, setAddress] = useState<string>('Bhopal, Madhya Pradesh');
  const [brand, setBrand] = useState<string>('');
  const [modelNumber, setModelNumber] = useState<string>('');
  const [serialNumber, setSerialNumber] = useState<string>('');
  const [purchaseDate, setPurchaseDate] = useState<string>('');
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const loadAssets = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const list = await homePassportService.getAssetsForCustomer(currentUser.uid);
      setAssets(list);
    } catch (e) {
      console.warn('Error loading assets:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, [currentUser]);

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('कृपया उपकरण का नाम भरें।', 'warning');
      return;
    }
    if (!currentUser) return;

    setSaving(true);
    try {
      await homePassportService.createAsset({
        customerId: currentUser.uid,
        householdName,
        address,
        category,
        name: name.trim(),
        brand: brand.trim() || undefined,
        modelNumber: modelNumber.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
        purchaseDate: purchaseDate || undefined,
        reminderEnabled,
      });

      addToast('उपकरण पासपोर्ट में सुरक्षित जोड़ा गया!', 'success');
      setShowAddModal(false);
      setName('');
      setBrand('');
      setModelNumber('');
      setSerialNumber('');
      await loadAssets();
    } catch (err: any) {
      addToast(err.message || 'त्रुटि आई', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAsset = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('क्या आप इस उपकरण रिकॉर्ड को हटाना चाहते हैं?')) {
      await homePassportService.deleteAsset(id);
      addToast('उपकरण पासपोर्ट से हटाया गया।', 'info');
      await loadAssets();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 rounded-3xl p-5 sm:p-6 text-white shadow-lg shadow-orange-600/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/30 text-white shadow-xs">
            <Home className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-white/25 text-white text-[10px] font-black uppercase tracking-wider">
                डिजिटल होम सर्विस रिकॉर्ड
              </span>
              <span className="text-xs text-orange-100 font-medium">
                {assets.length} उपकरण पंजीकृत
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white mt-0.5">
              मेरा होम पासपोर्ट — My Home Passport
            </h2>
            <p className="text-xs text-white/85">
              घर के उपकरणों का सर्विस इतिहास, गारंटी वैधता और स्वचालित मेंटेनेंस अनुस्मारक।
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-white text-orange-950 hover:bg-orange-50 font-bold text-xs shadow-sm transition active:scale-95 flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4 text-orange-600" />
          <span>नया उपकरण जोड़ें (Add Appliance)</span>
        </button>
      </div>

      {/* Asset Cards Grid */}
      {loading ? (
        <div className="py-12 text-center text-stone-400">
          <Wrench className="w-8 h-8 animate-spin mx-auto mb-2 text-orange-600" />
          <p className="text-xs">होम पासपोर्ट लोड हो रहा है...</p>
        </div>
      ) : assets.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-8 sm:p-12 text-center max-w-md mx-auto shadow-xs space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto">
            <Home className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-base text-stone-800">
            अभी कोई उपकरण पंजीकृत नहीं है
          </h3>
          <p className="text-xs text-stone-500 leading-relaxed">
            अपने एसी, फ्रिज, वाटर प्यूरीफायर या वाशिंग मशीन को होम पासपोर्ट में जोड़ें ताकि उनकी नियमित सर्विस और गारंटी का डिजिटल रिकॉर्ड सुरक्षित रहे।
          </p>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition shadow-xs"
          >
            पहला उपकरण जोड़ें (Add First Asset)
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assets.map((asset) => {
            const hasDueMaintenance =
              asset.nextMaintenanceDate &&
              new Date(asset.nextMaintenanceDate).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;

            return (
              <div
                key={asset.id}
                className="bg-white rounded-3xl border border-stone-200 p-4 sm:p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  {/* Top Category Badge & Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                        {asset.category}
                      </span>
                      <h4 className="font-extrabold text-stone-900 text-sm sm:text-base mt-1">
                        {asset.name}
                      </h4>
                      {asset.brand && (
                        <span className="text-xs text-stone-500 font-medium">
                          {asset.brand} {asset.modelNumber ? `(${asset.modelNumber})` : ''}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteAsset(asset.id, e)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="उपकरण हटाएं"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Dates & Reminders */}
                  <div className="p-3 rounded-2xl bg-stone-50 border border-stone-100 space-y-1.5 text-xs text-stone-600">
                    <div className="flex items-center justify-between">
                      <span className="text-stone-400 text-[11px]">अंतिम सर्विस:</span>
                      <span className="font-semibold text-stone-800">
                        {asset.lastServiceDate
                          ? new Date(asset.lastServiceDate).toLocaleDateString()
                          : 'कोई रिकॉर्ड नहीं'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-stone-400 text-[11px]">अगली मेंटेनेंस तिथि:</span>
                      <span
                        className={`font-bold ${
                          hasDueMaintenance ? 'text-amber-700' : 'text-emerald-700'
                        }`}
                      >
                        {asset.nextMaintenanceDate
                          ? new Date(asset.nextMaintenanceDate).toLocaleDateString()
                          : 'स्वचालित गणना'}
                      </span>
                    </div>

                    {hasDueMaintenance && (
                      <div className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 flex items-center gap-1">
                        <Bell className="w-3 h-3 text-amber-700 shrink-0" />
                        <span>मेंटेनेंस समय आ गया है! (Maintenance Due)</span>
                      </div>
                    )}
                  </div>

                  {/* Service History Summary */}
                  <div>
                    <span className="text-[11px] font-bold text-stone-700 block mb-1">
                      सेवा इतिहास ({asset.serviceHistory?.length || 0} सर्विस):
                    </span>
                    {asset.serviceHistory && asset.serviceHistory.length > 0 ? (
                      <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                        {asset.serviceHistory.slice(0, 3).map((item, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded-xl bg-stone-50 text-[11px] flex items-center justify-between"
                          >
                            <div>
                              <span className="font-semibold text-stone-800 block">
                                {item.serviceName}
                              </span>
                              <span className="text-stone-400 text-[10px]">
                                {new Date(item.date).toLocaleDateString()} • {item.technicianName}
                              </span>
                            </div>
                            <span className="font-bold text-stone-700">₹{item.cost}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-stone-400 italic">
                        इस उपकरण के लिए अभी कोई सेवा इतिहास दर्ज नहीं है।
                      </p>
                    )}
                  </div>
                </div>

                {/* Instant Book CTA */}
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenBookService) {
                      onOpenBookService(asset.category);
                    }
                  }}
                  className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>सर्विस बुक करें (Book Service)</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Asset Modal */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs animate-fadeIn"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">
                    होम पासपोर्ट में उपकरण जोड़ें
                  </h3>
                  <p className="text-xs text-stone-500">
                    उपकरण का विवरण दर्ज करें ताकि सर्विस और गारंटी रिकॉर्ड रहे
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAsset} className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  उपकरण श्रेणी (Category) *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-300 bg-white"
                >
                  {APPLIANCE_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  उपकरण का नाम (Appliance Name) *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="उदा. मास्टर बेडरूम स्प्लिट एसी, किचन आरओ"
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-300"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    ब्रांड (Brand)
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="उदा. Daikin, LG, Voltas"
                    className="w-full p-2.5 text-xs rounded-xl border border-stone-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    मॉडल नंबर (Model)
                  </label>
                  <input
                    type="text"
                    value={modelNumber}
                    onChange={(e) => setModelNumber(e.target.value)}
                    placeholder="उदा. FTKP50TV16U"
                    className="w-full p-2.5 text-xs rounded-xl border border-stone-300"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  खरीद की तिथि (Purchase Date)
                </label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-300"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={reminderEnabled}
                  onChange={(e) => setReminderEnabled(e.target.checked)}
                  className="rounded text-orange-600 focus:ring-orange-500"
                />
                <span className="text-xs text-stone-700 font-medium">
                  नियमित मेंटेनेंस अनुस्मारक सक्षम करें (Enable Maintenance Alerts)
                </span>
              </label>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50"
                >
                  {saving ? 'सहेजा जा रहा है...' : 'पासपोर्ट में सहेजें (Save to Passport)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
