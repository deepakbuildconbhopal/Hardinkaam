import { auth } from '../firebase/config';

export interface WhatsAppApiMessageInput {
  phone: string;
  message: string;
  bookingId?: string;
  eventType?: string;
  recipientName?: string;
}

export interface WhatsAppApiResult {
  success: boolean;
  messageId?: string;
  status?: string;
  error?: string;
}

/**
 * Server-side WhatsApp gateway bridge.
 * The API token never enters the browser bundle.
 */
export async function sendWhatsAppApiMessage(input: WhatsAppApiMessageInput): Promise<WhatsAppApiResult> {
  const phone = String(input.phone || '').replace(/\D/g, '');
  if (phone.length < 10 || !input.message?.trim()) {
    return { success: false, error: 'INVALID_WHATSAPP_MESSAGE' };
  }

  try {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'AUTH_REQUIRED' };

    const idToken = await user.getIdToken();
    const response = await fetch('/api/notifications/whatsapp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        phone,
        message: input.message,
        bookingId: input.bookingId || '',
        eventType: input.eventType || 'manual',
        recipientName: input.recipientName || '',
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      return { success: false, status: data.status, error: data.error || data.message || `HTTP_${response.status}` };
    }
    return { success: true, messageId: data.messageId, status: data.status };
  } catch (error: any) {
    return { success: false, error: error?.message || 'WHATSAPP_API_ERROR' };
  }
}
