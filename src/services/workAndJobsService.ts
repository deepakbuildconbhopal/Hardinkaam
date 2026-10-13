import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { checkAndHandleQuotaError, isResourceExhausted } from '../utils/sparkQuotaGuard';
import {
  TaskDefinition,
  TaskSubmission,
  TaskEarningRecord,
  PayoutProfile,
  JobPost,
  JobApplication,
  SocialNetworkConfig,
  CustomerCapabilityStatus
} from '../types/workAndJobs';

function isUserSuperAdmin(): boolean {
  if (!auth.currentUser) return false;
  const email = (auth.currentUser.email || '').toLowerCase().trim();
  return (
    email === 'deepakbuildconbhopal@gmail.com' ||
    email === 'admin@hardinkaam.in' ||
    email === 'admin_deepak@hardinkaam.in' ||
    email.includes('admin') ||
    auth.currentUser.uid === 'admin_deepak_root'
  );
}

// Sample initial tasks if empty
const INITIAL_TASKS: Omit<TaskDefinition, 'id'>[] = [
  {
    title: 'Bhopal Local Business Phone & Address Verification',
    category: 'BUSINESS_VERIFICATION',
    description: 'Verify active phone numbers and store addresses for retail shops in MP Nagar and Bhopal markets.',
    instructions: '1. Call the provided shop number.\n2. Confirm store owner name and exact address.\n3. Verify operational status.',
    eligibility: 'All verified Hardinkaam customers with active phone number.',
    difficulty: 'EASY',
    estimatedTimeMinutes: 15,
    startDate: new Date().toISOString(),
    deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
    availableSlots: 50,
    maxAttempts: 2,
    submissionRequirements: ['Confirmed Shop Name', 'Working Phone', 'Exact Address Locality'],
    proofRequirements: 'Short confirmation note or call summary text.',
    rewardAmount: 10,
    terms: 'Valid verified data only. Duplicate or fake entries will be rejected.',
    source: 'HARDINKAAM_INTERNAL',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    createdBy: 'admin_root'
  },
  {
    title: 'Hindi & English Data Categorization for Service Catalog',
    category: 'HINDI_ENGLISH_TYPING',
    description: 'Categorize home service descriptions and tag correct Hindi/English keywords for appliances and plumbing.',
    instructions: 'Review service titles and assign correct category tag and keyword synonyms.',
    eligibility: 'Customers with good bilingual typing skills.',
    difficulty: 'MEDIUM',
    estimatedTimeMinutes: 25,
    startDate: new Date().toISOString(),
    deadline: new Date(Date.now() + 10 * 86400000).toISOString(),
    availableSlots: 30,
    maxAttempts: 3,
    submissionRequirements: ['Category Tag ID', 'Synonyms List'],
    proofRequirements: 'Completed classification form submission.',
    rewardAmount: 10,
    terms: 'Accuracy must be above 90% for approval.',
    source: 'CLIENT_BUSINESS_TASK',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    createdBy: 'admin_root'
  },
  {
    title: 'App Landing Page & Booking Flow Usability Testing',
    category: 'WEBSITE_APP_TESTING',
    description: 'Test the Hardinkaam booking flow and report any UI friction or suggestions.',
    instructions: '1. Simulate booking an AC service or cleaning.\n2. Note any loading speed or UI glitches.\n3. Submit structured feedback.',
    eligibility: 'All active Hardinkaam users.',
    difficulty: 'EASY',
    estimatedTimeMinutes: 10,
    startDate: new Date().toISOString(),
    deadline: new Date(Date.now() + 5 * 86400000).toISOString(),
    availableSlots: 100,
    maxAttempts: 1,
    submissionRequirements: ['Device Used (Mobile/Web)', 'Feedback Rating', 'Detailed Suggestions'],
    proofRequirements: 'Feedback form completion.',
    rewardAmount: 10,
    terms: 'Constructive feedback required.',
    source: 'HARDINKAAM_INTERNAL',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    createdBy: 'admin_root'
  }
];

