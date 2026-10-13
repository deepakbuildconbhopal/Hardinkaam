import React, { useState, useMemo } from 'react';
import {
  Wrench,
  Wind,
  Droplet,
  RotateCcw,
  Snowflake,
  Flame,
  Thermometer,
  Cpu,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Sparkles,
  ChevronRight,
  Plus,
  Trash2,
  Bell,
  ArrowRight,
  Download,
  Info,
  X,
  Check,
  Shield,
  Zap,
} from 'lucide-react';
import { Booking, Service } from '../../types';
import {
  ApplianceMaintenanceReminder,
  ApplianceType,
  APPLIANCE_CONFIGS,
  analyzeCustomerApplianceReminders,
  saveCustomTrackedAppliance,
  removeCustomTrackedAppliance,
  snoozeReminder,
  clearSnooze,
  downloadReminderIcs,
  formatFriendlyDate,
} from '../../services/applianceMaintenanceService';

interface Props {
  bookings: Booking[];
  services: Service[];
  onBookService: (service: Service) => void;
  onExploreServices?: () => void;
}

export const ApplianceMaintenanceRemindersCard: React.FC<Props> = ({
  bookings,
  services,
  onBookService,
  onExploreServices,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'needs_attention' | 'healthy'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeSnoozeId, setActiveSnoozeId] = useState<string | null>(null);
  const [showTips, setShowTips] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Form State for Adding Custom Tracked Appliance
  const [newType, setNewType] = useState<ApplianceType>('ac');
  const [newCustomName, setNewCustomName] = useState('');
  const [newBrandModel, setNewBrandModel] = useState('');
  const [newLastDate, setNewLastDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 2);
    return d.toISOString().slice(0, 10);
  });
  const [newCycleDays, setNewCycleDays] = useState(90);

  // Force re-render token when custom items or snoozes are updated
  const [refreshKey, setRefreshKey] = useState(0);

  const reminders = useMemo(() => {
    return analyzeCustomerApplianceReminders(bookings, services);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, services, refreshKey]);

  // Statistics
  const overdueCount = reminders.filter((r) => r.status === 'overdue').length;
  const dueSoonCount = reminders.filter((r) => r.status === 'due_soon').length;
  const healthyCount = reminders.filter((r) => r.status === 'healthy').length;
  const needsAttentionCount = overdueCount + dueSoonCount;

  // Filtered Reminders
  const filteredReminders = useMemo(() => {
    if (filterTab === 'needs_attention') {
      return reminders.filter((r) => r.status === 'overdue' || r.status === 'due_soon' || r.status === 'suggested');
    }
    if (filterTab === 'healthy') {
      return reminders.filter((r) => r.status === 'healthy');
    }
    return reminders;
  }, [reminders, filterTab]);

  const handleOpenAddModal = (defaultType?: ApplianceType) => {
    const typeToUse = defaultType || 'ac';
    setNewType(typeToUse);
    setNewCustomName('');
    setNewBrandModel('');
    setNewCycleDays(APPLIANCE_CONFIGS[typeToUse]?.defaultCycleDays || 90);
    setIsAddModalOpen(true);
  };

  const handleSaveAppliance = (e: React.FormEvent) => {
    e.preventDefault();
    const config = APPLIANCE_CONFIGS[newType];
    saveCustomTrackedAppliance({
      type: newType,
      customName: newCustomName.trim() || config.nameEn,
      brandModel: newBrandModel.trim() || undefined,
      lastServiceDate: newLastDate,
      cycleDays: Number(newCycleDays) || config.defaultCycleDays,
    });

    setIsAddModalOpen(false);
    setRefreshKey((k) => k + 1);
    setActionNotice(`Appliance "${newCustomName || config.nameEn}" added to maintenance tracker!`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleDeleteCustom = (reminderId: string, name: string) => {
    // reminderId format is "custom-reminder-custom-app-..."
    const rawId = reminderId.replace('custom-reminder-', '');
    removeCustomTrackedAppliance(rawId);
    setRefreshKey((k) => k + 1);
    setActionNotice(`Removed "${name}" from tracking.`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleSnooze = (reminderId: string, days: number) => {
    snoozeReminder(reminderId, days);
    setActiveSnoozeId(null);
    setRefreshKey((k) => k + 1);
    setActionNotice(`Reminder snoozed for ${days} days.`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleClearSnooze = (reminderId: string) => {
    clearSnooze(reminderId);
    setActiveSnoozeId(null);
    setRefreshKey((k) => k + 1);
    setActionNotice('Snooze cleared.');
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleDownloadCalendar = (reminder: ApplianceMaintenanceReminder) => {
    downloadReminderIcs(reminder);
    setActionNotice(`Downloaded calendar invite for ${reminder.displayName}!`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleBookNow = (reminder: ApplianceMaintenanceReminder) => {
    if (reminder.matchedService) {
      onBookService(reminder.matchedService);
      return;
    }

    // Construct a fallback service if not found in catalog
    const config = APPLIANCE_CONFIGS[reminder.applianceType] || APPLIANCE_CONFIGS.custom;
    const fallbackService: Service = {
      id: `service-reminder-${reminder.applianceType}`,
      name: config.recommendedServiceName,
      categoryId: reminder.applianceType === 'ac' ? 'ac-service' : 'appliances',
      categoryName: 'Appliance Care',
      basePrice: reminder.estimatedPrice,
      price: reminder.estimatedPrice,
      priceUnit: 'per service',
      durationMinutes: 60,
      rating: 4.9,
      ratingCount: 184,
      isActive: true,
      description: `${reminder.recommendedAction} Verified doorstep professional technician inspection & servicing.`,
    };

    onBookService(fallbackService);
  };

  // Render appliance icon based on type
  const renderApplianceIcon = (type: ApplianceType) => {
    switch (type) {
      case 'ac':
        return <Wind className="w-5 h-5 text-sky-500" />;
      case 'ro':
        return <Droplet className="w-5 h-5 text-cyan-500" />;
      case 'washing_machine':
        return <RotateCcw className="w-5 h-5 text-indigo-500" />;
      case 'refrigerator':
        return <Snowflake className="w-5 h-5 text-blue-500" />;
      case 'chimney':
        return <Flame className="w-5 h-5 text-amber-500" />;
      case 'geyser':
        return <Thermometer className="w-5 h-5 text-rose-500" />;
      case 'microwave':
        return <Cpu className="w-5 h-5 text-purple-500" />;
      default:
        return <Wrench className="w-5 h-5 text-orange-500" />;
    }
  };

  return (
    <section
      id="appliance-maintenance-reminders-section"
      className="w-full bg-white rounded-3xl border border-stone-200/90 shadow-md overflow-hidden transition-all duration-200"
    >
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 text-white p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(circle_at_top_right,white,transparent_70%)] pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-md shrink-0">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-extrabold text-[10px] uppercase tracking-wider border border-orange-500/30">
                  Smart Appliance Care
                </span>
                <span className="text-[11px] text-stone-300 font-medium hidden sm:inline">
                  • आवधिक मेंटेनेंस रिमाइंडर
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight mt-0.5">
                Appliance Maintenance Reminders
              </h2>
              <p className="text-xs text-stone-300 font-normal mt-0.5 max-w-xl">
                Automatic servicing alerts for your AC, Water Purifier (RO), and appliances based on past bookings to maintain 100% efficiency and prevent costly breakdowns.
              </p>
            </div>
          </div>

          {/* Action buttons in header */}
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setShowTips(!showTips)}
              className="px-3 py-2 rounded-xl bg-stone-800/80 hover:bg-stone-700/80 text-stone-200 hover:text-white border border-stone-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Maintenance Benefits & Guide"
            >
              <Info className="w-3.5 h-3.5 text-amber-400" />
              <span>{showTips ? 'Hide Tips' : 'Care Tips'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenAddModal()}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Track Appliance</span>
            </button>
          </div>
        </div>

        {/* Quick Status Badges Summary */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-stone-800/80 text-center">
          <div className="bg-stone-800/50 rounded-xl p-2 border border-stone-700/50">
            <span className="text-[10px] font-bold text-stone-400 uppercase block">Overdue</span>
            <span className={`text-base font-black ${overdueCount > 0 ? 'text-rose-400' : 'text-stone-300'}`}>
              {overdueCount} {overdueCount > 0 && '⚠️'}
            </span>
          </div>
          <div className="bg-stone-800/50 rounded-xl p-2 border border-stone-700/50">
            <span className="text-[10px] font-bold text-stone-400 uppercase block">Due Soon</span>
            <span className={`text-base font-black ${dueSoonCount > 0 ? 'text-amber-400' : 'text-stone-300'}`}>
              {dueSoonCount}
            </span>
          </div>
          <div className="bg-stone-800/50 rounded-xl p-2 border border-stone-700/50">
            <span className="text-[10px] font-bold text-stone-400 uppercase block">Healthy</span>
            <span className="text-base font-black text-emerald-400">{healthyCount}</span>
          </div>
        </div>
      </div>

      {/* Action Toast / Feedback Bar */}
      {actionNotice && (
        <div className="px-5 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Educational Tips Drawer */}
      {showTips && (
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-50/70 to-orange-50/50 border-b border-amber-200 text-stone-800 text-xs space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h4 className="font-black text-stone-900 text-xs flex items-center gap-1.5 uppercase tracking-wider">
              <Zap className="w-4 h-4 text-amber-600" />
              <span>Why Periodic Maintenance Matters (नियमित मेंटेनेंस क्यों जरूरी है?)</span>
            </h4>
            <button
              type="button"
              onClick={() => setShowTips(false)}
              className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
            <div className="bg-white p-3 rounded-xl border border-amber-200/80 shadow-2xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-stone-900">
                <Wind className="w-4 h-4 text-sky-500" />
                <span>AC Servicing (90-120 Days)</span>
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed font-normal">
                Saves up to 25% electricity, prevents compressor gas leakage, and stops indoor water dripping in peak summer.
              </p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-amber-200/80 shadow-2xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-stone-900">
                <Droplet className="w-4 h-4 text-cyan-500" />
                <span>RO Purifier (90-180 Days)</span>
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed font-normal">
                Sediment and carbon filter replacement protects the costly RO membrane and guarantees safe, bacteria-free drinking water.
              </p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-amber-200/80 shadow-2xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-stone-900">
                <RotateCcw className="w-4 h-4 text-indigo-500" />
                <span>Washing Machine (180 Days)</span>
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed font-normal">
                Removes limescale accumulation, cleans lint trap, eliminates musty fabric odor, and prevents drum bearing wear.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs & Quick Action Bar */}
      <div className="p-4 sm:p-5 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3 bg-stone-50/50">
        <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterTab === 'all'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            All Appliances ({reminders.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('needs_attention')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterTab === 'needs_attention'
                ? 'bg-white text-rose-700 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <span>Needs Service</span>
            {needsAttentionCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black">
                {needsAttentionCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('healthy')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterTab === 'healthy'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Healthy ({healthyCount})
          </button>
        </div>

        <div className="text-xs text-stone-500 font-medium">
          Showing {filteredReminders.length} reminder{filteredReminders.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* Main Reminders Cards Grid */}
      <div className="p-4 sm:p-6 space-y-4">
        {filteredReminders.length === 0 ? (
          <div className="text-center py-10 px-4 bg-stone-50 rounded-2xl border border-dashed border-stone-200 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-stone-800">
              {filterTab === 'needs_attention'
                ? 'All tracked appliances are in healthy condition!'
                : 'No appliances in this view'}
            </h4>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Want to keep track of another AC, water purifier, or refrigerator? Add it to your watchlist.
            </p>
            <button
              type="button"
              onClick={() => handleOpenAddModal()}
              className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Track An Appliance</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredReminders.map((reminder) => {
              const isOverdue = reminder.status === 'overdue';
              const isDueSoon = reminder.status === 'due_soon';
              const isHealthy = reminder.status === 'healthy';
              const isSuggested = reminder.status === 'suggested';
              const isSnoozed = Boolean(reminder.snoozedUntil);

              // Health Bar Styling
              let healthBg = 'bg-emerald-500';
              let healthBorder = 'border-stone-200';
              if (isOverdue) {
                healthBg = 'bg-rose-500';
                healthBorder = 'border-rose-200 bg-rose-50/20';
              } else if (isDueSoon || isSuggested) {
                healthBg = 'bg-amber-500';
                healthBorder = 'border-amber-200 bg-amber-50/15';
              }

              return (
                <div
                  key={reminder.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between space-y-4 shadow-2xs hover:shadow-md ${healthBorder}`}
                >
                  {/* Card Header */}
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-white shadow-2xs border border-stone-200 flex items-center justify-center shrink-0">
                          {renderApplianceIcon(reminder.applianceType)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="text-sm font-black text-stone-900 truncate">
                              {reminder.displayName}
                            </h3>
                            {reminder.brandModel && (
                              <span className="text-[10px] font-bold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded-md">
                                {reminder.brandModel}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-stone-500 font-medium truncate">
                            Recommended cycle: every {reminder.cycleDays} days
                          </p>
                        </div>
                      </div>

                      {/* Status Chip */}
                      <div className="shrink-0 text-right">
                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-black animate-pulse">
                            <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                            <span>Overdue ({Math.abs(reminder.daysRemaining)}d)</span>
                          </span>
                        )}
                        {isDueSoon && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-[11px] font-black">
                            <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>Due in {reminder.daysRemaining} days</span>
                          </span>
                        )}
                        {isSuggested && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-orange-900 text-[11px] font-black">
                            <Sparkles className="w-3 h-3 text-orange-600 shrink-0" />
                            <span>Recommended</span>
                          </span>
                        )}
                        {isHealthy && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>Healthy</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Health Gauge Progress Bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-stone-600">
                        <span>Appliance Health Score</span>
                        <span className={isOverdue ? 'text-rose-600' : isDueSoon ? 'text-amber-600' : 'text-emerald-600'}>
                          {reminder.healthScore}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${healthBg}`}
                          style={{ width: `${Math.max(5, reminder.healthScore)}%` }}
                        />
                      </div>
                    </div>

                    {/* Service History Context */}
                    <div className="bg-stone-50/80 rounded-xl p-2.5 border border-stone-200/70 text-[11px] space-y-1">
                      <div className="flex items-center justify-between text-stone-600">
                        <span className="font-semibold">Last Serviced:</span>
                        <span className="font-bold text-stone-800">
                          {formatFriendlyDate(reminder.lastServiceDate)} ({reminder.daysElapsed} days ago)
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-stone-600">
                        <span className="font-semibold">Next Service Target:</span>
                        <span className="font-bold text-stone-800 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-orange-500" />
                          {formatFriendlyDate(reminder.nextDueDate)}
                        </span>
                      </div>
                      {reminder.lastBookingServiceName && (
                        <div className="text-[10px] text-stone-500 truncate pt-0.5 border-t border-stone-200/50">
                          From booking: <span className="font-semibold text-stone-700">{reminder.lastBookingServiceName}</span>
                        </div>
                      )}
                      {isSnoozed && (
                        <div className="text-[10px] text-amber-700 font-bold flex items-center justify-between pt-0.5">
                          <span>Snoozed until {formatFriendlyDate(reminder.snoozedUntil!)}</span>
                          <button
                            type="button"
                            onClick={() => handleClearSnooze(reminder.id)}
                            className="underline hover:text-amber-900 cursor-pointer"
                          >
                            Resume
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Action Advice & Benefits */}
                    <div className="space-y-1">
                      <p className="text-xs text-stone-700 font-medium leading-relaxed">
                        {reminder.recommendedAction}
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px] text-orange-800 bg-orange-50/70 px-2 py-1 rounded-lg border border-orange-100 font-semibold">
                        <Shield className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                        <span className="truncate">{reminder.benefitHint}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="space-y-2 pt-2 border-t border-stone-100">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-stone-400 block uppercase">
                          Standard Service
                        </span>
                        <span className="text-sm font-black text-stone-900">
                          ₹{reminder.estimatedPrice}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Snooze Popover Trigger */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveSnoozeId(activeSnoozeId === reminder.id ? null : reminder.id)
                            }
                            className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                            title="Snooze reminder"
                          >
                            <Bell className="w-3.5 h-3.5 text-stone-500" />
                          </button>

                          {activeSnoozeId === reminder.id && (
                            <div className="absolute right-0 bottom-full mb-2 w-44 bg-white rounded-2xl shadow-xl border border-stone-200 p-2 z-20 space-y-1 text-left animate-in fade-in zoom-in-95">
                              <div className="text-[10px] font-bold text-stone-400 px-2 py-1 uppercase">
                                Snooze alert for:
                              </div>
                              <button
                                type="button"
                                onClick={() => handleSnooze(reminder.id, 7)}
                                className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-orange-50 hover:text-orange-700 rounded-lg transition-colors cursor-pointer"
                              >
                                7 Days
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSnooze(reminder.id, 15)}
                                className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-orange-50 hover:text-orange-700 rounded-lg transition-colors cursor-pointer"
                              >
                                15 Days
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSnooze(reminder.id, 30)}
                                className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-orange-50 hover:text-orange-700 rounded-lg transition-colors cursor-pointer"
                              >
                                30 Days (1 Month)
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Add to Calendar Button */}
                        <button
                          type="button"
                          onClick={() => handleDownloadCalendar(reminder)}
                          className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                          title="Add reminder to Calendar (.ics)"
                        >
                          <Download className="w-3.5 h-3.5 text-stone-500" />
                        </button>

                        {/* If custom tracked, allow delete */}
                        {reminder.isCustomTracked && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCustom(reminder.id, reminder.displayName)}
                            className="p-2 rounded-xl bg-stone-100 hover:bg-rose-100 text-stone-400 hover:text-rose-600 font-bold text-xs flex items-center transition-colors cursor-pointer"
                            title="Remove from tracking"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Primary Action: Book Service Now */}
                        <button
                          type="button"
                          onClick={() => handleBookNow(reminder)}
                          className={`px-3.5 py-2 rounded-xl text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                            isOverdue
                              ? 'bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-700 hover:to-orange-700 shadow-rose-200'
                              : 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-orange-200'
                          }`}
                        >
                          <span>बुक करें (Book Now)</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Add Appliances Strip */}
        <div className="bg-stone-50/80 rounded-2xl p-4 border border-stone-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="space-y-0.5 text-center sm:text-left">
            <h4 className="text-xs font-black text-stone-900 flex items-center justify-center sm:justify-start gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
              <span>Track More Household Appliances</span>
            </h4>
            <p className="text-[11px] text-stone-500 font-normal">
              Keep all your home devices in peak condition with scheduled servicing reminders.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={() => handleOpenAddModal('ac')}
              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-sky-50 text-stone-700 hover:text-sky-800 border border-stone-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            >
              <Wind className="w-3 h-3 text-sky-500" />
              <span>+ AC</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenAddModal('ro')}
              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-cyan-50 text-stone-700 hover:text-cyan-800 border border-stone-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            >
              <Droplet className="w-3 h-3 text-cyan-500" />
              <span>+ RO Filter</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenAddModal('washing_machine')}
              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-indigo-50 text-stone-700 hover:text-indigo-800 border border-stone-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            >
              <RotateCcw className="w-3 h-3 text-indigo-500" />
              <span>+ Washing Machine</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenAddModal('refrigerator')}
              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-blue-50 text-stone-700 hover:text-blue-800 border border-stone-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            >
              <Snowflake className="w-3 h-3 text-blue-500" />
              <span>+ Fridge</span>
            </button>
          </div>
        </div>
      </div>

      {/* Add Custom Tracked Appliance Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 bg-gradient-to-r from-stone-900 to-stone-850 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Track Home Appliance</h3>
                  <p className="text-[11px] text-stone-300">Set periodic maintenance alert</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAppliance} className="p-5 space-y-4">
              {/* Select Appliance Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700">Appliance Type (उपकरण का प्रकार)</label>
                <select
                  value={newType}
                  onChange={(e) => {
                    const t = e.target.value as ApplianceType;
                    setNewType(t);
                    setNewCycleDays(APPLIANCE_CONFIGS[t]?.defaultCycleDays || 90);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold text-stone-800 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="ac">Air Conditioner (AC - Split / Window)</option>
                  <option value="ro">RO Water Purifier (Filter & Membrane)</option>
                  <option value="washing_machine">Washing Machine (Front / Top Load)</option>
                  <option value="refrigerator">Refrigerator & Fridge</option>
                  <option value="chimney">Kitchen Chimney & Exhaust</option>
                  <option value="geyser">Geyser & Water Heater</option>
                  <option value="microwave">Microwave & Oven</option>
                  <option value="custom">Other Home Appliance</option>
                </select>
              </div>

              {/* Custom Nickname / Location */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700">Appliance Nickname / Location</label>
                <input
                  type="text"
                  placeholder="e.g. Master Bedroom AC, Kitchen Kent RO"
                  value={newCustomName}
                  onChange={(e) => setNewCustomName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-xs font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Brand / Model */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700">Brand / Model (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Daikin 1.5 Ton, Kent Grand, LG Front Load"
                  value={newBrandModel}
                  onChange={(e) => setNewBrandModel(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-xs font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Last Serviced Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700">
                  Approximate Last Serviced Date (अंतिम सर्विस तिथि)
                </label>
                <input
                  type="date"
                  value={newLastDate}
                  onChange={(e) => setNewLastDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Maintenance Cycle Interval (Days) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-700">
                    Recommended Cycle Interval (दिनों में)
                  </label>
                  <span className="text-[11px] font-black text-orange-600">
                    Every {newCycleDays} Days
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[60, 90, 120, 180].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setNewCycleDays(days)}
                      className={`py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        newCycleDays === days
                          ? 'bg-orange-500 text-white border-orange-600 shadow-xs'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {days} Days
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save to Dashboard</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
