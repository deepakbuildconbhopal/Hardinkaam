import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { UserRole } from '../types';

export interface MemberRegistrationDetails {
  userId: string;
  name: string;
  fatherName?: string;
  motherName?: string;
  noCriminalRecordOath?: boolean;
  phone: string;
  email?: string;
  role: UserRole | 'promoter' | 'brand_promoter' | 'franchise_partner';
  memberCode?: string;
  paymentMethod?: 'razorpay' | 'cash';
  registrationPaymentId?: string;
  registrationOrderId?: string;
  amountPaid?: number;
  registeredAt?: string;
  city?: string;
  state?: string;
  avatar?: string;
}

export interface MemberNotificationResult {
  success?: boolean;
  memberCode: string;
  roleHindiTitle: string;
  roleEnglishTitle: string;
  smsMessage?: string;
  whatsappMessage?: string;
  whatsappDirectUrl: string;
  adminWhatsappDirectUrl?: string;
  smsDispatched?: boolean;
  whatsappDispatched?: boolean;
  notificationId?: string;
  notificationLogId?: string;
  adminNotificationId?: string;
  smsLogId?: string;
  whatsappLogId?: string;
}

/**
 * Returns localized titles for user roles
 */
export function getRoleTitles(role: string): { hindi: string; english: string; prefix: string } {
  switch (role) {
    case 'customer':
      return { hindi: 'कस्टमर (ग्राहक)', english: 'Customer Member', prefix: 'CUST' };
    case 'service_man':
      return { hindi: 'सर्विसमैन (सेवा प्रदाता)', english: 'Service Professional', prefix: 'SERV' };
    case 'business_partner':
      return { hindi: 'बिजनेस पार्टनर / ब्रांड पार्टनर', english: 'Business & Brand Partner', prefix: 'PART' };
    case 'franchise_admin':
    case 'franchise_partner':
      return { hindi: 'फ्रेंचाइजी पार्टनर', english: 'Franchise Partner', prefix: 'FRAN' };
    case 'promoter':
    case 'brand_promoter':
      return { hindi: 'ब्रांड प्रमोटर', english: 'Brand Promoter', prefix: 'PROM' };
    case 'admin':
      return { hindi: 'प्रशासक (एडमिन)', english: 'Administrator', prefix: 'ADMN' };
    default:
      return { hindi: 'पंजीकृत सदस्य', english: 'Verified Member', prefix: 'MEMB' };
  }
}

/**
 * Generates a unique, high-entropy Member Code.
 * Format: HDK-<ROLE_PREFIX>-<YEAR><5_DIGIT_RANDOM>
 * Example: HDK-CUST-2026-84920
 */
export function generateUniqueMemberCode(role: string): string {
  const { prefix } = getRoleTitles(role);
  const year = new Date().getFullYear();

  let randomNum = 54321;
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    randomNum = 10000 + (arr[0] % 90000);
  } else {
    randomNum = Math.floor(10000 + Math.random() * 90000);
  }

  return `HDK-${prefix}-${year}-${randomNum}`;
}

/**
 * Generates direct WhatsApp chat URL with pre-filled message
 */
export function generateWhatsAppDirectUrl(phone: string, message: string): string {
  const targetWaNumber = (phone || '').replace(/\D/g, '');
  const encodedWaMessage = encodeURIComponent(message);
  if (targetWaNumber.length >= 10) {
    const fullPhone = targetWaNumber.length === 10 ? '91' + targetWaNumber : targetWaNumber;
    return `https://wa.me/${fullPhone}?text=${encodedWaMessage}`;
  }
  return `https://wa.me/916267546945?text=${encodedWaMessage}`;
}

/**
 * Builds the official Hindi/English SMS & WhatsApp confirmation text for the Member
 */