const INITIAL_JOBS: Omit<JobPost, 'id'>[] = [
  {
    title: 'Field Service Technician - AC & Appliance Expert',
    department: 'Operations & Field Service',
    jobType: 'FIELD_WORK',
    location: 'Bhopal, MP (All Zones)',
    experience: '1-3 Years',
    qualification: 'ITI / Diploma in Electrical / HVAC',
    skills: ['AC Repair', 'Wiring', 'Customer Handling', 'Multimeter Testing'],
    salaryRange: '₹18,000 - ₹32,000 / month + Incentives',
    openings: 15,
    responsibilities: [
      'Handle customer service bookings assigned via Hardinkaam Partner App',
      'Diagnose and repair ACs, washing machines, and home appliances',
      'Maintain quality standards and collect digital customer signoffs'
    ],
    requirements: [
      'Valid two-wheeler license and smartphone',
      'Good communication in Hindi',
      'Professional tool kit'
    ],
    benefits: ['Flexible duty hours', 'Weekly direct payout', 'Accident Insurance cover'],
    deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
    hindiContent: 'हार्डिनकाम में एसी एवं होम अप्लायंसेज फील्ड टेक्नीशियन के रूप में जुड़ें। आकर्षक वेतन + इंसेंटिव।',
    englishContent: 'Join Hardinkaam as a Field Service Technician for AC and Home Appliances. Attractive salary + incentives.',
    ctaText: 'Apply Now / आवेदन करें',
    contactMethod: 'In-app application or WhatsApp interview',
    status: 'PUBLISHED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'admin_root'
  },
  {
    title: 'District Franchise Partner (District Lead)',
    department: 'Franchise & Business Growth',
    jobType: 'FRANCHISE',
    location: 'Madhya Pradesh (Bhopal, Indore, Gwalior, Jabalpur)',
    experience: '2+ Years Business / Sales',
    qualification: 'Graduate / Entrepreneurial background',
    skills: ['Team Management', 'Local Operations', 'Sales Leadership'],
    salaryRange: 'Commission & Profit Sharing (₹50k - ₹1.5L+ potential)',
    openings: 10,
    responsibilities: [
      'Manage local service partner network and quality control in district',
      'Onboard verified service professionals and local vendors',
      'Drive customer acquisition and local growth'
    ],
    requirements: [
      'Local office space or operational readiness in district',
      'Leadership and execution capability'
    ],
    benefits: ['District exclusivity', 'High profit commission share', 'Dedicated admin portal'],
    deadline: new Date(Date.now() + 45 * 86400000).toISOString(),
    hindiContent: 'अपने जिले में हार्डिनकाम फ्रेंचाइजी पार्टनर बनकर अपने क्षेत्र का संचालन संभालें।',
    englishContent: 'Become a Hardinkaam Franchise Partner in your district and lead local operations.',
    ctaText: 'Apply for Franchise / फ्रेंचाइजी आवेदन',
    contactMethod: 'Direct franchise interview',
    status: 'PUBLISHED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'admin_root'
  }
];

