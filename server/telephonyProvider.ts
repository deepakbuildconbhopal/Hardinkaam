/**
 * HARDINKAAM AI Calling Engine - Telephony Provider Abstraction
 * 
 * Supports:
 * 1. MockTelephonyProvider (Default Test Mode - Zero real calls placed, fully safe simulation)
 * 2. JioCXTelephonyProvider (Production Telephony for dedicated HARDINKAAM Jio Mobile Number)
 */

export interface OutboundCallParams {
  callId: string;
  toPhone: string;
  fromPhone: string;
  campaignId?: string;
  leadId?: string;
  contactName?: string;
  language?: string;
  recordingEnabled?: boolean;
  transcriptionEnabled?: boolean;
  webhookUrl?: string;
  customData?: Record<string, any>;
}

export interface InboundCallParams {
  callId: string;
  fromPhone: string;
  toPhone: string;
  headers?: Record<string, string>;
}

export interface TransferCallParams {
  callId: string;
  providerCallId?: string;
  targetNumber: string;
  reason?: string;
}

export interface TelephonyCallResult {
  success: boolean;
  callId: string;
  providerCallId: string;
  status: 'QUEUED' | 'CALLING' | 'CONNECTED' | 'NO_ANSWER' | 'BUSY' | 'FAILED' | 'COMPLETED' | 'HUMAN_TRANSFER';
  provider: 'mock' | 'jiocx';
  durationSeconds?: number;
  recordingUrl?: string;
  error?: string;
  meta?: Record<string, any>;
}

export interface TelephonyCallStatus {
  callId: string;
  providerCallId: string;
  status: string;
  durationSeconds: number;
  answeredAt?: string;
  endedAt?: string;
  recordingUrl?: string;
}

export interface TelephonyWebhookEvent {
  eventType: 'call.initiated' | 'call.answered' | 'call.completed' | 'call.failed' | 'call.busy' | 'call.no_answer' | 'call.transfer_requested' | 'speech.recognized';
  callId: string;
  providerCallId: string;
  from: string;
  to: string;
  status: string;
  durationSeconds?: number;
  digitsPressed?: string;
  userSpeechText?: string;
  recordingUrl?: string;
  timestamp: string;
  rawPayload: any;
}

export interface TelephonyProvider {
  readonly name: 'mock' | 'jiocx';
  createOutboundCall(params: OutboundCallParams): Promise<TelephonyCallResult>;
  handleInboundCall(params: InboundCallParams): Promise<TelephonyCallResult>;
  transferCall(params: TransferCallParams): Promise<TelephonyCallResult>;
  hangupCall(callId: string, providerCallId?: string): Promise<TelephonyCallResult>;
  getCallStatus(callId: string, providerCallId?: string): Promise<TelephonyCallStatus>;
  handleWebhook(payload: any, headers?: any): Promise<TelephonyWebhookEvent>;
}

/**
 * Mock Telephony Provider for safe development and demonstration.
 * Never touches real telephony network or incurs charges.
 */
export class MockTelephonyProvider implements TelephonyProvider {
  readonly name = 'mock' as const;
  private calls = new Map<string, TelephonyCallStatus>();

  async createOutboundCall(params: OutboundCallParams): Promise<TelephonyCallResult> {
    const providerCallId = `mock_jio_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // Simulate initial queued / ringing state
    this.calls.set(params.callId, {
      callId: params.callId,
      providerCallId,
      status: 'CALLING',
      durationSeconds: 0,
      answeredAt: new Date().toISOString(),
    });

    return {
      success: true,
      callId: params.callId,
      providerCallId,
      status: 'CALLING',
      provider: 'mock',
      meta: {
        toPhone: params.toPhone,
        fromPhone: params.fromPhone,
        testMode: true,
        notice: 'Mock Telephony Active: Call simulated safely without dialing actual phone network.',
      },
    };
  }

  async handleInboundCall(params: InboundCallParams): Promise<TelephonyCallResult> {
    const providerCallId = `mock_inbound_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return {
      success: true,
      callId: params.callId,
      providerCallId,
      status: 'CONNECTED',
      provider: 'mock',
      meta: {
        fromPhone: params.fromPhone,
        toPhone: params.toPhone,
        testMode: true,
      },
    };
  }

