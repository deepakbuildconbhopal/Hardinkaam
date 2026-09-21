// Hardinkaam Authentic Trade Images
// Maps the 7 photos provided by the user with reliable fallbacks

export interface TradeImageMeta {
  key: string;
  uploaded: string;
  name: string;
  hindiName: string;
  description: string;
  fallback: string;
  categoryId: string;
  badge: string;
  experience: string;
  rating: string;
  reviewCount: number;
}

export const TRADE_IMAGES: Record<string, TradeImageMeta> = {
  carpenter: {
    key: 'carpenter',
    uploaded: '/1788786162664.png',
    name: 'Carpentry & Furniture Artisan',
    hindiName: 'बढ़ई एवं फर्नीचर कारीगर',
    description: 'कस्टम फर्नीचर, अलमारी, डोर फिटिंग, सोफा रिपेयर व वुडवर्क विशेषज्ञ',
    fallback: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1000&auto=format&fit=crop&q=80',
    categoryId: 'cat_carpenter',
    badge: 'प्रमाणित बढ़ई',
    experience: '7+ वर्ष अनुभव',
    rating: '4.9★',
    reviewCount: 380,
  },
  handicraft: {
    key: 'handicraft',
    uploaded: '/1788786290922.png',
    name: 'Traditional Handicraft & Block Printing',
    hindiName: 'हस्तशिल्प व ब्लॉक प्रिंटिंग कारीगर',
    description: 'पारंपरिक ब्लॉक प्रिंटिंग, फैब्रिक क्राफ्ट, होम डेकोर व हेरिटेज कारीगरी',
    fallback: 'https://images.unsplash.com/photo-1606744837616-56c9a5c6a6eb?w=1000&auto=format&fit=crop&q=80',
    categoryId: 'cat_handicraft',
    badge: 'हस्तशिल्प गुरु',
    experience: '10+ वर्ष अनुभव',
    rating: '4.95★',
    reviewCount: 420,
  },
  electrician: {
    key: 'electrician',
    uploaded: '/1788786363389.png',
    name: 'Certified Electrician & Wiring Technician',
    hindiName: 'प्रमाणित इलेक्ट्रीशियन व वायरिंग टेक्नीशियन',
    description: 'शॉर्ट सर्किट, न्यू वायरिंग, MCB पैनल, इन्वर्टर, पंखा व स्विचबोर्ड रिपेयर',
    fallback: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1000&auto=format&fit=crop&q=80',
    categoryId: 'cat_electrician',
    badge: 'सरकारी प्रमाणित',
    experience: '8+ वर्ष अनुभव',
    rating: '4.9★',
    reviewCount: 650,
  },
  painting: {
    key: 'painting',
    uploaded: '/1788786506031.png',
    name: 'Wall Painter, Putty & Traditional Artist',
    hindiName: 'वॉल पेंटिंग, पुट्टी व आर्टिस्ट कारीगर',
    description: 'रॉयल लक्जरी इमल्शन, वॉटरप्रूफिंग, टेक्सचर वॉल, म्यूरल व कलात्मक फिनिश',
    fallback: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1000&auto=format&fit=crop&q=80',
    categoryId: 'cat_painting',
    badge: 'मास्टर पेंटर',
    experience: '9+ वर्ष अनुभव',
    rating: '4.85★',
    reviewCount: 310,
  },
  plumber: {
    key: 'plumber',
    uploaded: '/1788786558321.png',
    name: 'Master Plumber & Pipeline Specialist',
    hindiName: 'मास्टर प्लंबर व पाइपलाइन स्पेशलिस्ट',
    description: 'वाटर लीकेज सीपेज, सीपीवीसी पाइपलाइन, मोटर फिटिंग व सेनेटरी इंस्टॉलेशन',
    fallback: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=1000&auto=format&fit=crop&q=80',
    categoryId: 'cat_plumber',
    badge: 'एक्सप्रेस प्लंबर',
    experience: '6+ वर्ष अनुभव',
    rating: '4.8★',
    reviewCount: 490,
  },
  mechanic: {
    key: 'mechanic',
    uploaded: '/1788786664845.png',
    name: 'AC, Motor & Auto Appliance Mechanic',
    hindiName: 'एसी, मोटर व उपकरण मैकेनिक',
    description: 'एसी पावर जेट सर्विस, कंप्रेसर, वॉशिंग मशीन, वाटर हीटर व मोटर रिपेयर',
    fallback: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=1000&auto=format&fit=crop&q=80',
    categoryId: 'cat_ac_appliance',
    badge: 'सीनियर मैकेनिक',
    experience: '11+ वर्ष अनुभव',
    rating: '4.9★',
    reviewCount: 570,
  },
  security: {
    key: 'security',
    uploaded: '/1788787068686.png',
    name: 'Security Guard & CCTV Surveillance Staff',
    hindiName: 'सुरक्षा गार्ड व CCTV सर्विलांस स्टाफ',
    description: '24x7 आवासीय व व्यावसायिक सुरक्षा, बायोमेट्रिक व एचडी सीसीटीवी मॉनिटरिंग',
    fallback: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=1000&auto=format&fit=crop&q=80',
    categoryId: 'cat_security',
    badge: 'पुलिस वेरीफाइड',
    experience: '5+ वर्ष अनुभव',
    rating: '4.9★',
    reviewCount: 280,
  },
};

export const TRADE_IMAGE_LIST = Object.values(TRADE_IMAGES);

// Helper function to resolve image URL with automatic fallback
export const getTradeImageUrl = (key: string): string => {
  const meta = TRADE_IMAGES[key];
  if (!meta) return 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop&q=80';
  return meta.uploaded;
};

