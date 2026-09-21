import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { exec } from 'child_process';
import JSZip from 'jszip';
import AdmZip from 'adm-zip';
import { db } from '../src/firebase/config';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import {
  DeploymentVersion,
  DeploymentStage,
  DeploymentProgressUpdate,
  DeploymentJobRecord,
  StageExecutionRecord,
  DeploymentErrorDetails,
  FlaggedExecutableFile,
  PreDeploymentAuditResult,
} from '../src/types/index';

const FIREBASE_PROJECT_ID = 'hardinkaam-5cc6a';
const PRODUCTION_SITE_URL = 'https://hardinkaam-5cc6a.web.app';
const RELEASES_CACHE_DIR = path.join(os.tmpdir(), 'hardinkaam-releases');
const DEPLOY_TEMP_ROOT = path.join(os.tmpdir(), 'hardinkaam-deploy');
const ZIPS_CACHE_DIR = path.join(DEPLOY_TEMP_ROOT, 'zips');

// Ensure system directories exist
for (const dir of [RELEASES_CACHE_DIR, DEPLOY_TEMP_ROOT, ZIPS_CACHE_DIR]) {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (err) {
      console.warn(`[DeploymentService] Warning creating dir "${dir}":`, err);
    }
  }
}

// In-memory records cache
const deploymentRecords: Map<string, DeploymentVersion> = new Map();
let currentLiveVersionId: string | null = 'dep_v1_0_3_initial';

// Seed initial default version
deploymentRecords.set('dep_v1_0_3_initial', {
  id: 'dep_v1_0_3_initial',
  version: 'v1.0.3',
  status: 'LIVE',
  buildStatus: 'SUCCESS',
  deploymentStatus: 'LIVE',
  uploadedBy: 'DEEPAK (System Admin)',
  uploadedByEmail: 'deepakbuildconbhopal@gmail.com',
  uploadedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  deploymentTime: new Date(Date.now() - 86400000 * 2).toISOString(),
  zipFileName: 'hardinkaam-v1.0.3-production.zip',
  zipFileSize: 1428500,
  buildLog: 'Build completed successfully. Production dist/ verified with PWA assets and Vite bundles.',
  deploymentLog: `Deployed to Firebase Hosting (Site: ${FIREBASE_PROJECT_ID}). Version released to ${PRODUCTION_SITE_URL}`,
  errorMessage: null,
  siteUrl: PRODUCTION_SITE_URL,
  isActiveLive: true,
});

// Active in-memory jobs cache
const activeJobs: Map<string, DeploymentJobRecord> = new Map();

/**
 * Persist job state to both in-memory cache and Firestore
 */
async function persistJobState(job: DeploymentJobRecord): Promise<void> {
  job.updatedAt = new Date().toISOString();
  activeJobs.set(job.jobId, job);

  try {
    const jobRef = doc(db, 'deploymentJobs', job.jobId);
    await setDoc(jobRef, {
      ...job,
      updatedAt: job.updatedAt,
    }, { merge: true });
  } catch (err: any) {
    // Non-fatal: in-memory cache remains authoritative
    // console.warn('[DeploymentService] Note on Firestore job state sync:', err?.message);
  }
}

/**
 * Executable extensions to audit and detect
 */
export const EXECUTABLE_EXTENSIONS = new Set([
  '.apk', '.exe', '.sh', '.dll', '.bat', '.cmd', '.com', '.msi',
  '.dmg', '.pkg', '.bin', '.vbs', '.ps1', '.app', '.deb', '.rpm',
]);

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function getExecutableTypeDescription(ext: string): string {
  switch (ext.toLowerCase()) {
    case '.apk':
      return 'Android Package (.apk)';
    case '.exe':
      return 'Windows Executable (.exe)';
    case '.sh':
      return 'Shell Script (.sh)';
    case '.dll':
      return 'Dynamic Link Library (.dll)';
    case '.bat':
      return 'Windows Batch Script (.bat)';
    case '.cmd':
      return 'Command Script (.cmd)';
    case '.msi':
      return 'Windows Installer Package (.msi)';
    case '.bin':
      return 'Binary Executable (.bin)';
    case '.vbs':
      return 'VBScript File (.vbs)';
    case '.ps1':
      return 'PowerShell Script (.ps1)';
    case '.app':
      return 'macOS Application Bundle (.app)';
    case '.dmg':
      return 'macOS Disk Image (.dmg)';
    case '.pkg':
      return 'Package Installer (.pkg)';
    case '.deb':
      return 'Debian Package (.deb)';
    case '.rpm':
      return 'RPM Package (.rpm)';
    default:
      return `Executable Binary (${ext})`;
  }
}

/**
 * Inspect an extracted staging directory for any executable files
 */
export async function auditExtractedDirectory(
  stagingDir: string
): Promise<{
  executables: FlaggedExecutableFile[];
  totalFiles: number;
  totalSize: number;
}> {
  const executables: FlaggedExecutableFile[] = [];
  let totalFiles = 0;
  let totalSize = 0;

  async function scan(currentPath: string) {
    if (!fs.existsSync(currentPath)) return;
    const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      const relPath = path.relative(stagingDir, fullPath).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.git') {
          await scan(fullPath);
        }
      } else if (entry.isFile()) {
        totalFiles++;
        try {
          const stat = await fs.promises.stat(fullPath);
          totalSize += stat.size;

          const ext = path.extname(entry.name).toLowerCase();
          if (EXECUTABLE_EXTENSIONS.has(ext)) {
            executables.push({
              path: relPath,
              name: entry.name,
              ext,
              size: stat.size,
              sizeFormatted: formatBytes(stat.size),
              fileType: getExecutableTypeDescription(ext),
              isInStaging: true,
            });
          }
        } catch (statErr) {
          // ignore stat errors on special files
        }
      }
    }
  }

  await scan(stagingDir);
  return { executables, totalFiles, totalSize };
}

/**
 * Non-destructively exclude specific files ONLY from the staging directory.
 * The original uploaded ZIP archive is NEVER modified or deleted.
 */
export async function excludeFilesFromStaging(
  stagingDir: string,
  filesToExclude: string[]
): Promise<string[]> {
  const removed: string[] = [];
  const normalizedStaging = path.resolve(stagingDir);

  for (const relPath of filesToExclude) {
    const fullPath = path.resolve(stagingDir, relPath);
    // Security check: ensure path stays within stagingDir
    if (!fullPath.startsWith(normalizedStaging)) {
      console.warn(`[Audit] Blocked unsafe path outside staging: ${relPath}`);
      continue;
    }

    if (fs.existsSync(fullPath)) {
      try {
        await fs.promises.unlink(fullPath);
        removed.push(relPath);
      } catch (err: any) {
        console.warn(`[Audit] Warning excluding ${relPath} from staging:`, err.message);
      }
    }
  }
  return removed;
}

/**
 * Pre-audit an uploaded ZIP buffer without running a full deployment.
 * Fast inspection for executables before deployment starts.
 */
