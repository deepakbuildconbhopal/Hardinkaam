export type CustomerCapabilityStatus = 'SERVICE_CUSTOMER' | 'TASK_CUSTOMER' | 'TASK_SERVICE_CUSTOMER' | 'NEW';

export type TaskCategory =
  | 'BUSINESS_VERIFICATION'
  | 'DATA_VERIFICATION'
  | 'ADDRESS_PHONE_VERIFICATION'
  | 'IMAGE_CATEGORIZATION'
  | 'PRODUCT_CLASSIFICATION'
  | 'HINDI_ENGLISH_TYPING'
  | 'SHORT_TRANSCRIPTION'
  | 'WEBSITE_APP_TESTING'
  | 'SEARCH_RELEVANCE'
  | 'CONTENT_REVIEW'
  | 'SURVEY_RESEARCH'
  | 'LOCAL_BUSINESS_COLLECTION'
  | 'AI_DATA_LABELING'
  | 'DIGITAL_TASK'
  | 'HARDINKAAM_INTERNAL'
  | 'CLIENT_TASK';

export type TaskDifficulty = 'EASY' | 'MEDIUM' | 'ADVANCED';

export type TaskSource = 'HARDINKAAM_INTERNAL' | 'CLIENT_BUSINESS_TASK';

export type TaskStatus =
  | 'AVAILABLE'
  | 'CLAIMED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'DISPUTED'
  | 'PAYOUT_PENDING'
  | 'PAID';

export interface TaskDefinition {
  id: string;
  title: string;
  category: TaskCategory;
  description: string;
  instructions: string;
  eligibility: string;
  difficulty: TaskDifficulty;
  estimatedTimeMinutes: number;
  startDate: string;
  deadline: string;
  availableSlots: number;
  maxAttempts: number;
  submissionRequirements: string[];
  proofRequirements: string;
  rewardAmount: number; // in INR
  terms: string;
  source: TaskSource;
  status: 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'ARCHIVED';
  createdAt: string;
  createdBy: string;
}

export interface TaskSubmission {
  id: string;
  taskId: string;
  taskTitle: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  status: TaskStatus;
  submissionData: Record<string, any>;
  proofText?: string;
  proofUrl?: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  adminNote?: string;
  rejectionReason?: string;
  rewardAmount: number;
  disputeReason?: string;
  disputeStatus?: 'NONE' | 'RAISED' | 'UNDER_REVIEW' | 'RESOLVED';
  updatedAt: string;
}

export interface TaskEarningRecord {
  id: string;
  customerId: string;
  customerName: string;
  taskId: string;
  taskTitle: string;
  approvedAmount: number;
  adjustments: number;
  payableAmount: number;
  payoutStatus: 'PENDING' | 'APPROVED' | 'PROCESSING' | 'PAID' | 'REJECTED';
  payoutDate?: string;
  utrReference?: string;
  approvedBy?: string;
  createdAt: string;
}

export interface PayoutProfile {
  customerId: string;
  accountHolderName: string;
  bankName: string;
  accountNumber: string; // masked in UI
  ifsc: string;
  upiId: string;
  preferredMethod: 'BANK_TRANSFER' | 'UPI';
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verifiedAt?: string;
  updatedAt: string;
}

export type JobType =
  | 'FULL_TIME'
  | 'PART_TIME'
  | 'FIELD_WORK'
  | 'OFFICE_WORK'
  | 'SALES'
  | 'MARKETING'
  | 'TELECALLING'
  | 'SERVICEMAN'
  | 'TECHNICIAN'
  | 'BUSINESS_PARTNER'
  | 'BRAND_PROMOTER'
  | 'FRANCHISE'
  | 'INTERNSHIP'
  | 'FREELANCE'
  | 'CONTRACT'
  | 'OTHER';

export interface JobPost {
  id: string;
  title: string;
  department: string;
  jobType: JobType;
  location: string;
  experience: string;
  qualification: string;
  skills: string[];
  salaryRange?: string;
  openings: number;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  deadline: string;
  hindiContent: string;
  englishContent: string;
  ctaText: string;
  contactMethod: string;
  status: 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'CLOSED' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  applicantId: string;
  applicantName: string;
  applicantPhone: string;
  applicantEmail?: string;
  resumeUrl?: string;
  coverNote?: string;
  status: 'APPLIED' | 'SHORTLISTED' | 'INTERVIEWED' | 'SELECTED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
}

export interface SocialNetworkConfig {
  id: string;
  platform: 'FACEBOOK' | 'INSTAGRAM' | 'LINKEDIN' | 'X' | 'YOUTUBE' | 'TELEGRAM' | 'WHATSAPP';
  accountName: string;
  pageUrl: string;
  enabled: boolean;
  connectedStatus: 'CONNECTED' | 'DISCONNECTED' | 'MANUAL_MODE';
  lastPublishedAt?: string;
  updatedAt: string;
}
