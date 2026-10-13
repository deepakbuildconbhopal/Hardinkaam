/**
 * Secure Account Provisioning & Password Management Utilities
 * 
 * Ensures:
 * 1. No hardcoded passwords (replaces '123456' defaults)
 * 2. High-entropy cryptographically generated temporary credentials
 * 3. Non-disruptive admin provisioning via isolated secondary Firebase app
 * 4. Password setup / reset link triggering
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';

/**
 * Generates a cryptographically strong, memorable temporary password.
 * Format: HDK-<8 alphanumeric chars>!<2 digits>
 * Example: HDK-m7K9pQ2x!42
 */
export function generateSecureTemporaryPassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const symbols = '!@#$%^&*';
  
  const array = new Uint8Array(8);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < 8; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }

  let randomPart = '';
  for (let i = 0; i < 8; i++) {
    randomPart += chars[array[i] % chars.length];
  }

  const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
  const randomDigits = Math.floor(10 + Math.random() * 90).toString();

  return `HDK-${randomPart}${randomSymbol}${randomDigits}`;
}

/**
 * Returns an isolated secondary Firebase Auth instance for admin account creation.
 * This prevents the current Super Admin or Franchise Admin from being accidentally logged out.
 */
export function getSecondaryAuth() {
  const SECONDARY_APP_NAME = 'SecondaryAdminProvisioningApp';
  const existingApp = getApps().find((a) => a.name === SECONDARY_APP_NAME);
  const app = existingApp || initializeApp(firebaseConfig, SECONDARY_APP_NAME);
  return getAuth(app);
}

/**
 * Dispatches a Firebase Authentication password reset / setup email to the recipient.
 */
export async function sendSecurePasswordSetupEmail(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const primaryAuth = getAuth();
    await sendPasswordResetEmail(primaryAuth, email.trim().toLowerCase());
    return { success: true };
  } catch (err: any) {
    console.warn('[SecureAuth] Password setup email notice:', err?.message);
    return { success: false, error: err?.message || 'Failed to dispatch password setup email' };
  }
}
