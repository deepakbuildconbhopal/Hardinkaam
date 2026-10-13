export type RfqCategory =
  | 'painting'
  | 'renovation'
  | 'waterproofing'
  | 'modular_work'
  | 'civil_work'
  | 'interior'
  | 'large_electrical_plumbing';

export type RfqUrgency = 'immediate' | 'within_2_days' | 'this_week' | 'flexible';

export type RfqStatus =
  | 'OPEN_FOR_QUOTES'
  | 'QUOTES_RECEIVED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface RfqAttachment {
  type: 'image' | 'video' | 'audio';
  url: string;
}

export interface RfqRequest {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  category: RfqCategory;
  categoryLabel: string;
  title: string;
  description: string;
  urgency: RfqUrgency;
  attachments: RfqAttachment[];
  location: {
    address: string;
    city: string;
    pincode: string;
  };
  status: RfqStatus;
  acceptedQuoteId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfessionalQuote {
  id: string;
  rfqId: string;
  professionalId: string;
  professionalName: string;
  professionalPhone: string;
  professionalRating: number;
  professionalTrade: string;
  quotedAmount: number;
  estimatedDays: number;
  materialsIncluded: boolean;
  warrantyMonths: number;
  proposalDetails: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
}

export interface RfqFeeSettings {
  leadFee: number; // e.g. ₹99 paid by pro to unlock lead
  platformFee: number; // e.g. ₹199 platform facilitation
  projectCommissionPercent: number; // e.g. 10%
  transactionFeePercent: number; // e.g. 2% gateway fee
  updatedAt: string;
}
