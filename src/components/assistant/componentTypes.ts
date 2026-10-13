export type DynamicComponentType =
  | 'quick_replies'
  | 'options'
  | 'service_cards'
  | 'category_cards'
  | 'date_picker'
  | 'time_picker'
  | 'address_form'
  | 'location_selector'
  | 'number_input'
  | 'text_input'
  | 'multiline_text_input'
  | 'yes_no_confirmation'
  | 'photo_upload'
  | 'multiple_photo_upload'
  | 'camera_option'
  | 'video_upload'
  | 'document_pdf_upload'
  | 'price_estimate_card'
  | 'service_professional_card'
  | 'booking_summary_card'
  | 'payment_action_card'
  | 'otp_input'
  | 'rating_component'
  | 'progress_indicator'
  | 'dynamic_form'
  | 'live_booking_summary'
  | 'personalized_welcome_widget'
  | 'graceful_error_card';

export interface QuickRepliesComponent {
  type: 'quick_replies';
  title?: string;
  options: Array<{
    id: string;
    label: string;
    icon?: string;
    payload?: any;
  }>;
}

export interface OptionsComponent {
  type: 'options';
  title: string;
  subtitle?: string;
  multiSelect?: boolean;
  options: Array<{
    id: string;
    label: string;
    description?: string;
    icon?: string;
    badge?: string;
    price?: number;
  }>;
}

export interface ServiceCardsComponent {
  type: 'service_cards';
  title?: string;
  services: Array<{
    id: string;
    name: string;
    categoryName?: string;
    price: number;
    duration?: string;
    rating?: number;
    ratingCount?: number;
    imageUrl?: string;
    inclusions?: string[];
  }>;
}

export interface CategoryCardsComponent {
  type: 'category_cards';
  title?: string;
  categories: Array<{
    id: string;
    name: string;
    icon?: string;
    count?: number;
    description?: string;
  }>;
}

export interface DatePickerComponent {
  type: 'date_picker';
  title?: string;
  minDate?: string;
  maxDate?: string;
  quickDates?: Array<{
    id: string;
    label: string;
    date: string;
  }>;
}

export interface TimePickerComponent {
  type: 'time_picker';
  title?: string;
  slots: Array<{
    id: string;
    label: string;
    timeRange: string;
    isUrgent?: boolean;
    badge?: string;
  }>;
}

export interface AddressFormComponent {
  type: 'address_form';
  title?: string;
  defaultLocality?: string;
  localities?: string[];
  submitLabel?: string;
}

export interface LocationSelectorComponent {
  type: 'location_selector';
  title?: string;
  popularLocalities?: string[];
  allowCurrentLocation?: boolean;
}

export interface LocationExperienceComponent {
  type: 'location_experience';
  title?: string;
  savedAddress?: {
    houseFlat?: string;
    street?: string;
    area?: string;
    city?: string;
    district?: string;
    state?: string;
    pincode?: string;
    landmark?: string;
    fullAddress?: string;
  };
  defaultLocality?: string;
  localities?: string[];
  initialMode?: 'options' | 'gps' | 'map' | 'manual' | 'saved';
}

export interface NumberInputComponent {
  type: 'number_input';
  title?: string;
  description?: string;
  unit?: string;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  submitLabel?: string;
}

export interface TextInputComponent {
  type: 'text_input';
  title?: string;
  placeholder?: string;
  defaultValue?: string;
  buttonLabel?: string;
  submitLabel?: string;
}

export interface MultilineTextInputComponent {
  type: 'multiline_text_input';
  title?: string;
  placeholder?: string;
  rows?: number;
  buttonLabel?: string;
  submitLabel?: string;
}

export interface YesNoConfirmationComponent {
  type: 'yes_no_confirmation';
  title: string;
  description?: string;
  yesLabel?: string;
  noLabel?: string;
}

export interface PhotoUploadComponent {
  type: 'photo_upload';
  title?: string;
  description?: string;
  submitLabel?: string;
}

export interface MultiplePhotoUploadComponent {
  type: 'multiple_photo_upload';
  title?: string;
  description?: string;
  maxPhotos?: number;
  submitLabel?: string;
}

export interface CameraOptionComponent {
  type: 'camera_option';
  title?: string;
  description?: string;
  captureLabel?: string;
}

export interface VideoUploadComponent {
  type: 'video_upload';
  title?: string;
  description?: string;
  maxDurationSeconds?: number;
  submitLabel?: string;
}

export interface DocumentPdfUploadComponent {
  type: 'document_pdf_upload';
  title?: string;
  docTypes?: string[];
  submitLabel?: string;
}

