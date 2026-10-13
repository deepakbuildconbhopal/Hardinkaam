import * as XLSX from 'xlsx';
import { db } from '../firebase/config';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  orderBy,
  limit,
} from 'firebase/firestore';

export interface MarketingLead {
  id: string;
  businessName: string;
  contactPerson?: string;
  name?: string;
  trade?: string;
  category: string;
  categoryId?: string;
  phone: string;
  alternativePhone?: string;
  address?: string;
  area?: string;
  city: string;
  district?: string;
  state?: string;
  pincode?: string;
  rating?: number;
  userRatingsTotal?: number;
  reviewCount?: number;
  mapsUri?: string;
  website?: string;
  email?: string;
  notes?: string;
  status:
    | 'new'
    | 'contacted'
    | 'follow_up'
    | 'interested'
    | 'requirement_received'
    | 'quote_proposed'
    | 'converted'
    | 'active'
    | 'completed'
    | 'lost'
    | 'closed'
    | 'onboarded'
    | 'rejected'
    | string;
  source: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  marketingCampaignId?: string;
  // Required Business Network attribution fields
  referrerUid?: string;
  referrerRole?: string;
  referralCode?: string;
  leadType?: 'CUSTOMER_REFERRAL' | 'SERVICEMAN_REFERRAL' | 'BUSINESS_REFERRAL';
  businessType?: string;
  requiredService?: string;
  requirement?: string;
}

export interface LeadExcelTemplateCategory {
  categoryId: string;
  name: string;
  hindiName: string;
  suggestedTrades: string;
  basePrice: string;
}

export const MARKETING_CATEGORIES_CATALOG: LeadExcelTemplateCategory[] = [
  { categoryId: 'cat_electrician', name: 'Electrician', hindiName: 'इलेक्ट्रीशियन', suggestedTrades: 'Wiring, Fan Repair, MCB, Inverter, Short Circuit', basePrice: '₹249' },
  { categoryId: 'cat_plumber', name: 'Plumber', hindiName: 'प्लंबर', suggestedTrades: 'Pipe Fitting, Tap Leakage, Motor Pump, Bathroom Fitting', basePrice: '₹249' },
  { categoryId: 'cat_ac_appliance', name: 'AC & Appliance Repair', hindiName: 'एसी व उपकरण रिपेयर', suggestedTrades: 'AC Gas Refill, AC Installation, Fridge, Washing Machine, Microwave', basePrice: '₹399' },
  { categoryId: 'cat_carpenter', name: 'Carpenter', hindiName: 'कारपेंटर / बढ़ई', suggestedTrades: 'Furniture Repair, Door Lock, Modular Kitchen, Wardrobe', basePrice: '₹299' },
  { categoryId: 'cat_painting', name: 'Painter & Polish', hindiName: 'पेंटर व पुट्टी', suggestedTrades: 'Wall Painting, Waterproofing, Texture Paint, Wood Polish', basePrice: '₹499' },
  { categoryId: 'cat_cleaning', name: 'Deep Cleaning', hindiName: 'होम क्लीनिंग', suggestedTrades: 'Full Home Deep Clean, Bathroom Clean, Sofa/Carpet Clean, Water Tank', basePrice: '₹499' },
  { categoryId: 'cat_pest_control', name: 'Pest Control', hindiName: 'पेस्ट कंट्रोल', suggestedTrades: 'Termite Treatment, Cockroach, Bed Bugs, Rodent Control', basePrice: '₹599' },
  { categoryId: 'cat_raj_mistri', name: 'Raj Mistri / Mason', hindiName: 'राजमिस्त्री / चिनाई', suggestedTrades: 'Brick Work, Plaster, Tile Fixing, Floor Marble', basePrice: '₹600/day' },
  { categoryId: 'cat_civil_contractor', name: 'Civil Contractor', hindiName: 'सिविल ठेकेदार', suggestedTrades: 'Building Construction, Renovation, Material + Labour', basePrice: 'Custom' },
  { categoryId: 'cat_fabrication_welding', name: 'Fabrication & Welding', hindiName: 'फैब्रिकेशन व वेल्डिंग', suggestedTrades: 'Iron Gate, Grill, Shed, Steel Railing, Shutter', basePrice: '₹349' },
  { categoryId: 'cat_heavy_fabrication', name: 'Heavy Machinery & Crane', hindiName: 'क्रेन व भारी मशीनरी', suggestedTrades: 'Hydra Crane, JCB, Excavator, Road Roller, Dumper', basePrice: 'Hourly' },
  { categoryId: 'cat_construction_labour', name: 'Construction Labour', hindiName: 'मजदूर व हेल्पर', suggestedTrades: 'Daily Wage Helper, Loading/Unloading, Demolition', basePrice: '₹450/day' },
  { categoryId: 'cat_salon', name: 'Salon & Beautician', hindiName: 'सैलून व ब्यूटीशियन', suggestedTrades: 'Bridal Makeup, Hair Cut, Facial, Mehndi, Grooming at Home', basePrice: '₹299' },
  { categoryId: 'cat_security_manpower', name: 'Security Guard & Manpower', hindiName: 'सुरक्षा गार्ड व मैनपॉवर', suggestedTrades: 'Security Guards, Bouncers, Event Security, Housekeeping Staff', basePrice: 'Monthly' },
  { categoryId: 'cat_cctv_security', name: 'CCTV & Electronics', hindiName: 'सीसीटीवी व सुरक्षा उपकरण', suggestedTrades: 'CCTV Camera Setup, Biometric, Video Door Phone, Intercom', basePrice: '₹499' },
  { categoryId: 'cat_solar_power', name: 'Solar Panel System', hindiName: 'सोलर पैनल स्थापना', suggestedTrades: 'Rooftop Solar, Inverter Battery Solar, Net Metering', basePrice: 'Quotation' },
  { categoryId: 'cat_event_tent', name: 'Event, Tent & Light', hindiName: 'टेंट, लाइट व डेकोरेशन', suggestedTrades: 'Tent House, Stage Setup, Haldi/Mehndi Decor, Catering', basePrice: 'Quotation' },
  { categoryId: 'cat_driver_services', name: 'Driver on Demand', hindiName: 'ड्राइवर सेवा', suggestedTrades: 'City Driver, Outstation Driver, Commercial Vehicle Driver', basePrice: '₹399' },
];