  async transferCall(params: TransferCallParams): Promise<TelephonyCallResult> {
    return {
      success: true,
      callId: params.callId,
      providerCallId: params.providerCallId || 'mock_transfer_id',
      status: 'HUMAN_TRANSFER',
      provider: 'mock',
      meta: {
        transferredTo: params.targetNumber,
        reason: params.reason || 'Customer requested human agent',
      },
    };
  }

  async hangupCall(callId: string, providerCallId?: string): Promise<TelephonyCallResult> {
    const existing = this.calls.get(callId);
    if (existing) {
      existing.status = 'COMPLETED';
      existing.endedAt = new Date().toISOString();
    }
    return {
      success: true,
      callId,
      providerCallId: providerCallId || 'mock_hangup_id',
      status: 'COMPLETED',
      provider: 'mock',
      durationSeconds: 45,
    };
  }

  async getCallStatus(callId: string, providerCallId?: string): Promise<TelephonyCallStatus> {
    const existing = this.calls.get(callId);
    if (existing) return existing;
    return {
      callId,
      providerCallId: providerCallId || 'mock_call',
      status: 'COMPLETED',
      durationSeconds: 60,
      endedAt: new Date().toISOString(),
    };
  }

  async handleWebhook(payload: any, headers?: any): Promise<TelephonyWebhookEvent> {
    return {
      eventType: payload.eventType || 'call.completed',
      callId: payload.callId || 'unknown_call',
      providerCallId: payload.providerCallId || 'mock_webhook_id',
      from: payload.from || '+916267546945',
      to: payload.to || '+919826000000',
      status: payload.status || 'COMPLETED',
      durationSeconds: Number(payload.durationSeconds) || 35,
      timestamp: new Date().toISOString(),
      rawPayload: payload,
    };
  }
}

/**
 * Production JioCX Telephony Provider Adapter.
 * Integrates with JioCX Cloud Communications Voice API via standardized REST / Webhook contracts.
 */
export class JioCXTelephonyProvider implements TelephonyProvider {
  readonly name = 'jiocx' as const;
  private accountId: string;
  private apiKey: string;
  private apiSecret: string;
  private businessNumber: string;
  private baseUrl: string;