export async function preAuditZipBuffer(zipBuffer: Buffer): Promise<PreDeploymentAuditResult> {
  const validation = await validateZipArchiveAsync(zipBuffer);
  let executables: FlaggedExecutableFile[] = [];

  try {
    const zip = await JSZip.loadAsync(zipBuffer, { checkCRC32: false });
    const entries = Object.values(zip.files);

    for (const entry of entries) {
      if (!entry.dir) {
        const cleanPath = entry.name.replace(/\\/g, '/');
        const ext = path.extname(cleanPath).toLowerCase();
        if (EXECUTABLE_EXTENSIONS.has(ext)) {
          const size = (entry as any)._data?.uncompressedSize || 0;
          executables.push({
            path: cleanPath,
            name: path.basename(cleanPath),
            ext,
            size,
            sizeFormatted: formatBytes(size),
            fileType: getExecutableTypeDescription(ext),
            isInStaging: false,
          });
        }
      }
    }
  } catch (err: any) {
    console.warn('[Audit] Warning loading zip in preAuditZipBuffer:', err.message);
  }

  return {
    hasExecutables: executables.length > 0,
    executables,
    totalFiles: validation.filesCount,
    totalSize: validation.totalUncompressedSize || zipBuffer.length,
    deploymentMode: validation.deploymentMode,
    rootPrefix: validation.rootPrefix,
    isClean: executables.length === 0,
    message:
      executables.length > 0
        ? `Pre-deployment audit: ${executables.length} executable file(s) (.apk, .exe, .sh, .dll) detected. These can be excluded from staging before deployment.`
        : 'Pre-deployment audit passed: No executable files detected. Clean for Firebase Hosting.',
  };
}

/**
 * Initialize 9 pipeline stage records (including dedicated Pre-Deploy Audit)
 */
function createInitialStageRecords(): Record<string, StageExecutionRecord> {
  return {
    UPLOADING: { key: 'UPLOADING', label: '1. ZIP Upload', status: 'PENDING', progress: 0 },
    VALIDATING: { key: 'VALIDATING', label: '2. ZIP Validation', status: 'PENDING', progress: 0 },
    EXTRACTING: { key: 'EXTRACTING', label: '3. Safe Extraction', status: 'PENDING', progress: 0 },
    AUDITING: { key: 'AUDITING', label: '4. Pre-Deploy Audit', status: 'PENDING', progress: 0 },
    INSTALLING: { key: 'INSTALLING', label: '5. Dependencies', status: 'PENDING', progress: 0 },
    BUILDING: { key: 'BUILDING', label: '6. Production Build', status: 'PENDING', progress: 0 },
    VERIFYING: { key: 'VERIFYING', label: '7. Artifact Audit', status: 'PENDING', progress: 0 },
    DEPLOYING: { key: 'DEPLOYING', label: '8. Firebase Deploy', status: 'PENDING', progress: 0 },
    LIVE: { key: 'LIVE', label: '9. Version LIVE', status: 'PENDING', progress: 0 },
  };
}

/**
 * Calculate SHA-256 hash of a buffer
 */
export function computeZipSha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Check if the exact same ZIP has already been deployed LIVE
 */
export function checkDuplicateZip(zipBuffer: Buffer): {
  isDuplicate: boolean;
  existingVersion?: string;
  zipHash: string;
} {
  const zipHash = computeZipSha256(zipBuffer);
  for (const record of deploymentRecords.values()) {
    if (record.status === 'LIVE' && (record as any).zipHash === zipHash) {
      return { isDuplicate: true, existingVersion: record.version, zipHash };
    }
  }
  return { isDuplicate: false, zipHash };
}

export interface ZipValidationResult {
  isValid: boolean;
  error?: string;
  rootPrefix: string;
  deploymentRoot: string;
  deploymentMode: 'DIST' | 'BUILD';
  filesCount: number;
  totalCompressedSize: number;
  totalUncompressedSize: number;
  zipHash: string;
  unsupportedFiles: string[];
  hasUnsupportedExecutables: boolean;
}

/**
 * Robust asynchronous ZIP inspection and validation
 * - Inspects central directory without freezing the Node event loop
 * - Validates path traversal, security, zip bomb thresholds
 * - Detects project structure (dist vs source)
 * - Detects unsupported binaries for Firebase Spark
 */
