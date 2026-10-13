import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  limit as firestoreLimit,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { isResourceExhausted } from '../utils/sparkQuotaGuard';
import { AcademyCourse, ProLearningProgress } from '../types';

export const INITIAL_ACADEMY_COURSES: AcademyCourse[] = [
  {
    id: 'course_electrical_safety',
    title: 'विद्युत सुरक्षा, अर्थिंग एवं ग्राहक शिष्टाचार',
    titleEn: 'Electrical Safety, Earthing & Customer Etiquette',
    categoryId: 'electrician',
    categoryName: 'Electrician (इलेक्ट्रीशियन)',
    description: 'घरेलू वायरिंग में सुरक्षित कार्य प्रणाली, एमसीबी ट्रिपिंग निवारण, न्यूट्रल लीकेज एवं पेशेवर शिष्टाचार।',
    badgeName: 'प्रमाणित विद्युत सुरक्षा प्रो (Certified Electrical Pro)',
    badgeIcon: '⚡',
    published: true,
    createdAt: new Date().toISOString(),
    modules: [
      {
        id: 'm1_safety_rules',
        title: 'मौलिक सुरक्षा नियम एवं टूल्स जांच (Basic Safety & PPE)',
        durationMinutes: 15,
        contentMarkdown: `### 1. सुरक्षा उपकरण (PPE Checklist)
* इंसुलेटेड ग्लव्स (1000V रेटेड) का अनिवार्य उपयोग
* रबर सोल वाले सुरक्षा जूते पहनें
* मेन स्विच बंद करके ही सर्किट पर कार्य शुरू करें
* मल्टीमीटर से फेज, न्यूट्रल एवं अर्थिंग वोल्टेज की जांच करें (Phase-Earth: ~230V, Neutral-Earth: <3V)`,
        checklist: [
          'मेन एमसीबी स्विच ऑफ किया',
          'वोल्टेज टेस्टर से सप्लाई शून्य जांची',
          'इंसुलेटेड टूल्स का उपयोग',
        ],
      },
      {
        id: 'm2_customer_care',
        title: 'ग्राहक संवाद एवं कार्य समाप्ति सफाई (Customer Etiquette)',
        durationMinutes: 10,
        contentMarkdown: `### ग्राहक के घर पर व्यवहार
* आगमन पर 'नमस्ते' कहकर अभिवादन करें और अपनी आईडी दिखाएं
* कार्य शुरू करने से पहले उपकरण की स्थिति ग्राहक को दिखाएं
* काम पूरा होने के बाद कटे हुए तार, टेप व कचरा साफ करके डस्टबिन में डालें
* ओटीपी सत्यापन कार्य संतोषजनक होने के बाद ही करवाएं`,
        checklist: [
          'प्रवेश पर अनुमति ली',
          'कार्य स्थल की सफाई की',
          'कार्य प्रदर्शन ग्राहक को दिखाया',
        ],
      },
    ],
    assessment: {
      passingScore: 75,
      questions: [
        {
          id: 'q1',
          question: 'घरेलू वायरिंग में कार्य करने से पूर्व पहला अनिवार्य कदम क्या है?',
          options: [
            'सीधे तार काटना',
            'मेन स्विच / एमसीबी बंद करना और टेस्टर से जांचना',
            'पानी से हाथ धोना',
            'पड़ोसी को बुलाना',
          ],
          correctIndex: 1,
        },
        {
          id: 'q2',
          question: 'न्यूट्रल और अर्थिंग के बीच आदर्श वोल्टेज कितना होना चाहिए?',
          options: ['230V', '110V', '3V से कम (< 3V)', '440V'],
          correctIndex: 2,
        },
        {
          id: 'q3',
          question: 'कार्य समाप्त होने के बाद तकनीशियन का कर्तव्य क्या है?',
          options: [
            'तुरंत निकल जाना',
            'कटे हुए तार व कचरा साफ करना एवं कार्य ग्राहक को दिखाना',
            'सामान वहीं छोड़ देना',
            'बिना पूछे ओटीपी मांगना',
          ],
          correctIndex: 1,
        },
        {
          id: 'q4',
          question: 'क्या 1000V रेटेड इंसुलेटेड टूल्स के बिना लाइव तार छूना सुरक्षित है?',
          options: ['हाँ', 'बिल्कुल नहीं', 'केवल दिन में', 'केवल पंखे पर'],
          correctIndex: 1,
        },
      ],
    },
  },
  {
    id: 'course_ac_gas_leakage',
    title: 'स्प्लिट एसी प्रेशर टेस्टिंग, लीकेज एवं वैक्यूम मानक',
    titleEn: 'Split AC Pressure Testing, Leakage & Vacuum Standards',
    categoryId: 'ac_repair',
    categoryName: 'AC Repair (एसी रिपेयर)',
    description: 'नाइट्रोजन प्रेशर टेस्टिंग, सोप बबल जांच, डीप वैक्यूमिंग (500 माइक्रोन) एवं सटीक गैस चार्जिंग।',
    badgeName: 'प्रमाणित एचवीएसी तकनीशियन (Certified HVAC Pro)',
    badgeIcon: '❄️',
    published: true,
    createdAt: new Date().toISOString(),
    modules: [
      {
        id: 'm1_leak_detection',
        title: 'नाइट्रोजन प्रेशर टेस्टिंग एवं लीकेज पहचान',
        durationMinutes: 20,
        contentMarkdown: `### लीकेज टेस्टिंग प्रक्रिया
1. इनडोर व आउटडोर यूनिट में नाइट्रोजन का 250-300 PSI प्रेशर भरें
2. फ्लेयर नट्स, बेंड्स एवं वाल्व पर फोम / सोप सोल्यूशन से बारीक लीकेज जांचें
3. 30 मिनट तक प्रेशर स्थिर रहने की पुष्टि करें
4. ध्यान रहे: कभी भी ऑक्सीजन या कंप्रेस्ड हवा का उपयोग न करें!`,
        checklist: [
          'नाइट्रोजन रेगुलेटर का उपयोग',
          'फ्लेयर नट्स पर साबुन झाग परीक्षण',
          '30 मिनट प्रेशर होल्ड टेस्ट',
        ],
      },
      {
        id: 'm2_vacuum_gas',
        title: 'वैक्यूम पंप एवं गैस चार्जिंग प्रोटोकॉल',
        durationMinutes: 15,
        contentMarkdown: `### वैक्यूमिंग एवं चार्जिंग
* टू-स्टेज वैक्यूम पंप से कम से कम 20 मिनट वैक्यूम करें
* नमी पूरी तरह निकलने के बाद ही वाल्व खोलें
* R32 / R410A गैस को केवल लिक्विड अवस्था में (सिलेंडर उल्टा करके) वजन के अनुसार भरें`,
        checklist: [
          '20 मिनट डीप वैक्यूम',
          'डिजिटल वेइंग स्केल से गैस वजन',
          'एम्पियर मीटर से करंट जांच',
        ],
      },
    ],
    assessment: {
      passingScore: 75,
      questions: [
        {
          id: 'q1',
          question: 'एसी में लीकेज जांच के लिए किस गैस का उपयोग अनिवार्य है?',
          options: ['ऑक्सीजन', 'नाइट्रोजन', 'एलपीजी', 'कार्बन मोनोऑक्साइड'],
          correctIndex: 1,
        },
        {
          id: 'q2',
          question: 'R32 अथवा R410A गैस चार्ज करते समय सही तरीका क्या है?',
          options: [
            'सिलेंडर सीधा रखकर वेपर फॉर्म में',
            'सिलेंडर उल्टा करके वजन के अनुसार लिक्विड फॉर्म में',
            'बिना वैक्यूम किए भर देना',
            'अनुमान से भरना',
          ],
          correctIndex: 1,
        },
        {
          id: 'q3',
          question: 'गैस भरने से पूर्व वैक्यूमिंग क्यों आवश्यक है?',
          options: [
            'पाइप ठंडा करने के लिए',
            'सिस्टम से हवा और नमी पूरी तरह बाहर निकालने के लिए',
            'बिजली बचाने के लिए',
            'आवाज कम करने के लिए',
          ],
          correctIndex: 1,
        },
        {
          id: 'q4',
          question: 'नाइट्रोजन टेस्टिंग में कितना प्रेशर सुरक्षित माना जाता है?',
          options: ['50 PSI', '250-300 PSI', '1000 PSI', '10 PSI'],
          correctIndex: 1,
        },
      ],
    },
  },
];

