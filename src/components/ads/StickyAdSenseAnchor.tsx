import React, { useState, useEffect } from 'react';
import { X, ChevronUp, ChevronDown, Sparkles, ExternalLink } from 'lucide-react';
import { AdSenseBanner } from './AdSenseBanner';

interface Props {
  currentTab: string;
}

export const StickyAdSenseAnchor: React.FC<Props> = ({ currentTab }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isClosed, setIsClosed] = useState(false);

  // Restore or adapt on route changes if desired
  useEffect(() => {
    // Reset close state when user switches pages so each page gets monetized
    setIsClosed(false);
  }, [currentTab]);

  if (isClosed) return null;

  return (
    <aside
      aria-label="Sponsored advertisement"
      className="fixed bottom-16 sm:bottom-0 left-0 right-0 z-20 pointer-events-none transition-transform duration-300 flex justify-center px-2 pb-1"
    >
      <div className="w-full max-w-4xl pointer-events-auto shadow-2xl rounded-t-2xl overflow-hidden bg-stone-950 border-t border-x border-stone-800">
        {/* Top Control Bar */}
        <div className="bg-stone-900/90 px-3 py-1 flex items-center justify-between text-[10px] text-stone-400 border-b border-stone-800">
          <span className="flex items-center gap-1 font-bold tracking-wider uppercase text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Google AdSense • प्रायोजित विज्ञापन
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 text-stone-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1 font-semibold"
              title={isMinimized ? 'विज्ञापन विस्तार करें' : 'विज्ञापन छोटा करें'}
            >
              {isMinimized ? (
                <>
                  <span>दिखाएं</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>छोटा करें</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsClosed(true)}
              className="p-1 text-stone-400 hover:text-red-400 transition-colors cursor-pointer"
              title="बंद करें"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Ad Body */}
        {!isMinimized && (
          <div className="p-2 bg-stone-950">
            <AdSenseBanner
              slot="9876543210"
              format="leaderboard"
              category={
                currentTab === 'wallet'
                  ? 'finance' as any
                  : currentTab === 'franchise'
                  ? 'franchise'
                  : currentTab === 'bookings'
                  ? 'home'
                  : 'general'
              }
              className="my-0"
              label="गूगल प्रायोजित पार्टनर ऑफर"
            />
          </div>
        )}
      </div>
    </aside>
  );
};
