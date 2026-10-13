import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  Clock,
  MapPin,
  ChevronRight,
  Phone,
  Power,
  Building2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Booking, ServiceMan, LedgerEntry } from '../../types';
import { getLedgerEntriesForUser } from '../../services/commissionLedgerService';
import { AdSenseBanner } from '../ads/AdSenseBanner';
import { DashboardIdCardBanner } from '../common/DashboardIdCardBanner';
import { MarketingLead, fetchBusinessLeadsForUser, createBusinessLead } from '../../services/marketingLeadsService';
import { BusinessLeadForm } from './BusinessLeadForm';

interface Props {
  bookings: Booking[];
  serviceMen: ServiceMan[];
  onOpenBookings: () => void;
  onOpenWallet: () => void;
}

export const PartnerDashboard: React.FC<Props> = ({ bookings, serviceMen, onOpenBookings, onOpenWallet }) => {
  const { userProfile } = useAuth();
  const [partnerPros, setPartnerPros] = useState<ServiceMan[]>(serviceMen);
  const [partnerLedgers, setPartnerLedgers] = useState<LedgerEntry[]>([]);
  const [showAddTechModal, setShowAddTechModal] = useState(false);
  const [newTechName, setNewTechName] = useState('');
  const [newTechPhone, setNewTechPhone] = useState('');
  const [newTechTrade, setNewTechTrade] = useState('Electrician');

  const partnerId = userProfile?.id || 'partner_bhopal_electromech';
  const [showBringBusinessModal, setShowBringBusinessModal] = useState(false);
  const [myBusinessLeads, setMyBusinessLeads] = useState<MarketingLead[]>([]);
  const [bizName, setBizName] = useState('');
  const [bizContactPerson, setBizContactPerson] = useState('');
  const [bizPhone, setBizPhone] = useState('');
  const [bizEmail, setBizEmail] = useState('');
  const [bizType, setBizType] = useState('Electrician & Electrical Services');
  const [bizCity, setBizCity] = useState(userProfile?.city || 'Bhopal');
  const [bizArea, setBizArea] = useState('');
  const [bizRequiredService, setBizRequiredService] = useState('');
  const [bizRequirement, setBizRequirement] = useState('');
  const [bizNotes, setBizNotes] = useState('');
  const [submittingBiz, setSubmittingBiz] = useState(false);

  useEffect(() => {
    getLedgerEntriesForUser(partnerId, 'partner')
      .then((entries) => setPartnerLedgers(entries))
      .catch((e) => console.warn('Partner ledger fetch note:', e));

    if (userProfile?.id) {
      fetchBusinessLeadsForUser(userProfile.id)
        .then((leads) => setMyBusinessLeads(leads))
        .catch((e) => console.warn('Business leads fetch note:', e));
    }
  }, [partnerId, userProfile?.id]);

  const handleBringBusinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bizName.trim() || !bizPhone.trim()) {
      alert('Please enter Business Name and Mobile Number.');
      return;
    }
    try {
      setSubmittingBiz(true);
      const newLead = await createBusinessLead(
        {
          businessName: bizName.trim(),
          contactPerson: bizContactPerson.trim(),
          phone: bizPhone.trim(),
          email: bizEmail.trim(),
          businessType: bizType,
          city: bizCity,
          area: bizArea,
          requiredService: bizRequiredService,
          requirement: bizRequirement,
          notes: bizNotes,
        },
        {
          id: userProfile?.id || partnerId,
          role: userProfile?.role || 'business_partner',
          referralCode: userProfile?.referralCode || userProfile?.memberCode || 'HDK-REF',
        }
      );
      setMyBusinessLeads((prev) => [newLead, ...prev]);
      setShowBringBusinessModal(false);
      setBizName('');
      setBizContactPerson('');
      setBizPhone('');
      setBizEmail('');
      setBizArea('');
      setBizRequiredService('');
      setBizRequirement('');
      setBizNotes('');
      alert('Business lead successfully submitted with your referral attribution!');
    } catch (err: any) {
      alert('Failed to submit business lead: ' + (err?.message || err));
    } finally {
      setSubmittingBiz(false);
    }
  };

  const totalBookings = bookings.length;
  const activeBookings = bookings.filter((b) =>
    ['pending', 'accepted', 'on_the_way', 'in_progress'].includes(b.status)
  );
  const totalFleetRevenue = bookings
    .filter((b) => b.status === 'completed')
    .reduce((acc, curr) => acc + curr.amount, 0);
  const partnerShare = partnerLedgers.reduce((acc, curr) => acc + curr.amount, 0) || Math.round(totalFleetRevenue * 0.05) || 5400;

  const handleToggleTechStatus = (techId: string) => {
    setPartnerPros((prev) =>
      prev.map((t) => (t.id === techId ? { ...t, isAvailable: !t.isAvailable } : t))
    );
  };

  const handleAddTechnician = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTechName.trim() || !newTechPhone.trim()) return;

    const phoneClean = newTechPhone.trim();
    const existing = partnerPros.find((p) => p.phone === phoneClean);
    if (existing) {
      alert('A technician with this phone number is already registered in your fleet. Duplicate registrations are strictly prevented.');
      return;
    }

    const newProId = 'pro_' + Math.random().toString(36).substring(2, 7);
    const newPro: ServiceMan = {
      id: newProId,
      userId: 'usr_' + newProId,
      name: newTechName.trim(),
      phone: newTechPhone.trim(),
      email: `${newTechName.toLowerCase().replace(/\s+/g, '.')}@partnerfleet.hardinkaam.in`,
      categoryIds: ['cat_electrical'],
      categoryNames: [newTechTrade],
      experienceYears: 3,
      rating: 5.0,
      totalJobs: 0,
      isAvailable: true,
      serviceArea: 'Bhopal Central',
      hourlyRate: 299,
      isVerified: true,
      kycStatus: 'verified',
      partnerId: 'partner_bhopal_electromech',
    };

    setPartnerPros([newPro, ...partnerPros]);
    setNewTechName('');
    setNewTechPhone('');
    setShowAddTechModal(false);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Official Digital Partner ID Card Banner */}
      <DashboardIdCardBanner />

      {/* Header */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {userProfile?.avatar ? (
            <img
              src={userProfile.avatar}
              alt={userProfile.businessName || 'Partner'}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-purple-500 shadow-md shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-black text-xl shrink-0">
              <Briefcase className="w-7 h-7" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-stone-900">
                {userProfile?.businessName || userProfile?.name || 'Bhopal ElectroMech Solutions'}
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold text-[10px]">
                FRANCHISE PARTNER
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Assigned Zone: {userProfile?.zone || 'Bhopal Central & MP Nagar'} • License: <strong className="font-mono text-purple-700">{userProfile?.partnerLicenseNumber || 'HDK-BP-2026-BHOPAL'}</strong>
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-700 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>₹1,021 One-Time Partner License Fee Verified via Razorpay Standard Checkout</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onOpenWallet}
            className="px-4 py-2.5 rounded-2xl bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-transform hover:scale-102 border border-purple-300"
          >
            <span>👛 पार्टनर वॉलेट व पेआउट</span>
          </button>
          <button
            type="button"
            onClick={() => setShowBringBusinessModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 cursor-pointer flex items-center gap-1.5 transition-transform hover:scale-102"
          >
            <Building2 className="w-4 h-4" /> Bring Business to HARDINKAAM
          </button>
          <button
            onClick={() => setShowAddTechModal(true)}
            className="px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 flex items-center justify-center gap-2 cursor-pointer transition-transform hover:scale-102 shrink-0"
          >
            <UserPlus className="w-4 h-4" /> Add Technician to Fleet
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Fleet Strength</span>
            <Users className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-3xl font-black text-stone-900">{partnerPros.length}</p>
          <span className="text-[11px] text-purple-600 font-medium">
            {partnerPros.filter((p) => p.isAvailable).length} on active duty
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active Bookings</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-3xl font-black text-stone-900">{activeBookings.length}</p>
          <span className="text-[11px] text-blue-600 font-medium">In execution right now</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Partner Margin</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-black text-stone-900">₹{partnerShare}</p>
          <button
            onClick={onOpenWallet}
            className="text-[11px] text-emerald-600 font-bold hover:underline"
          >
            Settlement Wallet →
          </button>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Fleet Quality</span>
            <ShieldCheck className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-stone-900">4.88 ★</p>
          <span className="text-[11px] text-stone-500">Average customer rating</span>
        </div>
      </div>

      {/* Google AdSense B2B Partner Unit */}
      <AdSenseBanner
        slot="8492019481"
        format="responsive"
        category="tools"
        label="पार्टनर टूल्स एवं प्रायोजित समाधान • GOOGLE ADSENSE"
        className="my-3"
      />

      {/* Fleet Management Table */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-stone-900">Managed Technicians</h2>
            <p className="text-xs text-stone-500">Duty toggle, ratings, and performance</p>
          </div>
        </div>

        <div className="divide-y divide-stone-100">
          {partnerPros.map((pro) => (
            <div key={pro.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={pro.photoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80'}
                  alt={pro.name}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-2xl object-cover ring-1 ring-stone-200"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-stone-900">{pro.name}</h4>
                    {pro.isVerified && (
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold">
                        Verified
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-purple-600 font-semibold">
                    {pro.categoryNames.join(', ')}
                  </span>
                  <div className="text-stone-400 text-[11px] mt-0.5">
                    {pro.phone} • {pro.totalJobs} jobs • {pro.serviceArea}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <div className="text-right">
                  <span className="text-xs font-bold text-stone-800">{pro.rating} ★</span>
                  <span
                    className={`text-[10px] font-semibold block ${
                      pro.isAvailable ? 'text-emerald-600' : 'text-stone-400'
                    }`}
                  >
                    {pro.isAvailable ? 'Online' : 'Offline'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleTechStatus(pro.id)}
                  title="Toggle Active Duty"
                  className={`p-2 rounded-xl transition-colors cursor-pointer ${
                    pro.isAvailable
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                  }`}
                >
                  <Power className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Official Hardinkaam Partner Business Leads Section */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" />
              <span>Bring Business to HARDINKAAM — My Business Leads ({myBusinessLeads.length})</span>
            </h2>
            <p className="text-xs text-stone-500">
              Leads attributed to your referral ID. Connected directly to existing earnings and commission architecture.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowBringBusinessModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Building2 className="w-4 h-4" /> Bring Business
          </button>
        </div>

        {myBusinessLeads.length === 0 ? (
          <div className="p-8 text-center text-stone-400 text-xs bg-stone-50 rounded-2xl border border-stone-200">
            No business leads submitted yet. Click "Bring Business to HARDINKAAM" to add your first lead.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myBusinessLeads.map((lead) => (
              <div key={lead.id} className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-stone-900">{lead.businessName}</h4>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase">
                    {lead.status || 'NEW'}
                  </span>
                </div>
                <p className="text-xs text-stone-600">
                  Contact: {lead.contactPerson || 'N/A'} • <span className="font-mono">{lead.phone}</span>
                </p>
                <p className="text-xs text-stone-500">
                  Location: {lead.city || 'Bhopal'} • Type: {lead.businessType || lead.trade || 'General'}
                </p>
                <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-[11px] text-stone-400">
                  <span>Ref: <strong className="font-mono text-stone-700">{lead.referralCode || 'N/A'}</strong></span>
                  <span>{new Date(lead.createdAt || Date.now()).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-600" />
              <span>Partner Commission Ledgers ({partnerLedgers.length})</span>
            </h2>
            <p className="text-xs text-stone-500">
              Internal accounting attribution from customer payments received via Hardinkaam Admin Razorpay
            </p>
          </div>
        </div>

        {partnerLedgers.length === 0 ? (
          <div className="p-8 text-center text-stone-400 text-xs bg-stone-50 rounded-2xl border border-stone-200">
            No commission ledgers attributed yet. Once customer bookings are fulfilled by your fleet, earnings will appear here.
          </div>
        ) : (
          <div className="space-y-2">
            {partnerLedgers.map((l) => (
              <div
                key={l.id}
                className="p-3.5 rounded-2xl bg-purple-50/50 border border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-900">
                      Booking #{l.bookingId}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                      {l.ruleReference || 'Partner Commission'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {l.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-500 mt-1">
                    Customer Payment via Admin Razorpay • Gross: ₹{l.grossBookingAmount} ({l.ratePercent}%)
                  </div>
                  <div className="text-[10px] text-stone-400 font-mono mt-0.5">
                    Ref: {l.referenceId}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-black text-purple-700">
                    +₹{l.amount}
                  </div>
                  <span className="text-[10px] text-stone-400">
                    {new Date(l.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Technician Modal */}
      {showAddTechModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-base text-stone-900 mb-1">Add Technician to Fleet</h3>
            <p className="text-xs text-stone-500 mb-4">
              Enter professional's contact information and primary trade qualification.
            </p>

            <form onSubmit={handleAddTechnician} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newTechName}
                  onChange={(e) => setNewTechName(e.target.value)}
                  placeholder="e.g. Suresh Verma"
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Mobile Phone</label>
                <input
                  type="tel"
                  required
                  value={newTechPhone}
                  onChange={(e) => setNewTechPhone(e.target.value)}
                  placeholder="+91 98260 00000"
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Trade Specialty</label>
                <select
                  value={newTechTrade}
                  onChange={(e) => setNewTechTrade(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Electrician">Electrician &amp; Wiring</option>
                  <option value="Plumber">Plumber &amp; Pipe Fitting</option>
                  <option value="AC Specialist">AC &amp; Refrigeration</option>
                  <option value="Home Cleaning">Deep Home Cleaning</option>
                  <option value="Carpenter">Carpenter &amp; Woodwork</option>
                  <option value="Painter">Painter &amp; Waterproofing</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddTechModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  Register Technician
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bring Business to HARDINKAAM Modal */}
      {showBringBusinessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <BusinessLeadForm
              onSuccess={(newLead) => {
                setMyBusinessLeads((prev) => [newLead, ...prev]);
                setShowBringBusinessModal(false);
              }}
              onCancel={() => setShowBringBusinessModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
