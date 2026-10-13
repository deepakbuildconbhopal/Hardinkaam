import { db } from '../../firebase/config';
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { AssistantLanguage, ActionItem, DynamicChatComponent } from './types';

export type KnowledgeCategory =
  | 'services'
  | 'pricing'
  | 'booking_process'
  | 'cancellation_rules'
  | 'payment_info'
  | 'service_areas'
  | 'partner_info'
  | 'franchise_info'
  | 'support_info'
  | 'faqs';

export interface KnowledgeArticle {
  id: string;
  category: KnowledgeCategory;
  title: string;
  hindiTitle?: string;
  keywords: string[];
  content: string;
  hindiContent?: string;
  bullets?: string[];
  hindiBullets?: string[];
  lastUpdated: string;
  verifiedBy: string;
  isVerified: boolean;
}

export interface KnowledgeQueryResult {
  found: boolean;
  article?: KnowledgeArticle;
  replyText: string;
  suggestedChips: string[];
  actions?: ActionItem[];
  dynamicComponent?: DynamicChatComponent;
  confidence: number;
}

// Default verified knowledge repository for HARDINKAAM (offline/initial fallback and seed)
export const DEFAULT_VERIFIED_KNOWLEDGE: KnowledgeArticle[] = [
  // 1. SERVICES
  {
    id: 'kb_services_overview',
    category: 'services',
    title: 'HARDINKAAM Available Services',
    hindiTitle: 'HARDINKAAM पर उपलब्ध सेवाएं',
    keywords: ['service', 'services', 'kaam', 'suvidha', 'electrician', 'plumber', 'ac', 'cleaning', 'carpenter', 'painter', 'सेवाएं', 'काम'],
    content:
      'HARDINKAAM provides verified doorstep home services across Bhopal: Electrician (wiring, fans, switchboards), Plumber (taps, pipes, tanks, motors), AC Service & Repair (jet pump wash, gas refill), Deep Cleaning (home, bathroom, kitchen), Housemaid & Housekeeping Help, Carpentry, Painting, and Appliance Repair.',
    hindiContent:
      'HARDINKAAM भोपाल में सभी सत्यापित डोरस्टेप सेवाएं प्रदान करता है: इलेक्ट्रीशियन (वायरिंग, पंखे, स्विचबोर्ड), प्लंबर (नल, पाइप, टंकी, मोटर), एसी सर्विस व रिपेयर (जेट पंप वॉश, गैस रीफिल), डीप क्लीनिंग (घर, बाथरूम, किचन), कामवाली बाई व हाउसकीपिंग सहायता, बढ़ई/कारपेंटर, पुताई व पेंटिंग।',
    bullets: [
      '⚡ Electrician (Wiring, Fans, MCB, Inverters)',
      '🔧 Plumber (Taps, Tank Cleaning, Pipe Leaks, Motors)',
      '❄️ AC Service (Jet Pump Deep Cleaning, Gas Top-up)',
      '🧹 Deep Cleaning & Housekeeping Maid Help',
      '🔨 Carpentry & Furniture Repair',
      '🎨 Painting & Whitewashing (Interior & Exterior)',
    ],
    hindiBullets: [
      '⚡ इलेक्ट्रीशियन (वायरिंग, पंखे, एमसीबी, इन्वर्टर)',
      '🔧 प्लंबर (नल, टंकी सफाई, पाइप लीकेज, मोटर)',
      '❄️ एसी सर्विस (जेट पंप डीप क्लीनिंग, गैस रीफिल)',
      '🧹 डीप क्लीनिंग व कामवाली बाई/हाउसकीपिंग सहायता',
      '🔨 बढ़ई व फर्नीचर मरम्मत',
      '🎨 पुताई व पेंटिंग कार्य',
    ],
    lastUpdated: '2026-09-24',
    verifiedBy: 'HARDINKAAM Operations Team',
    isVerified: true,
  },
  {
    id: 'kb_maid_housekeeping',
    category: 'services',
    title: 'House Maid & Housekeeping Assistance',
    hindiTitle: 'कामवाली बाई व घरेलू कार्य सहायता',
    keywords: ['maid', 'मेड', 'बाई', 'bai', 'कामवाली', 'kamwali', 'housemaid', 'house help', 'housekeeping', 'cook', 'bartan', 'बर्तन', 'kapde', 'कपड़े', 'ghar ka kaam', 'ghar ke kaam', 'घर का काम', 'घर के काम'],
    content:
      'Yes! HARDINKAAM provides background-verified doorstep housemaids, housekeeping staff, and deep cleaning professionals in Bhopal. Services include full home deep cleaning, mopping, kitchen & utensil cleaning, bathroom sanitization, and daily housekeeping assistance.',
    hindiContent:
      'हाँ बिल्कुल! HARDINKAAM पर घर के काम के लिए बैकग्राउंड-वेरिफाइड कामवाली बाई, हाउसकीपिंग स्टाफ और होम क्लीनिंग पेशेवर उपलब्ध हैं। इसमें घर की झाड़ू-पोछा, किचन व बर्तन सफाई, बाथरूम सैनिटाइजेशन और दैनिक हाउसकीपिंग सहायता शामिल है।',
    bullets: [
      '🧹 Full Home Deep Cleaning & Mopping (घर की पूरी सफाई)',
      '🧽 Kitchen & Utensils Washing Help (किचन व बर्तन सफाई)',
      '🚿 Bathroom Descaling & Toilet Sanitization (बाथरूम सफाई)',
      '👩‍🍳 Background-Verified & Police-Verified Staff (सत्यापित स्टाफ)',
    ],
    hindiBullets: [
      '🧹 घर की डीप क्लीनिंग व पोछा सहायता',
      '🧽 किचन, सिंक व बर्तन सफाई',
      '🚿 बाथरूम व टॉयलेट सैनिटाइजेशन',
      '👩‍🍳 100% बैकग्राउंड व पुलिस सत्यापित स्टाफ',
    ],
    lastUpdated: '2026-09-24',
    verifiedBy: 'HARDINKAAM Operations Team',
    isVerified: true,
  },

  // 2. PRICING & RATE CARDS
  {
    id: 'kb_pricing_policy',
    category: 'pricing',
    title: 'Transparent Pricing & Rate Card Policy',
    hindiTitle: 'पारदर्शी मूल्य निर्धारण व रेट कार्ड',
    keywords: ['price', 'pricing', 'charge', 'rate', 'cost', 'kitna lagega', 'rate card', 'fees', 'fees kitni hai', 'खर्च', 'दाम', 'फीस', 'रेट'],
    content:
      'HARDINKAAM guarantees 100% transparent pricing with zero hidden charges. Doorstep inspection and visit fee starts from ₹149 - ₹199. Standard repair charges are pre-fixed. Extra material or spare parts are billed with genuine retail GST receipts with your prior approval.',
    hindiContent:
      'HARDINKAAM 100% पारदर्शी मूल्य निर्धारण प्रदान करता है जिसमें कोई छुपा हुआ शुल्क नहीं है। डोरस्टेप इंस्पेक्शन शुल्क ₹149 - ₹199 से शुरू होता है। स्टैंडर्ड काम की दरें पहले से तय हैं। अतिरिक्त स्पेयर पार्ट्स केवल आपकी पूर्व सहमति से असली जीएसटी बिल पर जोड़े जाते हैं।',
    bullets: [
      '🔍 Doorstep Inspection Fee: ₹149 - ₹199 (Adjusted in final bill upon service booking)',
      '⚡ Ceiling Fan Repair / Installation: ₹199',
      '🔧 Tap Leak / Fitting: ₹199',
      '❄️ AC Foam Jet Pump Service: ₹499',
      '💧 Water Tank 5-Stage Cleaning: ₹699',
      '🧾 Zero Hidden Charges — 100% upfront digital estimates',
    ],
    hindiBullets: [
      '🔍 डोरस्टेप इंस्पेक्शन शुल्क: ₹149 - ₹199 (काम कराने पर बिल में समायोजित)',
      '⚡ पंखा रिपेयर / फिटिंग: ₹199',
      '🔧 नल लीकेज / फिटिंग: ₹199',
      '❄️ एसी जेट पंप डीप सर्विस: ₹499',
      '💧 पानी टंकी 5-स्टेज सफाई: ₹699',
      '🧾 कोई छुपा शुल्क नहीं — काम से पहले पक्का डिजिटल एस्टीमेट',
    ],
    lastUpdated: '2026-09-24',
    verifiedBy: 'HARDINKAAM Pricing Committee',
    isVerified: true,
  },

  // 3. BOOKING PROCESS
  {
    id: 'kb_booking_process',
    category: 'booking_process',
    title: 'How Doorstep Booking Works (4 Quick Steps)',
    hindiTitle: 'बुकिंग प्रक्रिया (4 आसान चरण)',
    keywords: ['booking process', 'kaise book karein', 'how to book', 'book kaise hoga', 'process', 'step', 'बुकिंग प्रक्रिया', 'बुक कैसे करें'],
    content:
      'Booking with HARDINKAAM takes under 60 seconds: 1. Select your required service conversationally with KaamDost or browse the catalog. 2. Choose your preferred date, time slot, and address in Bhopal. 3. Get matched with a verified background-checked technician. 4. Technician arrives at your doorstep, verify the Start OTP, and pay securely after satisfactory completion.',
    hindiContent:
      'HARDINKAAM पर बुकिंग 60 सेकंड में हो जाती है: 1. KaamDost AI से चैट करके या कैटलॉग से सेवा चुनें। 2. अपनी पसंदीदा तारीख, समय स्लॉट व भोपाल का पता चुनें। 3. सत्यापित टेक्नीशियन तुरंत असाइन होगा। 4. घर आने पर स्टार्ट OTP बताएं और काम पूरा होने पर सुरक्षित भुगतान करें।',
    bullets: [
      'Step 1: Choose Service & describe the issue',
      'Step 2: Pick Date, Time Slot (Express 60-min available), and Address',
      'Step 3: Verified background-checked technician assigned with live tracking',
      'Step 4: Share Start OTP upon arrival & pay digitally or cash upon completion',
    ],
    hindiBullets: [
      'चरण 1: सेवा चुनें व समस्या बताएं',
      'चरण 2: तारीख, समय (60-मिनट एक्सप्रेस उपलब्ध) व पता चुनें',
      'चरण 3: पुलिस-वेरिफाइड टेक्नीशियन लाइव ट्रैकिंग के साथ असाइन',
      'चरण 4: आगमन पर स्टार्ट OTP दें व काम पूरा होने पर संतुष्ट होकर भुगतान करें',
    ],
    lastUpdated: '2026-09-24',
    verifiedBy: 'HARDINKAAM Operations',
    isVerified: true,
  },

  // 4. CANCELLATION RULES & REFUND POLICY
  {
    id: 'kb_cancellation_rules',
    category: 'cancellation_rules',
    title: 'Cancellation & 100% Refund Policy',
    hindiTitle: 'रद्दीकरण व 100% रिफंड नियम',
    keywords: ['cancel', 'cancellation', 'cancellation policy', 'refund', 'cancel charges', 'radd', 'रिफंड', 'रद्दीकरण', 'कैंसल नियम'],
    content:
      'Free cancellation is available at any time before technician dispatch. If you cancel after the technician is on the way, a nominal ₹49 travel allowance may apply. Online pre-payments are 100% refunded directly to your original payment method within 2-3 business days.',
    hindiContent:
      'टेक्नीशियन के रवाना होने से पहले कभी भी बुकिंग निःशुल्क रद्द की जा सकती है। यदि टेक्नीशियन रास्ते में है तो ₹49 का न्यूनतम यात्रा शुल्क लग सकता है। ऑनलाइन किए गए भुगतान 2-3 कार्यदिवसों में 100% मूल खाते में वापस आ जाते हैं।',
    bullets: [
      '✅ Free Cancellation before technician dispatch',
      '⚡ 100% Instant Wallet Refund or 2-3 days Bank/UPI Refund',
      '🚫 No penalty if technician is delayed beyond committed slot',
      '🛡️ Transparent status updates via KaamDost AI',
    ],
    hindiBullets: [
      '✅ टेक्नीशियन निकलने से पहले पूर्णतः फ्री कैंसिलेशन',
      '⚡ वॉलेट में तुरंत या बैंक खाते/UPI में 2-3 दिन में 100% रिफंड',
      '🚫 टेक्नीशियन की देरी होने पर कोई शुल्क नहीं',
      '🛡️ KaamDost AI से तुरंत एक-क्लिक कैंसल सुविधा',
    ],
    lastUpdated: '2026-09-24',
    verifiedBy: 'HARDINKAAM Legal & Finance',
    isVerified: true,
  },

  // 5. PAYMENT INFORMATION
  {
    id: 'kb_payment_info',
    category: 'payment_info',
    title: 'Payment Methods & Security',
    hindiTitle: 'भुगतान के तरीके व सुरक्षा',
    keywords: ['payment', 'pay', 'upi', 'cash', 'cod', 'card', 'online payment', 'wallet', 'भुगतान', 'पेमेंट', 'कैश'],
    content:
      'HARDINKAAM supports multiple convenient payment modes: Cash on Delivery (COD), UPI (Google Pay, PhonePe, Paytm, BHIM), Debit/Credit Cards, NetBanking, and HARDINKAAM Wallet. Pay only after work completion and inspection.',
    hindiContent:
      'HARDINKAAM सभी प्रमुख भुगतान माध्यमों का समर्थन करता है: कैश ऑन डिलीवरी (COD), UPI (Google Pay, PhonePe, Paytm, BHIM), डेबिट/क्रेडिट कार्ड, नेटबैंकिंग तथा HARDINKAAM वॉलेट। केवल काम पूरा होने और संतुष्ट होने के बाद भुगतान करें।',
    bullets: [
      '💵 Cash on Delivery (COD) to technician after job completion',
      '📱 Instant UPI (Google Pay / PhonePe / Paytm / BHIM)',
      '💳 Credit & Debit Cards with 128-bit bank security',
      '👛 HARDINKAAM Digital Wallet with instant cashback rewards',
      '🧾 Instant GST Invoice PDF generated upon payment',
    ],
    hindiBullets: [
      '💵 काम पूरा होने पर टेक्नीशियन को नकद (COD) भुगतान',
      '📱 त्वरित UPI (Google Pay / PhonePe / Paytm / BHIM)',
      '💳 क्रेडिट व डेबिट कार्ड पूर्ण सुरक्षा के साथ',
      '👛 HARDINKAAM डिजिटल वॉलेट कैशबैक ऑफर्स के साथ',
      '🧾 भुगतान के साथ तुरंत पक्की जीएसटी रसीद',
    ],
    lastUpdated: '2026-09-24',
    verifiedBy: 'HARDINKAAM Finance',
    isVerified: true,
  },

  // 6. SERVICE AREAS
  {
    id: 'kb_service_areas',
    category: 'service_areas',
    title: 'Serviceable Locations & Coverage',
    hindiTitle: 'सेवा क्षेत्र व कवरेज (भोपाल व मध्य प्रदेश)',
    keywords: ['area', 'location', 'service area', 'bhopal', 'kahan service hai', 'coverage', 'kahan kahan', 'इलाका', 'कवरेज', 'क्षेत्र', 'भोपाल'],
    content:
      'HARDINKAAM currently serves all major zones and colonies of Bhopal with 60-minute express doorstep arrival: MP Nagar, Arera Colony, Kolar Road, Indrapuri, BHEL, Hoshangabad Road, Ayodhya Bypass, New Market, Karond, Shahpura, Chunabhatti, TT Nagar, Katara Hills, Bawadiya Kalan, Govindpura, Kohefiza, Lalghati, Misrod, Bairagarh, and Ashoka Garden. Expansion to Indore, Jabalpur, and Gwalior is underway.',
    hindiContent:
      'HARDINKAAM भोपाल के सभी प्रमुख क्षेत्रों व कॉलोनियों में 60-मिनट एक्सप्रेस डोरस्टेप सेवा देता है: एमपी नगर, अरेरा कॉलोनी, कोलार रोड, इंद्रपुरी, भेल (BHEL), होशंगाबाद रोड, अयोध्या बायपास, न्यू मार्केट, करौंद, शाहपुरा, चूनाभट्टी, टीटी नगर, कटारा हिल्स, बावड़िया कलां, गोविंदपुरा, कोहेफिजा, लालघाटी, मिसरोद, बैरागढ़, एवं अशोका गार्डन। इंदौर, जबलपुर और ग्वालियर में विस्तार प्रगति पर है।',
    bullets: [
      '📍 MP Nagar (Zone 1 & Zone 2)',
      '📍 Arera Colony (E1 to E7 Sectors)',
      '📍 Kolar Road & Sarvadharma',
      '📍 Indrapuri, BHEL & Govindpura',
      '📍 Hoshangabad Road & Bawadiya Kalan',
      '📍 Ayodhya Bypass & Karond',
      '📍 New Market, TT Nagar & Shahpura',
    ],
    hindiBullets: [
      '📍 एमपी नगर (जोन 1 व 2)',
      '📍 अरेरा कॉलोनी (E1 से E7 सेक्टर)',
      '📍 कोलार रोड व सर्वधर्म',
      '📍 इंद्रपुरी, भेल व गोविंदपुरा',
      '📍 होशंगाबाद रोड व बावड़िया कलां',
      '📍 अयोध्या बायपास व करौंद',
      '📍 न्यू मार्केट, टीटी नगर व शाहपुरा',
    ],
    lastUpdated: '2026-09-24',
    verifiedBy: 'HARDINKAAM Logistics',
    isVerified: true,
  },

  // 7. PARTNER INFORMATION
  {
    id: 'kb_partner_info',
    category: 'partner_info',
    title: 'Business Partner & Service Pro Onboarding',
    hindiTitle: 'बिजनेस पार्टनर व कारीगर ऑनबोर्डिंग',
    keywords: ['partner', 'service pro', 'technician join', 'join as partner', 'kaam chahiye', 'serviceman banna', 'पार्टनर', 'कारीगर जुड़ें', 'नौकरी'],
    content:
      'Skilled electricians, plumbers, AC technicians, and cleaning specialists can join HARDINKAAM as verified Service Pros. Benefits include: Daily bank payouts, 80%+ revenue share, zero joining commission for first 30 days, ₹121 one-time verified onboarding badge, free uniform and ID card, tool assistance, and guaranteed daily job leads in their local Bhopal area.',
    hindiContent:
      'हुनरमंद इलेक्ट्रीशियन, प्लंबर, एसी टेक्नीशियन व सफाई कारीगर HARDINKAAM से सर्विस प्रो के रूप में जुड़ सकते हैं। लाभ: दैनिक बैंक पेआउट, 80%+ कमाई का हिस्सा, पहले 30 दिन जीरो कमीशन, ₹121 वन-टाइम वेरिफिकेशन बैच, फ्री यूनिफॉर्म व आईडी कार्ड, टूल सहायता, तथा आपके इलाके में पक्के रोज के काम।',
    bullets: [
      '💰 80%+ Revenue Share with Daily Bank Transfer',
      '🛡️ ₹121 Onboarding Fee with verified Police KYC badge',
      '👕 Free Uniform Kit, Tool Bag & Official ID Card',
      '📈 Guaranteed 4-8 service leads daily in your zone',
      '🤝 Dedicated Partner Support Helpline',
    ],
    hindiBullets: [
      '💰 80%+ कमाई शेयर व प्रतिदिन बैंक खाते में पेआउट',
      '🛡️ मात्र ₹121 में पुलिस-सत्यापित ऑनबोर्डिंग बैच',
      '👕 फ्री यूनिफॉर्म किट, टूल बैग व आधिकारिक आईडी कार्ड',
      '📈 आपके इलाके में प्रतिदिन 4 से 8 पक्के काम',
      '🤝 समर्पित पार्टनर हेल्पलाइन व ट्रेनिंग',
    ],
    lastUpdated: '2026-09-24',
    verifiedBy: 'HARDINKAAM Partner Network',
    isVerified: true,
  },

  // 8. FRANCHISE INFORMATION
  {
    id: 'kb_franchise_info',
    category: 'franchise_info',
    title: 'District Franchise & Territory Ownership',
    hindiTitle: 'डिस्ट्रिक्ट फ्रेंचाइजी व टेरिटरी पार्टनरशिप',
    keywords: ['franchise', 'district partner', 'franchise kaise le', 'business opportunity', 'territory', 'फ्रेंचाइजी', 'डिस्ट्रिक्ट पार्टनर'],
    content:
      'HARDINKAAM offers exclusive District Franchise rights for visionary entrepreneurs across Madhya Pradesh districts. Franchisees receive: 100% exclusive territory rights, automated CRM & dispatch portal, shared platform revenue (12-18% GMV), complete marketing playbook, and staff onboarding support.',
    hindiContent:
      'HARDINKAAM मध्य प्रदेश के जिलों में विजनरी उद्यमियों को एक्सक्लूसिव डिस्ट्रिक्ट फ्रेंचाइजी अधिकार प्रदान करता है। फ्रेंचाइजी को मिलता है: 100% एक्सक्लूसिव टेरिटरी राइट्स, ऑटोमेटेड सीआरएम व डिस्पैच पोर्टल, 12-18% जीएमवी रेवेन्यू शेयर, संपूर्ण मार्केटिंग प्लेबुक, तथा कारीगर ऑनबोर्डिंग में कॉर्पोरेट मदद।',
    bullets: [
      '🏛️ Exclusive Zone Monopoly in assigned district/city',
      '📊 Enterprise Dispatch & Customer CRM Software Suite',
      '💵 12% - 18% Continuous Gross Revenue Share',
      '🚀 On-ground launch support, local branding & marketing',
    ],
    hindiBullets: [
      '🏛️ आवंटित जिले में 100% एक्सक्लूसिव एकाधिकार',
      '📊 एंटरप्राइज डिस्पैच व कस्टमर सीआरएम सॉफ्टवेयर',
      '💵 12% से 18% निरंतर सकल राजस्व शेयर',
      '🚀 ग्राउंड लॉन्च सपोर्ट, लोकल ब्रांडिंग व मार्केटिंग किट',
    ],
    lastUpdated: '2026-09-24',
    verifiedBy: 'HARDINKAAM Franchise Division',
    isVerified: true,
  },

  // 9. SUPPORT INFORMATION
  {
    id: 'kb_support_info',
    category: 'support_info',
    title: 'Customer Support Helpline & Escalation',
    hindiTitle: 'कस्टमर सपोर्ट हेल्पलाइन व संपर्क',
    keywords: ['support', 'help', 'helpline', 'contact', 'customer care', 'phone number', 'email', 'shikayat', 'complaint', 'सपोर्ट', 'हेल्पलाइन', 'संपर्क', 'शिकायत'],
    content:
      'HARDINKAAM Customer Support operates 24x7 to assist with bookings, quality audits, pricing inquiries, and technician feedback. Reach us via Helpline: +91 62675 46945, Email: support@hardinkaam.com, or directly through KaamDost AI in-app ticket system. Emergency issues are guaranteed resolution within 60 minutes.',
    hindiContent:
      'HARDINKAAM कस्टमर सपोर्ट 24x7 बुकिंग, क्वालिटी ऑडिट, बिलिंग व टेक्नीशियन फीडबैक के लिए उपलब्ध है। संपर्क करें: हेल्पलाइन +91 62675 46945, ईमेल support@hardinkaam.com, अथवा सीधे KaamDost AI चैट के माध्यम से टिकट दर्ज करें। आपातकालीन शिकायतों का 60 मिनट में समाधान की गारंटी है।',
    bullets: [
      '📞 Phone Helpline: +91 62675 46945 (24x7 Available)',
      '📧 Email: support@hardinkaam.com',
      '🛡️ In-App Ticket Resolution with 60-Minute SLA',
      '📍 Head Office: MP Nagar Zone 1, Bhopal, MP - 462011',
    ],
    hindiBullets: [
      '📞 फोन हेल्पलाइन: +91 62675 46945 (24x7 उपलब्ध)',
      '📧 ईमेल: support@hardinkaam.com',
      '🛡️ ऐप में टिकट ट्रैकिंग व 60 मिनट में समाधान',
      '📍 मुख्य कार्यालय: एमपी नगर जोन 1, भोपाल (म.प्र.) - 462011',
    ],
    lastUpdated: '2026-09-24',
    verifiedBy: 'HARDINKAAM Customer Experience Desk',
    isVerified: true,
  },

  // 10. FAQS
  {
    id: 'kb_faqs',
    category: 'faqs',
    title: 'Frequently Asked Questions (FAQs)',
    hindiTitle: 'अक्सर पूछे जाने वाले सवाल (FAQs)',
    keywords: ['faq', 'faqs', 'questions', 'sawal', 'doubt', 'सवाल', 'पूछे जाने वाले सवाल'],
    content:
      'Top Verified FAQs: Q1. Are technicians background verified? Yes, all pros are 100% police and Aadhaar verified with skill certifications. Q2. What is the 60-Minute Guarantee? If you choose Express Slot, a technician arrives within 60 minutes. Q3. What if I am unsatisfied? We provide a 7-day free rework guarantee.',
    hindiContent:
      'प्रमुख सत्यापित सवाल: प्र1. क्या टेक्नीशियन वेरिफाइड हैं? हाँ, सभी कारीगर 100% पुलिस व आधार सत्यापित और कुशल हैं। प्र2. 60-मिनट गारंटी क्या है? एक्सप्रेस स्लॉट चुनने पर कारीगर 60 मिनट में पहुंचेगा। प्र3. काम पसंद न आने पर क्या होगा? 7-दिन की निःशुल्क री-वर्क गारंटी उपलब्ध है।',
    bullets: [
      '🛡️ Q: Are technicians police verified? A: Yes, 100% background and Aadhaar verified.',
      '⚡ Q: How fast can a technician arrive? A: Within 60 minutes under Express booking.',
      '🔄 Q: Is there any warranty? A: 7-Day Free Doorstep Rework Guarantee on all services.',
      '💳 Q: When do I pay? A: Only after service completion and satisfaction.',
    ],
    hindiBullets: [
      '🛡️ प्र: क्या टेक्नीशियन पुलिस-वेरिफाइड हैं? उ: हाँ, 100% बैकग्राउंड व आधार सत्यापित।',
      '⚡ प्र: टेक्नीशियन कितनी जल्दी पहुंचेंगे? उ: एक्सप्रेस स्लॉट में 60 मिनट के भीतर।',
      '🔄 प्र: क्या काम पर वारंटी है? उ: सभी सेवाओं पर 7 दिन की निःशुल्क री-वर्क गारंटी।',
      '💳 प्र: भुगतान कब करना है? उ: केवल काम पूरा होने और संतुष्ट होने के बाद।',
    ],
    lastUpdated: '2026-09-24',
    verifiedBy: 'HARDINKAAM Customer Trust Division',
    isVerified: true,
  },
];

