import {
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  ActionCodeSettings,
} from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { collection, addDoc } from 'firebase/firestore';

export interface PasswordResetSendResult {
  success: boolean;
  message: string;
  cooldownSeconds?: number;
}

export interface PasswordResetVerifyResult {
  valid: boolean;
  email?: string;
  error?: string;
  errorCode?: string;
}

export interface PasswordResetConfirmResult {
  success: boolean;
  message: string;
  error?: string;
}

// Cooldown tracking in memory to prevent rapid resend abuse
const lastRequestTimestamps = new Map<string, number>();
export const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Validates whether an email string is well-formed without disclosing account state.
 */
export function isValidEmailFormat(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  return re.test(email.trim());
}

/**
 * Validates password strength according to modern requirements:
 * - Minimum 8 characters
 * - At least one digit or symbol
 * - Not trivially weak
 */
export function validateNewPasswordStrength(password: string): {
  valid: boolean;
  score: number; // 0 to 4
  feedback: string;
} {
  if (!password) {
    return { valid: false, score: 0, feedback: 'Please enter a password / कृपया पासवर्ड दर्ज करें।' };
  }
  if (password.length < 8) {
    return {
      valid: false,
      score: 1,
      feedback: 'Password must be at least 8 characters / पासवर्ड कम से कम 8 अक्षरों का होना चाहिए।',
    };
  }

  let score = 1;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (hasUpper && hasLower) score++;
  if (hasDigit) score++;
  if (hasSpecial) score++;

  if (!hasDigit && !hasSpecial) {
    return {
      valid: false,
      score,
      feedback: 'Include at least one number or special symbol / पासवर्ड में कम से कम एक संख्या या विशेष चिह्न शामिल करें।',
    };
  }

  return { valid: true, score: Math.min(score, 4), feedback: 'Strong password / सुरक्षित पासवर्ड' };
}

/**
 * Returns remaining cooldown seconds for an email, or 0 if allowed to send now.
 */
export function getRemainingCooldown(email: string): number {
  const normalized = email.trim().toLowerCase();
  const lastTime = lastRequestTimestamps.get(normalized);
  if (!lastTime) return 0;
  const elapsed = Math.floor((Date.now() - lastTime) / 1000);
  const remaining = RESEND_COOLDOWN_SECONDS - elapsed;
  return remaining > 0 ? remaining : 0;
}

/**
 * Request password reset instructions using official Firebase Auth.
 * Follows security constitution:
 * 1. Returns a neutral message so account existence is NOT disclosed.
 * 2. Enforces client-side rate limit / cooldown.
 * 3. Never stores plaintext passwords, codes, or tokens.
 */
export async function sendOfficialPasswordResetEmail(
  rawEmail: string
): Promise<PasswordResetSendResult> {
  const email = rawEmail.trim().toLowerCase();

  if (!isValidEmailFormat(email)) {
    throw new Error('कृपया एक वैध ईमेल पता दर्ज करें (उदा. user@example.com)।');
  }

  const remainingCooldown = getRemainingCooldown(email);
  if (remainingCooldown > 0) {
    return {
      success: true,
      message: `यदि इस ईमेल के लिए अकाउंट मौजूद है, तो पासवर्ड रीसेट निर्देश भेजे जा चुके हैं। कृपया ${remainingCooldown} सेकंड बाद पुनः प्रयास करें।`,
      cooldownSeconds: remainingCooldown,
    };
  }

  // Determine current origin or production fallback
  const origin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://www.hardinkaam.online';

  const actionCodeSettings: ActionCodeSettings = {
    url: `${origin}/#reset-password`,
    handleCodeInApp: true,
  };

  try {
    await sendPasswordResetEmail(auth, email, actionCodeSettings);
  } catch (err: any) {
    const errCode = err?.code || '';
    // Security constitution: Even if user is not found or invalid-email in Firebase,
    // do NOT reveal that account does not exist.
    if (errCode === 'auth/user-not-found' || errCode === 'auth/invalid-email') {
      // Intentionally suppressed for privacy protection
    } else if (errCode === 'auth/too-many-requests') {
      throw new Error(
        'बहुत अधिक अनुरोध भेजे गए हैं। सुरक्षा कारणों से कृपया कुछ समय प्रतीक्षा करके पुनः प्रयास करें।'
      );
    } else if (errCode === 'auth/operation-not-allowed') {
      throw new Error(
        'ईमेल/पासवर्ड प्रमाणीकरण प्रदाता सक्षम नहीं है। कृपया सहायता टीम से संपर्क करें।'
      );
    } else if (errCode === 'auth/network-request-failed') {
      throw new Error(
        'नेटवर्क त्रुटि। कृपया इंटरनेट कनेक्शन जांचें और पुनः प्रयास करें।'
      );
    } else {
      console.warn('sendPasswordResetEmail notice:', errCode);
    }
  }

  // Set cooldown timestamp
  lastRequestTimestamps.set(email, Date.now());

  // Record audit notice in Firestore (NEVER storing secrets, only timestamp & masked email identifier)
  try {
    const masked = email.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => `${a}***${c}`);
    await addDoc(collection(db, 'auth_audit_events'), {
      eventType: 'PASSWORD_RESET_REQUESTED',
      maskedIdentifier: masked,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    });
  } catch (_auditErr) {
    // Non-blocking audit log
  }

  return {
    success: true,
    message:
      'यदि इस ईमेल पते से कोई अकाउंट पंजीकृत है, तो पासवर्ड रीसेट करने के निर्देश भेज दिए गए हैं। कृपया अपना इनबॉक्स और स्पैम फ़ोल्डर जांचें।',
    cooldownSeconds: RESEND_COOLDOWN_SECONDS,
  };
}

