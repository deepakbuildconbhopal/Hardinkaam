import { Booking, Service } from '../types';

export type ApplianceType =
  | 'ac'
  | 'ro'
  | 'washing_machine'
  | 'refrigerator'
  | 'chimney'
  | 'geyser'
  | 'microwave'
  | 'custom';

export type MaintenanceUrgency = 'high' | 'medium' | 'low';
export type MaintenanceStatus = 'overdue' | 'due_soon' | 'healthy' | 'suggested';

export interface ApplianceConfig {
  type: ApplianceType;
  nameEn: string;
  nameHi: string;
  defaultCycleDays: number; // e.g. 90 days for AC, 120 days for RO
  keywords: string[];
  recommendedServiceName: string;
  fallbackServiceQuery: string;
  iconName: string;
  benefitsEn: string;
  benefitsHi: string;
  actionReasonEn: string;
  actionReasonHi: string;
  estimatedPrice: number;
}

export const APPLIANCE_CONFIGS: Record<ApplianceType, ApplianceConfig> = {
  ac: {
    type: 'ac',
    nameEn: 'Air Conditioner (Split / Window AC)',
    nameHi: 'एयर कंडीशनर (एसी सर्विसिंग)',
    defaultCycleDays: 90,
    keywords: ['ac', 'air conditioner', 'split ac', 'window ac', 'jet foam', 'gas refill', 'cooling', 'hvac'],
    recommendedServiceName: 'AC Jet Foam & Install',
    fallbackServiceQuery: 'ac',
    iconName: 'Wind',
    benefitsEn: 'Restores 35% faster cooling, prevents gas leakage, and reduces electricity bill by up to 25%.',
    benefitsHi: '35% तेज़ कूलिंग वापस लाता है, गैस लीकेज रोकता है और बिजली बिल में 25% तक बचत करता है।',
    actionReasonEn: 'Coils and filters collect dust every 90 days, choking airflow and overloading the compressor.',
    actionReasonHi: '90 दिनों में कॉइल और फिल्टर में धूल जम जाती है, जिससे कंप्रेसर पर अधिक लोड पड़ता है।',
    estimatedPrice: 499,
  },
  ro: {
    type: 'ro',
    nameEn: 'RO Water Purifier',
    nameHi: 'आरओ वाटर प्यूरीफायर (RO & Filter)',
    defaultCycleDays: 120,
    keywords: ['ro', 'water purifier', 'purifier', 'filter', 'membrane', 'tds', 'aquaguard', 'kent'],
    recommendedServiceName: 'RO Install & Repair',
    fallbackServiceQuery: 'ro',
    iconName: 'Droplet',
    benefitsEn: 'Maintains ideal mineral TDS levels, prevents bacterial biofilm, and extends RO membrane life.',
    benefitsHi: 'उचित मिनरल व TDS स्तर बनाए रखता है, बैक्टीरिया रोकता है और मेम्ब्रेन की लाइफ बढ़ाता है।',
    actionReasonEn: 'Sediment and carbon pre-filters saturate every 3-4 months, risking water taste and pureness.',
    actionReasonHi: 'सेडिमेंट और कार्बन फिल्टर 3-4 महीने में चोक होने लगते हैं, जिससे पानी की शुद्धता प्रभावित होती है।',
    estimatedPrice: 399,
  },
  washing_machine: {
    type: 'washing_machine',
    nameEn: 'Washing Machine',
    nameHi: 'वाशिंग मशीन (सर्विस व डिस्केलिंग)',
    defaultCycleDays: 180,
    keywords: ['washing machine', 'washer', 'laundry', 'drum', 'front load', 'top load'],
    recommendedServiceName: 'Washing Machine Servicing',
    fallbackServiceQuery: 'washing machine',
    iconName: 'RotateCcw',
    benefitsEn: 'Descales limescale accumulation, cleans lint trap & drainage pump, and stops drum vibrations.',
    benefitsHi: 'ड्रम से खारे पानी की पपड़ी हटाता है, ड्रेन पंप साफ करता है और कंपन व बदबू रोकता है।',
    actionReasonEn: 'Hard water scale accumulates in the outer drum every 6 months, reducing wash quality.',
    actionReasonHi: 'हर 6 महीने में ड्रम के अंदर खारा पानी जमने से मशीन की परफॉर्मेंस व कपड़ों की धुलाई प्रभावित होती है।',
    estimatedPrice: 449,
  },
  refrigerator: {
    type: 'refrigerator',
    nameEn: 'Refrigerator & Fridge',
    nameHi: 'रेफ्रिजरेटर व फ्रिज',
    defaultCycleDays: 180,
    keywords: ['refrigerator', 'fridge', 'freezer', 'condenser', 'gasket', 'cooling coil'],
    recommendedServiceName: 'Refrigerator & Fridge Repair',
    fallbackServiceQuery: 'fridge',
    iconName: 'Snowflake',
    benefitsEn: 'Cleans condenser coils, checks door rubber gasket sealing, and maintains uniform cooling.',
    benefitsHi: 'कंडेनसर कॉइल्स साफ करता है, डोर रबर सील की जांच करता है और समान ठंडक बनाए रखता है।',
    actionReasonEn: 'Dust on condenser coils forces the compressor to run 30% longer, raising temperature swings.',
    actionReasonHi: 'कंडेनसर कॉइल पर धूल जमने से कंप्रेसर अधिक देर चलता है और बिजली ज्यादा लगती है।',
    estimatedPrice: 399,
  },
  chimney: {
    type: 'chimney',
    nameEn: 'Kitchen Chimney & Hood',
    nameHi: 'किचन चिमनी व हुड डीप क्लीनिंग',
    defaultCycleDays: 75,
    keywords: ['chimney', 'hood', 'kitchen hood', 'exhaust', 'baffle filter', 'kitchen exhaust'],
    recommendedServiceName: 'Kitchen Chimney Deep Cleaning',
    fallbackServiceQuery: 'chimney',
    iconName: 'Flame',
    benefitsEn: 'Removes thick grease and oil residue, restores high suction capacity, and prevents fire hazards.',
    benefitsHi: 'चिपचिपा तेल और ग्रीस हटाता है, मजबूत सक्शन वापस लाता है और आग के खतरे को रोकता है।',
    actionReasonEn: 'Baffle filters and blower blades accumulate thick sticky oil within 2-3 months of cooking.',
    actionReasonHi: '2-3 महीनों में भारतीय तड़का व मसालों से चिमनी फिल्टर और ब्लोअर में तेल जम जाता है।',
    estimatedPrice: 499,
  },
  geyser: {
    type: 'geyser',
    nameEn: 'Geyser & Water Heater',
    nameHi: 'गीज़र व वाटर हीटर',
    defaultCycleDays: 240,
    keywords: ['geyser', 'water heater', 'instant geyser', 'heating element', 'thermostat'],
    recommendedServiceName: 'Geyser Service & Descaling',
    fallbackServiceQuery: 'geyser',
    iconName: 'Thermometer',
    benefitsEn: 'Descales magnesium anode rod and heating element, verifies pressure release valve safety.',
    benefitsHi: 'हीटिंग रॉड से खारा पानी साफ करता है और सेफ्टी प्रेशर वॉल्व की जांच कर करंट का खतरा रोकता है।',
    actionReasonEn: 'Mineral scaling on heating element doubles electricity usage and leads to coil punctures.',
    actionReasonHi: 'हीटिंग रॉड पर स्केलिंग जमने से पानी गर्म होने में दुगना समय और बिजली खर्च होती है।',
    estimatedPrice: 349,
  },
  microwave: {
    type: 'microwave',
    nameEn: 'Microwave & Oven',
    nameHi: 'माइक्रोवेव व ओवन',
    defaultCycleDays: 180,
    keywords: ['microwave', 'oven', 'otg', 'magnetron'],
    recommendedServiceName: 'Microwave Repair & Service',
    fallbackServiceQuery: 'microwave',
    iconName: 'Cpu',
    benefitsEn: 'Inspects door interlock safety, tests magnetron wave power, and cleans food residue cavity.',
    benefitsHi: 'डोर सेफ्टी लॉक जांचता है, मैग्नेट्रॉन तरंग क्षमता टेस्ट करता है और कैविटी को सैनिटाइज करता है।',
    actionReasonEn: 'Grease on waveguide cover can cause electrical arcing and uneven heating.',
    actionReasonHi: 'वेवगाइड कवर पर तेल के छींटों से स्पार्किंग और असंतुलित हीटिंग का जोखिम रहता है।',
    estimatedPrice: 299,
  },
  custom: {
    type: 'custom',
    nameEn: 'Custom Appliance',
    nameHi: 'कस्टम उपकरण',
    defaultCycleDays: 90,
    keywords: [],
    recommendedServiceName: 'General Appliance Inspection',
    fallbackServiceQuery: 'appliance',
    iconName: 'Wrench',
    benefitsEn: 'Regular servicing prolongs appliance lifespan and ensures uninterrupted household comfort.',
    benefitsHi: 'नियमित सर्विसिंग से उपकरण की उम्र बढ़ती है और अचानक खराबी से बचाव होता है।',
    actionReasonEn: 'Periodic inspection identifies wear and tear before expensive breakdowns occur.',
    actionReasonHi: 'समय पर जांच से बड़ी खराबी और महंगे स्पेयर पार्ट्स के खर्च से बचत होती है।',
    estimatedPrice: 349,
  },
};