export class KnowledgeBaseService {
  private articles: KnowledgeArticle[] = [...DEFAULT_VERIFIED_KNOWLEDGE];
  private isLoadedFromFirestore = false;

  constructor() {
    this.syncFromFirestore();
  }

  /**
   * Syncs latest verified knowledge articles from Firestore collection `kaamdost_knowledge_articles`
   */
  public async syncFromFirestore(): Promise<KnowledgeArticle[]> {
    try {
      const colRef = collection(db, 'kaamdost_knowledge_articles');
      const snap = await getDocs(colRef);

      if (!snap.empty) {
        const firestoreArticles: KnowledgeArticle[] = [];
        snap.forEach((d) => {
          firestoreArticles.push(d.data() as KnowledgeArticle);
        });

        if (firestoreArticles.length > 0) {
          this.articles = firestoreArticles;
          this.isLoadedFromFirestore = true;
          return this.articles;
        }
      } else {
        // Seed default verified articles to Firestore if empty
        this.seedInitialKnowledge();
      }
    } catch (e) {
      console.warn('[KnowledgeBaseService] Falling back to default verified knowledge repository:', e);
    }
    return this.articles;
  }

  /**
   * Seeds initial verified knowledge to Firestore for Admin management
   */
  private async seedInitialKnowledge() {
    try {
      for (const article of DEFAULT_VERIFIED_KNOWLEDGE) {
        const docRef = doc(db, 'kaamdost_knowledge_articles', article.id);
        await setDoc(docRef, article, { merge: true });
      }
    } catch (err) {
      // silent fallback
    }
  }