/**
 * Standardize Indian Phone Number to clean 10 digits
 */
export function cleanPhoneNumber(raw: any): string {
  if (!raw) return '';
  let str = String(raw).trim().replace(/[^\d]/g, '');
  if (str.startsWith('91') && str.length === 12) {
    str = str.slice(2);
  } else if (str.startsWith('0') && str.length === 11) {
    str = str.slice(1);
  }
  return str.slice(-10);
}

/**
 * Fetch all marketing leads from Firestore / API
 */
export async function fetchAllMarketingLeads(filters?: {
  category?: string;
  city?: string;
  status?: string;
  search?: string;
}): Promise<MarketingLead[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.category && filters.category !== 'all') params.set('category', filters.category);
    if (filters?.city && filters.city !== 'all') params.set('city', filters.city);
    if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters?.search) params.set('search', filters.search);

    const res = await fetch(`/api/admin/marketing-leads?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.leads)) {
        return data.leads;
      }
    }
  } catch (apiErr) {
    console.warn('API fetch marketing leads fallback to direct Firestore:', apiErr);
  }

  // Direct Firestore fallback
  try {
    const snap = await getDocs(query(collection(db, 'marketing_leads'), limit(100)));
    const leads: MarketingLead[] = [];
    snap.forEach((d) => {
      leads.push({ id: d.id, ...d.data() } as MarketingLead);
    });
    leads.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return leads;
  } catch (fsErr) {
    console.error('Direct Firestore fetch marketing leads failed:', fsErr);
    return [];
  }
}

/**
 * Save single marketing lead
 */
export async function saveMarketingLead(lead: Partial<MarketingLead>): Promise<MarketingLead> {
  const leadId = lead.id || `lead_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();
  const payload: MarketingLead = {
    id: leadId,
    businessName: lead.businessName || lead.name || 'Service Enterprise',
    contactPerson: lead.contactPerson || '',
    name: lead.name || lead.businessName || '',
    trade: lead.trade || lead.category || 'General',
    category: lead.category || lead.trade || 'Electrician',
    categoryId: lead.categoryId || 'cat_electrician',
    phone: cleanPhoneNumber(lead.phone) || lead.phone || '',
    alternativePhone: cleanPhoneNumber(lead.alternativePhone) || '',
    address: lead.address || '',
    area: lead.area || '',
    city: lead.city || 'Bhopal',
    district: lead.district || lead.city || 'Bhopal',
    state: lead.state || 'Madhya Pradesh',
    pincode: lead.pincode || '',
    rating: Number(lead.rating) || 4.5,
    userRatingsTotal: Number(lead.userRatingsTotal || lead.reviewCount) || 12,
    reviewCount: Number(lead.reviewCount || lead.userRatingsTotal) || 12,
    mapsUri: lead.mapsUri || '',
    website: lead.website || '',
    email: lead.email || '',
    notes: lead.notes || '',
    status: lead.status || 'new',
    source: lead.source || 'manual_entry',
    createdAt: lead.createdAt || now,
    updatedAt: now,
  };

  try {
    const res = await fetch('/api/admin/marketing-leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.lead) return data.lead;
    }
  } catch (apiErr) {
    console.warn('API save marketing lead fallback to direct Firestore:', apiErr);
  }

  try {
    const clean = Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== undefined));
    await setDoc(doc(db, 'marketing_leads', leadId), clean, { merge: true });
  } catch (fsErr) {
    console.warn('Firestore direct write notice:', fsErr);
  }
  return payload;
}

/**
 * Bulk save marketing leads (e.g. from Excel or Search)
 */
export async function bulkSaveMarketingLeads(leads: Partial<MarketingLead>[]): Promise<{ count: number; savedIds: string[] }> {
  if (!leads.length) return { count: 0, savedIds: [] };

  try {
    const res = await fetch('/api/admin/marketing-leads/bulk-save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leads }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return { count: data.count, savedIds: data.savedIds || [] };
      }
    }
  } catch (apiErr) {
    console.warn('API bulk save fallback to Firestore batching:', apiErr);
  }

  const now = new Date().toISOString();
  const savedIds: string[] = [];
  const BATCH_SIZE = 100;

  for (let i = 0; i < leads.length; i += BATCH_SIZE) {
    const chunk = leads.slice(i, i + BATCH_SIZE);
    try {
      const batch = writeBatch(db);
      for (const lead of chunk) {
        const id = lead.id || `lead_${Date.now()}_${Math.floor(Math.random() * 100000)}_${savedIds.length + 1}`;
        const payload = {
          ...lead,
          id,
          status: lead.status || 'new',
          source: lead.source || 'excel_upload',
          createdAt: lead.createdAt || now,
          updatedAt: now,
        };
        const clean = Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== undefined));
        batch.set(doc(db, 'marketing_leads', id), clean, { merge: true });
        savedIds.push(id);
      }
      await batch.commit();
    } catch (batchErr) {
      console.warn('Firestore direct batch notice:', batchErr);
    }
  }

  return { count: savedIds.length || leads.length, savedIds };
}

