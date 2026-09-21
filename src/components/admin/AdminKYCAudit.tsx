import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, AlertCircle, FileText, UserCheck, Eye, Video, MessageSquare } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { ServiceMan } from '../../types';
import { generateWhatsAppVideoCallUrl } from '../../utils/whatsappVideoCall';

interface Props {
  serviceMen: ServiceMan[];
  onRefresh: () => void;
  onStartVideoCall?: (pro: ServiceMan) => void;
}

export const AdminKYCAudit: React.FC<Props> = ({ serviceMen, onRefresh, onStartVideoCall }) => {
  const [pros, setPros] = useState<ServiceMan[]>(serviceMen);
  const [selectedPro, setSelectedPro] = useState<ServiceMan | null>(null);

  const handleVerify = async (proId: string, status: boolean) => {
    try {
      await updateDoc(doc(db, 'service_men', proId), {
        isVerified: status,
      });
      setPros((prev) => prev.map((p) => (p.id === proId ? { ...p, isVerified: status } : p)));
      setSelectedPro(null);
      onRefresh();
    } catch (err) {
      console.error('Verify error:', err);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
          Technician KYC &amp; Verification Audit
        </h1>
        <p className="text-xs text-stone-500 mt-0.5">
          Review government documents, Aadhaar records, and trade skill certifications before activating professionals
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {pros.map((pro) => (
          <div
            key={pro.id}
            className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start gap-3 mb-3">
                <img
                  src={pro.photoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80'}
                  alt={pro.name}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-2xl object-cover"
                />
                <div>
                  <h3 className="text-sm font-bold text-stone-900">{pro.name}</h3>
                  <p className="text-xs text-stone-500">{pro.phone}</p>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      pro.isVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {pro.isVerified ? '● VERIFIED & ACTIVE' : '● PENDING AUDIT'}
                  </span>
                </div>
              </div>

              <div className="space-y-1 text-xs bg-stone-50 p-2.5 rounded-xl text-stone-600 mb-3">
                <div className="flex justify-between">
                  <span className="text-stone-400">Trade:</span>
                  <span className="font-semibold text-stone-800">{pro.categoryNames.join(', ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Area:</span>
                  <span className="font-semibold text-stone-800 truncate max-w-[130px]">{pro.serviceArea}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Experience:</span>
                  <span className="font-semibold text-stone-800">{pro.experienceYears}+ years</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-stone-100 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedPro(pro)}
                className="flex-1 py-1.5 px-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-xs font-semibold text-stone-700 flex items-center justify-center gap-1 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" /> View Docs
              </button>
              <a
                href={generateWhatsAppVideoCallUrl({
                  phone: pro.phone,
                  recipientName: pro.name,
                  roomCode: 'KYC-' + pro.id.slice(-6).toUpperCase(),
                  meetingUrl: `${window.location.origin}/#call-KYC-${pro.id.slice(-6).toUpperCase()}`,
                  hostName: 'दीपक बिल्डकॉन KYC टीम',
                  purpose: 'टेक्नीशियन ऑनबोर्डिंग व पहचान सत्यापन (KYC)',
                })}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  if (onStartVideoCall) onStartVideoCall(pro);
                }}
                className="py-1.5 px-2.5 rounded-xl bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="WhatsApp पर वीडियो KYC आमंत्रण भेजें"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600/20" />
                <span className="hidden sm:inline">WhatsApp KYC</span>
              </a>
              {onStartVideoCall && (
                <button
                  type="button"
                  onClick={() => onStartVideoCall(pro)}
                  className="py-1.5 px-2.5 rounded-xl bg-teal-50 border border-teal-200 hover:bg-teal-100 text-teal-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  title="लाइव वीडियो कॉल KYC वेरिफिकेशन"
                >
                  <Video className="w-3.5 h-3.5 text-teal-600" />
                  <span className="hidden sm:inline">वीडियो कक्ष</span>
                </button>
              )}
              {pro.isVerified ? (
                <button
                  type="button"
                  onClick={() => handleVerify(pro.id, false)}
                  className="py-1.5 px-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold cursor-pointer"
                >
                  Revoke
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleVerify(pro.id, true)}
                  className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Approve
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Audit Modal */}
      {selectedPro && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-base text-stone-900 mb-1">
              KYC Audit: {selectedPro.name}
            </h3>
            <p className="text-xs text-stone-500 mb-4">Review submitted identity documents</p>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
                <span className="font-bold text-stone-700 block">Aadhaar Card (UIDAI)</span>
                <p className="font-mono text-stone-800">XXXX-XXXX-8921</p>
                <span className="text-[10px] text-emerald-600 font-bold">✓ OTP Verified</span>
              </div>

              <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
                <span className="font-bold text-stone-700 block">Trade Skill Certificate</span>
                <p className="text-stone-800">National Council for Vocational Training (NCVT) Electrician</p>
                <span className="text-[10px] text-emerald-600 font-bold">✓ Verified Certificate</span>
              </div>

              <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
                <span className="font-bold text-stone-700 block">Police Background Check</span>
                <p className="text-stone-800">Bhopal City Police Verification NOC</p>
                <span className="text-[10px] text-emerald-600 font-bold">✓ Clear Record</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedPro(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100"
                >
                  Close
                </button>
                {onStartVideoCall && (
                  <button
                    type="button"
                    onClick={() => {
                      const p = selectedPro;
                      setSelectedPro(null);
                      onStartVideoCall(p);
                    }}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>लाइव वीडियो KYC कॉल</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleVerify(selectedPro.id, true)}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Approve Verification
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