  /**
   * Retrieves all verified articles
   */
  public getAllArticles(): KnowledgeArticle[] {
    return this.articles;
  }

  /**
   * Adds or updates a knowledge article (Admin capability)
   */
  public async saveArticle(article: KnowledgeArticle): Promise<boolean> {
    try {
      const updatedArticle: KnowledgeArticle = {
        ...article,
        lastUpdated: new Date().toISOString().split('T')[0],
        isVerified: true,
      };

      const docRef = doc(db, 'kaamdost_knowledge_articles', updatedArticle.id);
      await setDoc(docRef, updatedArticle, { merge: true });

      // Update in-memory state
      const idx = this.articles.findIndex((a) => a.id === updatedArticle.id);
      if (idx >= 0) {
        this.articles[idx] = updatedArticle;
      } else {
        this.articles.push(updatedArticle);
      }

      return true;
    } catch (err) {
      console.error('[KnowledgeBaseService] Failed to save article:', err);
      return false;
    }
  }

  /**
   * Deletes a knowledge article (Admin capability)
   */
  public async deleteArticle(articleId: string): Promise<boolean> {
    try {
      const docRef = doc(db, 'kaamdost_knowledge_articles', articleId);
      await deleteDoc(docRef);
      this.articles = this.articles.filter((a) => a.id !== articleId);
      return true;
    } catch (err) {
      console.error('[KnowledgeBaseService] Failed to delete article:', err);
      return false;
    }
  }

