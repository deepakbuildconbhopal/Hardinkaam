import React, { useRef } from 'react';
import { ChatAttachment } from './attachmentTypes';
import {
  X,
  RotateCcw,
  RefreshCw,
  FileText,
  Film,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Camera,
  Paperclip,
  Upload
} from 'lucide-react';
import { AssistantLanguage } from './types';

interface AttachmentPreviewTrayProps {
  attachments: ChatAttachment[];
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  onReplace: (id: string, file: File) => void;
  lang: AssistantLanguage;
}

export const AttachmentPreviewTray: React.FC<AttachmentPreviewTrayProps> = ({
  attachments,
  onRemove,
  onRetry,
  onReplace,
  lang,
}) => {
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replacingIdRef = useRef<string | null>(null);

  if (!attachments || attachments.length === 0) return null;

  const handleTriggerReplace = (id: string) => {
    replacingIdRef.current = id;
    replaceInputRef.current?.click();
  };

  const handleFileReplaced = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetId = replacingIdRef.current;
    if (file && targetId) {
      onReplace(targetId, file);
    }
    // reset input
    if (replaceInputRef.current) {
      replaceInputRef.current.value = '';
    }
    replacingIdRef.current = null;
  };

  return (
    <div className="bg-stone-50 border-t border-stone-200 px-3 py-2.5 space-y-2 shrink-0 animate-in slide-in-from-bottom-2 duration-200">
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*,video/*,.pdf,.doc,.docx"
        className="hidden"
        onChange={handleFileReplaced}
      />

      <div className="flex items-center justify-between text-[11px] font-bold text-stone-600">
        <span className="flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5 text-orange-600" />
          <span>
            {lang === 'hi'
              ? `संलग्न फाइलें (${attachments.length})`
              : `Attachments (${attachments.length})`}
          </span>
        </span>
        <span className="text-[10px] text-stone-400">
          {lang === 'hi' ? 'संदेश के साथ भेजी जाएंगी' : 'Will send with message'}
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {attachments.map((att) => {
          const isUploading = att.status === 'uploading';
          const isError = att.status === 'error';
          const isSuccess = att.status === 'success';

          return (
            <div
              key={att.id}
              className={`relative min-w-[200px] max-w-[240px] p-2 rounded-xl bg-white border shadow-xs flex flex-col justify-between text-xs transition ${
                isError
                  ? 'border-red-300 bg-red-50/50'
                  : isSuccess
                  ? 'border-emerald-300'
                  : 'border-stone-200'
              }`}
            >
              {/* Top Row: Preview Thumbnail & Details */}
              <div className="flex items-start gap-2 min-w-0">
                {att.type === 'image' ? (
                  <img
                    src={att.url}
                    alt={att.name}
                    className="w-10 h-10 rounded-lg object-cover border border-stone-100 shrink-0 bg-stone-100"
                  />
                ) : att.type === 'video' ? (
                  <div className="w-10 h-10 rounded-lg bg-stone-900 text-white flex items-center justify-center shrink-0">
                    <Film className="w-5 h-5 text-orange-400" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="font-bold text-stone-800 text-[11px] truncate">{att.name}</p>
                  <p className="text-[10px] text-stone-500">{att.formattedSize}</p>
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => onRemove(att.id)}
                  className="p-1 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition shrink-0"
                  title="हटाएं (Remove)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Middle Row: Progress or Status */}
              <div className="mt-2">
                {isUploading && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-stone-500 font-semibold">
                      <span>{lang === 'hi' ? 'अपलोड हो रहा है...' : 'Uploading...'}</span>
                      <span>{att.progress}%</span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full transition-all duration-200"
                        style={{ width: `${att.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {isSuccess && (
                  <div className="flex items-center justify-between text-[10px] text-emerald-700 font-bold">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>{lang === 'hi' ? 'सफलतापूर्वक तैयार' : 'Ready'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleTriggerReplace(att.id)}
                      className="text-stone-400 hover:text-stone-700 underline font-medium cursor-pointer"
                    >
                      {lang === 'hi' ? 'बदलें' : 'Replace'}
                    </button>
                  </div>
                )}

                {isError && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[10px] text-red-600 font-bold">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span className="truncate">{att.error || 'अपलोड विफल'}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => onRetry(att.id)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-600 text-white font-bold text-[10px] hover:bg-red-700 transition"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>पुनः प्रयास</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemove(att.id)}
                        className="text-[10px] text-stone-500 hover:text-stone-800"
                      >
                        रद्द करें
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * Attachment Action Menu Dropdown / Popup
 * ----------------------------------------------------------- */
interface AttachmentActionMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCamera: () => void;
  onSelectGallery: () => void;
  onSelectMultiplePhotos: () => void;
  onSelectVideo: () => void;
  onSelectPdf: () => void;
  onSelectDoc: () => void;
  lang: AssistantLanguage;
}

export const AttachmentActionMenu: React.FC<AttachmentActionMenuProps> = ({
  isOpen,
  onClose,
  onSelectCamera,
  onSelectGallery,
  onSelectMultiplePhotos,
  onSelectVideo,
  onSelectPdf,
  onSelectDoc,
  lang,
}) => {
  if (!isOpen) return null;

  const items = [
    {
      id: 'camera',
      label: lang === 'hi' ? 'कैमरा (Camera)' : 'Camera',
      desc: lang === 'hi' ? 'लाइव फोटो खींचें' : 'Take live photo',
      icon: Camera,
      color: 'text-orange-600 bg-orange-100',
      action: onSelectCamera,
    },
    {
      id: 'gallery',
      label: lang === 'hi' ? 'गैलरी (Gallery)' : 'Gallery',
      desc: lang === 'hi' ? 'एक फोटो चुनें' : 'Choose 1 photo',
      icon: ImageIcon,
      color: 'text-amber-600 bg-amber-100',
      action: onSelectGallery,
    },
    {
      id: 'multi_photos',
      label: lang === 'hi' ? 'मल्टीपल फोटो (Multiple Photos)' : 'Multiple Photos',
      desc: lang === 'hi' ? 'अधिकतम 5 फोटो' : 'Up to 5 photos',
      icon: Upload,
      color: 'text-blue-600 bg-blue-100',
      action: onSelectMultiplePhotos,
    },
    {
      id: 'video',
      label: lang === 'hi' ? 'वीडियो क्लिप (Video)' : 'Video',
      desc: lang === 'hi' ? 'समस्या का वीडियो' : 'Short video clip',
      icon: Film,
      color: 'text-red-600 bg-red-100',
      action: onSelectVideo,
    },
    {
      id: 'pdf',
      label: lang === 'hi' ? 'PDF दस्तावेज़ (PDF)' : 'PDF Document',
      desc: lang === 'hi' ? 'बिल, रिपोर्ट, रसीद' : 'Bill, invoice, report',
      icon: FileText,
      color: 'text-emerald-600 bg-emerald-100',
      action: onSelectPdf,
    },
    {
      id: 'doc',
      label: lang === 'hi' ? 'दस्तावेज़ (Document)' : 'Document',
      desc: lang === 'hi' ? 'Word / Docs / Sheet' : 'Word or text file',
      icon: Paperclip,
      color: 'text-purple-600 bg-purple-100',
      action: onSelectDoc,
    },
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white rounded-3xl p-4 shadow-2xl border border-stone-200 animate-in slide-in-from-bottom-4 duration-200 select-none"
      >
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div>
            <h4 className="text-sm font-black text-stone-900">
              {lang === 'hi' ? 'फाइल या फोटो चुनें' : 'Choose Attachment'}
            </h4>
            <p className="text-[11px] text-stone-500 mt-0.5">
              {lang === 'hi' ? 'समस्या दिखाने के लिए फोटो/वीडियो भेजें' : 'Send media to explain your issue'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => {
                  it.action();
                  onClose();
                }}
                className="p-3 rounded-2xl bg-stone-50 hover:bg-orange-50 border border-stone-200 hover:border-orange-300 text-left transition active:scale-95 cursor-pointer flex flex-col gap-2 group"
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${it.color} group-hover:scale-110 transition-transform`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-800 leading-tight group-hover:text-orange-900">
                    {it.label}
                  </p>
                  <p className="text-[10px] text-stone-500 mt-0.5">{it.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
