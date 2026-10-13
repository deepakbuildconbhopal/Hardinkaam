import { StructuredBookingContext, RequiredBookingField, KaamDostSessionState } from './memoryTypes';
import { db } from '../../firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const STORAGE_SESSION_PREFIX = 'hardinkaam_kaamdost_memory_';

export class ConversationMemoryEngine {
  // Initialize context with user profile fields if available
  public initContextFromProfile(userProfile?: any, currentUser?: any): StructuredBookingContext {
    const ctx: StructuredBookingContext = {
      city: 'Bhopal',
      district: 'Bhopal',
    };

    if (userProfile) {
      if (userProfile.name) ctx.customerName = userProfile.name;
      if (userProfile.phone) ctx.mobile = userProfile.phone;
      if (userProfile.email) ctx.email = userProfile.email;
      if (userProfile.city) ctx.city = userProfile.city;
      if (userProfile.districtName) ctx.district = userProfile.districtName;
      if (userProfile.address) {
        ctx.address = userProfile.address;
        ctx.location = userProfile.address;
        const areas = [
          'MP Nagar',
          'Arera Colony',
          'Kolar Road',
          'Indrapuri',
          'BHEL',
          'Hoshangabad Road',
          'Ayodhya Bypass',
          'New Market',
          'Karond',
          'Shahpura',
          'Chunabhatti',
          'TT Nagar',
          'Katara Hills',
          'Bawadiya Kalan',
        ];
        const matched = areas.find((a) =>
          userProfile.address.toLowerCase().includes(a.toLowerCase())
        );
        if (matched) ctx.area = matched;
      }
    } else if (currentUser) {
      if (currentUser.displayName) ctx.customerName = currentUser.displayName;
      if (currentUser.phoneNumber) ctx.mobile = currentUser.phoneNumber;
      if (currentUser.email) ctx.email = currentUser.email;
    }

    return ctx;
  }

