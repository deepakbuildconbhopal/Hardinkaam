export type UserRole = 'customer' | 'service_man' | 'business_partner' | 'admin' | 'franchise_admin';

export interface FranchisePartnerPermissions {
  manageCustomers: boolean;
  managePros: boolean;
  manageBookings: boolean;
  viewRevenue: boolean;
  viewReports: boolean;
  manageDistrictServices: boolean;
  manageDistrictCategories: boolean;
  manageDistrictSettings: boolean;
}

export type FranchisePartnerStatus = 'ACTIVE' | 'SUSPENDED' | 'DISABLED' | 'PENDING';

export interface DistrictSettings {
  profitPercentage?: number; // e.g. 20 for Bhopal, 15 for Gwalior, 25 for Indore
  platformFeePercent?: number; // e.g. 15%
  franchiseCommissionPercent?: number; // e.g. 10%
  businessPartnerCommissionPercent?: number; // e.g. 15%
  serviceProfessionalSharePercent?: number; // e.g. 80%
  bookingFee?: number; // e.g. ₹20
  cancellationFee?: number; // e.g. ₹50
  minOrderValue?: number; // e.g. ₹199
  supportPhone?: string;
  supportEmail?: string;
  emergencyContact?: string;
  operatingHours?: string;
  serviceRadiusKm?: number;
  customNotice?: string;
  coveredPincodes?: string[];
}

export interface FranchiseAgreementDocument {
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
  uploadedAt: string;
  uploadedBy: string;
  storagePath?: string;
}

export interface FranchiseAgreementAcceptanceRecord {
  agreementId: string;
  franchisePartnerId: string;
  acceptanceDateTime: string;
  agreementVersion: string;
  acceptanceStatus: string;
  partnerAccountId: string;
  signerName?: string;
  signerDesignation?: string;
}

export interface FranchiseAgreementRecord {
  id: string;
  franchisePartnerId: string;
  franchiseCode: string;
  districtId: string;
  districtName: string;
  agreementId: string;
  versionNumber?: number;
  agreementVersion?: string;
  agreementYear?: string;
  startDate: string;
  endDate: string;
  charges: number;
  commissionPercent: number;
  profitPercentage: number;
  termsAndConditions: string;
  status:
    | 'ACTIVE'
    | 'EXPIRED'
    | 'PENDING'
    | 'ACCEPTED'
    | 'SUBMITTED'
    | 'APPROVED'
    | 'REJECTED'
    | 'CANCELLED'
    | 'COMPLETED'
    | 'NOTICE_ISSUED'
    | 'TERMINATION_PENDING'
    | 'TERMINATED';
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  agreementDocument?: FranchiseAgreementDocument;
  acceptanceRecord?: FranchiseAgreementAcceptanceRecord;
  terminationDetails?: {
    reason: string;
    noticeDate: string;
    noticePeriodDays: number;
    effectiveDate: string;
    notes: string;
    status: 'NOTICE_ISSUED' | 'TERMINATION_PENDING' | 'TERMINATED' | 'CANCELLED';
    cancelledAt?: string;
    cancelledBy?: string;
    terminatedAt?: string;
  };
  terminationHistory?: Array<{
    action: string;
    reason: string;
    noticeDate: string;
    effectiveDate: string;
    notes: string;
    timestamp: string;
    actor: string;
  }>;
  signedAt?: string;
  signedBy?: string;
  termsAccepted?: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}

export type FranchiseAgreementStatus = 'NOT_STARTED' | 'PENDING' | 'ACCEPTED' | 'SUBMITTED' | 'APPROVED' | 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'REJECTED' | 'CANCELLED';
export type FranchiseKYCStatus = 'LOCKED' | 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'ACTION_REQUIRED';

export type KYCDocumentType =
  | 'GUMASTA'
  | 'GST'
  | 'AADHAAR'
  | 'ELECTRICITY_BILL'
  | 'OTHER_CERTIFICATE';

export type KYCDocumentRequirementStatus = 'REQUIRED' | 'OPTIONAL' | 'DISABLED';
export type KYCDocumentVerificationStatus = 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED';

export interface KYCDocumentHistoryItem {
  action: 'UPLOAD' | 'REPLACE' | 'VERIFY' | 'REJECT' | 'STATUS_CHANGE';
  actor: string;
  actorRole?: string;
  timestamp: string;
  note?: string;
  fileName?: string;
}

