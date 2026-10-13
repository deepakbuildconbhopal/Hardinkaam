import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Upload,
  Clock,
  UserCheck,
  Camera,
  Check,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UniversalImageUploader } from '../common/UniversalImageUploader';
import { AdSenseBanner } from '../ads/AdSenseBanner';

export const ProKYC: React.FC = () => {
  const { userProfile } = useAuth();
  const [aadhaar, setAadhaar] = useState('XXXX-XXXX-4819');
  const [pan, setPan] = useState('ABCDE1234F');
  const [tradeCert, setTradeCert] = useState('ITI Electrician Certificate #ET-9182');
  
  // New document photo uploads with automatic compression
  const [aadhaarPhoto, setAadhaarPhoto] = useState<string>('');
  const [panPhoto, setPanPhoto] = useState<string>('');
  const [tradePhoto, setTradePhoto] = useState<string>('');
  const [selfiePhoto, setSelfiePhoto] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveDocuments = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 4000);
  };

  return (
    <div className="space-y-6 pb-20 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
          Technician KYC &amp; Verification Status
        </h1>
        <p className="text-xs text-stone-500 mt-0.5">
          Mandatory background verification under the HARDINKAAM Safety &amp; Trust standard
        </p>
      </div>

      {/* KYC Status Badge Banner */}
      <div className="p-5 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-start gap-4">
        <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-700 flex-shrink-0">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-emerald-950">KYC Verified &amp; Active</h3>
            <span className="px-2 py-0.5 rounded-md bg-emerald-200 text-emerald-800 text-[10px] font-extrabold uppercase">
              APPROVED
            </span>
          </div>
          <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
            Your identity and trade credentials have been verified by the HARDINKAAM Admin team.
            You are eligible to receive customer booking dispatches in your service territory.
          </p>
        </div>
      </div>

      {/* Verified Credentials Summary */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 space-y-5 shadow-xs">
        <h2 className="text-sm font-bold text-stone-900 pb-3 border-b border-stone-100">
          Verified Credentials
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-stone-500" />
              <div>
                <span className="text-xs font-bold text-stone-800 block">Aadhaar Card (UIDAI)</span>
                <span className="text-[11px] text-stone-500 font-mono">{aadhaar}</span>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Verified
            </span>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-stone-500" />
              <div>
                <span className="text-xs font-bold text-stone-800 block">Permanent Account Number (PAN)</span>
                <span className="text-[11px] text-stone-500 font-mono">{pan}</span>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Verified
            </span>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-stone-500" />
              <div>
                <span className="text-xs font-bold text-stone-800 block">Trade Skill / ITI Certification</span>
                <span className="text-[11px] text-stone-500">{tradeCert}</span>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Verified
            </span>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
            <div className="flex items-center gap-3">
              <UserCheck className="w-5 h-5 text-stone-500" />
              <div>
                <span className="text-xs font-bold text-stone-800 block">Police Verification Record</span>
                <span className="text-[11px] text-stone-500">Clear record issued by MP Police Bhopal</span>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Cleared
            </span>
          </div>
        </div>
      </div>

      {/* Document Upload & Photo Refresh (With automatic client compression for fast mobile upload) */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 space-y-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div>
            <h2 className="text-sm font-bold text-stone-900">
              अपडेटेड डाक्यूमेंट्स &amp; लाइव फोटो अपलोड
            </h2>
            <p className="text-[11px] text-stone-500 mt-0.5">
              कैमरा से खींची गई भारी फोटो (10MB) भी वेबसाइट के अनुसार ऑटो कंप्रेस होकर 1-सेकंड में अपलोड होगी
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-orange-600" />
            <span>ऑटो-कंप्रेशन चालू</span>
          </span>
        </div>

        <form onSubmit={handleSaveDocuments} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UniversalImageUploader
              label="आधार कार्ड फोटो (Front / Back)"
              subLabel="Aadhaar Card copy"
              currentValue={aadhaarPhoto}
              onChange={setAadhaarPhoto}
              maxDimension={1100}
              quality={0.82}
              maxSizeKB={280}
              aspectRatio="wide"
              helperTip="कैमरा या गैलरी से आधार फोटो — ऑटो-कंप्रेस्ड &amp; सुरक्षित"
            />

            <UniversalImageUploader
              label="पैन कार्ड फोटो"
              subLabel="PAN Card copy"
              currentValue={panPhoto}
              onChange={setPanPhoto}
              maxDimension={1100}
              quality={0.82}
              maxSizeKB={280}
              aspectRatio="wide"
              helperTip="स्पष्ट पैन कार्ड फोटो अपलोड करें"
            />

            <UniversalImageUploader
              label="आईटीआई / ट्रेड स्किल सर्टिफिकेट"
              subLabel="Skill or Experience Certificate"
              currentValue={tradePhoto}
              onChange={setTradePhoto}
              maxDimension={1200}
              quality={0.82}
              maxSizeKB={300}
              aspectRatio="wide"
              helperTip="सर्टिफिकेट / डिप्लोमा फोटो"
            />

            <UniversalImageUploader
              label="टेक्नीशियन सेल्फी / प्रोफाइल फोटो"
              subLabel="Live Selfie for Hardinkaam ID Card"
              currentValue={selfiePhoto}
              onChange={setSelfiePhoto}
              maxDimension={800}
              quality={0.85}
              maxSizeKB={200}
              aspectRatio="square"
              helperTip="आईडी कार्ड के लिए चेहरे की स्पष्ट फोटो"
            />
          </div>

          {saveSuccess && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>दस्तावेज सफलतापूर्वक कंप्रेस होकर अपडेट हो गए हैं!</span>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>कंप्रेस्ड डाक्यूमेंट्स सेव करें</span>
            </button>
          </div>
        </form>
      </div>

      {/* Google AdSense Intact Unit */}
      <AdSenseBanner
        slot="9182736450"
        format="leaderboard"
        category="tools"
        label="गूगल एडसेंस • PRO VERIFICATION SPONSOR"
      />
    </div>
  );
};
