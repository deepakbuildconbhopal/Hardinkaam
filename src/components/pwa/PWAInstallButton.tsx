import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { IOSInstallGuideModal } from './IOSInstallGuideModal';

interface Props {
  className?: string;
  variant?: 'navbar' | 'pill' | 'compact' | 'header';
  onOpenModal?: () => void;
}

export const PWAInstallButton: React.FC<Props> = ({
  className = '',
  variant = 'navbar',
  onOpenModal,
}) => {
  const [showIOSModal, setShowIOSModal] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenModal) {
      onOpenModal();
    }
  };

  if (variant === 'compact') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-black shadow-xs transition active:scale-95 cursor-pointer ${className}`}
          title="Download HARDINKAAM App / APK"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download App</span>
        </button>
        <IOSInstallGuideModal
          isOpen={showIOSModal}
          onClose={() => setShowIOSModal(false)}
        />
      </>
    );
  }

  return (
    <>
      <button
        id="nav-download-app-btn"
        type="button"
        onClick={handleClick}
        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-black shadow-xs shadow-orange-600/20 transition active:scale-95 cursor-pointer ${className}`}
        title="Download HARDINKAAM Android APK & PWA App"
      >
        <Download className="w-3.5 h-3.5 text-amber-200" />
        <span>📲 Download App</span>
      </button>

      <IOSInstallGuideModal
        isOpen={showIOSModal}
        onClose={() => setShowIOSModal(false)}
      />
    </>
  );
};