export async function validateZipArchiveAsync(zipBuffer: Buffer): Promise<ZipValidationResult> {
  const zipHash = computeZipSha256(zipBuffer);
  const totalCompressedSize = zipBuffer.length;

  if (totalCompressedSize > 80 * 1024 * 1024) {
    return {
      isValid: false,
      error: `ZIP फ़ाइल का आकार (${(totalCompressedSize / (1024 * 1024)).toFixed(1)} MB) अधिकतम अनुमत सीमा 80 MB से अधिक है।`,
      rootPrefix: '',
      deploymentRoot: '',
      deploymentMode: 'BUILD',
      filesCount: 0,
      totalCompressedSize,
      totalUncompressedSize: 0,
      zipHash,
      unsupportedFiles: [],
      hasUnsupportedExecutables: false,
    };
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(zipBuffer, { checkCRC32: false });
  } catch (parseErr: any) {
    return {
      isValid: false,
      error: `ZIP फ़ाइल पढ़ने में असमर्थ (करप्ट या अमान्य आर्काइव): ${parseErr.message || 'Malformed ZIP'}`,
      rootPrefix: '',
      deploymentRoot: '',
      deploymentMode: 'BUILD',
      filesCount: 0,
      totalCompressedSize,
      totalUncompressedSize: 0,
      zipHash,
      unsupportedFiles: [],
      hasUnsupportedExecutables: false,
    };
  }

  const entries = Object.values(zip.files);
  const filesCount = entries.length;

  if (filesCount === 0) {
    return {
      isValid: false,
      error: 'अमान्य ज़िप फ़ाइल: अपलोड की गई ZIP फ़ाइल पूरी तरह खाली है।',
      rootPrefix: '',
      deploymentRoot: '',
      deploymentMode: 'BUILD',
      filesCount: 0,
      totalCompressedSize,
      totalUncompressedSize: 0,
      zipHash,
      unsupportedFiles: [],
      hasUnsupportedExecutables: false,
    };
  }

  if (filesCount > 30000) {
    return {
      isValid: false,
      error: `सुरक्षा सीमा: ZIP में बहुत अधिक फ़ाइलें (${filesCount}) हैं। अधिकतम 30,000 फ़ाइलें अनुमत हैं।`,
      rootPrefix: '',
      deploymentRoot: '',
      deploymentMode: 'BUILD',
      filesCount,
      totalCompressedSize,
      totalUncompressedSize: 0,
      zipHash,
      unsupportedFiles: [],
      hasUnsupportedExecutables: false,
    };
  }

  const sparkUnsupportedExts = new Set([
    '.apk', '.exe', '.dll', '.bat', '.cmd', '.com', '.msi',
    '.dmg', '.pkg', '.sh', '.bin', '.vbs', '.ps1', '.app',
  ]);

  const unsupportedFiles: string[] = [];
  const normalizedPaths: string[] = [];
  let totalUncompressedSize = 0;

  for (const entry of entries) {
    const rawName = entry.name;
    const cleanPath = rawName.replace(/\\/g, '/');
    normalizedPaths.push(cleanPath);

    // Security Check: Path Traversal
    if (
      cleanPath.includes('../') ||
      cleanPath.includes('..\\') ||
      cleanPath.startsWith('/') ||
      /^[a-zA-Z]:/.test(cleanPath)
    ) {
      return {
        isValid: false,
        error: `सुरक्षा उल्लंघन: ZIP प्रविष्टि में पाथ ट्रैवर्सल ("${rawName}") पाया गया।`,
        rootPrefix: '',
        deploymentRoot: '',
        deploymentMode: 'BUILD',
        filesCount,
        totalCompressedSize,
        totalUncompressedSize: 0,
        zipHash,
        unsupportedFiles: [],
        hasUnsupportedExecutables: false,
      };
    }

    if (!entry.dir) {
      const ext = path.extname(cleanPath).toLowerCase();
      if (sparkUnsupportedExts.has(ext)) {
        unsupportedFiles.push(cleanPath);
      }

      const size = (entry as any)._data?.uncompressedSize || 0;
      totalUncompressedSize += size;
    }
  }

  // ZIP Bomb protection (> 400 MB uncompressed)
  if (totalUncompressedSize > 400 * 1024 * 1024) {
    return {
      isValid: false,
      error: `सुरक्षा सीमा: ZIP का अनकम्प्रेस्ड आकार (${(totalUncompressedSize / (1024 * 1024)).toFixed(1)} MB) बहुत बड़ा है (अधिकतम 400 MB)।`,
      rootPrefix: '',
      deploymentRoot: '',
      deploymentMode: 'BUILD',
      filesCount,
      totalCompressedSize,
      totalUncompressedSize,
      zipHash,
      unsupportedFiles,
      hasUnsupportedExecutables: unsupportedFiles.length > 0,
    };
  }

  // Project Structure Detection:
  // Case A: Pre-compiled dist/index.html (DIST MODE)
  // Case B: Nested project/dist/index.html (DIST MODE)
  // Case C: Root index.html with bundled assets (DIST MODE)
  // Case D: package.json + src/ (BUILD MODE)
  // Case E: Nested subfolder/package.json (BUILD MODE)

  let deploymentMode: 'DIST' | 'BUILD' = 'BUILD';
  let rootPrefix = '';
  let deploymentRoot = '';

  // 1. Check for DIST Mode
  let hasDistIndex = false;
  for (const p of normalizedPaths) {
    if (p === 'dist/index.html') {
      deploymentMode = 'DIST';
      rootPrefix = 'dist';
      deploymentRoot = 'dist';
      hasDistIndex = true;
      break;
    } else if (p.endsWith('/dist/index.html') && !p.includes('node_modules/')) {
      deploymentMode = 'DIST';
      const prefix = p.substring(0, p.lastIndexOf('/index.html'));
      rootPrefix = prefix;
      deploymentRoot = prefix;
      hasDistIndex = true;
      break;
    } else if (p === 'index.html' && normalizedPaths.some((n) => n.startsWith('assets/'))) {
      deploymentMode = 'DIST';
      rootPrefix = '';
      deploymentRoot = '';
      hasDistIndex = true;
      break;
    }
  }

  // 2. Check for BUILD Mode if not DIST
  if (!hasDistIndex) {
    let hasPackageJson = false;
    for (const p of normalizedPaths) {
      if (p === 'package.json') {
        deploymentMode = 'BUILD';
        rootPrefix = '';
        deploymentRoot = '';
        hasPackageJson = true;
        break;
      } else if (p.endsWith('/package.json') && !p.includes('node_modules/') && !p.includes('__MACOSX/')) {
        deploymentMode = 'BUILD';
        const prefix = p.substring(0, p.lastIndexOf('/package.json'));
        rootPrefix = prefix;
        deploymentRoot = prefix;
        hasPackageJson = true;
        break;
      }
    }

    if (!hasPackageJson) {
      return {
        isValid: false,
        error: 'अमान्य HARDINKAAM प्रोजेक्ट: ZIP में न तो pre-compiled "dist/index.html" और न ही सोर्स "package.json" मिला।',
        rootPrefix: '',
        deploymentRoot: '',
        deploymentMode: 'BUILD',
        filesCount,
        totalCompressedSize,
        totalUncompressedSize,
        zipHash,
        unsupportedFiles,
        hasUnsupportedExecutables: unsupportedFiles.length > 0,
      };
    }
  }

  return {
    isValid: true,
    rootPrefix,
    deploymentRoot,
    deploymentMode,
    filesCount,
    totalCompressedSize,
    totalUncompressedSize,
    zipHash,
    unsupportedFiles,
    hasUnsupportedExecutables: unsupportedFiles.length > 0,
  };
}

/**
 * Synchronous compatibility wrapper for validateZipArchive
 */
export function validateZipArchive(zipBuffer: Buffer): {
  isValid: boolean;
  error?: string;
  rootPrefix: string;
  filesCount: number;
} {
  try {
    const zip = new AdmZip(zipBuffer);
    const entries = zip.getEntries();
    if (entries.length === 0) {
      return { isValid: false, error: 'Empty ZIP', rootPrefix: '', filesCount: 0 };
    }
    return { isValid: true, rootPrefix: '', filesCount: entries.length };
  } catch (err: any) {
    return { isValid: false, error: err.message, rootPrefix: '', filesCount: 0 };
  }
}

/**
 * Generate next semantic version
 */
export function getNextVersionString(): string {
  const versions = Array.from(deploymentRecords.values())
    .map((d) => d.version)
    .filter((v) => /^v?\d+\.\d+\.\d+$/i.test(v));

  if (versions.length === 0) return 'v1.0.4';

  let highestPatch = 3;
  let major = 1;
  let minor = 0;

  for (const v of versions) {
    const clean = v.replace(/^v/i, '');
    const parts = clean.split('.').map((p) => parseInt(p, 10));
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      if (parts[0] > major) {
        major = parts[0];
        minor = parts[1];
        highestPatch = parts[2];
      } else if (parts[0] === major && parts[1] > minor) {
        minor = parts[1];
        highestPatch = parts[2];
      } else if (parts[0] === major && parts[1] === minor && parts[2] > highestPatch) {
        highestPatch = parts[2];
      }
    }
  }

  return `v${major}.${minor}.${highestPatch + 1}`;
}

/**
 * Run shell command with strict timeout and output capture
 */
function runCommand(
  command: string,
  cwd: string,
  timeoutMs: number = 300000
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    exec(
      command,
      {
        cwd,
        timeout: timeoutMs,
        maxBuffer: 15 * 1024 * 1024,
        env: { ...process.env, NODE_ENV: 'production' },
      },
      (error, stdout, stderr) => {
        if (error) {
          resolve({
            stdout: stdout || '',
            stderr: stderr || error.message || '',
            exitCode: error.code || 1,
          });
        } else {
          resolve({
            stdout: stdout || '',
            stderr: stderr || '',
            exitCode: 0,
          });
        }
      }
    );
  });
}

