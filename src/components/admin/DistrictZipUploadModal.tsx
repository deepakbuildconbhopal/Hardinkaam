import React, { useState, useRef } from 'react';
import {
  FileArchive,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  X,
  Eye,
  FileText,
  Image as ImageIcon,
  Sliders,
  Check,
  Building2,
  MapPin,
  RefreshCw,
  Sparkles,
  Lock,
} from 'lucide-react';
import {
  validateDistrictZip,
  commitApprovedDistrictZip,
  DistrictZipValidationResult,
} from '../../services/districtZipService';
import { ALL_INDIA_LOCATIONS } from '../../data/indiaLocations';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultDistrictId?: string;
  defaultDistrictName?: string;
  onImportSuccess?: (districtId: string, result: DistrictZipValidationResult) => void;
}

export const DistrictZipUploadModal: React.FC<Props> = ({
  isOpen,
  onClose,
  defaultDistrictId = 'gwalior',
  defaultDistrictName = 'Gwalior',
  onImportSuccess,
}) => {
  const [selectedDistrict, setSelectedDistrict] = useState(defaultDistrictId);
  const [selectedState, setSelectedState] = useState('Madhya Pradesh');
  const [file, setFile] = useState<File | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<DistrictZipValidationResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<'all' | 'images' | 'config'>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Derive districts for selected state
  const currentStateObj = ALL_INDIA_LOCATIONS.find((s) => s.state === selectedState);
  const availableDistricts = currentStateObj ? currentStateObj.districts : [];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      await processSelectedFile(selected);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      await processSelectedFile(dropped);
    }
  };

  const processSelectedFile = async (zipFile: File) => {
    if (!zipFile.name.toLowerCase().endsWith('.zip')) {
      alert('कृपया केवल .zip फ़ाइल चुनें (Please select a .zip archive).');
      return;
    }
    setFile(zipFile);
    setValidating(true);
    setImportSuccess(false);
    setImportError(null);

    const distObj = availableDistricts.find((d) => d.district.toLowerCase() === selectedDistrict.toLowerCase());
    const distName = distObj ? distObj.district : selectedDistrict;

    try {
      const res = await validateDistrictZip(zipFile, selectedDistrict, distName);
      setValidationResult(res);
    } catch (err: any) {
      setImportError(err.message || 'ZIP सत्यापन में त्रुटि हुई');
    } finally {
      setValidating(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!validationResult || !validationResult.isValid) return;
    setImporting(true);
    setImportError(null);
    try {
      const res = await commitApprovedDistrictZip(validationResult, file!);
      if (res.success) {
        setImportSuccess(true);
        if (onImportSuccess) {
          onImportSuccess(selectedDistrict, validationResult);
        }
      } else {
        setImportError(res.error || 'आयात विफल रहा');
      }
    } catch (err: any) {
      setImportError(err.message || 'आयात करते समय त्रुटि हुई');
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setValidationResult(null);
    setImportSuccess(false);
    setImportError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-orange-950 text-white p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 border border-orange-400 flex items-center justify-center text-orange-400">
              <FileArchive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  🛡️ सुरक्षित डेटा/एसेट इम्पोर्टर
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black mt-1">
                जिला ZIP पैकेज अपलोड एवं सत्यापन (District ZIP Upload)
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-stone-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-stone-800 flex-1">
          {/* Step 1: District Selection */}
          <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200">
            <div className="flex items-center gap-2 text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
              <MapPin className="w-4 h-4 text-orange-600" />
              <span>चरण 1: लक्षित जिला व राज्य का चयन करें (Target District Selection)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">राज्य (State)</label>
                <select
                  value={selectedState}
                  onChange={(e) => {
                    setSelectedState(e.target.value);
                    const stateObj = ALL_INDIA_LOCATIONS.find((s) => s.state === e.target.value);
                    if (stateObj && stateObj.districts.length > 0) {
                      setSelectedDistrict(stateObj.districts[0].district);
                    }
                    handleReset();
                  }}
                  className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {ALL_INDIA_LOCATIONS.map((s) => (
                    <option key={s.state} value={s.state}>
                      {s.hindiState} ({s.state})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">जिला (District)</label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => {
                    setSelectedDistrict(e.target.value);
                    handleReset();
                  }}
                  className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {availableDistricts.map((d) => (
                    <option key={d.district} value={d.district}>
                      {d.hindiDistrict} ({d.district})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Security Notice Pill */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-3 text-xs text-amber-900">
            <Lock className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
            <div>
              <span className="font-black">सख्त सुरक्षा नीति (Zero Code Execution Sandbox):</span> यह इम्पोर्टर केवल
              अनुमोदित छवियां (Banners, Icons, Logo) और JSON कॉन्फ़िगरेशन स्वीकार करता है। किसी भी प्रकार की JavaScript,
              एक्ज़ीक्यूटेबल (.exe, .sh), स्क्रिप्ट या पाथ ट्रैवर्सल को तत्काल ब्लॉक कर दिया जाता है।
            </div>
          </div>

          {/* Progress Steps Header */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 flex items-center justify-between text-xs font-bold text-stone-600">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full ${validating ? 'bg-orange-600 text-white animate-pulse' : validationResult ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'}`}>
                1. Validating
              </span>
              <span>→</span>
              <span className={`px-2.5 py-1 rounded-full ${validationResult?.isValid && !importing && !importSuccess ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-600'}`}>
                2. Ready
              </span>
              <span>→</span>
              <span className={`px-2.5 py-1 rounded-full ${importing ? 'bg-orange-600 text-white animate-pulse' : 'bg-stone-200 text-stone-600'}`}>
                3. Importing
              </span>
              <span>→</span>
              <span className={`px-2.5 py-1 rounded-full ${importSuccess ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-600'}`}>
                4. Completed
              </span>
            </div>
            {validationResult?.isValid && !importSuccess && !importing && (
              <span className="text-emerald-700 font-black bg-emerald-100 px-2.5 py-1 rounded-full">
                Quick validation completed
              </span>
            )}
          </div>
          {!validationResult && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-orange-300 hover:border-orange-500 bg-orange-50/50 hover:bg-orange-50 rounded-3xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,application/zip,application/x-zip-compressed"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-16 h-16 rounded-3xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-inner">
                {validating ? (
                  <RefreshCw className="w-8 h-8 animate-spin" />
                ) : (
                  <Upload className="w-8 h-8" />
                )}
              </div>
              <div>
                <p className="text-sm font-black text-stone-900">
                  {validating ? 'ZIP पैकेज का सुरक्षा स्कैन व सत्यापन जारी है...' : 'जिला ZIP फ़ाइल यहाँ ड्रैग करें या क्लिक करके चुनें'}
                </p>
                <p className="text-xs text-stone-500 mt-1">
                  स्वीकृत: केवल .zip आर्काइव (छवियां, बैनर, लोगो और district-config.json) • अधिकतम 50MB
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Validation & Preview Result */}
          {validationResult && (
            <div className="space-y-4">
              {/* Status Banner */}
              <div
                className={`rounded-2xl p-4 border flex items-center justify-between ${
                  validationResult.isValid
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-rose-50 border-rose-300 text-rose-950'
                }`}
              >
                <div className="flex items-center gap-3">
                  {validationResult.isValid ? (
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-black flex items-center gap-2">
                      <span>
                        {validationResult.isValid
                          ? 'सुरक्षा सत्यापन सफल: 100% क्लीन पैकेज'
                          : 'सुरक्षा त्रुटि: पैकेज अस्वीकृत'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 border">
                        {validationResult.totalFiles} फ़ाइलें • {Math.round(validationResult.totalSizeBytes / 1024)} KB
                      </span>
                    </div>
                    <p className="text-xs mt-0.5 opacity-90">
                      {validationResult.isValid
                        ? `लक्षित जिला: ${selectedDistrict} (${selectedState}) के लिए सुरक्षित डेटा तैयार है।`
                        : validationResult.issues[0] || 'असुरक्षित या अमान्य फ़ाइलें पाई गईं।'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-stone-700 text-xs font-bold hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  नई ZIP चुनें
                </button>
              </div>

              {/* Issues / Warnings */}
              {validationResult.issues.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-xs text-rose-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>गंभीर त्रुटियां (Critical Security Issues):</span>
                  </div>
                  <ul className="list-disc list-inside pl-1 space-y-0.5">
                    {validationResult.issues.map((iss, i) => (
                      <li key={i}>{iss}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
                <button
                  onClick={() => setPreviewTab('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                    previewTab === 'all' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  सभी एसेट्स ({validationResult.assets.length})
                </button>
                <button
                  onClick={() => setPreviewTab('images')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                    previewTab === 'images' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  छवियां व बैनर ({validationResult.assets.filter((a) => a.assetType !== 'configuration').length})
                </button>
                <button
                  onClick={() => setPreviewTab('config')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                    previewTab === 'config' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  कॉन्फ़िगरेशन ({validationResult.parsedConfig ? 'उपलब्ध' : 'डिफ़ॉल्ट भोपाल टेम्पलेट'})
                </button>
              </div>

              {/* Asset Grid Preview */}
              {previewTab !== 'config' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-60 overflow-y-auto p-1">
                  {validationResult.assets
                    .filter((a) => (previewTab === 'images' ? a.assetType !== 'configuration' : true))
                    .map((asset, idx) => (
                      <div
                        key={idx}
                        className="bg-stone-50 border border-stone-200 rounded-2xl p-2.5 flex flex-col items-center text-center relative overflow-hidden group"
                      >
                        {asset.previewUrl ? (
                          <div className="w-full h-24 rounded-xl bg-stone-200 overflow-hidden mb-2 flex items-center justify-center">
                            <img
                              src={asset.previewUrl}
                              alt={asset.filename}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-24 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-2">
                            <FileText className="w-8 h-8" />
                          </div>
                        )}
                        <span className="text-[11px] font-bold text-stone-900 truncate w-full" title={asset.filename}>
                          {asset.filename}
                        </span>
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-stone-500">
                          <span className="px-1.5 py-0.5 rounded-md bg-stone-200 font-semibold uppercase">
                            {asset.assetType}
                          </span>
                          <span>{Math.round(asset.fileSize / 1024)} KB</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Config Inspector Tab */}
              {previewTab === 'config' && (
                <div className="bg-stone-900 text-emerald-400 p-4 rounded-2xl font-mono text-xs overflow-x-auto max-h-60">
                  {validationResult.parsedConfig ? (
                    <pre>{JSON.stringify(validationResult.parsedConfig, null, 2)}</pre>
                  ) : (
                    <div className="text-stone-400">
                      ℹ️ ZIP में कोई कस्टम `district-config.json` नहीं मिला। आयात करने पर यह जिला मानक HARDINKAAM/Bhopal
                      सेवा कॉन्फ़िगरेशन को डिफ़ॉल्ट टेम्पलेट के रूप में इनहेरिट करेगा।
                    </div>
                  )}
                </div>
              )}

              {/* Import Success Banner */}
              {importSuccess && (
                <div className="bg-emerald-500 text-white rounded-2xl p-4 flex items-center gap-3 shadow-lg animate-fade-in">
                  <CheckCircle2 className="w-6 h-6 shrink-0" />
                  <div className="flex-1">
                    <p className="font-black text-sm">जिला ZIP सफलतापूर्वक आयात एवं संबद्ध कर दिया गया!</p>
                    <p className="text-xs opacity-90 mt-0.5">
                      {selectedDistrict} के लिए सभी छवियां, बैनर और कॉन्फ़िगरेशन लाइव सक्रिय हो चुके हैं।
                    </p>
                  </div>
                </div>
              )}

              {importError && (
                <div className="bg-rose-500 text-white rounded-2xl p-3.5 flex items-center gap-2 text-xs">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-stone-50 border-t border-stone-200 p-4 sm:p-5 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 font-bold text-xs text-stone-700 transition-colors cursor-pointer"
          >
            रद्द करें (Close)
          </button>

          {validationResult && validationResult.isValid && !importSuccess && (
            <button
              onClick={handleConfirmImport}
              disabled={importing}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-orange-950/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {importing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>आयात किया जा रहा है...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>अनुमोदित एसेट्स आयात करें ({selectedDistrict})</span>
                </>
              )}
            </button>
          )}

          {importSuccess && (
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>पूर्ण (Done)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
