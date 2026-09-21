import React from 'react';
import { X, Star, ShieldCheck, MapPin, Briefcase, Clock, Phone, Award, CheckCircle } from 'lucide-react';
import { ServiceMan, Service } from '../../types';
import { ProReviewsList } from './ReviewComponent';
import { LazyImage } from '../common/LazyImage';

interface Props {
  pro: ServiceMan | null;
  onClose: () => void;
  services: Service[];
  onBookPro: (service: Service, pro: ServiceMan) => void;
}

export const ProfessionalProfileModal: React.FC<Props> = ({ pro, onClose, services, onBookPro }) => {
  if (!pro) return null;

  const proServices = services.filter((s) => pro.categoryIds.includes(s.categoryId));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div
        id="pro-profile-modal"
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-stone-200 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="relative bg-gradient-to-br from-stone-900 via-stone-800 to-orange-950 p-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            <LazyImage
              src={pro.photoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80'}
              alt={pro.name}
              className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white/20 shadow-lg"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">{pro.name}</h2>
                {pro.isVerified && (
                  <span className="p-1 rounded-full bg-blue-500 text-white" title="Verified Professional">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
              <p className="text-orange-400 font-semibold text-xs mt-0.5">
                {pro.categoryNames.join(' • ')} Specialist
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs">
                <span className="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 font-bold flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {pro.rating}
                </span>
                <span className="text-stone-300">({pro.totalJobs} completed jobs)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-2 bg-stone-50 p-3 rounded-2xl border border-stone-200/80 text-center">
            <div>
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Experience</span>
              <span className="text-sm font-bold text-stone-800">{pro.experienceYears}+ Years</span>
            </div>
            <div className="border-x border-stone-200">
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Status</span>
              <span className={`text-sm font-bold ${pro.isAvailable ? 'text-emerald-600' : 'text-stone-500'}`}>
                {pro.isAvailable ? 'Available' : 'Offline'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Base Rate</span>
              <span className="text-sm font-bold text-stone-800">₹{pro.hourlyRate}/hr</span>
            </div>
          </div>

          {/* Service Area & Verification */}
          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2.5 text-stone-700">
              <MapPin className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-stone-900 block">Service Coverage Area</span>
                <span className="text-stone-500">{pro.serviceArea}</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-stone-700 pt-2 border-t border-stone-100">
              <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-stone-900 block">HARDINKAAM Verified &amp; Background Checked</span>
                <span className="text-stone-500">
                  Govt. ID (Aadhaar/PAN) and trade qualifications verified by admin.
                </span>
              </div>
            </div>
          </div>

          {/* Services offered by this pro */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
              Services Handled by {pro.name}
            </h3>
            <div className="space-y-2">
              {(proServices.length > 0 ? proServices : services.slice(0, 3)).map((srv) => (
                <div
                  key={srv.id}
                  className="p-3 rounded-xl border border-stone-200 hover:border-orange-300 flex items-center justify-between gap-2"
                >
                  <div>
                    <h4 className="text-xs font-bold text-stone-800">{srv.name}</h4>
                    <span className="text-[11px] text-stone-500">₹{srv.basePrice} • {srv.durationMinutes} mins</span>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onBookPro(srv, pro);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                  >
                    Select &amp; Book
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Customer Reviews & Feedback */}
          <div className="pt-4 border-t border-stone-200/80">
            <ProReviewsList pro={pro} />
          </div>
        </div>
      </div>
    </div>
  );
};
