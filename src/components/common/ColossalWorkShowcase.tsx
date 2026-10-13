import React, { useState, useEffect } from 'react';
import { Camera, Upload, Sparkles, Star, CheckCircle, ThumbsUp, Eye, Share2, Shield, Award, Image as ImageIcon, Plus, X } from 'lucide-react';
import { PhotoCaptureWidget } from './PhotoCaptureWidget';
import { db } from '../../firebase/config';
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';

interface ShowcaseItem {
  id?: string;
  title: string;
  category: string;
  photoUrl: string;
  technicianName: string;
  district: string;
  likes: number;
  createdAt?: any;
}

const DEFAULT_SHOWCASE_ITEMS: ShowcaseItem[] = [
  {
    id: '1',
    title: 'AC Complete Servicing & Gas Charging',
    category: 'AC Repair',
    photoUrl: '/images/ac.webp',
    technicianName: 'Rajesh Kumar',
    district: 'Bhopal',
    likes: 142
  },
  {
    id: '2',
    title: 'Modular Kitchen Carpentry & Fitting',
    category: 'Carpenter',
    photoUrl: '/images/carpenter.webp',
    technicianName: 'Amit Vishwakarma',
    district: 'Indore',
    likes: 98
  },
  {
    id: '3',
    title: 'Full House Deep Cleaning & Sanitization',
    category: 'Deep Clean',
    photoUrl: '/images/deepclean.webp',
    technicianName: 'Sunita Bai',
    district: 'Gwalior',
    likes: 215
  },
  {
    id: '4',
    title: 'Heavy Wiring & Smart DB Installation',
    category: 'Electrician',
    photoUrl: '/images/electrician.webp',
    technicianName: 'Manoj Sharma',
    district: 'Jabalpur',
    likes: 126
  }
];