export interface CustomTrackedAppliance {
  id: string;
  type: ApplianceType;
  customName: string;
  brandModel?: string;
  lastServiceDate: string; // YYYY-MM-DD
  cycleDays: number;
  notes?: string;
  createdAt: string;
}

export interface ApplianceMaintenanceReminder {
  id: string;
  applianceType: ApplianceType;
  displayName: string;
  brandModel?: string;
  lastServiceDate: string; // YYYY-MM-DD or formatted
  lastBookingId?: string;
  lastBookingServiceName?: string;
  cycleDays: number;
  daysElapsed: number;
  daysRemaining: number;
  nextDueDate: string; // YYYY-MM-DD
  status: MaintenanceStatus;
  urgency: MaintenanceUrgency;
  healthScore: number; // 0 to 100%
  recommendedAction: string;
  benefitHint: string;
  estimatedPrice: number;
  matchedService?: Service;
  isCustomTracked?: boolean;
  snoozedUntil?: string; // YYYY-MM-DD
}

const CUSTOM_APPLIANCES_STORAGE_KEY = 'hardinkaam_tracked_appliances_v1';
const SNOOZED_REMINDERS_STORAGE_KEY = 'hardinkaam_snoozed_reminders_v1';

// Helpers to read and write custom tracked appliances
export function getCustomTrackedAppliances(): CustomTrackedAppliance[] {
  try {
    const raw = localStorage.getItem(CUSTOM_APPLIANCES_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Error reading custom tracked appliances:', err);
    return [];
  }
}

export function saveCustomTrackedAppliance(appliance: Omit<CustomTrackedAppliance, 'id' | 'createdAt'>): CustomTrackedAppliance {
  const current = getCustomTrackedAppliances();
  const newRecord: CustomTrackedAppliance = {
    ...appliance,
    id: `custom-app-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  const updated = [newRecord, ...current];
  try {
    localStorage.setItem(CUSTOM_APPLIANCES_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Error saving custom tracked appliance:', err);
  }
  return newRecord;
}

export function removeCustomTrackedAppliance(id: string): void {
  const current = getCustomTrackedAppliances();
  const updated = current.filter((a) => a.id !== id);
  try {
    localStorage.setItem(CUSTOM_APPLIANCES_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Error deleting custom tracked appliance:', err);
  }
}

// Helpers for snoozing reminders
export function getSnoozedRemindersMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(SNOOZED_REMINDERS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function snoozeReminder(reminderId: string, daysToAdd: number): void {
  const map = getSnoozedRemindersMap();
  const snoozeDate = new Date();
  snoozeDate.setDate(snoozeDate.getDate() + daysToAdd);
  map[reminderId] = snoozeDate.toISOString().slice(0, 10);
  try {
    localStorage.setItem(SNOOZED_REMINDERS_STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('Error saving snooze:', err);
  }
}

export function clearSnooze(reminderId: string): void {
  const map = getSnoozedRemindersMap();
  delete map[reminderId];
  try {
    localStorage.setItem(SNOOZED_REMINDERS_STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('Error clearing snooze:', err);
  }
}

// Appliance Detection from Booking
export function identifyApplianceType(booking: Booking): ApplianceType | null {
  const textToScan = `${booking.serviceName || ''} ${booking.categoryName || ''} ${booking.notes || ''}`.toLowerCase();

  for (const [type, config] of Object.entries(APPLIANCE_CONFIGS)) {
    if (type === 'custom') continue;
    for (const kw of config.keywords) {
      if (textToScan.includes(kw)) {
        return type as ApplianceType;
      }
    }
  }

  return null;
}

// Calculate days between two dates
export function calculateDaysBetween(fromDateStr: string, toDate: Date = new Date()): number {
  try {
    const from = new Date(fromDateStr);
    if (isNaN(from.getTime())) return 0;
    const diffMs = toDate.getTime() - from.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  } catch {
    return 0;
  }
}

// Format date nicely
export function formatFriendlyDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// Find matching service from catalog
export function findMatchingService(
  type: ApplianceType,
  services: Service[]
): Service | undefined {
  const config = APPLIANCE_CONFIGS[type];
  if (!config) return undefined;

  // Try exact name match
  let match = services.find((s) =>
    s.name.toLowerCase().includes(config.recommendedServiceName.toLowerCase())
  );
  if (match) return match;

  // Try keyword match
  for (const kw of config.keywords) {
    match = services.find((s) => s.name.toLowerCase().includes(kw) || s.categoryName?.toLowerCase().includes(kw));
    if (match) return match;
  }

  // Fallback to query
  return services.find((s) => s.name.toLowerCase().includes(config.fallbackServiceQuery));
}

/**
 * Main Analysis Engine:
 * Analyzes customer's past bookings and custom tracked appliances,
 * producing an organized array of reminders sorted by urgency.
 */
export function analyzeCustomerApplianceReminders(
  bookings: Booking[],
  services: Service[]
): ApplianceMaintenanceReminder[] {
  const snoozedMap = getSnoozedRemindersMap();
  const todayIso = new Date().toISOString().slice(0, 10);
  const reminders: ApplianceMaintenanceReminder[] = [];

  // Group bookings by detected appliance type and pick most recent
  const applianceLatestBookingMap = new Map<ApplianceType, Booking>();

  // Filter relevant customer bookings (completed or with dates in the past)
  const validBookings = (bookings || []).filter((b) => {
    const status = b.status?.toLowerCase();
    return status === 'completed' || status === 'work_completed' || status === 'accepted' || status === 'in_progress';
  });

  for (const booking of validBookings) {
    const applianceType = identifyApplianceType(booking);
    if (!applianceType) continue;

    const existing = applianceLatestBookingMap.get(applianceType);
    if (!existing) {
      applianceLatestBookingMap.set(applianceType, booking);
    } else {
      const existingDate = new Date(existing.scheduledDate || existing.createdAt || 0).getTime();
      const currentDate = new Date(booking.scheduledDate || booking.createdAt || 0).getTime();
      if (currentDate > existingDate) {
        applianceLatestBookingMap.set(applianceType, booking);
      }
    }
  }

  // Generate reminders from booking history
  applianceLatestBookingMap.forEach((booking, applianceType) => {
    const config = APPLIANCE_CONFIGS[applianceType];
    const serviceDateStr = booking.scheduledDate || booking.createdAt || todayIso;
    const daysElapsed = calculateDaysBetween(serviceDateStr);
    const cycleDays = config.defaultCycleDays;
    const daysRemaining = cycleDays - daysElapsed;

    const nextDueDateObj = new Date(serviceDateStr);
    nextDueDateObj.setDate(nextDueDateObj.getDate() + cycleDays);
    const nextDueDate = nextDueDateObj.toISOString().slice(0, 10);

    const reminderId = `booking-reminder-${applianceType}-${booking.id}`;
    const snoozedUntil = snoozedMap[reminderId];
    const isSnoozed = snoozedUntil && snoozedUntil > todayIso;

    // Calculate Health Score: 100% freshly serviced -> decays to 0% at or after cycleDays
    const rawHealth = Math.round(Math.max(0, Math.min(100, ((cycleDays - daysElapsed) / cycleDays) * 100)));

    let status: MaintenanceStatus = 'healthy';
    let urgency: MaintenanceUrgency = 'low';

    if (daysRemaining <= 0) {
      status = 'overdue';
      urgency = 'high';
    } else if (daysRemaining <= 21) {
      status = 'due_soon';
      urgency = 'medium';
    } else {
      status = 'healthy';
      urgency = 'low';
    }

    if (isSnoozed) {
      urgency = 'low';
    }

    const matchedService = findMatchingService(applianceType, services);

    reminders.push({
      id: reminderId,
      applianceType,
      displayName: config.nameEn,
      lastServiceDate: serviceDateStr,
      lastBookingId: booking.id,
      lastBookingServiceName: booking.serviceName,
      cycleDays,
      daysElapsed,
      daysRemaining,
      nextDueDate,
      status,
      urgency,
      healthScore: rawHealth,
      recommendedAction: config.actionReasonEn,
      benefitHint: config.benefitsEn,
      estimatedPrice: matchedService?.price || config.estimatedPrice,
      matchedService,
      isCustomTracked: false,
      snoozedUntil: isSnoozed ? snoozedUntil : undefined,
    });
  });

  // Include custom user-tracked appliances
  const customAppliances = getCustomTrackedAppliances();
  for (const custom of customAppliances) {
    const config = APPLIANCE_CONFIGS[custom.type] || APPLIANCE_CONFIGS.custom;
    const serviceDateStr = custom.lastServiceDate || todayIso;
    const daysElapsed = calculateDaysBetween(serviceDateStr);
    const cycleDays = custom.cycleDays || config.defaultCycleDays;
    const daysRemaining = cycleDays - daysElapsed;

    const nextDueDateObj = new Date(serviceDateStr);
    nextDueDateObj.setDate(nextDueDateObj.getDate() + cycleDays);
    const nextDueDate = nextDueDateObj.toISOString().slice(0, 10);

    const reminderId = `custom-reminder-${custom.id}`;
    const snoozedUntil = snoozedMap[reminderId];
    const isSnoozed = snoozedUntil && snoozedUntil > todayIso;

    const rawHealth = Math.round(Math.max(0, Math.min(100, ((cycleDays - daysElapsed) / cycleDays) * 100)));

    let status: MaintenanceStatus = 'healthy';
    let urgency: MaintenanceUrgency = 'low';

    if (daysRemaining <= 0) {
      status = 'overdue';
      urgency = 'high';
    } else if (daysRemaining <= 21) {
      status = 'due_soon';
      urgency = 'medium';
    } else {
      status = 'healthy';
      urgency = 'low';
    }

    if (isSnoozed) {
      urgency = 'low';
    }

    const matchedService = findMatchingService(custom.type, services);

    reminders.push({
      id: reminderId,
      applianceType: custom.type,
      displayName: custom.customName || config.nameEn,
      brandModel: custom.brandModel,
      lastServiceDate: serviceDateStr,
      cycleDays,
      daysElapsed,
      daysRemaining,
      nextDueDate,
      status,
      urgency,
      healthScore: rawHealth,
      recommendedAction: config.actionReasonEn,
      benefitHint: config.benefitsEn,
      estimatedPrice: matchedService?.price || config.estimatedPrice,
      matchedService,
      isCustomTracked: true,
      snoozedUntil: isSnoozed ? snoozedUntil : undefined,
    });
  }

  // If no reminders yet from bookings or custom tracking, provide default smart suggestions
  // for the most critical household appliances (AC and Water Purifier RO)
  if (reminders.length === 0) {
    const suggestedTypes: ApplianceType[] = ['ac', 'ro'];
    for (const type of suggestedTypes) {
      const config = APPLIANCE_CONFIGS[type];
      const matchedService = findMatchingService(type, services);
      const simulatedLastDays = type === 'ac' ? 105 : 135; // slightly overdue suggestion to prompt service
      const simulatedDate = new Date();
      simulatedDate.setDate(simulatedDate.getDate() - simulatedLastDays);
      const serviceDateStr = simulatedDate.toISOString().slice(0, 10);

      const daysRemaining = config.defaultCycleDays - simulatedLastDays;
      const nextDueDateObj = new Date();
      nextDueDateObj.setDate(nextDueDateObj.getDate() + 3);

      reminders.push({
        id: `suggested-starter-${type}`,
        applianceType: type,
        displayName: config.nameEn,
        lastServiceDate: serviceDateStr,
        cycleDays: config.defaultCycleDays,
        daysElapsed: simulatedLastDays,
        daysRemaining: daysRemaining,
        nextDueDate: nextDueDateObj.toISOString().slice(0, 10),
        status: 'suggested',
        urgency: 'medium',
        healthScore: 35,
        recommendedAction: `Periodic ${config.nameEn} servicing is recommended every ${config.defaultCycleDays} days to ensure peak performance.`,
        benefitHint: config.benefitsEn,
        estimatedPrice: matchedService?.price || config.estimatedPrice,
        matchedService,
        isCustomTracked: false,
      });
    }
  }

  // Sort by urgency: high (overdue) first, then medium (due_soon / suggested), then low (healthy)
  const urgencyWeight: Record<MaintenanceUrgency, number> = {
    high: 3,
    medium: 2,
    low: 1,
  };

  reminders.sort((a, b) => {
    const diffUrgency = urgencyWeight[b.urgency] - urgencyWeight[a.urgency];
    if (diffUrgency !== 0) return diffUrgency;
    return a.daysRemaining - b.daysRemaining;
  });

  return reminders;
}

// Generate an .ics calendar file content for customer's appliance reminder
export function generateIcsCalendarContent(reminder: ApplianceMaintenanceReminder): string {
  const due = new Date(reminder.nextDueDate);
  const year = due.getFullYear();
  const month = String(due.getMonth() + 1).padStart(2, '0');
  const day = String(due.getDate()).padStart(2, '0');
  const dateFormatted = `${year}${month}${day}`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HARDINKAAM//Appliance Maintenance Reminder//EN',
    'BEGIN:VEVENT',
    `SUMMARY:🔧 HARDINKAAM: ${reminder.displayName} Maintenance Due`,
    `DESCRIPTION:Periodic maintenance reminder for ${reminder.displayName}. ${reminder.recommendedAction} Book professional doorstep service on HARDINKAAM.`,
    `DTSTART;VALUE=DATE:${dateFormatted}`,
    `DTEND;VALUE=DATE:${dateFormatted}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    'DESCRIPTION:Appliance Maintenance Due Tomorrow',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

// Download .ics file helper
export function downloadReminderIcs(reminder: ApplianceMaintenanceReminder): void {
  const content = generateIcsCalendarContent(reminder);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `HARDINKAAM-${reminder.applianceType}-Maintenance-${reminder.nextDueDate}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