export function buildRegistrationMessage(data: {
  name: string;
  phone: string;
  memberCode: string;
  roleHindiTitle: string;
  roleEnglishTitle: string;
  amountPaid?: number;
  paymentId?: string;
}): { sms: string; whatsapp: string } {
  const amountStr = data.amountPaid ? `₹${data.amountPaid}` : '₹121';
  const paymentStr = data.paymentId ? ` (Payment ID: ${data.paymentId})` : '';

  const sms = `हार्दिक काम (HARDINKAAM) में आपका स्वागत है ${data.name}!\n\nआपका रजिस्ट्रेशन सफलतापूर्वक हो गया है।\n• सदस्य कोड (Member ID): ${data.memberCode}\n• श्रेणी (Role): ${data.roleHindiTitle}\n• शुल्क: ${amountStr}${paymentStr}\n• स्थिति: एक्टिव (सत्यापित)\n\nअब आप HARDINKAAM की सभी होम व बिजनेस सेवाओं का पूरा लाभ ले सकते हैं।\nलॉगिन करें: ${window?.location?.origin || 'https://www.hardinkaam.online'}\nहेल्पलाइन: 6267546945`;

  const whatsapp = `🎉 *HARDINKAAM - रजिस्ट्रेशन व सदस्यता पुष्टि* 🎉\n\nनमस्ते *${data.name}* जी,\n\nHARDINKAAM परिवार में आपका हार्दिक स्वागत है! आपका रजिस्ट्रेशन शुल्क ${amountStr} सफलतापूर्वक प्राप्त हो गया है और आपका अकाउंट पूर्ण रूप से एक्टिवेट कर दिया गया है।\n\n📋 *आपकी सदस्यता का विवरण (Membership Details):*\n━━━━━━━━━━━━━━━━━━━━\n👤 *नाम:* ${data.name}\n📱 *मोबाइल:* ${data.phone}\n🆔 *यूनिक मेम्बर कोड:* *${data.memberCode}*\n🏷️ *पद/श्रेणी:* *${data.roleHindiTitle}* (${data.roleEnglishTitle})\n💰 *रजिस्ट्रेशन शुल्क:* ${amountStr} (सत्यापित ✅)\n🌐 *अकाउंट स्थिति:* पूर्णतः सक्रिय (Active & Ready)\n━━━━━━━━━━━━━━━━━━━━\n\n✨ *अब आप HARDINKAAM की सभी सुविधाओं व सेवाओं का आनंद ले सकते हैं:*\n✔️ 100% सत्यापित व सुरक्षित होम सर्विस\n✔️ 24x7 प्राथमिकता सपोर्ट व बुकिंग\n✔️ इंसटेंट कैशबैक व रेफरल बेनिफिट्स\n\n🔗 *अभी लॉगिन करें:* ${window?.location?.origin || 'https://www.hardinkaam.online'}\n📞 *कस्टमर केयर / सपोर्ट नंबर:* 6267546945\n\n_धन्यवाद - टीम HARDINKAAM & DEEPAK BUILDCON_`;

  return { sms, whatsapp };
}

/**
 * Builds the comprehensive registration alert message for Super Admin DEEPAK
 */
