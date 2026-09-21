// Comprehensive Data for All-India Franchise Network
// Covering States, Districts, Cities, Towns, and Rural Village Clusters

import { FranchiseRule, FranchiseAreaType } from '../types';

export interface LocationItem {
  name: string;
  hindiName: string;
  type: FranchiseAreaType;
}

export interface DistrictData {
  district: string;
  hindiDistrict: string;
  places: LocationItem[];
}

export interface StateData {
  state: string;
  hindiState: string;
  districts: DistrictData[];
}

export const ALL_INDIA_LOCATIONS: StateData[] = [
  {
    state: 'Madhya Pradesh',
    hindiState: 'मध्य प्रदेश',
    districts: [
      {
        district: 'Bhopal',
        hindiDistrict: 'भोपाल',
        places: [
          { name: 'Bhopal City (H.Q.)', hindiName: 'भोपाल शहर (मुख्यालय)', type: 'district' },
          { name: 'MP Nagar & New Bhopal', hindiName: 'एमपी नगर व न्यू भोपाल', type: 'town' },
          { name: 'Kolar Road & Bairagarh', hindiName: 'कोलार रोड व बैरागढ़', type: 'town' },
          { name: 'Berasia Tehsil', hindiName: 'बैरसिया तहसील', type: 'town' },
          { name: 'Nazeerabad Village Cluster', hindiName: 'नज़ीराबाद गाँव समूह', type: 'village' },
          { name: 'Gunga Gram Panchayat', hindiName: 'गुँगा ग्राम पंचायत', type: 'village' },
          { name: 'Phanda Gram', hindiName: 'फंदा ग्राम', type: 'village' },
        ],
      },
      {
        district: 'Indore',
        hindiDistrict: 'इंदौर',
        places: [
          { name: 'Indore City (H.Q.)', hindiName: 'इंदौर शहर (मुख्यालय)', type: 'district' },
          { name: 'Mhow (Dr. Ambedkar Nagar)', hindiName: 'महू', type: 'town' },
          { name: 'Sanwer Tehsil', hindiName: 'सांवेर तहसील', type: 'town' },
          { name: 'Depalpur Kasba', hindiName: 'देपालपुर कस्बा', type: 'town' },
          { name: 'Hatod Village Cluster', hindiName: 'हातोद ग्राम समूह', type: 'village' },
          { name: 'Betma Gram', hindiName: 'बेटमा ग्राम', type: 'village' },
        ],
      },
      {
        district: 'Jabalpur',
        hindiDistrict: 'जबलपुर',
        places: [
          { name: 'Jabalpur City (H.Q.)', hindiName: 'जबलपुर शहर (मुख्यालय)', type: 'district' },
          { name: 'Sihora Town', hindiName: 'सिहोरा कस्बा', type: 'town' },
          { name: 'Patan Tehsil', hindiName: 'पाटन तहसील', type: 'town' },
          { name: 'Majholi Gram', hindiName: 'मझौली ग्राम', type: 'village' },
          { name: 'Shahpura Bhitoni Village', hindiName: 'शाहपुरा भिटौनी गाँव', type: 'village' },
        ],
      },
      {
        district: 'Gwalior',
        hindiDistrict: 'ग्वालियर',
        places: [
          { name: 'Gwalior City (H.Q.)', hindiName: 'ग्वालियर शहर (मुख्यालय)', type: 'district' },
          { name: 'Dabra Town', hindiName: 'डबरा कस्बा', type: 'town' },
          { name: 'Bhitarwar Tehsil', hindiName: 'भितरवार तहसील', type: 'town' },
          { name: 'Mohna Gram Cluster', hindiName: 'मोहना ग्राम समूह', type: 'village' },
          { name: 'Ghatigaon Village', hindiName: 'घाटीगांव गाँव', type: 'village' },
        ],
      },
      {
        district: 'Ujjain',
        hindiDistrict: 'उज्जैन',
        places: [
          { name: 'Ujjain City (H.Q.)', hindiName: 'उज्जैन शहर (मुख्यालय)', type: 'district' },
          { name: 'Nagda Town', hindiName: 'नागदा कस्बा', type: 'town' },
          { name: 'Mahidpur Tehsil', hindiName: 'महिदपुर तहसील', type: 'town' },
          { name: 'Tarana Kasba', hindiName: 'तराना कस्बा', type: 'town' },
          { name: 'Barnagar Village Cluster', hindiName: 'बड़नगर गाँव समूह', type: 'village' },
        ],
      },
      {
        district: 'Sehore',
        hindiDistrict: 'सीहोर',
        places: [
          { name: 'Sehore City (H.Q.)', hindiName: 'सीहोर शहर (मुख्यालय)', type: 'district' },
          { name: 'Ashta Town', hindiName: 'आष्टा कस्बा', type: 'town' },
          { name: 'Ichhawar Tehsil', hindiName: 'इछावर तहसील', type: 'town' },
          { name: 'Nasrullaganj / Bherunda', hindiName: 'नसरुल्लागंज / भेरुंदा', type: 'town' },
          { name: 'Rehti Gram Cluster', hindiName: 'रेहटी ग्राम समूह', type: 'village' },
          { name: 'Budhni Kasba', hindiName: 'बुधनी कस्बा', type: 'village' },
        ],
      },
      {
        district: 'Raisen',
        hindiDistrict: 'रायसेन',
        places: [
          { name: 'Raisen City (H.Q.)', hindiName: 'रायसेन शहर (मुख्यालय)', type: 'district' },
          { name: 'Mandi Deep Industrial Zone', hindiName: 'मंडीदीप औद्योगिक क्षेत्र', type: 'town' },
          { name: 'Bareli Tehsil', hindiName: 'बरेली तहसील', type: 'town' },
          { name: 'Begamganj Town', hindiName: 'बेगमगंज कस्बा', type: 'town' },
          { name: 'Silwani Gram Cluster', hindiName: 'सिलवानी ग्राम समूह', type: 'village' },
          { name: 'Gairatganj Village', hindiName: 'गैरतगंज गाँव', type: 'village' },
        ],
      },
      {
        district: 'Vidisha',
        hindiDistrict: 'विदिशा',
        places: [
          { name: 'Vidisha City (H.Q.)', hindiName: 'विदिशा शहर (मुख्यालय)', type: 'district' },
          { name: 'Basoda (Ganj Basoda)', hindiName: 'गंज बासोदा कस्बा', type: 'town' },
          { name: 'Sironj Tehsil', hindiName: 'सिरोंज तहसील', type: 'town' },
          { name: 'Kurwai Town', hindiName: 'कुरवाई कस्बा', type: 'town' },
          { name: 'Lateri Gram Cluster', hindiName: 'लटेरी ग्राम समूह', type: 'village' },
        ],
      },
      {
        district: 'Rewa',
        hindiDistrict: 'रीवा',
        places: [
          { name: 'Rewa City (H.Q.)', hindiName: 'रीवा शहर (मुख्यालय)', type: 'district' },
          { name: 'Mauganj Town', hindiName: 'मऊगंज कस्बा', type: 'town' },
          { name: 'Hanumana Tehsil', hindiName: 'हनुमना तहसील', type: 'town' },
          { name: 'Teonthar Village Cluster', hindiName: 'त्योंथर ग्राम समूह', type: 'village' },
        ],
      },
      {
        district: 'Sagar',
        hindiDistrict: 'सागर',
        places: [
          { name: 'Sagar City (H.Q.)', hindiName: 'सागर शहर (मुख्यालय)', type: 'district' },
          { name: 'Bina Town', hindiName: 'बीना कस्बा', type: 'town' },
          { name: 'Khurai Tehsil', hindiName: 'खुरई तहसील', type: 'town' },
          { name: 'Banda Kasba', hindiName: 'बंडा कस्बा', type: 'town' },
          { name: 'Deori Gram Cluster', hindiName: 'देवरी ग्राम समूह', type: 'village' },
        ],
      },
    ],
  },
  {
    state: 'Uttar Pradesh',
    hindiState: 'उत्तर प्रदेश',
    districts: [
      {
        district: 'Lucknow',
        hindiDistrict: 'लखनऊ',
        places: [
          { name: 'Lucknow Urban Center (H.Q.)', hindiName: 'लखनऊ मुख्य शहर', type: 'district' },
          { name: 'Mohanlalganj Tehsil', hindiName: 'मोहनलालगंज तहसील', type: 'town' },
          { name: 'Bakshi Ka Talab (BKT)', hindiName: 'बख्शी का तालाब', type: 'town' },
          { name: 'Malihabad Kasba', hindiName: 'मलिहाबाद कस्बा', type: 'town' },
          { name: 'Gosainganj Gram Cluster', hindiName: 'गोसाईंगंज ग्राम समूह', type: 'village' },
          { name: 'Kakori Village', hindiName: 'काकोरी गाँव', type: 'village' },
        ],
      },
      {
        district: 'Kanpur Nagar',
        hindiDistrict: 'कानपुर नगर',
        places: [
          { name: 'Kanpur City (H.Q.)', hindiName: 'कानपुर शहर', type: 'district' },
          { name: 'Ghatampur Town', hindiName: 'घाटमपुर कस्बा', type: 'town' },
          { name: 'Bilhaur Tehsil', hindiName: 'बिल्हौर तहसील', type: 'town' },
          { name: 'Shivrajpur Gram Cluster', hindiName: 'शिवराजपुर ग्राम समूह', type: 'village' },
        ],
      },
      {
        district: 'Varanasi',
        hindiDistrict: 'वाराणसी',
        places: [
          { name: 'Varanasi City (H.Q.)', hindiName: 'वाराणसी शहर', type: 'district' },
          { name: 'Pindra Tehsil', hindiName: 'पिंडरा तहसील', type: 'town' },
          { name: 'Ramnagar Town', hindiName: 'रामनगर कस्बा', type: 'town' },
          { name: 'Cholapur Gram Cluster', hindiName: 'चोलापुर ग्राम समूह', type: 'village' },
        ],
      },
      {
        district: 'Prayagraj',
        hindiDistrict: 'प्रयागराज',
        places: [
          { name: 'Prayagraj City (H.Q.)', hindiName: 'प्रयागराज शहर', type: 'district' },
          { name: 'Phulpur Town', hindiName: 'फूलपुर कस्बा', type: 'town' },
          { name: 'Koraon Tehsil', hindiName: 'कोरांव तहसील', type: 'town' },
          { name: 'Handia Kasba', hindiName: 'हंडिया कस्बा', type: 'town' },
          { name: 'Mauaima Village Cluster', hindiName: 'मऊआइमा ग्राम समूह', type: 'village' },
        ],
      },
      {
        district: 'Noida / Gautam Buddha Nagar',
        hindiDistrict: 'नोएडा / गौतम बुद्ध नगर',
        places: [
          { name: 'Noida City Center (H.Q.)', hindiName: 'नोएडा सिटी सेंटर', type: 'district' },
          { name: 'Greater Noida West', hindiName: 'ग्रेटर नोएडा वेस्ट', type: 'district' },
          { name: 'Dadri Town', hindiName: 'दादरी कस्बा', type: 'town' },
          { name: 'Jewar Tehsil', hindiName: 'जेवर तहसील', type: 'town' },
          { name: 'Dankaur Village Cluster', hindiName: 'दनकौर ग्राम समूह', type: 'village' },
        ],
      },
    ],
  },
  {
    state: 'Maharashtra',
    hindiState: 'महाराष्ट्र',
    districts: [
      {
        district: 'Pune',
        hindiDistrict: 'पुणे',
        places: [
          { name: 'Pune City (H.Q.)', hindiName: 'पुणे शहर', type: 'district' },
          { name: 'Pimpri-Chinchwad', hindiName: 'पिंपरी-चिंचवड', type: 'district' },
          { name: 'Baramati Town', hindiName: 'बारामती कस्बा', type: 'town' },
          { name: 'Shirur Tehsil', hindiName: 'शिरूर तहसील', type: 'town' },
          { name: 'Junnar Rural Cluster', hindiName: 'जुन्नर ग्राम समूह', type: 'village' },
        ],
      },
      {
        district: 'Nagpur',
        hindiDistrict: 'नागपुर',
        places: [
          { name: 'Nagpur City (H.Q.)', hindiName: 'नागपुर शहर', type: 'district' },
          { name: 'Kamptee Town', hindiName: 'कामठी कस्बा', type: 'town' },
          { name: 'Katol Tehsil', hindiName: 'काटोल तहसील', type: 'town' },
          { name: 'Umred Village Cluster', hindiName: 'उमरेड ग्राम समूह', type: 'village' },
        ],
      },
      {
        district: 'Nashik',
        hindiDistrict: 'नासिक',
        places: [
          { name: 'Nashik City (H.Q.)', hindiName: 'नासिक शहर', type: 'district' },
          { name: 'Malegaon Town', hindiName: 'मालेगांव कस्बा', type: 'town' },
          { name: 'Sinnar Industrial Town', hindiName: 'सिन्नर औद्योगिक कस्बा', type: 'town' },
          { name: 'Niphad Village Cluster', hindiName: 'निफाड ग्राम समूह', type: 'village' },
        ],
      },
    ],
  },
  {
    state: 'Rajasthan',
    hindiState: 'राजस्थान',
    districts: [
      {
        district: 'Jaipur',
        hindiDistrict: 'जयपुर',
        places: [
          { name: 'Jaipur City (H.Q.)', hindiName: 'जयपुर शहर', type: 'district' },
          { name: 'Chomu Town', hindiName: 'चौमूं कस्बा', type: 'town' },
          { name: 'Kotputli Tehsil', hindiName: 'कोटपूतली तहसील', type: 'town' },
          { name: 'Phulera Kasba', hindiName: 'फुलेरा कस्बा', type: 'town' },
          { name: 'Bassi Village Cluster', hindiName: 'बस्सी ग्राम समूह', type: 'village' },
        ],
      },
      {
        district: 'Kota',
        hindiDistrict: 'कोटा',
        places: [
          { name: 'Kota City (H.Q.)', hindiName: 'कोटा शहर', type: 'district' },
          { name: 'Ramganj Mandi', hindiName: 'रामगंज मंडी', type: 'town' },
          { name: 'Sangod Tehsil', hindiName: 'सांगोद तहसील', type: 'town' },
          { name: 'Digod Village Cluster', hindiName: 'दीगोद ग्राम समूह', type: 'village' },
        ],
      },
    ],
  },
  {
    state: 'Bihar',
    hindiState: 'बिहार',
    districts: [
      {
        district: 'Patna',
        hindiDistrict: 'पटना',
        places: [
          { name: 'Patna Metropolitan (H.Q.)', hindiName: 'पटना महानगर', type: 'district' },
          { name: 'Danapur Cantonment Town', hindiName: 'दानापुर कस्बा', type: 'town' },
          { name: 'Barh Tehsil', hindiName: 'बाढ़ तहसील', type: 'town' },
          { name: 'Masaurhi Kasba', hindiName: 'मसौढ़ी कस्बा', type: 'town' },
          { name: 'Bakhtiarpur Village Cluster', hindiName: 'बख्तियारपुर ग्राम समूह', type: 'village' },
        ],
      },
      {
        district: 'Gaya',
        hindiDistrict: 'गया',
        places: [
          { name: 'Gaya City (H.Q.)', hindiName: 'गया शहर', type: 'district' },
          { name: 'Bodh Gaya Heritage Town', hindiName: 'बोधगया कस्बा', type: 'town' },
          { name: 'Sherghati Tehsil', hindiName: 'शेरघाटी तहसील', type: 'town' },
          { name: 'Tekari Village Cluster', hindiName: 'टिकारी ग्राम समूह', type: 'village' },
        ],
      },
    ],
  },
  {
    state: 'Gujarat',
    hindiState: 'गुजरात',
    districts: [
      {
        district: 'Ahmedabad',
        hindiDistrict: 'अहमदाबाद',
        places: [
          { name: 'Ahmedabad City (H.Q.)', hindiName: 'अहमदाबाद शहर', type: 'district' },
          { name: 'Sanand Industrial Town', hindiName: 'साणंद कस्बा', type: 'town' },
          { name: 'Dholka Tehsil', hindiName: 'धोलका तहसील', type: 'town' },
          { name: 'Viramgam Kasba', hindiName: 'विरामगाम कस्बा', type: 'town' },
          { name: 'Bavla Village Cluster', hindiName: 'बावला ग्राम समूह', type: 'village' },
        ],
      },
      {
        district: 'Surat',
        hindiDistrict: 'सूरत',
        places: [
          { name: 'Surat City (H.Q.)', hindiName: 'सूरत शहर', type: 'district' },
          { name: 'Bardoli Town', hindiName: 'बारडोली कस्बा', type: 'town' },
          { name: 'Mandvi Tehsil', hindiName: 'मांडवी तहसील', type: 'town' },
          { name: 'Kamrej Village Cluster', hindiName: 'कामरेज ग्राम समूह', type: 'village' },
        ],
      },
    ],
  },
  {
    state: 'Chhattisgarh',
    hindiState: 'छत्तीसगढ़',
    districts: [
      {
        district: 'Raipur',
        hindiDistrict: 'रायपुर',
        places: [
          { name: 'Raipur City (H.Q.)', hindiName: 'रायपुर शहर', type: 'district' },
          { name: 'Nawa Raipur / Atal Nagar', hindiName: 'नवा रायपुर', type: 'town' },
          { name: 'Abhanpur Tehsil', hindiName: 'अभनपुर तहसील', type: 'town' },
          { name: 'Tilda Neora Kasba', hindiName: 'तिल्दा नेवरा कस्बा', type: 'town' },
          { name: 'Arang Village Cluster', hindiName: 'आरंग ग्राम समूह', type: 'village' },
        ],
      },
      {
        district: 'Durg / Bhilai',
        hindiDistrict: 'दुर्ग / भिलाई',
        places: [
          { name: 'Bhilai-Durg Twin Cities (H.Q.)', hindiName: 'भिलाई-दुर्ग जुड़वां शहर', type: 'district' },
          { name: 'Patan Tehsil', hindiName: 'पाटन तहसील', type: 'town' },
          { name: 'Dhamdha Kasba', hindiName: 'धमधा कस्बा', type: 'town' },
          { name: 'Kumhari Village Cluster', hindiName: 'कुम्हारी ग्राम समूह', type: 'village' },
        ],
      },
    ],
  },
  {
    state: 'Delhi NCR',
    hindiState: 'दिल्ली एनसीआर',
    districts: [
      {
        district: 'Central & South Delhi',
        hindiDistrict: 'सेंट्रल व साउथ दिल्ली',
        places: [
          { name: 'Connaught Place & South Ex Hub', hindiName: 'कनॉट प्लेस व साउथ एक्स', type: 'district' },
          { name: 'Saket & Mehrauli', hindiName: 'साकेत व महरौली', type: 'town' },
          { name: 'Chattarpur Rural Cluster', hindiName: 'छतरपुर ग्राम समूह', type: 'village' },
        ],
      },
      {
        district: 'West & North Delhi',
        hindiDistrict: 'वेस्ट व नॉर्थ दिल्ली',
        places: [
          { name: 'Janakpuri & Rohini Hub', hindiName: 'जनकपुरी व रोहिणी हब', type: 'district' },
          { name: 'Nangloi & Mundka Town', hindiName: 'नांगलोई व मुंडका कस्बा', type: 'town' },
          { name: 'Alipur & Narela Village Cluster', hindiName: 'अलीपुर व नरेला ग्राम समूह', type: 'village' },
        ],
      },
    ],
  },
];

