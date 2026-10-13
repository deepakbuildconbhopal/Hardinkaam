import React, { useState } from 'react';
import { ChatAttachment } from './attachmentTypes';
import { FileText, Download, ExternalLink, X, Play, Film, Image as ImageIcon } from 'lucide-react';

interface MessageAttachmentsProps {
  attachments: ChatAttachment[];
}

export const MessageAttachments: React.FC<MessageAttachmentsProps> = ({ attachments }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="mt-2.5 space-y-2">
      {/* Grid for Images */}
      {attachments.filter((a) => a.type === 'image').length > 0 && (
        <div className="grid grid-cols-2 gap-1.5 max-w-sm">
          {attachments
            .filter((a) => a.type === 'image')
            .map((att) => (
              <div
                key={att.id}
                onClick={() => setSelectedImage(att.url)}
                className="relative group rounded-xl overflow-hidden border border-stone-200 bg-stone-900 cursor-pointer aspect-video sm:aspect-square flex items-center justify-center hover:opacity-95 transition"
              >
                <img
                  src={att.url}
                  alt={att.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                  <span className="text-[10px] text-white font-medium truncate">{att.name}</span>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Videos */}
      {attachments
        .filter((a) => a.type === 'video')
        .map((att) => (
          <div
            key={att.id}
            className="rounded-xl overflow-hidden border border-stone-200 bg-black max-w-sm"
          >
            <video
              src={att.url}
              controls
              playsInline
              className="w-full max-h-48 object-contain bg-black"
            />
            <div className="p-2 bg-stone-900 text-white flex items-center justify-between text-[11px]">
              <span className="font-semibold truncate flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span className="truncate">{att.name}</span>
              </span>
              <span className="text-stone-400 text-[10px] shrink-0">{att.formattedSize}</span>
            </div>
          </div>
        ))}

      {/* Documents & PDFs */}
      {attachments
        .filter((a) => a.type === 'pdf' || a.type === 'document')
        .map((att) => (
          <a
            key={att.id}
            href={att.url}
            target="_blank"
            rel="noopener noreferrer"
            download={att.name}
            className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-stone-100/90 hover:bg-orange-50 border border-stone-200 hover:border-orange-300 text-stone-800 transition max-w-sm group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-stone-900 truncate group-hover:text-orange-700">
                  {att.name}
                </p>
                <p className="text-[10px] text-stone-500 uppercase">{att.formattedSize}</p>
              </div>
            </div>

            <div className="p-1.5 rounded-lg bg-white group-hover:bg-orange-600 group-hover:text-white transition shrink-0 shadow-xs">
              <Download className="w-3.5 h-3.5" />
            </div>
          </a>
        ))}

      {/* Lightbox Modal for Full Image Inspection */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl max-h-[85vh] rounded-2xl overflow-hidden bg-stone-900 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute top-3 right-3 p-1.5 bg-black/60 hover:bg-black text-white rounded-full transition cursor-pointer z-10"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={selectedImage}
              alt="Enlarged preview"
              className="max-h-[80vh] w-auto object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};
