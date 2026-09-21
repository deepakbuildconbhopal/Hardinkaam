import React, { useState, useMemo } from 'react';
import {
  X,
  UserCheck,
  Search,
  CheckCircle2,
  Clock,
  Phone,
  MapPin,
  Star,
  Briefcase,
  AlertTriangle,
  Send,
  Sparkles,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { Booking, BookingStatus, ServiceMan } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  serviceMen: ServiceMan[];
  onDispatchSuccess?: (
    updatedBookingId: string,
    assignedPro: ServiceMan,
    newStatus: BookingStatus,
    notes?: string
  ) => void;
}

export const AdminDispatchProModal: React.FC<Props> = ({
  isOpen,
  onClose,
  booking,
  serviceMen,
  onDispatchSuccess,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'all' | 'matched' | 'available'>('all');
  const [selectedProId, setSelectedProId] = useState<string>('');
  const [statusUpdate, setStatusUpdate] = useState<BookingStatus | 'keep'>('keep');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Initialize selected pro when booking opens
  React.useEffect(() => {
    if (booking) {
      setSelectedProId(booking.serviceManId || '');
      // If booking was unassigned or pending, default next status to 'assigned'
      if (booking.status === 'pending' || !booking.serviceManId) {
        setStatusUpdate('assigned');
      } else {
        setStatusUpdate('keep');
      }
      setDispatchNotes('');
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [booking]);

  // Determine matching category from booking's service
  const matchedServiceKeywords = useMemo(() => {
    if (!booking) return [];
    const name = (booking.serviceName || '').toLowerCase();
    const words = name.split(/\s+/).filter((w) => w.length > 2);
    return words;
  }, [booking]);

  // Filter servicemen based on query and tabs
  const filteredServiceMen = useMemo(() => {
    return serviceMen.filter((pro) => {
      // Search text match
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        pro.name.toLowerCase().includes(query) ||
        pro.phone.includes(query) ||
        pro.categoryNames.some((c) => c.toLowerCase().includes(query)) ||
        (pro.serviceArea && pro.serviceArea.toLowerCase().includes(query));

      if (!matchesSearch) return false;

      // Filter tabs
      if (selectedCategoryFilter === 'available') {
        return pro.isAvailable !== false;
      }

      if (selectedCategoryFilter === 'matched') {
        if (matchedServiceKeywords.length === 0) return true;
        const proCategories = pro.categoryNames.join(' ').toLowerCase();
        return matchedServiceKeywords.some((keyword) => proCategories.includes(keyword));
      }

      return true;
    });
  }, [serviceMen, searchQuery, selectedCategoryFilter, matchedServiceKeywords]);

  if (!isOpen || !booking) return null;

  const selectedPro = serviceMen.find((p) => p.id === selectedProId);
  const isCurrentlyAssignedPro = selectedProId === booking.serviceManId;
  const isSimulationBooking = booking.id === 'SIM-BHOPAL-TEST';

  const handleConfirmDispatch = async () => {
    if (!selectedPro) {
      setErrorMessage('कृपया सेवा देने के लिए एक वेरिफाइड सर्विसमैन चुनें। (Please select a technician)');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const targetStatus: BookingStatus =
      statusUpdate === 'keep' ? booking.status : statusUpdate;

    try {
      if (isSimulationBooking) {
        // Immediate local mock update for testing without Firestore writes
        setSuccessMessage(`सिमुलेशन टेक्नीशियन सफलता से पुनः असाइन किया गया: ${selectedPro.name}`);
        setTimeout(() => {
          onDispatchSuccess?.(booking.id, selectedPro, targetStatus, dispatchNotes);
          setIsSubmitting(false);
          onClose();
        }, 600);
        return;
      }

      const now = new Date().toISOString();

      // 1. Update Booking record in Firestore
      try {
        await updateDoc(doc(db, 'bookings', booking.id), {
          serviceManId: selectedPro.id,
          serviceManName: selectedPro.name,
          serviceManPhone: selectedPro.phone,
          partnerId: selectedPro.partnerId || '',
          status: targetStatus,
          dispatchNotes: dispatchNotes.trim() || undefined,
          dispatchedAt: now,
          updatedAt: now,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `bookings/${booking.id}`);
      }

      // 2. Sync or update the Live Service Tracking document in Firestore
      try {
        await setDoc(
          doc(db, 'serviceTracking', booking.id),
          {
            bookingId: booking.id,
            serviceManId: selectedPro.id,
            serviceManName: selectedPro.name,
            serviceManPhone: selectedPro.phone,
            serviceName: booking.serviceName,
            customerName: booking.customerName,
            customerPhone: booking.customerPhone,
            status: targetStatus,
            updatedAt: now,
          },
          { merge: true }
        );
      } catch (trackErr) {
        // Non-fatal if tracking sync throws, log and continue
        console.warn('Tracking document sync notice:', trackErr);
      }

      setSuccessMessage(`सफलतापूर्वक असाइन किया गया: ${selectedPro.name}`);
      setTimeout(() => {
        onDispatchSuccess?.(booking.id, selectedPro, targetStatus, dispatchNotes);
        setIsSubmitting(false);
        onClose();
      }, 500);
    } catch (error) {
      console.error('Manual Pro Reassignment failed:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'पुनः असाइनमेंट विफल रहा। कृपया पुनः प्रयास करें।'
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="admin-dispatch-pro-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="admin-dispatch-pro-modal-content"
        className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-stone-200 overflow-hidden my-6 transition-all flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white flex items-center justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-900/40">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-white">
                  Dispatch Pro &amp; Reassign Technician
                </h3>
                {isSimulationBooking && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/30 text-amber-300 text-[10px] font-bold border border-amber-400/40 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    SIMULATION
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-400">
                मैन्युअल रूप से सर्विसमैन असाइन या पुनः असाइन करें
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="बंद करें (Close)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs text-stone-700 flex-1">
          {/* Feedback Banners */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 1. Target Booking Overview Card */}
          <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-stone-500 text-[11px]">
                    #{booking.id.slice(-6)}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-bold text-[10px]">
                    {booking.serviceName}
                  </span>
                </div>
                <h4 className="font-black text-stone-900 text-sm mt-1">
                  {booking.customerName}
                </h4>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-stone-400 uppercase font-bold block">Status</span>
                <span className="text-[11px] font-black uppercase text-stone-700">
                  {booking.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-stone-200/60 text-[11px] text-stone-600">
              <div className="flex items-center gap-1.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span className="truncate">{booking.address}, {booking.city}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span>{booking.scheduledDate} ({booking.scheduledTime})</span>
              </div>
            </div>

            {/* Current Pro Notice */}
            <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-[11px]">
              <span className="text-stone-500">वर्तमान असाइनमेंट:</span>
              <span className="font-bold text-stone-900">
                {booking.serviceManName ? (
                  <span className="text-stone-900 font-bold">
                    {booking.serviceManName} {booking.serviceManPhone && `(${booking.serviceManPhone})`}
                  </span>
                ) : (
                  <span className="text-amber-600 font-bold">⚠️ कोई टेक्नीशियन असाइन नहीं (Unassigned)</span>
                )}
              </span>
            </div>
          </div>

          {/* 2. Select New Technician Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-black text-stone-900 text-xs uppercase tracking-wider block">
                उपलब्ध सर्विस प्रोफेशनल्स ({filteredServiceMen.length})
              </label>
              <span className="text-[11px] text-stone-400">
                क्लिक करके टेक्नीशियन चुनें
              </span>
            </div>

            {/* Search and Filters */}
            <div className="space-y-2 mb-3">
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="नाम, फोन या ट्रेड (जैसे Plumber, Electrician, AC) से खोजें..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
                  >
                    साफ करें
                  </button>
                )}
              </div>

              {/* Filter Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    selectedCategoryFilter === 'all'
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  सभी प्रोफेशनल्स ({serviceMen.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter('matched')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    selectedCategoryFilter === 'matched'
                      ? 'bg-orange-600 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  संबंधित ट्रेड (Matching Trade)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter('available')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    selectedCategoryFilter === 'available'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  केवल उपलब्ध (Available Only)
                </button>
              </div>
            </div>

            {/* Service Men Scrollable List */}
            <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1 border border-stone-200 rounded-2xl p-2 bg-stone-50/50">
              {filteredServiceMen.length === 0 ? (
                <div className="py-8 text-center text-stone-400">
                  <p className="font-bold">कोई टेक्नीशियन नहीं मिला</p>
                  <p className="text-[11px] mt-0.5">सर्च शब्द बदलें या 'सभी प्रोफेशनल्स' चुनें।</p>
                </div>
              ) : (
                filteredServiceMen.map((pro) => {
                  const isSelected = selectedProId === pro.id;
                  const isCurrent = booking.serviceManId === pro.id;

                  return (
                    <div
                      key={pro.id}
                      onClick={() => setSelectedProId(pro.id)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50/80 shadow-xs ring-2 ring-orange-400/20'
                          : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'border-orange-600 bg-orange-600 text-white'
                              : 'border-stone-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-stone-900 text-xs truncate">
                              {pro.name}
                            </span>
                            {pro.isVerified && (
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            )}
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-stone-200 text-stone-700 shrink-0">
                                वर्तमान (Current)
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-stone-500 mt-0.5 flex-wrap">
                            <span className="font-semibold text-orange-600">
                              {pro.categoryNames.join(', ')}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                              <Star className="w-2.5 h-2.5 fill-current" />
                              <span>{pro.rating || 4.8}★</span>
                            </span>
                            <span>•</span>
                            <span>{pro.phone}</span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span
                          className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            pro.isAvailable !== false
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {pro.isAvailable !== false ? 'उपलब्ध (Ready)' : 'व्यस्त (Busy)'}
                        </span>
                        {pro.serviceArea && (
                          <span className="text-[9px] text-stone-400 block mt-0.5 truncate max-w-[110px]">
                            {pro.serviceArea}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 3. Dispatch Controls & Instructions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="font-bold text-stone-800 text-[11px] block mb-1">
                बुकिंग स्थिति अपडेट (Status Action)
              </label>
              <select
                value={statusUpdate}
                onChange={(e) => setStatusUpdate(e.target.value as BookingStatus | 'keep')}
                className="w-full p-2 text-xs rounded-xl border border-stone-200 bg-white"
              >
                <option value="keep">मौजूदा स्थिति रखें ({booking.status})</option>
                <option value="assigned">असाइन करें (Assigned / Accepted)</option>
                <option value="on_the_way">रास्ते में है (On The Way / En Route)</option>
                <option value="in_progress">कार्य प्रगति पर है (In Progress)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-stone-800 text-[11px] block mb-1">
                डिस्पैच निर्देश / नोट (वैकल्पिक)
              </label>
              <input
                type="text"
                value={dispatchNotes}
                onChange={(e) => setDispatchNotes(e.target.value)}
                placeholder="उदा. त्वरित पहुंचें, ग्राहक ने अनुरोध किया है..."
                className="w-full p-2 text-xs rounded-xl border border-stone-200 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-stone-500">
            {selectedPro ? (
              <span className="text-stone-800">
                चयनित: <strong>{selectedPro.name}</strong> ({selectedPro.categoryNames[0] || 'Technician'})
              </span>
            ) : (
              <span className="text-stone-400">कोई टेक्नीशियन चयनित नहीं है</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-200 transition-colors cursor-pointer"
            >
              रद्द करें (Cancel)
            </button>

            <button
              type="button"
              id="admin-confirm-dispatch-pro-btn"
              onClick={handleConfirmDispatch}
              disabled={!selectedProId || isSubmitting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-black flex items-center gap-1.5 transition-all shadow-md shadow-orange-900/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>डिस्पैच किया जा रहा है...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {isCurrentlyAssignedPro ? 'असाइनमेंट अपडेट करें' : '⚡ Dispatch Pro'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