  // Extract entities and structured information from user utterance and action payloads
  public extractEntities(
    input: string,
    current: StructuredBookingContext,
    payload?: any,
    userProfile?: any
  ): StructuredBookingContext {
    const updated: StructuredBookingContext = { ...current };
    const text = (input || '').trim();
    const lower = text.toLowerCase();

    // 1. Prioritize user profile baseline if field is empty (do not force address so user can choose location)
    if (userProfile) {
      if (!updated.customerName && userProfile.name) updated.customerName = userProfile.name;
      if (!updated.mobile && userProfile.phone) updated.mobile = userProfile.phone;
      if (!updated.email && userProfile.email) updated.email = userProfile.email;
    }

    // 2. Direct Payload Inspection (from dynamic chat component interactions)
    if (payload) {
      // Location & Address Form Payload (Phase 9)
      if (payload.fullAddress || payload.houseFlat || payload.area || payload.locality || payload.name) {
        if (payload.houseFlat) updated.houseFlat = payload.houseFlat;
        if (payload.street) updated.street = payload.street;
        if (payload.area || payload.locality || payload.name) {
          updated.area = payload.area || payload.locality || payload.name;
        }
        if (payload.city) updated.city = payload.city;
        if (payload.district) updated.district = payload.district;
        if (payload.state) updated.state = payload.state;
        if (payload.pincode) updated.pincode = payload.pincode;
        if (payload.landmark) updated.landmark = payload.landmark;
        if (typeof payload.latitude === 'number') updated.latitude = payload.latitude;
        if (typeof payload.longitude === 'number') updated.longitude = payload.longitude;
        if (payload.locationSource) updated.locationSource = payload.locationSource;

        const assembled =
          payload.fullAddress ||
          (payload.name ? `${payload.name}, Bhopal` : `${updated.houseFlat ? updated.houseFlat + ', ' : ''}${updated.area || 'Bhopal'}`);
        updated.address = assembled;
        updated.location = assembled;
      }

      // Date Picker Payload
      if (payload.date) {
        updated.preferredDate = payload.date;
      }

      // Time Picker Payload
      if (payload.timeRange) {
        updated.preferredTime = `${payload.label || ''} (${payload.timeRange})`.trim();
      }

      // Number / Quantity Payload
      if (typeof payload.value === 'number') {
        updated.quantity = payload.value;
      }

      // Service Selected Payload
      if (payload.name && payload.basePrice) {
        updated.serviceType = payload.name;
        if (payload.categoryName) updated.serviceCategory = payload.categoryName;
        updated.estimatedPrice = payload.basePrice;
      }

      // Options Selected Payload
      if (payload.label && payload.id) {
        updated.serviceType = payload.label;
        if (payload.price) updated.estimatedPrice = payload.price;
        if (payload.id.includes('elec')) updated.serviceCategory = 'Electrician';
        if (payload.id.includes('plumb')) updated.serviceCategory = 'Plumber';
        if (payload.id.includes('ac')) updated.serviceCategory = 'AC Service & Repair';
        if (payload.id.includes('clean')) updated.serviceCategory = 'Deep Cleaning';
      }

      // Service Professional Selected Payload (Phase 10)
      if (payload.id && (payload.trade || payload.skill || payload.totalJobs || payload.experienceYears)) {
        updated.selectedServiceMan = {
          id: payload.id,
          name: payload.name,
          phone: payload.phone || '+91 98260 12345',
          photoUrl: payload.photoUrl,
          skill: payload.skill || payload.trade || 'Senior Professional',
          trade: payload.trade,
          rating: payload.rating || 4.9,
          totalJobs: payload.totalJobs || 50,
          experienceYears: payload.experienceYears || 5,
          approxDistance: payload.approxDistance,
          distanceKm: payload.distanceKm,
          availability: payload.availability || 'उपलब्ध (Available Now)',
          estimatedArrival: payload.estimatedArrival,
          etaMinutes: payload.etaMinutes,
          relevantService: payload.relevantService,
          serviceArea: payload.serviceArea,
        };
      }

      // Attachments Payload
      if (Array.isArray(payload.attachments)) {
        updated.attachments = [...(updated.attachments || []), ...payload.attachments];
      }
    }

    // 3. Natural Language & Regex Extraction

    // Customer Name pattern (e.g. "मेरा नाम राहुल है" or "Name: Rahul Sharma" or "I am Amit")
    const nameMatch =
      text.match(/(?:mera naam|my name is|naam|name:?|मैं हूँ)\s+([A-Za-z\u0900-\u097F]{2,25}(?:\s+[A-Za-z\u0900-\u097F]{2,25})?)/i);
    if (nameMatch && nameMatch[1] && !nameMatch[1].toLowerCase().includes('kaamdost')) {
      const extractedName = nameMatch[1].trim();
      if (!['electrician', 'plumber', 'bhopal', 'service'].includes(extractedName.toLowerCase())) {
        updated.customerName = extractedName;
      }
    }

    // Phone Number Detection (10-digit Indian numbers starting with 6, 7, 8, 9)
    const phoneMatch = text.match(/\b([6-9]\d{9})\b/);
    if (phoneMatch) {
      updated.mobile = phoneMatch[1];
    }

    // Email Detection
    const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/);
    if (emailMatch) {
      updated.email = emailMatch[0];
    }

    // Service Categories
    if (lower.includes('electric') || lower.includes('बिजली') || lower.includes('लाइट')) {
      updated.serviceCategory = 'Electrician';
    } else if (lower.includes('plumb') || lower.includes('नल') || lower.includes('पाइप') || lower.includes('लीक')) {
      updated.serviceCategory = 'Plumber';
    } else if (lower.includes('ac') || lower.includes('ऐसी') || lower.includes('कूलिंग') || lower.includes('air conditioner')) {
      updated.serviceCategory = 'AC Service & Repair';
    } else if (lower.includes('clean') || lower.includes('सफाई') || lower.includes('झाड़ू') || lower.includes('पोछा')) {
      updated.serviceCategory = 'Deep Cleaning';
    } else if (lower.includes('paint') || lower.includes('पुताई') || lower.includes('रंग')) {
      updated.serviceCategory = 'Painting & Whitewashing';
    } else if (lower.includes('carpenter') || lower.includes('बढ़ई') || lower.includes('लकड़ी') || lower.includes('फर्नीचर')) {
      updated.serviceCategory = 'Carpentry';
    }