/**
 * Bulk delete marketing leads
 */
export async function bulkDeleteMarketingLeads(ids: string[]): Promise<boolean> {
  if (!ids.length) return true;

  try {
    const res = await fetch('/api/admin/marketing-leads/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    if (res.ok) return true;
  } catch (apiErr) {
    console.warn('API bulk delete fallback:', apiErr);
  }

  try {
    const batch = writeBatch(db);
    for (const id of ids) {
      batch.delete(doc(db, 'marketing_leads', id));
    }
    await batch.commit();
  } catch (fsErr) {
    console.warn('Firestore delete notice:', fsErr);
  }
  return true;
}

/**
 * Bulk update marketing leads status, category, or notes
 */
export async function bulkUpdateMarketingLeads(ids: string[], updates: Partial<MarketingLead>): Promise<boolean> {
  if (!ids.length) return true;

  try {
    const res = await fetch('/api/admin/marketing-leads/bulk-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, updates }),
    });
    if (res.ok) return true;
  } catch (apiErr) {
    console.warn('API bulk update fallback:', apiErr);
  }

  try {
    const now = new Date().toISOString();
    const clean = Object.fromEntries(Object.entries({ ...updates, updatedAt: now }).filter(([_, v]) => v !== undefined));
    const batch = writeBatch(db);
    for (const id of ids) {
      batch.set(doc(db, 'marketing_leads', id), clean, { merge: true });
    }
    await batch.commit();
  } catch (fsErr) {
    console.warn('Firestore update notice:', fsErr);
  }
  return true;
}

/**
 * Generate and download formatted Excel Template with category guidelines
 */
export function downloadMarketingLeadsExcelTemplate(): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Main Template with Pre-filled Demo Rows
  const templateHeaders = [
    'Business Name (फर्म या दुकान का नाम) *',
    'Contact Person (संपर्क व्यक्ति का नाम)',
    'Mobile Number (10 अंकों का मोबाइल नंबर) *',
    'Trade Category (श्रेणी / कार्य) *',
    'City (शहर / जिला) *',
    'Area / Locality (इलाका / पता)',
    'State (राज्य)',
    'Pincode (पिनकोड)',
    'Rating (रेटिंग 1-5)',
    'Email (ईमेल)',
    'Website / Social Link',
    'Notes / Specialties (विशेषताएं)',
    'Status (New / Contacted / Interested / Onboarded)',
  ];

  const sampleRows = [
    [
      'Sharma Electricals & Repair Works',
      'Ramesh Sharma',
      '9826012345',
      'Electrician',
      'Bhopal',
      'MP Nagar Zone 2, Near City Hospital',
      'Madhya Pradesh',
      '462011',
      4.8,
      'sharma.electric@gmail.com',
      'https://maps.google.com/?q=bhopal',
      '10 years experience, residential and commercial wiring',
      'New',
    ],
    [
      'Gupta Plumbing Solutions',
      'Sunil Gupta',
      '9893098765',
      'Plumber',
      'Bhopal',
      'Arera Colony, E-3',
      'Madhya Pradesh',
      '462016',
      4.9,
      '',
      '',
      'Bathroom renovation specialist, 24x7 emergency leak repair',
      'Contacted',
    ],
    [
      'Cool Point AC & Refrigeration',
      'Mohd. Irfan',
      '9755511223',
      'AC & Appliance Repair',
      'Gwalior',
      'City Center, Near Bus Stand',
      'Madhya Pradesh',
      '474011',
      4.7,
      'irfan.ac@gmail.com',
      '',
      'Split & Window AC installation, gas filling expert',
      'Interested',
    ],
    [
      'Jai Balaji Painting Contractors',
      'Dinesh Verma',
      '9425033445',
      'Painter & Polish',
      'Indore',
      'Vijay Nagar, Scheme 54',
      'Madhya Pradesh',
      '452010',
      4.6,
      '',
      '',
      'Royal texture, waterproofing, exterior spray painting',
      'New',
    ],
  ];

  const wsTemplate = XLSX.utils.aoa_to_sheet([templateHeaders, ...sampleRows]);

  // Set column widths for comfortable viewing
  wsTemplate['!cols'] = [
    { wch: 35 }, // Business Name
    { wch: 22 }, // Contact Person
    { wch: 20 }, // Mobile Number
    { wch: 25 }, // Trade Category
    { wch: 18 }, // City
    { wch: 35 }, // Area
    { wch: 18 }, // State
    { wch: 12 }, // Pincode
    { wch: 12 }, // Rating
    { wch: 25 }, // Email
    { wch: 28 }, // Website
    { wch: 40 }, // Notes
    { wch: 18 }, // Status
  ];

  XLSX.utils.book_append_sheet(wb, wsTemplate, 'Marketing_Leads_Template');

  // Sheet 2: Reference List of All Allowed System Categories
  const categoryHeaders = [
    'Category ID',
    'Trade Name (English)',
    'Hindi Name (हिंदी)',
    'Suggested Trades & Skills (सेवाएं)',
    'Base Price / Rate',
  ];

  const categoryRows = MARKETING_CATEGORIES_CATALOG.map((c) => [
    c.categoryId,
    c.name,
    c.hindiName,
    c.suggestedTrades,
    c.basePrice,
  ]);

  const wsCategories = XLSX.utils.aoa_to_sheet([categoryHeaders, ...categoryRows]);
  wsCategories['!cols'] = [{ wch: 22 }, { wch: 25 }, { wch: 22 }, { wch: 50 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsCategories, 'Allowed_Categories_List');

  // Export File
  const timestamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `HARDINKAAM_Marketing_Leads_Template_${timestamp}.xlsx`);
}

