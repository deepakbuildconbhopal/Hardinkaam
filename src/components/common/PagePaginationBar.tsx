import React from 'react';
import { ChevronLeft, ChevronRight, Compass } from 'lucide-react';

interface PagePaginationBarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isAdmin: boolean;
  activeRole: string;
}

export const PagePaginationBar: React.FC<PagePaginationBarProps> = ({
  currentTab,
  onSelectTab,
  isAdmin,
  activeRole,
}) => {
  let tabsList: string[] = [];
  if (isAdmin) {
    tabsList = [
      'admin_dashboard',
      'admin_super',
      'admin_live_map',
      'admin_catalog',
      'admin_bookings',
      'admin_users',
      'admin_kyc',
      'admin_payouts',
      'admin_financial_profit',
      'admin_financial_ledger',
      'admin_analytics',
      'admin_settings',
    ];
  } else if (activeRole === 'service_man') {
    tabsList = ['pro_dashboard', 'pro_wallet', 'pro_kyc'];
  } else if (activeRole === 'business_partner' || activeRole === 'brand_promoter') {
    tabsList = ['partner_dashboard'];
  } else {
    tabsList = ['landing', 'home', 'bookings', 'wallet', 'profile'];
  }

  const currentIndex = tabsList.indexOf(currentTab);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < tabsList.length - 1;

  const handlePrev = () => {
    if (hasPrev) {
      onSelectTab(tabsList[currentIndex - 1]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNext = () => {
    if (hasNext) {
      onSelectTab(tabsList[currentIndex + 1]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (currentIndex === -1 || currentTab === 'landing') return null;

  return (
    <div className="my-6 px-4 py-3 bg-white/95 backdrop-blur-md border border-stone-200/80 rounded-2xl shadow-sm flex items-center justify-between gap-3 text-xs font-bold text-stone-700">
      <button
        type="button"
        onClick={handlePrev}
        disabled={!hasPrev}
        className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
          hasPrev
            ? 'bg-stone-900 hover:bg-orange-600 text-white shadow-xs'
            : 'bg-stone-100 text-stone-400 cursor-not-allowed opacity-65'
        }`}
      >
        <ChevronLeft className="w-4 h-4" />
        <span>⬅ पिछला पेज (Previous)</span>
      </button>

      <div className="flex items-center gap-1.5 text-[11px] text-stone-500 font-medium">
        <Compass className="w-3.5 h-3.5 text-orange-600" />
        <span>पेज {currentIndex + 1} / {tabsList.length}</span>
      </div>

      <button
        type="button"
        onClick={handleNext}
        disabled={!hasNext}
        className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
          hasNext
            ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-md shadow-orange-950/20'
            : 'bg-stone-100 text-stone-400 cursor-not-allowed opacity-65'
        }`}
      >
        <span>अगला पेज (Next) ➔</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default PagePaginationBar;