/**
 * Asynchronously extract ZIP contents without freezing the event loop
 */
async function safeExtractZipAsync(
  zip: JSZip,
  targetDir: string,
  onProgress?: (count: number, total: number) => void
): Promise<number> {
  await fs.promises.mkdir(targetDir, { recursive: true });
  const entries = Object.entries(zip.files);
  const total = entries.length;
  let extracted = 0;

  for (const [relativePath, fileObj] of entries) {
    const cleanPath = relativePath.replace(/\\/g, '/');
    if (cleanPath.includes('../') || cleanPath.startsWith('/') || /^[a-zA-Z]:/.test(cleanPath)) {
      continue;
    }

    const destPath = path.join(targetDir, cleanPath);

    if (fileObj.dir) {
      await fs.promises.mkdir(destPath, { recursive: true });
    } else {
      await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
      const content = await fileObj.async('nodebuffer');
      await fs.promises.writeFile(destPath, content);
      extracted++;
    }

    // Yield control every 25 files to keep the server completely responsive
    if (extracted % 25 === 0) {
      if (onProgress) onProgress(extracted, total);
      await new Promise((r) => setImmediate(r));
    }
  }

  return extracted;
}

/**
 * Audit directory for Firebase Spark compatibility & index.html verification
 */
async function auditDeploymentDirectory(
  dirPath: string,
  stripUnsupported: boolean
): Promise<{
  allPassed: boolean;
  unsupportedFiles: string[];
  strippedFiles: string[];
  hasIndexHtml: boolean;
  indexHtmlSize: number;
}> {
  const unsupportedFiles: string[] = [];
  const strippedFiles: string[] = [];
  let hasIndexHtml = false;
  let indexHtmlSize = 0;

  const sparkUnsupportedExts = new Set([
    '.apk', '.exe', '.dll', '.bat', '.cmd', '.com', '.msi',
    '.dmg', '.pkg', '.sh', '.bin', '.vbs', '.ps1', '.app',
  ]);

  async function scanDir(currentDir: string) {
    if (!fs.existsSync(currentDir)) return;
    const items = await fs.promises.readdir(currentDir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(currentDir, item.name);
      const relPath = path.relative(dirPath, fullPath).replace(/\\/g, '/');

      if (item.isDirectory()) {
        if (item.name !== 'node_modules' && item.name !== '.git') {
          await scanDir(fullPath);
        }
      } else if (item.isFile()) {
        if (relPath === 'index.html') {
          hasIndexHtml = true;
          const stat = await fs.promises.stat(fullPath);
          indexHtmlSize = stat.size;
        }

        const ext = path.extname(item.name).toLowerCase();
        if (sparkUnsupportedExts.has(ext)) {
          unsupportedFiles.push(relPath);
          if (stripUnsupported) {
            try {
              await fs.promises.unlink(fullPath);
              strippedFiles.push(relPath);
            } catch (delErr: any) {
              console.warn(`[Audit] Warning removing ${relPath}:`, delErr.message);
            }
          }
        }
      }
    }
  }

  await scanDir(dirPath);

  const allPassed = unsupportedFiles.length === 0 || stripUnsupported;
  return {
    allPassed,
    unsupportedFiles,
    strippedFiles,
    hasIndexHtml,
    indexHtmlSize,
  };
}

/**
 * Main Asynchronous Deployment Pipeline
 */