/**
 * Export active marketing leads to Excel
 */
export function exportMarketingLeadsToExcel(leads: MarketingLead[], filenamePrefix = 'HARDINKAAM_Marketing_Leads'): void {
  const wb = XLSX.utils.book_new();

  const rows = leads.map((l, index) => ({
    'S.No': index + 1,
    'Lead ID': l.id,
    'Business / Shop Name': l.businessName || l.name || '',
    'Contact Person': l.contactPerson || '',
    'Mobile Number': l.phone || '',
    'Alt Phone': l.alternativePhone || '',
    'Category / Trade': l.category || l.trade || '',
    City: l.city || '',
    'Area / Address': l.address || l.area || '',
    State: l.state || 'Madhya Pradesh',
    Pincode: l.pincode || '',
    Rating: l.rating || 4.5,
    'Review Count': l.reviewCount || l.userRatingsTotal || 0,
    Status: (l.status || 'new').toUpperCase(),
    Source: (l.source || 'internet_search').toUpperCase(),
    Email: l.email || '',
    Website: l.website || l.mapsUri || '',
    Notes: l.notes || '',
    'Added Date': l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-IN') : '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 25 },
    { wch: 30 },
    { wch: 20 },
    { wch: 16 },
    { wch: 16 },
    { wch: 22 },
    { wch: 16 },
    { wch: 30 },
    { wch: 16 },
    { wch: 10 },
    { wch: 8 },
    { wch: 12 },
    { wch: 14 },
    { wch: 18 },
    { wch: 24 },
    { wch: 28 },
    { wch: 35 },
    { wch: 14 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Marketing_Leads');
  const timestamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${filenamePrefix}_${timestamp}.xlsx`);
}

/**
 * Raw Excel sheet data structure for custom mapping
 */
export interface RawExcelSheetData {
  fileName: string;
  sheetNames: string[];
  selectedSheet: string;
  headers: string[];
  rawMatrix: any[][];
  totalRows: number;
}

export interface ColumnMapping {
  businessName: string; // Header name or empty
  contactPerson: string;
  phone: string;
  alternativePhone: string;
  category: string;
  city: string;
  area: string;
  state: string;
  pincode: string;
  rating: string;
  email: string;
  website: string;
  notes: string;
  status: string;
}

export interface DefaultFallbackOptions {
  defaultCategory: string;
  defaultCity: string;
  defaultState: string;
  defaultStatus: 'new' | 'contacted' | 'interested' | 'onboarded' | 'rejected';
}

/**
 * Standard System Template Fields for Column Mapping UI
 */
export const TEMPLATE_FIELD_DEFINITIONS = [
  {
    key: 'businessName',
    label: 'दुकान / बिज़नेस नाम (Business Name)',
    required: false,
    hints: [
      'business', 'firm', 'shop', 'company', 'agency', 'store', 'enterprise', 'title',
      'party', 'vendor', 'contractor', 'trade name', 'establishment', 'org',
      'दुकान', 'फर्म', 'कंपनी', 'बिज़नेस', 'संस्था', 'व्यापार', 'प्रतिष्ठान'
    ],
  },
  {
    key: 'contactPerson',
    label: 'कारीगर / मालिक का नाम (Contact Person)',
    required: false,
    hints: [
      'contact', 'person', 'owner', 'name', 'person name', 'cust', 'customer', 'artisan',
      'karigar', 'technician', 'lead name', 'full name', 'first name',
      'कारीगर', 'मालिक', 'व्यक्ति', 'नाम', 'प्रोपराइटर', 'संपर्क व्यक्ति', 'सदस्य'
    ],
  },
  {
    key: 'phone',
    label: 'मोबाइल नंबर (Mobile Number 10 Digits)',
    required: true,
    hints: [
      'phone', 'mobile', 'cell', 'contact', 'number', 'tel', 'whatsapp', 'mob', 'contact no',
      'mobile no', 'cell no', 'tele', 'ph', 'phone number', 'wa', 'telephone', 'calling',
      'फ़ोन', 'मोबाइल', 'नंबर', 'मोबाईल', 'दूरभाष', 'फोन'
    ],
  },
  {
    key: 'category',
    label: 'सर्विस कैटिगरी / ट्रेड (Trade Category)',
    required: false,
    hints: [
      'category', 'trade', 'service', 'work', 'skill', 'job', 'profession', 'occupation',
      'service type', 'work type', 'karyagar', 'cat', 'field',
      'कैटिगरी', 'ट्रेड', 'काम', 'सेवा', 'कार्य', 'पेशा', 'हुनर'
    ],
  },
  {
    key: 'city',
    label: 'शहर / जिला (City / District)',
    required: false,
    hints: [
      'city', 'district', 'town', 'location', 'place', 'nagar', 'jila', 'municipality',
      'शहर', 'जिला', 'नगर', 'स्थान', 'तहसील'
    ],
  },
  {
    key: 'area',
    label: 'इलाका / पूरा पता (Area / Address)',
    required: false,
    hints: [
      'area', 'address', 'locality', 'street', 'colony', 'ward', 'landmark', 'place', 'zone',
      'पता', 'इलाका', 'कालोनी', 'मोहल्ला', 'वार्ड', 'मार्ग', 'स्थान'
    ],
  },
  {
    key: 'alternativePhone',
    label: 'अन्य फोन / अल्टरनेट नंबर (Alt Phone)',
    required: false,
    hints: ['alt', 'secondary', 'other', 'landline', 'alternate', 'phone2', 'mobile2', 'दूसरा', 'अन्य नंबर'],
  },
  {
    key: 'state',
    label: 'राज्य (State)',
    required: false,
    hints: ['state', 'province', 'prant', 'राज्य', 'प्रदेश', 'प्रांत'],
  },
  {
    key: 'pincode',
    label: 'पिनकोड (Pincode / Zip)',
    required: false,
    hints: ['pin', 'pincode', 'zip', 'postal', 'पिन', 'पिनकोड'],
  },
  {
    key: 'rating',
    label: 'रेटिंग / स्टार (Rating 1-5)',
    required: false,
    hints: ['rating', 'stars', 'score', 'review', 'रेटिंग', 'स्टार', 'अंक'],
  },
  {
    key: 'email',
    label: 'ईमेल पता (Email)',
    required: false,
    hints: ['email', 'mail', 'ईमेल', 'मेल'],
  },
  {
    key: 'website',
    label: 'वेबसाइट / मैप लिंक (Website / URL)',
    required: false,
    hints: ['web', 'site', 'website', 'url', 'link', 'maps', 'वेबसाइट', 'लिंक'],
  },
  {
    key: 'notes',
    label: 'विशेषताएं / टिप्पणी (Notes / Description)',
    required: false,
    hints: ['note', 'notes', 'remark', 'special', 'desc', 'description', 'comment', 'details', 'टिप्पणी', 'विवरण', 'नोट'],
  },
  {
    key: 'status',
    label: 'लीड स्थिति (Lead Status)',
    required: false,
    hints: ['status', 'stage', 'state', 'स्थिति', 'दर्जा'],
  },
];

/**
 * Read raw Excel file into sheets and matrix of rows
 */
export async function readRawExcelFile(file: File, selectedSheetName?: string): Promise<RawExcelSheetData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetNames = workbook.SheetNames;
        if (sheetNames.length === 0) {
          return reject(new Error('Excel file has no sheets'));
        }

        const activeSheetName = selectedSheetName && sheetNames.includes(selectedSheetName)
          ? selectedSheetName
          : sheetNames[0];

        const worksheet = workbook.Sheets[activeSheetName];
        const rawMatrix: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (!rawMatrix || rawMatrix.length === 0) {
          return resolve({
            fileName: file.name,
            sheetNames,
            selectedSheet: activeSheetName,
            headers: [],
            rawMatrix: [],
            totalRows: 0,
          });
        }

        // Find header row (first row with at least 1 non-empty string)
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(5, rawMatrix.length); i++) {
          const nonEmpty = rawMatrix[i].filter((cell) => String(cell).trim().length > 0);
          if (nonEmpty.length >= 2) {
            headerRowIndex = i;
            break;
          }
        }

        const rawHeaders = rawMatrix[headerRowIndex].map((h, colIdx) => {
          const str = String(h || '').trim();
          return str || `Column_${colIdx + 1}`;
        });

        const dataRows = rawMatrix.slice(headerRowIndex + 1).filter((r) =>
          r.some((cell) => String(cell).trim().length > 0)
        );

        resolve({
          fileName: file.name,
          sheetNames,
          selectedSheet: activeSheetName,
          headers: rawHeaders,
          rawMatrix: dataRows,
          totalRows: dataRows.length,
        });
      } catch (err: any) {
        reject(new Error(`Failed to read Excel workbook: ${err?.message || err}`));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file from disk.'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Auto-detect and map raw headers to system template keys
 */
export function autoDetectColumnMapping(headers: string[], sampleRows: any[][] = []): ColumnMapping {
  const mapping: ColumnMapping = {
    businessName: '',
    contactPerson: '',
    phone: '',
    alternativePhone: '',
    category: '',
    city: '',
    area: '',
    state: '',
    pincode: '',
    rating: '',
    email: '',
    website: '',
    notes: '',
    status: '',
  };

  const usedHeaders = new Set<string>();

  TEMPLATE_FIELD_DEFINITIONS.forEach((fieldDef) => {
    for (const h of headers) {
      if (usedHeaders.has(h)) continue;
      const hNorm = h.toLowerCase().trim();
      const matched = fieldDef.hints.some((hint) => {
        const hintNorm = hint.toLowerCase();
        return hNorm === hintNorm || hNorm.includes(hintNorm) || hintNorm.includes(hNorm);
      });
      if (matched) {
        (mapping as any)[fieldDef.key] = h;
        usedHeaders.add(h);
        break;
      }
    }
  });

  // If phone was not matched by header name, do smart content sampling across first rows
  if (!mapping.phone && sampleRows && sampleRows.length > 0) {
    const colCount = headers.length;
    for (let c = 0; c < colCount; c++) {
      const headerName = headers[c];
      if (usedHeaders.has(headerName)) continue;

      let phoneMatches = 0;
      const sampleSize = Math.min(10, sampleRows.length);
      for (let r = 0; r < sampleSize; r++) {
        const cell = String(sampleRows[r]?.[c] || '');
        const clean = cleanPhoneNumber(cell);
        if (clean && clean.length === 10) {
          phoneMatches++;
        }
      }

      if (phoneMatches >= Math.max(1, Math.floor(sampleSize * 0.4))) {
        mapping.phone = headerName;
        usedHeaders.add(headerName);
        break;
      }
    }
  }

  // If businessName was not matched, try finding the first unmatched text column as business/contact
  if (!mapping.businessName && !mapping.contactPerson) {
    for (const h of headers) {
      if (!usedHeaders.has(h) && h.trim().length > 0) {
        mapping.businessName = h;
        usedHeaders.add(h);
        break;
      }
    }
  }

  return mapping;
}

/**
 * Convert raw Excel data into standard template formatted leads
 */
export function convertRawExcelDataToTemplate(
  raw: RawExcelSheetData,
  mapping: ColumnMapping,
  defaults: DefaultFallbackOptions,
  existingLeads: MarketingLead[] = []
): {
  validLeads: Partial<MarketingLead>[];
  duplicateCount: number;
  invalidCount: number;
  totalParsed: number;
  errors: string[];
} {
  const existingPhoneSet = new Set(
    existingLeads.map((l) => cleanPhoneNumber(l.phone)).filter(Boolean)
  );

  const headerIndexMap: Record<string, number> = {};
  raw.headers.forEach((h, idx) => {
    headerIndexMap[h] = idx;
  });

  const getCell = (row: any[], headerName: string): string => {
    if (!headerName || headerIndexMap[headerName] === undefined) return '';
    const idx = headerIndexMap[headerName];
    const val = row[idx];
    return val !== undefined && val !== null ? String(val).trim() : '';
  };

  const validLeads: Partial<MarketingLead>[] = [];
  const seenInFilePhones = new Set<string>();
  let duplicateCount = 0;
  let invalidCount = 0;
  const errors: string[] = [];

  raw.rawMatrix.forEach((row, rowIdx) => {
    const rawPhone = getCell(row, mapping.phone);
    const cleanPhone = cleanPhoneNumber(rawPhone);

    if (!cleanPhone || cleanPhone.length !== 10) {
      invalidCount++;
      if (errors.length < 5) {
        errors.push(`Row ${rowIdx + 1}: अमान्य मोबाइल नंबर "${rawPhone || 'खाली'}"`);
      }
      return;
    }

    if (existingPhoneSet.has(cleanPhone) || seenInFilePhones.has(cleanPhone)) {
      duplicateCount++;
      return;
    }

    seenInFilePhones.add(cleanPhone);

    const businessName = getCell(row, mapping.businessName);
    const contactPerson = getCell(row, mapping.contactPerson);
    const rawCategory = getCell(row, mapping.category) || defaults.defaultCategory || 'Electrician';
    const rawCity = getCell(row, mapping.city) || defaults.defaultCity || 'Bhopal';
    const rawArea = getCell(row, mapping.area);
    const rawAltPhone = cleanPhoneNumber(getCell(row, mapping.alternativePhone));
    const rawState = getCell(row, mapping.state) || defaults.defaultState || 'Madhya Pradesh';
    const rawPincode = getCell(row, mapping.pincode);
    const rawRating = getCell(row, mapping.rating);
    const rawEmail = getCell(row, mapping.email);
    const rawWebsite = getCell(row, mapping.website);
    const rawNotes = getCell(row, mapping.notes);
    const rawStatus = getCell(row, mapping.status);

    // Map to catalog category
    let matchedCategory = rawCategory;
    let matchedCategoryId = 'cat_electrician';

    for (const cat of MARKETING_CATEGORIES_CATALOG) {
      if (
        rawCategory.toLowerCase().includes(cat.name.toLowerCase()) ||
        rawCategory.includes(cat.hindiName) ||
        cat.suggestedTrades.toLowerCase().includes(rawCategory.toLowerCase())
      ) {
        matchedCategory = cat.name;
        matchedCategoryId = cat.categoryId;
        break;
      }
    }

    let statusNormalized: 'new' | 'contacted' | 'interested' | 'onboarded' | 'rejected' = defaults.defaultStatus || 'new';
    if (rawStatus) {
      const sL = rawStatus.toLowerCase();
      if (sL.includes('contact')) statusNormalized = 'contacted';
      else if (sL.includes('interest')) statusNormalized = 'interested';
      else if (sL.includes('onboard') || sL.includes('convert')) statusNormalized = 'onboarded';
      else if (sL.includes('reject')) statusNormalized = 'rejected';
    }

    const lead: Partial<MarketingLead> = {
      id: `lead_conv_${Date.now()}_${rowIdx + 1}`,
      businessName: businessName || contactPerson || `${matchedCategory} Professional`,
      contactPerson: contactPerson || businessName || '',
      name: contactPerson || businessName || `${matchedCategory} Expert`,
      phone: cleanPhone,
      alternativePhone: rawAltPhone || undefined,
      category: matchedCategory,
      categoryId: matchedCategoryId,
      trade: matchedCategory,
      city: rawCity,
      district: rawCity,
      area: rawArea,
      address: rawArea ? `${rawArea}, ${rawCity}, ${rawState}` : `${rawCity}, ${rawState}`,
      state: rawState,
      pincode: rawPincode,
      rating: Number(rawRating) > 0 ? Number(rawRating) : 4.5,
      reviewCount: 12,
      email: rawEmail,
      website: rawWebsite,
      notes: rawNotes ? `Converted from Excel: ${rawNotes}` : 'Converted from Excel Upload',
      status: statusNormalized,
      source: 'excel_upload',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    validLeads.push(lead);
  });

  return {
    validLeads,
    duplicateCount,
    invalidCount,
    totalParsed: raw.rawMatrix.length,
    errors,
  };
}

/**
 * Export converted leads directly into the standard HARDINKAAM template file
 */
export function exportConvertedToStandardTemplateExcel(leads: Partial<MarketingLead>[], filenameSuffix = 'Converted'): void {
  const wb = XLSX.utils.book_new();

  const templateHeaders = [
    'Business / Shop Name (दुकान/फर्म का नाम)',
    'Contact Person (कारीगर/मालिक का नाम)',
    'Mobile Number (10 डिजिट मोबाइल नंबर)',
    'Category / Trade (काम की कैटिगरी)',
    'City (शहर)',
    'Area / Address (इलाका / पता)',
    'State (राज्य)',
    'Pincode (पिनकोड)',
    'Rating (रेटिंग 1-5)',
    'Email Address (ईमेल)',
    'Website / Map Link (वेबसाइट)',
    'Notes / Specialties (विशेष विवरण)',
    'Status (New/Contacted/Interested)',
  ];

  const rows = leads.map((l) => [
    l.businessName || l.name || '',
    l.contactPerson || '',
    l.phone || '',
    l.category || l.trade || '',
    l.city || 'Bhopal',
    l.address || l.area || '',
    l.state || 'Madhya Pradesh',
    l.pincode || '',
    l.rating || 4.5,
    l.email || '',
    l.website || l.mapsUri || '',
    l.notes || '',
    (l.status || 'new').toUpperCase(),
  ]);

  const ws = XLSX.utils.aoa_to_sheet([templateHeaders, ...rows]);
  ws['!cols'] = [
    { wch: 32 },
    { wch: 25 },
    { wch: 18 },
    { wch: 24 },
    { wch: 18 },
    { wch: 32 },
    { wch: 18 },
    { wch: 12 },
    { wch: 10 },
    { wch: 25 },
    { wch: 28 },
    { wch: 35 },
    { wch: 15 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Standardized_Leads');

  // Add categories catalog reference sheet
  const catHeaders = ['Category ID', 'Trade Name', 'Hindi Name', 'Suggested Trades', 'Base Price'];
  const catRows = MARKETING_CATEGORIES_CATALOG.map((c) => [c.categoryId, c.name, c.hindiName, c.suggestedTrades, c.basePrice]);
  const wsCat = XLSX.utils.aoa_to_sheet([catHeaders, ...catRows]);
  wsCat['!cols'] = [{ wch: 22 }, { wch: 25 }, { wch: 22 }, { wch: 45 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsCat, 'Allowed_Categories');

  const timestamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `HARDINKAAM_Standard_Template_${filenameSuffix}_${timestamp}.xlsx`);
}

/**
 * Parse an uploaded Excel or CSV file into structured Marketing Leads
 */
export async function parseUploadedLeadsFile(
  file: File,
  existingLeads: MarketingLead[] = []
): Promise<{
  validLeads: Partial<MarketingLead>[];
  duplicateCount: number;
  invalidCount: number;
  totalParsed: number;
  errors: string[];
}> {
  const existingPhoneSet = new Set(
    existingLeads.map((l) => cleanPhoneNumber(l.phone)).filter(Boolean)
  );

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          return resolve({
            validLeads: [],
            duplicateCount: 0,
            invalidCount: 0,
            totalParsed: 0,
            errors: ['The uploaded file is empty.'],
          });
        }

        const validLeads: Partial<MarketingLead>[] = [];
        const seenInFilePhones = new Set<string>();
        let duplicateCount = 0;
        let invalidCount = 0;
        const errors: string[] = [];

        rawJson.forEach((row, idx) => {
          // Normalize column keys
          const keys = Object.keys(row);
          const getVal = (candidates: string[]): string => {
            for (const c of candidates) {
              const matchedKey = keys.find((k) =>
                k.toLowerCase().trim().includes(c.toLowerCase().trim())
              );
              if (matchedKey && row[matchedKey] !== undefined && String(row[matchedKey]).trim() !== '') {
                return String(row[matchedKey]).trim();
              }
            }
            return '';
          };

          const businessName = getVal(['business name', 'firm', 'shop', 'name', 'company', 'दुकान', 'फर्म']);
          const contactPerson = getVal(['contact person', 'owner', 'person', 'व्यक्ति', 'संपर्क']);
          const rawPhone = getVal(['mobile', 'phone', 'contact', 'number', 'मोबाइल', 'फ़ोन', 'फोन']);
          const rawCategory = getVal(['category', 'trade', 'service', 'work', 'श्रेणी', 'काम', 'ट्रेड']);
          const city = getVal(['city', 'district', 'town', 'शहर', 'जिला']) || 'Bhopal';
          const area = getVal(['area', 'locality', 'address', 'इलाका', 'पता']);
          const state = getVal(['state', 'राज्य']) || 'Madhya Pradesh';
          const pincode = getVal(['pincode', 'pin', 'पिन']);
          const ratingVal = getVal(['rating', 'रेटिंग']);
          const email = getVal(['email', 'ईमेल']);
          const website = getVal(['website', 'maps', 'link', 'url', 'वेबसाइट']);
          const notes = getVal(['notes', 'special', 'description', 'विशेषता', 'विवरण']);
          const statusVal = getVal(['status', 'स्थिति']);

          const cleanPhone = cleanPhoneNumber(rawPhone);

          // Validation: Business Name or Contact Person + valid 10-digit phone
          if (!cleanPhone || cleanPhone.length !== 10) {
            invalidCount++;
            if (errors.length < 5) {
              errors.push(`Row ${idx + 2}: Invalid mobile number "${rawPhone}"`);
            }
            return;
          }

          if (existingPhoneSet.has(cleanPhone) || seenInFilePhones.has(cleanPhone)) {
            duplicateCount++;
            return;
          }

          seenInFilePhones.add(cleanPhone);

          // Find best matching system category
          let matchedCategory = rawCategory || 'Electrician';
          let matchedCategoryId = 'cat_electrician';

          for (const cat of MARKETING_CATEGORIES_CATALOG) {
            if (
              rawCategory.toLowerCase().includes(cat.name.toLowerCase()) ||
              rawCategory.includes(cat.hindiName) ||
              cat.suggestedTrades.toLowerCase().includes(rawCategory.toLowerCase())
            ) {
              matchedCategory = cat.name;
              matchedCategoryId = cat.categoryId;
              break;
            }
          }

          let normalizedStatus: 'new' | 'contacted' | 'interested' | 'onboarded' | 'rejected' = 'new';
          const sLower = statusVal.toLowerCase();
          if (sLower.includes('contact')) normalizedStatus = 'contacted';
          else if (sLower.includes('interest')) normalizedStatus = 'interested';
          else if (sLower.includes('onboard') || sLower.includes('convert')) normalizedStatus = 'onboarded';
          else if (sLower.includes('reject')) normalizedStatus = 'rejected';

          const lead: Partial<MarketingLead> = {
            id: `lead_excel_${Date.now()}_${idx + 1}`,
            businessName: businessName || contactPerson || `${matchedCategory} Professional`,
            contactPerson: contactPerson || businessName || '',
            name: contactPerson || businessName || `${matchedCategory} Expert`,
            phone: cleanPhone,
            category: matchedCategory,
            categoryId: matchedCategoryId,
            trade: matchedCategory,
            city,
            district: city,
            area,
            address: area ? `${area}, ${city}, ${state}` : `${city}, ${state}`,
            state,
            pincode,
            rating: Number(ratingVal) || 4.5,
            reviewCount: 12,
            email,
            website,
            notes,
            status: normalizedStatus,
            source: 'excel_upload',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          validLeads.push(lead);
        });

        resolve({
          validLeads,
          duplicateCount,
          invalidCount,
          totalParsed: rawJson.length,
          errors,
        });
      } catch (err: any) {
        reject(new Error(`Failed to parse Excel file: ${err?.message || err}`));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file from disk.'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Create a Business Lead from "Bring Business to HARDINKAAM"
 * Automatically attaches logged-in user's UID, role, referral code, and BUSINESS_REFERRAL leadType.
 */
export async function createBusinessLead(
  leadData: {
    businessName: string;
    contactPerson?: string;
    phone: string;
    email?: string;
    businessType?: string;
    city?: string;
    area?: string;
    requiredService?: string;
    requirement?: string;
    notes?: string;
  },
  userProfile: { id: string; role: string; referralCode?: string; memberCode?: string; franchiseCode?: string }
): Promise<MarketingLead> {
  const leadId = `biz_lead_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();
  const payload: MarketingLead = {
    id: leadId,
    businessName: leadData.businessName,
    contactPerson: leadData.contactPerson || '',
    name: leadData.contactPerson || leadData.businessName,
    trade: leadData.businessType || leadData.requiredService || 'General Business',
    category: leadData.businessType || 'Business Service',
    categoryId: 'cat_business_referral',
    phone: cleanPhoneNumber(leadData.phone) || leadData.phone,
    email: leadData.email || '',
    city: leadData.city || 'Bhopal',
    district: leadData.city || 'Bhopal',
    area: leadData.area || '',
    address: leadData.area ? `${leadData.area}, ${leadData.city || 'Bhopal'}` : (leadData.city || 'Bhopal'),
    notes: leadData.notes || leadData.requirement || 'Business lead brought via Partner network',
    status: 'new',
    source: 'partner_business_network',
    createdAt: now,
    updatedAt: now,
    referrerUid: userProfile.id,
    referrerRole: userProfile.role,
    referralCode: userProfile.referralCode || userProfile.memberCode || userProfile.franchiseCode || 'HDK-REF',
    leadType: 'BUSINESS_REFERRAL',
    businessType: leadData.businessType || '',
    requiredService: leadData.requiredService || '',
    requirement: leadData.requirement || '',
  };

  try {
    await setDoc(doc(db, 'marketing_leads', leadId), payload, { merge: true });
  } catch (err) {
    console.warn('Error saving business lead to Firestore directly:', err);
  }

  return payload;
}

/**
 * Fetch business leads attributed to a specific referrer UID (Idempotent, Spark-safe)
 */
export async function fetchBusinessLeadsForUser(referrerUid: string): Promise<MarketingLead[]> {
  if (!referrerUid) return [];
  try {
    const q = query(collection(db, 'marketing_leads'), where('referrerUid', '==', referrerUid), limit(50));
    const snap = await getDocs(q);
    const leads: MarketingLead[] = [];
    snap.forEach((d) => {
      leads.push({ id: d.id, ...d.data() } as MarketingLead);
    });
    leads.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return leads;
  } catch (err) {
    console.warn('Error fetching business leads for user:', err);
    return [];
  }
}
