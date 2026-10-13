import { Service, Category } from '../../types';
import { DynamicChatComponent, ActionItem } from './types';
import { INITIAL_CATEGORIES, INITIAL_SERVICES } from '../../firebase/seed';
import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase/config';

export interface ServiceDiscoveryResult {
  isMatchFound: boolean;
  isAmbiguous?: boolean;
  isUnavailableService?: boolean;
  isInactiveDistrict?: boolean;
  isCustomService?: boolean;
  category?: Category;
  services?: Service[];
  selectedService?: Service;
  clarificationQuestion?: string;
  responseMessage: string;
  dynamicComponent?: DynamicChatComponent;
  actions?: ActionItem[];
  suggestedChips?: string[];
}

// Active districts for HARDINKAAM on-demand home service
const ACTIVE_DISTRICTS = ['bhopal', 'भोपाल'];
const ROLLOUT_DISTRICTS = ['gwalior', 'ग्वालियर', 'indore', 'इंदौर'];

// Non-HARDINKAAM service keywords that do NOT exist in the catalog
const UNSUPPORTED_DOMAINS: { keywords: string[]; domainName: string; hint: string }[] = [
  {
    keywords: ['car wash', 'car repair', 'car service', 'गाड़ी', 'कार वाश', 'बाइक रिपेयर', 'bike', 'scooter', 'ऑटो'],
    domainName: 'वाहन (Automobile / Car wash)',
    hint: 'हम केवल घरेलू व निर्माण (Home & Construction) सेवाएं प्रदान करते हैं।',
  },
  {
    keywords: ['mobile repair', 'phone repair', 'laptop', 'कंप्यूटर', 'मोबाइल रिपेयर', 'screen change', 'tv screen', 'स्मार्टफोन'],
    domainName: 'इलेक्ट्रॉनिक्स गैजेट्स (Mobile / Laptop)',
    hint: 'हम होम अप्लायंस (AC, फ्रिज, वाशिंग मशीन, गीजर) की सर्विस करते हैं, मोबाइल/लैपटॉप नहीं।',
  },
  {
    keywords: ['flight', 'train', 'bus ticket', 'हवाई टिकट', 'ट्रेन टिकट', 'होटल बुकिंग'],
    domainName: 'यात्रा / टिकट बुकिंग',
    hint: 'HARDINKAAM केवल वेरिफाइड कारीगर और मिस्त्री सेवाएं प्रदान करता है।',
  },
  {
    keywords: ['doctor', 'hospital', 'medicine', 'दवा', 'डॉक्टर', 'इलाज', 'क्लीनिक'],
    domainName: 'चिकित्सा / मेडिकल सेवा',
    hint: 'कृपया नजदीकी अस्पताल या डॉक्टर से संपर्क करें।',
  },
  {
    keywords: ['food delivery', 'खाना', 'पिज़्ज़ा', 'सब्जी', 'राशन', 'grocery'],
    domainName: 'फ़ूड / ग्रोसरी डिलीवरी',
    hint: 'HARDINKAAM ऑन-डिमांड होम सर्विस और कंस्ट्रक्शन सॉल्यूशंस का प्लेटफॉर्म है।',
  },
  {
    keywords: ['advocate', 'lawyer', 'वकील', 'कोर्ट', 'कानूनी'],
    domainName: 'कानूनी सेवाएं (Legal services)',
    hint: 'हम लीगल एडवाइज प्रदान नहीं करते हैं।',
  },
  {
    keywords: ['tailor', 'सिलाई', 'दर्जी', 'कपड़े सिलाई'],
    domainName: 'टेलरिंग / सिलाई सेवा',
    hint: 'हम होम रिपेयर, मेंटेनेंस व कंस्ट्रक्शन सेवाएं प्रदान करते हैं।',
  },
];

// Inactive Indian cities/districts detection
const INACTIVE_CITIES = [
  'delhi', 'mumbai', 'pune', 'bangalore', 'bengaluru', 'hyderabad', 'chennai', 'kolkata',
  'jaipur', 'lucknow', 'kanpur', 'patna', 'ahmedabad', 'surat', 'chandigarh',
  'rewa', 'satna', 'ujjain', 'sagar', 'chhindwara', 'jabalpur', 'nagpur'
];