export const FRANCHISE_RULES_BY_TIER: Record<FranchiseAreaType, FranchiseRule> = {
  village: {
    areaType: 'village',
    title: 'Village & Gram Panchayat Cluster Franchise',
    hindiTitle: 'गाँव, ब्लॉक एवं ग्राम पंचायत फ्रेंचाइज़ी',
    minOfficeSqFt: 120,
    investmentMin: 35000,
    investmentMax: 50000,
    franchiseFee: 15000,
    securityDeposit: 10000,
    monthlyTargetBookings: 50,
    royaltyPercent: 10,
    minMonthlyRoyalty: 3000,
    projectedEarningsMonthly: '₹30,000 - ₹50,000',
    minTechnicians: 4,
    minSupervisors: 1,
    terminationPolicy:
      'लगातार 3 महीने तक 40% लक्ष्य (20 बुकिंग/माह) से कम काम होने या ग्राहक के साथ गंभीर कदाचार की स्थिति में फ्रैंचाइज़ी अधिकार समाप्त कर दिए जाएंगे।',
    officeEquipments: [
      '100-150 sq ft रूम / दुकान',
      'हार्डिनकाम का अधिकृत फ्लेक्स बोर्ड एवं रेट लिस्ट',
      'स्मार्टफोन / टैबलेट व इंटरनेट कनेक्शन',
      'मूल टूल-किट डिस्प्ले स्टैंड',
      '2 कुर्सियाँ एवं 1 टेबल',
    ],
  },
  town: {
    areaType: 'town',
    title: 'Tehsil & Town (Kasba) Franchise',
    hindiTitle: 'तहसील, कस्बा एवं उप-नगर फ्रेंचाइज़ी',
    minOfficeSqFt: 250,
    investmentMin: 100000,
    investmentMax: 150000,
    franchiseFee: 40000,
    securityDeposit: 25000,
    monthlyTargetBookings: 150,
    royaltyPercent: 12,
    minMonthlyRoyalty: 7500,
    projectedEarningsMonthly: '₹60,000 - ₹1,20,000',
    minTechnicians: 10,
    minSupervisors: 1,
    terminationPolicy:
      'लगातार 3 महीने तक 50% लक्ष्य से कम परफॉर्मेंस रहने पर प्रोबेशन नोटिस दिया जाएगा। सुधार न होने पर किसी अन्य सक्रिय पार्टनर को एरिया आवंटित कर दिया जाएगा।',
    officeEquipments: [
      '200-300 sq ft सुसज्जित फ्रंट ऑफिस',
      'हार्डिनकाम ग्लो-साइन बोर्ड (LED)',
      'कंप्यूटर / लैपटॉप व इनवॉइस प्रिंटर',
      'टेक्नीशियन ट्रेनिंग व वेटिंग स्पेस',
      'कंपनी वर्दी (टी-शर्ट, कैप) एवं आई-कार्ड किट',
    ],
  },
  district: {
    areaType: 'district',
    title: 'District Headquarters & Major City Franchise',
    hindiTitle: 'ज़िला मुख्यालय एवं मुख्य महानगर फ्रेंचाइज़ी',
    minOfficeSqFt: 500,
    investmentMin: 250000,
    investmentMax: 400000,
    franchiseFee: 100000,
    securityDeposit: 50000,
    monthlyTargetBookings: 400,
    royaltyPercent: 15,
    minMonthlyRoyalty: 15000,
    projectedEarningsMonthly: '₹1,50,000 - ₹3,50,000+',
    minTechnicians: 25,
    minSupervisors: 3,
    terminationPolicy:
      'लगातार 2 तिमाहियों तक तय लक्ष्य व SLA (90% समयबद्ध सर्विस) पूरा न करने पर ज़िले का एक्सक्लूसिव अधिकार निरस्त कर दिया जाएगा और सिक्योरिटी डिपॉजिट की समीक्षा होगी।',
    officeEquipments: [
      '400-600 sq ft हार्डिनकाम एक्सपीरियंस व डिस्पैच सेंटर',
      'CCTV सर्विलांस व ग्राहक वेटिंग लाउंज',
      '2-3 कंप्यूटर वर्कस्टेशन व हाई-स्पीड ब्रॉडबैंड',
      'स्पेयर पार्ट्स व एडवांस टूल इन्वेंटरी कॉर्नर',
      'फुल-टाइम ऑपरेशन्स मैनेजर व सपोर्ट डेस्क',
    ],
  },
};

export const DEEPAK_BUILDCON_OFFICIAL = {
  companyName: 'HARDINKAAM by DEEPAK BUILDCON (दीपक बिल्डकॉन)',
  headOffice: 'Deepak Buildcon Corporate Hub, MP Nagar Zone 1, Bhopal (M.P.) - 462011',
  authorizedDirector: 'DEEPAK (Managing Director)',
  officialPhone: '+91 98270 51433',
  alternatePhone: '+91 98260 12345',
  supportPhone: '+91 98270 51433',
  whatsappNumber: '+91 98270 51433',
  officialEmail: 'deepakbuildconbhopal@gmail.com',
  website: 'https://hardinkaam.com/franchise',
};