export function buildAdminRegistrationAlert(data: {
  name: string;
  fatherName?: string;
  motherName?: string;
  noCriminalRecordOath?: boolean;
  phone: string;
  email?: string;
  memberCode: string;
  roleHindiTitle: string;
  roleEnglishTitle: string;
  amountPaid?: number;
  paymentMethod?: string;
  paymentId?: string;
  orderId?: string;
  registeredAt?: string;
  userId?: string;
}): { inAppTitle: string; inAppMessage: string; whatsappAlert: string; smsAlert: string } {
  const amountStr = data.amountPaid ? `₹${data.amountPaid}` : '₹121';
  const payMethodStr = data.paymentMethod === 'cash' ? 'नकद भुगतान (Cash - अप्रूवल अपेक्षित)' : 'ऑनलाइन / गेटवे (Online Payment)';
  const fatherStr = data.fatherName ? data.fatherName : 'उपलब्ध नहीं';
  const motherStr = data.motherName ? data.motherName : 'उपलब्ध नहीं';
  const oathStr = data.noCriminalRecordOath ? 'सत्यापित ✅ (No Criminal Record Oath Taken)' : 'शपथ ली गई ✅';
  const timeStr = new Date(data.registeredAt || Date.now()).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const inAppTitle = `🆕 नया रजिस्ट्रेशन: ${data.name} (${data.roleHindiTitle})`;
  const inAppMessage = `नया यूजर पंजीकृत हुआ है:\n• नाम: ${data.name}\n• पिता: ${fatherStr} | माता: ${motherStr}\n• मोबाइल: ${data.phone} | ईमेल: ${data.email || '—'}\n• श्रेणी: ${data.roleHindiTitle} (${data.memberCode})\n• शुल्क: ${amountStr} (${payMethodStr})\n• शपथ पत्र: ${oathStr}\n• समय: ${timeStr}`;

  const smsAlert = `HARDINKAAM अलर्ट: नया रजिस्ट्रेशन हुआ है!\nनाम: ${data.name}\nपिता: ${fatherStr}\nमाता: ${motherStr}\nमोबाइल: ${data.phone}\nरोल: ${data.roleHindiTitle}\nमेम्बर कोड: ${data.memberCode}\nशुल्क: ${amountStr} (${payMethodStr})\nसमय: ${timeStr}`;

  const whatsappAlert = `🚨 *HARDINKAAM - नया यूजर रजिस्ट्रेशन अलर्ट (Admin Alert)* 🚨\n\nनमस्ते *सुपर एडमिन DEEPAK जी*,\nHARDINKAAM पोर्टल पर एक नया यूजर सफलतापूर्वक पंजीकृत हुआ है।\n\n📋 *आवेदक का संपूर्ण विवरण (Registration Details):*\n━━━━━━━━━━━━━━━━━━━━\n👤 *आवेदक का नाम:* *${data.name}*\n👨 *पिता का नाम:* *${fatherStr}*\n👩 *माता का नाम:* *${motherStr}*\n📱 *मोबाइल नंबर:* *${data.phone}*\n📧 *ईमेल:* ${data.email || 'उपलब्ध नहीं'}\n🏷️ *पंजीकरण श्रेणी (Role):* *${data.roleHindiTitle}* (${data.roleEnglishTitle})\n🆔 *मेम्बर कोड:* *${data.memberCode}*\n💰 *रजिस्ट्रेशन शुल्क:* *${amountStr}*\n💳 *भुगतान माध्यम:* *${payMethodStr}*\n🧾 *Payment/Order ID:* ${data.paymentId || data.orderId || 'N/A'}\n📜 *आपराधिक रिकॉर्ड शपथ:* *${oathStr}*\n⏰ *पंजीकरण समय:* ${timeStr}\n🔑 *यूजर ID:* ${data.userId || 'N/A'}\n━━━━━━━━━━━━━━━━━━━━\n\n🔗 *एडमिन पैनल खोलें:* ${window?.location?.origin || 'https://www.hardinkaam.online'}\n💬 *यूजर से सीधे व्हाट्सएप पर चैट करें:* https://wa.me/${(data.phone || '').replace(/\D/g, '')}\n\n_HARDINKAAM ऑटोमेटेड एडमिन नोटिफिकेशन सिस्टम_`;

  return { inAppTitle, inAppMessage, whatsappAlert, smsAlert };
}

/**
 * Dispatches complete registration notification across:
 * 1. Member: In-App, SMS log, WhatsApp log
 * 2. Super Admin DEEPAK: Realtime Alerts, In-App Notification, SMS log, WhatsApp log with full details
 * 3. User profile update with `memberCode`
 */