class SkillAcademyService {
  /**
   * Fetches all published courses for Service Pros
   */
  public async getCourses(categoryFilter?: string): Promise<AcademyCourse[]> {
    if (isResourceExhausted()) return INITIAL_ACADEMY_COURSES;
    try {
      const snap = await getDocs(query(collection(db, 'academy_courses'), firestoreLimit(30)));
      let list: AcademyCourse[] = [];

      snap.forEach((d) => {
        list.push(d.data() as AcademyCourse);
      });

      // Seed default courses if collection is empty
      if (list.length === 0) {
        for (const c of INITIAL_ACADEMY_COURSES) {
          await setDoc(doc(db, 'academy_courses', c.id), c);
        }
        list = [...INITIAL_ACADEMY_COURSES];
      }

      if (categoryFilter) {
        list = list.filter((c) => c.categoryId === categoryFilter || c.categoryId === 'all');
      }

      return list;
    } catch (e) {
      console.warn('[SkillAcademyService] Error fetching courses; using defaults:', e);
      return INITIAL_ACADEMY_COURSES;
    }
  }

  /**
   * Fetches a pro's progress on all courses
   */
  public async getProProgress(proId: string): Promise<Record<string, ProLearningProgress>> {
    try {
      const q = query(
        collection(db, 'pro_learning_progress'),
        where('proId', '==', proId),
        firestoreLimit(50)
      );
      const snap = await getDocs(q);
      const map: Record<string, ProLearningProgress> = {};
      snap.forEach((d) => {
        const item = d.data() as ProLearningProgress;
        map[item.courseId] = item;
      });
      return map;
    } catch (e) {
      console.warn('[SkillAcademyService] Error fetching pro progress:', e);
      return {};
    }
  }

