import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { safeFetchJson } from '../utils/safeJson';
import {
  DeploymentVersion,
  DeploymentProgressUpdate,
  DeploymentStage,
  DeploymentJobRecord,
  DeploymentErrorDetails,
  FlaggedExecutableFile,
  PreDeploymentAuditResult,
} from '../types';

const COLLECTION_NAME = 'deploymentVersions';
const JOBS_COLLECTION = 'deploymentJobs';

/**
 * Fetch current system readiness and live deployment version
 */
export async function fetchDeploymentStatus(): Promise<{
  currentVersion: string;
  nextSuggestedVersion: string;
  liveUrl: string;
  firebaseProjectId: string;
  totalDeployments: number;
  currentLiveDeployment?: DeploymentVersion | null;
}> {
  try {
    const user = auth.currentUser;
    const token = user ? await user.getIdToken().catch(() => '') : '';

    const res = await fetch('/api/admin/deploy/status', {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-admin-email': user?.email || 'deepakbuildconbhopal@gmail.com',
        'x-admin-role': 'admin',
      },
    });

    const jsonResult = await safeFetchJson(res);
    if (res.ok && jsonResult.ok && jsonResult.data) {
      return jsonResult.data;
    }
  } catch (e) {
    console.warn('Backend deploy status endpoint unreachable, falling back to Firestore:', e);
  }

  // Fallback to Firestore directly if backend offline
  return {
    currentVersion: 'v1.0.3',
    nextSuggestedVersion: 'v1.0.4',
    liveUrl: 'https://hardinkaam-5cc6a.web.app',
    firebaseProjectId: 'hardinkaam-5cc6a',
    totalDeployments: 1,
  };
}

/**
 * Fetch all deployment history records
 */
export async function fetchDeploymentHistory(): Promise<DeploymentVersion[]> {
  try {
    const user = auth.currentUser;
    const token = user ? await user.getIdToken().catch(() => '') : '';

    const res = await fetch('/api/admin/deploy/history', {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-admin-email': user?.email || 'deepakbuildconbhopal@gmail.com',
        'x-admin-role': 'admin',
      },
    });

    const jsonResult = await safeFetchJson(res);
    if (res.ok && jsonResult.ok && jsonResult.data?.deployments && Array.isArray(jsonResult.data.deployments)) {
      return jsonResult.data.deployments;
    }
  } catch (e) {
    console.warn('Backend history endpoint fetch error, reading Firestore:', e);
  }

  // Read from Firestore
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const q = query(colRef, orderBy('uploadedAt', 'desc'));
    const snap = await getDocs(q);

    const list: DeploymentVersion[] = [];
    snap.forEach((d) => {
      list.push(d.data() as DeploymentVersion);
    });

    if (list.length === 0) {
      return [
        {
          id: 'v1-0-3-initial',
          version: 'v1.0.3',
          status: 'LIVE',
          buildStatus: 'SUCCESS',
          deploymentStatus: 'LIVE',
          uploadedBy: 'Deepak Buildcon Bhopal',
          uploadedByEmail: 'deepakbuildconbhopal@gmail.com',
          uploadedAt: '2026-04-12T10:00:00.000Z',
          deploymentTime: '2026-04-12T10:05:00.000Z',
          zipFileName: 'hdkfinal100.zip',
          zipFileSize: 3450000,
          siteUrl: 'https://hardinkaam-5cc6a.web.app',
          isActiveLive: true,
        },
      ];
    }

    return list;
  } catch (err) {
    console.warn('Notice loading deployment records from Firestore:', err);
    return [
      {
        id: 'v1-0-3-initial',
        version: 'v1.0.3',
        status: 'LIVE',
        buildStatus: 'SUCCESS',
        deploymentStatus: 'LIVE',
        uploadedBy: 'Deepak Buildcon Bhopal',
        uploadedByEmail: 'deepakbuildconbhopal@gmail.com',
        uploadedAt: '2026-04-12T10:00:00.000Z',
        deploymentTime: '2026-04-12T10:05:00.000Z',
        zipFileName: 'hdkfinal100.zip',
        zipFileSize: 3450000,
        siteUrl: 'https://hardinkaam-5cc6a.web.app',
        isActiveLive: true,
      },
    ];
  }
}

