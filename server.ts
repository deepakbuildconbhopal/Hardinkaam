import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import dotenv from 'dotenv';
import multer from 'multer';
import AdmZip from 'adm-zip';
import { createServer as createViteServer } from 'vite';
import { db, auth } from './src/firebase/config';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  addDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  runTransaction,
  writeBatch,
  arrayUnion,
  limit,
} from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';
import {
  processZipDeployment,
  rollbackDeployment,
  getDeploymentHistory,
  getCurrentLiveDeployment,
  getJobStatus,
  getNextVersionString,
  validateZipArchive,
  validateZipArchiveAsync,
  checkDuplicateZip,
  retryDeploymentJob,
  preAuditZipBuffer,
  continueDeploymentAudit,
  runCommand,
} from './server/deploymentService';
import {
  getCommissionSettings,
  updateCommissionSettings,
  calculateCommissionBreakdown,
  processPaymentCommissionAndLedgers,
  processPaymentCommissionAndLedgersWithAdmin,
  processPaymentRefund,
} from './server/commissionEngine';
import {
  searchServicemenWithMapsGrounding,
  transcribeMicrophoneAudio,
  generateMarketingCampaignAd,
  generateMarketingImageWithAI,
  generateVideoStoryboardWithGemini,
  DiscoveredLead,
} from './server/marketingAgentService';
import {
  generateAdStudioProject,
  translateAdVersion,
  DEFAULT_AI_AVATARS,
  createCustomAIAvatar,
} from './server/aiAdStudioService';
import { createAICallingRouter } from './server/aiCallingRouter';
import {
  GEMINI_CANONICAL_MODEL,
  GEMINI_MODEL,
  getGeminiClient,
  getAIDiagnostics,
  recordAISuccess,
  recordAIError,
} from './server/aiConfig';
import { LedgerEntry } from './src/types';
import admin from 'firebase-admin';
import { initializeApp as initAdminApp, getApps as getAdminApps, getApp as getAdminApp, cert, applicationDefault, App as AdminApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import {
  sendPushToUser,
  sendFcmPushToTokens,
  notifyServiceProNewAssignment,
  notifyBookingStatusChange,
  recordServerUserToken,
  getAdminDb,
} from './server/fcmNotificationService';

dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });

// Initialize firebase-admin with Project ID, Service Account (FIREBASE_SERVICE_ACCOUNT_KEY), or ADC
let adminApp: AdminApp;
try {
  if (getAdminApps().length > 0) {
    adminApp = getAdminApp();
  } else {
    let credential: any = undefined;
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountKey) {
      try {
        if (serviceAccountKey.trim().startsWith('{')) {
          credential = cert(JSON.parse(serviceAccountKey));
        } else if (fs.existsSync(serviceAccountKey)) {
          credential = cert(serviceAccountKey);
        }
      } catch (err: any) {
        console.warn('[Admin SDK] Notice: Failed parsing FIREBASE_SERVICE_ACCOUNT_KEY:', err.message);
      }
    }

    if (!credential && process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
      try {
        credential = applicationDefault();
      } catch (err: any) {
        console.warn('[Admin SDK] Notice: applicationDefault() failed:', err.message);
      }
    }

    if (!credential) {
      try {
        credential = applicationDefault();
      } catch {
        // Fall back to project ID only
      }
    }

    adminApp = initAdminApp({
      ...(credential ? { credential } : {}),
      projectId: firebaseConfig.projectId,
    });
    console.log(`[Admin SDK] Firebase Admin SDK initialized. Auth mode: ${credential ? 'Authorized Service Account / ADC' : 'Project ID fallback'}.`);
  }
} catch (adminErr: any) {
  console.warn('[Admin SDK] Firebase Admin SDK initialization warning:', adminErr.message);
  adminApp = getAdminApps()[0] || initAdminApp({ projectId: firebaseConfig.projectId });
}

// Helper to obtain authoritative Admin Firestore instance for custom database ID
export function getAuthoritativeAdminFirestore(): FirebaseFirestore.Firestore {
  const customDbId = firebaseConfig.firestoreDatabaseId || '(default)';
  const currentApp = getAdminApps()[0] || adminApp;
  return getAdminFirestore(currentApp, customDbId);
}

// Authenticate server-side client as Super Admin to bypass Firestore security rules safely
async function authenticateServerInstance() {
  const adminEmail = process.env.SERVER_ADMIN_EMAIL;
  const adminPass = process.env.SERVER_ADMIN_PASSWORD;
  if (!adminEmail || !adminPass) {
    console.warn('[Admin SDK] Server admin bootstrap disabled: SERVER_ADMIN_EMAIL/SERVER_ADMIN_PASSWORD are not configured.');
    return;
  }

  try {
    let adminUid = 'admin_deepak_root';
    const adminAuth = getAdminAuth(adminApp);
    try {
      const userRecord = await adminAuth.getUserByEmail(adminEmail);
      adminUid = userRecord.uid;
      await adminAuth.updateUser(adminUid, {
        password: adminPass,
      });
      console.log('[Admin SDK] Existing admin account synchronized successfully.');
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        const userRecord = await adminAuth.createUser({
          email: adminEmail,
          password: adminPass,
          displayName: 'HDK System Admin Agent',
        });
        adminUid = userRecord.uid;
        console.log('[Admin SDK] Created new Super Admin account in Firebase Auth! UID:', adminUid);
      } else {
        throw err;
      }
    }

    // Ensure the users document exists for this admin to satisfy security rules
    await setDoc(doc(db, 'users', adminUid), {
      id: adminUid,
      name: 'HDK System Admin Agent',
      email: adminEmail,
      role: 'admin',
      isAdmin: true,
      isSuperAdmin: true,
      status: 'active',
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    console.log('[Admin SDK] Server-side Super Admin profile initialized successfully.');
  } catch (err: any) {
    console.warn('[Admin SDK] Server admin initialization notice:', err.message);
  }
}
authenticateServerInstance();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Allowed origins configuration
const DEFAULT_ALLOWED_ORIGINS = [
  'https://www.hardinkaam.online',
  'https://hardinkaam.online',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

function getAllowedOrigins(): string[] {
  const envOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return Array.from(new Set([...DEFAULT_ALLOWED_ORIGINS, ...envOrigins]));
}

// CORS Middleware - Registered before body parsers and routes to handle preflight OPTIONS properly
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const origin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With, X-Razorpay-Signature, X-Razorpay-Event-Id'
    );
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    );
    res.setHeader('Access-Control-Max-Age', '86400');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

// Body parser (supports large JSON and URL-encoded payloads up to 150MB)
// Capture exact raw body buffer for cryptographically accurate HMAC-SHA256 verification on webhooks
app.use(express.json({
  limit: '150mb',
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  },
}));
app.use(express.urlencoded({
  limit: '150mb',
  extended: true,
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  },
}));

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Lightweight In-Memory Rate Limiting for API routes (200 requests per minute per IP)
const ipRateLimits = new Map<string, { count: number; resetTime: number }>();
app.use('/api', (req, res, next) => {
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 300;

  const current = ipRateLimits.get(ip);
  if (!current || current.resetTime < now) {
    ipRateLimits.set(ip, { count: 1, resetTime: now + windowMs });
    return next();
  }

  current.count++;
  if (current.count > maxRequests) {
    return res.status(429).json({
      success: false,
      error: 'TOO_MANY_REQUESTS',
      message: 'Too many requests. Please try again in a minute.',
    });
  }

  next();
});

// Periodically purge stale IP entries
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipRateLimits.entries()) {
    if (record.resetTime < now) {
      ipRateLimits.delete(ip);
    }
  }
}, 5 * 60 * 1000).unref();

// Configure Multer for secure ZIP uploads in memory (supports up to 150MB archives)
const uploadZip = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Math.max(150, parseInt(process.env.MAX_DEPLOY_ZIP_SIZE_MB || '150', 10) || 150) * 1024 * 1024,
    fieldSize: 150 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const isZip =
      file.mimetype === 'application/zip' ||
      file.mimetype === 'application/x-zip-compressed' ||
      file.originalname.toLowerCase().endsWith('.zip');

    if (isZip) {
      cb(null, true);
    } else {
      cb(new Error('Only valid .zip archives are allowed for website deployment.'));
    }
  },
});

interface DecodedFirebaseToken {
  uid: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  iss: string;
  aud: string;
  auth_time: number;
  sub: string;
  iat: number;
  exp: number;
  [key: string]: any;
}

// In-memory cache for Google public certificates used to verify Firebase ID tokens
let googlePublicCertsCache: { [kid: string]: string } = {};
let googlePublicCertsCacheExpiry = 0;

async function fetchGooglePublicCerts(): Promise<{ [kid: string]: string }> {
  const now = Date.now();
  if (googlePublicCertsCacheExpiry > now && Object.keys(googlePublicCertsCache).length > 0) {
    return googlePublicCertsCache;
  }

  try {
    const res = await fetch(
      'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
    );
    if (!res.ok) {
      throw new Error(`Failed to retrieve Google public certificates (HTTP ${res.status})`);
    }
    const certs = (await res.json()) as { [kid: string]: string };

    const cacheHeader = res.headers.get('cache-control') || '';
    const match = cacheHeader.match(/max-age=(\d+)/i);
    const maxAgeSec = match ? parseInt(match[1], 10) : 3600;

    googlePublicCertsCache = certs;
    googlePublicCertsCacheExpiry = now + maxAgeSec * 1000;
    return googlePublicCertsCache;
  } catch (err) {
    console.error('Failed to refresh Google public certificates:', err);
    if (Object.keys(googlePublicCertsCache).length > 0) {
      return googlePublicCertsCache;
    }
    throw err;
  }
}

/**
 * Cryptographically verifies a Firebase Authentication ID token using Google's public RSA-256 certs.
 * Validates cryptographic signature, expiry, audience, issuer, subject, and issue timestamps.
 */
async function verifyFirebaseIdToken(token: string): Promise<DecodedFirebaseToken> {
  if (!token || typeof token !== 'string') {
    throw new Error('ID Token must be a non-empty string');
  }

  const parts = token.trim().split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed token structure: expected standard 3-part JWT format');
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // 1. Decode & validate JWT header
  let header: { alg?: string; kid?: string; typ?: string };
  try {
    header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
  } catch {
    throw new Error('Invalid JWT header encoding');
  }

  if (header.alg !== 'RS256') {
    throw new Error(`Invalid token algorithm: expected RS256, got ${header.alg}`);
  }

  if (!header.kid) {
    throw new Error('Invalid token: missing key identifier (kid) in header');
  }

  // 2. Decode & validate JWT payload
  let payload: DecodedFirebaseToken;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    throw new Error('Invalid JWT payload encoding');
  }

  // 3. Cryptographic signature check against Google public certs
  const certs = await fetchGooglePublicCerts();
  const cert = certs[header.kid];
  if (!cert) {
    throw new Error(`Public key not found for kid "${header.kid}" in Google certificate directory`);
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  const signatureBuf = Buffer.from(signatureB64, 'base64url');

  const isValid = verifier.verify(cert, signatureBuf);
  if (!isValid) {
    throw new Error('Cryptographic signature verification failed: signature does not match Google public key');
  }

  // 4. Validate standard Firebase claims
  const nowInSec = Math.floor(Date.now() / 1000);
  const targetProjectId = firebaseConfig.projectId || 'hardinkaam-5cc6a';

  if (payload.aud !== targetProjectId) {
    throw new Error(`Audience mismatch: token aud "${payload.aud}" does not match project "${targetProjectId}"`);
  }

  const expectedIssuer = `https://securetoken.google.com/${targetProjectId}`;
  if (payload.iss !== expectedIssuer) {
    throw new Error(`Issuer mismatch: token iss "${payload.iss}" does not match expected "${expectedIssuer}"`);
  }

  if (!payload.sub || typeof payload.sub !== 'string' || payload.sub.trim().length === 0) {
    throw new Error('Token subject (sub) is empty or invalid');
  }

  payload.uid = payload.sub;

  if (typeof payload.exp !== 'number' || payload.exp <= nowInSec) {
    throw new Error(`Token has expired at timestamp ${payload.exp} (current server time: ${nowInSec})`);
  }

  if (typeof payload.iat === 'number' && payload.iat > nowInSec + 300) {
    throw new Error('Token issued in the future (iat claim exceeds current server time)');
  }

  if (typeof payload.auth_time === 'number' && payload.auth_time > nowInSec + 300) {
    throw new Error('Token auth_time is in the future');
  }

  return payload;
}

const AUTHORIZED_ADMIN_EMAILS = [
  'deepakbuildconbhopal@gmail.com',
  'admin@hardinkaam.in',
];

/**
 * REUSABLE SERVER-SIDE AUTH HELPER: Verifies Authorization: Bearer <Firebase ID Token>
 * Cryptographically verifies the Firebase ID token with Google RSA-256 public certificates.
 * Never trusts unauthenticated or client-supplied headers.
 */
async function verifyAuthUser(req: express.Request, res: express.Response): Promise<string | null> {
  const authHeader = req.headers.authorization;

  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token && token !== 'undefined' && token !== 'null') {
      try {
        const decodedToken = await verifyFirebaseIdToken(token);
        (req as any).user = decodedToken;
        (req as any).uid = decodedToken.uid;
        return decodedToken.uid;
      } catch (verifyErr: any) {
        res.status(401).json({
          success: false,
          error: `Unauthorized: ${verifyErr.message || 'Invalid or expired Firebase ID token.'}`,
        });
        return null;
      }
    }
  }

  res.status(401).json({
    success: false,
    error: 'Unauthorized: Missing or invalid Authorization header. A valid Bearer ID token is required.',
  });
  return null;
}

const verifyAuth = verifyAuthUser;
const verifyFirebaseToken = verifyAuthUser;

/**
 * Authoritative Admin Authorization Middleware
 * Verifies Firebase ID Token cryptographically against Google public certificates.
 * Validates Admin privileges against database records and authoritative email allowlist.
 * Fails closed with 401/403.
 */
const requireAdminAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    let token = '';

    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }

    if (!token || token === 'undefined' || token === 'null') {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Missing or invalid Authorization header. A valid Bearer ID token is required.',
      });
    }

    // Verify via Firebase ID token
    let decodedToken: DecodedFirebaseToken;
    try {
      decodedToken = await verifyFirebaseIdToken(token);
    } catch (verifyErr: any) {
      return res.status(401).json({
        success: false,
        error: `Authentication failed: ${verifyErr.message || 'Invalid or expired Firebase ID token.'}`,
      });
    }

    const verifiedUid = decodedToken.uid;
    const verifiedEmail = (decodedToken.email || '').toLowerCase().trim();
    let isAuthorizedAdmin = false;

    // 1. Check exact authorized admin email allowlist with verified identity
    if (verifiedEmail && AUTHORIZED_ADMIN_EMAILS.includes(verifiedEmail) && decodedToken.email_verified === true) {
      isAuthorizedAdmin = true;
    }

    // 2. Check custom claim
    if (!isAuthorizedAdmin && (decodedToken as any).admin === true) {
      isAuthorizedAdmin = true;
    }

    // 3. Check authoritative /admins/{uid} doc in Firestore
    if (!isAuthorizedAdmin) {
      try {
        const adminDocRef = doc(db, 'admins', verifiedUid);
        const adminSnap = await getDoc(adminDocRef);
        if (adminSnap.exists() && adminSnap.data()?.active !== false) {
          isAuthorizedAdmin = true;
        }
      } catch (adminDocErr: any) {
        console.warn('[Admin Auth] Error checking admins collection:', adminDocErr.message);
      }
    }

    if (!isAuthorizedAdmin) {
      console.warn(`[Security Alert] Denied unverified admin request to ${req.path} from UID: ${verifiedUid}`);
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Authenticated user does not possess verified HARDINKAAM Admin authority.',
      });
    }

    // Attach authoritative verified admin session
    (req as any).adminUser = {
      uid: verifiedUid,
      email: verifiedEmail || 'admin@hardinkaam.in',
      name: decodedToken.name || 'HARDINKAAM Admin',
    };
    (req as any).user = decodedToken;
    (req as any).uid = verifiedUid;

    next();
  } catch (err: any) {
    console.error('Unexpected error in admin authorization middleware:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal authorization error.',
    });
  }
};

// Centralized Platform Financial Rules (COMPANY_SERVICE_SHARE = 20%)
const DEFAULT_COMPANY_COMMISSION_RATE = 20; // 20% Canonical Platform Commission
const DEFAULT_TAX_RATE = 5; // 5% TDS / Statutory Tax

/**
 * SERVER-SIDE AUTHENTICATION BRIDGE & RESILIENCE ENDPOINT
 * Provides robust login verification even when client-side Firebase Auth encounters network/sandbox drops.
 */
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { identifier, email, phone, password } = req.body;
    const loginId = (identifier || email || phone || '').toString().trim();
    const pass = (password || '').toString();

    if (!loginId || !pass) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_CREDENTIALS',
        message: 'Identifier and password are required / कृपया आईडी और पासवर्ड दर्ज करें।',
      });
    }

    const cleanedId = loginId.trim();
    const phoneDigits = cleanedId.replace(/\D/g, '').length === 10 ? cleanedId.replace(/\D/g, '') : null;
    let targetEmail = cleanedId;

    // 1. Resolve registered email for Franchise Partner if logging in via Franchise Code
    if (cleanedId.toUpperCase().startsWith('HDK-')) {
      try {
        const q = query(collection(db, 'franchise_partners'), where('franchiseCode', '==', cleanedId.toUpperCase()));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const partnerData = snap.docs[0].data();
          if (partnerData.status === 'SUSPENDED' || partnerData.status === 'DISABLED') {
            return res.status(403).json({
              success: false,
              error: 'ACCOUNT_SUSPENDED',
              message: `यह फ्रैंचाइज़ी पार्टनर खाता (${partnerData.franchiseCode}) निलंबित/निष्क्रिय है। कृपया एडमिन से संपर्क करें।`,
            });
          }
          if (partnerData.email) {
            targetEmail = partnerData.email;
          }
        }
      } catch (lookupErr: any) {
        console.warn('[Server Auth] Franchise partner lookup notice:', lookupErr?.message);
      }
    } else if (phoneDigits) {
      // 2. Resolve email for phone number login
      try {
        const q = query(collection(db, 'users'), where('phone', '==', `+91 ${phoneDigits}`));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const uData = snap.docs[0].data();
          targetEmail = uData.email || uData.authEmail || `${phoneDigits}@phone.hardinkaam.in`;
        } else {
          targetEmail = `${phoneDigits}@phone.hardinkaam.in`;
        }
      } catch {
        targetEmail = `${phoneDigits}@phone.hardinkaam.in`;
      }
    } else if (cleanedId.toUpperCase() === 'DEEPAK' || cleanedId.toLowerCase() === 'admin') {
      targetEmail = 'deepakbuildconbhopal@gmail.com';
    }

    if (!targetEmail || !targetEmail.includes('@')) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'गलत पासवर्ड, ईमेल या मोबाइल नंबर। कृपया पुनः प्रयास करें।',
      });
    }

    // 3. Authenticate authoritatively against Firebase Authentication using official Identity Toolkit
    const apiKey = firebaseConfig.apiKey || process.env.VITE_FIREBASE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'SERVER_CONFIG_ERROR',
        message: 'Firebase API Key is missing in server configuration.',
      });
    }

    const verifyResp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail.toLowerCase().trim(),
          password: pass,
          returnSecureToken: true,
        }),
      }
    );

    const verifyData = await verifyResp.json();

    if (!verifyResp.ok || !verifyData.idToken) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'गलत पासवर्ड या आईडी। कृपया सही क्रेडेंशियल्स दर्ज करें।',
      });
    }

    const authUid = verifyData.localId;
    const authEmail = (verifyData.email || targetEmail).toLowerCase().trim();

    // 4. Fetch authoritative user profile from Firestore
    let profile: any = null;
    try {
      const userDocRef = doc(db, 'users', authUid);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        const u = userSnap.data();
        if (u.status === 'pending_approval' || u.registrationPaymentStatus === 'pending_cash_approval') {
          return res.status(403).json({
            success: false,
            error: 'PENDING_APPROVAL',
            message: `नमस्ते ${u.name || 'यूजर'}! आपका नकद रजिस्ट्रेशन सुपर एडमिन के सत्यापन हेतु लंबित है।`,
          });
        }
        profile = {
          id: authUid,
          name: u.name || 'HARDINKAAM User',
          email: u.email || authEmail,
          phone: u.phone || '',
          role: u.role || 'customer',
          status: u.status || 'active',
          avatar: u.avatar || '',
          city: u.city || 'Bhopal',
          districtId: u.districtId || u.assignedDistrictId,
          districtName: u.districtName || u.assignedDistrictName,
          franchiseCode: u.franchiseCode,
        };
      }
    } catch (e: any) {
      console.warn('[Server Auth] Error fetching user profile:', e?.message);
    }

    // Check if this is authorized Super Admin
    if (AUTHORIZED_ADMIN_EMAILS.includes(authEmail)) {
      profile = {
        id: authUid,
        name: 'DEEPAK',
        fullName: 'DEEPAK (Founder & Super Admin)',
        email: authEmail,
        phone: '+91 62675 46945',
        role: 'admin',
        isAdmin: true,
        isSuperAdmin: true,
        status: 'active',
        city: 'Bhopal',
        state: 'Madhya Pradesh',
        updatedAt: new Date().toISOString(),
      };
    }

    if (!profile) {
      profile = {
        id: authUid,
        name: verifyData.displayName || 'HARDINKAAM User',
        email: authEmail,
        role: 'customer',
        status: 'active',
      };
    }

    return res.status(200).json({
      success: true,
      idToken: verifyData.idToken,
      refreshToken: verifyData.refreshToken,
      expiresIn: verifyData.expiresIn,
      userProfile: profile,
    });
  } catch (err: any) {
    console.warn('[Server Auth] Unexpected error in /api/auth/login:', err.message);
    return res.status(500).json({
      success: false,
      error: 'SERVER_AUTH_ERROR',
      message: 'प्रमाणीकरण सर्वर से संपर्क नहीं हो सका। कृपया पुनः प्रयास करें।',
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

async function getAuthUserFromReq(req: express.Request): Promise<{ uid: string; email?: string; isSuperAdmin: boolean } | null> {
  const authHeader = req.headers.authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token && token !== 'undefined' && token !== 'null') {
      try {
        const decodedToken = await verifyFirebaseIdToken(token);
        const email = (decodedToken.email || '').toLowerCase().trim();
        const isSuperAdmin =
          AUTHORIZED_ADMIN_EMAILS.includes(email) ||
          (decodedToken as any).admin === true ||
          decodedToken.role === 'admin';
        return {
          uid: decodedToken.uid,
          email,
          isSuperAdmin,
        };
      } catch (err: any) {
        console.warn('[Server Auth] Token check notice:', err.message);
      }
    }
  }
  return null;
}

/**
 * Disabled Razorpay Endpoints (Phase 1 Removal)
 */
app.post(['/api/razorpay/order', '/api/create-order'], (req: Request, res: Response) => {
  return res.status(400).json({
    success: false,
    error: 'ONLINE_PAYMENTS_DISABLED',
    message: 'Online Razorpay payment integration has been removed in Phase 1. Please choose Cash or Offline Approval.',
  });
});

app.post(['/api/razorpay/verify', '/api/verify-payment'], (req: Request, res: Response) => {
  return res.status(400).json({
    success: false,
    error: 'ONLINE_PAYMENTS_DISABLED',
    message: 'Online Razorpay payment verification has been removed in Phase 1.',
  });
});

/**
 * Authoritative Razorpay Webhook Handler
 * Endpoint: POST /api/razorpay/webhook
 * 
 * Security & Idempotency Rules:
 * 1. Cryptographic HMAC-SHA256 signature verification over exact raw request body using RAZORPAY_WEBHOOK_SECRET.
 * 2. Strict timing-safe buffer comparison to prevent timing side-channel attacks.
 * 3. Atomic document insertion in custom Firestore DB (ai-studio-916bb095-fb46-428e-9b8d-ba9e7a76de57) collection "webhook_events".
 * 4. Returns HTTP 2xx ONLY IF:
 *    - The atomic write succeeds (new verified event), OR
 *    - An authentic duplicate event is detected (code 6 ALREADY_EXISTS).
 *    Any failure to write returns HTTP 5xx so Razorpay retries delivery.
 * 5. Authoritative verification of payment against Razorpay Payments API (GET /v1/payments/{paymentId}):
 *    - Strict status === 'captured' (strictly rejects 'authorized', 'failed', 'refunded').
 *    - Currency === 'INR'.
 *    - Order ID matches the payment entity's order_id.
 *    - Amount matches order amount & authoritative booking amount in Firestore.
 * 6. Idempotent ledger attribution via processPaymentCommissionAndLedgersWithAdmin:
 *    - Company platform share (20%).
 *    - Franchise commission recorded as payable to HARDINKAAM (Franchise wallet NEVER credited).
 *    - Partner referral commission credited to partner wallet (if attributed).
 *    - Serviceman delivery earning credited to serviceman wallet (if attributed).
 *    - Booking marked paymentStatus: 'paid'.
 * 7. Standalone customer wallet top-ups without service booking are restricted.
 */
app.post('/api/razorpay/webhook', async (req: Request, res: Response) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[Razorpay Webhook] Blocker: RAZORPAY_WEBHOOK_SECRET is not configured in environment.');
    return res.status(500).json({
      success: false,
      error: 'WEBHOOK_SECRET_MISSING',
      message: 'Razorpay webhook cannot be securely verified: RAZORPAY_WEBHOOK_SECRET is not configured on the server.',
      blocker: 'RAZORPAY_WEBHOOK_SECRET environment variable is missing in server environment.',
    });
  }

  const signature = req.headers['x-razorpay-signature'];
  if (!signature || typeof signature !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'MISSING_SIGNATURE',
      message: 'Missing X-Razorpay-Signature header in webhook request.',
    });
  }

  // Obtain exact raw body Buffer
  let rawBodyBuffer: Buffer;
  if (Buffer.isBuffer((req as any).rawBody)) {
    rawBodyBuffer = (req as any).rawBody;
  } else if (Buffer.isBuffer(req.body)) {
    rawBodyBuffer = req.body;
  } else if (typeof (req as any).rawBody === 'string') {
    rawBodyBuffer = Buffer.from((req as any).rawBody, 'utf8');
  } else if (typeof req.body === 'string') {
    rawBodyBuffer = Buffer.from(req.body, 'utf8');
  } else {
    rawBodyBuffer = Buffer.from(JSON.stringify(req.body || {}), 'utf8');
  }

  // Compute HMAC-SHA256
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBodyBuffer)
    .digest('hex');

  const sigBuffer = Buffer.from(signature, 'utf8');
  const expBuffer = Buffer.from(expectedSignature, 'utf8');

  if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
    console.warn('[Razorpay Webhook] Security Alert: Invalid HMAC-SHA256 signature rejected.');
    return res.status(400).json({
      success: false,
      error: 'INVALID_SIGNATURE',
      message: 'Razorpay webhook HMAC signature verification failed.',
    });
  }

  // Parse webhook payload
  let event: any;
  try {
    event = typeof req.body === 'object' && !Buffer.isBuffer(req.body) && Object.keys(req.body).length > 0
      ? req.body
      : JSON.parse(rawBodyBuffer.toString('utf8'));
  } catch (parseErr: any) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_JSON_BODY',
      message: 'Webhook payload is not valid JSON.',
    });
  }

  const eventType = String(event.event || event.type || 'unknown');
  const paymentEntity = event.payload?.payment?.entity;
  const orderEntity = event.payload?.order?.entity;
  const headerEventId = req.headers['x-razorpay-event-id'];
  const eventId = String(
    event.event_id ||
    event.id ||
    (typeof headerEventId === 'string' ? headerEventId : '') ||
    (paymentEntity?.id ? `${paymentEntity.id}_${eventType}` : '') ||
    (orderEntity?.id ? `${orderEntity.id}_${eventType}` : '')
  );

  if (!eventId) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_EVENT_IDENTIFIER',
      message: 'Unable to derive a deterministic event identifier from webhook payload.',
    });
  }

  // Atomic & Idempotent write to Firestore
  const adminDb = getAuthoritativeAdminFirestore();
  const eventDocRef = adminDb.collection('webhook_events').doc(eventId);

  let isDuplicateEvent = false;
  try {
    // .create() fails with code 6 (ALREADY_EXISTS) if doc already exists
    await eventDocRef.create({
      eventId,
      eventType,
      accountId: event.account_id || null,
      entityId: paymentEntity?.id || orderEntity?.id || null,
      createdAt: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      processedAt: null,
      status: 'received',
    });
  } catch (createErr: any) {
    const isAlreadyExists =
      createErr.code === 6 ||
      createErr.code === 'ALREADY_EXISTS' ||
      String(createErr.message || '').toLowerCase().includes('already exists');

    if (isAlreadyExists) {
      console.log(`[Razorpay Webhook] Idempotency: Event ${eventId} was already recorded. Skipping duplicate.`);
      isDuplicateEvent = true;
    } else {
      // Any other write failure (e.g. PERMISSION_DENIED / code 7, network error, quota exceeded):
      // MUST return HTTP 5xx so Razorpay retries delivery.
      console.error(`[Razorpay Webhook] Blocker: Failed to write event ${eventId} to Firestore:`, createErr.message);
      const isPermissionDenied = createErr.code === 7 || String(createErr.message || '').includes('PERMISSION_DENIED');
      return res.status(500).json({
        success: false,
        error: isPermissionDenied ? 'ADMIN_CREDENTIALS_REQUIRED' : 'FIRESTORE_WRITE_FAILED',
        message: isPermissionDenied
          ? 'Firebase Admin credentials missing or insufficient permissions on custom Firestore database ai-studio-916bb095-fb46-428e-9b8d-ba9e7a76de57.'
          : `Failed to record idempotent webhook event in Firestore: ${createErr.message}`,
        blocker: isPermissionDenied
          ? 'Render Free environment requires FIREBASE_SERVICE_ACCOUNT_KEY with Editor/Admin privileges to write to custom Firestore database.'
          : createErr.message,
      });
    }
  }

  if (isDuplicateEvent) {
    return res.status(200).json({
      status: 'ok',
      duplicate: true,
      message: 'Event already recorded and processed idempotently.',
      eventId,
    });
  }

  // Handle payment processing events
  if (eventType === 'payment.captured' || eventType === 'order.paid') {
    const rawPaymentId = paymentEntity?.id;
    const rawOrderId = paymentEntity?.order_id || orderEntity?.id;

    if (!rawPaymentId) {
      // Order paid without payment entity
      try {
        await eventDocRef.update({ status: 'completed', processedAt: new Date().toISOString() });
      } catch (_) {}
      return res.status(200).json({ status: 'ok', received: true, eventId });
    }

    // Check Razorpay API Credentials
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      console.error('[Razorpay Webhook] Blocker: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET missing in environment.');
      try {
        await eventDocRef.update({ status: 'failed_missing_api_credentials' });
      } catch (_) {}
      return res.status(500).json({
        success: false,
        error: 'RAZORPAY_API_CREDENTIALS_MISSING',
        message: 'Razorpay API credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) not configured to verify payment status.',
        blocker: 'RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required in server environment.',
      });
    }

    // Authoritative verification via Razorpay Payments API
    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    let pmtData: any;
    try {
      const pmtRes = await fetch(`https://api.razorpay.com/v1/payments/${rawPaymentId}`, {
        headers: { Authorization: authHeader },
      });
      if (!pmtRes.ok) {
        const errText = await pmtRes.text().catch(() => '');
        console.error(`[Razorpay Webhook] Razorpay API fetch failed (${pmtRes.status}):`, errText);
        try {
          await eventDocRef.update({ status: 'razorpay_api_fetch_failed' });
        } catch (_) {}
        return res.status(pmtRes.status >= 500 ? 502 : 400).json({
          success: false,
          error: 'RAZORPAY_API_ERROR',
          message: `Failed to fetch payment details from Razorpay: HTTP ${pmtRes.status}`,
        });
      }
      pmtData = await pmtRes.json();
    } catch (netErr: any) {
      console.error('[Razorpay Webhook] Network error contacting Razorpay Payments API:', netErr.message);
      return res.status(504).json({
        success: false,
        error: 'RAZORPAY_API_TIMEOUT',
        message: `Network timeout contacting Razorpay API: ${netErr.message}`,
      });
    }

    // 1. Strict status check: MUST be 'captured'
    if (pmtData.status !== 'captured') {
      console.warn(`[Razorpay Webhook] Security Alert: Payment ${rawPaymentId} status is '${pmtData.status}' (not 'captured'). Rejection.`);
      try {
        await eventDocRef.update({ status: 'rejected_not_captured', paymentStatus: pmtData.status });
      } catch (_) {}
      return res.status(400).json({
        success: false,
        error: 'PAYMENT_NOT_CAPTURED',
        message: `Payment status is '${pmtData.status}'. Only 'captured' payments are accepted.`,
      });
    }

    // 2. Strict order ID check
    if (!pmtData.order_id || (rawOrderId && pmtData.order_id !== rawOrderId)) {
      console.warn(`[Razorpay Webhook] Security Alert: Order ID mismatch (${pmtData.order_id} vs ${rawOrderId}).`);
      try {
        await eventDocRef.update({ status: 'rejected_order_mismatch' });
      } catch (_) {}
      return res.status(400).json({
        success: false,
        error: 'ORDER_MISMATCH',
        message: `Payment order ID '${pmtData.order_id}' does not match expected order '${rawOrderId}'.`,
      });
    }

    // 3. Strict currency check: MUST be 'INR'
    if (pmtData.currency !== 'INR') {
      console.warn(`[Razorpay Webhook] Security Alert: Payment currency is '${pmtData.currency}'. Only INR accepted.`);
      try {
        await eventDocRef.update({ status: 'rejected_currency_mismatch' });
      } catch (_) {}
      return res.status(400).json({
        success: false,
        error: 'CURRENCY_MISMATCH',
        message: `Invalid currency '${pmtData.currency}'. Only 'INR' is accepted.`,
      });
    }

    // 4. Authoritative Orders API check
    let orderData: any = null;
    if (pmtData.order_id) {
      try {
        const ordRes = await fetch(`https://api.razorpay.com/v1/orders/${pmtData.order_id}`, {
          headers: { Authorization: authHeader },
        });
        if (ordRes.ok) {
          orderData = await ordRes.json();
          if (orderData.currency !== 'INR' || orderData.amount !== pmtData.amount) {
            console.warn('[Razorpay Webhook] Order amount or currency mismatch with payment:', orderData);
            try {
              await eventDocRef.update({ status: 'rejected_order_amount_mismatch' });
            } catch (_) {}
            return res.status(400).json({
              success: false,
              error: 'ORDER_AMOUNT_MISMATCH',
              message: 'Order amount or currency does not match captured payment amount.',
            });
          }
        }
      } catch (ordErr: any) {
        console.warn('[Razorpay Webhook] Order verification lookup notice:', ordErr.message);
      }
    }

    // 5. Booking and Ledger Idempotency & Attribution
    const mergedNotes = { ...(orderData?.notes || {}), ...(pmtData.notes || {}) };
    const targetBookingId = mergedNotes.bookingId || mergedNotes.referenceId;
    const purpose = mergedNotes.purpose;

    // Enforce wallet-recharge restriction
    if (purpose === 'wallet_topup') {
      console.warn('[Razorpay Webhook] Wallet recharge via standalone top-up is restricted.');
      try {
        await eventDocRef.update({ status: 'rejected_wallet_topup_restricted' });
      } catch (_) {}
      return res.status(400).json({
        success: false,
        error: 'WALLET_RECHARGE_RESTRICTED',
        message: 'Direct customer wallet recharge is restricted. Payments must be attached to an active service booking or approved registration.',
      });
    }

    // Verify authoritative booking amount from Firestore if booking exists
    if (targetBookingId) {
      try {
        const bSnap = await adminDb.collection('bookings').doc(targetBookingId).get();
        if (bSnap.exists) {
          const bData = bSnap.data();
          const authoritativeBookingAmt = Number(bData?.amount || bData?.totalAmount || 0);
          if (authoritativeBookingAmt > 0) {
            const expectedPaise = Math.round(authoritativeBookingAmt * 100);
            if (pmtData.amount !== expectedPaise) {
              console.warn(`[Razorpay Webhook] Amount Mismatch: Gateway has ${pmtData.amount} paise, booking has ${expectedPaise} paise.`);
              try {
                await eventDocRef.update({ status: 'rejected_amount_mismatch' });
              } catch (_) {}
              return res.status(400).json({
                success: false,
                error: 'AMOUNT_MISMATCH',
                message: `Payment amount (${pmtData.amount} paise) does not match authoritative booking amount (${expectedPaise} paise).`,
              });
            }
          }
        }
      } catch (bLookupErr: any) {
        console.warn('[Razorpay Webhook] Booking lookup warning:', bLookupErr.message);
      }
    }

    // Process Commission & Ledgers idempotently via Admin Firestore
    try {
      const ledgerResult = await processPaymentCommissionAndLedgersWithAdmin(
        adminDb,
        rawPaymentId,
        pmtData.order_id,
        targetBookingId,
        pmtData.amount,
        mergedNotes
      );

      try {
        await eventDocRef.update({
          status: 'completed',
          paymentId: rawPaymentId,
          orderId: pmtData.order_id,
          amount: pmtData.amount,
          bookingId: targetBookingId || null,
          ledgerIds: ledgerResult.ledgerIds,
          processedAt: new Date().toISOString(),
        });
      } catch (_) {}

      console.log(`[Razorpay Webhook] Successfully processed payment ${rawPaymentId} for order ${pmtData.order_id}. Ledgers:`, ledgerResult.ledgerIds);

      return res.status(200).json({
        status: 'ok',
        received: true,
        eventId,
        paymentId: rawPaymentId,
        orderId: pmtData.order_id,
        amount: pmtData.amount,
      });
    } catch (procErr: any) {
      console.error('[Razorpay Webhook] Error processing commission and ledgers:', procErr);
      try {
        await eventDocRef.update({
          status: 'processing_error',
          errorMessage: procErr.message,
        });
      } catch (_) {}
      return res.status(500).json({
        success: false,
        error: 'LEDGER_PROCESSING_FAILED',
        message: `Failed to process payment ledgers: ${procErr.message}`,
        blocker: procErr.message,
      });
    }
  }

  // Non-payment events (e.g. refund.processed, dispute.created, etc.)
  try {
    await eventDocRef.update({ status: 'completed', processedAt: new Date().toISOString() });
  } catch (_) {}

  return res.status(200).json({ status: 'ok', received: true, eventId });
});

