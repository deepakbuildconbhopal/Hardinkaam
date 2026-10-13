import React, { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  Camera,
  Video,
  CheckCircle2,
  AlertCircle,
  Building2,
  DollarSign,
  Star,
  ShieldCheck,
  Calendar,
  Clock,
  ArrowRight,
  X,
  MessageSquare,
  Users,
  Check,
} from 'lucide-react';
import { RfqCategory, RfqRequest, ProfessionalQuote, RfqUrgency } from '../../types/rfq';
import {
  createRfqRequest,
  getCustomerRfqs,
  getQuotesForRfq,
  acceptQuoteAndHire,
  submitProfessionalQuote,
} from '../../services/rfqService';
import { useAuth } from '../../context/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: RfqCategory;
  initialDescription?: string;
}

const RFQ_CATEGORIES: { id: RfqCategory; label: string; icon: string }[] = [
  { id: 'painting', label: 'Painting & Waterproofing (पेंटिंग व वॉटरप्रूफिंग)', icon: '🎨' },
  { id: 'renovation', label: 'Full Home Renovation (घर का नवीनीकरण)', icon: '🏗️' },
  { id: 'waterproofing', label: 'Roof Seepage & Waterproofing (सीपेज रोकथाम)', icon: '💧' },
  { id: 'modular_work', label: 'Modular Kitchen & Wardrobe (मॉड्यूलर किचन)', icon: '🪑' },
  { id: 'civil_work', label: 'Civil Work & Tiling (सिविल कार्य व टाइल्स)', icon: '🧱' },
  { id: 'interior', label: 'Interior Design & False Ceiling (इंटीरियर डिजाइन)', icon: '✨' },
  { id: 'large_electrical_plumbing', label: 'Large Electrical / Plumbing (बड़ी फिटिंग)', icon: '⚡' },
];