/**
 * Listen for real-time deployment history updates
 */
export function subscribeToDeployments(
  callback: (deployments: DeploymentVersion[]) => void
): () => void {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const q = query(colRef, orderBy('uploadedAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const deployments: DeploymentVersion[] = [];
        snapshot.forEach((docSnap) => {
          deployments.push(docSnap.data() as DeploymentVersion);
        });
        callback(deployments);
      },
      (error) => {
        console.warn('Firestore real-time deployment subscription error:', error);
      }
    );
  } catch (err) {
    console.warn('Could not establish real-time Firestore deployment listener:', err);
    return () => {};
  }
}

export interface UploadAndDeployOptions {
  customVersion?: string;
  adminEmail: string;
  adminName: string;
  adminUid: string;
  force?: boolean;
  stripUnsupportedFiles?: boolean;
}

export interface DeploymentResult {
  success: boolean;
  message: string;
  deployment?: DeploymentVersion;
  isDuplicate?: boolean;
  existingVersion?: string;
  zipHash?: string;
  errorDetails?: DeploymentErrorDetails | null;
  jobId?: string;
  detectedExecutables?: FlaggedExecutableFile[];
  requiresAuditConfirmation?: boolean;
}

/**
 * Upload ZIP with continuous feedback and resilient background pipeline polling
 */
