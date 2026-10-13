export type TelephonyProviderType = 'mock' | 'jiocx';

export type CallDirection = 'outbound' | 'inbound';

export type CallStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'CALLING'
  | 'CONNECTED'
  | 'NO_ANSWER'
  | 'BUSY'
  | 'FAILED'
  | 'COMPLETED'
  | 'FOLLOW_UP'
  | 'DO_NOT_CALL'
  | 'HUMAN_TRANSFER';

export type CallOutcome =
  | 'INTERESTED'
  | 'NOT_INTERESTED'
  | 'CALL_LATER'
  | 'BUSY'
  | 'NO_ANSWER'
  | 'WRONG_NUMBER'
  | 'ALREADY_REGISTERED'
  | 'REGISTRATION_REQUEST'
  | 'BOOKING_REQUEST'
  | 'HUMAN_AGENT_REQUEST'
  | 'COMPLAINT'
  | 'OTHER'
  | 'DO_NOT_CALL';

export interface AICallScript {
  id: string;
  name: string;
  category: string;
  language: 'hi' | 'hinglish' | 'en';
  openingGreeting: string;
  objective: string;
  systemPrompt: string;
  keyTalkingPoints: string[];
  faqResponses: { question: string; answer: string }[];
  objectionHandling: { objection: string; response: string }[];
  closingRemark: string;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AICallCampaign {
  id: string;
  name: string;
  description?: string;
  scriptId: string;
  scriptName?: string;
  targetAudience: 'marketing_leads' | 'unregistered_pros' | 'inactive_customers' | 'custom_numbers';
  tradeFilter?: string;
  cityFilter?: string;
  statusFilter?: string;
  language: 'hi' | 'hinglish' | 'en';
  status: 'draft' | 'active' | 'paused' | 'completed' | 'stopped';
  callingHoursStart: string; // e.g. "10:00"
  callingHoursEnd: string; // e.g. "18:00"
  maxAttempts: number; // e.g. 3
  delayBetweenCallsSeconds: number; // e.g. 15
  maxConcurrentCalls: number; // e.g. 2
  recordingEnabled: boolean;
  transcriptionEnabled: boolean;
  humanHandoffNumber?: string;
  allowBargeIn: boolean;
  totalLeads: number;
  completedLeads: number;
  successfulLeads: number;
  failedLeads: number;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface AICallQueueItem {
  id: string;
  campaignId: string;
  campaignName: string;
  leadId?: string;
  customerId?: string;
  contactName: string;
  phone: string;
  city?: string;
  trade?: string;
  status: CallStatus;
  attemptCount: number;
  maxAttempts: number;
  lastAttemptAt?: string;
  nextScheduledAttemptAt?: string;
  lastOutcome?: CallOutcome;
  lastCallId?: string;
  priority: number;
  doNotCall?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AICallTranscriptEntry {
  speaker: 'ai' | 'customer' | 'system' | 'human_agent';
  text: string;
  timestamp: string;
  confidence?: number;
}

export interface AICallLog {
  id: string;
  callId: string;
  leadId?: string;
  customerId?: string;
  contactName?: string;
  phone: string;
  direction: CallDirection;
  campaignId?: string;
  campaignName?: string;
  provider: TelephonyProviderType;
  providerCallId?: string;
  status: CallStatus;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
  language: 'hi' | 'hinglish' | 'en';
  intent?: string;
  outcome: CallOutcome;
  summary: string;
  transcript?: AICallTranscriptEntry[];
  sentiment?: 'positive' | 'neutral' | 'negative' | 'frustrated';
  nextAction?: string;
  followUpAt?: string;
  humanTransferRequested: boolean;
  humanTransferNumber?: string;
  recordingEnabled: boolean;
  recordingUrl?: string;
  transcriptionEnabled: boolean;
  attemptNumber: number;
  toolCallsExecuted?: { name: string; args: any; result: any }[];
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AICallFollowUp {
  id: string;
  callLogId: string;
  leadId?: string;
  contactName: string;
  phone: string;
  scheduledAt: string;
  reason: string;
  notes?: string;
  assignedAgent?: string;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface AICallSettings {
  id: string;
  telephonyProvider: TelephonyProviderType;
  jioCxConfig: {
    accountId: string;
    apiKey: string;
    apiSecret: string;
    businessNumber: string; // Dedicated HARDINKAAM Jio Number
    webhookSecret: string;
    sipEndpoint?: string;
    baseUrl?: string;
  };
  geminiVoiceConfig: {
    model: string; // Canonical production model: 'gemini-3.8-flash'
    voiceName: string; // e.g. "Kore", "Puck", "Fenrir"
    thinkingLevel?: 'low' | 'medium' | 'high';
    temperature?: number; // Optional legacy parameter (omitted in Gemini 3.8 calls)
    speechRate: number;
  };
  globalCallingHours: {
    start: string; // "10:00"
    end: string; // "18:00"
    timezone: string; // "Asia/Kolkata"
    allowedDays: number[]; // [1, 2, 3, 4, 5, 6] (Mon-Sat)
  };
  safetyLimits: {
    maxDailyCalls: number;
    maxConcurrentCalls: number;
    minDelayBetweenCallsSeconds: number;
    maxAttemptsPerLead: number;
    cooldownPeriodDays: number;
    autoDoNotCallOnDisinterestCount: number;
  };
  humanHandoff: {
    enabled: boolean;
    forwardingNumber: string;
    escalationWebhookUrl?: string;
  };
  testModeActive: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface AICallOverviewStats {
  totalCallsToday: number;
  connectedCalls: number;
  noAnswerCalls: number;
  busyCalls: number;
  interestedCount: number;
  notInterestedCount: number;
  followUpsScheduled: number;
  humanTransferRequests: number;
  convertedLeads: number;
  totalCallMinutes: number;
  activeCampaignsCount: number;
  pendingQueueCount: number;
  connectionRatePercent: number;
  conversionRatePercent: number;
}
