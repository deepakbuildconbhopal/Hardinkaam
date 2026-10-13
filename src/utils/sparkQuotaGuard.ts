/**
 * Firebase Spark Quota Guard & Operation Estimator Utility
 * Tracks application-level browser session operation estimates (reads, writes, deletes) against
 * Firebase Spark tier daily limits:
 * - 50,000 Firestore reads/day
 * - 20,000 Firestore writes/day
 * - 20,000 Firestore deletes/day
 * 
 * IMPORTANT: These counters are client-side session approximations for throttling and warnings.
 * They are NOT official Google Cloud / Firebase server billing metrics. Server quotas are enforced
 * authoritatively by Firestore and reset every 24 hours at midnight PST or via manual database upgrade.
 */

const QUOTA_STORAGE_KEY = 'hdk_spark_quota_estimates_v1';
const EXHAUSTED_STORAGE_KEY = 'hdk_firestore_resource_exhausted_v1';

export const FIRESTORE_CONSOLE_UPGRADE_URL =
  'https://console.firebase.google.com/project/hardinkaam-5cc6a/firestore/databases/ai-studio-916bb095-fb46-428e-9b8d-ba9e7a76de57/data?openUpgradeDialog=true';

export interface QuotaEstimates {
  date: string;
  reads: number;
  writes: number;
  deletes: number;
  lastUpdated: number;
}

export const SPARK_LIMITS = {
  reads: 50000,
  writes: 20000,
  deletes: 20000,
};

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function loadStoredEstimates(): QuotaEstimates {
  const today = getTodayKey();
  try {
    const raw = sessionStorage.getItem(QUOTA_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as QuotaEstimates;
      if (parsed.date === today) {
        return parsed;
      }
    }
  } catch (e) {
    // fallback
  }

  return {
    date: today,
    reads: 0,
    writes: 0,
    deletes: 0,
    lastUpdated: Date.now(),
  };
}

let currentEstimates: QuotaEstimates = loadStoredEstimates();

function saveEstimates() {
  try {
    sessionStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(currentEstimates));
  } catch (e) {
    // storage full or disabled
  }
}

export function recordSparkRead(count = 1) {
  const today = getTodayKey();
  if (currentEstimates.date !== today) {
    currentEstimates = { date: today, reads: count, writes: 0, deletes: 0, lastUpdated: Date.now() };
  } else {
    currentEstimates.reads += count;
    currentEstimates.lastUpdated = Date.now();
  }
  saveEstimates();
}

export function recordSparkWrite(count = 1) {
  const today = getTodayKey();
  if (currentEstimates.date !== today) {
    currentEstimates = { date: today, reads: 0, writes: count, deletes: 0, lastUpdated: Date.now() };
  } else {
    currentEstimates.writes += count;
    currentEstimates.lastUpdated = Date.now();
  }
  saveEstimates();
}

export function recordSparkDelete(count = 1) {
  const today = getTodayKey();
  if (currentEstimates.date !== today) {
    currentEstimates = { date: today, reads: 0, writes: 0, deletes: count, lastUpdated: Date.now() };
  } else {
    currentEstimates.deletes += count;
    currentEstimates.lastUpdated = Date.now();
  }
  saveEstimates();
}

export interface QuotaReport {
  estimates: QuotaEstimates;
  limits: typeof SPARK_LIMITS;
  readPercent: number;
  writePercent: number;
  deletePercent: number;
  isWarning: boolean;
  isCritical: boolean;
}

export function getSparkQuotaReport(): QuotaReport {
  const est = loadStoredEstimates();
  const readPercent = Number(((est.reads / SPARK_LIMITS.reads) * 100).toFixed(1));
  const writePercent = Number(((est.writes / SPARK_LIMITS.writes) * 100).toFixed(1));
  const deletePercent = Number(((est.deletes / SPARK_LIMITS.deletes) * 100).toFixed(1));

  const maxPercent = Math.max(readPercent, writePercent, deletePercent);

  return {
    estimates: est,
    limits: SPARK_LIMITS,
    readPercent,
    writePercent,
    deletePercent,
    isWarning: maxPercent >= 75 && maxPercent < 95,
    isCritical: maxPercent >= 95,
  };
}

/**
 * Safe query wrapper with pagination limit guard
 */
export function enforceQueryLimit(requestedLimit: number, maxAllowed = 100): number {
  return Math.min(Math.max(1, requestedLimit), maxAllowed);
}

// Global resource exhausted state management
let isExhaustedFlag = (() => {
  try {
    return sessionStorage.getItem(EXHAUSTED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
})();

const quotaListeners: Array<(exhausted: boolean, message: string) => void> = [];

export function isResourceExhausted(): boolean {
  return isExhaustedFlag;
}

export function setResourceExhausted(exhausted: boolean, message = ''): void {
  isExhaustedFlag = exhausted;
  try {
    sessionStorage.setItem(EXHAUSTED_STORAGE_KEY, exhausted ? 'true' : 'false');
  } catch {}
  quotaListeners.forEach(listener => {
    try {
      listener(exhausted, message);
    } catch {}
  });
}

export function subscribeQuotaExhaustion(listener: (exhausted: boolean, message: string) => void): () => void {
  quotaListeners.push(listener);
  // immediately invoke with current state if true
  if (isExhaustedFlag) {
    try {
      listener(true, 'Quota exceeded for quota metric Free daily read units per project (free tier database).');
    } catch {}
  }
  return () => {
    const idx = quotaListeners.indexOf(listener);
    if (idx >= 0) quotaListeners.splice(idx, 1);
  };
}

export function checkAndHandleQuotaError(err: any): boolean {
  if (!err) return false;
  const errStr = `${err?.code || ''} ${err?.message || ''}`.toLowerCase();
  if (errStr.includes('resource-exhausted') || errStr.includes('quota exceeded') || errStr.includes('free daily read units') || err?.code === 8 || err?.status === 8) {
    const msg = err?.message || 'Quota exceeded for quota metric Free daily read units per project (free tier database).';
    setResourceExhausted(true, msg);
    return true;
  }
  return false;
}