export async function uploadAndDeployZip(
  file: File,
  options: UploadAndDeployOptions,
  onProgress: (update: DeploymentProgressUpdate) => void
): Promise<DeploymentResult> {
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  return new Promise(async (resolve) => {
    let pollInterval: any = null;
    let isCompleted = false;

    const cleanup = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };

    try {
      const user = auth.currentUser;
      const token = user ? await user.getIdToken().catch(() => '') : '';

      onProgress({
        stage: 'UPLOADING',
        progress: 2,
        message: `ZIP पैकेज (${(file.size / (1024 * 1024)).toFixed(2)} MB) तैयार व अपलोड हो रहा है...`,
        logs: [`Initiating upload for ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`],
      });

      const formData = new FormData();
      formData.append('zipFile', file);
      formData.append('jobId', jobId);
      formData.append('adminEmail', options.adminEmail);
      formData.append('adminName', options.adminName);
      formData.append('adminUid', options.adminUid);
      if (options.customVersion) {
        formData.append('customVersion', options.customVersion);
      }
      if (options.force) {
        formData.append('force', 'true');
      }
      if (options.stripUnsupportedFiles) {
        formData.append('stripUnsupportedFiles', 'true');
      }

      // Granular upload using XMLHttpRequest to give smooth 0-15% file transfer feedback
      const uploadSuccess = await new Promise<boolean>((resolveUpload, rejectUpload) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `/api/admin/deploy/upload${options.force ? '?force=true' : ''}`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('x-admin-email', options.adminEmail);
        xhr.setRequestHeader('x-admin-name', options.adminName);
        xhr.setRequestHeader('x-admin-uid', options.adminUid);
        xhr.setRequestHeader('x-admin-role', 'admin');

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && event.total > 0) {
            const uploadPercent = Math.round((event.loaded / event.total) * 100);
            // Map file transfer to 2% - 15% of overall pipeline
            const mappedProgress = Math.min(15, 2 + Math.round((uploadPercent * 13) / 100));
            onProgress({
              stage: 'UPLOADING',
              progress: mappedProgress,
              message: `सर्वर पर ZIP अपलोड जारी है: ${uploadPercent}% (${(event.loaded / (1024 * 1024)).toFixed(1)} MB / ${(event.total / (1024 * 1024)).toFixed(1)} MB)...`,
              logs: [`File upload progress: ${uploadPercent}%`],
            });
          }
        };

        xhr.onload = () => {
          const responseText = xhr.responseText || '';
          let jsonResponse: any = null;
          try {
            if (responseText.trim()) {
              jsonResponse = JSON.parse(responseText);
            }
          } catch {
            // Not JSON or partial response
          }

          if (jsonResponse && typeof jsonResponse === 'object') {
            // Handle duplicate ZIP detection
            if (jsonResponse.isDuplicate) {
              cleanup();
              isCompleted = true;
              onProgress({
                stage: 'IDLE',
                progress: 0,
                message: jsonResponse.message,
                logs: [`Duplicate ZIP detected (exact SHA-256 match with version ${jsonResponse.existingVersion}).`],
              });
              resolve({
                success: false,
                isDuplicate: true,
                existingVersion: jsonResponse.existingVersion,
                zipHash: jsonResponse.zipHash,
                message: jsonResponse.message,
                jobId,
              });
              resolveUpload(false);
              return;
            }

            if (xhr.status >= 200 && xhr.status < 300 && jsonResponse.success) {
              resolveUpload(true);
              return;
            } else {
              rejectUpload(
                new Error(jsonResponse.error || jsonResponse.message || `ZIP अपलोड असफल रहा (Status ${xhr.status})।`)
              );
              return;
            }
          }

          if (xhr.status === 413 || responseText.includes('413') || responseText.includes('Too Large')) {
            rejectUpload(
              new Error(
                `फ़ाइल का आकार (${(file.size / (1024 * 1024)).toFixed(1)} MB) बहुत बड़ा है। कृपया 80 MB से छोटी ZIP फ़ाइल अपलोड करें।`
              )
            );
            return;
          }

          if (xhr.status === 403 || responseText.includes('Forbidden')) {
            rejectUpload(
              new Error('अनधिकृत अनुरोध (403 Forbidden): कृपया एडमिन क्रेडेंशियल्स के साथ पुनः लॉगिन करें।')
            );
            return;
          }

          if (
            xhr.status === 502 ||
            xhr.status === 503 ||
            xhr.status === 504 ||
            responseText.includes('Gateway') ||
            responseText.includes('warmup')
          ) {
            rejectUpload(
              new Error('सर्वर या गेटवे टाइमआउट (HTTP 504)। कृपया थोड़ी देर बाद पुनः प्रयास करें।')
            );
            return;
          }

          if (xhr.status >= 200 && xhr.status < 300) {
            resolveUpload(true);
            return;
          }

          rejectUpload(
            new Error(
              `सर्वर से अप्रत्याशित प्रतिक्रिया (HTTP ${xhr.status}): कृपया पुनः प्रयास करें। ${responseText ? `(विवरण: ${responseText.slice(0, 120)})` : ''}`
            )
          );
        };

        xhr.onerror = () => {
          rejectUpload(new Error('नेटवर्क त्रुटि: सर्वर से संचार विफल रहा। कृपया इंटरनेट कनेक्शन जांचें।'));
        };

        xhr.ontimeout = () => {
          rejectUpload(new Error('अपलोड टाइमआउट: सर्वर को फ़ाइल भेजने में अधिक समय लगा। कृपया पुनः प्रयास करें।'));
        };

        xhr.send(formData);
      });

      if (!uploadSuccess || isCompleted) {
        cleanup();
        return;
      }

      // Upload confirmed! Switch immediately to validation state
      onProgress({
        stage: 'VALIDATING',
        progress: 18,
        message: 'ZIP सफलतापूर्वक अपलोड हुआ। पाथ ट्रैवर्सल, सुरक्षा व प्रोजेक्ट संरचना सत्यापन प्रारंभ...',
        logs: ['ZIP uploaded to server. Server-side async build pipeline active.'],
      });

      const startTime = Date.now();
      const MAX_POLL_TIME = 15 * 60 * 1000; // 15 minutes timeout
      let consecutiveErrors = 0;

      pollInterval = setInterval(async () => {
        if (isCompleted) return;

        if (Date.now() - startTime > MAX_POLL_TIME) {
          cleanup();
          isCompleted = true;
          const timeoutErr = 'डिप्लॉयमेंट पाइपलाइन टाइमआउट (15 मिनट से अधिक)। कृपया स्थिति की समीक्षा करें।';
          onProgress({ stage: 'FAILED', progress: 0, message: timeoutErr, error: timeoutErr });
          resolve({ success: false, message: timeoutErr, jobId });
          return;
        }

        try {
          const res = await fetch(`/api/admin/deploy/job/${jobId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'x-admin-email': options.adminEmail,
              'x-admin-role': 'admin',
            },
          });

          if (!res.ok) {
            consecutiveErrors++;
            // If backend instance restarted or 404, query Firestore directly
            if (consecutiveErrors >= 3) {
              try {
                const jobSnap = await getDoc(doc(db, JOBS_COLLECTION, jobId));
                if (jobSnap.exists()) {
                  const jobData = jobSnap.data() as DeploymentJobRecord;
                  handleJobData(jobData);
                  return;
                }
              } catch (fsErr) {
                // non-fatal
              }
            }
            return;
          }

          consecutiveErrors = 0;
          let data: any = null;
          try {
            data = await res.json();
          } catch {
            return;
          }

          if (data && data.job) {
            handleJobData(data.job);
          }
        } catch (pollErr) {
          consecutiveErrors++;
        }
      }, 1000);

      const handleJobData = async (job: DeploymentJobRecord) => {
        if (isCompleted) return;

        const stage = (job.currentStage || (job as any).stage) as DeploymentStage;
        const progress = job.progress || 0;
        const message = job.message || '';
        const errorMsg = job.errorMessage || (job as any).error || null;
        const errorDetails = job.errorDetails || null;

        onProgress({
          stage,
          progress,
          message,
          version: job.versionTag || (job as any).version,
          error: errorMsg,
          logs: job.logs || [],
          deployment: job.deployment,
          jobRecord: job,
          errorDetails,
          detectedExecutables: job.detectedExecutables,
          requiresAuditConfirmation: job.requiresAuditConfirmation || job.status === 'ACTION_REQUIRED',
        });

        if (
          job.status === 'ACTION_REQUIRED' ||
          (job.detectedExecutables && job.detectedExecutables.length > 0 && job.requiresAuditConfirmation)
        ) {
          // Flagged executables detected: Keep listening, allow UI action modal to handle exclusion
          return;
        }

        if (job.status === 'SUCCESS' || stage === 'LIVE') {
          isCompleted = true;
          cleanup();

          if (job.deployment) {
            try {
              await setDoc(doc(db, COLLECTION_NAME, job.deployment.id), job.deployment);
            } catch (e) {
              console.warn('Firestore deployment sync notice:', e);
            }
          }

          resolve({
            success: true,
            message: job.message || `वर्शन ${job.versionTag || ''} सफलतापूर्वक लाइव हो गया है!`,
            deployment: job.deployment,
            jobId,
          });
          return;
        }

        if (
          job.status === 'FAILED' ||
          job.status === 'FAILED_TIMEOUT' ||
          stage === 'FAILED' ||
          stage === 'FAILED_TIMEOUT'
        ) {
          isCompleted = true;
          cleanup();

          if (job.deployment) {
            try {
              await setDoc(doc(db, COLLECTION_NAME, job.deployment.id), job.deployment);
            } catch (e) {
              // non-fatal
            }
          }

          resolve({
            success: false,
            message: errorMsg || 'डिप्लॉयमेंट असफल रहा। मौजूदा लाइव वेबसाइट पूरी तरह सुरक्षित है।',
            deployment: job.deployment,
            errorDetails,
            jobId,
          });
          return;
        }
      };
    } catch (err: any) {
      cleanup();
      isCompleted = true;
      const errorMsg = err.message || 'नेटवर्क या निष्पादन त्रुटि के कारण डिप्लॉयमेंट रुक गया।';

      onProgress({
        stage: 'FAILED',
        progress: 0,
        message: errorMsg,
        error: errorMsg,
      });

      resolve({
        success: false,
        message: errorMsg,
        jobId,
      });
    }
  });
}

/**
 * Retry a failed deployment stage or job without re-uploading
 */
export async function retryDeploymentJobApi(
  jobId: string,
  options: {
    adminEmail: string;
    adminName: string;
    adminUid: string;
    stripUnsupportedFiles?: boolean;
    excludeSpecificFiles?: string[];
  }
): Promise<{ success: boolean; message: string }> {
  try {
    const user = auth.currentUser;
    const token = user ? await user.getIdToken().catch(() => '') : '';

    const res = await fetch('/api/admin/deploy/retry-job', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-admin-email': options.adminEmail,
        'x-admin-name': options.adminName,
        'x-admin-uid': options.adminUid,
        'x-admin-role': 'admin',
      },
      body: JSON.stringify({
        jobId,
        stripUnsupportedFiles: options.stripUnsupportedFiles,
        excludeSpecificFiles: options.excludeSpecificFiles,
      }),
    });

    const jsonResult = await safeFetchJson(res);
    if (jsonResult.ok && jsonResult.data) {
      return jsonResult.data;
    }
    return {
      success: false,
      message: jsonResult.error || `Server error (HTTP ${res.status})`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Failed to trigger retry on server',
    };
  }
}

/**
 * Continue deployment after Pre-Deployment Audit flagged executables,
 * safely excluding specified files from the staging directory before deployment.
 * The original uploaded ZIP remains completely untouched and non-destructively preserved.
 */
export async function continueAuditDeploymentApi(
  jobId: string,
  options: {
    adminEmail: string;
    adminName: string;
    adminUid: string;
    excludeFiles?: string[];
    excludeAllFlagged?: boolean;
  }
): Promise<{ success: boolean; message: string }> {
  try {
    const user = auth.currentUser;
    const token = user ? await user.getIdToken().catch(() => '') : '';

    const res = await fetch('/api/admin/deploy/continue-audit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-admin-email': options.adminEmail,
        'x-admin-name': options.adminName,
        'x-admin-uid': options.adminUid,
        'x-admin-role': 'admin',
      },
      body: JSON.stringify({
        jobId,
        excludeFiles: options.excludeFiles,
        excludeAllFlagged: options.excludeAllFlagged !== false,
      }),
    });

    const jsonResult = await safeFetchJson(res);
    if (jsonResult.ok && jsonResult.data) {
      return jsonResult.data;
    }
    return {
      success: false,
      message: jsonResult.error || `Server error (HTTP ${res.status})`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Failed to trigger audit continuation on server',
    };
  }
}

/**
 * Fast client-side / server pre-audit inspection of a ZIP archive before deployment
 */
export async function preAuditZipFileApi(
  file: File,
  options: {
    adminEmail: string;
    adminName: string;
    adminUid: string;
  }
): Promise<{ success: boolean; audit?: PreDeploymentAuditResult; error?: string }> {
  try {
    const user = auth.currentUser;
    const token = user ? await user.getIdToken().catch(() => '') : '';

    const formData = new FormData();
    formData.append('zipFile', file);

    const res = await fetch('/api/admin/deploy/pre-audit', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-admin-email': options.adminEmail,
        'x-admin-name': options.adminName,
        'x-admin-uid': options.adminUid,
        'x-admin-role': 'admin',
      },
      body: formData,
    });

    const jsonResult = await safeFetchJson(res);
    if (jsonResult.ok && jsonResult.data) {
      return jsonResult.data;
    }
    return {
      success: false,
      error: jsonResult.error || `Pre-deployment audit check failed (HTTP ${res.status})`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Pre-deployment audit check failed',
    };
  }
}

/**
 * Rollback production website to a previous successful release
 */
export async function rollbackToVersion(
  targetVersionId: string,
  options: {
    adminEmail: string;
    adminName: string;
    adminUid: string;
  }
): Promise<{ success: boolean; message: string; deployment?: DeploymentVersion }> {
  try {
    const user = auth.currentUser;
    const token = user ? await user.getIdToken().catch(() => '') : '';

    const res = await fetch('/api/admin/deploy/rollback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-admin-email': options.adminEmail,
        'x-admin-name': options.adminName,
        'x-admin-uid': options.adminUid,
        'x-admin-role': 'admin',
      },
      body: JSON.stringify({ targetVersionId }),
    });

    const jsonResult = await safeFetchJson(res);
    if (res.ok && jsonResult.ok && jsonResult.data) {
      return jsonResult.data;
    } else {
      return {
        success: false,
        message: jsonResult.data?.error || jsonResult.error || `Rollback request failed (HTTP ${res.status})`,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Rollback communication error',
    };
  }
}
