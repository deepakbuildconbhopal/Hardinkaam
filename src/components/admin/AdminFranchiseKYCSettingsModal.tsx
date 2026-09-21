import React, { useState, useEffect } from 'react';
import {
  Lock,
  ShieldCheck,
  Settings,
  CheckCircle2,
  AlertTriangle,
  FileText,
  X,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  FranchiseKYCSettings,
  KYCDocumentRequirementStatus,
} from '../../types';
import {
  getFranchiseKycSettings,
  updateFranchiseKycSettings,
  DEFAULT_KYC_SETTINGS,
} from '../../services/franchiseKycService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  adminName?: string;
}

export const AdminFranchiseKYCSettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  adminName = 'Super Admin DEEPAK',
}) => {
  const [settings, setSettings] = useState<FranchiseKYCSettings>(DEFAULT_KYC_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getFranchiseKycSettings();
      setSettings(data);
    } catch (err) {
      console.warn('Error fetching KYC settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSuccessMessage(null);
      setErrorMessage(null);

      // Enforce Gumasta remains permanently REQUIRED
      const payload: Partial<FranchiseKYCSettings> = {
        gumasta: 'REQUIRED',
        gst: settings.gst,
        aadhaar: settings.aadhaar,
        electricityBill: settings.electricityBill,
        otherCertificate: settings.otherCertificate,
      };

      const res = await updateFranchiseKycSettings(payload, adminName);
      if (res.success) {
        setSuccessMessage('Franchise KYC Document configuration updated successfully!');
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMessage(res.error || 'Failed to save KYC settings');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 space-y-5 animate-in fade-in zoom-in-95 duration-200 border border-stone-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-stone-900">
                Franchise KYC &amp; Document Settings
              </h3>
              <p className="text-xs text-stone-500 font-medium">
                Configure mandatory &amp; optional document rules across all districts
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Alerts */}
        {successMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-xs text-stone-500">
            लोड हो रहा है (Loading KYC settings)...
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            {/* 1. Gumasta - ALWAYS LOCKED AS REQUIRED */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-300 text-stone-900 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-stone-900">
                    1. Gumasta / Shop &amp; Establishment Certificate
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-xs">
                    <Lock className="w-2.5 h-2.5" /> REQUIRED 🔒
                  </span>
                </div>
                <p className="text-[11px] text-amber-950 font-medium mt-0.5">
                  गुमास्ता नगर निगम पंजीयन प्रमाण पत्र अनिवार्य है (Admin cannot disable).
                </p>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-amber-200/80 text-amber-950 text-xs font-black shrink-0 border border-amber-300">
                LOCKED (अनिवार्य)
              </div>
            </div>

            {/* 2. GST Certificate */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-stone-900">
                  2. GST Registration Certificate (जीएसटी प्रमाण पत्र)
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5">
                  Form GST REG-06 for commercial invoicing
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5 bg-white p-1 rounded-xl border border-stone-200 shrink-0">
                {(['REQUIRED', 'OPTIONAL', 'DISABLED'] as KYCDocumentRequirementStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSettings((prev) => ({ ...prev, gst: st }))}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition cursor-pointer ${
                      settings.gst === st
                        ? st === 'REQUIRED'
                          ? 'bg-orange-600 text-white shadow-xs'
                          : st === 'OPTIONAL'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-stone-600 text-white shadow-xs'
                        : 'text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Aadhaar Card */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-stone-900">
                  3. Aadhaar Card (आधार कार्ड - अधिकृत धारक)
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5">
                  Identity verification of authorized signatory
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5 bg-white p-1 rounded-xl border border-stone-200 shrink-0">
                {(['REQUIRED', 'OPTIONAL', 'DISABLED'] as KYCDocumentRequirementStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSettings((prev) => ({ ...prev, aadhaar: st }))}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition cursor-pointer ${
                      settings.aadhaar === st
                        ? st === 'REQUIRED'
                          ? 'bg-orange-600 text-white shadow-xs'
                          : st === 'OPTIONAL'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-stone-600 text-white shadow-xs'
                        : 'text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Electricity Bill */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-stone-900">
                  4. Electricity Bill (बिजली बिल - कार्यालय पता)
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5">
                  Physical office commercial address proof
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5 bg-white p-1 rounded-xl border border-stone-200 shrink-0">
                {(['REQUIRED', 'OPTIONAL', 'DISABLED'] as KYCDocumentRequirementStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSettings((prev) => ({ ...prev, electricityBill: st }))}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition cursor-pointer ${
                      settings.electricityBill === st
                        ? st === 'REQUIRED'
                          ? 'bg-orange-600 text-white shadow-xs'
                          : st === 'OPTIONAL'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-stone-600 text-white shadow-xs'
                        : 'text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Other Certificate */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-stone-900">
                  5. Other Certificate (अन्य प्रमाण पत्र / ट्रेड लाइसेंस)
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5">
                  MSME, Udyam, or local business authorizations
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5 bg-white p-1 rounded-xl border border-stone-200 shrink-0">
                {(['REQUIRED', 'OPTIONAL', 'DISABLED'] as KYCDocumentRequirementStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSettings((prev) => ({ ...prev, otherCertificate: st }))}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition cursor-pointer ${
                      settings.otherCertificate === st
                        ? st === 'REQUIRED'
                          ? 'bg-orange-600 text-white shadow-xs'
                          : st === 'OPTIONAL'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-stone-600 text-white shadow-xs'
                        : 'text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-stone-600 hover:bg-stone-100 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-black transition cursor-pointer shadow-md disabled:opacity-60"
              >
                {saving ? 'सहेजा जा रहा है...' : 'Save KYC Settings'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