export const workAndJobsService = {
  async ensureInitialData() {
    try {
      if (!isUserSuperAdmin()) return;
      const tasksSnap = await getDocs(query(collection(db, 'task_definitions'), limit(1)));
      if (tasksSnap.empty) {
        for (const t of INITIAL_TASKS) {
          const docRef = doc(collection(db, 'task_definitions'));
          await setDoc(docRef, { id: docRef.id, ...t });
        }
      }
      const jobsSnap = await getDocs(query(collection(db, 'job_posts'), limit(1)));
      if (jobsSnap.empty) {
        for (const j of INITIAL_JOBS) {
          const docRef = doc(collection(db, 'job_posts'));
          await setDoc(docRef, { id: docRef.id, ...j });
        }
      }
    } catch (e) {
      console.warn('ensureInitialData notice:', e);
      checkAndHandleQuotaError(e);
    }
  },

  async resetAllWalletsToZero(): Promise<void> {
    try {
      const walletsSnap = await getDocs(query(collection(db, 'wallets'), limit(100)));
      for (const d of walletsSnap.docs) {
        await updateDoc(doc(db, 'wallets', d.id), {
          balance: 0,
          pendingBalance: 0,
          totalEarnings: 0,
          updatedAt: new Date().toISOString()
        });
      }
      const rewardWalletsSnap = await getDocs(query(collection(db, 'reward_wallets'), limit(100)));
      for (const d of rewardWalletsSnap.docs) {
        await updateDoc(doc(db, 'reward_wallets', d.id), {
          pointsBalance: 0,
          availablePoints: 0,
          totalEarned: 0,
          totalRedeemed: 0,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (e) {
      console.warn('resetAllWalletsToZero notice:', e);
      checkAndHandleQuotaError(e);
    }
  },

  async getTasks(): Promise<TaskDefinition[]> {
    try {
      await this.ensureInitialData();
      const snap = await getDocs(query(collection(db, 'task_definitions'), limit(100)));
      if (snap.empty) {
        return INITIAL_TASKS.map((t, idx) => ({ id: 'task_' + idx, ...t }));
      }
      return snap.docs.map((d) => d.data() as TaskDefinition);
    } catch (e) {
      console.warn('getTasks fallback to initial data:', e);
      checkAndHandleQuotaError(e);
      return INITIAL_TASKS.map((t, idx) => ({ id: 'task_' + idx, ...t }));
    }
  },

  async createTask(task: Omit<TaskDefinition, 'id'>): Promise<string> {
    const docRef = doc(collection(db, 'task_definitions'));
    const newId = docRef.id;
    await setDoc(docRef, { id: newId, ...task, rewardAmount: 10 });
    return newId;
  },

  async updateTask(id: string, updates: Partial<TaskDefinition>): Promise<void> {
    const docRef = doc(db, 'task_definitions', id);
    await updateDoc(docRef, { ...updates, rewardAmount: 10 });
  },

  async deleteTask(id: string): Promise<void> {
    await deleteDoc(doc(db, 'task_definitions', id));
  },

  async submitTask(sub: Omit<TaskSubmission, 'id' | 'status' | 'submittedAt' | 'updatedAt'>): Promise<string> {
    const todayStr = new Date().toISOString().slice(0, 10);
    const existingSubs = await this.getCustomerSubmissions(sub.customerId);
    const todayCount = existingSubs.filter(s => s.submittedAt && s.submittedAt.slice(0, 10) === todayStr).length;
    if (todayCount >= 3) {
      throw new Error('आप प्रतिदिन केवल 3 tasks ही कर सकते हैं (Maximum 3 tasks allowed per day).');
    }

    const docRef = doc(collection(db, 'task_submissions'));
    const newId = docRef.id;
    const submission: TaskSubmission = {
      ...sub,
      rewardAmount: 10,
      id: newId,
      status: 'SUBMITTED',
      disputeStatus: 'NONE',
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(docRef, submission);
    return newId;
  },

  async getCustomerSubmissions(customerId: string): Promise<TaskSubmission[]> {
    try {
      const q = query(collection(db, 'task_submissions'), where('customerId', '==', customerId));
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as TaskSubmission);
    } catch (e) {
      console.warn('getCustomerSubmissions notice:', e);
      return [];
    }
  },

  async getAllSubmissions(): Promise<TaskSubmission[]> {
    try {
      const snap = await getDocs(query(collection(db, 'task_submissions'), limit(100)));
      return snap.docs.map((d) => d.data() as TaskSubmission);
    } catch (e) {
      console.warn('getAllSubmissions notice:', e);
      checkAndHandleQuotaError(e);
      return [];
    }
  },

  async reviewSubmission(
    submissionId: string,
    status: 'APPROVED' | 'REJECTED',
    adminNote?: string,
    rejectionReason?: string
  ): Promise<void> {
    const docRef = doc(db, 'task_submissions', submissionId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Submission not found');
    const sub = snap.data() as TaskSubmission;

    await updateDoc(docRef, {
      status,
      adminNote: adminNote || '',
      rejectionReason: rejectionReason || '',
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    if (status === 'APPROVED') {
      const earningRef = doc(collection(db, 'task_earnings'));
      const earningRecord: TaskEarningRecord = {
        id: earningRef.id,
        customerId: sub.customerId,
        customerName: sub.customerName,
        taskId: sub.taskId,
        taskTitle: sub.taskTitle,
        approvedAmount: sub.rewardAmount,
        adjustments: 0,
        payableAmount: sub.rewardAmount,
        payoutStatus: 'PENDING',
        createdAt: new Date().toISOString()
      };
      await setDoc(earningRef, earningRecord);
    }
  },

  async getCustomerEarnings(customerId: string): Promise<TaskEarningRecord[]> {
    try {
      const q = query(collection(db, 'task_earnings'), where('customerId', '==', customerId), limit(100));
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as TaskEarningRecord);
    } catch (e) {
      console.warn('getCustomerEarnings notice:', e);
      checkAndHandleQuotaError(e);
      return [];
    }
  },

  async getAllEarnings(): Promise<TaskEarningRecord[]> {
    try {
      const snap = await getDocs(query(collection(db, 'task_earnings'), limit(100)));
      return snap.docs.map((d) => d.data() as TaskEarningRecord);
    } catch (e) {
      console.warn('getAllEarnings notice:', e);
      checkAndHandleQuotaError(e);
      return [];
    }
  },

  async updatePayoutStatus(earningId: string, status: 'APPROVED' | 'PAID' | 'REJECTED', utr?: string): Promise<void> {
    const docRef = doc(db, 'task_earnings', earningId);
    await updateDoc(docRef, {
      payoutStatus: status,
      payoutDate: status === 'PAID' ? new Date().toISOString() : undefined,
      utrReference: utr || ''
    });
  },

  async getPayoutProfile(customerId: string): Promise<PayoutProfile | null> {
    try {
      const docRef = doc(db, 'payout_profiles', customerId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;
      return snap.data() as PayoutProfile;
    } catch (e) {
      console.warn('getPayoutProfile notice:', e);
      return null;
    }
  },

  async getAllPayoutProfiles(): Promise<PayoutProfile[]> {
    if (isResourceExhausted()) return [];
    try {
      const snap = await getDocs(query(collection(db, 'payout_profiles'), limit(50)));
      return snap.docs.map((d) => d.data() as PayoutProfile);
    } catch (e) {
      console.warn('getAllPayoutProfiles notice:', e);
      checkAndHandleQuotaError(e);
      return [];
    }
  },

  async processPayout(params: {
    customerId: string;
    amount: number;
    paymentMethod: string;
    transactionRef: string;
    adminNote?: string;
  }): Promise<void> {
    const docRef = doc(collection(db, 'task_earnings'));
    await setDoc(docRef, {
      id: docRef.id,
      customerId: params.customerId,
      customerName: 'Customer',
      taskId: 'PAYOUT_TRANSFER',
      taskTitle: 'Work From Home Wallet Payout',
      approvedAmount: params.amount,
      adjustments: 0,
      payableAmount: params.amount,
      payoutStatus: 'PAID',
      payoutDate: new Date().toISOString(),
      utrReference: params.transactionRef,
      approvedBy: 'DEEPAK',
      createdAt: new Date().toISOString()
    });
  },

  async savePayoutProfile(profile: PayoutProfile): Promise<void> {
    const docRef = doc(db, 'payout_profiles', profile.customerId);
    await setDoc(docRef, { ...profile, updatedAt: new Date().toISOString() }, { merge: true });
  },

  async getJobs(): Promise<JobPost[]> {
    try {
      await this.ensureInitialData();
      const snap = await getDocs(query(collection(db, 'job_posts'), limit(100)));
      if (snap.empty) {
        return INITIAL_JOBS.map((j, idx) => ({ id: 'job_' + idx, ...j }));
      }
      return snap.docs.map((d) => d.data() as JobPost);
    } catch (e) {
      console.warn('getJobs fallback to initial data:', e);
      checkAndHandleQuotaError(e);
      return INITIAL_JOBS.map((j, idx) => ({ id: 'job_' + idx, ...j }));
    }
  },

  async createJob(job: Omit<JobPost, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = doc(collection(db, 'job_posts'));
    const newId = docRef.id;
    const post: JobPost = {
      ...job,
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(docRef, post);
    return newId;
  },

  async updateJob(id: string, updates: Partial<JobPost>): Promise<void> {
    const docRef = doc(db, 'job_posts', id);
    await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
  },

  async deleteJob(id: string): Promise<void> {
    await deleteDoc(doc(db, 'job_posts', id));
  },

  async applyForJob(app: Omit<JobApplication, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<string> {
    const docRef = doc(collection(db, 'job_applications'));
    const newId = docRef.id;
    const application: JobApplication = {
      ...app,
      id: newId,
      status: 'APPLIED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(docRef, application);
    return newId;
  },

  async getJobApplications(applicantId?: string): Promise<JobApplication[]> {
    try {
      if (applicantId) {
        const q = query(collection(db, 'job_applications'), where('applicantId', '==', applicantId), limit(100));
        const snap = await getDocs(q);
        return snap.docs.map((d) => d.data() as JobApplication);
      }
      const snap = await getDocs(query(collection(db, 'job_applications'), limit(100)));
      return snap.docs.map((d) => d.data() as JobApplication);
    } catch (e) {
      console.warn('getJobApplications notice:', e);
      checkAndHandleQuotaError(e);
      return [];
    }
  },

  async updateJobApplicationStatus(appId: string, status: JobApplication['status']): Promise<void> {
    const docRef = doc(db, 'job_applications', appId);
    await updateDoc(docRef, { status, updatedAt: new Date().toISOString() });
  },

  async getSocialNetworks(): Promise<SocialNetworkConfig[]> {
    const defaults: SocialNetworkConfig[] = [
      { id: 'fb', platform: 'FACEBOOK', accountName: 'Hardinkaam Official', pageUrl: 'https://facebook.com/hardinkaam', enabled: true, connectedStatus: 'MANUAL_MODE', updatedAt: new Date().toISOString() },
      { id: 'insta', platform: 'INSTAGRAM', accountName: '@hardinkaam.official', pageUrl: 'https://instagram.com/hardinkaam', enabled: true, connectedStatus: 'MANUAL_MODE', updatedAt: new Date().toISOString() },
      { id: 'wa', platform: 'WHATSAPP', accountName: 'Hardinkaam Support', pageUrl: 'https://wa.me/919876543210', enabled: true, connectedStatus: 'CONNECTED', updatedAt: new Date().toISOString() },
      { id: 'lin', platform: 'LINKEDIN', accountName: 'Hardinkaam Networks', pageUrl: 'https://linkedin.com/company/hardinkaam', enabled: true, connectedStatus: 'MANUAL_MODE', updatedAt: new Date().toISOString() }
    ];
    try {
      const snap = await getDocs(query(collection(db, 'social_networks'), limit(20)));
      if (snap.empty) {
        if (isUserSuperAdmin()) {
          for (const d of defaults) {
            await setDoc(doc(db, 'social_networks', d.id), d);
          }
        }
        return defaults;
      }
      return snap.docs.map((d) => d.data() as SocialNetworkConfig);
    } catch (e) {
      console.warn('getSocialNetworks notice:', e);
      checkAndHandleQuotaError(e);
      return defaults;
    }
  },

  async updateSocialNetwork(id: string, updates: Partial<SocialNetworkConfig>): Promise<void> {
    await updateDoc(doc(db, 'social_networks', id), { ...updates, updatedAt: new Date().toISOString() });
  },

  async deriveCustomerStatus(customerId: string, bookingsCount: number, tasksCount: number): Promise<CustomerCapabilityStatus> {
    const hasBookings = bookingsCount > 0;
    const hasTasks = tasksCount > 0;
    if (hasBookings && hasTasks) return 'TASK_SERVICE_CUSTOMER';
    if (hasTasks) return 'TASK_CUSTOMER';
    if (hasBookings) return 'SERVICE_CUSTOMER';
    return 'NEW';
  },

  async runDailyTaskReconciliationAndPayouts(): Promise<{ reconciledCount: number; totalAmountPaid: number; summary: string[] }> {
    try {
      const earningsSnap = await getDocs(query(collection(db, 'task_earnings'), limit(100)));
      const allEarnings = earningsSnap.docs.map(d => ({ id: d.id, ...(d.data() as TaskEarningRecord) }));
      const pendingEarnings = allEarnings.filter(e => e.payoutStatus === 'PENDING' || !e.payoutStatus);

      const groupMap: Record<string, TaskEarningRecord[]> = {};
      for (const e of pendingEarnings) {
        const dateKey = e.createdAt ? e.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
        const key = `${e.customerId}_${dateKey}`;
        if (!groupMap[key]) {
          groupMap[key] = [];
        }
        groupMap[key].push(e);
      }

      let reconciledCount = 0;
      let totalAmountPaid = 0;
      const summary: string[] = [];

      for (const [key, records] of Object.entries(groupMap)) {
        // Enforce up to 3 daily tasks (10 Rs each = max 30 Rs per day)
        const validRecords = records.slice(0, 3);
        const customerId = validRecords[0].customerId;
        const customerName = validRecords[0].customerName || 'Customer';
        const totalConsolidatedAmount = validRecords.reduce((sum, r) => sum + (r.payableAmount || 10), 0);
        const utr = `AUTO-DAILY-TASK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        for (const r of validRecords) {
          const docRef = doc(db, 'task_earnings', r.id);
          await updateDoc(docRef, {
            payoutStatus: 'PAID',
            payoutDate: new Date().toISOString(),
            utrReference: utr,
            approvedBy: 'SYSTEM_DAILY_RECONCILIATION'
          });
        }

        try {
          const walletRef = doc(db, 'wallets', customerId);
          const walletSnap = await getDoc(walletRef);
          if (walletSnap.exists()) {
            const wData = walletSnap.data();
            const curBalance = Number(wData.balance || 0);
            const curEarnings = Number(wData.totalEarnings || 0);
            await updateDoc(walletRef, {
              balance: curBalance + totalConsolidatedAmount,
              totalEarnings: curEarnings + totalConsolidatedAmount,
              updatedAt: new Date().toISOString()
            });
          } else {
            await setDoc(walletRef, {
              customerId,
              balance: totalConsolidatedAmount,
              pendingBalance: 0,
              totalEarnings: totalConsolidatedAmount,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        } catch (wErr) {
          console.warn('Wallet credit notice:', wErr);
        }

        reconciledCount += validRecords.length;
        totalAmountPaid += totalConsolidatedAmount;
        summary.push(`Reconciled ${validRecords.length} tasks (₹${totalConsolidatedAmount}) for ${customerName}`);
      }

      return { reconciledCount, totalAmountPaid, summary };
    } catch (e: any) {
      console.error('runDailyTaskReconciliationAndPayouts error:', e);
      throw new Error(e.message || 'Failed to execute daily task reconciliation');
    }
  }
};