  /**
   * Queries verified knowledge base with strict anti-hallucination guardrail
   */
  public queryKnowledge(queryText: string, lang: AssistantLanguage = 'hi'): KnowledgeQueryResult {
    const raw = (queryText || '').trim().toLowerCase();
    if (!raw) {
      return this.generateUnknownResponse(lang);
    }

    // Keyword & category matching
    let bestMatch: KnowledgeArticle | null = null;
    let highestScore = 0;

    for (const article of this.articles) {
      let score = 0;

      // Check category name in query
      if (raw.includes(article.category.replace('_', ' ')) || raw.includes(article.category)) {
        score += 30;
      }

      // Check keywords
      for (const kw of article.keywords) {
        if (raw.includes(kw.toLowerCase())) {
          score += 15;
        }
      }

      // Check title words
      const titleWords = (article.title + ' ' + (article.hindiTitle || '')).toLowerCase().split(/\s+/);
      for (const tw of titleWords) {
        if (tw.length > 3 && raw.includes(tw)) {
          score += 10;
        }
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = article;
      }
    }

    // Minimum confidence threshold for verified match
    if (bestMatch && highestScore >= 15) {
      const isHindi = lang === 'hi';
      const heading = isHindi ? bestMatch.hindiTitle || bestMatch.title : bestMatch.title;
      const body = isHindi ? bestMatch.hindiContent || bestMatch.content : bestMatch.content;
      const bullets = isHindi ? bestMatch.hindiBullets || bestMatch.bullets : bestMatch.bullets;

      let reply = `📖 **${heading}**\n\n${body}`;
      if (bullets && bullets.length > 0) {
        reply += `\n\n**${isHindi ? 'मुख्य बिंदु (Key Highlights):' : 'Key Highlights:'}**\n` + bullets.map((b) => `• ${b}`).join('\n');
      }

      const suggestedChips = this.getCategoryChips(bestMatch.category, lang);

      return {
        found: true,
        article: bestMatch,
        replyText: reply,
        suggestedChips,
        confidence: Math.min(1.0, highestScore / 60),
        actions: [
          { label: '🔧 सर्विस बुक करें', actionType: 'navigate_tab', payload: 'services' },
          { label: '📞 सपोर्ट से बात करें', actionType: 'open_call', payload: 'tel:+916267546945' },
        ],
      };
    }

    // If query is an ungrounded inquiry or outside verified knowledge:
    return this.generateUnknownResponse(lang);
  }

