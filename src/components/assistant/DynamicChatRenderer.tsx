import React, { useState, useRef, useEffect } from 'react';
import {
  DynamicChatComponent,
  OptionsComponent,
  ServiceCardsComponent,
  CategoryCardsComponent,
  DatePickerComponent,
  TimePickerComponent,
  AddressFormComponent,
  LocationSelectorComponent,
  NumberInputComponent,
  TextInputComponent,
  MultilineTextInputComponent,
  YesNoConfirmationComponent,
  PhotoUploadComponent,
  MultiplePhotoUploadComponent,
  CameraOptionComponent,
  VideoUploadComponent,
  DocumentPdfUploadComponent,
  PriceEstimateCardComponent,
  ServiceProfessionalCardComponent,
  BookingSummaryCardComponent,
  BookingManagementCardComponent,
  BookingCancelCardComponent,
  BookingRescheduleCardComponent,
  WorkServiceTimerCardComponent,
  ExtraChargesCardComponent,
  ServiceFinalBillCardComponent,
  PaymentBreakdownCardComponent,
  PaymentStatusCardComponent,
  ComplaintFormComponent,
  ComplaintSummaryConfirmationComponent,
  ComplaintSuccessCardComponent,
  RoleSelectorCardComponent,
  MediaDocumentUploadCardComponent,
  MultiRoleRegistrationSummaryCardComponent,
  RegistrationSuccessCardComponent,
  TradeSkillSelectorComponent,
  ActionConfirmationCardComponent,
  PaymentActionCardComponent,
  OtpInputComponent,
  RatingComponent,
  ProgressIndicatorComponent,
  QuickRepliesComponent,
  LocationExperienceComponent,
  DynamicFormComponent,
  LiveBookingSummaryComponent,
  PersonalizedWelcomeWidgetComponent,
  GracefulErrorCardComponent,
} from './componentTypes';
import { DynamicFormRenderer } from './DynamicFormRenderer';
import { LiveBookingSummaryCard } from './LiveBookingSummaryCard';
import { PersonalizedCustomerWelcomeWidget } from './PersonalizedCustomerWelcomeWidget';
import { GracefulErrorCard } from './GracefulErrorCard';
import {
  Calendar,
  Clock,
  MapPin,
  Camera,
  Upload,
  Video,
  FileText,
  Star,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  Check,
  X,
  CreditCard,
  QrCode,
  Banknote,
  ShieldCheck,
  ChevronRight,
  Phone,
  Sparkles,
  ArrowRight,
  Send,
  Navigation,
  Image as ImageIcon,
  Map as MapIcon,
  Compass,
  Crosshair,
  Home,
  Bookmark,
  LocateFixed,
  Building2,
  Briefcase,
  Wrench,
  Megaphone,
  UserCheck,
  FileCheck,
  Zap,
  Hammer,
  Paintbrush,
  Droplets,
  Layers,
  Award,
} from 'lucide-react';
import { BHOPAL_LOCALITIES, calculateHaversineDistanceKm } from '../../services/serviceTrackingService';
import { AssistantLanguage } from './types';

interface DynamicChatRendererProps {
  component: DynamicChatComponent;
  lang: AssistantLanguage;
  onAction: (actionType: string, payload: any, displayText?: string) => void;
  disabled?: boolean;
}

export const DynamicChatRenderer: React.FC<DynamicChatRendererProps> = ({
  component,
  lang,
  onAction,
  disabled = false,
}) => {
  switch (component.type) {
    // 1. QUICK REPLIES
    case 'quick_replies':
      return <QuickRepliesView comp={component} onAction={onAction} disabled={disabled} />;

    // 2. OPTION CARDS
    case 'options':
      return <OptionsView comp={component} onAction={onAction} disabled={disabled} />;

    // 3. SERVICE CARDS
    case 'service_cards':
      return <ServiceCardsView comp={component} onAction={onAction} disabled={disabled} />;

    // 4. CATEGORY CARDS
    case 'category_cards':
      return <CategoryCardsView comp={component} onAction={onAction} disabled={disabled} />;

    // 5. DATE PICKER
    case 'date_picker':
      return <DatePickerView comp={component} lang={lang} onAction={onAction} disabled={disabled} />;

    // 6. TIME PICKER
    case 'time_picker':
      return <TimePickerView comp={component} lang={lang} onAction={onAction} disabled={disabled} />;

    // 7. ADDRESS FORM
    case 'address_form':
      return <AddressFormView comp={component} lang={lang} onAction={onAction} disabled={disabled} />;

    // 8. LOCATION SELECTOR
    case 'location_selector':
      return <LocationSelectorView comp={component} lang={lang} onAction={onAction} disabled={disabled} />;

    // 8B. LOCATION EXPERIENCE (PHASE 9)
    case 'location_experience':
      return <LocationExperienceView comp={component} lang={lang} onAction={onAction} disabled={disabled} />;

    // 9. NUMBER INPUT
    case 'number_input':
      return <NumberInputView comp={component} lang={lang} onAction={onAction} disabled={disabled} />;

    // 10. TEXT INPUT
    case 'text_input':
      return <TextInputView comp={component} lang={lang} onAction={onAction} disabled={disabled} />;

    // 11. MULTILINE TEXT INPUT
    case 'multiline_text_input':
      return <MultilineTextInputView comp={component} lang={lang} onAction={onAction} disabled={disabled} />;

    // 12. YES/NO CONFIRMATION
    case 'yes_no_confirmation':
      return <YesNoConfirmationView comp={component} lang={lang} onAction={onAction} disabled={disabled} />;

    // 13. PHOTO UPLOAD
    case 'photo_upload':
      return <PhotoUploadView comp={component} lang={lang} onAction={onAction} disabled={disabled} />;

    // 14. MULTIPLE PHOTO UPLOAD
    case 'multiple_photo_upload':
      return <MultiplePhotoUploadView comp={component} lang={lang} onAction={onAction} disabled={disabled} />;

    // 15. CAMERA OPTION
    case 'camera_option':
      return <CameraOptionView comp={component} lang={lang} onAction={onAction} disabled={disabled} />;

    // 16. VIDEO UPLOAD
    case 'video_upload':
      return <VideoUploadView comp={component} lang={lang} onAction={onAction} disabled={disabled} />;

    // 17. DOCUMENT / PDF UPLOAD
    case 'document_pdf_upload':
      return <DocumentPdfUploadView comp={component} lang={lang} onAction={onAction} disabled={disabled} />;

    // 18. PRICE / ESTIMATE CARD
    case 'price_estimate_card':
      return <PriceEstimateCardView comp={component} lang={lang} onAction={onAction} disabled={disabled} />;

    // 19. SERVICE PROFESSIONAL CARD
    case 'service_professional_card':
      return <ServiceProfessionalCardView comp={component} lang={lang} onAction={onAction} disabled={disabled} />;

    // 20. BOOKING SUMMARY CARD
    case 'booking_summary_card':
      return <BookingSummaryCardView comp={component} lang={lang} onAction={onAction} disabled={disabled} />;

    // 20B. BOOKING MANAGEMENT LIST / CARD (PHASE 11)
    case 'booking_management_card':
      return <BookingManagementCardView comp={component} lang={lang} onAction={onAction} disabled={disabled} />;

    // 20C. BOOKING CANCEL CARD (PHASE 11)
    case 'booking_cancel_card':
      return <BookingCancelCardView comp={component} lang={lang} onAction={onAction} disabled={disabled} />;

    // 20D. BOOKING RESCHEDULE CARD (PHASE 11)
    case 'booking_reschedule_card':
      return <BookingRescheduleCardView comp={component} lang={lang} onAction={onAction} disabled={disabled} />;

    // 20E. WORK SERVICE TIMER CARD (PHASE 12)
    case 'work_service_timer_card':
      return <WorkServiceTimerCardView comp={component} lang={lang} onAction={onAction} disabled={disabled} />;

    // 20F. EXTRA CHARGES & APPROVAL CARD (PHASE 12)
    case 'extra_charges_card':
      return <ExtraChargesCardView comp={component} lang={lang} onAction={onAction} disabled={disabled} />;

    // 20G. SERVICE FINAL BILL CARD (PHASE 12)
    case 'service_final_bill_card':
      return <ServiceFinalBillCardView comp={component} lang={lang} onAction={onAction} disabled={disabled} />;

    // 20H. PAYMENT BREAKDOWN CARD (PHASE 13)
    case 'payment_breakdown_card':
      return <PaymentBreakdownCardView comp={component} lang={lang} onAction={onAction} disabled={disabled} />;

    // 20I. PAYMENT STATUS CARD (PHASE 13)
    case 'payment_status_card':
      return <PaymentStatusCardView comp={component} lang={lang} onAction={onAction} disabled={disabled} />;

    // 20J. COMPLAINT FORM CARD (PHASE 14)
    case 'complaint_form':
      return <ComplaintFormView comp={component} lang={lang} onAction={onAction} disabled={disabled} />;

    // 20K. COMPLAINT SUMMARY CONFIRMATION (PHASE 14)
    case 'complaint_summary_confirmation':
      return <ComplaintSummaryConfirmationView comp={component} lang={lang} onAction={onAction} disabled={disabled} />;

    // 20L. COMPLAINT SUCCESS CARD (PHASE 14)
    case 'complaint_success_card':
      return <ComplaintSuccessCardView comp={component} lang={lang} onAction={onAction} disabled={disabled} />;

    // 20M. ROLE SELECTOR CARD (PHASE 15)
    case 'role_selector_card':
      return <RoleSelectorCardView comp={component} lang={lang} onAction={onAction} disabled={disabled} />;

    // 20N. MULTI-SOURCE MEDIA & DOCUMENT UPLOAD (PHASE 15)
    case 'media_document_upload_card':
      return <MediaDocumentUploadCardView comp={component} lang={lang} onAction={onAction} disabled={disabled} />;

    // 20O. MULTI-ROLE REGISTRATION SUMMARY REVIEW (PHASE 15)
    case 'multi_role_registration_summary_card':
      return <MultiRoleRegistrationSummaryCardView comp={component} lang={lang} onAction={onAction} disabled={disabled} />;

    // 20P. REGISTRATION SUCCESS CARD (PHASE 15)
    case 'registration_success_card':
      return <RegistrationSuccessCardView comp={component} lang={lang} onAction={onAction} disabled={disabled} />;

    // 20Q. TRADE SKILL SELECTOR (PHASE 15)
    case 'trade_skill_selector':
      return <TradeSkillSelectorView comp={component} lang={lang} onAction={onAction} disabled={disabled} />;

    // 20R. ACTION CONFIRMATION CARD (PHASE 17)
    case 'action_confirmation_card':
      return <ActionConfirmationCardView comp={component} lang={lang} onAction={onAction} disabled={disabled} />;

    // 21. PAYMENT ACTION CARD
    case 'payment_action_card':
      return <PaymentActionCardView comp={component} lang={lang} onAction={onAction} disabled={disabled} />;

    // 22. OTP INPUT
    case 'otp_input':
      return <OtpInputView comp={component} lang={lang} onAction={onAction} disabled={disabled} />;

    // 23. RATING COMPONENT
    case 'rating_component':
      return <RatingComponentView comp={component} lang={lang} onAction={onAction} disabled={disabled} />;

    // 24. PROGRESS INDICATOR
    case 'progress_indicator':
      return <ProgressIndicatorView comp={component} lang={lang} />;

    // 25. DYNAMIC FORM ENGINE (PHASE 21)
    case 'dynamic_form':
      return (
        <DynamicFormRenderer
          schema={(component as DynamicFormComponent).schema}
          initialValues={(component as DynamicFormComponent).initialValues}
          submitLabel={(component as DynamicFormComponent).submitLabel}
          onSubmit={(formValues, summaryText) => {
            onAction('dynamic_form_submitted', formValues, summaryText);
          }}
        />
      );

    // 26. LIVE BOOKING SUMMARY CARD (PHASE 22)
    case 'live_booking_summary':
      return (
        <LiveBookingSummaryCard
          context={(component as LiveBookingSummaryComponent).context}
          missingFields={(component as LiveBookingSummaryComponent).missingFields}
          attachmentsCount={(component as LiveBookingSummaryComponent).attachmentsCount}
          lang={lang}
          isInlineMessageCard={true}
          onEditField={(field) => onAction('edit_booking_details', field, 'विवरण बदलना चाहते हैं')}
          onConfirmBooking={() => onAction('confirm_booking_draft', 'confirm', 'हाँ, बुकिंग कन्फर्म करें')}
        />
      );

    // 27. PERSONALIZED WELCOME WIDGET (PHASE 23)
    case 'personalized_welcome_widget':
      return (
        <PersonalizedCustomerWelcomeWidget
          isLoggedIn={(component as PersonalizedWelcomeWidgetComponent).isLoggedIn}
          userName={(component as PersonalizedWelcomeWidgetComponent).userName}
          userPhone={(component as PersonalizedWelcomeWidgetComponent).userPhone}
          bookings={(component as PersonalizedWelcomeWidgetComponent).bookings}
          lang={lang}
          onSelectAction={(act, payload) => onAction(act, payload)}
        />
      );

    // 28. ROBUST ERROR HANDLING (PHASE 24)
    case 'graceful_error_card':
      return (
        <GracefulErrorCard
          error={(component as GracefulErrorCardComponent).error}
          lang={lang}
          onRetry={(act, payload) => onAction(act || 'retry_last_action', payload)}
        />
      );

    default:
      return null;
  }
};

/* -------------------------------------------------------------
 * 1. QUICK REPLIES VIEW
 * ----------------------------------------------------------- */