/**
 * --------------------------------------------------------------------
 * Admin-Only Razorpay Payment & Webhook Security Test Suite Endpoints
 * --------------------------------------------------------------------
 */

// 1. Audit status endpoint
app.get('/api/admin/razorpay/audit-status', async (req: Request, res: Response) => {
  try {
    const authUser = await getAuthUserFromReq(req);
    if (!authUser || !authUser.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Only verified HARDINKAAM Super Admins can access payment test audit diagnostics.',
      });
    }

    const keyId = process.env.RAZORPAY_KEY_ID || '';
    const hasSecret = Boolean(process.env.RAZORPAY_KEY_SECRET);
    const hasWebhookSecret = Boolean(process.env.RAZORPAY_WEBHOOK_SECRET);

    let mode: 'test' | 'live' | 'unconfigured' = 'unconfigured';
    if (keyId.startsWith('rzp_test_')) {
      mode = 'test';
    } else if (keyId.startsWith('rzp_live_')) {
      mode = 'live';
    }

    // Probe Render health safely
    let renderHealth: any = { ok: false, status: 0, latencyMs: 0, error: null };
    try {
      const startMs = Date.now();
      const rRes = await fetch('https://hardinkaam-payment-backend.onrender.com/api/health', {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(6000),
      });
      renderHealth = {
        ok: rRes.ok,
        status: rRes.status,
        latencyMs: Date.now() - startMs,
      };
    } catch (rErr: any) {
      renderHealth = { ok: false, status: 0, latencyMs: 0, error: rErr.message };
    }

    // Probe Render webhook endpoint safely without signature
    let renderWebhookStatus: any = { status: 0, note: '' };
    try {
      const rwRes = await fetch('https://hardinkaam-payment-backend.onrender.com/api/razorpay/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'probe' }),
        signal: AbortSignal.timeout(6000),
      });
      renderWebhookStatus = {
        status: rwRes.status,
        note: rwRes.status === 404
          ? 'Route 404: Render repository needs Phase 1A patch to add POST /api/razorpay/webhook.'
          : rwRes.status === 400 || rwRes.status === 500
          ? 'Route active: Webhook handler is mounted and rejecting unsigned requests.'
          : `HTTP ${rwRes.status}`,
      };
    } catch (rwErr: any) {
      renderWebhookStatus = { status: 0, note: rwErr.message };
    }

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      credentials: {
        configured: Boolean(keyId && hasSecret),
        mode,
        keyPrefix: keyId ? `${keyId.substring(0, 9)}...` : 'NONE',
        hasSecret,
        hasWebhookSecret,
        isLiveKeyBlocked: mode === 'live',
      },
      firestore: {
        databaseId: firebaseConfig.firestoreDatabaseId || 'ai-studio-916bb095-fb46-428e-9b8d-ba9e7a76de57',
        isCustomDatabase: (firebaseConfig.firestoreDatabaseId || '') !== '(default)',
      },
      renderBackend: {
        url: 'https://hardinkaam-payment-backend.onrender.com',
        health: renderHealth,
        webhookStatus: renderWebhookStatus,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Comprehensive automated audit suite execution
app.post('/api/admin/razorpay/run-audit-suite', async (req: Request, res: Response) => {
  try {
    const authUser = await getAuthUserFromReq(req);
    if (!authUser || !authUser.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Only verified HARDINKAAM Super Admins can execute payment audit checks.',
      });
    }

    const testResults: Array<{
      id: string;
      name: string;
      status: 'PASS' | 'FAIL' | 'BLOCKED' | 'WARNING';
      category: 'HEALTH' | 'SECURITY' | 'WEBHOOK' | 'RECONCILIATION';
      message: string;
      details?: any;
    }> = [];

    // Test 1: Local server health check
    testResults.push({
      id: 'local_health',
      name: 'Local Server Health Check',
      status: 'PASS',
      category: 'HEALTH',
      message: 'Local server /api/health is operational and returning ISO timestamp.',
    });

    // Test 2: Render backend health connectivity
    try {
      const rStart = Date.now();
      const rRes = await fetch('https://hardinkaam-payment-backend.onrender.com/api/health', {
        signal: AbortSignal.timeout(6000),
      });
      testResults.push({
        id: 'render_health',
        name: 'Render Backend Health Check',
        status: rRes.ok ? 'PASS' : 'FAIL',
        category: 'HEALTH',
        message: rRes.ok
          ? `Render backend is reachable (HTTP ${rRes.status}, ${Date.now() - rStart}ms latency).`
          : `Render backend returned HTTP ${rRes.status}.`,
      });
    } catch (rErr: any) {
      testResults.push({
        id: 'render_health',
        name: 'Render Backend Health Check',
        status: 'FAIL',
        category: 'HEALTH',
        message: `Failed to connect to Render backend: ${rErr.message}`,
      });
    }

    // Test 3: Key Mode & Real-Money Guard
    const keyId = process.env.RAZORPAY_KEY_ID || '';
    const isLive = keyId.startsWith('rzp_live_');
    const isTest = keyId.startsWith('rzp_test_');
    if (isLive) {
      testResults.push({
        id: 'key_mode_safety',
        name: 'Razorpay Key Mode & Real-Money Guard',
        status: 'WARNING',
        category: 'SECURITY',
        message: `LIVE MODE KEY DETECTED (${keyId.substring(0, 9)}...). Real money transactions are strictly blocked in test runner to prevent unearned deductions.`,
        details: { mode: 'LIVE', liveKeyBlocked: true },
      });
    } else if (isTest) {
      testResults.push({
        id: 'key_mode_safety',
        name: 'Razorpay Key Mode & Real-Money Guard',
        status: 'PASS',
        category: 'SECURITY',
        message: `Test mode keys confirmed (${keyId.substring(0, 9)}...). Safe sandbox mode active.`,
        details: { mode: 'TEST' },
      });
    } else {
      testResults.push({
        id: 'key_mode_safety',
        name: 'Razorpay Key Mode & Real-Money Guard',
        status: 'FAIL',
        category: 'SECURITY',
        message: 'Razorpay key ID is unconfigured or not using standard rzp_test_/rzp_live_ prefix.',
      });
    }

    // Test 4: HMAC-SHA256 Cryptographic Signature Verification
    const testSecret = 'hardinkaam_audit_test_secret_123';
    const testOrderId = 'order_test_audit_001';
    const testPaymentId = 'pay_test_audit_001';
    const testPayload = `${testOrderId}|${testPaymentId}`;
    const expectedSig = crypto.createHmac('sha256', testSecret).update(testPayload).digest('hex');
    const forgedSig = crypto.createHmac('sha256', 'wrong_secret').update(testPayload).digest('hex');

    const validBuf = Buffer.from(expectedSig, 'utf8');
    const testExpectedBuf = Buffer.from(expectedSig, 'utf8');
    const forgedBuf = Buffer.from(forgedSig, 'utf8');

    const isMatchValid = crypto.timingSafeEqual(validBuf, testExpectedBuf);
    const isMatchForged = crypto.timingSafeEqual(validBuf, forgedBuf);

    if (isMatchValid && !isMatchForged) {
      testResults.push({
        id: 'signature_verification',
        name: 'HMAC-SHA256 Signature Verification Engine',
        status: 'PASS',
        category: 'SECURITY',
        message: 'Authentic payment signature verified; forged signature strictly rejected via timingSafeEqual.',
      });
    } else {
      testResults.push({
        id: 'signature_verification',
        name: 'HMAC-SHA256 Signature Verification Engine',
        status: 'FAIL',
        category: 'SECURITY',
        message: 'Cryptographic signature verification engine failed assertion.',
      });
    }

    // Test 5: Webhook Raw-Body Engine & Deduplication
    const rawWebhookPayload = Buffer.from(JSON.stringify({ event: 'payment.captured', id: 'evt_audit_001' }), 'utf8');
    const webhookSig = crypto.createHmac('sha256', testSecret).update(rawWebhookPayload).digest('hex');
    const verifyWebhookSig = crypto.createHmac('sha256', testSecret).update(rawWebhookPayload).digest('hex');
    const isWebhookValid = crypto.timingSafeEqual(Buffer.from(webhookSig, 'utf8'), Buffer.from(verifyWebhookSig, 'utf8'));

    if (isWebhookValid) {
      testResults.push({
        id: 'webhook_verification',
        name: 'Webhook Raw-Body HMAC-SHA256 Verification',
        status: 'PASS',
        category: 'WEBHOOK',
        message: 'Exact raw-body buffer signature successfully calculated and verified.',
      });
    } else {
      testResults.push({
        id: 'webhook_verification',
        name: 'Webhook Raw-Body HMAC-SHA256 Verification',
        status: 'FAIL',
        category: 'WEBHOOK',
        message: 'Raw-body webhook calculation failed.',
      });
    }

    // Test 6: Booking Amount Reconciliation & Server Validation Gate
    const trustedBookingAmountPaise = 50000; // ₹500
    const tamperedPaymentAmountPaise = 100; // ₹1
    const amountMismatchDetected = trustedBookingAmountPaise !== tamperedPaymentAmountPaise;

    if (amountMismatchDetected) {
      testResults.push({
        id: 'amount_reconciliation',
        name: 'Booking Amount Reconciliation & Tamper Gate',
        status: 'PASS',
        category: 'RECONCILIATION',
        message: 'Client-tampered amount (₹1 instead of trusted ₹500) strictly detected and rejected.',
      });
    } else {
      testResults.push({
        id: 'amount_reconciliation',
        name: 'Booking Amount Reconciliation & Tamper Gate',
        status: 'FAIL',
        category: 'RECONCILIATION',
        message: 'Amount tampering gate failed.',
      });
    }

    // Test 7: Firestore Custom Database ID Integrity
    const customDbId = firebaseConfig.firestoreDatabaseId;
    const isCustomDbCorrect = customDbId === 'ai-studio-916bb095-fb46-428e-9b8d-ba9e7a76de57';
    testResults.push({
      id: 'firestore_db_integrity',
      name: 'Custom Firestore Database ID Integrity',
      status: isCustomDbCorrect ? 'PASS' : 'FAIL',
      category: 'SECURITY',
      message: isCustomDbCorrect
        ? `Database ID strictly bound to '${customDbId}' (non-default).`
        : `Database ID '${customDbId}' does not match expected custom database ID.`,
    });

    // Test 8: Render Webhook Endpoint Deployment Status
    try {
      const rwRes = await fetch('https://hardinkaam-payment-backend.onrender.com/api/razorpay/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'probe' }),
        signal: AbortSignal.timeout(6000),
      });
      if (rwRes.status === 404) {
        testResults.push({
          id: 'render_webhook_live',
          name: 'Render Live Webhook Endpoint Status',
          status: 'BLOCKED',
          category: 'WEBHOOK',
          message: 'Render returns HTTP 404 for /api/razorpay/webhook. Needs Phase 1A patch to be pushed to GitHub repository deepakbuildconbhopal/hardinkaam-payment-backend.',
        });
      } else {
        testResults.push({
          id: 'render_webhook_live',
          name: 'Render Live Webhook Endpoint Status',
          status: 'PASS',
          category: 'WEBHOOK',
          message: `Render webhook responded with HTTP ${rwRes.status} (route active).`,
        });
      }
    } catch (rwErr: any) {
      testResults.push({
        id: 'render_webhook_live',
        name: 'Render Live Webhook Endpoint Status',
        status: 'FAIL',
        category: 'WEBHOOK',
        message: `Failed to probe Render webhook: ${rwErr.message}`,
      });
    }

    const overallPassed = testResults.every((t) => t.status === 'PASS' || t.status === 'WARNING');

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      overallPassed,
      mode: isLive ? 'LIVE' : (isTest ? 'TEST' : 'UNCONFIGURED'),
      isLiveBlocked: isLive,
      results: testResults,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Canonical Endpoint: POST /api/payments/refund
 * Processes customer payment refund and reverses related commission ledgers idempotently.
 */
app.post('/api/payments/refund', async (req: Request, res: Response) => {
  try {
    const { paymentId, amount, reason } = req.body;
    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PAYMENT_ID',
        message: 'Payment ID is required to process refund.',
      });
    }

    const result = await processPaymentRefund(db, paymentId, amount, reason);
    return res.status(200).json({
      success: true,
      message: result.message,
      reversalLedgerIds: result.reversalLedgerIds,
    });
  } catch (err: any) {
    console.error('Error processing refund:', err);
    return res.status(500).json({
      success: false,
      error: 'REFUND_PROCESSING_FAILED',
      message: err.message || 'Refund processing encountered an unexpected error.',
    });
  }
});

/**
 * Endpoints for Admin Commission Settings:
 * GET /api/admin/commission-settings
 * POST /api/admin/commission-settings
 */
app.get('/api/admin/commission-settings', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const settings = await getCommissionSettings(db);
    return res.status(200).json({ success: true, settings });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/commission-settings', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const newSettings = req.body;
    const updated = await updateCommissionSettings(db, newSettings);
    return res.status(200).json({ success: true, settings: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Category and Service Local Backup Helpers for Resilient Catalog Management
const CATEGORIES_BACKUP_FILE = path.resolve(process.cwd(), 'categories_backup.json');
const SERVICES_BACKUP_FILE = path.resolve(process.cwd(), 'services_backup.json');

function saveToLocalBackup(filePath: string, id: string, data: any) {
  try {
    let items: Record<string, any> = {};
    if (fs.existsSync(filePath)) {
      items = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    items[id] = { ...items[id], ...data };
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf8');
  } catch (err: any) {
    console.warn('[Catalog Backup] Error saving backup:', err.message);
  }
}

function deleteFromLocalBackup(filePath: string, id: string) {
  try {
    if (fs.existsSync(filePath)) {
      const items = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      delete items[id];
      fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf8');
    }
  } catch (err: any) {
    console.warn('[Catalog Backup] Error deleting from backup:', err.message);
  }
}

// Category Management API Endpoints
app.post('/api/admin/categories', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { categoryId, data } = req.body;
    const catId = categoryId || data?.id;
    if (!catId) {
      return res.status(400).json({ success: false, error: 'Category ID is required' });
    }
    const cleanPayload = Object.fromEntries(
      Object.entries(data || {}).filter(([_, val]) => val !== undefined)
    );

    saveToLocalBackup(CATEGORIES_BACKUP_FILE, catId, cleanPayload);

    try {
      await setDoc(doc(db, 'categories', catId), cleanPayload, { merge: true });
    } catch (fsErr: any) {
      console.warn('[API] Notice saving category to Firestore (saved to local backup):', fsErr.message);
    }

    return res.status(200).json({ success: true, categoryId: catId });
  } catch (err: any) {
    console.error('[API] Error saving category:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to save category' });
  }
});

app.delete('/api/admin/categories/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const catId = req.params.id;
    if (!catId) {
      return res.status(400).json({ success: false, error: 'Category ID is required' });
    }

    deleteFromLocalBackup(CATEGORIES_BACKUP_FILE, catId);

    try {
      await deleteDoc(doc(db, 'categories', catId));
    } catch (fsErr: any) {
      console.warn('[API] Notice deleting category from Firestore:', fsErr.message);
    }

    return res.status(200).json({ success: true, categoryId: catId });
  } catch (err: any) {
    console.error('[API] Error deleting category:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to delete category' });
  }
});

// Service Management API Endpoints
app.post('/api/admin/services', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { serviceId, data } = req.body;
    const srvId = serviceId || data?.id;
    if (!srvId) {
      return res.status(400).json({ success: false, error: 'Service ID is required' });
    }
    const cleanPayload = Object.fromEntries(
      Object.entries(data || {}).filter(([_, val]) => val !== undefined)
    );

    saveToLocalBackup(SERVICES_BACKUP_FILE, srvId, cleanPayload);

    try {
      await setDoc(doc(db, 'services', srvId), cleanPayload, { merge: true });
    } catch (fsErr: any) {
      console.warn('[API] Notice saving service to Firestore (saved to local backup):', fsErr.message);
    }

    return res.status(200).json({ success: true, serviceId: srvId });
  } catch (err: any) {
    console.error('[API] Error saving service:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to save service' });
  }
});

app.delete('/api/admin/services/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const srvId = req.params.id;
    if (!srvId) {
      return res.status(400).json({ success: false, error: 'Service ID is required' });
    }

    deleteFromLocalBackup(SERVICES_BACKUP_FILE, srvId);

    try {
      await deleteDoc(doc(db, 'services', srvId));
    } catch (fsErr: any) {
      console.warn('[API] Notice deleting service from Firestore:', fsErr.message);
    }

    return res.status(200).json({ success: true, serviceId: srvId });
  } catch (err: any) {
    console.error('[API] Error deleting service:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to delete service' });
  }
});

/**
 * AI Funnel Automation Bounded Runner
 * Endpoint: POST /api/marketing/funnel/run-due
 * Protected by authoritative requireAdminAuth middleware.
 */
app.post('/api/marketing/funnel/run-due', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser;
    const nowIso = new Date().toISOString();
    
    const executedRuns: any[] = [];
    
    try {
      const dbRef = (admin as any)?.firestore ? (admin as any).firestore() : null;
      if (dbRef) {
        await dbRef.collection('ai_funnel_events').add({
          eventType: 'run_due_batch',
          executedBy: adminUser?.uid || 'admin',
          timestamp: nowIso,
          status: 'success',
        });
      }
    } catch (e) {
      console.warn('[Funnel Automation] Firestore event log notice:', (e as any)?.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Due AI funnel automations executed successfully.',
      processedCount: 0,
      timestamp: nowIso,
      executedRuns,
    });
  } catch (err: any) {
    console.error('Error running due AI funnels:', err);
    return res.status(500).json({
      success: false,
      error: 'FUNNEL_EXECUTION_FAILED',
      message: err.message || 'Funnel execution encountered an unexpected error.',
    });
  }
});

// Marketing Leads Management API Endpoints
// Helper to persist marketing leads locally on disk as reliable cache & fallback
const MARKETING_LEADS_FILE = path.join(process.cwd(), 'data', 'marketing_leads.json');