export const GetMultipleQuotesModal: React.FC<Props> = ({
  isOpen,
  onClose,
  initialCategory,
  initialDescription,
}) => {
  const { currentUser, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'new_rfq' | 'my_rfqs'>('new_rfq');
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [category, setCategory] = useState<RfqCategory>(initialCategory || 'painting');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>(initialDescription || '');
  const [urgency, setUrgency] = useState<RfqUrgency>('within_2_days');
  const [address, setAddress] = useState<string>(userProfile?.address || 'Bhopal, M.P.');
  const [pincode, setPincode] = useState<string>('462011');
  const [mediaFileUrl, setMediaFileUrl] = useState<string>('');

  // Customer RFQs & Quotes State
  const [customerRfqs, setCustomerRfqs] = useState<RfqRequest[]>([]);
  const [selectedRfqForQuotes, setSelectedRfqForQuotes] = useState<RfqRequest | null>(null);
  const [quotesList, setQuotesList] = useState<ProfessionalQuote[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState<boolean>(false);

  useEffect(() => {
    if (currentUser?.uid) {
      loadCustomerRfqs();
    }
  }, [currentUser]);

  const loadCustomerRfqs = async () => {
    if (!currentUser?.uid) return;
    const rfqs = await getCustomerRfqs(currentUser.uid);
    setCustomerRfqs(rfqs);
    if (rfqs.length > 0 && !selectedRfqForQuotes) {
      setSelectedRfqForQuotes(rfqs[0]);
      fetchQuotes(rfqs[0].id);
    }
  };

  const fetchQuotes = async (rfqId: string) => {
    setLoadingQuotes(true);
    try {
      const q = await getQuotesForRfq(rfqId);
      setQuotesList(q);
    } finally {
      setLoadingQuotes(false);
    }
  };

  const handleCreateRfq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      alert('Please sign in to submit a Get Multiple Quotes request.');
      return;
    }

    setLoading(true);
    setSuccessMsg(null);

    try {
      const catObj = RFQ_CATEGORIES.find((c) => c.id === category);
      const newRfq = await createRfqRequest({
        customerId: currentUser.uid,
        customerName: userProfile?.name || 'Customer',
        customerPhone: userProfile?.phone || '+91 98260 12345',
        category,
        categoryLabel: catObj?.label || 'Custom Work',
        title: title || `${catObj?.label || 'Project'} Requirement`,
        description,
        urgency,
        attachments: mediaFileUrl ? [{ type: 'image', url: mediaFileUrl }] : [],
        location: {
          address,
          city: 'Bhopal',
          pincode,
        },
      });

      // Simulate a demo professional quote automatically generated for great user experience
      await submitProfessionalQuote({
        rfqId: newRfq.id,
        professionalId: 'pro_contractor_rajesh',
        professionalName: 'Rajesh Construction & Interiors',
        professionalPhone: '+91 98260 99887',
        professionalRating: 4.9,
        professionalTrade: catObj?.label || 'General Contractor',
        quotedAmount: 14500,
        estimatedDays: 4,
        materialsIncluded: true,
        warrantyMonths: 12,
        proposalDetails: 'Includes premium materials, skilled labor supervision, and 1-year HARDINKAAM workmanship warranty.',
      });

      setSuccessMsg('RFQ successfully broadcast to verified professionals! Sample quote received.');
      await loadCustomerRfqs();
      setSelectedRfqForQuotes(newRfq);
      fetchQuotes(newRfq.id);
      setActiveTab('my_rfqs');
    } catch (err: any) {
      alert(err?.message || 'Failed to submit RFQ.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptQuote = async (rfqId: string, quoteId: string) => {
    if (confirm('Are you sure you want to accept this quote and hire the professional?')) {
      await acceptQuoteAndHire(rfqId, quoteId);
      alert('Professional hired successfully! Proceeding to HARDINKAAM secure payment gateway.');
      loadCustomerRfqs();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-stone-900 via-stone-800 to-orange-950 text-white flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 text-xs font-semibold mb-2">
              <Users className="w-3.5 h-3.5" /> बड़े प्रोजेक्ट्स के लिए कई कोट्स (Get Multiple Quotes)
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Compare Verified Quotes &amp; Hire Top Contractors
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white rounded-xl hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-200 bg-stone-50 px-6 pt-3 gap-6">
          <button
            onClick={() => setActiveTab('new_rfq')}
            className={`pb-3 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'new_rfq' ? 'border-orange-600 text-orange-600' : 'border-transparent text-stone-600'
            }`}
          >
            + New RFQ Request
          </button>
          <button
            onClick={() => setActiveTab('my_rfqs')}
            className={`pb-3 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'my_rfqs' ? 'border-orange-600 text-orange-600' : 'border-transparent text-stone-600'
            }`}
          >
            My RFQs &amp; Received Quotes ({customerRfqs.length})
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {activeTab === 'new_rfq' ? (
            <form onSubmit={handleCreateRfq} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-2">Select Project Category</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {RFQ_CATEGORIES.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => setCategory(c.id)}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 ${
                        category === c.id
                          ? 'border-orange-600 bg-orange-50/70 shadow-xs ring-2 ring-orange-500/20'
                          : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <span className="text-xl">{c.icon}</span>
                      <span className="text-xs font-bold text-stone-900">{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Project Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold"
                    placeholder="e.g. 3 BHK Full Apartment Painting in Arera Colony"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Urgency</label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold bg-white"
                  >
                    <option value="immediate">Immediate (Within 24 Hours)</option>
                    <option value="within_2_days">Within 2 Days</option>
                    <option value="this_week">This Week</option>
                    <option value="flexible">Flexible Schedule</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Detailed Requirements &amp; Scope</label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs"
                  placeholder="Describe dimensions, wall condition, material preference, or specific work required..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Site Address &amp; City</label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    required
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    maxLength={6}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Photo / Video Evidence (Optional URL)</label>
                <input
                  type="url"
                  value={mediaFileUrl}
                  onChange={(e) => setMediaFileUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs"
                  placeholder="https://images.unsplash.com/photo-..."
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-2xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Users className="w-4 h-4" />
                {loading ? 'Broadcasting RFQ...' : '🚀 Broadcast RFQ & Get Multiple Quotes'}
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              {customerRfqs.length === 0 ? (
                <div className="p-12 text-center text-stone-500">
                  <FileText className="w-10 h-10 text-stone-400 mx-auto mb-2" />
                  <p className="text-xs font-bold">No RFQ requests submitted yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* RFQ List */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider">Your RFQ Projects</h3>
                    {customerRfqs.map((rfq) => (
                      <div
                        key={rfq.id}
                        onClick={() => {
                          setSelectedRfqForQuotes(rfq);
                          fetchQuotes(rfq.id);
                        }}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          selectedRfqForQuotes?.id === rfq.id
                            ? 'border-orange-600 bg-orange-50/70 shadow-xs'
                            : 'border-stone-200 hover:border-stone-300 bg-white'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[10px] font-mono font-bold text-orange-600 uppercase">
                            {rfq.category}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                            {rfq.status}
                          </span>
                        </div>
                        <h4 className="font-bold text-stone-900 text-xs">{rfq.title}</h4>
                        <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">{rfq.description}</p>
                      </div>
                    ))}
                  </div>

                  {/* Quotes Comparison View */}
                  <div className="md:col-span-2 space-y-4 bg-stone-50 p-5 rounded-3xl border border-stone-200">
                    {selectedRfqForQuotes ? (
                      <div>
                        <div className="flex items-center justify-between border-b border-stone-200 pb-3 mb-4">
                          <div>
                            <h3 className="text-sm font-black text-stone-900">{selectedRfqForQuotes.title}</h3>
                            <span className="text-xs text-stone-500">{selectedRfqForQuotes.location.address}</span>
                          </div>
                          <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800">
                            {quotesList.length} Quotes Received
                          </span>
                        </div>

                        {loadingQuotes ? (
                          <div className="py-8 text-center text-stone-500 text-xs">Loading quotes...</div>
                        ) : quotesList.length === 0 ? (
                          <div className="py-8 text-center text-stone-500 text-xs">
                            Waiting for verified contractors to submit competitive bids...
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {quotesList.map((q) => (
                              <div
                                key={q.id}
                                className={`p-4 rounded-2xl border bg-white shadow-xs space-y-3 ${
                                  q.status === 'ACCEPTED' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-stone-200'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
                                      <span>{q.professionalName}</span>
                                      <span className="text-xs font-bold text-amber-600 flex items-center">
                                        <Star className="w-3 h-3 fill-amber-500 text-amber-500 mr-0.5" />{' '}
                                        {q.professionalRating}
                                      </span>
                                    </div>
                                    <span className="text-[11px] text-stone-500">{q.professionalTrade}</span>
                                  </div>

                                  <div className="text-right">
                                    <span className="font-mono font-black text-lg text-orange-600">
                                      ₹{q.quotedAmount}
                                    </span>
                                    <span className="block text-[10px] text-stone-500 font-semibold">
                                      Estimated: {q.estimatedDays} Days
                                    </span>
                                  </div>
                                </div>

                                <p className="text-xs text-stone-700 bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                                  {q.proposalDetails}
                                </p>

                                <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                                  <div className="flex items-center gap-3 text-stone-600">
                                    <span>Materials Included: <strong>{q.materialsIncluded ? 'Yes' : 'No'}</strong></span>
                                    <span>Warranty: <strong>{q.warrantyMonths} Months</strong></span>
                                  </div>

                                  {q.status === 'ACCEPTED' ? (
                                    <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                                      <Check className="w-4 h-4" /> Hired &amp; Confirmed
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleAcceptQuote(selectedRfqForQuotes.id, q.id)}
                                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs transition-colors flex items-center gap-1"
                                    >
                                      <span>Accept &amp; Hire</span>
                                      <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-12 text-center text-stone-400 text-xs">Select an RFQ to compare quotes.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