    // Specific Service Types / Issues
    if (lower.includes('fan') || lower.includes('पंखा') || lower.includes('पंखे')) {
      updated.serviceType = 'Ceiling Fan Repair / Fitting';
      if (!updated.serviceCategory) updated.serviceCategory = 'Electrician';
      if (!updated.estimatedPrice) updated.estimatedPrice = 199;
    } else if (lower.includes('switch') || lower.includes('स्विच') || lower.includes('board') || lower.includes('बोर्ड')) {
      updated.serviceType = 'Switchboard Repair / Installation';
      if (!updated.serviceCategory) updated.serviceCategory = 'Electrician';
      if (!updated.estimatedPrice) updated.estimatedPrice = 149;
    } else if (lower.includes('wiring') || lower.includes('वायरिंग') || lower.includes('short circuit') || lower.includes('शॉर्ट')) {
      updated.serviceType = 'Short Circuit & Wiring Inspection';
      if (!updated.serviceCategory) updated.serviceCategory = 'Electrician';
      if (!updated.estimatedPrice) updated.estimatedPrice = 299;
    } else if (lower.includes('tap') || lower.includes('नल') || lower.includes('leak') || lower.includes('टपक')) {
      updated.serviceType = 'Tap Leak Repair & Replacement';
      if (!updated.serviceCategory) updated.serviceCategory = 'Plumber';
      if (!updated.estimatedPrice) updated.estimatedPrice = 199;
    } else if (lower.includes('tank') || lower.includes('टंकी')) {
      updated.serviceType = 'Water Tank 5-Stage Cleaning';
      if (!updated.serviceCategory) updated.serviceCategory = 'Plumber';
      if (!updated.estimatedPrice) updated.estimatedPrice = 699;
    } else if (lower.includes('motor') || lower.includes('मोटर')) {
      updated.serviceType = 'Water Pump Motor Repair';
      if (!updated.serviceCategory) updated.serviceCategory = 'Plumber';
      if (!updated.estimatedPrice) updated.estimatedPrice = 349;
    } else if (lower.includes('jet') || lower.includes('जेट') || lower.includes('foam')) {
      updated.serviceType = 'AC Foam Jet Pump Deep Service';
      if (!updated.serviceCategory) updated.serviceCategory = 'AC Service & Repair';
      if (!updated.estimatedPrice) updated.estimatedPrice = 499;
    } else if (lower.includes('gas') || lower.includes('गैस')) {
      updated.serviceType = 'AC Gas Top-up / Refill';
      if (!updated.serviceCategory) updated.serviceCategory = 'AC Service & Repair';
      if (!updated.estimatedPrice) updated.estimatedPrice = 1499;
    }

    // Problem Description
    if (
      lower.includes('problem') ||
      lower.includes('kharab') ||
      lower.includes('दिक्कत') ||
      lower.includes('समस्या') ||
      lower.includes('आवाज') ||
      lower.includes('धुआं') ||
      lower.includes('धीमा') ||
      lower.includes('कूलिंग नहीं') ||
      lower.includes('पानी गिर रहा') ||
      lower.includes('जाम')
    ) {
      updated.problemDescription = text;
    }

    // Special Instructions Detection
    if (
      lower.includes('gate') ||
      lower.includes('call') ||
      lower.includes('phone') ||
      lower.includes('bell') ||
      lower.includes('घंटी') ||
      lower.includes('मास्क') ||
      lower.includes('सीढ़ी') ||
      lower.includes('urgent') ||
      lower.includes('जल्दी') ||
      lower.includes('पहले फोन')
    ) {
      updated.specialInstructions = text;
    }

    // Popular Bhopal Localities
    const localities = [
      'MP Nagar',
      'Arera Colony',
      'Kolar Road',
      'Indrapuri',
      'BHEL',
      'Hoshangabad Road',
      'Ayodhya Bypass',
      'New Market',
      'Karond',
      'Shahpura',
      'Chunabhatti',
      'TT Nagar',
      'Katara Hills',
      'Bawadiya Kalan',
      'Govindpura',
      'Kohefiza',
      'Lalghati',
      'Misrod',
      'Bairagarh',
      'Ashoka Garden',
    ];
    for (const loc of localities) {
      if (lower.includes(loc.toLowerCase())) {
        updated.area = loc;
        updated.location = `${loc}, Bhopal`;
        if (!updated.address) {
          updated.address = `${loc}, Bhopal`;
        }
        break;
      }
    }

    // Date mentions
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const dayAfter = new Date(Date.now() + 172800000).toISOString().split('T')[0];

    if (lower.includes('aaj') || lower.includes('today') || lower.includes('आज')) {
      updated.preferredDate = `${today} (आज)`;
    } else if (lower.includes('kal') || lower.includes('tomorrow') || lower.includes('कल')) {
      updated.preferredDate = `${tomorrow} (कल)`;
    } else if (lower.includes('parson') || lower.includes('परसों')) {
      updated.preferredDate = `${dayAfter} (परसों)`;
    }