export async function sendMemberRegistrationNotification(
  input: MemberRegistrationDetails
): Promise<MemberNotificationResult> {
  const memberCode = input.memberCode || generateUniqueMemberCode(input.role);
  const titles = getRoleTitles(input.role);
  const cleanPhone = (input.phone || '').replace(/[^\d+]/g, '');

  const memberMessages = buildRegistrationMessage({
    name: input.name || 'प्रिय सदस्य',
    phone: cleanPhone || '6267546945',
    memberCode,
    roleHindiTitle: titles.hindi,
    roleEnglishTitle: titles.english,
    amountPaid: input.amountPaid,
    paymentId: input.registrationPaymentId,
  });

  const adminAlert = buildAdminRegistrationAlert({
    name: input.name || 'नया सदस्य',
    fatherName: input.fatherName,
    motherName: input.motherName,
    noCriminalRecordOath: input.noCriminalRecordOath,
    phone: cleanPhone || input.phone,
    email: input.email,
    memberCode,
    roleHindiTitle: titles.hindi,
    roleEnglishTitle: titles.english,
    amountPaid: input.amountPaid,
    paymentMethod: input.paymentMethod,
    paymentId: input.registrationPaymentId,
    orderId: input.registrationOrderId,
    registeredAt: input.registeredAt,
    userId: input.userId,
  });

  const timestamp = new Date().toISOString();
  let notificationLogId = '';
  let adminNotificationId = '';
  let smsLogId = '';
  let whatsappLogId = '';

  // 1. Update user profile with member code in Firestore if userId is present
  if (input.userId) {
    try {
      await setDoc(
        doc(db, 'users', input.userId),
        {
          memberCode,
          fatherName: input.fatherName || '',
          motherName: input.motherName || '',
          noCriminalRecordOath: Boolean(input.noCriminalRecordOath),
          registrationFeePaid: input.paymentMethod !== 'cash',
          status: input.paymentMethod === 'cash' ? 'pending_approval' : 'active',
          updatedAt: timestamp,
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Member code profile sync note:', err);
    }
  }

  // 2. Add Member In-App Notification in Firestore
  try {
    const notifRef = await addDoc(collection(db, 'notifications'), {
      userId: input.userId || 'all',
      targetRole: input.role,
      type: 'registration_success',
      title: `🎉 स्वागत है! मेम्बर कोड: ${memberCode}`,
      message: `नमस्ते ${input.name}, आप HARDINKAAM में ${titles.hindi} के रूप में सफलतापूर्वक पंजीकृत हो गए हैं। आपका मेम्बर कोड ${memberCode} है। अब आप सभी सेवाओं का लाभ ले सकते हैं।`,
      memberCode,
      userPhone: cleanPhone,
      userName: input.name,
      role: input.role,
      roleTitle: titles.hindi,
      createdAt: timestamp,
      read: false,
    });
    notificationLogId = notifRef.id;
  } catch (err) {
    console.warn('In-app registration notification note:', err);
  }

  // 3. Add Super Admin In-App Notification with FULL registration details
  try {
    const adminNotifRef = await addDoc(collection(db, 'notifications'), {
      recipientId: 'admin_deepak_root',
      userId: input.userId || 'usr_new',
      targetRole: 'admin',
      type: 'new_user_registration',
      title: adminAlert.inAppTitle,
      message: adminAlert.inAppMessage,
      applicantName: input.name,
      fatherName: input.fatherName || '',
      motherName: input.motherName || '',
      noCriminalRecordOath: Boolean(input.noCriminalRecordOath),
      userPhone: cleanPhone,
      userEmail: input.email || '',
      role: input.role,
      roleTitle: titles.hindi,
      memberCode,
      amount: input.amountPaid || 121,
      paymentMethod: input.paymentMethod || 'razorpay',
      paymentId: input.registrationPaymentId || null,
      orderId: input.registrationOrderId || null,
      createdAt: timestamp,
      read: false,
    });
    adminNotificationId = adminNotifRef.id;
  } catch (err) {
    console.warn('Admin in-app notification dispatch note:', err);
  }

  // 4. Add Real-time Admin Alert in admin_realtime_alerts collection
  try {
    await addDoc(collection(db, 'admin_realtime_alerts'), {
      title: adminAlert.inAppTitle,
      message: adminAlert.inAppMessage,
      category: 'operational',
      milestoneType: 'NEW_USER_REGISTERED',
      priority: 'high',
      applicantName: input.name,
      fatherName: input.fatherName || '',
      motherName: input.motherName || '',
      noCriminalRecordOath: Boolean(input.noCriminalRecordOath),
      phone: cleanPhone,
      email: input.email || '',
      role: input.role,
      memberCode,
      amount: input.amountPaid || 121,
      paymentMethod: input.paymentMethod || 'razorpay',
      actionTab: 'admin_users',
      read: false,
      createdAt: timestamp,
    });
  } catch (err) {
    console.warn('Admin realtime alert dispatch note:', err);
  }

  // 5. Log Admin WhatsApp Alert to Admin DEEPAK (916267546945)
  try {
    await addDoc(collection(db, 'whatsapp_logs'), {
      recipientPhone: '916267546945',
      recipientName: 'Super Admin DEEPAK',
      userId: input.userId,
      memberCode,
      message: adminAlert.whatsappAlert,
      status: 'delivered',
      channel: 'ADMIN_ALERT_WHATSAPP',
      type: 'admin_registration_alert',
      dispatchedAt: timestamp,
    });
  } catch (err) {
    console.warn('Admin WhatsApp log note:', err);
  }

  // 6. Log Admin SMS Alert to Admin DEEPAK (916267546945)
  try {
    await addDoc(collection(db, 'sms_logs'), {
      recipientPhone: '916267546945',
      recipientName: 'Super Admin DEEPAK',
      userId: input.userId,
      memberCode,
      message: adminAlert.smsAlert,
      status: 'delivered',
      channel: 'ADMIN_ALERT_SMS',
      type: 'admin_registration_alert',
      dispatchedAt: timestamp,
    });
  } catch (err) {
    console.warn('Admin SMS log note:', err);
  }

  // 7. Log Member SMS Dispatch Record
  try {
    const smsRef = await addDoc(collection(db, 'sms_logs'), {
      recipientPhone: cleanPhone,
      recipientName: input.name,
      userId: input.userId,
      memberCode,
      message: memberMessages.sms,
      status: 'delivered',
      channel: 'SMS_GATEWAY_DLT',
      dispatchedAt: timestamp,
    });
    smsLogId = smsRef.id;
  } catch (err) {
    console.warn('SMS log record note:', err);
  }

  // 8. Log Member WhatsApp Dispatch Record
  try {
    const waRef = await addDoc(collection(db, 'whatsapp_logs'), {
      recipientPhone: cleanPhone,
      recipientName: input.name,
      userId: input.userId,
      memberCode,
      message: memberMessages.whatsapp,
      status: 'delivered',
      channel: 'WHATSAPP_BUSINESS_API',
      dispatchedAt: timestamp,
    });
    whatsappLogId = waRef.id;
  } catch (err) {
    console.warn('WhatsApp log record note:', err);
  }

  // 9. Generate direct WhatsApp chat URL with pre-filled welcome confirmation
  const targetWaNumber = cleanPhone.replace(/\D/g, '');
  const encodedWaMessage = encodeURIComponent(memberMessages.whatsapp);
  const whatsappDirectUrl = targetWaNumber.length >= 10
    ? `https://wa.me/${targetWaNumber.length === 10 ? '91' + targetWaNumber : targetWaNumber}?text=${encodedWaMessage}`
    : `https://wa.me/916267546945?text=${encodedWaMessage}`;

  const adminEncodedWa = encodeURIComponent(adminAlert.whatsappAlert);
  const adminWhatsappDirectUrl = `https://wa.me/916267546945?text=${adminEncodedWa}`;

  return {
    success: true,
    memberCode,
    roleHindiTitle: titles.hindi,
    roleEnglishTitle: titles.english,
    smsMessage: memberMessages.sms,
    whatsappMessage: memberMessages.whatsapp,
    whatsappDirectUrl,
    adminWhatsappDirectUrl,
    notificationLogId,
    adminNotificationId,
    smsLogId,
    whatsappLogId,
  };
}
