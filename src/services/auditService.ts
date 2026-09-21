import { collection, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase/config';

export type AuditActionType =
  | 'DISTRICT_ACTIVATION'
  | 'DISTRICT_DEACTIVATION'
  | 'DISTRICT_ASSIGNMENT'
  | 'FRANCHISE_PARTNER_ASSIGN'
  | 'FRANCHISE_PARTNER_CHANGE'
  | 'FRANCHISE_PARTNER_CREATE'
  | 'FRANCHISE_PARTNER_STATUS_CHANGE'
  | 'FRANCHISE_PERMISSION_CHANGE'
  | 'DISTRICT_SETTINGS_CHANGE'
  | 'DISTRICT_SETTINGS_UPDATE'
  | 'DISTRICT_ZIP_IMPORT'
  | 'REPORT_DOWNLOAD'
  | 'SERVICE_AVAILABILITY_CHANGE'
  | 'ROLE_PERMISSION_CHANGE'
  | 'SYSTEM_SETTINGS_UPDATE'
  | 'AGREEMENT_COMPLETED'
  | 'KYC_DOCUMENT_UPLOADED'
  | 'KYC_DOCUMENT_REPLACED'
  | 'KYC_DOCUMENT_VERIFIED'
  | 'KYC_DOCUMENT_REJECTED'
  | 'KYC_SUBMITTED'
  | 'KYC_APPROVED'
  | 'KYC_SETTINGS_UPDATE';

export interface AuditLogEntry {
  id?: string;
  action: AuditActionType | string;
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  targetDistrictId?: string;
  targetDistrictName?: string;
  targetPartnerId?: string;
  target?: string;
  details: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

/**
 * Strips any sensitive fields (passwords, tokens, secret keys) before saving audit records.
 */
function sanitizeAuditPayload(obj: Record<string, any> = {}): Record<string, any> {
  const sanitized: Record<string, any> = {};
  const forbiddenKeys = [
    'password',
    'initialPassword',
    'secret',
    'razorpayKeySecret',
    'privateKey',
    'token',
    'otp',
    'apiKey',
    'credentials',
  ];

  for (const [key, value] of Object.entries(obj)) {
    if (forbiddenKeys.some((f) => key.toLowerCase().includes(f.toLowerCase()))) {
      sanitized[key] = '[REDACTED_SECURITY_DATA]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeAuditPayload(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Securely writes an audit log entry to Firestore.
 * Enforces zero storage of passwords or private secrets.
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const currentAuthUser = auth.currentUser;
    const actorId = entry.actorId || currentAuthUser?.uid || 'SYSTEM';
    const actorEmail = entry.actorEmail || currentAuthUser?.email || 'system@hardinkaam.in';

    const cleanMetadata = entry.metadata ? sanitizeAuditPayload(entry.metadata) : {};

    const payload = {
      action: entry.action,
      userId: actorId,
      userEmail: actorEmail,
      actorRole: entry.actorRole || 'admin',
      targetDistrictId: entry.targetDistrictId || null,
      targetDistrictName: entry.targetDistrictName || null,
      targetPartnerId: entry.targetPartnerId || null,
      target: entry.target || entry.targetDistrictName || entry.targetPartnerId || null,
      details: entry.details,
      metadata: cleanMetadata,
      timestamp: new Date().toISOString(),
      serverCreatedAt: serverTimestamp(),
    };

    await addDoc(collection(db, 'audit_logs'), payload);
  } catch (err) {
    // Non-blocking catch to ensure core operational workflow continues smoothly
    console.warn('Audit log write notice:', err);
  }
}

/**
 * Subscribe to real-time audit logs in Firestore (sorted by newest first)
 */
export function subscribeAuditLogs(callback: (logs: AuditLogEntry[]) => void): () => void {
  try {
    const q = collection(db, 'audit_logs');
    return onSnapshot(
      q,
      (snapshot: any) => {
        const logs: AuditLogEntry[] = [];
        snapshot.forEach((doc: any) => {
          const data = doc.data();
          logs.push({
            id: doc.id,
            action: data.action,
            actorId: data.userId || data.actorId,
            actorEmail: data.userEmail || data.actorEmail,
            actorRole: data.actorRole || 'admin',
            targetDistrictId: data.targetDistrictId,
            targetDistrictName: data.targetDistrictName,
            targetPartnerId: data.targetPartnerId,
            target: data.target || data.targetDistrictName || data.targetPartnerId,
            details: data.details,
            metadata: data.metadata,
            timestamp: data.timestamp || new Date().toISOString(),
          });
        });
        // Sort newest first
        logs.sort((a, b) => new Date(b.timestamp || '').getTime() - new Date(a.timestamp || '').getTime());
        callback(logs);
      },
      (err: any) => {
        console.warn('Audit logs listener note:', err);
      }
    );
  } catch (e) {
    console.warn('subscribeAuditLogs catch:', e);
    return () => {};
  }
}