export interface PriceEstimateCardComponent {
  type: 'price_estimate_card';
  title?: string;
  serviceName: string;
  items: Array<{
    label: string;
    amount: number;
    isDeduction?: boolean;
  }>;
  totalAmount: number;
  savings?: number;
  guaranteeNotice?: string;
}

export interface ServiceProfessionalItem {
  id: string;
  name: string;
  photoUrl?: string;
  skill: string;
  trade?: string;
  rating: number;
  totalJobs: number;
  experienceYears: number;
  approxDistance: string;
  distanceKm?: number;
  availability: string;
  isAvailable?: boolean;
  estimatedArrival: string;
  etaMinutes?: number;
  relevantService: string;
  phone?: string;
  isVerified: boolean;
  isFastest?: boolean;
  badge?: string;
}

export interface ServiceProfessionalCardComponent {
  type: 'service_professional_card';
  title?: string;
  subtitle?: string;
  serviceCategory?: string;
  serviceName?: string;
  pros?: ServiceProfessionalItem[];
  pro?: ServiceProfessionalItem | {
    id: string;
    name: string;
    photoUrl?: string;
    trade: string;
    rating: number;
    totalJobs: number;
    experienceYears: number;
    distanceKm?: number;
    etaMinutes?: number;
    phone?: string;
    isVerified: boolean;
  };
  selectedProId?: string;
}

export interface BookingManagementItem {
  id: string;
  serviceName: string;
  categoryName?: string;
  displayStatus:
    | 'PENDING'
    | 'ACCEPTED'
    | 'ARRIVING'
    | 'ARRIVED'
    | 'WORK_STARTED'
    | 'WORK_COMPLETED'
    | 'CANCELLED'
    | 'PAYMENT_PENDING'
    | 'PAID';
  rawStatus: string;
  scheduledDate: string;
  scheduledTime: string;
  scheduledDateTime?: string;
  address: string;
  totalAmount: number;
  paymentStatus?: string;
  paymentMethod?: string;
  otp?: string;
  serviceManId?: string;
  serviceManName?: string;
  serviceManPhone?: string;
  serviceManRating?: number;
  serviceManTrade?: string;
  serviceManPhoto?: string;
  etaMinutes?: number;
  approxDistance?: string;
  createdAt?: string;
  canCancel?: boolean;
  canReschedule?: boolean;
  canTrack?: boolean;
  canCall?: boolean;
}

export interface BookingManagementCardComponent {
  type: 'booking_management_card';
  title?: string;
  subtitle?: string;
  filterType?: 'all' | 'today' | 'active' | 'past' | 'cancelled' | 'single';
  bookings: BookingManagementItem[];
  highlightBookingId?: string;
}

export interface BookingCancelCardComponent {
  type: 'booking_cancel_card';
  bookingId: string;
  serviceName: string;
  scheduledDate: string;
  scheduledTime: string;
  reasons: string[];
}

export interface BookingRescheduleCardComponent {
  type: 'booking_reschedule_card';
  bookingId: string;
  serviceName: string;
  currentDate: string;
  currentTime: string;
  availableDates: string[];
  availableSlots: string[];
}

export interface BookingSummaryCardComponent {
  type: 'booking_summary_card';
  bookingId?: string;
  serviceName: string;
  categoryName?: string;
  problem?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  scheduledDateTime?: string;
  address: string;
  totalAmount: number;
  estimatedCharge?: number;
  status: string;
  otp?: string;
  proName?: string;
  proPhone?: string;
  proRating?: number;
  isConfirmationPending?: boolean;
}

export interface PaymentActionCardComponent {
  type: 'payment_action_card';
  amount: number;
  title?: string;
  invoiceId?: string;
  methods?: Array<{
    id: string;
    label: string;
    icon?: string;
    description?: string;
  }>;
  allowCash?: boolean;
}

export interface OtpInputComponent {
  type: 'otp_input';
  title?: string;
  length?: number;
  purpose?: string;
  resendSeconds?: number;
  resendIntervalSeconds?: number;
  phoneNumber?: string;
}

export interface RatingComponent {
  type: 'rating_component';
  title?: string;
  subtitle?: string;
  tags?: string[];
  submitLabel?: string;
}

export interface ProgressIndicatorComponent {
  type: 'progress_indicator';
  title?: string;
  currentStep: number;
  steps: Array<{
    label: string;
    description?: string;
    completed?: boolean;
  }>;
}

export interface WorkServiceTimerCardComponent {
  type: 'work_service_timer_card';
  bookingId: string;
  serviceName: string;
  serviceManName?: string;
  workStartedAt: string;
  workCompletedAt?: string;
  status: string;
  workDurationFormatted?: string;
}