export interface KYCDocumentRecord {
  id: string;
  franchisePartnerId: string;
  franchiseCode: string;
  districtId: string;
  districtName: string;
  documentType: KYCDocumentType;
  documentTitle: string;
  storagePath?: string;
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  fileType?: string;
  status: KYCDocumentVerificationStatus;
  uploadedAt: string;
  uploadedBy: string;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
  history?: KYCDocumentHistoryItem[];
}

export interface FranchiseKYCSettings {
  gumasta: 'REQUIRED'; // Gumasta is ALWAYS REQUIRED 🔒
  gst: KYCDocumentRequirementStatus;
  aadhaar: KYCDocumentRequirementStatus;
  electricityBill: KYCDocumentRequirementStatus;
  otherCertificate: KYCDocumentRequirementStatus;
  updatedAt?: string;
  updatedBy?: string;
}

export interface FranchisePartner {
  id: string; // Document ID / Auth UID
  franchisePartnerId: string;
  franchiseCode: string; // e.g. HDK-GWL-001, HDK-BPL-001
  name: string;
  email: string;
  phone: string;
  assignedDistrictId: string; // e.g. "district_gwalior" or "gwalior"
  assignedDistrictName: string; // e.g. "Gwalior"
  stateName: string; // e.g. "Madhya Pradesh"
  status: FranchisePartnerStatus;
  permissions: FranchisePartnerPermissions;
  officeAddress?: string;
  city?: string;
  pincodes?: string[];
  districtSettings?: DistrictSettings;
  disabledServiceIds?: string[];
  disabledCategoryIds?: string[];
  loginUsername?: string;
  // Agreement & KYC workflow fields
  agreementStatus?: FranchiseAgreementStatus;
  agreementSignedAt?: string;
  agreementSignedBy?: string;
  agreementTermsAccepted?: boolean;
  agreementDocument?: FranchiseAgreementDocument;
  acceptanceRecord?: FranchiseAgreementAcceptanceRecord;
  kycStatus?: FranchiseKYCStatus;
  kycSubmittedAt?: string;
  kycVerifiedAt?: string;
  kycVerifiedBy?: string;
  kycRejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  createdBy?: string;
  notes?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatar?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  districtId?: string;
  districtName?: string;
  assignedDistrictId?: string;
  assignedDistrictName?: string;
  franchiseCode?: string;
  franchisePartnerId?: string;
  status: 'active' | 'suspended' | 'pending';
  registrationFeePaid?: boolean;
  registrationFeeAmount?: number;
  registrationPaymentId?: string;
  registrationOrderId?: string;
  registrationPaidAt?: string;
  payoutUpiId?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankAccountHolderName?: string;
  loginPassword?: string;
  resetRequested?: boolean;
  resetRequestedAt?: string;
  passwordUpdatedAt?: string;
  passwordResetBy?: string;
  requirePasswordChange?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PasswordResetRequest {
  id: string;
  emailOrUsername: string;
  userEmail?: string;
  userName?: string;
  userPhone?: string;
  userId?: string;
  status: 'pending' | 'resolved';
  requestedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  newAssignedPassword?: string;
  notes?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  imageUrl?: string;
  order: number;
  isActive: boolean;
}

export interface Service {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string;
  basePrice: number;
  priceUnit: string;
  durationMinutes: number;
  imageUrl?: string;
  rating: number;
  ratingCount: number;
  isActive: boolean;
}

export interface ServiceMan {
  id: string;
  userId: string;
  name: string;
  phone: string;
  email: string;
  photoUrl?: string;
  categoryIds: string[];
  categoryNames: string[];
  serviceArea: string;
  city?: string;
  districtId?: string;
  districtName?: string;
  franchisePartnerId?: string;
  experienceYears: number;
  hourlyRate: number;
  isAvailable: boolean;
  isVerified: boolean;
  kycStatus: 'pending' | 'verified' | 'rejected';
  rating: number;
  totalJobs: number;
  partnerId?: string;
  createdAt?: string;
}

export interface BusinessPartner {
  id: string;
  userId: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  gstNumber?: string;
  address: string;
  commissionRate: number;
  isVerified: boolean;
  techniciansCount: number;
  createdAt?: string;
}

export type BookingStatus =
  | 'pending'
  | 'assigned'
  | 'accepted'
  | 'on_the_way'
  | 'arriving'
  | 'arrived'
  | 'otp_pending'
  | 'in_progress'
  | 'work_started'
  | 'completed'
  | 'work_completed'
  | 'cancelled'
  | 'rejected'
  | 'service_man_unable_to_reach';

export type TrackingStatus =
  | 'assigned'
  | 'accepted'
  | 'on_the_way'
  | 'arriving'
  | 'arrived'
  | 'otp_pending'
  | 'work_started'
  | 'work_completed'
  | 'WORK_STARTED'
  | 'COMPLETED'
  | 'completed'
  | 'cancelled'
  | 'service_man_unable_to_reach';

export type BookingOfferStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface BookingOffer {
  offerId: string;
  bookingId: string;
  serviceManId: string;
  serviceManName?: string;
  serviceManPhone?: string;
  districtId: string;
  districtName?: string;
  serviceId: string;
  serviceName?: string;
  categoryId?: string;
  categoryName?: string;
  status: BookingOfferStatus;
  createdAt: string;
  expiresAt: string;
  respondedAt?: string;
  amount?: number;
  scheduledDate?: string;
  scheduledTime?: string;
  address?: string;
  city?: string;
  pincode?: string;
  customerName?: string;
  customerPhone?: string;
  rejectionReason?: string;
  cancellationReason?: string;
  approxDistanceKm?: number;
  approxDistanceText?: string;
  estimatedCharge?: number;
  updatedAt?: string;
}

export interface ServiceManLocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  updatedAt: string;
}

