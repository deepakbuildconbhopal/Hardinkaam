import { ChatAttachment } from './attachmentTypes';

export interface StructuredBookingContext {
  customerName?: string;
  mobile?: string;
  email?: string;
  district?: string;
  city?: string;
  area?: string;
  address?: string;
  location?: string;
  // Phase 9: Detailed Address & Location Experience fields
  houseFlat?: string;
  street?: string;
  state?: string;
  pincode?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  locationSource?: 'gps' | 'map' | 'manual' | 'saved';
  serviceCategory?: string;
  serviceType?: string;
  problemDescription?: string;
  problemNotes?: string;
  symptoms?: string[];
  preferredDate?: string;
  preferredTime?: string;
  attachments?: ChatAttachment[];
  specialInstructions?: string;
  quantity?: number;
  estimatedPrice?: number;
  // Phase 10: Selected Service Professional
  selectedServiceMan?: SelectedServiceMan;
}

export interface SelectedServiceMan {
  id: string;
  name: string;
  phone: string;
  photoUrl?: string;
  skill: string;
  trade?: string;
  rating: number;
  totalJobs?: number;
  experienceYears?: number;
  approxDistance?: string;
  distanceKm?: number;
  availability?: string;
  estimatedArrival?: string;
  etaMinutes?: number;
  relevantService?: string;
  serviceArea?: string;
}

export type RequiredBookingField =
  | 'serviceCategory'
  | 'serviceType'
  | 'location'
  | 'preferredDate'
  | 'preferredTime'
  | 'customerName'
  | 'mobile';

export interface KaamDostSessionState {
  sessionId: string;
  userId?: string;
  context: StructuredBookingContext;
  missingFields: RequiredBookingField[];
  isComplete: boolean;
  lastIntent?: string;
  createdAt: string;
  updatedAt: string;
}
