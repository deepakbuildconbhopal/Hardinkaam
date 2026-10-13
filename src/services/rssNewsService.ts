import { collection, doc, getDocs, setDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface RSSNewsItem {
  id: string;
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  state: string;
  imageUrl?: string;
  category?: string;
}

export const INDIAN_STATES_FOR_NEWS = [
  'Madhya Pradesh',
  'Uttar Pradesh',
  'Maharashtra',
  'Rajasthan',
  'Delhi NCR',
  'Gujarat',
  'Bihar',
  'All India'
] as const;

export type NewsStateName = typeof INDIAN_STATES_FOR_NEWS[number];

// High-quality state news RSS feed URLs (Google News Hindi RSS / State Feeds)
const STATE_RSS_FEED_MAP: Record<string, string> = {
  'Madhya Pradesh': 'https://news.google.com/rss/search?q=Madhya+Pradesh+Bhopal+news&hl=hi&gl=IN&ceid=IN:hi',
  'Uttar Pradesh': 'https://news.google.com/rss/search?q=Uttar+Pradesh+Lucknow+news&hl=hi&gl=IN&ceid=IN:hi',
  'Maharashtra': 'https://news.google.com/rss/search?q=Maharashtra+Mumbai+news&hl=hi&gl=IN&ceid=IN:hi',
  'Rajasthan': 'https://news.google.com/rss/search?q=Rajasthan+Jaipur+news&hl=hi&gl=IN&ceid=IN:hi',
  'Delhi NCR': 'https://news.google.com/rss/search?q=Delhi+NCR+news&hl=hi&gl=IN&ceid=IN:hi',
  'Gujarat': 'https://news.google.com/rss/search?q=Gujarat+Ahmedabad+news&hl=hi&gl=IN&ceid=IN:hi',
  'Bihar': 'https://news.google.com/rss/search?q=Bihar+Patna+news&hl=hi&gl=IN&ceid=IN:hi',
  'All India': 'https://news.google.com/rss?hl=hi&gl=IN&ceid=IN:hi',
};

// Fallback curated state news when offline or CORS restricted
const CURATED_STATE_NEWS: Record<string, RSSNewsItem[]> = {
  'Madhya Pradesh': [
    {
      id: 'mp_1',
      title: 'भोपाल एवं मध्य प्रदेश में हार्डिनकाम होम सर्विसेज और रोजगार हब का नया चरण शुरू',
      link: 'https://www.hardinkaam.online/#news',
      description: 'मध्य प्रदेश में दीपक बिल्डकॉन पहल के तहत भोपाल, इंदौर एवं उज्जैन में 500+ युवाओं को ऑन-डिमांड प्लंबिंग, इलेक्ट्रीशियन एवं टेक्नोलॉजी आधारित रोजगार मिला।',
      pubDate: new Date().toISOString(),
      source: 'Hardinkaam State News',
      state: 'Madhya Pradesh',
      category: 'राज्य समाचार',
      imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 'mp_2',
      title: 'एमपी में एमएसएमई एवं लोकल बिजनेस वेरिफिकेशन अभियान तेज',
      link: 'https://www.hardinkaam.online/#news',
      description: 'एम.पी. नगर एवं बीएचईएल भोपाल क्षेत्रों में स्थानीय विक्रेताओं और कारीगरों का डिजिटल सत्यापन एवं ऑनलाइन कैटलॉग पंजीकरण शुरू।',
      pubDate: new Date(Date.now() - 3600000 * 4).toISOString(),
      source: 'MP Patrika Live',
      state: 'Madhya Pradesh',
      category: 'व्यापार व विकास',
      imageUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80'
    }
  ],
  'Uttar Pradesh': [
    {
      id: 'up_1',
      title: 'उत्तर प्रदेश में स्मार्ट सिटी एवं होम केयर नेटवर्क विस्तार',
      link: 'https://www.hardinkaam.online/#news',
      description: 'लखनऊ, कानपुर और वाराणसी में कुशल कारीगरों एवं युवाओं के लिए ऑन-डिमांड डिजिटल जॉब नेटवर्क शुरू।',
      pubDate: new Date().toISOString(),
      source: 'UP State Bulletin',
      state: 'Uttar Pradesh',
      category: 'राज्य समाचार',
      imageUrl: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=800&q=80'
    }
  ],
  'Maharashtra': [
    {
      id: 'mh_1',
      title: 'महाराष्ट्र में शहरी विकास एवं गृह सेवा नवाचार केंद्र स्थापित',
      link: 'https://www.hardinkaam.online/#news',
      description: 'मुंबई एवं पुणे के आवासीय परिसरों में डिजिटल बुकिंग व त्वरित मैकेनिक सेवा सुविधा की भारी मांग।',
      pubDate: new Date().toISOString(),
      source: 'Maharashtra Express',
      state: 'Maharashtra',
      category: 'राज्य समाचार',
      imageUrl: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=800&q=80'
    }
  ],
  'All India': [
    {
      id: 'ind_1',
      title: 'भारत में डिजिटल ऑन-डिमांड होम सर्विसेज एवं वर्क फ्रॉम होम रोजगार में 40% की वृद्धि',
      link: 'https://www.hardinkaam.online/#news',
      description: 'टियर-2 एवं टियर-3 शहरों में स्थानीय कारीगरों को ऑनलाइन प्लेटफॉर्म्स के जरिए स्थायी मासिक आय का नया विकल्प मिला।',
      pubDate: new Date().toISOString(),
      source: 'National News Wire',
      state: 'All India',
      category: 'राष्ट्रीय समाचार',
      imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80'
    }
  ]
};

export const rssNewsService = {
  /**
   * Fetches real-time RSS news items for a specific state using rss2json public endpoint, falling back to clean RSS parsing or curated state news.
   */
  async fetchStateNews(stateName: string): Promise<RSSNewsItem[]> {
    const targetState = stateName || 'Madhya Pradesh';
    const rssUrl = STATE_RSS_FEED_MAP[targetState] || STATE_RSS_FEED_MAP['Madhya Pradesh'];

    try {
      // 1. Try rss2json proxy API
      const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
      const response = await fetch(apiUrl, { signal: AbortSignal.timeout(5000) });

      if (response.ok) {
        const data = await response.json();
        if (data && data.status === 'ok' && Array.isArray(data.items) && data.items.length > 0) {
          const items: RSSNewsItem[] = data.items.map((item: any, idx: number) => ({
            id: `rss_${targetState.replace(/\s+/g, '_')}_${idx}`,
            title: item.title?.replace(/ - .*$/, '') || 'लाइव राज्य समाचार',
            link: item.link || '#',
            description: item.description?.replace(/<[^>]*>/g, '').trim() || item.title || '',
            pubDate: item.pubDate || new Date().toISOString(),
            source: item.author || item.source || `${targetState} लाइव न्यूज़`,
            state: targetState,
            category: 'ताज़ा समाचार',
            imageUrl: item.thumbnail || item.enclosure?.link || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80'
          }));
          return items;
        }
      }
    } catch (e) {
      console.warn(`[RSS News Service] Live RSS fetch for ${targetState} fallback notice:`, e);
    }

    // 2. Return curated state news
    return CURATED_STATE_NEWS[targetState] || CURATED_STATE_NEWS['Madhya Pradesh'] || CURATED_STATE_NEWS['All India'];
  }
};
