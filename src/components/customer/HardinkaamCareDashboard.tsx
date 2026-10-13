import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  RotateCcw,
  Wrench,
  AlertCircle,
  CheckCircle2,
  Phone,
  User,
  Calendar,
  Award,
  Sparkles,
  HelpCircle,
  Plus,
} from 'lucide-react';
import { HardinkaamCarePolicy, CareComplaintRecord } from '../../types/care';
import { getCarePolicies, createCareComplaint, getCustomerCareComplaints } from '../../services/hardinkaamCareService';
import { useAuth } from '../../context/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  bookingId?: string;
}

export const HardinkaamCareDashboard: React.FC<Props> = ({ isOpen, onClose, bookingId }) => {
  const { currentUser, userProfile } = useAuth();
  const [policies, setPolicies] = useState<HardinkaamCarePolicy[]>([]);
  const [complaints, setComplaints] = useState<CareComplaintRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'protection' | 'raise_ticket' | 'my_tickets'>('protection');
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Ticket Form State
  const [complaintType, setComplaintType] = useState<CareComplaintRecord['complaintType']>('warranty');
  const [description, setDescription] = useState<string>('');
  const [targetBookingId, setTargetBookingId] = useState<string>(bookingId || '');

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    setLoading(true);
    try {
      const p = await getCarePolicies();
      setPolicies(p);
      if (currentUser?.uid) {
        const c = await getCustomerCareComplaints(currentUser.uid);
        setComplaints(c);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      alert('Please sign in to raise a HARDINKAAM CARE ticket.');
      return;
    }
    setLoading(true);
    try {
      await createCareComplaint({
        bookingId: targetBookingId || 'GENERAL_CARE',
        customerId: currentUser.uid,
        customerName: userProfile?.name || 'Customer',
        customerPhone: userProfile?.phone || '+91 98260 12345',
        complaintType,
        description,
      });
      setSuccessMsg('HARDINKAAM CARE ticket successfully raised! Our escalation desk will contact you within 2 hours.');
      setDescription('');
      if (currentUser?.uid) {
        const c = await getCustomerCareComplaints(currentUser.uid);
        setComplaints(c);
      }
      setActiveTab('my_tickets');
    } catch (err: any) {
      alert(err?.message || 'Error submitting ticket.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-stone-900 via-stone-800 to-teal-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider">HARDINKAAM CARE</span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">Customer Protection &amp; Warranty</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-white rounded-xl hover:bg-stone-800">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-200 bg-stone-50 px-6 pt-3 gap-6">
          <button
            onClick={() => setActiveTab('protection')}
            className={`pb-3 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'protection' ? 'border-teal-600 text-teal-600' : 'border-transparent text-stone-600'
            }`}
          >
            Active Warranty Policies
          </button>
          <button
            onClick={() => setActiveTab('raise_ticket')}
            className={`pb-3 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'raise_ticket' ? 'border-teal-600 text-teal-600' : 'border-transparent text-stone-600'
            }`}
          >
            + Raise Care Ticket (Rework / Revisit / Complaint)
          </button>
          <button
            onClick={() => setActiveTab('my_tickets')}
            className={`pb-3 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'my_tickets' ? 'border-teal-600 text-teal-600' : 'border-transparent text-stone-600'
            }`}
          >
            My Care Tickets ({complaints.length})
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

          {activeTab === 'protection' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                Configured Service Protection Standards
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {policies.map((p) => (
                  <div key={p.id} className="p-5 rounded-3xl border border-stone-200 bg-stone-50/70 space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-stone-900 text-sm">{p.categoryName}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                        {p.warrantyDurationMonths} Months Warranty
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-stone-600">
                      <div>Max Liability: <strong className="text-stone-900">₹{p.maxLiabilityRupees}</strong></div>
                      <div>Free Revisit Limit: <strong className="text-stone-900">{p.revisitLimit} Visits</strong></div>
                    </div>

                    <div className="pt-2 border-t border-stone-200">
                      <span className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Exclusions:</span>
                      <ul className="text-[11px] text-stone-600 space-y-0.5 list-disc pl-4">
                        {p.exclusions.map((exc, idx) => (
                          <li key={idx}>{exc}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'raise_ticket' && (
            <form onSubmit={handleTicketSubmit} className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Care Request Type</label>
                <select
                  value={complaintType}
                  onChange={(e) => setComplaintType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold bg-white"
                >
                  <option value="warranty">Warranty Claim (वॉरंटी क्लेम)</option>
                  <option value="revisit">Free Revisit Request (फ्री रीविजिट)</option>
                  <option value="rework">Quality Rework (क्वालिटी रीवर्क)</option>
                  <option value="replacement_serviceman">Request Replacement ServiceMan (टेक्नीशियन बदलें)</option>
                  <option value="escalation">Management Escalation (मैनेजमेंट एस्कलेशन)</option>
                  <option value="complaint">General Service Complaint (शिकायत दर्ज करें)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Booking Reference # (Optional)</label>
                <input
                  type="text"
                  value={targetBookingId}
                  onChange={(e) => setTargetBookingId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 font-mono text-xs"
                  placeholder="e.g. bk_1758..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Detailed Description of Issue</label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs"
                  placeholder="Describe what went wrong or why you need a revisit/rework..."
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
              >
                Submit Care Ticket
              </button>
            </form>
          )}

          {activeTab === 'my_tickets' && (
            <div className="space-y-3">
              {complaints.length === 0 ? (
                <div className="p-12 text-center text-stone-500 text-xs">No care tickets raised yet.</div>
              ) : (
                complaints.map((c) => (
                  <div key={c.id} className="p-4 rounded-2xl border border-stone-200 bg-white shadow-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-xs font-bold text-teal-700 uppercase">{c.complaintType}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800">
                        {c.status}
                      </span>
                    </div>
                    <p className="text-xs text-stone-800">{c.description}</p>
                    <div className="text-[10px] text-stone-400 font-mono flex justify-between">
                      <span>Booking: #{c.bookingId}</span>
                      <span>{new Date(c.createdAt).toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