// Phase 1: Live Location Foundation Types
export type LiveLocationTrackingStatus =
  | 'REQUESTED'
  | 'ASSIGNED'
  | 'ON_THE_WAY'
  | 'ARRIVED'
  | 'WORK_STARTED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface TrackingLocationPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
}

export interface ServiceTrackingDocument {
  bookingId: string;
  customerId: string;
  servicemanId: string;
  status: LiveLocationTrackingStatus;
  customerLocation?: TrackingLocationPoint | null;
  servicemanLocation?: TrackingLocationPoint | null;
  destination?: TrackingLocationPoint | null;
  etaSeconds?: number | null;
  lastUpdatedAt: string;
  locationHistory?: TrackingLocationPoint[];
  trackingStartedAt?: string;
  trackingEndedAt?: string;
}

export type PaymentStatus = 'unpaid' | 'paid' | 'refunded' | 'cod';
export type PaymentMethod = 'cash' | 'upi' | 'card' | 'wallet' | 'razorpay' | 'online';

export const REGISTRATION_FEES = {
  customer: 121,
  service_man: 121,
  business_partner: 1021,
  admin: 0,
} as const;

export interface ServicemanPayoutRecord {
  id: string;
  bookingId: string;
  serviceName: string;
  categoryName?: string;
  customerName: string;
  customerPhone?: string;
  serviceManId: string;
  serviceManName: string;
  serviceManPhone?: string;
  grossAmount: number; // e.g. 500
  companyServiceCharge: number; // e.g. 15% = 75
  companyCommissionRate: number; // e.g. 15%
  taxDeduction: number; // e.g. 5% TDS = 25
  taxRate: number; // e.g. 5%
  netPayoutAmount: number; // e.g. 400
  customerPaymentMethod: PaymentMethod;
  customerRazorpayPaymentId?: string;
  payoutStatus: 'pending' | 'processing' | 'paid' | 'failed';
  payoutRazorpayId?: string;
  payoutUpiOrBank?: string;
  payoutPaidAt?: string;
  payoutProcessedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  serviceId: string;
  serviceName: string;
  categoryId: string;
  categoryName: string;
  serviceManId?: string;
  serviceManName?: string;
  serviceManPhone?: string;
  partnerId?: string;
  scheduledDate: string;
  scheduledTime: string;
  address: string;
  city?: string;
  districtId?: string;
  districtName?: string;
  franchisePartnerId?: string;
  franchiseCode?: string;
  pincode?: string;
  notes?: string;
  amount: number;
  estimatedCharge?: number;
  approxDistanceKm?: number;
  approxDistanceText?: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  companyCommission?: number;
  franchiseCommission?: number;
  taxDeduction?: number;
  servicemanPayoutAmount?: number;
  payoutStatus?: 'pending' | 'processing' | 'paid';
  payoutRazorpayId?: string;
  payoutPaidAt?: string;
  isReviewed?: boolean;
  rating?: number;
  reviewComment?: string;
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  cancelledBy?: string;
  otp?: string;
  otpCreatedAt?: string;
  otpAttempts?: number;
  // Advanced Service Tracking Fields
  trackingStatus?: TrackingStatus;
  serviceManLocation?: ServiceManLocationData;
  lastLocationUpdate?: string;
  etaMinutes?: number;
  estimatedArrivalTime?: string;
  arrivalOtpHash?: string;
  otpExpiresAt?: string;
  otpVerifiedAt?: string;
  workStartedAt?: string;
  workCompletedAt?: string;
  workEndedAt?: string;
  workDurationMinutes?: number;
  workDurationFormatted?: string;
  workStatus?: 'not_started' | 'in_progress' | 'completed';
  baseAmount?: number;
  extraCharges?: ExtraChargeItem[];
  finalBill?: BillSnapshot;
  finalAmount?: number;
  deliveryStatus?: 'unverified' | 'in_progress' | 'verified';
  isVerifiedDelivery?: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
  rescheduledAt?: string;
  rescheduleCount?: number;
  // Advanced Live Tracking & Reassignment Lifecycle
  onTheWayAt?: string;
  arrivedAt?: string;
  unableToReachReason?: string;
  unableToReachNote?: string;
  locationHistory?: TrackingLocationPoint[];
  trackingStartedAt?: string;
  trackingEndedAt?: string;
  unableToReachAt?: string;
  reassignmentStatus?: 'pending_reassignment' | 'reassigned';
  originalServiceManId?: string;
  originalServiceManName?: string;
  reassignmentHistory?: Array<{
    previousServiceManId?: string;
    previousServiceManName?: string;
    previousServiceManPhone?: string;
    reason?: string;
    note?: string;
    timestamp: string;
    reassignedBy?: string;
    newServiceManId?: string;
    newServiceManName?: string;
  }>;
  customerAvailabilityStatus?: 'available' | 'call_before_arriving' | 'not_at_home';
  customerLandmarkNote?: string;
  customerAvailabilityUpdatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExtraChargeItem {
  id: string;
  type: 'material' | 'service' | 'other';
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  addedBy: string;
  addedByName?: string;
  addedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  notes?: string;
}

export interface BillLineItem {
  id: string;
  label: string;
  category: 'base_service' | 'extra_service' | 'material' | 'platform_charge' | 'tax' | 'discount';
  quantity?: number;
  unitPrice?: number;
  amount: number;
  notes?: string;
}

export interface BillSnapshot {
  id: string;
  bookingId: string;
  customerId: string;
  customerName?: string;
  serviceManId: string;
  serviceManName?: string;
  serviceCategory?: string;
  serviceName?: string;
  districtId?: string;
  districtName?: string;
  workStartedAt?: string;
  workEndedAt?: string;
  workDurationMinutes?: number;
  workDurationFormatted?: string;
  baseAmount: number;
  extraServicesAmount: number;
  materialsAmount: number;
  platformChargeAmount: number;
  taxAmount: number;
  finalAmount: number;
  lineItems: BillLineItem[];
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  generatedAt: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  customerId: string;
  amount: number;
  method: PaymentMethod;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionReference?: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  role: UserRole;
  amount: number;
  type: 'credit' | 'debit';
  purpose: string;
  bookingId?: string;
  status: 'success' | 'pending' | 'failed';
  createdAt: string;
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  pendingBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  amount: number;
  type: 'credit' | 'withdrawal';
  description: string;
  status: 'pending' | 'completed' | 'rejected';
  createdAt: string;
}

export interface Review {
  id: string;
  bookingId: string;
  customerId: string;
  customerName: string;
  serviceId: string;
  serviceManId?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface KycDocument {
  id: string;
  userId: string;
  userName: string;
  role: UserRole;
  docType: 'aadhaar' | 'pan' | 'license' | 'gst_certificate' | 'trade_cert';
  docNumber: string;
  fileUrl: string;
  status: 'pending' | 'verified' | 'rejected';
  adminNotes?: string;
  submittedAt: string;
  reviewedAt?: string;
}

export interface Message {
  id: string;
  bookingId: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  text: string;
  imageUrl?: string;
  imageThumbnail?: string;
  timestamp: string;
  read: boolean;
}

export interface WhatsAppLog {
  id: string;
  recipientPhone: string;
  recipientName: string;
  type: string;
  messageBody: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  franchiseCode?: string;
  smsContent?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'booking' | 'payment' | 'system' | 'kyc' | 'agreement';
  link?: string;
  read: boolean;
  createdAt: string;
  targetRole?: 'admin' | 'franchise' | 'pro' | 'customer';
  metadata?: Record<string, any>;
}

export interface PlatformSetting {
  id: string;
  value: string;
  description: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  details: string;
  timestamp: string;
}

export type FranchiseAreaType = 'village' | 'town' | 'district';
export type FranchiseStatus = 'applied' | 'under_review' | 'approved' | 'active' | 'probation' | 'terminated';

export interface FranchiseRule {
  areaType: FranchiseAreaType;
  title: string;
  hindiTitle: string;
  minOfficeSqFt: number;
  investmentMin: number;
  investmentMax: number;
  franchiseFee: number;
  securityDeposit: number;
  monthlyTargetBookings: number;
  royaltyPercent: number;
  minMonthlyRoyalty: number;
  projectedEarningsMonthly: string;
  minTechnicians: number;
  minSupervisors: number;
  terminationPolicy: string;
  officeEquipments: string[];
}

export interface FranchiseApplication {
  id: string;
  franchiseCode?: string;
  applicantName: string;
  phone: string;
  alternatePhone?: string;
  email: string;
  state: string;
  district: string;
  cityOrVillage: string;
  areaType: FranchiseAreaType;
  pincode: string;
  fullAddress: string;
  investmentBudget: number;
  officeAvailable: 'yes' | 'renting' | 'looking';
  officeAreaSqFt: number;
  initialStaffCount: number;
  experienceYears: number;
  monthlyTargetBookings: number;
  estimatedEarnings: string;
  royaltyFeeMonthly: number;
  royaltyPercentage: number;
  status: FranchiseStatus;
  smsSentToApplicant: boolean;
  companyPhone: string;
  parentEntity: string;
  adminNotes?: string;
  notificationLogId?: string;
  notificationStatus?: 'queued' | 'sent' | 'delivered';
  notificationSentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FranchiseCityReport {
  cityOrVillage: string;
  district: string;
  state: string;
  areaType: FranchiseAreaType;
  franchiseHolderName: string;
  phone: string;
  activeSince: string;
  monthlyTarget: number;
  completedBookingsThisMonth: number;
  targetAchievementRate: number;
  totalRevenueGenerated: number;
  royaltyPaidToDeepakBuildcon: number;
  staffCount: number;
  status: FranchiseStatus;
}

export type BulkRecipientTarget =
  | 'all_users'
  | 'customers'
  | 'technicians'
  | 'business_partners'
  | 'bhopal_zone'
  | 'custom_numbers';

export interface BulkSmsLog {
  id: string;
  title: string;
  targetGroup: BulkRecipientTarget;
  message: string;
  recipientCount: number;
  sampleRecipients: string[];
  senderHeader: string; // e.g. 'DBCBHO'
  channel: 'sms' | 'whatsapp' | 'both';
  status: 'sent' | 'queued' | 'partially_sent';
  sentBy: string;
  videoCallLink?: string;
  videoCallRoomCode?: string;
  timestamp: string;
}

export type VideoCallPurpose =
  | 'technical_inspection'
  | 'kyc_verification'
  | 'customer_support'
  | 'franchise_briefing'
  | 'general';

export interface VideoCallSession {
  id: string;
  roomCode: string;
  title: string;
  hostRole: UserRole;
  hostName: string;
  hostId: string;
  participantRole?: UserRole;
  participantName?: string;
  participantPhone?: string;
  bookingId?: string;
  status: 'active' | 'waiting' | 'ended';
  purpose: VideoCallPurpose;
  notes?: string;
  createdAt: string;
  endedAt?: string;
}

export type DeploymentStage =
  | 'IDLE'
  | 'QUEUED'
  | 'UPLOADING'
  | 'VALIDATING'
  | 'EXTRACTING'
  | 'AUDITING'
  | 'INSTALLING'
  | 'BUILDING'
  | 'VERIFYING'
  | 'DEPLOYING'
  | 'LIVE'
  | 'FAILED'
  | 'FAILED_TIMEOUT'
  | 'ROLLED_BACK';

export type StageExecutionStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';

export interface StageExecutionRecord {
  key: string;
  label: string;
  status: StageExecutionStatus;
  progress: number;
  startedAt?: string;
  endedAt?: string;
  message?: string;
  error?: string | null;
  logs?: string[];
}

export interface DeploymentErrorDetails {
  stage: string;
  error: string;
  file?: string;
  reason?: string;
  action?: string;
}

export interface FlaggedExecutableFile {
  path: string;
  name: string;
  fileName?: string;
  ext: string;
  extension?: string;
  size: number;
  sizeFormatted: string;
  fileType: string;
  isInStaging?: boolean;
}

export interface PreDeploymentAuditResult {
  hasExecutables: boolean;
  executables: FlaggedExecutableFile[];
  flaggedFiles?: FlaggedExecutableFile[];
  totalFiles: number;
  totalSize: number;
  deploymentMode: 'DIST' | 'BUILD';
  rootPrefix?: string;
  isClean: boolean;
  message?: string;
}

export interface DeploymentJobRecord {
  jobId: string;
  fileName: string;
  fileSize: number;
  zipHash?: string;
  versionTag: string;
  status: 'QUEUED' | 'RUNNING' | 'ACTION_REQUIRED' | 'SUCCESS' | 'FAILED' | 'FAILED_TIMEOUT';
  currentStage: DeploymentStage;
  progress: number;
  message: string;
  uploadedAt: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  retryCount: number;
  fileCount?: number;
  totalSize?: number;
  deploymentRoot?: string;
  deploymentMode?: 'DIST' | 'BUILD';
  buildStatus: 'QUEUED' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILED' | 'SKIPPED';
  auditStatus: 'PENDING' | 'PASSED' | 'FAILED';
  firebaseStatus: 'PENDING' | 'DEPLOYED' | 'FAILED';
  errorCode?: string | null;
  errorMessage?: string | null;
  errorDetails?: DeploymentErrorDetails | null;
  logs: string[];
  stages?: Record<string, StageExecutionRecord>;
  deployment?: DeploymentVersion;
  unsupportedFiles?: string[];
  strippedFiles?: string[];
  detectedExecutables?: FlaggedExecutableFile[];
  excludedExecutables?: string[];
  requiresAuditConfirmation?: boolean;
}

export type DeploymentStateStatus =
  | 'LIVE'
  | 'PREVIOUS'
  | 'FAILED'
  | 'ROLLED_BACK'
  | 'BUILDING'
  | 'DEPLOYING'
  | 'QUEUED';

export interface DeploymentVersion {
  id: string;
  version: string; // e.g. v1.0.3
  status: DeploymentStateStatus;
  buildStatus: 'SUCCESS' | 'FAILED' | 'IN_PROGRESS' | 'QUEUED';
  deploymentStatus: 'LIVE' | 'FAILED' | 'PREVIOUS' | 'IN_PROGRESS' | 'ROLLED_BACK';
  uploadedBy: string;
  uploadedByEmail?: string;
  uploadedAt: string;
  deploymentTime?: string;
  zipFileName: string;
  zipFileSize?: number;
  buildLog?: string;
  deploymentLog?: string;
  errorMessage?: string | null;
  failedStage?: DeploymentStage;
  siteUrl?: string;
  releaseId?: string;
  isActiveLive?: boolean;
}

export interface DeploymentProgressUpdate {
  stage: DeploymentStage;
  progress: number;
  message: string;
  version?: string;
  error?: string | null;
  logs?: string[];
  deployment?: DeploymentVersion;
  jobRecord?: DeploymentJobRecord;
  errorDetails?: DeploymentErrorDetails | null;
  detectedExecutables?: FlaggedExecutableFile[];
  requiresAuditConfirmation?: boolean;
}

export type OfferStatus = 'offered' | 'accepted' | 'rejected' | 'declined' | 'expired' | 'closed';

export interface BookingAssignment {
  id: string; // asgn_{bookingId}_{serviceManId}
  bookingId: string;
  serviceManId: string;
  serviceManName?: string;
  serviceManPhone?: string;
  district?: string;
  districtId?: string;
  service?: string;
  serviceId?: string;
  serviceCategory?: string;
  categoryId?: string;
  amount: number;
  scheduledDate?: string;
  scheduledTime?: string;
  addressArea?: string;
  status: OfferStatus;
  createdAt: string;
  expiresAt: string;
  notificationStatus?: 'pending' | 'sent' | 'failed' | 'not_registered';
  fcmSentAt?: string;
  notificationError?: string;
  acceptedAt?: string;
  closedReason?: string;
  closedAt?: string;
  updatedAt: string;
}

export interface DeviceToken {
  token: string;
  userId: string;
  role: string;
  deviceType?: 'web' | 'android' | 'ios';
  updatedAt: string;
  createdAt?: string;
}



