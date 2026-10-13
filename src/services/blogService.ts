import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Article } from '../types/blog';

const COLLECTION_NAME = 'articles';

const DEFAULT_ARTICLES: Article[] = [
  {
    id: 'blog_1',
    titleEn: 'Top 5 Home Maintenance Tips for Bhopal Summers',
    titleHi: 'भोपाल की गर्मियों के लिए शीर्ष 5 होम मेंटेनेंस टिप्स',
    slug: 'top-5-home-maintenance-tips-bhopal-summers',
    category: 'Service Tips',
    contentEn: 'Bhopal summers can be intense. Ensure your AC filters are cleaned every two weeks, water pumps are checked for voltage stability, and overhead water tanks are inspected for purity. Regular servicing saves up to 30% on electricity bills and prevents unexpected breakdowns during peak heatwave days.',
    contentHi: 'भोपाल की गर्मियां काफी तेज हो सकती हैं। सुनिश्चित करें कि आपके एसी फिल्टर हर दो सप्ताह में साफ किए जाएं, वाटर पंपों की वोल्टेज स्थिरता की जांच की जाए, और ओवरहेड पानी की टंकियों की शुद्धता का निरीक्षण किया जाए। नियमित सर्विसिंग से बिजली के बिल में 30% तक की बचत होती है और भीषण गर्मी के दिनों में अचानक खराबी से बचाव होता है।',
    shortDescEn: 'Essential AC maintenance, plumbing checks, and power safety tips for Bhopal residents during peak summer.',
    shortDescHi: 'भीषण गर्मी के दौरान भोपाल के निवासियों के लिए आवश्यक एसी रखरखाव, प्लंबिंग जांच और बिजली सुरक्षा टिप्स।',
    imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
    author: 'Deepak Buildcon Expert Team',
    publishedAt: new Date().toISOString(),
    status: 'published',
    isFeatured: true,
    seoTitle: 'Top Home Maintenance Tips Bhopal | Hardinkaam',
    metaDesc: 'Expert AC repair and home maintenance tips for Bhopal homeowners. Keep your home running smoothly with Hardinkaam.',
    keywords: ['ac repair bhopal', 'home maintenance', 'hardinkaam tips', 'plumber bhopal'],
    viewsCount: 1240,
  },
  {
    id: 'blog_2',
    titleEn: 'Hardinkaam Expands Service Fleet Across Arera Colony & Kolar Road',
    titleHi: 'हार्डिनकाम ने अरेरा कॉलोनी और कोलार रोड पर सर्विस फ्लीट का विस्तार किया',
    slug: 'hardinkaam-expands-service-arera-colony-kolar-road',
    category: 'Bhopal News',
    contentEn: 'To serve our growing customer base in Bhopal, Hardinkaam has successfully deployed 50+ new verified technicians across Arera Colony, MP Nagar, Kolar Road, and Shahpura. Customers can now enjoy 45-minute dispatch times for all emergency electrical, plumbing, and appliance repair services.',
    contentHi: 'भोपाल में हमारे बढ़ते ग्राहक आधार की सेवा के लिए, हार्डिनकाम ने अरेरा कॉलोनी, एमपी नगर, कोलार रोड और शाहपुरा में 50+ नए सत्यापित तकनीशियनों को सफलतापूर्वक तैनात किया है। ग्राहक अब सभी आपातकालीन विद्युत, प्लंबिंग और उपकरण मरम्मत सेवाओं के लिए 45 मिनट के भीतर डिस्पैच का आनंद ले सकते हैं।',
    shortDescEn: 'Hardinkaam adds 50+ verified technicians across key Bhopal localities for faster emergency dispatches.',
    shortDescHi: 'तेजी से आपातकालीन डिस्पैच के लिए हार्डिनकाम ने प्रमुख भोपाल इलाकों में 50+ सत्यापित तकनीशियन जोड़े।',
    imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
    author: 'Hardinkaam Editorial Board',
    publishedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: 'published',
    isFeatured: false,
    seoTitle: 'Hardinkaam Bhopal Expansion | Arera Colony & Kolar Road',
    metaDesc: 'Hardinkaam expands home service coverage across Bhopal with 45-minute guaranteed technician dispatches.',
    keywords: ['hardinkaam bhopal', 'arera colony services', 'kolar road electrician'],
    viewsCount: 890,
  },
];

export const blogService = {
  async getArticles(): Promise<Article[]> {
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('publishedAt', 'desc'));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return DEFAULT_ARTICLES;
      }
      return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Article[];
    } catch (err) {
      console.warn('Firestore articles fetch failed, falling back to local defaults:', err);
      return DEFAULT_ARTICLES;
    }
  },

  async createArticle(articleData: Omit<Article, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...articleData,
        publishedAt: articleData.publishedAt || new Date().toISOString(),
        viewsCount: 0,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (err) {
      console.error('Error creating article:', err);
      throw err;
    }
  },

  async updateArticle(id: string, updates: Partial<Article>): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error updating article:', err);
      throw err;
    }
  },

  async deleteArticle(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (err) {
      console.error('Error deleting article:', err);
      throw err;
    }
  },
};
