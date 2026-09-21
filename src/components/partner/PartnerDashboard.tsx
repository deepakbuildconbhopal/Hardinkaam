import React, { useState } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Booking, ServiceMan } from '../../types';
import { AdSenseBanner } from '../ads/AdSenseBanner';

interface Props {
  bookings: Booking[];
  serviceMen: ServiceMan[];
  onOpenBookings: () => void;
  onOpenWallet: () => void;
}

export const PartnerDashboard: React.FC<Props> = ({ bookings, serviceMen, onOpenBookings, onOpenWallet }) => {
  const { userProfile } = useAuth();
  const [partnerPros, setPartnerPros] = useState<ServiceMan[]>(serviceMen);
  const [showAddTechModal, setShowAddTechModal] = useState(false);
  const [newTechName, setNewTechName] = useState('');
  const [newTechPhone, setNewTechPhone] = useState('');
  const [newTechTrade, setNewTechTrade] = useState('Electrician');

  const totalBookings = bookings.length;
  const activeBookings = bookings.filter((b) =>
    ['pending', 'accepted', 'on_the_way', 'in_progress'].includes(b.status)
  );
  const totalFleetRevenue = bookings
    .filter((b) => b.status === 'completed')
    .reduce((acc, curr) => acc + curr.amount, 0);
  const partnerShare = Math.round(totalFleetRevenue * 0.15) || 5400;

  const handleToggleTechStatus = (techId: string) => {
    setPartnerPros((prev) =>
      prev.map((t) => (t.id === techId ? { ...t, isAvailable: !t.isAvailable } : t))
    );
  };

  const handleAddTechnician = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTechName.trim() || !newTechPhone.trim()) return;

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
      {/* Header */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-black text-xl shrink-0">
            <Briefcase className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-stone-900">
                {userProfile?.businessName || 'Bhopal ElectroMech Solutions'}
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

        <button
          onClick={() => setShowAddTechModal(true)}
          className="px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 flex items-center justify-center gap-2 cursor-pointer transition-transform hover:scale-102 shrink-0"
        >
          <UserPlus className="w-4 h-4" /> Add Technician to Fleet
        </button>
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
    </div>
  );
};
