import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Normalizes phone number into clean WhatsApp international format.
 * Standardizes 10-digit Indian numbers with '91' prefix.
 */
export function formatWhatsAppPhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return `91${cleaned.slice(1)}`;
  }
  return cleaned;
}

/**
 * Creates the formatted text for WhatsApp Video Call Invitation
 */
export function formatWhatsAppVideoInviteMessage(options: {
  recipientName?: string;
  roomCode: string;
  meetingUrl: string;
  hostName?: string;
  purpose?: string;
  bookingId?: string;
}): string {
  const { recipientName, roomCode, meetingUrl, hostName = 'दीपक बिल्डकॉन एडमिन', purpose, bookingId } = options;

  let header = `*HARDINKAAM (दीपक बिल्डकॉन) • लाइव वीडियो कॉल आमंत्रण*`;
  let salutation = recipientName ? `नमस्ते *${recipientName}* जी!` : `नमस्ते!`;
  
  let contextLine = purpose ? `\nविषय: *${purpose}*` : '';
  if (bookingId) {
    contextLine += `\nबुकिंग संदर्भ: *#${bookingId}*`;
  }

  return `${header}
${salutation}
${hostName} आपको लाइव एचडी वीडियो कॉल पर कनेक्ट करने के लिए आमंत्रित कर रहे हैं।${contextLine}

🔗 *तुरंत जुड़ने के लिए इस लिंक पर क्लिक करें:*
${meetingUrl}

🔑 *कक्ष कोड (Room Code):* \`${roomCode}\`
🛡️ 256-बिट सुरक्षित एंड-टू-एंड एन्क्रिप्टेड HD वीडियो कक्ष।
(यदि लिंक नहीं खुल रहा है, तो इस नंबर पर 'Hi' भेजकर लिंक एक्टिवेट करें या सीधे वीडियो कॉल करें।)`;
}

/**
 * Generates direct wa.me link with encoded invitation
 */
export function generateWhatsAppVideoCallUrl(options: {
  phone?: string;
  recipientName?: string;
  roomCode: string;
  meetingUrl: string;
  hostName?: string;
  purpose?: string;
  bookingId?: string;
}): string {
  const message = formatWhatsAppVideoInviteMessage(options);
  const cleanPhone = options.phone ? formatWhatsAppPhone(options.phone) : '';

  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  }
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/**
 * Logs a WhatsApp video call invitation in Firestore `whatsapp_logs`
 */
export async function logWhatsAppVideoInviteToFirestore(options: {
  phone: string;
  recipientName?: string;
  roomCode: string;
  purpose?: string;
  bookingId?: string;
}): Promise<void> {
  try {
    await addDoc(collection(db, 'whatsapp_logs'), {
      recipientPhone: options.phone,
      recipientName: options.recipientName || 'Participant',
      type: 'video_call_invite',
      messageBody: `WhatsApp Video Call Invite (Room Code: ${options.roomCode}${options.bookingId ? `, Booking #${options.bookingId}` : ''})`,
      status: 'sent',
      roomCode: options.roomCode,
      bookingId: options.bookingId || null,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Notice: Firestore whatsapp_logs dispatch note:', err);
  }
}