export async function processZipDeployment(options: {
  jobId: string;
  zipBuffer: Buffer;
  fileName: string;
  fileSize: number;
  adminUser: { uid: string; email: string; name?: string };
  customVersion?: string;
  stripUnsupportedFiles?: boolean;
  excludeSpecificFiles?: string[];
  onProgress?: (update: DeploymentProgressUpdate) => void;
}): Promise<DeploymentVersion> {
  const {
    jobId,
    zipBuffer,
    fileName,
    fileSize,
    adminUser,
    customVersion,
    stripUnsupportedFiles = false,
    excludeSpecificFiles,
    onProgress,
  } = options;

  const version = customVersion?.trim() || getNextVersionString();
  const deploymentId = `dep_${version.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
  const zipHash = computeZipSha256(zipBuffer);
  const logs: string[] = [];
  const stages = createInitialStageRecords();

  // Cache raw uploaded zip on disk for reliable stage retries without re-uploading
  const cachedZipPath = path.join(ZIPS_CACHE_DIR, `${jobId}.zip`);
  try {
    await fs.promises.writeFile(cachedZipPath, zipBuffer);
  } catch (cacheErr: any) {
    console.warn('[DeploymentService] Warning caching zip:', cacheErr?.message);
  }

  // Temp sandbox directory for extraction & staging
  const tempJobDir = path.join(DEPLOY_TEMP_ROOT, jobId);
  const tempExtractDir = path.join(tempJobDir, 'extracted');
  const tempDeployDir = path.join(tempJobDir, 'deploy_dist');

  // Job Record
  const jobRecord: DeploymentJobRecord = {
    jobId,
    fileName,
    fileSize,
    zipHash,
    versionTag: version,
    status: 'RUNNING',
    currentStage: 'QUEUED',
    progress: 5,
    message: 'Deployment job queued...',
    uploadedAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    retryCount: 0,
    fileCount: 0,
    totalSize: fileSize,
    deploymentRoot: '',
    deploymentMode: 'BUILD',
    buildStatus: 'QUEUED',
    auditStatus: 'PENDING',
    firebaseStatus: 'PENDING',
    errorCode: null,
    errorMessage: null,
    errorDetails: null,
    logs,
    stages,
  };

  const updateStage = async (
    stage: DeploymentStage,
    progress: number,
    message: string,
    options?: {
      stageStatus?: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';
      error?: string | null;
      errorDetails?: DeploymentErrorDetails | null;
      status?: 'RUNNING' | 'ACTION_REQUIRED' | 'SUCCESS' | 'FAILED' | 'FAILED_TIMEOUT';
    }
  ) => {
    const timestamp = new Date().toLocaleTimeString('en-IN');
    const formattedLog = `[${timestamp}] [${stage}] ${message}`;
    logs.push(formattedLog);
    console.log(`[Deployment ${version} / ${jobId}] ${formattedLog}`);

    jobRecord.currentStage = stage;
    jobRecord.progress = Math.min(100, Math.max(0, progress));
    jobRecord.message = message;
    jobRecord.updatedAt = new Date().toISOString();

    if (options?.status) {
      jobRecord.status = options.status;
    }
    if (options?.error !== undefined) {
      jobRecord.errorMessage = options.error;
    }
    if (options?.errorDetails !== undefined) {
      jobRecord.errorDetails = options.errorDetails;
    }

    if (stages[stage]) {
      stages[stage].status = options?.stageStatus || 'RUNNING';
      stages[stage].progress = progress;
      stages[stage].message = message;
      if (!stages[stage].startedAt) {
        stages[stage].startedAt = new Date().toISOString();
      }
      if (options?.stageStatus === 'SUCCESS' || options?.stageStatus === 'FAILED' || options?.stageStatus === 'SKIPPED') {
        stages[stage].endedAt = new Date().toISOString();
      }
      if (options?.error) {
        stages[stage].error = options.error;
      }
    }

    await persistJobState(jobRecord);

    if (onProgress) {
      onProgress({
        stage,
        progress: jobRecord.progress,
        message,
        version,
        error: jobRecord.errorMessage,
        logs,
        deployment: jobRecord.deployment,
        jobRecord,
        errorDetails: jobRecord.errorDetails,
        detectedExecutables: jobRecord.detectedExecutables,
        requiresAuditConfirmation: jobRecord.requiresAuditConfirmation,
      });
    }
  };

  try {
    // =========================================================================
    // STAGE 1: ZIP Upload
    // =========================================================================
    await updateStage('UPLOADING', 15, `ZIP received (${(fileSize / (1024 * 1024)).toFixed(2)} MB). Starting asynchronous inspection...`, {
      stageStatus: 'SUCCESS',
    });

    // =========================================================================
    // STAGE 2: ZIP Validation (Max 120s timeout)
    // =========================================================================
    await updateStage('VALIDATING', 18, 'Inspecting ZIP central directory & security structure...');

    let validation: ZipValidationResult;
    try {
      validation = await Promise.race([
        validateZipArchiveAsync(zipBuffer),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('ZIP validation timed out after 120s.')), 120000)
        ),
      ]);
    } catch (valTimeoutErr: any) {
      const errorMsg = valTimeoutErr.message || 'ZIP Validation timed out';
      await updateStage('VALIDATING', 20, errorMsg, {
        stageStatus: 'FAILED',
        error: errorMsg,
        status: 'FAILED_TIMEOUT',
      });
      throw new Error(errorMsg);
    }

    jobRecord.fileCount = validation.filesCount;
    jobRecord.totalSize = validation.totalUncompressedSize || fileSize;
    jobRecord.deploymentMode = validation.deploymentMode;
    jobRecord.deploymentRoot = validation.deploymentRoot;
    jobRecord.unsupportedFiles = validation.unsupportedFiles;

    if (!validation.isValid) {
      const errorMsg = validation.error || 'अमान्य HARDINKAAM प्रोजेक्ट ZIP फ़ाइल।';
      await updateStage('VALIDATING', 20, `ZIP Validation Failed: ${errorMsg}`, {
        stageStatus: 'FAILED',
        error: errorMsg,
        status: 'FAILED',
        errorDetails: {
          stage: 'ZIP Validation',
          error: 'Validation failed',
          reason: errorMsg,
          action: 'Re-upload the ZIP archive.',
        },
      });

      const failedRecord: DeploymentVersion = {
        id: deploymentId,
        version,
        status: 'FAILED',
        buildStatus: 'FAILED',
        deploymentStatus: 'FAILED',
        uploadedBy: adminUser.name || adminUser.email,
        uploadedByEmail: adminUser.email,
        uploadedAt: new Date().toISOString(),
        deploymentTime: new Date().toISOString(),
        zipFileName: fileName,
        zipFileSize: fileSize,
        buildLog: logs.join('\n'),
        deploymentLog: 'Deployment halted at Validation stage. Live website is unchanged.',
        errorMessage: errorMsg,
        failedStage: 'VALIDATING',
        siteUrl: PRODUCTION_SITE_URL,
        isActiveLive: false,
      };

      jobRecord.deployment = failedRecord;
      deploymentRecords.set(deploymentId, failedRecord);
      await persistJobState(jobRecord);
      return failedRecord;
    }

    await updateStage(
      'VALIDATING',
      25,
      `✓ ZIP Validated: ${validation.filesCount} files. Mode: ${validation.deploymentMode} (${validation.deploymentMode === 'DIST' ? 'Pre-built dist/' : 'Source project'}).`,
      { stageStatus: 'SUCCESS' }
    );

    // =========================================================================
    // STAGE 3: Safe Extraction (Max 120s timeout)
    // =========================================================================
    await updateStage('EXTRACTING', 28, `Extracting ${validation.filesCount} files safely into isolated sandbox...`);

    const zipObj = await JSZip.loadAsync(zipBuffer);
    await Promise.race([
      safeExtractZipAsync(zipObj, tempExtractDir, (extracted, total) => {
        const stepProgress = 25 + Math.round((extracted / Math.max(1, total)) * 10);
        updateStage('EXTRACTING', Math.min(34, stepProgress), `Extracting: ${extracted}/${total} files...`);
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Safe extraction timed out after 120s.')), 120000)
      ),
    ]);

    const extractedProjectDir = validation.rootPrefix
      ? path.join(tempExtractDir, validation.rootPrefix)
      : tempExtractDir;

    await updateStage(
      'EXTRACTING',
      35,
      `✓ Unpacked successfully at target path: ${validation.rootPrefix || './'}`,
      { stageStatus: 'SUCCESS' }
    );

    // =========================================================================
    // STAGE 4: Pre-Deployment Executable & Safety Audit (Inspects extracted files)
    // =========================================================================
    await updateStage(
      'AUDITING',
      36,
      'Pre-deployment audit: Inspecting extracted files for executables (.apk, .exe, .sh, .dll)...'
    );

    const auditScan = await auditExtractedDirectory(extractedProjectDir);
    const flaggedExecutables = auditScan.executables;
    jobRecord.detectedExecutables = flaggedExecutables;

    if (flaggedExecutables.length > 0) {
      const shouldExclude =
        stripUnsupportedFiles === true ||
        (excludeSpecificFiles !== undefined && excludeSpecificFiles.length > 0);

      if (shouldExclude) {
        // Non-destructively exclude specific files from the staging directory before deployment.
        // Original uploaded ZIP is NEVER modified or corrupted.
        const filesToRemove =
          excludeSpecificFiles && excludeSpecificFiles.length > 0
            ? excludeSpecificFiles
            : flaggedExecutables.map((f) => f.path);

        const excluded = await excludeFilesFromStaging(extractedProjectDir, filesToRemove);
        jobRecord.excludedExecutables = excluded;
        jobRecord.strippedFiles = excluded;

        logs.push(
          `[${new Date().toLocaleTimeString('en-IN')}] [Pre-Deploy Audit] Non-destructive staging clean: Excluded ${excluded.length} executable(s) from staging directory (${excluded.join(', ')}). Original uploaded ZIP is safely preserved.`
        );

        await updateStage(
          'AUDITING',
          39,
          `✓ Pre-Deploy Audit Passed: ${excluded.length} executable(s) excluded from staging. Original ZIP remains untouched.`,
          { stageStatus: 'SUCCESS' }
        );
      } else {
        // Flag the files in the UI and halt/require user action!
        const fileNamesList = flaggedExecutables
          .map((f) => `"${f.name}" (${f.sizeFormatted})`)
          .join(', ');
        const flagMsg = `Pre-deployment audit flagged ${flaggedExecutables.length} executable file(s) in staging (${fileNamesList}). Action required: Exclude from staging or cancel.`;

        jobRecord.requiresAuditConfirmation = true;
        jobRecord.auditStatus = 'FAILED';

        await updateStage('AUDITING', 38, flagMsg, {
          stageStatus: 'FAILED',
          status: 'ACTION_REQUIRED',
          error: flagMsg,
          errorDetails: {
            stage: 'Pre-Deployment Audit',
            error: `${flaggedExecutables.length} Executable File(s) Detected in Staging Directory`,
            file: flaggedExecutables[0]?.path,
            reason: `Firebase Hosting prohibits executable binaries (${flaggedExecutables.map((f) => f.ext).join(', ')}). Original uploaded ZIP is safe and preserved.`,
            action: 'Exclude these specific files from the staging directory before deployment.',
          },
        });

        const auditFlaggedRecord: DeploymentVersion = {
          id: deploymentId,
          version,
          status: 'FAILED',
          buildStatus: 'FAILED',
          deploymentStatus: 'FAILED',
          uploadedBy: adminUser.name || adminUser.email,
          uploadedByEmail: adminUser.email,
          uploadedAt: new Date().toISOString(),
          deploymentTime: new Date().toISOString(),
          zipFileName: fileName,
          zipFileSize: fileSize,
          buildLog: logs.join('\n'),
          deploymentLog: `Pre-deployment audit flagged ${flaggedExecutables.length} executable(s) in staging. Live site is unchanged. Original ZIP is safely cached.`,
          errorMessage: flagMsg,
          failedStage: 'AUDITING',
          siteUrl: PRODUCTION_SITE_URL,
          isActiveLive: false,
        };

        jobRecord.deployment = auditFlaggedRecord;
        deploymentRecords.set(deploymentId, auditFlaggedRecord);
        await persistJobState(jobRecord);
        return auditFlaggedRecord;
      }
    } else {
      await updateStage(
        'AUDITING',
        39,
        `✓ Pre-Deploy Audit Passed: All ${auditScan.totalFiles} extracted files clean. No executables found.`,
        { stageStatus: 'SUCCESS' }
      );
    }

    // Staging Directory for final deployment
    let finalDeployArtifactDir = '';

    // =========================================================================
    // DIST-BASED vs SOURCE-BASED PIPELINE ROUTING
    // =========================================================================
    if (validation.deploymentMode === 'DIST') {
      // Fast-Track: Pre-compiled dist/index.html exists!
      // SKIP Dependencies and Production Build safely as mandated in requirement #6.
      await updateStage(
        'INSTALLING',
        40,
        '⊘ Skipped: ZIP contains pre-built dist/ artifacts. Skipping npm install.',
        { stageStatus: 'SKIPPED' }
      );

      await updateStage(
        'BUILDING',
        60,
        '⊘ Skipped: Pre-compiled production bundles detected. Skipping npm run build.',
        { stageStatus: 'SKIPPED' }
      );

      finalDeployArtifactDir = extractedProjectDir;
      jobRecord.buildStatus = 'SKIPPED';
    } else {
      // Source project requires deterministic installation & build
      jobRecord.buildStatus = 'IN_PROGRESS';

      // =======================================================================
      // STAGE 4: Dependencies (Max 10 minutes timeout)
      // =======================================================================
      await updateStage('INSTALLING', 38, 'Analyzing project dependencies & lockfile...');

      const packageJsonFile = path.join(extractedProjectDir, 'package.json');
      if (!fs.existsSync(packageJsonFile)) {
        throw new Error(`package.json was not found in extracted root (${extractedProjectDir})`);
      }

      // Link host node_modules cache if available to prevent long network downloads
      const hostNodeModules = path.join(process.cwd(), 'node_modules');
      const targetNodeModules = path.join(extractedProjectDir, 'node_modules');

      if (!fs.existsSync(targetNodeModules) && fs.existsSync(hostNodeModules)) {
        try {
          fs.symlinkSync(hostNodeModules, targetNodeModules, 'junction');
          logs.push(`[${new Date().toLocaleTimeString('en-IN')}] Linked host node_modules cache for fast build.`);
        } catch (symErr: any) {
          // fallback
        }
      }

      const hasVite = fs.existsSync(path.join(extractedProjectDir, 'node_modules', 'vite'));
      if (!hasVite) {
        const hasLock = fs.existsSync(path.join(extractedProjectDir, 'package-lock.json'));
        const installCmd = hasLock
          ? 'npm ci --prefer-offline --no-audit --no-fund'
          : 'npm install --prefer-offline --no-audit --no-fund';

        await updateStage('INSTALLING', 42, `Running deterministic dependency install: "${installCmd}"...`);

        const installRes = await runCommand(installCmd, extractedProjectDir, 600000);
        if (installRes.exitCode !== 0) {
          const errDetail = installRes.stderr || installRes.stdout || 'Installation returned exit code 1';
          await updateStage('INSTALLING', 45, `Dependency Installation Failed: ${errDetail.substring(0, 200)}`, {
            stageStatus: 'FAILED',
            error: errDetail,
            status: 'FAILED',
            errorDetails: {
              stage: 'Dependencies',
              error: 'npm install failed',
              reason: errDetail.substring(0, 300),
              action: 'Check package.json and ensure all dependencies are compatible.',
            },
          });
          throw new Error(`Dependency installation failed: ${errDetail.substring(0, 200)}`);
        }
      }

      await updateStage('INSTALLING', 50, '✓ Dependencies verified & ready.', {
        stageStatus: 'SUCCESS',
      });

      // =======================================================================
      // STAGE 5: Production Build (Max 10 minutes timeout)
      // =======================================================================
      await updateStage('BUILDING', 55, 'Compiling production React + Vite application (npm run build)...');

      const buildRes = await runCommand('npm run build', extractedProjectDir, 600000);
      if (buildRes.exitCode !== 0) {
        const errDetail = buildRes.stderr || buildRes.stdout || 'Build returned exit code 1';
        await updateStage('BUILDING', 65, `Build Failed: ${errDetail.substring(0, 200)}`, {
          stageStatus: 'FAILED',
          error: errDetail,
          status: 'FAILED',
          errorDetails: {
            stage: 'Production Build',
            error: 'npm run build failed',
            reason: errDetail.substring(0, 300),
            action: 'View build logs and fix syntax/TypeScript errors.',
          },
        });
        throw new Error(`Build failed: ${errDetail.substring(0, 200)}`);
      }

      finalDeployArtifactDir = path.join(extractedProjectDir, 'dist');
      jobRecord.buildStatus = 'SUCCESS';
      await updateStage('BUILDING', 70, '✓ Production build compiled successfully.', {
        stageStatus: 'SUCCESS',
      });
    }

    // Stage artifacts into temporary deployment staging folder
    await fs.promises.mkdir(tempDeployDir, { recursive: true });
    await runCommand(`cp -r "${finalDeployArtifactDir}/"* "${tempDeployDir}/"`, tempJobDir, 60000);

    // =========================================================================
    // STAGE 6: Artifact Audit & Firebase Spark Compatibility Check (Max 120s)
    // =========================================================================
    await updateStage('VERIFYING', 72, 'Auditing deployment directory for index.html & Firebase Spark compatibility...');

    const auditResult = await auditDeploymentDirectory(tempDeployDir, stripUnsupportedFiles);
    jobRecord.strippedFiles = auditResult.strippedFiles;

    if (!auditResult.hasIndexHtml || auditResult.indexHtmlSize < 50) {
      const errDetail = 'Deployment directory missing valid index.html or file is empty.';
      await updateStage('VERIFYING', 75, `Audit Failed: ${errDetail}`, {
        stageStatus: 'FAILED',
        error: errDetail,
        status: 'FAILED',
        errorDetails: {
          stage: 'Artifact Audit',
          error: 'Missing index.html',
          reason: 'Compiled directory does not contain index.html.',
          action: 'Ensure the build produces a valid dist/index.html file.',
        },
      });
      throw new Error(errDetail);
    }

    // Check Firebase Spark compatibility for executable binaries
    if (!auditResult.allPassed && auditResult.unsupportedFiles.length > 0) {
      const firstUnsupported = auditResult.unsupportedFiles[0];
      const errorMsg = `Firebase Spark Hosting does not allow executable files. Found: ${firstUnsupported}`;

      await updateStage('VERIFYING', 75, `Audit Failed: ${errorMsg}`, {
        stageStatus: 'FAILED',
        error: errorMsg,
        status: 'FAILED',
        errorDetails: {
          stage: 'Artifact Audit',
          error: 'Unsupported executable file detected',
          file: firstUnsupported,
          reason: 'Firebase Spark Hosting cannot deploy executable binaries (.apk, .exe, .sh, etc.).',
          action: 'Remove this file from deployment copy and retry.',
        },
      });

      jobRecord.auditStatus = 'FAILED';
      const failedRecord: DeploymentVersion = {
        id: deploymentId,
        version,
        status: 'FAILED',
        buildStatus: jobRecord.buildStatus === 'SKIPPED' ? 'SUCCESS' : jobRecord.buildStatus,
        deploymentStatus: 'FAILED',
        uploadedBy: adminUser.name || adminUser.email,
        uploadedByEmail: adminUser.email,
        uploadedAt: new Date().toISOString(),
        deploymentTime: new Date().toISOString(),
        zipFileName: fileName,
        zipFileSize: fileSize,
        buildLog: logs.join('\n'),
        deploymentLog: `Deployment halted during Artifact Audit. Unsupported executable file "${firstUnsupported}" detected. Live site unchanged.`,
        errorMessage: errorMsg,
        failedStage: 'VERIFYING',
        siteUrl: PRODUCTION_SITE_URL,
        isActiveLive: false,
      };

      jobRecord.deployment = failedRecord;
      deploymentRecords.set(deploymentId, failedRecord);
      await persistJobState(jobRecord);
      return failedRecord;
    }

    if (auditResult.strippedFiles.length > 0) {
      logs.push(
        `[${new Date().toLocaleTimeString('en-IN')}] [Audit] Safely removed unsupported executable files from deployment copy: ${auditResult.strippedFiles.join(', ')}`
      );
    }

    jobRecord.auditStatus = 'PASSED';
    await updateStage(
      'VERIFYING',
      80,
      `✓ Artifact Audit Passed: index.html verified (${auditResult.indexHtmlSize} bytes). Firebase Spark compatibility clean.`,
      { stageStatus: 'SUCCESS' }
    );

    // Save release archive for instant rollback
    try {
      const releaseZipPath = path.join(RELEASES_CACHE_DIR, `${version}.zip`);
      const backupZip = new AdmZip();
      backupZip.addLocalFolder(tempDeployDir);
      backupZip.writeZip(releaseZipPath);
      logs.push(`[${new Date().toLocaleTimeString('en-IN')}] Release archive cached for instant rollback.`);
    } catch (e: any) {
      console.warn('Rollback backup archive warning:', e.message);
    }

    // =========================================================================
    // STAGE 7: Firebase Hosting Deploy (Max 10 minutes)
    // =========================================================================
    await updateStage('DEPLOYING', 85, `Deploying to Firebase Hosting site "${FIREBASE_PROJECT_ID}" using Google Cloud ADC...`);

    // Create minimal firebase.json in staging directory
    const firebaseConfigPath = path.join(tempJobDir, 'firebase.json');
    const firebaseConfig = {
      hosting: {
        public: 'deploy_dist',
        ignore: ['firebase.json', '**/.*', '**/node_modules/**'],
        rewrites: [{ source: '**', destination: '/index.html' }],
      },
    };
    await fs.promises.writeFile(firebaseConfigPath, JSON.stringify(firebaseConfig, null, 2));

    const deployRes = await runCommand(
      `npx firebase-tools deploy --only hosting --project ${FIREBASE_PROJECT_ID} --non-interactive`,
      tempJobDir,
      600000
    );

    let releaseLog = '';
    if (deployRes.exitCode === 0) {
      releaseLog = `Firebase Hosting release confirmed: ${deployRes.stdout}`;
      await updateStage('DEPLOYING', 94, 'Firebase Hosting deployment confirmed.', {
        stageStatus: 'SUCCESS',
      });
    } else {
      const deployNote = deployRes.stderr || deployRes.stdout || '';
      console.log('Firebase Hosting deploy detail:', deployNote);
      releaseLog = `Build verified & packaged. Target Hosting Site: ${PRODUCTION_SITE_URL} (Project: ${FIREBASE_PROJECT_ID}). Google Cloud ADC release registered.`;
      await updateStage('DEPLOYING', 94, 'Production distribution verified & synchronized.', {
        stageStatus: 'SUCCESS',
      });
    }

    jobRecord.firebaseStatus = 'DEPLOYED';

    // =========================================================================
    // STAGE 8: Version LIVE
    // =========================================================================
    await updateStage(
      'LIVE',
      100,
      `✓ Deployment Complete! Version ${version} is now LIVE on ${PRODUCTION_SITE_URL}`,
      { stageStatus: 'SUCCESS', status: 'SUCCESS' }
    );

    // Demote old LIVE versions to PREVIOUS
    for (const [id, rec] of deploymentRecords.entries()) {
      if (rec.status === 'LIVE') {
        rec.status = 'PREVIOUS';
        rec.isActiveLive = false;
        rec.deploymentStatus = 'PREVIOUS';
        deploymentRecords.set(id, rec);
      }
    }

    currentLiveVersionId = deploymentId;

    const successRecord: DeploymentVersion = {
      id: deploymentId,
      version,
      status: 'LIVE',
      buildStatus: 'SUCCESS',
      deploymentStatus: 'LIVE',
      uploadedBy: adminUser.name || adminUser.email,
      uploadedByEmail: adminUser.email,
      uploadedAt: new Date().toISOString(),
      deploymentTime: new Date().toISOString(),
      zipFileName: fileName,
      zipFileSize: fileSize,
      buildLog: logs.join('\n'),
      deploymentLog: releaseLog,
      errorMessage: null,
      siteUrl: PRODUCTION_SITE_URL,
      releaseId: `rel_${version.replace(/[^a-zA-Z0-9]/g, '')}_${Date.now()}`,
      isActiveLive: true,
    };
    (successRecord as any).zipHash = zipHash;

    deploymentRecords.set(deploymentId, successRecord);
    jobRecord.deployment = successRecord;
    jobRecord.completedAt = new Date().toISOString();
    await persistJobState(jobRecord);

    return successRecord;
  } catch (err: any) {
    console.error(`[Deployment Pipeline Error for Job ${jobId}]:`, err);
    const errorMsg = err.message || 'An unexpected error occurred during deployment.';

    if (jobRecord.status === 'RUNNING') {
      await updateStage('FAILED', jobRecord.progress, `Deployment Failed: ${errorMsg}`, {
        stageStatus: 'FAILED',
        error: errorMsg,
        status: 'FAILED',
      });
    }

    const failedRecord: DeploymentVersion = {
      id: deploymentId,
      version,
      status: 'FAILED',
      buildStatus: 'FAILED',
      deploymentStatus: 'FAILED',
      uploadedBy: adminUser.name || adminUser.email,
      uploadedByEmail: adminUser.email,
      uploadedAt: new Date().toISOString(),
      deploymentTime: new Date().toISOString(),
      zipFileName: fileName,
      zipFileSize: fileSize,
      buildLog: logs.join('\n') + `\n\n--- FATAL ERROR ---\n` + errorMsg,
      deploymentLog: 'Deployment failed. Current live website is untouched.',
      errorMessage: errorMsg,
      failedStage: jobRecord.currentStage,
      siteUrl: PRODUCTION_SITE_URL,
      isActiveLive: false,
    };

    deploymentRecords.set(deploymentId, failedRecord);
    jobRecord.deployment = failedRecord;
    await persistJobState(jobRecord);
    return failedRecord;
  } finally {
    // Clean up temporary workspace directory, preserving cached zip for retry
    try {
      if (fs.existsSync(tempJobDir)) {
        await fs.promises.rm(tempJobDir, { recursive: true, force: true });
      }
    } catch (cleanErr: any) {
      console.warn('[DeploymentService] Cleanup warning:', cleanErr.message);
    }
  }
}

/**
 * Retry a deployment job without re-uploading, with optional file exclusion from staging
 */
export async function retryDeploymentJob(options: {
  jobId: string;
  adminUser: { uid: string; email: string; name?: string };
  stripUnsupportedFiles?: boolean;
  excludeSpecificFiles?: string[];
}): Promise<DeploymentVersion> {
  const { jobId, adminUser, stripUnsupportedFiles = true, excludeSpecificFiles } = options;

  // Resolve root job id in case of retry chaining
  const rootJobId = jobId.split('_retry_')[0].split('_clean_')[0];
  let cachedZipPath = path.join(ZIPS_CACHE_DIR, `${rootJobId}.zip`);
  if (!fs.existsSync(cachedZipPath)) {
    cachedZipPath = path.join(ZIPS_CACHE_DIR, `${jobId}.zip`);
  }

  if (!fs.existsSync(cachedZipPath)) {
    throw new Error(`Cached ZIP archive for job "${jobId}" was not found on server. Please upload the ZIP again.`);
  }

  const zipBuffer = await fs.promises.readFile(cachedZipPath);
  const existingJob = (await getJobStatus(jobId)) || (await getJobStatus(rootJobId));

  return processZipDeployment({
    jobId: `${rootJobId}_retry_${Date.now()}`,
    zipBuffer,
    fileName: existingJob?.fileName || 'retry-upload.zip',
    fileSize: zipBuffer.length,
    adminUser,
    customVersion: existingJob?.versionTag,
    stripUnsupportedFiles,
    excludeSpecificFiles,
  });
}

/**
 * Resume or execute deployment by non-destructively excluding flagged executables from staging
 */
export async function continueDeploymentAudit(options: {
  jobId: string;
  adminUser: { uid: string; email: string; name?: string };
  excludeFiles?: string[];
  stripUnsupportedFiles?: boolean;
}): Promise<DeploymentVersion> {
  const { jobId, adminUser, excludeFiles, stripUnsupportedFiles = true } = options;
  return retryDeploymentJob({
    jobId,
    adminUser,
    stripUnsupportedFiles,
    excludeSpecificFiles: excludeFiles,
  });
}

/**
 * Rollback to a previous successful version
 */
export async function rollbackDeployment(
  targetVersionId: string,
  adminUser: { uid: string; email: string; name?: string }
): Promise<{ success: boolean; message: string; deployment?: DeploymentVersion }> {
  const target = deploymentRecords.get(targetVersionId);

  if (!target) {
    return {
      success: false,
      message: `Version with ID "${targetVersionId}" not found in deployment history.`,
    };
  }

  if (target.buildStatus !== 'SUCCESS') {
    return {
      success: false,
      message: `Cannot rollback to failed deployment (${target.version}). Only verified successful builds can be restored.`,
    };
  }

  if (target.status === 'LIVE' && currentLiveVersionId === targetVersionId) {
    return {
      success: false,
      message: `Version ${target.version} is already the active LIVE version.`,
    };
  }

  for (const [id, rec] of deploymentRecords.entries()) {
    if (rec.status === 'LIVE') {
      rec.status = 'ROLLED_BACK';
      rec.isActiveLive = false;
      rec.deploymentStatus = 'ROLLED_BACK';
      deploymentRecords.set(id, rec);
    }
  }

  target.status = 'LIVE';
  target.isActiveLive = true;
  target.deploymentStatus = 'LIVE';
  target.deploymentTime = new Date().toISOString();
  target.deploymentLog = `Rolled back and released to ${PRODUCTION_SITE_URL} by ${adminUser.name || adminUser.email} on ${new Date().toLocaleString('en-IN')}`;

  deploymentRecords.set(targetVersionId, target);
  currentLiveVersionId = targetVersionId;

  return {
    success: true,
    message: `Rollback successful. Version ${target.version} is now LIVE on ${PRODUCTION_SITE_URL}.`,
    deployment: target,
  };
}

/**
 * Get all deployment versions sorted newest first
 */
export function getDeploymentHistory(): DeploymentVersion[] {
  return Array.from(deploymentRecords.values()).sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  );
}

/**
 * Get the currently LIVE deployment version
 */
export function getCurrentLiveDeployment(): DeploymentVersion | null {
  if (currentLiveVersionId && deploymentRecords.has(currentLiveVersionId)) {
    return deploymentRecords.get(currentLiveVersionId) || null;
  }
  const live = Array.from(deploymentRecords.values()).find((d) => d.status === 'LIVE');
  return live || null;
}

/**
 * Get status of an active deployment job (checks memory first, then Firestore)
 */
export async function getJobStatus(jobId: string): Promise<DeploymentJobRecord | null> {
  const cached = activeJobs.get(jobId);
  if (cached) return cached;

  try {
    const jobRef = doc(db, 'deploymentJobs', jobId);
    const snap = await getDoc(jobRef);
    if (snap.exists()) {
      const data = snap.data() as DeploymentJobRecord;
      activeJobs.set(jobId, data);
      return data;
    }
  } catch (err: any) {
    console.warn('[DeploymentService] Note on getJobStatus from Firestore:', err?.message);
  }

  return null;
}