  constructor(config?: {
    accountId?: string;
    apiKey?: string;
    apiSecret?: string;
    businessNumber?: string;
    baseUrl?: string;
  }) {
    this.accountId = config?.accountId || process.env.JIOCX_ACCOUNT_ID || '';
    this.apiKey = config?.apiKey || process.env.JIOCX_API_KEY || '';
    this.apiSecret = config?.apiSecret || process.env.JIOCX_API_SECRET || '';
    this.businessNumber = config?.businessNumber || process.env.JIOCX_NUMBER || '+916267546945';
    this.baseUrl = config?.baseUrl || process.env.JIOCX_BASE_URL || 'https://api.jiocx.com/v1';
  }

  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64');
    return `Basic ${credentials}`;
  }

  async createOutboundCall(params: OutboundCallParams): Promise<TelephonyCallResult> {
    // If real credentials are not supplied, fail gracefully with clear diagnostic
    if (!this.apiKey || !this.apiSecret || !this.accountId) {
      console.warn('[JioCX Telephony] API credentials missing in environment. Fallback to mock execution.');
      return {
        success: false,
        callId: params.callId,
        providerCallId: '',
        status: 'FAILED',
        provider: 'jiocx',
        error: 'JioCX credentials (JIOCX_API_KEY, JIOCX_API_SECRET, JIOCX_ACCOUNT_ID) not configured.',
      };
    }

    try {
      const payload = {
        accountId: this.accountId,
        callerId: this.businessNumber,
        destination: params.toPhone,
        externalCallId: params.callId,
        webhookUrl: params.webhookUrl || `${process.env.APP_URL || ''}/api/ai-calling/webhook/telephony`,
        recordCall: params.recordingEnabled ?? true,
        enableTranscription: params.transcriptionEnabled ?? true,
        customParams: {
          campaignId: params.campaignId,
          leadId: params.leadId,
          contactName: params.contactName,
        },
      };

      const res = await fetch(`${this.baseUrl}/accounts/${this.accountId}/calls/outbound`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[JioCX Telephony] API Error:', res.status, errorText);
        return {
          success: false,
          callId: params.callId,
          providerCallId: '',
          status: 'FAILED',
          provider: 'jiocx',
          error: `JioCX API responded with HTTP ${res.status}: ${errorText}`,
        };
      }

      const data = await res.json();
      return {
        success: true,
        callId: params.callId,
        providerCallId: data.callId || data.providerCallId || `jiocx_${Date.now()}`,
        status: 'CALLING',
        provider: 'jiocx',
        meta: data,
      };
    } catch (err: any) {
      console.error('[JioCX Telephony] Outbound call exception:', err);
      return {
        success: false,
        callId: params.callId,
        providerCallId: '',
        status: 'FAILED',
        provider: 'jiocx',
        error: err?.message || 'Network exception while connecting to JioCX Voice API',
      };
    }
  }

  async handleInboundCall(params: InboundCallParams): Promise<TelephonyCallResult> {
    return {
      success: true,
      callId: params.callId,
      providerCallId: `jiocx_in_${Date.now()}`,
      status: 'CONNECTED',
      provider: 'jiocx',
      meta: { from: params.fromPhone, to: params.toPhone },
    };
  }

  async transferCall(params: TransferCallParams): Promise<TelephonyCallResult> {
    try {
      const res = await fetch(`${this.baseUrl}/accounts/${this.accountId}/calls/${params.providerCallId}/transfer`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transferTo: params.targetNumber,
          reason: params.reason || 'Human agent escalation',
        }),
      });

      const data = res.ok ? await res.json() : {};
      return {
        success: res.ok,
        callId: params.callId,
        providerCallId: params.providerCallId || '',
        status: 'HUMAN_TRANSFER',
        provider: 'jiocx',
        meta: data,
      };
    } catch (err: any) {
      return {
        success: false,
        callId: params.callId,
        providerCallId: params.providerCallId || '',
        status: 'FAILED',
        provider: 'jiocx',
        error: err?.message,
      };
    }
  }

  async hangupCall(callId: string, providerCallId?: string): Promise<TelephonyCallResult> {
    try {
      if (providerCallId) {
        await fetch(`${this.baseUrl}/accounts/${this.accountId}/calls/${providerCallId}/hangup`, {
          method: 'POST',
          headers: { 'Authorization': this.getAuthHeader() },
        });
      }
      return {
        success: true,
        callId,
        providerCallId: providerCallId || '',
        status: 'COMPLETED',
        provider: 'jiocx',
      };
    } catch (_) {
      return {
        success: true,
        callId,
        providerCallId: providerCallId || '',
        status: 'COMPLETED',
        provider: 'jiocx',
      };
    }
  }

  async getCallStatus(callId: string, providerCallId?: string): Promise<TelephonyCallStatus> {
    try {
      if (providerCallId && this.apiKey) {
        const res = await fetch(`${this.baseUrl}/accounts/${this.accountId}/calls/${providerCallId}`, {
          headers: { 'Authorization': this.getAuthHeader() },
        });
        if (res.ok) {
          const data = await res.json();
          return {
            callId,
            providerCallId,
            status: data.status || 'COMPLETED',
            durationSeconds: data.durationSeconds || 0,
            recordingUrl: data.recordingUrl,
          };
        }
      }
    } catch (_) {}

    return {
      callId,
      providerCallId: providerCallId || '',
      status: 'COMPLETED',
      durationSeconds: 0,
    };
  }

  async handleWebhook(payload: any, headers?: any): Promise<TelephonyWebhookEvent> {
    return {
      eventType: payload.eventType || payload.event || 'call.completed',
      callId: payload.externalCallId || payload.callId || '',
      providerCallId: payload.providerCallId || payload.callSid || '',
      from: payload.callerId || payload.from || '',
      to: payload.destination || payload.to || '',
      status: payload.status || 'COMPLETED',
      durationSeconds: Number(payload.duration) || Number(payload.durationSeconds) || 0,
      recordingUrl: payload.recordingUrl,
      timestamp: payload.timestamp || new Date().toISOString(),
      rawPayload: payload,
    };
  }
}

/**
 * Provider factory that returns active provider instance.
 * Defaults safely to 'mock' mode unless explicitly configured.
 */
let cachedProvider: TelephonyProvider | null = null;

export function getTelephonyProvider(overrideType?: 'mock' | 'jiocx'): TelephonyProvider {
  const providerType = overrideType || process.env.TELEPHONY_PROVIDER || 'mock';
  
  if (providerType === 'jiocx' && process.env.JIOCX_API_KEY) {
    return new JioCXTelephonyProvider();
  }
  
  return new MockTelephonyProvider();
}