export interface ExtraChargesCardComponent {
  type: 'extra_charges_card';
  bookingId: string;
  customerId?: string;
  serviceName: string;
  serviceManName?: string;
  charges: Array<{
    id: string;
    description: string;
    type?: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    status: 'pending' | 'approved' | 'rejected';
    rejectionReason?: string;
  }>;
  totalApprovedAmount: number;
  totalPendingAmount: number;
  allowApprovalAction?: boolean;
}

export interface ServiceFinalBillCardComponent {
  type: 'service_final_bill_card';
  bookingId: string;
  serviceName: string;
  serviceCategory?: string;
  serviceManName?: string;
  workDurationFormatted?: string;
  workStartedAt?: string;
  workEndedAt?: string;
  baseAmount: number;
  approvedExtraCharges: Array<{ description: string; amount: number; quantity: number }>;
  approvedExtraChargesAmount: number;
  rejectedExtraChargesCount?: number;
  applicableCharges: number;
  discount: number;
  finalAmount: number;
  paymentStatus: string;
  paymentMethod: string;
  generatedAt: string;
}

export interface PaymentBreakdownCardComponent {
  type: 'payment_breakdown_card';
  bookingId: string;
  serviceName: string;
  baseAmount: number;
  approvedExtraChargesAmount: number;
  approvedExtraCharges?: Array<{ description: string; amount: number; quantity: number }>;
  taxesAndFees: number; // Convenience, safety & taxes
  discount: number;
  finalAmount: number;
  paymentStatus: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  isPaid?: boolean;
  paidAt?: string;
  paymentId?: string;
}

export interface PaymentStatusCardComponent {
  type: 'payment_status_card';
  bookingId: string;
  serviceName: string;
  status: 'success' | 'failed' | 'cancelled';
  amount: number;
  paymentId?: string;
  orderId?: string;
  errorMessage?: string;
  paidAt?: string;
}

export interface ComplaintFormComponent {
  type: 'complaint_form';
  bookingId?: string;
  serviceName?: string;
  availableBookings?: Array<{ id: string; serviceName: string; date: string }>;
  issueType?: string;
  availableIssueTypes: Array<{ id: string; label: string; icon?: string }>;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  photos?: string[];
  videoUrl?: string;
  documentUrl?: string;
}

export interface ComplaintSummaryConfirmationComponent {
  type: 'complaint_summary_confirmation';
  ticketId?: string;
  bookingId?: string;
  serviceName?: string;
  issueType: string;
  issueLabel: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  photos?: string[];
  videoUrl?: string;
  documentUrl?: string;
  customerName?: string;
  customerPhone?: string;
}

export interface ComplaintSuccessCardComponent {
  type: 'complaint_success_card';
  ticketId: string;
  bookingId?: string;
  serviceName?: string;
  issueLabel: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  expectedResolution: string;
  supportPhone?: string;
}

export interface DynamicFormComponent {
  type: 'dynamic_form';
  schema: import('./dynamicFormEngine').DynamicFormSchema;
  initialValues?: Record<string, any>;
  submitLabel?: string;
}

export interface LiveBookingSummaryComponent {
  type: 'live_booking_summary';
  context: import('./memoryTypes').StructuredBookingContext;
  missingFields: import('./memoryTypes').RequiredBookingField[];
  attachmentsCount?: number;
}

export interface PersonalizedWelcomeWidgetComponent {
  type: 'personalized_welcome_widget';
  isLoggedIn: boolean;
  userName?: string;
  userPhone?: string;
  bookings?: import('../../types').Booking[];
}

export interface GracefulErrorCardComponent {
  type: 'graceful_error_card';
  error: import('./kaamDostErrorHandler').UserFriendlyError;
}

// ==========================================
// PHASE 15: MULTI-ROLE REGISTRATION COMPONENTS
// ==========================================

export type TargetRegistrationRole =
  | 'customer'
  | 'service_man'
  | 'business_partner'
  | 'brand_promoter'
  | 'franchise_admin';

export interface RoleSelectorOption {
  role: TargetRegistrationRole;
  title: string;
  hindiTitle: string;
  subtitle: string;
  badge: string;
  icon: string;
  benefits: string[];
  earningsHighlight?: string;
  registrationFee?: number;
}

export interface RoleSelectorCardComponent {
  type: 'role_selector_card';
  title?: string;
  description?: string;
  roles: RoleSelectorOption[];
  selectedRole?: TargetRegistrationRole;
}

