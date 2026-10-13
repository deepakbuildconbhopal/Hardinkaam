import React, { useState, useRef } from 'react';
import {
  dynamicFormEngine,
  DynamicFormSchema,
  DynamicQuestionSchema,
} from './dynamicFormEngine';
import {
  CheckCircle2,
  AlertCircle,
  Camera,
  Paperclip,
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  Send,
  Zap,
  Wrench,
  Wind,
  Box,
  Square,
  Columns,
  Sliders,
  AlertTriangle,
  Upload,
  Check,
  Phone,
  Mail,
  KeyRound,
  FileText,
  Film,
  Image as ImageIcon,
} from 'lucide-react';

interface DynamicFormRendererProps {
  schema: DynamicFormSchema;
  initialValues?: Record<string, any>;
  onSubmit: (formValues: Record<string, any>, summaryText: string) => void;
  submitLabel?: string;
}

export const DynamicFormRenderer: React.FC<DynamicFormRendererProps> = ({
  schema,
  initialValues = {},
  onSubmit,
  submitLabel,
}) => {
  const [values, setValues] = useState<Record<string, any>>(() => {
    const defaults: Record<string, any> = { ...initialValues };
    schema.questions.forEach((q) => {
      if (q.defaultValue !== undefined && defaults[q.id] === undefined) {
        defaults[q.id] = q.defaultValue;
      }
    });
    return defaults;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stagedFiles, setStagedFiles] = useState<Record<string, File[]>>({});
  const photoInputRef = useRef<HTMLInputElement>(null);
  const activeQuestionIdRef = useRef<string | null>(null);

  const handleValueChange = (questionId: string, val: any) => {
    const nextValues = { ...values, [questionId]: val };
    setValues(nextValues);

    // Live validation check on change
    const q = schema.questions.find((x) => x.id === questionId);
    if (q) {
      const res = dynamicFormEngine.validateFieldValue(q, val);
      if (res.isValid) {
        setErrors((prev) => {
          const c = { ...prev };
          delete c[questionId];
          return c;
        });
      } else if (res.errorMessage) {
        setErrors((prev) => ({ ...prev, [questionId]: res.errorMessage! }));
      }
    }
  };

  const handleFileUpload = (questionId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    setStagedFiles((prev) => ({
      ...prev,
      [questionId]: [...(prev[questionId] || []), ...list],
    }));
    handleValueChange(questionId, `${list.length} file(s) attached`);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all currently visible questions
    const newErrors: Record<string, string> = {};
    let firstInvalidId: string | null = null;

    schema.questions.forEach((q) => {
      const isVisible = dynamicFormEngine.evaluateVisibility(q, values);
      if (isVisible) {
        const val = values[q.id];
        const res = dynamicFormEngine.validateFieldValue(q, val);
        if (!res.isValid && res.errorMessage) {
          newErrors[q.id] = res.errorMessage;
          if (!firstInvalidId) firstInvalidId = q.id;
        }
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Build human-readable summary of form inputs
    const summaryLines: string[] = [];
    schema.questions.forEach((q) => {
      const isVisible = dynamicFormEngine.evaluateVisibility(q, values);
      if (isVisible) {
        const val = values[q.id];
        if (val !== undefined && val !== null && val !== '') {
          let displayVal = val;
          if (Array.isArray(val)) {
            displayVal = val.join(', ');
          } else if (q.options) {
            const matched = q.options.find((o) => o.value === val);
            if (matched) displayVal = matched.label;
          }
          summaryLines.push(`• **${q.hindiLabel || q.label}**: ${displayVal}`);
        }
      }
    });

    const summaryText = summaryLines.join('\n');
    onSubmit(values, summaryText);
  };

  const iconMap: Record<string, React.ReactNode> = {
    Zap: <Zap className="w-4 h-4 text-orange-500" />,
    Wrench: <Wrench className="w-4 h-4 text-amber-500" />,
    Wind: <Wind className="w-4 h-4 text-sky-500" />,
    Box: <Box className="w-4 h-4 text-purple-500" />,
    Square: <Square className="w-4 h-4 text-stone-500" />,
    Columns: <Columns className="w-4 h-4 text-blue-500" />,
    Sliders: <Sliders className="w-4 h-4 text-emerald-500" />,
    AlertTriangle: <AlertTriangle className="w-4 h-4 text-red-500" />,
  };

  return (
    <div className="bg-white rounded-3xl p-5 border border-stone-200/90 shadow-md my-2 space-y-4 max-w-lg w-full text-stone-900">
      {/* Form Header */}
      <div className="border-b border-stone-100 pb-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-orange-100 text-orange-800">
            ⚡ Dynamic Form Engine (Phase 21)
          </span>
          <span className="text-[10px] text-stone-400 font-bold">100% Secure</span>
        </div>
        <h3 className="text-base font-black text-stone-900 mt-1">
          {schema.hindiTitle || schema.title}
        </h3>
        {schema.subtitle && (
          <p className="text-xs text-stone-500 mt-0.5 font-medium">{schema.subtitle}</p>
        )}
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-4">
        {schema.questions.map((q) => {
          const isVisible = dynamicFormEngine.evaluateVisibility(q, values);
          if (!isVisible) return null;

          const error = errors[q.id];
          const val = values[q.id];

          return (
            <div
              key={q.id}
              className="space-y-1.5 p-3.5 bg-stone-50/80 rounded-2xl border border-stone-200/70 transition-all duration-200 animate-in fade-in slide-in-from-top-1"
            >
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-black text-stone-800 flex items-center gap-1">
                  <span>{q.hindiLabel || q.label}</span>
                  {q.required && <span className="text-red-500 text-sm">*</span>}
                </label>
                {q.helpText && (
                  <span className="text-[10px] text-stone-400 italic">{q.helpText}</span>
                )}
              </div>

              {/* 1. TEXT / EMAIL / PHONE INPUT */}
              {(q.type === 'text' || q.type === 'email' || q.type === 'phone') && (
                <div className="relative">
                  {q.type === 'phone' && (
                    <Phone className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  )}
                  {q.type === 'email' && (
                    <Mail className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  )}
                  <input
                    type={q.type === 'phone' ? 'tel' : q.type === 'email' ? 'email' : 'text'}
                    placeholder={q.placeholder || 'यहाँ लिखें...'}
                    value={val || ''}
                    onChange={(e) => handleValueChange(q.id, e.target.value)}
                    className={`w-full ${
                      q.type === 'phone' || q.type === 'email' ? 'pl-9 pr-3' : 'px-3'
                    } py-2 text-xs border rounded-xl font-bold bg-white focus:outline-hidden ${
                      error ? 'border-red-500 bg-red-50/30' : 'border-stone-200 focus:border-orange-500'
                    }`}
                  />
                </div>
              )}

              {/* 2. NUMBER INPUT */}
              {q.type === 'number' && (
                <input
                  type="number"
                  min={q.validation?.min}
                  max={q.validation?.max}
                  placeholder={q.placeholder || '0'}
                  value={val !== undefined ? val : ''}
                  onChange={(e) => handleValueChange(q.id, parseFloat(e.target.value) || 0)}
                  className={`w-full px-3 py-2 text-xs border rounded-xl font-bold bg-white focus:outline-hidden ${
                    error ? 'border-red-500' : 'border-stone-200 focus:border-orange-500'
                  }`}
                />
              )}

              {/* 3. OTP INPUT */}
              {q.type === 'otp' && (
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-orange-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="4-अंकों का OTP (उदा. 5482)"
                    value={val || ''}
                    onChange={(e) => handleValueChange(q.id, e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono font-black tracking-widest border border-stone-200 rounded-xl bg-white focus:outline-hidden focus:border-orange-500 text-stone-900"
                  />
                </div>
              )}

              {/* 4. DATE INPUT */}
              {q.type === 'date' && (
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-orange-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={val || ''}
                    onChange={(e) => handleValueChange(q.id, e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-xl font-bold bg-white focus:outline-hidden focus:border-orange-500"
                  />
                </div>
              )}

              {/* 5. TIME SLOT INPUT */}
              {q.type === 'time' && (
                <div className="relative">
                  <Clock className="w-3.5 h-3.5 text-orange-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={val || ''}
                    onChange={(e) => handleValueChange(q.id, e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-xl font-bold bg-white focus:outline-hidden focus:border-orange-500"
                  >
                    <option value="">समय स्लॉट चुनें...</option>
                    <option value="urgent_60">⚡ तत्काल (अगले 60 मिनट में Express)</option>
                    <option value="morning">सुबह (08:00 AM - 11:00 AM)</option>
                    <option value="afternoon">दोपहर (12:00 PM - 03:00 PM)</option>
                    <option value="evening">शाम (04:00 PM - 07:00 PM)</option>
                  </select>
                </div>
              )}

              {/* 6. SELECT DROPDOWN */}
              {q.type === 'select' && q.options && (
                <select
                  value={val || ''}
                  onChange={(e) => handleValueChange(q.id, e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl font-bold bg-white focus:outline-hidden focus:border-orange-500"
                >
                  <option value="">विकल्प चुनें...</option>
                  {q.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}

              {/* 7. RADIO GRID */}
              {q.type === 'radio' && q.options && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {q.options.map((opt) => {
                    const isSelected = val === opt.value;
                    return (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => handleValueChange(q.id, opt.value)}
                        className={`p-2.5 rounded-xl text-left border transition cursor-pointer flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-orange-50 border-orange-500 text-orange-950 font-black shadow-xs ring-1 ring-orange-400/50'
                            : 'bg-white hover:bg-stone-100/80 border-stone-200 text-stone-700 font-bold'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {opt.icon && iconMap[opt.icon] ? (
                            iconMap[opt.icon]
                          ) : (
                            <span
                              className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                isSelected ? 'border-orange-600 bg-orange-600' : 'border-stone-300'
                              }`}
                            >
                              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </span>
                          )}
                          <span className="text-xs">{opt.label}</span>
                        </div>
                        {opt.badge && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 shrink-0">
                            {opt.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 8. MULTI-SELECT CHECKBOXES */}
              {(q.type === 'multiSelect' || q.type === 'checkbox') && q.options && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {q.options.map((opt) => {
                    const currentList: string[] = Array.isArray(val) ? val : [];
                    const isChecked = currentList.includes(opt.value);

                    const toggleOption = () => {
                      if (isChecked) {
                        handleValueChange(
                          q.id,
                          currentList.filter((x) => x !== opt.value)
                        );
                      } else {
                        handleValueChange(q.id, [...currentList, opt.value]);
                      }
                    };

                    return (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={toggleOption}
                        className={`p-2.5 rounded-xl text-left border transition cursor-pointer flex items-center gap-2 ${
                          isChecked
                            ? 'bg-orange-50 border-orange-500 text-orange-950 font-black'
                            : 'bg-white hover:bg-stone-100/80 border-stone-200 text-stone-700 font-bold'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                            isChecked ? 'border-orange-600 bg-orange-600 text-white' : 'border-stone-300'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="text-xs">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 9. PHOTO / VIDEO / DOCUMENT UPLOADER */}
              {(q.type === 'photo' || q.type === 'video' || q.type === 'document') && (
                <div className="space-y-2">
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept={
                      q.type === 'photo'
                        ? 'image/*'
                        : q.type === 'video'
                        ? 'video/*'
                        : '.pdf,.doc,.docx'
                    }
                    className="hidden"
                    onChange={(e) => {
                      if (activeQuestionIdRef.current) {
                        handleFileUpload(activeQuestionIdRef.current, e.target.files);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      activeQuestionIdRef.current = q.id;
                      photoInputRef.current?.click();
                    }}
                    className="w-full py-2.5 px-3 bg-white hover:bg-stone-100 border border-dashed border-stone-300 rounded-xl text-xs font-bold text-stone-700 flex items-center justify-center gap-2 cursor-pointer transition"
                  >
                    {q.type === 'photo' ? (
                      <Camera className="w-4 h-4 text-orange-600" />
                    ) : q.type === 'video' ? (
                      <Film className="w-4 h-4 text-purple-600" />
                    ) : (
                      <Paperclip className="w-4 h-4 text-blue-600" />
                    )}
                    <span>
                      {stagedFiles[q.id]?.length
                        ? `${stagedFiles[q.id].length} फाइल अपलोड की गई`
                        : `${
                            q.type === 'photo'
                              ? '📷 फोटो खींचें या गैलरी से चुनें'
                              : q.type === 'video'
                              ? '🎥 शार्ट वीडियो रिकॉर्ड करें'
                              : '📄 डॉक्यूमेंट / PDF अपलोड करें'
                          }`}
                    </span>
                  </button>

                  {/* Staged preview */}
                  {stagedFiles[q.id] && stagedFiles[q.id].length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {stagedFiles[q.id].map((f, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {f.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 10. ADDRESS INPUT */}
              {q.type === 'address' && (
                <div className="relative">
                  <MapPin className="w-4 h-4 text-orange-600 absolute left-3 top-3" />
                  <textarea
                    rows={2}
                    placeholder="मकान / फ्लैट नंबर, कॉलोनी व लैंडमार्क दर्ज करें..."
                    value={val || ''}
                    onChange={(e) => handleValueChange(q.id, e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-xl font-bold bg-white focus:outline-hidden focus:border-orange-500 leading-relaxed"
                  />
                </div>
              )}

              {/* Error Message */}
              {error && (
                <p className="text-[11px] font-bold text-red-600 flex items-center gap-1 pt-0.5 animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span>{error}</span>
                </p>
              )}
            </div>
          );
        })}

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:brightness-110 text-white font-black text-xs rounded-2xl shadow-md transition cursor-pointer flex items-center justify-center gap-2 active:scale-98"
        >
          <Send className="w-4 h-4" />
          <span>{submitLabel || schema.submitLabel || 'जानकारी सबमिट करें (Submit Details)'}</span>
        </button>
      </form>
    </div>
  );
};