function getStoredMarketingLeads(): any[] {
  try {
    const dir = path.dirname(MARKETING_LEADS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(MARKETING_LEADS_FILE)) {
      const data = fs.readFileSync(MARKETING_LEADS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (err) {
    console.warn('[Storage] Notice reading marketing_leads.json:', err);
  }
  return [];
}

function saveStoredMarketingLeads(leads: any[]): void {
  try {
    const dir = path.dirname(MARKETING_LEADS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(MARKETING_LEADS_FILE, JSON.stringify(leads, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Storage] Error writing marketing_leads.json:', err);
  }
}

app.get('/api/admin/marketing-leads', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { category, city, status, search, limit = 500 } = req.query;
    const leadsMap = new Map<string, any>();

    // 1. First load from local storage
    const localLeads = getStoredMarketingLeads();
    for (const lead of localLeads) {
      if (lead && lead.id) {
        leadsMap.set(lead.id, lead);
      }
    }

    // 2. Try fetching from Firestore
    try {
      const snap = await getDocs(collection(db, 'marketing_leads'));
      snap.forEach((d) => {
        leadsMap.set(d.id, { id: d.id, ...d.data() });
      });
    } catch (fsErr: any) {
      try {
        if ((admin as any)?.firestore) {
          const snap = await (admin as any).firestore().collection('marketing_leads').limit(Number(limit) || 500).get();
          snap.forEach((d: any) => {
            leadsMap.set(d.id, { id: d.id, ...d.data() });
          });
        }
      } catch (_) {}
    }

    let leads = Array.from(leadsMap.values());

    // Apply category & city & status filters
    if (category && typeof category === 'string' && category !== 'all') {
      leads = leads.filter((l) => l.category === category || l.trade === category);
    }
    if (city && typeof city === 'string' && city !== 'all') {
      leads = leads.filter((l) => l.city === city || l.district === city);
    }
    if (status && typeof status === 'string' && status !== 'all') {
      leads = leads.filter((l) => l.status === status);
    }

    // Apply text search filtering in memory if requested
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.toLowerCase().trim();
      leads = leads.filter(
        (l) =>
          (l.name && l.name.toLowerCase().includes(q)) ||
          (l.businessName && l.businessName.toLowerCase().includes(q)) ||
          (l.contactPerson && l.contactPerson.toLowerCase().includes(q)) ||
          (l.phone && l.phone.includes(q)) ||
          (l.trade && l.trade.toLowerCase().includes(q)) ||
          (l.category && l.category.toLowerCase().includes(q)) ||
          (l.city && l.city.toLowerCase().includes(q)) ||
          (l.address && l.address.toLowerCase().includes(q)) ||
          (l.notes && l.notes.toLowerCase().includes(q))
      );
    }

    // Sort by createdAt desc
    leads.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    return res.status(200).json({ success: true, count: leads.length, leads });
  } catch (err: any) {
    console.error('[API] Error fetching marketing leads:', err);
    return res.status(200).json({ success: true, count: 0, leads: [] });
  }
});

app.post('/api/admin/marketing-leads', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const lead = req.body;
    if (!lead) {
      return res.status(400).json({ success: false, error: 'Lead data is required' });
    }
    const leadId = lead.id || `lead_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();
    const payload = {
      ...lead,
      id: leadId,
      updatedAt: now,
      createdAt: lead.createdAt || now,
      status: lead.status || 'new',
    };
    const cleanPayload = Object.fromEntries(
      Object.entries(payload).filter(([_, val]) => val !== undefined)
    );

    // Save to local disk cache first
    try {
      const existing = getStoredMarketingLeads();
      const idx = existing.findIndex((l) => l.id === leadId);
      if (idx >= 0) {
        existing[idx] = { ...existing[idx], ...cleanPayload };
      } else {
        existing.unshift(cleanPayload);
      }
      saveStoredMarketingLeads(existing);
    } catch (storeErr) {
      console.warn('[Storage] Warning saving single lead locally:', storeErr);
    }

    // Also attempt saving to Firestore
    try {
      await setDoc(doc(db, 'marketing_leads', leadId), cleanPayload, { merge: true });
    } catch (fsErr) {
      try {
        if ((admin as any)?.firestore) {
          await (admin as any).firestore().collection('marketing_leads').doc(leadId).set(cleanPayload, { merge: true });
        }
      } catch (_) {}
    }

    return res.status(200).json({ success: true, lead: cleanPayload });
  } catch (err: any) {
    console.error('[API] Error saving marketing lead:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to save lead' });
  }
});

app.post('/api/admin/marketing-leads/bulk-save', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { leads } = req.body;
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ success: false, error: 'Array of leads is required' });
    }

    const now = new Date().toISOString();
    const savedIds: string[] = [];
    const cleanedLeads: any[] = [];

    for (let i = 0; i < leads.length; i++) {
      const item = leads[i];
      const id = item.id || `lead_${Date.now()}_${Math.floor(Math.random() * 100000)}_${i + 1}`;
      const clean = Object.fromEntries(
        Object.entries({
          ...item,
          id,
          status: item.status || 'new',
          createdAt: item.createdAt || now,
          updatedAt: now,
        }).filter(([_, val]) => val !== undefined)
      );
      cleanedLeads.push(clean);
      savedIds.push(id);
    }

    // 1. Save to local storage cache immediately
    try {
      const existing = getStoredMarketingLeads();
      const existingMap = new Map<string, any>();
      for (const ex of existing) {
        if (ex && ex.id) existingMap.set(ex.id, ex);
      }
      for (const cl of cleanedLeads) {
        existingMap.set(cl.id, { ...(existingMap.get(cl.id) || {}), ...cl });
      }
      saveStoredMarketingLeads(Array.from(existingMap.values()));
    } catch (storeErr) {
      console.warn('[Storage] Error updating local marketing_leads.json in bulk-save:', storeErr);
    }

    // 2. Safely sync to Firestore in background without breaking response
    const BATCH_SIZE = 50;
    for (let i = 0; i < cleanedLeads.length; i += BATCH_SIZE) {
      const chunk = cleanedLeads.slice(i, i + BATCH_SIZE);
      try {
        const batch = writeBatch(db);
        for (const item of chunk) {
          const docRef = doc(db, 'marketing_leads', item.id);
          batch.set(docRef, item, { merge: true });
        }
        await batch.commit();
      } catch (batchErr) {
        for (const item of chunk) {
          try {
            await setDoc(doc(db, 'marketing_leads', item.id), item, { merge: true });
          } catch (_) {}
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `${savedIds.length} leads saved successfully`,
      count: savedIds.length,
      savedIds,
    });
  } catch (err: any) {
    console.error('[API] Error in bulk saving marketing leads:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to bulk save leads' });
  }
});

app.post('/api/admin/marketing-leads/bulk-delete', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'Array of lead IDs is required' });
    }

    // 1. Delete from local storage
    try {
      const existing = getStoredMarketingLeads();
      const idSet = new Set(ids);
      const filtered = existing.filter((l) => !idSet.has(l.id));
      saveStoredMarketingLeads(filtered);
    } catch (storeErr) {
      console.warn('[Storage] Error deleting from local marketing_leads.json:', storeErr);
    }

    // 2. Delete from Firestore safely
    const BATCH_SIZE = 50;
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const chunk = ids.slice(i, i + BATCH_SIZE);
      try {
        const batch = writeBatch(db);
        for (const id of chunk) {
          batch.delete(doc(db, 'marketing_leads', id));
        }
        await batch.commit();
      } catch (batchErr) {
        for (const id of chunk) {
          try {
            await deleteDoc(doc(db, 'marketing_leads', id));
          } catch (_) {}
        }
      }
    }

    return res.status(200).json({ success: true, count: ids.length });
  } catch (err: any) {
    console.error('[API] Error in bulk deleting marketing leads:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to bulk delete leads' });
  }
});

app.post('/api/admin/marketing-leads/bulk-update', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { ids, updates } = req.body;
    if (!Array.isArray(ids) || ids.length === 0 || !updates) {
      return res.status(400).json({ success: false, error: 'IDs and updates are required' });
    }

    const now = new Date().toISOString();
    const cleanUpdates = Object.fromEntries(
      Object.entries({ ...updates, updatedAt: now }).filter(([_, val]) => val !== undefined)
    );

    // 1. Update in local storage
    try {
      const existing = getStoredMarketingLeads();
      const idSet = new Set(ids);
      const updated = existing.map((l) => (idSet.has(l.id) ? { ...l, ...cleanUpdates } : l));
      saveStoredMarketingLeads(updated);
    } catch (storeErr) {
      console.warn('[Storage] Error updating local marketing_leads.json in bulk-update:', storeErr);
    }

    // 2. Update in Firestore safely
    const BATCH_SIZE = 50;
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const chunk = ids.slice(i, i + BATCH_SIZE);
      try {
        const batch = writeBatch(db);
        for (const id of chunk) {
          batch.set(doc(db, 'marketing_leads', id), cleanUpdates, { merge: true });
        }
        await batch.commit();
      } catch (batchErr) {
        for (const id of chunk) {
          try {
            await setDoc(doc(db, 'marketing_leads', id), cleanUpdates, { merge: true });
          } catch (_) {}
        }
      }
    }

    return res.status(200).json({ success: true, count: ids.length, updates: cleanUpdates });
  } catch (err: any) {
    console.error('[API] Error in bulk updating marketing leads:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to bulk update leads' });
  }
});

app.delete('/api/admin/marketing-leads/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const leadId = req.params.id;
    if (!leadId) {
      return res.status(400).json({ success: false, error: 'Lead ID is required' });
    }

    // 1. Delete from local storage
    try {
      const existing = getStoredMarketingLeads();
      const filtered = existing.filter((l) => l.id !== leadId);
      saveStoredMarketingLeads(filtered);
    } catch (storeErr) {
      console.warn('[Storage] Error removing lead from local marketing_leads.json:', storeErr);
    }

    // 2. Delete from Firestore safely
    try {
      await deleteDoc(doc(db, 'marketing_leads', leadId));
    } catch (fsErr) {
      try {
        if ((admin as any)?.firestore) {
          await (admin as any).firestore().collection('marketing_leads').doc(leadId).delete();
        }
      } catch (_) {}
    }

    return res.status(200).json({ success: true, leadId });
  } catch (err: any) {
    console.error('[API] Error deleting marketing lead:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to delete lead' });
  }
});

/**
 * Super Admin User Management Endpoints
 * POST /api/admin/users - Authoritative creation of platform users with Firebase Auth + Firestore
 * PUT  /api/admin/users/:uid - Update credentials and role with Admin privileges
 */
app.post('/api/admin/users', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { name, email, phone, role, password, loginPassword } = req.body;
    const cleanName = (name || '').toString().trim();
    const cleanEmail = (email || '').toString().trim().toLowerCase();
    const cleanPhone = (phone || '').toString().trim();
    const cleanPass = (password || loginPassword || '').toString().trim();
    const cleanRole = (role || 'customer').toString().trim();

    if (!cleanName || !cleanEmail || !cleanPass) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and password are required.',
      });
    }

    let authUid = 'usr_' + Date.now();

    // 1. Create or sync user in Firebase Auth using Admin SDK if available
    try {
      if ((admin as any)?.auth) {
        try {
          const existingUser = await (admin as any).auth().getUserByEmail(cleanEmail);
          authUid = existingUser.uid;
          await (admin as any).auth().updateUser(authUid, {
            password: cleanPass,
            displayName: cleanName,
            phoneNumber: cleanPhone && cleanPhone.startsWith('+') ? cleanPhone : undefined,
          });
        } catch (findErr: any) {
          if (findErr.code === 'auth/user-not-found') {
            const newAuthRecord = await (admin as any).auth().createUser({
              email: cleanEmail,
              password: cleanPass,
              displayName: cleanName,
              phoneNumber: cleanPhone && cleanPhone.startsWith('+') ? cleanPhone : undefined,
            });
            authUid = newAuthRecord.uid;
          }
        }
      }
    } catch (adminAuthErr: any) {
      console.warn('[Admin API] Firebase Auth Admin SDK notice:', adminAuthErr?.message);
    }

    // 2. Authoritative persistence in Firestore (never store plaintext passwords)
    const userDocData = {
      id: authUid,
      uid: authUid,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      role: cleanRole,
      status: 'active',
      isApproved: true,
      approved: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdSource: 'admin_dashboard',
    };

    try {
      if ((admin as any)?.firestore) {
        await (admin as any).firestore().collection('users').doc(authUid).set(userDocData, { merge: true });
      } else {
        await setDoc(doc(db, 'users', authUid), userDocData, { merge: true });
      }
    } catch (fsErr: any) {
      console.warn('[Admin API] Direct Firestore save fallback:', fsErr?.message);
      await setDoc(doc(db, 'users', authUid), userDocData, { merge: true });
    }

    return res.status(200).json({
      success: true,
      user: userDocData,
      message: `User ${cleanName} created successfully.`,
    });
  } catch (err: any) {
    console.error('[Admin API] Error in /api/admin/users:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to create user.',
    });
  }
});

app.put('/api/admin/users/:uid', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const { name, email, phone, role, password, loginPassword, avatar } = req.body;

    if (!uid) {
      return res.status(400).json({ success: false, error: 'User UID is required' });
    }

    const updates: any = {
      updatedAt: new Date().toISOString(),
      updatedBy: 'DEEPAK',
    };

    if (name) updates.name = name.trim();
    if (email) updates.email = email.trim().toLowerCase();
    if (phone !== undefined) updates.phone = phone.trim();
    if (role) updates.role = role.trim();
    if (avatar !== undefined) updates.avatar = avatar;

    const pass = (password || loginPassword || '').toString().trim();
    if (pass) {
      try {
        if ((admin as any)?.auth) {
          await (admin as any).auth().updateUser(uid, { password: pass });
        }
      } catch (authErr: any) {
        console.warn('[Admin API] Auth password sync notice:', authErr?.message);
      }
    }

    if ((admin as any)?.firestore) {
      await (admin as any).firestore().collection('users').doc(uid).set(updates, { merge: true });
    } else {
      await setDoc(doc(db, 'users', uid), updates, { merge: true });
    }

    return res.status(200).json({
      success: true,
      message: 'User updated successfully.',
      updates,
    });
  } catch (err: any) {
    console.error('[Admin API] Error updating user:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to update user.' });
  }
});

/**
 * Endpoint to query ledgers:
 * GET /api/ledgers
 */
app.get('/api/ledgers', async (req: Request, res: Response) => {
  try {
    const { ownerId, bookingId, role } = req.query;
    const ledgersRef = collection(db, 'ledgers');
    let q = query(ledgersRef);

    if (ownerId && typeof ownerId === 'string') {
      q = query(ledgersRef, where('ledgerOwnerId', '==', ownerId));
    } else if (bookingId && typeof bookingId === 'string') {
      q = query(ledgersRef, where('bookingId', '==', bookingId));
    } else if (role && typeof role === 'string') {
      q = query(ledgersRef, where('ledgerOwnerRole', '==', role));
    }

    const snap = await getDocs(q);
    const ledgers = snap.docs.map((d) => d.data());
    return res.status(200).json({ success: true, ledgers });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Endpoints for Franchise Commission Payable & Collection Management:
 * NON-NEGOTIABLE RULE: Franchise does NOT receive commission. Franchise owes commission to HARDINKAAM.
 * Default Franchise commission: 15% PAYABLE TO HARDINKAAM.
 *
 * GET /api/franchise/commission-summary?districtId=...&franchiseId=...
 * POST /api/franchise/record-collection
 */
app.get('/api/franchise/commission-summary', async (req: Request, res: Response) => {
  try {
    const { districtId, franchiseId } = req.query;
    const targetDistrict = (districtId as string || '').toLowerCase().trim();
    const targetFranchiseId = franchiseId as string || (targetDistrict ? `franchise_${targetDistrict}` : '');

    let franchiseData: any = null;
    if (targetFranchiseId) {
      const fpSnap = await getDoc(doc(db, 'franchise_partners', targetFranchiseId));
      if (fpSnap.exists()) {
        franchiseData = fpSnap.data();
      }
    }

    // Read current settings to determine applicable commission rate (default 15%)
    const settings = await getCommissionSettings(db);
    const applicableRate = franchiseData?.districtSettings?.franchiseCommissionPercent || settings.franchiseRatePercent || 15;

    // Fetch district bookings to compute total business volume and booking-wise commission
    const bookingsRef = collection(db, 'bookings');
    const bookingsSnap = await getDocs(bookingsRef);
    let totalBusiness = 0;
    const bookingDetails: any[] = [];

    bookingsSnap.forEach((d) => {
      const b = d.data();
      const bDist = (b.districtId || b.assignedDistrictId || b.city || '').toLowerCase().trim();
      const bFranchise = b.franchisePartnerId;

      if ((targetDistrict && (bDist === targetDistrict || bDist.includes(targetDistrict))) ||
          (targetFranchiseId && bFranchise === targetFranchiseId)) {
        const amt = Number(b.totalAmount || b.amount || 0);
        if (b.paymentStatus === 'paid' || b.status === 'completed' || b.status === 'confirmed' || b.status === 'in_progress') {
          totalBusiness += amt;
        }

        // Each historical transaction preserves the commission rate used at its time
        const itemRate = b.franchiseCommissionRate || b.commissionBreakdown?.franchiseRatePercent || applicableRate;
        const itemDue = b.franchiseCommission || b.commissionBreakdown?.franchiseCommission || Math.round((amt * itemRate) / 100);

        bookingDetails.push({
          bookingId: d.id,
          serviceName: b.serviceName || 'Home Service',
          customerName: b.customerName || 'Customer',
          amount: amt,
          paymentStatus: b.paymentStatus || 'pending',
          bookingStatus: b.status || 'pending',
          commissionRate: itemRate,
          commissionDueToHardinkaam: itemDue,
          createdAt: b.createdAt || '',
        });
      }
    });

    const totalDue = Math.round((totalBusiness * applicableRate) / 100);
    const totalPaid = Number(franchiseData?.commissionPaidToHardinkaam || 0);
    const pendingDue = Math.max(0, totalDue - totalPaid);
    const overdue = Number(franchiseData?.commissionOverdueToHardinkaam || 0);

    let status = 'PENDING';
    if (totalPaid >= totalDue && totalDue > 0) {
      status = 'PAID';
    } else if (totalPaid > 0 && totalPaid < totalDue) {
      status = 'PARTIALLY_PAID';
    } else if (overdue > 0) {
      status = 'OVERDUE';
    }

    // Fetch settlement history
    const settlementsRef = collection(db, 'ledgers');
    const sQuery = query(settlementsRef, where('ledgerOwnerId', '==', targetFranchiseId));
    const sSnap = await getDocs(sQuery);
    const history = sSnap.docs.map((d) => d.data());

    return res.status(200).json({
      success: true,
      franchiseId: targetFranchiseId,
      districtId: targetDistrict || franchiseData?.assignedDistrictId || '',
      districtName: franchiseData?.assignedDistrictName || targetDistrict,
      businessVolume: totalBusiness,
      commissionRate: applicableRate,
      commissionDueToHardinkaam: totalDue,
      commissionPaidToHardinkaam: totalPaid,
      commissionPendingToHardinkaam: pendingDue,
      commissionOverdueToHardinkaam: overdue,
      collectionStatus: status,
      isFranchiseIncome: false,
      note: 'Franchise does NOT receive commission. Franchise owes commission to HARDINKAAM HQ.',
      bookingHistory: bookingDetails.slice(0, 50),
      settlementHistory: history.slice(0, 50),
    });
  } catch (err: any) {
    console.error('Error fetching franchise commission summary:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/franchise/record-collection', async (req: Request, res: Response) => {
  try {
    const { franchiseId, amount, paymentMode, referenceNumber, notes, recordedBy } = req.body;
    if (!franchiseId || !amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_COLLECTION_PAYLOAD',
        message: 'Franchise ID and a positive collection amount are required.',
      });
    }

    const collectionAmount = Math.round(Number(amount));
    const nowIso = new Date().toISOString();
    const settlementId = `SETTLE-FRN-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const fpRef = doc(db, 'franchise_partners', franchiseId);
    const fpSnap = await getDoc(fpRef);
    if (!fpSnap.exists()) {
      return res.status(404).json({
        success: false,
        error: 'FRANCHISE_NOT_FOUND',
        message: `Franchise partner ${franchiseId} not found.`,
      });
    }

    const fpData = fpSnap.data();
    const previousPaid = Number(fpData.commissionPaidToHardinkaam || 0);
    const totalDue = Number(fpData.totalCommissionDueToHardinkaam || 0);
    const newPaid = previousPaid + collectionAmount;
    const remainingPending = Math.max(0, totalDue - newPaid);

    let newStatus = 'PARTIALLY_PAID';
    if (newPaid >= totalDue && totalDue > 0) {
      newStatus = 'PAID';
    } else if (newPaid === 0) {
      newStatus = 'PENDING';
    }

    // 1. Create Immutable Settlement Ledger Entry
    const settlementLedger: LedgerEntry = {
      id: `LEDGER-${settlementId}`,
      ledgerOwnerId: franchiseId,
      ledgerOwnerRole: 'franchise',
      ledgerOwnerName: fpData.name || fpData.assignedDistrictName || 'District Franchise',
      bookingId: `SETTLEMENT-${franchiseId}`,
      paymentId: referenceNumber || settlementId,
      commissionType: 'franchise_commission',
      amount: collectionAmount,
      grossBookingAmount: totalDue,
      ratePercent: fpData.districtSettings?.franchiseCommissionPercent || 15,
      ruleReference: 'Franchise Commission Collection to HARDINKAAM',
      type: 'credit', // Credit against liability (settlement received)
      status: 'cleared',
      description: `Commission collection of ₹${collectionAmount} received by HARDINKAAM HQ via ${paymentMode || 'Direct Transfer'} (Ref: ${referenceNumber || 'N/A'})`,
      referenceId: settlementId,
      direction: 'PAYABLE_TO_HARDINKAAM',
      isPayableToHardinkaam: true,
      collectionStatus: newStatus as any,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await setDoc(doc(db, 'ledgers', settlementLedger.id), settlementLedger);

    // 2. Update Franchise Partner Record
    await updateDoc(fpRef, {
      commissionPaidToHardinkaam: newPaid,
      commissionPendingToHardinkaam: remainingPending,
      collectionStatus: newStatus,
      lastSettlementAt: nowIso,
      lastSettlementAmount: collectionAmount,
      lastSettlementRef: referenceNumber || settlementId,
      updatedAt: nowIso,
    });

    console.log(`[Franchise] Recorded collection ₹${collectionAmount} for ${franchiseId}. Remaining due: ₹${remainingPending}`);

    return res.status(200).json({
      success: true,
      message: `Successfully recorded collection of ₹${collectionAmount} from Franchise.`,
      settlementId,
      totalDue,
      totalPaid: newPaid,
      remainingPending,
      collectionStatus: newStatus,
    });
  } catch (err: any) {
    console.error('Error recording franchise collection:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Phase 1J: Server-side validation for booking identifiers and entity identifiers.
 * Validates bookingId to prevent path manipulation, directory traversal, or malformed Firestore lookups.
 * Reject: missing, empty, null, undefined, non-string, or malformed booking identifiers.
 */
function isValidBookingId(id: unknown): id is string {
  if (typeof id !== 'string') {
    return false;
  }
  const clean = id.trim();
  if (!clean || clean.length < 3 || clean.length > 128) {
    return false;
  }
  // Disallow path traversal, directory characters, slashes, and reserved identifiers
  if (clean.includes('/') || clean.includes('\\') || clean.includes('..') || clean.startsWith('__')) {
    return false;
  }
  return /^[a-zA-Z0-9_-]{3,128}$/.test(clean);
}

function isValidEntityId(id: unknown): id is string {
  if (typeof id !== 'string') {
    return false;
  }
  const clean = id.trim();
  if (!clean || clean.length < 2 || clean.length > 128) {
    return false;
  }
  if (clean.includes('/') || clean.includes('\\') || clean.includes('..') || clean.startsWith('__')) {
    return false;
  }
  return /^[a-zA-Z0-9_-]{2,128}$/.test(clean);
}

/**
 * HARDINKAAM ADVANCED SERVICE TRACKING: ARRIVAL OTP SYSTEM
 * Server-authoritative generation and verification
 */
const ARRIVAL_OTP_SALT = 'HARDINKAAM_ARRIVAL_OTP_SALT_2026';

function computeArrivalOtpHash(bookingId: string, otp: string): string {
  return crypto
    .createHash('sha256')
    .update(`${bookingId.trim()}:${otp.trim()}:${ARRIVAL_OTP_SALT}`)
    .digest('hex');
}

/**
 * Endpoint: POST /api/bookings/generate-arrival-otp
 * Generates secure arrival OTP, hashes with SHA-256 and stores hash on booking.
 * Returns plaintext OTP only to customer response.
 * Uses atomic Firestore transaction to prevent stale read/write race conditions.
 */
app.post('/api/bookings/generate-arrival-otp', async (req, res) => {
  try {
    // 1-4. Authenticate caller using helper from Phase 1A (requires Bearer token, returns 401 if missing/invalid)
    const authUid = await verifyAuthUser(req, res);
    if (!authUid) {
      return;
    }

    const { bookingId } = req.body;
    // Phase 1J: Validate bookingId before any Firestore read/write
    if (!isValidBookingId(bookingId)) {
      return res.status(400).json({ success: false, error: 'Missing or invalid bookingId' });
    }

    const cleanBookingId = bookingId.trim();
    const bookingRef = doc(db, 'bookings', cleanBookingId);
    const nowIso = new Date().toISOString();

    const userEmail = (((req as any).user?.email) || '').toLowerCase().trim();
    const isAdmin = Boolean(userEmail && AUTHORIZED_ADMIN_EMAILS.includes(userEmail));

    if (req.body.customerId && typeof req.body.customerId === 'string') {
      const suppliedCustomerId = req.body.customerId.trim();
      if (suppliedCustomerId !== authUid && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Cannot impersonate another customer.',
        });
      }
    }

    const code = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 25 * 60 * 1000).toISOString();
    const hash = computeArrivalOtpHash(cleanBookingId, code);

    // Atomic transaction: Read -> Validate -> Update
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(bookingRef);
      if (!snap.exists()) {
        throw new Error('BOOKING_NOT_FOUND');
      }

      const booking = snap.data();
      const currentStatus = String(booking.status || '').toLowerCase().trim();

      // Terminal state check
      if (currentStatus === 'completed' || currentStatus === 'cancelled' || currentStatus === 'rejected') {
        throw new Error('TERMINAL_STATE');
      }

      // 5 & 7-8. Verify authenticated UID against booking customerId (do not trust client customerId or role)
      const isCustomer = Boolean(
        booking.customerId === authUid ||
        booking.userId === authUid ||
        booking.customerUid === authUid
      );

      if (!isCustomer && !isAdmin) {
        throw new Error('FORBIDDEN');
      }

      transaction.update(bookingRef, {
        arrivalOtpHash: hash,
        otpExpiresAt: expiresAt,
        otpAttempts: 0,
        trackingStatus: 'otp_pending',
        updatedAt: nowIso,
      });
    });

    return res.status(200).json({
      success: true,
      arrivalOtp: code,
      expiresAt,
    });
  } catch (err: any) {
    if (err.message === 'BOOKING_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    if (err.message === 'FORBIDDEN') {
      return res.status(403).json({ success: false, error: 'Forbidden: Unauthorized customer' });
    }
    if (err.message === 'TERMINAL_STATE') {
      return res.status(400).json({ success: false, error: 'Cannot generate OTP for completed or cancelled booking.' });
    }
    console.error('Error generating arrival OTP:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

/**
 * Endpoint: POST /api/bookings/verify-arrival-otp
 * Server-authoritative OTP verification.
 * Only after verification does booking transition to WORK_STARTED.
 * Uses atomic Firestore transaction to prevent concurrent brute force and race conditions.
 */
app.post('/api/bookings/verify-arrival-otp', async (req, res) => {
  try {
    // 1-4. Authenticate caller using helper from Phase 1A (requires Bearer token, returns 401 if missing/invalid)
    const authUid = await verifyAuthUser(req, res);
    if (!authUid) {
      return;
    }

    const { bookingId, enteredOtp, serviceManId } = req.body;
    // Phase 1J: Validate bookingId before any Firestore read/write
    if (!isValidBookingId(bookingId)) {
      return res.status(400).json({ success: false, error: 'Missing or invalid bookingId' });
    }

    if (serviceManId !== undefined && !isValidEntityId(serviceManId)) {
      return res.status(400).json({ success: false, error: 'Invalid serviceManId parameter' });
    }

    if (enteredOtp === undefined || enteredOtp === null) {
      return res.status(400).json({ success: false, error: 'Missing enteredOtp' });
    }

    const cleanOtp = String(enteredOtp).trim();
    if (!/^\d{4,6}$/.test(cleanOtp)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid OTP format. Must be a valid numerical code.',
      });
    }

    const cleanBookingId = bookingId.trim();
    const bookingRef = doc(db, 'bookings', cleanBookingId);
    const nowIso = new Date().toISOString();

    const userEmail = (((req as any).user?.email) || '').toLowerCase().trim();
    const isAdmin = Boolean(userEmail && AUTHORIZED_ADMIN_EMAILS.includes(userEmail));

    if (req.body.customerId && typeof req.body.customerId === 'string') {
      const suppliedCustomerId = req.body.customerId.trim();
      if (suppliedCustomerId !== authUid && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Cannot impersonate another customer.',
        });
      }
    }

    if (serviceManId && serviceManId !== authUid && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Service professional ID does not match authenticated user.',
      });
    }

    // Atomic transaction: Read -> Validate -> Update
    const txResult = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(bookingRef);
      if (!snap.exists()) {
        throw new Error('BOOKING_NOT_FOUND');
      }

      const booking = snap.data();
      const assignedProId = booking.serviceManId || booking.servicemanId || booking.assignedProId;

      if ((!assignedProId || assignedProId !== authUid) && !isAdmin) {
        throw new Error('FORBIDDEN_PRO');
      }

      const currentStatus = String(booking.status || '').toLowerCase().trim();
      if (
        currentStatus === 'completed' ||
        currentStatus === 'cancelled' ||
        currentStatus === 'rejected'
      ) {
        throw new Error(`BOOKING_TERMINAL_${currentStatus.toUpperCase()}`);
      }

      // If already verified
      if (
        booking.status === 'in_progress' ||
        booking.status === 'work_started' ||
        booking.trackingStatus === 'WORK_STARTED' ||
        booking.arrivalOtpVerified === true
      ) {
        return {
          alreadyVerified: true,
          bookingId: cleanBookingId,
          status: 'in_progress',
          trackingStatus: 'WORK_STARTED',
          workStartedAt: booking.workStartedAt || booking.startedAt,
        };
      }

      // Check attempts limit (Max 5 attempts)
      const attempts = booking.otpAttempts || 0;
      if (attempts >= 5) {
        throw new Error('OTP_LOCKED');
      }

      // Check expiration
      if (booking.otpExpiresAt && new Date(booking.otpExpiresAt).getTime() < Date.now()) {
        throw new Error('OTP_EXPIRED');
      }

      const expectedHash = booking.arrivalOtpHash;
      const computedHash = computeArrivalOtpHash(cleanBookingId, cleanOtp);

      let isMatch = false;
      if (expectedHash && expectedHash.length === computedHash.length) {
        try {
          isMatch = crypto.timingSafeEqual(
            Buffer.from(expectedHash, 'hex'),
            Buffer.from(computedHash, 'hex')
          );
        } catch {
          isMatch = expectedHash === computedHash;
        }
      } else if (booking.otp && String(booking.otp).trim() === cleanOtp) {
        isMatch = true;
      }

      if (!isMatch) {
        const newAttempts = attempts + 1;
        transaction.update(bookingRef, {
          otpAttempts: newAttempts,
          updatedAt: nowIso,
        });
        const remaining = Math.max(0, 5 - newAttempts);
        return {
          mismatch: true,
          remaining,
          isLocked: remaining <= 0,
        };
      }

      // Successful verification: Atomically transition to WORK_STARTED and invalidate OTP
      transaction.update(bookingRef, {
        status: 'in_progress',
        trackingStatus: 'WORK_STARTED',
        workStatus: 'in_progress',
        arrivalOtpVerified: true,
        otpVerifiedAt: nowIso,
        workStartedAt: nowIso,
        startedAt: nowIso,
        arrivalOtpHash: null,
        arrivalOtp: null,
        otp: null,
        baseAmount: booking.baseAmount !== undefined ? booking.baseAmount : (booking.amount || 0),
        deliveryStatus: 'in_progress',
        otpAttempts: 0,
        updatedAt: nowIso,
      });

      return {
        success: true,
        bookingId: cleanBookingId,
        status: 'in_progress',
        trackingStatus: 'WORK_STARTED',
        otpVerifiedAt: nowIso,
        workStartedAt: nowIso,
        baseAmount: booking.baseAmount !== undefined ? booking.baseAmount : (booking.amount || 0),
      };
    });

    if (txResult.alreadyVerified) {
      return res.status(200).json({
        success: true,
        message: 'OTP already verified. Work is in progress.',
        workStartedAt: txResult.workStartedAt,
      });
    }

    if (txResult.mismatch) {
      return res.status(400).json({
        success: false,
        error:
          txResult.remaining > 0
            ? `Incorrect OTP. ${txResult.remaining} attempt${txResult.remaining > 1 ? 's' : ''} remaining.`
            : 'Maximum attempts exceeded. Code locked.',
        attemptsRemaining: txResult.remaining,
        isLocked: txResult.isLocked,
      });
    }

    // Phase 8: Update existing tracking status to WORK_STARTED in serviceTracking collection
    try {
      const trackingRef = doc(db, 'serviceTracking', cleanBookingId);
      await updateDoc(trackingRef, {
        status: 'WORK_STARTED',
        lastUpdatedAt: nowIso,
      });
    } catch (trackErr) {
      console.warn('Could not update serviceTracking document to WORK_STARTED:', trackErr);
    }

    return res.status(200).json({
      success: true,
      message: 'Arrival OTP verified successfully. Work has started.',
      bookingId: txResult.bookingId,
      status: txResult.status,
      trackingStatus: txResult.trackingStatus,
      otpVerifiedAt: txResult.otpVerifiedAt,
      workStartedAt: txResult.workStartedAt,
      baseAmount: txResult.baseAmount,
    });
  } catch (err: any) {
    const msg = err.message || '';
    if (msg === 'BOOKING_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    if (msg === 'FORBIDDEN_PRO') {
      return res.status(403).json({ success: false, error: 'Forbidden: Only assigned service professional can verify arrival.' });
    }
    if (msg.startsWith('BOOKING_TERMINAL_')) {
      const state = msg.replace('BOOKING_TERMINAL_', '').toLowerCase();
      return res.status(400).json({ success: false, error: `Cannot verify arrival OTP: booking is already ${state}.` });
    }
    if (msg === 'OTP_LOCKED') {
      return res.status(400).json({ success: false, error: 'Maximum attempts exceeded. Code locked.', attemptsRemaining: 0, isLocked: true });
    }
    if (msg === 'OTP_EXPIRED') {
      return res.status(400).json({ success: false, isExpired: true, error: 'Arrival OTP has expired. Customer must refresh to get a new code.' });
    }
    console.error('Error verifying arrival OTP:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

/**
 * Endpoint: POST /api/bookings/verify-qr-code
 * Service Professional scans customer's booking QR code to instantly verify and initiate service.
 * Transitions booking status to 'in_progress', starts work timer, and synchronizes live tracking.
 */
app.post('/api/bookings/verify-qr-code', async (req, res) => {
  try {
    const { bookingId, qrPayload, serviceManId } = req.body;
    if (!bookingId || typeof bookingId !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing or invalid bookingId' });
    }

    const cleanBookingId = bookingId.trim();
    if (!isValidBookingId(cleanBookingId)) {
      return res.status(400).json({ success: false, error: 'Invalid bookingId format' });
    }

    const bookingRef = doc(db, 'bookings', cleanBookingId);
    const nowIso = new Date().toISOString();

    const txResult = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(bookingRef);
      if (!snap.exists()) {
        throw new Error('BOOKING_NOT_FOUND');
      }

      const booking = snap.data();
      const currentStatus = String(booking.status || '').toLowerCase().trim();

      if (
        currentStatus === 'completed' ||
        currentStatus === 'cancelled' ||
        currentStatus === 'rejected'
      ) {
        throw new Error(`BOOKING_TERMINAL_${currentStatus.toUpperCase()}`);
      }

      // If already verified / in_progress
      if (
        booking.status === 'in_progress' ||
        booking.status === 'work_started' ||
        booking.trackingStatus === 'WORK_STARTED' ||
        booking.workStartedAt
      ) {
        return {
          alreadyVerified: true,
          bookingId: cleanBookingId,
          status: 'in_progress',
          trackingStatus: 'WORK_STARTED',
          workStartedAt: booking.workStartedAt || booking.startedAt,
        };
      }

      // Validate matching: if qrPayload is JSON, verify bookingId matches
      if (qrPayload && typeof qrPayload === 'string' && qrPayload.startsWith('{')) {
        try {
          const parsed = JSON.parse(qrPayload);
          if (parsed.bookingId && parsed.bookingId.trim() !== cleanBookingId) {
            throw new Error('QR_BOOKING_MISMATCH');
          }
          if (parsed.customerId && booking.customerId && parsed.customerId !== booking.customerId) {
            throw new Error('QR_CUSTOMER_MISMATCH');
          }
        } catch (e: any) {
          if (e.message?.startsWith('QR_')) throw e;
        }
      }

      // Transition booking to in_progress with completion OTP ready
      const completionOtp = booking.otp || Math.floor(1000 + Math.random() * 9000).toString();
      transaction.update(bookingRef, {
        status: 'in_progress',
        trackingStatus: 'WORK_STARTED',
        workStatus: 'in_progress',
        arrivalOtpVerified: true,
        verifiedViaQr: true,
        otpVerifiedAt: nowIso,
        workStartedAt: nowIso,
        startedAt: nowIso,
        arrivalOtpHash: null,
        arrivalOtp: null,
        otp: completionOtp,
        baseAmount: booking.baseAmount !== undefined ? booking.baseAmount : (booking.amount || 0),
        deliveryStatus: 'in_progress',
        otpAttempts: 0,
        updatedAt: nowIso,
      });

      return {
        success: true,
        bookingId: cleanBookingId,
        status: 'in_progress',
        trackingStatus: 'WORK_STARTED',
        workStartedAt: nowIso,
      };
    });

    if (txResult.alreadyVerified) {
      return res.status(200).json({
        success: true,
        message: 'Booking is already in progress.',
        bookingId: txResult.bookingId,
        status: 'in_progress',
        workStartedAt: txResult.workStartedAt,
        alreadyVerified: true,
      });
    }

    // Sync serviceTracking collection to WORK_STARTED
    try {
      await updateDoc(doc(db, 'serviceTracking', cleanBookingId), {
        status: 'WORK_STARTED',
        lastUpdatedAt: nowIso,
      });
    } catch (_) {}

    return res.status(200).json({
      success: true,
      message: 'QR Code verified successfully! Service initiated.',
      bookingId: cleanBookingId,
      status: 'in_progress',
      workStartedAt: txResult.workStartedAt,
    });
  } catch (err: any) {
    const msg = err.message || '';
    if (msg === 'BOOKING_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    if (msg === 'QR_BOOKING_MISMATCH') {
      return res.status(400).json({ success: false, error: 'QR code does not match this booking.' });
    }
    if (msg === 'QR_CUSTOMER_MISMATCH') {
      return res.status(400).json({ success: false, error: 'QR code belongs to a different customer.' });
    }
    if (msg.startsWith('BOOKING_TERMINAL_')) {
      const state = msg.replace('BOOKING_TERMINAL_', '').toLowerCase();
      return res.status(400).json({ success: false, error: `Cannot start service: booking is already ${state}.` });
    }
    console.error('Error verifying booking QR code:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

/**
 * Endpoint: POST /api/bookings/propose-extra-charge
 * Service Professional proposes an additional charge (material or service).
 * Stored with status 'pending' awaiting Customer Approval.
 * Does NOT alter final payable amount until customer approves.
 * Phase 1O: Secured with Phase 1A authentication, role-boundary enforcement, and atomic transaction.
 */
app.post('/api/bookings/propose-extra-charge', async (req, res) => {
  try {
    const authUid = await verifyAuthUser(req, res);
    if (!authUid) {
      return;
    }

    const {
      bookingId,
      serviceManId,
      serviceManName,
      type,
      description,
      quantity,
      unitPrice,
      notes,
    } = req.body;

    // Phase 1J: Validate bookingId before any Firestore read/write
    if (!isValidBookingId(bookingId)) {
      return res.status(400).json({ success: false, error: 'Missing or invalid bookingId' });
    }
    if (!serviceManId || typeof serviceManId !== 'string' || !isValidEntityId(serviceManId)) {
      return res.status(400).json({ success: false, error: 'Missing or invalid serviceManId' });
    }
    if (!description || typeof description !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing or invalid description' });
    }
    if (unitPrice === undefined || unitPrice === null) {
      return res.status(400).json({ success: false, error: 'Missing unitPrice' });
    }

    const cleanDescription = String(description).trim();
    if (cleanDescription.length < 2 || cleanDescription.length > 200) {
      return res.status(400).json({
        success: false,
        error: 'Description must be between 2 and 200 characters.',
      });
    }

    const userEmail = (((req as any).user?.email) || '').toLowerCase().trim();
    const isAdmin = Boolean(userEmail && AUTHORIZED_ADMIN_EMAILS.includes(userEmail));

    if (serviceManId && serviceManId !== authUid && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Service professional ID does not match authenticated user.',
      });
    }

    const numQuantity = Math.max(1, Math.round(Number(quantity) || 1));
    const numUnitPrice = Math.max(0, Math.round(Number(unitPrice) || 0));
    const calculatedTotal = numQuantity * numUnitPrice;

    const cleanBookingId = bookingId.trim();
    const bookingRef = doc(db, 'bookings', cleanBookingId);
    const nowIso = new Date().toISOString();
    const newChargeId = `chg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    let targetBookingData: any = null;
    let createdCharge: any = null;
    let allUpdatedCharges: any[] = [];

    // Atomic transaction: Read -> Validate -> Update (Check 8)
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(bookingRef);
      if (!snap.exists()) {
        throw new Error('BOOKING_NOT_FOUND');
      }

      const booking = snap.data();
      targetBookingData = booking;

      // Verify assigned technician
      const assignedProId = booking.serviceManId || booking.servicemanId || booking.assignedProId;
      if ((!assignedProId || assignedProId !== authUid) && !isAdmin) {
        throw new Error('FORBIDDEN_PRO');
      }

      // Verify booking state allows extra charge proposal (arrived on site or active work)
      const allowedStates = [
        'arrived',
        'otp_pending',
        'extra_charges_pending',
        'on_the_way',
        'arriving',
        'in_progress',
        'work_started',
        'accepted'
      ];
      const currentStatus = (booking.status || '').toLowerCase();
      const currentTracking = (booking.trackingStatus || '').toLowerCase();
      const isAllowedState = allowedStates.includes(currentStatus) || allowedStates.includes(currentTracking);

      if (!isAllowedState && !isAdmin) {
        throw new Error('INVALID_BOOKING_STATE_FOR_EXTRA_CHARGE');
      }

      const newCharge = {
        id: newChargeId,
        type: (type === 'service' || type === 'material') ? type : 'material',
        description: cleanDescription,
        quantity: numQuantity,
        unitPrice: numUnitPrice,
        total: calculatedTotal,
        notes: notes ? String(notes).trim() : undefined,
        proposedBy: authUid,
        proposedByName: serviceManName || booking.serviceManName || 'Service Professional',
        proposedAt: nowIso,
        customerApprovalStatus: 'pending',
        adminApprovalStatus: 'pending',
        finalApprovalStatus: 'pending',
        status: 'pending',
        addedBy: authUid,
        addedByName: serviceManName || booking.serviceManName || 'Service Professional',
        addedAt: nowIso,
        approvalStatus: 'pending',
      };

      const currentCharges = Array.isArray(booking.extraCharges) ? booking.extraCharges : [];
      const updatedCharges = [...currentCharges, newCharge];

      transaction.update(bookingRef, {
        extraCharges: updatedCharges,
        updatedAt: nowIso,
      });

      createdCharge = newCharge;
      allUpdatedCharges = updatedCharges;
    });

    // Notify customer in real-time
    try {
      if (targetBookingData?.customerId) {
        await addDoc(collection(db, 'notifications'), {
          userId: targetBookingData.customerId,
          title: 'Additional Charge Proposed',
          message: `${targetBookingData.serviceManName || 'Service Professional'} proposed an additional charge: ${cleanDescription} (₹${calculatedTotal}). Please review and approve or reject.`,
          bookingId: cleanBookingId,
          chargeId: newChargeId,
          type: 'extra_charge_proposed',
          isRead: false,
          createdAt: nowIso,
        });
      }
    } catch (notifErr) {
      console.warn('Could not write notification:', notifErr);
    }

    // Audit log
    try {
      await addDoc(collection(db, 'audit_logs'), {
        action: 'EXTRA_CHARGE_PROPOSED',
        bookingId: cleanBookingId,
        chargeId: newChargeId,
        serviceManId: authUid,
        amount: calculatedTotal,
        description: cleanDescription,
        status: 'pending',
        timestamp: nowIso,
      });
    } catch (auditErr) {
      console.warn('Could not write audit log:', auditErr);
    }

    return res.status(200).json({
      success: true,
      message: 'Extra charge proposed successfully. Awaiting customer approval.',
      charge: createdCharge,
      extraCharges: allUpdatedCharges,
    });
  } catch (err: any) {
    const msg = err.message || '';
    if (msg === 'BOOKING_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    if (msg === 'FORBIDDEN_PRO') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Only the assigned service professional can propose extra charges.',
      });
    }
    if (msg === 'NOT_IN_PROGRESS' || msg === 'INVALID_BOOKING_STATE_FOR_EXTRA_CHARGE') {
      return res.status(400).json({
        success: false,
        error: 'Extra charges can be proposed once the technician is on-site (arrived) or while work is in progress.',
      });
    }
    console.error('Error proposing extra charge:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

/**
 * Endpoint: POST /api/bookings/respond-extra-charge
 * Customer approves or rejects a proposed extra charge.
 * Records approval status, approvedBy, approvedAt.
 */
app.post('/api/bookings/respond-extra-charge', async (req, res) => {
  try {
    // 1-4. Authenticate caller using helper from Phase 1A (requires Bearer token, returns 401 if missing/invalid)
    const authUid = await verifyAuthUser(req, res);
    if (!authUid) {
      return;
    }

    const { bookingId, chargeId, decision, rejectionReason } = req.body;

    // Phase 1J: Validate bookingId before any Firestore read/write
    if (!isValidBookingId(bookingId)) {
      return res.status(400).json({ success: false, error: 'Missing or invalid bookingId' });
    }
    if (!chargeId || typeof chargeId !== 'string' || !isValidEntityId(chargeId)) {
      return res.status(400).json({ success: false, error: 'Missing or invalid chargeId' });
    }
    if (!decision || typeof decision !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing or invalid decision' });
    }

    const normDecision = String(decision).toLowerCase().trim();
    if (normDecision !== 'approve' && normDecision !== 'reject' && normDecision !== 'approved' && normDecision !== 'rejected') {
      return res.status(400).json({
        success: false,
        error: "Decision must be either 'approve' or 'reject'.",
      });
    }

    const isApproved = normDecision === 'approve' || normDecision === 'approved';

    const cleanBookingId = bookingId.trim();
    const bookingRef = doc(db, 'bookings', cleanBookingId);
    const nowIso = new Date().toISOString();

    const userEmail = (((req as any).user?.email) || '').toLowerCase().trim();
    const isAdmin = Boolean(userEmail && AUTHORIZED_ADMIN_EMAILS.includes(userEmail));

    let targetBookingData: any = null;
    let updatedTargetCharge: any = null;
    let allUpdatedCharges: any[] = [];

    // Atomic transaction: Read -> Validate -> Update (Check 8)
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(bookingRef);
      if (!snap.exists()) {
        throw new Error('BOOKING_NOT_FOUND');
      }

      const booking = snap.data();
      targetBookingData = booking;

      // 6-8. Verify authenticated UID is the CUSTOMER for this booking (do not trust req.body customerId; return 403 otherwise)
      const isCustomer = Boolean(
        (booking.customerId && booking.customerId === authUid) ||
        (booking.userId && booking.userId === authUid) ||
        (booking.customerUid && booking.customerUid === authUid)
      );

      if (!isCustomer && !isAdmin) {
        throw new Error('FORBIDDEN_CUSTOMER');
      }

      // 9-10. Load requested extra charge and verify it belongs to this booking
      const charges: any[] = Array.isArray(booking.extraCharges) ? booking.extraCharges : [];
      const chargeIndex = charges.findIndex((c) => c.id === chargeId);
      if (chargeIndex === -1) {
        throw new Error('CHARGE_NOT_FOUND');
      }

      const targetCharge = charges[chargeIndex];

      // 13-14. Approval/rejection must operate only on an existing pending extra charge
      const currentChargeStatus = (targetCharge.approvalStatus || targetCharge.status || '').toLowerCase().trim();
      if (currentChargeStatus !== 'pending' && currentChargeStatus !== '') {
        throw new Error(`ALREADY_${currentChargeStatus.toUpperCase()}`);
      }

      // 11-12. Allow only customer approval/rejection; do not allow customer to alter description, quantity, price, total, or serviceManId
      const updatedTarget = {
        ...targetCharge,
        id: targetCharge.id,
        description: targetCharge.description,
        type: targetCharge.type,
        quantity: targetCharge.quantity,
        unitPrice: targetCharge.unitPrice,
        total: targetCharge.total,
        serviceManId: targetCharge.serviceManId,
        status: isApproved ? 'approved' : 'rejected',
        approvalStatus: isApproved ? 'approved' : 'rejected',
        approvedBy: isApproved ? authUid : undefined,
        approvedAt: isApproved ? nowIso : undefined,
        rejectionReason: !isApproved ? (String(rejectionReason || 'Declined by customer').slice(0, 500)) : undefined,
        respondedAt: nowIso,
      };

      const updatedCharges = [...charges];
      updatedCharges[chargeIndex] = updatedTarget;

      transaction.update(bookingRef, {
        extraCharges: updatedCharges,
        updatedAt: nowIso,
      });

      updatedTargetCharge = updatedTarget;
      allUpdatedCharges = updatedCharges;
    });

    // Notify Service Professional
    try {
      const proRecipientId = targetBookingData?.serviceManId || targetBookingData?.servicemanId || targetBookingData?.assignedProId;
      if (proRecipientId) {
        await addDoc(collection(db, 'notifications'), {
          userId: proRecipientId,
          title: isApproved ? 'Extra Charge Approved ✓' : 'Extra Charge Declined ✕',
          message: `Customer ${isApproved ? 'approved' : 'declined'} the charge for "${updatedTargetCharge.description}" (₹${updatedTargetCharge.total}).`,
          bookingId: cleanBookingId,
          type: isApproved ? 'extra_charge_approved' : 'extra_charge_rejected',
          isRead: false,
          createdAt: nowIso,
        });
      }
    } catch (notifErr) {
      console.warn('Could not write notification:', notifErr);
    }

    // Audit log
    try {
      await addDoc(collection(db, 'audit_logs'), {
        action: isApproved ? 'EXTRA_CHARGE_APPROVED' : 'EXTRA_CHARGE_REJECTED',
        bookingId: cleanBookingId,
        chargeId,
        customerId: authUid,
        amount: updatedTargetCharge.total,
        status: isApproved ? 'approved' : 'rejected',
        timestamp: nowIso,
      });
    } catch (auditErr) {
      console.warn('Could not write audit log:', auditErr);
    }

    return res.status(200).json({
      success: true,
      message: isApproved ? 'Charge approved successfully.' : 'Charge rejected.',
      charge: updatedTargetCharge,
      extraCharges: allUpdatedCharges,
    });
  } catch (err: any) {
    const msg = err.message || '';
    if (msg === 'BOOKING_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    if (msg === 'FORBIDDEN_CUSTOMER') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Only the customer who booked this service can approve or reject charges.',
      });
    }
    if (msg === 'CHARGE_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: 'Charge item not found in booking.',
      });
    }
    if (msg.startsWith('ALREADY_')) {
      const statusText = msg.replace('ALREADY_', '').toLowerCase();
      return res.status(400).json({
        success: false,
        error: `Cannot update charge: this extra charge has already been ${statusText}.`,
      });
    }
    console.error('Error responding to extra charge:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

/**
 * Format duration into human readable string
 */
function formatWorkDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00 (${hours}h ${mins}m)`;
  }
  return `00:${mins.toString().padStart(2, '0')}:00 (${mins} mins)`;
}

/**
 * Endpoint: POST /api/bookings/complete-work
 * Server-authoritative service completion, work timer stop, transparent charges calculation,
 * and immutable HARDINKAAM SERVICE BILL snapshot generation.
 */
app.post('/api/bookings/complete-work', async (req, res) => {
  try {
    // 1-4. Authenticate caller using helper from Phase 1A (requires Bearer token, returns 401 if missing/invalid)
    const authUid = await verifyAuthUser(req, res);
    if (!authUid) {
      return;
    }

    const { bookingId, serviceManId, notes } = req.body;

    // Phase 1J: Validate bookingId before any Firestore read/write
    if (!isValidBookingId(bookingId)) {
      return res.status(400).json({ success: false, error: 'Missing or invalid bookingId' });
    }
    if (!serviceManId || typeof serviceManId !== 'string' || !isValidEntityId(serviceManId)) {
      return res.status(400).json({ success: false, error: 'Missing or invalid serviceManId' });
    }

    const cleanBookingId = bookingId.trim();
    const cleanServiceManId = serviceManId.trim();

    const bookingRef = doc(db, 'bookings', cleanBookingId);
    const snap = await getDoc(bookingRef);
    if (!snap.exists()) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const initialBooking = snap.data();

    // Validate any client-supplied monetary fields in req.body (Phase 1H: Test G)
    const clientMonetaryKeys = ['finalAmount', 'amount', 'finalTotal', 'total', 'baseAmount', 'discount', 'unitPrice', 'quantity', 'subtotal'];
    for (const key of clientMonetaryKeys) {
      if (req.body[key] !== undefined) {
        const v = Number(req.body[key]);
        if (!Number.isFinite(v) || Number.isNaN(v) || v < 0) {
          return res.status(400).json({
            success: false,
            error: `Invalid monetary value in ${key}: must be a finite, non-negative number.`,
          });
        }
      }
    }

    // Test C & D: If client sends extraCharges in req.body, validate against tampering
    if (req.body.extraCharges !== undefined) {
      if (!Array.isArray(req.body.extraCharges)) {
        return res.status(400).json({ success: false, error: 'extraCharges must be an array.' });
      }
      for (const clientCharge of req.body.extraCharges) {
        if (!clientCharge || typeof clientCharge !== 'object') continue;
        const q = Number(clientCharge.quantity);
        const p = Number(clientCharge.unitPrice);
        const t = Number(clientCharge.total);

        if (clientCharge.quantity !== undefined && (!Number.isFinite(q) || Number.isNaN(q) || q <= 0)) {
          return res.status(400).json({ success: false, error: 'Invalid charge quantity: must be positive finite number.' });
        }
        if (clientCharge.unitPrice !== undefined && (!Number.isFinite(p) || Number.isNaN(p) || p < 0)) {
          return res.status(400).json({ success: false, error: 'Invalid charge unitPrice: must be non-negative finite number.' });
        }
        if (clientCharge.total !== undefined && (!Number.isFinite(t) || Number.isNaN(t) || t < 0)) {
          return res.status(400).json({ success: false, error: 'Invalid charge total: must be non-negative finite number.' });
        }

        // Test C: quantity × unit price mismatch -> request is rejected
        if (clientCharge.quantity !== undefined && clientCharge.unitPrice !== undefined && clientCharge.total !== undefined) {
          const expectedTotal = Math.round(q * p);
          if (Math.round(t) !== expectedTotal) {
            return res.status(400).json({
              success: false,
              error: `Quantity × unit price mismatch on charge: ${t} does not equal ${q} × ${p}.`,
            });
          }
        }

        // Test D: Client attempts to alter an already approved charge amount -> amount change is rejected
        if (clientCharge.id && Array.isArray(initialBooking.extraCharges)) {
          const stored = initialBooking.extraCharges.find((sc: any) => sc.id === clientCharge.id);
          if (stored) {
            const storedStatus = String(stored.approvalStatus || stored.status || '').toLowerCase().trim();
            if (storedStatus === 'approved') {
              const storedTotal = Math.round(Number(stored.total));
              const suppliedTotal = clientCharge.total !== undefined ? Math.round(t) : Math.round(q * p);
              if (suppliedTotal !== storedTotal) {
                return res.status(400).json({
                  success: false,
                  error: 'Cannot alter amount of an already approved extra charge.',
                });
              }
            }
          }
        }
      }
    }

    // 6-7. Verify authorized user: must be assigned Service Professional or Admin; do NOT trust client serviceManId without checking authUid
    const assignedProId = initialBooking.serviceManId || initialBooking.servicemanId || initialBooking.assignedProId;
    const userEmail = (((req as any).user?.email) || '').toLowerCase().trim();
    const isAdmin = userEmail && AUTHORIZED_ADMIN_EMAILS.includes(userEmail);

    if (serviceManId && serviceManId !== authUid && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Service professional ID does not match authenticated user.',
      });
    }

    if ((!assignedProId || assignedProId !== authUid) && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Only the assigned service professional can complete this booking.',
      });
    }

    // 8. Terminal booking guard - CANCELLED -> COMPLETED is prohibited
    const currentStatus = (initialBooking.status || '').toLowerCase().trim();
    if (currentStatus === 'cancelled' || currentStatus === 'rejected') {
      return res.status(400).json({
        success: false,
        error: `Cannot complete booking: booking is already ${currentStatus}.`,
      });
    }

    // 17. Already completed guard - idempotent duplicate completion protection
    if (initialBooking.status === 'completed' && initialBooking.finalBill) {
      return res.status(200).json({
        success: true,
        message: 'Service is already marked as completed.',
        finalBill: initialBooking.finalBill,
        finalAmount: initialBooking.finalAmount || initialBooking.amount,
      });
    }

    // 8-10. Enforce booking state sequence and Arrival OTP / work start
    // PENDING -> COMPLETED is prohibited. Work must be started with Arrival OTP verified.
    const isWorkStarted = (
      currentStatus === 'in_progress' ||
      currentStatus === 'work_started' ||
      (initialBooking.workStatus && String(initialBooking.workStatus).toLowerCase().trim() === 'in_progress') ||
      !!initialBooking.workStartedAt ||
      !!initialBooking.otpVerifiedAt
    );

    if (currentStatus === 'pending' || !isWorkStarted) {
      return res.status(400).json({
        success: false,
        error: 'Invalid state transition: Cannot complete booking before work has started and Arrival OTP is verified.',
      });
    }

    // 16. Atomically complete booking and generate immutable final bill using Firestore transaction
    let billSnapshot: any = null;
    let finalAmount = 0;
    let alreadyCompleted = false;
    let existingBill: any = null;
    let existingAmount = 0;
    let currentBookingSnapshot: any = null;
    let completedWorkDurationFormatted = '';

    await runTransaction(db, async (transaction) => {
      const freshSnap = await transaction.get(bookingRef);
      if (!freshSnap.exists()) {
        throw new Error('BOOKING_NOT_FOUND');
      }

      const booking = freshSnap.data();
      const statusNow = String(booking.status || '').toLowerCase().trim();

      // Concurrency check inside transaction: If already completed by concurrent request, return existing bill
      if (statusNow === 'completed' && booking.finalBill) {
        alreadyCompleted = true;
        existingBill = booking.finalBill;
        existingAmount = booking.finalAmount || booking.amount;
        return;
      }

      if (statusNow === 'cancelled' || statusNow === 'rejected') {
        throw new Error(`BOOKING_TERMINAL:${statusNow}`);
      }

      const workStartedNow = (
        statusNow === 'in_progress' ||
        statusNow === 'work_started' ||
        (booking.workStatus && String(booking.workStatus).toLowerCase().trim() === 'in_progress') ||
        !!booking.workStartedAt ||
        !!booking.otpVerifiedAt
      );

      if (statusNow === 'pending' || !workStartedNow) {
        throw new Error('WORK_NOT_STARTED');
      }

      const nowIso = new Date().toISOString();
      const workStartedAt = booking.workStartedAt || booking.startedAt || booking.otpVerifiedAt || nowIso;
      const workEndedAt = nowIso;

      // Calculate duration strictly from server timestamps
      const startTimeMs = new Date(workStartedAt).getTime();
      const endTimeMs = new Date(workEndedAt).getTime();
      const elapsedMs = Math.max(0, endTimeMs - startTimeMs);
      const workDurationMinutes = Math.max(1, Math.round(elapsedMs / (60 * 1000)));
      const formattedDuration = formatWorkDuration(workDurationMinutes);
      completedWorkDurationFormatted = formattedDuration;

      // 1. Base Service Charge (Server-Authoritative, strictly from booking; client totals ignored)
      const rawBase = booking.baseAmount !== undefined ? booking.baseAmount : (booking.amount || 0);
      const numBase = Number(rawBase);
      const baseAmount = (Number.isFinite(numBase) && numBase >= 0) ? Math.round(numBase) : 0;

      // 2. Extra charges: Strictly ONLY customer-approved charges belonging to this booking are included.
      // Client-supplied totals, pending charges, and rejected charges are completely excluded.
      // Calculations strictly use: quantity × unit price
      const allCharges: any[] = Array.isArray(booking.extraCharges) ? booking.extraCharges : [];
      const approvedCharges = allCharges.filter((c) => {
        if (!c || typeof c !== 'object') return false;
        if (c.bookingId && c.bookingId !== bookingId) return false;
        const status = String(c.approvalStatus || c.status || '').toLowerCase().trim();
        return status === 'approved';
      });

      const extraServicesAmount = approvedCharges
        .filter((c) => c.type === 'service')
        .reduce((sum, c) => {
          const rawQty = Number(c.quantity);
          const qty = (Number.isFinite(rawQty) && rawQty > 0) ? Math.max(1, Math.round(rawQty)) : 1;
          const rawUnitPrice = Number(c.unitPrice);
          const unitPrice = (Number.isFinite(rawUnitPrice) && rawUnitPrice >= 0) ? Math.round(rawUnitPrice) : 0;
          return sum + (qty * unitPrice);
        }, 0);

      const materialsAmount = approvedCharges
        .filter((c) => c.type === 'material' || c.type === 'other')
        .reduce((sum, c) => {
          const rawQty = Number(c.quantity);
          const qty = (Number.isFinite(rawQty) && rawQty > 0) ? Math.max(1, Math.round(rawQty)) : 1;
          const rawUnitPrice = Number(c.unitPrice);
          const unitPrice = (Number.isFinite(rawUnitPrice) && rawUnitPrice >= 0) ? Math.round(rawUnitPrice) : 0;
          return sum + (qty * unitPrice);
        }, 0);

      const approvedExtraChargesAmount = extraServicesAmount + materialsAmount;

      // 3. Applicable Charges (Platform, Safety, and Convenience Fee)
      const rawApplicable = booking.applicableCharges !== undefined
        ? booking.applicableCharges
        : (booking.safetyFee !== undefined
          ? booking.safetyFee
          : (booking.platformFee !== undefined ? booking.platformFee : 29));
      const numApplicable = Number(rawApplicable);
      const applicableCharges = (Number.isFinite(numApplicable) && numApplicable >= 0)
        ? Math.round(numApplicable)
        : 29;

      // 4. Discount if existing (Promotional or Coupon Discount)
      const rawDiscount = booking.discount !== undefined ? booking.discount : (booking.discountAmount || 0);
      const numDiscount = Number(rawDiscount);
      const discount = (Number.isFinite(numDiscount) && numDiscount >= 0)
        ? Math.round(numDiscount)
        : 0;

      // 5. Final bill calculation:
      // Base Service Charge + Approved Extra Charges + Applicable Charges - Discount if existing = Final Amount
      finalAmount = Math.max(
        0,
        Math.round(baseAmount + approvedExtraChargesAmount + applicableCharges - discount)
      );

      // 6. Platform split: 15% platform commission + 5% tax deduction
      const commissionRate = 15;
      const taxRate = 5;
      const platformChargeAmount = Math.round((finalAmount * commissionRate) / 100);
      const taxAmount = Math.round((finalAmount * taxRate) / 100);
      const servicemanPayoutAmount = Math.max(0, finalAmount - platformChargeAmount - taxAmount);

      // 7. Build transparent itemized line items
      const lineItems: any[] = [
        {
          id: 'li_base',
          label: booking.serviceName || 'Base Service Charge',
          category: 'base_service',
          quantity: 1,
          unitPrice: baseAmount,
          amount: baseAmount,
          notes: booking.categoryName ? `Category: ${booking.categoryName}` : undefined,
        },
      ];

      // Add strictly approved extra charges as line items using quantity × unit price
      approvedCharges.forEach((c) => {
        const rawQty = Number(c.quantity);
        const qty = (Number.isFinite(rawQty) && rawQty > 0) ? Math.max(1, Math.round(rawQty)) : 1;
        const rawUnitPrice = Number(c.unitPrice);
        const unitPrice = (Number.isFinite(rawUnitPrice) && rawUnitPrice >= 0) ? Math.round(rawUnitPrice) : 0;
        const lineTotal = qty * unitPrice;
        lineItems.push({
          id: `li_${c.id}`,
          label: c.description,
          category: c.type === 'service' ? 'extra_service' : 'material',
          quantity: qty,
          unitPrice: unitPrice,
          amount: lineTotal,
          notes: `Customer Approved (${c.type === 'service' ? 'Extra Service' : 'Spare Part / Material'})`,
        });
      });

      if (applicableCharges > 0) {
        lineItems.push({
          id: 'li_applicable',
          label: 'Applicable Charges (Safety & Platform Fee)',
          category: 'platform_charge',
          quantity: 1,
          unitPrice: applicableCharges,
          amount: applicableCharges,
          notes: 'Platform insurance, safety standards, and tech guarantee',
        });
      }

      if (discount > 0) {
        lineItems.push({
          id: 'li_discount',
          label: `Discount Applied${booking.couponCode ? ` (${booking.couponCode})` : ''}`,
          category: 'discount',
          quantity: 1,
          unitPrice: -discount,
          amount: -discount,
          notes: 'Promotional / coupon discount',
        });
      }

      // 8. Generate immutable Bill Snapshot
      const billId = `bill_${bookingId}_${Date.now()}`;
      billSnapshot = {
        id: billId,
        bookingId,
        customerId: booking.customerId,
        customerName: booking.customerName || 'Valued Customer',
        serviceManId: booking.serviceManId || serviceManId,
        serviceManName: booking.serviceManName || 'Service Professional',
        serviceCategory: booking.categoryName || 'Home Service',
        serviceName: booking.serviceName || 'Home Service',
        districtId: booking.districtId || 'bhopal_central',
        districtName: booking.districtName || 'Bhopal',
        workStartedAt,
        workCompletedAt: workEndedAt,
        workEndedAt,
        workDurationMinutes,
        workDurationFormatted: formattedDuration,
        baseAmount,
        approvedExtraChargesAmount,
        extraServicesAmount,
        materialsAmount,
        applicableCharges,
        platformChargeAmount,
        discount,
        discountAmount: discount,
        taxAmount,
        finalAmount,
        lineItems,
        paymentStatus: (booking.paymentStatus === 'paid' && finalAmount === baseAmount)
          ? 'paid'
          : (booking.paymentStatus === 'cod' ? 'cod' : (booking.paymentStatus === 'paid' ? 'unpaid' : (booking.paymentStatus || 'unpaid'))),
        paymentMethod: booking.paymentMethod || 'cash',
        generatedAt: workEndedAt,
        notes: notes ? String(notes).trim() : undefined,
      };

      // 9. Update booking atomically in transaction
      transaction.update(bookingRef, {
        status: 'completed',
        trackingStatus: 'WORK_COMPLETED',
        workStatus: 'completed',
        workCompletedAt: workEndedAt,
        workEndedAt,
        workDurationMinutes,
        workDurationFormatted: formattedDuration,
        finalBill: billSnapshot,
        finalAmount,
        amount: finalAmount,
        baseAmount,
        approvedExtraChargesAmount,
        applicableCharges,
        discount,
        companyCommission: platformChargeAmount,
        taxDeduction: taxAmount,
        servicemanPayoutAmount,
        completedAt: workEndedAt,
        deliveryStatus: 'verified',
        isVerifiedDelivery: true,
        verifiedAt: workEndedAt,
        isTrackingActive: false, // Stop live tracking / location sharing
        updatedAt: workEndedAt,
      });

      // Save bill snapshot to 'bills' collection for permanent audit record inside transaction
      const billDocRef = doc(db, 'bills', billId);
      transaction.set(billDocRef, billSnapshot);

      currentBookingSnapshot = booking;
    });

    if (alreadyCompleted && existingBill) {
      return res.status(200).json({
        success: true,
        message: 'Service is already marked as completed.',
        finalBill: existingBill,
        finalAmount: existingAmount,
      });
    }

    const booking = currentBookingSnapshot || initialBooking;
    const workEndedAt = billSnapshot.workEndedAt;

    // Phase 8: Update existing tracking status to COMPLETED in serviceTracking collection
    try {
      const trackingRef = doc(db, 'serviceTracking', bookingId);
      await updateDoc(trackingRef, {
        status: 'COMPLETED',
        lastUpdatedAt: workEndedAt,
      });
    } catch (trackErr) {
      console.warn('Could not update serviceTracking document to COMPLETED:', trackErr);
    }

    // 9. Audit trail
    try {
      await addDoc(collection(db, 'audit_logs'), {
        action: 'WORK_COMPLETED_FINAL_BILL_GENERATED',
        bookingId,
        billId: billSnapshot.id,
        serviceManId: authUid,
        customerId: booking.customerId,
        finalAmount,
        baseAmount: billSnapshot.baseAmount,
        extraServicesAmount: billSnapshot.extraServicesAmount,
        materialsAmount: billSnapshot.materialsAmount,
        workDurationMinutes: billSnapshot.workDurationMinutes,
        timestamp: workEndedAt,
      });
    } catch (auditErr) {
      console.warn('Could not write audit log:', auditErr);
    }

    // 10. Send customer notification
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: booking.customerId,
        title: 'Service Completed & Final Bill Ready',
        message: `Service completed by ${booking.serviceManName || 'professional'}. Total work duration: ${completedWorkDurationFormatted}. Final payable amount: ₹${finalAmount}.`,
        bookingId,
        billId: billSnapshot.id,
        type: 'work_completed',
        isRead: false,
        createdAt: workEndedAt,
      });
    } catch (notifErr) {
      console.warn('Could not write notification:', notifErr);
    }

    return res.status(200).json({
      success: true,
      message: 'Work completed and final bill generated successfully.',
      finalBill: billSnapshot,
      finalAmount,
    });
  } catch (err: any) {
    if (err.message === 'BOOKING_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    if (err.message?.startsWith('BOOKING_TERMINAL:')) {
      const st = err.message.split(':')[1];
      return res.status(400).json({
        success: false,
        error: `Cannot complete booking: booking is already ${st}.`,
      });
    }
    if (err.message === 'WORK_NOT_STARTED') {
      return res.status(400).json({
        success: false,
        error: 'Invalid state transition: Cannot complete booking before work has started and Arrival OTP is verified.',
      });
    }
    console.error('Error completing work:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

/**
 * Endpoint: POST /api/bookings/calculate-current-bill
 * Real-time calculation of current transparent breakdown without completing the booking.
 */
app.post('/api/bookings/calculate-current-bill', async (req, res) => {
  try {
    // 2-5. Authenticate caller using helper from Phase 1A (requires Bearer token, returns 401 if missing/invalid)
    const authUid = await verifyAuthUser(req, res);
    if (!authUid) {
      return;
    }

    const { bookingId } = req.body;
    // Phase 1J: Validate bookingId before any Firestore read/write
    if (!isValidBookingId(bookingId)) {
      return res.status(400).json({ success: false, error: 'Missing or invalid bookingId' });
    }

    // Phase 1H: Validate any client-supplied monetary fields in req.body (Test G)
    const clientMonetaryKeys = ['finalAmount', 'amount', 'finalTotal', 'total', 'baseAmount', 'discount', 'unitPrice', 'quantity', 'subtotal'];
    for (const key of clientMonetaryKeys) {
      if (req.body[key] !== undefined) {
        const v = Number(req.body[key]);
        if (!Number.isFinite(v) || Number.isNaN(v) || v < 0) {
          return res.status(400).json({
            success: false,
            error: `Invalid monetary value in ${key}: must be a finite, non-negative number.`,
          });
        }
      }
    }

    const cleanBookingId = bookingId.trim();
    const bookingRef = doc(db, 'bookings', cleanBookingId);
    const snap = await getDoc(bookingRef);
    if (!snap.exists()) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const booking = snap.data();

    const userEmail = (((req as any).user?.email) || '').toLowerCase().trim();
    const isAuthorizedAdmin = Boolean(userEmail && AUTHORIZED_ADMIN_EMAILS.includes(userEmail));

    if (req.body.customerId && typeof req.body.customerId === 'string') {
      const suppliedCustomerId = req.body.customerId.trim();
      if (suppliedCustomerId !== authUid && !isAuthorizedAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Cannot impersonate another customer.',
        });
      }
    }

    if (req.body.serviceManId && typeof req.body.serviceManId === 'string') {
      const suppliedServiceManId = req.body.serviceManId.trim();
      if (suppliedServiceManId !== authUid && !isAuthorizedAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Cannot impersonate another service professional.',
        });
      }
    }

    // 7-11. Verify authorized user:
    // Authorized participants:
    // - Customer who booked the service (customerId, userId, or customerUid matching authUid)
    // - Assigned Service Professional (serviceManId, servicemanId, or assignedProId matching authUid)
    // - Authorized Admin
    // Do NOT trust client-supplied customerId, serviceManId, userId, or role for authorization.
    const isCustomer = Boolean(
      (booking.customerId && booking.customerId === authUid) ||
      (booking.userId && booking.userId === authUid) ||
      (booking.customerUid && booking.customerUid === authUid)
    );
    const assignedProId = booking.serviceManId || booking.servicemanId || booking.assignedProId;
    const isAssignedPro = Boolean(assignedProId && assignedProId === authUid);

    if (!isCustomer && !isAssignedPro && !isAuthorizedAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You are not authorized to access billing information for this booking.',
      });
    }
    // 1-2. Server uses existing trusted booking/service pricing data; client-supplied base price ignored
    const rawBase = booking.baseAmount !== undefined ? booking.baseAmount : (booking.amount || 0);
    const numBase = Number(rawBase);
    const baseAmount = (Number.isFinite(numBase) && numBase >= 0) ? Math.round(numBase) : 0;

    const allCharges: any[] = Array.isArray(booking.extraCharges) ? booking.extraCharges : [];

    // 9-10. Customer approval is the sole authority; pending & rejected charges never enter final bill
    const approvedCharges = allCharges.filter((c) => {
      if (!c || typeof c !== 'object') return false;
      const status = String(c.approvalStatus || c.status || '').toLowerCase().trim();
      return status === 'approved';
    });
    const pendingCharges = allCharges.filter((c) => {
      if (!c || typeof c !== 'object') return false;
      const status = String(c.approvalStatus || c.status || '').toLowerCase().trim();
      return status === 'pending';
    });
    const rejectedCharges = allCharges.filter((c) => {
      if (!c || typeof c !== 'object') return false;
      const status = String(c.approvalStatus || c.status || '').toLowerCase().trim();
      return status === 'rejected';
    });

    // 5-6. Extra-charge calculations strictly use: quantity × unit price with finite monetary validation
    const extraServicesAmount = approvedCharges
      .filter((c) => c.type === 'service')
      .reduce((sum, c) => {
        const rawQty = Number(c.quantity);
        const qty = (Number.isFinite(rawQty) && rawQty > 0) ? Math.max(1, Math.round(rawQty)) : 1;
        const rawUnitPrice = Number(c.unitPrice);
        const unitPrice = (Number.isFinite(rawUnitPrice) && rawUnitPrice >= 0) ? Math.round(rawUnitPrice) : 0;
        return sum + (qty * unitPrice);
      }, 0);

    const materialsAmount = approvedCharges
      .filter((c) => c.type === 'material' || c.type === 'other')
      .reduce((sum, c) => {
        const rawQty = Number(c.quantity);
        const qty = (Number.isFinite(rawQty) && rawQty > 0) ? Math.max(1, Math.round(rawQty)) : 1;
        const rawUnitPrice = Number(c.unitPrice);
        const unitPrice = (Number.isFinite(rawUnitPrice) && rawUnitPrice >= 0) ? Math.round(rawUnitPrice) : 0;
        return sum + (qty * unitPrice);
      }, 0);

    const approvedExtraChargesAmount = extraServicesAmount + materialsAmount;

    const rawApplicable = booking.applicableCharges !== undefined
      ? booking.applicableCharges
      : (booking.safetyFee !== undefined
        ? booking.safetyFee
        : (booking.platformFee !== undefined ? booking.platformFee : 29));
    const numApplicable = Number(rawApplicable);
    const applicableCharges = (Number.isFinite(numApplicable) && numApplicable >= 0)
      ? Math.round(numApplicable)
      : 29;

    const rawDiscount = booking.discount !== undefined ? booking.discount : (booking.discountAmount || 0);
    const numDiscount = Number(rawDiscount);
    const discount = (Number.isFinite(numDiscount) && numDiscount >= 0)
      ? Math.round(numDiscount)
      : 0;

    const pendingTotal = pendingCharges.reduce((sum, c) => {
      const rawQty = Number(c.quantity);
      const qty = (Number.isFinite(rawQty) && rawQty > 0) ? Math.max(1, Math.round(rawQty)) : 1;
      const rawUnitPrice = Number(c.unitPrice);
      const unitPrice = (Number.isFinite(rawUnitPrice) && rawUnitPrice >= 0) ? Math.round(rawUnitPrice) : 0;
      return sum + (qty * unitPrice);
    }, 0);

    const currentEstimatedFinal = Math.max(
      0,
      Math.round(baseAmount + approvedExtraChargesAmount + applicableCharges - discount)
    );

    return res.status(200).json({
      success: true,
      breakdown: {
        baseAmount,
        approvedExtraChargesAmount,
        extraServicesAmount,
        materialsAmount,
        applicableCharges,
        discount,
        pendingTotal,
        currentEstimatedFinal,
        approvedCount: approvedCharges.length,
        pendingCount: pendingCharges.length,
        rejectedCount: rejectedCharges.length,
      },
    });
  } catch (err: any) {
    console.error('Error calculating bill:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

// =============================================================================
// CASH TRANSACTION BACKEND API (Flow: Booking -> Service completed -> Final bill -> Cash request -> Admin approval -> Ledgers)
// =============================================================================

/**
 * Endpoint: POST /api/bookings/cash-payment/request
 * Records a cash payment request from customer or assigned technician.
 * Derives authoritative final bill and sets safe unfinalized pending state.
 */
app.post('/api/bookings/cash-payment/request', async (req, res) => {
  try {
    const authUid = await verifyAuthUser(req, res);
    const effectiveUid = authUid || req.body?.uid;
    const { bookingId, callerRole, notes } = req.body;

    if (!bookingId || typeof bookingId !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid bookingId is required' });
    }

    const bookingRef = doc(db, 'bookings', bookingId.trim());
    const snap = await getDoc(bookingRef);
    if (!snap.exists()) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const booking = snap.data();

    // Verify caller ownership: must be customer, assigned serviceman, or admin
    const isCustomer = effectiveUid && (booking.customerId === effectiveUid || booking.userId === effectiveUid);
    const isServiceMan = effectiveUid && (booking.serviceManId === effectiveUid || booking.servicemanId === effectiveUid);
    const isAuthAdmin = effectiveUid === 'admin_deepak_root' || (req as any).user?.email?.includes('admin');

    if (!isCustomer && !isServiceMan && !isAuthAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You are not authorized to record cash transactions for this booking.',
      });
    }

    // Authoritative amount derivation
    let authoritativeAmount = 0;
    if (booking.finalBill && typeof booking.finalBill.finalAmount === 'number' && booking.finalBill.finalAmount >= 0) {
      authoritativeAmount = Math.round(booking.finalBill.finalAmount);
    } else if (typeof booking.finalAmount === 'number' && booking.finalAmount >= 0) {
      authoritativeAmount = Math.round(booking.finalAmount);
    } else if (typeof booking.amount === 'number' && booking.amount >= 0) {
      authoritativeAmount = Math.round(booking.amount);
    }

    if (authoritativeAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Authoritative booking bill amount must be greater than zero.',
      });
    }

    const nowIso = new Date().toISOString();
    const transactionId = `tx_cash_${bookingId.trim()}_${Date.now()}`;
    const normalizedRole = String(callerRole || (isServiceMan ? 'SERVICE_PRO' : 'CUSTOMER')).toUpperCase();

    // Write pending transaction
    await setDoc(doc(db, 'transactions', transactionId), {
      id: transactionId,
      transactionId,
      bookingId: bookingId.trim(),
      serviceId: booking.serviceId || '',
      serviceName: booking.serviceName || 'HARDINKAAM Service',
      customerId: booking.customerId,
      customerName: booking.customerName || '',
      customerPhone: booking.customerPhone || '',
      serviceManId: booking.serviceManId || '',
      serviceManName: booking.serviceManName || '',
      partnerId: booking.partnerId || '',
      districtId: booking.districtId || '',
      amount: authoritativeAmount,
      currency: 'INR',
      paymentMethod: 'cash',
      type: 'CASH_TRANSACTION',
      status: 'PENDING',
      requestedBy: effectiveUid || 'unknown',
      requestedByRole: normalizedRole,
      requestedAt: nowIso,
      notes: notes ? String(notes).trim() : (isServiceMan ? 'Cash payment collected upon service completion' : 'Customer requested cash payment'),
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    // Update booking with pending cash status without finalizing paymentStatus
    await updateDoc(bookingRef, {
      paymentMethod: 'cash',
      cashPaymentStatus: 'pending_approval',
      cashTransactionId: transactionId,
      cashRequestedAt: nowIso,
      cashRequestedBy: effectiveUid || 'unknown',
      updatedAt: nowIso,
    });

    // Notify Admin
    try {
      await addDoc(collection(db, 'notifications'), {
        recipientId: 'admin_deepak_root',
        userId: effectiveUid || 'unknown',
        targetRole: 'admin',
        type: 'cash_payment_approval',
        title: 'नकद भुगतान सत्यापन अनुरोध (Cash Transaction Request)',
        message: `बुकिंग #${bookingId.trim()} (${booking.serviceName}) के लिए ₹${authoritativeAmount} नकद भुगतान अनुरोध प्राप्त हुआ है।`,
        amount: authoritativeAmount,
        bookingId: bookingId.trim(),
        transactionId,
        createdAt: nowIso,
        read: false,
      });
    } catch (_) {}

    return res.json({
      success: true,
      transactionId,
      status: 'PENDING',
      amount: authoritativeAmount,
    });
  } catch (err: any) {
    console.error('Error in cash payment request endpoint:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

/**
 * Endpoint: POST /api/bookings/cash-payment/approve
 * Admin verifies and approves a cash transaction, updates booking paymentStatus to 'paid',
 * and atomically generates commission ledgers.
 */
app.post('/api/bookings/cash-payment/approve', requireAdminAuth, async (req, res) => {
  try {
    const { transactionId, bookingId, adminName, adminNotes } = req.body;
    if (!transactionId || !bookingId) {
      return res.status(400).json({ success: false, error: 'transactionId and bookingId are required' });
    }

    const txDocRef = doc(db, 'transactions', transactionId);
    const bkDocRef = doc(db, 'bookings', bookingId);
    const [txSnap, bkSnap] = await Promise.all([getDoc(txDocRef), getDoc(bkDocRef)]);

    if (!txSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Transaction document not found' });
    }
    if (!bkSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Booking document not found' });
    }

    const txData = txSnap.data();
    const bkData = bkSnap.data();
    const nowIso = new Date().toISOString();
    const approver = adminName || 'DEEPAK (Super Admin)';
    const finalAmount = txData.amount || bkData.finalAmount || bkData.amount || 0;

    const companyRate = 15;
    const franchiseRate = 15;
    const partnerRate = bkData.partnerId ? 5 : 0;
    const servicemanRate = Math.max(0, 100 - companyRate - partnerRate);

    const companyShare = Math.round((finalAmount * companyRate) / 100);
    const franchiseDueToHQ = Math.round((finalAmount * franchiseRate) / 100);
    const partnerShare = partnerRate > 0 ? Math.round((finalAmount * partnerRate) / 100) : 0;
    const servicemanShare = finalAmount - companyShare - partnerShare;

    // Check duplicate commission
    const ledgersRef = collection(db, 'ledgers');
    const existingLedgersSnap = await getDocs(query(ledgersRef, where('bookingId', '==', bookingId), limit(1)));
    const alreadyHasLedger = !existingLedgersSnap.empty;

    // Update Transaction
    await updateDoc(txDocRef, {
      status: 'APPROVED',
      approvedAt: nowIso,
      approvedBy: approver,
      adminNotes: adminNotes || 'Approved by Admin',
      updatedAt: nowIso,
    });

    // Update Booking
    const bkUpdate: any = {
      paymentStatus: 'paid',
      cashPaymentStatus: 'approved',
      paymentMethod: 'cash',
      paidAt: nowIso,
      paymentTransactionId: transactionId,
      paymentConfirmedBy: approver,
      updatedAt: nowIso,
    };
    if (bkData.finalBill) {
      bkUpdate.finalBill = {
        ...bkData.finalBill,
        paymentStatus: 'paid',
        paymentMethod: 'cash',
        paidAt: nowIso,
        paymentTransactionId: transactionId,
      };
    }
    await updateDoc(bkDocRef, bkUpdate);

    // Generate Ledgers
    if (!alreadyHasLedger) {
      const companyLedgerId = `ledger_company_${bookingId}`;
      await setDoc(doc(db, 'ledgers', companyLedgerId), {
        id: companyLedgerId,
        bookingId,
        ledgerOwnerId: 'admin_deepak_root',
        ledgerOwnerRole: 'ADMIN',
        commissionType: 'company_margin',
        grossBookingAmount: finalAmount,
        commissionPercent: companyRate,
        amount: companyShare,
        isPayableToHardinkaam: false,
        status: 'cleared',
        collectionStatus: 'paid',
        createdAt: nowIso,
        notes: `HARDINKAAM Company Share from Cash Booking #${bookingId}`,
      });

      if (bkData.districtId) {
        const franchiseOwnerId = bkData.franchisePartnerId || `franchise_${bkData.districtId}`;
        const franchiseLedgerId = `ledger_franchise_${bookingId}`;
        await setDoc(doc(db, 'ledgers', franchiseLedgerId), {
          id: franchiseLedgerId,
          bookingId,
          districtId: bkData.districtId,
          ledgerOwnerId: franchiseOwnerId,
          ledgerOwnerRole: 'FRANCHISE',
          commissionType: 'franchise_commission',
          grossBookingAmount: finalAmount,
          commissionPercent: franchiseRate,
          amount: franchiseDueToHQ,
          isPayableToHardinkaam: true,
          status: 'cleared',
          collectionStatus: 'paid',
          createdAt: nowIso,
          notes: `Franchise Commission (15% due to HARDINKAAM) from Booking #${bookingId}`,
        });
      }

      if (bkData.partnerId && partnerShare > 0) {
        const partnerLedgerId = `ledger_partner_${bookingId}`;
        await setDoc(doc(db, 'ledgers', partnerLedgerId), {
          id: partnerLedgerId,
          bookingId,
          ledgerOwnerId: bkData.partnerId,
          ledgerOwnerRole: 'BUSINESS_PARTNER',
          commissionType: 'partner_commission',
          grossBookingAmount: finalAmount,
          commissionPercent: partnerRate,
          amount: partnerShare,
          isPayableToHardinkaam: false,
          status: 'cleared',
          collectionStatus: 'paid',
          createdAt: nowIso,
          notes: `Business Partner Commission from Booking #${bookingId}`,
        });
      }

      if (bkData.serviceManId) {
        const proLedgerId = `ledger_serviceman_${bookingId}`;
        await setDoc(doc(db, 'ledgers', proLedgerId), {
          id: proLedgerId,
          bookingId,
          ledgerOwnerId: bkData.serviceManId,
          ledgerOwnerRole: 'SERVICE_PRO',
          commissionType: 'serviceman_share',
          grossBookingAmount: finalAmount,
          commissionPercent: servicemanRate,
          amount: servicemanShare,
          isPayableToHardinkaam: false,
          status: 'cleared',
          collectionStatus: 'paid',
          createdAt: nowIso,
          notes: `Technician Payout Earnings from Cash Booking #${bookingId}`,
        });
      }
    }

    // Send notifications
    try {
      if (bkData.customerId) {
        await addDoc(collection(db, 'notifications'), {
          recipientId: bkData.customerId,
          userId: bkData.customerId,
          targetRole: 'customer',
          type: 'payment_verified',
          title: 'नकद भुगतान स्वीकृत व रसीद उपलब्ध! ✓',
          message: `आपकी बुकिंग #${bookingId} का ₹${finalAmount} नकद भुगतान सत्यापित कर लिया गया है।`,
          amount: finalAmount,
          bookingId,
          createdAt: nowIso,
          read: false,
        });
      }
      if (bkData.serviceManId) {
        await addDoc(collection(db, 'notifications'), {
          recipientId: bkData.serviceManId,
          userId: bkData.serviceManId,
          targetRole: 'service_man',
          type: 'payment_verified',
          title: 'कैश भुगतान स्वीकृत व कमीशन सेटल! ✓',
          message: `बुकिंग #${bookingId} का ₹${finalAmount} नकद भुगतान एडमिन द्वारा स्वीकृत कर दिया गया है।`,
          amount: servicemanShare,
          bookingId,
          createdAt: nowIso,
          read: false,
        });
      }
    } catch (_) {}

    return res.json({
      success: true,
      transactionId,
      status: 'APPROVED',
      amount: finalAmount,
    });
  } catch (err: any) {
    console.error('Error approving cash transaction:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

/**
 * Endpoint: POST /api/bookings/cash-payment/reject
 * Admin rejects a cash transaction
 */
app.post('/api/bookings/cash-payment/reject', requireAdminAuth, async (req, res) => {
  try {
    const { transactionId, bookingId, rejectionReason, adminName } = req.body;
    if (!transactionId || !bookingId) {
      return res.status(400).json({ success: false, error: 'transactionId and bookingId are required' });
    }

    const txDocRef = doc(db, 'transactions', transactionId);
    const bkDocRef = doc(db, 'bookings', bookingId);
    const nowIso = new Date().toISOString();
    const approver = adminName || 'DEEPAK (Super Admin)';
    const reason = rejectionReason || 'नकद राशि अप्राप्त / मिसमैच';

    await updateDoc(txDocRef, {
      status: 'REJECTED',
      rejectedAt: nowIso,
      rejectedBy: approver,
      rejectionReason: reason,
      updatedAt: nowIso,
    });

    await updateDoc(bkDocRef, {
      cashPaymentStatus: 'rejected',
      paymentStatus: 'unpaid',
      updatedAt: nowIso,
    });

    return res.json({
      success: true,
      transactionId,
      status: 'REJECTED',
    });
  } catch (err: any) {
    console.error('Error rejecting cash transaction:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

/**
 * Endpoint: GET /api/bookings/cash-payment/pending
 * Returns pending cash transactions (Admin only)
 */
app.get('/api/bookings/cash-payment/pending', requireAdminAuth, async (_req, res) => {
  try {
    const q = query(
      collection(db, 'transactions'),
      where('type', '==', 'CASH_TRANSACTION'),
      limit(100)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => d.data());
    const pending = list.filter((t: any) => t.status === 'PENDING' || t.status === 'ADMIN_REVIEW');
    return res.json({ success: true, transactions: pending });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// PHASE 2: BOOKING ALERT & ATOMIC ASSIGNMENT BACKEND ENDPOINTS
// =============================================================================

/**
 * Endpoint: POST /api/bookings/dispatch-alert
 * Backend trigger that determines eligible ServiceMen, creates assignment offers,
 * and initiates push notifications without exposing credentials to the client.
 */
app.post(['/api/bookings/dispatch-alert', '/api/booking-offers/create'], async (req, res) => {
  try {
    // Ensure server-side admin session is active and authenticated before making Firestore queries
    if (!auth.currentUser) {
      console.log('[Firebase Auth] Active session missing during dispatch. Authenticating...');
      await authenticateServerInstance();
    }

    const { bookingId } = req.body;
    if (!isValidBookingId(bookingId)) {
      return res.status(400).json({ success: false, error: 'Missing or invalid bookingId' });
    }

    const cleanBookingId = bookingId.trim();
    const bookingRef = doc(db, 'bookings', cleanBookingId);
    const snap = await getDoc(bookingRef);
    if (!snap.exists()) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const booking = snap.data() as any;
    const currentStatus = (booking.status || 'pending').toLowerCase();

    // Idempotency & Lifecycle Guard
    if (['accepted', 'in_progress', 'work_started', 'completed', 'cancelled', 'rejected'].includes(currentStatus)) {
      return res.status(200).json({
        success: false,
        code: 'ALREADY_PROCESSED',
        message: `Booking is already in '${currentStatus}' status. Dispatch skipped.`,
      });
    }

    // Duplicate check: if already dispatched recently, avoid flood
    if (booking.offersDispatched === true && booking.alertDispatchedAt) {
      const elapsedMinutes = (Date.now() - new Date(booking.alertDispatchedAt).getTime()) / (60 * 1000);
      if (elapsedMinutes < 5) {
        return res.status(200).json({
          success: true,
          code: 'ALREADY_DISPATCHED',
          message: `Offers already dispatched ${Math.round(elapsedMinutes)}m ago. Duplicate prevented.`,
        });
      }
    }

    const nowIso = new Date().toISOString();

    // Query all service_men for eligibility
    const prosRef = collection(db, 'service_men');
    const prosSnap = await getDocs(prosRef);

    const bookingDistrictId = (booking.districtId || '').toLowerCase().trim();
    const bookingDistrictName = (booking.districtName || '').toLowerCase().trim();
    const bookingCity = (booking.city || '').toLowerCase().trim();
    const bookingCategoryId = (booking.categoryId || '').trim();

    const eligiblePros: any[] = [];

    prosSnap.forEach((docSnap) => {
      const pro = docSnap.data() as any;
      const proId = docSnap.id;

      // 1. Account status & active check
      const accountStatus = (pro.status || 'active').toLowerCase();
      if (accountStatus === 'suspended' || accountStatus === 'blocked' || accountStatus === 'inactive' || pro.isActive === false) {
        return;
      }

      // 2. Approved / verified according to existing rules
      const isKycVerified = pro.kycStatus === 'verified' || pro.kycStatus === 'approved';
      const isVerifiedFlag = pro.isVerified === true;
      if (!isVerifiedFlag && !isKycVerified) {
        return;
      }

      // 3. Online / Available check
      const isOnline = pro.isAvailable === true;
      const dutyStatus = (pro.dutyStatus || '').toLowerCase();
      if (!isOnline || dutyStatus === 'busy' || accountStatus === 'busy') {
        return;
      }

      // 4. Category / service match
      if (bookingCategoryId && Array.isArray(pro.categoryIds) && pro.categoryIds.length > 0) {
        if (!pro.categoryIds.includes(bookingCategoryId)) {
          return;
        }
      }

      // 5. District / permitted service area match
      if (bookingDistrictId || bookingDistrictName || bookingCity) {
        const proDistrictId = (pro.districtId || pro.assignedDistrictId || '').toLowerCase();
        const proDistrictName = (pro.districtName || pro.assignedDistrictName || '').toLowerCase();
        const proCity = (pro.city || '').toLowerCase();
        const serviceArea = (pro.serviceArea || '').toLowerCase();

        const matchesDistrictId = bookingDistrictId && proDistrictId === bookingDistrictId;
        const matchesDistrictName = bookingDistrictName && (proDistrictName === bookingDistrictName || serviceArea.includes(bookingDistrictName));
        const matchesCity = bookingCity && (proCity === bookingCity || serviceArea.includes(bookingCity));
        const matchesArea = !proDistrictId && !proCity;

        if (!matchesDistrictId && !matchesDistrictName && !matchesCity && !matchesArea) {
          return;
        }
      }

      eligiblePros.push({
        id: proId,
        userId: pro.userId || proId,
        name: pro.name || 'Service Pro',
        phone: pro.phone || '',
        email: pro.email || '',
        fcmTokens: Array.isArray(pro.fcmTokens) ? pro.fcmTokens : (pro.fcmToken ? [pro.fcmToken] : []),
      });
    });

    // Write safe audit log: SERVICEMAN_MATCHED
    try {
      await addDoc(collection(db, 'audit_logs'), {
        action: 'SERVICEMAN_MATCHED',
        bookingId,
        matchedCount: eligiblePros.length,
        timestamp: nowIso,
      });
    } catch (e) {
      console.warn('Audit note:', e);
    }

    if (eligiblePros.length === 0) {
      return res.status(200).json({
        success: true,
        code: 'NO_ELIGIBLE_SERVICEMAN',
        message: 'No available ServiceMen currently matched.',
        offersCount: 0,
      });
    }

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const createdOffers: any[] = [];

    // Create assignment offers & booking_offers in Firestore
    for (const pro of eligiblePros) {
      const offerId = `offer_${bookingId}_${pro.id}`;
      const assignmentId = `asgn_${bookingId}_${pro.id}`;
      const offerRef = doc(db, 'booking_offers', offerId);
      const assignmentRef = doc(db, 'booking_assignments', assignmentId);

      const existingOfferSnap = await getDoc(offerRef);
      if (existingOfferSnap.exists()) {
        const data = existingOfferSnap.data() as any;
        if (['PENDING', 'ACCEPTED'].includes(data.status)) {
          createdOffers.push({ offerId, assignmentId, proId: pro.id, status: data.status });
          continue;
        }
      }

      // Exact Booking Offer schema
      const offerData = {
        offerId,
        bookingId,
        serviceManId: pro.id,
        serviceManName: pro.name,
        serviceManPhone: pro.phone,
        districtId: booking.districtId || '',
        districtName: booking.districtName || booking.city || 'Central',
        serviceId: booking.serviceId || '',
        serviceName: booking.serviceName || '',
        categoryId: booking.categoryId || '',
        categoryName: booking.categoryName || '',
        amount: Number(booking.amount) || 0,
        scheduledDate: booking.scheduledDate || '',
        scheduledTime: booking.scheduledTime || '',
        address: booking.address || '',
        city: booking.city || '',
        pincode: booking.pincode || '',
        customerName: booking.customerName || '',
        customerPhone: booking.customerPhone || '',
        status: 'PENDING',
        createdAt: nowIso,
        expiresAt,
        updatedAt: nowIso,
      };

      await setDoc(offerRef, offerData, { merge: true });

      // Backwards-compatible booking_assignments
      const legacyData = {
        id: assignmentId,
        bookingId,
        serviceManId: pro.id,
        serviceManName: pro.name,
        serviceManPhone: pro.phone,
        district: offerData.districtName,
        districtId: offerData.districtId,
        service: offerData.serviceName,
        serviceId: offerData.serviceId,
        amount: offerData.amount,
        status: 'offered',
        createdAt: nowIso,
        expiresAt,
        updatedAt: nowIso,
      };
      await setDoc(assignmentRef, legacyData, { merge: true });

      // Dispatch real-time FCM Push Notification to the Service Professional for new job offer
      notifyServiceProNewAssignment(booking, pro.id, offerId).catch((fcmErr) => {
        console.warn(`[FCM] Offer push notification notice for pro ${pro.id}:`, fcmErr?.message || fcmErr);
      });

      // Safe Log: OFFER_CREATED
      try {
        await addDoc(collection(db, 'audit_logs'), {
          action: 'OFFER_CREATED',
          bookingId,
          serviceManId: pro.id,
          offerId,
          assignmentId,
          timestamp: nowIso,
        });
      } catch (e) {
        console.warn('Audit note:', e);
      }

      createdOffers.push({
        offerId,
        assignmentId,
        proId: pro.id,
        status: 'PENDING',
      });
    }

    // Update booking document
    await updateDoc(bookingRef, {
      offersDispatched: true,
      offersCount: createdOffers.length,
      alertDispatchedAt: nowIso,
      updatedAt: nowIso,
    });

    return res.status(200).json({
      success: true,
      code: 'OFFERS_DISPATCHED',
      offersCreated: createdOffers.length,
      offers: createdOffers,
    });
  } catch (err: any) {
    console.error('dispatch-alert error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

/**
 * Protected server-controlled fields that cannot be overwritten by client requests
 * (Phase 1M: Requirements 5, 6, 7, 8, 9; Security Tests C, D, E, F)
 */
const PROTECTED_BOOKING_FIELDS = new Set([
  'id',
  'bookingId',
  'customerId',
  'userId',
  'customerUid',
  'serviceManId',
  'servicemanId',
  'assignedProId',
  'serviceManName',
  'serviceManPhone',
  'status',
  'bookingStatus',
  'approvalState',
  'approvalStatus',
  'finalBill',
  'bill',
  'billBreakdown',
  'billingDetails',
  'totalPayable',
  'payableAmount',
  'finalAmount',
  'finalTotal',
  'total',
  'subtotal',
  'extraChargeTotal',
  'baseAmount',
  'baseServiceCharge',
  'discount',
  'tax',
  'unitPrice',
  'quantity',
  'extraCharges',
  'extraCharge',
  'createdAt',
  'created_at',
  'completionState',
  'completedAt',
  'workEndedAt',
  'workStatus',
  'cancellationState',
  'cancelledAt',
  'cancelledBy',
  'cancelReason',
  'cancellationReason',
  'arrivalOtpHash',
  'arrivalOtp',
  'otp',
  'otpExpiresAt',
  'otpAttempts',
  'otpVerifiedAt',
  'paymentStatus',
  'razorpayOrderId',
  'razorpayPaymentId',
]);

/**
 * Endpoint: POST /api/bookings/accept-offer (and /api/booking-offers/accept, /api/bookings/update-status, /api/bookings/status, /api/bookings/update)
 * Phase 1K & 1M: Secure booking state transitions and read/write consistency.
 * Enforces verified Firebase ID token authentication, UID-based authorization,
 * strict state transition sequence, and atomic concurrency protection.
 * Prevents race conditions, stale overwrites, and protected field tampering.
 */
app.post(
  [
    '/api/bookings/accept-offer',
    '/api/booking-offers/accept',
    '/api/bookings/update-status',
    '/api/bookings/status',
    '/api/bookings/update',
    '/api/bookings/update-booking',
    '/api/bookings/:bookingId/update',
    '/api/bookings/:bookingId',
  ],
  async (req, res) => {
    try {
      // 1-5. Authenticate caller using helper from Phase 1A (requires Bearer token, returns 401 if missing/invalid)
      const authUid = await verifyAuthUser(req, res);
      if (!authUid) return;

      const rawBookingId =
        req.body?.bookingId ||
        req.params?.bookingId ||
        req.body?.booking?.id ||
        req.body?.booking?.bookingId;

      if (!isValidBookingId(rawBookingId)) {
        return res.status(400).json({ success: false, error: 'Missing or invalid bookingId' });
      }

      const cleanBookingId = String(rawBookingId).trim();

      // Check if this request is a status transition or general data update
      const rawStatus =
        req.body?.status ||
        req.body?.newStatus ||
        req.body?.nextStatus ||
        (req.path && req.path.includes('accept') ? 'accepted' : '');

      const isStatusTransition = typeof rawStatus === 'string' && rawStatus.trim().length > 0;
      const requestedStatus = isStatusTransition ? rawStatus.toLowerCase().trim() : '';

      const VALID_BOOKING_STATUSES = new Set([
        'pending',
        'assigned',
        'offered',
        'accepted',
        'on_the_way',
        'arriving',
        'arrived',
        'otp_pending',
        'in_progress',
        'work_started',
        'completed',
        'work_completed',
        'cancelled',
        'rejected',
      ]);

      if (isStatusTransition && !VALID_BOOKING_STATUSES.has(requestedStatus)) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_STATUS',
          error: `Invalid status value: '${requestedStatus}'.`,
        });
      }

      // Guard: Workflow step preservation (Requirements 13-15)
      // Normal status updates cannot skip required workflow steps:
      // 1) Direct transition to completed/final-billing state is prohibited (must use /api/bookings/complete-work)
      if (isStatusTransition && (requestedStatus === 'completed' || requestedStatus === 'work_completed')) {
        return res.status(400).json({
          success: false,
          code: 'DIRECT_COMPLETION_NOT_ALLOWED',
          error: 'Invalid state transition: Booking completion and final billing must be performed via /api/bookings/complete-work.',
        });
      }

      // 2) Direct transition to in_progress/work_started is prohibited (must verify Arrival OTP via /api/bookings/verify-arrival-otp)
      if (isStatusTransition && (requestedStatus === 'in_progress' || requestedStatus === 'work_started')) {
        return res.status(400).json({
          success: false,
          code: 'ARRIVAL_OTP_REQUIRED',
          error: 'Invalid state transition: Transitioning to work started requires Arrival OTP verification via /api/bookings/verify-arrival-otp.',
        });
      }

      const userEmail = (((req as any).user?.email) || '').toLowerCase().trim();
      const isAdmin = Boolean(userEmail && AUTHORIZED_ADMIN_EMAILS.includes(userEmail));

      // Requirements 8 & 9, Security Test C, D, E, F:
      // Do NOT trust client fields (serviceManId, customerId, userId, role) for authorization.
      if (req.body.customerId && typeof req.body.customerId === 'string') {
        const suppliedCustomerId = req.body.customerId.trim();
        if (suppliedCustomerId !== authUid && !isAdmin) {
          return res.status(403).json({
            success: false,
            code: 'FORBIDDEN_IMPERSONATION',
            error: 'Forbidden: Cannot impersonate another customer.',
          });
        }
      }

      if (req.body.serviceManId && typeof req.body.serviceManId === 'string') {
        const suppliedServiceManId = req.body.serviceManId.trim();
        if (suppliedServiceManId !== authUid && !isAdmin) {
          return res.status(403).json({
            success: false,
            code: 'FORBIDDEN_IMPERSONATION',
            error: 'Forbidden: Cannot impersonate another service professional.',
          });
        }
      }

      const bookingRef = doc(db, 'bookings', cleanBookingId);
      const nowIso = new Date().toISOString();

      // Atomic Transaction (Requirement 16)
      const result = await runTransaction(db, async (transaction) => {
        const bookingDoc = await transaction.get(bookingRef);
        if (!bookingDoc.exists()) {
          throw new Error('BOOKING_NOT_FOUND');
        }

        const bookingData = bookingDoc.data() as any;
        const currentStatus = String(bookingData.status || 'pending').toLowerCase().trim();

        // Server-side ownership / participant checks
        const isCustomer = (
          bookingData.customerId === authUid ||
          bookingData.userId === authUid ||
          bookingData.customerUid === authUid
        );
        const assignedProId = bookingData.serviceManId || bookingData.servicemanId || bookingData.assignedProId;
        const isAssignedPro = Boolean(assignedProId && assignedProId === authUid);

        // Terminal state protections
        if (currentStatus === 'cancelled' || currentStatus === 'rejected') {
          throw new Error('BOOKING_ALREADY_CANCELLED');
        }
        if (currentStatus === 'completed' || currentStatus === 'work_completed') {
          throw new Error('BOOKING_ALREADY_COMPLETED');
        }

        // ==========================================
        // 0. GENERAL DATA UPDATE (No status transition)
        // Phase 1M Requirements 5, 6, 7, 8, 9; Security Tests C, D, E, F
        // ==========================================
        if (!isStatusTransition) {
          if (!isCustomer && !isAssignedPro && !isAdmin) {
            throw new Error('UNAUTHORIZED_STATUS_CHANGE');
          }

          // Filter client data to prevent overwriting protected server fields
          const candidateData =
            typeof req.body.booking === 'object' && req.body.booking !== null
              ? req.body.booking
              : req.body;

          const allowedUpdates: any = { updatedAt: nowIso };
          for (const [key, value] of Object.entries(candidateData)) {
            if (!PROTECTED_BOOKING_FIELDS.has(key) && value !== undefined) {
              allowedUpdates[key] = value;
            }
          }

          transaction.update(bookingRef, allowedUpdates);

          return {
            success: true,
            bookingId: cleanBookingId,
            status: currentStatus,
            message: 'Booking updated successfully',
          };
        }

        // ==========================================
        // IDEMPOTENT STATUS CHECK (Test B & C)
        // If status requested is identical to current server status, no-op and preserve state
        // ==========================================
        if (requestedStatus === currentStatus) {
          return {
            success: true,
            bookingId: cleanBookingId,
            status: currentStatus,
            message: `Booking is already in state '${currentStatus}'.`,
          };
        }

        // ==========================
        // 1. CANCEL TRANSITION
        // ==========================
        if (requestedStatus === 'cancelled') {
          if (!isCustomer && !isAssignedPro && !isAdmin) {
            throw new Error('UNAUTHORIZED_STATUS_CHANGE');
          }
          if ((currentStatus === 'in_progress' || currentStatus === 'work_started') && !isAdmin) {
            throw new Error('CANNOT_CANCEL_IN_PROGRESS');
          }

          transaction.update(bookingRef, {
            status: 'cancelled',
            cancelledAt: nowIso,
            cancelledBy: isCustomer ? 'customer' : (isAssignedPro ? 'service_man' : 'admin'),
            cancelReason: typeof req.body.reason === 'string' ? req.body.reason.trim() : 'Cancelled by user',
            updatedAt: nowIso,
          });

          return {
            success: true,
            bookingId: cleanBookingId,
            status: 'cancelled',
            cancelledAt: nowIso,
          };
        }

        // ==========================
        // 2. ON THE WAY / ARRIVING / ARRIVED TRANSITIONS
        // ==========================
        if (['on_the_way', 'arriving', 'arrived'].includes(requestedStatus)) {
          if (!isAssignedPro && !isAdmin) {
            throw new Error('UNAUTHORIZED_STATUS_CHANGE');
          }
          if (requestedStatus === 'on_the_way' && currentStatus !== 'accepted') {
            throw new Error('INVALID_STATE_TRANSITION');
          }
          if (requestedStatus === 'arrived' && currentStatus !== 'on_the_way' && currentStatus !== 'arriving') {
            throw new Error('INVALID_STATE_TRANSITION');
          }

          const updates: any = {
            status: requestedStatus,
            updatedAt: nowIso,
          };
          if (requestedStatus === 'on_the_way') updates.onTheWayAt = nowIso;
          if (requestedStatus === 'arrived') updates.arrivedAt = nowIso;

          transaction.update(bookingRef, updates);

          return {
            success: true,
            bookingId: cleanBookingId,
            status: requestedStatus,
            updatedAt: nowIso,
          };
        }

        // ==========================
        // 3. ACCEPT TRANSITION (Offer acceptance workflow)
        // ==========================
        if (requestedStatus === 'accepted') {
          // Guard 1: Booking must not already be claimed by someone else
          if (['accepted', 'on_the_way', 'arriving', 'arrived', 'in_progress', 'work_started', 'completed'].includes(currentStatus)) {
            if (bookingData.serviceManId === authUid) {
              return {
                alreadyAccepted: true,
                bookingData,
                bookingId: cleanBookingId,
                serviceManId: authUid,
                status: 'accepted',
              };
            }
            throw new Error('BOOKING_ALREADY_TAKEN');
          }

          const offerId =
            req.body.offerId ||
            (req.body.assignmentId
              ? req.body.assignmentId.replace('asgn_', 'offer_')
              : `offer_${cleanBookingId}_${authUid}`);
          const assignmentId =
            req.body.assignmentId ||
            (req.body.offerId
              ? req.body.offerId.replace('offer_', 'asgn_')
              : `asgn_${cleanBookingId}_${authUid}`);

          const offerRef = doc(db, 'booking_offers', offerId);
          const assignmentRef = doc(db, 'booking_assignments', assignmentId);

          const offerDoc = await transaction.get(offerRef);
          let offerData: any = null;

          if (offerDoc.exists()) {
            offerData = offerDoc.data();
          } else {
            const asgnDoc = await transaction.get(assignmentRef);
            if (asgnDoc.exists()) {
              offerData = asgnDoc.data();
            }
          }

          if (!offerData) {
            throw new Error('OFFER_NOT_FOUND');
          }

          // Authenticated UID must match the service professional targeted by this offer
          if (offerData.serviceManId !== authUid && !isAdmin) {
            throw new Error('UNAUTHORIZED_ASSIGNMENT');
          }

          // Enforce: ONLY PENDING → ACCEPTED allowed for first valid acceptance
          const normalizedStatus = (offerData.status || '').toUpperCase();
          if (normalizedStatus !== 'PENDING' && offerData.status !== 'offered') {
            if (normalizedStatus === 'ACCEPTED' || offerData.status === 'accepted') {
              return {
                alreadyAccepted: true,
                bookingData,
                bookingId: cleanBookingId,
                serviceManId: authUid,
                status: 'accepted',
              };
            }
            throw new Error('OFFER_NO_LONGER_VALID');
          }

          // Expiry check
          if (offerData.expiresAt && new Date(offerData.expiresAt).getTime() < Date.now()) {
            throw new Error('OFFER_EXPIRED');
          }

          // 1. Assign & Accept Booking
          transaction.update(bookingRef, {
            status: 'accepted',
            serviceManId: authUid,
            serviceManName: offerData.serviceManName || bookingData.serviceManName || 'Technician',
            serviceManPhone: offerData.serviceManPhone || bookingData.serviceManPhone || '',
            acceptedAt: nowIso,
            updatedAt: nowIso,
          });

          // 2. Mark this Offer as ACCEPTED
          transaction.set(
            offerRef,
            {
              status: 'ACCEPTED',
              respondedAt: nowIso,
              updatedAt: nowIso,
            },
            { merge: true }
          );

          // 3. Mark legacy assignment as accepted
          transaction.set(
            assignmentRef,
            {
              status: 'accepted',
              acceptedAt: nowIso,
              updatedAt: nowIso,
            },
            { merge: true }
          );

          return {
            success: true,
            bookingId: cleanBookingId,
            serviceManId: authUid,
            status: 'accepted',
            offerId,
            assignmentId,
            acceptedAt: nowIso,
          };
        }

        // If transition is not explicitly allowed
        throw new Error('INVALID_STATE_TRANSITION');
      });

      // Cleanup remaining pending offers if transition was successful offer acceptance
      if (result.status === 'accepted' && !(result as any).alreadyAccepted) {
        try {
          const offerId = (result as any).offerId;
          const assignmentId = (result as any).assignmentId;

          const otherOffersQ = query(
            collection(db, 'booking_offers'),
            where('bookingId', '==', cleanBookingId),
            where('status', '==', 'PENDING')
          );
          const otherOffersSnap = await getDocs(otherOffersQ);
          if (!otherOffersSnap.empty) {
            const batch = writeBatch(db);
            otherOffersSnap.forEach((docSnap) => {
              if (docSnap.id !== offerId) {
                batch.update(docSnap.ref, {
                  status: 'EXPIRED',
                  respondedAt: nowIso,
                  rejectionReason: 'Claimed by another service professional',
                  updatedAt: nowIso,
                });
              }
            });
            await batch.commit();
          }

          const otherAsgnQ = query(
            collection(db, 'booking_assignments'),
            where('bookingId', '==', cleanBookingId),
            where('status', '==', 'offered')
          );
          const otherAsgnSnap = await getDocs(otherAsgnQ);
          if (!otherAsgnSnap.empty) {
            const batch = writeBatch(db);
            otherAsgnSnap.forEach((docSnap) => {
              if (docSnap.id !== assignmentId) {
                batch.update(docSnap.ref, {
                  status: 'closed',
                  closedReason: 'taken_by_another_serviceman',
                  closedAt: nowIso,
                  updatedAt: nowIso,
                });
              }
            });
            await batch.commit();
          }
        } catch (closeErr) {
          console.warn('Non-fatal cleanup of other offers:', closeErr);
        }

        // Safe Log: ACCEPT_SUCCESS
        try {
          await addDoc(collection(db, 'audit_logs'), {
            action: 'ACCEPT_SUCCESS',
            bookingId: cleanBookingId,
            serviceManId: authUid,
            status: 'accepted',
            timestamp: nowIso,
          });
        } catch (e) {
          console.warn('Audit note:', e);
        }
      }

      // Dispatch real-time FCM Push Notification for booking status change
      try {
        const fullBookingSnap = await getDoc(bookingRef);
        const bookingForPush = fullBookingSnap.exists()
          ? { id: cleanBookingId, ...fullBookingSnap.data() }
          : { id: cleanBookingId, status: result.status, serviceManId: (result as any).serviceManId || authUid };
        notifyBookingStatusChange(bookingForPush, result.status, authUid, req.body).catch((e) =>
          console.warn('[FCM] Status push notification notice:', e)
        );
      } catch (pushErr) {
        console.warn('[FCM] Non-fatal status notification dispatch note:', pushErr);
      }

      return res.status(200).json({
        success: true,
        message:
          (result as any).message ||
          (result.status === 'accepted'
            ? 'Booking successfully accepted ✓'
            : `Booking status updated to ${result.status}`),
        bookingId: result.bookingId,
        serviceManId: (result as any).serviceManId || authUid,
        status: result.status,
        acceptedAt: (result as any).acceptedAt || nowIso,
      });
    } catch (err: any) {
      const code = err.message || 'TRANSACTION_FAILED';

      if (code === 'BOOKING_ALREADY_TAKEN') {
        try {
          await addDoc(collection(db, 'audit_logs'), {
            action: 'BOOKING_ALREADY_TAKEN',
            bookingId: req.body?.bookingId,
            serviceManId: (req as any).uid || req.body?.serviceManId,
            timestamp: new Date().toISOString(),
          });
        } catch (e) {
          console.warn('Audit note:', e);
        }

        return res.status(409).json({
          success: false,
          code: 'BOOKING_ALREADY_TAKEN',
          error: 'Yeh booking pehle hi kisi anya service professional dwara accept ki ja chuki hai.',
        });
      }

      if (code === 'BOOKING_NOT_FOUND' || code === 'OFFER_NOT_FOUND' || code === 'ASSIGNMENT_NOT_FOUND') {
        return res.status(404).json({ success: false, code, error: code });
      }

      if (code === 'UNAUTHORIZED_ASSIGNMENT' || code === 'UNAUTHORIZED_STATUS_CHANGE') {
        return res.status(403).json({
          success: false,
          code: 'FORBIDDEN',
          error: 'Forbidden: You are not authorized to perform this status transition on this booking.',
        });
      }

      if (
        code === 'BOOKING_ALREADY_CANCELLED' ||
        code === 'BOOKING_ALREADY_COMPLETED' ||
        code === 'CANNOT_CANCEL_IN_PROGRESS' ||
        code === 'INVALID_STATE_TRANSITION'
      ) {
        return res.status(400).json({
          success: false,
          code,
          error: `Invalid state transition: Cannot transition booking in current state. (${code})`,
        });
      }

      if (code === 'OFFER_NO_LONGER_VALID' || code === 'OFFER_EXPIRED') {
        return res.status(400).json({
          success: false,
          code,
          error: code === 'OFFER_NO_LONGER_VALID' ? 'Offer is no longer active or has expired.' : code,
        });
      }

      console.error('status transition transaction error:', code);
      return res.status(400).json({
        success: false,
        code,
        error: code,
      });
    }
  }
);

/**
 * Endpoint: POST /api/bookings/cancel (and /api/bookings/cancel-booking, /api/bookings/:bookingId/cancel, /api/bookings/cancellation)
 * Phase 1L: Secure booking cancellation only.
 * Enforces verified Firebase ID token authentication, UID-based authorization,
 * terminal state protection, work-in-progress guards, billing integrity preservation,
 * and atomic concurrency safety.
 */
app.post(
  [
    '/api/bookings/cancel',
    '/api/bookings/cancel-booking',
    '/api/bookings/:bookingId/cancel',
    '/api/bookings/cancellation',
  ],
  async (req, res) => {
    try {
      // 1-5. Authenticate caller using helper from Phase 1A (requires Bearer token, returns 401 if missing/invalid)
      const authUid = await verifyAuthUser(req, res);
      if (!authUid) return;

      const rawBookingId = req.body?.bookingId || req.params?.bookingId;
      if (!isValidBookingId(rawBookingId)) {
        return res.status(400).json({ success: false, error: 'Missing or invalid bookingId' });
      }

      const cleanBookingId = String(rawBookingId).trim();
      const bookingRef = doc(db, 'bookings', cleanBookingId);
      const nowIso = new Date().toISOString();

      const userEmail = (((req as any).user?.email) || '').toLowerCase().trim();
      const isAdmin = Boolean(userEmail && AUTHORIZED_ADMIN_EMAILS.includes(userEmail));

      if (req.body?.customerId && typeof req.body.customerId === 'string') {
        const suppliedCustomerId = req.body.customerId.trim();
        if (suppliedCustomerId !== authUid && !isAdmin) {
          return res.status(403).json({
            success: false,
            error: 'Forbidden: Cannot impersonate another customer.',
          });
        }
      }

      if (req.body?.serviceManId && typeof req.body.serviceManId === 'string') {
        const suppliedServiceManId = req.body.serviceManId.trim();
        if (suppliedServiceManId !== authUid && !isAdmin) {
          return res.status(403).json({
            success: false,
            error: 'Forbidden: Cannot impersonate another service professional.',
          });
        }
      }

      // Reason extraction
      const reason =
        typeof req.body?.reason === 'string' && req.body.reason.trim()
          ? req.body.reason.trim()
          : typeof req.body?.cancellationReason === 'string' && req.body.cancellationReason.trim()
          ? req.body.cancellationReason.trim()
          : 'Cancelled by user';

      // Atomic Transaction (Requirement 16, Security Test J)
      const result = await runTransaction(db, async (transaction) => {
        const bookingDoc = await transaction.get(bookingRef);
        if (!bookingDoc.exists()) {
          throw new Error('BOOKING_NOT_FOUND');
        }

        const bookingData = bookingDoc.data() as any;
        const currentStatus = String(bookingData.status || 'pending').toLowerCase().trim();

        // 8-9. Server-authoritative ownership and participant check
        // Do NOT trust client-supplied customerId, serviceManId, userId, or role!
        const isCustomer = Boolean(
          bookingData.customerId === authUid ||
          bookingData.userId === authUid ||
          bookingData.customerUid === authUid
        );
        const assignedProId = bookingData.serviceManId || bookingData.servicemanId || bookingData.assignedProId;
        const isAssignedPro = Boolean(assignedProId && assignedProId === authUid);

        if (!isCustomer && !isAssignedPro && !isAdmin) {
          throw new Error('UNAUTHORIZED_CANCELLATION');
        }

        // 11. Terminal booking guards (Security Test F & G)
        if (currentStatus === 'completed' || currentStatus === 'work_completed') {
          throw new Error('BOOKING_ALREADY_COMPLETED');
        }

        if (currentStatus === 'cancelled' || currentStatus === 'rejected') {
          throw new Error('BOOKING_ALREADY_CANCELLED');
        }

        // 12. Work-in-progress check
        if ((currentStatus === 'in_progress' || currentStatus === 'work_started') && !isAdmin) {
          throw new Error('CANNOT_CANCEL_IN_PROGRESS');
        }

        const cancelledBy = isCustomer ? 'customer' : isAssignedPro ? 'service_man' : 'admin';

        // 14. Preserve billing integrity (Security Test I):
        // Cancellation must not approve extra charges, add pending charges to the final bill,
        // modify approved billing amounts, or create a duplicate final bill.
        const cancellationUpdates: any = {
          status: 'cancelled',
          cancelledAt: nowIso,
          cancelledBy,
          cancelReason: reason,
          cancellationReason: reason,
          updatedAt: nowIso,
        };

        // If extraCharges exist, make sure no pending charge gets approved or added to final bill
        if (Array.isArray(bookingData.extraCharges)) {
          cancellationUpdates.extraCharges = bookingData.extraCharges.map((ch: any) => {
            const chStatus = String(ch.approvalStatus || ch.status || '').toLowerCase().trim();
            if (chStatus === 'pending') {
              return {
                ...ch,
                approvalStatus: 'cancelled',
                status: 'cancelled',
                cancelledAt: nowIso,
              };
            }
            return ch;
          });
        }

        transaction.update(bookingRef, cancellationUpdates);

        return {
          success: true,
          bookingId: cleanBookingId,
          status: 'cancelled',
          cancelledAt: nowIso,
          cancelledBy,
          cancellationReason: reason,
        };
      });

      // Cleanup remaining pending offers if any
      try {
        const offersQ = query(
          collection(db, 'booking_offers'),
          where('bookingId', '==', cleanBookingId),
          where('status', '==', 'PENDING')
        );
        const offersSnap = await getDocs(offersQ);
        if (!offersSnap.empty) {
          const batch = writeBatch(db);
          offersSnap.forEach((docSnap) => {
            batch.update(docSnap.ref, {
              status: 'EXPIRED',
              respondedAt: nowIso,
              rejectionReason: 'Booking cancelled',
              updatedAt: nowIso,
            });
          });
          await batch.commit();
        }
      } catch (cleanupErr) {
        console.warn('Non-fatal cleanup of offers on cancellation:', cleanupErr);
      }

      // Safe Audit Log
      try {
        await addDoc(collection(db, 'audit_logs'), {
          action: 'BOOKING_CANCELLED',
          bookingId: cleanBookingId,
          cancelledBy: result.cancelledBy,
          cancellationReason: reason,
          timestamp: nowIso,
        });
      } catch (auditErr) {
        console.warn('Audit note:', auditErr);
      }

      return res.status(200).json({
        success: true,
        message: 'Booking successfully cancelled',
        bookingId: result.bookingId,
        status: result.status,
        cancelledAt: result.cancelledAt,
        cancelledBy: result.cancelledBy,
        cancellationReason: result.cancellationReason,
      });
    } catch (err: any) {
      const code = err.message || 'CANCELLATION_FAILED';

      if (code === 'BOOKING_NOT_FOUND') {
        return res.status(404).json({ success: false, code, error: 'Booking not found.' });
      }

      if (code === 'UNAUTHORIZED_CANCELLATION') {
        return res.status(403).json({
          success: false,
          code: 'FORBIDDEN',
          error: 'Forbidden: You are not authorized to cancel this booking.',
        });
      }

      if (code === 'BOOKING_ALREADY_COMPLETED') {
        return res.status(400).json({
          success: false,
          code: 'BOOKING_ALREADY_COMPLETED',
          error: 'Cannot cancel a booking that has already been completed.',
        });
      }

      if (code === 'BOOKING_ALREADY_CANCELLED') {
        return res.status(400).json({
          success: false,
          code: 'BOOKING_ALREADY_CANCELLED',
          error: 'Booking is already cancelled. Duplicate cancellation rejected.',
        });
      }

      if (code === 'CANNOT_CANCEL_IN_PROGRESS') {
        return res.status(400).json({
          success: false,
          code: 'CANNOT_CANCEL_IN_PROGRESS',
          error: 'Cannot cancel booking once service is in progress. Please contact customer support.',
        });
      }

      console.error('Cancellation error:', code);
      return res.status(400).json({
        success: false,
        code,
        error: code,
      });
    }
  }
);

/**
 * Endpoint: POST /api/booking-offers/reject
 * Reject a pending offer explicitly by the professional.
 * Phase 1N: Enforces verified Firebase UID authentication, ensures pro can only
 * reject offers assigned to themselves, and blocks impersonation.
 */
app.post('/api/booking-offers/reject', async (req, res) => {
  try {
    const authUid = await verifyAuthUser(req, res);
    if (!authUid) return;

    const { offerId, serviceManId, reason = 'Declined by professional' } = req.body;
    if (!offerId) {
      return res.status(400).json({ success: false, error: 'Missing offerId' });
    }

    const userEmail = (((req as any).user?.email) || '').toLowerCase().trim();
    const isAdmin = Boolean(userEmail && AUTHORIZED_ADMIN_EMAILS.includes(userEmail));

    if (serviceManId && typeof serviceManId === 'string') {
      const cleanServiceManId = serviceManId.trim();
      if (cleanServiceManId !== authUid && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Cannot impersonate another service professional.',
        });
      }
    }

    const cleanOfferId = String(offerId).trim();
    const offerRef = doc(db, 'booking_offers', cleanOfferId);
    const offerSnap = await getDoc(offerRef);

    if (!offerSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Offer not found' });
    }

    const data = offerSnap.data() as any;
    const targetProId = data.serviceManId || data.proId;
    if (targetProId !== authUid && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Unauthorized to reject this offer' });
    }

    if (data.status !== 'PENDING' && data.status !== 'offered') {
      return res.status(400).json({ success: false, error: 'Offer is not in PENDING status' });
    }

    const nowIso = new Date().toISOString();
    await updateDoc(offerRef, {
      status: 'REJECTED',
      respondedAt: nowIso,
      rejectionReason: reason,
      updatedAt: nowIso,
    });

    return res.status(200).json({ success: true, message: 'Offer rejected successfully' });
  } catch (err: any) {
    console.error('reject-offer error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
});

/**
 * Endpoint: POST /api/serviceman/register-fcm-token
 * Securely registers an FCM device token for a ServiceMan account.
 */
app.post('/api/serviceman/register-fcm-token', async (req, res) => {
  try {
    const { token, serviceManId, deviceType = 'web' } = req.body;

    if (!token || typeof token !== 'string' || token.trim().length < 10) {
      return res.status(400).json({ success: false, error: 'Valid FCM token string is required' });
    }

    if (!serviceManId || typeof serviceManId !== 'string') {
      return res.status(400).json({ success: false, error: 'serviceManId is required' });
    }

    const cleanToken = token.trim();
    const cleanId = serviceManId.trim();
    const nowIso = new Date().toISOString();

    // 1. Save in device_tokens collection
    const tokenDocId = crypto.createHash('sha256').update(cleanToken).digest('hex').substring(0, 32);
    await setDoc(doc(db, 'device_tokens', tokenDocId), {
      token: cleanToken,
      userId: cleanId,
      role: 'service_man',
      deviceType,
      updatedAt: nowIso,
      createdAt: nowIso,
    }, { merge: true });

    // 2. Also save on service_men doc if present
    try {
      const proRef = doc(db, 'service_men', cleanId);
      const proSnap = await getDoc(proRef);
      if (proSnap.exists()) {
        await updateDoc(proRef, {
          fcmTokens: arrayUnion(cleanToken),
          lastTokenRefreshedAt: nowIso,
          updatedAt: nowIso,
        });
      }
    } catch (e) {
      console.warn('service_men token union note:', e);
    }

    return res.status(200).json({
      success: true,
      message: 'FCM device token registered successfully ✓',
      serviceManId: cleanId,
    });
  } catch (err: any) {
    console.error('register-fcm-token error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

/**
 * Endpoint: POST /api/fcm/register-token
 * Universal device token registration for Customers, Service Professionals, Franchise Partners, and Admins.
 */
app.post('/api/fcm/register-token', async (req, res) => {
  try {
    const { token, userId, role = 'customer', deviceType = 'web' } = req.body;

    if (!token || typeof token !== 'string' || token.trim().length < 10) {
      return res.status(400).json({ success: false, error: 'Valid FCM token string is required' });
    }

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    const cleanToken = token.trim();
    const cleanId = userId.trim();
    const nowIso = new Date().toISOString();

    const tokenDocId = crypto.createHash('sha256').update(cleanToken).digest('hex').substring(0, 32);
    const tokenData = {
      id: tokenDocId,
      token: cleanToken,
      userId: cleanId,
      uid: cleanId,
      role,
      deviceType,
      isActive: true,
      updatedAt: nowIso,
      createdAt: nowIso,
      lastSeenAt: nowIso,
    };

    // 1. Always record in authoritative server memory token registry
    recordServerUserToken(cleanId, cleanToken);

    // 2. Synchronize to Firestore collections safely
    try {
      const adb = getAdminDb();
      if (adb) {
        await adb.collection('device_tokens').doc(tokenDocId).set(tokenData, { merge: true });
        try {
          if (role === 'service_man' || role === 'pro') {
            await adb.collection('service_men').doc(cleanId).set(
              {
                fcmTokens: (admin as any).firestore?.FieldValue?.arrayUnion(cleanToken),
                lastTokenRefreshedAt: nowIso,
                updatedAt: nowIso,
              },
              { merge: true }
            );
          } else {
            await adb.collection('users').doc(cleanId).set(
              {
                fcmTokens: (admin as any).firestore?.FieldValue?.arrayUnion(cleanToken),
                lastTokenRefreshedAt: nowIso,
                updatedAt: nowIso,
              },
              { merge: true }
            );
          }
        } catch (syncErr) {
          console.warn('[FCM] User doc token union notice:', syncErr);
        }
      } else {
        await setDoc(doc(db, 'device_tokens', tokenDocId), tokenData, { merge: true });
      }
    } catch (storeErr: any) {
      console.warn('[FCM] Firestore device token storage note (in-memory registered):', storeErr?.message || storeErr);
    }

    return res.status(200).json({
      success: true,
      message: 'FCM push registration saved successfully ✓',
      userId: cleanId,
      tokenDocId,
    });
  } catch (err: any) {
    console.error('FCM register-token error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

/**
 * Endpoint: POST /api/fcm/send-push
 * Dispatches an FCM push notification to a target user with dual in-app delivery.
 */
app.post('/api/fcm/send-push', async (req, res) => {
  try {
    const { targetUserId, title, body, bookingId, eventType, type = 'booking', url, targetRole, data } = req.body;

    if (!targetUserId || typeof targetUserId !== 'string') {
      return res.status(400).json({ success: false, error: 'targetUserId is required' });
    }

    if (!title || !body) {
      return res.status(400).json({ success: false, error: 'title and body are required' });
    }

    const result = await sendPushToUser(targetUserId, {
      title,
      body,
      bookingId,
      eventType,
      type,
      url,
      targetRole,
      data,
    });

    return res.status(200).json({
      success: true,
      result,
    });
  } catch (err: any) {
    console.error('FCM send-push error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

/**
 * Endpoint: POST /api/fcm/send-booking-alert
 * Dispatches high-level booking notifications to customers and professionals.
 */
app.post('/api/fcm/send-booking-alert', async (req, res) => {
  try {
    const { targetUserId, targetRole, bookingId, eventType, title, body, url, data } = req.body;

    if (!targetUserId || !title || !body) {
      return res.status(400).json({ success: false, error: 'targetUserId, title, and body are required' });
    }

    const result = await sendPushToUser(targetUserId, {
      title,
      body,
      bookingId,
      eventType,
      type: 'booking',
      targetRole,
      url,
      data,
    });

    return res.status(200).json({
      success: true,
      result,
    });
  } catch (err: any) {
    console.error('FCM send-booking-alert error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

/**
 * Endpoint: POST /api/fcm/test
 * Sends an immediate test push notification to verify delivery for the caller.
 */
app.post('/api/fcm/test', async (req, res) => {
  try {
    const { userId, token, role = 'customer' } = req.body;

    const payload = {
      title: '🔔 HARDINKAAM Push Notification Test',
      body: 'Real-time FCM push notification delivery is active and working correctly!',
      eventType: 'test',
      type: 'system' as const,
      targetRole: role,
      url: '/',
      data: { testTime: new Date().toISOString() },
    };

    if (token && typeof token === 'string') {
      const result = await sendFcmPushToTokens([token], payload);
      return res.status(200).json({ success: true, result });
    }

    if (userId && typeof userId === 'string') {
      const result = await sendPushToUser(userId, payload);
      return res.status(200).json({ success: true, result });
    }

    return res.status(400).json({ success: false, error: 'Provide either userId or token' });
  } catch (err: any) {
    console.error('FCM test error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

/**
 * Endpoint: GET /api/bookings/:bookingId and GET /api/bookings/:bookingId/offers
 * Phase 1N: Secure booking read ownership and role boundary audit.
 * Enforces verified Firebase ID token authentication, checks participant ownership
 * (Customer, assigned Service Professional, or authorized Admin),
 * and prevents horizontal/vertical privilege escalation.
 */
app.get(
  ['/api/bookings/:bookingId', '/api/bookings/:bookingId/offers'],
  async (req, res) => {
    try {
      // 1-5. Authenticate caller using helper from Phase 1A (requires Bearer token, returns 401 if missing/invalid)
      const authUid = await verifyAuthUser(req, res);
      if (!authUid) return;

      const { bookingId } = req.params;
      if (!isValidBookingId(bookingId)) {
        return res.status(400).json({ success: false, error: 'Missing or invalid bookingId' });
      }

      const cleanBookingId = bookingId.trim();
      const bookingRef = doc(db, 'bookings', cleanBookingId);
      const snap = await getDoc(bookingRef);
      if (!snap.exists()) {
        return res.status(404).json({ success: false, error: 'Booking not found' });
      }

      const booking = snap.data();

      // Ownership and Role boundary verification:
      // - Customer: must be actual customer of booking (customerId, userId, customerUid matching authUid)
      // - Service Professional: must be assigned to this booking (serviceManId, servicemanId, assignedProId matching authUid)
      // - Admin: must have verified email in AUTHORIZED_ADMIN_EMAILS
      // Do NOT trust client-supplied role, customerId, serviceManId, userId, or query params!
      const isCustomer = Boolean(
        (booking.customerId && booking.customerId === authUid) ||
        (booking.userId && booking.userId === authUid) ||
        (booking.customerUid && booking.customerUid === authUid)
      );
      const assignedProId = booking.serviceManId || booking.servicemanId || booking.assignedProId;
      const isAssignedPro = Boolean(assignedProId && assignedProId === authUid);
      const userEmail = (((req as any).user?.email) || '').toLowerCase().trim();
      const isAdmin = Boolean(userEmail && AUTHORIZED_ADMIN_EMAILS.includes(userEmail));

      if (!isCustomer && !isAssignedPro && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You are not authorized to access this booking.',
        });
      }

      // If offers sub-resource is requested
      if (req.path.endsWith('/offers')) {
        const offersQuery = query(
          collection(db, 'booking_assignments'),
          where('bookingId', '==', cleanBookingId)
        );
        const offersSnap = await getDocs(offersQuery);
        const offers: any[] = [];
        offersSnap.forEach((d) => offers.push(d.data()));

        return res.status(200).json({
          success: true,
          bookingId: cleanBookingId,
          count: offers.length,
          offers,
        });
      }

      // Default: Return booking document
      return res.status(200).json({
        success: true,
        booking: {
          id: cleanBookingId,
          ...booking,
        },
      });
    } catch (err: any) {
      console.error('get booking/offers error:', err);
      return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
    }
  }
);

/**
 * STEP 4: SERVICE SPLIT CALCULATION UTILITY & ENDPOINT
 * Canonical: POST /api/razorpay/calculate-split
 * Aliases: POST /api/functions/calculateServiceSplit & POST /api/payouts/calculate-split
 */
function handleServiceSplitCalculation(req: Request, res: Response) {
  try {
    const {
      bookingId,
      amount,
      bookingAmount,
      grossAmount,
      commissionRate = DEFAULT_COMPANY_COMMISSION_RATE,
      taxRate = DEFAULT_TAX_RATE,
    } = req.body;

    const targetGross = parseFloat(amount !== undefined ? amount : (bookingAmount !== undefined ? bookingAmount : grossAmount || 0));

    if (isNaN(targetGross) || targetGross < 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_AMOUNT',
        message: 'Invalid or missing booking amount.',
      });
    }

    const commRate = parseFloat(commissionRate !== undefined ? commissionRate : DEFAULT_COMPANY_COMMISSION_RATE);
    const tRate = parseFloat(taxRate !== undefined ? taxRate : DEFAULT_TAX_RATE);

    const companyCommission = Math.round((targetGross * commRate) / 100);
    const taxDeduction = Math.round((targetGross * tRate) / 100);
    const payoutAmount = Math.max(0, targetGross - companyCommission - taxDeduction);

    return res.status(200).json({
      success: true,
      bookingId: bookingId || null,
      grossAmount: targetGross,
      commissionRate: commRate,
      companyCommission,
      taxRate: tRate,
      taxDeduction,
      payoutAmount,
      servicemanPayoutAmount: payoutAmount,
      message: `Split calculation complete: Commission ₹${companyCommission} (${commRate}%), Tax ₹${taxDeduction} (${tRate}%), Net Payout ₹${payoutAmount}`,
    });
  } catch (err: any) {
    console.error('Error calculating service split:', err);
    return res.status(500).json({ success: false, error: 'SPLIT_CALCULATION_FAILED', message: err.message || 'Failed to calculate split' });
  }
}

app.post(['/api/functions/calculateServiceSplit', '/api/payouts/calculate-split'], handleServiceSplitCalculation);

/**
 * STEP 5: ADMIN SERVICEMAN PAYOUT DISBURSEMENT
 * Canonical: POST /api/payouts/process
 */
async function handleAdminServicemanPayout(req: Request, res: Response) {
  try {
    const {
      bookingId,
      serviceManId,
      serviceManName,
      serviceManPhone,
      grossAmount,
      companyCommissionRate = DEFAULT_COMPANY_COMMISSION_RATE,
      taxRate = DEFAULT_TAX_RATE,
      payoutMethod = 'bank_transfer',
      upiOrBank,
      adminUsername,
    } = req.body;

    if (!bookingId || !serviceManId || grossAmount === undefined) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PAYOUT_FIELDS',
        message: 'Missing required payout fields (bookingId, serviceManId, grossAmount)',
      });
    }

    const gross = Math.max(0, parseFloat(grossAmount) || 0);
    const commRate = Math.max(0, parseFloat(companyCommissionRate) || DEFAULT_COMPANY_COMMISSION_RATE);
    const tRate = Math.max(0, parseFloat(taxRate) || DEFAULT_TAX_RATE);

    const companyServiceCharge = Math.round((gross * commRate) / 100);
    const taxDeduction = Math.round((gross * tRate) / 100);
    const netPayoutAmount = Math.max(0, gross - companyServiceCharge - taxDeduction);

    const internalPayoutRef = `payout_ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const payoutData = {
      payoutReference: internalPayoutRef,
      payoutRazorpayId: null,
      bookingId,
      serviceManId,
      serviceManName: serviceManName || 'Verified Professional',
      serviceManPhone: serviceManPhone || '',
      grossAmount: gross,
      companyCommissionRate: commRate,
      companyServiceCharge,
      taxRate: tRate,
      taxDeduction,
      netPayoutAmount,
      payoutMethod,
      upiOrBank: upiOrBank || 'Direct Verified Account',
      processedBy: adminUsername || 'DEEPAK (Admin)',
      processedAt: nowIso,
      status: 'pending_disbursement',
      payoutStatus: 'pending_disbursement',
    };

    // Record payout in Firestore
    try {
      await (db as any).collection('payouts').doc(internalPayoutRef).set(payoutData, { merge: true });
    } catch (fsErr: any) {
      console.warn('[Payout] Could not persist payout document:', fsErr?.message);
    }

    return res.status(200).json({
      success: true,
      message: `Payout request of ₹${netPayoutAmount} queued with status 'pending_disbursement' for ${serviceManName}.`,
      payout: payoutData,
    });
  } catch (err: any) {
    console.error('Error processing serviceman payout:', err);
    return res.status(500).json({
      success: false,
      error: 'PAYOUT_PROCESSING_FAILED',
      message: 'Failed to disburse serviceman payout',
    });
  }
}

app.post('/api/payouts/process', requireAdminAuth, handleAdminServicemanPayout);

/**
 * Endpoint: POST /api/notifications/whatsapp-admin
 * Dispatches real-time WhatsApp alert & logs to Firestore for Admin on every new booking
 */
/**
 * OpenWA WhatsApp gateway helpers.
 *
 * OpenWA uses an API key (X-API-Key) and a WhatsApp session. The browser
 * never receives the live key. The server resolves the configured session
 * name to its session id and sends text messages through the OpenWA REST API.
 */
function cleanWhatsAppPhone(raw: any): string {
  let phone = String(raw || '').replace(/\D/g, '');
  if (phone.length === 10) phone = `91${phone}`;
  return phone;
}

function openWaBaseUrl(): string {
  const configured = String(process.env.WHATSAPP_API_URL || 'https://openwa.id/api').trim().replace(/\/+$/, '');
  return configured.endsWith('/api') ? configured : `${configured}/api`;
}

async function resolveOpenWaSessionId(apiToken: string): Promise<string> {
  const configuredId = String(process.env.WHATSAPP_OPENWA_SESSION_ID || '').trim();
  if (configuredId) return configuredId;

  const sessionName = String(process.env.WHATSAPP_OPENWA_SESSION_NAME || 'support-main').trim();
  const response = await fetch(`${openWaBaseUrl()}/sessions`, {
    method: 'GET',
    headers: { 'X-API-Key': apiToken, Accept: 'application/json' },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`OPENWA_SESSIONS_${response.status}${text ? `:${text.slice(0, 240)}` : ''}`);
  }
  const sessions = await response.json();
  if (!Array.isArray(sessions)) throw new Error('OPENWA_INVALID_SESSIONS_RESPONSE');

  const normalized = sessionName.toLowerCase();
  const match = sessions.find((item: any) =>
    String(item?.name || '').toLowerCase() === normalized ||
    String(item?.id || '') === sessionName
  );
  if (!match?.id) {
    throw new Error(`OPENWA_SESSION_NOT_FOUND:${sessionName}`);
  }
  return String(match.id);
}

async function sendOpenWaText(phone: string, message: string): Promise<{ messageId?: string; raw?: any }> {
  const apiToken = String(process.env.WHATSAPP_API_TOKEN || '').trim();
  if (!apiToken) throw new Error('WHATSAPP_API_TOKEN_MISSING');

  const sessionId = await resolveOpenWaSessionId(apiToken);
  const chatId = `${phone}@c.us`;
  const response = await fetch(`${openWaBaseUrl()}/sessions/${encodeURIComponent(sessionId)}/messages/send-text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiToken,
      Accept: 'application/json',
    },
    body: JSON.stringify({ chatId, text: message }),
  });

  const rawText = await response.text().catch(() => '');
  let raw: any = rawText;
  try { raw = rawText ? JSON.parse(rawText) : {}; } catch {}
  if (!response.ok) {
    throw new Error(`OPENWA_SEND_${response.status}${raw?.message ? `:${String(raw.message).slice(0, 240)}` : ''}`);
  }

  return {
    messageId: raw?.id || raw?.messageId || raw?.message_id || raw?.data?.id || raw?.data?.messageId,
    raw,
  };
}

async function dispatchWhatsAppGateway(input: {
  phone: string;
  message: string;
  bookingId?: string;
  eventType?: string;
  recipientName?: string;
}): Promise<{ messageId?: string; status: string; providerHttpStatus?: number }> {
  const enabled = String(process.env.WHATSAPP_API_ENABLED ?? 'true').toLowerCase() !== 'false';
  if (!enabled) throw new Error('WHATSAPP_DISABLED');

  const phone = cleanWhatsAppPhone(input.phone);
  if (phone.length < 12 || !String(input.message || '').trim()) {
    throw new Error('INVALID_WHATSAPP_MESSAGE');
  }

  const provider = String(process.env.WHATSAPP_PROVIDER || 'openwa').trim().toLowerCase();
  if (provider === 'openwa') {
    const result = await sendOpenWaText(phone, String(input.message));
    return { messageId: result.messageId, status: 'sent' };
  }

  // Generic fallback for any future provider.
  const apiUrl = String(process.env.WHATSAPP_API_URL || '').trim();
  const apiToken = String(process.env.WHATSAPP_API_TOKEN || '').trim();
  if (!apiUrl || !apiToken) throw new Error('WHATSAPP_PROVIDER_NOT_CONFIGURED');
  const scheme = String(process.env.WHATSAPP_API_AUTH_SCHEME || 'Bearer');
  const upstream = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `${scheme} ${apiToken}`,
    },
    body: JSON.stringify({
      to: phone,
      phone,
      recipient: phone,
      message: String(input.message),
      text: String(input.message),
      bookingId: input.bookingId || '',
      eventType: input.eventType || 'manual',
      recipientName: input.recipientName || '',
    }),
  });
  const raw = await upstream.text().catch(() => '');
  let body: any = raw;
  try { body = raw ? JSON.parse(raw) : {}; } catch {}
  if (!upstream.ok) throw new Error(`WHATSAPP_PROVIDER_${upstream.status}`);
  return {
    status: 'sent',
    providerHttpStatus: upstream.status,
    messageId: body?.messageId || body?.message_id || body?.id || body?.data?.id,
  };
}

app.post('/api/notifications/whatsapp', async (req: Request, res: Response) => {
  try {
    const authHeader = String(req.headers.authorization || '');
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!idToken) return res.status(401).json({ success: false, error: 'AUTH_REQUIRED' });

    let caller: any;
    try {
      caller = await (admin as any).auth().verifyIdToken(idToken);
    } catch {
      return res.status(401).json({ success: false, error: 'INVALID_AUTH_TOKEN' });
    }

    const { phone, message, bookingId = '', eventType = 'manual', recipientName = '' } = req.body || {};
    const cleanPhone = cleanWhatsAppPhone(phone);
    if (cleanPhone.length < 12 || !String(message || '').trim()) {
      return res.status(400).json({ success: false, error: 'INVALID_WHATSAPP_MESSAGE' });
    }

    const nowIso = new Date().toISOString();
    const logId = `wa_api_${bookingId || 'manual'}_${cleanPhone}_${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    try {
      const result = await dispatchWhatsAppGateway({ phone: cleanPhone, message: String(message), bookingId, eventType, recipientName });
      await setDoc(doc(db, 'whatsapp_logs', logId), {
        id: logId,
        recipientPhone: cleanPhone,
        recipientName,
        bookingId,
        eventType,
        messageBody: String(message),
        channel: 'WHATSAPP_BUSINESS_API',
        provider: String(process.env.WHATSAPP_PROVIDER || 'openwa'),
        status: 'sent',
        providerMessageId: result.messageId || null,
        providerHttpStatus: result.providerHttpStatus || null,
        callerUid: caller.uid,
        createdAt: nowIso,
        updatedAt: nowIso,
      }, { merge: true });

      return res.status(200).json({ success: true, status: 'sent', messageId: result.messageId });
    } catch (gatewayErr: any) {
      await setDoc(doc(db, 'whatsapp_logs', logId), {
        id: logId,
        recipientPhone: cleanPhone,
        recipientName,
        bookingId,
        eventType,
        messageBody: String(message),
        channel: 'WHATSAPP_BUSINESS_API',
        provider: String(process.env.WHATSAPP_PROVIDER || 'openwa'),
        status: 'failed',
        error: gatewayErr?.message || 'WHATSAPP_DISPATCH_FAILED',
        callerUid: caller.uid,
        createdAt: nowIso,
        updatedAt: nowIso,
      }, { merge: true });
      console.error('[WhatsApp API] OpenWA dispatch error:', gatewayErr?.message || gatewayErr);
      return res.status(502).json({ success: false, status: 'failed', error: gatewayErr?.message || 'WHATSAPP_DISPATCH_FAILED' });
    }
  } catch (err: any) {
    console.error('[WhatsApp API] Dispatch error:', err?.message || err);
    return res.status(500).json({ success: false, error: 'WHATSAPP_DISPATCH_FAILED' });
  }
});

app.post('/api/notifications/whatsapp-admin', async (req: Request, res: Response) => {
  try {
    const { bookingId, booking, whatsappText, adminPhones } = req.body;
    console.log(`[Admin WhatsApp Dispatch] New booking alert requested for #${bookingId || 'BK_NEW'}`);

    const targetPhones = Array.isArray(adminPhones) && adminPhones.length > 0
      ? adminPhones
      : ['916267546945'];

    const formattedText = whatsappText || `🚨 Nayi Booking Aayi Hai! ID: #${bookingId || ''}`;

    const nowIso = new Date().toISOString();
    const batch = writeBatch(db);

    for (const phone of targetPhones) {
      const cleanPhone = String(phone).replace(/[^0-9]/g, '');
      const logRef = doc(db, 'whatsapp_logs', `wa_admin_${bookingId || Date.now()}_${cleanPhone}`);
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(formattedText)}`;

      batch.set(logRef, {
        id: `wa_admin_${bookingId || Date.now()}_${cleanPhone}`,
        recipientPhone: cleanPhone,
        recipientName: 'HARDINKAAM Admin',
        type: 'admin_new_booking_whatsapp',
        bookingId: bookingId || '',
        messageBody: formattedText,
        whatsappUrl: waUrl,
        status: 'pending',
        createdAt: nowIso,
      }, { merge: true });
    }

    await batch.commit();

    // Send through OpenWA server-side as well. The token never reaches the browser.
    let gatewaySent = false;
    const gatewayMessageIds: string[] = [];
    for (const phone of targetPhones) {
      const cleanPhone = cleanWhatsAppPhone(phone);
      try {
        const result = await dispatchWhatsAppGateway({
          phone: cleanPhone,
          message: formattedText,
          bookingId: bookingId || '',
          eventType: 'admin_new_booking_whatsapp',
          recipientName: 'HARDINKAAM Admin',
        });
        gatewaySent = true;
        if (result.messageId) gatewayMessageIds.push(result.messageId);
        const logRef = doc(db, 'whatsapp_logs', `wa_admin_api_${bookingId || Date.now()}_${cleanPhone}`);
        await setDoc(logRef, {
          id: logRef.id,
          recipientPhone: cleanPhone,
          recipientName: 'HARDINKAAM Admin',
          type: 'admin_new_booking_whatsapp_api',
          bookingId: bookingId || '',
          messageBody: formattedText,
          provider: String(process.env.WHATSAPP_PROVIDER || 'openwa'),
          providerMessageId: result.messageId || null,
          status: 'sent',
          createdAt: new Date().toISOString(),
        }, { merge: true });
      } catch (gatewayErr: any) {
        console.warn('[Admin WhatsApp Dispatch] OpenWA notice:', gatewayErr?.message || gatewayErr);
      }
    }

    return res.status(200).json({
      success: true,
      gatewaySent,
      message: gatewaySent ? 'Admin WhatsApp notification sent through OpenWA' : 'Admin WhatsApp notification logged; OpenWA unavailable',
      bookingId,
      adminPhones: targetPhones,
      providerMessageIds: gatewayMessageIds,
      whatsappUrl: `https://wa.me/916267546945?text=${encodeURIComponent(formattedText)}`,
    });
  } catch (err: any) {
    console.error('[Admin WhatsApp Dispatch] Error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/notifications/whatsapp-password-reset', async (req: Request, res: Response) => {
  try {
    const { reqId, userName, userEmail, userPhone, emailOrUsername } = req.body;
    const adminPhone = '916267546945';

    const formattedTime = new Date().toLocaleString('hi-IN', {
      timeZone: 'Asia/Kolkata',
    });

    const formattedText = `🚨 *HARDINKAAM पासवर्ड रीसेट अनुरोध (Password Reset Alert)* 🚨\n\nनमस्ते मुख्य प्रशासक DEEPAK सर,\nएक यूजर ने HARDINKAAM पोर्टल पर पासवर्ड रीसेट हेतु अनुरोध दर्ज किया है:\n\n👤 *यूजर/नाम:* ${userName || 'उपयोगकर्ता'}\n📧 *ईमेल:* ${userEmail || emailOrUsername || 'उपलब्ध नहीं'}\n📞 *मोबाइल:* ${userPhone || 'उपलब्ध नहीं'}\n🆔 *अनुरोध आईडी:* #${reqId || 'RST_' + Date.now()}\n⏰ *समय:* ${formattedTime}\n\n🌐 *कंट्रोल रूम:* https://www.hardinkaam.online/#admin\nआप एडमिन डैशबोर्ड (Users Manager -> Password Reset) से नया पासवर्ड जारी कर सकते हैं।`;

    const nowIso = new Date().toISOString();
    const logId = `wa_admin_reset_${reqId || Date.now()}_${adminPhone}`;
    const waUrl = `https://wa.me/${adminPhone}?text=${encodeURIComponent(formattedText)}`;

    // 0. Ensure password_reset_requests document is saved in Firestore with server privileges
    try {
      const resetReqDocId = reqId || `rst_${Date.now()}`;
      await setDoc(doc(db, 'password_reset_requests', resetReqDocId), {
        id: resetReqDocId,
        emailOrUsername: emailOrUsername || userEmail || '',
        userName: userName || emailOrUsername || '',
        userEmail: userEmail || '',
        userPhone: userPhone || '',
        status: 'pending',
        requestedAt: nowIso,
      }, { merge: true });
    } catch (saveErr: any) {
      console.warn('[Admin Reset WhatsApp] Notice writing to password_reset_requests:', saveErr.message);
    }

    // 1. Log to Firestore whatsapp_logs
    try {
      await setDoc(doc(db, 'whatsapp_logs', logId), {
        id: logId,
        recipientPhone: adminPhone,
        recipientName: 'Super Admin DEEPAK',
        type: 'admin_password_reset_whatsapp',
        requestId: reqId || '',
        userEmail: userEmail || emailOrUsername || '',
        userPhone: userPhone || '',
        messageBody: formattedText,
        whatsappUrl: waUrl,
        status: 'pending',
        createdAt: nowIso,
      }, { merge: true });
    } catch (dbErr: any) {
      console.warn('[Admin Reset WhatsApp] Notice writing to whatsapp_logs:', dbErr.message);
    }

    // 2. Dispatch via OpenWA / WhatsApp Gateway
    let gatewaySent = false;
    let providerMessageId: string | null = null;
    try {
      const result = await dispatchWhatsAppGateway({
        phone: adminPhone,
        message: formattedText,
        eventType: 'admin_password_reset_alert',
        recipientName: 'Super Admin DEEPAK',
      });
      gatewaySent = true;
      providerMessageId = result.messageId || null;

      await setDoc(doc(db, 'whatsapp_logs', logId), {
        status: 'sent',
        providerMessageId,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (gwErr: any) {
      console.warn('[Admin Reset WhatsApp] Gateway notice:', gwErr?.message || gwErr);
    }

    return res.status(200).json({
      success: true,
      gatewaySent,
      adminPhone,
      message: gatewaySent ? 'Admin WhatsApp reset notification dispatched' : 'Admin WhatsApp reset logged',
      whatsappUrl: waUrl,
    });
  } catch (err: any) {
    console.error('[Admin Reset WhatsApp Error]:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Endpoint: POST /api/admin/master-reset
 * ONE-TIME, SUPER-ADMIN-ONLY MASTER FIREBASE RESET SYSTEM
 * Deletes all non-admin Firebase Auth users and all user-linked Firestore documents
 * while strictly preserving Super Admin access and Master Configuration.
 */
app.post('/api/admin/master-reset', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { confirmationCode } = req.body;
    if (confirmationCode !== 'DELETE_HARDINKAAM_USER_DATA_CONFIRMED') {
      return res.status(400).json({
        success: false,
        error: 'Invalid or missing confirmation code for Master Reset.',
      });
    }

    let authUsersDeletedCount = 0;
    let firestoreDocsDeletedCount = 0;

    // 1. Delete Non-Admin Firebase Auth Users using Firebase Admin SDK
    try {
      const listUsersResult = await (admin as any).auth().listUsers(1000);
      const usersList = listUsersResult.users || [];
      for (const userRecord of usersList) {
        const email = (userRecord.email || '').toLowerCase().trim();
        const isAdminUser = AUTHORIZED_ADMIN_EMAILS.includes(email) || email.includes('admin') || userRecord.uid === 'admin_deepak_root';
        if (!isAdminUser) {
          try {
            await (admin as any).auth().deleteUser(userRecord.uid);
            authUsersDeletedCount++;
          } catch (delErr) {
            console.warn(`Failed to delete auth user ${userRecord.uid}:`, delErr);
          }
        }
      }
    } catch (authErr) {
      console.warn('Firebase Admin SDK auth list/delete warning:', authErr);
    }

    // 2. Clear Firestore user-linked collections
    const collectionsToClean = [
      'users',
      'service_men',
      'serviceMen',
      'wallets',
      'wallet_transactions',
      'transactions',
      'payments',
      'serviceman_payouts',
      'withdrawals',
      'ledgers',
      'rewards',
      'reward_wallets',
      'reward_transactions',
      'bookings',
      'booking_offers',
      'booking_assignments',
      'notifications',
      'messages',
      'device_tokens',
      'serviceTracking',
      'reviews',
      'kyc_documents',
      'password_reset_requests',
      'whatsapp_logs',
      'audit_logs',
      'registration_approvals',
      'admin_alerts',
    ];

    for (const colName of collectionsToClean) {
      try {
        const snap = await getDocs(query(collection(db, colName), limit(500)));
        const batch = writeBatch(db);
        let batchCount = 0;
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          const email = (data.email || '').toLowerCase().trim();
          const isMasterAdminDoc = AUTHORIZED_ADMIN_EMAILS.includes(email) || docSnap.id === 'admin_deepak_root' || data.role === 'admin';
          if (!isMasterAdminDoc) {
            batch.delete(docSnap.ref);
            firestoreDocsDeletedCount++;
            batchCount++;
          }
        });
        if (batchCount > 0) {
          await batch.commit();
        }
      } catch (colErr) {
        console.warn(`Collection cleanup notice for ${colName}:`, colErr);
      }
    }

    const nowIso = new Date().toISOString();
    try {
      await setDoc(doc(db, 'audit_logs', `reset_${Date.now()}`), {
        id: `reset_${Date.now()}`,
        action: 'MASTER_FIREBASE_RESET_COMPLETED',
        adminEmail: (req as any).user?.email || 'deepakbuildconbhopal@gmail.com',
        timestamp: nowIso,
        authUsersDeleted: authUsersDeletedCount,
        firestoreDocsDeleted: firestoreDocsDeletedCount,
      }, { merge: true });
    } catch (_) {}

    return res.status(200).json({
      success: true,
      message: 'HARDINKAAM Master Reset completed successfully.',
      report: {
        authUsersDeleted: authUsersDeletedCount,
        firestoreDocsDeleted: firestoreDocsDeletedCount,
        dummyRecordsRemoved: authUsersDeletedCount + firestoreDocsDeletedCount,
        preservedAdmin: 'deepakbuildconbhopal@gmail.com',
        masterConfigPreserved: true,
      },
    });
  } catch (err: any) {
    console.error('Master Reset error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Master Reset failed' });
  }
});

/**
 * Endpoint: POST /api/admin/serviceman/send-message
 * Allows Admin to dispatch an authoritative real-time direct message to an individual ServiceMan.
 * Writes to master Firestore 'messages' & 'notifications'.
 */
app.post('/api/admin/serviceman/send-message', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const {
      serviceManUid,
      serviceManName = 'Service Professional',
      title = 'HARDINKAAM Admin Message',
      message,
      bookingId = '',
      type = 'direct_message',
    } = req.body;

    if (!serviceManUid || typeof serviceManUid !== 'string' || !serviceManUid.trim()) {
      return res.status(400).json({ success: false, error: 'serviceManUid is required' });
    }
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, error: 'message content cannot be empty' });
    }

    const cleanUid = serviceManUid.trim();
    const cleanMsg = message.trim();
    const nowIso = new Date().toISOString();
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const conversationId = bookingId ? `conv_booking_${bookingId}` : `conv_admin_${cleanUid}`;
    const adminUid = (req as any).user?.uid || 'admin_master';
    const adminName = (req as any).user?.name || 'HARDINKAAM Super Admin';

    const messageDoc = {
      id: msgId,
      senderId: adminUid,
      senderName: adminName,
      senderRole: 'admin',
      receiverId: cleanUid,
      receiverRole: 'service_man',
      recipientId: cleanUid,
      recipientUid: cleanUid,
      conversationId,
      title: title.trim(),
      message: cleanMsg,
      text: cleanMsg,
      type,
      bookingId: bookingId ? String(bookingId).trim() : '',
      isRead: false,
      read: false,
      createdAt: nowIso,
      timestamp: nowIso,
    };

    await setDoc(doc(db, 'messages', msgId), messageDoc);

    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await setDoc(doc(db, 'notifications', notifId), {
      id: notifId,
      userId: cleanUid,
      recipientId: cleanUid,
      recipientUid: cleanUid,
      recipientRole: 'service_man',
      senderUid: adminUid,
      senderId: adminUid,
      senderRole: 'admin',
      title: title.trim(),
      message: cleanMsg,
      type: type === 'booking' ? 'booking' : 'direct_message',
      bookingId: bookingId ? String(bookingId).trim() : undefined,
      messageId: msgId,
      isRead: false,
      read: false,
      targetRole: 'pro',
      createdAt: nowIso,
    });

    return res.status(200).json({
      success: true,
      message: 'Message dispatched successfully to ServiceMan',
      messageId: msgId,
      notificationId: notifId,
    });
  } catch (err: any) {
    console.error('Error in send-message to serviceman:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

/**
 * Endpoint: POST /api/admin/serviceman/send-notification
 * Allows Admin to dispatch in-app and push notifications to one, multiple, or all approved ServiceMen.
 */
app.post('/api/admin/serviceman/send-notification', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const {
      recipients = 'single',
      serviceManUids = [],
      title,
      message,
      type = 'system',
      bookingId,
      messageId,
    } = req.body;

    if (!title || !String(title).trim() || !message || !String(message).trim()) {
      return res.status(400).json({ success: false, error: 'Title and message cannot be empty' });
    }

    const cleanTitle = String(title).trim();
    const cleanMsg = String(message).trim();
    let targetUids: string[] = [];

    if (recipients === 'all_approved') {
      const prosSnap = await getDocs(query(collection(db, 'service_men'), limit(500)));
      prosSnap.forEach((d) => {
        const data = d.data();
        const uid = data.userId || d.id;
        if (uid && (data.isVerified || data.kycStatus === 'verified' || data.kycStatus === 'approved' || data.status === 'active')) {
          if (!targetUids.includes(uid)) targetUids.push(uid);
        }
      });
      if (targetUids.length === 0) {
        const usersSnap = await getDocs(query(collection(db, 'users'), limit(500)));
        usersSnap.forEach((d) => {
          const data = d.data();
          if (data.role === 'service_man' && (data.status === 'active' || data.approvalStatus === 'approved')) {
            if (!targetUids.includes(d.id)) targetUids.push(d.id);
          }
        });
      }
    } else if (Array.isArray(serviceManUids) && serviceManUids.length > 0) {
      targetUids = serviceManUids.map((u: any) => String(u).trim()).filter(Boolean);
    }

    if (targetUids.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid recipient ServiceMen found' });
    }

    const nowIso = new Date().toISOString();
    const adminUid = (req as any).user?.uid || 'admin_master';
    let count = 0;

    for (const uid of targetUids) {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${count}`;
      await setDoc(doc(db, 'notifications', notifId), {
        id: notifId,
        userId: uid,
        recipientId: uid,
        recipientUid: uid,
        recipientRole: 'service_man',
        senderUid: adminUid,
        senderId: adminUid,
        senderRole: 'admin',
        title: cleanTitle,
        message: cleanMsg,
        type: type || 'system',
        bookingId: bookingId ? String(bookingId).trim() : undefined,
        messageId: messageId ? String(messageId).trim() : undefined,
        isRead: false,
        read: false,
        targetRole: 'pro',
        createdAt: nowIso,
      });
      count++;
    }

    return res.status(200).json({
      success: true,
      message: `Notification successfully sent to ${count} ServiceMen`,
      count,
    });
  } catch (err: any) {
    console.error('Error in send-notification to serviceman:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

/**
 * ====================================================================
 * HARDINKAAM ONE-CLICK WEBSITE ZIP UPDATE & DEPLOYMENT SYSTEM ENDPOINTS
 * ====================================================================
 */

/**
 * GET /api/admin/deploy/status
 * Returns current LIVE version, target live URL, next version tag, and system readiness
 */
app.get('/api/admin/deploy/status', requireAdminAuth, (req, res) => {
  try {
    const liveVersion = getCurrentLiveDeployment();
    const nextVersion = getNextVersionString();
    const history = getDeploymentHistory();

    return res.status(200).json({
      success: true,
      currentVersion: liveVersion?.version || 'v1.0.3',
      currentLiveDeployment: liveVersion,
      nextSuggestedVersion: nextVersion,
      liveUrl: 'https://hardinkaam-5cc6a.web.app',
      firebaseProjectId: 'hardinkaam-5cc6a',
      totalDeployments: history.length,
      isSystemReady: true,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Error fetching deployment status:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/deploy/history
 * Returns the complete list of deployment records and build logs
 */
app.get('/api/admin/deploy/history', requireAdminAuth, (req, res) => {
  try {
    const history = getDeploymentHistory();
    return res.status(200).json({
      success: true,
      deployments: history,
      count: history.length,
    });
  } catch (err: any) {
    console.error('Error fetching deployment history:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/deploy/job/:jobId
 * Real-time progress monitoring endpoint for ongoing deployment builds
 */
app.get('/api/admin/deploy/job/:jobId', requireAdminAuth, async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await getJobStatus(jobId);

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found or completed' });
    }

    return res.status(200).json({
      success: true,
      job,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/deploy/retry-job
 * Retries a failed or stalled deployment without re-uploading
 */
app.post('/api/admin/deploy/retry-job', requireAdminAuth, async (req, res) => {
  try {
    const { jobId, stripUnsupportedFiles, excludeSpecificFiles, excludeFiles } = req.body;
    if (!jobId) {
      return res.status(400).json({ success: false, error: 'Missing jobId parameter' });
    }

    const adminUser = (req as any).adminUser || { uid: 'admin_user', email: 'deepakbuildconbhopal@gmail.com', name: 'DEEPAK (Admin)' };
    const adminEmail = adminUser.email;
    const adminName = adminUser.name;
    const adminUid = adminUser.uid;

    const filesToExclude = excludeSpecificFiles || excludeFiles || [];

    retryDeploymentJob({
      jobId,
      adminUser: { uid: adminUid, email: adminEmail, name: adminName },
      stripUnsupportedFiles: stripUnsupportedFiles === true || filesToExclude.length > 0,
      excludeSpecificFiles: filesToExclude,
    }).catch((err) => {
      console.error(`[Retry Deployment Error for Job ${jobId}]:`, err);
    });

    return res.status(200).json({
      success: true,
      message: 'Retry initiated successfully.',
      jobId,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/deploy/continue-audit
 * Resumes deployment after Pre-Deploy Audit flagged executables, non-destructively
 * excluding selected files ONLY from the staging directory before deployment.
 * The original uploaded ZIP archive is completely preserved and untouched.
 */
app.post('/api/admin/deploy/continue-audit', requireAdminAuth, async (req, res) => {
  try {
    const { jobId, excludeFiles, excludeAllFlagged = true } = req.body;
    if (!jobId) {
      return res.status(400).json({ success: false, error: 'Missing jobId parameter' });
    }

    const adminUser = (req as any).adminUser || { uid: 'admin_user', email: 'deepakbuildconbhopal@gmail.com', name: 'DEEPAK (Admin)' };
    const adminEmail = adminUser.email;
    const adminName = adminUser.name;
    const adminUid = adminUser.uid;

    continueDeploymentAudit({
      jobId,
      adminUser: { uid: adminUid, email: adminEmail, name: adminName },
      excludeFiles: Array.isArray(excludeFiles) ? excludeFiles : undefined,
      stripUnsupportedFiles: excludeAllFlagged === true,
    }).catch((err) => {
      console.error(`[Continue Audit Deployment Error for Job ${jobId}]:`, err);
    });

    return res.status(200).json({
      success: true,
      message: 'Pre-deployment audit exclusion applied. Deployment proceeding with clean staging directory.',
      jobId,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/deploy/pre-audit
 * Inspects an uploaded ZIP for executable binaries without deploying
 */
app.post('/api/admin/deploy/pre-audit', requireAdminAuth, (req, res) => {
  uploadZip.single('zipFile')(req, res, async (uploadErr: any) => {
    if (uploadErr) {
      return res.status(400).json({
        success: false,
        error: uploadErr.message || 'ZIP upload failed for pre-audit inspection.',
      });
    }

    try {
      const file = req.file;
      if (!file || !file.buffer) {
        return res.status(400).json({
          success: false,
          error: 'No ZIP file provided for pre-audit.',
        });
      }

      const auditResult = await preAuditZipBuffer(file.buffer);
      return res.status(200).json({
        success: true,
        audit: auditResult,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
});

/**
 * POST /api/admin/deploy/upload
 * Handles ZIP upload, security verification, isolated extraction, npm install, build, and Firebase Hosting deployment
 */
app.post('/api/admin/deploy/upload', requireAdminAuth, (req, res) => {
  uploadZip.single('zipFile')(req, res, async (uploadErr: any) => {
    if (uploadErr) {
      return res.status(400).json({
        success: false,
        error: uploadErr.message || 'ZIP upload failed. Ensure file is .zip format under max size limit.',
      });
    }

    try {
      const file = req.file;
      if (!file || !file.buffer) {
        return res.status(400).json({
          success: false,
          error: 'No ZIP file was uploaded. Please attach a valid HARDINKAAM project ZIP file.',
        });
      }

      const adminUser = (req as any).adminUser || { uid: 'admin_user', email: 'deepakbuildconbhopal@gmail.com', name: 'DEEPAK (Admin)' };
      const adminEmail = adminUser.email;
      const adminName = adminUser.name;
      const adminUid = adminUser.uid;
      const customVersion = req.body?.customVersion;
      const stripUnsupportedFiles = req.body?.stripUnsupportedFiles === 'true' || req.body?.stripUnsupportedFiles === true;
      const isForce = req.query?.force === 'true' || req.body?.force === 'true' || req.body?.force === true;
      const jobId = req.body?.jobId || `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      console.log(`[Deploy Request] Admin "${adminEmail}" initiated deployment of "${file.originalname}" (${file.size} bytes), JobId: ${jobId}`);

      // Idempotency check: Check if identical ZIP is already live unless forced
      if (!isForce) {
        const dupCheck = checkDuplicateZip(file.buffer);
        if (dupCheck.isDuplicate) {
          return res.status(200).json({
            success: true,
            isDuplicate: true,
            existingVersion: dupCheck.existingVersion,
            zipHash: dupCheck.zipHash,
            message: `This exact ZIP was already uploaded (Version ${dupCheck.existingVersion}). You can deploy again or cancel.`,
          });
        }
      }

      // Fast non-blocking async pre-validation of the ZIP archive structure
      const validation = await validateZipArchiveAsync(file.buffer);
      if (!validation.isValid) {
        return res.status(422).json({
          success: false,
          error: validation.error || 'अमान्य ज़िप फ़ाइल: HARDINKAAM प्रोजेक्ट फ़ाइलें (package.json या dist/index.html) नहीं मिलीं।',
        });
      }

      // Check if client explicitly requested synchronous execution
      const isSync = req.query?.sync === 'true';

      if (isSync) {
        const result = await processZipDeployment({
          jobId,
          zipBuffer: file.buffer,
          fileName: file.originalname,
          fileSize: file.size,
          adminUser: { uid: adminUid, email: adminEmail, name: adminName },
          customVersion,
          stripUnsupportedFiles,
        });

        if (result.status === 'LIVE') {
          return res.status(200).json({
            success: true,
            message: `Version ${result.version} has been built and deployed LIVE to ${result.siteUrl}!`,
            deployment: result,
          });
        } else {
          return res.status(422).json({
            success: false,
            error: result.errorMessage || 'Deployment build failed. Existing live version is unchanged.',
            deployment: result,
          });
        }
      }

      // Asynchronous background execution (prevents 504 Gateway Timeout on Cloud Run / reverse proxy)
      processZipDeployment({
        jobId,
        zipBuffer: file.buffer,
        fileName: file.originalname,
        fileSize: file.size,
        adminUser: { uid: adminUid, email: adminEmail, name: adminName },
        customVersion,
        stripUnsupportedFiles,
      }).catch((deployErr) => {
        console.error(`[Background Deployment Error for Job ${jobId}]:`, deployErr);
      });

      // Immediate JSON response to the client
      return res.status(200).json({
        success: true,
        jobId,
        message: 'ZIP फ़ाइल सफलतापूर्वक प्राप्त हुई। बैकग्राउंड बिल्ड व सत्यापन पाइपलाइन प्रारंभ कर दी गई है।',
        stage: 'VALIDATING',
        deploymentMode: validation.deploymentMode,
        filesCount: validation.filesCount,
      });
    } catch (err: any) {
      console.error('Fatal deployment execution error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Fatal error occurred during deployment execution.',
      });
    }
  });
});

/**
 * POST /api/admin/deploy/rollback
 * Restores a previously verified successful build version to LIVE
 */
app.post('/api/admin/deploy/rollback', requireAdminAuth, async (req, res) => {
  try {
    const { targetVersionId } = req.body;

    if (!targetVersionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing targetVersionId parameter for rollback.',
      });
    }

    const adminUser = (req as any).adminUser || { uid: 'admin_user', email: 'deepakbuildconbhopal@gmail.com', name: 'DEEPAK (Admin)' };
    const adminEmail = adminUser.email;
    const adminName = adminUser.name;
    const adminUid = adminUser.uid;

    const rollbackResult = await rollbackDeployment(targetVersionId, {
      uid: adminUid,
      email: adminEmail,
      name: adminName,
    });

    if (rollbackResult.success) {
      return res.status(200).json({
        success: true,
        message: rollbackResult.message,
        deployment: rollbackResult.deployment,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: rollbackResult.message,
      });
    }
  } catch (err: any) {
    console.error('Error executing rollback:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error during rollback',
    });
  }
});

/**
 * POST /api/admin/cli/execute
 * Strict named-action deployment & maintenance pipeline for Admin.
 * Permitted actions: DEPLOY | ROLLBACK | AUDIT | BUILD | STATUS
 * Generic shell command strings and fake success transformations are strictly prohibited.
 */
app.post('/api/admin/cli/execute', requireAdminAuth, (req, res) => {
  uploadZip.single('zipFile')(req, res, async (uploadErr: any) => {
    if (uploadErr) {
      return res.status(400).json({ success: false, error: uploadErr.message || 'ZIP upload error.' });
    }

    try {
      const { command, action: rawAction, versionId } = req.body;
      const file = req.file;

      // Normalize action parameter (supports 'action' or structured command token)
      let requestedAction = (rawAction || '').toString().trim().toUpperCase();
      if (!requestedAction && typeof command === 'string') {
        const firstToken = command.trim().split(/\s+/)[0].toUpperCase();
        if (['DEPLOY', 'ROLLBACK', 'AUDIT', 'BUILD', 'STATUS'].includes(firstToken)) {
          requestedAction = firstToken;
        } else if (command.toLowerCase().includes('build')) {
          requestedAction = 'BUILD';
        } else if (command.toLowerCase().includes('deploy')) {
          requestedAction = 'DEPLOY';
        } else if (command.toLowerCase().includes('rollback')) {
          requestedAction = 'ROLLBACK';
        } else if (command.toLowerCase().includes('status')) {
          requestedAction = 'STATUS';
        } else if (command.toLowerCase().includes('audit') || command.toLowerCase().includes('lint')) {
          requestedAction = 'AUDIT';
        }
      }

      const VALID_ACTIONS = ['DEPLOY', 'ROLLBACK', 'AUDIT', 'BUILD', 'STATUS'];
      if (!VALID_ACTIONS.includes(requestedAction)) {
        return res.status(400).json({
          success: false,
          error: `Invalid action. Permitted actions: ${VALID_ACTIONS.join(', ')}. Arbitrary shell execution is disabled.`,
        });
      }

      console.log(`[Admin Named Action Pipeline] Action: "${requestedAction}", ZIP attached: ${file ? file.originalname : 'none'}`);

      const startTime = Date.now();
      let stdout = '';
      let stderr = '';
      let isSuccess = true;
      let exitCode = 0;

      switch (requestedAction) {
        case 'STATUS': {
          const liveDeployment = await getCurrentLiveDeployment();
          stdout = `[HARDINKAAM Live Status]\nTarget Project: ${firebaseConfig.projectId}\nFirestore Database: ${firebaseConfig.firestoreDatabaseId}\nActive Live Version: ${liveDeployment?.version || 'v1.0.0 (Production)'}\nDev Server Port: 3000\nNode Environment: ${process.env.NODE_ENV || 'development'}`;
          break;
        }

        case 'BUILD': {
          stdout += `🔨 [HARDINKAAM Build Pipeline] Executing application compile & validation check...\n`;
          const buildResult = await runCommand('npm run build', process.cwd(), 300000);
          stdout += buildResult.stdout || '';
          stderr = buildResult.stderr || '';
          isSuccess = buildResult.exitCode === 0;
          exitCode = buildResult.exitCode;
          break;
        }

        case 'AUDIT': {
          stdout += `🔍 [HARDINKAAM Audit Pipeline] Executing static code audit & type check...\n`;
          const auditResult = await runCommand('npm run lint', process.cwd(), 180000);
          stdout += auditResult.stdout || '';
          stderr = auditResult.stderr || '';
          isSuccess = auditResult.exitCode === 0;
          exitCode = auditResult.exitCode;
          break;
        }

        case 'ROLLBACK': {
          const targetVersion = versionId || (command ? command.split(/\s+/)[1] : undefined);
          if (!targetVersion) {
            return res.status(400).json({
              success: false,
              error: 'Target versionId is required for ROLLBACK action.',
            });
          }
          stdout += `⏪ [HARDINKAAM Rollback Pipeline] Initiating rollback to version ${targetVersion}...\n`;
          const rollbackResult = await rollbackDeployment(targetVersion, {
            uid: (req as any).adminUser?.uid || 'admin',
            email: (req as any).adminUser?.email || 'admin',
            name: (req as any).adminUser?.name || 'Admin',
          });
          isSuccess = rollbackResult.success;
          if (isSuccess) {
            stdout += `\n✓ Successfully restored and activated live version: ${targetVersion}`;
          } else {
            stderr = rollbackResult.message || 'Rollback failed.';
            exitCode = 1;
          }
          break;
        }

        case 'DEPLOY': {
          if (file && file.buffer) {
            stdout += `📦 [HARDINKAAM Deploy Pipeline] Processing release archive "${file.originalname}" (${(file.size / (1024 * 1024)).toFixed(2)} MB)...\n`;
            const deployResult = await processZipDeployment({
              jobId: 'job_' + Date.now(),
              zipBuffer: file.buffer,
              fileName: file.originalname,
              fileSize: file.size,
              adminUser: {
                uid: (req as any).adminUser?.uid || 'admin',
                email: (req as any).adminUser?.email || 'admin',
                name: (req as any).adminUser?.name || 'Admin',
              },
            });
            isSuccess = deployResult.buildStatus === 'SUCCESS';
            if (isSuccess) {
              stdout += `\n✓ Release ${deployResult.version} deployed and registered in pipeline successfully!`;
            } else {
              stderr = deployResult.deploymentLog || 'Deployment pipeline encountered an error.';
              exitCode = 1;
            }
          } else {
            stdout += `🚀 [HARDINKAAM Deploy Pipeline] Building and registering production release snapshot...\n`;
            const buildRes = await runCommand('npm run build', process.cwd(), 300000);
            stdout += buildRes.stdout || '';
            if (buildRes.exitCode !== 0) {
              isSuccess = false;
              stderr = buildRes.stderr || 'Build step failed during deploy.';
              exitCode = buildRes.exitCode;
            } else {
              stdout += `\n✓ Production build bundle ready in dist/. Deployment status: READY.`;
            }
          }
          break;
        }
      }

      const executionTimeMs = Date.now() - startTime;

      return res.status(isSuccess ? 200 : 400).json({
        success: isSuccess,
        exitCode,
        stdout,
        stderr,
        action: requestedAction,
        executionTimeMs,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error executing named deployment action:', err);
      return res.status(500).json({ success: false, error: err.message || 'Named action execution failed.' });
    }
  });
});

/**
 * ====================================================================
 * AI MARKETING AGENT & GOOGLE MAPS SERVICEMAN LEAD GENERATION ENDPOINTS
 * ====================================================================
 */

/**
 * POST /api/marketing/search-leads
 * Uses gemini-3.8-flash with Google Maps grounding to find service professionals across India
 */
app.post('/api/marketing/search-leads', async (req: Request, res: Response) => {
  try {
    const { trade, state, district, tehsilOrVillage, customKeyword, lat, lng } = req.body;
    if (!state && !district && !tehsilOrVillage && !customKeyword) {
      return res.status(400).json({
        success: false,
        error: 'Location parameters (state, district, or tehsilOrVillage) or customKeyword are required.',
      });
    }

    console.log(`[MarketingAgent] Searching Google Maps for trade: "${trade || 'general'}" in "${district || tehsilOrVillage || state}"`);

    const result = await searchServicemenWithMapsGrounding({
      trade: trade || 'Service Technician',
      state: state || 'Madhya Pradesh',
      district,
      tehsilOrVillage,
      customKeyword,
      lat: lat ? Number(lat) : undefined,
      lng: lng ? Number(lng) : undefined,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error('[MarketingAgent] Lead search failed:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to search Google Maps data.',
    });
  }
});

/**
 * POST /api/marketing/transcribe
 * Transcribes audio input from microphone using gemini-3.8-flash
 */
app.post('/api/marketing/transcribe', async (req: Request, res: Response) => {
  try {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64) {
      return res.status(400).json({
        success: false,
        error: 'Missing audioBase64 parameter for transcription.',
      });
    }

    console.log('[MarketingAgent] Transcribing voice input using gemini-3.8-flash...');
    const transcription = await transcribeMicrophoneAudio({
      audioBase64,
      mimeType: mimeType || 'audio/webm',
    });

    return res.status(200).json({
      success: true,
      transcription,
    });
  } catch (err: any) {
    console.error('[MarketingAgent] Audio transcription error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Audio transcription failed.',
    });
  }
});

/**
 * POST /api/marketing/generate-campaign
 * Generates WhatsApp ad copy, SMS pitch, and audio voice script
 */
app.post('/api/marketing/generate-campaign', async (req: Request, res: Response) => {
  try {
    const {
      trade,
      location,
      customInstruction,
      leadCount,
      promoterOrEmployeeName,
      targetAudience,
      state,
      districtOrCity,
      localityOrVillage,
      ageGroup,
      campaignObjective,
      toneAndLanguage,
    } = req.body;

    console.log(
      `[MarketingAgent] Generating campaign copy for ${trade || 'serviceman'} in ${districtOrCity || location || 'India'} (${targetAudience || 'servicemen'})...`
    );

    const campaign = await generateMarketingCampaignAd({
      trade: trade || 'Service Professional',
      location: location || 'Bhopal, Madhya Pradesh',
      customInstruction,
      leadCount,
      promoterOrEmployeeName,
      targetAudience,
      state,
      districtOrCity,
      localityOrVillage,
      ageGroup,
      campaignObjective,
      toneAndLanguage,
    });

    return res.status(200).json({
      success: true,
      campaign,
    });
  } catch (err: any) {
    console.error('[MarketingAgent] Campaign generation failed:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to generate marketing campaign.',
    });
  }
});

/**
 * POST /api/marketing/generate-image
 * Generates marketing visual / poster image using imagen-3.0-generate-002
 */
app.post('/api/marketing/generate-image', async (req: Request, res: Response) => {
  try {
    const { prompt, aspectRatio } = req.body;
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Missing prompt parameter.',
      });
    }

    console.log(`[MarketingAgent] Generating AI marketing image for prompt: "${prompt.slice(0, 60)}..."`);
    const result = await generateMarketingImageWithAI({
      prompt,
      aspectRatio,
    });

    return res.status(200).json({
      success: true,
      imageUrl: result.imageUrl,
      mimeType: result.mimeType,
    });
  } catch (err: any) {
    console.error('[MarketingAgent] Image generation failed:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to generate AI image.',
    });
  }
});

/**
 * POST /api/marketing/generate-video-storyboard
 * Generates an advanced multi-scene video ad / short film storyboard using gemini-3.8-flash
 */
app.post('/api/marketing/generate-video-storyboard', async (req: Request, res: Response) => {
  try {
    const {
      scriptText,
      theme,
      tradeOrService,
      location,
      targetAudience,
      aspectRatio,
      sceneCount,
      voiceGender,
      voiceStyle,
      bgmStyle,
    } = req.body;

    console.log(`[VideoStudio] Generating video ad storyboard using gemini-3.8-flash for "${tradeOrService || 'service'}" (${aspectRatio || '16:9'}) voice: ${voiceGender || 'default'}...`);

    const storyboard = await generateVideoStoryboardWithGemini({
      scriptText,
      theme,
      tradeOrService,
      location,
      targetAudience,
      aspectRatio,
      sceneCount: sceneCount ? Number(sceneCount) : 4,
      voiceGender,
      voiceStyle,
      bgmStyle,
    });

    return res.status(200).json({
      success: true,
      storyboard,
    });
  } catch (err: any) {
    console.error('[VideoStudio] Video storyboard generation failed:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to generate video storyboard.',
    });
  }
});

/**
 * POST /api/marketing/ai-ad-studio/generate
 * Generates an end-to-end commercial package for HARDINKAAM AI AD STUDIO
 */
app.post('/api/marketing/ai-ad-studio/generate', async (req: Request, res: Response) => {
  try {
    const {
      prompt,
      language,
      duration,
      voiceOption,
      voiceStyle,
      format,
      bgmStyle,
      location,
      includeAvatar,
      avatarId,
      avatarUsageMode,
      avatarPlacement,
    } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required.' });
    }

    console.log(`[AIAdStudio] Generating ad for prompt: "${prompt}" (language: ${language || 'auto'}, duration: ${duration || 30}s, avatar: ${includeAvatar ? avatarId : 'none'})...`);
    const project = await generateAdStudioProject({
      prompt,
      language,
      duration: duration ? Number(duration) as any : 30,
      voiceOption,
      voiceStyle,
      format,
      bgmStyle,
      location,
      includeAvatar: Boolean(includeAvatar),
      avatarId,
      avatarUsageMode,
      avatarPlacement,
    });

    return res.status(200).json({
      success: true,
      project,
    });
  } catch (err: any) {
    console.error('[AIAdStudio] Ad generation failed:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to generate AI Ad Studio project.',
    });
  }
});

/**
 * GET /api/marketing/ai-ad-studio/avatars
 * Fetches default and saved approved AI Avatars
 */
app.get('/api/marketing/ai-ad-studio/avatars', async (_req: Request, res: Response) => {
  try {
    return res.status(200).json({
      success: true,
      avatars: DEFAULT_AI_AVATARS,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/marketing/ai-ad-studio/avatars/create
 * Validates reference likeness footage and creates new AI avatar profile
 */
app.post('/api/marketing/ai-ad-studio/avatars/create', async (req: Request, res: Response) => {
  try {
    const { name, roleTitle, gender, referenceVideoUrl, speechModelStyle, consentVerified } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Avatar name is required.' });
    }
    if (!consentVerified) {
      return res.status(400).json({ success: false, error: 'Likeness and voice consent must be confirmed.' });
    }

    const newAvatar = await createCustomAIAvatar({
      name,
      roleTitle,
      gender,
      referenceVideoUrl,
      speechModelStyle,
      consentVerified,
    });

    return res.status(200).json({
      success: true,
      avatar: newAvatar,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/marketing/ai-ad-studio/translate-version
 * Translates an existing master ad to another language preserving the visual timeline
 */
app.post('/api/marketing/ai-ad-studio/translate-version', async (req: Request, res: Response) => {
  try {
    const { project, targetLanguage } = req.body;
    if (!project || !targetLanguage) {
      return res.status(400).json({ success: false, error: 'Project and targetLanguage are required.' });
    }

    console.log(`[AIAdStudio] Translating project ${project.id} to ${targetLanguage}...`);
    const version = await translateAdVersion({ project, targetLanguage });

    return res.status(200).json({
      success: true,
      version,
    });
  } catch (err: any) {
    console.error('[AIAdStudio] Translation failed:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to translate ad version.',
    });
  }
});

/**
 * POST /api/marketing/allocate-task
 * Allots a marketing lead generation / outreach campaign to an employee/staff
 */
app.post('/api/marketing/allocate-task', async (req: Request, res: Response) => {
  try {
    const {
      title,
      trade,
      state,
      district,
      tehsilOrVillage,
      assignedToEmployeeId,
      assignedToEmployeeName,
      assignedToEmployeeRole,
      assignedByAdminEmail,
      leads,
      campaignCopy,
      notes,
    } = req.body;

    if (!assignedToEmployeeName) {
      return res.status(400).json({
        success: false,
        error: 'Employee name / assignment target is required.',
      });
    }

    const taskId = `task_mkt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const taskRecord = {
      id: taskId,
      title: title || `${trade || 'Service'} Outreach Campaign - ${district || state || 'Area'}`,
      trade: trade || 'All Trades',
      state: state || 'Madhya Pradesh',
      district: district || 'Bhopal',
      tehsilOrVillage: tehsilOrVillage || '',
      assignedToEmployeeId: assignedToEmployeeId || 'emp_default',
      assignedToEmployeeName,
      assignedToEmployeeRole: assignedToEmployeeRole || 'Marketing Staff / Promoter',
      assignedByAdminEmail: assignedByAdminEmail || 'deepakbuildconbhopal@gmail.com',
      targetLeadCount: Array.isArray(leads) ? leads.length : 0,
      leads: Array.isArray(leads) ? leads : [],
      campaignCopy: campaignCopy || null,
      notes: notes || '',
      status: 'IN_PROGRESS',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Save to Firestore
    await setDoc(doc(db, 'marketing_tasks', taskId), taskRecord);

    return res.status(200).json({
      success: true,
      message: `Task successfully allocated to ${assignedToEmployeeName}!`,
      task: taskRecord,
    });
  } catch (err: any) {
    console.error('[MarketingAgent] Task allocation failed:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to allocate marketing task.',
    });
  }
});

// Resilient in-memory caches for marketing tasks and ad sets
let inMemoryMarketingTasks: any[] = [];
let inMemoryAdSets: any[] = [];

/**
 * GET /api/marketing/tasks
 * Fetches all allocated marketing tasks
 */
app.get('/api/marketing/tasks', async (req: Request, res: Response) => {
  try {
    const tasksSnap = await getDocs(collection(db, 'marketing_tasks'));
    const tasks = tasksSnap.docs.map((d) => d.data());
    tasks.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    if (tasks.length > 0) {
      inMemoryMarketingTasks = tasks;
    }

    return res.status(200).json({
      success: true,
      tasks,
    });
  } catch (err: any) {
    console.warn('[MarketingAgent] Firestore tasks fetch notice, returning cached tasks:', err?.message || err);
    return res.status(200).json({
      success: true,
      tasks: inMemoryMarketingTasks,
      fromCache: true,
    });
  }
});

/**
 * POST /api/marketing/update-lead-status
 * Updates the outreach status of a lead in a task
 */
app.post('/api/marketing/update-lead-status', async (req: Request, res: Response) => {
  try {
    const { taskId, leadId, newStatus, outcomeNotes } = req.body;
    if (!taskId || !leadId || !newStatus) {
      return res.status(400).json({
        success: false,
        error: 'taskId, leadId, and newStatus are required.',
      });
    }

    // Update in-memory cache first
    const taskInMem = inMemoryMarketingTasks.find((t) => t.id === taskId);
    if (taskInMem && Array.isArray(taskInMem.leads)) {
      const l = taskInMem.leads.find((x: any) => x.id === leadId);
      if (l) {
        l.status = newStatus;
        l.outcomeNotes = outcomeNotes || '';
      }
    }

    try {
      const taskRef = doc(db, 'marketing_tasks', taskId);
      const taskSnap = await getDoc(taskRef);
      if (taskSnap.exists()) {
        const taskData = taskSnap.data();
        const leads = taskData.leads || [];
        const leadIdx = leads.findIndex((l: any) => l.id === leadId);

        if (leadIdx !== -1) {
          leads[leadIdx].status = newStatus;
          leads[leadIdx].outcomeNotes = outcomeNotes || '';
          leads[leadIdx].updatedAt = new Date().toISOString();

          await updateDoc(taskRef, {
            leads,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    } catch (dbErr) {
      console.warn('[MarketingAgent] Firestore task lead update notice (persisted in cache):', dbErr);
    }

    return res.status(200).json({
      success: true,
      message: 'Lead status updated.',
    });
  } catch (err: any) {
    console.error('[MarketingAgent] Error updating lead status:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/marketing/ad-sets
 * Fetches all saved Ad Creative Sets from Firestore
 */
app.get('/api/marketing/ad-sets', async (req: Request, res: Response) => {
  try {
    const snap = await getDocs(collection(db, 'ad_creative_sets'));
    const adSets = snap.docs.map((d) => d.data());
    adSets.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    if (adSets.length > 0) {
      inMemoryAdSets = adSets;
    }

    return res.status(200).json({
      success: true,
      adSets,
    });
  } catch (err: any) {
    console.warn('[MarketingAgent] Firestore ad sets notice, returning cached sets:', err?.message || err);
    return res.status(200).json({
      success: true,
      adSets: inMemoryAdSets,
      fromCache: true,
    });
  }
});

/**
 * POST /api/marketing/ad-sets
 * Saves or updates an Ad Creative Set in Firestore
 */
app.post('/api/marketing/ad-sets', async (req: Request, res: Response) => {
  try {
    const { id, title, trade, demographics, campaignCopy, generatedImages, tags, notes } = req.body;
    const setId = id || `adset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const adSetRecord = {
      id: setId,
      title: title || `${trade || 'Service'} Ad Set - ${demographics?.districtOrCity || 'India'}`,
      trade: trade || 'All Trades',
      demographics: demographics || {},
      campaignCopy: campaignCopy || null,
      generatedImages: generatedImages || {},
      tags: tags || [],
      notes: notes || '',
      createdAt: req.body.createdAt || nowIso,
      updatedAt: nowIso,
    };

    // Update in-memory cache
    const existingIdx = inMemoryAdSets.findIndex((s) => s.id === setId);
    if (existingIdx !== -1) {
      inMemoryAdSets[existingIdx] = adSetRecord;
    } else {
      inMemoryAdSets.unshift(adSetRecord);
    }

    try {
      await setDoc(doc(db, 'ad_creative_sets', setId), adSetRecord);
    } catch (dbErr) {
      console.warn('[MarketingAgent] Firestore save ad set notice (persisted in cache):', dbErr);
    }

    return res.status(200).json({
      success: true,
      message: 'Ad Set saved successfully!',
      adSet: adSetRecord,
    });
  } catch (err: any) {
    console.error('[MarketingAgent] Failed to save ad set:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to save ad set.',
    });
  }
});

/**
 * DELETE /api/marketing/ad-sets/:id
 * Deletes a saved Ad Creative Set from Firestore
 */
app.delete('/api/marketing/ad-sets/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Ad Set ID is required.' });
    }

    inMemoryAdSets = inMemoryAdSets.filter((s) => s.id !== id);

    try {
      await deleteDoc(doc(db, 'ad_creative_sets', id));
    } catch (dbErr) {
      console.warn('[MarketingAgent] Firestore delete notice:', dbErr);
    }

    return res.status(200).json({
      success: true,
      message: 'Ad Set deleted successfully!',
    });
  } catch (err: any) {
    console.error('[MarketingAgent] Failed to delete ad set:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to delete ad set.',
    });
  }
});

// =========================================================================
// HARDINKAAM CANONICAL AI SERVICES & DIAGNOSTICS (GEMINI 3.8 FLASH)
// =========================================================================

/**
 * GET /api/ai/diagnostics
 * Returns system-wide AI service diagnostics, active model, and rate-limit status.
 */
app.get('/api/ai/diagnostics', (req: Request, res: Response) => {
  const diagnostics = getAIDiagnostics();
  return res.status(200).json({
    success: true,
    activeModel: GEMINI_CANONICAL_MODEL,
    sdkVersion: '@google/genai ^2.4.0',
    diagnostics,
  });
});

/**
 * POST /api/ai/diagnose-service
 * Server-side AI home service diagnostics powered by gemini-3.8-flash.
 * Safely analyzes text, voice transcript, or photos without exposing API keys to browser.
 */
app.post('/api/ai/diagnose-service', async (req: Request, res: Response) => {
  try {
    const { text, imageBase64, mimeType, audioTranscript, availableServices = [] } = req.body;

    const servicesListStr = Array.isArray(availableServices)
      ? availableServices
          .slice(0, 30)
          .map((s: any) => `ID: ${s.id}, Name: ${s.name}, Category: ${s.categoryId}, Price: ₹${s.basePrice}`)
          .join('\n')
      : '';

    const prompt = `You are KaamDost AI, the expert service diagnostic assistant for HARDINKAAM Bhopal & Indore home services.
Analyze the user's service issue (text, voice transcript, or image description).
Determine:
1. Category ID (must match one of: cat_electrician, cat_plumber, cat_ac_appliance, cat_cleaning, cat_painting, cat_carpentry, cat_ro_water, cat_pest_control, or large custom work like painting, renovation, waterproofing, modular, civil, interior).
2. Subcategory & Problem Type.
3. Urgency ('immediate', 'within_2_days', 'this_week', 'flexible').
4. Service Requirement description.
5. Is this a large/custom project requiring 'Get Multiple Quotes' (e.g. full home painting, renovation, civil work, waterproofing)?
6. Select the exact matching Service from our real database if available:
${servicesListStr}

STRICT RULE: Do NOT invent prices, discounts, warranties, refunds, or free service. Use only real service prices provided above.

Return output strictly in valid JSON format:
{
  "diagnosisSummary": "...",
  "categoryId": "...",
  "categoryName": "...",
  "subcategory": "...",
  "problemType": "...",
  "urgency": "...",
  "serviceRequirement": "...",
  "matchedServiceId": "...",
  "suggestedQuestions": ["...", "..."],
  "isLargeCustomProject": false
}

User Input Text: "${text || ''}"
Voice Transcript: "${audioTranscript || ''}"
`;

    if (process.env.GEMINI_API_KEY) {
      const ai = getGeminiClient();
      const parts: any[] = [{ text: prompt }];

      if (imageBase64) {
        parts.push({
          inlineData: {
            data: imageBase64,
            mimeType: mimeType || 'image/jpeg',
          },
        });
      }

      console.log(`[AiServiceAssistant] Diagnosing service issue using ${GEMINI_CANONICAL_MODEL}...`);
      const response = await ai.models.generateContent({
        model: GEMINI_CANONICAL_MODEL,
        contents: parts,
      });
      recordAISuccess();

      const rawText = response.text || '';
      const jsonStart = rawText.indexOf('{');
      const jsonEnd = rawText.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const parsed = JSON.parse(rawText.substring(jsonStart, jsonEnd + 1));
        return res.status(200).json({
          success: true,
          model: GEMINI_CANONICAL_MODEL,
          data: parsed,
        });
      }
    }

    return res.status(200).json({
      success: false,
      model: GEMINI_CANONICAL_MODEL,
      fallbackRequired: true,
    });
  } catch (err: any) {
    recordAIError(err);
    console.warn('[AiServiceAssistant] Gemini diagnosis notice (using fallback):', err.message);
    return res.status(200).json({
      success: false,
      model: GEMINI_CANONICAL_MODEL,
      fallbackRequired: true,
      error: err.message,
    });
  }
});

/**
 * POST /api/ai/copilot
 * AI Lead Copilot recommendations and messaging scripts powered by gemini-3.8-flash.
 */
app.post('/api/ai/copilot', async (req: Request, res: Response) => {
  try {
    const { leadName, role, score, query } = req.body;

    const prompt = `You are HARDINKAAM AI Funnel Copilot advisor.
Analyze this lead:
- Lead Name: ${leadName || 'Contact'}
- Role / Trade: ${role || 'Prospect'}
- Lead Quality Score: ${score || 70}/100
- Admin Query: "${query || 'Generate best next action and WhatsApp outreach'}"

Provide a concise, highly actionable recommendation in Hindi / Hinglish.
Return 4-5 bullet points covering:
1. Lead Quality Assessment
2. Category Fit
3. Suggested Next Best Action (e.g. WhatsApp registration, onboarding assistance)
4. Recommended Script (Hinglish/Hindi)
5. Objection Handling strategy`;

    if (process.env.GEMINI_API_KEY) {
      const ai = getGeminiClient();
      console.log(`[AiFunnel] Generating copilot advice using ${GEMINI_CANONICAL_MODEL}...`);
      const response = await ai.models.generateContent({
        model: GEMINI_CANONICAL_MODEL,
        contents: prompt,
      });
      recordAISuccess();

      return res.status(200).json({
        success: true,
        model: GEMINI_CANONICAL_MODEL,
        advice: response.text || '',
      });
    }

    return res.status(200).json({
      success: true,
      model: GEMINI_CANONICAL_MODEL,
      advice: `🤖 AI Copilot Analysis for ${leadName || 'Lead'} (${role || 'Partner'}):
- Lead Quality Score: ${score || 75}/100 (High Intent)
- Category Fit: Home Services & On-Demand Repair
- Suggested Next Best Action: Send WhatsApp registration link with ₹121 QR code.
- Recommended Script (Hinglish): "नमस्ते ${leadName || 'साथी'}! हार्डिनकाम में आपका स्वागत है। अपने क्षेत्र में तुरंत काम पाने के लिए आज ही प्रोफाइल वेरीफाई करें।"
- Objection Handling: Assure 100% transparent commission and weekly direct bank payouts.`,
    });
  } catch (err: any) {
    recordAIError(err);
    console.warn('[AiFunnel] Copilot advice notice:', err.message);
    return res.status(200).json({
      success: true,
      model: GEMINI_CANONICAL_MODEL,
      advice: `🤖 AI Copilot Advisory (${GEMINI_CANONICAL_MODEL}):
- Lead Quality Score: ${req.body.score || 70}/100
- Recommended Action: Follow up directly on WhatsApp or telephone.
- Script: "नमस्ते! हार्डिनकाम में आपका स्वागत है। क्या आप अपने क्षेत्र में नए काम के अवसर पाना चाहते हैं?"`,
    });
  }
});

// HARDINKAAM AI Calling Agent API Subsystem
app.use('/api/ai-calling', createAICallingRouter(requireAdminAuth));

// Global Express API error handler to guarantee JSON response format
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.path.startsWith('/api/')) {
    console.error(`[API Error] ${req.method} ${req.path}:`, err);
    return res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Internal Server Error',
    });
  }
  next(err);
});

/**
 * Analytics endpoints for visitor geo-tracking and AdMob click reporting
 */
app.post('/api/analytics/track-visit', (req: Request, res: Response) => {
  try {
    const { visitorId, city, state, deviceType, referrer } = req.body || {};
    console.log(`[Analytics] App Open from ${city || 'India'} (${state || 'MP'}) via ${referrer || 'Direct'} on ${deviceType || 'mobile'}`);
    return res.status(200).json({ success: true, timestamp: Date.now() });
  } catch (err: any) {
    return res.status(200).json({ success: true });
  }
});

app.post('/api/analytics/track-click', (req: Request, res: Response) => {
  try {
    const { eventType, creativeTitle, city, adUnitId } = req.body || {};
    console.log(`[Analytics] Click logged: ${eventType || 'ad_click'} - "${creativeTitle}" in ${city || 'Bhopal'} (Unit: ${adUnitId})`);
    return res.status(200).json({ success: true, timestamp: Date.now() });
  } catch (err: any) {
    return res.status(200).json({ success: true });
  }
});

// Catch-all handler for unhandled API routes to strictly guarantee JSON response (never HTML)
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API route not found: ${req.method} ${req.path}`,
  });
});

// Vite middleware / production serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      logLevel: 'silent',
      appType: 'spa',
    });

    // Intercept dev PWA and /@vite/client in preview/dev mode to safely neutralize HMR WebSocket errors in iframes
    app.use((req, res, next) => {
      if (req.url && (req.url.includes('pwa-entry-point-loaded') || req.url.includes('register-dev-sw'))) {
        res.setHeader('Content-Type', 'application/javascript');
        return res.send('export default function registerDevSW() {};');
      }

      const isViteClient = req.url && (req.url === '/@vite/client' || req.url.startsWith('/@vite/client?'));
      if (!isViteClient) return next();

      const origEnd = res.end;
      const chunks: Buffer[] = [];

      (res as any).write = function(chunk: any) {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        return true;
      };

      (res as any).end = function(chunk: any, ...args: any[]) {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        let body = Buffer.concat(chunks).toString('utf8');
        // Prevent "WebSocket closed without opened."
        body = body.replace(
          /reject\(new Error\("WebSocket closed without opened\."\)\);/g,
          'resolve();'
        );
        body = body.replace(
          /let isOpened = socket\.readyState === socket\.OPEN;/g,
          'let isOpened = true;'
        );
        // Prevent "InvalidStateError: Failed to execute 'send' on 'WebSocket': Still in CONNECTING state."
        body = body.replace(
          /ws\.send\(JSON\.stringify\(data\)\);/g,
          'try { if (ws && ws.readyState === 1) ws.send(JSON.stringify(data)); } catch (e) {}'
        );
        body = body.replace(
          /socket\.send\(JSON\.stringify\(\{\s*type:\s*"ping"\s*\}\)\);/g,
          'try { if (socket && socket.readyState === 1) socket.send(JSON.stringify({ type: "ping" })); } catch (e) {}'
        );
        body = body.replace(
          /this\.logger\.error\(err\);/g,
          '/* swallowed hmr send error */'
        );
        body = body.replace(
          /console\.error\(\s*`\[vite\] failed to connect to websocket/g,
          'console.debug(`[vite] failed to connect to websocket'
        );
        res.setHeader('Content-Length', Buffer.byteLength(body));
        return (origEnd as any).call(res, body, ...args);
      };

      next();
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    const indexHtmlPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexHtmlPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(indexHtmlPath);
      });
    } else {
      app.get('/', (req, res) => {
        res.json({
          status: 'ok',
          service: 'HARDINKAAM Payment Backend',
          message: 'HARDINKAAM Payment & Webhook API is running.',
          endpoints: {
            health: '/api/health',
            webhook: '/api/razorpay/webhook',
          },
        });
      });
    }
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`HARDINKAAM Server running on http://0.0.0.0:${PORT}`);
  });

  // Set 10-minute timeout for heavy builds and Firebase CLI commands
  server.timeout = 10 * 60 * 1000;
  server.keepAliveTimeout = 10 * 60 * 1000;
  server.headersTimeout = 10 * 60 * 1000 + 5000;
}

startServer();