  /**
   * Generates strict Fallback response when verified information is unavailable
   * Requirement: "Is information ko confirm karne ke liye support team se connect kar deta hoon."
   */
  public generateUnknownResponse(lang: AssistantLanguage = 'hi'): KnowledgeQueryResult {
    const isHindi = lang === 'hi';
    const replyText = isHindi
      ? 'Is information ko confirm karne ke liye support team se connect kar deta hoon.\n\n📞 हमारी सपोर्ट टीम 24x7 आपकी सहायता के लिए उपलब्ध है:'
      : 'To confirm this verified information, let me connect you with our support team:\n\n📞 Our support desk is available 24x7:';

    return {
      found: false,
      replyText,
      confidence: 0,
      actions: [
        { label: '📞 6267546945 पर कॉल करें', actionType: 'open_call', payload: 'tel:+916267546945' },
        { label: '🛡️ सपोर्ट टिकट दर्ज करें', actionType: 'send_query', payload: 'शिकायत दर्ज करनी है' },
        { label: '💬 लाइव सपोर्ट एजेंट', actionType: 'send_query', payload: 'सपोर्ट से बात करनी है' },
      ],
      suggestedChips: ['📞 कस्टमर केयर कॉल', '🛡️ सपोर्ट टिकट बनाएं', '🔧 नई सर्विस बुक करें'],
    };
  }