export interface MediaDocumentUploadCardComponent {
  type: 'media_document_upload_card';
  title: string;
  description?: string;
  targetRole?: TargetRegistrationRole;
  requiredDocType?: string;
  allowedDocTypes?: string[];
  allowCamera?: boolean;
  allowGallery?: boolean;
  allowPdf?: boolean;
  allowAllDocs?: boolean;
  maxFiles?: number;
  uploadedFiles?: Array<{
    name: string;
    docType: string;
    source: 'camera' | 'gallery' | 'pdf' | 'document';
    url?: string;
    size?: string;
  }>;
  submitLabel?: string;
  skipLabel?: string;
  isOptional?: boolean;
}

export interface MultiRoleRegistrationSummaryCardComponent {
  type: 'multi_role_registration_summary_card';
  role: TargetRegistrationRole;
  roleDisplayName: string;
  fullName: string;
  businessName?: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  tradeSkill?: string;
  experienceYears?: number;
  businessType?: string;
  assignedDistrict?: string;
  assignedZone?: string;
  fleetSize?: string;
  marketingChannel?: string;
  preferredPromoCode?: string;
  address?: string;
  city?: string;
  payoutUpiId?: string;
  documents?: Array<{
    name: string;
    docType: string;
    source: 'camera' | 'gallery' | 'pdf' | 'document';
  }>;
  avatarUrl?: string;
  feeAmount?: number;
  walletBonus?: number;
}

export interface RegistrationSuccessCardComponent {
  type: 'registration_success_card';
  role: TargetRegistrationRole;
  roleDisplayName: string;
  userId: string;
  memberCode: string;
  fullName: string;
  phone: string;
  status: 'active' | 'verified' | 'pending_kyc';
  walletBonusCredited?: number;
  assignedTerritory?: string;
  licenseNumber?: string;
  nextSteps: string[];
}

export interface TradeSkillSelectorComponent {
  type: 'trade_skill_selector';
  title?: string;
  description?: string;
  availableTrades: Array<{
    id: string;
    label: string;
    hindiLabel: string;
    icon?: string;
    category?: string;
  }>;
  selectedTrade?: string;
}

// ==========================================
// PHASE 17: ACTION CONFIRMATION LAYER
// ==========================================

export interface ActionConfirmationCardComponent {
  type: 'action_confirmation_card';
  actionType:
    | 'create_booking'
    | 'cancel_booking'
    | 'make_payment'
    | 'approve_extra_charge'
    | 'reject_extra_charge'
    | 'submit_registration'
    | 'update_profile'
    | 'create_complaint';
  title: string;
  summary: string;
  promptQuestion?: string;
  details?: Array<{ label: string; value: string; highlight?: boolean }>;
  amount?: number;
  highlightBadge?: string;
  yesLabel?: string;
  editLabel?: string;
  cancelLabel?: string;
  payload?: any;
}

export type DynamicChatComponent =
  | QuickRepliesComponent
  | OptionsComponent
  | ServiceCardsComponent
  | CategoryCardsComponent
  | DatePickerComponent
  | TimePickerComponent
  | AddressFormComponent
  | LocationSelectorComponent
  | LocationExperienceComponent
  | NumberInputComponent
  | TextInputComponent
  | MultilineTextInputComponent
  | YesNoConfirmationComponent
  | PhotoUploadComponent
  | MultiplePhotoUploadComponent
  | CameraOptionComponent
  | VideoUploadComponent
  | DocumentPdfUploadComponent
  | PriceEstimateCardComponent
  | ServiceProfessionalCardComponent
  | BookingSummaryCardComponent
  | BookingManagementCardComponent
  | BookingCancelCardComponent
  | BookingRescheduleCardComponent
  | WorkServiceTimerCardComponent
  | ExtraChargesCardComponent
  | ServiceFinalBillCardComponent
  | PaymentBreakdownCardComponent
  | PaymentStatusCardComponent
  | ComplaintFormComponent
  | ComplaintSummaryConfirmationComponent
  | ComplaintSuccessCardComponent
  | RoleSelectorCardComponent
  | MediaDocumentUploadCardComponent
  | MultiRoleRegistrationSummaryCardComponent
  | RegistrationSuccessCardComponent
  | TradeSkillSelectorComponent
  | ActionConfirmationCardComponent
  | PaymentActionCardComponent
  | OtpInputComponent
  | RatingComponent
  | ProgressIndicatorComponent
  | DynamicFormComponent
  | LiveBookingSummaryComponent
  | PersonalizedWelcomeWidgetComponent
  | GracefulErrorCardComponent;