  /**
   * Marks a module completed by the pro
   */
  public async completeModule(
    proId: string,
    proName: string,
    course: AcademyCourse,
    moduleId: string
  ): Promise<ProLearningProgress> {
    const docId = `prog_${proId}_${course.id}`;
    const progressRef = doc(db, 'pro_learning_progress', docId);
    const snap = await getDoc(progressRef);

    const nowIso = new Date().toISOString();
    let current: ProLearningProgress;

    if (snap.exists()) {
      current = snap.data() as ProLearningProgress;
      if (!current.completedModuleIds.includes(moduleId)) {
        current.completedModuleIds.push(moduleId);
      }
      current.updatedAt = nowIso;
    } else {
      current = {
        id: docId,
        proId,
        proName,
        courseId: course.id,
        courseTitle: course.title,
        completedModuleIds: [moduleId],
        assessmentPassed: false,
        badgeAwarded: false,
        practicalVerified: false,
        updatedAt: nowIso,
      };
    }

    await setDoc(progressRef, current);
    return current;
  }

  /**
   * Submits an assessment and calculates score
   */
  public async submitAssessment(
    proId: string,
    proName: string,
    course: AcademyCourse,
    userAnswers: Record<string, number>
  ): Promise<{ passed: boolean; score: number; badgeAwarded: boolean }> {
    const questions = course.assessment.questions;
    let correctCount = 0;

    questions.forEach((q) => {
      if (userAnswers[q.id] === q.correctIndex) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / questions.length) * 100);
    const passed = score >= course.assessment.passingScore;

    const docId = `prog_${proId}_${course.id}`;
    const progressRef = doc(db, 'pro_learning_progress', docId);
    const nowIso = new Date().toISOString();

    const updates: Partial<ProLearningProgress> = {
      assessmentPassed: passed,
      assessmentScore: score,
      updatedAt: nowIso,
    };

    if (passed) {
      updates.badgeAwarded = true;
      updates.badgeAwardedAt = nowIso;
    }

    await setDoc(progressRef, updates, { merge: true });

    return {
      passed,
      score,
      badgeAwarded: passed,
    };
  }

  /**
   * Admin sets practical verification status for a badge
   */
  public async adminSetPracticalVerification(
    proId: string,
    courseId: string,
    verified: boolean,
    adminId: string
  ): Promise<void> {
    const docId = `prog_${proId}_${courseId}`;
    await updateDoc(doc(db, 'pro_learning_progress', docId), {
      practicalVerified: verified,
      verifiedBy: adminId,
      verifiedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Admin adds or updates a course
   */
  public async saveCourse(course: AcademyCourse): Promise<void> {
    await setDoc(doc(db, 'academy_courses', course.id), course);
  }
}

export const skillAcademyService = new SkillAcademyService();