const QuickRepliesView: React.FC<{
  comp: QuickRepliesComponent;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, onAction, disabled }) => {
  return (
    <div className="mt-2.5 pt-2 border-t border-stone-100 flex flex-wrap gap-1.5">
      {comp.title && <p className="w-full text-xs font-bold text-stone-700 mb-1">{comp.title}</p>}
      {comp.options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          disabled={disabled}
          onClick={() => onAction('quick_reply', opt.payload || opt.id, opt.label)}
          className="px-3 py-1.5 rounded-full bg-orange-50 hover:bg-orange-500 hover:text-white text-orange-900 border border-orange-200 hover:border-orange-500 text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1 active:scale-95"
        >
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
};

/* -------------------------------------------------------------
 * 2. OPTION CARDS VIEW
 * ----------------------------------------------------------- */
const OptionsView: React.FC<{
  comp: OptionsComponent;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, onAction, disabled }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleSelect = (id: string) => {
    if (disabled) return;
    if (comp.multiSelect) {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
      );
    } else {
      const opt = comp.options.find((o) => o.id === id);
      if (opt) {
        onAction('option_selected', opt, opt.label);
      }
    }
  };

  const handleMultiSubmit = () => {
    if (disabled || selectedIds.length === 0) return;
    const selected = comp.options.filter((o) => selectedIds.includes(o.id));
    const labels = selected.map((s) => s.label).join(', ');
    onAction('options_selected_multi', selected, labels);
  };

  return (
    <div className="mt-3 pt-2.5 border-t border-stone-100">
      <div className="mb-2">
        <h4 className="text-xs font-black text-stone-900">{comp.title}</h4>
        {comp.subtitle && <p className="text-[11px] text-stone-500">{comp.subtitle}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {comp.options.map((opt) => {
          const isSelected = selectedIds.includes(opt.id);
          return (
            <div
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all duration-200 flex items-center justify-between gap-2 select-none active:scale-[0.98] ${
                isSelected
                  ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-200 shadow-sm'
                  : 'bg-white border-stone-200 hover:border-orange-300 hover:bg-orange-50/50'
              } ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-stone-900">{opt.label}</span>
                  {opt.badge && (
                    <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 text-[10px] font-extrabold">
                      {opt.badge}
                    </span>
                  )}
                </div>
                {opt.description && (
                  <p className="text-[11px] text-stone-500 truncate mt-0.5">{opt.description}</p>
                )}
                {typeof opt.price === 'number' && (
                  <p className="text-xs font-black text-orange-600 mt-1">₹{opt.price}</p>
                )}
              </div>

              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                  isSelected ? 'bg-orange-600 border-orange-600 text-white' : 'border-stone-300'
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>
          );
        })}
      </div>

      {comp.multiSelect && (
        <button
          type="button"
          disabled={disabled || selectedIds.length === 0}
          onClick={handleMultiSubmit}
          className="mt-2.5 w-full py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold text-xs rounded-xl shadow hover:brightness-105 active:scale-95 disabled:opacity-40 transition cursor-pointer"
        >
          चयनित विकल्प सुरक्षित करें ({selectedIds.length})
        </button>
      )}
    </div>
  );
};

/* -------------------------------------------------------------
 * 3. SERVICE CARDS VIEW
 * ----------------------------------------------------------- */
const ServiceCardsView: React.FC<{
  comp: ServiceCardsComponent;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, onAction, disabled }) => {
  return (
    <div className="mt-3 pt-2.5 border-t border-stone-100">
      {comp.title && <h4 className="text-xs font-black text-stone-900 mb-2">{comp.title}</h4>}
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        {comp.services.map((srv) => (
          <div
            key={srv.id}
            className="p-3 bg-white rounded-2xl border border-stone-200 hover:border-orange-300 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all"
          >
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              {srv.imageUrl ? (
                <img
                  src={srv.imageUrl}
                  alt={srv.name}
                  className="w-12 h-12 rounded-xl object-cover border border-stone-100 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                  <Sparkles className="w-6 h-6" />
                </div>
              )}
              <div className="min-w-0">
                <h5 className="text-xs font-black text-stone-900 leading-tight">{srv.name}</h5>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-stone-500">
                  <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    {srv.rating || 4.8}
                  </span>
                  {srv.duration && (
                    <>
                      <span>•</span>
                      <span>{srv.duration}</span>
                    </>
                  )}
                </div>
                {srv.inclusions && srv.inclusions.length > 0 && (
                  <p className="text-[10px] text-stone-500 mt-1 line-clamp-1">
                    ✓ {srv.inclusions.slice(0, 2).join(' • ')}
                  </p>
                )}
              </div>
            </div>

            <div className="w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between gap-1.5 border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-100">
              <span className="text-sm font-black text-orange-600">₹{srv.price}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onAction('service_selected', srv, `बुक करें: ${srv.name}`)}
                className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                बुक करें
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 4. CATEGORY CARDS VIEW
 * ----------------------------------------------------------- */
const CategoryCardsView: React.FC<{
  comp: CategoryCardsComponent;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, onAction, disabled }) => {
  return (
    <div className="mt-3 pt-2.5 border-t border-stone-100">
      {comp.title && <h4 className="text-xs font-black text-stone-900 mb-2">{comp.title}</h4>}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {comp.categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            disabled={disabled}
            onClick={() => onAction('category_selected', cat, cat.name)}
            className="p-2.5 bg-white hover:bg-orange-50 border border-stone-200 hover:border-orange-300 rounded-xl text-center flex flex-col items-center justify-center transition active:scale-95 cursor-pointer disabled:opacity-50 group"
          >
            <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-stone-800 line-clamp-1">{cat.name}</span>
            {cat.count && (
              <span className="text-[10px] text-stone-400 mt-0.5">{cat.count}+ सेवाएं</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 5. DATE PICKER VIEW
 * ----------------------------------------------------------- */
const DatePickerView: React.FC<{
  comp: DatePickerComponent;
  lang: AssistantLanguage;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, lang, onAction, disabled }) => {
  const [selectedDate, setSelectedDate] = useState<string>('');

  const quickDates = comp.quickDates || [
    {
      id: 'today',
      label: lang === 'hi' ? 'आज (Today)' : 'Today',
      date: new Date().toISOString().split('T')[0],
    },
    {
      id: 'tomorrow',
      label: lang === 'hi' ? 'कल (Tomorrow)' : 'Tomorrow',
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    },
    {
      id: 'day_after',
      label: lang === 'hi' ? 'परसों' : 'Day After',
      date: new Date(Date.now() + 172800000).toISOString().split('T')[0],
    },
  ];

  const handleSelectQuick = (d: { id: string; label: string; date: string }) => {
    if (disabled) return;
    setSelectedDate(d.date);
    onAction('date_selected', { date: d.date, label: d.label }, `${d.label} (${d.date})`);
  };

  const handleCustomDate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSelectedDate(val);
    if (val) {
      onAction('date_selected', { date: val }, `तारीख: ${val}`);
    }
  };

  return (
    <div className="mt-3 pt-2.5 border-t border-stone-100">
      <h4 className="text-xs font-black text-stone-900 mb-2 flex items-center gap-1.5">
        <Calendar className="w-3.5 h-3.5 text-orange-600" />
        {comp.title || (lang === 'hi' ? 'तारीख चुनें (Select Date)' : 'Select Date')}
      </h4>

      {/* Quick Date Chips */}
      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {quickDates.map((qd) => (
          <button
            key={qd.id}
            type="button"
            disabled={disabled}
            onClick={() => handleSelectQuick(qd)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95 ${
              selectedDate === qqd(qd.date)
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-stone-100 hover:bg-orange-50 text-stone-800 border border-stone-200'
            }`}
          >
            {qd.label}
          </button>
        ))}
      </div>

      {/* HTML Date Input */}
      <div className="flex items-center gap-2">
        <input
          type="date"
          disabled={disabled}
          min={comp.minDate || new Date().toISOString().split('T')[0]}
          max={comp.maxDate}
          value={selectedDate}
          onChange={handleCustomDate}
          className="w-full text-xs font-medium px-3 py-2 bg-white border border-stone-300 rounded-xl focus:border-orange-500 focus:outline-none"
        />
      </div>
    </div>
  );
};
function qqd(d: string) {
  return d;
}

/* -------------------------------------------------------------
 * 6. TIME PICKER VIEW
 * ----------------------------------------------------------- */
const TimePickerView: React.FC<{
  comp: TimePickerComponent;
  lang: AssistantLanguage;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, lang, onAction, disabled }) => {
  const defaultSlots = comp.slots || [
    { id: 'urgent', label: 'तत्काल (Urgent)', timeRange: 'अगले 60 मिनट में', isUrgent: true, badge: 'Express' },
    { id: 'morning', label: 'सुबह', timeRange: '08:00 AM – 11:00 AM' },
    { id: 'afternoon', label: 'दोपहर', timeRange: '12:00 PM – 03:00 PM' },
    { id: 'evening', label: 'शाम', timeRange: '04:00 PM – 07:00 PM' },
  ];

  return (
    <div className="mt-3 pt-2.5 border-t border-stone-100">
      <h4 className="text-xs font-black text-stone-900 mb-2 flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-orange-600" />
        {comp.title || (lang === 'hi' ? 'समय स्लॉट चुनें (Select Time Slot)' : 'Select Time Slot')}
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {defaultSlots.map((slot) => (
          <button
            key={slot.id}
            type="button"
            disabled={disabled}
            onClick={() =>
              onAction('time_selected', slot, `${slot.label}: ${slot.timeRange}`)
            }
            className={`p-2.5 rounded-xl border text-left transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-between gap-2 ${
              slot.isUrgent
                ? 'bg-amber-50 border-amber-300 hover:bg-amber-100'
                : 'bg-white border-stone-200 hover:border-orange-300 hover:bg-orange-50/50'
            }`}
          >
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-stone-900">{slot.label}</span>
                {slot.badge && (
                  <span className="px-1.5 py-0.2 rounded-md bg-amber-200 text-amber-900 text-[10px] font-black uppercase">
                    {slot.badge}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-500 font-medium">{slot.timeRange}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-stone-400" />
          </button>
        ))}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 7. ADDRESS FORM VIEW
 * ----------------------------------------------------------- */
const AddressFormView: React.FC<{
  comp: AddressFormComponent;
  lang: AssistantLanguage;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, lang, onAction, disabled }) => {
  const [house, setHouse] = useState('');
  const [colony, setColony] = useState('');
  const [locality, setLocality] = useState(comp.defaultLocality || 'MP Nagar');
  const [pincode, setPincode] = useState('462011');

  const popularLocalities = comp.localities || [
    'MP Nagar',
    'Arera Colony',
    'Kolar Road',
    'Indrapuri / BHEL',
    'Hoshangabad Road',
    'Ayodhya Bypass',
    'New Market / TT Nagar',
    'Karond',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || !house.trim() || !colony.trim()) return;

    const fullAddress = `${house.trim()}, ${colony.trim()}, ${locality}, Bhopal - ${pincode}`;
    onAction('address_submitted', { house, colony, locality, pincode, fullAddress }, fullAddress);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 pt-2.5 border-t border-stone-100 space-y-2">
      <h4 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
        <MapPin className="w-3.5 h-3.5 text-orange-600" />
        {comp.title || (lang === 'hi' ? 'सेवा का पता दर्ज करें (Address Form)' : 'Enter Service Address')}
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-bold text-stone-600 block mb-0.5">
            मकान / फ्लैट नं. (House / Flat No.)
          </label>
          <input
            type="text"
            required
            disabled={disabled}
            value={house}
            onChange={(e) => setHouse(e.target.value)}
            placeholder="उदा. Flat 204, Block B"
            className="w-full text-xs px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg focus:border-orange-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-stone-600 block mb-0.5">
            कॉलोनी / लैंडमार्क (Colony / Landmark)
          </label>
          <input
            type="text"
            required
            disabled={disabled}
            value={colony}
            onChange={(e) => setColony(e.target.value)}
            placeholder="उदा. Near DB Mall"
            className="w-full text-xs px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg focus:border-orange-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-bold text-stone-600 block mb-0.5">
            भोपाल इलाका (Locality)
          </label>
          <select
            disabled={disabled}
            value={locality}
            onChange={(e) => setLocality(e.target.value)}
            className="w-full text-xs px-2 py-1.5 bg-white border border-stone-300 rounded-lg focus:border-orange-500 focus:outline-none"
          >
            {popularLocalities.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-stone-600 block mb-0.5">
            पिनकोड (Pincode)
          </label>
          <input
            type="text"
            maxLength={6}
            disabled={disabled}
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
            className="w-full text-xs px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg focus:border-orange-500 focus:outline-none"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={disabled || !house.trim() || !colony.trim()}
        className="w-full mt-2 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold text-xs rounded-xl shadow hover:brightness-105 active:scale-95 disabled:opacity-40 transition cursor-pointer"
      >
        {comp.submitLabel || (lang === 'hi' ? 'यह पता सुरक्षित करें' : 'Confirm Address')}
      </button>
    </form>
  );
};

/* -------------------------------------------------------------
 * 8. LOCATION SELECTOR VIEW
 * ----------------------------------------------------------- */
const LocationSelectorView: React.FC<{
  comp: LocationSelectorComponent;
  lang: AssistantLanguage;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, lang, onAction, disabled }) => {
  const localities = comp.popularLocalities || [
    'MP Nagar, Bhopal',
    'Arera Colony, Bhopal',
    'Kolar Road, Bhopal',
    'Indrapuri / BHEL, Bhopal',
    'Hoshangabad Road, Bhopal',
    'Ayodhya Bypass, Bhopal',
    'New Market, Bhopal',
  ];

  const handleUseGps = () => {
    if (disabled) return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(4);
          const lng = pos.coords.longitude.toFixed(4);
          onAction(
            'location_selected',
            { type: 'gps', lat, lng, name: 'Live GPS Location (Bhopal)' },
            `📍 वर्तमान लोकेशन (${lat}, ${lng})`
          );
        },
        () => {
          onAction('location_selected', { name: 'MP Nagar, Bhopal' }, '📍 MP Nagar, Bhopal');
        }
      );
    }
  };

  return (
    <div className="mt-3 pt-2.5 border-t border-stone-100">
      <h4 className="text-xs font-black text-stone-900 mb-2 flex items-center gap-1.5">
        <Navigation className="w-3.5 h-3.5 text-orange-600" />
        {comp.title || (lang === 'hi' ? 'भोपाल में अपना इलाका चुनें' : 'Select Bhopal Locality')}
      </h4>

      {comp.allowCurrentLocation !== false && (
        <button
          type="button"
          disabled={disabled}
          onClick={handleUseGps}
          className="w-full mb-2 p-2 rounded-xl bg-orange-50 border border-orange-200 hover:bg-orange-100 text-orange-900 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition active:scale-98"
        >
          <Navigation className="w-3.5 h-3.5 text-orange-600 animate-pulse" />
          <span>मेरी वर्तमान लोकेशन का उपयोग करें (Use Current GPS)</span>
        </button>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {localities.map((loc) => (
          <button
            key={loc}
            type="button"
            disabled={disabled}
            onClick={() => onAction('location_selected', { name: loc }, loc)}
            className="p-2 text-left bg-white hover:bg-orange-50 border border-stone-200 hover:border-orange-300 rounded-xl text-xs font-medium text-stone-800 transition active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
            <span className="truncate">{loc}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 8B. LOCATION EXPERIENCE VIEW (PHASE 9)
 * ----------------------------------------------------------- */
const MAP_LANDMARKS = [
  { id: 'mp_nagar', name: 'MP Nagar Zone 1 & 2', lat: 23.2332, lng: 77.4343, x: 55, y: 48 },
  { id: 'arera_colony', name: 'Arera Colony (E-Sector)', lat: 23.2125, lng: 77.4332, x: 54, y: 65 },
  { id: 'kolar_road', name: 'Kolar Road', lat: 23.1783, lng: 77.4215, x: 48, y: 82 },
  { id: 'new_market', name: 'New Market / TT Nagar', lat: 23.2384, lng: 77.4019, x: 42, y: 45 },
  { id: 'shahpura', name: 'Shahpura / Manisha Market', lat: 23.1977, lng: 77.4326, x: 56, y: 72 },
  { id: 'indrapuri', name: 'Indrapuri / BHEL', lat: 23.2541, lng: 77.4682, x: 72, y: 38 },
  { id: 'hoshangabad_road', name: 'Hoshangabad Road (Aashima)', lat: 23.1825, lng: 77.4600, x: 70, y: 80 },
  { id: 'ayodhya_bypass', name: 'Ayodhya Bypass', lat: 23.2655, lng: 77.4789, x: 78, y: 28 },
  { id: 'karond', name: 'Karond / Bhopal Junction', lat: 23.3050, lng: 77.4050, x: 44, y: 20 },
];

const LocationExperienceView: React.FC<{
  comp: LocationExperienceComponent;
  lang: AssistantLanguage;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, lang, onAction, disabled }) => {
  const hasSaved = Boolean(comp.savedAddress && comp.savedAddress.fullAddress);
  const [activeTab, setActiveTab] = useState<'options' | 'gps' | 'map' | 'manual' | 'saved'>(
    comp.initialMode || 'options'
  );

  // GPS State
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string>('');
  const [detectedCoords, setDetectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [detectedLocalityName, setDetectedLocalityName] = useState<string>('MP Nagar, Bhopal');
  const [gpsHouseFlat, setGpsHouseFlat] = useState<string>('');
  const [gpsStreet, setGpsStreet] = useState<string>('');
  const [gpsLandmark, setGpsLandmark] = useState<string>('');

  // Map State
  const [selectedPin, setSelectedPin] = useState(MAP_LANDMARKS[0]);
  const [mapHouseFlat, setMapHouseFlat] = useState<string>('');
  const [mapStreet, setMapStreet] = useState<string>('');
  const [mapLandmark, setMapLandmark] = useState<string>('');

  // Manual Form State (All 8 required fields)
  const [houseFlat, setHouseFlat] = useState<string>('');
  const [street, setStreet] = useState<string>('');
  const [area, setArea] = useState<string>(comp.defaultLocality || 'MP Nagar');
  const [city, setCity] = useState<string>('Bhopal');
  const [district, setDistrict] = useState<string>('Bhopal');
  const [stateName, setStateName] = useState<string>('Madhya Pradesh');
  const [pincode, setPincode] = useState<string>('462011');
  const [landmark, setLandmark] = useState<string>('');

  // GPS Geolocation Handler (Never called without explicit user button click)
  const handleRequestGps = () => {
    if (disabled) return;
    setGpsStatus('requesting');
    setGpsErrorMsg('');

    if (!navigator.geolocation) {
      setGpsStatus('denied');
      setGpsErrorMsg('⚠️ आपके ब्राउज़र में GPS सुविधा उपलब्ध नहीं है। कृपया मैन्युअल पता दर्ज करें।');
      setActiveTab('manual');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setDetectedCoords({ lat, lng });

        // Calculate closest Bhopal locality
        let closestName = 'MP Nagar, Bhopal';
        let minDistance = 99999;
        Object.entries(BHOPAL_LOCALITIES).forEach(([name, coords]) => {
          const dist = calculateHaversineDistanceKm(lat, lng, coords.lat, coords.lng);
          if (dist < minDistance) {
            minDistance = dist;
            closestName = name.charAt(0).toUpperCase() + name.slice(1) + ', Bhopal';
          }
        });

        setDetectedLocalityName(closestName);
        setGpsStatus('granted');
      },
      (error) => {
        setGpsStatus('denied');
        if (error.code === 1) {
          setGpsErrorMsg('⚠️ लोकेशन अनुमति अस्वीकृत (Location Permission Denied)। कृपया नीचे दिया गया पता फॉर्म भरें:');
        } else {
          setGpsErrorMsg('⚠️ GPS सिग्नल प्राप्त नहीं हो सका। कृपया नीचे दिए गए फॉर्म में पता दर्ज करें:');
        }
        // Seamlessly switch to manual address on denial
        setActiveTab('manual');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleConfirmGps = () => {
    if (!detectedCoords) return;
    const finalArea = detectedLocalityName;
    const landmarkPart = gpsLandmark.trim() ? `Near ${gpsLandmark.trim()}, ` : '';
    const streetPart = gpsStreet.trim() ? `${gpsStreet.trim()}, ` : '';
    const full = `${gpsHouseFlat ? gpsHouseFlat.trim() + ', ' : ''}${streetPart}${finalArea}, ${landmarkPart}Madhya Pradesh - 462011`;
    onAction(
      'location_selected',
      {
        houseFlat: gpsHouseFlat.trim(),
        street: gpsStreet.trim(),
        area: finalArea,
        city: 'Bhopal',
        district: 'Bhopal',
        state: 'Madhya Pradesh',
        pincode: '462011',
        landmark: gpsLandmark.trim() || 'Current GPS Location',
        latitude: detectedCoords.lat,
        longitude: detectedCoords.lng,
        locationSource: 'gps',
        fullAddress: full,
      },
      `📍 वर्तमान लोकेशन: ${full}`
    );
  };

  const handleConfirmMap = () => {
    const landmarkPart = mapLandmark.trim() ? `Near ${mapLandmark.trim()}, ` : '';
    const streetPart = mapStreet.trim() ? `${mapStreet.trim()}, ` : '';
    const full = `${mapHouseFlat ? mapHouseFlat.trim() + ', ' : ''}${streetPart}${selectedPin.name}, ${landmarkPart}Bhopal, Madhya Pradesh - 462011`;
    onAction(
      'location_selected',
      {
        houseFlat: mapHouseFlat.trim(),
        street: mapStreet.trim(),
        area: selectedPin.name,
        city: 'Bhopal',
        district: 'Bhopal',
        state: 'Madhya Pradesh',
        pincode: '462011',
        landmark: mapLandmark.trim() || selectedPin.name,
        latitude: selectedPin.lat,
        longitude: selectedPin.lng,
        locationSource: 'map',
        fullAddress: full,
      },
      `🗺️ मैप लोकेशन: ${full}`
    );
  };

  const handleConfirmManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!houseFlat.trim() || !street.trim() || !area.trim()) return;

    const landmarkPart = landmark.trim() ? `Near ${landmark.trim()}, ` : '';
    const full = `${houseFlat.trim()}, ${street.trim()}, ${area.trim()}, ${landmarkPart}${city.trim()}, ${district.trim()}, ${stateName.trim()} - ${pincode.trim()}`;

    onAction(
      'location_selected',
      {
        houseFlat: houseFlat.trim(),
        street: street.trim(),
        area: area.trim(),
        city: city.trim(),
        district: district.trim(),
        state: stateName.trim(),
        pincode: pincode.trim(),
        landmark: landmark.trim(),
        locationSource: 'manual',
        fullAddress: full,
      },
      `🏠 पता: ${full}`
    );
  };

  const handleConfirmSaved = () => {
    if (!comp.savedAddress?.fullAddress) return;
    onAction(
      'location_selected',
      {
        ...comp.savedAddress,
        city: comp.savedAddress.city || 'Bhopal',
        district: comp.savedAddress.district || 'Bhopal',
        state: comp.savedAddress.state || 'Madhya Pradesh',
        pincode: comp.savedAddress.pincode || '462011',
        locationSource: 'saved',
        fullAddress: comp.savedAddress.fullAddress,
      },
      `📌 सेव्ड एड्रेस: ${comp.savedAddress.fullAddress}`
    );
  };

  return (
    <div className="mt-3 pt-2.5 border-t border-stone-100 bg-white rounded-2xl border border-stone-200 p-3.5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-100 pb-2 mb-3">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-orange-600" />
          <h4 className="text-xs font-black text-stone-900">
            {comp.title || (lang === 'hi' ? 'सेवा की लोकेशन चुनें' : 'Select Service Location')}
          </h4>
        </div>
        {activeTab !== 'options' && (
          <button
            type="button"
            onClick={() => setActiveTab('options')}
            className="text-[10px] font-bold text-orange-600 hover:text-orange-700 underline cursor-pointer"
          >
            विकल्प बदलें (Options)
          </button>
        )}
      </div>

      {/* Permission Denied Notice Banner */}
      {gpsErrorMsg && (
        <div className="mb-3 p-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{gpsErrorMsg}</p>
          </div>
        </div>
      )}

      {/* 4 MAIN LOCATION OPTIONS MENU */}
      {activeTab === 'options' && (
        <div className="space-y-2">
          {/* Option 1: Current Location */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setActiveTab('gps');
              handleRequestGps();
            }}
            className="w-full p-2.5 rounded-xl border border-orange-200 bg-orange-50/60 hover:bg-orange-100/80 text-left flex items-center justify-between transition active:scale-98 cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center shrink-0">
                <Navigation className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-black text-orange-950 block">📍 Use current location</span>
                <span className="text-[10px] text-stone-500 font-medium">
                  डिवाइस GPS से भोपाल का सटीक इलाका पहचानें
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-orange-400 shrink-0" />
          </button>

          {/* Option 2: Select on Map */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => setActiveTab('map')}
            className="w-full p-2.5 rounded-xl border border-stone-200 hover:border-orange-300 bg-white hover:bg-stone-50 text-left flex items-center justify-between transition active:scale-98 cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
                <MapIcon className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-black text-stone-900 block">🗺️ Select on map</span>
                <span className="text-[10px] text-stone-500 font-medium">
                  भोपाल के प्रमुख लैंडमार्क व मैप पिन से चुनें
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
          </button>

          {/* Option 3: Enter Address Manually */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => setActiveTab('manual')}
            className="w-full p-2.5 rounded-xl border border-stone-200 hover:border-orange-300 bg-white hover:bg-stone-50 text-left flex items-center justify-between transition active:scale-98 cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
                <Home className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-black text-stone-900 block">🏠 Enter address manually</span>
                <span className="text-[10px] text-stone-500 font-medium">
                  मकान, सड़क, इलाका, लैंडमार्क व पिनकोड दर्ज करें
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
          </button>

          {/* Option 4: Saved Address */}
          {hasSaved ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => setActiveTab('saved')}
              className="w-full p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/60 text-left flex items-center justify-between transition active:scale-98 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Bookmark className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <span className="text-xs font-black text-emerald-950 block">📌 Saved address</span>
                  <span className="text-[10px] text-stone-600 font-medium truncate block">
                    {comp.savedAddress?.fullAddress}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-emerald-600 shrink-0" />
            </button>
          ) : (
            <button
              type="button"
              disabled={disabled}
              onClick={() => setActiveTab('manual')}
              className="w-full p-2.5 rounded-xl border border-dashed border-stone-300 bg-stone-50 hover:bg-stone-100 text-left flex items-center justify-between transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-stone-200 text-stone-600 flex items-center justify-center shrink-0">
                  <Bookmark className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black text-stone-700 block">📌 Saved address</span>
                  <span className="text-[10px] text-stone-500 font-medium">
                    (कोई सेव्ड पता उपलब्ध नहीं है — नया पता मैन्युअल भरें)
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
            </button>
          )}
        </div>
      )}

      {/* 1. GPS TAB VIEW */}
      {activeTab === 'gps' && (
        <div className="space-y-3">
          {gpsStatus === 'requesting' && (
            <div className="py-6 text-center space-y-2">
              <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-stone-800">
                GPS सिग्नल प्राप्त किया जा रहा है...
              </p>
              <p className="text-[10px] text-stone-500">
                कृपया ब्राउज़र में लोकेशन अनुमति (Allow) दें
              </p>
            </div>
          )}

          {gpsStatus === 'granted' && detectedCoords && (
            <div className="space-y-2.5">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-black text-emerald-900">लोकेशन प्राप्त हो गई!</span>
                </div>
                <p className="text-xs font-bold text-stone-900">{detectedLocalityName}</p>
                <p className="text-[10px] text-stone-500 font-mono">
                  GPS Coords: {detectedCoords.lat.toFixed(4)}, {detectedCoords.lng.toFixed(4)}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-stone-600 block mb-0.5">
                    मकान / फ्लैट नं. (वैकल्पिक):
                  </label>
                  <input
                    type="text"
                    disabled={disabled}
                    value={gpsHouseFlat}
                    onChange={(e) => setGpsHouseFlat(e.target.value)}
                    placeholder="उदा. Flat 302, Block A"
                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-stone-600 block mb-0.5">
                    सड़क / गली (वैकल्पिक):
                  </label>
                  <input
                    type="text"
                    disabled={disabled}
                    value={gpsStreet}
                    onChange={(e) => setGpsStreet(e.target.value)}
                    placeholder="उदा. Main Road"
                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-stone-600 block mb-0.5">
                  पहचान चिन्ह / लैंडमार्क (वैकल्पिक):
                </label>
                <input
                  type="text"
                  disabled={disabled}
                  value={gpsLandmark}
                  onChange={(e) => setGpsLandmark(e.target.value)}
                  placeholder="उदा. Near Shiv Temple / Park"
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg focus:border-orange-500 focus:outline-none"
                />
              </div>

              <button
                type="button"
                disabled={disabled}
                onClick={handleConfirmGps}
                className="w-full py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold text-xs rounded-xl shadow hover:brightness-105 active:scale-95 transition cursor-pointer"
              >
                इस GPS पते पर पुष्टि करें
              </button>
            </div>
          )}

          {gpsStatus === 'idle' && (
            <div className="text-center py-4 space-y-2">
              <p className="text-xs text-stone-600">
                HARDINKAAM केवल आपकी स्पष्ट सहमति के बाद ही GPS लोकेशन का उपयोग करता है।
              </p>
              <button
                type="button"
                disabled={disabled}
                onClick={handleRequestGps}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow transition active:scale-95 cursor-pointer inline-flex items-center gap-2"
              >
                <Navigation className="w-3.5 h-3.5" />
                📍 GPS अनुमति दें और लोकेशन पहचानें
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. MAP SELECTOR VIEW */}
      {activeTab === 'map' && (
        <div className="space-y-3">
          <p className="text-[11px] text-stone-600 font-medium">
            मैप पर किसी भी स्थान पर क्लिक करके पिन लगाएं या नीचे दिए गए प्रमुख इलाकों में से चुनें:
          </p>

          {/* Interactive Visual Map Preview with dynamic click-to-pin */}
          <div
            onClick={(e) => {
              if (disabled) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = Math.min(Math.max(((e.clientX - rect.left) / rect.width) * 100, 5), 95);
              const clickY = Math.min(Math.max(((e.clientY - rect.top) / rect.height) * 100, 5), 95);

              // Calculate approximate Bhopal coordinates
              const lat = 23.32 - (clickY / 100) * (23.32 - 23.16);
              const lng = 77.35 + (clickX / 100) * (77.50 - 77.35);

              // Find closest landmark for name hint
              let closestLm = MAP_LANDMARKS[0];
              let minD = 9999;
              MAP_LANDMARKS.forEach((lm) => {
                const d = Math.hypot(lm.x - clickX, lm.y - clickY);
                if (d < minD) {
                  minD = d;
                  closestLm = lm;
                }
              });

              setSelectedPin({
                id: 'custom_pin',
                name: `${closestLm.name} (Map Pin)`,
                lat: parseFloat(lat.toFixed(4)),
                lng: parseFloat(lng.toFixed(4)),
                x: Math.round(clickX),
                y: Math.round(clickY),
              });
            }}
            className="relative w-full h-44 bg-gradient-to-br from-emerald-50 via-stone-100 to-amber-50 rounded-xl border border-stone-300 overflow-hidden shadow-inner cursor-crosshair select-none"
            title="मैप पर कहीं भी क्लिक करके पिन सेट करें"
          >
            {/* Visual Lake Element */}
            <div className="absolute top-1/4 left-1/5 w-24 h-14 bg-sky-200/70 rounded-full blur-xs border border-sky-300/50 flex items-center justify-center pointer-events-none">
              <span className="text-[8px] font-bold text-sky-700 tracking-wider">UPPER LAKE</span>
            </div>

            {/* Landmarks as Interactive Pins */}
            {MAP_LANDMARKS.map((lm) => {
              const isSelected = selectedPin.id === lm.id;
              return (
                <button
                  key={lm.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPin(lm);
                  }}
                  style={{ top: `${lm.y}%`, left: `${lm.x}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 transition-transform cursor-pointer ${
                    isSelected ? 'scale-125 z-20' : 'hover:scale-110 z-10'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shadow-md ${
                      isSelected
                        ? 'bg-orange-600 text-white ring-3 ring-orange-200 animate-bounce'
                        : 'bg-white text-stone-700 border border-stone-300'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                </button>
              );
            })}

            {/* If a custom pin was clicked on the map */}
            {selectedPin.id === 'custom_pin' && (
              <div
                style={{ top: `${selectedPin.y}%`, left: `${selectedPin.x}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 scale-125 z-30 pointer-events-none"
              >
                <div className="w-6 h-6 rounded-full bg-red-600 text-white ring-3 ring-red-200 animate-bounce flex items-center justify-center shadow-lg">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
              </div>
            )}
          </div>

          {/* Selected Pin Details */}
          <div className="p-2.5 rounded-xl bg-orange-50/70 border border-orange-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-600">चयनित मैप पिन</span>
              <h5 className="text-xs font-black text-stone-900">{selectedPin.name}</h5>
              <span className="text-[10px] text-stone-500 font-mono">
                GPS: {selectedPin.lat.toFixed(4)}, {selectedPin.lng.toFixed(4)}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 text-[10px] font-black">
              Bhopal
            </span>
          </div>

          {/* Additional address fields for Map selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-stone-600 block mb-0.5">
                मकान / फ्लैट नं. (वैकल्पिक):
              </label>
              <input
                type="text"
                disabled={disabled}
                value={mapHouseFlat}
                onChange={(e) => setMapHouseFlat(e.target.value)}
                placeholder="उदा. H.No 12/B"
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-600 block mb-0.5">
                सड़क / पहचान चिन्ह (वैकल्पिक):
              </label>
              <input
                type="text"
                disabled={disabled}
                value={mapLandmark}
                onChange={(e) => setMapLandmark(e.target.value)}
                placeholder="उदा. Near Main Gate"
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={handleConfirmMap}
            className="w-full py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold text-xs rounded-xl shadow hover:brightness-105 active:scale-95 transition cursor-pointer"
          >
            मैप की यह लोकेशन सुरक्षित करें
          </button>
        </div>
      )}

      {/* 3. ENTER ADDRESS MANUALLY VIEW (ALL 8 FIELDS) */}
      {activeTab === 'manual' && (
        <form onSubmit={handleConfirmManual} className="space-y-2.5">
          {/* Row 1: House/Flat & Street */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-stone-700 block mb-0.5">
                मकान / फ्लैट नं. (House / Flat) *
              </label>
              <input
                type="text"
                required
                disabled={disabled}
                value={houseFlat}
                onChange={(e) => setHouseFlat(e.target.value)}
                placeholder="उदा. Flat 204, Block B"
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-700 block mb-0.5">
                सड़क / गली (Street / Road) *
              </label>
              <input
                type="text"
                required
                disabled={disabled}
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="उदा. Link Road No. 1"
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 2: Area & Landmark */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-stone-700 block mb-0.5">
                इलाका / कॉलोनी (Area / Locality) *
              </label>
              <input
                type="text"
                required
                disabled={disabled}
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="उदा. MP Nagar Zone 2"
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-700 block mb-0.5">
                पहचान चिन्ह (Landmark)
              </label>
              <input
                type="text"
                disabled={disabled}
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="उदा. Near DB City Mall"
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 3: City, District, State, Pincode */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className="text-[10px] font-bold text-stone-700 block mb-0.5">शहर (City)</label>
              <input
                type="text"
                required
                disabled={disabled}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-stone-800 font-medium"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-700 block mb-0.5">ज़िला (District)</label>
              <input
                type="text"
                required
                disabled={disabled}
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-stone-800 font-medium"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-700 block mb-0.5">राज्य (State)</label>
              <input
                type="text"
                required
                disabled={disabled}
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-stone-800 font-medium"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-700 block mb-0.5">पिनकोड (Pincode) *</label>
              <input
                type="text"
                required
                maxLength={6}
                disabled={disabled}
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg focus:border-orange-500 focus:outline-none font-mono font-bold"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={disabled || !houseFlat.trim() || !street.trim() || !area.trim()}
            className="w-full mt-2 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold text-xs rounded-xl shadow hover:brightness-105 active:scale-95 transition disabled:opacity-40 cursor-pointer"
          >
            यह पता सुरक्षित करें (Confirm Address)
          </button>
        </form>
      )}

      {/* 4. SAVED ADDRESS VIEW */}
      {activeTab === 'saved' && hasSaved && (
        <div className="space-y-3">
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
            <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">
              📌 मुख्य प्रोफाइल पता
            </span>
            <p className="text-xs font-bold text-stone-900 mt-1">
              {comp.savedAddress?.fullAddress}
            </p>
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={handleConfirmSaved}
            className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white font-bold text-xs rounded-xl shadow transition active:scale-95 cursor-pointer"
          >
            इस सेव्ड पते पर कारीगर भेजें
          </button>
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------
 * 9. NUMBER INPUT VIEW
 * ----------------------------------------------------------- */
const NumberInputView: React.FC<{
  comp: NumberInputComponent;
  lang: AssistantLanguage;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, lang, onAction, disabled }) => {
  const [val, setVal] = useState(comp.defaultValue || 1);
  const min = comp.min ?? 1;
  const max = comp.max ?? 50;
  const step = comp.step ?? 1;
  const unit = comp.unit || (lang === 'hi' ? 'संख्या' : 'Qty');

  const handleDec = () => setVal((prev) => Math.max(min, prev - step));
  const handleInc = () => setVal((prev) => Math.min(max, prev + step));

  const handleSubmit = () => {
    onAction('number_submitted', { value: val, unit }, `${val} ${unit}`);
  };

  return (
    <div className="mt-3 pt-2.5 border-t border-stone-100">
      <h4 className="text-xs font-black text-stone-900 mb-1">{comp.title || 'मात्रा चुनें (Quantity)'}</h4>
      {comp.description && <p className="text-[11px] text-stone-500 mb-2">{comp.description}</p>}

      <div className="flex items-center gap-3 justify-center py-2 bg-stone-50 rounded-2xl border border-stone-200">
        <button
          type="button"
          disabled={disabled || val <= min}
          onClick={handleDec}
          className="w-8 h-8 rounded-full bg-white border border-stone-300 flex items-center justify-center text-stone-700 hover:bg-stone-100 active:scale-95 cursor-pointer disabled:opacity-30"
        >
          <Minus className="w-4 h-4" />
        </button>

        <span className="text-base font-black text-stone-900 min-w-[60px] text-center">
          {val} <span className="text-xs font-medium text-stone-500">{unit}</span>
        </span>

        <button
          type="button"
          disabled={disabled || val >= max}
          onClick={handleInc}
          className="w-8 h-8 rounded-full bg-white border border-stone-300 flex items-center justify-center text-stone-700 hover:bg-stone-100 active:scale-95 cursor-pointer disabled:opacity-30"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={handleSubmit}
        className="w-full mt-2.5 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold text-xs rounded-xl shadow hover:brightness-105 active:scale-95 cursor-pointer"
      >
        {comp.submitLabel || (lang === 'hi' ? 'कन्फर्म करें' : 'Confirm')}
      </button>
    </div>
  );
};

/* -------------------------------------------------------------
 * 10. TEXT INPUT VIEW
 * ----------------------------------------------------------- */
const TextInputView: React.FC<{
  comp: TextInputComponent;
  lang: AssistantLanguage;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, lang, onAction, disabled }) => {
  const [text, setText] = useState(comp.defaultValue || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onAction('text_submitted', text.trim(), text.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 pt-2.5 border-t border-stone-100">
      {comp.title && <h4 className="text-xs font-black text-stone-900 mb-1">{comp.title}</h4>}
      <div className="flex items-center gap-2">
        <input
          type="text"
          disabled={disabled}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={comp.placeholder || (lang === 'hi' ? 'यहाँ लिखें...' : 'Enter here...')}
          className="flex-1 text-xs px-3 py-2 bg-white border border-stone-300 rounded-xl focus:border-orange-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="px-4 py-2 bg-orange-600 text-white font-bold text-xs rounded-xl hover:bg-orange-700 active:scale-95 disabled:opacity-40 transition cursor-pointer"
        >
          {comp.buttonLabel || (lang === 'hi' ? 'भेजें' : 'Submit')}
        </button>
      </div>
    </form>
  );
};

/* -------------------------------------------------------------
 * 11. MULTILINE TEXT INPUT VIEW
 * ----------------------------------------------------------- */
const MultilineTextInputView: React.FC<{
  comp: MultilineTextInputComponent;
  lang: AssistantLanguage;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, lang, onAction, disabled }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onAction('multiline_submitted', text.trim(), `समस्या का विवरण: ${text.trim()}`);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 pt-2.5 border-t border-stone-100">
      {comp.title && <h4 className="text-xs font-black text-stone-900 mb-1">{comp.title}</h4>}
      <textarea
        rows={comp.rows || 3}
        disabled={disabled}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          comp.placeholder ||
          (lang === 'hi'
            ? 'कृपया समस्या का विवरण दें (उदा: छत का पंखा आवाज कर रहा है और धीमा चल रहा है)...'
            : 'Please describe your requirement or issue in detail...')
        }
        className="w-full text-xs px-3 py-2 bg-white border border-stone-300 rounded-xl focus:border-orange-500 focus:outline-none resize-none"
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="mt-2 w-full py-2 bg-orange-600 text-white font-bold text-xs rounded-xl hover:bg-orange-700 active:scale-95 disabled:opacity-40 transition cursor-pointer"
      >
        {comp.buttonLabel || (lang === 'hi' ? 'विवरण भेजें' : 'Submit Details')}
      </button>
    </form>
  );
};

/* -------------------------------------------------------------
 * 12. YES/NO CONFIRMATION VIEW
 * ----------------------------------------------------------- */
const YesNoConfirmationView: React.FC<{
  comp: YesNoConfirmationComponent;
  lang: AssistantLanguage;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, lang, onAction, disabled }) => {
  return (
    <div className="mt-3 pt-2.5 border-t border-stone-100 bg-amber-50/70 p-3 rounded-2xl border border-amber-200">
      <h4 className="text-xs font-black text-stone-900 mb-1">{comp.title}</h4>
      {comp.description && <p className="text-[11px] text-stone-600 mb-2.5 leading-relaxed">{comp.description}</p>}

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            onAction(
              'yes_no_confirmed',
              { confirmed: true },
              comp.yesLabel || (lang === 'hi' ? 'हाँ, सहमत हूँ' : 'Yes, Confirm')
            )
          }
          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          <Check className="w-3.5 h-3.5" />
          <span>{comp.yesLabel || (lang === 'hi' ? 'हाँ, जारी रखें' : 'Yes, Proceed')}</span>
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            onAction(
              'yes_no_confirmed',
              { confirmed: false },
              comp.noLabel || (lang === 'hi' ? 'नहीं, रद्द करें' : 'No, Cancel')
            )
          }
          className="flex-1 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold text-xs rounded-xl transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          <X className="w-3.5 h-3.5" />
          <span>{comp.noLabel || (lang === 'hi' ? 'नहीं, बाद में' : 'No, Later')}</span>
        </button>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 13. PHOTO UPLOAD VIEW
 * ----------------------------------------------------------- */
const PhotoUploadView: React.FC<{
  comp: PhotoUploadComponent;
  lang: AssistantLanguage;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, lang, onAction, disabled }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadSubmit = () => {
    if (!preview || disabled) return;
    onAction('photo_uploaded', { previewUrl: preview }, '📸 फोटो सफलतापूर्वक अपलोड की गई');
  };

  return (
    <div className="mt-3 pt-2.5 border-t border-stone-100">
      <h4 className="text-xs font-black text-stone-900 mb-1 flex items-center gap-1.5">
        <Camera className="w-3.5 h-3.5 text-orange-600" />
        {comp.title || (lang === 'hi' ? 'फोटो अपलोड करें (Upload Photo)' : 'Upload Photo')}
      </h4>
      {comp.description && <p className="text-[11px] text-stone-500 mb-2">{comp.description}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        disabled={disabled}
        onChange={handleFileChange}
        className="hidden"
      />

      {preview ? (
        <div className="space-y-2">
          <div className="relative rounded-xl overflow-hidden border border-stone-200 max-h-40 flex items-center justify-center bg-stone-900">
            <img src={preview} alt="Upload preview" className="max-h-40 w-auto object-contain" />
            <button
              type="button"
              disabled={disabled}
              onClick={() => setPreview(null)}
              className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-full hover:bg-black/80 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={handleUploadSubmit}
            className="w-full py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 active:scale-95 transition cursor-pointer"
          >
            {comp.submitLabel || (lang === 'hi' ? 'यह फोटो भेजें' : 'Send Photo')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-4 border-2 border-dashed border-stone-300 hover:border-orange-500 rounded-2xl bg-stone-50/50 flex flex-col items-center justify-center gap-1.5 text-stone-600 hover:text-orange-600 transition active:scale-98 cursor-pointer disabled:opacity-50"
        >
          <Upload className="w-5 h-5 text-orange-600" />
          <span className="text-xs font-bold">गैलरी या कैमरे से फोटो चुनें</span>
          <span className="text-[10px] text-stone-400">JPG, PNG (अधिकतम 10MB)</span>
        </button>
      )}
    </div>
  );
};

/* -------------------------------------------------------------
 * 14. MULTIPLE PHOTO UPLOAD VIEW
 * ----------------------------------------------------------- */
const MultiplePhotoUploadView: React.FC<{
  comp: MultiplePhotoUploadComponent;
  lang: AssistantLanguage;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, lang, onAction, disabled }) => {
  const [previews, setPreviews] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const max = comp.maxPhotos || 4;

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, max - previews.length);
    files.forEach((f) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews((prev) => (prev.length < max ? [...prev, reader.result as string] : prev));
      };
      reader.readAsDataURL(f as Blob);
    });
  };

  const removePhoto = (idx: number) => {
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    if (disabled || previews.length === 0) return;
    onAction('multiple_photos_uploaded', { count: previews.length }, `📸 ${previews.length} फोटो अपलोड की गईं`);
  };

  return (
    <div className="mt-3 pt-2.5 border-t border-stone-100">
      <h4 className="text-xs font-black text-stone-900 mb-1 flex items-center gap-1.5">
        <ImageIcon className="w-3.5 h-3.5 text-orange-600" />
        {comp.title || `फोटो अपलोड करें (अधिकतम ${max} फोटो)`}
      </h4>
      {comp.description && <p className="text-[11px] text-stone-500 mb-2">{comp.description}</p>}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*"
        disabled={disabled}
        onChange={handleFiles}
        className="hidden"
      />

      <div className="grid grid-cols-3 gap-2 mb-2">
        {previews.map((p, idx) => (
          <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-stone-200 bg-stone-900">
            <img src={p} alt={`preview ${idx}`} className="w-full h-full object-cover" />
            <button
              type="button"
              disabled={disabled}
              onClick={() => removePhoto(idx)}
              className="absolute top-1 right-1 p-0.5 bg-black/70 text-white rounded-full hover:bg-red-600 transition"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {previews.length < max && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="aspect-square border-2 border-dashed border-stone-300 hover:border-orange-500 rounded-xl bg-stone-50 flex flex-col items-center justify-center text-stone-500 hover:text-orange-600 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="text-[10px] font-bold mt-1">जोड़ें</span>
          </button>
        )}
      </div>

      {previews.length > 0 && (
        <button
          type="button"
          disabled={disabled}
          onClick={handleSubmit}
          className="w-full py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 active:scale-95 transition cursor-pointer"
        >
          {comp.submitLabel || `${previews.length} फोटो भेजें`}
        </button>
      )}
    </div>
  );
};

/* -------------------------------------------------------------
 * 15. CAMERA OPTION VIEW
 * ----------------------------------------------------------- */
const CameraOptionView: React.FC<{
  comp: CameraOptionComponent;
  lang: AssistantLanguage;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, lang, onAction, disabled }) => {
  const camInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onAction('camera_captured', { fileName: file.name }, '📷 फोटो जोड़ी गई');
    }
  };

  return (
    <div className="mt-3 pt-2.5 border-t border-stone-100">
      <h4 className="text-xs font-black text-stone-900 mb-1">{comp.title || 'फोटो जोड़ें (कैमरा या गैलरी)'}</h4>
      {comp.description && <p className="text-[11px] text-stone-500 mb-2">{comp.description}</p>}

      {/* Hidden Camera file input */}
      <input
        ref={camInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        disabled={disabled}
        onChange={handleCapture}
        className="hidden"
      />

      {/* Hidden Gallery file input (STRICTLY NO CAPTURE: Opens device gallery/photo picker) */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        disabled={disabled}
        onChange={handleCapture}
        className="hidden"
      />

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => camInputRef.current?.click()}
          className="py-2.5 px-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-1.5 hover:brightness-105 active:scale-95 transition cursor-pointer"
        >
          <Camera className="w-4 h-4" />
          <span>{comp.captureLabel || 'कैमरा (Live)'}</span>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => galleryInputRef.current?.click()}
          className="py-2.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl border border-stone-200 shadow-xs flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer"
        >
          <Upload className="w-4 h-4 text-stone-600" />
          <span>गैलरी से चुनें</span>
        </button>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 16. VIDEO UPLOAD VIEW
 * ----------------------------------------------------------- */
const VideoUploadView: React.FC<{
  comp: VideoUploadComponent;
  lang: AssistantLanguage;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, lang, onAction, disabled }) => {
  const vidInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
    }
  };

  const handleConfirm = () => {
    if (!fileName || disabled) return;
    onAction('video_uploaded', { fileName }, `🎥 वीडियो क्लिप संलग्न: ${fileName}`);
  };

  return (
    <div className="mt-3 pt-2.5 border-t border-stone-100">
      <h4 className="text-xs font-black text-stone-900 mb-1 flex items-center gap-1.5">
        <Video className="w-3.5 h-3.5 text-orange-600" />
        {comp.title || 'वीडियो क्लिप भेजें (Video Upload)'}
      </h4>
      <p className="text-[11px] text-stone-500 mb-2">
        {comp.description || 'समस्या दिखाने के लिए 10-30 सेकंड का छोटा वीडियो क्लिप जोड़ें।'}
      </p>

      <input
        ref={vidInputRef}
        type="file"
        accept="video/*"
        disabled={disabled}
        onChange={handleVideoChange}
        className="hidden"
      />

      {fileName ? (
        <div className="space-y-2">
          <div className="p-3 bg-stone-100 rounded-xl flex items-center justify-between text-xs">
            <span className="font-bold text-stone-800 truncate">{fileName}</span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setFileName(null)}
              className="text-stone-400 hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={handleConfirm}
            className="w-full py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition cursor-pointer"
          >
            {comp.submitLabel || 'वीडियो भेजें'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => vidInputRef.current?.click()}
          className="w-full py-3 border-2 border-dashed border-stone-300 hover:border-orange-500 rounded-xl bg-stone-50 flex items-center justify-center gap-2 text-xs font-bold text-stone-700 hover:text-orange-600 transition cursor-pointer"
        >
          <Video className="w-4 h-4 text-orange-600" />
          <span>वीडियो फाइल चुनें (अधिकतम 30 सेकंड)</span>
        </button>
      )}
    </div>
  );
};

/* -------------------------------------------------------------
 * 17. DOCUMENT / PDF UPLOAD VIEW
 * ----------------------------------------------------------- */
const DocumentPdfUploadView: React.FC<{
  comp: DocumentPdfUploadComponent;
  lang: AssistantLanguage;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, lang, onAction, disabled }) => {
  const docTypes = comp.docTypes || ['आधार कार्ड (Aadhaar)', 'गुमाश्ता / GST', 'बिजली बिल (Electricity Bill)'];
  const [selectedDocType, setSelectedDocType] = useState(docTypes[0]);
  const [fileAttached, setFileAttached] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileAttached(file.name);
    }
  };

  const handleDocSubmit = () => {
    if (!fileAttached || disabled) return;
    onAction('document_uploaded', { docType: selectedDocType, fileName: fileAttached }, `📄 दस्तावेज: ${selectedDocType} (${fileAttached})`);
  };

  return (
    <div className="mt-3 pt-2.5 border-t border-stone-100">
      <h4 className="text-xs font-black text-stone-900 mb-1 flex items-center gap-1.5">
        <FileText className="w-3.5 h-3.5 text-orange-600" />
        {comp.title || 'दस्तावेज / PDF अपलोड करें'}
      </h4>

      <div className="mb-2">
        <label className="text-[10px] font-bold text-stone-500 block mb-1">दस्तावेज प्रकार</label>
        <select
          disabled={disabled}
          value={selectedDocType}
          onChange={(e) => setSelectedDocType(e.target.value)}
          className="w-full text-xs px-2.5 py-1.5 bg-white border border-stone-300 rounded-xl"
        >
          {docTypes.map((dt) => (
            <option key={dt} value={dt}>
              {dt}
            </option>
          ))}
        </select>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,image/*"
        disabled={disabled}
        onChange={handleDocChange}
        className="hidden"
      />

      {fileAttached ? (
        <div className="space-y-2">
          <div className="p-2.5 bg-stone-100 rounded-xl flex items-center justify-between text-xs">
            <span className="font-bold text-stone-800 truncate">{fileAttached}</span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setFileAttached(null)}
              className="text-stone-400 hover:text-red-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={handleDocSubmit}
            className="w-full py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition cursor-pointer"
          >
            {comp.submitLabel || 'दस्तावेज सुरक्षित करें'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => fileRef.current?.click()}
          className="w-full py-3 border-2 border-dashed border-stone-300 hover:border-orange-500 rounded-xl bg-stone-50 flex items-center justify-center gap-2 text-xs font-bold text-stone-700 hover:text-orange-600 transition cursor-pointer"
        >
          <Upload className="w-4 h-4 text-orange-600" />
          <span>PDF या फोटो चुनें</span>
        </button>
      )}
    </div>
  );
};

/* -------------------------------------------------------------
 * 18. PRICE / ESTIMATE CARD VIEW
 * ----------------------------------------------------------- */
const PriceEstimateCardView: React.FC<{
  comp: PriceEstimateCardComponent;
  lang: AssistantLanguage;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, lang, onAction, disabled }) => {
  return (
    <div className="mt-3 pt-2.5 border-t border-stone-100 bg-white rounded-2xl border border-stone-200 p-3.5 shadow-sm">
      <div className="flex items-center justify-between border-b border-stone-100 pb-2 mb-2">
        <h4 className="text-xs font-black text-stone-900">{comp.title || 'अनुमानित बिल व दर कार्ड'}</h4>
        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
          100% पारदर्शी
        </span>
      </div>

      <p className="text-xs font-bold text-orange-600 mb-2">{comp.serviceName}</p>

      <div className="space-y-1.5 text-xs text-stone-600 mb-3">
        {comp.items.map((it, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <span>{it.label}</span>
            <span className={`font-semibold ${it.isDeduction ? 'text-emerald-600' : 'text-stone-900'}`}>
              {it.isDeduction ? '-' : ''}₹{it.amount}
            </span>
          </div>
        ))}
        <div className="border-t border-stone-200 pt-1.5 flex items-center justify-between font-black text-stone-900 text-sm">
          <span>कुल अनुमानित राशि:</span>
          <span className="text-orange-600">₹{comp.totalAmount}</span>
        </div>
        {comp.savings && (
          <p className="text-[11px] text-emerald-600 font-bold text-right">
            🎉 आपकी बचत: ₹{comp.savings}
          </p>
        )}
      </div>

      <div className="p-2 rounded-xl bg-orange-50/70 border border-orange-200/80 mb-3 flex items-start gap-1.5 text-[11px] text-orange-950">
        <ShieldCheck className="w-3.5 h-3.5 text-orange-600 shrink-0 mt-0.5" />
        <span>{comp.guaranteeNotice || 'काम पूरा होने और पूरी संतुष्टि के बाद ही भुगतान करें। 30 दिन की सर्विस गारंटी शामिल है।'}</span>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onAction('estimate_accepted', comp, `दर कार्ड स्वीकार किया (₹${comp.totalAmount})`)}
        className="w-full py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold text-xs rounded-xl shadow hover:brightness-105 active:scale-95 transition cursor-pointer"
      >
        यह एस्टिमेट स्वीकार करें व आगे बढ़ें
      </button>
    </div>
  );
};

/* -------------------------------------------------------------
 * 19. SERVICE PROFESSIONAL CARD VIEW
 * ----------------------------------------------------------- */
const ServiceProfessionalCardView: React.FC<{
  comp: ServiceProfessionalCardComponent;
  lang: AssistantLanguage;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, lang, onAction, disabled }) => {
  // Support both list of pros (Phase 10) and single pro
  const proList: any[] = comp.pros && comp.pros.length > 0
    ? comp.pros
    : comp.pro
    ? [comp.pro]
    : [];

  if (proList.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 pt-2.5 border-t border-stone-100 bg-white rounded-2xl border border-stone-200 p-3.5 shadow-sm space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-100 pb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-orange-100 text-orange-600 flex items-center justify-center font-black text-xs">
            👨‍🔧
          </div>
          <div>
            <h4 className="text-xs font-black text-stone-900">
              {comp.title || (lang === 'hi' ? 'उपलब्ध योग्य कारीगर (Eligible Service Professionals)' : 'Eligible Service Professionals')}
            </h4>
            {comp.subtitle && (
              <p className="text-[10px] text-stone-500 font-medium">{comp.subtitle}</p>
            )}
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
          {proList.length} उपलब्ध
        </span>
      </div>

      {/* Pro Cards List */}
      <div className="space-y-2.5">
        {proList.map((pro: any) => {
          const isSelected = comp.selectedProId === pro.id;
          const isFastest = Boolean(pro.isFastest);

          return (
            <div
              key={pro.id}
              className={`p-3 rounded-xl border transition-all ${
                isFastest
                  ? 'border-orange-300 bg-orange-50/40 ring-1 ring-orange-200'
                  : 'border-stone-200 bg-stone-50/50 hover:bg-stone-50'
              } ${isSelected ? 'ring-2 ring-orange-500 bg-orange-50/70' : ''}`}
            >
              {/* Fastest Badge */}
              {isFastest && (
                <div className="mb-2 flex items-center gap-1 text-[10px] font-black text-orange-700 bg-orange-100 px-2 py-0.5 rounded-md w-fit">
                  <span className="animate-pulse">⚡</span>
                  {pro.badge || 'सबसे जल्दी उपलब्ध (Fastest Arrival)'}
                </div>
              )}

              <div className="flex items-start gap-3">
                {/* 1. Profile Image */}
                {pro.photoUrl ? (
                  <img
                    src={pro.photoUrl}
                    alt={pro.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-orange-500 shrink-0 shadow-xs"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        pro.name
                      )}&background=f97316&color=fff`;
                    }}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                    {pro.name.charAt(0)}
                  </div>
                )}

                {/* Main Details */}
                <div className="flex-1 min-w-0">
                  {/* Name & Verified Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 truncate">
                      <h5 className="text-xs font-black text-stone-900 truncate">{pro.name}</h5>
                      {pro.isVerified !== false && (
                        <span className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-md shrink-0">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          वेरिफाइड
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Skill & Relevant Service */}
                  <p className="text-[11px] font-semibold text-stone-700 truncate mt-0.5">
                    {pro.skill || pro.trade || 'Senior Professional'}
                  </p>
                  {pro.relevantService && (
                    <p className="text-[10px] text-stone-500 truncate">
                      सर्विस: {pro.relevantService}
                    </p>
                  )}

                  {/* Rating & Experience */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[11px]">
                    <span className="flex items-center gap-0.5 font-black text-amber-600">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      {pro.rating || 4.9}
                    </span>
                    <span className="text-stone-300">•</span>
                    <span className="text-stone-600 font-medium">
                      {pro.experienceYears || 5}+ वर्ष अनुभव
                    </span>
                    <span className="text-stone-300">•</span>
                    <span className="text-stone-600 font-medium">
                      {pro.totalJobs || 50}+ काम पूरे
                    </span>
                  </div>

                  {/* Approx Distance, Availability & Estimated Arrival */}
                  <div className="mt-2 pt-2 border-t border-stone-200/70 grid grid-cols-2 gap-1 text-[10px]">
                    <div className="flex items-center gap-1 text-stone-600 font-medium">
                      <MapPin className="w-3 h-3 text-orange-600 shrink-0" />
                      <span className="truncate">{pro.approxDistance || `${pro.distanceKm || 2.5} किमी दूर`}</span>
                    </div>

                    <div className="flex items-center gap-1 text-emerald-700 font-bold justify-end">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <span className="truncate">{pro.availability || 'उपलब्ध (Online)'}</span>
                    </div>

                    <div className="col-span-2 flex items-center gap-1 text-orange-700 font-bold bg-orange-100/70 px-2 py-1 rounded-md mt-1">
                      <Clock className="w-3 h-3 text-orange-600 shrink-0" />
                      <span>अनुमानित आगमन (ETA): <strong>{pro.estimatedArrival || `${pro.etaMinutes || 30} मिनट में`}</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-2.5 pt-2 border-t border-stone-200/60 flex items-center gap-2">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    onAction(
                      'pro_selected',
                      pro,
                      `कारीगर चुना: ${pro.name} (${pro.skill || pro.trade})`
                    )
                  }
                  className={`flex-1 py-1.5 font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 ${
                    isFastest
                      ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:brightness-105'
                      : 'bg-stone-900 hover:bg-stone-800 text-white'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  {isFastest ? `⚡ ${pro.name} को चुनें (सबसे तेज़)` : `यह कारीगर चुनें (${pro.name})`}
                </button>

                {pro.phone && (
                  <a
                    href={`tel:${pro.phone}`}
                    className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition cursor-pointer flex items-center justify-center"
                    title="फोन पर संपर्क करें"
                  >
                    <Phone className="w-3.5 h-3.5 text-orange-600" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 20. BOOKING SUMMARY CARD VIEW (PHASE 8: PRE-CONFIRMATION & CONFIRMED)
 * ----------------------------------------------------------- */
const BookingSummaryCardView: React.FC<{
  comp: BookingSummaryCardComponent;
  lang: AssistantLanguage;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, lang, onAction, disabled }) => {
  const isPending = comp.isConfirmationPending !== false && !comp.bookingId;
  const displayDate = comp.scheduledDate || comp.scheduledDateTime || 'आज';
  const displayTime = comp.scheduledTime || 'प्रातः स्लॉट';
  const displayProblem = comp.problem || 'सामान्य रिपेयर व मेंटेनेंस';
  const totalCharge = comp.estimatedCharge || comp.totalAmount || 199;

  return (
    <div className="mt-3 pt-2.5 border-t border-stone-100 bg-white rounded-2xl border border-stone-200 p-3.5 shadow-sm">
      <div className="flex items-center justify-between border-b border-stone-100 pb-2 mb-2">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-600">
            {isPending ? '📋 बुकिंग समीक्षा (Review & Confirm)' : '🎉 बुकिंग विवरण'}
          </span>
          <h5 className="text-xs font-black text-stone-900">
            {comp.bookingId ? `ID: ${comp.bookingId}` : comp.serviceName}
          </h5>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
            isPending
              ? 'bg-amber-100 text-amber-900'
              : 'bg-emerald-100 text-emerald-800'
          }`}
        >
          {isPending ? (lang === 'hi' ? 'पुष्टि लंबित' : 'Review') : comp.status || 'Confirmed'}
        </span>
      </div>

      <div className="space-y-1.5 text-xs text-stone-700 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-stone-500 font-medium">Service:</span>
          <span className="font-bold text-stone-900">{comp.serviceName}</span>
        </div>
        <div className="flex items-start justify-between gap-2">
          <span className="text-stone-500 font-medium shrink-0">Problem:</span>
          <span className="font-bold text-orange-700 text-right">{displayProblem}</span>
        </div>
        <div className="flex items-start justify-between gap-2">
          <span className="text-stone-500 font-medium shrink-0">Address:</span>
          <span className="font-medium text-stone-800 text-right truncate max-w-[200px]">
            {comp.address}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-stone-500 font-medium">Date:</span>
          <span className="font-semibold text-stone-800">{displayDate}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-stone-500 font-medium">Time:</span>
          <span className="font-semibold text-stone-800">{displayTime}</span>
        </div>
        {comp.proName && (
          <div className="flex items-center justify-between">
            <span className="text-stone-500 font-medium">Service Pro:</span>
            <span className="font-bold text-stone-900 flex items-center gap-1">
              <span>{comp.proName}</span>
              {comp.proRating && (
                <span className="text-amber-600 font-black text-[11px]">
                  ⭐{comp.proRating}
                </span>
              )}
            </span>
          </div>
        )}
        <div className="border-t border-stone-100 pt-1.5 flex items-center justify-between font-black text-sm">
          <span>Estimated charge:</span>
          <span className="text-orange-600">₹{totalCharge}</span>
        </div>
      </div>

      {isPending ? (
        <>
          <div className="p-2 rounded-xl bg-amber-50 border border-amber-200/80 mb-3 text-[11px] text-amber-900 flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>100% पारदर्शी दर कार्ड। काम पूरा होने व पूरी संतुष्टि के बाद ही भुगतान करें।</span>
          </div>

          {/* Action Buttons: Confirm, Edit, Cancel */}
          <div className="space-y-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                onAction('confirm_booking_final', comp, 'हाँ, बुकिंग कन्फर्म करें (Confirm Booking)')
              }
              className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm Booking</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  onAction('edit_booking_details', comp, 'बुकिंग विवरण बदलना है (Edit Details)')
                }
                className="py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
              >
                <span>Edit Details</span>
              </button>

              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  onAction('cancel_booking_draft', comp, 'बुकिंग रद्द करें (Cancel)')
                }
                className="py-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
              >
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          {comp.otp && (
            <div className="p-2.5 bg-orange-50 rounded-xl border border-orange-200 flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-orange-950">सर्विस स्टार्ट OTP:</span>
              <span className="font-black text-sm text-orange-600 tracking-widest">{comp.otp}</span>
            </div>
          )}

          <button
            type="button"
            disabled={disabled}
            onClick={() => onAction('booking_confirmed', comp, `बुकिंग कन्फर्म: ${comp.bookingId}`)}
            className="w-full py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold text-xs rounded-xl shadow hover:brightness-105 active:scale-95 transition cursor-pointer"
          >
            मेरी बुकिंग्स में देखें
          </button>
        </>
      )}
    </div>
  );
};

/* -------------------------------------------------------------
 * 20B. BOOKING MANAGEMENT CARD VIEW (PHASE 11)
 * ----------------------------------------------------------- */
const STATUS_CONFIG: Record<
  string,
  { labelHi: string; labelEn: string; bg: string; text: string; border: string; icon: string }
> = {
  PENDING: {
    labelHi: 'स्वीकृति लंबित',
    labelEn: 'PENDING',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    icon: '⏳',
  },
  ACCEPTED: {
    labelHi: 'स्वीकृत व असाइन्ड',
    labelEn: 'ACCEPTED',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
    icon: '📋',
  },
  ARRIVING: {
    labelHi: 'रास्ते में है (On the way)',
    labelEn: 'ARRIVING',
    bg: 'bg-orange-50',
    text: 'text-orange-800',
    border: 'border-orange-300',
    icon: '🛵',
  },
  ARRIVED: {
    labelHi: 'पहुँच गए (Arrived)',
    labelEn: 'ARRIVED',
    bg: 'bg-cyan-50',
    text: 'text-cyan-800',
    border: 'border-cyan-200',
    icon: '📍',
  },
  WORK_STARTED: {
    labelHi: 'काम जारी है (In Progress)',
    labelEn: 'WORK STARTED',
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
    icon: '⚡',
  },
  WORK_COMPLETED: {
    labelHi: 'काम पूर्ण (Completed)',
    labelEn: 'WORK COMPLETED',
    bg: 'bg-teal-50',
    text: 'text-teal-800',
    border: 'border-teal-200',
    icon: '✅',
  },
  PAYMENT_PENDING: {
    labelHi: 'भुगतान लंबित',
    labelEn: 'PAYMENT PENDING',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    icon: '💳',
  },
  PAID: {
    labelHi: 'भुगतान पूर्ण (Paid)',
    labelEn: 'PAID',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    icon: '🟢',
  },
  CANCELLED: {
    labelHi: 'रद्द (Cancelled)',
    labelEn: 'CANCELLED',
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
    icon: '❌',
  },
};

const BookingManagementCardView: React.FC<{
  comp: BookingManagementCardComponent;
  lang: AssistantLanguage;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, lang, onAction, disabled }) => {
  const { bookings = [] } = comp;

  if (bookings.length === 0) {
    return (
      <div className="mt-3 pt-2.5 border-t border-stone-100 bg-white rounded-2xl border border-stone-200 p-4 text-center space-y-2">
        <div className="w-10 h-10 rounded-full bg-stone-100 text-stone-500 flex items-center justify-center mx-auto text-lg">
          📋
        </div>
        <h5 className="text-xs font-black text-stone-800">
          {lang === 'hi' ? 'कोई बुकिंग नहीं मिली' : 'No Bookings Found'}
        </h5>
        <p className="text-[11px] text-stone-500">
          {lang === 'hi'
            ? 'आपके खाते में इस श्रेणी में कोई बुकिंग उपलब्ध नहीं है।'
            : 'No matching bookings found in your account.'}
        </p>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAction('navigate_tab', 'services', 'नई सर्विस बुक करें')}
          className="mt-2 px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
        >
          {lang === 'hi' ? '🔧 नई सर्विस बुक करें' : '🔧 Book a Service'}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-2.5 border-t border-stone-100 bg-white rounded-2xl border border-stone-200 p-3.5 shadow-sm space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-100 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">📋</span>
          <div>
            <h4 className="text-xs font-black text-stone-900">
              {comp.title || (lang === 'hi' ? 'मेरी बुकिंग्स (My Bookings)' : 'My Bookings')}
            </h4>
            {comp.subtitle && (
              <p className="text-[10px] text-stone-500 font-medium">{comp.subtitle}</p>
            )}
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
          {bookings.length} {lang === 'hi' ? 'बुकिंग्स' : 'Bookings'}
        </span>
      </div>

      {/* Bookings List */}
      <div className="space-y-3">
        {bookings.map((b) => {
          const statusConf = STATUS_CONFIG[b.displayStatus] || STATUS_CONFIG.PENDING;
          const isArriving = b.displayStatus === 'ARRIVING';

          return (
            <div
              key={b.id}
              className={`p-3 rounded-xl border bg-stone-50/50 hover:bg-stone-50 transition space-y-2.5 ${
                isArriving
                  ? 'border-orange-300 ring-1 ring-orange-200 bg-orange-50/30'
                  : 'border-stone-200'
              }`}
            >
              {/* Header: Service Name & Status Badge */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-bold text-stone-500">
                      #{b.id}
                    </span>
                    {b.categoryName && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-stone-200 text-stone-700">
                        {b.categoryName}
                      </span>
                    )}
                  </div>
                  <h5 className="text-xs font-black text-stone-900 mt-0.5">{b.serviceName}</h5>
                </div>

                {/* Status Badge */}
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-black border shrink-0 flex items-center gap-1 ${
                    statusConf.bg
                  } ${statusConf.text} ${statusConf.border}`}
                >
                  <span>{statusConf.icon}</span>
                  <span>{lang === 'hi' ? statusConf.labelHi : statusConf.labelEn}</span>
                </span>
              </div>

              {/* Schedule, Address & Price Details */}
              <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1 border-t border-stone-200/60">
                <div className="flex items-center gap-1 text-stone-700">
                  <Calendar className="w-3 h-3 text-orange-600 shrink-0" />
                  <span className="truncate">{b.scheduledDate}</span>
                </div>
                <div className="flex items-center gap-1 text-stone-700">
                  <Clock className="w-3 h-3 text-orange-600 shrink-0" />
                  <span className="truncate">{b.scheduledTime}</span>
                </div>
                <div className="col-span-2 flex items-start gap-1 text-stone-600 text-[10px]">
                  <MapPin className="w-3 h-3 text-stone-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-1">{b.address}</span>
                </div>
              </div>

              {/* Pro Details & ETA Banner if Assigned */}
              {b.serviceManName && b.displayStatus !== 'CANCELLED' && (
                <div className="p-2 rounded-lg bg-white border border-stone-200/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-7 h-7 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center shrink-0">
                      {b.serviceManName.charAt(0)}
                    </div>
                    <div className="truncate">
                      <span className="text-[11px] font-black text-stone-900 block truncate">
                        {b.serviceManName}
                      </span>
                      <span className="text-[9px] text-stone-500 block truncate">
                        {b.serviceManTrade || 'वेरिफाइड कारीगर'} • ⭐ {b.serviceManRating || 4.9}
                      </span>
                    </div>
                  </div>

                  {/* ETA or Call Button */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {b.etaMinutes && (
                      <span className="text-[10px] font-extrabold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {b.etaMinutes} min ETA
                      </span>
                    )}
                    {b.serviceManPhone && (
                      <a
                        href={`tel:${b.serviceManPhone}`}
                        className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
                        title="कॉल करें"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* OTP Banner (Active Bookings) */}
              {b.otp && (b.displayStatus === 'ACCEPTED' || b.displayStatus === 'ARRIVING' || b.displayStatus === 'ARRIVED') && (
                <div className="p-2 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-between text-xs">
                  <span className="text-[10px] font-bold text-orange-950">
                    🔒 स्टार्ट कोड (Start OTP):
                  </span>
                  <span className="font-mono font-black text-orange-700 tracking-wider">
                    {b.otp}
                  </span>
                </div>
              )}

              {/* Price & Action Buttons */}
              <div className="pt-2 border-t border-stone-200/70 flex items-center justify-between gap-2">
                <div className="text-[11px]">
                  <span className="text-stone-500">कुल राशि: </span>
                  <span className="font-black text-stone-900">₹{b.totalAmount}</span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {/* Action 1: Reschedule */}
                  {b.canReschedule && (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        onAction(
                          'request_reschedule_booking',
                          b,
                          `बुकिंग #${b.id} का समय बदलें`
                        )
                      }
                      className="px-2.5 py-1 text-[10px] font-bold bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 rounded-lg transition active:scale-95 cursor-pointer"
                    >
                      📅 रीशेड्यूल
                    </button>
                  )}

                  {/* Action 2: Cancel */}
                  {b.canCancel && (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        onAction(
                          'request_cancel_booking',
                          b,
                          `बुकिंग #${b.id} कैंसल करनी है`
                        )
                      }
                      className="px-2.5 py-1 text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition active:scale-95 cursor-pointer"
                    >
                      🚫 कैंसल
                    </button>
                  )}

                  {/* Action 3: Live Tracking */}
                  {b.canTrack && (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        onAction(
                          'track_booking',
                          b,
                          `बुकिंग #${b.id} का लाइव स्टेटस दिखाओ`
                        )
                      }
                      className="px-2.5 py-1 text-[10px] font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition active:scale-95 cursor-pointer"
                    >
                      📍 ट्रैक करें
                    </button>
                  )}

                  {/* Action 4: Reorder (Completed / Cancelled) */}
                  {(b.displayStatus === 'WORK_COMPLETED' || b.displayStatus === 'PAID' || b.displayStatus === 'CANCELLED') && (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        onAction(
                          'reorder_booking',
                          b,
                          `फिर से बुक करें: ${b.serviceName}`
                        )
                      }
                      className="px-2.5 py-1 text-[10px] font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition active:scale-95 cursor-pointer"
                    >
                      🔄 दोबारा बुक करें
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 20C. BOOKING CANCEL CARD VIEW (PHASE 11)
 * ----------------------------------------------------------- */
const BookingCancelCardView: React.FC<{
  comp: BookingCancelCardComponent;
  lang: AssistantLanguage;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, lang, onAction, disabled }) => {
  const [selectedReason, setSelectedReason] = useState<string>(comp.reasons[0] || 'प्लान बदल गया');
  const [customReason, setCustomReason] = useState<string>('');

  const handleConfirmCancel = () => {
    const finalReason = customReason.trim() ? customReason.trim() : selectedReason;
    onAction(
      'cancel_booking_confirmed',
      { bookingId: comp.bookingId, reason: finalReason },
      `बुकिंग #${comp.bookingId} रद्द की गई: ${finalReason}`
    );
  };

  return (
    <div className="mt-3 pt-2.5 border-t border-rose-100 bg-rose-50/40 rounded-2xl border border-rose-200 p-3.5 shadow-sm space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-rose-200/60 pb-2">
        <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm">
          🚫
        </div>
        <div>
          <h4 className="text-xs font-black text-rose-950">
            {lang === 'hi' ? 'बुकिंग रद्दीकरण (Cancel Booking)' : 'Cancel Booking Confirmation'}
          </h4>
          <p className="text-[10px] text-stone-600 font-mono">
            #{comp.bookingId} • {comp.serviceName}
          </p>
        </div>
      </div>

      <p className="text-xs text-stone-700 font-medium">
        {lang === 'hi'
          ? 'क्या आप निश्चित रूप से इस बुकिंग को रद्द करना चाहते हैं? कृपया कारण चुनें:'
          : 'Are you sure you want to cancel this booking? Please select a reason:'}
      </p>

      {/* Reasons Radios */}
      <div className="space-y-1.5">
        {comp.reasons.map((r) => (
          <button
            key={r}
            type="button"
            disabled={disabled}
            onClick={() => setSelectedReason(r)}
            className={`w-full p-2 text-left text-xs font-semibold rounded-xl border transition flex items-center justify-between cursor-pointer ${
              selectedReason === r
                ? 'bg-white border-rose-400 text-rose-900 shadow-xs'
                : 'bg-rose-50/60 border-rose-200 text-stone-700 hover:bg-white'
            }`}
          >
            <span>{r}</span>
            {selectedReason === r && <Check className="w-3.5 h-3.5 text-rose-600" />}
          </button>
        ))}
      </div>

      {/* Buttons */}
      <div className="pt-2 border-t border-rose-200/60 flex items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={handleConfirmCancel}
          className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
        >
          {lang === 'hi' ? '❌ हाँ, बुकिंग रद्द करें' : '❌ Confirm Cancellation'}
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            onAction('dismiss_cancel', null, 'बुकिंग रद्द नहीं करनी (Keep Booking)')
          }
          className="px-3 py-2 bg-white hover:bg-stone-100 text-stone-700 font-bold text-xs rounded-xl border border-stone-300 transition cursor-pointer"
        >
          {lang === 'hi' ? 'वापस जाएँ' : 'Back'}
        </button>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 20D. BOOKING RESCHEDULE CARD VIEW (PHASE 11)
 * ----------------------------------------------------------- */
const BookingRescheduleCardView: React.FC<{
  comp: BookingRescheduleCardComponent;
  lang: AssistantLanguage;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, lang, onAction, disabled }) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    comp.availableDates[1] || 'कल (Tomorrow)'
  );
  const [selectedSlot, setSelectedSlot] = useState<string>(
    comp.availableSlots[0] || '10:00 AM - 12:00 PM'
  );

  const handleConfirmReschedule = () => {
    onAction(
      'reschedule_booking_confirmed',
      {
        bookingId: comp.bookingId,
        newDate: selectedDate,
        newTime: selectedSlot,
      },
      `बुकिंग #${comp.bookingId} का नया समय: ${selectedDate}, ${selectedSlot}`
    );
  };

  return (
    <div className="mt-3 pt-2.5 border-t border-stone-100 bg-white rounded-2xl border border-stone-200 p-3.5 shadow-sm space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
        <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-sm">
          📅
        </div>
        <div>
          <h4 className="text-xs font-black text-stone-900">
            {lang === 'hi' ? 'बुकिंग समय बदलें (Reschedule Booking)' : 'Reschedule Booking'}
          </h4>
          <p className="text-[10px] text-stone-500 font-mono">
            #{comp.bookingId} • {comp.serviceName}
          </p>
        </div>
      </div>

      <div className="p-2 bg-stone-50 rounded-xl border border-stone-200 text-xs">
        <span className="text-[10px] text-stone-500 block">वर्तमान समय (Current Slot):</span>
        <span className="font-bold text-stone-800">
          {comp.currentDate}, {comp.currentTime}
        </span>
      </div>

      {/* Date Options */}
      <div>
        <label className="text-[11px] font-bold text-stone-700 block mb-1">
          {lang === 'hi' ? 'नया दिन चुनें (Select Date):' : 'Select New Date:'}
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {comp.availableDates.map((d) => (
            <button
              key={d}
              type="button"
              disabled={disabled}
              onClick={() => setSelectedDate(d)}
              className={`p-2 text-center text-xs font-bold rounded-xl border transition cursor-pointer ${
                selectedDate === d
                  ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                  : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Slot Options */}
      <div>
        <label className="text-[11px] font-bold text-stone-700 block mb-1">
          {lang === 'hi' ? 'नया समय स्लॉट चुनें (Select Time Slot):' : 'Select Time Slot:'}
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {comp.availableSlots.map((s) => (
            <button
              key={s}
              type="button"
              disabled={disabled}
              onClick={() => setSelectedSlot(s)}
              className={`p-2 text-center text-xs font-bold rounded-xl border transition cursor-pointer ${
                selectedSlot === s
                  ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                  : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div className="pt-2 border-t border-stone-100 flex items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={handleConfirmReschedule}
          className="flex-1 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
        >
          {lang === 'hi' ? '📅 नया समय सुरक्षित करें' : 'Confirm New Schedule'}
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            onAction('dismiss_reschedule', null, 'समय नहीं बदलना (Keep Current Time)')
          }
          className="px-3 py-2 bg-white hover:bg-stone-100 text-stone-700 font-bold text-xs rounded-xl border border-stone-300 transition cursor-pointer"
        >
          {lang === 'hi' ? 'रद्द करें' : 'Cancel'}
        </button>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 20E. WORK SERVICE TIMER CARD VIEW (PHASE 12)
 * ----------------------------------------------------------- */
const WorkServiceTimerCardView: React.FC<{
  comp: WorkServiceTimerCardComponent;
  lang: AssistantLanguage;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, lang, onAction, disabled }) => {
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  useEffect(() => {
    if (!comp.workStartedAt) return;

    const startMs = new Date(comp.workStartedAt).getTime();
    if (isNaN(startMs)) return;

    if (comp.workCompletedAt) {
      const endMs = new Date(comp.workCompletedAt).getTime();
      if (!isNaN(endMs)) {
        setElapsedSeconds(Math.max(0, Math.floor((endMs - startMs) / 1000)));
        return;
      }
    }

    const updateTimer = () => {
      const nowMs = Date.now();
      const diff = Math.max(0, Math.floor((nowMs - startMs) / 1000));
      setElapsedSeconds(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [comp.workStartedAt, comp.workCompletedAt]);

  const hrs = Math.floor(elapsedSeconds / 3600);
  const mins = Math.floor((elapsedSeconds % 3600) / 60);
  const secs = elapsedSeconds % 60;
  const timeFormatted = `${hrs > 0 ? `${hrs.toString().padStart(2, '0')}:` : ''}${mins
    .toString()
    .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  const startTimeStr = comp.workStartedAt
    ? new Date(comp.workStartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'N/A';

  const isCompleted = comp.status === 'completed' || comp.status === 'work_completed';

  return (
    <div className="mt-3 pt-2.5 border-t border-stone-100 bg-white rounded-2xl border border-stone-200 p-3.5 shadow-sm space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-100 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">
            ⏱️
          </div>
          <div>
            <h4 className="text-xs font-black text-stone-900">
              {lang === 'hi' ? 'लाइव वर्क टाइमर (Live Service Timer)' : 'Live Service Timer'}
            </h4>
            <p className="text-[10px] text-stone-500 font-mono">
              #{comp.bookingId} • {comp.serviceName}
            </p>
          </div>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 ${
            isCompleted
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-purple-100 text-purple-800 animate-pulse'
          }`}
        >
          <span>{isCompleted ? '✅' : '⚡'}</span>
          <span>{isCompleted ? 'कार्य पूर्ण' : 'काम जारी'}</span>
        </span>
      </div>

      {/* Timer Display */}
      <div className="p-3 bg-gradient-to-tr from-purple-900 to-indigo-950 text-white rounded-xl text-center shadow-inner">
        <div className="flex items-center justify-center gap-1.5 text-purple-200 text-xs font-semibold mb-1">
          <Clock className="w-3.5 h-3.5" />
          <span>{isCompleted ? 'कुल कार्य अवधि (Total Duration)' : 'कार्य प्रगति समय (Elapsed Time)'}</span>
        </div>
        <div className="text-2xl sm:text-3xl font-mono font-black tracking-widest text-amber-300">
          {timeFormatted}
        </div>
        <div className="text-[10px] text-purple-300 mt-1">
          प्रारंभ समय (Started at): {startTimeStr}
        </div>
      </div>

      {/* Assigned Pro info */}
      {comp.serviceManName && (
        <div className="p-2 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-sm">👨‍🔧</span>
            <div>
              <span className="font-bold text-stone-900">{comp.serviceManName}</span>
              <span className="text-[10px] text-stone-500 block">कार्यस्थल पर कार्यरत (Active on-site)</span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Action Chips */}
      <div className="pt-1 flex items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAction('extra_charge_inquiry', comp, 'एक्स्ट्रा चार्ज क्या है?')}
          className="flex-1 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl transition cursor-pointer text-center"
        >
          🔧 एक्स्ट्रा चार्ज देखें
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAction('final_bill_inquiry', comp, 'फाइनल बिल दिखाओ')}
          className="flex-1 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl transition cursor-pointer text-center"
        >
          🧾 बिल सारांश देखें
        </button>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 20F. EXTRA CHARGES & CUSTOMER APPROVAL CARD VIEW (PHASE 12)
 * ----------------------------------------------------------- */
const ExtraChargesCardView: React.FC<{
  comp: ExtraChargesCardComponent;
  lang: AssistantLanguage;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, lang, onAction, disabled }) => {
  const { charges = [], totalApprovedAmount, totalPendingAmount } = comp;

  if (charges.length === 0) {
    return (
      <div className="mt-3 pt-2.5 border-t border-stone-100 bg-white rounded-2xl border border-stone-200 p-4 text-center space-y-2">
        <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-lg">
          🛡️
        </div>
        <h5 className="text-xs font-black text-stone-900">
          {lang === 'hi' ? 'कोई अतिरिक्त चार्ज नहीं (No Extra Charges)' : 'No Extra Charges'}
        </h5>
        <p className="text-[11px] text-stone-500">
          {lang === 'hi'
            ? 'आपकी बुकिंग में कोई अतिरिक्त सामग्री या सेवा चार्ज प्रस्तावित नहीं है। केवल बेस चार्ज लागू रहेगा।'
            : 'No additional material or service charges proposed. Only base price applies.'}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-2.5 border-t border-stone-100 bg-white rounded-2xl border border-stone-200 p-3.5 shadow-sm space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-100 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
            ⚙️
          </div>
          <div>
            <h4 className="text-xs font-black text-stone-900">
              {lang === 'hi' ? 'अतिरिक्त सामग्री व सेवा चार्ज (Extra Charges)' : 'Extra Charges Breakdown'}
            </h4>
            <p className="text-[10px] text-stone-500 font-mono">
              #{comp.bookingId} • {comp.serviceName}
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
          {charges.length} आइटम
        </span>
      </div>

      {/* Itemized Charges Table / List */}
      <div className="space-y-2">
        {charges.map((c) => {
          const isPending = c.status === 'pending';
          const isApproved = c.status === 'approved';
          const isRejected = c.status === 'rejected';

          return (
            <div
              key={c.id}
              className={`p-2.5 rounded-xl border transition space-y-2 ${
                isPending
                  ? 'border-amber-300 bg-amber-50/50 ring-1 ring-amber-200'
                  : isApproved
                  ? 'border-emerald-200 bg-emerald-50/40'
                  : 'border-rose-200 bg-rose-50/40 opacity-75'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-stone-200/80 text-stone-700">
                      {c.type === 'material' ? 'सामग्री' : 'अतिरिक्त काम'}
                    </span>
                    <h5 className="text-xs font-black text-stone-900 truncate">{c.description}</h5>
                  </div>
                  <p className="text-[11px] text-stone-600 font-medium mt-0.5">
                    मात्रा (Qty): {c.quantity} × ₹{c.unitPrice} / इकाई
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-black text-stone-900 block">₹{c.totalAmount}</span>
                  <span
                    className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded inline-block mt-0.5 ${
                      isPending
                        ? 'bg-amber-200 text-amber-900'
                        : isApproved
                        ? 'bg-emerald-200 text-emerald-900'
                        : 'bg-rose-200 text-rose-900'
                    }`}
                  >
                    {isPending ? '⏳ सहमति लंबित' : isApproved ? '✅ स्वीकृत' : '❌ अस्वीकृत'}
                  </span>
                </div>
              </div>

              {/* Customer Approval / Rejection Actions for Pending Items */}
              {isPending && (
                <div className="pt-2 border-t border-amber-200/80 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      onAction(
                        'approve_extra_charge',
                        { bookingId: comp.bookingId, chargeId: c.id, amount: c.totalAmount, description: c.description },
                        `एक्स्ट्रा चार्ज स्वीकार: ${c.description} (₹${c.totalAmount})`
                      )
                    }
                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve (मंजूरी दें)</span>
                  </button>

                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      onAction(
                        'reject_extra_charge',
                        { bookingId: comp.bookingId, chargeId: c.id, amount: c.totalAmount, description: c.description },
                        `एक्स्ट्रा चार्ज अस्वीकार: ${c.description} (₹${c.totalAmount})`
                      )
                    }
                    className="flex-1 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold text-xs rounded-xl transition active:scale-95 cursor-pointer flex items-center justify-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject (अस्वीकार करें)</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Note & Totals */}
      <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 space-y-1 text-xs">
        <div className="flex items-center justify-between text-stone-700">
          <span>स्वीकृत एक्स्ट्रा चार्ज (Approved):</span>
          <span className="font-bold text-emerald-700">₹{totalApprovedAmount}</span>
        </div>
        {totalPendingAmount > 0 && (
          <div className="flex items-center justify-between text-amber-800">
            <span>लंबित एक्स्ट्रा चार्ज (Pending Approval):</span>
            <span className="font-bold">₹{totalPendingAmount}</span>
          </div>
        )}
        <p className="text-[10px] text-stone-500 pt-1 border-t border-stone-200">
          🔒 <strong>पारदर्शिता नियम:</strong> केवल आपके द्वारा स्वीकृत (Approved) अतिरिक्त चार्ज ही फाइनल बिल में जोड़े जाते हैं।
        </p>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 20G. SERVICE FINAL BILL CARD VIEW (PHASE 12)
 * ----------------------------------------------------------- */
const ServiceFinalBillCardView: React.FC<{
  comp: ServiceFinalBillCardComponent;
  lang: AssistantLanguage;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, lang, onAction, disabled }) => {
  const isPaid = comp.paymentStatus === 'paid';

  return (
    <div className="mt-3 pt-2.5 border-t border-stone-100 bg-white rounded-2xl border border-stone-200 p-4 shadow-sm space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-100 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-sm">
            🧾
          </div>
          <div>
            <h4 className="text-xs font-black text-stone-900">
              {lang === 'hi' ? 'फाइनल सर्विस इनवॉइस (Final Bill)' : 'Final Service Invoice'}
            </h4>
            <p className="text-[10px] text-stone-500 font-mono">#{comp.bookingId}</p>
          </div>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 ${
            isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
          }`}
        >
          <span>{isPaid ? '🟢' : '💳'}</span>
          <span>{isPaid ? 'भुगतान सफल (PAID)' : 'भुगतान लंबित'}</span>
        </span>
      </div>

      {/* Service & Duration Info */}
      <div className="p-2 bg-stone-50 rounded-xl border border-stone-200 text-xs grid grid-cols-2 gap-1">
        <div>
          <span className="text-[10px] text-stone-500 block">सर्विस:</span>
          <span className="font-bold text-stone-900">{comp.serviceName}</span>
        </div>
        <div>
          <span className="text-[10px] text-stone-500 block">कारीगर:</span>
          <span className="font-bold text-stone-900">{comp.serviceManName || 'वेरिफाइड तकनीशियन'}</span>
        </div>
        {comp.workDurationFormatted && (
          <div className="col-span-2 text-[10px] text-purple-700 font-semibold pt-1 border-t border-stone-200/60 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>कुल कार्य समय: {comp.workDurationFormatted}</span>
          </div>
        )}
      </div>

      {/* Itemized Bill Breakdown */}
      <div className="space-y-1.5 text-xs text-stone-700">
        <div className="flex items-center justify-between">
          <span>बेस सर्विस चार्ज (Base Price):</span>
          <span className="font-semibold text-stone-900">₹{comp.baseAmount}</span>
        </div>

        {/* Approved Extra Charges */}
        {comp.approvedExtraCharges && comp.approvedExtraCharges.length > 0 && (
          <div className="py-1 border-y border-stone-100 space-y-1">
            <div className="flex items-center justify-between text-emerald-800 font-semibold">
              <span>स्वीकृत अतिरिक्त सामग्री / सेवा (Approved Extra):</span>
              <span>+₹{comp.approvedExtraChargesAmount}</span>
            </div>
            {comp.approvedExtraCharges.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-[11px] text-stone-500 pl-2">
                <span>• {item.description} ({item.quantity}x)</span>
                <span>₹{item.amount}</span>
              </div>
            ))}
          </div>
        )}

        {/* Unapproved/Rejected note */}
        {comp.rejectedExtraChargesCount && comp.rejectedExtraChargesCount > 0 ? (
          <div className="flex items-center justify-between text-[10px] text-stone-400 italic">
            <span>अस्वीकृत सामग्री ({comp.rejectedExtraChargesCount}x - एक्सक्लूडेड):</span>
            <span>₹0 (छोड़ दिया गया)</span>
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <span>सुरक्षा व सुविधा शुल्क (Platform Fee):</span>
          <span className="font-semibold text-stone-900">₹{comp.applicableCharges}</span>
        </div>

        {comp.discount > 0 && (
          <div className="flex items-center justify-between text-emerald-700 font-semibold">
            <span>विशेष डिस्काउंट (Discount):</span>
            <span>-₹{comp.discount}</span>
          </div>
        )}

        <div className="pt-2 border-t border-stone-300 flex items-center justify-between text-sm">
          <span className="font-black text-stone-900">कुल देय राशि (Total Amount):</span>
          <span className="font-black text-orange-600 text-base">₹{comp.finalAmount}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 border-t border-stone-100 flex items-center gap-2">
        {!isPaid ? (
          <>
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                onAction('pay_online_click', { bookingId: comp.bookingId, amount: comp.finalAmount }, 'ऑनलाइन पेमेंट करना है')
              }
              className="flex-1 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:brightness-105 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Pay Now (₹{comp.finalAmount})</span>
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                onAction('pay_cash_click', { bookingId: comp.bookingId, amount: comp.finalAmount }, 'कैश ऑन सर्विस से दूंगा')
              }
              className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              💵 कैश
            </button>
          </>
        ) : (
          <div className="w-full py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs rounded-xl text-center flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>भुगतान पूर्ण हो चुका है (Payment Settled)</span>
          </div>
        )}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 20H. PAYMENT BREAKDOWN CARD VIEW (PHASE 13)
 * ----------------------------------------------------------- */
const PaymentBreakdownCardView: React.FC<{
  comp: PaymentBreakdownCardComponent;
  lang: AssistantLanguage;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, lang, onAction, disabled }) => {
  const isPaid = comp.isPaid || comp.paymentStatus === 'paid';

  return (
    <div className="mt-3 pt-2.5 border-t border-stone-100 bg-white rounded-2xl border border-stone-200 p-4 shadow-sm space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-100 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
            💳
          </div>
          <div>
            <h4 className="text-xs font-black text-stone-900">
              {lang === 'hi' ? 'बिल भुगतान सारांश (Final Bill)' : 'Payment Breakdown'}
            </h4>
            <p className="text-[10px] text-stone-500 font-mono">
              #{comp.bookingId} • {comp.serviceName}
            </p>
          </div>
        </div>
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 ${
            isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
          }`}
        >
          <span>{isPaid ? '🟢' : '⏳'}</span>
          <span>{isPaid ? 'PAID' : 'देय (DUE)'}</span>
        </span>
      </div>

      {/* Itemized 5-Point Financial Summary */}
      <div className="space-y-2 text-xs bg-stone-50/80 p-3 rounded-xl border border-stone-200/80">
        {/* 1. Base Service Charge */}
        <div className="flex items-center justify-between text-stone-700">
          <span className="font-medium">1. बेस सर्विस चार्ज (Base Service Charge):</span>
          <span className="font-bold text-stone-900">₹{comp.baseAmount}</span>
        </div>

        {/* 2. Approved Extra Charges */}
        <div className="flex items-center justify-between text-stone-700">
          <span className="font-medium">2. स्वीकृत अतिरिक्त चार्ज (Approved Extra):</span>
          <span className="font-bold text-stone-900">₹{comp.approvedExtraChargesAmount}</span>
        </div>
        {comp.approvedExtraCharges && comp.approvedExtraCharges.length > 0 && (
          <div className="pl-3 space-y-0.5 text-[10px] text-stone-500">
            {comp.approvedExtraCharges.map((c, i) => (
              <div key={i} className="flex items-center justify-between">
                <span>• {c.description} ({c.quantity}x)</span>
                <span>₹{c.amount}</span>
              </div>
            ))}
          </div>
        )}

        {/* 3. Taxes / Safety & Platform Fee */}
        <div className="flex items-center justify-between text-stone-700">
          <span className="font-medium">3. सुरक्षा व सुविधा शुल्क / Taxes:</span>
          <span className="font-bold text-stone-900">₹{comp.taxesAndFees}</span>
        </div>

        {/* 4. Discount */}
        {comp.discount > 0 && (
          <div className="flex items-center justify-between text-emerald-700">
            <span className="font-medium">4. विशेष छूट (Discount):</span>
            <span className="font-bold">-₹{comp.discount}</span>
          </div>
        )}

        {/* 5. Final Amount */}
        <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-sm">
          <span className="font-black text-stone-900">5. कुल अंतिम राशि (Final Amount):</span>
          <span className="font-black text-orange-600 text-base">₹{comp.finalAmount}</span>
        </div>
      </div>

      {/* Action / Pay Buttons */}
      <div className="pt-1 flex items-center gap-2">
        {!isPaid ? (
          <>
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                onAction(
                  'start_razorpay_payment',
                  comp,
                  `Pay Now दबाया: ₹${comp.finalAmount} (Razorpay)`
                )
              }
              className="flex-1 py-2.5 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 hover:brightness-105 text-white font-extrabold text-xs rounded-xl shadow-md transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <CreditCard className="w-4 h-4" />
              <span>Pay Now (₹{comp.finalAmount})</span>
            </button>

            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                onAction(
                  'pay_cash_click',
                  { bookingId: comp.bookingId, amount: comp.finalAmount },
                  'कैश ऑन सर्विस से दूंगा'
                )
              }
              className="px-3.5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl border border-stone-300 transition cursor-pointer"
            >
              💵 नकद (Cash)
            </button>
          </>
        ) : (
          <div className="w-full py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs rounded-xl text-center flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>भुगतान पूर्ण हो चुका है • Transaction #{comp.paymentId || 'VERIFIED'}</span>
          </div>
        )}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 20I. PAYMENT STATUS CARD VIEW (PHASE 13: SUCCESS/FAILURE/CANCEL)
 * ----------------------------------------------------------- */
const PaymentStatusCardView: React.FC<{
  comp: PaymentStatusCardComponent;
  lang: AssistantLanguage;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, lang, onAction, disabled }) => {
  const isSuccess = comp.status === 'success';
  const isFailed = comp.status === 'failed';

  if (isSuccess) {
    return (
      <div className="mt-3 pt-2.5 border-t border-emerald-100 bg-emerald-50/50 rounded-2xl border border-emerald-200 p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2 border-b border-emerald-200 pb-2">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-black text-emerald-950">
              {lang === 'hi' ? 'भुगतान सफल! (Payment Successful)' : 'Payment Successful!'}
            </h4>
            <p className="text-[10px] text-emerald-800 font-medium">
              सुरक्षित Razorpay गेटवे द्वारा सत्यापित
            </p>
          </div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-emerald-100 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-stone-500">भुगतान की गई राशि:</span>
            <span className="font-black text-emerald-700 text-sm">₹{comp.amount}</span>
          </div>
          {comp.paymentId && (
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="text-stone-500">Transaction ID:</span>
              <span className="font-bold text-stone-800">{comp.paymentId}</span>
            </div>
          )}
          {comp.orderId && (
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="text-stone-500">Order ID:</span>
              <span className="font-bold text-stone-700">{comp.orderId}</span>
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={() => onAction('navigate_tab', 'bookings', 'मेरी बुकिंग्स में देखें')}
          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer text-center"
        >
          📋 बुकिंग व इनवॉइस देखें
        </button>
      </div>
    );
  }

  if (isFailed) {
    return (
      <div className="mt-3 pt-2.5 border-t border-rose-100 bg-rose-50/50 rounded-2xl border border-rose-200 p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2 border-b border-rose-200 pb-2">
          <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-black text-rose-950">
              {lang === 'hi' ? 'भुगतान असफल रहा (Payment Failed)' : 'Payment Failed'}
            </h4>
            <p className="text-[10px] text-rose-700 font-medium">
              {comp.errorMessage || 'बैंक या गेटवे द्वारा लेनदेन अस्वीकृत किया गया'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onAction('start_razorpay_payment', comp, 'दोबारा भुगतान का प्रयास करें')}
            className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
          >
            🔄 पुनः प्रयास करें (Retry)
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onAction('open_call', 'tel:+916267546945', 'हेल्पलाइन पर बात करें')}
            className="px-3 py-2 bg-white hover:bg-stone-100 text-stone-700 font-bold text-xs rounded-xl border border-stone-300 transition cursor-pointer"
          >
            📞 सहायता
          </button>
        </div>
      </div>
    );
  }

  // Cancelled state
  return (
    <div className="mt-3 pt-2.5 border-t border-stone-200 bg-stone-50 rounded-2xl border border-stone-300 p-3.5 shadow-sm space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm">ℹ️</span>
        <div>
          <h4 className="text-xs font-black text-stone-800">
            {lang === 'hi' ? 'भुगतान विंडो बंद की गई' : 'Payment Window Dismissed'}
          </h4>
          <p className="text-[10px] text-stone-500">
            {lang === 'hi'
              ? 'आपने ऑनलाइन भुगतान विंडो बंद कर दी है। आप नीचे से कभी भी दोबारा भुगतान कर सकते हैं:'
              : 'You closed the payment window. You can resume payment below:'}
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onAction('start_razorpay_payment', comp, 'Pay Now दोबारा खोलें')}
        className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl transition cursor-pointer text-center"
      >
        💳 Pay Now (₹{comp.amount})
      </button>
    </div>
  );
};

/* -------------------------------------------------------------
 * 20J. COMPLAINT FORM VIEW (PHASE 14)
 * ----------------------------------------------------------- */
const ComplaintFormView: React.FC<{
  comp: ComplaintFormComponent;
  lang: AssistantLanguage;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, lang, onAction, disabled }) => {
  const [selectedBookingId, setSelectedBookingId] = useState<string>(comp.bookingId || '');
  const [selectedIssueType, setSelectedIssueType] = useState<string>(
    comp.issueType || comp.availableIssueTypes[0]?.id || 'serviceman_late'
  );
  const [description, setDescription] = useState<string>(comp.description || '');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>(
    comp.priority || 'high'
  );
  const [photos, setPhotos] = useState<string[]>(comp.photos || []);
  const [videoUrl, setVideoUrl] = useState<string | undefined>(comp.videoUrl);
  const [docUrl, setDocUrl] = useState<string | undefined>(comp.documentUrl);

  const filePhotoRef = useRef<HTMLInputElement | null>(null);
  const fileVideoRef = useRef<HTMLInputElement | null>(null);
  const fileDocRef = useRef<HTMLInputElement | null>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPhotos((prev) => [...prev, event.target!.result as string]);
      }
    };
    reader.readAsDataURL(files[0]);
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setVideoUrl(files[0].name);
  };

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setDocUrl(files[0].name);
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    const matchedCategory =
      comp.availableIssueTypes.find((c) => c.id === selectedIssueType) ||
      comp.availableIssueTypes[0];

    const matchedBooking = comp.availableBookings?.find((b) => b.id === selectedBookingId);

    const payload: ComplaintSummaryConfirmationComponent = {
      type: 'complaint_summary_confirmation',
      bookingId: selectedBookingId || comp.bookingId || 'GENERAL',
      serviceName: matchedBooking?.serviceName || comp.serviceName || 'होम सर्विस',
      issueType: selectedIssueType,
      issueLabel: matchedCategory ? matchedCategory.label : 'सहायता अनुरोध',
      description: description.trim() || 'Customer raised complaint via KaamDost Assistant',
      priority,
      photos,
      videoUrl,
      documentUrl: docUrl,
    };

    onAction(
      'review_complaint',
      payload,
      `शिकायत सारांश तैयार: ${payload.issueLabel}`
    );
  };

  return (
    <div className="mt-3 pt-2.5 border-t border-rose-100 bg-white rounded-2xl border border-rose-200 p-4 shadow-sm space-y-3.5">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-stone-100 pb-2.5">
        <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm">
          🛡️
        </div>
        <div>
          <h4 className="text-xs font-black text-stone-900">
            {lang === 'hi' ? 'कस्टमर सपोर्ट व शिकायत फॉर्म' : 'Customer Support & Complaint Form'}
          </h4>
          <p className="text-[10px] text-stone-500 font-medium">
            24x7 त्वरित समाधान • HARDINKAAM गारंटी
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmitReview} className="space-y-3 text-xs">
        {/* 1. Associated Booking Selector (if multiple available) */}
        {comp.availableBookings && comp.availableBookings.length > 0 && (
          <div>
            <label className="text-[11px] font-bold text-stone-700 block mb-1">
              {lang === 'hi' ? '1. संबंधित बुकिंग चुनें (Booking ID):' : '1. Associated Booking:'}
            </label>
            <select
              value={selectedBookingId}
              onChange={(e) => setSelectedBookingId(e.target.value)}
              className="w-full p-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            >
              {comp.availableBookings.map((b) => (
                <option key={b.id} value={b.id}>
                  #{b.id} — {b.serviceName} ({b.date})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 2. Issue Type Selector */}
        <div>
          <label className="text-[11px] font-bold text-stone-700 block mb-1.5">
            {lang === 'hi' ? '2. समस्या का प्रकार (Issue Type):' : '2. Issue Type:'}
          </label>
          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
            {comp.availableIssueTypes.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedIssueType(cat.id)}
                className={`w-full p-2 text-left text-xs font-semibold rounded-xl border transition flex items-center justify-between cursor-pointer ${
                  selectedIssueType === cat.id
                    ? 'bg-rose-50 border-rose-400 text-rose-950 font-bold shadow-xs ring-1 ring-rose-300'
                    : 'bg-stone-50/60 border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span>{cat.icon || '📌'}</span>
                  <span className="truncate">{cat.label}</span>
                </div>
                {selectedIssueType === cat.id && <Check className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Description Input */}
        <div>
          <label className="text-[11px] font-bold text-stone-700 block mb-1">
            {lang === 'hi' ? '3. समस्या का विवरण (Description):' : '3. Description:'}
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              lang === 'hi'
                ? 'कृपया समस्या का संक्षिप्त विवरण यहाँ लिखें (जैसे: सर्विसमैन अभी तक नहीं पहुँचा, पेमेंट कट गया आदि)...'
                : 'Describe what went wrong...'
            }
            className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500 resize-none"
          />
        </div>

        {/* 4. Priority Selector */}
        <div>
          <label className="text-[11px] font-bold text-stone-700 block mb-1">
            {lang === 'hi' ? '4. प्राथमिकता (Priority Level):' : '4. Priority:'}
          </label>
          <div className="grid grid-cols-4 gap-1">
            {[
              { id: 'low', label: '🟢 सामान्य', en: 'Low' },
              { id: 'medium', label: '🟡 मध्यम', en: 'Medium' },
              { id: 'high', label: '🟠 उच्च', en: 'High' },
              { id: 'urgent', label: '🔴 तुरंत', en: 'Urgent' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPriority(p.id as any)}
                className={`py-1.5 text-center text-[10px] font-bold rounded-lg border transition cursor-pointer ${
                  priority === p.id
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* 5. Attachments (Photo, Video, Document) */}
        <div>
          <label className="text-[11px] font-bold text-stone-700 block mb-1">
            {lang === 'hi' ? '5. साक्ष्य / प्रमाण संलग्न करें (Optional Attachments):' : '5. Attachments:'}
          </label>

          <input
            type="file"
            ref={filePhotoRef}
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
          />
          <input
            type="file"
            ref={fileVideoRef}
            accept="video/*"
            className="hidden"
            onChange={handleVideoUpload}
          />
          <input
            type="file"
            ref={fileDocRef}
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={handleDocUpload}
          />

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => filePhotoRef.current?.click()}
              className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-semibold rounded-lg border border-stone-200 transition cursor-pointer flex items-center gap-1"
            >
              <Camera className="w-3 h-3 text-orange-600" />
              <span>📸 फोटो ({photos.length})</span>
            </button>

            <button
              type="button"
              onClick={() => fileVideoRef.current?.click()}
              className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-semibold rounded-lg border border-stone-200 transition cursor-pointer flex items-center gap-1"
            >
              <Video className="w-3 h-3 text-purple-600" />
              <span>🎥 वीडियो {videoUrl ? '✓' : ''}</span>
            </button>

            <button
              type="button"
              onClick={() => fileDocRef.current?.click()}
              className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-semibold rounded-lg border border-stone-200 transition cursor-pointer flex items-center gap-1"
            >
              <FileText className="w-3 h-3 text-blue-600" />
              <span>📄 दस्तावेज {docUrl ? '✓' : ''}</span>
            </button>
          </div>

          {/* Photo Previews */}
          {photos.length > 0 && (
            <div className="flex items-center gap-2 mt-2 overflow-x-auto">
              {photos.map((p, idx) => (
                <img
                  key={idx}
                  src={p}
                  alt="Attachment"
                  className="w-12 h-12 object-cover rounded-lg border border-stone-300"
                />
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={disabled}
          className="w-full py-2.5 bg-gradient-to-r from-rose-600 to-orange-600 hover:brightness-105 text-white font-extrabold text-xs rounded-xl shadow-md transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{lang === 'hi' ? '📋 सारांश देखें व पुष्टि करें (Review Complaint)' : 'Review & Confirm'}</span>
        </button>
      </form>
    </div>
  );
};

/* -------------------------------------------------------------
 * 20K. COMPLAINT SUMMARY CONFIRMATION VIEW (PHASE 14)
 * ----------------------------------------------------------- */
const ComplaintSummaryConfirmationView: React.FC<{
  comp: ComplaintSummaryConfirmationComponent;
  lang: AssistantLanguage;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, lang, onAction, disabled }) => {
  return (
    <div className="mt-3 pt-2.5 border-t border-rose-100 bg-rose-50/40 rounded-2xl border border-rose-200 p-4 shadow-sm space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-rose-200/80 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm">
            📋
          </div>
          <div>
            <h4 className="text-xs font-black text-rose-950">
              {lang === 'hi' ? 'शिकायत समीक्षा व पुष्टि' : 'Complaint Summary & Confirmation'}
            </h4>
            <p className="text-[10px] text-stone-500 font-mono">
              #{comp.bookingId} • {comp.serviceName}
            </p>
          </div>
        </div>
        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-200 text-rose-900">
          {comp.priority.toUpperCase()}
        </span>
      </div>

      {/* Itemized Summary */}
      <div className="p-3 bg-white rounded-xl border border-rose-100 space-y-2 text-xs text-stone-800">
        <div>
          <span className="text-[10px] text-stone-500 block">समस्या श्रेणी (Issue Category):</span>
          <span className="font-bold text-rose-900">{comp.issueLabel}</span>
        </div>

        <div>
          <span className="text-[10px] text-stone-500 block">समस्या विवरण (Description):</span>
          <p className="text-[11px] text-stone-700 font-medium bg-stone-50 p-2 rounded-lg border border-stone-200">
            {comp.description}
          </p>
        </div>

        {((comp.photos && comp.photos.length > 0) || comp.videoUrl || comp.documentUrl) && (
          <div>
            <span className="text-[10px] text-stone-500 block mb-1">संलग्न साक्ष्य (Attachments):</span>
            <div className="flex items-center gap-2 text-[10px] font-bold text-stone-600">
              {comp.photos && comp.photos.length > 0 && <span>📸 {comp.photos.length} फोटो</span>}
              {comp.videoUrl && <span>🎥 वीडियो ({comp.videoUrl})</span>}
              {comp.documentUrl && <span>📄 दस्तावेज ({comp.documentUrl})</span>}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="pt-1 flex items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            onAction(
              'submit_complaint_final',
              comp,
              `हाँ, शिकायत दर्ज करें: ${comp.issueLabel}`
            )
          }
          className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{lang === 'hi' ? '✅ हाँ, शिकायत दर्ज करें' : 'Confirm & Submit'}</span>
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            onAction(
              'edit_complaint_form',
              comp,
              'शिकायत में बदलाव करें'
            )
          }
          className="px-3 py-2 bg-white hover:bg-stone-100 text-stone-700 font-bold text-xs rounded-xl border border-stone-300 transition cursor-pointer"
        >
          ✏️ बदलें
        </button>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 20L. COMPLAINT SUCCESS CARD VIEW (PHASE 14)
 * ----------------------------------------------------------- */
const ComplaintSuccessCardView: React.FC<{
  comp: ComplaintSuccessCardComponent;
  lang: AssistantLanguage;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, lang, onAction, disabled }) => {
  return (
    <div className="mt-3 pt-2.5 border-t border-emerald-100 bg-emerald-50/50 rounded-2xl border border-emerald-200 p-4 shadow-sm space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-emerald-200 pb-2">
        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-black text-emerald-950">
            {lang === 'hi' ? 'शिकायत सफलतापूर्वक दर्ज (Ticket Raised)' : 'Complaint Submitted!'}
          </h4>
          <p className="text-[10px] text-emerald-800 font-mono">
            Ticket #{comp.ticketId}
          </p>
        </div>
      </div>

      {/* Details Box */}
      <div className="p-3 bg-white rounded-xl border border-emerald-100 space-y-1.5 text-xs text-stone-800">
        <div className="flex items-center justify-between">
          <span className="text-stone-500">समस्या:</span>
          <span className="font-bold text-stone-900">{comp.issueLabel}</span>
        </div>
        {comp.bookingId && (
          <div className="flex items-center justify-between font-mono text-[11px]">
            <span className="text-stone-500">संबंधित बुकिंग:</span>
            <span className="font-bold text-stone-800">#{comp.bookingId}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-stone-100">
          <span className="text-stone-500">समाधान समय:</span>
          <span className="font-extrabold text-orange-600">{comp.expectedResolution}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-1 flex items-center gap-2">
        <a
          href="tel:+916267546945"
          className="flex-1 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:brightness-105 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Phone className="w-3.5 h-3.5" />
          <span>24x7 सपोर्ट कॉल करें</span>
        </a>

        <button
          type="button"
          disabled={disabled}
          onClick={() => onAction('navigate_tab', 'bookings', 'मेरी बुकिंग्स में देखें')}
          className="px-3 py-2 bg-white hover:bg-stone-100 text-stone-700 font-bold text-xs rounded-xl border border-stone-300 transition cursor-pointer"
        >
          📋 बुकिंग्स
        </button>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 21. PAYMENT ACTION CARD VIEW
 * ----------------------------------------------------------- */
const PaymentActionCardView: React.FC<{
  comp: PaymentActionCardComponent;
  lang: AssistantLanguage;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, lang, onAction, disabled }) => {
  const methods = comp.methods || [
    { id: 'upi', label: 'UPI / QR कोड (GPay, PhonePe, Paytm)', icon: 'QrCode' },
    { id: 'cash', label: 'कैश ऑन सर्विस (Cash After Service)', icon: 'Banknote' },
    { id: 'card', label: 'क्रेडिट / डेबिट कार्ड / नेटबैंकिंग', icon: 'CreditCard' },
  ];

  return (
    <div className="mt-3 pt-2.5 border-t border-stone-100 bg-white rounded-2xl border border-stone-200 p-3.5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-black text-stone-900">{comp.title || 'भुगतान का तरीका चुनें'}</h4>
        <span className="text-sm font-black text-orange-600">₹{comp.amount}</span>
      </div>

      <div className="space-y-2 mb-3">
        {methods.map((m) => (
          <button
            key={m.id}
            type="button"
            disabled={disabled}
            onClick={() => onAction('payment_selected', { method: m.id, amount: comp.amount }, `चुना: ${m.label}`)}
            className="w-full p-2.5 bg-stone-50 hover:bg-orange-50 border border-stone-200 hover:border-orange-300 rounded-xl text-left flex items-center justify-between text-xs font-bold text-stone-800 transition active:scale-98 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-orange-600" />
              <span>{m.label}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-stone-400" />
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 bg-emerald-50 p-2 rounded-xl border border-emerald-200">
        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
        <span>100% सुरक्षित भुगतान • GST इनवॉइस तुरंत प्राप्त होगा</span>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 22. OTP INPUT VIEW
 * ----------------------------------------------------------- */
const OtpInputView: React.FC<{
  comp: OtpInputComponent;
  lang: AssistantLanguage;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, lang, onAction, disabled }) => {
  const length = comp.length || 4;
  const [otp, setOtp] = useState<string[]>(Array(length).fill(''));

  const handleChange = (val: string, idx: number) => {
    if (!/^\d*$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[idx] = val.slice(-1);
    setOtp(newOtp);

    // Auto move to next box
    if (val && idx < length - 1) {
      const nextInput = document.getElementById(`otp-box-${idx + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      const prevInput = document.getElementById(`otp-box-${idx - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerify = () => {
    const full = otp.join('');
    if (full.length === length && !disabled) {
      onAction('otp_verified', { otp: full }, `OTP दर्ज किया: ${full}`);
    }
  };

  return (
    <div className="mt-3 pt-2.5 border-t border-stone-100">
      <h4 className="text-xs font-black text-stone-900 mb-1">{comp.title || 'OTP सत्यापन (Enter OTP)'}</h4>
      <p className="text-[11px] text-stone-500 mb-2">
        कृपया अपने मोबाइल पर प्राप्त {length}-अंकीय OTP यहाँ दर्ज करें।
      </p>

      <div className="flex items-center justify-center gap-2 mb-3">
        {otp.map((digit, idx) => (
          <input
            key={idx}
            id={`otp-box-${idx}`}
            type="text"
            inputMode="numeric"
            maxLength={1}
            disabled={disabled}
            value={digit}
            onChange={(e) => handleChange(e.target.value, idx)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className="w-10 h-11 text-center font-black text-lg bg-white border border-stone-300 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none"
          />
        ))}
      </div>

      <button
        type="button"
        disabled={disabled || otp.join('').length < length}
        onClick={handleVerify}
        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition active:scale-95 disabled:opacity-40 cursor-pointer"
      >
        सत्यापित करें (Verify OTP)
      </button>
    </div>
  );
};

/* -------------------------------------------------------------
 * 23. RATING COMPONENT VIEW
 * ----------------------------------------------------------- */
const RatingComponentView: React.FC<{
  comp: RatingComponent;
  lang: AssistantLanguage;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, lang, onAction, disabled }) => {
  const [stars, setStars] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');

  const defaultTags = comp.tags || [
    'समय पर पहुंचे',
    'संतुष्टिजनक काम',
    'साफ-सफाई रखी',
    'उचित दर',
    'अनुभवी कारीगर',
  ];

  const toggleTag = (t: string) => {
    setSelectedTags((prev) => (prev.includes(t) ? prev.filter((i) => i !== t) : [...prev, t]));
  };

  const handleSubmit = () => {
    if (disabled) return;
    onAction(
      'rating_submitted',
      { stars, tags: selectedTags, comment },
      `⭐ ${stars}-स्टार रेटिंग दी गई (${selectedTags.join(', ') || 'उत्कृष्ट सेवा'})`
    );
  };

  return (
    <div className="mt-3 pt-2.5 border-t border-stone-100 bg-white rounded-2xl border border-stone-200 p-3.5 shadow-sm text-center">
      <h4 className="text-xs font-black text-stone-900">{comp.title || 'काम कैसा रहा? रेटिंग दें'}</h4>
      {comp.subtitle && <p className="text-[11px] text-stone-500 mt-0.5">{comp.subtitle}</p>}

      {/* Star Row */}
      <div className="flex items-center justify-center gap-1.5 my-3">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => setStars(s)}
            className="p-1 text-stone-300 hover:scale-125 transition-transform cursor-pointer"
          >
            <Star
              className={`w-7 h-7 ${
                s <= stars ? 'fill-amber-400 text-amber-400' : 'text-stone-300'
              }`}
            />
          </button>
        ))}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 justify-center mb-3">
        {defaultTags.map((tag) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              disabled={disabled}
              onClick={() => toggleTag(tag)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer ${
                isSelected
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>

      <textarea
        rows={2}
        disabled={disabled}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="कोई सुझाव या अतिरिक्त टिप्पणी (वैकल्पिक)..."
        className="w-full text-xs px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-xl mb-2.5 focus:border-orange-500 focus:outline-none resize-none"
      />

      <button
        type="button"
        disabled={disabled}
        onClick={handleSubmit}
        className="w-full py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold text-xs rounded-xl shadow hover:brightness-105 active:scale-95 transition cursor-pointer"
      >
        {comp.submitLabel || 'रेटिंग सबमिट करें'}
      </button>
    </div>
  );
};

/* -------------------------------------------------------------
 * 24. PROGRESS INDICATOR VIEW
 * ----------------------------------------------------------- */
const ProgressIndicatorView: React.FC<{
  comp: ProgressIndicatorComponent;
  lang: AssistantLanguage;
}> = ({ comp, lang }) => {
  const current = comp.currentStep || 1;
  const total = comp.steps.length || 4;
  const pct = Math.min(100, Math.round((current / total) * 100));

  return (
    <div className="mt-3 pt-2.5 border-t border-stone-100 bg-stone-50/80 rounded-2xl p-3 border border-stone-200">
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="font-bold text-stone-800">{comp.title || 'बुकिंग प्रगति'}</span>
        <span className="font-black text-orange-600">
          चरण {current} / {total} ({pct}%)
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Step Dots & Labels */}
      <div className="space-y-1.5">
        {comp.steps.map((st, idx) => {
          const stepNum = idx + 1;
          const isDone = stepNum < current;
          const isCurrent = stepNum === current;
          return (
            <div key={idx} className="flex items-center gap-2 text-xs">
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                  isDone
                    ? 'bg-emerald-500 text-white'
                    : isCurrent
                    ? 'bg-orange-600 text-white ring-2 ring-orange-200 animate-pulse'
                    : 'bg-stone-200 text-stone-500'
                }`}
              >
                {isDone ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : stepNum}
              </div>
              <span
                className={`truncate ${
                  isCurrent ? 'font-black text-orange-950' : isDone ? 'text-stone-500 line-through' : 'text-stone-400'
                }`}
              >
                {st.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 25. ROLE SELECTOR CARD VIEW (PHASE 15)
 * ----------------------------------------------------------- */
const RoleSelectorCardView: React.FC<{
  comp: RoleSelectorCardComponent;
  lang: AssistantLanguage;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, lang, onAction, disabled }) => {
  const getRoleIcon = (iconName: string) => {
    switch (iconName) {
      case 'Wrench':
        return <Wrench className="w-5 h-5 text-orange-600" />;
      case 'Briefcase':
        return <Briefcase className="w-5 h-5 text-indigo-600" />;
      case 'Megaphone':
        return <Megaphone className="w-5 h-5 text-pink-600" />;
      case 'Building2':
        return <Building2 className="w-5 h-5 text-purple-600" />;
      default:
        return <Home className="w-5 h-5 text-emerald-600" />;
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-stone-200/80 space-y-2.5">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-orange-600" />
            {comp.title || 'HARDINKAAM मल्टी-रोल रजिस्ट्रेशन'}
          </h4>
          {comp.description && (
            <p className="text-[11px] text-stone-500 mt-0.5">{comp.description}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {comp.roles.map((r) => (
          <div
            key={r.role}
            className="p-3 bg-white hover:bg-stone-50 border border-stone-200 rounded-2xl shadow-xs transition duration-200 hover:border-orange-400 group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-stone-100 group-hover:bg-orange-100/60 transition shrink-0 mt-0.5">
                  {getRoleIcon(r.icon)}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-black text-stone-900">{r.title}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full">
                      {r.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600 mt-0.5">{r.subtitle}</p>
                  {r.earningsHighlight && (
                    <p className="text-[10px] font-bold text-emerald-700 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      {r.earningsHighlight}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  onAction(
                    'select_registration_role',
                    { role: r.role },
                    `चयनित: ${r.hindiTitle || r.title}`
                  )
                }
                className="shrink-0 px-3 py-1.5 bg-gradient-to-r from-orange-600 to-amber-600 text-white text-[11px] font-bold rounded-xl shadow-xs hover:brightness-105 active:scale-95 transition cursor-pointer"
              >
                चुनें
              </button>
            </div>
            {/* Quick Benefits list */}
            <div className="mt-2 pt-2 border-t border-stone-100 flex items-center gap-3 text-[10px] text-stone-500 overflow-x-auto">
              {r.benefits.slice(0, 2).map((b, i) => (
                <span key={i} className="flex items-center gap-1 shrink-0">
                  <Check className="w-3 h-3 text-emerald-500" /> {b}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 26. MULTI-SOURCE MEDIA & DOCUMENT UPLOAD VIEW (PHASE 15)
 * (Camera, Gallery, PDF, Document Upload)
 * ----------------------------------------------------------- */
const MediaDocumentUploadCardView: React.FC<{
  comp: MediaDocumentUploadCardComponent;
  lang: AssistantLanguage;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, lang, onAction, disabled }) => {
  const allowedTypes = comp.allowedDocTypes || ['आधार कार्ड (Aadhaar)', 'पैन कार्ड (PAN)', 'पहचान पत्र (ID Proof)'];
  const [selectedDocType, setSelectedDocType] = useState(allowedTypes[0]);
  const [files, setFiles] = useState<
    Array<{ name: string; docType: string; source: 'camera' | 'gallery' | 'pdf' | 'document'; size?: string }>
  >(comp.uploadedFiles || []);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>, source: 'camera' | 'gallery' | 'pdf' | 'document') => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const sizeMb = (selectedFile.size / (1024 * 1024)).toFixed(2) + ' MB';
    const newDoc = {
      name: selectedFile.name,
      docType: selectedDocType,
      source,
      size: sizeMb,
    };

    setFiles((prev) => [...prev, newDoc]);
    // Reset file input value
    e.target.value = '';
  };

  const removeDoc = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirmUpload = () => {
    if (disabled) return;
    if (files.length === 0 && !comp.isOptional) {
      alert('कृपया कम से कम एक दस्तावेज अपलोड करें या बाद में विकल्प चुनें।');
      return;
    }
    const summaryText = files.length > 0 ? `📄 ${files.length} दस्तावेज अपलोड: ${files.map((f) => f.docType).join(', ')}` : 'दस्तावेज बाद में अपलोड करेंगे';
    onAction('documents_uploaded', { documents: files }, summaryText);
  };

  const handleSkip = () => {
    if (disabled) return;
    onAction('documents_skipped', { skipped: true }, 'दस्तावेज बाद में अपलोड करेंगे');
  };

  return (
    <div className="mt-3 pt-3 border-t border-stone-200/80 space-y-3 bg-white/90 p-3 rounded-2xl border border-stone-200">
      <div>
        <h4 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
          <FileCheck className="w-4 h-4 text-orange-600" />
          {comp.title || 'KYC दस्तावेज सत्यापन'}
        </h4>
        {comp.description && (
          <p className="text-[11px] text-stone-500 mt-0.5">{comp.description}</p>
        )}
      </div>

      {/* Document Type Selector */}
      <div>
        <label className="text-[10px] font-bold text-stone-600 block mb-1">
          अपलोड किए जाने वाले दस्तावेज का प्रकार:
        </label>
        <select
          disabled={disabled}
          value={selectedDocType}
          onChange={(e) => setSelectedDocType(e.target.value)}
          className="w-full text-xs px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
        >
          {allowedTypes.map((t, idx) => (
            <option key={idx} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        disabled={disabled}
        onChange={(e) => handleFileSelected(e, 'camera')}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        disabled={disabled}
        onChange={(e) => handleFileSelected(e, 'gallery')}
        className="hidden"
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf,application/pdf"
        disabled={disabled}
        onChange={(e) => handleFileSelected(e, 'pdf')}
        className="hidden"
      />
      <input
        ref={docInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        disabled={disabled}
        onChange={(e) => handleFileSelected(e, 'document')}
        className="hidden"
      />

      {/* 4 Multi-Source Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* 1. Camera */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => cameraInputRef.current?.click()}
          className="p-2.5 bg-orange-50 hover:bg-orange-100/70 border border-orange-200 rounded-xl flex flex-col items-center justify-center text-center gap-1 text-orange-900 transition active:scale-95 cursor-pointer"
        >
          <Camera className="w-4 h-4 text-orange-600" />
          <span className="text-[10px] font-black">📷 कैमरा</span>
          <span className="text-[8px] text-orange-700/80">लाइव फोटो लें</span>
        </button>

        {/* 2. Gallery */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => galleryInputRef.current?.click()}
          className="p-2.5 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 rounded-xl flex flex-col items-center justify-center text-center gap-1 text-emerald-900 transition active:scale-95 cursor-pointer"
        >
          <ImageIcon className="w-4 h-4 text-emerald-600" />
          <span className="text-[10px] font-black">🖼️ गैलरी</span>
          <span className="text-[8px] text-emerald-700/80">फोटो चुनें</span>
        </button>

        {/* 3. PDF */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => pdfInputRef.current?.click()}
          className="p-2.5 bg-red-50 hover:bg-red-100/70 border border-red-200 rounded-xl flex flex-col items-center justify-center text-center gap-1 text-red-900 transition active:scale-95 cursor-pointer"
        >
          <FileText className="w-4 h-4 text-red-600" />
          <span className="text-[10px] font-black">📄 PDF</span>
          <span className="text-[8px] text-red-700/80">PDF दस्तावेज</span>
        </button>

        {/* 4. Document / All Files */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => docInputRef.current?.click()}
          className="p-2.5 bg-indigo-50 hover:bg-indigo-100/70 border border-indigo-200 rounded-xl flex flex-col items-center justify-center text-center gap-1 text-indigo-900 transition active:scale-95 cursor-pointer"
        >
          <Upload className="w-4 h-4 text-indigo-600" />
          <span className="text-[10px] font-black">📁 फाइल</span>
          <span className="text-[8px] text-indigo-700/80">डॉक्युमेंट अपलोड</span>
        </button>
      </div>

      {/* Uploaded Files List */}
      {files.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-stone-100">
          <p className="text-[10px] font-bold text-stone-600">संलग्न दस्तावेज ({files.length}):</p>
          {files.map((f, i) => (
            <div
              key={i}
              className="p-2 bg-stone-100 rounded-xl flex items-center justify-between text-xs border border-stone-200"
            >
              <div className="flex items-center gap-2 truncate">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <div className="truncate">
                  <span className="font-bold text-stone-900 block truncate text-[11px]">{f.name}</span>
                  <span className="text-[9px] text-stone-500">
                    {f.docType} • {f.source.toUpperCase()} {f.size ? `(${f.size})` : ''}
                  </span>
                </div>
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => removeDoc(i)}
                className="p-1 hover:bg-red-100 text-stone-400 hover:text-red-600 rounded-lg transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          disabled={disabled}
          onClick={handleConfirmUpload}
          className="flex-1 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold text-xs rounded-xl shadow-xs hover:brightness-105 active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5"
        >
          <CheckCircle2 className="w-4 h-4" />
          {comp.submitLabel || 'दस्तावेज सुरक्षित करें'}
        </button>
        {comp.isOptional && (
          <button
            type="button"
            disabled={disabled}
            onClick={handleSkip}
            className="px-3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            {comp.skipLabel || 'छोड़ें'}
          </button>
        )}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 27. MULTI-ROLE REGISTRATION SUMMARY REVIEW (PHASE 15)
 * ----------------------------------------------------------- */
const MultiRoleRegistrationSummaryCardView: React.FC<{
  comp: MultiRoleRegistrationSummaryCardComponent;
  lang: AssistantLanguage;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, lang, onAction, disabled }) => {
  const getBadgeStyle = (role: string) => {
    switch (role) {
      case 'service_man':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'business_partner':
        return 'bg-indigo-100 text-indigo-900 border-indigo-300';
      case 'brand_promoter':
        return 'bg-pink-100 text-pink-900 border-pink-300';
      case 'franchise_admin':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      default:
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-stone-200/80 space-y-3 bg-white rounded-2xl p-3.5 border border-stone-200 shadow-xs">
      <div className="flex items-center justify-between pb-2 border-b border-stone-100">
        <div>
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
            रजिस्ट्रेशन समीक्षा (Review)
          </span>
          <h4 className="text-sm font-black text-stone-900">{comp.roleDisplayName}</h4>
        </div>
        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${getBadgeStyle(comp.role)}`}>
          {comp.role.toUpperCase()}
        </span>
      </div>

      <div className="space-y-2 text-xs">
        {/* Full Name / Firm */}
        <div className="flex items-start justify-between py-1 border-b border-stone-50">
          <span className="text-stone-500 font-medium">नाम / फर्म:</span>
          <span className="font-bold text-stone-900 text-right">
            {comp.businessName ? `${comp.businessName} (${comp.fullName})` : comp.fullName}
          </span>
        </div>

        {/* Mobile Number */}
        <div className="flex items-center justify-between py-1 border-b border-stone-50">
          <span className="text-stone-500 font-medium">मोबाइल नंबर:</span>
          <span className="font-bold text-stone-900">{comp.phone}</span>
        </div>

        {/* Email */}
        {comp.email && (
          <div className="flex items-center justify-between py-1 border-b border-stone-50">
            <span className="text-stone-500 font-medium">ईमेल:</span>
            <span className="font-bold text-stone-900 truncate max-w-[200px]">{comp.email}</span>
          </div>
        )}

        {/* Role Specific: Trade / Skill */}
        {comp.tradeSkill && (
          <div className="flex items-center justify-between py-1 border-b border-stone-50">
            <span className="text-stone-500 font-medium">हुनर / ट्रेड:</span>
            <span className="font-bold text-orange-700">{comp.tradeSkill} ({comp.experienceYears || 3} वर्ष)</span>
          </div>
        )}

        {/* Role Specific: Business Partner */}
        {comp.businessType && (
          <div className="flex items-center justify-between py-1 border-b border-stone-50">
            <span className="text-stone-500 font-medium">मॉडल व फ्लीट:</span>
            <span className="font-bold text-indigo-700">{comp.businessType} ({comp.fleetSize || 'Standard'})</span>
          </div>
        )}

        {/* Role Specific: District / Franchise */}
        {comp.assignedDistrict && (
          <div className="flex items-center justify-between py-1 border-b border-stone-50">
            <span className="text-stone-500 font-medium">फ्रेंचाइजी जिला:</span>
            <span className="font-bold text-purple-700">{comp.assignedDistrict}</span>
          </div>
        )}

        {/* Role Specific: Brand Promoter */}
        {comp.marketingChannel && (
          <div className="flex items-center justify-between py-1 border-b border-stone-50">
            <span className="text-stone-500 font-medium">प्रमोशन माध्यम:</span>
            <span className="font-bold text-pink-700">{comp.marketingChannel}</span>
          </div>
        )}

        {/* Address */}
        {comp.address && (
          <div className="flex items-start justify-between py-1 border-b border-stone-50">
            <span className="text-stone-500 font-medium">पता व लोकेशन:</span>
            <span className="font-bold text-stone-900 text-right truncate max-w-[200px]">{comp.address}</span>
          </div>
        )}

        {/* Documents */}
        <div className="flex items-center justify-between py-1 border-b border-stone-50">
          <span className="text-stone-500 font-medium">सत्यापन दस्तावेज:</span>
          <span className="font-bold text-emerald-700">
            {comp.documents && comp.documents.length > 0
              ? `✅ ${comp.documents.length} दस्तावेज संलग्न`
              : 'बाद में अपलोड करेंगे'}
          </span>
        </div>

        {/* Wallet Bonus / Fee highlight */}
        {comp.walletBonus ? (
          <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-900">🎁 वेलकम बोनस:</span>
            <span className="text-xs font-black text-emerald-700">+₹{comp.walletBonus} वॉलेट में</span>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onAction('confirm_multi_role_registration', { role: comp.role }, '✅ कन्फर्म व रजिस्टर करें')}
        className="w-full py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-black text-xs rounded-xl shadow-md hover:brightness-105 active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5"
      >
        <CheckCircle2 className="w-4 h-4" />
        रजिस्ट्रेशन कन्फर्म करें (Complete Registration)
      </button>
    </div>
  );
};

/* -------------------------------------------------------------
 * 28. REGISTRATION SUCCESS CARD VIEW (PHASE 15)
 * ----------------------------------------------------------- */
const RegistrationSuccessCardView: React.FC<{
  comp: RegistrationSuccessCardComponent;
  lang: AssistantLanguage;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, lang, onAction, disabled }) => {
  return (
    <div className="mt-3 pt-3 border-t border-stone-200/80 space-y-3 bg-white rounded-2xl p-4 border border-emerald-200 shadow-md">
      <div className="text-center space-y-1">
        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
        </div>
        <h4 className="text-sm font-black text-stone-900">रजिस्ट्रेशन सफल! 🎉</h4>
        <p className="text-xs font-bold text-emerald-700">{comp.roleDisplayName}</p>
      </div>

      <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-stone-500 font-medium">आईडी / सदस्यता कोड:</span>
          <span className="font-mono font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-200">
            {comp.memberCode}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-stone-500 font-medium">नाम:</span>
          <span className="font-bold text-stone-900">{comp.fullName}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-stone-500 font-medium">मोबाइल:</span>
          <span className="font-bold text-stone-900">{comp.phone}</span>
        </div>
        {comp.walletBonusCredited && (
          <div className="flex items-center justify-between text-emerald-700 font-bold">
            <span>🎁 वॉलेट बैलेंस क्रेडिट:</span>
            <span>+₹{comp.walletBonusCredited}</span>
          </div>
        )}
      </div>

      {/* Next Steps List */}
      {comp.nextSteps && comp.nextSteps.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">अगले कदम (Next Steps):</p>
          {comp.nextSteps.map((s, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px] text-stone-700">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span>{s}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------
 * 29. TRADE SKILL SELECTOR VIEW (PHASE 15)
 * ----------------------------------------------------------- */
const TradeSkillSelectorView: React.FC<{
  comp: TradeSkillSelectorComponent;
  lang: AssistantLanguage;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, lang, onAction, disabled }) => {
  const getTradeIcon = (tradeId: string) => {
    switch (tradeId) {
      case 'electrician':
        return <Zap className="w-4 h-4 text-amber-600" />;
      case 'plumber':
        return <Wrench className="w-4 h-4 text-blue-600" />;
      case 'carpenter':
        return <Hammer className="w-4 h-4 text-orange-700" />;
      case 'painter':
        return <Paintbrush className="w-4 h-4 text-pink-600" />;
      case 'mason_civil':
        return <Layers className="w-4 h-4 text-stone-600" />;
      case 'ro_purifier':
        return <Droplets className="w-4 h-4 text-cyan-600" />;
      default:
        return <Wrench className="w-4 h-4 text-orange-600" />;
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-stone-200/80 space-y-2.5">
      <div>
        <h4 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
          <Wrench className="w-4 h-4 text-orange-600" />
          {comp.title || 'अपना मुख्य हुनर / ट्रेड चुनें'}
        </h4>
        {comp.description && (
          <p className="text-[11px] text-stone-500 mt-0.5">{comp.description}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {comp.availableTrades.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={disabled}
            onClick={() =>
              onAction('select_trade_skill', { trade: t.label, tradeId: t.id }, `🛠️ ट्रेड चुना: ${t.hindiLabel || t.label}`)
            }
            className="p-2.5 bg-white hover:bg-orange-50/60 border border-stone-200 hover:border-orange-400 rounded-xl flex items-center gap-2 text-left transition active:scale-95 cursor-pointer shadow-2xs group"
          >
            <div className="p-1.5 rounded-lg bg-stone-100 group-hover:bg-orange-100 transition shrink-0">
              {getTradeIcon(t.id)}
            </div>
            <div className="truncate">
              <span className="text-[11px] font-bold text-stone-900 block truncate group-hover:text-orange-950">
                {t.hindiLabel || t.label}
              </span>
              <span className="text-[9px] text-stone-400 block truncate">{t.category}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 30. ACTION CONFIRMATION CARD VIEW (PHASE 17)
 * Buttons: [Yes, Confirm] [Edit] [Cancel]
 * ----------------------------------------------------------- */
const ActionConfirmationCardView: React.FC<{
  comp: ActionConfirmationCardComponent;
  lang: AssistantLanguage;
  onAction: (type: string, data: any, text?: string) => void;
  disabled: boolean;
}> = ({ comp, lang, onAction, disabled }) => {
  const getBadgeBg = () => {
    switch (comp.actionType) {
      case 'cancel_booking':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'approve_extra_charge':
        return 'bg-amber-100 text-amber-900 border-amber-200';
      case 'reject_extra_charge':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'make_payment':
        return 'bg-emerald-100 text-emerald-900 border-emerald-200';
      case 'create_complaint':
        return 'bg-orange-100 text-orange-900 border-orange-200';
      default:
        return 'bg-orange-100 text-orange-800 border-orange-200';
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-stone-200/80 space-y-3 bg-white rounded-2xl p-4 border border-stone-200 shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 pb-2 border-b border-stone-100">
        <div>
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
            पुष्टिकरण आवश्यक (Confirmation Required)
          </span>
          <h4 className="text-xs font-black text-stone-900 flex items-center gap-1.5 mt-0.5">
            <AlertCircle className="w-4 h-4 text-orange-600 shrink-0" />
            {comp.title}
          </h4>
        </div>
        {comp.highlightBadge && (
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 ${getBadgeBg()}`}>
            {comp.highlightBadge}
          </span>
        )}
      </div>

      {/* Summary Prompt */}
      <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/70 space-y-1">
        <p className="text-xs font-medium text-stone-800 leading-relaxed">{comp.summary}</p>
        {comp.promptQuestion && (
          <p className="text-xs font-bold text-orange-700">{comp.promptQuestion}</p>
        )}
      </div>

      {/* Details Table */}
      {comp.details && comp.details.length > 0 && (
        <div className="space-y-1.5 py-1 text-xs">
          {comp.details.map((d, i) => (
            <div key={i} className="flex items-start justify-between py-1 border-b border-stone-50 gap-2">
              <span className="text-stone-500 font-medium shrink-0">{d.label}</span>
              <span
                className={`text-right truncate font-bold ${
                  d.highlight ? 'text-orange-600 text-sm font-black' : 'text-stone-900'
                }`}
              >
                {d.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 3 Interactive Buttons: [Yes, Confirm] [Edit] [Cancel] */}
      <div className="flex flex-col sm:flex-row items-stretch gap-2 pt-2">
        {/* 1. [Yes, Confirm] */}
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            onAction(
              'confirm_pending_action',
              { actionType: comp.actionType, payload: comp.payload, decision: 'confirm' },
              'Yes, Confirm'
            )
          }
          className="flex-1 py-2.5 px-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-black text-xs rounded-xl shadow-xs hover:brightness-105 active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{comp.yesLabel || 'Yes, Confirm'}</span>
        </button>

        {/* 2. [Edit] */}
        {comp.editLabel && (
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              onAction(
                'edit_pending_action',
                { actionType: comp.actionType, payload: comp.payload, decision: 'edit' },
                'Edit'
              )
            }
            className="py-2.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1 active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-stone-600" />
            <span>{comp.editLabel || 'Edit'}</span>
          </button>
        )}

        {/* 3. [Cancel] */}
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            onAction(
              'cancel_pending_action',
              { actionType: comp.actionType, payload: comp.payload, decision: 'cancel' },
              'Cancel'
            )
          }
          className="py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl border border-red-200 transition cursor-pointer flex items-center justify-center gap-1 active:scale-95"
        >
          <X className="w-3.5 h-3.5" />
          <span>{comp.cancelLabel || 'Cancel'}</span>
        </button>
      </div>
    </div>
  );
};