export class ServiceDiscoveryEngine {
  /**
   * Main entry point to analyze user query against genuine catalog
   */
  public discoverService(
    query: string,
    availableServices: Service[] = [],
    availableCategories: Category[] = [],
    userLocation?: string
  ): ServiceDiscoveryResult | null {
    const q = (query || '').toLowerCase().trim();
    if (!q) return null;

    // Baseline catalog fallback if state is empty
    const allServices = availableServices.length > 0 ? availableServices : INITIAL_SERVICES;
    const allCategories = availableCategories.length > 0 ? availableCategories : INITIAL_CATEGORIES;

    // 1. Check for Inactive District / Outside Bhopal
    const locationCheckText = `${q} ${userLocation || ''}`.toLowerCase();
    for (const city of INACTIVE_CITIES) {
      if (locationCheckText.includes(city)) {
        const isRollout = ROLLOUT_DISTRICTS.some((d) => locationCheckText.includes(d));
        if (isRollout) {
          return {
            isMatchFound: false,
            isInactiveDistrict: true,
            responseMessage: `📍 HARDINKAAM की डोरस्टेप सेवाएं वर्तमान में **भोपाल (Bhopal)** के सभी 85+ वार्ड्स में पूर्णतः सक्रिय हैं। ${city.toUpperCase()} में हमारी सेवाएं रोलआउट फेज में हैं। यदि आप हमारे साथ ज़िला पार्टनर बनना चाहते हैं तो संपर्क करें:`,
            actions: [
              { label: '💼 ज़िला पार्टनर बनें', actionType: 'open_auth', payload: 'business_partner' },
              { label: '📍 भोपाल में बुक करें', actionType: 'navigate_tab', payload: 'home' },
            ],
            suggestedChips: ['भोपाल में सेवाएं देखें', 'पार्टनर रजिस्ट्रेशन', 'कस्टमर केयर'],
          };
        }

        return {
          isMatchFound: false,
          isInactiveDistrict: true,
          responseMessage: `📍 माफ़ कीजिए! HARDINKAAM की डोरस्टेप सेवाएं वर्तमान में केवल **भोपाल (मध्य प्रदेश)** के सभी इलाकों में लाइव हैं। हम आपके शहर (${city.toUpperCase()}) में जल्द आ रहे हैं। क्या आप भोपाल में किसी रिश्तेदार/ऑफिस के लिए सेवा बुक करना चाहते हैं?`,
          actions: [
            { label: '📍 भोपाल सेवा क्षेत्र देखें', actionType: 'navigate_tab', payload: 'home' },
            { label: '💼 पार्टनर रजिस्ट्रेशन', actionType: 'open_auth', payload: 'business_partner' },
          ],
          suggestedChips: ['भोपाल में बुक करें', 'पार्टनर बनें', 'हेल्पलाइन'],
        };
      }
    }

    // 2. Check for Custom / On-Demand Services (Auto-Add New Services)
    for (const domain of UNSUPPORTED_DOMAINS) {
      if (domain.keywords.some((kw) => q.includes(kw))) {
        const customName = formatCustomServiceName(q);
        return {
          isMatchFound: true,
          isCustomService: true,
          selectedService: {
            id: `srv_custom_${Date.now()}`,
            name: customName,
            categoryId: 'cat_custom',
            categoryName: '✨ Nayi Custom On-Demand Service',
            description: `Auto-registered custom service: ${customName}`,
            basePrice: 299,
            priceUnit: 'job',
            durationMinutes: 60,
            rating: 4.9,
            ratingCount: 1,
            isActive: true,
          },
          responseMessage: `Aapki maangi gayi nayi service (**${customName}**) ko HARDINKAAM On-Demand catalog mein jod liya gaya hai! 📝✨\n\nHumare verified experts aapke ghar par aane ke liye taiyaar hain. Kripya niche se details confirm karein:`,
          dynamicComponent: {
            type: 'service_cards',
            title: '✨ On-Demand Custom Service',
            services: [
              {
                id: `srv_custom_${Date.now()}`,
                name: customName,
                price: 299,
                duration: '60 मिनट',
                rating: 4.9,
                inclusions: [
                  'Customized Doorstep Expert Visit',
                  '100% Satisfaction & Guarantee',
                  'Genuine Digital GST Receipt',
                ],
              },
            ],
          },
          suggestedChips: [
            `Yeh service book karein (₹299)`,
            '📍 Pata aur time batayein',
            'कस्टमर सपोर्ट',
          ],
        };
      }
    }

    // 3. Ambiguity & Specific Intent Matching for Core HARDINKAAM Services

    // --- CASE A: Fan (Repair vs Installation Ambiguity) ---
    if (q.includes('fan') || q.includes('पंखा') || q.includes('पंखे')) {
      const elecCategory = allCategories.find((c) => c.slug === 'electrician' || c.name.toLowerCase().includes('elec'));
      const fanServices = allServices.filter(
        (s) => s.categoryId === 'cat_electrician' || s.name.toLowerCase().includes('fan')
      );

      const hasInstallIntent = q.includes('install') || q.includes('लगाना') || q.includes('नया');
      const hasRepairIntent = q.includes('repair') || q.includes('kharab') || q.includes('दिक्कत') || q.includes('खराब') || q.includes('आवाज') || q.includes('धीमा');

      if (!hasInstallIntent && !hasRepairIntent) {
        // Ambiguous query: "Fan ka kaam hai" or "Fan"
        return {
          isMatchFound: true,
          isAmbiguous: true,
          category: elecCategory,
          services: fanServices.slice(0, 3),
          clarificationQuestion: 'Fan repair चाहिए या fan installation?',
          responseMessage: '⚡ इलेक्ट्रीशियन सेवा: क्या आपको **पंखे की रिपेयर (मरम्मत)** करवानी है या **नया पंखा इंस्टॉलेशन (फिटिंग)** करवाना है? कृपया नीचे से विकल्प चुनें:',
          dynamicComponent: {
            type: 'options',
            title: 'पंखे के लिए उपयुक्त सेवा चुनें',
            subtitle: 'अनुभवी व बैकग्राउंड-वेरिफाइड इलेक्ट्रीशियन',
            options: [
              { id: 'srv_fan_repair', label: '🌀 सीलिंग फैन रिपेयर (शोर, धीमा चलना, कैपेसिटर)', price: 199, badge: 'लोकप्रिय' },
              { id: 'srv_fan_install', label: '🛠️ नया सीलिंग फैन इंस्टॉलेशन / फिटिंग', price: 249 },
              { id: 'srv_fan_bearing', label: '⚙️ मोटर व बेयरिंग रिपेयर / वाइंडिंग', price: 349 },
            ],
          },
          suggestedChips: ['🌀 फैन रिपेयर (₹199)', '🛠️ नया पंखा लगाना (₹249)', 'MCB / स्विच भी चेक करें'],
        };
      }

      // Specific Fan Service
      const targetFanService = fanServices.find((s) => s.id === 'srv_elec_fan') || fanServices[0];
      return {
        isMatchFound: true,
        category: elecCategory,
        selectedService: targetFanService,
        responseMessage: `⚡ इलेक्ट्रीशियन: **${targetFanService?.name || 'Ceiling Fan Installation & Repair'}** पहचान ली गई है। 45 मिनट के भीतर हमारे प्रमाणित इलेक्ट्रीशियन आपके घर पहुँचेंगे:`,
        dynamicComponent: {
          type: 'service_cards',
          title: '⚡ इलेक्ट्रीशियन सेवा कार्ड',
          services: [
            {
              id: targetFanService?.id || 'srv_elec_fan',
              name: targetFanService?.name || 'Ceiling Fan Installation & Repair',
              price: targetFanService?.basePrice || 199,
              duration: `${targetFanService?.durationMinutes || 45} मिनट`,
              rating: targetFanService?.rating || 4.8,
              inclusions: ['कैपेसिटर टेस्टिंग व रिप्लेसमेंट', 'ब्लेड बैलेंसिंग व अलाइनमेंट', 'नॉइज़लेस टेस्टिंग'],
            },
          ],
        },
        suggestedChips: ['यह सेवा बुक करें (₹199)', 'स्विच बोर्ड भी चेक करें', 'दर कार्ड दिखाएं'],
      };
    }

    // --- CASE B: AC Service / Cooling / Gas Leak (Ambiguity & Package Discovery) ---
    if (
      q.includes('ac ') ||
      q.includes(' ac') ||
      q.startsWith('ac') ||
      q.includes('ऐसी') ||
      q.includes('कूलिंग') ||
      q.includes('cooling') ||
      q.includes('thanda nahi') ||
      q.includes('ठंडा नहीं') ||
      q.includes('गैस') ||
      q.includes('gas')
    ) {
      const acCat = allCategories.find((c) => c.slug === 'ac-appliance' || c.name.toLowerCase().includes('ac'));
      const isGasQuery = q.includes('gas') || q.includes('गैस') || q.includes('leak') || q.includes('लीक');
      const isServiceQuery = q.includes('service') || q.includes('wash') || q.includes('जेट') || q.includes('सफाई');

      const acJetSrv = allServices.find((s) => s.id === 'srv_ac_service') || {
        id: 'srv_ac_service',
        name: 'Split AC Power Jet Deep Clean',
        basePrice: 499,
        durationMinutes: 60,
        rating: 4.9,
      } as Service;

      const acGasSrv = allServices.find((s) => s.id === 'srv_ac_gas') || {
        id: 'srv_ac_gas',
        name: 'AC Gas Refilling & Leak Repair',
        basePrice: 1499,
        durationMinutes: 90,
        rating: 4.8,
      } as Service;

      if (!isGasQuery && !isServiceQuery) {
        // "AC thanda nahi kar raha" -> Ambiguity between Deep Jet Clean and Gas Refill
        return {
          isMatchFound: true,
          isAmbiguous: true,
          category: acCat,
          clarificationQuestion: 'AC सर्विस (जेट वॉश) चाहिए या गैस रीफिल / लीकेज चेक?',
          responseMessage: '❄️ AC में कूलिंग न होने के 2 मुख्य कारण होते हैं — या तो कूलिंग कॉइल पर धूल जम गई है या गैस लीक हो गई है। आप कौन सी सेवा लेना चाहते हैं?',
          dynamicComponent: {
            type: 'service_cards',
            title: '❄️ AC सर्विस पैकेज (30 दिन वारंटी)',
            services: [
              {
                id: acJetSrv.id,
                name: acJetSrv.name,
                price: acJetSrv.basePrice,
                duration: `${acJetSrv.durationMinutes} मिनट`,
                rating: acJetSrv.rating,
                inclusions: ['हाई-प्रेशर फोम जेट वॉश', 'कूलिंग कॉइल सफाई', 'फिल्टर व ट्रे क्लीन'],
              },
              {
                id: acGasSrv.id,
                name: acGasSrv.name,
                price: acGasSrv.basePrice,
                duration: `${acGasSrv.durationMinutes} मिनट`,
                rating: acGasSrv.rating,
                inclusions: ['नाइट्रोजन लीकेज टेस्टिंग', 'R32 / R410A गैस रीफिल', 'चिलिंग कूलिंग गारंटी'],
              },
            ],
          },
          suggestedChips: ['जेट पंप वॉश (₹499)', 'गैस रीफिल (₹1499)', 'दोनों चेक करवाएं'],
        };
      }

      // Gas specific
      if (isGasQuery) {
        return {
          isMatchFound: true,
          category: acCat,
          selectedService: acGasSrv,
          responseMessage: `❄️ AC सेवा: **${acGasSrv.name}** पहचान ली गई है। 100% शुद्ध रेफ्रिजरेंट और लीकेज टेस्टिंग शामिल है:`,
          dynamicComponent: {
            type: 'service_cards',
            title: '❄️ AC गैस रीफिल पैकेज',
            services: [
              {
                id: acGasSrv.id,
                name: acGasSrv.name,
                price: acGasSrv.basePrice,
                duration: `${acGasSrv.durationMinutes} मिनट`,
                rating: acGasSrv.rating,
                inclusions: ['कॉपर पाइप लीकेज ब्राज़िंग', '100% प्योर R32/R410A गैस', '30 दिन कूलिंग वारंटी'],
              },
            ],
          },
          suggestedChips: ['गैस रीफिल बुक करें (₹1499)', 'जेट वॉश भी जोड़ें', 'समय तय करें'],
        };
      }

      // Service specific
      return {
        isMatchFound: true,
        category: acCat,
        selectedService: acJetSrv,
        responseMessage: `❄️ AC सेवा: **${acJetSrv.name}** पहचान ली गई है। हाई-प्रेशर जेट पंप वॉश द्वारा संपूर्ण डीप क्लीनिंग:`,
        dynamicComponent: {
          type: 'service_cards',
          title: '❄️ AC जेट पंप सर्विस',
          services: [
            {
              id: acJetSrv.id,
              name: acJetSrv.name,
              price: acJetSrv.basePrice,
              duration: `${acJetSrv.durationMinutes} मिनट`,
              rating: acJetSrv.rating,
              inclusions: ['एंटी-बैक्टीरियल फोम वॉश', 'इंडोर व आउटडोर यूनिट वॉश', 'एसी ड्रेन ट्रे क्लीन'],
            },
          ],
        },
        suggestedChips: ['जेट वॉश बुक करें (₹499)', '2 AC के लिए डिस्काउंट', 'तारीख चुनें'],
      };
    }

    // --- CASE C: Cleaning / Ghar Saaf (Ambiguity between Full Home vs Bathroom) ---
    if (
      q.includes('clean') ||
      q.includes('saaf') ||
      q.includes('सफाई') ||
      q.includes('झाड़ू') ||
      q.includes('पोछा') ||
      q.includes('scrub') ||
      q.includes('maid') ||
      q.includes('मेड') ||
      q.includes('बाई') ||
      q.includes('bai') ||
      q.includes('कामवाली') ||
      q.includes('kamwali') ||
      q.includes('housemaid') ||
      q.includes('house help') ||
      q.includes('housekeeping') ||
      q.includes('cook') ||
      q.includes('bartan') ||
      q.includes('बर्तन') ||
      q.includes('kapde') ||
      q.includes('कपड़े') ||
      q.includes('ghar ka kaam') ||
      q.includes('ghar ke kaam') ||
      q.includes('घर का काम') ||
      q.includes('घर के काम')
    ) {
      const cleanCat = allCategories.find((c) => c.slug === 'cleaning' || c.name.toLowerCase().includes('clean'));
      const isMaidQuery =
        q.includes('maid') ||
        q.includes('मेड') ||
        q.includes('बाई') ||
        q.includes('bai') ||
        q.includes('कामवाली') ||
        q.includes('kamwali') ||
        q.includes('housemaid') ||
        q.includes('house help') ||
        q.includes('ghar ka kaam') ||
        q.includes('ghar ke kaam') ||
        q.includes('घर का काम') ||
        q.includes('घर के काम') ||
        q.includes('cook') ||
        q.includes('bartan') ||
        q.includes('बर्तन');

      if (isMaidQuery) {
        return {
          isMatchFound: true,
          category: cleanCat,
          responseMessage:
            'Haan bilkul dost! 😊 HARDINKAAM par ghar ke kaam ke liye verified maid, housekeeping v home cleaning assistance milti hai.\n\nAapko kis prakaar ke kaam ke liye madad chahiye? Niche se vikalp chunein:',
          dynamicComponent: {
            type: 'options',
            title: '🧹 घरेलू काम व हाउसकीपिंग सहायता',
            subtitle: 'बैकग्राउंड-वेरिफाइड व भरोसेमंद हाउसकीपिंग स्टाफ (भोपाल)',
            options: [
              { id: 'opt_full_housekeeping', label: '🧹 Full Home Deep Cleaning & Mopping', description: 'झाड़ू, पोछा, डस्टिंग व संपूर्ण घर सफाई', price: 499, badge: 'पॉपुलर' },
              { id: 'opt_kitchen_utensils', label: '🧽 Kitchen & Utensils Cleaning', description: 'किचन सफाई, बर्तन व सिंक हाइजीन', price: 299 },
              { id: 'opt_bathroom_sanitization', label: '🚿 Bathroom Descaling & Sanitization', description: 'बाथरूम टाइल व टॉयलेट पॉट सफाई', price: 399 },
              { id: 'opt_monthly_maid_inquiry', label: '👩‍🍳 Daily Housemaid & Housekeeping Help', description: 'दैनिक घरेलू कार्य हेतु वेरिफाइड हेल्प', price: 199 },
            ],
          },
          suggestedChips: [
            '🧹 Full Home Cleaning (₹499)',
            '🧽 Kitchen & Bartan Clean (₹299)',
            '🚿 Bathroom Deep Clean (₹399)',
            '📞 Customer Support se baat karein',
          ],
        };
      }

      const isBathroomOnly = q.includes('bathroom') || q.includes('टॉयलेट') || q.includes('बाथरूम') || q.includes('toilet');

      const fullHomeSrv = allServices.find((s) => s.id === 'srv_clean_deep_home') || {
        id: 'srv_clean_deep_home',
        name: 'Full Home Deep Cleaning (1BHK / 2BHK)',
        basePrice: 1999,
        durationMinutes: 240,
        rating: 4.9,
      } as Service;

      const bathroomSrv = allServices.find((s) => s.id === 'srv_clean_bathroom') || {
        id: 'srv_clean_bathroom',
        name: 'Intense Bathroom Descaling & Sanitization',
        basePrice: 399,
        durationMinutes: 60,
        rating: 4.8,
      } as Service;

      if (!isBathroomOnly) {
        return {
          isMatchFound: true,
          isAmbiguous: true,
          category: cleanCat,
          clarificationQuestion: 'पूरे घर की डीप क्लीनिंग करवानी है या केवल बाथरूम / किचन?',
          responseMessage: '🧹 होम क्लीनिंग: क्या आप **पूरे घर की डीप क्लीनिंग (Full Home Deep Clean)** करवाना चाहते हैं या केवल **बाथरूम/किचन डीप सैनिटाइजेशन**? नीचे से चुनें:',
          dynamicComponent: {
            type: 'service_cards',
            title: '🧹 डीप क्लीनिंग पैकेज',
            services: [
              {
                id: fullHomeSrv.id,
                name: fullHomeSrv.name,
                price: fullHomeSrv.basePrice,
                duration: `${fullHomeSrv.durationMinutes} मिनट`,
                rating: fullHomeSrv.rating,
                inclusions: ['फ्लोर मशीन स्क्रबिंग', 'किचन डिग्रेसिंग', 'बाथरूम एसिड सैनिटाइज', 'खिड़कियां व बालकनी'],
              },
              {
                id: bathroomSrv.id,
                name: bathroomSrv.name,
                price: bathroomSrv.basePrice,
                duration: `${bathroomSrv.durationMinutes} मिनट`,
                rating: bathroomSrv.rating,
                inclusions: ['हार्ड वाटर टाइल स्केलिंग', 'टॉयलेट पॉट एसिड क्लीनिंग', 'मिरर व ड्रेन सैनिटाइज'],
              },
            ],
          },
          suggestedChips: ['पूरा घर सफाई (₹1999)', 'बाथरूम सफाई (₹399)', 'सोफा ड्राई क्लीन'],
        };
      }

      return {
        isMatchFound: true,
        category: cleanCat,
        selectedService: bathroomSrv,
        responseMessage: `🧹 क्लीनिंग: **${bathroomSrv.name}** पहचान ली गई है। टाइल के सफेद दाग व हार्ड वाटर स्केलिंग हटाई जाएगी:`,
        dynamicComponent: {
          type: 'service_cards',
          title: '🧹 बाथरूम डीप सैनिटाइजेशन',
          services: [
            {
              id: bathroomSrv.id,
              name: bathroomSrv.name,
              price: bathroomSrv.basePrice,
              duration: `${bathroomSrv.durationMinutes} मिनट`,
              rating: bathroomSrv.rating,
              inclusions: ['टाइल केमिकल वॉश', 'टॉयलेट पॉट डीप क्लीन', 'ड्रेन सैनिटाइजेशन'],
            },
          ],
        },
        suggestedChips: ['बाथरूम सफाई बुक करें (₹399)', '2 बाथरूम', 'तारीख तय करें'],
      };
    }

    // --- CASE D: Plumbing (Tap, Leak, Drain, Tank, Motor) ---
    if (
      q.includes('plumb') ||
      q.includes('प्लंबर') ||
      q.includes('नल') ||
      q.includes('tap') ||
      q.includes('leak') ||
      q.includes('टपक') ||
      q.includes('pipe') ||
      q.includes('टंकी') ||
      q.includes('motor') ||
      q.includes('मोटर')
    ) {
      const plumbCat = allCategories.find((c) => c.slug === 'plumber' || c.name.toLowerCase().includes('plumb'));
      const tapSrv = allServices.find((s) => s.id === 'srv_plumb_tap') || {
        id: 'srv_plumb_tap',
        name: 'Tap / Faucet Repair & Replacement',
        basePrice: 149,
        durationMinutes: 30,
        rating: 4.9,
      } as Service;

      const blockSrv = allServices.find((s) => s.id === 'srv_plumb_blockage') || {
        id: 'srv_plumb_blockage',
        name: 'Drain & Basin Blockage Removal',
        basePrice: 299,
        durationMinutes: 45,
        rating: 4.8,
      } as Service;

      const motorSrv = allServices.find((s) => s.id === 'srv_plumb_motor') || {
        id: 'srv_plumb_motor',
        name: 'Water Motor Pump Repair & Installation',
        basePrice: 399,
        durationMinutes: 60,
        rating: 4.6,
      } as Service;

      // Tap specific
      if (q.includes('tap') || q.includes('नल') || q.includes('टपक')) {
        return {
          isMatchFound: true,
          category: plumbCat,
          selectedService: tapSrv,
          responseMessage: `🔧 प्लंबिंग: **${tapSrv.name}** पहचान ली गई है। टपकता नल, नया नल लगाना या स्पिंडल रिपेयर:`,
          dynamicComponent: {
            type: 'service_cards',
            title: '🚰 नल रिपेयर व फिटिंग',
            services: [
              {
                id: tapSrv.id,
                name: tapSrv.name,
                price: tapSrv.basePrice,
                duration: `${tapSrv.durationMinutes} मिनट`,
                rating: tapSrv.rating,
                inclusions: ['स्पिंडल वॉशर रिप्लेसमेंट', 'लीकेज फिक्सिंग', 'नया नल फिटिंग'],
              },
            ],
          },
          suggestedChips: ['नल रिपेयर बुक करें (₹149)', 'पाइप भी चेक करें', 'समय चुनें'],
        };
      }

      // Blockage specific
      if (q.includes('block') || q.includes('जाम') || q.includes('drain') || q.includes('नाली') || q.includes('sink')) {
        return {
          isMatchFound: true,
          category: plumbCat,
          selectedService: blockSrv,
          responseMessage: `🔧 प्लंबिंग: **${blockSrv.name}** पहचान ली गई है। सिंक या ड्रेन की ब्लॉकेज खोली जाएगी:`,
          dynamicComponent: {
            type: 'service_cards',
            title: '🚿 ड्रेन ब्लॉकेज रिमूवल',
            services: [
              {
                id: blockSrv.id,
                name: blockSrv.name,
                price: blockSrv.basePrice,
                duration: `${blockSrv.durationMinutes} मिनट`,
                rating: blockSrv.rating,
                inclusions: ['मैकेनिकल ऑगर स्नेक अनब्लॉकिंग', 'हाई-प्रेशर केमिकल फ्लश', 'दुर्गंध मुक्ति'],
              },
            ],
          },
          suggestedChips: ['ब्लॉकेज खोलना बुक करें (₹299)', 'तत्काल आएं', 'कॉल सपोर्ट'],
        };
      }

      // General Plumbing Ambiguity
      return {
        isMatchFound: true,
        isAmbiguous: true,
        category: plumbCat,
        clarificationQuestion: 'नल रिपेयर चाहिए, ब्लॉकेज खोलना है, या मोटर रिपेयर?',
        responseMessage: '🔧 प्लंबर सेवा: आप प्लंबिंग में क्या काम करवाना चाहते हैं? नीचे दी गई वास्तविक सेवाओं में से चुनें:',
        dynamicComponent: {
          type: 'service_cards',
          title: '🔧 प्लंबिंग सेवाएं (भोपाल)',
          services: [
            {
              id: tapSrv.id,
              name: tapSrv.name,
              price: tapSrv.basePrice,
              duration: `${tapSrv.durationMinutes} मिनट`,
              rating: tapSrv.rating,
              inclusions: ['लीक नल फिक्स', 'स्पिंडल चेंज'],
            },
            {
              id: blockSrv.id,
              name: blockSrv.name,
              price: blockSrv.basePrice,
              duration: `${blockSrv.durationMinutes} मिनट`,
              rating: blockSrv.rating,
              inclusions: ['जाम सिंक व नाली खोलना'],
            },
            {
              id: motorSrv.id,
              name: motorSrv.name,
              price: motorSrv.basePrice,
              duration: `${motorSrv.durationMinutes} मिनट`,
              rating: motorSrv.rating,
              inclusions: ['पानी मोटर रिपेयर व वाइंडिंग चेक'],
            },
          ],
        },
        suggestedChips: ['🚰 नल रिपेयर (₹149)', '🚿 ब्लॉकेज खोलना (₹299)', '⚡ मोटर रिपेयर (₹399)'],
      };
    }

    // --- CASE E: Carpentry / Door / Furniture ---
    if (q.includes('carpenter') || q.includes('बढ़ई') || q.includes('लकड़ी') || q.includes('door') || q.includes('दरवाजा') || q.includes('lock') || q.includes('ताला')) {
      const carpCat = allCategories.find((c) => c.slug === 'carpentry');
      const carpSrv = allServices.find((s) => s.id === 'srv_carp_door') || {
        id: 'srv_carp_door',
        name: 'Door Lock Installation & Hinge Fix',
        basePrice: 249,
        durationMinutes: 45,
        rating: 4.8,
      } as Service;

      return {
        isMatchFound: true,
        category: carpCat,
        selectedService: carpSrv,
        responseMessage: `🪚 कारपेंटर सेवा: **${carpSrv.name}** पहचान ली गई है। लॉक इंस्टॉलेशन, कब्जेदार हिंज फिक्स व फर्नीचर रिपेयर:`,
        dynamicComponent: {
          type: 'service_cards',
          title: '🪚 कारपेंटर सेवाएं',
          services: [
            {
              id: carpSrv.id,
              name: carpSrv.name,
              price: carpSrv.basePrice,
              duration: `${carpSrv.durationMinutes} मिनट`,
              rating: carpSrv.rating,
              inclusions: ['डोर लॉक फिटिंग', 'कब्जे व अलाइनमेंट फिक्स', 'हैंडल रिप्लेसमेंट'],
            },
          ],
        },
        suggestedChips: ['कारपेंटर बुक करें (₹249)', 'फर्नीचर रिपेयर', 'समय चुनें'],
      };
    }

    // --- CASE F: Construction Labour / Raj Mistri / Mason ---
    if (q.includes('mistri') || q.includes('मिस्त्री') || q.includes('ईंट') || q.includes('brick') || q.includes('plaster') || q.includes('पुताई') || q.includes('मजदूर') || q.includes('labour')) {
      const isMistri = q.includes('mistri') || q.includes('मिस्त्री') || q.includes('brick') || q.includes('plaster');
      if (isMistri) {
        const mistriSrv = allServices.find((s) => s.id === 'srv_mistri_daily') || {
          id: 'srv_mistri_daily',
          name: 'Master Raj Mistri (Daily Shift)',
          basePrice: 899,
          durationMinutes: 480,
          rating: 4.95,
        } as Service;

        return {
          isMatchFound: true,
          selectedService: mistriSrv,
          responseMessage: `🧱 निर्माण: **${mistriSrv.name}** पहचान ली गई है। 9-इंच व 4-इंच ईंट चिनाई, प्लास्टर व कॉलम वर्क:`,
          dynamicComponent: {
            type: 'service_cards',
            title: '🧱 राज मिस्त्री सेवाएं',
            services: [
              {
                id: mistriSrv.id,
                name: mistriSrv.name,
                price: mistriSrv.basePrice,
                duration: '8 घंटे की शिफ्ट',
                rating: mistriSrv.rating,
                inclusions: ['लाइन-डोरी ईंट चिनाई', 'सीमेंट प्लास्टर व फिनिशिंग', 'फाउंडेशन व कॉलम वर्क'],
              },
            ],
          },
          suggestedChips: ['राज मिस्त्री बुक करें (₹899)', 'साथ में हेल्पर चाहिए', 'दर कार्ड'],
        };
      }

      // Labour
      const labourSrv = allServices.find((s) => s.id === 'srv_labour_daily') || {
        id: 'srv_labour_daily',
        name: 'Daily Construction Helper (8 Hrs Shift)',
        basePrice: 599,
        durationMinutes: 480,
        rating: 4.85,
      } as Service;

      return {
        isMatchFound: true,
        selectedService: labourSrv,
        responseMessage: `👷 लेबर / हेल्पर: **${labourSrv.name}** पहचान ली गई है। डिग्गिंग, मालबा लोडिंग, सीमेंट मिक्सिंग व साइट हेल्प:`,
        dynamicComponent: {
          type: 'service_cards',
          title: '👷 कंस्ट्रक्शन हेल्पर',
          services: [
            {
              id: labourSrv.id,
              name: labourSrv.name,
              price: labourSrv.basePrice,
              duration: '8 घंटे की शिफ्ट',
              rating: labourSrv.rating,
              inclusions: ['खुदाई व मालबा उठाना', 'सीमेंट-रेत मिक्सिंग', 'मटेरियल लोडिंग-अनलोडिंग'],
            },
          ],
        },
        suggestedChips: ['हेल्पर बुक करें (₹599)', '2 लेबर चाहिए', 'समय चुनें'],
      };
    }

    // 4. Generic match against existing catalog categories
    for (const cat of allCategories) {
      if (
        q.includes(cat.name.toLowerCase()) ||
        q.includes(cat.slug.toLowerCase()) ||
        (cat.description && cat.description.toLowerCase().split(' ').some((w) => w.length > 3 && q.includes(w)))
      ) {
        const catServices = allServices.filter((s) => s.categoryId === cat.id);
        return {
          isMatchFound: true,
          category: cat,
          services: catServices,
          responseMessage: `HARDINKAAM कैटलॉग से **${cat.name}** सेवा श्रेणी पहचान ली गई है। कृपया अपनी आवश्यकता के अनुसार सेवा चुनें:`,
          dynamicComponent: {
            type: 'options',
            title: `${cat.name} सेवाएं`,
            subtitle: cat.description,
            options: catServices.slice(0, 4).map((s) => ({
              id: s.id,
              label: s.name,
              price: s.basePrice,
              description: s.description,
            })),
          },
          suggestedChips: catServices.slice(0, 3).map((s) => s.name),
        };
      }
    }

    // 5. Automatic Dynamic Registration for Unlisted / Custom Services
    const customName = formatCustomServiceName(q);
    const customSrv: Service = {
      id: `srv_custom_${Date.now()}`,
      name: customName,
      categoryId: 'cat_custom',
      categoryName: '✨ Nayi Custom On-Demand Service',
      description: `Custom requested service: ${customName}`,
      basePrice: 299,
      priceUnit: 'job',
      durationMinutes: 60,
      rating: 4.9,
      ratingCount: 1,
      isActive: true,
    };

    // Auto-save new service to Firestore database for instant availability & Admin Dashboard tracking
    try {
      setDoc(doc(db, 'services', customSrv.id), customSrv, { merge: true }).catch(() => {});
      addDoc(collection(db, 'custom_requested_services'), {
        id: customSrv.id,
        name: customName,
        rawQuery: q,
        basePrice: 299,
        status: 'auto_added',
        createdAt: new Date().toISOString(),
      }).catch(() => {});
    } catch (e) {
      console.warn('Auto-add service notice:', e);
    }

    return {
      isMatchFound: true,
      isCustomService: true,
      selectedService: customSrv,
      responseMessage: `Aapki maangi gayi nayi service (**${customName}**) ko HARDINKAAM On-Demand catalog mein jod liya gaya hai! 📝✨\n\nHumare verified experts aapke ghar par aane ke liye taiyaar hain. Kripya niche se details confirm karein:`,
      dynamicComponent: {
        type: 'service_cards',
        title: '✨ Nayi On-Demand Service (Auto-Added)',
        services: [
          {
            id: customSrv.id,
            name: customSrv.name,
            price: customSrv.basePrice,
            duration: '60 मिनट',
            rating: customSrv.rating,
            inclusions: [
              'Customized Doorstep Expert Visit',
              '100% Satisfaction & Safety Guarantee',
              'Genuine Digital Invoice',
            ],
          },
        ],
      },
      suggestedChips: [
        `Yeh service book karein (₹299)`,
        '📍 Pata aur time batayein',
        'कस्टमर सपोर्ट',
      ],
    };
  }
}

export function formatCustomServiceName(q: string): string {
  let clean = q
    .replace(/mujhe/gi, '')
    .replace(/chahiye/gi, '')
    .replace(/book karna hai/gi, '')
    .replace(/book kar do/gi, '')
    .replace(/karni hai/gi, '')
    .replace(/karwana hai/gi, '')
    .replace(/karwana h/gi, '')
    .replace(/milegi kya/gi, '')
    .replace(/milega/gi, '')
    .replace(/hai kya/gi, '')
    .replace(/dost/gi, '')
    .replace(/please/gi, '')
    .replace(/ghr/gi, '')
    .replace(/ghar/gi, '')
    .replace(/ke liye/gi, '')
    .replace(/ka kaam/gi, '')
    .replace(/ke kaam/gi, '')
    .replace(/chahie/gi, '')
    .trim();

  if (!clean || clean.length < 3) {
    clean = q.trim();
  }

  return clean
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export const serviceDiscovery = new ServiceDiscoveryEngine();
