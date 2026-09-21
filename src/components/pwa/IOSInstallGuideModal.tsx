import React from 'react';
import { Share, PlusSquare, X, CheckCircle2, Wrench } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const IOSInstallGuideModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-stone-200 relative animate-in slide-in-from-bottom-4 duration-300">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-600 via-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-600/20">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-stone-900 leading-tight">
              iPhone / iPad पर Install करें
            </h3>
            <p className="text-xs text-stone-500 font-medium">
              HARDINKAAM Progress Web App (iOS Safari)
            </p>
          </div>
        </div>

        <p className="text-xs text-stone-600 mb-5 leading-relaxed">
          Apple Safari ब्राउज़र में नीचे दिए गए 2 सरल स्टेप्स से HARDINKAAM ऐप को अपनी होम स्क्रीन पर जोड़ें:
        </p>

        {/* Step Guide */}
        <div className="space-y-3.5 mb-6">
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-stone-50 border border-stone-200">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 font-black text-sm">
              1
            </div>
            <div className="text-xs">
              <span className="font-bold text-stone-800 block mb-0.5">
                Safari टूलबार में 'Share' बटन दबाएं
              </span>
              <span className="text-stone-500 flex items-center gap-1">
                नीचे या ऊपर बार में <Share className="w-3.5 h-3.5 text-blue-600 inline" /> (Share icon) पर टैप करें।
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-stone-50 border border-stone-200">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 font-black text-sm">
              2
            </div>
            <div className="text-xs">
              <span className="font-bold text-stone-800 block mb-0.5">
                'Add to Home Screen' चुनें
              </span>
              <span className="text-stone-500 flex items-center gap-1">
                मेन्यू में नीचे स्क्रॉल करके <PlusSquare className="w-3.5 h-3.5 text-stone-700 inline" /> <strong>Add to Home Screen</strong> पर टैप करें।
              </span>
            </div>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center gap-2.5 text-xs text-emerald-800 mb-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>अब HARDINKAAM ऐप एक टैप में बिना ब्राउज़र बार के फुल स्क्रीन खुलेगा!</span>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md shadow-orange-600/20 transition cursor-pointer"
        >
          समझ गया (Done)
        </button>
      </div>
    </div>
  );
};
