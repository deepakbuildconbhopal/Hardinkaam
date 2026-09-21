import React from 'react';
import { Home, Calendar, Wallet, User, LayoutGrid, Wrench, CheckSquare, ShieldCheck, Briefcase, Users, FileText, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Props {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  unreadCount?: number;
}

export const BottomNav: React.FC<Props> = ({ currentTab, onSelectTab, unreadCount = 0 }) => {
  const { activeRole } = useAuth();

  const getTabs = () => {
    switch (activeRole) {
      case 'service_man':
        return [
          { id: 'pro_dashboard', label: 'Home', icon: Home },
          { id: 'pro_jobs', label: 'My Jobs', icon: CheckSquare },
          { id: 'pro_wallet', label: 'Earnings', icon: Wallet },
          { id: 'pro_kyc', label: 'KYC', icon: ShieldCheck },
          { id: 'profile', label: 'Profile', icon: User },
        ];
      case 'business_partner':
        return [
          { id: 'partner_dashboard', label: 'Dashboard', icon: Home },
          { id: 'partner_fleet', label: 'Fleet', icon: Users },
          { id: 'partner_bookings', label: 'Bookings', icon: Calendar },
          { id: 'partner_wallet', label: 'Wallet', icon: Wallet },
          { id: 'profile', label: 'Account', icon: User },
        ];
      case 'admin':
        return [
          { id: 'admin_dashboard', label: 'Admin Hub', icon: Home },
          { id: 'admin_users', label: 'Users', icon: Users },
          { id: 'admin_catalog', label: 'Services', icon: LayoutGrid },
          { id: 'admin_bookings', label: 'Bookings', icon: Calendar },
          { id: 'admin_settings', label: 'Settings', icon: Settings },
        ];
      default: // Customer
        return [
          { id: 'home', label: 'Services', icon: Home },
          { id: 'categories', label: 'Categories', icon: LayoutGrid },
          { id: 'bookings', label: 'Bookings', icon: Calendar },
          { id: 'wallet', label: 'Wallet', icon: Wallet },
          { id: 'profile', label: 'Profile', icon: User },
        ];
    }
  };

  const tabs = getTabs();

  return (
    <nav
      id="mobile-bottom-navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 py-1.5 px-2 shadow-lg"
    >
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`bottom-nav-${tab.id}`}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
                isActive
                  ? activeRole === 'service_man'
                    ? 'text-blue-600 font-bold scale-105'
                    : activeRole === 'business_partner'
                    ? 'text-purple-600 font-bold scale-105'
                    : activeRole === 'admin'
                    ? 'text-emerald-600 font-bold scale-105'
                    : 'text-orange-600 font-bold scale-105'
                  : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {tab.id === 'bookings' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-orange-600" />
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