    // Time slots
    if (lower.includes('urgent') || lower.includes('तत्काल') || lower.includes('60 min') || lower.includes('60 मिनट') || lower.includes('जल्दी')) {
      updated.preferredTime = 'तत्काल (अगले 60 मिनट में Express)';
    } else if (lower.includes('subah') || lower.includes('morning') || lower.includes('सुबह') || lower.includes('10 am') || lower.includes('8 am')) {
      updated.preferredTime = 'सुबह का स्लॉट (08:00 AM - 11:00 AM)';
    } else if (lower.includes('dopahar') || lower.includes('afternoon') || lower.includes('दोपहर') || lower.includes('12 pm') || lower.includes('2 pm')) {
      updated.preferredTime = 'दोपहर का स्लॉट (12:00 PM - 03:00 PM)';
    } else if (lower.includes('shaam') || lower.includes('evening') || lower.includes('शाम') || lower.includes('5 pm') || lower.includes('6 pm')) {
      updated.preferredTime = 'शाम का स्लॉट (04:00 PM - 07:00 PM)';
    }

    // Quantity / Number detection
    const qtyMatch = lower.match(/\b(\d+)\s*(fan|fans|switch|switches|ac|tap|pipe|room|point|पंखे|पंखा|नल|बोर्ड)\b/i);
    if (qtyMatch) {
      updated.quantity = parseInt(qtyMatch[1], 10);
    }

    // Pincode Detection (6-digit Indian PIN)
    const pinMatch = text.match(/\b(4[56]\d{4})\b/);
    if (pinMatch) {
      updated.pincode = pinMatch[1];
    }

    // Landmark Detection
    const landmarkMatch = text.match(/(?:near|opp|opposite|behind|pass|के पास|सामने|पीछे)\s+([A-Za-z0-9\u0900-\u097F\s,-]{2,30})/i);
    if (landmarkMatch && landmarkMatch[1]) {
      updated.landmark = landmarkMatch[1].trim();
    }

    // House / Flat detection
    const houseMatch = text.match(/(?:flat|house|h\.?no|plot|room|मकान|कमरा|फ्लैट)\s*[:#\-]?\s*([A-Za-z0-9\/-]{1,15})/i);
    if (houseMatch && houseMatch[1]) {
      updated.houseFlat = houseMatch[1].trim();
    }

    return updated;
  }

  // Detect missing required fields for booking completion
  public detectMissingFields(context: StructuredBookingContext, userProfile?: any): RequiredBookingField[] {
    const missing: RequiredBookingField[] = [];

    // 1. Service Type or Category
    if (!context.serviceCategory && !context.serviceType) {
      missing.push('serviceCategory');
    } else if (!context.serviceType) {
      missing.push('serviceType');
    }

    // 2. Location / Address (Require explicit selection or address in booking context)
    const hasLocation = Boolean(context.address || context.location);
    if (!hasLocation) {
      missing.push('location');
    }

    // 3. Preferred Date
    if (!context.preferredDate) {
      missing.push('preferredDate');
    }

    // 4. Preferred Time Slot
    if (!context.preferredTime) {
      missing.push('preferredTime');
    }

    // 5. Customer contact info (if not available in profile or context)
    const hasName = Boolean(context.customerName || userProfile?.name);
    if (!hasName) {
      missing.push('customerName');
    }

    const hasPhone = Boolean(context.mobile || userProfile?.phone);
    if (!hasPhone) {
      missing.push('mobile');
    }

    return missing;
  }

  // Save session state to localStorage & optionally Firestore
  public saveSession(state: KaamDostSessionState, userId?: string) {
    const storageKey = STORAGE_SESSION_PREFIX + (userId || 'guest');
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save KaamDost session to localStorage:', e);
    }

    // Authenticated cross-device sync
    if (userId && typeof window !== 'undefined') {
      try {
        const sessionRef = doc(db, 'kaamdost_sessions', userId);
        setDoc(
          sessionRef,
          {
            ...state,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        ).catch((err) => {
          console.warn('Firestore assistant session sync notice:', err);
        });
      } catch (err) {
        // silent recovery
      }
    }
  }

  // Load session state on app refresh / reconnect
  public loadSession(userId?: string): KaamDostSessionState | null {
    const storageKey = STORAGE_SESSION_PREFIX + (userId || 'guest');
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.context) {
          return parsed as KaamDostSessionState;
        }
      }
    } catch (e) {
      console.warn('Failed to load KaamDost session from localStorage:', e);
    }
    return null;
  }

  // Clear memory
  public clearSession(userId?: string) {
    const storageKey = STORAGE_SESSION_PREFIX + (userId || 'guest');
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {
      // ignore
    }
  }
}

export const conversationMemory = new ConversationMemoryEngine();