  private getCategoryChips(category: KnowledgeCategory, lang: AssistantLanguage): string[] {
    switch (category) {
      case 'services':
        return ['⚡ Electrician', '🔧 Plumber', '❄️ AC Repair', '💰 दर कार्ड देखें'];
      case 'pricing':
        return ['⚡ पंखा रिपेयर शुल्क', '🔧 नल फिटिंग शुल्क', '❄️ एसी सर्विस शुल्क', '🔧 सर्विस बुक करें'];
      case 'booking_process':
        return ['⚡ 60-मिनट एक्सप्रेस बुक करें', '📅 कल का स्लॉट', '📍 पता दर्ज करें'];
      case 'cancellation_rules':
        return ['📋 मेरी बुकिंग्स', '🚫 बुकिंग रद्द करें', '👛 वॉलेट रिफंड'];
      case 'payment_info':
        return ['💳 ऑनलाइन पेमेंट', '💵 कैश ऑन डिलीवरी', '👛 वॉलेट बैलेंस'];
      case 'service_areas':
        return ['📍 एमपी नगर', '📍 अरेरा कॉलोनी', '📍 कोलार रोड', '🔧 सर्विस बुक करें'];
      case 'partner_info':
        return ['🤝 कारीगर रजिस्ट्रेशन', '💼 पार्टनर बनें', '📊 पार्टनर अर्निंग'];
      case 'franchise_info':
        return ['🏛️ फ्रेंचाइजी पूछताछ', '📞 हेड ऑफिस संपर्क', '🤝 फ्रेंचाइजी अप्लाई'];
      case 'support_info':
      case 'faqs':
      default:
        return ['📞 6267546945', '🛡️ सपोर्ट टिकट', '🔧 सर्विस बुक करें', '📋 मेरी बुकिंग्स'];
    }
  }
}

export const knowledgeBaseService = new KnowledgeBaseService();