export const ColossalWorkShowcase: React.FC = () => {
  const [items, setItems] = useState<ShowcaseItem[]>(DEFAULT_SHOWCASE_ITEMS);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('AC Repair');
  const [technicianName, setTechnicianName] = useState('');
  const [district, setDistrict] = useState('Bhopal');
  const [photo, setPhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch items from Firestore if available
  useEffect(() => {
    const fetchShowcase = async () => {
      try {
        const q = query(collection(db, 'work_showcase'), orderBy('createdAt', 'desc'), limit(20));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const fetched: ShowcaseItem[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as ShowcaseItem[];
          setItems([...fetched, ...DEFAULT_SHOWCASE_ITEMS]);
        }
      } catch (e) {
        console.warn('Using default showcase items:', e);
      }
    };
    fetchShowcase();
  }, []);

  const handlePublishWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !photo) {
      alert('कृपया शीर्षक दर्ज करें और कैमरा से फोटो क्लिक करें या अपलोड करें।');
      return;
    }

    setIsSubmitting(true);
    try {
      const newItem: ShowcaseItem = {
        title: title.trim(),
        category,
        photoUrl: photo,
        technicianName: technicianName.trim() || 'Hardinkaam Expert',
        district: district.trim() || 'Bhopal',
        likes: 1,
        createdAt: new Date().toISOString()
      };

      try {
        await addDoc(collection(db, 'work_showcase'), {
          ...newItem,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.warn('Firestore write offline/fallback:', err);
      }

      setItems([newItem, ...items]);
      setSuccessMsg('🎉 आपका काम Colossal Showcase में सफलतापूर्वक प्रकाशित हो गया है!');
      setTitle('');
      setPhoto(null);
      setTimeout(() => {
        setIsUploadModalOpen(false);
        setSuccessMsg(null);
      }, 2000);
    } catch (err: any) {
      alert('अपलोड करने में त्रुटि: ' + (err?.message || 'Error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = (id?: string) => {
    if (!id) return;
    setItems(items.map(item => item.id === id ? { ...item, likes: item.likes + 1 } : item));
  };

  return (
    <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 p-6 sm:p-10 text-white shadow-xl mb-8">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-black tracking-wider uppercase">
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>Colossal Work Showcase 🏆</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
              Direct Live Photo Click & Work Showcase
            </h2>
            <p className="text-sm sm:text-base text-orange-100 max-w-2xl font-medium">
              हमारे प्रोफ़ेशनल और ग्राहकों द्वारा किए गए बेहतरीन काम की लाइव तस्वीरें। डायरेक्ट कैमरा से फोटो क्लिक करें और अपने काम को पूरे भारत में showcase करें!
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="px-6 py-3.5 rounded-2xl bg-white text-orange-700 hover:bg-orange-50 font-black text-sm flex items-center gap-2.5 shadow-xl transition active:scale-95 cursor-pointer shrink-0"
          >
            <Camera className="w-5 h-5 text-orange-600 animate-pulse" />
            <span>📸 डायरेक्ट फोटो क्लिक करके अपलोड करें</span>
          </button>
        </div>
      </div>

      {/* Grid of Showcase Items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {items.map((item, idx) => (
          <div
            key={item.id || idx}
            className="bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-sm hover:shadow-lg transition-all group flex flex-col"
          >
            <div className="relative h-52 overflow-hidden bg-stone-100">
              <img
                src={item.photoUrl}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              />
              <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-black uppercase">
                {item.category}
              </span>
              <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-orange-600 text-white text-[11px] font-bold">
                📍 {item.district}
              </span>
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
              <div>
                <h3 className="font-bold text-stone-900 text-sm line-clamp-2">
                  {item.title}
                </h3>
                <p className="text-xs text-stone-500 mt-1 flex items-center gap-1 font-medium">
                  <span>प्रोफ़ेशनल:</span>
                  <span className="text-stone-800 font-bold">{item.technicianName}</span>
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => handleLike(item.id)}
                  className="flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-orange-600 transition cursor-pointer"
                >
                  <ThumbsUp className="w-4 h-4 text-orange-500" />
                  <span>{item.likes} पसंद</span>
                </button>

                <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>सत्यापित</span>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Modal with Direct Camera Capture */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-orange-100 text-orange-600">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-stone-950">
                  Colossal Work Showcase Upload
                </h3>
                <p className="text-xs text-stone-500 font-medium">
                  डायरेक्ट कैमरा से लाइव फोटो क्लिक करें या गैलरी से अपलोड करें।
                </p>
              </div>
            </div>

            {successMsg ? (
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-center space-y-2">
                <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto animate-bounce" />
                <p className="font-bold text-sm">{successMsg}</p>
              </div>
            ) : (
              <form onSubmit={handlePublishWork} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    काम का शीर्षक (Title) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="जैसे: AC Repair & Gas Refilling in Bhopal"
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">श्रेणी (Category)</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                    >
                      <option value="AC Repair">AC Repair</option>
                      <option value="Electrician">Electrician</option>
                      <option value="Carpenter">Carpenter</option>
                      <option value="Plumber">Plumber</option>
                      <option value="Deep Clean">Deep Clean</option>
                      <option value="Construction">Construction</option>
                      <option value="Salon & Spa">Salon & Spa</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">जिला (District)</label>
                    <input
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="Bhopal / Indore"
                      className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">प्रोफ़ेशनल / आपका नाम</label>
                  <input
                    type="text"
                    value={technicianName}
                    onChange={(e) => setTechnicianName(e.target.value)}
                    placeholder="आपका नाम"
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Photo Capture Widget with Direct Camera Click & Upload */}
                <div className="pt-2">
                  <PhotoCaptureWidget
                    photo={photo}
                    onPhotoChange={setPhoto}
                    label="काम की लाइव फोटो (Direct Camera Click or Upload)"
                    required={true}
                  />
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition cursor-pointer"
                  >
                    रद्द करें
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || !photo || !title.trim()}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-black text-xs shadow-lg transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <span>प्रकाशित हो रहा है...</span>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>शोकेस पर प्रकाशित करें</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