/**
 * Verifies the official Firebase oobCode (Action Code) from email link.
 * Never stores or leaks code.
 */
export async function verifyOfficialResetCode(
  actionCode: string
): Promise<PasswordResetVerifyResult> {
  if (!actionCode || typeof actionCode !== 'string') {
    return {
      valid: false,
      error: 'पासवर्ड रीसेट कोड अनुपलब्ध है। कृपया ईमेल में दिए गए लिंक पर पुनः क्लिक करें।',
      errorCode: 'missing_code',
    };
  }

  try {
    const userEmail = await verifyPasswordResetCode(auth, actionCode.trim());
    return {
      valid: true,
      email: userEmail,
    };
  } catch (err: any) {
    const code = err?.code || '';
    if (code === 'auth/expired-action-code') {
      return {
        valid: false,
        error: 'यह पासवर्ड रीसेट लिंक समाप्त (Expired) हो चुका है। सुरक्षा हेतु कृपया नया रीसेट लिंक मांगें।',
        errorCode: 'expired',
      };
    }
    if (code === 'auth/invalid-action-code') {
      return {
        valid: false,
        error: 'यह रीसेट लिंक अमान्य है या पहले ही उपयोग किया जा चुका है। कृपया नया लिंक प्राप्त करें।',
        errorCode: 'invalid',
      };
    }
    if (code === 'auth/user-disabled') {
      return {
        valid: false,
        error: 'यह खाता व्यवस्थापक द्वारा निष्क्रिय कर दिया गया है। कृपया सहायता टीम से संपर्क करें।',
        errorCode: 'disabled',
      };
    }
    return {
      valid: false,
      error: 'रीसेट लिंक सत्यापित करने में समस्या आई। कृपया पुनः प्रयास करें।',
      errorCode: code || 'unknown',
    };
  }
}

/**
 * Confirms the new password against Firebase Authentication using official API.
 * Never stores plaintext password or email action code.
 */
export async function confirmOfficialPasswordReset(
  actionCode: string,
  newPassword: string
): Promise<PasswordResetConfirmResult> {
  const strength = validateNewPasswordStrength(newPassword);
  if (!strength.valid) {
    return {
      success: false,
      message: strength.feedback,
      error: strength.feedback,
    };
  }

  try {
    await confirmPasswordReset(auth, actionCode.trim(), newPassword);

    // Audit log without password
    try {
      await addDoc(collection(db, 'auth_audit_events'), {
        eventType: 'PASSWORD_RESET_COMPLETED',
        timestamp: new Date().toISOString(),
      });
    } catch (_) {}

    return {
      success: true,
      message: 'आपका पासवर्ड सफलतापूर्वक अपडेट कर दिया गया है! अब आप नए पासवर्ड से लॉगिन कर सकते हैं।',
    };
  } catch (err: any) {
    const code = err?.code || '';
    if (code === 'auth/expired-action-code') {
      return {
        success: false,
        message: 'यह पासवर्ड रीसेट लिंक समाप्त हो चुका है। कृपया पुनः नया लिंक जनरेट करें।',
        error: 'expired',
      };
    }
    if (code === 'auth/invalid-action-code') {
      return {
        success: false,
        message: 'अमान्य रीसेट कोड। कृपया ईमेल में आए लिंक पर फिर से क्लिक करें।',
        error: 'invalid',
      };
    }
    if (code === 'auth/weak-password') {
      return {
        success: false,
        message: 'पासवर्ड पर्याप्त सुरक्षित नहीं है। कृपया अधिक मजबूत पासवर्ड चुनें।',
        error: 'weak_password',
      };
    }
    return {
      success: false,
      message: err?.message || 'पासवर्ड रीसेट करने में समस्या आई। कृपया पुनः प्रयास करें।',
      error: code || 'unknown',
    };
  }
}
